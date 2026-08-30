# `tests/invariants/`

One file per rule in `docs/plan.md` section 1. **Never delete one to make a
build pass.** These are the tests you show the client; they are documentation
as much as verification.

Each is written *before* the feature it guards, on the day that feature lands.

| # | Invariant | Lands | File |
|---|---|---|---|
| 5 | No age-gating | Day 1 | `test_invariant_05_no_age_gating.py` |
| 6 | No financial framing | Day 1 | `test_invariant_06_no_financial_framing.py` |
| 1 | Score reproducible, incl. add-ons and the extraction chain | Day 8 | _pending_ |
| 2 | Scale 700-990; base not floor; stored == displayed | Day 8 | _pending_ |
| 3 | Score not human-editable, directly or indirectly | Day 8 | _pending_ |
| 4' | Add-on contributions bounded and versioned | Day 8, re-verified Day 16 | _pending_ |
| 8 | No publish before KYB | Day 10 | _pending_ |
| 7 | Masked without an active access window; raw score never revealed | Day 14 | _pending_ |
| 7' | Every PII reveal audited, under blanket access | Day 14 | _pending_ |
| 9 | Consent and audit | Day 18 | _pending_ |

**Ten invariants, not nine.** 4' replaced the rescinded rule 4 and 7' was added
in v6 when blanket employer access destroyed the one-row-per-unlock audit trail.

A note on invariant 8: its test runs with `kyb.require_approval` **on**, even
though production defaults it off. A gate that is only ever exercised in the
configuration where it does nothing is not a tested gate.
