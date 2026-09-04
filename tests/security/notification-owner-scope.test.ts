// T-07-82 / T-07-83 — a user can never READ another user's notifications, and can never MARK one read.
//
// WHY THIS FILE IS NON-OPTIONAL. A notification payload is a D-86 durable display record: it carries the
// space title, the venue-local session time, the amount paid, and the other party's name. The bell is a
// LIST surface, so the interesting failure is not "an attacker guesses one id" — it is "a WHERE clause
// loses a predicate and every user's notifications render in every user's header". That makes the query
// predicate, not the route group and not the JSX, the thing under test.
//
// The write half is the mirror image: `markNotificationRead` takes an id straight off the client. If the
// UPDATE's ownership predicate were dropped, anyone could silently clear a stranger's unread state — and,
// because the action returns a fixed shape, could do it without ever seeing an error.
//
// FOUR PROPERTIES, all asserted here:
//
//   1. READ ISOLATION — countUnread/listRecent return only the caller's rows, with the other user's rows
//      present in the same table (a fixture with rows for one user only would pass against ANY query).
//   2. WRITE ISOLATION — A cannot mark B's notification read, singly or in bulk.
//   3. NON-DISCLOSURE — marking a FOREIGN id and marking a NONEXISTENT id return the same bytes, so the
//      pair is not an oracle telling an attacker which notification ids are real.
//   4. POSITIVE CONTROL — A genuinely CAN read and mark their OWN rows. Without this, an implementation
//      that denied everything unconditionally (or a query that returned nothing at all) would sail
//      through every isolation assertion above. Properties 1-3 are only meaningful next to this one.
//
// MUTATION-VERIFIED: checked by deleting the `recipient_id` predicate from `listRecent`/`countUnread`
// (src/lib/notifications.ts) and from both UPDATEs in `src/app/actions/notifications.ts`, and confirming
// this file goes red each time. See the 07-14 SUMMARY for the recorded results.
//
// Harness: the REAL actions through the vi.doMock idiom against an isolated schema, cloned from
// tests/security/cancel-owner-gate.test.ts.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { notification, user, type NotificationPayload } from "@/lib/db/schema";
import { countUnread, listRecent, NOTIFICATIONS_MAX_LIMIT } from "@/lib/notifications";

const PASSWORD = "averylongpassword";
const A_EMAIL = "nos_alice@example.com";
const B_EMAIL = "nos_bob@example.com";

/**
 * The payload's listing title, or `null` for a kind that has none.
 *
 * `in` narrowing rather than a cast: a cast would tell the compiler the field is there and hand back
 * `undefined` at runtime, which would make the leak assertions below pass against rows that carry no
 * title at all. This returns a value the expectation can actually fail on.
 */
const titleOf = (p: NotificationPayload): string | null =>
  "listingTitle" in p ? p.listingTitle : null;

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

let testDb: TestDb;
let testAuth: TestAuth;
type NotificationActions = typeof import("@/app/actions/notifications");
let markNotificationRead: NotificationActions["markNotificationRead"];
let markAllNotificationsRead: NotificationActions["markAllNotificationsRead"];

let aliceId: string;
let bobId: string;

/** A's unread rows, B's unread rows, and one row each that starts out already read. */
const A_UNREAD = ["nos_a_1", "nos_a_2", "nos_a_3"];
const B_UNREAD = ["nos_b_1", "nos_b_2"];
const A_READ = "nos_a_read";
const B_READ = "nos_b_read";

function payloadFor(owner: string): NotificationPayload {
  return {
    type: "booking_confirmed",
    listingTitle: `${owner}'s Court`,
    whenLabel: "Sat, 3 May · 9:00–10:00 AM (Asia/Manila)",
    totalLabel: "₱1,050.00",
    referenceLabel: "FIT-ABCD1234",
    href: "/bookings/nos_booking",
  };
}

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** Read `read_at` straight from the table — never through the code under test. */
async function isUnread(id: string): Promise<boolean> {
  const [row] = await testDb.db
    .select({ readAt: notification.readAt })
    .from(notification)
    .where(eq(notification.id, id));
  return row?.readAt === null;
}

