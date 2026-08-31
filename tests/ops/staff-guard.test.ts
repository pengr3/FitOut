// OPS-02, the guard half: `requireStaff()` is the security boundary, and it refuses everyone who is
// not staff with the SAME answer a nonexistent route gives (D-216, D-219).
//
// WHAT EACH CASE MEASURES, and why the cheaper version of it would measure nothing:
//
//   - case 1 — a granted account IS staff, end to end. The grant is a Drizzle `UPDATE user SET role`
//     (D-217's mechanism, the only sanctioned one) and the standing is then read back out of a REAL
//     Better Auth session, not out of the row. That is the whole OPS-01 claim: staff standing is
//     resolved server-side from the session, so the console never has to trust a caller for it.
//
//   - case 2 — a signed-in NON-staff account is refused. The obvious case, and on its own it proves
//     only that the function has an `if`.
//
//   - case 3 — THE ONE THAT MATTERS. `role` is NULLABLE (`src/lib/db/schema.ts:45` —
//     `text("role").default("user")`, no `.notNull()`), so a row whose role was never written by the
//     default carries NULL. A guard written as an inequality against "user" reads that NULL as staff
//     and hands the ops console to it. This case plants an explicit NULL and asserts refusal, which is
//     the only thing that separates the fail-CLOSED predicate from the fail-OPEN one. Mutating
//     `src/lib/ops/staff.ts` to the inverted form must redden exactly this case (and case 4).
//
//   - case 4 — a NEAR-MISS role ("admin"). D-215 says there is exactly ONE staff role; a predicate
//     that accepted any non-default string would silently invent a second one. Also the value
//     `tests/auth/capability-escalation.test.ts` smuggles, so the two files describe the same hostile
//     input from opposite ends.
//
//   - case 5 — SIGNED OUT. No session at all is a different code path from "session without the
//     role", and both have to reach the same refusal.
//
//   - case 6 — THE INDISTINGUISHABILITY ASSERTION, which is the actual content of D-219. Cases 2-5
//     each assert "was refused"; case 6 asserts they were refused IDENTICALLY — same call, same
//     thrown shape, same absence of any signal that separates "this route exists but you may not have
//     it" from "there is no such route". A per-case assertion cannot see a difference BETWEEN cases,
//     so the oracle D-219 forbids would survive all four of them.
//
//   - case 7 — `assertStaff` and `requireStaff` cannot disagree. They are two jobs (a status line and
//     a decision) over ONE expression, exactly as `isPubliclyViewable` is shared by the listing layout
//     and the listing page "so the rule cannot drift between them". If they ever answer differently,
//     one of the two `(ops)` layers is wrong and nothing else in the suite would say so.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MUTATION, RUN AND SCORED — the fail-open predicate, and exactly which cases speak (2026-09-01)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The whole file is green against the shipped `role === "staff"`. That proves the cases pass; it does
// not prove any of them would NOTICE the defect they exist for. So the defect was installed: the one
// expression in `src/lib/ops/staff.ts` changed to the inverted form against the default value, nothing
// else touched. `npx vitest run tests/ops/staff-guard.test.ts`:
//
//     × case 3 — a NULL role is NOT staff (the column is nullable; the predicate must fail closed)
//     × case 4 — a near-miss role ('admin') is NOT staff (D-215: there is exactly ONE staff role)
//     × case 6 — all four refusals are INDISTINGUISHABLE from each other (D-219, the existence oracle)
//     × case 7 — the status-line layer and the decision layer never disagree (ONE expression, two jobs)
//           Tests  4 failed | 3 passed (7)
//
// Cases 1, 2 and 5 stayed GREEN, and that is the finding rather than a footnote: a staff account is
// still staff, a `role='user'` account is still refused, and a signed-out caller is still refused —
// under a predicate that hands the ops console to every NULL-role row in the table. The three obvious
// cases are exactly the ones that cannot see this. Reverted; 7 passed.
//
// WHY THE SESSION IS REAL AND NOT A STUB. `@/lib/auth` is bound to `makeTestAuth(testDb)` — Better
// Auth rebuilt from the PRODUCTION options (`tests/helpers/auth.ts`) against the isolated schema — so
// the `additionalFields` block under test is the same object the app ships. A hand-rolled
// `{ user: { role } }` stub would pass even if `role` stopped being returned on the session, which is
// precisely the regression that would take the whole ops console down (or, worse, open it).
//
// `notFound()` is mocked to throw a named error, the shipped idiom at
// `tests/booking/checkout-session-expire.test.ts:192`. The real one throws a Next-internal digest that
// only the framework can interpret; the HTTP STATUS half of D-219 is not observable from Vitest at all
// (`tests/design/soft-404-status.test.ts:31-39` — "the e2e spec is the ONLY instrument in this repo
// that can see an HTTP status line") and lands as a production-build curl audit in plan 18-14.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
let readStaff: typeof import("@/lib/ops/staff")["readStaff"];
let requireStaff: typeof import("@/lib/ops/staff")["requireStaff"];
let assertStaff: typeof import("@/lib/ops/staff")["assertStaff"];

