---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 17
subsystem: ui
tags: [design-system, loading-state, streaming, react-suspense, nextjs-app-router, vitest, typescript-ast, accessibility]

# Dependency graph
requires:
  - phase: 11-07
    provides: "`measurements.ts` (`ROW_CARD_HEIGHT`, `RESULT_CARD_MEDIA`, `TEXT_BAR_HEIGHT`, `PANEL_MIN_HEIGHT`) and the three skeleton patterns, each already carrying the `role=status` + `aria-busy` + `aria-label` shell"
  - phase: 11-10
    provides: "the route groups these 20 loading files are addressed at — `(public)`, `(app)`, `(host)`, `listings/[id]/(detail)`"
  - phase: 11-12
    provides: "the streamed group layouts, which is what makes a `loading.tsx` under `(app)` or `(host)` render at all"
  - phase: 11-16
    provides: "the prior edit to `search-results.tsx` (both plans touch it, so they could not share a wave)"
provides:
  - "STATE-01 closed: 20 designed loading states, one per async-default route; 2 migrated, 18 new"
  - "`tests/design/loading-coverage.test.ts` — AC#15 in BOTH directions plus closure, with the `isAsyncDefaultExport` discriminator, 4 recorded watched-red probes and 2 measured corrections to the plan"
  - "The model file's missing `role=\"status\"` fixed — `(app)/bookings/loading.tsx` was itself in violation of AC#18"
  - "`/` shimmers ONE way: `loading.tsx` and the in-component `isPending` state render the same `CardGridSkeleton`"
  - "A measured correction to the plan's `async ⇔ ƒ Dynamic` claim, and to its 25/20/5 route counts (real: 27/20/7)"
