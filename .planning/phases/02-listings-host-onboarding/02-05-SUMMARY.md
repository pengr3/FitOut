---
phase: 02-listings-host-onboarding
plan: 05
subsystem: ui
tags: [nextjs, rsc, react-leaflet, leaflet, openstreetmap, postgis, privacy, playwright, drizzle]

# Dependency graph
requires:
  - phase: 02-01
    provides: listing/host_payout schema, deriveBookable, PostGIS point (x=lng/y=lat), showExactAddress
  - phase: 02-02
    provides: shadcn components (badge, separator, tooltip, aspect-ratio, skeleton, card), --brand coral token
  - phase: 01-04
    provides: publicProfile allow-list precedent (src/lib/profile.ts)
provides:
  - Public un-gated listing detail RSC at /listings/[id] (LIST-06)
  - publicListing privacy-aware projection (withholds exact street/coords unless showExactAddress, D-09)
  - PhotoGallery (cover-first, accessible) and ListingMap (react-leaflet OSM, fuzzed circle vs exact pin)
  - State-reflecting book CTA (coral bookable vs disabled "Not bookable yet", D-13)
  - First Playwright spec proving anonymous view + draft/unlisted 404
affects: [phase-03-availability, phase-04-search-and-booking, phase-06-paymongo-gate]

# Tech tracking
tech-stack:
  added: [react-leaflet@5, leaflet@1.9, "@types/leaflet"]
  patterns:
    - "Public projection = explicit allow-list (mirror publicProfile) — new columns never leak"
    - "react-leaflet loaded via a client wrapper using next/dynamic({ ssr:false })"
    - "notFound() gating query must run BEFORE any Suspense/loading boundary or the 404 status is lost"

key-files:
  created:
    - src/lib/listing-public.ts
    - src/app/listings/[id]/page.tsx
    - src/components/listing/photo-gallery.tsx
    - src/components/listing/listing-map.tsx
    - src/components/listing/listing-map-panel.tsx
    - tests/listing/listing-public.test.ts
  modified:
    - e2e/public-listing.spec.ts
    - package.json

key-decisions:
  - "publicListing fuzzes coordinates to ~2dp (neighbourhood) when approximate; exact only when showExactAddress"
  - "react-leaflet split into listing-map (canvas) + listing-map-panel (ssr:false loader) — leaflet cannot SSR"
  - "Removed route loading.tsx: its Suspense boundary streamed a 200 shell before notFound() → broke D-13 404"

patterns-established:
  - "Anonymous public route lives OUTSIDE (app)/(host) so it inherits no auth gate (LIST-06)"
  - "Book CTA derives from deriveBookable (never status alone) — false affordance guard (T-05-BOOKABLE)"

requirements-completed: [LIST-06]

# Metrics
duration: 14min
completed: 2026-07-09
---

# Phase 2 Plan 05: Public Listing Detail Page Summary

**Un-authenticated `/listings/[id]` RSC that renders a published listing (gallery, description, amenities, price, react-leaflet map) with a privacy-aware `publicListing` projection, a `deriveBookable`-driven book CTA, and draft/unlisted 404 — proven by the repo's first Playwright spec.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-09T08:27:41Z
- **Completed:** 2026-07-09T08:41:53Z
- **Tasks:** 3 (Task 1 = TDD: RED + GREEN)
- **Files modified:** 9 (6 created, 3 modified; +1 created-then-removed)

## Accomplishments
- **LIST-06:** anyone with no session can view a PUBLISHED listing's detail page — photos, title, description, amenities, location/map, and price — placed outside `(app)`/`(host)` so no layout gates it.
- **D-09 / T-05-PII:** `publicListing()` is a pure allow-list that drops `addressLine1/addressLine2/postalCode` and coarsens coordinates to ~2 decimals unless the host set `showExactAddress`; the exact point never leaves the server pre-opt-in.
- **D-11:** the map (react-leaflet 5 + free OSM tiles) draws a fuzzed coral `Circle` over the neighbourhood when approximate and an exact coral pin `Marker` when the host shows exact — with a server-rendered text address fallback for screen readers.
- **D-13 / T-05-BOOKABLE:** the book CTA reflects `deriveBookable` — coral "Book this space" when bookable, disabled neutral "Not bookable yet" + explanatory tooltip otherwise (it reads not-bookable now because `payoutsEnabled` is false until Plan 06). Draft/unlisted/missing listings 404.
- Availability "coming soon" placeholder stands in for the Phase-3 calendar.
- The repo's **first Playwright spec** seeds published/draft/unlisted listings directly into the dev DB and asserts anonymous view + 404 without logging in.

