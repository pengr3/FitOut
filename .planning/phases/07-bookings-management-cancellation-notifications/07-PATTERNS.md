# Phase 7: Bookings Management, Cancellation & Notifications - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 47 new/modified files
**Analogs found:** 44 / 47

> **The phase's own research says it best:** *"this phase adds no new infrastructure. Every reliability guarantee it needs already has a proven implementation in the repo. The highest-quality plan is the one that clones the most and invents the least."* (07-RESEARCH § Don't Hand-Roll). This document names, per file, exactly what to clone and from which lines.

---

## File Classification

### Wave-0 correctness (schema + pure money + sweeps)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/db/schema.ts` (MOD) | model | CRUD | itself — `hostPayoutLedger` (:286-313), `booking` (:396-440), `bookingStatus` (:331-339) | exact |
| `drizzle/00XX_phase7_columns.sql` (NEW, generated) | migration | schema | `drizzle/0011_booking_request_columns.sql` | exact |
| `drizzle/00XX_ledger_kind.sql` (NEW, hand-authored) | migration | schema | `drizzle/0012_booking_exclusion_v2.sql` + `0010_booking_request_states.sql` | exact |
| `src/lib/payments/service-fee.ts` (NEW) | utility | transform | `src/lib/payments/commission.ts` | exact |
| `src/lib/payments/cancellation.ts` (NEW) | utility | transform | `src/lib/payments/commission.ts` + `payout-ledger-status.ts` | exact |
| `src/lib/payments/refund-rail.ts` (NEW) | utility | transform | `webhook/route.ts:40-42` (`REFUNDABLE_RAILS`) | exact |
| `src/lib/payments/config.ts` (MOD) | config | — | itself (:12-41) | exact |
| `src/inngest/functions/payout-sweep.ts` (MOD) | service | batch | itself (`queryDuePayouts` :69-92, `payOne` :109-184) | exact |
| `src/inngest/functions/payout-reconcile.ts` (MOD) | service | batch | `payout-sweep.ts` | exact |

### Expiry-cap correctness (D-93..D-100)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/actions/host-requests.ts` (MOD :175) | server action | request-response | itself (:172-189) | exact |
| `src/lib/availability/units.ts` (MOD :264) | service | transactional write | itself (:254-289) | exact |
| `src/lib/availability/read-model.ts` (MOD :28) | model | read | itself (`SlotState` :28) | exact |
| `src/components/availability/slot-picker.tsx` (MOD :65-74) | component | read | itself (`reasonFor` :64-74) | exact |
| `src/app/actions/booking.ts` (MOD) | server action | request-response | itself (`confirmBooking` :234-272) | exact |

### Cancellation flow

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/actions/cancel-booking.ts` (NEW) | server action | request-response | `src/app/actions/host-requests.ts` (whole file) | exact |
| `src/app/bookings/[id]/cancel/page.tsx` (NEW) | route (RSC) | read | `src/app/bookings/[id]/page.tsx:41-127` | exact |
| `src/app/bookings/[id]/page.tsx` (MOD) | route (RSC) | read | itself (:129-345 status branches) | exact |
| `src/components/booking/refund-breakdown.tsx` (NEW) | component | read | `src/components/booking/price-breakdown.tsx` + `payout-row.tsx:51-74` | exact |
| `src/components/booking/cancellation-policy-disclosure.tsx` (NEW) | component | read | `price-breakdown.tsx` (server-computed props) | role-match |
| `src/components/host/host-cancel-dialog.tsx` (NEW) | component (client) | request-response | `src/components/host/request-row.tsx:55-150` (decline dialog) | exact |
| `src/lib/paymongo.ts` (MOD) | service | request-response | itself (`createBatchTransfer` :266-310, `createRefund` :226-249) | exact |
| `src/lib/validation/cancellation.ts` (NEW) | utility | transform | `src/lib/validation/booking.ts:17-32, 92-100` | exact |

### Bookings views (D-101..D-106)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(app)/bookings/page.tsx` (NEW) | route (RSC) | read | `src/app/(host)/host/requests/page.tsx` | exact |
| `src/app/(host)/host/bookings/page.tsx` (NEW) | route (RSC) | read | `src/app/(host)/host/earnings/page.tsx` | exact |
| `src/components/booking/booking-status.ts` (NEW) | utility | transform | `src/components/host/payout-ledger-status.ts:26-49` | exact |
| `src/components/booking/booking-status-badge.tsx` (NEW) | component | read | `src/components/host/payout-state-badge.tsx` | exact |
| `src/components/booking/booking-row.tsx` (NEW) | component | read | `src/components/host/payout-row.tsx` | exact |
| `src/components/host/host-booking-row.tsx` (NEW) | component | read | `src/components/host/payout-row.tsx` + `request-row.tsx:152-183` | exact |
| `src/components/booking/bookings-tabs.tsx` (NEW) | component | read | ⚠️ partial — `search-results.tsx:107-120` (URL-param nav) | role-match |
| "Load more" pager | component | read | `src/components/search/search-results.tsx:107-120, 188-199` | role-match |

### Notifications & reminders

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/inngest/functions/notify.ts` (NEW) | service | event-driven | `src/inngest/functions/request-expiry.ts:175-188` (function shape) | role-match |
| `src/inngest/functions/reminders.ts` (NEW) | service | batch (cron) | `payout-sweep.ts` (claim idiom) + `request-expiry.ts` (cron shape) | exact |
| `src/inngest/functions/request-expiry.ts` (MOD) | service | batch | itself (:103, `sendDeclinedNotice`) | exact |
| `src/app/api/inngest/route.ts` (MOD) | route (config) | — | itself (:24-36) | exact |
| `src/lib/email.ts` (MOD) | service | request-response | itself (:94-112, :142-160) | exact |
| `src/lib/notifications.ts` (NEW) | service | CRUD | `src/lib/audit.ts` + `payout-ledger-status.ts` (typed union) | role-match |
| `src/lib/validation/notification.ts` (NEW) | utility | transform | `src/lib/validation/booking.ts` | exact |
| `src/app/actions/notifications.ts` (NEW) | server action | CRUD | `src/app/actions/host-requests.ts` (owner-gate + status-scoped UPDATE) | exact |
| `src/components/notifications/notification-bell.tsx` (NEW) | component (client) | polling | `src/components/booking/pending-payment-state.tsx:29-49` | exact |
| `src/app/(app)/layout.tsx` (MOD) | layout | — | `src/app/(host)/host/layout.tsx:40-47, 69-80` (count + badge) | exact |
| `src/app/(host)/host/layout.tsx` (MOD) | layout | — | itself (:69-80) | exact |

### Service fee & policy surfaces

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/booking/price-breakdown.tsx` (MOD) | component | read | itself (:51-55 RESERVED slot, :66 copy) | exact |
| `src/components/search/search-result-card.tsx` (MOD :115-125) | component | read | itself | exact |
| `src/components/host/payout-row.tsx` (MOD :58) | component | read | itself | exact |
| listing wizard cancellation-policy step (MOD) | component (client) | request-response | `wizard.tsx:666-714` (Step-5 RadioGroup) + `:284-302` (checklist) | exact |

