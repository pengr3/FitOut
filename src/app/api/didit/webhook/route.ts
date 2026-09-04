// The Didit `status.updated` webhook — the HIGHEST-SEVERITY TRUST BOUNDARY IN THIS PHASE (HVER-07).
//
// A forged delivery here is a FABRICATED IDENTITY CHECK that makes an unverified host sellable
// through `deriveBookable`'s existing verification term. This endpoint is unauthenticated at the
// network layer and THE SIGNATURE IS THE ONLY AUTHENTICATION IT HAS.
//
// NOTE (verified, no code change): `src/middleware.ts` matches ONLY /login and /signup — it does NOT
// touch /api/didit, so this endpoint is reachable by Didit unauthenticated (correct — Didit is the
// caller, and the signature is the authentication).
//
// ⚠ THE VERDICT IS NOT WRITTEN HERE. This route owns the trust boundary — raw-body capture,
// signature verification, the freshness window, the environment gate and envelope parsing — and then
// hands three already-verified facts to `src/lib/verification/apply-verdict.ts`, which is the ONLY
// module that moves a `host_verification` row. Plan 18.1-09's reconciliation sweep calls that same
// module. Two independent statements moving a host into the verified state, reached by two readings
// of the same ten vendor strings, is exactly what D-105 forbids one domain over
// (`src/app/api/paymongo/webhook/route.ts:20-22`). Widen `applyDiditVerdict`; never write a second
// statement here.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ONE SUBSCRIPTION, AND NINE EVENT TYPES THAT ARE NOT HANDLED
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The destination is subscribed to `status.updated` ONLY (18.1-RESEARCH § ADDENDUM A2). The vendor
// offers nine others — none carries a verdict FitOut acts on, and each would double the surface this
// route has to authenticate. An unrecognised `webhook_type` is a 200 no-op with an audit row, so an
// accidental Console subscription is visible without burning the vendor's only two retries.
//
// ⚠ NO STATE MAY EVER DERIVE FROM THE `callback` REDIRECT (ADDENDUM A9). The host lands back on
// /host/verify, and that page renders from `host_verification`. The redirect is attacker-
// controllable — anybody can open it with any query string at any time, including a host who
// abandoned the flow. This signed delivery and the 18.1-09 sweep are the only two things that move
// the row.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO DELIBERATE DIVERGENCES FROM THE PAYMONGO ROUTE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// This file follows `src/app/api/paymongo/webhook/route.ts` property for property. Two things
// differ, both on purpose, both argued here because neither has an in-repo precedent:
//
//   1. A FRESHNESS WINDOW (±300s). PayMongo has no equivalent, so this is a STRENGTHENING rather
//      than a copy. It is the second of TWO INDEPENDENT REPLAY CONTROLS; the other is the guarded
//      `WHERE status = 'pending'` inside the write module, which makes a re-delivery flip 0 rows.
//      Each is pinned by its own test case so neither can silently carry the other.
//
//      ⚠ AND THE HEADER'S COPY OF THE TIMESTAMP IS NOT AUTHENTICATED, WHICH MATTERS. PayMongo signs
//      `${t}.${rawBody}` — its timestamp is INSIDE the signed message, so rewriting it breaks the
//      signature. Didit's primary signature covers THE RAW BODY ALONE, so `X-Timestamp` is a header
//      an attacker replaying a captured body may freely rewrite. The envelope's own `timestamp`
//      field IS inside the signed bytes. So BOTH are checked: the header first as a cheap
//      pre-filter, and the body's field after verification as the control that actually holds. A
//      genuine retry passes both — the vendor re-signs with a fresh timestamp on each attempt, and
//      both retries (~1 min, ~4 min) fall inside the window even measured from the original.
//
//   2. NO EVENT-LEDGER TABLE. PayMongo dedupes on a `paymongo_event` id ledger. Here the flip is the
//      only thing that happens, and the write module's state-scoped WHERE is strictly stronger for
//      the failure that matters: it also refuses a DIFFERENT event that would move an
//      already-decided row. Zero new schema, so `tests/ops/verification-schema.test.ts` stays green
//      untouched. ⚠ RETURN 200 ON THE 0-ROW PATH — a non-2xx would burn one of the vendor's only two
//      retries on an event that has already been handled.
//
// ⚠ RETRY BUDGET, AND WHY IT IS NOT COMPENSATED FOR HERE. Didit retries at most TWICE (~1 min,
// ~4 min) and then DROPS THE DELIVERY PERMANENTLY; `2xx` is success and `3xx`/`4xx` other than `404`
// are never retried. Its outbound timeout is 5 seconds. This route's work after verification is
// bounded — one UPDATE, one audit insert, one enqueue — and it is all AWAITED rather than detached:
// `src/lib/audit.ts:92-98` records the project reversing exactly that shortcut, because "the handler
// can return and the runtime can freeze the process before an un-awaited outbound request has
// flushed". The residual risk of a permanently-lost verdict is TRANSFERRED to plan 18.1-09's
// reconciliation sweep, which is where it is closed. Do not build a retry compensation here.
//
// ⚠ DO NOT ADD A SOURCE-ADDRESS FILTER. The vendor publishes one egress address, but it carries no
// stability guarantee (18.1-RESEARCH § Assumptions Log A10) and the signature is the authentication.
// A network-layer filter here would be a second gate that can only ever fail closed on real traffic
// the day the vendor moves. Stated so nobody adds one later.
//
// ⚠ LOCAL UAT NEEDS A TUNNEL. Didit blocks private and localhost destination URLs and ships no CLI,
// so a delivery cannot reach a dev server directly. The sandbox walk — which is also what settles
// EMPIRICALLY which of the two signature headers verifies against real bytes — belongs to plan
// 18.1-14, and a self-signed mock proves only that this file agrees with itself.

