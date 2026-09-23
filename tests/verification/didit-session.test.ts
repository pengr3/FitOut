// HVER-07 / D-256 / D-258 — the Didit create-session call, pinned to the MINIMUM it may send and to
// the four fields it may produce.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE MEASURES, AND WHAT IT HONESTLY CANNOT
// ════════════════════════════════════════════════════════════════════════════════════════════════
// It mocks the GLOBAL `fetch` and imports the REAL adapter — `tests/payments/paymongo-calls.test.ts`'s
// shape, and for its reason: mocking the adapter would prove only that a test agrees with itself,
// while the properties worth holding are all on the WIRE.
//
//   - THE REQUEST IS THE MINIMUM (T-18.1-0501). Three body keys, asserted by SET EQUALITY rather
//     than by membership. Didit's create-session endpoint also accepts the host's email and phone
//     and a free-form echoed object; sending any of them is a cross-border PII transfer that the
//     regulatory brief permits and that nobody asked for. A membership check would pass cheerfully
//     the day a fourth key is added "just for support"; this reddens.
//   - THE 201 IS READ CORRECTLY, and the hosted URL comes back OUTSIDE the `VerificationResult` —
//     it is a redirect target carrying a session token, not a fact about a check, and a fifth field
//     is how one becomes the other (T-18.1-0505).
//   - EVERY FAILURE PRODUCES NO RESULT. A non-2xx, a body without a session handle, a body that is
//     not JSON and a rejected `fetch` all throw, so there is no object for a caller to write to
//     `host_verification` — strictly stronger than "writes a failing row" (T-18.1-0503).
//
// ⚠ WHAT IT CANNOT PROVE. A self-signed mock proves the adapter agrees with the fixture, never that
// Didit answers this shape. The captured 201 below is transcribed from
// `18.1-RESEARCH.md § R1 § The create-session call`; the REAL proof that the vendor answers it is
// the sandbox transcript plan 18.1-14 records in `18.1-EVIDENCE.md`.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// OBSERVED RED — THE OVER-DISCLOSURE MUTATION, RUN AND SCORED (2026-09-02)
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Green against the shipped adapter proves the cases pass, not that any of them would NOTICE the
// defect they exist for. So the defect was installed: a fourth key was added to the request body in
// `src/lib/verification/providers/didit.ts` — `metadata: { email: userId }`, i.e. the shape a
// well-meaning "give support something to search on" edit actually takes.
//
//   `npx vitest run tests/verification/didit-session.test.ts` → Tests 1 failed | 7 passed (8).
//   Observed output, verbatim:
//
//     FAIL  tests/verification/didit-session.test.ts > D-256 / T-18.1-0501 — the outbound session
//     request is the MINIMUM > case 1 — the request is the MINIMUM: POST /v3/session/, x-api-key,
//     and exactly three body keys
//     AssertionError: the request body's KEY SET is exactly {workflow_id, vendor_data, callback}:
//     expected [ 'callback', 'metadata', …(2) ] to deeply equal [ 'callback', 'vendor_data', …(1) ]
//
//     - Expected
//     + Received
//
//       [
//         "callback",
//     +   "metadata",
//         "vendor_data",
//         "workflow_id",
//       ]
//
// Reverted → 8 passed. Note WHICH cases stayed green under the defect: 2-8 all did. The captured
// response still parsed, the failure paths still failed closed, and the verdict still had four
// fields — an over-disclosure defect is invisible to every case except the one written for it, which
// is why the key set is asserted by equality and why that assertion is not merged into another case.
//
// NO DATABASE. Nothing here touches Postgres: the adapter is a `fetch` call and a shape.
//
// ⚠ NO CREDENTIAL IS READ FROM THE ENVIRONMENT. Every case stubs `DIDIT_API_KEY` /
// `DIDIT_WORKFLOW_ID` with obvious fakes, so the suite behaves identically on a machine that holds
// the real ones in `.env.local` (which `tests/setup.ts` loads) and on one that has never seen them.
// A test that passed only where a real key exists would be a test nobody else can run.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { DiditSessionStart } from "@/lib/verification/providers/didit";
import { isVerified } from "@/lib/verification/port";

type DiditAdapter = typeof import("@/lib/verification/providers/didit");
type DiditSessionFailure = InstanceType<DiditAdapter["DiditSessionError"]>;

