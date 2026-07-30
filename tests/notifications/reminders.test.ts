// D-85/D-87 reminders, exercised against a real isolated schema. The invariants under test, and why each
// one is here rather than assumed:
//
//   - AT-MOST-ONCE IS A DATABASE CONSTRAINT (D-87). `booking_reminder`'s UNIQUE(booking_id, kind) is the
//     lock and the INSERT is how it is taken. Case 4 proves it under a GENUINE two-connection race using
//     makeRacingClients — the same harness that proved the double-booking guarantee. The shared max:1
//     client SERIALIZES and would prove nothing, so it is deliberately not used for that case.
//   - THE CLAIM IS WRITTEN BEFORE THE SEND. A crash therefore loses a reminder instead of double-sending
//     one — the strictly better failure under D-87. Case 7 pins the consequence: a rejecting transport
//     still consumes the claim, and nothing escapes the sweep step.
//   - AN UNREACHABLE REMINDER SENDS NOTHING (D-96). A request 4h before its session gets a ~2h SLA, so the
//     6h pre_sla_host offset has no reachable instant inside the hold's life. The correct behaviour is a
//     clean NO-SEND — not a reminder fired immediately, not one scheduled in the past. At runtime this is
//     SILENT BY DESIGN, which is precisely why it needs case 6. A range-only predicate would have selected
//     that request on the first tick and fired instantly; the reachability guard is what prevents it.
//   - A DEAD BOOKING IS NEVER REMINDED ABOUT (T-07-79). Case 8 covers a booking already terminal when the
//     sweep runs; case 9 covers the harder one — cancelled AFTER being scheduled, which only the SEND-time
//     re-read catches.
//   - THE RIGHT PARTY GETS IT (T-07-78). Case 1 asserts per-kind selection isolation and that each query
//     resolves its own recipient (booker vs host) by join.
//
// EVERY fixture timestamp is computed by POSTGRES (`now() + make_interval(...)`), never by the JS clock —
// the 07-05 discipline. Host/Docker clock skew can otherwise make correct arithmetic look wrong.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { user, listing } from "@/lib/db/schema";
import {
  PRE_EXPIRY_REMINDER_HOURS,
  PRE_SESSION_BOOKER_REMINDER_HOURS,
  PRE_SESSION_HOST_REMINDER_HOURS,
  PRE_SLA_REMINDER_HOURS,
} from "@/lib/payments/config";
import {
  claimReminder,
  queryDuePreExpiry,
  queryDuePreSessionBooker,
  queryDuePreSessionHost,
  queryDuePreSlaHost,
  remindOne,
  type ReminderKind,
} from "@/inngest/functions/reminders";
import { inngest } from "@/inngest/client";

let testDb: TestDb;
let sendSpy: ReturnType<typeof vi.spyOn>;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

const BOOKER = "rem_booker";

/** A host + a listing of their own. One listing per booking keeps the GiST EXCLUDE out of the way. */
async function makeHostListing(): Promise<{ hostId: string; listingId: string }> {
  const hostId = uid("host");
  await testDb.db.insert(user).values({
    id: hostId,
    name: "Host",
    email: `${hostId}@example.com`,
    firstName: "Hana",
    canHost: true,
  });
  const listingId = uid("listing");
  await testDb.db.insert(listing).values({
    id: listingId,
    hostId,
    title: "Court A",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Manila",
    hourlyRateCents: 100000,
    currency: "php",
  });
  return { hostId, listingId };
}

type BookingOpts = {
  status: "requested" | "approved" | "confirmed" | "cancelled" | "declined";
  /** Minutes from the DB clock now() to starts_at. */
  startsInMin: number;
  /** Minutes from the DB clock now() to expires_at; null writes NULL. */
  expiresInMin: number | null;
  /** Minutes BEFORE now() the booking was created. Defaults to 30 days — comfortably reachable. */
  createdAgoMin?: number;
  durationMin?: number;
  /**
   * OC-03: write `booking.open_capacity = true`, i.e. a drop-in day pass whose starts_at/ends_at are the
   * venue's opening/closing instants. Defaults to false, so every pre-existing fixture is untouched.
   */
  openCapacity?: boolean;
};

/**
 * Insert a booking whose every instant is computed by POSTGRES. `created_at` is explicit because the
 * REACHABILITY guard (`deadline - OFFSET >= created_at`) reads it: a fixture left on `defaultNow()` would
 * make every pre-session reminder unreachable and quietly turn half these cases green for the wrong reason.
 */
