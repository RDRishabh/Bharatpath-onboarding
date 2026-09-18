"""Live check of OpenAI and Sarvam with the keys in `backend/.env`. Costs a few rupees.

    cd backend
    .venv/Scripts/python.exe scripts/verify_ai_providers.py
    .venv/Scripts/python.exe scripts/verify_ai_providers.py --compare gpt-5.4 gpt-5-mini

1. OpenAI: the key works and the pinned snapshots exist.
2. CV extraction on a sample CV, through the real `OpenAIResumeExtractor`,
   with its validated facts, tokens and cost. `--compare` runs the same CV on
   another model, side by side -- to choose a model on evidence, not price.
3. Sarvam: speaks a Hinglish answer with Sarvam's own text-to-speech, then
   transcribes it through the real `SarvamTranscriptionProvider` (batch job).
4. OpenAI interview feedback on that transcript, through
   `OpenAIEvaluationProvider`, checked by `domain.parse_evaluation`.

Nothing is written to the database. Neither key is ever printed.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import sys
import time
from pathlib import Path
from typing import Any

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.modules.interview.bank import DIMENSION_CODES
from app.modules.interview.domain import parse_evaluation
from app.modules.interview.evaluation import AnswerForEvaluation
from app.modules.interview.openai_evaluator import OpenAIEvaluationProvider
from app.modules.interview.sarvam import SarvamTranscriptionProvider
from app.modules.scoring.openai_extractor import OpenAIResumeExtractor
from app.settings import get_settings

#: USD per 1M tokens (input, output), standard tier, 2026-09-18. Reasoning
#: tokens bill as output. Estimates only -- the invoice is the truth.
PRICES = {
    "gpt-5.4-mini": (0.75, 4.50),
    "gpt-5.4-nano": (0.20, 1.25),
    "gpt-5.4": (2.50, 15.00),
    "gpt-5.5": (5.00, 30.00),
    "gpt-5-mini": (0.25, 2.00),
}
USD_TO_INR = 88.0

SAMPLE_CV = """\
Priya Raman
Staff Nurse | Chennai | priya.r@example.com | +91 90000 00000

Summary: Registered nurse with 7+ years of experience in emergency care.

Experience
Senior Staff Nurse, Apollo Hospitals, Chennai        Apr 2021 - Present
- Lead a team of 6 nurses on the night shift of a 40-bed emergency department.
- Cut triage-to-doctor time from 22 to 14 minutes by redesigning the triage board.
- Trained 25 new nurses on the Manchester Triage System.

Staff Nurse, Fortis Malar Hospital, Chennai           Jun 2018 - Mar 2021
- Rotated through ICU and emergency; handled 30+ patients per shift.
- Member of the hospital infection-control committee.

Education
B.Sc. Nursing, Madras Medical College, 2018

