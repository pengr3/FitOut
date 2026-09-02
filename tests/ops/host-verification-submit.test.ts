// HVER-06 / HVER-08 — THE THING THAT SUBMITS. `requestHostVerification`, driven for real.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS THE PROOF OF
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Before plan 18.1-07 the only `INSERT INTO host_verification` in the repository was a test seed and
// `drizzle/0026`'s grandfather backfill, so `approveHost` — an `UPDATE … WHERE status IN
// ('pending','unverified')` — had nothing to flip for a host with no row and returned `STALE`
// forever. The ops host queue could not fill, no new host could be approved, and no host created
// after `drizzle/0026` could ever sell. Case 13 is the sentence Phase 18 could not make true.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY EVERY CLAIM HERE IS A `SELECT`, NEVER A RETURN VALUE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Two independent reasons, and both have burnt this repo:
//
//   1. `recordAudit` SWALLOWS ITS OWN INSERT FAILURE by design (`src/lib/audit.ts:83-90`), so an
//      action returning `{ ok: true }` is evidence about the DECISION and evidence of NOTHING about
//      the trail row. `tests/ops/ops-audit.test.ts`'s header states the rule; the `trailRows`
//      instrument below is that file's, copied.
//   2. A refusal's RETURN VALUE cannot distinguish "refused and wrote nothing" from "refused after
//      writing". The whole content of D-266 and D-264 is that a refused submission leaves the row
//      exactly as it was, so every refusal case reads the row back out.
//
// ⚠ AND NO CASE MAY DEPEND ON A REAL CREDENTIAL BEING PRESENT **OR** ABSENT. Every case stubs
// `DIDIT_API_KEY` / `DIDIT_WORKFLOW_ID` with obvious fakes, and `tests/setup.ts` loads `.env.local`
// on this machine — so a case that passed only where the real key exists would be a case nobody else
// can run. Where a guard's fail-closed answer coincides with the answer a broken call would give,
// the case ALSO asserts on `fetchMock.mock.calls.length`, because a return value that matches a
// fail-closed default is vacuous unless the call itself is measured. That defect has shipped here
// before.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// HARNESS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `tests/ops/ops-audit.test.ts:46-215`'s harness verbatim: the real action driven through `vi.doMock`
// against a per-file isolated schema, with a REAL Better Auth session so the session the action reads
// is the one the app ships. The rate limiter is stubbed so it is OBSERVABLE — and, uniquely here,
// the stub can DELEGATE to the real limiter, because case 10's claim is about the real limiter's
// sixth call and not about the test's own arithmetic.

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { and, eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { seedHostVerification } from "../helpers/verification";
import { audit, hostVerification, user, type HostVerificationStatus } from "@/lib/db/schema";
import {
  __resetRateLimit,
  rateLimit as realRateLimit,
  type RateLimitOptions,
  type RateLimitResult,
} from "@/lib/rate-limit";
import {
  HOST_VERIFICATION_EMAIL_UNCONFIRMED,
  HOST_VERIFICATION_NOTHING_CHANGED,
  HOST_VERIFICATION_PHONE_REQUIRED,
  HOST_VERIFICATION_TOO_MANY_ATTEMPTS,
  HOST_VERIFICATION_VENDOR_UNAVAILABLE,
} from "@/lib/host/verification-refusals";

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const NOT_FOUND = "NEXT_NOT_FOUND";
const PASSWORD = "averylongpassword";
const STAFF_EMAIL = "hvs_staff@example.com";
const ACTION = "request_host_verification";

/** Obvious fakes. See the header: no case may depend on a real credential either way. */
const FAKE_API_KEY = "didit-test-key-not-a-credential";
const FAKE_WORKFLOW_ID = "00000000-1111-2222-3333-444444444444";
const APP_ORIGIN = "https://fitout.test";

/** A phone that passes the permissive bound (D-268) and is legible in a fixture. */
const GOOD_PHONE = "+63 917 000 0001";

/**
 * The 201 Didit returns, transcribed from `18.1-RESEARCH.md § R1 § The create-session call` — the
 * same literal `tests/verification/didit-session.test.ts` uses, so the two files cannot disagree
 * about what the vendor sent.
 *
 * ⚠ `status` is `"Not Started"` and there is NO `decision` key, which is exactly why a fresh
 * submission writes `result` and `checked_at` as NULL: the check happens in a hosted flow the host
 * has not opened yet.
 */
const CAPTURED_201 = {
  session_id: "11111111-2222-3333-4444-555555555555",
  session_number: 43762,
  session_token: "3FaJ9wLqX2Mz",
  url: "https://verify.didit.me/en/session/3FaJ9wLqX2Mz",
  vendor_data: "user-123",
  metadata: { user_type: "premium", account_id: "ABC123" },
  status: "Not Started",
  workflow_id: "11111111-2222-3333-4444-555555555555",
  workflow_version: 3,
  callback: "https://example.com/verification/callback",
} as const;

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), { status });
}