async function makeBooking(
  listingId: string,
  opts: BookingOpts,
): Promise<string> {
  const id = uid("bk");
  const duration = opts.durationMin ?? 60;
  const createdAgo = opts.createdAgoMin ?? 30 * 24 * 60;
  await testDb.db.execute(sql`
    INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status,
      open_capacity,
      quoted_total_cents, space_price_cents, service_fee_cents, currency, expires_at, created_at)
    VALUES (
      ${id}, ${listingId}, 1, ${BOOKER},
      now() + make_interval(mins => ${opts.startsInMin}::int),
      now() + make_interval(mins => ${opts.startsInMin + duration}::int),
      ${opts.status}::booking_status,
      ${opts.openCapacity ?? false},
      105000, 100000, 5000, 'php',
      ${
        opts.expiresInMin === null
          ? sql`NULL`
          : sql`now() + make_interval(mins => ${opts.expiresInMin}::int)`
      },
      now() - make_interval(mins => ${createdAgo}::int)
    )
  `);
  return id;
}

async function countClaims(bookingId: string, kind?: ReminderKind): Promise<number> {
  const [row] = (await testDb.db.execute(sql`
    SELECT count(*)::int AS "c" FROM booking_reminder
    WHERE booking_id = ${bookingId}
      ${kind ? sql`AND kind = ${kind}::reminder_kind` : sql``}
  `)) as unknown as { c: number }[];
  return row?.c ?? 0;
}

/** A `fitout/notify` event exactly as `emitNotify` hands it to Inngest. */
type SentEvent = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    email: string | null;
    payload: Record<string, string>;
  };
};

/** Every event enqueued so far, typed. `vi.spyOn`'s call tuple is `any[]`, hence the single cast here. */
function sentEvents(): SentEvent[] {
  return (sendSpy.mock.calls as unknown as unknown[][]).map((c) => c[0] as SentEvent);
}

/** Every event enqueued for one booking. */
function sentFor(bookingId: string): SentEvent[] {
  return sentEvents().filter((e) => e?.data?.bookingId === bookingId);
}

const H = 60; // minutes per hour, for readable fixture offsets

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "Reminder Booker",
    email: "rem_booker@example.com",
    firstName: "Bianca",
  });
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // Every case drives remindOne/claimReminder directly with an injected dbConn, so the transport is the
  // only thing that needs stubbing. Resolved by default; case 7 makes it reject.
  sendSpy = vi.spyOn(inngest, "send").mockResolvedValue({ ids: [] } as never);
});

afterAll(async () => {
  sendSpy.mockRestore();
  vi.doUnmock("@/lib/db");
  await teardownTestDb(testDb);
});

// ---------------------------------------------------------------------------
// 1. Due selection, per kind — and per-kind ISOLATION (T-07-78)
// ---------------------------------------------------------------------------

