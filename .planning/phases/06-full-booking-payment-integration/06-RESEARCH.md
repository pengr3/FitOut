# Phase 6: Full Booking + Payment Integration - Research

**Researched:** 2026-07-20
**Domain:** Booking lifecycle state modeling over an existing Postgres GiST-exclusion occupancy table; a two-mode (instant vs pay-on-approval) checkout fork; dual-timer expiry sweeps on Inngest; thin transactional email over Resend. All within a Next.js 16 / Drizzle / PayMongo codebase whose payment and double-booking primitives are already built.
**Confidence:** HIGH (this is an extension of a mature, well-instrumented codebase; nearly every claim is verified by direct source read, not training data)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-61:** Both instant-book and request-to-book ship in v1. Mode is **host-selectable per listing and editable while hosting** (from the listing editor), not frozen at creation. **Rule:** a mode change governs **new** bookings only — any in-flight request keeps the mode it was created under (a listing flipped to instant while requests are pending does not auto-confirm or drop them).
- **D-62:** `listing.bookingMode` default flips `"request"` → `"instant"` (`src/lib/db/schema.ts:180`). A Phase-6 execution change (migration/schema default + create-wizard default). Existing listings unaffected; no production listings to backfill.
- **D-63:** Request-to-book uses **pay-on-approval, NOT authorize→capture.** Flow: booker requests → a request **holds the slot** via the existing GiST exclusion (no charge) → host approves within the SLA → booker pays via the **exact Phase-5 hosted checkout** → `payment.paid` webhook confirms → slot locked. On decline, SLA expiry, or non-payment within the payment window, the slot frees (request → cancelled/declined). **Nothing is ever refunded or voided** (on the happy path). All rails incl. QRPh work.
- **D-64:** Host approval SLA = **24h** (config-tunable) → auto-declines, slot frees. Post-approval payment window = **24h** (config-tunable) → auto-releases, slot frees. Both live in `src/lib/payments/config.ts` (join `COMMISSION_RATE_BPS`/`PAYOUT_DELAY_HOURS`/`PAYMENT_WINDOW_MINUTES`). Worst case a request-to-book slot is held ≤48h.
- **D-65:** A dedicated owner-scoped `/host/requests` page (mirrors `/host/earnings` RSC + server-action pattern) lists pending requests — booker, space, requested window, quoted price, expiry countdown — with Approve/Decline server actions. A pending-count nudge appears in the host dashboard action row + `(host)` header nav. Freshness via `revalidatePath` (no websockets/polling in v1).
- **D-66:** On-screen confirmation reuses the existing confirmation page (`/bookings/[id]`). Phase 6 adds booking/request lifecycle transactional emails via the **existing `src/lib/email.ts`** (Resend + dev "link withheld/logged" fallback). Hardened email layer (retry/observability/queue, WR-04), reminders, and non-booking notifications stay **Phase 7**.

### Claude's Discretion (resolved in this research — see body)
- **Request state modeling** over `booking_status` — resolved: add two enum values `requested` + `approved` (see Architecture Pattern 1).
- **Hold TTL reuse** across request→approved→paid — resolved: parameterize `createPendingHold` TTL/status + a dedicated Inngest expiry-sweep for the visible flip/email; lazy read-predicates free the slot between sweeps (Pattern 3).
- **Email templating** — resolved: plain HTML strings extending `email.ts` (NOT React Email — it is not installed; keep the send thin). See "Don't Hand-Roll" + Pattern 5.
- **Where the mode toggle lives / how approve-decline surfaces** — planner/UI's call; the mode toggle already exists in the wizard (Step 5, `wizard.tsx:666`).

### Deferred Ideas (OUT OF SCOPE)
- Cancellation/refund policy matrix + booker cancel flow → **Phase 7** (BOOK-07, PAY-06). The Phase-5 refund mechanism exists but is unused on the pay-on-approval happy path.
- My Bookings list views (both sides) → **Phase 7** (HOST-02 / MANAGE).
- Hardened transactional-email layer (retry, observability, queue — WR-04), reminders, non-booking notifications → **Phase 7**.
- Card authorize/hold (manual capture) as an alternative money model → revisit only if PayMongo enables the gated Advanced Card Feature.
- Real-time host request updates (websockets/push) → future; v1 uses `revalidatePath`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **BOOK-04** | Instant-book listings confirm immediately on successful payment | Already built (Phase 5): `placeHold`→`confirmBooking`→hosted checkout→`payment.paid` webhook confirm. Phase 6 only *forks* this behind `listing.bookingMode` and applies the D-62 default flip. See Architecture Pattern 2. |
| **BOOK-05** | Request-to-book listings create a pending request the host approves/declines, auto-expiring if no response | The `requested` lifecycle state + `/host/requests` approve/decline actions + SLA auto-decline sweep. Patterns 1, 3, 4. |
| **BOOK-06** | Booker receives on-screen and email confirmation of a booking | On-screen confirmation page already exists (`/bookings/[id]`). Add the "booking confirmed" email fired from the webhook confirm handler (covers instant AND pay-on-approval). Pattern 5. |
| **PAY-05** | Request-to-book: slot held with no charge; booker pays on approval; frees on decline/expiry/non-payment | Pay-on-approval (D-63) reuses Phase-5 checkout verbatim, gated behind `approved`. The webhook confirm WHERE widens to `status IN ('pending','approved')`; the D-58 gone-slot backstop already covers the pay-after-release race. Patterns 1, 2, 4. |
| **HOST-01** | Host can approve or decline pending booking requests within a deadline | `/host/requests` owner-scoped page + owner-gated, SLA-guarded, atomic approve/decline server actions. Pattern 4; Security Domain V4. |
</phase_requirements>

## Summary

Phase 6 is a **state-modeling and orchestration** phase, not a new-capability phase. Every hard primitive it needs already exists and is proven in the codebase: the GiST double-booking exclusion (`booking_no_overlap`, drizzle/0005), the pending-hold transaction with SAVEPOINT/idempotency (`createPendingHold`, units.ts), the hosted PayMongo checkout + single-writer `payment.paid` confirm authority (webhook route.ts, D-57), the Inngest hourly cron pattern (payout-sweep/reconcile), the owner-scoped `(host)` RSC + server-action pattern (`/host/earnings`), and the thin Resend helper with a dev fallback (email.ts). **Phase 6 introduces ZERO new dependencies** [VERIFIED: package.json — inngest 4.13.0, resend 6.12.4, drizzle-orm 0.45.2 all already installed].

The load-bearing insight (D-63) is that pay-on-approval turns request-to-book from "a second payment system" into "the Phase-5 instant checkout, gated behind a host approval." So the work is: (1) model the request lifecycle over `booking_status` **without breaking the double-booking guarantee**, (2) fork `placeHold` on `listing.bookingMode`, (3) add owner-gated approve/decline actions, (4) add a dual-timer expiry sweep, (5) widen the webhook confirm to include the approved state, and (6) add five thin lifecycle emails.

The single most dangerous part is the **occupancy-predicate fan-out**: introducing new slot-holding states (`requested`, `approved`) means *every* occupancy predicate in the codebase — the EXCLUDE constraint WHERE, the read model, three helpers in units.ts, and the webhook confirm — must be widened in lockstep. Miss one and either a requested slot fails to block a double-book (correctness violation) or a paid request fails to confirm (booker charged, no booking). This research enumerates all of them exactly (see the Occupancy-Predicate Audit table — the most important artifact here).

