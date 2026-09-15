"""The provisional course-completion rule, and the contribution cap.

The completion rule is a placeholder for a client decision (`docs/blockers.md`
C1). These tests are therefore written against the *properties* it must hold --
versioned, strict, capped -- rather than against the specific thresholds, so
replacing the rule breaks only the cases that genuinely encode a decision.
"""

from __future__ import annotations

import pytest

from app.modules.courses.domain import (
    COMPLETION_RULE_VERSION,
    MAX_COURSE_CONTRIBUTION,
    CourseProgress,
    clamp_contribution,
    evaluate_completion,
)


def _progress(done: int, total: int = 10, score: float | None = 1.0) -> CourseProgress:
    return CourseProgress(modules_total=total, modules_completed=done, assessment_score=score)


# --- the properties that must survive the real rule -----------------------
def test_every_decision_carries_the_rule_version() -> None:
    """A completion moves a score. Two candidates judged under different rules
    are not comparable, and the stored version is what makes that visible."""
    for progress in (_progress(10), _progress(3), _progress(10, score=None)):
        assert evaluate_completion(progress).rule_version == COMPLETION_RULE_VERSION


def test_the_version_is_marked_provisional() -> None:
    """Guards against the placeholder being promoted by forgetting about it."""
    assert "provisional" in COMPLETION_RULE_VERSION


def test_a_reason_is_always_a_code_never_a_sentence() -> None:
    """Rendered in the candidate's language, so it cannot be English prose."""
    decision = evaluate_completion(_progress(3))
    assert " " not in decision.reason


# --- strictness is the deliberate direction -------------------------------
def test_partial_progress_does_not_complete() -> None:
    assert not evaluate_completion(_progress(9, total=10)).complete


def test_an_unattempted_assessment_does_not_complete() -> None:
    """Too strict withholds points a candidate may deserve -- visible, and
    fixable on appeal. Too loose awards points nobody earned -- invisible, and
    only fixable by re-scoring everyone."""
    decision = evaluate_completion(_progress(10, score=None))
    assert not decision.complete
    assert decision.reason == "assessment_not_attempted"


def test_a_failed_assessment_does_not_complete() -> None:
    assert not evaluate_completion(_progress(10, score=0.5)).complete


def test_full_progress_with_a_passing_assessment_completes() -> None:
    assert evaluate_completion(_progress(10, score=0.9)).complete


def test_a_course_with_no_modules_never_completes() -> None:
    """Otherwise 0/0 is a division error, or worse, a free 15 points."""
    decision = evaluate_completion(_progress(0, total=0))
    assert not decision.complete
    assert decision.reason == "course_has_no_modules"


# --- invariant 4-prime: contributions are bounded -------------------------
@pytest.mark.parametrize("points", [0, 1, 15, 29, 30])
def test_values_within_the_cap_are_unchanged(points: int) -> None:
    assert clamp_contribution(points) == points


@pytest.mark.parametrize("points", [31, 100, 10_000])
def test_nothing_exceeds_the_cap(points: int) -> None:
    assert clamp_contribution(points) == MAX_COURSE_CONTRIBUTION


@pytest.mark.parametrize("points", [-1, -30])
def test_a_negative_contribution_cannot_reduce_a_score(points: int) -> None:
    """Add-ons add. A course that could subtract would be a way to attack
    another candidate's score if a completion were ever mis-attributed."""
    assert clamp_contribution(points) == 0


def test_no_sequence_of_completions_exceeds_the_cap() -> None:
    """Invariant 4-prime as a property: ordering and quantity are irrelevant."""
    for sequence in ([30, 30, 30], [1] * 50, [29, 2], [10, 10, 10, 10]):
        assert all(clamp_contribution(p) <= MAX_COURSE_CONTRIBUTION for p in sequence)
        assert clamp_contribution(sum(sequence)) <= MAX_COURSE_CONTRIBUTION