// The mutable holder the next/headers mock reads, so each case can present a different caller —
// including the empty-cookie ANONYMOUS caller, which is a real state and not a missing fixture.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const NOT_FOUND = "NEXT_NOT_FOUND";
let notFoundCalls = 0;

const PASSWORD = "averylongpassword";

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("next/navigation", () => ({
    notFound: () => {
      notFoundCalls++;
      throw new Error(NOT_FOUND);
    },
  }));
  vi.resetModules();
  ({ readStaff, requireStaff, assertStaff } = await import("@/lib/ops/staff"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("next/navigation");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  notFoundCalls = 0;
  sessionHeaders.cookie = "";
});

/**
 * Create an account, set its `role` the way the CLI does (a privileged Drizzle UPDATE — never
 * `auth.api.updateUser`, which `input: false` makes structurally incapable of writing this field),
 * and sign in. Returns the user id; the session cookie is stashed for the next/headers mock.
 *
 * `role` is passed as `string | null` on purpose so a case can plant an explicit NULL — the state the
 * nullable column actually permits and the one a fail-open predicate mishandles.
 */
async function makeCaller(email: string, role: string | null): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: PASSWORD,
    name: "Ops Case",
    firstName: "Ops",
    intent: "book",
  })) as { user: { id: string } };

  await testDb.db.update(user).set({ role }).where(eq(user.id, res.user.id));

  const signIn = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  expect(sessionHeaders.cookie).toContain("better-auth.session_token=");

  return res.user.id;
}

/**
 * Everything a caller can observe from the guard pair, as one value.
 *
 * Case 6 compares these records across the four refusal modes. Comparing them is the only way to
 * assert INDISTINGUISHABILITY: a per-case `expect(...).toThrow()` is satisfied by two different
 * refusals just as happily as by two identical ones.
 */
async function observe(): Promise<{
  read: unknown;
  requireOutcome: string;
  assertOutcome: string;
  notFoundCalls: number;
}> {
  notFoundCalls = 0;
  const read = await readStaff();

  let requireOutcome = "returned";
  try {
    await requireStaff();
  } catch (err) {
    requireOutcome = (err as Error).message;
  }

  let assertOutcome = "returned";
  try {
    await assertStaff();
  } catch (err) {
    assertOutcome = (err as Error).message;
  }

  return { read, requireOutcome, assertOutcome, notFoundCalls };
}

