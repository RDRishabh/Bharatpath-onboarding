"""The locale bundles, and what a translation is allowed to get wrong.

Nine languages ship; six are the client's list of 2026-09-22 and are held to
full coverage (`PRIORITY_LOCALES`).

**Three failures these tests exist to catch, in order of how quietly they
happen.**

1. *A key the product renders that no bundle defines.* `translate` falls back
   to the key itself, so the user reads `interview.q.about_you` where a
   question should be. Ugly and obvious in English -- and invisible in review,
   because nobody reviews the Kannada build. Until 2026-09-22 this was the
   state of 127 of the 159 keys: every form label, interview question,
   questionnaire prompt and notification body carried a key and no bundle had
   any of them.

2. *A translation that dropped a placeholder.* `{code}`, `{amount}`,
   `{date}`. A Hindi pre-debit notice that lost `{amount}` is a message
   telling somebody money will leave their account without saying how much.
   Nothing else in the system would notice.

3. *A translation that invented a placeholder.* `{amt}` instead of `{amount}`
   renders literally, because `translate` swallows substitution errors on
   purpose so a bad string cannot 500 the request that was sending it.

None of this checks whether the words are *good*. They are not: every
non-English bundle was written by us and is flagged `needs_native_speaker_pass`.
That flag is asserted below so it cannot be dropped quietly.
"""

from __future__ import annotations

import json
import re

import pytest

from app.core.i18n import (
    DEFAULT_LOCALE,
    LOCALES_DIR,
    META_KEY,
    PRIORITY_LOCALES,
    SUPPORTED_LOCALES,
    load_bundle,
    missing_keys,
    placeholders,
    translate,
)

CODES = [loc.code for loc in SUPPORTED_LOCALES]
TRANSLATED = [c for c in CODES if c != DEFAULT_LOCALE]
ENGLISH = load_bundle(DEFAULT_LOCALE)


