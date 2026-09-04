// @vitest-environment jsdom

// BFLOW-08 / D-61 / D-62-as-corrected-by-D-90 / D-63 / D-98 / D-100 — THE CONFIRMATION MOMENT,
// AS A CONTRACT.
//
// WHAT THIS FILE IS FOR, AND WHAT IT DELIBERATELY IS NOT FOR.
//
// The moment's GEOMETRY — that it fills the first screen, that the ordinary detail begins below the
// fold, that the URL is rewritten in place and a reload renders the ordinary page — is not assertable
// here and no case below pretends otherwise. jsdom has no layout: every `getBoundingClientRect()` is
// zeros, so a height assertion in this file would pass against a component that rendered nothing
// (D-131, and the reason `e2e/confirmation-decay.spec.ts` exists). This file owns the half a rendered
// TREE can answer: WHICH FACTS ARE PRESENT, in WHAT ORDER, in WHICH MODE, and WHAT IS ABSENT.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// D-100 — THE MOMENT IS FOUR THINGS NOW, AND THE ABSENCES ARE THE ASSERTION
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The PM's live-UAT finding: the celebratory header and the Space / Where / When / Host / Total facts
// card *"says the same thing twice"*. It did — the header carried the venue, the venue-local window,
// the named timezone, the full address, the reference, the amount and the cancellation policy, and
// every one of those renders again in the detail directly beneath it. A confirmation that restates the
// page below it is not a moment, it is a preview of the page.
//
// SO THE RULE IS: **the header carries the moment and the outcome; the facts card carries the detail.**
// Four items survive — the success mark, the `<h1>`, the paid statement, and D-63's email line — and
// the cases below assert the four AND the removals, because a compaction that quietly grew back is
// invisible to a test that only checks what is present.
//
// ⚠ NOTHING THAT EXISTED ONLY IN THE HEADER WAS LOST, which is D-60's decay-safety argument and is
// checked from the other side by `tests/booking/detail-completeness.test.tsx`. Two things live only
// here and both stayed: the email line (the destination of the confirmation, stated nowhere else) and
// the request-mode `<h1>`'s approval fact. Everything removed renders on the ordinary detail below.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE COPY IS RETYPED HERE RATHER THAN IMPORTED FROM THE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// These strings are a COPY CONTRACT (13-UI-SPEC § Copywriting Contract → The confirmation moment).
// The thing being asserted is that the component renders THOSE WORDS, so importing the component's own
// constants would compare it to itself and pass through any rewording. They are typed out from the
// contract, character for character — straight apostrophes and an em dash, as the contract carries.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// D-90 IS THE REASON CASE (2) IS WRITTEN THE WAY IT IS
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// D-62 originally specified that the request-mode lede reassure the booker their money comes back if
// the host declines. D-90 CORRECTS it: request-to-book is pay-on-approval, so a booker with a pending
// request has not been charged at all, and there is no "charged while awaiting approval" state to
// reassure anyone about. A request-mode booking only reaches this surface AFTER the host approved AND
// the booker paid — at which point it is confirmed. Case (9) asserts the negative from the other side:
// no sentence anywhere in the moment describes a charge that is at risk, conditional on an approval,
// or awaiting one.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, within } from "@testing-library/react";

import { ConfirmationMoment } from "@/components/booking/confirmation-moment";
import { PaidStatement } from "@/components/booking/paid-statement";

afterEach(cleanup);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE STRINGS, VERBATIM FROM 13-UI-SPEC § Copywriting Contract
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** `<h1>` — instant. */
const H1_INSTANT = "You're booked";
/** `<h1>` — request. The separator is an em dash, as the contract carries it. */
const H1_REQUEST = "Your host approved this — you're booked";
/** D-63 — the FULL address, never masked. Catching a typo is the only reason the line exists. */
const emailLine = (address: string) => `Confirmation sent to ${address}`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE FIXTURE
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const AMOUNT = "₱1,050.00";
const EMAIL = "jane.booker+fitout@example.com";

/**
 * The facts the header used to restate, kept here as the negative fixture (D-100).
 *
 * They are not props any more. They are what case (10) proves the moment does NOT say: the venue, the
 * venue-local window with its named timezone, the full address, the reference and the amount all
 * render in the facts card, the reference panel and the paid statement of the ordinary detail below,
 * which is one scroll away and permanently there.
 */
