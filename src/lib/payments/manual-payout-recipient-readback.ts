import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { PUBLIC_APP_ORIGIN } from "@/lib/app-origins";

const READBACK_PATH = "/api/internal/manual-payout-recipient";

export type FrozenManualRecipient = { bic: string; name: string; number: string };

export function frozenRecipientFingerprint(input: {
  bic: string; nameCiphertext: string; numberCiphertext: string;
}): string {
  return createHash("sha256")
    .update(input.bic).update("\0")
    .update(input.nameCiphertext).update("\0")
    .update(input.numberCiphertext).digest("hex");
}

/** A write-only token shared by the two production runtimes, never sent to a browser. */
export function manualRecipientReadbackTokenMatches(presented: string | null): boolean {
  const expected = process.env.PAYOUT_RECIPIENT_READBACK_TOKEN;
  if (!expected || expected.length < 32 || !presented?.startsWith("Bearer ")) return false;
  const actual = presented.slice(7);
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

/** Web decrypts one frozen claim with its existing key. Ops checks the ciphertext fingerprint. */
export async function readFrozenManualRecipientFromWeb(input: {
  bic: string; nameCiphertext: string; numberCiphertext: string;
}): Promise<FrozenManualRecipient | null> {
  const token = process.env.PAYOUT_RECIPIENT_READBACK_TOKEN;
  if (!token || token.length < 32) return null;
  try {
    const response = await fetch(new URL(READBACK_PATH, PUBLIC_APP_ORIGIN), {
      method: "POST", headers: { authorization: `Bearer ${token}` },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return null;
    const raw: unknown = await response.json();
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    if (value.fingerprint !== frozenRecipientFingerprint(input) ||
      value.bic !== input.bic || typeof value.name !== "string" ||
      typeof value.number !== "string" || value.name.length < 1 || value.name.length > 255 ||
      value.number.length < 6 || value.number.length > 64) return null;
    return { bic: value.bic, name: value.name, number: value.number };
  } catch {
    return null;
  }
}
