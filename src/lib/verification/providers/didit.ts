import "server-only";

import { absolutePublicUrl } from "@/lib/app-origins";

// The DIDIT verification provider (D-258) — a REGISTRATION behind the shipped port, not a
// re-architecture.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// TWO MOMENTS, TWO ENTRY POINTS — FINDING F-5, OPTION (b), APPLIED
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `src/lib/verification/port.ts`'s header settles the shape this file has to take, and it is worth
// restating where the vendor actually is:
//
//   · `beginDiditVerification(userId)` is FitOut ASKING. It creates a hosted session and hands back
//     the same four-field `VerificationResult` with `result: null` and `checkedAt: null`, because
//     nobody has decided anything yet — writing either field here would fabricate a check. It is
//     deliberately NOT a member of `VerificationProvider` and is therefore NOT reachable through
//     `runVerification`: a session request decides nothing, so routing it through the verdict's
//     single branch point would buy no safety and add a discriminator a later reader can get wrong
//     on the path that actually matters.
//   · `diditVerificationProvider.verify(decision)` is a VERDICT HANDED IN — the moment Didit's
//     answer has already arrived on a channel this module is not on (the signed webhook, plan
//     18.1-08; the reconciliation sweep, plan 18.1-09) and needs shaping into something persistable.
//
// ⚠ AND SINCE 18.1-09 THERE IS A THIRD, WHICH IS NOT A THIRD OPINION. `fetchDiditDecision(sessionId)`
// is FitOut ASKING WHAT WAS ALREADY DECIDED — the vendor's officially-supported polling fallback,
// reached only by the reconciliation sweep. It READS; it decides nothing. It returns the vendor's own
// status string and the vendor's own decision payload, untranslated, so the shared mapper in
// `../didit-verdict.ts` stays the single translation and `../apply-verdict.ts` stays the single
// write. Like `beginDiditVerification` it is deliberately NOT a member of `VerificationProvider`:
// asking a question is not answering one, and routing a READ through the verdict's single branch
// point would add a discriminator to the path that actually matters in exchange for nothing.
//
// ⚠ IT RECONCILES BY READING AND NEVER BY RE-CREATING. `POST /v3/session/` is idempotent over
// UNFINISHED sessions on the same `vendor_data` (ADDENDUM A3), so a sweep that "retried" by creating
// a session would be handed the SAME session back and would have learned nothing at all — a no-op
// wearing the shape of a fix.
//
// ⚠ AND SINCE 18.1-15 THERE IS A FOURTH, WHICH IS THE SAME READ ASKING A NARROWER QUESTION.
// `isDiditSessionOpen(sessionId)` calls that same GET and returns ONE BOOLEAN: whether the partner
// still considers the session unfinished and will therefore hand it back. That is precisely what A3's
// idempotency is a fact about, and the submission path needs it BEFORE it asks for a session so that
// a host who walked away mid-flow gets their OWN session returned instead of being locked out until
// it expires (`deferred-items.md` § D5). It is a READ like the third: it decides nothing, writes
// nothing, and translates nothing — the shared mapper does that, and `../apply-verdict.ts` is still
// the only writer.
//
// THE DISCIPLINE THAT KEEPS THE ASKING HALF HONEST, stated because the port cannot police it: the
// begin path may only ever produce `result: null`. Nothing but `verify` — reached through
// `runVerification` — may produce a non-null verdict.
//
// ⚠ AND NEITHER HALF MAY BE REACHED BY COMPARING A PROVIDER NAME TO THIS VENDOR'S AT A CALL SITE.
// The registry in port.ts is the ONE mapping from a provider name to an adapter (property 1 in its
// header), and an acceptance grep asserts that such a comparison appears nowhere under `src/` — so
// do not spell one here either, not even to forbid it (a gate about a string's absence goes red on
// prose quoting that string; this repo has closed that same collision more times than it is funny).
// Nothing else in the codebase learns this name: the constant below is exported so the registry can
// key itself from it, not so a caller can test against it.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE GUARD IS ON THIS FILE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `src/lib/payments/fees.ts:1-30`'s rule: guard the module a client must never REACH, not the module
// a client legitimately IMPORTS. The case is STRONGER here than on the manual adapter, because this
// module additionally holds an API key: a non-`NEXT_PUBLIC_` env read that reaches a browser bundle
// resolves to its fallback and the credential itself would ship in the graph. So the directive sits
// on line 1, above every comment, and `port.ts` stays free of it — the port inherits the guard by
// transitivity through the registry import, so a client component that pulls a VALUE out of the port
// fails `next build` naming THIS file, which is the correct file to name.
//
// NO PACKAGE WAS INSTALLED FOR THE GUARD. Next aliases the specifier in its own bundler and declares
// the module at node_modules/next/types/global.d.ts:57; both Vitest configs alias it to
// tests/helpers/server-only.stub.ts. Installing it is a recorded-decision reversal (D-34 / GATE-05),
// not a fix.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// NO SDK — AND THE NEAR-MISS PACKAGE IS A REAL ONE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// This is CLAUDE.md's PayMongo rule applied verbatim: a vendor with no official SDK gets a thin
// server-side `fetch` wrapper shaped like `src/lib/paymongo.ts`, and nothing is installed. Didit's
// own API reference shows a native `fetch` example; the surface this phase needs is two endpoints,
// one header and one HMAC.
//
// ⚠ `didit-sdk` on npm is a DIFFERENT PRODUCT — a Web3 login protocol from Gamium (~8 downloads a
// week, real repo, completely wrong vendor). It is a name-collision trap rather than a hallucinated
// package: it installs cleanly and passes every registry check. `@didit/sdk` and `@didit-sdk/client`
// do not exist. 18.1-RESEARCH § Package Legitimacy Audit records the disposition: install NOTHING.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE STORAGE CONTRACT, RESTATED WHERE THE VENDOR IS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// FitOut persists ONLY `{ result, vendorRef, checkedAt, provider }`. The document, the selfie, the
// ID number and the raw vendor payload stay on Didit; `vendorRef` — the session id — is the only
// handle FitOut keeps pointing at their copy, and `host_verification` has no column that could hold
// anything else (asserted against `information_schema.columns` by
// tests/ops/verification-schema.test.ts).
//
// The hosted `url` a new session comes back with is therefore returned BESIDE the result and never
// inside it (see `DiditSessionStart`). It is a redirect target with a session token in it, it is not
// a fact about a check, and a fifth field is exactly how one becomes the other.
//
// OVER-DISCLOSURE IS THE OTHER DIRECTION OF THE SAME RULE (T-18.1-0501). The request body below is
// three keys and the test asserts that key set by EQUALITY. Didit's create-session endpoint also
// accepts the host's email and phone, and a free-form echoed object; sending any of them is a
// cross-border PII transfer that the regulatory brief permits and that nobody asked for. `user.id`
// is an opaque identifier, not PII, and it is the join key every webhook echoes back.
//
// ⚠ AND THERE IS NO CODE PATH HERE THAT CAN FORCE A SANDBOX OUTCOME. The create endpoint accepts a
// field that makes a session resolve to a chosen verdict; it is rejected on live applications, and
// that rejection is the guarantee a test hook cannot auto-approve a real host. A branch able to send
// it is a branch somebody eventually points at production, so this module has none — sandbox forcing
// happens in the Console or in a human-run sandbox session (plan 18.1-14). An acceptance grep
// asserts the field name appears zero times in this file, so do not "helpfully" name it in a comment
// either.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// FAIL CLOSED, ON EVERY FAILURE THIS CALL HAS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// A non-2xx, a body that is not JSON, a body without a session id, and a rejected `fetch` all THROW
// `DiditSessionError`. None of them returns a partially-filled `VerificationResult`, and none of them
// invents a `vendorRef`. The caller writes NO row: there is no object to write, which is strictly
// stronger than "writes a failing one" (port.ts property 2, one layer out).
//
// ⚠ AUTH FAILURES ARE 403 AND NEVER 401, WITH NO MACHINE-READABLE DISCRIMINATOR. A missing,
// malformed, expired or wrong-application key all answer `403 {"detail":"You do not have permission
// to perform this action."}` on this endpoint family (18.1-RESEARCH § ADDENDUM A5, measured). Do not
// branch on 401-vs-403 to tell "no key" from "wrong key" — the information is not in the response.
// Both are ONE credential fault, they are an OPERATOR's problem, and the sentence below says so;
// nothing here is fit to show a host.

