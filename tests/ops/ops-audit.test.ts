// OPS-03 / D-218 / T-18-0501 / T-18-0502 — every ops decision records an AUTHENTICATED actor.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY EVERY ASSERTION IN THIS FILE IS A `SELECT`, AND NEVER A RETURN VALUE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `recordAudit` SWALLOWS ITS OWN INSERT FAILURE BY DESIGN — it is awaited at 57 call sites, many of
// them inside `catch` blocks on money paths, and its header states the tradeoff plainly: losing a
// trail row is acceptable, losing the ACK is not. So an action returning `{ ok: true }` is evidence
// that the DECISION was recorded and evidence of NOTHING about the trail row. OPS-03 is a claim
// about the row, so every case here reads the row back out of the table.
//
// This is the same rule 18-01 established for the CLI grant and for the same reason. It is not
// belt-and-braces: an implementation that dropped `recordAudit` entirely would pass a return-value
// test in every case, and the phase's whole answer to `audit.resolved_by` being "asserted, not
// authenticated" would be silently absent.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// BOTH BRANCHES, FOR ALL FIVE ACTIONS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// A denial is the branch an attacker produces, so a trail that only records successes records
// exactly the wrong half. Each action is exercised on:
//   - the ALLOW branch (the decision lands, `outcome: "ok"`), and
//   - the DENY branch (a stale target the guards-in-the-WHERE reject, `outcome: "denied"`),
// and in both cases the row's `actor_id` must equal the id the STAFF GATE returned for the signed-in
// session — not an id the caller supplied, because no action takes one.
//
// Plus three properties that are not per-action:
//   - T-18-0501: a NON-STAFF caller is refused BEFORE any write, no domain row moves, and no trail
//     row appears. Paired with a positive control, so the case cannot pass against an action
//     hardcoded to refuse everybody.
//   - T-18-0505: the rate-limit refusal is ITSELF audited, keyed on the authenticated identity.
//   - T-18-0506: an unregistered verification provider fails CLOSED — the host is NOT approved and
//     the denial is recorded.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// HARNESS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The REAL actions driven through the `vi.doMock` idiom against an isolated schema (the
// tests/payments/host-cancel.test.ts shape), with a REAL Better Auth session (the
// tests/ops/staff-guard.test.ts shape) so the `role` additionalField under test is the one the app
// ships. `next/navigation`'s `notFound` is mocked to raise a NAMED error, because the real one
// raises a Next-internal digest only the framework can interpret. The rate limiter is stubbed so its
// key and budget are OBSERVABLE and so a file that makes ~20 privileged calls as one staff member
// does not start measuring the limiter instead of the actions.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { and, eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { audit, hostVerification, listing, listingReview, user } from "@/lib/db/schema";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";
import { HOST_REJECT_REASONS, LISTING_REJECT_REASONS } from "@/lib/validation/ops";

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const NOT_FOUND = "NEXT_NOT_FOUND";
const PASSWORD = "averylongpassword";
const STAFF_EMAIL = "oa_staff@example.com";
const CIVILIAN_EMAIL = "oa_civilian@example.com";

const rateLimitCalls: Array<{ key: string; opts: RateLimitOptions }> = [];
let rateLimitAllows = true;
const fakeRateLimit = (key: string, opts: RateLimitOptions): RateLimitResult => {
  rateLimitCalls.push({ key, opts });
  return rateLimitAllows ? { ok: true } : { ok: false, retryAfter: 42 };
};

let testDb: TestDb;
let testAuth: TestAuth;
let staffId: string;
let civilianId: string;

type OpsActions = typeof import("@/app/actions/ops-review");
let approveHost: OpsActions["approveHost"];
let rejectHost: OpsActions["rejectHost"];
let suspendHost: OpsActions["suspendHost"];
let approveListing: OpsActions["approveListing"];
let rejectListing: OpsActions["rejectListing"];

