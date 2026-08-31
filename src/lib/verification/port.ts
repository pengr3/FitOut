// The SINGLE place the "which identity-verification provider answers, and did it say verified?"
// question is answered (D-206, HVER-01).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE STORAGE CONTRACT — FOUR FIELDS, AND NOTHING THAT COULD HOLD A DOCUMENT
// ════════════════════════════════════════════════════════════════════════════════════════════════
// FitOut is a PORT to a verification provider and NEVER a custodian of identity documents. What
// crosses this boundary and gets persisted is EXACTLY:
//
//     { result, vendorRef, checkedAt, provider }
//
// Never a government ID, never a document, never an image, never a payload the vendor returned. If a
// real KYC vendor is wired later (D-206 defers it — PayMongo Linked Accounts is sales-gated and has
// never been walked), the document stays on the vendor and `vendorRef` is the only handle FitOut
// keeps pointing at their copy.
//
// AND THAT CONTRACT IS ENFORCED BY THE DATABASE, NOT BY THIS COMMENT. `host_verification` has no
// column that could hold one, and `tests/ops/verification-schema.test.ts` (plan 18-02) asserts the
// table's EXACT column set as an ALLOW-LIST against `information_schema.columns`, so a column named
// anything at all — `attachment_url`, `selfie`, `poi_scan` — reddens it. The `VerificationResult`
// shape below is the same contract stated one layer up, where the writer can see it.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO LOAD-BEARING PROPERTIES, COPIED IN SPIRIT FROM src/lib/payments/refund-rail.ts
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `refund-rail.ts:35` states them in one line — "This module remains the ONLY branch point for
// refund dispatch. Do NOT inline this predicate anywhere." Both apply here verbatim:
//
//   1. THIS IS THE ONLY BRANCH POINT. The provider-name → adapter mapping lives here and nowhere
//      else. Do NOT write `provider === "manual"` at a call site; do NOT keep a second copy of the
//      registry; do NOT let a caller construct a `VerificationResult` by hand. `runVerification`
//      below is the one code path from "a staff member decided" to "a persistable result", which is
//      what makes registering a vendor later a REGISTRATION plus a config change rather than a
//      re-architecture — the entire reason D-206 asked for a port instead of a KYC integration.
//
//   2. IT FAILS CLOSED. An unregistered, misspelled, empty, `null` or `undefined` provider name
//      resolves to NO provider, and no provider resolves to NO result, which the caller must read as
//      NOT VERIFIED. There is deliberately no permissive default, no "fall back to manual", and no
//      throw — a throw on this path would become a 500 on a privileged action and tell an operator
//      nothing useful. `tests/ops/verification-port.test.ts` proves the property rather than
//      asserting it, including the two prototype-shaped names a plain `Record` lookup would answer
//      truthily.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS MODULE IS DIRECTIVE-FREE AND THE ADAPTER IS GUARDED
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THIS HEADING DELIBERATELY DOES NOT SPELL THE DIRECTIVE. An acceptance grep asserts that the
// bare side-effect import of that specifier appears ZERO times in this file, and prose quoting it
// verbatim trips a gate about its own absence — drizzle/0021's rule, and the same collision
// tests/design/server-only-guards.test.ts:140-150 records as this repo's DEFAULT outcome rather
// than an edge case. Do not "restore clarity" by re-adding the literal; the structural version of
// this claim is case 13 of tests/ops/verification-port.test.ts, which reads comment-stripped source.
// `src/lib/payments/fees.ts:1-30` records the rule this follows: guard the module a client must
// never REACH, not the module a client legitimately IMPORTS. The contract TYPES here are erased at
// compile time, so a badge component may `import type` from this file for free. The provider
// IMPLEMENTATION is guarded (`src/lib/verification/providers/manual.ts`), and because this module
// imports it for the registry, the guard covers this whole graph too: a client component that
// imports a VALUE from here fails `next build` LOUDLY, naming the adapter, instead of shipping an
// ops write path to a browser. That is the intended outcome, and it is why the guard sits on the
// implementation rather than being duplicated here.
//
// ⚠ A client component that only needs the host's verification STATUS to render a badge (HVER-05,
// plan 18-11) reads `HostVerificationStatus` from `src/lib/db/schema.ts` as a TYPE. It does not need
// this module at all.
//
// NO PACKAGE WAS INSTALLED FOR THE GUARD. Next aliases the `server-only` specifier and declares the
// module at node_modules/next/types/global.d.ts:57; both Vitest configs alias it to
// tests/helpers/server-only.stub.ts. An `npm install server-only` is a recorded-decision reversal
// (D-34 / GATE-05), not a fix.

import { manualVerificationProvider } from "./providers/manual";

/**
 * The verdict a provider can return. Deliberately NOT the `host_verification.status` enum: `status`
 * is FitOut's own lifecycle (`unverified | pending | approved | rejected | grandfathered |
 * suspended`), while this is the CHECK's own outcome. Collapsing the two would make a vendor's
 * "fail" indistinguishable from an operator's suspension, which is exactly the blur D-244 refused on
 * `cancelled_by`.
 */
