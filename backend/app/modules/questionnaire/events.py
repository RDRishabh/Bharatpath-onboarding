"""questionnaire - domain events

Optional attribute questionnaire. Imports nothing from scoring.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "questionnaire"

#: The candidate submitted, or re-submitted, their answers. **Routed to
#: nothing that scores** -- the questionnaire is worth zero points, and
#: `tests/invariants/test_questionnaire_never_scores.py` fails the build if
#: this event ever reaches a scoring task.
SUBMITTED: Final = f"{MODULE}.submitted"
