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
  /** Server-frozen SPACE price (booking.spacePriceCents) — the run line's value. */
  spacePriceCents: number;
  /** Server-frozen NON-REFUNDABLE service fee (booking.serviceFeeCents, D-74). 0 omits the row entirely. */
  serviceFeeCents: number;
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
  serviceFeeCents,
  currency = DISPLAY_CURRENCY,
  fullDay,
  hours,
  hourlyRateCents,
  dayRateCents,
}: PriceBreakdownProps) {
  // Line label is `{₱rate}/hr × {N} hours` or `{₱rate}/day × 1 day` — formatting only, no multiplication.
  const runLabel = fullDay
    ? `${formatMoney(dayRateCents ?? 0, currency)}/day × 1 day`
    : `${formatMoney(hourlyRateCents ?? 0, currency)}/hr × ${hours} ${hours === 1 ? "hour" : "hours"}`;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {/* The run line — rate × qty on the left, the frozen SPACE price on the right (not the all-in
            total: the fee gets its own disclosed line below, and the two must sum to the Total). */}
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{runLabel}</span>
          <span className="tabular-nums">{formatMoney(spacePriceCents, currency)}</span>
        </div>

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
