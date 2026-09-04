"use server";

// THE HOST'S OWN VERIFICATION SUBMISSION (HVER-06 / HVER-08 · D-264 / D-266 / D-268 / D-269).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS MODULE ENDS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Until this file existed, the ONLY `INSERT INTO host_verification` in the whole repository was a
// test seed and `drizzle/0026`'s grandfather backfill. `approveHost` (src/app/actions/ops-review.ts)
// is an `UPDATE … WHERE status IN ('pending','unverified')`, so for a host with NO ROW it flipped
// nothing and returned `STALE`. The consequence was not cosmetic: the ops host queue could never
// fill, no new host could ever be approved, and no host created after `drizzle/0026` could ever
// sell. THIS is the code path that closes that — the one place a host ASKS to be verified.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THIS IS DELIBERATELY **NOT** AN `ops-*` FILE, AND THE FILENAME IS LOAD-BEARING
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `tests/design/ops-guard-coverage.test.ts` globs `src/app/actions/ops-*.ts` and demands the STAFF
// GATE — the guard `src/lib/ops/staff.ts` exports — as the first statement of every action it finds,
// with `EXPECTED_OPS_ACTIONS` pinned at 6. This action is gated by the HOST'S OWN SESSION, not by
// staff standing: the caller is the subject of the decision, not its decider. Renaming this file to
// `ops-verification.ts` would pull it into that census and demand a gate that would refuse every
// legitimate host. Do not "fix" the filename.
//
// ⚠ AND THE GATE'S NAME IS NOT SPELLED IN THIS FILE, in prose or in code. An acceptance grep counts
// its occurrences here and expects zero, which a paragraph explaining its absence would otherwise be
// what makes non-zero — drizzle/0021's rule, and a collision this phase has now closed more times
// than is funny. The structural version of the claim is the census itself.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// D-267 — THE LISTING'S ADDRESS **IS** FITOUT'S RA 11967 § 21(b) GEOGRAPHIC-ADDRESS RECORD
// ════════════════════════════════════════════════════════════════════════════════════════════════
// STATED HERE SO THE NEXT READER DOES NOT ADD THE COLUMN. § 21(b) obliges FitOut to hold the
// merchant's contact details and geographic location prior to listing. The listing ALREADY carries a
// structured record of exactly that — `addressLine1`, `addressLine2`, `city`, `postalCode` and the
// PostGIS point, nullable in draft and REQUIRED at publish (D-10) — and "prior to listing" is
// satisfied because a listing cannot sell until ops has approved it (LVER-01) and the address sits
// on the very row the operator reviews.
//
// So this action collects a PHONE and requires a CONFIRMED EMAIL, and it collects no location of any
// kind. There is no location parameter, no location field and no new column, and
// `tests/ops/verification-schema.test.ts` asserts `host_verification`'s column set by SET EQUALITY,
// which makes adding one a decision to be argued rather than a change to be merged. D-267 is the
// ruling; this paragraph is where it is written down.
//
// ⚠ The word "address" nevertheless occurs once more in this graph, inside the D-269 refusal
// sentence in `src/lib/host/verification-refusals.ts` — "Confirm your email ADDRESS…". That is a
// host-facing sentence about an email, not a geographic record, and it is the reason a bare
// case-insensitive grep for the word is not the right instrument for this ruling. The right
// instrument is the schema test's set equality.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE GUARD ORDER, AND WHY IT IS THIS ORDER
// ════════════════════════════════════════════════════════════════════════════════════════════════
//   1. THE SESSION. No session ⇒ refuse, before anything is read, parsed or spent. A `"use server"`
//      export is reachable by POST whatever the UI renders, so this is the boundary.
//   2. THE BURST GUARD, keyed on the AUTHENTICATED user id, and its denial is itself audited so a
//      flood is non-repudiable. ⚠ It is the BURST GUARD ONLY — see the constant's own docblock.
//   3. RE-PARSE THE INPUT. The phone crosses a trust boundary into a durable column that the ops
//      contact reveal later returns, so it is re-validated server-side with a bound (D-268).
//   4. RE-READ `user.emailVerified` SERVER-SIDE (D-269). The publish wizard's checklist row is a
//      hint; this is the gate.
//   5. THE RESUME PRE-CHECK (D5). For a `pending` row holding a non-blank handle ONLY: ask the
//      partner whether that session is still open. ⚠ IT IS NOT A GATE — see its own docblock.
//   6. ASK THE VENDOR, then perform ONE guarded upsert whose WHERE holds every source state — so a
//      0-row result is the single calm no-op and there is no branch a later edit can forget.
//
// ⚠ D-72 — WHAT THE AUDIT ROWS MAY CARRY. `{ userId }` and enum-shaped denial reasons, and nothing
// else. The phone and the email never enter `audit.meta` (a durable jsonb column under an explicit
// no-secrets/no-PII rule), never a log line, and never a column this action writes.

