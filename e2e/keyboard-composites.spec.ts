import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";
import postgres from "postgres";

import { BASE, seedBookableListing, signUpBooker, type SeededListing } from "./helpers/booker-seed";
import {
  DEV_OVERLAY_TAG,
  WALK_BOUND,
  expectRing,
  indicatorOf,
  partitionDevOverlay,
  probeActiveStop,
  probeCandidateStops,
  resetFocusToTop,
  sameIndicator,
  walkBackward,
  walkForward,
  type Indicator,
  type StopProbe,
} from "./helpers/focus";
// Imported rather than re-typed, for `overflow-320.spec.ts:21-26`'s stated reason: `src/lib/avatar.ts`
// is directive-free precisely so a gate can read it, and this title is the only string that tells the
// crop overlay apart from the two other `responsive-dialog` overlays in the app. A re-typed copy would
// go green the day the sentence changed, which is the whole failure a `tell` exists to catch.
import { AVATAR_CROP_TITLE } from "../src/lib/avatar";

// GATE-02's KEYBOARD gate on the five COMPOSITE surfaces — the calendar, the slot picker, the wizard,
// dialogs and sheets.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `e2e/auth-keyboard.spec.ts` walks six auth documents and 59 stops, measuring an indicator on every
// stop. Measured before a line of this file was written, those six are the ONLY documents in the whole
// suite with a recorded walk. 17-UI-SPEC § GATE-02 names five surface families that have none, and it
// names them because each is a COMPOSITE interaction where reachability is not implied by any
// per-control assertion:
//
//   • a focusable `<div>` with a click handler is reachable and dead;
//   • a widget with a roving tab index has ONE stop and a dozen controls, so "every control is a tab
//     stop" is the wrong question and "every control is operable" is the right one;
//   • a dialog that traps focus is invisible to a forward-only walk;
//   • a dialog that drops focus to `<body>` on close is a silent dead end for a screen-reader user.
//
// Two of GATE-02's five properties — ESCAPABLE and RETURNED — had no shipped assertion anywhere in this
// repository. This file is where they land.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ONE FOCUS DEFINITION, AND THIS FILE DELIBERATELY CARRIES NONE OF IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every focus primitive below is imported from `e2e/helpers/focus.ts`. Nothing here reads a computed
// style, and the three property names a focus verdict is made of are not written in this file at all —
// not in code and not in a comment — for the reason `e2e/helpers/axe.ts` and `booking-row.tsx:112`
// both record: `tests/design/focus-definition.test.ts` (plan 17-02) is a CLOSED INVENTORY of the files
// in `e2e/` that define a focus verdict, and a fourth entry is a build failure. That gate is the
// mechanical form of AC#20 and this file is a consumer, not a definition.
//
// ⚠ WHAT THAT COSTS, STATED RATHER THAN HIDDEN. `auth-keyboard.spec.ts` carries a strictly stronger
// read than `expectRing` — it strips fully transparent shadow layers before deciding, because a ring
// whose colour went transparent still hands the naive check a non-`none` string. That read is on the
// AC#20 inventory WITH its reason. Copying it here would be a fourth definition and would turn the
// gate red, so this file asserts `expectRing` PLUS the focused-vs-unfocused difference and says so.
// The difference check is what closes most of that hole: a control that paints nothing when focused
// and nothing when unfocused reads IDENTICAL, and identical is a failure here.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// REAL KEY PRESSES, NEVER A PROGRAMMATIC FOCUS CALL
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// DS-05's recipe is `focus-visible:*`, and a programmatic focus call does not satisfy `:focus-visible`
// in Chromium. A version of this walk built on one would report every control as drawing nothing and
// would be RED on a perfectly correct tree. Every stop below is reached by pressing a key, and
// `focusVisible` is asserted on every stop that carries an operability claim — that flag is what
// proves a real press landed rather than a script moving focus.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE STOP IDENTITY, AND WHY IT IS NOT THE BARE DESCRIPTOR
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `helpers/focus.ts`'s descriptor names a `<button>` by its TEXT. Every auth control has text, so the
// six shipped sequences are unambiguous. These surfaces are icon-driven and many do not:
//
//   MEASURED 2026-08-29 on `/listings/{seeded}` at 1280 — SEVEN of the twenty-one stops project to the
//   bare string `button[button]:`. Four of them are the two month-nav buttons and… nothing else
//   distinguishable. A declared sequence of seven identical strings still fails when a stop is added
//   or removed, but it cannot tell a REORDER apart and its failure message names nothing.
//
// So `identify()` below appends the SAME projection's resolved `label` — which prefers an `aria-label`
// — whenever the descriptor could not name the control. Both readings come from ONE `StopProbe`, so
// this is two fields of one projection rather than a second projection: the property `helpers/focus.ts`
// protects (the focused stop and the unfocused baseline must describe the SAME element the same way)
// is untouched, because the baseline map below is keyed by `identify` too.
//
// ⚠ THREE STOPS STAY AMBIGUOUS AND THAT IS CORRECT. The listing gallery's photo triggers project to
// `button[button]:` with an empty label, because `photo-lightbox.tsx:176` states that their accessible
// name comes from the nested image's `alt` — a name this projection deliberately does not compute.
// Three identical entries is the truthful record of three identical controls; naming them would need a
// full accessible-name computation, which is a second projection and a much larger claim.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// EVERY DECLARED SEQUENCE IS SEEDED FROM A FIXED FIXTURE, NEVER FROM THE CLOCK
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// This is the trap that would have shipped a time bomb, and it was found by measuring rather than by
// reasoning. Both composites on `/listings/[id]` carry a ROVING tab index, so each contributes exactly
// one stop — and on a resting page that stop is TODAY'S date and the next open hour from NOW:
//
//   resting, 2026-08-29    `button[button]:29`    `button[button]:7:00 PM`
//
// A sequence declared from that reading is red tomorrow. Worse, the number of month-nav stops moves
// too: `Go to the Previous Month` is disabled on the current month and becomes a tab stop only once
// the grid has been advanced, so the walk is 21 stops on most days and 22 on the days a fixture lands
// in the next month.
//
// `armNextMonthDayOne` removes both: it advances the grid one month — which makes BOTH nav buttons
// tab stops on every day of the year — and selects DAY 1 of that month, which is always inside the
// 90-day booking horizon, always in the future, and always spelled `1`. The slot picker then anchors
// on `6:00 AM`, which is `seedBookableListing`'s own `06:00` opening time on all seven days. Every
// literal in the declared sequences below is therefore a fact about the FIXTURE, not about the day the
// suite is run.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE DOES NOT PROVE — stated so nobody reads more into a green run than it carries
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • ONE ENGINE (Chromium) and ONE THEME (whatever the default document loads in). The tab ORDER is a
//     DOM fact and does not vary by theme; the indicator readings are taken in one.
//   • ONE WIDTH PER ROW. Each row names the width its surface exists at — the booking sheet does not
//     exist above `lg:`, and the host nav drawer does not exist at or above `md:`.
//   • NOTHING ABOUT CONTRAST. Whether the indicator this walk measures clears 3:1 is GATE-02's axe
//     half, which `e2e/axe-sweep.spec.ts` owns.
//   • IT IS NOT IN CI (D-24), like the rest of `e2e/`.

