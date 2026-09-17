"""admin - pure domain logic

Queues, drill-downs, disputes, suspensions.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

**Who may do what in the console** is one table, `CONSOLE_ROLES`, so the
question "can a support agent suspend an employer?" has a single answer that
the router reads and a test pins. The staff roles exist only in the PLATFORM
tenant (`identity.domain.ROLE_TENANT_TYPE`), so a role guard here is also a
tenant guard.

**Disputes** are raised by all three external groups and closed by us. The
machine is small on purpose -- open, being looked at, closed one of two ways
-- and it lives twice from one source: `DISPUTE_TRANSITIONS` below, and
`guard_dispute_write` in the baseline, generated from it.
"""

from __future__ import annotations

import re
from typing import Final, Literal

# ---------------------------------------------------------------------------
# The console's permission table
# ---------------------------------------------------------------------------
PLATFORM_ADMIN: Final = "PLATFORM_ADMIN"
KYB_REVIEWER: Final = "KYB_REVIEWER"
INTEGRITY_REVIEWER: Final = "INTEGRITY_REVIEWER"
SUPPORT_AGENT: Final = "SUPPORT_AGENT"

Capability = Literal[
    "kyb",
    "integrity",
    "tenants",
    "suspend",
    "seats",
    "candidate_drilldown",
    "employer_drilldown",
    "college_drilldown",
    "disputes",
    "suppress_notifications",
    "audit_search",
]

#: `capability -> the staff roles that hold it`. PLATFORM_ADMIN holds all of
#: them. Stopping an organisation, changing what a college paid for and
#: reading the audit trail are the admin's alone: the first two change what
#: other people can do, and the third is where every other role's actions are
#: recorded.
CONSOLE_ROLES: Final[dict[Capability, frozenset[str]]] = {
    "kyb": frozenset({PLATFORM_ADMIN, KYB_REVIEWER}),
    "integrity": frozenset({PLATFORM_ADMIN, INTEGRITY_REVIEWER}),
    "tenants": frozenset({PLATFORM_ADMIN, KYB_REVIEWER, SUPPORT_AGENT}),
    "suspend": frozenset({PLATFORM_ADMIN}),
    "seats": frozenset({PLATFORM_ADMIN}),
    # The integrity reviewer follows a signal to the person; the KYB reviewer
    # follows a submission to the organisation. Neither needs the other.
    "candidate_drilldown": frozenset({PLATFORM_ADMIN, SUPPORT_AGENT, INTEGRITY_REVIEWER}),
    "employer_drilldown": frozenset({PLATFORM_ADMIN, SUPPORT_AGENT, KYB_REVIEWER}),
    "college_drilldown": frozenset({PLATFORM_ADMIN, SUPPORT_AGENT}),
    "disputes": frozenset({PLATFORM_ADMIN, SUPPORT_AGENT}),
    # A bounce, a complaint, or someone who asked support to stop messaging
    # them. Not their own opt-out, which is theirs to set.
    "suppress_notifications": frozenset({PLATFORM_ADMIN, SUPPORT_AGENT}),
    "audit_search": frozenset({PLATFORM_ADMIN}),
}

# ---------------------------------------------------------------------------
# Disputes
# ---------------------------------------------------------------------------
DISPUTE_KINDS: Final = ("HIRE", "PAYMENT", "ACCOUNT", "OTHER")
DISPUTE_PARTIES: Final = ("CANDIDATE", "EMPLOYER", "COLLEGE")
DISPUTE_STATES: Final = ("OPEN", "IN_REVIEW", "RESOLVED", "REJECTED")
CLOSED_DISPUTE_STATES: Final = frozenset({"RESOLVED", "REJECTED"})
#: How a dispute arrived. `HIRE_DISPUTE` is opened for the candidate when they
#: say a hire did not happen (Day 12's dispute, which until now nobody read).
DISPUTE_SOURCES: Final = ("RAISED", "HIRE_DISPUTE")

DisputeKind = Literal["HIRE", "PAYMENT", "ACCOUNT", "OTHER"]
DisputeParty = Literal["CANDIDATE", "EMPLOYER", "COLLEGE"]
DisputeOutcome = Literal["RESOLVED", "REJECTED"]

DISPUTE_TRANSITIONS: Final[frozenset[tuple[str, str]]] = frozenset(
    {
        ("OPEN", "IN_REVIEW"),
        ("OPEN", "RESOLVED"),
        ("OPEN", "REJECTED"),
        ("IN_REVIEW", "RESOLVED"),
        ("IN_REVIEW", "REJECTED"),
    }
)

#: What each group may dispute. A college has no applications, so it cannot
#: dispute a hire; everyone can dispute a payment or their account.
KINDS_BY_PARTY: Final[dict[str, frozenset[str]]] = {
    "CANDIDATE": frozenset(DISPUTE_KINDS),
    "EMPLOYER": frozenset(DISPUTE_KINDS),
    "COLLEGE": frozenset({"PAYMENT", "ACCOUNT", "OTHER"}),
}

_PARTY_BY_ROLE: Final[dict[str, str]] = {
    "CANDIDATE": "CANDIDATE",
    "EMPLOYER_OWNER": "EMPLOYER",
    "EMPLOYER_RECRUITER": "EMPLOYER",
    "COLLEGE_ADMIN": "COLLEGE",
    "COLLEGE_STAFF": "COLLEGE",
}
#: The roles that may raise a dispute. A viewer reads; raising a dispute on
#: an organisation's behalf is acting for it.
DISPUTE_RAISER_ROLES: Final[frozenset[str]] = frozenset(_PARTY_BY_ROLE)

MAX_DISPUTE_DESCRIPTION: Final = 2000
MAX_RESOLUTION: Final = 2000


def party_for_role(role: str) -> str | None:
    return _PARTY_BY_ROLE.get(role)


def dispute_refusal(*, party: str, kind: str, has_application: bool) -> str | None:
    """Why a dispute cannot be raised as asked, or None.

    A HIRE dispute names the application; nothing else does, because an
    application id on a payment dispute is a cross-link nobody asked for and
    that the queue would then have to explain.
    """
    if kind not in KINDS_BY_PARTY.get(party, frozenset()):
        return "dispute_kind_not_allowed"
    if (kind == "HIRE") != has_application:
        return (
            "dispute_application_required" if kind == "HIRE" else "dispute_application_unexpected"
        )
    return None


def dispute_transition_refusal(current: str, target: str) -> str | None:
    if current in CLOSED_DISPUTE_STATES:
        return "dispute_closed"
    if (current, target) not in DISPUTE_TRANSITIONS:
        return "dispute_transition_invalid"
    return None


# ---------------------------------------------------------------------------
# What a drill-down shows of a person's contact details
# ---------------------------------------------------------------------------
_DIGITS: Final = re.compile(r"\d")


def mask_phone(phone: str | None) -> str | None:
    """`+919876543210` -> `+91******3210`.

    A support agent confirming "is this your number ending 3210?" needs the
    last four digits and nothing more. The full number would put every
    candidate's phone one console screen away from anyone with the role.
    """
    if not phone:
        return None
    digits = [i for i, ch in enumerate(phone) if _DIGITS.match(ch)]
    if len(digits) <= 4:
        return "*" * len(phone)
    keep_prefix = 2 if phone.startswith("+") else 0
    hidden = set(digits[keep_prefix:-4])
    return "".join("*" if i in hidden else ch for i, ch in enumerate(phone))


def mask_email(email: str | None) -> str | None:
    """`priya.sharma@example.com` -> `p***@example.com`. The domain stays: it
    is how support tells a work address from a personal one."""
    if not email or "@" not in email:
        return None
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}"