export type VerificationOutcome = "pass" | "fail";

/**
 * EVERYTHING FitOut persists about an identity check. Four fields, and there is no fifth.
 *
 * - `result`    — the provider's verdict, or `null` when no check has happened.
 * - `vendorRef` — the vendor's own handle for the check. `null` for the manual provider, which has
 *                 no vendor. This is the ONLY thing that points at the vendor's copy of a document.
 * - `checkedAt` — when the check happened. `null` when it has not. It MUST stay `null` on a
 *                 grandfathered row: writing a timestamp for a check that never ran fabricates an
 *                 audit record (T-18-0202, the drizzle/0025 `resolved_by` principle).
 * - `provider`  — WHICH port answered. `'manual'` is what ships in this phase; `'migration'` is what
 *                 the drizzle/0026 grandfather rows carry, because nothing was checked.
 *
 * ⚠ DO NOT ADD A FIELD HERE. Not a document url, not an ID number, not a raw vendor payload, not a
 * "just for debugging" blob. There is no column for one and there must never be.
 */
export type VerificationResult = {
  result: VerificationOutcome | null;
  vendorRef: string | null;
  checkedAt: Date | null;
  provider: string;
};

/** The staff/vendor decision handed INTO a provider. One field, for the same reason `VerificationResult` has four. */
export type VerificationDecision = {
  result: VerificationOutcome;
};

/**
 * The adapter contract every provider — the ops-manual one today, a KYC vendor later — implements.
 *
 * `verify` is synchronous because the manual provider has nothing to await. A future vendor adapter
 * that must make an HTTP call widens this to `VerificationResult | Promise<VerificationResult>`;
 * every call site already goes through `runVerification`, so that widening is one edit here plus one
 * `await`, not a call-site sweep. Stated so the next person does not read the sync signature as a
 * reason the port cannot take a network provider.
 */
export interface VerificationProvider {
  readonly name: string;
  verify(decision: VerificationDecision): VerificationResult;
}

/**
 * THE REGISTRY — the one branch point (property 1 in the header).
 *
 * Adding a vendor is one row here plus its adapter module. Nothing else in the codebase learns a
 * provider name, and nothing else may.
 */
const PROVIDERS: Readonly<Record<string, VerificationProvider>> = {
  [manualVerificationProvider.name]: manualVerificationProvider,
};

/**
 * Resolve a provider name to its adapter, or `null` for ANYTHING unregistered.
 *
 * FAILS CLOSED (property 2 in the header). `null`, `undefined`, `""`, a misspelling and a vendor
 * nobody registered all return `null`, and `null` resolves to NOT VERIFIED at every caller. There is
 * no permissive default and no fall-back-to-manual: silently treating an unknown provider as the
 * manual one would mean a config typo quietly marked hosts verified by a check nobody ran.
 *
 * `Object.hasOwn` IS LOAD-BEARING AND NOT DEFENSIVE NOISE. A bare `PROVIDERS[name]` on an object
 * literal answers TRUTHILY for `"constructor"`, `"toString"`, `"valueOf"` and `"__proto__"` —
 * inherited `Object.prototype` members — so a caller-influenced provider name could resolve to a
 * function that is not a provider at all. The own-property check is the difference between a
 * fail-closed lookup and one that fails closed only for names nobody thought to try.
 */
export function resolveVerificationProvider(
  name: string | null | undefined,
): VerificationProvider | null {
  if (name == null || name === "") return null;
  if (!Object.hasOwn(PROVIDERS, name)) return null;
  return PROVIDERS[name];
}

/**
 * THE ONE CODE PATH from "a decision was made" to "a result that may be persisted".
 *
 * Returns `null` when the provider is unregistered — so an unknown provider cannot produce a
 * `VerificationResult` at all, which is a stronger statement than "produces a failing one": there is
 * no object for a caller to write to `host_verification` in the first place. The ops actions
 * (`src/app/actions/ops-review.ts`) refuse calmly on `null` and write nothing.
 *
 * ⚠ Callers MUST NOT construct a `VerificationResult` literal. Going through here is what keeps the
 * manual provider a REAL provider rather than decoration, and it is the property that makes the
 * later vendor swap a registration instead of a rewrite (D-206).
 */
export function runVerification(
  providerName: string | null | undefined,
  decision: VerificationDecision,
): VerificationResult | null {
  const provider = resolveVerificationProvider(providerName);
  if (!provider) return null;
  return provider.verify(decision);
}

/**
 * Did a check actually come back verified? `null` in, `false` out — the fail-closed reading of "no
 * provider answered", stated once so no caller re-spells it as a truthiness test on an object that
 * exists but carries `result: null`.
 */
export function isVerified(result: VerificationResult | null | undefined): boolean {
  return result?.result === "pass";
}
