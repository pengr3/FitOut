// Bookings-views read model (MANAGE-01 / MANAGE-02 / HOST-02 · D-102/D-103/D-106).
//
// These integration tests run against an isolated schema and exercise the four properties the two list
// pages rest on — each of which is a correctness claim, not a display preference:
//
//   1. DERIVED `completed` WRITES NOTHING (D-102). The query must report `completed` for a past confirmed
//      booking while the stored row still reads `confirmed`. If the derivation ever became a write, the
//      `completed` enum value would enter the booking_no_overlap EXCLUDE's FREE set and start releasing
//      slots — so "the DB row is unchanged" is asserted directly, not inferred.
//   2. THE TABS ARE DISJOINT AND EXHAUSTIVE (D-103), partitioned by the DB clock. Asserted as a set
//      property over the same booker's full row set, not just per-row, because the failure mode is a
//      booking appearing in BOTH tabs or in NEITHER.
//   3. KEYSET PAGING VISITS EVERY ROW EXACTLY ONCE (D-106) — no duplicate across a page boundary and no
//      skipped row, which is precisely what a skip-count pager cannot guarantee on a mutating list.
//   4. A MALFORMED CURSOR IS BORING (T-07-31). `?cursor=` is attacker-controlled; a crafted value must
//      yield page 1, never a 500.
//   5. A DEBIT LEDGER ROW IS NOT A PAYOUT STATE (T-07-33). A host_cancel_fee row shares the booking_id;
//      unscoped it would tell a host their cancelled booking is about to pay out.
//
// Windows are seeded far in the past (2025) or far in the future (2027) so the DB clock partitions them
// unambiguously; the one relative case uses `now() - interval` so the DB clock stays the sole authority.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, hostPayoutLedger } from "@/lib/db/schema";
import {
  queryBookerBookings,
  queryHostBookings,
  type BookingListRow,
} from "@/lib/booking/bookings-query";

let testDb: TestDb;

const HOST = "v_host";
const BOOKER = "v_booker"; // scenario 1 + 2 (derived completed, tab partition)
const PAGER = "v_pager"; // scenario 3 + 4 (keyset paging, malformed cursor)
const LISTING = "L_views";

/** Distinct 1-hour windows so occupying rows never collide on the booking_no_overlap EXCLUDE. */
function futureWindow(dayOfMonth: number): { startsAt: Date; endsAt: Date } {
  const d = String(dayOfMonth).padStart(2, "0");
  return {
    startsAt: new Date(`2027-03-${d}T02:00:00.000Z`),
    endsAt: new Date(`2027-03-${d}T03:00:00.000Z`),
  };
}

function pastWindow(dayOfMonth: number): { startsAt: Date; endsAt: Date } {
  const d = String(dayOfMonth).padStart(2, "0");
  return {
    startsAt: new Date(`2025-03-${d}T02:00:00.000Z`),
    endsAt: new Date(`2025-03-${d}T03:00:00.000Z`),
  };
}

type SeedStatus = "pending" | "requested" | "approved" | "confirmed" | "cancelled" | "declined";

async function seedBooking(opts: {
  id: string;
  bookerId: string;
  status: SeedStatus;
  window: { startsAt: Date; endsAt: Date };
  refundCents?: number | null;
  /** OC-03: a drop-in day pass. Defaults to false, leaving every pre-existing fixture untouched. */
  openCapacity?: boolean;
}): Promise<void> {
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: LISTING,
    unit: 1,
    bookerId: opts.bookerId,
    startsAt: opts.window.startsAt,
    endsAt: opts.window.endsAt,
    status: opts.status,
    quotedTotalCents: 5000,
    currency: "php",
    refundCents: opts.refundCents ?? null,
    openCapacity: opts.openCapacity ?? false,
  });
}

const ids = (rows: BookingListRow[]) => rows.map((r) => r.id);

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "V Host", email: "v_host@example.com", firstName: "Hosty", emailVerified: true },
    { id: BOOKER, name: "V Booker", email: "v_booker@example.com", firstName: "Booky", emailVerified: true },
    { id: PAGER, name: "V Pager", email: "v_pager@example.com", firstName: "Pagey", emailVerified: true },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "Views Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("D-102 — `completed` is derived at read time and never stored", () => {
  it("reports a past confirmed booking as completed while the stored row still reads confirmed", async () => {
    // The window is closed by ONE MINUTE, on the DB clock — the tightest case that must still derive.
    await testDb.db.execute(sql`
      INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status, quoted_total_cents, currency)
      VALUES ('bk_done', ${LISTING}, 1, ${BOOKER}, now() - interval '61 minutes', now() - interval '1 minute',
              'confirmed', 5000, 'php')
    `);

    const past = await queryBookerBookings(testDb.db, {
      bookerId: BOOKER,
      tab: "past",
      cursor: null,
      limit: 20,
    });
    const row = past.rows.find((r) => r.id === "bk_done");

    expect(row).toBeDefined();
    expect(row?.displayStatus).toBe("completed");
    // The stored status is untouched — the derivation is a projection, not a write.
    expect(row?.status).toBe("confirmed");

    const [stored] = await testDb.db
      .select({ status: booking.status })
      .from(booking)
      .where(eq(booking.id, "bk_done"));
    expect(stored.status).toBe("confirmed");
  });

  it("leaves a still-running confirmed booking as confirmed", async () => {
    await seedBooking({ id: "bk_future_conf", bookerId: BOOKER, status: "confirmed", window: futureWindow(1) });

    const upcoming = await queryBookerBookings(testDb.db, {
      bookerId: BOOKER,
      tab: "upcoming",
      cursor: null,
      limit: 20,
    });
    const row = upcoming.rows.find((r) => r.id === "bk_future_conf");
    expect(row?.displayStatus).toBe("confirmed");
  });
});

