"""The review screen's sections: a view of the text, and back again."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.modules.resume.sections import (
    CANONICAL_HEADINGS,
    HEADER,
    KINDS,
    assemble_sections,
    heading_kind,
    section_items,
    split_sections,
)
from app.modules.resume.vocabulary import LANGUAGES, SKILLS, VOCABULARY_VERSION

CV = """Priya Deshmukh
Pune, Maharashtra | priya@example.com

CAREER OBJECTIVE
Microbiology graduate seeking a laboratory role.

Academic Qualifications:
B.Sc Microbiology
Fergusson College, Pune  2022-2025  68%

HSC Science
Maharashtra Board  2022  74%

Skills: Microbial culturing, Lab reporting, MS Excel, MS-Ofice, Teem work
Internship
Quality control intern, Serum Labs, 2024. Ran 40 assays a week.

Languages Known
English, Hindi"""


def _nonblank_lines(text: str) -> list[str]:
    return [line.strip() for line in text.split("\n") if line.strip()]


def _as_tuples(text: str) -> list[tuple[str, str | None, str]]:
    return [(s.kind, s.heading, s.body) for s in split_sections(text)]


# --- splitting ----------------------------------------------------------------
def test_a_cv_splits_into_its_sections_in_document_order() -> None:
    kinds = [s.kind for s in split_sections(CV)]
    assert kinds == [HEADER, "summary", "education", "skills", "experience", "languages"]


def test_headings_are_kept_as_written() -> None:
    headings = [s.heading for s in split_sections(CV)]
    assert headings[1:3] == ["CAREER OBJECTIVE", "Academic Qualifications:"]


def test_a_heading_with_content_on_its_line_opens_a_section() -> None:
    skills = next(s for s in split_sections(CV) if s.kind == "skills")
    assert skills.heading == "Skills:"
    assert skills.body.startswith("Microbial culturing")


def test_no_line_is_lost_by_splitting() -> None:
    """Every line is in exactly one section. A line the splitter dropped would
    vanish from the text the moment the candidate saved any edit."""
    rebuilt: list[str] = []
    for section in split_sections(CV):
        if section.heading is not None:
            rebuilt.append(section.heading)
        rebuilt.extend(section.body.split("\n"))
    joined = "\n".join(rebuilt)
    assert _nonblank_lines(joined.replace("Skills:\n", "Skills: ")) == _nonblank_lines(CV)


def test_a_text_with_no_headings_is_one_header_section() -> None:
    text = "Ravi Kumar\nDelivery partner, 3 years\nTwo-wheeler licence"
    assert _as_tuples(text) == [(HEADER, None, text)]


def test_prose_that_starts_like_a_heading_is_not_one() -> None:
    text = "Experience in handling customer complaints across three branches"
    assert heading_kind(text) is None


def test_an_unrecognised_heading_stays_in_the_previous_body() -> None:
    text = "Skills\nPython\nVolunteering at the local library\nReading"
    (skills,) = split_sections(text)
    assert "Volunteering at the local library" in skills.body


# --- assembling ---------------------------------------------------------------
def test_what_is_saved_is_what_is_seen_next() -> None:
    first = _as_tuples(CV)
    assert _as_tuples(assemble_sections(first)) == first


def test_an_added_section_without_a_heading_gets_the_standard_one() -> None:
    text = assemble_sections([("projects", None, "Water survey")])
    assert _as_tuples(text) == [("projects", "Projects", "Water survey")]


@pytest.mark.parametrize("kind", [k for k in KINDS if k != HEADER])
def test_every_standard_heading_reads_back_as_its_kind(kind: str) -> None:
    assert heading_kind(CANONICAL_HEADINGS[kind]) == kind  # type: ignore[index]


def test_a_deleted_section_is_gone_from_the_text() -> None:
    kept = [t for t in _as_tuples(CV) if t[0] != "languages"]
    assert "Hindi" not in assemble_sections(kept)


# --- items --------------------------------------------------------------------
def _items(kind: str, body: str) -> list[tuple[str, bool, str | None]]:
    items = section_items(kind, body)
    assert items is not None
    return [(i.text, i.unclear, i.suggestion) for i in items]


def test_near_misses_are_flagged_with_the_spelling_meant() -> None:
    assert _items("skills", "MS-Ofice, Teem work, Pyton") == [
        ("MS-Ofice", True, "MS Office"),
        ("Teem work", True, "Teamwork"),
        ("Pyton", True, "Python"),
    ]


def test_an_unknown_skill_is_not_unclear() -> None:
    """Unknown is not unclear: most real skills are not on our list, and
    flagging them would teach candidates to ignore the flag."""
    assert _items("skills", "Microbial culturing, Hydroponics") == [
        ("Microbial culturing", False, None),
        ("Hydroponics", False, None),
    ]


def test_an_extension_of_a_known_skill_is_not_a_typo() -> None:
    assert all(not unclear for _, unclear, _ in _items("skills", "Python3, AngularJS, ReactJS"))


def test_items_split_on_bullets_and_commas_but_not_inside_brackets() -> None:
    assert [t for t, _, _ in _items("skills", "• SQL • Python (Pandas, NumPy)\n- Excel")] == [
        "SQL",
        "Python (Pandas, NumPy)",
        "Excel",
    ]


def test_a_label_before_a_colon_is_not_a_skill() -> None:
    assert [t for t, _, _ in _items("skills", "Technical: SQL, Excel")] == ["SQL", "Excel"]


def test_something_that_cannot_be_a_skill_is_unclear() -> None:
    long = "Worked on many different things across the whole organisation for years"
    assert _items("skills", f"2022, {long}") == [("2022", True, None), (long, True, None)]


def test_certifications_split_by_line_only() -> None:
    body = "AWS Certified Cloud Practitioner, Foundational\nGoogle Data Analytics"
    assert [t for t, _, _ in _items("certifications", body)] == [
        "AWS Certified Cloud Practitioner, Foundational",
        "Google Data Analytics",
    ]


def test_languages_are_checked_against_languages() -> None:
    assert _items("languages", "Englsh, Marathi (native)") == [
        ("Englsh", True, "English"),
        ("Marathi (native)", False, None),
    ]


def test_prose_sections_have_no_items() -> None:
    assert section_items("experience", "Quality control intern") is None


def test_the_vocabulary_is_still_ours() -> None:
    """A placeholder, like every other list we wrote for the client. Replacing
    it is their decision, and this is where that decision shows."""
    assert VOCABULARY_VERSION.startswith("placeholder-")
    assert SKILLS and LANGUAGES


# --- the edit request ---------------------------------------------------------
def _edit(**kwargs: object):
    from app.modules.resume.schemas import ResumeEditRequest

    return ResumeEditRequest(**kwargs)


def _sections_payload(text: str = CV) -> list[dict[str, object]]:
    return [{"kind": k, "heading": h, "body": b} for k, h, b in _as_tuples(text)]


def test_a_section_edit_stores_the_text_it_assembles_to() -> None:
    payload = _sections_payload()
    skills = next(p for p in payload if p["kind"] == "skills")
    skills["body"] = "Microbial culturing, Lab reporting, MS Excel, MS Office, Teamwork"

    text = _edit(sections=payload).edited_text()

    assert text is not None
    assert "MS Office, Teamwork" in text
    assert "MS-Ofice" not in text
    assert "Fergusson College, Pune" in text, "an untouched section was lost"


def test_a_section_edit_is_normalised_like_any_other_text() -> None:
    from app.modules.resume.domain import normalise_pasted_text

    text = _edit(sections=_sections_payload()).edited_text()
    assert text == normalise_pasted_text(text or "")


@pytest.mark.parametrize(
    "sections",
    [
        [{"kind": "skills", "heading": "Education", "body": "x" * 60}],
        [{"kind": "header", "heading": "Name", "body": "x" * 60}],
        [{"kind": "skills", "body": "x" * 60}, {"kind": "header", "body": "y" * 60}],
        [{"kind": "skills", "body": "SQL"}],
        [{"kind": "nonsense", "body": "x" * 60}],
    ],
    ids=["wrong-heading", "header-heading", "header-not-first", "too-short", "unknown-kind"],
)
def test_a_section_edit_that_would_not_read_back_is_refused(
    sections: list[dict[str, object]],
) -> None:
    with pytest.raises(ValidationError):
        _edit(sections=sections)


def test_exactly_one_shape_of_edit() -> None:
    with pytest.raises(ValidationError):
        _edit(text=CV, sections=_sections_payload())
    with pytest.raises(ValidationError):
        _edit()
