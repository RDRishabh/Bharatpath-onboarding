"""The course, as a structure with a syllabus and no videos in it.

Produced 2026-09-11 under `answers-log.md` Round 7.10, closing the *buildable*
half of blocker C1. Read the two halves separately:

- **The structure is real** and can be built against today: modules, lessons,
  durations, an assessment, and a completion rule that already exists in
  `domain.py`.
- **The media does not exist.** Every lesson carries `asset_key = None`, which
  is the honest representation of "nobody has recorded this". The seeder marks
  the course inactive for exactly that reason, so it cannot be sold.

**The syllabus is ours, the content is not.** A client may well want a different
course; this one exists so that Day 15's purchase and completion flows, and
Day 8's need for an add-on completion event, are built against something with a
shape rather than against `TODO`.

---

**Why the syllabus is about evidence rather than about the score.**

Completing this course adds up to +30 to a number, so there is an obvious
temptation to build it as "how to score well on BharatPath". That would be
wrong twice over. The client confirmed twice that the score is never explained
(Round 7.3), so a course that explained it would contradict the product. And a
course that taught rubric-gaming would inflate every score without improving a
single candidate, which destroys the thing employers are paying for.

So it teaches people to *document work they actually did*, accurately and
specifically. That genuinely moves the rubric -- `achievement_specificity` and
`skill_evidence` are half the resume band -- while the mechanism stays honest:
the CV improves because the description improved, not because the candidate
learned a trick. Nothing below names a weight, a category or a band.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

#: Matches `COURSE_PRODUCT` in `subscriptions/catalogue.py`, and written by
#: `scripts/seed_catalogue.py`. One course exists on the platform (client,
#: 2026-08-27).
COURSE_CODE: Final = "COURSE_RESUME_FOUNDATION"
COURSE_TITLE: Final = "Presenting Your Work"

#: Bump when the syllabus changes. A candidate who completed version 1 did a
#: different course from one who completed version 2, and `course_completions`
#: stores a rule version for the same reason.
SYLLABUS_VERSION: Final = "placeholder-1-2026-09-11"

#: False until someone has actually recorded the lessons. The catalogue
#: endpoint refuses to list a course whose media is missing -- a candidate who
#: pays for empty lessons is a refund and a review, and the +30 would be
#: awarded for watching nothing.
HAS_MEDIA: Final = False


@dataclass(frozen=True, slots=True)
class Lesson:
    code: str
    title: str
    minutes: int
    #: What the learner should be able to *do* afterwards. Written as an
    #: outcome because that is what makes an assessment question writable --
    #: "understands X" cannot be tested, "can rewrite X as Y" can.
    outcome: str
    #: S3 key of the recorded lesson. `None` everywhere today.
    asset_key: str | None = None


@dataclass(frozen=True, slots=True)
class Module:
    code: str
    title: str
    lessons: tuple[Lesson, ...]

    @property
    def minutes(self) -> int:
        return sum(lesson.minutes for lesson in self.lessons)


MODULES: Final[tuple[Module, ...]] = (
    Module(
        "M1",
        "What a hiring team actually reads",
        (
            Lesson(
                "M1L1",
                "The first fifteen seconds",
                6,
                "Name the three things a reader looks for before deciding to keep reading.",
            ),
            Lesson(
                "M1L2",
                "Why most CVs say nothing",
                8,
                "Tell a duty apart from an accomplishment in someone else's CV.",
            ),
            Lesson(
                "M1L3",
                "One CV, many readers",
                6,
                "Explain why the same CV is read by software, a recruiter and a manager.",
            ),
        ),
    ),
    Module(
        "M2",
        "Describing work as evidence",
        (
            Lesson(
                "M2L1",
                "Duty, action, result",
                10,
                "Rewrite a duty sentence as an action with a result.",
            ),
            Lesson(
                "M2L2",
                "Finding the result when nobody measured it",
                10,
                "Recover a defensible outcome from work that was never formally measured.",
            ),
            Lesson(
                "M2L3",
                "Your part of a team's work",
                8,
                "State a personal contribution to a group result without overclaiming it.",
            ),
        ),
    ),
    Module(
        "M3",
        "Numbers you can stand behind",
        (
            Lesson(
                "M3L1",
                "Counting what you did",
                8,
                "Turn volume, frequency and duration into a number that is true.",
            ),
            Lesson(
                "M3L2",
                "Percentages, and when not to use one",
                7,
                "Choose between a count and a percentage for a given result.",
            ),
            Lesson(
                "M3L3",
                "The honesty line",
                9,
                "Identify claims you could not defend if an interviewer asked one more question.",
            ),
        ),
    ),
    Module(
        "M4",
        "Skills you can demonstrate",
        (
            Lesson(
                "M4L1",
                "Why a long skills list works against you",
                7,
                "Cut a padded skills list to the ones that appear in your own work history.",
            ),
            Lesson(
                "M4L2",
                "Attaching a skill to a piece of work",
                9,
                "Point to where in your history each listed skill was used.",
            ),
            Lesson(
                "M4L3",
                "Certificates, courses and what they are worth",
                6,
                "Decide which certificates belong on a CV and which do not.",
            ),
        ),
    ),
    Module(
        "M5",
        "Structure, format and the things that get CVs discarded",
        (
            Lesson(
                "M5L1",
                "Order, length and what goes on page one",
                8,
                "Lay out a CV so the strongest evidence is read first.",
            ),
            Lesson(
                "M5L2",
                "Files, fonts and scanned photographs",
                6,
                "Produce a file that software and a human can both read.",
            ),
            Lesson(
                "M5L3",
                "Dates, gaps and career changes",
                8,
                "Present a non-linear history plainly instead of hiding it.",
            ),
        ),
    ),
    Module(
        "M6",
        "Talking about your work out loud",
        (
            Lesson(
                "M6L1",
                "Answering with a structure",
                9,
                "Answer a 'tell me about a time' question in situation-action-result form.",
            ),
            Lesson(
                "M6L2",
                "Questions about gaps, moves and mistakes",
                9,
                "Answer an uncomfortable question without apologising or inventing.",
            ),
            Lesson(
                "M6L3",
                "Asking your own questions",
                6,
                "Prepare questions that tell you whether you want the job.",
            ),
        ),
    ),
)

#: `evaluate_completion` requires all modules plus 70% on this. Twenty
#: questions is the smallest bank where 70% is not one lucky guess away from
#: 65%: each question is worth five points, so the pass line falls between
#: fourteen and fifteen correct rather than on a boundary.
ASSESSMENT_QUESTION_COUNT: Final = 20
ASSESSMENT_PASS_FRACTION: Final = 0.7

#: Drawn at random from a larger bank per attempt, so a retake is not the same
#: paper. The bank itself is written alongside the questionnaire bank.
ASSESSMENT_BANK_MINIMUM: Final = 60


def total_minutes() -> int:
    return sum(module.minutes for module in MODULES)


def module_count() -> int:
    """What `CourseProgress.modules_total` is seeded from."""
    return len(MODULES)


def lesson_count() -> int:
    return sum(len(module.lessons) for module in MODULES)


def missing_media() -> tuple[str, ...]:
    """Lesson codes with no recorded asset. Everything, today.

    The catalogue endpoint calls this rather than trusting `HAS_MEDIA`, so a
    half-recorded course cannot be listed by flipping one flag.
    """
    return tuple(
        lesson.code for module in MODULES for lesson in module.lessons if lesson.asset_key is None
    )
