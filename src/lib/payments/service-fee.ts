import "server-only";

// PAY-06 booker-facing service fee (D-74/D-76) — the pure, integer-cents fee added ON TOP of the space
// price at checkout. Mirrors src/lib/payments/commission.ts exactly: a small, PURE, no-I/O module owning
// ONE correctness concern, throwing rather than silently freezing a wrong number.
//
// WHY IT EXISTS: it funds the ~2.5% gateway fee PayMongo does NOT return on a refund (transaction fees are
// still charged for refunded payments — the same fact that drove D-63). A 100%-refund cancellation would
// otherwise cost the platform that gateway cost with zero revenue against it. D-76 makes it a PERCENTAGE
// rather than a flat amount precisely so it tracks that cost at every price point.
//
// SUPERSEDES the BOOKER-facing half of D-50 ("no booker-facing fee line; breakdown stays subtotal = total").
// The HOST-side half of D-50 is UNCHANGED: commission is still a 10% host-side deduction and the host still
// receives space price − 10% (see commission.ts). The fee is labelled "Service fee" (D-73) — never "Taxes
// and fees"; it is platform revenue, not a government levy, and re-bundling it is the exact junk-fee pattern
// PH DTI price-display rules and the US/EU regimes target.
//
// SERVER-ONLY (D-34 / GATE-05). Pure and no-I/O, but NOT isomorphic any more: `import "server-only"` on
// line 1 makes Turbopack hard-FAIL `next build` if any client component's import graph reaches this
// module. It is guarded because it is the money computation — a client that could call it would need
// SERVICE_FEE_BPS in the browser bundle, where a non-`NEXT_PUBLIC_` override silently resolves to the 500
// fallback and the browsed price stops agreeing with the charged one (T-11-FEELEAK). A client component
// receives the RESULT as a pre-formatted string or an integer-cents figure computed server-side; never
// the inputs to compute one. Server Components, server actions and the payout sweep import it freely.
//
// COMPOSITION RULE (load-bearing): quoteWindow (src/lib/booking/pricing.ts) KEEPS returning the SPACE price.
// It is a pure function over the listing's rates and must NOT know about platform fees. The fee is composed
// at the CALLER (the hold-creation path), which preserves the Phase-4 pure-pricing seam and keeps its
// existing tests valid. D-75 then displays allInCents wherever a price is browsed, so the number never goes
// up between browsing and paying, and the D-78 breakdown splits it back into its two lines at checkout.

import { SERVICE_FEE_BPS } from "@/lib/payments/fees";

export type ServiceFee = {
  /** The applied rate in basis points — FREEZE this alongside the amount, same discipline as D-51. */
  feeBps: number;
  /** Integer centavos charged to the booker on top of the space price. NON-REFUNDABLE (D-74). */
  serviceFeeCents: number;
  /** What the booker actually pays: space price + service fee. The D-75 all-in display number. */
  allInCents: number;
};

/**
 * Compute the booker-facing service fee for a space price, in integer centavos.
 *
 * Single defined rounding rule (Research Pitfall 5, the computeCommission idiom D-76 names): the fee is
 * rounded ONCE, on the line below — this file must contain exactly one rounding call and that is asserted
 * by grep in the plan's acceptance criteria. allInCents is then an ADDITION — never a second rounding — so
 * the all-in number a booker browses is byte-identical to the sum of the two breakdown lines they see at
 * checkout. Defaults `feeBps` to the config-tunable SERVICE_FEE_BPS (never a literal at a call site).
 *
 * Money guard: throws on a non-integer/negative space price or a feeBps outside [0, 10000] rather than
 * freeze a nonsense charge.
 */
export function computeServiceFee(
  spacePriceCents: number,
  feeBps: number = SERVICE_FEE_BPS,
): ServiceFee {
  if (!Number.isInteger(spacePriceCents) || spacePriceCents < 0)
    throw new Error("space price must be a non-negative integer number of centavos");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000)
    throw new Error("feeBps must be an integer in [0, 10000]");

  const serviceFeeCents = Math.round((spacePriceCents * feeBps) / 10000); // single defined rounding
  return { feeBps, serviceFeeCents, allInCents: spacePriceCents + serviceFeeCents };
}
