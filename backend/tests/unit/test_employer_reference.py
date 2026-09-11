"""Employer type and industry vocabularies.

These guard the properties that make a closed list worth having. The specific
entries are the client's to change; the rules below are not.
"""

from __future__ import annotations

import pytest

from app.modules.employer.reference import (
    EMPLOYER_TYPES,
    INDUSTRIES,
    active_industries,
    is_valid_employer_type,
    is_valid_industry,
)

ALL = list(EMPLOYER_TYPES) + list(INDUSTRIES)


def test_codes_are_unique_within_each_vocabulary() -> None:
    """A duplicate code means two labels share stored rows, and no migration
    can separate them afterwards."""
    for vocabulary in (EMPLOYER_TYPES, INDUSTRIES):
        codes = [t.code for t in vocabulary]
        assert len(codes) == len(set(codes))


@pytest.mark.parametrize("term", ALL, ids=[t.code for t in ALL])
def test_codes_are_stable_shaped(term: object) -> None:
    """Upper snake case, no spaces or punctuation. Codes travel through URLs,
    filter parameters and analytics dimensions; anything else needs escaping
    somewhere and will eventually not be escaped."""
    code = term.code  # type: ignore[attr-defined]
    assert code == code.upper()
    assert code.replace("_", "").isalnum()
    assert len(code) <= 64, "must fit the column"


@pytest.mark.parametrize("term", ALL, ids=[t.code for t in ALL])
def test_every_term_has_a_label(term: object) -> None:
    assert term.label.strip()  # type: ignore[attr-defined]


def test_validation_accepts_none() -> None:
    """Both fields are optional: a KYB form part-way through completion has
    not chosen one, and refusing that would block saving a draft."""
    assert is_valid_employer_type(None)
    assert is_valid_industry(None)


def test_validation_rejects_free_text() -> None:
    """The whole point. 'Information Technology' typed by hand must not become
    a second industry alongside IT_SOFTWARE."""
    for junk in ("Information Technology", "it", "IT_SOFTWARE ", "", "Other stuff"):
        assert not is_valid_industry(junk)


def test_validation_accepts_every_listed_code() -> None:
    for term in EMPLOYER_TYPES:
        assert is_valid_employer_type(term.code)
    for term in INDUSTRIES:
        assert is_valid_industry(term.code)


def test_retiring_a_term_keeps_it_valid_for_existing_rows() -> None:
    """Retirement removes a term from the picker, not from the vocabulary.
    Rows already carry the code, and invalidating it would make those employers
    unsaveable through no action of their own."""
    retired = [t for t in INDUSTRIES if not t.active]
    for term in retired:
        assert is_valid_industry(term.code)
        assert term not in active_industries()


def test_an_other_option_exists() -> None:
    """Without it, an employer who does not fit becomes a support ticket, or
    picks something wrong and pollutes the filter they were meant to improve."""
    assert any(t.code == "OTHER" for t in INDUSTRIES)
