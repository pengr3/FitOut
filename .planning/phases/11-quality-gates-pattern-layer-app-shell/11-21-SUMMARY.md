---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 21
subsystem: ui
tags: [design-system, playwright, responsive, app-shell, layout-shift, streaming, suspense, skeleton, dev-surface, measurement]

# Dependency graph
requires:
  - phase: 11-07
    provides: "`src/lib/design/measurements.ts` and the three skeleton shapes — and the NOT COVERED footer that hands the ±2px rendered comparison to this plan by name"
  - phase: 11-08
    provides: "`ResultCard`, `RowCard`, `PanelCard`, and `row-card.tsx`'s measured 80px composition"
  - phase: 11-09
    provides: "`EmptyState`, `ErrorState`, `ResponsiveDialog` — the state panels sections 11–13 exercise"
  - phase: 11-10
    provides: "`patterns/site-chrome.tsx`, `AUTH_SLOT_BOX`, `HEADER_HEIGHT`, and the four declared shell ids AC#2–#5 are hung on"
  - phase: 11-12
    provides: "the booker and host compositions, and the `<Suspense>` boundary around the bell that makes their auth slot a two-state slot"
  - phase: 11-13
    provides: "`card-pattern-coverage.test.ts`'s declared card-surface inventory, which section 10 had to not disturb"
  - phase: 11-14
    provides: "`patterns/site-footer.tsx` — the component the 320px watched red mutates, and its six declared mount sites"
  - phase: 11-15
    provides: "`/terms` and `/privacy` plus `legal-placeholder-notice`, two of the twelve swept routes and their reachability tell"
  - phase: 11-16
    provides: "`empty-state-adoption.test.ts`'s declared inventory, which this plan bumps and widens"
  - phase: 11-18
    provides: "`src/app/dev/throw` — the ONLY dev throw affordance, and the reason four of the twelve routes are skipped"
  - phase: 11-19
    provides: "the root not-found and the invite not-found, two more of the twelve swept routes"
  - phase: 11-03
    provides: "`e2e/helpers/theme.ts`'s `seedTheme` and `playwright.config.ts`'s two projects"
provides:
  - "`/dev/theme` sections 10–14: every pattern this phase built, exercised on one DB-free, two-theme page from one function"
  - "`e2e/shell.spec.ts` — AC#2/#3/#4/#5/#6, 18 tests, three compositions × two themes"
  - "`e2e/overflow-320.spec.ts` — AC#29, net-new; 16 measurements and 8 named skips"
  - "`e2e/skeleton-geometry.spec.ts` — AC#17, the rendered half of GATE-STATES, six comparisons"
  - "`e2e/helpers/served-document.ts` — a streamed-document truncator that turns one response into a pending and a resolved DOM with no timing"
  - "The rendered surface plan 11-22 shoots its visual-regression baselines against, with every source of variance named"
affects: [11-22, phase-12-checkout, phase-17-a11y]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A page's PENDING streamed state is reproduced by intercepting the document with `page.route`, fetching it, and fulfilling with the prefix before React's first `<div hidden id=\"S:…\">` completion segment. Real server bytes, zero timing, and the cut offset is asserted so a marker that stops matching cannot make pending and resolved the same document."
    - "A route table in a spec carries a `tell` — a selector only that route renders — checked BEFORE any measurement, because every assertion of the form 'a number is small' or 'a list is empty' is satisfied perfectly by a blank page"
    - "An overflow offender list filters out elements an ancestor clips, or a green page reports false positives (leaflet map tiles) and the diagnostic stops being read"
    - "A `/dev/*` preview route composes patterns with INLINE JSX attributes where a source gate reads props off `JsxAttribute` nodes — a spread makes the call site invisible to the gate and keeps it green by not being seen"
    - "Two themes compared as two COLUMNS in one layout pass (nested `[data-theme]` panes) rather than as two runs, so nothing between two navigations can be the difference"

key-files:
  created:
    - e2e/shell.spec.ts
    - e2e/overflow-320.spec.ts
    - e2e/skeleton-geometry.spec.ts
    - e2e/helpers/served-document.ts
    - src/app/dev/theme/error-state-preview.tsx
  modified:
    - src/app/dev/theme/page.tsx
    - tests/design/empty-state-adoption.test.ts
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md