## Task Commits

1. **Task 1 (RED): failing publicListing test** - `1420e03` (test)
2. **Task 1 (GREEN): publicListing privacy projection** - `a7c2c87` (feat)
3. **Task 2: public RSC + gallery + privacy-aware map** - `7c265a1` (feat)
4. **Task 3: e2e un-gated view + draft/unlisted 404** - `15a29e3` (feat)

_Plan metadata commit (this SUMMARY) applied separately._

## Files Created/Modified
- `src/lib/listing-public.ts` - pure allow-list projection; withholds exact street/coords unless `showExactAddress` (D-09)
- `src/app/listings/[id]/page.tsx` - public un-gated detail RSC: fetch listing+host+payout, 404 non-published, derive bookable, project, render
- `src/components/listing/photo-gallery.tsx` - cover-first accessible gallery (aspect-ratio tiles, alt text)
- `src/components/listing/listing-map.tsx` - react-leaflet OSM map: fuzzed `Circle` vs exact `Marker` pin (client-only via dynamic)
- `src/components/listing/listing-map-panel.tsx` - `next/dynamic({ ssr:false })` boundary + a11y text fallback (RSC imports this)
- `tests/listing/listing-public.test.ts` - approximate vs exact projection, fuzzing, photo order, PII-leak guard
- `e2e/public-listing.spec.ts` - seeds listings; asserts anonymous 200 view + draft/unlisted 404
- `package.json` / `package-lock.json` - add react-leaflet, leaflet, @types/leaflet (D-18)

## Decisions Made
- **Coordinate fuzzing = round to ~2 decimals (~1.1km).** Simple, deterministic, one-way for the viewer (exact value is dropped server-side); satisfies the D-09 "neighbourhood, not doorstep" intent. Exact coords are exposed only when `showExactAddress` is true.
- **Map is split into two files** (`listing-map` canvas + `listing-map-panel` loader). `leaflet` references `window` at import, so the canvas is loaded ONLY via `next/dynamic({ ssr:false })` from the panel; the RSC imports the panel. A coral `divIcon` SVG pin avoids Leaflet's bundler-broken default marker images (no network image fetch).
- **Plain `<img>` (stored Cloudinary secure_url), not `<CldImage>`.** Keeps the anonymous page free of Cloudinary client config and lets e2e run without live credentials (same choice as the host listing-card). Can graduate to `next-cloudinary` later.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a client `ssr:false` wrapper for the map (`listing-map-panel.tsx`)**
- **Found during:** Task 2 (map component)
- **Issue:** `react-leaflet`/`leaflet` reference `window` at module load and crash server-side rendering; `next/dynamic({ ssr:false })` is not permitted inside a Server Component, so the RSC cannot import the map directly.
- **Fix:** Kept the real leaflet map in `listing-map.tsx` (loaded client-only) and added a thin `"use client"` `listing-map-panel.tsx` that `dynamic()`-loads it with `ssr:false` and renders the accessible text fallback. The page imports the panel.
- **Files modified:** src/components/listing/listing-map.tsx, src/components/listing/listing-map-panel.tsx
- **Verification:** `tsc` clean; the e2e "published" test renders the page without an SSR crash.
- **Committed in:** `7c265a1`

