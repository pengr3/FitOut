import { describe, expect, it } from "vitest";
import { controlledApiClaimAction, controlledApiPreflightReady, controlledApiTransferOutcome,
  manualPayoutReleaseReady, matchesApiTestTransfer,
  matchesManualTransfer } from "@/lib/payments/manual-host-payout";
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
  referenceNumber: "host-payout-911c28f2-328c-42cc-8f79-98181b0c399e",
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

describe("controlled API payout provider readback", () => {
  const apiExpected = { amountCents: 1710, merchantId: "org_live", reservedAt: createdAt,
    source: expected.source, destination: expected.destination };
  it("accepts a matching live API transfer regardless of the reported fee", () => {
    for (const feeCents of [0, 1000, 1200])
      expect(matchesApiTestTransfer({ ...transfer, feeCents }, apiExpected)).toBe(true);
  });
  it("rejects a changed recipient, source, amount, reference or pre-reservation transfer", () => {
    expect(matchesApiTestTransfer({ ...transfer, amountCents: 1711 }, apiExpected)).toBe(false);
    expect(matchesApiTestTransfer({ ...transfer, referenceNumber: "other" }, apiExpected)).toBe(false);
    expect(matchesApiTestTransfer({ ...transfer, source: { ...transfer.source, number: "other" } }, apiExpected)).toBe(false);
    expect(matchesApiTestTransfer({ ...transfer, destination: { ...transfer.destination, number: "other" } }, apiExpected)).toBe(false);
    expect(matchesApiTestTransfer({ ...transfer, createdAt: new Date("2026-10-05T05:00:00Z") }, apiExpected)).toBe(false);
  });
  it("keeps a successful payout paid even when the actual fee exceeds the expected budget", () => {
    expect(controlledApiTransferOutcome("pending", 0)).toEqual({ ledgerState: "processing", overBudget: false });
    expect(controlledApiTransferOutcome("succeeded", 1000)).toEqual({ ledgerState: "paid", overBudget: false });
    expect(controlledApiTransferOutcome("succeeded", 1200)).toEqual({ ledgerState: "paid", overBudget: true });
    expect(controlledApiTransferOutcome("failed", 1200)).toEqual({ ledgerState: "failed", overBudget: true });
    expect(controlledApiTransferOutcome("unknown", 0)).toEqual({ ledgerState: null, overBudget: false });
  });
  it("turns every repeated or uncertain attempt into readback, never another reservation", () => {
    expect(controlledApiClaimAction("prepared", null)).toBe("reserve");
    expect(controlledApiClaimAction("prepared", "tr_existing")).toBe("hold");
    expect(controlledApiClaimAction("api_reserved", null)).toBe("readback");
    expect(controlledApiClaimAction("api_reserved", "tr_existing")).toBe("readback");
    expect(controlledApiClaimAction("api_submitted", "tr_existing")).toBe("readback");
    expect(controlledApiClaimAction("api_failed", "tr_existing")).toBe("hold");
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

  it("requires the funded API budget and a never-dispatched claim", () => {
    expect(controlledApiPreflightReady(facts, 2710, "prepared")).toBe(true);
    expect(controlledApiPreflightReady(facts, 2709, "prepared")).toBe(false);
    expect(controlledApiPreflightReady(facts, 2710, "api_reserved")).toBe(false);
    expect(controlledApiPreflightReady({ ...facts, proofPaymentId: null }, 2710, "prepared")).toBe(false);
    expect(controlledApiPreflightReady({ ...facts, candidate: { ...facts.candidate,
      numberCiphertext: "changed" } }, 2710, "prepared")).toBe(false);
  });
});
