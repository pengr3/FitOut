import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Envelope encryption for a host's external payout destination.  The database only receives the
 * ciphertext; account numbers and account-holder names must never be made available to ordinary
 * reads, logs, audit metadata, or client props.
 *
 * The key is deliberately independent of BETTER_AUTH_SECRET and PayMongo credentials so rotating
 * either of those does not make financial-recipient data unreadable.  It is a base64-encoded 32-byte
 * AES-256 key, set only in the server deployment environment.
 */
const KEY_ENV = "PAYOUT_RECIPIENT_ENCRYPTION_KEY";
const VERSION = "v1";

function key(): Buffer {
  const encoded = process.env[KEY_ENV];
  if (!encoded) {
    // Tests exercise the crypto boundary without needing a deploy secret.  This value is only ever
    // accepted under the test runner; every real runtime fails closed before storing or releasing a
    // recipient.
    if (process.env.NODE_ENV === "test") return Buffer.alloc(32, 7);
    throw new Error(`${KEY_ENV} is not configured; refusing to handle payout-recipient data.`);
  }
  const decoded = Buffer.from(encoded, "base64");
  if (decoded.length !== 32) {
    throw new Error(`${KEY_ENV} must be a base64-encoded 32-byte key.`);
  }
  return decoded;
}

/** Encrypt a short UTF-8 secret using AES-256-GCM (versioned for future key migration). */
export function encryptPayoutRecipientValue(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

/** Decrypts only at the money-movement boundary after the destination has been owner-bound and verified. */
export function decryptPayoutRecipientValue(value: string): string {
  const [version, ivText, tagText, ciphertext] = value.split(".");
  if (version !== VERSION || !ivText || !tagText || !ciphertext) {
    throw new Error("Stored payout-recipient ciphertext is invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
