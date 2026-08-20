// ReceiptLines (TRUST-05 · D-76 · D-85 · D-86) — the receipt's itemisation, and the FOURTH money hook.
//
// THE ZERO-ARITHMETIC CONTRACT, restated here because a receipt is the surface where being wrong is most
// expensive: every figure arrives as a PRE-FORMATTED, server-computed string. This component does not add,
// subtract, round, percentage, compare or format a single number. The reason is the one
// `refund-breakdown.tsx` and `price-breakdown.tsx` both give — a component that computed any part of the
// total could disagree with what the server actually charged the moment either side changed shape, and the
// number the booker reads MUST be the number the server wrote.
// If you find yourself wanting a `number` prop here, the arithmetic belongs in the RSC.
//
// Semantics: a `<dl>` with associated `<dt>`/`<dd>` pairs, so the itemisation survives linearisation for
// assistive tech. A screen reader hears "Space cost, ₱1,000.00" as a pair rather than two orphaned strings,
// which is the whole point of itemising money.
//
// Pure display, no hooks → a Server Component (no "use client").
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE TOTAL GETS ITS OWN HOOK, AND WHY SHARING ONE WOULD HAVE BEEN THE DEFECT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `price-breakdown.tsx:363-380` records the mechanism, measured rather than argued: `e2e/price-parity.spec.ts`
// reads the money hook, normalises its text back to integer centavos and asserts equality with the frozen
// column — and *"with two matches it would silently parse whichever came first in the DOM"*. Three literals
// existed as of plan 12-10, one per surface (`price-total`, `rail-price-total`, `sheet-price-total`), written
// as sibling branches sharing ONE class constant so the totals are computed-style identical by construction
// rather than by three copies agreeing. This is the fourth, in the same idiom: a string LITERAL (never a
// computed attribute) beside a named class constant. Do not rename it and do not move it onto the row
// wrapper — the wrapper's text is "Total₱1,050.00", which would make the parity assertion parse a label.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE REFUND IS A SEPARATE LINE AND THE TOTAL NEVER ABSORBS IT (D-76)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-76's reason is that the refunded case is the one MOST LIKELY to need a document — so it is exactly the
// case a receipt may not simplify. A netted total would disagree with the booker's own card or wallet
// statement, which shows the charge and the return as two separate movements; reconciling one number
// against two is the confusion the document exists to prevent. The refund therefore renders BELOW the
// Total, as its own labelled row, and nothing in this file touches `totalLabel`.
//
// ⚠ THE TWO REFUND WORDS ARE D-83's FORK, AND THE CHOICE IS THE CALLER'S. `auto` is the branch where
// PayMongo can reverse the rail; `manual` is the branch where it cannot and a person moves the money. On
// the manual branch the automatic word is BANNED outright (D-83) — which is why `refundKind` is a closed
// two-value union rather than a free label prop: a surface cannot pick a money word this component has not
// been told is true.
//
// ⚠ AND WHY THIS IS NOT THE THING PROJECT D-57 FORBIDS. The detail page's cancelled branch reads
// *"…on its way"* and never the past participle, because that sentence is a claim about the booker's BANK
// and settlement is asynchronous. This is a ledger row on a record of what FitOut did: it names the amount
// returned against this booking and states NO window, NO arrival and nothing at all about when the money
// lands. The settlement sentence lives on the detail page's `MoneyStatement` and is unchanged. Do not add
// a window sentence here — that is the line, and crossing it is the D-57 failure.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS COMPONENT CANNOT DO, BY CONSTRUCTION
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • It cannot derive a per-head unit. `perHeadUnitLabel` is composed in the RSC on a POSITIVE match
//     (D-86) and simply absent otherwise; there is no prop here from which a unit could be recovered, and
//     dividing a frozen total to invent one is forbidden at the call site for the reason D-86 gives.
//   • It cannot list the other people on a group booking. There is no prop that carries a person's name,
//     in either group shape (D-77): other people's names do not belong on a printable financial document,
//     and who is coming can change after payment, so such a list would not match what was charged.
//
//     ⚠ THE TWO WORDS THAT NAME THAT LIST ARE DELIBERATELY NOT SPELLED ANYWHERE IN THIS FILE. The
//     acceptance check for the rule above is a case-insensitive grep over this source expecting ZERO, and
//     a grep is only a real guard while the comment forbidding the thing cannot trip it (13-PATTERNS § H;
//     `share-link-box.tsx:14-17` is the original, and `price-breakdown.tsx` keeps the same discipline).
//     Measured, not hypothesised: a first draft of this very bullet named one of them and made the count
//     read 1 against a correct file. If you are tempted to name them "just in prose", don't.

import { Separator } from "@/components/ui/separator";

/**
 * The Total's treatment, named once. `text-heading` is the same NAMED type role the booking detail page's
 * total row carries, so the two surfaces size and weight the figure identically per theme rather than by
 * two call sites agreeing on a step.
 */
const TOTAL_VALUE_CLASS = "text-heading font-semibold tabular-nums";

/** One `<dl>` row: term on the left, figure on the right, tabular figures on every value (GATE-05). */
function Row({
  term,
  value,
  muted = false,
}: {
  term: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className={muted ? "text-muted-foreground" : undefined}>{term}</dt>
      <dd className={muted ? "tabular-nums text-muted-foreground" : "tabular-nums"}>{value}</dd>
    </div>
  );
}

