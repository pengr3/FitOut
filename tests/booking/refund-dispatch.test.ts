// PLAN 13-18 — `refundNeedsManualReturn`, PROBED ON EVERY AXIS IT FILTERS.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS SEPARATELY FROM THE TWO SUITES THAT ALREADY CALL THE PREDICATE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/booking/cancellation.test.ts` and `tests/paymongo/instapay-refund.test.ts` prove the CHAIN:
// a real cancellation whose dispatch failed makes this predicate answer `true`, and one that dispatched
// makes it answer `false`. That is the property the product depends on, and it is proved end to end
// through the real action against a real Postgres.
//
// What those suites CANNOT say is WHICH filter did the work. Both of their `false` cases are bookings
// whose only audit rows are `outcome: "ok"` — so a predicate that had dropped the action set, or
// dropped the outcome test, would answer `false` for them just the same and both suites would stay
// green. 13-12 measured exactly this shape: forty-four of forty-four cases green with the predicate
// replaced by `true`, because no case discriminated.
//
// So this file writes audit rows DIRECTLY, one axis at a time, and every case is chosen so that
// removing the filter it names flips its answer. The four-action set is walked as a closed set AND
// probed with a control action, because a walk that never meets a non-member is not an assertion about
// membership — it is an assertion that the table has rows in it.
//
// NO ACTION, NO LISTING, NO BOOKING, NO SESSION. The predicate reads one table and answers one
// question; a fixture that seeded a whole booking to test it would be a test of the seed.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { audit } from "@/lib/db/schema";
import { REFUND_NOT_DISPATCHED_ACTIONS } from "@/lib/booking/refund-dispatch";

let testDb: TestDb;

type RefundDispatchModule = typeof import("@/lib/booking/refund-dispatch");
let refundNeedsManualReturn: RefundDispatchModule["refundNeedsManualReturn"];

/**
 * ⚠ THE PREDICATE IS IMPORTED THROUGH THE `vi.doMock` CURTAIN so it reads THIS FILE's isolated schema
 * rather than the app singleton's `public`. `REFUND_NOT_DISPATCHED_ACTIONS` above is a plain constant
 * and is imported statically on purpose: it is the list under test, and reaching for it through the
 * mocked module would let a mock decide what the closed set contains.
 */
