# BharatPath — interview costs, ASR choice, and model selection

**Follow-up to the voice interview architecture note.** 7 September 2026.

Four answers up front, then the numbers behind them.

1. **Bedrock and a direct API key cost the same per token.** Bedrock is not a markup. The platform
   choice is about residency and operations, not price — and we still need no key from you.
2. **Transcription dominates the bill, not the language model.** On the default choice, speech-to-text
   is roughly three-quarters of the cost of a session. This is the opposite of what most people expect,
   and it is where the decision actually matters.
3. **Amazon Transcribe covers the Indic languages but is not the most accurate on them.** Sarvam is
   measurably better on Indian speech and roughly four times cheaper. We now recommend Sarvam for
   transcription and Bedrock for evaluation.
4. **IM Vani is not an option in the way it was suggested.** It is not a speech-to-text product — see §3.

**One correction to our last note.** We wrote that running on Bedrock in the Mumbai region keeps
processing inside India. That is not correct for Claude, and we would rather say so now than have you
rely on it. Details and what it changes are in §6.

---

## 1. What we are costing

Every figure below is for **one completed mock interview session**, on these assumptions. Change the
assumptions and the numbers scale linearly.

| Assumption | Value |
|---|---|
| Questions per session | 5 |
| Audio per answer | ~70 seconds |
| **Total audio per session** | **~6 minutes** |
| Transcript sent to the model | ~1,200 tokens |
| Rubric + prompt | ~2,800 tokens |
| Model output (ratings + reasoning) | ~2,000 tokens |
| Exchange rate used | ₹90 / USD |

Rates are list prices as published in September 2026. Volume tiers, batch discounts and prompt caching
all reduce these; none of them changes the ranking.

---

## 2. What a session costs

### Speech-to-text — the expensive half

| Provider | Rate | **Per session (6 min)** |
|---|---|---|
| Amazon Transcribe | $0.024/min | **₹13.0** |
| Deepgram Nova-3 (batch) | $0.0043/min | **₹2.3** |
| ElevenLabs Scribe v2 (batch) | $0.0037/min | **₹2.0** |
| **Sarvam (Saarika)** | **₹30/hour** | **₹3.0** |
| Sarvam with speaker diarization | ₹45/hour | ₹4.5 |

We do not need diarization — one speaker, one question at a time — so the ₹30/hour rate applies.

Amazon Transcribe is **four to six times more expensive than every alternative**, including the one that
is also more accurate on Indian languages. That is the single largest cost lever in this feature.

### Evaluation — the cheap half

| Model | Rate (input / output per 1M tokens) | **Per session** |
|---|---|---|
| Amazon Nova Lite | $0.06 / $0.24 | **₹0.06** |
| Amazon Nova Pro | $0.80 / $3.20 | **₹0.86** |
| Claude Haiku 4.5 | $1 / $5 | **₹1.26** |
| Claude Sonnet 4.6 | $3 / $15 | **₹3.78** |
| Claude Opus 4.6 | $5 / $25 | **₹6.30** |

### Put together

| Combination | Per session |
|---|---|
| Sarvam + Nova Pro | **₹3.9** |
| Sarvam + Haiku 4.5 | **₹4.3** |
| **Sarvam + Sonnet 4.6** — our recommendation | **₹6.8** |
| Amazon Transcribe + Sonnet 4.6 | ₹16.8 |
| Amazon Transcribe + Opus 4.6 | ₹19.3 |

Storage, compute and bandwidth add well under ₹1 per session — audio-only at 16 kHz is about 20 KB for a
30-second answer, which is why we made that choice.

**The commercial point.** Even the most expensive combination is under ₹20. Against any plausible price
for a mock interview, margin is comfortable in every row of that table. **So cost should not decide this
— accuracy and residency should.** We are giving you the numbers because you asked for them, and because
they let you sanity-check the price you set, not because they are close.

The one figure worth watching is the **top row against the bottom**: a careless default costs about ₹19
a session and a considered one about ₹7. At 10,000 sessions that is a ₹1.2 lakh difference for the same
product, which is worth one afternoon of testing.

---

## 3. Indic support — the real answer

### Amazon Transcribe covers the languages, with one caveat that does not affect us

Transcribe supports Hindi, Bengali, Gujarati, Kannada, Malayalam, Marathi, Punjabi, Tamil and Telugu,
plus Indian English (`en-IN`).

Most of those are **batch-only** — they work for recorded audio but not live streaming. **This costs us
nothing**, because you decided the interview is recorded rather than a live call. Had you chosen live
telephony, most of that list would have been unavailable to us. It is a good example of that decision
paying off somewhere nobody planned for.