describe("D-103 — the Upcoming/Past partition is disjoint and exhaustive on the DB clock", () => {
  it("files a future confirmed booking under Upcoming only", async () => {
    const upcoming = await queryBookerBookings(testDb.db, { bookerId: BOOKER, tab: "upcoming", cursor: null, limit: 50 });
    const past = await queryBookerBookings(testDb.db, { bookerId: BOOKER, tab: "past", cursor: null, limit: 50 });

    expect(ids(upcoming.rows)).toContain("bk_future_conf");
    expect(ids(past.rows)).not.toContain("bk_future_conf");
  });

  it("files a cancelled booking under Past even when its window is still in the future", async () => {
    // The load-bearing case: cancelled and declined are INERT, so they belong to history regardless of when
    // the session would have been. A naive `ends_at <= now()` partition would strand them under Upcoming.
    await seedBooking({
      id: "bk_future_cancelled",
      bookerId: BOOKER,
      status: "cancelled",
      window: futureWindow(2),
      refundCents: 2500,
    });

    const upcoming = await queryBookerBookings(testDb.db, { bookerId: BOOKER, tab: "upcoming", cursor: null, limit: 50 });
    const past = await queryBookerBookings(testDb.db, { bookerId: BOOKER, tab: "past", cursor: null, limit: 50 });

    expect(ids(past.rows)).toContain("bk_future_cancelled");
    expect(ids(upcoming.rows)).not.toContain("bk_future_cancelled");
    // refund_cents rides along so the row can render the D-79 sibling line without a second query.
    expect(past.rows.find((r) => r.id === "bk_future_cancelled")?.refundCents).toBe(2500);
  });

  it("puts every one of the booker's bookings in exactly one tab", async () => {
    await seedBooking({ id: "bk_declined", bookerId: BOOKER, status: "declined", window: futureWindow(3) });
    await seedBooking({ id: "bk_old", bookerId: BOOKER, status: "confirmed", window: pastWindow(4) });
    await seedBooking({ id: "bk_approved", bookerId: BOOKER, status: "approved", window: futureWindow(5) });

    const upcoming = await queryBookerBookings(testDb.db, { bookerId: BOOKER, tab: "upcoming", cursor: null, limit: 50 });
    const past = await queryBookerBookings(testDb.db, { bookerId: BOOKER, tab: "past", cursor: null, limit: 50 });

    const upcomingIds = new Set(ids(upcoming.rows));
    const pastIds = new Set(ids(past.rows));

    // Disjoint: no id appears in both.
    for (const id of upcomingIds) expect(pastIds.has(id)).toBe(false);

    // Exhaustive: the union is the booker's entire row set.
    const all = await testDb.db
      .select({ id: booking.id })
      .from(booking)
      .where(eq(booking.bookerId, BOOKER));
    expect(upcomingIds.size + pastIds.size).toBe(all.length);
    for (const { id } of all) expect(upcomingIds.has(id) || pastIds.has(id)).toBe(true);
  });
});

