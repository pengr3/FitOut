---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 18
subsystem: ui
tags: [design-system, error-boundary, nextjs-app-router, security, information-disclosure, playwright, vitest, typescript-ast, design-tokens]

# Dependency graph
requires:
  - phase: 11-09
    provides: "`patterns/error-state.tsx` — the two-action panel with a required `routeOut`, no `error` prop, and a header that explicitly defers the SENTINEL end-to-end proof to this plan"
  - phase: 11-15
    provides: "the `(legal)` route group and its layout, which is the fifth group STATE-02 needs a boundary for"
  - phase: 11-10
    provides: "the route groups the five boundaries are placed against — `(public)`, `(app)`, `(host)`, `(auth)`, `(legal)`"
  - phase: 11-12
    provides: "the group layouts whose blocking session gates still apply underneath a group boundary"
  - phase: 10-14
    provides: "`src/lib/design/tokens.generated.ts` — the DS-12/D-18 sanctioned duplicate, whose own header names `global-error.tsx` as its use case"
provides:
  - "STATE-02's error third closed: five route-group boundaries, each with two real actions, plus `global-error.tsx`"
  - "T-11-ERRLEAK proved end-to-end in a real browser — the assertion 11-09 explicitly refused to claim for its prop type"
  - "A MEASURED dev-vs-production table for React's server-error serialization, correcting the plan's prescribed `page.content()` zero-count"
  - "`tests/design/error-boundaries.test.ts` — the 5-row declared boundary inventory, both directions, 4 watched-red probes"
  - "`tests/design/global-error.test.ts` — the style-less document's four constraints, 4 watched-red probes"
  - "`src/app/dev/throw` — a dev-only, DB-free forced-500 affordance that 404s in production, verified"
  - "The resolution of 11-16's `routeOut` handoff: the inline search error keeps ONE action, permanently, with the argument"
affects: [11-21, 11-22, phase-13-booking-detail, phase-17-a11y]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A route-group boundary composes NO chrome and NO second `<main>` — its layout is still mounted and already owns both. The ROOT boundary is the exception and renders the landmark itself, because nothing above it does."
    - "Props typed as the INSTALLED `ErrorInfo` shape (`{ error: Error; reset: () => void }`) rather than the docs' `Error & { digest?: string }`, so the default export is assignable to `ErrorComponent` without leaning on parameter bivariance; `digest` is reached through a cast on the one line that needs it"
    - "`console.error(error)` in a boundary is deliberate and is not a leak — the browser console is not the DOM — and the distinction is stated in the file so it is a decision rather than an oversight"
    - "A style-less document paints from `THEME_TOKENS.court` hex through inline style objects, with the theme-swap exclusion recorded as data naming the plan that consumes it"
    - "An e2e zero-count carries a named CHANNEL exclusion plus a closure assertion (every whole-document occurrence must lie inside that one channel, and the channel must be non-empty), so a dev-only framework carrier cannot silently widen into a real leak"

key-files:
  created:
    - src/app/error.tsx
    - src/app/(app)/error.tsx
    - src/app/(host)/host/error.tsx
    - src/app/(auth)/error.tsx
    - src/app/(legal)/error.tsx
    - src/app/global-error.tsx
    - src/app/dev/throw/page.tsx
    - e2e/error-leak.spec.ts
    - tests/design/error-boundaries.test.ts
    - tests/design/global-error.test.ts
  modified:
    - tests/design/loading-coverage.test.ts
    - tests/design/empty-state-adoption.test.ts
    - src/components/search/search-results.tsx
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md

