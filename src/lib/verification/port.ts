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
// FINDING F-5, DECIDED — A PROVIDER THAT MUST *ASK* GETS A SECOND ENTRY POINT, NOT A WIDER CONTRACT
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `VerificationDecision` models exactly ONE moment: A VERDICT HANDED IN. That fits the ops-manual
// provider precisely — a staff member decided, and their decision IS the input — and it fits
// applying a verdict a network vendor has already reached and sent back. It does NOT fit the moment
// FitOut ASKS a vendor to look at somebody: at that instant nobody has decided anything, there is no
// `result` to hand in, and the vendor's answer arrives later on a channel this function is not on.
//
// TWO HONEST SHAPES WERE ON THE TABLE, AND (b) IS CHOSEN.
//
//   (a) REJECTED — widen `VerificationDecision` into a discriminated union, e.g.
//       `{ kind: "decided", result } | { kind: "requested", subjectId }`, so one method covers both
//       moments. Rejected for a structural reason rather than on taste: it changes the contract type
//       BOTH providers implement in order to model a moment only ONE of them has. The manual
//       provider would grow a branch for a request it can never receive, `runVerification` would
//       start returning things that are not verdicts, and every reader of a `VerificationResult`
//       would have to learn which `kind` produced it. That is how ONE branch point becomes two.
//
//   (b) CHOSEN — TWO ENTRY POINTS. `verify(decision)` keeps its single meaning and stays the only
//       member of `VerificationProvider`. A provider that must first ASK exposes a SECOND named
//       function of its own — `beginVerification` — which is deliberately NOT part of this interface
//       and therefore NOT reachable through `runVerification`. It creates the vendor's session and
//       hands back the same four-field `VerificationResult` with `result: null` and `checkedAt:
//       null`, because nothing has been decided yet and writing either field would fabricate a check
//       (the `VerificationResult` docblock's grandfathered-row rule, applied one moment earlier).
//
// WHY THAT IS THE RIGHT TRADE. The property worth protecting is that THE VERDICT has exactly one
// code path — that is what "the only branch point" and "it fails closed" are statements about, and
// it is what makes a verified `host_verification` row impossible to write without coming through
// here. A session REQUEST decides nothing and writes no verdict, so routing it through the same door
// buys no safety; it only adds a discriminator a future reader can get wrong on the path that
// actually matters.
//
// THE COST, STATED RATHER THAN HIDDEN: the asking half of a vendor adapter is NOT policed by this
// module. It is an ordinary exported function on the adapter, and the discipline that keeps it
// honest is that it may only ever produce `result: null`. Nothing but `verify` — reached through
// `runVerification` — may produce a non-null verdict.
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

import { diditVerificationProvider } from "./providers/didit";
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
 * - `provider`  — WHICH port answered. `'manual'` (the ops override, D-259) and `'didit'` (the KYC
 *                 vendor, D-258) are the two that are REGISTERED; `'migration'` is what the
 *                 drizzle/0026 grandfather rows carry, because nothing was checked, and it is
 *                 deliberately registered nowhere.
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

/**
 * The staff/vendor decision handed INTO a provider. One field, for the same reason
 * `VerificationResult` has four.
 *
 * ⚠ IT STAYS ONE FIELD AND IT STAYS A VERDICT. A provider that must first ASK a vendor to look at
 * somebody does not come through here at all — FINDING F-5 in the header records why that is a
 * second named function on the adapter rather than a `kind` discriminator on this type.
 */
export type VerificationDecision = {
  result: VerificationOutcome;
};

/**
 * The adapter contract every provider — the ops-manual one today, a network KYC vendor next —
 * implements.
 *
 * `verify` may return its result DIRECTLY or as a PROMISE. The manual provider has nothing to await
 * and still returns a plain value; an adapter that has to make an HTTP call returns a promise from
 * the same method, and `runVerification` awaits either. Widening the RETURN type cannot break a
 * synchronous provider, because `await` on a non-promise is a legal no-op.
 *
 * THE PREVIOUS VERSION OF THIS COMMENT PROMISED THE WIDENING WOULD COST "one edit here plus one
 * `await`, not a call-site sweep". That promise is now MEASURED rather than asserted: it cost this
 * union, the one `await` in `runVerification` below, and exactly TWO non-test call sites
 * (`approveHost` and `rejectHost` in `src/app/actions/ops-review.ts`). There was no third, because
 * every caller already goes through the port — which is the whole point of there being a port.
 */