### Tests

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tests/payments/cancellation.test.ts`, `service-fee.test.ts` (NEW) | test (unit) | — | `tests/payments/commission.test.ts` | exact |
| `tests/booking/cancellation.test.ts`, `views.test.ts` (NEW) | test (integration) | — | `tests/payments/payout-sweep.test.ts` + `tests/helpers/db.ts` | exact |
| `tests/availability/expiry-cap.test.ts` (NEW) | test (integration) | — | `tests/booking/request-expiry.test.ts` | exact |
| `tests/notifications/notify.test.ts`, `reminders.test.ts` (NEW) | test (integration) | — | `tests/payments/payout-sweep.test.ts` (racing clients) | exact |
| `e2e/cancel.spec.ts` (NEW) | test (e2e) | — | `e2e/search-and-book.spec.ts` | role-match |

---

## Pattern Assignments

### `src/lib/payments/cancellation.ts` + `service-fee.ts` (utility, transform)

**Analog:** `src/lib/payments/commission.ts` — copy this file's *entire* shape: header comment naming the decision + the isomorphic constraint, exported result type with per-field decision comments, single rounding rule, throw-don't-freeze guards.

**Header comment pattern** (`commission.ts:1-11`) — the "why this module exists + isomorphic" note is mandatory; both new modules are imported by RSCs, server actions AND Inngest functions:
```typescript
// PAY-02 commission calculator (D-50/51/52) — the pure, integer-cents host-side deduction the payout
// ledger and the T+24h sweep rest on. Mirrors src/lib/booking/pricing.ts (quoteWindow): a small, PURE,
// no-I/O module owning ONE correctness concern, throwing rather than silently freezing a wrong number.
// ...
// Pure/isomorphic: no "use client"/"use server" directive, so Server Components, server actions, and the
// payout sweep can all import it.
```

**Config import — never a literal at a call site** (`commission.ts:13`):
```typescript
import { COMMISSION_RATE_BPS } from "@/lib/payments/config";
```

**The guard + single-rounding core** (`commission.ts:35-47`) — `quoteRefund` and `computeServiceFee` copy this verbatim in structure:
```typescript
export function computeCommission(
  grossCents: number,
  rateBps: number = COMMISSION_RATE_BPS,
): Commission {
  if (!Number.isInteger(grossCents) || grossCents < 0)
    throw new Error("gross must be a non-negative integer number of centavos");
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000)
    throw new Error("rateBps must be an integer in [0, 10000]");

  const commissionCents = Math.round((grossCents * rateBps) / 10000); // single defined rounding (Pitfall 5)
  const netCents = grossCents - commissionCents; // D-52: platform absorbs the gateway fee — NEVER reduced further
  return { rateBps, commissionCents, netCents };
}
```
> **Copy the subtraction discipline exactly:** `netCents = grossCents - commissionCents`, never a second `Math.round`. `quoteRefund` must derive `retainedSpaceCents = spacePriceCents - spaceRefundCents` the same way (07-RESEARCH § Rounding discipline).

**Config constant pattern** (`src/lib/payments/config.ts:12-16`) — every new number (`SERVICE_FEE_BPS`, `HOST_CANCEL_FEE_CENTS`, `MIN_LEAD_REQUEST_HOURS`, `MIN_LEAD_INSTANT_MINUTES`, `MIN_APPROVE_WINDOW_HOURS`, 4 reminder offsets) joins this file in this exact shape — a doc comment naming the decision, then `Number(process.env.X ?? default)`:
```typescript
/** Platform commission rate in basis points (D-51). 1000 bps = 10%. Config-tunable, host-side (D-50). */
export const COMMISSION_RATE_BPS = Number(process.env.COMMISSION_RATE_BPS ?? 1000);

/** Payout eligibility delay after the session ENDS (D-55). T+24h anchored to booking.endsAt. */
export const PAYOUT_DELAY_HOURS = Number(process.env.PAYOUT_DELAY_HOURS ?? 24);
```
> ⚠️ `APPROVAL_PAYMENT_WINDOW_HOURS` (`config.ts:41`) changes its default `24 → 12` (D-95). Update the doc comment to cite D-95 superseding D-64.

**Derivation-table pattern for `deriveBookingStatusView`** — the `LADDER` const and the status view both follow `payout-ledger-status.ts:26-49`: a pure exhaustive `switch` returning a `{ label, tone, ... }` view object, with the "no client directive so the RSC can call it" note at `payout-ledger-status.ts:1-5`:
```typescript
// Pure payout-LEDGER-state derivation — a NON-client module (no client directive) so the HOST-03
// earnings Server Component can CALL derivePayoutLedgerView / summarizePayouts directly. A client-directive
// module's exports become client references when imported by a Server Component and cannot be invoked
// server-side (that crashed /host in UAT for the onboarding derivation — see ./payout-status.ts).
```

---

### `src/app/actions/cancel-booking.ts` (server action, request-response)

**Analog:** `src/app/actions/host-requests.ts` — the closest match in the repo. Both cancel actions (booker + host) clone its full skeleton: session → owner-gate → rateLimit → audit → atomic status-scoped UPDATE → 0-row calm path → side-effect → revalidate.

**Security-contract header** (`host-requests.ts:12-32`) — reproduce this block, adapted. It is the file's most valuable artifact:
```typescript
// SECURITY CONTRACT:
//   - SESSION: both actions require an authenticated session — a calm sign-in result otherwise.
//   - OWNERSHIP / IDOR (T-06-19 / Security V4): the request is loaded JOINED to its listing (+ the
//     listing host's canHost + the booker's email) and we verify `listing.hostId === session.user.id`
//     AND the host still has `canHost` BEFORE any UPDATE. The `(host)` route group is NOT the gate. A
//     MISSING row and a CROSS-HOST row return the SAME calm denial so a guessed/leaked request id
//     reveals nothing (missing vs not-mine are indistinguishable).
//   - REPLAY / DOUBLE-ACTION (T-06-21): every UPDATE is status-scoped (`AND status='requested'`), so a
//     second approve/decline over an already-actioned row is a 0-row no-op → calm "no longer pending".
```

**Result union + shared calm denials** (`host-requests.ts:50-66`):
```typescript
export type RequestActionResult = { ok: true } | { ok: false; error: string };

const APPROVE_RATE_LIMIT = { window: 60, max: 5 } as const;

/** The SAME calm denial for a missing request AND a cross-host request (IDOR — leak nothing, T-06-19). */
const DENIED: RequestActionResult = {
  ok: false,
  error: "We couldn't find that request, or it isn't yours to manage.",
};

/** Calm result for a 0-row approve/decline — already actioned or lapsed (never a 500, T-06-20/21). */
const NOT_PENDING: RequestActionResult = {
  ok: false,
  error: "This request is no longer pending.",
};
```

**Session helper** (`host-requests.ts:68-72`) — copy verbatim:
```typescript
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}
```

**Owner-gated load — the IDOR gate** (`host-requests.ts:88-114`). For the *booker* cancel, swap the host join for `booking.bookerId === userId` (see `booking.ts:243-255`); for the *host* cancel, use this shape as-is:
```typescript
async function loadOwnedRequest(requestId: string, userId: string) {
  const [row] = await db
    .select({ status: booking.status, listingId: booking.listingId, startsAt: booking.startsAt,
      /* ... */ hostId: listing.hostId, hostCanHost: hostUser.canHost, bookerEmail: bookerUser.email })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .innerJoin(hostUser, eq(listing.hostId, hostUser.id))
    .innerJoin(bookerUser, eq(booking.bookerId, bookerUser.id))
    .where(eq(booking.id, requestId));
  // Re-check ownership + capability server-side (the route group is NOT the gate). A cross-host id and a
  // missing id both fall through to null → the SAME calm denial (leak nothing).
  if (!row || row.hostId !== userId || !row.hostCanHost) return null;
  return row;
}
```
Note the aliased-user-join trick at `host-requests.ts:76-77` — needed again because the cancel actions must reach both parties for notifications:
```typescript
const hostUser = alias(user, "host_user");
const bookerUser = alias(user, "booker_user");
```

**Rate limit + audit on denial** (`host-requests.ts:157-166`):
```typescript
const limit = rateLimit(`approve-request:${userId}`, APPROVE_RATE_LIMIT);
if (!limit.ok) {
  await recordAudit({
    actorId: userId,
    action: "approve_request",
    outcome: "denied",
    meta: { reason: "rate_limit", requestId, retryAfter: limit.retryAfter },
  });
  return { ok: false, error: "You're going a little fast. Please try again in a moment." };
}
```

**The atomic, DB-clock-guarded, status-scoped UPDATE — the idempotency lock** (`host-requests.ts:172-189`). This is the single most important pattern for both cancel actions: the UPDATE's `WHERE` carries every guard (status, `now()`), a 0-row result is a calm message, never an exception:
```typescript
const flipped = (await db.execute(sql`
  UPDATE booking
  SET status = 'approved',
      expires_at = now() + make_interval(hours => ${APPROVAL_PAYMENT_WINDOW_HOURS})
  WHERE id = ${requestId} AND status = 'requested' AND expires_at > now()
  RETURNING id
`)) as unknown as { id: string }[];

if (flipped.length === 0) {
  // Already actioned (approved/declined) or lapsed (the 06-06 cron won the race) — calm, never a 500.
  await recordAudit({ actorId: userId, action: "approve_request", outcome: "denied",
    meta: { reason: "not_pending", requestId } });
  return NOT_PENDING;
}

