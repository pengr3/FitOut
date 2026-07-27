// Owner scope + token non-disclosure for the group read layer (T-08-14 / T-08-17 · Security V4).
//
// Cloned from tests/security/bookings-owner-scope.test.ts, including its crossed fixture, because the
// failure mode is the same shape: the thing under test is the WHERE clause, not the route group and not the
// page's JSX. A group roster is other people's names and attendance — the most personal data this phase
// creates — so "the organizer's page only renders their own" is not a control; "a foreign row is
// UNREADABLE" is.
//
// The fixture crosses the two sides so a single missing predicate cannot pass by accident:
//
//     userA hosts listingA          userB hosts listingB
//     bookerA books listingB  -> groupA  (2 yes, 1 no)
//     bookerB books listingA  -> groupB  (1 yes)
//
// Consequently every read for A and the same read for B must return DIFFERENT, DISJOINT rows, and each
// read aimed at the OTHER organizer's group must come back empty/null. A query that dropped its owner
// predicate returns both sets from both calls; a query that scoped by the wrong id returns the other one.
// Neither mistake can slip through as a passing test.
//
// POSITIVE CONTROLS ARE WHAT MAKE THIS NON-VACUOUS (the 07-14 lesson): the file also asserts exact counts,
// exact id sets, and that an organizer genuinely CAN read their own roster/headcount/group and that a valid
// token genuinely DOES resolve — so an implementation hardcoded to "return nothing" fails here too.
//
// SECOND PROPERTY — THE TOKEN ORACLE (T-08-17). An unknown token, a regenerated (replaced) token, a voided
// group and a cancelled booking must all resolve to the SAME BYTES. The invite link is a shared bearer
// credential of publicly-known length; a state that differed by even one field would tell someone walking
// the token space which tokens name a real group. So the assertions compare the four results to EACH OTHER
// (and their key sets), not each against a literal.
//
// MUTATION-VERIFIED: each owner predicate in src/lib/group/rsvp.ts was deleted in turn and the suite
// confirmed to fail, then restored. Counts are recorded in the 08-06 SUMMARY.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, bookingGroup, rsvp } from "@/lib/db/schema";
import {
  getGroupByToken,
  getHeadcount,
  getOwnedGroupByBooking,
  getOwnedGroupById,
  getRoster,
  listReachableYesAttendees,
  normalizeEmail,
} from "@/lib/group/rsvp";

let testDb: TestDb;

const USER_A = "gos_user_a";
const USER_B = "gos_user_b";
const LISTING_A = "gos_listing_a"; // hosted by A
const LISTING_B = "gos_listing_b"; // hosted by B

/** Booked by A on B's space — A is the ORGANIZER of groupA. */
const BOOKING_A = "gos_bk_a";
/** Booked by B on A's space — B is the ORGANIZER of groupB. */
const BOOKING_B = "gos_bk_b";
/** A's second booking, whose group is VOIDED (the D-121 shape). */
const BOOKING_VOID = "gos_bk_void";
/** A's third booking, CANCELLED with its group still un-voided (defence-in-depth shape). */
const BOOKING_CANCELLED = "gos_bk_cancelled";
/** A's fourth booking, already STARTED — the D-120 RSVP-closed clock case. */
const BOOKING_PAST = "gos_bk_past";

const GROUP_A = "gos_grp_a";
const GROUP_B = "gos_grp_b";
const GROUP_VOID = "gos_grp_void";
const GROUP_CANCELLED = "gos_grp_cancelled";
const GROUP_PAST = "gos_grp_past";

// Tokens are shape-valid Crockford-20 strings (the minter's alphabet), so nothing here passes or fails for
// a reason as uninteresting as its length.
const TOKEN_A = "AAAAAAAAAAAAAAAAAAAA";
const TOKEN_B = "BBBBBBBBBBBBBBBBBBBB";
const TOKEN_VOID = "CCCCCCCCCCCCCCCCCCCC";
const TOKEN_CANCELLED = "DDDDDDDDDDDDDDDDDDDD";
const TOKEN_PAST = "EEEEEEEEEEEEEEEEEEEE";
const TOKEN_UNKNOWN = "ZZZZZZZZZZZZZZZZZZZZ";

const CAPACITY_A = 4;
const CAPACITY_B = 3;

