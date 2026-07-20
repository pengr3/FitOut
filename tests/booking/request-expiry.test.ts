// Phase-6 request-to-book SLA / payment-window expiry sweeps (BOOK-05 / PAY-05, D-64).
//
// The 06-06 cron (src/inngest/functions/request-expiry.ts) drives the VISIBLE terminal flip + the booker
// email for two lapsed request-to-book holds, DB-clock-authoritative. These integration tests exercise the
// factored queryExpired / expireOne against an isolated schema (the resend transport is globally mocked, so
// the declined email lands in mockResend.sent()). They assert the load-bearing behavior:
//   - SLA auto-decline      : a `requested` hold past `expires_at` (DB clock now()) → `declined`, the slot
//                             frees (an overlapping createPendingHold now succeeds — declined is
//                             non-occupying), and the booker gets the "expired" email ONCE. The cron is the
//                             SOLE booker-email authority (A6).
//   - payment-window release: an `approved` hold past `expires_at` → `cancelled`, the slot frees, and NO
//                             email fires (D-66/A3 — the booker chose not to pay).
//   - idempotency           : a second expireOne over an already-terminal row flips 0 rows (noop) and never
//                             re-sends / re-flips.
//   - selectivity           : a hold still WITHIN its window (future expires_at) is never selected by the
//                             DB-clock sweep.
// Nothing is ever refunded/voided on expiry (D-63) — the freed states are simply non-occupying.
//
// The DB-clock-manip idiom (the first `it` below, from the 06-02 scaffold) proves the harness the cron sweeps
// rely on: force a live hold's `expires_at` into the past with `UPDATE ... expires_at = now() - interval` so
// it becomes selectable without sleeping. The seed helpers here insert an already-past `expires_at` directly
// (the same-machine local Docker DB clock is the authority) for the same effect.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import { mockResend } from "../helpers/mocks";
import { queryExpired, expireOne, type ExpiredBooking } from "@/inngest/functions/request-expiry";
import { createPendingHold } from "@/lib/availability/units";

let testDb: TestDb;

const HOST = "re_host";
const BOOKER = "re_booker";

const START = "2026-11-01T02:00:00.000Z";
const END = "2026-11-01T03:00:00.000Z";

/** A distinct 1-hour UTC window per booking so seeded rows never collide on the booking_no_overlap EXCLUDE. */
function windowAt(hourUtc: number): { startsAt: Date; endsAt: Date } {
  const h = String(hourUtc).padStart(2, "0");
  const h1 = String(hourUtc + 1).padStart(2, "0");
  return {
    startsAt: new Date(`2026-11-01T${h}:00:00.000Z`),
    endsAt: new Date(`2026-11-01T${h1}:00:00.000Z`),
  };
}

/** Seed a request-to-book hold with an explicit status + `expires_at` (past = ready to sweep). */
async function seedHold(opts: {
  id: string;
  status: "requested" | "approved";
  hourUtc: number;
  /** ms from now for `expires_at`: negative = already lapsed (swept), positive = still live. */
  expiresInMs: number;
}): Promise<ExpiredBooking> {
  const { startsAt, endsAt } = windowAt(opts.hourUtc);
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: "L_expiry",
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: opts.status,
    bookingMode: "request",
    quotedTotalCents: 5000, // matches hourlyRate × 1h → whenLabel renders the hourly time span, not "Full day"
    currency: "php",
    expiresAt: new Date(Date.now() + opts.expiresInMs),
  });
  return { id: opts.id, status: opts.status, listingId: "L_expiry", bookerId: BOOKER };
}

async function readStatus(id: string): Promise<string> {
  const [row] = await testDb.db.select({ status: booking.status }).from(booking).where(eq(booking.id, id));
  return row.status;
}

