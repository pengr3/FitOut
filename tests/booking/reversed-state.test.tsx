// @vitest-environment jsdom

// D-69 / D-82 / D-83 — THE REVERSED STATE'S TWO MONEY TRUTHS, RENDERED.
//
// WHY THIS FILE EXISTS BESIDE THE SOURCE SCAN. `tests/design/reversed-copy.test.ts` is a grep: it can
// prove a banned sentence is absent from the file and that the required pieces are imported, and it can
// prove neither of the two things that actually matter to a booker —
//
//   (a) that the branch a caller asked for is the branch that RENDERS. A component that ignored its
//       `branch` prop and always showed the automatic copy would satisfy every ban in that file
//       perfectly: the automatic sentences are permitted, the marked region would still be clean
//       because nothing in it ever reaches the DOM, and the whole gate would be green over a surface
//       telling every manual-rail booker their money had been sent back.
//   (b) that the window sentence MATCHES THE RAIL. The three verified windows are the only numbers
//       D-83 permits, and `refundWindowFor` is the one owner of them — but a component that called it
//       with the wrong argument, or ignored its answer and picked a constant, is invisible to a scan
//       that only asks whether the module is imported.
//
// Both are behaviour, so both are asserted here by rendering.
//
// THE NEGATIVE HALVES ARE NOT PADDING. The manual branch asserting that NO window sentence appears is
// the runtime form of the structural property `refund-window.ts` was built with (the marker for a rail
// like this one carries no sentence field at all), and the not-completed sentence's absence is asserted
// at RUNTIME as well as in source because the two failures are different: the scan catches the string
// sitting in the file, this catches it arriving in the DOM from somewhere else.
//
// ⚠ The forbidden sentence is spelled in TWO PIECES here too, joined at runtime. `reversed-copy.test.ts`
// is scoped to one component today; the day somebody widens it, a test that spelled the phrase would be
// the first violation of its own rule.
//
// THE GUARDED CONTROL IS DELIBERATELY NOT ASSERTED. `SupportPath` renders nothing while `SUPPORT_EMAIL`
// is null (D-64), and an assertion that it renders nothing would go red on the day the operator fills
// the constant in — turning a correct configuration change into a test failure. Its absence is owned by
// `tests/design/site-contacts.test.ts`, which asserts it from the other side and for the whole tree.
//
// Modelled on `tests/booking/hold-expired-state.test.tsx` (the calm recovery-state suite).

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

// `BookingReference` is a client component that imports `sonner` at module scope for its copy control.
// Mocked rather than mounted: nothing here clicks it, and the real toaster registers a portal + a
// document listener per render that would outlive `cleanup()`.
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PaymentReversedState } from "@/components/booking/payment-reversed-state";
import { ALL_RAILS_REFUND_WINDOW, REFUND_WINDOW_BY_RAIL } from "@/lib/booking/refund-window";

afterEach(cleanup);

const LISTING_ID = "lst_reversed_1";
const REFERENCE = "FIT-9K3MP7QZ";
const AMOUNT = "₱1,428.00";

/**
 * The window sentences are READ FROM THE MODULE, never retyped.
 *
 * This is the same one-owner rule the module's own header states, applied to the test: a copy of the
 * sentence written out here would keep passing after the module's wording changed, which is precisely
 * the drift the module exists to prevent. What is asserted is that the component reaches the module
 * with the right key — not what the module says.
 */
const CARD_WINDOW = REFUND_WINDOW_BY_RAIL.get("card")!;
const GCASH_WINDOW = REFUND_WINDOW_BY_RAIL.get("gcash")!;
const MAYA_WINDOW = REFUND_WINDOW_BY_RAIL.get("paymaya")!;

/** STATE-05's not-completed sentence, in two pieces so this file never spells it. See the header. */
const NOT_COMPLETED_SENTENCE = ["haven't b", "een charged"].join("");

/**
 * ⚠ TRUST-04's FOUR-ROW PANEL USED TO BE MOUNTED HERE AS A SLOT, AND IT IS GONE (13-19 / D-98).
 *
 * It was passed as the real component rather than a stand-in so the negatives below — no alarm colour,
 * no live region, exactly one coral — were asserted over the whole tree a booker sees. Those negatives
 * are unchanged and are now asserted over a tree that is simply smaller: the panel is deleted from
 * every booking surface, because on THIS state its payment row promised that FitOut holds a payment
 * for a session that is not happening.
 */

function renderAuto(rail: string | null) {
  return render(
    <PaymentReversedState
      listingId={LISTING_ID}
      reference={REFERENCE}
      amountLabel={AMOUNT}
      branch="auto"
      rail={rail}
    />,
  );
}

function renderManual(rail: string | null = "qrph") {
  return render(
    <PaymentReversedState
      listingId={LISTING_ID}
      reference={REFERENCE}
      amountLabel={AMOUNT}
      branch="manual"
      rail={rail}
    />,
  );
}