const HOST_REASON = HOST_REJECT_REASONS[0];
const LISTING_REASON = LISTING_REJECT_REASONS[0];

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** A host row at a chosen verification status. `null` ⇒ user only, no verification row at all. */
async function seedHost(
  id: string,
  status: "unverified" | "pending" | "approved" | "rejected" | "grandfathered" | "suspended" | null,
): Promise<string> {
  await testDb.db.insert(user).values({
    id,
    name: id,
    email: `${id}@fitout.test`,
    firstName: "Seed",
    emailVerified: true,
    canHost: true,
  });
  if (status !== null) {
    await testDb.db
      .insert(hostVerification)
      .values({ userId: id, status, provider: "manual" });
  }
  return id;
}

async function seedListing(
  id: string,
  hostId: string,
  reviewState: "pending" | "approved" | "rejected" | "grandfathered",
): Promise<string> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    reviewState,
  });
  return id;
}

/** THE INSTRUMENT. Every OPS-03 claim in this file goes through here, never through a return value. */
async function trailRows(action: string, outcome: "ok" | "denied" | "needs_attention") {
  return testDb.db
    .select()
    .from(audit)
    .where(and(eq(audit.action, action), eq(audit.outcome, outcome)));
}

async function verificationStatus(userId: string): Promise<string | null> {
  const [row] = await testDb.db
    .select({ status: hostVerification.status, reason: hostVerification.reason })
    .from(hostVerification)
    .where(eq(hostVerification.userId, userId));
  return row?.status ?? null;
}

async function reviewState(listingId: string): Promise<string | null> {
  const [row] = await testDb.db
    .select({ state: listing.reviewState })
    .from(listing)
    .where(eq(listing.id, listingId));
  return row?.state ?? null;
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
  civilianId = ids.find((r) => r.email === CIVILIAN_EMAIL)!.id;

  // The CLI's privileged Drizzle flip — never `auth.api.updateUser`, which `input: false` makes
  // structurally incapable of writing this field (tests/auth/ops-role.test.ts measures that).
  await testDb.db.update(user).set({ role: "staff" }).where(eq(user.id, staffId));

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/navigation", () => ({
    // The real `notFound` raises a Next-internal digest only the framework can interpret; the shipped
    // test idiom (tests/ops/staff-guard.test.ts:101) replaces it with a NAMED error so a case can
    // tell "the gate refused" apart from any other failure.
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  }));
  vi.doMock("@/lib/rate-limit", () => ({ rateLimit: fakeRateLimit }));
  vi.resetModules();
  ({ approveHost, rejectHost, suspendHost, approveListing, rejectListing } = await import(
    "@/app/actions/ops-review"
  ));
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
  delete process.env.FITOUT_VERIFICATION_PROVIDER;
  await login(STAFF_EMAIL);
});