// ⚠ THE FIRST VALUE IMPORT FROM THE MAPPER, AND IT IS THE POINT RATHER THAN AN EXCEPTION. This file
// imported two TYPES from `../didit-verdict` and no values; `isDiditSessionOpen` below resolves the
// vendor's answer through the SHARED mapper so that the ten strings keep their ONE reader. There is
// no cycle: `didit-verdict.ts` imports only from `@/lib/validation/ops`.
import { mapDiditStatus } from "../didit-verdict";
import type { DiditDecision, DiditFeatureReport } from "../didit-verdict";
import type {
  VerificationDecision,
  VerificationProvider,
  VerificationResult,
} from "../port";

/**
 * The registry key AND the value written to `host_verification.provider`. One constant, so the
 * registered name and the persisted name cannot drift — a drift would leave rows attributed to a
 * provider the port can no longer resolve, i.e. rows nobody can explain.
 *
 * ⚠ `'migration'` is the THIRD provider string in this system (drizzle/0026's grandfather rows) and
 * it is deliberately NOT registered anywhere: nothing was checked on those rows, so there is no
 * adapter that could have produced them and no code path that may re-run one.
 */
export const DIDIT_PROVIDER_NAME = "didit";

/**
 * Didit's verification API base. Every caller passes a FULLY versioned `/v3/...` path, on
 * `src/lib/paymongo.ts:21-24`'s rule — the vendor mixes version prefixes across endpoint families,
 * and a base that already carries one is how a `/v3` call ends up at `/v3/v3/...`.
 */
