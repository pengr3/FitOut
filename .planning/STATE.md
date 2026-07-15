---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: "Completed 04-03-PLAN.md — searchListings two-stage search (src/lib/search/query.ts): Stage-1 SQL candidate query (inlined deriveBookable gate + ::geography radius on BOTH operands + D-35 category via primary_space_type::text OR tag EXISTS + price + tz-independent weekday) → Stage-2 getAvailability free-window filter (SAME read model as the listing calendar, D-34; date-only/date+time, venue-tz per candidate). tests/search 16/16, tsc + eslint clean. Commits 8ca1fc2 (Stage-1) + 16f19a4 (Stage-2). SEARCH-01..05 stay Pending (user-facing completion at 04-05 UI). Next: 04-04 (createPendingHold WR-03 tx) or 04-05 (search UI)."
last_updated: "2026-07-15T04:22:58.273Z"
last_activity: 2026-07-15
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 23
  completed_plans: 19
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Find & book a space — search → real availability → reserve a time slot → pay, with confidence the booking is real.
**Current focus:** Phase 04 — booking-core-search-no-payment

## Current Position

Phase: 04 (booking-core-search-no-payment) — EXECUTING
Plan: 4 of 8
Status: Ready to execute
Last activity: 2026-07-15

Progress: [████████░░] 83%

## Performance Metrics

**Velocity:**

