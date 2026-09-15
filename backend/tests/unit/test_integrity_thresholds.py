"""Integrity thresholds as configuration. Pure, no database.

The numbers move to `config_values` so the client can tune them without a
deploy. What must not move with them: the rules' logic, the injection
patterns, and the guarantee that a bad row fails loudly.
"""

from __future__ import annotations

import pytest

from app.modules.integrity.domain import (
    DEFAULT_THRESHOLDS,
    EXPERIENCE_INFLATION_MIN_MONTHS,
    HIDDEN_TEXT_MIN_CHARS,
    OVERLAP_TOLERANCE_MONTHS,
    EmploymentPeriod,
    IntegrityThresholds,
    IntegrityThresholdsError,
    ResumeClaims,
    detect,
    month_index,
    thresholds_from_config,
)

AS_OF = month_index(2026, 9)


def _overlapping(months: int) -> ResumeClaims:
    """Two full-time roles overlapping by `months`."""
    return ResumeClaims(
        periods=(
            EmploymentPeriod("A", "Engineer", month_index(2020, 1), month_index(2023, 1)),
            EmploymentPeriod("B", "Engineer", month_index(2023, 1) - months, month_index(2025, 1)),
        )
    )


def _ids(claims: ResumeClaims, thresholds: IntegrityThresholds = DEFAULT_THRESHOLDS) -> set[str]:
    return {s.rule_id for s in detect(claims, as_of_month=AS_OF, thresholds=thresholds)}


def test_the_defaults_are_the_numbers_the_rules_were_written_with() -> None:
    """Moving the numbers must change no behaviour until someone changes a row."""
    assert DEFAULT_THRESHOLDS.version == "default"
    assert DEFAULT_THRESHOLDS.overlap_tolerance_months == OVERLAP_TOLERANCE_MONTHS
    assert DEFAULT_THRESHOLDS.hidden_text_min_chars == HIDDEN_TEXT_MIN_CHARS
    assert DEFAULT_THRESHOLDS.experience_inflation_min_months == EXPERIENCE_INFLATION_MIN_MONTHS


def test_a_rule_reads_its_threshold_from_the_value_it_is_given() -> None:
    claims = _overlapping(6)
    assert "OVERLAP_TOLERANCE_MONTHS" not in _ids(claims)  # sanity: not a rule id
    assert "OVERLAPPING_FULL_TIME_ROLES" in _ids(claims)

    tolerant = IntegrityThresholds(version="7", overlap_tolerance_months=12)
    assert "OVERLAPPING_FULL_TIME_ROLES" not in _ids(claims, tolerant)


def test_calling_detect_without_thresholds_uses_the_defaults() -> None:
    assert detect(_overlapping(6), as_of_month=AS_OF) == detect(
        _overlapping(6), as_of_month=AS_OF, thresholds=DEFAULT_THRESHOLDS
    )


# --- parsing a config row -------------------------------------------------
def test_a_row_may_change_one_number_and_keep_the_rest() -> None:
    parsed = thresholds_from_config({"overlap_tolerance_months": 6}, version="4")
    assert parsed.version == "4"
    assert parsed.overlap_tolerance_months == 6
    assert parsed.hidden_text_min_chars == HIDDEN_TEXT_MIN_CHARS


def test_every_threshold_can_be_set() -> None:
    parsed = thresholds_from_config(
        {
            "overlap_tolerance_months": 2,
            "future_dating_tolerance_months": 0,
            "experience_inflation_min_months": 24,
            "experience_inflation_min_ratio": 0.5,
            "senior_title_min_months": 36,
            "stuffing_min_skills": 30,
            "stuffing_max_evidence": 2,
            "hidden_text_min_chars": 120,
        },
        version="9",
    )
    assert parsed.experience_inflation_min_ratio == 0.5
    assert parsed.stuffing_max_evidence == 2


@pytest.mark.parametrize(
    "document",
    [
        {"overlap_tolerance_month": 6},
        {"overlap_tolerance_months": "6"},
        {"overlap_tolerance_months": True},
        {"overlap_tolerance_months": -1},
        {"overlap_tolerance_months": 6.5},
        {"experience_inflation_min_ratio": 1.5},
        {"experience_inflation_min_ratio": False},
        {"stuffing_max_evidence": 5},
        {"injection_patterns": ["ignore"]},
    ],
    ids=[
        "misspelt-key",
        "string",
        "boolean",
        "negative",
        "fractional-months",
        "ratio-above-one",
        "boolean-ratio",
        "evidence-above-scale",
        "patterns-are-not-config",
    ],
)
def test_a_doubtful_row_is_refused_rather_than_half_applied(document: dict) -> None:
    """**Especially the misspelling.** Ignoring an unknown key leaves the old
    number live while the row looks applied, and nobody finds out until a
    reviewer asks why a rule never fires."""
    with pytest.raises(IntegrityThresholdsError):
        thresholds_from_config(document, version="1")


def test_an_empty_row_is_the_defaults_under_its_own_version() -> None:
    parsed = thresholds_from_config({}, version="3")
    assert parsed == IntegrityThresholds(version="3")