import { createHmac, timingSafeEqual } from "node:crypto";

import { recordAudit } from "@/lib/audit";
import { applyDiditVerdict } from "@/lib/verification/apply-verdict";
import type { DiditDecision } from "@/lib/verification/didit-verdict";

// Signature verification needs node crypto + the RAW request body — this MUST be the Node runtime, not edge.
export const runtime = "nodejs";

// Fail-closed prod boot guard (WR-03, mirrors `src/lib/paymongo.ts`, `src/app/api/inngest/route.ts`
// and `src/app/api/paymongo/webhook/route.ts:40-44`): the signature is this endpoint's ONLY
// authentication, so a missing or rotated-out secret would silently make verification fail closed
// and 400 EVERY delivery — every host stuck at "pending", no operator prompted (D-262/D-263), and
// the vendor dropping each verdict after two retries, with no startup signal anywhere. Refuse to
// boot in production without it so a misconfigured deploy is a loud boot FAILURE, not a silent
// verification outage. dev/test/build tolerate its absence (the mocked suite sets it per-test, and
// `next build` must not require prod secrets).
//
// The `NEXT_PHASE` escape is `src/lib/verification/providers/didit.ts:146-153`'s and is load-bearing
// for the same reason: `next build` runs with NODE_ENV=production, and a build is not a boot.
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.DIDIT_WEBHOOK_SECRET
) {
  throw new Error(
    "DIDIT_WEBHOOK_SECRET is required in production — the signature is the only authentication this " +
      "webhook has, and without it every identity verdict is refused and then permanently dropped.",
  );
}

/** The one `webhook_type` this route handles. ⚠ Compared case-sensitively (ADDENDUM A6). */
const HANDLED_EVENT = "status.updated";

/** The replay window, in seconds. The vendor's own figure; see divergence 1 in the header. */
const FRESHNESS_WINDOW_SECONDS = 300;

/** The audit verb for a delivery this route refuses or ignores WITHOUT reaching the write module. */
const AUDIT_ACTION = "didit_webhook";

/** This route's operator-alert prefix. Per-DOMAIN, the `[PAYMENT_ALERT]` convention. */
const ALERT_TAG = "DIDIT_WEBHOOK_ALERT";

/**
 * The V3 envelope, narrowed to the fields this route reads, every one of them `unknown`.
 *
 * They arrive from outside FitOut, so a declared type is documentation rather than a runtime
 * guarantee — `src/lib/verification/didit-verdict.ts`'s rule for the same reason. Each is narrowed
 * before use.
 *
 * ⚠ `decision` IS PASSED THROUGH UNREAD. This route never looks inside it: the plural-array shape,
 * the declared safe-risk set and the D-265 sentence are all the shared mapper's, and a second reader
 * here would be a second opinion about what a vendor warning means. It is typed as the mapper's own
 * `DiditDecision` so the V2 singular keys are not merely unread but unrepresentable.
 */
