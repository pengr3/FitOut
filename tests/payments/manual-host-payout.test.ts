import { describe, expect, it } from "vitest";
import { manualPayoutReleaseReady, matchesManualTransfer } from "@/lib/payments/manual-host-payout";
import type { ManualTransferDetails } from "@/lib/paymongo";

const createdAt = new Date("2026-10-05T06:00:00.000Z");
const expected = {
  amountCents: 1710, maxDebitCents: 1710, merchantId: "org_live", createdAt,
  source: { number: "0099", name: "FitOut Wallet", bic: "PAEYPHM2XXX" },
  destination: { number: "09123456789", name: "Sample Host", bic: "GXCHPHM2XXX" },
};
const transfer: ManualTransferDetails = {
  id: "tr_123456789", status: "succeeded", amountCents: 1710, feeCents: 0,
  currency: "PHP", provider: "instapay", merchantId: "org_live", liveMode: true,
  createdAt: new Date("2026-10-05T06:01:00.000Z"),
  source: expected.source, destination: expected.destination,
};

describe("manual payout provider readback", () => {
  it("accepts only the frozen live merchant, recipient, amount and zero-fee debit", () => {
    expect(matchesManualTransfer(transfer, expected)).toBe(true);
    expect(matchesManualTransfer({ ...transfer, feeCents: 1 }, expected)).toBe(false);
    expect(matchesManualTransfer({ ...transfer, amountCents: 1711 }, expected)).toBe(false);
    expect(matchesManualTransfer({ ...transfer, merchantId: "org_other" }, expected)).toBe(false);
    expect(matchesManualTransfer({ ...transfer, liveMode: false }, expected)).toBe(false);
    expect(matchesManualTransfer({ ...transfer, destination: { ...transfer.destination, number: "09123456780" } }, expected)).toBe(false);
    expect(matchesManualTransfer({ ...transfer, source: { ...transfer.source, number: "0088" } }, expected)).toBe(false);
    expect(matchesManualTransfer({ ...transfer, createdAt: new Date("2026-10-05T05:00:00Z") }, expected)).toBe(false);
  });
});

describe("manual payout final release gate", () => {
  const facts = {
    candidate: {
      bookingId: "booking-test", paymentId: "pay-test", currency: "php", status: "confirmed",
      endsAt: new Date("2026-10-03T06:00:00Z"), grossCents: 1900, hostId: "host-test",
      payoutsEnabled: true, verificationStatus: "host_attested", hostStatus: "approved",
      bic: "GXCHPHM2XXX", nameCiphertext: "encrypted-name", numberCiphertext: "encrypted-number",
    },
    proofPaymentId: "pay-test", wallet: { walletId: "wallet-test", availableCents: 1955 },
    frozen: { sourceWalletId: "wallet-test", amountCents: 1710, transferId: null,
      bic: "GXCHPHM2XXX", nameCiphertext: "encrypted-name", numberCiphertext: "encrypted-number" },
    dbNow: new Date("2026-10-05T06:00:00Z"), otherClaims: 0, outstanding: 0,
    hasAttention: false,
  };

  it("holds when evidence, destination, funds, host standing or duplicate protection changes", () => {
    expect(manualPayoutReleaseReady(facts)).toBe(true);
    expect(manualPayoutReleaseReady({ ...facts, proofPaymentId: null })).toBe(false);
    expect(manualPayoutReleaseReady({ ...facts, candidate: { ...facts.candidate,
      numberCiphertext: "changed-number" } })).toBe(false);
    expect(manualPayoutReleaseReady({ ...facts, wallet: { ...facts.wallet,
      availableCents: 1709 } })).toBe(false);
    expect(manualPayoutReleaseReady({ ...facts, otherClaims: 1 })).toBe(false);
    expect(manualPayoutReleaseReady({ ...facts, outstanding: 1 })).toBe(false);
    expect(manualPayoutReleaseReady({ ...facts, candidate: { ...facts.candidate,
      verificationStatus: "pending" } })).toBe(false);
    expect(manualPayoutReleaseReady({ ...facts, frozen: { ...facts.frozen,
      transferId: "tr_existing" } })).toBe(false);
    expect(manualPayoutReleaseReady({ ...facts, hasAttention: true })).toBe(false);
  });
});
