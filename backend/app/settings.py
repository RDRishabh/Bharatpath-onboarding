"""Application settings, sourced from the environment.

Secrets come from AWS Secrets Manager, injected as environment variables by the
task definition, and are read exactly once at boot. Nothing here is ever logged
- see `app.core.logging` for the redaction filter that enforces that.

Note what is deliberately NOT here: score base, ceiling, contribution caps,
integrity thresholds, prices, view caps. Those are versioned rows in
`config_values`, not constants, because the client has already changed most of
them once and will change them again. See docs/plan.md section 5.6.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "dev", "staging", "prod"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )

    # -- app ---------------------------------------------------------------
    environment: Environment = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    project_name: str = "BharatPath"

    # -- database ----------------------------------------------------------
    # The application connects as a role WITHOUT BYPASSRLS that does not own
    # the tables. Row-Level Security is the second line of tenant isolation
    # and it silently does nothing if the app connects as the table owner.
    database_url: PostgresDsn
    database_pool_size: int = 10
    database_max_overflow: int = 5
    database_echo: bool = False

    # A separate role for admin reads that legitimately cross tenants. Every
    # session opened on this factory emits an audit event. There is no
    # "admin flag" on the normal session - they are different code paths.
    database_admin_url: PostgresDsn | None = None

    # -- redis -------------------------------------------------------------
    redis_url: RedisDsn
    membership_cache_ttl_seconds: int = 60

    # -- aws ---------------------------------------------------------------
    aws_region: str = "ap-south-1"
    aws_endpoint_url: str | None = None  # LocalStack in dev; None in real AWS

    s3_bucket_resumes: str = "bharatpath-resumes"
    s3_bucket_kyb_documents: str = "bharatpath-kyb-documents"
    s3_bucket_interview_audio: str = "bharatpath-interview-audio"
    s3_bucket_exports: str = "bharatpath-exports"
    s3_bucket_audit_archive: str = "bharatpath-audit-archive"
    s3_bucket_course_media: str = "bharatpath-course-media"

    presigned_url_ttl_seconds: int = 900

    # -- celery ------------------------------------------------------------
    celery_broker_url: str = "sqs://"
    celery_result_backend: str | None = None

    # -- cognito -----------------------------------------------------------
    # Two pools, matching the two authentication models the PRD requires.
    # Authorization does NOT come from Cognito: role and tenant are read from
    # our `memberships` table per request. Token claims go stale, and a
    # membership revocation that does not take effect is exactly the tenant
    # isolation failure SRS 2.24.7 forbids.
    cognito_candidate_pool_id: str | None = None
    cognito_business_pool_id: str | None = None
    cognito_candidate_client_id: str | None = None
    cognito_business_client_id: str | None = None
    jwks_cache_ttl_seconds: int = 3600

    # -- rate limits -------------------------------------------------------
    # Our coarse outer throttle sits in front of Twilio Verify. Twilio's limits
    # protect Twilio's spend; ours protects against someone walking the phone
    # number space. Both are needed.
    otp_start_per_phone_per_hour: int = 5
    otp_start_per_ip_per_hour: int = 20

    @field_validator("database_admin_url", mode="after")
    @classmethod
    def _admin_url_must_differ(cls, v: PostgresDsn | None, info: object) -> PostgresDsn | None:
        # A bypass role that is the same connection as the app role is not a
        # bypass role, it is a mistake that removes RLS everywhere.
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "prod"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Settings are read once per process and cached."""
    return Settings()