key-decisions:
  - "THE PLAN'S PRESCRIBED AC#3 PROBE IS VACUOUS, MEASURED. Deleting `AUTH_SLOT_BOX`'s `min-w-44` was named as the mutation that should redden the no-shift test. Run: **6 passed.** The header and the brand are held still by `ml-auto … justify-end` (the slot is the last flex child, so resolution moves only its own left edge), not by the reservation — which `site-chrome.tsx` already says in its own words. A THIRD box was added to the test, the slot itself, which is what `min-w-44` actually pins; the same mutation then reddened 2 of 6 with pending 140 → resolved 146.88 (court) / 155.05 (grove)."
  - "THERE IS NO SESSION REQUEST TO STALL. The plan prescribes `page.route` plus a delay; the session read is `auth.api.getSession({ headers: await headers() })` on the SERVER inside the boundary, so the browser makes exactly one request and a delay moves both states equally. The pending state is instead the real streamed prefix, cut at React's first boundary-completion segment — measured on `/`: 106,723 bytes, marker at 26,866, prefix holds `AuthSlotSkeleton` and not \"Log in\"."
  - "THE ±2px COMPARISON IS SCOPED TO WHAT THE CONSTANTS CLAIM. The card grid is compared at its MEDIA box (179.33 × 134.48, identical in both themes) and not at its cell, because `card-grid-skeleton.tsx` states its text bars are \"PROPORTIONS of the cell, not measurements of anything real\" — the cells legitimately differ by ~162px. The panel is compared on width plus a FLOOR, because `PANEL_MIN_HEIGHT` is documented as a floor and the resolved panel is 22px taller. Asserting the plan's literal reading would have been satisfied only by padding a placeholder until a gate went green."
  - "FOUR OF THE TWELVE SWEPT ROUTES ARE UNREACHABLE AND ARE SKIPPED WITH NAMED REASONS. 11-18 shipped ONE dev throw affordance and `src/app/dev/` sits under no route group, so it reaches the ROOT boundary only. Reaching the other four needs four new `page.tsx` files inside four route groups — a route-table change and a `loading-coverage.test.ts` bump no acceptance criterion asks for. The compensating coverage (each shell at 320px, plus the panel in both themes on `/dev/theme` section 12) is named in the spec and in `deferred-items.md`."
  - "NO STATICALLY-OPEN DIALOG ON `/dev/theme`. The plan asks for one; Radix portals a modal to the document body, marks the rest of the document hidden from assistive technology and traps focus — twice over, once per pane — which would break the two-theme audit pass this page exists for and put an overlay across every other section's geometry, including the boxes `e2e/skeleton-geometry.spec.ts` measures. The trigger is real and the limitation is stated in the section note, which is what the plan asks for in the same paragraph."
  - "`empty-state-adoption.test.ts`'s prop extractor is blind to JSX SPREADS. Authored as `<EmptyState {...FIXTURE} />` the preview's `tone=\"positive\"` panel was invisible to that gate's tree-wide count, which stayed green while a second positive panel shipped. The two call sites were rewritten with inline attributes so the gate would see them, the assertion went red, and it was widened from a bare count of 1 into a named two-entry set PLUS a separate product-only clause. The general hole is logged rather than relied on."
  - "`/dev/theme` costs the production stylesheet NOTHING this time. 10-16 measured its D-9 cost at +1,103 bytes (+0.93%). Clean rebuilds of both sides here emit 120,293 bytes across the same three chunks with the same content hashes — a zero-byte delta, because sections 10–14 compose components whose classes are already emitted rather than authoring new utilities."

patterns-established:
  - "Before trusting a prescribed watched-red, run it: two of the four prescribed probes in this plan behaved differently from the plan's prediction, and one of them was fully vacuous"
  - "A positional locator (`nth(13)`) is only safe when the position is CHECKED — the section's own heading carries its number, so it can say for itself which one it is"
  - "A guard-the-guard threshold is measured from the SMALLEST real subject, not chosen: the first draft's `examined > 20` reddened the two most minimal surfaces (12 and 14 laid-out elements) on a clean tree"
  - "`[data-theme=\"court\"]` also matches `<html>` — next-themes writes the resolved theme onto the document element — so every pane locator is `div[data-theme=…]`; the unqualified selector silently counted 28 sections instead of 14"

