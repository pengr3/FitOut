// HSURF-01 — THE TWO GUARDS THAT CAN ACTUALLY FAIL, AT THREE VIEWPORT BANDS (D-08)
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS AT ALL, WHEN THE SUITE ALREADY SCANS THIS ROUTE FOR OVERFLOW
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `/host/listings` ships TWO defects on its card grid, and ALL THREE of the obvious assertions are
// ALREADY GREEN against both of them (MEASURED — `19-VALIDATION § Read this before writing any
// HSURF-01 assertion`):
//
//   • a document-level overflow scan passes, because `Card` carries `overflow-hidden`
//     (`src/components/ui/card.tsx:15`) — the overrun is CLIPPED, never painted outside the card;
//   • `document.scrollWidth === document.clientWidth` passes at 320px, for the same reason;
//   • "every card in a row reports the same height" passes, because the grid wrapper
//     (`src/app/(host)/host/listings/page.tsx:180`) sets NO `align-items`, so its items already
//     stretch and the card BOXES are already equal.
//
// `e2e/overflow-320.spec.ts` carries a `/host/listings` row and it is GREEN TODAY, with both defects
// shipped. That row is correct and stays byte-unchanged — its subject is the DOCUMENT, and the
// document genuinely does not overflow. This file's subject is two ELEMENTS inside the card.
//
// ⚠ THIS FILE DELIBERATELY DOES NOT IMPORT `e2e/helpers/overflow.ts`, AND THAT ABSENCE IS THE POINT.
// That helper's assertion is exactly the one that reports green against this defect. Mixing it in
// here would let a reader believe a document-level scan is part of the proof, which is the dressing-a
// -vacuous-assertion-as-evidence failure the phase's research names outright. Plan 19-02's acceptance
// criteria grep this file's import statements to keep it that way; the helper may be NAMED in prose
// (as it is here) precisely so the omission is legible rather than accidental.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO GUARDS, AND WHY FIXING EITHER DOES NOT FIX THE OTHER (D-08)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// GUARD A — the footer is FLUSH with the card's bottom edge.
//   Clause 1 (cards in a visual row end at the same bottom) is already true and is kept as a VACUITY
//   COMPANION on the measurement, and as a regression guard against anyone adding `items-start` to
//   the grid wrapper. Clause 2 — the gap between the card's bottom and its footer's bottom — is the
//   one that is red today: the footer band floats MID-CARD with dead, tinted-border-topped space
//   under it.
//
// GUARD B — `scrollWidth <= clientWidth` on `[data-slot="card-footer"]` ITSELF.
//   The footer's OWN content box is the one signal the ancestor's `overflow-hidden` cannot mask.
//   A published listing's footer holds FOUR controls (Edit, Availability, Unlist, Delete) where a
//   draft holds three, and four do not fit at any band this file measures.
//
// A fix to the vertical packing does nothing about the horizontal cluster, and vice versa. Two
// defects, two guards, one file.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ONE NAVIGATION, THREE BANDS, THREE TESTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The grid is server-rendered and its content does not depend on the viewport, so this file NAVIGATES
// ONCE and then RESIZES — the shape `host-headings.spec.ts` documents in its own header ("28 states
// cost 28 navigations rather than 84"). The page and the fixture are built in `beforeAll` and shared.
//
// ⚠ THE DESCRIBE IS **NOT** `mode: "serial"`, AND THAT IS A CORRECTNESS DECISION RATHER THAN A
// PERFORMANCE ONE. It was serial in the first draft, and the pre-fix red proved that wrong in one
// run: serial mode SKIPS every subsequent test once one fails, so the 320px band's guard-B red hid
// the `sm` and `lg` bands entirely and the run reported ONE of the six measurements this file exists
// to take. An instrument whose first finding suppresses its remaining five cannot answer "which
// bands did each guard fail at", which is the question the phase asks of it.
//
// `beforeAll` is per WORKER, so both distributions are correct: if Playwright keeps all three tests
// in one worker (the common case) there is exactly ONE sign-up, ONE seed and ONE navigation, as
// intended; if `fullyParallel` splits them, each worker builds its own independent fixture — unique
// email, unique listing ids, its own teardown — and no band is hidden by another band's red.
//
// ⚠ THE GEOMETRY CLAIMS ARE `expect.soft`, THE VACUITY GATES ARE NOT. Within a band, guard A clause
// 2 failing must not stop guard B from being measured — they are two independent defects and a fix
// to one does not touch the other, so a run that reports only the first tells the reader half of
// what it measured. The vacuity gates stay HARD: a measurement over an empty grid must abort rather
// than continue and report soft passes, because passing vacuously is the exact failure this file's
// whole design is defending against.
//
// The bands are `320 × 800`, `700 × 900` and `1280 × 900`. They are NOT 640 and 1024, which are the
// exact Tailwind `sm`/`lg` breakpoints the grid keys off (`sm:grid-cols-2 lg:grid-cols-3`): a 1px
// rounding difference AT a breakpoint changes the column count and makes the failure unreadable.
// 700 and 1280 are unambiguously inside their bands, and 1280 is what `host-headings.spec.ts` already
// uses for its wide band.
//
// ⚠ EACH BAND SETTLES ITS FONTS BEFORE MEASURING, and the settle is written out INLINE in each test
// rather than hidden inside `measureBand` below. Text reflow after a font swap changes
// `CardContent`'s height and therefore guard A clause 2's numbers, so a band that measured before the
// swap would report a different gap for the same tree. Inline is deliberate: the settle is a per-band
// obligation, and a reader counting three of them can see that all three bands honour it.
//
// ⚠ GUARD A CLAUSE 1 IS SKIPPED AT 320px, BY NAME. One column means one card per visual row and
// nothing to compare bottoms against; asserting it there would be an assertion over a set of size 1.
// Clause 2 still runs at 320px — and see the note on `measureBand` for what it is expected to say
// there against a single-column grid.

