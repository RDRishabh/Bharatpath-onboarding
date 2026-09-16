"""interview - pure domain logic

Audio sessions, chunk upload, evaluation, +20/session.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

**Four rules live here**, and the session machine has a twin below the service
(`guard_interview_session_write`, generated from `SESSION_TRANSITIONS`):

  1. **The device check runs before payment** (SRS 1.10.1) and is judged here,
     never by the client. The client reports what it measured; whether that
     passes is ours to decide, versioned, so a threshold change is visible.
     Audio only: no camera row, no lighting row.
  2. **A completed session records +20, and the +60 cap is not here.** It lives
     in `scoring/domain.py`. This module records that a session finished and
     what one is worth; clamping the total is scoring's job, so a fourth
     completion still records +20 and scoring folds in none of it.
  3. **Whether a purchase can still earn points is decided before payment**
     (`purchase_earns_points`), so the app can say "this session will not
     increase your score" and require it to be acknowledged. Without that a
     fourth session is a refund request.
  4. **An answer is judged by what was stored**, not by what the client says
     it uploaded: size from S3, format sniffed from the bytes.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Final

from app.modules.interview.bank import (
    ANSWER_SECONDS,
    QUESTIONS_PER_SESSION,
    SESSIONS_THAT_EARN_POINTS,
)

# ---------------------------------------------------------------------------
# The contribution
# ---------------------------------------------------------------------------
#: What one completed session records. Also a CHECK on `interview_sessions`.
POINTS_PER_SESSION: Final = 20

#: Stored on every completed session. **Bump when what a completion is worth,
#: or what counts as one, changes** -- a replay reads the version it was
#: computed under, not today's.
CONTRIBUTION_VERSION: Final = "interview-1"

# ---------------------------------------------------------------------------
# The device check
# ---------------------------------------------------------------------------
DEVICE_CHECK_RULE_VERSION: Final = "device-1"

#: Opus mono at 16 kHz is 16-24 kbps. Answers upload after each one is
#: recorded, so the link only has to carry one ~20 KB-per-30s file at a time;
#: this refuses a dead connection, not a slow one. 2G EDGE clears it.
MIN_NETWORK_KBPS: Final = 16

#: Six answers of two minutes at a generous bitrate is ~6 MB. The client keeps
#: answers locally until each upload is confirmed (SRS 1.10.5), so it needs
#: room for all of them at once, plus headroom.
MIN_STORAGE_MB: Final = 20

#: A passed check is good for this long. Long enough to pay by UPI and start;
#: short enough that "passed yesterday on home Wi-Fi" does not start a session
#: on a bus. Re-running it costs the candidate seconds.
DEVICE_CHECK_VALID_FOR: Final = timedelta(minutes=60)


@dataclass(frozen=True, slots=True)
class DeviceReadings:
    """What the app measured. Audio only -- there is nothing about a camera."""

    mic_ok: bool
    audio_out_ok: bool
    network_kbps: int | None
    storage_mb: int | None
    quiet_env_ok: bool


@dataclass(frozen=True, slots=True)
class DeviceCheckDecision:
    passed: bool
    #: Codes, in a fixed order, for the app to render in the candidate's
    #: language. Empty when passed.
    failures: tuple[str, ...]
    rule_version: str = DEVICE_CHECK_RULE_VERSION


def evaluate_device_check(readings: DeviceReadings) -> DeviceCheckDecision:
    """Every failing check is reported, not just the first, so a candidate
    fixes everything in one go rather than discovering problems one retry at
    a time.

    A reading the app could not take (`None`) fails: a check that passes on
    missing data is not a check, and the point of running it before payment
    is that nobody pays and then cannot start.
    """
    failures: list[str] = []
    if not readings.mic_ok:
        failures.append("microphone_unavailable")
    if not readings.audio_out_ok:
        failures.append("audio_output_unavailable")
    if readings.network_kbps is None or readings.network_kbps < MIN_NETWORK_KBPS:
        failures.append("network_too_slow")
    if readings.storage_mb is None or readings.storage_mb < MIN_STORAGE_MB:
        failures.append("storage_insufficient")
    if not readings.quiet_env_ok:
        failures.append("environment_too_noisy")
    return DeviceCheckDecision(passed=not failures, failures=tuple(failures))


def device_check_is_fresh(*, checked_at: datetime, now: datetime) -> bool:
    return checked_at <= now < checked_at + DEVICE_CHECK_VALID_FOR


# ---------------------------------------------------------------------------
# Buying a session
# ---------------------------------------------------------------------------
def purchase_earns_points(*, sessions_held: int) -> bool:
    """Whether one more session can still move the score.

    `sessions_held` is every session the candidate has already paid for that
    has not been thrown away: completed ones, the one in progress, and
    purchases not yet started. An abandoned session earned nothing and is not
    counted, so abandoning one does not use up a place under the cap.

    Mirrors the cap in `scoring/domain.py` for the purpose of *telling the
    candidate before they pay*. It decides nothing about the score: scoring
    applies its own cap to what was actually completed.
    """
    return max(0, sessions_held) < SESSIONS_THAT_EARN_POINTS


# ---------------------------------------------------------------------------
# The session
# ---------------------------------------------------------------------------
#: Sessions a candidate is still recording.
OPEN_STATES: Final = frozenset({"CREATED", "IN_PROGRESS"})
#: Sessions that were completed, and so carry a contribution. FAILED is an
#: evaluation that could not produce feedback (Day 17): the session was still
#: completed, and points are for completing (`bank.py`), so it keeps them.
COMPLETED_STATES: Final = frozenset({"COMPLETED", "EVALUATED", "FAILED"})
SESSION_STATES: Final = OPEN_STATES | COMPLETED_STATES | {"ABANDONED"}

#: `from -> to`. Compiled into `guard_interview_session_write`.
SESSION_TRANSITIONS: Final[frozenset[tuple[str, str]]] = frozenset(
    {
        ("CREATED", "IN_PROGRESS"),
        ("CREATED", "ABANDONED"),
        ("IN_PROGRESS", "ABANDONED"),
        ("IN_PROGRESS", "COMPLETED"),
        ("COMPLETED", "EVALUATED"),
        ("COMPLETED", "FAILED"),
    }
)


def can_complete(*, stored_indexes: set[int]) -> bool:
    """Every question answered and stored. Not how well: completing is what
    awards points (`bank.py`)."""
    return stored_indexes >= set(range(QUESTIONS_PER_SESSION))


# ---------------------------------------------------------------------------
# Answers
# ---------------------------------------------------------------------------
#: Two minutes of AAC at 64 kbps is under 1 MB. Double that, and no more: a
#: presigned PUT cannot enforce a size, so this is checked on the stored object.
MAX_ANSWER_BYTES: Final = 2 * 1024 * 1024
#: A second of Opus is a few KB. Anything smaller is not a spoken answer.
MIN_ANSWER_BYTES: Final = 1024
MIN_ANSWER_MS: Final = 1_000
#: The recording stops at `ANSWER_SECONDS`; a few seconds of slack for the
#: container and a clock that started late.
MAX_ANSWER_MS: Final = (ANSWER_SECONDS + 5) * 1000

#: Opus in Ogg or WebM, AAC as ADTS or in MP4. What Android and iOS record to.
ACCEPTED_AUDIO_TYPES: Final = ("audio/ogg", "audio/webm", "audio/aac", "audio/mp4")


def answer_key(*, user_id: uuid.UUID, session_id: uuid.UUID, question_index: int) -> str:
    """Derived from ids the server issued. **The client never names a key**:
    a presigned PUT authorises exactly the key it signs, so a client-chosen key
    is a candidate writing over someone else's answer."""
    return f"interview-audio/{user_id}/{session_id}/{question_index}"


