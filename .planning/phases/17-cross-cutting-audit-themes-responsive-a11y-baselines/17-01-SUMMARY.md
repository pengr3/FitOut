---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 01
subsystem: testing
tags: [playwright, axe-core, accessibility, e2e, wcag, baseline]

requires:
  - phase: 16-image-crop-framing
    provides: "[16-D6]'s 2026-08-26 chromium triage (3 reproducible + 7 contention) and [16-D2]'s shared-fixture class"
  - phase: 14-host-tooling
    provides: "[260824-dbc] — the three undeclared availability.spec.ts reds beyond the one that was declared"
  - phase: 12-booker-path
    provides: "e2e/helpers/overflow.ts — the module-header, named-constant and vacuity-guard-first idioms this helper copies"
  - phase: 15-auth-profile-email
    provides: "e2e/helpers/focus.ts — DEV_OVERLAY_TAG and the exclusion-with-a-committed-reason precedent"
provides:
  - "e2e-baseline-reds.md — the declared denominator for every Phase-17 e2e verdict, measured per-file at e439bf9"
  - "@axe-core/playwright@4.13.0 pinned exact as a dev-only dependency"
  - "e2e/helpers/axe.ts — AXE_TAGS, makeAxe, expectAxeClean, MIN_SCANNED_NODES: the ONE definition of the axe pass"
  - "Observed (not assumed) answers to 17-RESEARCH assumptions A1 and A4"
  - "A measured correction for plan 17-07: a 404 URL on this app is NOT a vacuity probe"
affects: [17-02, 17-03, 17-04, 17-05, 17-06, 17-07, 17-08, 17-09, 17-10, 17-11, 17-12, 17-13, 17-14]

tech-stack:
  added: ["@axe-core/playwright@4.13.0 (dev)", "axe-core 4.12.0 -> 4.13.0 (dev, shared with eslint-plugin-jsx-a11y)"]
  patterns:
    - "One axe configuration in one options({...}) call — runOnly and rules cannot be separated"
    - "Vacuity guard before verdict, with the floor derived from measured probes rather than set to > 0"
    - "A declared baseline red set as a committed artifact, with an explicit prohibition on editing it to read green"

key-files:
  created:
    - .planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/e2e-baseline-reds.md
    - e2e/helpers/axe.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "The denominator records what was MEASURED at e439bf9, not what [16-D6]/[260824-dbc] predicted: public-listing.spec.ts:385 and all four availability.spec.ts reds passed twice and are recorded OUTSIDE the denominator"
  - "open-capacity.spec.ts:407 is a new red at this commit and is added to the denominator; it is not Phase 17's by authorship"
  - "The soft-404 stays escalate-class (RESEARCH Open Question 3, D-199/D-200) even though it did not reproduce — a green today is an environment result, not a fix"
  - "MIN_SCANNED_NODES = 8 replaces the planned `> 0` node guard, because `> 0` was measured to be unreachable"

patterns-established:
  - "Baseline-red artifact: base commit SHA at the top, one row per failure with spec:line / title / signature / class / owner, and a committed prohibition on adding rows to make a run read green"
  - "Identifiers a file's own acceptance grep forbids are spelled without their literal form in comments, with that reason stated in the file"

requirements-completed: []

duration: 44 min
completed: 2026-08-29
---

# Phase 17 Plan 01: E2E Baseline Reds & Axe Foundations Summary

**A per-file measurement of all 33 chromium specs at `e439bf9` that declares a 10-row baseline denominator (and disqualifies five previously-declared reds that no longer fail), plus `@axe-core/playwright@4.13.0` pinned exact and `e2e/helpers/axe.ts` — one `options({...})` call and a vacuity floor derived from four probes rather than assumed.**

## Performance

- **Duration:** 44 min
- **Started:** 2026-08-29T06:16:46Z
- **Completed:** 2026-08-29T07:00:33Z
- **Tasks:** 3
- **Files created/modified:** 4

## Accomplishments

