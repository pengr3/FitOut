---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
audited: 2026-08-30
audited_at_commit: c4845a9
register_authored_at_plan_time: true
asvs_level: unset
block_on: high
threats_total: 81
threats_closed: 80
threats_open: 1
threats_blocking: 0
dispositions:
  mitigate: 61
  accept: 20
  transfer: 0
unregistered_flags: 3
status: passed_with_warnings
---

# Phase 17 — Security Audit

**Phase:** 17 — Cross-Cutting Audit: Themes, Responsive, A11y & Baselines
**Register origin:** plan-time. Extracted from the `<threat_model>` block of all 14 `17-NN-PLAN.md` files.
**Register size:** 81 rows — `T-17-01` … `T-17-80` plus `T-17-SC` (17-01's supply-chain row, which does
not fit the numeric sequence and is easy to drop; it is counted here).
**Verdict:** 80 CLOSED / 1 OPEN. The one OPEN row is WARNING-severity and does not meet `block_on: high`.

Every CLOSED row below cites a file:line or a command whose output was read during this audit. No row is
closed on the strength of a SUMMARY or a plan asserting it was done. Where a mitigation's evidence is a
test, the test was run and its guard-the-guard structure was read.

## Commands run for this audit

| Command | Result |
|---|---|
| `npx vitest run tests/security/dev-today-override.test.ts` | **21 passed** (1 file) |
| `npm run test:design` | **67 files, 1255 passed / 3 skipped** |
| `npx tsc --noEmit` | exit **0** |
| `node scripts/verify-workflows.mjs` | exit **0** — **38 invariants** across baselines / ci / cross |
| `git status --porcelain` | `?? .claude/` only — `src/` and `drizzle/` clean |
| `git diff e439bf9 HEAD --stat -- src/` | 22 files, 851 insertions / 27 deletions — all read |
| `git diff e439bf9 HEAD -- e2e/auth-keyboard.spec.ts` | 22 insertions, **zero** non-comment lines |
| `git ls-files '*-visual-linux.png' \| wc -l` | **36**; grove **0**; non-linux platform baselines **0** |
| `ls drizzle/*.sql \| wc -l` | **26**, ending `0025_audit_resolved_by.sql` |
| `gh run view 33298297450 --json jobs` | `ci` **success**; all 4 jobs incl. `gate-visual` success on `247d1e4` |

---

## The highest-risk change, traced independently

### `src/lib/dev/today-override.ts` + `src/app/listings/[id]/(detail)/page.tsx`

The phase brief asked me to verify the prior review's "display-only" conclusion rather than inherit it.
**I traced it and the prior conclusion is directionally right but imprecise.** The corrected trace:

**Where the client-controlled value actually goes** (`page.tsx:414` → `:415` `todayLocal`):

| Sink | Reached? | Evidence |
|---|---|---|
| A database read | **YES** | `page.tsx:469` `await getAvailability(db, id, initialDate)` and `:488` `getOpenMonthAvailability(db, id, {year, month})`. `initialDate` falls back to `todayLocal` (`:465`). |
| The bookable horizon | **YES, display-level only** | `page.tsx:435` `todayStartMs` / `:441` `horizonEndMs` gate `openOnSearchedDay` (`:458-459`); `todayDate={todayLocal}` is passed to `AvailabilityCalendar` (`:615`) and `BookingPanel` (`:794`, `:842`), where it drives the calendar's disabled matchers (`availability-calendar.tsx:500`). |
| A cache key | **NO** | Zero `unstable_cache` / `export const revalidate` / `"use cache"` under `src/app/listings/`. The route is dynamic because it awaits `searchParams`. |
| Pricing | **NO** | Prices come from `pub.hourlyRateCents` / `dayRateCents` / `perHeadPriceCents` off the listing row. `todayLocal` never enters a price expression. |
| A booking mutation | **NO** | `placeHold` (`src/app/actions/booking.ts:122`) accepts no `today`/`now`. It re-reads `canBook` from the DB (`:133`), re-validates via `bookingCreateSchema` (`:145`), re-derives bookability server-side (`:165+`), and reads time from **Postgres** (`:795` `SELECT now()`), not the JS clock. |

**Why reaching a DB read is not a finding here.** The value is three integers from `parsePickedDate`
(`window-params.ts:39-53` — anchored regex, range check, `Date.UTC` round-trip guard), passed to `TZDate`
constructors and never interpolated into SQL. It selects **which day's availability to read** — a day any
anonymous visitor can already select through the calendar's own day-change fetch. It widens no capability.

**Why moving the horizon is not a finding here.** Slot truth is not derived from it: `read-model.ts:307`
computes `beyond_horizon` from `isWithinHorizon(s.startUtc, now)` where `now` is `getAvailability`'s own
`now: Date = new Date()` default (`read-model.ts:177`) — the override never becomes it. `initialSelection`
is explicitly advisory (`page.tsx:475-479`) and `placeHold` re-derives inside its own transaction.

**The guard.** `today-override.ts:55` — `if (process.env.NODE_ENV === "production") return null;` is the
first statement of `devTodayOverride`, asserted as such by `tests/security/dev-today-override.test.ts:133-145`
(both a `toContain` on the exact string and a computed first-non-comment-statement check), with a single-
env-read pin at `:146-152`. The guard is a **runtime** check and is sufficient on its own; the dead-code-
elimination claim is a bonus property, not what the security rests on (this matches review finding IN-02).

