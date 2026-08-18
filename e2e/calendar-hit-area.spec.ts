import { expect, test, type Locator, type Page } from "@playwright/test";

import { BASE, seedBookableListing, type SeededListing } from "./helpers/booker-seed";
import { seedTheme } from "./helpers/theme";

// BFLOW-05 / 12-UI-SPEC AC#14 — THE DAY CELL IS 44px TALL BECAUSE A BROWSER SAID SO.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS AT ALL, AND WHY A CLASS-STRING REVIEW WOULD HAVE SHIPPED THE DEBT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `ui/calendar.tsx:34` ships `[--cell-size:--spacing(7)]` = 28px, and `measurements.ts`'s
// `CALENDAR_CELL` is the 44px replacement. Overriding the variable at the call site is NECESSARY AND
// NOT SUFFICIENT — the hazard note plan 12-01 wrote onto that constant says so, and this file is the
// measurement it hands forward. Three separate things had to be true for a 44px cell, and only the
// first is visible in a diff:
//
//   1. the variable, on the `Calendar` root (nav buttons, weekday row, caption all read it);
//   2. `aspect-auto min-w-0 h-11 w-full` on the day BUTTON, through the existing
//      `components={{ DayButton }}` seam — `aspect-square` ties height to width, so "44 tall and ~39
//      wide" is unsatisfiable while it is present, and `min-w-(--cell-size)` floors seven cells at
//      308px against a 288px content box at the 320px floor;
//   3. a WIDTH on the calendar itself, because (2) makes the cell `1fr` of the calendar's content box
//      and `ui/calendar.tsx`'s own `w-fit` root then collapses that box to the numerals.
//
// (3) IS THE ONE NOBODY WOULD HAVE PREDICTED, and it is the reason this file is a `boundingBox()`
// rather than a review. See the MEASURED table below: with (1) and (2) applied and nothing else, the
// tree passes every source gate in the repository and renders a **25.08px** hit area — WORSE than the
// 28px debt the plan set out to pay off.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASURED TABLE — `/listings/{seeded}`, court, Chromium, 18 August 2026
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   state                                     calendar root     month grid       DAY CELL      nav
//   ────────────────────────────────────────  ───────────────   ──────────────   ───────────   ─────
//   BEFORE — shipped (`--cell-size` = 28px)   214    × 297.19   196    × 235.19  28    × 28    28×28
//   (1)+(2) — the plan's two overrides        193.53 × 295.66   175.53 × 217.66  25.08 × 44    44×44
//   (1)+(2)+(3) at 320px                      288    × 409.19   270    × 331.19  38.58 × 44    44×44
//   (1)+(2)+(3) at 375 / 768 / 1280           326    × 409.19   308    × 331.19  44    × 44    44×44
//
// The BEFORE row is the whole of BFLOW-05's debt in one line: 28 × 28, at every one of the four
// widths, in both themes — measured by checking `availability-calendar.tsx` back out at `ee61073` and
// running this file against it (**2 failed**, `Expected: 44 / Received: 28`).
//
// Two readings of that table are the whole point of the file.
//
//   • THE HEIGHT AT ROW (1)+(2) IS 44 — the merge DID resolve. `cn()` is clsx + tailwind-merge v3,
//     whose `size` group is declared as conflicting with `h`/`w` in the EARLIER-wins direction, so a
//     later `h-11` does not delete the earlier `size-auto`: both survive into the class string
//     (`… flex size-auto flex-col …` is still there, measured) and Tailwind v4's own utility order in
//     the emitted stylesheet decides. It came out right. It was NOT assumed to, and the
//     `classNames={{ day: … }}` escape hatch the plan declared in advance was therefore not needed.
//   • THE WIDTH AT ROW (1)+(2) IS 25.08 — the failure a class review cannot see. Every class in the
//     diff is correct; the box they live in is not.
//
// A FOURTH OVERRIDE WAS FOUND BY THE SAME MEASUREMENT and is recorded at its call site:
// `ui/calendar.tsx:106` puts `aspect-square` on the day `<td>` as well as on the button, so with the
// button at `h-11` the cell measured 25.08 tall while the button inside it measured 44 — six week rows
// each overlapping the next by 19px. `[&_td]:aspect-auto` on the root is the fix.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE 38.58px FLOOR — A DECLARED CONSEQUENCE, AND A CORRECTION TO 12-UI-SPEC's OWN FIGURE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `12-UI-SPEC § Spacing` declares the cell's width as fluid and floors it at "~41px", deriving 41 from
// 288 ÷ 7 — the 320px viewport less the page's `px-4`. MEASURED, the floor is **38.58**, because that
// derivation silently assumes a calendar with no chrome: `ui/calendar.tsx` pays its own `p-2` (16px)
// and this call site pays a 1px `border` on each side, so the seven cells divide 270px and not 288.
//
// The number is recorded rather than engineered away. Removing the padding and the border below `sm:`
// would buy 2.57px and cost the calendar its card edge on a phone, which is a design change no
// acceptance criterion asks for; and 38.58 is 1.6× the WCAG 2.5.8 AA target-size minimum of 24px,
// which is the property the requirement is actually about. The alternative the UI-SPEC already ruled
// out — a horizontally scrolling month grid — fails both the responsive and the keyboard gate.
//
// So the width assertions below are TWO expectations rather than one: the AA floor, which is the
// requirement, and the derived 270 ÷ 7, which is the drift pin. A cell that quietly returned to 25.08
// would still clear neither.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY NOT `/dev/theme`, WHICH IS WHERE EVERY OTHER GEOMETRY SPEC IN THIS REPOSITORY LIVES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `e2e/skeleton-geometry.spec.ts` is this file's structural model — the box reader with its null-box
// guard, `expectSameBox`, the both-themes loop, `document.fonts.ready`, and the two-part shape that
// asserts the equality AND the absolute number separately. What is NOT inherited is the page:
// `/dev/theme` renders no calendar at all, which is the blind spot `[11-21]` recorded in that file's
// own NOT COVERED footer ("the page is a preview, not a product route"). A hit-area claim about a
// control that route never mounts would be a claim about nothing. This file drives a real seeded
// listing through `e2e/helpers/booker-seed.ts`, which is the fixture plan 12-03 built for exactly
// this.
//
// BOTH THEMES ARE TWO NAVIGATIONS HERE, not two panes. `/dev/theme` renders court and grove side by
// side in one layout pass; a product route renders one theme per document, so `seedTheme` is what
// makes "both themes" true — and it is seeded on the CONTEXT before the first `goto`, so next-themes'
// pre-paint script reads it and there is no flash to wait out.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — run and reverted, 18 August 2026
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   (a) `aspect-auto` REMOVED from the DayButton override, leaving `h-11 w-full min-w-0` — the
//       mutation the plan predicted would redden the HEIGHT assertion. **2 failed / 0 passed**, and
//       the clause that fired is the WIDTH one, which is a finding rather than a technicality.
//       Verbatim (court; grove is byte-identical but for the theme name):
//
//         Error: day cell · court · 320px: the rendered width is 44px against a derived 38.57px — …
//         expect(received).toBeLessThanOrEqual(expected)
//         Expected: <= 1
//         Received:    5.428571428571431
//
//       WHY THE HEIGHT STAYED GREEN. `aspect-ratio` resolves the AUTO axis from the definite one, and
//       with `h-11` still present the definite axis is the height — so the ratio drove the WIDTH back
//       up to 44 instead of dragging the height down. The cell is then 44 wide at the 320px floor,
//       seven of them are 308px inside a 270px content box, and the document overflows. So the
//       mutation's real signature is the width plus a red `overflow-320`, not a short cell.
//       Reverted; 2 passed.
//
//   (a2) `h-11` REMOVED instead, keeping `aspect-auto`. This is the mutation that reddens the height
//       clause, and it is recorded because (a) did not:
//
//         Error: day cell · court · 320px: the rendered height is 14px, not 44. …
//         Expected: 44
//         Received: 14           (grove measured 15 — the button's line box, nothing more)
//
//       **2 failed / 0 passed.** Together (a) and (a2) say the two classes do two different jobs:
//       `h-11` is what makes the cell 44 tall, and `aspect-auto` is what stops that 44 becoming the
//       width as well. Reverted; 2 passed.
//
//   (b) VACUITY. The listing path repointed at `/listings/does-not-exist-12-09`. Every assertion in
//       this file is "a box is 44", and an absent box is a null. `reachableCalendar` failed first, as
//       designed:
//
//         Error: court · 320px: the route rendered no `[data-slot="calendar"]`. Every assertion in
//         this file reads a box out of that subtree and an absent box is a null, so this guard is
//         what makes the numbers below a measurement rather than an empty pass.
//
//       Restored; 2 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
//   • ONE LISTING, ONE MODE. The seeded row is `exclusive`. `date-pass-picker.tsx` mounts the same
//     vendored `Calendar` for a drop-in listing and did NOT receive these overrides — its cells are
//     still the vendored 28px. That is logged in `deferred-items.md` with 12-09 named as the finder.
//   • FOUR WIDTHS, ONE HEIGHT (900px). It says nothing about a landscape phone.
//   • IT MEASURES BOXES. A 44px box whose CONTENT is unreadable is green here.
//   • THIS SPEC IS NOT IN CI (D-24), like the other twelve under `e2e/`.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/** The declared cell size — `CALENDAR_CELL` is `[--cell-size:--spacing(11)]`, i.e. 11 × 4px. */
const CELL_PX = 44;

