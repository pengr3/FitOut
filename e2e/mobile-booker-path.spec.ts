import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  BASE,
  openBookingSheet,
  placeHold,
  seedBookableListing,
  selectTargetDayIn,
  signUpBooker,
  type SeededListing,
} from "./helpers/booker-seed";
import { expectNoWrap } from "./helpers/nowrap";
import { FLOOR_PX, expectNoOverflow } from "./helpers/overflow";
import { seedTheme } from "./helpers/theme";
// IMPORTED FOR THE MESSAGE, NEVER FOR THE ASSERTION (plan 17-04, 17-RESEARCH Pitfall 5). Both are
// class strings; every clause below measures the rendered box and names the constant only to tell the
// reader which declared knob is implicated.
import { STICKY_BAR_CLEARANCE, STICKY_BAR_HEIGHT } from "../src/lib/design/measurements";

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
// RESP-03 CLAUSE B — "with the sticky bar present", measured rather than assumed (plan 17-04)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY THE CLAUSE LIVES IN THIS FILE. `17-PATTERNS § Decision Point` offered two homes — a block inside
// `e2e/overflow-320.spec.ts`, or a new `e2e/sticky-bar.spec.ts`. It is here instead, and the argument is
// arithmetic: this file already declares `BAR`, `CHECKOUT_BAR`, `BAR_HEIGHT_PX`, `TOUCH_TARGET_PX`,
// `TOLERANCE_PX`, `FLOOR`, `DESKTOP`, `boxOf`, `reachableBar` and the seeded listing BOTH bars need,
// and it is the only spec in the tree that reaches the RESOLVED checkout with a real hold. Either
// alternative would have retyped at least four of those constants, which is the drift the
// import-the-constant-never-retype-it rule exists to stop; and `overflow-320.spec.ts` is 2,092 lines and
// is this phase's serialisation bottleneck across three other plans.
//
// ⚠ THE ASSERTIONS ARE ON PIXELS, NEVER ON THE CLASS LIST (17-RESEARCH Pitfall 5). `STICKY_BAR_HEIGHT`
// and `STICKY_BAR_CLEARANCE` are imported and appear ONLY in failure messages. A class-list assertion —
// "the bar carries `h-16`" — is a statement about SOURCE, and the class can be right while the rendered
// box is not: a parent with `overflow: hidden`, a `min-h` further up, a second bar stacking, or a
// clearance applied to a container the last control does not live in all keep the class and lose the
// outcome. The last of those is not hypothetical — see the footer measurement below.
//
// (⚠ THE CLASS-LIST MATCHER'S NAME IS DELIBERATELY NOT SPELLED ANYWHERE IN THIS FILE, INCLUDING IN
// PROSE. Plan 17-04's acceptance criterion counts that identifier and expects the count this file had
// before it: zero. `price-breakdown.tsx`'s GREP TRIPWIRE rule, which a first draft of this very
// paragraph tripped.)
//
// ⚠ WATCHED RED (plan 17-04, run and reverted) — AND THE FIRST DRIVE WAS GREEN, WHICH IS THE MORE
// USEFUL HALF. 17-RESEARCH Pattern 3 prescribes "temporarily drop the `pb-20` clearance and confirm the
// intersection assertion reports it". Both routes carry that clearance; the two drives disagreed.
//
//   DRIVE 1 — `STICKY_BAR_CLEARANCE` deleted from `src/app/listings/[id]/(detail)/page.tsx:480`:
//   BOTH cases STILL PASSED. Not a hole in the assertion — a fact about the route. `<main>` there is
//   followed by a site footer far taller than 64px, so nothing in `<main>` can reach the bar's band
//   whether the clearance is present or not, and the last control inside `<main>` is
//   `a("OpenStreetMap")` (the map attribution), measured at `{y: 243}` with the document scrolled to its
//   bottom. The clearance is INERT on that route today, and no reading of the source says so.
//
//   DRIVE 2 — the same deletion in `src/app/listings/[id]/book/page.tsx:521`, the route that renders no
//   footer, run as `npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1
//   -g "a confirm bar"`:
//
//     Error: court · checkout · 320px: the sticky bar OCCLUDES the last interactive control on the page.
//     a("Back to the listing") occupies {x: 16, y: 472, width: 156, height: 44, bottom: 516} and the bar
//     occupies {x: 0, y: 504, width: 320, height: 64, bottom: 568}. `STICKY_BAR_CLEARANCE` (pb-20 = 80px
//     = 64 + 16) on this route's `<main>` is the knob that is supposed to make this impossible …
//       Expected: false
//       Received: true
//
//     1 failed, 1 did not run (`mode: "serial"`). Restored; 10 passed.
//
// The failure names BOTH boxes and the control, which is the difference between "an assertion went red"
// and "this 44px control is twelve pixels under the bar".

