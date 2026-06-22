from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    s3_endpoint_url: str = "http://localhost:9000"
    # Public URL the browser can reach for presigned URLs. In Docker Compose the
    # backend talks to MinIO via the internal hostname (s3-server:9000) but the
    # browser must use the host-exposed port (localhost:9000).
    s3_public_url: str = ""
    s3_access_key: str = "local-s3-access-key"
    s3_secret_key: str = "local-s3-secret-key"
    s3_region: str = "us-east-1"
    s3_default_bucket: str = "math-tutor-assets"
    s3_teachers_bucket: str = "teachers"

    # --- Tutor "brain" harness toggles (see services/tutor_ai_service.py) -----
    # Gate the extra free-tier model calls so the demo stays within rate limits.
    tutor_enable_plan: bool = True  # structured "think before you speak" step
    tutor_enable_self_check: bool = False  # extra answer-leak guard (off by default)
    tutor_context_summary_every_n: int = 1  # refresh rolling summary every N turns

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
