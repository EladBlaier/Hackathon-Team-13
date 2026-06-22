"""Bounded prompt construction for the math tutor.

The whole point of this module: keep adaptive prompts SHORT and SIZE-CAPPED.
The learner profile is rendered as a handful of enum lines, never free-form
prose, and the assembled tutor system prompt is asserted to stay under a hard
character budget so it can't silently grow as features are added.
"""

from __future__ import annotations

from pydantic import BaseModel

# Hard ceiling for the tutor system prompt. Target is ~600 chars; we assert a
# little above that so a normal profile never trips it but runaway growth does.
SYSTEM_PROMPT_BUDGET = 700

# Allowed enum values for the learner profile (validated at the edge, in db.py).
STYLES = ("visual", "step_by_step", "socratic")
PACES = ("slow", "normal", "fast")
CONFIDENCES = ("low", "med", "high")

# How each style should change the tutor's behaviour — one short line each.
_STYLE_HINT = {
    "visual": "Explain with concrete pictures/analogies a kid can imagine.",
    "step_by_step": "Walk one small numbered step at a time, checking in.",
    "socratic": "Ask one guiding question at a time; let them find it.",
}

# Fixed tutor template. {slot} holds the <=4 bounded profile/struggle lines.
# It must NOT assume the student is wrong — the per-turn directive (built from the
# graded verdict in tutor_ai_service) decides whether to correct or to celebrate.
_TUTOR_TEMPLATE = (
    "Answer in Hebrew.\n"
    "You are a friendly middle-school math tutor.\n"
    "Never reveal the final answer. If the student is wrong, pinpoint their "
    "specific mistake and guide them to fix it themselves. If they're right, "
    "confirm warmly and specifically, then ask what they'd like to do next. "
    "Always brief and encouraging.\n"
    "{slot}"
)


def build_tutor_system(
    style: str,
    pace: str,
    grade: int,
    confidence: str,
    struggle_summary: str = "",
) -> str:
    """Assemble a bounded tutor system prompt from the enum profile.

    Returns a string guaranteed to be <= SYSTEM_PROMPT_BUDGET characters.
    """
    style = style if style in STYLES else "step_by_step"
    pace = pace if pace in PACES else "normal"
    confidence = confidence if confidence in CONFIDENCES else "med"

    lines = [
        f"Style: {_STYLE_HINT[style]}",
        f"Grade {grade}, pace {pace}, confidence {confidence}.",
    ]
    if struggle_summary:
        # Truncate defensively so the profile can never blow the budget.
        lines.append(f"Recent {struggle_summary[:120]}")

    slot = "\n".join(lines[:4])
    system = _TUTOR_TEMPLATE.format(slot=slot)

    assert len(system) <= SYSTEM_PROMPT_BUDGET, (
        f"Tutor system prompt {len(system)} chars exceeds "
        f"budget {SYSTEM_PROMPT_BUDGET}"
    )
    return system


# --- Analysis (Call A): short fixed rubric + strict JSON schema --------------

ANALYSIS_PROMPT = (
    "Answer in Hebrew."
    "Look at this photo of a student's solved math problem. Identify a "
    "problem if there is one, transcribe the student's final written answer, and decide if it is "
    "correct; if not, name the single underlying mistake. Add a one-line "
    "observation of what the student actually did (right or wrong). Set confidence "
    "honestly: if the photo is unreadable or you are unsure, use a low value. "
    "Respond as JSON matching the schema."
)


class AnalysisResult(BaseModel):
    """Structured grading output that drives logging + mastery."""

    problem: str
    is_correct: bool
    error_type: str  # e.g. arithmetic | sign | conceptual | setup | none
    concept: str  # short tag, e.g. "fractions"
    confidence: float  # 0..1 — low means the photo was unclear / grading is unsure
    student_answer: str = ""  # what the student wrote as their final answer
    observation: str = ""  # one line on what they did, to ground the feedback


# --- Plan (Call B): structured "think before you speak" ----------------------
# The weak free model reasons better when forced to commit to a small, schema-
# checked plan before composing the human-facing reply.

PLAN_PROMPT = (
    "Answer in Hebrew."
    "Before replying to the student, plan privately. Using the problem, the "
    "student's work and message, and the session context, decide your approach. "
    "If the answer is wrong: name the precise misconception and the single next "
    "move to help them fix it. If it's right: set misconception to 'none' and make "
    "the next move to affirm specifically and ask what they'd like to do next. "
    "Always note what you must NOT reveal (never the final answer) and one short "
    "question to ask the student. Respond as JSON matching the schema."
)


# --- Context compaction: maintain the dynamic conversation memory ------------

CONTEXT_SUMMARY_PROMPT = (
    "You maintain a running memory of a math tutoring session. Given the previous "
    "summary and the latest exchange, write an updated summary in 80 words or "
    "fewer: which problem(s) were worked, what the student now understands, and "
    "what they still struggle with. Plain prose, no preamble."
)
