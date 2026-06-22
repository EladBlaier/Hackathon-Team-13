from typing import Any

from pydantic import BaseModel, Field


class ConversationSummary(BaseModel):
    id: str
    name: str
    cover_image_url: str | None = None


class CreateConversationRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Display name for the conversation")


class HomeworkImage(BaseModel):
    filename: str
    key: str
    url: str | None = None  # presigned GET URL so the frontend can render it


class TurnHistoryItem(BaseModel):
    turn: int
    homework_files: list[HomeworkImage]
    ai_feedback: dict[str, Any] | None


class ConversationHistory(BaseModel):
    conversation_id: str
    conversation_name: str
    history: list[TurnHistoryItem]


class PostTurnResult(BaseModel):
    status: str
    message: str
    turn: int
    image_keys: list[str]
    response_key: str
    ai_feedback: dict[str, Any]  # the tutor reply the backend just generated


# --- The "brain": persistent memory + per-turn reasoning artifacts -----------
#
# These three models back the smarter tutor harness. ``LearnerProfile`` is the
# student-level adaptation store, ``ConversationContext`` is the per-conversation
# managed-history store, and ``TutoringPlan`` is the structured "think before you
# speak" step. None of them change the stored turn JSON or the frontend contract;
# they live in their own sidecar S3 files (profile.json / context.json).


class ConceptMastery(BaseModel):
    """Running tally for a single math concept (e.g. "fractions")."""

    attempts: int = 0
    correct: int = 0
    recent_errors: list[str] = Field(default_factory=list)  # last few error_types

    @property
    def accuracy(self) -> float:
        return self.correct / self.attempts if self.attempts else 1.0


class LearnerProfile(BaseModel):
    """Student-level adaptation store, accumulated across all conversations.

    Defaults match the old fixed constants, so a cold-start profile reproduces
    today's behaviour exactly and only diverges as evidence accumulates.
    """

    concepts: dict[str, ConceptMastery] = Field(default_factory=dict)
    style: str = "step_by_step"
    pace: str = "normal"
    grade: int = 6
    confidence: str = "med"
    total_turns: int = 0

    def record(self, concept: str, is_correct: bool, error_type: str | None) -> None:
        """Deterministically fold one graded attempt into mastery (no LLM math)."""
        self.total_turns += 1
        if not concept:
            return
        mastery = self.concepts.setdefault(concept, ConceptMastery())
        mastery.attempts += 1
        if is_correct:
            mastery.correct += 1
        elif error_type and error_type != "none":
            mastery.recent_errors.append(error_type)
            mastery.recent_errors = mastery.recent_errors[-5:]

    def struggle_summary(self) -> str:
        """Short text for the tutor prompt: the 1-2 weakest concepts + error type.

        Returns "" when there is nothing notable yet, so the prompt stays clean.
        """
        weak = [
            (name, m)
            for name, m in self.concepts.items()
            if m.attempts > 0 and m.accuracy < 1.0
        ]
        if not weak:
            return ""
        # Weakest accuracy first; break ties by most-attempted.
        weak.sort(key=lambda kv: (kv[1].accuracy, -kv[1].attempts))
        parts: list[str] = []
        for name, m in weak[:2]:
            err = m.recent_errors[-1] if m.recent_errors else ""
            parts.append(f"{name} ({err})" if err else name)
        return "struggles with " + ", ".join(parts)


class Exchange(BaseModel):
    """One verbatim student/tutor round, kept for short-term recall."""

    student: str = ""
    tutor: str = ""


class ConversationContext(BaseModel):
    """Per-conversation managed history — the dynamic "context file".

    Instead of re-rendering raw turn files each turn, the tutor reads this
    compact, continuously-updated memory: a rolling summary, the current problem,
    and the last couple of verbatim exchanges.
    """

    rolling_summary: str = ""
    current_problem: str | None = None
    recent_exchanges: list[Exchange] = Field(default_factory=list)
    turn_count: int = 0

    def render(self) -> str:
        """Flatten the memory into a prompt-ready block ("" when empty)."""
        parts: list[str] = []
        if self.current_problem:
            parts.append(f"Current problem: {self.current_problem}")
        if self.rolling_summary:
            parts.append(f"Session so far: {self.rolling_summary}")
        if self.recent_exchanges:
            parts.append("Recent exchanges:")
            for ex in self.recent_exchanges:
                if ex.student:
                    parts.append(f"  Student: {ex.student}")
                if ex.tutor:
                    parts.append(f"  Tutor: {ex.tutor}")
        return "\n".join(parts)


class TutoringPlan(BaseModel):
    """Structured private plan the model produces before it writes the reply."""

    misconception: str  # the precise underlying misunderstanding
    next_move: str  # the single pedagogical step to take now
    do_not_reveal: str  # what must NOT be said (never the final answer)
    guiding_question: str  # one question that nudges the student forward

    def render(self) -> str:
        return (
            f"Misconception: {self.misconception}\n"
            f"Next move: {self.next_move}\n"
            f"Do not reveal: {self.do_not_reveal}\n"
            f"Guiding question: {self.guiding_question}"
        )