await recordAudit({ actorId: userId, action: "approve_request", outcome: "ok", meta: { requestId } });
```
> **Cancel adaptation:** the booker cancel's `WHERE` carries `AND status = 'confirmed' AND starts_at > now()` — the D-94 post-start refusal and the D-79 status flip in one atomic claim, with the refund/retained columns set in the same `SET`. The 0-row path maps to the UI-SPEC copy `This booking is no longer active — it may have already been cancelled.`

**Venue-local `whenLabel` composition** (`host-requests.ts:122-133`) — reuse verbatim for every new time surface (cancel review, notification payloads, all four reminder emails). Do **not** write a fifth format:
```typescript
function composeWhenLabel(row: OwnedRequest): string {
  const inTz = tz(row.timezone);
  const hours = windowHours(row.startsAt, row.endsAt);
  const quoted = row.quotedTotalCents ?? 0;
  const hourlyTotal = row.hourlyRateCents != null ? row.hourlyRateCents * hours : null;
  const fullDay = hourlyTotal == null || quoted !== hourlyTotal;
  const dateLabel = format(row.startsAt, "EEEE, MMM d", { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(row.startsAt, "h:mm a", { in: inTz })} – ${format(row.endsAt, "h:mm a", { in: inTz })}`;
  return `${dateLabel}, ${timeLabel}${row.city ? ` (${row.city} time)` : ""}`;
}
```

**Freshness after mutation** (`host-requests.ts:208-211`):
```typescript
revalidatePath("/host/requests");
revalidatePath("/host");
```
Cancel actions revalidate `/bookings`, `/host/bookings`, and `/bookings/${id}`.

> 🚩 **The one deliberate divergence:** `host-requests.ts:200` fires email via `void sendRequestApproved(...)`. **Do not copy the `void` fire-and-forget for Phase 7** — D-83 replaces it with `await inngest.send(...)` inside a try/catch. See § Shared Patterns → Notification emission.

---

### `src/inngest/functions/reminders.ts` (service, batch/cron)

**Analog:** `src/inngest/functions/payout-sweep.ts` for the *at-most-once claim*, `request-expiry.ts` for the *cron shape*.

**Cron function declaration** (`request-expiry.ts:173-188`) — copy including the API-version comment; the 4-arg examples online are stale for inngest 4.13.0:
```typescript
// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the cron trigger lives in
// options.triggers (the older 3-arg `(config, trigger, handler)` skeleton in RESEARCH predates this API).
export const requestExpirySweep = inngest.createFunction(
  {
    id: "request-expiry-sweep",
    concurrency: 1, // singleton — no overlapping sweeps
    triggers: [{ cron: "TZ=Asia/Manila 15 * * * *" }], // hourly, minute 15 (offset from the payout crons)
  },
  async ({ step }) => {
    const due = await step.run("find-expired", () => queryExpired(db));
    for (const r of due) {
      await step.run(`expire-${r.id}`, () => expireOne(db, r));
    }
    return { swept: due.length };
  },
);
```
> Reminders take **minute 45** (`:00` payout-sweep, `:15` request-expiry, `:30` payout-reconcile are taken).

**DB-clock due query with injectable `dbConn`** (`request-expiry.ts:65-75`) — the `dbConn` parameter is what makes the isolated-schema integration test possible; do not hardcode `db`:
```typescript
export async function queryExpired(dbConn: DbConn): Promise<ExpiredBooking[]> {
  const rows = (await dbConn.execute(sql`
    SELECT id, status, listing_id AS "listingId", booker_id AS "bookerId"
    FROM booking
    WHERE (status = 'requested' AND expires_at <= now())
       OR (status = 'approved' AND expires_at <= now())
    ORDER BY expires_at ASC
    LIMIT ${EXPIRY_BATCH_SIZE}
  `)) as unknown as ExpiredBooking[];
  return rows;
}
```

**The at-most-once claim — INSERT as the lock** (`payout-sweep.ts:113-130`). The `booking_reminder` claim clones this exactly (`ON CONFLICT (booking_id, kind) DO NOTHING RETURNING id`; empty ⇒ already sent ⇒ emit nothing). The comment about *why there is no app-level pre-check* is load-bearing — reproduce it:
```typescript
// (2) Claim the row — the INSERT itself is the at-most-once lock (no app-level "already paid?" check).
const claimId = randomUUID();
const claimed = (await dbConn.execute(sql`
  INSERT INTO host_payout_ledger (id, booking_id, host_id, ...)
  VALUES (${claimId}, ${b.bookingId}, ${b.hostId}, ...)
  ON CONFLICT (booking_id) DO UPDATE
    SET state = 'held', updated_at = now()
    WHERE host_payout_ledger.state = 'failed'
  RETURNING id
`)) as unknown as { id: string }[];
if (claimed.length === 0) return { status: "skipped-claimed" }; // owned by another sweep → fire nothing
```
And the header rationale (`payout-sweep.ts:8-14`):
```typescript
// CORRECTNESS RESTS ON TWO DB-LEVEL INVARIANTS, exactly as double-booking rests on the GiST EXCLUDE:
//   1. `UNIQUE(booking_id)` on host_payout_ledger — the INSERT itself is the at-most-once lock (mirrors
//      createPendingHold's "the INSERT is the lock", units.ts). There is deliberately NO app-level
//      "already paid out?" query-then-insert — that is the exact race the constraint exists to kill.
```

**Result union across the step boundary** (`request-expiry.ts:53-57`) — JSON-serializable, one variant per outcome:
```typescript
export type ExpireOneResult =
  | { status: "declined"; emailed: boolean }
  | { status: "cancelled" }
  | { status: "noop" }; // already terminal (a re-run flipped 0 rows) — never re-sends / re-flips
```

**Self-swallowing side-effect helper** (`request-expiry.ts:159-164`) — the reminder send must never throw out of the step:
```typescript
} catch (err) {
  // Fire-and-forget: the flip already freed the slot and is the durable side-effect. A read/send failure
  // must never fail the sweep step (T-06-17) — log for operators and move on.
  console.error("[request-expiry] declined_email_send_failed", { bookingId, err });
  return false;
}
```

---

### `src/inngest/functions/notify.ts` (service, event-driven)

**Analog:** `request-expiry.ts:175-188` for the function shape. **No event-triggered Inngest function exists yet** — the three existing functions are all crons. The `createFunction` options object, `step.run` per side-effect, and `concurrency` are the transferable parts; `triggers: [{ event: ... }]` and `onFailure` are new (see 07-RESEARCH § Inngest Event-Driven Email for the target shape).

**`onFailure` audit sink** — clone `recordAudit`'s `needs_attention` usage from the webhook (`src/app/api/paymongo/webhook/route.ts:162-167`), which is the established operator-alert channel D-90 names:
```typescript
console.error("[PAYMENT_ALERT] auto_refund_failed", { bookingId, paymentId, method, amountCents });
await recordAudit({
  actorId: "system",
  action: "auto_refund_failed",
  outcome: "needs_attention",
  meta: { bookingId, paymentId, method, amountCents },
});
```
`AuditOutcome` already includes `needs_attention` (`src/lib/audit.ts:18`) — no change needed there.

**Registration** (`src/app/api/inngest/route.ts:24-36`) — every new function joins the `functions: []` array; the fail-closed prod guard stays untouched:
```typescript
if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) {
  throw new Error(
    "INNGEST_SIGNING_KEY is required in production (fail-closed: Inngest verifies the /api/inngest serve endpoint).",
  );
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [payoutSweep, payoutReconcile, requestExpirySweep],
});
```

---

### `src/lib/email.ts` (MOD — four reminder sends + cancellation sends)

**Analog:** itself. The new sends clone `sendRequestApproved` (`:142-160`) exactly — escape every interpolated field, take a pre-composed `whenLabel`, render config hours as values:
```typescript
export const sendRequestApproved = (
  to: string, spaceTitle: string, whenLabel: string, totalLabel: string, payUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const total = escapeHtml(totalLabel);
  const url = escapeHtml(payUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Approved — pay to confirm ${spaceTitle}`,
    `<p><strong>Your request was approved</strong></p>` +
      `<p>Good news — the host approved your booking for ${space} on ${when}. Pay ${total} within ${APPROVAL_PAYMENT_WINDOW_HOURS} hours to lock it in.</p>` +
      `<p><a href="${url}">Pay now</a></p>`,
  );
};
```

**The contract-discipline header** (`email.ts:73-82`) is the checklist for every new send — copy its rules, not just its shape:
```typescript
//  - EVERY interpolated field — space title, booker label, quoted total, reference, CTA url — is
//    escapeHtml'd before it enters the markup (WR-01 / T-06-06 tampering sink: a raw url in an href
//    or a raw title in HTML text is the injection vector).
//  - Time labels ALREADY name the venue timezone — the caller composes `{date}, {time} ({City} time)`
//    and passes it as whenLabel; these sends never format a time themselves.
//  - The approval SLA / payment window render as HOUR VALUES from config (never the internal constant
//    names) so Phase-7 policy tuning flows through automatically.
```
> 🚩 The last bullet of that header (`- Fire-and-forget at every call site (void sendXxx(...))`) is **superseded by D-83** — the call sites move behind Inngest. Update the comment, or a future reader reinstates `void`.

**`escapeHtml`** (`email.ts:26-33`) — already exists; the notification payload renderer must not need it (React escapes), but the email path still does. Plain HTML strings stay (07-RESEARCH § Discretion: keep templating unchanged this phase).

---

### `src/app/(host)/host/bookings/page.tsx` (route RSC, read)

**Analog:** `src/app/(host)/host/earnings/page.tsx` — D-101 says "clones verbatim". Also `host/requests/page.tsx`, which is itself a clone of earnings and closer in *content* (booking rows, not ledger rows).

**Defense-in-depth re-gate** (`earnings/page.tsx:45-54`) — the `(host)` layout is **not** the gate:
```typescript
export default async function HostEarningsPage() {
  // Defense in depth: the (host) layout already gates, but never render earnings without a real session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }
```

**Owner-scoped read — filtered in the query, never post-filtered** (`host/requests/page.tsx:55-78`). This is the exact predicate shape `/host/bookings` needs (JOIN listing, `listing.hostId = session.user.id`):
```typescript
// Owner-scoped read (T-06-23 / Security V4) — the route group is NOT the gate. This is the EXACT predicate
// 06-07's non-optional owner-scope READ test asserts: booking JOIN listing WHERE listing.hostId =
// session.user.id AND booking.status = 'requested', soonest-expiring first.
const rows = await db
  .select({ id: booking.id, startsAt: booking.startsAt, /* ... */ title: listing.title,
    timezone: listing.timezone, city: listing.city, bookerFirstName: user.firstName })
  .from(booking)
  .innerJoin(listing, eq(booking.listingId, listing.id))
  .innerJoin(user, eq(booking.bookerId, user.id))
  .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")))
  .orderBy(asc(booking.expiresAt));
```

**Server-side display mapping — zero client arithmetic** (`host/requests/page.tsx:83-102`):
```typescript
const displayRows: RequestRowData[] = rows.map((r) => {
  const inTz = tz(r.timezone);
  const hours = windowHours(r.startsAt, r.endsAt);
  const quoted = r.quotedTotalCents ?? 0;
  const hourlyTotal = r.hourlyRateCents != null ? r.hourlyRateCents * hours : null;
  const fullDay = hourlyTotal == null || quoted !== hourlyTotal;
  const dateLabel = format(r.startsAt, "EEE, MMM d", { in: inTz });
  const timeLabel = fullDay ? "Full day"
    : `${format(r.startsAt, "h:mm a", { in: inTz })} – ${format(r.endsAt, "h:mm a", { in: inTz })}`;
  return { requestId: r.id, spaceTitle: r.title ?? "Your space",
    whenLabel: `${dateLabel}, ${timeLabel}${r.city ? ` (${r.city} time)` : ""}`,
    bookerLabel: r.bookerFirstName?.trim() || "A guest",
    totalLabel: formatMoney(quoted, r.currency ?? DISPLAY_CURRENCY), /* ... */ };
});
```

**Container + desktop-table / mobile-card split** (`earnings/page.tsx:122, 155-213`) — the UI-SPEC's `mx-auto w-full max-w-4xl px-4 py-10` shell:
```tsx
<div className="mx-auto w-full max-w-4xl px-4 py-10">
  <h1 className="text-xl font-semibold tracking-tight">Earnings</h1>
  ...
  {/* Desktop: the shadcn table with real <th scope="col"> headers. */}
  <div className="hidden md:block">
    <Table>
      <TableHeader><TableRow><TableHead scope="col">Space</TableHead>...</TableRow></TableHeader>
      <TableBody>{displayRows.map(({ data, view }) => (<TableRow key={data.bookingId}>...</TableRow>))}</TableBody>
    </Table>
  </div>

  {/* Mobile: stacked cards (the table collapses to a card per booking). */}
  <div className="space-y-3 md:hidden">
    {displayRows.map(({ data }) => (<PayoutRow key={data.bookingId} row={data} />))}
  </div>
</div>
```

**Empty state** (`earnings/page.tsx:145-152`) — dashed border, heading + prose, no CTA on host surfaces:
```tsx
<div className="rounded-lg border border-dashed p-10 text-center">
  <h2 className="text-lg font-medium">No earnings yet</h2>
  <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">...</p>
</div>
```

`/bookings` (booker) uses the same shell but adds the coral `Find a space` CTA in the empty state — take the coral button recipe from `bookings/[id]/page.tsx:272-274`:
```tsx
<Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
  <Link href="/">Find another space</Link>
</Button>
```

---

### `src/components/booking/booking-status.ts` + `booking-status-badge.tsx` (utility + component)

**Analog:** `src/components/host/payout-ledger-status.ts` / `payout-state-badge.tsx` — UI-SPEC § Status badge matrix explicitly says "mirroring `derivePayoutLedgerView` exactly".

**Pure view derivation** (`payout-ledger-status.ts:12-49`):
```typescript
/** The payout-ledger state machine (mirrors host_payout_ledger.state / payout_ledger_state enum). */
export type PayoutLedgerState = "held" | "processing" | "paid" | "refunded" | "failed";

export type PayoutLedgerView = {
  label: string;
  tone: "muted" | "outline" | "success" | "attention";
  helper?: string;
  datePrefix: "Expected" | "Paid" | "Refunded";
};

export function derivePayoutLedgerView(state: PayoutLedgerState): PayoutLedgerView {
  switch (state) {
    case "held":
      return { label: "Held", tone: "muted", helper: "Held until after the session", datePrefix: "Expected" };
    case "processing":
      return { label: "Processing", tone: "outline", datePrefix: "Expected" };
    case "paid":
      return { label: "Paid", tone: "success", datePrefix: "Paid" };
    ...
  }
}
```
> `deriveBookingStatusView(status, endsAt, now)` adds the D-102 derived `completed` **inside** this switch's input mapping — the DB never stores it. Keep the function pure and pass `now` in (never `Date.now()` at the call site — 07-RESEARCH Pitfall 6).

**Badge recipe table keyed by state, not tone** (`payout-state-badge.tsx:25-58`) — the comment explains exactly why the booking badge needs the same:
```typescript
// Per-state badge recipe: a distinct icon + (variant | success className). Keyed by STATE (not tone) because
// Held and Refunded share the neutral "muted" tone yet must show different icons (Clock vs Undo2).
const BADGE_RECIPES: Record<Exclude<PayoutLedgerState, "failed">,
  { Icon: LucideIcon; variant?: BadgeVariant; className?: string }> = {
  held: { Icon: Clock, variant: "secondary" },
  processing: { Icon: ArrowLeftRight, variant: "outline" },
  paid: { Icon: CheckCircle2, className: "border-transparent bg-success text-success-foreground" },
  refunded: { Icon: Undo2, variant: "secondary", className: "text-muted-foreground" },
};

export function PayoutStateBadge({ state }: { state: PayoutLedgerState }) {
  const view = derivePayoutLedgerView(state);
  const { Icon, variant, className } = BADGE_RECIPES[state as Exclude<PayoutLedgerState, "failed">];
  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className="size-3" aria-hidden="true" />
      {view.label}
    </Badge>
  );
}
```
> UI-SPEC D-79 rule: the `cancelled` refund line is a **sibling** of this badge, never interpolated into it. `BookingStatusBadge` returns only the badge; the row/page renders `₱500 refunded` beneath it.

---

### `src/components/booking/booking-row.tsx` / `host-booking-row.tsx` (component, read)

**Analog:** `src/components/host/payout-row.tsx` — D-105's "shared shell" is literally this component's shape.

**Props are pre-formatted, server-computed strings** (`payout-row.tsx:22-34`) — the row does zero formatting of money or dates:
```typescript
export type PayoutRowData = {
  bookingId: string;
  spaceTitle: string;
  /** Pre-formatted, venue-tz-safe booking window label (e.g. "Jul 18"). */
  whenLabel: string;
  grossCents: number;
  ...
  /** Pre-formatted, venue-tz-safe expected/paid/refunded date (e.g. "Jul 20"). */
  dateLabel: string;
};
```

**Card + title/meta + badge header, then a `<dl>`** (`payout-row.tsx:40-79`) — the `<dl>`/`<dt>`/`<dd>` structure is what UI-SPEC § Accessibility requires for the refund breakdown too:
```tsx
<Card>
  <CardContent className="space-y-3 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{row.spaceTitle}</p>
        <p className="text-sm tabular-nums text-muted-foreground">{row.whenLabel}</p>
      </div>
      <PayoutStateBadge state={row.state} />
    </div>

    <dl className="space-y-1.5 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted-foreground">Booking</dt>
        <dd className="tabular-nums">{formatMoney(row.grossCents, row.currency)}</dd>
      </div>
      ...
    </dl>
  </CardContent>
