# Daily streaks and engagement points

**Status:** built 2026-09-13 on `feat/day6-resume-intake`. Not part of the
twenty-day schedule. Module `backend/app/modules/engagement/`.

**Audience:** backend and frontend developers, and whoever takes §7 to the
client.

---

## 1. What was asked

> Maintain the user's application streak, similar to LeetCode.
>
> - The streak continues when the user opens the application on consecutive days.
> - If the user misses a day, the streak breaks and **10 points are deducted**.
> - Award milestone points at 30 days → +10, 90 days → +15, 365 days → +20.
> - Maintain the current streak, longest streak, last active date, and milestone rewards.
> - Expose the streak and points through the API for the frontend.
> - Point values must be configurable without modifying the core streak logic.

All six are built. §2 covers the one thing the request leaves open, and it
matters.

## 2. The conflict: these points cannot be the candidate score

The request says "points" but not *which* points. This product has exactly one
number called points, the 700–990 candidate score. **Applied to that score, the
request breaks four of the plan's invariants at once** (`plan.md` §1):

| Invariant | How a streak on the score would break it |
|---|---|
| **1. Reproducible** | `replay(score_id)` rebuilds a score from the stored resume extraction and add-on events. "Opened the app on 14 March" is not a stored input, so a score carrying streak points would stop reproducing. |
| **2. Scale 700–990** | 700 is the base and the minimum. A −10 for a missed day takes a fresh 700 to 690. Milestones take a 990 to 1035. The CHECK constraints would reject both writes. |
| **3. Not editable, directly or indirectly** | Opening an app (or not) would move the number employers filter on. That is indirect editing of the score by behaviour that has nothing to do with the CV. |
| **4′. Add-ons bounded, typed, versioned** | 990 is exact arithmetic, 700 + 200 + 30 + 60. There is no room left for another contributor. |

There is a product reason too. The score claims to measure employability, and
employers use it to rank people. A streak measures how often someone opens an
app. Mixing the two would rank a candidate lower for being ill, travelling,
offline, or busy at a new job.

**Resolution, as built:** engagement points are a **separate balance** with
their own table and ledger. They are never added to, subtracted from, or shown
as part of the score. Four mechanisms enforce this:

- **import-linter** `engagement-and-scoring-are-independent`: an independence
  contract, so neither module can import the other, directly or through a
  third module.
- **import-linter** `engagement-is-not-an-employer-signal`: employer, jobs,
  applications, discovery, college and analytics may not import `engagement`.
- **`tests/invariants/test_streak_never_moves_the_score.py`**:
  - both contracts still exist;
  - no `engagement.*` event routes to a scoring task;
  - no engagement field is named like the score;
  - no other module serves streak fields.
- **`test_streak_points_never_write_a_score`**: a 30-day run plus a break
  writes zero `scores` rows.

If the client really does want the score to move, that is a change to
invariants 1, 2 and 4′ and to the 990 arithmetic they set on 2026-08-27. It is
not something a config value can do. Raise it as S1 in §7.

## 3. How it works

**What counts as "opening the app":** the client calls
`POST /api/v1/candidate/streak/me/check-in` on launch and on return to the
foreground. Call it every time. The first call on a calendar day counts, and
later calls that day change nothing.

**Which day:** the server's clock in **India Standard Time**, so the day turns
over at 00:00 IST. The request carries no date. If it did, anyone could keep a
streak alive by sending yesterday's date.

On the first check-in of a day, with *last* = the last counted day:

| Situation | Streak | Points |
|---|---|---|
| Never opened before | starts at 1 | none, because there was nothing to break |
| *last* = yesterday | +1 | milestone award if the new length is a milestone |
| *last* = 2+ days ago, and a streak existed | breaks, restarts at 1 | **−10 once**, however many days were missed |
| *last* = today, or later (clock correction) | unchanged | none |

- **Milestones** are awarded on the day the streak *reaches* 30, 90 or 365.
  Each can be earned once per run. After a break, the next 30-day run earns
  +10 again. Nothing is awarded past the last milestone.
- **Longest streak** is kept across breaks.
- **The balance never goes below 0.** A deduction takes only what is there.
  The ledger stores both `points` (applied) and `requested_points` (what the
  rules asked for), so any clipping stays visible.
- **A break shows immediately; the deduction is applied at the next
  check-in.** `GET /me` for someone last active three days ago returns
  `status: BROKEN` and `current_streak: 0` straight away, and the −10 is
  written when they next open the app. Nothing runs overnight. A candidate who
  never comes back is never deducted, but they never see the balance either.

## 4. API

All routes require a candidate token (`require_role(CANDIDATE)`); employer and
college users get 403. None are behind the subscription gate (see S4).

| Method | Path | Does |
|---|---|---|
| `GET` | `/api/v1/candidate/streak/me` | Current state. Read-only, never counts today. |
| `POST` | `/api/v1/candidate/streak/me/check-in` | Count today. Idempotent by day. |
| `GET` | `/api/v1/candidate/streak/me/points?limit=50` | Points history, newest first (1–200). |

`POST /me/check-in` response:

```json
{
  "counted": true,
  "streak": {
    "status": "ACTIVE_TODAY",
    "current_streak": 30,
    "longest_streak": 30,
    "last_active_on": "2026-09-13",
    "today": "2026-09-13",
    "points_balance": 10,
    "next_milestone": {"days": 90, "points": 15},
    "milestones": [{"days": 30, "points": 10}, {"days": 90, "points": 15}, {"days": 365, "points": 20}],
    "break_penalty": 10,
    "rules_version": "default-v1-2026-09-13"
  },
  "changes": [
    {"kind": "MILESTONE_AWARD", "points": 10, "balance_after": 10,
     "streak_length": 30, "milestone_days": 30, "activity_on": "2026-09-13", "created_at": null}
  ]
}
```