describe("OPS-03 — the ALLOW branch of every action writes an authenticated trail row", () => {
  it("case 1 — approveHost", async () => {
    const host = await seedHost("oa_h_approve", "pending");
    const res = await approveHost({ userId: host });

    // The decision landed on the DOMAIN table…
    expect(await verificationStatus(host)).toBe("approved");
    // …and — the OPS-03 claim — a trail row exists carrying the AUTHENTICATED staff id.
    const rows = await trailRows("ops_approve_host", "ok");
    const row = rows.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(row, "no trail row was written for the approval").toBeDefined();
    expect(row!.actorId).toBe(staffId);
    expect(res).toEqual({ ok: true });
  });

  it("case 2 — rejectHost", async () => {
    const host = await seedHost("oa_h_reject", "pending");
    const res = await rejectHost({ userId: host, reason: HOST_REASON });

    expect(await verificationStatus(host)).toBe("rejected");
    const rows = await trailRows("ops_reject_host", "ok");
    const row = rows.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(row, "no trail row was written for the rejection").toBeDefined();
    expect(row!.actorId).toBe(staffId);
    expect(res).toEqual({ ok: true });
  });

  it("case 3 — suspendHost (ENF-01's default lever)", async () => {
    const host = await seedHost("oa_h_suspend", "approved");
    const res = await suspendHost({ userId: host, reason: HOST_REASON });

    // D-222: suspension rides the SAME enum the sell-gate reads, so this one write blocks new
    // bookings with no second check anywhere.
    expect(await verificationStatus(host)).toBe("suspended");
    const rows = await trailRows("ops_suspend_host", "ok");
    const row = rows.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(row, "no trail row was written for the suspension").toBeDefined();
    expect(row!.actorId).toBe(staffId);
    expect(res).toEqual({ ok: true });
  });

  it("case 4 — approveListing, and it closes the OPEN review cycle rather than appending", async () => {
    const host = await seedHost("oa_l_appr_host", "approved");
    const target = await seedListing("oa_l_approve", host, "pending");
    await testDb.db.insert(listingReview).values({
      id: "oa_rev_approve",
      listingId: target,
      state: "pending",
      submittedAt: new Date(Date.UTC(2026, 7, 1, 12)),
    });

    const res = await approveListing({ listingId: target });

    expect(await reviewState(target)).toBe("approved");

    // ONE row for the cycle, decided in place — appending a second would double-count the cycle and
    // reset the D-249 wait clock of anything that came back to pending later.
    const history = await testDb.db
      .select()
      .from(listingReview)
      .where(eq(listingReview.listingId, target));
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("oa_rev_approve");
    expect(history[0].state).toBe("approved");
    expect(history[0].decidedByStaffId).toBe(staffId);
    expect(history[0].decidedAt).not.toBeNull();
    // The original submission time is PRESERVED, not overwritten with the decision time.
    expect(history[0].submittedAt.getTime()).toBe(Date.UTC(2026, 7, 1, 12));

    const rows = await trailRows("ops_approve_listing", "ok");
    const row = rows.find((r) => (r.meta as { listingId?: string })?.listingId === target);
    expect(row, "no trail row was written for the listing approval").toBeDefined();
    expect(row!.actorId).toBe(staffId);
    expect(res).toEqual({ ok: true });
  });

  it("case 5 — rejectListing, and with NO open cycle it OPENS one at the listing's own clock", async () => {
    const host = await seedHost("oa_l_rej_host", "approved");
    const target = await seedListing("oa_l_reject", host, "pending");
    // No listing_review row at all — the grandfathered-into-review shape.
    const res = await rejectListing({ listingId: target, reason: LISTING_REASON });

    expect(await reviewState(target)).toBe("rejected");

    const history = await testDb.db
      .select()
      .from(listingReview)
      .where(eq(listingReview.listingId, target));
    expect(history).toHaveLength(1);
    expect(history[0].state).toBe("rejected");
    expect(history[0].reason).toBe(LISTING_REASON);
    expect(history[0].decidedByStaffId).toBe(staffId);

    const rows = await trailRows("ops_reject_listing", "ok");
    const row = rows.find((r) => (r.meta as { listingId?: string })?.listingId === target);
    expect(row, "no trail row was written for the listing rejection").toBeDefined();
    expect(row!.actorId).toBe(staffId);
    expect(res).toEqual({ ok: true });
  });
});

