---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
verified: 2026-08-30T16:10:00Z
status: gaps_found
score: 3/4 must-haves verified
overrides_applied: 0
gaps:
  - truth: "GATE-02 — an automated axe pass is green in the product theme (court) (ROADMAP SC#3)"
    status: failed
    reason: >
      e2e/axe-sweep.spec.ts — the file this phase built specifically to prove GATE-02's axe half —
      does NOT pass when run. Its own completeness self-check, "AC#2 — no surface can be silently
      absent from the axe table › the table's row set equals the declared surface set" (:791-809),
      fails deterministically: `declaredRouteFiles()` walks the whole `src/app/**` tree with no
      `dev/**` exclusion and now finds 46 route files, but `ROWS` (built by plan 17-07 in Wave 2)
      only has entries for 42. The four missing files are the dev-throw error-boundary probes that
      plan 17-12 (Wave 3) added AFTER 17-07 shipped: `src/app/(app)/dev-throw-app/page.tsx`,
      `src/app/(auth)/dev-throw-auth/page.tsx`, `src/app/(host)/host/dev-throw/page.tsx`,
      `src/app/(legal)/dev-throw-legal/page.tsx`. Nobody reconciled the two plans' route tables
      after Wave 3 landed. Reproduced independently, twice, deterministically, at `--workers=1`
      in isolation (not a contention/flake artifact — contrast with `e2e-baseline-reds.md`'s
      documented flake class, which this is not part of and does not resemble).
    artifacts:
      - path: "e2e/axe-sweep.spec.ts"
        issue: >
          `declaredRouteFiles()` (:324-337) and `ROWS` (:339 onward) are out of sync. Running
          `npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1 -g "AC#2"`
          fails with: missing = ["src/app/(app)/dev-throw-app/page.tsx",
          "src/app/(auth)/dev-throw-auth/page.tsx", "src/app/(host)/host/dev-throw/page.tsx",
          "src/app/(legal)/dev-throw-legal/page.tsx"].
    missing:
      - "Four rows added to e2e/axe-sweep.spec.ts's ROWS table for the dev-throw-* routes, following the exact already-shipped pattern used for /dev/theme and /dev/throw (\"AUDIT INSTRUMENT, NOT AN AUDIT SUBJECT\", excluded by name with a skip reason) — this is the phase's own sanctioned mechanical-fix pattern, not a new decision."
      - "The stale docblock comment at e2e/axe-sweep.spec.ts:338 (\"42 route files on disk\") corrected to 46, matching loading-coverage.test.ts's already-corrected 29→33 EXPECTED_PAGES bump."
      - "A deferred-items.md entry or equivalent record — this gap exists in none of the phase's 25 logged findings, so it was never surfaced to the PM at all, unlike every other completeness edge case this phase found (e.g. [17-D13])."
---

# Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines — Verification Report

**Phase Goal:** The five gates stop being per-phase promises and become the milestone's closing, machine-checked proof across every surface at once.
**Requirements:** RESP-03, RESP-04, GATE-02, GATE-06
**Verified:** 2026-08-30T16:10:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Summary

This phase's own instrumentation is, on the whole, unusually rigorous: red-watch evidence is real
and reproducible (independently confirmed for `tests/design/money-path-invariants.test.ts`,
`tests/design/one-tree.test.ts`, and `tests/security/dev-today-override.test.ts`), the code review's
five fixed findings are genuinely fixed and their pinning tests genuinely pass, GATE-01's two closing
CI runs are genuinely green on the claimed commits (`247d1e4` and `1751fb0`, confirmed via `gh run
view`), and the `?today=` dev seam is confirmed independently — by tracing `getAvailability`'s call
site and `placeHold`'s server-side re-derivation myself — to never reach a money or availability
decision.

But the adversarial pass this verification is required to make ("does each new gate actually go red
when the thing it guards breaks, and can it currently pass") surfaced one BLOCKER that none of the
phase's own closing checks caught: **`e2e/axe-sweep.spec.ts`, GATE-02's own declared automated-axe
instrument, fails when run, right now, on `HEAD` (`1751fb0`).** Not hypothetically — I ran it. The
failure is deterministic and has nothing to do with an accessibility regression; it is a
completeness gap between two of this phase's own plans (17-07 built the axe table in Wave 2; 17-12
added four new routes in Wave 3; nobody added rows for them). This falsifies ROADMAP.md's Phase 17
SC#3 ("an automated axe pass green in the product theme (`court`)") as literally, presently true, and
it is not recorded anywhere in the phase's own 25-item `deferred-items.md` ledger, so the PM has not
seen it either.

