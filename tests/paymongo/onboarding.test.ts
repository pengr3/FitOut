import { describe, expect, it } from "vitest";
import { refreshOnboardingLink, startPayoutOnboarding } from "@/app/actions/paymongo-connect";

describe("retired linked-account onboarding boundary", () => {
  it("makes a direct legacy action call inert instead of creating a PayMongo child account", async () => {
    await expect(startPayoutOnboarding()).resolves.toEqual({
      ok: false,
      error: "Payout setup has moved. Choose your payout destination from your host dashboard.",
    });
  });

  it("does not mint a replacement provider link from the legacy refresh endpoint", async () => {
    await expect(refreshOnboardingLink()).resolves.toEqual({
      ok: false,
      error: "Payout setup has moved. Choose your payout destination from your host dashboard.",
    });
  });
});