key-decisions:
  - "THE PLAN'S CENTRAL ASSERTION IS FALSE UNDER `next dev` AND TRUE IN PRODUCTION, and both halves were measured rather than argued. Dev serializes the full error into the HTML — `{\"message\":\"SENTINEL_LEAK_PROBE\",\"stack\":[[\"DevThrowPage\",\"C:\\\\Users\\\\…\\\\.next\\\\dev\\\\…\"]]}` inside a `self.__next_f` flight script, absolute filesystem path included. A production build carries `{\"digest\":\"3530324580\"}` and nothing else. The spec therefore asserts zero in the RENDERED document plus closure over one named channel, and the production figure is recorded as a measurement with a re-measure instruction rather than faked into an assertion."
  - "The plan's preferred `?throw=1` on `/dev/theme` was BUILT and measured before being rejected, and the prediction about it was wrong. It did NOT flip the route table — `/dev/theme` stayed `○ Static`, because the production guard short-circuits into `notFound()` before `await searchParams` is reached. What actually bit is that the page's default export had to become async, and `loading-coverage.test.ts` then demanded a `loading.tsx` for one of the seven routes it itself names as needing none."
  - "`loading-coverage.test.ts`'s pinned counts moved 27/7 → 28/8 for `src/app/dev/throw/page.tsx`, staged in the same commit as the route, with the DECISION (sync default export, therefore non-qualifying, therefore no fallback) written into that gate's header — which is exactly what its own comment asks a bumper to do."
  - "No boundary composes chrome. The four group boundaries render inside their layout and keep it for free; the root one deliberately does not compose the shell, because it is a client component and pulling `SiteChrome`/`SiteFooter` into it would fork 11-14's footer inventory onto a surface that is not a route. The consequence — a failed `/` unmounts the public header and footer — is measured and logged rather than hidden."
  - "`global-error.tsx` needed ONE narrow `eslint-disable` for `@next/next/no-html-link-for-pages`. The UI-SPEC requires a plain anchor because the client router lives inside the tree that just failed; the disable names that one rule on that one line, with the reason beside it, rather than widening the ESLint config over a whole glob. It creates no DS-13 hole — the leak gate's exemption comments carry their own rule id."
  - "`error.cause` is banned alongside `message` and `stack` — one property wider than the plan asked for. `err.cause` is where a wrapped original error lives (the PayMongo response, the Postgres driver error), so rendering it discloses strictly more than `message` does."
  - "11-16's deferred `routeOut` question is answered in the OTHER direction for the sixth call site: there is no route out of a failed search, because the only candidate is the page the user is already on, and `ErrorState`'s two-action rule exists for a boundary that has REPLACED a screen. The `NON_EMPTY_STATE_DASHED` row is now permanent rather than pending."
  - "The five boundaries avoid spelling `error.message` and `error.stack` anywhere, comments included, so the plan's zero-count grep is honest — while the design gate does the real work over the AST, where a future author's security comment is invisible by construction."

patterns-established:
  - "Two instruments, one defect, watched together: the injected `{error.message}` was run against the e2e spec AND the design gate in the same tree, and each file's header records the other's failure output — so the pairing is legible rather than asserted"
  - "A prescribed probe is not trusted until it is confirmed red on a broken tree AND green on a correct one, with a positive control underneath any equality that could be zero-vs-zero"
  - "The count and the set-equality live in SEPARATE `it` blocks: written as two `expect`s in one block, the count fails first and the set-equality never runs — measured, and it is why probe (c) initially reported a number naming no file"
  - "A gate's per-row clauses are driven by the DECLARED inventory rather than by the walk, so an emptied scan surfaces as `undefined` in a named row instead of as an empty list every `toEqual([])` is happy with"

requirements-completed: [STATE-02]

# Metrics
duration: 95min
completed: 2026-08-17
---

# Phase 11 Plan 18: Error Boundaries Summary

**Five route-group boundaries and `global-error.tsx` now exist where there were zero, none of them can be handed anything off the error object but `digest` — and the plan's own security assertion turned out to be false under `next dev` and true in production, which was measured on both servers rather than assumed on either.**

## Performance