const ARRIVAL = "Padel Court Makati · Fri, Aug 21, 9:00 AM – 11:00 AM (Makati time)";
const ADDRESS_LINES = ["88 Kalayaan Avenue, Unit 4", "Poblacion, Makati", "1210 Metro Manila"];
const REFERENCE = "FIT-8Q3KZ1RA";

/**
 * D-99's paid statement, as the REAL component rather than a stand-in.
 *
 * It arrives as a SLOT and not as props, and the distinction is the one 13-10 established on this
 * segment: the ordinary detail below renders the IDENTICAL element, so passing the element itself
 * makes *"the moment and the detail state the same paid sentence"* true by construction rather than by
 * two call sites agreeing. Passing the real one here also keeps case (9)'s negative honest — it is
 * asserted over the words a booker actually reads rather than over a sentinel.
 */
const paidSlot = <PaidStatement amountPaid={AMOUNT} phase="held" />;

const BASE = {
  paidStatement: paidSlot,
  email: EMAIL,
} as const;

/** The moment's own element. Every scoped query below runs inside it, never over the whole document. */
function moment(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-testid="confirmation-moment"]');
  expect(el, "the confirmation moment did not render at all").not.toBeNull();
  return el!;
}

/**
 * The position of a node in the moment's document order.
 *
 * Order is asserted over ELEMENTS rather than over `textContent.indexOf`, because the success mark
 * carries no text at all — it is an `aria-hidden` icon, so a text-order assertion could not see the
 * one item whose position the spec is most specific about.
 */
function positionOf(container: HTMLElement, node: Element): number {
  const all = Array.from(moment(container).querySelectorAll("*"));
  const index = all.indexOf(node);
  expect(index, "the node is not inside the confirmation moment").toBeGreaterThanOrEqual(0);
  return index;
}

describe("The confirmation moment — the two mode variants (D-62 as corrected by D-90)", () => {
  it("(1) `instant` carries its own `<h1>` and the paid outcome under it", () => {
    const { container } = render(<ConfirmationMoment bookingMode="instant" {...BASE} />);
    const section = moment(container);

    expect(
      within(section).getByRole("heading", { level: 1 }).textContent,
      "the instant `<h1>` is 13-UI-SPEC's, verbatim",
    ).toBe(H1_INSTANT);

    expect(
      section.querySelectorAll('[data-testid="paid-statement"]'),
      "the outcome — that the money has moved — is the one fact the moment adds to its heading",
    ).toHaveLength(1);
  });

  it("(2) `request` leads with the approval fact, and states the money answer that is REAL (D-90)", () => {
    const { container } = render(<ConfirmationMoment bookingMode="request" {...BASE} />);
    const section = moment(container);

    expect(
      within(section).getByRole("heading", { level: 1 }).textContent,
      "the request `<h1>` is 13-UI-SPEC's, verbatim — it leads with the approval fact",
    ).toBe(H1_REQUEST);

    // D-90: a request booking reaches this surface only after the host approved AND the booker paid,
    // so the honest money answer is that the payment HAPPENED — the same statement the instant branch
    // carries, because by this point the two situations are the same situation.
    expect(section.textContent).toContain("Paid in full");
    expect(section.textContent).toContain(AMOUNT);
  });

  it("(3) the two `<h1>` variants are different strings, and neither is the other's fallback", () => {
    const instant = render(<ConfirmationMoment bookingMode="instant" {...BASE} />);
    const a = within(moment(instant.container)).getByRole("heading", { level: 1 }).textContent;
    cleanup();

    const request = render(<ConfirmationMoment bookingMode="request" {...BASE} />);
    const b = within(moment(request.container)).getByRole("heading", { level: 1 }).textContent;

    expect(a).not.toBe(b);
  });
});