/**
 * A fetch stub that hands back a FRESH `Response` on every call.
 *
 * ⚠ MEASURED, AND IT IS NOT A NICETY. `mockResolvedValue(jsonResponse(...))` resolves to the SAME
 * `Response` instance every time, and a `Response` body may be read only once — so the adapter's
 * `res.text()` throws on the second call, the action's catch-all turns that into the vendor refusal,
 * and a case that presses twice sees "we couldn't start the check" for a reason that exists nowhere
 * in the product. Three cases here press more than once; this is what makes them measure the
 * guarded upsert rather than a consumed stream.
 */
function alwaysRespond(body: unknown, status = 201) {
  return vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(body, status)));
}

// ── The observable rate-limit stub, with a REAL mode. ────────────────────────────────────────────
//
// `allow` is the default so a file making ~20 privileged calls does not start measuring the limiter
// instead of the action. `real` exists for case 10 only: "the SIXTH call in 60 seconds is denied" is
// a claim about `src/lib/rate-limit.ts`'s fixed window, and a stub that returns `{ok:false}` on the
// sixth call would be asserting the test's own counter. The delegate is the module instance this
// file imported STATICALLY, before `vi.doMock` replaced the registry — one instance, consistently,
// and `__resetRateLimit()` between cases keeps its module-level Map from leaking across them.
type RateLimitMode = "allow" | "deny" | "real";
const rateLimitCalls: Array<{ key: string; opts: RateLimitOptions }> = [];
let rateLimitMode: RateLimitMode = "allow";
const fakeRateLimit = (key: string, opts: RateLimitOptions): RateLimitResult => {
  rateLimitCalls.push({ key, opts });
  if (rateLimitMode === "real") return realRateLimit(key, opts);
  return rateLimitMode === "allow" ? { ok: true } : { ok: false, retryAfter: 42 };
};

let testDb: TestDb;
let testAuth: TestAuth;
let staffId: string;
let fetchMock: ReturnType<typeof vi.fn>;

type HostActions = typeof import("@/app/actions/host-verification");
let requestHostVerification: HostActions["requestHostVerification"];
type OpsActions = typeof import("@/app/actions/ops-review");
let approveHost: OpsActions["approveHost"];

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/**
 * A REAL Better Auth host at a chosen verification status, signed in and ready to submit.
 *
 * The account goes through `signUp` (so the session the action reads is a real one) and the fixture
 * state goes through the shared `seedHostVerification` helper (so this file and plan 18.1-12's
 * `createDraftListing` fixtures agree about what "a host at `rejected`" means).
 */
async function makeHost(
  slug: string,
  status: HostVerificationStatus | null,
  opts: Parameters<typeof seedHostVerification>[3] = {},
): Promise<{ id: string; email: string }> {
  // ⚠ LOWERCASED. Better Auth normalises the address it stores, so a mixed-case fixture email would
  // never be found by the `eq(user.email, …)` lookup below — an `undefined` row and a confusing
  // TypeError rather than a legible failure.
  const email = (opts.email ?? `hvs_${slug}@example.com`).toLowerCase();
  await signUp(testAuth, {
    email,
    password: PASSWORD,
    name: `Host ${slug}`,
    firstName: "Ho",
    intent: "host",
  });
  const [row] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, email));
  await seedHostVerification(testDb.db, row.id, status, { emailVerified: true, ...opts });
  await login(email);
  return { id: row.id, email };
}