| | |
|---|---|
| Duration | ~95 min |
| Tasks | 3 of 3, plus one closed handoff |
| Commits | 4 |
| Files created | 10 |
| Files modified | 4 |
| Design suite | 37 files / 663 tests → **39 files / 693 tests**, all green |
| Full suite | 1217 passed / 4 skipped — unchanged (the design suite runs under its own config) |
| Route table | one addition, `○ /dev/throw`. Static routes 5 → 6, **zero flips** |
| Migrations | none; `ls drizzle/*.sql \| tail -1` still `0025_audit_resolved_by.sql` (GATE-06) |

## What shipped

### Task 1 — the five boundaries (`a20a2f8`)

| File | Route out | Wrapper | Why that destination |
|---|---|---|---|
| `src/app/error.tsx` | `Back to search` → `/` | its own `<main>` | Search is the product's core value; nothing above it renders a landmark |
| `src/app/(app)/error.tsx` | `Your bookings` → `/bookings` | `<div>` | The layout's `<main>` already exists; a signed-in booker's recourse is what they already hold |
| `src/app/(host)/host/error.tsx` | `Host dashboard` → `/host` | `<div>` | On `host/`, NOT `(host)/` — one level up would render with no host chrome |
| `src/app/(auth)/error.tsx` | `Back to log in` → `/login` | bare `w-full` | The one boundary with no session behind it; a gated destination would bounce them back |
| `src/app/(legal)/error.tsx` | `Back to FitOut` → `/` | bare `w-full` | Should never fire, must still exist; someone reading the terms was not mid-search |

All five: `"use client"` in the prologue, `onRetry={reset}`, `digest` extracted through a cast on one line, `// TODO(next@16.3): retry()` beside it, and `console.error` in a `useEffect` with a comment saying why a console is not a DOM.

`grep -rc "error.message\|error.stack"` over all five returns **0**, code and comments alike — the two property names are deliberately not spelled anywhere in the files, the trap `src/app/not-found.tsx` records for its own zero-count criterion.

### Task 2 — `global-error.tsx` and its gate (`ee9a28d`)

