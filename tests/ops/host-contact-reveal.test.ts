// OPS-06 / D-257 (PM-E) / D-271 / D-72 / T-18.1-1301…1306 — THE CONTACT REVEAL, MEASURED.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS FOR: THE HALF OF OPS-06 THAT IS ABOUT THE RECORD
// ════════════════════════════════════════════════════════════════════════════════════════════════
// "Ops can reach a host" is `tests/ops/ops-queue-row.test.tsx`'s subject — the affordance, its three
// states and the two facts it renders. THIS file is the other clause, which is the one that makes the
// requirement worth having: **every reach is on the record, and the record says who looked at whom
// and never at what.**
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY EVERY TRAIL ASSERTION HERE IS A `SELECT`, AND NEVER A RETURN VALUE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `tests/ops/ops-audit.test.ts`'s rule, inherited verbatim because the reason is unchanged:
// `recordAudit` SWALLOWS ITS OWN INSERT FAILURE BY DESIGN (`src/lib/audit.ts:83-90`), so an action
// returning `{ ok: true, contact }` is evidence that the READ happened and evidence of NOTHING AT ALL
// about the row. An implementation that dropped `recordAudit` entirely would satisfy every
// return-value assertion in this file, and OPS-06 would be silently absent while the feature worked.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE THREE PROPERTIES THAT NEEDED AN INSTRUMENT THIS FILE HAD TO BUILD
// ════════════════════════════════════════════════════════════════════════════════════════════════
//   1. "REFUSED BEFORE ANY READ" (T-18.1-1301). An absence of a returned value does not prove a read
//      did not happen — the action could read, then refuse. So `@/lib/db` is handed to the action
//      through a PROXY that counts `select` calls, and the non-staff cases assert that count is
//      ZERO. The proxy binds every method back to the real connection rather than to itself, because
//      handing a Drizzle method a proxied `this` is how that idiom breaks.
//   2. "WITHOUT CONSUMING ANYBODY'S BUDGET" (the stated reason the guard is FIRST). The limiter is
//      stubbed so its KEY and its ARGUMENTS are observable, and the non-staff cases assert it was
//      never called at all. This is what makes the ordering a security property rather than a style
//      preference: a caller who is not staff cannot spend the budget of a staff member whose id they
//      guessed, and cannot learn from a refusal whether the ids they sent exist.
//   3. "NEVER WHAT THEY WERE" (D-72). The fixture host's email and phone are UNMISTAKABLE strings,
//      and the assertion is on `JSON.stringify` of the WHOLE audit row — the
//      `tests/ops/reject-reason.test.ts:299-325` idiom — so a value cannot slip through a field the
//      test forgot to look at.
//
// ⚠ AND EVERY REFUSAL CASE IS PAIRED WITH A POSITIVE CONTROL IN THE SAME FILE. Four of the claims
// below are absences (no row, no read, no limiter call), and an action hardcoded to refuse everybody
// satisfies all four perfectly. Case 3 is the control: the same call, the same id, one session
// different, returns the values and writes the row.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// HARNESS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `tests/ops/ops-audit.test.ts`'s: the REAL action driven through `vi.doMock` against an isolated
// schema, with a REAL Better Auth session so the `role` additionalField under test is the one the app
// ships. `next/navigation`'s `notFound` is mocked to raise a NAMED error, because the real one raises
// a Next-internal digest only the framework can interpret (`tests/ops/staff-guard.test.ts:101`).
//
// ⚠ `next/cache` IS NOT MOCKED, AND ITS ABSENCE IS A PROPERTY. The five decision actions revalidate
// `/ops` because they change what the queue holds; a reveal changes nothing, so it must not. If a
// later edit adds `revalidatePath` to this action, every case in this file fails on the cache rather
// than passing quietly — which is the correct outcome, because a read that invalidates a route is a
// read that has started doing something else.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// MUTATION SCORE — MEASURED 2 September 2026, plan 18.1-13, restored from HEAD after each
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Every claim below was mutated in `src/app/actions/ops-contact.ts` and watched to redden a NAMED
// case, because a guard that nothing measures is a guard nothing is holding:
//
//   • ok-branch `recordAudit` DELETED            → cases 4, 5, 7 red ("expected [] to have a
//                                                  length of 1 but got +0")
//   • `meta` given the host's `email` (D-72)     → case 7 red, on the SERIALISED row
//   • budget keyed on `parsed.data.userId`
//     instead of `staff.id`                      → case 9 red
//   • a `db.select` inserted ABOVE the guard      → cases 1, 2, 9, 10 red
//   • a `rateLimit` call inserted ABOVE the guard → cases 1, 2, 3, 9, 10 red
//
// ⚠ AND ONE MUTATION LEFT THIS FILE ENTIRELY GREEN, WHICH IS THE FINDING WORTH RECORDING. Swapping
// the first two statements — `safeParse` above `requireStaff()` — changed nothing here, because the
// guard still preceded every AUDIT, every READ and every LIMITER call, which are the only three
// things this file can see. Two facts follow, and both are load-bearing:
//
//   1. THE DATA FLOW CARRIES PART OF THE ORDERING BY ITSELF. Every audited denial needs
//      `actorId: staff.id`, so no branch that writes a row can precede the guard without failing to
//      compile. That is a real property and it is why the dangerous mutations are the ones that add
//      a read or a limiter call, not the one that moves the parse.
//   2. THE *SYNTACTIC* "FIRST STATEMENT" CLAIM IS NOT THIS FILE'S TO HOLD. It belongs to
//      `tests/design/ops-guard-coverage.test.ts`'s `guardsFirst()`, which is build-blocking and
//      which DID redden on that same swap ("src/app/actions/ops-contact.ts:revealHostContact"). The
//      two instruments hold different halves on purpose; neither is redundant, and a reader who
//      assumed this file covered the syntactic half would be trusting it for something it cannot see.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { and, eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { audit, user } from "@/lib/db/schema";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const OPS_HOST = "ops.localhost:3000";
const OPS_ORIGIN = "http://ops.localhost:3000";
const requestHeaders: { cookie: string; host: string | null; origin: string | null } = {
  cookie: "",
  host: OPS_HOST,
  origin: OPS_ORIGIN,
};
vi.mock("next/headers", () => ({
  headers: async () => {
    const value = new Headers({ cookie: requestHeaders.cookie });
    if (requestHeaders.host !== null) value.set("host", requestHeaders.host);
    if (requestHeaders.origin !== null) value.set("origin", requestHeaders.origin);
    return value;
  },
}));