import { expect, test, type Page } from "@playwright/test";

import { BASE, seedHostGridFixture, type SeededHostGrid } from "./helpers/booker-seed";

/** One card and its footer, in viewport coordinates. */
type CardGeom = {
  cardTop: number;
  cardBottom: number;
  cardHeight: number;
  footerTop: number;
  footerBottom: number;
  footerHeight: number;
};

/** One footer's own scroll box, plus the direct children that overrun it. */
type FooterOverflow = {
  i: number;
  scrollWidth: number;
  clientWidth: number;
  offenders: string[];
};

/**
 * The designed gap between a card's bottom edge and its footer's bottom edge is ZERO — `Card`'s base
 * carries `has-data-[slot=card-footer]:pb-0` (`src/components/ui/card.tsx:15`), so this is a class
 * that was asserted rather than a tolerance somebody chose. The 1px absorbs sub-pixel layout and
 * MUST NOT BE WIDENED: every pixel above it is dead card below a tinted, top-bordered band.
 */
const FLUSH_TOLERANCE_PX = 1;

/** Cards whose top edges agree to within this are on the same visual row. */
const SAME_ROW_PX = 1;

/**
 * Read every card's box and its footer's box.
 *
 * ⚠ `getBoundingClientRect`, NOT `offsetHeight`/`offsetTop`. Clause 2 needs POSITIONS, and `offsetTop`
 * is relative to the offset parent — which, for a `position: static` card inside a grid, is not the
 * card. `getBoundingClientRect` gives viewport coordinates for both boxes, so the subtraction below
 * is unambiguous.
 */
async function readCardGeometry(page: Page): Promise<CardGeom[]> {
  return page.$$eval('[data-slot="card"]', (cards) =>
    cards.map((card) => {
      const footer = card.querySelector('[data-slot="card-footer"]');
      if (!footer) {
        throw new Error(
          "a listing card rendered no [data-slot=card-footer]. The host-action props (editHref / " +
            "onUnlist / onDelete) are what make `hasActions` true in " +
            "src/components/listing/listing-card.tsx:434, and /host/listings passes all of them — so " +
            "either this is not the host grid or the card's props contract changed.",
        );
      }
      const c = card.getBoundingClientRect();
      const f = footer.getBoundingClientRect();
      return {
        cardTop: c.top,
        cardBottom: c.bottom,
        cardHeight: c.height,
        footerTop: f.top,
        footerBottom: f.bottom,
        footerHeight: f.height,
      };
    }),
  );
}

/**
 * Read each footer's own scroll box, and name the direct children that overrun it.
 *
 * `el.children` is the right granularity: `CardFooter`'s flex children are exactly three — `Edit`,
 * `Availability`, and the `div.ml-auto` holding the destructive pair. The clipped control is inside
 * the third, and listing the three top-level children identifies it without a deep walk. A red that
 * names WHICH element overflowed is what stops a red being retried instead of read.
 */
