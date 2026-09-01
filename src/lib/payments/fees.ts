import "server-only";

// The three MONEY-RATE constants, split out of src/lib/payments/config.ts and GUARDED (D-34 / GATE-05) —
// plus, since phase 18, ONE MONEY-POLICY BOOLEAN that is deliberately NOT config-tunable.
//
// Same contract as the config.ts header this file inherits and amends: these are MECHANISM DEFAULTS the
// exported NAME is imported for, never a hardcoded literal at a call site, and a value may read
// process.env with a documented default.
//
// ⚠ THE FOURTH EXPORT BREAKS THE "may read process.env" CLAUSE ON PURPOSE. See
// OPS_CANCEL_REFUNDS_SERVICE_FEE at the bottom of this file: it is a LITERAL, and the reason it is a
// literal is the whole point of the constant. It still belongs in THIS file rather than config.ts,
// because config.ts:17-19 draws its own boundary at exactly the right place — "what stays below is
// timing, windows and payout cadence — nothing here decides what anybody is charged or paid" — and this
// one decides what a defrauded booker is REFUNDED.
//
// WHAT CHANGED, AND WHY THIS FILE EXISTS AT ALL. config.ts:9-10 used to say "Pure/isomorphic: no
// "use client"/"use server" directive, so Server Components, server actions, the commission calculator,
// and the payout sweep can all import it." That is still TRUE of config.ts and is now FALSE of these
// three: `import "server-only"` above makes Turbopack hard-FAIL `next build` the moment any client
// component's import graph reaches this module.
//
// WHY A SPLIT RATHER THAN A GUARD ON config.ts. config.ts also exports 14 TIMING/WINDOW constants, and
// two shipped client components import them legitimately — `slot-picker.tsx:43`
// (MIN_LEAD_INSTANT_MINUTES, MIN_LEAD_REQUEST_HOURS) and `request-row.tsx:34`
// (APPROVAL_PAYMENT_WINDOW_HOURS). Guarding config.ts whole would fail the build naming THOSE two files,
// which are not violations. The deny-list is drawn at MONEY COMPUTATION, not at whole trees.
//
// WHY THESE THREE. Each is a RATE or an AMOUNT that decides what somebody is charged or paid. A
// non-`NEXT_PUBLIC_` env read that reaches the browser does not throw — it silently resolves to the
// literal fallback below, so a deployment running `SERVICE_FEE_BPS=700` would keep BROWSING at 5% while
// CHECKOUT charged 7%: the number going up between browsing and paying, which is exactly what D-75
// forbids. The guard makes that shape a build failure instead of a silent price disagreement.
//
// NO PACKAGE WAS INSTALLED FOR THIS. Next aliases the `server-only` specifier and declares the module at
// node_modules/next/types/global.d.ts:57. An `npm install server-only` here is a recorded-decision
// reversal (D-34 / Scope Alarm 2), not a fix. Vitest cannot resolve the specifier from Node, so both
// Vitest configs alias it to `tests/helpers/server-only.stub.ts`.

/** Platform commission rate in basis points (D-51). 1000 bps = 10%. Config-tunable, host-side (D-50). */
export const COMMISSION_RATE_BPS = Number(process.env.COMMISSION_RATE_BPS ?? 1000);

/** D-74/D-76 booker-facing service fee, in basis points. 500 bps = 5%, computed on the SPACE price with
 *  the integer-cents computeCommission idiom. Funds the ~2.5% gateway fee PayMongo does NOT return on a
 *  refund (the fact that drove D-63). A PERCENTAGE, not a flat amount, so it tracks that cost at every
 *  price point. Supersedes the BOOKER-facing half of D-50 only; the host-side 10% commission is unchanged. */
export const SERVICE_FEE_BPS = Number(process.env.SERVICE_FEE_BPS ?? 500);

/** D-71 host-cancellation fee, flat integer centavos (30000 = PHP 300). Charged when a HOST cancels an
 *  already-confirmed booking (D-70) and CAPPED AT THE BOOKING VALUE at write time so it can never exceed
 *  what the host would have earned. Collected as a SIGNED DEBIT row on host_payout_ledger
 *  (kind = 'host_cancel_fee') and netted against the host's next payout; written off if they never host
 *  again. Flat is a deliberate, accepted tradeoff (~50% of a PHP 600 court booking, ~10% of a PHP 3,000
 *  gym day) — config-tunable specifically so real cancellation data can move it. */
export const HOST_CANCEL_FEE_CENTS = Number(process.env.HOST_CANCEL_FEE_CENTS ?? 30000);

/**
 * D-209 / D-236 — WHAT AN OPS-FORCED CANCELLATION REFUNDS. `false` is the PM's answer, verbatim:
 * *"booker 100% refund, but not the service fee / platform fee"* — the booker gets the full BOOKING
 * amount (the space price) back, FitOut RETAINS the D-74 service fee, and the host is paid nothing.
 *
 * ⚠ A LITERAL, NOT `process.env`. Every neighbour above reads the environment with a documented
 * default; this one deliberately does not, and the difference IS the constant's job. D-236 requires
 * that changing this behaviour be a ONE-LINE CODE CHANGE — written down, reviewed, and landing beside
 * the paragraph that argues against it — rather than a deployment setting that could flip silently in
 * an environment nobody reads. It is also, correspondingly, absent from `.env.example`: documenting it
 * there would advertise exactly the tunability this constant exists to refuse.
 *
 * ⚠ THE CONFLICT IS NOT SETTLED HERE, AND IT IS NOT MINE TO SETTLE. `cancelBookingAsHost` already
 * refunds the booker the FULL charge including this same service fee, and states the principle in its
 * own words at src/app/actions/cancel-booking.ts:1134-1137. An ops-forced cancellation on a
 * confirmed-fake listing is a strictly stronger instance of that principle, so `false` currently makes
 * FitOut LESS generous to a defrauded booker than to one whose host merely flaked. The argument is
 * written out IN FULL, with the precedent quoted verbatim, at the single site that reads this value:
 * `opsRefundBasisCents` in src/lib/ops/cancel-impact.ts, which is the one expression both
 * `cancelBookingAsOps` (the money that actually moves) and `loadOpsCancelImpact` (the figures the
 * console shows the operator BEFORE they commit) call. Read that comment before changing this line.
 *
 * Flipping it to `true` refunds `quotedTotalCents` instead of `spacePriceCents` everywhere at once.
 * `tests/payments/ops-cancel.test.ts` exercises BOTH values, so "one line flips it" is measured.
 */
export const OPS_CANCEL_REFUNDS_SERVICE_FEE = false;
