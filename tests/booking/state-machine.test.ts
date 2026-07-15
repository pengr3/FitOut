// Booking state machine (BOOK-01/02/03, D-40/D-41/D-42) — placeHold + confirmBooking driven as the REAL
// server actions through the tests/listing/status-gate.test.ts vi.doMock harness (mock next/headers,
// @/lib/auth, @/lib/db, next/cache, next/navigation → import the actions). Proves the transitions:
//   pending→confirmed (happy)        — confirm before expiry flips the hold and redirects to the confirmation.
//   pending→(expired)                — confirm AFTER expiry is refused GRACEFULLY; the hold is NOT confirmed.
//   owner-gate                       — a non-owner cannot confirm someone else's hold.
//   confirmed→confirmed (idempotent) — a re-confirm of the OWNER's already-confirmed booking is a no-op
//                                      SUCCESS (redirect), never a false "expired"/"just taken" (D-42).
// Plus the placeHold gates: sign-in (D-41), !canBook activate-booking, and the deriveBookable server
// re-check (the route group is not the gate — Security V4).

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user, listing, hostPayout, booking } from "@/lib/db/schema";

// --- Redirect capture -------------------------------------------------------
// next/navigation redirect() throws NEXT_REDIRECT in Next; the mock throws a typed RedirectError carrying
// the target URL so a test can assert the redirect (SUCCESS) path. The class is a module-level constant so
// the doMock factory and the assertions share ONE identity across vi.resetModules().
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}

/** Await an action and return the redirect URL if it redirected; else fail (a normal return is not a redirect). */
async function expectRedirect(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectError) return e.url;
    throw e;
  }
  throw new Error("expected the action to redirect, but it returned normally");
}

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

let testDb: TestDb;
let testAuth: TestAuth;
type BookingActions = typeof import("@/app/actions/booking");
let placeHold: BookingActions["placeHold"];
let confirmBooking: BookingActions["confirmBooking"];

// A fixed future window (absolute UTC — createPendingHold works on instants; per-listing so windows on
// distinct listings never collide on the booking_no_overlap EXCLUDE).
const START = "2026-09-01T02:00:00.000Z";
const END = "2026-09-01T03:00:00.000Z";

const HOST = "sm_host";
const PASSWORD = "averylongpassword";
const BOOKER_EMAIL = "sm_booker@example.com";
const BOOKER2_EMAIL = "sm_booker2@example.com";
const HOSTONLY_EMAIL = "sm_hostonly@example.com"; // canHost only → !canBook

async function seedBookableListing(id: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });
}

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

async function statusOf(id: string): Promise<string | undefined> {
  const rows = await testDb.db.select({ status: booking.status }).from(booking).where(eq(booking.id, id));
  return rows[0]?.status;
}

