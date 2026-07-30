// @vitest-environment jsdom

// 09-UI-SPEC § Spots-left contract (OPEN-04 · OC-11 / OC-14, copy rules O4 / O5) — the scarcity chip's
// three states, asserted against RENDERED output.
//
// WHY A RENDER TEST. Every rule this file guards is a rule about what a booker actually sees, and each one
// is the kind a well-meant refactor breaks silently:
//
//   O4 — the exact number appears ONLY at or below the server's threshold. "Above it the chip carries no
//   number" is asserted the only way it can be proven: the `open` state's rendered text contains no digit
//   at all. A props type cannot say that; a string constant cannot say that.
//
//   O5 / § Color — selling out is a normal state. `--destructive`, red and any warning hue are barred from
//   this whole phase, so the assertion is over the classes the chip actually paints (see `paintedClasses`).
//
//   T-09-39 — scarcity as a dark pattern. The three strings are fixed and server-substantiated; the
//   singular case is the SAME sentence, not a louder one.
//
//   OC-14 — v1 has no back-in-stock alert, so the sold-out state must offer no affordance at all: no
//   button, no link, nothing focusable. Its next step is another day, supplied by the day panel.
//
// NOT UNDER TEST HERE, DELIBERATELY: which state a given {remaining, cap} produces. That is the SERVER's
// decision (`spotsState`, 09-02) and tests/availability/open-capacity-readmodel.test.ts owns it. This
// component takes `state` as a prop precisely so the browser can never hold a second opinion (T-09-13), so
// re-deriving it here would be testing the very coupling the component exists to prevent.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { SpotsLeftChip } from "@/components/availability/spots-left-chip";
import { DropInBadge } from "@/components/listing/drop-in-badge";

afterEach(cleanup);

/**
 * The class names that actually paint.
 *
 * Tailwind applies a utility unconditionally only when it carries no variant prefix. The shipped shadcn
 * Badge base string includes `aria-invalid:border-destructive` / `aria-invalid:ring-destructive/20`, which
 * can never apply here because nothing on this chip is ever `aria-invalid` — counting those would make the
 * gate unpassable for every Badge in the repo and would prove nothing about the colour a booker sees. So
 * the assertion is over the unprefixed utilities, plus a separate check that the inert variant really is
 * inert (no element carries `aria-invalid`).
 */
function paintedClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>("*")).flatMap((el) =>
    Array.from(el.classList).filter((c) => !c.includes(":")),
  );
}

const ALARM = /destructive|-red-|-amber-|-orange-|-yellow-/;

describe("SpotsLeftChip — the three server-driven states", () => {
  it("(1) `open` says spots are available and shows NO number at all (O4)", () => {
    // `remaining` is deliberately a two-digit number: if the component ever leaked it into this state, the
    // digit assertion below would catch it rather than a coincidence of small values.
    const { container } = render(<SpotsLeftChip state="open" remaining={12} />);

    expect(screen.getByText("Spots available")).toBeTruthy();
    expect(container.textContent).toBe("Spots available");
    // The whole point of O4, as an executable rule.
    expect(container.textContent).not.toMatch(/\d/);
  });

  it("(2) `low` renders the exact count", () => {
    const { container } = render(<SpotsLeftChip state="low" remaining={3} />);

    expect(container.textContent).toBe("Only 3 left");
  });

  it("(3) `low` with one spot is the SINGULAR of the same sentence, not a second copy", () => {
    const { container } = render(<SpotsLeftChip state="low" remaining={1} />);

    expect(container.textContent).toBe("Only 1 left");
    // No escalation at the last spot — "Last one!", "Almost gone!" and friends are barred (T-09-39).
    expect(container.textContent).not.toMatch(/last one|almost gone|selling fast|hurry/i);
  });

  it("(4) `full` is calm and names the state in words", () => {
    const { container } = render(<SpotsLeftChip state="full" remaining={0} />);

    expect(container.textContent).toBe("Fully booked");
  });

  it("(5) no state paints an alarm colour — red is not used at all this phase (O5 / § Color)", () => {
    for (const [state, remaining] of [
      ["open", 12],
      ["low", 2],
      ["full", 0],
    ] as const) {
      cleanup();
      const { container } = render(<SpotsLeftChip state={state} remaining={remaining} />);

      const alarming = paintedClasses(container).filter((c) => ALARM.test(c));
      expect(alarming, `state="${state}" painted an alarm class`).toEqual([]);
      // ...and the Badge's inert `aria-invalid:` variants really are inert.
      expect(container.querySelector("[aria-invalid]")).toBeNull();
      expect(container.querySelector('[data-variant="destructive"]')).toBeNull();
    }
  });

  it("(6) no state is clickable or focusable — and `full` offers no back-in-stock affordance (OC-14)", () => {
    for (const [state, remaining] of [
      ["open", 12],
      ["low", 2],
      ["full", 0],
    ] as const) {
      cleanup();
      const { container } = render(<SpotsLeftChip state={state} remaining={remaining} />);

      expect(
        container.querySelector('button, a, input, [tabindex], [role="button"], [role="link"]'),
        `state="${state}" rendered something interactive`,
      ).toBeNull();
      expect(container.textContent).not.toMatch(/waitlist|notify|alert me|let me know/i);
    }
  });

  it("(7) every state announces itself — a date change must reach assistive tech", () => {
    for (const [state, remaining] of [
      ["open", 12],
      ["low", 2],
      ["full", 0],
    ] as const) {
      cleanup();
      render(<SpotsLeftChip state={state} remaining={remaining} />);

      expect(screen.getByRole("status"), `state="${state}" is not announced`).toBeTruthy();
    }
  });
});

describe("DropInBadge", () => {
  it("(8) names the mode in real words, never accent-coloured", () => {
    const { container } = render(<DropInBadge />);

    expect(container.textContent).toBe("Drop-in");
    expect(paintedClasses(container).filter((c) => c.includes("brand"))).toEqual([]);
    expect(paintedClasses(container).filter((c) => ALARM.test(c))).toEqual([]);
  });
});
