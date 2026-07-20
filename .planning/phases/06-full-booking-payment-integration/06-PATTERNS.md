# Phase 6: Full Booking + Payment Integration - Pattern Map

**Mapped:** 2026-07-20
**Files analyzed:** 20 code files (7 NEW, 13 MODIFY) + 3 migrations + 4 test targets
**Analogs found:** 24 / 24 (this is an extension phase — every new file has an in-repo analog; ZERO net-new libraries)

> **Read-first for the planner:** Phase 6 is a *widen-existing-predicates-and-reuse-existing-writers* phase, not a new-capability phase. The dominant pattern is **"copy the existing site, add the two new statuses (`requested`/`approved`) in lockstep"**. The single most dangerous cross-cutting concern is the **Occupancy-Predicate fan-out** (see Shared Pattern A) — 8 sites must be widened together or you get a silent double-book or a paid-but-unconfirmed booking. Every analog below is in the same codebase, so "closest analog" is almost always **the file itself** (extend, don't rebuild).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/db/schema.ts` (MOD) | model / schema | CRUD | self — `bookingStatus` enum (325-331) + `booking` table (381-419) | exact (self-extend) |
| `src/lib/payments/config.ts` (MOD) | config | — | self — `PAYMENT_WINDOW_MINUTES` etc. (13-31) | exact (self-extend) |
| `src/lib/availability/units.ts` (MOD) | service / data-access | transform | self — `createPendingHold` (191-282) | exact (self-extend) |
| `src/lib/availability/read-model.ts` (MOD) | service / read-model | transform | self — occupancy predicate (105-110) | exact (self-extend) |
| `src/lib/email.ts` (MOD) | utility / transport | request-response (external) | self — `sendVerificationEmail` (54-57) | exact (self-extend) |
| `src/app/actions/booking.ts` (MOD) | controller / server-action | request-response | self — `placeHold` (78-149) / `confirmBooking` (163-263) | exact (self-extend) |
| `src/app/actions/host-requests.ts` (**NEW**) | controller / server-action | request-response | `blocks.ts` (owner-gate skeleton) + `booking.ts` confirmBooking (atomic guard) | role + flow match |
| `src/app/actions/listing.ts` (MOD) | controller / server-action | CRUD | self — `createDraftListing` (70-83) | exact (self-extend) |
| `src/app/api/paymongo/webhook/route.ts` (MOD) | route / webhook | event-driven | self — confirm UPDATE (306-308) + `handleGoneSlot` (123-175) | exact (self-extend) |
| `src/app/api/inngest/route.ts` (MOD) | route / config | — | self — `serve()` mount (31-34) | exact (self-extend) |
| `src/inngest/functions/request-expiry.ts` (**NEW**) | service / cron job | batch + event-driven | `src/inngest/functions/payout-sweep.ts` | role + flow match (near-clone) |
| `src/app/(host)/host/requests/page.tsx` (**NEW**) | component / RSC page | CRUD (read) | `src/app/(host)/host/earnings/page.tsx` | role + flow match (clone) |
| `src/app/(host)/host/page.tsx` (MOD) | component / RSC | CRUD (read) | self — action row (63-75) + count query (34-38) | exact (self-extend) |
| `src/app/(host)/host/layout.tsx` (MOD) | component / layout | — | self — nav links (49-61) | exact (self-extend) |
| `src/app/listings/[id]/book/page.tsx` (MOD) | component / RSC | request-response | self — active-hold check (83) | exact (self-extend) |
| `src/app/bookings/[id]/page.tsx` (MOD) | component / RSC | request-response | self — status branch (74-87) | exact (self-extend) |
| `src/components/host/request-row.tsx` (**NEW**) | component | — | `src/components/booking/hold-countdown.tsx` (hours scale) + `src/components/host/payout-row.tsx` | role match |
| `drizzle/0010_booking_request_states.sql` (**NEW**) | migration | — | `drizzle/0008_payout_ledger.sql` (`CREATE TYPE`) — but this is `ALTER TYPE … ADD VALUE` | role match |
| `drizzle/0011_booking_request_columns.sql` (**NEW**) | migration | — | `drizzle/0006_booking_hold.sql` (ADD COLUMN) + `drizzle/0009` (ALTER DEFAULT) | role match |
| `drizzle/0012_booking_exclusion_v2.sql` (**NEW**) | migration | — | `drizzle/0005_booking_exclusion.sql` (EXCLUDE) | exact (recreate) |
| `tests/booking/request-lifecycle.test.ts` (**NEW**) | test | — | `tests/booking/state-machine.test.ts` | role match |
| `tests/booking/request-expiry.test.ts` (**NEW**) | test | — | `tests/payments/payout-sweep.test.ts` | role match |
| `tests/paymongo/webhook-payment-paid.test.ts` (MOD) | test | — | self — extend | exact (self-extend) |
| `tests/listing/*` (MOD) | test | — | `tests/listing/crud.test.ts` | role match |

---

## Pattern Assignments

### `src/lib/db/schema.ts` (model, CRUD) — MODIFY

**Analog:** self. Three edits: (1) add two enum values, (2) add `booking.bookingMode` snapshot column, (3) flip `listing.bookingMode` default.

**Enum-add** — the existing `bookingStatus` pgEnum is the exact site (lines 325-331). Add `requested` + `approved`; `declined`/`completed` already exist:
```typescript
export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "declined",
  "completed",
  // Phase 6 (D-63): request-to-book holding states. requested = awaiting host approval;
  // approved = awaiting booker payment. BOTH occupy the slot (widen the EXCLUDE + all read predicates).
  "requested",
  "approved",
]);
```
> Order note: Drizzle only *declares* the enum; the live-DB value-add is the hand-authored `ALTER TYPE … ADD VALUE` migration (0010). Appending to the array here is a declaration sync, not the DB change.

**`booking.bookingMode` snapshot column** — copy the existing `bookingMode` pgEnum reuse (line 137, already used by `listing.bookingMode` line 180). Add a nullable column to the `booking` table alongside the Phase-4 hold columns (402-409):
```typescript
// Snapshot of listing.bookingMode at creation (D-61) — display/audit only. Lifecycle correctness
// rests on `status`, NOT this column (a mid-flight listing flip cannot affect a live requested/approved row).
bookingMode: bookingMode("booking_mode"), // nullable; no backfill (near-zero prior rows, all instant)
```

**Default flip (D-62)** — `listing.bookingMode` currently `.default("request")` (line 180). Flip to `"instant"`. The live-DB flip is the `ALTER … SET DEFAULT` in migration 0011 (mirror `drizzle/0009`).

**Exclusion note to update** — the hand-authored-EXCLUDE comment (lines 370-376) documents `WHERE status IN ('pending','confirmed')`. Update the prose to `('pending','confirmed','requested','approved')` and point at 0012.

---

### `src/lib/payments/config.ts` (config) — MODIFY

**Analog:** self. Add two constants beside `PAYMENT_WINDOW_MINUTES` (lines 18-20), using the identical `Number(process.env.X ?? default)` idiom:
```typescript
/** Host approval SLA (D-64). A `requested` hold auto-declines if the host doesn't act within this window. */
export const APPROVAL_SLA_HOURS = Number(process.env.APPROVAL_SLA_HOURS ?? 24);

/** Post-approval payment window (D-64). An `approved` hold auto-releases if unpaid within this window. */
export const APPROVAL_PAYMENT_WINDOW_HOURS = Number(process.env.APPROVAL_PAYMENT_WINDOW_HOURS ?? 24);
```
Add both (with defaults) to `.env.example`. **No new secrets.** File header already documents "MECHANISM DEFAULTS Phase 7 can tune" — these fit exactly.

---

### `src/lib/availability/units.ts` (service, transform) — MODIFY

**Analog:** self — `createPendingHold` (191-282). **Parameterize, do NOT fork** (the SAVEPOINT/40P01-retry/idempotency machinery is intricate — Research "Don't Hand-Roll").

**Widen the two lazy-expiry predicates** — `findOwnActiveHold` (line 154) and `pickLowestFreeUnit` (line 178) share the same predicate:
```sql
-- was: (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))
(status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
```

**Widen the in-tx stale sweep** (lines 221-224) — currently only cancels `status = 'pending' AND expires_at <= now()`. Widen the status set so a just-lapsed `requested`/`approved` frees within the same tx:
```sql
UPDATE booking SET status = 'cancelled'
WHERE listing_id = ${input.listingId}
  AND status IN ('pending','requested','approved') AND expires_at <= now()
  AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startIso}, ${endIso}, '[)')
```

**Parameterize the hold status + TTL** — `createPendingHold` hardcodes `status: "pending"` (line 245) and `expiresAt = now()+HOLD_TTL_MS` (line 228). Add `{ holdStatus, ttlMs, bookingMode }` to `CreatePendingHoldInput` (122-131) with `pending`/15-min defaults so the instant branch is unchanged.

**Dormant probe (#6):** `createBooking`'s `IN ('pending','confirmed')` (line 72) has no live caller — widen for defense-in-depth or leave a note; not load-bearing.

---

### `src/lib/availability/read-model.ts` (service, transform) — MODIFY

**Analog:** self — the occupancy predicate at line 108 (inside `getAvailability`, the read model reused by search Stage-2):
```sql
-- was: (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))
(status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
```
Keep the comment (100-104) truthful — `requested`/`approved` now also occupy; `cancelled`/`declined`/`completed` still never occupy. Widening this ONE site covers search transitively (search reuses `getAvailability`).

---

### `src/lib/email.ts` (utility, external request-response) — MODIFY

**Analog:** self — `sendVerificationEmail` (54-57) + `send` (34-52) + `escapeHtml` (25-32). Add five plain-HTML sends (Research Pattern 5). **NEVER install React Email** (not present; "keep the send thin", D-66). `escapeHtml` EVERY interpolated user field (space title, booker name, pay link).

**Copy this exact shape** (mirrors the existing two exports):
```typescript
export const sendRequestReceived = (to: string, spaceTitle: string, windowLabel: string) => {
  const t = escapeHtml(spaceTitle);
  return send(to, "Your booking request was sent", `We sent your request for <strong>${t}</strong> (${escapeHtml(windowLabel)}). We'll email you when the host responds.`);
};
export const sendRequestApproved = (to: string, spaceTitle: string, payUrl: string) => {
  const safe = escapeHtml(payUrl); // WR-01 — never interpolate a raw url into HTML.
  return send(to, "Your request was approved — pay to confirm", `<strong>${escapeHtml(spaceTitle)}</strong> is approved. Pay now to lock it in: <a href="${safe}">${safe}</a>`);
};
// + sendRequestDeclined, sendNewRequestToHost, sendBookingConfirmed (all same pattern)
```

**Call-site discipline (fire-and-forget):** every caller uses `void send...(...)` — verified in `src/lib/auth.ts:73-81` (`void sendResetPassword(...)`). The webhook and the actions MUST NOT `await` these (a Resend failure can never reject a 200 ACK or block a server action).

| # | Export | Recipient | Fired from |
|---|--------|-----------|------------|
| 1 | `sendBookingConfirmed` | booker | webhook `route.ts`, after a ≥1-row confirm (instant + pay-on-approval) — BOOK-06 |
| 2 | `sendRequestReceived` | booker | `booking.ts` placeHold request branch |
| 3 | `sendRequestApproved` | booker | `host-requests.ts` approveRequest (carries `/listings/[id]/book?hold=<id>`) |
| 4 | `sendRequestDeclined` | booker | `host-requests.ts` declineRequest + `request-expiry.ts` SLA sweep |
| 5 | `sendNewRequestToHost` | host | `booking.ts` placeHold request branch |

**Test hook:** `tests/helpers/mocks.ts` `mockResend.sent()` / `.lastLink()` capture every send (44+). Assert against these.

---

### `src/app/actions/booking.ts` (controller, request-response) — MODIFY

**Analog:** self. Two seams.

**Seam 1 — `placeHold` fork (Pattern 2).** The `deriveBookable` join (110-119) already selects listing facts; add `bookingMode: listing.bookingMode` to the select. Then branch AFTER the bookability gate (before the current `createPendingHold` call at 132):
- instant → existing call, unchanged (`holdStatus:'pending'`, 15-min TTL) → redirect `/listings/[id]/book?hold=<id>` (line 148).
- request → `createPendingHold(..., { holdStatus:'requested', ttlMs: APPROVAL_SLA_HOURS*3600e3, bookingMode:'request' })` → `void sendRequestReceived(...)` + `void sendNewRequestToHost(...)` → redirect to `/bookings/[id]` (rendering a `requested` state — see the `/bookings/[id]` entry).

**Seam 2 — `confirmBooking` accepts `approved` (pay-on-approval reuse).** Two precise edits:
1. Non-pending guard (line 193, `if (bk.status !== "pending")`) must also accept `approved`.
2. Extend-hold UPDATE (228-230) — change `status = 'pending'` → `status IN ('pending','approved')` AND wrap the interval in `GREATEST` so a 24h approved window is never shrunk to the 60-min instant window:
```sql
UPDATE booking
SET expires_at = GREATEST(expires_at, now() + make_interval(mins => ${PAYMENT_WINDOW_MINUTES}))
WHERE id = ${holdId} AND booker_id = ${userId} AND status IN ('pending','approved')
```
Everything else (owner-gate 172-184, idempotent short-circuit 188-190, rate-limit 203-212, checkout create 238-247) is unchanged — pay-on-approval IS the Phase-5 checkout.

---

### `src/app/actions/host-requests.ts` (controller, request-response) — **NEW**

**Analogs:** `src/app/actions/blocks.ts` (owner-gate skeleton) + `src/app/actions/booking.ts` (atomic-guard idiom, calm result shapes).

**File header + directive:** copy `blocks.ts:1-40` — `"use server"`, the security-contract comment block, the `requireUserId()` helper (37-40, identical to booking.ts:67-70), and the `AvailabilityResult`-style discriminated-union return.

**Owner-gate (IDOR, Security V4) — copy `blocks.ts:46-54` `assertOwnership`, but join booking→listing:** load the request row joined to its listing, verify `listing.hostId === userId` BEFORE any UPDATE. A missing row AND a cross-host row return the **same** calm denial (leak nothing) — mirror `confirmBooking`'s `if (!bk || bk.bookerId !== userId)` (booking.ts:182).

**Approve — atomic + SLA-guarded (copy the atomic-UPDATE idiom from booking.ts:228-230):**
```sql
UPDATE booking SET status = 'approved',
       expires_at = now() + make_interval(hours => ${APPROVAL_PAYMENT_WINDOW_HOURS})
WHERE id = ${requestId} AND status = 'requested' AND expires_at > now()   -- DB-clock SLA guard
RETURNING id
```
0 rows → calm "this request is no longer pending" (never a 500). On ≥1 row → `void sendRequestApproved(bookerEmail, spaceTitle, '/listings/[id]/book?hold=<id>')`.

**Decline:**
```sql
UPDATE booking SET status = 'declined', expires_at = NULL
WHERE id = ${requestId} AND status = 'requested' RETURNING id
```
Freeing the slot is automatic (`declined` is not in the occupying set). On ≥1 row → `void sendRequestDeclined(...)`.

**After each mutation:** `revalidatePath('/host/requests')` + `revalidatePath('/host')` (D-65 freshness) — mirror `blocks.ts:139-140`. Consider rate-limit + `recordAudit` on the money-adjacent approve (mirror booking.ts:203-212) — planner's call.

---

### `src/app/actions/listing.ts` (controller, CRUD) — MODIFY

**Analog:** self — `createDraftListing` (70-83). One-line change: `bookingMode: "request"` (line 80) → `bookingMode: "instant"` (D-62). Update the doc comment at line 68 ("bookingMode to 'request'"). `saveListingStep` (line 133) already writes `d.bookingMode` from the wizard — the edit-while-hosting path (D-61) is already wired; verify the wizard toggle (`wizard.tsx` Step 5, ~line 666) surfaces on edit.

---

### `src/app/api/paymongo/webhook/route.ts` (route, event-driven) — MODIFY

**Analog:** self — the confirm UPDATE (306-308). Single confirm writer (D-57) — **widen the WHERE, never add a second writer.**
```sql
-- was: WHERE id = ${bookingId} AND status = 'pending' RETURNING id
UPDATE booking SET status = 'confirmed', expires_at = NULL, payment_id = ${paymentId}
WHERE id = ${bookingId} AND status IN ('pending','approved') RETURNING id
```
- instant confirms from `pending`, request-to-book from `approved` — one handler, both → `confirmed`.
- **`handleGoneSlot` (123-175) is UNCHANGED** — a 0-row confirm on a released/declined request routes here and auto-refunds (refundable rail) / operator-alerts (QRPh) exactly as instant-book. This IS the D-58 pay-after-release backstop (Research Pitfall 3). Do NOT add request-specific refund logic.
- **BOOK-06 confirmed email:** on ≥1 row (after line 308), fetch booker email + listing title (one extra read) and `void sendBookingConfirmed(...)`. Keep it fire-and-forget, outside the ACK path.

---

### `src/inngest/functions/request-expiry.ts` (service, batch cron) — **NEW**

**Analog:** `src/inngest/functions/payout-sweep.ts` — a near-clone. Copy the whole file's shape.

**`createFunction` — copy the exact 2-arg form (payout-sweep.ts:192-205):**
```typescript
export const requestExpirySweep = inngest.createFunction(
  {
    id: "request-expiry-sweep",
    concurrency: 1,                                  // singleton
    triggers: [{ cron: "TZ=Asia/Manila 15 * * * *" }], // offset from payout crons (0 and 30) — Pitfall 4
  },
  async ({ step }) => {
    const due = await step.run("find-expired", () => queryExpired(db));
    for (const r of due) await step.run(`expire-${r.id}`, () => expireOne(db, r));
    return { swept: due.length };
  },
);
```

**Sweep query — mirror `queryDuePayouts` (payout-sweep.ts:69-92), DB clock `now()` is the sole authority:**
```sql
SELECT id, status, listing_id AS "listingId", booker_id AS "bookerId"
FROM booking
WHERE (status = 'requested' AND expires_at <= now())   -- SLA auto-decline (D-64)
   OR (status = 'approved'  AND expires_at <= now())    -- payment-window auto-release
ORDER BY expires_at ASC LIMIT 100
```
Per-row (mirror `payOne` 109-184, minus the wallet/transfer bits): `requested` → `declined` + `void sendRequestDeclined(...)`; `approved` → `cancelled` (+optional email — Open Q1). Scope each UPDATE `WHERE id=$id AND status='requested'`/`'approved'` (idempotent). Use `console.error("[request-expiry] …")` alerts in the same style.

> Lazy read-predicates (units.ts / read-model.ts) already free the slot instantly between sweep ticks — this cron only drives the *visible* status flip + the email side-effect (Research Pattern 3: do BOTH).

---

### `src/app/api/inngest/route.ts` (route/config) — MODIFY

**Analog:** self — `serve()` mount (31-34). Import `requestExpirySweep` and add it to `functions[]`:
```typescript
functions: [payoutSweep, payoutReconcile, requestExpirySweep],
```
No dashboard step — crons are code-registered (Inngest re-syncs on deploy / the Dev Server picks it up).

---

### `src/app/(host)/host/requests/page.tsx` (component, read RSC) — **NEW**

**Analog:** `src/app/(host)/host/earnings/page.tsx` — clone wholesale. Copy:
- The defense-in-depth session + `canHost` re-check (earnings 45-54) — the `(host)` layout gates, but the page re-checks (Security V4).
- The **owner-scoped read** (earnings 59-78): select `booking` joined to `listing`, `WHERE listing.host_id = session.user.id AND booking.status = 'requested'`, newest-first. A host can never see another host's requests.
- The **venue-tz display** discipline (earnings 89-108): `tz(r.timezone)` + `format(..., { in: inTz })` for the requested window; compute the expiry deadline server-side (`expires_at`) and pass to the countdown component.
- The shadcn `Table`/`TableRow`/`TableCell` desktop layout + mobile stacked-card fallback (earnings 155-214).

Columns per D-65: booker, space, requested window, quoted price (`formatMoney`, never recompute), expiry countdown, Approve/Decline actions (wire to `host-requests.ts`).

---

### `src/app/(host)/host/page.tsx` (component, read RSC) — MODIFY

**Analog:** self. Add a pending-request count using the existing `count()` idiom (34-38, currently counts listings):
```typescript
const [{ n: pending } = { n: 0 }] = await db
  .select({ n: count() })
  .from(booking)
  .innerJoin(listing, eq(booking.listingId, listing.id))
  .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")));
```
Add a "Requests" button to the action row (63-75) with the count nudge, mirroring the existing `Link`+`Button asChild` entries.

---

### `src/app/(host)/host/layout.tsx` (component, layout) — MODIFY

**Analog:** self — the nav-link row (49-61). Add a "Requests" `<Link href="/host/requests">` between Earnings and Profile, with the pending count (D-65). Mirror the existing neutral `text-sm font-medium underline-offset-4 hover:underline` styling.

---

### `src/app/listings/[id]/book/page.tsx` (component, request-response) — MODIFY

**Analog:** self — the active-hold check (line 83). The pay page is reused for pay-on-approval, so widen the "active" predicate to also accept an approved hold:
```typescript
// was: bk.status === "pending" && !!bk.expiresAt && bk.expiresAt.getTime() > now.getTime()
const active = (bk.status === "pending" || bk.status === "approved")
  && !!bk.expiresAt && bk.expiresAt.getTime() > now.getTime();
```
The confirmed short-circuit (line 79) and `HoldExpiredState` fallback (84) are unchanged.

---

### `src/app/bookings/[id]/page.tsx` (component, request-response) — MODIFY

**Analog:** self — the status branch (74-87). `placeHold`'s request branch redirects here, but a `requested` row currently falls through to `notFound()` (line 87). Add a `requested` branch BEFORE line 87 rendering an "awaiting host" state (Research Open Q2 — cheapest reuse; planner may prefer a distinct lightweight page). The owner-gate (70) and `confirmed`/`cancelled`+`?paid=1` branches stay as-is.

---

### `src/components/host/request-row.tsx` (component) — **NEW**

**Analogs:** `src/components/booking/hold-countdown.tsx` (the client-countdown mechanism) + `src/components/host/payout-row.tsx` (mobile row card). Copy the `hold-countdown.tsx` pattern exactly (setInterval-only setState, `onExpireRef` ref-sync 38-41, `suppressHydrationWarning` on the digits 76) but at **hours scale** (the request/approval deadline is 24h, not 15 min — adjust `formatRemaining` 19-24 to show `h:mm:ss` or a coarser "Xh Ym left"). The countdown is a **display cue only** — the DB `expires_at > now()` in the approve action is the authority.

---

### `drizzle/0010_booking_request_states.sql` (migration) — **NEW**

**Analog:** hand-authored idempotent style of `drizzle/0005`/`0009`. **This file contains ONLY the enum-value adds** (Research Pitfall 2 — `ADD VALUE` and its first *use* must be in separate transactions):
```sql
ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'requested';--> statement-breakpoint
ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'approved';
```
Nothing else in this file. `IF NOT EXISTS` keeps the test-harness replay (`tests/helpers/db.ts`) idempotent. Generate the scaffold with `drizzle-kit generate --custom` then hand-author (per CLAUDE.md — migrations are hand-authored, never `push`).

---

### `drizzle/0011_booking_request_columns.sql` (migration) — **NEW**

**Analogs:** `drizzle/0006` (ADD COLUMN, backfill-free) + `drizzle/0009` (ALTER … SET DEFAULT). Safe to reference the new enum values here (they were committed in 0010's own tx):
```sql
ALTER TABLE "booking" ADD COLUMN "booking_mode" "booking_mode";--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "booking_mode" SET DEFAULT 'instant';--> statement-breakpoint
```
Nullable column, no backfill (A2 — near-zero prior rows, all instant). Mirror 0006's bare `ADD COLUMN` and 0009's forward-only `SET DEFAULT` (does not touch existing rows).

---

### `drizzle/0012_booking_exclusion_v2.sql` (migration) — **NEW**

**Analog:** `drizzle/0005_booking_exclusion.sql` — the DROP + re-ADD (Postgres has no `ALTER CONSTRAINT … WHERE`; Pitfall 1). Runs AFTER 0010 so the enum values exist. Mirror 0005 exactly: unqualified columns, `'[)'` half-open range, same GiST shape — only the WHERE set widens:
```sql
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "unit" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('pending', 'confirmed', 'requested', 'approved'));
```
> `btree_gist` is already installed (0005 line 7) — do NOT re-`CREATE EXTENSION`. This is the **single most important correctness artifact** of the phase (Occupancy audit #1).

---

### Test targets

| File | Analog to clone | Covers |
|------|-----------------|--------|
| `tests/booking/request-lifecycle.test.ts` (NEW) | `tests/booking/state-machine.test.ts` (real actions via `vi.doMock`, `mockPayMongo`, `mockResend`, redirect-capture) | fork, approve/decline atomicity + SLA guard, owner-gate (Security V4), **concurrent double-book on `requested`/`approved`** (via `makeRacingClients`), mode-flip independence (D-61), `/host/requests` owner-scope, lifecycle-email assertions |
| `tests/booking/request-expiry.test.ts` (NEW) | `tests/payments/payout-sweep.test.ts` (DB-clock manip: `UPDATE … expires_at = now() - interval`) | SLA auto-decline + payment-window auto-release |
| `tests/paymongo/webhook-payment-paid.test.ts` (MOD) | self — extend | `approved`→`confirmed`; pay-after-release → `handleGoneSlot`; `sendBookingConfirmed` fires |
| `tests/listing/crud.test.ts` (MOD) | self — extend | D-62 default flip (`createDraftListing` → `instant`) |

Harness (`tests/helpers/db.ts` `setupTestDb`/`makeRacingClients`, `tests/helpers/mocks.ts` `mockPayMongo`/`mockResend`) already covers everything — **no framework install.** The concurrent-double-book-on-`requested`/`approved` race is the non-negotiable phase gate.

---

## Shared Patterns

### A. Occupancy-Predicate fan-out (THE cross-cutting correctness pattern)
**Sources:** `drizzle/0005` (line 15), `read-model.ts:108`, `units.ts:154/178/222-224/72`, `webhook/route.ts:308`, `booking.ts:230`.
**Apply to:** the 8 sites in the Occupancy-Predicate Audit — **all widened in the SAME wave**. The rule:
- **Slot-holding predicates** (EXCLUDE + all lazy reads + sweeps) widen to include `requested` + `approved`: `IN ('pending','confirmed','requested','approved')` for the EXCLUDE; `status IN ('pending','requested','approved') AND expires_at > now()` for the time-bounded reads.
- **Confirm/extend predicates** (webhook + confirmBooking) widen `'pending'` → `IN ('pending','approved')`.
Miss a slot-holding site → silent double-book. Miss the confirm site → booker charged, no booking. This is the load-bearing invariant of the whole phase.

### B. Owner-gate in the action/RSC, never the route group (Security V4 / IDOR)
**Sources:** `blocks.ts:46-54` (`assertOwnership`), `booking.ts:182` (`if (!bk || bk.bookerId !== userId)`), `earnings/page.tsx:56-78` (owner-scoped read), `host/layout.tsx:32` (layout gates canHost but is NOT the data gate).
**Apply to:** `host-requests.ts` (verify `listing.hostId === session.user.id` before approve/decline), `/host/requests/page.tsx` (`WHERE listing.host_id = session.user.id`). Missing row and cross-host row return the **same** calm denial.

### C. DB-clock (`now()`) is the sole expiry/SLA authority
**Sources:** `booking.ts:229` (extend-hold `now()`), `payout-sweep.ts:79` (`ends_at + make_interval(...) <= now()`), `webhook/route.ts:307` (confirm derives from event, not client).
**Apply to:** the approve SLA guard (`AND expires_at > now()`), the expiry sweep (`WHERE expires_at <= now()`), all `expires_at` writes (`now() + make_interval(...)`). Never a JS/client clock. Client countdowns (`hold-countdown.tsx`) are display cues only.

### D. Fire-and-forget email over the thin Resend helper
**Sources:** `email.ts:34-52` (`send` + dev-log fallback), `auth.ts:73-81` (`void sendResetPassword(...)`), `email.ts:25-32` (`escapeHtml`).
**Apply to:** all five lifecycle sends — `void send...(...)` from the webhook + actions + sweep; `escapeHtml` every interpolated field. A Resend failure must never reject a 200 ACK or block an action. Hardening (retry/queue) is Phase 7.

### E. Config-as-named-values
**Source:** `payments/config.ts` (whole file — `Number(process.env.X ?? default)`).
**Apply to:** `APPROVAL_SLA_HOURS`, `APPROVAL_PAYMENT_WINDOW_HOURS` — import the names everywhere, never a `24` literal at a call site.

### F. Hand-authored, idempotent, harness-replayable migrations
**Sources:** `drizzle/0005` (unqualified cols, `WITH SCHEMA public`, `IF NOT EXISTS`), `0009` (idempotent `SET DEFAULT`), `0006` (backfill-free `ADD COLUMN`).
**Apply to:** 0010/0011/0012 — generate the scaffold via `drizzle-kit generate --custom`, then hand-author; unqualified table/column names so `tests/helpers/db.ts` replays into every isolated schema; **split the enum-add (0010) from its first use (0012)** across files (Pitfall 2).

### G. Inngest cron singleton (2-arg API)
**Sources:** `payout-sweep.ts:192-205` (`createFunction(options, handler)`, `concurrency:1`, `triggers:[{cron:"TZ=Asia/Manila …"}]`), `inngest/route.ts:31-34` (serve mount), `inngest/client.ts:17` (shared client).
**Apply to:** `request-expiry.ts` — copy the exact shape; offset the cron minute (`15`) from the payout crons (`0`,`30`); register in `serve()`.

---

## No Analog Found

None. Every Phase-6 file extends or clones an existing in-repo file. The two NEW server-side units (`host-requests.ts`, `request-expiry.ts`) and the NEW RSC (`/host/requests/page.tsx`) each have a strong same-repo role+flow analog (`blocks.ts`, `payout-sweep.ts`, `earnings/page.tsx` respectively). This is expected for an extension phase that adds ZERO new dependencies.

---

## Metadata

**Analog search scope:** `src/app/actions/`, `src/app/api/`, `src/app/(host)/`, `src/app/listings/`, `src/app/bookings/`, `src/lib/{db,availability,payments,email}`, `src/inngest/`, `src/components/{host,booking}/`, `drizzle/`, `tests/`.
**Files scanned:** ~28 (all direct-read, line-numbers verified 2026-07-20).
**Pattern extraction date:** 2026-07-20
