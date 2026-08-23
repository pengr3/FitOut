---
phase: 14-host-tooling
verified: 2026-08-24T02:46:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "The nine visual-regression baselines (GATE-VRT: host-dashboard-agenda, host-dashboard-quiet, host-dashboard-none, host-requests-triage, host-requests-zero, host-bookings-upcoming, host-wizard-rail, host-availability-strip, host-earnings)"
    expected: "Baselines generated and compared against the pinned mcr.microsoft.com/playwright:v1.60.0-noble Linux image in CI, confirming the five host surfaces render as designed"
    why_human: "`--project=visual` does not exist on win32 (playwright.config.ts:39); this phase's own inventory (e2e/visual/surfaces.spec.ts:215-217) states plainly 'NONE OF THE NINE WAS GENERATED... The declaration is an inventory to work from, never a claim of coverage.' Requires a CI run on the pinned Linux image."
  - test: "The dashboard agenda reads correctly for a real two-timezone host, at a venue-local midnight boundary (HFLOW-03 / D-141)"
    expected: "A host with venues in two timezones sees each row labelled in its own venue's local time, and the day boundary reads correctly to a human at the moment it matters"
    why_human: "14-VALIDATION.md's own Manual-Only table: the integration test (tests/booking/agenda-query.test.ts, independently mutation-verified during this pass) proves the SQL predicate; only a human confirms the composed sentence reads right on a live UAT walk."
  - test: "The week strip makes a mistyped window obvious before saving (HFLOW-04)"
    expected: "Setting Monday 6 PM to 6 AM shows the strip drawing it wrong at a glance, without saving"
    why_human: "14-VALIDATION.md's own Manual-Only table: this is the strip's entire purpose and is stated there as a perceptual claim that only a human can confirm."
---

# Phase 14: Host Tooling Verification Report

