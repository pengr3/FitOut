// @vitest-environment jsdom

// OC-07 — the reduction notice, as an executable contract (09-UI-SPEC § 3, copy rule O6).
//
// WHY THIS FILE EXISTS AT ALL. By the time this alert renders, the booker's hold already holds FEWER
// passes than they asked for and no money has moved. The next thing they touch is a coral confirm that
// charges them. Every assertion below is about the gap between those two facts:
//
//   (1) THE SENTENCE, VERBATIM. Not "contains the new total" — the whole sentence, including the words
//   `Nothing has been charged yet.` A booker who is told less than the full story here consents to a
//   charge they did not read, which is a core-value trust failure on the money path (T-09-43).
//
//   (2) THE SINGULAR. `only 1 is still available`, not `only 1 are`. The one-pass case is the MOST likely
//   partial grant, not the edge one.
//
//   (3) IT IS NOT AN ERROR. Losing a spot to someone faster is a normal marketplace outcome; the alarm
//   token has no use at all this phase (§ Color). Asserted over the classes that actually PAINT — the
//   shipped Button base carries `aria-invalid:`-prefixed alarm utilities that can never apply here, and
//   counting those would make the gate unpassable for every button in the repo while proving nothing
//   about the colour a booker sees (the 09-11 lesson).
//
//   (4) IT CANNOT BE DISMISSED. No close control, no toggle, nothing with a dismissing accessible name.
//   A dismissible reduction is the exact failure mode Open Q6 rejected a dialog to avoid.
//
//   (5) NO STRIKETHROUGH ON THE OLD FIGURE. Struck pricing is discount grammar; the booker is getting
//   less, not a deal (Open Q7).

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import { PartialGrantNotice } from "@/components/booking/partial-grant-notice";

afterEach(cleanup);

/** Only unprefixed utilities paint unconditionally — see the header note (3). */
function paintedClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>("*")).flatMap((el) =>
    Array.from(el.classList).filter((c) => !c.includes(":")),
  );
}

const ALARM = /destructive|-red-|-amber-|-orange-|-yellow-/;

const BASE = {
  dateLabel: "Friday, Aug 8 (Makati time)",
  newTotalLabel: "₱367.50",
  oldTotalLabel: "₱1,102.50",
  pickAnotherHref: "/listings/lst_1",
};

/** The visible text of the alert body, whitespace-normalized the way a reader sees it. */
function bodyText(): string {
  const status = screen.getByRole("status");
  return within(status)
    .getByText(/^You picked/)
    .textContent!.replace(/\s+/g, " ")
    .trim();
}

describe("PartialGrantNotice — OC-07 / O6", () => {
  it("(1) states the reduction, BOTH figures and the no-charge reassurance, singular", () => {
    render(<PartialGrantNotice {...BASE} grantedPasses={1} requestedPasses={3} />);

    expect(bodyText()).toBe(
      "You picked 3 passes, but only 1 is still available. Your booking is set to 1 — " +
        "₱367.50 instead of the ₱1,102.50 estimated for 3. Nothing has been charged yet.",
    );
    expect(screen.getByRole("status").textContent).toContain("Only 1 left for Friday, Aug 8 (Makati time)");
  });

  it("(2) says `are` when more than one pass was granted", () => {
    render(
      <PartialGrantNotice
        {...BASE}
        grantedPasses={2}
        requestedPasses={3}
        newTotalLabel="₱735.00"
      />,
    );

    expect(bodyText()).toBe(
      "You picked 3 passes, but only 2 are still available. Your booking is set to 2 — " +
        "₱735.00 instead of the ₱1,102.50 estimated for 3. Nothing has been charged yet.",
    );
  });

  it("(3) is never an alarm, and the old figure is never struck through", () => {
    const { container } = render(
      <PartialGrantNotice {...BASE} grantedPasses={1} requestedPasses={3} />,
    );

    const painted = paintedClasses(container);
    expect(painted.filter((c) => ALARM.test(c))).toEqual([]);
    expect(painted.filter((c) => c.includes("line-through"))).toEqual([]);
    expect(container.querySelector("[aria-invalid]")).toBeNull();
    expect(container.querySelector('[data-variant="destructive"]')).toBeNull();
    // The old figure is present as ordinary text, in the same tabular-nums grammar as the new one.
    const olds = screen.getAllByText("₱1,102.50");
    expect(olds).toHaveLength(1);
    expect(olds[0].className).toContain("tabular-nums");
    expect(screen.getByText("₱367.50").className).toContain("tabular-nums");
  });

  it("(4) is a polite live region with NO way to dismiss it", () => {
    const { container } = render(
      <PartialGrantNotice {...BASE} grantedPasses={1} requestedPasses={3} />,
    );

    expect(screen.getByRole("status")).toBeTruthy();
    // No assertive interruption, and no alert role left over from the shipped shell.
    expect(screen.queryByRole("alert")).toBeNull();

    const interactive = Array.from(
      container.querySelectorAll<HTMLElement>("button, a, [role='button']"),
    );
    for (const el of interactive) {
      const name = `${el.textContent ?? ""} ${el.getAttribute("aria-label") ?? ""}`;
      expect(name).not.toMatch(/dismiss|close/i);
    }
    // The ONE interactive control is the escape route (no close button rode along).
    expect(interactive).toHaveLength(1);
  });

  it("(5) offers `Pick another date` as a neutral link to the supplied href", () => {
    render(<PartialGrantNotice {...BASE} grantedPasses={1} requestedPasses={3} />);

    const link = screen.getByRole("link", { name: "Pick another date" });
    expect(link.getAttribute("href")).toBe("/listings/lst_1");
    // Secondary to the page's coral confirm — never the accent itself (§ Color).
    expect(link.className).not.toContain("bg-brand");
  });
});
