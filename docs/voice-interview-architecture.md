# BharatPath — voice interview backend

**Architecture and models.** 7 September 2026.

Short answer to your question first: **we will use AWS Bedrock, and we do not need an API key
from you.** Bedrock authenticates through your own AWS account using IAM. There is no
third-party API key for you to obtain, hold, or rotate.

---

## 1. What this is

- **Recorded, not a live call.** The candidate records answers in the app. No telephony, no
  dial-in, no call orchestration.
- **Audio only. No video.**

Audio-only keeps a 30-second answer at roughly 20 KB, which is what makes this usable on a 2G
connection for the students you are targeting.

A completed session adds +20 to the candidate's score, capped at +60 across all sessions. The
cap is enforced in the scoring module, not here.

---

## 2. The pipeline

```
  DEVICE CHECK  (before payment)
  microphone · audio output · network · storage
        │  pass/fail recorded
        ▼
  SESSION CREATED   gated on: passed device check + valid entitlement
        │           question set is versioned — every session records
        ▼           which version it answered
  ANSWER CAPTURE    recorded in-app, one question at a time
        │           per-question presigned upload, Opus/AAC mono 16 kHz
        ▼           progressive — never one large file at the end
  S3 (private, presigned access only — audio is never public)
        │
        ▼
  STAGE 1 — TRANSCRIPTION            (Amazon Transcribe)
  Audio → text. Indian English and Hindi. Stored verbatim.
        │
        ▼
  STAGE 2 — EVALUATION               (a model on AWS Bedrock)
  Reads the transcript against a versioned rubric.
  Returns schema-validated, bounded ratings. Never a score.
        │
        ▼
  STAGE 3 — SCORING                  (ordinary code)
  Pure function. Ratings + weights → contribution. Applies the
  +20 / +60 cap. No model, no I/O, unit-tested, versioned.
        │
        ▼
  CONTRIBUTION EVENT → scoring module → candidate's score
```

**This is the same shape as the CV scoring design you approved on 30 August.** The model reads;
code scores. The reasoning is in [`scoring-approach.md`](scoring-approach.md): a language model
is good at reading unstructured human input and placing it on a defined scale, and bad at being
a stable arithmetic engine. So we let it read, and keep the points in versioned code that can be
inspected, tested and changed deliberately.

**Interrupted sessions recover.** Answers upload per question against a manifest, so a dropped
connection mid-session does not lose answers already given. A lost session is a paid session, so
this matters more here than almost anywhere else in the product.

**Both stages sit behind interfaces** (`TranscriptionProvider`, `EvaluationProvider`). Changing
either model or vendor later is a new implementation of an interface, not a rewrite.

---

## 3. The models

| Stage | What we use |
|---|---|
| Transcription | **A dedicated speech-to-text service** — Indian English (`en-IN`) and Hindi (`hi-IN`). Language models do not do speech recognition; this is a genuinely separate service. We now recommend **Sarvam** over Amazon Transcribe on accuracy and cost — see [`voice-interview-costs-and-asr.md`](voice-interview-costs-and-asr.md). |
| Evaluation | **A model on AWS Bedrock — chosen by testing, not picked upfront.** |
| Scoring | **No model.** Ordinary Python: pure functions, versioned weights, unit-tested. |

**On the evaluation model.** Bedrock puts several providers behind one API, so we will build
against the interface first and then benchmark candidate models on a held-out set of real
transcribed answers — scored for rubric agreement, output validity, latency and cost per
session. We will pin whichever wins and record it. Committing to a specific model in this
document would be a guess made before we have the data to make it well; the architecture does
not depend on the answer.

We will run in the Mumbai region (`ap-south-1`). **Note a correction to an earlier draft of this
document:** running in Mumbai does *not* keep Claude inference inside India — Claude is served to
Indian customers through Bedrock's global cross-Region inference, so the request originates in
Mumbai but the inference may run in any commercial AWS region. Data at rest stays in Mumbai. If
in-India processing is a hard requirement, it selects the model rather than a setting. Costs, the
speech-to-text comparison and this residency point are set out in
[`voice-interview-costs-and-asr.md`](voice-interview-costs-and-asr.md).

Bedrock model access is granted per AWS account and per model, and is not instant — we will raise
those requests in the first week rather than on the day we need them.

Two properties we keep regardless of which model wins:

- **Every evaluation stores what produced it** — the pinned model identifier, the rubric version,
  a hash of the exact prompt, and the raw response verbatim. An interview scored in March can be
  re-derived in December, and we can show exactly what it came from.
- **The model returns bounded ratings, not points.** It cannot emit a score or a total without
  passing through code we wrote. That is what keeps a prompt change from silently re-pricing
  everybody's interview.

---

## 4. Bedrock or an API key?

**Bedrock. No API key needed from you.**

| | |
|---|---|
| Who operates it | AWS |
| Authentication | Your AWS IAM |
| Billing | Your AWS bill |
| Region | Mumbai (`ap-south-1`) |
| Model access | Requested per account and per model — not instant, so we start early |

---

## 5. Out of scope

- **No live telephony.** A real phone interview is a different project with a different estimate.
- **No accent or fluency scoring, deliberately.** Rating an Indian candidate's English by how
  close it sounds to another accent is both a bias risk and a legal one. We score what the
  candidate said, not how they sound saying it.
- **Evaluation quality is a first pass.** We ship transcription plus a working rubric. Tuning what
  scores well is calibration work that follows, and it needs your product judgment. Confirming the
  rubric dimensions — clarity, structure, relevance, confidence — is the one thing we need from
  you before we build evaluation.
