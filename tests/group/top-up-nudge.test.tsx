// @vitest-environment jsdom

// TopUpNudge — the D-114 over-RSVP signal, and the WR-04 off-by-one it used to hide.
//
// WHY A RENDER TEST RATHER THAN A UNIT TEST ON THE ARITHMETIC. The defect was never a wrong subtraction; it
// was two numbers on DIFFERENT BASES being compared as if they were the same. `declaredPax` includes the
// organizer (`pax-stepper.tsx` says so in as many words); the count it was compared against did not, because
// the organizer is a roster fixture rather than an `rsvp` row (D-113). So with `declaredPax = 3` and three
// friends saying yes, four people were coming and `3 <= 3` kept the block silent on the very first case it
// exists to catch. The only assertion that pins that is the RENDERED OUTPUT — a sentence an organizer reads,
// stating a gap of a specific size — because "the expression is right" and "the organizer is told the truth"
// are only the same statement if the wiring holds.
//
// TWO LAYERS, DELIBERATELY SEPARABLE (the 08-16 idiom):
//   · LAYER 1 — the component's behaviour, driven through `render`. The organizer-inclusive total is composed
//     HERE with the page's own expression (`confirmed + 1`) so the mutation that reproduces WR-04 — dropping
//     the `+ 1` — turns the first-over-subscription case red on the number the organizer would have read.
//   · LAYER 2 — the SHIPMENT. Layer 1 proves the component is correct when handed the right number; only a
//     check against the real management page proves it IS handed the right number. That page is an async RSC
//     with a database, a session and `next/headers` behind it — unrenderable in jsdom for the price of the
//     one fact under test — so the wiring is asserted against its source, the 07-04 grep-tripwire idiom.
//     Delete either layer and half of WR-04 re-opens: layer 1 alone passes with the page mis-wired, layer 2
//     alone passes with the component's arithmetic broken.
//
// ⚠️ MUTATION-VERIFY (B). In `src/app/(app)/bookings/[id]/group/page.tsx`, change the nudge's prop from
// `attendingTotal={counts.confirmed + 1}` to `attendingTotal={counts.confirmed}` (and mirror it in
// CONFIRMED_YES_PLUS_ORGANIZER below, which exists to BE that expression): layer 2 goes red on the page, and
// layer 1 goes red on the rendered overage. Restore and both pass.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { TopUpNudge } from "@/components/group/top-up-nudge";

afterEach(cleanup);

const EXTRA_HEAD_FEE = 25_000; // ₱250 per extra head — any positive value opens guard 1.

