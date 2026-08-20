// @vitest-environment jsdom

// TRUST-05 / D-76 / D-86 — THE RECEIPT'S ITEMISATION IS A PURE DISPLAY OF FINISHED STRINGS.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS ABOUT, AND WHAT IT DELIBERATELY IS NOT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `ReceiptLines` is handed labels. It cannot compute, so the assertions here are about SHAPE and
// ABSENCE rather than about arithmetic: the total keeps its own hook, a refund is a row of its own that
// the total never absorbs, the by-hand branch never says the automatic word, and a unit line the RSC did
// not supply is a unit line that does not exist.
//
// The arithmetic ban itself is `tests/design/price-surface.test.ts`'s AST walk, and the DB-vs-DOM money
// equality is `e2e/receipt-parity.spec.ts` (plan 13-15). Neither is restated here — a component suite
// that re-asserted them would be asserting its own fixture.
//
// ⚠ THE REFUND CASE IS THE ONE THAT MATTERS. D-76 exists because the refunded booking is the one most
// likely to need a document, and the failure it names is NETTING: a total quietly reduced by the refund
// would make the receipt disagree with the booker's card statement, which shows the charge and the
// return as two separate movements. So case (3) asserts the total is BYTE-IDENTICAL across a render with
// a refund and a render without one — the threat first, the presence of the row after.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { ReceiptLines } from "@/components/booking/receipt-lines";

afterEach(cleanup);

// ───────────────────────────────────────────────────────────────────────────────────────────────────
// FIXTURES — every one of them a FINISHED STRING, because that is the whole contract
// ───────────────────────────────────────────────────────────────────────────────────────────────────

const SPACE = "₱1,000.00";
const FEE = "₱50.00";
const TOTAL = "₱1,050.00";
const REFUND = "₱500.00";
const UNIT = "₱367.50/person × 3 passes";
const DATE = "Aug 21, 2026";

/** The whole-space, fully-itemised, probe-resolved render — the ordinary confirmed receipt. */
function baseProps() {
  return {
    spacePriceLabel: SPACE,
    serviceFeeLabel: FEE,
    totalLabel: TOTAL,
    paidWithLabel: "GCash",
    dateKind: "paid" as const,
    dateLabel: DATE,
  };
}

describe("ReceiptLines — the zero-arithmetic itemisation (TRUST-05)", () => {
  it("(1) renders every specified row label and every figure it was handed", () => {
    render(<ReceiptLines {...baseProps()} perHeadUnitLabel={UNIT} />);

    for (const term of ["Space cost", "Service fee", "Total", "Paid with", "Date paid"]) {
      expect(screen.getByText(term)).toBeTruthy();
    }
    for (const figure of [SPACE, FEE, TOTAL, UNIT, "GCash", DATE]) {
      expect(screen.getByText(figure)).toBeTruthy();
    }
  });

  it("(2) carries the receipt's own money hook exactly once, on the element whose text is the total", () => {
    const { container } = render(<ReceiptLines {...baseProps()} />);

    const hooks = container.querySelectorAll('[data-testid="receipt-total"]');
    // ONE match, and the reason is `price-breakdown.tsx:363-380`: the parity spec reads the hook,
    // normalises its text back to integer centavos and asserts equality. With two matches it would
    // silently parse whichever came first in the DOM.
    expect(hooks.length).toBe(1);
    // The hook sits on the element whose text is the money string and NOTHING else, so the spec never
    // has to peel a label off the number.
    expect(hooks[0]?.textContent).toBe(TOTAL);
  });

  it("(3) renders a refund as its OWN row, and the total is unchanged by its presence (D-76)", () => {
    const withRefund = render(
      <ReceiptLines {...baseProps()} refundLabel={REFUND} refundKind="auto" />,
    );
    const refundedTotal = withRefund.container.querySelector('[data-testid="receipt-total"]')
      ?.textContent;
    cleanup();

    const without = render(<ReceiptLines {...baseProps()} />);
    const plainTotal = without.container.querySelector('[data-testid="receipt-total"]')?.textContent;

    // THE THREAT FIRST. A netted total is the D-76 failure: the booker's statement shows two movements
    // and this document would show one.
    expect(refundedTotal).toBe(plainTotal);
    expect(refundedTotal).toBe(TOTAL);
    cleanup();

    // …and only then the guard: the refund really is on the page, as its own labelled row.
    render(<ReceiptLines {...baseProps()} refundLabel={REFUND} refundKind="auto" />);
    expect(screen.getByText("Refunded")).toBeTruthy();
    expect(screen.getByText(REFUND)).toBeTruthy();
  });

  it("(4) the by-hand branch says `Returned by hand` and no form of the automatic word (D-83)", () => {
    const { container } = render(
      <ReceiptLines {...baseProps()} refundLabel={REFUND} refundKind="manual" />,
    );

    expect(screen.getByText("Returned by hand")).toBeTruthy();
    // D-83 bans the automatic word on the manual branch outright. Matched case-INSENSITIVELY over the
    // whole rendered tree, because "Refunded", "refunded" and "REFUNDED" are the same claim to a reader.
    expect(container.textContent ?? "").not.toMatch(/refund/i);
  });

  it("(5) renders no unit row when the RSC passed none — the component never derives one (D-86)", () => {
    const { container } = render(<ReceiptLines {...baseProps()} />);

    expect(container.textContent ?? "").not.toContain("/person");
    expect(container.textContent ?? "").not.toContain("passes");
    // And the space cost is still stated, so the absence above is about the unit line and not about a
    // render that lost its itemisation.
    expect(screen.getByText(SPACE)).toBeTruthy();
  });

  it("(6) labels the fallback date `Booked` and never `Date paid` (D-85)", () => {
    const { container } = render(
      <ReceiptLines {...baseProps()} paidWithLabel={undefined} dateKind="booked" />,
    );

    // THE THREAT FIRST: a receipt that misstates a payment date is the looks-official-but-isn't failure
    // D-75 guards against.
    expect(container.textContent ?? "").not.toContain("Date paid");
    expect(screen.getByText("Booked")).toBeTruthy();
    expect(screen.getByText(DATE)).toBeTruthy();
    // No rail was learned, so no rail is named. An omitted line claims nothing.
    expect(container.textContent ?? "").not.toContain("Paid with");
  });

  it("(7) states the frozen total alone when the row carries no parts (pre-0016)", () => {
    const { container } = render(
      <ReceiptLines
        {...baseProps()}
        spacePriceLabel={null}
        serviceFeeLabel={null}
      />,
    );

    // Never a manufactured part. A row whose two columns do not sum to the frozen quote gets the quote,
    // which is always true — the `page.tsx` positive-match rule, from the other side.
    expect(container.textContent ?? "").not.toContain("Space cost");
    expect(container.textContent ?? "").not.toContain("Service fee");
    expect(screen.getByText(TOTAL)).toBeTruthy();
  });

  it("(8) renders no attendee-shaped content in either group shape (D-77)", () => {
    const { container } = render(<ReceiptLines {...baseProps()} perHeadUnitLabel={UNIT} />);

    // The component has no prop that could carry a name — this is the render-level restatement of the
    // grep, so a prop added later that DID carry one fails here rather than only in review.
    expect(container.textContent ?? "").not.toMatch(/attendee|guest list|roster/i);
  });
});
