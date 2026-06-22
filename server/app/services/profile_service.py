"""Persistent, student-level learner profile (the adaptation store).

A single ``profile.json`` per student accumulates per-concept mastery across all
of that student's conversations. The tutor reads it to adapt (via the prompt's
struggle slot) and writes one graded attempt back per image turn.

The mastery arithmetic itself lives on ``LearnerProfile`` (pure, deterministic,
unit-tested without S3); this service is just the S3 load/save boundary.
"""

from __future__ import annotations

import logging

from app.config import Settings
from app.exceptions import FileKeyNotFoundError
from app.schemas.tutor import LearnerProfile
from app.services.async_s3_service import AsyncS3Service
from app.utils.conversation_paths import profile_key

logger = logging.getLogger(__name__)


class ProfileService:
    """Loads and persists a student's :class:`LearnerProfile` in S3."""

    def __init__(self, s3: AsyncS3Service, settings: Settings) -> None:
        self._s3 = s3
        self._settings = settings

    @property
    def _bucket(self) -> str:
        return self._settings.s3_default_bucket

    async def load(self, student_id: str) -> LearnerProfile:
        """Return the stored profile, or a cold-start default if none exists.

        A missing profile reproduces today's fixed-default behaviour exactly.
        """
        key = profile_key(student_id)
        try:
            data = await self._s3.get_object_as_json(self._bucket, key)
            return LearnerProfile.model_validate(data)
        except FileKeyNotFoundError:
            return LearnerProfile()
        except Exception as e:  # pragma: no cover - defensive
            logger.error(f"Failed to load profile '{key}', using defaults: {e}")
            return LearnerProfile()

    async def save(self, student_id: str, profile: LearnerProfile) -> None:
        """Persist the profile. Best-effort: a failure must not break the turn."""
        key = profile_key(student_id)
        try:
            await self._s3.put_object_json(self._bucket, key, profile.model_dump())
        except Exception as e:  # pragma: no cover - defensive
            logger.error(f"Failed to save profile '{key}': {e}")