describe("The confirmation moment — what it contains, and in what order (D-61 / D-100)", () => {
  it("(4) renders a `<section>` carrying the declared hook, and NEVER a `<main>`", () => {
    const { container } = render(<ConfirmationMoment bookingMode="instant" {...BASE} />);

    expect(moment(container).tagName).toBe("SECTION");
    // `(app)/layout.tsx` owns the one `main` landmark per document (D-88.1). A second one nested
    // inside it is resolved differently by every assistive tool, and this component has no reason
    // to add one.
    expect(container.querySelectorAll("main")).toHaveLength(0);
  });

  it("(5) renders EXACTLY one `<h1>`, and no `<h2>` competing with it", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(<ConfirmationMoment bookingMode={mode} {...BASE} />);
      const section = moment(container);

      expect(
        within(section).getAllByRole("heading", { level: 1 }),
        `${mode}: the moment must carry exactly one top-level heading`,
      ).toHaveLength(1);
      expect(
        within(section).queryAllByRole("heading", { level: 2 }),
        `${mode}: a second-level heading inside a full-screen success moment competes with the ` +
          "one thing it exists to say",
      ).toHaveLength(0);
      cleanup();
    }
  });

  it("(6) carries the FOUR specified items, in the specified order (D-100)", () => {
    const { container } = render(<ConfirmationMoment bookingMode="request" {...BASE} />);
    const section = moment(container);

    // 1 — the success mark. An icon with no text, which is why order is measured over elements.
    const mark = section.querySelector("svg");
    expect(mark, "the success mark is absent").not.toBeNull();
    expect(
      mark!.getAttribute("aria-hidden"),
      "the mark is decorative: the `<h1>` beneath it is what says the booking is confirmed",
    ).toBe("true");

    // 2 — the `<h1>`.
    const h1 = within(section).getByRole("heading", { level: 1 });
    // 3 — the outcome: the paid statement, the same element the detail below renders.
    const paid = section.querySelector('[data-testid="paid-statement"]')!;
    // 4 — the full email line, which is the ONE fact that exists nowhere else on the page.
    const email = within(section).getByText(emailLine(EMAIL));

    const order = [mark!, h1, paid, email].map((n) => positionOf(container, n));

    expect(
      order,
      "the moment is: mark, h1, the paid outcome, the email destination. The order is the argument " +
        "— what happened, what it means, and where the confirmation went.",
    ).toEqual([...order].sort((x, y) => x - y));
  });

  it("(7) states the FULL email address, unmasked (D-63)", () => {
    const { container } = render(<ConfirmationMoment bookingMode="instant" {...BASE} />);
    const section = moment(container);

    expect(section.textContent).toContain(emailLine(EMAIL));
    // Masking is rejected: catching a typo is the ONLY reason this line exists, and a masked address
    // hides exactly the characters a typo lives in. The page is behind auth and it is the booker's
    // own booking, so exposure is nil.
    expect(
      section.textContent,
      "the address is masked, which defeats the only purpose of the line",
    ).not.toMatch(/[a-z]\*{2,}/i);
  });

  it("(8) renders NO email line at all when the session carries no address", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="instant" {...BASE} email={null} />,
    );
    const section = moment(container);

    // A promise with no destination is worse than no promise: "Confirmation sent to" trailing into
    // nothing reads as a fact FitOut has and is withholding.
    expect(section.textContent).not.toContain("Confirmation sent to");
  });

  it("(9) no copy states or implies a charge that is pending, at risk, or conditional (D-90)", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(<ConfirmationMoment bookingMode={mode} {...BASE} />);
      const text = moment(container).textContent!.toLowerCase();

      // Every phrasing below describes a charge whose outcome is still open. None can be true on
      // this surface: the moment renders only on a CONFIRMED booking, which by definition means the
      // webhook landed. A request booker never had money at risk (pay-on-approval), and an instant
      // booker's payment is already held.
      for (const phrase of [
        "if the host declines",
        "if they decline",
        "refunded in full if",
        "you'll be refunded",
        "awaiting approval",
        "pending approval",
        "you'll pay if approved",
        "nothing is charged until",
      ]) {
        expect(
          text,
          `${mode}: the moment carries "${phrase}", which describes a charge that either never ` +
            "happened (D-90) or is no longer open. The mode distinction belongs on the detail " +
            "page's `requested`/`approved` status meanings, not here.",
        ).not.toContain(phrase);
      }
      cleanup();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// D-100 — THE REMOVALS, ASSERTED AS REMOVALS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A compaction that quietly grows back is invisible to a suite that only checks what is present, and
// this one WILL be tempting to grow back: every fact below is a fact somebody could reasonably want on
// a confirmation screen. The answer is that each of them is one scroll down, permanently, in a panel
// built for it — and the PM's complaint was precisely that reading both is reading the same page twice.
describe("The confirmation moment — it restates NOTHING from the facts card (D-100)", () => {
  it("(10) states no venue, no window, no timezone, no street and no reference", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(<ConfirmationMoment bookingMode={mode} {...BASE} />);
      const text = moment(container).textContent ?? "";

      // The arrival line was the header's restatement of Space + When, timezone included.
      expect(text, `${mode}: the arrival line is back in the header`).not.toContain(ARRIVAL);
      expect(text, `${mode}: the venue name is back in the header`).not.toContain(
        "Padel Court Makati",
      );
      // The address lines were the header's restatement of Where.
      for (const line of ADDRESS_LINES) {
        expect(text, `${mode}: the address line "${line}" is back in the header`).not.toContain(line);
      }
      // The reference renders in its own panel below, with the copy control that surface needs.
      expect(text, `${mode}: the reference is back in the header`).not.toContain(REFERENCE);
      expect(text, `${mode}: the reference's own label is back in the header`).not.toContain(
        "Booking reference",
      );
      cleanup();
    }
  });

  it("(11) names the amount exactly ONCE, inside the paid statement and nowhere beside it", () => {
    const { container } = render(<ConfirmationMoment bookingMode="instant" {...BASE} />);
    const section = moment(container);

    // The header used to carry the figure twice on a request booking — once in the lede's money
    // sentence and once again on a block labelled `Paid` three lines below. One figure, one place.
    const occurrences = section.textContent!.split(AMOUNT).length - 1;
    expect(
      occurrences,
      `the amount ${AMOUNT} renders ${occurrences} times inside the moment, expected 1`,
    ).toBe(1);

    // …and the standalone `Paid` label block that carried the second one is gone with it.
    expect(within(section).queryAllByText("Paid", { exact: true })).toHaveLength(0);
  });

  it("(12) discloses no cancellation policy — the identical element renders in the detail below", () => {
    const { container } = render(<ConfirmationMoment bookingMode="instant" {...BASE} />);
    const section = moment(container);

    // This was the clearest "same thing twice" on the page: the moment was handed the SAME
    // `CancellationPolicyDisclosure` element the detail renders, so one screen carried two identical
    // disclosures. There is no slot for it any more — this asserts the rendered consequence.
    expect(section.querySelectorAll("details")).toHaveLength(0);
    expect(section.textContent).not.toContain("Free cancellation");
    expect(section.textContent).not.toContain("cancel");
  });
});

