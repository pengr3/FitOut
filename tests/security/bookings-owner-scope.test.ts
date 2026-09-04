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
  queryHostAgenda,
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

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// T-14-02-IDOR — the host dashboard agenda joins the SAME matrix (HFLOW-03 · 14-CONTEXT D-140/D-142).
//
// `queryHostAgenda` is the third owner-scoped queryable in this module, so it belongs in this file rather
// than in one of its own: the crossed two-host fixture above already exists, and a separate file would
// prove the agenda in isolation from the two reads whose predicate it copies — which is exactly how the
// three drift apart.
//
// THE RULE BEING RE-APPLIED IS T-06-23 / T-07-29's, unchanged: ownership is decided in the SQL `WHERE`, on
// `listing.host_id`, and nowhere else. `/host` sits in the `(host)` route group, but a route group is a
// LAYOUT and a layout cannot scope a row set — a foreign host's session must be UNSELECTABLE, not merely
// unrendered. Every assertion below is therefore on the RESULT of a crossed fixture; none is on a
// post-filter in TypeScript, because a post-filter is the thing being ruled out.
//
// (The layout is not a data gate for a second, independent reason: a read added in `(host)/host/layout.tsx`
// instead of in a page would also fail `tests/design/blocking-session-gate.test.ts`, which forbids exactly
// that placement. Two gates plus the `WHERE` — 14-PATTERNS § S1.)
//
// THE AGENDA'S CLOCK IS AN INJECTED PARAMETER (D-141), which is what lets these cases reuse the shipped
// fixture unchanged: rather than seeding new "today" rows — which would move the exact-set assertions
// above — each case is read AT THE INSTANT one of the existing crossed bookings starts. That instant is
// "today" for exactly one of the two hosts, so the symmetry case has real rows on both sides.
//
// MUTATION-VERIFIED, like the two blocks above. The agenda's `l.host_id = $1` was widened to
// `l.host_id IS NOT NULL` on BOTH buckets — a genuine dropped predicate that still parses — leaving the two
// shipped reads untouched. Observed:
//
//    ❯ tests/security/bookings-owner-scope.test.ts (15 tests | 4 failed) 727ms
//         × gives host A only the sessions on host A's listing, with host B's rows present in the DB 20ms
//         × gives host B their own rows and none of host A's — the symmetry that a bare empty result
//           cannot fake 8ms
//         × never lets either bucket carry a row on a listing the host does not own 9ms
//         × returns empty buckets and no error for a host with no listings 5ms
//
//   AssertionError: expected [ { id: 'os_bk_by_b', …(21) } ] to deeply equal []
//        … "bookerFirstName": "Ben", "listingId": "os_listing_a", "listingTitle": "A's Space" …
//
// ALL FOUR new cases red, the eleven shipped ones green — which is the scope claim as well as the
// sensitivity one. The dumped row is the leak in full: host B is handed host A's listing, host A's title
// and the FIRST NAME OF A PERSON WHO NEVER BOOKED WITH THEM.
//
// One case had to be strengthened to get there. The first draft asserted only host A's view at
// AGENDA_CLOCK_A and SURVIVED the probe: at that instant there is exactly one session today across both
// hosts, so a query with no owner predicate at all returns host A the very same single row. An assertion
// that a dropped predicate cannot break is not an assertion. The counterpart read at the same instant —
// added below — is what makes it falsifiable, and is the same lesson the crossed fixture at the top of this
// file was built on: a scoping claim needs BOTH sides asked, not one side answered.

/** The instant BOOKING_BY_B starts — venue-local "today" for HOST A, whose listing it sits on. */
const AGENDA_CLOCK_A = new Date("2027-05-02T02:00:00.000Z");
/** The instant BOOKING_BY_A starts — venue-local "today" for HOST B. The symmetry case's clock. */
const AGENDA_CLOCK_B = new Date("2027-05-01T02:00:00.000Z");

describe("T-14-02-IDOR — a host's agenda can only ever contain their own sessions", () => {
  it("gives host A only the sessions on host A's listing, with host B's rows present in the DB", async () => {
    // The foreign rows are REALLY THERE — proved against the table, not assumed — so "absent from the
    // result" is a claim about the predicate and not about an empty database.
    const everything = await testDb.db.select().from(booking);
    expect(everything.map((r) => r.id).sort()).toContain(BOOKING_BY_A);
    expect(everything.map((r) => r.id).sort()).toContain(BOOKING_BY_B);

    const forA = await queryHostAgenda(testDb.db, { hostId: USER_A, now: AGENDA_CLOCK_A });

    expect(forA.today.map((r) => r.id)).toEqual([BOOKING_BY_B]);
    expect(forA.today.every((r) => r.listingId === LISTING_A)).toBe(true);
    expect(forA.today.some((r) => r.id.startsWith(BOOKING_BY_A))).toBe(false);

    // …AND the counterpart read at the SAME instant. Host A's assertions alone are not mutation-sensitive
    // here — at this clock there happens to be exactly one session today across BOTH hosts, so a query that
    // dropped its owner predicate entirely would still hand host A this same single row. The claim only
    // becomes falsifiable when the OTHER host is asked the same question at the same moment: host B's
    // listing has nothing today, so anything at all in this result is host A's row leaking. (Discovered by
    // running the widening probe below — the first draft of this case survived it.)
    const forB = await queryHostAgenda(testDb.db, { hostId: USER_B, now: AGENDA_CLOCK_A });
    expect(forB.today).toEqual([]);
    expect(forB.next).toBeNull();
  });

  it("gives host B their own rows and none of host A's — the symmetry that a bare empty result cannot fake", async () => {
    // Read at the instant B's own listing has a session. If the predicate were dropped, BOTH hosts would
    // return BOTH rows here; if it were swapped, each would return the other's. Only a correct predicate
    // gives two different single-row answers.
    const forB = await queryHostAgenda(testDb.db, { hostId: USER_B, now: AGENDA_CLOCK_B });
    const forA = await queryHostAgenda(testDb.db, { hostId: USER_A, now: AGENDA_CLOCK_B });

    expect(forB.today.map((r) => r.id)).toEqual([BOOKING_BY_A]);
    expect(forB.today.every((r) => r.listingId === LISTING_B)).toBe(true);
    expect(forB.today.some((r) => r.id.startsWith(BOOKING_BY_B))).toBe(false);

    // At the same instant host A has nothing today — and the row they are offered instead is their OWN
    // next session, never host B's. The `next` bucket carries the same owner predicate as the `today` one.
    expect(forA.today).toEqual([]);
    expect(forA.next?.id).toBe(BOOKING_BY_B);
    expect(forA.next?.listingId).toBe(LISTING_A);
  });

  it("never lets either bucket carry a row on a listing the host does not own", async () => {
    for (const [hostId, owned] of [
      [USER_A, LISTING_A],
      [USER_B, LISTING_B],
    ] as const) {
      for (const now of [AGENDA_CLOCK_A, AGENDA_CLOCK_B]) {
        const agenda = await queryHostAgenda(testDb.db, { hostId, now });
        const rows = agenda.next ? [...agenda.today, agenda.next] : agenda.today;
        expect(rows.every((r) => r.listingId === owned)).toBe(true);
      }
    }
  });

  it("returns empty buckets and no error for a host with no listings", async () => {
    const stranger = await queryHostAgenda(testDb.db, { hostId: "os_nobody", now: AGENDA_CLOCK_A });

    expect(stranger.today).toEqual([]);
    expect(stranger.next).toBeNull();
  });
});