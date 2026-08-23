import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

import { BASE_URL, installTruncator } from "./helpers/served-document";
import { seedTheme } from "./helpers/theme";

// STATE-01 / AC#17 / GATE-STATES — the RENDERED half of "the skeleton does not shift".
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS FILE COVERS, AS OF PLAN 14-15
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
//   1. The three PATTERN shapes, on the `/dev/theme` preview at one width — card grid, row list,
//      panel. The original block, unchanged.
//   2. The results grid's GUTTER on `/` at three widths, in both the pending and the resolved state
//      (D-57 / `[11-17]`).
//   3. ⟵ NEW ⟶ The three HOST ROW shapes, on their own product routes, at the 320px floor and at the
//      desktop width: the dashboard's agenda row, the request inbox's row and the host bookings
//      row. Each is compared against the bar its own `loading.tsx` draws, in the pending shell of
//      the same route, produced by the same server from the same request.
//
// THE HOST NUMBERS IN BLOCK 3 WERE MEASURED IN THIS PHASE AGAINST THE RENDERED ROUTES — not carried
// forward from 14-RESEARCH, whose § Measurements table publishes a ±8px error bar and reconstructs
// those three cases from class recipes rather than from the components. Its own instruction was to
// re-measure before writing a number into a test. Two of its three reconstructions turned out to be
// wrong by more than its error bar, and one of them was wrong about the SHAPE: it described the host
// booking row as carrying a trailing line and an actions row, and the resting row on that list has
// neither. The numbers below are what the browser reported.
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

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 14-15 — THE THREE HOST ROW SHAPES, EACH AGAINST THE BAR ITS OWN PLATE DRAWS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHAT WAS WRONG BEFORE THIS BLOCK EXISTED. All three host loading plates drew the shipped 80px row
// bar, and not one of the three lists arrives at 80px. Measured on 23 August 2026, on the rendered
// routes, with real seeded data:
//
//   shape                  route             320px    desktop   the bar all three plates drew
//   ────────────────────── ───────────────── ──────── ───────── ────────────────────────────────
//   agenda row             /host             132.00   72.00     80   (+52 / −8)
//   request row            /host/requests    254.05   83.02     80   (+174 / +3)
//   host booking row       /host/bookings    196.00   37.02     80   (+116 / −43)
//
// ⚠ THE HOST BOOKING ROW'S TWO STARRED NUMBERS WERE RE-MEASURED BY `[14-16]` AND ARE NOW 176.00 AND
// 36.52 — not because the row changed, but because 196/37.02 were taken against a fixture whose
// window label moved with the wall clock. The block at the foot of this header has the whole story;
// the row above is left as 14-15 recorded it so the correction is visible rather than overwritten.
//
// 174px of under-draw, four rows deep, is roughly 700px of page arriving under the reader after the
// data lands — on the one host surface whose entire subject is a deadline. That is the layout shift
// STATE-01 exists to remove, caused by the thing built to prevent it.
//
// ⚠ ABOVE THE MEDIUM BREAKPOINT TWO OF THESE ROUTES DO NOT RENDER A ROW CARD AT ALL. `/host/requests`
// and `/host/bookings` each render two trees and show exactly one per width: a card stack below the
// breakpoint, a TABLE at and above it. So the desktop numbers are TABLE ROW heights, and the row
// under test is chosen by width. Measuring the card at 1280 would measure a `display:none` subtree —
// whose box is zero — and every comparison here would then be 0-against-0 and pass while measuring
// nothing. `e2e/host-inbox-hierarchy.spec.ts` recorded that trap from the other side; this block
// asserts the row is VISIBLE before it reads a box.
//
// WHY THE TOLERANCE IS 4px HERE AND 2px ABOVE. 14-UI-SPEC § Measurements Owed states the falsifiable
// for exactly these shapes as `|rendered row height − skeleton row height| <= 4px` at 320 and 1280.
// The pattern shapes above are compared against a constant that describes the same box in the same
// units, so 2px is the sub-pixel budget there. Here the rendered rows land on fractional pixels
// (254.05, 83.02, 37.02) while a declared height must land on the 4px spacing ladder, so the nearest
// legal step is up to 2px away before anything has drifted at all. 4 is the spec's number, and every
// shape below clears it with room: the worst measured delta is 1.95px.
//
// WHY THE ABSOLUTE VALUES ARE ASSERTED SEPARATELY FROM THE DIFFERENCE — the same argument the row-list
// case and the D-57 gutter case above both make: a bar and a row that agree at the wrong number are
// exactly as "equal" as two that agree at the right one. A plate and a list that both drifted to
// 300px would satisfy the difference clause perfectly.
//
// ── THE FIXTURE ──────────────────────────────────────────────────────────────────────────────────
// One host signed up through the UI (so no password is re-entered and the sign-in rate limiter at
// `src/lib/auth.ts` is never approached), one published listing with an activated payout wallet, and
// six bookings with ONE BOOKER EACH: two confirmed today (the agenda), two confirmed at fixed
// far-future venue-local days (the bookings list's RESTING row, in each of its two wrap counts), and
// two still awaiting an answer (the request inbox, and the bookings list's second shape). Torn down
// in `afterAll`, in the foreign-key order `booker-seed.ts` records.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// `[14-16]` — WHY THE FIXTURE NAMES ABSOLUTE DAYS, AND WHY THAT IS THE FIX RATHER THAN A NEW NUMBER
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE DEFECT. Every seeded booking used to be positioned RELATIVE to the DB clock —
// `date_trunc('day', now() …) + make_interval(days => n)`. A booking three days out is therefore a
// different venue-local DAY every day, `composeWhenLabelShort` renders a different string for it,
// and at the 320px floor that string's rendered WIDTH decides how many lines the row's meta
// paragraph wraps to. A wrapped `text-sm` line is 20px. So a tightly-pinned row height at 320 was a
// pin on the date the measurement was taken, and this file went red overnight with nothing in
// `src/` having moved:
//
//     Error: host booking row · /host/bookings · 320px: the resolved card measures 176px, but this
//     shape was measured at 196px when its height was declared.   Expected: <= 4   Received: 20
//
// 14-15's own decision 3 predicted the mechanism verbatim and then pinned a tight number against it
// anyway. Re-measuring and re-pinning would have re-armed it for the next date that wraps
// differently, which is exactly what `[14-16]` refused to do.
//
// THE FIX IS A PROPERTY OF THE FIXTURE, NOT A NUMBER. Two knobs, both measured:
//
//   1. THE MEASURED CONFIRMED BOOKINGS ARE SEEDED AT ABSOLUTE VENUE-LOCAL DAYS (`HOST_FIXED_DAY_2L`
//      / `HOST_FIXED_DAY_3L`, both in 2099 so the row stays on the `upcoming` tab for the product's
//      lifetime). `composeWhenLabelShort` renders no year, so a 2099 row is indistinguishable on
//      screen from next week's — but its label is now a LITERAL, asserted byte for byte.
//   2. THE LISTING TITLE IS A MEASURED CONSTANT (`HOST_LISTING_TITLE`). The agenda row genuinely
//      cannot be moved off the clock — the dashboard shows only the venue's local TODAY (D-140 /
//      D-141) — so its determinism comes from the other side of the same meta line: the title's
//      length was chosen by measuring all 13,020 labels the line can compose and taking a value at
//      which every one of them wraps to exactly four lines.
//
// AND WHERE NEITHER KNOB REACHES, THE WRAP COUNT IS READ RATHER THAN ASSUMED. Every card-tree step
// now asserts the meta paragraph's LINE COUNT (from `Range.getClientRects()`, not from the height)
// alongside its label, so "the calendar moved" and "the row's composition changed" are two
// different reds with two different messages. The one row whose date is genuinely unpinnable in
// both directions — a pending REQUEST, whose D-99 reason line is itself a statement about how far
// away the session is — derives its expected over-run from its own observed wrap count instead of
// sitting inside a band wide enough to hide a line. See the deviation case at the foot of this
// block.
//
// ── HOW THE FIX WAS DEMONSTRATED, RATHER THAN ASSERTED ───────────────────────────────────────────
// Measured in Chromium against the rendered routes on 24 August 2026, with a throwaway harness that
// swapped each row's meta paragraph in place and re-read the card's box:
//
//   • THE BUG, REPRODUCED ON THE ROUTE. Eight copies of the RESTING shape seeded at day offsets 1…8
//     — i.e. eight different "todays" in one run — measured 176, 196, 176, 176, 176, 196, 196, 176.
//     Same markup, same CSS, same request: only the composed label differed.
//   • THE FULL RANGE. Over every date token `EEE, MMM d` can ever produce (7 × 12 × 31 = 2,604)
//     against five window spellings covering both digit-length classes on both bounds — 13,020
//     labels — the shape takes exactly TWO heights at 320px, 176 and 196, and never a third.
//   • THE FIX, WITH THE SAME INSTRUMENT. With `HOST_LISTING_TITLE` in place the agenda row measures
//     132px / 4 lines on all 13,020, and 72px / 1 line at 1280 on all 13,020. With absolute days in
//     place the two bookings rows compose one string each, so their heights are literals.
//   • THE REQUEST ROW NEEDED NO CHANGE, AND THAT WAS MEASURED TOO: 254.05px / 3 meta lines on all
//     13,020 labels AND on thirteen reason-line spellings from "under an hour" to "999h" — one
//     distinct value across 13,033 measurements. Its 320px height is set by the status column, the
//     description list and the actions row, none of which the label touches.
//
// ⚠ WHAT THIS STILL CANNOT CATCH, stated so the next reader under-trusts it. The agenda's
// determinism rests on a MEASURED PLATEAU, not on a proof: `HOST_LISTING_TITLE` sits with about one
// character of margin below and two above, so a change to the type scale, to the meta column's
// width or to the `·` separator could move the plateau out from under it. That would surface as the
// wrap-count clause going red — which is the point — but it would surface on this file's next run,
// not at the moment the change was made. The five window spellings are also a sample: they cover
// both digit-length classes on both bounds, which is the property that drives the wrap, but they
// are not all 288 possible hour pairs.
//
// ── WATCHED RED — TWO PROBES, RUN AND REVERTED, 23 August 2026 ───────────────────────────────────
// Command: `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium --grep "14-15"`
//
//   (d) A PLATE DRAWS ANOTHER SHAPE'S HEIGHT. `requests/loading.tsx` was changed to pass
//       `HOST_BOOKING_ROW_HEIGHT` instead of its own constant — the realistic shape of this
//       regression, since both are legal values of the prop's type and the compiler cannot tell one
//       declared height from another. The DECLARED-VALUE clause fired first, which is the right
//       order: "the plate is drawing the wrong constant" and "the row changed" are different bugs
//       and deserve different reds. Verbatim:
//
//         Error: request row · /host/requests · 320px: the plate drew a 196px bar, but this shape's
//         declared height in src/lib/design/measurements.ts is 256px. Either the plate is passing a
//         different constant than the one this shape's row was measured against, or the constant
//         itself moved without this table moving with it.
//         expect(received).toBeLessThanOrEqual(expected)
//         Expected: <= 0.5
//         Received:    60
//
//       1 failed / 2 passed. The AGENDA case stayed green — a mutation to one plate reddens one
//       shape, which is the blast radius that says this block measures what it claims to. Reverted.
//
//   (e) THE CONSTANT RETURNS TO THE SHIPPED BAR, WITH THE TABLE MOVED TO MATCH IT. This is the probe
//       that proves the DIFFERENCE clause is not dead code sitting behind the declared-value clause:
//       `HOST_AGENDA_ROW_HEIGHT` was set back to the shipped 80px row constant AND this file's agenda
//       row was given `bar: 80` at both widths, so the plate and the table agree perfectly — at the
//       number that was wrong before this plan. Verbatim:
//
//         Error: agenda row · /host · 320px: the plate's bar (80px) and the card that arrives
//         (132px) differ by more than 4px — the page moves by 52px per row when the data lands,
//         which is the layout shift the loading plate exists to remove. Fix the DECLARED height for
//         this shape, not this number.
//         expect(received).toBeLessThanOrEqual(expected)
//         Expected: <= 4
//         Received:    52
//
//       1 failed / 1 passed. That 52px is exactly the defect this plan was written to remove, and it
//       is now a red rather than a paragraph. Both probes reverted; `git status` clean; 13 passed.
//
// ── WATCHED RED — THREE MORE PROBES FOR THE `[14-16]` CLAUSES, run and reverted, 24 August 2026 ───
// Command: `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium --grep "14-15"`
//
//   (f) THE FIXTURE GOES BACK ON THE CLOCK. The resting booking's `localDate: HOST_FIXED_DAY_2L`
//       replaced by `dayOffset: 3` — i.e. the exact fixture `[14-16]` was filed against. This is the
//       probe that matters, and its result is stronger than the height clause could have been:
//
//         Error: host booking row · /host/bookings · 320px: the window label composed as
//             "Thu, Aug 27, 9:00 AM – 11:00 AM (Makati time)"
//         but this fixture seeds this booking at an ABSOLUTE venue-local instant (2099-11-12), so it
//         must compose
//             "Thu, Nov 12, 9:00 AM – 11:00 AM (Makati time)"
//         every day, forever. …
//         Expected: "Thu, Nov 12, 9:00 AM – 11:00 AM (Makati time)"
//         Received: "Thu, Aug 27, 9:00 AM – 11:00 AM (Makati time)"
//
//       ⚠ NOTE WHAT THAT PROVES. "Thu, Aug 27" happens to wrap to TWO lines, so the row measured
//       176px and every height clause in this file would have PASSED. The regression was caught
//       anyway, by name, on a day when the number agreed — which is the difference between a gate
//       that pins a value and one that pins the reason the value holds. 1 failed / 3 passed;
//       reverted.
//
//   (g) THE TITLE LEAVES THE MEASURED PLATEAU. `HOST_LISTING_TITLE` shortened to `"Geo Courts"`,
//       which the sweep says wraps to three lines on every date rather than four:
//
//         Error: agenda row · /host · 320px: the meta line wraps to 3 lines today; it wrapped to 4
//         when this shape's height was measured. That is 20px of row height, and it is the defect
//         `[14-16]` exists to name out loud instead of leaving it to surface as an unexplained 20px
//         below. The label was "Geo Courts · Mon, Aug 24, 8:00 AM – 10:00 AM (Makati time)". …
//         Expected: 4   Received: 3
//
//       That message is the deferred item's own specification of what a red here should say. 1
//       failed / 1 passed; reverted.
//
//   (h) THE ACTIONS ROW'S COST MOVES. `PENDING_ACTIONS_COST_320` set to 36 — the number the old
//       band's low end was built on — to prove the derived over-run is live and not `extra === 0`
//       dead code:
//
//         Error: bookings deviation · 320px · Perlita: a still-pending booking's card measures 252px
//         against the plate's 176px bar — an over-run of 76px where 56px was expected, because this
//         row's label ("Sat, Aug 29, 9:00 AM – 11:00 AM (Makati time)") wraps to 3 lines, 1 more
//         than the 2 the 176px bar is declared against, so the expected over-run is 36 + 1 × 20. …
//         Expected: <= 4   Received: 20
//
//       The wrap term was genuinely non-zero on the day it ran, so the derivation was exercised
//       rather than short-circuited. 1 failed / 5 passed; reverted. `git status` clean; 14 passed.

