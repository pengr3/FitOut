import { expect, test, type Locator, type Page } from "@playwright/test";

import { BASE_URL, installTruncator } from "./helpers/served-document";
import { seedTheme } from "./helpers/theme";

// STATE-01 / AC#17 / GATE-STATES — the RENDERED half of "the skeleton does not shift".
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY THERE ARE TWO LAYERS, AND WHY EITHER ONE ALONE IS A RUBBER STAMP
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `11-UI-SPEC § Loading` specifies two, and the split is not belt-and-braces:
//
//   • LAYER 1 — `tests/design/skeleton-measurements.test.ts` (plan 11-07). It proves every box class
//     in a `patterns/*skeleton*.tsx` file comes from `src/lib/design/measurements.ts` and that no
//     literal `h-`/`w-`/`aspect-` utility survives at a call site. What it CANNOT see is whether the
//     constant still describes the real content: `measurements.ts`'s own NOT COVERED footer says so
//     in as many words — *"`RESULT_CARD_MEDIA` and `AspectRatio ratio={4 / 3}` are two spellings of
//     one number in two languages, and only the ±2px Playwright comparison in plan 11-21 measures
//     the rendered result. jsdom cannot see this class of bug at all (D-131)."*
//   • LAYER 2 — this file. It puts the placeholder and the real thing on one page and measures both.
//
// A tree can pass layer 1 perfectly while the skeleton is 30px shorter than the card it stands in
// for, which is the exact defect a skeleton exists to prevent — and `row-card.tsx:150-165` records
// that this had ALREADY happened once on shipped routes (a `Card` paying its block padding twice
// measures 112px against a skeleton shimmering at 80).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// DEVIATION FROM `11-VALIDATION.md`, RECORDED RATHER THAN QUIETLY TAKEN
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `11-VALIDATION.md` maps the ±2px assertion to `--project=visual`. It is in the DEFAULT `chromium`
// project instead. A `boundingBox()` comparison needs no baseline: it compares two boxes on one page
// in one run, so there is nothing to store, nothing to commit and nothing to regenerate. The `visual`
// project, by contrast, is not created at all off Linux (D-29, `playwright.config.ts:39`), so putting
// this there would make it unrunnable on the machine where the skeletons are written — a gate the
// author cannot run is a gate that goes stale between CI runs. The requirement it satisfies —
// GATE-STATES' *"a rendering assertion in a real browser"* — is unchanged by which project it lives
// in, and plan 11-22's screenshot baselines remain the `visual` project's only tenants.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY `/dev/theme`, AND WHAT "BOTH THEMES" MEANS ON IT
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// The page needs no auth, no database and no seed — the same reason `scroll-area-overflow.spec.ts`
// and `reduced-motion.spec.ts` drive it, written out at that file's :26-30.
//
// AND IT IS WHY `seedTheme` IS NOT USED HERE, which is worth a sentence because every other spec in
// this phase calls it. `/dev/theme` renders BOTH themes at once, in two nested `[data-theme]`
// subtrees, from ONE `ThemePane` function called twice. So the two themes are two COLUMNS on one
// page rather than two runs of one page: they are compared in the same layout pass, at the same
// width, from the same markup, which is strictly stronger than seeding twice — a seeded pair could
// differ because of anything that changed between the two navigations. `seedTheme` still governs the
// ROOT theme, and that has one consequence this file has to know about, MEASURED on 17 August 2026:
//
//   page.locator('[data-theme="court"] section')  →  28   ← matches <html> AND the court pane
//   page.locator('div[data-theme="court"] section')  →  14
//
// next-themes writes the resolved theme onto the document element, and the default is court (D-06),
// so the unqualified attribute selector matches the whole document and silently doubles every count
// taken through it. Every pane locator below is therefore `div[data-theme="…"]`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IS COMPARED, AND WHAT IS DELIBERATELY NOT — THE MEASUREMENTS ARE THE ARGUMENT
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Measured on `/dev/theme` section 14 at Playwright's Desktop Chrome default (1280px), 17 August 2026:
//
//   shape       what                                   court                grove
//   ─────────── ────────────────────────────────────── ──────────────────── ────────────────────
//   card grid   skeleton cell media placeholder        179.33 × 134.48      179.33 × 134.48
//               resolved card's <AspectRatio> box      179.33 × 134.48      179.33 × 134.48
//               (whole cell, for contrast)             skeleton 190.48 tall / card 352.98 (court),
//                                                      365.09 (grove) tall
//   row list    skeleton row placeholder               578 × 80             578 × 80
//               resolved RowCard                       578 × 80             578 × 80
//   panel       PanelSkeleton block                    578 × 160            578 × 160
//               resolved PanelCard                     578 × 182            578 × 182
//
// THE CARD GRID IS COMPARED AT ITS MEDIA BOX, NOT AT ITS CELL, and that is what the constants
// actually claim. `measurements.ts` calls `RESULT_CARD_MEDIA` *"the ONE geometry fact a card grid's
// skeleton has to get right, because the media block is what sets every cell's height"*, and
// `card-grid-skeleton.tsx:53-58` says its two text bars are *"PROPORTIONS of the cell, not
// measurements of anything real"*. The numbers above agree: the media boxes match to the pixel in
// both themes, and the CELLS differ by ~162px because the placeholder's two bars were never a claim
// about the card's title, meta and price. Asserting cell equality would be asserting something no
// constant promises, and the fix for that red would be padding the skeleton until it matched — a
// number tuned to make a gate green.
//
// THE PANEL IS COMPARED ON WIDTH AND ON A FLOOR, NOT ON HEIGHT, for the same kind of reason.
// `PANEL_MIN_HEIGHT` is `min-h-40` and `measurements.ts` states its contract: *"A floor rather than a
// fixed height: panel CONTENT varies (a breakdown has three lines or five), so pinning the height
// would truncate."* The resolved panel is 182 against the placeholder's 160 — 22px TALLER, which is
// the floor working, not the floor failing. So the assertion is the one the constant makes: the same
// width, and a resolved panel that is never SHORTER than the space its placeholder claimed.
//
// Plan 11-21 asks for "width and height … within ±2px" on all three shapes. Two of the three are
// asserted exactly that way. The two exceptions above are recorded here rather than taken quietly,
// because in both cases the strict reading would assert something `measurements.ts` explicitly says
// is not true — and a gate that has to be satisfied by tuning a placeholder is worse than no gate.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AN INHERITED TRAP — STALE CSS FROM A REUSED DEV SERVER (`reduced-motion.spec.ts` trap 4).
// `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, and the dev server is what
// serves the compiled stylesheet. A server left running across a `git checkout` of
// `src/lib/design/measurements.ts` or of any `patterns/*skeleton*.tsx` can keep serving CSS that no
// longer matches the tree. IF THIS FILE FAILS ON A CLEAN `git status`, KILL THE SERVER ON :3000 AND
// RE-RUN BEFORE TOUCHING THE COMPONENT.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// WATCHED RED — TWO PROBES, RUN AND REVERTED, 17 August 2026. Command:
// `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium`
//
//   (a) THE CONSTANT MOVED. `ROW_CARD_HEIGHT` changed from `h-20` to `h-24` in
//       `src/lib/design/measurements.ts` — the skeleton follows the constant, the real row does not,
//       which is precisely the drift a shared constant is supposed to make impossible and precisely
//       what layer 1 cannot see (the class still comes from the module). **2 failed / 4 passed**,
//       one per theme, both naming the shape and both boxes:
//
//         Error: row list · court: the skeleton and its resolved twin differ by more than 2px.
//         skeleton {"width":578,"height":96} resolved {"width":578,"height":80} — Δwidth 0,
//         Δheight 16
//         expect(received).toBeLessThanOrEqual(expected)
//         Expected: <= 2
//         Received: 16
//
//       16px, in both themes, and the card-grid and panel comparisons stayed green — a mutation to
//       one constant reddens one shape, which is the blast radius that says the file is measuring
//       what it claims to. Reverted; 6 passed.
//
//   (b) VACUITY. The section index repointed from 14 to 99, i.e. a section that does not exist.
//       Every comparison in this file is `expect(Δ).toBeLessThanOrEqual(2)` over two boxes, and two
//       ABSENT boxes are two nulls. `expectReachable` failed first, as designed:
//
//         Error: court: /dev/theme has no section 99 — the pane rendered 14 sections. Every
//         comparison in this file reads two boxes out of that section, and two missing boxes are
//         two nulls; this check exists so that reads as a failure rather than as a pass.
//
//       Restored; 6 passed.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file:
//   • ONE WIDTH. Playwright's Desktop Chrome default (1280px). The three shapes are all responsive
//     grids, and nothing here says they still agree at 320px or at 768px.
//   • THE PAGE IS A PREVIEW, NOT A PRODUCT ROUTE. It proves the pattern and its skeleton agree when
//     laid out side by side in one column; it does not prove that a route which mounts one of them
//     inside its own layout gets the same answer. That is `/dev/theme`'s standing trade — no auth, no
//     database, no seed, in exchange for not being the real screen.
//   • THIS SPEC IS NOT IN CI (D-24), like the other eleven under `e2e/`. It runs locally and before
//     `/gsd:verify-work`. Push and CI green is asserted for the repository (D-25), not for this file.
//   • It measures BOXES. Two boxes can agree to the pixel while the contents inside them are wrong.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE `/dev/theme` BLIND SPOT ABOVE IS NOW COVERED FOR EXACTLY ONE CONSTANT (plan 12-01 · D-57)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// The second bullet — *"the page is a preview, not a product route"* — is what `[11-21]` recorded as
// the reason the ±4px grid-gutter drift `[11-17]` could not be measured here: `/dev/theme` renders
// the skeleton beside a RESULT CARD, not beside the real `ResultsGrid`, so the two GUTTERS never
// appear on the same page at all. The describe block at the bottom of this file closes that for
// `RESULT_GRID_GAP` and for nothing else, by measuring both states on `/` itself through
// `e2e/helpers/served-document.ts` — the pending shell (route-level `loading.tsx`, which renders
// `CardGridSkeleton`) and the resolved document (which renders `ResultsGrid`), produced by the same
// server from the same request.
//
// EVERY OTHER CONSTANT IS STILL MEASURED ON THE PREVIEW ONLY. This is one route, one constant and
// three widths; it is not a general migration of this file onto product routes, and reading it as one
// would over-trust it exactly the way this footer exists to prevent.