</Card>
```

> ⚠️ **C8 rename target lives in this file** (`payout-row.tsx:58`): `<dt className="text-muted-foreground">FitOut service fee (10%)</dt>` → `FitOut commission (10%)`. The matching desktop cell is `earnings/page.tsx:167` (`<TableHead>Fee</TableHead>`) + `:185-187`.

---

### `src/components/booking/refund-breakdown.tsx` (component, read)

**Analog:** `src/components/booking/price-breakdown.tsx` — same "server-computed props only, zero arithmetic" contract, inverted direction.

**The zero-arithmetic contract + the RESERVED slot** (`price-breakdown.tsx:1-9, 51-55`) — note this comment block is a **modification target**, since D-74 supersedes its instruction:
```typescript
// It renders the frozen quote (booking.quotedTotalCents + currency, D-49) as a FEE-EXTENSIBLE line-item
// list — NEVER a client recompute (CLAUDE.md "never trust the client for price/time"): the subtotal/Total
// are the exact frozen cents and `hours` is server-derived and passed in, so this component does ZERO
// price arithmetic. The RESERVED slot below (above the Total divider) exists for any FUTURE booker-visible
// line with zero layout shift — but per D-50 the commission is a HOST-side deduction, so the booker
// breakdown STAYS subtotal = total ... Do NOT add a fee line to the booker view (D-50/Pitfall 6).
```
```tsx
{/*
  RESERVED SLOT (D-46) — renders NOTHING for the booker. The commission is HOST-side (D-50), so the
  booker breakdown stays subtotal = total; NO `Service fee` / commission line goes here ...
*/}
```
> **Both comments must be rewritten to record that D-74 supersedes D-50's booker half** (UI-SPEC § Modified existing components), or a future reader reverts the fee line as a regression.

**Line-item row + total + tabular-nums** (`price-breakdown.tsx:44-66`) — the refund breakdown's six lines use this exact row shape:
```tsx
<div className="flex items-baseline justify-between gap-4 text-sm">
  <span className="text-muted-foreground">{runLabel}</span>
  <span className="tabular-nums">{formatMoney(quotedTotalCents, currency)}</span>
