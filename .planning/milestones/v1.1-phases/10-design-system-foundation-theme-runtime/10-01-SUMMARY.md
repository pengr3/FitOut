---
phase: 10-design-system-foundation-theme-runtime
plan: 01
subsystem: testing
tags: [vitest, culori, oklch, design-system, test-infrastructure]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "vitest.config.ts (defineConfig + plugin-react + `@` alias shape) and tests/global-setup.ts, whose Postgres preflight is the reason a second config is needed"
provides:
  - "`npm run test:design` — a DB-free, sub-second Vitest gate owning tests/design/**"
  - "vitest.design.config.ts — no globalSetup, no setupFiles, by design"
  - "culori@4.0.2 + @types/culori@4.0.1 as devDependencies (D-12 colour authority)"
  - "Disjoint test-tree ownership: vitest.config.ts excludes tests/design/**, closing the .tsx double-collection trap"
  - "tests/design/harness.test.ts — the positive control proving the gate really ran"
affects: [10-02, 10-03, 10-04, 10-05, 10-06, 10-07, 10-08, 10-09, 10-10, 10-11, 10-12, 10-13, 10-14, 10-15, 10-16, 10-17, quality-gates, theme-runtime]

# Tech tracking
tech-stack:
  added: [culori@4.0.2, "@types/culori@4.0.1"]
  patterns:
    - "Second Vitest config for DB-free suites, with the main config excluding that subtree"
    - "Guard-the-harness positive-control test as the first file in a new suite"

key-files:
  created:
    - vitest.design.config.ts
    - tests/design/harness.test.ts
  modified:
    - vitest.config.ts
    - package.json

key-decisions:
  - "Package legitimacy gate resolved: culori@4.0.2 Approved (slopcheck [OK], MIT, Evercoder/culori, no install-time script for registry consumers); @types/culori@4.0.1 Approved after the [ASSUMED] gap was closed by confirming `npm view culori types` is empty"
  - "vitest.design.config.ts declares NO globalSetup and NO setupFiles — those two keys are precisely what makes the main config require Docker"
  - "The .tsx collection trap is closed on BOTH halves: the design config includes .test.ts + .test.tsx AND vitest.config.ts excludes tests/design/**"
  - "No --passWithNoTests on test:design — a gate that goes green on a broken include glob is the vacuous pass this phase exists to remove (T-10-06)"
  - "build stays `next build`; the gate is not wired into the build until plan 10-17"

patterns-established:
  - "DB-free gate pattern: a suite that must run inside `next build` gets its own config that can never reach for a database"
  - "Positive-control pattern: the first test file in a new suite asserts the harness itself, so a green suite next to a broken harness is impossible"

requirements-completed: []  # DS-06 and DS-13 are claimed by plans 10-01/02/03/14/17; this plan builds only the harness they run on, so neither is marked complete here (see Deviations)

# Metrics
duration: 13min
completed: 2026-08-11
---

# Phase 10 Plan 01: Design-Gate Foundation Summary

**A DB-free `npm run test:design` Vitest gate (841ms with Postgres stopped) plus culori as the OKLCH colour authority, with the two configs holding disjoint ownership of the test tree**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-08-11T14:20Z
- **Completed:** 2026-08-11T14:33Z
- **Tasks:** 2 (1 blocking-human checkpoint, resolved by the developer before execution; 1 auto)
- **Files modified:** 5 (2 created, 3 modified incl. package-lock.json)

## Accomplishments

- **`npm run test:design` runs with no database.** Proven empirically, not by inspection: `docker stop fitout-db-1`, then the gate passed 2/2 in **841 ms** (4.1 s wall including npm/node startup) — comfortably inside the ~5 s budget. The control in the same shell: `npx vitest run tests/smoke.test.ts` on the **main** config exited **1** with `Error: [test-db] cannot reach the test database.` The container was restarted immediately afterwards.
- **The `.tsx` collection trap is closed and verified.** `npx vitest list --filesOnly --config vitest.config.ts | grep -ci "tests/design"` returns **0**; the same command against `vitest.design.config.ts` returns `tests/design/harness.test.ts`. Ownership is disjoint by measurement, not by intent.
- **culori is in the tree as the colour authority** (D-12), with types, so every downstream contrast/gamut/token-drift assertion in this phase bottoms out in a single library rather than a hand-rolled OKLab solver.
- **The harness has a positive control.** `tests/design/harness.test.ts` fails loudly if culori stops resolving or the DB-free config stops running, so no later design test can report green on a dead harness.

