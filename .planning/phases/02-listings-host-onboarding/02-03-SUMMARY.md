---
phase: 02-listings-host-onboarding
plan: 03
subsystem: ui
tags: [listings, server-actions, react-hook-form, zod, drizzle, postgis, shadcn, photon, wizard, idor, next-app-router]

# Dependency graph
requires:
  - phase: 01-auth-accounts
    provides: "user table (FK root), auth.api.getSession session gate, canHost capability + (host) layout gate, emailVerified soft gate (D-07), profile RSC+client-form pattern, authClient.sendVerificationEmail"
  - phase: 02-01 (data model)
    provides: "listing/listing_photo/listing_amenity/listing_activity_tag/host_payout schema + pgEnums + PostGIS geometry, draftSchema/publishSchema, listing-vocab, deriveBookable, applied migrations"
  - phase: 02-02 (deps/tokens/security)
    provides: "shadcn primitives (select/command/popover/checkbox/switch/radio-group/badge/progress/sonner/skeleton/dialog/aspect-ratio), --brand/--success tokens"
provides:
  - "Listing lifecycle server actions: createDraftListing, saveListingStep, publishListing, unlistListing, softDeleteListing (session + IDOR + shared-Zod re-validation; strict server-side D-02 publish gate)"
  - "Airbnb-style 7-step creation/edit wizard with per-step autosave (D-01) + live publish checklist"
  - "Address autocomplete (Photon/OSM) capturing structured address + lat/lng (D-10/D-18)"
  - "Host 'Your listings' grid + reusable listing card (status badge, per-card edit/unlist/delete) + wired dashboard CTA"