</div>
<Separator />
<div className="flex items-baseline justify-between gap-4">
  <span className="text-sm font-semibold">Total</span>
  <span className="text-xl font-semibold tabular-nums">{formatMoney(quotedTotalCents, currency)}</span>
</div>
<p className="text-xs text-muted-foreground">Final price — no added fees. You&apos;ll pay this now.</p>
```
> ⚠️ `price-breakdown.tsx:66` is the **C7 copy violation** — `Final price — no added fees.` becomes `Includes our service fee. You'll pay this now.`

---

### `src/app/bookings/[id]/cancel/page.tsx` + `src/app/bookings/[id]/page.tsx` (MOD)

**Analog:** `src/app/bookings/[id]/page.tsx` itself — the owner-gate + status-branch structure is already there.

**Owner-gate with identical 404 for missing vs not-mine** (`bookings/[id]/page.tsx:41-73`):
```typescript
//   - T-04-CONFIRMIDOR (a MUST-NOT-SKIP control): the booking is loaded owner-gated —
//     booking.bookerId === session.userId, else notFound(). A missing row and a row owned by a DIFFERENT
//     booker return the SAME bare 404, so guessing/leaking an id reveals nothing (V4/IDOR, D-43).
const session = await auth.api.getSession({ headers: await headers() });
const userId = session?.user?.id;
if (!userId) notFound();

const [bk] = await db.select({ /* ... */ }).from(booking).where(eq(booking.id, id));

// Owner-gate (T-04-CONFIRMIDOR, D-43) — the route group is NOT the gate. Missing OR not-mine → the same 404.
if (!bk || bk.bookerId !== userId) notFound();
```

**Calm terminal-state landing** (`:250-279`) — D-97's expired-approval state clones this tone and shape exactly (muted secondary badge, icon + text, no red, coral forward CTA):
```tsx
<Card>
  <CardContent role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-10 text-center">
    <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
      <XCircleIcon className="size-4" aria-hidden="true" />
      Declined
    </Badge>
    <div className="space-y-1">
      <h1 className="text-xl leading-tight font-semibold">This request wasn&apos;t available</h1>
      <p className="mx-auto max-w-prose text-sm text-muted-foreground">...</p>
      <p className="text-xs text-muted-foreground">{tzNote}</p>
    </div>
    <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
      <Link href="/">Find another space</Link>
    </Button>
  </CardContent>
</Card>
```

**Label derivation from the frozen quote** (`:107-126`) — the cancel page needs the same `fullDay` re-derivation + `venueTzNote`:
```typescript
const hours = windowHours(bk.startsAt, bk.endsAt);
const quoted = bk.quotedTotalCents ?? 0;
const hourlyTotal = lst.hourlyRateCents != null ? lst.hourlyRateCents * hours : null;
const fullDay = hourlyTotal == null || quoted !== hourlyTotal;
const dateLabel = format(bk.startsAt, "EEEE, MMM d, yyyy", { in: inTz });
const tzNote = venueTzNote(lst.city, timezone);
const totalLabel = formatMoney(quoted, bk.currency ?? DISPLAY_CURRENCY);
```

**Container** (`:131`): `<main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">` — matches UI-SPEC for `/bookings/[id]/cancel`.

> **New for the cancel RSC:** `now` must come from Postgres, not JS (07-RESEARCH Pitfall 6). No existing page reads `now()` for display — this is the one genuinely new bit. Use `db.execute(sql\`SELECT now() AS "now"\`)` and pass the result into `quoteRefund`.

---

### `src/components/host/host-cancel-dialog.tsx` (component, client)

**Analog:** `src/components/host/request-row.tsx:55-150` — the decline confirm dialog is the two-step dialog's single-step ancestor.