const NOT_FOUND = "NEXT_NOT_FOUND";
const PASSWORD = "averylongpassword";
const STAFF_EMAIL = "hcr_staff@example.com";
const CIVILIAN_EMAIL = "hcr_civilian@example.com";

/** The action name the module writes under. One string, so a rename fails here rather than drifts. */
const REVEAL_ACTION = "ops_reveal_host_contact";

/**
 * THE FIXTURE HOST'S CONTACT DETAILS, chosen to be unmistakable in a serialised blob (D-72).
 *
 * Both are what a leak would look like: a real-shaped address and a real-shaped PH mobile number. The
 * D-72 case searches the whole row for each of them AND for the bare local-part and the bare digits,
 * so a partial or re-formatted copy is caught too.
 */
const LEAK_EMAIL = "unmistakable.leak.canary@fitout-leak.test";
const LEAK_PHONE = "+63 917 000 4242";

/** ⚠ `src/lib/validation/ops.ts`'s `ID_MAX` is 128, so 129 is the first refused length. */
const OVERLONG_ID = "x".repeat(129);

const rateLimitCalls: Array<{ key: string; opts: RateLimitOptions }> = [];
let rateLimitAllows = true;
const fakeRateLimit = (key: string, opts: RateLimitOptions): RateLimitResult => {
  rateLimitCalls.push({ key, opts });
  return rateLimitAllows ? { ok: true } : { ok: false, retryAfter: 42 };
};

/** Instrument 1 — see the header. Counts the action's reads without changing what they read. */
let dbSelects = 0;
function countingDb<T extends object>(real: T): T {
  return new Proxy(real, {
    get(target, prop) {
      if (prop === "select") dbSelects += 1;
      const value = Reflect.get(target, prop) as unknown;
      // BOUND TO THE REAL TARGET, never to the proxy. A Drizzle method invoked with a proxied `this`
      // reaches for internals through the trap and the idiom breaks in a way that reads like a bug
      // in the action rather than in the harness.
      return typeof value === "function" ? (value as (...a: never[]) => unknown).bind(target) : value;
    },
  });
}

