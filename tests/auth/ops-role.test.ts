// OPS-01, the escalation half: `role` is a field NO CLIENT CAN WRITE — measured at the endpoint, not
// asserted from the config (T-18-0101, D-214/D-217).
//
// Cloned from `tests/auth/capability-escalation.test.ts`, which pins the SIGNUP boundary ("a client
// that POSTs canHost:true or role:'admin' at signup MUST NOT self-grant"). This file pins the OTHER
// boundary, and it is now the one that matters: signup is a one-shot, but `/api/auth/update-user`
// accepts an arbitrary JSON body from any signed-in session, forever, on every deploy. Phase 18 turns
// `role` from a dead column into the key to an ops console over live bookings and money, so the
// question "can a booker POST themselves into it?" stops being hypothetical the moment 18-12 ships a
// route. It is answered here BEFORE that route exists.
//
// THE REQUEST GOES THROUGH `auth.handler`, i.e. the same handler `src/app/api/auth/[...all]/route.ts`
// dispatches every browser request to via `toNextJsHandler(auth)`. That is deliberate rather than
// convenient: the trust boundary in the threat model is "untrusted JSON reaches the catch-all", and a
// test that called a typed server helper would be measuring a path an attacker never takes. The body
// is hand-built JSON with a smuggled `role`, exactly as a `fetch` from devtools would send it.
//
// WHY THE GUARD IS `input: false` AND NOT THE ABSENCE OF A CALL. It would be easy to conclude that
// `role` is safe because no code writes it from a body. That is the weaker claim — it is a fact about
// today's code, and a future action taking `{...body}` would quietly retire it. `input: false` on the
// additionalField (`src/lib/auth.ts:112`) makes Better Auth's own `parseInputData` refuse the field
// before any application code runs, which is a fact about the FRAMEWORK. This file measures the
// framework's behaviour, so removing that one flag reddens it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MEASURED, NOT ASSUMED — the four probes this file's expectations were written FROM (2026-09-01)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plan predicted a field-level STRIP: `role` dropped, the rest of the body applied, a `200`. That
// prediction was WRONG, and it is recorded as scored rather than quietly rewritten. Probed against
// Better Auth 1.6.14 through `auth.handler`, on the isolated schema, with a real signed-in session:
//
//   POST {role:"staff"} ................ 400 {"message":"role is not allowed to be set",
//                                             "code":"FIELD_NOT_ALLOWED"}   row: role=user, bio=null
//   POST {bio, role:"staff"} ........... 400 (same body)                    row: role=user, bio=NULL
//   POST {bio} ......................... 200 {"status":true}                row: role=user, bio=set
//   POST {bio, role:null} .............. 200 {"status":true}                row: role=user, bio=set
//
// The second line is the finding. A truthy `role` does not get stripped out of the body — it takes the
// WHOLE REQUEST DOWN, so the legitimate field riding alongside it is not written either. That is a
// STRONGER guarantee than the one the plan expected, and it is the reason case 2 asserts `bio` stayed
// NULL and case 3 exists at all: with a request-level rejection, "the write was refused" needs a
// control proving the refusal was caused by `role` and not by anything else about the request.
//
// The fourth line is the one to keep in view for Phase 18 specifically: a NULL `role` is DROPPED
// rather than written, and NULL is precisely the value `readStaff` must fail closed on. A client that
// could write it would be a client that could move its own row into the state a mistakenly-inverted
// guard reads as staff. It cannot.
//
// AND THE POSITIVE CONTROL IS LOAD-BEARING (case 6). Cases 1-5 all assert a refusal. A `requireStaff`
// that refused EVERYONE — a broken import, a typo'd predicate, a guard that always returns null —
// would satisfy every one of them and prove nothing at all. Case 6 grants staff through the ONE
// sanctioned path (a Drizzle UPDATE, D-217) and asserts the same caller is then admitted, which is
// what makes the three refusals above evidence rather than coincidence.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
let requireStaff: typeof import("@/lib/ops/staff")["requireStaff"];
let readStaff: typeof import("@/lib/ops/staff")["readStaff"];

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const NOT_FOUND = "NEXT_NOT_FOUND";
const EMAIL = "ops.escalate@example.com";
const PASSWORD = "averylongpassword";

