// CR-04 (BLOCKER), half 1 — `submitRsvp` must RESOLVE the invite token before it charges any budget
// whose key is derived from caller input.
//
// THE THREAT, stated plainly: `submitRsvp` is the app's ONE unauthenticated, publicly reachable write.
// Until this plan it shape-checked the token and then immediately charged
// `rateLimit(\`rsvp:${parsedToken.data}\`)` — BEFORE `getGroupByToken` had any opinion on whether that
// token names a real group. Every earlier caller keyed on an authenticated `userId`, so the key space
// was the user table; here it was `32^20` caller-selectable strings, each buying a durable entry in a
// module-level Map with no session, no group and no database row behind it.
//
// THE PROPERTY THIS FILE PINS (D-118): an unauthenticated caller sending distinct, well-formed but
// UNKNOWN tokens creates NO bucket at all. Asserted as an exact DELTA of ZERO across 200 distinct
// tokens, not as "small" — a bound that is merely small is the bug with a coefficient on it.
//
// The companion bound (the store's own 50,000 ceiling, for keys that ARE resolvable) is pinned in
// tests/security/rate-limit-bound.test.ts. Both are needed; neither is sufficient.
//
// ALSO PINNED HERE:
//   - the budget follows the GROUP, not the token: a link that `regenerateLink` replaced shares its
//     predecessor's budget, because the key is `group.groupId` (this is the observable consequence of
//     resolving first, and it is what a re-key back onto the token would break)
//   - the calm sentence is unchanged for unknown, malformed and regenerated alike (D-116 / T-08-17)
//   - the residual cost dispositioned `accept` in the threat model (T-08-34) is MEASURED: an
//     unresolvable token costs exactly one indexed lookup, and a MALFORMED one costs zero
//   - the shipped 30-per-60s link budget still bites on a token that does resolve
//
// The limiter is DELIBERATELY NOT mocked (the guest-email-guard.test.ts rule): a stubbed limiter would
// make every assertion in this file vacuous. `@/lib/rate-limit` is imported through the SAME post-
// `resetModules` registry as the action under test, so the Map being counted is the Map being written.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user, listing, booking, bookingGroup } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { INACTIVE_BODY, INACTIVE_TITLE } from "@/lib/group/rsvp";

const HOUR = 60 * 60 * 1000;
const PASSWORD = "averylongpassword";
const HOST_EMAIL = "rrl_host@example.com";
const ORG_EMAIL = "rrl_organizer@example.com";

/**
 * The shipped copy, pinned here so a re-word cannot silently turn one branch into an oracle.
 *
 * STILL A LITERAL AFTER PLAN 11-19'S HOIST, ON PURPOSE — and the copy-pin test below is the other half.
 * 11-19 made `src/lib/group/rsvp.ts` the ONE declaration of these sentences in `src/`, which is what closes
 * the drift between the three surfaces that render them. It does not pin the WORDS: a gate written over
 * imports is green for any value, correctly, because there is only one. If this file also read the
 * constants, nothing anywhere would notice the shipped sentence changing — so the pin stays a literal and
 * the test below asserts the literal still names what `submitRsvp` actually composes.
 */
const INVITE_INACTIVE = "This invite is no longer active. Ask the organizer for the latest link.";
const TOO_FAST = "You're going a little fast. Please try again in a moment.";
/** The shipped per-link budget (src/app/actions/group.ts RSVP_RATE_LIMIT). */
const RSVP_MAX = 30;

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

type SentEvent = { name: string; data: Record<string, unknown> };
const inngestSend = vi.fn(async (event: SentEvent) => {
  void event;
  return { ids: [] as string[] };
});

let testDb: TestDb;
let testAuth: TestAuth;
type GroupActions = typeof import("@/app/actions/group");
let submitRsvp: GroupActions["submitRsvp"];
let regenerateLink: GroupActions["regenerateLink"];
type RateLimitModule = typeof import("@/lib/rate-limit");
let limiter: RateLimitModule;

let organizerId: string;
let hostId: string;

/** Every top-level `db.execute` the action makes, so "no database round trip" is measured, not assumed. */
let dbExecuteCalls = 0;

/** Crockford base32 — the exact alphabet `inviteTokenSchema` accepts (`/^[0-9A-HJKMNP-TV-Z]{20}$/`). */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * A well-formed token that resolves to NOTHING. Distinct for every `i` under 1024, and prefixed so it
 * can never collide with a fixture token below.
 */
function unknownToken(i: number): string {
  return `Z9Z9Z9Z9Z9Z9Z9Z9Z9${CROCKFORD[i % 32]}${CROCKFORD[Math.floor(i / 32) % 32]}`;
}

