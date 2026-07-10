---
status: complete
phase: 2-listings-host-onboarding
started: 2026-07-09
completed: 2026-07-10
current_test: 11
total_tests: 11
passed: 8
needs_review: 2
blocked: 1
issues: 5
---

# Phase 2 — UAT: Listings & Host Onboarding

Conversational UAT. One test at a time. Reply `yes` / `next` if reality matches the "Expected"; otherwise describe what's different (logged as an issue).

**Environment:** dev `.env` uses PLACEHOLDER third-party creds. Tests needing real creds are ⛔ BLOCKED until you supply them (or we seed data):
- Google OAuth — placeholder → use **email/password** instead
- Cloudinary upload — placeholder → photo uploads won't complete
- PayMongo hosted onboarding — needs **Platforms beta** → payout redirect won't complete
Runs fine on: local Postgres, keyless OSM map tiles, Photon address autocomplete.

## Tests

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1 | Cold-start smoke | `npm run dev` boots clean; homepage loads at http://localhost:3000 | ⚠️ boots clean; `/` is the DEFAULT Next.js template (no FitOut landing — out of scope for P1/P2, belongs to P4 search). App itself is fine. |
| 2 | Email/password signup + login | Sign up (book- or host-intent), land logged in; session persists | ✅ signup + host-intent routing → landed on /host |
| 3 | Activate hosting + dashboard | `/host` shows the dashboard with a persistent "Set up payouts to accept bookings" banner (publish NOT blocked by it) | ✅ renders clean after fix 23b5e91 |
| 4 | Listing wizard → pricing | Multi-step wizard type→details→location(map+autocomplete)→pricing→booking-mode; saves a draft between steps | ✅ works (photo step needed 3 fixes) |
| 5 | "Your listings" grid | The listing appears with the right status badge; card links to edit | ✅ "Published · not bookable" badge |
| 6 | Publish gate | Attempting to publish with <3 photos or unverified email is blocked with a clear reason (D-02) | ⚠️ gate LOGIC works (correctly blocked incomplete data) BUT publish has a HIGH-sev dead-end (see Results) — data patched in DB, listing published |
| 7 | Map render | Listing map shows a fuzzed circle (approximate) and an exact pin when show-exact is on | ✅ fuzzed circle on public page (exact-pin toggle not exercised) |
| 8 | Photo upload + reorder | upload ≥3, drag-reorder, first = cover | ✅ (after env + signature fixes) |
| 9 | Public listing page | un-gated view; draft/unlisted → 404 | ✅ renders without login (photos/price/desc/map) |
| 10 | Book CTA state | Public page shows "Not bookable yet" until payouts enabled (D-13) | ✅ "Not bookable yet" shown |
| 11 | Payout onboarding | "Set up payouts" → hosted Linked-Accounts onboarding redirect | ⛔ banner/button present; real redirect blocked on PayMongo beta |

## Verdict — UAT COMPLETE (2026-07-10)

**8/11 pass · 2 findings (tests 1, 6) · 1 blocked on external access (test 11).** The **core value flow works end-to-end**: signup → become a host → build a listing (wizard + map + Photon autocomplete) → upload photos → publish → public page renders un-gated → book CTA correctly reads "Not bookable yet". Verified against real Postgres + real Cloudinary.

### Punch-list
1. **[HIGH — OPEN] Publish dead-end.** Photon autocomplete doesn't fill `city`/`postal_code`; the publish gate requires them and rejects **silently** (review says "ready", button does nothing). Fix: (a) complete the autocomplete→form mapping (city, postal) or add editable fields; (b) surface the server-side missing-field errors on the review step. *(Minor: `currency` defaults to `usd` — should be PHP.)*
2. **[FIXED live — `23b5e91`] `/host` dashboard crash** — `derivePayoutStatus` invoked server-side from a `"use client"` module → extracted to a non-client module.
3. **[FIXED live — `985c250`,`ad9c9b7`] Cloudinary client env vars** (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`/`_API_KEY`) missing from `.env.example` → wizard photo step crashed.
4. **[FIXED live — `8d9c475`] Cloudinary signature mismatch** — sign endpoint signed a recomputed subset instead of the widget's exact `paramsToSign`.
5. **[LOW / out-of-scope] No landing page** — root `/` is the Next.js starter; belongs to Phase 4.

### Dev-only UAT unblocks (not bugs)
- Fake test email → set `email_verified=true` on test accounts in the dev DB.
- Patched the incomplete address (`city`,`postal_code`) in the DB to exercise publish (root cause = punch-list #1).

## Results

- **🐛 BUG (publish dead-end — city, NOT fixed in code yet):** `publishSchema` requires a non-empty `city`, but the Photon address autocomplete mapped "Mandaluyong" into `address_line1`/`neighborhood`/`region` and left **`city` empty** — so a host who picks certain addresses can never publish. Compounded by a **UX bug**: the review step's client check says "Everything looks ready" while the server gate silently rejects (the "finish these to publish" / missing-field feedback isn't surfaced on the review screen) → "Publish did nothing." Two fixes needed: (a) autocomplete field-mapping must populate `city` (or expose an editable city field); (b) publish must surface the server-side missing-field reason on the review screen. UAT unblocked by setting city directly in the DB. *(Minor also-seen: `currency` defaults to `usd` for a PH launch — should be PHP.)*
- **⚙️ Dev-only unblock:** test account used a fake email → couldn't verify → publish blocked. Set `email_verified=true` on the test accounts in the dev DB (normal for local UAT).
- **🐛 CONFIG GAP (found + FIXED, `.env.example`):** the wizard **photo step crashed the whole page** — `CldUploadWidget` requires the CLIENT env var `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, which was never added to `.env.example` (only the server-side `CLOUDINARY_CLOUD_NAME` was). So even a correct real-Cloudinary deploy following the template would break. Fixed `.env.example`; set a dummy value in dev `.env` to unblock UAT. **Robustness nit (deferred, low):** `photo-uploader.tsx` hard-crashes rather than degrading when the cloud name is absent — a friendly "photo uploads unavailable" fallback would be nicer.
- **Test 2 — Signup:** ✅ Email/password signup with host intent works and routes to `/host`.
- **🐛 BUG (found + FIXED live, commit `23b5e91`):** `/host` dashboard crashed at render for any brand-new host. Root cause: `derivePayoutStatus` (a pure function) was exported from `payout-banner.tsx`, a `"use client"` module — a Server Component (`/host`, and the payout `return` page) importing and CALLING it gets a client *reference*, not the function → runtime crash. `next build` missed it because `/host` is dynamic (rendered only at request time). Fix: extracted `derivePayoutStatus` + `PayoutStatus` into a non-client `src/components/host/payout-status.ts`; server pages import from there, banner stays `"use client"`. tsc clean. **Class of bug worth a lint rule** (no server-side calls of `"use client"` exports).
- **Test 1 — Cold-start smoke:** Server boots clean (Ready ~1.5s, no runtime errors). **Finding (low / out-of-scope):** root `/` still renders the default Create-Next-App template — no FitOut landing/home page exists (`src/app/page.tsx` untouched; no `(app)` root home). Not a Phase-2 deliverable; the booker home = search lands in **Phase 4**. All real surfaces exist: `/signup`, `/login`, `/host`, `/host/listings/new`, `/listings/[id]`. → Defer to Phase 4 (or a small polish task).

## Notes / Unblock options
- Tests 9 & 10 can be unblocked WITHOUT real Cloudinary by **seeding** a published listing + 3 photo rows + a payouts-enabled host directly in the DB (offered by the tester).
- Tests 8 & 11 need real Cloudinary creds / PayMongo beta respectively.
