// PriceBreakdown (BOOK-01 · D-45/D-46) — formalizes the display-only RailSelectionSummary estimate
// (availability-calendar.tsx:233-268) into the committed, SERVER-FROZEN breakdown on the reserve page.
// It renders the frozen quote (booking.quotedTotalCents + currency, D-49) as a FEE-EXTENSIBLE line-item
// list — NEVER a client recompute (CLAUDE.md "never trust the client for price/time"): the subtotal/Total
// are the exact frozen cents and `hours` is server-derived and passed in, so this component does ZERO
// price arithmetic. Phase 5 inserts `Service fee` / `FitOut commission` rows in the RESERVED slot below
// (above the Total divider) with zero layout shift — the list structure exists precisely for that seam (D-46).
//
// Pure display, no hooks → a Server Component (no "use client").

import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { Separator } from "@/components/ui/separator";

type PriceBreakdownProps = {
  /** Server-frozen total (booking.quotedTotalCents, D-49) — the ONLY figure Phase 5 charges against. */
  quotedTotalCents: number;
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
        {/* The run line — rate × qty on the left, the frozen subtotal (== Total in Phase 4) on the right. */}
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{runLabel}</span>
          <span className="tabular-nums">{formatMoney(quotedTotalCents, currency)}</span>
        </div>

        {/*
          RESERVED FEE SLOT (Phase 5, D-46) — renders NOTHING in Phase 4. `Service fee` / `FitOut commission`
          rows slot in HERE, above the Total divider, so the existing run line + Total never restructure or
          shift. Keep this seam; do NOT add a fee line in Phase 4 (the breakdown is subtotal-only).
        */}
      </div>

      <Separator />

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold">Total</span>
        {/* Total value = Heading weight (600), tabular-nums so digits align (never a client recompute). */}
        <span className="text-xl font-semibold tabular-nums">{formatMoney(quotedTotalCents, currency)}</span>
      </div>

      <p className="text-xs text-muted-foreground">Final price. No booking or service fees in this step.</p>
    </div>
  );
}
