// @vitest-environment jsdom

// D-43 — the key-facts strip, and the ONE rule in it that is about money rather than layout.
//
// The rule under test is not "the strip renders four cells". It is that a booker can never read the
// strip as an offer of the whole venue. A listing with `unitCount = 4` sells ONE unit for the booked
// window; a cell labelled `Units` whose value is `4 courts` says the opposite, in the place a booker
// decides, about the thing they are paying for. So the positive form (`/^1 of \d+ /`) and the NEGATIVE
// form (no bare `{N} {noun}` anywhere in the rendered text) are both asserted, in
// `search-card-open.test.tsx`'s shape — a whole-`textContent` scan for a forbidden claim.
//
// ══ THE EXPECTATIONS ARE LITERAL, AND THAT IS DELIBERATE ══════════════════════════════════════════════
// Every label and value below is typed out here rather than read back from `keyFactCells`. 12-07 measured
// what happens otherwise: its gallery button assertion read the component's own predicate, so flipping
// `>` to `>=` inside the predicate moved BOTH sides and every rendered assertion stayed green while the
// markup grew a lie. `keyFactCells` is asserted AGAINST this table, never consulted for it.
//
// ══ WHAT THIS FILE CANNOT SEE ═════════════════════════════════════════════════════════════════════════
// jsdom compiles no Tailwind (D-131), so the 2×2 collapse below 700px, the `min-[700px]` column count and
// the border geometry are class STRINGS here and rendered geometry nowhere. `keyFactCellClass` is
// asserted as the declared string it is; whether the compiled CSS draws one box is not a claim this file
// makes. 12-11's viewport pass is where a rendered measurement could live.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import {
  DAY_PASS_VALUE,
  KeyFacts,
  keyFactCellClass,
  keyFactCells,
  type KeyFactsProps,
} from "@/components/listing/key-facts";

/** A four-court pickleball listing — the fixture the `1 of N` rule is named for. */
const COURTS: KeyFactsProps = {
  occupancyMode: "exclusive",
  bookingMode: "instant",
  primarySpaceType: "pickleball_court",
  maxOccupancy: 12,
  unitCount: 4,
};