describe("reminders — due selection per kind (D-85)", () => {
  it("selects each kind's own booking and NO other kind's, and resolves the right recipient", async () => {
    const { hostId, listingId: lExpiry } = await makeHostListing();
    // An approved, unpaid hold whose payment window closes inside the pre_expiry offset.
    const expiryId = await makeBooking(lExpiry, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: (PRE_EXPIRY_REMINDER_HOURS - 1) * H,
    });

    const { hostId: slaHost, listingId: lSla } = await makeHostListing();
    const slaId = await makeBooking(lSla, {
      status: "requested",
      startsInMin: 40 * H,
      expiresInMin: (PRE_SLA_REMINDER_HOURS - 1) * H,
    });

    const { listingId: lBooker } = await makeHostListing();
    const bookerId = await makeBooking(lBooker, {
      status: "confirmed",
      startsInMin: (PRE_SESSION_BOOKER_REMINDER_HOURS - 1) * H,
      expiresInMin: null,
    });

    const { hostId: sessHost, listingId: lHost } = await makeHostListing();
    const hostSessionId = await makeBooking(lHost, {
      status: "confirmed",
      startsInMin: (PRE_SESSION_HOST_REMINDER_HOURS - 1) * H,
      expiresInMin: null,
    });

    // OUTSIDE every range: an approved hold whose window closes far beyond the 4h pre_expiry offset.
    const { listingId: lFar } = await makeHostListing();
    const farId = await makeBooking(lFar, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: (PRE_EXPIRY_REMINDER_HOURS + 6) * H,
    });

    const [expiry, sla, booker, host] = await Promise.all([
      queryDuePreExpiry(testDb.db),
      queryDuePreSlaHost(testDb.db),
      queryDuePreSessionBooker(testDb.db),
      queryDuePreSessionHost(testDb.db),
    ]);
    const ids = (rows: { bookingId: string }[]) => rows.map((r) => r.bookingId);

    // Each query selects exactly its own fixture...
    expect(ids(expiry)).toContain(expiryId);
    expect(ids(sla)).toContain(slaId);
    expect(ids(booker)).toContain(bookerId);
    expect(ids(host)).toContain(hostSessionId);

    // ...and none of the others'. A pre_expiry query that also matched a `requested` hold would tell a
    // booker to pay for a request the host has not approved.
    expect(ids(expiry)).not.toContain(slaId);
    expect(ids(sla)).not.toContain(expiryId);
    expect(ids(booker)).not.toContain(expiryId);
    expect(ids(host)).not.toContain(slaId);

    // Out of range for everything.
    for (const rows of [expiry, sla, booker, host]) expect(ids(rows)).not.toContain(farId);

    // T-07-78 — the recipient is resolved by join, not inferred later. Booker reminders go to the booker;
    // host reminders go to THAT listing's host. Getting this wrong leaks one party's booking to the other.
    expect(expiry.find((r) => r.bookingId === expiryId)!.recipientId).toBe(BOOKER);
    expect(booker.find((r) => r.bookingId === bookerId)!.recipientId).toBe(BOOKER);
    expect(sla.find((r) => r.bookingId === slaId)!.recipientId).toBe(slaHost);
    expect(host.find((r) => r.bookingId === hostSessionId)!.recipientId).toBe(sessHost);
    expect(sla.find((r) => r.bookingId === slaId)!.email).toBe(`${slaHost}@example.com`);

    // The unrelated host of the pre_expiry listing is never a recipient of the booker's reminder.
    expect(expiry.find((r) => r.bookingId === expiryId)!.recipientId).not.toBe(hostId);
  });

  it("hydrates timestamps as real Dates, not Postgres TEXT (the 07-06 boundary contract)", async () => {
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: (PRE_EXPIRY_REMINDER_HOURS - 1) * H,
    });

    const row = (await queryDuePreExpiry(testDb.db)).find((r) => r.bookingId === id)!;
    // `db.execute` returns timestamptz as TEXT. A cast-only projection would compile, lint and build and
    // then hand composeWhenLabel a string on the first real row — every reminder's date label would break.
    expect(row.startsAt).toBeInstanceOf(Date);
    expect(row.endsAt).toBeInstanceOf(Date);
    expect(row.expiresAt).toBeInstanceOf(Date);
    expect(Number.isNaN(row.startsAt.getTime())).toBe(false);
    expect(row.expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });
});

// ---------------------------------------------------------------------------
// 2. Range boundaries
// ---------------------------------------------------------------------------

describe("reminders — range boundaries (the hourly cron cannot hit an instant)", () => {
  it("includes a deadline exactly at now() + OFFSET and excludes one already at now()", async () => {
    const { listingId: lAt } = await makeHostListing();
    // Exactly at the boundary. now() advances between the INSERT and the SELECT, so the stored value ends
    // up a hair INSIDE now() + OFFSET — which is the correct reading of "at the boundary, included".
    const atBoundary = await makeBooking(lAt, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: PRE_EXPIRY_REMINDER_HOURS * H,
    });

    const { listingId: lPast } = await makeHostListing();
    // expires_at == now() at insert time ⇒ already lapsed by the time the query runs. The `> now()` guard
    // must drop it: a lapsed hold is the request-expiry cron's business, never a reminder's.
    const alreadyLapsed = await makeBooking(lPast, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: 0,
    });

    const ids = (await queryDuePreExpiry(testDb.db)).map((r) => r.bookingId);
    expect(ids).toContain(atBoundary);
    expect(ids).not.toContain(alreadyLapsed);
  });
});

// ---------------------------------------------------------------------------
// 3. At-most-once, sequential (the Inngest step-retry shape)
// ---------------------------------------------------------------------------

