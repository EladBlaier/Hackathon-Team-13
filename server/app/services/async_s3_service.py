import json
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import aioboto3

from app.config import Settings
from app.exceptions import FileKeyNotFoundError, FileOperationError
from app.utils.conversation_paths import student_conversations_prefix

logger = logging.getLogger(__name__)


class AsyncS3Service:
    """Asynchronous service layer handling direct aioboto3 S3 interactions."""

    def __init__(self, settings: Settings, session: aioboto3.Session) -> None:
        self.settings = settings
        self.session = session

    @asynccontextmanager
    async def _s3_client(self) -> AsyncIterator[Any]:
        async with self.session.client(
            "s3",
            # Empty endpoint => use AWS's default regional endpoint. A non-empty
            # value targets MinIO / Cloudflare R2 / other S3-compatible stores.
            endpoint_url=self.settings.s3_endpoint_url or None,
            aws_access_key_id=self.settings.s3_access_key,
            aws_secret_access_key=self.settings.s3_secret_key,
            region_name=self.settings.s3_region,
        ) as client:
            yield client

    async def ensure_bucket_exists(self, bucket_name: str) -> None:
        """Verifies if bucket exists. Creates it if missing."""
        async with self._s3_client() as client:
            try:
                await client.head_bucket(Bucket=bucket_name)
            except client.exceptions.ClientError as e:
                error_code = e.response.get("Error", {}).get("Code")
                if error_code in ("404", "403"):
                    try:
                        await client.create_bucket(Bucket=bucket_name)
                        logger.info(f"S3 bucket '{bucket_name}' created successfully.")
                    except Exception as create_err:
                        logger.error(
                            f"Failed to automatically create bucket '{bucket_name}': {create_err}"
                        )
                        raise FileOperationError(
                            f"Auto bucket creation failed: {create_err}"
                        ) from create_err
                else:
                    logger.error(f"Error checking head of bucket '{bucket_name}': {e}")
                    raise FileOperationError(f"S3 head bucket check failed: {e}") from e
            except Exception as e:
                logger.error(f"Unexpected error testing bucket '{bucket_name}': {e}")
                raise FileOperationError(f"S3 connection failed: {e}") from e

    async def list_conversations(self, student_id: str) -> list[str]:
        """Lists conversation folder IDs for a student."""
        prefix = student_conversations_prefix(student_id)
        common_prefixes = await self.list_common_prefixes(
            self.settings.s3_default_bucket, prefix
        )
        return [cp[len(prefix) :].rstrip("/") for cp in common_prefixes]

    async def list_common_prefixes(self, bucket_name: str, prefix: str) -> list[str]:
        """Discovers folder suffixes under an S3 path prefix using a delimiter."""
        async with self._s3_client() as client:
            try:
                response = await client.list_objects_v2(
                    Bucket=bucket_name,
                    Prefix=prefix,
                    Delimiter="/",
                )
                common_prefixes = response.get("CommonPrefixes", [])
                return [cp.get("Prefix", "") for cp in common_prefixes]
            except Exception as e:
                logger.error(f"Failed to list S3 common prefixes under {prefix}: {e}")
                raise FileOperationError(f"S3 list prefixes failed: {e}") from e

    async def get_object_as_json(self, bucket_name: str, key: str) -> Any:
        """Downloads S3 object and returns parsed JSON content."""
        async with self._s3_client() as client:
            try:
                response = await client.get_object(Bucket=bucket_name, Key=key)
                async with response["Body"] as stream:
                    content = await stream.read()
                return json.loads(content.decode("utf-8"))
            except client.exceptions.NoSuchKey:
                raise FileKeyNotFoundError(bucket_name, key)
            except Exception as e:
                logger.error(
                    f"Failed to download or parse JSON key '{key}' from '{bucket_name}': {e}"
                )
                raise FileOperationError(f"Failed to download file: {e}") from e

    async def put_object_json(self, bucket_name: str, key: str, data: Any) -> None:
        """Serializes and uploads JSON data to S3."""
        content = json.dumps(data)
        async with self._s3_client() as client:
            try:
                await client.put_object(
                    Bucket=bucket_name,
                    Key=key,
                    Body=content.encode("utf-8"),
                    ContentType="application/json",
                )
            except Exception as e:
                logger.error(f"Failed to upload JSON payload to S3 key '{key}': {e}")
                raise FileOperationError(f"Failed to upload json: {e}") from e

    async def put_object_bytes(
        self, bucket_name: str, key: str, data: bytes, content_type: str
    ) -> None:
        """Uploads raw byte payload to S3."""
        async with self._s3_client() as client:
            try:
                await client.put_object(
                    Bucket=bucket_name,
                    Key=key,
                    Body=data,
                    ContentType=content_type,
                )
            except Exception as e:
                logger.error(f"Failed to upload bytes payload to S3 key '{key}': {e}")
                raise FileOperationError(f"Failed to upload file bytes: {e}") from e

    async def generate_presigned_url(
        self, bucket_name: str, key: str, expires_in: int = 3600
    ) -> str | None:
        """Returns a time-limited GET URL so the frontend can render the object.

        Never raises: a failure here should degrade gracefully to "no image"
        rather than break the whole conversation history response.
        """
        async with self._s3_client() as client:
            try:
                url = await client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket_name, "Key": key},
                    ExpiresIn=expires_in,
                )
                # Replace the internal Docker endpoint with the browser-reachable
                # public URL when one is configured.
                if url and self.settings.s3_public_url and self.settings.s3_endpoint_url:
                    url = url.replace(
                        self.settings.s3_endpoint_url,
                        self.settings.s3_public_url.rstrip("/"),
                        1,
                    )
                return url
            except Exception as e:
                logger.error(f"Failed to presign S3 key '{key}': {e}")
                return None

    async def list_objects(self, bucket_name: str, prefix: str) -> list[str]:
        """Lists all keys matching the prefix."""
        async with self._s3_client() as client:
            try:
                response = await client.list_objects_v2(
                    Bucket=bucket_name, Prefix=prefix
                )
                contents = response.get("Contents", [])
                return [obj["Key"] for obj in contents]
            except Exception as e:
                logger.error(
                    f"Failed to list S3 objects under prefix '{prefix}' in '{bucket_name}': {e}"
                )
                raise FileOperationError(f"S3 list objects failed: {e}") from e
