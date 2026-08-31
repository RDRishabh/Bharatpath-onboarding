"""FastAPI dependencies: authentication, role, tenant, and the paid gates.

The gate hierarchy matters and the pieces must not be merged. As of v6 an
employer passes through up to three independent checks, and they fail
differently and return different error codes:

  1. `current_user`               - a verified JWT from the correct pool
  2. `require_role(...)`          - role read from OUR memberships table
  3. `require_active_subscription`- pay-first, all three audiences (R13)
  4. `require_active_access_window` - the employer's paid period (R14)
     and, separately, `require_kyb_approved` where the config demands it (R15)

Conflating 3 and 4, or 4 and KYB, produces an error message that tells the user
the wrong thing to do about it.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.errors import (
    AccessWindowExpiredError,
    KybRequiredError,
    PermissionDeniedError,
    SubscriptionRequiredError,
    UnauthenticatedError,
)
from app.core.tenant import TenantContext

# --- roles, SRS 1.2 -------------------------------------------------------
CANDIDATE = "CANDIDATE"
EMPLOYER_OWNER = "EMPLOYER_OWNER"
EMPLOYER_RECRUITER = "EMPLOYER_RECRUITER"
EMPLOYER_VIEWER = "EMPLOYER_VIEWER"
COLLEGE_ADMIN = "COLLEGE_ADMIN"
COLLEGE_STAFF = "COLLEGE_STAFF"
PLATFORM_ADMIN = "PLATFORM_ADMIN"
KYB_REVIEWER = "KYB_REVIEWER"
INTEGRITY_REVIEWER = "INTEGRITY_REVIEWER"
SUPPORT_AGENT = "SUPPORT_AGENT"

ALL_ROLES: frozenset[str] = frozenset(
    {
        CANDIDATE,
        EMPLOYER_OWNER,
        EMPLOYER_RECRUITER,
        EMPLOYER_VIEWER,
        COLLEGE_ADMIN,
        COLLEGE_STAFF,
        PLATFORM_ADMIN,
        KYB_REVIEWER,
        INTEGRITY_REVIEWER,
        SUPPORT_AGENT,
    }
)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> TenantContext:
    """Verify the JWT and resolve role and tenant from OUR database.

    Deliberately does not read role or tenant from token claims. See
    `app.core.tenant` for why.

    TODO(Day 3): wire `app.core.cognito.verify_token`, then resolve membership
    through the Redis-cached lookup. Until then this raises, which is the safe
    default - a stub that returns a user would silently disable every gate.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthenticatedError()
    raise UnauthenticatedError(code="auth_not_yet_wired")


CurrentUser = Annotated[TenantContext, Depends(current_user)]


def require_role(*roles: str) -> Callable[[TenantContext], Awaitable[TenantContext]]:
    """Authorisation is by role, never by URL prefix.

    A candidate hitting an `/employer/*` route is rejected here, not by
    routing. The path prefixes exist for readability only.
    """
    unknown = set(roles) - ALL_ROLES
    if unknown:
        raise ValueError(f"unknown role(s) in require_role: {sorted(unknown)}")

    async def _dep(user: CurrentUser) -> TenantContext:
        if user.role not in roles:
            raise PermissionDeniedError()
        return user

    return _dep


def require_tenant() -> Callable[[TenantContext], Awaitable[TenantContext]]:
    async def _dep(user: CurrentUser) -> TenantContext:
        if user.tenant_id is None:
            raise PermissionDeniedError()
        return user

    return _dep


async def require_active_subscription(user: CurrentUser) -> TenantContext:
    """Pay-first, for all three audiences (R13).

    Sign-up creates an account; everything else needs payment. A lapsed
    subscriber keeps their account and their score history and loses access -
    they never lose data.

    TODO(Day 11/15): read the subscription state.
    """
    raise SubscriptionRequiredError()


async def require_active_access_window(user: CurrentUser) -> TenantContext:
    """Invariant 7: the employer's paid period, checked on every reveal (R14).

    One check, one place. The subscription IS the entitlement - there is no
    per-candidate unlock row any more, nothing to decrement, and **no cached
    entitlement, deliberately**. A window lapsing mid-session must mask the
    very next read, so this reads current state every time.

    TODO(Day 14): read the tenant's subscription window.
    """
    raise AccessWindowExpiredError()


async def require_kyb_approved(user: CurrentUser) -> TenantContext:
    """Invariant 8 / PRD rule 7. Enforced at service AND database level.

    `kyb.require_approval` defaults to off (R15), which makes this pass
    trivially in production. The gate, the Postgres trigger and the invariant
    test all stay - the config flag is the only thing that changed, and the
    test runs with the flag ON so the gate stays genuinely exercised.

    TODO(Day 10): read kyb_status and the config flag.
    """
    raise KybRequiredError()


def get_request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


__all__ = [
    "ALL_ROLES",
    "CANDIDATE",
    "COLLEGE_ADMIN",
    "COLLEGE_STAFF",
    "EMPLOYER_OWNER",
    "EMPLOYER_RECRUITER",
    "EMPLOYER_VIEWER",
    "INTEGRITY_REVIEWER",
    "KYB_REVIEWER",
    "PLATFORM_ADMIN",
    "SUPPORT_AGENT",
    "CurrentUser",
    "DbSession",
    "current_user",
    "require_active_access_window",
    "require_active_subscription",
    "require_kyb_approved",
    "require_role",
    "require_tenant",
]