/** The Playwright process does not load `.env`; fall back to the deterministic dev URL. */
const HOST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

/** The seeded listing's venue timezone. Every window label below is composed in THIS zone. */
const HOST_VENUE_TZ = "Asia/Manila";
const HOST_VENUE_CITY = "Makati";

/**
 * The range separator `when-label.ts` composes with: U+2013 EN DASH, not a hyphen-minus.
 *
 * Spelled as an escape rather than as the glyph so that a declared label below cannot silently
 * become a different string through a copy-paste, an editor's smart-punctuation or a file-encoding
 * round trip. Read off the rendered DOM (`charCodeAt` → 8211) rather than off the composer's source.
 */
const WINDOW_DASH = "–";

/**
 * A wrapped line of a row's `text-sm` meta paragraph: 20px (Tailwind's `text-sm` line-height,
 * 1.25rem).
 *
 * This is the STEP every number in this block moves by when a label wraps one line further, and it
 * is the whole mechanism `[14-16]` records. It is named here because two assertions below derive an
 * expected height from an OBSERVED line count, and a derivation with a magic 20 in it is a
 * derivation nobody can check.
 */
const META_LINE_PX = 20;

/**
 * The two venue-local calendar days the MEASURED confirmed bookings are seeded on — absolute
 * literals, not offsets from `now()`.
 *
 * ⚠ THIS IS THE `[14-16]` FIX, AND THE DATES ARE LOAD-BEARING. See the block header above for the
 * defect. In one sentence: a booking positioned as "today + 3 days" composes a DIFFERENT window
 * label every day, the label's wrap count at 320px moves with it, and a 20px row-height step follows
 * — so a tight pin here was a pin on the date it was taken. An absolute instant composes ONE label,
 * forever, and `composeWhenLabelShort` renders no year, so a 2099 date is indistinguishable on
 * screen from next week's.
 *
 * 2099 rather than next month because the row must stay on the `upcoming` tab for the product's
 * lifetime; a date that expires is the same bug with a longer fuse.
 *
 * The two days are chosen to compose the two DIFFERENT wrap counts this shape can take at 320px (see
 * `HOST_BOOKING_2L_LABEL` / `HOST_BOOKING_3L_LABEL`), so the file pins both of them.
 */
