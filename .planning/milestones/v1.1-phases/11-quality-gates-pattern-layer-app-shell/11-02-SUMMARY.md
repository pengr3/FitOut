---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 02
subsystem: testing
tags: [gate-04, selector-contract, data-testid, playwright, typescript-ast, vitest, design-gate, accessibility]

# Dependency graph
requires:
  - phase: 10-design-system-token-layer
    provides: "the DB-free `tests/design/**` gate (vitest.design.config.ts), `tests/design/helpers/strip-comments.ts`, and the `src/lib/design/` inventory convention (contrast-pairs.ts, status-tones.ts)"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-01 put the design suite inside `npm run build` and left it at 23 files / 465 tests"
provides:
  - "`src/lib/design/selector-contract.ts` — the 17 declared `data-testid` names, each with a mandatory `why` and an `owner` naming the plan that ships it"
  - "`SELECTOR_ATTRIBUTE` — one string the gate, the inventory and every future spec read"
  - "`tests/design/selector-contract.test.ts` — the D-32 floor (getByRole >= 92, getByLabel >= 30), the undeclared-id ban, and guard-the-guard on BOTH scans"
  - "a reusable AST collector for `data-testid` string literals, which plan 11-22 extends for the forward direction"
affects: [11-06, 11-07, 11-08, 11-09, 11-10, 11-14, 11-15, 11-22, phase-12, phase-13, phase-14, phase-15, phase-17, phase-19]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "const tuple -> derived union -> total Record, applied to a selector inventory (the status-tones.ts shape, third adopter)"
    - "a floor assertion rather than an equality, with the ungated companion counts printed inside the gated assertion's failure message"
    - "guard-the-guard over BOTH scanned trees, with the vacuity case measured rather than argued"

key-files:
  created:
    - src/lib/design/selector-contract.ts
    - tests/design/selector-contract.test.ts
  modified: []

key-decisions:
  - "GATE-04 stays Pending — this plan lands one of its three clauses; 11-05 owns the mutation proof and 11-22 owns the forward direction"
  - "The undeclared-id ban collects BOTH literal spellings (`data-testid=\"x\"` and `data-testid={\"x\"}`); a runtime-composed id is out of reach and is asserted to be out of reach"
  - "`collectFiles()` returns `[]` on a missing directory rather than throwing, so a broken scan surfaces as one named guard-the-guard assertion instead of a stack trace"
  - "A fourth watched red was added beyond the plan's three: breaking the SRC scan shows the undeclared-id ban passing vacuously over zero files, which is the silent direction the plan's three probes do not reach"
  - "The measured `.locator(` count is 23, not the UI-SPEC's 22; the measurement wins and the discrepancy is recorded in both files"

patterns-established:
  - "Selector inventory: a `data-testid` needs a declared row with a reason a role/label query cannot express the target, plus the owning plan"
  - "Floors, never equalities, for coverage counts that legitimately grow (D-32)"
  - "An absence assertion is paired with a positive control over its own scan, because an empty scan and a clean tree are indistinguishable"

requirements-completed: []

# Metrics
duration: 27min
completed: 2026-08-13
---

# Phase 11 Plan 02: The Structural-Selector Contract Summary

**GATE-04's regression-blocking half is live: 17 declared test ids that cannot compile without a reason and an owner, and a floor on the e2e suite's 92 `getByRole` / 30 `getByLabel` queries that has been watched failing four ways.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-08-13T16:47:00Z
- **Completed:** 2026-08-13T17:14:00Z
- **Tasks:** 2
- **Files modified:** 2 created, 0 modified

## Accomplishments

- **The inventory is a type, not a document.** `src/lib/design/selector-contract.ts` declares all 17 hooks this milestone may render as a const tuple → derived union → total `Record`. Deleting a row is a compile error, and the error was **watched**: `TS2741: Property '"panel-card"' is missing…`, `tsc` exit 2, recorded verbatim in the file's own header. The required type prints the union member-by-member rather than as the alias, so the missing id is visible on both sides of the error.
- **The floor is live and it is a floor.** `getByRole >= 92` and `getByLabel >= 30` over `e2e/`, asserted DB-free inside `npm run build`. Not an equality — an equality at 92/30 goes red on every legitimate new assertion Phases 12-19 write, and the fix for that red is to bump the number, which is the rubber-stamp reflex this phase exists to remove.
- **Ad-hoc test ids are banned from the day the contract lands.** An AST scan of all 128 `src/**/*.tsx` files collects every `data-testid` string literal and asserts membership in `SELECTOR_IDS`. At HEAD the set is empty and the assertion is green; from wave 4 onward it is what stops an id being invented at a call site. Plans 11-06 through 11-15 already cite it by name in their own acceptance criteria.
- **Watched red four ways, all verbatim in the gate's header.** The three the plan asked for, plus a fourth that is the finding (below).
- **The one uncovered direction is named with its owner**, not omitted: the NOT COVERED block hands "every declared id actually appears in `src/`" to plan `11-22`, states why it cannot be asserted at wave 1 (vacuous) or wave 4 (red for ids nobody has shipped yet), and points at the `owner` column as the mechanism that makes the hand-off auditable.

