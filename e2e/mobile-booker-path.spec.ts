import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  BASE,
  openBookingSheet,
  seedBookableListing,
  selectTargetDayIn,
  type SeededListing,
} from "./helpers/booker-seed";
import { seedTheme } from "./helpers/theme";

// RESP-02 — THE MOBILE BOOKER PATH, MEASURED AT THE WIDTH IT IS ABOUT.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THE REQUIREMENT IS, AND WHY EVERY OTHER LAYER ANSWERS A DIFFERENT QUESTION
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// RESP-02 says that at 375px a booker sees a price and reaches a 44px action WITHOUT SCROLLING, and that
// the whole booking rail is behind it in one overlay. Three of those four words are geometry and the
// fourth is a count, so nothing in `tests/` can settle any of it:
//
//   • the design gates read SOURCE. They prove `shadow-sticky` has one product home, that the panel's
//     two placements are declared, and that `booking-panel` is not a computed attribute. They cannot
//     see a bar that renders below the fold, and jsdom has no layout at all (D-131).
//   • `e2e/calendar-hit-area.spec.ts` measures the month grid on this route at four widths. It never
//     opens the sheet and never looks at the bar.
//   • `e2e/price-one-fact.spec.ts` compares the rail's Total with checkout's, at 1280 only, and its own
//     footer says so.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ CASE (c) USES ROLE QUERIES AND A `getByTestId` THERE WOULD BE MEASURING NOTHING
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The whole safety argument for rendering one component twice is that the INACTIVE copy leaves the
// ACCESSIBILITY TREE — `hidden`, not `sr-only`, not `opacity-0`. Playwright's role engine honours that
// (`includeHidden` defaults to false); a `data-testid` query does not. So a testid-based count would
// return 1 against a tree with two live Book buttons in it, which is the exact defect the assertion
// exists for. Every count in case (c) is `getByRole`, and it is `.toBe(1)` rather than
// `toBeGreaterThan(0)` because the failure this file is written for is a SECOND reachable control.
//
// ⚠ 12-UI-SPEC's LITERAL `/^Book/` COLLECTS A THIRD CONTROL, AND THE CORRECTION IS RECORDED RATHER THAN
// QUIET. Measured on the first run of this file, against a correct tree:
//
//     found: "Book full day" / "Book · ₱993.99"
//     Expected: 1   Received: 2
//
// `Book full day` is `slot-picker.tsx:404`'s D-23 control — a shipped SELECTION affordance that picks
// the whole operating day and places no hold at all. It is not a duplicate CTA and it is not this
// plan's; a spec that made it disappear would be deleting a booker control to make a count match, which
// is the rubber-stamp reflex arriving through the gate meant to prevent it. So the regex NAMES THE HOLD
// CTAs (`Book this space` and `Book · {total}`) and the full-day chip gets its OWN `=== 1` beside it —
// which is strictly stronger than the spec's wording, because the duplication hazard applies to that
// control exactly as much as it applies to the CTA, and a narrowed regex alone would have hidden it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY (d) IS BYTE-EQUALITY AND NOT "ROUGHLY THE SAME NUMBER"
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The bar's amount and the sheet's `Total` are produced by the same `AllInTable` lookup and the same
// `formatMoney` call (`selectedTotalLabel`, `availability-calendar.tsx`). A bar that computed its own
// figure — summing `space + fee`, or multiplying a per-hour all-in rate — is a GATE-05 violation that
// agrees with the sheet at most rates and diverges by a centavo at the rounding edge, which is precisely
// the shape a review waves through. String equality is what catches that; a numeric tolerance is not.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS COPIED, AND FROM WHERE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • The seed, the signup-free public route and the venue-tz day math — `e2e/helpers/booker-seed.ts`.
//     `selectTargetDayIn` is that file's own function taking a scope; the math is NOT re-derived here
//     (CLAUDE.md: timezone/DST math re-derived per spec is the top booking-app failure mode).
//   • The width loop inside one test, the both-themes loop and `seedTheme` on the CONTEXT before the
//     first `goto` — `e2e/shell.spec.ts` and `e2e/calendar-hit-area.spec.ts`.
//   • The null-box guard around every `boundingBox()` — `e2e/skeleton-geometry.spec.ts:248-257`. An
//     absent element has no box, and `undefined` compares false against every bound, so a missing bar
//     would turn every size assertion here into a silent pass.
//   • The request counter's shape and its filter — `e2e/public-listing.spec.ts` case (6), including the
//     OBSERVED header name (`next-action`, lowercased by Playwright). It is counted by HEADER and never
//     by path: a Next server action POSTs to the CURRENT ROUTE URL, so a path filter would either match
//     the navigation too or match nothing. The `rsc` header was measured `undefined` on that request,
//     which is why the obvious second guess would have counted zero and been green for no reason.
//   • `document.fonts.ready` before any measurement — a fallback face resolves to a different computed
//     size in some engines and a mid-swap reading is a reading of neither state.
//   • `openBookingSheet` — the shared, RETRIED opener. Its docblock carries the measurement: the bar's
//     trigger is server-rendered and is REPLACED while React finishes with the route, so under
//     full-suite load a single click lands on a detaching node and is lost rather than queued. That was
//     found by `overflow-320.spec.ts`'s new row failing the first whole-suite run in both themes after
//     passing every isolated one — 12-09's finding 6 in a second shape.
//
// ⚠ INHERITED TRAP (`reduced-motion.spec.ts` trap 4, restated by `price-one-fact.spec.ts`):
// `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`. A `next dev` left running across
// the commits that created `booking-sticky-bar.tsx` serves a stale bundle, and the symptom here is a
// missing bar — which reads exactly like a layout defect. IF THIS FILE FAILS ON A CLEAN `git status`,
// KILL THE SERVER ON :3000 AND RE-RUN BEFORE TOUCHING A COMPONENT.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — run and reverted. Command:
// `npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// (A) THE DUPLICATION MADE UNSAFE. `max-lg:hidden` removed from the rail `<aside>` in
//     `src/app/listings/[id]/(detail)/page.tsx` — i.e. the same component rendered twice with nothing
//     removing the inactive copy from the accessibility tree, which is the ENTIRE hazard 12-UI-SPEC's
//     "one instance, two placements" section is about.
//
//       Error: court · 375px: the document holds 2 reachable hold CTAs; expected exactly 1. RESP-02's
//       duplication is safe only while the inactive placement is removed from the ACCESSIBILITY TREE by
//       `hidden` — `sr-only` and `opacity-0` both leave it reachable, and a `getByTestId` count here
//       would have returned 1 against that tree.
//         found: "Book this space" / "Book · ₱993.99"
//       Expected: 1
//       Received: 2
//
//     The failure PRINTS BOTH NAMES, which is what makes it actionable: the first one is the rail's
//     shipped CTA and therefore names the placement that failed to leave. `1 failed, 5 did not run` —
//     this file is `mode: "serial"`, so the remaining cases are skipped rather than exercised by the
//     probe; they are exercised by every green run. Reverted; 6 passed.
//
// (B) THE BAR PRODUCES ITS OWN FIGURE. `selectedTotalLabel(...)` in `booking-sticky-bar.tsx` given a
//     trailing `.replace(/\d$/, "7")` — a ONE-CENTAVO divergence in the last digit, which is the exact
//     signature a locally composed amount has (a `space + fee` sum, or a per-hour all-in rate
//     multiplied out, both of which agree with the table at most rates and differ at the rounding
//     edge — T-12-10-BARPRICE). Written as a string edit rather than as real arithmetic on purpose:
//     the honest version needs the money identifiers this file deliberately does not import, so the
//     probe would have been testing whether the file compiles rather than whether the gate can fail.
//
//       Error: court · 375px: the bar's amount and the sheet's Total are not the same string.
//         bar   "₱993.97"
//         sheet "₱993.99"
//       Both must come from ONE `AllInTable` lookup and ONE `formatMoney` call (`selectedTotalLabel`,
//       availability-calendar.tsx). …
//       Expected: "₱993.99"   Received: "₱993.97"
//
//     Playwright prints the two strings WITH THE DIFFERING CHARACTER HIGHLIGHTED, which is the whole
//     reason this is a string equality rather than a numeric tolerance: a one-centavo gap is invisible
//     to any bound wide enough not to be flaky. Reverted; 6 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • SWIPE, TOUCH ERGONOMICS AND ONE-HANDED REACH ARE HUMAN-UAT ITEMS (Phase 17). This file measures
//     boxes and counts controls in a desktop Chromium with a phone-sized viewport. Whether a 44px
//     target is comfortable for a thumb, whether the sheet's dismiss gesture is discoverable without
//     one, and whether the bar sits inside the one-handed reach zone on a real device are all questions
//     a Playwright run cannot ask. Drag-to-dismiss is explicitly OUT OF SCOPE and there is deliberately
//     no grab handle (`responsive-dialog.tsx`), so "swipe does nothing" is the shipped behaviour rather
//     than a gap this file is hiding.
//   • ONE LISTING, ONE MODE, ONE WINDOW SHAPE — an `instant`, EXCLUSIVE, hourly booking at a flat rate.
//     It says nothing about the full-day line or the drop-in per-pass path, both of which the same panel
//     renders. The seeded fixture is exclusive and the local catalogue holds no durable `open_capacity`
//     row (12-09 measured that), so the drop-in sheet is not driven here.
//     ⚠ THAT GAP IS NOT HARMLESS AND IT WAS FOUND THE HARD WAY. `e2e/overflow-320.spec.ts`'s sheet-open
//     row discovers its listing from the running catalogue and landed on a seeded DROP-IN one, where
//     the bar rendered no `Check availability` at all — `date-pass-picker.tsx` seeds a selection from a
//     mount effect, so the bar's selection state was live before the booker had touched anything and
//     the sheet was structurally unreachable. The fix and its two costs are at `booking-sticky-bar.tsx`;
//     the residual is logged in `deferred-items.md`. A drop-in fixture here would have caught it, and
//     the reason there isn't one is a seeding gap rather than a judgement.
//   • IT NEVER PRESSES `Book`. The bar's submission path is `BookCta`'s own — the same action, the same
//     guard — and pressing it from an anonymous session redirects to `/login`. What the hold DOES is
//     `e2e/search-and-book.spec.ts`'s and `e2e/price-parity.spec.ts`'s.
//   • ONE HEIGHT PER WIDTH. 375×812 and 320×568. It says nothing about a landscape phone, where the
//     sheet's `85dvh` cap and the bar's 64px are a much larger fraction of the viewport.
//   • NOT IN CI (D-24). It seeds real rows against the local Postgres.