requirements-completed: [RESP-01, SHELL-01, STATE-01]

# Metrics
duration: 65min
completed: 2026-08-17
---

# Phase 11 Plan 21: The DB-Free Exercising Surface and Three Rendered Measurement Specs Summary

**`/dev/theme` now renders every pattern this phase built, in both themes, from one function and with no database behind it — and the shell's height, its no-shift contract, the 320px floor and the skeletons' geometry are measured in a real browser rather than asserted, with two of the plan's four prescribed probes turning out to behave differently from the plan's prediction and one of them fully vacuous.**

## Performance

| | |
|---|---|
| Duration | ~65 min |
| Tasks | 3 of 3 |
| Commits | 3 (+1 docs) |
| Files created | 5 |
| Files modified | 3 |
| Design suite | 39 files / 693 tests → **39 files / 695 tests**, all green (3 skipped) |
| Full suite | **1217 passed / 4 skipped — unchanged** |
| New e2e | **40 tests** (18 shell + 16 overflow + 6 skeleton), plus 8 named skips |
| Route table | **unchanged.** 6 static (`/_not-found`, `/dev/theme`, `/dev/throw`, `/opengraph-image`, `/privacy`, `/terms`), zero flips |
| Emitted CSS | **120,293 bytes before and after**, same three chunk hashes — a zero-byte delta |
| Migrations | none; `ls drizzle/*.sql \| tail -1` still `0025_audit_resolved_by.sql` (GATE-06) |
| New dependencies | **zero** (T-11-SC) |

## What shipped

### Task 1 — `/dev/theme` sections 10–14 (`aa66c08`)

Five sections, all inside `ThemePane`, which is still called **exactly twice** — so a difference between the two columns can still only have come from the theme.

| § | What | Note |
|---|---|---|
| 10 | `ResultCard` (with `mediaFallback`), `RowCard`, `PanelCard` | the row is in the 48px-media configuration its 80px height is scoped to |
| 11 | `EmptyState` `tone="neutral"` and `tone="positive"`, side by side | inline JSX attributes, deliberately — see below |
| 12 | `ErrorState` with a `digest` and without | through a client wrapper; the pattern needs an `onRetry` function |
| 13 | `ResponsiveDialog` trigger + the stated limitation | no statically-open modal — see below |
| 14 | The auth-slot fallback beside a resolved cluster in the same box, and each skeleton above its resolved twin at identical width | this is the pair Task 3 measures |

Every fixture is a module constant in the page with a comment saying it is a fixture. The row cards' status badges read the **already-frozen** `BOOKING_STATUS_FIXTURES` rather than passing their own `now`/`endsAt`, so nothing on the page derives from the clock — the determinism plan 11-22's baselines need.

**Verified, not assumed:** `/dev/theme` still prerenders `○ (Static)`; `npm run build` with `DATABASE_URL=postgres://unreachable:unreachable@127.0.0.1:59999/nope` exits **0**; `next start` returns **404** for `/dev/theme` (and `/dev/throw`) while `/terms` returns 200; **zero duplicate DOM ids** across the two panes (11 ids, no repeats); the eight `data-testid`s the page now renders are all declared in `selector-contract.ts`; and `e2e/reduced-motion.spec.ts` + `e2e/scroll-area-overflow.spec.ts` still pass against the extended page.

### Task 2 — the shell spec and the 320px sweep (`a67b29a`)

`e2e/shell.spec.ts`, 18 tests:

| AC | What is measured |
|---|---|
| #2 | header height is the exact integers **56** at 375 and **64** at 640/1280, in public/booker/host × court/grove, plus full-bleed width |
| #3 | `site-header`, `site-brand` **and** `site-auth-slot` boxes byte-identical across the slot's pending→resolved swap, at 375/768/1280 × court/grove × three compositions — **54 box equalities**, against the plan's asked-for 12 |
| #4 | `getByRole("navigation")` is exactly **1** on the host composition at 320 and 1280, both themes; a separate test records that `/` renders **0** and must never render 2 |
| #5 | the checkout composition renders **zero** `<a href>` in the header, **zero** footers, zero primary navs, and a `<span>` brand |
| #6 | the host header paints a **different** background and carries a **different** wordmark at an **identical** height |

`e2e/overflow-320.spec.ts`, 16 measurements + 8 named skips. Each row carries a `tell`; each failure prints the offending selectors with their right edges; the offender collector drops anything an ancestor clips.

### Task 3 — the ±2px skeleton spec (`1dcc273`)

Six comparisons on `/dev/theme` section 14, three shapes × two themes, in the **default `chromium` project** rather than `visual` — recorded as a deviation from `11-VALIDATION.md` with its reason (a `boundingBox` comparison needs no baseline, and the `visual` project is not created off Linux at all, so it would be unrunnable where skeletons are written).

## The four watched reds, and what two of them found

Every probe below was run, recorded verbatim in the spec's own header, and reverted. `git diff --stat` on each mutated file is empty.

### (a) `HEADER_HEIGHT` → `py-3` — **6 failed**, and the numbers are the argument

| route | court | grove |
|---|---|---|
| `/` | 57 | 57 |
| `/bookings` | 57 | 57 |
| `/host` | **81** | **84.09** |

One edit, two heights, no error anywhere. The host header carries a nav and a drawer trigger, so a padding-sized box tracks the theme's type and the two themes end up **3.09px apart** — at which point a real geometry regression and the theme swap are the same measurement, which is exactly what `site-chrome.tsx:26-34` says the token exists to prevent. The public and booker rows agreeing at 57 is a coincidence of the current markup (their wordmark is `text-lg`, a Tailwind default rather than a theme token), not a property.

### (b) `AUTH_SLOT_BOX`'s `min-w-44` deleted — **6 passed. The prescribed probe is vacuous.**

The plan names this as the mutation that should redden AC#3. It did not, and the reason is written in the component itself: the slot is `ml-auto … justify-end`, i.e. the last flex child, so resolution moves only its own left edge and the reservation cannot reach the brand or the header box at all. `min-w-44`'s real job — *"stops the fallback collapsing to zero"* — was being asserted by nothing.

A third box was added to the test. The same mutation then failed **2 of 6**:

```
Error: / · court · 375px: the site-auth-slot box CHANGED SIZE when the session landed.
pending {"x":219,"y":11.5,"width":140,"height":32}
resolved {"x":212.13,"y":11.5,"width":146.88,"height":32}

Error: / · grove · 375px: … pending width 140 → resolved width 155.05
```

Two further findings sit in those numbers. The resolved cluster measures **146.88 in court and 155.05 in grove** — the reservation is a fixed token precisely because the thing it reserves for is type-sized. And only the PUBLIC composition fails: the booker and host slots hold the bell's own `NOTIFICATION_BELL_BOX` in both states, so their pending and resolved clusters are the same width by construction and no reservation is load-bearing there.

### (c) `min-w-[400px]` on the footer container — **12 failed / 4 passed / 8 skipped**

```
Error: / · court · 320px: the document scrolls horizontally — scrollWidth 400 against a
clientWidth of 320. Offending elements (right edge past the viewport):
  div.mx-auto grid w-full min-w-[400px] max-w-6xl gap- right=400
  div.space-y-3 right=384
  p.text-sm text-muted-foreground right=384
  …
```

Both numbers are the finding. Twelve is every route that mounts the footer × both themes; the **four that pass are the two routes `site-footer.tsx` names as its deliberate exceptions** — the checkout composition and the root error boundary, which render no footer. A mutation whose blast radius matches the component's own declared mount list is a mutation the harness understood.

That run also found a defect **in the spec**: under the load of twelve failing tests each writing a trace, `/listings/[id]` twice missed its `h1` inside `expectReachable`'s default 5s, on a page that renders it server-side. The dev server compiles routes on demand and the guard was racing a compile; it now allows 15s.