**Primary recommendation:** Add `requested` + `approved` to the `booking_status` enum (keep `pending` exclusively for the 15-min instant hold); widen all eight occupancy/confirm predicate sites in lockstep; parameterize `createPendingHold` with status+TTL+mode; add a dedicated Inngest expiry-sweep (mirroring payout-sweep) for the visible flip + emails while lazy read-predicates free the slot between sweeps; widen the webhook confirm WHERE to `IN ('pending','approved')` (the D-58 gone-slot backstop already handles the pay-after-release refund edge). Extend `email.ts` with five plain-HTML sends. No new libraries.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Booking-mode fork (instant vs request) | API / Backend (`placeHold` server action) | Database (`listing.bookingMode` read server-side) | Mode is a server-authoritative decision; the client is never trusted for it (mirrors the existing `deriveBookable` re-check). |
| Slot-holding while a request awaits action | Database (GiST exclusion + `booking.status`) | API (in-tx sweep) | The double-booking guarantee is DB-enforced (CLAUDE.md); app code never query-then-inserts. |
| Approve / decline | API / Backend (owner-gated server actions) | Database (atomic status UPDATE) | Ownership + SLA are re-verified server-side; the route group is never the gate (Security V4). |
| Dual expiry timers (SLA + payment window) | API / Backend (Inngest cron) | Database (DB-clock `now()`, lazy read predicates) | The DB clock is the sole expiry authority; the cron drives the visible flip + email side-effects. |
| Payment on approval | API (reuse Phase-5 `confirmBooking`→checkout) | External (PayMongo hosted checkout) | Pay-on-approval reuses the instant checkout wholesale (D-63); no new payment primitive. |
| Booking confirmation (both modes) | External→API (PayMongo `payment.paid` webhook, single writer) | Database (confirm UPDATE) | The webhook is the sole confirm authority (D-57); `?paid=1` is never proof of payment. |
| Host requests inbox | Frontend Server (owner-scoped RSC) | API (approve/decline actions) | Mirrors `/host/earnings`: RSC owner-scopes the read; actions re-gate ownership. |
| Lifecycle emails | API / Backend (fire-and-forget over Resend) | External (Resend / dev-log fallback) | Thin sends at lifecycle transition points; hardening (retry/queue) deferred to Phase 7. |

## Standard Stack

Phase 6 adds **no new libraries.** Everything is already installed and load-bearing. Versions below are the **installed** versions [VERIFIED: package.json], not training-data guesses.

### Core (all already present)
| Library | Version (installed) | Purpose in Phase 6 | Why Standard |
|---------|--------------------|--------------------|--------------|
| next | 16.2.7 | Server actions (`placeHold`, approve/decline), RSC (`/host/requests`), webhook route | Project framework (CLAUDE.md). |
| react | 19.2.7 | `/host/requests` UI, expiry countdown client component | Ships with Next 16. |
| drizzle-orm | 0.45.2 | Schema (enum + `booking.bookingMode`), raw `sql` for the widened predicates | SQL-first; needed for the raw-SQL EXCLUDE + occupancy predicates. |
| drizzle-kit | 0.31.10 | Generate the enum/column migrations; hand-author the EXCLUDE recreate + enum-add | Migration tooling. |
| postgres (postgres.js) | 3.4.9 | The driver behind Drizzle; bind ISO strings for raw range binds (Pitfall 3 convention) | Established driver. |
| inngest | 4.13.0 | The new expiry-sweep cron (mirrors payout-sweep) | Already the cron engine (D-56). **Note the 4.13.0 2-arg `createFunction(options, handler)` API** (see Pitfall 4). |
| resend | 6.12.4 | The five lifecycle emails via the existing `email.ts` helper | Already the email transport. Dev fallback logs the link. |
| zod | 4.4.3 | Re-validate any request/approve input shape server-side | Already the validation layer. |
| better-auth | 1.6.14 | Session + `canHost`/`canBook` gates (unchanged) | Auth layer. |
| PostgreSQL + btree_gist + PostGIS | 18 / 3.x | The EXCLUDE constraint recreate lives here | Double-booking keystone. |

### Supporting (already present)
| Module | Purpose | When to Use |
|--------|---------|-------------|
| `src/lib/availability/units.ts` (`createPendingHold`) | The slot-holding transaction to parameterize for `requested` holds | Fork target for request-to-book (Pattern 1). |
| `src/lib/payments/config.ts` | Add `APPROVAL_SLA_HOURS` + `APPROVAL_PAYMENT_WINDOW_HOURS` | Config-as-named-values (D-64). |
| `src/app/api/paymongo/webhook/route.ts` | Widen the confirm WHERE; fire the confirmed email | Single confirm writer (D-57). |
| `src/lib/email.ts` | Extend with five plain-HTML sends | Thin lifecycle emails (D-66). |
| `src/inngest/client.ts` + `src/app/api/inngest/route.ts` | Register the new expiry-sweep function in `serve()` | The cron mount (Pattern 3). |
| shadcn/ui `table`, `badge`, `button`, `card` | `/host/requests` UI primitives | Already used by `/host/earnings`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New enum values `requested`/`approved` | Overload `pending` + a `booking.bookingMode` + boolean `approved` flag | Rejected — overloading `pending` forces every sweep/read to join mode+flag to disambiguate three different TTL semantics; distinct enum values make per-status TTL and the confirm WHERE unambiguous. See Pattern 1. |
| Dedicated Inngest expiry-sweep | Pure lazy on-read expiry | Rejected as *sole* mechanism — lazy frees the slot but never flips the visible status or fires the decline/expiry email or keeps the host inbox truthful. **Do both**: lazy read (correctness between sweeps) + cron (visible flip + email). |
| Plain HTML email strings | React Email components | React Email is **not installed**; adding it contradicts "keep the send thin" (D-66) + zero-new-deps. Extend the existing `escapeHtml`+string pattern. |
| Reuse instant `confirmBooking` from `approved` | A second confirm/pay action | Reuse wins — pay-on-approval is "the Phase-5 checkout gated behind approval" (D-63). One small extension (accept `approved`) beats a parallel payment path. |

**Installation:** none. `npm install` adds nothing this phase. Only new env keys (with defaults) go in `.env.example`: `APPROVAL_SLA_HOURS`, `APPROVAL_PAYMENT_WINDOW_HOURS`.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
  Booker clicks "Book"   │  placeHold (server action)                   │
  ─────────────────────► │  session → canBook → deriveBookable          │
                         │  + READ listing.bookingMode  ◄── the FORK    │
                         └───────────────┬───────────────┬─────────────┘
                                 instant │               │ request
                                         ▼               ▼
                    createPendingHold(status='pending',   createPendingHold(status='requested',
                     ttl=15min, mode='instant')            ttl=APPROVAL_SLA_HOURS, mode='request')
                     slot HELD (in EXCLUDE set)            slot HELD (in EXCLUDE set), NO charge
                                         │                        │
                            redirect →   │                        │  redirect → "request received"
                        /listings/[id]/book?hold=<id>             │  + email booker + email host
                                         │                        ▼
                                         │            ┌──────────────────────────┐
                                         │            │ /host/requests (RSC)     │
                                         │            │ owner-scoped: listing.host│
                                         │            │  = session.user          │
                                         │            └──────┬────────────┬──────┘
                                         │             Approve│            │Decline
                                         │        (atomic, SLA-│           │(owner-gated)
                                         │         guarded)    ▼           ▼
                                         │      status='approved'    status='declined'
                                         │      ttl=PAYMENT_WINDOW   slot FREED
                                         │      + email booker       + email booker
                                         │      "pay now" (link →    (declined)
                                         │       /book?hold=<id>)
                                         │            │
                                         ▼            ▼
                        confirmBooking ("Confirm & pay")  ── accepts status IN (pending, approved)
                        extend hold (GREATEST) → createCheckoutSession(quotedTotalCents)
                        redirect OFF-SITE to PayMongo hosted checkout
                                         │
                                         ▼
                        ┌────────────────────────────────────────────────┐
                        │ PayMongo webhook  checkout_session.payment.paid │  ◄── SINGLE confirm writer
                        │ verify HMAC → dedupe → UPDATE booking            │      (D-57, unchanged authority)
                        │   SET status='confirmed'                        │
                        │   WHERE id=<ref> AND status IN ('pending',      │  ◄── WIDENED (was 'pending' only)
                        │                                  'approved')     │
                        │   RETURNING id                                  │
                        │  0 rows ─► handleGoneSlot (D-58 auto-refund /   │  ◄── already covers the
                        │            operator-alert — the pay-after-      │      pay-after-release race
                        │            release race)                        │
                        │  ≥1 row ─► fire "booking confirmed" email       │  ◄── BOOK-06 (instant + approval)
                        └────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │ Inngest expiry-sweep (NEW cron, hourly, mirrors payout-sweep)          │
  │  requested  AND expires_at ≤ now()  → declined  + email booker (expired)│  ◄── SLA auto-decline (D-64)
  │  approved   AND expires_at ≤ now()  → cancelled + (optional) email      │  ◄── payment-window auto-release
  │  (lazy read-predicates ALSO free the slot instantly between sweeps)    │
  └───────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (files touched / added)
