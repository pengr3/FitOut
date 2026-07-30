// PriceBreakdown (BOOK-01 · D-45/D-46/D-74) — formalizes the display-only RailSelectionSummary estimate
// (availability-calendar.tsx:233-268) into the committed, SERVER-FROZEN breakdown on the reserve page.
//
// D-74 SUPERSEDES the booker-facing half of D-50. A booker-facing, NON-REFUNDABLE "Service fee" line
// (SERVICE_FEE_BPS, 5% of the space price) now EXISTS and is disclosed here, in the slot this component
// originally reserved. The HOST-side half of D-50 is UNCHANGED: commission is still a 10% host-side
// deduction and the host still receives space price − 10%.
// Do NOT remove the fee line as a "regression" — the prior instruction was correct under D-50 and is
// no longer the policy. The fee funds the ~2.5% gateway cost PayMongo does not return on a refund.
// The component still performs ZERO arithmetic: every figure arrives as a server-computed prop.
//
// The three money props are the booking row's THREE FROZEN VALUES (07-RESEARCH Finding 2), never derived
// from one another here: `spacePriceCents` is the listing-priced portion (and the host payout basis),
// `serviceFeeCents` is platform revenue, and `quotedTotalCents` is the all-in amount actually charged.
// A component that computed `total = space + fee` itself could disagree with what PayMongo charges the
// moment any of the three changed shape — and the displayed total the booker agrees to MUST equal the
// charge (CLAUDE.md "never trust the client for price/time"; the trust failure here is on the core value).
//
// C1 (D-73) — the line is labelled EXACTLY `Service fee`, and NEVER bundled under a tax-sounding label
// ("Taxes" + "and fees", written in two pieces here on purpose — see the tripwire note below). It is
// platform revenue, not a government levy: labelling it as one is inaccurate to customers and is the
// precise pattern junk-fee rules (US FTC, EU/UK) and PH DTI price-display requirements target. The user's
// first framing WAS that bundled label; it was changed deliberately after pushback, and a future copy pass
// must not re-bundle it.
//
// ⚠️ GREP TRIPWIRE (the 07-04 payout-sweep idiom). Two whole-source greps guard this file's copy: one for
// the tax-sounding bundle above, one for the C7-forbidden reassurances (see the Copywriting Contract, rule
// C7 in 07-UI-SPEC.md, for the three exact phrases). A grep is only a real guard if it cannot be tripped by
// the very comment forbidding the string — so NONE of those phrases is spelled contiguously anywhere in
// this file. If you are tempted to write one out "just in a comment", don't: it disarms the check for good.
//
// Pure display, no hooks → a Server Component (no "use client").

import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { Separator } from "@/components/ui/separator";

type PriceBreakdownProps = {
  /**
   * Server-frozen ALL-IN total (booking.quotedTotalCents, D-49) — the exact figure Phase 5 charges. Under
   * D-74 this is `spacePriceCents + serviceFeeCents`; it is passed in, never summed here.
   */
  quotedTotalCents: number;
  /** Server-frozen SPACE price (booking.spacePriceCents) — the run line's value by default. */
  spacePriceCents: number;
  /**
   * The RUN LINE's value, when it is not the whole space price. Defaults to `spacePriceCents`, so every
   * flat listing is unchanged. When a D-108 surcharge is disclosed on its own line below, the server passes
   * the BASE here (space price − surcharge) — because the surcharge is folded INTO `spacePriceCents` (A1),
   * and showing the full space price on the run line as well would disclose the same centavos twice.
   * Computed server-side and passed in for the same reason every other figure here is: this component
   * subtracts nothing, just as it sums nothing.
   */
  runPriceCents?: number;
  /** Server-frozen NON-REFUNDABLE service fee (booking.serviceFeeCents, D-74). 0 omits the row entirely. */
  serviceFeeCents: number;
  /**
   * D-108 extra-guest surcharge, as THREE server-computed figures (`paxSurcharge`, pricing.ts) — never one
   * that this component multiplies out. `extraHeads` and `extraHeadCents` label the line; `extraSurchargeCents`
   * IS the line's value and also its render gate. All default to 0, so every existing call site (and every
   * flat listing) renders byte-for-byte what it does today: no line at all.
   *
   * The surcharge is ALREADY INSIDE `spacePriceCents` (A1 — it is host revenue and the payout basis), so this
   * line is a DISCLOSURE of part of the run total, not an addend. Do not add it to anything here.
   */
  extraHeads?: number;
  extraHeadCents?: number;
  extraSurchargeCents?: number;
  /**
   * Phase-9 drop-in pricing (OC-08). Both server-computed; when `passes` is non-null the run line reads
   * per person instead of per hour or per day. Absent on every exclusive booking, so the shipped
   * breakdown is unchanged for them.
   *
   * Deliberately OPTIONAL PROPS rather than a discriminated run-line union (09-UI-SPEC Open Q10, the
   * planner's explicit call): this is a UAT-passed money surface, and optional props leave every existing
   * call site byte-identical instead of forcing a census over one. Same device as the D-108 trio above.
   */
  perHeadPriceCents?: number | null;
  passes?: number | null;
  /** Frozen display currency (booking.currency); defaults to the shared PHP source (D-46). */
  currency?: string;
  /** Full-day selection → the flat day-rate line; else the hourly run (D-45, distinct — no cap). */
  fullDay: boolean;
  /** Whole-hour count, re-derived SERVER-SIDE from the window (passed in — never computed here). */
  hours: number;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
};

