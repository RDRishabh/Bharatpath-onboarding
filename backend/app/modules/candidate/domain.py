"""candidate - pure domain logic

Candidate profile, settings, language preference.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.
"""

from __future__ import annotations

import unicodedata
from typing import Final

from app.core.reference import INDIAN_STATES

STATE_CODES: Final[frozenset[str]] = frozenset(region.code for region in INDIAN_STATES)

MAX_CITY_LENGTH: Final = 100
_CITY_PUNCTUATION: Final = frozenset(" .'-")


def normalise_city(value: str) -> str:
    """A city name, whitespace collapsed. Raises `ValueError` on anything else.

    **Letters, combining marks, spaces and `. ' -` only.** The city is shown on
    a masked card to every employer, so it must not be able to carry a phone
    number or an email -- and no city needs a digit or an `@`. Combining marks
    are admitted because Indic scripts need them: the vowel signs in
    "नई दिल्ली" are marks, not letters.

    A city, not an address. No street, no locality, no PIN code: next to a band
    and a skill list, a PIN code narrows a masked card to a handful of people.
    """
    city = " ".join(value.split())
    if not city:
        raise ValueError("city is empty")
    if len(city) > MAX_CITY_LENGTH:
        raise ValueError(f"city is longer than {MAX_CITY_LENGTH} characters")
    has_letter = False
    for char in city:
        category = unicodedata.category(char)
        if category.startswith("L"):
            has_letter = True
        elif not (category.startswith("M") or char in _CITY_PUNCTUATION):
            raise ValueError("a city name is letters, spaces and . ' - only")
    if not has_letter:
        raise ValueError("a city name needs at least one letter")
    return city
