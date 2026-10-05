import { describe, expect, it } from "vitest";
import { readbackPage, summarizeSettlementReadback } from "@/lib/payments/settlement-readback";

const payoutDetail = { data: { id: "po_sample123", type: "payout", attributes: {
  status: "deposited", status_updated_at: 1_790_000_000, currency: "PHP",
  organization: { id: "org_live" }, bank_id: "bank_wallet", bank_account_number: "wallet_number",
  net_amount: 1955,
} } };
const transaction = { id: "pay_exact", type: "payment", attributes: {
  payout_id: "po_sample123", organization_id: "org_live", currency: "PHP", livemode: true,
  amount: 1995,
} };
const wallets = { data: [{ id: "wal_live", merchant_id: "org_live", livemode: true,
  status: "activated", account: { account_number: "wallet_number", account_name: "Example Co",
    currency: "PHP", provider: "paymongo" }, balance: { available: 1955, pending: 0 },
}] };
const baseline = {
  paymentId: "pay_exact", payoutId: "po_sample123", currency: "php", expectedAmountCents: 1995,
  payoutDetail,
  transactions: [transaction], transactionPagesComplete: true, wallets,
};

describe("staff-only settlement readback projection", () => {
  it("identifies the exact live payment and matching deposited Wallet", () => {
    const report = summarizeSettlementReadback(baseline);
    expect(report).toMatchObject({
      accountMappingMatched: true, reason: null,
      transaction: { paymentField: "id", type: "payment", payoutId: "po_sample123" },
      payout: { organizationId: "org_live", bankId: "bank_wallet", netAmountCents: 1955 },
      wallet: { id: "wal_live", availableCents: 1955 },
    });
  });

  it("holds when a lookalike payment belongs to another organization or is not live", () => {
    const wrongOrg = { ...transaction, attributes: { ...transaction.attributes, organization_id: "org_other" } };
    expect(summarizeSettlementReadback({ ...baseline, transactions: [wrongOrg] })?.reason)
      .toBe("account_identity_mismatch");
    const testMode = { ...transaction, attributes: { ...transaction.attributes, livemode: false } };
    expect(summarizeSettlementReadback({ ...baseline, transactions: [testMode] })?.accountMappingMatched)
      .toBe(false);
  });

  it("holds on duplicate matches and incomplete pagination", () => {
    expect(summarizeSettlementReadback({ ...baseline, transactions: [transaction, { ...transaction }] })?.reason)
      .toBe("multiple_payment_transactions");
    expect(summarizeSettlementReadback({ ...baseline, transactionPagesComplete: false })?.reason)
      .toBe("transaction_pagination_incomplete");
    expect(summarizeSettlementReadback({ ...baseline, expectedAmountCents: 2000 })?.reason)
      .toBe("payment_amount_mismatch");
    expect(readbackPage({ data: [transaction], pagination: {} })).toBeNull();
  });
});
