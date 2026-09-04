---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 12
subsystem: app-shell
tags: [shell-01, state-01, suspense, streaming, session-gate, t-04-06, t-04-02, ast-gate, d-04, nav-adoption]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-10's `patterns/site-chrome.tsx` (`SiteChrome`/`SiteNav`/`NavLinks`/`ProfileLink`), `patterns/auth-slot-skeleton.tsx`, `src/lib/nav.ts` and `site/public-header.tsx`; plan 11-07's `measurements.ts` and the `patterns/*skeleton*.tsx` box gate; plan 11-02's `selector-contract.ts`"
  - phase: 10-design-system-token-layer
    provides: "`--z-sticky`, `helpers/strip-comments.ts`, and `tests/use-server-exports.test.ts`'s `ts.createSourceFile` scanner idiom"
provides:
  - "`src/components/patterns/ambient-notifications.tsx` — `AmbientNotifications` (the notification triple) and `AmbientHostNav` (the D-65 count), two async Server Components that structurally cannot gate"
  - "Both group layouts converted onto `SiteChrome`: four headers collapse to ONE box, D-04's content distinction intact"
  - "`src/lib/nav.ts`'s FIRST adopter — the host nav is now one inventory, two placements, one landmark, measured in a browser"
  - "`tests/design/blocking-session-gate.test.ts` — 17 assertions over the AST, four guard-the-guard clauses first, watched red four ways"
  - "`NOTIFICATION_BELL_BOX` (`size-11`) + `BellSlotSkeleton`, and the correction that the shipped bell is 44px and not 32px"
  - "The measured fact that all four compositions render 64px at 1280 and 56px at 375, with the host on the neutral tint and the booker on the page surface"
