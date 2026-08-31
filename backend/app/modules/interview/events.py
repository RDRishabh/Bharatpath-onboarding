"""interview - domain events

Audio sessions, chunk upload, evaluation, +20/session.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "interview"
