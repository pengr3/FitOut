// D-72 — the collect-and-never-store InstaPay refund path (07-16 Task 3, Branch B).
//
// QRPh cannot be API-refunded (settled 2026-07-23 by observed API behaviour — the verdict and raw
// evidence live in src/lib/payments/refund-rail.ts), so a booker cancelling a QRPh booking supplies a
// bank/e-wallet destination that passes STRAIGHT THROUGH to POST /v2/batch_transfers and is NEVER
// persisted — only the transfer id and a masked last-4 survive, in the audit trail.
//
// HARNESS. The real cancelBookingAsBooker against an isolated schema (the cancellation.test.ts idiom) —
// but, unlike every sibling file, `@/lib/paymongo` is NOT mocked. The REAL module runs against a stubbed
// global fetch that intercepts api.paymongo.com, because three of the properties below live only at the
// HTTP level: the transfer's `provider`, its `Idempotency-Key` namespace, and its rotating
// `reference_number`. A module mock would assert what the action PASSED, not what PayMongo would RECEIVE.
//
// THE POSITIVE-MOVEMENT RULE (inherited hazard): case (1) captures the actual transfer POST and pins its
// provider, amount and `refund:` key — so every "no transfer fired" bound in the later cases is meaningful
// rather than vacuously green.
//
// OWNER-GATE MUTATION (case 7, verified during execution): removing the pre-read booker gate in
// loadOwnedBooking flips the cross-user denial from DENIED to the 0-row NOT_ACTIVE message — case (7)'s
// byte-exact denial assertion goes red — while the in-WHERE booker scope still blocks the write. The
// positive control (the owner CAN cancel with a destination, cases 1 and 7b) is what stops a
// deny-everything implementation from passing.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user, listing, booking } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import type { QrphRefundDestination } from "@/lib/validation/qrph-refund";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const HOST_EMAIL = "ir_host@example.com";
const BOOKER_EMAIL = "ir_booker@example.com";
const PASSWORD = "averylongpassword";
const HOURLY = 100000; // ₱1,000 space price for a 1h window
const DAY_RATE = 300000;
const SERVICE_FEE = 5000; // ₱50

/** The destination fixture the booker "types". Its exact strings are what tests 3/4 scan for. */
const DEST: QrphRefundDestination = {
  institutionBic: "TESTPHM1XXX",
  accountName: "Juan Dela Cruz",
  accountNumber: "001122334455",
};
const MASKED_LAST4 = "••••4455";

// ---------------------------------------------------------------------------------------------------------
// The PayMongo fetch interceptor. Real src/lib/paymongo.ts code builds the requests; this stub is the wire.
// ---------------------------------------------------------------------------------------------------------
type CapturedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
};
let paymongoRequests: CapturedRequest[] = [];
let transferMode: "ok" | "fail" = "ok";
let institutionsMode: "ok" | "notfound" = "ok";
let transferCounter = 0;

const realFetch = globalThis.fetch;

