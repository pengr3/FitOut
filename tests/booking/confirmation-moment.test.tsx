// @vitest-environment jsdom

// BFLOW-08 / D-61 / D-62-as-corrected-by-D-90 / D-63 / D-98 — THE CONFIRMATION MOMENT, AS A CONTRACT.
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
// the booker paid — at which point it is confirmed. So the request lede leads with the money answer
// that is REAL. Case (10) asserts the negative from the other side: no sentence anywhere in the moment
// describes a charge that is at risk, conditional on an approval, or awaiting one.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, within } from "@testing-library/react";

import { ConfirmationMoment } from "@/components/booking/confirmation-moment";

afterEach(cleanup);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE STRINGS, VERBATIM FROM 13-UI-SPEC § Copywriting Contract
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** `<h1>` — instant. */
const H1_INSTANT = "You're booked";
/** `<h1>` — request. The separator is an em dash, as the contract carries it. */
const H1_REQUEST = "Your host approved this — you're booked";
/** The reference's own label. */
const REFERENCE_TERM = "Booking reference";
/** The amount's label — `Paid`, not `Total`: this figure is money that has moved. */
const PAID_TERM = "Paid";
/** D-63 — the FULL address, never masked. Catching a typo is the only reason the line exists. */
const emailLine = (address: string) => `Confirmation sent to ${address}`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE FIXTURE
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const AMOUNT = "₱1,050.00";
const EMAIL = "jane.booker+fitout@example.com";
const REFERENCE = "FIT-8Q3KZ1RA";
const ARRIVAL = "Padel Court Makati · Fri, Aug 21, 9:00 AM – 11:00 AM (Makati time)";
const ADDRESS_LINES = ["88 Kalayaan Avenue, Unit 4", "Poblacion, Makati", "1210 Metro Manila"];
const PAID_IN_FULL = `You've paid ${AMOUNT} in full. FitOut holds it until after your session.`;

/**
 * The policy DISCLOSURE arrives as a slot, so this fixture stands in for it.
 *
 * It is a stand-in rather than the real `CancellationPolicyDisclosure` on purpose: the component under
 * test composes nothing about a policy — it renders whatever element the RSC hands down, which is the
 * SAME element the ordinary detail below renders. Mounting the real one here would assert
 * `cancellation-policy.test.ts`'s subject a second time and tell us nothing about this component.
 */
const POLICY_SENTINEL = "POLICY-DISCLOSURE-SLOT";
const policySlot = <p>{POLICY_SENTINEL}</p>;

const BASE = {
  arrivalLine: ARRIVAL,
  addressLines: ADDRESS_LINES,
  paidInFullSentence: PAID_IN_FULL,
  reference: REFERENCE,
  amountPaid: AMOUNT,
  email: EMAIL,
  policyDisclosure: policySlot,
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
  it("(1) `instant` leads with the ARRIVAL facts under its own `<h1>`", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="instant" {...BASE} />,
    );
    const section = moment(container);

    expect(
      within(section).getByRole("heading", { level: 1 }).textContent,
      "the instant `<h1>` is 13-UI-SPEC's, verbatim",
    ).toBe(H1_INSTANT);

    // The lede leads with arrival: venue, the venue-local date and time, and the named timezone.
    expect(section.textContent).toContain(ARRIVAL);
    // …and the full address is on its own line beneath it (D-91's post-payment boundary; the lines
    // are composed by `bookedListingAddress()` and arrive finished).
    for (const line of ADDRESS_LINES) {
      expect(section.textContent, `the address line "${line}" is missing`).toContain(line);
    }

    // The instant mode has no money answer in the LEDE — the amount is on the `Paid` row, once.
    expect(
      section.textContent,
      "the request-mode money sentence rendered on an instant booking, where it is not specified",
    ).not.toContain(PAID_IN_FULL);
  });

  it("(2) `request` leads with the money answer that is REAL — approved, paid, held (D-90)", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="request" {...BASE} />,
    );
    const section = moment(container);

    expect(
      within(section).getByRole("heading", { level: 1 }).textContent,
      "the request `<h1>` is 13-UI-SPEC's, verbatim — it leads with the approval fact",
    ).toBe(H1_REQUEST);

    expect(
      section.textContent,
      "D-90: a request booking reaches this surface only after the host approved AND the booker " +
        "paid, so the honest lede is the money answer that is real",
    ).toContain(PAID_IN_FULL);

    // The arrival facts do not disappear on this branch — they follow the money answer.
    expect(section.textContent).toContain(ARRIVAL);
    const moneyAt = section.textContent!.indexOf(PAID_IN_FULL);
    const arrivalAt = section.textContent!.indexOf(ARRIVAL);
    expect(moneyAt, "the request lede must LEAD with the money answer").toBeLessThan(arrivalAt);
  });

  it("(3) the two `<h1>` variants are different strings, and neither is the other's fallback", () => {
    const instant = render(
      <ConfirmationMoment bookingMode="instant" {...BASE} />,
    );
    const a = within(moment(instant.container)).getByRole("heading", { level: 1 }).textContent;
    cleanup();

    const request = render(
      <ConfirmationMoment bookingMode="request" {...BASE} />,
    );
    const b = within(moment(request.container)).getByRole("heading", { level: 1 }).textContent;

    expect(a).not.toBe(b);
  });
});

