---
phase: quick-260810-sti
verified: 2026-08-10T13:56:55Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 0
---

# Quick Task 260810-sti: Make operating hours part of the bookability gate — Verification Report

**Task Goal:** Close v1.0 milestone-audit item #4 — make "the listing has at least one `operating_hours`
row" the fourth term of the bookability sell-gate, so a published listing with an empty calendar is not
SELLABLE. Deliberately a derivation, not a publish gate (already-live listings are covered).

**Verified:** 2026-08-10T13:56:55Z
**Status:** passed
**Re-verification:** No — initial verification

All evidence below was gathered first-hand: source files read directly, grep counts reproduced, `tsc`
and the full vitest suite run bare (no `DATABASE_URL`), and mutation M1 independently re-applied and
reverted by this verifier (not merely re-read from the SUMMARY).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `deriveBookable` gains a fourth term and stays PURE (no DB, no I/O) | VERIFIED | `src/lib/bookability.ts:56-66` — signature `listing: { status; hasOperatingHours: boolean }`, body is a plain `&&` chain, no `await`/`db` import. Truth table in `tests/listing/bookability.test.ts` widened from 8 to 16 rows (a new dimension, not one extra case), exactly one `expected: true` row |
| 2 | All four call sites supply the new term with no per-card N+1 | VERIFIED | Read all four sites directly: listing page (`src/app/listings/[id]/page.tsx:117-129`) rides the existing `Promise.all`; `placeHold`/`placeOpenHold` (`src/app/actions/booking.ts:184`, `:440`) fold a correlated `EXISTS` into the SELECT already being issued; host grid (`src/app/(host)/host/listings/page.tsx:114`) reuses iu7's grouped `missingHours` Set — `!missingHours.has(r.id)`, no query inside `rows.map` |
| 3 | Both `placeHold` and `placeOpenHold` refuse server-side, independently duplicated (no shared helper) | VERIFIED | `grep -c 'EXISTS (SELECT 1 FROM operating_hours' src/app/actions/booking.ts` → exactly **2** (lines 184, 440), confirming independent duplication as the plan requires |
| 4 | The search SQL twin excludes zero-hours listings from a no-date browse search, proven against a real DB | VERIFIED | `src/lib/search/query.ts:218` has the unconditional `AND EXISTS (SELECT 1 FROM operating_hours oh_any …)`; old per-day conditional EXISTS untouched at `:230-231`. Full suite run confirms `tests/search/bookable-gate.test.ts` passes against `fitout_test` — `gate_pub` (with hours) present, `gate_nohours` (zero hours) absent, on a search with NO date filter |
| 5 | The booker still gets a read-only availability preview, not a dead end | VERIFIED | `tests/availability/availability-calendar.test.tsx` — new file, 2 cases, both pass in the full suite run: `bookable=false` still renders the available/occupied chips and clicking selects nothing; `bookable=true` renders the same chips and clicking selects something |
| 6 | Deleting the last hours row un-sells the listing instantly, no listing write | VERIFIED | `tests/listing/bookability.test.ts:157-166` — dedicated case derives `true` then `false` after `hasOperatingHours: false` with nothing else changed. iu7's `loadPublishedListingsMissingHours` (unchanged) already surfaces this on `/host/listings` |
| 7 | Draft/unlisted listings unaffected — status term already decides it | VERIFIED | 8 of 16 truth-table rows are `draft × …` → all `false`, including `draft × hasOperatingHours=true` which pins site 4's soundness (host grid reporting `true` for a draft is safe only because status is already false) |
| 8 | In-flight bookings unaffected — no existing row re-derived | VERIFIED | Census in decision record confirms bookability is derived only at 4 entry points; nothing in `confirmBooking`/webhook/cancellation/payout re-derives it. No contradicting code found |
| 9 | TS predicate and SQL twin cannot drift without a test failing | VERIFIED (reproduced independently) | Re-applied mutation M1 myself (deleted `listing.hasOperatingHours &&`), ran the four affected test files, observed **5 RED** exactly as claimed: 2 truth-table rows, `L_nohours` (state-machine, minted a real redirect/hold), `L_OPEN_NOHOURS` (open-capacity-hold, wrong gate/copy), and the parity guard in `bookable-gate.test.ts`. Reverted; `git diff --exit-code src/` clean afterward; re-ran the 4 files — 43/43 passed |
| 10 | No schema change, no migration, no new dependency, `publishListing` byte-unchanged | VERIFIED | `ls drizzle/*.sql \| tail -1` → `drizzle/0024_audit_table.sql` (unchanged); `git diff f0814b7 HEAD -- package.json` empty; `git diff --exit-code src/lib/validation/listing.ts src/app/actions/listing.ts` clean |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/bookability.ts` | Four-term pure predicate, `hasOperatingHours` | VERIFIED | Read in full; `hasOperatingHours: boolean` on the listing param, AND'd into the return, header records the derivation-not-gate decision and the two re-derivation sites |
| `src/lib/search/query.ts` | Unconditional `EXISTS` twin, `operating_hours oh_any` | VERIFIED | `grep -v '^\s*--' src/lib/search/query.ts \| grep -c 'operating_hours oh_any'` → **1**; coexists with untouched per-day conditional EXISTS |
| `src/lib/listing/hours-signal.ts` | `listingHasOperatingHours` + corrected header, 5 exports | VERIFIED | All 5 exports present (`HOURS_MISSING_STATE`, `HOURS_MISSING_REASON`, `HOURS_MISSING_CTA`, `loadPublishedListingsMissingHours`, `listingHasOperatingHours`); header rewritten, "SIGNAL, DELIBERATELY NOT A GATE" and "BYTE-UNCHANGED" claims explicitly marked superseded |
| `tests/listing/bookability.test.ts` | 16-row truth table + revert case | VERIFIED | 16 rows confirmed, exactly one `expected: true`, plus dedicated last-hours-row-deletion case |
| `tests/search/bookable-gate.test.ts` | Real-DB exclusion + parity guard | VERIFIED | `gate_nohours` fixture and case present; set-equality parity assertion against `deriveBookable` present; ran green in full suite |
| `tests/booking/state-machine.test.ts` | `L_nohours` exclusive refusal anchor | VERIFIED | Case present, asserts `{ok:false, reason:"not-bookable"}` and `SELECT count(*) ... = 0`; reddened under reproduced M1 |
| `tests/booking/open-capacity-hold.test.ts` | `L_OPEN_NOHOURS` open-capacity refusal anchor | VERIFIED | Case present, asserts exact error string via `NOT_BOOKABLE` constant (not just reason code) and zero rows; reddened under reproduced M1 |
| `tests/availability/availability-calendar.test.tsx` | Read-only preview proof | VERIFIED | New file, 212 lines, 2 cases, passed in full suite run |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/lib/search/query.ts` | `src/lib/bookability.ts` | Parity assertion in `bookable-gate.test.ts` | WIRED | Confirmed by reproducing M1: SQL stayed strict, TS predicate went permissive, parity guard caught the desync (`Set{'gate_pub'}` vs `Set{'gate_pub','gate_nohours'}`) |
| `src/app/actions/booking.ts` | `operating_hours` | Correlated `EXISTS` in both `placeHold` and `placeOpenHold` | WIRED | grep count = 2, independently confirmed by reading both call sites; both reddened under the same M1 deletion |
| `src/app/listings/[id]/page.tsx` | `src/lib/listing/hours-signal.ts` | `listingHasOperatingHours(db, id)` inside existing `Promise.all` | WIRED | Read directly — 4th element of the existing batch at lines 117-129, derive moved below it |
| `src/app/(host)/host/listings/page.tsx` | `src/lib/listing/hours-signal.ts` | `hasOperatingHours: !missingHours.has(r.id)` | WIRED | Confirmed — reuses the one grouped query from iu7, no query inside the render loop |

