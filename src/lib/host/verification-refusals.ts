// THE SERVER'S SENTENCES for the host verification submission (HVER-06 / HVER-08 / D-264 / D-266).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS A MODULE OF ITS OWN AND NOT SIX CONSTANTS AT THE TOP OF THE ACTION
// ════════════════════════════════════════════════════════════════════════════════════════════════
// 18.1-07-PLAN Task 1 asks for the five sentences as EXPORTED named constants, so plan 18.1-10 can
// add them to the banned-language corpus. They cannot be exported from `src/app/actions/
// host-verification.ts`, because that module opens with the server-action directive and
// `tests/use-server-exports.test.ts` proves — with a recorded RED, and with an incident behind it —
// that such a module may export ONLY async functions. `src/app/actions/avatar.ts` exported a number
// and a Zod object, Next rejected the WHOLE module at evaluation, and avatar upload was dead in the
// browser for a phase while the unit tests stayed green. A string constant would fail the same way.
//
// So the copy lives here, unguarded and importable from anywhere, and the action imports it. That is
// also the shape 18.1-PATTERNS § "Copy lives in a module; the component decides presentation" asks
// for, and the shape `src/lib/listing/review-signal.ts` already ships: the sentence has ONE owner,
// the server returns it verbatim, and the client re-authors nothing. A second wording of a refusal
// is a second thing to keep in agreement with the code that refused.
//
// NO GUARD ON THIS FILE, DELIBERATELY. `src/lib/payments/fees.ts:1-30`'s rule — guard the module a
// client must never REACH, not the module a client legitimately IMPORTS. This one holds six strings,
// no credential, no connection and no environment read; the host panel (plan 18.1-11) renders the
// sentence the action returned and may legitimately import these to assert against. The module that
// holds the API key is the Didit adapter, and it carries its own guard on line 1.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// FIVE OF THESE SIX ARE TRANSCRIBED VERBATIM FROM 18.1-UI-SPEC § Surface 2 § The server's sentences
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Byte-identical, deliberately. If a sentence changes here it changes what a host is told, so it is a
// copy decision and belongs in the UI spec first — `src/lib/validation/ops.ts`'s rule for the
// rejection taxonomy, applied to a refusal.
//
// ⚠ THE 0-ROW SENTENCE IS ONE SENTENCE FOR FIVE CONDITIONS ON PURPOSE. See its own docblock: it is
// `re-review.ts`'s discipline AND a privacy property, and collapsing the two readings into one
// sentence is the whole point rather than an economy.

/**
 * NOT signed in. ⚠ THE ONE SENTENCE HERE THAT IS **NOT** IN THE UI-SPEC TABLE, and the reason is
 * that the spec's Surface 2 is rendered inside a panel a signed-out visitor never reaches: the table
 * enumerates what the FORM can be told, and this is what the ACTION says to a caller who arrived
 * without a session. A `"use server"` export is reachable by POST whatever the UI shows
 * (`src/lib/validation/ops.ts`'s opening rule), so the branch is real and needs a sentence.
 *
 * Worded on `src/app/actions/capability.ts:60`'s shipped pattern ("You must be signed in to start
 * hosting.") rather than invented.
 */
export const HOST_VERIFICATION_SIGNED_OUT =
  "You must be signed in to start the check.";

/**
 * D-269 — the email is not confirmed. The wizard's checklist row is a hint; the action is the gate,
 * and it re-reads `user.emailVerified` server-side.
 *
 * ⚠ Not a reversal of D-07: `src/lib/auth.ts` keeps `requireEmailVerification: false` and
 * `autoSignIn: true`, so sign-in stays unblocked globally. The gate is local to this one action,
 * exactly as the publish wizard's already is.
 */
export const HOST_VERIFICATION_EMAIL_UNCONFIRMED =
  "Confirm your email address before starting the check.";

/**
 * D-268 — no phone, or a phone outside the permissive bound. Self-declared and not verified: the
 * statute says *collect*, not validate, and FitOut has no SMS provider.
 */
export const HOST_VERIFICATION_PHONE_REQUIRED =
  "Add a phone number FitOut can reach you on.";

/**
 * The burst guard denied this press (5 per 60s, keyed on the authenticated user id).
 *
 * ⚠ SHIPPED COPY, REUSED UNCHANGED — `src/app/actions/capability.ts:74` returns this exact string
 * for the exact same limiter and the exact same budget. Rewriting it would give one product two
 * sentences for one condition.
 *
 * ⚠ AND IT IS NOT THE SENTENCE FOR THE DURABLE CAP. "In a moment" is true of a 60-second window and
 * would be a lie about the 24-hour retry interval, which is enforced in the submission UPDATE's own
 * WHERE and refuses with the 0-row sentence below.
 */
export const HOST_VERIFICATION_TOO_MANY_ATTEMPTS =
  "Too many attempts. Please try again in a moment.";