/** Place a hold via the REAL placeHold action and return the hold id parsed from its redirect URL. */
async function place(listingId: string): Promise<string> {
  const url = await expectRedirect(placeHold({ listingId, startUtc: START, endUtc: END, fullDay: false }));
  const holdId = new URL(url, "http://t").searchParams.get("hold");
  if (!holdId) throw new Error(`no hold id in redirect: ${url}`);
  return holdId;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  // The listing host is a verified user + an ACTIVATED payout row so deriveBookable is TRUE.
  await testDb.db.insert(user).values({
    id: HOST,
    name: "SM Host",
    email: "sm_host@example.com",
    firstName: "Host",
    emailVerified: true,
  });
  await testDb.db.insert(hostPayout).values({
    userId: HOST,
    payoutsEnabled: true,
    activationStatus: "activated",
    onboardingComplete: true,
  });

  // Bookers via real signup (intent 'book' → canBook) + a host-only user (intent 'host' → !canBook).
  await signUp(testAuth, { email: BOOKER_EMAIL, password: PASSWORD, name: "Booker", firstName: "Booker", intent: "book" });
  await signUp(testAuth, { email: BOOKER2_EMAIL, password: PASSWORD, name: "Booker2", firstName: "Booker2", intent: "book" });
  await signUp(testAuth, { email: HOSTONLY_EMAIL, password: PASSWORD, name: "HostOnly", firstName: "HostOnly", intent: "host" });

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("next/navigation", () => ({
    redirect: (url: string) => {
      throw new RedirectError(url);
    },
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  }));
  vi.resetModules();
  ({ placeHold, confirmBooking } = await import("@/app/actions/booking"));

  // One bookable listing per case (distinct ids so windows never collide on the EXCLUDE) + a draft one.
  await seedBookableListing("L_happy");
  await seedBookableListing("L_idem");
  await seedBookableListing("L_exp");
  await seedBookableListing("L_own");
  await testDb.db.insert(listing).values({
    id: "L_draft",
    hostId: HOST,
    title: "Draft",
    status: "draft", // fails deriveBookable → placeHold must refuse
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("next/navigation");
  await teardownTestDb(testDb);
});

describe("placeHold — capability + bookability gate (D-41, Security V4)", () => {
  it("an unauthenticated caller is asked to sign in (D-41) — no hold is created", async () => {
    sessionHeaders.cookie = ""; // no session
    const res = await placeHold({ listingId: "L_happy", startUtc: START, endUtc: END, fullDay: false });
    expect(res).toMatchObject({ ok: false, reason: "sign-in" });
  });

  it("a signed-in !canBook user is routed to activate booking — no hold is created", async () => {
    await login(HOSTONLY_EMAIL);
    const res = await placeHold({ listingId: "L_happy", startUtc: START, endUtc: END, fullDay: false });
    expect(res).toMatchObject({ ok: false, reason: "activate-booking" });
  });

  it("a listing failing the server deriveBookable re-check is refused (the route group is not the gate)", async () => {
    await login(BOOKER_EMAIL);
    const res = await placeHold({ listingId: "L_draft", startUtc: START, endUtc: END, fullDay: false });
    expect(res).toMatchObject({ ok: false, reason: "not-bookable" });
    const [{ n }] = await testDb.client`SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_draft'`;
    expect(n).toBe(0); // never minted a hold on a non-bookable listing
  });
});

describe("confirmBooking — state machine (D-40/D-42)", () => {
  it("happy path: Book (canBook) places a hold (POST) and redirects to the reserve page, then confirm flips pending→confirmed", async () => {
    await login(BOOKER_EMAIL);
    const url = await expectRedirect(placeHold({ listingId: "L_happy", startUtc: START, endUtc: END, fullDay: false }));
    expect(url).toMatch(/^\/listings\/L_happy\/book\?hold=/);
    const holdId = new URL(url, "http://t").searchParams.get("hold")!;
    expect(await statusOf(holdId)).toBe("pending");

    const confirmUrl = await expectRedirect(confirmBooking(holdId));
    expect(confirmUrl).toBe(`/bookings/${holdId}`);
    expect(await statusOf(holdId)).toBe("confirmed"); // D-40 pending→confirmed (the Phase-5 seam)
  });

  it("expiry re-check: a hold that lapsed before confirm is refused gracefully and is NOT flipped to confirmed", async () => {
    await login(BOOKER_EMAIL);
    const holdId = await place("L_exp");
    // Force the hold past its TTL vs the DB clock — the server is the sole expiry authority, never the client.
    await testDb.db.execute(sql`UPDATE booking SET expires_at = now() - interval '1 minute' WHERE id = ${holdId}`);

    const res = await confirmBooking(holdId);
    expect(res).toMatchObject({ ok: false, reason: "expired" }); // graceful, not a 500
    expect(await statusOf(holdId)).toBe("pending"); // NOT flipped — no silent confirm
  });

  it("owner-gate: a different user cannot confirm someone else's hold", async () => {
    await login(BOOKER_EMAIL);
    const holdId = await place("L_own");

    await login(BOOKER2_EMAIL); // a DIFFERENT booker
    const res = await confirmBooking(holdId);
    expect(res).toMatchObject({ ok: false, reason: "denied" });
    expect(await statusOf(holdId)).toBe("pending"); // untouched by the non-owner
  });

  it("idempotent re-confirm: a second confirm of the OWNER's confirmed booking is a no-op SUCCESS, never 'expired' (D-42)", async () => {
    await login(BOOKER_EMAIL);
    const holdId = await place("L_idem");

    const first = await expectRedirect(confirmBooking(holdId));
    expect(first).toBe(`/bookings/${holdId}`);
    expect(await statusOf(holdId)).toBe("confirmed");

    // Second confirm (a double-submit / Back-then-Confirm) → the SAME confirmation redirect, NOT an error.
    const second = await expectRedirect(confirmBooking(holdId));
    expect(second).toBe(`/bookings/${holdId}`);
    expect(await statusOf(holdId)).toBe("confirmed");

    const [{ n }] = await testDb.client`SELECT count(*)::int AS n FROM booking WHERE id = ${holdId}`;
    expect(n).toBe(1); // still exactly one booking — the re-confirm never created a second
  });
});
