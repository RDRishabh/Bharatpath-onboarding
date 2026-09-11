"""Resolve the caller's role and tenant from OUR database. Never from a claim.

This is the module SRS 2.24.7 is really about. Cognito can tell us who someone
is; only `memberships` can tell us what they may do, and the difference is the
whole of tenant isolation.

**Why not token claims, which would be free?** Because they go stale. An
employer who removes a recruiter expects that recruiter to lose access now, not
whenever their access token happens to expire. A revocation that does not take
effect is precisely the isolation failure 2.24.7 forbids, so the authority is a
row we can delete, read on every request.

**Why a 60-second cache is the right trade.** A database read per request is
affordable but not free at the p99 the performance budget asks for; a 60-second
Redis cache makes it a microsecond lookup and bounds revocation lag at one
minute, which is a number we can state and defend. Longer would be cheaper and
harder to justify; shorter buys latency for lag nobody notices.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_redis
from app.core.logging import get_logger
from app.core.tenant import Membership
from app.settings import get_settings

logger = get_logger(__name__)

_KEY_PREFIX = "membership:v1:"


def cache_key(user_id: uuid.UUID) -> str:
    return f"{_KEY_PREFIX}{user_id}"


async def resolve(session: AsyncSession, user_id: uuid.UUID) -> Membership | None:
    """The caller's single active membership, or None for a candidate.

    A candidate has no membership row -- they belong to no tenant -- so None
    is the ordinary answer for the largest class of user, not an error.
    """
    cached = await _read_cache(user_id)
    if cached is not None:
        return cached.membership

    membership = await _read_database(session, user_id)
    await _write_cache(user_id, membership)
    return membership


async def invalidate(user_id: uuid.UUID) -> None:
    """Drop the cached membership immediately.

    Called when a membership is granted, revoked or has its role changed, so
    that the caller does not have to wait out the TTL. The TTL is the backstop
    for the case where this call is forgotten or fails -- it is not the primary
    mechanism, and it is also why forgetting it degrades rather than breaks.
    """
    try:
        await get_redis().delete(cache_key(user_id))
    except Exception:  # pragma: no cover - a cache we cannot clear expires anyway
        logger.warning("membership_cache_invalidate_failed", user_id=str(user_id))


# ---------------------------------------------------------------------------
# internals
# ---------------------------------------------------------------------------
class _Cached:
    """Distinguishes 'cached: no membership' from 'not cached'.

    A bare `None` would conflate them, and the conflation costs a database
    round trip on every single candidate request -- the majority of traffic.
    """

    __slots__ = ("membership",)

    def __init__(self, membership: Membership | None) -> None:
        self.membership = membership


async def _read_cache(user_id: uuid.UUID) -> _Cached | None:
    try:
        raw = await get_redis().get(cache_key(user_id))
    except Exception:
        # A cache miss and an unreachable cache are the same thing to the
        # caller: read from Postgres. Isolation must not depend on Redis
        # being up.
        logger.warning("membership_cache_unavailable")
        return None

    if raw is None:
        return None
    payload: dict[str, Any] = json.loads(raw)
    if not payload:
        return _Cached(None)
    return _Cached(
        Membership(
            user_id=uuid.UUID(payload["user_id"]),
            tenant_id=uuid.UUID(payload["tenant_id"]),
            role=payload["role"],
            status=payload["status"],
        )
    )


async def _write_cache(user_id: uuid.UUID, membership: Membership | None) -> None:
    payload: dict[str, Any] = (
        {}
        if membership is None
        else {
            "user_id": str(membership.user_id),
            "tenant_id": str(membership.tenant_id),
            "role": membership.role,
            "status": membership.status,
        }
    )
    try:
        await get_redis().set(
            cache_key(user_id),
            json.dumps(payload),
            ex=get_settings().membership_cache_ttl_seconds,
        )
    except Exception:  # pragma: no cover - degraded, not broken
        logger.warning("membership_cache_write_failed")


async def _read_database(session: AsyncSession, user_id: uuid.UUID) -> Membership | None:
    """Read the one active membership for this user.

    `memberships` is deliberately exempt from RLS -- it is the table read to
    *determine* `app.tenant_id`, so the policy could not yet apply (see the
    exemption note in the baseline migration). Isolation here comes from the
    `user_id` filter, and `user_id` is taken from the verified token subject,
    which the caller cannot forge.

    The join on `tenants` is what makes a suspended tenant stop working
    immediately rather than at the next sign-in: suspension is an operational
    control (client, 2026-08-24) and an operational control that takes an hour
    to bite is not one.
    """
    row = (
        await session.execute(
            text(
                """
                SELECT m.user_id, m.tenant_id, m.role, m.status
                  FROM memberships m
                  JOIN tenants t ON t.id = m.tenant_id
                 WHERE m.user_id = :uid
                   AND m.status = 'ACTIVE'
                   AND t.status = 'ACTIVE'
                   AND NOT EXISTS (
                         SELECT 1 FROM tenant_suspensions s
                          WHERE s.tenant_id = m.tenant_id
                            AND s.lifted_at IS NULL
                       )
                 LIMIT 1
                """
            ),
            {"uid": str(user_id)},
        )
    ).first()

    if row is None:
        return None
    return Membership(
        user_id=row.user_id, tenant_id=row.tenant_id, role=row.role, status=row.status
    )
