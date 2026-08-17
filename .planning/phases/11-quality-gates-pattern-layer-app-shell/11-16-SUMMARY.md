---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 16
subsystem: ui
tags: [design-system, empty-state, react, tailwind, vitest, typescript-ast, accessibility]

# Dependency graph
requires:
  - phase: 11-09
    provides: "`EmptyState` (the one shell, `titleAs` + `tone` discriminated union), `ErrorState` (whose REQUIRED `routeOut` is why the search error block could not be converted)"
  - phase: 11-11
    provides: "`ResultCard`/`RowCard` adoption on the list rows these empty states sit beside"
  - phase: 11-13
    provides: "`card-pattern-coverage.test.ts` — the forward/inverse + declared-allow-list gate idiom this file copies"
provides:
  - "STATE-04 closed: eleven empty blocks across nine surfaces on ONE shell, with a real heading element everywhere"
  - "Host inbox-zero reads as an achievement (`tone=\"positive\"`, green on the glyph only) — AC#24"
  - "`tests/design/empty-state-adoption.test.ts` — AC#23 asserted over a STATED scope, with a 10-row declared exclusion inventory and 6 recorded watched-red probes"
  - "A measured correction to the 11-UI-SPEC's empty-state inventory (5 errors) and to the `border-dashed` count (20 at HEAD, not 19)"
