// MANAGE-03 end-to-end: the lifecycle call sites actually reach the notification layer (07-10).
//
// 07-07 built the fan-out and wired it to nothing — `emitNotify` had no caller, so no notification row was
// ever produced by a real booking event and MANAGE-03 was not observably satisfied. 07-10 migrated the five
// shipped fire-and-forget sends onto it. THIS FILE IS THE PROOF THAT THE WIRE IS LIVE, and it asserts the
// four properties the migration is only worth anything if it preserves:
//
//   1. EMITTED, AND EMITTED AFTER THE COMMIT (T-07-58). Not merely "the action called send" — at the instant
//      the emission happens, the durable flip is already visible on an INDEPENDENT database connection. A
//      second connection can only see COMMITTED data, so this distinguishes "emitted after commit" from
//      "emitted from inside an open transaction", which is the failure mode that would leave an event sent
//      for a booking a rollback then erased. Nothing weaker actually tests the ordering.
//   2. AN EMISSION FAILURE CANNOT FAIL THE ACTION (MANAGE-03 / T-07-57). The transport is made to reject and
//      the action still returns ok with its durable write intact. The caller has ALREADY committed a state
//      change; a notification is an amplifier of that fact, never a precondition for it.
//   3. NO NOTIFICATION WITHOUT AN EVENT (T-07-59). Every lifecycle UPDATE is status-scoped, so a repeat
//      action claims 0 rows and emits nothing — which is also why a double-submit, a retried step and a
//      webhook redelivery cannot produce a second email. The status-scoped flip IS the dedupe claim.
//   4. THE ROW ACTUALLY LANDS. One case drives the whole path — real action → real emission → the notify
//      handler's two steps → a real `notification` row read back out of the real database, plus the email.
//      Everything else in this suite observes the emission; this one refuses to stop there.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";

import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockResend } from "../helpers/mocks";
import { user, listing, booking, hostPayout } from "@/lib/db/schema";
import type { NotifyEvent } from "@/lib/notifications";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

// placeHold ends in a redirect (next/navigation). The mock (installed in beforeAll) throws a typed
// RedirectError carrying the URL so a case can assert the SUCCESS target — cloned from
// tests/booking/request-lifecycle.test.ts.
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

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the Inngest client. */
type NotifyEnvelope = { name: string; data: NotifyEvent };

/**
 * A recorded emission plus WHAT AN INDEPENDENT CONNECTION COULD SEE at the moment it happened. The
 * `statusAtEmit` field is the whole point of the harness — see property (1) in the header.
 */
type Recorded = { envelope: NotifyEnvelope; statusAtEmit: string | null };

const recorded: Recorded[] = [];
let emitShouldReject = false;
/** An INDEPENDENT connection (its own backend) — it can only observe COMMITTED rows. */
let probe: ReturnType<typeof postgres>;

/**
 * The Inngest client, stubbed at the MODULE the actions' graph resolves (the cancellation.test.ts idiom).
 * `vi.spyOn` on an import held by this file would patch the pre-`resetModules` instance and silently miss —
 * and `emitNotify` swallows its own errors by design, so the miss would be indistinguishable from a pass.
 *
 * `createFunction` is stubbed because request-expiry.ts registers its cron at module scope; these cases call
 * the factored `expireOne` directly rather than driving the Inngest runtime.
 */
const inngestSend = vi.fn(async (envelope: NotifyEnvelope) => {
  const bookingId = envelope.data?.bookingId ?? null;
  let statusAtEmit: string | null = null;
  if (bookingId) {
    const rows = await probe<{ status: string }[]>`
      SELECT status::text AS status FROM booking WHERE id = ${bookingId}`;
    statusAtEmit = rows[0]?.status ?? null;
  }
  recorded.push({ envelope, statusAtEmit });
  if (emitShouldReject) throw new Error("inngest unreachable");
  return { ids: [envelope.name] };
});

let testDb: TestDb;
let testAuth: TestAuth;
type HostRequestActions = typeof import("@/app/actions/host-requests");
let approveRequest: HostRequestActions["approveRequest"];
let declineRequest: HostRequestActions["declineRequest"];
type ExpiryFns = typeof import("@/inngest/functions/request-expiry");
let expireOne: ExpiryFns["expireOne"];
type NotifyFns = typeof import("@/inngest/functions/notify");
let sendForType: NotifyFns["sendForType"];
let insertNotification: (typeof import("@/lib/notifications"))["insertNotification"];
type BookingActions = typeof import("@/app/actions/booking");
let placeHold: BookingActions["placeHold"];

