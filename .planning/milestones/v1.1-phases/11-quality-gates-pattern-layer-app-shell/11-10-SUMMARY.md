---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 10
subsystem: app-shell
tags: [shell-01, route-groups, sticky-offset, auth-slot, suspense, server-session, nav-inventory, geometry, d-04]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-09's `ResponsiveDialog` (the host drawer's overlay) and its `--z-sheet` zero; plan 11-08's `PanelCard` `lg:top-20` derivation and its moved `STICKY_INVENTORY`; plan 11-07's `measurements.ts` (`HEADER_HEIGHT`, `AUTH_SLOT_BOX`) and the `patterns/*skeleton*.tsx` box gate; plan 11-02's `selector-contract.ts`, which declares all four `site-*` ids this plan owns"
  - phase: 10-design-system-token-layer
    provides: "`--z-sticky` (the layer this plan is the first to use for its literal purpose), `ui/button.tsx`'s DS-05 focus recipe and `asChild`, `helpers/strip-comments.ts`, `elevation-z.test.ts`'s per-file inventories"
provides:
  - "`src/components/patterns/site-chrome.tsx` — one geometry, three named slots, `brandHref={null}` → `<span>`; plus `NavLinks`/`NavDrawer`/`SiteNav`/`ProfileLink`"
  - "`src/components/patterns/auth-slot-skeleton.tsx` — the reserved-box `<Suspense>` fallback, every class from `measurements.ts`"
  - "`src/components/site/public-header.tsx` — THE public composition, server-side session read inside `<Suspense>`, shared by three route trees"
  - "`src/lib/nav.ts` — one host-nav inventory, two DOM placements, one `navigation` landmark"
  - "The restructured route tree: `(public)`, `listings/[id]/(detail)`, and `book/` as its sibling"
  - "`tests/design/sticky-offset.test.ts` — an AST paired scan of every `lg:sticky` offset against an 80px floor"
  - "The measured fact that the header is 56/64px IDENTICALLY in court and grove at five widths, and that the checkout header renders ZERO `<a href>`"