describe("OPS-03 — the DENY branch of every action writes an authenticated trail row too", () => {
  /**
   * T-18-0508 — a stale decision. Every action's guards live in the WHERE, so a target that has
   * already been decided produces 0 rows, which is the SINGLE calm failure path. Two reviewers
   * clicking Approve on the same row must not have the second one silently overwrite the first.
   */
  it("case 6 — approveHost on an already-approved host", async () => {
    const host = await seedHost("oa_d_approve", "approved");
    const res = await approveHost({ userId: host });

    expect(res.ok).toBe(false);
    expect(await verificationStatus(host)).toBe("approved"); // untouched
    const rows = await trailRows("ops_approve_host", "denied");
    const row = rows.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(row, "the refusal left no trail row").toBeDefined();
    expect(row!.actorId).toBe(staffId);
    expect((row!.meta as { reason?: string }).reason).toBe("not_applicable");
  });

  it("case 7 — rejectHost on a suspended host", async () => {
    const host = await seedHost("oa_d_reject", "suspended");
    const res = await rejectHost({ userId: host, reason: HOST_REASON });

    expect(res.ok).toBe(false);
    expect(await verificationStatus(host)).toBe("suspended");
    const rows = await trailRows("ops_reject_host", "denied");
    const row = rows.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(staffId);
  });

  it("case 8 — suspendHost on an already-suspended host", async () => {
    const host = await seedHost("oa_d_suspend", "suspended");
    const res = await suspendHost({ userId: host, reason: HOST_REASON });

    expect(res.ok).toBe(false);
    const rows = await trailRows("ops_suspend_host", "denied");
    const row = rows.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(staffId);
  });

  it("case 9 — approveListing on a GRANDFATHERED listing is refused (D-211/D-212)", async () => {
    const host = await seedHost("oa_d_lappr_host", "approved");
    const target = await seedListing("oa_d_approve_listing", host, "grandfathered");
    const res = await approveListing({ listingId: target });

    expect(res.ok).toBe(false);
    // D-211: `grandfathered` is FIRST-CLASS and DISTINCT, never quietly promoted to `approved` —
    // promoting it would light the badge (D-212) on a listing nobody checked.
    expect(await reviewState(target)).toBe("grandfathered");
    const rows = await trailRows("ops_approve_listing", "denied");
    const row = rows.find((r) => (r.meta as { listingId?: string })?.listingId === target);
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(staffId);
  });

  it("case 10 — rejectListing on a nonexistent listing", async () => {
    const res = await rejectListing({ listingId: "oa_no_such_listing", reason: LISTING_REASON });

    expect(res.ok).toBe(false);
    const rows = await trailRows("ops_reject_listing", "denied");
    const row = rows.find(
      (r) => (r.meta as { listingId?: string })?.listingId === "oa_no_such_listing",
    );
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(staffId);
  });
});

describe("T-18-0501 — a non-staff caller is refused BEFORE any write", () => {
  it("case 11 — the civilian is refused, nothing moves, and no trail row appears", async () => {
    const host = await seedHost("oa_civ_host", "pending");
    const target = await seedListing("oa_civ_listing", host, "pending");

    const trailBefore = await testDb.db.select().from(audit);

    await login(CIVILIAN_EMAIL);

    // A Server Action is reachable by POST regardless of what UI exists, so this is the shape of the
    // real attack: the action called directly, with a valid target id, by a signed-in non-staff user.
    await expect(approveHost({ userId: host })).rejects.toThrow(NOT_FOUND);
    await expect(rejectHost({ userId: host, reason: HOST_REASON })).rejects.toThrow(NOT_FOUND);
    await expect(suspendHost({ userId: host, reason: HOST_REASON })).rejects.toThrow(NOT_FOUND);
    await expect(approveListing({ listingId: target })).rejects.toThrow(NOT_FOUND);
    await expect(rejectListing({ listingId: target, reason: LISTING_REASON })).rejects.toThrow(
      NOT_FOUND,
    );

    // NO DOMAIN ROW MOVED.
    expect(await verificationStatus(host)).toBe("pending");
    expect(await reviewState(target)).toBe("pending");
    expect(
      await testDb.db.select().from(listingReview).where(eq(listingReview.listingId, target)),
    ).toHaveLength(0);

    // AND NOT ONE TRAIL ROW — the gate runs before the parse, before the rate limit and before any
    // write, so a refused caller consumes nothing and leaves no record to correlate against.
    const trailAfter = await testDb.db.select().from(audit);
    expect(trailAfter).toHaveLength(trailBefore.length);

    // The refusal never consumed anybody's rate-limit budget either.
    expect(rateLimitCalls).toHaveLength(0);

    // POSITIVE CONTROL — without it this whole case passes against actions hardcoded to refuse.
    await login(STAFF_EMAIL);
    const allowed = await approveHost({ userId: host });
    expect(allowed).toEqual({ ok: true });
    expect(await verificationStatus(host)).toBe("approved");
    expect(civilianId).not.toBe(staffId);
  });
});