def _raw(locale: str) -> dict[str, object]:
    return json.loads((LOCALES_DIR / f"{locale}.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# The bundles exist and are well formed
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("code", CODES)
def test_every_supported_locale_has_a_bundle(code: str) -> None:
    """A code in `SUPPORTED_LOCALES` with no file is the Punjabi bug: the
    language is offered, `load_bundle` returns `{}`, and every string falls
    back to English while the picker says the app speaks it."""
    assert (LOCALES_DIR / f"{code}.json").is_file(), f"{code} is supported and has no bundle"


@pytest.mark.parametrize("code", CODES)
def test_every_bundle_is_flat_strings(code: str) -> None:
    bundle = load_bundle(code)
    bad = {k: v for k, v in bundle.items() if not isinstance(v, str)}
    assert bad == {}, f"{code} has non-string values: {sorted(bad)}"


@pytest.mark.parametrize("code", CODES)
def test_meta_is_never_rendered(code: str) -> None:
    """`_meta` documents the bundle. `load_bundle` strips it, so a key called
    `_meta` can never be handed to a user."""
    assert META_KEY in _raw(code), f"{code} has no {META_KEY}"
    assert META_KEY not in load_bundle(code)


# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("code", [c for c in PRIORITY_LOCALES if c != DEFAULT_LOCALE])
def test_priority_locales_translate_every_key(code: str) -> None:
    """The client's six. A missing key here renders in English inside an
    otherwise translated screen, which reads as a half-finished product."""
    absent = missing_keys(code)
    assert absent == (), f"{code} is a priority locale and is missing {len(absent)}: {absent[:8]}"


@pytest.mark.parametrize("code", TRANSLATED)
def test_no_bundle_invents_keys(code: str) -> None:
    """A key only a translation has is a key nothing renders -- usually a
    typo in the key name, which means the real key is untranslated."""
    extra = sorted(set(load_bundle(code)) - set(ENGLISH))
    assert extra == [], f"{code} defines keys English does not: {extra}"


# ---------------------------------------------------------------------------
# Placeholders -- the failure with consequences
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("code", TRANSLATED)
def test_every_translation_keeps_its_placeholders(code: str) -> None:
    bundle = load_bundle(code)
    wrong: dict[str, str] = {}
    for key, translated in bundle.items():
        expected = placeholders(ENGLISH[key])
        actual = placeholders(translated)
        if expected != actual:
            missing, invented = sorted(expected - actual), sorted(actual - expected)
            wrong[key] = f"missing={missing} invented={invented}"
    assert wrong == {}, f"{code}: {json.dumps(wrong, indent=2, ensure_ascii=False)}"


# ---------------------------------------------------------------------------
# Honesty about who wrote these
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("code", TRANSLATED)
def test_translations_are_flagged_as_unverified(code: str) -> None:
    """Blocker C5. These were written by us, not by native speakers, and this
    product asks people for money and their CV in the language they chose.

    The flag flips per bundle, when a qualified speaker has actually read it.
    Flipping it is a claim about a person having done something, which is why
    it is asserted here rather than left as a comment somebody deletes.
    """
    meta = _raw(code)[META_KEY]
    assert isinstance(meta, dict)
    assert meta.get("needs_native_speaker_pass") is True, (
        f"{code} claims a native-speaker pass. If that is true, say who and when "
        f"in `reviewed_by`/`reviewed_on` and update blockers.md C5."
    )


def test_english_is_marked_as_the_source() -> None:
    meta = _raw(DEFAULT_LOCALE)[META_KEY]
    assert isinstance(meta, dict)
    assert meta.get("translation_status") == "SOURCE"
    assert meta.get("needs_native_speaker_pass") is False


# ---------------------------------------------------------------------------
# The bundles and the code agree about which keys exist
# ---------------------------------------------------------------------------
def test_english_defines_every_key_the_product_renders() -> None:
    """The one that catches a new form field, interview question or
    notification template whose key nobody added to a bundle.

    Read from the banks themselves rather than from a list: a list would have
    to be updated by the same person who forgot the string.
    """
    from app.modules.college.forms import COLLEGE_FORM
    from app.modules.interview import bank as interview_bank
    from app.modules.kyb.forms import KYB_FORM
    from app.modules.notifications import templates as notification_templates
    from app.modules.questionnaire import bank as questionnaire_bank

    rendered: set[str] = set()
    for question_set in interview_bank.QUESTION_SETS:
        rendered.update(q.key for q in question_set.questions)
    rendered.update(d.key for d in interview_bank.DIMENSIONS)
    rendered.update(t.key for t in notification_templates.TEMPLATES)
    rendered.update(q.key for q in questionnaire_bank.QUESTIONS)
    for form in (KYB_FORM, COLLEGE_FORM):
        for section in form.sections:
            rendered.update(f.key for f in section.fields)

    # Guard against the guard: if these banks are renamed, finding nothing
    # would make this test pass while checking nothing.
    assert len(rendered) > 100, f"only found {len(rendered)} keys; the readers have drifted"

    absent = sorted(rendered - set(ENGLISH))
    assert absent == [], (
        f"{len(absent)} keys are rendered by the product and defined in no bundle, "
        f"so they display as the key itself: {absent[:10]}"
    )


# ---------------------------------------------------------------------------
# Fallback behaviour
# ---------------------------------------------------------------------------
# Moved here from `test_content_placeholders.py` on 2026-09-22, where the
# translation tests had outgrown a section of a much larger file.
def test_a_missing_string_falls_back_per_key_not_per_screen() -> None:
    """Falling back to the whole English bundle means one untranslated key
    silently reverts a screen, which is worse and harder to notice."""
    assert translate("common.continue", "hi") != translate("common.continue", "en")


def test_a_non_priority_locale_falls_back_for_a_product_string() -> None:
    """Gujarati, Tamil and Telugu carry the core strings only. The point of
    per-key fallback is that this reads as English inside an otherwise Gujarati
    screen, rather than showing the key or an empty label."""
    assert translate("kyb.gstin", "gu") == translate("kyb.gstin", DEFAULT_LOCALE)
    assert translate("common.continue", "gu") != translate("common.continue", DEFAULT_LOCALE)


def test_an_unknown_locale_renders_english_rather_than_failing() -> None:
    """A user whose stored language no longer ships asked to look at a job, not
    to choose a language."""
    assert translate("common.continue", "xx") == "Continue"


def test_a_missing_key_shows_the_key_rather_than_nothing() -> None:
    """Ugly, obvious and greppable beats an empty string that looks like a
    working screen with nothing on it."""
    assert translate("nothing.here", "en") == "nothing.here"


def test_substitution_works_and_never_raises() -> None:
    assert "98765" in translate("auth.code_sent", "en", phone="98765")
    # A caller that forgets a parameter gets a visibly wrong message, not a 500
    # inside the code path that was trying to send it.
    assert translate("auth.code_sent", "en") == "We have sent a code to {phone}"


# ---------------------------------------------------------------------------
# Two rules about the words themselves
# ---------------------------------------------------------------------------
def test_the_eligibility_message_gives_no_reasoning_in_any_language() -> None:
    """Blocker C10 and R11: the candidate is told the requirement is not met
    and nothing else. The score is never explained -- and a translation is
    another door into the same room, so this runs over every locale."""
    for code in CODES:
        message = translate("eligibility.below_threshold", code)
        assert not re.search(r"\d", message), f"{code} leaks a number"


def test_every_locale_names_itself_in_its_own_script() -> None:
    """A language picker written in English is unusable by the people who most
    need it."""
    for locale in SUPPORTED_LOCALES:
        if locale.code != DEFAULT_LOCALE:
            assert locale.endonym != locale.english_name
            assert not locale.endonym.isascii()


# ---------------------------------------------------------------------------
# Laziness
# ---------------------------------------------------------------------------
#: Strings that are correctly identical to English, and the reason.
#:
#: Without this the "did anyone actually translate it?" test below is either
#: absent or permanently red, and a permanently red test gets deleted. Each
#: entry is a claim that copying the English is the RIGHT answer, not that
#: somebody has not got to it yet.
UNTRANSLATABLE = {
    # Statutory identifiers. An Indian form asks for "GSTIN" in every
    # language; translating the acronym would make the field unrecognisable
    # against the document the user is holding.
    "kyb.gstin": "statutory identifier, used untranslated on every Indian form",
    "kyb.tan": "statutory identifier",
    "kyb.cin": "statutory identifier (CIN/LLPIN)",
    "college.aishe_code": "AISHE is the scheme's own name",
}


@pytest.mark.parametrize("code", [c for c in PRIORITY_LOCALES if c != DEFAULT_LOCALE])
def test_a_translation_is_not_just_the_english_copied(code: str) -> None:
    """Catches a bundle somebody filled in by duplicating the source file.

    Only the priority locales are checked: the other three deliberately carry
    English for every product string, which is the fallback working, not a
    translation nobody did.
    """
    bundle = load_bundle(code)
    identical = [k for k, v in bundle.items() if v == ENGLISH[k] and k not in UNTRANSLATABLE]
    assert identical == [], (
        f"{code} left these identical to English: {identical}. "
        f"If copying the English is correct, add it to UNTRANSLATABLE with the reason."
    )