/**
 * The composition every `/listings/[id]` row shares — the calendar-plus-hours block.
 *
 * ⚠ NOT THE BOOKING PANEL, AND THE DIFFERENCE WAS MEASURED RATHER THAN ASSUMED. `booking-panel.tsx:203`
 * renders the month grid `{isSheet && …}` — so in the RAIL placement these rows walk, the panel holds
 * the price summary and the hold CTA and NO calendar at all. A row hooked on
 * `[data-testid="booking-panel"] [data-slot="calendar"]` waits fifteen seconds for an element that
 * cannot exist above `lg:`, which is what the first run of this file did.
 */
const AVAILABILITY = '[data-testid="availability-calendar"]';

/** The rail's summary block — where the chosen window's price and the hold CTA render. */
const BOOKING_PANEL = '[data-testid="booking-panel"]';

/**
 * THE APP'S ONE OVERLAY MECHANISM, and the count is a declared closed set rather than an observation:
 * `tests/design/sheet-absent.test.ts` asserts `src/components/ui/sheet.tsx` does not exist, so there
 * is exactly ONE focus trap and ONE escape behaviour in this product. Every overlay this file opens —
 * the booking sheet, the avatar crop dialog and the host nav drawer — is the same node in a different
 * presentation, which is why one selector addresses all three.
 */
const OVERLAY = '[data-testid="responsive-dialog"]';

/** The listing-edit wizard's step rail — the composite GATE-02 names, and the route's own tell. */
const WIZARD_RAIL = '[data-testid="wizard-step-rail"]';

/**
 * The committed crop fixture, and `overflow-320.spec.ts:306`'s choice reused for its reason:
 * `avatarMaxZoom(400) === 1`, so the zoom control renders DISABLED (D-197 exposes that state and
 * Radix keeps the thumb out of the tab order), which is what makes the crop dialog's trap a
 * four-stop cycle rather than a five-stop one. `e2e/fixtures/` is generator-produced and gated
 * byte-for-byte by `tests/design/image-fixtures.test.ts`, so these bytes are as fixed as a literal.
 */
const AVATAR_CROP_FIXTURE = path.join(__dirname, "fixtures", "square-400.png");

/** react-day-picker's in-month day buttons. `selectTargetDayIn`'s own spelling, reused. */
const DAY_CELL = 'td:not([data-outside="true"]) button';

/**
 * The slot picker's first hour on any future day, DERIVED from the fixture rather than typed in.
 *
 * `seedBookableListing` writes `operating_hours` of `06:00`–`21:00` on all seven days, so a day one
 * month out opens at six in the morning whichever weekday it lands on. This is the anchor the roving
 * tab index parks on, and the day the seed's opening time changes this literal is the first thing to
 * go red — which is the right blast radius, because every declared sequence below contains it.
 */
const FIRST_HOUR = "6:00 AM";

/**
 * The five stops the footer contributes, identical on every document in this file.
 *
 * FIVE AND NOT SIX, for `auth-keyboard.spec.ts`'s reason restated rather than imported (that file
 * does not export it): `SUPPORT_EMAIL` is `null` (D-26/D-161), so `site-footer.tsx`'s mailto row
 * renders nothing at all. The day that constant is set, this tail grows a sixth entry and every
 * sequence in both files goes red at once — the correct blast radius for a change that adds a control
 * to every page in the app.
 */
const FOOTER_TAIL = [
  "a:FitOut@contentinfo",
  "a:Find a space@contentinfo",
  "a:Host your space@contentinfo",
  "a:Terms@contentinfo",
  "a:Privacy@contentinfo",
] as const;

/**
 * The listing gallery's three photo triggers, named by the fixture that produces them.
 *
 * `seedBookableListing` inserts three rows into `listing_photo`, so three of these appear. The count
 * is passed EXPLICITLY at the seed below rather than taken from the helper's default, because it is
 * the only thing tying this literal to a number somebody could change without reading this file.
 */
const GALLERY_THUMB = "button[button]:";

/**
 * THE STOP IDENTITY — see the header. The descriptor, plus the same projection's resolved `label`
 * when the descriptor could not name the control.
 *
 * `helpers/focus.ts` writes a button's descriptor as `button[<type or role>]:<text>`, so a control
 * with no text ends the string at the colon. That is the exact and only condition under which the
 * label is appended, which keeps every stop that IS named by the shared projection byte-identical to
 * what `auth-keyboard.spec.ts` would print for it.
 */
function identify(stop: StopProbe): string {
  return stop.descriptor.endsWith(":") ? `${stop.descriptor}${stop.label}` : stop.descriptor;
}

/**
 * TRAP 1, borrowed whole from `auth-keyboard.spec.ts:410-415`: assert the document rendered ITS OWN
 * surface before asserting anything about its tab order.
 *
 * Every assertion in this file would pass against a blank page or a redirect if the expected sequence
 * happened to be empty, and would fail confusingly if it did not — so the reachability check runs
 * first and is a FAILURE rather than a skip. 15s is that file's measured allowance: the dev server
 * compiles routes on demand and a reachability guard that flakes is one people learn to ignore.
 */
async function expectReachable(page: Page, selector: string, where: string): Promise<void> {
  await expect(
    page.locator(selector),
    `${where}: the document rendered no \`${selector}\`, so it is not the surface this row names.`,
  ).not.toHaveCount(0, { timeout: 15_000 });
}

/**
 * Partition the dev overlay off a raw walk, ASSERTING that it can only ever have taken the far edge.
 *
 * COPIED WHOLE from `auth-keyboard.spec.ts:434-451`, and the copy is deliberate rather than lazy: it
 * is what keeps the filter from quietly swallowing a product control. `edge` is where the overlay is
 * allowed to sit — `"end"` for a forward walk (the portal is appended to `<body>`), `"start"` for the
 * reverse. If a dropped element ever turns up anywhere else this fails instead, which is the
 * difference between excluding the dev server's furniture and narrowing a check until a number
 * matches.
 *
 * ⚠ MEASURED HERE, AND IT IS MORE THAN ONE. On the host routes the dev overlay mounted THREE
 * `nextjs-portal` hosts on one run and one on another — the hydration warning 17-07 recorded on
 * `NavDrawer` opens the error overlay, which brings its own. All of them sat at the end of the raw
 * sequence on every run, which is exactly the property this function asserts rather than assumes.
 */
