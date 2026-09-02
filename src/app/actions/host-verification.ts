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
//   5. ASK THE VENDOR, then perform ONE guarded upsert whose WHERE holds every source state — so a
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
import { user } from "@/lib/db/schema";
import {
  HOST_VERIFICATION_EMAIL_UNCONFIRMED,
  HOST_VERIFICATION_NOTHING_CHANGED,
  HOST_VERIFICATION_PHONE_REQUIRED,
  HOST_VERIFICATION_SIGNED_OUT,
  HOST_VERIFICATION_TOO_MANY_ATTEMPTS,
  HOST_VERIFICATION_VENDOR_UNAVAILABLE,
} from "@/lib/host/verification-refusals";
import { rateLimit } from "@/lib/rate-limit";
import {
  beginDiditVerification,
  DiditSessionError,
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
 * THE 0-ROW BRANCH — one sentence for five conditions (suspended, already pending, already
 * approved, grandfathered, and a rejection whose cooldown has not elapsed). See the sentence's own
 * docblock for the two reasons it is one sentence; this is `approveHost`'s `STALE` in another
 * domain.
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

/**
 * THE DURABLE CAP (D-264) — a rejected host may ask again after 24 hours.
 *
 * A COOLDOWN AND NOT AN ATTEMPT COUNTER, and that is forced rather than chosen: case 1 of
 * `tests/ops/verification-schema.test.ts` asserts `host_verification`'s column set by SET EQUALITY,
 * so a counter column reddens it. There is consequently no lifetime cap either, because a lifetime
 * cap cannot be expressed without somewhere to keep the count. Retry is the only thing standing
 * between a vendor misread and a permanently unsellable real host, so an interval is the right
 * shape anyway.
 *
 * ⚠ A LITERAL, AND NEVER READ FROM THE ENVIRONMENT. `src/lib/payments/fees.ts:82`'s
 * `OPS_CANCEL_REFUNDS_SERVICE_FEE` precedent: a behaviour change of this kind should be a REVIEWED
 * one-line code change with a diff and a test, never an environment variable that can flip silently
 * in a deploy nobody read. (An acceptance grep counts environment reads in this file and expects
 * zero, so the spelling of that access is deliberately absent from this paragraph too — the same
 * drizzle/0021 rule the staff-gate note in the header follows.)
 *
 * ⚠ AND IT IS THE SINGLE AUTHORITY ON HOW OFTEN A HOST MAY TRY (D-272). The Didit account carries
 * `max_retry_attempts: 7` over `retry_window_days: 7`, which is this number restated in the
 * vendor's units, deliberately raised so the vendor can never refuse a retry FitOut has already
 * promised — the two-authorities defect PROJECT D-130 / GATE-05 is named for. **If this constant
 * ever changes, `DECLARED_RETRY` in `scripts/didit-setup.ts` changes in the SAME COMMIT**;
 * `npm run didit:verify` fails when the account and the declaration disagree, but only the
 * same-commit rule keeps the two MEANINGS aligned.
 *
 * ⚠ The vendor's PER-MODULE caps are lower and were NOT raised (`id_verification_max_retry_attempts:
 * 2`, `face_liveness_max_attempts: 3`, `face_match_max_attempts: 3`). Those bound retries WITHIN one
 * session, not sessions per week, so a host can exhaust a document's attempts inside one session
 * while this cooldown is nowhere near reached — which is why an exhausted module must never be
 * rendered to a host as "you have no attempts left" (18.1-06's rule, D-272).
 */
const COOLDOWN_HOURS = 24;

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

  // ── 5a. ASK THE VENDOR, FIRST, AND FAIL CLOSED IF IT WILL NOT ANSWER. ────────────────────────
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
    // ⚠ AN OPERATOR LINE, AND ONLY THE MESSAGE. The adapter's messages name the ENV VAR and never
    // its value, so they are safe to log; the raw error is not logged wholesale because a transport
    // failure's `cause` is an arbitrary object and this path must not become the leak (T-07-38's
    // rule applied to a vendor error). A missing, malformed, expired or wrong-application credential
    // all answer HTTP 403 with no machine-readable discriminator (ADDENDUM A5) — ONE credential
    // fault wearing two numbers — so `status` is recorded for the operator and branched on by
    // nobody.
    console.error("[HOST_VERIFY_ALERT] vendor_session_failed", {
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
  const check = started.verification;

  // ── 5b. ONE GUARDED UPSERT. It is the durable cap, the suspension refusal and the queue ──────
  //        re-stamp, all in a single statement.
  //
  // FOUR PROPERTIES LIVE IN THIS ONE STATEMENT, and each is written at the site because each is a
  // thing a later edit could quietly undo:
  //
  //   ① `suspended` IS ABSENT FROM THE WHERE, so D-266 is STRUCTURAL rather than a branch. A
  //      suspension is a named staff member's deliberate act (ENF-01 / D-233); letting the machine
  //      auto-approve a suspended host back toward sellable would let a vendor silently reverse a
  //      human's enforcement decision. The refusal is therefore not an `if` somebody can forget to
  //      re-add — the statement simply has no source state that matches, so it flips 0 rows. The
  //      same is true of `approved` (already decided), `pending` (already asked) and
  //      `grandfathered` (D-211 keeps that state first-class and distinct): all four are calm 0-row
  //      no-ops, and only `unverified` and a cooled-down `rejected` are admitted.
  //
  //   ② THE COOLDOWN READS `updated_at`, NEVER `created_at`. Not a style choice: `created_at` is
  //      made MUTABLE by property ③ of this very statement, so a cooldown derived from it would
  //      re-stamp its own clock and reset itself on every press. It must also never be derived from
  //      anything the vendor returns — the session's creation instant does not move on a
  //      resubmission, because there is no new session (ADDENDUM A3, the cause of FINDING F-1).
  //      `loadHostVerification` returns this same column so the host surface can SHOW the instant
  //      the WHERE reads, rather than becoming a second authority on it.
  //
  //   ③ FINDING F-1 — `created_at = now()` ON THE RESUBMISSION BRANCH. `host_verification` is 1:1,
  //      primary-keyed on `user_id`, so a resubmission is an UPDATE of the same row, and
  //      `createdAt` is `.defaultNow()` — which fires on INSERT ONLY. Without this explicit
  //      assignment a host who submits in January and resubmits in September re-enters the
  //      `created_at ASC` queue STAMPED JANUARY and sits permanently ahead of every first-time
  //      submitter: exactly the line-jumping D-249 forbids, in the opposite direction. This is the
  //      host-side equivalent of `src/lib/listing/re-review.ts`'s resubmission-time rule, and it has
  //      to be spelled this way because `host_verification` has no history table to COALESCE over
  //      the way the listing queue does, and is not growing one.
  //
  //   ④ `updated_at = now()` IS SPELLED EXPLICITLY even though `schema.ts:432-435` declares
  //      `$onUpdate(() => new Date())`. `$onUpdate` fires only through Drizzle's query BUILDER, and
  //      this is a raw statement; every shipped ops write spells it for the same reason.
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
            created_at = now(),
            updated_at = now()
        WHERE host_verification.status = 'unverified'
           OR ( host_verification.status = 'rejected'
                AND host_verification.updated_at
                    < now() - make_interval(hours => ${COOLDOWN_HOURS}::int) )
      RETURNING user_id
    `)) as unknown as { user_id: string }[];

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
    meta: { userId, provider: check.provider },
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
