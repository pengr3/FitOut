import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPayoutWalletFunding } from "@/lib/paymongo";

const keys = [
  "PAYMONGO_WALLET_ID", "PAYMONGO_ORGANIZATION_ID", "PLATFORM_WALLET_NUMBER",
  "PLATFORM_WALLET_NAME", "PAYMONGO_SECRET_KEY", "PAYMONGO_INSTAPAY_FEE_CENTS",
  "PAYMONGO_INSTAPAY_FEE_VERIFIED_AT",
] as const;
const previous = new Map<string, string | undefined>();
const now = new Date("2026-10-02T04:00:00.000Z");

const wallet = {
  id: "wallet_fitout", merchant_id: "org_fitout", livemode: false, status: "activated",
  balance: { available: 181000, pending: 5_000_000 },
  account: { provider: "paymongo", account_number: "100200300", account_name: "FitOut",
    currency: "PHP" },
};

function response(data: unknown = wallet, servedAt = now): Response {
  return new Response(JSON.stringify({ data }), { status: 200,
    headers: { Date: servedAt.toUTCString(), "Content-Type": "application/json" } });
}

beforeEach(() => {
  for (const key of keys) previous.set(key, process.env[key]);
  process.env.PAYMONGO_WALLET_ID = wallet.id;
  process.env.PAYMONGO_ORGANIZATION_ID = wallet.merchant_id;
  process.env.PLATFORM_WALLET_NUMBER = wallet.account.account_number;
  process.env.PLATFORM_WALLET_NAME = wallet.account.account_name;
  process.env.PAYMONGO_SECRET_KEY = "sk_test_wallet_fixture";
  process.env.PAYMONGO_INSTAPAY_FEE_CENTS = "1000";
  process.env.PAYMONGO_INSTAPAY_FEE_VERIFIED_AT = now.toISOString();
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of keys) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("PayMongo Wallet funding adapter", () => {
  it("reads available centavos and an account-verified fee with a fresh no-store GET", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response());
    expect(await readPayoutWalletFunding(now)).toMatchObject({
      walletId: wallet.id, availableCents: 181000, feeCents: 1000,
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.paymongo.com/v2/wallets/wallet_fitout?fields=balance&fields=account",
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["Cache-Control"]).toBe("no-store");
  });

  it("does not count a pending-only balance as available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ ...wallet,
      balance: { available: 0, pending: 5_000_000 } }));
    expect((await readPayoutWalletFunding(now))?.availableCents).toBe(0);
  });

  it("reserves the standard ₱10 even when the configured estimate reflects a free transfer", async () => {
    process.env.PAYMONGO_INSTAPAY_FEE_CENTS = "0";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response());
    expect((await readPayoutWalletFunding(now))?.feeCents).toBe(1000);
  });

  it("keeps a higher account-specific fee estimate", async () => {
    process.env.PAYMONGO_INSTAPAY_FEE_CENTS = "1200";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response());
    expect((await readPayoutWalletFunding(now))?.feeCents).toBe(1200);
  });

  it.each([
    ["wrong wallet", { ...wallet, id: "wallet_other" }],
    ["wrong merchant", { ...wallet, merchant_id: "org_other" }],
    ["wrong mode", { ...wallet, livemode: true }],
    ["wrong currency", { ...wallet, account: { ...wallet.account, currency: "USD" } }],
    ["fractional balance", { ...wallet, balance: { available: 181000.5, pending: 0 } }],
    ["missing balance", { ...wallet, balance: { pending: 5_000_000 } }],
  ])("rejects %s", async (_label, data) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(data));
    expect(await readPayoutWalletFunding(now)).toBeNull();
  });

  it("holds without verified account fee evidence before making a Wallet request", async () => {
    delete process.env.PAYMONGO_INSTAPAY_FEE_VERIFIED_AT;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(await readPayoutWalletFunding(now)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a stale server response instead of spending a cached balance", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(wallet,
      new Date(now.getTime() - 5 * 60_000)));
    await expect(readPayoutWalletFunding(now)).rejects.toThrow("fresh server Date");
  });
});
