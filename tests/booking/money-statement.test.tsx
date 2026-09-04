// @vitest-environment jsdom

// STATE-06 / D-73 — the money sentence's single owner, as an executable contract.
//
// WHY THIS FILE EXISTS. D-73's whole argument is that *"three bespoke paragraphs are three things that
// drift; one component is one thing that is testable."* This is the testable part. Every assertion below
// is about a property the three payment states would otherwise each re-decide:
//
//   (1) THE SENTENCE ARRIVES FINISHED AND IS RENDERED VERBATIM. The component composes nothing, joins
//       nothing and formats nothing — no money computation crosses to the client (D-130 / GATE-05), so
//       the string a booker reads is the string the RSC wrote. A component that reworded its input would
//       be a second copywriter nobody could review.
//   (2) IT COMPOSES `PanelCard tone="muted"`, Phase 11's declared in-page advisory surface — not a raw
//       `<Card>`, not a toast, not an `Alert`, not a fourth container. Asserted through the pattern's own
//       `data-testid="panel-card"` rather than by reading an import, because what matters at runtime is
//       what mounted.
//   (3) THE HOOK IS PRESENT EXACTLY ONCE. STATE-06's above-the-fold assertion measures this element's
//       `boundingBox()`, and a Playwright measurement over a selector that resolves to two elements
//       measures whichever came first. "Exactly one per document" is the caller's contract; "exactly one
//       per instance" is this component's half of it, and it is the half that can be tested here.
//   (4) NO LIVE REGION ON A FRESH RENDER. § Live Regions is explicit: this panel is page content that is
//       already there when the page arrives, not an announcement. An `aria-live` here would make every
//       navigation re-read the money sentence over whatever else the surface is announcing.
//   (5) THE FIRST LINE IS A `<p>`, NOT A HEADING. 13-UI-SPEC § Typography rule 3 — a semibold paragraph
//       standing in for a heading is the shortcut Phase 11 removed from the empty states and Phase 12
//       from the key-facts strip. It is a sentence, so it is a sentence element.
//
// WHAT THIS FILE DELIBERATELY DOES NOT COVER. It says nothing about WHICH sentence a given status gets —
// that is D-94's boundary and it lives with the callers (13-04/07/15), and nothing about the panel being
// above the fold, which is a rendered-viewport claim and is measured in Playwright at 320x568 and
// 1280x800. `tests/design/price-surface.test.ts` does not scan this file either: its scope is a declared
// three-file list. The zero-arithmetic property is carried structurally instead — there is no `number`
// prop on this component for arithmetic to be performed on.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { MoneyStatement } from "@/components/booking/money-statement";

afterEach(cleanup);

/** A reversed-state sentence, verbatim from 13-UI-SPEC § Copywriting → The money statement. */
const SENTENCE = "We've refunded ₱1,428.00 in full.";
const DETAIL = "It should be back in your GCash within 24 hours.";

describe("MoneyStatement — STATE-06's single owner (D-73)", () => {
  it("(1) renders the finished sentence verbatim, and renders it as a paragraph", () => {
    render(<MoneyStatement sentence={SENTENCE} />);

    const line = screen.getByText(SENTENCE);
    expect(line.tagName).toBe("P");
    // (5) — no heading rode along. A semibold sentence is still a sentence.
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("(2) composes PanelCard on its muted tone, never a raw card or an alert", () => {
    const { container } = render(<MoneyStatement sentence={SENTENCE} />);

    const panel = container.querySelector('[data-testid="panel-card"]');
    expect(panel, "the statement did not mount PanelCard").toBeTruthy();
    // `tone="muted"` is the whole reason this surface is legal without a new colour pairing.
    expect(panel!.className).toContain("bg-muted");
    // Not an alert, and not a status: both would announce (see (4)).
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("(3) carries data-testid=\"money-statement\" exactly once", () => {
    const { container } = render(<MoneyStatement sentence={SENTENCE} detail={DETAIL} />);

    expect(container.querySelectorAll('[data-testid="money-statement"]')).toHaveLength(1);
  });

  it("(4) mounts NO live region on a fresh render", () => {
    const { container } = render(<MoneyStatement sentence={SENTENCE} detail={DETAIL} />);

    expect(container.querySelectorAll("[aria-live]")).toHaveLength(0);
    expect(container.querySelectorAll("[role='status'], [role='alert']")).toHaveLength(0);
  });

  it("(6) renders the detail slot when given one, and NOTHING in its place when not", () => {
    const { container: withDetail } = render(
      <MoneyStatement sentence={SENTENCE} detail={DETAIL} />,
    );
    expect(screen.getByText(DETAIL)).toBeTruthy();
    // Read BEFORE `cleanup()`: RTL unmounts and EMPTIES the container it returned, so a `textContent`
    // read afterwards is `""` and would compare two empty strings while looking like a real assertion.
    const withDetailText = withDetail.textContent;

    cleanup();

    const { container: without } = render(<MoneyStatement sentence={SENTENCE} />);
    // The omitted slot leaves no empty box behind — an empty second line would open a gap the
    // panel's own spacing already owns, and would read as a missing sentence rather than as none.
    expect(without.textContent).toBe(SENTENCE);
    expect(withDetailText).toContain(DETAIL);
  });

  it("(7) takes rich content in the detail slot — the window, the reference, the guarded control", () => {
    // The slot is typed `ReactNode` because 13-UI-SPEC's own detail examples are elements, not strings.
    // A `<p>` container would make this tree illegal HTML the moment a caller passes flow content, which
    // is why the second line is a `<div>`. Asserted rather than argued.
    const { container } = render(
      <MoneyStatement
        sentence={SENTENCE}
        detail={
          <div>
            <span>{DETAIL}</span>
            <button type="button">Get in touch</button>
          </div>
        }
      />,
    );

    expect(screen.getByRole("button", { name: "Get in touch" })).toBeTruthy();
    // No paragraph anywhere ended up as the parent of that div.
    const button = screen.getByRole("button", { name: "Get in touch" });
    expect(button.closest("p")).toBeNull();
    expect(container.querySelectorAll('[data-testid="money-statement"]')).toHaveLength(1);
  });
});
