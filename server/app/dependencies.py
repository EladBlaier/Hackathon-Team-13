from functools import lru_cache

import aioboto3
from fastapi import Depends

from app.config import Settings, settings
from app.services.async_s3_service import AsyncS3Service
from app.services.conversation_service import ConversationService
from app.services.tutor_ai_service import TutorAIService

_s3_session = aioboto3.Session()


@lru_cache()
def get_settings() -> Settings:
    """Returns cached settings."""
    return settings


def get_s3_session() -> aioboto3.Session:
    """Dependency provider for aioboto3 session."""
    return _s3_session


def get_async_s3_service(
    settings: Settings = Depends(get_settings),
    session: aioboto3.Session = Depends(get_s3_session),
) -> AsyncS3Service:
    """Dependency provider for AsyncS3Service."""
    return AsyncS3Service(settings, session)


def get_conversation_service(
    s3: AsyncS3Service = Depends(get_async_s3_service),
    settings: Settings = Depends(get_settings),
) -> ConversationService:
    """Dependency provider for ConversationService."""
    return ConversationService(s3, settings)


def get_tutor_ai_service() -> TutorAIService:
    """Dependency provider for the Gemini-backed tutoring service."""
    return TutorAIService()