- Total plans completed: 9
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
| Phase 03 P03-02 | 12 min | 3 tasks | 7 files |
| Phase 03 P03-03 | 6 min | 2 tasks | 5 files |
| Phase 04 P04-01 | 15 min | 3 tasks | 8 files |
| Phase 04 P04-02 | 23 min | 2 tasks | 6 files |
| Phase 04 P04-03 | 14 min | 2 tasks | 5 files |

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
- [Phase 03]: [03-02]: ⚠️ `@date-fns/tz` `TZDate.toISOString()` renders the OFFSET-LOCAL form (e.g. `…+08:00`), NOT UTC `Z` — take the true UTC instant from the epoch: `new Date(tzDate.getTime()).toISOString()`. Applied to all slot/day-window instants (slots.ts, read-model.ts).
- [Phase 03]: [03-02]: ⚠️ postgres.js throws `ERR_INVALID_ARG_TYPE` when a JS `Date` is bound into a raw drizzle `sql` range template via `db.execute` — bind ISO strings there (postgres.js casts string→timestamptz); keep `Date` only for the drizzle timestamptz INSERT. Reused by read-model.ts + units.ts; Phase 4 must follow this convention.
- [Phase 03]: [03-02]: `getAvailability(db, listingId, dayLocal, now)` is the single server-authoritative read model (AVAIL-03) — SQL fetches raw overlapping rows with the identical `tstzrange('[)')` bound as the constraint; TS composes per-slot free-unit counts (whole-listing block ⇒ 0 free; only pending/confirmed occupy). `createBooking` = find-free-unit + retry-on-23P01/40P01 bounded by unitCount (constraint is the sole authority); `mapBookingError` → clean "That time was just taken." (23P01/40P01/NoUnitAvailableError), unknown errors re-throw. Widened `DbConn = PostgresJsDatabase<Record<string, unknown>>` so prod + test db both type-check.
- [Phase 03]: [03-03]: Shared availability Zod (`src/lib/validation/availability.ts`) — `weeklyHoursSchema` (close>open, no same-day overlap '[)' touching-endpoints OK, on-the-hour) + `blockSchema` (whole-day/partial, unit>=1 or null=whole-listing). The SAME schema validates in the Plan-04 RHF editor and re-validates in the server actions (never trust the client). The BLOCKER seam for 03-04 is CLOSED: the time regex is `:ss`-tolerant and the on-the-hour refine runs on the normalized `HH:mm` prefix (`t.slice(0,5).endsWith(':00')`), so a DB-read `06:00:00` re-validates on an edit re-save while `06:15:00` still rejects — proven purely AND end-to-end through `saveOperatingHours`.
- [Phase 03]: [03-03]: Host availability write path: `saveOperatingHours` (replace-the-set full-state upsert, D-25 multiple windows/day), `addBlock`/`removeBlock` (close-only, D-24 — no positive-override path). Every write clones the listing.ts contract: `requireUserId` → `assertOwnership(listingId, userId)` (IDOR — the (host) route group alone is NOT the gate, T-03-IDOR-HOURS) → `safeParse` → tx re-scoped to the owner → `revalidatePath(host + public)`. `removeBlock` DELETE scoped `(blockId AND listingId)` behind ownership so a non-owner cannot unblock (T-03-BLOCK-UNBLOCK). Block times stored as timestamptz UTC via TZDate from the venue tz (Manila +8: 10:00→02:00Z; whole day 00:00→prior-day 16:00Z), normalized through the epoch to a Date for the drizzle insert. tests/availability = 7 files/62 tests green; full suite 36/200.
- [Phase 04]: [04-01]: booking gains expiresAt/quotedTotalCents/currency(php)/idempotencyKey + booking_idem_uq partial-unique (WHERE idempotency_key IS NOT NULL), applied to LIVE DB via 0006; 4 nullable cols backfill-safe (no existing bookings, A7). Reuse cancelled status for abandoned holds (D-49/A3), no expired enum.
- [Phase 04]: [04-01]: read-model occupancy is now lazy-expiry: (status = confirmed OR (status = pending AND expires_at > now())) via SQL now() (DB clock, NOT the injectable now:Date — Pitfall 7); the [) bound + listing scope stay identical to the 0005 EXCLUDE. Stale pending reads FREE everywhere (calendar + search Stage-2 downstream).
- [Phase 04]: [04-01]: 0007 hand-authors listing_location_geog_gist GiST on (location::geography) with IF NOT EXISTS (harness replay) — the 0002 geometry index does not serve the ::geography radius cast. Hand-authored migrations use drizzle generate --custom (empty SQL + copied snapshot + journal entry).
- [Phase 04]: [04-02]: `searchParamsSchema`/`bookingCreateSchema` (src/lib/validation/booking.ts) are the V5 input-validation control — shared client+server, SHAPE-ONLY (invariants re-derived server-side). Single combined `category` = `z.union([z.enum(spaceTypeValues), z.enum(activityTagValues)])` from @/lib/listing-vocab (the two vocabs are DISJOINT, D-35) so an activity-tag-only value like `basketball` validates like a space-type — do NOT split into type/activity. `z.coerce.number().min().max()/.int()` rejects NaN naturally (every NaN comparison is false), so a tampered `NaN`/"abc" FAILS safeParse without throwing (T-04-ORIGIN/PRICEIN); lat/lng must be present TOGETHER (a lone coord can't form an origin). radius restricted to preset {2,5,10,25} default 10 (rejects, not clamps). Search SQL must cast enum `::text` when comparing a cross-vocab category (Pitfall — activity value is not a valid space_type label).
- [Phase 04]: [04-02]: `DISPLAY_CURRENCY = "php"` promoted to src/lib/money.ts (D-46) as the single shared price source; the listing page keeps its LOCAL copy until Plan 07 swaps the import (do NOT edit page.tsx before then).
- [Phase 04]: [04-02]: D-38 seed = scripts/seed.ts (standalone raw-postgres.js, NO `@/` imports so it runs under tsx; idempotent delete-first on `seed_%` in FK-safe order; 5 bookable Metro Manila listings, ST_MakePoint x=lng/y=lat) mirrored by tests/helpers/seed.ts (Drizzle `seedSearchListings(db)` for isolated schemas + `SEARCH_ORIGIN` Makati 14.5547,121.0244 + `DISTANCES_KM` DERIVED via haversine so they never drift). seed_listing_4 = gym tagged `basketball` (DISJOINT type/tag, D-35 supply); seed_listing_5 ≈15.3km (BEYOND 10km → radius/zero-result path). tsx already in node_modules (no install, T-04-SC). `npm run db:seed` added.
- [Phase 04]: [04-02]: SEARCH-01..04 + BOOK-01 NOT marked complete — they are CROSS-CUTTING (appear in plans 04-02..04-08); 04-02 ships only the validation/currency/seed substrate. Completion stays with the plans that ship the search query/UI (04-03/05) + price breakdown (04-04/06/07); validated at phase transition. ⚠️ gsd-sdk string-arg query handlers (record-metric/add-decision/record-session stopped_at) silently no-op'd in v1.42.3 — metric row + decisions + stopped_at were hand-written; advance-plan/update-progress/roadmap.update-plan-progress worked.
- [Phase 04]: [04-03]: `searchListings` (src/lib/search/query.ts) is the two-stage search spine (D-34): Stage-1 = ONE Drizzle `sql` candidate query (inlined deriveBookable gate w/ Pitfall-5 sync comment + `::geography` `ST_DWithin`/`ST_Distance` on BOTH operands + `ST_MakePoint(lng,lat)` + D-35 category `primary_space_type::text` OR `listing_activity_tag` EXISTS + price + tz-independent weekday `EXTRACT(DOW)` EXISTS), ordered distance/price with a `created_at DESC` tiebreaker + `LIMIT+1` probe; Stage-2 = per-candidate `getAvailability` reuse (the SAME read model as the listing calendar — NO second SQL occupancy predicate). `::geography` proven by the beyond-10km outlier-exclusion test (the degrees-vs-meters guard). tests/search 16/16; tsc + eslint clean.
- [Phase 04]: [04-03]: Stage-2 window = venue-local wall-clock `HH:mm` resolved PER-CANDIDATE via TZDate (not absolute UTC), so the same picked local window lands per-venue (venue-tz honored). date-only ⇒ any slot `state==='available'`; date+time ⇒ EVERY on-the-hour slot in `[start,end)` is `'available'` (subsumes freeUnits≥1 + future + in-horizon). Injectable `now?:Date` 3rd param (mirrors getAvailability) for deterministic slot state. Strict `parsePickedDate` binds the CANONICAL iso into `::date` (never the raw string) + round-trip guard; `parseWindowHour` never reaches SQL — malformed input degrades to date-only, never a mid-query 22007. Over-fetch `pageSize*2+1` when a date is picked (Stage-2 can drop candidates, Pitfall 8/A5). SEARCH-01..05 NOT marked complete — query spine here; user-facing wiring + SEARCH-05 cards at 04-05.

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
| 260713-nz3 | Range-fill slot selection in booker SlotPicker (03-05 UX) | 2026-07-13 | 83708f0 | [260713-nz3-range-fill-slot-selection-in-booker-slot](./quick/260713-nz3-range-fill-slot-selection-in-booker-slot/) |
| 260714-feq | Apply Phase-3 code-review findings (post-phase hardening) | 2026-07-14 | 8667ecb | [260714-feq-apply-phase-3-code-review-findings-post-](./quick/260714-feq-apply-phase-3-code-review-findings-post-/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-15T04:19Z
Stopped at: Completed 04-03-PLAN.md — searchListings two-stage search (Stage-1 SQL candidate + Stage-2 getAvailability free-window filter, D-34). ::geography on BOTH radius operands (Pitfall 1, proven by the beyond-10km outlier-exclusion test); D-35 category via primary_space_type::text OR tag EXISTS (activity-tag-only: no no-op, no enum error); Stage-2 reuses getAvailability so search & the listing calendar cannot diverge; venue-tz per candidate. tests/search 16/16, tsc + eslint clean. Commits 8ca1fc2 (Stage-1) + 16f19a4 (Stage-2). SEARCH-01..05 stay Pending (query spine here; user-facing at 04-05). ⚠️ gsd-sdk v1.42.3 string-arg handlers (record-metric/add-decision/record-session) still no-op — metric row + decisions + stopped_at hand-written; advance-plan/update-progress/roadmap worked. Next: 04-04 (WR-03 pending-hold tx) or 04-05 (search UI).

Prior session: 2026-07-14T07:51:45.085Z
Advisory follow-ups from 03-REVIEW.md — RESOLVED in quick task 260714-feq (commits 7ab4532/a527d50/c875d72/8667ecb): WR-01 (getDayAvailability now Zod-validates dayLocal via safeParse→empty + gates on published/non-deleted — no 500, no draft leak), WR-02 (addBlock rejects unit>unitCount; read-model clamps unit∈[1,unitCount]), WR-04 (single `<Toaster/>` on the host page), IN-01 (slotSelectionSchema marked Phase-4 scaffolding), IN-02 (formatMoney extracted to src/lib/money.ts), IN-03 (handleDaySelect catch → inline role=alert), IN-05 (E2E day locator robust to showOutsideDays), IN-06 (dropped unused timezone prop). Verified: tsc + eslint clean, vitest tests/availability 82/82, Playwright availability E2E 4/4. STILL OPEN by design: WR-03 deferred to Phase 4 (auto-commit contract now documented in units.ts createBooking; the savepoint-for-23P01 + outer-retry-for-40P01 transactional design is Phase-4 work) and IN-04 skipped (test-only local-dev creds). Also set workflow.use_worktrees=false — a fresh worktree lacks gitignored node_modules so tsc/eslint/vitest/playwright can't run; this recurring blocking anti-pattern is now structurally prevented.
Resume file: None
