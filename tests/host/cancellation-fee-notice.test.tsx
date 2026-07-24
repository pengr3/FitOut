// @vitest-environment jsdom

// 260724-jo1 (UAT gap G1) — the RENDERED-OUTPUT regression for the /host/earnings cancellation-fee line.
//
// WHY THIS MUST BE A RENDER TEST, not a string/pure-function test. The reported defect was
// "You have ₱300.00in cancellation fees still to be deducted." — NO space between the amount and "in".
// The source JSX contained the space; SWC's JSX whitespace transform stripped the leading space of the
// JSXText that follows the `{formatMoney(…)}` expression container, so the space existed in the source and
// vanished in the compiled render (raw HTML: `₱300.00<!-- -->in cancellation fees`). A test on
// `formatMoney` — which returns "₱300.00" correctly — is blind to this: the amount is right, the seam
// between two nodes is what breaks. Only rendering the actual component exercises the compiled seam.
//
// The fix is an explicit `{" "}` expression container between the money and "in", which the transform
// cannot strip. This test renders the component and asserts the VISIBLE text carries the space; the guard
// assertion below reddens if a future edit reintroduces the collapsed form.
//
// MUTATION CHECK (performed manually, recorded in the SUMMARY): removing the `{" "}` from the component
// turns the two positive assertions RED, confirming the test is non-vacuous.

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { CancellationFeeNotice } from "@/components/host/cancellation-fee-notice";

afterEach(cleanup);

describe("CancellationFeeNotice — the space before \"in\" survives the compiled render (260724-jo1)", () => {
  it("renders '₱300.00 in cancellation fees' WITH the space between amount and 'in'", () => {
    const { container } = render(<CancellationFeeNotice cents={30000} currency="php" />);
    const el = container.querySelector("p");
    expect(el).not.toBeNull();

    // THE ASSERTION: the visible text has the space. This is exactly what the UAT reader saw was missing.
    expect(el?.textContent).toMatch(/₱300\.00 in cancellation fees/);
  });

  it("the full first sentence reads correctly end-to-end", () => {
    const { container } = render(<CancellationFeeNotice cents={30000} currency="php" />);
    const text = container.querySelector("p")?.textContent ?? "";

    // The whole opening sentence, space included — a byte-level pin on the copy the host reads.
    expect(text).toContain("You have ₱300.00 in cancellation fees still to be deducted.");
  });

  it("GUARD: the collapsed form '300.00in' is NEVER present, so a future whitespace regression reddens", () => {
    const { container } = render(<CancellationFeeNotice cents={30000} currency="php" />);
    const text = container.querySelector("p")?.textContent ?? "";

    // This is the exact shape the SWC transform produced before the fix. If it ever comes back, fail here.
    expect(text).not.toMatch(/300\.00in/);
  });
});
