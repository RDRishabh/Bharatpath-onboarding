"""scoring - pure domain logic

Engine interface, versions, history, breakdown.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

**This is Layer 3 of `docs/scoring-approach.md` §4: the model reads, code
scores.** Everything here is a pure function of facts the extractor produced.
The model never sees these weights and never learns what its ratings are worth,
so it cannot aim at a target score -- and neither can anyone writing
instructions into a CV.

The arithmetic was fixed by the client and is not ours to change:

    700 base + 0-200 resume + 30 course + 60 interviews = 990 exactly

Only the 0-200 resume band is defined here. The client delegated its shape to
us on 2026-09-11 (`answers-log.md` Round 7.1).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final

#: Bump on any change that alters output. Stored on every score row, so a
#: candidate whose score moves can be told which version moved it, and a
#: replay can reproduce the number the rubric produced at the time.
RUBRIC_VERSION: Final = "v1-2026-09-11"

BASE_SCORE: Final = 700
MAX_RESUME_POINTS: Final = 200
MAX_SCORE: Final = 990

#: Category ceilings. These sum to exactly MAX_RESUME_POINTS, asserted below
#: rather than trusted -- a rubric whose parts do not add up to its whole is
#: the kind of error that produces plausible wrong numbers for months.
CATEGORY_CAPS: Final[dict[str, int]] = {
    "experience_depth": 55,
    "role_progression": 45,
    "skills": 40,
    "achievements": 35,
    "education": 25,
}

assert sum(CATEGORY_CAPS.values()) == MAX_RESUME_POINTS, "rubric categories must sum to 200"


# ---------------------------------------------------------------------------
# Band tables
# ---------------------------------------------------------------------------
# Bands, not formulas, deliberately (`scoring-approach.md` §7). Extraction
# wobbles: the same CV read twice may yield 47 or 48 months. A band absorbs
# that before it reaches the score, so two runs agree. A continuous curve
# would turn every extraction wobble into a score change.

#: (inclusive lower bound in months, points)
EXPERIENCE_BANDS: Final[tuple[tuple[int, int], ...]] = (
    (240, 55),  # 20 years or more
    (120, 50),  # 10-20
    (72, 42),  # 6-10
    (36, 32),  # 3-6
    (12, 20),  # 1-3
    (1, 8),  # under a year
    (0, 0),  # no recorded experience
)

#: Highest seniority actually reached. A title is evidence, not proof, which
#: is why this is worth less than half the category on its own.
SENIORITY_POINTS: Final[dict[str, int]] = {
    "executive": 25,
    "principal": 23,
    "lead": 20,
    "senior": 16,
    "mid": 11,
    "junior": 5,
    "intern": 2,
    "unknown": 0,
}

#: Distinct canonical skills. Breadth past a dozen says little -- a CV listing
#: forty skills is a keyword list, not a wider engineer -- so this flattens.
SKILL_COUNT_BANDS: Final[tuple[tuple[int, int], ...]] = (
    (13, 20),
    (8, 17),
    (4, 12),
    (1, 6),
    (0, 0),
)

QUALIFICATION_POINTS: Final[dict[str, int]] = {
    "doctorate": 18,
    "master": 16,
    "bachelor": 13,
    "diploma": 8,
    "secondary": 4,
    "none": 0,
    "unknown": 0,
}

CERTIFICATION_BANDS: Final[tuple[tuple[int, int], ...]] = ((3, 7), (1, 3), (0, 0))

#: 0-4 ordinal ratings from Layer 1, mapped to points. Lookup tables rather
#: than multiplication so the curve is visible and adjustable per dimension.
PROGRESSION_POINTS: Final[tuple[int, ...]] = (0, 5, 10, 15, 20)
EVIDENCE_POINTS: Final[tuple[int, ...]] = (0, 5, 10, 15, 20)
SPECIFICITY_POINTS: Final[tuple[int, ...]] = (0, 5, 10, 15, 20)
SCOPE_POINTS: Final[tuple[int, ...]] = (0, 4, 8, 11, 15)


@dataclass(frozen=True, slots=True)
class ResumeFeatures:
    """What Layer 2 hands to Layer 3. Facts and bounded ratings only."""

    total_experience_months: int = 0
    highest_seniority: str = "unknown"
    role_progression: int = 0  # 0-4
    skill_count: int = 0
    skill_evidence: int = 0  # 0-4, average evidence strength
    achievement_specificity: int = 0  # 0-4
    scope_of_responsibility: int = 0  # 0-4
    highest_qualification: str = "unknown"
    certification_count: int = 0


@dataclass(frozen=True, slots=True)
class ResumeScore:
    points: int
    breakdown: dict[str, int]
    rubric_version: str = RUBRIC_VERSION


@dataclass(frozen=True, slots=True)
class AddOnContributions:
    """Points from things bought rather than demonstrated.

    Separated from the resume score because invariant 4-prime bounds them
    independently, and because a dispute about a course is a different
    conversation from a dispute about a CV.
    """

    course_points: int = 0
    interview_points: int = 0
    events: list[dict[str, object]] = field(default_factory=list)


MAX_COURSE_POINTS: Final = 30
MAX_INTERVIEW_POINTS: Final = 60


def _band(table: tuple[tuple[int, int], ...], value: int) -> int:
    for threshold, points in table:
        if value >= threshold:
            return points
    return 0


def _ordinal(table: tuple[int, ...], rating: int) -> int:
    """Clamp rather than trust. Layer 1 is schema-constrained to 0-4, but this
    function is also called on stored features from older extractions."""
    return table[max(0, min(rating, len(table) - 1))]


def score_resume(features: ResumeFeatures) -> ResumeScore:
    """Facts in, 0-200 out, with the category breakdown that produced it.

    The breakdown is always computed and always stored -- admin drill-down and
    dispute handling need it. It is never exposed to a candidate: the client
    confirmed on 2026-08-27, and again on 2026-09-11, that the score is never
    explained.
    """
    experience = _band(EXPERIENCE_BANDS, max(0, features.total_experience_months))

    seniority = SENIORITY_POINTS.get(features.highest_seniority.lower(), 0)
    progression = seniority + _ordinal(PROGRESSION_POINTS, features.role_progression)

    skills = _band(SKILL_COUNT_BANDS, max(0, features.skill_count)) + _ordinal(
        EVIDENCE_POINTS, features.skill_evidence
    )

    achievements = _ordinal(SPECIFICITY_POINTS, features.achievement_specificity) + _ordinal(
        SCOPE_POINTS, features.scope_of_responsibility
    )

    education = QUALIFICATION_POINTS.get(features.highest_qualification.lower(), 0) + _band(
        CERTIFICATION_BANDS, max(0, features.certification_count)
    )

    breakdown = {
        "experience_depth": min(experience, CATEGORY_CAPS["experience_depth"]),
        "role_progression": min(progression, CATEGORY_CAPS["role_progression"]),
        "skills": min(skills, CATEGORY_CAPS["skills"]),
        "achievements": min(achievements, CATEGORY_CAPS["achievements"]),
        "education": min(education, CATEGORY_CAPS["education"]),
    }
    return ResumeScore(points=sum(breakdown.values()), breakdown=breakdown)


def total_score(resume: ResumeScore, addons: AddOnContributions) -> int:
    """700 + resume + add-ons. Cannot exceed 990 arithmetically.

    The bound is asserted rather than clamped. 700 + 200 + 30 + 60 is exactly
    990, so if this ever fires it is a bug in a cap above it, and a silent
    clamp would hide that bug behind a plausible number.
    """
    course = min(max(0, addons.course_points), MAX_COURSE_POINTS)
    interview = min(max(0, addons.interview_points), MAX_INTERVIEW_POINTS)
    total = BASE_SCORE + resume.points + course + interview

    if not BASE_SCORE <= total <= MAX_SCORE:  # pragma: no cover - defensive
        raise ValueError(f"score {total} outside {BASE_SCORE}-{MAX_SCORE}; a cap is wrong")
    return total


# ---------------------------------------------------------------------------
# What this rubric deliberately does NOT score
# ---------------------------------------------------------------------------
# Both are extracted and stored -- an interviewer may reasonably want to see
# them -- and both contribute exactly zero points.
#
# **Employment gaps.** Penalising a gap is indirect discrimination: gaps fall
# disproportionately on women after childbirth, on carers, and on people with
# health conditions. That is the same class of harm invariant 5 already forbids
# in the form of age-gating, and it would be inconsistent to forbid one and
# quietly implement the other.
#
# **Institution prestige.** `institution_type` is extracted but only the
# qualification level is scored. Ranking colleges entrenches existing
# advantage, and in a product whose stated purpose is opening access it would
# work against the thing being sold. This is a business decision and the client
# can reverse it -- but it should be a decision, made once, in the open, rather
# than a weight nobody noticed.