const HOST_FIXED_DAY_2L = "2099-11-12";
const HOST_FIXED_DAY_3L = "2099-01-12";

/**
 * The two labels those two days compose, byte for byte.
 *
 * ASSERTED, NOT DOCUMENTED. Each is compared against the rendered `<p>` on the route, which is what
 * makes "this fixture is date-independent" a command rather than a claim: if `when-label.ts`'s
 * format, the tz database, `date-fns` or the venue's city ever changes the composed string, this
 * fails by NAME — printing both strings — instead of surfacing later as an unexplained 20px.
 */
const HOST_BOOKING_2L_LABEL = `Thu, Nov 12, 9:00 AM ${WINDOW_DASH} 11:00 AM (${HOST_VENUE_CITY} time)`;
const HOST_BOOKING_3L_LABEL = `Mon, Jan 12, 9:00 AM ${WINDOW_DASH} 11:00 AM (${HOST_VENUE_CITY} time)`;

/** The password every UI signup in this repo uses (`shell.spec.ts`, `host-dashboard.spec.ts`). */
const HOST_PASSWORD = "averylongpassword";

/** Frozen money on every seeded booking. Only the bookings row renders any of it. */
const HOST_SPACE_PRICE_CENTS = 100_000;
const HOST_SERVICE_FEE_CENTS = 5_000;
const HOST_QUOTED_TOTAL_CENTS = HOST_SPACE_PRICE_CENTS + HOST_SERVICE_FEE_CENTS;

/**
 * Tailwind's medium breakpoint, where both list routes swap a card stack for a table.
 *
 * Named rather than inlined, because it is the reason the row locator below is a function of width
 * and not a constant — and a reader who does not know that reads every desktop number as a card.
 */
const HOST_MD_BREAKPOINT_PX = 768;

/**
 * 14-UI-SPEC § Measurements Owed' falsifiable, verbatim: `|rendered − skeleton| <= 4px`.
 *
 * Deliberately NOT the file's `TOLERANCE_PX` — see the header for why these shapes get a different
 * budget than the pattern shapes on `/dev/theme`.
 */
const HOST_TOLERANCE_PX = 4;

/**
 * How far a rendered BAR may sit from the pixel value its declared class compiles to.
 *
 * A height utility resolves to an exact multiple of the 4px spacing step, so this is rounding and
 * nothing else. It is separate from the tolerance above on purpose: that one is about a placeholder
 * describing content, this one is about a class compiling to the number the plan says it does.
 */
const HOST_BAR_EXACT_PX = 0.5;

/**
 * The six bookers — ONE PER SEEDED BOOKING, which is a correctness requirement and not a flourish.
 *
 * Every locator in this block addresses its row by the guest's first name (`hostRowLocator`), and
 * `heightOf` asserts `toHaveCount(1)`. Before `[14-16]` the fixture reused three bookers across five
 * bookings, so `Marisol` named BOTH a confirmed session today and a pending request — two rows on
 * `/host/bookings`, and therefore a `toHaveCount(1)` that passed only while today's session had
 * already ended and dropped off the `upcoming` tab. That is a second wall-clock dependency in the
 * same fixture: the file went green in the evening and would have failed the same morning. One
 * booker per booking removes it outright.
 */
const AGENDA_GUEST = "Marisol";
const AGENDA_GUEST_2 = "Teodoro";
const RESTING_GUEST = "Corazon";
const WRAP_GUEST = "Anselmo";
const PENDING_GUEST = "Perlita";
const PENDING_GUEST_2 = "Rogelio";

type HostSeed = {
  readonly hostEmail: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly sql: ReturnType<typeof postgres>;
  readonly bookerIds: string[];
  teardown(): Promise<void>;
};

/**
 * Sign a host up through the UI — `host-dashboard.spec.ts:127`'s idiom, not re-derived.
 *
 * The signup IS the sign-in, so this block issues zero requests to the rate-limited sign-in route.
 */