/**
 * THE ONE CALM SENTENCE FOR ALL FIVE 0-ROW CONDITIONS — suspended, already pending, already
 * approved, grandfathered, and a rejection whose 24-hour cooldown has not elapsed.
 *
 * TWO REASONS, and both are load-bearing:
 *
 *   1. `src/lib/listing/re-review.ts`'s discipline — every source state lives in the UPDATE's own
 *      WHERE, so a 0-row result is the single calm no-op and there is no branch a future edit can
 *      forget. Five conditions with five sentences would need five predicates OUTSIDE the statement,
 *      which is five chances for one of them to drift away from the WHERE that actually decides.
 *
 *   2. A PRIVACY PROPERTY. A suspended host must not be able to tell, from the SHAPE of a refusal,
 *      that they are distinguishable from a host whose cooldown has not elapsed. A distinct
 *      "your hosting is suspended" refusal here would confirm an enforcement decision to whoever is
 *      holding the session — and the host surface (plan 18.1-11) is where a suspension is
 *      legitimately explained, once, to its owner.
 */
export const HOST_VERIFICATION_NOTHING_CHANGED =
  "Nothing changed — this page may be out of date. Refresh to see where your check is.";

/**
 * The vendor call failed, so FitOut wrote NO row (fail closed).
 *
 * ⚠ HOST-FACING, AND DELIBERATELY SAYS NOTHING ABOUT WHY. A missing, malformed, expired or
 * wrong-application credential all answer HTTP 403 with no machine-readable discriminator
 * (18.1-RESEARCH § ADDENDUM A5), so the cause is an OPERATOR's problem and the adapter's own
 * message — which names the credential — is written for an operator log and is not fit to show a
 * host. This sentence tells the host the only true and actionable thing: nothing started, press it
 * again.
 */
export const HOST_VERIFICATION_VENDOR_UNAVAILABLE =
  "We couldn't start the check just now. Try again.";

/**
 * D-255 / PM-C — `createDraftListing` refused because the host is not checked yet (plan 18.1-12).
 *
 * TRANSCRIBED VERBATIM from 18.1-UI-SPEC § Surface 3 § The gate, byte for byte, for the same reason
 * the six above are: it is a copy decision, so it belongs in the spec first.
 *
 * ⚠ IT LIVES HERE RATHER THAN IN `src/app/actions/listing.ts` FOR THIS MODULE'S OPENING REASON, WHICH
 * APPLIES UNCHANGED ONE ACTION OVER. `listing.ts` opens with the server-action directive too, so it
 * may export ONLY async functions — `tests/use-server-exports.test.ts` records the `avatar.ts`
 * incident that proves it. A `const` at the top of that file would be module-private and therefore
 * unreachable by the banned-language corpus, which is exactly how a host-facing sentence stops being
 * policed. So the sentence has one owner here and the action imports it.
 *
 * ⚠ IT IS NOT IN `HOST_VERIFICATION_REFUSALS` BELOW, AND THAT IS DELIBERATE RATHER THAN AN OMISSION.
 * That array's contract is "every sentence `requestHostVerification` can return", and it is consumed
 * as exactly that claim; a sentence from a different action would make its docblock false. The
 * corpus in `tests/listing/review-signal.test.ts` scans THIS constant by name, under its own bullet.
 *
 * ⚠ AND IT IS THE SENTENCE FOR A REFUSAL THE PRODUCT PATH CANNOT REACH. `/host/listings/new` reads
 * the same row and redirects a refusing host to `/host/verify` BEFORE calling the action (FINDING
 * F-2), so a host meets the panel rather than this string. It is still host-facing and still
 * host-readable, because a `"use server"` export is reachable by POST whatever the UI shows — the
 * rule `src/lib/validation/ops.ts` opens with. It therefore names the check and points at the one
 * place a host can act, and it says nothing about WHICH of the four states refused them: a suspended
 * host must not learn their standing from the shape of a listing refusal, which is the privacy
 * property `HOST_VERIFICATION_NOTHING_CHANGED` above carries for the same reason.
 */
export const HOST_VERIFICATION_LISTING_REFUSED =
  "FitOut checks who a host is before a listing can go up. Ask for your check from your hosting dashboard.";

/**
 * EVERY sentence `requestHostVerification` can return, in one array — the handle plan 18.1-10 adds
 * to the banned-language corpus.
 *
 * All SIX, not the spec table's five: a corpus that checks the tone of what a host may be shown must
 * see every sentence the action can produce, and the signed-out branch produces one.
 *
 * ⚠ SIX, AND `HOST_VERIFICATION_LISTING_REFUSED` IS NOT THE SEVENTH — see its own docblock. It
 * belongs to `createDraftListing`, and widening this array would quietly falsify the claim above
 * that every reader of it depends on.
 */
export const HOST_VERIFICATION_REFUSALS: readonly string[] = [
  HOST_VERIFICATION_SIGNED_OUT,
  HOST_VERIFICATION_EMAIL_UNCONFIRMED,
  HOST_VERIFICATION_PHONE_REQUIRED,
  HOST_VERIFICATION_TOO_MANY_ATTEMPTS,
  HOST_VERIFICATION_NOTHING_CHANGED,
  HOST_VERIFICATION_VENDOR_UNAVAILABLE,
] as const;