const PAGE = "/dev/theme";

/**
 * The tolerance, named, in `scroll-area-overflow.spec.ts:123`'s form.
 *
 * 2px rather than 0 because the shapes are laid out in a fractional-width grid — the measured media
 * box is 179.328125px wide — and sub-pixel rounding differs between a `padding-bottom` percentage
 * (Radix's `AspectRatio`) and an `aspect-ratio` declaration (the Tailwind utility). The watched red
 * above missed by 16px; 2 is nowhere near signal.
 */
const TOLERANCE_PX = 2;

/** The section on `/dev/theme` that renders each skeleton beside its resolved twin (plan 11-21). */
const SECTION_INDEX = 14;

/** How many sections each pane renders. Asserted, so a page that grew one is a red rather than a shrug. */
const SECTIONS_PER_PANE = 14;

const THEMES = ["court", "grove"] as const;
type ThemeName = (typeof THEMES)[number];

type Box = { width: number; height: number };

/**
 * The pane for one theme.
 *
 * `div[data-theme=…]` and not `[data-theme=…]` — see the header. The tag qualifier is what excludes
 * the document element, which next-themes also carries and which would make every count double.
 */
function paneOf(page: Page, theme: ThemeName): Locator {
  return page.locator(`div[data-theme="${theme}"]`);
}