/** Obvious fakes. See the header: no case may depend on a real credential being present OR absent. */
const FAKE_API_KEY = "didit-test-key-not-a-credential";
const FAKE_WORKFLOW_ID = "00000000-1111-2222-3333-444444444444";
const APP_ORIGIN = "https://fitout.test";
const USER_ID = "user-123";

/**
 * The 201 Didit returns, transcribed VERBATIM from `18.1-RESEARCH.md § R1 § The create-session call`.
 *
 * ⚠ `status` is `"Not Started"` and there is NO `decision` key — that is the whole reason the adapter
 * may only ever produce `result: null` here. The check happens in a hosted flow the host has not
 * opened yet, and the verdict arrives later on a channel this call is not on.
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

/** The captured 201 minus one key — the "the vendor said yes but sent nothing usable" shapes. */
function without(body: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...body };
  delete copy[key];
  return copy;
}

/** Didit's auth refusal, verbatim — the SAME body for a missing, wrong, expired or foreign key. */
function forbiddenResponse(status: number): Response {
  return new Response(
    JSON.stringify({ detail: "You do not have permission to perform this action." }),
    { status },
  );
}

/** The single recorded fetch call: [url, init], with the body both parsed and RAW. */
function lastCall(mock: ReturnType<typeof vi.fn>): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  rawBody: string;
} {
  const [url, init] = mock.mock.calls[0] as [string, RequestInit];
  const rawBody = typeof init.body === "string" ? init.body : "";
  return {
    url,
    method: (init.method ?? "GET") as string,
    headers: init.headers as Record<string, string>,
    body: rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {},
    rawBody,
  };
}

/**
 * Drive the adapter expecting a REFUSAL, and prove there is nothing to write.
 *
 * The assertion that matters is `produced` staying `undefined`: "it threw" and "no
 * `VerificationResult` exists" are different claims, and only the second one is the fail-closed
 * property. A future adapter that caught its own error and returned a half-filled result would still
 * satisfy a bare `rejects.toThrow()` written the other way round.
 */
async function refuses(label: string): Promise<DiditSessionFailure> {
  let produced: DiditSessionStart | undefined;
  let caught: unknown;
  try {
    produced = await beginDiditVerification(USER_ID);
  } catch (err) {
    caught = err;
  }
  expect(produced, `${label}: NO VerificationResult may exist on a failed vendor call`).toBeUndefined();
  expect(caught, `${label}: the refusal must be the named error`).toBeInstanceOf(DiditSessionError);
  return caught as DiditSessionFailure;
}

let fetchMock: ReturnType<typeof vi.fn>;
let beginDiditVerification: DiditAdapter["beginDiditVerification"];
let diditVerificationProvider: DiditAdapter["diditVerificationProvider"];
let DiditRateLimitError: DiditAdapter["DiditRateLimitError"];
let DiditSessionError: DiditAdapter["DiditSessionError"];
let DIDIT_PROVIDER_NAME: DiditAdapter["DIDIT_PROVIDER_NAME"];
let isDiditSessionOpen: DiditAdapter["isDiditSessionOpen"];