describe("D-106 — keyset paging visits every row exactly once", () => {
  it("walks 5 bookings across 3 pages of 2 with no duplicate, no gap, and a null terminal cursor", async () => {
    for (let i = 0; i < 5; i++) {
      await seedBooking({
        id: `bk_page_${i}`,
        bookerId: PAGER,
        status: "confirmed",
        window: futureWindow(10 + i),
      });
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let lastCursor: string | null = "seed";

    for (let p = 0; p < 3; p++) {
      const page = await queryBookerBookings(testDb.db, {
        bookerId: PAGER,
        tab: "upcoming",
        cursor,
        limit: 2,
      });
      seen.push(...ids(page.rows));
      cursor = page.nextCursor;
      lastCursor = page.nextCursor;
    }

    expect(seen).toEqual(["bk_page_0", "bk_page_1", "bk_page_2", "bk_page_3", "bk_page_4"]);
    expect(new Set(seen).size).toBe(5); // no row repeated across a boundary
    expect(lastCursor).toBeNull(); // the set is exhausted, so the pager hides
  });

  it("clamps an absurd page size instead of honouring it", async () => {
    const page = await queryBookerBookings(testDb.db, {
      bookerId: PAGER,
      tab: "upcoming",
      cursor: null,
      limit: 100_000,
    });
    expect(page.rows.length).toBeLessThanOrEqual(50);
  });

  it("treats a malformed cursor as absent and returns page 1 rather than throwing", async () => {
    for (const malformed of ["nonsense", "|", "not-a-date|bk_page_0", "'; DROP TABLE booking; --"]) {
      const page = await queryBookerBookings(testDb.db, {
        bookerId: PAGER,
        tab: "upcoming",
        cursor: malformed,
        limit: 2,
      });
      expect(ids(page.rows)).toEqual(["bk_page_0", "bk_page_1"]);
    }
  });
});

describe("T-07-33 — a host_cancel_fee debit is never read as a payout state", () => {
  it("returns payoutState null for a booking carrying only a debit ledger row", async () => {
    await seedBooking({ id: "bk_debit", bookerId: BOOKER, status: "cancelled", window: futureWindow(20) });
    await testDb.db.insert(hostPayoutLedger).values({
      id: "led_debit",
      bookingId: "bk_debit",
      hostId: HOST,
      grossCents: 0,
      commissionRateBps: 0,
      commissionCents: 0,
      netCents: -30000, // a signed DEBIT (D-71)
      currency: "php",
      kind: "host_cancel_fee",
    });

    const past = await queryHostBookings(testDb.db, {
      hostId: HOST,
      tab: "past",
      listingId: null,
      cursor: null,
      limit: 50,
    });
    const row = past.rows.find((r) => r.id === "bk_debit");

    expect(row).toBeDefined();
    expect(row?.payoutState).toBeNull();
  });

  it("still reports a real payout row's state", async () => {
    await seedBooking({ id: "bk_paid", bookerId: BOOKER, status: "confirmed", window: pastWindow(21) });
    await testDb.db.insert(hostPayoutLedger).values({
      id: "led_payout",
      bookingId: "bk_paid",
      hostId: HOST,
      grossCents: 5000,
      commissionRateBps: 1000,
      commissionCents: 500,
      netCents: 4500,
      currency: "php",
      kind: "payout",
      state: "paid",
    });

    const past = await queryHostBookings(testDb.db, {
      hostId: HOST,
      tab: "past",
      listingId: null,
      cursor: null,
      limit: 50,
    });
    expect(past.rows.find((r) => r.id === "bk_paid")?.payoutState).toBe("paid");
    // The host view also carries the booker's display name for the Guest column.
    expect(past.rows.find((r) => r.id === "bk_paid")?.bookerFirstName).toBe("Booky");
  });

  it("narrows, and never widens, when a listing filter is supplied", async () => {
    const unfiltered = await queryHostBookings(testDb.db, {
      hostId: HOST,
      tab: "past",
      listingId: null,
      cursor: null,
      limit: 50,
    });
    const foreign = await queryHostBookings(testDb.db, {
      hostId: HOST,
      tab: "past",
      listingId: "some-other-hosts-listing",
      cursor: null,
      limit: 50,
    });

    expect(unfiltered.rows.length).toBeGreaterThan(0);
    expect(foreign.rows).toEqual([]);
  });
});

describe("OC-03 — both list queries carry the persisted open_capacity snapshot (09-08)", () => {
  // These two SELECTs are RAW SQL, so `b.open_capacity AS "openCapacity"` is the one link the compiler
  // cannot check. Mis-alias or drop it and `openCapacity` arrives `undefined` — falsy — and every drop-in
  // row on /bookings and /host/bookings silently reverts to a sixteen-hour range with a green type-check.
  // That is precisely how CR-01 survived four plans, so the alias gets a real row and a real assertion.
  it("projects TRUE for a drop-in pass and FALSE for an exclusive booking, in both views", async () => {
    await seedBooking({
      id: "bk_open_pass",
      bookerId: BOOKER,
      status: "confirmed",
      window: pastWindow(25),
      openCapacity: true,
    });
    await seedBooking({
      id: "bk_exclusive",
      bookerId: BOOKER,
      status: "confirmed",
      window: pastWindow(26),
    });

    const booker = await queryBookerBookings(testDb.db, {
      bookerId: BOOKER,
      tab: "past",
      cursor: null,
      limit: 50,
    });
    expect(booker.rows.find((r) => r.id === "bk_open_pass")?.openCapacity).toBe(true);
    expect(booker.rows.find((r) => r.id === "bk_exclusive")?.openCapacity).toBe(false);

    const host = await queryHostBookings(testDb.db, {
      hostId: HOST,
      tab: "past",
      listingId: null,
      cursor: null,
      limit: 50,
    });
    expect(host.rows.find((r) => r.id === "bk_open_pass")?.openCapacity).toBe(true);
    expect(host.rows.find((r) => r.id === "bk_exclusive")?.openCapacity).toBe(false);
  });
});