**The test would go red.** Verified, not assumed: it carries a positive control (`:127-131` — the same
value IS honoured outside production, so an always-null function cannot pass), a stub-leak isolation
assertion (`:117-125`), a comment-strip guard-the-guard in both directions (`:154-168`), and a `src/`-wide
referrer-set assertion over **352 files** with a `MIN_SCANNED_FILES = 200` floor (`:303`, `:311-321`). Three
of its assertions were red-watched during the code review with the observed output recorded verbatim
(WR-01/02/03). It runs in CI: `vitest.config.ts:68` includes `tests/**/*.test.ts`, and `ci.yml:741` runs
`npm test` in the `gate-db` job.

**Production inertness was measured end-to-end**, not only asserted — `deferred-items.md` `[17-D26]`
records a dev `:3000` vs production-build `:3101` probe: `&today=2026-09-16` moves the calendar to
September / 15 disabled on dev, and is **identical in every field** on the production build.

**Residual, recorded not blocking:** see R-1 and R-3 below.

### The four dev-only throw routes

Verified independently of the status code, as the brief asked. All four carry, in this order: exactly
**one** `process.env` reference; `if (process.env.NODE_ENV === "production") notFound();` as the first
statement of the component; then `throw new Error(SENTINEL_LEAK_PROBE)`.

| Route | guard | throw | `process.env` count | `robots` |
|---|---|---|---|---|
| `src/app/(app)/dev-throw-app/page.tsx` | `:93` | `:100` | 1 | `:89` |
| `src/app/(auth)/dev-throw-auth/page.tsx` | `:73` | `:78` | 1 | `:69` |
| `src/app/(host)/host/dev-throw/page.tsx` | `:91` | `:96` | 1 | `:87` |
| `src/app/(legal)/dev-throw-legal/page.tsx` | `:75` | `:80` | 1 | `:71` |

`notFound()` throws before the sentinel throw is reached, so the control holds regardless of the status
line. The documented soft 404 on `/host/dev-throw` (`[17-D2]`) is a **status-line** finding: the ledger row
records that on the production probe the guard fired, the throw did not happen, `SENTINEL_LEAK_PROBE`
appeared **0** times in the served bytes, and no boundary rendered. Exactly one
`export const SENTINEL_LEAK_PROBE` exists in `src/` (`src/app/dev/throw/page.tsx:78`); all four routes
import it rather than retyping it, which is what makes `e2e/error-leak.spec.ts`'s zero-count assertion a
statement about the same string.

---

## Threat verification — full register

