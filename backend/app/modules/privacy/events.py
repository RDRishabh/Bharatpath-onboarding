"""privacy - domain events

Export and deletion requests, DSR tracking.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.

**There is no event for a deletion request, on purpose.** An event is consumed
as soon as the relay publishes it, and a deletion must wait out its grace
period first -- so it is found by the sweep (`privacy.erase_due`), which reads
the clock, rather than triggered by the request, which cannot.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "privacy"

#: Payload: `user_id`. Aggregate: the request id. Routed to the export task.
EXPORT_REQUESTED: Final = f"{MODULE}.export_requested"
