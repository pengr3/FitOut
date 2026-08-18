// @vitest-environment jsdom

// BFLOW-03 / D-44 — THE SIX MOSAIC SHAPES AND THE `Show all {N} photos` PREDICATE, PINNED AT THE SEVEN
// PHOTO COUNTS THE SEED DATA ACTUALLY PRODUCES (0, 1, 2, 3, 4, 5, 8).
//
// Analog: `tests/listing/listing-card.test.tsx` — same directory, same jsdom pragma on line 1
// (`vitest.config.ts`'s environment is `node`), same `next/link` → plain-anchor stub with the same
// reason: App-Router context is absent in jsdom.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE CAN AND CANNOT SEE, STATED FIRST SO EVERY ASSERTION BELOW IS READ AT ITS REAL STRENGTH
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// jsdom applies NO Tailwind CSS. `sm:grid-cols-[2fr_1fr]` is an inert string here and `max-sm:hidden`
// hides nothing, so this file CANNOT measure a rendered mosaic — that is D-131, and it is why 12-01 put
// the gutter's real measurement in Playwright. What it CAN do, and what the gate is worth having for:
//
//   • COUNT the cells and the images. "Three photos render three cells" is a fact about the DOM, and it
//     is the whole of the no-empty-cell requirement at N = 3 and N = 4.
//   • Assert the container carries the template THIS MODULE declares for that count. The classes are
//     inert strings to the browser-less renderer, but they are the same strings Tailwind compiles, and
//     a shape regression changes them. `mosaicShape()` is imported rather than retyped, so a template
//     edit moves the expectation and the markup together — the point of declaring the shapes as data.
//   • Read the button predicate in BOTH layouts from one render. jsdom renders the superset (the button
//     element plus whatever responsive class it carries), so the COLLAPSED predicate is "the element
//     exists" and the WIDE predicate is "…and it does not carry `sm:hidden`". Asserting a class is not
//     the same thing as FINDING by one: every element below is located by role or by visible label, as
//     `availability-calendar.test.tsx:159-162` requires, and the class is then read as a PROPERTY of
//     the element that query returned.
//
// ⚠ THE NEGATIVE ASSERTION, IN `tests/search/search-card-open.test.tsx`'s FORM — AND THE FIRST DRAFT OF
// IT WAS VACUOUS, WHICH IS WHY IT IS DESCRIBED AT LENGTH. That file's whole design is asserting the
// ABSENCE of a claim over the rendered output. The absence that matters here is the HOLE: a
// `hero + 2x2` template rendered at three photos leaves ONE EMPTY CELL, which reads to a booker as a
// failed image rather than as "this host uploaded three photos".
//
// The obvious spelling — "the rendered cell count equals the photo count" — CANNOT SEE THAT DEFECT, and
// this was measured rather than reasoned about. The component slices the photo array, so three photos
// produce three `<li>`s no matter how many slots the CSS template declares; the hole lives in the
// TEMPLATE, and jsdom compiles no CSS. Probed by widening the three-photo shape to the five-up template:
// the DOM assertion stayed GREEN at 3 and 4 while the mosaic it describes had a hole in it.
//
// What can see it is the template's own arithmetic. `templateSlots()` below reads the column count, the
// row count and the hero's row span straight out of the declared class strings and computes how many
// photos the shape has ROOM for; the assertion is that this equals the number it RENDERS. A shape with a
// hole fails it by construction, at every count, without a browser.
//
// ⚠ N = 5 IS THE BOUNDARY THAT MAKES THE BUTTON PREDICATE MEAN SOMETHING. The wide mosaic shows five
// photos, so at exactly five there is nothing left to show and the button must be ABSENT above `sm:`.
// `>= 5` and `> 5` differ on precisely this count and nowhere else, which is why it is one of the seven.
//
// The ResizeObserver stub is `tests/availability/availability-calendar.test.tsx:62-68`'s, verbatim in
// intent: jsdom implements no ResizeObserver and the Radix primitives the lightbox island composes
// measure themselves. It is installed here rather than in the island's own test because the island is
// rendered BY this component (the triggers wrap each cell's `<img>`), so this file renders it too.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