Renders its own `<html lang="en">` and `<body>`, zero class attributes, every colour read from `THEME_TOKENS.court`, a system font stack literal, a plain anchor, no header, no footer. Its import list is **pinned to exactly two** (`react`'s type-only import and the token module), which is how the "reaches no database" clause is prevented from being bypassed transitively.

`tests/design/global-error.test.ts`, 13 tests. Half the falsifiability was already paid for — `leak.test.ts` scans `src/app/**`, so a hand-typed colour fails the build today — so this file asserts only what a raw-value scan is blind to.

### Task 3 — the SENTINEL probe and the boundary gate (`7812f1a`)

`src/app/dev/throw/page.tsx` throws `new Error("SENTINEL_LEAK_PROBE")` during render and 404s in production. `e2e/error-leak.spec.ts` drives it in Chromium; `tests/design/error-boundaries.test.ts` (17 tests) carries the five-row declared inventory with a reason per row.

**Which boundary actually catches it was measured, not inferred from the file tree** (11-17's warning about ancestor `loading.tsx` applies to boundaries too). The dev server printed `[boundary] root … (src/app/error.tsx:92:13)` — the root boundary, as designed.

## The measurement that changed the plan

The plan's central acceptance criterion is *"`page.content()` contains `SENTINEL_LEAK_PROBE` **zero** times"*. Run verbatim, it fails.

| server | occurrences in `page.content()` | the flight error record, verbatim |
|---|---|---|
| `next dev` | **1** | `{"digest":"1030820611","name":"Error","message":"SENTINEL_LEAK_PROBE","stack":[["DevThrowPage","C:\\Users\\Admin\\Roaming\\FitOut\\.next\\dev\\server\\chunks\\ssr\\[root-of-the-server]__….js",102,11,0,0,false]]}` |
| `next build && next start` | **0** | `{"digest":"3530324580"}` |

React's development error serialization puts the message **and an absolute filesystem path** into a `self.__next_f` script. That is precisely the disclosure class T-11-ERRLEAK names — and it is the framework's, it is dev-only, and it is redacted to a bare digest where the app ships.

The production figure was obtained by temporarily replacing `/dev/throw`'s `NODE_ENV` guard with `export const dynamic = "force-dynamic"`, building, serving on `:3100`, requesting the route once, then restoring the guard and re-verifying the 404. That measurement **cannot be re-run from the shipped spec**, because the affordance 404s in production — which is T-11-THROWROUTE working correctly. It is recorded, with the re-measure recipe, in `deferred-items.md` and in the spec's header.

So the spec asserts what is both true and load-bearing:

1. `[data-testid="error-state"]` is visible — first, because every zero-count below passes against a blank page.
2. **Zero** in the rendered document (scripts and the dev overlay portal removed) — the real claim.
3. **Zero** in `document.body.innerText` — a different string; a leak could be in either.
4. **Closure:** every whole-document occurrence must lie inside the one named `self.__next_f` channel. A leak into a template, an attribute, an inline handler or a future mechanism fails here even though clause 2 might not see it.
5. **Positive control:** the channel count must be `> 0`, so clause 4 is not two zeros agreeing; and the digest DOES render as `Reference <hash>`, so clause 2 is not satisfied by a boundary that received nothing.
6. Both actions present, `href="/"`, and both `.focus()`-reachable.

## Watched red — every probe run, every one reverted

**`e2e/error-leak.spec.ts`** (green = 3 passed)

| probe | result |
|---|---|
| (a) `<p>{error.message}</p>` injected into `src/app/error.tsx` | **2 failed / 1 passed** — `Expected: 0 / Received: 1` on the rendered count, `Expected: 1 / Received: 2` on the channel closure. The two-action test stayed green: a leak does not remove an action. |
| (b) `PAGE` pointed at `/dev/throw-nope` | **3 failed / 0 passed**, every failure the reachability guard — *"rendered NO `[data-testid="error-state"]` … this is a failure, not a skip"*. Without clause 1 all three zero-counts would have been green against a 404. |

**`tests/design/error-boundaries.test.ts`** (green = 17 passed)

| probe | result |
|---|---|
| (a) the same `{error.message}`, same tree | **1 failed / 15 passed** — `+ [ "src/app/error.tsx:100 error.message" ]`. One edit, two instruments, neither substitutable. |
| (b) `error={error}` on the `(app)` boundary | **1 failed / 15 passed** — `+ [ "src/app/(app)/error.tsx:47 error={…error…}" ]`. It does not compile, which is the point: the type is the primary mitigation and this is what notices when the type stops being it. |
| (c) a sixth boundary at `src/app/(public)/error.tsx` | **found a defect in the gate itself.** First run: **1 failed / 15 passed**, message `expected 6 to be 5` — a number naming no file, because the count and the set-equality were two `expect`s in one `it` and the count failed first. Split into two blocks; re-run **2 failed / 15 passed**, and the second names `src/app/(public)/error.tsx`. |
| (d) `APP_DIR` → `src/app-nope` | **7 failed / 10 passed**. **Three assertions passed over the empty walk** — the parse loop and both `toEqual([])` security clauses. Sixth time this phase has recorded that shape. |

**`tests/design/global-error.test.ts` + `leak.test.ts`** (green = 38 passed: 13 + 25)

| probe | result |
|---|---|
| (a) `className="text-red-500"` | **2 failed / 36 passed** — one from each gate, the pairing the UI-SPEC claims |
| (a2) `className="text-muted-foreground"` | **1 failed / 37 passed** — this gate ALONE. The far likelier mistake is invisible to the leak gate, which is why clause 2 is not redundant. |
| (b) token import deleted, six local hex constants | **3 failed / 35 passed** — the missing import, the pinned import list, and six raw-hex reports from `leak.test.ts`. DS-12/D-18's whole argument in one diff. |
| (c) path → `src/app/global-error-nope.tsx` | **5 failed / 33 passed**. **All three negative clauses passed over a file that does not exist.** |

## Deviations from Plan

**1. [Rule 3 — Blocking] `global-error.tsx`'s plain anchor fails `npm run lint`**
- **Found during:** Task 2, on the unreachable-`DATABASE_URL` build.
- **Issue:** `@next/next/no-html-link-for-pages` — *"Do not use an `<a>` element to navigate to `/`"* — errors on the anchor the UI-SPEC explicitly requires. `npm run build` is `lint && test:design && next build`, so it short-circuited before either other gate ran.
- **Fix:** one `// eslint-disable-next-line @next/next/no-html-link-for-pages` on that line, with the reason beside it and in the file header. Not a config-level exemption, which would silently cover the whole file and the next file added to the glob. Verified it creates no DS-13 hole: `leak.test.ts`'s exemption comments carry their own rule id (`tests/design/leak.test.ts:199`).
- **Files:** `src/app/global-error.tsx` · **Commit:** `ee9a28d`

**2. [Rule 2 — Missing critical] `error.cause` added to the banned property list**
- **Issue:** the plan names `message` and `stack`. `err.cause` is where a wrapped original error lives — the PayMongo response body, the Postgres driver error — so it discloses strictly more.
- **Fix:** banned alongside the other two, with a self-test fixture, and the widening argued in the gate's header.
- **Files:** `tests/design/error-boundaries.test.ts` · **Commit:** `7812f1a`

**3. [Rule 3 — Blocking] `loading-coverage.test.ts`'s pinned counts, 27/7 → 28/8**
- **Issue:** `src/app/dev/throw/page.tsx` is a 28th `page.tsx`, and that gate pins the total by construction.
- **Fix:** bumped in the SAME commit as the route, with the DECISION recorded in the gate's header — sync default export ⇒ cannot suspend ⇒ non-qualifying ⇒ no `loading.tsx`. That gate's own comment asks a bumper to do exactly this rather than bump the number to make a run green.
- **Files:** `tests/design/loading-coverage.test.ts` · **Commit:** `7812f1a`

**4. [Rule 1 — Bug in the new gate] count and set-equality in one `it`**
- **Found during:** probe (c) on `tests/design/error-boundaries.test.ts`.
- **Issue:** the sixth boundary reported `expected 6 to be 5` and never named the file, because the count assertion failed first and the `toEqual` in the same block never ran — the trap `loading-coverage.test.ts` documents for its own pinned count, reproduced verbatim in a brand-new file.
- **Fix:** split into two `it` blocks; probe re-run and both now report.
- **Files:** `tests/design/error-boundaries.test.ts` · **Commit:** `7812f1a`

**5. [Out of plan scope — a handoff addressed to this plan] 11-16's `routeOut` question, closed**
- **Issue:** `deferred-items.md` and two files in the tree said the conversion of `search-results.tsx`'s inline error was blocked on a product decision *"belonging to the five boundaries plan 11-18 owns"*.
- **Decision:** answering it five times is what makes the sixth case decidable in the other direction. There is no route out of a failed search — the only candidate is `/`, the page the user is already on, and rendering a dead action to satisfy a required prop makes "two actions, always" mean less everywhere it is enforced. `ErrorState`'s two-action rule exists because a BOUNDARY replaces the whole screen; an inline failure inside a working page (header, filters, footer and search form all still mounted) is a different shape and legitimately has one action.
- **Fix:** comment-only. The `NON_EMPTY_STATE_DASHED` row is marked **permanent**, not pending, and re-opening it now needs an argument rather than a note that the count could be higher. No markup changed; `empty-state-adoption.test.ts` still 31 passed.
- **Files:** `src/components/search/search-results.tsx`, `tests/design/empty-state-adoption.test.ts`, `deferred-items.md` · **Commit:** `73bd1ab`

## The route table, diffed mechanically

Before (`47afb45`) and after are byte-identical except for one added line:

```
├ ○ /dev/theme
├ ○ /dev/throw      ← the only change
```

Static routes 5 → 6 (`/_not-found`, `/dev/theme`, `/dev/throw`, `/opengraph-image`, `/privacy`, `/terms`). **No `○`/`ƒ` flips.** Re-run with `DATABASE_URL=postgres://unreachable:unreachable@127.0.0.1:59999/nope`: exit 0, table identical — CI job 1's DB-free property intact with a style-less document and five client boundaries in the tree.

`npm run build && npx next start -p 3100`, then `curl`:

```
/dev/throw  -> 404
/dev/theme  -> 404
SENTINEL in the 404 body: 0
```

T-11-THROWROUTE verified.

## What is NOT closed

- **No `src/app/(public)/error.tsx`.** A failed `/` or `/invite/[token]` unmounts the public header and footer, because the root boundary is declared above `(public)/layout.tsx`. Measured, logged, and deliberately not fixed — STATE-02's inventory is five and the gate pins that list, so a sixth is a decision for a later plan. Probe (c) in the gate's header is exactly that edit, already watched.
- **`global-error.tsx` has no document `<title>`** (WCAG 2.4.2, Level A). Not guessed at: Next assembles that head, nothing in this repository can force a root-layout failure to look at the result, and inventing head content in the one surface that must work when nothing else does is the wrong blind trade. Addressed to 11-22, which will have it in a browser.
- **The production zero-count is a recorded measurement, not an assertion.** If React ever stops redacting, no test here will notice. The re-measure recipe is in `deferred-items.md` and the spec header.
- **The e2e spec drives one boundary on one route.** The other four and `global-error` are covered structurally only. Both files name the other's blind spot.
- **Which boundary catches which throw is measured for the ROOT one only.** The other four are argued from the tree.

## For plan 11-22

`global-error` is the **single baselined surface excluded from the theme-swap smoke** — `court.png === grove.png` is CORRECT there, because an app-level `data-theme` attribute cannot reach a document the page renders itself. Carry it in the `EXCLUDED_PAIRS` idiom **as data with that reason**, never as a silently absent baseline. The requirement is written into `src/app/global-error.tsx`'s own header so it is found at the file rather than as an absence in a checklist. Capture that surface's tab title while you are there.

## Notes for the next executor

- **A stale `next dev` really does poison the run.** The first execution of `e2e/error-leak.spec.ts` failed all three tests with `net::ERR_ABORTED; maybe frame was detached?` — caused by a dev server left running across two `npx next build` invocations, reused via `reuseExistingServer`. Killing it and letting Playwright boot a fresh one: 3 passed. Never read a single e2e result as a regression.
- **Enumerate before trusting a count.** Ten for ten in this phase now. The route table, the design-suite totals and the `error.tsx` inventory here were all measured before and after.
- The four probes on the design gates and the two on the spec are recorded verbatim in each file's header, with the green totals stated separately per file — a combined total cannot tell you which file went quiet.

## Self-Check: PASSED

All ten created files exist on disk; all four commits are in `git log`.

```
FOUND: src/app/error.tsx                    FOUND: src/app/global-error.tsx
FOUND: src/app/(app)/error.tsx              FOUND: src/app/dev/throw/page.tsx
FOUND: src/app/(host)/host/error.tsx        FOUND: e2e/error-leak.spec.ts
FOUND: src/app/(auth)/error.tsx             FOUND: tests/design/error-boundaries.test.ts
FOUND: src/app/(legal)/error.tsx            FOUND: tests/design/global-error.test.ts

FOUND: a20a2f8   FOUND: ee9a28d   FOUND: 7812f1a   FOUND: 73bd1ab
```
