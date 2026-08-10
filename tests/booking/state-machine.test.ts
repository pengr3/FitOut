// Booking state machine (BOOK-01/02/03, D-40/D-41/D-42; updated for Phase-5 D-57/D-58) — placeHold +
// confirmBooking driven as the REAL server actions through the vi.doMock harness (mock next/headers,
// @/lib/auth, @/lib/db, @/lib/paymongo, next/cache, next/navigation → import the actions). Proves the
// transitions AFTER the D-57 rewrite (the synchronous pending→confirmed flip is RETIRED — the webhook is
// the confirm authority; the CHARGE integrity + extend-hold specifics live in tests/payments/checkout-create):
//   pending→(checkout)               — "Confirm & pay" extends the hold (D-58) + creates a hosted checkout
//                                       and redirects OFF-SITE; the booking STAYS 'pending' (D-57).
//   past-TTL pending→(extended)      — a lapsed-but-pending hold is EXTENDED, not refused (D-58).
//   owner-gate                       — a non-owner cannot pay for someone else's hold.
//   confirmed→confirmed (idempotent) — a re-confirm of the OWNER's already-confirmed booking is a no-op
//                                       redirect to the confirmation, with NO second checkout (D-42).
// Plus the placeHold gates: sign-in (D-41), !canBook activate-booking, and the deriveBookable server
// re-check (the route group is not the gate — Security V4).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION, EXECUTED 2026-08-06 (quick task 260806-gwt, TIER1-02). The pinned window this file used to
// carry ("2026-09-01T02:00Z") became derived; the mutation proves the conversion did NOT hollow the
// file. It targets what THIS file uniquely owns (the status transitions) on a case whose hold is placed
// through the DERIVED window (`place("L_exp")` → placeHold → createPendingHold, which would refuse a
// too-soon window outright):
//
//   src/app/actions/booking.ts: DELETE the D-58 extend UPDATE
//   (`SET expires_at = GREATEST(expires_at, now() + make_interval(mins => PAYMENT_WINDOW_MINUTES))`)
//     → "extend-hold: a lapsed-but-pending hold is EXTENDED (not refused)…" RED:
//       `AssertionError: expected false to be true // Object.is equality`
//       at `expect(future).toBe(true)` (line 228, over
//       `SELECT expires_at > now() AS future FROM booking WHERE id = ${holdId}`)
//       — the hold is no longer pushed forward, so the lazy-expiry sweep can take the slot out from
//       under a booker who is mid-payment. Exactly the D-58 failure this case exists to name.
//     → Matched the prediction exactly; no divergence. Restored by EDITING THE STATEMENT BACK.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CONFIRM-THEN-FIX, BRANCH A (quick task 260810-sti, Task 1) — the EXCLUSIVE half of audit finding #4.
// "A published, fully-payable listing with NO operating hours is refused server-side" was written FIRST
// against byte-unchanged `src/` and FAILED. Observed, verbatim:
//
//   × a published, fully-payable listing with NO operating hours is refused server-side — the CTA is not the gate
//   RedirectError: NEXT_REDIRECT:/listings/L_nohours/book?hold=4a7587c6-3901-4bc4-b8a2-f4ecd18df4f5
//    ❯ redirect tests/booking/state-machine.test.ts:181:13
//    ❯ placeHold src/app/actions/booking.ts:343:3
//    ❯ tests/booking/state-machine.test.ts:259:17
//
// Read the failure for what it is: this is not an assertion about a sentence coming back wrong. The
// action REDIRECTED, i.e. it MINTED A REAL HOLD (`hold=4a7587c6-…`) on a listing whose every date renders
// Closed, and marched the booker on to the reserve page and from there to a hosted checkout. The
// row-count assertion below never even ran. Fixed in Task 2 (hours became deriveBookable's fourth term).
//
// MUTATION M1, EXECUTED 2026-08-10 (260810-sti, Task 3) — src/lib/bookability.ts: DELETE
// `listing.hasOperatingHours &&` from the return. Restored by editing the term back.
//   → this case RED, and it is the SAME failure shape as the Task-1 confirmation, i.e. a real mint:
//     RedirectError: NEXT_REDIRECT:/listings/L_nohours/book?hold=4252ed65-2ac9-40f7-b7c1-22d0213c4bb5
//      ❯ tests/booking/state-machine.test.ts:276:17
//   → The finding condition held: the same single deletion also reddened `L_OPEN_NOHOURS` in
//     tests/booking/open-capacity-hold.test.ts, proving the two re-stated gates share ONE predicate.
//     (M1 reddened 5 cases in total — see tests/listing/bookability.test.ts's header for the full list,
//     including the one the plan did not predict.)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { venueWindow, assertBookableWindow } from "../helpers/dates";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, hostPayout, booking, operatingHours } from "@/lib/db/schema";

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

