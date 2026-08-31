"""scoring - domain events

Engine interface, versions, history, breakdown.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "scoring"