const BOOKER = "ne_booker";
const BOOKER_EMAIL = "ne_booker@example.com";
const HOST_EMAIL = "ne_host@example.com";
// A REAL signed-up booker (intent 'book' → canBook) whose session drives placeHold (T11). Distinct from
// the plain-inserted BOOKER row, which has no credential account and cannot sign in.
const ACTION_BOOKER_EMAIL = "ne_action_booker@example.com";
const PASSWORD = "averylongpassword";
const HOURLY = 5000;
let hostId: string;
let actionBookerId: string;

async function dbNow(): Promise<Date> {
  const [row] = await testDb.client<{ now: Date | string }[]>`SELECT now() AS "now"`;
  return new Date(row.now);
}

/** A dedicated listing per case, so seeded rows never collide on the booking_no_overlap EXCLUDE. */
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
    dayRateCents: 30000,
  });
}

/**
 * Seed a live `requested` hold starting `msToStart` from the DB clock. `expiresInMs` overrides the SLA
 * (negative = already lapsed, i.e. ready for the expiry sweep).
 */
async function seedRequest(opts: {
  id: string;
  listingId: string;
  msToStart: number;
  expiresInMs?: number;
  declineReason?: string;
}): Promise<void> {
  const base = await dbNow();
  const startsAt = new Date(base.getTime() + opts.msToStart);
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: opts.listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR),
    status: "requested",
    bookingMode: "request",
    expiresAt: new Date(
      opts.expiresInMs != null
        ? base.getTime() + opts.expiresInMs
        : Math.min(base.getTime() + 24 * HOUR, startsAt.getTime()),
    ),
    // The D-74 frozen split. `spacePriceCents` is what composeWhenLabel compares against the listing rate,
    // so an hourly booking must freeze hourlyRate x hours here or every label would read "Full day".
    spacePriceCents: HOURLY,
    serviceFeeCents: 250,
    quotedTotalCents: HOURLY + 250,
    currency: "php",
    declineReason: opts.declineReason ?? null,
  });
}

async function readStatus(id: string): Promise<string> {
  const [row] = await testDb.db
    .select({ status: booking.status })
    .from(booking)
    .where(eq(booking.id, id));
  return row.status;
}

async function countNotifications(bookingId: string): Promise<number> {
  const [row] = (await testDb.db.execute(sql`
    SELECT count(*)::int AS "c" FROM notification WHERE booking_id = ${bookingId}
  `)) as unknown as { c: number }[];
  return row?.c ?? 0;
}

/** Recorded emissions of `type`, scoped to one booking so a sibling case can never false-match. */
function emissionsFor(type: string, bookingId: string): Recorded[] {
  return recorded.filter(
    (r) =>
      r.envelope.name === "fitout/notify" &&
      r.envelope.data.type === type &&
      r.envelope.data.bookingId === bookingId,
  );
}

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

beforeAll(async () => {
  testDb = await setupTestDb();
  [probe] = makeRacingClients(testDb.schema, 1);

  await testDb.db.insert(user).values([
    {
      id: BOOKER,
      name: "NE Booker",
      email: BOOKER_EMAIL,
      firstName: "Booker",
      emailVerified: true,
    },
  ]);

  testAuth = makeTestAuth(testDb);
  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "NE Host",
    firstName: "NEHost",
    intent: "host",
  });
  const [h] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, HOST_EMAIL));
  hostId = h.id;

  // T11: placeHold's request branch needs a SIGNED-IN canBook booker AND a BOOKABLE listing
  // (deriveBookable = published + host emailVerified + host payoutsEnabled). Sign up a real booker and
  // make the host bookable so a request-mode placeHold actually reaches its emission pair.
  await signUp(testAuth, {
    email: ACTION_BOOKER_EMAIL,
    password: PASSWORD,
    name: "NE Action Booker",
    firstName: "ActionBooker",
    intent: "book",
  });
  const [ab] = await testDb.db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, ACTION_BOOKER_EMAIL));
  actionBookerId = ab.id;
  await testDb.db.update(user).set({ emailVerified: true }).where(eq(user.id, hostId));
  await testDb.db.insert(hostPayout).values({
    userId: hostId,
    payoutsEnabled: true,
    activationStatus: "activated",
    onboardingComplete: true,
  });

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  // placeHold redirects on success; throw a typed error carrying the URL so expectRedirect can read it.
  vi.doMock("next/navigation", () => ({
    redirect: (url: string) => {
      throw new RedirectError(url);
    },
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  }));
  vi.doMock("@/inngest/client", () => ({
    inngest: {
      send: inngestSend,
      createFunction: (_opts: unknown, handler: unknown) => handler,
    },
  }));
  // The real limiter is a module-level Map with a 5-per-60s budget per identity, so the approves in this
  // file would exhaust it and later cases would assert against a rate-limit denial rather than the
  // behaviour they name — a fixture artefact masquerading as a result. The limiter's own arithmetic is
  // covered by tests/security/rate-limit.test.ts.
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: () => ({ ok: true }),
    requireWithinRateLimit: () => ({ ok: true }),
  }));
  vi.resetModules();

  ({ approveRequest, declineRequest } = await import("@/app/actions/host-requests"));
  ({ expireOne } = await import("@/inngest/functions/request-expiry"));
  ({ sendForType } = await import("@/inngest/functions/notify"));
  ({ insertNotification } = await import("@/lib/notifications"));
  ({ placeHold } = await import("@/app/actions/booking"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("next/navigation");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  await probe.end();
  await teardownTestDb(testDb);
});