/**
 * TRAP 1, in `scroll-area-overflow.spec.ts:215-223`'s form: assert the page rendered the thing under
 * test before asserting anything about it.
 *
 * Returns the section, so a caller cannot skip the guard and still get a locator.
 */
async function reachableSection(page: Page, theme: ThemeName): Promise<Locator> {
  const pane = paneOf(page, theme);
  await expect(
    pane,
    `${theme}: ${PAGE} rendered no \`div[data-theme="${theme}"]\` pane. The page renders both themes ` +
      "as two nested subtrees from one function; if one is missing, nothing below is comparing " +
      "themes at all.",
  ).toHaveCount(1);

  const sections = pane.locator("section");
  const count = await sections.count();
  expect(
    count,
    `${theme}: ${PAGE} has no section ${SECTION_INDEX} — the pane rendered ${count} sections. Every ` +
      "comparison in this file reads two boxes out of that section, and two missing boxes are two " +
      "nulls; this check exists so that reads as a failure rather than as a pass.",
  ).toBeGreaterThanOrEqual(SECTION_INDEX);
  expect(
    count,
    `${theme}: the pane rendered ${count} sections rather than ${SECTIONS_PER_PANE}. A section was ` +
      "added or removed — decide which index this file should read before bumping this number.",
  ).toBe(SECTIONS_PER_PANE);

  const section = sections.nth(SECTION_INDEX - 1);
  // Positional indexing is only safe if the position is checked. The heading carries the number, so
  // the section can say for itself which one it is.
  await expect(
    section.locator("h2").first(),
    `${theme}: the section at index ${SECTION_INDEX} does not identify itself as section ` +
      `${SECTION_INDEX}. The sections were reordered; this file reads by position.`,
  ).toHaveText(new RegExp(`^${SECTION_INDEX}\\.`));

  return section;
}

