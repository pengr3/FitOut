---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: "Completed 04-04-PLAN.md — createPendingHold WR-03 pending-hold keystone (src/lib/availability/units.ts): a REAL db.transaction — OUTER for-retry on 40P01 wrapping db.transaction + per-unit nested tx.transaction SAVEPOINT for 23P01 (never 25P02) + in-tx stale-hold sweep (expires_at<=now(), D-48b) before the find-free probe + own-hold pre-check/23505 backstop/23P01 own-duplicate re-check idempotency (D-42). quoteWindow (pricing.ts) freezes hours×hourly|flat dayRate PHP (D-45, $0 guard); makeBookingReference (reference.ts) = FIT-+8 Crockford base32 crypto-random. Rule-1 fix: isPgError now walks the drizzle DrizzleQueryError .cause chain (SQLSTATE was on .cause → conflicts slipped every catch → raw 500; createPendingHold is the first drizzle caller to catch a wrapped conflict). D-42 finding: booking_no_overlap (0005) has a lower OID than booking_idem_uq (0006) so a same-key same-window race fires 23P01 before 23505 → the 23P01 own-hold re-check is load-bearing for unitCount=1 double-clicks. tests/booking 18/18 (pricing/pending-hold/hold-expiry), full suite 276/276, tsc+eslint clean. Commits 9294f2c+0aa8439 (T1 pricing/ref), 201ff4d+bd9cf2b+36a593c (T2 hold+isPgError fix), e818454 (T3 lazy/sweep). createBooking+mapBookingError unchanged. BOOK-01/03 stay Pending (backend keystone here; user-facing at 04-06), BOOK-02 already Complete. ⚠️ gsd-sdk v1.42.3 string-arg handlers still no-op — metric/decisions/stopped_at hand-written; advance-plan/update-progress/roadmap worked. Next: 04-05 (search home UI) or 04-06 (placeHold/confirmBooking + reserve components — calls createPendingHold)."
last_updated: "2026-07-15T04:55:34.840Z"
last_activity: 2026-07-15
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 23
  completed_plans: 20
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Find & book a space — search → real availability → reserve a time slot → pay, with confidence the booking is real.
**Current focus:** Phase 04 — booking-core-search-no-payment

## Current Position

Phase: 04 (booking-core-search-no-payment) — EXECUTING
Plan: 5 of 8
Status: Ready to execute
Last activity: 2026-07-15

Progress: [█████████░] 87%

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
| Phase 04 P04-04 | 20 min | 3 tasks | 7 files |

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
- [Phase 04]: [04-04]: `createPendingHold` (src/lib/availability/units.ts) is the WR-03 pending-hold keystone — a REAL `db.transaction`: OUTER `for` retry on `40P01` (postgres.js `begin()` never auto-retries) wrapping `db.transaction`; per-unit nested `tx.transaction` = **SAVEPOINT** so a `23P01` rolls back ONLY that attempt (never `25P02`) and the loop tries the next free unit; in-tx **sweep** (`UPDATE booking SET status='cancelled' WHERE status='pending' AND expires_at<=now() AND range &&`) before the find-free probe (D-48b, so the EXCLUDE sees the freed slot); own-hold pre-check (idempotency primary, D-42) + `23505` backstop. Correctness rests on the `booking_no_overlap` EXCLUDE — the probe is advisory. `createBooking`+`mapBookingError` kept unchanged; bind `db` not the auto-commit conn.
- [Phase 04]: [04-04]: ⚠️ D-42 ordering finding for downstream — `booking_no_overlap` (0005) has a LOWER OID than `booking_idem_uq` (0006), so a concurrent same-key SAME-WINDOW race trips the EXCLUDE (`23P01`) BEFORE the unique index (`23505`). The RESEARCH draft's `23505`-only idempotency branch would false-"just taken" a `unitCount=1` double-click. Fix: on `23P01`, re-run the own-hold pre-check (`findOwnActiveHold` matches idempotency_key OR booker+exact-window among active holds) → replay if it's your own committed duplicate, else next unit. Only genuine someone-else conflict/exhaustion maps to "just taken".
- [Phase 04]: [04-04]: ⚠️ Rule-1 fix in `src/lib/pg.ts` — Drizzle 0.45.2 wraps driver errors in `DrizzleQueryError` ("Failed query:…") with the postgres.js error (and its SQLSTATE `.code`) on `.cause`. `isPgError` only checked the top level, so a `23P01`/`40P01`/`23505` from a drizzle query slipped every catch → raw 500. Now walks the `.cause` chain (bounded). Latent because `createBooking`'s own `23P01` branch was never exercised through drizzle (its probe avoids the conflict); `createPendingHold` is the first drizzle caller to actually catch a wrapped conflict. Raw-error callers (exclusion-race, error-map) unaffected — top level checked first. Any future drizzle-query error-code catch MUST rely on this cause-walking `isPgError`.
- [Phase 04]: [04-04]: `quoteWindow` (src/lib/booking/pricing.ts) = server-frozen quote: re-derives `hours` from the window (epoch delta of the absolute UTC on-the-hour instants — DST-safe because slots.ts already resolved them; NOT wall-clock arithmetic) × the listing rate; `fullDay?dayRate:hourly*hours` (D-45 distinct, NO cap); currency `php` (D-46). Throws rather than freeze a $0 quote when the required rate is null (money guard). `createPendingHold` loads unitCount+rates INSIDE the tx and freezes `quotedTotalCents` (Phase-5 charges this). `HOLD_TTL_MINUTES=15` (D-47) drives the countdown. `makeBookingReference` (reference.ts) = `FIT-`+8 Crockford base32 (no I/L/O/U) from `randomBytes`, uniform (256%32==0), non-sequential — generated on-read (no `reference` column this plan). BOOK-01/03 stay Pending (backend here; user-facing at 04-06); BOOK-02 already Complete. ⚠️ gsd-sdk v1.42.3 string-arg handlers (record-metric/add-decision/record-session) still no-op — metric row + decisions + stopped_at hand-written; advance-plan/update-progress/roadmap worked.

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

