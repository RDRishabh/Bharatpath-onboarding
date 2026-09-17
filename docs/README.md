# BharatPath — documentation

Everything written about this build, and the client's own source documents.

## Start here

| Document | What it is |
|---|---|
| **[final-client-brief.md](final-client-brief.md)** | **The single document to send.** Everything outstanding as of 3 September 2026: the open questions, the assumptions we have taken on the client's behalf, and the resources with lead times longer than the build. Folds together `questions.txt`, `resources-needed.md` §1, and the assumptions from `plan.md` §8.0 and §13. |
| **[plan.md](plan.md)** | **The working document.** The 20-day backend build plan: the ten invariants and how code enforces each, the architecture, the data model, and a day-by-day schedule with weekly gates. Version 6.1. |
| **[backend-guide/](backend-guide/)** | **Learn the backend from zero.** A from-scratch walkthrough — what a backend even is, how this one is architected, and one plain-language doc per module. Being written incrementally. |
| [questions.txt](questions.txt) | **The ask.** Only what is still outstanding, in plain language, ready to send to the client. Nine items, A–I. |
| [answers-log.md](answers-log.md) | **The archive.** Every question ever put to the client, their answer verbatim, the date, and what we did about it. Nothing summarised away — where an answer was later contradicted, both versions are here. |
| [voice-interview-architecture.md](voice-interview-architecture.md) | **Sent to the client, 7 September 2026.** The mock-interview backend: pipeline, the model at each stage, and the platform answer — AWS Bedrock, on the client's own IAM, no API key to supply. The evaluation model is chosen by benchmarking on Bedrock rather than named upfront. |
| [voice-interview-costs-and-asr.md](voice-interview-costs-and-asr.md) | **Sent to the client, 7 September 2026.** Per-session costs for the mock interview, speech-to-text vendor comparison (Transcribe vs Sarvam vs others), which evaluation model industry practice points to, and Bedrock vs direct API key on price. Carries the correction that Claude on Bedrock in Mumbai routes inference globally, so the residency answer now selects the model. |
| [scoring-approach.md](scoring-approach.md) | How an AI-driven score is made reproducible. **Awaiting client approval — this blocks Day 8.** |
| [streaks.md](streaks.md) | **Built 2026-09-13.** Daily app-open streaks and engagement points: why they cannot be the 700–990 score, the rules, the API, how to change the numbers in `config_values`, and eight decisions (S1–S8) for the client to confirm. |
| [resources-needed.md](resources-needed.md) | Everything the build depends on but cannot produce itself: AWS, vendors, registrations, legal sign-offs, content. With owners and lead times. |
| [deployment-and-local-dev.md](deployment-and-local-dev.md) | **Read this before your first commit.** How the app runs locally and in AWS, what a container actually is, where configuration comes from in each environment, and how connections are made. Written as an Azure-to-AWS translation. |
| [how-it-all-connects.md](how-it-all-connects.md) | **For the frontend developer too.** How the four clients reach the API, why the frontend is not a container, CORS, auth flow, contract-first working, and what a typical day looks like. |

## Source documents

[`specs/`](specs/) holds the client's own documents. **These are the source of
truth**, and the build is graded against the SRS §2.25 acceptance criteria.

| File | What it is |
|---|---|
| `Product Requirements Document.pdf` | The product, the nine non-negotiable rules, the four surfaces, out-of-scope. |
| `BharatPath_SRS_...v3_Phone_Interview.docx.pdf` | 44 pages. Every user flow, screen, state machine, and ~55 acceptance criteria. |
| `BharatPath.pdf` | One-page outline. |
| `BharatPath_Build_Brief.docx` | Our pre-contract read of the scope. |
| `BharatPath_Build_Brief_new.docx` | Body text **byte-identical** to the above — every client update of 24 Aug arrived as a Word **comment**, not a tracked change. Worth knowing if you go looking for edits. |

[`archive/`](archive/) holds superseded versions of `plan.md` and
`questions.txt`, kept because the client reversed several decisions and the
history explains why the current design looks the way it does.

## ⚠️ The specs have not been amended

The client changed the product substantially across three rounds (24 and
27 August). **The PRD and SRS still describe the original design.** Several
things now being built directly contradict them:

- Paid add-ons now **do** move the score (reverses PRD rule 3) — *rescinded in writing* ✅
- Sign-up and payment gate everything (reverses SRS §2.25.1) — *rescinded in writing* ✅
- The score is **never explained** (contradicts PRD §4.2) — 🔴 **rescission still outstanding**
- Per-candidate unlock is **deleted** — employers pay per period and see the whole database. This voids **three SRS §2.25.2 acceptance criteria** — 🔴 **never asked for**
- Duplicate-CV detection dropped (contradicts PRD §7.2) — ⚠️ client to re-confirm

`plan.md` §13 tracks all of them and `questions.txt` §3H asks for the two
missing rescissions. Do not treat a contradiction between the code and the SRS
as a bug without checking `answers-log.md` first — it is usually a decision.

## The two things to raise with the client now

1. **🔴 Bulk extraction.** Auto-approved KYB plus whole-database access plus one
   monthly payment means anyone who can pay can obtain every candidate's name,
   phone and email — unverified, and those candidates paid to be there. View
   caps, rate limits and anomaly alerting are being built, but they are speed
   bumps, not a fix. Needs written acknowledgement. `questions.txt` §1A.
2. **🔴 Course content.** The platform sells a course that adds 30 points to a
   score, and nobody has said who produces it or **what counts as completing
   it** — that last one is a rule the backend has to encode. Not in any
   estimate given. `questions.txt` §3I1.
