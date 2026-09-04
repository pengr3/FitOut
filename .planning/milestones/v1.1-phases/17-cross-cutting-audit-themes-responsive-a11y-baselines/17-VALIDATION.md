---
phase: 17
slug: cross-cutting-audit-themes-responsive-a11y-baselines
status: approved
nyquist_compliant: true
wave_0_complete: false # no separate Wave 0 — every missing instrument is created by a NAMED Wave-1/2 task (see § Wave 0 Requirements). Flips true when plans 17-01..17-09 land.
created: 2026-08-29
updated: 2026-08-29
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Transcribed from the `<verify><automated>` blocks of plans `17-01` … `17-14`
> (39 tasks, 39 with an automated command). Runtimes are the measured figures in
> `17-RESEARCH.md § Validation Architecture`, not estimates.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **Vitest 4.1.8** (design gate + full unit) and **@playwright/test 1.60.0** (e2e). Two vitest configs, one playwright config. |
| **Config file** | `vitest.design.config.ts` (DB-free, `environment: "node"`, no `globalSetup`) · `vitest.config.ts` (**requires Postgres** — `tests/global-setup.ts` preflights `fitout_test`) · `playwright.config.ts` (projects `chromium` and `visual`) |
| **Quick run command** | `npx vitest run --config vitest.design.config.ts <file>` — a single design gate, seconds. This is the phase's inner loop. |
| **Suite run command** | `npm run test:design` = `vitest run --config vitest.design.config.ts` — **measured 2026-08-29: 64 files, 1216 passed / 3 skipped, 95s, GREEN** |
| **Full suite command** | `npm run build` = `npm run lint && npm run test:design && next build` — every new `tests/design/**` gate is blocking **by construction** |
| **E2E command** | `npx playwright test e2e/<spec>.spec.ts --project=chromium --workers=1 --reporter=list` (281 tests in 33 files today; **not** green — see § Wave 0, the declared baseline red set) |
| **Estimated runtime** | targeted vitest file **< 10s** · `npm run test:design` **95s (measured)** · `npm run build` = 95s + lint + `next build` · a single seeded e2e spec: minutes |
| **DB prerequisite** | `npm run db:up` (`postgis/postgis:18-3.6`, image pulled, **no container running** as of 2026-08-29) before every seeded spec. Every seeded task command opens with it. |
| **New dependency** | `@axe-core/playwright@4.13.0`, pinned exact, dev-only — audited `[OK]` in `17-RESEARCH § Package Legitimacy Audit`. Installed by task `17-01-02`. |
| **CI-only instrument** | the `visual` Playwright project. `playwright.config.ts` **does not construct it on `win32`** (D-29), so GATE-01's comparison is a CI action (`ci.yml` job `gate-visual`) by construction — no plan may claim a local green on a baseline comparison. |
| **Watch-mode audit** | zero `--watch`, zero bare `vitest`, zero `--ui`, `--headed` or `--debug` across all 39 commands. `npm run test` and `npm run test:design` both resolve to `vitest run`. |

---

## Sampling Rate

- **After every task commit:** the task's own `<automated>` command from the Per-Task Verification Map
  below — a targeted `vitest run --config vitest.design.config.ts <file>` (**seconds**) or the single
  e2e spec the task touched. This is the sampling instrument; it is never skipped.
- **After every plan wave:** `npm run build` (lint + `test:design` + `next build`) **and**
  `npx playwright test e2e/<touched>.spec.ts --project=chromium --workers=1` **and** `npx tsc --noEmit`.
  Every plan already carries these in its `<verification>` block; two plan-level probes are wave-only
  by nature and are named here so they are not lost:
  - **17-12** — `npm run build && npm start`, then all four dev-throw paths return **HTTP 404**
    (the production-guard prune claim, T-17-61, cannot be proved by reading the source).
  - **17-14** — the CI `gate-visual` **comparison** run on the phase head commit (D-202).
- **Before `/gsd:verify-work`:** `npm run test:design` green · `npx tsc --noEmit` exit 0 ·
  `git status --porcelain drizzle/` empty (GATE-06) · the declared e2e baseline-red set **unchanged**
  (nothing newly red) · the recorded `gate-visual` comparison run green against the head commit.
- **Max feedback latency:** **95s** — the DB-free design gate, measured. Every claim this phase makes
  about source shape, gate wiring, migrations, baselines and focus definitions is answered inside that
  95s window. E2E and CI gates are minutes and are **wave-level by declaration**, not by omission.

