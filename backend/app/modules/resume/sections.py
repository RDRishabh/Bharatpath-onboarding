"""A CV's text, seen as sections -- and put back together after an edit.

Pure: no I/O, no clock. The review screen shows a CV as cards (education,
skills, experience) and lets the candidate correct one card at a time.

**The text stays the thing that is scored.** Sections are a view computed from
`raw_text` on every read, never stored, and a section edit is turned back into
text before it is saved. Converting an upload into the structured form instead
would drop every line that has no field to go in -- the achievement detail
Layer 1 reads for its three judgments -- so fixing a typo on the review screen
would quietly lower a score.

What is guaranteed:

- **Nothing is lost by splitting.** Every line of the text is in exactly one
  section, as a heading or in a body.
- **What is saved is what is seen next.** Splitting assembled sections gives
  the same sections back, provided no body line is itself a heading.

What is not: that a heading is recognised. An unrecognised heading stays a line
in the previous section's body, which is visible and editable, not lost.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import get_close_matches
from typing import Final, Literal, get_args

from app.modules.resume.vocabulary import LANGUAGES, SKILLS

#: Every kind, in the order a CV usually has them. `header` is the text before
#: the first heading -- usually the name and contact lines -- and has none.
SectionKind = Literal[
    "header",
    "summary",
    "experience",
    "projects",
    "education",
    "skills",
    "certifications",
    "languages",
    "achievements",
    "activities",
    "personal",
]
HEADER: Final = "header"
KINDS: Final[tuple[SectionKind, ...]] = get_args(SectionKind)

#: What a section is written under when the candidate did not give a heading.
#: Each one must be recognised as its own kind, or an added section would merge
#: into the one before it the next time the text is split. A test holds that.
CANONICAL_HEADINGS: Final[dict[SectionKind, str]] = {
    "summary": "Summary",
    "experience": "Experience",
    "projects": "Projects",
    "education": "Education",
    "skills": "Skills",
    "certifications": "Certifications",
    "languages": "Languages",
    "achievements": "Achievements",
    "activities": "Activities",
    "personal": "Personal Details",
}

_HEADINGS: Final[dict[SectionKind, tuple[str, ...]]] = {
    "summary": (
        "summary",
        "profile",
        "profile summary",
        "professional summary",
        "career summary",
        "executive summary",
        "professional profile",
        "about me",
        "objective",
        "career objective",
    ),
    "experience": (
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "employment history",
        "work history",
        "internship",
        "internships",
        "internship experience",
    ),
    "projects": (
        "projects",
        "project",
        "academic projects",
        "personal projects",
        "key projects",
        "project work",
        "projects undertaken",
    ),
    "education": (
        "education",
        "educational background",
        "education and training",
        "academic qualification",
        "academic qualifications",
        "educational qualification",
        "educational qualifications",
        "qualification",
        "qualifications",
        "academic details",
        "academics",
    ),
    "skills": (
        "skills",
        "technical skills",
        "key skills",
        "core skills",
        "soft skills",
        "professional skills",
        "it skills",
        "computer skills",
        "skill set",
        "skillset",
        "core competencies",
        "areas of expertise",
    ),
    "certifications": (
        "certifications",
        "certification",
        "certificates",
        "courses",
        "courses and certifications",
        "certifications and courses",
        "licenses and certifications",
        "training",
        "trainings",
    ),
    "languages": ("languages", "languages known", "language proficiency", "language"),
    "achievements": (
        "achievements",
        "awards",
        "awards and achievements",
        "achievements and awards",
        "honours",
        "honors",
        "accomplishments",
    ),
    "activities": (
        "activities",
        "extra curricular activities",
        "extracurricular activities",
        "co curricular activities",
        "positions of responsibility",
        "volunteering",
        "volunteer experience",
        "hobbies",
        "interests",
        "hobbies and interests",
    ),
    "personal": ("personal details", "personal information", "personal profile", "declaration"),
}

_KIND_OF_HEADING: Final[dict[str, SectionKind]] = {
    heading: kind for kind, headings in _HEADINGS.items() for heading in headings
}

#: A heading is a short line. Anything longer is prose that happens to start
#: with a word like "Experience".
_MAX_HEADING_CHARS: Final = 40

_BULLETS: Final = "•●▪■◦‣►➢✓"
_LEADING_BULLET = re.compile(rf"^\s*(?:[{_BULLETS}]|[-*\u2013]\s)\s*")
_INLINE_BULLET = re.compile(rf"\s*[{_BULLETS}]\s*")


def _heading_key(line: str) -> str:
    key = line.strip().strip(":-\u2013\u2014|").strip().casefold()
    key = key.replace("&", " and ").replace("-", " ").replace("/", " ")
    return " ".join(key.split())


def heading_kind(line: str) -> SectionKind | None:
    """The kind a heading names, or None if the line is not a heading."""
    if not line.strip() or len(line.strip()) > _MAX_HEADING_CHARS:
        return None
    return _KIND_OF_HEADING.get(_heading_key(line))


def _split_heading(line: str) -> tuple[SectionKind, str, str] | None:
    """`(kind, heading, rest)` if the line opens a section, else None.

    `Skills: Python, SQL` opens one too, with the rest of the line as the
    first line of its body. Only a colon separates: a hyphen is too often part
    of the content ("Experience - 3 years").
    """
    kind = heading_kind(line)
    if kind is not None:
        return kind, line.strip(), ""
    label, colon, rest = line.partition(":")
    if colon and rest.strip():
        kind = heading_kind(label)
        if kind is not None:
            return kind, f"{label.strip()}:", rest.strip()
    return None


@dataclass(frozen=True, slots=True)
class Section:
    kind: SectionKind
    #: As written in the document. None for `HEADER`.
    heading: str | None
    body: str


def split_sections(text: str) -> list[Section]:
    """The text as sections, in document order.

    A text with no recognised heading is one `HEADER` section holding all of
    it -- the same text, not a failure.
    """
    sections: list[Section] = []
    kind: SectionKind = HEADER
    heading: str | None = None
    lines: list[str] = []

    def flush() -> None:
        body = "\n".join(lines).strip("\n")
        if kind != HEADER or body.strip():
            sections.append(Section(kind=kind, heading=heading, body=body))

    for line in text.split("\n"):
        opened = _split_heading(line)
        if opened is None:
            lines.append(line)
            continue
        flush()
        kind, heading, rest = opened
        lines = [rest] if rest else []
    flush()
    return sections


def assemble_sections(sections: list[tuple[SectionKind, str | None, str]]) -> str:
    """`(kind, heading, body)` back into text. The inverse of `split_sections`.

    A missing heading is written as the kind's canonical one. The caller
    checks that a given heading names its kind (`heading_kind`) and that
    `HEADER` comes first; this function trusts both.
    """
    parts: list[str] = []
    for kind, heading, body in sections:
        body = body.strip("\n")
        if kind == HEADER:
            if body.strip():
                parts.append(body)
            continue
        title = heading.strip() if heading else CANONICAL_HEADINGS[kind]
        parts.append(f"{title}\n{body}" if body.strip() else title)
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Items: the chips in a list-like section
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class Item:
    text: str
    #: Worth a second look: probably a typo, a sentence split by mistake, or
    #: not a word at all.
    unclear: bool
    #: The spelling we think was meant, when `unclear` is a near miss.
    suggestion: str | None = None


#: Sections read as a list of short items. Certifications split by line only,
#: because a certification's own name often holds a comma.
_COMMA_LISTS: Final = frozenset({"skills", "languages"})
_LINE_LISTS: Final = frozenset({"certifications"})

_MAX_ITEM_CHARS: Final = 60
#: A match must be at least this close to be offered as the intended spelling.
_NEAR_MISS: Final = 0.85
#: Below this many characters, two different words are routinely a near miss
#: ("Java"/"Jav"), so nothing that short is ever called a typo.
_MIN_FUZZY_CHARS: Final = 4


def _norm(value: str) -> str:
    return re.sub(r"[^0-9a-z+#]", "", value.casefold())


def _index(words: tuple[str, ...]) -> dict[str, str]:
    index: dict[str, str] = {}
    for word in words:
        index.setdefault(_norm(word), word)
    return index


_VOCABULARIES: Final[dict[str, dict[str, str]]] = {
    "skills": _index(SKILLS),
    "languages": _index(LANGUAGES),
}


def _split_outside_brackets(line: str) -> list[str]:
    """Split on `, ; |` but not inside brackets: "Python (Pandas, NumPy)" is
    one item."""
    out: list[str] = []
    current: list[str] = []
    depth = 0
    for char in line:
        if char in "([{":
            depth += 1
        elif char in ")]}" and depth:
            depth -= 1
        if char in ",;|" and depth == 0:
            out.append("".join(current))
            current = []
            continue
        current.append(char)
    out.append("".join(current))
    return out


def _raw_items(kind: str, body: str) -> list[str]:
    items: list[str] = []
    for line in body.split("\n"):
        line = _LEADING_BULLET.sub("", line).strip()
        if not line:
            continue
        if kind in _COMMA_LISTS:
            # "Technical: Python, SQL" -- the label is not a skill.
            label, colon, rest = line.partition(":")
            if colon and rest.strip() and len(label) <= 30:
                line = rest
        for part in _INLINE_BULLET.split(line):
            pieces = _split_outside_brackets(part) if kind in _COMMA_LISTS else [part]
            for piece in pieces:
                piece = _LEADING_BULLET.sub("", piece).strip()
                if piece:
                    items.append(piece)
    return items


def _judge(item: str, vocabulary: dict[str, str] | None) -> Item:
    if not any(char.isalpha() for char in item) or len(item) > _MAX_ITEM_CHARS:
        return Item(text=item, unclear=True)
    if vocabulary is None:
        return Item(text=item, unclear=False)
    norm = _norm(item)
    if len(norm) < _MIN_FUZZY_CHARS or norm in vocabulary:
        return Item(text=item, unclear=False)
    pool = [known for known in vocabulary if len(known) >= _MIN_FUZZY_CHARS]
    # "Python3" and "AngularJS" extend a known word; they are not misspellings.
    if any(known.startswith(norm) or norm.startswith(known) for known in pool):
        return Item(text=item, unclear=False)
    match = get_close_matches(norm, pool, n=1, cutoff=_NEAR_MISS)
    if match:
        return Item(text=item, unclear=True, suggestion=vocabulary[match[0]])
    return Item(text=item, unclear=False)


def section_items(kind: str, body: str) -> list[Item] | None:
    """The items of a list-like section, each judged. None for any other kind.

    **Unknown is not unclear.** A skill we have never heard of is not flagged;
    only a near miss of one we have, or something that cannot be a skill.
    """
    if kind not in _COMMA_LISTS and kind not in _LINE_LISTS:
        return None
    vocabulary = _VOCABULARIES.get(kind)
    return [_judge(item, vocabulary) for item in _raw_items(kind, body)]