def valid_question_index(index: int) -> bool:
    return 0 <= index < QUESTIONS_PER_SESSION


def sniff_audio(head: bytes) -> str | None:
    """The container, from its magic bytes. Never from a client's Content-Type."""
    if head.startswith(b"OggS"):
        return "audio/ogg"
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        return "audio/webm"
    if len(head) >= 12 and head[4:8] == b"ftyp":
        return "audio/mp4"
    # ADTS: a 12-bit sync word, then layer bits that are always 00.
    if len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xF6) == 0xF0:
        return "audio/aac"
    return None


@dataclass(frozen=True, slots=True)
class AnswerRejection:
    code: str
    detail: str


def validate_answer(*, head: bytes, size_bytes: int, duration_ms: int) -> AnswerRejection | None:
    if size_bytes > MAX_ANSWER_BYTES:
        return AnswerRejection("answer_too_large", f"at most {MAX_ANSWER_BYTES} bytes")
    if size_bytes < MIN_ANSWER_BYTES:
        return AnswerRejection("answer_too_small", "the recording holds no answer")
    if sniff_audio(head) is None:
        return AnswerRejection("answer_not_audio", "Opus or AAC audio only")
    if not MIN_ANSWER_MS <= duration_ms <= MAX_ANSWER_MS:
        return AnswerRejection(
            "answer_duration_out_of_range", f"between {MIN_ANSWER_MS} and {MAX_ANSWER_MS} ms"
        )
    return None