function partitionAsserted(raw: StopProbe[], where: string, edge: "start" | "end") {
  const { stops, overlay } = partitionDevOverlay(raw);
  expect(
    overlay.map((s) => s.tag),
    `${where}: something other than the \`${DEV_OVERLAY_TAG}\` dev-tools host was dropped from the ` +
      "walk. Only the dev server's own furniture may be excluded.",
  ).toEqual(overlay.map(() => DEV_OVERLAY_TAG));

  const withoutEdge = edge === "end" ? raw.slice(0, stops.length) : raw.slice(overlay.length);
  expect(
    withoutEdge.map(identify),
    `${where}: a dropped \`${DEV_OVERLAY_TAG}\` stop was not at the ${edge} of the sequence, so the ` +
      "filter would be hiding part of the real tab order rather than the dev overlay.",
  ).toEqual(stops.map(identify));

  return stops;
}

/**
 * Walk an OPEN document forward and return the product stops.
 *
 * The bounded-walk clause runs FIRST and it is the assertion that tells a trap from a document: a walk
 * that reaches the press bound without focus ever leaving is what a focus trap looks like from here.
 * `WALK_BOUND` is 40 against a widest measured document of 23 stops, and it is the reason a trap
 * reports as a named failure instead of hanging the run.
 */
async function recordForwardWalk(page: Page, where: string): Promise<StopProbe[]> {
  await resetFocusToTop(page);
  const raw = await walkForward(page);

  expect(
    raw.length,
    `${where}: the forward walk hit its ${WALK_BOUND}-press bound without focus ever leaving the ` +
      "document. That is what a focus trap looks like from here, and the bound is why it is an " +
      "assertion instead of a hang.",
  ).toBeLessThan(WALK_BOUND);

  return partitionAsserted(raw, `${where} (forward)`, "end");
}

/**
 * The UNFOCUSED baseline, keyed by the SAME `identify` the walk is compared with.
 *
 * ⚠ TAKE IT AFTER THE SURFACE HAS SETTLED, NOT AFTER `goto`. MEASURED: the listing page's Leaflet map
 * mounts client-side, and a baseline snapshot taken before it arrives has no entry for the map
 * container or its four controls — five stops whose difference check would then have nothing to
 * compare against. Each row's `settle` waits for the last subtree to appear; this is called after it.
 */
async function baselineOf(page: Page): Promise<Map<string, Indicator>> {
  const candidates = await probeCandidateStops(page);
  const unfocused = new Map<string, Indicator>();
  for (const candidate of candidates) {
    const key = identify(candidate);
    if (!unfocused.has(key)) unfocused.set(key, indicatorOf(candidate));
  }
  return unfocused;
}

/**
 * GATE-02 property 3 — INDICATED, on every stop, against that stop's own unfocused reading.
 *
 * Two claims, not one. `expectRing` alone accepts a control that draws the same thing all the time;
 * the difference check is what makes an indicator an INDICATOR rather than decoration. Both are needed
 * and neither implies the other.
 */
function expectIndicated(
  stops: StopProbe[],
  unfocused: Map<string, Indicator>,
  where: string,
): void {
  stops.forEach((stop, i) => {
    const at = `${where} stop ${i + 1}/${stops.length} \`${identify(stop)}\``;

    expect(
      stop.focusVisible,
      `${at}: the element has focus after a REAL Tab press but does not match \`:focus-visible\`, so ` +
        "DS-05's `focus-visible:*` recipe cannot apply to it and every indicator assertion below " +
        "would be measuring the resting style.",
    ).toBe(true);

    expectRing(stop, at);

    const before = unfocused.get(identify(stop));
    expect(
      before,
      `${at}: this stop has no entry in the unfocused baseline, so the difference check has nothing ` +
        "to compare against. Either the stop projection and the candidate scan disagree about the " +
        "same element — a defect in the instrument — or the element mounted AFTER the baseline was " +
        "taken, which is what this row's `settle` step exists to prevent.",
    ).toBeDefined();
    expect(
      sameIndicator(indicatorOf(stop), before as Indicator),
      `${at}: the focused and unfocused readings are IDENTICAL. Whatever is drawn here is drawn all ` +
        "the time, so it is decoration rather than an indicator: a keyboard user cannot tell from it " +
        "where focus is.",
    ).toBe(false);
  });
}

/**
 * Put the month grid on a FIXED day — the header's whole argument, in four lines.
 *
 * Advancing one month is what makes `Go to the Previous Month` a tab stop on every day of the year;
 * day 1 of that month is always future, always inside the 90-day horizon, and always spelled `1`.
 *
 * `scope` is a `Page` for the rail placement and the SHEET locator for the overlay placement, which is
 * `selectTargetDayIn`'s own parameter and for its own reason: while the sheet is open the document
 * holds two month grids, and a CSS locator composed against the page would address both.
 */
/**
 * The listing rows' `settle` — wait for the two subtrees that arrive AFTER the month grid does.
 *
 * BOTH WAITS WERE ADDED BY A MEASUREMENT, not by caution:
 *
 *   • THE MAP mounts client-side and contributes FIVE stops — the Leaflet viewport plus its four
 *     controls. A baseline taken before it arrives has no unfocused reading for any of them.
 *   • THE HOUR LIST is fetched when a day is chosen, and the first run of this file failed on exactly
 *     that race: `button[button]:6:00 AM` was stop 10 of the walk and absent from the baseline, so
 *     the difference check for the slot picker's ONLY tab stop had nothing to compare against.
 *
 * Both failures are the same shape and both are silent in the dangerous direction — a missing baseline
 * entry is what an assertion that measures nothing looks like from the inside.
 */
async function settleListing(page: Page, where: string): Promise<void> {
  await expect(
    page.getByRole("button", { name: "Zoom in" }),
    `${where}: the Leaflet map never mounted, so five of this row's declared stops would have no ` +
      "unfocused reading to be compared against.",
  ).toHaveCount(1, { timeout: 30_000 });

  await expect(
    page.getByRole("button", { name: FIRST_HOUR, exact: true }),
    `${where}: the chosen day's hour list never resolved. \`${FIRST_HOUR}\` is the fixture's own ` +
      "opening hour on all seven days, and it is the slot picker's ONE tab stop — without it this " +
      "row measures a calendar with no hours beside it.",
  ).toHaveCount(1, { timeout: 30_000 });
}

