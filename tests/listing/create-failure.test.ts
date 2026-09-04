// D-03 / HSURF-02 — `createDraftListing` MUST FAIL BY RETURNING, NEVER BY THROWING.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT WAS BROKEN, AND WHY IT LOOKED FIXED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 19-07 shipped the words a host reads when creating a listing fails: the copy module
// (`src/lib/listing/create-signal.ts`), the query token that carries the signal through a server
// redirect, and the notice the grid renders. `(host)/host/listings/new/page.tsx` has a `!res.ok`
// branch wired to all three. Every hop existed except the FIRST one.
//
// `createDraftListing` had no `try`/`catch` anywhere (19-REVIEW CR-01). Its only two `{ ok: false }`
// paths were the no-session check and the verification refusal — and the page redirects away from
// BOTH of those before it ever calls the action. The reuse read and the insert both threw uncaught on
// any infrastructure failure, so a dead database produced Next's error boundary and the sentence the
// phase built was unreachable for the one case it exists to catch: the host presses *Create listing*,
// the database is unreachable, and instead of a calm sentence on their own grid they get the
// framework's error page.
//
// THIS FILE IS THE PROOF THAT STOPPED BEING TRUE BY HOPE. It drives the REAL exported action against
// the REAL test schema with a database that fails on cue, and asserts the action RESOLVES the failure
// shape rather than rejecting.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE STUB IS A PROXY OVER THE REAL TEST DB, NOT A HAND-BUILT OBJECT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/security/audit-durable.test.ts`'s `recordAudit CANNOT THROW` block — this repository's
// existing analog for exactly this property — can hand `recordAudit` a two-property object, because
// that function touches the db once and reads nothing back. `createDraftListing` does three separate
// things through the same handle: `loadHostVerification`'s owner-scoped read, the D-02 reuse read
// with its five conjuncts and three `NOT EXISTS` subqueries, and the insert. Replacing the whole db
// would prove the try/catch swallows A MOCK; it would say nothing about whether it swallows A
// DATABASE, and it would let the verification gate and the ownership scoping quietly stop running.
//
// So the proxy DELEGATES everything to `testDb.db` and diverges only where the module-scoped holder
// asks it to. One holder, so the action is imported ONCE in `beforeAll` and each case flips a value
// rather than resetting the module registry.
//
// ⚠ THE THROWING-READ CASE FAILS THE **SECOND** `select`, AND THE FIRST ONE MUST BE ALLOWED THROUGH.
// `loadHostVerification` (`src/lib/host/verification-status.ts`) performs a `select` on this same
// handle BEFORE the reuse read does. Failing the first `select` would fail the VERIFICATION read, not
// the reuse read — a different statement, outside the region this plan guards, and a case that would
// pass while proving nothing about the property it names. The counter is reset whenever the holder is
// set, so one case can never leak its count into the next.

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { seedHostVerification } from "../helpers/verification";
import { LISTING_CREATE_FAILED_STATE } from "@/lib/listing/create-signal";
import { HOST_VERIFICATION_LISTING_REFUSED } from "@/lib/host/verification-refusals";
import type { HostVerificationStatus } from "@/lib/db/schema";

/**
 * The tag the action's `catch` logs under. Asserted rather than assumed: an operator looking for why
 * a host could not start a listing greps for this, and a log line with no stable handle is a log line
 * nobody finds.
 */
const LOG_TAG = "[listing:create]";

/**
 * The injected failure's message. It carries the word a Postgres driver uses for a refused connection
 * ON PURPOSE — the leak assertions below search the RETURNED value for it, so the constant has to
 * contain something a real failure would plausibly contain.
 */
const INJECTED_MESSAGE = "ECONNREFUSED 127.0.0.1:5432 (injected by create-failure.test.ts)";

/** Which way the database is broken for the case currently running. `null` is pure delegation. */
type FailureMode = "reject-insert" | "throw-insert" | "throw-read" | null;

const failure: { mode: FailureMode; selectCalls: number } = { mode: null, selectCalls: 0 };

/** Flip the holder and reset the `select` counter, so no case can inherit another's count. */
function injectFailure(mode: FailureMode): void {
  failure.mode = mode;
  failure.selectCalls = 0;
}

