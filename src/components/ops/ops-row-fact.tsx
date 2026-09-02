// THE REVIEW-QUEUE ROW'S `<dl>` VOCABULARY — one `<dt>`/`<dd>` pair, and the three class constants
// every value on the row computes from.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS ITS OWN MODULE AND NOT STILL A PRIVATE HELPER IN `ops-queue-row.tsx`
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// It was, until plan 18.1-13. D-271 puts the contact reveal on BOTH row kinds, and the reveal is a
// state machine: ONE fact (`Contact`, holding the control) before a reveal, TWO facts (`Email` and
// `Phone`) after one. A component cannot replace the `<dt>`/`<dd>` pair it is rendered INSIDE, so the
// island has to author the pairs itself — and the moment two files author facts on the same row, the
// class strings need an owner that is neither of them.
//
// THE ALTERNATIVE WAS A CYCLE, AND IT IS WORTH SAYING SO. `ops-queue-row.tsx` imports the island, so
// exporting `Fact` from the row and importing it back into the island is an import cycle between two
// client modules — one whose only symptom would be a temporal-dead-zone error at module evaluation
// the day somebody moved a `const` read from a render body to a module body. A third module that
// neither imports is the same fix `row-card.tsx` is, one level down.
//
// ⚠ NOTHING HERE IS NEW. The three constants and the `Fact` function are moved VERBATIM from
// `ops-queue-row.tsx:91-97, 210-226`, docblocks included, so this commit changes no rendered class on
// any row. `ROW_LEAD_CLASS` deliberately did NOT move: it is the wait figure's class and the wait
// figure is `RowCard`'s `status` slot, not a fact in the `<dl>`.

import * as React from "react";

/**
 * The description list's VALUE class — ONE constant, so no value on this row can drift into a
 * different size or weight from its neighbours.
 *
 * THE WAIT FIGURE IS THE LOUDEST THING ON THE ROW AND NOTHING ELSE IS PROMOTED. The listing title, the
 * host name, the address, the capacity and the price all compute an IDENTICAL size and weight through
 * this one string, so the equality is a fact about one constant rather than an accident of five
 * similar ones — `request-row.tsx:ROW_VALUE_CLASS`'s reason, on a row with five values instead of two.
 *
 * ⚠ AND SINCE PLAN 18.1-13 THAT EQUALITY SPANS TWO FILES. The contact reveal's `Email` and `Phone`
 * values read this same constant, which is the whole reason it lives here rather than beside the six
 * facts that were once its only readers.
 */
export const ROW_VALUE_CLASS = "text-label";

/** A money value — the same role as every other value, plus the figure treatment. Derived, never retyped. */
export const ROW_MONEY_CLASS = `${ROW_VALUE_CLASS} tabular-nums`;

/** The muted term class every `<dt>` carries. */
export const ROW_TERM_CLASS = "text-label text-muted-foreground";

/** One `<dt>`/`<dd>` pair, on the shipped idiom — label left, value right, linearising on a narrow row. */
export function Fact({
  term,
  children,
  valueClass = ROW_VALUE_CLASS,
}: {
  term: string;
  children: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={ROW_TERM_CLASS}>{term}</dt>
      <dd className={valueClass}>{children}</dd>
    </div>
  );
}