affects: [11-13, 11-14, 11-15, 11-18, 11-21, 11-22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A security gate is asserted by LEXICAL CONTAINMENT (inside the default export, no JSX ancestor), never by source order — source order is green on the extract-into-a-sibling-component refactor, which was measured"
    - "A `<Suspense>` fallback is sized from the control it stands in for, not from the slot that contains it: the whole-cluster fallback inside an already-populated cluster is a 132px reflow"
    - "An async child that receives a verified id as a PROP is a STRONGER owner-scoping guarantee than one that reads the session itself — it has no session and no request headers to be confused by"
    - "A guard-the-guard clause written as a `for…of` over parsed files passes vacuously; the same clause written as one `toEqual` over all DECLARED files fails when the scan opens nothing"

key-files:
  created:
    - src/components/patterns/ambient-notifications.tsx
    - tests/design/blocking-session-gate.test.ts
  modified:
    - src/app/(app)/layout.tsx
    - src/app/(host)/host/layout.tsx
    - src/components/site/public-header.tsx
    - src/components/patterns/auth-slot-skeleton.tsx
    - src/lib/design/measurements.ts
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md

key-decisions:
  - "THE PLAN'S ONE-CHILD-TWO-SLOTS SHAPE IS IMPOSSIBLE, and it is not a preference call: a React component cannot return a value to its parent, and `SiteChrome`'s `nav` and `actions` are two DOM positions that one subtree cannot land in. Two exports, two boundaries, one file, one prohibition header"
  - "The plan's `<Suspense fallback={<AuthSlotSkeleton />}>` around the BELL ALONE would have shipped a 132px reflow on every authenticated page — 366px pending against 234px resolved. A bell-sized fallback and a new measurement constant instead"
  - "`AUTH_SLOT_ICON`'s docblock claimed the bell is `size-8`; the shipped bell is `size-11` and has been since D-92. Measured 44px in a browser. Corrected rather than retargeted, because the drawer trigger really is 32px"
  - "The gate asserts LEXICAL CONTAINMENT, not source order — the plan's own source-order criterion is RED on a correct tree (both layouts write `<Suspense>` in the paragraph forbidding it, 25 lines above the session read) and GREEN on the extract-into-a-sibling break, both measured"
  - "The plan's `grep -rc \"<Toaster\" src/app/` → 1 is wrong about the tree: there are FOUR mounts and `src/app/layout.tsx:130` enumerates them by name. `(app)`'s is exactly one and did not move; the three host page mounts are out of scope and hoisting them would need all three deleted in the same commit"
  - "`AmbientHostNav`'s pending-request count is NEWLY wrapped in try/catch. Un-wrapped behind a boundary is strictly worse than un-wrapped in a layout: the throw reaches no error boundary and blanks the route AFTER the shell has been sent"
  - "`public-header.tsx`'s copy of the ambient read is deleted — 11-10 flagged it as the extraction 11-12 owed. Three copies became one; no nested boundary was added, because on that surface the session read is itself the pending thing"

patterns-established:
  - "Before trusting a plan-prescribed grep, RUN it and record whether it can go red — the eighth application in this phase, and the first where the prescribed check is red on a CORRECT tree rather than green on a broken one"
  - "A red e2e spec gets two controls before it is attributed: a fresh server (excludes 11-11's stale-dev-server class) and the pre-plan tree (excludes the plan)"

requirements-completed: []

# Metrics
duration: 58min
completed: 2026-08-14
---

# Phase 11 Plan 12: The Blocking Gate and the Streamed Shell Summary

**Both group layouts now render the shared shell and stream their four database reads, while the session read and all three redirects stay blocking — and writing the gate for that property found that the plan's own source-order check is RED on a correct tree and GREEN on the exact refactor it exists to catch. The plan's prescribed `<Suspense>` fallback would have shipped a 132px header reflow on every authenticated page.**

## Performance

- **Duration:** 58 min
- **Started:** 2026-08-14T00:38:00Z
- **Completed:** 2026-08-14T01:36:00Z
- **Tasks:** 3 (plus one deferred-items commit)
- **Files modified:** 2 created, 6 modified

## Accomplishments

- **Four independently-drifting header boxes are now one.** `(app)`, `(host)`, the public composition and the checkout composition all render `patterns/site-chrome.tsx`. Measured in a real browser at 1280 and 375: **64px and 56px, identically, in every composition**, with `position: sticky` and `top: 0` on all of them.
- **D-04 is visibly intact, measured rather than asserted.** Host: `bg-muted` → `lab(96.52 …)`, brand text `FitOut · Hosting`, its own two links. Booker: `bg-background` → `lab(100 0 0)`, brand text `FitOut`, no nav. Same box, different content — which is exactly the split `site-chrome.tsx`'s header claims.
- **The gates did not move, and that is now machine-checked in both directions.** `tests/design/blocking-session-gate.test.ts` walks the AST and asserts every `getSession`/`redirect` call sits inside the layout's default export with **no JSX ancestor of any kind**, that the session read is **awaited**, and that `(host)` keeps its `canHost` redirect. Watched red four ways; every probe reverted.
- **A signed-out `curl -s -i` proves the layout — not the middleware — is what redirects.** `/bookings` and `/host` both return `307 → /login` with `data-next-error-digest="NEXT_REDIRECT;replace;/login;307;"` and a stack frame naming **`AppLayout`**. `src/middleware.ts`'s matcher is `["/login", "/signup"]`, so neither route is middleware-gated at all. Zero `site-header`, `site-auth-slot`, `data-mode-switch`, `site-nav` or `<main` in either body.
- **`src/lib/nav.ts` has its first adopter.** 11-10 shipped it with ZERO — *"nothing mechanical holds the two lists together until that conversion lands"*. It has landed: `navLinks: ["Earnings","Requests"]` rendered from the inventory, **`navLandmarks: 1` at 1280 AND at 375**, with `menuTriggers: 1` (the drawer) below `md:`. The drawer has now rendered in a browser for the first time.
- **The third copy of the ambient read is gone.** 11-10 flagged `public-header.tsx` as *"plan 11-12 should extract it"*. Three copies of the same eight lines → one async child, three mounts.
- **Zero packages, zero vendored edits, zero migrations.** `ls drizzle/*.sql | tail -1` is still `0025_audit_resolved_by.sql`.

## Task Commits

1. **Task 1: The async children** — `2c43373` (feat)
2. **Task 2: Both layouts onto `SiteChrome`, gates still blocking** — `7b4502d` (feat)
3. **Task 3: The AST gate over the blocking property** — `330f835` (test)
4. *(follow-up)* **The open-capacity re-confirmation and its two controls** — `49f3118` (docs)

## Files Created/Modified

**Created**

- `src/components/patterns/ambient-notifications.tsx` — two async Server Components. `AmbientNotifications({ userId, surface })` holds the `countUnread` / `listRecent` / `readDbNow` triple and renders the bell; `AmbientHostNav({ userId })` holds the D-65 pending-request count and renders `SiteNav`. Header block states in one sentence what the file may not do: read a session, gate, or redirect.
- `tests/design/blocking-session-gate.test.ts` — 17 assertions. Four guard-the-guard clauses first, then eight real clauses, then five both-directions fixtures.

**Modified**

- `src/app/(app)/layout.tsx` — gate unchanged and blocking; renders `SiteChrome brand="FitOut" brandHref="/"`, actions = `ModeSwitch` + `<Suspense><AmbientNotifications/></Suspense>` + `ProfileLink`. Toaster unmoved.
- `src/app/(host)/host/layout.tsx` — both gates unchanged and blocking; `SiteChrome` with the `· Hosting` wordmark, `surface="muted"`, a streamed `nav` and the same actions cluster with `surface="host"`.
- `src/components/site/public-header.tsx` — its copy of the ambient read deleted; renders `<AmbientNotifications surface="public" />`.
- `src/components/patterns/auth-slot-skeleton.tsx` — `BellSlotSkeleton` added, with the reflow arithmetic that makes it necessary.
- `src/lib/design/measurements.ts` — `NOTIFICATION_BELL_BOX` added (10th constant); `AUTH_SLOT_ICON`'s docblock corrected.

### The comments that moved, and where they went

| Sentence | From | To |
|---|---|---|
| *"OWNER-SCOPED IN THE QUERY on session.user.id (T-07-82) — never post-filtered, and never from anything the request supplied"* | `(app):47-48`, `(host):65-66`, `public-header:124-125` | `ambient-notifications.tsx`, once, strengthened: the child has no session and no request headers |
| *"a skewed client clock would otherwise render 'in 3 hours' on a notification that just arrived"* | `(app):48-50` | `ambient-notifications.tsx`, once |
| *"a notification read is an AMBIENT convenience, and it must never take down the shell that carries the session gate"* | `(app):52-53`, `(host):67-68` | `ambient-notifications.tsx`, once, plus the new reason it is now load-bearing rather than inherited |
| *"There IS no shared header component… Do NOT refactor the two headers into one here"* | `(app):38-45`, `(host):56-63` | **AMENDED in place in both**, not deleted: the box is shared, the compositions are not |

## Decisions Made

- **The plan's "one async child supplying both slots' data, not two boundaries" is not achievable, and the reason is structural rather than aesthetic.** The plan asks for `AmbientNotifications({ userId, surface, showPendingBadge })` that *"renders `<NotificationBell …/>` and, for the host, returns the badge count for the nav slot"*. A React component cannot return a value to its parent, and `SiteChrome` renders `nav` into `<nav data-testid="site-nav">` and `actions` into `<div data-testid="site-auth-slot">` — two DOM positions that one subtree cannot occupy. The stated goal behind "one child" was *"a single fallback shape"*, and that is unreachable for the same reason: the two slots have different shapes and therefore need different fallbacks (the nav's is `SiteNav` with no badges; the actions' is a 44px box). Shipped as two exports in one file, sharing one prohibition header. Recorded in the file so the next reader does not "simplify" it back.
- **The plan's prescribed fallback would have caused the layout shift the auth slot exists to prevent, and the arithmetic is in the source.** `<Suspense fallback={<AuthSlotSkeleton />}>` around the bell alone puts a `min-w-44` (176px) box *inside* an already-populated cluster: 96 + 12 + **176** + 12 + 70 = **366px pending** against 96 + 12 + **44** + 12 + 70 = **234px resolved**. The measured resolved slot widths are 226 / 228 / 228px, so the cluster really is content-sized and the reflow would have been real on every authenticated page. `BellSlotSkeleton` is the bell's own box; pending and resolved are equal. `AuthSlotSkeleton` remains correct where it is used — the public compositions, where the *session itself* is what has not resolved and nobody knows which cluster will win.
- **`AUTH_SLOT_ICON`'s stated reason had quietly become false, and it was load-bearing.** Its docblock read *"the bell, and every square control that sits beside it … all of which are `size-8`"*. `notification-bell.tsx:106` is `relative size-11` and has been since D-92; **measured 44px in a browser**. The 32px came from `11-UI-SPEC § Responsive behaviour`'s cluster estimate — the same direction as that document's `lg:sticky` count, which `sticky-offset.test.ts` records as 3 against the spec's 1. It is *corrected* rather than retargeted because both numbers are real: `NavDrawer`'s trigger genuinely is 32px. This is 11-09 finding 4's rule applied — and this one mattered, because it is exactly the constant a reader reaches for when they need a fallback for the bell.
- **The gate asserts lexical containment, and the plan's source-order criterion fails in BOTH directions.** *Red on a correct tree:* both layouts write `<Suspense>` inside the paragraph explaining why the gate may not go inside one, ~25 lines **above** the session read, so `grep -n "getSession\|redirect(\|<Suspense"` reports `<Suspense>` first in both files. *Green on a real break:* probe (b) extracted the gate into a sibling component in the same file and mounted it inside the existing boundary — textually first, lexically outside all JSX, **and the Suspense clause and the JSX-ancestor clause both stayed green**. Only "inside the default export's body" catches it, and that fixture is now permanent.
- **The `await` on the session read is asserted too, because it is the failure that leaves the redirect visibly present.** An un-awaited `getSession` returns a promise; `!session?.user` is false for every promise; the gate admits everybody while the `redirect("/login")` line sits right there in the diff looking correct.
- **`AmbientHostNav`'s pending count is newly wrapped, and the change is an improvement rather than a preservation.** The original was a bare `await` in the layout, so a database blip took the host surface down. Behind a streaming boundary an unhandled throw is *worse*: it reaches no error boundary (neither group layout has one) and blanks the route after the shell has been sent. Degrading to 0 costs a hidden badge for one render. The failure is logged rather than swallowed, because "0 pending" and "we could not count" are indistinguishable on screen and only the log separates them.
- **The public composition gets no nested boundary.** `PublicAuthSlot` is already a `<Suspense>` child behind `AuthSlotSkeleton`; a second boundary inside it would reserve a box inside a box that is not yet drawn. The slot resolves as one unit, exactly as before the extraction.
- **The three host page-level `<Toaster />` mounts are left alone.** Hoisting the Toaster into `(host)/host/layout.tsx` is the obviously-right shape *and* would require deleting all three in the same commit, or those pages render every toast twice — WR-04's own warning. Real scope, real e2e risk on the availability page, and not what this plan is about.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's single-component-two-slots shape cannot be written**

- **Found during:** Task 1
- **Issue:** `showPendingBadge` + *"returns the badge count for the nav slot"* has no valid React implementation; `nav` and `actions` are separate `SiteChrome` props.
- **Fix:** Two exports (`AmbientNotifications`, `AmbientHostNav`) in the one file the plan names, sharing its prohibition header. Two boundaries in `(host)`, one in `(app)`.
- **Files modified:** `src/components/patterns/ambient-notifications.tsx`
- **Committed in:** `2c43373`

**2. [Rule 1 - Bug] The plan's prescribed `<Suspense>` fallback is a 132px reflow**

- **Found during:** Task 2
- **Issue:** `<Suspense fallback={<AuthSlotSkeleton />}>` around the bell alone nests a `min-w-44` box inside a populated cluster.
- **Fix:** `NOTIFICATION_BELL_BOX` (`size-11`) + `BellSlotSkeleton`; `AUTH_SLOT_ICON`'s false docblock corrected in the same edit.
- **Verification:** Rendered `bellW: 44` on all three signed-in surfaces; `slotW` 226 / 228 / 228 against the 176px floor, so the cluster is content-sized and the reflow would have been real.
- **Files modified:** `src/lib/design/measurements.ts`, `src/components/patterns/auth-slot-skeleton.tsx`
- **Committed in:** `7b4502d`

**3. [Rule 2 - Missing Critical] The pending-request count had no degradation path behind a boundary**

- **Found during:** Task 1
- **Issue:** Moving a bare `await` behind `<Suspense>` converts "throw takes down the layout" into "throw blanks the route after the shell was sent, with no error boundary anywhere".
- **Fix:** try/catch → 0, logged.
- **Committed in:** `2c43373`

**4. [Rule 1 - Bug] `public-header.tsx` still held the third copy of the ambient read**

- **Found during:** Task 2
- **Issue:** 11-10's summary and threat flag both name this as plan 11-12's to extract; leaving it means the extraction removed two copies of three.
- **Fix:** Deleted; renders `<AmbientNotifications surface="public" />`. `AmbientSurface` gained `"public"`.
- **Committed in:** `7b4502d`

**5. [Rule 3 - Blocking] The vacuity probe found a guard-the-guard clause that was itself vacuous**

- **Found during:** Task 3
- **Issue:** `keeps the host's canHost capability gate` was a `for…of` over the *parsed* files. Probe (d) emptied that list and the clause **passed**.
- **Fix:** Rewritten as one `toEqual` over all *declared* layouts with `?? null` for an unparsed one. Probe re-run: 4 failed → **5 failed**.
- **Committed in:** `330f835`

### Plan-directed but out of `files_modified`

**6. Three files edited that `files_modified` does not list**

- `src/components/site/public-header.tsx` — deviation 4, and explicitly assigned to this plan by 11-10's Deferred Issues and Threat Flags.
- `src/lib/design/measurements.ts`, `src/components/patterns/auth-slot-skeleton.tsx` — deviation 2. Both are required for the boundary the plan mandates to not cause a reflow.

---

**Total deviations:** 6 (2 real bugs, 2 blocking impossibilities in the plan text, 1 missing-critical addition, 1 out-of-`files_modified` group)
**Impact on plan:** No scope creep, no package installed, no vendored primitive edited, no migration. Deviation 1 is the one that changes the shipped shape; deviation 2 is the one that would have been a visible regression on every authenticated page.

## Issues Encountered

- **The plan's `grep -rc "<Toaster" src/app/` → 1 is wrong about the tree, and the tree already documents why.** There are FOUR mounts: `(app)/layout.tsx` plus three host pages, enumerated by name in `src/app/layout.tsx:130-132`. `(app)`'s is exactly one, is outside the `<Suspense>` boundary and outside `SiteChrome`, and its WR-04 warning comment survives verbatim. Verified rendered: one `<section aria-label="Notifications alt+T">` and one `aria-live="polite"` region on `/bookings` — sonner's `[data-sonner-toaster]` `<ol>` only exists once a toast does, so the attribute count is 0 on a quiet page in both trees.
- **The plan's source-order acceptance criterion is RED on the correct tree.** Eighth instance in this phase of a prescribed check that cannot be trusted, and the first one that fails in this direction rather than passing vacuously. Both raw greps and the AST result are in the Verification table.
- **`npx tsc --noEmit` failed on `.next/dev/types/routes.d.ts` before any source was touched** — 11-10's deviation 8 verbatim, from the dev server's stale generated validator. `rm -rf .next/dev/types` → exit 0.
- **`e2e/open-capacity.spec.ts:376` is red, and it is neither this plan's nor the stale-dev-server class.** Two controls run today: a fresh Playwright-started server after `taskkill`-ing the long-running one (identical failure) and the pre-plan tree via `git checkout 7c8ef6b -- …` on all five touched files (identical failure). Three consecutive runs, same test, same assertion. Full write-up appended to `deferred-items.md`, including the new finding that `pickDay()` resolves an **enabled, in-month** Aug 17 cell and the calendar's selection never moves off today.
- **Playwright refused to reuse the running dev server once**, printing *"Process from config.webServer was not able to start. Exit code: 1"* with a `taskkill /PID` hint, while `curl` showed the server healthy on the same port. It reused it on every other run. Recorded because it reads exactly like a broken tree and is not one.

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (after each task) |
| `npm run lint` | 0 errors, 9 warnings — byte-identical to the phase baseline |
| `npm run test:design` | **30 files / 542 tests passed** (was 29 / 525 — +1 file, +17 tests, exactly the new gate) |
| `npm test` (full) | **134 files passed / 1 skipped; 1216 tests passed / 4 skipped** — byte-identical to the phase baseline |
| `DATABASE_URL=…@127.0.0.1:59999/nope npm run build` | **exit 0**, twice. 31 routes, table unchanged from 11-10 |
| `e2e/login-persistence` + `mode-switch` + `stale-session-selfheal` | **4 passed**, TWICE, on two independent runs |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| `git diff --diff-filter=D` across all four commits | empty — no commit deleted a tracked file |
| **curl `-s -i` `/bookings` signed out** | `307` → `location: /login`; digest `NEXT_REDIRECT;replace;/login;307;`; stack frame **`AppLayout`**; `site-header` 0, `site-auth-slot` 0, `data-mode-switch` 0, `site-nav` 0, `Hosting` 0, `<main` 0 |
| **curl `-s -i` `/host` signed out** | `307` → `location: /login`; same zero counts across all six probes |
| Middleware matcher | `["/login", "/signup"]` — **neither gated route is middleware-gated**, so the 307 is the layout's |
| Control: the 307 body's `loading.tsx` payload | **pre-existing.** Pre-plan layout restored → 18090 bytes with the same `Your bookings` skeleton payload; current 18089. Restored |
| **Rendered — `(host)` `/host` @1280** | `headerH 64`, `headerY 0`, `position sticky`, `bg-muted` → `lab(96.52 …)`, brand `"FitOut · Hosting"` (`A`), `navCount 1`, `navLandmarks 1`, links `["Earnings","Requests"]`, `modeSwitch 1`, bell `"Notifications, 0 unread"` @44px, `profileLinks 1`, `slotW 226` |
| **Rendered — `(app)` `/bookings` @1280** | `headerH 64`, `bg-background` → `lab(100 0 0)`, brand `"FitOut"`, `navCount 0`, `modeSwitch 1`, bell @44px, `slotW 228` |
| **Rendered — `(public)` `/` signed in @1280** | `headerH 64`, brand `"FitOut"`, `navCount 0`, `navLandmarks 0`, bell @44px, `slotW 228` — identical geometry, third composition |
| **Rendered — `(host)` `/host` @375** | `headerH 56`, `navLandmarks 1`, `menuTriggers 1` (the drawer's first browser render), `slotW 176` (the `min-w-44` floor) |
| Rendered — Toaster | one `section[aria-label="Notifications alt+T"]`, one `aria-live="polite"` region on `/bookings` |
| **Watched red (a) — gate inside the boundary, inline** | 2 failed / 15 passed: `"…(app)/layout.tsx:86 — redirect() inside <Suspense>"` + the JSX-ancestor clause. **The redirect COUNT stayed at 1** — a count-only gate is green on this. Reverted → 17 passed |
| **Watched red (b) — gate extracted into a sibling** | 3 failed / 14 passed: `"…:35 — getSession() in AnonymousGate, not the default export"`. **Suspense clause and JSX-ancestor clause BOTH stayed green.** Reverted → 17 passed |
| **Watched red (c) — `countUnread` re-inlined into `(host)`** | 1 failed / 16 passed: `"src/app/(host)/host/layout.tsx: countUnread"`. Reverted → 17 passed |
| **Watched red (d) — vacuity, `SRC_DIR` → `src-nope`** | 4 failed / 13 passed **and the canHost clause PASSED** → clause rewritten → re-run **5 failed / 12 passed**. All four absence clauses still pass vacuously, which is why the guards are first. Reverted → 17 passed |
| AST: `getSession`/`redirect`/`headers()`/`use client` in `ambient-notifications.tsx` | 0 / 0 / 0 / 0 (raw grep AND the AST gate) |
| AST: `countUnread`/`listRecent`/`readDbNow` in both layouts | 0 / 0 (raw grep AND the AST gate) |
| **Raw grep, recorded and NOT trusted** | `grep -n "getSession\|redirect(\|<Suspense"` puts `<Suspense>` FIRST in both layouts (`(app):14`, `(host):16`) — the plan's source-order criterion is red on a correct tree |
| `vitest.design.config.ts` | still no `globalSetup` / `setupFiles` — all four textual hits are inside comments explaining their absence |
| `git diff --stat … package.json components.json src/components/ui/` | empty — T-11-SC holds |

## Known Stubs

None. Every prop, every slot and both async children are complete and wired.

Two states worth naming so they are not mistaken for coverage:

- **The `<Suspense>` boundaries have never been observed PENDING.** Every rendered measurement above is of the resolved state — the notification read is sub-millisecond against a warm local Postgres, so no run has caught the fallback on screen. The reflow arithmetic that motivated `BellSlotSkeleton` is computed from class strings and the measured 44px resolved bell, not from a captured pending frame. The pending-versus-resolved `boundingBox()` comparison is plan **11-21**'s, and this plan makes it materially more interesting: there are now three boundaries with two different fallback shapes.
- **`loading.tsx` under either group is still UNWRITTEN.** This plan removes the thing that made one pointless; it does not add one. `(app)/bookings/loading.tsx` and `(host)/host/listings/loading.tsx` are the only two in the tree, both route-level. Whether a group-level `loading.tsx` now actually renders is asserted nowhere — it is the natural first check for whichever plan writes one.

## Threat Flags

None new. 11-10's `data-access-surface` flag on `src/components/site/public-header.tsx` is **partially discharged**: the read is now one shared child rather than a third copy, with the owner-scoping argument in one place. The surface itself is unchanged — `/` and `/invite/[token]` still issue three owner-scoped reads for a signed-in viewer, deliberately, per 11-10's decision.

Every registered threat is disposed as designed:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-04-06 / T-04-02 | mitigate | Gates unmoved and blocking. Asserted structurally by `blocking-session-gate.test.ts` (containment + no JSX ancestor + awaited + canHost), behaviourally by three e2e specs passing on two independent runs, and on the wire by a signed-out `curl` returning 307 with zero gated markup and a stack frame naming `AppLayout` |
| T-07-82 | mitigate | Owner-scoping stays in the query on `session.user.id`, passed as a prop from the blocking parent. **Strengthened by the move:** the child has no session to re-read and no request headers — zero `getSession` / `headers()` / `redirect(` by both raw grep and AST |
| T-11-CLOCK | mitigate | `readDbNow(db)` retained in the streamed triple, with its reason moved across |
| T-11-SHELLDOWN | mitigate | The try/catch degradation survived the move AND was extended to the pending-request count, which had none. Both log rather than swallow |
| T-11-TOASTDUP | mitigate | `(app)`'s single mount is unmoved, outside the boundary and outside `SiteChrome`; rendered check shows one toast region. The plan's count of 1 across `src/app/**` is corrected to 4 with the three pre-existing host mounts named |
| T-11-SC | mitigate | Zero packages; `package.json` / `components.json` / `src/components/ui/` diff empty across all four commits |

## Next Phase Readiness

- **Plan 11-13's sticky count is unaffected by this plan.** `EXPECTED_STICKY_SITES` is still 3 and the 3 → 1 direction 11-10 recorded stands. Neither group layout ever carried a `lg:sticky`.
- **Plan 11-14's footer has one new consideration.** Both group layouts wrap children in `flex min-h-full flex-col`, NOT the `flex min-h-dvh flex-col` that 11-10 gave the four new layouts. `<SiteFooter className="mt-auto" />` needs the container to be viewport-tall; whichever plan adds the footer to `(app)`/`(host)` should make that a deliberate one-line change rather than discovering it as a bug.
- **Plan 11-21 inherits three boundaries and two fallback shapes.** `(app)` and `(host)` stream only the bell behind `BellSlotSkeleton` (44px); the three public compositions stream the whole cluster behind `AuthSlotSkeleton` (176px). The pending-versus-resolved comparison now has a real difference to measure, and `NOTIFICATION_BELL_BOX` is the constant its assertion should read.
- **Plan 11-22's forward direction is unchanged at 14 of 17 ids**; this plan declared no new `data-testid` and shipped none. `site-nav` now appears on a *second* route tree (`/host`), so an exactly-once-per-page check is still correct and an exactly-one-route check is not.
- **`src/lib/nav.ts`'s NOT COVERED footer is now stale in the right direction.** It says *"plan 11-12 is what converts `(host)/host/layout.tsx` onto `SiteChrome` and this inventory, and until then the shipped host header still writes its two links inline"*. That has happened. The paragraph is left standing because it is written as a forward statement naming this plan, not as a claim about the present — but the next reader touching that file should collapse it.
- **A caution for whoever adds a third gated layout.** `blocking-session-gate.test.ts` polices two named files plus one named child, by deliberate design (see its NOT COVERED). A new gated route group is invisible to it until its path is added to `LAYOUTS`, and that should happen in the commit that creates it.

## Self-Check: PASSED

Both created files exist on disk (`src/components/patterns/ambient-notifications.tsx`, `tests/design/blocking-session-gate.test.ts`). All four commits (`2c43373`, `7b4502d`, `330f835`, `49f3118`) resolve in `git log`. `git diff --diff-filter=D --name-only` is empty for all four — no commit deleted a tracked file.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-14*