async function fetchInterceptor(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  if (!url.startsWith("https://api.paymongo.com")) return realFetch(input, init);

  const method = init?.method ?? "GET";
  const headers = { ...((init?.headers ?? {}) as Record<string, string>) };
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  paymongoRequests.push({ url, method, headers, body });

  if (url.includes("/v2/transfers/receiving_institutions")) {
    if (institutionsMode === "notfound") {
      // The OBSERVED live behaviour (2026-07-23) until PayMongo enables Money Movement — see refund-rail.ts.
      return new Response(
        JSON.stringify({
          errors: [{ code: "not_found", detail: "failed to get transfer: resource not found" }],
        }),
        { status: 404 },
      );
    }
    return new Response(
      JSON.stringify({
        data: [
          { attributes: { name: "Test Bank", bic: DEST.institutionBic } },
          { attributes: { name: "Other Bank", bic: "OTHRPHM2XXX" } },
        ],
      }),
      { status: 200 },
    );
  }

  if (url.endsWith("/v2/batch_transfers") && method === "POST") {
    if (transferMode === "fail") {
      // The WORST-CASE echo: the provider's error detail repeats the destination back. If the action ever
      // logs the raw error, the no-leakage case (4) goes red — this echo is what makes it genuinely fallible.
      const dst = body?.transfers?.[0]?.destination_account ?? {};
      return new Response(
        JSON.stringify({
          errors: [
            { code: "processing_error", detail: `transfer to ${dst.number} (${dst.name}) failed` },
          ],
        }),
        { status: 500 },
      );
    }
    transferCounter += 1;
    return new Response(
      JSON.stringify({
        data: {
          id: `batch_${transferCounter}`,
          attributes: { transfers: [{ id: `tr_refund_${transferCounter}`, status: "pending" }] },
        },
      }),
      { status: 200 },
    );
  }

  if (url.endsWith("/v1/refunds") && method === "POST") {
    return new Response(
      JSON.stringify({ data: { id: "ref_live_1", attributes: { status: "pending" } } }),
      { status: 200 },
    );
  }

  throw new Error(`Unexpected PayMongo call in test: ${method} ${url}`);
}

/** Every POST the suite fired at /v2/batch_transfers. */
const transferPosts = () => paymongoRequests.filter((r) => r.url.endsWith("/v2/batch_transfers"));

// ---------------------------------------------------------------------------------------------------------
// Session / module harness (the cancellation.test.ts idiom).
// ---------------------------------------------------------------------------------------------------------
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

type NotifyEnvelope = {
  name: string;
  data: { type: string; recipientId: string; bookingId: string | null; payload?: unknown };
};
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

const rateLimitCalls: Array<{ key: string; opts: RateLimitOptions }> = [];
const fakeRateLimit = (key: string, opts: RateLimitOptions): RateLimitResult => {
  rateLimitCalls.push({ key, opts });
  return { ok: true };
};

let testDb: TestDb;
let testAuth: TestAuth;
type CancelActions = typeof import("@/app/actions/cancel-booking");
type PayMongoModule = typeof import("@/lib/paymongo");
type RefundDispatchModule = typeof import("@/lib/booking/refund-dispatch");
let cancelBookingAsBooker: CancelActions["cancelBookingAsBooker"];
let createRefundTransfer: PayMongoModule["createRefundTransfer"];
/**
 * ⚠ PLAN 13-18 — THE READER THAT REPLACED `res.notice`, IMPORTED THROUGH THE SAME `vi.doMock` CURTAIN
 * as the action so it reads the test schema's `audit` table and not the app singleton's.
 *
 * Three cases below used to assert that the booker was TOLD by reading a `notice` string off the
 * action's return value. The PROPERTY they were defending — "the booker is told, and is not left to
 * infer" — is unchanged and is still asserted; what changed is WHERE the telling happens. A string
 * returned to a client that immediately navigates away could only ever land on a toast, which is the
 * one surface STATE-08 forbids for a fact this must-read. The sentence is now durable page content on
 * `/bookings/{id}`, derived from the very `needs_attention` rows each case below already asserts, and
 * this predicate is the seam between them.
 */
let refundNeedsManualReturn: RefundDispatchModule["refundNeedsManualReturn"];

let hostId: string;
let bookerId: string;

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
    dayRateCents: DAY_RATE,
    cancellationPolicy: "standard",
  });
}

/** Seed a QRPh-paid confirmed booking `msToStart` from the DB clock. */
async function seedQrphBooking(
  id: string,
  listingId: string,
  msToStart: number,
  opts: { spacePriceCents?: number; serviceFeeCents?: number } = {},
): Promise<void> {
  const base = await readDbNow(testDb.db);
  const startsAt = new Date(base.getTime() + msToStart);
  const space = opts.spacePriceCents ?? HOURLY;
  const fee = opts.serviceFeeCents ?? SERVICE_FEE;
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR),
    status: "confirmed",
    bookingMode: "instant",
    cancellationPolicy: "standard",
    spacePriceCents: space,
    serviceFeeCents: fee,
    quotedTotalCents: space + fee,
    currency: "php",
    paymentId: `pay_${id}`,
    paymentMethod: "qrph", // the rail the whole file exists for
  });
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      refundCents: booking.refundCents,
      retainedSpaceCents: booking.retainedSpaceCents,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/**
 * The FULL booking row as TEXT (to_jsonb → text), for the no-persistence scan. A text projection is
 * deliberately safe under the RawBookingRow contract — nothing here is hydrated into a Date.
 */
