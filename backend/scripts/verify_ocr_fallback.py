"""Prove the OCR fallback works against real AWS, end to end.

Builds a PDF that is an *image* of text -- no text layer, exactly what a phone
photo of a CV produces -- uploads it, and checks that the local parser finds
nothing and Textract recovers the content.

This cannot run in CI: it needs credentials and it spends money (one page).
Run it by hand after changing the parser chain, or once Textract activation
clears on a new AWS account:

    cd backend && .venv/Scripts/python.exe scripts/verify_ocr_fallback.py
"""

from __future__ import annotations

import io
import os
import pathlib
import sys
import uuid

LINES = [
    "PRIYA SHARMA",
    "Senior Backend Engineer | Bengaluru",
    "priya.sharma@example.com",
    "",
    "EXPERIENCE",
    "Infosys - Senior Developer, 2019 to 2024",
    "Built payment services handling 40000 requests per second.",
    "Led a team of six engineers across two product lines.",
    "",
    "EDUCATION",
    "B.Tech Computer Science, VIT Vellore, 2015",
    "",
    "SKILLS",
    "Python, PostgreSQL, Kubernetes, AWS",
]


def _scanned_pdf() -> bytes:
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (1240, 1754), "white")
    draw = ImageDraw.Draw(img)
    y = 80
    for line in LINES:
        draw.text((70, y), line, fill="black")
        y += 46
    buf = io.BytesIO()
    img.save(buf, "PDF", resolution=150.0)
    return buf.getvalue()


def main() -> int:
    env = pathlib.Path(__file__).resolve().parent.parent / ".env.aws"
    if not env.exists():
        print("no .env.aws -- run: terraform output -raw env_file > backend/.env.aws")
        return 2
    for line in env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()
    os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://u:p@localhost/db")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

    import boto3

    from app.modules.resume.parser import LocalResumeParser, get_resume_parser
    from app.settings import get_settings

    settings = get_settings()
    bucket = settings.s3_bucket_resumes
    key = f"resumes/_selftest/{uuid.uuid4()}.pdf"
    data = _scanned_pdf()

    s3 = boto3.client("s3", region_name=settings.aws_region)
    s3.put_object(Bucket=bucket, Key=key, Body=data)
    print(f"uploaded {len(data)} bytes to s3://{bucket}/{key}")

    try:
        local = LocalResumeParser().extract(content=data, mime="application/pdf")
        print(f"local only    -> {len(local.text)} chars (a silently empty resume)")
        if local.text.strip():
            print("UNEXPECTED: the local parser found text in a scan")
            return 1

        parser = get_resume_parser()
        result = parser.extract(content=data, mime="application/pdf", bucket=bucket, key=key)
        print(f"with fallback -> {len(result.text)} chars via {result.parser!r}")
        print(f"version       -> {result.parser_version}")
        print("-" * 40)
        print(result.text[:300])
        print("-" * 40)

        if result.parser != "textract":
            print("FAIL: the fallback did not engage")
            return 1
        if "PRIYA" not in result.text.upper():
            print("FAIL: OCR did not recover the candidate name")
            return 1
        print("OK: OCR fallback verified against live Textract")
        return 0
    finally:
        s3.delete_object(Bucket=bucket, Key=key)
        print("cleaned up")


if __name__ == "__main__":
    sys.exit(main())
