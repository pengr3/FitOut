// @vitest-environment jsdom

// 13-CONTEXT D-99 — THE PAID STATEMENT, AS A COPY CONTRACT AND AS A TRUTHFULNESS CONTRACT.
//
// THE PAGE-LEVEL HALF LIVES ELSEWHERE. `tests/booking/detail-completeness.test.tsx` owns WHICH
// statuses mount this component — one on `confirmed` and on the derived `completed`, zero on the other
// eight — because that is a property of the page's branching and a component suite is handed the
// branch rather than choosing it. This file owns the half a rendered component can answer: what the
// two phases SAY, and what the `settled` phase must never say.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE COPY IS RETYPED HERE ON PURPOSE
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// The component keeps its clause as a private constant. Importing it would compare the component to
// itself and pass through any rewording — and the hold clause in particular is a claim about where a
// booker's money is, carried over from the panel D-98 deleted, so a silent rewording is exactly the
// failure worth catching. It is typed out below, character for character.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { PaidStatement } from "@/components/booking/paid-statement";

afterEach(cleanup);

const AMOUNT = "₱1,050.00";

/**
 * The hold-until-session payout model, stated to a booker.
 *
 * It is the ONE sentence worth keeping out of the four-row trust panel D-98 removed: it is a fact
 * about FitOut's own behaviour rather than a credential awarded to a host, and it is the answer to
 * *where is my money*. Retyped from 13-CONTEXT D-65, which is where the PM chose this framing.
 */
const HOLD_CLAUSE = "FitOut holds your payment until after your session.";

function statement(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-testid="paid-statement"]');
  expect(el, "the paid statement did not render at all").not.toBeNull();
  return el!;
}

const text = (container: HTMLElement) =>
  (statement(container).textContent ?? "").replace(/\s+/g, " ").trim();

describe("PaidStatement — it says the booking is PAID, and names the figure (D-99)", () => {
  it("(1) states the paid fact in words on both phases, with the amount attached", () => {
    for (const phase of ["held", "settled"] as const) {
      const { container } = render(<PaidStatement amountPaid={AMOUNT} phase={phase} />);

      // THE FACT AND THE FIGURE TOGETHER. Either alone is the defect the PM found: a status word with
      // no figure does not tell a booker what was paid, and a figure with no fact — the facts panel's
      // row labelled `Total` — reads at least as easily as an amount still due.
      expect(text(container), `${phase}: the paid fact is not stated in words`).toContain(
        "Paid in full",
      );
      expect(text(container), `${phase}: the figure is missing`).toContain(AMOUNT);
      cleanup();
    }
  });

  it("(2) `held` carries the hold-until-session clause — D-98's one surviving sentence", () => {
    const { container } = render(<PaidStatement amountPaid={AMOUNT} phase="held" />);

    expect(
      text(container),
      "the hold clause is the reason this sentence earns its place as a PAYMENT statement rather " +
        "than a status echo: it is literally the payout model, and it is the answer to 'where is my " +
        "money'. It is the only row of the deleted trust panel that carried information.",
    ).toContain(HOLD_CLAUSE);
  });

  it("(3) `settled` NEVER claims the payment is still being held", () => {
    const { container } = render(<PaidStatement amountPaid={AMOUNT} phase="settled" />);

    // ⚠ THE TRUTHFULNESS CATCH. The payout sweep runs at `endsAt + PAYOUT_DELAY_HOURS`, so once the
    // session has happened the hold has arrived at its end or already released. One unconditional
    // sentence would therefore be true on Monday and a lie on Wednesday, on the same booking, on the
    // page whose entire job is that a booker can trust what it says about their money.
    expect(
      text(container),
      "a finished session is told its payment is being held until after a session that already " +
        "happened",
    ).not.toContain(HOLD_CLAUSE);
    // Narrowed to the clause's own hinge as well, so a rewording that kept the promise and lost the
    // exact wording still fails.
    expect(text(container)).not.toContain("until after your session");
    expect(text(container)).not.toContain("holds your payment");
  });

  it("(4) the settled phase drops the clause rather than replacing it with a second claim", () => {
    const { container } = render(<PaidStatement amountPaid={AMOUNT} phase="settled" />);

    // The honest replacement would have to say where the money is NOW — paid out to the host, or in
    // the payout window — and this page has read neither `host_payout_ledger` nor the sweep. D-96's
    // rule, one correction later: state what is verified, and say nothing where nothing was read.
    expect(text(container)).toBe(`Paid in full — ${AMOUNT}.`);
  });

  it("(5) renders exactly one hook, and it is a paragraph rather than a panel", () => {
    const { container } = render(<PaidStatement amountPaid={AMOUNT} phase="held" />);

    // A second element carrying this id would make the page-level per-status COUNT assert about
    // whichever came first — the shape `trust-block`'s own contract row recorded before it was deleted.
    expect(container.querySelectorAll('[data-testid="paid-statement"]')).toHaveLength(1);
    // Not a `PanelCard`: a fourth box between the heading and the facts card is exactly what D-100 is
    // removing from this surface, and this sentence must be read in the same breath as the status.
    expect(statement(container).tagName).toBe("P");
    expect(container.querySelectorAll('[data-testid="panel-card"]')).toHaveLength(0);
  });

  it("(6) carries no verdict colour and no alarm token", () => {
    for (const phase of ["held", "settled"] as const) {
      const { container } = render(<PaidStatement amountPaid={AMOUNT} phase={phase} />);
      const classes = (statement(container).getAttribute("class") ?? "").split(/\s+/);

      // `--destructive` renders NOWHERE in this phase (13-UI-SPEC § Color), and a paid statement is a
      // calm fact rather than an outcome to celebrate or warn about — `--success` is reserved for the
      // confirmation moment's mark, which is the product's one use of it.
      for (const banned of [
        "text-destructive",
        "bg-destructive",
        "border-destructive",
        "text-success",
        "bg-success",
        "text-attention",
      ]) {
        expect(classes, `${phase}: ${banned} rides the paid statement`).not.toContain(banned);
      }
      cleanup();
    }
  });
});
