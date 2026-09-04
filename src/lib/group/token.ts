// Crypto-random group access tokens (D-118, GROUP-02) — the shareable invite link's bearer credential and
// the per-rsvp self-serve manage credential. REUSES the bias-free Crockford `byte % 32` encoding of
// src/lib/booking/reference.ts, but this is NOT the 8-char display label: an invite/manage token IS the
// access gate (there is no opaque id behind it, unlike a booking reference), so it is minted over 20
// crypto-random bytes → 20 Crockford symbols → ~100 bits of entropy, unguessable and non-enumerable
// (Security V6, RESEARCH Pitfall 4).
//
// NO "FIT-" prefix — that is a display affordance for a human-readable label, meaningless on a bearer
// credential. NEVER log a token (UI-SPEC §2): unknown / revoked / voided tokens must all render the SAME
// calm "no longer active" state so the token space gives no enumeration oracle.

import { randomBytes } from "node:crypto";

// Crockford base32 alphabet (32 symbols; excludes the visually ambiguous I, L, O, U). Mirrors
// src/lib/booking/reference.ts — length 32 is load-bearing for the bias-free `byte % 32` mapping below.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// 20 bytes → 20 symbols → 100 bits. Each byte maps to a symbol via `byte % 32`; because 256 is an exact
// multiple of 32, every symbol is drawn from exactly 8 byte values — a uniform mapping with NO modulo bias.
const TOKEN_LENGTH = 20;

/** Mint a ~100-bit Crockford bearer token from crypto-random bytes (never a sequential counter, V6). */
function mintToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    out += CROCKFORD[bytes[i] % CROCKFORD.length];
  }
  return out;
}

/** The shareable group invite credential (`{origin}/invite/{token}`). ~100-bit crypto-random (D-118). */
export function makeInviteToken(): string {
  return mintToken();
}

/** A per-rsvp self-serve manage credential for guests-with-email (D-117/D-120). ~100-bit crypto-random. */
export function makeManageToken(): string {
  return mintToken();
}