import {
  PhotoGallery,
  mosaicShape,
  showAllPhotosVisibility,
  photoAlt,
  MOSAIC_MAX_CELLS,
} from "@/components/listing/photo-gallery";
import { MOSAIC_ASPECT } from "@/lib/design/measurements";
import type { PublicListingPhoto } from "@/lib/listing-public";

afterEach(cleanup);

const TITLE = "Sunset Court";

/** The seven counts the seed data actually produces. 5 is the button predicate's boundary. */
const COUNTS = [0, 1, 2, 3, 4, 5, 8] as const;

/**
 * THE BUTTON PREDICATE AS A LITERAL TABLE, and it is a literal ON PURPOSE.
 *
 * Every assertion about the button reads THIS, never `showAllPhotosVisibility()`. Asserting the
 * component's markup against the component's own helper is a tautology: flip `>` to `>=` inside the
 * helper and both sides move together, so the render assertion stays green while the mosaic at five
 * photos grows a button offering to show all five of five. Measured — that mutation left every
 * rendered assertion passing and was caught by this table alone.
 *
 * `showAllPhotosVisibility` is still asserted, once, against this table. That is the other half: the
 * table is what the requirement says, and that one assertion is what proves the component's helper
 * agrees with it rather than being dead code beside it.
 */
const EXPECTED_BUTTON: Readonly<Record<number, { collapsed: boolean; wide: boolean }>> = {
  0: { collapsed: false, wide: false },
  1: { collapsed: false, wide: false },
  2: { collapsed: true, wide: false },
  3: { collapsed: true, wide: false },
  4: { collapsed: true, wide: false },
  // THE BOUNDARY. The wide mosaic shows five photos, so at exactly five nothing is hidden up there and
  // the button must not render above `sm:`. `>= 5` and `> 5` differ here and nowhere else.
  5: { collapsed: true, wide: false },
  8: { collapsed: true, wide: true },
};

function makePhotos(n: number): PublicListingPhoto[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `photo-${i}`,
    // A broken `src` is fine — `e2e/price-parity.spec.ts:138` records that "the `<img>` exists" is all
    // these assertions need, and jsdom loads nothing anyway.
    url: `https://example.com/photo-${i}.jpg`,
    position: i,
  }));
}

/** The mosaic's own container, found by role. A `<ul>` is a `list`; there is exactly one per gallery. */
function mosaic(): HTMLElement {
  return screen.getByRole("list");
}

/**
 * One track count out of a Tailwind grid class: `sm:grid-cols-2` → 2, `sm:grid-cols-[2fr_1fr_1fr]` → 3.
 *
 * The arbitrary form is Tailwind's underscore-as-space escape, so the track count is the number of
 * underscore-separated parts inside the brackets.
 */
function tracks(grid: string, axis: "cols" | "rows"): number {
  const arbitrary = new RegExp(`grid-${axis}-\\[([^\\]]+)\\]`).exec(grid);
  if (arbitrary !== null) return arbitrary[1].split("_").length;
  const numeric = new RegExp(`grid-${axis}-(\\d+)`).exec(grid);
  return numeric === null ? 0 : Number(numeric[1]);
}

/**
 * HOW MANY PHOTOS THE DECLARED TEMPLATE HAS ROOM FOR — the assertion that can actually see a hole.
 *
 * Area arithmetic, nothing more: the grid holds `cols x rows` unit slots, the hero eats `rowSpan` of
 * them (it is one column wide and `rowSpan` rows tall), and every other photo eats exactly one. So the
 * shape fits `1 + (cols * rows - rowSpan)` photos. If that is more than the shape RENDERS, the surplus
 * slots are empty cells; if it is fewer, auto-placement would spill into an implicit row and the box
 * would grow past MOSAIC_ASPECT. Equality is the only correct answer, at every count.
 */
function templateSlots(grid: string, heroSpan: string): number {
  const cols = tracks(grid, "cols");
  const rows = tracks(grid, "rows");
  const rowSpan = heroSpan === "" ? 1 : Number(/row-span-(\d+)/.exec(heroSpan)?.[1] ?? 1);
  return 1 + (cols * rows - rowSpan);
}