/** THE VERIFICATION ROW, read back out. Every claim about a write or a non-write goes through here. */
async function verificationRow(userId: string) {
  const [row] = await testDb.db
    .select()
    .from(hostVerification)
    .where(eq(hostVerification.userId, userId));
  return row ?? null;
}

/** THE INSTRUMENT. Every audit claim in this file goes through here, never through a return value. */
async function trailRows(action: string, outcome: "ok" | "denied" | "needs_attention") {
  return testDb.db
    .select()
    .from(audit)
    .where(and(eq(audit.action, action), eq(audit.outcome, outcome)));
}

/** Every trail row this action wrote for one actor, both branches. */
async function allTrailRowsFor(actorId: string) {
  return testDb.db
    .select()
    .from(audit)
    .where(and(eq(audit.action, ACTION), eq(audit.actorId, actorId)));
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
  const [staff] = await testDb.db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, STAFF_EMAIL));
  staffId = staff.id;
  // The CLI's privileged Drizzle flip — never `auth.api.updateUser`, which `input: false` makes
  // structurally incapable of writing this field (tests/auth/ops-role.test.ts measures that).
  await testDb.db.update(user).set({ role: "staff" }).where(eq(user.id, staffId));

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/navigation", () => ({
    // The real `notFound` raises a Next-internal digest only the framework can interpret; the
    // shipped idiom (tests/ops/staff-guard.test.ts:101) replaces it with a NAMED error.
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  }));
  vi.doMock("@/lib/rate-limit", () => ({ rateLimit: fakeRateLimit }));
  // The five ops actions invalidate `/ops`; outside a Next request there is no cache store, so the
  // real function throws and every case would fail on the CACHE rather than on what it measures.
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ requestHostVerification } = await import("@/app/actions/host-verification"));
  ({ approveHost } = await import("@/app/actions/ops-review"));
}, 120_000);

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/navigation");
  vi.doUnmock("@/lib/rate-limit");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  rateLimitMode = "allow";
  rateLimitCalls.length = 0;
  __resetRateLimit();
  delete process.env.FITOUT_VERIFICATION_PROVIDER;
  vi.stubEnv("DIDIT_API_KEY", FAKE_API_KEY);
  vi.stubEnv("DIDIT_WORKFLOW_ID", FAKE_WORKFLOW_ID);
  vi.stubEnv("BETTER_AUTH_URL", APP_ORIGIN);
  fetchMock = alwaysRespond(CAPTURED_201);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("HVER-06 — a host can ASK to be verified", () => {
  it("case 1 — a host with NO ROW submits: one pending row, a vendor handle, and no verdict", async () => {
    const host = await makeHost("c1_noRow", null);
    expect(await verificationRow(host.id), "the fixture must start with NO row").toBeNull();

    const res = await requestHostVerification({ phone: GOOD_PHONE });
    expect(res.ok, "a confirmed-email host with a phone must be allowed to ask").toBe(true);
    if (!res.ok) return;

    // The hosted URL is handed BACK and never persisted — it is a redirect target carrying a
    // session token, not a fact about a check.
    expect(res.redirectTo).toBe(CAPTURED_201.url);

    const row = await verificationRow(host.id);
    expect(row).not.toBeNull();
    expect(row!.status).toBe("pending");
    // ⚠ The provider name is read OFF the adapter's result, never composed at the call site. This
    // assertion is on the PERSISTED value, which is what a later reader has to be able to resolve.
    expect(row!.provider).toBe("didit");
    expect(row!.vendorRef).toBe(CAPTURED_201.session_id);
    // NOTHING HAS BEEN DECIDED. A verdict here would be fabricated and `checked_at` would be a
    // timestamp for a check that never ran — the grandfathered-row rule, one moment earlier.
    expect(row!.result).toBeNull();
    expect(row!.checkedAt).toBeNull();
    expect(row!.reason).toBeNull();
    expect(row!.decidedByStaffId).toBeNull();

    // Exactly ONE `host_verification` row exists for this host: it is 1:1 on `user_id`.
    const all = await testDb.db
      .select()
      .from(hostVerification)
      .where(eq(hostVerification.userId, host.id));
    expect(all).toHaveLength(1);

    // D-268 — the self-declared phone landed on the user, trimmed, in the same transaction.
    const [profile] = await testDb.db
      .select({ phone: user.phone })
      .from(user)
      .where(eq(user.id, host.id));
    expect(profile.phone).toBe(GOOD_PHONE);

    // The vendor was actually asked, exactly once, and the burst guard was keyed on the
    // AUTHENTICATED id with the 5/60s budget.
    expect(fetchMock.mock.calls).toHaveLength(1);
    expect(rateLimitCalls).toEqual([
      { key: `verify-submit:${host.id}`, opts: { window: 60, max: 5 } },
    ]);

    // The allow-branch trail row, read BACK OUT of the table.
    const rows = await trailRows(ACTION, "ok");
    const trail = rows.find((r) => (r.meta as { userId?: string })?.userId === host.id);
    expect(trail, "an allow-branch audit row must exist for this host").toBeTruthy();
    expect(trail!.actorId).toBe(host.id);
  });

  it("case 2 — D-269: an UNCONFIRMED email refuses, writes zero rows, and never asks the vendor", async () => {
    const host = await makeHost("c2_unconfirmed", null, { emailVerified: false });

    const res = await requestHostVerification({ phone: GOOD_PHONE });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe(HOST_VERIFICATION_EMAIL_UNCONFIRMED);

    expect(await verificationRow(host.id), "NO row may be written").toBeNull();
    // ⚠ THE CALL IS MEASURED, NOT ONLY THE RETURN. The gate runs BEFORE the vendor, so a refused
    // submission must not spend a billable session — and "no row" alone cannot tell that apart from
    // "asked, then failed to write".
    expect(fetchMock.mock.calls).toHaveLength(0);

    const denied = await trailRows(ACTION, "denied");
    const trail = denied.find(
      (r) =>
        r.actorId === host.id &&
        (r.meta as { reason?: string })?.reason === "email_unconfirmed",
    );
    expect(trail, "the email refusal must be audited").toBeTruthy();
  });

  it("case 3 — D-268: an ABSENT phone refuses, writes zero rows, and never asks the vendor", async () => {
    const host = await makeHost("c3_nophone", null);

    // ⚠ THE TYPESCRIPT SIGNATURE IS DOCUMENTATION, NOT A GATE (src/lib/validation/ops.ts's opening
    // rule): a `"use server"` export is reachable by POST with any body at all, so the absent-field
    // case is real and is driven with the cast the boundary's own header licenses.
    const res = await requestHostVerification({} as { phone: string });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe(HOST_VERIFICATION_PHONE_REQUIRED);

    expect(await verificationRow(host.id)).toBeNull();
    expect(fetchMock.mock.calls).toHaveLength(0);

    const denied = await trailRows(ACTION, "denied");
    const trail = denied.find(
      (r) => r.actorId === host.id && (r.meta as { reason?: string })?.reason === "invalid_input",
    );
    expect(trail, "the phone refusal must be audited").toBeTruthy();
    // ⚠ D-72 — the enum reason ONLY. Not the value, not Zod's issue list (which quotes the input).
    expect(Object.keys(trail!.meta as Record<string, unknown>)).toEqual(["reason"]);
  });

  it("case 4 — D-268: a phone outside the PERMISSIVE bound refuses; a legitimate landline does not", async () => {
    const host = await makeHost("c4_badphone", null);

    // Each of these fails a different clause, so a single loosened check cannot pass them all.
    const rejected = [
      "12345", //                     shorter than the 7-char floor
      "+63 (917) 000 0001", //        parentheses are outside the allowed character set
      "-------", //                   no digit at all
      "+639170000000000000001", //     longer than the 20-char ceiling
      "not a phone number", //        letters
    ];
    for (const phone of rejected) {
      const res = await requestHostVerification({ phone });
      expect(res.ok, `${phone} must be refused`).toBe(false);
      if (!res.ok) expect(res.error).toBe(HOST_VERIFICATION_PHONE_REQUIRED);
    }
    expect(await verificationRow(host.id), "no refused press may write a row").toBeNull();
    expect(fetchMock.mock.calls).toHaveLength(0);

    // THE POSITIVE CONTROL, and it is the point of D-268 rather than a formality: a bound that
    // rejected a real PH landline would be friction on the critical path to selling. `.trim()` runs
    // BEFORE the length checks, so surrounding whitespace cannot smuggle length past the ceiling.
    const accepted = await requestHostVerification({ phone: "  02 8123 4567  " });
    expect(accepted.ok, "a legitimate landline must be accepted").toBe(true);
    const [profile] = await testDb.db
      .select({ phone: user.phone })
      .from(user)
      .where(eq(user.id, host.id));
    expect(profile.phone).toBe("02 8123 4567");
  });
});

