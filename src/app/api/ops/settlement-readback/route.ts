import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { classifyRequestHost } from "@/lib/app-origins";
import { db } from "@/lib/db";
import { booking } from "@/lib/db/schema";
import { requireStaff } from "@/lib/ops/staff";
import {
  getMerchantPayout, listMerchantPayoutTransactions, listMerchantWallets,
} from "@/lib/paymongo";
import { readbackPage, summarizeSettlementReadback } from "@/lib/payments/settlement-readback";
import { rateLimit } from "@/lib/rate-limit";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function error(code: string, status: number): Response {
  return Response.json({ error: code }, { status, headers: PRIVATE_HEADERS });
}

/** Staff-only, read-only PayMongo account probe. It never creates a transfer or writes a settlement claim. */
export async function GET(request: Request): Promise<Response> {
  if (classifyRequestHost((await headers()).get("host")) !== "ops") notFound();
  const actor = await requireStaff();
  const limit = rateLimit(`settlement-readback:${actor.id}`, { window: 60, max: 5 });
  if (!limit.ok) return error("rate_limited", 429);

  const params = new URL(request.url).searchParams;
  const bookingId = params.get("bookingId") ?? "";
  const payoutId = params.get("payoutId") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId) ||
      !/^po_[A-Za-z0-9]{8,64}$/.test(payoutId)) return error("invalid_identifier", 400);

  const [row] = await db.select({
    paymentId: booking.paymentId, currency: booking.currency, status: booking.status,
    quotedTotalCents: booking.quotedTotalCents,
  })
    .from(booking).where(eq(booking.id, bookingId)).limit(1);
  if (!row?.paymentId || !row.quotedTotalCents) return error("booking_payment_missing", 404);

  try {
    const detail = await getMerchantPayout(payoutId);
    const transactions = [];
    const seenCursors = new Set<string>();
    let after: string | undefined;
    let complete = false;
    for (let pageNumber = 0; pageNumber < 20; pageNumber++) {
      const page = readbackPage(await listMerchantPayoutTransactions(payoutId, after));
      if (!page) return error("transaction_page_invalid", 502);
      transactions.push(...page.data);
      if (page.next === null) { complete = true; break; }
      if (seenCursors.has(page.next)) return error("transaction_cursor_cycle", 502);
      seenCursors.add(page.next);
      after = page.next;
    }
    const wallets = await listMerchantWallets();
    const report = summarizeSettlementReadback({
      paymentId: row.paymentId, payoutId, currency: row.currency,
      expectedAmountCents: row.quotedTotalCents, payoutDetail: detail,
      transactions, transactionPagesComplete: complete, wallets,
    });
    if (!report) return error("provider_response_invalid", 502);
    return Response.json({
      schemaVersion: 2,
      booking: { id: bookingId, paymentId: row.paymentId, status: row.status,
        currency: row.currency, quotedTotalCents: row.quotedTotalCents },
      ...report,
    }, { headers: PRIVATE_HEADERS });
  } catch {
    // Do not return PayMongo's raw body, credential-bearing headers, or account detail in an error.
    return error("provider_read_failed", 502);
  }
}
