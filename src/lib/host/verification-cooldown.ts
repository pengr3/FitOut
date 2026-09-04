// D-264 / D-272 — THE RETRY COOLDOWN, DECLARED ONCE, FOR BOTH THE SERVER THAT ENFORCES IT AND THE
// SURFACE THAT PROMISES IT.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS A MODULE OF ITS OWN — deferred-items.md D2, resolved for its SECOND requester
// ════════════════════════════════════════════════════════════════════════════════════════════════
//
// The value below shipped as a module-private const inside `src/app/actions/host-verification.ts`,
// where it was correct and unreachable, because that module had the only reader: its own guarded
// UPDATE's `WHERE`.
//
// `/host/verify` is the second reader. A rejected host has to be told the instant they may ask
// again, and `composeRetryAfterSentence` in `src/lib/host/verification-signal.ts` takes the hours as
// an ARGUMENT precisely so the wording cannot invent its own policy — its docblock says both
// arguments come from the authority that enforces the rule. That leaves exactly three ways to hand
// the number to the page, and two of them are wrong:
//
//   1. Export it from the action. ⛔ NOT AVAILABLE. That module opens with the server-action
//      directive, and `tests/use-server-exports.test.ts` records the incident: such a module may
//      export ONLY async functions, and `src/app/actions/avatar.ts` exporting a number killed the
//      whole module in the browser for a phase while the unit tests stayed green. The deeper
//      objection is worse than the mechanical one — every export of a server-action module is a
//      network-reachable POST endpoint, which is not what a policy number should become.
//   2. Spell `24` again at the page. ⛔ THE TWO-AUTHORITIES DEFECT. The number in the sentence a
//      host READS would then be a different declaration from the number in the `WHERE` that
//      DECIDES, kept in agreement by nothing. PROJECT D-130 / GATE-05 is named for exactly that
//      shape on the money path, and a cooldown is the same shape one domain over: a figure on
//      screen that can disagree with the clause that refuses.
//   3. An UNGUARDED DECLARATION MODULE BESIDE THE GUARDED ONE. ✅ This file. The repo ships the
//      shape twice already — `payments/config.ts` beside guarded `payments/fees.ts`, and
//      `availability/horizon.ts` beside guarded `availability/slots.ts` — and `deferred-items.md`
//      D2 names that split as the resolution for this family of value.
//
// ⚠ IT IS NOT IN `tests/design/server-only-guards.test.ts`'s `MUST_NOT_BE_GUARDED`, AND THAT IS A
// DECISION RATHER THAN AN OMISSION. Both rows in that list were split out of modules carrying the
// CLIENT-BUNDLE guard, and each row names the shipped client importers that make the absence of a
// guard load-bearing. This value was split out of a SERVER-ACTION module, which is a different
// guard family with its own gate (`tests/use-server-exports.test.ts`), and nothing here is a money
// rate, a credential, a connection or an environment read. Adding a row would claim a relationship
// to D-34 that this file does not have.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE COPY MODULE IS NOT THE OWNER EITHER
// ════════════════════════════════════════════════════════════════════════════════════════════════
//
// `verification-signal.ts` holds the sentence and could have held the number. It must not: that
// module's own header says a default there "would be a second policy that agrees with the first
// until somebody changes one of them". Copy is not policy. The words live there, the interval lives
// here, and the surface joins them at render time from two owners neither of which can drift.

/**
 * THE DURABLE CAP (D-264) — a rejected host may ask again after this many hours.
 *
 * A COOLDOWN AND NOT AN ATTEMPT COUNTER, and that is forced rather than chosen: case 1 of
 * `tests/ops/verification-schema.test.ts` asserts `host_verification`'s column set by SET EQUALITY,
 * so a counter column reddens it. There is consequently no lifetime cap either, because a lifetime
 * cap cannot be expressed without somewhere to keep the count. Retry is the only thing standing
 * between a vendor misread and a permanently unsellable real host, so an interval is the right shape
 * anyway.
 *
 * ⚠ A LITERAL, AND NEVER READ FROM THE ENVIRONMENT. `src/lib/payments/fees.ts:82`'s
 * `OPS_CANCEL_REFUNDS_SERVICE_FEE` precedent: a behaviour change of this kind should be a REVIEWED
 * one-line code change with a diff and a test, never an environment variable that can flip silently
 * in a deploy nobody read. (An acceptance grep counts environment reads in the action that consumes
 * this and expects zero, so the spelling of that access is deliberately absent here too — the same
 * drizzle/0021 rule the action's header follows.)
 *
 * ⚠ IT IS THE SINGLE AUTHORITY ON HOW OFTEN A HOST MAY TRY (D-272). The checking partner's account
 * carries `max_retry_attempts: 7` over `retry_window_days: 7`, which is this number restated in the
 * vendor's units, deliberately raised so the vendor can never refuse a retry FitOut has already
 * promised. **If this constant ever changes, `DECLARED_RETRY` in `scripts/didit-setup.ts` changes in
 * the SAME COMMIT**; `npm run didit:verify` fails when the account and the declaration disagree, but
 * only the same-commit rule keeps the two MEANINGS aligned.
 *
 * ⚠ The vendor's PER-MODULE caps are lower and were NOT raised (2 attempts at the document step, 3
 * at each of the other two). Those bound retries WITHIN one session, not sessions per week, so a
 * host can exhaust one sitting while this cooldown is nowhere near reached — which is why an
 * exhausted module must never be rendered to a host as having used up their tries (18.1-06's rule,
 * D-272). Nothing that reads this constant may say or imply that.
 *
 * ⚠ THE TWO READERS, AND THE COLUMN THEY BOTH DERIVE FROM. The submission action's guarded UPDATE
 * carries `updated_at < now() - make_interval(hours => …)` in its own `WHERE`; `/host/verify` passes
 * this same number, with the same `updated_at` from `loadHostVerification`, through
 * `composeRetryAfterSentence`. One number, one column, one instant — so the sentence a host reads
 * and the clause that refuses them cannot say different things.
 */
export const COOLDOWN_HOURS = 24;