test.describe.configure({ mode: "serial" });

const THEMES = ["court", "grove"] as const;

/** The reference phone. 12-UI-SPEC's responsive baseline names it and RESP-02 is stated at it. */
const PHONE = { width: 375, height: 812 };

/** The floor, at the SHORTEST height in the baseline — the case the sheet's internal scroll exists for. */
const FLOOR = { width: 320, height: 568 };

/** `lg:` and Desktop Chrome's default. The width at which the rail is the booking surface. */
const DESKTOP = { width: 1280, height: 900 };

/** `STICKY_BAR_HEIGHT` is `h-16`. Asserted as the literal, in its own expectation. */
const BAR_HEIGHT_PX = 64;

/** WCAG 2.5.5 / D-22's `size="touch"`. The bar's action is the page's focal control below `lg:`. */
const TOUCH_TARGET_PX = 44;

/** Sub-pixel tolerance, `skeleton-geometry.spec.ts`'s number. Fractional layout, integer expectations. */
const TOLERANCE_PX = 1;

/** One window per test, so two selections on one exclusive listing never contend for the same hours. */
const WINDOWS = {
  court: ["8:00 AM", "9:00 AM"],
  grove: ["11:00 AM", "12:00 PM"],
} as const;

const BAR = '[data-testid="booking-sticky-bar"]';
const SHEET = '[data-testid="responsive-dialog"]';