## Task Commits

1. **Task 1: The typed selector contract** — `1f82ccc` (feat)
2. **Task 2: The floor gate, the undeclared-id ban, and its anti-vacuity clauses** — `9d6032c` (test)

## Files Created/Modified

- `src/lib/design/selector-contract.ts` — 17 declared ids ordered by owning plan (11-06 → 11-15), `SelectorRow = { why, owner }` both mandatory, `SELECTOR_ATTRIBUTE`, and a header carrying D-31, D-32, the measured 92/30/63/23, the UI-SPEC scope rule and the observed `TS2741`.
- `tests/design/selector-contract.test.ts` — 5 assertions: guard-the-guard (asserted **first**, because every assertion below it is worthless against an empty scan), the D-32 floor, the undeclared-id ban, and two synthetic both-directions self-tests.

## Decisions Made

- **GATE-04 is left Pending in REQUIREMENTS.md.** Three plans carry `requirements: [GATE-04]` — this one, `11-05` (the (N+1)th-booking mutation proof) and `11-22` (the forward direction). Marking it complete here would claim two clauses that do not exist. This follows the Phase 10 precedent where DS-13, DS-02 and DS-03 each stayed Pending until the plan owning their last clause ran.
- **Both literal spellings of the attribute are collected.** `data-testid="x"` (a direct `StringLiteral` initializer) and `data-testid={"x"}` (a `JsxExpression` wrapping one) are the same violation; collecting only the first would leave a legal spelling of an ad-hoc id outside the ban. A runtime-composed id (`data-testid={id}`) is *not* collectible by a syntactic scan, and that hole is **asserted** — `expect(dynamic).toEqual([])` — so the NOT COVERED bullet describing it is a measured fact rather than a guess.
- **`collectFiles()` returns `[]` on a missing directory rather than throwing.** A throw would be caught by whoever moved the directory, but the realistic version of this failure is a scan narrowed by a wrong glob, which never throws at all. Returning `[]` routes both cases into one named guard-the-guard assertion instead of a stack trace that buries which gate went quiet.
- **Guard-the-guard is asserted first in the file, and covers BOTH trees.** The plan asked for the e2e side (`specFiles.length >= 10` plus two named specs). The src side got the same treatment (`>= 50` of the 128 `.tsx` files) for the reason probe (d) below measures.
- **The three ungated counts are printed inside the gated assertion's failure message,** not merely recorded in a comment. When the floor breaks the first question is always "where did it go", and a rise in `.locator(` matching the fall in `getByRole` is the answer — see the watched red, where they moved 23 → 24 and 92 → 91 in the same message.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] A fourth watched red, and it is the one that matters**

- **Found during:** Task 2 (watching the guard-the-guard probe the plan prescribed)
- **Issue:** The plan's probe (c) — point the scanner at a non-existent directory — was run against `E2E_DIR` and produced **2 failed / 3 passed**: guard-the-guard fired, *and so did the floor*, because `0 >= 92` is false. That coincidence makes the probe a weak demonstration: a reader can conclude the floor covers the vacuity case, which is exactly backwards. The genuinely silent direction is the **absence** assertion, and the plan's three probes never touch it.
- **Fix:** Added the `tsxFiles.length >= 50` clause to guard-the-guard and ran a fourth probe with `SRC_DIR` pointed at `src-nope`. Result: **1 failed / 4 passed** — only guard-the-guard moved. **The undeclared-id ban PASSED**, reporting a perfectly clean `[]` against a tree it never opened, indistinguishable in every way from a real clean run and it would have stayed that way forever. That is now recorded verbatim as probe (d) in the gate's header with the generalisable rule stated: an absence assertion cannot notice that it was handed nothing, so it needs a positive control over its own scan.
- **Files modified:** `tests/design/selector-contract.test.ts`
- **Verification:** 4 probes run and reverted; the file is green at 5 passed and `git status` clean afterwards.
- **Committed in:** `9d6032c` (Task 2 commit)

**2. [Rule 1 - Bug] The plan's floor-probe target does not exist in the tree**

- **Found during:** Task 2 (the watched red for the floor)
- **Issue:** The plan's acceptance criterion says to rewrite "one `getByRole(` in `e2e/public-listing.spec.ts`" — that file holds exactly **two**, at lines 107 and 112, neither of which is the `getByRole("link", { name: "Book this space" })` shape the probe description implies.
- **Fix:** Used the real one at `:112` — `page.getByRole("button", { name: /book|not bookable yet/i })` → `page.locator('[data-testid="book-cta"]')`. Same regression shape (an accessible query traded for a structural one), real file, real line. The header records what was actually done, not what was prescribed.
- **Files modified:** `e2e/public-listing.spec.ts` (temporarily; reverted byte-for-byte, `git status -- e2e/` clean)
- **Verification:** 91 vs the 92 floor, `.locator(` 23 → 24 in the same failure message; reverted → 5 passed.
- **Committed in:** `9d6032c` (recorded in the header; no source change shipped)

