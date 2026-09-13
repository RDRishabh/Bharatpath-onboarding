"""The job lifecycle and the threshold-preview coarsening. Pure."""

from __future__ import annotations

import pytest

from app.modules.jobs.domain import (
    EDITABLE_STATES,
    MIN_REPORTED_COUNT,
    TRANSITIONS,
    coarse_count,
    is_editable,
    refuse_transition,
)
from app.modules.jobs.models import JOB_STATES

ALLOWED = {
    ("DRAFT", "PUBLISHED"),
    ("DRAFT", "CLOSED"),
    ("PUBLISHED", "PAUSED"),
    ("PUBLISHED", "CLOSED"),
    ("PAUSED", "PUBLISHED"),
    ("PAUSED", "CLOSED"),
}


def test_the_lifecycle_covers_every_state_the_database_allows() -> None:
    assert set(TRANSITIONS) == set(JOB_STATES)


@pytest.mark.parametrize("current", JOB_STATES)
@pytest.mark.parametrize("target", JOB_STATES)
def test_exactly_the_documented_transitions_are_allowed(current: str, target: str) -> None:
    refused = refuse_transition(current, target)
    assert (refused is None) == ((current, target) in ALLOWED)


def test_a_closed_job_goes_nowhere() -> None:
    """Reopening would put candidates back in a pipeline they were released from."""
    assert all(refuse_transition("CLOSED", target) for target in JOB_STATES)


def test_a_draft_cannot_be_paused() -> None:
    """Pausing means taking a live job off the board. A draft was never on it."""
    assert refuse_transition("DRAFT", "PAUSED") == "job_invalid_transition"


def test_only_drafts_and_paused_jobs_are_editable() -> None:
    """Editing a live job is a bait-and-switch on everyone who already applied."""
    assert {"DRAFT", "PAUSED"} == EDITABLE_STATES
    assert not is_editable("PUBLISHED")
    assert not is_editable("CLOSED")


@pytest.mark.parametrize("count", range(MIN_REPORTED_COUNT))
def test_small_counts_are_never_revealed(count: int) -> None:
    """Under ten, one person moving across a threshold would change the answer
    by one -- which is how a single score would be found."""
    assert coarse_count(count) == (0, True)


@pytest.mark.parametrize(("count", "expected"), [(10, 10), (19, 10), (20, 20), (1234, 1230)])
def test_larger_counts_are_rounded_down_to_the_nearest_ten(count: int, expected: int) -> None:
    assert coarse_count(count) == (expected, False)
