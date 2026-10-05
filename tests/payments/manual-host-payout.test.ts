import { describe, expect, it } from "vitest";
import { matchesManualTransfer } from "@/lib/payments/manual-host-payout";
import type { ManualTransferDetails } from "@/lib/paymongo";

const createdAt = new Date("2026-10-05T06:00:00.000Z");
const expected = {
  amountCents: 1710, maxDebitCents: 1710, merchantId: "org_live", createdAt,
  source: { number: "0099", name: "FitOut Wallet", bic: "PAEYPHM2XXX" },
  destination: { number: "09555339701", name: "Francis Silva", bic: "GXCHPHM2XXX" },
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
    expect(matchesManualTransfer({ ...transfer, destination: { ...transfer.destination, number: "09555339702" } }, expected)).toBe(false);
    expect(matchesManualTransfer({ ...transfer, source: { ...transfer.source, number: "0088" } }, expected)).toBe(false);
    expect(matchesManualTransfer({ ...transfer, createdAt: new Date("2026-10-05T05:00:00Z") }, expected)).toBe(false);
  });
});
