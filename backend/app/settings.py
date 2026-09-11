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

from pydantic import PostgresDsn, RedisDsn, field_validator, model_validator
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

    # Migrations run as a role that OWNS the tables. The application must not.
    #
    # This is not a stylistic split. RLS does not apply to a table's owner, so
    # if Alembic ran as `database_url`, the application role would end up
    # owning every table and Row-Level Security would silently stop applying -
    # while every policy still showed up in `\d+` looking perfectly correct.
    # Nothing would fail; tenant isolation would just quietly not be there.
    database_url_migrator: PostgresDsn | None = None

    # -- redis -------------------------------------------------------------
    redis_url: RedisDsn
    membership_cache_ttl_seconds: int = 60

    # -- CORS --------------------------------------------------------------
    # Which browser origins may call this API. The three web consoles are
    # served from different hosts than the API, so without this the browser
    # blocks every request before it leaves the machine.
    #
    # The mobile app is NOT affected: CORS is a browser mechanism and native
    # HTTP clients ignore it entirely.
    #
    # Set per environment. Never "*" -- with credentials in play a wildcard is
    # both refused by browsers and a genuine security hole.
    cors_allowed_origins: list[str] = [
        "http://localhost:3000",  # employer console, dev
        "http://localhost:3001",  # college console, dev
        "http://localhost:3002",  # admin console, dev
        "http://localhost:5173",  # Vite default
    ]

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

    # Which `token_use` the API accepts. Access tokens are the right choice for
    # a machine API -- they are what an OAuth client is meant to present -- but
    # they carry no contact attributes, so first sign-in resolves phone and
    # email through a separate provider call rather than trusting a claim.
    # S105 is silenced because "access" is a token *kind*, not a credential.
    cognito_token_use: Literal["access", "id"] = "access"  # noqa: S105

    # -- local auth substitute ---------------------------------------------
    # Cognito cannot be emulated: LocalStack's free tier does not provide it,
    # and the candidate pool needs three custom-auth Lambda triggers besides.
    # Rather than stub out authentication -- which would silently disable every
    # gate behind it -- the token verifier is an interface with two
    # implementations, and this flag selects the local one.
    #
    # The local implementation is a real RS256 verifier against a keypair
    # generated at boot. Same code path, same claim validation, same failure
    # modes; only the issuer differs. That is what lets Days 3-8 be built and
    # tested end to end before the pools exist, without carrying stub risk.
    #
    # `_local_auth_is_never_production` below refuses to let this be true in
    # prod, whatever the environment says.
    auth_allow_local_tokens: bool = False

    # Minted by `POST /api/v1/auth/dev/token`, which exists only while the
    # flag above is on. Short, because a long-lived development token has a
    # way of ending up in a shared script.
    local_token_ttl_seconds: int = 3600

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

    @model_validator(mode="after")
    def _local_auth_is_never_production(self) -> Settings:
        """The local token issuer must be impossible to reach in production.

        A misplaced environment variable is all it would take, and the failure
        is silent: the service would keep serving, and would accept tokens
        anyone could mint. So this is a boot-time refusal rather than a
        runtime check -- the process does not start at all.
        """
        if self.auth_allow_local_tokens and self.environment in ("staging", "prod"):
            raise ValueError(
                "AUTH_ALLOW_LOCAL_TOKENS must not be set in staging or production: "
                "it enables a token issuer whose signing key this process generates "
                "itself, so anyone who can reach the API could mint any identity."
            )
        return self

    @model_validator(mode="after")
    def _auth_is_configured_somehow(self) -> Settings:
        """Refuse to boot with no way to verify a token.

        Without this the service starts happily and rejects every authenticated
        request with a 401 that looks like a client bug. Failing at boot names
        the actual problem.
        """
        if not self.auth_allow_local_tokens and not (
            self.cognito_candidate_pool_id or self.cognito_business_pool_id
        ):
            raise ValueError(
                "No authentication configured: set COGNITO_*_POOL_ID for at least one "
                "pool, or AUTH_ALLOW_LOCAL_TOKENS=true for local development."
            )
        return self

    def cognito_pool_id(self, pool: str) -> str | None:
        return {
            "CANDIDATE": self.cognito_candidate_pool_id,
            "BUSINESS": self.cognito_business_pool_id,
        }.get(pool)

    def cognito_client_id(self, pool: str) -> str | None:
        return {
            "CANDIDATE": self.cognito_candidate_client_id,
            "BUSINESS": self.cognito_business_client_id,
        }.get(pool)

    def cognito_issuer(self, pool: str) -> str | None:
        """The `iss` claim a token from this pool must carry."""
        pool_id = self.cognito_pool_id(pool)
        if pool_id is None:
            return None
        return f"https://cognito-idp.{self.aws_region}.amazonaws.com/{pool_id}"

    @property
    def is_production(self) -> bool:
        return self.environment == "prod"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Settings are read once per process and cached."""
    return Settings()