### (d) `ROW_CARD_HEIGHT` `h-20` → `h-24` — **2 failed / 4 passed**

```
Error: row list · court: the skeleton and its resolved twin differ by more than 2px.
skeleton {"width":578,"height":96} resolved {"width":578,"height":80} — Δwidth 0, Δheight 16
```

16px, in both themes, and the card-grid and panel comparisons stayed green — a mutation to one constant reddens one shape, which is the blast radius that says the file measures what it claims to. This is precisely the drift layer 1 cannot see: the class still comes from `measurements.ts`.

### Two vacuity probes

| probe | result |
|---|---|
| `SECTION_INDEX` 14 → 99 in the skeleton spec | `expectReachable` failed **6/6** naming the missing section, rather than two null boxes comparing equal |
| `/terms`' row repointed at a route that 404s | the **overflow assertion PASSED** (a 404 does not overflow either) and the `tell` failed instead, naming `[data-testid="legal-placeholder-notice"]` |

The second is the whole reason every row carries a `tell`: without one, the sweep would have measured a 404 twice and reported `/terms` and `/privacy` as covered.

## The measurements

### Section 14, at 1280px

| shape | what | court | grove |
|---|---|---|---|
| card grid | skeleton cell media placeholder | 179.33 × 134.48 | 179.33 × 134.48 |
| | resolved card's `<AspectRatio>` box | 179.33 × 134.48 | 179.33 × 134.48 |
| | *whole cell, for contrast* | skeleton 190.48 / card **352.98** | skeleton 190.48 / card **365.09** |
| row list | skeleton row placeholder | 578 × 80 | 578 × 80 |
| | resolved `RowCard` | 578 × 80 | 578 × 80 |
| panel | `PanelSkeleton` block | 578 × 160 | 578 × 160 |
| | resolved `PanelCard` | 578 × **182** | 578 × **182** |
| auth slot | fallback / resolved cluster | 176 × 32 / 176 × 32 | 176 × 32 / 176 × 32 |

`RESULT_CARD_MEDIA` and `<AspectRatio ratio={4 / 3}>` — the two spellings of one number `measurements.ts` hands to this plan by name — **agree to the pixel in both themes**. The CELLS differ by ~162px, and by 12px *between themes*, which is exactly why the media box is the thing the constants claim.

### The shell, on `/`

| width | header | brand | navigation landmarks |
|---|---|---|---|
| 320 | 320 × 56 | x=16, 52.05 × 28 | 0 |
| 375 | 375 × 56 | x=16, 52.05 × 28 | 0 |
| 640 | 640 × 64 | x=24, 52.05 × 28 | 0 |
| 768 | 768 × 64 | x=24, 52.05 × 28 | 0 |
| 1280 | 1280 × 64 | x=88, 52.05 × 28 | 0 |

Matching 11-10's `56, 56, 64, 64, 64`.

### The 320px sweep

All 8 reachable routes × both themes: `scrollWidth === clientWidth === 320`, **zero unclipped offenders**.

## Deviations from Plan

### Auto-fixed and auto-strengthened

**1. [Rule 2 — missing critical assertion] The prescribed AC#3 mutation was vacuous; a third box was added**
- **Found during:** Task 2, watched red (b)
- **Issue:** deleting `AUTH_SLOT_BOX`'s `min-w-44` left all 12 prescribed box equalities green. The two prescribed boxes are protected by `ml-auto`, not by the reservation, so no mutation to the reservation could ever have reddened them.
- **Fix:** `site-auth-slot`'s own box asserted alongside the header and the brand, with the argument and the re-run numbers in the spec header
- **Files:** `e2e/shell.spec.ts`
- **Commit:** `a67b29a`

