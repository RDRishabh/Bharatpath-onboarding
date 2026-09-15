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
from collections.abc import Iterable
from typing import Final

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