async function signUpGeometryHost(page: Page): Promise<string> {
  const email = `e2e.geo.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE_URL}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Hosty");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(HOST_PASSWORD);
  await page.getByRole("button", { name: /sign up to host/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
  return email;
}

/**
 * The seeded listing's title — a FIXED twenty-four-character string, and the second half of the
 * `[14-16]` fix.
 *
 * ⚠ THE TITLE IS A MEASUREMENT, NOT A NAME. The agenda row's meta line is
 * `${spaceTitle} · ${whenLabel}` (`host-agenda.tsx`), so at 320px its wrap count — and therefore the
 * row's height, at 20px a line — is decided jointly by this string's rendered width and by the
 * date the label happens to name. 14-15 already knew half of this and pinned the title's LENGTH; it
 * pinned the wrong length, and it pinned a length rather than a string.
 *
 * BOTH FAULTS ARE FIXED HERE, and both were measured rather than reasoned:
 *
 *   • IT IS NO LONGER RANDOM. The old value was `Geo Courts ${runId.slice(0, 6)}` — six hex
 *     characters of a UUID. Hex glyphs are not the same width in a proportional face, so "seventeen
 *     characters" was seventeen characters of an unpredictable WIDTH, run to run.
 *   • THE LENGTH IS CHOSEN SO THE WRAP COUNT CANNOT MOVE. Measured in Chromium at 320px by swapping
 *     this paragraph's text in place and reading `Range.getClientRects().length`, over the full
 *     cross product of every date token `EEE, MMM d` can ever compose (7 weekdays x 12 months x 31
 *     days = 2,604) and five window spellings covering both digit-length classes on both bounds —
 *     13,020 labels:
 *
 *       old title (17 chars)                 3 lines / 112px  ×2,050    4 lines / 132px  ×554
 *       "Geo Courts Poblacion O"   (22)      3 lines / 112px  ×14       4 lines / 132px  ×2,590
 *       "Geo Courts Poblacion On"  (23)      —                          4 lines / 132px  ×2,604
 *       "Geo Courts Poblacion One" (24)      —                          4 lines / 132px  ×2,604  ←
 *       "Geo Courts Poblacion Ones"(25)      —                          4 lines / 132px  ×2,604
 *       "Geo Courts Poblacion Onesw"(26)     —                          4 lines / 132px  ×2,604
 *
 *     So the shipped 17-character fixture rendered the DECLARED 132px on 21% of dates and 112px on
 *     the other 79% — `HOST_AGENDA_ROW_HEIGHT`'s narrow value was one date's luck, exactly as the
 *     bookings row's was. The chosen string sits mid-plateau with at least one character of margin
 *     below and two above, and produces 4 lines / 132px on every date and every window spelling.
 *
 * IT IS ALSO NOT A UNIQUENESS TOKEN. Nothing addresses a row by this string — every locator in this
 * block uses the guest's first name — and the listing's own id still carries the run's UUID, so two
 * runs cannot collide on anything that matters.
 */
const HOST_LISTING_TITLE = "Geo Courts Poblacion One";

/**
 * One published, bookable listing owned by the signed-up host.
 *
 * ⚠ THE TITLE IS PART OF THE FIXTURE — see `HOST_LISTING_TITLE` above for the measurement that
 * chose it. Changing it is not a cosmetic edit to this file; it is a change to one of the numbers
 * this file asserts.
 */
async function seedGeometryHost(hostEmail: string): Promise<HostSeed> {
  const sql = postgres(HOST_DATABASE_URL, { max: 1, onnotice: () => {} });
  const runId = randomUUID();

  const [host] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${hostEmail}`;
  if (!host) {
    await sql.end();
    throw new Error(
      `the host signed up as ${hostEmail} is not in the database, so there is no owner to hang a ` +
        "listing on. The signup drive above did not persist a user.",
    );
  }

  const listingId = `e2e_geo_listing_${runId}`;
  const listingTitle = HOST_LISTING_TITLE;

  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${host.id}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;

  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, occupancy_mode,
      currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${host.id}, ${listingTitle},
      ${"A covered court with two hoops and a scoreboard."}, ${"multi_sport_court"}::space_type,
      ${"3 Real Street"}, ${HOST_VENUE_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${10}, ${1}, ${HOST_VENUE_TZ},
      ${47333}, ${288888}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      now(), now(), now()
    )
  `;

  const bookerIds: string[] = [];

  return {
    hostEmail,
    listingId,
    listingTitle,
    sql,
    bookerIds,
    async teardown() {
      // ORDER IS LOAD-BEARING (`booker-seed.ts`): `booking.booker_id` is ON DELETE RESTRICT, so the
      // bookings and their notifications go first, then the bookers, then the host — whose deletion
      // cascades to the listing.
      await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${listingId})`;
      await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
      for (const id of bookerIds) await sql`DELETE FROM "user" WHERE id = ${id}`;
      await sql`DELETE FROM "user" WHERE email = ${hostEmail}`;
      await sql.end();
    },
  };
}

/** A booker with a known first name — the string every row locator below addresses its row by. */
async function addGeometryBooker(seed: HostSeed, firstName: string): Promise<string> {
  const id = `e2e_geo_booker_${randomUUID()}`;
  await seed.sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (${id}, ${`E2E ${firstName}`}, ${`${id}@example.com`}, ${true}, ${firstName}, ${false}, ${true}, now(), now())
  `;
  seed.bookerIds.push(id);
  return id;
}

/**
 * WHEN a seeded booking happens, in the venue's own local day — and the ONE decision `[14-16]` is
 * about.
 *
 *   • `dayOffset` positions the window RELATIVE to the DB clock. The label it composes is therefore
 *     a different string every day, and at 320px its wrap count moves with the calendar. Correct —
 *     necessary — for a row whose SUBJECT is "how far away is this": the dashboard agenda only ever
 *     shows sessions in the venue's local TODAY (D-140/D-141), and a request's D-99 reason line
 *     literally reads "Session starts in {n}h".
 *   • `localDate` positions it at an ABSOLUTE venue-local calendar day. The label is then a literal,
 *     the wrap count is a property of the fixture, and a height measured against it cannot move with
 *     the wall clock. This is what every MEASURED, tightly-pinned row uses.
 *
 * Either way the instants are built by POSTGRES in the venue's zone — `host-dashboard.spec.ts:263`'s
 * argument, which is that "08:00 in Manila" is a property of a venue's local day and not of any
 * instant this Node process can name. The absolute branch is the same statement with the day named
 * instead of derived: `TIMESTAMP '2099-11-12 09:00' AT TIME ZONE 'Asia/Manila'`.
 */
type GeometryWindow =
  | { readonly dayOffset: number; readonly localDate?: undefined }
  | { readonly localDate: string; readonly dayOffset?: undefined };

/**
 * One booking, positioned by VENUE-LOCAL day (absolute or relative) and hour.
 */
async function addGeometryBooking(
  seed: HostSeed,
  args: GeometryWindow & {
    bookerId: string;
    startHour: number;
    endHour: number;
    status: "confirmed" | "requested";
  },
): Promise<void> {
  const id = `e2e_geo_booking_${randomUUID()}`;
  // One expression per bound, chosen by which branch the caller asked for. Both produce a
  // `timestamptz` from a venue-local wall time; only the DAY differs in where it comes from.
  const bound = (hour: number) =>
    args.localDate != null
      ? seed.sql`(${args.localDate}::timestamp + make_interval(hours => ${hour})) AT TIME ZONE ${HOST_VENUE_TZ}`
      : seed.sql`(date_trunc('day', now() AT TIME ZONE ${HOST_VENUE_TZ})
          + make_interval(days => ${args.dayOffset ?? 0}, hours => ${hour})) AT TIME ZONE ${HOST_VENUE_TZ}`;
  await seed.sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
      currency, payment_id, payment_method, expires_at, checkout_session_id,
      refund_cents, cancelled_by, cancelled_at, open_capacity, declared_pax, created_at
    ) VALUES (
      ${id}, ${seed.listingId}, ${1}, ${args.bookerId},
      ${bound(args.startHour)}, ${bound(args.endHour)},
      ${args.status}::booking_status, ${"request"}::booking_mode,
      ${"standard"}::cancellation_policy,
      ${HOST_SPACE_PRICE_CENTS}, ${HOST_SERVICE_FEE_CENTS}, ${HOST_QUOTED_TOTAL_CENTS}, ${"php"},
      ${null}, ${null}, ${null}, ${null},
      ${null}, ${null}::cancelled_by, ${null},
      ${false}, ${null},
      now()
    )
  `;
  if (args.status === "requested") {
    // A live approval deadline, comfortably clear of the one-hour alarm threshold, so the row renders
    // its ordinary shape rather than its escalated one.
    await seed.sql`UPDATE "booking" SET expires_at = now() + make_interval(hours => ${20}) WHERE id = ${id}`;
  }
}

