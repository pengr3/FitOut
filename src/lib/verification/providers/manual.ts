import "server-only";

// The OPS-MANUAL verification provider (D-206) — and it is a REAL provider, not a stub.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT "MANUAL" MEANS HERE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// D-206 says the gate, the queue, the badge and the audit trail are all REAL in this phase, and only
// the VENDOR is deferred. The check this provider represents is a person at FitOut looking at the
// account facts the ops queue puts on the row — display name, account age, email confirmed, how many
// listings the host has waiting — and deciding. That is a real check with a real actor and a real
// audit row; it is simply not a third-party document check.
//
// So this adapter is the ops console's WRITE PATH EXPRESSED THROUGH THE CONTRACT. The staff decision
// enters `runVerification` (src/lib/verification/port.ts) and comes back out as the same
// `VerificationResult` shape a KYC vendor's adapter would produce. That is what makes the later swap
// a REGISTRATION plus a config change: the caller keeps calling the same contract, and only the
// registry row moves. If the ops action wrote the four columns directly, the port would be
// decoration and the swap would be a rewrite.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE STORAGE CONTRACT, RESTATED WHERE THE WRITER LIVES
// ════════════════════════════════════════════════════════════════════════════════════════════════
// FitOut persists ONLY `{ result, vendorRef, checkedAt, provider }`. Never a government ID, never a
// document, never an image. `host_verification` has NO COLUMN that could hold one and there must
// never be one — enforced by the exact-column-set allow-list in
// `tests/ops/verification-schema.test.ts` (plan 18-02), asserted against
// `information_schema.columns` in the replayed schema, not by this comment.
//
// `vendorRef` IS ALWAYS `null` HERE, and that is the honest value rather than a gap: there is no
// vendor, so there is nothing for a reference to point at. A synthetic id minted here would look
// exactly like a vendor handle to every later reader and would be a lie in a compliance column.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE GUARD IS ON THIS FILE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `src/lib/payments/fees.ts:1-30`'s rule: guard the module a client must never REACH, not the module
// a client legitimately IMPORTS. This is a WRITE path for a privileged, money-adjacent decision;
// nothing in a browser bundle has any business reaching it. The port that imports it inherits the
// guard by transitivity, so a client component that pulls a VALUE out of the port fails `next build`
// naming THIS file — the correct file to name.
//
// NO PACKAGE WAS INSTALLED. Next aliases the `server-only` specifier (node_modules/next/types/
// global.d.ts:57) and both Vitest configs alias it to tests/helpers/server-only.stub.ts, so this
// costs the suite nothing. `npm install server-only` is a recorded-decision reversal (D-34 /
// GATE-05), not a fix.

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
 * ⚠ `'migration'` is the OTHER provider string in this system (drizzle/0026's grandfather rows) and
 * it is deliberately NOT registered here: nothing was checked on those rows, so there is no adapter
 * that could have produced them and no code path that may re-run one.
 */
export const MANUAL_PROVIDER_NAME = "manual";

/**
 * The ops-manual adapter.
 *
 * `checkedAt` is the JS clock rather than a `readDbNow()` read, and the difference matters here in
 * the direction that makes the JS clock correct: this value is PROVENANCE (when did a person
 * decide), never a comparand. Nothing races against it, no predicate compares it to a Postgres
 * `now()`, and no money is derived from it — so there is nothing for a clock skew to get wrong. The
 * project's zero-JS-clock rule exists for values that are compared against database state; this is
 * not one, and pretending otherwise would put a database round-trip inside a pure function.
 *
 * Synchronous by design — there is nothing to await. See `VerificationProvider` in the port for how
 * a network-bound vendor adapter widens this without touching any call site.
 */
export const manualVerificationProvider: VerificationProvider = {
  name: MANUAL_PROVIDER_NAME,
  verify(decision: VerificationDecision): VerificationResult {
    return {
      result: decision.result,
      // No vendor ⇒ no reference. See the header: a synthetic id here would be a lie in a
      // compliance column.
      vendorRef: null,
      checkedAt: new Date(),
      provider: MANUAL_PROVIDER_NAME,
    };
  },
};