describe("HVER-08 — the durable cap, and the four calm 0-row states", () => {
  it("case 5 — D-264: a REJECTED host inside 24h flips 0 rows and nothing is written", async () => {
    const seededUpdatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const seededCreatedAt = new Date(Date.UTC(2026, 0, 5, 9, 0, 0));
    const host = await makeHost("c5_cooling", "rejected", {
      createdAt: seededCreatedAt,
      updatedAt: seededUpdatedAt,
      provider: "didit",
    });

    const res = await requestHostVerification({ phone: GOOD_PHONE });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe(HOST_VERIFICATION_NOTHING_CHANGED);

    const row = await verificationRow(host.id);
    expect(row!.status, "the rejection must survive the refused press").toBe("rejected");
    expect(row!.createdAt.getTime()).toBe(seededCreatedAt.getTime());
    expect(row!.updatedAt.getTime()).toBe(seededUpdatedAt.getTime());
    expect(row!.vendorRef, "a refused press must not write a new vendor handle").toBeNull();

    // The phone was NOT written either: the upsert returns 0 rows before `user.phone` is touched, so
    // a refused submission leaves the profile exactly as it was.
    const [profile] = await testDb.db
      .select({ phone: user.phone })
      .from(user)
      .where(eq(user.id, host.id));
    expect(profile.phone).toBeNull();

    const denied = await trailRows(ACTION, "denied");
    const trail = denied.find(
      (r) => r.actorId === host.id && (r.meta as { reason?: string })?.reason === "not_applicable",
    );
    expect(trail, "the 0-row refusal must be audited").toBeTruthy();
  });

  it("case 6 — FINDING F-1: past the cooldown the row flips to pending AND created_at MOVES", async () => {
    // Submitted in January, rejected, and now asking again — the exact fixture F-1 is about.
    const seededCreatedAt = new Date(Date.UTC(2026, 0, 5, 9, 0, 0));
    const seededUpdatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const host = await makeHost("c6_retry", "rejected", {
      createdAt: seededCreatedAt,
      updatedAt: seededUpdatedAt,
      provider: "didit",
    });

    const res = await requestHostVerification({ phone: GOOD_PHONE });
    expect(res.ok, "past the 24h cooldown the retry must be allowed").toBe(true);

    const row = await verificationRow(host.id);
    expect(row!.status).toBe("pending");
    expect(row!.vendorRef).toBe(CAPTURED_201.session_id);
    // The rejection's own reason and verdict are cleared: this is a NEW check, not a re-reading of
    // the old one.
    expect(row!.result).toBeNull();
    expect(row!.checkedAt).toBeNull();
    expect(row!.reason).toBeNull();

    // ⚠ THE CLAIM. `createdAt` is `.defaultNow()`, which fires on INSERT ONLY, and this was an
    // UPDATE — so without the explicit `created_at = now()` this timestamp would still read January
    // and the host would sit permanently ahead of every first-time submitter in the `created_at ASC`
    // queue. STRICTLY greater, not merely different.
    expect(row!.createdAt.getTime()).toBeGreaterThan(seededCreatedAt.getTime());
    expect(row!.updatedAt.getTime()).toBeGreaterThan(seededUpdatedAt.getTime());
    // And the two instants are the same statement's `now()`, so a reader cannot be shown a wait
    // clock that disagrees with the cooldown clock.
    expect(row!.createdAt.getTime()).toBe(row!.updatedAt.getTime());
  });

  it("case 7 — D-266: a SUSPENDED host flips 0 rows however long ago they were suspended", async () => {
    // ⚠ `updated_at` more than a year in the past, so the case cannot pass by TIMING accident. If
    // `suspended` were admitted by the WHERE, the cooldown clause would let this one straight
    // through — which is exactly the failure the fixture is built to catch.
    const seededUpdatedAt = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const host = await makeHost("c7_suspended", "suspended", {
      updatedAt: seededUpdatedAt,
      createdAt: new Date(Date.UTC(2025, 5, 1, 9, 0, 0)),
    });

    const res = await requestHostVerification({ phone: GOOD_PHONE });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe(HOST_VERIFICATION_NOTHING_CHANGED);

    const row = await verificationRow(host.id);
    expect(row!.status, "a suspension is a named staff member's act; nothing here may reverse it").toBe(
      "suspended",
    );
    expect(row!.updatedAt.getTime()).toBe(seededUpdatedAt.getTime());
    expect(row!.vendorRef).toBeNull();
  });

  it("case 8 — T-18.1-0706: approved, grandfathered, pending and suspended are INDISTINGUISHABLE to the caller", async () => {
    const errors: string[] = [];

    for (const status of ["approved", "grandfathered", "pending", "suspended"] as const) {
      const host = await makeHost(`c8_${status}`, status, {
        provider: status === "grandfathered" ? "migration" : "manual",
        // Ancient, so no outcome here can be explained by the cooldown.
        updatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      });
      const res = await requestHostVerification({ phone: GOOD_PHONE });
      expect(res.ok, `${status} must not be flipped`).toBe(false);
      if (!res.ok) errors.push(res.error);

      const row = await verificationRow(host.id);
      expect(row!.status, `${status} must survive untouched`).toBe(status);
      expect(row!.vendorRef).toBeNull();
    }

    // ⚠ THE PRIVACY PROPERTY, ASSERTED RATHER THAN DESCRIBED. A suspended host must not be able to
    // tell, from the SHAPE of a refusal, that they are distinguishable from a host who is merely
    // already pending — so all four sentences are the same sentence.
    expect(errors).toHaveLength(4);
    expect(new Set(errors).size).toBe(1);
    expect(errors[0]).toBe(HOST_VERIFICATION_NOTHING_CHANGED);
  });

  it("case 9 — the burst guard's refusal is the SHIPPED sentence and is itself audited", async () => {
    const host = await makeHost("c9_denied", null);
    rateLimitMode = "deny";

    const res = await requestHostVerification({ phone: GOOD_PHONE });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    // ⚠ SHIPPED COPY, REUSED UNCHANGED from `src/app/actions/capability.ts` for the same limiter and
    // the same budget. And it is NOT the durable cap's sentence: "in a moment" is true of a
    // 60-second window and would be a lie about the 24-hour interval.
    expect(res.error).toBe(HOST_VERIFICATION_TOO_MANY_ATTEMPTS);
    expect(res.error).not.toBe(HOST_VERIFICATION_NOTHING_CHANGED);

    // The guard sits ABOVE the vendor call, so a denied burst costs nothing and writes nothing.
    expect(fetchMock.mock.calls).toHaveLength(0);
    expect(await verificationRow(host.id)).toBeNull();

    const denied = await trailRows(ACTION, "denied");
    const trail = denied.find(
      (r) => r.actorId === host.id && (r.meta as { reason?: string })?.reason === "rate_limit",
    );
    expect(trail, "the burst refusal must be audited — read out of the table").toBeTruthy();
    expect((trail!.meta as { retryAfter?: number }).retryAfter).toBe(42);
  });

  it("case 10 — the REAL limiter denies the SIXTH call in 60s, keyed on the authenticated id", async () => {
    const host = await makeHost("c10_burst", null);
    // ⚠ THE REAL FIXED WINDOW, not the stub's counter. See the stub's own note: a fake that returns
    // `{ok:false}` on its sixth invocation would assert this file's arithmetic and nothing about
    // `src/lib/rate-limit.ts`.
    rateLimitMode = "real";

    // Calls 1..5 are within budget. The first lands the row; 2..5 are refused by the guarded
    // upsert's WHERE (already `pending`), which is the 0-row sentence and NOT the burst sentence —
    // so the two refusals stay distinguishable in this case.
    const first = await requestHostVerification({ phone: GOOD_PHONE });
    expect(first.ok).toBe(true);
    for (let i = 2; i <= 5; i++) {
      const res = await requestHostVerification({ phone: GOOD_PHONE });
      expect(res.ok, `call ${i} must not be flipped`).toBe(false);
      if (!res.ok) expect(res.error, `call ${i}`).toBe(HOST_VERIFICATION_NOTHING_CHANGED);
    }

    const sixth = await requestHostVerification({ phone: GOOD_PHONE });
    expect(sixth.ok).toBe(false);
    if (sixth.ok) return;
    expect(sixth.error).toBe(HOST_VERIFICATION_TOO_MANY_ATTEMPTS);

    // Every call was keyed on the AUTHENTICATED user id — never on an IP, never on anything the
    // caller sent (`src/lib/rate-limit.ts` states the rule at the module).
    expect(rateLimitCalls).toHaveLength(6);
    expect(new Set(rateLimitCalls.map((c) => c.key))).toEqual(
      new Set([`verify-submit:${host.id}`]),
    );

    const denied = await trailRows(ACTION, "denied");
    const burst = denied.filter(
      (r) => r.actorId === host.id && (r.meta as { reason?: string })?.reason === "rate_limit",
    );
    expect(burst, "the sixth call's refusal is in the table, not inferred from a return").toHaveLength(
      1,
    );
  });

  it("case 11 — T-18.1-0704: a failed vendor call refuses and writes NO row (fail closed)", async () => {
    const host = await makeHost("c11_vendor", null);

    // Four different ways for the vendor to fail, each on the adapter's own refusal paths.
    const failures: Array<{ label: string; respond: () => void }> = [
      {
        label: "500",
        respond: () => fetchMock.mockResolvedValue(jsonResponse({ detail: "boom" }, 500)),
      },
      {
        label: "403 — ONE credential fault, and never a host-facing reason (ADDENDUM A5)",
        respond: () =>
          fetchMock.mockResolvedValue(
            jsonResponse({ detail: "You do not have permission to perform this action." }, 403),
          ),
      },
      {
        label: "201 with no session handle",
        respond: () =>
          fetchMock.mockResolvedValue(jsonResponse({ ...CAPTURED_201, session_id: undefined })),
      },
      {
        label: "transport failure",
        respond: () => fetchMock.mockRejectedValue(new Error("ECONNRESET")),
      },
    ];

    for (const { label, respond } of failures) {
      fetchMock.mockReset();
      respond();
      const res = await requestHostVerification({ phone: GOOD_PHONE });
      expect(res.ok, label).toBe(false);
      if (!res.ok) expect(res.error, label).toBe(HOST_VERIFICATION_VENDOR_UNAVAILABLE);
      // ⚠ THE CALL HAPPENED. A fail-closed refusal and a guard that never ran return the same
      // sentence, so the return value alone is vacuous here.
      expect(fetchMock.mock.calls, label).toHaveLength(1);
      expect(await verificationRow(host.id), label).toBeNull();
    }

    const denied = await trailRows(ACTION, "denied");
    const trail = denied.filter(
      (r) =>
        r.actorId === host.id &&
        (r.meta as { reason?: string })?.reason === "provider_unavailable",
    );
    expect(trail).toHaveLength(failures.length);
  });
});