**2. [Rule 2 — missing critical assertion] The empty-state gate was blind to the panel this plan added**
- **Found during:** Task 1
- **Issue:** `empty-state-adoption.test.ts` reads props off `JsxAttribute` nodes only. Authored as `<EmptyState {...FIXTURE} />`, the preview's `tone="positive"` panel was counted as a call site (13 → 15, correctly) but was invisible to *"pins `tone=\"positive\"` to exactly ONE empty state in the whole tree"* — the gate stayed green while a second positive panel shipped.
- **Fix:** both call sites rewritten with inline attributes so the gate sees them; the assertion widened from a bare count into a named two-entry set with reasons **plus** a separate `src/app/dev/**`-excluding clause that keeps the PRODUCT claim at exactly one surface; `ADOPTERS` given its row and both pins bumped (11 → 12 files, 13 → 15 sites). Staged in the same commit as the source change.
- **Files:** `tests/design/empty-state-adoption.test.ts`, `src/app/dev/theme/page.tsx`
- **Commit:** `aa66c08`

**3. [Rule 3 — blocking] `ErrorState` needs a function prop and `/dev/theme` is a Server Component**
- **Found during:** Task 1, section 12
- **Issue:** `onRetry: () => void` cannot cross the server→client boundary. The page must stay a Server Component (it exports `metadata` and runs the build-time production guard).
- **Fix:** `src/app/dev/theme/error-state-preview.tsx`, a client module that does nothing else — the same structural reason `slot-picker-preview.tsx` gives for itself. **Not in the plan's `files_modified`; added because the section cannot render without it.**
- **Commit:** `aa66c08`

**4. [Rule 3 — blocking] The offender collector reported false positives on a green page**
- **Found during:** Task 2
- **Issue:** the first version named two `img.leaflet-tile` at right=502 and an `svg` at right=333 on `/listings/[id]`, all three inside an `overflow:hidden` map pane, on a page measuring 320 = 320.
- **Fix:** candidates whose ancestors clip are dropped before the list is built
- **Commit:** `a67b29a`

**5. [Rule 3 — blocking] A guard-the-guard threshold set above its own subject**
- **Found during:** Task 2
- **Issue:** `examined > 20` reddened the two most minimal surfaces on a clean tree — the root error boundary (12 laid-out elements) and the served checkout shell (14).
- **Fix:** floor measured from those two and set to 8, with both numbers recorded beside the constant
- **Commit:** `a67b29a`

**6. [Rule 3 — blocking] Two unused type aliases**
- Removed from `shell.spec.ts` and `overflow-320.spec.ts`; `npm run lint` is back to its pre-existing 9 warnings, none in files this plan touched.

### Deliberate departures from the plan's letter, with the reason

| Plan says | What was done | Why |
|---|---|---|
| "stall the session request with `page.route` and a delay" | intercept the document and cut it at React's first boundary-completion segment | measured: the session read is server-side, so there is no session request; a delay moves both states equally |
| §13 "a statically-open instance whose classes are the mobile presentation" | the real trigger plus the limitation stated in the section note | a Radix modal portals to the body, hides the rest of the document from assistive technology and traps focus — twice, once per pane — which would break the two-theme audit pass this page exists for and overlay every box Task 3 measures. The plan asks for the limitation to be stated rather than faked in the same paragraph. |
| AC#17 "width and height … within ±2px" on all three shapes | exact on row list; **media box** on card grid; **width + floor** on panel | `card-grid-skeleton.tsx` says its text bars are proportions, not measurements; `PANEL_MIN_HEIGHT` is documented as a floor. The strict reading is satisfiable only by padding a placeholder until a gate goes green. |
| ±2px spec in `--project=visual` (11-VALIDATION) | default `chromium` project | a `boundingBox` comparison needs no baseline, and the `visual` project is not created off Linux (D-29) — it would be unrunnable where skeletons are written |
| the 12 routes swept | 8 measured, 4 skipped with named reasons | 11-18 shipped one dev throw affordance and `src/app/dev/` is under no route group; the other four boundaries need four new routes. Compensating coverage named in the spec and in `deferred-items.md`. |
| `seedTheme` on the skeleton spec | not used there | `/dev/theme` renders both themes as two panes in one layout pass, which is strictly stronger than two navigations. `seedTheme` IS used by both other specs. |

## Findings the next plan needs

**For 11-22 specifically — what was done to make this surface deterministic, stated so the baselines can be trusted:**