async function readFooterOverflow(page: Page): Promise<FooterOverflow[]> {
  return page.$$eval('[data-slot="card-footer"]', (els) =>
    els.map((el, i) => {
      const box = el.getBoundingClientRect();
      return {
        i,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        offenders: Array.from(el.children)
          .filter((c) => c.getBoundingClientRect().right > box.right + 0.5)
          .map((c) => `${c.tagName.toLowerCase()}.${(c.className || "").toString().slice(0, 40)}`),
      };
    }),
  );
}

/**
 * Both guards, at one already-resized and already-settled band.
 *
 * `compareRowBottoms` is false at 320px only — see the file header.
 *
 * ⚠ WHAT CLAUSE 2 IS EXPECTED TO SAY AT 320px, so a green there is not misread as a fixed defect. In
 * a ONE-COLUMN grid every row holds a single item, the row's height is that item's height, and
 * `stretch` therefore has nothing to stretch: the footer is flush and clause 2 passes even on the
 * broken tree. The clause is still RUN at 320px — D-08 asks for it at every band and it is a real
 * regression guard there — but the band that PROVES the defect is `sm` or `lg`, where a row holds two
 * or three items of different content height. Guard B, by contrast, is at its tightest at 320px.
 */
async function measureBand(
  page: Page,
  where: string,
  { compareRowBottoms }: { compareRowBottoms: boolean },
): Promise<void> {
  const geom = await readCardGeometry(page);

  // ── VACUITY FIRST. An empty grid satisfies every assertion below it. ────────────────────────────
  expect(
    geom.length,
    `${where}: no listing cards rendered. Seed a host with at least two listings — every geometry ` +
      "claim below is vacuously true against an empty grid, and /host/listings renders `EmptyState` " +
      "(not a card) when the host owns none. If the fixture ran, check that the session reached the " +
      "grid rather than /login or /host/verify.",
  ).toBeGreaterThanOrEqual(2);

  // The first VISUAL ROW, grouped by top edge. At `lg:grid-cols-3` a host with four or more listings
  // has two rows, and comparing bottoms ACROSS rows would be red against a correct tree.
  const row = geom.filter((g) => Math.abs(g.cardTop - geom[0].cardTop) <= SAME_ROW_PX);

  // ── GUARD A, CLAUSE 1 — the cards in one visual row end at the same bottom edge. ────────────────
  // Already true today (the grid stretches them). Kept as the vacuity companion to clause 2 and as
  // the guard that goes red if anyone ever adds `items-start` to the grid wrapper.
  if (compareRowBottoms) {
    expect(
      row.length,
      `${where}: expected at least 2 cards on the first visual row at this band, saw ${row.length}. ` +
        "The grid is `sm:grid-cols-2 lg:grid-cols-3` (src/app/(host)/host/listings/page.tsx:180), so " +
        "either the fixture seeded too few listings or the viewport landed in the wrong band.",
    ).toBeGreaterThanOrEqual(2);

    const bottoms = row.map((g) => Math.round(g.cardBottom));
    expect.soft(
      new Set(bottoms).size,
      `${where}: cards in one visual row end at different bottom edges: ${JSON.stringify(bottoms)}. ` +
        "The grid wrapper sets no `align-items`, so its items stretch to the row height and these " +
        "must agree. An `items-start` (or `items-*` of any kind) added to " +
        "src/app/(host)/host/listings/page.tsx:180 is what breaks this.",
    ).toBe(1);
  }

  // ── GUARD A, CLAUSE 2 — THE ONE THAT IS RED TODAY. ──────────────────────────────────────────────
  for (const [i, g] of row.entries()) {
    const gapBelowFooter = g.cardBottom - g.footerBottom;
    expect.soft(
      gapBelowFooter,
      `${where}: card ${i} leaves ${gapBelowFooter.toFixed(1)}px of dead card BELOW its footer ` +
        `(card bottom ${g.cardBottom.toFixed(1)}, footer bottom ${g.footerBottom.toFixed(1)}). ` +
        "THE FOOTER BAND IS FLOATING MID-CARD. `Card` is `flex flex-col` with `gap-0` at the call " +
        "site (src/components/listing/listing-card.tsx:352) and NO child declares `flex-1`, so the " +
        "children pack to the top and the height the grid stretched this card to lands as dead " +
        "space under the tinted, top-bordered footer. `Card`'s base carries " +
        "`has-data-[slot=card-footer]:pb-0` (src/components/ui/card.tsx:15), so ZERO is the designed " +
        `gap and the ${FLUSH_TOLERANCE_PX}px here is sub-pixel tolerance, not a budget — do not ` +
        "widen it. THE FIX IS `mt-auto` ON CardFooter (listing-card.tsx:434), or `flex-1` on the " +
        "growing child — NOT `h-full` on `Card`, which is a MEASURED no-op because " +
        "src/app/(host)/host/listings/page.tsx:180 sets no `align-items` and the grid already " +
        "stretches its items (D-05).",
    ).toBeLessThanOrEqual(FLUSH_TOLERANCE_PX);
  }

  // ── GUARD B — the footer's OWN content box. ─────────────────────────────────────────────────────
  const footers = await readFooterOverflow(page);

  expect(
    footers.length,
    `${where}: no [data-slot="card-footer"] rendered — the host owns no listings, or \`hasActions\` ` +
      "was false for every card (src/components/listing/listing-card.tsx:434).",
  ).toBeGreaterThanOrEqual(1);

  for (const f of footers) {
    expect.soft(
      f.scrollWidth,
      `${where}: card ${f.i}'s footer overflows its own content box — scrollWidth ${f.scrollWidth} ` +
        `against clientWidth ${f.clientWidth}. THE CONTROLS ARE CLIPPED, NOT SPILLED: \`Card\` ` +
        "carries `overflow-hidden` (src/components/ui/card.tsx:15) and `Button` carries `shrink-0` " +
        "+ `whitespace-nowrap` (src/components/ui/button.tsx:74), so the overrun is cut at the " +
        "card's rounded edge and A DOCUMENT-LEVEL OVERFLOW SCAN REPORTS GREEN AGAINST THIS DEFECT " +
        "— e2e/overflow-320.spec.ts's /host/listings row passes today with this shipped, which is " +
        "why the assertion is made on the footer element ITSELF. Offenders: " +
        `${JSON.stringify(f.offenders)}. A published listing's footer holds FOUR controls where a ` +
        "draft holds three (`Unlist` is gated on status === 'published', listing-card.tsx:450). The " +
        "fix is `flex-wrap` on CardFooter at the call site (listing-card.tsx:434) plus D-07's " +
        "icon-only Delete — never a width on `Button`.",
    ).toBeLessThanOrEqual(f.clientWidth);
  }
}

