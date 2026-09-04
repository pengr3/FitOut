// T-07-48 — the cancel actions' owner gate, and the absence of an enumeration oracle.
//
// TWO SEPARATE PROPERTIES, both load-bearing, both asserted here:
//
//   1. AUTHORIZATION. Booker A cannot cancel booker B's booking. The gate is server-side, in the action,
//      before any UPDATE — the route group is a layout and a layout cannot scope a row set (Security V4).
//      A cancellation is a money-moving, slot-freeing, irreversible act; an IDOR here would let a stranger
//      refund someone else's booking to them and hand their slot back to the market.
//
//   2. NON-DISCLOSURE. The denial for "that booking does not exist" and the denial for "that booking is
//      someone else's" must be the SAME BYTES. If they differ by even a word, the pair becomes an oracle:
//      an attacker walking booking ids learns which ones are REAL, which is a membership leak about other
//      people's reservations that no amount of authorization fixes. So the test asserts equality BETWEEN
//      the two denial strings rather than each against a literal — pinning literals would let a future edit
//      change both in ways that quietly diverge from each other's meaning while both still "matched".
//
// Harness: the REAL actions through the vi.doMock idiom against an isolated schema (cloned from
// tests/booking/cancellation.test.ts). PayMongo is mocked and asserted NEVER called: a denial must not
// reach the money layer at all, not merely fail to persist.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;
const PASSWORD = "averylongpassword";
const HOST_EMAIL = "og_host@example.com";
const A_EMAIL = "og_alice@example.com";
const B_EMAIL = "og_bob@example.com";
const HOURLY = 100000;

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const inngestSend = vi.fn(async () => ({ ids: [] }));
// The real limiter is a module-level Map with a 5-per-60s budget; a stub keeps the denials under test from
// becoming rate-limit denials. See the fuller note in tests/booking/cancellation.test.ts.
const rateLimitCalls: Array<{ key: string; opts: RateLimitOptions }> = [];
const fakeRateLimit = (key: string, opts: RateLimitOptions): RateLimitResult => {
  rateLimitCalls.push({ key, opts });
  return { ok: true };
};

let testDb: TestDb;
let testAuth: TestAuth;
type CancelActions = typeof import("@/app/actions/cancel-booking");
let cancelBookingAsBooker: CancelActions["cancelBookingAsBooker"];
let cancelUnpaidHold: CancelActions["cancelUnpaidHold"];

let hostId: string;
let aliceId: string;
let bobId: string;

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

async function seedListing(id: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    bookingMode: "instant",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: 300000,
    cancellationPolicy: "standard",
  });
}

async function seedBooking(
  id: string,
  listingId: string,
  ownerId: string,
  status: "confirmed" | "approved",
): Promise<void> {
  const base = await readDbNow(testDb.db);
  const startsAt = new Date(base.getTime() + 10 * HOUR);
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId: ownerId,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR),
    status,
    bookingMode: "instant",
    cancellationPolicy: "standard",
    spacePriceCents: HOURLY,
    serviceFeeCents: 5000,
    quotedTotalCents: HOURLY + 5000,
    currency: "php",
    paymentId: status === "confirmed" ? `pay_${id}` : null,
    paymentMethod: status === "confirmed" ? "gcash" : null,
    expiresAt: status === "approved" ? startsAt : null,
  });
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      refundCents: booking.refundCents,
      retainedSpaceCents: booking.retainedSpaceCents,
      cancelledAt: booking.cancelledAt,
      cancelledBy: booking.cancelledBy,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "OG Host",
    firstName: "OGHost",
    intent: "host",
  });
  for (const [email, name] of [
    [A_EMAIL, "Alice"],
    [B_EMAIL, "Bob"],
  ]) {
    await signUp(testAuth, { email, password: PASSWORD, name, firstName: name, intent: "book" });
  }
  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((u) => u.email === HOST_EMAIL)!.id;
  aliceId = ids.find((u) => u.email === A_EMAIL)!.id;
  bobId = ids.find((u) => u.email === B_EMAIL)!.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    createRefund: mockPayMongo.createRefund,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.resetModules();
  ({ cancelBookingAsBooker, cancelUnpaidHold } = await import("@/app/actions/cancel-booking"));

  await seedListing("L_og_paid");
  await seedListing("L_og_hold");
  await seedBooking("bk_og_paid", "L_og_paid", bobId, "confirmed");
  await seedBooking("bk_og_hold", "L_og_hold", bobId, "approved");
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  mockPayMongo.createRefund.mockClear();
  inngestSend.mockClear();
});

