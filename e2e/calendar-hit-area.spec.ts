import { expect, test, type Locator, type Page } from "@playwright/test";

import { BASE, seedBookableListing, type SeededListing } from "./helpers/booker-seed";
import { installTruncator } from "./helpers/served-document";
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
// button at `h-11` the cell measured 25.08 tall while the button inside it measured 44 — every week
// row overlapping the next by 19px (six of them, in the six-row month that measurement was taken in). `[&_td]:aspect-auto` on the root is the fix.
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

/**
 * The ±2px band the skeleton comparison uses, and it is `skeleton-geometry.spec.ts`'s number rather
 * than a second opinion. Wider than `TOLERANCE_PX` above because that one bounds a single derived
 * figure and this one bounds a SUM: the plate reproduces the resolved calendar's caption, weekday row
 * and THE MONTH'S week rows, and the weekday row's line box is 19.19px against the plate's `h-5`. That
 * 0.81 does not grow with the row count (19.1 · D-A2), so this band is a fact about the weekday row
 * rather than about a month.
 */
const SKELETON_TOLERANCE_PX = 2;

/** `ui/calendar.tsx`'s `week` class is `mt-2 flex w-full` — the 8px between every pair of week rows. */
const WEEK_GAP_PX = 8;

/**
 * The only week-row counts a month grid can take, and the reason the row count is DERIVED here
 * rather than pinned.
 *
 * This constant used to be `WEEK_ROWS = 6`, "because a month grid always renders six week rows".
 * It does not. A 28-to-31-day month folded into seven-day rows needs four rows (a non-leap February
 * that starts on the week-start day), five, or six — and September 2026 needs five, which is what
 * made this file red on every machine in every five-row month while passing by hand in six-row ones
 * (19.1-03, `evidence/triage-calendar-hit-area.txt`). The row count is a function of TODAY, so it is
 * read off the rendered grid; what stays constant is the SHAPE, and that is what this set pins.
 */
