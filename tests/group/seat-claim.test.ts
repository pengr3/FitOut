// GROUP-05 (D-112/D-113/D-111) — the seat-claim's FUNCTIONAL contract, driven through the real
// `claimSeat` transaction (the race-freedom of that same lock is proven separately in
// seat-claim-race.test.ts). These cases pin the behaviours the row lock has to preserve:
//
//   · D-113 toggle/free  — only a confirmed 'yes' consumes a seat; a same-identity 'no' frees it, and a
//                          freed seat is immediately re-claimable by a DIFFERENT identity up to snapshot.
//   · D-120 no-op        — an already-'yes' row toggling to 'yes' again is ONE row, not a second seat.
//   · D-113 partial      — a mix of yes / no / never-answered leaves the booking_group row valid & unchanged.
//   · D-111 snapshot     — the cap reads capacity_snapshot ONLY; a host lowering live maxOccupancy after
//                          confirmations cannot shrink an in-flight group's cap.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, bookingGroup } from "@/lib/db/schema";
import { claimSeat } from "@/lib/group/seat-claim";

let testDb: TestDb;

const HOST = "host_sc";
const BOOKER = "booker_sc";
const LISTING = "listing_sc";

// Fresh booking + group per scenario so no test leaks rsvp state into another. Each group gets its own
// confirmed booking (booking_id is a UNIQUE FK) on a distinct day-window.
let seq = 0;
async function makeGroup(capacity: number): Promise<string> {
  seq += 1;
  const day = String(seq + 1).padStart(2, "0"); // 02, 03, … distinct EXCLUDE-safe windows
  const bookingId = `bk_sc_${seq}`;
  const groupId = `grp_sc_${seq}`;
  await testDb.db.insert(booking).values({
    id: bookingId,
    listingId: LISTING,
    bookerId: BOOKER,
    unit: 1,
    startsAt: new Date(`2026-10-${day}T02:00:00Z`),
    endsAt: new Date(`2026-10-${day}T03:00:00Z`),
    status: "confirmed",
  });
  await testDb.db.insert(bookingGroup).values({
    id: groupId,
    bookingId,
    capacitySnapshot: capacity,
    accessToken: `tok_sc_${seq}`,
  });
  return groupId;
}