### Scrutinized Executor Claims (per the verification brief)

**(a) The unpredicted open-capacity result.** VERIFIED against code, not just against the SUMMARY's
narrative. Read `placeOpenHold`'s gate sequence directly in `src/app/actions/booking.ts:351-471`: gate 5
is bookability (now carrying the hours term), gate 6 is the occupancy-mode refusal (`OPEN_ON_EXCLUSIVE`,
a distinct error string "This space is booked by the hour — pick a time to book."), gate 7 derives the
day window from the listing's own operating hours and returns `CLOSED_THAT_DAY`
("This space isn't open that day. Pick another date.") on a null window. Confirmed the `L_OPEN_NOHOURS`
fixture is built by the same `openListing` factory used for `L_OPEN`/`L_CLOSED` (real `maxOccupancy`,
real `perHeadPriceCents`, `occupancyMode: "open_capacity"`, `bookingMode: "instant"`, host with
`emailVerified: true` + `payoutsEnabled: true`) — a genuinely adversarial, well-formed fixture, not a
mis-built one. The executor's reasoning holds: a mode mismatch would have produced the distinct
`OPEN_ON_EXCLUSIVE` string, not `CLOSED_THAT_DAY`, so gates 1-6 genuinely passed pre-fix. The test asserts
the exact error string via the `NOT_BOOKABLE` constant (`tests/booking/open-capacity-hold.test.ts:608`),
which is what keeps the two `invalid`-shaped sources distinguishable.