const LEGAL_WEEK_ROWS: readonly number[] = [4, 5, 6];

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
async function reachableCalendar(page: Page, where: string): Promise<number> {
  await expect(
    page.locator('[data-slot="calendar"]'),
    `${where}: the route rendered no \`[data-slot="calendar"]\`. Every assertion in this file reads ` +
      "a box out of that subtree and an absent box is a null, so this guard is what makes the " +
      "numbers below a measurement rather than an empty pass.",
  ).not.toHaveCount(0, { timeout: 15_000 });

  // The second half of the same guard: a month grid with an IMPOSSIBLE number of week rows is a
  // broken grid, and no height derived from it means anything. It used to pin six — see
  // `LEGAL_WEEK_ROWS`. It now pins the SHAPE and hands the count back, so the height figures below
  // follow the calendar the page rendered instead of the calendar this file was written in.
  const weekRows = page.locator('[data-slot="calendar"] tbody tr');

  await expect(
    weekRows,
    `${where}: the month grid rendered no week rows at all. The height figures below are ` +
      `rows × (${CELL_PX} + ${WEEK_GAP_PX}), and a grid with zero rows makes that product zero — ` +
      "which every box would then agree with. Fix the grid; this is not a month, it is an empty " +
      "table.",
  ).not.toHaveCount(0, { timeout: 15_000 });

  const rows = await weekRows.count();

  expect(
    LEGAL_WEEK_ROWS,
    `${where}: the month grid rendered ${rows} week rows. A month of 28–31 days folded into ` +
      `seven-day rows can only take ${LEGAL_WEEK_ROWS.join(", ")} of them, so a count outside that ` +
      "set is a BROKEN grid rather than a different month — the derived height figures below " +
      `(rows × (${CELL_PX} + ${WEEK_GAP_PX})) absorb every legal count on their own. If this is ` +
      "red, repair the grid; never widen this set to admit the number that was measured.",
  ).toContain(rows);

  return rows;
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

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 12-UI-SPEC AC#15 — THE MONTH PLATE AND THE RESOLVED MONTH GRID ARE THE SAME BOX
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A skeleton whose shape differs from what loads is not a smaller defect than no skeleton — it is a
// layout shift with a shimmer in front of it, and the shift is the thing STATE-01 exists to prevent.
// So the plate is measured against the grid it stands in for, on the route that renders both.
//
// HOW THE TWO STATES ARE PRODUCED, AND WHY NOTHING HERE IS TIMED. `e2e/helpers/served-document.ts`
// truncates the response at React's first streamed-boundary completion marker, which yields the exact
// prefix the browser paints first — produced by the real server, from the real request. On
// `/listings/{id}` that prefix is `(detail)/loading.tsx`'s output, because the page component awaits
// the listing row AND the day's availability inside the route segment's own `<Suspense>`. Measured:
// the marker sits at byte 13,786. So "the month's availability is in flight" is not simulated here,
// it is the state the page is genuinely in while that read runs.
//
// THE MEASURED PAIR — AND IT MOVES WITH THE MONTH, which is the thing this table used to hide.
//
// The 18 August 2026 table was taken in a SIX-row month and read as if its numbers were constants.
// They are not: both sides are `chrome + rows × (44 + 8)`, so the pair slides 52px per week row. What
// is constant is the Δ. Measured 5 September 2026 (19.1 · D-A2), court and grove, with the six-row
// rows taken against a dev server whose clock was shifted 127 days forward so that the plate AND the
// grid were both standing in January 2027:
//
//   rows   width   plate (pending)   calendar (resolved)   Δ
//   ────   ─────   ───────────────   ───────────────────   ────
//   5      320     288 × 358         288 × 357.19          0.81
//   5      768     326 × 358         326 × 357.19          0.81
//   5      1280    326 × 358         326 × 357.19          0.81
//   6      320     288 × 410         288 × 409.19          0.81
//   6      768     326 × 410         326 × 409.19          0.81
//   6      1280    326 × 410         326 × 409.19          0.81
//
// ⚠ THE SIX-ROW ROWS ARE WHERE THE DEFECT HID, AND THAT WAS MEASURED TOO. With the plate's row count
// put back to a hard-coded six, this case is **2 passed** against the faked January clock and
// **2 failed at Δ52.81** against the real September one. A repair verified only in the month it was
// written in is a repair verified in the one month its own bug is invisible — which is how the six
// survived from August 2026 to September 2026 in two files at once.
//
// The 0.81 is the whole of the plate's approximation and it is spent in one place: the weekday row is
// an `h-5` (20px) bar where the resolved row's `text-[0.8rem]` line box is 19.19px. It does NOT grow
// with the row count, which is why the ±2px band did not have to move. The width is EXACT at every
// step, because both sides read the same two strings.
//
// WHY THE ABSOLUTE FIGURE IS ASSERTED TOO, in the shape `skeleton-geometry.spec.ts` and the block
// above both use: two boxes that agree at 340px are exactly as "equal" as two that agree at 409, and
// only one of those is the rendered rows of 44px cells. The number pinned is the WEEKS' box —
// rows × (44 + 8), where `rows` is the count `reachableCalendar` READS off the grid — because that is
// the part of the calendar BFLOW-05 is a claim about, and it is derived from the cell size and the
// rendered month rather than typed in. It was `6 × (44 + 8) = 312` until 19.1-03; the six was an
// assumption about the calendar month this file was written in, and it went red in September 2026.
//
// ── WATCHED RED, run and reverted, 18 August 2026 ────────────────────────────────────────────────
//
//   (c) THE PLATE LOSES A WEEK. `CalendarMonthSkeleton`'s six rows changed to five. The plate is then
//       52px shorter than the grid it stands in for — a shift of exactly one week row, which is the
//       defect this case exists for and one a review of the component would plausibly wave through:
//
//         Error: month plate · court · 320px: the skeleton and its resolved twin differ by more than
//         2px. skeleton {"width":288,"height":358} resolved {"width":288,"height":409.19} —
//         Δwidth 0, Δheight 51.19
//         expect(received).toBeLessThanOrEqual(expected)
//         Expected: <= 2
//         Received: 51.19
//
//       **2 failed / 0 passed**, and the WIDTH stayed exact in both themes — a mutation to the row
//       count reddens the height only, which is the blast radius that says this is measuring the
//       composition rather than the wrapper. Reverted; 2 passed.
//
// ── WATCHED RED, run and reverted, 5 September 2026 (19.1 · D-A2) ────────────────────────────────
//
//   (d) THE PLATE STOPS ASKING THE MONTH. `CalendarMonthSkeleton`'s `weekRows` put back to the literal
//       `6` — the pre-repair shape, not a synthetic mutation — against the real September clock:
//
//         Error: month plate · court · 320px: the skeleton and its resolved twin differ by more than
//         2px. skeleton {"width":288,"height":410} resolved {"width":288,"height":357.1875} —
//         Δwidth 0, Δheight 52.81
//         Received: 52.8125
//
//       **2 failed / 0 passed**, both themes. It is (c) with the sign reversed — the plate too TALL
//       rather than too short. Reverted; 2 passed. The SAME mutation is **2 passed** under the faked
//       January clock, which is the finding rather than a footnote.
//
// ── NOT COVERED ──────────────────────────────────────────────────────────────────────────────────
//   • THE PENDING DOCUMENT DOES NOT HYDRATE (`served-document.ts` property 1). Correct for geometry —
//     it is the pre-hydration paint, which is exactly when a layout shift is visible — and it means
//     this says nothing about a plate mounted INSIDE an already-hydrated page (12-10's sheet). It also
//     means this file cannot see the hazard the D-A2 repair had to avoid: a plate whose row count came
//     from a clock EACH SIDE READ FOR ITSELF would mismatch at hydration, and this case would stay
//     green while the console filled with React errors. That property is proved one layer down, in
//     `tests/design/calendar-plate-month.test.tsx`, by a real `renderToString` → `hydrateRoot` across
//     a month boundary carrying a deliberately clock-reading control required to FAIL.
//   • It compares the plate to the calendar's OUTER box. Two boxes can agree while the caption and the
//     grid inside them sit at different offsets.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/** The ±2px claim, with both boxes and both deltas in the message — `skeleton-geometry.spec.ts:260`. */
function expectSameBox(shape: string, where: string, skeleton: Box, resolved: Box): void {
  const dw = Math.abs(skeleton.width - resolved.width);
  const dh = Math.abs(skeleton.height - resolved.height);
  const detail =
    `${shape} · ${where}: the skeleton and its resolved twin differ by more than ` +
    `${SKELETON_TOLERANCE_PX}px. skeleton ${JSON.stringify(skeleton)} resolved ` +
    `${JSON.stringify(resolved)} — Δwidth ${Math.round(dw * 100) / 100}, ` +
    `Δheight ${Math.round(dh * 100) / 100}`;
  expect(dw, detail).toBeLessThanOrEqual(SKELETON_TOLERANCE_PX);
  expect(dh, detail).toBeLessThanOrEqual(SKELETON_TOLERANCE_PX);
}

/** 320 is the floor, 768 the `md:` step, 1280 Desktop Chrome's default — 12-UI-SPEC AC#15's three. */
const SKELETON_WIDTHS = [320, 768, 1280] as const;

test.describe("AC#15 — the month plate occupies the box the month grid will", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const theme of THEMES) {
    test(`${theme} · plate and grid agree within ±${SKELETON_TOLERANCE_PX}px at 320 / 768 / 1280`, async ({
      page,
      context,
    }) => {
      await seedTheme(context, theme);

      // Install BEFORE the first navigation — `served-document.ts`'s stated ordering.
      const truncator = installTruncator(page);
      await truncator.ready;

      const url = `${BASE}/listings/${seed.listingId}`;

      for (const width of SKELETON_WIDTHS) {
        const where = `${theme} · ${width}px`;
        await page.setViewportSize({ width, height: 900 });

        // ── PENDING: the route's own loading.tsx, every boundary still in its fallback ────────────
        truncator.set(true);
        await page.goto(url);
        await page.evaluate(() => document.fonts.ready);

        // VACUITY GUARD 1: the truncation actually happened. If the marker were ever absent this
        // helper serves the WHOLE document in both modes, and the two "states" below become the same
        // page compared with itself — an equality that passes and measures nothing.
        expect(
          truncator.state.cut,
          `${where}: the pending pass served an untruncated document (${truncator.state.length} ` +
            "bytes, no completion marker found), so both measurements below are the resolved page.",
        ).toBeGreaterThan(0);

        // VACUITY GUARD 2: it is genuinely the PENDING state — the resolved calendar is NOT there.
        await expect(
          page.locator('[data-slot="calendar"]'),
          `${where}: the pending shell already rendered the resolved calendar, so the truncation did ` +
            "not hold the route in its loading state.",
        ).toHaveCount(0);

        const plate = await boxOf(
          page,
          '[data-testid="skeleton-calendar"]',
          `month plate · ${where}`,
        );

        // ── RESOLVED: the whole document ─────────────────────────────────────────────────────────
        truncator.set(false);
        await page.goto(url);
        await page.evaluate(() => document.fonts.ready);
        const weekRowCount = await reachableCalendar(page, where);

        // VACUITY GUARD 3, the mirror of guard 2: the plate is gone, so the second reading is not the
        // placeholder again and this test is not comparing one box with itself.
        await expect(
          page.locator('[data-testid="skeleton-calendar"]'),
          `${where}: the resolved document still holds the month plate, so both measurements are the ` +
            "placeholder.",
        ).toHaveCount(0, { timeout: 15_000 });

        const resolved = await boxOf(page, '[data-slot="calendar"]', `month grid · ${where}`);

        expectSameBox("month plate", where, plate, resolved);

        // ── THE ABSOLUTE FIGURE, IN ITS OWN EXPECTATION ──────────────────────────────────────────
        // The rendered rows of 44px cells with `ui/calendar.tsx`'s 8px between them. Derived from
        // CELL_PX so a change to the constant moves this number with it rather than reddening it for
        // no reason — and derived from the row count `reachableCalendar` just READ, so a five-row
        // month moves it too. The row count is a function of today's date; the arithmetic is not.
        const expectedWeeksHeight = weekRowCount * (CELL_PX + WEEK_GAP_PX);
        const weeks = await boxOf(page, '[data-slot="calendar"] tbody', `month weeks · ${where}`);
        expect(
          weeks.height,
          `month weeks · ${where}: the ${weekRowCount} week rows this month renders measure ` +
            `${weeks.height}px against a derived ${expectedWeeksHeight} = ${weekRowCount} × ` +
            `(${CELL_PX} + ${WEEK_GAP_PX}), where ${weekRowCount} is the row count read off the ` +
            "grid rather than assumed. Two boxes that agree at the wrong height are as equal as two " +
            "that agree at the right one, which is why this is asserted separately from the " +
            "comparison above. Re-measure and move the CELL SIZE, never the tolerance.",
        ).toBe(expectedWeeksHeight);
      }
    });
  }
});