/**
 * One shape: the route, the plate's bar, and the row that arrives — at two widths.
 *
 * `row` and `bar` are both MEASURED numbers, RE-TAKEN on 24 August 2026 against the rendered routes
 * with exactly the fixture below (every earlier number in this table was measured against the
 * pre-`[14-16]` fixture and is superseded). `bar` is additionally what the declared constant in
 * `src/lib/design/measurements.ts` compiles to, which is why it is a multiple of the 4px step and
 * `row` need not be.
 *
 * `meta` is the `[14-16]` addition and it is what makes the numbers above it CHECKABLE rather than
 * merely re-pinned. Every card-tree row in this product puts a venue-local window label in a
 * `text-sm` paragraph that is free to wrap, and one wrapped line is 20px — so a height assertion
 * with no statement about the wrap count cannot tell "the row's composition changed" from "the
 * calendar moved". Declaring the count, and (where the fixture pins an absolute instant) the exact
 * STRING, splits those two into two different reds.
 */
type HostShape = {
  readonly key: string;
  readonly route: string;
  /** The guest whose row is the RESTING shape this constant describes. */
  readonly guest: string;
  readonly steps: readonly {
    readonly width: number;
    readonly row: number;
    readonly bar: number;
    /** Which tree the page renders at this width — the card stack, or the table that replaces it. */
    readonly tree: "card" | "table";
    /**
     * The row's meta paragraph, on the `card` steps only (a table row has no such paragraph).
     *
     * `lines` is the wrap count the declared `row` height is built on. `text` is the exact composed
     * label when the fixture seeded this booking at an ABSOLUTE instant; `pattern` is the shape the
     * label must keep when the fixture must stay relative to the clock, so a content change is
     * still red even though the date itself cannot be pinned.
     */
    readonly meta?: {
      readonly lines: number;
      readonly text?: string;
      readonly pattern?: RegExp;
    };
  }[];
};

/** `EEE, MMM d` — the two tokens `when-label.ts` renders a date with, as a matcher. */
const DATE_TOKEN = "(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}";

const HOST_SHAPES: readonly HostShape[] = [
  {
    key: "agenda row · /host",
    route: "/host",
    guest: AGENDA_GUEST,
    steps: [
      // HOST_AGENDA_ROW_HEIGHT. 132 = the 72px unwrapped floor plus three further wrapped meta
      // lines at 20px each; 72 = 16 + 20 + 20 + 16. This row renders as a card at EVERY width — the
      // dashboard has no table tree — so both steps read the card.
      //
      // ⚠ THE DATE HERE CANNOT BE PINNED AND MUST NOT BE. The dashboard agenda shows only sessions
      // in the venue's local TODAY (D-140/D-141), so this booking is necessarily seeded against the
      // DB clock. What IS pinned is the wrap count: `HOST_LISTING_TITLE` was chosen by measuring
      // all 13,020 labels this meta line can compose and taking a length at which every one of them
      // wraps to exactly four lines. The pattern below keeps the rest of the string honest.
      {
        width: 320,
        row: 132.0,
        bar: 132,
        tree: "card",
        meta: {
          lines: 4,
          pattern: new RegExp(
            `^${HOST_LISTING_TITLE} · ${DATE_TOKEN}, 8:00 AM ${WINDOW_DASH} 10:00 AM \\(${HOST_VENUE_CITY} time\\)$`,
          ),
        },
      },
      {
        width: 1280,
        row: 72.0,
        bar: 72,
        tree: "card",
        meta: {
          lines: 1,
          pattern: new RegExp(
            `^${HOST_LISTING_TITLE} · ${DATE_TOKEN}, 8:00 AM ${WINDOW_DASH} 10:00 AM \\(${HOST_VENUE_CITY} time\\)$`,
          ),
        },
      },
    ],
  },
  {
    key: "request row · /host/requests",
    route: "/host/requests",
    guest: PENDING_GUEST,
    steps: [
      // HOST_REQUEST_ROW_HEIGHT. The tallest row shape in the product below the breakpoint — lead
      // countdown, reason line, two-term description list, touch-height actions — and a table row
      // above it.
      //
      // ⚠ THIS ROW IS SEEDED RELATIVE TO THE CLOCK ON PURPOSE, AND ITS TIGHT PIN IS STILL SAFE —
      // measured, not assumed. Its D-99 reason line reads "Session starts in {n}h", which is a
      // statement about how far away the session is; at an absolute 2099 instant it renders
      // "Session starts in 641888h — respond soon.", a row no host will ever see. It does not need
      // an absolute instant, because its height at 320 is not set by the meta at all: swapping this
      // paragraph over all 13,020 labels, and the reason line over thirteen spellings from "under
      // an hour" to "999h", returned 254.05px / 3 meta lines every single time — one distinct
      // value, 13,033 measurements. The 320px number is decided by the status column, the
      // description list and the touch-height actions row, all of which are fixed boxes.
      {
        width: 320,
        row: 254.05,
        bar: 256,
        tree: "card",
        meta: {
          lines: 3,
          pattern: new RegExp(
            `^${DATE_TOKEN}, 9:00 AM ${WINDOW_DASH} 11:00 AM \\(${HOST_VENUE_CITY} time\\)$`,
          ),
        },
      },
      { width: 1280, row: 83.02, bar: 84, tree: "table" },
    ],
  },
  {
    key: "host booking row · /host/bookings",
    route: "/host/bookings",
    guest: RESTING_GUEST,
    steps: [
      // HOST_BOOKING_ROW_HEIGHT, on the RESTING row: a confirmed booking, which carries no actions
      // and no trailing line. The still-pending shape on the same list is pinned separately below,
      // and so is this shape's OTHER wrap count.
      //
      // ⚠ THE ROW THIS MEASURES IS SEEDED AT AN ABSOLUTE VENUE-LOCAL INSTANT (`HOST_FIXED_DAY_2L`),
      // which is the whole `[14-16]` repair: 176 is now a property of the fixture and cannot move
      // with the calendar. The declared label is asserted byte for byte below.
      {
        width: 320,
        row: 176.0,
        bar: 176,
        tree: "card",
        meta: { lines: 2, text: HOST_BOOKING_2L_LABEL },
      },
      { width: 1280, row: 36.52, bar: 36, tree: "table" },
    ],
  },
];

/**
 * The row a host can actually SEE on this route at this width.
 *
 * ⚠ THE TREE IS DECLARED PER STEP, NOT INFERRED FROM THE WIDTH, and the difference is a real defect
 * this file caught on its first run: only the two LIST routes swap a card stack for a table at the
 * medium breakpoint. `/host` has no table tree at all — its agenda is a card stack at every width —
 * so a width-driven rule looked for a table row on the dashboard at 1280 and found nothing. The
 * shape table above says which tree each step reads, because that is a property of the route.
 *
 * Addressed by the guest's first name rather than by position, so a change to the list's ordering is
 * not silently a change to which row is measured.
 */
function hostRowLocator(page: Page, tree: "card" | "table", guest: string): Locator {
  const base = tree === "table" ? page.locator("table tbody tr") : page.getByTestId("row-card");
  return base.filter({ hasText: guest });
}

/**
 * A row's meta paragraph: its text and the number of LINE BOXES it actually occupies.
 *
 * ⚠ THE LINE COUNT IS READ, NOT DERIVED FROM THE HEIGHT. `Range.getClientRects()` returns one rect
 * per line box, so this is the browser's own answer to "how many lines is this". Dividing the
 * paragraph's height by an assumed 20px line-height would be the same number computed from the
 * thing under test, and would go quietly wrong the day the type scale moves — which is one of the
 * two changes this assertion exists to catch.
 *
 * `p.text-muted-foreground` is `row-card.tsx`'s meta slot. The FIRST one is the meta: the request
 * row also renders the D-99 reason line with the same classes, in the status column, later in
 * document order.
 */
