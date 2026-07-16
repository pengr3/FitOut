// Confirm & pay checkout creation (PAY-01, D-49/D-57/D-58) — confirmBooking driven as the REAL server
// action through the state-machine.test.ts redirect-capture harness, but with @/lib/paymongo mocked to
// mockPayMongo so no live checkout is created. Proves the D-57/D-58 rewrite:
//   - creating the checkout charges EXACTLY the server-frozen booking.quotedTotalCents (D-49 charge
//     integrity — the action takes only holdId, so a client can never inject an amount; T-05-11);
//   - the hold is EXTENDED to now()+PAYMENT_WINDOW before the charge so the sweep can't take the slot
//     mid-payment (D-58 / T-05-16), and the booking is STILL 'pending' — the sync flip is RETIRED (D-57);
//   - the redirect target is the hosted checkout URL;
//   - owner-gate (T-05-13) and the already-confirmed idempotent short-circuit (D-42 / T-05-14) create no
//     checkout.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";

// --- Redirect capture (same idiom as tests/booking/state-machine.test.ts) --------------------------------
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}
async function expectRedirect(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectError) return e.url;
    throw e;
  }
  throw new Error("expected the action to redirect, but it returned normally");
}

// next/headers is only awaited (the session id comes from the mocked auth below), so a bare Headers is fine.
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// The mocked session identity — set per test to drive the owner-gate.
const session: { userId: string | null } = { userId: null };

let testDb: TestDb;
type BookingActions = typeof import("@/app/actions/booking");
let confirmBooking: BookingActions["confirmBooking"];

const HOST = "cc_host";
const BOOKER = "cc_booker";
const OTHER = "cc_other";
const LISTING = "L_cc";

/** A distinct 1-hour UTC window per booking so seeded rows never collide on the booking_no_overlap EXCLUDE. */
function windowAt(hourUtc: number): { startsAt: Date; endsAt: Date } {
  const h = String(hourUtc).padStart(2, "0");
  const h1 = String(hourUtc + 1).padStart(2, "0");
  return {
    startsAt: new Date(`2026-10-01T${h}:00:00.000Z`),
    endsAt: new Date(`2026-10-01T${h1}:00:00.000Z`),
  };
}

async function seedBooking(opts: {
  id: string;
  bookerId: string;
  status: "pending" | "confirmed";
  quotedTotalCents: number | null;
  expiresAtMs: number | null;
  hourUtc: number;
}): Promise<void> {
  const { startsAt, endsAt } = windowAt(opts.hourUtc);
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: LISTING,
    unit: 1,
    bookerId: opts.bookerId,
    startsAt,
    endsAt,
    status: opts.status,
    quotedTotalCents: opts.quotedTotalCents,
    currency: "php",
    expiresAt: opts.expiresAtMs != null ? new Date(opts.expiresAtMs) : null,
  });
}

async function readBooking(id: string) {
  const [row] = await testDb.db
    .select({ status: booking.status, expiresAt: booking.expiresAt })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: HOST, name: "CC Host", email: "cc_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "CC Booker", email: "cc_booker@example.com", firstName: "Booker" },
    { id: OTHER, name: "CC Other", email: "cc_other@example.com", firstName: "Other" },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "CC Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
  });

  vi.doMock("@/lib/auth", () => ({
    auth: {
      api: {
        getSession: async () => (session.userId ? { user: { id: session.userId } } : null),
      },
    },
  }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createRefund: mockPayMongo.createRefund,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
  }));
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
  ({ confirmBooking } = await import("@/app/actions/booking"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("next/cache");
  vi.doUnmock("next/navigation");
  await teardownTestDb(testDb);
});

describe("confirmBooking — Confirm & pay checkout (D-49/D-57/D-58)", () => {
  it("creates ONE checkout for the frozen quote, extends the hold, and redirects off-site WITHOUT flipping to confirmed", async () => {
    session.userId = BOOKER;
    const id = "bk_happy";
    await seedBooking({
      id,
      bookerId: BOOKER,
      status: "pending",
      quotedTotalCents: 150000,
      expiresAtMs: Date.now() + 2 * 60 * 1000, // near the 15-min TTL edge
      hourUtc: 2,
    });

    const url = await expectRedirect(confirmBooking(id));

    // Redirects to the hosted checkout URL (the mock's deterministic checkoutUrl), NOT to /bookings/[id].
    expect(url).toBe("https://checkout.paymongo.test/cs_test_123");

    // Exactly ONE checkout, charging the SERVER-FROZEN amount, keyed reference_number === booking id, with
    // the stable idempotency key checkout:<bookingId> (a double-click reuses the same session).
    expect(mockPayMongo.createCheckoutSession).toHaveBeenCalledTimes(1);
    const arg = mockPayMongo.createCheckoutSession.mock.calls[0][0] as {
      amountCents: number;
      referenceNumber: string;
      idempotencyKey: string;
      successUrl: string;
      cancelUrl: string;
    };
    expect(arg.amountCents).toBe(150000);
    expect(arg.referenceNumber).toBe(id);
    expect(arg.idempotencyKey).toBe(`checkout:${id}`);
    expect(arg.successUrl).toContain(`/bookings/${id}?paid=1`);

    // The sync flip is RETIRED (D-57): the row is STILL pending, and the hold has been EXTENDED past the
    // 15-min TTL toward now()+PAYMENT_WINDOW (default 60) — assert it moved well beyond the seeded 2 min.
    const row = await readBooking(id);
    expect(row.status).toBe("pending");
    expect(row.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 50 * 60 * 1000);
  });

  it("charge integrity: the mock receives the row's frozen quotedTotalCents, never any other number", async () => {
    session.userId = BOOKER;
    const id = "bk_charge";
    await seedBooking({
      id,
      bookerId: BOOKER,
      status: "pending",
      quotedTotalCents: 99900, // a DIFFERENT frozen amount — the charge must track the row, not a constant
      expiresAtMs: Date.now() + 2 * 60 * 1000,
      hourUtc: 8,
    });

    await expectRedirect(confirmBooking(id));

    expect(mockPayMongo.createCheckoutSession).toHaveBeenCalledTimes(1);
    const arg = mockPayMongo.createCheckoutSession.mock.calls[0][0] as { amountCents: number };
    expect(arg.amountCents).toBe(99900);
  });

  it("owner-gate: a different user cannot pay for someone else's hold — no checkout is created (T-05-13)", async () => {
    session.userId = OTHER;
    const id = "bk_own";
    await seedBooking({
      id,
      bookerId: BOOKER, // owned by BOOKER; OTHER attempts to confirm
      status: "pending",
      quotedTotalCents: 150000,
      expiresAtMs: Date.now() + 2 * 60 * 1000,
      hourUtc: 6,
    });

    const res = await confirmBooking(id);
    expect(res).toMatchObject({ ok: false, reason: "denied" });
    expect(mockPayMongo.createCheckoutSession).not.toHaveBeenCalled();

    // Untouched by the non-owner — still pending, hold NOT extended.
    const row = await readBooking(id);
    expect(row.status).toBe("pending");
  });

  it("idempotent: an already-confirmed OWN booking redirects to the confirmation with NO second checkout (D-42)", async () => {
    session.userId = BOOKER;
    const id = "bk_idem";
    await seedBooking({
      id,
      bookerId: BOOKER,
      status: "confirmed",
      quotedTotalCents: 150000,
      expiresAtMs: null,
      hourUtc: 4,
    });

    const url = await expectRedirect(confirmBooking(id));
    expect(url).toBe(`/bookings/${id}`);
    expect(mockPayMongo.createCheckoutSession).not.toHaveBeenCalled();
  });
});
