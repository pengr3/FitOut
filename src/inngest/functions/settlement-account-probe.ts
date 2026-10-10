import "server-only";

import { eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import { booking } from "@/lib/db/schema";
import { getMerchantPayout, listMerchantPayoutTransactions, listMerchantWallets } from "@/lib/paymongo";
import { readbackPage, summarizeSettlementReadback } from "@/lib/payments/settlement-readback";

const BOOKING_ID = "911c28f2-328c-42cc-8f79-98181b0c399e";
const PAYOUT_ID = "po_VCgovHRJDJ92vSqap4wfCUyG";

/** Runs inside fitout-web, under the same secret key as settlement-reconcile. No money or DB write. */
export const settlementAccountProbe = inngest.createFunction(
  { id: "settlement-account-probe", concurrency: 1, triggers: [{ event: "fitout/settlement-account-probe" }] },
  async ({ step }) => step.run("read-account-evidence", async () => {
    const [row] = await db.select({
      paymentId: booking.paymentId, currency: booking.currency,
      expectedAmountCents: booking.quotedTotalCents,
    }).from(booking).where(eq(booking.id, BOOKING_ID)).limit(1);
    if (!row?.paymentId || !row.expectedAmountCents) return { state: "hold", reason: "booking_payment_missing" };
    try {
      const payoutDetail = await getMerchantPayout(PAYOUT_ID);
      const transactions: Record<string, unknown>[] = [];
      const cursors = new Set<string>();
      let after: string | undefined;
      let complete = false;
      for (let i = 0; i < 20; i++) {
        const page = readbackPage(await listMerchantPayoutTransactions(PAYOUT_ID, after));
        if (!page) return { state: "hold", reason: "transaction_page_invalid" };
        transactions.push(...page.data);
        if (page.next === null) { complete = true; break; }
        if (cursors.has(page.next)) return { state: "hold", reason: "transaction_cursor_cycle" };
        cursors.add(page.next);
        after = page.next;
      }
      const report = summarizeSettlementReadback({
        paymentId: row.paymentId, payoutId: PAYOUT_ID, currency: row.currency,
        expectedAmountCents: row.expectedAmountCents, payoutDetail, transactions,
        transactionPagesComplete: complete, wallets: await listMerchantWallets(),
      });
      if (!report) return { state: "hold", reason: "provider_response_invalid" };
      // Never return or log raw provider responses, full account numbers or names.
      return {
        state: report.accountMappingMatched ? "matched" : "hold",
        reason: report.reason,
        transactionPagesComplete: report.transactionPagesComplete,
        payout: {
          id: report.payout.id, status: report.payout.status,
          currency: report.payout.currency, organizationId: report.payout.organizationId,
          bankId: report.payout.bankId,
          accountLast4: report.payout.walletAccountNumber?.slice(-4) ?? null,
        },
        transaction: report.transaction && {
          id: report.transaction.id, type: report.transaction.type,
          paymentField: report.transaction.paymentField,
          liveMode: report.transaction.liveMode,
          amountCents: report.transaction.amountCents,
        },
        wallet: report.wallet && {
          id: report.wallet.id, merchantId: report.wallet.merchantId,
          accountLast4: report.wallet.accountNumber?.slice(-4) ?? null,
          status: report.wallet.status, liveMode: report.wallet.liveMode,
          currency: report.wallet.currency, provider: report.wallet.provider,
          availableCents: report.wallet.availableCents,
        },
        walletInventory: report.walletInventory,
      };
    } catch {
      return { state: "hold", reason: "provider_read_failed" };
    }
  }),
);