/**
 * One box, or a named failure. Never `null` reaching a comparison — that is the vacuity this file is
 * built around.
 */
async function boxOf(scope: Locator, selector: string, label: string): Promise<Box> {
  const target = scope.locator(selector).first();
  await expect(
    target,
    `${label}: no element matched \`${selector}\` inside section ${SECTION_INDEX}`,
  ).toHaveCount(1);
  const box = await target.boundingBox();
  expect(box, `${label}: \`${selector}\` matched but has no layout box (display:none?)`).not.toBeNull();
  return { width: box!.width, height: box!.height };
}

/** The ±2px claim, with both boxes and both deltas in the message. */
function expectSameBox(shape: string, theme: ThemeName, skeleton: Box, resolved: Box): void {
  const dw = Math.abs(skeleton.width - resolved.width);
  const dh = Math.abs(skeleton.height - resolved.height);
  const detail =
    `${shape} · ${theme}: the skeleton and its resolved twin differ by more than ${TOLERANCE_PX}px. ` +
    `skeleton ${JSON.stringify(skeleton)} resolved ${JSON.stringify(resolved)} — ` +
    `Δwidth ${Math.round(dw * 100) / 100}, Δheight ${Math.round(dh * 100) / 100}`;
  expect(dw, detail).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(dh, detail).toBeLessThanOrEqual(TOLERANCE_PX);
}

