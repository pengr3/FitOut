---
phase: 04-booking-core-search-no-payment
plan: 05
subsystem: ui
tags: [search, nextjs-rsc, react-hook-form, zod, url-state, shadcn, tailwind, postgis]

# Dependency graph
requires:
  - phase: 04-03
    provides: "searchListings(db, params, now?) two-stage geo+availability query + SearchResultRow"
  - phase: 04-02
    provides: "searchParamsSchema (single combined category), DISPLAY_CURRENCY/formatMoney (PHP), D-38 seed"
  - phase: 02-listings-host-onboarding
    provides: "listing-card presentational core, address-autocomplete (onResolved {lat,lng}), public listing RSC pattern"
provides:
  - "Search / browse home at / (D-29) — SEARCH-01..05 UI: location+filters → cards with photo/name/₱price/distance"
  - "SearchResultCard — neutral public card (no host controls, no status badge), whole-card Link carrying the searched window"
  - "SearchResults — grid + sort Select + Load more + skeleton + zero-result escape hatches + 'You might also like' nearby cards + cold-start"
  - "SearchBar — reused AddressAutocomplete + single combined category + date/time/price/radius serialized to the URL"
affects: [04-06 reserve (cards link to /listings/[id]?date=&start=&end=), 04-08 E2E + human-verify (checks this UI against 04-UI-SPEC)]

# Tech tracking
tech-stack:
  added: []  # no new runtime dependencies — every shadcn primitive already installed
  patterns:
    - "URL-as-state search: SearchBar RHF form → searchParamsSchema.safeParse at submit → URLSearchParams → router.push; the RSC re-reads + re-validates (server is the authority)"
    - "Cumulative RSC pagination: page.tsx fetches searchListings for pages 0..N and concatenates so 'Load more' appends without a client fetch endpoint (bounded by MAX_PAGES)"
    - "Extend listing-card into a neutral public search card (omit host-action props + status badge; normalize title 500→600)"

key-files:
  created:
    - src/components/search/search-result-card.tsx
    - src/components/search/search-results.tsx
    - src/components/search/search-bar.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "RHF manages the SearchBar; the shared searchParamsSchema validates the assembled params at submit (safeParse) rather than as a zodResolver — the schema's z.coerce input types are `unknown` and fight RHF typing; the RSC safeParse remains the authority (honors 'validated by searchParamsSchema' without type friction)"
  - "Load more = cumulative server-side page 0..N fetch in the RSC (no new server action; stays within the 4 plan files); the last page's hasMore probe drives the button"
  - "Price filter is priceMax-only (the schema's single hourly-rate ceiling axis); the SearchBar shows ₱/hr pesos and converts ₱→cents at submit (the param unit matches the search SQL)"
  - "Added a MAX_PAGES=50 cap on the cumulative fetch — a crafted ?page= cannot spin the query loop (strengthens T-04-PARAMTAMPER)"
  - "LAUNCH_CITY='Manila' is a single-city-launch constant (CLAUDE.md) driving the default header + cold-start copy — not a data stub; results come from the real seeded DB via searchListings"
  - "Search bar is a responsive wrapping pill (fields stack on mobile, ≥44px hit areas); the UI-SPEC's mobile expand-to-dialog is deferred as a fast-follow"

patterns-established:
  - "Neutral public search card (coral reserved for the single Search button per screen)"
  - "Escape-hatch empty state (Broaden radius / Clear filters / Show nearby) + broadened-fallback 'You might also like' cards driven by the RSC"

requirements-completed: [SEARCH-01, SEARCH-02, SEARCH-03, SEARCH-04, SEARCH-05]

# Metrics
duration: 24min
completed: 2026-07-15
---

# Phase 4 Plan 05: Search Home UI Summary

**The demand-side front door at `/`: an Airbnb-style URL-serialized search bar (location + activity/type + date/optional time + price + radius) over a two-stage `searchListings` result grid — default city view, nearest/price sort, Load more, zero-result escape hatches + broadened "You might also like" cards, and a cold-start floor — replacing the Next.js scaffold.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-15T05:01:37Z
- **Completed:** 2026-07-15T05:25:37Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 replaced)