describe("requireStaff / readStaff / assertStaff — the ops security boundary (OPS-02, D-216/D-219)", () => {
  it("case 1 — a role='staff' account resolves to its authenticated id, through a real session", async () => {
    const id = await makeCaller("staff.case1@example.com", "staff");

    expect(await readStaff()).toEqual({ id });
    // The id is the point, not the boolean: it is the authenticated `actorId` OPS-03's audit row is
    // written with, which is what makes an ops act non-repudiable rather than merely permitted.
    expect(await requireStaff()).toEqual({ id });
    await expect(assertStaff()).resolves.toBeUndefined();
    expect(notFoundCalls).toBe(0);
  });

  it("case 2 — a signed-in NON-staff account is refused", async () => {
    await makeCaller("booker.case2@example.com", "user");

    expect(await readStaff()).toBeNull();
    await expect(requireStaff()).rejects.toThrow(NOT_FOUND);
    await expect(assertStaff()).rejects.toThrow(NOT_FOUND);
  });

  it("case 3 — a NULL role is NOT staff (the column is nullable; the predicate must fail closed)", async () => {
    await makeCaller("nullrole.case3@example.com", null);

    // Proof the fixture is the state it claims to be — a DEFAULT is not a constraint, and if the
    // UPDATE had been coerced to "user" this case would silently degrade into a copy of case 2.
    const rows = await testDb.db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, "nullrole.case3@example.com"));
    expect(rows[0].role).toBeNull();

    expect(await readStaff()).toBeNull();
    await expect(requireStaff()).rejects.toThrow(NOT_FOUND);
    await expect(assertStaff()).rejects.toThrow(NOT_FOUND);
  });

  it("case 4 — a near-miss role ('admin') is NOT staff (D-215: there is exactly ONE staff role)", async () => {
    await makeCaller("admin.case4@example.com", "admin");

    expect(await readStaff()).toBeNull();
    await expect(requireStaff()).rejects.toThrow(NOT_FOUND);
    await expect(assertStaff()).rejects.toThrow(NOT_FOUND);
  });

  it("case 5 — a SIGNED-OUT caller is refused (no session is its own code path)", async () => {
    sessionHeaders.cookie = "";

    expect(await readStaff()).toBeNull();
    await expect(requireStaff()).rejects.toThrow(NOT_FOUND);
    await expect(assertStaff()).rejects.toThrow(NOT_FOUND);
  });

  it("case 6 — all four refusals are INDISTINGUISHABLE from each other (D-219, the existence oracle)", async () => {
    await makeCaller("booker.case6@example.com", "user");
    const nonStaff = await observe();

    await makeCaller("nullrole.case6@example.com", null);
    const nullRole = await observe();

    await makeCaller("admin.case6@example.com", "admin");
    const nearMiss = await observe();

    sessionHeaders.cookie = "";
    const signedOut = await observe();

    const expected = {
      read: null,
      requireOutcome: NOT_FOUND,
      assertOutcome: NOT_FOUND,
      notFoundCalls: 2, // one per guard, and NEVER a different count per caller class
    };
    expect(nonStaff).toEqual(expected);
    expect(nullRole).toEqual(expected);
    expect(nearMiss).toEqual(expected);
    expect(signedOut).toEqual(expected);

    // Stated once more as a set, because that is the sentence D-219 actually writes: a prober cannot
    // tell these four apart, and therefore cannot tell any of them from a URL that was never routed.
    const distinct = new Set(
      [nonStaff, nullRole, nearMiss, signedOut].map((o) => JSON.stringify(o)),
    );
    expect(distinct.size).toBe(1);
  });

  it("case 7 — the status-line layer and the decision layer never disagree (ONE expression, two jobs)", async () => {
    const cases: Array<{ email: string; role: string | null; staff: boolean }> = [
      { email: "agree.staff@example.com", role: "staff", staff: true },
      { email: "agree.user@example.com", role: "user", staff: false },
      { email: "agree.null@example.com", role: null, staff: false },
    ];

    for (const c of cases) {
      await makeCaller(c.email, c.role);
      const o = await observe();
      expect(o.requireOutcome === "returned").toBe(c.staff);
      expect(o.assertOutcome === "returned").toBe(c.staff);
      expect(o.read !== null).toBe(c.staff);
    }
  });
});
