"""applications - domain events

Apply, stages, withdraw, expiry, hire confirm.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "applications"

#: Payloads carry identifiers only -- the employer's pipeline (Day 12) resolves
#: them behind its own guards. No name, phone or email ever rides an event.
APPLICATION_SUBMITTED: Final = f"{MODULE}.application_submitted"
APPLICATION_WITHDRAWN: Final = f"{MODULE}.application_withdrawn"