affects: [11-11, 11-12, 11-13, 11-14, 11-15, 11-18, 11-21, 11-22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A route GROUP, not a conditional, is how two sibling URLs get different chrome — the safety property becomes a fact about the file tree that no later edit to the shared header can leak past"
    - "A composition that three route trees share lives in ONE component; the layouts that mount it are two-line files"
    - "A gate asserts the RULE (every offset >= floor) rather than an inventory of paths, and pins the COUNT separately so 'somebody added a rail' and 'somebody added a broken rail' are different failures"
    - "A declared `data-testid` is written as a literal JSX attribute even when that means twice in two exclusive branches — hoisting it into a constant or a spread blinds the gate that must be able to see it"

key-files:
  created:
    - src/components/patterns/site-chrome.tsx
    - src/components/patterns/auth-slot-skeleton.tsx
    - src/components/site/public-header.tsx
    - src/lib/nav.ts
    - src/app/(public)/layout.tsx
    - src/app/listings/[id]/(detail)/layout.tsx
    - src/app/listings/[id]/book/layout.tsx
    - tests/design/sticky-offset.test.ts
  modified:
    - src/app/(auth)/layout.tsx
    - src/app/(public)/page.tsx
    - src/app/(public)/invite/[token]/page.tsx
    - src/app/listings/[id]/(detail)/page.tsx
    - src/components/booking/reserve-view.tsx
    - src/components/patterns/panel-card.tsx
    - src/lib/design/measurements.ts
    - tests/design/elevation-z.test.ts
    - tests/design/type-scale.test.ts

key-decisions:
  - "THERE ARE TWO SHIPPED `lg:sticky lg:top-8` SITES, NOT ONE — the UI-SPEC and the plan both say one; `panel-card.tsx` had already recorded both by path in 11-08. Both moved to `lg:top-20`, because a rule with an exception is not a rule"
  - "THE SCAN FOUND A THIRD SITE the plan could not have known about: `panel-card.tsx`'s own `sticky` prop is a real class string. The gate pins 3, and records that a correct 11-13 conversion drops it to 1"
  - "The public signed-in cluster is the FULL booker cluster (mode switch + bell + profile), not a reduced one — a header that changes identity between `/` and `/bookings` is the drift this plan exists to end. It costs three owner-scoped DB reads on `/` and `/invite/[token]`, inside `<Suspense>` and try/catch-degraded"
  - "`site-brand` is written as a literal JSX attribute in BOTH `brandHref` branches. The tidier spread/constant forms are invisible to `selector-contract.test.ts`'s literal-attribute walk, and blinding the gate is a worse trade than a repeated literal. DOM truth measured: exactly one node in each branch"
  - "The nav landmark wraps BOTH placements rather than being one of them, so `getByRole(\"navigation\")` is 1 at every viewport instead of 1-above-`md:`-and-0-below"
  - "`AUTH_SLOT_CONTROL` / `AUTH_SLOT_ICON` are the 8th and 9th measurement constants, added because AC#16 scans `auth-slot-skeleton.tsx` (its filename matches `*skeleton*`) and the UI-SPEC's prescribed `h-8 w-24` / `size-8` cannot both be literals and satisfy it"
  - "Task 1 ships the three layouts as structural wrappers and Task 3 wires `SiteChrome` into them — the plan's own Task 1 and Task 3 texts contradict each other on this, and splitting it this way is the only ordering where every commit leaves a green tree"
  - "SHELL-01 is COMPLETE, and it is this phase's first requirement to close on adoption rather than on declaration — its clause names exactly four routes and all four now render exactly one `site-header`, verified per route. SHELL-03 is NOT closed: its second clause is the live hold countdown, which is Phase 12's and whose slot this plan deliberately left empty"

patterns-established:
  - "Before trusting a plan-prescribed grep, RUN it and record whether it can go red; the file's own explanation is usually the thing that trips it (the seventh application in this phase)"
  - "A route-tree restructure diffs the resolved route table before and after rather than assuming URLs are unchanged"

requirements-completed: [SHELL-01]

# Metrics
duration: 62min
completed: 2026-08-13
---

# Phase 11 Plan 10: The App Shell — One Geometry, Three Compositions Summary

**Four public routes that rendered no navigation at all now carry a header whose height is 56/64px byte-identically in both themes at five widths — and the checkout route carries the same box with zero `<a href>` in it, guaranteed by the file tree rather than by a conditional. Writing the gate for the sticky-offset rule found the app has three `lg:sticky` sites, not the one the spec names.**

## Performance

- **Duration:** 62 min
- **Started:** 2026-08-13T22:44:00Z
- **Completed:** 2026-08-13T23:46:00Z
- **Tasks:** 3 (plus one follow-up legibility commit)
- **Files modified:** 8 created, 9 modified

## Accomplishments

- **SHELL-01's four navigation-less routes have a header.** `/`, `/listings/[id]`, `/invite/[token]` and `/listings/[id]/book` all render `[data-testid="site-header"]`; so do `/login`, `/signup`, `/forgot-password` and `/reset-password`, which previously had only a centred wordmark that is now deleted.
- **The geometry claim is MEASURED, not asserted, and it is the headline result.** In a real browser at 320 / 375 / 640 / 768 / 1280, in **court and grove**: `56, 56, 64, 64, 64` — the same five numbers in both themes, with no horizontal overflow at 320px in either. A type-driven header would have differed, because grove's type is one step larger throughout.
- **The checkout route's safety property is measured on a real render, not inferred.** Driven through the live hold flow: `{"headerCount":1,"anchors":0,"buttons":0,"brandTag":"SPAN","brandText":"FitOut","navCount":0,"slotCount":0,"headerBox":{"x":0,"y":0,"width":1280,"height":64},"railTop":"80px"}`. Zero links, zero buttons, the brand is a `<span>`, and the rail computes `top: 80px`.
- **Every URL is byte-identical after three `git mv`s.** The resolved route table was captured before and after and diffed mechanically: 31 routes, identical line for line. `git log --follow` resolves the pre-move history on all three files.
- **The build is still DB-free.** `DATABASE_URL=postgres://unreachable:unreachable@127.0.0.1:59999/nope npm run build` → exit 0 with the session-aware header in tree. 11-RESEARCH's Assumption A5 — the one open risk that could have reopened D-24's two-job CI shape — is now a measurement.
- **Zero packages, zero vendored edits, zero migrations.** `git diff --stat c55873c~1 HEAD -- package.json components.json src/components/ui/` is empty; `ls drizzle/*.sql | tail -1` is still `0025_audit_resolved_by.sql`.

## Task Commits

1. **Task 1: Route groups** — `c55873c` (refactor)
2. **Task 2: site-chrome, the nav inventory, the auth slot** — `0d3e9c1` (feat)
3. **Task 3: Wire the compositions, correct the offset, gate the rule** — `4814df2` (feat)
4. *(follow-up)* **State `Sign up`'s neutral variant explicitly** — `33c5132` (style)

## Files Created/Modified

**Created**

- `src/components/patterns/site-chrome.tsx` — geometry only: `HEADER_HEIGHT`, `sticky top-0 z-(--z-sticky) border-b`, the `mx-auto … max-w-6xl` container, and three named slots. Also exports `NavLinks` (the leaf renderer, used in both placements), `NavDrawer` (a `ResponsiveDialog` behind a `size-8 aria-label="Menu"` trigger), `SiteNav` (the two placements) and `ProfileLink`.
- `src/components/patterns/auth-slot-skeleton.tsx` — `aria-hidden` Server Component, one `AUTH_SLOT_CONTROL` bar plus one `AUTH_SLOT_ICON` circle inside `AUTH_SLOT_BOX`. Carries the argument for `aria-hidden` here versus `role="status"` on the three page-level skeletons.
- `src/components/site/public-header.tsx` — the public composition. Server-side `auth.api.getSession({ headers: await headers() })` inside `<Suspense>`; anonymous → `Log in` (ghost) + `Sign up` (default); signed-in → `ModeSwitch` + `NotificationBell` + `ProfileLink`.
- `src/lib/nav.ts` — `HOST_NAV_IDS` / `HOST_NAV` (a total `Record` over the closed union) / `HOST_NAV_LINKS`, each row carrying a mandatory `why`.
- `src/app/(public)/layout.tsx`, `src/app/listings/[id]/(detail)/layout.tsx`, `src/app/listings/[id]/book/layout.tsx` — the three new layouts.
- `tests/design/sticky-offset.test.ts` — 11 assertions, three guard-the-guard clauses first, watched red three ways.

**Modified**

- `src/app/(auth)/layout.tsx` — its own `text-2xl` centred wordmark deleted; renders `PublicHeader`. `/login` now serves exactly one `>FitOut<`.
- `src/app/listings/[id]/(detail)/page.tsx` and `src/components/booking/reserve-view.tsx` — `lg:top-8` → `lg:top-20`, both with the 64 + 16 derivation written beside them.
- `src/components/patterns/panel-card.tsx` — its "both offset by 32px" note had become false; corrected.
- `src/lib/design/measurements.ts` — two constants added (below).
- `tests/design/elevation-z.test.ts`, `tests/design/type-scale.test.ts` — pinned inventories moved (below).

### Pinned inventories, old → new

| Map / assertion | Old → New | Why |
|---|---|---|
| `STICKY_INVENTORY` (`elevation-z`) | 12 → **13** sites, mapped total 21 → **22** | `patterns/site-chrome.tsx`'s `z-(--z-sticky)`. **PERMANENT**, unlike `row-card.tsx`'s — the shell is the app's real sticky header, and plans 11-12/11-14 convert the two group layouts onto this same component, neither of which carries a z utility today. Expected end state is 11, not 10. |
| `DISPLAY_INVENTORY` (`type-scale`) | two KEYS renamed, total unchanged at 12 | `src/app/page.tsx` → `src/app/(public)/page.tsx`, `src/app/listings/[id]/page.tsx` → `src/app/listings/[id]/(detail)/page.tsx`. A path-keyed map breaks on a pure file move, which is correct behaviour. |
| `measurements.ts` | 7 → **9** constants | `AUTH_SLOT_CONTROL` (`h-8 w-24`) and `AUTH_SLOT_ICON` (`size-8`) — see decision below. |

Both `elevation-z` moves were **watched red first**, verbatim: `expected 13 to be 12` on the total, and a map diff naming `+ "src/components/patterns/site-chrome.tsx": 1`.

## Decisions Made

- **The plan (and the UI-SPEC) is wrong about how many `lg:sticky` sites exist, and the gate is what found it.** `11-UI-SPEC.md § The geometry contract` says *"there is exactly one such site today"* and the plan's `<action>` names only the listing page. The tree holds **three**: the listing rail, `booking/reserve-view.tsx:61`'s checkout rail, and `patterns/panel-card.tsx`'s own `sticky` prop. The second was already recorded by path in `panel-card.tsx`'s comment (11-08 wrote it), so the correction was sitting in the tree; the third only surfaced when the scan ran and reported `expected [80, 80, 80] to deeply equal [80, 80]`. Both shipped rails moved. Leaving the checkout rail at 32px would have been indefensible for a specific reason worth recording: the checkout composition is *minimal*, but "minimal" is about what the header CONTAINS — it is the same 64px sticky box, so its rail tucks under exactly as the listing page's does.
- **The gate asserts the RULE, not an inventory of paths, and pins the count separately.** A per-file map would say "these three files are correct today"; the failure worth catching is the FOURTH rail, added by a plan that never read this file, copying the wrong offset from whichever existing one it looked at. The count is a second, separate assertion so that "somebody added a rail" and "somebody added a BROKEN rail" produce different failures — measured in probe (b), where a *correct* new site left the rule green and moved only the count, and the failure message enumerated all four sites by `file:line`.
- **The public signed-in cluster is the full booker cluster, and that is a deliberate cost.** The UI-SPEC says the public signed-in actions are "identical to booker". Honouring it puts three owner-scoped DB reads (`countUnread`, `listRecent`, `readDbNow`) on `/` and `/invite/[token]` — the app's front door and a page opened by strangers holding a link. The alternative, a reduced cluster, would mean a signed-in user watching the header change identity as they move between `/` and `/bookings`, which is precisely the three-independently-drifting-boxes problem this plan exists to end. The reads sit inside the `<Suspense>` boundary (off the critical path) and inside a try/catch that degrades to a calm in-panel message. Flagged under Threat Flags because the plan's threat register does not carry it.
- **`site-brand` is a literal JSX attribute in both `brandHref` branches, and the tidier forms are wrong.** Both a spread object and a named constant were written and reverted after measuring `selector-contract.test.ts`'s collector: it is an AST walk over JSX attributes whose value is a string **literal** (its own fixtures assert `data-testid={id}` yields nothing). Either tidy would make a *declared* id invisible to the gate — and to plan 11-22's forward direction, which is the half that checks every declared id shipped. The DOM truth was measured instead: exactly **one** `site-brand` node in each branch, `A` when linked and `SPAN` when not, with a byte-identical class because both branches read one `BRAND_CLASS`.
- **The `<nav>` landmark wraps both placements rather than being one of them.** The obvious shape — `<nav className="hidden md:flex">` for the bar and a separate drawer — yields **zero** `navigation` landmarks below `md:` with the drawer closed, which fails the UI-SPEC's own falsifiable form (*"`getByRole("navigation")` resolves to exactly 1 at 320px and at 1280px"*). `SiteChrome` supplies one `<nav data-testid="site-nav">`; `SiteNav` puts a `hidden md:flex` bar and a `md:hidden` drawer trigger inside it. Measured: `navLandmarks: 1`, `inlineBar: "hidden md:flex"`, `drawerWrap: "md:hidden"`.
- **Two measurement constants were added rather than two gate exemptions.** `auth-slot-skeleton.tsx` matches `patterns/*skeleton*.tsx`, so AC#16 scans it and bans every literal box utility — while the UI-SPEC pins its fallback shape as *"one `Skeleton h-8 w-24` + one `Skeleton size-8`"*. Those cannot both hold with seven constants. `TEXT_BAR_HEIGHT`'s precedent decides it: an exemption for `w-24` would legalise a literal WIDTH at a call site, which is the exact shape T-11-GEODRIFT is about. The two values are real measurements — `w-24` is the mode switch's 96px and `size-8` is the bell's 32px, from the UI-SPEC's own responsive arithmetic — so the fallback is the same two boxes the resolved cluster puts in the same two places.
- **`shadow-sticky` is named descriptively, not quoted.** Sixth application of `booking-row.tsx:112`'s precedent in this phase. `elevation-z.test.ts` pins that utility's call sites as an exact per-file map, and a comment warning against it is textually indistinguishable from a call site using it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan names ONE `lg:sticky lg:top-8` site; the tree has two, and the gate found a third**

- **Found during:** Task 3
- **Issue:** `<action>` says *"Correct `src/app/listings/[id]/(detail)/page.tsx`'s rail"* and the gate spec says *"assert the count is exactly 1 today"*. `src/components/booking/reserve-view.tsx:61` carries the identical `lg:sticky lg:top-8` on the checkout rail — and the plan's OWN acceptance criterion (`grep -rc "lg:top-8" src/app src/components` → 0) is unsatisfiable without fixing it. `patterns/panel-card.tsx` is a third genuine class-string site (its `sticky` prop), correct already.
- **Fix:** Both shipped rails moved to `lg:top-20`, each with the 64 + 16 derivation. `EXPECTED_STICKY_SITES = 3`, with the discrepancy, all three paths, and the expected 3 → 1 direction after 11-13's conversion recorded in the constant's docblock.
- **Files modified:** `src/app/listings/[id]/(detail)/page.tsx`, `src/components/booking/reserve-view.tsx`, `tests/design/sticky-offset.test.ts`
- **Verification:** `expected [ 32, 80, 80 ] to deeply equal [ 80, 80, 80 ]` (probe a) and `expected [80,80,80] to deeply equal [80,80]` (the initial count of 2). Rendered: `railTop: "80px"` on the live checkout page.
- **Committed in:** `4814df2`

**2. [Rule 1 - Bug] `panel-card.tsx`'s stated reason became false the moment the rails moved**

- **Found during:** Task 3
- **Issue:** `panel-card.tsx:91-95` says the two sites are *"both offset by 32px, the 8th spacing step"*. True when 11-08 wrote it, false after this commit. 11-09's finding 4 established the rule: a stated reason that has quietly become false is worse than no reason, because a reader will trust it.
- **Fix:** Rewritten to record the correction, that all three sites now agree, and that the rule is no longer only a rule — `sticky-offset.test.ts` asserts it. The wrong offset is still named descriptively, and the comment still says why.
- **Files modified:** `src/components/patterns/panel-card.tsx`
- **Committed in:** `4814df2`

**3. [Rule 1 - Bug] Two "do not move this route under a route group" comments were made false by Task 1**

- **Found during:** Task 1
- **Issue:** `invite/[token]/page.tsx:12-13` reads *"Do not move this route under a route group"*; `listings/[id]/page.tsx:3` describes itself as *"placed OUTSIDE the (app)/(host) route groups"*, and both call themselves "header-less". Task 1 moves both into route groups and gives both headers.
- **Fix:** Both amended rather than deleted, and both amendments preserve the load-bearing half: **no ancestor layout of either route may read a session and redirect on its absence.** `(public)/layout.tsx` reads the session only for the header's auth slot and has no `redirect` on any path. A group whose layout gates is still forbidden; a group whose layout composes chrome is not what those sentences were about.
- **Files modified:** `src/app/(public)/invite/[token]/page.tsx`, `src/app/listings/[id]/(detail)/page.tsx`
- **Committed in:** `c55873c`

**4. [Rule 3 - Blocking] `type-scale.test.ts`'s `DISPLAY_INVENTORY` is path-keyed and breaks on a pure file move**

- **Found during:** Task 1
- **Issue:** Two of its eight keys are the moved files. The map is keyed by path, so a move that changes nothing about the type scale goes red.
- **Fix:** Both keys renamed in the commit that caused it; total unchanged at 12; the reason and the mechanism recorded in the map's docblock.
- **Verification:** Watched red before the fix, verbatim — the diff carries `+ "src/app/(public)/page.tsx": 1` / `+ "src/app/listings/[id]/(detail)/page.tsx": 1` against `- "src/app/listings/[id]/page.tsx": 1` / `- "src/app/page.tsx": 1`, so the fix is legible as a rename rather than as an investigation.
- **Committed in:** `c55873c`

**5. [Rule 3 - Blocking] `STICKY_INVENTORY` had to move, and it was watched red first**

- **Found during:** Task 2
- **Issue:** `site-chrome.tsx` is `sticky top-0 z-(--z-sticky)`, which is the layer the four-step scale exists for. The exact per-file map and both totals go red on a correct tree.
- **Fix:** 12 → 13 sites, 21 → 22 mapped, with the row's **permanence** recorded — the distinction from `row-card.tsx`'s temporary row matters, because a later reader tidying the map could delete the wrong one.
- **Verification:** `expected 13 to be 12` and the map diff naming `site-chrome.tsx`. 514 passed after.
- **Committed in:** `0d3e9c1`

**6. [Rule 2 - Missing Critical] `auth-slot-skeleton.tsx` needed two measurement constants that the UI-SPEC's list does not contain**

- **Found during:** Task 2
- **Issue:** The file matches `patterns/*skeleton*.tsx`, so AC#16 bans every literal box utility in it — and the UI-SPEC prescribes `h-8 w-24` and `size-8` for its two placeholders. Contradictory as written.
- **Fix:** `AUTH_SLOT_CONTROL` and `AUTH_SLOT_ICON`, with their derivations from the UI-SPEC's own responsive arithmetic and the full "constant versus exemption" argument, in `measurements.ts`.
- **Files modified:** `src/lib/design/measurements.ts`, `src/components/patterns/auth-slot-skeleton.tsx`
- **Committed in:** `0d3e9c1`

**7. [Rule 3 - Blocking] The plan's Task 1 and Task 3 contradict each other about when `SiteChrome` is wired**

- **Found during:** Task 1
- **Issue:** Task 1 says each new layout *"renders `<SiteChrome>` (Task 2)"* and its `<verify>` is `npm run build`. Task 2 creates `SiteChrome`. Task 3 says *"Wire the three public-composition layouts … to `SiteChrome`"*. Following Task 1 literally means committing a tree that does not build.
- **Fix:** Task 1 ships the layouts as structural `flex min-h-dvh flex-col` wrappers (which is what plan 11-14's `mt-auto` footer needs anyway); Task 3 wires the header, as its own text says. Every commit leaves a green tree.
- **Committed in:** `c55873c` / `4814df2`

**8. [Rule 3 - Blocking] A stale generated route validator failed the first post-move build**

- **Found during:** Task 1
- **Issue:** `next build` type-checks `.next/dev/types/validator.ts`, which the dev server had generated against the OLD paths: `Type error: Cannot find module '../../../src/app/invite/[token]/page.js'`. Nothing in `src/` was wrong.
- **Fix:** `rm -rf .next/dev/types` and rebuild. Recorded because the error names a route file that no longer exists and reads exactly like a broken move.
- **Committed in:** n/a (a build-cache artifact)

**9. [Rule 1 - Bug] `Sign up` was un-variantted; the AC asks for `variant="default"`**

- **Found during:** the acceptance pass
- **Issue:** An un-variantted `<Button>` IS `variant="default"` (D-21; `button.tsx`'s `defaultVariants` do not move), so the rendered class is identical either way — but a grep for the AC's string returns 0, and more importantly an absence cannot be read as a decision on the one button most likely to attract a later edit to `variant="brand"`.
- **Fix:** Written out explicitly, with a comment saying it is deliberately against the repo's usual idiom and why.
- **Files modified:** `src/components/site/public-header.tsx`
- **Committed in:** `33c5132`

### Plan-directed but out of `files_modified`

**10. Four files edited that `files_modified` does not list**

- `src/components/site/public-header.tsx` — **new**. The plan puts the session-reading auth slot inline in `(public)/layout.tsx`, but THREE layouts need the identical composition. Writing it three times would recreate, on the public side, the drift `site-chrome.tsx` exists to end. It is not in `patterns/` because it is domain-aware by construction (session, notifications, product copy).
- `src/components/booking/reserve-view.tsx` — deviation 1.
- `src/components/patterns/panel-card.tsx` — deviation 2.
- `src/lib/design/measurements.ts`, `tests/design/elevation-z.test.ts`, `tests/design/type-scale.test.ts` — deviations 4, 5, 6; all three are required for `npm run build` to exit 0, which the plan's own `<verification>` demands.

---

**Total deviations:** 10 (3 real bugs, 3 blocking gate/ordering corrections, 1 missing-critical addition, 1 build-cache artifact, 1 legibility fix, 1 out-of-`files_modified` group)
**Impact on plan:** No scope creep, no package installed, no vendored primitive edited, no migration. Deviation 1 is the one that mattered: the plan would have shipped a corrected listing rail and a still-broken checkout rail, and a gate asserting a count of 1 against a tree holding 3.

## Issues Encountered

- **`grep -c "ui/sheet" src/components/patterns/site-chrome.tsx` returns 1 on a correct file** — from the comment recording that `ui/sheet.tsx` is asserted absent. The AC requires 0. The AST probe reports `sheetImports: []`. **Seventh instance in this phase** of a plan-prescribed grep that a file's own explanation trips. Full raw-versus-AST contrast in the Verification Run table.
- **The plan's `<verification>` still carries `ls drizzle/ | tail -1`**, which returns `meta`. Used `ls drizzle/*.sql | tail -1` → `0025_audit_resolved_by.sql` (11-02's recorded correction, now cited by five consecutive plans). **GATE-06 intact.**
- **The full e2e suite is FLAKY on this box under parallel load, and two consecutive runs failed DIFFERENT specs.** Run A: 25 passed / 2 failed / 1 did not run (`password-reset.spec.ts:51`, `search-and-book.spec.ts:296`). Run B: 27 passed / 1 failed (`reduced-motion.spec.ts:109`). **Every named failure passes in isolation** — `password-reset` + `search-and-book` (4 passed), `reduced-motion` + `open-capacity` (8 passed) — and `reduced-motion` targets `/dev/theme`, which no layout in this plan wraps. `search-and-book.spec.ts:318`'s duplicate-reference failure is the one already logged in `deferred-items.md` under `[11-03]` with a proof that it predates Phase 11. The plan's stated baseline signature (*"17 passed / 1 failed"*) is from an older, smaller collection scope and does not describe the current 28-test suite.
- **`/listings/[id]/book` returns 404 to an anonymous GET, and the plan's AC expects 200.** That is the shipped owner-gate (T-04-RESERVEIDOR: a missing `?hold`, a hold owned by another booker, or no session all `notFound()`). Isolated with a control — the layout was renamed out of the tree and back, 404 both ways — so it is not caused by the new layout. The real 200 render was measured by driving the live hold flow instead, which is the stronger check the curl could not be.
- **`next build` deletes `.next/static/`**, so the dev server had to be re-checked for liveness after each build. It survived every one.

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (after each task) |
| `npm run lint` | 0 errors, 9 warnings — byte-identical to the phase baseline |
| `npm run test:design` | **29 files / 525 tests passed** (was 28 / 514 — +1 file, +11 tests, exactly the new gate) |
| `npm run build` | exit 0, four times |
| `DATABASE_URL=…@127.0.0.1:59999/nope npm run build` | **exit 0** — A5 closed |
| Route table, before vs after the moves | **byte-identical**, 31 routes, diffed mechanically |
| Route table, after the session-aware slot | 4 routes flipped `○` → `ƒ` (`/login`, `/signup`, `/forgot-password`, `/reset-password`). **`/_not-found` did NOT flip** — RESEARCH caveat 3 predicted five; it is not under `(auth)` and reads no session. `/dev/theme` unchanged. |
| `git log --follow` on all three moved files | pre-move history resolves |
| `git diff --diff-filter=D` on all four commits | empty — no commit deleted a tracked file |
| `git diff --stat … package.json components.json src/components/ui/` | empty — T-11-SC and T-11-FORK hold |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| **Rendered — public header, court + grove @ 320/375/640/768/1280** | `56, 56, 64, 64, 64` in **both themes**; `scrollOverflow: false` at every width in both |
| **Rendered — checkout header** | `headerCount 1`, **`anchors 0`**, `buttons 0`, `brandTag SPAN`, `navCount 0`, `slotCount 0`, `headerBox {x:0,y:0,w:1280,h:64}`, **`railTop "80px"`** |
| Rendered — `/login` | `site-header` ×1, `site-brand` ×1, `site-auth-slot` ×1; exactly one `>FitOut<` |
| Rendered — `/listings/[id]` | header ids ×1 each; `lg:sticky lg:top-20` present, `lg:top-8` absent |
| jsdom — `brandHref` both branches | **1** `site-brand` node each; `A` vs `SPAN`; class byte-identical |
| jsdom — host composition | `navLandmarks 1`, `navNodes 1`, inline bar `hidden md:flex`, drawer `md:hidden`, links `["Earnings","Requests3"]`, badge `"3 requests to review"`, slot `h-8 min-w-44 ml-auto flex items-center justify-end gap-3`, skeleton boxes `h-8 w-24` / `size-8 rounded-full`, `aria-hidden true` |
| curl — `/`, `/listings/{id}`, `/invite/{token}`, `/login`, `/signup`, `/forgot-password` | 200 × 6 |
| **Watched red — `DISPLAY_INVENTORY`** | map diff naming both renamed keys in both directions → fixed → 39 passed |
| **Watched red — `STICKY_INVENTORY`** | `expected 13 to be 12` + `+ "…/site-chrome.tsx": 1` → fixed → 514 passed |
| **Watched red (a) — the offset** | 2 failed / 9 passed; `"…(detail)/page.tsx:383 — \`lg:sticky lg:top-8\` resolves to 32px, below the 80px floor"` and `expected [32,80,80] to deeply equal [80,80,80]`. Reverted → 11 passed |
| **Watched red (b) — the count** | 2 failed / 9 passed; `expected 4 to be 3`, message enumerating all four sites by `file:line`. The offset RULE stayed green. Reverted → 11 passed |
| **Watched red (c) — vacuity** | `SRC_DIR` → `src-nope`: 5 failed / 6 passed, and **`pins every lg:sticky offset at >= 80px` PASSED** over a tree it never opened. Reverted → 11 passed |
| AST: directive prologue, both new pattern files | `[]`, `[]` |
| AST: domain imports (`@/lib/{booking,payments,listing,group,search,availability}`), `site-chrome.tsx` | `[]` |
| AST: `shadow-sticky` / `h-14` / `h-16` in class strings, `site-chrome.tsx` | `[]` / `[]` / `[]`; `border-b` present ×1 |
| AST: `sr-only` / `opacity-0` in class strings, `site-chrome.tsx` | `[]` — the inactive nav copy is `hidden`, as T-11-NAVDUP requires |
| AST: prose literals (≥4 words, not a class list), both new pattern files | `[]` — no product sentence |
| Probe positive control (synthetic offender) | **every check fired**: prologue `["use client"]`, `@/lib/booking/hold`, `@/components/ui/sheet`, `shadow-sticky`, `h-14`+`h-16`, duplicate testid, `sr-only`, brand `<a>` in both branches |
| **Raw greps on `site-chrome.tsx`, recorded and NOT trusted** | `ui/sheet` → **1** (AC says 0; the comment recording the absence), `site-brand` → **3** (2 attributes + 1 comment; DOM truth is 1), `border-b` → 2, `shadow-sticky`/`h-14`/`h-16`/`use client` → 0 |
| `grep -rc "lg:top-8" src/app src/components` | 0 |
| `grep -rn 'authClient\|useSession\|fetch("/api/auth' src/components/patterns/ src/components/site/ '(public)/layout.tsx'` | nothing — T-11-SESSION's client-fetch ban holds |
| `grep -c 'variant="brand"' 'src/app/(public)/layout.tsx'` | 0 |

## Known Stubs

None in the sense of placeholder content — every prop and every composition is complete as declared.

Three states worth naming so they are not mistaken for coverage:

- **`NavLinks`, `NavDrawer`, `SiteNav` and `src/lib/nav.ts` have ZERO adopters.** The public composition has no primary nav, so the drawer has never rendered in a browser at any width. Everything asserted about it is markup and class strings. Plan **11-12** is the adopter, and it is also what makes `nav.ts` binding: until then, the shipped host header still writes `Earnings` and `Requests` inline, and nothing mechanical holds the two lists together.
- **The auth slot's no-shift contract is proven as a RESERVATION, not as a swap.** The box is measured (`h-8 min-w-44`, right-anchored) and the fallback reads from the same constants, but nobody has captured the header's `boundingBox()` with the session request *delayed* and again after it resolves. That twelve-assertion comparison — three widths × two themes × three compositions — is plan **11-21**'s.
- **The booker and host compositions are not wired.** `(app)/layout.tsx` and `(host)/host/layout.tsx` still render their own inline headers. Three independently-drifting boxes became **four** this plan and collapse to one in **11-12**. SHELL-01 is closed on its own wording (it names four public routes, all four verified) — but the *drift* SHELL-01 exists to end is not, and nothing mechanical stops the two group headers diverging from the shell until that conversion lands.

## Deferred Issues

- **The public signed-in header now issues three DB reads on `/` and `/invite/[token]`, duplicating `(app)/layout.tsx:54-68` almost verbatim.** Deliberate (see Decisions), degraded by try/catch, and off the critical path inside `<Suspense>` — but it is a third copy of the same block. **Plan 11-12 should extract it** when it converts `(app)` and `(host)` onto `SiteChrome`: one `<NotificationSlot>` async child, three mounts. Not done here because extracting it means editing both group layouts, which this plan is explicitly told not to touch.
- **The e2e suite's full-run signature is unstable on this box** (two runs, different failing specs, all green in isolation). Worth one deliberate look before D-25's "all three CI jobs green" is treated as meaningful for job 3 — a suite that fails a different test each run cannot distinguish a regression from load.
- **11-08's 112px-vs-80px row finding is untouched and still live** on three shipped routes.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: data-access-surface | `src/components/site/public-header.tsx` | The signed-in public header issues three owner-scoped reads (`countUnread`, `listRecent`, `readDbNow`) on `/` and `/invite/[token]` — routes that read NO database on behalf of the viewer before this plan. The plan's threat register carries `T-11-SESSION` (the session read) but not this. Scoped in the query on `session.user.id` (T-07-82), never post-filtered, never from request input; wrapped so a failure degrades rather than taking down the front door. Recorded because it widens the authenticated read surface of the two most public routes in the app. |

Every registered threat is disposed as designed:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-11-SESSION | mitigate | `auth.api.getSession({ headers: await headers() })` in an async Server Component inside `<Suspense>`. The client-fetch ban is verified: zero `authClient` / `useSession` / `fetch("/api/auth` across `patterns/`, `site/` and the public layout |
| T-11-HOLDLOSS | mitigate | `book/` is a SIBLING of `(detail)`, so the minimal composition is a fact about the file tree. **Measured on a live checkout render: 0 `<a href>`, 0 `<button>`, brand is a `SPAN`** |
| T-11-NAVDUP | mitigate | One inventory (`src/lib/nav.ts`), one leaf renderer, two placements, both inside ONE `<nav>`. `hidden` throughout — zero `sr-only`/`opacity-0` in any class string, verified over the AST |
| T-11-NONAME | mitigate | `ProfileLink` carries `aria-label="Profile"` on the wrapper and `aria-hidden="true"` on the glyph; the label span is `hidden sm:inline` on ONE instance. Measured in jsdom |
| T-11-DBFREE | mitigate | Unreachable-`DATABASE_URL` build exits 0 with the shell in tree; four routes flipped `○` → `ƒ`, none failed to connect |
| T-11-SC | mitigate | Zero packages; `package.json` / `components.json` / `src/components/ui/` diff empty across all four commits; the drawer reuses `patterns/responsive-dialog.tsx` |

## Next Phase Readiness

- **Plan 11-12 is the biggest beneficiary and inherits three concrete things.** (1) `SiteChrome`'s host composition is `brand={<>FitOut <span className="text-muted-foreground">· Hosting</span></>}`, `brandHref="/host"`, `surface="muted"`, `nav={<SiteNav links={HOST_NAV_LINKS} badges={{ requests: n }} />}` — measured working in jsdom, including the badge's `"3 requests to review"` label, which is byte-identical to the shipped one. (2) The two in-file *"Do NOT refactor the two headers into one here"* instructions are the ones 11-12 amends; `site-chrome.tsx`'s header already states the merged/not-merged split it should cite. (3) The notification-read block wants extracting into one async child at that point — three copies exist now.
- **Plan 11-13 has a count to move, and the direction is written down.** Converting the two rails onto `PanelCard sticky` should take `EXPECTED_STICKY_SITES` from **3 to 1**, not to 2 — if a rail keeps its own `lg:sticky` alongside the prop, the conversion is incomplete and the count says so.
- **Plan 11-14's footer has a home already.** All four layouts wrap their children in `flex min-h-dvh flex-col`, so `<SiteFooter className="mt-auto" />` drops in without re-touching any of them — and `book/layout.tsx` is the one that must NOT get one.
- **Plan 11-21 owns everything this plan could not prove.** The auth slot's pending→resolved bounding-box comparison (twelve assertions), the header at 375/768/1280 in both themes as a *baseline* rather than a number, the drawer at 320px, and the rail's rendered position after an actual scroll. The numbers above are a strong precondition and are all single-run.
- **Plan 11-22's forward direction gained four ids.** `src/` now carries **14 of `selector-contract.ts`'s 17** — the previous ten plus `site-header`, `site-brand`, `site-nav`, `site-auth-slot`. The remaining 3 are `price-total` (11-06, already shipped in `e2e/`; check where 11-22 expects it), `site-footer` (11-14) and `legal-placeholder-notice` (11-15). Note for 11-22: `site-brand` appears **twice** as a JSX attribute in one file by design — an existence check is fine, an exactly-once check is not.
- **A caution about `(auth)`.** Its screens now carry a `Log in` / `Sign up` pair in the header of the login page. That is deliberate (a fourth composition whose only difference is a suppressed button is a fork), and it is Phase 15's to decide otherwise with the whole surface in front of it.

## Self-Check: PASSED

All eight created files exist on disk. All four commits (`c55873c`, `0d3e9c1`, `4814df2`, `33c5132`) resolve in `git log`. No commit deleted a tracked file — `git diff --diff-filter=D --name-only` is empty for all four.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-13*