const DIDIT_VERIFICATION_API = "https://verification.didit.me";

/**
 * Where the host lands after the hosted flow. ⚠ UX ONLY — NO STATE MAY EVER DERIVE FROM IT.
 *
 * The redirect is attacker-controllable: anybody can open this URL with any query string at any
 * time, including a host who abandoned the flow. `/host/verify` renders from `host_verification`,
 * and the only things that may MOVE that row are the signed webhook (18.1-08) and the reconciliation
 * sweep (18.1-09). 18.1-RESEARCH § ADDENDUM A9.
 */
const CALLBACK_PATH = "/host/verify";

// Fail-closed at module load — production only (dev/test/build tolerate an absent credential).
//
// A misconfigured deploy is a LOUD BOOT FAILURE rather than a silent verification outage: without
// these two values every session request would 403 and every host would sit at "we could not start
// your check" with nothing naming the cause. `src/lib/paymongo.ts:26-32` is the shape.
//
// THE `NEXT_PHASE` ESCAPE IS THE `paymongo.ts:41` ONE and it is load-bearing, not decorative:
// `next build` runs with NODE_ENV=production while importing this module through the port, and a
// build is not a boot — a machine that has never held the credentials must still be able to compile
// the app. The guard therefore fires on a real production RUNTIME only.
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  (!process.env.DIDIT_API_KEY || !process.env.DIDIT_WORKFLOW_ID)
) {
  throw new Error(
    "DIDIT_API_KEY / DIDIT_WORKFLOW_ID are not set. Refusing to boot in production without them — " +
      "they authenticate every verification session request and name the workflow it runs, and " +
      "without them no host can be verified at all. Set them in the deploy environment.",
  );
}

/**
 * The named refusal every failure path throws. Fail-closed means the caller gets NO result, so the
 * failure has to arrive as a throw rather than as a shaped-but-empty return.
 *
 * `status` is the HTTP status when there was a response and `null` when the request never completed.
 * ⚠ It is here for an operator log, NOT for a branch that tells one credential fault from another —
 * see the header: 401 and 403 are the same fault wearing two numbers.
 */
export class DiditSessionError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DiditSessionError";
    this.status = status;
  }
}