describe("The confirmation moment — the condensed trust panel is GONE (D-98)", () => {
  it("(13) renders no trust panel, and neither of the two dated rows it carried", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(<ConfirmationMoment bookingMode={mode} {...BASE} />);
      const section = moment(container);

      // ASSERTED OVER THE RENDERED TREE, not over this file's import list. 13-07's finding is that a
      // source scan cannot see what it was not told to look for, and a panel re-introduced through a
      // slot rather than an import would be invisible to a grep for the component's name.
      expect(
        section.querySelectorAll('[data-testid="trust-block"]'),
        `${mode}: the condensed trust panel is rendering again. D-98 removed it from every booking ` +
          "surface: at launch every host and every listing reads the same month, so its two dated " +
          "rows distinguish nothing.",
      ).toHaveLength(0);

      // The two terms specifically, because a panel rebuilt inline would carry no test id at all.
      expect(section.textContent).not.toContain("Host since");
      expect(section.textContent).not.toContain("Listing published");
      cleanup();
    }
  });
});

describe("The confirmation moment — there is no CTA in it (13-UI-SPEC § Primary CTAs)", () => {
  it("(14) renders ZERO links, on both modes", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(<ConfirmationMoment bookingMode={mode} {...BASE} />);

      expect(
        moment(container).querySelectorAll("a"),
        `${mode}: a terminal success screen that immediately asks for another action is selling, ` +
          "not confirming. Every action lives in the detail below, one scroll away and permanently " +
          "there.",
      ).toHaveLength(0);
      cleanup();
    }
  });

  it("(15) exposes ZERO controls — a CLOSED SET, not a ban list", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(<ConfirmationMoment bookingMode={mode} {...BASE} />);

      // 13-09's finding applied here: a list of forbidden CTA labels cannot catch the control nobody
      // thought of, and the realistic unwanted control is exactly that one. Naming the whole set —
      // and the set is now EMPTY — means an unlisted control fails immediately, whatever it says.
      //
      // It used to be exactly one: the reference's copy control. D-100 moved the reference into the
      // panel below, which took its control with it, and the moment is now purely a statement.
      expect(
        within(moment(container))
          .queryAllByRole("button")
          .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim()),
        `${mode}: a control appeared inside the confirmation moment`,
      ).toEqual([]);
      cleanup();
    }
  });
});