## Accomplishments
- `SearchResultCard` extends the `listing-card` core: 4:3 cover / title-600 / `₱X/hr · ₱Y/day` (PHP, `tabular-nums`) / distance (origin-only) / optional venue-tz "Available …" line; NO host controls, NO status badge; the whole card is a `Link` to `/listings/[id]?date=&start=&end=`.
- `SearchResults`: 1/2/3-col grid (16/24 gutter), sort `Select` ("Nearest first" disabled with a hint when no origin / "Price: low to high"), neutral `Load more` (hasMore probe, "Loading…" mid-fetch, hidden when exhausted), skeleton grid, zero-result escape hatches (`Broaden radius` / `Clear filters` / `Show nearby spaces`) with an auto-rendered "You might also like" divider + cards, and the cold-start liquidity-floor state.
- `SearchBar`: reused `AddressAutocomplete` (+ optional "Use my location"); ONE combined activity/type `Select` merging `SPACE_TYPE_LABELS` + `ACTIVITY_TAG_LABELS` → a single `?category`; date + optional on-the-hour time; max ₱/hr price; radius presets 2/5/10/25 (default 10); the single coral `Search` CTA; serialized to a shareable URL via `useRouter` + `URLSearchParams`.
- `app/page.tsx` replaced (D-29): a public RSC that awaits `searchParams`, re-validates via `searchParamsSchema.safeParse` (garbage → default city view, never a crash), runs the two-stage `searchListings` server-side (deriveBookable stays in the SQL), and composes the bar + results with a broadened zero-result fallback.

## Task Commits

1. **Task 1: SearchResultCard + SearchResults** - `8d46a4e` (feat)
2. **Task 2: SearchBar** - `8c4c229` (feat)
3. **Task 3: Replace scaffold — search home RSC** - `e9169aa` (feat)

**Plan metadata:** committed with STATE/ROADMAP/REQUIREMENTS (docs).

## Files Created/Modified
- `src/components/search/search-result-card.tsx` - Neutral public result card (extends listing-card; PHP price, distance, searched-window line; whole-card Link).
- `src/components/search/search-results.tsx` - Results shell (grid, sort, Load more, skeleton, zero-result + nearby cards, cold-start); the one client boundary, URL-driven.
- `src/components/search/search-bar.tsx` - Filter form (RHF + shared-schema validation) serializing location + single-category + date/time/price/radius to the URL.
- `src/app/page.tsx` - Search home RSC (replaces the scaffold): awaits+validates searchParams, runs two-stage searchListings, broadened zero-result fallback, cumulative Load-more.

## Decisions Made
- **RHF + `searchParamsSchema.safeParse` at submit (not `zodResolver`)** — the schema's `z.coerce.number()` input types resolve to `unknown` and would leak into every RHF field; validating the assembled params at submit keeps the form types clean while the shared schema stays the source of truth (and the RSC re-validates authoritatively). "Validated by searchParamsSchema" is satisfied.
- **Load more = cumulative server page 0..N fetch** in the RSC — appends without adding a client fetch endpoint / server action, staying within the 4 plan files; bounded by `MAX_PAGES` and stops early once `hasMore` is false.
- **priceMax-only** price filter — the schema exposes one hourly-rate ceiling; the SearchBar shows ₱/hr pesos and converts to cents (the param unit) at submit.
- **`LAUNCH_CITY='Manila'`** default header/cold-start constant (single-city launch, CLAUDE.md) — cards render real seeded data via `searchListings`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing safeguard] MAX_PAGES cap on the cumulative Load-more fetch**
- **Found during:** Task 3 (search home RSC)
- **Issue:** The cumulative page-0..N fetch loops once per requested page; `searchParamsSchema` bounds `page ≥ 0` but not above, so a crafted `?page=999999` could spin the query loop (a DoS lever on the public home).
- **Fix:** Clamp `page = Math.min(parsed.page, 50)` before the loop; strengthens the plan's `T-04-PARAMTAMPER` mitigation (which only covered shape validation).
- **Files modified:** src/app/page.tsx
- **Verification:** tsc + lint clean; loop is bounded and stops early when exhausted.
- **Committed in:** `e9169aa` (Task 3 commit)