**2. [Rule 1 - Bug] Removed route `loading.tsx` — its Suspense boundary broke the D-13 404 status**
- **Found during:** Task 3 (e2e)
- **Issue:** I first added a `loading.tsx` skeleton (UI-SPEC "loading" state). In Next 16.2 dev, that segment Suspense boundary makes the framework stream a **200** shell before the page's `notFound()` runs, so draft/unlisted listings returned HTTP **200** with the 404 UI — violating D-13 / T-05-NONPUB and failing the e2e 404 assertions.
- **Fix:** Removed `loading.tsx`. The gating `notFound()` query now resolves before any streaming, restoring a true **404** status. Verified an unmatched route (404), the notFound path (404), and the published path (200) directly via curl. Correctness (D-13 404) chosen over the optional loading skeleton; the gallery's `bg-muted` aspect-ratio tiles remain a lightweight loading affordance.
- **Files modified:** src/app/listings/[id]/loading.tsx (created in `7c265a1`, removed in `15a29e3`)
- **Verification:** `npx playwright test e2e/public-listing.spec.ts` → 3/3 pass (published 200; draft & unlisted 404).
- **Committed in:** `15a29e3`

**3. [Rule 1 - Bug] Fixed a Cyrillic character in a map constant name**
- **Found during:** Task 2 (map component, self-review)
- **Issue:** The radius constant was typed `FUZЗ_RADIUS_M` (a Cyrillic "З"), a latent readability/maintenance hazard.
- **Fix:** Renamed to `FUZZ_RADIUS_M` (Latin) at both the declaration and use site.
- **Files modified:** src/components/listing/listing-map.tsx
- **Verification:** `tsc` clean.
- **Committed in:** `7c265a1`

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All three were necessary for correctness (SSR, the D-13 404 contract, identifier hygiene). No scope creep — the extra `listing-map-panel.tsx` is a required SSR boundary; the removed `loading.tsx` was an optional addition that conflicted with a hard requirement.

## Known Placeholders (intentional, by design)
These are state-reflecting placeholders the plan explicitly calls for — not blocking stubs. LIST-06 (view a published listing) is fully achieved.
- **Book CTA** — a placeholder affordance; real booking is Phase 4+. It truthfully reflects `deriveBookable` state and will read "Not bookable yet" until Plan 06 wires PayMongo `payouts_enabled`.
- **Availability section** — a "coming soon" placeholder; the real calendar is Phase 3 (D per 02-CONTEXT deferred + UI-SPEC line 130).

## Threat Flags
None. The new public route and address projection are exactly the surfaces the plan's threat model anticipated (T-05-NONPUB, T-05-PII, T-05-BOOKABLE, T-05-OWNERLEAK), all mitigated. No new endpoints, auth paths, or trust boundaries introduced.

## Issues Encountered
- **Next 16.2 `notFound()` + streaming returns 200:** diagnosed that a route `loading.tsx` (Suspense) commits the 200 shell before `notFound()` can set 404; resolved by removing it (see Deviation 2). Directly verified via curl that an unmatched route, the notFound path, and the published path all return the expected status.

## Verification
- `npx tsc --noEmit` → PASS (exit 0)
- `npx playwright test e2e/public-listing.spec.ts` → 3 passed (anonymous 200 view; draft 404; unlisted 404)
- `npm test` (full vitest) → 25 files passed, 112 tests passed, 0 failed (3 skipped / 19 todo are pre-existing Wave-0 anchors)
- Manual UAT (02-HUMAN-UAT.md): Leaflet/OSM tiles + fuzzed-circle-vs-exact-pin per the toggle — network UI, out of the automated assertion path.

## User Setup Required
None - the public page uses keyless OSM tiles; no external service configuration required for this plan.

## Next Phase Readiness
- **Phase 3 (availability):** the detail page has a labelled "Availability" placeholder section ready to swap for the real calendar.
- **Phase 4 (search + booking):** `publicListing` (public shape) and the `deriveBookable`-driven CTA are ready; search will exclude published-but-not-bookable listings (D-16) while this detail page stays link-viewable.
- **Phase 6 (PayMongo gate):** once `host_payout.payoutsEnabled` flips true, the same CTA turns coral "Book this space" with zero page changes.

## Self-Check: PASSED
- All 6 created files + the modified e2e spec exist; `loading.tsx` correctly absent (removed).
- All 4 task commits present (`1420e03`, `a7c2c87`, `7c265a1`, `15a29e3`).

---
*Phase: 02-listings-host-onboarding*
*Completed: 2026-07-09*