describe("PaymentReversedState — two money truths from one layout (D-69, D-83)", () => {
  it("(1) the AUTOMATIC branch names the amount, says it was sent back, and gives the CARD window", () => {
    renderAuto("card");

    const panel = screen.getByTestId("money-statement");
    // The amount is the exact figure the server composed, inside the money sentence itself — not a
    // separate line a booker has to assemble.
    expect(within(panel).getByText(`We've refunded ${AMOUNT} in full.`)).toBeTruthy();
    expect(within(panel).getByText(CARD_WINDOW)).toBeTruthy();
    // …and NOT another rail's window. The three sentences are mutually exclusive by rail; a component
    // that ignored its argument and returned a constant would pass the line above.
    expect(within(panel).queryByText(GCASH_WINDOW)).toBeNull();
    expect(within(panel).queryByText(ALL_RAILS_REFUND_WINDOW)).toBeNull();
  });

  it("(2) the AUTOMATIC branch tracks the rail — GCash and Maya each get their own sentence", () => {
    renderAuto("gcash");
    expect(screen.getByText(GCASH_WINDOW)).toBeTruthy();
    expect(screen.queryByText(CARD_WINDOW)).toBeNull();
    cleanup();

    renderAuto("paymaya");
    expect(screen.getByText(MAYA_WINDOW)).toBeTruthy();
    expect(screen.queryByText(CARD_WINDOW)).toBeNull();
  });

  it("(3) with the rail UNKNOWN, the automatic branch falls to the rail-free sentence (D-84)", () => {
    // The probe timed out or fell back. The money still went back, so L1 is unchanged; L2 names every
    // rail a FitOut booker could have used rather than guessing one.
    renderAuto(null);
    expect(screen.getByText(`We've refunded ${AMOUNT} in full.`)).toBeTruthy();
    expect(screen.getByText(ALL_RAILS_REFUND_WINDOW)).toBeTruthy();
    expect(screen.queryByText(CARD_WINDOW)).toBeNull();
  });

  it("(4) the MANUAL branch states the charge, carries the reference, and offers NO window", () => {
    renderManual("qrph");

    const panel = screen.getByTestId("money-statement");
    expect(
      within(panel).getByText(`You were charged ${AMOUNT}, and it's coming back to you.`),
    ).toBeTruthy();

    // The by-hand sentence, carrying the reference the operator alert was recorded against.
    const detail = within(panel).getByText(/flagged it to be returned by hand/);
    expect(detail.textContent).toContain(REFERENCE);
    expect(detail.textContent).toContain("recorded it against this booking");

    // NO WINDOW, on any of the three sentences. This is the runtime form of the structural property:
    // the module returns a bare marker with no sentence field for a rail like this one, so there is
    // nothing to interpolate — and a component that reached for a fallback sentence anyway would be
    // promising a timetable nobody can keep.
    for (const sentence of [CARD_WINDOW, GCASH_WINDOW, MAYA_WINDOW, ALL_RAILS_REFUND_WINDOW]) {
      expect(screen.queryByText(sentence)).toBeNull();
    }
  });

  it("(5) BOTH branches render exactly one container, one money statement, and the reference", () => {
    for (const mount of [() => renderAuto("card"), () => renderManual("qrph")]) {
      mount();
      // STATE-05's distinctness assertion is between concrete containers — one per document, never two.
      expect(screen.getAllByTestId("payment-state-reversed")).toHaveLength(1);
      // STATE-06's single owner: one "where is your money" sentence per surface, never two.
      expect(screen.getAllByTestId("money-statement")).toHaveLength(1);
      // TRUST-02 — every status, including this one.
      expect(screen.getByTestId("booking-reference").textContent).toBe(REFERENCE);
      cleanup();
    }
  });

  it("(6) BOTH branches keep `Back to availability` as the one recovery primary (D-72)", () => {
    for (const mount of [() => renderAuto("card"), () => renderManual("qrph")]) {
      mount();
      const primary = screen.getByRole("link", { name: "Back to availability" });
      expect(primary.getAttribute("href")).toBe(`/listings/${LISTING_ID}`);
      expect(screen.getByRole("link", { name: "Search other spaces" })).toBeTruthy();
      cleanup();
    }
  });

  it("(7) NEITHER branch mounts a live region, and neither speaks the not-completed sentence", () => {
    for (const mount of [() => renderAuto("card"), () => renderManual("qrph")]) {
      const { container } = mount();

      // 13-UI-SPEC § Live Regions: a live region announces a CHANGE, and a freshly navigated page is
      // not a change. Asserted at runtime because the source rule ("the attribute appears nowhere in
      // the file") cannot see a region composed in from somewhere else.
      expect(container.querySelectorAll("[aria-live]")).toHaveLength(0);
      expect(screen.queryAllByRole("status")).toHaveLength(0);

      // The runtime complement of ban 1. The source scan proves the sentence is not IN the file; this
      // proves it does not arrive in the DOM from any of the pieces this file composes.
      expect(container.textContent).not.toContain(NOT_COMPLETED_SENTENCE);
      cleanup();
    }
  });

  it("(8) exactly one `h1`, and it is the shipped heading unchanged", () => {
    renderAuto("card");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("We couldn't complete this booking");
  });
});
