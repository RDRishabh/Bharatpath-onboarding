"""engagement - domain events

Daily app-open streaks and engagement points. Never the score.

Events this module emits through the transactional outbox. Consumers
are idempotent by event id.

**No scoring consumer may ever subscribe to these.** A streak moving the score
would break invariants 1-3 and 4-prime at once -- see `docs/streaks.md` §2.
The obvious future consumer is `notifications` (a "you reached 30 days"
message, or an at-risk nudge), which is the only kind these exist for.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "engagement"

STREAK_BROKEN: Final = f"{MODULE}.streak_broken"
MILESTONE_REACHED: Final = f"{MODULE}.milestone_reached"
