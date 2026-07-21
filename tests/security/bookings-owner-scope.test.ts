// Owner-scope isolation for the bookings read model (T-07-28 / Security V4).
//
// This is the non-optional IDOR control for /bookings and /host/bookings. Both surfaces are list views, so
// the failure mode is not "an attacker guesses one id" — it is "the query forgets a predicate and every
// user's bookings render on every user's page". That makes the WHERE clause, not the route group and not
// the page's JSX, the thing under test here.
//
// The fixture deliberately crosses the two sides so a single missing predicate cannot pass by accident:
//
//     userA hosts listingA          userB hosts listingB
//     bookerA books listingB   -->  so HOST B should see it, and BOOKER A should see it
//     bookerB books listingA   -->  so HOST A should see it, and BOOKER B should see it
//
// Consequently queryBookerBookings(A) and queryHostBookings(A) must return DIFFERENT single rows. A query
// that dropped its owner predicate would return both rows from both calls, and a query that accidentally
// scoped the booker view by host (or vice versa) would return the wrong one — neither mistake can slip
// through as a passing test.
//
// Every assertion is repeated across BOTH tabs and WITH and WITHOUT a cursor, because the tab predicate and
// the keyset predicate are appended to the same WHERE and a refactor could plausibly break one path only.
//
// MUTATION-VERIFIED: this file was checked by deleting the owner predicate from each query in
// src/lib/booking/bookings-query.ts and confirming the suite fails. See the 07-06 SUMMARY.

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import {
  queryBookerBookings,
  queryHostBookings,
  type BookingsTab,
} from "@/lib/booking/bookings-query";

let testDb: TestDb;

const USER_A = "os_user_a";
const USER_B = "os_user_b";
const LISTING_A = "os_listing_a"; // hosted by A
const LISTING_B = "os_listing_b"; // hosted by B

/** Booked by A on B's space — A's row as a booker, B's row as a host. */
const BOOKING_BY_A = "os_bk_by_a";
/** Booked by B on A's space — B's row as a booker, A's row as a host. */
const BOOKING_BY_B = "os_bk_by_b";