```
src/
├── lib/db/schema.ts                       # + enum values requested/approved; + booking.bookingMode; flip listing default
├── lib/payments/config.ts                 # + APPROVAL_SLA_HOURS, APPROVAL_PAYMENT_WINDOW_HOURS
├── lib/availability/units.ts              # parameterize createPendingHold (status/ttl/mode); widen 4 predicates
├── lib/availability/read-model.ts         # widen the occupancy predicate (line 108)
├── lib/email.ts                           # + 5 thin lifecycle sends (plain HTML, escapeHtml)
├── app/actions/booking.ts                 # fork placeHold on bookingMode; extend confirmBooking (accept 'approved')
├── app/actions/host-requests.ts   (NEW)   # approveRequest / declineRequest (owner-gated, atomic, SLA-guarded)
├── app/actions/listing.ts                 # createDraftListing default 'request' → 'instant' (D-62)
├── app/api/paymongo/webhook/route.ts      # widen confirm WHERE to IN ('pending','approved'); fire confirmed email
├── app/api/inngest/route.ts               # add requestExpirySweep to serve() functions[]
├── inngest/functions/request-expiry.ts (NEW)  # the dual-timer sweep (mirrors payout-sweep)
├── app/(host)/host/requests/page.tsx (NEW)    # owner-scoped RSC (clone /host/earnings)
├── app/(host)/host/page.tsx               # + pending-count nudge in the action row
├── app/(host)/host/layout.tsx             # + "Requests" nav link (with count)
├── app/listings/[id]/book/page.tsx        # allow status='approved' as an active hold (pay page reused)
└── components/host/request-row.tsx (NEW)  # + expiry countdown (mirror hold-countdown at hours scale)
drizzle/
├── 0010_booking_request_states.sql (NEW)  # ALTER TYPE booking_status ADD VALUE 'requested','approved' (own file!)
├── 0011_booking_request_columns.sql (NEW) # booking.bookingMode column + listing default flip
└── 0012_booking_exclusion_v2.sql   (NEW)  # DROP + re-ADD booking_no_overlap with the widened WHERE
```

### Pattern 1: Request lifecycle over `booking_status` (RESOLVED — Claude's Discretion)

**What:** Add two values to the existing `booking_status` enum. Keep `pending` exclusively for the 15-min instant hold; `requested`/`approved` are the request-to-book holding states. Reuse the already-present-but-unused `declined` and `completed` values.

**Recommended state machine:**

| Status | Meaning | Occupies slot? | expires_at / TTL | Set by |
|--------|---------|:--:|------------------|--------|
| `pending` | Instant-book hold, awaiting payment | ✅ | now()+15min (`HOLD_TTL_MINUTES`) | `createPendingHold` (instant branch) |
| `requested` | **NEW** — request held, awaiting host approval | ✅ | now()+`APPROVAL_SLA_HOURS` (24h) | `createPendingHold` (request branch) |
| `approved` | **NEW** — approved, awaiting booker payment | ✅ | now()+`APPROVAL_PAYMENT_WINDOW_HOURS` (24h) | `approveRequest` |
| `confirmed` | Paid + confirmed (both modes) | ✅ | NULL | webhook `payment.paid` (single writer) |
| `declined` | Host declined OR SLA auto-declined | ❌ | NULL | `declineRequest` / expiry sweep |
| `cancelled` | Abandoned instant hold OR approved-unpaid auto-release OR gone-slot refund | ❌ | NULL | lazy sweep / expiry sweep / D-58 |
| `completed` | (unused; Phase 7+) | ❌ | — | — |

**Transitions:** `requested`→`approved` (approve) · `requested`→`declined` (decline / SLA expiry) · `approved`→`confirmed` (pay+webhook) · `approved`→`cancelled` (payment-window expiry) · `pending`→`confirmed` (instant pay+webhook) · `pending`→`cancelled` (abandon).