/**
 * The two accessible names a HOLD-PLACING control can have: the rail's shipped `Book this space` and
 * D-59 #3's `Book · {total}` on the sticky bar and the sheet's pinned action.
 *
 * Anchored at the start and explicit about the two forms, for the reason measured in this file's
 * header: a bare `/^Book/` also collects `slot-picker.tsx`'s `Book full day`, which selects a window
 * rather than placing a hold. That control is counted separately below, not excused.
 */
const BOOK_CTA = /^Book(?: this space| · )/;

/** `slot-picker.tsx:404`'s D-23 full-day selector — one per document, for the same reason. */
const FULL_DAY_CONTROL = "Book full day";

type Box = { x: number; y: number; width: number; height: number };

let seed: SeededListing;

test.beforeAll(async () => {
  seed = await seedBookableListing({ titlePrefix: "E2E MobilePath" });
});

test.afterAll(async () => {
  await seed?.teardown();
});

/**
 * One box, or a named failure. Never `null` reaching a comparison.
 *
 * `skeleton-geometry.spec.ts:248-257`'s shape, including the `display:none` clause: an element with no
 * layout box has no box at all, and `undefined` compares false against every bound — which would turn
 * every expectation in this file into a silent pass.
 */
async function boxOf(target: Locator, label: string): Promise<Box> {
  await expect(target, `${label}: no element matched`).toHaveCount(1);
  const box = await target.boundingBox();
  expect(box, `${label}: matched but has no layout box (display:none?)`).not.toBeNull();
  return box!;
}