/** Emails sent to the booker mentioning the declined/expired notice (the SOLE booker-email authority). */
function declinedEmails() {
  return mockResend.sent().filter((e) => e.to === "re_booker@example.com" && (e.html ?? "").includes("expired"));
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "RE Host", email: "re_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "RE Booker", email: "re_booker@example.com", firstName: "Booker", emailVerified: true },
  ]);
  await testDb.db.insert(listing).values({
    id: "L_expiry",
    hostId: HOST,
    title: "Expiry Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Manila",
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("request-to-book expiry sweeps — DB-clock-manip harness (06-06 cron behavior)", () => {
  it("the DB-clock-manip idiom forces a live `requested` hold's expires_at into the past deterministically", async () => {
    // Seed a live request (expires_at comfortably in the future), then push it past-window via the DB clock —
    // the exact idiom the SLA-cron sweeps use to select and expire without sleeping.
    await testDb.db.insert(booking).values({
      id: "bk_sla_seed",
      listingId: "L_expiry",
      unit: 1,
      bookerId: BOOKER,
      startsAt: new Date(START),
      endsAt: new Date(END),
      status: "requested",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await testDb.db.execute(sql`UPDATE booking SET expires_at = now() - interval '1 minute' WHERE id = 'bk_sla_seed'`);

    const [{ past }] = await testDb.client<{ past: boolean }[]>`
      SELECT expires_at <= now() AS past FROM booking WHERE id = 'bk_sla_seed'`;
    expect(past).toBe(true);
  });

  it("SLA auto-decline: a `requested` hold past expires_at → `declined`, slot freed, booker emailed once", async () => {
    const row = await seedHold({ id: "bk_sla_decline", status: "requested", hourUtc: 4, expiresInMs: -5 * 60_000 });

    // queryExpired (DB clock now()) selects the lapsed requested hold.
    const due = await queryExpired(testDb.db);
    expect(due.map((d) => d.id)).toContain(row.id);

    const before = declinedEmails().length;
    const res = await expireOne(testDb.db, due.find((d) => d.id === row.id)!);
    expect(res).toEqual({ status: "declined", emailed: true });

    // The VISIBLE flip: requested → declined (the cron's canonical decline target, Warning-1).
    expect(await readStatus(row.id)).toBe("declined");

    // The slot FREES — declined is non-occupying, so an overlapping createPendingHold now succeeds (nothing
    // was refunded/voided, D-63; the freed state is simply non-occupying).
    const { startsAt, endsAt } = windowAt(4);
    const hold = await createPendingHold(testDb.db, { listingId: "L_expiry", bookerId: BOOKER, startsAt, endsAt });
    if ("error" in hold) throw new Error(`overlapping hold on the freed slot failed: ${hold.error}`);
    expect(hold.ok).toBe(true);

    // The booker got EXACTLY ONE declined/expired email (this cron is the SOLE booker-email authority, A6).
    expect(declinedEmails().length - before).toBe(1);
  });

  it("payment-window release: an `approved` hold past expires_at → `cancelled`, slot freed, NO email (silent, D-66/A3)", async () => {
    const row = await seedHold({ id: "bk_pay_release", status: "approved", hourUtc: 5, expiresInMs: -5 * 60_000 });

    const due = await queryExpired(testDb.db);
    expect(due.map((d) => d.id)).toContain(row.id);

    const res = await expireOne(testDb.db, due.find((d) => d.id === row.id)!);
    expect(res).toEqual({ status: "cancelled" });

    // approved → cancelled (the payment-window auto-release, mirrors the 06-02 in-tx sweep).
    expect(await readStatus(row.id)).toBe("cancelled");

    // The slot frees — an overlapping hold now succeeds.
    const { startsAt, endsAt } = windowAt(5);
    const hold = await createPendingHold(testDb.db, { listingId: "L_expiry", bookerId: BOOKER, startsAt, endsAt });
    if ("error" in hold) throw new Error(`overlapping hold on the freed slot failed: ${hold.error}`);
    expect(hold.ok).toBe(true);

    // The payment-window release is SILENT — the booker chose not to pay in time (D-66/A3), so NO email fires.
    expect(mockResend.sent()).toHaveLength(0);
  });

  it("each sweep is idempotent: a re-run over an already-terminal row is a 0-row no-op (no duplicate email)", async () => {
    const row = await seedHold({ id: "bk_idem", status: "requested", hourUtc: 6, expiresInMs: -5 * 60_000 });

    const before = declinedEmails().length;
    const first = await expireOne(testDb.db, row);
    expect(first).toEqual({ status: "declined", emailed: true });
    const afterFirst = declinedEmails().length;
    expect(afterFirst - before).toBe(1);

    // Second pass over the SAME (now `declined`) row: the status-scoped UPDATE flips 0 rows → noop, and the
    // email is NEVER re-sent (T-06-16 idempotency).
    const second = await expireOne(testDb.db, row);
    expect(second).toEqual({ status: "noop" });
    expect(await readStatus(row.id)).toBe("declined"); // unchanged
    expect(declinedEmails().length).toBe(afterFirst); // no duplicate email
  });

  it("neither sweep touches a hold still WITHIN its window (a live requested/approved row is not swept)", async () => {
    const liveReq = await seedHold({ id: "bk_live_req", status: "requested", hourUtc: 7, expiresInMs: 24 * 3_600_000 });
    const liveApp = await seedHold({ id: "bk_live_app", status: "approved", hourUtc: 8, expiresInMs: 24 * 3_600_000 });

    const ids = (await queryExpired(testDb.db)).map((d) => d.id);
    expect(ids).not.toContain(liveReq.id); // requested, expires_at in the future → NOT due
    expect(ids).not.toContain(liveApp.id); // approved, expires_at in the future → NOT due

    // And they are untouched — still holding their slots.
    expect(await readStatus(liveReq.id)).toBe("requested");
    expect(await readStatus(liveApp.id)).toBe("approved");
  });
});
