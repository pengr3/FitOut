// PAY-04 / D-12 / D-14 / WR-06 — the PayMongo payout-onboarding action (startPayoutOnboarding).
//
// This is Task 1's TDD anchor. It drives the REAL exported server action against the isolated test
// schema (tests/helpers/db.ts) with a mocked session (the tests/profile/profile.test.ts harness) and
// the shared mockPayMongo stubs (tests/helpers/mocks.ts) swapped in for @/lib/paymongo, so no real
// PayMongo HTTP is ever made. @/lib/audit is mocked so we can assert the WR-06 denial entry.
//
// It asserts the two load-bearing guarantees:
//   (a) CREATE-ONCE — calling startPayoutOnboarding TWICE creates the Linked Account only ONCE; the
//       second call reuses the stored paymongoAccountId (D-14: one Linked Account per host).
//   (b) RATE-LIMIT + AUDIT — exceeding the 5/60s budget returns { ok:false } AND records a denial
//       audit entry (WR-06 carry-forward applied to the onboarding action before payouts wire to canHost).
// RED until src/app/actions/paymongo-connect.ts exists; GREEN once it does.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { hostPayout } from "@/lib/db/schema";
import { mockPayMongo } from "../helpers/mocks";

let testDb: TestDb;
let testAuth: TestAuth;
let startPayoutOnboarding: (typeof import("@/app/actions/paymongo-connect"))["startPayoutOnboarding"];

// Captured audit entries — the mocked @/lib/audit pushes here so we can assert the WR-06 denial.
const auditCalls: Array<{ action: string; outcome: string }> = [];

// Mutable holder so the (hoisted) next/headers mock can pick up the per-test session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // Swap the thin PayMongo client for the shared mock (no real HTTP; deterministic account id + link).
  vi.doMock("@/lib/paymongo", () => ({
    createLinkedAccount: mockPayMongo.createLinkedAccount,
    createOnboardingLink: mockPayMongo.createOnboardingLink,
  }));
  // Capture audit entries so the WR-06 denial can be asserted.
  vi.doMock("@/lib/audit", () => ({
    recordAudit: vi.fn(async (entry: { action: string; outcome: string }) => {
      auditCalls.push({ action: entry.action, outcome: entry.outcome });
    }),
  }));
  vi.resetModules();
  ({ startPayoutOnboarding } = await import("@/app/actions/paymongo-connect"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/audit");
  await teardownTestDb(testDb);
});

/** Sign up + sign in a host; stash the session cookie for the next/headers mock. Returns the id. */
async function signInHost(email: string): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  return res.user.id;
}

describe("startPayoutOnboarding — create-once + rate-limit/audit (PAY-04, D-12/D-14, WR-06)", () => {
  it("creates the Linked Account only ONCE across two calls (reuses the stored paymongoAccountId)", async () => {
    const userId = await signInHost("pmonboard.once@example.com");

    const first = await startPayoutOnboarding();
    const second = await startPayoutOnboarding();

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok) expect(typeof first.url).toBe("string");

    // The Linked Account is created EXACTLY ONCE — the second call reuses the stored id (D-14).
    expect(mockPayMongo.createLinkedAccount).toHaveBeenCalledTimes(1);

    // And the id was persisted server-side on the caller's own host_payout row.
    const rows = await testDb.db
      .select()
      .from(hostPayout)
      .where(eq(hostPayout.userId, userId));
    expect(rows[0]?.paymongoAccountId).toBe("acct_test_123");
    // The flag is NOT flipped by onboarding — only the webhook may set it (T-06-PRIV).
    expect(rows[0]?.payoutsEnabled).toBe(false);
  });

  it("returns a denial + records an audit entry once the rate limit is exceeded (WR-06)", async () => {
    await signInHost("pmonboard.ratelimit@example.com");
    auditCalls.length = 0;

    // 5/60s budget → the 6th call in the window is denied.
    const results: Array<{ ok: boolean }> = [];
    for (let i = 0; i < 6; i++) results.push(await startPayoutOnboarding());

    expect(results[5].ok).toBe(false);
    // WR-06: the denial is non-repudiable — a denied audit entry was recorded for this action.
    expect(
      auditCalls.some(
        (c) => c.action === "startPayoutOnboarding" && c.outcome === "denied",
      ),
    ).toBe(true);
  });

  it("rejects the call when there is no session (session-gated)", async () => {
    sessionHeaders.cookie = ""; // no session cookie.
    const res = await startPayoutOnboarding();
    expect(res.ok).toBe(false);
  });
});
