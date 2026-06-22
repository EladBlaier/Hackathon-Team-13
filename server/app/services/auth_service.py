import hashlib
import logging
import uuid

from app.config import Settings
from app.exceptions import FileKeyNotFoundError
from app.schemas.auth import AuthUser
from app.services.async_s3_service import AsyncS3Service
from app.utils.conversation_paths import auth_key, auth_by_id_key

logger = logging.getLogger(__name__)


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class AuthService:
    def __init__(self, s3: AsyncS3Service, settings: Settings) -> None:
        self._s3 = s3
        self._settings = settings

    @property
    def _bucket(self) -> str:
        return self._settings.s3_default_bucket

    async def register(self, username: str, password: str, role: str = "student") -> AuthUser:
        key = auth_key(username)
        try:
            await self._s3.get_object_as_json(self._bucket, key)
            raise ValueError(f"Username '{username}' is already taken")
        except FileKeyNotFoundError:
            pass

        user_id = uuid.uuid4().hex[:16]
        data = {
            "user_id": user_id,
            "username": username,
            "password_hash": _hash_password(password),
            "role": role,
        }
        await self._s3.put_object_json(self._bucket, key, data)
        await self._s3.put_object_json(self._bucket, auth_by_id_key(user_id), data)
        return AuthUser(user_id=user_id, username=username, role=role)

    async def login(self, username: str, password: str) -> AuthUser:
        key = auth_key(username)
        try:
            data = await self._s3.get_object_as_json(self._bucket, key)
        except FileKeyNotFoundError:
            raise ValueError("Invalid username or password")

        if data.get("password_hash") != _hash_password(password):
            raise ValueError("Invalid username or password")

        return AuthUser(
            user_id=data["user_id"],
            username=data["username"],
            role=data.get("role", "student"),
        )