export interface VerificationProvider {
  readonly name: string;
  verify(decision: VerificationDecision): VerificationResult | Promise<VerificationResult>;
}

/**
 * THE REGISTRY — the one branch point (property 1 in the header). EXACTLY TWO ROWS, and both of them
 * are decisions rather than accumulation.
 *
 * Adding a vendor is one row here plus its adapter module. Nothing else in the codebase learns a
 * provider name, and nothing else may.
 *
 * D-258 — `didit` LANDED HERE IN PLAN 18.1-05, AND THE COST IS THE MEASUREMENT. This module has
 * claimed since plan 18-05 that wiring a real KYC vendor would be a REGISTRATION plus a config
 * change rather than a re-architecture. It came to one import, one row and three environment
 * variables: no call site learned the vendor's name, no caller grew a branch, and the four-field
 * `VerificationResult` every reader already understood did not change shape. The asking half — a
 * hosted session has to be CREATED before anyone can decide anything — lives on the adapter as its
 * own named function, which is FINDING F-5's option (b) in the header, not an exception to it.
 *
 * D-259 — THE MANUAL ROW STAYS, AND NOT AS A LEFTOVER. It is the OPS OVERRIDE. A vendor outage, a
 * document the workflow cannot read, or a host appealing a decline still has to be decidable by a
 * named member of staff, and `provider = 'manual'` is what keeps those rows distinguishable from a
 * vendor's verdict in the audit trail for as long as the row exists. Deleting it would leave FitOut
 * with no verification path at all on the day Didit is unreachable.
 *
 * ⚠ `'migration'` IS STILL ABSENT, AND A THIRD ROW FOR IT WOULD BE A MISTAKE RATHER THAN A
 * COMPLETION. drizzle/0026's grandfathered rows carry that string precisely because NOTHING WAS
 * CHECKED on them; there is no adapter that could have produced them and no code path that may
 * re-run one. It must keep resolving to nothing, permanently.
 *
 * ⚠ THE CLIENT-BUNDLE DIRECTIVE STAYS ON THE ADAPTERS AND STILL DOES NOT APPEAR IN THIS FILE — see
 * the heading for why, and note the case is stronger now: the Didit adapter holds an API KEY, so it
 * is exactly the module a browser bundle must never REACH, while this one only carries the contract
 * a badge component may legitimately `import type` from. This module inherits the protection by
 * importing the adapters. Do not restate the directive here, in code or in prose.
 */
const PROVIDERS: Readonly<Record<string, VerificationProvider>> = {
  [manualVerificationProvider.name]: manualVerificationProvider,
  [diditVerificationProvider.name]: diditVerificationProvider,
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
 *
 * ASYNC FOR EVERYBODY, INCLUDING THE SYNCHRONOUS PROVIDER. The unregistered branch still returns
 * `null` — a resolved `null`, which every caller reads the same fail-closed way — and the resolution
 * itself is unchanged and still happens before anything is awaited, so a hostile provider name never
 * reaches an adapter at all. Making this async is what lets a network vendor live behind the SAME
 * single branch point instead of beside it; the alternative was a second, un-policed road to a
 * verified row.
 */
export async function runVerification(
  providerName: string | null | undefined,
  decision: VerificationDecision,
): Promise<VerificationResult | null> {
  const provider = resolveVerificationProvider(providerName);
  if (!provider) return null;
  return await provider.verify(decision);
}

/**
 * Did a check actually come back verified? `null` in, `false` out — the fail-closed reading of "no
 * provider answered", stated once so no caller re-spells it as a truthiness test on an object that
 * exists but carries `result: null`.
 *
 * ⚠ DELIBERATELY STILL SYNCHRONOUS. It takes a VALUE, never a promise, and it was not widened
 * alongside `runVerification`. That narrowness is a guard rather than an oversight: `runVerification`
 * is async now, so `isVerified(runVerification(…))` — the un-awaited form — is a REJECTED PROGRAM
 * rather than a quiet `false` for a genuinely verified host. Widening this signature to accept a
 * promise would delete that compile error and re-open exactly the reading the fail-closed contract
 * cannot afford to be silent about.
 */
export function isVerified(result: VerificationResult | null | undefined): boolean {
  return result?.result === "pass";
}
