# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-08-11
**Phases:** 9 | **Plans:** 107 | **Sessions:** 32+ logged | **Commits:** 755 | **Days:** 69

### What Was Built

- A two-sided fitness-space marketplace with the full transaction closed end to end: search → real
  availability → hold → pay → confirm → manage → cancel/refund → host payout.
- **Two occupancy modes on one booking rail.** Exclusive listings are protected by a Postgres GiST
  `EXCLUDE` constraint; open-capacity (drop-in) listings by a per-`(listing, date)` admissions counter
  claimed under `pg_advisory_xact_lock`. Both proven by genuine multi-connection races, not by mocks.
- **Payments where the webhook is the only authority.** PayMongo hosted checkout over cards/GCash/
  Maya/QR Ph, a host-side commission, and a hold-until-session `inhouse` transfer fired T+24h and
  claimed at-most-once through a ledger row.
- Two booking-mode lifecycles (instant-book and no-charge request-to-book with pay-on-approval),
  bookings management on both sides with a tiered refund ladder, a durable Inngest-backed notification
  layer, group bookings with account-less RSVP, and 26 migrations through `0025`.

### What Worked

- **Pushing correctness into the database instead of the application.** The single highest-leverage
  decision of the milestone. Double-booking was never an application concern to get wrong, and the
  ordering rule — prove the guarantee in Phase 3, *before* money exists in Phase 5 — meant the payment
  phases never had to debug availability at the same time as money.
- **Mutation testing as the default, not the exception.** Nearly every plan applied a deliberate
  mutation, recorded the verbatim RED output, and restored — with `git diff --exit-code src/` as the
  proof it was restored. This repeatedly caught tests that would have passed against broken code, most
  sharply in `260811-fh6`, where the plan's *own* prescribed mutation came back all-green and had to be
  reported as observed rather than as predicted.
- **Confirm-then-fix on reported defects.** Phase 9's gap round required each plan to reproduce the
  reported bug against unchanged `src/` before writing a fix, with an explicit "not reproduced → keep
  the test, change nothing" branch. A fix for a defect that does not exist is worse than doing nothing.
- **Recording findings verbatim instead of smoothing them.** The record repeatedly contains "this did
  not happen the way the plan predicted" — and those entries are where the real information is.

### What Was Inefficient

- **`/gsd-code-review 9` ran after the phase looked finished** — after 1035 green tests, a 21/21
  browser proof, and a 9/9 human UAT — and found **6 blockers**, including one where an operating-hours
  edit could re-key the admissions counter and make up to 2× the cap sellable. That is nine
  gap-closure plans that a review run earlier would have folded into the phase.
- **Artifact state drifted from reality, repeatedly, in one direction: docs said "open" long after code
  said "closed".** The milestone audit had to correct five Phase-5 WARNINGs, Phase-4 deferrals, and a
  Phase-7 email bug that were all already fixed in source. Two blockers in `STATE.md` were still marked
  OPEN at milestone close although both had been closed weeks earlier. Reporting closed work as debt is
  as wrong as the reverse.
- **Phase 2 shipped without ever running its verification gate**, and nothing noticed until the
  milestone audit — LIST-01..06 + PAY-04 appeared in no VERIFICATION.md anywhere and scored as orphaned.
- **The test harness hid a broken database.** `tests/helpers/db.ts` replays migrations into isolated
  per-worker schemas, so a local `public` schema three migrations behind was invisible to the entire
  suite — Phase 6 verified green against a database that never had its own constraint widening applied.
  Related: the suite wrote into the dev database until `260810-km4` pointed it at `fitout_test`.
- **`gsd-sdk` v1.42.3 silently no-op'd throughout.** String-arg handlers (`record-metric`,
  `add-decision`, `record-session`) did nothing for entire phases, and at this milestone close
  `milestone.complete` actively corrupted `STATE.md` (restored a stale `stopped_at`, `total_phases: 11`,
  `completed_plans: 108`, `percent: 82`) and dumped ~30 raw per-plan one-liners into `MILESTONES.md`.
  Every one of those fields was written by hand. **Verify SDK writes; do not trust them.**

