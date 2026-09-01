// D-260 (F11) — WHAT A SUSPENSION IS WITHHOLDING, MEASURED AGAINST A REAL SCHEMA.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS AN INTEGRATION FILE AND NOT A UNIT ONE
// ════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/listing/review-signal.test.ts` owns the WORDS and can be a plain unit test, because that
// module is pure copy. This module is the opposite: it is one raw SELECT with five joins and six
// predicates, deliberately written out as the INVERSE of `queryDuePayouts` rather than sharing a
// helper with it. Nothing about a predicate can be proved by mocking the thing that runs it — a
// mocked db agrees with any WHERE clause, including a wrong one. So every case here seeds real rows
// into an isolated schema and drives the real function against real Postgres.
//
// The four cases, and what each would catch:
//   1. ONE frozen session      — the count, the space and the date are the SEEDED ones, and the
//                                composed sentence names both. A query that returned a row for the
//                                wrong booking passes a "not null" assertion and fails this.
//   2. THREE frozen sessions   — count 3, and the EARLIEST is the one named. Mutation-scored below.
//   3. NOTHING frozen          — a suspended host with no delivered unpaid session gets `null`, so
//                                the notice renders nothing extra. A fabricated absence is worse
//                                than silence, and this is the case that pins that.
//   4. NOT SUSPENDED           — an approved host with an identical delivered unpaid session gets
//                                `null`. This module must never become a SECOND OPINION on whether a
//                                host is suspended: `loadHostVerification` owns that answer and the
//                                page branches on it.
//
// ⚠ MUTATION SCORE, RUN AND RECORDED (case 2). `ORDER BY b.ends_at ASC` was flipped to `DESC` in
// `src/lib/host/frozen-payouts.ts` and this file re-run: case 2 went RED naming the latest session's
// title where the earliest was expected, and case 1 stayed green (one row is its own earliest). The
// assertion measures the query, not the seed. Restored → all four green again.
//
// ANTI-VACUITY: cases 3 and 4 are "returns null" assertions, and a function that returned null for
// EVERY input would satisfy both perfectly. Each therefore seeds its own positive CONTROL host in the
// same schema and asserts a non-null summary for them in the same case.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeVerifiedHost } from "../helpers/seed";
import { booking, hostVerification, listing, user } from "@/lib/db/schema";
import type { HostVerificationStatus } from "@/lib/db/schema";
import {
  formatFrozenSessionDate,
  frozenSessionSentence,
  loadFrozenPayoutSummary,
} from "@/lib/host/frozen-payouts";
import { PAYOUT_DELAY_HOURS } from "@/lib/payments/config";

let testDb: TestDb;

const BOOKER = "frozen_booker";

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

/** Comfortably past ends_at + PAYOUT_DELAY_HOURS, so the sweep would have paid it but for the freeze. */
const dueMs = (daysAgo = 0) =>
  Date.now() - (PAYOUT_DELAY_HOURS + 1) * 3_600_000 - daysAgo * 86_400_000;

/**
 * A host who WOULD be paid — `makeVerifiedHost`'s defaults (email verified, host_payout activated) at
 * a chosen verification status. The payout row matters: the query INNER-joins it exactly as the sweep
 * does, so a host without one is not swept and their missing line is not the suspension's doing.
 */
async function makeHost(status: HostVerificationStatus): Promise<string> {
  const hostId = uid("fp_host");
  await makeVerifiedHost(testDb.db, hostId, {
    name: "Frozen Host",
    email: `${hostId}@example.com`,
    firstName: "Frozen",
    paymongoAccountId: uid("fp_acct"),
    verificationStatus: status,
  });
  return hostId;
}

/** One listing per booking, so a shared due window can never trip the booking_no_overlap EXCLUDE. */
async function makeListing(hostId: string, title: string): Promise<string> {
  const id = uid("fp_listing");
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title,
    status: "published",
    reviewState: "approved",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
    currency: "php",
  });
  return id;
}

/** A DELIVERED, PAID, UNCLAIMED session: confirmed, well past the payout delay, and no ledger row. */
async function makeDeliveredSession(
  hostId: string,
  title: string,
  daysAgo = 0,
): Promise<{ listingId: string; bookingId: string; endsAt: Date }> {
  const listingId = await makeListing(hostId, title);
  const endsAt = new Date(dueMs(daysAgo));
  const bookingId = uid("fp_bk");
  await testDb.db.insert(booking).values({
    id: bookingId,
    listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt: new Date(endsAt.getTime() - 3_600_000),
    endsAt,
    status: "confirmed",
    quotedTotalCents: 200000,
    spacePriceCents: 200000,
    serviceFeeCents: 0,
    currency: "php",
    expiresAt: null,
  });
  return { listingId, bookingId, endsAt };
}

