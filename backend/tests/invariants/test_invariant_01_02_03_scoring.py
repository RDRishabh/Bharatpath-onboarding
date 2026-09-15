"""Invariants 1, 2, 3 and 4-prime, on the scoring rubric.

| # | Invariant |
|---|---|
| 1 | A score is reproducible from the stored extraction chain |
| 2 | Scale is 700-990; the base is not a floor; stored == displayed |
| 3 | A score is not human-editable, directly or indirectly |
| 4' | Add-on contributions are bounded and versioned |

These are property tests, not example tests. An example test proves one CV
scores what we expected; these prove no CV can score outside the scale, that
the rubric cannot drift out of alignment with its own totals, and that no
ordering or quantity of add-ons breaks the cap.
"""

from __future__ import annotations

import itertools

import pytest

from app.modules.scoring.domain import (
    BASE_SCORE,
    CATEGORY_CAPS,
    MAX_COURSE_POINTS,
    MAX_INTERVIEW_POINTS,
    MAX_RESUME_POINTS,
    MAX_SCORE,
    RUBRIC_VERSION,
    AddOnContributions,
    ResumeFeatures,
    score_resume,
    total_score,
)

#: Deliberately beyond every sane bound. A rubric that only holds for
#: realistic input is a rubric that fails on the first unusual CV.
EXTREMES = {
    "total_experience_months": [0, -5, 1, 11, 12, 35, 36, 71, 72, 119, 120, 239, 240, 10_000],
    "highest_seniority": [
        "unknown",
        "intern",
        "junior",
        "mid",
        "senior",
        "lead",
        "principal",
        "executive",
        "NONSENSE",
        "",
    ],
    "role_progression": [-1, 0, 2, 4, 99],
    "skill_count": [-1, 0, 1, 3, 4, 7, 8, 12, 13, 500],
    "skill_evidence": [-1, 0, 4, 99],
    "achievement_specificity": [-1, 0, 4, 99],
    "scope_of_responsibility": [-1, 0, 4, 99],
    "highest_qualification": [
        "unknown",
        "none",
        "secondary",
        "diploma",
        "bachelor",
        "master",
        "doctorate",
        "MADE UP",
    ],
    "certification_count": [-1, 0, 1, 2, 3, 1000],
}


def _sample() -> list[ResumeFeatures]:
    """A spread across every field, rather than the full cross product --
    which would be ~9 million cases and test the same branches repeatedly."""
    out = [ResumeFeatures()]
    for field_name, values in EXTREMES.items():
        for value in values:
            out.append(ResumeFeatures(**{field_name: value}))  # type: ignore[arg-type]
    # Plus the corners: everything minimal and everything maximal at once.
    out.append(
        ResumeFeatures(
            total_experience_months=10_000,
            highest_seniority="executive",
            role_progression=4,
            skill_count=500,
            skill_evidence=4,
            achievement_specificity=4,
            scope_of_responsibility=4,
            highest_qualification="doctorate",
            certification_count=1000,
        )
    )
    return out


SAMPLES = _sample()


# --- the rubric must agree with itself ------------------------------------
def test_the_categories_sum_to_the_resume_band() -> None:
    """If these drift apart, every score is quietly wrong by the difference."""
    assert sum(CATEGORY_CAPS.values()) == MAX_RESUME_POINTS


def test_the_scale_closes_exactly() -> None:
    """700 + 200 + 30 + 60 = 990, so the ceiling needs no clamp."""
    assert BASE_SCORE + MAX_RESUME_POINTS + MAX_COURSE_POINTS + MAX_INTERVIEW_POINTS == MAX_SCORE


# --- invariant 2: the scale ------------------------------------------------
@pytest.mark.parametrize("features", SAMPLES)
def test_no_resume_scores_outside_the_band(features: ResumeFeatures) -> None:
    result = score_resume(features)
    assert 0 <= result.points <= MAX_RESUME_POINTS


@pytest.mark.parametrize("features", SAMPLES)
def test_no_category_exceeds_its_cap(features: ResumeFeatures) -> None:
    for name, points in score_resume(features).breakdown.items():
        assert 0 <= points <= CATEGORY_CAPS[name], f"{name} broke its cap"


@pytest.mark.parametrize("features", SAMPLES)
def test_the_breakdown_always_sums_to_the_total(features: ResumeFeatures) -> None:
    """A breakdown that does not add up to the score it explains is worse than
    no breakdown: it is used for dispute handling."""
    result = score_resume(features)
    assert sum(result.breakdown.values()) == result.points


