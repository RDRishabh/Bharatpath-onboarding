"""kyb - domain events

Submissions, documents, review state machine.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "kyb"

#: Approved on arrival, while `kyb.require_approval` is off (R15).
APPROVED: Final = f"{MODULE}.approved"
#: Waiting for a reviewer, while it is on.
SUBMITTED: Final = f"{MODULE}.submitted"
#: A reviewer's decision; the payload carries which.
REVIEWED: Final = f"{MODULE}.reviewed"
