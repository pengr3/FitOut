import { describe, expect, it, vi } from "vitest";

import { parseCheckoutStopArgs, runCheckoutStop } from "@/lib/ops/checkout-stop";

describe("checkout-stop operator guard", () => {
  it("accepts read-only inspection but requires an explicit confirmation for expiry", () => {
    expect(parseCheckoutStopArgs(["inspect", "cs_abc123"])).toEqual({
      ok: true,
      command: { kind: "inspect", checkoutSessionId: "cs_abc123" },
    });
    expect(parseCheckoutStopArgs(["expire", "cs_abc123"])).toEqual({
      ok: false,
      error: expect.stringContaining("--confirm"),
    });
    expect(parseCheckoutStopArgs(["expire", "cs_abc123", "--confirm"])).toEqual({
      ok: true,
      command: { kind: "expire", checkoutSessionId: "cs_abc123", confirmed: true },
    });
  });

  it("does not call the provider expiry endpoint for a read-only inspection", async () => {
    const getCheckoutSession = vi.fn(async () => ({ status: "active" }));
    const expireCheckoutSession = vi.fn(async () => ({ id: "cs_abc123" }));

    await expect(
      runCheckoutStop({ kind: "inspect", checkoutSessionId: "cs_abc123" }, { getCheckoutSession, expireCheckoutSession }),
    ).resolves.toEqual({ kind: "inspected", status: "active" });
    expect(expireCheckoutSession).not.toHaveBeenCalled();
  });

  it("expires only an active session and requires an expired provider read-back", async () => {
    const getCheckoutSession = vi
      .fn()
      .mockResolvedValueOnce({ status: "active" })
      .mockResolvedValueOnce({ status: "expired" });
    const expireCheckoutSession = vi.fn(async () => ({ id: "cs_abc123" }));

    await expect(
      runCheckoutStop({ kind: "expire", checkoutSessionId: "cs_abc123", confirmed: true }, { getCheckoutSession, expireCheckoutSession }),
    ).resolves.toEqual({ kind: "expired" });
    expect(expireCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it("refuses a non-active session and never turns an unverified result into success", async () => {
    const nonActiveGet = vi.fn(async () => ({ status: "paid" }));
    const expireCheckoutSession = vi.fn(async () => ({ id: "cs_abc123" }));

    await expect(
      runCheckoutStop({ kind: "expire", checkoutSessionId: "cs_abc123", confirmed: true }, { getCheckoutSession: nonActiveGet, expireCheckoutSession }),
    ).resolves.toEqual({ kind: "not-active", status: "paid" });
    expect(expireCheckoutSession).not.toHaveBeenCalled();

    const ambiguousGet = vi
      .fn()
      .mockResolvedValueOnce({ status: "active" })
      .mockResolvedValueOnce({ status: "processing" });
    await expect(
      runCheckoutStop({ kind: "expire", checkoutSessionId: "cs_abc123", confirmed: true }, { getCheckoutSession: ambiguousGet, expireCheckoutSession }),
    ).resolves.toEqual({ kind: "verification-failed", status: "processing" });
  });
});