/**
 * THE ONE FAILURE THAT IS NOT A FAILURE OF THE CHECK — it is a failure of the ASKING, and it is
 * retryable on the next tick.
 *
 * A named subclass rather than a `status === 429` test at the caller, because the two answers mean
 * opposite things to a batched sweep and folding them together would make the wrong one the default:
 *
 *   · Any other refusal means "we did not learn about THIS session" — skip the row, keep sweeping.
 *   · A 429 means "you are asking too fast" — and continuing to ask is precisely what makes it
 *     worse. The sweep stops the pass cleanly and the next tick resumes where it left off; the rows
 *     it had not reached are still `pending`, still stale, and therefore still selected.
 *
 * Didit's GET ceiling is **600/min per API key on the paid tier and 10/min on the free tier**
 * (18.1-RESEARCH § R1 § The status / decision retrieval endpoint), so on the free tier this is a
 * ceiling a careless batch size can actually reach. `DIDIT_RECONCILE_BATCH_LIMIT` is sized against
 * the lower of the two; this class is what makes being wrong about that survivable rather than a
 * tight loop against a vendor that is already saying stop.
 *
 * It extends the module's refusal rather than standing beside it, so a caller that only knows about
 * `DiditSessionError` still fails closed and never mistakes a rate limit for a verdict.
 */
export class DiditRateLimitError extends DiditSessionError {
  constructor(message: string) {
    super(message, 429);
    this.name = "DiditRateLimitError";
  }
}

/**
 * What starting a check produces: the persistable four-field result, and — SEPARATELY — the hosted
 * URL the host is redirected to.
 *
 * ⚠ THE SPLIT IS THE POINT. `hostedUrl` is a redirect target carrying a session token; it is not a
 * fact about a check, it must never become a fifth field on `VerificationResult`, and it must never
 * be persisted. Keeping it out here is what makes that impossible rather than merely discouraged.
 */
export type DiditSessionStart = {
  readonly verification: VerificationResult;
  readonly hostedUrl: string;
};

/** The create-session response, narrowed to the ONLY two fields FitOut reads. */
type DiditSessionResponse = {
  session_id?: unknown;
  url?: unknown;
};

/**
 * Extract the one operator-useful validation message from a refused request without retaining the
 * vendor's entire body. Didit may include session handles or echoed request values in future error
 * schemas; those are deliberately not accepted here. The selected fields are bounded so this error
 * remains safe for the protected server log that records it.
 */
function diditFailureDetail(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return "";
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return "";

  const body = parsed as Record<string, unknown>;
  const detail = body.detail;
  const candidate =
    typeof detail === "string"
      ? detail
      : detail !== null && typeof detail === "object" && !Array.isArray(detail)
        ? ((detail as Record<string, unknown>).message ?? (detail as Record<string, unknown>).code)
        : body.message ?? body.code;

  if (typeof candidate !== "string") return "";

  const compact = candidate.replaceAll(/\s+/g, " ").trim();
  return compact === "" ? "" : compact.slice(0, 240);
}

/**
 * The decision-endpoint response, narrowed to what FitOut is allowed to read.
 *
 * ⚠ PLURAL ARRAYS, AND THE SINGULAR SPELLINGS ARE ABSENT BY CONSTRUCTION. V3 returns one array per
 * feature family, each item carrying its own `node_id` and its own feature-level status, and a block
 * is `null` until that feature has run (ADDENDUM A8). The V2 singular keys ship only for a
 * destination pinned to the older version: on ours they are `undefined`, which reads as "not
 * approved" and would refuse every host (18.1-RESEARCH § Pitfall 2). A field that is not on this
 * type cannot be read by accident.
 *
 * Every field is `unknown` because all of it arrives from outside FitOut — the same rule
 * `../didit-verdict.ts` states for the webhook's copy of the same payload.
 */
type DiditDecisionResponse = {
  status?: unknown;
  id_verifications?: unknown;
  liveness_checks?: unknown;
  face_matches?: unknown;
};