beforeAll(async () => {
  testDb = await setupTestDb();
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.resetModules();
  ({ refundNeedsManualReturn } = await import("@/lib/booking/refund-dispatch"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  await teardownTestDb(testDb);
});

beforeEach(async () => {
  // Every case owns the whole table, so a row left by a previous case can never be the reason an
  // answer came back `true`. Cheap: this table holds at most a handful of rows per case.
  await testDb.db.execute(sql`DELETE FROM audit`);
});

/** One audit row, with only the three fields the predicate reads varying. */
async function writeAudit(over: {
  action: string;
  outcome: string;
  meta: Record<string, unknown> | null;
}): Promise<void> {
  await testDb.db.insert(audit).values({
    id: randomUUID(),
    actorId: "usr_probe",
    action: over.action,
    outcome: over.outcome,
    meta: over.meta,
  });
}

const BOOKING = "bkg_probe_1";
const OTHER_BOOKING = "bkg_probe_2";

describe("refundNeedsManualReturn — the closed set is walked, and the walk is live", () => {
  it("answers true for EVERY action in the set, and the set is the declared size", () => {
    // ASSERTED FIRST, and it is not decoration: the loop below iterates the exported list, so a list
    // trimmed to one entry would leave three real dispatch failures silently unreadable while every
    // case in this file stayed green. The number is the record of a decision (13-09's finding: a ban
    // list cannot catch the item nobody declared, so the SIZE is part of the claim).
    expect(
      REFUND_NOT_DISPATCHED_ACTIONS.length,
      "the non-dispatch action set changed size. Four actions mean `money is owed and nothing was " +
        "sent` today; adding or removing one changes which bookers are told the truth on their " +
        "booking page. If the action set really did change, change this number and say why.",
    ).toBe(4);
  });

  for (const action of REFUND_NOT_DISPATCHED_ACTIONS) {
    it(`answers true for a needs_attention \`${action}\` row naming the booking`, async () => {
      await writeAudit({ action, outcome: "needs_attention", meta: { bookingId: BOOKING } });
      expect(await refundNeedsManualReturn(BOOKING)).toBe(true);
    });
  }

  it("answers FALSE for a needs_attention action OUTSIDE the set — the walk's control", async () => {
    // ⚠ THIS IS THE CASE THAT MAKES THE FOUR ABOVE MEAN SOMETHING. Without it, a predicate that had
    // dropped `inArray(action, …)` entirely would pass all four and this file would report a closed
    // set it never actually closed. `guest_email_blocked` is a real `needs_attention` action from a
    // different seam (the guest-email guard) and is exactly the kind of row that shares a booking.
    await writeAudit({
      action: "guest_email_blocked",
      outcome: "needs_attention",
      meta: { bookingId: BOOKING },
    });
    expect(await refundNeedsManualReturn(BOOKING)).toBe(false);

    // …and the SAME booking flips to `true` the moment a row from the set arrives, which proves the
    // `false` above came from the action filter rather than from a query that finds nothing at all.
    await writeAudit({
      action: REFUND_NOT_DISPATCHED_ACTIONS[0],
      outcome: "needs_attention",
      meta: { bookingId: BOOKING },
    });
    expect(await refundNeedsManualReturn(BOOKING)).toBe(true);
  });

  it("answers FALSE when the SAME action was recorded as a success — the outcome filter", async () => {
    // The other axis, isolated. `refund_manual_required` is in the set; recorded `ok` it is not an
    // outstanding debt, and a predicate that had dropped the outcome test would answer `true`.
    await writeAudit({
      action: "refund_manual_required",
      outcome: "ok",
      meta: { bookingId: BOOKING },
    });
    expect(await refundNeedsManualReturn(BOOKING)).toBe(false);

    await writeAudit({
      action: "refund_manual_required",
      outcome: "needs_attention",
      meta: { bookingId: BOOKING },
    });
    expect(await refundNeedsManualReturn(BOOKING)).toBe(true);
  });

  it("answers FALSE for a DIFFERENT booking's alert — the jsonb scoping", async () => {
    // The axis that matters most for a booker: an outstanding debt on somebody else's booking must
    // never put a caveat on this one. Both directions in one case, so the `false` cannot be a query
    // that matches nothing.
    await writeAudit({
      action: "refund_dispatch_failed",
      outcome: "needs_attention",
      meta: { bookingId: OTHER_BOOKING },
    });
    expect(await refundNeedsManualReturn(BOOKING)).toBe(false);
    expect(await refundNeedsManualReturn(OTHER_BOOKING)).toBe(true);
  });

  it("answers FALSE on a row with NULL meta, rather than raising", async () => {
    // `meta` is nullable. `NULL->>'bookingId'` is NULL, which is not equal to anything, so the row
    // cannot match — but the important half is that the statement does not ERROR: this predicate runs
    // on a page render, and a raise here would 500 a booker's own booking page.
    await writeAudit({ action: "refund_dispatch_failed", outcome: "needs_attention", meta: null });
    expect(await refundNeedsManualReturn(BOOKING)).toBe(false);
  });

  it("answers FALSE against an empty table, and true is not its default", async () => {
    // The floor. Every `false` above is only meaningful if `true` is reachable, and every `true` is
    // only meaningful if `false` is — this case and the four at the top are the two ends of that.
    expect(await refundNeedsManualReturn(BOOKING)).toBe(false);
  });

  it("does NOT consult resolved_at — a closed alert is not a delivered transfer", async () => {
    // A DELIBERATE, DOCUMENTED CHOICE, asserted so it cannot be "tidied up" later by someone who
    // reads the column name and assumes it means the money landed. It does not: `resolved_at` records
    // that an OPERATOR closed the alert, and nothing in this system observes the transfer arriving.
    // Filtering on it would swap the booker's only durable record of a by-hand return for the
    // in-transit sentence, which was false on this path the whole time.
    await writeAudit({
      action: "refund_transfer_failed",
      outcome: "needs_attention",
      meta: { bookingId: BOOKING },
    });
    await testDb.db.execute(sql`UPDATE audit SET resolved_at = now(), resolved_by = 'ops'`);
    expect(await refundNeedsManualReturn(BOOKING)).toBe(true);
  });
});