/** JSX line-wrapping puts newlines inside the sentence; collapse them so a phrase can be matched whole. */
function text(container: HTMLElement): string {
  return (container.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The management page's own expression, mirrored (see MUTATION-VERIFY B above). `getHeadcount` returns the
 * count of `yes` RSVP rows; the organizer holds a seat without holding a row, so the page adds them back
 * exactly once before handing the figure to this component.
 */
const CONFIRMED_YES_PLUS_ORGANIZER = (confirmedYes: number) => confirmedYes + 1;

describe("LAYER 1 — the nudge fires at the FIRST over-subscription and states the true gap (WR-04)", () => {
  it("declaredPax 3 + three yes-RSVPs: four people are coming, and the overage is exactly 1 person", () => {
    const { container } = render(
      <TopUpNudge
        attendingTotal={CONFIRMED_YES_PLUS_ORGANIZER(3)}
        declaredPax={3}
        extraHeadFee={EXTRA_HEAD_FEE}
      />,
    );

    const rendered = text(container);
    // THE CASE THAT WAS SILENT BEFORE, ASSERTED AS THE SENTENCE THE ORGANIZER READS — and asserted FIRST,
    // so removing the fix fails on the missing gap rather than on the emptier fact that nothing rendered.
    // Three friends said yes to a booking quoted for three, so four people are coming; the old comparison
    // (3 <= 3) printed nothing at all, and the version after it would have understated the gap by one.
    // Singular "1 person", never "1 people", and never the absent "0".
    expect(rendered).toMatch(/extra 1 person at check-in/);
    expect(rendered).not.toMatch(/extra 1 people/);
    expect(rendered).toMatch(/4 people are coming/);
    expect(rendered).toMatch(/you booked for 3/);
    expect(rendered).not.toBe("");
  });

  it("declaredPax 3 + two yes-RSVPs: exactly three people are coming, so there is no gap to narrate", () => {
    const { container } = render(
      <TopUpNudge
        attendingTotal={CONFIRMED_YES_PLUS_ORGANIZER(2)}
        declaredPax={3}
        extraHeadFee={EXTRA_HEAD_FEE}
      />,
    );
    // Structurally absent, not an empty shell — the boundary on the other side of the one that used to leak.
    expect(container.innerHTML).toBe("");
  });

  it("GUARD 1 (D-108 zero-leak): a flat listing never renders this block, however many people say yes", () => {
    for (const fee of [0, null]) {
      const { container } = render(
        <TopUpNudge
          attendingTotal={CONFIRMED_YES_PLUS_ORGANIZER(40)}
          declaredPax={1}
          extraHeadFee={fee}
        />,
      );
      expect(container.innerHTML).toBe("");
      cleanup();
    }
  });

  it("GUARD 2: a booking predating declaredPax has no quoted headcount, so there is no gap to compute", () => {
    const { container } = render(
      <TopUpNudge
        attendingTotal={CONFIRMED_YES_PLUS_ORGANIZER(9)}
        declaredPax={null}
        extraHeadFee={EXTRA_HEAD_FEE}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("G5 / 08-UI-SPEC §2 — the block carries NO money-moving control and NO amount", () => {
    const { container } = render(
      <TopUpNudge
        attendingTotal={CONFIRMED_YES_PLUS_ORGANIZER(5)}
        declaredPax={2}
        extraHeadFee={EXTRA_HEAD_FEE}
      />,
    );
    expect(text(container)).toMatch(/extra 4 people at check-in/); // it DID render — the control is absent
    // v1 is record-and-signal only (D-114 / Open Q10). The in-app top-up is a deferred fast-follow, so a
    // control promising to settle the difference here would be a promise the app cannot keep. Asserted as
    // rendered output so a future edit cannot smuggle one in behind a green suite.
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    // No amount, no total, no money verb — the fee is server business (G8/D-46) and is never quoted here.
    expect(text(container)).not.toMatch(/pay|charge|card|₱|\$|\d+\.\d{2}/i);
    expect(text(container)).not.toContain(String(EXTRA_HEAD_FEE));
  });
});

describe("LAYER 2 — the management page HANDS the nudge the organizer-inclusive figure (the shipment)", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "src", "app", "(app)", "bookings", "[id]", "group", "page.tsx"),
    "utf8",
  );

  it("passes `counts.confirmed + 1` as attendingTotal — the organizer, added exactly once (D-113)", () => {
    expect(pageSource).toMatch(/attendingTotal=\{counts\.confirmed \+ 1\}/);
    // The renamed prop is the point: the old name stated a count of RSVPs and the basis had to be inferred,
    // which is precisely how the mismatch shipped. It must not come back.
    expect(pageSource).not.toContain("confirmedYes");
  });

  it("renders the meter on the same basis, while passing `full` THROUGH undecided-by-the-display", () => {
    expect(pageSource).toMatch(/confirmed=\{counts\.confirmed \+ 1\}/);
    expect(pageSource).toMatch(/capacity=\{counts\.capacity \+ 1\}/);
    // `full` is a fact about the seat-claim, decided server-side against the RAW snapshot. Re-deriving it
    // from the two organizer-inclusive numbers would replace that fact with a restatement of the display.
    expect(pageSource).toMatch(/full=\{counts\.full\}/);
    expect(pageSource).not.toMatch(/full=\{[^}]*\+ 1[^}]*\}/);
  });
});
