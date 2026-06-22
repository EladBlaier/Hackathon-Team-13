import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.config import settings
from app.dependencies import get_async_s3_service, get_s3_session, get_settings
from app.exceptions import register_exception_handlers
from app.routers import tutor
from app.routers import auth as auth_router
from app.routers import teacher as teacher_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifecycle events handler. Runs connection validation and bucket setup on startup."""
    logger.info("Initializing S3 connection and validating default settings...")

    s3_service = get_async_s3_service(get_settings(), get_s3_session())
    try:
        await s3_service.ensure_bucket_exists(settings.s3_default_bucket)
        logger.info(f"Default S3 bucket '{settings.s3_default_bucket}' is ready.")
        await s3_service.ensure_bucket_exists(settings.s3_teachers_bucket)
        logger.info(f"Teachers S3 bucket '{settings.s3_teachers_bucket}' is ready.")
    except Exception as e:
        logger.error(
            f"Could not connect to S3/MinIO service during startup or create bucket: {e}. "
            "Please ensure your S3 container is healthy and accessible. "
            "FastAPI startup completed, but S3 operations will fail."
        )
    yield
    logger.info("Shutting down AI Math Tutor service...")


app = FastAPI(
    title="AI Math Tutor Service",
    description=(
        "FastAPI service using asynchronous S3 client (aioboto3) "
        "to handle conversational state and assets for an AI math tutor application."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(auth_router.router)
app.include_router(teacher_router.router)
app.include_router(tutor.router)


@app.get("/", tags=["General"], summary="Root Endpoint")
def read_root() -> dict[str, Any]:
    """Returns general metadata about the service environment settings."""
    return {
        "message": "Welcome to the AI Math Tutor S3 Service!",
        "docs_url": "/docs",
        "settings": {
            "s3_endpoint_url": settings.s3_endpoint_url,
            "s3_region": settings.s3_region,
            "s3_default_bucket": settings.s3_default_bucket,
        },
    }
