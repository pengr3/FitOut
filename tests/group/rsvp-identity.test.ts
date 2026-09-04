// GROUP-03 (D-116/D-117) — RSVP identity is HYBRID guest-or-login through ONE `rsvp` row with a
// nullable user_id, and de-dup is SINGLE-PATH: an account de-dups by user_id, a guest-with-email de-dups
// by normalized email, and a name-only guest (no user_id, no email) is intentionally NOT de-dupable.
// The seat-claim cap, roster and organizer management never branch on identity — only the notification
// channel does (built in 08-04). These cases pin that one-row-per-identity contract.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, bookingGroup } from "@/lib/db/schema";
import { claimSeat } from "@/lib/group/seat-claim";

let testDb: TestDb;

const HOST = "host_id";
const BOOKER = "booker_id";
const LISTING = "listing_id_fixture";

let seq = 0;
async function makeGroup(capacity: number): Promise<string> {
  seq += 1;
  const day = String(seq + 1).padStart(2, "0");
  const bookingId = `bk_id_${seq}`;
  const groupId = `grp_id_${seq}`;
  await testDb.db.insert(booking).values({
    id: bookingId,
    listingId: LISTING,
    bookerId: BOOKER,
    unit: 1,
    startsAt: new Date(`2026-11-${day}T02:00:00Z`),
    endsAt: new Date(`2026-11-${day}T03:00:00Z`),
    status: "confirmed",
  });
  await testDb.db.insert(bookingGroup).values({
    id: groupId,
    bookingId,
    capacitySnapshot: capacity,
    accessToken: `tok_id_${seq}`,
  });
  return groupId;
}

type RsvpRow = { id: string; user_id: string | null; guest_email_norm: string | null; guest_name: string; status: string };

async function rows(groupId: string): Promise<RsvpRow[]> {
  return (await testDb.db.execute(sql`
    SELECT id, user_id, guest_email_norm, guest_name, status FROM rsvp WHERE group_id = ${groupId} ORDER BY created_at
  `)) as unknown as RsvpRow[];
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "ID Host", email: "id_host@example.com", firstName: "ID", emailVerified: true },
    { id: BOOKER, name: "ID Booker", email: "id_booker@example.com", firstName: "ID", emailVerified: true },
    { id: "id_acct", name: "Account Attendee", email: "id_acct@example.com", firstName: "Acct", emailVerified: true },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "ID court",
    status: "published",
    maxOccupancy: 10,
    unitCount: 1,
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("RSVP identity — one row per identity (D-116/D-117)", () => {
  it("a name-only guest (no user_id, no email) inserts a single name-only row", async () => {
    const gid = await makeGroup(10);
    const r = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: null,
      guestEmailNorm: null,
      name: "Nameless Nadia",
    });
    expect(r).toEqual({ ok: true, rsvpId: expect.any(String), status: "yes" });

    const all = await rows(gid);
    expect(all).toHaveLength(1);
    expect(all[0].user_id).toBeNull();
    expect(all[0].guest_email_norm).toBeNull();
    expect(all[0].guest_name).toBe("Nameless Nadia");
  });

  it("an account attendee gets exactly one row; a second submit by the same user_id UPDATES it", async () => {
    const gid = await makeGroup(10);
    const first = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: "id_acct",
      guestEmailNorm: null,
      name: "Account Attendee",
    });
    const second = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "no",
      userId: "id_acct",
      guestEmailNorm: null,
      name: "Account Attendee",
    });
    // Same user_id → the same row is updated, never a duplicate inserted.
    expect((second as { rsvpId: string }).rsvpId).toBe((first as { rsvpId: string }).rsvpId);

    const all = await rows(gid);
    expect(all).toHaveLength(1);
    expect(all[0].user_id).toBe("id_acct");
    expect(all[0].status).toBe("no");
  });

  it("a guest-with-email gets exactly one row; a second submit by the same normalized email UPDATES it", async () => {
    const gid = await makeGroup(10);
    const first = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "yes",
      userId: null,
      guestEmailNorm: "repeat@example.com",
      name: "Repeat Rita",
    });
    const second = await claimSeat(testDb.db, {
      groupId: gid,
      answer: "no",
      userId: null,
      guestEmailNorm: "repeat@example.com",
      name: "Repeat Rita",
    });
    expect((second as { rsvpId: string }).rsvpId).toBe((first as { rsvpId: string }).rsvpId);

    const all = await rows(gid);
    expect(all).toHaveLength(1);
    expect(all[0].guest_email_norm).toBe("repeat@example.com");
    expect(all[0].status).toBe("no");
  });

  it("two name-only guests are NOT de-duped — each is its own row (D-117)", async () => {
    const gid = await makeGroup(10);
    await claimSeat(testDb.db, { groupId: gid, answer: "yes", userId: null, guestEmailNorm: null, name: "Guest One" });
    await claimSeat(testDb.db, { groupId: gid, answer: "yes", userId: null, guestEmailNorm: null, name: "Guest Two" });

    const all = await rows(gid);
    expect(all).toHaveLength(2);
    expect(all.map((x) => x.guest_name).sort()).toEqual(["Guest One", "Guest Two"]);
  });
});