let testDb: TestDb;
let testAuth: TestAuth;
let staffId: string;
let authSessionReads = 0;

type OpsContactActions = typeof import("@/app/actions/ops-contact");
let revealHostContact: OpsContactActions["revealHostContact"];

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  requestHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** A host row carrying whichever contact details the case is about. `phone: null` is a real state. */
async function seedHost(id: string, email: string, phone: string | null): Promise<string> {
  await testDb.db.insert(user).values({
    id,
    name: id,
    email,
    firstName: "Seed",
    emailVerified: true,
    canHost: true,
    phone,
  });
  return id;
}

/** THE INSTRUMENT. Every trail claim in this file goes through here, never through a return value. */
async function trailRows(outcome: "ok" | "denied") {
  return testDb.db
    .select()
    .from(audit)
    .where(and(eq(audit.action, REVEAL_ACTION), eq(audit.outcome, outcome)));
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: STAFF_EMAIL,
    password: PASSWORD,
    name: "Ops Staff",
    firstName: "Ola",
    intent: "book",
  });
  await signUp(testAuth, {
    email: CIVILIAN_EMAIL,
    password: PASSWORD,
    name: "Civ Ilian",
    firstName: "Cai",
    intent: "book",
  });

  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  staffId = ids.find((r) => r.email === STAFF_EMAIL)!.id;

  // The CLI's privileged Drizzle flip — never `auth.api.updateUser`, which `input: false` makes
  // structurally incapable of writing this field (tests/auth/ops-role.test.ts measures that).
  await testDb.db.update(user).set({ role: "staff" }).where(eq(user.id, staffId));

  vi.doMock("@/lib/auth", () => ({
    auth: {
      api: {
        getSession: async (...args: Parameters<typeof testAuth.api.getSession>) => {
          authSessionReads += 1;
          return testAuth.api.getSession(...args);
        },
      },
    },
  }));
  vi.doMock("@/lib/db", () => ({ db: countingDb(testDb.db) }));
  vi.doMock("next/navigation", () => ({
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  }));
  vi.doMock("@/lib/rate-limit", () => ({ rateLimit: fakeRateLimit }));
  vi.resetModules();
  ({ revealHostContact } = await import("@/app/actions/ops-contact"));
}, 120_000);

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/navigation");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(async () => {
  rateLimitAllows = true;
  rateLimitCalls.length = 0;
  dbSelects = 0;
  authSessionReads = 0;
  requestHeaders.host = OPS_HOST;
  requestHeaders.origin = OPS_ORIGIN;
  await login(STAFF_EMAIL);
});

