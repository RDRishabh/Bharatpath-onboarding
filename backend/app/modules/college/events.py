"""college - domain events

Institution tenant, roster, invites, consent, referral codes.

Events this module emits through the transactional outbox. Consumers are
idempotent by event id. **None carries a student's name or contact**: ids
only, resolved by a consumer entitled to read them.
"""

from __future__ import annotations

from typing import Final

MODULE: Final = "college"

ORGANISATION_CREATED: Final = f"{MODULE}.organisation_created"

#: A college's seat allowance changed, with how many waiting students it seated.
SEATS_ALLOCATED: Final = f"{MODULE}.seats_allocated"

#: A student linked to a college by code or invitation: a ROSTER consent was
#: granted. For analytics (Day 18) and notifications (Day 19).
STUDENT_LINKED: Final = f"{MODULE}.student_linked"

ROSTER_IMPORT_COMMITTED: Final = f"{MODULE}.roster_import_committed"

#: One invitation to send. For notifications (Day 19), which read the contact
#: from the roster row; routed to nothing until then.
INVITATION_SENT: Final = f"{MODULE}.invitation_sent"
