"""Locale bundles and lookup.

Produced 2026-09-11 under `answers-log.md` Round 7.10, closing the plumbing half
of blocker C5.

**Read this before shipping any of it.** The strings in `locales/*.json` were
written by us, not by native speakers. They are correct enough to build, demo
and test against, and they give a translator a source file to correct rather
than a blank page -- but *"a machine translation nobody checked"* is precisely
what makes a product look untrustworthy to the audience it is aimed at, and
this product asks people for money and their CV. **Every non-English bundle
needs a native-speaker pass before launch.**

Eight locales: the client asked for 6-8, and eight covers roughly three
quarters of India by first language.

---

**Fallback is per key, not per bundle.** A missing Tamil string falls back to
English for that string alone. The alternative -- falling back to the whole
English bundle -- means one untranslated key silently reverts an entire screen
to English, which is both worse and much harder to notice.

**Nothing here imports `app.modules`.** That is the `core-depends-on-nothing`
contract, and it is also why the message and question banks hold translation
*keys* rather than translated text: the strings live here, the structures live
in the modules, and neither has to know about the other.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Final

LOCALES_DIR: Final = Path(__file__).parent / "locales"

#: The English bundle is the source of truth for *which keys exist*. A key that
#: appears only in a translation is a key nothing renders.
DEFAULT_LOCALE: Final = "en"


@dataclass(frozen=True, slots=True)
class Locale:
    code: str
    #: What the language calls itself. A language picker written in English is
    #: unusable by the people who most need it.
    endonym: str
    english_name: str


SUPPORTED_LOCALES: Final[tuple[Locale, ...]] = (
    Locale("en", "English", "English"),
    Locale("hi", "हिन्दी", "Hindi"),
    Locale("bn", "বাংলা", "Bengali"),
    Locale("mr", "मराठी", "Marathi"),
    Locale("te", "తెలుగు", "Telugu"),
    Locale("ta", "தமிழ்", "Tamil"),
    Locale("gu", "ગુજરાતી", "Gujarati"),
    Locale("kn", "ಕನ್ನಡ", "Kannada"),
)

LOCALE_CODES: Final[frozenset[str]] = frozenset(loc.code for loc in SUPPORTED_LOCALES)

#: `{name}` placeholders. Used to check that a translation kept every variable
#: its English source had -- a Hindi OTP message that lost `{code}` sends a
#: sentence with no code in it, and nothing else would catch that.
PLACEHOLDER_RE: Final = re.compile(r"\{([a-z_][a-z0-9_]*)\}")


@lru_cache(maxsize=len(SUPPORTED_LOCALES) + 1)
def load_bundle(locale: str) -> dict[str, str]:
    """Load one locale's strings. Cached: these files never change at runtime.

    An unknown or missing locale returns an empty bundle rather than raising.
    A user whose stored language preference no longer ships should see English,
    not a 500 -- the request they made was to look at a job, not to choose a
    language.
    """
    path = LOCALES_DIR / f"{locale}.json"
    if locale not in LOCALE_CODES or not path.is_file():
        return {}
    data: dict[str, str] = json.loads(path.read_text(encoding="utf-8"))
    return data


def translate(key: str, locale: str = DEFAULT_LOCALE, /, **params: object) -> str:
    """Look up `key`, falling back to English and then to the key itself.

    Returning the key is deliberate. A missing string shows as
    `sms.login_otp` -- ugly, obvious, and greppable -- rather than as an empty
    string, which looks like a working screen with nothing on it.

    Substitution failures are swallowed for the same reason a missing key is:
    an unsubstituted `{code}` is visibly wrong and still tells the user what
    the message was about, whereas a `KeyError` escaping here would fail the
    request that was trying to send it.
    """
    template = load_bundle(locale).get(key) or load_bundle(DEFAULT_LOCALE).get(key) or key
    if not params:
        return template
    try:
        return template.format(**params)
    except (KeyError, IndexError, ValueError):
        return template


def placeholders(template: str) -> frozenset[str]:
    return frozenset(PLACEHOLDER_RE.findall(template))


def missing_keys(locale: str) -> tuple[str, ...]:
    """English keys this locale has not translated yet. Sorted, so a diff of
    two runs is readable."""
    english = load_bundle(DEFAULT_LOCALE)
    bundle = load_bundle(locale)
    return tuple(sorted(key for key in english if key not in bundle))


def translation_coverage(locale: str) -> float:
    """0.0-1.0. Printed by the seed script and asserted in tests, so a bundle
    that falls behind the English source is visible rather than discovered by
    a user."""
    english = load_bundle(DEFAULT_LOCALE)
    if not english:
        return 0.0
    return 1.0 - (len(missing_keys(locale)) / len(english))
