// D-97 one-click re-request — the six invariants the lapse-recovery path rests on (07-12).
//
// WHAT THIS FILE IS REALLY GUARDING. D-97 hands a booker a button that mints a fresh hold on a window they
// already lost once. That is a booking mutation reachable from a TERMINAL row, which is exactly the shape of
// thing that goes wrong quietly: a status flip that resurrects a cancelled booking back into the occupancy
// set, a path that skips the lead-time guard because "it was already validated once", a double-click that
// mints two holds and spams the host. So the cases below pin, in order: that a NEW row is inserted and the
// ORIGINAL is untouched; that the exclusion constraint still arbitrates; that the mode-scoped lead-time guard
// still applies; that the owner gate is not an oracle; that a live booking is not resendable; and that the
// spam budget is consulted before any of it.
//
// Harness: the REAL reRequestSameWindow driven through the vi.doMock idiom (mock next/headers, @/lib/auth,
// @/lib/db, next/cache, @/inngest/client, @/lib/rate-limit → import the action) against an isolated schema.
// Cloned from tests/booking/cancellation.test.ts.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { and, eq, ne } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user, listing, booking } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { MIN_LEAD_REQUEST_HOURS } from "@/lib/payments/config";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const HOST_EMAIL = "rr_host@example.com";
const BOOKER_EMAIL = "rr_booker@example.com";
const RIVAL_EMAIL = "rr_rival@example.com";
const PASSWORD = "averylongpassword";
const HOURLY = 100000; // ₱1,000 for a 1h window
const DAY_RATE = 300000;
const SERVICE_FEE = 5000;

/**
 * The SHIPPED conflict message, from `mapBookingError` (src/lib/availability/units.ts). Asserted as a
 * CONSTANT rather than a regex because the whole point of the case is that re-request introduces NO new error
 * vocabulary — it reuses the Phase-3/4 language every other losing booker already sees.
 *
 * ⚠️ The 07-12 plan's prose quotes this string as "That slot was just taken." That is a misquote of the
 * shipped copy, and the plan's own instruction in the same sentence is the binding one: reuse the existing
 * message, do not add a new vocabulary. So the literal below is what the code actually returns, verified
 * against units.ts, and this file deliberately does not introduce the plan's variant anywhere.
 */
const JUST_TAKEN = "That time was just taken. Pick another slot.";

/** The SHIPPED request-mode lead-time refusal, from createPendingHold's `leadError`. */
const TOO_SOON =
  "That start time is too soon to request — this host needs a few hours' notice. Pick a later time.";

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the client. */
type NotifyEnvelope = { name: string; data: { type: string; recipientId: string; bookingId: string | null } };
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

/**
 * The rate limiter, stubbed — but with a REAL counting budget behind a switch.
 *
 * Two reasons it is a stub at all: the production limiter is a module-level Map, so a dozen calls by one
 * seeded booker would exhaust it and every case after the fifth would assert against a rate-limit denial
 * rather than the behaviour it names; and a stub makes the budget OBSERVABLE, so case (6) can assert the
 * action consults the limiter with the right KEY and the right NUMBERS, which spying on the real one cannot.
 *
 * The counter exists so case (6) can exercise "the sixth call" literally rather than by flipping a boolean.
 * It is OFF by default; `tests/security/rate-limit.test.ts` covers the real limiter's own arithmetic.
 */
const rateLimitCalls: Array<{ key: string; opts: RateLimitOptions }> = [];
const rateLimitCounts = new Map<string, number>();
let rateLimitEnforced = false;
const fakeRateLimit = (key: string, opts: RateLimitOptions): RateLimitResult => {
  rateLimitCalls.push({ key, opts });
  if (!rateLimitEnforced) return { ok: true };
  const n = (rateLimitCounts.get(key) ?? 0) + 1;
  rateLimitCounts.set(key, n);
  return n <= opts.max ? { ok: true } : { ok: false, retryAfter: 42 };
};

let testDb: TestDb;
let testAuth: TestAuth;
type ReRequestActions = typeof import("@/app/actions/re-request");
let reRequestSameWindow: ReRequestActions["reRequestSameWindow"];

let hostId: string;
let bookerId: string;
let rivalId: string;

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** A dedicated request-mode listing per case, so seeded rows never collide on booking_no_overlap. */
async function seedListing(id: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    bookingMode: "request",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
    cancellationPolicy: "standard",
  });
}