/**
 * What READING an already-decided session produces: the vendor's own status string and the vendor's
 * own decision payload, both untranslated.
 *
 * ⚠ `status` IS HANDED BACK IN WHATEVER SPELLING ARRIVED, AND THAT IS THE POINT. The decision
 * endpoint answers in one casing and the webhook envelope answers in another for the same verdict
 * (18.1-RESEARCH § R1, two vendor pages) — so there is a real normalisation to do, and it is already
 * done, ONCE, inside `../didit-verdict.ts`'s mapper, which both delivery paths share. A second
 * normaliser here would be a second thing to keep in agreement about the ten strings that decide
 * whether a host may sell, and the two would disagree the day the vendor adds an eleventh.
 *
 * ⚠ NO MEDIA VALUE IS MODELLED. A real decision carries short-lived presigned URLs; none is
 * representable here, so none can be persisted (ADDENDUM A8 / D-263 — store a reason, not evidence).
 */
export type DiditSessionDecision = {
  /** The vendor's session status, verbatim. Translated by the shared mapper and by nothing else. */
  readonly status: string;
  /** The three feature families the composed workflow runs. Passed through unread by this module. */
  readonly decision: DiditDecision;
};

/**
/**
 * START a check: create a Didit hosted session for one FitOut user.
 *
 * ⚠ NOT part of `VerificationProvider` and NOT reachable through `runVerification` — see the header.
 * It returns `result: null` / `checkedAt: null` because at this instant nothing has been decided,
 * which is precisely why `isVerified()` reads a freshly-created session as NOT verified.
 *
 * IT IS ALSO NOT A DUPLICATE-PRESS HAZARD. `POST /v3/session/` is idempotent over UNFINISHED
 * sessions on the same `vendor_data`: a second press returns the SAME session (still 201) with only
 * the callback updated, and finished sessions are never reused (18.1-RESEARCH § ADDENDUM A3). ⚠ Its
 * corollary is FINDING F-1 — the returned session's own creation instant does NOT move on a retry,
 * so FitOut's cooldown must be derived from `host_verification.updated_at` and never from anything
 * this response carries.
 *
 * @throws DiditSessionError on a non-2xx, an unparseable body, a body missing the session handle, or
 *   a transport failure. Never returns a partially-filled result.
 */