Legend: **C** = closed, **O** = open. `accept` rows are closed when the accepted risk is logged (this file's
§ Accepted Risks, plus the phase's own `deferred-items.md` where applicable).

### Plan 17-01 — axe harness

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-SC | Tampering | `@axe-core/playwright@4.13.0` | mitigate | **C** | `package-lock.json`: exactly two axe entries (`@axe-core/playwright@4.13.0`, `axe-core@4.13.0`), both `scripts: null`, `hasInstallScript: false`. `devDependencies` only — `dependencies` has zero axe packages. |
| T-17-01 | Repudiation | `expectAxeClean` | mitigate | **C** | `e2e/helpers/axe.ts:160` (`passes.length > 0`) and `:167` (`scannedNodes >= MIN_SCANNED_NODES`, constant `= 8` at `:124`, derived from four recorded probes) both assert **before** the violation list at `:175`. |
| T-17-02 | Repudiation | `.exclude()` | mitigate | **C** | `grep -rn "\.exclude(" e2e/` → exactly **1** hit, `e2e/helpers/axe.ts:86`, with its reason committed at `:70-85`. `grep -rn "disableRules" e2e/ src/ tests/` → **0**. |
| T-17-03 | Info disclosure | axe in client bundle | mitigate | **C** | `grep -rn "axe-core\|AxeBuilder" src/` → **empty**. |
| T-17-04 | Tampering | GATE-06 / `drizzle/` | accept | **C** | `git status --porcelain drizzle/` empty; 26 `.sql`; digest test green. Logged as AR-01. |

### Plan 17-02 — build-blocking design gates

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-05 | Tampering | `drizzle/*.sql` | mitigate | **C** | `tests/design/money-path-invariants.test.ts:93-95` — `createHash("sha256")` from `node:crypto` over `name + NUL + bytes`; guard-the-guard at `:108-113` (`> 20` before any pin); red-watch recorded `:129-146` (one-character edit → RED, digest delta quoted). Runs inside `npm run build`. Suite green. |
| T-17-06 | Repudiation | grove-baseline scan | mitigate | **C** | `tests/design/gitignore-baselines.test.ts:588-596` — positive control (`>= MIN_COURT_BASELINES = 30`) asserted **before** the zero-grove clause at `:602`. On disk: 36 court baselines, 0 grove. |
| T-17-07 | Repudiation | `focus-definition.test.ts` | mitigate | **C** | Three guard clauses `(a)` `:397-403`, `(b)` `:411-418`, `(c)` `:422-434`, all before the verdict clauses at `:472`/`:476`; both-directions synthetic self-test at `:505-549` driving the same functions. |
| T-17-08 | EoP | new source under `src/` | accept | **C** | 17-02 wrote only under `tests/design/`. Logged as AR-02. |

### Plan 17-03 — one-tree classifier and selector contract

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-09 | Repudiation | `one-tree.test.ts` classifier | mitigate | **C** | File-count floors and discriminating positive control at `:590-602`, asserted before the empty-list clause at `:665`; `lg:hidden` non-flag fixture in the self-test. Suite green. |
| T-17-10 | Repudiation | `matchMedia` count | mitigate | **C** | `tests/design/one-tree.test.ts:296-303` — `isMatchMediaCall` requires `ts.isCallExpression`; the `typeof window.matchMedia` guard at `publish-checklist.tsx:148` reaches the predicate as no CallExpression at all (`:293-294`). Header records the string-count would return 2 on correct code. |
| T-17-11 | Tampering | `SELECTOR_CONTRACT` | mitigate | **C** | `src/lib/design/selector-contract.ts:262` — `Record<SelectorId, SelectorRow>` (total) over the `as const` tuple at `:233`. No `Partial<Record>`, no index signature. `npx tsc --noEmit` exit **0**. |
| T-17-12 | Info disclosure | new `data-testid` | accept | **C** | Two values added: `search-results-region` (`search-results.tsx`), `availability-calendar` (`availability-calendar.tsx`). Structural container names; no user data, no session state. Logged as AR-03. |
| T-17-13 | Tampering | `drizzle/` | accept | **C** | Clean. AR-01. |

### Plan 17-04 — wrap and sticky-bar measurement

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-14 | Repudiation | `expectNoWrap` | mitigate | **C** | `e2e/helpers/nowrap.ts:144-146` (non-empty text) and `:150-153` (`Number.isFinite(m.lineHeight)`) both assert before the height clause at `:168`. Compared against the element's own resolved line-height, not a literal. |
| T-17-15 | Repudiation | sticky-bar clause | mitigate | **C** | Assertions read `boundingBox()` geometry (`e2e/overflow-320.spec.ts:1492`, `:2356-2357`, `:3288`, `:3517`) and `scrollY === 0` is asserted not assumed (`:1450`). `grep "pb-20\|toHaveClass" ` over the spec → no class-list assertion for this clause. |
| T-17-16 | Tampering | product source under `src/` | mitigate | **C** | `git status --porcelain src/` empty. The phase's whole `src/` diff (22 files) was read line by line for this audit: all changes are `size="touch"` variant conversions, `data-testid` additions, `titleAs`/`aria-labelledby` a11y fixes, one `p-1.5` utility, and comment corrections. No copy shortened, no disclosure dropped. |
| T-17-17 | Tampering | `drizzle/` | accept | **C** | AR-01. |
| T-17-18 | Info disclosure | seeded data in failure messages | accept | **C** | `playwright.config.ts` `webServer` boots `npm run dev` on localhost; fixture DB only. AR-04. |

### Plan 17-05 — vendored slider and DS-09 ceiling

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-19 | Tampering | `src/components/ui/slider.tsx` | mitigate | **C** | Within plan 17-05's scope: `slider.tsx` is the only vendored file it touched. ⚠ **See UF-2** — a second vendored file (`progress.tsx`) was edited later in the phase by the code-review pass. |
| T-17-20 | Spoofing | `aria-disabled` on an interactive control | mitigate | **C** | `src/components/ui/slider.tsx:121` — `aria-disabled={props.disabled \|\| undefined}`. `\|\| undefined`, not `\|\| false`, matching `thumbLabel` at `:54`. Rationale committed at `:74-80`. |
| T-17-21 | Repudiation | DS-09 ceiling | mitigate | **C** | `tests/design/brand-recipe.test.ts:721` — the ceiling is now a `ZERO <Button> elements hand-roll the height` requirement with the offender-listing message retained. Already-blocking gates untouched: `git diff --name-only e439bf9 HEAD -- eslint.config.mjs tests/design/leak.test.ts` → **empty**. |
| T-17-22 | Tampering | `drizzle/` | accept | **C** | AR-01. |
| T-17-23 | Info disclosure | committed baseline PNGs | accept | **C** | Predicted PNG delta written before dispatch; 5 predicted / 5 changed / 0 minted (`[17-D26]`). Signed-out fixture surfaces. AR-05. |

### Plan 17-06 — overlay scope and shell inclusion

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-24 | Repudiation | sheet-open row | mitigate | **C** | `e2e/overflow-320.spec.ts:548` — `scope: '[data-testid="responsive-dialog"]'`, routed through `expectNoOverflowWithin` at `:1009`; row `tell` at `:569`. |
| T-17-25 | Repudiation | AC#30 `expectTargets` | mitigate | **C** | `e2e/overflow-320.spec.ts:2249-2254` — the `tell` guard is a hard `.not.toHaveCount(0)` expect that runs first; `expectTargets` at `:2273` runs after it. |
| T-17-26 | Repudiation | `collectControls` shell exclusion | mitigate | **C** | Narrowed, not deleted: the `site-header` half is gone and the **footer** half survives with a measured reason (`:2574-2579`). A control at `:3445-3446`/`:3478` fails loudly if the header exclusion were restored — so the narrowing is asserted, not just described. |
| T-17-27 | Tampering | header layout | mitigate | **C** | `HEADER_CLUSTER_BUDGET_PX = 226` at `:3450`, assertion + failure message at `:3528-3529`. No element shrunk to make room (`src/` diff read). |
| T-17-28 | EoP | `signUpAndReachProfile` | accept | **C** | Pre-existing Phase-15 fixture, local dev server + fixture DB. AR-06. |
| T-17-29 | Tampering | `drizzle/` | accept | **C** | AR-01. |

### Plan 17-07 — the axe sweep

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-30 | Repudiation | `.exclude()` used to turn a red green | mitigate | **C** | Exactly one `.exclude()` repo-wide (`e2e/helpers/axe.ts:86`); the `global-error` exclusion is a **table row with its corrected reason** (`e2e/axe-sweep.spec.ts:301-318`, `:793-805`), not a silent omission; `disableRules` → 0 hits. ⚠ The clause *"every skip throws its reason into the run's output"* is measurably false — see T-17-45 / OT-01. |
| T-17-31 | Repudiation | scan over an unresolved surface | mitigate | **C** | `expectReachable` runs before every measurement (`e2e/overflow-320.spec.ts:932`, `:1002`); the axe vacuity guards are `e2e/helpers/axe.ts:160`/`:167`. Header at `:100-122` records the four measured probes that set the floor and warns that a 404 route is **not** a vacuity probe. |
| T-17-32 | Repudiation | a surface silently absent from the table | mitigate | **C** | The D-201 route-set-equality assertion is not vacuous and this was **proved in anger**: the phase verifier found it RED at 46 route files vs 42 declared rows, and it was closed by `64da86f` (four `dev-throw-*` rows added as named skips). An assertion that has been observed failing against the real tree is the strongest evidence available. |
| T-17-33 | Tampering | product source reshaped to clear a violation | mitigate | **C** | `git status --porcelain drizzle/` empty; `src/` diff read in full; escalate-class findings routed to `deferred-items.md` (25 rows). |
| T-17-34 | Spoofing | axe `color-contrast` overruling the inventory | mitigate | **C** | `git diff e439bf9 HEAD -- src/lib/design/contrast-pairs.ts` is **comment-only** (no declared pair added or changed); no token file changed (`globals.css` / `src/styles/` absent from the diff); `contrast.test.ts` green in `npm run test:design`. No colour edited at a call site. |
| T-17-35 | Info disclosure | axe results in CI artifacts | accept | **C** | Localhost fixture data only. AR-07. |

### Plan 17-08 — keyboard composites

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-36 | Repudiation | dev-overlay filtering | mitigate | **C** | `partitionAsserted` at `e2e/keyboard-composites.spec.ts:293`, used at `:330` — the same function copied from `auth-keyboard.spec.ts:456`. |
| T-17-37 | DoS | focus trap hanging the run | mitigate | **C** | `WALK_BOUND = 40` at `e2e/helpers/focus.ts:347`; bound asserted as a named failure at `auth-keyboard.spec.ts:482-485` and `:717-719`. Not raised this phase. |
| T-17-38 | Repudiation | a second focus-indicator definition | mitigate | **C** | `grep -c "outlineStyle\|boxShadow" e2e/keyboard-composites.spec.ts` → **0**; `expectRing` used **6** times. `tests/design/focus-definition.test.ts` makes a second definition a build failure and is green inside `npm run build`. |
| T-17-39 | Repudiation | the `returned` assertion | mitigate | **C** | `probeActiveStop` used **9** times in `keyboard-composites.spec.ts` — both descriptors come from one projection. |
| T-17-40 | Tampering | a control reshaped to pass a walk | mitigate | **C** | `git status --porcelain src/` empty; `/signup` radio group untouched (absent from the phase `src/` diff); escalations in the ledger. |
| T-17-41 | EoP | seeded host/booker sessions | accept | **C** | AR-08. |
| T-17-42 | Tampering | `drizzle/` | accept | **C** | AR-01. |

### Plan 17-09 — one-instance and landmark counts

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-43 | Repudiation | the one-instance count | mitigate | **C** | `e2e/one-tree.spec.ts`: `toHaveCount(1)` × **7**; `toBeVisible` × **0**. A `display:none` double-mount cannot pass. |
| T-17-44 | Repudiation | counting an unresolved surface | mitigate | **C** | Per-row `tell` guards (`.not.toHaveCount(0)` × 4) run before each count; the 20s tell budget and its derivation are documented at `:170-176`. |
| T-17-45 | Repudiation | a silently absent surface row | mitigate | **O** | **OPEN — see OT-01.** The skip strings exist with their reasons in source, but the declared mechanism (*"throws its reason into the run's output"*) is dead code: a declared-skipped Playwright test body never executes. Measured and written up as review finding WR-04. |
| T-17-46 | Spoofing | a second navigation landmark | mitigate | **C** | `getByRole("navigation")` × **4** in `e2e/one-tree.spec.ts` — reads the accessibility tree, so `sr-only`/`opacity-0` cannot hide a second nav from it. |
| T-17-47 | Tampering | the app shell reshaped to satisfy a count | mitigate | **C** | Clean at 17-09's close. Phase-level, `site-chrome.tsx` carries exactly one change — 17-06's sanctioned `p-1.5` utility on `ProfileLink` — and no re-fork or merge of the three header compositions. |
| T-17-48 | Tampering | `drizzle/` | accept | **C** | AR-01. |

### Plan 17-10 — heading outline

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-49 | Repudiation | the outline walk | mitigate | **C** | `getByRole("heading", ...)` × **6** in `e2e/host-headings.spec.ts`; `querySelectorAll` appears only inside a comment at `:530`. Per-state vacuity guard at `:568-577` (`toBeGreaterThan(0)`) precedes the no-skip clause. |
| T-17-50 | Repudiation | an unverified new assertion | mitigate | **C** | Red-watch recorded at `:590-602` — an `h1 → h3` SKIP (deliberately not a duplicate, with the reason at `:590-593`) and the observed document-order sequence quoted verbatim. |
| T-17-51 | Tampering | source left mutated after the red-watch | mitigate | **C** | `git status --porcelain src/` empty. |
| T-17-52 | Tampering | a heading removed rather than corrected | mitigate | **C** | `e2e/host-headings.spec.ts:644-646` — the failure message forbids deletion and relaxation by name. |
| T-17-53 | DoS | spec contention | accept | **C** | AR-09. |
| T-17-54 | Tampering | `drizzle/` | accept | **C** | AR-01. |

### Plan 17-11 — route census

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-55 | Repudiation | a surface absent from the route table | mitigate | **C** | `MIN_APP_PAGES = 25` at `e2e/overflow-320.spec.ts:3618`; the floor assertion at `:3926-3931` runs before every subset test; `SURFACE_INVENTORY` at `:3642`. The sibling D-201 assertion in `axe-sweep.spec.ts` was observed RED on a real gap (see T-17-32). |
| T-17-56 | Repudiation | a row measured against a blank page | mitigate | **C** | Each row's `tell` names route-specific content and is asserted first (`:2249-2254`); `expectReachable` precedes `expectNoWrap` (`:1002-1004`). |
| T-17-57 | Repudiation | a blanket 44px assertion | mitigate | **C** | `TARGET_FLOOR_PX = 24` at `:1145` (conformance) and `TOUCH_FLOOR_PX = 44` at `:2591`, used only through `expectTouchTargets` (`:3390`). The two floors are distinct constants. |
| T-17-58 | Tampering | a control deleted to pass a 320px measurement | mitigate | **C** | `git status --porcelain src/` empty; sanctioned utility changes only. |
| T-17-59 | EoP | `seedHostSurfaces` / payouts rows | accept | **C** | Accepted **with documentation**, but the register's stated rationale is **false** — see UF-3. Recorded as `[17-D18]` with its measurement. AR-10. |
| T-17-60 | Tampering | `drizzle/` | accept | **C** | AR-01. |

### Plan 17-12 — the four throw routes

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-61 | EoP | four new routes reachable in production | mitigate | **C** | Guard is the first statement in all four components (`:93`, `:73`, `:91`, `:75`); exactly **one** `process.env` per file; no operator-settable variable. Production `next build && next start` probe recorded with four status codes (`[17-D2]`); code structure independently re-read for this audit. |
| T-17-62 | Info disclosure | search-engine indexing | mitigate | **C** | `robots: { index: false, follow: false }` present in all four (`:89`, `:69`, `:87`, `:71`). |
| T-17-63 | Info disclosure | error text leaking | mitigate | **C** | Exactly **one** `export const SENTINEL_LEAK_PROBE` in `src/` (`src/app/dev/throw/page.tsx:78`), imported by all four (`:84`, `:64`, `:82`, `:66`). `[17-D2]` records the sentinel appearing **0** times in the production-served bytes for the soft-404 route. |
| T-17-64 | EoP | bypassing the `(app)` / `(host)` gates | mitigate | **C** | Routes sit inside the group directories; `tests/design/blocking-session-gate.test.ts` green (72 passed in the 6-file run). `/dev-throw-app` and `/host/dev-throw` probed as `307 → /login` when anonymous. |
| T-17-65 | Repudiation | a row reaching the ROOT boundary | mitigate | **C** | Every boundary `tell` now names its route out (root `Back to search`, `(app)` `Your bookings`, `(host)` `Host dashboard`, `(auth)` `Back to log in`, `(legal)` …), completed by `64da86f`. |
| T-17-66 | Tampering | pinned counts bumped | mitigate | **C** | `tests/design/loading-coverage.test.ts:257` — `EXPECTED_QUALIFYING = 21`, **unchanged**; the `A CHANGE HERE MEANS A ROUTE WAS ADDED` warning preserved at `:610`; the four paths named in the decision at `:234-237`. |
| T-17-67 | Tampering | `drizzle/` | accept | **C** | AR-01. |

### Plan 17-13 — the findings ledger

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-68 | Repudiation | findings disappearing into SUMMARYs | mitigate | **C** | `deferred-items.md`: **25** `## [17-D…]` rows; `Found by:` 25, `Owner file:` 25, `Severity:` 25, `Cheapest correct fix` 25 — all four part-counts equal the row count. |
| T-17-69 | Repudiation | a mechanical item quietly unfixed | mitigate | **C** | `# Fixed in place — the mechanical-class closure record (D-200)` at `deferred-items.md:838`, naming the plan and commit per row. |
| T-17-70 | Tampering | a closed inventory opened during the sweep | mitigate | **C** | Re-proved by command for this audit, not by reading: `npx tsc --noEmit` exit 0; `npm run test:design` 67 files / 1255 passed (covers contrast, type-scale, card-pattern, sheet-absent, leak); `ls drizzle/*.sql \| wc -l` = 26. |
| T-17-71 | Tampering | `wizard-cover-preview` unblocked | mitigate | **C** | `e2e/visual/surfaces.spec.ts:179-266` — `EXPECTED_BLOCKED` holds **24** entries and `wizard-cover-preview` is still among them (`:257`); `EXPECTED_BASELINE_COUNT = 78` at `:301`, asserted at `:342`. |
| T-17-72 | Repudiation | the 59-stop sequence changed | mitigate | **C** | `git diff e439bf9 HEAD -- e2e/auth-keyboard.spec.ts` → 22 insertions, and filtering out comment lines leaves **zero** changed lines. |
| T-17-73 | Tampering | `drizzle/` | mitigate | **C** | 26 `.sql`, last `0025_audit_resolved_by.sql`, digest pin green, working tree clean. |

### Plan 17-14 — the baseline round-trip

| ID | Category | Component | Disp. | St. | Evidence |
|---|---|---|---|---|---|
| T-17-74 | Tampering | `--update-snapshots` reaching a `push` workflow | mitigate | **C** | `node scripts/verify-workflows.mjs` exit **0** over the PARSED tree: `triggers=[workflow_dispatch]`, workflow perms `contents: read`, exactly one job with `contents: write`, exactly one `--update-snapshots` across `.github/workflows/` and it is in `baselines.yml`, zero in `ci.yml`. `playwright.config.ts:78` — `updateSnapshots: "none"`, unconditional. |
| T-17-75 | Repudiation | reading a green off a generation run | mitigate | **C** | Verified against GitHub, not against the SUMMARY: `gh run view 33298297450` → workflow `ci`, conclusion `success`, headSha `247d1e4`, and all four jobs green including `gate-visual (GATE-01 visual regression)`. `git diff --name-only 247d1e4 HEAD` → docs plus `e2e/axe-sweep.spec.ts` only, so no product change postdates the comparison. |
| T-17-76 | Tampering | an unreviewed diff redefining correct | mitigate | **C** | `[17-D26]`: five files predicted before dispatch, five changed, **zero** minted; the one unpredicted cause escalated rather than absorbed. |
| T-17-77 | Tampering | a grove or platform baseline entering the repo | mitigate | **C** | `git ls-files '*-visual-linux.png'` → **36**; grove PNGs → **0**; tracked `*-snapshots/*.png` not ending `-visual-linux.png` → **0**. `gitignore-baselines.test.ts`'s positive control is verified under T-17-06. |
| T-17-78 | Repudiation | re-dispatching to turn a red green | mitigate | **C** | One generation dispatch recorded (`33295540219`); the comparison run was green on its first and only run. Run ids are in the ledger and in front of the PM. |
| T-17-79 | EoP | credentials added to the baselines job | mitigate | **C** | `verify-workflows.mjs`: *"zero `secrets.` references in any env / run / with VALUE — scanned workflow env, job env, container env, service env, and every step run/env/with — 0 hits"*. The two raw `secrets.` string matches in the file are both inside comments (`:72`, `:140`). |
| T-17-80 | Tampering | `drizzle/` | accept | **C** | AR-01. |

**Supply-chain cross-check for `baselines.yml` (the `contents: write` path, T-11-SC):** `git log -- .github/workflows/baselines.yml` shows its last change is `7f63e34` (**phase 12**). Phase 17 did not touch it. Its only install step is `npm ci`, and its only `uses:` are `actions/checkout@v4` and `actions/setup-node@v4` — both first-party, asserted by the parser. **No new dependency entered that job this phase.**

---

## Open threats

### OT-01 — T-17-45 (and the same clause inside T-17-30)

**Severity: WARNING. Does not meet `block_on: high`. Not a blocker.**

**Declared mitigation:** *"Every named family appears with a measurement or a `skip` paragraph that
throws its reason into the run's output."*

**What is actually in the code:** the shape

```ts
test.skip(title, () => { throw new Error(`not measured: ${row.skip}`); });
```

at `e2e/axe-sweep.spec.ts:889-891`, `e2e/one-tree.spec.ts:734-736`, `e2e/mobile-booker-path.spec.ts:1252-1254`,
`e2e/overflow-320.spec.ts:958-960` and `:2221-2223`. The body of a **declared**-skipped Playwright test is
never executed, so the `throw` is dead code and `row.skip` never reaches the reporter. Verified by the code
review against the installed Playwright typings (`node_modules/playwright/types/test.d.ts:4296`). The
review states it plainly: *"threat T-17-45 is stated as closed and is not closed."*

**Why it is a WARNING and not a BLOCKER:**
- No attack surface. This is instrument legibility, not a control.
- The underlying threat — *a surface silently absent* — is prevented by **different, verified** controls:
  the D-201 route-set-equality assertions (T-17-32, T-17-55), which fail **by path**, and the sibling
  assertion at `axe-sweep.spec.ts:920` requiring every `path: null` row's `skip` string to be ≥ 80
  characters. The reason is in the source file, in the diff, and in a length-asserted field.
- The idiom is **inherited**, present at the phase base commit `e439bf9` (`overflow-320.spec.ts:721`, `:1348`).
  This phase propagated it to three more files and re-stated the claim.

**Disposition drift, stated explicitly:** the register says `mitigate`; the code review resolved WR-04 as
*"ACCEPTED, NOT FIXED"*. The register was never updated. Unlike every other accepted item this phase,
WR-04 has **no row in `deferred-items.md`** — `grep -n "WR-04" deferred-items.md` returns nothing. It lives
only in `17-REVIEW.md`.

**To close:** either apply the one-line fix per site (`test.skip(\`${title} — ${row.skip}\`, () => {})`) or
add a `deferred-items.md` row so the acceptance sits in the phase's own findings ledger and the register
row is corrected from `mitigate` to `accept`.

---

## Unregistered flags

New attack surface or scope movement that appeared during implementation with no threat-register row.
**None is a blocker.** All three are logged because a SUMMARY's `## Threat Flags` section saying "None"
is not evidence that none exists.

### UF-1 — the `?today=` seam has no threat ID (the headline)

Plan 17-14 introduced a **new untrusted-input path on a public production route**: the query parameter
`?today=YYYY-MM-DD` on `/listings/[id]`, whose value steers date arithmetic that reaches a database read
and the display-level bookable horizon. `17-14-SUMMARY.md`'s `## Threat Flags` reads *"None. No file this
plan modified introduces a network endpoint, an auth path, a file-access pattern or a schema change."*
That is true as literally worded and misleading as a security statement: no **new endpoint** was added,
but **new untrusted input handling was added to an existing public one**, and none of `T-17-74` … `T-17-80`
covers it.

**This is a register-completeness gap, not a control gap.** The control is real and I verified it
independently (§ The highest-risk change). The seam is documented in three places — `[17-D26]`,
`17-REVIEW.md § The ?today= seam — what I verified`, and a dedicated 21-assertion security test that runs
in CI. What is missing is a **threat ID** owning it, so a future phase touching this seam has no register
row to inherit.

**Recommended:** open `T-18-TODAYSEAM` (Tampering / Elevation of privilege, `mitigate`) in the next phase's
register, carrying forward the two guards, the single-referrer pin, and residual R-1.

### UF-2 — a second vendored shadcn fork edit

`T-17-19` pins *"exactly one vendored file edited … `git diff --name-only src/components/ui/ | wc -l`
returning 1."* True for plan 17-05. **False for the phase:** `6d7c315` (code review, WR-06) edited
`src/components/ui/progress.tsx` to forward `value` to `ProgressPrimitive.Root`.

Security-relevant only as scope: the vendored-fork surface — the thing `T-17-19` exists to keep at one
file and one attribute — grew to two files during remediation with no register update. The change itself
is a WCAG 4.1.2 fix, is one line of behaviour, is pinned by a red-watched rendered test
(`tests/design/progress-value.test.tsx`, reverting → 5 failed / 2 passed), and introduces no input, no
data flow and no new dependency. **Not a finding against the code; a finding against the register.**

### UF-3 — T-17-59's accept rationale is false

`T-17-59` was accepted on the written basis that the `/host/payouts/*` rows *"read the shipped pages only
and issue no PayMongo call."* Plan 17-11's own executor measured that sentence false (F4) and filed it as
`[17-D18]`: `/host/payouts/refresh` calls `refreshOnboardingLink()` → `startPayoutOnboarding()` →
`createOnboardingLink()`, a live `POST https://api.paymongo.com/v1/linked_accounts/onboarding_links` using
the local `PAYMONGO_SECRET_KEY`. Cost per run: two outbound POSTs, two `audit` rows with
`outcome: "error"`, and 2 of the 5-per-60s per-identity budget.

**Per this audit's rules, a threat recorded in `deferred-items.md` is `accept`-with-documentation, not
OPEN — and I am saying so explicitly.** `[17-D18]` exists, carries its measurement, and `deferred-items.md:1024`
puts an open question to the PM (*"is a real PayMongo POST per e2e run acceptable, or should the fetch be
intercepted?"*). So T-17-59 is **CLOSED as an accepted risk**. What is unregistered is that the accepted
risk is **not the one the register describes**: the register row still asserts the false sentence, and the
real residual (a test suite that egresses to a payment provider with a live secret key) is materially
different from what was signed off. See AR-10.

---

## Accepted risks

Every `accept` disposition in the register, with the reason it was accepted and this audit's note.

| ID | Threat(s) | Accepted risk | Reason accepted | Auditor note |
|---|---|---|---|---|
| AR-01 | T-17-04, 13, 17, 22, 29, 42, 48, 54, 60, 67, 80 | No schema migration is added by any plan in this phase; enforcement is a filename + digest pin rather than a per-plan proof | GATE-06 / D-80: the v1.1 milestone ships zero migrations, and a migration proposed inside a v1.1 plan is a scope alarm, not a thing to absorb | **Verified stronger than accepted.** `T-17-05`'s sha256 digest turns this into a build-blocking byte-level pin with a recorded red-watch. 26 `.sql`, tree clean. |
| AR-02 | T-17-08 | Plan 17-02 adds no runtime code, route or input surface | Writes only under `tests/design/` | Verified: the phase `src/` diff contains no 17-02 file. |
| AR-03 | T-17-12 | Two new `data-testid` attributes ship in production markup | Non-secret structural container names; 49 already ship by design (GATE-04); expose no user data, session state or server-side value | Verified: `search-results-region`, `availability-calendar`. Both are container names. |
| AR-04 | T-17-18 | Seeded fixture text (prices, labels) appears in failure messages | Locally seeded fixture DB on `localhost` only; suite has no production access | Verified: `playwright.config.ts` `webServer` boots `npm run dev`. |
| AR-05 | T-17-23 | Five `search-*` baseline PNGs move | Signed-out surfaces rendering seeded fixture data; no user or session data; the delta was predicted in writing before dispatch | Verified: 5 predicted / 5 changed / 0 minted (`[17-D26]`). |
| AR-06 | T-17-28 | `signUpAndReachProfile` creates real accounts | Drives the shipped signup form against the local dev server and fixture DB; pre-existing (plan 15-10), unchanged | Verified as unchanged: absent from the phase diff. |
| AR-07 | T-17-35 | axe results attached to CI artifacts carry DOM selectors and rendered text | Fixture data on `localhost`; no production data, no secrets | Accepted as written. |
| AR-08 | T-17-41 | Seeded host/booker sessions in the keyboard fixture | Reuses pre-existing `seedHostSurfaces` / `signUpAndReachProfile`; no new credential path | Accepted as written. |
| AR-09 | T-17-53 | The seeded heading spec must run alone with `--workers=1` | Already `mode: "serial"` for a stated reason; the shipped operating constraint, unchanged | Accepted as written. |
| AR-10 | T-17-59 | Host-capable accounts seeded by `seedHostSurfaces`; **and**, contrary to the register's own wording, two real outbound `POST`s to `api.paymongo.com` per e2e run using the live `PAYMONGO_SECRET_KEY`, each writing an `audit` row and consuming 2 of a 5-per-60s per-identity budget | The fixture is pre-existing and local. The PayMongo egress was **discovered during implementation, not accepted at plan time** — the register asserts the opposite. Recorded as `[17-D18]` with an open PM question at `deferred-items.md:1024` | ⚠ **Accepted-with-documentation, on facts the register does not state.** Zero PayMongo resources are created (the gated endpoint refuses first) and `afterAll` deletes the audit rows (verified zero rows left after two runs). Re-accept on the corrected facts, or intercept the fetch, before this rationale is inherited by another phase. See UF-3. |

---

## Residual risks (outside the register)

Reported separately, as the brief directs. **None changes the pass/fail verdict on the register.** Each is
something I noticed while verifying a declared mitigation, not the product of a blind scan.

**R-1 — `NODE_ENV` blast radius, and nothing in CI re-runs the production probe.**
Five guards in this phase (`today-override.ts` plus the four throw routes) key entirely on
`process.env.NODE_ENV === "production"`. Next forces `NODE_ENV=production` for `next build` and
`next start`, and `package.json` uses exactly those (`"build": "… next build"`, `"start": "next start"`),
so a conventional deploy is inert by construction. But: there is **no deployment manifest in the
repository** (no `Dockerfile`, no `railway.*`, `render.*` or `fly.*`), so the deployment surface is not yet
pinned anywhere a gate can read it; and `playwright.config.ts` boots `npm run dev`, so **every e2e row
exercises the development branch of all five guards** — the production probes recorded in `[17-D2]` and
`[17-D26]` were run by hand and nothing re-runs them (this is review finding IN-02, accepted).
*If* a deployment ever runs `next dev`, or sets `NODE_ENV` to `development` / `test` / a preview value, the
consequences are: (a) `?today=` becomes honoured — bounded to reading availability for a day the visitor
could already select, with slot truth still computed from real `now`; (b) the four throw routes become
reachable and, in a non-production Next build, the boundary renders the **unredacted** error message.
(b) is the sharper half. **Cheapest closure:** a `next build && next start` smoke in CI asserting
`?today=` is ignored and `/dev-throw-*` return 404 — one job, and it converts two hand-run probes into a
standing gate.

**R-2 — the seam's reach is narrower than "display-only" but wider than that phrase implies.**
Recorded here so a future reader does not inherit an over-simplification: the override **does** reach a DB
read (`page.tsx:469`, `:488`) and **does** move the display-level horizon (`:435`, `:441`, `:615`).
It does not reach pricing, a cache key, or any booking mutation. State it this way rather than
"display-only", because the shorter phrase is the one that would license widening the seam later.

**R-3 — `searchParams.today` is typed narrower than Next's runtime shape.** (review IN-01, accepted)
`page.tsx:212` declares `today?: string`; Next hands `string | string[] | undefined`. Measured: a
two-element array coerces to `"…,…"`, fails the anchored regex and returns `null`; a one-element array
would parse. Next does not produce a one-element array for a single occurrence, so today's safety is
**incidental rather than pinned**. One row in the reject table (`["2026-09-16","2026-09-16"] as unknown as
string`) or a call-site `Array.isArray` normalisation makes it a property. Note the same narrow typing
applies to the pre-existing `date`, `start`, `end`, `resume`, `passes` params on this route.

**R-4 — the sentinel is imported out of a route module.** (review IN-03, accepted)
Five route files share `SENTINEL_LEAK_PROBE` via `import … from "@/app/dev/throw/page"`, which pulls a page
module (with its `metadata` and default component) into four other route graphs. It leaks nothing today —
the constant is `"SENTINEL_LEAK_PROBE"` and these are server components — but any future side effect added
to `dev/throw/page.tsx` would execute in four extra graphs. Moving it to `src/lib/dev/sentinel.ts` is a
five-line change.

---

## Verdict

**80 of 81 threats CLOSED.** The one OPEN row (`T-17-45` / OT-01) is a WARNING: an instrument-legibility
defect, inherited from before the phase base commit, whose underlying threat is independently prevented by
controls this audit verified, and which the code review has already resolved as accepted. Under
`block_on: high` it is **not blocking**.

The two controls with genuine attack surface — the `?today=` seam and the four dev-throw routes — were
traced to their sinks rather than pattern-matched, and both hold. The one path in this repository that can
write a visual baseline (`baselines.yml`, `contents: write`) was not touched this phase and gained no
dependency.

Three unregistered flags are recorded, of which **UF-1 is the one to act on**: the phase's single largest
new input surface has no threat ID. That is a register gap, not a control gap, and it should be opened as a
carried-forward threat rather than left to be rediscovered.
