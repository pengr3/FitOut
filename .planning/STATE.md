---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: Phase 3 Wave 1 COMPLETE (03-01) — the double-booking keystone is live. booking_no_overlap GiST EXCLUDE constraint applied to the live DB; operating_hours/availability_block/booking tables + booking_status enum + listing.unitCount/timezone in schema; deps (react-day-picker/date-fns/@date-fns/tz) + shadcn calendar/toggle/toggle-group/scroll-area; makeRacingClients + isPgError. SC#4 two-connection race test GREEN (4 behaviors, non-flaky). FINDING: a genuine concurrent race surfaces 40P01 (deadlock) as well as 23P01 — both prevent the double-book; Phase-4 error mapping must treat 40P01 like 23P01. Next: /gsd-execute-phase 3 continues with Wave 2 (03-02 server correctness, 03-03 host backend).
last_updated: "2026-07-11T04:24:53Z"
last_activity: 2026-07-11
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 15
  completed_plans: 11
  percent: 73
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Find & book a space — search → real availability → reserve a time slot → pay, with confidence the booking is real.
**Current focus:** Phase 03 — availability-&-double-booking-guarantee (Phases 01–02 complete)

## Current Position

Phase: 3 (Availability & the Double-Booking Guarantee) — IN PROGRESS (Wave 1 of 3 complete)
Plan: 03-01 COMPLETE (foundation + the EXCLUDE keystone). Remaining: W2: 03-02 server correctness, 03-03 host backend; W3: 03-04 host editor UI, 03-05 booker calendar. Waves 3 (03-04/03-05) have human-verify checkpoints. Next: 03-02 / 03-03 (parallel, both blocked only on W1 which is now done).
Status: Phase 02 COMPLETE and closed. All 6 plans committed on `dev`; full Vitest suite **29 files / 138 tests PASS** + Playwright public-listing E2E 3/3; `npm run build` PASS; migrations applied to the live DB (incl. paymongo_event, migrate-tracked). Phase-2 gates all green: **Validation** (02-VALIDATION Nyquist-compliant, 14/14), **Security** (02-SECURITY threats_open:0, ASVS L2), **UAT** (02-UAT complete — 8/11 pass, in-scope findings fixed live; only test 11 payout-onboarding redirect blocked on PayMongo Platforms beta). PayMongo swap complete end-to-end (D-20): onboarding action (row-locked create-once, rate-limit+audit), Paymongo-Signature-verified idempotent `merchant.activated` webhook = the un-bypassable bookability gate (`payoutsEnabled` webhook/server-set only; auto-revert via `deriveBookable`). NEXT: /gsd-discuss-phase 3 → /gsd-plan-phase 3 → /gsd-execute-phase 3. Phase 3 delivers the DB-level GiST exclusion constraint (the double-booking guarantee) — the correctness keystone before any money/booking flow.
Last activity: 2026-07-10 — Phase 2 verified & closed (validation + security + UAT gates green); dev server + .next cache reset during validation.

