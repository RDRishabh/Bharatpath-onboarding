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

from dataclasses import dataclass, field
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