async function seed(
  id: string,
  recipientId: string,
  opts: { read?: boolean; createdAt?: Date } = {},
): Promise<void> {
  await testDb.db.insert(notification).values({
    id,
    recipientId,
    type: "booking_confirmed",
    bookingId: null,
    payload: payloadFor(recipientId === aliceId ? "Alice" : "Bob"),
    readAt: opts.read ? new Date() : null,
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  for (const [email, name] of [
    [A_EMAIL, "Alice"],
    [B_EMAIL, "Bob"],
  ]) {
    await signUp(testAuth, { email, password: PASSWORD, name, firstName: name, intent: "book" });
  }
  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  aliceId = ids.find((u) => u.email === A_EMAIL)!.id;
  bobId = ids.find((u) => u.email === B_EMAIL)!.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ markNotificationRead, markAllNotificationsRead } = await import("@/app/actions/notifications"));

  // Both users' rows live in the SAME table. A query that dropped its owner predicate would see both.
  for (const id of A_UNREAD) await seed(id, aliceId);
  for (const id of B_UNREAD) await seed(id, bobId);
  await seed(A_READ, aliceId, { read: true });
  await seed(B_READ, bobId, { read: true });
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

describe("T-07-82 — notification reads are owner-scoped in the query", () => {
  it("countUnread counts ONLY the caller's unread rows, with the other user's present", async () => {
    const forAlice = await countUnread(testDb.db, aliceId);
    const forBob = await countUnread(testDb.db, bobId);

    // Exact counts, not "greater than zero": a dropped predicate would return 5 for both.
    expect(forAlice).toBe(A_UNREAD.length);
    expect(forBob).toBe(B_UNREAD.length);
    // The already-read rows are excluded, and neither count is the table total.
    expect(forAlice).not.toBe(A_UNREAD.length + B_UNREAD.length);
    // POSITIVE CONTROL: the query genuinely returns rows, so the isolation above means something.
    expect(forAlice).toBeGreaterThan(0);
    expect(forBob).toBeGreaterThan(0);
  });

  it("listRecent returns zero rows belonging to the other user", async () => {
    const forAlice = await listRecent(testDb.db, aliceId, NOTIFICATIONS_MAX_LIMIT);
    const forBob = await listRecent(testDb.db, bobId, NOTIFICATIONS_MAX_LIMIT);

    const aliceIds = forAlice.map((r) => r.id).sort();
    const bobIds = forBob.map((r) => r.id).sort();

    // POSITIVE CONTROL first: each user sees exactly their own set, read rows included (it is a history
    // list, not an inbox). If this were empty, every "does not contain B" assertion below would be vacuous.
    expect(aliceIds).toEqual([...A_UNREAD, A_READ].sort());
    expect(bobIds).toEqual([...B_UNREAD, B_READ].sort());
    // ...and none of the other user's rows leak in either direction.
    expect(forAlice.some((r) => bobIds.includes(r.id))).toBe(false);
    expect(forBob.some((r) => aliceIds.includes(r.id))).toBe(false);
    // The payload is where the leak would actually hurt — assert no foreign display strings crossed.
    //
    // ⚠ READ THROUGH `titleOf`, NOT `r.payload.listingTitle`, SINCE 18-09. The Phase-18 OPS-05 kinds
    // (D-245) are about the HOST'S STANDING rather than a booking, so they carry no `listingTitle` and
    // the bare property access stopped compiling over the whole union. The assertion is UNCHANGED in
    // strength: every row this file seeds is a booking kind and still has to carry its own title, and a
    // titleless kind now FAILS this expectation rather than failing to compile — which is the direction
    // that keeps the leak assertion live.
    expect(forAlice.every((r) => titleOf(r.payload) === "Alice's Court")).toBe(true);
    expect(forBob.every((r) => titleOf(r.payload) === "Bob's Court")).toBe(true);
  });

  it("a user with no notifications at all sees nothing", async () => {
    expect(await countUnread(testDb.db, "nos_nobody")).toBe(0);
    expect(await listRecent(testDb.db, "nos_nobody", NOTIFICATIONS_MAX_LIMIT)).toEqual([]);
  });
});

describe("T-07-83 — mark-read is owner-scoped, idempotent, and not an oracle", () => {
  it("markNotificationRead cannot touch another user's row, and says nothing about it", async () => {
    await login(A_EMAIL);

    const foreign = await markNotificationRead(B_UNREAD[0]); // exists, but it is Bob's
    const missing = await markNotificationRead("nos_no_such_notification_at_all");

    // Bob's row is untouched — asserted against the TABLE, not against the action's return value.
    expect(await isUnread(B_UNREAD[0])).toBe(true);
    // THE ORACLE ASSERTION: a foreign id and a nonexistent id are indistinguishable to the caller. If
    // these ever diverge, an attacker walking ids learns which ones name a real notification.
    expect(foreign).toEqual(missing);
    expect(foreign.ok).toBe(true);
  });

  it("POSITIVE CONTROL: the caller CAN mark their own row read, and doing it twice is a no-op", async () => {
    await login(A_EMAIL);

    expect(await isUnread(A_UNREAD[0])).toBe(true);
    const first = await markNotificationRead(A_UNREAD[0]);
    expect(first.ok).toBe(true);
    expect(await isUnread(A_UNREAD[0])).toBe(false);

    // Idempotent: the second call claims 0 rows (the row is already read) and is not an error.
    const [before] = await testDb.db
      .select({ readAt: notification.readAt })
      .from(notification)
      .where(eq(notification.id, A_UNREAD[0]));
    const second = await markNotificationRead(A_UNREAD[0]);
    const [after] = await testDb.db
      .select({ readAt: notification.readAt })
      .from(notification)
      .where(eq(notification.id, A_UNREAD[0]));

    expect(second.ok).toBe(true);
    // The timestamp is NOT rewritten by the replay — the row records when it was first read.
    expect(after.readAt?.getTime()).toBe(before.readAt?.getTime());
  });

  it("markAllNotificationsRead leaves every one of the other user's rows unread", async () => {
    await login(A_EMAIL);

    const bobBefore = await countUnread(testDb.db, bobId);
    expect(bobBefore).toBe(B_UNREAD.length); // positive control: Bob has unread rows to lose

    const res = await markAllNotificationsRead();
    expect(res.ok).toBe(true);

    // The caller's own rows are all cleared...
    expect(await countUnread(testDb.db, aliceId)).toBe(0);
    // ...and not one of Bob's moved.
    expect(await countUnread(testDb.db, bobId)).toBe(bobBefore);
    for (const id of B_UNREAD) {
      expect(await isUnread(id)).toBe(true);
    }
  });

  it("an unauthenticated caller cannot mark anything read", async () => {
    sessionHeaders.cookie = ""; // no session

    const before = await countUnread(testDb.db, bobId);
    expect(await markNotificationRead(B_UNREAD[0])).toEqual({ ok: false });
    expect(await markAllNotificationsRead()).toEqual({ ok: false });
    expect(await countUnread(testDb.db, bobId)).toBe(before);
  });
});

describe("T-07-86 — the panel is a bounded surface", () => {
  it("listRecent caps at 20 even with 30 rows, newest first", async () => {
    // A dedicated recipient so this cannot disturb the isolation fixtures above.
    const bulkId = "nos_bulk_user";
    await testDb.db.insert(user).values({
      id: bulkId,
      name: "Bulk",
      email: "nos_bulk@example.com",
      firstName: "Bulk",
      emailVerified: true,
    });

    const base = Date.UTC(2026, 0, 1, 0, 0, 0);
    for (let i = 0; i < 30; i += 1) {
      // i ascending == newer, so the expected top-20 is i = 29 down to 10.
      await seedFor(bulkId, `nos_bulk_${String(i).padStart(2, "0")}`, new Date(base + i * 60_000));
    }

    const rows = await listRecent(testDb.db, bulkId, NOTIFICATIONS_MAX_LIMIT);
    expect(rows).toHaveLength(20);
    expect(rows[0].id).toBe("nos_bulk_29");
    expect(rows[19].id).toBe("nos_bulk_10");

    // Newest-first ordering holds across the whole page, not just at the ends.
    const times = rows.map((r) => r.createdAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    // And the timestamps really are Dates, not the Postgres TEXT `db.execute` hands back (the repo's
    // timestamp-hydration contract). A string would silently pass `.sort()` above.
    expect(rows[0].createdAt).toBeInstanceOf(Date);

    // An oversized limit cannot widen the read past the server cap.
    expect(await listRecent(testDb.db, bulkId, 1000)).toHaveLength(20);
  });
});

/** Insert a notification for an arbitrary recipient at an explicit creation time. */
async function seedFor(recipientId: string, id: string, createdAt: Date): Promise<void> {
  await testDb.db.execute(sql`
    INSERT INTO notification (id, recipient_id, type, booking_id, payload, read_at, created_at)
    VALUES (
      ${id}, ${recipientId}, 'booking_confirmed', NULL,
      ${JSON.stringify(payloadFor("Bulk"))}::jsonb, NULL, ${createdAt.toISOString()}
    )
  `);
}
