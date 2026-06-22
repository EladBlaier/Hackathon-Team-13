from typing import Any

from pydantic import BaseModel, Field


class ConversationSummary(BaseModel):
    id: str
    name: str


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
