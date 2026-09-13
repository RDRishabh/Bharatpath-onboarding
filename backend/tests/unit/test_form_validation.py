"""Server-side form validation against a published FormDefinition. Pure.

The published `pattern`, `required` and `max_length` are hints to four clients.
This is where they are enforced, because an API caller does not run the
browser's validation.
"""

from __future__ import annotations

import pytest

from app.core.forms import (
    PAN_PATTERN,
    AnswerIssue,
    FormDefinition,
    FormField,
    FormSection,
    validate_answers,
)
from app.modules.kyb.forms import KYB_FORM

FORM = FormDefinition(
    "TEST",
    "1",
    (
        FormSection(
            "s",
            "S",
            (
                FormField("name", "k.name", "Name", "TEXT", required=True, max_length=10),
                FormField("pan", "k.pan", "PAN", "TEXT", required=True, pattern=PAN_PATTERN),
                FormField("email", "k.email", "Email", "EMAIL"),
                FormField(
                    "kind", "k.kind", "Kind", "SELECT", required=True, options_source="kinds"
                ),
                FormField("tags", "k.tags", "Tags", "MULTISELECT", options_source="kinds"),
                FormField("staff", "k.staff", "Staff", "NUMBER"),
                FormField("since", "k.since", "Since", "DATE"),
                FormField("agree", "k.agree", "Agree", "CHECKBOX", required=True),
                FormField("doc", "k.doc", "Doc", "FILE", required=True),
            ),
        ),
    ),
)
OPTIONS = {"kinds": frozenset({"A", "B"})}
VALID = {"name": "Acme", "pan": "AABCU9603R", "kind": "A", "agree": True}


def _codes(
    answers: dict, *, complete: bool = False, uploaded: frozenset[str] = frozenset()
) -> set[tuple[str, str]]:
    return {
        (i.field, i.code)
        for i in validate_answers(
            FORM, answers, options=OPTIONS, uploaded=uploaded, complete=complete
        )
    }


def test_a_complete_valid_submission_has_no_issues() -> None:
    assert _codes(VALID, complete=True, uploaded=frozenset({"doc"})) == set()


def test_a_draft_may_be_saved_half_finished() -> None:
    assert _codes({"name": "Acme"}) == set()


def test_submission_requires_every_required_field_document_and_undertaking() -> None:
    assert _codes({}, complete=True) == {
        ("name", "required"),
        ("pan", "required"),
        ("kind", "required"),
        ("agree", "required"),
        ("doc", "required"),
    }


def test_an_unaccepted_undertaking_is_not_accepted() -> None:
    """Present and false is a refusal, not an answer."""
    assert ("agree", "must_be_accepted") in _codes({**VALID, "agree": False}, complete=True)


@pytest.mark.parametrize(
    ("answers", "issue"),
    [
        ({"name": "x" * 11}, ("name", "too_long")),
        ({"pan": "AABCU96031"}, ("pan", "invalid_format")),
        ({"pan": "aabcu9603r"}, ("pan", "invalid_format")),
        ({"email": "not an email"}, ("email", "invalid_format")),
        ({"kind": "C"}, ("kind", "not_an_option")),
        ({"tags": ["A", "Z"]}, ("tags", "not_an_option")),
        ({"staff": "12"}, ("staff", "wrong_type")),
        ({"staff": True}, ("staff", "wrong_type")),
        ({"since": "13/01/2020"}, ("since", "invalid_format")),
        ({"agree": "yes"}, ("agree", "wrong_type")),
        ({"name": 42}, ("name", "wrong_type")),
    ],
)
def test_a_malformed_answer_names_its_field_and_why(answers: dict, issue: tuple[str, str]) -> None:
    assert issue in _codes(answers)


def test_a_pattern_must_match_the_whole_value() -> None:
    """`re.match` would accept a valid PAN followed by anything at all."""
    assert ("pan", "invalid_format") in _codes({"pan": "AABCU9603R; DROP TABLE"})


def test_an_unknown_field_is_an_issue_not_silently_stored() -> None:
    assert ("tenant_id", "unknown_field") in _codes({"tenant_id": "x"})


def test_a_document_cannot_be_answered_inline() -> None:
    """Uploads go through the path that sniffs the type and caps the size."""
    assert ("doc", "not_answerable") in _codes({"doc": "https://example.com/pan.pdf"})


def test_a_select_with_no_options_supplied_is_a_programming_error() -> None:
    with pytest.raises(ValueError):
        validate_answers(FORM, {"kind": "A"}, options={}, complete=False)


def test_blank_optional_answers_are_fine_and_blank_required_ones_are_missing() -> None:
    assert ("email", "invalid_format") not in _codes({"email": "  "})
    assert ("name", "required") in _codes({"name": "   "}, complete=True)


def test_the_real_kyb_form_names_only_sources_the_service_can_supply() -> None:
    """Every select in the published KYB form must have an options source, or
    validation of that field raises in production."""
    sources = {f.options_source for f in KYB_FORM.fields if f.type in ("SELECT", "MULTISELECT")}
    assert None not in sources
    assert sources  # the form has selects at all


def test_issues_are_data_not_sentences() -> None:
    [issue] = validate_answers(FORM, {"kind": "C"}, options=OPTIONS, complete=False)
    assert issue == AnswerIssue("kind", "not_an_option")