**(b) M1's finding condition.** VERIFIED by direct reproduction (not by re-reading the SUMMARY). I applied
the exact M1 deletion, ran the four affected test files, and observed 5 RED: both refusal anchors
(`L_nohours` in state-machine.test.ts via an actual `RedirectError` — meaning the exclusive path minted a
hold — and `L_OPEN_NOHOURS` in open-capacity-hold.test.ts via the wrong reason/copy) plus the 2 truth-table
rows plus the parity guard in bookable-gate.test.ts. Reverted cleanly (`git diff --exit-code src/` → clean)
and re-ran the same 4 files green (43/43). The claim is not merely plausible — it is reproduced.

**(c) The admitted non-assertion.** VERIFIED. The "is bookable in EXACTLY one of the 16 rows" meta-assertion
(`tests/listing/bookability.test.ts:128-137`) filters `rows.filter(r => r.expected)` — the table's own
declared column — never `deriveBookable`'s actual return value, and this is explicitly labelled in the
file header (lines 46-50: "REPORTED AS OBSERVED, NOT AS PREDICTED... it is a self-consistency check on the
table and CANNOT detect a predicate defect"). Checked the other new assertion with a similar shape — the
parity guard in `bookable-gate.test.ts` (`FIXTURES.filter(f => deriveBookable(...))`) — but that one calls
`deriveBookable` on the fixture's declared inputs and compares the *result* against the real SQL query's
output, which is genuine behavioural coverage, not the same defect. No other new assertion shares the
meta-assertion's fault.

### Stale-Document Corrections

| Document | Claim | Status |
|----------|-------|--------|
| `src/lib/listing/hours-signal.ts:8-19` | "SIGNAL, DELIBERATELY NOT A GATE" / "deriveBookable stays BYTE-UNCHANGED" | CORRECTED — header explicitly states both claims are now false and supersedes them with the signal/gate division of labour |
| `tests/listing/hours-signal.test.ts:5` | Same one-line claim | CORRECTED — rewritten to describe the gate half shipping via 260810-sti |
| `tests/listing/listing-card.test.tsx:155-172` (case 7) | `bookable hoursMissing` → still "Live" | CORRECTED — re-pointed to `bookable={false} hoursMissing` → "Published · not bookable", with a comment explaining the old combination is now unreachable |
| `src/components/listing/listing-card.tsx:151-159` (`hoursMissing` JSDoc) | "still reads Live if otherwise bookable... this is a signal, not a gate" | CORRECTED — JSDoc rewritten, explicitly notes the component's own rendering behaviour is unchanged (still just displays whatever `bookable` it's handed) |