/** A's roster: two coming, one not. B's: one coming. Disjoint by construction. */
const RSVP_A_YES_ACCOUNT = "gos_rsvp_a1";
const RSVP_A_YES_GUEST = "gos_rsvp_a2";
const RSVP_A_NO_GUEST = "gos_rsvp_a3";
const RSVP_A_YES_BLANK = "gos_rsvp_a4";
const RSVP_B_YES = "gos_rsvp_b1";

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: USER_A, name: "A", email: "gos_a@example.com", firstName: "Ana", emailVerified: true },
    { id: USER_B, name: "B", email: "gos_b@example.com", firstName: "Ben", emailVerified: true },
    {
      id: "gos_attendee",
      name: "Attendee",
      email: "gos_attendee@example.com",
      firstName: "Ada",
      emailVerified: true,
    },
  ]);

  await testDb.db.insert(listing).values([
    {
      id: LISTING_A,
      hostId: USER_A,
      title: "A's Space",
      status: "published",
      unitCount: 1,
      maxOccupancy: 8,
      timezone: "Asia/Manila",
      city: "Makati",
      addressLine1: "1 A Street",
      hourlyRateCents: 5000,
      dayRateCents: 30000,
    },
    {
      id: LISTING_B,
      hostId: USER_B,
      title: "B's Space",
      status: "published",
      unitCount: 1,
      maxOccupancy: 6,
      timezone: "Asia/Manila",
      city: "Cebu",
      addressLine1: "2 B Street",
      hourlyRateCents: 5000,
      dayRateCents: 30000,
    },
  ]);

  await testDb.db.insert(booking).values([
    {
      id: BOOKING_A,
      listingId: LISTING_B,
      unit: 1,
      bookerId: USER_A,
      startsAt: new Date("2027-05-01T02:00:00.000Z"),
      endsAt: new Date("2027-05-01T03:00:00.000Z"),
      status: "confirmed",
      quotedTotalCents: 5000,
      spacePriceCents: 5000,
      currency: "php",
    },
    {
      id: BOOKING_B,
      listingId: LISTING_A,
      unit: 1,
      bookerId: USER_B,
      startsAt: new Date("2027-05-02T02:00:00.000Z"),
      endsAt: new Date("2027-05-02T03:00:00.000Z"),
      status: "confirmed",
      quotedTotalCents: 5000,
      spacePriceCents: 5000,
      currency: "php",
    },
    {
      id: BOOKING_VOID,
      listingId: LISTING_B,
      unit: 1,
      bookerId: USER_A,
      startsAt: new Date("2027-05-03T02:00:00.000Z"),
      endsAt: new Date("2027-05-03T03:00:00.000Z"),
      status: "confirmed",
      quotedTotalCents: 5000,
      currency: "php",
    },
    {
      id: BOOKING_CANCELLED,
      listingId: LISTING_B,
      unit: 1,
      bookerId: USER_A,
      startsAt: new Date("2027-05-04T02:00:00.000Z"),
      endsAt: new Date("2027-05-04T03:00:00.000Z"),
      status: "cancelled",
      quotedTotalCents: 5000,
      currency: "php",
    },
    {
      id: BOOKING_PAST,
      listingId: LISTING_B,
      unit: 1,
      bookerId: USER_A,
      startsAt: new Date("2025-05-05T02:00:00.000Z"),
      endsAt: new Date("2025-05-05T03:00:00.000Z"),
      status: "confirmed",
      quotedTotalCents: 5000,
      currency: "php",
    },
  ]);

  await testDb.db.insert(bookingGroup).values([
    { id: GROUP_A, bookingId: BOOKING_A, capacitySnapshot: CAPACITY_A, accessToken: TOKEN_A },
    { id: GROUP_B, bookingId: BOOKING_B, capacitySnapshot: CAPACITY_B, accessToken: TOKEN_B },
    {
      id: GROUP_VOID,
      bookingId: BOOKING_VOID,
      capacitySnapshot: 2,
      accessToken: TOKEN_VOID,
      voidedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: GROUP_CANCELLED,
      bookingId: BOOKING_CANCELLED,
      capacitySnapshot: 2,
      accessToken: TOKEN_CANCELLED,
    },
    { id: GROUP_PAST, bookingId: BOOKING_PAST, capacitySnapshot: 2, accessToken: TOKEN_PAST },
  ]);

  await testDb.db.insert(rsvp).values([
    {
      id: RSVP_A_YES_ACCOUNT,
      groupId: GROUP_A,
      userId: "gos_attendee",
      guestName: "Ada Account",
      status: "yes",
    },
    {
      id: RSVP_A_YES_GUEST,
      groupId: GROUP_A,
      guestName: "Gina Guest",
      guestEmailNorm: "gina@example.com",
      status: "yes",
    },
    { id: RSVP_A_NO_GUEST, groupId: GROUP_A, guestName: "Nate No", status: "no" },
    { id: RSVP_A_YES_BLANK, groupId: GROUP_A, guestName: "Blank Bea", status: "yes" },
    // Reachable on purpose: it is the row that must NOT leak into A's cancel fan-out.
    {
      id: RSVP_B_YES,
      groupId: GROUP_B,
      guestName: "Bea B",
      guestEmailNorm: "bea@example.com",
      status: "yes",
    },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("T-08-14 — the roster is owner-scoped in the WHERE", () => {
  it("gives each organizer their OWN roster and nothing else", async () => {
    const forA = await getRoster(testDb.db, { groupId: GROUP_A, organizerId: USER_A });
    const forB = await getRoster(testDb.db, { groupId: GROUP_B, organizerId: USER_B });

    // Positive control: an organizer genuinely CAN read their own roster (a deny-everything
    // implementation fails right here).
    expect(forA.map((r) => r.rsvpId).sort()).toEqual(
      [RSVP_A_YES_ACCOUNT, RSVP_A_YES_GUEST, RSVP_A_NO_GUEST, RSVP_A_YES_BLANK].sort(),
    );
    expect(forB.map((r) => r.rsvpId)).toEqual([RSVP_B_YES]);

    // …and the two sets are disjoint, which is what a dropped predicate would destroy.
    const idsA = new Set(forA.map((r) => r.rsvpId));
    expect(forB.some((r) => idsA.has(r.rsvpId))).toBe(false);
  });

  it("returns an EMPTY roster when a non-organizer names a real group id", async () => {
    // The crossed direction, both ways. Not "filtered later" — unreadable.
    expect(await getRoster(testDb.db, { groupId: GROUP_A, organizerId: USER_B })).toEqual([]);
    expect(await getRoster(testDb.db, { groupId: GROUP_B, organizerId: USER_A })).toEqual([]);
  });

  it("a foreign read and a missing-group read are indistinguishable", async () => {
    const foreign = await getRoster(testDb.db, { groupId: GROUP_A, organizerId: USER_B });
    const missing = await getRoster(testDb.db, { groupId: "gos_no_such_group", organizerId: USER_B });
    expect(foreign).toEqual(missing);
  });

  it("orders yes rows first and never returns an attendee's email address", async () => {
    const forA = await getRoster(testDb.db, { groupId: GROUP_A, organizerId: USER_A });
    expect(forA.slice(0, 3).every((r) => r.status === "yes")).toBe(true);
    expect(forA[forA.length - 1].status).toBe("no");

    // The roster carries reachability, never the address itself (privacy note in rsvp.ts).
    for (const row of forA) {
      expect(Object.keys(row)).not.toContain("email");
      expect(Object.keys(row)).not.toContain("guestEmail");
      expect(JSON.stringify(row)).not.toContain("@");
    }
    const account = forA.find((r) => r.rsvpId === RSVP_A_YES_ACCOUNT)!;
    const guest = forA.find((r) => r.rsvpId === RSVP_A_YES_GUEST)!;
    const blank = forA.find((r) => r.rsvpId === RSVP_A_YES_BLANK)!;
    expect(account.isAccount).toBe(true);
    expect(account.hasEmail).toBe(true);
    expect(guest.isAccount).toBe(false);
    expect(guest.hasEmail).toBe(true);
    expect(blank.hasEmail).toBe(false);
    // Timestamps are hydrated Dates at the boundary, not Postgres TEXT (the 07-06 contract).
    expect(account.createdAt).toBeInstanceOf(Date);
    expect(Number.isNaN(account.createdAt.getTime())).toBe(false);
  });

  it("clamps a crafted limit rather than honouring it", async () => {
    const huge = await getRoster(testDb.db, {
      groupId: GROUP_A,
      organizerId: USER_A,
      limit: 10_000_000,
    });
    const zero = await getRoster(testDb.db, { groupId: GROUP_A, organizerId: USER_A, limit: 0 });
    expect(huge).toHaveLength(4);
    expect(zero).toHaveLength(1); // clamped up to 1, never an unbounded or empty scan
  });
});

describe("T-08-14 — the headcount is owner-scoped in the WHERE", () => {
  it("counts only 'yes' rows, against the SNAPSHOT capacity, for the organizer", async () => {
    expect(await getHeadcount(testDb.db, { groupId: GROUP_A, organizerId: USER_A })).toEqual({
      confirmed: 3,
      capacity: CAPACITY_A,
      full: false,
    });
    expect(await getHeadcount(testDb.db, { groupId: GROUP_B, organizerId: USER_B })).toEqual({
      confirmed: 1,
      capacity: CAPACITY_B,
      full: false,
    });
  });

  it("returns null — not a zero count — for a foreign or missing group", async () => {
    const foreign = await getHeadcount(testDb.db, { groupId: GROUP_A, organizerId: USER_B });
    const missing = await getHeadcount(testDb.db, { groupId: "gos_no_such_group", organizerId: USER_A });
    expect(foreign).toBeNull();
    expect(missing).toBeNull();
    // A zero count would render as a real-but-empty group; null is "no such group of yours".
    expect(foreign).toEqual(missing);
  });
});

describe("T-08-14 — the organizer's group row itself is owner-scoped", () => {
  it("resolves by booking id for the organizer, and for nobody else", async () => {
    const mine = await getOwnedGroupByBooking(testDb.db, {
      bookingId: BOOKING_A,
      organizerId: USER_A,
    });
    expect(mine?.groupId).toBe(GROUP_A);
    expect(mine?.capacitySnapshot).toBe(CAPACITY_A);
    expect(mine?.accessToken).toBe(TOKEN_A);
    expect(mine?.startsAt).toBeInstanceOf(Date);
    expect(mine?.voidedAt).toBeNull();

    const stranger = await getOwnedGroupByBooking(testDb.db, {
      bookingId: BOOKING_A,
      organizerId: USER_B,
    });
    const missing = await getOwnedGroupByBooking(testDb.db, {
      bookingId: "gos_no_such_booking",
      organizerId: USER_B,
    });
    expect(stranger).toBeNull();
    expect(stranger).toEqual(missing); // cross-user and missing are the same answer
  });

  it("resolves by group id for the organizer, and for nobody else", async () => {
    expect((await getOwnedGroupById(testDb.db, { groupId: GROUP_B, organizerId: USER_B }))?.groupId).toBe(
      GROUP_B,
    );
    expect(await getOwnedGroupById(testDb.db, { groupId: GROUP_B, organizerId: USER_A })).toBeNull();
    expect(await getOwnedGroupById(testDb.db, { groupId: GROUP_A, organizerId: USER_B })).toBeNull();
  });

  it("still resolves a VOIDED group for its organizer (management must survive a void)", async () => {
    // Voiding kills the invite link, not the organizer's ability to see what happened (D-121).
    const voided = await getOwnedGroupByBooking(testDb.db, {
      bookingId: BOOKING_VOID,
      organizerId: USER_A,
    });
    expect(voided?.groupId).toBe(GROUP_VOID);
    expect(voided?.voidedAt).toBeInstanceOf(Date);
  });
});

describe("T-08-17 — the invite token gives no enumeration oracle", () => {
  it("renders unknown = voided = replaced = cancelled as the IDENTICAL calm state", async () => {
    const unknown = await getGroupByToken(testDb.db, TOKEN_UNKNOWN);
    const voided = await getGroupByToken(testDb.db, TOKEN_VOID);
    const cancelled = await getGroupByToken(testDb.db, TOKEN_CANCELLED);
    // A shape-valid token that was never minted — the "walked the token space" case.
    const replaced = await getGroupByToken(testDb.db, "0123456789ABCDEFGHJK");

    // Compared to EACH OTHER, not to a literal: pinning literals would let a future edit change all four in
    // ways that quietly diverge from each other's meaning while still "matching".
    expect(voided).toEqual(unknown);
    expect(cancelled).toEqual(unknown);
    expect(replaced).toEqual(unknown);
    // Key sets too — an extra field on one branch (a `reason`, a `voidedAt`) IS the oracle.
    expect(Object.keys(voided).sort()).toEqual(Object.keys(unknown).sort());
    expect(JSON.stringify(cancelled)).toBe(JSON.stringify(unknown));
    expect(unknown.active).toBe(false);
  });

  it("a LIVE token resolves — the control that makes the four denials above mean something", async () => {
    const live = await getGroupByToken(testDb.db, TOKEN_A);
    expect(live.active).toBe(true);
    if (!live.active) throw new Error("unreachable");
    expect(live.groupId).toBe(GROUP_A);
    expect(live.bookingId).toBe(BOOKING_A);
    expect(live.organizerId).toBe(USER_A);
    expect(live.capacitySnapshot).toBe(CAPACITY_A);
    expect(live.confirmedYes).toBe(3);
    expect(live.listingTitle).toBe("B's Space");
    expect(live.city).toBe("Cebu");
    expect(live.startsAt).toBeInstanceOf(Date);
    expect(live.startsAt.toISOString()).toBe("2027-05-01T02:00:00.000Z");
  });

  it("the token — not a session — is the credential: B's token resolves B's group for anyone", async () => {
    // GROUP-03: a stranger with the link can answer. The lookup takes no user id at all, and that is the
    // deliberate difference from every organizer read above.
    const live = await getGroupByToken(testDb.db, TOKEN_B);
    if (!live.active) throw new Error("B's live token must resolve");
    expect(live.groupId).toBe(GROUP_B);
    expect(live.organizerId).toBe(USER_B);
  });

  it("closes RSVPs against the DB clock, not a JS clock (D-120)", async () => {
    const future = await getGroupByToken(testDb.db, TOKEN_A);
    const past = await getGroupByToken(testDb.db, TOKEN_PAST);
    if (!future.active || !past.active) throw new Error("both fixtures must resolve");
    expect(future.rsvpClosed).toBe(false);
    expect(past.rsvpClosed).toBe(true);

    // And it really is Postgres deciding: the flag flips when the DB's now() crosses starts_at, which we
    // demonstrate by asking Postgres the same question directly.
    const [row] = (await testDb.db.execute(sql`
      SELECT (now() >= starts_at) AS "closed" FROM booking WHERE id = ${BOOKING_PAST}
    `)) as unknown as { closed: boolean }[];
    expect(row.closed).toBe(true);
  });
});

describe("D-121 — the reachable-attendee read for the cancel fan-out", () => {
  it("returns every yes attendee WITH a channel, and never a blank-email guest", async () => {
    const reachable = await listReachableYesAttendees(testDb.db, GROUP_A);
    expect(reachable.map((r) => r.rsvpId).sort()).toEqual(
      [RSVP_A_YES_ACCOUNT, RSVP_A_YES_GUEST].sort(),
    );
    // The 'no' row and the blank-email 'yes' row are both absent — one said no, one is unreachable.
    expect(reachable.some((r) => r.rsvpId === RSVP_A_NO_GUEST)).toBe(false);
    expect(reachable.some((r) => r.rsvpId === RSVP_A_YES_BLANK)).toBe(false);

    const account = reachable.find((r) => r.rsvpId === RSVP_A_YES_ACCOUNT)!;
    expect(account.userId).toBe("gos_attendee");
    expect(account.accountEmail).toBe("gos_attendee@example.com");
    const guest = reachable.find((r) => r.rsvpId === RSVP_A_YES_GUEST)!;
    expect(guest.userId).toBeNull();
    expect(guest.guestEmail).toBe("gina@example.com");
  });

  it("scopes to the named group — B's attendee never appears in A's fan-out", async () => {
    const reachable = await listReachableYesAttendees(testDb.db, GROUP_A);
    expect(reachable.some((r) => r.rsvpId === RSVP_B_YES)).toBe(false);
    expect((await listReachableYesAttendees(testDb.db, GROUP_B)).map((r) => r.rsvpId)).toEqual([
      RSVP_B_YES,
    ]);
  });
});

describe("normalizeEmail — the D-117 de-dup + opt-in key", () => {
  it("lowercases and trims, and treats blank as no address at all", () => {
    expect(normalizeEmail("  Ann@Example.COM ")).toBe("ann@example.com");
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe("fixture sanity", () => {
  it("the two organizers and their groups are genuinely different", () => {
    expect(USER_A).not.toBe(USER_B);
    expect(GROUP_A).not.toBe(GROUP_B);
    expect(TOKEN_A).not.toBe(TOKEN_B);
  });
});