### But coverage is not accuracy

The largest independent benchmark of Indian speech recognition published this year tested fourteen
systems, Amazon Transcribe among them, across fifteen Indian languages. Its findings matter to us:

- **Sarvam had the lowest error rate in 13 of the 15 languages.** It is built for Indian speech, Indian
  accents, telephony-quality audio and Hinglish code-mixing — which is exactly what a student recording
  an interview answer on a cheap Android phone produces.
- **Most systems exceeded 20% word error rate on most Indian languages** — the threshold generally
  treated as the limit of practical usability.
- **Hindi and Indian English are genuinely solved** — the best systems reach 5–6% error.
- **Malayalam and Telugu are not** — 18–27% error even for the best performers.
- **Regional dialects are worse still** — Bhojpuri and Maithili sit above 20% for everyone.

### IM Vani is not a speech-to-text vendor

IM Vani is IndiaMART's agentic voice system, built with SquadStack, which runs their buyer–seller sales
calls autonomously. It is an internal product for live outbound calling, not an ASR API a third party
can buy and point at recorded audio. There is nothing to procure and nothing to compare on price. It is
also solving the opposite problem to ours — live conversation, which you have ruled out of scope.

If the interest was really "should we use an Indian speech vendor", the answer is yes, and that vendor
is Sarvam.

### What this means for your language plan — please read this one

Your documents promise the app in English, Hindi and six to eight Indian languages. **We recommend you
separate the language the app is in from the language an interview may be taken in.**

- **The app UI** in all eight. That is translation work, and it is unaffected by any of this.
- **Scored interviews** at launch in **Indian English and Hindi only**, adding languages as we verify
  the error rate is low enough to score against.

The reason is not cost or effort. It is that a 25% word error rate means one word in four is transcribed
wrongly, and we would then be **awarding points off that transcript**. A Malayalam-speaking candidate
would score worse than an equivalent Hindi-speaking one because of the transcription, not because of the
answer. That is a bias problem in a product that already carries regulatory attention for scoring people,
and it is the same reason we are not scoring accent or fluency.

Offering the interview in a language we cannot yet score fairly is worse than not offering it in that
language yet.

---

## 4. Which evaluation model, based on industry practice

You asked what is actually used, rather than waiting on our testing. Fairly:

**For rubric-based grading at volume, the industry standard is a mid-tier model, not a frontier one.**
Reading a short transcript and placing it on a defined scale is not a frontier-difficulty task. The
frontier models earn their price on long-horizon reasoning and code, neither of which is what we are
doing. Spending top-tier money on every session is a common and expensive mistake.

**What we expect to land on, and will confirm by testing:**

| Role | Model | Why |
|---|---|---|
| **Per-session grading** | **Claude Sonnet 4.6** (Haiku 4.5 if it holds up) | The usual production choice for structured grading. Handles messy spoken transcripts, false starts and code-switching, and reliably returns schema-valid JSON. |
| **Building the calibration set** | Claude Opus 4.6 | Run once, offline, over a sample. Grades the reference answers we then measure the cheap model against. Not in the per-session path, so its price does not scale. |
| **Cost floor to beat** | Amazon Nova Pro | Materially cheaper. If it matches on rubric agreement it wins, and we would be wrong not to test it. |

This two-model pattern — an expensive model used once to define what "correct" looks like, a cheap one
used in production and measured against it — is standard practice, and it is what keeps the running cost
where the table in §2 says it will be.

**We would still like to test before committing.** The benchmark that settles it is rubric agreement
with a human on real Indian student answers, and we do not have that corpus yet. It is the same corpus
we need for CV scoring calibration, and the same working session — worth booking once for both.

---

## 5. Bedrock versus a direct API key, on cost

**They are the same price.** Anthropic's list rates and Bedrock's rates for the same Claude model match —
Sonnet 4.6 is $3/$15 per million tokens on both, Haiku 4.5 is $1/$5 on both. Bedrock is not a reseller
margin on top.

What differs is everything except the rate:

| | Bedrock | Direct API key |
|---|---|---|
| Per-token price | Same | Same |
| Who you pay | Your existing AWS bill | A separate vendor invoice |
| Credentials | Your AWS IAM | A key someone must hold and rotate |
| Choice of provider | Several, behind one API | One |
| Volume discounts | Batch −50%, prompt caching up to −90% | Comparable |
| Model access | Requested per account and per model, not instant | Immediate |
| Newest models | Arrive on a lag | Day one |

