---
phase: 02-listings-host-onboarding
plan: 04
subsystem: ui
tags: [cloudinary, next-cloudinary, dnd-kit, upload, signature, idor, rate-limit, photos, drizzle, sonner]

# Dependency graph
requires:
  - phase: 02-01
    provides: listing_photo table (id, listingId, publicId, url, position; unique (listingId,position)), mockCloudinary, cloudinary-sign/photos Wave-0 anchors
  - phase: 02-02
    provides: "@dnd-kit/* + next-cloudinary deps, src/lib/rate-limit.ts (WR-06 limiter)"
  - phase: 02-03
    provides: edit wizard with the photos-step seam, requireUserId/assertOwnership pattern, publishListing D-02 gate
provides:
  - Signed direct-to-Cloudinary listing photo upload (bytes never transit the Next.js server) — LIST-02
  - Session+ownership-gated, rate-limited Cloudinary signature endpoint (POST /api/cloudinary/sign)
  - persistPhoto / reorderPhotos / removePhoto server actions (atomic reorder, contiguous re-pack, orphan cleanup)
  - PhotoUploader client component (CldUploadWidget + @dnd-kit reorder grid + keyboard reorder + per-tile remove) wired into the wizard photo step
affects: [02-05-public-detail-page, 02-06-paymongo-gate, phase-04-search-cards, phase-05-booking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Signed direct-to-client upload: server mints a scoped signature; browser uploads bytes straight to Cloudinary"
    - "Two-phase atomic reorder (negative temp slots → final positions) to survive a non-deferrable unique index"
    - "Route-handler defense-in-depth: session → rate-limit(by user id) → ownership → sign exactly {timestamp, folder}"

key-files:
  created:
    - src/app/api/cloudinary/sign/route.ts
    - src/app/actions/listing-photo.ts
    - src/components/listing/photo-uploader.tsx
  modified:
    - src/lib/cloudinary.ts
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx
    - src/app/(host)/host/listings/[id]/edit/page.tsx
    - tests/helpers/mocks.ts
    - tests/listing/cloudinary-sign.test.ts
    - tests/listing/photos.test.ts

key-decisions:
  - "Reorder uses a two-phase position rewrite (negative temps then final) because the (listingId, position) unique index is not deferrable — the naive single-pass in RESEARCH collides mid-swap"
  - "Sign route resolves listingId from the JSON body (tested path) OR a ?listingId= query fallback so the live CldUploadWidget (which posts its own {paramsToSign}) can still be ownership-scoped"
  - "persistPhoto returns the created row {id, publicId, url, position} so the client grid updates optimistically with real ids"
  - "Live photoCount lifted into the wizard (PhotoUploader onCountChange) so the D-02 '3+ photos' checklist reflects real rows without a reload; publish stays server-enforced"

patterns-established:
  - "Direct-to-Cloudinary signed upload boundary (graduation from the Phase-1 server-routed avatar path)"
  - "Atomic, collision-free ordered-column rewrite under a non-deferrable unique index"
  - "@dnd-kit reorder with a keyboard sensor + explicit move-earlier/later controls (keyboard-operable, not drag-only)"

requirements-completed: [LIST-02]

# Metrics
duration: 18min
completed: 2026-07-09
---

# Phase 2 Plan 04: Listing Photo Gallery Summary

**Signed direct-to-Cloudinary photo upload (bytes bypass the server) behind a session+ownership-gated, rate-limited sign endpoint, plus persist/atomic-reorder/remove actions and a @dnd-kit reorder grid wired into the wizard — LIST-02.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-07-09T16:49:00Z (approx, first read)
- **Completed:** 2026-07-09T17:01:28Z (+08:00)
- **Tasks:** 3 (Task 2 was TDD: RED → GREEN)
- **Files modified/created:** 9 (1045 insertions)

## Accomplishments
- Host uploads photos **directly to Cloudinary** via a signed `<CldUploadWidget>` — bytes never transit the Next.js server (D-04). The api_secret stays server-only; only the signature + public config is returned.
- The `POST /api/cloudinary/sign` endpoint is a hardened money/abuse boundary: **401** no session → **429** rate-limit (`cloudsign:<userId>`, 30/60s, WR-06) → **403** non-owner (IDOR) → signs **exactly `{timestamp, folder}`** (Pitfall 3, so Cloudinary accepts the upload).
- Photo metadata actions: `persistPhoto` (append at `position=count`, 0=cover, soft max 20), `reorderPhotos` (atomic two-phase rewrite, 0=cover), `removePhoto` (delete + contiguous re-pack + Cloudinary `destroy` for orphan cleanup) — all owner-scoped.
- `PhotoUploader` grid wired into the wizard photo step: drag reorder (**@dnd-kit**) + keyboard move-earlier/later, per-tile remove (`aria-label="Remove photo"` + tooltip), `Cover` label, optimistic add/reorder/remove with revert-on-error and sonner toasts. The **D-02 ≥3-photos publish gate now works end-to-end** with real rows (live checklist + server-enforced publish).

## Task Commits

Each task was committed atomically:

1. **Task 1: Cloudinary helpers + sign endpoint** — `c0e5a6c` (feat)
2. **Task 2: Photo metadata actions (TDD)** — `4bfde90` (test/RED) → `d9726a6` (feat/GREEN)
3. **Task 3: Uploader + dnd reorder grid, wired into the wizard** — `d5e439a` (feat)

**Plan metadata:** _(this SUMMARY + final docs commit)_

## Files Created/Modified
- `src/lib/cloudinary.ts` — added `signListingUpload` (wraps `api_sign_request`, secret server-only) + `destroyListingPhoto` (`invalidate:true` orphan cleanup); `uploadAvatar` kept.
- `src/app/api/cloudinary/sign/route.ts` — session+ownership-gated, rate-limited POST that signs `{timestamp, folder}` scoped to `fitout/listings/<listingId>`.
- `src/app/actions/listing-photo.ts` — `persistPhoto` / `reorderPhotos` / `removePhoto` (+ `ListingPhotoRow` type) with ownership guards, atomic reorder, contiguous re-pack, orphan destroy.
- `src/components/listing/photo-uploader.tsx` — client uploader + @dnd-kit reorder grid + keyboard controls + accessible per-tile remove; optimistic state + toasts.
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — filled the Plan-03 photos-step seam with `<PhotoUploader>`; live `photoCount` state drives the D-02 checklist.
- `src/app/(host)/host/listings/[id]/edit/page.tsx` — passes ordered `photos` into the wizard.
- `tests/helpers/mocks.ts` — extended `mockCloudinary` with `uploader.destroy` + `destroys()` capture.
- `tests/listing/cloudinary-sign.test.ts` / `tests/listing/photos.test.ts` — Wave-0 anchors turned green (11 real assertions).

## Decisions Made
- **Two-phase reorder** (negative temp positions → final 0..n-1) instead of the naive single-pass in RESEARCH lines 497-504, because the `(listingId, position)` unique index is **not deferrable** and a reversal collides mid-swap.
- **`?listingId=` query fallback** on the sign route in addition to body-parse, so the declarative `CldUploadWidget` (which posts its own `{paramsToSign}` body) can still communicate the listing scope to the ownership gate. The body path remains primary and is what the tests exercise.
- **Lifted live `photoCount`** into the wizard via `onCountChange`, keeping the publish checklist honest as photos change without a full reload (publish itself remains server-enforced in `publishListing`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reorder rewritten as two-phase to avoid a unique-index collision**
- **Found during:** Task 2 (reorderPhotos)
- **Issue:** The RESEARCH single-pass `set position=i` loop (lines 497-504) throws a `(listingId, position)` unique violation mid-swap for any reorder that moves a photo onto a slot still held by another row (e.g. a full reversal) — the index is not deferrable.
- **Fix:** Rewrote positions in two phases inside one transaction — park every target row at a distinct **negative** temp position, then assign the final contiguous 0..n-1. Atomic and collision-free.
- **Files modified:** src/app/actions/listing-photo.ts
- **Verification:** photos.test.ts drives a full reversal of 3 photos and asserts success + contiguous positions + new cover.
- **Committed in:** d9726a6

**2. [Rule 3 - Blocking] listingId query-param fallback on the sign route**
- **Found during:** Task 3 (CldUploadWidget wiring)
- **Issue:** `next-cloudinary`'s `<CldUploadWidget signatureEndpoint>` POSTs its own `{paramsToSign}` body (no `listingId`), so the ownership gate had no listing to scope to when driven by the real widget.
- **Fix:** The route resolves `listingId` from the JSON body first (tested path), then from `?listingId=` on the endpoint URL; the uploader appends it. Ownership check is unchanged either way.
- **Files modified:** src/app/api/cloudinary/sign/route.ts, src/components/listing/photo-uploader.tsx
- **Verification:** tsc + cloudinary-sign.test.ts (body path) green; query path is manual-UAT.
- **Committed in:** c0e5a6c (route) / d5e439a (uploader)

**3. [Rule 3 - Blocking] Extended the shared Cloudinary mock with `uploader.destroy`**
- **Found during:** Task 2 (removePhoto orphan cleanup)
- **Issue:** `mockCloudinary` only stubbed `upload_stream` + `api_sign_request`, so `destroyListingPhoto` (→ `uploader.destroy`) had no stub and the orphan-cleanup assertion could not run. (The Pattern map already lists mocks.ts as EXTEND.)
- **Fix:** Added a `destroy` vi.fn that captures public_ids + a `destroys()` accessor + reset wiring.
- **Files modified:** tests/helpers/mocks.ts
- **Verification:** photos.test.ts asserts `destroys()` contains the removed public_id.
- **Committed in:** 4bfde90 (with the RED test)

**4. [Rule 2 - Missing Critical] persistPhoto validates non-empty publicId/url + returns the created row**
- **Found during:** Task 2 (persistPhoto)
- **Issue:** `listing_photo.publicId/url` are NOT NULL; an empty client value would hit a DB error instead of a clean rejection. The client grid also needs the new row's real id to render/reorder/remove it.
- **Fix:** Trim + reject empty metadata with a friendly error; return `{ ok: true; photo: {...} }` so the client appends optimistically.
- **Files modified:** src/app/actions/listing-photo.ts
- **Verification:** photos.test.ts (persist stores the row); tsc.
- **Committed in:** d9726a6

**5. [Rule 3 - Blocking] Threaded `photos` + live `photoCount` through the wizard**
- **Found during:** Task 3 (wizard wiring)
- **Issue:** The Plan-03 seam passed only `photoCount` (a number); the uploader needs the ordered photo rows to seed its grid, and the checklist needs a live count.
- **Fix:** Added `photos: ListingPhotoRow[]` to `WizardListing` + edit-page mapping (ordered by position) and a `photoCount` state updated by `PhotoUploader.onCountChange`.
- **Files modified:** src/app/(host)/host/listings/[id]/edit/wizard.tsx, .../page.tsx
- **Verification:** tsc; full suite green.
- **Committed in:** d5e439a

---

**Total deviations:** 5 auto-fixed (1 bug, 3 blocking, 1 missing-critical)
**Impact on plan:** All necessary for correctness/security or to make the plan's prescribed widget/actions actually work end-to-end. No scope creep; payment code untouched (Plan 06); no architectural changes.

## Issues Encountered
- None beyond the deviations above. The two-phase reorder was the only non-obvious correctness point; the vitest `resetModules` + mocked `cloudinary` handle was resolved by importing `cloudinary` after the route in `beforeAll` so the sign-param spy is the same instance the route uses.

## Threat Flags
None — all `<threat_model>` dispositions (T-04-UPLOAD, T-04-IDOR, T-04-SECRET, T-04-ORPHAN, T-04-SIGMATCH) are mitigated and no new security surface was introduced. The `?listingId=` fallback is still gated by the same session+ownership check.

## Known Stubs
None — the uploader is fully wired to real actions and real photo rows. Live Cloudinary upload requires real `CLOUDINARY_*` / `NEXT_PUBLIC_CLOUDINARY_*` env (dev has placeholders), so the browser round-trip is **manual UAT** (02-HUMAN-UAT.md); all automated coverage mocks Cloudinary.

## User Setup Required
None new in this plan. Real photo upload needs valid Cloudinary credentials (`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` and the `NEXT_PUBLIC_CLOUDINARY_*` the widget reads) — dev placeholders won't complete a real upload; that is the manual-UAT step.

## Verification
- `npx tsc --noEmit` — passes
- `npx vitest run tests/listing/cloudinary-sign.test.ts tests/listing/photos.test.ts` — 11/11 pass (LIST-02)
- `npm test` — 27 files passed / 1 skipped; 123 passed / 9 todo (the 9 todos are pre-existing anchors for un-executed plans, e.g. Plan 06 PayMongo)

## Next Phase Readiness
- Real `listing_photo` rows + cover ordering are now produced by the wizard — the public detail page (02-05) `PhotoGallery` (cover-first) has real data, and the D-02 publish gate is satisfiable end-to-end.
- Plan 06 (PayMongo bookability gate) is unblocked and untouched by this plan.

## Self-Check: PASSED

- Files verified present: `src/app/api/cloudinary/sign/route.ts`, `src/app/actions/listing-photo.ts`, `src/components/listing/photo-uploader.tsx`, `02-04-SUMMARY.md`
- Commits verified: `c0e5a6c` (Task 1), `4bfde90` (Task 2 RED), `d9726a6` (Task 2 GREEN), `d5e439a` (Task 3)

---
*Phase: 02-listings-host-onboarding*
*Completed: 2026-07-09*
