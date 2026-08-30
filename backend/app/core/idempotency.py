"""Idempotency as a FastAPI dependency.

SRS 2.24.4 names six operations that must support idempotent processing.
Five of the original six survive v6 - R14 deleted the unlock transaction, so
there is no unlock request left to protect. Subscription purchase and renewal
takes the freed slot, because a double-charged renewal is the same failure
wearing a different coat.

The row IS the lock: INSERT ... ON CONFLICT DO NOTHING. No advisory locks, no
separate Redis key that can drift out of step with the database.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import Any, Final

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import IdempotencyKeyReuseError, OperationInProgressError
from app.core.models import IdempotencyKey

RETENTION: Final = timedelta(hours=24)

#: Every operation here must carry the idempotency dependency. A test asserts
#: this list matches the routes that declare it, so it cannot be silently
#: forgotten when someone adds an endpoint.
IDEMPOTENT_OPERATIONS: Final[frozenset[str]] = frozenset(
    {
        "payment",
        "subscription_purchase",   # replaces "unlock" (R14)
        "application_create",
        "job_publish",
        "hire_confirm",
        "roster_import",
    }
)


def hash_request(body: Any) -> str:
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


async def claim(
    session: AsyncSession, *, key: str, endpoint: str, request_hash: str
) -> dict[str, Any] | None:
    """Try to claim the key. Returns a stored response to replay, or None.

    Three outcomes, matching docs/plan.md section 5.3:
      * claimed        -> None (caller proceeds)
      * COMPLETED,     -> the stored response, replayed verbatim
        same hash
      * COMPLETED,     -> 422, the client reused a key with a new payload
        different hash
      * IN_PROGRESS    -> 409 with Retry-After
    """
    stmt = (
        pg_insert(IdempotencyKey)
        .values(
            key=key,
            endpoint=endpoint,
            request_hash=request_hash,
            state="IN_PROGRESS",
            expires_at=datetime.now(UTC) + RETENTION,
        )
        .on_conflict_do_nothing(index_elements=["key", "endpoint"])
    )
    result = await session.execute(stmt)
    if result.rowcount:
        return None  # we hold the lock

    existing = (
        await session.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.key == key, IdempotencyKey.endpoint == endpoint
            )
        )
    ).scalar_one()

    if existing.request_hash != request_hash:
        raise IdempotencyKeyReuseError()
    if existing.state == "IN_PROGRESS":
        raise OperationInProgressError()
    return {"status": existing.response_status, "body": existing.response_body}


async def complete(
    session: AsyncSession,
    *,
    key: str,
    endpoint: str,
    status_code: int,
    body: dict[str, Any] | None,
) -> None:
    row = (
        await session.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.key == key, IdempotencyKey.endpoint == endpoint
            )
        )
    ).scalar_one()
    row.state = "COMPLETED"
    row.response_status = status_code
    row.response_body = body