## Task Commits

1. **Task 1: Package legitimacy gate for culori and @types/culori** — no commit (verification-only gate; nothing was installed until it resolved)
2. **Task 2: Install culori and create the DB-free design gate** — `e57ee18` (feat)

**Plan metadata:** see the `docs(10-01)` commit that carries this file.

## Task 1 — Package Verdicts (recorded by name, per acceptance criteria)

| Package | Audit status going in | Verdict |
|---|---|---|
| `culori@4.0.2` | **Covered** by `10-RESEARCH.md` § Package Legitimacy Audit — npm, published 2026-04-03, ~1.59M weekly downloads, repo `github.com/Evercoder/culori`, MIT, `slopcheck install culori` → `[OK]` (1 scanned, 1 OK). Named explicitly by locked decision **D-12**. Its `prepare` script runs only for git/local installs, never for registry tarball consumers, so there is no install-time script on this path. | **Approved** by the developer |
| `@types/culori@4.0.1` | **[ASSUMED]** — absent from the audit table. Gap closed before approval: `npm view culori types` returns empty, confirming culori 4.x ships no bundled types, so this package is genuinely required for `tsc --noEmit`. MIT, repo `github.com/DefinitelyTyped/DefinitelyTyped`, `scripts` empty. | **Approved** by the developer |

The gate's own precondition held: neither package was present in `devDependencies` at the moment the gate ran — nothing was installed before it resolved. The developer replied **"approved"** for both, and no replacement was named.

## Files Created/Modified

- `vitest.design.config.ts` — **created.** Second Vitest config owning only `tests/design/**`. `plugins: [react()]`, `resolve.alias` `@` → `./src` (both copied from `vitest.config.ts`), `environment: "node"`, `include: ["tests/design/**/*.test.ts", "tests/design/**/*.test.tsx"]`, `exclude: ["node_modules/**", ".next/**", "e2e/**"]`. A 30-line header states why a second config exists, that the absence of `globalSetup`/`setupFiles` is deliberate, and that adding either silently reintroduces the Docker dependency.
- `tests/design/harness.test.ts` — **created.** Two tests: culori's `wcagContrast`/`inGamut`/`formatHex`/`converter` are callable functions, and `wcagContrast("#ffffff", "#000000")` rounds to 21.
- `vitest.config.ts` — **modified** (one line + comment). `exclude` gains `"tests/design/**"`, annotated as the half that stops the main config's `tests/**/*.test.tsx` include from collecting design `.tsx` tests and making them pay the Postgres preflight. Nothing else in the file changed; `tests/global-setup.ts` was not touched.
- `package.json` — **modified.** `"test:design": "vitest run --config vitest.design.config.ts"` added immediately after `"test"`; `culori` + `@types/culori` in `devDependencies`. `"build"` is untouched (`next build`).
- `package-lock.json` — **modified** by the install (2 packages added).

## Decisions Made

- **Both packages approved by name** (see the Task 1 table). The `@types/culori` gap was closed with a registry fact (`npm view culori types` empty) rather than an assumption.
- **`environment: "node"` stays the design config's default**, with `.tsx` tests opting into a DOM per-file via the repo's existing `// @vitest-environment jsdom` pragma (`tests/booking/partial-grant-notice.test.tsx:1`). `plugins: [react()]` is present so plan 10-05's `theme-provider.test.tsx` transforms correctly without changing the default environment.
- **No `--passWithNoTests`,** and `build` left as `next build` — both explicitly per plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 2's `grep -c "globalSetup\|setupFiles"` acceptance criterion is unsatisfiable as literally written**

- **Found during:** Task 2 (verification)
- **Issue:** The same task's `<action>` **mandates** a header comment "stating … that it has no `globalSetup` and no `setupFiles` by design, and that adding either would silently reintroduce the Docker dependency." A comment that names both keys makes a whole-file `grep -c` return non-zero. The two instructions are in direct conflict; taken literally, satisfying one breaks the other.
- **Fix:** Honoured the `<action>` (the comment is the load-bearing artifact — it is what stops a future contributor from re-adding the keys) and verified the criterion's **intent** with a check that measures declarations rather than mentions:
  - `grep -cE "^[[:space:]]*(globalSetup|setupFiles)[[:space:]]*:" vitest.design.config.ts` → **0**
  - `grep -vE "^\s*//" vitest.design.config.ts | grep -cE "globalSetup|setupFiles"` → **0** (zero occurrences on any non-comment line)
  - The loose whole-file count is **2**, both inside the mandated header comment.
