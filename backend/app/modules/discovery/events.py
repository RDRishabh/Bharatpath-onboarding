"""discovery - domain events

Masked search, access-window checks, reveal audit.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "discovery"