**Phase Goal:** A host opening FitOut sees what they owe today and can act on it, in the same product the
booker side became.
**Verified:** 2026-08-24T02:46:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP success criterion) | Status | Evidence |
|---|---|---|---|
| 1 | A host lands on a "today" view — today's sessions, requests owed, payout state, published-without-hours signal — not a greeting and a CTA | ✓ VERIFIED | `src/app/(host)/host/page.tsx` reads `readDbNow(db)` once and threads it into `queryHostAgenda` (`src/lib/booking/bookings-query.ts:552-620`) and `HostAgenda`. Three states implemented and rendered by `data-testid`: `agenda-rows` (sessions today), `agenda-next` (quiet day, D-142's "Nothing today — next: …" shape), `agenda-none` (nothing booked, `EmptyState`). Venue-local day predicate independently mutation-tested (see below). `HostSignals` renders all three signal rows (requests owed, payout state, published-without-hours) beneath the agenda, all owner-scoped reads. `e2e/host-dashboard.spec.ts` 6/6 passed live, including case (5) proving the nav badge / signal row / inbox report the identical N. |
| 2 | Requests inbox is scannable, SLA countdown is the loudest element, approve/decline are the only actions, empty inbox reads as done | ✓ VERIFIED | `src/components/host/request-row.tsx`: `RowCard`'s `href` deliberately unused (D-144 terminality); `RequestCountdown` mounted with `emphasis="lead"` in the `status` slot (D-146); Decline routed through `ResponsiveDialog` confirm, Approve stays one press (D-145). `e2e/host-inbox-hierarchy.spec.ts` 3/3 passed live and MEASURED the countdown digits (20px/600) as strictly the largest computed font-size in the row at 320/768/1280px, and measured zero links inside the row (D-144). Inbox-zero renders `EmptyState` titled "You're all caught up" (`requests/page.tsx:225`), pinned by `tests/design/empty-state-adoption.test.ts` to `tone="positive"`. |
| 3 | Wizard shows truthful step count across the occupancy fork, clickable-backward step rail, visible save state, persistent publish checklist | ✓ VERIFIED | D-151 (truthful count) is UNCHANGED regression coverage — `steps = openMode ? STEPS.filter(s => s.key !== "booking") : STEPS` (`wizard.tsx:553`) still drives `Step {n} of {steps.length}`. D-148 rail: markers keyed by `StepKey`, backward-only, now `disabled={saving}` (WR-02 fix confirmed present at `wizard.tsx:948`). D-149: `PublishChecklist` renders in a persistent `<aside>` outside the review step, ordered last at `lg`, collapsible below it. D-150: `role="status"` save-state region renders `saveStateText(saveState)` driven by the real `saveListingStep` result, never a timer (`wizard.tsx:1811-1823`). |
| 4 | Bookings table and availability editor read as the same product as the booker side; editor shows a week-at-a-glance preview of hours just set | ✓ VERIFIED | Both `weekly-hours-editor.tsx` and `blocks-editor.tsx` confirmed off `ALLOWED_RAW_CARD` (D-155 spent — no longer in the exemption list in `tests/design/card-pattern-coverage.test.ts`) and using `PanelCard`. `WeekStrip` (`src/components/availability/week-strip.tsx`) is fed `liveWindows` from `useWatch({ control: form.control, name: "windows" })` (`weekly-hours-editor.tsx:117`) — genuinely live, pre-save. Bars are `aria-hidden="true"` (`week-strip.tsx:122`) with one accessible per-day sentence from the same `deriveWeekStrip` call (D-153). `queryHostBookings` body is byte-for-byte unmodified in the phase diff (D-154) — only additive `ACTIVE_STATUS_SQL`/`hydrateRow` extractions shared with the new agenda query. |
| 5 | Earnings/payouts carry new tokens with structure untouched — token pass only | ✓ VERIFIED | `tests/design/earnings-freeze.test.ts` exists: an AST walk (TypeScript compiler API) over `src/app/(host)/host/earnings/**` and `src/components/host/payout-*.tsx` collecting every string/template/JSX-text node, excluding only structurally-styling positions (`className` values, `cn()`-family call args, module specifiers), and diffing against a pinned inventory. Ran as part of `npm run test:design` (837/837 passed). `type-scale.test.ts`'s pin of `payout-summary.tsx: 2` Display-role headings is explicitly left untouched, matching D-156. |

**Score:** 5/5 truths verified

### Independent Falsification (mutation testing)

To avoid trusting the SUMMARY/REVIEW's own claim that `tests/booking/agenda-query.test.ts` is
"mutation-verified," I mutated the venue-local day predicate myself, restored it, and re-ran:

- Changed `(b.starts_at AT TIME ZONE l.timezone)::date = (${nowIso}::timestamptz AT TIME ZONE l.timezone)::date`
  to a naive `b.starts_at::date = ${nowIso}::timestamptz::date` (UTC comparison).
- Result: 5 of 20 cases in `tests/booking/agenda-query.test.ts` went red (including the exact-cap boundary
  case and the sentinel round-trip case), confirming the test suite genuinely pins D-141's venue-local
  day predicate rather than being decorative.