async function readRowAsText(id: string): Promise<string> {
  const rows = (await testDb.db.execute(
    sql`SELECT to_jsonb(b)::text AS "rowText" FROM booking b WHERE id = ${id}`,
  )) as unknown as { rowText: string }[];
  return rows[0]?.rowText ?? "";
}

/** Parse the `[audit]` lines a console.info spy captured. */
type AuditLine = { action: string; outcome: string; meta?: Record<string, unknown> };
function auditLines(infoSpy: { mock: { calls: unknown[][] } }): AuditLine[] {
  return infoSpy.mock.calls
    .filter((c: unknown[]) => c[0] === "[audit]")
    .map((c: unknown[]) => JSON.parse(String(c[1])) as AuditLine);
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "IR Host",
    firstName: "IRHost",
    intent: "host",
  });
  await signUp(testAuth, {
    email: BOOKER_EMAIL,
    password: PASSWORD,
    name: "IR Booker",
    firstName: "Ira",
    intent: "book",
  });
  const [h] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, HOST_EMAIL));
  const [b] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, BOOKER_EMAIL));
  hostId = h.id;
  bookerId = b.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // @/lib/paymongo is deliberately NOT mocked — the real module runs against the fetch interceptor above.
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.resetModules();
  ({ cancelBookingAsBooker } = await import("@/app/actions/cancel-booking"));
  ({ createRefundTransfer } = await import("@/lib/paymongo"));
  ({ refundNeedsManualReturn } = await import("@/lib/booking/refund-dispatch"));

  vi.stubGlobal("fetch", vi.fn(fetchInterceptor));
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  paymongoRequests = [];
  transferMode = "ok";
  institutionsMode = "ok";
  transferCounter = 0;
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
  rateLimitCalls.length = 0;
});

