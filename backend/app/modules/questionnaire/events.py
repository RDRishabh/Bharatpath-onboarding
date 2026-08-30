"""questionnaire - domain events

Optional attribute questionnaire. Imports nothing from scoring.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "questionnaire"
