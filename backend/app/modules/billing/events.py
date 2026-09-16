"""billing - domain events

Payments, entitlements, signed callbacks.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "billing"

#: A verified callback was stored. Routed to the task that processes it
#: (`app/tasks/routing.py`): the callback route answers 200 at once and grants
#: nothing itself.
CALLBACK_RECEIVED: Final = f"{MODULE}.callback_received"
PAYMENT_SUCCEEDED: Final = f"{MODULE}.payment_succeeded"
PAYMENT_FAILED: Final = f"{MODULE}.payment_failed"