import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hostVerification, user } from "@/lib/db/schema";
import {
  HOST_VERIFICATION_EMAIL_UNCONFIRMED,
  HOST_VERIFICATION_NOTHING_CHANGED,
  HOST_VERIFICATION_PHONE_REQUIRED,
  HOST_VERIFICATION_SIGNED_OUT,
  HOST_VERIFICATION_TOO_MANY_ATTEMPTS,
  HOST_VERIFICATION_VENDOR_UNAVAILABLE,
} from "@/lib/host/verification-refusals";
import { COOLDOWN_HOURS } from "@/lib/host/verification-cooldown";
import { rateLimit } from "@/lib/rate-limit";
import {
  beginDiditVerification,
  DiditSessionError,
  isDiditSessionOpen,
  type DiditSessionStart,
} from "@/lib/verification/providers/didit";

/**
 * `{ ok: true, redirectTo } | { ok: false, error }` — `src/app/actions/capability.ts:38-40`'s shape,
 * because this action has the same job: it decides one flag's worth of standing and then hands the
 * caller somewhere to go. On success `redirectTo` is the vendor's HOSTED URL, so the caller sends
 * the host into the check itself rather than to a FitOut page that would only tell them to press
 * something else.
 *
 * NOTHING ON THIS PATH RAISES. Every refusal is one of the named constants below. A raised error
 * here would become a 500 on an action that may in fact have committed — the failure mode
 * `ops-review.ts`'s result-shape note exists to prevent.
 */
