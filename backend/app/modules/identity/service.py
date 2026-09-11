"""identity - business rules and transaction boundaries

Users, sessions, Cognito linkage, memberships.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import membership as membership_lookup
from app.core.logging import get_logger
from app.core.ratelimit import hit
from app.modules.identity import repository
from app.settings import get_settings

logger = get_logger(__name__)

OTP_WINDOW_SECONDS = 3600


async def start_otp_challenge(*, phone: str, client_ip: str | None) -> int:
    """Throttle an OTP request, then let the client proceed to Cognito.

    **Two counters, not one, and both are needed.** Per-phone stops someone
    hammering one victim's number into a flood of login texts. Per-IP stops
    someone walking the number space -- which the per-phone limit alone would
    happily allow, five messages at a time, across every number in India.

    This service does not call Twilio and does not send anything. The client
    goes to Cognito next; Cognito's custom-auth Lambdas call Twilio Verify.
    We are the outer throttle in front of that, and nothing else
    (docs/plan.md 5.8).

    Returns the window length, so the client can render a resend timer that
    matches the server's actual behaviour rather than guessing.
    """
    settings = get_settings()

    await hit(
        bucket="otp:phone",
        subject=phone,
        limit=settings.otp_start_per_phone_per_hour,
        window_seconds=OTP_WINDOW_SECONDS,
    )
    if client_ip:
        await hit(
            bucket="otp:ip",
            subject=client_ip,
            limit=settings.otp_start_per_ip_per_hour,
            window_seconds=OTP_WINDOW_SECONDS,
        )

    # Logged without the number. A phone number in an application log is
    # personal data sitting in a system with far broader access than the
    # database, and DPDP does not care that it was convenient.
    logger.info("otp_challenge_allowed")
    return OTP_WINDOW_SECONDS


async def grant_membership(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    role: str,
) -> None:
    """Add or restore a membership, then drop the cached lookup.

    The cache invalidation is not an optimisation. Without it a newly added
    recruiter waits up to 60 seconds before their access works, and support
    gets a ticket about it every single time.
    """
    await repository.upsert_membership(session, user_id=user_id, tenant_id=tenant_id, role=role)
    await membership_lookup.invalidate(user_id)


async def revoke_membership(
    session: AsyncSession, *, user_id: uuid.UUID, tenant_id: uuid.UUID
) -> None:
    """Revoke access, then drop the cached lookup.

    Here the invalidation matters far more than it does on grant: the whole
    argument for reading membership from our database rather than from a token
    claim is that revocation takes effect promptly. Sixty seconds is the
    backstop if this fails; it is not meant to be the normal path.
    """
    await repository.revoke_membership(session, user_id=user_id, tenant_id=tenant_id)
    await membership_lookup.invalidate(user_id)