- **Measured the whole `chromium` project per file** — all 33 specs, each in its own invocation at `--workers=1`, after `npm run db:up` and a `.next` wipe. Every reproducing row was seen **twice**, in separate invocations. 281 tests confirmed by `--list`.
- **Declared a 10-row denominator** in `e2e-baseline-reds.md` with the base commit SHA at the top, the contract stated in both directions (in the list → not a Phase-17 regression; not in the list → it is), and an explicit "**Do NOT** add a row to make a run read green" clause.
- **Disqualified five previously-declared reds** rather than inheriting them. `public-listing.spec.ts:385` and all four `availability.spec.ts` cases passed twice; they are recorded in a clearly separated table **outside** the denominator, because pre-excusing a passing line is the more dangerous of the two errors available here.
- **Found one red nobody had declared** — `open-capacity.spec.ts:407`, a 90s timeout in `pickDay` that correlates exactly with the calendar's month-hop branch being live at this date and dead on the triage date.
- **Pinned `@axe-core/playwright@4.13.0` exact, dev-only**, with a lockfile diff of exactly two packages and nothing else.
- **Landed `e2e/helpers/axe.ts`** and then **proved the instrument works before committing it**, which turned two RESEARCH assumptions into observations and one planned guard into a measured one.

## Task Commits

1. **Task 1: Declare the pre-existing e2e red set** — `4ca7d7a` (docs)
2. **Task 2: Install @axe-core/playwright@4.13.0, pinned exact, dev-only** — `dc9b689` (chore)
3. **Task 3: Write e2e/helpers/axe.ts** — `72b5c9c` (feat)

**Plan metadata:** see the final `docs(17-01)` commit.

## Files Created/Modified

- `.planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/e2e-baseline-reds.md` — the declared denominator, its contract, the measurement method, the 10 failure rows, the five entries that did not reproduce, the escalate-class note on the soft-404, and the per-file green/red split of all 33 files
- `e2e/helpers/axe.ts` — `AXE_TAGS`, `makeAxe`, `expectAxeClean`, `MIN_SCANNED_NODES` (182 lines)
- `package.json` — `@axe-core/playwright: "4.13.0"` in `devDependencies`, exact
- `package-lock.json` — one added package, one bumped

## What the measurement actually said

**The denominator (10 rows, all seen twice, per file, `--workers=1`):**

| Row | Class | Owner |
|---|---|---|
| `cancel.spec.ts:224` — `getByText(/refund on its way/i)` never visible | reproduces alone | `[16-D6]` item 2 |
| `confirmation-decay.spec.ts:151` — the moment measures **0px** against `>= 603` at `court · 375x667` | reproduces alone | `[16-D6]` item 3 |
| `open-capacity.spec.ts:407` — 90s timeout in `pickDay` on the `September 1, 2026` cell | **new at this commit** | this plan |
| `hold-countdown:292`, `price-one-fact:313`, `reduced-motion:368`, `shell:291`, `shell:1221`, `shell:1302`, `stale-session-selfheal:90` | shared-fixture race — all seven **passed alone** | `[16-D6]` env set / `[16-D2]` |

**Outside the denominator (measured green, twice each):** `public-listing.spec.ts:385` (the `[16-D6]` soft-404) and `availability.spec.ts:160/203/236/261` (all of `[260824-dbc]`).

Neither the `(detail)` route directory nor the Next version moved since the triage commit `d24b212`, so the soft-404's green is an environment result rather than a fix. It stays **escalate-class** per RESEARCH Open Question 3; plan 17-13 carries it into `deferred-items.md`.

**Blocked, not failing:** both `confirmation-decay.spec.ts` and `open-capacity.spec.ts` are `mode: "serial"`, so 3 and 5 further cases respectively report *did not run*. No verdict may be read off them while rows 2 and 3 stand.

## The axe helper, and what was proved about it before it was committed

A throwaway spec (written, run, deleted — never committed) drove `makeAxe`/`expectAxeClean` against real pages. It converted three open questions into readings:

| Question | Source | Reading |
|---|---|---|
| Does excluding the `nextjs-portal` host remove its open shadow subtree from scope? | RESEARCH Assumption **A1**, recorded unverified | **Yes** on `/terms` — zero violation targets contain `nextjs-portal` |
| Does `rules: { "heading-order": { enabled: true } }` survive alongside a `runOnly` tag filter in one call? | RESEARCH Assumption **A4** | **Yes** — `heading-order` appears in the results, while `region`, `landmark-one-main` and `page-has-heading-one` do **not**. The tag filter is intact and Pitfall 1 is confirmed in both directions |
| Does the planned `> 0` vacuity guard ever fire? | plan `<action>` | **No** — see the deviation below |