describe("T-20-14 — contact disclosure is bound to the exact ops request authority", () => {
  it.each([
    ["missing-host", null, OPS_ORIGIN],
    ["malformed-host", `${OPS_HOST}/ops`, OPS_ORIGIN],
    ["marketplace", "localhost:3000", "http://localhost:3000"],
    ["mismatched-origin", OPS_HOST, "http://ops.localhost:3001"],
  ])("refuses %s before actor, PII, limiter, or audit work", async (label, host, origin) => {
    const target = await seedHost(`hcr_origin_${label}`, `${label}@fitout.test`, "0917 000 1414");
    const trailBefore = await testDb.db.select().from(audit);
    dbSelects = 0;

    requestHeaders.host = host;
    requestHeaders.origin = origin;

    await expect(revealHostContact({ userId: target })).rejects.toThrow(NOT_FOUND);
    expect(authSessionReads).toBe(0);
    expect(dbSelects).toBe(0);
    expect(rateLimitCalls).toHaveLength(0);
    expect(await testDb.db.select().from(audit)).toHaveLength(trailBefore.length);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 1 — THE STAFF GATE IS FIRST, AND "FIRST" IS MEASURABLE (T-18.1-1301)
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("OPS-06 — a non-staff caller is refused before the parse, the budget and the read", () => {
  it("case 1 — a signed-in NON-STAFF caller gets notFound(), reads nothing, spends nothing", async () => {
    const host = await seedHost("hcr_h1", "hcr_h1@fitout.test", "0917 555 0001");
    await login(CIVILIAN_EMAIL);
    dbSelects = 0;
    rateLimitCalls.length = 0;

    await expect(revealHostContact({ userId: host })).rejects.toThrow(NOT_FOUND);

    // NOT A SENTENCE. D-219: a distinguishable refusal is an existence oracle, so the reveal must
    // answer exactly what a URL nobody ever routed answers.
    expect(
      dbSelects,
      "the action read the database before refusing a non-staff caller. `requireStaff()` must be " +
        "the FIRST statement: a caller who is not staff must not be able to make the server look " +
        "anybody up, whatever it does with the answer afterwards.",
    ).toBe(0);
    expect(
      rateLimitCalls,
      "the action consumed a rate-limit bucket for a non-staff caller. Keyed on the authenticated " +
        "staff id, that means a stranger can exhaust the budget of a staff member whose id they " +
        "guessed — which is the stated reason the guard is before the limiter and not after it.",
    ).toEqual([]);
    expect(
      [...(await trailRows("ok")), ...(await trailRows("denied"))],
      "a non-staff refusal wrote a trail row. There is no authenticated actor to attribute one to, " +
        "and `audit.actor_id` is NOT NULL precisely so a row can never claim an actor it has not got.",
    ).toEqual([]);
  });

  it("case 2 — a SIGNED-OUT caller is refused identically, and just as early", async () => {
    const host = await seedHost("hcr_h2", "hcr_h2@fitout.test", "0917 555 0002");
    requestHeaders.cookie = "";
    dbSelects = 0;
    rateLimitCalls.length = 0;

    await expect(revealHostContact({ userId: host })).rejects.toThrow(NOT_FOUND);
    expect(dbSelects).toBe(0);
    expect(rateLimitCalls).toEqual([]);
    expect([...(await trailRows("ok")), ...(await trailRows("denied"))]).toEqual([]);
  });

  it("case 3 — THE POSITIVE CONTROL: the same call, as staff, returns both values", async () => {
    // Without this the three absences above are satisfied by an action hardcoded to refuse
    // everybody — which would pass cases 1 and 2 and ship a feature that does not exist.
    const host = await seedHost("hcr_h3", "hcr_h3@fitout.test", "0917 555 0003");

    const res = await revealHostContact({ userId: host });

    expect(res).toEqual({
      ok: true,
      contact: { email: "hcr_h3@fitout.test", phone: "0917 555 0003" },
    });
    expect(dbSelects, "the staff path did not read the database at all").toBeGreaterThan(0);
    expect(rateLimitCalls).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 2 — EVERY REACH IS ON THE RECORD (OPS-06's actual clause)
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("OPS-06 — one reveal, exactly one trail row, read back out of the table", () => {
  it("case 4 — the row carries the AUTHENTICATED staff id and the host it was about", async () => {
    const host = await seedHost("hcr_h4", "hcr_h4@fitout.test", "0917 555 0004");

    expect(await revealHostContact({ userId: host })).toEqual({
      ok: true,
      contact: { email: "hcr_h4@fitout.test", phone: "0917 555 0004" },
    });

    const rows = (await trailRows("ok")).filter(
      (r) => (r.meta as { userId?: string })?.userId === host,
    );
    expect(
      rows,
      "a reveal wrote something other than exactly one trail row. Two rows would double-count a " +
        "single disclosure; none would mean the reveal happened off the record, which is the one " +
        "thing OPS-06 forbids.",
    ).toHaveLength(1);

    // NOT AN ID THE CALLER SUPPLIED — the action takes no actor argument, and this is the phase's
    // whole answer to `audit.resolved_by` having been "asserted, not authenticated".
    expect(rows[0].actorId).toBe(staffId);
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it("case 5 — a host with NO phone reveals `null` and is still recorded once", async () => {
    // `user.phone` is nullable and self-declared at submission (D-268). A missing phone is not a
    // failure and must not be a reason to skip the record: the operator still saw the address.
    const host = await seedHost("hcr_h5", "hcr_h5@fitout.test", null);

    expect(await revealHostContact({ userId: host })).toEqual({
      ok: true,
      contact: { email: "hcr_h5@fitout.test", phone: null },
    });

    const rows = (await trailRows("ok")).filter(
      (r) => (r.meta as { userId?: string })?.userId === host,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].actorId).toBe(staffId);
  });

  it("case 6 — a host that has LEFT is a calm refusal, audited, with no row invented", async () => {
    const res = await revealHostContact({ userId: "hcr_never_existed" });

    expect(res.ok).toBe(false);
    const rows = (await trailRows("denied")).filter(
      (r) => (r.meta as { userId?: string })?.userId === "hcr_never_existed",
    );
    expect(
      rows,
      "a reveal that found nothing wrote no denial row. A refusal is the branch an attacker " +
        "produces, so a trail that records only successes records exactly the wrong half.",
    ).toHaveLength(1);
    expect(rows[0].actorId).toBe(staffId);
    expect((rows[0].meta as { reason?: string }).reason).toBe("no_such_host");
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 3 — D-72: WHO LOOKED AT WHOM, NEVER AT WHAT (T-18.1-1303)
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-72 — no contact value reaches the durable trail", () => {
  it("case 7 — the SERIALISED row contains neither value, and its meta has one key", async () => {
    const host = await seedHost("hcr_leak", LEAK_EMAIL, LEAK_PHONE);

    const res = await revealHostContact({ userId: host });
    expect(res).toEqual({ ok: true, contact: { email: LEAK_EMAIL, phone: LEAK_PHONE } });

    const rows = (await trailRows("ok")).filter(
      (r) => (r.meta as { userId?: string })?.userId === host,
    );
    expect(rows).toHaveLength(1);

    // THE WHOLE ROW, SERIALISED. Not field by field: the point of this shape is that a value landing
    // somewhere the test did not think to look still fails. (`reject-reason.test.ts` case 8's idiom,
    // itself from `grant-cli.test.ts` case 3.)
    const serialised = JSON.stringify(rows[0]);
    expect(
      serialised,
      "the host's EMAIL is in the durable audit row. `audit.meta` is a jsonb column under an " +
        "indefinite retention policy, so a value written there outlives every reason for writing " +
        "it: a trail of who-looked becomes a second permanent copy of the data the reveal rations.",
    ).not.toContain(LEAK_EMAIL);
    expect(serialised, "the host's PHONE is in the durable audit row").not.toContain(LEAK_PHONE);
    // Partial and re-formatted copies too — a local-part, a bare digit string, a bare domain.
    expect(serialised).not.toContain("unmistakable.leak.canary");
    expect(serialised).not.toContain("fitout-leak.test");
    expect(serialised).not.toContain("9170004242");
    expect(serialised).not.toContain("917 000 4242");
    // NO ADDRESS-SHAPED STRING OF ANY KIND, which also covers a value this fixture did not seed.
    expect(serialised).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);

    // WHAT IS RECORDED: the host's id, and nothing else. Asserted as the exact KEY SET, so a field
    // added later is a visible failure here rather than a silent widening of what a trail holds.
    expect(
      Object.keys(rows[0].meta as Record<string, unknown>),
      "the ok-branch meta grew a key. A reveal row records THAT staff member X looked at host Y's " +
        "contact details and never WHAT THEY WERE — ids and enum-shaped values only (D-72).",
    ).toEqual(["userId"]);
  });

  it("case 8 — the leak assertions can actually fail, so case 7's absences mean something", async () => {
    // Guard the guard. Every assertion above is a `not.toContain`, and a fixture whose values never
    // appeared anywhere would satisfy all of them against an action that wrote the email verbatim.
    const decoy = JSON.stringify({
      actorId: staffId,
      meta: { userId: "hcr_leak", email: LEAK_EMAIL, phone: LEAK_PHONE },
    });
    expect(decoy).toContain(LEAK_EMAIL);
    expect(decoy).toContain(LEAK_PHONE);
    expect(decoy).toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 4 — THE BURST GUARD AND THE BOUND (T-18.1-1306)
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("OPS-06 — the refusals that are not about standing", () => {
  it("case 9 — the rate limit refuses, keyed on the staff id, and audits its own denial", async () => {
    const host = await seedHost("hcr_h9", "hcr_h9@fitout.test", "0917 555 0009");
    rateLimitAllows = false;

    const res = await revealHostContact({ userId: host });
    expect(res.ok).toBe(false);

    // KEYED ON THE AUTHENTICATED IDENTITY AND NEVER ON AN INPUT. `src/lib/rate-limit.ts` states the
    // rule at the module: a caller-chosen key space is memory exhaustion against the whole process.
    expect(rateLimitCalls).toHaveLength(1);
    expect(rateLimitCalls[0].key).toBe(`ops-reveal-host-contact:${staffId}`);
    expect(rateLimitCalls[0].opts).toEqual({ window: 60, max: 30 });

    // AUDITED, so a flood is non-repudiable — read back out of the table like every other claim.
    const rows = (await trailRows("denied")).filter(
      (r) => (r.meta as { reason?: string })?.reason === "rate_limit",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].actorId).toBe(staffId);
    expect((rows[0].meta as { userId?: string }).userId).toBe(host);

    // AND NO READ HAPPENED. A refused burst must not still cost a lookup, or the limiter protects
    // the response and not the database.
    expect(dbSelects).toBe(0);
  });

  it("case 10 — an over-long id is refused by the bound, AFTER the staff gate and not before", async () => {
    // The ORDERING is the claim, and it takes both halves to make it. As a non-staff caller the same
    // argument gets `notFound()` with NO audit row — so the bound is not what refused them, and they
    // learned nothing. As staff it gets the audited `invalid_input` denial.
    await login(CIVILIAN_EMAIL);
    dbSelects = 0;
    rateLimitCalls.length = 0;
    await expect(revealHostContact({ userId: OVERLONG_ID })).rejects.toThrow(NOT_FOUND);
    const nonStaffInvalid = (await trailRows("denied")).filter(
      (r) => (r.meta as { reason?: string })?.reason === "invalid_input",
    );
    expect(
      nonStaffInvalid,
      "an over-long id from a NON-STAFF caller was audited as invalid input, which means the parse " +
        "ran before the gate did. The bound exists because the value becomes a rate-limiter key; " +
        "reaching it at all is what the guard's position is supposed to prevent.",
    ).toEqual([]);
    expect(dbSelects).toBe(0);
    expect(rateLimitCalls).toEqual([]);

    await login(STAFF_EMAIL);
    const res = await revealHostContact({ userId: OVERLONG_ID });
    expect(res.ok).toBe(false);

    const rows = (await trailRows("denied")).filter(
      (r) => (r.meta as { reason?: string })?.reason === "invalid_input",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].actorId).toBe(staffId);
    // ⚠ AND THE RAW ARGUMENT IS NOT IN THE ROW. An unbounded caller-chosen value in a durable jsonb
    // column is the second half of the reason the bound exists at all.
    expect(JSON.stringify(rows[0])).not.toContain(OVERLONG_ID);
    expect(Object.keys(rows[0].meta as Record<string, unknown>)).toEqual(["reason"]);
    // Refused BEFORE the limiter, so a malformed argument cannot drain a real operator's budget.
    expect(rateLimitCalls).toEqual([]);
    expect(dbSelects).toBe(0);
  });

  it("case 11 — the two refusal sentences are the UI-SPEC's, and they are DIFFERENT", async () => {
    // The single place these strings are checked. Transcribed from 18.1-UI-SPEC § Surface 4 § The
    // refusal region; they land verbatim in the island's one live region, so a change here is a copy
    // decision and belongs in that document first.
    const READ_FAILED = "Those contact details couldn't be shown. Reload the queue and try again.";
    const RATE_LIMITED = "Too many contact look-ups at once. Give it a moment and try again.";

    const missing = await revealHostContact({ userId: "hcr_also_never_existed" });
    expect(missing).toEqual({ ok: false, error: READ_FAILED });

    rateLimitAllows = false;
    const flooded = await revealHostContact({ userId: "hcr_also_never_existed" });
    expect(flooded).toEqual({ ok: false, error: RATE_LIMITED });

    // TWO CONDITIONS, TWO SENTENCES. An operator who is being rate-limited must not be told to
    // reload the queue, which is advice that cannot work and would have them pressing harder.
    expect(READ_FAILED).not.toBe(RATE_LIMITED);

    // …and a malformed argument collapses into the READ-FAILED sentence deliberately, so a caller
    // cannot tell a bad id from an id that does not resolve. Same sentence, on purpose.
    rateLimitAllows = true;
    const malformed = await revealHostContact({ userId: OVERLONG_ID });
    expect(malformed).toEqual({ ok: false, error: READ_FAILED });
  });
});