let userId: string;
let baseURL: string;

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("next/navigation", () => ({
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  }));
  vi.resetModules();
  ({ requireStaff, readStaff } = await import("@/lib/ops/staff"));

  baseURL =
    ((testAuth as unknown as { options: { baseURL?: string } }).options.baseURL ??
      "http://localhost:3000");

  const res = (await signUp(testAuth, {
    email: EMAIL,
    password: PASSWORD,
    name: "Sneaky Booker",
    firstName: "Sneaky",
    intent: "book",
  })) as { user: { id: string } };
  userId = res.user.id;

  const signIn = await testAuth.api.signInEmail({
    body: { email: EMAIL, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  expect(sessionHeaders.cookie).toContain("better-auth.session_token=");
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("next/navigation");
  await teardownTestDb(testDb);
});

/** POST a hand-built JSON body at `/api/auth/update-user`, as a browser would. */
async function postUpdateUser(body: Record<string, unknown>): Promise<Response> {
  return testAuth.handler(
    new Request(`${baseURL}/api/auth/update-user`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionHeaders.cookie,
      },
      body: JSON.stringify(body),
    }),
  );
}

async function readRow(): Promise<{ role: string | null; bio: string | null }> {
  const rows = await testDb.db
    .select({ role: user.role, bio: user.bio })
    .from(user)
    .where(eq(user.id, userId));
  return rows[0];
}

describe("update-user cannot write `role` (OPS-01, T-18-0101)", () => {
  it("case 1 — a body carrying ONLY role:'staff' is refused outright and changes no row", async () => {
    expect((await readRow()).role).toBe("user");

    const res = await postUpdateUser({ role: "staff" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "FIELD_NOT_ALLOWED" });

    expect((await readRow()).role).toBe("user");
  });

  it("case 2 — role smuggled BESIDE a legitimate field takes the WHOLE request down with it", async () => {
    expect((await readRow()).bio).toBeNull();

    const res = await postUpdateUser({ bio: "Pickleball most mornings.", role: "staff" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "FIELD_NOT_ALLOWED" });

    const row = await readRow();
    expect(row.role).toBe("user"); // the escalation did not land …
    expect(row.bio).toBeNull(); // … and neither did the legitimate half it was hiding behind.
  });

  it("case 3 — CONTROL: the same legitimate field ALONE succeeds (so the 400 above was the role)", async () => {
    // Without this, case 2 is satisfied by a request that failed for any reason at all — a malformed
    // body, a rejected origin, a broken handler. The delta between the two calls is one key.
    const res = await postUpdateUser({ bio: "Pickleball most mornings." });
    expect(res.status).toBe(200);

    const row = await readRow();
    expect(row.bio).toBe("Pickleball most mornings.");
    expect(row.role).toBe("user");
  });

  it("case 4 — role:null is DROPPED, not written: the column cannot be nulled from a body either", async () => {
    // The other half of `input: false`'s documented behaviour ("throws FIELD_NOT_ALLOWED on a truthy
    // value and silently drops a null", src/lib/auth.ts:120-135) — and it matters MORE here than it
    // did for the avatar fields it was written about. NULL is the value `readStaff` must fail closed
    // on, so a client able to write NULL is a client able to move the row into the state a mistaken
    // guard reads as staff. It cannot: the key is dropped and the request succeeds on its rest.
    const res = await postUpdateUser({ bio: "Still just a booker.", role: null });
    expect(res.status).toBe(200);

    const row = await readRow();
    expect(row.bio).toBe("Still just a booker.");
    expect(row.role).toBe("user"); // NOT null — the smuggled key never reached the column.
  });

  it("case 5 — the same caller is still refused by requireStaff afterwards", async () => {
    expect(await readStaff()).toBeNull();
    await expect(requireStaff()).rejects.toThrow(NOT_FOUND);
  });

  it("case 6 — POSITIVE CONTROL: the sanctioned Drizzle grant DOES make the same caller staff", async () => {
    // D-217's one path. If this failed, cases 1-3 would be measuring a guard that refuses everybody.
    await testDb.db.update(user).set({ role: "staff" }).where(eq(user.id, userId));

    expect(await readStaff()).toEqual({ id: userId });
    await expect(requireStaff()).resolves.toEqual({ id: userId });

    // And the revocation takes effect on the very next call, with no session to invalidate — the
    // property `src/lib/ops/staff.ts`'s header pins to `session.cookieCache` staying unconfigured.
    await testDb.db.update(user).set({ role: "user" }).where(eq(user.id, userId));
    expect(await readStaff()).toBeNull();
  });
});
