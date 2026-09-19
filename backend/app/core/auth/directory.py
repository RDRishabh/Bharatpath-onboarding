"""Creating a sign-in on somebody's behalf: the one write we make to Cognito.

Added 2026-09-18 for admin-created accounts and team invitations
(`docs/signup-and-accounts.md`). Staff create a candidate, an employer or a
college in the console; an owner adds a colleague. Either way the person has
no Cognito user yet, so we ask Cognito to make one: `AdminCreateUser` with the
address as the username, **which emails a temporary password**. The person
signs in with it, Cognito forces a new password (and, in the business pool,
authenticator-app MFA setup), and on their first API call
`app.core.auth.users._adopt_unlinked` links that identity to the row we
created here by email -- so the organisation and role are waiting for them.

**What this is not.** It is not authorisation, and it holds no credential:
Cognito generates and sends the password, and we never see it. The only thing
this module can do is ask for an account to exist, or ask for the invitation
to be sent again.

Two implementations, chosen once at boot like `provider.py`:

* `CognitoAccountDirectory` -- the real one. Needs `cognito-idp:AdminCreateUser`
  on both pools (`infra/terraform/iam.tf`).
* `LocalAccountDirectory` -- local development and tests, whenever
  `AUTH_ALLOW_LOCAL_TOKENS` is on (which `Settings` refuses in staging and
  production). Records what it was asked for, so a test can read it.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Literal, Protocol

from app.core.auth.tokens import Pool
from app.core.logging import get_logger
from app.settings import Settings, get_settings

logger = get_logger(__name__)

#: What `invite` did. ALREADY_REGISTERED is not an error: the person has a
#: sign-in already (they registered themselves first), so no email went out
#: and they should simply sign in.
InviteOutcome = Literal["SENT", "ALREADY_REGISTERED"]


class DirectoryError(Exception):
    """Cognito refused or could not be reached. `code` is safe to log and to
    return; the address never is."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class AccountDirectory(Protocol):
    name: str

    async def invite(self, *, pool: Pool, email: str) -> InviteOutcome:
        """Create a sign-in for `email` in `pool` and email its temporary password."""
        ...

    async def resend_invitation(self, *, pool: Pool, email: str) -> None:
        """Send the temporary password again, with a fresh expiry. Only for an
        account that has never signed in; raises `DirectoryError` otherwise."""
        ...


# ---------------------------------------------------------------------------
# Local
# ---------------------------------------------------------------------------
@dataclass
class LocalAccountDirectory:
    """In memory. `sent` is every invitation a test can inspect."""

    name: str = "local"
    registered: set[tuple[str, str]] = field(default_factory=set)
    sent: list[dict[str, str]] = field(default_factory=list)

    async def invite(self, *, pool: Pool, email: str) -> InviteOutcome:
        key = (pool, email)
        if key in self.registered:
            return "ALREADY_REGISTERED"
        self.registered.add(key)
        self.sent.append({"pool": pool, "email": email, "kind": "INVITE"})
        return "SENT"

    async def resend_invitation(self, *, pool: Pool, email: str) -> None:
        if (pool, email) not in self.registered:
            raise DirectoryError("directory_user_not_found")
        self.sent.append({"pool": pool, "email": email, "kind": "RESEND"})


# ---------------------------------------------------------------------------
# Cognito
# ---------------------------------------------------------------------------
class CognitoAccountDirectory:
    name = "cognito"

    def __init__(self, settings: Settings) -> None:
        self._region = settings.aws_region
        self._pool_ids: dict[Pool, str | None] = {
            "CANDIDATE": settings.cognito_candidate_pool_id,
            "BUSINESS": settings.cognito_business_pool_id,
        }
        self._client: object | None = None

    def _cognito(self) -> object:
        if self._client is None:
            import boto3

            self._client = boto3.client("cognito-idp", region_name=self._region)
        return self._client

    def _pool_id(self, pool: Pool) -> str:
        pool_id = self._pool_ids[pool]
        if not pool_id:
            raise DirectoryError("directory_pool_unconfigured")
        return pool_id

    async def invite(self, *, pool: Pool, email: str) -> InviteOutcome:
        pool_id = self._pool_id(pool)

        def _create() -> InviteOutcome:
            client = self._cognito()
            try:
                client.admin_create_user(  # type: ignore[attr-defined]
                    UserPoolId=pool_id,
                    Username=email,
                    UserAttributes=[
                        {"Name": "email", "Value": email},
                        # Staff typed the address and the temporary password
                        # is sent to it, so reaching the inbox proves it.
                        {"Name": "email_verified", "Value": "true"},
                    ],
                    DesiredDeliveryMediums=["EMAIL"],
                )
            except Exception as exc:
                code = _error_code(exc)
                if code == "UsernameExistsException":
                    return "ALREADY_REGISTERED"
                raise DirectoryError(f"cognito_{code}") from exc
            return "SENT"

        return await asyncio.to_thread(_create)

    async def resend_invitation(self, *, pool: Pool, email: str) -> None:
        pool_id = self._pool_id(pool)

        def _resend() -> None:
            client = self._cognito()
            try:
                client.admin_create_user(  # type: ignore[attr-defined]
                    UserPoolId=pool_id,
                    Username=email,
                    MessageAction="RESEND",
                    DesiredDeliveryMediums=["EMAIL"],
                )
            except Exception as exc:
                raise DirectoryError(f"cognito_{_error_code(exc)}") from exc

        await asyncio.to_thread(_resend)


def _error_code(exc: Exception) -> str:
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        return str(response.get("Error", {}).get("Code", "unknown"))
    return "unreachable"


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------
_directory: AccountDirectory | None = None


def get_account_directory() -> AccountDirectory:
    global _directory
    if _directory is None:
        settings = get_settings()
        # The same switch as the token verifier: local tokens mean there is no
        # Cognito pool to write to, and `Settings` refuses the flag outside
        # local and CI.
        _directory = (
            LocalAccountDirectory()
            if settings.auth_allow_local_tokens
            else CognitoAccountDirectory(settings)
        )
    return _directory


_CONFORMS_LOCAL: type[AccountDirectory] = LocalAccountDirectory
_CONFORMS_COGNITO: type[AccountDirectory] = CognitoAccountDirectory