/** The one write an ops suspension performs — nothing else about the host changes. */
async function setStatus(hostId: string, status: HostVerificationStatus): Promise<void> {
  await testDb.db
    .update(hostVerification)
    .set({ status })
    .where(eq(hostVerification.userId, hostId));
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "Frozen Booker",
    email: "frozen_booker@example.com",
    firstName: "Booker",
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("D-260 — a suspended host's frozen sessions, counted and named", () => {
  it("(1) ONE delivered unpaid session: count 1, that space, that date, and the sentence names both", async () => {
    const hostId = await makeHost("suspended");
    const session = await makeDeliveredSession(hostId, "Kalayaan Court B");

    const summary = await loadFrozenPayoutSummary(testDb.db, hostId);

    expect(summary).not.toBeNull();
    expect(summary?.count).toBe(1);
    expect(summary?.earliestSpaceTitle).toBe("Kalayaan Court B");
    // The DB clock and the JS clock agree to the second here; the seed wrote this instant, so an
    // off-by-one-row query cannot coincidentally land on it.
    expect(summary?.earliestSessionEnd.getTime()).toBe(session.endsAt.getTime());

    // END TO END: the words a host actually reads, composed the way the page composes them.
    const sentence = frozenSessionSentence(summary);
    expect(sentence).not.toBeNull();
    expect(sentence).toContain("Kalayaan Court B");
    expect(sentence).toContain(formatFrozenSessionDate(session.endsAt));
    // Absolute date, four-digit year — the property `review-signal.test.ts` case (14) pins on the
    // composer, re-measured here on a date that came out of Postgres rather than out of a fixture.
    expect(sentence).toMatch(/\b[A-Z][a-z]{2} \d{1,2}, \d{4}\b/);
  });

  it("(2) THREE delivered unpaid sessions: count 3, and the EARLIEST one is the one named", async () => {
    const hostId = await makeHost("suspended");
    // Seeded NEWEST FIRST on purpose. If the query dropped its ORDER BY entirely, Postgres would be
    // free to hand back insertion order and the "earliest" assertion would pass by luck.
    const newest = await makeDeliveredSession(hostId, "Newest Studio", 1);
    const middle = await makeDeliveredSession(hostId, "Middle Studio", 20);
    const earliest = await makeDeliveredSession(hostId, "Earliest Studio", 60);

    const summary = await loadFrozenPayoutSummary(testDb.db, hostId);

    expect(summary?.count).toBe(3);
    expect(summary?.earliestSpaceTitle).toBe("Earliest Studio");
    expect(summary?.earliestSessionEnd.getTime()).toBe(earliest.endsAt.getTime());
    // Named explicitly rather than left to the equality above: this is the pair the ASC→DESC mutation
    // reddens, and a reader should be able to see which two rows the ordering is being judged against.
    expect(summary?.earliestSpaceTitle).not.toBe("Newest Studio");
    expect(summary?.earliestSessionEnd.getTime()).toBeLessThan(newest.endsAt.getTime());
    expect(summary?.earliestSessionEnd.getTime()).toBeLessThan(middle.endsAt.getTime());

    const sentence = frozenSessionSentence(summary);
    expect(sentence).toContain("3 sessions");
    expect(sentence).toContain("Earliest Studio");
    expect(sentence).not.toContain("Newest Studio");
  });

  it("(3) a suspended host with NOTHING frozen reads nothing extra — and the control still does", async () => {
    const quiet = await makeHost("suspended");
    // A session that has NOT been delivered yet: it ends in the future, so no payout is due and its
    // absence from the table has nothing to do with the suspension.
    const listingId = await makeListing(quiet, "Future Court");
    const future = new Date(Date.now() + 7 * 86_400_000);
    await testDb.db.insert(booking).values({
      id: uid("fp_bk"),
      listingId,
      unit: 1,
      bookerId: BOOKER,
      startsAt: new Date(future.getTime() - 3_600_000),
      endsAt: future,
      status: "confirmed",
      quotedTotalCents: 200000,
      spacePriceCents: 200000,
      serviceFeeCents: 0,
      currency: "php",
      expiresAt: null,
    });

    // THE CONTROL, in the same schema and the same call sequence: a suspended host who DOES have one.
    // Without it, "null" here is satisfied by a function that returns null for everybody.
    const loud = await makeHost("suspended");
    await makeDeliveredSession(loud, "Control Court");

    expect(await loadFrozenPayoutSummary(testDb.db, quiet)).toBeNull();
    expect(frozenSessionSentence(await loadFrozenPayoutSummary(testDb.db, quiet))).toBeNull();
    expect(await loadFrozenPayoutSummary(testDb.db, loud)).not.toBeNull();
  });

  it("(4) a host who is NOT suspended reads nothing, even with a delivered unpaid session", async () => {
    const approved = await makeHost("approved");
    await makeDeliveredSession(approved, "Approved Court");

    // Nothing about this host's BOOKINGS differs from case 1's — only the verification status does.
    expect(await loadFrozenPayoutSummary(testDb.db, approved)).toBeNull();

    // The same host, suspended, and the SAME session now reports. This is what makes the null above a
    // measurement of the status predicate rather than of anything else in the seed: one column moved.
    await setStatus(approved, "suspended");
    const afterSuspension = await loadFrozenPayoutSummary(testDb.db, approved);
    expect(afterSuspension?.count).toBe(1);
    expect(afterSuspension?.earliestSpaceTitle).toBe("Approved Court");

    // And back again — the freeze is a WHERE over LIVE state, so the report follows it with no other
    // write (the D-14 auto-revert property `payout-suspension-freeze.test.ts` case 4 pins for the
    // sweep). This module reports the freeze; it does not remember one.
    await setStatus(approved, "approved");
    expect(await loadFrozenPayoutSummary(testDb.db, approved)).toBeNull();
  });
});