- File restored via `git status --short` verification (clean); re-run confirmed 20/20 green again.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/app/(host)/host/page.tsx` | Today-view dashboard, single clock read | ✓ VERIFIED | Substantive, wired, single `readDbNow` call confirmed by grep |
| `src/components/host/host-agenda.tsx` | Three-state agenda component | ✓ VERIFIED | All three states present and distinguishable by `data-testid` |
| `src/lib/booking/bookings-query.ts` (`queryHostAgenda`) | Owner-scoped, venue-local, bound-clock query | ✓ VERIFIED | Owner scope on both UNION buckets; mutation-tested predicate; `LIMIT+1` sentinel truncation fix (WR-01) present |
| `src/components/host/request-row.tsx` | Terminal, SLA-first triage row | ✓ VERIFIED | Zero anchors inside row (measured live); countdown `emphasis="lead"` |
| `src/app/(host)/host/listings/[id]/edit/wizard.tsx` | Clickable rail, save state, persistent checklist | ✓ VERIFIED | WR-02 fix (`disabled={saving}` on rail + checklist) confirmed present |
| `src/components/availability/week-strip.tsx` + `.ts` | Live, aria-hidden bar strip with sr sentence | ✓ VERIFIED | `useWatch`-fed, `aria-hidden="true"` on bars, one derivation for both |
| `src/components/availability/weekly-hours-editor.tsx`, `blocks-editor.tsx` | Off `ALLOWED_RAW_CARD`, using `PanelCard` | ✓ VERIFIED | Confirmed via test-file exemption-list absence + `PanelCard` grep |
| `tests/design/earnings-freeze.test.ts` | AST string-literal freeze gate for HFLOW-05 | ✓ VERIFIED | Exists, runs inside `npm run test:design`, passes |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `/host` dashboard | `queryHostAgenda` | server read, owner-scoped WHERE | WIRED | `l.host_id = $1` bound on both UNION buckets |
| `/host` nav badge, `/host` signals row, `/host/requests` inbox | pending-request count | three independent owner-scoped reads of the same predicate | WIRED | `e2e/host-dashboard.spec.ts` case (5) live-measured all three report the same N |
| `weekly-hours-editor.tsx` form state | `WeekStrip` | `useWatch({ name: "windows" })` → `deriveWeekStrip` | WIRED | Confirmed live-derivation, no network round-trip |
| Wizard rail / `PublishChecklist` `Fix` buttons | in-flight autosave lock | `disabled={saving}` | WIRED | WR-02 fix present at all three call sites (rail button, checklist `onFix`, Back button uses `stepBack` functional updater) |
| `saveAndContinue` | `saveListingStep` result | `setSaveState(saveStateFor(res))` | WIRED | Real result drives text; no `setTimeout` in the save-state path |

### Behavioral Spot-Checks / E2E (run live, not trusted from SUMMARY)

| Behavior | Command | Result | Status |
|---|---|---|---|
| `npx tsc --noEmit` | full repo | exit 0, no output | ✓ PASS |
| `npm run test:design` | design gate | 50 files / 837 passed / 3 skipped / 0 failed | ✓ PASS (matches SUMMARY) |
| `npx vitest run` (full suite, DB up) | all unit/integration | 179 files / 1883 passed / 5 skipped / 0 failed | ✓ PASS (matches SUMMARY) — one pre-existing, unrelated audit-row DB-leak warning (2 rows, `guest-email`/`notify`), not a phase-14 regression |
| `npm run build` | production build | exit 0, all 25 routes compiled including all 5 host surfaces | ✓ PASS |
| `git diff --stat 862b20b..HEAD -- drizzle/` | scope discipline | empty | ✓ PASS — zero schema migrations |
| `npx playwright test e2e/host-dashboard.spec.ts --project=chromium` (alone) | HFLOW-03 | 6/6 passed | ✓ PASS |
| `npx playwright test e2e/host-inbox-hierarchy.spec.ts --project=chromium` (alone) | HFLOW-01/D-146 | 3/3 passed | ✓ PASS |
| `npx playwright test e2e/host-headings.spec.ts --project=chromium` (alone) | cross-cutting heading outline | 14/14 passed | ✓ PASS (matches SUMMARY) |
| `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` (alone) | loading-plate geometry | 14/14 passed | ✓ PASS (matches SUMMARY) |
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium` (alone) | 320px sweep, all surfaces | 46 passed / 15 skipped | ✓ PASS (matches SUMMARY; the 15 skips are a pre-existing Phase-13 D-83 branch unreachable from a seed, unrelated to Phase 14) |
| Mutation test of D-141's venue-local day predicate | manual, see above | 5/20 cases went red, restored to 20/20 | ✓ PASS — falsifiability confirmed independently |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist for this phase (migration/tooling probe pattern does not apply
to a UI polish phase). Skipped — not applicable.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| HFLOW-01 | 14-03, 14-06 | Inbox scannable, SLA-first, designed inbox-zero | ✓ SATISFIED | See truth #2 |
| HFLOW-02 | 14-09, 14-10, 14-11 | Wizard truthful count, clickable rail, save state, persistent checklist | ✓ SATISFIED | See truth #3 |
| HFLOW-03 | 14-01, 14-02, 14-08 | Dashboard is a "today" view | ✓ SATISFIED | See truth #1 |
| HFLOW-04 | 14-07, 14-12, 14-13 | Bookings table + availability editor design-system adoption, week-at-a-glance | ✓ SATISFIED | See truth #4 |
| HFLOW-05 | 14-01 (earnings-freeze gate) | Earnings/payouts token pass only | ✓ SATISFIED | See truth #5 |