**Client action wiring: pending state, toast, calm 0-row result** (`request-row.tsx:89-106`):
```typescript
async function handleDecline() {
  if (declining) return;
  setDeclining(true);
  try {
    const res = await declineRequest(requestId);
    if (res.ok) {
      toast.success(`Request declined. The slot is free again and we've let ${bookerLabel} know.`);
      setDeclineOpen(false);
    } else {
      toast.error(res.error);
      setDeclining(false);
      setDeclineOpen(false);
    }
  } catch (e) {
    setDeclining(false);
    throw e;
  }
}
```

**Neutral-outline confirm dialog — NOT destructive-red** (`request-row.tsx:121-147`). UI-SPEC locks both cancel confirms to this same treatment:
```tsx
{/* Decline — neutral outline opening a confirm dialog (the irreversible "no"). NOT destructive-red. */}
<Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
  <DialogTrigger asChild>
    <Button variant="outline" size="sm" aria-label={`Decline request from ${bookerLabel}`}>Decline</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Decline this request?</DialogTitle>
      <DialogDescription>
        We&apos;ll let {bookerLabel} know their request for {whenLabel} wasn&apos;t available, and free
        the slot for other guests. This can&apos;t be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild><Button variant="ghost" disabled={declining}>Keep it</Button></DialogClose>
      <Button variant="outline" onClick={handleDecline} disabled={declining} aria-disabled={declining}>
        {declining ? "Declining…" : "Decline request"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```
> The host-cancel dialog adds pane state (`reason` → `consequences`), a required `select`, and a required `checkbox` — but the disable-on-submit, toast, and `Keep booking` ghost/outline pairing all come from here unchanged.

---

### `src/components/notifications/notification-bell.tsx` (component, client)

**Analog:** `src/components/booking/pending-payment-state.tsx:29-49` — D-84 says clone this poller "verbatim".

**Hook discipline: interval callback is the only setState site; router through a ref** (`pending-payment-state.tsx:11-13, 22-49`):
```typescript
// Hook discipline mirrors HoldCountdown: the setInterval callback is the ONLY state-mutation site (never a
// synchronous setState in the effect body — react-hooks/set-state-in-effect); the interval is cleared on
// unmount; the router is read through a ref so a new router identity never re-subscribes (restarts) it.

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 8;

const routerRef = React.useRef(router);
React.useEffect(() => { routerRef.current = router; }, [router]);

React.useEffect(() => {
  let count = 0;
  const id = window.setInterval(() => {
    count += 1;
    routerRef.current.refresh();
    if (count >= MAX_ATTEMPTS) { window.clearInterval(id); setSlow(true); }
  }, POLL_INTERVAL_MS);
  return () => window.clearInterval(id);
}, []);
```
> **Bell adaptation:** longer interval (bounded, not 2.5s), and add the `document.hidden` pause D-84 requires — that guard is new; everything else is a direct copy. **Do not** add `aria-live` to the panel body (UI-SPEC § Accessibility).

**Header-mounted count badge, hidden at 0** (`(host)/host/layout.tsx:69-80`) — the bell sits alongside this, and the unread badge copies its exact recipe:
```tsx
{/* Neutral request-inbox nav (D-65) — a secondary count badge, hidden at 0. Never coral. */}
<Link href="/host/requests" className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
  Requests
  {pendingRequests > 0 && (
    <Badge variant="secondary" aria-label={`${pendingRequests} requests to review`}>
      {pendingRequests}
    </Badge>
  )}
</Link>
```

**Owner-scoped count query in the layout** (`(host)/host/layout.tsx:40-47`) — the unread-notification count clones this shape into **both** layouts:
```typescript
// Pending-request count (D-65) for the header nudge — owner-scoped booking JOIN listing, status='requested'
const [{ p } = { p: 0 }] = await db
  .select({ p: count() })
  .from(booking)
  .innerJoin(listing, eq(booking.listingId, listing.id))
  .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")));
const pendingRequests = p ?? 0;
```

---

### `src/lib/db/schema.ts` (MOD) + migrations

**Analog for a new enum + table:** `payoutLedgerState` + `hostPayoutLedger` (`schema.ts:267-313`). Copy the "declared before the table it backs (const TDZ)" ordering and the FK-restrict discipline for financial records:
```typescript
// Host payout state machine (D-59). ... Declared before the table it backs (const TDZ),
// mirroring the bookingStatus pgEnum idiom.
export const payoutLedgerState = pgEnum("payout_ledger_state", ["held","processing","paid","refunded","failed"]);

export const hostPayoutLedger = pgTable(
  "host_payout_ledger",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .unique() // the at-most-once payout gate (DB-enforced idempotency)
      .references(() => booking.id, { onDelete: "restrict" }),
    ...
    state: payoutLedgerState("state").default("held").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [index("host_payout_ledger_host_idx").on(t.hostId)],
);
```

**Analog for nullable, backfill-free snapshot columns:** `booking.bookingMode` (`schema.ts:415-420`) — `booking.cancellationPolicy` is the same idea (creation-time snapshot, nullable, no default, no backfill) and should carry the same comment structure:
```typescript
// D-61 creation-time booking-mode SNAPSHOT (display/audit only — lifecycle correctness rests on
// `status`, NOT this column). Nullable, no default, no backfill: existing bookings predate the
// request-to-book fork. Captured at creation so a later listing.bookingMode edit ... never rewrites an
// in-flight booking's mode. Live-DB ADD COLUMN is drizzle/0011 (backfill-free, mirrors 0006).
bookingMode: bookingMode("booking_mode"),
```

**Analog for a partial index** (`schema.ts:435-438`) — the `notification_unread_idx` partial index uses this exact `.where(sql\`...\`)` idiom:
```typescript
// Partial-unique idempotency index (D-42 / RESEARCH Pattern 6): at most one booking per client token.
// Drizzle CAN express a partial unique index via .where() (same idiom as listing_photo_position_uq);
uniqueIndex("booking_idem_uq").on(t.idempotencyKey).where(sql`idempotency_key IS NOT NULL`),
```

**Analog for a generated column migration:** `drizzle/0011_booking_request_columns.sql` — note the harness note about unqualified names:
```sql
-- Custom SQL migration (Phase 6) — the request-to-book column + default, split BETWEEN the enum-add (0010)
-- and its first USE (0012) per Pitfall 2. (a) booking.booking_mode: a nullable, backfill-free ADD COLUMN
-- ... Unqualified table/column +
-- enum type so the integration harness (tests/helpers/db.ts) replays it idempotently into every isolated
-- schema (the booking_mode type resolves via the schema-first search_path).
ALTER TABLE "booking" ADD COLUMN "booking_mode" "booking_mode";--> statement-breakpoint
```

**Analog for a hand-authored constraint migration:** `drizzle/0012_booking_exclusion_v2.sql` — the `UNIQUE(booking_id)` → `UNIQUE(booking_id, kind)` change on `host_payout_ledger` clones the DROP + re-ADD shape and the migrator-transaction reasoning:
```sql
-- Custom SQL migration (Phase 6, D-63, T-06-01) — WIDEN the double-booking keystone ... Postgres has no
-- `ALTER CONSTRAINT ... WHERE`, so the EXCLUDE is DROPped and re-ADDed.
--
-- WHY the complement (load-bearing): drizzle-orm's postgres-js migrator wraps ALL pending migrations in
-- ONE transaction ... naming them as ENUM
-- literals here would raise Postgres 55P04 "unsafe use of new enum value" and roll back the whole
-- `npm run db:migrate`.
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ("listing_id" WITH =, "unit" WITH =, tstzrange("starts_at","ends_at",'[)') WITH &&)
  WHERE ("status" NOT IN ('cancelled', 'declined', 'completed'));
```
> **`cancellation_policy` and `ledger_kind` are BRAND-NEW types** — `CREATE TYPE … AS ENUM` and its first use may share a transaction. The 55P04 two-migration split (`0010`/`0012`) applies **only** to `ALTER TYPE … ADD VALUE`. If the planner ever needs a new `booking_status` value, that split is mandatory — see `drizzle/0010_booking_request_states.sql`.

**Backfill inside a migration** (`drizzle/0008_payout_ledger.sql:25-28`) — the `space_price_cents = quoted_total_cents` backfill clones this hand-edit pattern:
```sql
-- Hand-edit (D-46): a column DEFAULT change does NOT touch existing rows, so backfill any listing still
-- on the pre-D-46 'usd' default to 'php' — charge currency must be consistent end-to-end.
UPDATE "listing" SET "currency" = 'php' WHERE "currency" = 'usd';--> statement-breakpoint
```

---

### `src/lib/availability/units.ts` (MOD :264) — the D-94 fix

**Analog:** itself. The bug and its neighborhood:
```typescript
// (3) Server-frozen price quote (D-45/D-46) + parameterized TTL (D-47 instant default / D-64 SLA).
const quote = quoteWindow({ startUtc: startsAt, endUtc: endsAt, fullDay, hourlyRateCents, dayRateCents });
const expiresAt = new Date(Date.now() + ttlMs);   // ← units.ts:264 — JS clock AND uncapped
```
The SQL-expression idiom to imitate is two lines above it, in the in-tx sweep (`units.ts:254-260`), which already casts and parameterizes correctly:
```typescript
await tx.execute(sql`
  UPDATE booking
  SET status = (CASE WHEN status = 'requested' THEN 'declined' ELSE 'cancelled' END)::booking_status,
      expires_at = NULL
  WHERE listing_id = ${input.listingId}
    AND status IN ('pending','requested','approved') AND expires_at <= now()
    AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startIso}, ${endIso}, '[)')`);
```
And the DB-clock predicate idiom (`units.ts:172-182`) shows the established `expires_at > now()` occupancy form.