describe("D-72 — the phone and the email are in no trail row, at any depth", () => {
  it("case 12 — the SERIALISED audit row contains neither the phone nor the email", async () => {
    // Unmistakable fixture values: if either string appears anywhere in a row, at any nesting depth,
    // it can only have come from here.
    const CANARY_PHONE = "+639170000042";
    const CANARY_EMAIL = "hvs_c12_canary_84713@example.com";
    const host = await makeHost("c12_d72", null, { email: CANARY_EMAIL });

    // One ALLOW row…
    const ok = await requestHostVerification({ phone: CANARY_PHONE });
    expect(ok.ok).toBe(true);
    // …and one DENY row, because a trail that is only clean on the success branch is clean on
    // exactly the wrong half.
    const denied = await requestHostVerification({ phone: "nope" });
    expect(denied.ok).toBe(false);

    const rows = await allTrailRowsFor(host.id);
    expect(rows.length, "both branches must have produced a row").toBeGreaterThanOrEqual(2);

    // ⚠ THE WHOLE ROW, SERIALISED — the `tests/ops/reject-reason.test.ts:300-325` idiom. Asserting
    // on individual fields passes the day a value slips into a nested object nobody named.
    for (const row of rows) {
      const serialised = JSON.stringify(row);
      expect(serialised, "the phone must not appear in a durable trail row").not.toContain(
        CANARY_PHONE,
      );
      expect(serialised, "the email must not appear in a durable trail row").not.toContain(
        CANARY_EMAIL,
      );
      // Guard-the-guard: the serialisation must actually be the row, not an empty object.
      expect(serialised).toContain(host.id);
    }

    // And the value really was stored where it belongs, so the assertions above are about ABSENCE
    // from the trail rather than about the phone never having existed.
    const [profile] = await testDb.db
      .select({ phone: user.phone })
      .from(user)
      .where(eq(user.id, host.id));
    expect(profile.phone).toBe(CANARY_PHONE);
  });
});