`/terms` scanned clean: 22 passing rules, 86 nodes, zero violations.

## Decisions Made

1. **The artifact records the measurement, not the inherited prediction.** Writing "`public-listing.spec.ts:385` is a baseline red" while it passes twice would be exactly the failure the denominator exists to prevent — a future real regression on that line would be waved through as "already red". The five non-reproducing entries are kept, named, and put in their own table with the reason.
2. **`open-capacity.spec.ts:407` goes into the denominator.** It is not `[16-D6]`'s and it is not Phase 17's; the file was last touched in Phase 9 and no product code has moved. Leaving it out would have handed the next plan an unexplained red.
3. **The month-hop cause is labelled as derived, not isolated.** The correlation is real (`crossesMonth` is false on the triage date and true today, and it gates the only grid-navigation branch), but no control run pinned the clock. The artifact says so in as many words rather than presenting an inference as a measurement.
4. **`MIN_SCANNED_NODES = 8` instead of `> 0`.** See deviation 2.
5. **Identifiers the file's own acceptance grep forbids are spelled without their literal form**, with that reason stated in the file — otherwise the guard matches its own documentation and gets deleted as broken.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's four "already-measured reproducible subjects" do not all reproduce at this commit**

- **Found during:** Task 1
- **Issue:** The plan instructed the artifact to name `public-listing.spec.ts:385`, `cancel.spec.ts:224`, `confirmation-decay.spec.ts:151`/`:254` and the `availability.spec.ts` reds as the reproducible set. Measured per-file at `e439bf9`, twice each: `public-listing.spec.ts` is **8 passed**, `availability.spec.ts` is **4 passed**, and `confirmation-decay.spec.ts:254` never runs (its file is `serial` and `:151` fails first). Only `cancel:224` and `confirmation-decay:151` reproduce.
- **Fix:** Recorded the measured set as the denominator, and the five non-reproducing entries in a separate, clearly-labelled table that is explicitly **not** the denominator — each with its prior claim, the reading, and why a passing test must not be pre-excused. Added `open-capacity.spec.ts:407`, which the plan did not know about.
- **Files modified:** `e2e-baseline-reds.md`
- **Verification:** Two independent invocations per candidate spec; `docker ps` non-empty throughout; `git status --porcelain drizzle/` empty
- **Committed in:** `4ca7d7a`

**2. [Rule 2 - Missing Critical] The specified `> 0` vacuity guard cannot fire, so it would have shipped a guard that measures nothing**