> ⚠️ **Pitfall 8 applies here** — the SAVEPOINT insert at `units.ts:274-287` currently passes the JS `expiresAt` value. After the change, add `.returning({ expiresAt: booking.expiresAt })` and audit every consumer of `createPendingHold`'s `HoldSuccess` shape (`units.ts:154`) — `tsc` will **not** catch a broken countdown.

**Where the post-start refusal goes** (`src/app/actions/booking.ts:263-272`) — this is the existing status-guard the checkout-initiation refusal joins, **not** the webhook (07-RESEARCH Pitfall 4):
```typescript
// A live hold to pay for is either a `pending` instant hold OR an `approved` request (pay-on-approval,
// PAY-05 / D-63 ...). Any other status ... has no live hold left to pay for.
if (bk.status !== "pending" && bk.status !== "approved") {
  return { ok: false, reason: "expired",
    error: "Your hold is no longer active. Check availability again." };
}
```
The DB-clock window extension immediately below (`booking.ts:303-306`) is the model for a `LEAST(...)`-capped SQL write from an action:
```typescript
await db.execute(sql`
  UPDATE booking
  SET expires_at = GREATEST(expires_at, now() + make_interval(mins => ${PAYMENT_WINDOW_MINUTES}))
  WHERE id = ${holdId} AND booker_id = ${userId} AND status IN ('pending','approved')`);
```

---

### `src/components/availability/slot-picker.tsx` + `read-model.ts` (MOD) — D-98/D-100

**Analog:** itself. Add the fourth `SlotState` member (`read-model.ts:28`):
```typescript
export type SlotState = "available" | "unavailable" | "past" | "beyond_horizon";
```
…then extend the reason switch (`slot-picker.tsx:64-74`) — the `default` case means a new state renders as `Unavailable` unless explicitly handled, so **add explicit cases**:
```typescript
/** Human-readable reason a chip can't be picked (never leaks "unit"/"tstzrange" jargon — UI-SPEC copy). */
function reasonFor(state: AvailabilitySlot["state"]): string {
  switch (state) {
    case "past": return "Past";
    case "beyond_horizon": return "Too far ahead";
    default: return "Unavailable";
  }
}
```
The unselectable chip treatment needs **zero change** (`slot-picker.tsx:152-176`) — the new state flows through it automatically:
```tsx
// Occupied / blocked / past / beyond-horizon: visible, muted, struck-through, NEVER
// selectable, NEVER red. The wrapping span carries the tooltip (a disabled control
// wouldn't receive hover) — mirrors the "Not bookable yet" affordance on this page.
<Tooltip key={slot.startUtc}>
  <TooltipTrigger asChild>
    <span className="inline-flex">
      <ToggleGroupItem value={slot.startUtc} disabled aria-disabled="true"
        aria-label={`${timeLabel} — ${reasonFor(slot.state)}`}
        className={cn(CHIP_BASE, "cursor-not-allowed bg-muted text-muted-foreground line-through")}>
        <span className="tabular-nums">{timeLabel}</span>
      </ToggleGroupItem>
    </span>
  </TooltipTrigger>
  <TooltipContent>{reasonFor(slot.state)}</TooltipContent>
</Tooltip>
```

---

### Listing wizard — cancellation policy step (D-77)

**Analog:** `wizard.tsx:666-714` (Step-5 booking-mode `RadioGroup`) — three cards instead of two, **no pre-selection**:
```tsx
<RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
  {[
    { value: "instant" as const, title: "Instant book",
      body: "Guests book available times immediately — no approval needed." },
    { value: "request" as const, title: "Request to book",
      body: "You review and approve each request before it's confirmed." },
  ].map((opt) => (
    <label key={opt.value}
      className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4",
        field.value === opt.value && "border-primary")}>
      <RadioGroupItem value={opt.value} className="mt-1" />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{opt.title}</span>
        <span className="block text-sm text-muted-foreground">{opt.body}</span>
      </span>
    </label>
  ))}
</RadioGroup>
```

**Publish checklist row** (`wizard.tsx:284-302`) — add one entry; do **not** invent a new blocked affordance:
```typescript
// The live D-02 publish checklist (drives the review step). Each row links back to its step.
const checklist: { label: string; done: boolean; step: number | null; action?: () => void }[] = [
  { label: "Title", done: Boolean(values.title), step: 1 },
  ...
  { label: "3+ photos", done: photoCount >= 3, step: 3 },
];
const publishEligible = checklist.every((c) => c.done);
```
→ add `{ label: "Choose a cancellation policy", done: Boolean(values.cancellationPolicy), step: N }`.

---

### Tests

**Unit-test analog:** `tests/payments/commission.test.ts` for `cancellation.test.ts` / `service-fee.test.ts`.

**Integration analog:** `tests/payments/payout-sweep.test.ts` — the header states the invariants under test before any code, and the file uses the isolated-schema harness plus racing clients:
```typescript
// PAY-03 payout sweep (D-55/D-56) + PAY-02 commission freeze, exercised against an isolated schema with
// @/lib/paymongo mocked (mockPayMongo) so no live PayMongo call fires. Proves the load-bearing invariants:
//   - DUE SELECTION: only `confirmed` bookings past ends_at + PAYOUT_DELAY_HOURS (DB clock) ...
//   - AT-MOST-ONCE UNDER CONCURRENCY: two independent connections sweeping the SAME booking → exactly one
//     ledger row and ≤1 transfer (the ON CONFLICT loser fires nothing).

import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
```

**The racing-clients primitive** (`tests/helpers/db.ts:59-67`) — this is what makes "concurrent cancel + payout sweep" and "double-tap under cron retry" real tests rather than mocks:
```typescript
/**
 * Open `n` INDEPENDENT postgres.js connections bound to one isolated test schema. Unlike the
 * shared max:1 `makeClient`, these can fire genuinely concurrent inserts so the SC#4 exclusion
 * race is real (RESEARCH Pitfall 1 — a single max:1 client serializes and proves nothing).
 */
export function makeRacingClients(schema: string, n: number) { ... }
```
Migrations are replayed into each schema by `setupTestDb` (`tests/helpers/db.ts:97-109`) — **every new migration must use unqualified table/type names** or it will not replay:
```typescript
for (const file of migrationFiles()) {
  const raw = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
  const rewritten = raw.replaceAll('"public".', `"${schema}".`);
  const statements = rewritten.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await bootstrap.unsafe(`SET search_path TO "${schema}", public; ${statement}`);
  }
}
```

---

## Shared Patterns

### Ownership / IDOR gating (applies to: both cancel actions, `/bookings`, `/host/bookings`, notification reads, notification mark-read action)

**Source:** `src/app/actions/host-requests.ts:110-113` (action path) + `src/app/(host)/host/requests/page.tsx:55-78` (read path) + `src/app/bookings/[id]/page.tsx:72-73` (detail path).

Three rules, all already proven:
1. The route group is **never** the gate — pages re-check session + capability (`earnings/page.tsx:45-54`).
2. Reads are **owner-scoped in the `WHERE`**, never post-filtered.
3. Missing and cross-user return the **identical** denial (`DENIED` const / bare `notFound()`), so an id is not an enumeration oracle.

```typescript
// Re-check ownership + capability server-side (the route group is NOT the gate). A cross-host id and a
// missing id both fall through to null → the SAME calm denial (leak nothing).
if (!row || row.hostId !== userId || !row.hostCanHost) return null;
```

### Rate limit + audit on money-adjacent actions (applies to: both cancel actions)

**Source:** `src/lib/rate-limit.ts:37-57`, `src/lib/audit.ts:35-44`, call pattern at `host-requests.ts:157-166` and `booking.ts:276-296`.

