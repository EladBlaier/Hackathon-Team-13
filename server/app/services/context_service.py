"""Per-conversation dynamic context file (the managed-history store).

Rather than re-rendering every raw turn file on each turn (the old
``_render_history`` approach, which dropped the student's own words and capped
at 3 turns), each conversation keeps a single ``context.json`` that is
continuously updated: a rolling summary, the current problem, and the last
couple of verbatim exchanges. The tutor reads this compact memory instead of
the raw history.

Legacy conversations created before this file existed are backfilled from their
stored turn history the first time they are loaded.
"""

from __future__ import annotations

import logging

from fastapi.concurrency import run_in_threadpool

from app.ai import llm
from app.ai.prompts import AnalysisResult
from app.config import Settings
from app.exceptions import ConversationNotFoundError, FileKeyNotFoundError
from app.schemas.tutor import ConversationContext, Exchange
from app.services.async_s3_service import AsyncS3Service
from app.services.conversation_service import ConversationService
from app.utils.conversation_paths import context_key

logger = logging.getLogger(__name__)

# How many verbatim exchanges to keep for immediate recall (older turns live on
# only through the rolling summary).
_MAX_RECENT_EXCHANGES = 2


class ContextService:
    """Loads, backfills, and updates a conversation's :class:`ConversationContext`."""

    def __init__(
        self,
        s3: AsyncS3Service,
        settings: Settings,
        conversations: ConversationService,
    ) -> None:
        self._s3 = s3
        self._settings = settings
        self._conversations = conversations

    @property
    def _bucket(self) -> str:
        return self._settings.s3_default_bucket

    async def load(self, student_id: str, conversation_id: str) -> ConversationContext:
        """Return the stored context, backfilling legacy conversations on first use."""
        key = context_key(student_id, conversation_id)
        try:
            data = await self._s3.get_object_as_json(self._bucket, key)
            return ConversationContext.model_validate(data)
        except FileKeyNotFoundError:
            return await self._backfill(student_id, conversation_id)
        except Exception as e:  # pragma: no cover - defensive
            logger.error(f"Failed to load context '{key}', starting fresh: {e}")
            return ConversationContext()

    async def update(
        self,
        student_id: str,
        conversation_id: str,
        context: ConversationContext,
        *,
        student_text: str,
        analysis: AnalysisResult | None,
        reply: str,
    ) -> None:
        """Fold the just-completed turn into the context and persist it.

        Best-effort: a storage/model failure here must not break the turn the
        student already received a reply for.
        """
        context.turn_count += 1
        if analysis and analysis.problem:
            context.current_problem = analysis.problem

        student_line = student_text.strip() or (
            "(shared homework photo)" if analysis else ""
        )
        exchange = Exchange(student=student_line, tutor=reply)
        context.recent_exchanges.append(exchange)
        context.recent_exchanges = context.recent_exchanges[-_MAX_RECENT_EXCHANGES:]

        if self._should_summarize(context.turn_count):
            verdict = ""
            if analysis:
                verdict = (
                    f"[verdict: correct={analysis.is_correct}, "
                    f"concept={analysis.concept}, error={analysis.error_type}]\n"
                )
            latest = f"{verdict}Student: {student_line}\nTutor: {reply}"
            try:
                context.rolling_summary = await run_in_threadpool(
                    llm.summarize, context.rolling_summary, latest
                )
            except Exception as e:  # pragma: no cover - defensive
                logger.error(f"Context summarize failed, keeping prior summary: {e}")

        await self._save(student_id, conversation_id, context)

    def _should_summarize(self, turn_count: int) -> bool:
        every_n = self._settings.tutor_context_summary_every_n
        return every_n <= 1 or turn_count % every_n == 0

    async def _save(
        self, student_id: str, conversation_id: str, context: ConversationContext
    ) -> None:
        key = context_key(student_id, conversation_id)
        try:
            await self._s3.put_object_json(self._bucket, key, context.model_dump())
        except Exception as e:  # pragma: no cover - defensive
            logger.error(f"Failed to save context '{key}': {e}")

    async def _backfill(
        self, student_id: str, conversation_id: str
    ) -> ConversationContext:
        """Build an initial context from existing turn files (no LLM call).

        Brand-new conversations (no turns yet) return an empty context.
        """
        try:
            history = await self._conversations.get_history(student_id, conversation_id)
        except ConversationNotFoundError:
            return ConversationContext()

        context = ConversationContext(turn_count=len(history.history))
        summary_lines: list[str] = []
        for item in history.history:
            feedback = item.ai_feedback or {}
            said = (feedback.get("student_text") or "").strip()
            reply = (feedback.get("reply") or "").strip()
            concept = feedback.get("concept")
            if concept:
                context.current_problem = f"(concept: {concept})"
            if item.homework_files:
                summary_lines.append("Student shared homework photo(s).")
            if said:
                summary_lines.append(f"Student said: {said}")
            if reply:
                summary_lines.append(f"Tutor: {reply}")
            context.recent_exchanges.append(
                Exchange(
                    student=said or ("(shared homework photo)" if item.homework_files else ""),
                    tutor=reply,
                )
            )

        context.recent_exchanges = context.recent_exchanges[-_MAX_RECENT_EXCHANGES:]
        context.rolling_summary = "\n".join(summary_lines)[:600]
        await self._save(student_id, conversation_id, context)
        return context