/** WCAG 2.5.8 AA target size. The property the fluid width has to keep, and it is not 44. */
const WCAG_AA_TARGET_PX = 24;

/**
 * Sub-pixel tolerance for the DERIVED width figures, in `skeleton-geometry.spec.ts:180`'s form.
 *
 * The heights are asserted as exact integers because they are exact integers (`h-11` is 44px, full
 * stop). The widths divide a fractional content box by seven, so they are asserted against a derived
 * value inside this band.
 */
const TOLERANCE_PX = 1;

const THEMES = ["court", "grove"] as const;

type Box = { width: number; height: number };

/**
 * The four widths, and what the cell's WIDTH must be at each.
 *
 * 320 is the responsive floor (`overflow-320.spec.ts`); 375 is the reference phone; 768 is above
 * Tailwind's `md:` (where the calendar shares a row with the day panel); 1280 is Desktop Chrome's
 * default and the `lg:` two-column listing layout.
 *
 * `expectedWidth` is DERIVED at each step rather than typed in: 326 = 7 × 44 + 16 (`ui/calendar.tsx`'s
 * `p-2`) + 2 (this call site's border), and below that the calendar is `w-full` inside the page's
 * 288px content box, so the cells divide 288 − 18 = 270.
 */
const STEPS = [
  {
    width: 320,
    expectedWidth: (320 - 32 - 18) / 7, // 38.571…
    why:
      "the page's `px-4` leaves a 288px content box and the calendar pays 16px of its own padding " +
      "plus a 1px border each side, so seven cells divide 270px. 12-UI-SPEC § Spacing says ~41 — " +
      "that figure is 288 ÷ 7 and does not account for the calendar's own chrome (see the header)",
  },
  { width: 375, expectedWidth: CELL_PX, why: "326px of calendar fits inside a 343px content box" },
  { width: 768, expectedWidth: CELL_PX, why: "`md:` — the calendar's own 326px track" },
  { width: 1280, expectedWidth: CELL_PX, why: "`lg:` — the main column is far wider than 326px" },
] as const;