/**
 * Seed a LAPSED approval: the exact row shape the request-expiry cron leaves behind when an approved hold's
 * payment window closes — `cancelled`, `expires_at` CLEARED, no `cancelled_by` (nobody chose this), no
 * payment id (nothing was ever charged, D-63). Getting this shape right is most of the fixture's value: a row
 * that carried a `cancelled_by` would be a party cancellation and must NOT be resendable.
 */
async function seedLapsedApproval(
  id: string,
  listingId: string,
  msToStart: number,
  opts: { bookerId?: string } = {},
): Promise<{ startsAt: Date; endsAt: Date }> {
  const base = await readDbNow(testDb.db);
  const startsAt = new Date(base.getTime() + msToStart);
  const endsAt = new Date(startsAt.getTime() + HOUR);
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId: opts.bookerId ?? bookerId,
    startsAt,
    endsAt,
    status: "cancelled",
    bookingMode: "request",
    cancellationPolicy: "standard",
    spacePriceCents: HOURLY,
    serviceFeeCents: SERVICE_FEE,
    quotedTotalCents: HOURLY + SERVICE_FEE,
    currency: "php",
    expiresAt: null,
    cancelledBy: null,
    paymentId: null,
  });
  return { startsAt, endsAt };
}

/** Every booking on a listing other than the named source row — i.e. everything a re-request created. */
async function newRowsOn(listingId: string, sourceId: string) {
  return testDb.db
    .select({
      id: booking.id,
      status: booking.status,
      listingId: booking.listingId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      bookerId: booking.bookerId,
      bookingMode: booking.bookingMode,
    })
    .from(booking)
    .where(and(eq(booking.listingId, listingId), ne(booking.id, sourceId)));
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      expiresAt: booking.expiresAt,
      cancelledBy: booking.cancelledBy,
      cancelledAt: booking.cancelledAt,
      refundCents: booking.refundCents,
      quotedTotalCents: booking.quotedTotalCents,
      spacePriceCents: booking.spacePriceCents,
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
    name: "RR Host",
    firstName: "RRHost",
    intent: "host",
  });
  for (const [email, name] of [
    [BOOKER_EMAIL, "Cassie"],
    [RIVAL_EMAIL, "Rival"],
  ]) {
    await signUp(testAuth, { email, password: PASSWORD, name, firstName: name, intent: "book" });
  }
  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((u) => u.email === HOST_EMAIL)!.id;
  bookerId = ids.find((u) => u.email === BOOKER_EMAIL)!.id;
  rivalId = ids.find((u) => u.email === RIVAL_EMAIL)!.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.resetModules();
  ({ reRequestSameWindow } = await import("@/app/actions/re-request"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
  rateLimitCalls.length = 0;
  rateLimitCounts.clear();
  rateLimitEnforced = false;
});