/** Reads the rendered strip as an ordered list of [label, value] pairs. */
function pairs(container: HTMLElement): [string, string][] {
  const dl = container.querySelector('[data-testid="listing-key-facts"]');
  if (!dl) return [];
  const terms = [...dl.querySelectorAll("dt")];
  const definitions = [...dl.querySelectorAll("dd")];
  expect(
    definitions.length,
    "every <dt> must be matched by its own <dd> — a term with no definition is not a description list",
  ).toBe(terms.length);
  return terms.map((dt, i) => [dt.textContent ?? "", definitions[i]?.textContent ?? ""]);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE EXCLUSIVE VARIANT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

describe("KeyFacts — exclusive listing", () => {
  it("(1) renders FOUR pairs, in the requirement's order, when every field exists", () => {
    const { container } = render(<KeyFacts {...COURTS} />);

    expect(pairs(container)).toEqual([
      ["Capacity", "Up to 12"],
      ["Space", "Pickleball court"],
      ["Booking", "Instant"],
      ["Units", "1 of 4 courts"],
    ]);
  });

  it("(2) renders THREE pairs when the unit count is 1 — `Units` is not an empty cell, it is absent", () => {
    const { container } = render(<KeyFacts {...COURTS} unitCount={1} />);

    expect(pairs(container)).toEqual([
      ["Capacity", "Up to 12"],
      ["Space", "Pickleball court"],
      ["Booking", "Instant"],
    ]);
  });

  it("(3) renders THREE pairs when there is no capacity, and still never a fifth", () => {
    const { container } = render(<KeyFacts {...COURTS} maxOccupancy={null} />);

    expect(pairs(container)).toEqual([
      ["Space", "Pickleball court"],
      ["Booking", "Instant"],
      ["Units", "1 of 4 courts"],
    ]);
  });

  it("(4) `Units` renders IFF unitCount > 1, across the counts a real listing carries", () => {
    // 0 and 1 are both "one unit as far as a booker is concerned"; 2+ is the ambiguous case.
    for (const unitCount of [0, 1, 2, 3, 4, 12]) {
      const { container, unmount } = render(<KeyFacts {...COURTS} unitCount={unitCount} />);
      const units = pairs(container).find(([label]) => label === "Units");

      if (unitCount > 1) {
        expect(units, `unitCount=${unitCount} must render a Units cell`).toBeDefined();
        expect(
          units?.[1],
          `unitCount=${unitCount} rendered "${units?.[1]}" — the value must lead with the 1-of-N ` +
            `prefix, or the cell claims the booking includes every unit`,
        ).toMatch(/^1 of \d+ /);
      } else {
        expect(units, `unitCount=${unitCount} must render NO Units cell`).toBeUndefined();
      }
      unmount();
    }
  });

  it("(5) `Host approves` is the request-mode value; `Instant` is the instant one", () => {
    const { container: request, unmount } = render(
      <KeyFacts {...COURTS} bookingMode="request" />,
    );
    expect(pairs(request).find(([label]) => label === "Booking")?.[1]).toBe("Host approves");
    unmount();

    const { container: instant } = render(<KeyFacts {...COURTS} bookingMode="instant" />);
    expect(pairs(instant).find(([label]) => label === "Booking")?.[1]).toBe("Instant");
  });

  it("(6) the unit noun follows the space type and falls back to `spaces`", () => {
    const cases: [KeyFactsProps["primarySpaceType"], string][] = [
      ["pickleball_court", "1 of 4 courts"],
      ["basketball_court", "1 of 4 courts"],
      ["yoga_studio", "1 of 4 rooms"],
      ["gym_fitness_floor", "1 of 4 spaces"],
      ["multi_purpose_event", "1 of 4 spaces"],
      [null, "1 of 4 spaces"],
    ];
    for (const [primarySpaceType, expected] of cases) {
      const { container, unmount } = render(
        <KeyFacts {...COURTS} primarySpaceType={primarySpaceType} />,
      );
      expect(
        pairs(container).find(([label]) => label === "Units")?.[1],
        `space type ${String(primarySpaceType)}`,
      ).toBe(expected);
      unmount();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE NEGATIVE ASSERTION — a bare unit count is a claim the product does not make
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * A count-plus-unit-noun NOT immediately preceded by `1 of `. This is the forbidden claim: `4 courts`
 * standing alone reads as "you get all four", which is false of every listing this strip renders.
 *
 * ⚠ `(?<!\d)` RATHER THAN `\b`, AND THAT IS A MEASURED CORRECTION, NOT A STYLE CHOICE. The first draft
 * opened with `\b\d+`, which is the obvious spelling and is GREEN FOR THE DEFECT. `textContent`
 * concatenates sibling nodes with no separator, so the strip's real text reads `…Units4 courts` — and
 * there is no word boundary between the `s` of the label and the `4` of the value, so `\b` never
 * matches and the whole assertion passes over the bare claim it exists to catch. Observed: with the
 * component mutated to render `4 courts`, five POSITIVE cases went red and case (8) stayed green.
 * Case (7) now pins the concatenated shape itself so the hole cannot reopen.
 */
const BARE_UNIT_CLAIM = /(?<!1 of )(?<!\d)\d+\s+(courts|rooms|spaces)\b/;

describe("the `4 courts` rule, as a whole-text absence", () => {
  it("(7) GUARD THE GUARD: the pattern really does catch a bare claim", () => {
    // Without this, a regex that matched nothing would report a clean sweep forever — the vacuity
    // failure `sheet-absent.test.ts` and `live-regions.test.tsx` have both measured on this repo.
    expect("Units 4 courts").toMatch(BARE_UNIT_CLAIM);
    expect("Units 12 rooms").toMatch(BARE_UNIT_CLAIM);
    expect("Units 3 spaces").toMatch(BARE_UNIT_CLAIM);
    // THE SHAPE THE STRIP ACTUALLY PRODUCES — label and value concatenated with no separator, which is
    // exactly what `\b\d+` could not see. This line is the one that makes case (8) able to fail.
    expect("CapacityUp to 12SpacePickleball courtBookingInstantUnits4 courts").toMatch(
      BARE_UNIT_CLAIM,
    );
    // ...and does NOT fire on the correct form, or case (8) would be unsatisfiable rather than true.
    expect("Units 1 of 4 courts").not.toMatch(BARE_UNIT_CLAIM);
    expect("CapacityUp to 12SpacePickleball courtBookingInstantUnits1 of 4 courts").not.toMatch(
      BARE_UNIT_CLAIM,
    );
  });

  it("(8) no rendered variant states a bare `{N} {noun}` anywhere in its text", () => {
    const variants: KeyFactsProps[] = [
      COURTS,
      { ...COURTS, unitCount: 1 },
      { ...COURTS, primarySpaceType: "yoga_studio" },
      { ...COURTS, primarySpaceType: null },
      { ...COURTS, occupancyMode: "open_capacity", maxOccupancy: 20 },
      { ...COURTS, occupancyMode: "open_capacity", unitCount: 4 },
    ];
    for (const variant of variants) {
      const { container, unmount } = render(<KeyFacts {...variant} />);
      const text = container.textContent ?? "";
      expect(
        text,
        `the strip rendered "${text}" — a unit count without the "1 of " prefix tells a booker the ` +
          `booking includes every unit, which is false of every listing on this surface`,
      ).not.toMatch(BARE_UNIT_CLAIM);
      unmount();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DROP-IN VARIANT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

const DROP_IN: KeyFactsProps = {
  occupancyMode: "open_capacity",
  bookingMode: "instant",
  primarySpaceType: "gym_fitness_floor",
  maxOccupancy: 20,
  // A drop-in listing may still carry a leftover unit count — 09-06 never clears the exclusive columns
  // and OC-17 permits the mode switch (09-07's lesson). The fixture keeps one so these cases can only
  // pass by keying on the persisted MODE, never on a conveniently-null column.
  unitCount: 4,
};

describe("KeyFacts — drop-in listing", () => {
  it("(9) renders exactly the four drop-in cells, in order", () => {
    const { container } = render(<KeyFacts {...DROP_IN} />);

    expect(pairs(container)).toEqual([
      ["Space", "Gym / fitness floor"],
      ["Booking", "Instant"],
      ["Day pass", DAY_PASS_VALUE],
      ["Spots a day", "Up to 20"],
    ]);
  });

  it("(10) never renders `Units`, even with a unit count of 4 on the row", () => {
    const { container } = render(<KeyFacts {...DROP_IN} />);
    const labels = pairs(container).map(([label]) => label);

    expect(
      labels,
      "a drop-in listing sells spots inside ONE shared space, so a unit count is a fact about " +
        "something the booker is not buying",
    ).not.toContain("Units");
  });

  it("(11) says `Spots a day`, and the word `Capacity` appears nowhere in it", () => {
    const { container } = render(<KeyFacts {...DROP_IN} />);
    const labels = pairs(container).map(([label]) => label);

    expect(labels).toContain("Spots a day");
    expect(
      container.textContent ?? "",
      "the 09-UI-SPEC booker vocabulary bans `capacity` on drop-in surfaces — a daily admissions " +
        "count is not a room size",
    ).not.toContain("Capacity");
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// SHAPE — the hook, the markup, and the class table
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

describe("the strip's declared shape", () => {
  it("(12) the hook is on a <dl> and there is exactly one of it", () => {
    const { container } = render(<KeyFacts {...COURTS} />);
    const strips = container.querySelectorAll('[data-testid="listing-key-facts"]');

    expect(strips).toHaveLength(1);
    expect(strips[0].tagName).toBe("DL");
  });

  it("(13) renders 3-4 pairs for every variant, and never five", () => {
    const variants: KeyFactsProps[] = [
      COURTS,
      { ...COURTS, unitCount: 1 },
      { ...COURTS, maxOccupancy: null },
      DROP_IN,
      { ...DROP_IN, maxOccupancy: null },
    ];
    for (const variant of variants) {
      const { container, unmount } = render(<KeyFacts {...variant} />);
      const count = pairs(container).length;
      expect(count, `variant rendered ${count} pairs`).toBeGreaterThanOrEqual(3);
      expect(count, `variant rendered ${count} pairs`).toBeLessThanOrEqual(4);
      unmount();
    }
  });

  it("(14) renders no icon — the strip is text only", () => {
    const { container } = render(<KeyFacts {...COURTS} />);
    expect(
      container.querySelectorAll("svg"),
      "the rejected variant had a glyph row; adding glyphs back is a third treatment nobody chose",
    ).toHaveLength(0);
  });

  it("(15) the per-cell border classes state BOTH layouts", () => {
    // A four-cell strip: below 700px it is 2×2, at and above it one row of four.
    const four = [0, 1, 2, 3].map((i) => keyFactCellClass(i, 4));

    // Below 700px — the right-hand cells of each row drop the right rule…
    expect(four[1]).toContain("border-r-0");
    expect(four[3]).toContain("border-r-0");
    // …and the first row gains a bottom rule.
    expect(four[0]).toContain("border-b");
    expect(four[1]).toContain("border-b");
    expect(four[2]).not.toContain("border-b");

    // At >=700px it is one row: cell 1 gets its right rule back, only the LAST loses it, and the
    // row rule under the first row is removed.
    expect(four[1]).toContain("min-[700px]:border-r");
    expect(four[3]).toContain("min-[700px]:border-r-0");
    expect(four[3]).not.toContain("min-[700px]:border-r ");
    expect(four[0]).toContain("min-[700px]:border-b-0");
  });

  it("(16) a three-cell strip leaves no row rule under a row that has nothing beneath it", () => {
    const three = [0, 1, 2].map((i) => keyFactCellClass(i, 3));
    // Below 700px a 3-cell strip is 2 + 1, so the first row DOES have a row beneath it…
    expect(three[0]).toContain("border-b");
    expect(three[1]).toContain("border-b");
    // …and the lone third cell has nothing under it and is last, so it carries neither rule.
    expect(three[2]).not.toContain("border-b");
    expect(three[2]).toContain("border-r");
    expect(three[2]).toContain("min-[700px]:border-r-0");
  });

  it("(17) `keyFactCells` agrees with the rendered markup — asserted ONCE, against the table above", () => {
    // The helper is checked against the literal expectation, not the other way round. This is the one
    // place the two are tied together, so a change to either must meet the table.
    expect(keyFactCells(COURTS).map((c) => [c.label, c.value])).toEqual([
      ["Capacity", "Up to 12"],
      ["Space", "Pickleball court"],
      ["Booking", "Instant"],
      ["Units", "1 of 4 courts"],
    ]);
  });
});