Last session: 2026-07-15T04:53Z
Stopped at: Completed 04-04-PLAN.md — createPendingHold WR-03 pending-hold keystone (the long-deferred WR-03 contract, now RESOLVED). A REAL db.transaction: OUTER for-retry on 40P01 wrapping db.transaction + per-unit nested tx.transaction SAVEPOINT for 23P01 (never 25P02) + in-tx stale-hold sweep (expires_at<=now(), D-48b) before the find-free probe + own-hold pre-check/23505 backstop/23P01 own-duplicate re-check idempotency (D-42). quoteWindow (pricing.ts) freezes hours×hourly|flat dayRate PHP (D-45, $0 guard); makeBookingReference (reference.ts) = FIT-+8 Crockford base32 crypto-random (on-read; no reference column). Rule-1 fix: isPgError walks the drizzle DrizzleQueryError .cause chain (SQLSTATE lived on .cause → conflicts slipped every catch → raw 500). D-42 finding: booking_no_overlap (0005) < booking_idem_uq (0006) OID so a same-key same-window race fires 23P01 before 23505 → the 23P01 own-hold re-check is load-bearing for unitCount=1 double-clicks. tests/booking 18/18, full suite 276/276, tsc+eslint clean. Commits 9294f2c+0aa8439 (T1), 201ff4d+bd9cf2b+36a593c (T2), e818454 (T3). createBooking+mapBookingError unchanged. BOOK-01/03 Pending (backend here; user-facing 04-06), BOOK-02 already Complete. Next: 04-05 (search home UI) or 04-06 (placeHold/confirmBooking + reserve components — calls createPendingHold).

Prior session: 2026-07-15T04:19Z
Completed 04-03-PLAN.md — searchListings two-stage search (Stage-1 SQL candidate + Stage-2 getAvailability free-window filter, D-34). ::geography on BOTH radius operands (Pitfall 1, proven by the beyond-10km outlier-exclusion test); Stage-2 reuses getAvailability so search & the listing calendar cannot diverge; venue-tz per candidate. tests/search 16/16, tsc + eslint clean. Commits 8ca1fc2 + 16f19a4. SEARCH-01..05 stay Pending (query spine here; user-facing at 04-05). NOTE (still true at 04-04): gsd-sdk v1.42.3 string-arg handlers (record-metric/add-decision/record-session) no-op — metric/decisions/stopped_at hand-written; advance-plan/update-progress/roadmap worked. workflow.use_worktrees=false (a fresh worktree lacks gitignored node_modules → tooling can't run).
Resume file: None