affects: [02-04 photos (photos-step seam + reorder), 02-05 public-detail-page (reuses listing read + deriveBookable + address projection), 02-06 paymongo (flips payoutsEnabled -> Live badge), phase-03 availability (reads bookingMode), phase-04 search (reuses listing-card + deriveBookable + status)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server action funnel: requireUserId() session gate -> assertOwnership() IDOR guard -> draftSchema/publishSchema safeParse -> privileged write (status/hostId never client-set)"
    - "Draft-first wizard: RSC 'new' creates an owned draft then redirects to [id]/edit; single RHF form spans steps; each Save and continue autosaves via saveListingStep"
    - "Server actions passed as props from RSC grid to a client card (unlistListing/softDeleteListing) — forward-compatible presentational card"
    - "PostGIS axis discipline end-to-end: store {x:lng, y:lat}, read lat=location.y / lng=location.x"

key-files:
  created:
    - "src/app/actions/listing.ts"
    - "src/app/(host)/host/listings/new/page.tsx"
    - "src/app/(host)/host/listings/[id]/edit/page.tsx"
    - "src/app/(host)/host/listings/[id]/edit/wizard.tsx"
    - "src/components/listing/address-autocomplete.tsx"
    - "src/components/listing/listing-card.tsx"
    - "src/app/(host)/host/listings/page.tsx"
    - "src/app/(host)/host/listings/loading.tsx"
  modified:
    - "src/app/(host)/host/page.tsx"
    - "tests/listing/crud.test.ts"
    - "tests/listing/status-gate.test.ts"

key-decisions:
  - "publishListing re-validates the PERSISTED row with publishSchema (not the client payload) + counts photos + checks host.emailVerified — the D-02 gate is entirely server-side; status is flipped only here"
  - "Rate inputs shown in major currency units, stored as integer cents (round(major*100)); currency symbol derived from listing.currency"
  - "listing-card is a client component with OPTIONAL host-action props so Phase-4 search cards reuse it with no host controls"
  - "Photos wizard step is an honest Plan-04 seam; photoCount comes from the server so publish stays correctly blocked on '3+ photos' this phase"

patterns-established:
  - "assertOwnership(listingId,userId) IDOR guard + (id AND hostId)-scoped UPDATE on every mutation"
  - "Address autocomplete lifts a ResolvedAddress up to the wizard form; provider-agnostic (Photon default, LocationIQ drop-in)"

requirements-completed: [LIST-01, LIST-03, LIST-04, LIST-05]

# Metrics
duration: ~40min
completed: 2026-07-09
---

# Phase 2 Plan 03: Listing Creation/Edit Surface Summary

**Server-enforced listing lifecycle (create/autosave/publish-gate/unlist/soft-delete) behind an Airbnb-style 7-step wizard with Photon address autocomplete and a host "Your listings" grid — status/price are never trusted from the client.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-07-09
- **Tasks:** 3 (Task 1 via TDD RED→GREEN)
- **Files created/modified:** 11 (8 created, 1 modified, 2 test files rewritten)

## Accomplishments

- **Five listing server actions** (`src/app/actions/listing.ts`) — `createDraftListing`, `saveListingStep`, `publishListing`, `unlistListing`, `softDeleteListing`. Every action gates on the session, asserts ownership (IDOR), re-validates with the shared Zod schema, and treats `status`/`hostId`/`publishedAt` as server-only. `publishListing` enforces the full **D-02** gate server-side: `publishSchema.parse(persisted row)` + `photoCount >= 3` + `host.emailVerified`.
- **Airbnb-style wizard** (`wizard.tsx`) — 7 steps (type → details → location → photos → pricing → booking mode → review) with an accessible stepper (`aria-current="step"`), per-step **autosave** on "Save and continue" (sonner toast), and a live "finish these to publish" checklist on review that either shows the coral **Publish listing** CTA or **Save as draft** + unmet-item links (incl. resend-verification).
- **Address autocomplete** (`address-autocomplete.tsx`) — debounced Photon (OpenStreetMap) combobox that lifts a structured address + `lat`/`lng` into the form; surfaces the UI-SPEC "couldn't find that address" copy; provider-agnostic per D-18.
- **Your listings grid + card** — reusable `listing-card.tsx` (cover / title / type / "hourly · day" price / status badge; edit/unlist/delete behind confirm dialogs) and the RSC grid with empty/populated/loading states; `deriveBookable` drives the Live vs "Published · not bookable" badge.
- **Wired the Phase-1 dead CTA** — `host/page.tsx` now links to the real `/host/listings/new` wizard entry ("Create your first listing" / "Create listing" + "Your listings").

## Task Commits

1. **Task 1 (TDD): Listing server actions** — `e9c34aa` (test: RED) → `6681a94` (feat: GREEN)
2. **Task 2: Wizard + address autocomplete + pickers** — `42132b0` (feat)
3. **Task 3: Your listings grid + card + dashboard CTA** — `1c6d75a` (feat)

_(STATE.md / ROADMAP.md intentionally NOT modified — the orchestrator owns tracking per this plan's constraints, so there is no separate metadata commit here.)_

## Files Created/Modified

- `src/app/actions/listing.ts` — the five lifecycle actions (session + IDOR + shared-Zod + D-02 publish gate).
- `src/app/(host)/host/listings/new/page.tsx` — draft-first entry (create draft → redirect to edit).
- `src/app/(host)/host/listings/[id]/edit/page.tsx` — RSC loads the owner's listing (+photos/amenities/tags), IDOR→`notFound()`, seeds the wizard.
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — the client multi-step wizard.
- `src/components/listing/address-autocomplete.tsx` — Photon combobox → structured address + lat/lng.
- `src/components/listing/listing-card.tsx` — presentational card + optional host actions.
- `src/app/(host)/host/listings/page.tsx` — Your listings grid (RSC).
- `src/app/(host)/host/listings/loading.tsx` — streaming skeleton grid.
- `src/app/(host)/host/page.tsx` — replaced the disabled "coming in Phase 2" placeholder with the real coral CTA.
- `tests/listing/crud.test.ts`, `tests/listing/status-gate.test.ts` — RED→GREEN assertions driving the real actions.

## Decisions Made

- **D-02 gate re-reads the persisted row**, not the client payload, so a stale/forged client cannot bypass required fields; the missing-item map drives the wizard's checklist.
- **Money UX vs storage:** inputs are major-currency units, persisted as integer cents (`round(major*100)`); the symbol comes from `listing.currency`.
- **`listing-card` action props are optional** → the same card serves the host grid (with edit/unlist/delete) and Phase-4 search results (presentational only).
- **Third-party geocoder call is client-side** (browser → `photon.komoot.io`), sending only the typed address (no secrets/PII); the tampering surface (autocomplete lat/lng, T-03-INPUT) stays mitigated because publish rejects absent coordinates and the `x=lng,y=lat` axis order is enforced on write and read.

## Deviations from Plan

Only one minor, additive deviation:

**1. [Rule 2 - Missing Critical] Added `loading.tsx` streaming skeleton for the listings grid**
- **Found during:** Task 3 (Your listings grid)
- **Issue:** The UI-SPEC screen-state contract requires a **loading (skeleton grid)** state for "Your listings", but an RSC that awaits DB reads has no in-page loading state without a colocated `loading.tsx`.
- **Fix:** Added `src/app/(host)/host/listings/loading.tsx` rendering a `Skeleton` grid (component shipped by Plan 02).
- **Files modified:** `src/app/(host)/host/listings/loading.tsx`
- **Verification:** `npx tsc --noEmit` clean; `next build` renders the route.
- **Committed in:** `1c6d75a` (Task 3 commit)

---

**Total deviations:** 1 (missing critical UI state; additive, no scope creep).
**Impact on plan:** All three tasks delivered exactly as written; the extra file completes a required screen state.

## Known Stubs

**1. Wizard photos step — Plan-04 seam (intentional, plan-acknowledged).**
- **File/line:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx` (step 3, `step === 3` block).
- **Reason:** The signed direct-to-Cloudinary uploader grid + drag-reorder land in **Plan 04 (Wave 3)**. The step renders honest copy ("Photo upload arrives in the next update. {photoCount} added so far.") — it does NOT fabricate data. `photoCount` is read from the server, so the review checklist's "3+ photos" row is accurately unmet and `publishListing` is correctly blocked on photos this phase. The publish gate itself is fully wired and enforced server-side; only the photo *upload UI* is deferred. Resolved by Plan 04.
- **Consequence:** `listing-card` shows a "No photos yet" cover placeholder until Plan 04 adds cover photos (position 0).

This stub does NOT prevent the plan's goal — hosts can create, edit, and progress a listing to the publish boundary; the sole remaining publish input (photos) is the very subject of the next plan.

## Issues Encountered

- **Test-schema binding:** the listing actions write via `@/lib/db` directly (unlike Phase-1's `updateProfile`, which goes through `auth.api`). The crud/status-gate integration tests therefore `vi.doMock("@/lib/db", …)` to the isolated test-schema db (and stub `next/cache`'s `revalidatePath`) in addition to the established `next/headers` + `@/lib/auth` mocks, then lazily import the actions. Documented at the top of both test files. Resolved; all 12 assertions pass.

## Verification Results

- `npx vitest run tests/listing/crud.test.ts tests/listing/status-gate.test.ts` → **12 passed** (was 12 `it.todo`).
- `npx tsc --noEmit` → **exit 0**.
- `npx vitest run` (full suite) → **24 files passed, 0 failed** (101 tests pass; 19 todo + 3 skipped belong to Plans 04/06 — photos, cloudinary-sign, paymongo).
- `npx next build` → **compiled + TypeScript OK**; `/host`, `/host/listings`, `/host/listings/[id]/edit`, `/host/listings/new` all present (dynamic).
- **Manual UAT (deferred to human, per plan):** Photon autocomplete rendering live suggestions in a browser (network UI) — cannot be exercised in the automated node suite and must not depend on a live third-party call.

## Next Phase Readiness

- **Plan 04 (photos):** the wizard photos step + `listing-card` cover slot are ready seams; `listing_photo` schema + `publishListing`'s `photoCount>=3` gate already consume photos.
- **Plan 05 (public detail page):** can reuse the listing read shape, `deriveBookable`, and the `showExactAddress`/coordinate model; the address projection discipline is established.
- **Plan 06 (PayMongo):** flipping `host_payout.payoutsEnabled` will automatically turn the grid badge from "Published · not bookable" to "Live" (no card changes needed — `deriveBookable` is the single gate).
- **No blockers introduced.** Payment code untouched (payment-agnostic as required).

## Self-Check: PASSED

- All 9 source files + this SUMMARY exist on disk.
- All 4 task commits present in history (`e9c34aa`, `6681a94`, `42132b0`, `1c6d75a`).

---
*Phase: 02-listings-host-onboarding*
*Completed: 2026-07-09*
