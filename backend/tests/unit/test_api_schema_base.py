"""No string from a client ever carries a character Postgres cannot store.

`app/core/schemas.py`. Found by the fuzzer on 2026-09-22, in two unrelated
endpoints at once -- a pasted CV and a discount code -- which is what made it
a boundary problem rather than two bugs. One reached a JSONB column, the
other a query parameter; all they had in common was being a string from a
request.

Postgres cannot hold NUL in `text`, `varchar` or `jsonb` at all, so both died
in the asyncpg driver with `invalid byte sequence for encoding "UTF8": 0x00`
-- a **500**, on input anybody can send.
"""

from __future__ import annotations

import pkgutil
from typing import Annotated

import pytest
from pydantic import Field, ValidationError

from app.core.schemas import ApiSchema, strip_control_characters

NUL = "\u0000"


class _Example(ApiSchema):
    name: str
    tags: list[str] = Field(default_factory=list)
    answers: dict[str, str] = Field(default_factory=dict)
    short: Annotated[str, Field(min_length=5)] = "abcde"


def test_a_nul_byte_is_removed_from_every_kind_of_field() -> None:
    parsed = _Example(
        name=f"Priya{NUL} Sharma",
        tags=[f"SQL{NUL}", "Excel"],
        answers={"city": f"Pune{NUL}"},
    )
    assert NUL not in parsed.name
    assert not any(NUL in tag for tag in parsed.tags)
    assert not any(NUL in value for value in parsed.answers.values())


def test_cleaning_happens_before_the_fields_own_validation() -> None:
    """**The ordering is the point.** A `min_length` should judge the cleaned
    value, not one padded out by characters that are about to be removed: a
    CV that is fifty characters only because eleven of them are NUL is not
    fifty characters."""
    with pytest.raises(ValidationError):
        _Example(name="x", short="ab" + NUL * 10)


@pytest.mark.parametrize(
    "char",
    ["\u0000", "\u0001", "\u000b", "\u000c", "\u001f", "\u007f"],
    ids=["nul", "soh", "vtab", "formfeed", "unit-sep", "del"],
)
def test_control_characters_are_stripped(char: str) -> None:
    assert strip_control_characters(f"a{char}b") == "ab"


@pytest.mark.parametrize(
    # chr() rather than literals: these are code points, and several are
    # invisible or indistinguishable from a plain space on the page.
    "char",
    [chr(c) for c in (0x09, 0x0A, 0x0D, 0x20, 0xA0, 0x0950, 0x1F600)],
    ids=["tab", "newline", "cr", "space", "nbsp", "devanagari-om", "emoji"],
)
def test_real_whitespace_and_real_text_survive(char: str) -> None:
    """The sweep has to be narrow. Tab, newline and carriage return carry
    layout a CV depends on; everything outside C0 is somebody's language."""
    assert strip_control_characters(f"a{char}b") == f"a{char}b"


def test_the_two_endpoints_the_fuzzer_actually_broke() -> None:
    """Regression, named so it is obvious what stops working if this goes."""
    from app.modules.resume.schemas import ManualResumeRequest
    from app.modules.subscriptions.schemas import DiscountPreviewRequest

    manual = ManualResumeRequest(full_name=f"Priya{NUL} Sharma", skills=[f"SQL{NUL}"])
    assert NUL not in manual.full_name
    assert NUL not in manual.skills[0]

    preview = DiscountPreviewRequest(plan_code="CANDIDATE_MONTHLY", discount_code=f"AB{NUL}CD")
    assert preview.discount_code == "ABCD"


def test_every_module_schema_inherits_the_sanitising_base() -> None:
    """**Why this lives on a shared base rather than on each field.**

    A rule remembered per module holds until somebody adds the next module,
    and the failure is a 500 rather than a red test. Twenty-one modules each
    declared an identical `_Base`; a twenty-second declaring its own
    `BaseModel` would silently opt out, so the check is structural.
    """
    import app.modules as modules

    missing = []
    checked = 0
    for info in pkgutil.iter_modules(modules.__path__):
        try:
            schemas = __import__(f"app.modules.{info.name}.schemas", fromlist=["_Base"])
        except ImportError:
            continue  # a module with no schemas is fine
        base = getattr(schemas, "_Base", None)
        if base is None:
            continue
        checked += 1
        if not issubclass(base, ApiSchema):
            missing.append(info.name)

    # Guard against the guard: finding nothing would pass while checking
    # nothing.
    assert checked >= 20, f"only inspected {checked} modules; the discovery has drifted"
    assert missing == [], (
        f"these modules define a `_Base` that does not inherit `ApiSchema`, so their "
        f"string fields can carry a NUL byte into Postgres: {missing}"
    )
