"""discovery - pure domain logic

Masked search, access-window checks, reveal audit.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

**What a masked card may say** (plan.md Day 13, SRS 1.14.1, 2.9.6): a band,
roughly how much experience, which skills, where, and which add-ons were
completed. Never a name, a phone number, an email or the score itself. Most of
that is kept out by the card having nowhere to put it (`schemas.MaskedCandidate`);
the rules below cover the one gap a schema cannot close on its own -- free
text that came from a CV.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, fields
from typing import Final, Literal

#: `scores.contributing_events[].kind` -> the badge an employer sees.
#:
#: A badge says an add-on was completed and folded into the score. It never
#: says what was answered, how an interview went, or how many points it earned
#: -- "badges only, never raw add-on content". The kinds are the ones
#: `scoring.service.replay` reads, and an invariant test holds the two together.
#:
#: The questionnaire has no badge yet: it has no tables until Day 16.
BADGE_FOR_ADDON_KIND: Final[dict[str, str]] = {
    "course": "COURSE_COMPLETED",
    "interview": "MOCK_INTERVIEW_COMPLETED",
}

#: Anything that could be an email address or a phone number.
#:
#: Skills come from the Layer 1 extraction of a CV, and a CV is written by the
#: person it describes -- so "Skills: call 98765 43210" is a way to put a phone
#: number on a masked card. A skill matching this is dropped from the search
#: document (so it cannot be searched for either) and again at the card.
#:
#: One pattern, deliberately written in the regex dialect Python and Postgres
#: share, because the migration's trigger applies the same text with `~`.
#: A run of eight or more digit-ish characters is a phone number; "ISO
#: 9001:2015", "IEC 61131-3" and "Python 3.12" are not.
CONTACT_LIKE_PATTERN: Final = r"@|[0-9][0-9 ()+.-]{6,}[0-9]"
_CONTACT_LIKE: Final = re.compile(CONTACT_LIKE_PATTERN)

MAX_SKILL_LENGTH: Final = 80
#: Skills shown on one card. The search document keeps all of them for
#: filtering; a card is a summary, not the CV.
MAX_CARD_SKILLS: Final = 20
#: Skills one search may require. Each is an array-containment term on a GIN
#: index, so this bounds the query rather than the index.
MAX_SKILL_FILTERS: Final = 5
MAX_EXPERIENCE_YEARS: Final = 60


def looks_like_contact(value: str) -> bool:
    return _CONTACT_LIKE.search(value) is not None


def skill_key(value: str) -> str:
    """How a skill is matched: trimmed and case-folded, as the trigger stores it."""
    return value.strip().lower()


def displayable_skills(skills: Iterable[object]) -> list[str]:
    """The skills a card may show, in order: trimmed, bounded, never contact data.

    Drops rather than raises. This runs while a response is being built, and a
    CV carrying one odd skill must not turn a whole search page into a 500.
    """
    shown: list[str] = []
    for skill in skills:
        if not isinstance(skill, str):
            continue
        name = skill.strip()
        if not name or len(name) > MAX_SKILL_LENGTH or looks_like_contact(name):
            continue
        shown.append(name)
        if len(shown) == MAX_CARD_SKILLS:
            break
    return shown


def experience_years(months: int) -> int:
    """Whole years, rounded down. The filter asks for "at least N years", and
    rounding up would admit someone eleven months short of it."""
    return min(max(0, months) // 12, MAX_EXPERIENCE_YEARS)


# ---------------------------------------------------------------------------
# Abuse controls (Day 14)
# ---------------------------------------------------------------------------
#
# One payment buys the whole candidate database (R14), and KYB approves itself
# (R15), so **the throttle is the protection**. These are mitigation, not a
# fix -- the fix is verifying who pays, and the client has switched that off
# (plan.md R14, blockers B7).


@dataclass(frozen=True, slots=True)
class DiscoveryLimits:
    """Every number that throttles an employer's reach into the pool.

    Loaded from `config_values` key `discovery.limits`; these defaults apply
    only when no row exists. They are **ours, not the client's**: generous
    for a recruiter screening by hand, and a ceiling far below the pool for
    anyone walking it.
    """

    #: Distinct candidates one organisation may open per rolling hour.
    views_per_hour: int = 60
    #: Distinct candidates one organisation may open per rolling 24 hours.
    views_per_day: int = 300
    #: Profile requests per person per minute, re-opens included. A burst
    #: limit in Redis, ahead of the database.
    reveals_per_minute: int = 20
    #: Masked search pages per organisation per hour (Day 13's floor).
    search_pages_per_hour: int = 300
    #: One person opening this many distinct candidates inside this many
    #: minutes is flagged for a human.
    velocity_window_minutes: int = 10
    velocity_views: int = 40


DEFAULT_LIMITS: Final = DiscoveryLimits()

#: Above this, a limit is a typo rather than a decision.
MAX_LIMIT_VALUE: Final = 100_000
#: The view counts read one rolling day of the log, so a velocity window
#: longer than that would silently count less than it says.
MAX_VELOCITY_WINDOW_MINUTES: Final = 24 * 60


class DiscoveryLimitsError(ValueError):
    """A `discovery.limits` document that cannot be applied."""


def limits_from_config(value: Mapping[str, object]) -> DiscoveryLimits:
    """Parse a `config_values` document. **Strict**: anything doubtful raises.

    Any key may be omitted to keep its default. An unknown key raises, because
    the likeliest cause is a misspelling, and ignoring `views_per_dya` would
    leave the default live while the row looked applied -- for the one control
    standing between a single payment and the whole pool.
    """
    names = {f.name for f in fields(DiscoveryLimits)}
    unknown = set(value) - names
    if unknown:
        raise DiscoveryLimitsError(f"unknown discovery limit keys: {sorted(unknown)}")
    parsed: dict[str, int] = {}
    for name in names:
        raw = value.get(name, getattr(DEFAULT_LIMITS, name))
        if not isinstance(raw, int) or isinstance(raw, bool):
            raise DiscoveryLimitsError(f"{name} must be an integer")
        if not 1 <= raw <= MAX_LIMIT_VALUE:
            raise DiscoveryLimitsError(f"{name} must be between 1 and {MAX_LIMIT_VALUE}")
        parsed[name] = raw
    limits = DiscoveryLimits(**parsed)
    if limits.views_per_hour > limits.views_per_day:
        raise DiscoveryLimitsError("views_per_hour cannot exceed views_per_day")
    if limits.velocity_window_minutes > MAX_VELOCITY_WINDOW_MINUTES:
        raise DiscoveryLimitsError(
            f"velocity_window_minutes cannot exceed {MAX_VELOCITY_WINDOW_MINUTES}"
        )
    return limits


@dataclass(frozen=True, slots=True)
class ViewCounts:
    """What the view log says, read before this view is recorded.

    Counts are of **distinct candidates**, and a candidate already opened in a
    window costs nothing to open again: re-reading a profile while writing to
    someone is not extraction, and charging for it would push recruiters to
    copy details out of the product instead.
    """

    tenant_last_hour: int
    tenant_last_day: int
    #: Distinct candidates this person opened inside the velocity window.
    actor_in_window: int
    seen_by_tenant_last_hour: bool
    seen_by_tenant_last_day: bool
    seen_by_actor_in_window: bool


CapWindow = Literal["HOURLY", "DAILY"]


def cap_refusal(limits: DiscoveryLimits, counts: ViewCounts) -> CapWindow | None:
    """Which cap refuses this view, if any. The daily cap is reported first:
    it is the longer wait, and the one worth telling a person about."""
    if not counts.seen_by_tenant_last_day and counts.tenant_last_day >= limits.views_per_day:
        return "DAILY"
    if not counts.seen_by_tenant_last_hour and counts.tenant_last_hour >= limits.views_per_hour:
        return "HOURLY"
    return None


AnomalyKind = Literal["ACTOR_VELOCITY", "DAILY_CAP_REACHED"]


def anomalies(limits: DiscoveryLimits, counts: ViewCounts) -> tuple[AnomalyKind, ...]:
    """What an allowed view should alert on.

    **Crossings, not levels.** Each fires on the one view that reaches its
    threshold, so a person who keeps going raises one alert rather than one
    per profile. The caller holds a per-organisation lock while counting, so
    two concurrent views cannot both be "the one".
    """
    found: list[AnomalyKind] = []
    if not counts.seen_by_actor_in_window and counts.actor_in_window + 1 == limits.velocity_views:
        found.append("ACTOR_VELOCITY")
    if not counts.seen_by_tenant_last_day and counts.tenant_last_day + 1 == limits.views_per_day:
        found.append("DAILY_CAP_REACHED")
    return tuple(found)
