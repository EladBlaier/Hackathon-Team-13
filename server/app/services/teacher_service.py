import logging

from app.config import Settings
from app.exceptions import FileKeyNotFoundError
from app.schemas.auth import StudentEntry
from app.services.async_s3_service import AsyncS3Service
from app.utils.conversation_paths import auth_key, teacher_profile_key

logger = logging.getLogger(__name__)


class TeacherService:
    def __init__(self, s3: AsyncS3Service, settings: Settings) -> None:
        self._s3 = s3
        self._settings = settings

    @property
    def _bucket(self) -> str:
        return self._settings.s3_teachers_bucket

    async def _lookup_student_by_username(self, username: str) -> StudentEntry:
        key = auth_key(username)
        try:
            data = await self._s3.get_object_as_json(self._settings.s3_default_bucket, key)
        except FileKeyNotFoundError:
            raise ValueError(f"No user found with username '{username}'")
        if data.get("role") != "student":
            raise ValueError(f"User '{username}' is not a student")
        return StudentEntry(user_id=data["user_id"], username=data["username"])

    async def _load_profile(self, teacher_id: str) -> dict:
        key = teacher_profile_key(teacher_id)
        try:
            return await self._s3.get_object_as_json(self._bucket, key)
        except FileKeyNotFoundError:
            return {"teacher_id": teacher_id, "students": []}

    async def _save_profile(self, teacher_id: str, data: dict) -> None:
        await self._s3.put_object_json(self._bucket, teacher_profile_key(teacher_id), data)

    async def get_students(self, teacher_id: str) -> list[StudentEntry]:
        data = await self._load_profile(teacher_id)
        return [StudentEntry(**s) for s in data.get("students", [])]

    async def add_student(self, teacher_id: str, username: str) -> list[StudentEntry]:
        student = await self._lookup_student_by_username(username)
        data = await self._load_profile(teacher_id)
        students: list[dict] = data.get("students", [])
        if any(s["user_id"] == student.user_id for s in students):
            raise ValueError(f"Student '{username}' is already in your list")
        students.append(student.model_dump())
        data["students"] = students
        await self._save_profile(teacher_id, data)
        return [StudentEntry(**s) for s in students]

    async def remove_student(self, teacher_id: str, student_id: str) -> list[StudentEntry]:
        data = await self._load_profile(teacher_id)
        students: list[dict] = data.get("students", [])
        students = [s for s in students if s["user_id"] != student_id]
        data["students"] = students
        await self._save_profile(teacher_id, data)
        return [StudentEntry(**s) for s in students]