beforeEach(() => {
  recorded.length = 0;
  inngestSend.mockClear();
  emitShouldReject = false;
});

describe("lifecycle actions reach the notification layer (MANAGE-03 / D-83)", () => {
  it("(1) approve emits fitout/notify — and the flip is already COMMITTED at the moment it emits", async () => {
    await seedListing("L_ne_approve");
    await seedRequest({ id: "bk_ne_approve", listingId: "L_ne_approve", msToStart: 6 * HOUR });
    await login(HOST_EMAIL);

    expect((await approveRequest("bk_ne_approve")).ok).toBe(true);
    expect(await readStatus("bk_ne_approve")).toBe("approved");

    const hits = emissionsFor("request_approved", "bk_ne_approve");
    expect(hits).toHaveLength(1);
    expect(hits[0].envelope.name).toBe("fitout/notify");
    expect(hits[0].envelope.data.type).toBe("request_approved");
    expect(hits[0].envelope.data.payload.type).toBe("request_approved");

    // ORDERING — the load-bearing assertion (T-07-58). `probe` is an independent connection, so it can only
    // observe committed rows. Seeing `approved` there AT EMIT TIME means the flip had already committed when
    // the event went out. Had the emission been placed inside an open transaction, this would read
    // `requested` (the pre-image) or block — and a later rollback would have left an event describing a
    // booking that no longer exists.
    expect(hits[0].statusAtEmit).toBe("approved");

    // The recipient is the BOOKER, resolved from the row the action already owner-gated and joined —
    // never a second lookup and never anything the caller supplied (T-07-56).
    expect(hits[0].envelope.data.recipientId).toBe(BOOKER);
    expect(hits[0].envelope.data.email).toBe(BOOKER_EMAIL);
  });

  it("(2) a rejecting transport does NOT fail the action, and does not undo the durable write (MANAGE-03)", async () => {
    emitShouldReject = true;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await seedListing("L_ne_fail");
    await seedRequest({ id: "bk_ne_fail", listingId: "L_ne_fail", msToStart: 6 * HOUR });
    await login(HOST_EMAIL);

    const res = await approveRequest("bk_ne_fail");

    // The host clicked approve, the payment window opened, the booker's slot is held. Surfacing a failure
    // here would tell the host their approval did not happen when it demonstrably did.
    expect(res).toEqual({ ok: true });
    expect(await readStatus("bk_ne_fail")).toBe("approved");

    // The emission was genuinely ATTEMPTED and genuinely FAILED — the guarantee is that the action survived
    // it, not that it was skipped. And the failure is observable rather than silent.
    expect(emissionsFor("request_approved", "bk_ne_fail")).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledWith("[notify] enqueue_failed", expect.anything());
    // The log names the type and the booking only — never the payload, never the recipient's address.
    const logged = errorSpy.mock.calls.find((c) => c[0] === "[notify] enqueue_failed")![1] as Record<
      string,
      unknown
    >;
    expect(logged).not.toHaveProperty("payload");
    expect(logged).not.toHaveProperty("email");

    errorSpy.mockRestore();
  });

  it("(3) a 0-row (already-actioned) approve emits NOTHING — the status-scoped flip is the dedupe claim", async () => {
    await seedListing("L_ne_dupe");
    await seedRequest({ id: "bk_ne_dupe", listingId: "L_ne_dupe", msToStart: 6 * HOUR });
    await login(HOST_EMAIL);

    expect((await approveRequest("bk_ne_dupe")).ok).toBe(true);
    expect(emissionsFor("request_approved", "bk_ne_dupe")).toHaveLength(1);

    // A double-click, a retried request, or a second host tab. `AND status = 'requested'` claims 0 rows, the
    // action returns the calm NOT_PENDING, and — the point — the emission is never reached, so the booker
    // cannot be emailed twice. Duplicate suppression lives in the UPDATE's WHERE, not in the notify layer.
    const second = await approveRequest("bk_ne_dupe");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/no longer pending/i);
    expect(emissionsFor("request_approved", "bk_ne_dupe")).toHaveLength(1); // still ONE

    // Declining an already-approved row is likewise a 0-row no-op that emits nothing.
    expect((await declineRequest("bk_ne_dupe")).ok).toBe(false);
    expect(emissionsFor("request_declined", "bk_ne_dupe")).toHaveLength(0);
  });

  it("(4) the expiry sweep emits too — expiry is not the one lifecycle event without a notification (D-91)", async () => {
    await seedListing("L_ne_expiry");
    await seedRequest({
      id: "bk_ne_expiry",
      listingId: "L_ne_expiry",
      msToStart: 6 * HOUR,
      expiresInMs: -5 * MIN, // already lapsed → due for the sweep
    });

    const res = await expireOne(testDb.db, {
      id: "bk_ne_expiry",
      status: "requested",
      listingId: "L_ne_expiry",
      bookerId: BOOKER,
    });
    expect(res).toEqual({ status: "declined", notified: true });
    expect(await readStatus("bk_ne_expiry")).toBe("declined");

    const hits = emissionsFor("request_declined", "bk_ne_expiry");
    expect(hits).toHaveLength(1);
    // Emitted after the flip committed, exactly as the actions do.
    expect(hits[0].statusAtEmit).toBe("declined");
    const payload = hits[0].envelope.data.payload;
    if (payload.type !== "request_declined") throw new Error("wrong payload variant");
    // A LAPSE, not a host decline — two different sentences, which is why this is a boolean and not a label.
    expect(payload.expired).toBe(true);
    // A plain SLA lapse carries no reason; case (5) is the contrast.
    expect(payload.reasonLabel).toBeUndefined();
  });

  it("(5) a D-93 too-close-to-start auto-decline carries the honest reason, not the generic lapse copy", async () => {
    await seedListing("L_ne_close");
    await seedRequest({
      id: "bk_ne_close",
      listingId: "L_ne_close",
      msToStart: 30 * MIN,
      expiresInMs: -5 * MIN,
      // Written by approveRequest when the host tried to approve inside MIN_APPROVE_WINDOW_HOURS.
      declineReason: "too_close_to_start",
    });

    await expireOne(testDb.db, {
      id: "bk_ne_close",
      status: "requested",
      listingId: "L_ne_close",
      bookerId: BOOKER,
    });

    const hits = emissionsFor("request_declined", "bk_ne_close");
    expect(hits).toHaveLength(1);
    const payload = hits[0].envelope.data.payload;
    if (payload.type !== "request_declined") throw new Error("wrong payload variant");
    // The distinguishing field is asserted on the PAYLOAD, not on rendered email copy: this plan is a
    // transport migration and deliberately changed no template. The durable row carries the honest reason
    // and the D-92 dropdown renders it; the email keeps its existing wording.
    expect(payload.reasonLabel).toBeDefined();
    expect(payload.reasonLabel).toMatch(/too close to start/i);
  });
});