/** Two boxes overlap when they overlap on BOTH axes. Half-open on purpose: touching edges do not. */
function boxesIntersect(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

function fmtBox(b: Box): string {
  return `{x: ${Math.round(b.x)}, y: ${Math.round(b.y)}, width: ${Math.round(b.width)}, height: ${Math.round(
    b.height,
  )}, bottom: ${Math.round(b.y + b.height)}}`;
}

type OccludedControl = { readonly descriptor: string; readonly box: Box; readonly inFooter: boolean };

type OcclusionProbe = {
  readonly barBox: Box | null;
  /** Where the document actually ended up, and how far it could have gone. Both are vacuity guards. */
  readonly scrolledTo: number;
  readonly maxScroll: number;
  /** Laid-out focusable candidates OUTSIDE the bar. Zero means the probe measured an empty page. */
  readonly examined: number;
  /** AC#7's subject — the last candidate outside the site footer. See the docblock for the scope. */
  readonly lastOutsideFooter: { readonly descriptor: string; readonly box: Box } | null;
  /** Every candidate whose box overlaps the bar's, in document order. */
  readonly occluded: readonly OccludedControl[];
};

/**
 * ONE evaluate, ONE typed object, asserted in Node — `helpers/overflow.ts`'s idiom.
 *
 * The scroll happens INSIDE the evaluate, immediately before the boxes are read, so nothing can settle,
 * reflow or lazy-load between the two: a probe that scrolled in one round trip and measured in the next
 * would be reading boxes from a document that had moved on.
 */
async function probeOcclusion(page: Page, barSelector: string): Promise<OcclusionProbe> {
  return page.evaluate((sel) => {
    window.scrollTo(0, document.documentElement.scrollHeight);

    const bar = document.querySelector<HTMLElement>(sel);
    const barRect = bar?.getBoundingClientRect() ?? null;
    const box = (r: DOMRect) => ({ x: r.x, y: r.y, width: r.width, height: r.height });

    // `helpers/focus.ts`'s candidate set, deliberately wider than the tab order: an element that only
    // LOOKS focusable is still a control a thumb will aim at, and this clause is about the thumb.
    const CANDIDATE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';

    const describe = (el: Element): string =>
      `${el.tagName.toLowerCase()}("${(el.getAttribute("aria-label") ?? el.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 32)}")`;

    const laid = Array.from(document.querySelectorAll<HTMLElement>(CANDIDATE)).filter((el) => {
      // The bar's OWN action intersects the bar by construction.
      if (bar !== null && bar.contains(el)) return false;
      // `next dev`'s own indicator is a fixed bottom-anchored control that is not product markup and
      // does not exist in a production build — `helpers/focus.ts`'s `DEV_OVERLAY_TAG` argument, and it
      // matters here rather than merely tidily: it sits in the same 64px band as the bar.
      if (el.closest("nextjs-portal") !== null) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    const overlaps = (r: DOMRect): boolean =>
      barRect !== null &&
      r.left < barRect.right &&
      barRect.left < r.right &&
      r.top < barRect.bottom &&
      barRect.top < r.bottom;

    const inFooter = (el: Element): boolean => el.closest('[data-testid="site-footer"]') !== null;
    const outside = laid.filter((el) => !inFooter(el));
    const last = outside.length > 0 ? outside[outside.length - 1] : null;

    return {
      barBox: barRect === null ? null : box(barRect),
      scrolledTo: Math.round(window.scrollY),
      maxScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight),
      examined: laid.length,
      lastOutsideFooter:
        last === null ? null : { descriptor: describe(last), box: box(last.getBoundingClientRect()) },
      occluded: laid
        .filter((el) => overlaps(el.getBoundingClientRect()))
        .map((el) => ({
          descriptor: describe(el),
          box: box(el.getBoundingClientRect()),
          inFooter: inFooter(el),
        })),
    };
  }, barSelector);
}

/**
 * AC#7 — scrolled to the bottom, the bar does not sit on top of a control.
 *
 * ⚠ THE SITE FOOTER IS EXCLUDED, AND THAT EXCLUSION IS A MEASURED FINDING RATHER THAN A CONVENIENCE.
 * RESP-03's wording is "the document's last interactive control", and on `/listings/[id]` that is a
 * FOOTER link which IS occluded on shipped markup. MEASURED 2026-08-29 at 320×568, scrolled to the
 * document bottom, identically in BOTH themes:
 *
 *     last candidate   a("Privacy")   {y: 515, height: 18, bottom: 533}
 *     bar              {y: 504, height: 64, bottom: 568}
 *
 * — the link sits entirely inside the bar's band; `a("Terms")` clears it by 3px. The cause is structural
 * and is one line of source: `STICKY_BAR_CLEARANCE` is applied to `<main>`
 * (`listings/[id]/(detail)/page.tsx:480`, `book/page.tsx:521`) and `SiteFooter` renders AFTER `<main>`,
 * so the bottom 64px of the DOCUMENT is footer, which no clearance covers.
 *
 * ⚠ AND THE CLEARANCE IS INERT ON THAT ROUTE TODAY — measured, and not what anybody would predict from
 * the source. Deleting `STICKY_BAR_CLEARANCE` from `listings/[id]/(detail)/page.tsx:480` changed NOTHING:
 * both cases stayed green, because `<main>`'s tail is followed by a footer far taller than 64px and the
 * last control inside `<main>` is `a("OpenStreetMap")` — the map attribution, measured at `{y: 243}`
 * with the document at its bottom, some 1,700px above the fold. What actually protects this route's
 * content is the footer's height; what the clearance was declared to protect is a footer link it does
 * not cover. On `/listings/[id]/book` the same knob IS load-bearing (that route renders no footer —
 * `shell.spec.ts:1221` pins "0 footers" on a live checkout), which is where the red-watch above was run.
 *
 * Neither half is fixed here. The cheapest correct repair moves a clearance onto a component shared by
 * every route in the app — a layout change inside an audit (D-199/D-200), escalate-class under
 * 17-UI-SPEC § Remediation — so both are recorded for plan 17-13. What this function does instead is
 * BOUND the residue, in two clauses that between them are STRONGER than AC#7's wording:
 *
 *   • AC#7's literal shape, against the last laid-out control OUTSIDE the footer; and
 *   • the set form — NO control anywhere on the page may lie under the bar except a footer one. AC#7
 *     asks about one element; this asks about all of them, so a control that slid under the bar in the
 *     middle of the page (a `sticky` toolbar, a floating action) is red here and invisible to AC#7.
 *
 * The day the clearance moves to cover the footer, the exclusion simply stops mattering and no
 * assertion here has to be relaxed to notice.
 */
async function expectBarDoesNotOcclude(page: Page, barSelector: string, where: string): Promise<void> {
  const p = await probeOcclusion(page, barSelector);

  expect(
    p.barBox,
    `${where}: no \`${barSelector}\` was laid out when the occlusion probe ran, so "nothing overlaps ` +
      'the bar" would be true of every page in the app.',
  ).not.toBeNull();
  expect(
    p.examined,
    `${where}: the occlusion probe found ${p.examined} laid-out controls outside the bar. A page with ` +
      "no controls on it is never occluded, so this count is what makes the clauses below mean " +
      "something.",
  ).toBeGreaterThan(0);
  expect(
    p.maxScroll,
    `${where}: the document does not scroll (max ${p.maxScroll}px), so "scrolled to the bottom" is a ` +
      "claim about a page that never moved and the bar cannot have caught up with anything.",
  ).toBeGreaterThan(0);
  expect(
    p.scrolledTo,
    `${where}: the document stopped at ${p.scrolledTo} of a possible ${p.maxScroll}. The last control ` +
      "is only under the bar at the BOTTOM of the document; measuring anywhere else is measuring a " +
      "different question.",
  ).toBeGreaterThanOrEqual(p.maxScroll - TOLERANCE_PX);
  expect(
    p.lastOutsideFooter,
    `${where}: the page holds no laid-out focusable control outside the site footer at all, so the ` +
      "clause below has no subject.",
  ).not.toBeNull();

  const last = p.lastOutsideFooter!;
  const bar = p.barBox!;
  expect(
    boxesIntersect(last.box, bar),
    `${where}: the sticky bar OCCLUDES the last interactive control on the page. ` +
      `${last.descriptor} occupies ${fmtBox(last.box)} and the bar occupies ${fmtBox(bar)}. ` +
      `\`STICKY_BAR_CLEARANCE\` (${STICKY_BAR_CLEARANCE} = 80px = 64 + 16) on this route's \`<main>\` ` +
      "is the knob that is supposed to make this impossible — and asserting that class is not the same " +
      "as asserting this outcome, which is why this reads boxes. A control under a fixed bar cannot be " +
      "tapped and cannot be scrolled to, because the document is already at its end (RESP-03 AC#7).",
  ).toBe(false);

  const outsideFooter = p.occluded
    .filter((c) => !c.inFooter)
    .map((c) => `${c.descriptor} ${fmtBox(c.box)}`);
  expect(
    outsideFooter,
    `${where}: ${outsideFooter.length} control(s) outside the site footer lie under the bar ` +
      `${fmtBox(bar)}:\n${outsideFooter.map((c) => `  ${c}`).join("\n")}\n` +
      "The footer is EXCLUDED here because its occlusion is a measured, recorded finding with a named " +
      "owner (see this function's docblock — `STICKY_BAR_CLEARANCE` sits on `<main>` and the footer " +
      "renders after it; routed to plan 17-13). Nothing else is excused: every other control on the " +
      "page is inside a container the clearance covers, so a name in this list is a new defect.",
  ).toEqual([]);
}

/**
 * Clauses 1-4 of RESP-03's contract, on one bar, at one viewport.
 *
 * `viewport` is passed rather than read back from the page on purpose: the pin is a claim about the
 * viewport the caller SET, and a version that asked the page for its own height would be comparing the
 * bar against whatever the page happened to be showing — which is exactly the class of "measured
 * something, proved nothing" this file's header is about.
 */
async function expectStickyBar(
  page: Page,
  barSelector: string,
  where: string,
  viewport: { width: number; height: number },
): Promise<void> {
  // ── 1. PRESENT ───────────────────────────────────────────────────────────────────────────────────
  await expect(
    page.locator(barSelector),
    `${where}: \`${barSelector}\` is in the document but not visible. RESP-03 clause B is "with the ` +
      'sticky bar PRESENT" — a sweep that measures a page whose bar silently stopped rendering is ' +
      "reporting green about a page missing the thing the clause is about.",
  ).toBeVisible();

  const bar = await boxOf(page.locator(barSelector), `sticky bar · ${where}`);

  // ── 2. 64px TALL ─────────────────────────────────────────────────────────────────────────────────
  expect(
    Math.abs(bar.height - BAR_HEIGHT_PX) <= TOLERANCE_PX,
    `${where}: the bar's rendered box is ${bar.height}px tall, not ${BAR_HEIGHT_PX}. ` +
      `\`STICKY_BAR_HEIGHT\` is ${STICKY_BAR_HEIGHT} and it is named here rather than ASSERTED: a ` +
      "class list check is a statement about source, and the class can be right while the box is not. " +
      "`STICKY_BAR_CLEARANCE` (80 = 64 + 16) is derived from this number, so a bar that grew silently " +
      "leaves the last row of the page underneath it.",
  ).toBe(true);

  // ── 3. PINNED TO THE VIEWPORT'S BOTTOM EDGE ─────────────────────────────────────────────────────
  expect(
    Math.abs(bar.y + bar.height - viewport.height) <= TOLERANCE_PX,
    `${where}: the bar's bottom edge is at ${Math.round(bar.y + bar.height)} against a ` +
      `${viewport.height}px viewport — it is present in the DOM but not PINNED to the bottom of the ` +
      "screen. A bar that scrolls with the content satisfies every 'is it visible' reading and fails " +
      "the one property it exists for.",
  ).toBe(true);

  // ── 4. NON-OCCLUDING AT THE DOCUMENT'S BOTTOM ───────────────────────────────────────────────────
  await expectBarDoesNotOcclude(page, barSelector, where);
}

/**
 * Clause 5 — the bar has NO laid-out box at `lg:` and above.
 *
 * `getClientRects().length` rather than `boundingBox()`: a `display: none` element returns a null box,
 * and `null` is also what an ABSENT element returns, so the two are indistinguishable through
 * Playwright's box API — while a zero-length rect list is a positive statement about an element the
 * probe actually found. MEASURED at 1280×900, both bars, both themes: `rects: 0`, `display: "none"`,
 * `offsetParent: null`.
 *
 * `desktopTell` is the vacuity guard and is not optional: "the bar lays out nothing" is trivially true
 * of a page that rendered nothing, and the desktop claim is that the booking surface moved to the rail —
 * not that it vanished.
 */
async function expectBarAbsentAtDesktop(
  page: Page,
  barSelector: string,
  desktopTell: string,
  where: string,
): Promise<void> {
  await page.setViewportSize(DESKTOP);
  await page.evaluate(() => document.fonts.ready);

  await expect(
    page.locator(desktopTell),
    `${where}: the desktop layout never rendered \`${desktopTell}\`, so "the bar lays out nothing ` +
      "here\" would be a statement about a page that laid out nothing at all.",
  ).not.toHaveCount(0, { timeout: 15_000 });

  const laidOut = await page
    .locator(barSelector)
    .evaluateAll((els) =>
      els
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => `${getComputedStyle(el).display} ${JSON.stringify(el.getBoundingClientRect())}`),
    );

  expect(
    laidOut,
    `${where}: \`${barSelector}\` still lays out a box at ${DESKTOP.width}px:\n` +
      laidOut.map((b) => `  ${b}`).join("\n") +
      "\nBelow `lg:` the bar IS the booking surface; at and above it the sticky rail carries the price " +
      "and the bar is `lg:hidden`. A bar that renders at both widths is a forked mobile/desktop " +
      "variant — RESP-04's failure, surfacing through RESP-03's harness — and it also means two " +
      "reachable copies of the same hold CTA on the money path.",
  ).toEqual([]);
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

      // ⚠ THE MEASUREMENT MOVED TO `e2e/helpers/nowrap.ts` (plan 17-04) AND NOTHING ELSE CHANGED.
      // Same reading, same `TOLERANCE_PX`, same two guards, same reasons in the messages — the
      // declarations were MOVED rather than rewritten, `helpers/focus.ts`'s rule. Two more specs need
      // the identical question asked (this file's checkout half below, and `overflow-320.spec.ts`'s
      // status chips in plan 17-11), and three copies of a no-wrap criterion is the drift that goes
      // silent in the worst direction. That file's header carries the before/after run counts, which
      // are the proof the extraction changed no behaviour.
      for (let i = 0; i < 2; i++) {
        await expectNoWrap(
          lines.nth(i),
          `${where}: the bar's ${i === 0 ? "rate" : "fee note"} line`,
          TOLERANCE_PX,
        );
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

    // ── RESP-03 CLAUSE B, ON `/listings/[id]` — AC#4, AC#6, AC#7 (plan 17-04) ─────────────────────
    // Its own case rather than a block appended to the one above, and the reason is mechanical: that
    // case ends with the booking sheet OPEN and the document scrolled inside it, and clause 4 needs a
    // document scrolled to ITS bottom with nothing overlaying the page. Reusing it would have meant
    // dismissing the sheet and restoring the scroll position — two steps whose failure would look
    // exactly like an occlusion defect. Same seed, same constants, no new fixture.
    test(`${theme} · ${FLOOR.width}px · the bar is present, ${BAR_HEIGHT_PX}px, pinned and non-occluding — and absent at ${DESKTOP.width}px`, async ({
      page,
      context,
    }) => {
      await seedTheme(context, theme);
      await page.setViewportSize(FLOOR);
      await page.goto(`${BASE}/listings/${seed.listingId}`);
      await page.evaluate(() => document.fonts.ready);

      const where = `${theme} · listing · ${FLOOR.width}px`;
      await reachableBar(page, where);
      await expectStickyBar(page, BAR, where, FLOOR);

      // `[data-slot="calendar"]` is this file's already-proven desktop tell (case (e) waits on it at
      // 1280 before any selection is made), and it is the rail's own month grid — the surface that
      // carries the price once the bar is gone.
      await expectBarAbsentAtDesktop(
        page,
        BAR,
        '[data-slot="calendar"]',
        `${theme} · listing · ${DESKTOP.width}px`,
      );
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

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (g)–(k) — BFLOW-06 / BFLOW-07: THE CHECKOUT HALF, ONE ROUTE LATER IN THE SAME JOURNEY (plan 12-11)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-50's sentence is the whole specification: *"the booker never opens anything to see what they are
// PAYING — only to see how it was BUILT."* Two claims come out of it and they fail in opposite
// directions, so both are asserted:
//
//   • THE DERIVATION IS HIDDEN. Collapsed, the run line and the fee line are not on screen. A test that
//     only checked the Total would be green against a disclosure that collapses nothing.
//   • THE TOTAL IS NOT. It is outside the collapsible — asserted as ANCESTRY, not as visibility, because
//     "is it on screen" on a 812px-tall phone is a question about scroll position and "is it inside the
//     region that can be closed" is the structural claim BFLOW-06 actually makes. The bar's copy of the
//     amount is what carries the VISIBILITY half at `scrollY === 0`, which is what the bar is for.
//
// ⚠ THESE CASES PLACE A REAL HOLD, and that is why they run LAST and on their own windows. The listing
// cases above only SELECT — nothing they touch becomes unavailable. A hold makes its hours unbookable on
// the shared seeded listing for the rest of the run, so reusing `WINDOWS` here would make the earlier
// cases order-dependent on this one. `mode: "serial"` means order is deterministic; it does not make a
// consumed slot reappear.
//
// ⚠ BFLOW-07's CLAIM STOPS AT "THE BOOKER IS TOLD WHERE THEY ARE GOING", and case (k) is written to the
// edge of what is honest. `Confirm & pay` opens a PayMongo HOSTED CHECKOUT — `e2e/search-and-book.spec.ts`'s
// header records that the tail past it is un-automatable from Playwright, which is why the automatable
// booker path ends at this button in every spec in this repository. So the button is NEVER pressed here:
// the assertion is that the destination is NAMED before the press, on the surface where naming it can
// still change a decision. Pressing it to "prove the redirect" would mint a real payable session against
// a provider that does not honour an idempotency key.
//
// ⚠ WATCHED RED (run and reverted; see the SUMMARY for the verbatim output). `PriceDisclosure`'s
// `children` moved to sit BESIDE the collapsible instead of inside its content — a disclosure that
// renders a trigger and hides nothing, which every "the Total is visible" assertion is green for.

const CHECKOUT_BAR = '[data-testid="checkout-sticky-bar"]';
const DISCLOSURE = '[data-testid="price-disclosure"]';

/**
 * One window per theme, DISTINCT from `WINDOWS` above and from each other.
 *
 * The seeded listing opens 06:00–21:00 every day (`booker-seed.ts`), so both sit well inside the
 * operating window. They are afternoon hours so that a failure here cannot be confused with the morning
 * runs the earlier cases select.
 */
const CHECKOUT_WINDOWS = {
  court: ["2:00 PM", "3:00 PM"],
  grove: ["4:00 PM", "5:00 PM"],
} as const;

/** The run line's signature — `{₱rate}/hr × {N} hours`, `price-breakdown.tsx`'s `runLabel`. */
const RUN_LINE = /\/hr ×/;

test.describe("BFLOW-06 / BFLOW-07 — checkout at 375px", () => {
  test.describe.configure({ timeout: 180_000 });

  for (const theme of THEMES) {
    test(`${theme} · 375px · a confirm bar, a collapsed derivation, and one amount`, async ({
      page,
      context,
    }) => {
      await seedTheme(context, theme);
      await page.setViewportSize(PHONE);
      await signUpBooker(page, seed);
      const [start, end] = CHECKOUT_WINDOWS[theme];
      await placeHold(page, seed, start, end);
      await page.evaluate(() => document.fonts.ready);

      const where = `${theme} · checkout · ${PHONE.width}px`;

      // TRAP 1 again: prove the surface exists before measuring it. `placeHold` already waits for
      // `price-total`, so the body has resolved — this is about the BAR specifically.
      await expect(
        page.locator(CHECKOUT_BAR),
        `${where}: the checkout rendered no \`${CHECKOUT_BAR}\`. Every measurement below reads a box or ` +
          "a string out of that element, and an absent element yields a null box and an empty string.",
      ).toHaveCount(1, { timeout: 15_000 });

      // ── (g) THE BAR IS THE SAME BOX AS THE LISTING PAGE'S ────────────────────────────────────────
      // Same constant, same height, same anchor — a booker who met the listing bar one route ago meets
      // this one at the same place on the screen. `scrollY === 0` for the same reason case (a) reads it:
      // "reachable without scrolling" is a claim about an unscrolled document.
      expect(
        await page.evaluate(() => window.scrollY),
        `${where}: the page was not at the top when the bar's box was read.`,
      ).toBe(0);

      const bar = await boxOf(page.locator(CHECKOUT_BAR), `checkout bar · ${where}`);
      expect(
        bar.height,
        `${where}: the confirm bar is ${bar.height}px tall, not ${BAR_HEIGHT_PX}. Both bars are sized ` +
          "from STICKY_BAR_HEIGHT precisely so the two most decisive taps on the money path do not " +
          "read as two different apps.",
      ).toBe(BAR_HEIGHT_PX);
      expect(
        bar.y + bar.height,
        `${where}: the bar's bottom edge is at ${bar.y + bar.height} against a ${PHONE.height}px ` +
          "viewport — it is not anchored to the bottom of the screen.",
      ).toBeLessThanOrEqual(PHONE.height + TOLERANCE_PX);

      const action = await boxOf(
        page.locator(CHECKOUT_BAR).getByRole("button"),
        `confirm action · ${where}`,
      );
      expect(
        { width: action.width >= TOUCH_TARGET_PX, height: action.height >= TOUCH_TARGET_PX },
        `${where}: the confirm action measures ${action.width} × ${action.height}, below the ` +
          `${TOUCH_TARGET_PX} × ${TOUCH_TARGET_PX} WCAG 2.5.5 target — on the one control in this app ` +
          "that spends money.",
      ).toEqual({ width: true, height: true });

      // ── (h) THE DERIVATION IS COLLAPSED, AND THE TOTAL IS NOT INSIDE IT (12-UI-SPEC AC#22) ───────
      const disclosure = page.locator(DISCLOSURE);
      await expect(
        disclosure,
        `${where}: the checkout rendered no \`${DISCLOSURE}\`.`,
      ).toHaveCount(1);

      const trigger = page.getByRole("button", { name: /Price details/ });
      await expect(
        trigger,
        `${where}: the disclosure rendered no trigger reachable by role. Radix wires ` +
          "`aria-expanded`/`aria-controls` onto it, and a region a keyboard cannot open is a region " +
          "whose contents are simply gone.",
      ).toHaveCount(1);
      expect(
        await trigger.getAttribute("aria-expanded"),
        `${where}: the disclosure is OPEN on first paint. D-50's claim is that the itemised lines are ` +
          "behind it by default — a disclosure that starts open hides nothing and the assertions below " +
          "would be measuring the shipped, un-collapsed breakdown.",
      ).toBe("false");

      // The derivation really is off screen — not merely styled small. Radix unmounts closed content.
      expect(
        await page.getByText(RUN_LINE).count(),
        `${where}: the run line is in the document with the disclosure collapsed. The trigger is then ` +
          "decoration, and BFLOW-06's single-column claim is unmet on the surface it is stated for.",
      ).toBe(0);
      expect(
        await page.getByText("Service fee", { exact: true }).count(),
        `${where}: the service-fee line is in the document with the disclosure collapsed.`,
      ).toBe(0);

      // …and the Total is OUTSIDE the region that can be closed. Structural, not visual: on an 812px
      // phone "is it on screen" depends on scroll position, and the claim D-50 makes is that closing
      // the derivation can never take the amount with it.
      const total = page.getByTestId("price-total");
      await expect(total, `${where}: the checkout rendered no \`price-total\`.`).toHaveCount(1);
      expect(
        await total.evaluate((el, sel) => el.closest(sel) !== null, DISCLOSURE),
        `${where}: the Total is INSIDE the price disclosure. Collapsing it would then hide the one ` +
          "figure the booker is agreeing to, on the screen where they agree to it — which is the " +
          "single defect BFLOW-06's wording exists to forbid (T-12-11-HIDDENTOTAL).",
      ).toBe(false);

      // ── (i) THE BAR CARRIES THE AMOUNT AT scrollY 0, BYTE-EQUAL TO THE TOTAL ─────────────────────
      // This is the half that makes "the Total is visible" true on a phone: the breakdown's Total is
      // below the fold on any real checkout, and the bar is the surface that keeps the figure present.
      const barText = ((await page.locator(CHECKOUT_BAR).textContent()) ?? "").trim();
      const totalText = ((await total.textContent()) ?? "").trim();

      expect(
        totalText.length,
        `${where}: the breakdown's Total rendered no text, so the equality below compares two empty ` +
          "strings.",
      ).toBeGreaterThan(0);
      expect(
        barText,
        `${where}: the bar renders no \`Total\` label — the amount beside it is then an unlabelled ` +
          "number on a payment screen.",
      ).toContain("Total");
      expect(
        barText,
        `${where}: the bar's amount and the breakdown's Total are not the same string.\n` +
          `  bar   ${JSON.stringify(barText)}\n  total ${JSON.stringify(totalText)}\n` +
          "Both are the SAME `formatMoney(quoted, currency)` string, produced once in `book/page.tsx` " +
          "and threaded to both surfaces. A bar that composed its own figure would agree at most rates " +
          "and diverge by a centavo at the rounding edge (GATE-05 / T-12-11-HIDDENTOTAL).",
      ).toContain(totalText);

      const barBox = await boxOf(page.locator(CHECKOUT_BAR), `bar (amount) · ${where}`);
      expect(
        barBox.y,
        `${where}: the bar carrying the amount is not inside the viewport at scrollY 0.`,
      ).toBeLessThan(PHONE.height);

      // ── (j) EXPANDING REVEALS THE DERIVATION AND DOES NOT MOVE THE TOTAL OUT OF VIEW ─────────────
      const totalBefore = await boxOf(total, `Total (collapsed) · ${where}`);
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");

      await expect(
        page.getByText(RUN_LINE),
        `${where}: expanding the disclosure revealed no run line. The region opened and holds nothing, ` +
          "which every collapsed-state assertion above is equally green for.",
      ).toHaveCount(1);
      await expect(
        page.getByText("Service fee", { exact: true }),
        `${where}: expanding the disclosure revealed no service-fee line.`,
      ).toHaveCount(1);

      const totalAfter = await boxOf(total, `Total (expanded) · ${where}`);
      expect(
        totalAfter.y,
        `${where}: opening the disclosure pushed the Total UP the page (from ${totalBefore.y} to ` +
          `${totalAfter.y}). It sits below the region, so it can only move down — a Total that moved ` +
          "up means the layout reflowed around it rather than the region growing beneath it.",
      ).toBeGreaterThanOrEqual(totalBefore.y - TOLERANCE_PX);
      // It is still IN THE DOCUMENT and still outside the region — expanding must not restructure it.
      expect(
        await total.evaluate((el, sel) => el.closest(sel) !== null, DISCLOSURE),
        `${where}: expanding the disclosure moved the Total inside it.`,
      ).toBe(false);
      // …and the amount the bar carries has not drifted from it.
      expect(
        ((await total.textContent()) ?? "").trim(),
        `${where}: the Total's own string changed when the disclosure opened.`,
      ).toBe(totalText);

      // ── (k) BFLOW-07 — ONE REACHABLE CONFIRM, AND IT NAMES ITS DESTINATION BEFORE IT IS PRESSED ──
      const confirms = await page
        .getByRole("button", { name: /^Confirm & pay$/ })
        .allInnerTexts();
      expect(
        confirms.length,
        `${where}: the document holds ${confirms.length} reachable \`Confirm & pay\` controls; ` +
          "expected exactly 1. Checkout renders the action twice — inline in the rail and in the bar — " +
          "and `hidden` is the only thing that makes that safe. Two reachable confirms on a provider " +
          "that does not honour an idempotency key is two payable sessions one tap apart.\n" +
          `  found: ${confirms.map((n) => JSON.stringify(n)).join(" / ")}`,
      ).toBe(1);

      // ⚠ THE APOSTROPHE IS A `.`, AND IT IS THE SHIPPED IDIOM RATHER THAN A SHRUG.
      // `e2e/search-and-book.spec.ts` has matched this same sentence as `/You.ll pay …/` since Phase 5.
      // A literal `'` in the pattern resolved to ZERO elements here against a page rendering the
      // sentence correctly — measured, on the first run of this case — so the character the DOM carries
      // is not the one a `.ts` regex literal spells. The claim this assertion makes is about the WORD
      // `PayMongo`, the amount and the rails; pinning a punctuation glyph would be pinning the wrong
      // thing and is why the rest of the pattern is explicit and this one character is not.
      const line = page.getByText(/You.ll pay .* on PayMongo — card, GCash, Maya or QR ?Ph/);
      await expect(
        line,
        `${where}: the line beneath the CTA does not name PayMongo. BFLOW-07's whole gap was this ` +
          "word: the booker is about to be handed to a domain they have never been told about, with " +
          "their card out (12-UI-SPEC AC#28).",
      ).toHaveCount(1);
      // …and it names the amount it is about — the same string the bar and the breakdown carry.
      await expect(
        line,
        `${where}: the destination line does not name the amount. "You'll pay … on PayMongo" without ` +
          "a figure tells the booker where they are going and not what for.",
      ).toContainText(totalText);

      // The button is deliberately NOT pressed — see this block's header.
      expect(
        await page.getByRole("dialog").count(),
        `${where}: a dialog is mounted on the checkout. D-51 refuses an interstitial in front of the ` +
          "redirect, and this route opens no overlay of its own at all.",
      ).toBe(0);

      // ── (l) AC#23's CHECKOUT ROW, ON THE RESOLVED BODY, AT THE 320px FLOOR ───────────────────────
      // `e2e/overflow-320.spec.ts` measures this route PRE-HYDRATION (`served: true`) because reaching
      // the resolved checkout needs a minted hold and that table is deliberately seed-free — its own
      // checkout row now says so. The served shell holds none of what 12-11 added: not the fixed bar,
      // not the disclosure, not the breakdown. This is where they get measured, using the SAME
      // `expectNoOverflow` that table calls, so the two can never disagree about what "clipped" means.
      //
      // The per-element clause is the one doing the work here rather than the document one: a
      // `position: fixed` bar can lay out past the viewport WITHOUT widening `scrollWidth` at all, and
      // this route now has one.
      await page.setViewportSize({ width: FLOOR_PX, height: FLOOR.height });
      await page.evaluate(() => document.fonts.ready);

      const floorWhere = `${theme} · checkout · ${FLOOR_PX}px`;
      await expect(
        page.locator(CHECKOUT_BAR),
        `${floorWhere}: the bar is absent at the floor width, so the measurement below would be about ` +
          "a page missing the very element it was written for.",
      ).toHaveCount(1);
      await expectNoOverflow(page, floorWhere);

      // ── (m) RESP-03 CLAUSE B ON THE CHECKOUT BAR — AC#5, AC#6, AC#7 (plan 17-04) ─────────────────
      // Appended to this case rather than given its own, and unlike the listing half that is not a
      // preference: reaching a RESOLVED checkout costs a signup and a real hold, and every hold makes
      // its hours unbookable on the shared seeded listing for the rest of the run (see this block's
      // header). A second case would have consumed a third window per theme to re-measure a bar this
      // one is already standing in front of. The viewport is already at the 320px floor from (l), and
      // the disclosure is open from (j) — which makes the page TALLER and the scroll-to-bottom clause
      // strictly harder, not easier.
      //
      // ⚠ THE SAME CLAUSE, GREEN, ONE ROUTE AWAY. `expectBarDoesNotOcclude`'s docblock records that
      // `/listings/[id]` occludes its footer's last link because `STICKY_BAR_CLEARANCE` sits on
      // `<main>` and the footer renders after it. This route renders NO footer (`shell.spec.ts:1221`
      // pins "0 footers" on a live checkout), so its last control — `a("Back to the listing")`,
      // measured at `bottom: 468` against a bar at `y: 504` — clears the bar by 36px with the clearance
      // doing exactly what it is declared to do. Two routes, one clause, and the difference between
      // them is the finding.
      await expectStickyBar(page, CHECKOUT_BAR, floorWhere, {
        width: FLOOR_PX,
        height: FLOOR.height,
      });

      // `price-total` is the resolved breakdown's own hook and exists at every width — `placeHold`
      // already waits on it for exactly that reason, and `hold-countdown.spec.ts` uses it as the
      // checkout's tell at 1280.
      await expectBarAbsentAtDesktop(
        page,
        CHECKOUT_BAR,
        '[data-testid="price-total"]',
        `${theme} · checkout · ${DESKTOP.width}px`,
      );
    });
  }
});