/** Fixed, shape-valid tokens — one group per case so budgets never bleed between them. */
const TOKEN_CONTROL = "AAAAAAAAAAAAAAAAAAA1";
const TOKEN_BUDGET = "AAAAAAAAAAAAAAAAAAA2";
const TOKEN_REGEN = "AAAAAAAAAAAAAAAAAAA3";

const GROUPS: Array<{ token: string; bookingId: string; groupId: string }> = [
  { token: TOKEN_CONTROL, bookingId: "bk_rrl_1", groupId: "grp_rrl_1" },
  { token: TOKEN_BUDGET, bookingId: "bk_rrl_2", groupId: "grp_rrl_2" },
  { token: TOKEN_REGEN, bookingId: "bk_rrl_3", groupId: "grp_rrl_3" },
];

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
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "RRL Host",
    firstName: "RRLHost",
    intent: "host",
  });
  await signUp(testAuth, {
    email: ORG_EMAIL,
    password: PASSWORD,
    name: "Olive Organizer",
    firstName: "Olive",
    intent: "book",
  });

  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((u) => u.email === HOST_EMAIL)!.id;
  organizerId = ids.find((u) => u.email === ORG_EMAIL)!.id;

  await testDb.db.insert(listing).values({
    id: "L_rrl",
    hostId,
    title: "Budget Court",
    status: "published",
    bookingMode: "instant",
    unitCount: 1,
    maxOccupancy: 40,
    timezone: "Asia/Manila",
    city: "Makati",
    addressLine1: "1 Budget Street",
    hourlyRateCents: 100000,
    dayRateCents: 300000,
    cancellationPolicy: "standard",
  });

  const base = await readDbNow(testDb.db);
  for (const [i, g] of GROUPS.entries()) {
    const startsAt = new Date(base.getTime() + (12 + i * 3) * HOUR);
    await testDb.db.insert(booking).values({
      id: g.bookingId,
      listingId: "L_rrl",
      unit: 1,
      bookerId: organizerId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      status: "confirmed",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      quotedTotalCents: 105000,
      currency: "php",
    });
    await testDb.db.insert(bookingGroup).values({
      id: g.groupId,
      bookingId: g.bookingId,
      capacitySnapshot: 40,
      accessToken: g.token,
    });
  }

  // Count every top-level statement the action issues. `db.transaction` bodies run against their own
  // `tx`, so this counts exactly the pre-claim reads — which is the number CR-04 argues about.
  const realExecute = testDb.db.execute.bind(testDb.db);
  (testDb.db as unknown as { execute: unknown }).execute = (...args: unknown[]) => {
    dbExecuteCalls += 1;
    return (realExecute as unknown as (...a: unknown[]) => unknown)(...args);
  };

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  // NOT mocked: `@/lib/rate-limit`. This whole file is an assertion about the real store.
  vi.resetModules();
  // Imported AFTER resetModules and from the same registry the action will resolve, so the counted
  // Map is the written Map. A stale static import would silently observe a different instance —
  // which is exactly what the positive control below would catch.
  limiter = await import("@/lib/rate-limit");
  ({ submitRsvp, regenerateLink } = await import("@/app/actions/group"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  inngestSend.mockClear();
  sessionHeaders.cookie = "";
  limiter.__resetRateLimit();
  dbExecuteCalls = 0;
});

describe("T-11-ORACLE — the pinned copy still names the shipped constants", () => {
  it("INVITE_INACTIVE is exactly `${INACTIVE_TITLE}. ${INACTIVE_BODY}`", () => {
    // The literal above is this suite's independent record of what a person actually reads. The hoist made
    // one declaration serve three surfaces; this line is what makes a re-word of that declaration a RED
    // test somebody has to look at, rather than a silent change to the words a bearer-credential failure
    // speaks in. Failing here is not a bug — it is the copy change asking to be acknowledged.
    expect(`${INACTIVE_TITLE}. ${INACTIVE_BODY}`).toBe(INVITE_INACTIVE);
  });
});

