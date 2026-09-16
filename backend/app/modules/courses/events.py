"""courses - domain events

Catalogue, purchase, completion, +30 contribution.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "courses"

#: A completion was recorded. **Routed to scoring** (`app/tasks/routing.py`),
#: which re-scores from the stored extraction. This module imports nothing
#: from `scoring` (invariant 4'); scoring reads completions through
#: `courses.service.contributions_for`.
COMPLETION_RECORDED: Final = f"{MODULE}.completion_recorded"