/** The button, found by its VISIBLE LABEL. `null` when it is not in the document at all. */
function showAllButton(total: number): HTMLElement | null {
  return screen.queryByRole("button", { name: `Show all ${total} photos` });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// The shape table itself — asserted before any render, so a render failure cannot be read as a shape bug
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

describe("the declared shape table (D-44)", () => {
  it("names a distinct shape for every count, and never promises more cells than photos", () => {
    const names = COUNTS.map((n) => mosaicShape(n).name);
    expect(names).toEqual([
      "empty",
      "hero",
      "pair",
      "hero-stack-2",
      "hero-stack-3",
      "hero-quad",
      "hero-quad",
    ]);

    // The property that makes a hole impossible: below the cap the shape renders EXACTLY the photos it
    // has, and at or above it exactly the cap. Stated over every count, not only the ones rendered.
    for (const n of COUNTS) {
      expect(mosaicShape(n).cells, `shape for ${n} photos`).toBe(Math.min(n, MOSAIC_MAX_CELLS));
    }
  });

  it("gives every shape exactly as many SLOTS as it renders — no hole at 3, none at 4", () => {
    // Guard-the-guard FIRST. `templateSlots` is arithmetic over strings, and arithmetic over strings
    // that silently parses to zero reports a clean sweep forever. These four fixtures are never
    // rendered; they exist so a green result below means the parser worked.
    expect(tracks("sm:grid-cols-[2fr_1fr_1fr] sm:grid-rows-2", "cols")).toBe(3);
    expect(tracks("sm:grid-cols-2 sm:grid-rows-1", "cols")).toBe(2);
    expect(tracks("sm:grid-cols-[2fr_1fr] sm:grid-rows-3", "rows")).toBe(3);
    expect(templateSlots("sm:grid-cols-[2fr_1fr_1fr] sm:grid-rows-2", "sm:row-span-2")).toBe(5);

    for (const n of COUNTS.filter((c) => c > 0)) {
      const shape = mosaicShape(n);
      expect(
        templateSlots(shape.grid, shape.heroSpan),
        `\`${shape.name}\` (${shape.grid} / ${shape.heroSpan || "no hero span"}) has room for ` +
          `${templateSlots(shape.grid, shape.heroSpan)} photos and renders ${shape.cells}. A surplus ` +
          `slot is an EMPTY CELL — the muted rectangle a booker reads as a failed image. A deficit ` +
          `spills into an implicit row and the mosaic grows past MOSAIC_ASPECT. This is the assertion ` +
          `a DOM cell count cannot make: the component slices the photo array, so the <li> count ` +
          `follows the photos no matter what the template declares.`,
      ).toBe(shape.cells);
    }
  });

  it("puts the button where a photo is actually hidden, in each layout (12-UI-SPEC AC#5)", () => {
    // The collapsed mosaic shows ONE photo; the wide one shows five. Both predicates are "something is
    // hidden", which is what makes 5 → { collapsed: true, wide: false } the interesting row.
    expect(COUNTS.map((n) => showAllPhotosVisibility(n))).toEqual(
      COUNTS.map((n) => EXPECTED_BUTTON[n]),
    );
  });

  it("builds one alt form, and it carries BOTH the position and the total", () => {
    expect(photoAlt(TITLE, 0, 8)).toBe("Sunset Court — photo 1 of 8");
    expect(photoAlt(TITLE, 7, 8)).toBe("Sunset Court — photo 8 of 8");
    // The shipped forms this replaces. Asserted as absences so the copy change cannot half-land.
    expect(photoAlt(TITLE, 0, 8)).not.toContain("cover photo");
    expect(photoAlt(TITLE, 0, 8)).toMatch(/ — photo \d+ of \d+$/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// The rendered mosaic, at each of the seven counts
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

describe("PhotoGallery — the six mosaic shapes (BFLOW-03)", () => {
  it("(0) renders the muted plate, no list, no images and no button", () => {
    render(<PhotoGallery photos={makePhotos(0)} title={TITLE} />);

    expect(screen.getByText("No photos yet")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(showAllButton(0)).toBeNull();

    // The zero state is the SAME outer box as every other count — that is what the route's skeleton
    // reserves, and a short muted bar here would reintroduce the residual `loading.tsx` just closed.
    const region = screen.getByRole("region", { name: `Photos of ${TITLE}` });
    const plate = within(region).getByText("No photos yet").closest("div");
    expect(plate?.className).toContain(MOSAIC_ASPECT);
  });

  for (const n of COUNTS.filter((c) => c > 0)) {
    const shape = mosaicShape(n);
    const expectedCells = Math.min(n, MOSAIC_MAX_CELLS);

    it(`(${n}) renders the \`${shape.name}\` shape: ${expectedCells} cell(s) in one MOSAIC_ASPECT box`, () => {
      render(<PhotoGallery photos={makePhotos(n)} title={TITLE} />);

      const list = mosaic();

      // THE BOX. One aspect at every count, so the plate's height never depends on how many photos a
      // host uploaded — the whole reason `MOSAIC_ASPECT` is a constant.
      expect(
        list.className,
        `the mosaic at ${n} photos is not sized from MOSAIC_ASPECT`,
      ).toContain(MOSAIC_ASPECT);

      // THE TEMPLATE. Read from the module rather than retyped, so a template edit moves both sides.
      expect(
        list.className,
        `the mosaic at ${n} photos does not carry the \`${shape.name}\` template (${shape.grid})`,
      ).toContain(shape.grid);

      // THE CELLS. Equality, never a ceiling: `<=` is green for a template with a hole in it.
      const cells = within(list).getAllByRole("listitem");
      expect(
        cells,
        `\`${shape.name}\` rendered ${cells.length} cells for ${n} photos. At 3 and 4 photos an ` +
          `inequality here IS the empty cell — a muted rectangle that reads as a failed image.`,
      ).toHaveLength(expectedCells);
      expect(within(list).getAllByRole("img")).toHaveLength(expectedCells);

      // THE HERO SPANS, AND ONLY THE HERO. The shapes that carry a span put it on cell 1; every other
      // cell is a `max-sm:` citizen, which is what makes the collapse a real single-column layout.
      if (shape.heroSpan !== "") {
        expect(cells[0].className).toContain(shape.heroSpan);
      }
      for (const cell of cells.slice(1)) {
        expect(cell.className).toContain("max-sm:hidden");
      }
      expect(cells[0].className).not.toContain("max-sm:hidden");
    });

    it(`(${n}) alt is \`{title} — photo {i} of ${n}\` on every rendered photo, hero included`, () => {
      render(<PhotoGallery photos={makePhotos(n)} title={TITLE} />);

      const alts = screen.getAllByRole("img").map((img) => img.getAttribute("alt") ?? "");
      expect(alts).toEqual(
        Array.from({ length: expectedCells }, (_, i) => `${TITLE} — photo ${i + 1} of ${n}`),
      );
      for (const alt of alts) expect(alt).toMatch(/ — photo \d+ of \d+$/);

      // The two shipped forms this replaced. The hero used to be the only photo without an index.
      expect(alts.some((alt) => alt.includes("cover photo"))).toBe(false);
      expect(alts.some((alt) => /— photo \d+$/.test(alt))).toBe(false);
    });

    it(`(${n}) the button predicate holds in BOTH layouts`, () => {
      render(<PhotoGallery photos={makePhotos(n)} title={TITLE} />);

      // Read from the LITERAL table, never from the component's helper — see EXPECTED_BUTTON.
      const { collapsed, wide } = EXPECTED_BUTTON[n];
      const button = showAllButton(n);

      // COLLAPSED: the element's mere presence. Below `sm:` nothing hides it.
      expect(
        button === null,
        `at ${n} photos the collapsed layout should ${collapsed ? "" : "NOT "}offer ` +
          `"Show all ${n} photos" — the hero is the only photo on screen down there.`,
      ).toBe(!collapsed);

      if (button === null) return;

      // WIDE: the same element, minus `sm:hidden`. At exactly 5 the mosaic already shows every photo,
      // so the button must be hidden from `sm:` up — a button offering to show all 5 of 5 is a lie.
      expect(
        button.className.includes("sm:hidden"),
        `at ${n} photos the wide mosaic shows ${Math.min(n, MOSAIC_MAX_CELLS)} of ${n}, so the ` +
          `button should be ${wide ? "VISIBLE" : "HIDDEN"} from \`sm:\` up.`,
      ).toBe(!wide);

      // 44px hit area (D-22's `size="touch"`), because this control sits on host photography and is
      // the ONLY way to reach photos 6..N on a phone.
      expect(button.className).toContain("h-11");
    });
  }
});