Certifications: BLS, ACLS (American Heart Association)
Languages: Tamil, English, Hindi
Skills: Triage, Critical care, IV cannulation, Team leadership, Patient counselling
"""

SPOKEN_ANSWER = (
    "Pichhle saal hamare emergency ward mein ek raat bahut rush tha. Main shift lead "
    "thi. Maine triage board ko dobara arrange kiya aur do nurses ko sirf critical "
    "patients pe lagaya. Result yeh hua ki waiting time bees minute se chaudah minute "
    "ho gaya, aur us raat koi patient bina dekhe nahi gaya."
)


def _cost(model: str, usage: dict[str, Any]) -> str:
    base = next((k for k in sorted(PRICES, key=len, reverse=True) if model.startswith(k)), None)
    if base is None:
        return "price unknown"
    price_in, price_out = PRICES[base]
    usd = (
        usage.get("input_tokens", 0) * price_in + usage.get("output_tokens", 0) * price_out
    ) / 1e6
    return f"${usd:.4f} (~Rs {usd * USD_TO_INR:.2f})"


async def check_openai_models(models: list[str]) -> bool:
    settings = get_settings()
    if settings.openai_api_key is None:
        print("  FAIL  OPENAI_API_KEY is not set in backend/.env")
        return False
    headers = {"Authorization": f"Bearer {settings.openai_api_key.get_secret_value()}"}
    ok = True
    async with httpx.AsyncClient(base_url=settings.openai_base_url, timeout=30) as client:
        listing = await client.get("/models", headers=headers)
        if listing.status_code != 200:
            print(f"  FAIL  key rejected by OpenAI (HTTP {listing.status_code})")
            return False
        ids = sorted(m["id"] for m in listing.json()["data"] if m["id"].startswith("gpt-5"))
        print(f"  ok    key works; GPT-5 models visible to it: {', '.join(ids)}")
        for model in models:
            got = await client.get(f"/models/{model}", headers=headers)
            status = "ok  " if got.status_code == 200 else "FAIL"
            ok &= got.status_code == 200
            print(f"  {status}  {model}")
    return ok


async def check_extraction(model: str) -> None:
    started = time.monotonic()
    result = await OpenAIResumeExtractor(model_id=model).extract(text=SAMPLE_CV)
    elapsed = time.monotonic() - started
    f = result.features
    usage = result.raw_response.get("usage") or {}
    print(f"  ok    {model}  {elapsed:.1f}s  {_cost(model, usage)}  {usage}")
    for role in f.roles:
        dates = f"{role.start_year}-{role.start_month} .. " + (
            "now" if role.is_current else f"{role.end_year}-{role.end_month}"
        )
        print(
            f"        role  {role.title} @ {role.employer}: {role.months} months, "
            f"{role.seniority_level}, {role.employment_type}, "
            f"managerial={role.is_managerial}, {dates}"
        )
    print(f"        education  {[(e.qualification_level, e.field) for e in f.education]}")
    print(f"        skills  {[(s.canonical_name, s.evidence_strength) for s in f.skills]}")
    print(f"        certifications  {f.certifications}; languages {f.languages}")
    print(
        f"        total_experience_months={f.total_experience_months} "
        f"stated={f.stated_experience_months}  achievement_specificity="
        f"{f.achievement_specificity} role_progression={f.role_progression} "
        f"scope_of_responsibility={f.scope_of_responsibility}"
    )


async def spoken_audio() -> bytes:
    settings = get_settings()
    assert settings.sarvam_api_key is not None
    async with httpx.AsyncClient(base_url=settings.sarvam_base_url, timeout=60) as client:
        response = await client.post(
            "/text-to-speech",
            headers={"api-subscription-key": settings.sarvam_api_key.get_secret_value()},
            json={
                "text": SPOKEN_ANSWER,
                "target_language_code": "hi-IN",
                "model": "bulbul:v3",
                "output_audio_codec": "aac",
            },
        )
        if response.status_code != 200:
            raise SystemExit(
                f"  FAIL  Sarvam text-to-speech HTTP {response.status_code}: {response.text[:300]}"
            )
        return b"".join(base64.b64decode(a) for a in response.json()["audios"])


async def check_sarvam_and_feedback(model: str) -> None:
    if get_settings().sarvam_api_key is None:
        print("  FAIL  SARVAM_API_KEY is not set in backend/.env")
        return
    audio = await spoken_audio()
    print(f"  ok    Sarvam text-to-speech: {len(audio)} bytes of AAC")
    started = time.monotonic()
    provider = SarvamTranscriptionProvider()
    heard = await provider.transcribe(audio=audio, mime="audio/aac")
    print(
        f"  ok    Sarvam {provider.version} batch transcription in "
        f"{time.monotonic() - started:.1f}s, language {heard.language}"
    )
    print(f"        said:  {SPOKEN_ANSWER}")
    print(f"        heard: {heard.text}")

    answer = AnswerForEvaluation(
        question_code="Q1",
        prompt="Tell me about a time you handled pressure at work.",
        looking_for="A specific situation, what they did themselves, and the result.",
        transcript=heard.text,
    )
    raw = await OpenAIEvaluationProvider(model_id=model).evaluate(answers=[answer])
    parsed = parse_evaluation(raw, question_codes=("Q1",), dimension_codes=DIMENSION_CODES)
    print(f"  ok    OpenAI feedback ({model}) fits the rubric: {parsed[0].ratings}")
    print(f"        comment: {parsed[0].comment}")


async def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    parser = argparse.ArgumentParser()
    parser.add_argument("--compare", nargs="*", default=[], help="other model ids to compare")
    args = parser.parse_args()
    settings = get_settings()
    models = [settings.scoring_model_id, *args.compare]
    evaluator = settings.interview_evaluation_model_id or settings.scoring_model_id

    print("1. OpenAI key and models")
    if not await check_openai_models(sorted({*models, evaluator})):
        raise SystemExit(1)
    print("2. CV extraction (sample CV)")
    for model in models:
        await check_extraction(model)
    print("3-4. Sarvam transcription, then OpenAI interview feedback")
    await check_sarvam_and_feedback(evaluator)


if __name__ == "__main__":
    asyncio.run(main())