test.describe("AC#17 — a skeleton and its resolved twin occupy the same box", () => {
  for (const theme of THEMES) {
    test(`${theme} · the card grid's media box is the constant it shares`, async ({ page }) => {
      await page.goto(PAGE);
      await page.evaluate(() => document.fonts.ready);
      const section = await reachableSection(page, theme);

      // `RESULT_CARD_MEDIA` (`aspect-[4/3]`, the placeholder) against `<AspectRatio ratio={4 / 3}>`
      // (the card) — the two spellings `measurements.ts` names as the pair only a browser can compare.
      const skeleton = await boxOf(
        section,
        '[data-testid="skeleton-card-grid"] [data-slot="skeleton"]',
        `card grid · ${theme} · skeleton media`,
      );
      const resolved = await boxOf(
        section,
        '[data-testid="result-card"] [data-slot="aspect-ratio"]',
        `card grid · ${theme} · resolved media`,
      );
      expectSameBox("card grid media", theme, skeleton, resolved);

      // The grid CONTAINERS are the same width, which is what makes the cell-level comparison above a
      // statement about the constant rather than about two differently-sized wrappers.
      const skeletonGrid = await boxOf(
        section,
        '[data-testid="skeleton-card-grid"]',
        `card grid · ${theme} · skeleton container`,
      );
      const resolvedGrid = await boxOf(
        section,
        '[data-testid="result-card"]',
        `card grid · ${theme} · resolved cell`,
      );
      expect(
        Math.abs(skeletonGrid.width - resolvedGrid.width * 3),
        `card grid · ${theme}: the placeholder grid (${skeletonGrid.width}px) and three resolved ` +
          `cells (${resolvedGrid.width}px each) do not span the same row — the two grids are not ` +
          "laid out at the same column width, so the media comparison above is comparing wrappers.",
      ).toBeLessThanOrEqual(50);
    });

    test(`${theme} · the row list's rows are ROW_CARD_HEIGHT on both sides`, async ({ page }) => {
      await page.goto(PAGE);
      await page.evaluate(() => document.fonts.ready);
      const section = await reachableSection(page, theme);

      const skeleton = await boxOf(
        section,
        '[data-testid="skeleton-row-list"] [data-slot="skeleton"]',
        `row list · ${theme} · skeleton row`,
      );
      const resolved = await boxOf(
        section,
        '[data-testid="row-card"]',
        `row list · ${theme} · resolved row`,
      );
      expectSameBox("row list", theme, skeleton, resolved);

      // THE ABSOLUTE NUMBER, ASSERTED SEPARATELY FROM THE EQUALITY. Two boxes that agree at 96px are
      // as "equal" as two that agree at 80, and only one of those is `ROW_CARD_HEIGHT`. Its derivation
      // is 16 + 48 + 16 = 80 (`measurements.ts`), and `row-card.tsx:150-160` records the composition
      // that makes the real row measure it — a `Card` that pays its block padding twice is 112.
      expect(
        resolved.height,
        `row list · ${theme}: the resolved row measures ${resolved.height}px. ROW_CARD_HEIGHT is ` +
          "80 = 16 + 48 + 16, and the shipped rows measured 112 before `py-0` moved the padding onto " +
          "CardContent. An equality that holds at the wrong number is not this assertion.",
      ).toBe(80);
    });

    test(`${theme} · the panel's placeholder is a floor the real panel never falls below`, async ({
      page,
    }) => {
      await page.goto(PAGE);
      await page.evaluate(() => document.fonts.ready);
      const section = await reachableSection(page, theme);

      const skeleton = await boxOf(
        section,
        '[data-testid="skeleton-panel"]',
        `panel · ${theme} · skeleton`,
      );
      const resolved = await boxOf(
        section,
        '[data-testid="panel-card"]',
        `panel · ${theme} · resolved`,
      );

      expect(
        Math.abs(skeleton.width - resolved.width),
        `panel · ${theme}: the placeholder (${skeleton.width}px) and the panel (${resolved.width}px) ` +
          "are different widths. The width IS pinned — only the height is a floor.",
      ).toBeLessThanOrEqual(TOLERANCE_PX);

      // `PANEL_MIN_HEIGHT` is `min-h-40` = 160px and is documented as a FLOOR, not a height: panel
      // content varies, so pinning it would truncate. The claim is therefore one-sided — the resolved
      // panel may be taller (it is: 182 against 160, measured) and must never be SHORTER, because a
      // panel that shrinks when its data lands is the page jumping upward under the reader.
      expect(
        skeleton.height,
        `panel · ${theme}: the placeholder measured ${skeleton.height}px rather than PANEL_MIN_HEIGHT's 160`,
      ).toBeGreaterThanOrEqual(160 - TOLERANCE_PX);
      expect(
        resolved.height,
        `panel · ${theme}: the resolved panel (${resolved.height}px) is SHORTER than the space its ` +
          `placeholder claimed (${skeleton.height}px). The page moves upward when the data arrives, ` +
          "which is the shift the floor exists to prevent.",
      ).toBeGreaterThanOrEqual(skeleton.height - TOLERANCE_PX);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// D-57 / `[11-17]` — THE RESULT GRID'S GUTTER, MEASURED WHERE IT ACTUALLY RENDERS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY THIS IS NOT ON `/dev/theme` LIKE EVERYTHING ELSE IN THIS FILE. The preview page renders
// `CardGridSkeleton` beside a single `ResultCard`; it has no `ResultsGrid`, so the two gutters that
// drifted never sit on one page there. That is precisely the blind spot the footer above records and
// `[11-21]` handed forward. `/` has both — the route-level `loading.tsx` shell renders the skeleton,
// the resolved document renders the grid — and `e2e/helpers/served-document.ts` produces both states
// from ONE real response, so nothing is mocked and nothing is timed.
//
// WHY THE ABSOLUTE VALUE IS ASSERTED AS WELL AS THE EQUALITY, in one sentence: two grids that agree
// at 20px are exactly as "equal" as two that agree at 16, and only one of those is `RESULT_GRID_GAP`
// — the same argument the row-list case above makes for pinning `ROW_CARD_HEIGHT` at 80.
//
// WHY THE GUTTER IS READ ON A DIFFERENT AXIS AT 320px. `RESULT_GRID_GAP` sets `gap`, which is BOTH
// row-gap and column-gap, and the grid is one column below `sm:`. So at 320px the first two cells are
// vertically adjacent and the gutter between them is the row gap; at 768px and 1280px they are
// horizontally adjacent and it is the column gap. Reading the horizontal axis at 320px would measure
// the distance between a cell and the one BELOW it, which is not a gutter and is not a number.
//
// ── WATCHED RED, run and reverted, 18 August 2026 ────────────────────────────────────────────────
// Command: `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium --grep "D-57"`
//
//   (c) THE CONSTANT HALVED ABOVE `sm:`. `RESULT_GRID_GAP` changed from `"gap-4 sm:gap-6"` to
//       `"gap-4"` in `src/lib/design/measurements.ts` — i.e. both grids still agree perfectly, and
//       they agree at the WRONG number, which is the failure an equality-only assertion cannot see
//       and the reason the absolute value is a separate expectation.
//       PREDICTED: the 768 and 1280 steps fail on the absolute value; 320 passes; the equality clause
//       stays green at every width. OBSERVED: exactly that, in both themes. VERBATIM (grove; court is
//       identical but for the theme name):
//
//         Error: grid gutter · grove · 768px: the rendered pending gutter is 16px, but
//         RESULT_GRID_GAP declares 24px at this width (`sm:grid-cols-2` — the gutter is the COLUMN
//         gap). Two grids that agree at the wrong number are as "equal" as two that agree at the
//         right one, which is why this is asserted separately.
//         expect(received).toBeLessThanOrEqual(expected)
//         Expected: <= 2
//         Received: 8
//
//       2 failed / 0 passed under `--grep "D-57"`. The 320px step of each test ran FIRST and passed
//       (16px is correct below `sm:` either way), so the failure names the width it actually broke
//       at rather than the first one it looked at — and the six `/dev/theme` tests were untouched by
//       the mutation, because nothing on that page reads this constant for its media box. Reverted
//       (`git diff --stat` clean) → 8 passed.
//
// ── NOT COVERED, beyond the footer above ─────────────────────────────────────────────────────────
//   • THE PENDING DOCUMENT DOES NOT HYDRATE (`served-document.ts` property 1). That is correct for
//     geometry — it is the pre-hydration paint, which is exactly when a gutter mismatch is visible —
//     and it means this says nothing about the OTHER skeleton state on `/`, the `isPending` one
//     `search-results.tsx` renders inside an already-hydrated page. Both render the same component,
//     so the constant is the same; the layout around them is not measured twice.
//   • It reads the first TWO cells. A grid whose third cell disagreed with the first two would pass.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/** The pending shell's grid cells — `CardGridSkeleton`'s inner grid, then its children. */
const SKELETON_CELLS = '[data-testid="skeleton-card-grid"] > div > div';

/** The resolved grid's cells. `ResultCard` puts the hook on the `<Link>`, which IS the grid child. */
const RESOLVED_CELLS = '[data-testid="result-card"]';

/**
 * The three widths, the axis the gutter renders on at each, and the value `RESULT_GRID_GAP` declares.
 *
 * 320 is the responsive floor (`overflow-320.spec.ts`); 768 is above Tailwind's `sm:` (640) and below
 * `lg:` (1024), so it is the 2-column step; 1280 is Desktop Chrome's default and the 3-column step.
 */
const GUTTER_STEPS = [
  { width: 320, axis: "y", expected: 16, why: "one column below `sm:` — the gutter is the ROW gap" },
  { width: 768, axis: "x", expected: 24, why: "`sm:grid-cols-2` — the gutter is the COLUMN gap" },
  { width: 1280, axis: "x", expected: 24, why: "`lg:grid-cols-3` — still the `sm:` gutter value" },
] as const;

/**
 * The gap between the first two cells of a grid, or a named failure.
 *
 * Never returns a number computed from a null box — two absent cells subtract to `NaN`, and `NaN`
 * compares false against every bound, which would turn this whole block into a silent pass.
 */
async function gutterOf(
  page: Page,
  selector: string,
  axis: "x" | "y",
  label: string,
): Promise<number> {
  const cells = page.locator(selector);
  await expect(
    cells,
    `${label}: no cell matched \`${selector}\`. A gutter is the distance BETWEEN two boxes; with ` +
      "one box or none there is no gutter and every comparison below would compare nothing. Seed " +
      "the local catalogue (`npm run db:seed`) before reading this as a drift.",
  ).not.toHaveCount(0, { timeout: 15_000 });
  const count = await cells.count();
  expect(count, `${label}: matched ${count} cell(s) via \`${selector}\``).toBeGreaterThanOrEqual(2);

  const first = await cells.nth(0).boundingBox();
  const second = await cells.nth(1).boundingBox();
  expect(
    first,
    `${label}: the first cell matched but has no layout box (display:none?)`,
  ).not.toBeNull();
  expect(second, `${label}: the second cell matched but has no layout box`).not.toBeNull();

  return axis === "x"
    ? second!.x - (first!.x + first!.width)
    : second!.y - (first!.y + first!.height);
}

test.describe("D-57 — `/` renders ONE gutter in both its pending and its resolved state", () => {
  // 60s rather than the default 30s, for `overflow-320.spec.ts`'s measured reason: this block drives
  // six navigations against a dev server that compiles routes on demand.
  test.describe.configure({ timeout: 60_000 });

  for (const theme of THEMES) {
    test(`${theme} · the pending and resolved grids share RESULT_GRID_GAP at 320 / 768 / 1280`, async ({
      page,
      context,
    }) => {
      await seedTheme(context, theme);

      // Install BEFORE the first navigation — `served-document.ts`'s stated ordering.
      const truncator = installTruncator(page);
      await truncator.ready;

      for (const step of GUTTER_STEPS) {
        const where = `grid gutter · ${theme} · ${step.width}px`;
        await page.setViewportSize({ width: step.width, height: 900 });

        // ── PENDING: the shell, every boundary still in its fallback ──────────────────────────────
        truncator.set(true);
        await page.goto(`${BASE_URL}/`);
        await page.evaluate(() => document.fonts.ready);

        // VACUITY GUARD 1: the truncation actually happened. If the completion marker were ever
        // absent, this helper serves the WHOLE document in both modes and the two "states" below
        // become the same page compared with itself — every equality asserted over the pair would
        // pass and measure nothing.
        expect(
          truncator.state.cut,
          `${where}: the pending pass served an untruncated document (${truncator.state.length} ` +
            "bytes, no completion marker found). Both states would then be the same page and the " +
            "comparison would be vacuous.",
        ).toBeGreaterThan(0);

        // VACUITY GUARD 2: it is genuinely the PENDING state — the skeleton is on screen and the
        // resolved grid is not. Two states that both rendered result cards would be one state.
        await expect(
          page.locator('[data-testid="skeleton-card-grid"]'),
          `${where}: the pending shell rendered no skeleton-card-grid, so this is not the loading ` +
            "state and there is no placeholder gutter to measure.",
        ).not.toHaveCount(0, { timeout: 15_000 });
        await expect(
          page.locator(RESOLVED_CELLS),
          `${where}: the pending shell already contains result cards, so the truncation did not ` +
            "hold the page in its loading state and both measurements below are the resolved grid.",
        ).toHaveCount(0);

        const pending = await gutterOf(page, SKELETON_CELLS, step.axis, `${where} · pending`);

        // ── RESOLVED: the whole document ──────────────────────────────────────────────────────────
        truncator.set(false);
        await page.goto(`${BASE_URL}/`);
        await page.evaluate(() => document.fonts.ready);

        await expect(
          page.locator('[data-testid="skeleton-card-grid"]'),
          `${where}: the resolved document still shows the skeleton, so the second measurement is ` +
            "the placeholder again and this test is comparing one grid with itself.",
        ).toHaveCount(0, { timeout: 15_000 });

        const resolved = await gutterOf(page, RESOLVED_CELLS, step.axis, `${where} · resolved`);

        // ── THE EQUALITY: the `[11-17]` drift, on the route where it renders ──────────────────────
        expect(
          Math.abs(pending - resolved),
          `${where}: the placeholder grid's gutter (${pending}px) and the resolved grid's ` +
            `(${resolved}px) differ by more than ${TOLERANCE_PX}px on the SAME route. Both read ` +
            "RESULT_GRID_GAP, so this is either a second gutter written at a call site or a " +
            "wrapper adding space between the cells — the ±4px drift `[11-17]` recorded, re-opened.",
        ).toBeLessThanOrEqual(TOLERANCE_PX);

        // ── THE ABSOLUTE VALUE, ASSERTED SEPARATELY AND FOR EACH STATE ────────────────────────────
        for (const [state, measured] of [
          ["pending", pending],
          ["resolved", resolved],
        ] as const) {
          expect(
            Math.abs(measured - step.expected),
            `${where}: the rendered ${state} gutter is ${measured}px, but RESULT_GRID_GAP declares ` +
              `${step.expected}px at this width (${step.why}). Two grids that agree at the wrong ` +
              'number are as "equal" as two that agree at the right one, which is why this is ' +
              "asserted separately.",
          ).toBeLessThanOrEqual(TOLERANCE_PX);
        }
      }
    });
  }
});