Progress: [███████▎··] 73% (11/15 executed plans) · 2/8 phases complete · Phase 3: 1/5 plans (Wave 1 done)

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01-01 | 14 | 3 tasks | 41 files |
| Phase 01 P01-02 | 17 min | 3 tasks | 20 files |
| Phase 01 P01-03 | 18 min | 3 tasks | 15 files |
| Phase 01 P01-04 | 8 min | 2 tasks | 14 files |
| Phase 03 P03-01 | 10 min | 3 tasks | 15 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 8-phase dependency-driven order — identity → supply → availability + double-booking guarantee → booking core + search (no payment) → payments → full instant/request integration → bookings management + cancellation → group bookings. Ordering is non-negotiable for correctness.
- [Roadmap]: Double-booking prevented at the DB level (Postgres GiST exclusion constraint on tstzrange, scoped by listing) — must exist before any booking insert (Phase 3).
- [Roadmap]: Bookability gate built in Phase 2 (gate listing bookability, not creation, on payout-readiness) so it can never be bypassed later — now via PayMongo `merchant.activated`/`activation_status: activated` (D-20); previously Stripe Connect `payouts_enabled`.
- [Quick 260709-id2]: Payments provider switched Stripe → **PayMongo** for the Philippines launch (D-20, supersedes D-17/D-19) — QRPh + GCash + Maya + cards; hold-until-session via on-demand `inhouse` wallet-to-wallet transfers (NOT payment-splitting); bookability gate = `merchant.activated`. Validated by a live sandbox spike (auth/QRPh-accept/card-void confirmed; card manual-capture is a gated advanced feature; QRPh refunds supported per docs). Follow-ups: re-plan 02-06; mark D-17/D-19 superseded in 02-CONTEXT.md.
- [Phase ?]: [01-01]: Postgres image is postgis/postgis:18-3.6 with volume at /var/lib/postgresql (PG18+ convention); bare :18 tag is not on Docker Hub
- [Phase ?]: [01-01]: Integration tests isolate to a dedicated 'test' Postgres schema and migrate ./drizzle before assertions; shared Resend/Cloudinary/Google mocks in tests/helpers/mocks.ts
- [Phase ?]: [01-01]: jose NOT a direct dep (Apple OAuth deferred); src/lib/db/schema.ts is a placeholder owned by the Better Auth CLI until Plan 02
- [Phase 01]: [01-02]: Better Auth configured per D-01..D-13 — email/pw soft gate + Google OAuth, 30d sliding Postgres sessions, revokeSessionsOnPasswordReset:true, input:false canBook/canHost/role escalation guard, profile additionalFields; schema generated + migration APPLIED to live DB
- [Phase 01]: [01-02]: Kept built-in name/email/image + added explicit firstName/lastName/avatarUrl/avatarPublicId (D-09/D-10 public-private split); all timestamps timestamptz; rateLimit.enabled:true with tuned customRules
- [Phase 01]: [01-02]: Fixed Plan-01 test-DB isolation bug (integration writes leaked into dev public schema) — now per-Vitest-worker isolated schema with public-ref rewriting; mocked-email capture needs a fake RESEND_API_KEY in setup
- [Phase 01]: [01-03]: Capability at signup is set via a privileged db.update on the user row AFTER auth.api.signUpEmail (canBook/canHost are input:false — never in the signup body); intent maps to exactly one flag (D-02/T-03-01). book→canBook→"/", host→canHost→"/host" (D-05, /host built later)
- [Phase 01]: [01-03]: Logged-out forms pattern — client component RHF + zodResolver(sharedSchema) for UX, SAME schema re-validates in the server action / Better Auth re-checks server-side; forgot-password is enumeration-safe (uniform message), login error is generic
- [Phase 01]: [01-03]: Patched a BROKEN transitive dep (@better-auth/kysely-adapter vs kysely@0.29 missing exports) that 500'd every route + broke next build — scripts/patch-kysely-adapter.mjs (postinstall), patches dead sqlite-dialect code only. Also: src/middleware.ts kept despite Next 16 'proxy' deprecation (works as required)
- [Phase 01]: [01-04]: Public/private profile split enforced by an ALLOW-LIST projection (src/lib/profile.ts publicProfile → only avatarUrl/firstName/bio/city/createdAt) so a new private column can never silently leak (D-09/D-10); member-since rendered locale-aware (Pitfall 5)
- [Phase 01]: [01-04]: Activate-later capability (activateHosting/activateBooking) flips canHost/canBook via a privileged db.update after a session check — same input:false mechanism as signup; both capabilities COEXIST (neither clears the other, D-03). No payments here (Phase 2, D-05)
- [Phase 01]: [01-04]: Logged-in surfaces gate per-page in the route-group LAYOUT via auth.api.getSession() — (app) booker shell + (host) dashboard; (host) layout is the REAL canHost gate (redirect !canHost→/), middleware stays optimistic-only. /host seam from Plan 03 now filled
- [Phase 01]: [01-04]: Avatar upload re-validates image/* + ≤5MB with a Zod File schema in the server action before the server-only Cloudinary call; stores avatarUrl + avatarPublicId. Real Cloudinary upload is a manual check once CLOUDINARY_* env vars are set (proven via mock)
- [Phase 03]: [03-01]: The `booking_no_overlap` GiST EXCLUDE constraint (`listing_id =`, `unit =`, `tstzrange('[)') &&`) WHERE status IN ('pending','confirmed') is the ONLY double-booking authority (D-21/D-28) — hand-authored in drizzle/0005 (Drizzle can't express EXCLUDE), btree_gist installed, applied to live DB. Half-open `'[)'` + positive occupying-status list reused identically downstream (read model, unit-assignment SELECT).
- [Phase 03]: [03-01]: ⚠️ FINDING for Phase 4 — a GENUINE two-connection concurrent overlapping insert surfaces **40P01 (deadlock_detected)** as well as **23P01 (exclusion_violation)**; both are DB-atomic rejections that prevent the double-book (exactly one row survives). `createBooking` error-mapping / retry loop MUST treat 40P01 like 23P01 ("slot just taken — retry"), not a 500. SC#4 race test accepts either code; sequential cases assert 23P01 exactly.
- [Phase 03]: [03-01]: `makeRacingClients(schema, n)` added to tests/helpers/db.ts (independent connections — the existing `makeClient` is max:1 and serializes, proving nothing for a race); `src/lib/pg.ts` `isPgError(e, code)` for SQLSTATE detection. Bare integer `unit` (1..unitCount), named units deferred (constraint forward-compatible). `booking.bookerId` onDelete:restrict (A5).

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

Open product decisions to resolve before their relevant phase begins (from research):

- ✅ RESOLVED (Phase 3, D-22): Slot granularity = 60-min on-the-hour, platform-wide for v1; any run of consecutive hours or a full day (D-23). Per-listing granularity deferred.
- Phase 6: Request-to-book expiry SLA (must be shorter than PayMongo's ~7-day CARD authorization-hold limit; note QRPh/GCash/Maya have NO auth-hold — capture-now → refund-on-decline, and card manual-capture is a gated advanced feature requiring PayMongo enablement).
- Phase 7: Cancellation/refund policy matrix (who × time-to-start × % refunded × commission × payout) — blocks the cancel flow. Note PayMongo QRPh/e-wallet refund rule: same-day = full-refund-only; partial only from the next day.
- Phase 8: Whether invited attendees need an account to RSVP (v1 default: tokenized link, no account); group capacity source (listing capacity vs per-booking limit).
- Phase 2 / Phase 5: Cold-start liquidity — consider lightweight admin/seed tooling and a zero-result-search metric; do not over-build.
- ✅ RESOLVED (Phase 2): WR-06 (rate-limit + audit on capability-activate/onboarding actions) CLOSED in Plan 02. WR-04 (email-send retry/observability) STILL OPEN — deferred to the Phase-7 transactional-email layer.
- ✅ RESOLVED (2026-07-10): 02-VALIDATION.md regenerated for PayMongo (tests/paymongo/*, merchant.activated, Paymongo-Signature) and marked Nyquist-compliant; the flaky public-listing E2E seed was fixed. 02-RESEARCH/02-PATTERNS remain Stripe-era historical (non-blocking).
- Phase 2 → later (PayMongo real onboarding): PayMongo Platforms / Linked Accounts is beta + sales-gated, and card manual-capture needs "advanced card features" enablement — both are PayMongo support requests with lead time; request early (blocks 02-UAT test 11 + real payout UAT).
- Follow-up (out-of-scope, task chip spawned 2026-07-10): Radix Tooltip SSR hydration mismatch at src/app/listings/[id]/page.tsx:267 (the "Not bookable yet" affordance) — client-recovered, not a 500; worth a cleanup. Also low-pri from 02-UAT: currency defaults to `usd` (should be PHP for the PH launch); no landing page at `/` (deferred to Phase 4).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260709-id2 | Swap payments provider Stripe → PayMongo in planning docs | 2026-07-09 | 1eebe11 | [260709-id2-swap-payments-provider-stripe-to-paymong](./quick/260709-id2-swap-payments-provider-stripe-to-paymong/) |
| 260710-lgo | Fix T-04-SIGMATCH: allow-list Cloudinary sign params | 2026-07-10 | d1fb76b | [260710-lgo-fix-t-04-sigmatch-allow-list-cloudinary-](./quick/260710-lgo-fix-t-04-sigmatch-allow-list-cloudinary-/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-11T04:24:53Z
Stopped at: **Phase 3 Wave 1 COMPLETE (03-01 executed)** — the double-booking keystone is live. Committed on `dev`: `5ee56b9` (chore: deps + makeRacingClients + isPgError), `99a9fd8` (feat: availability tables + 0004 generated + 0005 hand-authored GiST EXCLUDE, applied to live DB), `c7b6994` (test: SC#4 two-connection exclusion-race). `booking_no_overlap` confirmed in the live DB `pg_constraint`; btree_gist installed. SC#4 test GREEN (genuine race + multi-unit + back-to-back '[)' + partial-WHERE freeing), non-flaky across 3 runs; harness replays 0004+0005 cleanly; tsc clean; tests/availability + tests/listing = 54 passing. **KEY FINDING:** a genuine two-connection race yields **40P01 (deadlock)** OR **23P01 (exclusion_violation)** — both DB-atomically prevent the double-book; Phase-4 `createBooking` error-mapping/retry MUST handle 40P01 like 23P01. AVAIL-01/02/03 are foundation-only here (host actions/UI in 03-03/03-04, calendar in 03-05) — REQUIREMENTS.md flipped at the Phase-3 transition per repo convention. Next: /gsd-execute-phase 3 → Wave 2 (03-02 server correctness + 03-03 host backend, parallel).
Resume file: .planning/phases/03-availability-the-double-booking-guarantee/03-02-PLAN.md. Next: /gsd-execute-phase 3 (Wave 2).
