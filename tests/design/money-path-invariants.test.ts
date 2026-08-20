// Two invariants this phase owes that NO existing gate makes, pinned as assertions rather than by memory.
//
// Both are things a plan could erode by accident while doing something reasonable, and both would look
// like an improvement at the moment they happened. That is why they are assertions and not comments:
//
//   1. GATE-06 / D-80 — `drizzle/` still ends at `0025_audit_resolved_by.sql`. Phase 13 ships ZERO
//      schema migrations, and Phase 17 SC#4 makes that a milestone-closing proof. Today the check only
//      happens at the milestone's exit, which is the worst possible time to discover it failed. This
//      makes it mechanical from this phase forward.
//   2. D-81 — `REFUNDABLE_RAILS` still excludes `qrph`. PayMongo's PUBLISHED DOCS say QR Ph is
//      refundable. This account's OBSERVED behaviour says it is not, twice, five weeks apart. A reader
//      who finds the docs row and "fixes" the array is doing the most natural thing in the world, and
//      it would silently convert the D-82 manual-return branch into a refund call that 4xxs, leaving a
//      booker's money in limbo with copy claiming it is on its way.
//
// This file lives under `tests/design/**` so it runs inside `npm run build` (D-16) with no database.

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { REFUNDABLE_RAILS } from "@/lib/payments/refund-rail";

const DRIZZLE_DIR = resolve(process.cwd(), "drizzle");

/** The migration D-80 pins the directory at. */
const LAST_MIGRATION = "0025_audit_resolved_by.sql";

/** Every generated migration on disk, in the order drizzle applies them (its filenames sort correctly). */
function migrations(): string[] {
  return readdirSync(DRIZZLE_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. GATE-06 / D-80 — ZERO schema migrations in this milestone
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("GATE-06 / D-80 — drizzle/ ships no new migration", () => {
  // Guard-the-guard: a wrong path would make `migrations()` return [] and every assertion below would
  // pass vacuously against an empty list. The floor is well under the real count (26) and well over any
  // plausible partial read.
  it("actually found the migration directory", () => {
    expect(
      migrations().length,
      `read ${DRIZZLE_DIR} and found no .sql files — the path is wrong, so the pin below proves nothing`,
    ).toBeGreaterThan(20);
  });

  it(`ends at ${LAST_MIGRATION}`, () => {
    const all = migrations();
    const last = all[all.length - 1];
    expect(
      last,
      `drizzle/ now ends at "${last}", not "${LAST_MIGRATION}".\n\n` +
        `D-80: the v1.1 milestone ships ZERO schema migrations, and Phase 17 SC#4 (GATE-06) makes that a\n` +
        `milestone-closing proof. Every Phase 13 decision is deliverable without a column — so a migration\n` +
        `proposed inside a v1.1 phase plan is a SCOPE ALARM to raise explicitly with the operator, never a\n` +
        `thing to absorb quietly because the feature seemed to need it. If a column genuinely is required,\n` +
        `that is a finding about the decision that asked for it, and it changes the milestone, not this line.\n\n` +
        `Do NOT "fix" this by updating LAST_MIGRATION.`,
    ).toBe(LAST_MIGRATION);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// 2. D-81 — qrph is NOT API-refundable, whatever the vendor's docs row says
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The failure message, built by a function so the SELF-TEST below can drive the same code path with a
 * synthetic set (the `leak.test.ts:208-212` rule). A message that has only ever been produced by a
 * passing assertion — i.e. never — is a message nobody has read.
 *
 * Returns `null` when the set is correct.
 */
function qrphViolation(rails: ReadonlySet<string>): string | null {
  if (!rails.has("qrph")) return null;
  return (
    `REFUNDABLE_RAILS now contains "qrph". It must not.\n\n` +
    `PROBED 2026-07-23 and RE-PROBED 2026-08-20 against PayMongo TEST mode, the second time with a\n` +
    `FRESH Idempotency-Key (qrph-refund-reprobe-260820) against the same captured payment so a cached\n` +
    `response could not be replayed. Both returned, verbatim:\n\n` +
    `    HTTP 400\n` +
    `    {"errors":[{"code":"parameter_invalid","detail":"Refunds are not allowed for payments with ` +
    `source type qrph.","source":{"pointer":"payment_id","attribute":"payment_id"}}]}\n\n` +
    `The rejection is RAIL-LEVEL — not "payment too old", not "already refunded" — so it is a clean\n` +
    `signal. PayMongo's published docs list QR Ph as refundable and CONTRADICT this; observed behaviour\n` +
    `is authoritative over the docs row (D-81), and the docs row is a UAT re-verification item.\n\n` +
    `⚠ If a fresh probe ever returns 2xx, that is a FINDING, not a fix. It makes refund-rail.ts and the\n` +
    `D-72 destination form stale and it changes D-82's policy split by cause — raise it, do not apply it\n` +
    `by widening this array. Widening it silently turns the manual-return branch into a refund call that\n` +
    `4xxs, while the copy tells the booker their money is on its way.`
  );
}

describe("D-81 — REFUNDABLE_RAILS excludes qrph", () => {
  // Both directions, on a synthetic set, through the SAME function the real assertion calls — so the
  // message above is demonstrably reachable and the assertion below is demonstrably able to fail.
  it("the check itself works in both directions", () => {
    expect(qrphViolation(new Set(["card", "gcash"]))).toBeNull();
    const message = qrphViolation(new Set(["card", "qrph"]));
    expect(message).not.toBeNull();
    expect(message).toContain("Refunds are not allowed for payments with source type qrph.");
    expect(message).toContain("2026-08-20");
    expect(message).toContain("is a FINDING, not a fix");
  });

  it("the SHIPPED set does not contain it", () => {
    expect(qrphViolation(REFUNDABLE_RAILS) ?? "").toBe("");
  });

  it("still contains the rails FitOut does refund, so the pin is not satisfied by an empty set", () => {
    // Anti-vacuity: emptying REFUNDABLE_RAILS would satisfy the assertion above and break every refund.
    for (const rail of ["card", "gcash", "paymaya"]) {
      expect(REFUNDABLE_RAILS.has(rail), `REFUNDABLE_RAILS lost "${rail}"`).toBe(true);
    }
  });
});