describe("T-18-0505 / T-18-0506 — the two refusals that are not about the target", () => {
  it("case 12 — the rate-limit refusal is keyed on the AUTHENTICATED id and is itself audited", async () => {
    const host = await seedHost("oa_rl_host", "pending");
    rateLimitAllows = false;

    const res = await suspendHost({ userId: host, reason: HOST_REASON });
    expect(res.ok).toBe(false);

    // Keyed on the staff id — never on IP. `src/lib/rate-limit.ts` states the rule at the module.
    expect(rateLimitCalls).toHaveLength(1);
    expect(rateLimitCalls[0].key).toBe(`ops-suspend-host:${staffId}`);
    expect(rateLimitCalls[0].opts).toEqual({ window: 60, max: 30 });

    // Nothing moved…
    expect(await verificationStatus(host)).toBe("pending");
    // …and the refusal is non-repudiable.
    const rows = await trailRows("ops_suspend_host", "denied");
    const row = rows.find((r) => (r.meta as { reason?: string })?.reason === "rate_limit");
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(staffId);
    expect((row!.meta as { retryAfter?: number }).retryAfter).toBe(42);
  });

  it("case 13 — an UNREGISTERED verification provider fails CLOSED: nobody gets approved", async () => {
    const host = await seedHost("oa_fc_host", "pending");

    // The "config change" half of D-206, mistyped. This is the realistic failure — not a malicious
    // input, a deploy environment with a vendor name nobody registered.
    process.env.FITOUT_VERIFICATION_PROVIDER = "acme-kyc";

    const res = await approveHost({ userId: host });
    expect(res.ok).toBe(false);

    // THE PROPERTY: not approved. An unregistered provider must never resolve to a verified outcome,
    // and the action writes NOTHING rather than writing a verification attributed to a provider that
    // does not exist.
    expect(await verificationStatus(host)).toBe("pending");

    const rows = await trailRows("ops_approve_host", "denied");
    const row = rows.find(
      (r) => (r.meta as { reason?: string })?.reason === "provider_unregistered",
    );
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(staffId);

    // The rate limit was consumed BEFORE the provider was consulted — stated so the ordering is
    // pinned rather than incidental.
    expect(rateLimitCalls.map((c) => c.key)).toEqual([`ops-approve-host:${staffId}`]);

    // CONTROL: the same call with the registry's real provider approves. Without this the case
    // passes against an `approveHost` that never approves anybody.
    delete process.env.FITOUT_VERIFICATION_PROVIDER;
    expect(await approveHost({ userId: host })).toEqual({ ok: true });
    expect(await verificationStatus(host)).toBe("approved");
  });

  it("case 14 — the four verification columns come from the PORT, not from the action", async () => {
    const host = await seedHost("oa_port_host", "pending");
    const before = Date.now();
    await approveHost({ userId: host });

    const [row] = await testDb.db
      .select()
      .from(hostVerification)
      .where(eq(hostVerification.userId, host));

    // D-206's storage contract, as it actually landed: provider + result + checkedAt, and vendorRef
    // untouched because the manual provider has no vendor.
    expect(row.provider).toBe("manual");
    expect(row.result).toBe("pass");
    expect(row.vendorRef).toBeNull();
    expect(row.checkedAt).not.toBeNull();
    expect(row.checkedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(row.decidedByStaffId).toBe(staffId);
  });
});