export async function beginDiditVerification(userId: string): Promise<DiditSessionStart> {
  const apiKey = process.env.DIDIT_API_KEY ?? "";
  const workflowId = process.env.DIDIT_WORKFLOW_ID ?? "";
  const path = "/v3/session/";

  // THE MINIMUM, AND THE KEY SET IS ASSERTED BY EQUALITY IN THE TEST (T-18.1-0501).
  //
  //   workflow_id — which workflow runs. One env var, composed once (OCR + LIVENESS + FACE_MATCH).
  //   vendor_data — the FitOut `user.id`. An opaque identifier, not PII, and the join key every
  //                 webhook echoes back. This is the ONLY thing about the host that crosses.
  //   callback    — where the host lands afterwards. UX only; see CALLBACK_PATH.
  //
  // Everything else Didit accepts is deliberately absent. The two fields that would carry the host's
  // email and phone are a cross-border PII transfer nobody asked for, and the free-form echoed
  // object is one refactor away from becoming somewhere a debugging blob lands.
  const body = {
    workflow_id: workflowId,
    vendor_data: userId,
    callback: absolutePublicUrl(CALLBACK_PATH),
  };

  let res: Response;
  try {
    res = await fetch(`${DIDIT_VERIFICATION_API}${path}`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    // A DNS failure, a dropped connection, an aborted request. No session exists, so no row may.
    throw new DiditSessionError(
      `Didit POST ${path} did not complete. No session was created.`,
      null,
      { cause },
    );
  }

  const text = await res.text();

  if (!res.ok) {
    // ONE credential fault, two numbers. See the header: the vendor gives no discriminator, so
    // neither does this message — and it is written for an OPERATOR, never for a host.
    if (res.status === 401 || res.status === 403) {
      throw new DiditSessionError(
        `Didit refused the credential on POST ${path} (HTTP ${res.status}). A missing, malformed, ` +
          "expired or wrong-application DIDIT_API_KEY all answer this way and cannot be told apart " +
          "from the response — check the deploy environment against the Didit Console application.",
        res.status,
      );
    }
    const detail = diditFailureDetail(text);
    throw new DiditSessionError(
      `Didit POST ${path} failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}. ` +
        "No session was created.",
      res.status,
    );
  }

  let parsed: DiditSessionResponse;
  try {
    parsed = JSON.parse(text) as DiditSessionResponse;
  } catch (cause) {
    throw new DiditSessionError(
      `Didit POST ${path} returned a body that is not JSON.`,
      res.status,
      { cause },
    );
  }

  // ⚠ READ TWO FIELDS, NEVER A KEY SET. The measured create-session response carries ELEVEN keys —
  // one more than the vendor's own documentation lists — so a parser that asserts an exact shape
  // breaks the day the vendor adds a twelfth (18.1-RESEARCH § ADDENDUM A7). Read what is needed,
  // check it is a usable string, ignore the rest.
  const sessionId = typeof parsed.session_id === "string" ? parsed.session_id.trim() : "";
  const hostedUrl = typeof parsed.url === "string" ? parsed.url.trim() : "";

  // A 2xx that carries neither a handle nor a destination is not a started check. Refusing here is
  // what stops a `vendorRef` being invented for a session that may not exist, and stops a host being
  // sent nowhere. Both are fail-closed: no result is produced, so no row can be written.
  if (sessionId === "" || hostedUrl === "") {
    throw new DiditSessionError(
      `Didit POST ${path} returned ${res.status} without a usable session handle. No check started.`,
      res.status,
    );
  }

  return {
    verification: {
      // NOTHING HAS BEEN DECIDED. The host has not opened the flow; `status` on creation is always
      // the not-started one and the create response carries no decision at all. A verdict here would
      // be fabricated, and `checkedAt` would be a timestamp for a check that never ran — the same
      // rule the grandfathered rows are held to.
      result: null,
      vendorRef: sessionId,
      checkedAt: null,
      provider: DIDIT_PROVIDER_NAME,
    },
    hostedUrl,
  };
}

/**
 * One feature block off a decision response, or `null` when that feature has not run.
 *
 * `null` and "not an array" collapse to the same answer deliberately: the composer treats an absent
 * block as contributing nothing rather than as a reason to throw, because a decline can arrive
 * before every feature ran (ADDENDUM A8). Nothing INSIDE a report is inspected here — the warning
 * allow-list, the log-level gate and the D-265 sentence are all `../didit-verdict.ts`'s, and a
 * second reader here would be a second opinion about what a vendor warning means.
 */
function featureBlock(value: unknown): readonly DiditFeatureReport[] | null {
  return Array.isArray(value) ? (value as readonly DiditFeatureReport[]) : null;
}

/**
 * READ an already-decided session: `GET /v3/session/{sessionId}/decision/`.
 *
 * THE OFFICIALLY-SUPPORTED POLLING FALLBACK, and the only reason it exists is FINDING F-4. Didit
 * retries a failed webhook delivery at most TWICE (~1 min, ~4 min) and then drops it PERMANENTLY, so
 * a deploy or a five-second timeout inside that window loses a verdict forever — and under D-262
 * (nobody confirms) plus D-263 (the host has no route to a person) a lost verdict is a host who sits
 * at pending with nothing anywhere failing to say so. The vendor's own guidance is
 * "webhook-then-fetch": the webhook is the fast path and THIS is what makes it survivable.
 *
 * ⚠ IT IS A READ, AND IT REMAINS ONE. It produces no `VerificationResult`, writes nothing, and
 * translates nothing. `../didit-verdict.ts` maps the status; `../apply-verdict.ts` performs the one
 * write. Both callers of a Didit answer go through both of those, which is what keeps a recovered
 * verdict and a delivered verdict the SAME verdict (D-105, one domain over).
 *
 * FAILS CLOSED ON EVERY FAILURE THIS CALL HAS, exactly as the create-session path does: a transport
 * failure, a 429, a refused credential, any other non-2xx, a body that is not JSON and a 2xx with no
 * usable status all THROW. None returns a half-filled answer and none invents a status, so the sweep
 * has nothing to apply and the row is left exactly where it was.
 *
 * @throws DiditRateLimitError on a 429 — retryable, and the one failure the caller must treat as
 *   "stop asking" rather than as "this row taught us nothing".
 * @throws DiditSessionError on every other failure.
 */
export async function fetchDiditDecision(sessionId: string): Promise<DiditSessionDecision> {
  const apiKey = process.env.DIDIT_API_KEY ?? "";
  // Encoded because it is interpolated into a URL path. The value comes from FitOut's own column,
  // written by the create-session response — but "the value is ours" is a property of today's
  // writer, not of this function, and a handle that ever carried a `/` would silently address a
  // different endpoint.
  const path = `/v3/session/${encodeURIComponent(sessionId)}/decision/`;

  let res: Response;
  try {
    res = await fetch(`${DIDIT_VERIFICATION_API}${path}`, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });
  } catch (cause) {
    throw new DiditSessionError(
      `Didit GET ${path} did not complete. Nothing was learned about this session.`,
      null,
      { cause },
    );
  }

  const text = await res.text();

  // FIRST, because it is the one refusal that is about the ASKING rather than about the session, and
  // because folding it into the generic branch below would tell the sweep to keep going.
  if (res.status === 429) {
    throw new DiditRateLimitError(
      `Didit rate-limited GET ${path} (HTTP 429). The pass stops here and resumes on the next tick.`,
    );
  }

  if (!res.ok) {
    // ONE credential fault, two numbers — the header's rule, and it holds on this endpoint family
    // too (ADDENDUM A5). Written for an OPERATOR; nothing here is fit to show a host.
    if (res.status === 401 || res.status === 403) {
      throw new DiditSessionError(
        `Didit refused the credential on GET ${path} (HTTP ${res.status}). A missing, malformed, ` +
          "expired or wrong-application DIDIT_API_KEY all answer this way and cannot be told apart " +
          "from the response — check the deploy environment against the Didit Console application.",
        res.status,
      );
    }
    throw new DiditSessionError(
      `Didit GET ${path} failed (HTTP ${res.status}). No verdict was read.`,
      res.status,
    );
  }

  let parsed: DiditDecisionResponse;
  try {
    parsed = JSON.parse(text) as DiditDecisionResponse;
  } catch (cause) {
    throw new DiditSessionError(
      `Didit GET ${path} returned a body that is not JSON.`,
      res.status,
      { cause },
    );
  }

  // ⚠ READ THE FIELDS NEEDED, NEVER A KEY SET — `beginDiditVerification`'s measured rule (ADDENDUM
  // A7): the vendor already ships more keys than its own documentation lists, so a parser that
  // asserts an exact shape breaks the day it ships one more.
  //
  // The emptiness test is over a trimmed copy while the RETURNED value is verbatim. A whitespace-only
  // status is not a status; but which of the vendor's two spellings arrived is a fact the shared
  // mapper is the only thing entitled to flatten.
  const status = typeof parsed.status === "string" ? parsed.status : "";
  if (status.trim() === "") {
    throw new DiditSessionError(
      `Didit GET ${path} returned ${res.status} without a usable session status. Nothing was read.`,
      res.status,
    );
  }

  // ⚠ THE THREE BLOCKS ARE READ FROM THE TOP LEVEL OF THIS RESPONSE, which is where the decision
  // endpoint puts them — the webhook nests the same three under a `decision` key, and the two
  // shapes genuinely differ. STATED BECAUSE THE BLAST RADIUS OF BEING WRONG IS BOUNDED AND WORTH
  // KNOWING: the STATUS is what decides, and it is top-level on both surfaces. If the nesting here
  // turned out to be otherwise, a recovered rejection would carry the canned product sentence alone
  // (the composer's fourth gate — never empty, D-265) instead of the vendor's own phrasing. It could
  // not produce a wrong verdict, and 18.1-14's sandbox walk records the real body.
  return {
    status,
    decision: {
      id_verifications: featureBlock(parsed.id_verifications),
      liveness_checks: featureBlock(parsed.liveness_checks),
      face_matches: featureBlock(parsed.face_matches),
    },
  };
}

