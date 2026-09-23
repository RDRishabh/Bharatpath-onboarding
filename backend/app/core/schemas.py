"""The base every request and response schema shares.

Twenty-one modules each declared an identical `_Base`. They now inherit this
one, which adds a single thing they could not have individually: **no string
arriving from a client ever carries a character Postgres cannot store.**

---

## The bug this closes

Found by the fuzzer on 2026-09-22 (`tests/integration/test_api_fuzz.py`).
Postgres cannot hold `\\x00` in a `text`, `varchar` or `jsonb` value at all --
not as an escape, not encoded, not anywhere. A request carrying one passed
validation, passed the service, and died in the asyncpg driver:

    asyncpg.exceptions.CharacterNotInRepertoireError:
        invalid byte sequence for encoding "UTF8": 0x00

which the client sees as a **500**. On input anybody can send.

It was found in two unrelated places at once -- a pasted CV and a discount
code -- which is what makes it a boundary problem rather than two bugs. One
reached a JSONB column, the other a query parameter, and the only thing they
had in common was being a string from a request. Fixing the two endpoints
would have left the other hundred and fifty-five.

## Why here and not in a validator on each field

There are several hundred string fields. A rule that has to be remembered per
field is a rule that holds until somebody adds the next one, and the failure
is a 500 rather than a test going red. Applied on the shared base it is true
of every field that exists and every field anybody adds.

## Why stripping and not rejecting

A 422 would be defensible and is worse in practice. These characters are not
something a person types or intends: they arrive from a corrupted PDF, a bad
encoding conversion, or a copy-paste out of a binary file. The candidate
pasting a CV out of a damaged document cannot act on "your input contained
U+0000", and the text either side of it is perfectly good. Silently dropping
what was never visible anyway is the answer that keeps them moving.

**NUL is the one that must go; the rest go with it** because none of them
renders, none can be typed deliberately, and each is a way to make two values
that look identical compare and store differently. Tab, newline and carriage
return are kept -- they carry layout a CV depends on.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

#: C0 controls and DEL, minus the three whitespace characters that carry
#: meaning. Built as a translation table because `str.translate` is a single
#: pass in C and this runs on every string of every request.
CONTROL_CHARACTERS = dict.fromkeys([*range(0, 9), 11, 12, *range(14, 32), 127])


def strip_control_characters(value: str) -> str:
    """Remove what Postgres cannot store and a reader cannot see."""
    return value.translate(CONTROL_CHARACTERS)


class ApiSchema(BaseModel):
    """Base for every request and response schema in the application."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    @field_validator("*", mode="before")
    @classmethod
    def _strip_control_characters(cls, value: Any) -> Any:
        """Runs `before`, so it cleans the input on the way to the field's own
        validators rather than after them.

        That ordering matters: a `min_length` or a pattern should judge the
        cleaned value, not one padded out by characters that are about to be
        removed. A CV that is fifty characters only because eleven of them are
        NUL is not fifty characters.

        Containers are walked one level, which covers the shapes a request
        body actually takes -- a list of skills, a dict of form answers.
        Nested models are not walked here because they are themselves
        `ApiSchema` and clean their own fields.
        """
        if isinstance(value, str):
            return strip_control_characters(value)
        if isinstance(value, list):
            return [strip_control_characters(v) if isinstance(v, str) else v for v in value]
        if isinstance(value, dict):
            return {
                k: strip_control_characters(v) if isinstance(v, str) else v
                for k, v in value.items()
            }
        return value