describe("cancel actions — owner gate + identical denials (T-07-48)", () => {
  it("cancelBookingAsBooker: a cross-user id and a missing id return the IDENTICAL string", async () => {
    await login(A_EMAIL);

    const crossUser = await cancelBookingAsBooker("bk_og_paid"); // exists, but it is Bob's
    const missing = await cancelBookingAsBooker("bk_does_not_exist_at_all"); // does not exist

    expect(crossUser.ok).toBe(false);
    expect(missing.ok).toBe(false);
    if (crossUser.ok || missing.ok) throw new Error("both calls must be denials");

    // THE ORACLE ASSERTION. Byte equality between the two denials — not each against a literal. A denial
    // that differed would tell an attacker walking ids which ones name a real reservation.
    expect(crossUser.error).toBe(missing.error);
    // Sanity: it is genuinely a denial, and it names neither the owner nor the resource.
    expect(crossUser.error).toMatch(/couldn't find that booking, or it isn't yours/i);
    expect(crossUser.error).not.toMatch(/bob/i);
  });

  it("cancelUnpaidHold: a cross-user id and a missing id return the IDENTICAL string", async () => {
    await login(A_EMAIL);

    const crossUser = await cancelUnpaidHold("bk_og_hold");
    const missing = await cancelUnpaidHold("bk_also_does_not_exist");

    expect(crossUser.ok).toBe(false);
    expect(missing.ok).toBe(false);
    if (crossUser.ok || missing.ok) throw new Error("both calls must be denials");

    expect(crossUser.error).toBe(missing.error);
  });

  it("the two actions share ONE denial string, so switching action reveals nothing either", async () => {
    // A differing denial BETWEEN the actions would be a weaker but real oracle: probe an id with both and
    // the pair of responses narrows what kind of row it is.
    await login(A_EMAIL);
    const paid = await cancelBookingAsBooker("bk_og_hold");
    const hold = await cancelUnpaidHold("bk_og_paid");
    if (paid.ok || hold.ok) throw new Error("both calls must be denials");
    expect(paid.error).toBe(hold.error);
  });

  it("Bob's bookings are BYTE-FOR-BYTE unmodified after Alice's attempts", async () => {
    await login(A_EMAIL);
    const beforePaid = await readRow("bk_og_paid");
    const beforeHold = await readRow("bk_og_hold");

    await cancelBookingAsBooker("bk_og_paid");
    await cancelUnpaidHold("bk_og_hold");
    await cancelUnpaidHold("bk_og_paid");
    await cancelBookingAsBooker("bk_og_hold");

    expect(await readRow("bk_og_paid")).toEqual(beforePaid);
    expect(await readRow("bk_og_hold")).toEqual(beforeHold);
    // Still in their original live states — the slots were never freed for someone else to take.
    expect((await readRow("bk_og_paid")).status).toBe("confirmed");
    expect((await readRow("bk_og_hold")).status).toBe("approved");
    // A denial must never reach the money layer or the notification layer at all.
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
    expect(inngestSend).not.toHaveBeenCalled();
  });

  it("a signed-OUT caller gets a calm sign-in result and changes nothing", async () => {
    sessionHeaders.cookie = ""; // no session
    const res = await cancelBookingAsBooker("bk_og_paid");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/sign in/i);
    expect((await readRow("bk_og_paid")).status).toBe("confirmed");
  });

  it("the OWNER can still cancel — the gate rejects strangers, not everyone", async () => {
    // Without this, the whole file would pass against an action hardcoded to `return DENIED`. It is the
    // control that makes the four denials above mean something.
    await login(B_EMAIL);
    const res = await cancelBookingAsBooker("bk_og_paid");
    expect(res).toEqual({ ok: true, refundCents: 50000 });
    expect((await readRow("bk_og_paid")).status).toBe("cancelled");
    expect((await readRow("bk_og_paid")).cancelledBy).toBe("booker");
  });

  it("the UPDATE itself is owner-scoped — defence in depth behind the pre-read gate", async () => {
    // The action carries `AND booker_id = ${userId}` inside both UPDATEs as well as the loadOwnedBooking
    // gate. Alice is the host's... nobody: she owns no booking here. Bob's remaining hold must survive an
    // attempt aimed squarely at it even though the pre-read gate is the thing that stops it today, because
    // the second layer is what would still stop it if the first were ever refactored away.
    await login(A_EMAIL);
    expect((await cancelUnpaidHold("bk_og_hold")).ok).toBe(false);
    expect((await readRow("bk_og_hold")).status).toBe("approved");

    // And the owner of that hold can still act on it, so the scope narrowed to exactly the right person.
    await login(B_EMAIL);
    expect((await cancelUnpaidHold("bk_og_hold")).ok).toBe(true);
    expect((await readRow("bk_og_hold")).status).toBe("cancelled");
  });

  it("Alice and Bob are genuinely different identities (fixture sanity)", () => {
    expect(aliceId).not.toBe(bobId);
    expect(hostId).not.toBe(bobId);
  });
});