/**
 * TRAP 1 (`overflow-320.spec.ts:341-353`): prove the route rendered the surface under test BEFORE
 * asserting anything about it. Every assertion below is "a box is somewhere" or "a count is 1", and a
 * page that never rendered the bar satisfies neither in a way that names itself.
 *
 * 15s rather than the default 5: the dev server compiles routes on demand, and a reachability guard
 * that flakes is one people learn to ignore (that file's measured allowance).
 */
async function reachableBar(page: Page, where: string): Promise<void> {
  await expect(
    page.locator(BAR),
    `${where}: the route rendered no \`${BAR}\`. Every measurement in this file reads a box or a count ` +
      "out of that element, and an absent element produces a null box and a zero count — both of which " +
      "pass a badly written assertion.",
  ).not.toHaveCount(0, { timeout: 15_000 });
}

/**
 * Pick the seeded window INSIDE the open sheet.
 *
 * Scoped to the sheet rather than to the page, and the reason is measured rather than stylistic: with
 * the sheet open the document holds TWO month grids and two slot pickers — the main column's and the
 * sheet's. Radix marks the background `aria-hidden`, so role queries already resolve to the sheet
 * alone; the CSS half of `selectTargetDayIn`'s intersection does not, which is why that helper takes a
 * scope at all.
 */