### Patterns Established

- **The database is the authority; the application re-states it.** Exclusion constraint, advisory-lock
  counter, `SELECT … FOR UPDATE` seat claim, and every state flip as an atomic guarded `UPDATE …
  WHERE status = ? RETURNING id` — where 0 rows is a graceful refusal, never a silent success.
- **The DB clock is the only clock.** SQL `now()` for expiry and SLA decisions; never a JS clock read,
  never the client countdown. Grep gates enforce it.
- **All times `timestamptz` UTC, converted to venue-local only at the edges** via `@date-fns/tz`.
- **Webhooks are the source of truth for money; the browser redirect never is.** Signature-verified,
  idempotent, single-writer.
- **A duplicated security check gets its own independent test.** An untested duplicate of a guard reads
  as covered while protecting nothing (both hold paths' hours `EXISTS`, pinned by a `grep -c` gate).
- **Prove an absence by scanning the rendered document for the forbidden *shape*,** not with
  `not.toBeVisible()` on a guessed locator — and seed a control of the *other* mode, because "X is
  absent" is not a finding; "X is absent HERE and present THERE" is.

### Key Lessons

1. **Independent proof layers can share one blind spot.** CR-01 (a same-day drop-in pass holdable but
   never payable) survived 1035 passing tests, a 21/21 browser proof, *and* a 9/9 human UAT — because
   the e2e spec only booked ≥3 days out and the human walkthrough happened at 01:31, before the venue
   opened. Count blind spots, not layers; make time-dependent fixtures deterministic at any run hour.
2. **A third party's documented guarantee is a hypothesis until you probe it.** PayMongo does not
   honour `Idempotency-Key` on `/v1/checkout_sessions` — identical key and body minted two payable
   sessions. Three shipped comments asserted the opposite, and the cost was a real double charge
   (₱1,470 collected against a ₱735 booking) on QR Ph, a rail with **no refund API at all**.
3. **Some bugs are only reachable by a human against real infrastructure.** The webhook signature
   parser rejected *every* real PayMongo signature (test and live) because it required both `te` and
   `li`; only a live tunnel + real test-mode payment surfaced it. It was latent behind mocks that
   supplied both.
4. **The verification artifact is not the verification.** Phase 2's gate was never run and nothing
   caught it for two months; two Nyquist files were pre-execution drafts never refreshed. Audit the
   gates themselves, not just their outputs.
5. **Distinguish "blocked on someone else" from "unfinished".** The five deferred items that survived
   this milestone are sales-gated betas, absent credentials, and one permanent payment-rail limitation.
   Naming them as external — and stating plainly that *real host payouts have never moved real money* —
   is more useful than a status that implies work remains to be scheduled.

### Cost Observations

- Model mix: not tracked this milestone (`gsd-sdk record-metric` no-op'd for most of it; the velocity
  table in `STATE.md` is partial for the same reason). **Worth fixing before v1.1** — there is no
  reliable per-plan cost or duration data for a 107-plan milestone.
- Sessions: 32+ logged in `STATE.md` § Session Continuity.
- Notable: the expensive work was not the feature code. It was the gap-closure and reconciliation tail —
  9 gap plans in Phase 9 plus 24 quick tasks after the phases were "done", a large share of which were
  correcting the record rather than the product.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 32+ | 9 | Baseline. Mutation-measured tests and confirm-then-fix became standard mid-milestone; code review moved from post-phase afterthought to a gate that must run *before* a phase is called complete. |

### Cumulative Quality

| Milestone | Tests | Test files | Migrations | tsc |
|-----------|-------|-----------|------------|-----|
| v1.0 | 1087 passing / 4 skipped / 0 failing | 135 | 26 (through `0025`) | exit 0 |

### Top Lessons (Verified Across Milestones)

*One milestone so far — these are v1.0's candidates, to be confirmed or refuted by v1.1.*

1. Push correctness into the database; an application-level check on a money path is a race waiting to happen.
2. Independent-looking proof layers can share a blind spot — count blind spots, not layers.
3. Verify what the tooling writes. Both the SDK and third-party providers silently did the wrong thing.
