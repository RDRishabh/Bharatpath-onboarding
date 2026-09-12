"""Which task runs when a domain event is published.

One table, so "what happens when a resume is confirmed?" has a single answer
that can be read, diffed and tested — rather than being distributed across
however many modules happened to subscribe.

**This is where the confirm gate is enforced as a subscription** (SRS 1.4.4).
Scoring is triggered by `resume.version_confirmed` and nothing else. The
obvious alternative, `resume.version_created`, fires on every parse and every
correction *including unconfirmed ones*, so subscribing to it would score
content the candidate has never reviewed — while every other test in the
suite still passed, because the gate function would remain intact and simply
never be called.

`tests/invariants/test_confirm_gate.py` asserts against this table directly:
the confirmed event must route to the scoring task, and the created event must
route nowhere near it.
"""

from __future__ import annotations

from typing import Final

#: Celery task names. Strings rather than imports, deliberately: the relay
#: enqueues by name and must not drag every module's dependencies into the
#: worker that publishes events.
SCORE_RESUME_TASK: Final = "scoring.score_resume"

#: `event_type -> the tasks it triggers`.
#:
#: An event with no entry is published and consumed by nobody, which is
#: ordinary — most events exist for analytics and notifications that arrive on
#: later days. Absence here is not a bug; a *wrong* entry is.
EVENT_SUBSCRIPTIONS: Final[dict[str, tuple[str, ...]]] = {
    # The confirm gate. See the module docstring for why this is the confirmed
    # event and not the created one.
    "resume.version_confirmed": (SCORE_RESUME_TASK,),
    # Add-ons move the score (R1, 2026-08-24), so a completion re-scores.
    # Both re-runs are Layer 3 only — the extraction is cached and content
    # addressed, so a purchase costs no model call and cannot drift the
    # resume-derived part of the number.
    #
    # TODO(Day 15/16): the courses and interview modules do not emit these
    # yet. The entries are declared here so that wiring them is adding an
    # emit, not rediscovering which event scoring listens for.
    "courses.completion_recorded": (SCORE_RESUME_TASK,),
    "interview.session_completed": (SCORE_RESUME_TASK,),
}


def tasks_for(event_type: str) -> tuple[str, ...]:
    """The tasks an event triggers. Empty when nothing subscribes."""
    return EVENT_SUBSCRIPTIONS.get(event_type, ())