// A DERIVED future window — never a calendar literal (DEF-IR9-01; see @tests/helpers/dates.ts). The
// literal that used to sit here ("2026-09-01T02:00Z") was one of the two Tier-1 sites fused to fire on
// the same day: placeHold reaches createPendingHold, whose D-96 lead-time guard is SQL evaluated against
// POSTGRES's now() — the JS clock can be frozen, the DB clock cannot. Venue-local hour 10 IS 02:00Z in
// Asia/Manila, so this is the same window it always was.
// Absolute UTC — createPendingHold works on instants; per-listing so windows on distinct listings never
// collide on the booking_no_overlap EXCLUDE. No `weekday` is needed: the WRITE PATH still does not
// consult operating hours, so the window can land on any day of the week.
//
// ⚠️ WHAT CHANGED (260810-sti). This file used to seed NO operating_hours at all, on the strength of that
// same "the write path does not consult them" reasoning. Still true of the write path — but the
// BOOKABILITY GATE now consults them: hours are the fourth term of deriveBookable, so a published,
// payout-activated listing with an empty calendar is refused before `createPendingHold` is ever reached.
// `seedBookableListing` therefore gives every listing it makes a full week of hours (any weekday the
// derived window lands on is covered), and `L_nohours` below is the deliberate exception.
const W = venueWindow({ hour: 10, minDaysOut: 3 });
const START = W.startUtc;
const END = W.endUtc;

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
  // The FOURTH deriveBookable term (260810-sti). All 7 weekdays, so the derived window W can land on any
  // day without the gate refusing for a reason this file is not about. Withhold these and every placeHold
  // case in the file returns `not-bookable` — which is precisely what `L_nohours` proves on purpose.
  await testDb.db.insert(operatingHours).values(
    Array.from({ length: 7 }, (_, dow) => ({
      id: `oh_sm_${id}_${dow}`,
      listingId: id,
      dayOfWeek: dow,
      openTime: "06:00:00",
      closeTime: "22:00:00",
    })),
  );
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
  assertBookableWindow(W); // assert the derivation, don't assume it — a loud setup failure here beats a
  // confusing placeHold rejection deep in a transition case.
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
  // D-57: confirmBooking now calls createCheckoutSession — mock @/lib/paymongo so no live checkout is made.
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

  // L_nohours — identical to a `seedBookableListing` row in EVERY respect that could refuse a sale
  // (published, the SAME verified + payout-activated HOST, a real hourly rate, one unit), and failing on
  // HOURS AND NOTHING ELSE. Inserted directly rather than through the helper precisely because the helper
  // now adds the week of hours this fixture must NOT have. Sharing the host with L_happy is what makes
  // the pair diagnostic: the two listings differ in exactly one input.
  await testDb.db.insert(listing).values({
    id: "L_nohours",
    hostId: HOST,
    title: "Live but with an empty calendar",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
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

  it("a published, fully-payable listing with NO operating hours is refused server-side — the CTA is not the gate", async () => {
    // T-STI-01. The booker-facing CTA on an hours-less listing is already inert, but the CTA is a
    // courtesy, never the gate (Security V4): this asserts what happens when the reserve route is reached
    // by hand-typing the URL or by replaying a stale form POST. The listing is published and its host is
    // fully payable — the ONLY thing wrong with it is an empty calendar.
    await login(BOOKER_EMAIL);
    const res = await placeHold({ listingId: "L_nohours", startUtc: START, endUtc: END, fullDay: false });
    expect(res).toMatchObject({ ok: false, reason: "not-bookable" });
    const [{ n }] = await testDb.client`SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_nohours'`;
    expect(n).toBe(0); // the refusal ran BEFORE the hold, not after it
  });
});