async function yesCount(groupId: string): Promise<number> {
  const [{ n }] = (await testDb.db.execute(sql`
    SELECT count(*)::int AS n FROM rsvp WHERE group_id = ${groupId} AND status = 'yes'
  `)) as unknown as { n: number }[];
  return n;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "SC Host", email: "sc_host@example.com", firstName: "SC", emailVerified: true },
    { id: BOOKER, name: "SC Booker", email: "sc_booker@example.com", firstName: "SC", emailVerified: true },
    { id: "sc_u1", name: "SC U1", email: "sc_u1@example.com", firstName: "U1", emailVerified: true },
    { id: "sc_u2", name: "SC U2", email: "sc_u2@example.com", firstName: "U2", emailVerified: true },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "SC court",
    status: "published",
    maxOccupancy: 5,
    unitCount: 1,
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("claimSeat — toggle / free / re-claim (D-113)", () => {
  it("a same-identity yes → no frees the seat (count drops), updating the SAME row", async () => {
    const gid = await makeGroup(1);

    const first = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: "sc_u1",
      guestEmailNorm: null,
      name: "U1",
    });
    expect(first).toEqual({ ok: true, rsvpId: expect.any(String), status: "yes" });
    expect(await yesCount(gid)).toBe(1);

    const freed = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "no",
      userId: "sc_u1",
      guestEmailNorm: null,
      name: "U1",
    });
    // Same identity → the existing row is UPDATED (same rsvpId), not a second row inserted.
    expect(freed).toEqual({ ok: true, rsvpId: (first as { rsvpId: string }).rsvpId, status: "no" });
    expect(await yesCount(gid)).toBe(0);
  });

  it("a freed seat is re-claimable by a DIFFERENT identity up to the snapshot", async () => {
    const gid = await makeGroup(1);

    // u1 fills the single seat…
    await claimSeat(testDb.db, { groupId: gid, answer: "yes", userId: "sc_u1", guestEmailNorm: null, name: "U1" });
    expect(await yesCount(gid)).toBe(1);
    // …a DIFFERENT identity is refused while it is full…
    const refused = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: "sc_u2",
      guestEmailNorm: null,
      name: "U2",
    });
    expect(refused).toEqual({ ok: false, reason: "full" });
    // …u1 frees it…
    await claimSeat(testDb.db, { groupId: gid, answer: "no", userId: "sc_u1", guestEmailNorm: null, name: "U1" });
    expect(await yesCount(gid)).toBe(0);
    // …and now u2 can take the freed seat.
    const reclaim = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: "sc_u2",
      guestEmailNorm: null,
      name: "U2",
    });
    expect(reclaim).toEqual({ ok: true, rsvpId: expect.any(String), status: "yes" });
    expect(await yesCount(gid)).toBe(1);
  });

  it("an already-yes → yes is a no-op for the count (one rsvp = one row, D-120)", async () => {
    const gid = await makeGroup(1);

    const first = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: "sc_u1",
      guestEmailNorm: null,
      name: "U1",
    });
    // Re-affirming yes must NOT allocate a second seat, and must NOT be rejected as "full" against itself.
    const again = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: "sc_u1",
      guestEmailNorm: null,
      name: "U1",
    });
    expect(again).toEqual({ ok: true, rsvpId: (first as { rsvpId: string }).rsvpId, status: "yes" });
    expect(await yesCount(gid)).toBe(1);
  });

  it("a partial RSVP (some yes, some no, some never-answered) leaves the booking_group row valid & unchanged", async () => {
    const gid = await makeGroup(5);

    // sc_u1 says yes, sc_u2 says no; a third invitee (guest-with-email) also yes; others never answer.
    await claimSeat(testDb.db, { groupId: gid, answer: "yes", userId: "sc_u1", guestEmailNorm: null, name: "U1" });
    await claimSeat(testDb.db, { groupId: gid, answer: "no", userId: "sc_u2", guestEmailNorm: null, name: "U2" });
    await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: null,
      guestEmailNorm: "guest@example.com",
      name: "Guest",
    });

    // Only the two 'yes' consume seats; the group is neither full nor voided — a partial RSVP is valid.
    expect(await yesCount(gid)).toBe(2);
    const [g] = (await testDb.db.execute(sql`
      SELECT capacity_snapshot, voided_at FROM booking_group WHERE id = ${gid}
    `)) as unknown as { capacity_snapshot: number; voided_at: string | null }[];
    expect(g.capacity_snapshot).toBe(5); // unchanged by the RSVPs
    expect(g.voided_at).toBeNull(); // a partial RSVP never voids the booking
  });
});

describe("claimSeat — the cap is the SNAPSHOT, never live maxOccupancy (D-111)", () => {
  it("reads capacity_snapshot even after the host lowers listing.maxOccupancy below the yes-count", async () => {
    const gid = await makeGroup(3); // snapshot captured at 3

    // Host retroactively slashes the LIVE listing capacity to 1 — this must not shrink the in-flight cap.
    await testDb.db.execute(sql`UPDATE listing SET max_occupancy = 1 WHERE id = ${LISTING}`);

    // Three yes still fit — the claim reads the snapshot (3), never live maxOccupancy (1). If it read
    // maxOccupancy the 2nd of these would already be "full".
    for (const uid of ["sc_u1", "sc_u2"]) {
      const r = await claimSeat(testDb.db, { groupId: gid, answer: "yes", userId: uid, guestEmailNorm: null, name: uid });
      expect(r).toEqual({ ok: true, rsvpId: expect.any(String), status: "yes" });
    }
    const third = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: null,
      guestEmailNorm: "third@example.com",
      name: "Third",
    });
    expect(third).toEqual({ ok: true, rsvpId: expect.any(String), status: "yes" });
    expect(await yesCount(gid)).toBe(3);

    // The 4th exceeds the SNAPSHOT (3) and is rejected — the snapshot, not the lowered maxOccupancy, is the cap.
    const fourth = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: null,
      guestEmailNorm: "fourth@example.com",
      name: "Fourth",
    });
    expect(fourth).toEqual({ ok: false, reason: "full" });

    // Restore the fixture's live capacity so this test is order-independent for anything sharing LISTING.
    await testDb.db.execute(sql`UPDATE listing SET max_occupancy = 5 WHERE id = ${LISTING}`);
  });
});