let seed: SeededListing;

test.beforeAll(async () => {
  seed = await seedBookableListing({ titlePrefix: "E2E HitArea" });
});

test.afterAll(async () => {
  await seed?.teardown();
});

/**
 * One box, or a named failure. Never `null` reaching a comparison.
 *
 * Copied VERBATIM in shape from `skeleton-geometry.spec.ts:248-257`, including the `display:none`
 * clause: an element with no layout box has no box at all, and `undefined` compares false against
 * every bound — which would turn every expectation in this file into a silent pass.
 */
async function boxOf(scope: Page | Locator, selector: string, label: string): Promise<Box> {
  const target = scope.locator(selector).first();
  await expect(target, `${label}: no element matched \`${selector}\``).toHaveCount(1);
  const box = await target.boundingBox();
  expect(box, `${label}: \`${selector}\` matched but has no layout box (display:none?)`).not.toBeNull();
  return { width: box!.width, height: box!.height };
}

/** The same, for a locator that is already resolved (the nav buttons, found by their role). */
async function boxOfLocator(target: Locator, label: string): Promise<Box> {
  await expect(target, `${label}: no element matched`).toHaveCount(1);
  const box = await target.boundingBox();
  expect(box, `${label}: matched but has no layout box (display:none?)`).not.toBeNull();
  return { width: box!.width, height: box!.height };
}

/**
 * TRAP 1, in `overflow-320.spec.ts:341-353`'s form: assert the route rendered the thing under test
 * before asserting anything about it.
 *
 * The 15s allowance is that file's measured one — the dev server compiles routes on demand and a
 * reachability guard that flakes is a guard people learn to ignore.
 */
async function reachableCalendar(page: Page, where: string): Promise<void> {
  await expect(
    page.locator('[data-slot="calendar"]'),
    `${where}: the route rendered no \`[data-slot="calendar"]\`. Every assertion in this file reads ` +
      "a box out of that subtree and an absent box is a null, so this guard is what makes the " +
      "numbers below a measurement rather than an empty pass.",
  ).not.toHaveCount(0, { timeout: 15_000 });

  // The second half of the same guard: a month grid with the wrong number of week rows is a grid
  // this file's six-row height arithmetic is not about.
  await expect(
    page.locator('[data-slot="calendar"] tbody tr'),
    `${where}: the month grid rendered a row count this file does not expect. The height figures ` +
      "below are 6 × (44 + 8), so a five-row month would make them wrong for a reason that has " +
      "nothing to do with the cell size.",
  ).toHaveCount(6, { timeout: 15_000 });
}