let testDb: TestDb;
let testAuth: TestAuth;
let createDraftListing: (typeof import("@/app/actions/listing"))["createDraftListing"];

// Mutable holder so the (hoisted) next/headers mock can pick up the per-test session cookie — the
// same shape `tests/listing/crud.test.ts` uses.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/**
 * The real test db, with a seam. Every property delegates; `insert` and `select` diverge only while
 * the holder names a failure. See the header for why this is a proxy and not a stand-in.
 */
function makeFailingDbProxy(real: TestDb["db"]): TestDb["db"] {
  return new Proxy(real, {
    get(target, prop, _receiver) {
      if (prop === "insert") {
        if (failure.mode === "throw-insert") {
          // The call itself explodes — the failure mode where no promise is ever created.
          return () => {
            throw new Error(INJECTED_MESSAGE);
          };
        }
        if (failure.mode === "reject-insert") {
          // A distinct failure mode from the sync throw: the call succeeds and the QUERY fails later.
          return () => ({ values: () => Promise.reject(new Error(INJECTED_MESSAGE)) });
        }
      }
      if (prop === "select" && failure.mode === "throw-read") {
        return (...args: unknown[]) => {
          failure.selectCalls += 1;
          // The FIRST select is `loadHostVerification`'s (verification-status.ts). It must succeed, or
          // this case would be measuring the verification read instead of the reuse read.
          if (failure.selectCalls >= 2) {
            throw new Error(INJECTED_MESSAGE);
          }
          return (target.select as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as TestDb["db"];
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: makeFailingDbProxy(testDb.db) }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ createDraftListing } = await import("@/app/actions/listing"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  injectFailure(null);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  injectFailure(null);
  errorSpy.mockRestore();
});

/**
 * Sign up + sign in a host, seed their verification row, stash the cookie. `crud.test.ts`'s
 * `signInHost` reused rather than re-invented — including the reason it seeds: a Better-Auth-created
 * host has NO `host_verification` row, which reads as `unverified`, and `createDraftListing` refuses
 * that state before any of the statements this file is about.
 */
async function signInHost(
  email: string,
  status: HostVerificationStatus | null = "approved",
): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  await seedHostVerification(testDb.db, res.user.id, status);
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  return res.user.id;
}

/** The three assertions every failure case shares: the fixed constant, no leak, one tagged log line. */
function expectCalmFailure(res: { ok: boolean; error?: string; id?: string }): void {
  expect(
    res.error,
    "`createDraftListing` returned a failure whose `error` is NOT `LISTING_CREATE_FAILED_STATE`. The " +
      "page routes on that exact constant, so any other value falls through to a destination that " +
      "does not describe what happened — the D-03 defect arrived at from a different direction.",
  ).toBe(LISTING_CREATE_FAILED_STATE);

  const serialised = JSON.stringify(res);
  expect(
    serialised.includes("ECONNREFUSED"),
    "T-19-32 — the RETURNED value carries text from the underlying failure. `create-signal.ts` names " +
      "no mechanism BY DESIGN: an error string, a driver code or a table name on a host surface tells " +
      "the host nothing they can act on and leaks the shape of a system they control nothing about. " +
      "Log it; never return it.",
  ).toBe(false);
  expect(
    serialised.includes(INJECTED_MESSAGE),
    "T-19-32 — the injected error's message reached the returned object verbatim. See above: the " +
      "return value is a fixed imported constant, and the error goes to `console.error` only.",
  ).toBe(false);
}

/** The one log-line assertion, kept off the leak assertions on purpose: the LOG may name the failure. */
function expectOneTaggedLogLine(spy: ReturnType<typeof vi.spyOn>): void {
  expect(
    spy.mock.calls.length,
    `Expected exactly one \`console.error\` call from the guarded region, tagged \`${LOG_TAG}\`. The ` +
      "catch is the only place an operator learns a host could not start a listing — the host is told " +
      "a calm sentence that names no mechanism, so a missing log line means the failure is invisible " +
      "on both sides.",
  ).toBe(1);
  expect(
    String(spy.mock.calls[0]?.[0] ?? ""),
    `The \`console.error\` call is not tagged \`${LOG_TAG}\`. An operator greps for this tag; a log ` +
      "line with no stable handle is a log line nobody finds.",
  ).toContain(LOG_TAG);
}

describe("D-03 — createDraftListing RESOLVES a failure instead of throwing (19-REVIEW CR-01)", () => {
  it("resolves { ok: false } when the INSERT returns a rejected promise (the database went away)", async () => {
    await signInHost("create.failure.reject@example.com");
    injectFailure("reject-insert");

    const res = await createDraftListing();

    expect(
      res.ok,
      "The host pressed *Create listing*, the insert's promise rejected, and `createDraftListing` did " +
        "not report a failure. If this red is an unhandled rejection rather than `ok: true`, the " +
        "action is THROWING: the exception escapes the page render, Next's error boundary paints a " +
        "generic error page, and the calm sentence the grid was built to show is never reached.",
    ).toBe(false);
    expectCalmFailure(res);
    expectOneTaggedLogLine(errorSpy);
  });

  it("resolves { ok: false } when db.insert THROWS SYNCHRONOUSLY", async () => {
    await signInHost("create.failure.throw@example.com");
    injectFailure("throw-insert");

    const res = await createDraftListing();

    expect(
      res.ok,
      "A synchronous throw out of `db.insert` is a DISTINCT failure mode from a rejected promise — no " +
        "promise is ever created, so a `.catch()` on the awaited value would not see it. Both must be " +
        "inside the try, which is why they are asserted separately (the shape " +
        "`tests/security/audit-durable.test.ts` uses for `recordAudit`).",
    ).toBe(false);
    expectCalmFailure(res);
    expectOneTaggedLogLine(errorSpy);
  });

  it("resolves { ok: false } when the D-02 REUSE READ throws — the read is inside the guard too", async () => {
    await signInHost("create.failure.read@example.com");
    injectFailure("throw-read");

    const res = await createDraftListing();

    expect(
      res.ok,
      "The D-02 reuse read threw and the failure escaped. CR-01 names BOTH statements: the reuse " +
        "`select` and the insert. Guarding only the insert closes half the gap while reading as if it " +
        "closed all of it — a host whose read failed still meets the framework's error page.",
    ).toBe(false);
    expectCalmFailure(res);
    expectOneTaggedLogLine(errorSpy);
  });

  it("CONTROL — with nothing injected, creation still succeeds AND still reuses the untouched draft (D-02)", async () => {
    await signInHost("create.failure.control@example.com");

    const first = await createDraftListing();
    expect(
      first.ok,
      "The happy path broke. A try/catch that changes what a WORKING database does is not a safety " +
        "net, it is a regression — and this control is what stops the three failure cases above " +
        "passing over an action that now fails for everyone.",
    ).toBe(true);
    if (!first.ok) return;
    expect(first.id, "a successful create returned no id").toBeTruthy();

    const second = await createDraftListing();
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(
      second.id,
      "The second *Create listing* minted a SECOND draft instead of handing back the first, untouched " +
        "one. That is plan 19-09's D-02 reuse behaviour, and wrapping the region in a try/catch must " +
        "not have moved the read out of it or changed what it returns.",
    ).toBe(first.id);

    expect(
      errorSpy.mock.calls.length,
      "The control case logged an error. Nothing failed, so nothing should have been caught — a log " +
        "line here means the catch is firing on the happy path.",
    ).toBe(0);
  });

  it("REFUSAL NOT SWALLOWED — a suspended host still gets the verification refusal, not the apology", async () => {
    await signInHost("create.failure.suspended@example.com", "suspended");
    injectFailure("reject-insert");

    const res = await createDraftListing();

    expect(res.ok).toBe(false);
    expect(
      res.ok ? undefined : res.error,
      "A suspended host received the INFRASTRUCTURE sentence instead of the verification refusal. The " +
        "catch has swallowed a deliberate refusal and converted it into a generic apology: the refusal " +
        "carries information the host needs — that there is a check, and where to ask about it — and " +
        "the apology destroys it, sending them nowhere. The `try` must open AFTER the verification " +
        "gate returns, never around it.",
    ).toBe(HOST_VERIFICATION_LISTING_REFUSED);

    expect(
      errorSpy.mock.calls.length,
      "A refusal was logged as an infrastructure failure. Control never entered the guarded region, so " +
        "the catch cannot have run — if it did, the gate is inside the try.",
    ).toBe(0);
  });
});