async function pickWindowInSheet(
  sheet: Locator,
  window: readonly string[],
  where: string,
): Promise<void> {
  await selectTargetDayIn(sheet);
  const start = sheet.getByRole("button", { name: window[0], exact: true });
  await expect(
    start,
    `${where}: the sheet's slot picker never rendered ${window[0]}. The sheet mounts the same ` +
      "`BookingPanel` the rail does, so an absent chip here means the panel's sheet placement did not " +
      "render its calendar at all.",
  ).toHaveCount(1);
  await start.click();
  await sheet.getByRole("button", { name: window[1], exact: true }).click();
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (a) + (c) + (d) — the bar without scrolling, one Book button, one byte-equal amount.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("RESP-02 — a price and a 44px action without scrolling", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const theme of THEMES) {
    test(`${theme} · 375px · the bar, the sheet, and exactly one Book`, async ({ page, context }) => {
      await seedTheme(context, theme);
      await page.setViewportSize(PHONE);
      await page.goto(`${BASE}/listings/${seed.listingId}`);
      await page.evaluate(() => document.fonts.ready);

      const where = `${theme} · ${PHONE.width}px`;
      await reachableBar(page, where);

      // ── (a) VISIBLE WITHOUT SCROLLING ─────────────────────────────────────────────────────────────
      // The requirement is not "the bar exists" and it is not "the bar is visible after scrolling to
      // it" — the rail was already both of those and RESP-02 exists because neither was enough. So the
      // page must be at the top when this is read.
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(
        scrollY,
        `${where}: the page was not at the top when the bar's box was read, so "visible without ` +
          `scrolling" would be measuring a scrolled document.`,
      ).toBe(0);

      const bar = await boxOf(page.locator(BAR), `sticky bar · ${where}`);
      expect(
        bar.height,
        `${where}: the bar is ${bar.height}px tall, not ${BAR_HEIGHT_PX}. STICKY_BAR_HEIGHT is a ` +
          "declared measurement and STICKY_BAR_CLEARANCE (80 = 64 + 16) is derived from it, so a bar " +
          "that grew silently leaves the last row of the page under it.",
      ).toBe(BAR_HEIGHT_PX);
      expect(
        bar.y + bar.height,
        `${where}: the bar's bottom edge is at ${bar.y + bar.height} against a ${PHONE.height}px ` +
          "viewport — it is not anchored to the bottom of the screen, which is the only position at " +
          "which it is reachable without scrolling.",
      ).toBeLessThanOrEqual(PHONE.height + TOLERANCE_PX);
      expect(bar.y, `${where}: the bar starts above the viewport.`).toBeGreaterThanOrEqual(0);

      // …and it holds a real 44px target, not a 64px box with a text link in it.
      const action = await boxOf(
        page.locator(BAR).getByRole("button").first(),
        `bar action · ${where}`,
      );
      expect(
        { width: action.width >= TOUCH_TARGET_PX, height: action.height >= TOUCH_TARGET_PX },
        `${where}: the bar's action measures ${action.width} × ${action.height}, below the ` +
          `${TOUCH_TARGET_PX} × ${TOUCH_TARGET_PX} WCAG 2.5.5 target. It is the page's focal control ` +
          "at this width; a control that is a coin-flip to tap is the requirement failing.",
      ).toEqual({ width: true, height: true });

      // ── (c), FIRST HALF: NO DIALOG UNTIL THE BAR IS TAPPED ────────────────────────────────────────
      expect(
        await page.getByRole("dialog").count(),
        `${where}: a dialog is already open on first paint. The sheet must be mounted by the booker's ` +
          "own tap — a portal that renders unconditionally is the `useMediaQuery` fork wearing a " +
          "pattern's name.",
      ).toBe(0);

      // ── OPEN IT, AND PICK A WINDOW INSIDE IT ─────────────────────────────────────────────────────
      const sheet = await openBookingSheet(page, where);
      await page.evaluate(() => document.fonts.ready);
      await pickWindowInSheet(sheet, WINDOWS[theme], where);

      // ── (d) THE BAR'S AMOUNT AND THE SHEET'S TOTAL ARE THE SAME STRING ───────────────────────────
      const sheetTotal = page.getByTestId("sheet-price-total");
      await expect(
        sheetTotal,
        `${where}: the sheet rendered no \`sheet-price-total\`. One hook per surface is condition 3, ` +
          "and a zero here means the sheet placement is not rendering its breakdown at all.",
      ).toHaveCount(1);
      const sheetText = ((await sheetTotal.textContent()) ?? "").trim();

      // The bar is behind an `aria-hidden` background while the sheet is open, so its amount is read
      // from the DOM rather than through a role query — which is correct: the claim is about the
      // STRING the bar renders, not about a control being reachable at this instant.
      const barText = ((await page.locator(BAR).textContent()) ?? "").trim();
      const amount = barText.split("·").pop()?.trim() ?? "";

      // Guard the guard: an empty string equals an empty string.
      expect(
        sheetText.length,
        `${where}: the sheet's Total rendered no text, so the equality below would compare two empty ` +
          "strings.",
      ).toBeGreaterThan(0);
      expect(
        barText,
        `${where}: the bar never entered its selection state — it still reads ${JSON.stringify(
          barText,
        )}. D-59 #3 requires the bar to read \`Book · {total}\` the moment a window exists, and a bar ` +
          "stuck on `Check availability` makes the equality below vacuous.",
      ).toContain("Book");

      expect(
        amount,
        `${where}: the bar's amount and the sheet's Total are not the same string.\n` +
          `  bar   ${JSON.stringify(amount)}\n  sheet ${JSON.stringify(sheetText)}\n` +
          "Both must come from ONE `AllInTable` lookup and ONE `formatMoney` call " +
          "(`selectedTotalLabel`, availability-calendar.tsx). A figure composed on the bar is a second " +
          "source of truth on the money path and diverges from the frozen quote at the rounding edge, " +
          "which is exactly where nothing else notices (GATE-05 / T-12-10-BARPRICE).",
      ).toBe(sheetText);

      // ── (c), SECOND HALF: EXACTLY ONE `Book` AT 375px, SHEET CLOSED ──────────────────────────────
      // ⚠ ROLE QUERY, NEVER `getByTestId`. See this file's header: a testid query finds the
      // `max-lg:hidden` rail copy and would be green against two live controls.
      await page.keyboard.press("Escape");
      await expect(page.locator(SHEET), `${where}: Escape did not dismiss the sheet.`).toHaveCount(0);

      const names = await page.getByRole("button", { name: BOOK_CTA }).allInnerTexts();
      expect(
        names.length,
        `${where}: the document holds ${names.length} reachable hold CTAs; expected exactly 1. ` +
          "RESP-02's duplication is safe only while the inactive placement is removed from the " +
          "ACCESSIBILITY TREE by `hidden` — `sr-only` and `opacity-0` both leave it reachable, and a " +
          "`getByTestId` count here would have returned 1 against that tree.\n" +
          `  found: ${names.map((n) => JSON.stringify(n)).join(" / ")}`,
      ).toBe(1);

      // The same claim about the OTHER control the two placements duplicate — see the header for why
      // it is counted rather than excluded from the regex above.
      expect(
        await page.getByRole("button", { name: FULL_DAY_CONTROL, exact: true }).count(),
        `${where}: the document holds more than one reachable \`${FULL_DAY_CONTROL}\`. Both booking ` +
          "placements render a slot picker, so this is the same duplication hazard as the CTA's and " +
          "the same mechanism has to answer it.",
      ).toBe(1);

      expect(
        await page.getByRole("dialog").count(),
        `${where}: a dialog survived the sheet's dismissal.`,
      ).toBe(0);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (b) + (f) — the 320px floor: neither line wraps, and the pinned action stays reachable.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe(`RESP-02 — the ${FLOOR.width}×${FLOOR.height} floor`, () => {
  test.describe.configure({ timeout: 120_000 });

  for (const theme of THEMES) {
    test(`${theme} · ${FLOOR.width}px · no wrap, and the sheet's action stays on screen`, async ({
      page,
      context,
    }) => {
      await seedTheme(context, theme);
      await page.setViewportSize(FLOOR);
      await page.goto(`${BASE}/listings/${seed.listingId}`);
      await page.evaluate(() => document.fonts.ready);

      const where = `${theme} · ${FLOOR.width}px`;
      await reachableBar(page, where);

      // ── (b) NEITHER LINE MAY WRAP ────────────────────────────────────────────────────────────────
      // A wrapped rate is a clipped rate inside a 64px box, and a wrapped `Service fee included` is a
      // disclosure the booker cannot finish reading — on the one surface that carries the price at this
      // width. Measured against the element's OWN resolved line-height rather than against a literal,
      // because the two lines are different type steps and both tokens are per-theme.
      const lines = page.locator(BAR).locator("p");
      await expect(
        lines,
        `${where}: the bar rendered ${await lines.count()} text lines; expected the rate and the fee ` +
          "note. A different count means the left column changed shape and the wrap measurement below " +
          "is about something else.",
      ).toHaveCount(2);

      for (let i = 0; i < 2; i++) {
        const measured = await lines.nth(i).evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            clientHeight: el.clientHeight,
            lineHeight: parseFloat(style.lineHeight),
            text: (el.textContent ?? "").trim(),
          };
        });

        // Guard the guard, twice: an empty line never wraps, and a `normal` line-height parses to NaN,
        // which compares false against every bound and would make this a silent pass.
        expect(
          measured.text.length,
          `${where}: bar line ${i} rendered no text, so a no-wrap assertion over it is free.`,
        ).toBeGreaterThan(0);
        expect(
          Number.isFinite(measured.lineHeight),
          `${where}: bar line ${i} resolves no numeric line-height (${JSON.stringify(
            measured.text,
          )}), so there is no single-line reference to compare against.`,
        ).toBe(true);

        expect(
          measured.clientHeight,
          `${where}: the bar's ${i === 0 ? "rate" : "fee note"} line wraps — it renders ` +
            `${measured.clientHeight}px against a one-line box of ${measured.lineHeight}px. Text: ` +
            `${JSON.stringify(measured.text)}. The bar's height is a fixed 64px, so a second line is ` +
            "clipped rather than accommodated (12-UI-SPEC § The sticky bottom bar).",
        ).toBeLessThanOrEqual(measured.lineHeight + TOLERANCE_PX);
      }

      // ── (f) THE SHEET'S PINNED ACTION SURVIVES A SCROLL TO THE BOTTOM ────────────────────────────
      // 320×568 is the case the pinned bar exists for: the sheet's content does not fit, so the booker
      // WILL scroll, and an action that scrolls away with the content is an action they have to go
      // looking for on the surface that replaces the whole rail.
      const sheet = await openBookingSheet(page, where);

      // The sheet's CONTENT must have arrived before "does it overflow, and does the action survive
      // the scroll" means anything: an empty overlay neither overflows nor scrolls, and both guards
      // below would then be measuring a box nothing had filled. The month grid is the bulk of it and
      // is what makes the sheet taller than a 568px viewport in the first place. 15s is
      // `overflow-320.spec.ts`'s measured allowance for a dev server compiling on demand.
      await expect(
        sheet.locator('[data-slot="calendar"]'),
        `${where}: the sheet opened but its booking panel never rendered a month grid, so the overflow ` +
          "and reachability assertions below would be about an empty overlay.",
      ).toHaveCount(1, { timeout: 15_000 });
      await page.evaluate(() => document.fonts.ready);

      const pinnedAction = sheet.getByRole("button", { name: BOOK_CTA });
      await expect(
        pinnedAction,
        `${where}: the sheet renders no pinned \`Book\` action. It is the last child of the sheet's ` +
          "scroll container and it is what makes the sheet usable at this height.",
      ).toHaveCount(1, { timeout: 15_000 });

      const before = await boxOf(pinnedAction, `pinned action (top) · ${where}`);
      expect(
        before.y + before.height,
        `${where}: the sheet's action is already off-screen before any scrolling.`,
      ).toBeLessThanOrEqual(FLOOR.height + TOLERANCE_PX);

      // `DialogContent` IS the scroll container (`max-sm:overflow-y-auto` on the sheet presentation),
      // so the scroll is driven on it rather than on the document.
      const scrolled = await sheet.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
        return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
      });
      // Guard the guard: a sheet that does not overflow was never scrolled, and "still on screen"
      // would then be true of a box nothing moved.
      expect(
        scrolled.scrollHeight,
        `${where}: the sheet's content (${scrolled.scrollHeight}px) fits inside its box ` +
          `(${scrolled.clientHeight}px), so nothing scrolled and the assertion below measures a box ` +
          "that never moved. At this viewport the sheet is expected to overflow — that is the whole " +
          "reason the action is pinned.",
      ).toBeGreaterThan(scrolled.clientHeight);
      expect(scrolled.scrollTop, `${where}: the sheet did not scroll.`).toBeGreaterThan(0);

      const after = await boxOf(pinnedAction, `pinned action (bottom) · ${where}`);
      expect(
        after.y + after.height,
        `${where}: after scrolling the sheet to the bottom the action sits at ` +
          `${after.y + after.height} against a ${FLOOR.height}px viewport — it scrolled away with the ` +
          "content. `sticky bottom-0` inside the sheet's own scroll container is what keeps the amount " +
          "and the action reachable from anywhere in the month grid (T-12-10-CLEARANCE).",
      ).toBeLessThanOrEqual(FLOOR.height + TOLERANCE_PX);
      expect(
        after.y,
        `${where}: the pinned action is above the top of the viewport after scrolling.`,
      ).toBeGreaterThanOrEqual(0);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (e) — ONE availability request per day selection, at both widths. Condition 1, measured.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("RESP-02 — two views, one state, ONE fetch", () => {
  test.describe.configure({ timeout: 150_000 });

  for (const theme of THEMES) {
    test(`${theme} · one day selection issues exactly one availability request at 375 and 1280`, async ({
      page,
      context,
    }) => {
      await seedTheme(context, theme);

      // INSTALLED BEFORE THE FIRST `goto` — `served-document.ts`'s stated ordering, and the reason is
      // the same one: a handler registered after the navigation counts nothing that happened during it,
      // and the first paint being free of client fetches is half of what this case asserts.
      let actionRequests = 0;
      await page.route("**/*", async (route) => {
        const request = route.request();
        // BY HEADER, NEVER BY PATH. A Next server action POSTs to the CURRENT ROUTE URL, so a path
        // filter matches the navigation or nothing at all. `next-action` is the OBSERVED name, recorded
        // verbatim in `e2e/public-listing.spec.ts`'s header along with the measurement that `rsc` is
        // undefined on that request — the obvious second guess would have counted zero.
        if (request.method() === "POST" && request.headers()["next-action"] !== undefined) {
          actionRequests += 1;
        }
        await route.continue();
      });

      // ── 375px: THE SELECTION IS MADE INSIDE THE SHEET ────────────────────────────────────────────
      // Deliberately the sheet's calendar and not the main column's: the claim is that the OTHER
      // mounted placement is a pure consumer, and driving the copy the sheet owns is what makes a
      // second fetch from the hidden one visible.
      await page.setViewportSize(PHONE);
      await page.goto(`${BASE}/listings/${seed.listingId}`);
      await page.evaluate(() => document.fonts.ready);
      const phoneWhere = `${theme} · ${PHONE.width}px`;
      await reachableBar(page, phoneWhere);

      expect(
        actionRequests,
        `${phoneWhere}: the first paint issued ${actionRequests} server-action requests. The RSC seeds ` +
          "the opening day's availability, so a client fetch here is a duplicate read before the " +
          "booker has done anything.",
      ).toBe(0);

      const sheet = await openBookingSheet(page, phoneWhere);
      expect(
        actionRequests,
        `${phoneWhere}: opening the sheet issued ${actionRequests} availability requests. The sheet ` +
          "mounts a second VIEW, not a second hook — the day it shows is the one the provider already " +
          "holds.",
      ).toBe(0);

      await selectTargetDayIn(sheet);
      // Wait for the day panel to resolve so a slow response is not read as an absent one.
      await expect(
        sheet.getByRole("button", { name: WINDOWS[theme][0], exact: true }),
        `${phoneWhere}: the sheet's day never resolved, so the request count below may be short.`,
      ).toHaveCount(1, { timeout: 15_000 });

      expect(
        actionRequests,
        `${phoneWhere}: one day selection issued ${actionRequests} availability requests; expected ` +
          "exactly 1. `=== 1` and not `>= 1` on purpose — the defect RESP-02's duplication invites is " +
          "TWO views each owning their own day state and each fetching, which `>= 1` is green for.",
      ).toBe(1);

      // ── 1280px: THE MAIN COLUMN'S CALENDAR, AND THE SAME COUNT ───────────────────────────────────
      actionRequests = 0;
      await page.setViewportSize(DESKTOP);
      await page.goto(`${BASE}/listings/${seed.listingId}`);
      await page.evaluate(() => document.fonts.ready);
      const deskWhere = `${theme} · ${DESKTOP.width}px`;

      await expect(
        page.locator('[data-slot="calendar"]'),
        `${deskWhere}: the desktop layout rendered no month grid.`,
      ).not.toHaveCount(0, { timeout: 15_000 });
      expect(actionRequests, `${deskWhere}: the first paint issued a client fetch.`).toBe(0);

      await selectTargetDayIn(page);
      await expect(
        page.getByRole("button", { name: WINDOWS[theme][0], exact: true }),
        `${deskWhere}: the day never resolved, so the request count below may be short.`,
      ).toHaveCount(1, { timeout: 15_000 });

      expect(
        actionRequests,
        `${deskWhere}: one day selection issued ${actionRequests} availability requests; expected ` +
          "exactly 1.",
      ).toBe(1);

      // ── (c) AT 1280: THE RAIL IS THE ONLY REACHABLE `Book` ───────────────────────────────────────
      // The mirror of the 375px count, on the same document the fetch was just measured on. The sticky
      // bar is `lg:hidden` here, so a 2 means the bar leaked into the desktop layout.
      const names = await page.getByRole("button", { name: BOOK_CTA }).allInnerTexts();
      expect(
        names.length,
        `${deskWhere}: the document holds ${names.length} reachable hold CTAs; expected exactly 1.\n` +
          `  found: ${names.map((n) => JSON.stringify(n)).join(" / ")}`,
      ).toBe(1);
      expect(
        await page.getByRole("button", { name: FULL_DAY_CONTROL, exact: true }).count(),
        `${deskWhere}: more than one reachable \`${FULL_DAY_CONTROL}\` — the sticky bar's placement ` +
          "leaked into the desktop layout.",
      ).toBe(1);
      expect(
        await page.getByRole("dialog").count(),
        `${deskWhere}: a dialog is mounted at a width where the sheet is unreachable.`,
      ).toBe(0);
    });
  }
});