/**
 * ASK WHETHER THE PARTNER WILL HAND THIS SESSION BACK — one question, one boolean, no verdict.
 *
 * `POST /v3/session/` is idempotent over UNFINISHED sessions on the same `vendor_data`: an open
 * session is RETURNED (still `201`) with a fresh, usable `url`, and a finished one is never reused
 * (18.1-RESEARCH § ADDENDUM A3, confirmed first-hand against a real stuck session on 2026-09-02).
 * The submission path needs that fact BEFORE it asks, so it can hand a distracted host back their own
 * flow without ever repointing `vendor_ref` at a fresh billable session — which is what would orphan
 * a verdict that is already in flight (`deferred-items.md` § D5).
 *
 * The whole body is a read and a lookup: `fetchDiditDecision` for the status, the shared mapper for
 * what it means. NO SECOND NORMALISER AND NO STATUS LITERAL AT THIS LEVEL — the ten spellings have
 * one reader (`../didit-verdict.ts`), and a comparison here would be a second thing to keep in
 * agreement with it the day the vendor adds an eleventh.
 *
 * ⚠ IT DOES NOT SWALLOW A FAILURE, AND THE ABSENCE OF A `catch` IS THE DECISION. Every refusal
 * `fetchDiditDecision` throws propagates unchanged, because "closed" is the answer that REFUSES a
 * host: a swallowed 403 or a swallowed transport failure would silently become "this session is
 * finished", and the caller would refuse a host on the strength of a question it never got an answer
 * to. A caller that cannot learn whether a session is open must fail closed on its own terms —
 * refusing to mint one — and it can only do that if the failure reaches it.
 *
 * ⚠ AND IT DECIDES NOTHING ABOUT A HOST. It reads a status and answers one question about the
 * VENDOR'S SESSION. It applies no verdict, calls no write module, touches no database and returns
 * nothing a row could be built from. The signed webhook (18.1-08) and the reconciliation sweep
 * (18.1-09) remain the only two roads a verdict travels, and `../apply-verdict.ts` remains the only
 * writer. This sentence is here because the property a later reader is most likely to break is the
 * helpful one: this function can SEE a finished session's status, and recovering the verdict from it
 * would be a third road to `approved`.
 *
 * @throws DiditRateLimitError on a 429, and DiditSessionError on every other failure — both unchanged
 *   from `fetchDiditDecision`, which is the only call this makes.
 */