- **Found during:** Task 3
- **Issue:** The plan specified `results.passes.length > 0` and `scannedNodes > 0`. Four probes in real Chromium: `about:blank` → 1 pass / **3 nodes**; a bare `setContent` document → 1 pass / **3 nodes**; a 404 route on this app → 22 passes / 57 nodes / zero violations; `/terms` → 22 passes / 86 nodes. Axe's own `document-title` and `html-has-lang` rules run on **any** document, so neither `> 0` clause is reachable — and the plan's own stated truth ("an axe scan over a page that failed to load fails the vacuity guard") would have been false as written. That is `[16-D9]`'s failure mode: a green gate on an unmeasured surface, which is worse than a false red.
- **Fix:** Added `MIN_SCANNED_NODES = 8` with its derivation in the docblock (3 on both degenerate subjects, 57 and 86 on the two real ones — the same shape as `MIN_EXAMINED_ELEMENTS`'s), and changed the node clause to `toBeGreaterThanOrEqual(MIN_SCANNED_NODES)`. Kept `passes.length > 0` and **said in the docblock that it is the hedge and the node floor is the clause doing the work**, rather than leaving a header that implies otherwise.
- **Files modified:** `e2e/helpers/axe.ts`
- **Verification:** Watched red — `about:blank` now fails with `about:blank: axe examined 3 nodes … against a floor of 8`, with the `where` prefix intact; `/terms` passes the whole assertion
- **Committed in:** `72b5c9c`

**3. [Rule 1 - Bug] `axe-core` was already in the tree at 4.12.0, so the install BUMPED it rather than adding it**

- **Found during:** Task 2
- **Issue:** The plan expected the lockfile to gain two **new** packages. It gained one (`@axe-core/playwright`) and bumped one: `axe-core` 4.12.0 → 4.13.0, forced by the `~4.13.0` constraint. `axe-core` is already a dev-only transitive of `eslint-config-next` → `eslint-plugin-jsx-a11y@6.10.2`, and npm dedupes to a single copy — so an unrelated consumer's dependency moved.
- **Fix:** Verified the diff touches those two packages and nothing else, then re-ran `npm run lint` because the bump is under the lint plugin: **0 errors**, 25 pre-existing warnings. Recorded the shared-dependency fact in the commit message so the next lockfile reader is not surprised by it.
- **Files modified:** `package-lock.json`
- **Verification:** `git diff package-lock.json` touches exactly `node_modules/@axe-core/playwright` (added) and `node_modules/axe-core` (version/integrity); `npm ls axe-core` shows the dedupe; `npm run lint` and `npm run test:design` both exit 0
- **Committed in:** `dc9b689`

**4. [Rule 3 - Blocking] `npm i -D` wrote a caret range, which the plan forbids**

- **Found during:** Task 2
- **Issue:** npm's default wrote `"@axe-core/playwright": "^4.13.0"`. An axe minor ships new rules, so a floating range turns a green audit red on an unrelated `npm ci`.
- **Fix:** Edited to the exact string `4.13.0`, matching `@playwright/test` and `tsx`, then `npm install --package-lock-only` to re-sync the lockfile.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `node -p "require('./package.json').devDependencies['@axe-core/playwright']"` prints `4.13.0`
- **Committed in:** `dc9b689`

---

**Total deviations:** 4 auto-fixed (2 bugs, 1 missing critical, 1 blocking)
**Impact on plan:** No scope creep — every fix is inside the three declared tasks and the four declared files. Two of them (1 and 2) correct claims the plan inherited rather than measured, which is precisely the work this plan exists to do: the artifact and the instrument are both worth less than nothing if they assert things that are not true.

## Issues Encountered

- **`e2e/tmp-axe-smoke.spec.ts`** was created to prove the helper works, run three times, and **deleted before the Task 3 commit**. It is not in git history and the working tree was checked clean afterwards. It is recorded here because the readings in this summary came from it and would otherwise have no provenance.
- **Pre-existing untracked files not touched by this plan:** `.claude/` and `.planning/phases/17-.../17-PATTERNS.md`. The latter is a phase planning artifact the planner left uncommitted; it is outside this plan's `files_modified` so it was not committed here, but someone should commit it before it is lost.

## Requirements

`requirements: [GATE-02]` in the plan frontmatter. **Not marked complete — requirements-advanced only.** This plan builds the instrument GATE-02 will be read through; it scans no product surface and asserts nothing about keyboard operability or focus indicators. `REQUIREMENTS.md` is unchanged on purpose.

## Verification

| Check | Result |
|---|---|
| `npm run test:design` | exit 0 — 64 files, 1216 passed, 3 skipped |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint e2e/helpers/axe.ts` | exit 0 |
| `git diff --name-only e439bf9..HEAD` | exactly the four declared files |
| `git status --porcelain drizzle/` | empty (GATE-06 / AC#32 — zero schema change) |
| `grep -c '\.options(' e2e/helpers/axe.ts` | `1` |
| `grep -c 'withTags\|withRules\|disableRules\|target-size' e2e/helpers/axe.ts` | `0` |
| classification tokens vs failure rows in `e2e-baseline-reds.md` | `10` vs `10` |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for 17-02.** Three things later plans should read off this one rather than re-deriving:

1. **The denominator is 10 rows, and `availability.spec.ts` is not among them.** `[260824-dbc]` records that this file's failing set is unstable run-to-run; four green runs on one day do not retire that. If it reddens during Phase 17, run it alone before attributing it.
2. **Plan 17-07's red-watch subject needs changing.** The plan for it names *"a URL that 404s"* as the vacuity probe. A 404 route on this app renders a full not-found document — 57 nodes, 22 passing rules, **zero violations** — so that watch cannot go red. `about:blank` is the subject that works, and it is already watched red here.
3. **Plan 17-13 owns the soft-404 escalation** and now also owns `open-capacity.spec.ts:407`, whose month-hop cause is stated as derived rather than isolated and wants a clock-pinned control run.

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