export type HostVerificationResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * What the submission form hands in. ONE field: D-267 rules out a location, and D-269's email is
 * read from the SERVER's copy of the user rather than accepted from the caller — a self-declared
 * "yes my email is confirmed" is not a gate.
 *
 * ⚠ THE TYPE IS DOCUMENTATION, NOT A GATE (`src/lib/validation/ops.ts`'s opening rule). Everything
 * that crosses this boundary is re-parsed below.
 */
export type RequestHostVerificationInput = {
  phone: string;
};

// ── The named refusals. One constant per condition, and the SENTENCES have one owner. ─────────────
//
// The result OBJECTS are module-private; the STRINGS they wrap are exported from
// `src/lib/host/verification-refusals.ts`. That split is not a preference: a `"use server"` module
// may export only async functions, and `tests/use-server-exports.test.ts` records the incident where
// a single exported constant killed a whole action module in the browser while the unit tests stayed
// green. One named constant per refusal still holds — two paths cannot return two slightly
// different sentences for the same condition — it is just that the sentence lives one file over.

const SIGNED_OUT: HostVerificationResult = {
  ok: false,
  error: HOST_VERIFICATION_SIGNED_OUT,
};

const TOO_FAST: HostVerificationResult = {
  ok: false,
  error: HOST_VERIFICATION_TOO_MANY_ATTEMPTS,
};

/** D-268 — no phone, or a phone outside the permissive bound. */
const PHONE_REQUIRED: HostVerificationResult = {
  ok: false,
  error: HOST_VERIFICATION_PHONE_REQUIRED,
};

/** D-269 — the email on file is not confirmed. Re-read server-side, never taken from the caller. */
const EMAIL_UNCONFIRMED: HostVerificationResult = {
  ok: false,
  error: HOST_VERIFICATION_EMAIL_UNCONFIRMED,
};

/**
 * THE CALM REFUSAL — one sentence for every condition that changes nothing.
 *
 * FOUR of them reach the guarded upsert and flip 0 rows: `suspended`, `approved`, `grandfathered`,
 * and a rejection whose cooldown has not elapsed. ⚠ `pending` USED TO BE A FIFTH AND IS NOT ANY MORE
 * (D5, plan 18.1-15) — it is admitted by the WHERE and resumes. The fifth condition today is the
 * pre-check's: a `pending` row whose vendor session the partner has already FINISHED, which is
 * refused rather than replaced.
 *
 * See the sentence's own docblock for the two reasons it is one sentence; this is `approveHost`'s
 * `STALE` in another domain, and the fact that the two refusals above are indistinguishable to the
 * caller is a privacy property rather than an accident.
 */
const NOTHING_CHANGED: HostVerificationResult = {
  ok: false,
  error: HOST_VERIFICATION_NOTHING_CHANGED,
};

/** The vendor call failed. Fail closed: no session exists, so NO ROW may be written. */
const VENDOR_UNAVAILABLE: HostVerificationResult = {
  ok: false,
  error: HOST_VERIFICATION_VENDOR_UNAVAILABLE,
};

/**
 * The audited-denial vocabulary. `satisfies DenialReason` at every call site, on
 * `ops-review.ts:159-165`'s shape, so a typo in a denial reason is a COMPILE error rather than an
 * unqueryable string in a durable jsonb column.
 *
 * ⚠ ENUM-SHAPED, ALWAYS (D-72). None of these is derived from anything the caller typed.
 */
type DenialReason =
  | "rate_limit"
  | "invalid_input"
  | "email_unconfirmed"
  | "provider_unavailable"
  /**
   * D5 — the caller's `pending` row points at a session the PARTNER has already finished, so asking
   * again would mint a new billable one and repoint `vendor_ref` away from the session whose verdict
   * is still in flight. Distinct from `not_applicable` in the TRAIL and identical to it in the
   * SENTENCE: an operator needs to be able to tell the two apart, and the host must not be able to.
   */
  | "session_closed"
  | "not_applicable";

/**
 * The verb this action's trail rows carry. Snake-cased to match the five ops decisions
 * (`ops_approve_host`, …) because the `audit.action` column is queried across all of them; the
 * `actorId` is what distinguishes a host asking about themselves from staff deciding about somebody
 * else.
 */
const AUDIT_ACTION = "request_host_verification";

/** Resolve the signed-in user's id, or null if there is no session (copied from capability.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/** The one token an operator greps for when a host says the check would not start. */
const OPERATOR_ALERT = "[HOST_VERIFY_ALERT]";

/**
 * THE VENDOR WOULD NOT ANSWER — one shape, two call sites, so the two cannot drift.
 *
 * Both vendor calls on this path fail the same way and must refuse the same way: the operator line,
 * the `provider_unavailable` trail row, and the host-facing sentence that says the check could not be
 * started. `event` is the only thing that differs, and it exists so an operator reading the log can
 * tell WHICH call failed — the READ that asks whether a session is still open, or the CREATE that
 * asks for one. Nothing branches on it.
 *
 * ⚠ AN OPERATOR LINE, AND ONLY THE MESSAGE. The adapter's messages name the ENV VAR and never its
 * value, so they are safe to log; the raw error is not logged wholesale because a transport failure's
 * `cause` is an arbitrary object and this path must not become the leak (T-07-38's rule applied to a
 * vendor error). A missing, malformed, expired or wrong-application credential all answer HTTP 403
 * with no machine-readable discriminator (ADDENDUM A5) — ONE credential fault wearing two numbers —
 * so `status` is recorded for the operator and branched on by nobody.
 */
async function refuseOnVendorFailure(
  userId: string,
  event: "vendor_session_failed" | "vendor_session_read_failed",
  err: unknown,
): Promise<HostVerificationResult> {
  console.error(`${OPERATOR_ALERT} ${event}`, {
    userId,
    status: err instanceof DiditSessionError ? err.status : null,
    message: err instanceof Error ? err.message : "unknown",
  });
  await recordAudit({
    actorId: userId,
    action: AUDIT_ACTION,
    outcome: "denied",
    meta: { reason: "provider_unavailable" satisfies DenialReason, userId },
  });
  return VENDOR_UNAVAILABLE;
}

/**
 * THE BURST GUARD — 5 attempts per 60s per AUTHENTICATED identity, the same budget and the same
 * constant name as `src/app/actions/capability.ts:52`, because this is the same kind of act: a
 * session-gated escalation toward being able to sell.
 *
 * ⚠ THIS IS THE burst guard AND IT IS NOT THE CAP. `src/lib/rate-limit.ts:9-16` states the scope in
 * its own words — "the counter store is a single module-level Map — correct for the single-region /
 * single-instance launch" — and `:29-32` records that under sustained pressure a still-live key can
 * be evicted and get a fresh window. It is PROCESS-LOCAL, so it does not survive a restart and does
 * not exist at all on a second instance. THE DURABLE CAP IS THE 24-HOUR INTERVAL IN THE SUBMISSION
 * UPDATE'S OWN WHERE (D-264) — in the database, not per-process, and impossible to restart away.
 * This limiter is the burst guard; the WHERE is the cap. Never describe the burst guard as the cap.
 *
 * KEYED ON THE AUTHENTICATED USER ID, never on the client IP and never on anything the caller sent
 * — `rate-limit.ts` states that rule at the module, and `src/lib/validation/ops.ts:57-61` records
 * why an unbounded caller-chosen key is memory exhaustion against the whole process.
 */
const ACTIVATE_RATE_LIMIT = { window: 60, max: 5 } as const;

// THE DURABLE CAP (D-264) IS IMPORTED, NOT DECLARED HERE — AND PLAN 18.1-11 IS WHY.
//
// It was a module-private const in this file for exactly as long as this file was its only reader.
// `/host/verify` is the second: a rejected host must be SHOWN the instant they may ask again, and
// that instant is `updated_at` plus this interval. The value could not be exported from here — a
// server-action module may export only async functions (`tests/use-server-exports.test.ts`, with an
// incident behind it), and every export of one is a network-reachable POST endpoint besides — so it
// moved to an UNGUARDED DECLARATION MODULE beside this guarded one, which is the split
// `payments/config.ts` beside `payments/fees.ts` already ships and which
// `deferred-items.md` D2 names for this family of value.
//
// ⚠ NOTHING ABOUT THE RULE MOVED. This statement's own `WHERE` is still the only thing that
// enforces it; the surface only quotes it. Both derive from the same constant and the same column,
// so the sentence a host reads cannot disagree with the clause that refuses them (PROJECT D-130 /
// GATE-05). The constant's docblock carries the whole reasoning, including D-272's same-commit rule
// with `DECLARED_RETRY` in `scripts/didit-setup.ts` and why an exhausted per-module cap must never
// be rendered to a host as having used up their tries.

/**
 * D-268 — THE PHONE, BOUNDED BUT NOT PARSED.
 *
 * 7–20 characters after trimming, and only digits, `+`, spaces and hyphens, with at least one digit
 * present so a string of punctuation cannot land in a durable column.
 *
 * ⚠ DELIBERATELY PERMISSIVE, AND THAT IS THE DECISION RATHER THAN THE SHORTCUT. No PH-specific
 * phone format is enforced anywhere in this repository today, RA 11967 § 21(b) says *collect* rather
 * than *validate*, and a strict E.164 parser that rejects a legitimate landline is friction on the
 * critical path to a host being able to sell. The value is SELF-DECLARED AND UNVERIFIED — FitOut has
 * no SMS provider (Resend is email-only) and adding one would put a new credential and a new failure
 * mode on that same critical path (D-268).
 *
 * ⚠ IT IS BOUNDED ANYWAY, because permissive is not the same as unbounded: this string is written to
 * `user.phone`, is returned later by the ops contact reveal (OPS-06), and an unbounded value in a
 * durable column that an operator's browser renders is a different problem from a loose format.
 * `.trim()` runs BEFORE the length checks (measured against Zod 4.4, not assumed), so leading
 * whitespace cannot be used to smuggle length past the bound.
 */
const PHONE_MIN = 7;
const PHONE_MAX = 20;
const PHONE_SHAPE = /^(?=.*[0-9])[0-9+\s-]+$/;

const requestHostVerificationSchema = z.object({
  phone: z.string().trim().min(PHONE_MIN).max(PHONE_MAX).regex(PHONE_SHAPE),
});

/**
 * ASK to be verified (HVER-06). The host's own action on their own standing.
 *
 * Guards run in the order the header states. Every refusal is a named constant and an audited row;
 * nothing raises.
 *
 * ON SUCCESS the host's row reads `pending` with a `vendor_ref` and no verdict, `loadReviewQueue`
 * returns them in `created_at ASC` position, and `redirectTo` is the vendor's hosted URL. That
 * sequence is the whole content of this plan: it is what gives `approveHost` a row to flip, which is
 * what makes the ops host queue fillable from ordinary product use.
 */
export async function requestHostVerification(
  input: RequestHostVerificationInput,
): Promise<HostVerificationResult> {
  // ── 1. THE SESSION. Before any read, any parse, and any spend. ───────────────────────────────
  const userId = await requireUserId();
  if (!userId) {
    // No audit row: there is no authenticated actor to attribute one to, and `audit.actor_id` is
    // NOT NULL precisely so a trail row can never claim an actor it does not have.
    return SIGNED_OUT;
  }

  // ── 2. THE BURST GUARD. Audited on the deny branch so a flood is non-repudiable. ─────────────
  const limit = rateLimit(`verify-submit:${userId}`, ACTIVATE_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: AUDIT_ACTION,
      outcome: "denied",
      meta: { reason: "rate_limit" satisfies DenialReason, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  // ── 3. THE PHONE (D-268). Re-parsed server-side; an absent field lands here too. ─────────────
  const parsed = requestHostVerificationSchema.safeParse(input);
  if (!parsed.success) {
    await recordAudit({
      actorId: userId,
      action: AUDIT_ACTION,
      outcome: "denied",
      // ⚠ D-72 — the enum reason only. NOT the value that failed, NOT Zod's issue list (which
      // quotes the input), NOT a length. What the host typed does not belong in a durable column.
      meta: { reason: "invalid_input" satisfies DenialReason },
    });
    return PHONE_REQUIRED;
  }

  // ── 4. THE CONFIRMED EMAIL (D-269), RE-READ FROM THE SERVER'S OWN COPY. ──────────────────────
  //
  // The publish wizard already renders an `emailVerified` checklist row with a resend affordance,
  // and `/host/verify` will render the same hint (plan 18.1-11). Neither is the gate: a hint is
  // rendered from a snapshot, and this action is reachable by POST regardless of what was rendered.
  //
  // ⚠ NOT A REVERSAL OF D-07. `src/lib/auth.ts` keeps `requireEmailVerification: false` and
  // `autoSignIn: true`, so sign-in stays unblocked globally. The gate is local to this action,
  // exactly as the wizard's already is. It matters MORE here than at publish: with an auto-reject
  // (D-262) there is no operator to notice that a rejection notice bounced.
  const [account] = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId));
  if (!account?.emailVerified) {
    await recordAudit({
      actorId: userId,
      action: AUDIT_ACTION,
      outcome: "denied",
      // What the mailbox is called is not recorded — only that the email gate refused (D-72).
      meta: { reason: "email_unconfirmed" satisfies DenialReason, userId },
    });
    return EMAIL_UNCONFIRMED;
  }

  // ── 5. THE RESUME PRE-CHECK (deferred-items.md § D5). ────────────────────────────────────────
  //
  // WHAT IT IS FOR, IN ONE SENTENCE: to stop FitOut asking for a NEW session when the caller's row
  // already points at one the partner has FINISHED — because that ask would mint a second billable
  // session AND repoint `vendor_ref` away from the session whose verdict is still in flight, leaving
  // a real answer orphaned for as long as the row lives. `POST /v3/session/` is idempotent over
  // UNFINISHED sessions only (ADDENDUM A3), so for an OPEN session there is nothing to protect
  // against and the ordinary ask below hands the host back their own flow with a fresh, usable URL.
  //
  // ⚠ THE PRE-CHECK IS NOT THE GATE. THE GUARDED UPSERT'S `WHERE` STILL IS, AND ONLY IT IS. This read
  // is a snapshot taken before two round trips; the row can move underneath it — the webhook landing
  // mid-flight is the ordinary case — and when it does, the statement below refuses and the press is
  // a calm 0-row no-op. Nothing here may become the thing that decides whether a row flips: a source
  // state absent from that `WHERE` is refused whatever this read said (D-266 is structural), and a
  // state present in it is admitted whatever this read said.
  //
  // ⚠ A NARROW TWO-COLUMN READ OF THIS ACTION'S OWN, AND `loadHostVerification` IS DELIBERATELY NOT
  // WIDENED TO CARRY `vendor_ref`. That read feeds three RSC pages, so a session handle on it would
  // travel into an initial RSC payload — the shape FINDING F-6 / D-271 already refused for host
  // contact values. The handle is a bearer-adjacent pointer at the vendor's copy of the evidence and
  // belongs on the server side of a server action, not in a payload a browser receives.
  const [existing] = await db
    .select({ status: hostVerification.status, vendorRef: hostVerification.vendorRef })
    .from(hostVerification)
    .where(eq(hostVerification.userId, userId));

  // ⚠ BLANKNESS, NOT NULL-NESS, IS THE TEST — and a blank handle SKIPS THE ASK, deliberately.
  // There is nothing to ask about, and a blank handle would address `/v3/session//decision/`: a
  // different endpoint entirely (18.1-09's measured note). Such a row is ALSO invisible to the
  // reconciliation sweep, whose candidate query excludes it — `btrim(NULL) <> ''` evaluates to NULL
  // and a `WHERE` treats that as not-true, which is the predicate actually doing the work there. So
  // this branch is the ONLY escape a handle-less `pending` row has, and it must RESUME rather than
  // refuse.
  const handle = existing?.vendorRef?.trim() ?? "";

  if (existing?.status === "pending" && handle !== "") {
    let sessionOpen: boolean;
    try {
      sessionOpen = await isDiditSessionOpen(handle);
    } catch (err) {
      // FAIL CLOSED. A caller that cannot learn whether the session is open must not mint one: the
      // failure is the READ's, so it refuses with the vendor's own sentence rather than with the
      // calm one, and it writes no row.
      return refuseOnVendorFailure(userId, "vendor_session_read_failed", err);
    }

    if (!sessionOpen) {
      // The partner is done with this session. Write NO row, ask for NO session, and return the
      // SHIPPED calm sentence — the same one four other conditions return, so the caller learns
      // nothing about their row's shape that their own panel already renders.
      await recordAudit({
        actorId: userId,
        action: AUDIT_ACTION,
        outcome: "denied",
        meta: { reason: "session_closed" satisfies DenialReason, userId },
      });
      return NOTHING_CHANGED;
    }
  }

  // ── 6a. ASK THE VENDOR, FIRST, AND FAIL CLOSED IF IT WILL NOT ANSWER. ────────────────────────
  //
  // The session has to exist before a row can point at it: `vendor_ref` is the ONLY handle FitOut
  // keeps pointing at the vendor's copy of the evidence, and a `pending` row carrying an invented
  // one would be a row nobody can ever explain. So the order is ask-then-write, and a failed ask
  // writes NOTHING — there is no object to write, which is strictly stronger than writing a failing
  // one (the port's fail-closed property, one layer out).
  //
  // ⚠ THIS GOES THROUGH THE ADAPTER'S OWN NAMED ENTRY POINT, and this call site does not know, test
  // or compare a provider name. FINDING F-5 settled that a provider which must first ASK gets a
  // SECOND named function rather than a wider `VerificationDecision`: nothing has been decided at
  // this instant, so there is no verdict to hand in, and the answer arrives later on a channel this
  // action is not on (the signed webhook, plan 18.1-08; the reconciliation sweep, plan 18.1-09).
  // The registry in `src/lib/verification/port.ts` remains the ONE mapping from a name to an
  // adapter; a comparison here would be a second one. The `provider` written below is read OFF the
  // result the adapter produced, never composed from a literal.
  //
  // ⚠ A DUPLICATE PRESS IS ALREADY BOUNDED VENDOR-SIDE, so what follows is defence in depth rather
  // than the only defence. `POST /v3/session/` is idempotent over UNFINISHED sessions on the same
  // `vendor_data`: a second press returns the SAME session (still 201) with only the callback
  // updated, and finished sessions are never reused (18.1-RESEARCH § ADDENDUM A3). That also means a
  // press this action refuses at the 0-row branch below has not minted a second billable session —
  // the unfinished one it got back is the one the host's next legitimate submission will be handed.
  let started: DiditSessionStart;
  try {
    started = await beginDiditVerification(userId);
  } catch (err) {
    // The shared vendor-failure shape — see `refuseOnVendorFailure`, which the pre-check above uses
    // for its own read so the two calls cannot come to refuse differently.
    return refuseOnVendorFailure(userId, "vendor_session_failed", err);
  }
  const check = started.verification;

  // ── 6b. ONE GUARDED UPSERT. It is the durable cap, the suspension refusal and the queue ──────
  //        re-stamp, all in a single statement.
  //
  // FIVE PROPERTIES LIVE IN THIS ONE STATEMENT, and each is written at the site because each is a
  // thing a later edit could quietly undo:
  //
  //   ① `suspended` IS ABSENT FROM THE WHERE, so D-266 is STRUCTURAL rather than a branch. A
  //      suspension is a named staff member's deliberate act (ENF-01 / D-233); letting the machine
  //      auto-approve a suspended host back toward sellable would let a vendor silently reverse a
  //      human's enforcement decision. The refusal is therefore not an `if` somebody can forget to
  //      re-add — the statement simply has no source state that matches, so it flips 0 rows. The
  //      same is true of `approved` (already decided) and `grandfathered` (D-211 keeps that state
  //      first-class and distinct): both are calm 0-row no-ops.
  //
  //      ⚠ THREE POSITIVE EQUALITIES AND NOT ONE NEGATION, which is 18.1-12's discipline for the
  //      listing gate and it is here for the same reason: a SEVENTH enum member must be neither
  //      admitted nor refused by accident. Written the other way round — as an inequality naming the
  //      states to EXCLUDE — this clause would silently admit every state added after today, and the
  //      state that gets added to an enforcement enum is rarely the harmless one. The banned
  //      spellings are DESCRIBED here and never typed, because an acceptance grep counts them in
  //      this file and expects zero: a comment that spells what it forbids is what makes the count
  //      non-zero at the moment the code is most obviously correct.
  //
  //      ⚠ `pending` USED TO BE A FOURTH REFUSED STATE AND IS NOW ADMITTED (deferred-items.md § D5,
  //      plan 18.1-15). The omission was correct on its own terms — it is what stopped a host
  //      minting a second session and paying twice — but the vendor itself refuses to create that
  //      duplicate: `POST /v3/session/` returns the SAME unfinished session on the same
  //      `vendor_data` (ADDENDUM A3, confirmed first-hand on 2026-09-02 against a real stuck
  //      session). So for THIS state the guard was protecting nothing, and it was costing a host who
  //      simply got distracted mid-flow up to SEVEN DAYS locked out of their own verification, with
  //      no route to a person (D-262 / D-263) and no listing they could create (D-255). The
  //      session's openness is checked BEFORE this statement, by guard 5, which is what keeps a
  //      finished session from being replaced rather than resumed.
  //
  //   ② THE COOLDOWN READS `updated_at`, NEVER `created_at`. Not a style choice: `created_at` is
  //      made MUTABLE by property ③ of this very statement, so a cooldown derived from it would
  //      re-stamp its own clock and reset itself on every press. It must also never be derived from
  //      anything the vendor returns — the session's creation instant does not move on a
  //      resubmission, because there is no new session (ADDENDUM A3, the cause of FINDING F-1).
  //      `loadHostVerification` returns this same column so the host surface can SHOW the instant
  //      the WHERE reads, rather than becoming a second authority on it.
  //
  //   ③ FINDING F-1 — `created_at = now()` ON THE RESUBMISSION BRANCH, AND **NOT** ON THE RESUME
  //      BRANCH. `host_verification` is 1:1, primary-keyed on `user_id`, so a repeat press is an
  //      UPDATE of the same row, and `createdAt` is `.defaultNow()` — which fires on INSERT ONLY.
  //      Without an explicit assignment a host who submits in January and resubmits in September
  //      re-enters the `created_at ASC` queue STAMPED JANUARY and sits permanently ahead of every
  //      first-time submitter: exactly the line-jumping D-249 forbids, in the opposite direction.
  //      This is the host-side equivalent of `src/lib/listing/re-review.ts`'s resubmission-time
  //      rule, and it has to be spelled this way because `host_verification` has no history table to
  //      COALESCE over the way the listing queue does, and is not growing one.
  //
  //      ⚠ A RESUBMISSION RE-STAMPS AND A RESUME DOES NOT, AND THE DISTINCTION IS THE WHOLE CONTENT
  //      OF THE `CASE` BELOW. F-1 is about somebody entering the queue AGAIN with a NEW ask. A
  //      resume is not a new ask: it is the same session, the same `vendor_ref`, the same question
  //      already put to the partner, and the host has been waiting since the instant that row was
  //      stamped. Re-stamping it would move a WAITING host UP the queue for pressing a button —
  //      FINDING F-1 IN REVERSE, and the same line-jumping D-249 forbids, arrived at from the other
  //      side. The pre-update status is what tells the two apart, and inside `ON CONFLICT DO UPDATE`
  //      a bare `host_verification.x` IS the existing row's value, which is what keeps this one
  //      guarded statement rather than a read followed by a branch.
  //
  //   ④ `updated_at = now()` IS SPELLED EXPLICITLY even though `schema.ts:432-435` declares
  //      `$onUpdate(() => new Date())`. `$onUpdate` fires only through Drizzle's query BUILDER, and
  //      this is a raw statement; every shipped ops write spells it for the same reason.
  //      ⚠ IT FIRES ON THE RESUME BRANCH TOO, AND THAT IS CORRECT. The row WAS touched; the cooldown
  //      clause only reads `updated_at` for a `rejected` row, so nothing about a `pending` one is
  //      loosened; and re-arming the reconciliation sweep's grace window for this row costs nothing,
  //      because a session the sweep would read as still open produces no transition anyway (F-3).
  //
  //   ⑤ THE TRAIL SAYS WHICH KIND OF PRESS IT WAS, AND THE ROW IS WHAT TELLS IT. `RETURNING` carries
  //      `created_at <> updated_at`, computed INSIDE the statement over the two instants the
  //      statement itself just wrote. Both come from the same `now()` — which is the transaction
  //      timestamp and is constant for the whole statement — so a fresh INSERT and a resubmission
  //      both return `false`, and only a resume returns `true`.
  //      ⚠ DERIVED FROM THE STATEMENT AND NEVER FROM THE PRE-READ ABOVE. The two can honestly
  //      disagree: the sweep may have released the row to `unverified` between the read and the
  //      write, in which case the press really was a resubmission and really did re-stamp. A trail
  //      row that described the read rather than the write would be a trail that disagrees with the
  //      row it is about. D-72 holds — a boolean over two server instants is not PII and is not
  //      caller-supplied.
  //
  // NO JS `Date` IS BOUND HERE. `ops-review.ts:390-401` records the measurement — a `Date` cannot
  // be bound as a parameter through raw `db.execute` on postgres.js — and this statement sidesteps
  // it entirely by letting Postgres supply every instant with `now()`. The only bound values are two
  // strings and an integer.
  //
  // ONE TRANSACTION WITH THE PHONE WRITE, so a submitted phone and a submitted verification can
  // never disagree: the upsert goes first, and a 0-row result returns before `user.phone` is
  // touched, so a refused press leaves the profile exactly as it was.
  const flipped = await db.transaction(async (tx) => {
    const rows = (await tx.execute(sql`
      INSERT INTO host_verification
        (user_id, status, provider, vendor_ref, result, checked_at, reason,
         decided_by_staff_id, created_at, updated_at)
      VALUES
        (${userId}, 'pending', ${check.provider}, ${check.vendorRef},
         NULL, NULL, NULL, NULL, now(), now())
      ON CONFLICT (user_id) DO UPDATE
        SET status = 'pending',
            provider = ${check.provider},
            vendor_ref = ${check.vendorRef},
            result = NULL,
            checked_at = NULL,
            reason = NULL,
            decided_by_staff_id = NULL,
            created_at = CASE WHEN host_verification.status = 'pending'
                              THEN host_verification.created_at
                              ELSE now() END,
            updated_at = now()
        WHERE host_verification.status = 'unverified'
           OR host_verification.status = 'pending'
           OR ( host_verification.status = 'rejected'
                AND host_verification.updated_at
                    < now() - make_interval(hours => ${COOLDOWN_HOURS}::int) )
      RETURNING user_id, (created_at <> updated_at) AS "resumed"
    `)) as unknown as { user_id: string; resumed: boolean }[];

    if (rows.length === 0) return rows;

    // D-268 — the self-declared phone, inside the same transaction as the verification write.
    // `user.phone` stays NULLABLE and stays optional for bookers; supplying one is a condition of
    // ASKING to be verified, not of having an account.
    await tx.update(user).set({ phone: parsed.data.phone }).where(eq(user.id, userId));
    return rows;
  });

  if (flipped.length === 0) {
    await recordAudit({
      actorId: userId,
      action: AUDIT_ACTION,
      outcome: "denied",
      meta: { reason: "not_applicable" satisfies DenialReason, userId },
    });
    return NOTHING_CHANGED;
  }

  await recordAudit({
    actorId: userId,
    action: AUDIT_ACTION,
    outcome: "ok",
    // ⚠ D-72 — the id and the provider name. NOT the phone, NOT the email, and NOT the vendor
    // session handle: `vendor_ref` lives in the domain column it belongs to, and a second copy in a
    // jsonb column would be a second place a compliance question could be answered wrongly from.
    // `userId` duplicates `actorId` here only because this action is self-service; carrying it makes
    // the deny and allow rows findable by the same instrument the ops trail is read with.
    //
    // `resumed` comes off the STATEMENT (property ⑤) and is what lets an operator reading the queue
    // tell a host who re-entered it today from one who has been waiting since their original stamp.
    // Without it, a `created_at` that did not move looks like a queue that lost a write.
    meta: { userId, provider: check.provider, resumed: flipped[0].resumed },
  });

  // NO `revalidatePath` HERE, DELIBERATELY. `approveHost` invalidates `/ops` because the operator is
  // standing on the page the decision just changed. This caller is a host who is about to leave the
  // app entirely for the vendor's hosted flow, and `/ops` is not this action's surface — the next
  // operator load renders the new row from the database. Adding an invalidation for a route the
  // caller cannot see would be a cache decision taken in the wrong place.
  //
  // ⚠ THE HOSTED URL IS RETURNED AND NEVER PERSISTED. It is a redirect target carrying a session
  // token, not a fact about a check; the adapter keeps it OUT of `VerificationResult` for exactly
  // that reason, and it must not become a fifth field or a column. And when the host comes BACK,
  // nothing about that return moves this row: only the signed webhook (18.1-08) or the
  // reconciliation sweep (18.1-09) may (ADDENDUM A9 — the redirect is attacker-controllable).
  return { ok: true, redirectTo: started.hostedUrl };
}
