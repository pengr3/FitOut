// PayMongo webhook — the architectural KEYSTONE of Phase 2 (PAY-04, D-14/D-15).
//
// This route is the SINGLE writer of host_payout.payoutsEnabled: it verifies the Paymongo-Signature,
// dedupes by event id, and on `merchant.activated` caches payoutsEnabled=true (on `merchant.declined`
// caches false). Because bookability is DERIVED from that cached flag (src/lib/bookability.ts), the
// D-14 auto-revert is free — a decline flips every one of the host's listings to not-bookable with
// ZERO per-listing writes. The webhook is the trust boundary for payout state; nothing else may set it.
//
// NOTE (verified, no code change): src/middleware.ts matches ONLY /login and /signup — it does NOT
// touch /api/paymongo, so this endpoint is reachable by PayMongo unauthenticated (correct — PayMongo
// is the caller, and the Paymongo-Signature is the authentication).

import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { booking, hostPayout, hostPayoutLedger, listing, paymongoEvent, user } from "@/lib/db/schema";
import { createRefund } from "@/lib/paymongo";
// The rail-refundability question is answered in exactly ONE place (07-03). Do not re-inline the set here —
// if the Plan-16 probe refutes the QRPh premise, that module is the only file that changes.
import { isApiRefundable } from "@/lib/payments/refund-rail";
import { recordAudit } from "@/lib/audit";
import { emitNotify } from "@/lib/notifications";
import { bookingReference } from "@/lib/booking/reference";
import { composeWhenLabel } from "@/lib/booking/when-label";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";

// Signature verification needs node crypto + the RAW request body — this MUST be the Node runtime, not edge.
export const runtime = "nodejs";

// Fail-closed prod boot guard (WR-03, mirrors src/lib/paymongo.ts + src/app/api/inngest/route.ts): the
// webhook is the SOLE booking-confirm authority (D-57), so a missing/rotated-out secret would silently make
// verifySignature fail-closed and 400 EVERY delivery — bookers charged, no booking ever confirms, with no
// startup signal. Refuse to boot in production without the secret so a misconfigured deploy is a loud boot
// FAILURE, not a silent confirmation outage. dev/test/build tolerate its absence (the mocked webhook suite
// sets it per-test and `next build` must not require prod secrets).
if (process.env.NODE_ENV === "production" && !process.env.PAYMONGO_WEBHOOK_SECRET) {
  throw new Error(
    "PAYMONGO_WEBHOOK_SECRET is required in production — the webhook is the sole booking-confirm authority (D-57).",
  );
}

type SigParts = { t: string; te: string; li: string };

/**
 * The nested resource under `event.data.attributes.data`. For a `merchant.*` event this is the Linked
 * Account (its `id` = the account id — read by resolveAccountId). For `checkout_session.payment.paid` it
 * is the CheckoutSession (carrying `reference_number` = the booking id + `payments[]`). For a refund event
 * it is the Refund/Payment resource (carrying `payment_id`). All fields optional-chained (A1 — the exact
 * nesting is asserted against a captured test event in tests/paymongo/webhook-payment-paid.test.ts).
 */
type PayMongoResource = {
  id?: string;
  attributes?: {
    // checkout_session.payment.paid — the CheckoutSession
    reference_number?: string;
    payments?: Array<{ id?: string; source?: { type?: string }; status?: string }>;
    payment_method_used?: string;
    // payment.refunded / payment.refund.updated — the Refund/Payment carries the payment id
    payment_id?: string;
    payment?: { id?: string };
    // The Refund resource's own lifecycle status (succeeded / pending / failed) — WR-02 gates the
    // booking+ledger transition on a TERMINAL-SUCCESS value, never on the event type alone.
    status?: string;
  };
};

/** PayMongo event envelope (subset we read). type lives in attributes; the nested resource in attributes.data. */
type PayMongoEvent = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      merchant_id?: string;
      account_id?: string;
      data?: PayMongoResource;
    };
  };
};