beforeEach(async () => {
  vi.stubEnv("DIDIT_API_KEY", FAKE_API_KEY);
  vi.stubEnv("DIDIT_WORKFLOW_ID", FAKE_WORKFLOW_ID);
  vi.stubEnv("BETTER_AUTH_URL", APP_ORIGIN);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  ({
    beginDiditVerification,
    diditVerificationProvider,
    DiditRateLimitError,
    DiditSessionError,
    DIDIT_PROVIDER_NAME,
    isDiditSessionOpen,
  } = await import("@/lib/verification/providers/didit"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("D-256 / T-18.1-0501 — the outbound session request is the MINIMUM", () => {
  it("case 1 — the request is the MINIMUM: POST /v3/session/, x-api-key, and exactly three body keys", async () => {
    fetchMock.mockResolvedValue(jsonResponse(CAPTURED_201));

    await beginDiditVerification(USER_ID);

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://verification.didit.me/v3/session/");
    expect(call.method).toBe("POST");
    // The one header that authenticates. Its VALUE is the stubbed fake, so this case says nothing
    // about any real credential — only that the header is sent under the name Didit reads.
    expect(call.headers["x-api-key"]).toBe(FAKE_API_KEY);
    expect(call.headers["content-type"]).toBe("application/json");

    // SET EQUALITY, never a membership check. See the header and the observed red: a fourth key is
    // the defect this case exists for, and a subset assertion cannot see one.
    expect(
      Object.keys(call.body).sort(),
      "the request body's KEY SET is exactly {workflow_id, vendor_data, callback}",
    ).toEqual(["callback", "vendor_data", "workflow_id"]);

    // `vendor_data` is the FitOut user id — an opaque identifier, not PII, and the join key every
    // webhook echoes back. It is the ONLY thing about the host that crosses the boundary.
    expect(call.body.vendor_data).toBe(USER_ID);
    expect(call.body.workflow_id).toBe(FAKE_WORKFLOW_ID);
    expect(call.body.callback).toBe(`${APP_ORIGIN}/host/verify`);

    // And over the SERIALISED bytes, so a key nested inside another one cannot hide from the key-set
    // assertion above. Named individually because each is a different kind of mistake: two are
    // cross-border PII, one is where a debugging blob lands, and the fourth would be a code path
    // able to force a verdict — rejected on live applications, which is exactly why a path that can
    // send it must not exist at all (T-18.1-0504).
    for (const forbidden of ["contact_details", "expected_details", "metadata", "sandbox_scenario"]) {
      expect(call.rawBody, `the request must not carry ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe("R1 — the 201 is read correctly, and the hosted URL stays OUTSIDE the result", () => {
  it("case 2 — the captured response yields result null, checkedAt null, and the session id as vendorRef", async () => {
    fetchMock.mockResolvedValue(jsonResponse(CAPTURED_201));

    const started = await beginDiditVerification(USER_ID);

    // NOTHING HAS BEEN DECIDED YET, and both nulls say so. A `result` here would be a fabricated
    // verdict and a `checkedAt` would be a timestamp for a check that never ran.
    expect(started.verification.result).toBeNull();
    expect(started.verification.checkedAt).toBeNull();
    expect(started.verification.provider).toBe(DIDIT_PROVIDER_NAME);
    expect(started.verification.vendorRef).toBe(CAPTURED_201.session_id);

    // THE HOSTED URL IS BESIDE THE RESULT, NEVER INSIDE IT (T-18.1-0505). Key-set equality is the
    // instrument, because a deny-list naming `url` passes the day somebody calls it `hostedUrl`.
    expect(Object.keys(started.verification).sort()).toEqual(
      ["checkedAt", "provider", "result", "vendorRef"].sort(),
    );
    expect(started.hostedUrl).toBe(CAPTURED_201.url);
  });

  it("case 3 — an ELEVENTH response key does not disturb the read (ADDENDUM A7)", async () => {
    // The measured create-session response carries one key more than the vendor's own docs list
    // (`multi_account_segment`). A parser that asserted an exact response shape would have broken on
    // the real account while passing against the documentation — so the adapter reads two fields and
    // ignores the rest, and this case is what keeps it that way.
    fetchMock.mockResolvedValue(jsonResponse({ ...CAPTURED_201, multi_account_segment: null }));

    const started = await beginDiditVerification(USER_ID);
    expect(started.verification.vendorRef).toBe(CAPTURED_201.session_id);
    expect(started.hostedUrl).toBe(CAPTURED_201.url);
  });
});

describe("T-18.1-0503 — every failure path FAILS CLOSED: no VerificationResult exists", () => {
  it("case 4 — a non-2xx produces NO result (500, and the two auth statuses)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "boom" }, 500));
    const server = await refuses("HTTP 500");
    expect(server.status).toBe(500);

    // ⚠ 401 AND 403 ARE ONE FAULT WEARING TWO NUMBERS (ADDENDUM A5). A missing, malformed, expired
    // or wrong-application key all answer with the same body and no machine-readable discriminator,
    // so the adapter must not branch on which — and the message it raises is for an OPERATOR
    // (it names the credential), never for a host.
    for (const status of [401, 403]) {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(forbiddenResponse(status));
      const auth = await refuses(`HTTP ${status}`);
      expect(auth.status).toBe(status);
      expect(auth.message).toMatch(/credential/i);
      expect(auth.message).toContain("DIDIT_API_KEY");
    }
  });

  it("case 4b — a validation refusal exposes only Didit's bounded operator detail", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: {
            message: "workflow_id does not belong to this live application",
            echoed_request: { vendor_data: USER_ID },
          },
        },
        400,
      ),
    );

    const refusal = await refuses("HTTP 400 validation refusal");
    expect(refusal.message).toContain("workflow_id does not belong to this live application");
    expect(refusal.message).not.toContain("echoed_request");
    expect(refusal.message).not.toContain(USER_ID);
  });

  it("case 4c — an array-shaped validation refusal omits echoed input", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: [
            {
              loc: ["body", "workflow_id"],
              msg: "workflow_id is not accepted for this application",
              input: FAKE_WORKFLOW_ID,
            },
          ],
        },
        400,
      ),
    );

    const refusal = await refuses("HTTP 400 array validation refusal");
    expect(refusal.message).toContain("workflow_id is not accepted for this application");
    expect(refusal.message).not.toContain(FAKE_WORKFLOW_ID);
    expect(refusal.message).not.toContain("input");
  });

  it("case 5 — a 201 whose body carries no session handle produces NO result", async () => {
    // The dangerous shape: the vendor said yes, so a hopeful reader would take the 2xx as a started
    // check and write a row with an invented or empty `vendorRef` — a compliance column pointing at
    // nothing. Also covered: a handle with no destination (the host would be sent nowhere) and a
    // body that is not JSON at all.
    fetchMock.mockResolvedValue(jsonResponse(without(CAPTURED_201, "session_id")));
    await refuses("201 without session_id");

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(without(CAPTURED_201, "url")));
    await refuses("201 without url");

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("<html>gateway</html>", { status: 201 }));
    await refuses("201 that is not JSON");
  });

  it("case 6 — a rejected fetch produces NO result", async () => {
    // A DNS failure or a dropped connection. No session exists on the vendor's side either, so the
    // only correct outcome is a refusal the caller cannot mistake for a check.
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const transport = await refuses("transport failure");
    expect(transport.status, "there was no response, so there is no status").toBeNull();
  });
});

describe("D-256 — the verdict half, and what its null vendorRef means", () => {
  it("case 7 — verify() returns provider didit, a non-null checkedAt, and vendorRef null meaning NO NEW HANDLE", () => {
    const before = Date.now();
    const out = diditVerificationProvider.verify({ result: "pass" });
    const after = Date.now();

    expect(out).not.toBeInstanceOf(Promise);
    const verdict = out as Awaited<typeof out>;

    expect(verdict.provider).toBe("didit");
    expect(verdict.result).toBe("pass");
    expect(verdict.checkedAt).toBeInstanceOf(Date);
    expect(verdict.checkedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(verdict.checkedAt!.getTime()).toBeLessThanOrEqual(after);

    expect(
      verdict.vendorRef,
      "`null` here means THIS CALL CARRIES NO NEW HANDLE — the session id written when the check " +
        "was STARTED still stands. Do not 'fix' this into an overwrite of host_verification." +
        "vendor_ref: that handle is the only pointer FitOut keeps at the vendor's copy of the " +
        "evidence, and plan 18.1-08 asserts the verdict write PRESERVES it.",
    ).toBeNull();

    // Both directions, because an adapter hardcoded to "pass" marks every declined host verified.
    const declined = diditVerificationProvider.verify({ result: "fail" });
    expect((declined as Awaited<typeof declined>).result).toBe("fail");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// D5 — WILL THE PARTNER HAND THIS SESSION BACK?  (`deferred-items.md` § D5, ADDENDUM A3)
// ════════════════════════════════════════════════════════════════════════════════════════════════
//
// `isDiditSessionOpen` is the reader the submission path asks BEFORE it asks for a session, so that a
// host who walked away mid-flow is handed their OWN session instead of being locked out until it
// expires — and so that a session the partner has already FINISHED is refused rather than replaced by
// a fresh billable one that would orphan a verdict in flight.
//
// ⚠ EVERY CASE ALSO MEASURES THE CALL. This file's own rule: a return value that coincides with a
// fail-closed default is vacuous unless the call itself is measured — `false` is what a broken read
// would produce too, so "it returned false" says nothing on its own.

const SESSION_ID = "8bb15a5c-a71e-4393-984b-033ef1f69278";

/** The decision endpoint's answer, narrowed to the one field this reader cares about. */
function decisionResponse(status: unknown, httpStatus = 200): Response {
  return new Response(JSON.stringify({ status }), { status: httpStatus });
}

describe("D5 / ADDENDUM A3 — the adapter answers ONE question about the vendor's session", () => {
  it("case 9 — an UNFINISHED session reads OPEN, and a FINISHED one does not", async () => {
    // The exact state D5 was measured in: 128 minutes after the press, the operator's own session
    // still read "Not Started" with `expires_at` seven days out. This is the answer that lets the
    // submission path hand it back.
    fetchMock.mockResolvedValue(decisionResponse("Not Started"));
    expect(await isDiditSessionOpen(SESSION_ID)).toBe(true);
    expect(fetchMock.mock.calls, "the vendor was actually asked, exactly once").toHaveLength(1);

    // And the GET really is the decision read, on the encoded path, with the credential header.
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://verification.didit.me/v3/session/${encodeURIComponent(SESSION_ID)}/decision/`,
    );
    expect((init.method ?? "GET").toUpperCase()).toBe("GET");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(FAKE_API_KEY);

    // A finished session is never reused, so asking again would mint a NEW one — which is the whole
    // reason the caller has to ask first.
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(decisionResponse("Approved"));
    expect(await isDiditSessionOpen(SESSION_ID)).toBe(false);
    expect(fetchMock.mock.calls).toHaveLength(1);
  });

  it("case 10 — a status the mapper has never heard of reads CLOSED, and does not throw", async () => {
    // FAIL CLOSED ON THE AXIS WHERE PERMISSIVE COSTS MONEY. An eleventh vendor status must not be
    // read as "go ahead and ask for a session": that would spend a billable session and repoint the
    // one column pointing at the vendor's copy of the evidence. It is a false rather than a throw
    // because the read SUCCEEDED — the vendor answered, FitOut simply does not recognise the answer.
    fetchMock.mockResolvedValue(decisionResponse("Teleported"));

    let threw: unknown;
    let answer: boolean | undefined;
    try {
      answer = await isDiditSessionOpen(SESSION_ID);
    } catch (err) {
      threw = err;
    }

    expect(threw, "an unrecognised status is an answer, not a transport failure").toBeUndefined();
    expect(answer).toBe(false);
    expect(fetchMock.mock.calls).toHaveLength(1);
  });

  it("case 11 — a 429 rejects with the RATE-LIMIT refusal, and it is not swallowed into `false`", async () => {
    // ⚠ THE ABSENCE OF A `catch` IN THE ADAPTER IS THE DECISION THIS CASE PINS. `false` is the answer
    // that REFUSES a host, so a swallowed failure would refuse somebody on the strength of a question
    // that never got an answer. The caller must be able to tell "the partner says this session is
    // finished" from "we could not ask" — they are different refusals with different sentences.
    fetchMock.mockResolvedValue(decisionResponse("Not Started", 429));

    let caught: unknown;
    let answer: boolean | undefined;
    try {
      answer = await isDiditSessionOpen(SESSION_ID);
    } catch (err) {
      caught = err;
    }

    expect(answer, "no boolean may exist when the read failed").toBeUndefined();
    expect(caught).toBeInstanceOf(DiditRateLimitError);
    expect((caught as DiditSessionFailure).status).toBe(429);
    expect(fetchMock.mock.calls).toHaveLength(1);
  });

  it("case 12 — a 403 rejects with the CREDENTIAL refusal, unchanged from the read it wraps", async () => {
    // ONE credential fault wearing two numbers (ADDENDUM A5). The message is for an OPERATOR — it
    // names the env var and never its value — and nothing here is fit to show a host.
    fetchMock.mockResolvedValue(forbiddenResponse(403));

    let caught: unknown;
    let answer: boolean | undefined;
    try {
      answer = await isDiditSessionOpen(SESSION_ID);
    } catch (err) {
      caught = err;
    }

    expect(answer).toBeUndefined();
    expect(caught).toBeInstanceOf(DiditSessionError);
    expect((caught as DiditSessionFailure).status).toBe(403);
    expect((caught as DiditSessionFailure).message).toContain("DIDIT_API_KEY");
    expect(fetchMock.mock.calls).toHaveLength(1);
  });
});

describe("HVER-01 — the port still fails closed through the new adapter", () => {
  it("case 8 — a session that was CREATED but never completed is NOT verified", async () => {
    fetchMock.mockResolvedValue(jsonResponse(CAPTURED_201));

    const started = await beginDiditVerification(USER_ID);

    // The one line that ties the asking half back to the port's contract: `result: null` reads as
    // NOT VERIFIED, so a host who opened the hosted flow and walked away is exactly as unverified as
    // one who never started. The listing gate (18.1-08) reads this predicate and nothing else.
    expect(isVerified(started.verification)).toBe(false);
  });
});