describe("confirmBooking — Confirm & pay (D-57/D-58; charge integrity in tests/payments/checkout-create)", () => {
  it("happy path: Book (canBook) places a hold (POST) → reserve page, then Confirm & pay creates a checkout and redirects OFF-SITE — the booking STAYS pending (D-57)", async () => {
    await login(BOOKER_EMAIL);
    const url = await expectRedirect(placeHold({ listingId: "L_happy", startUtc: START, endUtc: END, fullDay: false }));
    expect(url).toMatch(/^\/listings\/L_happy\/book\?hold=/);
    const holdId = new URL(url, "http://t").searchParams.get("hold")!;
    expect(await statusOf(holdId)).toBe("pending");

    // D-57: confirm no longer flips synchronously — it redirects to the hosted checkout (mock URL) and the
    // booking is STILL pending (the checkout_session.payment.paid webhook is the sole confirm authority).
    const confirmUrl = await expectRedirect(confirmBooking(holdId));
    expect(confirmUrl).toBe("https://checkout.paymongo.test/cs_test_123");
    expect(await statusOf(holdId)).toBe("pending"); // NOT flipped here — Plan 04's webhook confirms
  });

  it("extend-hold: a lapsed-but-pending hold is EXTENDED (not refused) so the sweep can't take the slot mid-payment (D-58)", async () => {
    await login(BOOKER_EMAIL);
    const holdId = await place("L_exp");
    // Force the hold past its TTL vs the DB clock. The Phase-4 expiry-refusal is RETIRED — confirm extends.
    await testDb.db.execute(sql`UPDATE booking SET expires_at = now() - interval '1 minute' WHERE id = ${holdId}`);

    const confirmUrl = await expectRedirect(confirmBooking(holdId));
    expect(confirmUrl).toBe("https://checkout.paymongo.test/cs_test_123"); // creates the checkout, not refused
    expect(await statusOf(holdId)).toBe("pending"); // still pending — the webhook confirms
    // The hold was pushed back into the future (now()+PAYMENT_WINDOW), no longer in the past.
    const [{ future }] = await testDb.client<{ future: boolean }[]>`
      SELECT expires_at > now() AS future FROM booking WHERE id = ${holdId}`;
    expect(future).toBe(true);
  });

  it("owner-gate: a different user cannot pay for someone else's hold — no checkout is created", async () => {
    await login(BOOKER_EMAIL);
    const holdId = await place("L_own");

    mockPayMongo.createCheckoutSession.mockClear();
    await login(BOOKER2_EMAIL); // a DIFFERENT booker
    const res = await confirmBooking(holdId);
    expect(res).toMatchObject({ ok: false, reason: "denied" });
    expect(mockPayMongo.createCheckoutSession).not.toHaveBeenCalled();
    expect(await statusOf(holdId)).toBe("pending"); // untouched by the non-owner
  });

  it("idempotent re-confirm: a confirm of the OWNER's already-confirmed booking is a no-op redirect to the confirmation, with NO second checkout (D-42)", async () => {
    await login(BOOKER_EMAIL);
    const holdId = await place("L_idem");
    // The webhook (Plan 04) is what confirms; simulate that terminal state directly, then re-confirm.
    await testDb.db.execute(sql`UPDATE booking SET status = 'confirmed', expires_at = NULL WHERE id = ${holdId}`);

    mockPayMongo.createCheckoutSession.mockClear();
    const url = await expectRedirect(confirmBooking(holdId));
    expect(url).toBe(`/bookings/${holdId}`); // no-op success → the confirmation, NOT a new checkout
    expect(mockPayMongo.createCheckoutSession).not.toHaveBeenCalled();
    expect(await statusOf(holdId)).toBe("confirmed");

    const [{ n }] = await testDb.client`SELECT count(*)::int AS n FROM booking WHERE id = ${holdId}`;
    expect(n).toBe(1); // still exactly one booking — the re-confirm never created a second
  });
});