- **No clock.** Every dated value on the new sections reads `BOOKING_STATUS_FIXTURES`, whose `now` and `endsAt` are frozen literals. The error panel's reference is the frozen string `3f9a1c72`, never generated.
- **No database, no network, no seed.** Sections 10–14 render from module constants. The build with an unreachable `DATABASE_URL` exits 0 and the route is still `○ (Static)`.
- **No random ids.** Zero duplicate DOM ids; the only ids on the page are the six theme-prefixed form ids section 6 already shipped.
- **No open overlay.** Section 13 renders a closed trigger, so nothing is portaled to the body and no animation is ever mid-flight in a screenshot.
- **`document.fonts.ready` is awaited** in all three new specs before any box is read; the brand box measured 52.046875 × 28 identically in every run.
- **`[data-theme="court"]` also matches `<html>`.** next-themes writes the resolved theme onto the document element and the default is court (D-06), so an unqualified attribute selector silently doubles every count taken through it — measured, 28 sections instead of 14. Use `div[data-theme=…]`.
- **The `reuseExistingServer` stale-stylesheet warning is copied verbatim into all three new spec headers**, as 11-03 asked.
- **Section 14 is where the twins live**, addressed as `div[data-theme=…] section:nth(13)` with the section's own heading number checked. A section added anywhere before it moves that index and the spec fails loudly rather than measuring the wrong pair.

**An environment gotcha that cost a debugging cycle and will recur:** Postgres ran out of connections mid-session — `FATAL: sorry, too many clients already` — after a sequence of `next build`s, a `next start`, a long-lived `next dev` and several Playwright runs that each sign users up. The symptom is NOT an error page: `/` renders its `skeleton-card-grid` forever and every spec that discovers a listing id from the catalogue times out on `locator.getAttribute`. `docker restart fitout-db-1` plus a dev-server restart fixes it. Do not read a `getAttribute` timeout as a spec defect without checking `docker exec fitout-db-1 psql -U fitout -d fitout -c "select 1"` first.

**On the recurring vacuity finding:** four prescribed probes, two of which did not behave as the plan predicted — (b) was fully vacuous and (c) had a different blast radius than the plan's "16 failed" guess (12, because two routes have no footer, which is the more informative number). Both were confirmed red on a broken tree AND green on a correct one, both have positive controls underneath them, and both specs assert a scan-coverage number (`examined`, the section count) separately from the claim.

## Known Stubs

None. Section 12's Retry button is inert — there is nothing to reset because nothing threw — and that is stated in the section note on the page and in `error-state-preview.tsx`'s header, rather than dressed up as a disabled control.

## Threat Flags

None. No new endpoint, no auth path, no file access, no schema change. `/dev/theme` keeps `robots: { index: false, follow: false }` and its build-time production guard, verified by request against `next start` (404). Every value the new sections render is a module-constant literal.

## Verification Run

```
npm run build                                  ✓ lint 0 errors / 9 pre-existing warnings
                                               ✓ design 39 files / 695 passed / 3 skipped
                                               ✓ next build, route table unchanged, /dev/theme ○ (Static)
DATABASE_URL=…:59999/nope npx next build       ✓ exit 0
npx next start -p 3111 → GET /dev/theme        ✓ 404   (/dev/throw 404, /terms 200)
npx vitest run                                 ✓ 134 files / 1217 passed / 4 skipped (unchanged)
npx playwright test e2e/shell.spec.ts \
  e2e/overflow-320.spec.ts \
  e2e/skeleton-geometry.spec.ts \
  e2e/reduced-motion.spec.ts \
  e2e/scroll-area-overflow.spec.ts             ✓ 44 passed, 8 skipped
emitted CSS, clean rebuild both sides          120,293 bytes → 120,293 bytes (0, +0.00%)
ls drizzle/*.sql | tail -1                     0025_audit_resolved_by.sql  (unchanged)
duplicate DOM ids on /dev/theme                []   (11 ids)
grep -c ThemePane src/app/dev/theme/page.tsx   3    (definition + two calls)
```

**Not done here, and it is the orchestrator's:** the push and the CI run (D-25). This executor was instructed not to push. All three new specs are deliberately NOT in CI (D-24), like the eleven that preceded them.
