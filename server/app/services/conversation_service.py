import asyncio
import logging
import uuid
from typing import Any

from app.config import Settings
from app.exceptions import ConversationNotFoundError, FileKeyNotFoundError
from app.schemas.images import ImageUpload
from app.schemas.tutor import (
    ConversationHistory,
    ConversationSummary,
    HomeworkImage,
    PostTurnResult,
    TurnHistoryItem,
)
from app.services.async_s3_service import AsyncS3Service
from app.utils.conversation_paths import (
    conversation_prefix,
    meta_key,
    turn_homework_key,
    turn_response_key,
)
from app.utils.files import get_file_extension
from app.utils.turn_parsing import TurnData, parse_turn_files

logger = logging.getLogger(__name__)


class ConversationService:
    """Business logic for math tutor conversation storage and retrieval."""

    def __init__(self, s3: AsyncS3Service, settings: Settings) -> None:
        self._s3 = s3
        self._settings = settings

    @property
    def _bucket(self) -> str:
        return self._settings.s3_default_bucket

    async def list_conversations(self, student_id: str) -> list[ConversationSummary]:
        conversation_ids = await self._s3.list_conversations(student_id)
        tasks = [self._fetch_conversation_meta(student_id, cid) for cid in conversation_ids]
        return list(await asyncio.gather(*tasks))

    async def create_conversation(
        self, student_id: str, name: str
    ) -> ConversationSummary:
        conversation_id = str(uuid.uuid4())
        key = meta_key(student_id, conversation_id)
        await self._s3.put_object_json(self._bucket, key, {"name": name})
        return ConversationSummary(id=conversation_id, name=name)

    async def get_history(
        self, student_id: str, conversation_id: str
    ) -> ConversationHistory:
        prefix = conversation_prefix(student_id, conversation_id)
        keys = await self._s3.list_objects(self._bucket, prefix)

        if not keys:
            raise ConversationNotFoundError(student_id, conversation_id)

        meta_name = await self._fetch_conversation_name(
            student_id, conversation_id, conversation_id
        )
        turns_data = parse_turn_files(keys, prefix)

        sorted_turn_nums = sorted(turns_data.keys())
        tasks = [
            self._build_turn_history_item(turn_num, turns_data[turn_num])
            for turn_num in sorted_turn_nums
        ]
        history = list(await asyncio.gather(*tasks))

        return ConversationHistory(
            conversation_id=conversation_id,
            conversation_name=meta_name,
            history=history,
        )

    async def post_turn(
        self,
        student_id: str,
        conversation_id: str,
        conversation_name: str,
        turn_number: int,
        feedback_data: dict[str, Any],
        images: list[ImageUpload],
    ) -> PostTurnResult:
        meta_k = meta_key(student_id, conversation_id)
        response = turn_response_key(student_id, conversation_id, turn_number)

        # Read existing meta so we can merge without losing previously stored keys.
        try:
            existing_meta: dict[str, Any] = await self._s3.get_object_as_json(
                self._bucket, meta_k
            )
        except FileKeyNotFoundError:
            existing_meta = {}

        meta_payload: dict[str, Any] = {**existing_meta, "name": conversation_name}
        if turn_number == 0 and images and "first_image_key" not in existing_meta:
            ext = get_file_extension(images[0].filename)
            meta_payload["first_image_key"] = turn_homework_key(
                student_id, conversation_id, 0, 0, ext
            )

        upload_tasks: list[Any] = [
            self._s3.put_object_json(self._bucket, meta_k, meta_payload),
            self._s3.put_object_json(self._bucket, response, feedback_data),
        ]

        image_keys: list[str] = []
        for index, image in enumerate(images):
            ext = get_file_extension(image.filename)
            key = turn_homework_key(
                student_id, conversation_id, turn_number, index, ext
            )
            image_keys.append(key)
            upload_tasks.append(
                self._s3.put_object_bytes(
                    self._bucket, key, image.data, image.content_type
                )
            )

        await asyncio.gather(*upload_tasks)

        return PostTurnResult(
            status="success",
            message=(
                f"Successfully posted turn {turn_number} "
                f"for conversation '{conversation_id}'."
            ),
            turn=turn_number,
            image_keys=image_keys,
            response_key=response,
            ai_feedback=feedback_data,
        )

    async def _fetch_conversation_meta(
        self, student_id: str, conversation_id: str
    ) -> ConversationSummary:
        key = meta_key(student_id, conversation_id)
        try:
            meta = await self._s3.get_object_as_json(self._bucket, key)
        except FileKeyNotFoundError:
            meta = {}
        name = meta.get("name", conversation_id)
        cover_url: str | None = None
        first_image_key = meta.get("first_image_key")
        if first_image_key:
            cover_url = await self._s3.generate_presigned_url(self._bucket, first_image_key)
        return ConversationSummary(id=conversation_id, name=name, cover_image_url=cover_url)

    async def _fetch_conversation_name(
        self, student_id: str, conversation_id: str, fallback: str
    ) -> str:
        key = meta_key(student_id, conversation_id)
        try:
            meta = await self._s3.get_object_as_json(self._bucket, key)
            return meta.get("name", fallback)
        except FileKeyNotFoundError:
            return fallback

    async def _build_turn_history_item(
        self, turn_num: int, data: TurnData
    ) -> TurnHistoryItem:
        ai_feedback = None
        if data.response_key:
            try:
                ai_feedback = await self._s3.get_object_as_json(
                    self._bucket, data.response_key
                )
            except Exception as e:
                logger.error(
                    f"Failed to fetch S3 response key '{data.response_key}': {e}"
                )

        sorted_files = sorted(data.homework_files, key=lambda item: item.index)
        urls = await asyncio.gather(
            *(self._s3.generate_presigned_url(self._bucket, hf.key) for hf in sorted_files)
        )
        homework_files = [
            HomeworkImage(filename=hf.filename, key=hf.key, url=url)
            for hf, url in zip(sorted_files, urls)
        ]

        return TurnHistoryItem(
            turn=turn_num,
            homework_files=homework_files,
            ai_feedback=ai_feedback,
        )