describe("the wire is live end-to-end — a real action produces a real notification row", () => {
  it("(6) approve → emit → the notify handler's two steps → one row in the DB and one email", async () => {
    await seedListing("L_ne_e2e");
    await seedRequest({ id: "bk_ne_e2e", listingId: "L_ne_e2e", msToStart: 8 * HOUR });
    await login(HOST_EMAIL);

    expect((await approveRequest("bk_ne_e2e")).ok).toBe(true);

    // Nothing has been written yet — `emitNotify` hands off an event and returns. The row is the notify
    // FUNCTION's job, which is exactly why the action can never be blocked by it.
    expect(await countNotifications("bk_ne_e2e")).toBe(0);

    // Run the handler body over the real emitted event: step 1 writes the durable row, step 2 sends.
    const event = emissionsFor("request_approved", "bk_ne_e2e")[0].envelope.data;
    await insertNotification(testDb.db, event);
    const sent = await sendForType(event);
    expect(sent).toEqual({ sent: true });

    // THE POINT OF THIS WHOLE PLAN: a real host clicking approve now produces a real row in the real
    // database, read back here rather than asserted from the payload we just handed in.
    expect(await countNotifications("bk_ne_e2e")).toBe(1);
    const [row] = (await testDb.db.execute(sql`
      SELECT type::text AS "type", recipient_id AS "recipientId", payload
      FROM notification WHERE booking_id = ${"bk_ne_e2e"}
    `)) as unknown as {
      type: string;
      recipientId: string;
      payload: { listingTitle: string; whenLabel: string; payByLabel: string; href: string };
    }[];
    expect(row.type).toBe("request_approved");
    expect(row.recipientId).toBe(BOOKER);
    expect(row.payload.href).toContain("hold=bk_ne_e2e");
    // The venue-local labels survived the round trip as real display strings (D-86: never ids to re-join).
    expect(row.payload.whenLabel).toContain("Makati time");
    expect(row.payload.payByLabel).toContain("Makati time");
    // An HOURLY booking must NOT read "Full day" — the D-74 regression composeWhenLabel exists to prevent.
    expect(row.payload.whenLabel).not.toContain("Full day");

    // And the email went out, to the booker, through the same one event.
    const emails = mockResend.sent().filter((e) => e.to === BOOKER_EMAIL);
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toContain("Approved");

    // Step 2 retried (exactly what Inngest does — a completed step is memoized and does not re-run) sends
    // again but CANNOT write a second row. That is what makes an aggressive email retry budget safe.
    await sendForType(event);
    expect(await countNotifications("bk_ne_e2e")).toBe(1);
    expect(mockResend.sent().filter((e) => e.to === BOOKER_EMAIL)).toHaveLength(2);
  });
});