async function metaOf(row: Locator, label: string): Promise<{ text: string; lines: number }> {
  const meta = row.locator("p.text-muted-foreground").first();
  await expect(
    meta,
    `${label}: the row rendered no meta paragraph. Every height in this block is built on the meta ` +
      "line's wrap count, so a row without one is a row this file cannot make a claim about.",
  ).toHaveCount(1);
  return meta.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return { text: node.textContent ?? "", lines: range.getClientRects().length };
  });
}

/** One element's height, or a named failure. Never `null` reaching a comparison. */
async function heightOf(target: Locator, label: string): Promise<number> {
  await expect(target, `${label}: matched no element`).toHaveCount(1);
  const box = await target.boundingBox();
  expect(
    box,
    `${label}: the element matched but has no layout box. Above the medium breakpoint the card stack ` +
      "is `display:none` and its box is zero — if this fires, the wrong tree is being read and every " +
      "comparison here would be 0-against-0.",
  ).not.toBeNull();
  return Math.round(box!.height * 100) / 100;
}

test.describe("14-15 — every host plate draws the list that is actually coming", () => {
  // Serial, and generously timed: this block drives twelve navigations against a dev server that
  // compiles host routes on demand, plus a signup.
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  let seed: HostSeed | null = null;
  /**
   * The session, captured once at signup and replayed for every case after it.
   *
   * ⚠ NOT a `logInAs` per case, and that is a measurement rather than a style choice —
   * `host-dashboard.spec.ts:158` recorded it: `src/lib/auth.ts` rate-limits the sign-in route to five
   * attempts a minute, and a file that drives the form once per case silently trips it and fails in
   * `waitForURL` with nothing in the message naming a limiter.
   */
  let hostCookies: Awaited<ReturnType<BrowserContext["cookies"]>> = [];

  test.afterAll(async () => {
    await seed?.teardown();
  });

  test("(0) the fixture: one host, one listing, six bookings, one booker each", async ({
    page,
    context,
  }) => {
    const email = await signUpGeometryHost(page);
    hostCookies = await context.cookies();
    seed = await seedGeometryHost(email);

    const marisol = await addGeometryBooker(seed, AGENDA_GUEST);
    const teodoro = await addGeometryBooker(seed, AGENDA_GUEST_2);
    const corazon = await addGeometryBooker(seed, RESTING_GUEST);
    const anselmo = await addGeometryBooker(seed, WRAP_GUEST);
    const perlita = await addGeometryBooker(seed, PENDING_GUEST);
    const rogelio = await addGeometryBooker(seed, PENDING_GUEST_2);

    // ── RELATIVE, because the surface's own subject is "when" ─────────────────────────────────────
    // Today's agenda — two confirmed sessions, which is what `/host` renders as row cards. The
    // dashboard shows only the venue's local TODAY (D-140/D-141), so these CANNOT be absolute. The
    // wrap count is pinned from the other side instead, by `HOST_LISTING_TITLE`.
    await addGeometryBooking(seed, {
      bookerId: marisol,
      dayOffset: 0,
      startHour: 8,
      endHour: 10,
      status: "confirmed",
    });
    await addGeometryBooking(seed, {
      bookerId: teodoro,
      dayOffset: 0,
      startHour: 12,
      endHour: 14,
      status: "confirmed",
    });

    // ── ABSOLUTE, because these are the rows whose HEIGHT is pinned tight ─────────────────────────
    // The bookings list's RESTING row — a confirmed booking, no actions, no trailing line. Seeded at
    // a fixed venue-local day so its label, and therefore its wrap count, is a property of this
    // file rather than of the day it runs on. This is the `[14-16]` repair.
    await addGeometryBooking(seed, {
      bookerId: corazon,
      localDate: HOST_FIXED_DAY_2L,
      startHour: 9,
      endHour: 11,
      status: "confirmed",
    });
    // The SAME shape, one meta line taller. Both wrap counts this shape can take at 320px are
    // seeded, so the 20px step between them is a measured fact with a test on it rather than the
    // ambush `[14-16]` records.
    await addGeometryBooking(seed, {
      bookerId: anselmo,
      localDate: HOST_FIXED_DAY_3L,
      startHour: 9,
      endHour: 11,
      status: "confirmed",
    });

    // ── RELATIVE, because a request's D-99 reason line is a statement about how far away it is ────
    // The request inbox, and the bookings list's second shape. See the request shape's note in
    // HOST_SHAPES: its 320px height was measured invariant over 13,033 label/reason variants, so it
    // needs no absolute instant; the bookings-list over-run these two also produce is pinned against
    // their OBSERVED wrap count instead.
    await addGeometryBooking(seed, {
      bookerId: perlita,
      dayOffset: 5,
      startHour: 9,
      endHour: 11,
      status: "requested",
    });
    await addGeometryBooking(seed, {
      bookerId: rogelio,
      dayOffset: 6,
      startHour: 15,
      endHour: 17,
      status: "requested",
    });

    expect(seed, "the host fixture is null — nothing below has anything to measure").not.toBeNull();
    expect(
      hostCookies.length,
      "the signup produced no cookies, so every navigation below would be an unauthenticated " +
        "redirect and the routes under test would never render.",
    ).toBeGreaterThan(0);
  });

  for (const shape of HOST_SHAPES) {
    test(`(${shape.key}) the plate's bar and the arriving row are the same box at 320 and 1280`, async ({
      page,
      context,
    }) => {
      expect(seed, "the host fixture is null — see case (0).").not.toBeNull();
      await context.clearCookies();
      await context.addCookies(hostCookies);

      // Install BEFORE the first navigation — `served-document.ts`'s stated ordering.
      const truncator = installTruncator(page);
      await truncator.ready;

      // ⚠ WARM THE ROUTE BEFORE ASKING IT TO STREAM, and this is a MEASURED requirement rather than
      // superstition — it cost this file a red on its first run. `next dev` compiles a route on its
      // first request; on that request the compile finishes and everything the page awaits is
      // already resolved by the time the shell flushes, so React emits NO out-of-order completion
      // segment and `served-document.ts` finds no marker to cut at. Observed exactly once, on
      // `/host/requests`, in a 37,952-byte untruncated document — while `/host` streamed perfectly
      // in the same run, because the signup drive in case (0) had already compiled it by redirecting
      // there. One throwaway navigation removes the asymmetry.
      truncator.set(false);
      await page.goto(`${BASE_URL}${shape.route}`);

      for (const step of shape.steps) {
        const where = `${shape.key} · ${step.width}px`;
        await page.setViewportSize({ width: step.width, height: 900 });

        // ── PENDING: the route's own `loading.tsx`, every boundary still in its fallback ──────────
        //
        // Retried, and bounded. Whether a boundary resolves before or after the shell flush is a
        // race against a local database, and a spec that reports "vacuous" on the one navigation
        // that happened to win it is a spec somebody re-runs rather than reads. Three attempts, then
        // a named failure — never a silent pass, which is the direction that actually matters.
        truncator.set(true);
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          await page.goto(`${BASE_URL}${shape.route}`);
          if (truncator.state.cut > 0) break;
        }
        await page.evaluate(() => document.fonts.ready);

        // VACUITY GUARD 1: the truncation actually happened. Without it the helper serves the whole
        // document in both modes and the two "states" below are the same page compared with itself.
        expect(
          truncator.state.cut,
          `${where}: the pending pass served an untruncated document (${truncator.state.length} ` +
            "bytes, no completion marker found) on three attempts. Both states would then be the " +
            "same page and every comparison below would be vacuous.",
        ).toBeGreaterThan(0);

        // VACUITY GUARD 2: it is genuinely the PENDING state — the plate is on screen and the real
        // row is not.
        const bars = page.locator('[data-testid="skeleton-row-list"] [data-slot="skeleton"]');
        await expect(
          bars,
          `${where}: the pending shell rendered no row-list placeholder. Either the session is not ` +
            "host-capable and the route redirected, or this plate no longer composes the row " +
            "skeleton — in which case there is no bar to compare and this file is measuring nothing.",
        ).not.toHaveCount(0, { timeout: 20_000 });
        await expect(
          page.getByTestId("row-card"),
          `${where}: the pending shell already contains real rows, so the truncation did not hold ` +
            "the page in its loading state and both measurements below are the resolved list.",
        ).toHaveCount(0);

        const bar = await heightOf(bars.first(), `${where} · plate bar`);

        // The bar is what the DECLARED constant compiles to. Asserted before anything is compared,
        // so "the plate changed" and "the row changed" are two different reds.
        expect(
          Math.abs(bar - step.bar),
          `${where}: the plate drew a ${bar}px bar, but this shape's declared height in ` +
            `src/lib/design/measurements.ts is ${step.bar}px. Either the plate is passing a ` +
            "different constant than the one this shape's row was measured against, or the constant " +
            "itself moved without this table moving with it.",
        ).toBeLessThanOrEqual(HOST_BAR_EXACT_PX);

        // ── RESOLVED: the whole document, the real list ───────────────────────────────────────────
        truncator.set(false);
        await page.goto(`${BASE_URL}${shape.route}`);
        await page.evaluate(() => document.fonts.ready);

        const row = hostRowLocator(page, step.tree, shape.guest);
        await expect(
          row,
          `${where}: the resolved page rendered no ${step.tree} for ${shape.guest}. Expected the ` +
            `${step.tree} tree at this width (the card stack and the table swap at ` +
            `${HOST_MD_BREAKPOINT_PX}px); the owner-scoped read may have returned nothing, or the ` +
            "plate may still be up.",
        ).toBeVisible({ timeout: 30_000 });

        const rendered = await heightOf(row, `${where} · resolved ${step.tree}`);

        // ── THE LABEL AND ITS WRAP COUNT, ASSERTED BEFORE THE HEIGHT ──────────────────────────────
        //
        // `[14-16]`. Read the block header for the defect; the mechanism in one line is that a
        // wrapped meta line costs 20px, so a height assertion on its own reports a CALENDAR change
        // and a COMPOSITION change with the same number and the same words. These two clauses run
        // first so the height below can only ever be reporting the second.
        if (step.meta) {
          const meta = await metaOf(row, `${where} · meta`);

          if (step.meta.text != null) {
            expect(
              meta.text,
              `${where}: the window label composed as\n    "${meta.text}"\nbut this fixture seeds ` +
                `this booking at an ABSOLUTE venue-local instant (${HOST_FIXED_DAY_2L}), so it must ` +
                `compose\n    "${step.meta.text}"\nevery day, forever. A label that changed means ` +
                "the composer, the tz database or the venue changed — NOT that the calendar moved, " +
                "which is the whole point of seeding an absolute instant. Nothing below this line " +
                "is a valid measurement until this string is right again.",
            ).toBe(step.meta.text);
          }
          if (step.meta.pattern != null) {
            expect(
              meta.text,
              `${where}: the window label composed as\n    "${meta.text}"\nwhich does not match the ` +
                `shape this row is seeded to produce (${step.meta.pattern}). This row's DATE cannot ` +
                "be pinned — see the shape's note — so its shape is pinned instead: the space " +
                "title, the separator, the window hours and the city suffix are all fixture, and " +
                "only the date token may vary.",
            ).toMatch(step.meta.pattern);
          }

          expect(
            meta.lines,
            `${where}: the meta line wraps to ${meta.lines} lines today; it wrapped to ` +
              `${step.meta.lines} when this shape's height was measured. That is ` +
              `${Math.abs(meta.lines - step.meta.lines) * META_LINE_PX}px of row height, and it is ` +
              "the defect `[14-16]` exists to name out loud instead of leaving it to surface as an " +
              `unexplained ${META_LINE_PX}px below. The label was "${meta.text}". If the label is ` +
              "the declared one and the count still moved, the type scale or the row's column " +
              "widths changed — re-measure the shape; do NOT widen a tolerance to absorb a line.",
          ).toBe(step.meta.lines);
        }

        // ── THE ABSOLUTE VALUE, ASSERTED SEPARATELY ───────────────────────────────────────────────
        expect(
          Math.abs(rendered - step.row),
          `${where}: the resolved ${step.tree} measures ${rendered}px, but this shape was measured ` +
            `at ${step.row}px when its height was declared. A bar and a row that agree at the wrong ` +
            'number are as "equal" as two that agree at the right one, which is why this is ' +
            "asserted separately. The wrap-count clause above ran first and passed, so this is NOT " +
            "the label wrapping differently: the row's composition changed. Re-measure and move the " +
            "constant, never the tolerance.",
        ).toBeLessThanOrEqual(HOST_TOLERANCE_PX);

        // ── THE CLAIM: the placeholder occupies the box the content will ──────────────────────────
        expect(
          Math.abs(bar - rendered),
          `${where}: the plate's bar (${bar}px) and the ${step.tree} that arrives (${rendered}px) ` +
            `differ by more than ${HOST_TOLERANCE_PX}px — the page moves by ` +
            `${Math.round(Math.abs(bar - rendered))}px per row when the data lands, which is the ` +
            "layout shift the loading plate exists to remove. Fix the DECLARED height for this " +
            "shape, not this number.",
        ).toBeLessThanOrEqual(HOST_TOLERANCE_PX);
      }
    });
  }

  /** `HOST_BOOKING_ROW_HEIGHT`'s two compiled values, restated here as this block's own bar. */
  const BOOKINGS_BAR_320 = 176;
  const BOOKINGS_BAR_1280 = 36;

  /** The wrap count the 320px bar is declared against — `HOST_FIXED_DAY_2L`'s label. */
  const RESTING_META_LINES_320 = 2;

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // `[14-16]` — THE SHAPE HAS TWO HEIGHTS AT 320px, AND BOTH ARE SEEDED AND PINNED
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  //
  // This is the case the deferred item was really asking for. The host booking row's card is
  // 136px of fixed boxes (16 padding + 20 title + 12 gap + 72 description list + 16 padding) plus
  // its meta line, at 20px a wrapped line — so at the 320px floor the SAME resting row is
  //
  //     2 meta lines → 176px      3 meta lines → 196px
  //
  // and which one it takes is decided by the window label's rendered WIDTH: the weekday name, the
  // month name, whether the day-of-month is one digit or two, and how many digits the two hours
  // spend. Measured by swapping this paragraph over the full cross product of every date token
  // (2,604) against five window spellings — 13,020 labels, two outcomes, never a third:
  //
  //     "8:00 AM – 9:00 AM"     176 ×2,050   196 ×554
  //     "9:00 AM – 11:00 AM"    176 ×2,072   196 ×532
  //     "10:00 AM – 12:00 PM"   176 ×1,031   196 ×1,573
  //     "11:00 AM – 1:00 PM"    176 ×1,761   196 ×843
  //     "6:00 PM – 8:00 PM"     176 ×2,103   196 ×501
  //
  // 14-15 measured 196 because 23 August 2026 + 3 days composed a three-line label, and pinned it.
  // On 24 August the same fixture composed a two-line one and the file went red by exactly 20px —
  // which is `[14-16]`. The plate now draws 176 (`measurements.ts` carries the argument for which
  // of the two a single bar should be), and BOTH are seeded at absolute instants so that neither
  // number can ever move with the calendar again.
  //
  // WHY BOTH RATHER THAN JUST THE DECLARED ONE. A single pin cannot tell you the 20px step is still
  // 20px. With both seeded, a change to the type scale, to the card's padding or to the meta
  // column's width reddens them in a pattern that says which: both move together for a padding
  // change, and their DIFFERENCE moves for a line-height change.
  test("(wrap) the host booking row has exactly two heights at 320, and both are fixture, not calendar", async ({
    page,
    context,
  }) => {
    expect(seed, "the host fixture is null — see case (0).").not.toBeNull();
    await context.clearCookies();
    await context.addCookies(hostCookies);

    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`${BASE_URL}/host/bookings`, { waitUntil: "networkidle" });

    for (const [guest, label, lines, expected] of [
      [RESTING_GUEST, HOST_BOOKING_2L_LABEL, 2, 176],
      [WRAP_GUEST, HOST_BOOKING_3L_LABEL, 3, 196],
    ] as const) {
      const where = `bookings wrap · 320px · ${guest}`;
      const row = hostRowLocator(page, "card", guest);
      await expect(
        row,
        `${where}: the resolved page rendered no card for ${guest}. This case needs both fixed-date ` +
          "confirmed bookings the fixture seeds; without them it is asserting nothing.",
      ).toBeVisible({ timeout: 30_000 });

      const meta = await metaOf(row, `${where} · meta`);
      expect(
        meta.text,
        `${where}: the label composed as "${meta.text}" rather than "${label}". This booking is ` +
          "seeded at an absolute venue-local day precisely so this string is a constant.",
      ).toBe(label);
      expect(
        meta.lines,
        `${where}: "${meta.text}" wraps to ${meta.lines} lines rather than ${lines}. The label is ` +
          "the declared one, so the calendar is not the cause — the type scale or the meta " +
          "column's width moved.",
      ).toBe(lines);

      const rendered = await heightOf(row, `${where} · card`);
      expect(
        Math.abs(rendered - expected),
        `${where}: a ${lines}-line resting row measures ${rendered}px against the ${expected}px ` +
          "this shape was measured at. Both wrap counts are seeded here on purpose: if the OTHER " +
          "one also missed by the same amount the card's fixed boxes changed, and if only this one " +
          `missed the ${META_LINE_PX}px cost of a wrapped line changed.`,
      ).toBeLessThanOrEqual(HOST_TOLERANCE_PX);
    }

    // The step itself, stated as its own number so a reader does not have to subtract two failures.
    const twoLine = await heightOf(
      hostRowLocator(page, "card", RESTING_GUEST),
      "bookings wrap · 320px · two-line row",
    );
    const threeLine = await heightOf(
      hostRowLocator(page, "card", WRAP_GUEST),
      "bookings wrap · 320px · three-line row",
    );
    expect(
      Math.round((threeLine - twoLine) * 100) / 100,
      `bookings wrap · 320px: one wrapped meta line costs ${threeLine - twoLine}px on this row, not ` +
        `${META_LINE_PX}px. Every derived expectation in this block — the plate's bar, the pending ` +
        "row's over-run — is built on that step, so this is the assumption they all rest on.",
    ).toBe(META_LINE_PX);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE ACCEPTED, MEASURED DEVIATION — pinned, because a delta no test carries is prose
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  //
  // `/host/bookings` mixes two row shapes on one tab. The RESTING one is a confirmed booking and it
  // is what the plate draws. A booking still awaiting the host's answer grows an approve/decline
  // actions row and is taller. No single bar can be right for both, and drawing the taller shape
  // would over-claim on the ordinary case. The alternative that was explicitly NOT taken: reducing
  // the plate's row COUNT until the totals happen to line up while every individual row disagrees.
  //
  // MEASURED 24 August 2026: the actions row costs a FLAT 56px at 320 (232 against a two-line
  // resting row's 176, 252 against a three-line row's 196 — the same 56 either way) and a flat 25px
  // at 1280 (61 against 36).
  //
  // ⚠ THE 320px CLAUSE IS THE ONE PLACE IN THIS FILE WHERE `[14-16]`'s PREFERENCE 2 IS USED, AND
  // THAT IS DELIBERATE. These two rows are the fixture's REQUESTS, and a request is seeded relative
  // to the clock on purpose (its D-99 reason line reads "Session starts in {n}h"), so their labels —
  // alone in this block — genuinely cannot be pinned. 14-15 answered that with a 40px-wide band,
  // which is a band wide enough to swallow the entire content of a wrapped line and therefore wide
  // enough to swallow the defect this file exists to catch. It is replaced by a DERIVATION: the
  // row's own wrap count is read, and the expected over-run is the measured 56px cost of the actions
  // plus 20px for each line the label wraps beyond the resting shape's two. That keeps the
  // assertion as tight as the pinned ones — ±4px around an exact expectation — while still being
  // true on every date. What it cannot catch is stated with it, below.
  const PENDING_ACTIONS_COST_320 = 56;
  const PENDING_ACTIONS_COST_1280 = 25;

  test("(deviation) a still-pending booking over-runs the bookings plate's bar by a measured amount", async ({
    page,
    context,
  }) => {
    expect(seed, "the host fixture is null — see case (0).").not.toBeNull();
    await context.clearCookies();
    await context.addCookies(hostCookies);

    for (const [width, bar, tree] of [
      [320, BOOKINGS_BAR_320, "card"],
      [1280, BOOKINGS_BAR_1280, "table"],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE_URL}/host/bookings`, { waitUntil: "networkidle" });

      for (const guest of [PENDING_GUEST, PENDING_GUEST_2]) {
        const where = `bookings deviation · ${width}px · ${guest}`;
        const row = hostRowLocator(page, tree, guest);
        await expect(
          row,
          `${where}: the resolved page rendered no ${tree} for ${guest}. This case needs the two ` +
            "still-pending bookings the fixture seeds; without them it is asserting nothing.",
        ).toBeVisible({ timeout: 30_000 });

        const rendered = await heightOf(row, `${where} · ${tree}`);
        const overrun = Math.round((rendered - bar) * 100) / 100;

        // At 1280 nothing wraps — a table row is one line — so the expectation is the flat cost.
        // At 320 it is the flat cost plus whatever this date's label costs in extra wrapped lines,
        // read off the row itself rather than assumed.
        let expected = PENDING_ACTIONS_COST_1280;
        let wrapNote = "a table row wraps nothing, so this cost is flat";
        if (tree === "card") {
          const meta = await metaOf(row, `${where} · meta`);
          const extra = meta.lines - RESTING_META_LINES_320;
          expected = PENDING_ACTIONS_COST_320 + extra * META_LINE_PX;
          wrapNote =
            `this row's label ("${meta.text}") wraps to ${meta.lines} lines, ${extra} more than the ` +
            `${RESTING_META_LINES_320} the ${bar}px bar is declared against, so the expected ` +
            `over-run is ${PENDING_ACTIONS_COST_320} + ${extra} × ${META_LINE_PX}`;
        }

        expect(
          Math.abs(overrun - expected),
          `${where}: a still-pending booking's ${tree} measures ${rendered}px against the plate's ` +
            `${bar}px bar — an over-run of ${overrun}px where ${expected}px was expected, because ` +
            `${wrapNote}. This delta is ACCEPTED and recorded, not a target: the bookings tab mixes ` +
            "a confirmed row (which the bar draws) with a pending row (which carries approve/" +
            "decline actions and is taller). The wrap term is read from the row, so a miss here is " +
            "the ACTIONS row changing shape and nothing else — re-measure and move the cost with " +
            "the change that caused it; do not widen this, and do not shrink the plate's row count " +
            "until the totals happen to agree.",
        ).toBeLessThanOrEqual(HOST_TOLERANCE_PX);
      }
    }
  });
});
