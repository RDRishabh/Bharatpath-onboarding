"""applications - pure domain logic

Apply, stages, withdraw, expiry, hire confirm.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

The stage names live here rather than in `models.py`, which imports them: the
database constraints and the rules below must name the same set, and `domain`
may not import SQLAlchemy. The baseline migration builds its transition guard
from `allowed_transitions()` for the same reason.

**Three parties move an application, and each moves it somewhere different.**

  * The **employer** walks it forward through the fixed pipeline one stage at a
    time, or rejects it. Opening a submitted application records VIEWED.
  * The **candidate** withdraws it, or confirms a hire the employer proposed.
  * The **system** expires it when the employer has gone quiet.

HIRED belongs to nobody alone: the employer proposes it and the candidate's
confirmation is the transition (PRD 5.2, SRS 1.13.3).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Final, Literal
from urllib.parse import urlsplit

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

#: The open stages, in pipeline order.
PIPELINE: Final = ("SUBMITTED", "VIEWED", "SHORTLISTED", "INTERVIEW", "DECISION")

#: Where an employer may send an application. HIRED is absent -- it needs the
#: candidate -- and so are WITHDRAWN (the candidate's) and EXPIRED (the clock's).
EMPLOYER_TARGETS: Final = ("VIEWED", "SHORTLISTED", "INTERVIEW", "DECISION", "REJECTED")

#: What `application_events.kind` records. A stage change, or something that
#: happened to an application without moving it.
EVENT_KINDS: Final = ("STAGE_CHANGED", "INTERVIEW_SCHEDULED", "HIRE_PROPOSED", "HIRE_DISPUTED")
ACTOR_TYPES: Final = ("CANDIDATE", "EMPLOYER", "SYSTEM")

Actor = Literal["CANDIDATE", "EMPLOYER", "SYSTEM"]


def allowed_transitions() -> frozenset[tuple[str, str]]:
    """Every `(from, to)` stage change anyone may make. The database guard's list.

    The union of the three parties' moves; which party may make which one is
    decided by the functions below, and at the database by who is bound.
    """
    pairs = {(PIPELINE[i], PIPELINE[i + 1]) for i in range(len(PIPELINE) - 1)}
    for stage in PIPELINE:
        pairs |= {(stage, "REJECTED"), (stage, "WITHDRAWN"), (stage, "EXPIRED")}
    pairs.add(("DECISION", "HIRED"))
    return frozenset(pairs)


# ---------------------------------------------------------------------------
# The employer's moves
# ---------------------------------------------------------------------------
def employer_move(current: str, target: str) -> tuple[str, ...] | None:
    """The stages to record, in order, to move an application to `target`.

    `None` when the move is refused; `()` when it is already there, so a retried
    drag on a pipeline board is not an error.

    **One stage forward, or rejected.** SRS 1.9.2 has the recruiter choose "the
    next permitted stage"; skipping from VIEWED to DECISION would put a
    candidate at a decision with no shortlist and no interview on their board.

    **Acting on a submitted application is viewing it.** Shortlisting or
    rejecting one nobody opened records VIEWED first, so the candidate's
    history never says an employer decided about something it had not seen.
    """
    if target == current:
        return ()
    if current in TERMINAL_STAGES or target not in EMPLOYER_TARGETS:
        return None
    steps: tuple[str, ...] = ()
    if current == "SUBMITTED" and target != "VIEWED":
        steps, current = ("VIEWED",), "VIEWED"
    if target == "REJECTED":
        return (*steps, "REJECTED")
    if PIPELINE.index(target) == PIPELINE.index(current) + 1:
        return (*steps, target)
    return None


#: The one stage an interview can be scheduled at (SRS 1.13.2, "an
#: interview-capable stage").
INTERVIEW_STAGE: Final = "INTERVIEW"
MAX_MEETING_URL_LENGTH: Final = 1024
#: A date further out than this is a typo in the year, not a plan.
MAX_SCHEDULE_AHEAD: Final = timedelta(days=365)


def refuse_meeting(*, meeting_url: str, interview_at: datetime, now: datetime) -> str | None:
    """The error code for an interview that cannot be scheduled, or None.

    **The link is the employer's, and it is sent to a candidate.** With KYB
    auto-approved (R15), the employer may be nobody in particular, so the link
    is held to what a meeting link is: `https`, a real host name, no
    credentials, no whitespace. A `javascript:` or `http:` link, or one that
    hides a host behind `user@`, is refused rather than passed on.
    """
    if interview_at.tzinfo is None or now.tzinfo is None:
        raise ValueError("interview_at and now must be timezone-aware")
    if interview_at <= now:
        return "interview_time_in_past"
    if interview_at > now + MAX_SCHEDULE_AHEAD:
        return "interview_time_too_far"

    if len(meeting_url) > MAX_MEETING_URL_LENGTH or any(
        ch.isspace() or ord(ch) < 32 or ord(ch) == 127 for ch in meeting_url
    ):
        return "meeting_url_invalid"
    try:
        parts = urlsplit(meeting_url)
        host = parts.hostname
    except ValueError:
        return "meeting_url_invalid"
    if parts.scheme != "https" or not host or "." not in host:
        return "meeting_url_invalid"
    if parts.username is not None or parts.password is not None:
        return "meeting_url_invalid"
    return None


# ---------------------------------------------------------------------------
# Hire confirmation: the employer proposes, the candidate confirms
# ---------------------------------------------------------------------------
HireState = Literal["NONE", "PENDING", "DISPUTED", "CONFIRMED"]


def hire_state(
    *, stage: str, employer_confirmed: bool, candidate_confirmed: bool, disputed: bool
) -> HireState:
    if stage == "HIRED" and employer_confirmed and candidate_confirmed:
        return "CONFIRMED"
    if stage != "DECISION" or not employer_confirmed:
        return "NONE"
    return "DISPUTED" if disputed else "PENDING"


def employer_hire(
    *, stage: str, employer_confirmed: bool
) -> Literal["PROPOSE", "ALREADY_PROPOSED", "REFUSE"]:
    """Marking a candidate hired is a proposal, made at DECISION and only there.

    Proposing twice is a retry. After a rejection, a withdrawal or an expiry
    there is nobody left to hire.
    """
    if stage == "HIRED" or (stage == "DECISION" and employer_confirmed):
        return "ALREADY_PROPOSED"
    if stage != "DECISION":
        return "REFUSE"
    return "PROPOSE"


def candidate_confirm(
    *, stage: str, employer_confirmed: bool
) -> Literal["CONFIRM", "ALREADY_CONFIRMED", "REFUSE"]:
    """The candidate's confirmation is what makes a hire final.

    Allowed after a dispute: a candidate who disputed by mistake, or who has
    since sorted it out with the employer, can still confirm. Nothing to
    confirm before the employer has proposed.
    """
    if stage == "HIRED":
        return "ALREADY_CONFIRMED"
    if stage != "DECISION" or not employer_confirmed:
        return "REFUSE"
    return "CONFIRM"


def candidate_dispute(
    *, stage: str, employer_confirmed: bool, disputed: bool
) -> Literal["DISPUTE", "ALREADY_DISPUTED", "REFUSE"]:
    """The candidate says the hire did not happen. Recorded; the hire stays unconfirmed.

    A dispute does not reject or withdraw anything. It leaves the application
    at DECISION with the proposal standing, so it closes one of three ways:
    the candidate confirms after all, the employer rejects, or the candidate
    withdraws. Deciding who was right is a human's job (blockers E10).
    """
    if stage != "DECISION" or not employer_confirmed:
        return "REFUSE"
    if disputed:
        return "ALREADY_DISPUTED"
    return "DISPUTE"


# ---------------------------------------------------------------------------
# Expiry: the employer went quiet
# ---------------------------------------------------------------------------
#: **Our number, not the client's.** The PRD asks for "automatic expiry if an
#: employer goes silent" and names no period. Thirty days is long enough to
#: survive a hiring freeze's worth of silence and short enough that a candidate
#: is not left waiting a quarter. `config_values` key `applications.expiry`
#: replaces it.
DEFAULT_INACTIVE_DAYS: Final = 30
MIN_INACTIVE_DAYS: Final = 7
MAX_INACTIVE_DAYS: Final = 365


class ExpiryRulesError(ValueError):
    """The configured expiry rules cannot be applied."""


@dataclass(frozen=True, slots=True)
class ExpiryRules:
    inactive_days: int
    version: str

    @property
    def period(self) -> timedelta:
        return timedelta(days=self.inactive_days)


DEFAULT_EXPIRY_RULES: Final = ExpiryRules(inactive_days=DEFAULT_INACTIVE_DAYS, version="code-v1")


def expiry_rules_from_config(value: object, *, version: str) -> ExpiryRules:
    """Parse `{"inactive_days": n}`. Strict: anything doubtful raises.

    A bad row must not quietly become the default -- nor, worse, a period of
    one day that releases every candidate in the pipeline overnight. Hence the
    bounds.
    """
    if not isinstance(value, dict) or set(value) != {"inactive_days"}:
        raise ExpiryRulesError('expected {"inactive_days": <int>}')
    days = value["inactive_days"]
    if isinstance(days, bool) or not isinstance(days, int):
        raise ExpiryRulesError("inactive_days must be an integer")
    if not MIN_INACTIVE_DAYS <= days <= MAX_INACTIVE_DAYS:
        raise ExpiryRulesError(
            f"inactive_days must be between {MIN_INACTIVE_DAYS} and {MAX_INACTIVE_DAYS}"
        )
    return ExpiryRules(inactive_days=days, version=version)


def expires(
    *,
    stage: str,
    employer_active_at: datetime,
    interview_at: datetime | None,
    employer_confirmed: bool,
    now: datetime,
    rules: ExpiryRules,
) -> bool:
    """Whether the employer's silence has lasted long enough to release the candidate.

    Silence is measured from the employer's last action on this application --
    submission counts as the start -- **or from a scheduled interview**, so an
    interview booked six weeks out does not expire in week five. A proposed
    hire never expires: the employer has acted, and it is the candidate who is
    being waited on.
    """
    if stage in TERMINAL_STAGES or employer_confirmed:
        return False
    last = employer_active_at if interview_at is None else max(employer_active_at, interview_at)
    return last < now - rules.period


# ---------------------------------------------------------------------------
# The candidate's side
# ---------------------------------------------------------------------------
Withdrawal = Literal["WITHDRAW", "ALREADY_WITHDRAWN", "REFUSE"]


def withdrawal(stage: str) -> Withdrawal:
    """What withdrawing an application in `stage` does.

    A candidate can walk away at any point before the outcome, including
    mid-interview and with a hire proposed: their application is theirs to take
    back. Withdrawing twice is a retry, not an error. Nothing finished can be
    withdrawn -- a hire was confirmed by both sides, and a rejection or expiry
    has already released the candidate.
    """
    if stage == "WITHDRAWN":
        return "ALREADY_WITHDRAWN"
    if stage in TERMINAL_STAGES:
        return "REFUSE"
    return "WITHDRAW"