describe("placeHold suppresses the request notification pair on an idempotent replay (T11)", () => {
  // A far-future, on-instant window well beyond MIN_LEAD_REQUEST_HOURS, dedicated to this case's listing so
  // it never collides with another case on the booking_no_overlap EXCLUDE.
  const START = "2027-03-01T02:00:00.000Z";
  const END = "2027-03-01T03:00:00.000Z";

  it("(7) a first request emits ONE pair; a REPLAYED double-submit emits NOTHING (the host is notified once)", async () => {
    await seedListing("L_ne_replay");
    await login(ACTION_BOOKER_EMAIL);

    // FIRST submit → mints a `requested` hold and emits the pair: the booker's receipt + the host's alert.
    const firstUrl = await expectRedirect(
      placeHold({ listingId: "L_ne_replay", startUtc: START, endUtc: END, fullDay: false }),
    );
    expect(firstUrl).toMatch(/^\/bookings\//);
    const holdId = firstUrl.split("/").pop()!;
    expect(await readStatus(holdId)).toBe("requested");

    const receipt = emissionsFor("request_received", holdId);
    expect(receipt).toHaveLength(1);
    // The receipt went to the BOOKER, the alert to the HOST — a wrong-party regression would be invisible
    // in a bare count (T-07-56).
    expect(receipt[0].envelope.data.recipientId).toBe(actionBookerId);
    const hostAlert = emissionsFor("new_request_to_host", holdId);
    expect(hostAlert).toHaveLength(1);
    expect(hostAlert[0].envelope.data.recipientId).toBe(hostId);

    // SECOND submit on the SAME window by the SAME booker → createPendingHold matches the active hold and
    // replays it (replayed:true, SAME id). The T11 fix guards the emissions on `!res.replayed`, mirroring
    // re-request.ts:299, so the host is NOT told a second time.
    const secondUrl = await expectRedirect(
      placeHold({ listingId: "L_ne_replay", startUtc: START, endUtc: END, fullDay: false }),
    );
    // The replay still revalidates and REDIRECTS to the SAME booking — hold + redirect unchanged on replay.
    expect(secondUrl).toBe(firstUrl);
    expect(await readStatus(holdId)).toBe("requested");

    // Across the double-submit: exactly ONE pair total. The replay added nothing — never a second pair.
    expect(emissionsFor("request_received", holdId)).toHaveLength(1);
    expect(emissionsFor("new_request_to_host", holdId)).toHaveLength(1);
    const forThisBooking = recorded.filter((r) => r.envelope.data.bookingId === holdId);
    expect(forThisBooking).toHaveLength(2); // one pair, never four
  });
});
