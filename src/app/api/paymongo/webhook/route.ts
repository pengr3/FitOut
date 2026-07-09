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
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hostPayout, paymongoEvent } from "@/lib/db/schema";

// Signature verification needs node crypto + the RAW request body — this MUST be the Node runtime, not edge.
export const runtime = "nodejs";

type SigParts = { t: string; te: string; li: string };

/** PayMongo event envelope (subset we read). type lives in attributes; the account id in attributes.data.id. */
type PayMongoEvent = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      merchant_id?: string;
      account_id?: string;
      data?: { id?: string };
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

  // --- Apply the state transition. The flag is DERIVED from the verified event TYPE, never from a
  //     client-supplied body field (T-06-PRIV). This route is the single writer of payoutsEnabled. ---
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

  // --- Mark processed (idempotency ledger) and ACK 200 so PayMongo stops retrying handled events. ---
  await db.insert(paymongoEvent).values({ id: eventId, type }).onConflictDoNothing();
  return new Response("ok", { status: 200 });
}
