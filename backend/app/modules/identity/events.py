"""identity - domain events

Users, sessions, Cognito linkage, memberships.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "identity"
