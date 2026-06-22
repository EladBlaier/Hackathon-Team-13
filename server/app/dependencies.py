from functools import lru_cache

import aioboto3
from fastapi import Depends

from app.config import Settings, settings
from app.services.async_s3_service import AsyncS3Service
from app.services.auth_service import AuthService
from app.services.context_service import ContextService
from app.services.conversation_service import ConversationService
from app.services.profile_service import ProfileService
from app.services.teacher_service import TeacherService
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


def get_profile_service(
    s3: AsyncS3Service = Depends(get_async_s3_service),
    settings: Settings = Depends(get_settings),
) -> ProfileService:
    """Dependency provider for the student-level learner profile store."""
    return ProfileService(s3, settings)


def get_context_service(
    s3: AsyncS3Service = Depends(get_async_s3_service),
    settings: Settings = Depends(get_settings),
    conversations: ConversationService = Depends(get_conversation_service),
) -> ContextService:
    """Dependency provider for the per-conversation managed-history store."""
    return ContextService(s3, settings, conversations)


def get_auth_service(
    s3: AsyncS3Service = Depends(get_async_s3_service),
    settings: Settings = Depends(get_settings),
) -> AuthService:
    return AuthService(s3, settings)


def get_teacher_service(
    s3: AsyncS3Service = Depends(get_async_s3_service),
    settings: Settings = Depends(get_settings),
) -> TeacherService:
    return TeacherService(s3, settings)


def get_tutor_ai_service(
    profiles: ProfileService = Depends(get_profile_service),
    contexts: ContextService = Depends(get_context_service),
    settings: Settings = Depends(get_settings),
) -> TutorAIService:
    """Dependency provider for the Gemini-backed tutoring "brain"."""
    return TutorAIService(profiles, contexts, settings)
