"""The questionnaire's validation and report. Worth zero points, so nothing
here produces a number about the candidate."""

from __future__ import annotations

import pytest

from app.modules.questionnaire.bank import QUESTIONS, SECTIONS
from app.modules.questionnaire.domain import (
    MAX_PLACES,
    build_report,
    current_answers,
    validate_answers,
)


def test_valid_answers_of_every_type_are_kept() -> None:
    answers = {
        "NOTICE_PERIOD": "WITHIN_30_DAYS",
        "EMPLOYMENT_TYPE": ["FULL_TIME", "CONTRACT"],
        "TEAM_SIZE_MANAGED": 0,
        "HAS_DRIVING_LICENCE": False,
        "ACCESSIBILITY_ADJUSTMENTS": "  A screen reader  ",
        "PREFERRED_LOCATIONS": ["Pune", "Navi Mumbai"],
    }
    stored, cleared, issues = validate_answers(answers)
    assert issues == [] and cleared == {}
    assert stored["ACCESSIBILITY_ADJUSTMENTS"] == "A screen reader"
    assert stored["HAS_DRIVING_LICENCE"] is False


@pytest.mark.parametrize(
    ("code", "value", "issue"),
    [
        ("NOTICE_PERIOD", "TOMORROW", "invalid_single_answer"),
        ("EMPLOYMENT_TYPE", ["FULL_TIME", "FULL_TIME"], "invalid_multi_answer"),
        ("EMPLOYMENT_TYPE", ["ASTRONAUT"], "invalid_multi_answer"),
        ("EMPLOYMENT_TYPE", [], "invalid_multi_answer"),
        ("TEAM_SIZE_MANAGED", True, "invalid_number_answer"),
        ("TEAM_SIZE_MANAGED", -1, "invalid_number_answer"),
        ("TEAM_SIZE_MANAGED", "5", "invalid_number_answer"),
        ("HAS_DRIVING_LICENCE", "yes", "invalid_boolean_answer"),
        ("ACCESSIBILITY_ADJUSTMENTS", "   ", "invalid_text_answer"),
        ("PREFERRED_LOCATIONS", ["Call 9876543210"], "invalid_multi_answer"),
        ("PREFERRED_LOCATIONS", ["me@example.com"], "invalid_multi_answer"),
        (
            "PREFERRED_LOCATIONS",
            [f"Place{chr(65 + i)}x" for i in range(MAX_PLACES + 1)],
            "invalid_multi_answer",
        ),
        ("FAVOURITE_COLOUR", "BLUE", "unknown_question"),
    ],
)
def test_invalid_answers_are_refused(code: str, value: object, issue: str) -> None:
    _, _, issues = validate_answers({code: value})
    assert [i.code for i in issues] == [issue]


def test_null_clears_an_answer() -> None:
    stored, cleared, issues = validate_answers({"NOTICE_PERIOD": None})
    assert stored == {} and cleared == {"NOTICE_PERIOD": None} and issues == []


def test_every_question_is_skippable() -> None:
    assert not [q.code for q in QUESTIONS if q.required]


def test_answers_that_no_longer_fit_the_bank_are_not_shown() -> None:
    assert current_answers({"NOTICE_PERIOD": "RETIRED_OPTION", "GONE": 1, "RELOCATION": "NO"}) == {
        "RELOCATION": "NO"
    }


def test_the_report_reads_answers_back_by_section_and_scores_nothing() -> None:
    sections = build_report({"NOTICE_PERIOD": "IMMEDIATE", "HAS_DRIVING_LICENCE": True})
    assert [s.code for s in sections] == list(SECTIONS)
    availability = sections[0]
    assert (availability.answered, availability.total) == (1, len(SECTIONS["availability"]))
    [notice] = [i for i in availability.items if i.code == "NOTICE_PERIOD"]
    assert notice.display == ("Immediately",)
    [licence] = [i for s in sections for i in s.items if i.code == "HAS_DRIVING_LICENCE"]
    assert licence.display == ("Yes",)
    unanswered = [i for s in sections for i in s.items if not i.answered]
    assert unanswered and all(i.display == () for i in unanswered)
