"""INVARIANT 5 - no age-gating (PRD section 3 rule 4).

Lands Day 1. Two layers: the repository-wide scan must pass, and the scan
itself must be capable of failing - a guard that cannot fail is not a guard.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "check_no_age_fields.py"

pytestmark = pytest.mark.invariant


def test_no_age_or_dob_fields_anywhere() -> None:
    """The whole repository is free of age and date-of-birth constructs."""
    result = subprocess.run(  # noqa: S603
        [sys.executable, str(SCRIPT)], capture_output=True, text=True, cwd=ROOT
    )
    assert result.returncode == 0, (
        "Invariant 5 violated. PRD section 3 rule 4 forbids age or "
        f"date-of-birth anywhere in the product.\n\n{result.stdout}"
    )


@pytest.mark.parametrize(
    "offending_line",
    [
        "date_of_birth: Mapped[date] = mapped_column(Date)",
        "dob = Column(Date, nullable=True)",
        "if user.age >= 18:",
        "MIN_AGE = 18",
        "is_adult: bool = False",
        "birth_date: date | None = None",
        "if age < 18: raise",
        "over_18 = True",
    ],
)
def test_scan_detects_violations(tmp_path: Path, offending_line: str) -> None:
    """The guard must actually catch the things it claims to catch.

    Without this, invariant 5 could silently degrade to a script that prints
    OK on an empty regex and nobody would notice for months.
    """
    import re

    sys.path.insert(0, str(ROOT / "scripts"))
    try:
        import check_no_age_fields as checker
    finally:
        sys.path.pop(0)

    hit = checker.FIELD_RE.search(offending_line) or checker.AGE_GATE_RE.search(
        offending_line
    )
    assert hit is not None, f"guard failed to flag: {offending_line!r}"
    assert isinstance(hit, re.Match)


@pytest.mark.parametrize(
    "innocent_line",
    [
        "max_age = 3600  # cache TTL in seconds",
        "message_age_seconds = 42",
        "cache_control = 'max-age=600'",
    ],
)
def test_scan_does_not_flag_innocent_age_words(innocent_line: str) -> None:
    """`max-age` on a cookie is not age-gating a person.

    A guard with false positives gets skipped, and a skipped guard is worse
    than no guard because it looks like coverage.
    """
    sys.path.insert(0, str(ROOT / "scripts"))
    try:
        import check_no_age_fields as checker
    finally:
        sys.path.pop(0)

    assert checker.AGE_GATE_RE.search(innocent_line) is None