describe("cancelBookingAsBooker + createRefundTransfer — the D-72 InstaPay refund invariants", () => {
  it("(1) the transfer POSTs InstaPay, the server-frozen amount and a refund: key — never payout:", async () => {
    // 30h out under standard = the 100% rung → ₱1,000 refund. POSITIVE MOVEMENT: this is the case that
    // proves the transfer genuinely fires, so every later "no transfer" bound means something.
    await seedListing("L_tr");
    await seedQrphBooking("bk_tr", "L_tr", 30 * HOUR);

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_tr", DEST);

    // The OWNER CAN cancel with a destination — the positive control for the owner-binding case (7).
    expect(res).toEqual({ ok: true, refundCents: 100000 });
    const row = await readRow("bk_tr");
    expect(row.status).toBe("cancelled");
    expect(row.refundCents).toBe(100000);

    // Exactly one transfer POST, and its wire shape is the documented InstaPay contract.
    const posts = transferPosts();
    expect(posts).toHaveLength(1);
    const t = posts[0].body.transfers[0];
    expect(t.provider).toBe("instapay");
    expect(t.amount).toBe(100000); // the SERVER-frozen quote.totalRefundCents, in centavos
    expect(t.currency).toBe("PHP");
    expect(t.purpose).toBe("Disbursement");
    // The destination passed STRAIGHT THROUGH — exactly what the booker typed, unmodified.
    expect(t.destination_account).toEqual({
      number: DEST.accountNumber,
      name: DEST.accountName,
      bic: DEST.institutionBic,
    });
    // Pitfall 10 — the refund namespace, never the payout namespace.
    expect(posts[0].headers["Idempotency-Key"]).toBe("refund:bk_tr");
    expect(posts[0].headers["Idempotency-Key"]).not.toMatch(/^payout:/);
    // Per-attempt reference (attempt 1 from the action).
    expect(t.reference_number).toBe("refund-bk_tr-1");
  });

  it("(2) reference_number ROTATES per attempt while the Idempotency-Key stays STABLE (A3 shape)", async () => {
    // Driven at the transfer level: the action always fires attempt 1; a recovery surface would fire 2.
    // PayMongo's documented retry rule is a NEW unique reference per attempt with the key unchanged —
    // the key is the double-pay guard, the reference is a reconciliation label.
    await createRefundTransfer({
      bookingId: "bk_ref",
      amountCents: 50000,
      currency: "php",
      attempt: 1,
      destination: { number: DEST.accountNumber, name: DEST.accountName, bic: DEST.institutionBic },
    });
    await createRefundTransfer({
      bookingId: "bk_ref",
      amountCents: 50000,
      currency: "php",
      attempt: 2,
      destination: { number: DEST.accountNumber, name: DEST.accountName, bic: DEST.institutionBic },
    });

    const posts = transferPosts();
    expect(posts).toHaveLength(2);
    const ref1 = posts[0].body.transfers[0].reference_number;
    const ref2 = posts[1].body.transfers[0].reference_number;
    expect(ref1).toBe("refund-bk_ref-1");
    expect(ref2).toBe("refund-bk_ref-2");
    expect(ref1).not.toBe(ref2);
    // The key does NOT rotate — PayMongo dedupes the retry on it.
    expect(posts[0].headers["Idempotency-Key"]).toBe("refund:bk_ref");
    expect(posts[1].headers["Idempotency-Key"]).toBe("refund:bk_ref");
  });

  it("(3) NO PERSISTENCE — only the transfer id and a masked last-4 survive, anywhere", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await seedListing("L_np");
    await seedQrphBooking("bk_np", "L_np", 30 * HOUR);

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_np", DEST);
    expect(res).toEqual({ ok: true, refundCents: 100000 });

    // The booking row — EVERY column, as text — contains no destination fragment.
    const rowText = await readRowAsText("bk_np");
    expect(rowText).not.toBe(""); // the scan genuinely read a row
    expect(rowText).not.toContain(DEST.accountNumber);
    expect(rowText).not.toContain(DEST.accountName);
    expect(rowText).not.toContain(DEST.institutionBic);

    // The audit trail: the dispatched entry EXISTS (the positive half — the transfer id and the masked
    // last-4 are genuinely kept)…
    const audits = auditLines(infoSpy);
    const dispatched = audits.find((a) => a.action === "refund_transfer_dispatched");
    expect(dispatched).toBeDefined();
    expect(dispatched!.outcome).toBe("ok");
    expect(dispatched!.meta).toMatchObject({
      bookingId: "bk_np",
      transferId: "tr_refund_1",
      destinationLast4: MASKED_LAST4,
      refundCents: 100000,
    });
    // ⚠ THE NEGATIVE CONTROL FOR THE THREE `toBe(true)` ASSERTIONS IN THIS FILE, and it is a real
    // discriminator rather than a token opposite. This booking has an audit row whose `meta.bookingId`
    // IS "bk_np" — the `refund_transfer_dispatched` row asserted four lines above — so a predicate that
    // matched on the booking alone, or that ignored `outcome`, or that ignored the action set, would
    // answer `true` here. It must answer `false`: this transfer went out, and this booker's destination
    // page must keep the ordinary in-transit sentence.
    expect(await refundNeedsManualReturn("bk_np")).toBe(false);

    // …and NO audit line carries the full number, the name or the BIC.
    const allAuditText = JSON.stringify(audits);
    expect(allAuditText).not.toContain(DEST.accountNumber);
    expect(allAuditText).not.toContain(DEST.accountName);
    expect(allAuditText).not.toContain(DEST.institutionBic);

    // Nor does any notification payload — the emails must not become the storage the schema refused.
    const allNotifyText = JSON.stringify(inngestSend.mock.calls);
    expect(allNotifyText).not.toContain(DEST.accountNumber);
    expect(allNotifyText).not.toContain(DEST.accountName);

    infoSpy.mockRestore();
  });

  it("(4) NO LEAKAGE TO LOGS on a transfer failure — and no silent same-reference retry", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    transferMode = "fail"; // the 500's error detail ECHOES the destination — see the interceptor

    await seedListing("L_leak");
    await seedQrphBooking("bk_leak", "L_leak", 30 * HOUR);

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_leak", DEST);

    // The cancellation SUCCEEDED (the flip is durable); the booker gets the calm recovery message, and
    // is NOT invited to believe the refund is on its way.
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.refundCents).toBe(100000);
    // …and the telling is DURABLE. This predicate is what `/bookings/{id}` reads to decide between the
    // in-transit sentence and the by-hand one; `true` here is the whole reason the booker's destination
    // page cannot claim a transfer that never happened. See the declaration above for what it replaced.
    expect(await refundNeedsManualReturn("bk_leak")).toBe(true);
    expect((await readRow("bk_leak")).status).toBe("cancelled");

    // Exactly ONE transfer attempt — a silent retry with the same reference is exactly what PayMongo's
    // new-reference-per-attempt rule forbids.
    expect(transferPosts()).toHaveLength(1);

    // The failure is LOUD but CLEAN: alert + needs_attention audit, with only the masked last-4.
    expect(errorSpy).toHaveBeenCalledWith(
      "[CANCEL_ALERT] refund_transfer_failed",
      expect.objectContaining({ bookingId: "bk_leak" }),
    );
    const audits = auditLines(infoSpy);
    expect(audits).toContainEqual(
      expect.objectContaining({ action: "refund_transfer_failed", outcome: "needs_attention" }),
    );

    // THE LEAKAGE SCAN. Every console.error and console.info argument, stringified: the account number
    // and account name appear NOWHERE — even though the provider's error detail echoed both back.
    const allLogged = JSON.stringify([...errorSpy.mock.calls, ...infoSpy.mock.calls]);
    expect(allLogged).not.toContain(DEST.accountNumber);
    expect(allLogged).not.toContain(DEST.accountName);

    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("(5) the AMOUNT IS SERVER-FROZEN — a tampered amount field has no effect", async () => {
    // 10h out under standard = the 50% rung → ₱500. The "destination" arrives with smuggled amount-shaped
    // fields, exactly as a tampered client would send them. Zod strips them; nothing below reads them.
    await seedListing("L_frozen");
    await seedQrphBooking("bk_frozen", "L_frozen", 10 * HOUR);

    const tampered = {
      ...DEST,
      amountCents: 99_999_999,
      refundCents: 99_999_999,
    } as unknown as QrphRefundDestination;

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_frozen", tampered);

    expect(res).toEqual({ ok: true, refundCents: 50000 });
    expect((await readRow("bk_frozen")).refundCents).toBe(50000);
    // The wire amount equals the server quote — not the tampered figure, not the full price.
    const posts = transferPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].body.transfers[0].amount).toBe(50000);
  });

  it("(6) the InstaPay CEILING routes to needs_attention instead of firing a doomed transfer", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    // ₱60,000 space price at the 100% rung → a ₱60,000 refund, above InstaPay's ₱50,000 ceiling.
    await seedListing("L_ceil");
    await seedQrphBooking("bk_ceil", "L_ceil", 30 * HOUR, {
      spacePriceCents: 6_000_000,
      serviceFeeCents: 0,
    });

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_ceil", DEST);

    // The cancellation still succeeds — the ceiling is a dispatch problem, not a cancel problem.
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.refundCents).toBe(6_000_000);
    expect(await refundNeedsManualReturn("bk_ceil")).toBe(true);
    expect((await readRow("bk_ceil")).status).toBe("cancelled");

    // NO transfer was fired — a call we know 4xxs is worse than an alert.
    expect(transferPosts()).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(
      "[CANCEL_ALERT] refund_over_instapay_ceiling",
      expect.objectContaining({ bookingId: "bk_ceil", refundCents: 6_000_000 }),
    );
    expect(auditLines(infoSpy)).toContainEqual(
      expect.objectContaining({ action: "refund_over_instapay_ceiling", outcome: "needs_attention" }),
    );

    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("(7) OWNER BINDING — a destination cannot attach to a booking the caller does not own", async () => {
    await seedListing("L_owner");
    await seedQrphBooking("bk_owner", "L_owner", 30 * HOUR);
    const before = await readRowAsText("bk_owner");

    // The HOST (a real signed-in user who is NOT the booker) tries to cancel the booker's QRPh booking
    // with THEIR OWN destination — the payout-redirection shape (T-07-94).
    await login(HOST_EMAIL);
    const res = await cancelBookingAsBooker("bk_owner", DEST);

    // The byte-exact IDOR denial — the same calm string a missing booking returns. (This is the assertion
    // the owner-gate mutation flips: without the pre-read gate the 0-row WHERE yields NOT_ACTIVE instead.)
    expect(res).toEqual({
      ok: false,
      error: "We couldn't find that booking, or it isn't yours to manage.",
    });
    // No transfer fired, and the booking is byte-for-byte unmodified.
    expect(transferPosts()).toHaveLength(0);
    expect(await readRowAsText("bk_owner")).toBe(before);

    // (7b) POSITIVE CONTROL — the genuine owner CAN cancel the same booking with a destination, so a
    // deny-everything implementation cannot pass this file.
    await login(BOOKER_EMAIL);
    const owned = await cancelBookingAsBooker("bk_owner", DEST);
    expect(owned).toEqual({ ok: true, refundCents: 100000 });
    expect(transferPosts()).toHaveLength(1);
  });

  it("(8) a malformed destination or an unknown BIC is rejected BEFORE the flip", async () => {
    await seedListing("L_inv");
    await seedQrphBooking("bk_inv", "L_inv", 30 * HOUR);

    await login(BOOKER_EMAIL);

    // Malformed shape (letters in the account number) — rejected by the schema, nothing written.
    const badShape = await cancelBookingAsBooker("bk_inv", {
      ...DEST,
      accountNumber: "12345abcde",
    });
    expect(badShape.ok).toBe(false);
    if (!badShape.ok) expect(badShape.error).toMatch(/refund account details/i);

    // A BIC that is NOT in the live institution list (T-07-99: never a free string) — same calm denial.
    const badBic = await cancelBookingAsBooker("bk_inv", {
      ...DEST,
      institutionBic: "EVILPHM1XXX",
    });
    expect(badBic.ok).toBe(false);
    if (!badBic.ok) expect(badBic.error).toMatch(/refund account details/i);

    // The booking is STILL LIVE — the booker fixes the form; nothing was cancelled undeliverably.
    expect((await readRow("bk_inv")).status).toBe("confirmed");
    expect(transferPosts()).toHaveLength(0);
  });

  it("(9) an UNVERIFIABLE institution list degrades to the operator seam, never a crash", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    institutionsMode = "notfound"; // the OBSERVED live 404 until Money Movement is enabled

    await seedListing("L_unver");
    await seedQrphBooking("bk_unver", "L_unver", 30 * HOUR);

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_unver", DEST);

    // The booker's right to cancel is not blocked by PayMongo's feature gate — but no transfer fires at
    // an unverified institution, and the booker is told the team will take it from here.
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.refundCents).toBe(100000);
    expect(await refundNeedsManualReturn("bk_unver")).toBe(true);
    expect((await readRow("bk_unver")).status).toBe("cancelled");
    expect(transferPosts()).toHaveLength(0);
    expect(auditLines(infoSpy)).toContainEqual(
      expect.objectContaining({ action: "refund_manual_required", outcome: "needs_attention" }),
    );

    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });
});