`status` is one of:

| Status | Meaning | Suggested UI |
|---|---|---|
| `NONE` | Never opened | — |
| `ACTIVE_TODAY` | Today is counted | — |
| `AT_RISK` | Last counted yesterday; opening today continues the streak | a gentle prompt |
| `BROKEN` | A day was missed | the deduction appears after the next check-in |

`changes[].kind` is `MILESTONE_AWARD` or `STREAK_BREAK_PENALTY`. On a
deduction `points` is negative and `milestone_days` is null.

**For the frontend:**
- Put `points_balance` somewhere visually separate from the 700–990 score.
- Never label it as score, and never add the two together.
- The design-system rule still applies: no gauges or dials.

## 5. Changing the numbers

The numbers live in `config_values` under the key `engagement.streak_rules`.
The highest `version` whose `effective_from` has passed wins. With no row, the
code defaults apply (`DEFAULT_RULES` in `domain.py`: 10, and 30/90/365 →
10/15/20).

```sql
INSERT INTO config_values (key, value, version, effective_from, note)
VALUES (
  'engagement.streak_rules',
  '{"break_penalty": 5,
    "milestones": [{"days": 7, "points": 2}, {"days": 30, "points": 10},
                   {"days": 90, "points": 15}, {"days": 365, "points": 20}]}',
  2,
  '2026-10-01 00:00+05:30',
  'Client asked for a 7-day milestone and a softer penalty'
);
```

- **Either key may be omitted** to keep the code default for it. An empty
  `milestones` list means no milestones.
- **Validation is strict and fails loudly.** Any of these makes check-in return
  500 `streak_rules_invalid`, rather than quietly running on the old values
  while the row looks applied:
  - an unknown key, such as a misspelt `break_penality`;
  - a non-integer value, or a boolean;
  - a negative value, or one above 1000;
  - a milestone listed twice.
- **Every ledger row stores `rules_version`** (`config-v2`, or
  `default-v1-2026-09-13`), so a balance can always be explained by the rules
  in force when each change happened.
- **Changing *how* streaks work is not a config change.** That covers a grace
  day, per-day deductions, or a different day boundary. It is a code change
  and a new default version.

## 6. Data and guarantees

| Table | Holds | Write rules |
|---|---|---|
| `user_streaks` | One row per candidate: current, longest, `last_active_on`, `streak_started_on`, `points_balance` | Updated in place under `SELECT … FOR UPDATE`. CHECKs: all counts ≥ 0, longest ≥ current, balance ≥ 0 |
| `streak_point_events` | Every change to a balance | **Append-only.** The app role has no UPDATE or DELETE (tested). Unique per milestone per run, and per break per day |

- **Concurrency.** A phone and a laptop checking in at the same moment count
  once and deduct once. The row lock does this, and both cases are tested.
- **Not tenant-scoped.** Candidates have no tenant. Every query filters on the
  token's `user_id`, and the tables cascade on user deletion, like `scores`.
- **Outbox events** (no consumer yet):
  - `engagement.streak_broken` and `engagement.milestone_reached`, meant for
    `notifications` (Day 19);
  - an at-risk nudge must respect the nudge cadence cap in `plan.md` §8;
  - no scoring consumer may subscribe, which the invariant test enforces.

**Tests:**

| File | Covers |
|---|---|
| `tests/unit/test_streak_domain.py` | Pure rules, config parsing, the IST day boundary, and a 25-seed property test: the balance is never negative and the ledger reproduces it |
| `tests/integration/test_streak.py` | Real Postgres via the app role: multi-day flows, clipping, config override, `effective_from`, bad config, concurrency, grants, and the HTTP flow |
| `tests/invariants/test_streak_never_moves_the_score.py` | §2 |

## 7. Decisions we took that the client should confirm

Each is built as described and cheap to change, except S1.

| # | Question | What is built | Why |
|---|---|---|---|
| **S1** | **Are streak points separate from the score?** | Separate balance | §2. The alternative breaks invariants 1, 2, 3 and 4′ and the 990 arithmetic. **Also ask what the points are *for*.** Nothing spends them yet. A balance with no use is a number candidates will ask about. |
| S2 | Missing several days: −10 once, or −10 per missed day? | Once per break | "If the user misses a day, the streak breaks": one break, one deduction. Per-day deductions would empty a balance during a week offline. |
| S3 | Can the balance go negative? | No, floored at 0 | A negative balance is a debt owed for not opening an app. |
| S4 | Should the streak sit behind the subscription (R13 pay-first)? | No | Behind the paywall, a lapsed subscriber could not check in and would lose points for not paying rather than for not opening the app. |
| S5 | Milestones: once per streak run, or once per lifetime? Anything after 365? | Per run; nothing after 365 | Per run pairs naturally with the break deduction. Further milestones are a config row. |
| S6 | What is "a day", and what is "opening the app"? | IST calendar day; a check-in call on launch or foreground | One national timezone. A background refresh should not count. |
| S7 | Candidates only, or employer and college users too? | Candidates only | A streak for a recruiter's login is not a feature anyone asked for. |
| S8 | A grace day or "streak freeze", as LeetCode sells? | None | Not asked for. It would be a code change, not config. |

**A product risk worth one sentence to the client:**
- The people most likely to break a streak are candidates who have just been
  hired, since they stop needing the app, and candidates without reliable
  phone or data access.
- A deduction lands on both groups.
- Keeping these points away from the score and away from employers (§2) limits
  the harm to a number on the candidate's own screen.
