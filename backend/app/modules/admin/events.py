"""admin - domain events

Queues, drill-downs, disputes, suspensions.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id. Identifiers only: a suspension reason or a dispute's
description is free text, and an outbox payload is read by consumers far
beyond the member of staff who wrote it.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "admin"

TENANT_SUSPENDED: Final = f"{MODULE}.tenant_suspended"
TENANT_REINSTATED: Final = f"{MODULE}.tenant_reinstated"
DISPUTE_OPENED: Final = f"{MODULE}.dispute_opened"
DISPUTE_CLOSED: Final = f"{MODULE}.dispute_closed"
