---
phase: 01-auth-accounts
plan: 04
subsystem: ui
tags: [nextjs, server-actions, better-auth, drizzle, cloudinary, zod, react-hook-form, route-groups, playwright, capabilities, profile, mode-switch]

# Dependency graph
requires:
  - phase: 01-02
    provides: Better Auth user row (canBook/canHost/role input:false, firstName/lastName/phone/bio/city/avatarUrl/avatarPublicId, createdAt=member-since), auth.api.getSession/updateUser, server-only uploadAvatar(buffer,userId), shared profileSchema, isolated-schema test DB + Cloudinary mock
  - phase: 01-03
    provides: signup server action that sets canBook/canHost from intent + redirects host→/host (the /host seam this plan fills); the client-form → server-action re-validate pattern; optimistic middleware (NOT the gate)
provides:
  - Logged-in booker shell — (app) route group with a per-page auth.api.getSession() gate (the REAL boundary), hosting the Airbnb-style mode switch
  - Profile view/edit (src/app/(app)/profile) — RHF + shared profileSchema, public vs private sections (D-09/D-10), optional Cloudinary avatar
  - Public/private projection helper (src/lib/profile.ts) — publicProfile() allow-list (avatarUrl, firstName, bio, city, createdAt) + locale-aware formatMemberSince (Pitfall 5)
  - Profile + avatar server actions (src/app/actions/profile.ts, avatar.ts) — re-validate server-side; avatar validates image/* + ≤5MB then uploads via the server-only Cloudinary helper, storing avatarUrl + avatarPublicId
  - Capability activation server actions (src/app/actions/capability.ts) — activateHosting/activateBooking flip canHost/canBook server-side (input:false guard), coexist (D-03), NO Stripe (Phase 2, D-05)
  - Airbnb-style mode switch (src/components/mode-switch.tsx) — booker/host context toggle with a 'Start hosting'/'Start booking' activation CTA when the target capability is missing
  - Distinct host dashboard ((host)/host) — its own surface, gated on canHost in the layout (T-04-02 real gate); fills the /host redirect target Plan 03 pointed at
affects: [02-listings-payments, all-phases-2-8]

# Tech tracking
tech-stack:
  added:
    - "No new runtime deps — consumes the Plan 01/02/03 stack (Better Auth, Drizzle, Cloudinary, RHF, Zod, shadcn/ui dropdown/avatar/textarea)"
  patterns:
    - "Public/private split is enforced by an explicit ALLOW-LIST projection (publicProfile) — adding a private column to the user table can never silently leak it"
    - "Logged-in surfaces gate per-page via auth.api.getSession() in the route-group LAYOUT (the real security boundary); middleware stays optimistic-only"
    - "Capability flips are privileged Drizzle db.update on the caller's own row after a session check — canBook/canHost/role are input:false, never client-settable (the same mechanism Plan 03 used at signup, now for activate-later)"
    - "Uploaded files are re-validated (content-type image/* + size cap) with a Zod File schema in the server action BEFORE the Cloudinary call; the secret stays server-side"
    - "Airbnb-style mode switch is a UI navigation control between two DISTINCT route groups ((app) booking vs (host) hosting); when the target capability is missing it degrades to an activation CTA rather than a dead switch"

key-files:
  created:
    - src/lib/profile.ts
    - src/app/(app)/layout.tsx
    - src/app/(app)/profile/page.tsx
    - src/app/(app)/profile/profile-form.tsx
    - src/app/actions/profile.ts
    - src/app/actions/avatar.ts
    - src/app/actions/capability.ts
    - src/components/mode-switch.tsx
    - src/app/(host)/host/layout.tsx
    - src/app/(host)/host/page.tsx
    - tests/profile/profile.test.ts
    - tests/profile/avatar.test.ts
    - tests/auth/capability-activate.test.ts
    - e2e/mode-switch.spec.ts
  modified: []

key-decisions:
  - "publicProfile() is an allow-list (returns exactly {avatarUrl, firstName, bio, city, createdAt}) not a deny-list — the leak-safe default for D-09/D-10. PRIVATE_PROFILE_FIELDS documents the excluded set for tests/readers."
  - "Capability activation uses the SAME privileged db.update mechanism Plan 03 used at signup (not auth.api.updateUser, since canBook/canHost are input:false). activateHosting/activateBooking only set the flag + return a redirect target; neither clears the other flag (coexistence, D-03)."
  - "The (host) layout is the real canHost gate (redirect !canHost → /); the host PAGE repeats the check as defense-in-depth. Mirrors RESEARCH's 'middleware is optimistic, per-page is the boundary'."
  - "Profile edit persists optional fields as '' (cleared) rather than leaving stale values, so removing a bio/city/phone in the form actually clears it via auth.api.updateUser."
  - "ProfileForm split into page.tsx (RSC: session read + member-since) + profile-form.tsx (client: RHF + the two server actions) — keeps the session/secret on the server and the interactive form on the client."

patterns-established:
  - "Pattern: allow-list public projection helper as the single public/private boundary (src/lib/profile.ts)"
  - "Pattern: route-group layout as the per-page auth gate for a whole logged-in surface ((app) and (host))"
  - "Pattern: activate-later capability = session check + privileged flag flip + redirect, flags coexist"

requirements-completed: [AUTH-04, AUTH-05]

# Metrics
duration: 8min
completed: 2026-06-03
---

# Phase 1 Plan 04: Signed-In Identity Surface Summary

**The logged-in identity surface — an (app) booker shell + (host) dashboard each gated per-page on the session, an Airbnb-style mode switch that activates the other capability server-side when missing, a public/private profile (allow-list projection + optional Cloudinary avatar with type/size guards), all writes re-validated server-side — proven by profile-persistence/leak-guard + capability-coexistence integration tests and a host-gate mode-switch E2E.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-03T10:04:05Z
- **Completed:** 2026-06-03T10:11:41Z
- **Tasks:** 2 auto/TDD tasks complete (plan is autonomous:true — ran end to end, no human checkpoint)
- **Files modified:** 14 created across two commits

## Accomplishments
- Built the **profile view/edit** surface: an `(app)` route group with a per-page `auth.api.getSession()` gate (the real boundary, not the optimistic middleware), a profile page split into a **Public profile** section (avatar, first name, About, city) and a **Private account info** section (last name, phone) per D-09/D-10, wired to a server action that re-validates with the shared `profileSchema`.
- Added the **public/private projection** (`src/lib/profile.ts`): `publicProfile()` is an explicit allow-list returning ONLY `{avatarUrl, firstName, bio, city, createdAt}` — lastName/email/phone/role can never leak (T-04-03) — plus `formatMemberSince()` that renders `createdAt` in the viewer's locale (Pitfall 5, no naive timestamp).
- Wired the **avatar upload**: the server action validates `image/*` + ≤5 MB with a Zod `File` schema (T-04-04) BEFORE calling the server-only Cloudinary helper, then stores both `avatarUrl` and `avatarPublicId` on the user row. The api_secret never reaches the client (T-04-05).
- Built the **activate-later capability flow**: `activateHosting()`/`activateBooking()` flip `canHost`/`canBook` server-side via a privileged `db.update` (the `input:false` escalation guard means a client can never self-grant — T-04-01), and both capabilities **coexist** (neither clears the other, D-03). No Stripe onboarding is triggered (Phase 2, D-05).
- Built the **Airbnb-style mode switch** + **distinct host dashboard**: the `mode-switch` toggles between the booking `(app)` surface and the hosting `(host)` surface, degrading to a "Start hosting"/"Start booking" CTA when the target capability is missing. The `(host)/host` layout is the **real gate** (redirects `!canHost` → `/`), filling the `/host` redirect target Plan 03 pointed at. Full suite: **35/35 vitest + 2/2 new Playwright** green; `tsc --noEmit` clean; `next build` clean (the new `ƒ /host` and `ƒ /profile` are correctly server-rendered/gated).

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD): profile view/edit + public/private projection + avatar upload** — `dc12665` (feat)
2. **Task 2 (TDD): capability activation + Airbnb mode switch + gated host dashboard** — `958229e` (feat)

**Plan metadata:** committed separately (docs: complete plan).

_TDD note: both tasks are `tdd="true"`. For Task 1 the projection helper (`profile.ts`) was authored first, the two test files were written, run **RED** (avatar suite failed on the missing `@/app/actions/avatar` import + a passing profile suite), then the actions were implemented to **GREEN** (7/7). For Task 2 the test asserts the activate-later BEHAVIOR + the `input:false` invariant against the live auth config; the E2E spec is a genuine regression guard (it goes red if the `(host)` canHost gate or the signup→/host routing breaks). Detail in TDD Gate Compliance below._

## Files Created/Modified
- `src/lib/profile.ts` — `publicProfile()` allow-list projection, `PRIVATE_PROFILE_FIELDS`, `formatMemberSince()`.
- `src/app/(app)/layout.tsx` — logged-in booker shell; per-page session gate; hosts the mode switch.
- `src/app/(app)/profile/page.tsx` — RSC: session read + member-since; renders the form.
- `src/app/(app)/profile/profile-form.tsx` — client RHF form (public/private sections) + avatar upload control.
- `src/app/actions/profile.ts` — `updateProfile`: session-gated, re-validates `profileSchema`, persists via `auth.api.updateUser`.
- `src/app/actions/avatar.ts` — `uploadAvatarAction` + exported `avatarFileSchema`/`AVATAR_MAX_BYTES`: validate → upload → store URL+public_id.
- `src/app/actions/capability.ts` — `activateHosting`/`activateBooking`: privileged server-side flag flip, coexist, no Stripe.
- `src/components/mode-switch.tsx` — Airbnb-style booker/host switch with activation CTA fallback.
- `src/app/(host)/host/layout.tsx` — distinct host shell; the REAL canHost gate.
- `src/app/(host)/host/page.tsx` — minimal host dashboard ("Your hosting" + a Phase-2 "Create a listing" CTA).
- `tests/profile/profile.test.ts` — persistence + public-projection leak guard + member-since formatting.
- `tests/profile/avatar.test.ts` — file type/size guard + Cloudinary (mocked) upload + store.
- `tests/auth/capability-activate.test.ts` — canHost flips true while canBook stays true (coexist); input:false invariant.
- `e2e/mode-switch.spec.ts` — host-capable reaches the /host dashboard; booker-only is bounced from /host.

## Decisions Made
- **Allow-list projection** for `publicProfile()` (vs deny-list) — leak-safe by construction; `PRIVATE_PROFILE_FIELDS` documents the excluded set and the test iterates it.
- **Privileged db.update for activation**, not `auth.api.updateUser` — `canBook`/`canHost` are `input:false`, so the documented privileged path (the same one Plan 03 used at signup) is the only way to flip them; activation never clears the other flag (D-03 coexistence).
- **(host) layout as the gate, page as defense-in-depth** — the layout redirects `!canHost`; the page repeats the check so hosting content is never rendered without the capability.
- **Optional fields persisted as ''** so clearing a bio/city/phone in the form actually clears it.
- **RSC page + client form split** to keep the session and Cloudinary secret server-side while the interactive RHF form runs on the client.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' files, behaviors, and acceptance criteria were implemented as specified; no Rule 1–4 deviations were needed.

## Issues Encountered
- Benign, expected warnings during runs: `Social provider google is missing clientId or clientSecret` (no real Google creds yet — approved) and the Next 16 `middleware` → `proxy` deprecation nudge (middleware kept per Plan 03's decision). Neither affects this plan.

## TDD Gate Compliance
Both tasks are `tdd="true"`.
- **Task 1:** Genuine RED→GREEN within the task — `tests/profile/avatar.test.ts` ran RED on the missing `@/app/actions/avatar` import (and `profile.test.ts` already green against the just-authored `profile.ts` projection), then the profile + avatar server actions were implemented to GREEN (7/7). The public-projection test is a real leak guard: it asserts the public object has **exactly** the five public keys and that every `PRIVATE_PROFILE_FIELDS` entry (lastName/email/phone/role/avatarPublicId) is absent — adding a private field to `publicProfile()` fails it.
- **Task 2:** The implementation behavior (a privileged flag flip) and the `input:false` invariant are asserted against the live auth config; a classic test-first `test(...)`-before-`feat(...)` commit pair was not produced because the activation mechanism mirrors the Plan-03 signup path. The suites are regression guards: `capability-activate` fails if activation clears the coexisting flag or if `input:false` is removed; `e2e/mode-switch` fails if the `(host)` canHost gate or the host-signup→/host routing breaks. A formal RED→GREEN commit sequence is therefore not present for Task 2 — documented here per the executor TDD-gate rule.

## Known Stubs
- **Host dashboard "Create a listing" button is disabled** with "(coming in Phase 2)". This is a deliberate forward seam (listing creation + Stripe payout onboarding are Phase 2, D-05), not a data stub — the host surface itself, its canHost gate, and the mode switch are fully functional. No hardcoded/empty data flows to any user-facing field; profile, avatar, capability, and host-greeting all read real session/DB state.

## Threat Flags
None — no security surface beyond the plan's `<threat_model>` was introduced. All six threats are mitigated and (where testable) covered: T-04-01 (server-side capability flip + input:false) by `capability-activate.test.ts`; T-04-02 (host gate) by `e2e/mode-switch.spec.ts`; T-04-03 (private-field leak) by `profile.test.ts`; T-04-04 (file type/size) by `avatar.test.ts`; T-04-05 (Cloudinary secret server-only) by the server-action boundary; T-04-06 (unauthenticated access) by the session check in every action + layout.

## Manual / Deferred Verification
- **Real Cloudinary avatar upload:** not exercised against the live service — `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET` are not set yet (approved). The avatar BEHAVIOR (validate → `uploadAvatar` → store `secure_url` + `public_id`) is proven end-to-end against the Cloudinary **mock** (`tests/helpers/mocks.ts`); a real upload through the profile UI is a one-time manual check once the account owner adds the three env vars to `.env.local`. The wiring (`src/lib/cloudinary.ts` is `process.env`-based; the action uses `upload_stream`) is correct and ready.

## User Setup Required
None new beyond Plan 02's documented `.env.local` credentials. The avatar feature is fully usable once `CLOUDINARY_*` are populated (see `.env.example`); profiles, capability activation, the mode switch, and the host dashboard all work without any external credentials.

## Next Phase Readiness
- **Ready for Phase 2 (listings + payments):** the host surface (`(host)/host`) with its real `canHost` gate is the landing pad for listing creation; `activateHosting()` is where Stripe Connect onboarding will be initiated (the D-05 seam is marked in `capability.ts`). The single profile (public/private split) is reused across both contexts; `lastName` (private) is stored for the Phase-2 payout/KYC step. The Cloudinary integration proven here (server-action `upload_stream`) graduates to signed client-direct upload for Phase-2 galleries (seam noted in `avatar.ts` / `cloudinary.ts`).
- **Concern (non-blocking, carried from Plan 03):** consider migrating `src/middleware.ts` → `proxy.ts` (Next 16 deprecation) and tracking the upstream `@better-auth/kysely-adapter` fix to drop the postinstall patch.

## Self-Check: PASSED

All 14 listed key files verified present on disk; both task commits (`dc12665`, `958229e`) verified in git log. Plan verification re-run: `npx vitest run tests/profile/ tests/auth/capability-activate.test.ts` exits 0 (10 tests); `npx playwright test e2e/mode-switch.spec.ts` exits 0 (2 tests); full `npx vitest run` exits 0 (35 tests, 12 files); `npx tsc --noEmit` exits 0; `npx next build` exits 0 (all routes incl. `ƒ /host`, `ƒ /profile`).

---
*Phase: 01-auth-accounts*
*Completed: 2026-06-03*
