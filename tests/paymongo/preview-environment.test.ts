import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("PayMongo Preview environment boundary", () => {
  it("loads in a credential-free Vercel Preview but refuses to send a payment request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYMONGO_SECRET_KEY", "");
    vi.stubEnv("PLATFORM_WALLET_NUMBER", "");
    vi.stubEnv("PLATFORM_WALLET_NAME", "");

    const { createCheckoutSession } = await import("@/lib/paymongo");

    await expect(
      createCheckoutSession({
        amountCents: 10_000,
        name: "Preview booking",
        referenceNumber: "preview-booking",
        successUrl: "https://preview.example.com/success",
        cancelUrl: "https://preview.example.com/cancel",
        idempotencyKey: "preview-booking",
      }),
    ).rejects.toThrow(/unavailable in this Preview deployment/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still refuses a credential-free production boot", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PAYMONGO_SECRET_KEY", "");

    await expect(import("@/lib/paymongo")).rejects.toThrow(/PAYMONGO_SECRET_KEY is not set/);
  });
});