async function armNextMonthDayOne(scope: Page | Locator, where: string): Promise<void> {
  await scope.getByRole("button", { name: /next month/i }).click();
  const dayOne = scope.locator(DAY_CELL).filter({ hasText: /^1$/ });
  await expect(
    dayOne,
    `${where}: the advanced month grid holds ${await dayOne.count()} in-month cells reading \`1\`, ` +
      "not one. Every literal in this row's declared sequence is derived from that cell being " +
      "selected, so an ambiguous match here would silently measure a different day.",
  ).toHaveCount(1);
  await dayOne.click();
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ROWS
// ═════════════════════════════════════════════════════════════════════════════════════════════════

type WalkCase = {
  readonly caseName: string;
  /** The GATE-02 family this row is the record for. */
  readonly family: "calendar" | "slot picker";
  readonly viewport: { readonly width: number; readonly height: number };
  /** Reaches a state the plain path cannot. Runs AFTER the shared composition is confirmed. */
  readonly open?: (page: Page) => Promise<void>;
  /** A selector only this row's state produces — TRAP 1. */
  readonly tell: string;
  /** Why that selector cannot be satisfied by the row above it. */
  readonly tellWhy: string;
  /** Waits for the last late-mounting subtree, so the baseline sees every stop the walk will. */
  readonly settle: (page: Page) => Promise<void>;
  /** The expected focus sequence, as data. `identify` strings, first press to last. */
  readonly stops: readonly string[];
  /**
   * GATE-02 property 2 — OPERABLE. The composite's OWN key contract, asserted after the sequence.
   *
   * Separate from `stops` because reachable is not operable: a focusable `<div>` with a click handler
   * appears in a walk and does nothing, and a roving-tab-index widget appears ONCE while owning a
   * dozen controls that only arrow keys reach. This is where the arrows are pressed.
   */
  readonly operable: (page: Page, where: string) => Promise<void>;
};

/**
 * TWO ROWS OVER ONE DOCUMENT, and they are two STATES rather than two routes — the same relationship
 * `auth-keyboard.spec.ts`'s `/forgot-password` and `/forgot-password · post-submit` have.
 *
 * The calendar row is the resting booking panel with a day chosen. The slot-picker row is that panel
 * after a WINDOW has been chosen with the keyboard alone, which is a genuinely different document: it
 * grows the service-fee disclosure and the hold CTA. Declaring both is what makes the slot picker's
 * operability visible in the tab order rather than only in a price string.
 */
const LISTING_ROWS: readonly WalkCase[] = [
  {
    caseName: "/listings/[id] · the availability calendar",
    family: "calendar",
    // 1280 rather than the floor: above `lg:` the booking panel renders in the RAIL, in the open
    // document, so the walk measures the calendar inside a page focus can leave. The same composite
    // inside the sheet is measured by the overlay block below, where it is legitimately trapped.
    viewport: { width: 1280, height: 900 },
    open: async (page) => {
      await armNextMonthDayOne(page, "/listings/[id] · the availability calendar");
    },
    tell: `${AVAILABILITY} [data-slot="calendar"]`,
    tellWhy:
      "the RESOLVED month grid. `availability-calendar.tsx` renders a `skeleton-calendar` plate in " +
      "the same box while the month's availability is in flight, and that plate carries no `calendar` " +
      "slot — so this pins the resolved availability read rather than the placeholder standing in " +
      "for it.",
    settle: async (page) => {
      await settleListing(page, "/listings/[id] · the availability calendar");
    },
    operable: async (page, where) => {
      await expectCalendarArrows(page, page, where);
    },
    stops: [
      "a:FitOut@none",
      "a:Log in@none",
      "a:Sign up@none",
      GALLERY_THUMB,
      GALLERY_THUMB,
      GALLERY_THUMB,
      "button[button]:Go to the Previous Month",
      "button[button]:Go to the Next Month",
      // ONE stop for the whole month grid, and that is CORRECT rather than a gap: react-day-picker
      // gives the grid a roving tab index, so a keyboard user tabs INTO the calendar once and moves
      // within it with arrows. The arrow contract is asserted separately — reachable is not operable.
      "button[button]:1",
      // ONE stop for the whole hour list, same construction, same separate arrow assertion.
      `button[button]:${FIRST_HOUR}`,
      "button[button]:Book full day",
      // ⚠ THE MAP CONTAINER IS A FOCUSABLE `<div>` AND IT IS NOT A DEFECT. Leaflet gives its viewport
      // a tab index so the map can be panned with the arrow keys — the textbook case of a focusable
      // div that IS operable. It is recorded here rather than filtered, because a stop nobody
      // declared is exactly what this file exists to surface.
      "div:+− Leaflet | © OpenStreetMap contributors@main",
      "a:+@main",
      "a:−@main",
      "a:Leaflet@main",
      "a:OpenStreetMap@main",
      ...FOOTER_TAIL,
    ],
  },
  {
    caseName: "/listings/[id] · the slot picker, window chosen by keyboard",
    family: "slot picker",
    viewport: { width: 1280, height: 900 },
    open: async (page) => {
      const where = "/listings/[id] · the slot picker, window chosen by keyboard";
      await armNextMonthDayOne(page, where);
      // The window is chosen with the KEYBOARD, from the anchor the roving tab index parks on:
      // Enter takes the start hour, ArrowRight moves one hour along the run, Space closes it. Nothing
      // here clicks an hour, which is what makes the resulting document a keyboard-only achievement.
      await settleListing(page, where);
      await tabUntil(page, `button[button]:${FIRST_HOUR}`, where);
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press(" ");
    },
    tell: `${BOOKING_PANEL} button:has-text("Book this space")`,
    tellWhy:
      "the hold CTA, which the panel renders ONLY once a complete window is selected — the row above " +
      "shows `Pick a time above to book.` in that place and no button at all. It is therefore the " +
      "one hook that tells this row's state from the row above it, and it is also the proof that the " +
      "keyboard-only selection in `open` actually landed.",
    settle: async (page) => {
      await settleListing(page, "/listings/[id] · the slot picker, window chosen by keyboard");
    },
    /**
     * THE HOUR LIST'S OWN ARROW CONTRACT. Enter and Space are already proved by this row's `tell` —
     * the hold CTA only exists because `open` chose a window with those two keys and nothing else —
     * so what is left to assert is the movement the roving tab index makes necessary.
     *
     * MEASURED 2026-08-29 rather than reasoned from the layout: `6:00 AM` -ArrowRight-> `7:00 AM`
     * -ArrowDown-> `8:00 AM`. Both arrows advance by ONE hour here, which is worth writing down
     * because the visual arrangement invites the guess that down skips a row. Both destinations are
     * asserted by NAME, because a grid whose arrows move focus to the wrong cell moves focus fine.
     */
    operable: async (page, where) => {
      const anchor = await tabUntil(page, `button[button]:${FIRST_HOUR}`, `${where} · the hours`);
      expectRealPress(anchor, `${where} · the slot picker's roving stop`);
      await page.keyboard.press("ArrowRight");
      await expectStopIs(page, "button[button]:7:00 AM", `${where} · ArrowRight from 6:00 AM`);
      await page.keyboard.press("ArrowDown");
      await expectStopIs(page, "button[button]:8:00 AM", `${where} · ArrowDown from 7:00 AM`);
    },
    stops: [
      "a:FitOut@none",
      "a:Log in@none",
      "a:Sign up@none",
      GALLERY_THUMB,
      GALLERY_THUMB,
      GALLERY_THUMB,
      "button[button]:Go to the Previous Month",
      "button[button]:Go to the Next Month",
      "button[button]:1",
      `button[button]:${FIRST_HOUR}`,
      "button[button]:Book full day",
      "div:+− Leaflet | © OpenStreetMap contributors@main",
      "a:+@main",
      "a:−@main",
      "a:Leaflet@main",
      "a:OpenStreetMap@main",
      // THE TWO STOPS THE CHOSEN WINDOW ADDS, and the pair is the point: a price disclosure a keyboard
      // user can open, and the action the whole surface exists for.
      "button[button]:What is the service fee?",
      "button[submit]:Book this space",
      ...FOOTER_TAIL,
    ],
  },
];

/**
 * Press Tab until the named stop has focus, or fail naming what was reached instead.
 *
 * Bounded by `WALK_BOUND` for the same reason every walk in `helpers/focus.ts` is: on a trapped or
 * mis-ordered document an unbounded loop is a hang, and a hang is a worse report than an assertion.
 * The returned probe is the REAL reading of that stop — the caller uses it for the `focusVisible`
 * pairing, so the operability claim and the "a real key press landed" claim are about one element.
 */
async function tabUntil(page: Page, wanted: string, where: string): Promise<StopProbe> {
  await resetFocusToTop(page);
  const seen: string[] = [];
  for (let i = 0; i < WALK_BOUND; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await probeActiveStop(page);
    if (stop === null) break;
    seen.push(identify(stop));
    if (identify(stop) === wanted) return stop;
  }
  throw new Error(
    `${where}: \`${wanted}\` was never reached by Tab inside ${WALK_BOUND} presses. The stops the ` +
      `walk did reach, in order: ${JSON.stringify(seen)}. A control that cannot be reached by ` +
      "keyboard is a WCAG 2.1.1 failure, and a control this file cannot reach is a claim it cannot " +
      "make — either way this is a failure and never a skip.",
  );
}

/**
 * PROPERTY 2's other half, and the one that is easy to leave out: A REAL KEY PRESS LANDED HERE.
 *
 * `:focus-visible` is what DS-05's whole recipe hangs off, and Chromium does not apply it to a
 * programmatic focus move. So an operability assertion paired with this flag says "this control acted
 * on a KEYBOARD event"; the same assertion without it would be equally satisfied by a script that had
 * placed focus and dispatched a synthetic key, which is not what a keyboard user does.
 */
function expectRealPress(stop: StopProbe, where: string): void {
  expect(
    stop.focusVisible,
    `${where}: \`${identify(stop)}\` holds focus but does not match \`:focus-visible\`, so the press ` +
      "that put it there was not a real one. Every operability claim in this file is paired with this " +
      "flag precisely so it cannot be satisfied by a script moving focus.",
  ).toBe(true);
}

/**
 * Assert which stop focus ARRIVES ON after a key press, by identity, and that a real press put it there.
 *
 * `toBe` against a NAME rather than "focus moved": a composite whose arrow keys move focus to the
 * WRONG cell moves focus perfectly well, and only an equality against the destination tells the two
 * apart. The observed identity is what the poll reports, so a failure says what arrived instead.
 *
 * ⚠ IT POLLS, AND THAT IS A MEASUREMENT RATHER THAN A HEDGE. The slot picker moves focus from a React
 * effect: the key press sets the roving index, the component re-renders, and the new cell is focused
 * afterwards. A single read taken immediately after the press therefore sometimes reports the OLD
 * cell — observed 2026-08-29, where `6:00 AM` -ArrowRight-> read back as `6:00 AM` while the tabbable
 * cell had already become `7:00 AM`, i.e. the state had moved and the focus had not yet followed. A
 * one-shot read of an asynchronous contract is a flaky assertion, and a flaky assertion about
 * keyboard operability is one people delete. The five seconds is a bound, not a wait: the contract is
 * still "this key press lands on that cell", and a press that never lands still fails.
 */
async function expectStopIs(page: Page, wanted: string, where: string): Promise<StopProbe> {
  await expect
    .poll(
      async () => {
        const seen = await probeActiveStop(page);
        return seen === null ? "«null — focus left the document»" : identify(seen);
      },
      {
        timeout: 5_000,
        message: `${where}: the key press should have moved focus to \`${wanted}\`.`,
      },
    )
    .toBe(wanted);

  const stop = await probeActiveStop(page);
  expectRealPress(stop as StopProbe, where);
  return stop as StopProbe;
}

/**
 * THE CALENDAR'S OWN KEY CONTRACT, asserted wherever the month grid renders — the rail placement and
 * the sheet placement both call this.
 *
 * The grid carries a roving tab index, so it contributes ONE stop to the tab order and every other day
 * is reached with arrows. Asserting only the tab stop would report a month grid whose arrow handling
 * had been lost as fully conformant, which is the exact gap GATE-02 separates properties 1 and 2 for.
 *
 * The destinations are DERIVED from the armed day rather than typed in: right is the next day, down is
 * one week on, left steps back one. `1 -> 2 -> 9 -> 8` is that arithmetic on day one.
 */
async function expectCalendarArrows(scope: Page | Locator, page: Page, where: string): Promise<void> {
  const anchor = await tabUntil(page, "button[button]:1", `${where} · the calendar`);
  expectRealPress(anchor, `${where} · the calendar's roving stop`);

  await page.keyboard.press("ArrowRight");
  await expectStopIs(page, "button[button]:2", `${where} · ArrowRight from day 1`);
  await page.keyboard.press("ArrowDown");
  await expectStopIs(page, "button[button]:9", `${where} · ArrowDown from day 2 (one week on)`);
  await page.keyboard.press("ArrowLeft");
  const landed = await expectStopIs(page, "button[button]:8", `${where} · ArrowLeft from day 9`);

  // ENTER SELECTS, and the proof is the SELECTION rather than the focus: after this press focus is on
  // day 8 whether or not the press did anything, so "focus is on 8" proves nothing. react-day-picker
  // appends `, selected` to the chosen cell's accessible name, and exactly one cell may carry it.
  await page.keyboard.press("Enter");
  const selected = scope.locator('[data-slot="calendar"] button[aria-label$="selected"]');
  await expect(
    selected,
    `${where}: after Enter on \`${identify(landed)}\` the month grid reports a number of selected ` +
      "cells other than one. A grid that moves focus with the arrows but selects nothing on Enter is " +
      "reachable, indicated and dead — which is what property 2 exists to catch.",
  ).toHaveCount(1);
  await expect(
    selected,
    `${where}: Enter moved focus to day 8 but the selected cell is still somewhere else, so the key ` +
      "press did not reach the grid's selection handler.",
  ).toHaveText("8");
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE LISTING COMPOSITES — the calendar and the slot picker
// ═════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("GATE-02 keyboard — the booking composites on /listings/[id]", () => {
  // SERIAL and 180s: the whole block shares one seeded listing built in `beforeAll`, and every case
  // waits on a route the dev server may still be compiling. `overflow-320.spec.ts`'s measured
  // allowance for the heaviest routes is the same figure.
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  let seed: SeededListing;

  test.beforeAll(async () => {
    // THREE PHOTOS, PASSED EXPLICITLY. `GALLERY_THUMB` appears three times in both declared sequences
    // and this is the number it is derived from — taking the helper's default would leave the literal
    // tied to a value nobody reading this file can see.
    seed = await seedBookableListing({ titlePrefix: "E2E KbComposites", photos: 3 });
  });

  test.afterAll(async () => {
    await seed?.teardown();
  });

  for (const row of LISTING_ROWS) {
    test(`${row.caseName} — ${row.stops.length} stops, in order`, async ({ page }) => {
      await page.setViewportSize({ ...row.viewport });
      await page.goto(`${BASE}/listings/${seed.listingId}`);
      await expectReachable(page, BOOKING_PANEL, `${row.caseName} (before the resolver)`);
      await expectReachable(
        page,
        `${AVAILABILITY} [data-slot="calendar"]`,
        `${row.caseName} (before the resolver)`,
      );
      if (row.open !== undefined) await row.open(page);
      await expectReachable(page, row.tell, `${row.caseName} — ${row.tellWhy}`);
      await row.settle(page);
      await page.evaluate(() => document.fonts.ready);

      // ── THE UNFOCUSED BASELINE, taken BEFORE the walk presses a key ───────────────────────────
      const unfocused = await baselineOf(page);

      // ── PROPERTY 1 — REACHABLE ────────────────────────────────────────────────────────────────
      const stops = await recordForwardWalk(page, row.caseName);

      // ONE `toEqual` OVER THE WHOLE ARRAY, never a per-stop loop. A loop reports "stop 9 differs"
      // and sends the reader counting; the array form prints both sequences side by side and shows an
      // INSERTED or REMOVED stop for what it is.
      expect(
        stops.map(identify),
        `${row.caseName}: the recorded tab order is not the one this file declares. If the page is ` +
          "right and the declaration is stale, fix the declaration and say why in the summary — " +
          "never edit the page to make the sequence come true.",
      ).toEqual([...row.stops]);

      // ── PROPERTY 3 — INDICATED ────────────────────────────────────────────────────────────────
      expectIndicated(stops, unfocused, row.caseName);

      // ── PROPERTY 2 — OPERABLE ─────────────────────────────────────────────────────────────────
      // LAST, deliberately: every contract below MOVES the roving stop or changes the selection, so
      // running it before the sequence assertion would measure a document this row has not declared.
      await row.operable(page, row.caseName);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // THE SHEET — the same two composites, in the presentation a phone actually gets
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // Below `lg:` the booking panel is not in the page at all: `booking-panel.tsx:203` renders the month
  // grid only in the SHEET arrangement, and RESP-02 puts the way in on a sticky bar. So this is not a
  // narrower repeat of the rows above — it is the only placement in which a phone user meets either
  // composite, and it is the one where they sit inside a modal focus trap.
  test("/listings/[id] · the booking sheet — opened by a key press, calendar operable inside it", async ({
    page,
  }) => {
    const where = "/listings/[id] · the booking sheet";
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${BASE}/listings/${seed.listingId}`);
    await expectReachable(page, BOOKING_PANEL, `${where} (before the resolver)`);

    // ── PROPERTY 2 on the TRIGGER — the sheet opens from a real key press ────────────────────────
    // Reached by Tab rather than clicked, which makes this two claims at once: the sticky bar's one
    // action is keyboard-REACHABLE, and Enter on it OPERATES. A trigger that only responds to a
    // pointer is the commonest way a whole surface becomes unreachable without any control being
    // missing.
    const trigger = await tabUntil(page, "button[button]:Check availability", where);
    expectRealPress(trigger, `${where} · the sticky bar's trigger`);
    await page.keyboard.press("Enter");

    const sheet = page.locator(OVERLAY);
    await expect(
      sheet,
      `${where}: Enter on \`${identify(trigger)}\` opened no overlay. With no window selected this is ` +
        "the bar's ONLY action (D-59 #3 replaces it once a window is picked), so a trigger that does " +
        "not answer the keyboard puts the entire booking surface out of reach below `lg:`.",
    ).toHaveCount(1, { timeout: 30_000 });

    // ── PROPERTY 2 INSIDE the sheet — the calendar's contract is the SAME contract ───────────────
    // Scoped to the sheet locator rather than the page, which is `selectTargetDayIn`'s own reason:
    // while the overlay is open the document holds two month grids, and a CSS locator composed
    // against the page addresses both.
    await armNextMonthDayOne(sheet, where);
    await expectCalendarArrows(sheet, page, where);
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // THE DIALOG — the avatar crop overlay on /profile
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // The same primitive in its CENTRED presentation, and the one overlay in the app that opens with no
  // click on its own trigger: a file is staged and the dialog follows. That makes the trigger's
  // reachability a separate claim from the dialog's, and both are made here.
  test("/profile · the avatar crop dialog — reached and dismissed from the keyboard", async ({
    page,
  }) => {
    const where = "/profile · the avatar crop dialog";
    await page.setViewportSize({ width: 1280, height: 900 });
    await signUpBooker(page, seed);
    await page.goto(`${BASE}/profile`);
    await expectReachable(page, 'input[type="file"]', `${where} (before the resolver)`);

    const trigger = await tabUntil(page, "button[button]:Upload photo", where);
    expectRealPress(trigger, `${where} · the picker's trigger`);

    // The file is STAGED rather than the trigger pressed, because pressing it opens the operating
    // system's file chooser, which no browser automation may drive. `overflow-320.spec.ts:324` takes
    // the same route and records why the input may be addressed by type: `avatar-field.tsx` states
    // that it is the only `<input type="file">` in `src/`, so Playwright's strict mode turns a second
    // one appearing into a failure here rather than into a silently mis-staged control.
    await page.locator('input[type="file"]').setInputFiles(AVATAR_CROP_FIXTURE);
    await expect(
      page.getByRole("dialog", { name: AVATAR_CROP_TITLE }),
      `${where}: the crop dialog did not open after a valid fixture was staged. Either the pre-dialog ` +
        "guards refused it (check for an alert on `/profile`) or the decode never resolved.",
    ).toHaveCount(1, { timeout: 30_000 });

    // ── PROPERTY 2 — the dialog's own dismiss action fires from the keyboard ─────────────────────
    // `Cancel` and `Escape` are DIFFERENT claims and this file makes both: this one says the rendered
    // control answers a key press, and the escapable block below says the overlay answers the key
    // every modal in the platform answers. An overlay can have one and not the other.
    const cancel = await tabUntil(page, "button[button]:Cancel", where);
    expectRealPress(cancel, `${where} · the dialog's cancel action`);
    await page.keyboard.press("Enter");
    await expect(
      page.locator(OVERLAY),
      `${where}: Enter on \`${identify(cancel)}\` left the overlay open. The crop stage's own arrow ` +
        "contract is `e2e/avatar-crop.spec.ts:2327`'s subject and is not restated here; what this " +
        "case adds is that the dialog's footer answers a keyboard at all.",
    ).toHaveCount(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE WIZARD — GATE-02's third named composite, at the width its step rail collapses to
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ MEASURED FIRST, AND IT SHARPENS THE PLAN'S DESCRIPTION OF THIS SURFACE RATHER THAN CONTRADICTING
// IT. 17-08-PLAN calls the step rail "a composite whose steps must each be reachable and operable".
// TRUE — but not yet, on the document this route mounts. On a FRESH MOUNT the rail has NO tab stops at
// all: `wizard.tsx:454` seeds `visitedKeys` with `STEPS[0].key` only and `:953` makes a marker a
// control only once its step is both `done` AND visited, so on arrival every marker is an inert
// `<span>`. `overflow-320.spec.ts:1921-1930` records the same fact from the other side, as the reason
// a row cannot be pointed at a wizard step by URL.
//
// So the rail is measured where it EXISTS — after the advance, which is the first moment step 1 is
// both done and visited. That is assertion (c) below, and it was not written from this reasoning: it
// was written because assertion (b) FAILED with a strict-mode violation naming the marker (see (b)'s
// own note). The rail proved it had become a control by making an unrelated locator ambiguous, which
// is the only reason this file knows the property is reachable at all.
//
// This row therefore carries all five: the whole tab order a host meets on arriving (reachable,
// indicated), the step's own two controls plus the rail marker (operable), and the route's drawer
// (escapable, returned — the block below).
//
// 320 RATHER THAN 1280, and the choice is forced rather than preferred:
//   • it is where the publish checklist collapses to a single disclosure, i.e. where the composite
//     exists at all (D-149);
//   • and it is where the host nav renders as a DRAWER, which is this route's own overlay and the
//     third subject of the escapable/returned block below.

/** The Playwright process doesn't load .env; fall back to the deterministic dev URL (booker-seed.ts). */
const HOST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

/** The seeded listing's own category, and the string its combobox stop is named by. */
const HOST_SPACE_TYPE_LABEL = "Multi-sport court";

/**
 * The publish checklist's collapsed summary, which is a STOP in the declared sequence below.
 *
 * DERIVED FROM THE SEED, stated here rather than left as a magic number: `publish-checklist.tsx`
 * counts ten rows and this fixture satisfies eight — title, description, space type, address,
 * capacity, hourly rate, day rate and cancellation policy. The two it does not are `3+ photos` (the
 * seed inserts exactly one, for `openWizardPhotosStep`'s reason) and `Verified email` (the host signs
 * up through the UI and never confirms). Seed a second photo and this literal moves.
 */
const CHECKLIST_SUMMARY = "8 of 10 ready to publish";

/**
 * The advance action's label ON STEP 1 ONLY — `wizard.tsx:823` reads
 * `step === 0 ? "Get started" : "Save and continue"`.
 *
 * That ternary is what makes this string a STEP INDICATOR rather than a caption, and it is why
 * assertion (c) below can prove the rail navigated by reading a button's name: nothing else on the
 * document says "step 1" out loud, and a heading would not — several steps share theirs.
 */
const ADVANCE_STEP_ONE = "Get started";

/**
 * The step rail's return marker, named by the template `wizard.tsx:967` builds its `aria-label` from:
 * `Go back to step ${i + 1}: ${s.title}`.
 *
 * A PREFIX rather than the whole string, deliberately. The marker's `textContent` is a `CheckIcon` and
 * nothing else, so `identify` falls through to the shared projection's `label` — which `helpers/focus.ts`
 * truncates at 40 characters. Matching the prefix keeps this file from restating that cut-off, which
 * would be a second copy of a projection rule this file exists to consume rather than re-derive.
 */
const RAIL_RETURN_PREFIX = "Go back to step 1:";

type HostFixture = {
  readonly listingId: string;
  readonly hostEmail: string;
  readonly sql: ReturnType<typeof postgres>;
  readonly cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
};

/**
 * One published listing owned by a UI-signed-up host — `overflow-320.spec.ts:1732`'s `seedHostSurfaces`,
 * REPLICATED rather than imported, because that function is module-local to a spec file.
 *
 * The replication is trimmed to what a wizard walk needs and the omissions are deliberate: no booker
 * and no bookings, because the edit route reads neither. What is kept verbatim is the load-bearing
 * part — the UI sign-up (a seeded session would skip `canHost`, which the route redirects on), the
 * activated payout wallet, and EXACTLY ONE photo, whose count is load-bearing in both directions: at
 * zero the uploader returns its empty state, and at three the checklist's `3+ photos` row goes done,
 * its `Fix` link stops rendering and the photos step loses its only seam.
 */
async function seedWizardHost(page: Page): Promise<Omit<HostFixture, "cookies">> {
  const hostEmail = `e2e.kbc.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Kaye");
  await page.getByLabel("Email").fill(hostEmail);
  await page.getByLabel("Password").fill("averylongpassword");
  await page.getByRole("button", { name: /sign up to host/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 60_000 });

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

  const listingId = `e2e_kbc_listing_${runId}`;
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${host.id}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, status, cancellation_policy, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${host.id}, ${`Kaye Memorial Multi-Sport Court ${runId.slice(0, 6)}`},
      ${"A covered court with two hoops, a scoreboard and a water station."},
      ${"multi_sport_court"}::space_type,
      ${"7 Real Street"}, ${"Makati"}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${10}, ${1}, ${"Asia/Manila"},
      ${47333}, ${288888}, ${25000}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      ${"standard"}::cancellation_policy, now(), now(), now()
    )
  `;
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position, created_at)
    VALUES (
      ${`e2e_kbc_photo_${randomUUID()}`}, ${listingId},
      ${`fitout/listings/${listingId}/cover`}, ${"/vrt/photo-0.svg"}, ${0}, now()
    )
  `;

  return { listingId, hostEmail, sql };
}

/**
 * THE WIZARD'S DECLARED TAB ORDER at 320, measured 2026-08-29.
 *
 * The first five stops are the signed-in host shell — wordmark, the nav DRAWER's trigger (the
 * `hidden md:flex` link list is not in the tree at this width), the mode control, the notification
 * bell and the profile link. Then the step's own three controls, then the footer.
 */
const WIZARD_STOPS: readonly string[] = [
  "a:FitOut · Hosting@none",
  "button[button]:Menu",
  "button[button]:Hosting",
  // The bell's count is part of its accessible name, and this fixture seeds no requests — so `0` here
  // is a fact about the seed. A fixture with a live request would read `1 unread` and this row would
  // go red naming the reason, which is the correct blast radius for a shell control that changes its
  // own name.
  "button[button]:Notifications, 0 unread",
  "a:Profile@none",
  `button[button]:${CHECKLIST_SUMMARY}`,
  `button[combobox]:${HOST_SPACE_TYPE_LABEL}`,
  "button[button]:Add activity tags",
  `button[button]:${ADVANCE_STEP_ONE}`,
  ...FOOTER_TAIL,
];

test.describe("GATE-02 keyboard — the listing wizard and its drawer", () => {
  // SERIAL and 240s: the block shares one seeded host built in `beforeAll`, and the edit route is the
  // heaviest in the app — `overflow-320.spec.ts` records its tell not resolving inside 20s on a cold
  // compile, on a page with nothing wrong with it.
  test.describe.configure({ mode: "serial", timeout: 240_000 });

  let fixture: HostFixture;

  test.beforeAll(async ({ browser }) => {
    // The signup happens in its own context, ONCE, and its cookies are what every case reuses —
    // `host-dashboard.spec.ts:142-155`'s measurement: a login per case drives the sign-in endpoint
    // past `auth.ts:167`'s five-per-sixty-seconds limiter, and the refusal reads exactly like a
    // product bug on the page under test.
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    const seeded = await seedWizardHost(page);
    const cookies = await context.cookies();
    await context.close();
    fixture = { ...seeded, cookies };
  });

  test.afterAll(async () => {
    if (fixture === undefined) return;
    // The host's deletion cascades to the listing and its photo.
    await fixture.sql`DELETE FROM "user" WHERE email = ${fixture.hostEmail}`;
    await fixture.sql.end();
  });

  /** Navigate to the wizard and wait for BOTH the route and the shell's nav to resolve. */
  async function armWizard(page: Page, where: string): Promise<void> {
    await page.context().addCookies([...fixture.cookies]);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${BASE}/host/listings/${fixture.listingId}/edit`);
    await expect(
      page.locator(WIZARD_RAIL),
      `${where}: the route rendered no \`${WIZARD_RAIL}\`. Only the resolved wizard renders it — an ` +
        "`h1` would have been the trap here, because every step of the wizard renders one and so does " +
        "every other host route. ⚠ On a cold dev server this route compiles for tens of seconds.",
    ).toHaveCount(1, { timeout: 120_000 });

    // THE SECOND WAIT IS NOT BELT-AND-BRACES. The host nav is inside a `<Suspense>` whose fallback
    // contributes NO tab stop, and a walk taken while it is still pending reports a sequence with the
    // drawer trigger missing — observed, and it is the difference between a 14-stop and a 13-stop
    // reading of the same correct document.
    await expect(
      page.getByRole("button", { name: "Menu" }),
      `${where}: the host nav never resolved past its Suspense fallback, so the drawer trigger — a ` +
        "declared stop, and the subject of the escapable block — would be absent from a walk of a " +
        "document that does render it.",
    ).toHaveCount(1, { timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
  }

  test(`/host/listings/[id]/edit · the wizard at 320 — ${WIZARD_STOPS.length} stops, in order`, async ({
    page,
  }) => {
    const where = "/host/listings/[id]/edit · the wizard at 320";
    await armWizard(page, where);

    const unfocused = await baselineOf(page);

    // ── PROPERTY 1 — REACHABLE ────────────────────────────────────────────────────────────────────
    const stops = await recordForwardWalk(page, where);
    expect(
      stops.map(identify),
      `${where}: the recorded tab order is not the one this file declares. If the page is right and ` +
        "the declaration is stale, fix the declaration and say why in the summary — never edit the " +
        "page to make the sequence come true.",
    ).toEqual([...WIZARD_STOPS]);

    // ── PROPERTY 3 — INDICATED ────────────────────────────────────────────────────────────────────
    expectIndicated(stops, unfocused, where);

    // ── PROPERTY 2 — OPERABLE ─────────────────────────────────────────────────────────────────────
    // (a) THE PUBLISH CHECKLIST'S DISCLOSURE. D-149 defaults it closed at this width, so this control
    // is the only route into the checklist a phone has — and the checklist is where the `Fix` links
    // that reach the other eight steps live. A disclosure that does not answer Enter puts the whole
    // thing behind a pointer.
    const disclosure = await tabUntil(page, `button[button]:${CHECKLIST_SUMMARY}`, where);
    expectRealPress(disclosure, `${where} · the publish checklist's disclosure`);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Fix" }).first(),
      `${where}: Enter on \`${identify(disclosure)}\` revealed no \`Fix\` control, so the collapsed ` +
        "checklist did not open. `publish-checklist.tsx:220` renders one for every row that is not " +
        "done, and this fixture leaves two of them undone.",
    ).toBeVisible({ timeout: 30_000 });

    // (b) THE ADVANCE ACTION. `Back` is rendered and DISABLED on step 1 — it is in the candidate scan
    // and deliberately not in the declared sequence above, because a disabled control is not a tab
    // stop. Its becoming ENABLED is therefore a fact about the wizard having moved, and a stronger
    // observable than a heading, which several steps share.
    //
    // ⚠ `exact` IS LOAD-BEARING AND IT WAS PUT THERE BY A FAILURE, NOT BY STYLE. Written without it,
    // this assertion died on a strict-mode violation resolving TWO elements: the wizard's own `Back`
    // button and — the interesting one — a rail marker labelled `Go back to step 1: What kind of space
    // is it?`, which contains the substring. The wizard had advanced correctly; the locator had gone
    // ambiguous because the ADVANCE IS EXACTLY WHAT TURNS THE FIRST RAIL MARKER INTO A CONTROL. That
    // accident is where assertion (c) comes from, and the substring match is now closed off so this
    // assertion answers only its own question.
    const advance = await tabUntil(page, `button[button]:${ADVANCE_STEP_ONE}`, where);
    expectRealPress(advance, `${where} · the wizard's advance action`);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Back", exact: true }),
      `${where}: Enter on \`${identify(advance)}\` did not advance the wizard — \`Back\` is still ` +
        "disabled, which is its step-1 state. An advance action that only answers a pointer strands " +
        "a keyboard-only host on the first of nine steps.",
    ).toBeEnabled({ timeout: 30_000 });

    // (c) THE STEP RAIL ITSELF — GATE-02's named composite, measured on the document where it exists.
    // See the block header. Reachable is asked of the WALK rather than of a locator, because "the
    // marker is a `<button>`" and "a keyboard user can get to it" are different claims and only the
    // second one is property 1.
    const advanced = await recordForwardWalk(page, `${where} · after the advance`);
    const railStop = advanced.find((stop) => stop.label.startsWith(RAIL_RETURN_PREFIX));
    expect(
      railStop,
      `${where}: no stop in the advanced document's tab order is named \`${RAIL_RETURN_PREFIX}…\`, so ` +
        "the step rail contributes nothing to the keyboard order even after the wizard has moved — " +
        "which would put every completed step behind a pointer. The stops the walk did reach, in " +
        `order: ${JSON.stringify(advanced.map(identify))}.`,
    ).toBeDefined();

    const marker = await tabUntil(page, identify(railStop as StopProbe), `${where} · the step rail`);
    expectRealPress(marker, `${where} · the step rail's return marker`);
    expectRing(marker, `${where} · the step rail's return marker`);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: ADVANCE_STEP_ONE, exact: true }),
      `${where}: Enter on \`${identify(marker)}\` did not take the wizard back to step 1. The advance ` +
        `action's label IS the step (\`wizard.tsx:823\`: \`${ADVANCE_STEP_ONE}\` on step 1, ` +
        "`Save and continue` on every other), so its absence means the marker rendered as a button " +
        "and navigated nowhere — reachable, indicated and dead, which is what property 2 is separate " +
        "from property 1 to catch.",
    ).toBeVisible({ timeout: 30_000 });
  });
});