**3. [Rule 1 - Bug] The plan's verification command reports the wrong drizzle file**

- **Found during:** Task 2 (running the plan's `<verification>` block)
- **Issue:** `ls drizzle/ | tail -1` returns **`meta`**, not `0025_audit_resolved_by.sql`, because `ls` sorts the `meta/` directory last. Read literally, GATE-06's standing check fails on a healthy tree — a criterion that is red for a reason unrelated to what it is checking is a criterion people learn to ignore.
- **Fix:** Verified with `ls drizzle/*.sql | tail -2`, which returns `0024_audit_table.sql` and `0025_audit_resolved_by.sql`. **GATE-06 intact — no migration added.** Recorded here so later plans in this phase use the corrected command.
- **Files modified:** none
- **Verification:** `ls drizzle/*.sql | tail -1` → `drizzle/0025_audit_resolved_by.sql`
- **Committed in:** n/a (a documentation correction, no code change)

---

**Total deviations:** 3 (1 missing-critical, 2 plan-vs-tree corrections)
**Impact on plan:** No scope creep. The fourth probe is one assertion and one probe run; it closes the plan's own stated purpose (anti-vacuity) in the one direction the prescribed probes could not reach.

## Issues Encountered

- **The plan's NOT COVERED "footer" is the tail of the header block, not the bottom of the file.** The plan says "close with a NOT COVERED footer" and cites `tests/use-server-exports.test.ts:89-102` as the precedent — and at those lines it is the last section of the *header* comment, immediately before the imports. That is where this file's NOT COVERED sits, matching the precedent's actual shape rather than its name. Every design gate in this repo puts it there, and it is where readers look.
- **Nothing else.** No package installed, no config touched, no existing file modified. `git diff --stat package.json` empty.

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run --config vitest.design.config.ts tests/design/selector-contract.test.ts` | 5 passed |
| `npm run test:design` | **24 files / 470 tests passed** (was 23 / 465 — file count +1 exactly, as the plan requires) |
| `npm run lint` | 0 errors, 9 warnings — byte-identical to the phase baseline |
| `git diff --stat package.json` | empty (T-11-SC: zero packages) |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| `src/` `data-testid` occurrences | 0 (the ban is green against a real 128-file scan, not an empty one) |

## Known Stubs

None. Both files are complete as declared. The 17 ids are declarations of intent by design — `src/` renders none of them yet, which is the state the `owner` column and plan `11-22` exist to resolve, and it is documented in both files rather than presented as coverage.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. Two of the plan's four registered threats are mitigated here as designed:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-11-SELDOWN | mitigate | The D-32 floor, inside `npm run build`; watched red at 91 vs 92 |
| T-11-VACUOUS | mitigate | Guard-the-guard over **both** trees + two synthetic self-tests; the src-side vacuity was measured, not argued |
| T-11-A11YLOSS | accept | Scope rule documented in the inventory header; Phase 17's axe pass owns breadth |
| T-11-SC | mitigate | Zero packages; `git diff --stat package.json` empty |

## Next Phase Readiness

- **Every downstream plan that adds a hook is unblocked and already constrained.** 11-06 (`price-total`), 11-07 (the three skeleton shapes), 11-08 (`result-card`/`row-card`/`panel-card`/`page-header`), 11-09 (`empty-state`/`error-state`/`responsive-dialog`), 11-10 (the four `site-*` chrome ids), 11-14 (`site-footer`) and 11-15 (`legal-placeholder-notice`) each cite this gate in their own acceptance criteria. Any id they invent that is not in `SELECTOR_IDS` fails `npm run build`.
- **Plan 11-22 has what it needs.** `collectTestIds()` is the scan to reuse for the forward direction, `SELECTOR_IDS` is the set to compare against, and the `owner` column is what turns a missing id into a named accountable plan. That plan must also delete the now-stale NOT COVERED bullet — the file says so in the bullet itself.
- **One caution for wave 4 onwards.** The ban is syntactic: it sees string literals in `.tsx` JSX attributes. If a pattern component ever forwards a `data-testid` it received as a prop rather than writing the literal, the literal still has to appear at some call site for the ban to see it — a component that constructs the id internally is invisible to this gate and to `11-22`'s forward assertion alike.
- **GATE-04 remains Pending.** Two clauses outstanding: `11-05` (the mutation proof) and `11-22` (the forward direction).

## Self-Check: PASSED

Both created files exist on disk; all three commits (`1f82ccc`, `9d6032c`, `7aed77e`) resolve in `git log`.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-13*