const TABS: BookingsTab[] = ["upcoming", "past"];
/** A syntactically valid cursor far enough in the past that it excludes nothing on the Upcoming tab. */
const EARLY_CURSOR = "2000-01-01T00:00:00.000Z|aaa";
/** …and its Past-tab counterpart (Past reads DESC, so the cursor must be far in the future). */
const LATE_CURSOR = "2099-01-01T00:00:00.000Z|zzz";
const cursorFor = (tab: BookingsTab) => (tab === "upcoming" ? EARLY_CURSOR : LATE_CURSOR);

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: USER_A, name: "A", email: "os_a@example.com", firstName: "Ana", emailVerified: true },
    { id: USER_B, name: "B", email: "os_b@example.com", firstName: "Ben", emailVerified: true },
  ]);

  await testDb.db.insert(listing).values([
    {
      id: LISTING_A,
      hostId: USER_A,
      title: "A's Space",
      status: "published",
      unitCount: 1,
      timezone: "Asia/Manila",
      city: "Makati",
      hourlyRateCents: 5000,
      dayRateCents: 30000,
    },
    {
      id: LISTING_B,
      hostId: USER_B,
      title: "B's Space",
      status: "published",
      unitCount: 1,
      timezone: "Asia/Manila",
      city: "Cebu",
      hourlyRateCents: 5000,
      dayRateCents: 30000,
    },
  ]);

  // One booking per side on each tab, so the isolation claim is tested on Upcoming AND Past.
  await testDb.db.insert(booking).values([
    {
      id: BOOKING_BY_A,
      listingId: LISTING_B,
      unit: 1,
      bookerId: USER_A,
      startsAt: new Date("2027-05-01T02:00:00.000Z"),
      endsAt: new Date("2027-05-01T03:00:00.000Z"),
      status: "confirmed",
      quotedTotalCents: 5000,
      currency: "php",
    },
    {
      id: `${BOOKING_BY_A}_past`,
      listingId: LISTING_B,
      unit: 1,
      bookerId: USER_A,
      startsAt: new Date("2025-05-01T02:00:00.000Z"),
      endsAt: new Date("2025-05-01T03:00:00.000Z"),
      status: "confirmed",
      quotedTotalCents: 5000,
      currency: "php",
    },
    {
      id: BOOKING_BY_B,
      listingId: LISTING_A,
      unit: 1,
      bookerId: USER_B,
      startsAt: new Date("2027-05-02T02:00:00.000Z"),
      endsAt: new Date("2027-05-02T03:00:00.000Z"),
      status: "confirmed",
      quotedTotalCents: 5000,
      currency: "php",
    },
    {
      id: `${BOOKING_BY_B}_past`,
      listingId: LISTING_A,
      unit: 1,
      bookerId: USER_B,
      startsAt: new Date("2025-05-02T02:00:00.000Z"),
      endsAt: new Date("2025-05-02T03:00:00.000Z"),
      status: "confirmed",
      quotedTotalCents: 5000,
      currency: "php",
    },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("T-07-28 — a booker can only ever read their own bookings", () => {
  for (const tab of TABS) {
    for (const withCursor of [false, true]) {
      const label = `${tab} tab${withCursor ? " with a cursor" : ""}`;

      it(`returns zero of the other booker's rows on the ${label}`, async () => {
        const forA = await queryBookerBookings(testDb.db, {
          bookerId: USER_A,
          tab,
          cursor: withCursor ? cursorFor(tab) : null,
          limit: 50,
        });
        const forB = await queryBookerBookings(testDb.db, {
          bookerId: USER_B,
          tab,
          cursor: withCursor ? cursorFor(tab) : null,
          limit: 50,
        });

        expect(forA.rows.length).toBeGreaterThan(0);
        expect(forB.rows.length).toBeGreaterThan(0);
        // Every row A sees is a booking A made — and none of B's appears, on either tab.
        expect(forA.rows.every((r) => r.id.startsWith(BOOKING_BY_A))).toBe(true);
        expect(forB.rows.every((r) => r.id.startsWith(BOOKING_BY_B))).toBe(true);
        expect(forA.rows.some((r) => r.id.startsWith(BOOKING_BY_B))).toBe(false);
        expect(forB.rows.some((r) => r.id.startsWith(BOOKING_BY_A))).toBe(false);
      });
    }
  }
});

describe("T-07-28 — a host can only ever read bookings on their own listings", () => {
  for (const tab of TABS) {
    for (const withCursor of [false, true]) {
      const label = `${tab} tab${withCursor ? " with a cursor" : ""}`;

      it(`returns zero of the other host's rows on the ${label}`, async () => {
        const forA = await queryHostBookings(testDb.db, {
          hostId: USER_A,
          tab,
          listingId: null,
          cursor: withCursor ? cursorFor(tab) : null,
          limit: 50,
        });
        const forB = await queryHostBookings(testDb.db, {
          hostId: USER_B,
          tab,
          listingId: null,
          cursor: withCursor ? cursorFor(tab) : null,
          limit: 50,
        });

        expect(forA.rows.length).toBeGreaterThan(0);
        expect(forB.rows.length).toBeGreaterThan(0);
        // Host A owns listingA, which is where B's bookings live — and nothing else.
        expect(forA.rows.every((r) => r.listingId === LISTING_A)).toBe(true);
        expect(forB.rows.every((r) => r.listingId === LISTING_B)).toBe(true);
        expect(forA.rows.some((r) => r.listingId === LISTING_B)).toBe(false);
        expect(forB.rows.some((r) => r.listingId === LISTING_A)).toBe(false);
      });
    }
  }
});

describe("T-07-29/T-07-30 — the two sides are scoped independently", () => {
  it("gives the same user DIFFERENT rows as a booker and as a host", async () => {
    // The crossed fixture's whole point: if either predicate were dropped or swapped, these two sets would
    // become equal (or would swap), and this assertion is the one that notices.
    const asBooker = await queryBookerBookings(testDb.db, {
      bookerId: USER_A,
      tab: "upcoming",
      cursor: null,
      limit: 50,
    });
    const asHost = await queryHostBookings(testDb.db, {
      hostId: USER_A,
      tab: "upcoming",
      listingId: null,
      cursor: null,
      limit: 50,
    });

    expect(asBooker.rows.map((r) => r.id)).toEqual([BOOKING_BY_A]);
    expect(asHost.rows.map((r) => r.id)).toEqual([BOOKING_BY_B]);
  });

  it("cannot be widened by pointing ?listing= at another host's space", async () => {
    const forA = await queryHostBookings(testDb.db, {
      hostId: USER_A,
      tab: "upcoming",
      listingId: LISTING_B, // A does not own this
      cursor: null,
      limit: 50,
    });
    // The filter is applied INSIDE the host-scoped predicate, so it intersects to nothing (T-07-30).
    expect(forA.rows).toEqual([]);
  });

  it("returns nothing at all for a user with no bookings on either side", async () => {
    const stranger = await queryBookerBookings(testDb.db, {
      bookerId: "os_nobody",
      tab: "upcoming",
      cursor: null,
      limit: 50,
    });
    const strangerHost = await queryHostBookings(testDb.db, {
      hostId: "os_nobody",
      tab: "past",
      listingId: null,
      cursor: null,
      limit: 50,
    });

    expect(stranger.rows).toEqual([]);
    expect(strangerHost.rows).toEqual([]);
  });
});