---

## Per-Task Verification Map

`$PD` = `.planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/`.
Pipes inside commands are written `&#124;` for markdown-table safety; the authoritative text is each
plan's `<verify><automated>` block.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | GATE-02 (baseline hygiene) · GATE-06 guard | T-17-04 | The phase's pre-existing e2e reds are declared **before** the first new assertion lands, so a new red cannot hide inside an old one; `drizzle/` proved untouched | e2e + doc | `npm run db:up && npx playwright test e2e/public-listing.spec.ts e2e/cancel.spec.ts e2e/confirmation-decay.spec.ts --project=chromium --workers=1 --reporter=list; grep -c "reproducible\&#124;contention\&#124;undeclared" $PD/e2e-baseline-reds.md` | ❌ W0 — this task creates `e2e-baseline-reds.md` (the three specs ✅) | ⬜ pending |
| 17-01-02 | 01 | 1 | GATE-02 | T-17-SC, T-17-03 | The one new dependency is the audited Deque first-party package, pinned exact and **dev-only**; `axe-core` never reaches the client bundle | unit | `node -p "require('./package.json').devDependencies['@axe-core/playwright']" && npm run test:design` | ✅ | ⬜ pending |
| 17-01-03 | 01 | 1 | GATE-02 (AC#15/17) | T-17-01, T-17-02 | Exactly one `.options()` call and one vacuity guard — a page that failed to load cannot be recorded as an axe pass; `disableRules` absent | unit (tsc + grep) | `npx tsc --noEmit && grep -c '\.options(' e2e/helpers/axe.ts && grep -c 'withTags\&#124;withRules\&#124;disableRules\&#124;target-size' e2e/helpers/axe.ts` | ❌ W0 — this task creates `e2e/helpers/axe.ts` | ⬜ pending |
| 17-02-01 | 02 | 1 | GATE-06 (AC#30/31) | T-17-05, T-17-08 | An **edit** to an already-shipped `.sql` fails the build, not just a rename: sha256 over `name + NUL + bytes`, blocking inside `npm run build` | unit | `npx vitest run --config vitest.design.config.ts tests/design/money-path-invariants.test.ts && git status --porcelain drizzle/ &#124; wc -l` | ✅ | ⬜ pending |
| 17-02-02 | 02 | 1 | GATE-02 (AC#26 / D-138) | T-17-06 | Zero `*-grove-*.png` on disk, proved by a scan whose **positive control** finds the 36 court PNGs first — a scan pointed at a wrong directory fails the control, not the assertion | unit | `npx vitest run --config vitest.design.config.ts tests/design/gitignore-baselines.test.ts` | ✅ | ⬜ pending |
| 17-02-03 | 02 | 1 | GATE-02 (AC#20) | T-17-07 | `expectRing` is the **only** focus-indicator definition in `e2e/`, enforced mechanically with three guard-the-guard clauses and a both-directions self-test | unit | `npx vitest run --config vitest.design.config.ts tests/design/focus-definition.test.ts && npm run test:design` | ❌ W0 — this task creates the file | ⬜ pending |
| 17-03-01 | 03 | 1 | RESP-04 (AC#10/11) | T-17-09, T-17-10 | Zero viewport-conditional JSX and exactly one `matchMedia` **call site** — counted as call expressions, not string occurrences (a string count is green on non-compliant code) | unit | `npx vitest run --config vitest.design.config.ts tests/design/one-tree.test.ts tests/design/sheet-absent.test.ts` | ❌ W0 — creates `one-tree.test.ts` (`sheet-absent.test.ts` ✅) | ⬜ pending |
| 17-03-02 | 03 | 1 | RESP-04 (GATE-04 carry) | T-17-11, T-17-12 | `SELECTOR_CONTRACT` is a **total** `Record` over a const tuple — a testid without its contract row is TS2741 at compile time, not a review miss | unit + tsc | `npx tsc --noEmit && npx vitest run --config vitest.design.config.ts tests/design/selector-contract.test.ts && npm run test:design` | ✅ | ⬜ pending |
| 17-04-01 | 04 | 1 | RESP-03 (AC#4-7) | T-17-14 | `expectNoWrap` refuses to measure empty text or a non-finite line-height — an empty line never wraps and must not read as a pass | e2e | `npm run db:up && npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1 --reporter=list` | ❌ W0 — creates `e2e/helpers/nowrap.ts` (the spec ✅) | ⬜ pending |
| 17-04-02 | 04 | 1 | RESP-03 (AC#4-7) | T-17-15 | The sticky bar is asserted on `boundingBox()` geometry and box intersection, **not** on a class name; the clearance constant appears only in the failure message | e2e | `npm run db:up && npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ spec (clause is new) | ⬜ pending |
| 17-04-03 | 04 | 1 | RESP-03 | T-17-16, T-17-18 | `git status --porcelain src/` empty apart from a utility the UI-SPEC's "may fix in place" table sanctions; failure messages quote **local fixture** data only | e2e | `npm run db:up && npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-05-01 | 05 | 1 | GATE-02 (DS-09 / AC#34) | T-17-23 | Five hand-rolled `h-11` Buttons adopt the declared `touch` size; the resulting five-PNG baseline delta is **predicted in writing** before 17-14's dispatch | unit + tsc | `npx tsc --noEmit && npm run test:design` | ✅ | ⬜ pending |
| 17-05-02 | 05 | 1 | GATE-02 (DS-09 / AC#34) | T-17-21 | The single genuinely advisory design gate becomes blocking at `toBe(0)` with the offender-naming failure message retained (a zero with no names is a gate nobody can act on) | unit | `npx vitest run --config vitest.design.config.ts tests/design/brand-recipe.test.ts && npm run test:design` | ✅ | ⬜ pending |
| 17-05-03 | 05 | 1 | GATE-02 (AC#23 / D-197) | T-17-19, T-17-20 | `aria-disabled` emitted only when disabled (`&#124;&#124; undefined`), so an enabled slider never announces `aria-disabled="false"`; exactly one vendored file edited | e2e | `npm run db:up && npx playwright test e2e/avatar-crop.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-06-01 | 06 | 1 | RESP-03 (AC#3/9) | T-17-24, T-17-25 | The sheet row is **scoped** through `expectNoOverflowWithin` (which carries its own vacuity guard), and `expectTargets` runs **after** the tell — a scan over a skeleton is a guard failure, not a green | e2e | `npm run db:up && npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-06-02 | 06 | 1 | GATE-02 (AC#22 / D-196) | T-17-27 | ProfileLink clears the 24px pointer floor by padding **on the link**; a missed 226px budget is escalated under D-199(b), never absorbed by shrinking a neighbour | build | `npm run build` | ✅ | ⬜ pending |
| 17-06-03 | 06 | 1 | RESP-03 · GATE-02 (AC#22) | T-17-26, T-17-28 | The `collectControls` shell exclusion is **narrowed rather than deleted**, with the surviving half carrying its measured reason | e2e | `npm run db:up && npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-07-01 | 07 | 2 | GATE-02 (AC#2/16) | T-17-31, T-17-32 | Every axe scan runs **after** its row's own tell, and the table's row set is asserted equal to the declared surface set — a surface cannot be silently absent | e2e + tsc | `npx tsc --noEmit && npm run db:up && npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1 --reporter=list` | ❌ W0 — this task creates the spec | ⬜ pending |
| 17-07-02 | 07 | 2 | GATE-02 (AC#16-18) | T-17-30, T-17-33, T-17-34, T-17-35 | No violation suppressed (`disableRules` count `0`); escalate-class findings are **recorded, not fixed**; `contrast.test.ts` stays the arbiter for declared pairs | e2e + build | `npm run db:up && npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1 --reporter=list && npm run build` | ❌ W0 → ✅ after 17-07-01 | ⬜ pending |
| 17-07-03 | 07 | 2 | GATE-02 (AC#24 / D-138) | T-17-34 | The six stale "two-theme axe pass" sentences say **court-only**, with the limitation named rather than implied | unit + tsc | `npm run test:design && npx tsc --noEmit` | ✅ | ⬜ pending |
| 17-08-01 | 08 | 2 | GATE-02 (AC#19) | T-17-36, T-17-38 | Every element dropped from the walk is proved to be a `nextjs-portal`; every focus reading comes from `expectRing` and nowhere else | e2e + unit | `npm run db:up && npx playwright test e2e/keyboard-composites.spec.ts --project=chromium --workers=1 --reporter=list && npx vitest run --config vitest.design.config.ts tests/design/focus-definition.test.ts` | ❌ W0 — creates the spec (gate from 17-02-03) | ⬜ pending |
| 17-08-02 | 08 | 2 | GATE-02 (AC#19) | T-17-37, T-17-40 | `walkForward` is bounded at `WALK_BOUND = 40` — a focus trap reports as a **named assertion, never a hang**; a control is never reshaped to make a walk pass | e2e | `npm run db:up && npx playwright test e2e/keyboard-composites.spec.ts e2e/auth-keyboard.spec.ts --project=chromium --workers=1 --reporter=list` | ❌ W0 → ✅ after 17-08-01 (`auth-keyboard.spec.ts` ✅) | ⬜ pending |
| 17-08-03 | 08 | 2 | GATE-02 (AC#19) | T-17-39, T-17-41 | *Escapable* and *returned* are measured from **one** projection (`probeActiveStop`), with the observed descriptor interpolated into the failure message | e2e + unit | `npm run db:up && npx playwright test e2e/keyboard-composites.spec.ts --project=chromium --workers=1 --reporter=list && npm run test:design` | ❌ W0 → ✅ after 17-08-01 | ⬜ pending |
| 17-09-01 | 09 | 2 | RESP-04 (AC#12) | T-17-43, T-17-44, T-17-45 | One instance in the **document** per surface at 320/768/1280, counted with `toHaveCount(1)` over `[data-testid]` (which resolves `display:none` nodes); every row guarded by its tell | e2e + tsc | `npm run db:up && npx tsc --noEmit && npx playwright test e2e/one-tree.spec.ts --project=chromium --workers=1 --reporter=list` | ❌ W0 — this task creates the spec | ⬜ pending |
| 17-09-02 | 09 | 2 | RESP-04 (AC#13) | T-17-46, T-17-47 | Exactly one `navigation` landmark, read from the **accessibility tree** so swapping `hidden` for `sr-only`/`opacity-0` fails; the app shell is not reshaped to satisfy a count | e2e | `npm run db:up && npx playwright test e2e/one-tree.spec.ts --project=chromium --workers=1 --reporter=list` | ❌ W0 → ✅ after 17-09-01 | ⬜ pending |
| 17-10-01 | 10 | 2 | GATE-02 (AC#21) | T-17-49, T-17-53 | Heading levels read via `getByRole("heading", { level })`, so `display:none` subtrees are excluded and `querySelectorAll` is asserted absent; the seeded spec runs **alone** at `--workers=1` | e2e | `npm run db:up && npx playwright test e2e/host-headings.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-10-02 | 10 | 2 | GATE-02 (AC#21) | T-17-50, T-17-51, T-17-52 | The new assertion is **red-watched against a real `h1`→`h3` SKIP** (never a duplicate, which proves nothing) and the product source is left unmutated afterwards | e2e + git | `npm run db:up && npx playwright test e2e/host-headings.spec.ts --project=chromium --workers=1 --reporter=list && git status --porcelain src/ &#124; wc -l` | ✅ | ⬜ pending |
| 17-11-01 | 11 | 2 | RESP-03 (AC#36) | T-17-56, T-17-59 | Every new row's `tell` names **route-specific** content, asserted not to be `site-header`/`site-nav`/`site-footer`; `expectReachable` runs first | e2e | `npm run db:up && npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-11-02 | 11 | 2 | RESP-03 (D-201 / AC#2) | T-17-55 | The table's route set is asserted **equal** to a run-time enumeration of `src/app/**/page.tsx` — an absent surface fails by path, with the four declared exclusions inside the table | e2e | `npm run db:up && npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-11-03 | 11 | 2 | RESP-03 (AC#8/36) | T-17-57, T-17-58 | `TOUCH_FLOOR_PX` is reachable only through `expectTouchTargets` with a named target and its `why`; no control or disclosure is deleted to make a 320px measurement pass | e2e + build | `npm run db:up && npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1 --reporter=list && npm run build` | ✅ | ⬜ pending |
| 17-12-01 | 12 | 3 | RESP-03 (11-21 carry) | T-17-61, T-17-62, T-17-63, T-17-64 | Four dev-throw routes 404 in production via a **build-time** `NODE_ENV` guard the bundler prunes; `robots: index:false`; the sentinel is **imported**, never retyped; group session/`canHost` gates inherited by directory | unit + lint + tsc | `npx tsc --noEmit && npm run lint && npx vitest run --config vitest.design.config.ts tests/design/blocking-session-gate.test.ts tests/design/error-boundaries.test.ts` | ✅ | ⬜ pending |
| 17-12-02 | 12 | 3 | RESP-03 (route inventory) | T-17-66 | The pinned counts move by exactly the amount four new routes justify, with the decision recorded beside them and the file's own *"a change here means a ROUTE WAS ADDED"* warning preserved | unit | `npx vitest run --config vitest.design.config.ts tests/design/loading-coverage.test.ts && npm run test:design` | ✅ | ⬜ pending |
| 17-12-03 | 12 | 3 | RESP-03 · GATE-02 | T-17-65 | Each unskipped boundary row's `tell` names copy **only that group's** boundary renders — a row that reaches the ROOT boundary and reports success is Pitfall 6 made mechanical | e2e | `npm run db:up && npx playwright test e2e/overflow-320.spec.ts e2e/error-leak.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-13-01 | 13 | 4 | RESP-03 · RESP-04 · GATE-02 · GATE-06 | T-17-68, T-17-69 | Every escalate-class finding is in **ONE** ledger in the Phases 13-16 four-part format; mechanical-class items are **not** closeable-around and are named with the plan that fixed them | doc | `test -f $PD/deferred-items.md && grep -c "Cheapest correct fix" $PD/deferred-items.md` | ❌ — this task creates the ledger | ⬜ pending |
| 17-13-02 | 13 | 4 | GATE-02 · RESP-04 (AC#28/32/35) | T-17-70, T-17-72 | The five closed inventories are re-proved **by command, not by reading**; the declared 59-stop sequence is unchanged (diff asserted comment-only) | unit + e2e + tsc | `npx tsc --noEmit && npm run test:design && npm run db:up && npx playwright test e2e/auth-keyboard.spec.ts --project=chromium --workers=1 --reporter=list` | ✅ | ⬜ pending |
| 17-13-03 | 13 | 4 | GATE-06 · GATE-01 carry (AC#29-31) | T-17-71, T-17-73 | Every blocked baseline row's reason names **today's** obstacle; `wizard-cover-preview` stays blocked because unblocking it mints a PNG and is the PM's to schedule; no snapshot moves | unit + tsc + git | `npx tsc --noEmit && npm run test:design && git status --porcelain e2e/visual/surfaces.spec.ts-snapshots/ &#124; wc -l` | ✅ | ⬜ pending |
| 17-14-01 | 14 | 5 | GATE-02 · GATE-01 carry (D-202) | T-17-74, T-17-79 | `baselines.yml` stays `workflow_dispatch`-only with zero `secrets.`; the tree is proved green **and the pre-dispatch baseline state recorded** before any dispatch | build + workflow lint | `npm run build && npx tsc --noEmit && node scripts/verify-workflows.mjs && git diff --name-only HEAD -- playwright.config.ts .github/workflows/baselines.yml &#124; wc -l` | ✅ | ⬜ pending |
| 17-14-02 | 14 | 5 | GATE-02 · GATE-01 carry (D-202) | T-17-75, T-17-76, T-17-77, T-17-78 | The closing evidence is a **GREEN COMPARISON run on the head commit**, never a generation run; every changed PNG was predicted in writing; a red comparison is read, not re-dispatched away | ci | `gh run list --workflow=ci.yml --limit 5 --json databaseId,headSha,conclusion,name && gh run view $(gh run list --workflow=ci.yml --limit 1 --json databaseId --jq '.[0].databaseId') --json conclusion --jq .conclusion` | ✅ (CI-only by construction — D-29) | ⬜ pending |
| 17-14-03 | 14 | 5 | GATE-02 (D-199 / D-200 / D-202) | T-17-78, T-17-80 | The PM reads the ledger **and** the recorded evidence before the phase closes; the checkpoint is blocking and is never auto-approved | doc + human | `test -f $PD/deferred-items.md && test -f $PD/baseline-evidence.md && grep -c "Cheapest correct fix" $PD/deferred-items.md` **+** `<human-check>` (see § Manual-Only) | ❌ → ✅ after 17-13-01 and 17-14-01 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Coverage:** 39 / 39 tasks carry an `<automated>` command. 1 task (`17-14-03`) additionally carries a
blocking `<human-check>`. Longest run of consecutive tasks without an automated command: **0**.

---

## Wave 0 Requirements

There is **no separate Wave 0 plan**. Every missing instrument is created by a named task in the plan
that first consumes it, and no task's `<automated>` command references an instrument that an *earlier*
task has not created. The list below is the audit of that claim.

- [ ] `npm i -D @axe-core/playwright@4.13.0` — pinned exact, dev-only → **17-01-02**
- [ ] `$PD/e2e-baseline-reds.md` — the declared pre-existing e2e red set, landed **before** the first new assertion → **17-01-01**
- [ ] `e2e/helpers/axe.ts` — the single `.options()` configuration + the `expectAxeClean` vacuity guard → **17-01-03**
- [ ] `tests/design/focus-definition.test.ts` — AC#20, `expectRing` uniqueness in `e2e/` → **17-02-03**
- [ ] `tests/design/one-tree.test.ts` — RESP-04 source scan (AC#10/11), counting **call sites** not strings → **17-03-01**
- [ ] `e2e/helpers/nowrap.ts` — the generalised no-wrap clause with both guards → **17-04-01**
- [ ] `e2e/axe-sweep.spec.ts` — route table derived from the shipped inventories, not retyped → **17-07-01**
- [ ] `e2e/keyboard-composites.spec.ts` — the five properties on calendar / slot picker / wizard / dialogs / sheets → **17-08-01**
- [ ] `e2e/one-tree.spec.ts` — one instance in the document at 320/768/1280 + the navigation landmark → **17-09-01**
- [ ] `src/lib/design/selector-contract.ts` — 2 new structural container rows with their `why`/`owner` → **17-03-02**
- [ ] `tests/design/gitignore-baselines.test.ts` — AC#26's **grove half** (the file exists; the assertion does not) → **17-02-02**
- [ ] `tests/design/money-path-invariants.test.ts` — the GATE-06 **content digest** (the file exists; the digest does not) → **17-02-01**
- [ ] `npm run db:up` — Postgres running before every seeded row (environment prerequisite, not a file; every seeded command opens with it)

`wave_0_complete: false` is a statement about **execution**, not about coverage: nothing has run yet.
It flips to `true` when plans 17-01 … 17-09 land. Nyquist compliance is a statement about the
**contract** — every task samples, and every instrument has a named owner — and that holds today.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The PM accepts the batched findings ledger and the recorded baseline evidence, or names findings to reclassify | GATE-02 · D-199 / D-200 / D-202 | The escalate-vs-mechanical **disposition** of a finding is a product judgement, not a measurable property. The automated half (both artifacts exist, the four-part format holds, the comparison run id is green against the head commit) is asserted by `17-14-03`'s `<automated>` command; only the judgement is human. | Read `$PD/deferred-items.md` and `$PD/baseline-evidence.md`. Confirm the recorded run is a **comparison** run (not a generation run) and that its `headSha` equals the repository head. Reply `approved`, or name the findings to reclassify. Blocking — never auto-approved. |

Everything else in this phase is automated. Two automated probes are **wave-level rather than
task-level** and are named in § Sampling Rate so they cannot be lost: 17-12's `npm run build && npm start`
404 probe of the four dev-throw routes, and 17-14's CI `gate-visual` comparison run.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — **39 / 39**, zero `MISSING` placeholders
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — longest gap is **0**
- [x] Wave 0 covers all MISSING references — 13 items, each with a named owning task; no command references an instrument an earlier task has not created
- [x] No watch-mode flags — audited across all 39 commands: zero `--watch`, zero bare `vitest`, zero `--ui` / `--headed` / `--debug`; `test:design` resolves to `vitest run`
- [x] Feedback latency **< 95s** for the DB-free design gate (measured 2026-08-29, 64 files / 1216 passed); e2e and CI gates are minutes and are declared wave-level, not hidden
- [x] `nyquist_compliant: true` set in frontmatter

**Known runtime tradeoff (accepted, not an oversight):** six tasks run `npm run build` or
`npm run test:design` (95s measured) as their sampling command. In each case the *point of the task is
that the gate blocks the build* — `npm run build` is `lint && test:design && next build`, so a gate that
is green only under a targeted runner has not proved the property the task claims. Where a lighter
command genuinely proves the task (`17-05-02`, `17-12-02`, `17-12-03` — all test-file-only or e2e-only
edits), the heavy command was moved to the plan's wave-level `<verification>` block. Where it does not
(`17-06-02`, `17-07-02`, `17-11-03`, `17-14-01`, and the `test:design` gates in `17-02-03`, `17-07-03`,
`17-13-02`, `17-13-03`), it was kept and the tradeoff recorded inline in the plan's `<verify>` block.

**Approval:** approved 2026-08-29
