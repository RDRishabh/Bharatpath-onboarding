"""applications - pure domain logic

Apply, stages, withdraw, expiry, hire confirm.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

The stage names live here rather than in `models.py`, which imports them: the
database constraints and the rules below must name the same set, and `domain`
may not import SQLAlchemy.
"""

from __future__ import annotations

from typing import Final, Literal

#: PRD section 9 / SRS 1.20.5. A fixed set, not a configurable pipeline.
STAGES: Final = (
    "SUBMITTED",
    "VIEWED",
    "SHORTLISTED",
    "INTERVIEW",
    "DECISION",
    "HIRED",
    "REJECTED",
    "WITHDRAWN",
    "EXPIRED",
)
#: An application in one of these is finished. It no longer counts against
#: the one-active-application-per-job rule, so a candidate may apply again.
TERMINAL_STAGES: Final = ("HIRED", "REJECTED", "WITHDRAWN", "EXPIRED")

Withdrawal = Literal["WITHDRAW", "ALREADY_WITHDRAWN", "REFUSE"]


def withdrawal(stage: str) -> Withdrawal:
    """What withdrawing an application in `stage` does.

    A candidate can walk away at any point before the outcome, including
    mid-interview: their application is theirs to take back. Withdrawing twice
    is a retry, not an error. Nothing finished can be withdrawn -- a hire is
    recorded by both sides (Day 12), and a rejection or expiry has already
    released the candidate.
    """
    if stage == "WITHDRAWN":
        return "ALREADY_WITHDRAWN"
    if stage in TERMINAL_STAGES:
        return "REFUSE"
    return "WITHDRAW"