/**
 * Parse `t=<ts>,te=<testSig>,li=<liveSig>` into its parts. PayMongo signs ONE mode per delivery: `te` in
 * TEST mode (empty `li`) and `li` in LIVE mode (empty `te`) — NEVER both. So we tolerate one empty part and
 * reject only a missing header, a malformed segment (no `=`), a missing `t`, or a header with BOTH
 * signatures empty. verifySignature already length-skips an empty candidate, so an empty te/li never matches.
 */
function parseSignature(header: string | null): SigParts | null {
  if (!header) return null;
  const parts: Record<string, string> = {};
  for (const seg of header.split(",")) {
    const idx = seg.indexOf("=");
    if (idx === -1) return null;
    parts[seg.slice(0, idx).trim()] = seg.slice(idx + 1).trim();
  }
  if (!parts.t || (!parts.te && !parts.li)) return null;
  return { t: parts.t, te: parts.te ?? "", li: parts.li ?? "" };
}

/**
 * Constant-time verify the signature over `${t}.${rawBody}` against BOTH the test-mode (te) and
 * live-mode (li) digests. GUARD: timingSafeEqual THROWS a RangeError on unequal-length buffers, so we
 * compare byte lengths first — a length mismatch is simply "not a match", never a thrown 500.
 */
function verifySignature(rawBody: string, sig: SigParts, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(`${sig.t}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  for (const candidate of [sig.te, sig.li]) {
    const candBuf = Buffer.from(candidate, "utf8");
    if (candBuf.length === expectedBuf.length && timingSafeEqual(candBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

/**
 * The PAYMENT RAIL used for a checkout session ("card" / "gcash" / "paymaya" / "qrph" / …), read off the
 * VERIFIED event resource — never a client-supplied field. `"unknown"` when the shape does not carry one.
 *
 * ONE resolver, two call sites (the confirm UPDATE below and handleGoneSlot). Both feed `isApiRefundable`,
 * which fails closed, so the two must agree byte-for-byte about what the rail was: a rail resolved one way
 * at confirm and another way at refund time is a silent divergence in which money moves the resolver
 * disagrees about.
 */
function resolvePaymentMethod(cs: PayMongoResource | undefined): string {
  return cs?.attributes?.payments?.[0]?.source?.type ?? cs?.attributes?.payment_method_used ?? "unknown";
}

/** The Linked-Account id the event concerns (matches host_payout.paymongoAccountId). */
function resolveAccountId(event: PayMongoEvent): string | undefined {
  const a = event.data?.attributes;
  return a?.data?.id ?? a?.merchant_id ?? a?.account_id ?? undefined;
}

/**
 * D-58 auto-refund backstop. A `checkout_session.payment.paid` whose confirm UPDATE claimed 0 rows means
 * one of two things: a BENIGN replay (the booking is already `confirmed` — do NOTHING, never refund a
 * paid+confirmed booking) OR the slot is GENUINELY GONE (the hold was swept and the slot retaken during
 * payment — e.g. the double-book-during-payment loser). For the gone case we must NEVER silently keep the
 * money: refund on a refundable rail, or raise an operator alert on QRPh/UBP (which PayMongo cannot API-
 * refund, Pitfall 1) or a failed refund. In BOTH gone-slot branches we set the booking terminal
 * (`cancelled`) so the booker's `?paid=1` return renders PaymentReversedState (Plan 03) rather than a
 * stuck interstitial.
 */
async function handleGoneSlot(
  bookingId: string,
  paymentId: string | null,
  cs: PayMongoResource | undefined,
): Promise<void> {
  // Re-read to distinguish a benign replay (already confirmed → no-op) from a genuinely gone slot, and to
  // read the SERVER-FROZEN amount to refund (mismatch-proof full refund — never trust a client body field).
  const [current] = await db
    .select({ status: booking.status, quotedTotalCents: booking.quotedTotalCents })
    .from(booking)
    .where(eq(booking.id, bookingId));
  if (!current || current.status === "confirmed") return; // never refund an already-confirmed booking

  const method = resolvePaymentMethod(cs);
  const amountCents = current.quotedTotalCents ?? 0;

  if (isApiRefundable(method) && paymentId && amountCents > 0) {
    // Refundable rail (card / GCash / GrabPay / Maya) — auto-refund the full frozen amount (D-60: no % tiers).
    try {
      await createRefund({
        amountCents,
        paymentId,
        notes: `Auto-refund: slot unavailable (${bookingId})`,
      });
      console.info("[PAYMENT] auto_refund_ok", { bookingId, paymentId, method, amountCents });
    } catch {
      // A refund API failure falls through to the operator-alert path — never swallow held money.
      console.error("[PAYMENT_ALERT] auto_refund_failed", { bookingId, paymentId, method, amountCents });
      await recordAudit({
        actorId: "system",
        action: "auto_refund_failed",
        outcome: "needs_attention",
        meta: { bookingId, paymentId, method, amountCents },
      });
    }
  } else {
    // Unrefundable rail (qrph / dob_ubp / unknown) or no captured payment id → DO NOT call the API (it
    // would 4xx, Pitfall 1). Raise an operator alert so the held money is surfaced, never silently kept.
    console.error("[PAYMENT_ALERT] needs_manual_refund", { bookingId, paymentId, method, amountCents });
    await recordAudit({
      actorId: "system",
      action: "auto_refund_manual",
      outcome: "needs_attention",
      meta: { bookingId, paymentId, method, amountCents },
    });
  }

  // Both gone-slot branches: set the booking terminal (idempotency guard — never clobber a confirmed row)
  // so the ?paid=1 return renders PaymentReversedState (D-58) rather than a stuck finalizing interstitial.
  await db.execute(sql`
    UPDATE booking SET status = 'cancelled' WHERE id = ${bookingId} AND status <> 'confirmed'`);
}

/**
 * BOOK-06 booking-confirmed notification — emitted on a SUCCESSFUL confirm (≥1 row), covering BOTH an
 * instant pay (confirmed from `pending`) and a pay-on-approval request (confirmed from `approved`). Never
 * fired on a 0-row confirm (replay / gone-slot): only a genuine transition to `confirmed` earns the receipt,
 * and that is what makes a PayMongo REDELIVERY produce no second notification — the status-scoped UPDATE is
 * the dedupe claim, one layer above the `paymongo_event` id ledger.
 *
 * 07-10 / D-83: this was `await sendBookingConfirmed(...)` behind a `void` call. It now emits the
 * `fitout/notify` event, so the send gains retry, backoff and per-run observability, and the durable in-app
 * notification row lands at parity (D-91).
 *
 * WHY THIS IS NOW AWAITED RATHER THAN `void`ed. The old `void` existed to keep a slow Resend call off the
 * 200-ACK path (T-06-15) — a rejected ACK makes PayMongo retry an already-confirmed event forever. Two
 * things changed. First, `emitNotify` is an enqueue, not a delivery: it hands off one small event and
 * returns, and it CANNOT reject (it swallows and logs its own transport errors), so it can never turn into
 * a non-200. Second, `void`ing an enqueue is actively worse than awaiting it here — the handler can return
 * and the runtime can freeze the process before an un-awaited outbound request has flushed, silently losing
 * the notification. The bounded read + enqueue below is the correct trade for that guarantee.
 *
 * The `try/catch` remains for the READ (a DB hiccup on the join): the confirm already succeeded and is
 * durable, so nothing here may affect the ACK.
 */
async function emitBookingConfirmed(bookingId: string): Promise<void> {
  try {
    const [row] = await db
      .select({
        bookerId: booking.bookerId,
        email: user.email,
        title: listing.title,
        timezone: listing.timezone,
        city: listing.city,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        spacePriceCents: booking.spacePriceCents,
        quotedTotalCents: booking.quotedTotalCents,
        currency: booking.currency,
        // WR-06 pricing-mode snapshot + the formatter's pre-0016 positive-match reference (08-15).
        fullDay: booking.fullDay,
        // The OC-03 mode SNAPSHOT (drizzle 0021). The payment receipt is the most quoted-back surface in
        // the app, so a drop-in pass must read as a pass here above all (09-08).
        openCapacity: booking.openCapacity,
        dayRateCents: listing.dayRateCents,
      })
      .from(booking)
      .innerJoin(user, eq(booking.bookerId, user.id))
      .innerJoin(listing, eq(booking.listingId, listing.id))
      .where(eq(booking.id, bookingId));
    if (!row) return;

    // The SHARED venue-local formatter (07-02). This replaced a verbatim inline copy that INFERRED the
    // mode by comparing a frozen price against a rate run-total — an inference that has since been deleted
    // outright (08-15 / CR-01), because the D-108 per-head surcharge is folded into `spacePriceCents` and
    // made it true of ordinary surcharged hourly bookings, printing "Full day" on this very receipt. The
    // mode now comes from the booking's own PERSISTED `full_day` snapshot, and the price is consulted only
    // by the formatter's pre-0016 positive day-rate match.
    const whenLabel = composeWhenLabel({
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timezone: row.timezone,
      city: row.city,
      fullDay: row.fullDay,
      openCapacity: row.openCapacity,
      spacePriceCents: row.spacePriceCents,
      quotedTotalCents: row.quotedTotalCents,
      dayRateCents: row.dayRateCents,
    });
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    await emitNotify({
      type: "booking_confirmed",
      recipientId: row.bookerId,
      bookingId,
      email: row.email,
      payload: {
        type: "booking_confirmed",
        listingTitle: row.title ?? "your space",
        whenLabel,
        totalLabel: formatMoney(row.quotedTotalCents ?? 0, row.currency ?? DISPLAY_CURRENCY),
        referenceLabel: bookingReference(bookingId),
        href: `${base}/bookings/${bookingId}`,
      },
    });
  } catch (err) {
    // The confirm already succeeded and the 200 ACK is (or will be) sent regardless. A read failure must
    // never affect that ACK (T-06-15) — log for operators and move on.
    console.error("[NOTIFY] booking_confirmed_emit_failed", { bookingId, err });
  }
}

/** The refunded payment's id (`pay_...`), derived from the verified refund event (never a client field). */
function resolveRefundPaymentId(event: PayMongoEvent): string | undefined {
  const resource = event.data?.attributes?.data;
  const attrs = resource?.attributes;
  // A Refund resource carries `payment_id`; a Payment resource's own id IS the pay_...
  return (
    attrs?.payment_id ??
    attrs?.payment?.id ??
    (resource?.id?.startsWith("pay_") ? resource.id : undefined)
  );
}

/**
 * D-60 refund mechanism. A `payment.refunded` / `payment.refund.updated` event idempotently marks the
 * booking + payout ledger refunded. The state is DERIVED from the verified event TYPE (never a client body
 * field); the outer `paymongo_event` dedupe already makes a re-delivery a 200 no-op, and the `state <>`
 * guards make a same-handler re-run harmless too. Because payout is held until T+24h post-session, a pre-
 * payout refund is JUST a platform-wallet refund — no host clawback (the host was never paid). If a ledger
 * row exists we flip it `refunded`; either way we mark the booking `cancelled` so the Plan-05 payout sweep
 * (which selects only `confirmed`) skips it.
 */
async function handleRefund(event: PayMongoEvent): Promise<void> {
  const paymentId = resolveRefundPaymentId(event);
  if (!paymentId) return;

  // WR-02: gate on the refund resource's ACTUAL terminal-success status, never the event TYPE alone.
  // `payment.refund.updated` also fires for pending/failed transitions; a refund that was ATTEMPTED and then
  // FAILED (or a partial/pending one) must NOT drive the booking to cancelled + the ledger to refunded —
  // that would tell the system the booker was made whole when the money is in fact still held (booker not
  // refunded, host now blocked from payout because the sweep skips 'cancelled'). Ignore non-terminal-success.
  const refundStatus = event.data?.attributes?.data?.attributes?.status;
  if (!["succeeded", "refunded"].includes(refundStatus ?? "")) return;

  // WR-01: only a PRE-payout ledger row (state='held') may be flipped to refunded — that money is still on
  // the platform wallet, so the refund is a clean platform-wallet reversal with no host clawback. A refund
  // that arrives AFTER the payout already fired (a row already 'processing'/'paid' — a late/manual dashboard
  // refund, dispute, or chargeback) must NEVER be silently rewritten to 'refunded': that would erase the
  // record that the host WAS paid and trigger no clawback, leaving the platform believing "no payout" while
  // real money sits in the host's wallet. Restrict the flip to 'held'; alert (clawback) on any post-payout row.
  //
  // `kind = 'payout'` (Phase 7, D-71 / Finding 3): a `host_cancel_fee` DEBIT row is also inserted `held`
  // and may carry the same payment_id as the booking it was charged against. A booker refund must NEVER
  // flip the HOST's outstanding cancellation debt to 'refunded' — that would silently forgive the fee.
  const flipped = await db
    .update(hostPayoutLedger)
    .set({ state: "refunded" })
    .where(
      and(
        eq(hostPayoutLedger.paymentId, paymentId),
        eq(hostPayoutLedger.kind, "payout"),
        eq(hostPayoutLedger.state, "held"),
      ),
    )
    .returning({ id: hostPayoutLedger.id });
  if (flipped.length === 0) {
    // No HELD row was flipped. If a row exists in a POST-payout state (processing/paid), money has already
    // left the platform → this is a post-payout refund needing a human-driven clawback, never a silent flip.
    // (No row at all = the sweep simply hasn't created one yet — a benign pre-payout refund, no alert.)
    const postPayout = await db
      .select({ id: hostPayoutLedger.id })
      .from(hostPayoutLedger)
      .where(
        and(
          eq(hostPayoutLedger.paymentId, paymentId),
          eq(hostPayoutLedger.kind, "payout"),
          inArray(hostPayoutLedger.state, ["processing", "paid"]),
        ),
      );
    if (postPayout.length > 0) {
      console.error("[PAYMENT_ALERT] refund_after_payout", { paymentId });
      await recordAudit({
        actorId: "system",
        action: "refund_after_payout",
        outcome: "needs_attention",
        meta: { paymentId },
      });
    }
  }
  // Mark the booking terminal (no 'refunded' booking status — 'cancelled' both keeps it out of the payout
  // sweep and renders PaymentReversedState on a ?paid=1 return).
  await db
    .update(booking)
    .set({ status: "cancelled" })
    .where(and(eq(booking.paymentId, paymentId), ne(booking.status, "cancelled")));
}

export async function POST(req: Request): Promise<Response> {
  // RAW body — do NOT req.json() first: parsing changes the bytes the HMAC covers (T-06-SPOOF).
  const rawBody = await req.text();
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET ?? "";

  // --- Verify the Paymongo-Signature. ANY failure (missing header/part, length mismatch, content
  //     mismatch, or a crypto throw) → a clean 400. Never an uncaught 500 on a forged/tampered sig. ---
  let verified = false;
  try {
    const sig = parseSignature(req.headers.get("paymongo-signature"));
    if (sig && secret) verified = verifySignature(rawBody, sig, secret);
  } catch {
    verified = false;
  }
  if (!verified) {
    return new Response("Invalid signature", { status: 400 });
  }

  // --- Parse the now-verified body. ---
  let event: PayMongoEvent;
  try {
    event = JSON.parse(rawBody) as PayMongoEvent;
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }
  const eventId = event.data?.id;
  const type = event.data?.attributes?.type;
  if (!eventId || !type) {
    return new Response("Invalid payload", { status: 400 });
  }

  // --- Idempotency (T-06-REPLAY): PayMongo retries + may double-deliver. A seen event id → 200 skip. ---
  const seen = await db
    .select({ id: paymongoEvent.id })
    .from(paymongoEvent)
    .where(eq(paymongoEvent.id, eventId));
  if (seen.length > 0) {
    return new Response("ok", { status: 200 });
  }

  // --- Apply the state transition. The new state is DERIVED from the verified event TYPE, never from a
  //     client-supplied body field (T-05-18 / T-06-PRIV). This route is the single writer of both
  //     host_payout.payoutsEnabled (Phase 2) and booking→confirmed on payment (D-57). ---
  if (type === "checkout_session.payment.paid") {
    // Confirm authority (D-57): the payment.paid webhook — NOT the forgeable browser return — is what
    // flips the booking to confirmed. Derive the booking id from the verified event's reference_number.
    const cs = event.data?.attributes?.data;
    const bookingId = cs?.attributes?.reference_number;
    const paymentId = cs?.attributes?.payments?.[0]?.id ?? null;
    if (bookingId) {
      // Single writer; the GiST EXCLUDE still guards the slot. Confirm on status IN ('pending','approved')
      // — an instant pay confirms from `pending`, a pay-on-approval request from `approved` (PAY-05 / D-63);
      // BOTH transition to `confirmed` through this ONE writer (D-57 — WIDEN the WHERE, never add a second
      // confirm path). Confirm on status ALONE — the payment is the authority (D-57 / Pitfall 4). Do NOT
      // re-impose the Phase-4 `expires_at > now()` guard: a legitimately-paid-but-lapsed hold must still
      // confirm (else the booker is charged with no booking); the GiST EXCLUDE, not the TTL, is the
      // double-confirm authority. Capture the pay_... so a later refund can reference it.
      //
      // 07-09: capture the RAIL alongside the payment id, from the same verified resource. A booker
      // cancellation happens hours or days later with no event in hand, and `isApiRefundable` fails closed —
      // so if the rail is not persisted HERE, every cancellation refund would be judged unrefundable and
      // routed to the operator-alert path instead of actually moving money.
      const paymentMethod = resolvePaymentMethod(cs);
      const rows = (await db.execute(sql`
        UPDATE booking
        SET status = 'confirmed', expires_at = NULL,
            payment_id = ${paymentId}, payment_method = ${paymentMethod}
        WHERE id = ${bookingId} AND status IN ('pending','approved') RETURNING id`)) as unknown as {
        id: string;
      }[];
      if (rows.length === 0) {
        // 0 rows ⇒ benign replay (already confirmed) OR the slot is genuinely gone. The D-58 backstop
        // distinguishes them and auto-refunds / operator-alerts — never a silent money retention. UNCHANGED
        // from Phase 5: it already covers the pay-after-release race for a released/declined request too.
        await handleGoneSlot(bookingId, paymentId, cs);
      } else {
        // ≥1 row ⇒ a GENUINE confirm (instant OR pay-on-approval — never a replay), which is what makes a
        // redelivery emit NOTHING. Emit the BOOK-06 booking-confirmed notification (D-83). The helper owns
        // its own error handling and `emitNotify` cannot reject, so awaiting it can never turn the 200 ACK
        // into a retry storm (T-06-15) — see the rationale on the helper.
        await emitBookingConfirmed(bookingId);
      }
    }
  } else if (type === "payment.refunded" || type === "payment.refund.updated") {
    // D-60 refund mechanism: idempotently mark the booking + payout ledger refunded (state derived from
    // the verified event type; the paymongo_event dedupe already makes a re-delivery a 200 no-op).
    await handleRefund(event);
  } else {
    const accountId = resolveAccountId(event);
    if (accountId) {
      if (type === "merchant.activated") {
        await db
          .update(hostPayout)
          .set({ activationStatus: "activated", payoutsEnabled: true, onboardingComplete: true })
          .where(eq(hostPayout.paymongoAccountId, accountId));
      } else if (type === "merchant.declined" || type === "merchant.deactivated") {
        // Auto-revert (D-14): deriveBookable reads payoutsEnabled, so false flips every listing
        // not-bookable with zero per-listing writes.
        await db
          .update(hostPayout)
          .set({ activationStatus: "declined", payoutsEnabled: false })
          .where(eq(hostPayout.paymongoAccountId, accountId));
      }
    }
  }

  // --- Mark processed (idempotency ledger) and ACK 200 so PayMongo stops retrying handled events. ---
  await db.insert(paymongoEvent).values({ id: eventId, type }).onConflictDoNothing();
  return new Response("ok", { status: 200 });
}
