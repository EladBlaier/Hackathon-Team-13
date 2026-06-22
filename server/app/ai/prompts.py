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
_TUTOR_TEMPLATE = (
    "You are a friendly middle-school math tutor.\n"
    "Never give the final answer. Find the student's specific mistake and "
    "guide them to fix it themselves, encouragingly and briefly.\n"
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
        # Truncate defensively so history can never blow the budget.
        lines.append(f"Recent {struggle_summary[:80]}")

    slot = "\n".join(lines[:4])
    system = _TUTOR_TEMPLATE.format(slot=slot)

    assert len(system) <= SYSTEM_PROMPT_BUDGET, (
        f"Tutor system prompt {len(system)} chars exceeds "
        f"budget {SYSTEM_PROMPT_BUDGET}"
    )
    return system


# --- Analysis (Call A): short fixed rubric + strict JSON schema --------------

ANALYSIS_PROMPT = (
    "Look at this photo of a student's solved math problem. Identify the "
    "problem, decide if the final answer is correct, and if not, name the "
    "single underlying mistake. Respond as JSON matching the schema."
)


class AnalysisResult(BaseModel):
    """Structured grading output that drives logging + mastery."""

    problem: str
    is_correct: bool
    error_type: str  # e.g. arithmetic | sign | conceptual | setup | none
    concept: str  # short tag, e.g. "fractions"
    confidence: float  # 0..1