export function PriceBreakdown({
  quotedTotalCents,
  spacePriceCents,
  runPriceCents,
  serviceFeeCents,
  extraHeads = 0,
  extraHeadCents = 0,
  extraSurchargeCents = 0,
  perHeadPriceCents,
  passes,
  currency = DISPLAY_CURRENCY,
  fullDay,
  hours,
  hourlyRateCents,
  dayRateCents,
}: PriceBreakdownProps) {
  // Line label is `{₱rate}/hr × {N} hours` or `{₱rate}/day × 1 day` — formatting only, no multiplication.
  //
  // OC-08 adds a THIRD form for a drop-in day pass, resolved FIRST for the same reason composeWhenLabel
  // resolves its open branch first: a pass is priced per head with NO duration term at all (OC-02), so
  // neither `fullDay` nor `hours` says anything true about one. Still formatting only — the run VALUE
  // below is the server-frozen prop, and nothing here multiplies a rate by a count. A product computed in
  // the browser could disagree with what PayMongo charges, which is the trust failure the header forbids.
  const runLabel =
    passes != null
      ? `${formatMoney(perHeadPriceCents ?? 0, currency)}/person × ${passes} ${passes === 1 ? "pass" : "passes"}`
      : fullDay
        ? `${formatMoney(dayRateCents ?? 0, currency)}/day × 1 day`
        : `${formatMoney(hourlyRateCents ?? 0, currency)}/hr × ${hours} ${hours === 1 ? "hour" : "hours"}`;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {/* The run line — rate × qty on the left, the frozen SPACE price on the right (not the all-in
            total: the fee gets its own disclosed line below, and the two must sum to the Total). */}
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{runLabel}</span>
          <span className="tabular-nums">
            {formatMoney(runPriceCents ?? spacePriceCents, currency)}
          </span>
        </div>

        {/*
          D-108 EXTRA GUESTS (08-UI-SPEC § 5) — ONE conditional line, between the run line and the service
          fee, cloning the service-fee row's shape exactly. Rendered ONLY when the server says a surcharge
          was actually applied, so a flat listing (extraHeadFee = 0, the overwhelming majority) renders this
          file byte-for-byte as it did before Phase 8: no line, no layout shift, no ₱0 row.

          Both label figures AND the value are server-computed props (`paxSurcharge`, pricing.ts — the same
          function that folded the surcharge into the frozen price). Nothing here multiplies heads by fee: a
          product computed in the browser could disagree with the amount PayMongo charges, which is the exact
          trust failure the header contract forbids.
        */}
        {extraSurchargeCents > 0 && (
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">
              Extra guests ({extraHeads} × {formatMoney(extraHeadCents, currency)})
            </span>
            <span className="tabular-nums">{formatMoney(extraSurchargeCents, currency)}</span>
          </div>
        )}

        {/*
          THE FORMERLY-RESERVED SLOT (D-46), now FILLED by the D-74 booker-facing service fee. It was held
          open as a zero-layout-shift seam for exactly this line and is no longer empty.

          What still must NEVER appear on this surface: the HOST-side 10% commission (D-50's unchanged
          half). That is a deduction from the host's payout, not a charge to the booker, and it lives only
          on /host/earnings — where it is labelled `FitOut commission (10%)` precisely so a user who is
          both booker and host (AUTH-04) can tell the two apart (C8).

          Omitted entirely at 0 rather than rendered as ₱0: a legacy pre-D-74 booking genuinely had no fee,
          and showing a zero line would imply one was assessed.
        */}
        {serviceFeeCents > 0 && (
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Service fee</span>
            <span className="tabular-nums">{formatMoney(serviceFeeCents, currency)}</span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold">Total</span>
        {/* Total value = Heading weight (600), tabular-nums so digits align (never a client recompute). */}
        <span className="text-xl font-semibold tabular-nums">{formatMoney(quotedTotalCents, currency)}</span>
      </div>

      {/* C7: once D-74 ships, no booker surface may reassure that nothing was added or that this figure is
          conclusive. The string previously here did both, and became FALSE the moment the fee existed. The
          forbidden phrases are deliberately not written out — see the GREP TRIPWIRE note in the header. */}
      <p className="text-xs text-muted-foreground">Includes our service fee. You&apos;ll pay this now.</p>
    </div>
  );
}