describe("The confirmation moment — what it contains, and in what order (D-61)", () => {
  it("(4) renders a `<section>` carrying the declared hook, and NEVER a `<main>`", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="instant" {...BASE} />,
    );

    expect(moment(container).tagName).toBe("SECTION");
    // `(app)/layout.tsx` owns the one `main` landmark per document (D-88.1). A second one nested
    // inside it is resolved differently by every assistive tool, and this component has no reason
    // to add one.
    expect(container.querySelectorAll("main")).toHaveLength(0);
  });

  it("(5) renders EXACTLY one `<h1>`, and no `<h2>` competing with it", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(
        <ConfirmationMoment bookingMode={mode} {...BASE} />,
      );
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

  it("(6) carries the seven specified items, in the specified order", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="request" {...BASE} />,
    );
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
    // 3 — the lede (its first sentence on this branch is the money answer).
    const lede = Array.from(section.querySelectorAll("p")).find((p) =>
      p.textContent?.includes(PAID_IN_FULL),
    );
    expect(lede, "the lede did not render").toBeDefined();
    // 4 — the reference, with its copy control.
    const reference = section.querySelector('[data-testid="booking-reference"]')!;
    // 5 — the amount, labelled `Paid`.
    const paid = within(section).getByText(PAID_TERM);
    // 6 — the full email line.
    const email = within(section).getByText(emailLine(EMAIL));
    // 7 — the cancellation policy. The condensed trust panel used to sit between the email line and
    //     this one; D-98 deleted it, and case (11) is the assertion that it stayed deleted.
    const policy = within(section).getByText(POLICY_SENTINEL);

    const order = [mark!, h1, lede!, reference, paid, email, policy].map((n) =>
      positionOf(container, n),
    );

    expect(
      order,
      "13-UI-SPEC § What is in the moment, in order: mark, h1, lede, reference, amount, email, " +
        "policy. The order is the argument — the booker's questions are answered in the sequence " +
        "they are asked.",
    ).toEqual([...order].sort((x, y) => x - y));
  });

  it("(7) states the FULL email address, unmasked (D-63)", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="instant" {...BASE} />,
    );
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
      <ConfirmationMoment
        bookingMode="instant"
       
        {...BASE}
        email={null}
      />,
    );
    const section = moment(container);

    // A promise with no destination is worse than no promise: "Confirmation sent to" trailing into
    // nothing reads as a fact FitOut has and is withholding.
    expect(section.textContent).not.toContain("Confirmation sent to");
  });

  it("(9) labels the amount `Paid`, and renders the figure exactly once", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="instant" {...BASE} />,
    );
    const section = moment(container);

    expect(within(section).getByText(PAID_TERM)).toBeTruthy();
    // Once, on the instant branch: the lede carries no money sentence there, so a second occurrence
    // would be the same figure stated twice three lines apart.
    const occurrences = section.textContent!.split(AMOUNT).length - 1;
    expect(occurrences, `the amount ${AMOUNT} renders ${occurrences} times, expected 1`).toBe(1);
  });

  it("(10) no copy states or implies a charge that is pending, at risk, or conditional (D-90)", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(
        <ConfirmationMoment bookingMode={mode} {...BASE} />,
      );
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

describe("The confirmation moment — the condensed trust panel is GONE (D-98)", () => {
  it("(11) renders no trust panel, and neither of the two dated rows it carried", () => {
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
  it("(13) renders ZERO links, on both modes", () => {
    for (const mode of ["instant", "request"] as const) {
      const { container } = render(
        <ConfirmationMoment bookingMode={mode} {...BASE} />,
      );

      expect(
        moment(container).querySelectorAll("a"),
        `${mode}: a terminal success screen that immediately asks for another action is selling, ` +
          "not confirming. Every action lives in the detail below, one scroll away and permanently " +
          "there.",
      ).toHaveLength(0);
      cleanup();
    }
  });

  it("(14) exposes exactly ONE control, and it is the reference's copy control", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="instant" {...BASE} />,
    );
    const section = moment(container);

    // A CLOSED SET, not a ban list. 13-09's finding, applied here: a list of forbidden CTA labels
    // cannot catch the control nobody thought of, and the realistic unwanted control is exactly that
    // one. Naming the whole set means an unlisted control fails immediately, whatever it says.
    expect(
      within(section)
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim()),
    ).toEqual(["Copy booking reference"]);
  });

  it("(15) puts the reference at HEADING weight, never at display weight", () => {
    const { container } = render(
      <ConfirmationMoment bookingMode="instant" {...BASE} />,
    );
    const reference = moment(container).querySelector('[data-testid="booking-reference"]')!;

    expect(reference.textContent).toBe(REFERENCE);
    // 13-UI-SPEC § Accent & emphasis: today the reference renders at the same size as the `<h1>` on
    // the shipped confirmed branch and the two compete. In the moment the `<h1>` is the focal point
    // and the reference is second.
    expect(reference.className).toContain("text-heading");
    expect(reference.className).not.toContain("text-display");
    // The label is beside it, so the string is never a bare token on the page.
    expect(moment(container).textContent).toContain(REFERENCE_TERM);
  });
});
