// Human-readable booking reference generator (A6, Security V6). Like src/lib/pg.ts, a tiny, pure,
// single-purpose helper. The confirmation page (D-43) shows this reference; the URL uses the opaque
// randomUUID booking id (owner-gated), so the reference is a friendly label, not an access token.
//
// Format (UI-SPEC §Discretionary): `FIT-` + 8 Crockford base32 characters. Crockford's alphabet omits
// the visually ambiguous I, L, O and U so a reference read aloud or copied by hand can't be garbled.
// Drawn from a CRYPTO-random source (never a sequential counter — Security V6) so references are
// unguessable and non-enumerable.

import { createHash, randomBytes } from "node:crypto";

// Crockford base32 alphabet (32 symbols; excludes I, L, O, U). Length 32 is load-bearing below.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REFERENCE_LENGTH = 8;

/** Map 8 bytes → a `FIT-XXXXXXXX` Crockford body. `byte % 32` is bias-free (256 = 8 × 32). */
function encodeReference(bytes: Uint8Array): string {
  let body = "";
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    body += CROCKFORD[bytes[i] % CROCKFORD.length];
  }
  return `FIT-${body}`;
}

/**
 * Mint a `FIT-XXXXXXXX` booking reference from crypto-random bytes. Each byte maps to a symbol via
 * `byte % 32`; because 256 is an exact multiple of 32, every symbol is drawn from exactly 8 byte values —
 * a perfectly uniform mapping with NO modulo bias. Non-sequential and distinct across calls.
 */
export function makeBookingReference(): string {
  return encodeReference(randomBytes(REFERENCE_LENGTH));
}

/**
 * The DURABLE display reference for a booking, DERIVED deterministically from its opaque id — so it is
 * STABLE across refreshes (D-43 "survives refresh"), unlike makeBookingReference() which is random per
 * call and would change on every render of the confirmation page. A SHA-256 of the id yields 32
 * uniformly-distributed bytes; the first 8 map to Crockford symbols exactly as above. Non-sequential and
 * non-enumerable (Security V6): the opaque id is the unguessable access token, and this reference is a
 * one-way-derived label for support/recall — you cannot recover the id from it.
 */
export function bookingReference(bookingId: string): string {
  return encodeReference(createHash("sha256").update(bookingId).digest());
}
