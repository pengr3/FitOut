import { describe, expect, it } from "vitest";
import { projectHostEarnings, type EarningSource } from "@/components/host/payout-ledger-status";

const now = new Date("2026-10-02T15:00:00Z");
const source: EarningSource = {
  bookingId: "booking-1", hostId: "host-1", createdAt: new Date("2026-09-01T00:00:00Z"),
  startsAt: new Date("2026-09-29T00:00:00Z"), endsAt: new Date("2026-09-29T01:00:00Z"),
  bookingStatus: "confirmed", spacePriceCents: 200000, retainedSpaceCents: null,
  currency: "php", title: "Court 🏸 <script>", timezone: "Asia/Manila",
  ledger: null, settlement: null,
};

describe("host-safe payout attention", () => {
  it("withdraws a former Friday and shows only neutral attention copy for an unresolved exception", () => {
    const [row] = projectHostEarnings([{ ...source, attention: true }], "host-1", now, 24, 1000, true);
    expect(row.status).toBe("failed");
    expect(row.fridayNoon).toBeNull();
    expect(row.timing).toBe("We're checking a delay with this payout. You don't need to request it again.");
    expect(row.timing).not.toMatch(/wallet|settlement|account|provider/i);
  });
});
