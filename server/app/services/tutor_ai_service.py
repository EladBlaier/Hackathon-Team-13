"""Generates the tutor feedback that used to be supplied by the client.

The backend now owns the AI: given the student's uploaded work (and/or a
text message) it grades the photo and writes a bounded, encouraging tutoring
reply. The returned dict is what gets persisted to S3 as the turn response and
returned to the frontend to render in the chat.

The adaptive learner profile (style/pace/mastery) from the original AI engine
is intentionally collapsed to a single fixed default here — see the project
plan. Swap these constants for a real profile lookup to reintroduce it.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi.concurrency import run_in_threadpool

from app.ai import llm
from app.ai.prompts import build_tutor_system

logger = logging.getLogger(__name__)

# Fixed default learner profile (no onboarding/mastery in this build).
_DEFAULT_STYLE = "step_by_step"
_DEFAULT_PACE = "normal"
_DEFAULT_GRADE = 6
_DEFAULT_CONFIDENCE = "med"


class TutorAIService:
    """Produces the `ai_feedback` payload for a conversation turn."""

    async def generate_feedback(
        self,
        *,
        image: bytes | None = None,
        image_mime: str = "image/jpeg",
        student_text: str = "",
        history_text: str = "",
    ) -> dict[str, Any]:
        """Grade the work (if an image is present) and write a tutoring reply.

        Returns a dict with at least a ``reply`` key. When an image was graded
        it also carries ``is_correct`` / ``concept`` / ``error_type`` so the
        frontend (and stored history) can show the verdict.
        """
        system = build_tutor_system(
            _DEFAULT_STYLE,
            _DEFAULT_PACE,
            _DEFAULT_GRADE,
            _DEFAULT_CONFIDENCE,
        )

        if image:
            # Call A — structured grading of the photo.
            analysis = await run_in_threadpool(llm.analyze, image, image_mime)
            context_parts = [
                f"Problem: {analysis.problem}",
                f"Correct: {analysis.is_correct}",
                f"Mistake type: {analysis.error_type} (concept: {analysis.concept})",
            ]
            if student_text:
                context_parts.append(f"Student also said: {student_text}")
            if history_text:
                context_parts.append(f"Earlier in this session:\n{history_text}")
            context_parts.append("Tutor the student now.")
            context = "\n".join(context_parts)

            reply = await run_in_threadpool(llm.tutor, system, context)
            return {
                "reply": reply,
                "is_correct": analysis.is_correct,
                "concept": analysis.concept,
                "error_type": analysis.error_type,
            }

        # Text-only follow-up: no new photo to grade, just continue tutoring.
        context_parts = []
        if history_text:
            context_parts.append(f"Earlier in this session:\n{history_text}")
        context_parts.append(
            f"The student now says: {student_text or '(no message)'}"
        )
        context_parts.append("Respond as their tutor.")
        context = "\n".join(context_parts)

        reply = await run_in_threadpool(llm.tutor, system, context)
        return {
            "reply": reply,
            "is_correct": None,
            "concept": None,
            "error_type": None,
        }
