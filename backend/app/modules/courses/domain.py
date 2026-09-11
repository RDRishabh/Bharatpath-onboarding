"""courses - pure domain logic

Catalogue, purchase, completion, +30 contribution.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

**What "completing a course" means is not yet decided by the client** --
`docs/blockers.md` C1, previously N7. That matters more than it sounds: a
completion moves a real consumer's score by up to 30 points, so the rule below
is a *scoring* rule wearing the clothes of a progress tracker.

The rule here is therefore explicitly provisional and explicitly **versioned**.
Every `course_completions` row stores the `contribution_version` that was in
force when it was written, so replacing this rule re-scores from a known point
instead of silently changing numbers under existing candidates (invariant 1).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

#: The completion rule in force. **Bump this whenever the rule changes.**
#:
#: Stored on every completion row. Two candidates who completed the same course
#: under different rules are not comparable, and this is what makes that
#: visible rather than invisible.
COMPLETION_RULE_VERSION: Final = "provisional-1"

#: Invariant 4-prime. Also enforced by a CHECK constraint on `courses`, because
#: a cap that exists only in Python is a cap until someone writes SQL.
MAX_COURSE_CONTRIBUTION: Final = 30

#: Provisional thresholds. Chosen to be defensible rather than correct -- they
#: are placeholders for a client decision, not a product judgment we are
#: entitled to make.
MIN_MODULES_FRACTION: Final = 1.0  # every module, not most of them
MIN_ASSESSMENT_SCORE: Final = 0.7  # 70% on the end assessment


@dataclass(frozen=True, slots=True)
class CourseProgress:
    """What we know about one candidate's progress through one course."""

    modules_total: int
    modules_completed: int
    assessment_score: float | None  # 0.0-1.0, or None if not attempted


@dataclass(frozen=True, slots=True)
class CompletionDecision:
    complete: bool
    rule_version: str
    reason: str


def evaluate_completion(progress: CourseProgress) -> CompletionDecision:
    """Decide whether a course counts as completed.

    Deliberately strict while the real rule is unknown. Being too strict
    withholds points a candidate may deserve, which is visible and fixable on
    appeal; being too loose awards points nobody earned, which is invisible,
    inflates every score in the cohort, and cannot be found later without
    re-scoring everyone. Given a rule we will certainly replace, the first
    failure mode is the one to prefer.

    `reason` is a code, not a sentence -- it is read by an admin drill-down
    and rendered in the candidate's language (see `docs/blockers.md` C5).
    """
    if progress.modules_total <= 0:
        return CompletionDecision(False, COMPLETION_RULE_VERSION, "course_has_no_modules")

    fraction = progress.modules_completed / progress.modules_total
    if fraction < MIN_MODULES_FRACTION:
        return CompletionDecision(False, COMPLETION_RULE_VERSION, "modules_incomplete")

    if progress.assessment_score is None:
        return CompletionDecision(False, COMPLETION_RULE_VERSION, "assessment_not_attempted")

    if progress.assessment_score < MIN_ASSESSMENT_SCORE:
        return CompletionDecision(False, COMPLETION_RULE_VERSION, "assessment_not_passed")

    return CompletionDecision(True, COMPLETION_RULE_VERSION, "complete")


def clamp_contribution(points: int) -> int:
    """Bound a course's contribution. Invariant 4-prime.

    A pure function so the property tests can throw any ordering or quantity of
    completions at it: no sequence of them may exceed the cap.
    """
    return max(0, min(points, MAX_COURSE_CONTRIBUTION))