test.describe("HSURF-01 — the host listing grid's footer is flush and its controls are not clipped", () => {
  // NO `mode: "serial"` — see the file header for why the first draft's serial describe reported one
  // of six measurements. The timeout covers a sign-up, a seed and a navigation inside `beforeAll`.
  test.describe.configure({ timeout: 240_000 });

  let page: Page;
  let fixture: SeededHostGrid;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    // Signs the host up through the form, gives it the D-255 approved verification row, and writes
    // three listings of deliberately different content height — one of them PUBLISHED, which is what
    // puts a FOUR-control cluster in front of guard B. See the helper's docblock for why each of the
    // three cards is the card it is.
    fixture = await seedHostGridFixture(page);
    await page.goto(`${BASE}/host/listings`);
    // The surface, before any geometry claim: a redirect to /login or /host/verify renders a real
    // document that satisfies "no cards overflowed" perfectly.
    await expect(
      page.getByRole("heading", { name: "Your listings", level: 1 }),
      "the navigation did not land on the host grid — check the fixture's session and `canHost`",
    ).toBeVisible({ timeout: 60_000 });
  });

  test.afterAll(async () => {
    await fixture?.teardown();
    await page?.close();
  });

  test("320x800 — the 320px floor, one column: guard A clause 2 and guard B", async () => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => document.fonts.ready);
    // Clause 1 is skipped here BY NAME: one column means one card per visual row and nothing to
    // compare a bottom edge against.
    await measureBand(page, "320x800", { compareRowBottoms: false });
  });

  test("700x900 — inside the sm band, two columns: both guards, both clauses", async () => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await measureBand(page, "700x900", { compareRowBottoms: true });
  });

  test("1280x900 — inside the lg band, three columns: both guards, both clauses", async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await measureBand(page, "1280x900", { compareRowBottoms: true });
  });
});