describe("reRequestSameWindow — the D-97 lapse-recovery invariants", () => {
  it("(1) happy path: a NEW `requested` row on the same window, and the original row untouched", async () => {
    await seedListing("L_rr_happy");
    const { startsAt, endsAt } = await seedLapsedApproval("bk_rr_happy", "L_rr_happy", 30 * HOUR);
    const before = await readRow("bk_rr_happy");

    await login(BOOKER_EMAIL);
    const res = await reRequestSameWindow("bk_rr_happy");

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected the re-request to succeed");
    // A DIFFERENT id. This is the whole structural claim of the feature: the source row was not flipped back
    // into a live status, it was left alone and a fresh row was inserted beside it.
    expect(res.bookingId).not.toBe("bk_rr_happy");

    const created = await newRowsOn("L_rr_happy", "bk_rr_happy");
    expect(created).toHaveLength(1);
    expect(created[0].id).toBe(res.bookingId);
    expect(created[0].status).toBe("requested");
    expect(created[0].bookingMode).toBe("request");
    expect(created[0].bookerId).toBe(bookerId);
    // The SAME window, to the millisecond — "same space, same time" is the promise the copy makes.
    expect(created[0].startsAt.getTime()).toBe(startsAt.getTime());
    expect(created[0].endsAt.getTime()).toBe(endsAt.getTime());

    // T-07-72: the original is BYTE-FOR-BYTE what it was. Its refund columns, its terminal status and its
    // cleared expiry are all untouched, so a re-request can never be a route back through a cancellation.
    expect(await readRow("bk_rr_happy")).toEqual(before);

    // The host is told, because a request nobody is told about is a request that silently expires (D-91).
    const toHost = inngestSend.mock.calls
      .map((c) => c[0])
      .filter((e) => e.name === "fitout/notify" && e.data.type === "new_request_to_host");
    expect(toHost).toHaveLength(1);
    expect(toHost[0].data.recipientId).toBe(hostId);
    expect(toHost[0].data.bookingId).toBe(res.bookingId);
  });

  it("(1b) a double-submit is idempotent — the second call replays the same hold, never a second one", async () => {
    // The realistic failure this guards: an impatient double-click on the recovery CTA minting two requests
    // and sending the host the same booking twice. `createPendingHold`'s D-42 own-hold pre-check matches an
    // ACTIVE hold of this booker on this exact window, so the second submit returns the FIRST hold's id.
    await seedListing("L_rr_idem");
    await seedLapsedApproval("bk_rr_idem", "L_rr_idem", 30 * HOUR);

    await login(BOOKER_EMAIL);
    const first = await reRequestSameWindow("bk_rr_idem");
    const second = await reRequestSameWindow("bk_rr_idem");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("both submits must succeed");
    expect(second.bookingId).toBe(first.bookingId);

    // ONE new row, not two — the assertion the id equality above is only evidence for.
    const created = await newRowsOn("L_rr_idem", "bk_rr_idem");
    expect(created).toHaveLength(1);

    // And the host was told ONCE. A replay emits nothing: the first submit already told both sides.
    const toHost = inngestSend.mock.calls
      .map((c) => c[0])
      .filter((e) => e.name === "fitout/notify" && e.data.type === "new_request_to_host");
    expect(toHost).toHaveLength(1);
  });

  it("(2) slot taken since the lapse: the SHIPPED conflict message, and no row created", async () => {
    // The race D-97's render-time availability check cannot close and is not meant to: the slot goes between
    // the page render and the submit. The EXCLUDE constraint is the sole authority, and it must produce the
    // SAME calm sentence every other losing booker gets — not a crash, and not a silent success.
    await seedListing("L_rr_taken");
    const { startsAt, endsAt } = await seedLapsedApproval("bk_rr_taken", "L_rr_taken", 30 * HOUR);

    // A RIVAL booker now occupies the window. It must be a different booker: the same booker's own confirmed
    // booking would (correctly) be replayed by the D-42 own-hold check rather than rejected.
    await testDb.db.insert(booking).values({
      id: "bk_rr_rival",
      listingId: "L_rr_taken",
      unit: 1,
      bookerId: rivalId,
      startsAt,
      endsAt,
      status: "confirmed",
      bookingMode: "instant",
      spacePriceCents: HOURLY,
      serviceFeeCents: SERVICE_FEE,
      quotedTotalCents: HOURLY + SERVICE_FEE,
      currency: "php",
    });

    await login(BOOKER_EMAIL);
    const res = await reRequestSameWindow("bk_rr_taken");

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected a conflict");
    expect(res.error).toBe(JUST_TAKEN);

    // Nothing was minted, and the rival's booking is untouched.
    const created = await newRowsOn("L_rr_taken", "bk_rr_taken");
    expect(created.map((r) => r.id)).toEqual(["bk_rr_rival"]);
    expect((await readRow("bk_rr_rival")).status).toBe("confirmed");
    expect((await readRow("bk_rr_taken")).status).toBe("cancelled");
  });

  it("(3) the lead-time guard still applies — re-request is not a bypass", async () => {
    // T-07-70. A window inside MIN_LEAD_REQUEST_HOURS is refused by createPendingHold's server-side guard,
    // evaluated in-transaction against the DB clock. The action supplies no override and knows no bypass, so
    // "it was already validated once, when the first request was made" is never true here.
    await seedListing("L_rr_lead");
    await seedLapsedApproval("bk_rr_lead", "L_rr_lead", 30 * MIN);
    expect(30 * MIN).toBeLessThan(MIN_LEAD_REQUEST_HOURS * HOUR); // fixture sanity

    await login(BOOKER_EMAIL);
    const res = await reRequestSameWindow("bk_rr_lead");

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected the lead-time refusal");
    expect(res.error).toBe(TOO_SOON);
    expect(await newRowsOn("L_rr_lead", "bk_rr_lead")).toHaveLength(0);
  });

  it("(4) owner gate: a cross-user id and a missing id return the IDENTICAL string", async () => {
    // T-07-69. Byte equality between the two denials, not each against a literal: a denial that DIFFERED
    // would tell an attacker walking booking ids which ones name a real reservation.
    await seedListing("L_rr_owner");
    await seedLapsedApproval("bk_rr_owner", "L_rr_owner", 30 * HOUR, { bookerId: rivalId });

    await login(BOOKER_EMAIL);
    const crossUser = await reRequestSameWindow("bk_rr_owner");
    const missing = await reRequestSameWindow("bk_rr_does_not_exist");

    expect(crossUser.ok).toBe(false);
    expect(missing.ok).toBe(false);
    if (crossUser.ok || missing.ok) throw new Error("both calls must be denials");
    expect(crossUser.error).toBe(missing.error);
    expect(crossUser.error).toMatch(/couldn't find that booking, or it isn't yours/i);

    // The stranger's row is untouched and nothing was minted on their listing.
    expect((await readRow("bk_rr_owner")).status).toBe("cancelled");
    expect(await newRowsOn("L_rr_owner", "bk_rr_owner")).toHaveLength(0);

    // THE POSITIVE CONTROL. Without it this case would pass against an action hardcoded to return DENIED —
    // it is what makes the two denials above mean "the gate rejects strangers" rather than "it rejects
    // everyone". The rival owns that booking, so the rival can resend it.
    await login(RIVAL_EMAIL);
    const owner = await reRequestSameWindow("bk_rr_owner");
    expect(owner.ok).toBe(true);
    if (!owner.ok) throw new Error("the owner must be able to resend their own lapsed request");
    expect(await newRowsOn("L_rr_owner", "bk_rr_owner")).toHaveLength(1);
  });

  it("(5) a LIVE booking is not resendable — the lapse guard, not just the status", async () => {
    // An `approved` hold whose window has not closed is still payable; offering to resend it would mint a
    // SECOND hold on a slot the booker already holds. The guard is the calm message, never a throw.
    await seedListing("L_rr_live");
    const base = await readDbNow(testDb.db);
    const startsAt = new Date(base.getTime() + 30 * HOUR);
    await testDb.db.insert(booking).values({
      id: "bk_rr_live",
      listingId: "L_rr_live",
      unit: 1,
      bookerId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      status: "approved",
      bookingMode: "request",
      cancellationPolicy: "standard",
      spacePriceCents: HOURLY,
      serviceFeeCents: SERVICE_FEE,
      quotedTotalCents: HOURLY + SERVICE_FEE,
      currency: "php",
      expiresAt: new Date(base.getTime() + 12 * HOUR), // still well inside its payment window
    });

    await login(BOOKER_EMAIL);
    const res = await reRequestSameWindow("bk_rr_live");

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected the not-resendable refusal");
    expect(res.error).toMatch(/no longer available to resend/i);
    expect(await newRowsOn("L_rr_live", "bk_rr_live")).toHaveLength(0);
    expect((await readRow("bk_rr_live")).status).toBe("approved"); // untouched
  });

  it("(7 · WR-06) an hourly re-request after a host RATE EDIT stays hourly — never repriced at the day rate", async () => {
    // THE GAP (07-REVIEW WR-06): fullDay was re-derived as `spaceCents !== currentHourlyRate × hours`.
    // The frozen spaceCents was priced at the rate in force at the ORIGINAL booking, so ANY hourly-rate
    // edit since fails the equality, flips fullDay true, and the "one-click, nothing to re-enter"
    // recovery flow silently mints a request at the flat DAY rate — ₱3,000 for a ₱1,000 hourly window,
    // which the host may approve. The derivation is PRICE-DETERMINING here, not display-only.
    await seedListing("L_rr_rate_edit");
    await seedLapsedApproval("bk_rr_rate_edit", "L_rr_rate_edit", 30 * HOUR); // frozen at HOURLY × 1h
    const NEW_HOURLY = 120000; // the host's rate edit — any value ≠ the frozen 100000 triggers the bug
    await testDb.db
      .update(listing)
      .set({ hourlyRateCents: NEW_HOURLY })
      .where(eq(listing.id, "L_rr_rate_edit"));

    await login(BOOKER_EMAIL);
    const res = await reRequestSameWindow("bk_rr_rate_edit");
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected the re-request to succeed");

    // The NEW row's PERSISTED money fields — hourly pricing at the CURRENT rate (rate × 1h), and
    // emphatically NOT the flat day rate the inequality derivation would have minted.
    const row = await readRow(res.bookingId);
    expect(row.spacePriceCents).toBe(NEW_HOURLY);
    expect(row.spacePriceCents).not.toBe(DAY_RATE);
  });

  it("(7b · WR-06 positive control) a GENUINE full-day re-request stays full-day priced", async () => {
    // The other direction, so the fix cannot overcorrect into repricing real full-day holds as hourly.
    // full_day = true is the persisted creation-time snapshot (0016); a 6h window makes the day rate
    // (₱3,000) distinguishable from hourly × hours (₱6,000), so this can only pass via the day-rate
    // formula — at CURRENT rates, which is what a re-request is defined to re-freeze.
    await seedListing("L_rr_fullday");
    const base = await readDbNow(testDb.db);
    const startsAt = new Date(base.getTime() + 30 * HOUR);
    const endsAt = new Date(startsAt.getTime() + 6 * HOUR);
    await testDb.db.insert(booking).values({
      id: "bk_rr_fullday",
      listingId: "L_rr_fullday",
      unit: 1,
      bookerId,
      startsAt,
      endsAt,
      status: "cancelled",
      bookingMode: "request",
      cancellationPolicy: "standard",
      fullDay: true,
      spacePriceCents: DAY_RATE,
      serviceFeeCents: SERVICE_FEE,
      quotedTotalCents: DAY_RATE + SERVICE_FEE,
      currency: "php",
      expiresAt: null,
      cancelledBy: null,
      paymentId: null,
    });

    await login(BOOKER_EMAIL);
    const res = await reRequestSameWindow("bk_rr_fullday");
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected the full-day re-request to succeed");

    const row = await readRow(res.bookingId);
    expect(row.spacePriceCents).toBe(DAY_RATE); // the day-rate formula, honoured
    expect(row.spacePriceCents).not.toBe(HOURLY * 6); // NOT silently re-derived as hourly
  });

  it("(6) rate limit: the sixth call in the window is refused, and the denial is audited", async () => {
    // T-07-73 — the mitigation for re-request spam against a host. The budget is consulted BEFORE the lapse
    // guard, which is why the first five calls below can target a live (non-resendable) booking: they each
    // consume budget and mint nothing, so the sixth exercises the limiter and only the limiter.
    await seedListing("L_rr_limit");
    const base = await readDbNow(testDb.db);
    const startsAt = new Date(base.getTime() + 30 * HOUR);
    await testDb.db.insert(booking).values({
      id: "bk_rr_limit",
      listingId: "L_rr_limit",
      unit: 1,
      bookerId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      status: "approved",
      bookingMode: "request",
      spacePriceCents: HOURLY,
      serviceFeeCents: SERVICE_FEE,
      quotedTotalCents: HOURLY + SERVICE_FEE,
      currency: "php",
      expiresAt: new Date(base.getTime() + 12 * HOUR),
    });

    const audit = vi.spyOn(console, "info").mockImplementation(() => {});
    rateLimitEnforced = true;
    await login(BOOKER_EMAIL);

    try {
      for (let i = 0; i < 5; i++) {
        const res = await reRequestSameWindow("bk_rr_limit");
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.error).toMatch(/no longer available to resend/i); // budget spent, not refused
      }

      const sixth = await reRequestSameWindow("bk_rr_limit");
      expect(sixth.ok).toBe(false);
      if (sixth.ok) throw new Error("the sixth call must be rate-limited");
      expect(sixth.error).toMatch(/going a little fast/i);

      // The budget is per IDENTITY and money-adjacent-sized (5 per 60s), matching approve / cancel.
      const mine = rateLimitCalls.filter((c) => c.key === `re-request:${bookerId}`);
      expect(mine).toHaveLength(6);
      expect(mine[0].opts).toEqual({ window: 60, max: 5 });

      // The denial is AUDITED — a rate-limit refusal that left no trace would be non-repudiable by absence.
      const audited = audit.mock.calls
        .filter((c) => c[0] === "[audit]")
        .map((c) => JSON.parse(String(c[1])) as { action: string; outcome: string; meta?: { reason?: string } });
      expect(
        audited.some(
          (e) =>
            e.action === "re_request_booking" &&
            e.outcome === "denied" &&
            e.meta?.reason === "rate_limit",
        ),
      ).toBe(true);
    } finally {
      audit.mockRestore();
      rateLimitEnforced = false;
    }

    expect(await newRowsOn("L_rr_limit", "bk_rr_limit")).toHaveLength(0);
  });
});