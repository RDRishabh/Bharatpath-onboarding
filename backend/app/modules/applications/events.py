"""applications - domain events

Apply, stages, withdraw, expiry, hire confirm.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "applications"
