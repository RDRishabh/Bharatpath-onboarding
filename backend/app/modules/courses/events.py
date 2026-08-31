"""courses - domain events

Catalogue, purchase, completion, +30 contribution.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "courses"