describe("D-118/CR-04 — an unresolvable token mints no rate-limit bucket", () => {
  it("adds EXACTLY ZERO buckets across 200 distinct, well-formed, unknown tokens", async () => {
    const before = limiter.__rateLimitBucketCount();

    for (let i = 0; i < 200; i++) {
      const res = await submitRsvp(unknownToken(i), { name: "Probe Pat", answer: "yes" });
      // D-116/T-08-17 — the same calm sentence every time, never a distinguishable validation error.
      expect(res).toEqual({ ok: false, error: INVITE_INACTIVE });
    }

    // THE ASSERTION CR-04 EXISTS FOR. A delta, and exactly zero.
    expect(limiter.__rateLimitBucketCount() - before).toBe(0);
  });

  it("POSITIVE CONTROL: a token that DOES resolve mints exactly one bucket", async () => {
    // Without this, the case above would pass just as happily against a limiter this file cannot see
    // (a stale module instance) or against an action that never rate-limits anything at all.
    const before = limiter.__rateLimitBucketCount();
    const res = await submitRsvp(TOKEN_CONTROL, { name: "Real Rita", answer: "no" });
    expect(res).toEqual({ ok: true, status: "no", reachable: false });
    expect(limiter.__rateLimitBucketCount() - before).toBe(1);
  });

  it("mints no bucket for a SIGNED-IN caller on an unknown token either", async () => {
    // The identity budget moved down with the link budget, so neither key is charged before the
    // resolution — a signed-in prober cannot mint one either, on any key.
    await login(ORG_EMAIL);
    const before = limiter.__rateLimitBucketCount();
    const res = await submitRsvp(unknownToken(300), { name: "ignored", answer: "yes" });
    expect(res).toEqual({ ok: false, error: INVITE_INACTIVE });
    expect(limiter.__rateLimitBucketCount() - before).toBe(0);
  });
});

describe("T-08-34 — the residual cost of resolving first, measured", () => {
  it("charges a MALFORMED token zero buckets and zero database round trips", async () => {
    const beforeBuckets = limiter.__rateLimitBucketCount();
    const beforeDb = dbExecuteCalls;

    const res = await submitRsvp("not-a-real-token", { name: "Mal Formed", answer: "yes" });
    expect(res).toEqual({ ok: false, error: INVITE_INACTIVE });

    expect(limiter.__rateLimitBucketCount() - beforeBuckets).toBe(0);
    expect(dbExecuteCalls - beforeDb).toBe(0);
  });

  it("costs an unknown token exactly ONE indexed lookup — no write, no transaction", async () => {
    const beforeDb = dbExecuteCalls;
    const res = await submitRsvp(unknownToken(500), { name: "Probe Pat", answer: "yes" });
    expect(res).toEqual({ ok: false, error: INVITE_INACTIVE });
    // This is the cost the threat model dispositions `accept`. Pinning it is how a future change that
    // turns one lookup into several has to argue for itself.
    expect(dbExecuteCalls - beforeDb).toBe(1);
  });
});

describe("the shipped per-link budget still bites on a token that resolves", () => {
  it("allows 30 answers in the window and refuses the 31st", async () => {
    for (let i = 0; i < RSVP_MAX; i++) {
      const res = await submitRsvp(TOKEN_BUDGET, { name: `Guest ${i}`, answer: "no" });
      expect(res.ok).toBe(true);
    }

    const overBudget = await submitRsvp(TOKEN_BUDGET, { name: "One Too Many", answer: "no" });
    expect(overBudget).toEqual({ ok: false, error: TOO_FAST });
  });
});

describe("D-121 — the budget follows the GROUP across a link regeneration", () => {
  it("does not hand a fresh budget to a token minted for the same group", async () => {
    // Burn the whole link budget under the OLD token.
    for (let i = 0; i < RSVP_MAX; i++) {
      const res = await submitRsvp(TOKEN_REGEN, { name: `Early ${i}`, answer: "no" });
      expect(res.ok).toBe(true);
    }
    expect(await submitRsvp(TOKEN_REGEN, { name: "Blocked", answer: "no" })).toEqual({
      ok: false,
      error: TOO_FAST,
    });

    // The organizer mints a brand-new credential for the SAME group.
    await login(ORG_EMAIL);
    const regen = await regenerateLink("grp_rrl_3");
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;
    expect(regen.accessToken).not.toBe(TOKEN_REGEN);

    // …and answers as a guest again. If the budget were keyed on the TOKEN this would be a fresh 30;
    // keyed on the resolved group id it is the same exhausted bucket. That is the whole point.
    sessionHeaders.cookie = "";
    const afterRegen = await submitRsvp(regen.accessToken, { name: "Late Larry", answer: "no" });
    expect(afterRegen).toEqual({ ok: false, error: TOO_FAST });

    // POSITIVE CONTROL: the new token genuinely resolves — the refusal above is the BUDGET talking,
    // not a dead link. A different group is unaffected by any of this.
    const other = await submitRsvp(TOKEN_CONTROL, { name: "Other Otto", answer: "no" });
    expect(other.ok).toBe(true);

    // …and the OLD token is now indistinguishable from one that never existed (T-08-17).
    expect(await submitRsvp(TOKEN_REGEN, { name: "Stale Sam", answer: "no" })).toEqual({
      ok: false,
      error: INVITE_INACTIVE,
    });
  });
});