**2. [Rule 2 - Missing error handling] RSC fetch-error state for searchListings**
- **Found during:** Task 3 (search home RSC)
- **Issue:** The plan didn't specify RSC-level error handling, but the 04-UI-SPEC § Screen contract lists a "search fetch error (retry)" state; an unhandled DB error would crash the home page.
- **Fix:** Wrapped the fetch in try/catch → a `fetchError` flag → `SearchResults` renders the UI-SPEC's neutral "Something went wrong loading spaces. Try again." block with a `router.refresh()` retry.
- **Files modified:** src/app/page.tsx, src/components/search/search-results.tsx
- **Verification:** tsc + lint clean; error path renders the neutral retry state (never red).
- **Committed in:** `e9169aa` (Task 3 commit)

**3. [Rule 1 - Lint cleanup] watch() → useWatch in SearchBar**
- **Found during:** Task 2 (SearchBar)
- **Issue:** `form.watch(...)` triggered `react-hooks/incompatible-library` (React-Compiler stale-memo warning), same as the repo's existing signup/wizard forms.
- **Fix:** Switched to the repo's `useWatch({ control, name })` idiom (the pattern weekly-hours-editor uses); also removed an unused `SearchParams` import.
- **Files modified:** src/components/search/search-bar.tsx
- **Verification:** `npx eslint src/components/search/search-bar.tsx` exit 0 (no warnings).
- **Committed in:** `8c4c229` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 missing safeguard/error-handling, 1 lint cleanup)
**Impact on plan:** All within the plan's intent and the UI-SPEC contract. No scope creep, no new dependencies, no new files beyond the four specified.

### Conscious scope notes (not defects)
- **Mobile search:** shipped a responsive wrapping pill (fields stack on mobile, all controls ≥44px) rather than the UI-SPEC's mobile expand-to-`dialog`. Deferred as a fast-follow; 04-08's human-verify may flag it.
- **Price control:** min/max was reduced to a single **max ₱/hr** input because `searchParamsSchema` only carries `priceMax` (emitting a `priceMin` would be an unsupported param).

## Issues Encountered

Two **pre-existing, out-of-scope** failures surfaced when running the whole-project gates (both logged to `04-.../deferred-items.md`, neither caused by this plan — my 4 files are tsc + eslint clean in isolation and the build's Compile + TypeScript phases are green):

1. **`npm run build`** fails at page-data collection for `/host/payouts/refresh` — `PAYMONGO_SECRET_KEY is not set` (guard in the untouched Phase-2 `src/lib/paymongo.ts`). The `/` route compiles + typechecks; the failure is a runtime env precondition on an unrelated route. A build on the prior commit fails identically.
2. **`npm run lint`** exits 1 on a pre-existing `react-hooks/set-state-in-effect` **error** in `src/components/listing/address-autocomplete.tsx:110` (Phase-2, empty diff vs pre-plan HEAD~2) + 4 pre-existing warnings. Linting my 4 files alone is exit 0.

## Known Stubs

None. `LAUNCH_CITY='Manila'` is an intentional single-city-launch constant (CLAUDE.md constraint), not a data stub — every result card is real seeded data from `searchListings`. No placeholder/mock data flows to the UI.

## User Setup Required

None for this plan's deliverables. (Unrelated: a full production `npm run build` needs `PAYMONGO_SECRET_KEY` + Google OAuth keys for the Phase-2 host/auth routes — see deferred-items.)

## Next Phase Readiness
- `/` is a working search/browse home (SEARCH-01..05). The result cards link to `/listings/[id]?date=&start=&end=`, ready for 04-06 to consume the searched window into the reserve flow.
- 04-08's E2E + human-verify check this UI against 04-UI-SPEC (search → cards, empty states + nearby cards, sort-disabled-without-origin, Load more).
- BOOK-01 (price breakdown) stays with 04-06/07; not part of this plan.

## Self-Check: PASSED

- Files created/modified all present: `search-result-card.tsx`, `search-results.tsx`, `search-bar.tsx`, `app/page.tsx` (all FOUND).
- Task commits all present: `8d46a4e` (T1), `8c4c229` (T2), `e9169aa` (T3).
- Gate: my 4 files `npx tsc --noEmit` + `npx eslint` clean; `app/page.tsx` greps `searchParams`/`searchParamsSchema`/`searchListings`; build Compile + TypeScript phases green.

---
*Phase: 04-booking-core-search-no-payment*
*Completed: 2026-07-15*