type DiditWebhookEvent = {
  event_id?: unknown;
  webhook_type?: unknown;
  timestamp?: unknown;
  environment?: unknown;
  session_id?: unknown;
  status?: unknown;
  vendor_data?: unknown;
  decision?: DiditDecision | null;
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE HANDLER COMES FIRST, AND ITS MACHINERY IS BELOW IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// This is the opposite layout to the PayMongo route, and it is the ONE arrangement decision this
// file takes on its own. The security property here is an ORDERING — the raw bytes are captured
// before anything parses them — and an ordering is only readable if it is the first thing in the
// file. Hoisted `function` declarations make the layout free.
//
// It also makes the property MEASURABLE by the crudest possible instrument: the raw-body read is
// textually the first thing that touches the request, and no deserialisation of any kind precedes
// it. The one parse that happens during verification (the fallback header's canonicalisation, far
// below) reads no field and decides nothing; it re-serialises bytes for a digest.

export async function POST(req: Request): Promise<Response> {
  // RAW body FIRST. Deserialising the request before this point would change the bytes the HMAC
  // covers, and the accessor that would do it is deliberately never called anywhere in this file
  // (T-18.1-0803). The verified body is parsed further down, from `rawBody`, and only after the
  // signature has matched.
  const rawBody = await req.text();
  const secret = process.env.DIDIT_WEBHOOK_SECRET ?? "";
  const nowSeconds = Math.floor(Date.now() / 1000);

  // --- Verify. ANY failure — a missing header, a tampered body, a wrong secret, an out-of-window
  //     timestamp, a malformed or odd-length signature, or a crypto throw — is a CLEAN 400 and zero
  //     state change. Never an uncaught 500 on a forged delivery. ---
  let verified = false;
  try {
    // The header's freshness first: it is the cheap pre-filter, and it is only that — see divergence
    // 1 in the header for why the authenticated copy is checked separately, after the body is read.
    if (isFresh(epochSeconds(req.headers.get("x-timestamp")), nowSeconds) && secret) {
      verified = verifySignature(rawBody, req, secret);
    }
  } catch {
    verified = false;
  }
  if (!verified) {
    return refuse("Invalid signature");
  }

  // --- Parse the now-verified body. ---
  let event: DiditWebhookEvent;
  try {
    event = JSON.parse(rawBody) as DiditWebhookEvent;
  } catch {
    return refuse("Invalid payload");
  }

  // ⚠ THE AUTHENTICATED FRESHNESS CHECK. The envelope's own `timestamp` is inside the signed bytes,
  // so unlike the header it cannot be rewritten on a replay without breaking the signature. This is
  // the control; the header check above is the pre-filter.
  if (!isFresh(epochSeconds(event.timestamp), nowSeconds)) {
    return refuse("Stale delivery");
  }

  // `event_id` is the delivery's identity and is STABLE across retries and across destinations —
  // which is exactly why nothing keys on `timestamp`, refreshed on every attempt. It is required
  // present so a delivery that cannot be identified in the trail is refused rather than applied.
  const eventId = typeof event.event_id === "string" ? event.event_id.trim() : "";
  if (eventId === "") {
    return refuse("Invalid payload");
  }

  // --- The environment gate (ADDENDUM A4). AUTHENTICATED but not applicable: 200 with an audit row
  //     and an operator line, the same shape as an unhandled event type. A 4xx here would be
  //     indistinguishable, in the vendor's delivery log, from a broken endpoint. ---
  if (!environmentAccepted(event.environment)) {
    console.error(`[${ALERT_TAG}] environment_mismatch`, { eventId });
    await recordAudit({
      actorId: "system",
      action: AUDIT_ACTION,
      outcome: "needs_attention",
      meta: { reason: "environment_mismatch", eventId },
    });
    return ack();
  }

  // --- Only `status.updated` is handled. Nine other types exist and none is subscribed. ---
  if (event.webhook_type !== HANDLED_EVENT) {
    await recordAudit({
      actorId: "system",
      action: AUDIT_ACTION,
      outcome: "denied",
      // ⚠ D-72 — the delivery id and the reason. NOT the body, NOT the unrecognised type string
      // (which is vendor-controlled free text landing in a durable jsonb column).
      meta: { reason: "unhandled_event", eventId },
    });
    return ack();
  }

  // --- The three fields the verdict is applied from. A delivery missing any of them cannot be
  //     applied to a row, so it is refused rather than half-applied. ---
  const vendorData = typeof event.vendor_data === "string" ? event.vendor_data.trim() : "";
  const sessionId = typeof event.session_id === "string" ? event.session_id.trim() : "";
  const status = typeof event.status === "string" ? event.status : "";
  if (vendorData === "" || sessionId === "" || status === "") {
    return refuse("Invalid payload");
  }

  // --- Apply. The transition is DERIVED from the VERIFIED envelope's status through the shared
  //     mapper, never from any other body field; `checked_at` comes from the adapter's clock, never
  //     from the body (T-05-18 / T-06-PRIV). `vendor_data` is used ONLY as a lookup key against a
  //     row FitOut already wrote — it can never cause one to be created. ---
  //
  // The outcome is DISCARDED here, deliberately, and for the same reason the PayMongo route discards
  // `confirmPaidBooking`'s: this route ACKs 200 either way, and the outcome exists for the 18.1-09
  // sweep, which must be able to tell "no webhook ever arrived and I just applied this" from "the
  // webhook beat me to it".
  //
  // ⚠ NOT WRAPPED IN A try/catch THAT SWALLOWS. `applyDiditVerdict` returns rather than throws on
  // every path it owns, including the fail-closed ones. A throw escaping it would be a genuine
  // infrastructure failure (the database is gone), and a 500 there is CORRECT: it is the one case
  // where the vendor's two retries are worth spending.
  await applyDiditVerdict({ vendorData, sessionId, status, decision: event.decision ?? null });

  return ack();
}

/** A refusal that changes nothing. `400` for anything unverifiable; never an uncaught 500. */
function refuse(message: string): Response {
  return new Response(message, { status: 400 });
}

/** The ACK. Returned on success, on every no-op, and on every authenticated-but-inapplicable event. */
function ack(): Response {
  return new Response("ok", { status: 200 });
}

/**
 * Constant-time compare a candidate hex digest against the expected one.
 *
 * GUARD: `timingSafeEqual` THROWS a `RangeError` on unequal-length buffers, so byte lengths are
 * compared FIRST — a length mismatch is simply "not a match", never a thrown 500. This is
 * `src/app/api/paymongo/webhook/route.ts:104-115` verbatim in substance, and it is copied here
 * because it is the trap already solved: an odd-length or non-hex candidate is exactly what a prober
 * sends, and an ungated compare would surface it as a 500 rather than a 400.
 */
function matchesDigest(candidate: string, expected: string): boolean {
  const candBuf = Buffer.from(candidate, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  return candBuf.length === expectedBuf.length && timingSafeEqual(candBuf, expectedBuf);
}

/** HMAC-SHA256, hex. One algorithm for both accepted headers; only the MESSAGE differs. */
function hmacHex(message: string, secret: string): string {
  return createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

/**
 * The V2 canonicalisation, for the fallback header.
 *
 * Vendor order: `shortenFloats` (whole-number floats to int), then `sortKeys` (recursive
 * lexicographic), then serialise compactly with Unicode left unescaped.
 *
 * ⚠ `shortenFloats` HAS NO JAVASCRIPT COUNTERPART AND IS DELIBERATELY ABSENT, which is a statement
 * rather than an omission. It exists because Python distinguishes `1.0` from `1`; JavaScript has one
 * number type, so a whole-number float has already become an integer by the time `JSON.parse`
 * returns and `JSON.stringify` emits `1`. Writing a shortening pass would be code that can never
 * observe the case it is named for.
 *
 * ⚠ THE SORT IS UTF-16 CODE-UNIT ORDER, and Python's `sort_keys=True` is code-POINT order. They
 * agree for every key outside the astral plane, which is every key in a JSON envelope of ASCII field
 * names. Recorded rather than hidden: if the vendor ever ships a key above U+FFFF, this is the line
 * that would need a code-point comparator.
 *
 * `JSON.stringify` is already compact and already leaves non-ASCII unescaped, which is
 * `ensure_ascii=False` — the shape the vendor documents.
 */
function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = canonicalise(source[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Verify the delivery. `true` ONLY if a signature FitOut accepts matched over the secret.
 *
 * ⚠ TWO HEADERS ARE ACCEPTED AND A THIRD IS REFUSED BY CONSTRUCTION.
 *
 *   · `X-Signature`    — PRIMARY. HMAC-SHA256 over the RAW BYTES ALONE. ⚠ NOT `${t}.${body}` — that
 *                        is PayMongo's message, and copying it here would 400 every real delivery.
 *   · `X-Signature-V2` — FALLBACK, over the canonicalised re-serialisation. It is here because the
 *                        vendor's own two descriptions of the primary header CONTRADICT each other
 *                        (18.1-RESEARCH § ADDENDUM A7): one calls it the exact bytes transmitted,
 *                        the other describes a canonicalisation, which is not raw bytes if the
 *                        sender canonicalised before signing. No amount of reading settles it, so
 *                        both are implemented and 18.1-14's sandbox walk records which one actually
 *                        verified. The fallback is EXPECTED to matter, not merely defensive.
 *   · `X-Signature-Simple` — NEVER ACCEPTED, and there is no branch that could. It authenticates
 *                        only four envelope fields, which would leave the `decision` payload — the
 *                        thing that decides whether a host is approved — completely unauthenticated.
 *                        FitOut holds the raw bytes, so the weaker header buys nothing at all.
 *
 * Both candidates are tried against their own message. A caller with only the weaker header present
 * gets no match and therefore a 400, which is the correct outcome rather than a special case.
 */
function verifySignature(rawBody: string, req: Request, secret: string): boolean {
  const primary = req.headers.get("x-signature");
  if (primary && matchesDigest(primary.trim(), hmacHex(rawBody, secret))) return true;

  const v2 = req.headers.get("x-signature-v2");
  if (v2) {
    // Parsed here and NOT reused downstream: the body is re-parsed after verification, from the raw
    // bytes, so that a delivery which verified on the primary header never depends on a value this
    // fallback path produced. A throw on unparseable JSON is caught by the caller and becomes a 400.
    const canonical = JSON.stringify(canonicalise(JSON.parse(rawBody)));
    if (matchesDigest(v2.trim(), hmacHex(canonical, secret))) return true;
  }

  return false;
}

/** Epoch seconds from a header or an envelope field, or `null` when it is not a usable number. */
function epochSeconds(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Is an instant inside the replay window? `null` — absent or unparseable — is NOT fresh. */
function isFresh(seconds: number | null, nowSeconds: number): boolean {
  if (seconds === null) return false;
  return Math.abs(nowSeconds - seconds) <= FRESHNESS_WINDOW_SECONDS;
}

/**
 * Which `environment` value this deployment will act on (ADDENDUM A4).
 *
 * ⚠ THIS IS THE INBOUND HALF OF A GUARANTEE WHOSE OUTBOUND HALF IS ALREADY CLOSED. The adapter has
 * no code path that can force a sandbox outcome, and the vendor refuses that field on live
 * applications — but that only protects the direction FitOut asks in. A sandbox-application delivery
 * reaching a production deployment would be a MOCKED verdict approving a real host, and nothing
 * upstream of this line stops it.
 *
 * Production expects `live` unless the deployment declares otherwise (a sandbox staging deploy runs
 * with NODE_ENV=production and sets `DIDIT_ENVIRONMENT=sandbox`). Outside production BOTH are
 * legitimate — the operator's own account is live today and the sandbox application 18.1-14 needs is
 * still to be created — but a THIRD value is refused everywhere, so an unrecognised environment
 * fails closed rather than defaulting to permission.
 */
function environmentAccepted(environment: unknown): boolean {
  if (environment !== "live" && environment !== "sandbox") return false;
  if (process.env.NODE_ENV !== "production") return true;
  return environment === (process.env.DIDIT_ENVIRONMENT ?? "live");
}
