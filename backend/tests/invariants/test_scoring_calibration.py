"""The calibration corpus, and the golden-replay gate built on it.

`tests/fixtures/calibration_corpus.json` holds 35 profiles spanning nine
industries and every seniority level, each with the exact score and breakdown
the rubric produced when it was accepted.

**This is the invariant 1 gate.** Any change to weights, bands or category caps
moves at least one of these numbers, and CI fails with the profile that moved.
Re-baselining is deliberate: regenerate the corpus, read the diff, and commit it
as a visible re-score rather than a silent drift.

**The corpus is synthetic, and that is a real limitation.** It was built from
general resume-scoring practice rather than from real CVs the client scored, so
it proves the rubric is *internally consistent* and *behaves sensibly* -- not
that it matches the client's commercial judgment. See `docs/blockers.md` A2.
"""

from __future__ import annotations

import json
import pathlib
from collections import Counter
from typing import Any

import pytest

from app.modules.scoring.domain import (
    BASE_SCORE,
    MAX_RESUME_POINTS,
    RUBRIC_VERSION,
    ResumeFeatures,
    score_resume,
)

CORPUS_PATH = pathlib.Path(__file__).resolve().parents[1] / "fixtures" / "calibration_corpus.json"
CORPUS: dict[str, Any] = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
PROFILES: list[dict[str, Any]] = CORPUS["profiles"]

BAND_ORDER = ["ENTRY", "DEVELOPING", "SOLID", "STRONG"]


def _score(profile: dict[str, Any]) -> int:
    return BASE_SCORE + score_resume(ResumeFeatures(**profile["features"])).points


# --- the golden gate -------------------------------------------------------
def test_the_corpus_was_built_against_this_rubric() -> None:
    """A corpus from a different rubric version proves nothing about this one."""
    assert CORPUS["rubric_version"] == RUBRIC_VERSION, (
        "the rubric changed but the corpus was not regenerated -- "
        "regenerate it, read the diff, and commit it as a deliberate re-score"
    )


@pytest.mark.parametrize("profile", PROFILES, ids=[p["id"] for p in PROFILES])
def test_every_profile_still_scores_exactly_what_it_did(profile: dict[str, Any]) -> None:
    """Invariant 1, as a regression gate. If this fails, a score moved."""
    result = score_resume(ResumeFeatures(**profile["features"]))
    assert BASE_SCORE + result.points == profile["expected_total"], (
        f"{profile['id']} ({profile['label']}) moved from "
        f"{profile['expected_total']} to {BASE_SCORE + result.points}"
    )
    assert result.breakdown == profile["expected_breakdown"], (
        f"{profile['id']} kept its total but changed how it got there"
    )


# --- the rubric must behave sensibly, not just consistently ----------------
def test_the_corpus_covers_every_band() -> None:
    """A corpus that misses a band cannot detect a rubric that stops producing
    it -- if nothing scores ENTRY any more, nobody would notice."""
    present = Counter(p["expected_band"] for p in PROFILES)
    for band in BAND_ORDER:
        assert present[band] >= 3, f"only {present[band]} profiles in {band}"


def test_scores_are_spread_not_clustered() -> None:
    """A rubric that puts everyone in the 820s is not scoring, it is labelling.
    Employers filter on this number; if it does not separate candidates it has
    no commercial use."""
    totals = [p["expected_total"] for p in PROFILES]
    assert max(totals) - min(totals) >= 120, "the rubric uses too little of its range"
    # No single 10-point window may hold more than a third of the corpus.
    for floor in range(700, 901, 10):
        window = [t for t in totals if floor <= t < floor + 10]
        assert len(window) <= len(totals) / 3, f"clustered at {floor}-{floor + 9}"


def test_quality_beats_tenure() -> None:
    """Years served is not the product. A long flat career must not outrank a
    shorter strong one, or the score just measures age -- which is the thing
    invariant 5 exists to keep out of this product."""
    flat = next(p for p in PROFILES if p["label"].startswith("10y but flat"))
    strong = next(p for p in PROFILES if p["label"].startswith("4y mid developer"))
    assert _score(flat) < _score(strong)


def test_a_keyword_stuffed_cv_does_not_beat_an_evidenced_one() -> None:
    """Listing thirty skills with no evidence is a gaming strategy, and it is
    the most common one. Breadth flattens; evidence does not."""
    stuffed = next(p for p in PROFILES if p["label"].startswith("Keyword-stuffed"))
    evidenced = next(p for p in PROFILES if p["label"].startswith("4y mid developer"))
    assert _score(stuffed) < _score(evidenced)


def test_the_rubric_is_not_biased_towards_software() -> None:
    """Nine industries are represented. If only IT profiles reach the top
    bands, the rubric has learned a sector rather than a standard -- and the
    marketplace sells to manufacturing, healthcare and retail too."""
    top = [p for p in PROFILES if p["expected_band"] in ("SOLID", "STRONG")]
    industries = {p["industry"] for p in top}
    assert len(industries) >= 5, f"only {industries} reach the upper bands"
    assert any(p["industry"] != "IT & Software" for p in PROFILES if p["expected_band"] == "STRONG")


def test_a_diploma_holder_can_still_reach_a_high_band() -> None:
    """Education is 25 of 200 deliberately. A ceiling on people without a
    degree would exclude most of the market this product is sold into."""
    diploma = [p for p in PROFILES if p["features"]["highest_qualification"] == "diploma"]
    assert diploma, "the corpus should contain diploma holders"
    assert max(_score(p) for p in diploma) >= 820


def test_someone_with_no_formal_qualification_is_not_capped_out() -> None:
    no_qual = next(p for p in PROFILES if p["features"]["highest_qualification"] == "none")
    assert _score(no_qual) >= 780


# --- monotonicity: improving anything never costs you ---------------------
IMPROVEMENTS = [
    ("total_experience_months", 12),
    ("role_progression", 1),
    ("skill_count", 1),
    ("skill_evidence", 1),
    ("achievement_specificity", 1),
    ("scope_of_responsibility", 1),
    ("certification_count", 1),
]


@pytest.mark.parametrize(("field_name", "delta"), IMPROVEMENTS)
@pytest.mark.parametrize("profile", PROFILES[:12], ids=[p["id"] for p in PROFILES[:12]])
def test_improving_a_dimension_never_lowers_the_score(
    profile: dict[str, Any], field_name: str, delta: int
) -> None:
    """The property a candidate would notice fastest, and the one most likely
    to be broken by a band-table edit: doing more of a good thing must never
    cost points."""
    before = ResumeFeatures(**profile["features"])
    after = ResumeFeatures(
        **{**profile["features"], field_name: profile["features"][field_name] + delta}
    )
    assert score_resume(after).points >= score_resume(before).points, (
        f"{profile['id']}: +{delta} {field_name} lowered the score"
    )


def test_no_profile_can_exceed_the_resume_band() -> None:
    for profile in PROFILES:
        assert score_resume(ResumeFeatures(**profile["features"])).points <= MAX_RESUME_POINTS