```typescript
const CANCEL_RATE_LIMIT = { window: 60, max: 5 } as const;  // mirrors approve/confirm budgets
const limit = rateLimit(`cancel-booking:${userId}`, CANCEL_RATE_LIMIT);
if (!limit.ok) {
  await recordAudit({ actorId: userId, action: "cancel_booking", outcome: "denied",
    meta: { reason: "rate_limit", bookingId, retryAfter: limit.retryAfter } });
  return { ok: false, error: "You're going a little fast. Please try again in a moment." };
}
```
Audit outcomes available (`src/lib/audit.ts:18`): `"ok" | "denied" | "error" | "needs_attention"` — D-90's permanent-failure sink uses `needs_attention`, already the established channel.

### DB clock as the sole authority (applies to: cancel action, refund preview RSC, all four reminder queries, tab partitioning, expiry writes)

**Source:** `host-requests.ts:19-23`, `request-expiry.ts:12-14`, `payout-sweep.ts:16-17`.
```typescript
// THE DB CLOCK now() IS THE SOLE EXPIRY AUTHORITY (T-06-16), never a JS/client clock — the sweep keys off
// SQL `expires_at <= now()`, exactly mirroring the Phase-4 lazy-expiry discipline and the payout-sweep due
// predicate.
```
Every new predicate uses `now()` / `make_interval(hours => ${CONST}::int)` in SQL. The `::int` cast on interpolated constants is the house style (`payout-sweep.ts:79`).

### Notification emission (applies to: both cancel actions, `host-requests.ts`, `booking.ts`, `request-expiry.ts`)

**Source pattern being REPLACED:** `host-requests.ts:200` — `void sendRequestApproved(...)`.
**Source pattern to ADOPT:** the fire-and-forget *discipline* from `request-expiry.ts:159-164`, applied to `inngest.send()` after commit:
```typescript
await recordAudit(...);
try {
  await inngest.send({ name: "fitout/notify", data: { ... } });
} catch (err) {
  // A notification-transport failure must NEVER fail a money/state action whose durable write succeeded.
  console.error("[notify] enqueue_failed", { bookingId, err });
}
```
Never inside `db.transaction` (07-RESEARCH § Emitting without blocking).

### Money display (applies to: every new price/refund surface)

**Source:** `src/lib/money.ts` via `payout-row.tsx:54`, `price-breakdown.tsx:48`, `host/requests/page.tsx:99`.
- `formatMoney(cents, currency)` with `currency ?? DISPLAY_CURRENCY`.
- Integer centavos everywhere; components receive **pre-computed** values and do zero arithmetic.
- Every money cell carries `tabular-nums`.

### Venue-local time (applies to: every new time surface)

**Source:** `host-requests.ts:122-133` (`composeWhenLabel`), duplicated verbatim in `request-expiry.ts:144-155` and `host/requests/page.tsx:84-97`.
> It is already duplicated three times. **07-RESEARCH § Don't Hand-Roll explicitly warns against creating a fifth format.** Prefer extracting it into a shared helper as part of this phase rather than adding a fourth copy.

### `dbConn` injection for testability (applies to: reminders, notify, any new sweep)

**Source:** `payout-sweep.ts:69` / `request-expiry.ts:65` — every queryable/mutating function takes `dbConn: DbConn` (`src/lib/availability/read-model.ts:26`) as its first arg so integration tests can bind an isolated schema:
```typescript
export async function queryDuePayouts(dbConn: DbConn): Promise<DuePayout[]> { ... }
export async function payOne(dbConn: DbConn, b: DuePayout): Promise<PayOneResult> { ... }
```

### PayMongo call shape (applies to: `instapay` refund transfer, if D-72 is built)

**Source:** `src/lib/paymongo.ts:266-310` (`createBatchTransfer`). The `instapay` path is the same function with a different `provider`, destination `bic`, and — critically — a **different idempotency namespace**:
```typescript
export async function createBatchTransfer(input: {...}): Promise<BatchTransfer> {
  const json = await paymongoFetch<...>("/v2/batch_transfers", {
    method: "POST",
    idempotencyKey: `payout:${input.bookingId}`,      // ← refunds MUST use `refund:${bookingId}` (Pitfall 10)
    body: { transfers: [{
      provider: "paymongo",                            // ← "instapay" for a booker refund
      amount: input.netCents,
      reference_number: `payout-${input.bookingId}`,   // ← must be unique per attempt for instapay
      source_account: { number: PLATFORM_WALLET.number, name: PLATFORM_WALLET.name, bic: PLATFORM_WALLET.bic },
      destination_account: { number: input.destination.number, name: input.destination.name,
        bic: input.destination.bic ?? "PAEYPHM2XXX" },
      metadata: { booking_id: input.bookingId },
    }] },
  });
  const transfer = json.data?.attributes?.transfers?.[0];
  return { batchId: json.data?.id ?? "", transferId: transfer?.id ?? "", status: transfer?.status ?? "" };
}
```
The rail predicate to extract into `refund-rail.ts` already exists inline at `src/app/api/paymongo/webhook/route.ts:40-42`:
```typescript
// Payment rails PayMongo can API-refund (Pitfall 1). QRPh + UBP Online Banking are NOT refundable via the
// API — the gone-slot backstop must operator-alert those, never call createRefund (it would 4xx).
const REFUNDABLE_RAILS = new Set(["card", "gcash", "grab_pay", "paymaya"]);
```

### Zod validation at the boundary (applies to: cancel form, tier selection, notification payload, bank-details form)

**Source:** `src/lib/validation/booking.ts:1-9, 92-100` — the "validate on the client, re-derive on the server" contract:
```typescript
// Shared booking / slot-selection validation (Zod 4). Clones the listing.ts contract: the SAME schema
// validates the booker's client-side selection ... and is re-validated
// server-side when the real booking is inserted — the client is NEVER trusted for times/units
```
```typescript
export const bookingCreateSchema = z
  .object({ listingId: z.string().min(1), ...slotWindowShape, idempotencyKey: z.string().min(1).optional() })
  .refine(endAfterStart, endAfterStartIssue);
```
> For cancel, the client sends **only a booking id** (07-RESEARCH § Threat Patterns) — the amount and tier are server-derived from the snapshot.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/inngest/functions/notify.ts` | service | event-driven | **No event-triggered Inngest function exists** — all three shipped functions are crons. The `createFunction` options/`step.run` shape transfers from `request-expiry.ts:175-188`, but `triggers: [{ event }]`, `retries`, and `onFailure` have no in-repo precedent. Use 07-RESEARCH § Inngest Event-Driven Email as the reference and assert `onFailure` with a forced-exhaustion test (A9). |
| `src/components/booking/bookings-tabs.tsx` | component | read | **No server-navigated tab control exists.** `search-results.tsx:107-120` provides the URL-param mutation idiom but is a `"use client"` component using `router.push`; UI-SPEC specifies plain `Link`s styled as `tabs` with `aria-current="page"`. Compose from the installed `tabs` styles + `next/link`. |
| Keyset "Load more" pagination | component/query | read | The Phase-4 idiom (`search-results.tsx:120` → `p.set("page", ...)`) is **offset-based**. 07-RESEARCH recommends **keyset** for the unbounded Past tab. This is a deliberate divergence from the analog — the planner should record it. |

**Partial-analog notes (build with care):**
- **DB `now()` for display** — no page currently reads the DB clock for rendering. The cancel-review RSC is the first (Pitfall 6).
- **`document.hidden` polling pause** — `pending-payment-state.tsx` does not pause on hidden; that guard is genuinely new.
- **Netting inside `payOne`** — 07-RESEARCH Finding 3 confirms *"the 'netted against the host's next payout' mechanism does not exist and must be built."* The claim/transfer ordering in `payout-sweep.ts:109-184` is the frame; the netting arithmetic is new.

---

## Metadata

**Analog search scope:** `src/app/actions/`, `src/app/(app)/`, `src/app/(host)/`, `src/app/bookings/`, `src/app/api/`, `src/components/{booking,host,search,availability,ui}/`, `src/inngest/`, `src/lib/{payments,db,availability,validation}/`, `drizzle/`, `tests/`
**Files scanned:** 118 TS/TSX source files + 13 migrations + 68 test files (inventory); 31 read in full or in targeted ranges
**Project skills:** none found (`.claude/skills/`, `.agents/skills/` absent)
**Pattern extraction date:** 2026-07-21
</content>
</invoke>