**Why this model (not overloading `pending`):**
- **Unambiguous per-status TTL.** The sweep can key the correct timer off the status alone (`requested`→SLA, `approved`→payment window, `pending`→15-min) with no join to `bookingMode` or an extra boolean.
- **Minimal confirm change.** The webhook confirm WHERE goes from `status='pending'` to `status IN ('pending','approved')` — instant pays from `pending`, request pays from `approved`, both → `confirmed`, **one writer, one handler** (honors seam #4).
- **`declined` is already in the enum** [VERIFIED: schema.ts:325-331] and is meaningful for Phase-7 MANAGE-02 status visibility.

**`booking.bookingMode` snapshot (D-61):** Add a nullable `booking.bookingMode` column snapshotting `listing.bookingMode` at creation. **Note:** lifecycle correctness rests entirely on `status`, not on this column — a mid-flight `listing.bookingMode` flip cannot affect an existing `requested`/`approved` row because the actions/sweep key off `status`. `booking.bookingMode` is for display/audit (Phase-7 management views) and to satisfy D-61's "keeps its creation-time mode" explicitly. Nullable + no backfill needed (near-zero real rows; prior bookings were all instant). [CITED: 06-CONTEXT.md D-61]

### Pattern 2: The `placeHold` fork + pay-on-approval reuse

**What:** `placeHold` branches on the server-read `listing.bookingMode`.

**Instant branch (unchanged behavior):** mint `status='pending'`, 15-min TTL → redirect to `/listings/[id]/book?hold=<id>` (pay page) exactly as today.

**Request branch (new):** mint `status='requested'`, `APPROVAL_SLA_HOURS` TTL, no charge → fire "request received" (booker) + "new request" (host) emails → redirect to a request-received confirmation (reuse `/bookings/[id]`, which must render a `requested` state, or a lightweight confirmation).

The `bookingMode` read is a one-line add to the existing `deriveBookable` join in `placeHold` [VERIFIED: booking.ts:110-119 already selects from listing⨝user⨝hostPayout — add `bookingMode: listing.bookingMode` to the select].

**Parameterize `createPendingHold`** (units.ts) to accept `{ holdStatus: 'pending'|'requested', ttlMs, bookingMode }`. It currently hardcodes `status:"pending"` and `expiresAt = now()+HOLD_TTL_MS` [VERIFIED: units.ts:228, 245]. Prefer parameterizing over duplicating — the transaction machinery (SAVEPOINT loop, 40P01 outer-retry, idempotency pre-check, in-tx sweep) is intricate and must not be forked.

**Pay-on-approval reuses `confirmBooking` verbatim** — the "approved → pay now" email links to `/listings/[id]/book?hold=<requestId>`; the booker clicks "Confirm & pay"; `confirmBooking` creates the checkout for the server-frozen `quotedTotalCents` (frozen at request time, D-49) with `referenceNumber = booking.id`. **This is how the request identity flows to the webhook (seam #4)** — the existing `reference_number → bookingId` path is unchanged. Two small edits to `confirmBooking`/the pay page:
1. The `/book` page's "active hold" check (`status==='pending' && expires_at>now()`) [VERIFIED: book/page.tsx:83] must also accept `status==='approved' && expires_at>now()`.
2. `confirmBooking`'s non-pending guard (`status!=='pending'` → expired) [VERIFIED: booking.ts:193] must accept `approved`; and its extend-hold UPDATE [VERIFIED: booking.ts:228-230] must use **`GREATEST(expires_at, now()+PAYMENT_WINDOW_MINUTES)`** so paying an approved request (24h window) is never *shortened* to the 60-min instant window. Scope the UPDATE to `status IN ('pending','approved')`.

**When to use:** the fork is the entry point for BOOK-04/BOOK-05; the reuse is PAY-05.

### Pattern 3: Dual-timer expiry — lazy read + dedicated Inngest sweep

**What:** Two mechanisms, deliberately:
1. **Lazy read predicates** (correctness, free between sweeps): every occupancy read already treats a past-`expires_at` `pending` as free [VERIFIED: read-model.ts:108, units.ts:154/178]. Widen these to `status IN ('pending','requested','approved') AND expires_at > now()`. The instant a `requested`/`approved` row lapses, the slot is free for a new booker — no cron latency in the correctness path.
2. **A dedicated Inngest cron `requestExpirySweep`** (visible flip + email side-effects): mirrors `payout-sweep.ts` exactly — a `queryExpired(db)` → per-row `step.run` mutation. Flips `requested`(past SLA)→`declined` + booker "expired" email; `approved`(past window)→`cancelled` + (optional) email. Hourly (`TZ=Asia/Manila`) is ample for 24h timers (worst-case a lapsed request lingers in the host inbox ≤1h). Add it to `serve()` in `src/app/api/inngest/route.ts` alongside `payoutSweep`/`payoutReconcile` [VERIFIED: 05-05b mounted both there].

**Why both:** lazy-only leaves the visible status stale, never fires the decline/expiry email, and lets the host inbox show a dead request. Cron-only leaves a window where a lapsed slot still blocks new bookers until the next sweep tick. The codebase already uses exactly this dual approach for instant holds (lazy read + in-tx sweep in `createPendingHold`) — extend the philosophy.

**The DB clock is the sole authority** (`now()` in SQL, never a JS/client clock) — mirrors the payout-sweep and confirmBooking discipline [VERIFIED: payout-sweep.ts:79, booking.ts:229].

**In-tx sweep must widen too:** `createPendingHold`'s in-tx stale-hold sweep [VERIFIED: units.ts:222-224] only cancels `status='pending' AND expires_at<=now()`. It must also sweep lapsed `requested`/`approved` so a fresh hold can reclaim a just-lapsed request's slot within the same transaction.

### Pattern 4: Owner-gated, atomic, SLA-guarded approve/decline

**What:** New server actions in `src/app/actions/host-requests.ts` (clone the ownership-gate skeleton from `blocks.ts`/`confirmBooking`).

**Approve (atomic + SLA-guarded):**
```sql
UPDATE booking SET status='approved',
       expires_at = now() + make_interval(hours => ${APPROVAL_PAYMENT_WINDOW_HOURS})
WHERE id = ${requestId}
  AND status = 'requested'
  AND expires_at > now()          -- DB-clock SLA guard: cannot approve a lapsed request
RETURNING id
```
0 rows → calm "this request is no longer pending" (already actioned or lapsed — never a 500). Then fire the "approved → pay now" email. Mirrors `confirmBooking`'s atomic-guard idiom exactly [VERIFIED: booking.ts:228-230].

**Decline:** `UPDATE booking SET status='declined', expires_at=NULL WHERE id=$id AND status='requested' RETURNING id` → fire "declined" email. Freeing the slot is automatic (declined is not in the occupying set).

**Owner-gate (seam #5, IDOR):** BEFORE the UPDATE, load the request joined to its listing and verify `listing.hostId === session.user.id`. The `(host)` route group is NOT the gate (Security V4) — mirror `/host/earnings`'s owner-scope and `confirmBooking`'s owner-gate [VERIFIED: booking.ts:182, earnings/page.tsx:77]. A missing row and a cross-host row return the SAME calm denial so a guessed id leaks nothing.

### Pattern 5: Five thin lifecycle emails (plain HTML over the existing helper)

Extend `src/lib/email.ts` with five sends mirroring `sendVerificationEmail`/`sendResetPassword` (plain HTML string + `escapeHtml` on any interpolated user data — space title, booker name, pay link). **Fire-and-forget** (`void send...`) so a Resend failure can never reject the webhook 200 ACK or block a server action — the auth call sites already do this [VERIFIED: email.ts:6-8 comment].

| # | Email | Recipient | Trigger point | Carries |
|---|-------|-----------|---------------|---------|
| 1 | Booking confirmed | Booker | Webhook `payment.paid`, after a successful confirm UPDATE (≥1 row) — covers **instant AND pay-on-approval** | reference, space, window, total |
| 2 | Request received | Booker | `placeHold` request branch, after minting `requested` | space, window, "awaiting host" |
| 3 | Request approved → pay now | Booker | `approveRequest`, after the atomic approve | **pay link** `/listings/[id]/book?hold=<id>`, window, total, payment-window deadline |
| 4 | Request declined / expired | Booker | `declineRequest` AND the expiry-sweep SLA auto-decline | space, window, "not available" |
| 5 | New booking request | Host | `placeHold` request branch | booker, space, window, quoted price, `/host/requests` link, SLA deadline |

**Note on #1 in the webhook:** the confirm handler currently does a bare `UPDATE ... RETURNING id` [VERIFIED: route.ts:306-308]. To send, it must fetch the booker email + listing title (one extra read). Keep the send fire-and-forget and outside the critical ACK path.

**Note on approved-unpaid auto-release:** D-66 enumerates exactly five sends; the `approved`→`cancelled` (payment-window) release is not explicitly one of them. Fold it under template #4 ("expired") or leave it silent (the booker chose not to pay). Minor — see Open Questions.

### Anti-Patterns to Avoid
- **Adding a second confirm writer for request-to-book.** The `payment.paid` webhook is the SOLE confirm authority (D-57). Request-to-book confirms through the SAME handler by widening the WHERE — never a parallel confirm path.
- **Trusting the host's client-side countdown to gate approve.** The DB `now()` vs `expires_at` is the authority; the atomic `AND expires_at > now()` guard is mandatory (a host clicking "approve" one second after SLA must be refused).
- **Overloading `pending` for three TTL semantics.** Use distinct enum values (Pattern 1).
- **Altering the EXCLUDE constraint's WHERE in place.** Postgres has no `ALTER CONSTRAINT ... WHERE`; you must DROP + ADD (Pitfall 1).
- **Re-adding a QRPh guard on request-to-book.** Under pay-on-approval nothing reverses, so all rails work (D-63). The old QRPh exclusion is dissolved — do not reintroduce it.
- **Awaiting email sends in the webhook or actions.** Fire-and-forget only (Pattern 5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preventing double-booking on a held/approved slot | An app-level "is this slot taken?" query-then-insert | Widen the `booking_no_overlap` GiST EXCLUDE WHERE set | Query-then-insert is the exact race CLAUDE.md forbids; the constraint is DB-atomic. |
| The request-hold transaction (SAVEPOINT/idempotency/retry) | A fresh insert loop for `requested` holds | Parameterize `createPendingHold` | It already handles 23P01/40P01/23505, own-hold idempotency, in-tx sweep. Forking it re-introduces solved bugs (see 04-04 STATE notes). |
| Charging on approval | A new checkout/capture path | Reuse `confirmBooking`→`createCheckoutSession` | Pay-on-approval *is* the Phase-5 checkout (D-63). |
| Confirming the paid request | A confirm write in the approve/pay action | The `payment.paid` webhook (widened WHERE) | Single writer; `?paid=1` is never proof (D-57). |
| The pay-after-release refund edge | New refund logic for request-to-book | The existing D-58 `handleGoneSlot` backstop | A 0-row confirm already auto-refunds/operator-alerts [VERIFIED: route.ts:123-175] — it covers "booker paid after the slot was released/retaken." |
| Background scheduling | A raw `setInterval`/OS cron | An Inngest cron (mirror payout-sweep) | Inngest is the project scheduler (D-56); singleton, timezone-aware, per-row step retries. |
| Email templating | Install React Email | Plain HTML strings + `escapeHtml` in `email.ts` | React Email is not installed; keep the send thin (D-66). |
| Expiry countdown | A new timer lib | Mirror `hold-countdown.tsx` at hours scale | The client countdown pattern (setInterval-only setState, ref-synced, `suppressHydrationWarning`) is solved [VERIFIED: components/booking/hold-countdown referenced in 04-06]. |

**Key insight:** Phase 6's correctness is entirely a function of *widening existing predicates in lockstep* and *reusing existing transactions/writers* — the moment you build a parallel structure (second confirm writer, forked hold transaction, new payment path), you re-open a solved correctness problem.

## Occupancy-Predicate Audit (THE critical artifact)

Introducing `requested`/`approved` as slot-holding states means **every** occupancy/confirm predicate must be widened in lockstep. Miss one and you get either a silent double-book or a paid-but-unconfirmed booking. All sites verified by direct grep on 2026-07-20.

| # | File:Line | Current predicate | Required change | Failure if missed |
|---|-----------|-------------------|-----------------|-------------------|
| 1 | drizzle/0005 EXCLUDE `booking_no_overlap` | `WHERE (status IN ('pending','confirmed'))` | DROP + ADD with `IN ('pending','confirmed','requested','approved')` | **A requested/approved slot does not block a conflicting booking → double-book.** (Most severe.) |
| 2 | `read-model.ts:108` (getAvailability — reused by search Stage-2) | `status='confirmed' OR (status='pending' AND expires_at>now())` | add `requested`,`approved` to the time-bounded set | Calendar + search show a held/approved slot as free → booker collides. |
| 3 | `units.ts:154` (findOwnActiveHold) | same as #2 | same widening | Idempotency/own-hold replay misses request rows. |
| 4 | `units.ts:178` (pickLowestFreeUnit) | same as #2 | same widening | Probe picks an occupied unit (constraint still catches it, but wasted retries). |
| 5 | `units.ts:222-224` (in-tx stale sweep) | `status='pending' AND expires_at<=now()` | sweep `requested`/`approved` lapsed rows too | A just-lapsed request's slot can't be reclaimed in the same tx. |
| 6 | `units.ts:72` (createBooking legacy probe) | `status IN ('pending','confirmed')` | widen (or note dormant) | **Dormant** — `createBooking` has no live caller [VERIFIED: only self-references]. Widen for consistency/defense-in-depth or delete. |
| 7 | `webhook/route.ts:308` (confirm UPDATE) | `status = 'pending'` | `status IN ('pending','approved')` | **A paid request never confirms → booker charged, no booking** (unless D-58 refunds it as gone). |
| 8 | `booking.ts:230` (extend-hold in confirmBooking) | `status = 'pending'` | `status IN ('pending','approved')` + `GREATEST(...)` | The approved-pay path can't extend the hold, or shrinks 24h→60min. |

**Not affected (verified):** search `query.ts` Stage-1 filters on `listing.status='published'` and reuses `getAvailability` for occupancy — no separate booking-status predicate [VERIFIED: query.ts:156,182]. So widening #2 covers search transitively.

## Common Pitfalls

### Pitfall 1: You cannot alter an EXCLUDE constraint's WHERE in place
**What goes wrong:** There is no `ALTER TABLE ... ALTER CONSTRAINT ... WHERE`. Attempting to "add a status to the exclusion" fails.
**How to avoid:** Hand-author a migration that `ALTER TABLE booking DROP CONSTRAINT booking_no_overlap;` then re-`ADD CONSTRAINT` with the widened WHERE — mirroring 0005 exactly (unqualified columns, `WITH SCHEMA public` for btree_gist, idempotent for the test-harness replay) [CITED: drizzle/0005]. Drizzle cannot express EXCLUDE (issues #2813/#3388) — it stays hand-authored.
**Warning sign:** the concurrent-double-book test on a `requested` slot still passes a conflicting insert.
**Concurrency note:** DROP/ADD takes an ACCESS EXCLUSIVE lock and re-scans the table to build the GiST index. Trivial at launch scale (near-zero booking rows); would need `NOT VALID`/careful sequencing at scale (not a v1 concern).

### Pitfall 2: Postgres "unsafe use of new enum value" — enum-add and its first use must be in separate transactions
**What goes wrong:** `ALTER TYPE booking_status ADD VALUE 'requested'` followed by a statement that *references* `'requested'` (e.g. the EXCLUDE WHERE or a CHECK) **in the same transaction** raises `55P04 unsafe use of new value of enum type`. Drizzle-kit runs a migration file's statements within a transaction, so putting the ADD VALUE and the constraint-recreate in one file will fail. [ASSUMED — this is a well-established PG behavior (PG12+ allows ADD VALUE in a tx but forbids using it in the same tx); verify against the project's PG18 + `npm run db:migrate` runner before relying on the exact error code.]
**How to avoid:** Put the two `ALTER TYPE ... ADD VALUE` statements in **their own migration file** (0010), and the DROP/ADD-CONSTRAINT that references them in a **later** file (0012). The `booking.bookingMode` column + listing default flip can go in 0011. This sequencing sidesteps the restriction entirely regardless of the runner's transaction behavior.
**Warning sign:** `npm run db:migrate` errors with `55P04` on the constraint migration.

### Pitfall 3: The webhook confirm-WHERE widening interacts with the D-58 gone-slot backstop — and that's correct
**What goes wrong (that isn't actually wrong):** After widening the confirm to `IN ('pending','approved')`, a `payment.paid` for a request that was **auto-released** (`cancelled`) or **declined** while the booker was mid-checkout claims 0 rows → `handleGoneSlot` fires → auto-refund on refundable rails / operator-alert on QRPh. This is the **desired** behavior: the booker paid after losing the slot; they must be made whole. It's the same D-58 path instant-book already uses. D-63's "nothing is ever refunded" holds for the *happy* path — this is the race edge, identical to instant-book's.
**How to avoid mis-handling:** Do NOT add special-case refund logic for request-to-book — the existing `handleGoneSlot` [VERIFIED: route.ts:123-175] already covers it. Just widen the WHERE.
**Warning sign:** a test that pays an already-released request expects a stuck interstitial instead of PaymentReversedState.

### Pitfall 4: Inngest 4.13.0 uses the 2-arg `createFunction(options, handler)` API
**What goes wrong:** The older 3-arg `createFunction(config, trigger, handler)` skeleton (in earlier RESEARCH docs) does not match the installed inngest 4.13.0 — the cron trigger lives in `options.triggers: [{ cron: "TZ=Asia/Manila 0 * * * *" }]` [VERIFIED: payout-sweep.ts:190-197, STATE 05-05a deviation note].
**How to avoid:** Copy the exact `payoutSweep`/`payoutReconcile` `createFunction` shape (2-arg, `concurrency:1`, `triggers`). Offset the cron minute from the two payout crons (they run at `0` and `30`) so the three sweeps never contend — e.g. `15 * * * *`.

### Pitfall 5: Timezone-naive expiry math
**What goes wrong:** Computing `expires_at` with JS wall-clock arithmetic, or displaying the host inbox countdown in the wrong tz.
**How to avoid:** Compute `expires_at` with SQL `now() + make_interval(hours => ...)` (DB clock, UTC-anchored) as the payout sweep and confirmBooking do [VERIFIED: payout-sweep.ts:79, booking.ts:229]. Display the countdown/deadline venue-local via `TZDate`/`format({in: tz})` as `/host/earnings` does [VERIFIED: earnings/page.tsx:92-108]. All timestamps are `timestamptz` UTC (CLAUDE.md).

### Pitfall 6: The extend-hold shrinking the approved payment window
**What goes wrong:** `confirmBooking` currently extends `expires_at` to `now()+PAYMENT_WINDOW_MINUTES` (60 min) [VERIFIED: booking.ts:229]. For an `approved` request with a 24h window, a naive extend would *shorten* it to 60 min.
**How to avoid:** Use `expires_at = GREATEST(expires_at, now()+make_interval(mins => PAYMENT_WINDOW_MINUTES))` and scope to `status IN ('pending','approved')`.

## Code Examples

### Occupancy predicate — the widened lazy-expiry read (apply at sites #2/#3/#4)
```sql
-- Source: extends read-model.ts:108 (verified 2026-07-20)
-- was: status = 'confirmed' OR (status = 'pending' AND expires_at > now())
AND (status = 'confirmed'
     OR (status IN ('pending','requested','approved') AND expires_at > now()))
```

### EXCLUDE constraint recreate (hand-authored, own migration after the enum-add)
```sql
-- Source: DROP+ADD pattern mirroring drizzle/0005 (verified). Runs AFTER the enum-add migration.
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "unit" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('pending', 'confirmed', 'requested', 'approved'));
```

### Webhook confirm — widened WHERE (seam #4)
```sql
-- Source: extends webhook/route.ts:307-308 (verified). Instant pays from 'pending', request from 'approved'.
UPDATE booking SET status = 'confirmed', expires_at = NULL, payment_id = ${paymentId}
WHERE id = ${bookingId} AND status IN ('pending','approved') RETURNING id
-- 0 rows still routes to handleGoneSlot (D-58) — which is exactly the pay-after-release refund path.
```

### Approve action — atomic + SLA-guarded (owner-gate precedes this)
```sql
-- Source: mirrors confirmBooking's atomic guard idiom (booking.ts:228-230, verified).
UPDATE booking SET status = 'approved',
       expires_at = now() + make_interval(hours => ${APPROVAL_PAYMENT_WINDOW_HOURS})
WHERE id = ${requestId} AND status = 'requested' AND expires_at > now()
RETURNING id
-- 0 rows → "this request is no longer pending" (already actioned / lapsed) — never a 500.
```

### Expiry sweep query (mirror payout-sweep.ts:69-92)
```sql
-- Source: pattern mirrors queryDuePayouts (verified). DB clock now() is the sole authority.
SELECT id, status, listing_id, booker_id FROM booking
WHERE (status = 'requested' AND expires_at <= now())   -- SLA auto-decline
   OR (status = 'approved'  AND expires_at <= now())    -- payment-window auto-release
ORDER BY expires_at ASC
LIMIT 100
-- then per-row step.run: requested → declined (+email); approved → cancelled (+optional email)
```

## Runtime State Inventory

This is a schema-extension phase with live-DB migration consequences. Explicit per-category findings:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `booking` rows — existing rows are instant-flow only (`pending`/`confirmed`/`cancelled`); no `requested`/`approved` rows exist. Adding enum values is a schema change, **not** a data migration — existing rows untouched. `booking.bookingMode` new column: nullable, no backfill required (near-zero real bookings; all prior were instant). | Apply 0010–0012 via `npm run db:migrate`. No row backfill. |
| **Live service config** | **Inngest** registers functions by id. Adding `requestExpirySweep` requires it in the `serve()` `functions[]` array [VERIFIED: 05-05b mounts payoutSweep+payoutReconcile in `app/api/inngest/route.ts`]. In prod, Inngest re-syncs on deploy; in dev, the Inngest Dev Server picks it up from the serve mount. | Add the function to `serve()`. No dashboard/manual step (crons are code-registered). |
| **OS-registered state** | None — all scheduling is Inngest, not OS cron / Task Scheduler. | None — verified: the only schedulers are Inngest crons. |
| **Secrets/env vars** | `APPROVAL_SLA_HOURS` + `APPROVAL_PAYMENT_WINDOW_HOURS` join `config.ts` (read via `process.env` with defaults, like the existing constants) [VERIFIED: config.ts pattern]. **No new secrets** — Resend/PayMongo/Inngest keys already exist. | Add the two keys (with defaults) to `.env.example`. |
| **Build artifacts** | None — no compiled packages, no egg-info equivalents. Next.js recompiles from source. | None. |

**Canonical question — after every file is updated, what runtime state still carries old behavior?** The **live database** does: the `booking_no_overlap` constraint and the `booking_status` enum must be migrated (`npm run db:migrate`) before the new statuses can be inserted or will block conflicts. The enum-add migration MUST run before the constraint-recreate (Pitfall 2). This is the one mandatory runtime step; everything else is code.

## Validation Architecture

*(nyquist_validation is enabled — config.json `workflow.nyquist_validation: true`.)*

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 (integration, isolated-schema DB harness) + Playwright 1.60.0 (E2E, present) [VERIFIED: package.json] |
| Config file | `vitest.config.*` (present); DB harness `tests/helpers/db.ts` (`setupTestDb`/`makeRacingClients`); mocks `tests/helpers/mocks.ts` (`mockPayMongo`, `mockResend`) |
| Quick run command | `npx vitest run tests/booking tests/paymongo tests/payments` |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior (observation point) | Test Type | Automated Command | File Exists? |
|--------|------------------------------|-----------|-------------------|--------------|
| BOOK-05 / BOOK-03 | **Concurrent double-book on a `requested` slot fails** (EXCLUDE widened) | integration (race via `makeRacingClients`) | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ Wave 0 |
| BOOK-05 / BOOK-03 | Concurrent double-book on an `approved` slot fails | integration | same file | ❌ Wave 0 |
| BOOK-04/05 | `placeHold` forks: request-mode → `requested` (no checkout, "received" redirect); instant-mode → `pending` unchanged | integration | same file | ❌ Wave 0 |
| HOST-01 | Approve is atomic + SLA-guarded (0 rows on a lapsed `requested`) | integration | same file | ❌ Wave 0 |
| HOST-01 / Security V4 | **Owner-gate**: a different host/booker cannot approve/decline host-A's request (no state change) | integration | same file | ❌ Wave 0 |
| BOOK-05 | SLA auto-decline: `requested` past `expires_at` → `declined` + slot freed + booker email | integration (DB-clock manip) | `npx vitest run tests/booking/request-expiry.test.ts` | ❌ Wave 0 |
| PAY-05 | Payment-window auto-release: `approved` past `expires_at` → `cancelled` + slot freed | integration | same file | ❌ Wave 0 |
| PAY-05 / BOOK-06 | **Webhook confirms the right request row**: `payment.paid` w/ ref=`approved` id → `confirmed` | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` (extend) | ⚠️ extend existing |
| PAY-05 | Pay-after-release race: `payment.paid` for a released/`cancelled` request → `handleGoneSlot` refund/alert (D-58) | integration | same (extend) | ⚠️ extend existing |
| BOOK-06 | Confirmed email fires from the webhook on a successful confirm (instant + approval) | integration (`mockResend.sent()`) | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ⚠️ extend existing |
| BOOK-06 | Lifecycle emails fire at each trigger (received, approved-pay-link, declined) | integration (`mockResend`) | `tests/booking/request-lifecycle.test.ts` | ❌ Wave 0 |
| BOOK-04 | D-62 default: `createDraftListing` → `bookingMode='instant'` | unit/integration | `npx vitest run tests/listing` (extend) | ⚠️ extend existing |
| D-61 | Mode-flip independence: flipping `listing.bookingMode` does not alter an in-flight `requested`/`approved` row | integration | `tests/booking/request-lifecycle.test.ts` | ❌ Wave 0 |
| HOST-01 | `/host/requests` owner-scope: host A sees only A's requests | integration | `tests/booking/request-lifecycle.test.ts` or a host-scope test (mirror earnings-view.test.ts) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/booking tests/paymongo tests/payments` (the touched suites, < 30s).
- **Per wave merge:** `npm test` (full `vitest run`).
- **Phase gate:** full suite green before `/gsd-verify-work`; the concurrent-double-book-on-`requested`/`approved` race test is the non-negotiable correctness gate.

### Wave 0 Gaps
- [ ] `tests/booking/request-lifecycle.test.ts` — the fork, approve/decline atomicity + SLA guard, owner-gate, concurrent double-book on `requested`/`approved`, mode-flip independence, `/host/requests` owner-scope, lifecycle-email assertions. Clone the harness from `tests/booking/state-machine.test.ts` (real actions via `vi.doMock`, `mockPayMongo`, `mockResend`, redirect-capture) [VERIFIED: state-machine.test.ts pattern].
- [ ] `tests/booking/request-expiry.test.ts` — SLA auto-decline + payment-window auto-release sweep (DB-clock manipulation via `UPDATE ... expires_at = now() - interval`), mirroring `tests/payments/payout-sweep.test.ts`.
- [ ] Extend `tests/paymongo/webhook-payment-paid.test.ts` — `approved`→`confirmed`; pay-after-release → `handleGoneSlot`; confirmed-email fires.
- [ ] Extend `tests/listing/*` — D-62 default flip.
- [ ] No framework install needed — Vitest + the DB harness + `mockPayMongo`/`mockResend` already cover everything [VERIFIED: mocks.ts has createCheckoutSession/createRefund + mockResend.sent()].

## Security Domain

*(security_enforcement enabled, ASVS L1 — config.json `workflow.security_enforcement: true`, `security_asvs_level: 1`.)*

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged) | Better Auth session; `placeHold`/actions require `requireUserId()` [VERIFIED: booking.ts:67]. |
| V3 Session Management | no (unchanged) | Better Auth DB sessions. |
| V4 Access Control | **yes** | **Owner-gate approve/decline** (verify `listing.hostId === session.user.id` in the action); `/host/requests` owner-scoped read (`WHERE listing.host_id = session.user.id`); `/book` + `confirmBooking` already owner-gate. The route group is NEVER the gate (mirror `/host/earnings`). |
| V5 Input Validation | **yes** | Actions take only an opaque `requestId` (uuid); no client amount/state. The pay-link carries only `hold=<id>`; the charge amount is the server-frozen `quotedTotalCents` (D-49). Zod re-validation on any form input. |
| V6 Cryptography | yes (reuse) | PayMongo webhook HMAC-SHA256 verification (existing, single confirm authority); booking reference derivation (existing). Never hand-roll — reuse. |

### Known Threat Patterns for {Next.js server actions + PayMongo webhook + Postgres}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on approve/decline/pay (act on another host's request or another booker's hold) | Elevation / Tampering | Server-side ownership re-check via `listing.hostId` join; identical calm denial for missing vs cross-host (leak nothing). |
| Double-booking via an un-widened exclusion set | Tampering | Widen the GiST EXCLUDE WHERE + all occupancy predicates in lockstep (Occupancy-Predicate Audit). |
| Confirm-authority bypass (booker forges "paid") | Spoofing | The `payment.paid` webhook (HMAC-verified) is the sole confirm writer; `?paid=1` is never proof (D-57). |
| Client-clock expiry bypass (approve a lapsed request / pay a released slot) | Tampering | DB-clock `now()` guards in atomic UPDATEs; D-58 gone-slot refund for pay-after-release. |
| Late/duplicate payment double-charge | Tampering | `Idempotency-Key: checkout:<id>` (existing) + `paymongo_event` dedupe + D-58 refund. |
| HTML/markup injection via email interpolation (space title, booker name) | Tampering | `escapeHtml` on every interpolated field (existing pattern, email.ts:25). |
| Payout to a not-onboarded host (unchanged) | — | Bookability gate on `payoutsEnabled` (existing, `deriveBookable`). |

## State of the Art

| Old Approach (pre-Phase-6 / superseded) | Current Approach | When Changed | Impact |
|------------------------------------------|------------------|--------------|--------|
| Request-to-book via authorize→capture | **Pay-on-approval** (no hold; pay after approve) | D-63, 2026-07-19 | ROADMAP SC #2/#3 + REQUIREMENTS PAY-05 corrected; QRPh back in scope. |
| CLAUDE.md "Request-to-book capture: QRPh/GCash/Maya = capture-now → refund-on-decline" | **Superseded** — pay-on-approval, no refund on decline | D-63 | Do NOT follow the refund-on-decline line in CLAUDE.md. |
| `listing.bookingMode` default `'request'` | Default `'instant'` (demand-first) | D-62 | Migration + create-wizard default; existing listings unaffected. |
| `bookingMode` stored but not forked (D-40) | Phase 6 is where it forks | This phase | `placeHold` branches on it. |

**Deprecated/outdated:**
- CLAUDE.md § "Marketplace Payments" "Request-to-book capture (Phase 6)" line — superseded by D-63 (pay-on-approval). Card manual-capture remains gated/unbuilt.
- The 3-arg Inngest `createFunction` skeleton in prior RESEARCH docs — the installed 4.13.0 uses the 2-arg form (Pitfall 4).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Postgres raises `55P04` when a newly-`ADD VALUE`'d enum value is *used* in the same transaction; drizzle-kit runs a migration file in one tx | Pitfall 2 | LOW — the recommended mitigation (enum-add in its own migration file BEFORE the constraint-recreate) sidesteps the issue regardless of the exact behavior. Verify by running `npm run db:migrate` on the split migrations against the live PG18. |
| A2 | `booking.bookingMode` needs no row backfill (near-zero real booking rows; all prior instant-flow) | Pattern 1, Runtime State | LOW — if UAT bookings exist, a one-line `UPDATE booking SET booking_mode='instant' WHERE booking_mode IS NULL` covers it; nullable column is safe either way. |
| A3 | The approved-unpaid auto-release (payment-window) does not require its own email (D-66 lists 5 sends; release isn't one) | Pattern 5, Open Questions | LOW — cosmetic; fold under the "expired" template or leave silent. Confirm with the user/planner. |
| A4 | `createBooking` (units.ts:59) has no live caller and its probe (#6) is dormant | Occupancy-Predicate Audit | LOW — verified by grep (only self-references). Widen or delete for consistency; no runtime path depends on it today. |
| A5 | Hourly cron cadence is acceptable for 24h SLA/payment timers (≤1h staleness in the host inbox) | Pattern 3 | LOW — D-64 accepts ≤48h worst-case holds; ±1h is immaterial. Lazy read predicates free the slot instantly regardless. |
| A6 | The in-tx stale-hold sweep (units.ts) reclassifying a lapsed `requested` row to `declined` may drop the D-66 declined/expired booker email on the rare in-tx-reclaim edge (a fresh overlapping hold reclaims the slot before the SLA cron ticks) | Pattern 3 / Occupancy sweep (Plans 06-02, 06-06) | LOW — the terminal STATUS is still correct (`declined`, mirroring the cron) so double-booking + status-consistency are unaffected; only the notification is skipped, and only when a new booker is simultaneously taking the just-lapsed slot. The cron (06-06) is the sole email authority; firing email inside the hold's rollback/retry DB tx is architecturally unsafe. Accepted bounded race — surfaced by Checker Warning 1. |

**These assumptions are all LOW-risk with in-place mitigations; none block planning.** A1 is the only one worth a quick confirmation during implementation (run the split migrations).

## Open Questions (RESOLVED)

1. **Approved-unpaid auto-release notification**
   - What we know: D-66 enumerates 5 sends; the `approved`→`cancelled` payment-window release is not explicitly listed.
   - What's unclear: whether the booker should get an email when their approved request auto-releases for non-payment.
   - Recommendation: reuse template #4 ("declined/expired") for it, or leave silent (the booker chose not to pay). Planner/UI call; not a blocker.
   - **RESOLVED:** No dedicated email — the payment-window auto-release (`approved`→`cancelled`, Plan 06-06 Task 1) is silent per Assumption A3 (D-66 enumerates 5 sends; release is not one).

2. **Request-received on-screen confirmation surface**
   - What we know: D-66 says on-screen confirmation reuses `/bookings/[id]`.
   - What's unclear: `/bookings/[id]` currently only renders `confirmed`/`pending`+`paid`/`cancelled`+`paid` [VERIFIED: bookings/[id]/page.tsx:74-87] — it will `notFound()` on a `requested` row. It needs a `requested` branch ("Request sent — awaiting host") or a distinct lightweight page.
   - Recommendation: add a `requested` branch to `/bookings/[id]` (cheapest reuse) rendering an "awaiting host" state; the redirect target of `placeHold`'s request branch. Planner's call on page vs branch.
   - **RESOLVED:** `/bookings/[id]` gets `requested` + `approved` branches (Plan 06-08 Task 2); `placeHold`'s request branch redirects there (Plan 06-04 Task 1).

3. **`declined` vs `cancelled` semantics for the two expiry timers**
   - What we know: recommended model uses `declined` for host-decline + SLA-auto-decline, `cancelled` for approved-unpaid release + abandoned instant holds.
   - What's unclear: whether the SLA auto-decline should be `declined` (treated as a host "no") or `cancelled`.
   - Recommendation: SLA expiry → `declined` (D-64 wording: "auto-declines"); payment-window expiry → `cancelled` (booker abandonment). Confirm during planning; both are non-occupying so double-booking is unaffected either way.
   - **RESOLVED:** SLA auto-decline → `declined`, payment-window auto-release → `cancelled` (Plan 06-06 Task 1); the same terminal mapping is mirrored by the in-tx reclaim sweep (Plan 06-02 Task 2, Warning-1 reconciliation).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 18 + btree_gist + PostGIS | EXCLUDE recreate, occupancy predicates | ✓ (running via `postgis/postgis:18`) | 18 / 3.x | — |
| Inngest (dev server) | request-expiry cron | ✓ (already runs payout crons) | 4.13.0 | — |
| Resend (or dev-log fallback) | 5 lifecycle emails | ✓ (dev fallback logs the link when `RESEND_API_KEY` unset) | 6.12.4 | dev-log fallback (built-in) |
| PayMongo hosted checkout | pay-on-approval | ✓ test-mode / `mockPayMongo` in tests | REST /v1 | mock in tests; real UAT-gated on PayMongo beta (existing standing blocker) |
| drizzle-kit migrate (`npm run db:migrate`) | apply 0010–0012 | ✓ | 0.31.10 | — |

**Missing dependencies with no fallback:** none — Phase 6 adds no new external dependency.
**Missing dependencies with fallback:** real PayMongo money-movement remains UAT-gated on the /v2 beta (a standing STATE blocker, not a code blocker — all code + tests run on `mockPayMongo`). Pay-on-approval uses the SAME hosted checkout as instant-book, which was proven mockable in Phase 5.

## Project Constraints (from CLAUDE.md)

- **Double-booking is DB-enforced only.** Never application-level query-then-insert — extend the GiST EXCLUDE (Occupancy-Predicate Audit).
- **Pay-on-approval is the money model (D-63 supersedes the CLAUDE.md "capture-now → refund-on-decline" line).** Do NOT follow the refund-on-decline guidance. Nothing reverses on the happy path.
- **PayMongo: no official SDK.** Reuse the existing thin `fetch` wrapper; `Idempotency-Key` on POSTs; verify `Paymongo-Signature` on webhooks (existing).
- **Never pay the host at booking time / never keep money for an undeliverable slot.** Unchanged; the D-58 backstop covers the pay-after-release edge.
- **Store all times as `timestamptz` (UTC); convert at the edges.** Expiry math uses SQL `now()`; display uses `TZDate` venue-local.
- **Money is integer minor units (centavos); server-frozen.** The pay-on-approval charge is the request-time-frozen `quotedTotalCents` (D-49).
- **GSD workflow enforcement:** all edits go through a GSD command (this is research only).

## Sources

### Primary (HIGH confidence — direct source read, 2026-07-20)
- `.planning/phases/06-full-booking-payment-integration/06-CONTEXT.md` — D-61..D-66, canonical refs, Claude's Discretion.
- `.planning/REQUIREMENTS.md` — BOOK-04/05/06, PAY-05, HOST-01 (PAY-05 reworded to pay-on-approval).
- `.planning/STATE.md` — Phase 3/4/5 accumulated decisions (exclusion set, lazy expiry, webhook confirm authority, payout sweep, inngest 4.13.0 API).
- `src/lib/db/schema.ts` — `booking_status` enum (line 325), `booking_no_overlap` note (line 376), `listing.bookingMode` default (line 180), `booking.status` (line 399).
- `src/lib/availability/units.ts` — `createPendingHold` transaction; occupancy predicates (72/154/178); in-tx sweep (222-224); TTL (116/228).
- `src/lib/availability/read-model.ts` — `getAvailability` occupancy predicate (line 108).
- `src/app/api/paymongo/webhook/route.ts` — confirm WHERE (308); `handleGoneSlot` D-58 backstop (123-175); single-writer/dedupe.
- `src/app/actions/booking.ts` — `placeHold` fork point (110-148); `confirmBooking` extend-hold (228-230) + guards (182/193).
- `src/app/(host)/host/earnings/page.tsx` + `host/page.tsx` + `host/layout.tsx` — the owner-scoped RSC + nav-nudge pattern to clone.
- `src/inngest/functions/payout-sweep.ts` — the cron pattern (2-arg `createFunction`, DB-clock sweep, per-row step.run) to mirror.
- `src/lib/email.ts` + `tests/helpers/mocks.ts` — the thin send + dev fallback + `mockResend` test capture.
- `src/lib/payments/config.ts` — named-config pattern for the two new SLA/window constants.
- `drizzle/0005_booking_exclusion.sql` + `0009_booking_status_default_pending.sql` — hand-authored EXCLUDE + ALTER DEFAULT idioms to mirror.
- `package.json` — installed versions (inngest 4.13.0, resend 6.12.4, drizzle-orm 0.45.2, next 16.2.7, zod 4.4.3, vitest 4.1.8, etc.).
- `.planning/config.json` — nyquist_validation + security_enforcement enabled (ASVS L1).

### Secondary (MEDIUM confidence)
- STATE.md 05-* execution notes for the webhook/D-58 and payout-sweep behavior (cross-verified against the source files).

### Tertiary (LOW confidence — flagged for validation)
- Postgres `55P04` enum-in-same-transaction behavior (Pitfall 2 / A1) — well-established but not re-verified this session against PG18 + the project's migrator; mitigated by migration-file splitting regardless.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from package.json; zero new deps.
- Architecture / state model: HIGH — resolved from direct source read of every seam and predicate; the fan-out is enumerated exactly.
- Occupancy-predicate audit: HIGH — every site verified by grep with line numbers on 2026-07-20.
- Pitfalls: HIGH for the codebase-derived ones; MEDIUM for the PG enum-transaction gotcha (mitigated regardless).
- Emails / UI: HIGH on mechanism; LOW-consequence discretion items flagged as Open Questions.

**Research date:** 2026-07-20
**Valid until:** ~2026-08-20 (stable — internal codebase, project-locked stack; re-verify only if the schema or PayMongo integration changes).
