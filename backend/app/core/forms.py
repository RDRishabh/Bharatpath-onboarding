"""The shape of an onboarding form field.

Lives in `app.core` because both `kyb` and `college` need it and neither may
import the other -- the `module-privacy` contract exists to keep them
separately extractable, and a shared primitive in core is the way two modules
agree on a type without depending on each other.

**A form definition is data.** These structures describe what to ask and how to
validate it; they render on four clients (mobile plus three web front-ends) from
one published definition, so adding a field is a change here rather than a
change in four codebases that then drift.

**`pattern` is a client-side hint, never the authority.** Every value is
re-validated on the server, because a regex in a form definition is advice to a
browser and the browser is not ours.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import date
from typing import Final, Literal

FieldType = Literal[
    "TEXT",
    "TEXTAREA",
    "EMAIL",
    "PHONE",
    "NUMBER",
    "SELECT",
    "MULTISELECT",
    "DATE",
    "FILE",
    "CHECKBOX",
]


@dataclass(frozen=True, slots=True)
class FormField:
    code: str
    #: Translation key; the English `label` is the source string and fallback.
    key: str
    label: str
    type: FieldType
    required: bool = False
    #: Client-side validation hint only. Re-validated server-side, always.
    pattern: str | None = None
    max_length: int | None = None
    help_text: str | None = None
    #: For SELECT / MULTISELECT. `None` means the options come from a reference
    #: list named by `options_source` rather than being inlined here.
    options_source: str | None = None
    #: Whether the value is shown to anyone outside the organisation that
    #: entered it. Defaults to False: a field is private until someone decides
    #: otherwise, which is the safer direction to get wrong.
    public: bool = False
    #: Fields a reviewer must positively confirm, not merely see. Empty on most
    #: of them; the ones that carry it are the identity documents.
    verification_note: str | None = None


@dataclass(frozen=True, slots=True)
class FormSection:
    code: str
    title: str
    fields: tuple[FormField, ...]
    help_text: str | None = None


@dataclass(frozen=True, slots=True)
class FormDefinition:
    code: str
    version: str
    sections: tuple[FormSection, ...] = field(default_factory=tuple)

    @property
    def fields(self) -> tuple[FormField, ...]:
        return tuple(f for section in self.sections for f in section.fields)

    def field_by_code(self, code: str) -> FormField | None:
        return next((f for f in self.fields if f.code == code), None)

    def required_codes(self) -> frozenset[str]:
        return frozenset(f.code for f in self.fields if f.required)


# ---------------------------------------------------------------------------
# Indian statutory identifier formats
# ---------------------------------------------------------------------------
# Shared because both an employer and a college have a PAN. The shapes are
# fixed by the issuing authority and do not change; what changes is which of
# them a given organisation is required to hold, which is why almost none of
# them are `required=True` below.

#: Permanent Account Number. Ten characters, fourth encodes the holder type.
PAN_PATTERN: Final = r"^[A-Z]{5}[0-9]{4}[A-Z]$"

#: GST identification number. Fifteen characters, first two the state code.
#: **Not required**: a business under the turnover threshold is not registered,
#: and demanding it excludes exactly the small employers this marketplace is
#: trying to reach.
GSTIN_PATTERN: Final = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$"

#: Corporate Identity Number, for companies registered with the MCA. Twenty-one
#: characters. An LLP has an LLPIN instead, and a proprietorship has neither.
CIN_PATTERN: Final = r"^[LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$"

#: Tax Deduction Account Number.
TAN_PATTERN: Final = r"^[A-Z]{4}[0-9]{5}[A-Z]$"

#: AISHE code -- the All India Survey on Higher Education identifier every
#: recognised higher-education institution carries. The closest thing to a
#: national registry of colleges, and the reason the college form can verify an
#: institution exists without asking for a scanned certificate.
AISHE_PATTERN: Final = r"^[A-Z]-[0-9]{1,6}$"

#: Indian mobile. Ten digits starting 6-9, optionally +91 prefixed.
INDIAN_MOBILE_PATTERN: Final = r"^(\+91)?[6-9][0-9]{9}$"


# ---------------------------------------------------------------------------
# Server-side validation
# ---------------------------------------------------------------------------
# **The authority.** `pattern`, `required` and `max_length` above are published
# to four clients as hints; this is where they are enforced, because a hint the
# browser honours is a hint the API caller does not have to.

_EMAIL: Final = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True, slots=True)
class AnswerIssue:
    """One problem with one field. A code, not a sentence: the client renders
    the message in the user's language."""

    field: str
    code: str


def _blank(value: object) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def validate_answers(
    form: FormDefinition,
    answers: Mapping[str, object],
    *,
    options: Mapping[str, frozenset[str]],
    uploaded: frozenset[str] = frozenset(),
    complete: bool,
) -> tuple[AnswerIssue, ...]:
    """Every problem with a set of answers, in form order. Empty means valid.

    `complete=False` checks only what was sent, so a form can be saved half
    finished. `complete=True` is submission: every required field must be
    answered, every required document uploaded, every required undertaking
    accepted.

    `options` maps each `options_source` to its allowed codes. A source the
    form names but the caller does not supply is a programming error and
    raises -- validating a SELECT against nothing would accept anything.

    `uploaded` is the set of FILE field codes that have a stored document.
    Files are never answered inline: a FILE code appearing in `answers` is an
    issue, because an uploaded document has to go through the upload path
    that sniffs its type and caps its size.
    """
    issues: list[AnswerIssue] = []
    known = {f.code for f in form.fields}

    for code in answers:
        if code not in known:
            issues.append(AnswerIssue(code, "unknown_field"))

    for spec in form.fields:
        if spec.type == "FILE":
            if spec.code in answers:
                issues.append(AnswerIssue(spec.code, "not_answerable"))
            elif complete and spec.required and spec.code not in uploaded:
                issues.append(AnswerIssue(spec.code, "required"))
            continue

        value = answers.get(spec.code)
        if _blank(value):
            if complete and spec.required:
                issues.append(AnswerIssue(spec.code, "required"))
            continue

        issue = _check_value(spec, value, options)
        if issue is not None:
            issues.append(AnswerIssue(spec.code, issue))

    return tuple(issues)


def _check_value(
    spec: FormField, value: object, options: Mapping[str, frozenset[str]]
) -> str | None:
    if spec.type == "CHECKBOX":
        if not isinstance(value, bool):
            return "wrong_type"
        # An undertaking that is present but false is not accepted.
        return "must_be_accepted" if spec.required and value is not True else None

    if spec.type == "NUMBER":
        return None if isinstance(value, int) and not isinstance(value, bool) else "wrong_type"

    if spec.type in ("SELECT", "MULTISELECT"):
        if spec.options_source is None:
            raise ValueError(f"{spec.code} is a {spec.type} with no options_source")
        if spec.options_source not in options:
            raise ValueError(f"no options supplied for {spec.options_source}")
        allowed = options[spec.options_source]
        if spec.type == "SELECT":
            if not isinstance(value, str):
                return "wrong_type"
            return None if value in allowed else "not_an_option"
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            return "wrong_type"
        return None if set(value) <= allowed else "not_an_option"

    if not isinstance(value, str):
        return "wrong_type"
    if spec.max_length is not None and len(value) > spec.max_length:
        return "too_long"
    if spec.type == "EMAIL" and not _EMAIL.match(value):
        return "invalid_format"
    if spec.type == "DATE":
        try:
            date.fromisoformat(value)
        except ValueError:
            return "invalid_format"
    if spec.pattern is not None and re.fullmatch(spec.pattern, value) is None:
        return "invalid_format"
    return None
