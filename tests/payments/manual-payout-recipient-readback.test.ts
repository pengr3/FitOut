import { afterEach, describe, expect, it, vi } from "vitest";
import {
  frozenRecipientFingerprint, manualRecipientReadbackTokenMatches,
  readFrozenManualRecipientFromWeb,
} from "@/lib/payments/manual-payout-recipient-readback";

const token = "T".repeat(48);
const frozen = { bic: "GXCHPHM2XXX", nameCiphertext: "name-a", numberCiphertext: "number-a" };
const recipient = { bic: frozen.bic, name: "Sample Host", number: "09123456789" };

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("one-booking recipient bridge", () => {
  it("fails closed without a strong matching server token", () => {
    expect(manualRecipientReadbackTokenMatches(`Bearer ${token}`)).toBe(false);
    vi.stubEnv("PAYOUT_RECIPIENT_READBACK_TOKEN", token);
    expect(manualRecipientReadbackTokenMatches(null)).toBe(false);
    expect(manualRecipientReadbackTokenMatches(`Bearer ${token.slice(1)}`)).toBe(false);
    expect(manualRecipientReadbackTokenMatches(`Bearer ${token}`)).toBe(true);
  });

  it("accepts only a readback bound to the exact frozen ciphertext", async () => {
    vi.stubEnv("PAYOUT_RECIPIENT_READBACK_TOKEN", token);
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      ...recipient, fingerprint: frozenRecipientFingerprint(frozen),
    }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await readFrozenManualRecipientFromWeb(frozen)).toEqual(recipient);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      method: "POST", cache: "no-store", redirect: "error",
    }));
    expect(await readFrozenManualRecipientFromWeb({ ...frozen, numberCiphertext: "number-b" }))
      .toBeNull();
  });

  it("holds on an unreadable or malformed web response", async () => {
    vi.stubEnv("PAYOUT_RECIPIENT_READBACK_TOKEN", token);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
    expect(await readFrozenManualRecipientFromWeb(frozen)).toBeNull();
  });
});