describe("reminders — at-most-once, sequential (D-87)", () => {
  it("a second pass over the same (booking, kind) claims nothing and emits nothing", async () => {
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: (PRE_EXPIRY_REMINDER_HOURS - 1) * H,
    });
    const ref = { bookingId: id, kind: "pre_expiry" as const };

    const first = await remindOne(testDb.db, ref);
    // Exactly what an Inngest step retry looks like: the same step body runs again, later, unchanged.
    const second = await remindOne(testDb.db, ref);

    expect(first).toEqual({ status: "sent" });
    expect(second).toEqual({ status: "skipped-claimed" });
    expect(await countClaims(id)).toBe(1);
    expect(sentFor(id)).toHaveLength(1);

    // The emission carries the pre-composed venue-local deadline label, never an hour count from config —
    // under D-96 the real deadline is frequently NOT APPROVAL_SLA_HOURS from now.
    const [event] = sentFor(id);
    expect(event.name).toBe("fitout/notify");
    expect(event.data.recipientId).toBe(BOOKER); // the payer, not the host
    expect(event.data.payload.type).toBe("reminder_pre_expiry");
    expect(event.data.payload.payByLabel).toMatch(/Manila time/);
    expect(event.data.payload.whenLabel).toMatch(/Manila time/);
    expect(event.data.payload.totalLabel).toContain("1,050"); // the FROZEN all-in quote, never a recompute
  });
});

// ---------------------------------------------------------------------------
// 4. At-most-once under GENUINE concurrency — the load-bearing case
// ---------------------------------------------------------------------------

