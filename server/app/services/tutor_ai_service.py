"""The tutor "brain": a multi-step harness around the free Gemini model.

Rather than upgrade the model, we compensate for a weak free model with a small
orchestration loop per turn:

    1. Load memory   — student profile.json + conversation context.json
    2. Grade (A)     — structured photo grading, if an image was sent
    3. Plan (B)      — a structured "think before you speak" step
    4. Reply (C)     — the bounded, encouraging student-facing message
    5. Self-check (D)— optional answer-leak guard (config-gated)
    6. Update memory — fold mastery into the profile, refresh the context

The returned dict keeps the exact same shape the frontend and S3 turn files
already expect (``reply`` / ``is_correct`` / ``concept`` / ``error_type`` /
``student_text``); all the new intelligence rides in the two sidecar files.

Provider stays isolated in :mod:`app.ai.llm` — swapping models touches only that
module, never this orchestrator.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi.concurrency import run_in_threadpool

from app.ai import llm
from app.ai.prompts import AnalysisResult, build_tutor_system
from app.config import Settings
from app.schemas.tutor import ConversationContext, LearnerProfile, TutoringPlan
from app.services.context_service import ContextService
from app.services.profile_service import ProfileService

logger = logging.getLogger(__name__)

# Below this grading confidence the photo is treated as unreadable: the tutor
# asks the student to confirm rather than grading work it can't trust.
LOW_CONFIDENCE = 0.5


class TutorAIService:
    """Produces the ``ai_feedback`` payload for a conversation turn."""

    def __init__(
        self,
        profiles: ProfileService,
        contexts: ContextService,
        settings: Settings,
    ) -> None:
        self._profiles = profiles
        self._contexts = contexts
        self._settings = settings

    async def run_turn(
        self,
        *,
        student_id: str,
        conversation_id: str,
        image: bytes | None = None,
        image_mime: str = "image/jpeg",
        student_text: str = "",
    ) -> dict[str, Any]:
        """Run the full grade → plan → reply → update loop for one turn."""
        profile = await self._profiles.load(student_id)
        context = await self._contexts.load(student_id, conversation_id)

        # Call A — structured grading of the photo (drives mastery + verdict).
        analysis: AnalysisResult | None = None
        if image:
            analysis = await run_in_threadpool(llm.analyze, image, image_mime)

        system = build_tutor_system(
            profile.style,
            profile.pace,
            profile.grade,
            profile.confidence,
            profile.struggle_summary(),
        )

        # Call B — private structured plan (the "thinking" step).
        plan: TutoringPlan | None = None
        if self._settings.tutor_enable_plan:
            try:
                plan = await run_in_threadpool(
                    llm.plan, system, self._plan_context(analysis, student_text, context)
                )
            except Exception as e:  # pragma: no cover - degrade to direct reply
                logger.error(f"Plan step failed, replying without it: {e}")

        # Call C — the human-facing reply.
        reply = await run_in_threadpool(
            llm.tutor, system, self._reply_context(analysis, student_text, context, plan)
        )

        # Call D — optional answer-leak guard.
        if self._settings.tutor_enable_self_check:
            reply = await self._self_check(system, reply)

        feedback: dict[str, Any] = {
            "reply": reply,
            "is_correct": analysis.is_correct if analysis else None,
            "concept": analysis.concept if analysis else None,
            "error_type": analysis.error_type if analysis else None,
        }
        if student_text.strip():
            feedback["student_text"] = student_text

        # Update memory (best-effort; the student already has their reply).
        if analysis:
            profile.record(analysis.concept, analysis.is_correct, analysis.error_type)
            await self._profiles.save(student_id, profile)
        await self._contexts.update(
            student_id,
            conversation_id,
            context,
            student_text=student_text,
            analysis=analysis,
            reply=reply,
        )

        return feedback

    # --- prompt assembly ------------------------------------------------------

    def _plan_context(
        self,
        analysis: AnalysisResult | None,
        student_text: str,
        context: ConversationContext,
    ) -> str:
        parts = self._situation(analysis, student_text)
        rendered = context.render()
        if rendered:
            parts.append(f"Session memory:\n{rendered}")
        return "\n".join(parts)

    def _reply_context(
        self,
        analysis: AnalysisResult | None,
        student_text: str,
        context: ConversationContext,
        plan: TutoringPlan | None,
    ) -> str:
        parts = self._situation(analysis, student_text)
        rendered = context.render()
        if rendered:
            parts.append(f"Session memory:\n{rendered}")
        if plan:
            parts.append(f"Your private plan (do not quote it verbatim):\n{plan.render()}")
        parts.append("Now write your reply to the student.")
        return "\n".join(parts)

    @staticmethod
    def _situation(analysis: AnalysisResult | None, student_text: str) -> list[str]:
        parts: list[str] = []
        if analysis:
            parts.append(f"Problem: {analysis.problem}")
            parts.append(f"Student's answer: {analysis.student_answer or '(unclear)'}")
            parts.append(f"Correct: {analysis.is_correct}")
            parts.append(
                f"Mistake type: {analysis.error_type} (concept: {analysis.concept})"
            )
            if analysis.observation:
                parts.append(f"Observation: {analysis.observation}")
            # The single instruction that makes the tutor branch on the verdict.
            parts.append(TutorAIService._verdict_directive(analysis))
        parts.append(f"The student says: {student_text.strip() or '(no message)'}")
        return parts

    @staticmethod
    def _verdict_directive(analysis: AnalysisResult) -> str:
        """Turn the graded verdict into one explicit behavioural instruction."""
        if analysis.confidence < LOW_CONFIDENCE:
            return (
                "DIRECTIVE: The work is hard to read and grading is uncertain. Do NOT "
                "grade it; ask the student to confirm or re-share their answer."
            )
        if analysis.is_correct:
            ref = f" (reference: {analysis.observation})" if analysis.observation else ""
            return (
                "DIRECTIVE: The student's answer is CORRECT. Affirm it specifically"
                f"{ref}, then ask what they'd like to do next — a harder challenge, an "
                "extension, or a new problem."
            )
        return (
            f"DIRECTIVE: The student's answer is INCORRECT — mistake: "
            f"{analysis.error_type}, concept: {analysis.concept}. Guide them to find "
            "and fix it themselves without revealing the answer."
        )

    async def _self_check(self, system: str, draft: str) -> str:
        """Cheap guard: rewrite the draft if it leaks the final answer or rambles."""
        check_context = (
            f"Draft reply: {draft}\n\n"
            "If this reveals the final numeric answer or is longer than a few "
            "sentences, rewrite it to fix that while keeping it warm and helpful. "
            "Otherwise return it unchanged. Output only the final reply."
        )
        try:
            revised = await run_in_threadpool(llm.tutor, system, check_context)
            return revised or draft
        except Exception as e:  # pragma: no cover - keep the original on failure
            logger.error(f"Self-check failed, keeping draft: {e}")
            return draft
