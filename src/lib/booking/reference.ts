// Human-readable booking reference generator (A6, Security V6). Like src/lib/pg.ts, a tiny, pure,
// single-purpose helper. The confirmation page (D-43) shows this reference; the URL uses the opaque
// randomUUID booking id (owner-gated), so the reference is a friendly label, not an access token.
//
// Format (UI-SPEC §Discretionary): `FIT-` + 8 Crockford base32 characters. Crockford's alphabet omits
// the visually ambiguous I, L, O and U so a reference read aloud or copied by hand can't be garbled.
// Drawn from a CRYPTO-random source (never a sequential counter — Security V6) so references are
// unguessable and non-enumerable.

import { randomBytes } from "node:crypto";

// Crockford base32 alphabet (32 symbols; excludes I, L, O, U). Length 32 is load-bearing below.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REFERENCE_LENGTH = 8;

/**
 * Mint a `FIT-XXXXXXXX` booking reference from crypto-random bytes. Each byte maps to a symbol via
 * `byte % 32`; because 256 is an exact multiple of 32, every symbol is drawn from exactly 8 byte values —
 * a perfectly uniform mapping with NO modulo bias. Non-sequential and distinct across calls.
 */
export function makeBookingReference(): string {
  const bytes = randomBytes(REFERENCE_LENGTH);
  let body = "";
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    body += CROCKFORD[bytes[i] % CROCKFORD.length];
  }
  return `FIT-${body}`;
}