**We recommend Bedrock,** for three reasons that are not price: it keeps everything on credentials you
already control, it lets us test different providers behind one integration without a second commercial
relationship, and there is no API key for anyone to leak. The lag on newest models does not affect us —
we are not using a frontier model in the request path.

**Two things to start now,** both slower than they sound:

- **Bedrock model access is granted per AWS account and per model,** and is not instant. That request
  should go in this week, for every model we intend to test, not only the one we expect to win.
- **Sarvam is a commercial signup** with its own contract. Worth starting in parallel, because if the
  residency answer in §6 comes back restrictive, Sarvam moves from "cheaper and better" to "the only one
  that works".

---

## 6. The correction, and why it matters here

In our last note we said running in the Mumbai region keeps processing in India. **For Claude on Bedrock,
that is wrong.**

Claude models are offered to Indian customers through Bedrock's **global cross-Region inference**. The
request originates in Mumbai, but AWS may route the inference itself to any commercial AWS region
worldwide to absorb demand. Data *at rest* — your S3 audio, your logs, your database — stays in Mumbai.
The transcript being evaluated does not necessarily stay in India while it is being evaluated, and
nothing in our code would tell us when it left.

There is currently **no India-only inference profile for Claude**. AWS does offer in-country profiles
that pin inference to Mumbai and Hyderabad, but at present those cover OpenAI's models on Bedrock, not
Anthropic's.

**So this is the same question your counsel already has** — §4J of our outstanding-items note, "can
candidate data be processed outside India" — except the answer now selects the model, not just a setting:

- **If processing outside India is acceptable:** Claude on Bedrock via the global profile. Our
  recommendation, and the table in §2 stands as written.
- **If it is a hard legal line:** the evaluation model must be one with an in-country Bedrock profile, or
  an Indian provider. Transcription would go to Sarvam, an Indian company processing in India, which we
  are recommending anyway on accuracy and cost.

**Interview audio raises this more sharply than CVs do.** A CV is text the candidate wrote and chose to
share. An interview recording is that person's voice, which is closer to biometric data and harder to
argue was incidental. If residency matters anywhere in this product, it matters here first.

We are building both stages behind interfaces (`TranscriptionProvider`, `EvaluationProvider`), so this
answer changes an implementation rather than the design. But it is cheap to answer now and expensive to
answer after we have calibrated a rubric against one specific model.

---

## 7. In one paragraph

Use Bedrock — same token price as a direct key, on your own IAM, no key to hold. Use **Sarvam rather than
Amazon Transcribe for speech-to-text**: about four times cheaper and measurably more accurate on Indian
speech, which is the largest single cost and quality lever in this feature. Expect a mid-tier model such
as Claude Sonnet 4.6 for grading, confirmed by testing rather than assumed, with a frontier model used
once offline to build the calibration set. **Budget roughly ₹7 per completed session**, all in. Restrict
scored interviews to English and Hindi at launch even though the app ships in eight languages. And please
get us the residency answer, because it now decides which model we can use at all.

---

### What we need from you

| What | Why | When |
|---|---|---|
| **The residency answer** (already with counsel) | Now selects the evaluation model, not just a config setting | Before we build evaluation |
| **Approval to raise Bedrock model access requests** | Granted per account and per model, and not instant | This week |
| **A decision on interview languages at launch** | We recommend English + Hindi only for scored interviews; the app UI is unaffected | Before we build evaluation |
| **The calibration corpus** — real student answers with a rough sense of what each should score | Decides the model by measurement instead of opinion. Same session as the CV calibration | Before we build evaluation |
| **The interview price** | To check margin against the ~₹7 figure above | Before launch |

---

### Sources for the figures above

- Amazon Transcribe pricing — [aws.amazon.com/transcribe/pricing](https://aws.amazon.com/transcribe/pricing/)
- Sarvam AI pricing — [docs.sarvam.ai/api/pricing](https://docs.sarvam.ai/api/pricing)
- Amazon Transcribe supported languages — [docs.aws.amazon.com](https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html)
- Claude in India on Bedrock, global cross-Region inference — [aws.amazon.com/blogs/machine-learning](https://aws.amazon.com/blogs/machine-learning/access-anthropic-claude-models-in-india-on-amazon-bedrock-with-global-cross-region-inference/)
- In-country inferencing in India on Bedrock — [aws.amazon.com/blogs/machine-learning](https://aws.amazon.com/blogs/machine-learning/introducing-openai-models-on-amazon-bedrock-for-in-country-inferencing-in-india/)
- Indian ASR benchmark ("Voice of India") — [arxiv.org/html/2604.19151v2](https://arxiv.org/html/2604.19151v2)