affects: [11-17, 11-18, 11-21, phase-12-checkout, phase-13-bookings-trust, phase-14-host-tooling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Declared-exclusion inventory keyed by FILE with a per-file site COUNT (not line numbers), so a twelfth panel inside an already-listed file still goes red"
    - "`renderToStaticMarkup` + `createElement` for a real render assertion inside a `.test.ts` — no jsdom, no `@vitest-environment` pragma, design config's node environment intact"
    - "Directive-prologue detection over the AST (`sf.statements[0]` is an ExpressionStatement whose expression is `\"use client\"`), because the pattern's own header quotes the directive to explain it does not use one"

key-files:
  created:
    - tests/design/empty-state-adoption.test.ts
  modified:
    - src/components/search/search-results.tsx
    - src/app/(app)/bookings/page.tsx
    - src/app/(host)/host/requests/page.tsx
    - src/app/(host)/host/listings/page.tsx
    - src/app/(host)/host/bookings/page.tsx
    - src/app/(host)/host/earnings/page.tsx
    - src/app/(host)/host/page.tsx
    - src/components/group/attendee-roster.tsx
    - src/components/notifications/notification-bell.tsx
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md

key-decisions:
  - "AC#23's scope is `border-dashed` EMPTY-LIST panels, not the class. The tree uses the class for three jobs (empty-list panel, availability-state panel, dropzone) and only the first is STATE-04's subject — stated in the gate's header, carried as a 10-row inventory with a reason each and an asserted size."
  - "`search-results.tsx`'s first dashed block is an ERROR, not an empty state, and is deliberately NOT converted. `EmptyState` there would say 'there is nothing here' about a search that never ran — the inversion of T-11-FALSEALARM. `ErrorState` needs a `routeOut` product decision belonging to plan 11-18. Carried as a declared exclusion + a deferred-items entry."
  - "NINE conversion sites, not the plan's eight: `/host/earnings` and `/host` both shipped real empty blocks since Phase 5, and `/host` was a THIRD shell variant (`rounded-lg` + `p-8`, no prose measure) the UI-SPEC's two-shell table never named."
  - "The roster's zero lives in `components/group/attendee-roster.tsx`, not the page the plan named — that page renders `<AttendeeRoster>` and owns no zero-branch."
  - "`notification-bell.tsx` imports the shell directly despite being `\"use client\"`. The pattern keeps no directive prologue (T-11-CLIENTCREEP holds); passing it down from `ambient-notifications.tsx` was rejected because that file's header states it renders no product copy, and these two sentences are product copy."
  - "The bell at zero is `tone=\"neutral\"` despite shipping the same sentence as `/host/requests`: a bell at zero is ambient, nobody achieved it. AC#24 pins exactly ONE positive empty state, asserted."
  - "`bg-success` is banned across `src/app/**` + `src/components/**`, not `src/**` — the first gate run went red on `src/lib/design/contrast-pairs.ts:250`, the `note:` string that DECLARES the rule the assertion enforces."

patterns-established:
  - "Declared exclusion by file + count: `NON_EMPTY_STATE_DASHED` rows carry `{ file, sites, why }`; closure is asserted as 'every found site must be declared' (not the reverse), which is why probe (f) fired where 11-13's equivalent went vacuous"
  - "Guard-the-guard runs FIRST and includes a matcher positive control separate from the pinned totals, so a broken regex reports 'the scanner stopped seeing' rather than 'the tree changed'"

requirements-completed: [STATE-04]

# Metrics
duration: 40min
completed: 2026-08-17
---

# Phase 11 Plan 16: Empty-State Adoption Summary

**Eleven empty blocks across nine surfaces collapsed onto one `EmptyState` shell with a real heading element everywhere, host inbox-zero flipped to a positive state with green on the glyph alone, and AC#23's `border-dashed` claim answered by a 10-row declared inventory instead of a widened regex — plus one block that is an error and was deliberately left alone.**

> **THIS PLAN WAS RESUMED FROM AN INTERRUPTED RUN.** A prior 11-16 executor died having written the
> nine source conversions and the two authorings to disk but having committed nothing, with the gate
> file (`tests/design/empty-state-adoption.test.ts`) not created at all even though the inherited
> comments already referenced it and a `NON_EMPTY_STATE_DASHED` constant inside it by name. See
> **Inherited vs. Verified** below for exactly what was checked, what was kept, and what was changed.

## Performance

- **Duration:** ~40 min (excluding a ~15 min bounded, failed attempt to bring Docker back up)
- **Started:** 2026-08-17T12:44:00Z
- **Completed:** 2026-08-17T13:24:00Z
- **Tasks:** 3
- **Files modified:** 9 source + 1 test created + 1 planning doc

## Inherited vs. Verified

The uncommitted tree was **verified before it was trusted**, not adopted. What was done:

| Check | Method | Result |
|---|---|---|
| Every changed hunk read | `git diff` on all 9 files | All nine are 11-16 conversion work; none touches an unrelated surface |
| Copy byte-identity | Script: extract every `<h2>`/`<p>` text node from `f822329:<file>`, HTML-unescape, collapse JSX whitespace, compare to the new `title`/`body` prop values | **17 of 18 strings identical.** The one change is the intended `/host/requests` title |
| The four `host/bookings` "NEW" rows | Manual read of `f822329:src/app/(host)/host/bookings/page.tsx:189-200` | False negatives from the extractor — they were already JS literals in `{…}`, passed through unchanged |
| The `${city}` cold-start body | Manual read of `f822329:src/components/search/search-results.tsx:241-248` | JSX `{city}` interpolation → template literal, otherwise identical |
| `p-10` eliminated | `grep -rn "p-10" src --include=*.tsx` | 1 hit, and it is `empty-state.tsx:9`'s drift TABLE in a comment. Zero in all five plan-named files |
| The two `variant="brand"` CTAs | Read both call sites | Both survive verbatim; only their wrapper offsets (`mt-6`, `mt-4`) dropped, because the pattern's actions row owns `mt-5` |
| Compiles / lints | `npx tsc --noEmit`, `npm run lint` | Clean; 0 errors, 9 pre-existing warnings |
| No pinned inventory disturbed | `npm run test:design` on the inherited tree, before writing anything | 33 files / 584 passed + 3 skipped — the exact phase baseline |

**The one inherited product decision, assessed and CARRIED.** `search-results.tsx`'s `fetchError`
block was deliberately not converted. The argument was checked against the tree rather than accepted:
`patterns/error-state.tsx:57` does name those exact lines as the markup `ErrorState` was extracted
from, and `ErrorStateProps.routeOut` (`error-state.tsx:88-94`) is genuinely **required** with a
stated intent that an error surface always offers two actions. The reasoning holds. It is now a
**declared, reasoned row in `NON_EMPTY_STATE_DASHED` with an asserted site count** — an exclusion with
an argument, not a hole — and a `deferred-items.md` entry addressed to plan 11-18.

**Nothing inherited was reverted or corrected.** All nine files were committed as found.

## Accomplishments

- **STATE-04 closed.** Nine dashed empty blocks converted plus two undesigned zero-states re-shelled;
  every empty region now renders a real `<h2>`/`<h3>` rather than a `<p>` that looks like one, at one
  radius and one padding.
- **AC#24 satisfied and asserted in both directions.** `/host/requests` reads *"You're all caught up"*
  with `CheckCircle2` at `text-success`; the title and body stay `--foreground`; `bg-success` is zero
  across the rendering layer outside the one wizard glyph Phase 10 pinned.
- **AC#23 answered honestly.** The gate states its scope in plain words in the file, carries the ten
  surviving non-empty-state dashed sites as declared data with a measured reason each, and pins the
  tree total at 11 so a twelfth site — anywhere, including inside a listed file — goes red.
- **Six watched-red probes run and recorded verbatim**, including two vacuity probes. Probe (e)
  measured the phase's recurring finding again: with the scanner blinded, **15 of 31 assertions still
  pass, including the file's headline closure assertion.**

## Task Commits

1. **Task 1: Convert the shipped empty blocks** — `0820524` (feat)
2. **Task 2: Author/re-shell the roster and the bell** — `5c2fead` (feat)
3. **Task 3: The adoption gate** — `f39b60d` (test, includes `deferred-items.md`)

## Files Created/Modified

- `tests/design/empty-state-adoption.test.ts` — **created.** 31 assertions: AC#23 closure + the
  10-row inventory, the forward adopter half (11 files / 13 call sites), AC#24 (AST + a real render),
  T-11-CLIENTCREEP, 7 both-direction self-tests, 3 guard-the-guard.
- `src/components/search/search-results.tsx` — zero-result + cold-start converted; the `fetchError`
  block deliberately not, with the argument written at the call site.
- `src/app/(app)/bookings/page.tsx` — Upcoming and Past tabs; `p-10` → the pattern's `p-8`.
- `src/app/(host)/host/requests/page.tsx` — the one copy change and the only `tone="positive"`.
- `src/app/(host)/host/listings/page.tsx` — grid zero; brand CTA preserved.
- `src/app/(host)/host/bookings/page.tsx` — one call site, both tabs, icon forks with `tab`.
- `src/app/(host)/host/earnings/page.tsx` — a **conversion**, not the authoring the plan called for.
- `src/app/(host)/host/page.tsx` — **the ninth site the plan never listed**, and a third shell variant.
- `src/components/group/attendee-roster.tsx` — the roster's zero, `titleAs="h3"`.
- `src/components/notifications/notification-bell.tsx` — the panel's zero, `titleAs="h3"`, neutral.
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` — two entries.

## Copy Comparison (T-11-COPYDRIFT)

Old side extracted from `f822329`, HTML-unescaped and JSX-whitespace-collapsed; new side is the
literal prop value.

| Surface | Title | Body |
|---|---|---|
| search zero-result | identical | identical |
| search cold-start | identical | identical (`{city}` → `${city}`) |
| `/bookings` Upcoming | identical | identical |
| `/bookings` Past | identical | identical |
| `/host/requests` | **CHANGED** — "No requests right now" → "You're all caught up" | identical |
| `/host/listings` | identical | identical |
| `/host/bookings` ×2 | identical (already JS literals) | identical (already JS literals) |
| `/host/earnings` | identical | identical |
| `/host` | identical | identical |
| attendee roster | identical | identical |
| notification bell | identical | identical |

**18 strings, 17 byte-identical, 1 deliberate change** — the one STATE-04 asks for.

## Decisions Made

See `key-decisions` in the frontmatter. The two that most constrain later plans:

1. **The `border-dashed` scope is EMPTY-LIST PANELS, not the class.** Stated in the gate's header in
   plain words: the tree uses the class for empty-list panels (STATE-04's subject), availability-state
   panels (Phase 12's day-detail rail — occupancy and errors, where `EmptyState` would misreport a
   fully-booked day as empty), and one dropzone (where the dashed edge genuinely means "drop here").
2. **`bg-success` is banned across the RENDERING layer only.** Widening it to `src/lib/**` would force
   `contrast-pairs.ts:250` — the sentence that declares the rule — off the page. That is the
   grep-versus-comment collision arriving through a `note:` field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Wrong inventory] The plan's eight conversion sites are nine, and one of the eight is not an empty state**

- **Found during:** Task 1 (inherited work, verified by an AST scan)
- **Issue:** The 11-UI-SPEC's empty-state inventory is wrong in five places. `/host/earnings` and
  `/host` were listed as out-of-scope dashed sites to EXCLUDE (and `/host/earnings` *also* as a
  surface with "no empty state today" needing one AUTHORED); both have shipped real empty blocks since
  Phase 5. `/host` was a THIRD shell variant the two-shell table never named. `search-results.tsx:170`
  was counted as one of the eight empty states and is the shipped inline error.
- **Fix:** Nine blocks converted; the error block declared as an exclusion with a written argument and
  a deferred-items entry for 11-18.
- **Files modified:** all nine source files; `tests/design/empty-state-adoption.test.ts`
- **Verification:** `git grep border-dashed` at `f822329` (20 className sites, not the plan's 19) and
  the gate's own AST scan (11 surviving)
- **Committed in:** `0820524`, `f39b60d`

**2. [Rule 1 — Wrong inventory] `NON_EMPTY_STATE_DASHED` is 10 rows, not the plan's 11**

- **Found during:** Task 3
- **Issue:** The plan asked for exactly 11 entries. Its own enumerated list contained 10 items, and
  two of those ten turned out to be conversions while three sites it never listed (the error block,
  `patterns/error-state.tsx` from 11-09, and the pattern's own shell) exist.
- **Fix:** The inventory is 5 files / 10 sites, each with a measured reason. Both sizes are pinned
  separately, and a third constant pins the tree total at 11 (= 10 + the one shell). The arithmetic
  and every discrepancy are written out in the gate's header.
- **Verification:** probe (f) — inventory emptied → 2 failed, both naming the emptying
- **Committed in:** `f39b60d`

**3. [Rule 1 — Wrong inventory] 13 `<EmptyState>` call sites in the tree, not the 11 this plan creates**

- **Found during:** Task 3 (first run of the gate went red)
- **Issue:** Plan 11-19 landed `src/app/not-found.tsx` and
  `src/app/listings/[id]/(detail)/not-found.tsx` on the shell *after* 11-16 was written. Any forward
  inventory copied out of the plan would have been wrong on its first run — which it was.
- **Fix:** Both declared in `ADOPTERS` with their reason, including why the third 11-19 not-found
  route (`invite/[token]`) deliberately does **not** use the shell (T-11-ORACLE byte-identity).
- **Verification:** `grep -rn "<EmptyState" src` → 13; gate green
- **Committed in:** `f39b60d`

**4. [Rule 3 — Blocking] A tree-wide `bg-success` ban is red on the rule's own declaration**

- **Found during:** Task 3 (first run)
- **Issue:** `src/lib/design/contrast-pairs.ts:250`'s `note:` field contains the string `bg-success`
  because it is the sentence declaring the rule. It is a string literal, so the AST sees it.
- **Fix:** `BG_SUCCESS_SCOPE = ["src/app/", "src/components/"]` — the plan's own stated scope — with
  the measurement written out as the reason.
- **Verification:** probe (d) — a real `bg-success` className added at `requests/page.tsx:139` → 1
  failed, and the page's own *comment* about `bg-success` at `:152` did **not** fire
- **Committed in:** `f39b60d`

**5. [Rule 3 — Blocking] The gate's own JSDoc contained a literal block-comment terminator**

- **Found during:** Task 3
- **Issue:** A docblock explaining that the AST beats a comment-stripping pass spelled the terminator
  literally, ended itself four words early, and failed to parse (`PARSE_ERROR` from `vite:oxc`).
- **Fix:** Reworded; the incident is recorded in the docblock as the twelfth instance of the phase's
  recurring grep/comment collision, this time inside the file arguing against it.
- **Committed in:** `f39b60d`

**6. [Rule 3 — Blocking] `LucideIcon` cannot be satisfied by a hand-rolled stub**

- **Found during:** Task 3
- **Issue:** The neutral render assertion used a local `(props) => <svg/>` as the `icon`. TS2769:
  `$$typeof` missing — `LucideIcon` is a `ForwardRefExoticComponent`.
- **Fix:** Use a real `InboxIcon`. Casting past the error would test a shape the pattern cannot
  receive. Noted at the call site.
- **Committed in:** `f39b60d`

---

**Total deviations:** 6 auto-fixed (3× Rule 1 inventory corrections, 3× Rule 3 blockers).
**Impact on plan:** No scope creep — one extra source file (`/host/page.tsx`) was converted because
leaving it would have left a raw dashed empty block *inside AC#23's own stated scope*. Every other
deviation is a correction to a number.

## Verification Run

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | clean |
| Lint | `npm run lint` | 0 errors, 9 pre-existing warnings |
| Design gate (baseline, before Task 3) | `npm run test:design` | **33 files / 584 passed + 3 skipped** |
| Design gate (after Task 3) | `npm run test:design` | **34 files / 615 passed + 3 skipped** — file count raised by exactly 1 |
| The new gate alone | `npx vitest run --config vitest.design.config.ts tests/design/empty-state-adoption.test.ts` | **31 passed** |
| Production build | `npm run build` (lint + design + `next build`) | **exit 0**, 24 routes emitted |
| GATE-06 (no new migration) | `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — unchanged |
| `p-10` gone from the five named files | `grep -rn "p-10" src --include=*.tsx` | 1 hit, `empty-state.tsx:9`, a comment TABLE |

### Watched red — 6 probes, all run, all reverted

Recorded **verbatim** in the gate's header (`tests/design/empty-state-adoption.test.ts:82-190`).
Green is **31 passed**.

| # | Probe | Result |
|---|---|---|
| (a) | `/host/listings`' `<EmptyState>` restored to its raw shell-B block from `f822329` | **5 failed / 26 passed** — the dashed shell coming BACK and the `<EmptyState>` going AWAY are separately caught |
| (b) | A 4th dashed panel added to `availability-calendar.tsx`, which is a declared row with `sites: 3` | **2 failed / 29 passed** — the failure a flat list of line numbers would miss |
| (c) | `/host/requests` flipped to `tone="neutral"` (+`icon`, because the union makes the tone-less form a compile error) | **2 failed / 29 passed** |
| (d) | `className="mt-8 bg-success"` added to `/host/requests` | **1 failed / 30 passed**, naming `:139` — the page's own comment about `bg-success` at `:152` did not fire |
| (e) | **VACUITY** — `SRC_DIR` → `src-nope` | **16 failed / 15 passed.** Among the 15 that PASS is the headline closure assertion, both render assertions, all 7 self-tests and all 4 size pins. Only the three guard-the-guard tests and the pinned totals fire |
| (f) | **VACUITY** — `NON_EMPTY_STATE_DASHED` = `[]` (rows kept alive under an unused binding) | **2 failed / 29 passed** — and unlike 11-13's probe (c), the **closure assertion DID fire**, because closure is stated as *every found site must be declared* rather than the reverse |

Probe (e) is the phase's recurring finding measured again, and it is the entire reason the
guard-the-guard block runs first and carries a matcher positive control that is separate from the
pinned totals.

## Issues Encountered

**Docker is down on this machine, so the DB-backed suite and e2e could not run.** `npm test` aborts in
`tests/global-setup.ts:67` (`cannot reach the test database`). `npm run db:up` fails —
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`. Docker Desktop was
launched and its processes are alive (`com.docker.backend`, four `Docker Desktop` PIDs), but
`wsl --list --verbose` reports **both `Ubuntu` and `docker-desktop` as `Stopped`** and a direct
`wsl -d docker-desktop` boot does not bring the distro up. Three bounded auto-fix attempts were made;
per the fix-attempt limit, no further attempts were made and this is carried below.

**Why this does not leave the plan unverified:** measured rather than assumed — **no test outside
`tests/design/**` imports any file this plan touched.** `grep -rln` across `tests/` for
`search-results|attendee-roster|notification-bell|patterns/empty-state|host/requests|bookings/page`
returns nine files; six are design tests (all green, 34 files) and the other three
(`booking/request-lifecycle.test.ts`, `booking/when-label.test.ts`, `notifications/notify.test.ts`)
match only in **prose comments and one unrelated URL string** — verified by reading every hit. The
DB-backed suite is structurally unable to see these changes. `npm run build` — which runs lint, the
full design suite and `next build` — exits 0.

## Deferred Issues

1. **`npm test` (full DB suite) and e2e not run — Docker/WSL down.** Not caused by this plan and not
   fixable from it. Whoever has an environment with Docker up: `npm run db:up && npm run db:test:setup
   && npm test`. Expected baseline from 11-14 is 1217 passed / 4 skipped. E2E carries two known
   pre-existing reds (`e2e/open-capacity.spec.ts:376`, `e2e/search-and-book.spec.ts:318`).
2. **Task 2's runtime criterion is only statically proven.** The plan asked that the three surfaces be
   seen rendering `[data-testid="empty-state"]` against a seeded account with no payouts, no attendees
   and no notifications. The static chain is complete and asserted — each surface's zero-branch renders
   `<EmptyState>` (AST), and `<EmptyState>` renders `data-testid="empty-state"`
   (`renderToStaticMarkup`) — but the browser half needs the DB. Plan **11-21**'s Playwright pass is
   where it enters the permanent suite.
3. **Push and CI not run** (D-25). Three commits sit on `dev` unpushed; the orchestrator owns the push.

## Threat Flags

None. No new network surface, no auth path, no file access and no schema change — nine presentational
component edits and one DB-free test file. The plan's four threat-register rows are all `mitigate` and
all satisfied: **T-11-FALSEALARM** (the positive tone, plus the refusal to render an error through
`EmptyState`), **T-11-CLIENTCREEP** (asserted: the pattern has no directive prologue),
**T-11-SCOPEROT** (a declared inventory with an asserted size, not a widened regex),
**T-11-COPYDRIFT** (18 strings diffed, table above). **T-11-SC**: zero packages added.

## User Setup Required

None.

## Next Phase Readiness

- **11-17 / 11-18** inherit a shell that is now adopted and gated. **11-18 specifically owns the one
  open item this plan created**: `search-results.tsx`'s error block needs a `routeOut` answer before it
  can move to `ErrorState`. It is a sixth call site for the same decision, and it is written up in
  `deferred-items.md`.
- **Phase 14 (HFLOW-01)** *adopts* this component and does not re-decide it. A new host-tooling empty
  surface must extend `ADOPTERS` in its own commit — the gate going red on it is the gate working.
- **A standing warning for 11-17 and 11-18:** this is the sixteenth consecutive Phase-11 plan whose own
  surface inventory was wrong. Both of those plans inventory files this one corrected (`/host/page.tsx`,
  the 11-19 not-found routes). Enumerate with an AST scan first.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-17*

## Self-Check: PASSED

- `tests/design/empty-state-adoption.test.ts` — exists
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-16-SUMMARY.md` — exists
- Commits `0820524`, `5c2fead`, `f39b60d` — all present in `git log --all`
- All nine modified source files present and committed; working tree clean apart from the orchestrator's `.planning/config.json`