describe("reminders — at-most-once under genuine concurrency (D-87, T-07-76)", () => {
  it("two INDEPENDENT connections claiming the same (booking, kind) → exactly one winner", async () => {
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: (PRE_EXPIRY_REMINDER_HOURS - 1) * H,
    });

    // NOT mocked, and NOT the shared max:1 client — that one serializes and would prove nothing about a
    // race. Two independent pools ⇒ two backend connections ⇒ a real simultaneous INSERT.
    const [c1, c2] = makeRacingClients(testDb.schema, 2);
    try {
      const results = await Promise.all([
        claimReminder(drizzle(c1), id, "pre_expiry"),
        claimReminder(drizzle(c2), id, "pre_expiry"),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1); // exactly one INSERT won
      expect(results.filter((r) => !r)).toHaveLength(1); // the ON CONFLICT loser emits nothing
    } finally {
      await c1.end();
      await c2.end();
    }

    // The DATABASE — not application code, and not an Inngest dedupe TTL — is what makes this true.
    expect(await countClaims(id, "pre_expiry")).toBe(1);
  });

  it("two concurrent full sweeps of the same reminder send it exactly once", async () => {
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: (PRE_EXPIRY_REMINDER_HOURS - 1) * H,
    });
    const ref = { bookingId: id, kind: "pre_expiry" as const };

    const [c1, c2] = makeRacingClients(testDb.schema, 2);
    try {
      const results = await Promise.all([
        remindOne(drizzle(c1), ref),
        remindOne(drizzle(c2), ref),
      ]);
      expect(results.filter((r) => r.status === "sent")).toHaveLength(1);
      expect(results.filter((r) => r.status === "skipped-claimed")).toHaveLength(1);
    } finally {
      await c1.end();
      await c2.end();
    }

    expect(await countClaims(id)).toBe(1);
    expect(sentFor(id)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Cross-kind independence
// ---------------------------------------------------------------------------

describe("reminders — cross-kind independence (the UNIQUE is composite)", () => {
  it("one booking holds one claim per kind; claiming the booker's does not block the host's", async () => {
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "confirmed",
      startsInMin: (PRE_SESSION_HOST_REMINDER_HOURS - 1) * H,
      expiresInMin: null,
    });

    // Both pre-session kinds are due for this booking (it is inside the shorter host window, hence inside
    // the longer booker one too) and they go to DIFFERENT people, so both must be claimable.
    const bookerFirst = await claimReminder(testDb.db, id, "pre_session_booker");
    const hostFirst = await claimReminder(testDb.db, id, "pre_session_host");
    const bookerAgain = await claimReminder(testDb.db, id, "pre_session_booker");

    expect(bookerFirst).toBe(true);
    expect(hostFirst).toBe(true); // a UNIQUE(booking_id) alone would have refused this — the kind matters
    expect(bookerAgain).toBe(false);

    expect(await countClaims(id)).toBe(2);
    expect(await countClaims(id, "pre_session_booker")).toBe(1);
    expect(await countClaims(id, "pre_session_host")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 6. The D-96 UNREACHABLE reminder — silent by design, hence this test
// ---------------------------------------------------------------------------

describe("reminders — an UNREACHABLE reminder sends nothing (D-96, Pitfall 9)", () => {
  it("a request 4h before its session (≈2h SLA) yields ZERO pre_sla_host rows and does not crash", async () => {
    const { listingId } = await makeHostListing();
    // Exactly the 07-05 shape: expires_at = LEAST(now() + GREATEST(floor, LEAST(sla, (starts_at-now())/2)),
    // starts_at). A session 4h out ⇒ a ~2h SLA. The 6h pre_sla_host offset has NO reachable instant inside
    // this hold's life — the reminder point predates the request itself.
    const id = await makeBooking(listingId, {
      status: "requested",
      startsInMin: 4 * H,
      expiresInMin: 2 * H,
      createdAgoMin: 0, // just created, as a short-notice request always is
    });

    const due = await queryDuePreSlaHost(testDb.db);
    // The load-bearing assertion. A RANGE-ONLY predicate would have selected this row (2h < 6h) and fired a
    // "6 hours left" reminder moments after the request was made. NO-SEND is the correct behaviour.
    expect(due.map((r) => r.bookingId)).not.toContain(id);

    // ...and the send path agrees, without throwing. Silent, calm, no claim, no emission.
    const before = sendSpy.mock.calls.length;
    const res = await remindOne(testDb.db, { bookingId: id, kind: "pre_sla_host" });
    expect(res).toEqual({ status: "skipped-not-due" });
    expect(await countClaims(id)).toBe(0);
    expect(sendSpy.mock.calls.length).toBe(before);
  });

  it("the same request IS reachable for its host pre-session reminder — no blanket suppression", async () => {
    const { listingId } = await makeHostListing();
    // A confirmed session 4h out, booked 3 days ago: starts_at - 12h is well after created_at, so the host
    // reminder is reachable and fires (late, on the recovering range). Proves the guard is about
    // REACHABILITY, not about short-notice bookings in general.
    const id = await makeBooking(listingId, {
      status: "confirmed",
      startsInMin: 4 * H,
      expiresInMin: null,
      createdAgoMin: 3 * 24 * H,
    });

    expect((await queryDuePreSessionHost(testDb.db)).map((r) => r.bookingId)).toContain(id);
  });
});

// ---------------------------------------------------------------------------
// 7. A rejecting transport must not fail the sweep
// ---------------------------------------------------------------------------

describe("reminders — an emission failure never fails the sweep step (T-07-80)", () => {
  it("completes, keeps the claim, and lets nothing escape", async () => {
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "approved",
      startsInMin: 40 * H,
      expiresInMin: (PRE_EXPIRY_REMINDER_HOURS - 1) * H,
    });

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendSpy.mockRejectedValueOnce(new Error("inngest 503"));

    // No rejection escapes: emitNotify swallows transport errors by design, and remindOne additionally
    // guards label composition. A reminder must never be able to fail a sweep.
    const res = await remindOne(testDb.db, { bookingId: id, kind: "pre_expiry" });
    expect(res).toEqual({ status: "sent" });

    // The claim is CONSUMED even though the send failed. That is deliberate: the reminder is lost rather
    // than risked twice — the strictly better failure under D-87 — and a permanent send failure surfaces
    // through the 07-07 onFailure `needs_attention` audit path instead.
    expect(await countClaims(id, "pre_expiry")).toBe(1);
    const retry = await remindOne(testDb.db, { bookingId: id, kind: "pre_expiry" });
    expect(retry).toEqual({ status: "skipped-claimed" });

    // Nothing logged carries the recipient's address or the payload (T-07-38 log discipline).
    for (const call of errSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("@example.com");
    }
    errSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 8 + 9. A dead booking is never reminded about (T-07-79)
// ---------------------------------------------------------------------------

describe("reminders — terminal bookings are never reminded (T-07-79)", () => {
  it("a cancelled or declined booking inside the pre-session window is selected by NO query", async () => {
    const { listingId: lCancelled } = await makeHostListing();
    const cancelledId = await makeBooking(lCancelled, {
      status: "cancelled",
      startsInMin: (PRE_SESSION_HOST_REMINDER_HOURS - 1) * H,
      expiresInMin: null,
    });

    const { listingId: lDeclined } = await makeHostListing();
    const declinedId = await makeBooking(lDeclined, {
      status: "declined",
      startsInMin: 4 * H,
      expiresInMin: (PRE_SLA_REMINDER_HOURS - 1) * H,
    });

    const all = (
      await Promise.all([
        queryDuePreExpiry(testDb.db),
        queryDuePreSlaHost(testDb.db),
        queryDuePreSessionBooker(testDb.db),
        queryDuePreSessionHost(testDb.db),
      ])
    )
      .flat()
      .map((r) => r.bookingId);

    expect(all).not.toContain(cancelledId);
    expect(all).not.toContain(declinedId);
  });

  it("a booking cancelled AFTER it was scheduled is not reminded — the send-time re-read catches it", async () => {
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "confirmed",
      startsInMin: (PRE_SESSION_HOST_REMINDER_HOURS - 1) * H,
      expiresInMin: null,
    });
    const ref = { bookingId: id, kind: "pre_session_booker" as const };

    // The sweep sees it as due and queues a step for it...
    expect((await queryDuePreSessionBooker(testDb.db)).map((r) => r.bookingId)).toContain(id);

    // ...and THEN the booker cancels. An Inngest step boundary is a real gap, and a retried step can run
    // much later than the tick that queued it, so a status checked only at schedule time is not a
    // guarantee. Without the re-read in remindOne this would email a reminder for a cancelled session.
    await testDb.db.execute(sql`UPDATE booking SET status = 'cancelled' WHERE id = ${id}`);

    const before = sendSpy.mock.calls.length;
    const res = await remindOne(testDb.db, ref);
    expect(res).toEqual({ status: "skipped-not-due" });
    expect(await countClaims(id)).toBe(0);
    expect(sendSpy.mock.calls.length).toBe(before);
  });

  it("OC-03: a drop-in reminder says 'Drop-in pass', not the venue's opening-to-closing span", async () => {
    // 09-08. The reminder query is RAW SQL, so `b.open_capacity AS "openCapacity"` is the one link in this
    // chain the compiler cannot check: mis-alias it, drop it, or let the hydrate step forget it, and every
    // drop-in reminder silently reverts to announcing a sixteen-hour reservation — with a green type-check
    // and no failing unit test, which is exactly how CR-01 survived four plans. This case drives the REAL
    // projection against a REAL row, so the alias is load-bearing at last.
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "confirmed",
      startsInMin: (PRE_SESSION_HOST_REMINDER_HOURS - 1) * H,
      // The pass's window is the venue day, not an hour — 12h wide here, and long enough that a leaked
      // range label would be unmistakable.
      durationMin: 12 * H,
      expiresInMin: null,
      openCapacity: true,
    });

    // The projection itself: the persisted snapshot must survive the raw SELECT and the hydrate step.
    const due = await queryDuePreSessionBooker(testDb.db);
    const row = due.find((r) => r.bookingId === id);
    expect(row?.openCapacity).toBe(true);

    // …and the label the booker actually receives.
    expect(await remindOne(testDb.db, { bookingId: id, kind: "pre_session_booker" })).toEqual({
      status: "sent",
    });
    const [event] = sentFor(id);
    expect(event.data.payload.whenLabel).toContain("· Drop-in pass, any time ");
    expect(event.data.payload.whenLabel).not.toContain("Full day");
    // The hours are still there — a booker needs to know when they may turn up — but they can never appear
    // in the EXCLUSIVE shape (`{date}, {start} – {end}`), which is the one that reads as a reservation.
    expect(event.data.payload.whenLabel).not.toMatch(/^\w+, \w+ \d+, \d+:\d\d [AP]M – /);
  });

  it("an EXCLUSIVE reminder is byte-identical to what shipped before 09-08", async () => {
    // The other half of the guard: the fork must be invisible to every existing booking. Same fixture shape
    // as the case above with the one flag off — the label keeps its comma, its hour range and its city.
    const { listingId } = await makeHostListing();
    const id = await makeBooking(listingId, {
      status: "confirmed",
      startsInMin: (PRE_SESSION_HOST_REMINDER_HOURS - 1) * H,
      expiresInMin: null,
    });
    expect(await remindOne(testDb.db, { bookingId: id, kind: "pre_session_booker" })).toEqual({
      status: "sent",
    });
    const [event] = sentFor(id);
    expect(event.data.payload.whenLabel).not.toContain("Drop-in");
    expect(event.data.payload.whenLabel).toMatch(
      /^\w+, \w+ \d+, \d+:\d\d [AP]M – \d+:\d\d [AP]M \(Manila time\)$/,
    );
  });
});