def test_an_empty_resume_scores_the_base_and_nothing_more() -> None:
    """700 is a base everyone receives, not a floor hiding a lower number."""
    assert score_resume(ResumeFeatures()).points == 0
    assert total_score(score_resume(ResumeFeatures()), AddOnContributions()) == BASE_SCORE


def test_the_strongest_possible_candidate_reaches_exactly_990() -> None:
    best = ResumeFeatures(
        total_experience_months=300,
        highest_seniority="executive",
        role_progression=4,
        skill_count=20,
        skill_evidence=4,
        achievement_specificity=4,
        scope_of_responsibility=4,
        highest_qualification="doctorate",
        certification_count=5,
    )
    resume = score_resume(best)
    assert resume.points == MAX_RESUME_POINTS
    addons = AddOnContributions(course_points=30, interview_points=60)
    assert total_score(resume, addons) == MAX_SCORE


# --- invariant 1: reproducible --------------------------------------------
@pytest.mark.parametrize("features", SAMPLES)
def test_the_same_features_always_produce_the_same_score(features: ResumeFeatures) -> None:
    """No clock, no randomness, no I/O. Scoring the same facts twice must give
    the same number, or a replay proves nothing."""
    first, second = score_resume(features), score_resume(features)
    assert first.points == second.points
    assert first.breakdown == second.breakdown


def test_every_score_records_the_rubric_that_produced_it() -> None:
    """A candidate whose score moves must be answerable: which version moved
    it? That is only possible if the version is stored with the score."""
    assert score_resume(ResumeFeatures()).rubric_version == RUBRIC_VERSION
    assert RUBRIC_VERSION


# --- invariant 4-prime: add-ons are bounded --------------------------------
@pytest.mark.parametrize(
    ("course", "interview"),
    list(itertools.product([-100, 0, 15, 30, 31, 10_000], [-100, 0, 20, 60, 61, 10_000])),
)
def test_no_add_on_combination_escapes_the_ceiling(course: int, interview: int) -> None:
    best = score_resume(
        ResumeFeatures(
            total_experience_months=300,
            highest_seniority="executive",
            role_progression=4,
            skill_count=20,
            skill_evidence=4,
            achievement_specificity=4,
            scope_of_responsibility=4,
            highest_qualification="doctorate",
            certification_count=5,
        )
    )
    total = total_score(best, AddOnContributions(course_points=course, interview_points=interview))
    assert BASE_SCORE <= total <= MAX_SCORE


def test_add_ons_can_never_reduce_a_score() -> None:
    """A negative contribution would be a way to attack someone's score if a
    completion were ever mis-attributed."""
    resume = score_resume(ResumeFeatures(total_experience_months=60))
    without = total_score(resume, AddOnContributions())
    with_negative = total_score(resume, AddOnContributions(course_points=-50, interview_points=-50))
    assert with_negative == without


# --- invariant 3: not human-editable --------------------------------------
def test_scoring_takes_no_score_argument() -> None:
    """There is deliberately no way to pass a score in, or to nudge one. The
    only inputs are facts. This test exists so that adding such a parameter is
    a visible change to the signature rather than a quiet one."""
    import inspect

    params = set(inspect.signature(score_resume).parameters)
    assert params == {"features"}

    feature_fields = set(ResumeFeatures.__dataclass_fields__)
    for forbidden in ("score", "points", "bonus", "adjustment", "override", "manual"):
        assert not any(forbidden in f for f in feature_fields), (
            f"ResumeFeatures gained a field containing {forbidden!r}"
        )


# --- what the rubric deliberately does not score --------------------------
def test_the_rubric_has_no_gap_penalty_and_no_prestige_tier() -> None:
    """Both are extracted and stored; neither scores. Penalising employment
    gaps falls hardest on women after childbirth and on carers -- the same
    class of harm invariant 5 forbids as age-gating. Institution prestige
    entrenches existing advantage in a product sold as opening access.

    Reversible business decisions, but they should be decisions rather than
    weights nobody noticed."""
    feature_fields = set(ResumeFeatures.__dataclass_fields__)
    for absent in ("gap", "institution", "prestige", "tier", "college_rank"):
        assert not any(absent in f for f in feature_fields), (
            f"ResumeFeatures gained {absent!r}; that is a scoring decision, not a refactor"
        )