- **Files modified:** none beyond the planned `vitest.design.config.ts`
- **Verification:** the two greps above, plus the empirical DB-stopped run (841 ms, 2/2 passing) — the property the criterion was proxying for is demonstrated directly.
- **Committed in:** `e57ee18`

**2. [Rule 3 - Blocking] `requirements.mark-complete DS-06 DS-13` deliberately not run**

- **Found during:** State updates
- **Issue:** The plan's frontmatter claims `requirements: [DS-06, DS-13]`, but both IDs are also claimed by plans `10-02`, `10-03`, `10-14` and `10-17`. DS-06 is "every colour token pair meets WCAG AA, verified by an automated contrast test" and DS-13 is "an automated leak test fails the build on raw hex/`rgb(`/`oklch(`". This plan builds the harness those tests will run on; it ships neither test. Ticking them in `REQUIREMENTS.md` now would put a false `Complete` in the traceability table for the remainder of the phase.
- **Fix:** Skipped `requirements.mark-complete`; left `requirements-completed: []` in this SUMMARY's frontmatter with the reason inline. The requirements are marked by the plans that actually satisfy them (`10-02` for DS-13, `10-03`/`10-14` for DS-06, `10-17` for the build wiring).
- **Files modified:** none (a deliberate omission)
- **Verification:** `grep -n "DS-06\|DS-13" .planning/REQUIREMENTS.md` still shows both `Pending`, which is the accurate state.
- **Committed in:** n/a

---

**Total deviations:** 2 (both Rule 3 — blocking/plan-conflict resolutions; neither changed the shipped artifacts)
**Impact on plan:** No scope creep. Every artifact the plan named exists, and both deviations resolve a conflict *inside* the plan rather than adding work.

## Issues Encountered

- **First run measured 8.71 s, over the ~5 s budget** — but that was cold Vite dependency optimisation (`import 6.41 s`). Two subsequent runs: **952 ms** (database up) and **841 ms** (database stopped). The budget holds on any run after the first; noted here so a future cold-cache reading is not mistaken for a regression.
- **Docker was running when execution started**, so the "no database" claim could not be taken on trust. It was proven by stopping `fitout-db-1`, running the gate (green), running the main config as a control (exit 1, `cannot reach the test database`), then restarting the container. The container is back up.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Every remaining plan in Phase 10 (10-02 … 10-17) can now assert.** `npm run test:design` is a real, green, sub-second, database-free command, and `tests/design/**` is collected by exactly one config.
- Plan **10-05**'s `tests/design/theme-provider.test.tsx` is unblocked: `.tsx` is in the design config's include, `plugin-react` is wired, and the main config can no longer collect it. It needs the per-file `// @vitest-environment jsdom` pragma on line 1.
- Plan **10-17** owns turning the gate on inside `build`; `"build"` is still `next build`, unchanged and verified exit 0.
- No blockers.

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design` (Docker **stopped**) | exit 0 — 1 file, **2 passed**, 841 ms |
| `npx vitest run tests/smoke.test.ts` (main config, Docker stopped) — control | exit **1**, `[test-db] cannot reach the test database` |
| `npm run test:design` (Docker up, warm) | exit 0 — 952 ms |
| `npx tsc --noEmit` | exit **0** |
| `npm run build` | exit **0**, still `next build` |
| `npx eslint vitest.design.config.ts tests/design/harness.test.ts vitest.config.ts` | exit **0** |
| scripts check (`test:design` exact string **and** `build === "next build"`) | exit **0** |
| devDeps check (`culori` **and** `@types/culori` present) | exit **0** — `^4.0.2` / `^4.0.1` |
| `globalSetup`/`setupFiles` **declarations** in `vitest.design.config.ts` | **0** (2 mentions, both in the mandated comment — see Deviation 1) |
| `tests/design` in `vitest.config.ts` | present at `:64`, inside the `exclude` array |
| `vitest list --filesOnly` — main config vs `tests/design` | **0** files (disjoint) |
| `vitest list --filesOnly` — design config | `tests/design/harness.test.ts` |
| `git diff --stat` scope | confined to `package.json`, `package-lock.json`, `vitest.config.ts` + the 2 new files |

## Known Stubs

None. `tests/design/harness.test.ts` asserts real behaviour (culori's actual contrast math), not a placeholder.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-11*

## Self-Check: PASSED

All claimed artifacts verified on disk (`vitest.design.config.ts`, `tests/design/harness.test.ts`, this SUMMARY) and commit `e57ee18` verified in `git log`.
