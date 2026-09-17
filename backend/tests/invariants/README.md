# `tests/invariants/`

One file per rule in `docs/plan.md` section 1. **Never delete one to make a
build pass.** These are the tests you show the client; they are documentation
as much as verification.

Each is written *before* the feature it guards, on the day that feature lands.

| # | Invariant | Lands | File |
|---|---|---|---|
| 5 | No age-gating | Day 1 | `test_invariant_05_no_age_gating.py` |
| 6 | No financial framing | Day 1 | `test_invariant_06_no_financial_framing.py` |
| 1 | Score reproducible, incl. add-ons and the extraction chain | Day 8 | `test_invariant_01_02_03_scoring.py` |
| 2 | Scale 700-990; base not floor; stored == displayed | Day 8 | `test_invariant_01_02_03_scoring.py` |
| 3 | Score not human-editable, directly or indirectly | Day 8 | `../integration/test_rls_and_grants.py` (the grant itself) |
| 4' | Add-on contributions bounded and versioned | Day 8, re-verified Day 16 | `test_invariant_01_02_03_scoring.py` |
| 8 | No publish before KYB | Day 10 | `../integration/test_jobs.py` (past the service, into the trigger) |
| 7 | Masked without an access window; raw score never revealed | Day 14 | `test_invariant_07_access_window.py`, `test_masked_candidate.py` |
| 7' | Every PII reveal audited, under blanket access | Day 14 | `test_invariant_07_prime_reveal_audit.py` |
| 9 | Consent and audit | Day 18 | `test_invariant_09_consent.py` |
| 7' | Console reads audited first; no outsider reaches `/admin` | Day 19 | `test_admin_console.py` |

**Two of them are not in this directory**, and that is deliberate: invariants
3 and 8 are proved by going *round* the service and into the database's own
grants and triggers, which makes them integration tests by construction.
`test_all_ten_invariants_are_covered.py` names every file above, so one that
is renamed away or emptied fails the build — the failure mode this table has
on its own is looking green while a file it names no longer runs.

**Day 20 added `test_erasure_plan.py`**: every table in the live schema is
classified in `privacy.domain.ERASURE_PLAN`, and the erasure SQL deletes
exactly what the plan says it does and never touches the financial and audit
carve-out. A table added without a decision fails the build.

**Ten invariants, not nine.** 4' replaced the rescinded rule 4 and 7' was added
in v6 when blanket employer access destroyed the one-row-per-unlock audit trail.

A note on invariant 8: its test runs with `kyb.require_approval` **on**, even
though production defaults it off. A gate that is only ever exercised in the
configuration where it does nothing is not a tested gate.
