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

## Milestone: v1.1 — Front-End Polish & Placeholder Design System

**Shipped:** 2026-08-31
**Phases:** 11 (10–17.1) | **Plans:** 149 | **Tasks:** 372 | **Commits:** 1,076 over 20 days

### What Was Built

One token contract between what a component asks for and what colour and size it gets, applied across
all nine v1.0 surfaces. Two visually distinct themes (court, grove) shipped in the same phase as each
other, as the enforcement test rather than as a feature. A build-blocking leak gate. The pattern layer
— three card patterns, one overlay primitive, one closed four-tone status vocabulary — then every
shipped surface re-cut through it: booker path, confirmation and receipt, host tooling, auth and the
23-message email shell. Two net-new capabilities in their own containers (D-136): image crop with
upload hardening, and availability copy-to-all.

### What Worked

- **Fixing the inherited defects in the foundation phase, before any baseline existed.** Research
  measured that several gates this milestone declared *already failed* on the shipped tree. Sequencing
  those fixes first meant no visual baseline was ever captured against a broken value — the
  alternative would have been fifty surfaces built on a coral CTA at 3.60:1.
- **Shipping the second theme with the first.** D-133 treated grove as D-128's enforcement test, not a
  feature. It is what made "zero component edits to re-skin" checkable at all rather than aspirational.
- **Watched-red as the standard of evidence.** The leak gate is trusted because a raw hex was put in
  `badge.tsx` and the build was watched failing. The double-booking guarantee was re-proved by removing
  `booking_no_overlap` and capturing two racing inserts both succeeding. This habit repeatedly caught
  gates that were green for the wrong reason — including an axe-sweep row green for years while
  auditing a document nobody chose.
- **Deferring Search wholesale, cleanly (D-141).** Because D-136 had kept SEARCH/MAP out of the polish
  phases from the start, removing them cost nothing and broke no gate. The invariant paid for itself at
  exactly the moment it was tested.

### What Was Inefficient

- **Requirement bookkeeping drifted from the tree, repeatedly and in both directions.** Four
  requirements were satisfied but never ticked; WR-05 was reported open for six days after being fixed.
  In both cases a verification pass *re-confirmed* the stale claim rather than re-reading the code. The
  milestone audit read far worse than the milestone actually was.
- **A requirement handed between two phases was executed by neither.** D-78 moved TRUST-02/TRUST-03's
  email halves from Phase 13 to Phase 15. Phase 13 recorded the handoff in five artifacts. Phase 15
  then rewrote the exact function that needed both changes — for a different requirement — and was
  never assigned either ID. No plan owned it, so no plan did it, and every per-phase gate stayed green.
- **Phase 17 filed 25 escalate-class findings for PM review and 22 were never reviewed.** Filing is not
  triage. A ledger nobody reads is a ledger that grows.
- **The gates the milestone declared are mostly not run by CI (D-24).** Seven Playwright specs — the
  a11y sweep, the keyboard walk, the one-tree check, the 320px overflow pass — run only by hand. That
  is the concrete reason the GATE-02 gap survived four review passes.

### Patterns Established

- **Two themes as an enforcement mechanism.** A second theme that must re-skin with zero component
  edits is a cheaper, harder-to-fool test for hardcoded values than any lint rule.
- **Pre-composed display strings on an async payload.** D-RPT-01: a job payload carries finished
  sentences, never raw dates, ids or money internals — so the composition has one owner and the
  consumer cannot re-derive it differently.
- **Amend the requirement, do not fudge the gate.** DS-11's two surfaces were *proven* structurally
  unable to adopt (an HTML parser reported six anchors and a zero). The resolution was to amend the
  requirement text and name the exceptions — the D-26 precedent — not to weaken the test.
- **Pin the fix, not just the bug.** WR-05 regressed into a six-day false report precisely because
  nothing asserted the fixed state.

### Key Lessons

1. **A handoff recorded on both sides is still not owned by anyone.** Cross-phase deferrals need an
   assignee in the receiving phase's plan frontmatter, or they fall through and every gate stays green.
2. **Verification must re-read the tree, not re-confirm the previous report.** Two separate stale
   claims survived because a pass restated an earlier finding instead of re-measuring it.
3. **A gate that nothing runs is not a gate.** Correctness of the assertion and execution of the
   assertion are independent properties, and only one of them was being tracked.
4. **Audit before you close, and expect it to cut both ways.** The v1.1 audit removed four false gaps
   and found one real one. Skipping it would have shipped a milestone that both overstated and
   understated itself.

### Cost Observations

- Model mix: opus for planning and execution, sonnet for checking and verification (`quality` profile).
- 149 plans across 11 phases — ~13.5 plans/phase, up from v1.0's ~11.9, with Phase 11 (22) and Phase
  10 (17) carrying the foundation load.
- Two phases were demoted or deferred after measurement rather than being built: D-142 demoted
  availability copy-to-all to a quick task once Phase 14 had already shipped its infrastructure, and
  D-141 deferred Search wholesale after its spikes ran. Spiking before planning saved two phase cycles.

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 32+ | 9 | Baseline. Mutation-measured tests and confirm-then-fix became standard mid-milestone; code review moved from post-phase afterthought to a gate that must run *before* a phase is called complete. |
| v1.1 | 40+ | 11 | Spike-before-plan became standard and retired two phases outright (D-141, D-142). Design gates moved into `npm run build`. The milestone audit was run as a real gate and changed the outcome — it removed four false gaps and found one genuine unexecuted handoff. |

### Cumulative Quality

| Milestone | Tests | Test files | Migrations | tsc |
|-----------|-------|-----------|------------|-----|
| v1.0 | 1087 passing / 4 skipped / 0 failing | 135 | 26 (through `0025`) | exit 0 |
| v1.1 | full suite exit 0; design suite 1291 passing / 3 skipped across 71 files | 301 test/spec files | 26 (through `0025`) — **zero added, a declared invariant** | exit 0 |

### Top Lessons (Verified Across Milestones)

*Two milestones. Lessons 1–3 are v1.0's, all three CONFIRMED by v1.1; 4–5 are new.*

1. **Push correctness into the database** — an application-level check on a money path is a race
   waiting to happen. **Confirmed:** re-proved in v1.1 by removing `booking_no_overlap` and watching
   two racing inserts both succeed.
2. **Independent-looking proof layers can share a blind spot** — count blind spots, not layers.
   **Confirmed emphatically:** GATE-02's gap survived four independent review passes because all four
   shared one blind spot (D-24 — nothing ran the spec).
3. **Verify what the tooling writes.** **Confirmed:** the milestone-archive SDK emitted 30+ raw plan
   one-liners as "key accomplishments", including fragments like "Task 1 — `status-tones.ts`", and
   miscounted phases by including backlog directories.
4. **A record drifts from the tree the moment nothing pins it.** Four unticked requirements and a
   six-day false bug report, all from passes that re-confirmed instead of re-measuring.
5. **Cross-phase handoffs need an owner in the receiving phase, not just a decision record.**
