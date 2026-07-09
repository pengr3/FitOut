// PAY-04 / D-14 — the merchant.activated / merchant.declined webhook drives the bookability gate.
//
// RED until Plan 06 (src/app/api/paymongo/webhook + host_payout writes). The webhook is the ONLY
// writer of host_payout.payoutsEnabled (server/webhook-set, never client). merchant.activated flips
// payoutsEnabled=true (+ activationStatus=activated); merchant.declined flips it false, which — via
// the pure deriveBookable — auto-reverts every one of that host's listings to not-bookable with no
// per-listing write (D-14). Plan 06's <verify> replaces the it.todo entries with real assertions that
// POST a signed body (mockPayMongo.signWebhook) to the exported handler and read back the host_payout
// row + deriveBookable, using the tests/profile/profile.test.ts isolated-schema harness.

import { describe, it } from "vitest";

describe("merchant.activated / merchant.declined gate (PAY-04/D-14) — RED until Plan 06", () => {
  it.todo("merchant.activated sets host_payout.payoutsEnabled=true and activationStatus=activated");
  it.todo("a published listing becomes bookable once the host's payoutsEnabled flips true (deriveBookable)");
  it.todo("merchant.declined sets payoutsEnabled=false and activationStatus=declined");
  it.todo("declined auto-reverts the host's published listings to NOT bookable with no listing write (D-14)");
  it.todo("the payoutsEnabled flag is written ONLY by the webhook, never from a client request body");
});