test.describe("AC#14 — a calendar day cell is 44px tall at every width, in both themes", () => {
  // 60s rather than the default 30s, for `overflow-320.spec.ts`'s measured reason: each test drives
  // four navigations against a dev server that compiles routes on demand.
  test.describe.configure({ timeout: 90_000 });

  for (const theme of THEMES) {
    test(`${theme} · the day cell, the nav buttons and the fluid width floor`, async ({
      page,
      context,
    }) => {
      await seedTheme(context, theme);

      for (const step of STEPS) {
        const where = `${theme} · ${step.width}px`;
        await page.setViewportSize({ width: step.width, height: 900 });
        await page.goto(`${BASE}/listings/${seed.listingId}`);
        await page.evaluate(() => document.fonts.ready);
        await reachableCalendar(page, where);

        // `data-day` is `CalendarDayButton`'s own attribute, so this addresses a DAY cell rather than
        // the nav buttons or the caption — all of which are also `<button>`s inside the calendar.
        const cell = await boxOf(page, '[data-slot="calendar"] td button[data-day]', `day cell · ${where}`);

        // ── (a) THE HEIGHT, AGAINST THE LITERAL 44, IN ITS OWN EXPECTATION ────────────────────────
        // Deliberately not "equal to the nav button" or "equal to the cell beside it": two boxes that
        // agree at 28px are exactly as equal as two that agree at 44, and only one of those is
        // BFLOW-05. This is the assertion the whole file exists for.
        expect(
          cell.height,
          `day cell · ${where}: the rendered height is ${cell.height}px, not ${CELL_PX}. ` +
            "`CALENDAR_CELL` re-sizes the nav buttons, the weekday row and the caption because those " +
            "read `--cell-size`; the day button does NOT read it. If this is red, one of the three " +
            "overrides at `availability-calendar.tsx`'s Calendar call site is gone — most likely " +
            "`aspect-auto`, which is what stops `ui/calendar.tsx:221`'s `aspect-square` tying this " +
            "height to the fluid width.",
        ).toBe(CELL_PX);

        // ── (b) THE WIDTH: THE REQUIREMENT, THEN THE DRIFT PIN ────────────────────────────────────
        // The requirement is the AA target size. The derived figure beside it is what catches the
        // 25.08px collapse the header records — a number that clears 24 and is still a defect.
        expect(
          cell.width,
          `day cell · ${where}: the rendered width is ${cell.width}px, below the WCAG 2.5.8 AA ` +
            `target-size minimum of ${WCAG_AA_TARGET_PX}px. The cell's width is fluid by design ` +
            "(12-UI-SPEC § Spacing), but fluid has a floor and this is it.",
        ).toBeGreaterThanOrEqual(WCAG_AA_TARGET_PX);

        expect(
          Math.abs(cell.width - step.expectedWidth),
          `day cell · ${where}: the rendered width is ${cell.width}px against a derived ` +
            `${step.expectedWidth.toFixed(2)}px — ${step.why}. Measured once at 25.08px with both ` +
            "of the plan's overrides applied and the calendar still `w-fit`: every class was right " +
            "and the box they lived in had collapsed to the numerals, which is why this figure is " +
            "asserted separately from the AA floor above.",
        ).toBeLessThanOrEqual(TOLERANCE_PX);

        // ── (c) BOTH NAV BUTTONS, 44 × 44 ────────────────────────────────────────────────────────
        // These DO read `--cell-size`, so they are the half of the debt that override 1 pays on its
        // own — asserted anyway, because "the variable was set" and "the control is 44px" are two
        // different claims and only the second one is BFLOW-05.
        for (const label of [/previous month/i, /next month/i]) {
          const nav = await boxOfLocator(
            page.getByRole("button", { name: label }),
            `nav ${label.source} · ${where}`,
          );
          expect(
            [nav.width, nav.height],
            `nav ${label.source} · ${where}: the button measures ${nav.width} × ${nav.height}, not ` +
              `${CELL_PX} × ${CELL_PX}. It reads \`--cell-size\` through \`size-(--cell-size)\`, so ` +
              "this is red when `CALENDAR_CELL` is missing from the Calendar root — which is a " +
              "different edit from the day-button override above.",
          ).toEqual([CELL_PX, CELL_PX]);
        }
      }
    });
  }
});