describe("SC1 — approveHost stops returning STALE", () => {
  it("case 13 — a submitted host can now be APPROVED; a host who never submitted still cannot", async () => {
    const host = await makeHost("c13_approve", null);

    // THE NEGATIVE CONTROL FIRST, which is the defect this whole plan exists to close: with no row,
    // `approveHost`'s `UPDATE … WHERE status IN ('pending','unverified')` flips nothing.
    const neverSubmitted = await makeHost("c13_norow", null);
    await login(STAFF_EMAIL);
    const stale = await approveHost({ userId: neverSubmitted.id });
    expect(stale.ok, "a host with no row cannot be approved — Phase 18's live defect").toBe(false);
    expect(await verificationRow(neverSubmitted.id)).toBeNull();

    // Now the submission path gives the operator a row to flip.
    await login(host.email);
    const submitted = await requestHostVerification({ phone: GOOD_PHONE });
    expect(submitted.ok).toBe(true);
    expect((await verificationRow(host.id))!.status).toBe("pending");

    await login(STAFF_EMAIL);
    const approved = await approveHost({ userId: host.id });
    expect(approved.ok, "THE SENTENCE PHASE 18 COULD NOT MAKE TRUE").toBe(true);

    const row = await verificationRow(host.id);
    expect(row!.status).toBe("approved");
    expect(row!.decidedByStaffId).toBe(staffId);
    // The ops-manual provider decided this one, and it stays distinguishable from a vendor verdict
    // in the row for as long as the row exists (D-259).
    expect(row!.provider).toBe("manual");
    expect(row!.result).toBe("pass");
    expect(row!.checkedAt).not.toBeNull();
  });
});