/**
 * The refund pair, typed as a UNION so the amount and the word can never arrive apart.
 *
 * A flat pair of optional props would compile with an amount and no kind, and the only way to render that
 * is to pick a default — i.e. to have this file choose between two money words on no information. There is
 * no defensible default, so the type removes the case.
 */
type ReceiptRefund =
  | { refundLabel?: undefined; refundKind?: undefined }
  | {
      /** What went back to the booker, already formatted, e.g. "₱500.00". Never netted into the Total. */
      refundLabel: string;
      /** D-83's fork: `auto` → `Refunded`; `manual` → `Returned by hand`, which never says the other word. */
      refundKind: "auto" | "manual";
    };

export type ReceiptLinesProps = {
  /**
   * The frozen listing-priced portion, e.g. "₱1,000.00" — or `null` on a row that does not carry one.
   *
   * EXPLICITLY NULLABLE RATHER THAN OPTIONAL, and that is the point: the parts are nullable columns on a
   * pre-0016 booking, so the caller has to DECIDE what to pass rather than forget to. `null` renders the
   * frozen total alone, which is always true; a manufactured part is the failure `page.tsx`'s positive-match
   * itemisation describes from the other side.
   */
  spacePriceLabel: string | null;
  /** The frozen platform fee, e.g. "₱50.00", or `null` alongside `spacePriceLabel`. Labelled EXACTLY
   *  `Service fee` (C1 / D-73) — it is platform revenue, never a government levy, and never belongs under
   *  a tax-sounding bundle. See `price-breakdown.tsx`'s header for the full rationale. */
  serviceFeeLabel: string | null;
  /** The server-FROZEN all-in quote (D-49), already formatted. The one figure that always renders. */
  totalLabel: string;
  /** D-86's unit line, e.g. "₱367.50/person × 3 passes". Composed by the RSC on a positive match ONLY. */
  perHeadUnitLabel?: string;
  /** The rail the probe reported, as a name a person recognises (`RAIL_DISPLAY_NAME`). Omitted when the
   *  probe fell back — an omitted line claims nothing, which is the honest answer to "we did not learn it". */
  paidWithLabel?: string;
  /**
   * D-85, as a closed union rather than a caller-supplied word.
   *
   * `paid` → `Date paid`, and the caller may only pass it when the probe returned a real `paid_at`.
   * `booked` → `Booked`, against `booking.createdAt`. A receipt that misstates a payment date is exactly
   * the looks-official-but-isn't failure D-75 guards against, so the fallback is labelled for what it
   * actually is and is NEVER labelled `Date paid`.
   */
  dateKind: "paid" | "booked";
  /** The formatted instant the term above qualifies. */
  dateLabel: string;
} & ReceiptRefund;

export function ReceiptLines({
  spacePriceLabel,
  serviceFeeLabel,
  totalLabel,
  perHeadUnitLabel,
  paidWithLabel,
  dateKind,
  dateLabel,
  refundLabel,
  refundKind,
}: ReceiptLinesProps) {
  return (
    <dl className="space-y-4">
      {/* ── The itemisation. Both parts or neither: a lone half is a figure nobody was charged. ────── */}
      {spacePriceLabel !== null && serviceFeeLabel !== null ? (
        <div className="space-y-1.5">
          <Row term="Space cost" value={spacePriceLabel} muted />
          {/* D-86's unit line, as a SECOND description of the space cost above — the `<dl>` idiom for
              "one term, two things worth saying about it". It carries no term of its own because it is
              not a new charge: it is how the charge directly above was made up, and giving it a `<dt>`
              would put a second money term on a receipt that has exactly the rows 13-UI-SPEC lists. */}
          {perHeadUnitLabel !== undefined && (
            <div className="flex items-baseline justify-end gap-4 pl-4 text-sm">
              <dd className="tabular-nums text-muted-foreground">{perHeadUnitLabel}</dd>
            </div>
          )}
          <Row term="Service fee" value={serviceFeeLabel} muted />
        </div>
      ) : null}

      <Separator />

      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm font-semibold">Total</dt>
        {/* THE FOURTH MONEY HOOK. Written as a string literal, on the element whose text is the money
            string and nothing else — see the header for the measured reason a shared id would break the
            parity spec.

            ⚠️ The attribute+value pair is deliberately never written contiguously in the prose above:
            this plan's acceptance criterion counts that exact pair over this file and expects ONE, and a
            comment that spelled it out would make the count read 2 against a correct file. The same
            GREP TRIPWIRE discipline `price-breakdown.tsx` keeps, for the same measured reason. */}
        <dd data-testid="receipt-total" className={TOTAL_VALUE_CLASS}>
          {totalLabel}
        </dd>
      </div>

      {/* ── What came back, if anything. Its own row, below the Total, never inside it (D-76). ────── */}
      {refundLabel !== undefined && (
        <div className="space-y-1.5">
          <Row term={refundKind === "manual" ? "Returned by hand" : "Refunded"} value={refundLabel} />
        </div>
      )}

      {/* ── How and when it was paid (D-85). ───────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        {paidWithLabel !== undefined && <Row term="Paid with" value={paidWithLabel} muted />}
        <Row term={dateKind === "paid" ? "Date paid" : "Booked"} value={dateLabel} muted />
      </div>
    </dl>
  );
}