affects: [11-18, 11-21, 11-22, phase-12-checkout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The loading-state convention: the page's own container verbatim + its STATIC heading verbatim (h1+lede when both fixed, h1 alone when the lede is derived, nothing when the h1 is) + exactly one declared skeleton shape"
    - "Render the REAL static control instead of a placeholder for it, where the control reads no data (`BookingsTabs`, `SearchBar`, the host back-link) — pixel-identical by construction rather than approximately"
    - "`isAsyncDefaultExport` over the AST: resolves `export default async function`, `export default async () => {}` and `const P = async () => {}; export default P`, and is blind to async anywhere else in the module"
    - "A route with no resolved geometry gets a NAMED live region and a sentence, not a skeleton (the two always-redirect routes)"

key-files:
  created:
    - src/app/(public)/loading.tsx
    - src/app/(public)/invite/[token]/loading.tsx
    - src/app/listings/[id]/(detail)/loading.tsx
    - src/app/listings/[id]/book/loading.tsx
    - src/app/(app)/bookings/[id]/loading.tsx
    - src/app/(app)/bookings/[id]/cancel/loading.tsx
    - src/app/(app)/bookings/[id]/group/loading.tsx
    - src/app/(app)/profile/loading.tsx
    - src/app/(host)/host/loading.tsx
    - src/app/(host)/host/bookings/loading.tsx
    - src/app/(host)/host/bookings/[id]/loading.tsx
    - src/app/(host)/host/earnings/loading.tsx
    - src/app/(host)/host/listings/new/loading.tsx
    - src/app/(host)/host/listings/[id]/edit/loading.tsx
    - src/app/(host)/host/listings/[id]/availability/loading.tsx
    - src/app/(host)/host/requests/loading.tsx
    - src/app/(host)/host/payouts/refresh/loading.tsx
    - src/app/(host)/host/payouts/return/loading.tsx
    - tests/design/loading-coverage.test.ts
  modified:
    - src/app/(app)/bookings/loading.tsx
    - src/app/(host)/host/listings/loading.tsx
    - src/components/search/search-results.tsx
    - tests/design/type-scale.test.ts
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md

key-decisions:
  - "The plan's route counts were wrong: 27 pages / 20 qualifying / 7 not, against its stated 25/20/5. The QUALIFYING twenty were exactly right; the totals missed `(legal)/terms` and `(legal)/privacy`, which landed in 11-15 after this plan was written. Ninth consecutive plan in this phase whose own inventory was wrong about a count."
  - "The plan's justification for the async discriminator — a claimed 1:1 with the build manifest's ƒ marker — is FALSE in one direction on this tree. All four `(auth)` routes build ƒ Dynamic despite being sync client pages, because `(auth)/layout.tsx` renders `PublicHeader`. `async ⇒ ƒ` still holds 20/20; `ƒ ⇒ async` has 4 counter-examples. The rule survives with a better reason: `loading.tsx` is a Suspense boundary around the PAGE, and only an async default export can suspend it."
  - "The plan's remedy for `/invite/[token]` inheriting `/`'s fallback is incomplete. A nested `loading.tsx` adds an inner boundary; it does not suppress the ancestor's. Measured against `next dev`: the invite route streams `/`'s card grid FIRST, then its own panel. Not fixed — the structural fix is a page move (deviation Rule 4). Logged."
  - "A loading state renders the page's static heading VERBATIM rather than through `PageHeader`, wherever the page's own h1 is not at the pattern's `text-xl` scale. `PageHeader` is composed on the 5 routes where the scale matches exactly; on the Display-scale and `leading-tight` surfaces it would shrink the title, which is the shift the fallback exists to prevent."
  - "Where the h1 is DATA-DERIVED, the fallback renders no heading at all. Seven routes. Inventing a title gets either the words or the width wrong, and on `/bookings/[id]/cancel` it would preview a decision the server has not made yet."
  - "Two routes get no skeleton and it is a decision, not an omission: `/host/listings/new` and `/host/payouts/refresh` render zero markup on the path they exist for (every exit is a `redirect()`). Both render a named live region and a sentence, with `PANEL_MIN_HEIGHT` as their only box class."
  - "`BookingsTabs` and `SearchBar` are rendered as the REAL components in their fallbacks. Both read no data, so the geometry is exact rather than guessed — the shipped `(app)/bookings/loading.tsx` had `h-11 w-52` standing in for a control whose real width nobody measured."
  - "`brand-recipe.test.ts` decided against the geometrically-correct answer on `/host/listings`, and it was right. Rendering the page's real `Create listing` CTA took the coral count 20 → 21 and the host count 5 → 6; a loading state is the one screen where a saturated focal point is unambiguously wrong. 8px of header-row residual accepted instead."
  - "`type-scale.test.ts`'s `DISPLAY_INVENTORY` bumped 12 → 14, in the same commit as the source, with the reason written into the inventory's docblock — which is exactly what that docblock asks for. The two new sites are 1:1 with the pages they front."

patterns-established:
  - "The coverage gate asserts BOTH directions AND closure: a missing fallback, a dead fallback beside a sync page, and a fallback with no qualifying page beside it are three different failures with three different messages"
  - "A `return true` probe on the classifier itself — the probe the missing/dead/vacuity probes cannot substitute for, because a list assertion cannot notice that its input was emptied"
  - "Acceptance criteria stated as greps are re-expressed as AST clauses in the gate: the plan's `\\bw-[0-9]` box-literal grep reports six hits on a correct tree, every one of them the `w-4` inside `max-w-4xl`"

requirements-completed: [STATE-01]

# Metrics
duration: 55min
completed: 2026-08-17
---

# Phase 11 Plan 17: Loading States Summary

**Twenty data-backed routes now have a designed loading state sized from one measurement inventory — 18 new, 2 migrated off their hardcoded boxes — and the coverage is gated by an AST walk that classifies pages by `isAsyncDefaultExport` in both directions, with the plan's own route counts and its `async ⇔ ƒ Dynamic` claim corrected against the build.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3
- **Files:** 19 created (18 routes + 1 gate), 5 modified

## What Shipped

| Task | Commit | What |
|---|---|---|
| 1 | `5dbdb85` | The two shipped skeletons onto the inventory; the model's missing `role="status"`; `/` on one skeleton |
| 2 | `6c5251b` | The eighteen new `loading.tsx`, plus the `DISPLAY_INVENTORY` bump the source forced |
| 3 | `fde40dd` | `tests/design/loading-coverage.test.ts` |
| — | `debac03` | The measured inheritance correction + two deferred items |

## The page → shape mapping, decided by reading each page

Recorded because the plan's acceptance criteria ask for it, and because a shape chosen without reading
the page is the failure mode this whole plan is about.

| Route | Shape | Heading rendered | Why this shape |
|---|---|---|---|
| `/` | card grid | h1 + lede, **verbatim** (Display scale) | `SearchResults` is a 1/2/3-col card grid |
| `/invite/[token]` | panel | none (h1 names the space) | one 512px `PanelCard`, via the real `InviteCard` |
| `/listings/[id]` | panel | none (h1 is the title) | detail page; see residuals |
| `/listings/[id]/book` | panel | h1 only, **verbatim** (Display) | `ReserveView` is one boxed summary; the lede is a derived tz note |
| `/bookings` | row list | **`PageHeader`** | stacked `BookingRow`s (mobile) / table (desktop) |
| `/bookings/[id]` | panel | none (5 state-derived h1s) | one centred confirmation card |
| `/bookings/[id]/cancel` | panel | none (see decisions) | one boxed refund breakdown |
| `/bookings/[id]/group` | row list | h1 **verbatim** (`leading-tight`) | `AttendeeRoster` dominates the page |
| `/profile` | panel | h1 **verbatim** (`text-2xl`) | `ProfileForm` is one boxed form |
| `/host` | panel | none (h1 embeds the first name) | 3 conditional boxes above the content |
| `/host/bookings` | row list | **`PageHeader`** | host twin of `/bookings` |
| `/host/bookings/[id]` | panel | none (h1 is the space title) | detail; renders the real back-link |
| `/host/earnings` | row list | **`PageHeader`** (no lede) | the payout table is what it waits on |
| `/host/listings` | card grid | **`PageHeader`** | 4:3 listing card grid |
| `/host/listings/new` | **no skeleton** | none | always redirects; renders nothing |
| `/host/listings/[id]/edit` | panel | none | `ListingWizard` is one boxed form |
| `/host/listings/[id]/availability` | panel | h1 + lede **verbatim** (`text-2xl`) | two boxed editors |
| `/host/requests` | row list | **`PageHeader`** (lede reads `APPROVAL_SLA_HOURS`) | stack of request rows |
| `/host/payouts/refresh` | **no skeleton** | none | redirects into PayMongo |
| `/host/payouts/return` | panel | h1 **verbatim** (`text-2xl`) | the body forks on payout state |

**The two spinner-instead-of-skeleton routes, and why.** `/host/listings/new` and
`/host/payouts/refresh` both render **zero markup** on the path they exist for — every exit is a
`redirect()` (into the wizard, and into PayMongo's hosted onboarding respectively). There is no
resolved geometry for a placeholder to match, so the UI-SPEC's own rule decides it: draw no boxes,
say what is happening. Each renders one `role="status"` + `aria-busy` + `aria-label` around a visible
sentence, with `PANEL_MIN_HEIGHT` as its only box class — imported, not written. The sentence is
visible rather than `sr-only` because it is the only thing on the screen, and there is deliberately no
second `sr-only` copy, which would announce it twice.

## Corrections to the plan (both measured, neither assumed)

### 1. The route counts are 27 / 20 / 7, not 25 / 20 / 5

The plan's **qualifying** set was exactly right — its 20 `files_modified` paths are precisely the 20
pages whose default export is `async`, verified by AST before a line was written. Its **totals** were
not: `(legal)/terms/page.tsx` and `(legal)/privacy/page.tsx` landed in plan 11-15, after this plan was
written, and both are sync server pages. They join `/dev/theme` and the four `(auth)` pages as the
seven that must NOT have a `loading.tsx`.

This is the **ninth consecutive plan in this phase** whose own surface inventory was wrong about a
count, and the second time specifically because 11-15's legal routes landed late.

### 2. `async default export ⇔ ƒ Dynamic` is FALSE in one direction

The plan justifies the async discriminator by asserting it *"correlates 1:1 with the build manifest's
ƒ (Dynamic) marker across all 25 pages — measured, not assumed"*, and states that the four `(auth)`
pages *"all build as ○ Static"*. Measured against this tree with `npm run build`:

```
ƒ /login      ƒ /signup      ƒ /forgot-password      ƒ /reset-password
○ /dev/theme  ○ /privacy     ○ /terms
```

All four `(auth)` routes build **ƒ Dynamic** despite being sync client pages. The cause is
`(auth)/layout.tsx`, which renders `PublicHeader` — a component that reads the session — so the
segment is dynamic because of its **ancestor**, not its page. (Plan 11-15 measured the same mechanism
in the other direction: composing `PublicHeader` cost five static routes.)

- `async default export ⇒ ƒ Dynamic` — still true, 20/20
- `ƒ Dynamic ⇒ async default export` — **four counter-examples today**

**The rule survives with a better reason than the one offered for it.** `loading.tsx` is a
`<Suspense>` boundary around the *page*. It renders only if the page component itself suspends, which
only an async default export can do — an ancestor layout's await happens *above* that boundary and is
not covered by it. The build manifest answers a different question (is anything in this segment's
chain dynamic) and is therefore the weaker signal, not the oracle. The gate's header says so, and says
not to "simplify" it to read the manifest.

### 3. An own `loading.tsx` does not stop an ancestor's from rendering

The plan says `/invite/[token]` gets its own *"so it does not inherit `/`'s"*. A nested `loading.tsx`
adds an **inner** boundary; it does not suppress the outer one. Measured with `curl` against
`next dev` — byte offsets in the streamed HTML for `/invite/deadbeef`:

| offset | marker | source |
|---|---|---|
| 23261 | `Loading spaces` / `skeleton-card-grid` | `(public)/loading.tsx`, in the shell |
| 26966 | `hidden id=` | first streamed replacement… |
| 27948 | `Loading this invite` / `skeleton-panel` | …which is the invite's own |
| 29306 | `hidden id=` | the resolved invite card |

Sequence on a hard load: **outer fallback → inner fallback → content**, with a 6-cell card grid as the
first stage on a route whose content is one card. The swap needs no data, so it is normally sub-frame
— but it is visible on the only kind of connection a loading state exists for. It is inherent to
nested boundaries, not to this route. **Not fixed** (deviation Rule 4 — the fix is a `(public)/(home)/`
page move with a pinned-inventory and route-table blast radius); written up in `deferred-items.md`
with the exact keys a future plan has to update.

## Deviations from Plan

### Auto-fixed / auto-decided

**1. [Rule 1 - Bug] `(app)/bookings/loading.tsx` had no `role="status"`**
- **Found during:** Task 1 (the plan predicted this one)
- **Issue:** The file the phase treats as its model carried `aria-hidden` on the row block and nothing else — zero status regions, against AC#18's "exactly one, with a non-empty accessible name". Eighteen new files were about to copy it.
- **Fix:** Composed `RowListSkeleton`, which supplies the shell. Fixed in the same plan that establishes the convention.
- **Commit:** `5dbdb85`

**2. [Rule 2 - Missing gate] The two Task-2 acceptance criteria had no mechanical enforcement**
- **Issue:** "no `loading.tsx` declares its own `h-`/`w-`/`aspect-` literal" and "every file renders exactly one `role=status` with a non-empty name" were review instructions with nothing asserting them. The plan's own grep for the first (`\bw-[0-9]`) reports **six hits on a correct tree** — every one of them the `w-4` inside `max-w-4xl`, because `-` is a word boundary. Tenth prescribed-grep false positive in this phase.
- **Fix:** Both re-expressed as AST clauses in `loading-coverage.test.ts`, with self-tests. The box classifier is a narrower restatement of `skeleton-measurements.test.ts`'s (no proportional-width exemptions — a `loading.tsx` draws no bars); the duplication is declared in the NOT COVERED footer.
- **Commit:** `fde40dd`

**3. [Rule 2 - Missing gate] Closure forwards**
- **Issue:** Assertions 1 and 2 are both driven by the *page* list, so a `loading.tsx` in a directory with no `page.tsx` at all falls outside both. Probe (b) confirmed this shape is real.
- **Fix:** Assertion 3 — every `loading.tsx` on disk belongs to a qualifying page. It is what makes the pinned file count an equality rather than a coincidence.
- **Commit:** `fde40dd`

**4. [Rule 3 - Blocking] `type-scale.test.ts` pinned inventory, bumped 12 → 14**
- **Found during:** Task 2, via `npm run build`
- **Issue:** `(public)/loading.tsx` and `book/loading.tsx` render their page's own Display heading. Dropping `sm:text-display` to keep the number at 12 would visibly resize the largest text on `/` at the `sm` breakpoint the instant results land.
- **Fix:** Two rows added with the reason written into the inventory's docblock — which asks for exactly this ("a future plan that legitimately adds a Display site updates this map — deliberately, in the same commit"). Staged with the source.
- **Commit:** `6c5251b`

### Watched red, and the gate won

**`brand-recipe.test.ts` refused the geometrically-correct `/host/listings` header.** The page's real
`Create listing` CTA was rendered in the fallback so the header row would be 36px rather than 28px —
the height it actually has whenever the grid below it is about to appear. Verbatim:

```
AssertionError: expected 21 to be 20 // Object.is equality   (brand variant at exactly 20 call sites)
AssertionError: expected 6 to be 5 // Object.is equality     (5 host conversions on the host surface)
```

Reverted rather than bumped, and the gate is right: DS-08 / D-21 pins coral to twenty buttons someone
asked for, and a loading state is the one screen where a saturated focal point is unambiguously wrong
— it would be the only chromatic thing on a page made entirely of grey placeholders. **8px of
header-row residual accepted**, recorded in the file and here.

The contrast with deviation 4 is the point: one pinned number was bumped and one was not, and the
difference is whether the new site is the *same* thing the inventory already blesses (a page's own
heading, at its own scale) or a *new* one (a twenty-first coral button).

## Watched red — the coverage gate's four probes

All run, all reverted, all recorded verbatim in the gate's header. Green is **15 passed**.

| Probe | Edit | Result |
|---|---|---|
| (a) missing | `(app)/profile/loading.tsx` deleted | **2 failed / 13** — the route named, and the file count 19 ≠ 20 |
| (b) dead file | `(auth)/login/loading.tsx` created | **5 failed / 10** — dead-file, closure, count, status-region and the hand-written list, all from one file |
| (c) vacuity | `APP_DIR` → `src/app-nope` | **4 failed / 11** — and **all five real assertions passed silently over zero files** |
| (d) classifier | `isAsyncDefaultExport` → `return true` | **6 failed / 9** — and assertion 2 did **NOT** fire |

**Probe (d) is the one worth reading.** With the classifier stuck at `true` there are no
non-qualifying routes left, so the dead-file assertion passes over an empty set — *a list assertion
cannot notice that its input was emptied*. What caught it was the positive control ("finds BOTH
classes over the real tree"), the pinned counts, and the three synthetic self-tests. That is why all
three exist alongside the two list clauses rather than instead of them, and it is the direct answer to
this phase's recurring scan-of-nothing finding.

**Probe (c) also surfaced a structural detail worth keeping:** the `toContain` on
`(auth)/login/page.tsx` never ran, because the length assertion in the same `it` fails first. The
pinned page count is therefore a *separate* test rather than a second line in that one.

## Residuals — measured, accepted, and where they go next

Every one of these is a place where the fallback and the resolved page differ. None is hidden; each is
named in the file that carries it.

| Route | Residual | Why it stands |
|---|---|---|
| `/` (both states) | `CardGridSkeleton` is `gap-5`; `ResultsGrid` is `gap-4 lg:gap-6` → **±4px per gutter, opposite directions either side of `lg`** | The pattern's other adopter (`/host/listings`) is a `gap-5` grid. One pattern cannot match two disagreeing grids without taking geometry from the call site, which the house rule forbids. → 11-21 |
| `/` | the `h2` + sort row (~44px) is absent | It renders only when there are results; the page may be about to render an `EmptyState` instead |
| `/listings/[id]` | `PhotoGallery`'s 16:9 hero + 4-up thumb strip not reproduced | No 16:9 constant exists, and the gallery has **three** resolved heights (photos / one photo / none). Reaching for `RESULT_CARD_MEDIA` would put a wrong number on screen behind a right-looking import. → 11-21 |
| `/host/listings` | header row 28px vs 36px | See the `brand-recipe` watched red above |
| `/host/listings` | grid fallback → `EmptyState` for a host with zero listings | `loading.tsx` runs before the query that picks between them. The grid is the steady state |
| `/listings/[id]/book` | the venue tz note (~20px) absent | Data-derived; no honest placeholder |
| `/bookings`, `/host/bookings` | `BookingsTabs` shows `Upcoming` as current even when `?tab=past` is loading | `loading.tsx` receives no `searchParams`. Traded for a strip that does not move at all |
| `/host/bookings` | the multi-listing filter form absent | Renders only for a host with ≥2 spaces |
| `/host/earnings` | `PayoutBanner` / fee notice / `PayoutSummary` not claimed | Three conditional blocks above the data region |
| `/invite/[token]` | resolves through `/`'s card grid first | See correction 3; → `deferred-items.md` |

## Verification

| Check | Result |
|---|---|
| `find src/app -name loading.tsx \| wc -l` | **20** |
| Route table `○`/`ƒ`, diffed before and after | **byte-identical** — 36 rows, 5 static (`/_not-found`, `/dev/theme`, `/opengraph-image`, `/privacy`, `/terms`). No route flipped |
| `npm run build` | exits 0 |
| `npm run test:design` | **37 files / 663 passed + 3 skipped** (was 36 / 651 + 3) |
| `npm test` | **1217 passed / 4 skipped** — the exact phase baseline |
| `npx tsc --noEmit` | clean |
| `npm run lint` | 0 errors, 9 pre-existing warnings in `tests/` |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — unchanged (GATE-06) |
| Runtime, `next dev` on :3100 | `/` → `skeleton-card-grid` + `aria-label="Loading spaces"`; `/listings/[id]` → `skeleton-panel` + `"Loading this listing"`; `/listings/[id]/book` → `skeleton-panel` + `"Loading your booking"`; each **exactly one** `role="status"` |

The runtime check is the plan's "manual check with throttling", done deterministically instead: the
fallbacks are emitted into the streamed HTML shell, so `curl` sees them without needing a throttle or
a screenshot. It is what produced correction 3.

## Known Stubs

None. No route ships a placeholder that stands in for unwired data — every `loading.tsx` is a
transient fallback for content that exists.

## Threat Flags

None. No new network endpoint, auth path, file access or schema surface. The threat register's four
`mitigate` dispositions are all discharged: `T-11-A11YFILL` (the shell, now on all 20 and asserted),
`T-04-06`/`T-04-02` (unchanged — the group gates still sit outside every Suspense subtree, per
11-12's `blocking-session-gate.test.ts`, still green), `T-11-DEADGATE` (both directions plus closure,
pinned), `T-11-SHIFT` (box classes from the inventory, asserted; the two unpredictable routes recorded
above). `T-11-SC`: zero packages added.

## Self-Check: PASSED

All 20 `loading.tsx` present on disk; `tests/design/loading-coverage.test.ts` present; all four
commits (`5dbdb85`, `6c5251b`, `fde40dd`, `debac03`) present in `git log`.
