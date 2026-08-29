import { expect, test, type Locator, type Page } from "@playwright/test";

import { BASE, seedBookableListing, type SeededListing } from "./helpers/booker-seed";
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
    });
  }
});