Repo-wide grep for `"not a gate"` / `"DELIBERATELY NOT A GATE"` / `"stays BYTE-UNCHANGED"` outside these
four files found no other stale claim about hours being "not a gate" (other hits — `create-group-button.tsx`,
`pax-stepper.tsx`, `stepper-control.tsx` — are on unrelated topics: a client-side courtesy check and a code
comment about React imports).

### Behavioral / Direct Execution Checks

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Type check | `npx tsc --noEmit` | exit 0, no output | PASS |
| Full suite (bare, no `DATABASE_URL`) | `npx vitest run` | **1178 passed / 4 skipped / 0 failed** (1163 baseline + exactly 15 added) | PASS — matches SUMMARY exactly |
| SQL twin grep gate | `grep -v '^\s*--' src/lib/search/query.ts \| grep -c 'operating_hours oh_any'` | 1 | PASS |
| Booking.ts duplication gate | `grep -c 'EXISTS (SELECT 1 FROM operating_hours' src/app/actions/booking.ts` | 2 | PASS |
| No stubbed call site | `grep -rn 'hasOperatingHours: true' src/ \| grep -c ''` | 0 | PASS |
| Migration boundary | `ls drizzle/*.sql \| tail -1` | `drizzle/0024_audit_table.sql` | PASS |
| Publishing byte-unchanged | `git diff --exit-code src/lib/validation/listing.ts src/app/actions/listing.ts` | clean | PASS |
| No new dependency | `git diff f0814b7 HEAD -- package.json` | empty | PASS |
| No `src/` drift | `git diff --exit-code src/` (post-verification) | clean | PASS |
| Lint | `npx eslint` on all 7 touched source files + new test | no output (0 errors/warnings) | PASS |
| No pre-existing test moved/deleted | `git diff f0814b7 HEAD -- tests/...` filtered for removed `it(` lines | 0 removed `it(` lines across all touched test files — only additions | PASS |
| **Mutation M1, reproduced independently by this verifier** | Delete `listing.hasOperatingHours &&`, run 4 affected files | 5 RED (both refusal anchors + 2 truth-table rows + parity guard), then reverted clean | PASS — matches SUMMARY, confirms finding condition |

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any of the 7 touched source files.
No hardcoded empty-data returns on the money/search paths. No stale "not a gate" claims left in the repo.

### Requirements Coverage

This is a quick task (not phase-based), so `.planning/REQUIREMENTS.md` does not carry a formal
`v1.0-AUDIT-4` entry — requirement traceability instead runs through `.planning/v1.0-MILESTONE-AUDIT.md`
Tech Debt Summary item #4 ("`publishListing` allows a live listing with no operating hours... the only one
that is fixable today", lines 307-308), which this task's code and tests directly close. Note:
`.planning/v1.0-MILESTONE-AUDIT.md` itself was NOT updated by this task (`git diff f0814b7 HEAD -- .planning/v1.0-MILESTONE-AUDIT.md`
is empty) — consistent with this repo's established convention where the audit-tracking-doc update ships
as a separate `docs(quick-...)` follow-up task (see `km4`, `i0v`, `j3z` in git log). Not a gap against this
task's own must-haves, which did not list the audit doc as an artifact — flagged here only for completeness
so a follow-up "close item #4 in the audit doc" quick task is not overlooked.

### Human Verification Required

None. All must-haves are verifiable programmatically and were verified first-hand: static predicate logic,
grep-countable duplication, a real-database search exclusion (proven via the actual test run against
`fitout_test`), and a jsdom-rendered read-only-preview behavioural test — all executed, not merely read.

### Gaps Summary

No gaps found. Every must-have truth, artifact, and key link was independently verified against the
codebase — not accepted from the SUMMARY's narrative. The three specifically flagged "interesting" claims
(the open-capacity gate-order reasoning, the M1 finding condition, and the truth-table meta-assertion's
honest non-coverage label) were each checked against the actual code and, for M1, physically reproduced
by this verifier with the mutation applied and reverted. The full suite count (1178/4/0) and every grep
gate match the SUMMARY exactly on independent re-run.

---

_Verified: 2026-08-10T13:56:55Z_
_Verifier: Claude (gsd-verifier)_
