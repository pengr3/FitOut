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
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { booking, hostPayout, paymongoEvent } from "@/lib/db/schema";

// Signature verification needs node crypto + the RAW request body — this MUST be the Node runtime, not edge.
export const runtime = "nodejs";

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

/** Parse `t=<ts>,te=<testSig>,li=<liveSig>` into its parts; a missing header or any missing part → null. */
function parseSignature(header: string | null): SigParts | null {
  if (!header) return null;
  const parts: Record<string, string> = {};
  for (const seg of header.split(",")) {
    const idx = seg.indexOf("=");
    if (idx === -1) return null;
    parts[seg.slice(0, idx).trim()] = seg.slice(idx + 1).trim();
  }
  if (!parts.t || !parts.te || !parts.li) return null;
  return { t: parts.t, te: parts.te, li: parts.li };
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

/** The Linked-Account id the event concerns (matches host_payout.paymongoAccountId). */
function resolveAccountId(event: PayMongoEvent): string | undefined {
  const a = event.data?.attributes;
  return a?.data?.id ?? a?.merchant_id ?? a?.account_id ?? undefined;
}

/**
 * D-58 auto-refund backstop (body implemented in Task 2). A `checkout_session.payment.paid` whose confirm
 * UPDATE claimed 0 rows means one of two things: a BENIGN replay (the booking is already `confirmed` — do
 * NOTHING, never refund a paid+confirmed booking) OR the slot is GENUINELY GONE (the hold was swept and
 * the slot retaken during payment). For the gone case we must never silently keep the money — refund on a
 * refundable rail, or raise an operator alert on QRPh/UBP (which PayMongo cannot API-refund, Pitfall 1),
 * then set the booking terminal so the `?paid=1` return renders PaymentReversedState.
 */
async function handleGoneSlot(
  bookingId: string,
  paymentId: string | null,
  cs: PayMongoResource | undefined,
): Promise<void> {
  // Re-read to distinguish a benign replay (already confirmed → no-op) from a genuinely gone slot.
  const [current] = await db
    .select({ status: booking.status })
    .from(booking)
    .where(eq(booking.id, bookingId));
  if (!current || current.status === "confirmed") return; // never refund an already-confirmed booking

  // Task 2 fills the refund / operator-alert body here (branch on the payment method) + the terminal flip.
  const method =
    cs?.attributes?.payments?.[0]?.source?.type ?? cs?.attributes?.payment_method_used ?? "unknown";
  console.error("[PAYMENT_ALERT] gone_slot", { bookingId, paymentId, method });
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
      // Single writer; the GiST EXCLUDE still guards the slot. Confirm on status='pending' ALONE — the
      // payment is the authority (D-57 / Pitfall 4). Do NOT re-impose the Phase-4 `expires_at > now()`
      // guard: a legitimately-paid-but-lapsed hold must still confirm (else the booker is charged with
      // no booking). Capture the pay_... so a later refund can reference it.
      const rows = (await db.execute(sql`
        UPDATE booking SET status = 'confirmed', expires_at = NULL, payment_id = ${paymentId}
        WHERE id = ${bookingId} AND status = 'pending' RETURNING id`)) as unknown as { id: string }[];
      if (rows.length === 0) {
        // 0 rows ⇒ benign replay (already confirmed) OR the slot is genuinely gone. The D-58 backstop
        // distinguishes them and auto-refunds / operator-alerts — never a silent money retention.
        await handleGoneSlot(bookingId, paymentId, cs);
      }
    }
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