RESP-03, RESP-04 and GATE-06 are substantively verified — including two properly-escalated, honestly
documented residual gaps ([17-D9], [17-D13]) that the phase's own remediation rules correctly classify
as must-escalate rather than must-fix, and which do not, on inspection, look like laundering of
mechanical work.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | **RESP-03** — every surface holds from 320px up, sticky bar present, no wrap/overflow (ROADMAP SC#1) | ✓ VERIFIED (1 documented, escalated residual gap) | `e2e/mobile-booker-path.spec.ts` (11 passed / 3 declared skips) and `e2e/overflow-320.spec.ts` (100 passed / 9 declared skips, run at `--workers=1`) both independently re-run and green, including their own D-201/AC#8 completeness self-checks. `[17-D9]` (footer link occluded by the sticky bar on `/listings/[id]` at 320px) is real, measured, and correctly escalated — the test suite carries an explicit, argued exception for it rather than silencing it; see Gaps/Deferred below. |
| 2 | **RESP-04** — search/detail/calendar/wizard/checkout/list surfaces hold one component tree across widths (ROADMAP SC#2) | ✓ VERIFIED (1 documented, escalated residual gap) | Source half: `tests/design/one-tree.test.ts` (AST walk, zero viewport-conditional branches, exactly one sanctioned `matchMedia` call site) — independently re-run inside the full design suite, green, with real red-watch evidence recorded (4 mutations, all caught). Rendered half: `e2e/one-tree.spec.ts` independently re-run, 20 passed / 2 declared skips. `[17-D13]` (the drop-in/`open_capacity` calendar fork has no container id, so its one-instance count can't be taken) is real and correctly escalated as a "reverse a deliberate architectural decision" item — 5-of-6 families closed, the sixth named rather than silently dropped. |
| 3 | **GATE-02** — every surface keyboard-operable with a visible focus indicator, axe pass green in court, court baselines regenerated, leak tests advisory→blocking (ROADMAP SC#3) | ✗ **FAILED — BLOCKER** | Keyboard half genuinely verified: `e2e/keyboard-composites.spec.ts` (7/7 passed, independently re-run), `e2e/host-headings.spec.ts` (14/14 passed), `tests/design/focus-definition.test.ts` (mechanical, in design suite). Advisory→blocking half verified: DS-09 ceiling is `toBe(0)` (`tests/design/brand-recipe.test.ts:776`). Baseline-regeneration half verified: CI runs `33298297450` (head `247d1e4`) and `33298587807` (head `1751fb0`, current `HEAD`) both independently confirmed **green, all 4 jobs**, via `gh run view`; 36 court PNGs / 0 grove / 0 win32-darwin on disk. **The axe-pass half is FALSE right now**: `npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1` → **1 failed** (`AC#2 — the table's row set equals the declared surface set`), reproduced twice, deterministically. See Gaps. |
| 4 | **GATE-06** — v1.1 ships zero schema migrations, `drizzle/` unchanged from v1.0 (ROADMAP SC#4) | ✓ VERIFIED | `ls drizzle/*.sql` independently counted: **26 files**, ending at `0025_audit_resolved_by.sql` — matches `tests/design/money-path-invariants.test.ts`'s pinned `MIGRATION_COUNT`/`LAST_MIGRATION`. The byte-digest assertion (`MIGRATION_DIGEST`, name+NUL+CRLF-normalised-bytes over all 26 files) carries real, independently-legible red-watch evidence (one character changed in a shipped `.sql` → red; reverted → green; cross-checked against `git show` index blobs for the Linux CI runner). `git status --porcelain drizzle/` is clean. This truth was left `Pending` by every executor for **procedural** reasons ("17-14 has not run yet") rather than a substantive gap — 17-14 touches no schema file, and the mechanical proof holds independently of it. |

**Score:** 3/4 truths verified (1 BLOCKER)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `e2e/helpers/axe.ts` | AXE_TAGS, makeAxe, expectAxeClean; one `.options()` call | ✓ VERIFIED | 182 lines (min 60). Vacuity floor (`passes.length > 0`, `scannedNodes >= MIN_SCANNED_NODES`) confirmed present by code review and by direct read. |
| `.../e2e-baseline-reds.md` | Declared pre-existing e2e red set | ✓ VERIFIED | 154 lines, 10-row denominator with commit `e439bf9`, explicit contamination-vs-real-red methodology. Used correctly by this verification to classify one observed flaky failure (`overflow-320.spec.ts`'s `/host/bookings` touch-target row under concurrent workers) as contention, not regression — confirmed by re-running that row alone (4/4 passed) and the whole file at `--workers=1` (100 passed / 9 skipped). |
| `tests/design/money-path-invariants.test.ts` | GATE-06 content digest + D-81 qrph exclusion | ✓ VERIFIED | 238 lines. Both invariants independently re-run and green; `drizzle/` state independently cross-checked (26 files, ends 0025). |
| `tests/design/one-tree.test.ts` | RESP-04 source scan (AC#10/11) | ✓ VERIFIED | 951 lines (min 150). Guard-the-guard block present and its floor logic read directly. |
| `e2e/one-tree.spec.ts` | RESP-04 rendered half (AC#12/13) | ✓ VERIFIED | 1600 lines (min 120). Independently re-run: 20 passed / 2 skipped (the [17-D13] skip). |
| `e2e/axe-sweep.spec.ts` | GATE-02 axe sweep (AC#16/AC#2/AC#24) | ✗ **FAILING SELF-CHECK** | 940 lines (min 150). 51/52 measured rows genuinely pass with zero WCAG violations when independently re-run — but the file's own AC#2 completeness assertion fails (see Gaps). This is the phase's single load-bearing GATE-02 artifact and it does not currently hold its own stated contract. |
| `e2e/keyboard-composites.spec.ts` | 5-property keyboard walk (AC#19) | ✓ VERIFIED | 1523 lines (min 200). Independently re-run: 7/7 passed. |
| `e2e/mobile-booker-path.spec.ts` | RESP-03 sticky-bar clause + no-wrap helper adoption (AC#4-8) | ✓ VERIFIED | Independently re-run: 11 passed / 3 declared skips. |
| `e2e/overflow-320.spec.ts` | RESP-03 route inventory (D-201/AC#1/2/8/29/30/36) | ✓ VERIFIED | 4075 lines. Independently re-run at `--workers=1`: 100 passed / 9 skipped — including its own D-201/AC#2 disk-vs-table completeness check, which (unlike axe-sweep's) correctly accounts for the four dev-throw routes. |
| `e2e/host-headings.spec.ts` | AC#21 heading-outline walk joined to the 28-state loop | ✓ VERIFIED | Independently re-run: 14/14 passed. |
| `.../deferred-items.md` | The phase's second deliverable — 25 escalate-class findings | ✓ VERIFIED, with one omission noted | 961 lines. `grep -c '^## '` = 25, matching the claimed count and the claimed per-row four-part format (spot-checked 7 of 25 entries in full: [17-D1], [17-D2], [17-D3], [17-D7], [17-D9], [17-D13], [17-D18] — all well-argued, correctly classified as escalate-class rather than disguised mechanical work). **Not present in this ledger:** the axe-sweep AC#2 gap above. It is exactly the kind of item this file exists to catch (a mechanical completeness gap between two plans' route tables) and it slipped past all three of the phase's own cross-checks (17-13's synthesis, the code review, and 17-14's closing evidence). |
| `.../baseline-evidence.md` | GATE-01 evidence chain + D-202 comparison run | ✓ VERIFIED | Both cited CI run IDs independently confirmed via `gh run view`: `33298297450` → head `247d1e4`, `33298587807` → head `1751fb0` (= current `HEAD` = current `origin/dev`), both `conclusion: success`, all 4 jobs green in both. |
| `src/lib/dev/today-override.ts` | Dev-only `?today=` seam, inert in production, never reaches money/availability decisions | ✓ VERIFIED | Independently traced (not just read): `getAvailability(db, id, initialDate)` at `page.tsx:469` is called with 3 args, so its `now` parameter defaults to `new Date()` — the override is never threaded into it. `seedSelectionFromWindow` only seeds from `dayAvail.slots` filtered to `state === "available"`, which is itself computed from the real-clock `getAvailability`. `placeHold` (`src/app/actions/booking.ts`) re-derives bookability, mode, and price entirely server-side and never reads the query param. `tests/security/dev-today-override.test.ts` independently re-run: 21/21 passed. |
| `src/components/ui/progress.tsx` (WR-06 fix) | `value` forwarded to `ProgressPrimitive.Root` | ✓ VERIFIED | Source read confirms the fix; `tests/design/progress-value.test.tsx` independently re-run: 7/7 passed. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `src/app/listings/[id]/(detail)/page.tsx` | `src/lib/availability/read-model.ts`'s `getAvailability` | 3-arg call, `now` defaults to real clock | ✓ WIRED (correctly NOT threading the override) | Confirmed by direct read of both call site and function signature. |
| `e2e/axe-sweep.spec.ts` | `src/app/**` route files on disk | `declaredRouteFiles()` walk vs. hand-maintained `ROWS` table | ✗ **NOT WIRED — stale** | Walk finds 46 files; table declares 42. The link exists but is out of date by exactly the 4 files plan 17-12 added after plan 17-07 shipped. |
| `e2e/overflow-320.spec.ts` | `src/app/**` route files on disk | D-201 inventory walk vs. `ROUTES`/`HOST_ROUTES` tables | ✓ WIRED | Independently re-run: the file's own "disk to inventory" and "inventory to disk" completeness tests both pass — this file's equivalent link was correctly updated by plan 17-12/17-13 where axe-sweep's was not. |
| `tests/security/dev-today-override.test.ts` | `src/app/listings/[id]/(detail)/page.tsx` | blast-radius referrer-set scan (WR-02 fix) | ✓ WIRED | Independently re-run and confirmed to actually count (not just spot-check) — red-watch evidence in the file's own docblock is consistent with a live re-run showing the assertion would fail on a second importer. |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| RESP-03 | 04, 06, 11, 12, 13 | Every surface verified from 320px, sticky bar present, no wrap/overflow | ✓ SATISFIED (residual gap escalated, not silent) | See Truth #1 |
| RESP-04 | 03, 09, 13 | One component tree across mobile/tablet/desktop for named surfaces | ✓ SATISFIED (residual gap escalated, not silent) | See Truth #2 |
| GATE-02 | 01, 02, 05, 06, 07, 08, 10, 12, 13, 14 | Keyboard operability + focus indicator + axe pass + leak-test blocking | ✗ **BLOCKED** | See Truth #3 — the axe-pass clause is false as of `HEAD` |
| GATE-06 | 02, 13 | Zero schema migrations shipped in v1.1 | ✓ SATISFIED | See Truth #4 |

No orphaned requirements: `.planning/REQUIREMENTS.md`'s traceability table maps exactly these four IDs to Phase 17 (`grep "Phase 17" REQUIREMENTS.md`), and all four are declared in at least one plan's `requirements:` frontmatter. Both the requirement bullets (lines 107-117) and the traceability-table rows (lines 237-244) read `Pending` for all four, consistently — no drift between the two locations in this instance.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `e2e/axe-sweep.spec.ts` | 791-809 | Completeness assertion that is stale relative to a sibling plan's later change | 🛑 Blocker | GATE-02's declared automated-axe instrument fails on `HEAD`; see Gaps |
| `e2e/axe-sweep.spec.ts`, `e2e/one-tree.spec.ts`, `e2e/mobile-booker-path.spec.ts`, `e2e/overflow-320.spec.ts` | various (`WR-04` in code review) | `test.skip(title, () => { throw new Error(...) })` — the thrown reason never reaches the run's output, only `title` does | ⚠ Warning | Accepted, not fixed, by explicit PM-scoped code-review decision (inherited pre-existing idiom, present at phase base commit `e439bf9`); does not affect correctness, only skip-reason legibility in a run log |
| — | — | None of this phase's new/modified Playwright specs (`axe-sweep`, `keyboard-composites`, `one-tree`, `overflow-320`, `mobile-booker-path` additions, `host-headings` additions, `auth-keyboard`) are wired into any CI job | ℹ️ Info | Confirmed by parsing `.github/workflows/ci.yml`'s jobs programmatically: only `e2e/price-parity.spec.ts` and the `visual` project run in CI. This is a pre-existing, documented, project-wide decision (D-24, predates Phase 17) rather than something this phase introduced — but it is the reason the axe-sweep gap above was never caught by CI, and it means the phase's "machine-checked proof" is a one-time audit result, not an ongoing regression gate, for every one of these specs going forward. |
| — | — | `TBD`/`FIXME`/`XXX` scan across every file named in the 14 plans' `key-files` | — | **0 matches.** No unresolved debt markers. |

## Gaps Summary

**One BLOCKER.** `e2e/axe-sweep.spec.ts` — the single file this phase built to prove GATE-02's
"automated axe pass green" clause — fails its own completeness self-check on the current `HEAD`
(`1751fb0`). This is not a hypothetical or an interpretation: it was reproduced twice, deterministically,
in isolation, with `--workers=1` (ruling out the contention-flake class this repo already has a name
for). The cause is a straightforward wave-ordering gap — plan 17-07 (Wave 2) built the axe table against
42 known route files; plan 17-12 (Wave 3) added 4 more (the dev-throw error-boundary probes) and updated
every OTHER route-inventory instrument that needed it (`loading-coverage.test.ts`'s pins, `e2e/overflow-320.spec.ts`'s
D-201 table) except this one. It is a mechanical fix — four rows, in the exact pattern already used for
the `/dev/theme` and `/dev/throw` "AUDIT INSTRUMENT, NOT AN AUDIT SUBJECT" rows two lines above where the
new ones belong — not a product decision requiring escalation under this phase's own remediation rules.
It was not caught by: plan 17-12 itself, plan 17-13's "closed inventory re-proof" (which re-proved five
different inventories, none of them this one), the code review (whose "Gates I re-ran on this tree" table
lists only two vitest invocations, no Playwright runs), or plan 17-14's closing evidence. It does not
appear anywhere in the phase's own 25-item `deferred-items.md` ledger.

Because none of this phase's Playwright specs run in CI (a pre-existing, documented project convention,
not new to Phase 17), there is currently no mechanism that would surface this gap to anyone who does not
run `npx playwright test e2e/axe-sweep.spec.ts` by hand — which is exactly what this verification did.

**Two properly-handled, non-blocking residual gaps** ([17-D9], [17-D13]) exist in RESP-03 and RESP-04.
Both are measured, both are correctly classified as must-escalate under `17-UI-SPEC.md`'s own remediation
rules (each requires reversing a deliberate architectural decision or touching a globally-shared
component from inside an audit phase), and both are recorded in `deferred-items.md` with the PM
explicitly named as the decision-owner. These are not scored as failures of RESP-03/RESP-04 — the
phase's own D-200 rule states escalate-class findings are the deliverable, and closing green around a
properly-argued, properly-recorded one is the intended shape of this kind of audit phase.

**Suggested fix for the BLOCKER** (not applied — verification does not fix):
Add four rows to `e2e/axe-sweep.spec.ts`'s `ROWS` array, immediately following the existing
`/dev/theme` and `/dev/throw` rows (lines ~723-731), for `src/app/(app)/dev-throw-app/page.tsx`,
`src/app/(auth)/dev-throw-auth/page.tsx`, `src/app/(host)/host/dev-throw/page.tsx`, and
`src/app/(legal)/dev-throw-legal/page.tsx`, using the same "AUDIT INSTRUMENT, NOT AN AUDIT SUBJECT"
skip reasoning already established for their siblings, and correct the stale "42 route files" count in
the docblock at line 338 to 46.

## Human Verification Required

None. Every truth in this report was resolved by direct, reproducible evidence (source reads, independent
test re-runs, and `gh run view` against the actual GitHub Actions API) rather than by reading claims.

---

_Verified: 2026-08-30T16:10:00Z_
_Verifier: Claude (gsd-verifier)_
