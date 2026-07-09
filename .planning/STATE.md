---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planned
stopped_at: Phase 2 re-planned for PayMongo — 02-06 rewritten (Linked Accounts onboarding + merchant.activated gate), 02-01 payout schema/test-anchors retargeted, 02-CONTEXT reworded (D-17/D-19 superseded by D-20); plan-check PASSED (0 blockers) + 4 tightenings applied. Residual: 02-VALIDATION.md still cites tests/stripe/*. Next: fix 02-VALIDATION (optional), then /gsd-execute-phase 2.
last_updated: "2026-07-09T06:15:00.000Z"
last_activity: 2026-07-09
progress:
  total_phases: 8
  completed_phases: 1
  total_plans: 10
  completed_plans: 4
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Find & book a space — search → real availability → reserve a time slot → pay, with confidence the booking is real.
**Current focus:** Phase 02 — listings-&-host-onboarding (Phase 01 complete)

## Current Position

Phase: 2 (Listings & Host Onboarding) — PLANNED, ready to execute
Plan: 6 plans in 3 waves (W1: 01 data-model+PostGIS, 02 deps/tokens/WR-06 · W2: 03 wizard, 05 public-page · W3: 04 photos, 06 PayMongo gate)
Status: Phase 02 PLANNED — research (HIGH confidence), pattern map, Nyquist VALIDATION, and 6 PLAN.md files created; plan-checker PASSED (0 blockers, 4 minor warnings; LIST-01..06 + PAY-04 fully covered). Geocoding/maps = Photon/LocationIQ + react-leaflet (OSM) + PostGIS this phase (D-18). WR-06 (rate-limit + audit on capability-activate) sequenced in Wave 1 (Plan 02) before payouts wire to canHost in Wave 3 (Plan 06). **PAYMENTS SWITCHED Stripe → PayMongo (D-20, supersedes D-17/D-19)** for the PH launch (validated by a live sandbox spike): CLAUDE.md + PROJECT.md + 02-02 updated via quick 260709-id2. 02-06 re-planned (86c7b20 + fixes a8614bc — PayMongo Linked Accounts onboarding + Paymongo-Signature-verified idempotent merchant.activated gate), 02-01 payout schema/test-anchors retargeted (29620bc), 02-CONTEXT reworded + D-17/D-19 superseded (ecdc322). Plan-check PASSED (0 blockers; 4 tightenings applied: session/email resolution, timingSafeEqual length-guard, create-once row lock, onboarding test anchor). deriveBookable + truth-table test untouched. RESIDUAL: 02-VALIDATION.md still references tests/stripe/* + account.updated (active mismatch — regen pending); 02-RESEARCH/02-PATTERNS stay Stripe-era historical (non-blocking). Next: /gsd-execute-phase 2 (optionally fix 02-VALIDATION first).
Last activity: 2026-07-09

Progress: [████░░░░░░] 40%

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

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

Open product decisions to resolve before their relevant phase begins (from research):

- Phase 3: Slot granularity (30- vs 60-min minimum booking unit).
- Phase 6: Request-to-book expiry SLA (must be shorter than PayMongo's ~7-day CARD authorization-hold limit; note QRPh/GCash/Maya have NO auth-hold — capture-now → refund-on-decline, and card manual-capture is a gated advanced feature requiring PayMongo enablement).
- Phase 7: Cancellation/refund policy matrix (who × time-to-start × % refunded × commission × payout) — blocks the cancel flow. Note PayMongo QRPh/e-wallet refund rule: same-day = full-refund-only; partial only from the next day.
- Phase 8: Whether invited attendees need an account to RSVP (v1 default: tokenized link, no account); group capacity source (listing capacity vs per-booking limit).
- Phase 2 / Phase 5: Cold-start liquidity — consider lightweight admin/seed tooling and a zero-result-search metric; do not over-build.
- Before Phase 2 wires PayMongo payouts to canHost: close deferred Phase-1 security items WR-06 (add rate-limit + audit trail on capability-activate server actions) and WR-04 (email-send retry/observability). Tracked in 01-REVIEW.md (deferred) + 01-SECURITY.md audit notes.
- Phase 2 (02-06): PayMongo Platforms / Linked Accounts is beta + sales-gated, and card manual-capture needs "advanced card features" enablement — both are PayMongo support requests with lead time; request early.
- Phase 2 (02-VALIDATION): after the PayMongo re-plan, 02-VALIDATION.md still maps to tests/stripe/webhook-*.test.ts + account.updated/constructEvent/stripe-listen — an ACTIVE cross-ref mismatch with the re-planned 02-01/02-06 (tests/paymongo/*, merchant.activated, Paymongo-Signature). Regenerate/patch before relying on it as the phase validation gate. 02-RESEARCH/02-PATTERNS are Stripe-era historical (non-blocking).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260709-id2 | Swap payments provider Stripe → PayMongo in planning docs | 2026-07-09 | 1eebe11 | [260709-id2-swap-payments-provider-stripe-to-paymong](./quick/260709-id2-swap-payments-provider-stripe-to-paymong/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-09T06:15:00.000Z
Stopped at: Phase 2 fully re-planned for PayMongo. 02-06 rewritten (86c7b20) + plan-check fixes (a8614bc); 02-01 payout schema/test-anchors retargeted (29620bc); 02-CONTEXT reworded + D-17/D-19 superseded by D-20 (ecdc322). Plan-check PASSED 0 blockers. deriveBookable + truth-table test untouched. OPEN for user review: whether to fix 02-VALIDATION.md (still cites tests/stripe/* — active mismatch) before executing. Real-world lead-time action: request PayMongo Platforms/Linked-Accounts beta + advanced-card-features (manual capture) from PayMongo support. Next: /gsd-execute-phase 2 (02-01..05 payment-agnostic; 02-06 execution gated on PayMongo beta access).
Resume file: .planning/phases/02-listings-host-onboarding/ (optionally fix 02-VALIDATION, then /gsd-execute-phase 2)
