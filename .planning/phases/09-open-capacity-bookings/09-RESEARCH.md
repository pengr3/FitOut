# Phase 9: Open-Capacity Bookings - Research

**Researched:** 2026-07-30
**Domain:** Concurrency-correct capacity-counter availability (DB-atomic no-overbook) layered onto the existing single-payer PayMongo booking rail
**Confidence:** HIGH (all findings verified against the live codebase; the one genuine judgment call — the OC-05 mechanism — is flagged in the Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Occupancy mode & slot model**
- **OC-01:** Add `open_capacity` to the existing `occupancy_mode` pgEnum via the 55P04 two-migration split (ALTER TYPE … ADD VALUE isolated in its own migration; first use later).
- **OC-02:** Slot model = "Date = one pass." Booker picks a DATE only; one flat per-head charge; entry valid anytime during operating hours that day. **No time-window picker. Duration NEVER scales price.**
- **OC-03:** A drop-in booking still persists concrete `starts_at`/`ends_at` (both NOT NULL) = start/end of the host's operating hours on the booked date (venue-local → UTC). Load-bearing: makes the Phase-7 refund ladder, payout sweep, reminders, and expiry apply unchanged.

**Capacity & concurrency (the hard core — OPEN-03/SC#3)**
- **OC-04:** Cap = total admissions per (listing, date), counted in **sum-of-heads** (not count-of-bookings). Leading approach: reuse `listing.maxOccupancy`. **RESEARCH must confirm** reuse vs a dedicated column.
- **OC-05:** No-overbook must be **DB-atomic and proven under a genuine two-connection concurrent race** (Phase-3 SC#4 analog). **The exact mechanism is a RESEARCH call** (units-as-spots vs a per-(listing,date) counter guarded by SERIALIZABLE / advisory lock). D-112 flagged Phase-8's `SELECT … FOR UPDATE` as "too coarse" for this contention. **NEVER an app-level count-then-insert.**

**Heads per booking**
- **OC-06:** Multiple heads, one payment. Booker sets N, pays per-head × N in one checkout, claims N atomically. Reuses PaxStepper + `declaredPax`.
- **OC-07:** Offer-the-partial at the cap boundary. Grant `min(requested, remaining)`, report the granted count; booker confirms the reduced headcount + price BEFORE the charge. Refuse outright only at 0 remaining. Pure all-or-nothing is the recorded fallback.

**Pricing**
- **OC-08:** Host sets ONE flat per-head price + a daily capacity cap. Hourly/day-rate fields hidden in the wizard. Price = per-head × confirmed heads.
- **OC-09:** The D-74 service fee still rides on top; the D-107 hold-until-session payout rail is untouched. Per-head price = dedicated column vs reuse Phase-8 `included`/`extraHeadFee` is a **schema/planner call** — open-capacity pricing is **purely linear** (no included base).

**Booking mode**
- **OC-10:** Instant-book only. Request-to-book is disallowed for open-capacity. Wizard hides the instant/request toggle.

**Spots-left / availability UX (OPEN-04)**
- **OC-11:** Exact only when low. "Available" until spots-left drops below a threshold (default ≤5, config-tunable), then urgency ("Only 3 left"). Greyed "Fully booked" at 0.
- **OC-12:** Search card shows "Drop-in · ₱/person" + a Drop-in badge (no number) when no date chosen; scarcity chip only with a date in play. Date filter matches when the date has ≥1 spot left.
- **OC-13:** Checkout race-loss copy: "Just sold out — pick another date." Extends `read-model.ts` + `search/query.ts` to compute `remaining = cap − occupying-heads`.
- **OC-14:** No waitlist in v1 (DISC-02 deferred).

**Cancellation**
- **OC-15:** Booker cancels their own seat → reuse the Phase-7 tier ladder, keyed off hours-to-start where start = OC-03's opening time. Open listings pick a cancellation tier at publish. Cancelling frees the seat → spots-left increments.
- **OC-16:** Host cancel = per-booking (reuse `cancelBookingAsHost`). Bulk "close this date & refund everyone" is DEFERRED.

**Mode switching & host setup**
- **OC-17:** Occupancy mode editable in the listing editor ONLY while the listing has no upcoming/active bookings; once a future booking exists it locks.
- **OC-18:** No separate per-booker head cap in v1 — a booker may grab up to what's remaining; offer-the-partial handles "not enough left."

### Claude's Discretion (Research owns)
- The exact no-overbook mechanism (**OC-05**) — must ship with a genuine concurrent-race test.
- Reuse `maxOccupancy` vs a dedicated capacity column (**OC-04**).
- Per-head price: dedicated column vs reuse `included`/`extraHeadFee` (**OC-09**).
- Exact "spots left" chip styling + the low-threshold value (**OC-11/OC-12**) — **UI phase**, do not design here.
- How the counter's occupying-status set + release integrates with the existing read model and the exclusive-mode predicates (**OC-13/OC-15**).

### Deferred Ideas (OUT OF SCOPE)
- **Model B** — host-set named open blocks/sessions (per-block cap/spots-left/waitlist). Data model should extend into it without a rewrite.
- Bulk "close this date & refund everyone" host action.
- Waitlist / notify-me (DISC-02).
- Optional per-booking head cap (OC-18 alternative).
- Pure all-or-nothing headcount claim (OC-07 fallback).
- Space-type presets (soft-nudge default at most).
- Peak/off-peak or day-of-week per-head pricing.
- **GPAY-01** (organizer open play / cost-split) + **GPAY-02** (per-attendee ticketing) — NOT combined with open-capacity here (D-110).
- Combining open-capacity with Phase-8 group bookings (D-110) — different occupancy mode, not an extension of group-RSVP.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **OPEN-01** | Host can set a listing to open-capacity mode with a per-head price and a capacity cap | Enum `open_capacity` (OC-01, §Migration Sequence); `maxOccupancy` reused as cap (OC-04 decision); dedicated `per_head_price_cents` column (OC-09 decision); `publishSchema` mode-forked validation (§Architecture Pattern 5) |
| **OPEN-02** | Multiple independent bookers each reserve their own spot on the same shared slot, each paying per head via the existing rail | One `booking` row per payment (rail unchanged, OC-09); `declared_pax` = heads (OC-06); confirmBooking + webhook confirm authority untouched (§Money Path) |
| **OPEN-03** | Concurrent bookings hard-capped at capacity with no overbooking — DB-atomic, proven under a race | **The advisory-lock counter (OC-05 recommendation, §Architecture Pattern 1)**; the mandatory two-connection race test (§Validation Architecture) |
| **OPEN-04** | Availability and search show remaining capacity (spots left) | `remaining = cap − SUM(declared_pax over occupying)` read-model fork (OC-13, §Architecture Pattern 4); search Stage-2 "≥1 spot left" (OC-12) |
</phase_requirements>

## Summary

Phase 9 adds a second occupancy mode, `open_capacity`, in which many independent bookers share one bookable unit up to a per-head capacity cap, each paying for their own head(s) on the **existing single-payer PayMongo rail, unchanged**. The only genuinely new correctness surface is a **capacity-counter availability model** that must admit N concurrent bookings on the same `(listing, date)` up to the cap with **zero overbooking under a real two-connection race** — the Phase-3 SC#4 analog for a shared slot.

The decisive architectural fact is that **the "claim" happens at HOLD time, not at pay time.** In the exclusive model, `createPendingHold` inserts a `pending` booking and the GiST `EXCLUDE` claims the slot; the seat is held through the payment window; an abandoned hold frees lazily. Open-capacity must mirror this exactly — the head-claim occurs when the pending hold is minted, the seats are held through payment, and cancellation/expiry return them to the pool. This keeps the money path (confirmBooking → PayMongo hosted checkout → `checkout_session.payment.paid` webhook confirm authority → hold-until-session payout → refund ladder) **completely untouched**: an open-capacity booking is one ordinary `booking` row carrying `declared_pax = granted heads`.

**Primary recommendation:** Implement OC-05 as a **per-`(listing, date)` admissions counter claimed under a Postgres transaction-scoped advisory lock (`pg_advisory_xact_lock`)**, with a **drift-free `SUM(declared_pax)`** over the same occupying-status set the existing read model uses. Keep ONE `booking` row per payment; denormalize a boolean `open_capacity` flag onto `booking` and **narrow the `booking_no_overlap` EXCLUDE predicate to exclusive bookings only** so open-capacity rows are governed by the counter instead of the exclusion constraint. Reuse `listing.maxOccupancy` as the cap (OC-04) and add a dedicated `per_head_price_cents` column (OC-09). The units-as-spots structural alternative is analyzed and rejected below (it forks the single-booking-row money invariant and requires a status-denormalized parallel seat table). **Both mechanism choice and the two schema-reuse calls are load-bearing and flagged in the Assumptions Log for user confirmation.**

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| No-overbook capacity claim | Database (advisory lock + SUM in a transaction) | Server action (orchestrates the tx) | The DB — never app code — is the sole arbiter (CLAUDE.md "no app-level query-then-insert"); the lock+SUM+insert are one atomic critical section |
| Mode-forked booking mutation | API / Backend (server action) | Database | `placeHold` forks on the server-read `occupancy_mode`; exclusive → unit-claim, open → capacity-claim. The route group is never the gate (Security V4) |
| Per-head pricing / quote freeze | API / Backend (pure `pricing.ts`) | — | Price is server-frozen at hold time; the client never supplies a price (CLAUDE.md) |
| Spots-left projection | API / Backend (`read-model.ts`, `search/query.ts`) | — | `remaining = cap − occupying-heads` is server-derived; the client is never trusted for availability (T-03-TAMPER-SLOT) |
| Spots-left chip / urgency UI | Frontend Server (RSC) + Client | — | **UI phase owns styling + threshold** (OC-11/12); this phase supplies only the projection |
| Payment (charge / confirm / payout / refund) | API / Backend + PayMongo | Database | **UNCHANGED** — open-capacity reuses the single-payer rail verbatim (OC-09) |
| Cancellation / refund | API / Backend (`cancel-booking.ts`) | Database | Reuses the Phase-7 ladder via OC-03's real `starts_at`; the seat frees automatically (drift-free SUM) |

## Standard Stack

**No new libraries.** This phase is entirely additive over the existing stack — verified against `package.json` and the live source. The mechanism (Postgres advisory locks) is a native database feature requiring no extension.

### Core (all already installed and in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 18 | `pg_advisory_xact_lock`, `SUM`, `btree_gist` EXCLUDE | [VERIFIED: CLAUDE.md stack + `drizzle/0005`] Advisory locks are native (no extension); `btree_gist` already installed by `0005` |
| Drizzle ORM + drizzle-kit | 0.44+ / 0.31+ | Migrations (generated columns) + `sql` raw for the advisory lock / EXCLUDE / SUM | [VERIFIED: package usage] The EXCLUDE narrow + advisory lock are hand-authored `sql`, exactly as `0005`/`0012` already are |
| postgres (postgres.js) | — | Driver; SQLSTATE on `err.code` for 40P01/23P01/23505 handling | [VERIFIED: `src/lib/pg.ts` `isPgError`] |
| @date-fns/tz (`TZDate`) | ^1.5.0 | Venue-local date → the opening/closing UTC instants for OC-03 | [VERIFIED: `package.json`; used in `read-model.ts`/`slots.ts`] |

### Supporting (reused verbatim)
| Asset | Purpose | Reuse Note |
|-------|---------|------------|
| `createPendingHold` / `mapBookingError` (`units.ts`) | The hold transaction, 40P01 outer-retry, in-tx stale-hold sweep, D-42 idempotency, "just taken" mapping | The open-capacity claim is a **sibling** function in the same file, sharing the sweep + retry + idempotency idioms |
| `quoteWindow` / `paxSurcharge` (`pricing.ts`) | Server-frozen price | Fork: open mode → `perHeadPrice × grantedHeads`, no window/duration term |
| `computeServiceFee` (`service-fee.ts`) | D-74 service fee on top | Unchanged — rides on the frozen per-head total |
| `confirmBooking` + PayMongo webhook (`booking.ts`, `webhook/route.ts`) | Charge + confirm authority | **Unchanged** — keys on `booking.id`, confirms `pending→confirmed` |
| `quoteRefund` / `LADDER` (`cancellation.ts`) | Refund ladder | Unchanged — reads OC-03's real `starts_at` |
| `makeRacingClients` (`tests/helpers/db.ts`) | Genuine multi-connection race harness | The SC#3 acceptance-gate test uses this exactly as `seat-claim-race.test.ts` Layer 2 does |

### Alternatives Considered
| Instead of | Could Use | Tradeoff (why rejected) |
|------------|-----------|-------------------------|
| Advisory-lock counter | Units-as-spots (one row per head + partial-UNIQUE/EXCLUDE) | Structural guarantee, but forks the single-booking-row money invariant (OC-09) and needs a status-denormalized parallel seat table + its own in-tx sweep — see §Architecture Pattern 1 |
| Advisory-lock counter | `SELECT … FOR UPDATE` on a per-(listing,date) capacity row | Requires inventing + lifecycle-managing a physical capacity row; D-112 flagged the per-parent-row lock as "too coarse." The advisory lock gives the same serialization keyed on (listing,date) with no row |
| Advisory-lock counter | `SERIALIZABLE` isolation + 40001 retry | Correct, but a whole-transaction footprint and a second retry class on top of the existing 40P01 loop; the advisory lock is surgical (one critical section) |
| Dedicated `per_head_price_cents` | Reuse `included`/`extraHeadFee` (base + surcharge) | Bending a base+surcharge model to pure-linear pricing requires a fictional `included`/base; open pricing has no included base (OC-09) |

**Installation:** none.

**Version verification:** no packages added; existing versions confirmed in `package.json` (`@date-fns/tz ^1.5.0`, `date-fns ^4.4.0`). Postgres 18 advisory-lock functions (`pg_advisory_xact_lock`) are core SQL, stable since PG 9.1.

## Architecture Patterns

### System Architecture Diagram

```
HOST WIZARD (Phase-2 editor, forked)
  occupancy_mode = open_capacity  ──►  publishSchema (mode fork):
    requires: per_head_price_cents, maxOccupancy(cap)      writes listing:
    hides:    hourly/day rate, instant/request toggle        occupancy_mode='open_capacity'
    OC-17 lock: mode editable only if no upcoming bookings    per_head_price_cents, maxOccupancy

BOOKER  ── picks a DATE (no time window, OC-02) ──►  placeHold(server action)
                                                       │  reads listing.occupancy_mode server-side
                                                       ▼
                              ┌────────────────────────┴─────────────────────────┐
                     occupancy_mode='exclusive'                    occupancy_mode='open_capacity'
                              │                                              │
                     createPendingHold (existing)              createOpenCapacityHold (NEW, sibling in units.ts)
                     GiST EXCLUDE claims the unit               db.transaction:
                                                                  1. pg_advisory_xact_lock(hash(listing_id, dayOpen))
                                                                  2. in-tx sweep expired open pending holds → cancelled
                                                                  3. taken = SUM(declared_pax) WHERE occupying
                                                                  4. remaining = maxOccupancy − taken
                                                                     remaining<=0 → "Just sold out"
                                                                     granted = min(requested, remaining)   (OC-07)
                                                                  5. INSERT booking (pending, open_capacity=true,
                                                                       unit=1, declared_pax=granted,
                                                                       starts_at=dayOpen, ends_at=dayClose,      (OC-03)
                                                                       quoted = perHead×granted + service fee,
                                                                       expires_at=LEAST(now()+TTL, starts_at))
                                                                  6. return {id, granted}
                              └────────────────────────┬─────────────────────────┘
                                                       ▼
   if granted < requested → UI re-prompts (OC-07)  ─►  booker confirms reduced heads BEFORE charge
                                                       ▼
   confirmBooking (UNCHANGED) ─► PayMongo hosted checkout (charge = frozen quoted total)
                                                       ▼
   checkout_session.payment.paid webhook (UNCHANGED confirm authority) ─► booking pending→confirmed
                                                       ▼
   hold-until-session payout (UNCHANGED) ; refund ladder on cancel (UNCHANGED via OC-03 starts_at)

READ MODELS (forked on occupancy_mode)
   getAvailability(open) ─► remaining = cap − SUM(declared_pax over occupying) per DATE   (OC-13)
   searchListings Stage-2(open) ─► keep listing iff date has ≥1 spot left                  (OC-12)
```

### Component Responsibilities

| File | Change | Responsibility |
|------|--------|----------------|
| `src/lib/db/schema.ts` | `occupancyMode` enum += `open_capacity` (:164); `listing.perHeadPriceCents` (new); `booking.openCapacity` boolean (new, default false) | Data model + the EXCLUDE-narrowing flag |
| `drizzle/00XX` (3 migrations) | ADD VALUE (isolated); generated columns; EXCLUDE DROP+re-ADD narrowed by `open_capacity=false` | See §Migration Sequence |
| `src/lib/validation/listing.ts` | `occupancyModeValues` += `open_capacity`; `publishSchema` mode fork | Per-mode publish requirements |
| `src/lib/availability/units.ts` | NEW `createOpenCapacityHold` (sibling to `createPendingHold`) | The advisory-lock capacity claim (OC-05/06/07) |
| `src/lib/booking/pricing.ts` | NEW `quoteOpenCapacity` (or fork `quoteWindow`) | Linear per-head price freeze (OC-08) |
| `src/app/actions/booking.ts` | `placeHold` forks on `occupancy_mode` | Route the claim; instant-only for open (OC-10) |
| `src/lib/availability/read-model.ts` | `getAvailability` forks: open → per-date `remaining` | Spots-left projection (OC-13) |
| `src/lib/search/query.ts` | Stage-2 open branch: "≥1 spot left"; card badge/price | Search availability + Drop-in card (OC-12) |
| `src/app/actions/cancel-booking.ts` | `cancelBookingAsHost` **skips the auto-block** for open-capacity | Host-cancel fork (see Pitfall 5) |

### Pattern 1: The OC-05 no-overbook mechanism — advisory-lock counter (RECOMMENDED)

**What:** Serialize all concurrent claims for one `(listing, date)` behind a Postgres transaction-scoped advisory lock, then compute a drift-free `SUM(declared_pax)` over the occupying-status set under that lock, grant `min(requested, remaining)`, and insert one `pending` booking. The advisory lock auto-releases at commit/rollback.

**When to use:** every open-capacity hold mint. Exclusive listings keep `createPendingHold` untouched.

**Why this over units-as-spots (the honest tradeoff):**

Postgres has no "SUM ≤ N" constraint. A structural constraint counts **rows**, so a structural (units-as-spots) design must explode M heads into M rows in a parallel `admission` table, each with a bounded seat index and a partial-UNIQUE/EXCLUDE. That is genuinely structural (the gold standard the project reveres, and D-21's "reuse units-as-spots" lineage), but it costs:
1. **It forks the single-booking-row money invariant.** OC-09 mandates the single-payer rail unchanged; the webhook, payout sweep, refund, and cancellation all key on `booking.id`. M seat-rows-per-payment either duplicate the payment record or add a parent booking + child seats — new surface the money path must learn.
2. **A constraint cannot join to `listing`.** The partial predicate must live on the seat row, so each seat needs its **own** status/`expires_at` columns kept in sync with the parent booking — a second writer and a drift class, and the EXCLUDE predicate cannot use `now()` (index predicates require IMMUTABLE expressions — the `0012` comment states this explicitly), so lazy expiry needs the same in-tx status-flip sweep duplicated onto the seat table.
3. **The contiguous-seat-range variant fragments.** Representing heads as an `int4range` on one booking row (structural, single-row) fails when free seats exist non-contiguously (cap 5, holds at seats {0,2,4}, a 2-head request sees free {1,3} and falsely rejects). Correctness-of-availability bug.

The advisory-lock counter avoids all three: **one booking row** carrying `declared_pax` (which already exists), reusing the **exact** occupying-status semantics, lazy expiry, and in-tx sweep the exclusive path already ships. The read model and search swap `COUNT(free units)` for `SUM(declared_pax)`; cancellation frees the seat automatically because `remaining` is computed live (a cancelled row is no longer summed — no decrement, no drift). The advisory lock keyed on `(listing_id, dayOpen)` serializes **only** bookers for the same date (D-112's "per-parent lock too coarse" is answered without inventing a capacity row), and the lock window holds only fast local SQL (sweep + sum + insert, **no external I/O**), so serialization is sub-millisecond even under contention.

The residual risk is the same class as Phase-8's `FOR UPDATE`: the guarantee is **procedural** (the app must take the lock), not structural. Phase-8's `seat-claim-race.test.ts` Layer 2 recorded the scar — deleting the production lock shipped green until a race test drove the **real** claim function through `makeRacingClients`. This phase mitigates identically: the SC#3 acceptance gate drives the real `createOpenCapacityHold` through independent connections and goes RED if the lock line is deleted (§Validation Architecture, Mutation 2). Advisory-lock **hash collisions** are correctness-safe (a collision only over-serializes two unrelated dates; it can never under-serialize).

**Example:**
```typescript
// Source: NEW src/lib/availability/units.ts — sibling to createPendingHold (verified pattern from that file)
// The occupying set for OPEN-capacity is instant-only (OC-10): {confirmed, pending-unexpired}. No requested/approved.
export async function createOpenCapacityHold(db: DbConn, input: {
  listingId: string; bookerId: string;
  dayOpenUtc: Date; dayCloseUtc: Date;   // OC-03: opening/closing instants of the picked date (venue tz → UTC)
  requestedHeads: number;                 // OC-06
  idempotencyKey?: string | null;
}): Promise<OpenHoldResult> {
  const openIso = input.dayOpenUtc.toISOString();
  const closeIso = input.dayCloseUtc.toISOString();
  for (let txAttempt = 0; ; txAttempt++) {
    try {
      return await db.transaction(async (tx): Promise<OpenHoldResult> => {
        // (0) Own-hold idempotency pre-check (D-42) — same idiom as findOwnActiveHold; replay returns the same row.
        // ...

        // (1) SERIALIZE this (listing, date). Transaction-scoped → auto-released at commit/rollback.
        //     hashtextextended is IMMUTABLE and returns bigint; keying on listing_id + the opening instant
        //     means only same-date claimers contend. A hash collision only over-serializes (correctness-safe).
        await tx.execute(sql`SELECT pg_advisory_xact_lock(
          hashtextextended(${input.listingId} || ':' || ${openIso}, 0))`);

        // (2) In-tx lazy-expiry sweep (mirrors createPendingHold step 2) — flip expired OPEN pending holds
        //     out of the occupying set so the SUM is accurate. Scoped to THIS listing+date.
        await tx.execute(sql`
          UPDATE booking SET status = 'cancelled', expires_at = NULL
          WHERE listing_id = ${input.listingId} AND open_capacity = true
            AND status = 'pending' AND expires_at <= now()
            AND starts_at = ${openIso}::timestamptz`);

        // (3) Drift-free SUM under the lock — the cap AUTHORITY is listing.maxOccupancy (OC-04), read in-tx.
        const [{ cap, taken }] = (await tx.execute(sql`
          SELECT l.max_occupancy AS cap,
                 COALESCE((SELECT SUM(b.declared_pax) FROM booking b
                   WHERE b.listing_id = ${input.listingId} AND b.open_capacity = true
                     AND b.starts_at = ${openIso}::timestamptz
                     AND (b.status = 'confirmed'
                          OR (b.status = 'pending' AND b.expires_at > now()))), 0)::int AS taken
          FROM listing l WHERE l.id = ${input.listingId}`)) as unknown as { cap: number; taken: number }[];

        // (4) Offer-the-partial (OC-07): grant min(requested, remaining); 0 remaining → "Just sold out" (OC-13).
        const remaining = cap - taken;
        if (remaining <= 0) return { error: "Just sold out — pick another date." };
        const granted = Math.min(input.requestedHeads, remaining);

        // (5) Server-frozen linear quote (OC-08) + D-74 service fee, then INSERT ONE booking row.
        //     open_capacity=true removes this row from the narrowed booking_no_overlap EXCLUDE (Pattern 3).
        //     unit=1 is a sentinel (the counter governs, not the unit). expires_at is DB-computed (D-94).
        // ... quoteOpenCapacity(perHeadPriceCents, granted) → space; computeServiceFee(space) → fee
        // INSERT ... status='pending', open_capacity=true, unit=1, declared_pax=granted,
        //   starts_at=openIso, ends_at=closeIso, expires_at=LEAST(now()+ttl, starts_at) ...
        return { ok: true, id, granted, replayed: false /* + frozen triple */ };
      });
    } catch (e) {
      if (isPgError(e, "40P01") && txAttempt < MAX_TX_RETRIES - 1) continue; // defensive, mirrors units.ts
      return mapBookingError(e);
    }
  }
}
```

### Pattern 2: Where the claim lives — HOLD time, not pay time (resolves OC-07's money-path worry)

The pending hold **is** the atomic claim. Once step 5 inserts the `pending` open booking with `declared_pax = granted`, those heads are reserved (they enter the occupying SUM) and held through the payment window (`expires_at` cap, D-94). Payment (`confirmBooking`) then charges the **already-frozen** `quoted_total_cents` for `granted` heads — it does **not** re-claim. Therefore:
- **Partial-fill is resolved at hold time**, not on the money path — the money path is untouched. OC-07's "final atomic claim at pay time may itself reduce/sell-out" concern does not arise, because the two-phase hold already reserves the seats. **This means the OC-07 fallback (pure all-or-nothing) is not needed.**
- If `granted < requested`, `placeHold` returns the granted count; the UI re-prompts and the booker proceeds to pay for the held `granted`-head booking (no re-price on the money path unless they re-step, which reuses `updateDeclaredPax`'s expire-before-refreeze gate — but note that gate re-quotes without re-running the capacity claim, so **stepping UP a held open booking must re-enter the capacity claim**; see Open Questions Q2).

### Pattern 3: Narrow the `booking_no_overlap` EXCLUDE to exclusive bookings only

**This is a required, easily-missed change.** All open bookings on one date share the identical `[dayOpen, dayClose)` window and the sentinel `unit=1`. Under the current EXCLUDE (`listing_id, unit, tstzrange && WHERE status NOT IN ('cancelled','declined','completed')`), the **second** open booking on a date would be rejected as a double-book. So open rows must be removed from the EXCLUDE.

Denormalize a boolean `booking.open_capacity` (NOT NULL default false, backfill-free — existing rows read exclusive) and DROP+re-ADD the EXCLUDE with `AND open_capacity = false` appended to the predicate, mirroring `0012`:
```sql
-- Source: NEW drizzle/00XX (mirrors drizzle/0012_booking_exclusion_v2.sql)
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ("listing_id" WITH =, "unit" WITH =, tstzrange("starts_at","ends_at",'[)') WITH &&)
  WHERE ("status" NOT IN ('cancelled','declined','completed') AND "open_capacity" = false);
```
A boolean literal `false` is IMMUTABLE and touches no enum → **no 55P04** (unlike naming the new `'open_capacity'` enum value in a constraint predicate, which would trip it). Exclusive rows (`open_capacity=false`) keep the constraint verbatim; open rows are governed by the advisory-lock counter alone.

### Pattern 4: Read-model / search "spots left" projection (OC-13)

`getAvailability` forks on `occupancy_mode`:
- **exclusive** → existing per-hourly-slot free-unit grid (unchanged).
- **open_capacity** → a single per-DATE figure: `remaining = maxOccupancy − SUM(declared_pax over occupying)`, using the **identical** occupying predicate as the claim: `status='confirmed' OR (status='pending' AND expires_at > now())`, scoped `open_capacity=true AND starts_at = dayOpen`. No hourly slots (OC-02). The shape returned should carry `{ remaining, cap }` per queried date.
- **search Stage-2** (`query.ts`): for open listings, keep the candidate iff the picked date's `remaining ≥ 1` (OC-12). No date picked → default browse keeps the candidate; the card shows the Drop-in badge + "₱/person" (from `per_head_price_cents`), no scarcity number (UI phase finalizes the chip).

**Critical invariant (mirrors the exclusive model):** the read-model occupying predicate MUST be byte-identical to the claim's occupying predicate, or the calendar/search would show a slot the counter would reject (the T-03-RANGE-MISMATCH class). Same lazy-expiry (`expires_at > now()` via the DB clock), same status set.

### Pattern 5: `publishSchema` mode fork (OPEN-01)

Today `publishSchema` requires `hourlyRateCents` + `dayRateCents` positive and `maxOccupancy` positive. Fork with a `superRefine` on `occupancy_mode`:
- `exclusive` (default) → unchanged (hourly + day rates required).
- `open_capacity` → require `per_head_price_cents` positive + `maxOccupancy` positive (the cap); do **not** require hourly/day rates (hidden, OC-08); force `bookingMode = instant` (OC-10). Also enforce `unitCount = 1` for open listings (see Open Questions Q3).

The field is already accepted through the enum for forward-compat; extend `occupancyModeValues` (`listing.ts:28`) to `["exclusive","open_capacity"]`.

### Anti-Patterns to Avoid
- **App-level count-then-insert without the lock.** The exact CLAUDE.md anti-pattern and the Phase-8 Layer-2 scar. The advisory lock (or an equivalent DB arbiter) must span the SUM→insert; never read the count, release, then insert.
- **A denormalized `taken`/`spots_left` counter column.** Lazy expiry (holds that lapse without a worker) makes any stored counter drift. Compute `SUM(declared_pax)` live under the lock — the drift-free choice `seat-claim.ts` already made for Phase 8.
- **Leaving open rows under the EXCLUDE.** Forgetting Pattern 3 makes the 2nd same-date open booking fail with a 23P01 "just taken" — a silent functional break that the exclusion-race test would not catch (different fixture). The open-capacity race test must include a same-date multi-booking case.
- **Auto-blocking on host-cancel of an open booking.** The Phase-7 host-cancel inserts an `availability_block` for the freed `(unit, window)`; for open-capacity `unit=1` + the whole-date window, that block zeroes the **entire date for every booker** (Pitfall 5).
- **Re-deriving the claim on the money path.** The webhook/confirm must stay a pure `pending→confirmed` flip on `booking.id`; never re-run a capacity check there (it would take the booker's money and leave the booking unconfirmable — the D-57/Pitfall-4 rule).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Serialize concurrent claims per (listing,date) | A bespoke lock table / mutex / Redis lock | `pg_advisory_xact_lock` (native PG) | Transaction-scoped, auto-released, no row lifecycle, no extra infra |
| Multi-connection race proof | Ad-hoc `Promise.all` on one client | `makeRacingClients` (`tests/helpers/db.ts`) | A single `max:1` client serializes and proves nothing (Pitfall 1); this harness opens independent backends |
| SQLSTATE detection (40P01/23P01/23505) | `err.message` string match | `isPgError` (`src/lib/pg.ts`) | Walks the Drizzle `.cause` chain; locale-safe |
| Enum value addition | ALTER TYPE + use in one migration | The 55P04 two-migration split (0010/0012/0018 precedent) | ADD VALUE and its first use cannot share a transaction |
| Refund math for a cancelled drop-in | A drop-in-specific refund rule | `quoteRefund` + `LADDER` via OC-03's `starts_at` | OC-15 reuses Phase-7 verbatim; a parallel rule is a second money source of truth |
| Charge/confirm/payout for a drop-in | Any new payment path | The existing single-payer rail (confirmBooking → webhook → payout) | OC-09; the rail is untouched by design |

**Key insight:** the only genuinely new code is the **capacity claim + its read-model projection**. Everything money-, notification-, cancellation-, and payout-related is a mode-fork or verbatim reuse. Building anything new on the money path would violate OC-09 and re-open proven-closed surfaces.

## Common Pitfalls

### Pitfall 1: The second same-date open booking is rejected as a double-book
**What goes wrong:** all open bookings on a date share `unit=1` + the identical window; the current EXCLUDE rejects the 2nd with 23P01.
**Why it happens:** the EXCLUDE was built for exclusive one-unit-per-booking; it has no concept of shared capacity.
**How to avoid:** Pattern 3 — denormalize `booking.open_capacity` and narrow the EXCLUDE predicate to `open_capacity = false`. Add a same-date multi-booking case to the race test so a regression is caught.
**Warning signs:** an open listing accepts exactly one booking per date and then reports "just taken."

### Pitfall 2: 55P04 on the enum value's first use
**What goes wrong:** naming the new `'open_capacity'` literal in the same migration transaction that adds it raises `55P04 unsafe use of new enum value` (drizzle-orm wraps all pending migrations in ONE transaction).
**Why it happens:** verified precedent in `0010`→`0012` (booking_status) and `0018` (notification_type).
**How to avoid:** isolate `ALTER TYPE "occupancy_mode" ADD VALUE IF NOT EXISTS 'open_capacity'` in its own migration; **never** name the literal in any migration afterward. The EXCLUDE narrow uses the boolean flag (not the enum), and `listing.occupancy_mode='open_capacity'` is only ever written at **runtime** (publish action) — so, like `0018`, nothing in any migration uses the value.
**Warning signs:** `npm run db:migrate` rolls back with 55P04.

### Pitfall 3: A denormalized counter drifts on lazy-expired holds
**What goes wrong:** a stored `spots_left`/`taken` integer over-counts holds that lapsed without a worker flipping them.
**Why it happens:** the system uses lazy expiry (`expires_at > now()`), not eager sweeps, on the hot path.
**How to avoid:** compute `SUM(declared_pax)` live under the lock and run the in-tx stale-hold sweep first (both shown in Pattern 1) — never persist the count.
**Warning signs:** spots-left disagrees between the read model and the claim; a date shows "full" while holds have silently expired.

### Pitfall 4: The read-model occupying predicate drifts from the claim's
**What goes wrong:** the calendar/search shows spots the counter then refuses (or hides bookable spots).
**Why it happens:** two copies of the occupying predicate diverge (a classic T-03-RANGE-MISMATCH).
**How to avoid:** use the identical predicate everywhere — `status='confirmed' OR (status='pending' AND expires_at > now())`, `open_capacity=true`, `starts_at = dayOpen`, DB clock only. Consider a shared SQL fragment.
**Warning signs:** "Just sold out" at checkout on a date the search said had spots.

### Pitfall 5: Host-cancel auto-block closes the whole date for everyone
**What goes wrong:** `cancelBookingAsHost` inserts an `availability_block` on `(unit=1, [dayOpen,dayClose))`; the read model treats a whole-listing/unit block as zeroing the date → every other open booker for that date loses availability.
**Why it happens:** the Phase-7 anti-resell auto-block assumes an exclusive slot to protect from resale; open-capacity has no single slot and a fixed per-head price, so there is nothing to resell.
**How to avoid:** fork `cancelBookingAsHost` — for `open_capacity` bookings, **skip Consequence 3 (the auto-block)**. Keep the refund, the audit, the host-cancel fee, and the notifications. The freed head simply returns to the pool (spots-left increments automatically).
**Warning signs:** one host-cancel makes a whole drop-in date read "Fully booked."

### Pitfall 6: Advisory lock acquired outside the claim transaction
**What goes wrong:** using `pg_advisory_lock` (session-scoped) or acquiring the xact lock in a different connection leaves the SUM→insert unprotected.
**Why it happens:** advisory locks are connection/transaction-scoped, not statement-scoped.
**How to avoid:** use `pg_advisory_xact_lock` **inside** the same `db.transaction` as the sweep/sum/insert (it auto-releases at commit/rollback). Do not do any external I/O inside that transaction.
**Warning signs:** the race test goes red intermittently; over-cap rows appear under load.

## Code Examples

### Migration Sequence (three migrations)
```sql
-- Source: NEW drizzle/0020 — ADD VALUE ISOLATED (mirrors 0010 / 0018). Does NOTHING else.
ALTER TYPE "occupancy_mode" ADD VALUE IF NOT EXISTS 'open_capacity';
```
```sql
-- Source: NEW drizzle/0021 — generated columns (backfill-free; mirrors 0016/0017)
ALTER TABLE "listing" ADD COLUMN "per_head_price_cents" integer;          -- OC-09 dedicated, linear
ALTER TABLE "booking" ADD COLUMN "open_capacity" boolean DEFAULT false NOT NULL;  -- EXCLUDE-narrow flag
```
```sql
-- Source: NEW drizzle/0022 — EXCLUDE DROP + re-ADD narrowed by the boolean (mirrors 0012; NO 55P04 — boolean literal)
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ("listing_id" WITH =, "unit" WITH =, tstzrange("starts_at","ends_at",'[)') WITH &&)
  WHERE ("status" NOT IN ('cancelled','declined','completed') AND "open_capacity" = false);
```
Sequencing note: `0022` references only the boolean (not the enum value), so it is 55P04-safe even sharing a transaction with `0021`. Keeping `0020` standalone satisfies the split unconditionally.

### The venue-local date window (OC-03), reusing the read-model idiom
```typescript
// Source: src/lib/availability/read-model.ts:120-121 (TZDate → epoch normalization, verified)
// The picked date's opening/closing instants come from the listing's operating hours for that weekday.
const dayOpenUtc  = new Date(new TZDate(year, m0, day, openHour,  0, 0, tz).getTime());
const dayCloseUtc = new Date(new TZDate(year, m0, day, closeHour, 0, 0, tz).getTime());
// Persisted as booking.starts_at / booking.ends_at so the refund ladder, payout sweep, reminders apply unchanged.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Exclusive-only occupancy (GiST EXCLUDE is the sole arbiter) | Two modes; open-capacity governed by an advisory-lock counter, exclusive still by the EXCLUDE | Phase 9 | The EXCLUDE predicate narrows to `open_capacity=false`; a second, mode-scoped arbiter joins it |
| `declared_pax` set only when `extra_head_fee > 0` (Phase 8) | For open-capacity, `declared_pax` is ALWAYS the granted head count (even 1) | Phase 9 | The read-model SUM relies on `declared_pax` being present on every open row |
| Phase-8 cap via `SELECT … FOR UPDATE` on the group row | Advisory lock keyed on `(listing, date)` (finer, no physical parent row) | Phase 9 | D-112's "too coarse" concern addressed; no capacity-row lifecycle |

**Deprecated/outdated:** none introduced. The Phase-8 `seat-claim.ts` FOR UPDATE remains correct for its (bounded-per-group) contention and is not touched.

## Assumptions Log

> **USER-CONFIRMED 2026-07-30 (plan-phase gate):** A1, A2, and A3 were surfaced to the user and **confirmed as recommended** — LOCKED, not open. (A1) OC-05 = advisory-lock counter (this is a deliberate, user-approved deviation from D-21's literal "units-as-spots" steer — D-21 predates the OC-02 date-pass single-row model; promote as a new D-NNN at planning). (A2) OC-04 = reuse `listing.maxOccupancy`. (A3) OC-09 = dedicated `per_head_price_cents` column. Planner: treat A1–A3 as locked decisions. A4–A6 remain planner/executor calls per their rows.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | **[LOCKED ✓ user-confirmed] OC-05 mechanism = advisory-lock counter (not units-as-spots).** Deliberate, user-approved deviation from D-21's literal "reuse units-as-spots" steer, justified by the date-pass single-row model (OC-02) that D-21 predates. CONTEXT OC-05 explicitly hands the choice to research and D-112 sanctioned the counter. | Pattern 1 | N/A — confirmed. (Was: switch to units-as-spots if a structural guarantee is preferred; both ship the same race-test gate.) |
| A2 | **[LOCKED ✓ user-confirmed] OC-04: reuse `listing.maxOccupancy` as the cap** (its original D-07 meaning "how many people the space holds"; the D-111 RSVP meaning never coexists on an open listing; already publish-required positive). | Pattern 1/5 | N/A — confirmed. |
| A3 | **[LOCKED ✓ user-confirmed] OC-09: dedicated `per_head_price_cents` column** (open pricing is purely linear, no included base). | Pattern 5 | N/A — confirmed. |
| A4 | **Open-capacity listings are single-unit (`unitCount = 1`).** CONTEXT frames open as "many bookers share ONE bookable unit"; multi-unit + open-capacity is out of scope. | Pattern 5 / Q3 | If a host needs an 8-court facility partly open, that combination needs its own design (defer). Enforce `unitCount=1` at publish for open mode. |
| A5 | **Host-cancel skips the auto-block for open bookings**; the host-cancel fee still applies. | Pitfall 5 | If the fee should NOT apply to drop-in host-cancels, revisit `cancelBookingAsHost`. The auto-block skip is unambiguous (it would break the date). |
| A6 | **Partial-fill is resolved at hold time; the money path is unchanged**, so the OC-07 all-or-nothing fallback is unnecessary. | Pattern 2 | If stepping-up a held open booking (Q2) proves complex, fall back to all-or-nothing per OC-07's recorded option. |

## Open Questions

1. **Advisory-lock key hashing across isolated test schemas.**
   - What we know: `pg_advisory_xact_lock` is database-global (not schema-scoped); the test harness isolates by schema, not by lock namespace.
   - What's unclear: whether two parallel test files could hash the same `(listing_id, date)` and over-serialize.
   - Recommendation: use a unique `listing_id` per race-test file (the existing convention); hash collisions only over-serialize (never break correctness), so this is a performance note, not a correctness risk. No production change needed.

2. **Stepping UP the headcount on a held open booking.** `updateDeclaredPax` re-quotes without re-running a capacity claim. For an open booking, increasing heads must re-enter the capacity claim (there may be no room for the extra heads).
   - Recommendation: for `open_capacity` bookings, route step-up through `createOpenCapacityHold`'s claim logic (grant `min(delta, remaining)`), or disallow step-up on a held open booking and require a fresh hold. **Planner should pick.** Stepping DOWN is always safe (frees seats).

3. **`unitCount` for open listings.** Recommend enforcing `unitCount = 1` at publish for `open_capacity` (A4). Confirm no existing multi-unit listing is being converted in place (OC-17's lock prevents mode-switch under live bookings, which covers this).

4. **Low-stock threshold + chip styling (OC-11/OC-12).** Explicitly the **UI phase's** job — do not design here. This phase supplies only `{ remaining, cap }`. Note: run `/gsd-ui-phase 9` (ROADMAP UI hint = yes).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL advisory locks (`pg_advisory_xact_lock`) | OC-05 claim | ✓ (native) | PG 18 | SERIALIZABLE isolation (documented alternative) |
| `btree_gist` extension | narrowed EXCLUDE | ✓ | installed by `drizzle/0005` | — |
| `@date-fns/tz` `TZDate` | OC-03 date window | ✓ | ^1.5.0 | — |
| `makeRacingClients` harness | SC#3 race test | ✓ | `tests/helpers/db.ts` | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none. No new npm packages required.

## Validation Architecture

> nyquist_validation is enabled (`config.json`). This section is mandatory and drives VALIDATION.md.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (integration via isolated Postgres schemas) + Playwright (E2E) |
| Config file | `vitest.config.ts` (verified present via existing `tests/**`), `tests/helpers/db.ts` |
| Quick run command | `npx vitest run tests/availability/open-capacity-race.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPEN-03 | (cap+1)-th concurrent single-head claim rejected; SUM(heads) never exceeds cap | integration (genuine race) | `npx vitest run tests/availability/open-capacity-race.test.ts` | ❌ Wave 0 |
| OPEN-03 | concurrent MULTI-head claims never overshoot the cap; partial-fill grants exactly `remaining` | integration (race) | same file | ❌ Wave 0 |
| OPEN-03 | released seat re-bookable (cancel → remaining increments → new claim succeeds) | integration | same file | ❌ Wave 0 |
| OPEN-03 | second same-date open booking is NOT rejected by the EXCLUDE (Pitfall 1) | integration | `tests/availability/open-capacity-exclude.test.ts` | ❌ Wave 0 |
| OPEN-01 | publish gate: open mode requires per-head price + cap, forbids/ignores hourly-day; forces instant | unit | `npx vitest run tests/validation/listing.test.ts` | ⚠️ extend existing |
| OPEN-02 | one booking row per payment; confirm webhook flips pending→confirmed unchanged | integration | `tests/paymongo/webhook-payment-paid.test.ts` (extend) | ⚠️ extend existing |
| OPEN-04 | read-model `remaining = cap − SUM(occupying heads)`; search keeps date iff ≥1 spot | integration | `tests/availability/open-capacity-readmodel.test.ts` | ❌ Wave 0 |
| OPEN-04 | full E2E: two bookers share a date, spots-left decrements, sold-out at cap | e2e | Playwright spec | ❌ Wave 0 |

### The SC#3 acceptance-gate test (the non-negotiable, Phase-3 SC#4 analog)
Model **exactly** on `tests/group/seat-claim-race.test.ts` (Layer 2) + `tests/availability/exclusion-race.test.ts`:
- Use `makeRacingClients(schema, n)` — **independent connections**, never one `max:1` client (Pitfall 1).
- Drive the **real** `createOpenCapacityHold` (each racer over its own `drizzle(client)`), not an inlined copy — the shipped lock is what must be under test (the Layer-2 lesson: an inlined proof shipped green while the production lock was deleted).
- Assertions (read back through an independent connection, asserting **committed** rows):
  - cap = N, fire N+1 single-head racers → `SUM(declared_pax over occupying) === N`; exactly one racer gets `"Just sold out"`.
  - cap = 5, fire racers requesting 2/2/2 heads → committed SUM ≤ 5; the boundary racer is granted the partial (`granted === remaining`) and reports it, never a silent over-charge.
  - cancel one confirmed booking → `remaining` increments → a fresh claim succeeds.
- **Mutation 1 (pattern):** delete `pg_advisory_xact_lock` from the inlined pattern proof → RED → restore.
- **Mutation 2 (shipped):** delete the `pg_advisory_xact_lock` line from `src/lib/availability/units.ts` (`createOpenCapacityHold`) → the real-claim cases go RED (SUM > cap) → restore, then `git diff --exit-code` on the file.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/availability/open-capacity-race.test.ts`
- **Per wave merge:** `npx vitest run tests/availability tests/validation tests/paymongo`
- **Phase gate:** full suite green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/availability/open-capacity-race.test.ts` — the SC#3 gate (OPEN-03), red-first.
- [ ] `tests/availability/open-capacity-exclude.test.ts` — Pitfall 1 same-date multi-booking (OPEN-03).
- [ ] `tests/availability/open-capacity-readmodel.test.ts` — spots-left projection (OPEN-04).
- [ ] Extend `tests/validation/listing.test.ts` — mode-forked publish gate (OPEN-01).
- [ ] Extend `tests/paymongo/webhook-payment-paid.test.ts` — open booking confirm (OPEN-02).
- [ ] Playwright E2E — two-booker shared-date decrement + sold-out (OPEN-04).
- Framework install: none (Vitest + Playwright + `makeRacingClients` all present).

## Security Domain

> security_enforcement enabled, ASVS L1 (`config.json`).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Reuse `auth.api.getSession`; `placeHold`/`confirmBooking` require a session (existing) |
| V4 Access Control | yes | Owner-gate every mutation server-side (booker owns the hold; host owns the listing) — the route group is never the gate; re-derive `deriveBookable` (existing `booking.ts` pattern) |
| V5 Input Validation | yes | Zod re-validate the selection + headcount server-side; the cap + per-head price are read from the DB, never the client (existing `bookingCreateSchema`, `declaredPaxSchema`) |
| V6 Cryptography | no | No new secrets; PayMongo signature verification is unchanged |

### Known Threat Patterns for {open-capacity claim}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client submits a headcount past the cap / negative | Tampering | Server clamps `min(requested, remaining)`; `declaredPaxSchema` shape guard; the DB SUM is the authority |
| Client injects a price / per-head amount | Tampering | Price frozen server-side from `listing.per_head_price_cents`; the action takes no amount (existing D-49 discipline) |
| Concurrent over-claim (race the last seat) | Tampering / DoS-of-correctness | The advisory-lock+SUM critical section; proven by the mandatory race test |
| Guessed/leaked booking id → cancel a stranger's seat | Elevation | IDOR owner-gate in the WHERE (`booker_id = userId`); missing vs not-mine indistinguishable (existing `cancel-booking.ts`) |
| Replay / double-click double-charge | Tampering | `booking_idem_uq` (D-42) + amount-scoped checkout Idempotency-Key (`declared_pax != null` → `checkout:id:amount`, already in `confirmBooking`) |
| Advisory-lock exhaustion (many keys) | DoS | Transaction-scoped locks auto-release at commit; the critical section holds no external I/O, so lock hold time is sub-ms |

## Sources

### Primary (HIGH confidence — live codebase, verified this session)
- `src/lib/availability/units.ts` — `createPendingHold` transaction (SAVEPOINT, 40P01 outer-retry, in-tx sweep, D-42 idempotency), `pickLowestFreeUnit`, `mapBookingError`.
- `src/lib/group/seat-claim.ts` + `tests/group/seat-claim-race.test.ts` — the Phase-8 FOR UPDATE cap + the two-layer race-test discipline (the procedural-lock scar).
- `tests/availability/exclusion-race.test.ts` + `tests/helpers/db.ts` — `makeRacingClients`, the SC#4 pattern, 23P01/40P01 handling.
- `drizzle/0005` + `drizzle/0012` — the GiST EXCLUDE (complement predicate, IMMUTABLE-only rule); `drizzle/0010` + `drizzle/0018` — the 55P04 ADD VALUE split; `drizzle/0017` — brand-new-enum-may-share-a-migration.
- `src/lib/db/schema.ts` — `occupancyMode` (:164), `maxOccupancy` (:189), `unitCount` (:190), `booking` + EXCLUDE note (:619-636), `declared_pax` (:744).
- `src/app/actions/booking.ts` — `placeHold` fork point, `confirmBooking`, `updateDeclaredPax` (expire-before-refreeze), amount-scoped Idempotency-Key.
- `src/app/api/paymongo/webhook/route.ts` — the `checkout_session.payment.paid` confirm authority (pending→confirmed on `reference_number` alone).
- `src/lib/availability/read-model.ts` + `src/lib/search/query.ts` — the occupying predicate + two-stage search to fork.
- `src/lib/payments/cancellation.ts` + `src/app/actions/cancel-booking.ts` — the refund ladder + host-cancel four consequences (the auto-block to skip for open mode).
- `src/lib/validation/listing.ts` — `publishSchema`, `occupancyModeValues`.
- `.planning/PROJECT.md` D-21; `.planning/phases/08-group-bookings/08-CONTEXT.md` D-107/D-109/D-110/D-111/D-112.

### Secondary (project docs)
- `.planning/phases/09-open-capacity-bookings/09-CONTEXT.md`, `09-DISCUSSION-LOG.md`; `.planning/ROADMAP.md` §Phase 9; `.planning/REQUIREMENTS.md` OPEN-01..04; `CLAUDE.md` §Double-Booking Prevention + §Marketplace Payments.

### Tertiary
- Postgres advisory-lock semantics (`pg_advisory_xact_lock`, transaction-scoped, IMMUTABLE hashing) — training knowledge; the specific SQL is standard and low-risk, tagged [ASSUMED] where not verified against a doc this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; every asset verified in the live tree.
- Architecture (OC-05 mechanism): HIGH on correctness of the recommended mechanism; the **choice** between advisory-lock counter and units-as-spots is a genuine judgment call (A1) — MEDIUM that it is the one the user will prefer.
- Schema calls (OC-04/OC-09): MEDIUM-HIGH — reasoned decisions flagged for confirmation (A2/A3).
- Pitfalls: HIGH — each is grounded in a specific existing constraint/predicate/handler.
- Money path unchanged: HIGH — verified end-to-end (hold → confirm webhook → payout → refund all key on `booking.id`).

**Research date:** 2026-07-30
**Valid until:** ~2026-08-30 (stable; the only external is Postgres, whose advisory-lock API is decades-stable). Re-verify if the Phase-8 seat-claim or the EXCLUDE migration shape changes before planning.