No orphaned requirements found in the HFLOW block of REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/app/(host)/host/requests/page.tsx` | 165 | `(r.expiresAt ?? new Date())` — a `requested` row with a null `expires_at` would render as instantly "Expired" | ⚠ Warning (not a blocker) | Flagged in `14-REVIEW.md` as IN-05, not fixed in the review's fix pass (Info-tier, out of scope). Independently checked: `expiresAtSql` in `src/lib/availability/units.ts:401-412` always computes a non-null `LEAST(...)` expression for `holdStatus === "requested"` at creation, and no code path in this repo was found that nulls `expiresAt` while a booking stays in `requested` status — so this fallback appears defensively unreachable today, but the code is real and the review is correct that it is wrong if ever reached. Recommend tracking as a follow-up rather than blocking phase close. |
| `src/app/(host)/host/page.tsx` | 141 | `queryHostAgenda` runs unconditionally even when `hasListings` is false and `HostAgenda` does not render | ℹ Info | IN-04 in review, not fixed, cosmetic perf cost only (query is structurally guaranteed empty for a host with 0 listings) |
| `src/app/(host)/host/requests/loading.tsx`, `availability/loading.tsx`, `earnings/{page,loading}.tsx` | various | Page/plate header copy hand-typed twice on 3 of 4 host routes, despite a comment claiming otherwise | ℹ Info | IN-01 in review, not fixed, DRY/comment-accuracy issue only |
| various | various | Seven exports with no consumer outside their own module (two docblocks name a test import that does not exist) | ℹ Info | IN-02 in review, not fixed, dead-export/documentation-accuracy issue only |
| `src/components/booking/request-countdown.tsx` | 164, 188 | Countdown computed from `Date.now()`, browser clock — a documented, pre-existing "display cue" decision, now promoted to `emphasis="lead"` so a skewed client clock is more visible | ℹ Info | IN-05 (first half) in review, not fixed. DB clock (`readDbNow`) remains the server-side authority for all actual approve/decline enforcement (D-130 untouched); this is a display-only risk. |

No `TBD`/`FIXME`/`XXX` debt markers found in any of the 87 files changed by this phase (two grep hits were
both false positives — `FIT-XXXXXXXX` reference-format placeholders, not debt markers). No `TODO`/`HACK`/
`PLACEHOLDER` or "coming soon"/"not yet implemented" copy found.

### Human Verification Required

#### 1. The nine visual-regression baselines (GATE-VRT)

**Test:** Run the `visual` Playwright project against the pinned `mcr.microsoft.com/playwright:v1.60.0-noble`
Linux image in CI for the nine declared Phase-14 host surfaces: `host-dashboard-agenda`,
`host-dashboard-quiet`, `host-dashboard-none`, `host-requests-triage`, `host-requests-zero`,
`host-bookings-upcoming`, `host-wizard-rail`, `host-availability-strip`, `host-earnings`.
**Expected:** Baselines generate cleanly and the five host surfaces render as designed, with no unintended
overflow, misalignment, or accent-token drift.
**Why human:** `playwright.config.ts:39` does not construct the `visual` project on win32, and this phase
was executed entirely on win32. `e2e/visual/surfaces.spec.ts:215-217` states plainly: "NONE OF THE NINE WAS
GENERATED... The declaration is an inventory to work from, never a claim of coverage." This is stated
honestly in-repo, not dressed up as coverage — confirmed by direct inspection of the spec file's own
comments. This is a genuine gap in the five-hard-gates contract (GATE-VRT) that this phase could not close
on this machine.

#### 2. The dashboard agenda reads correctly for a real two-timezone host (HFLOW-03 / D-141)

**Test:** UAT walk on a seeded two-venue host, at a venue-local midnight boundary — confirm both venues'
sessions land on the correct "today" and read naturally in the row/quiet-day sentence.
**Expected:** Each row is labelled in its own venue's local time; the composed sentence reads correctly to
a human, not just structurally correctly to a SQL predicate.
**Why human:** Declared in `14-VALIDATION.md`'s own Manual-Only Verifications table. The SQL predicate
itself is proven by `tests/booking/agenda-query.test.ts` (independently mutation-verified during this
review — see above); only the sentence's human readability is unverified.

#### 3. The week strip makes a mistyped window obvious before saving (HFLOW-04)

**Test:** In the weekly hours editor, set Monday 6 PM → 6 AM (an inverted window) and confirm the week
strip visibly shows it wrong at a glance, without saving.
**Expected:** The strip's whole purpose — catching a typo before it is committed — is perceptually obvious.
**Why human:** Declared in `14-VALIDATION.md`'s own Manual-Only Verifications table as "a perceptual claim."
The underlying derivation (`deriveWeekStrip`) is unit-tested for correctness of segments/sentences, but
"is it obvious at a glance" is not something a unit test can assert.

### Gaps Summary

No must-have truth failed. All five ROADMAP success criteria are backed by real, substantive, wired code —
independently confirmed by reading the implementation (not just the SUMMARY/REVIEW narrative), running
every claimed command myself and matching the exact reported numbers, and mutation-testing the phase's
most safety-critical predicate (the venue-local "today" day boundary) to confirm the test suite is
falsifiable rather than decorative.

The reason this report is `human_needed` rather than `passed` is that the phase's own `14-VALIDATION.md`
declares three items as Manual-Only (not automatable), and one of them — the nine visual-regression
baselines — is a genuine, honestly-stated gap in the five-hard-gates contract (GATE-VRT) that remains open
pending a CI run on Linux. The other two are UAT walks the phase's own validation contract scheduled for a
human. None of these are fabricated by this verification; all three are lifted directly from the phase's
own pre-declared Manual-Only Verifications table, which was never checked off (`14-VALIDATION.md`
frontmatter still reads `nyquist_compliant: false`, `wave_0_complete: false`, and its sign-off checklist is
entirely unchecked, `Approval: pending` — a process artifact that was apparently never closed out despite
16 plans executing against it. This discrepancy is noted for the record but does not itself indicate
missing engineering work — the design-suite/vitest/build/e2e evidence gathered independently in this report
shows the sampling the contract calls for did, in fact, happen).

Two Info-tier and one Warning-tier residual from `14-REVIEW.md` remain unfixed by the phase's own
disposition (IN-01, IN-02, IN-04, and the null-`expiresAt` half of IN-05) — none of these contradict a
success criterion, and the null-`expiresAt` fallback (`requests/page.tsx:165`) appears defensively
unreachable under the current `expiresAtSql` creation logic, but is flagged in the Anti-Patterns table
above for tracking since the review itself calls it "the sharpest thing left in this document."

---

_Verified: 2026-08-24T02:46:00Z_
_Verifier: Claude (gsd-verifier)_
