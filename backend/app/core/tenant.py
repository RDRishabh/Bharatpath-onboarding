"""TenantContext - resolved from DB membership, never from client input.

SRS 2.24.7 is blunt: tenant identifiers must be derived from the authenticated
server-side context rather than trusted from arbitrary client input. There is
no code path here that reads a tenant id from a path, query, body or header.

The membership lookup is cached in Redis for 60 seconds. That number is a
deliberate trade: token claims would be free but go stale, and a membership
revocation that does not take effect is precisely the isolation failure 2.24.7
forbids. A 60-second cache on a DB read costs microseconds and revokes in
seconds.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class TenantContext:
    """The authenticated caller's tenancy, resolved server-side."""

    user_id: UUID
    tenant_id: UUID | None
    role: str
    pool: str

    @property
    def is_tenant_scoped(self) -> bool:
        return self.tenant_id is not None


@dataclass(frozen=True, slots=True)
class Membership:
    user_id: UUID
    tenant_id: UUID
    role: str
    status: str

    @property
    def is_active(self) -> bool:
        return self.status == "ACTIVE"
