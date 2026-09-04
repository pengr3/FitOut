import "server-only";

// PAY-02 commission calculator (D-50/51/52) — the pure, integer-cents host-side deduction the payout
// ledger and the T+24h sweep rest on. Mirrors src/lib/booking/pricing.ts (quoteWindow): a small, PURE,
// no-I/O module owning ONE correctness concern, throwing rather than silently freezing a wrong number.
//
// Commission is a HOST-SIDE deduction (D-50): the booker pays the listed price with no booker-facing fee
// line; the host receives EXACTLY gross − commission. The platform absorbs the PayMongo gateway fee
// (D-52) — netCents is NEVER reduced further. `rateBps` is returned so the caller can FREEZE it on the
// ledger row (D-51) — a later rate change must never retroactively alter a past payout.
//
// SERVER-ONLY (D-34 / GATE-05). Pure and no-I/O, but NOT isomorphic any more: `import "server-only"` on
// line 1 makes Turbopack hard-FAIL `next build` if any client component's import graph reaches this
// module.
//
// THIS MODULE EXTENDS D-34's NAMED LIST BY ONE, and the reason is recorded here rather than inferred: the
// decision names service-fee.ts and all-in-rate.ts, not commission.ts. It is guarded on the SAME rationale
// — it is a money computation whose rate is a non-`NEXT_PUBLIC_` env read (COMMISSION_RATE_BPS, now in the
// guarded fees.ts) — and it costs nothing, because it has ZERO client importers (measured 2026-08-13: the
// only importers are the payout ledger, the sweep and their tests). Guarding a module nobody on the client
// wants is free; leaving the one host-side rate unguarded beside the guarded booker-side one is an
// inconsistency the next reader would have to re-derive.
//
// Server Components, server actions and the payout sweep import it freely.

import { COMMISSION_RATE_BPS } from "@/lib/payments/fees";

export type Commission = {
  /** The applied rate in basis points — FREEZE this on the ledger row (D-51). */
  rateBps: number;
  /** Integer centavos deducted from the host (the platform's gross take). */
  commissionCents: number;
  /** Integer centavos paid to the host: gross − commission, ALWAYS (D-52). */
  netCents: number;
};

/**
 * Compute the host-side commission split for a gross booking amount, in integer centavos.
 *
 * Single defined rounding rule (Research Pitfall 5): commissionCents = Math.round(gross*rateBps/10000).
 * netCents = gross − commissionCents ALWAYS (D-52 — the platform absorbs the gateway fee; the host nets
 * exactly gross − commission and it is never reduced further). Defaults `rateBps` to the config-tunable
 * COMMISSION_RATE_BPS (D-51 — never a literal at a call site).
 *
 * Money guard: throws on a non-integer/negative gross or a rateBps outside [0, 10000] rather than freeze
 * a nonsense payout.
 */
export function computeCommission(
  grossCents: number,
  rateBps: number = COMMISSION_RATE_BPS,
): Commission {
  if (!Number.isInteger(grossCents) || grossCents < 0)
    throw new Error("gross must be a non-negative integer number of centavos");
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000)
    throw new Error("rateBps must be an integer in [0, 10000]");

  const commissionCents = Math.round((grossCents * rateBps) / 10000); // single defined rounding (Pitfall 5)
  const netCents = grossCents - commissionCents; // D-52: platform absorbs the gateway fee — NEVER reduced further
  return { rateBps, commissionCents, netCents };
}
