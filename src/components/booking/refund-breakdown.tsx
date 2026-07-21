// RefundBreakdown (BOOK-07 · PAY-06 · D-78) — the six-element itemised refund disclosure that satisfies
// ROADMAP SC#2's "see the exact refund amount before confirming".
//
// THE ZERO-ARITHMETIC CONTRACT, inverted in direction from PriceBreakdown but identical in substance: every
// figure arrives as a PRE-FORMATTED, server-computed string. This component does not add, subtract, round,
// percentage, compare or format a single number. The reason is the same one price-breakdown.tsx documents —
// a component that computed any part of the total could disagree with what the server actually refunds the
// moment either side changed shape, and the number the booker reads MUST be the number the server writes.
// If you find yourself wanting a `number` prop here, the arithmetic belongs in the RSC.
//
// Semantics: a `<dl>` with associated `<dt>`/`<dd>` pairs, so the itemisation survives linearisation for
// assistive tech (07-UI-SPEC § Accessibility). A screen reader hears "Space price refund (50%), ₱500" as a
// pair rather than two orphaned strings, which is the whole point of itemising a money breakdown.
//
// Pure display, no hooks → a Server Component (no "use client").

import { Separator } from "@/components/ui/separator";

export type RefundBreakdownProps = {
  /** All-in amount charged (booking.quotedTotalCents), e.g. "₱1,050". */
  paidLabel: string;
  /** The frozen space price, e.g. "₱1,000". */
  spacePriceLabel: string;
  /** The frozen, non-refundable service fee, e.g. "₱50". */
  serviceFeeLabel: string;
  /** The refunded portion of the space price, e.g. "₱500". */
  spaceRefundLabel: string;
  /** The rung awarded, already rendered as a percentage, e.g. "50%". */
  spaceRefundPercentLabel: string;
  /** Always "₱0" — the service fee is never refunded (D-74). A prop, not a literal, so currency follows. */
  serviceFeeRefundLabel: string;
  /** What actually goes back to the booker, e.g. "₱500". The focal number on the page. */
  totalRefundLabel: string;
};

export function RefundBreakdown({
  paidLabel,
  spacePriceLabel,
  serviceFeeLabel,
  spaceRefundLabel,
  spaceRefundPercentLabel,
  serviceFeeRefundLabel,
  totalRefundLabel,
}: RefundBreakdownProps) {
  return (
    <dl className="space-y-3">
      {/* ── What was paid, and how it split (D-78 elements 1–3). ─────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <dt className="font-medium">You paid</dt>
          <dd className="font-medium tabular-nums">{paidLabel}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 pl-4 text-sm">
          <dt className="text-muted-foreground">Space price</dt>
          <dd className="tabular-nums text-muted-foreground">{spacePriceLabel}</dd>
        </div>
        {/* C1 (D-73): labelled EXACTLY `Service fee`. It is platform revenue, not a government levy, and
            never belongs under a tax-sounding bundle — see the header of price-breakdown.tsx for the full
            rationale and for why the forbidden bundle is not spelled out in this codebase. */}
        <div className="flex items-baseline justify-between gap-4 pl-4 text-sm">
          <dt className="text-muted-foreground">Service fee</dt>
          <dd className="tabular-nums text-muted-foreground">{serviceFeeLabel}</dd>
        </div>
      </div>

      {/* ── What comes back, line by line (D-78 elements 4–5). ───────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <dt>Space price refund ({spaceRefundPercentLabel})</dt>
          <dd className="tabular-nums">{spaceRefundLabel}</dd>
        </div>

        {/*
          THE UNCONDITIONAL DISCLOSURE (C2). `Service fees aren't refunded` renders beneath the ₱0 line
          ALWAYS — including on a 100% refund, where the booker is most likely to expect the whole charge
          back and is therefore most likely to be surprised. The one place a booker could be surprised is
          the one place the disclosure may not be conditional, so there is deliberately no `{cond && ...}`
          wrapper here and none should be added.

          It renders at Label 400 muted: legible, not de-emphasised into invisibility. Never struck through,
          never hidden. The numerals may carry --destructive because they are PAIRED with this explicit
          label — that is the one permitted use of the token on this page, and it is never colour-only.

          When the rung is 0% this whole block still renders IN FULL with ₱0 figures. Never replace it with
          a bare "no refund" message: SC#2 requires the exact amount AND its derivation to be visible, and
          "why you are getting nothing" is exactly when the derivation matters most.
        */}
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <dt>Service fee refund</dt>
          <dd className="tabular-nums text-destructive">{serviceFeeRefundLabel}</dd>
        </div>
        <p className="pl-4 text-xs text-muted-foreground">Service fees aren&apos;t refunded</p>
      </div>

      <Separator />

      {/* ── The focal point (D-78 element 6). The ONE Display-scale (28px/600) number on the page. ───── */}
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm font-semibold">Refund to you</dt>
        <dd className="text-2xl font-semibold tabular-nums sm:text-[28px]">{totalRefundLabel}</dd>
      </div>
    </dl>
  );
}