export async function isDiditSessionOpen(sessionId: string): Promise<boolean> {
  const decision = await fetchDiditDecision(sessionId);
  return mapDiditStatus(decision.status).sessionOpen;
}

/**
 * The Didit adapter as the port sees it: ONE method, and it takes a verdict that has ALREADY
 * arrived. The webhook (18.1-08) and the reconciliation sweep (18.1-09) are the two callers, and
 * both reach it through `runVerification` so the verdict keeps its single code path.
 *
 * Synchronous — mapping a decision to four fields awaits nothing. The interface permits a promise
 * (18.1-04's widening) so the ASKING half above can be async; that widening does not oblige this
 * half to become async, and `await` on a non-promise is a legal no-op at the port.
 */
export const diditVerificationProvider: VerificationProvider = {
  name: DIDIT_PROVIDER_NAME,
  verify(decision: VerificationDecision): VerificationResult {
    return {
      result: decision.result,
      // ⚠ `null` HERE DOES NOT MEAN "THERE IS NO VENDOR HANDLE" — unlike the manual provider, where
      // it means exactly that. It means THIS CALL CARRIES NO NEW HANDLE: the session id was written
      // when the check was STARTED and it is still the right one. So the verdict write must PRESERVE
      // `vendor_ref` rather than overwrite it with this null (asserted by plan 18.1-08). Reading
      // this as "erase the handle" would throw away the only pointer FitOut has at the vendor's copy
      // of the evidence — the single thing a later compliance question is answered with.
      vendorRef: null,
      // PROVENANCE, never a comparand — the manual adapter's argument, and it holds here for the
      // same reason: nothing races against this value, no predicate compares it to a Postgres
      // `now()`, and no money is derived from it.
      //
      // ⚠ IT IS THE JS CLOCK AND NOT A FIELD OFF THE WEBHOOK BODY. State is derived from the
      // VERIFIED event, never from a client-supplied timestamp: a body that can choose when the
      // check happened can choose to have happened before a cooldown started.
      checkedAt: new Date(),
      provider: DIDIT_PROVIDER_NAME,
    };
  },
};
