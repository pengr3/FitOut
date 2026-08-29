// RESP-04, THE RENDERED HALF — AC#12 (plan 17-09, task 1; AC#13 follows in task 2).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE MEASURES, AND WHY A SOURCE SCAN COULD NOT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/design/one-tree.test.ts` (plan 17-03) already proves two SOURCE facts: no file under
// `src/app/**` or `src/components/**` renders a viewport-conditional JSX branch (AC#10), and `src/`
// holds exactly one `matchMedia` CALL SITE with zero `useMediaQuery` imports (AC#11). Neither fact
// proves the RENDERED consequence, and the gap is not a technicality:
//
//   • a tree free of `{isMobile ? … : …}` can still mount a client island twice, because two mounts
//     need two call sites of one component and not a branch;
//   • a duplicate can be hidden with `opacity-0` or `sr-only` rather than with `hidden`, which is
//     invisible on screen and fully present in the DOM and in the accessibility tree.
//
// So the assertion RESP-04 actually needs is a COUNT OVER THE DOCUMENT at three widths.
//
// ── THE COUNT IS OVER THE DOCUMENT, NOT OVER WHAT IS PAINTED, AND THAT IS THE WHOLE CLAIM ─────────
// `[data-testid=…]` resolves against a `display: none` node exactly as it resolves against a painted
// one. That is precisely why a count is the right assertion and "is it on screen" is not: the exact
// failure this criterion exists to catch — a forked mobile/desktop variant that renders BOTH copies
// and hides one with CSS — is a page where one copy is painted and the other is not. An assertion
// phrased as "the thing the user can see is there" reports that page as CORRECT. Two mounted copies
// of a client island double-mount, double-submit and produce two focus targets, and every one of
// those is true of the copy nobody can see.
//
// This file therefore contains ZERO visibility assertions, by construction, and the plan's own
// acceptance criterion greps for that — a visibility check appearing here would silently retire the
// measurement. `toHaveCount` over a `[data-testid]` locator and a raw `document.querySelectorAll`
// count are the only two instruments used, and the second exists to guard the first
// (see `expectOneInDocument`).
//
// ── WHY TWO OF THESE SURFACES COULD NOT BE COUNTED BEFORE PLAN 17-03 ──────────────────────────────
// The search-results region and the availability calendar had NO identifying container id. The
// calendar had only its loading-fallback hook, which answers "is it loading" rather than "is there
// one calendar" — on a resolved page those two questions have opposite correct answers, so a
// one-instance gate hung on the fallback would report a perfect zero against a page carrying two
// calendars. 17-03 shipped both ids with compile-enforced `SELECTOR_CONTRACT` rows; this file is the
// half that does the counting, and it counts the RESOLVED containers.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// MEASURED BASELINE — 29 August 2026, this tree, against the dev server on :3000
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every number below was read off the running app BEFORE the assertions were written, so the table
// records a measurement rather than an expectation. All AC#12 counts are 1 at all three widths:
//
//   /                             search-results-region  1 · 1 · 1   (result-card 9 on this catalogue)
//   /listings/[id]                listing-key-facts      1 · 1 · 1
//   /listings/[id]                availability-calendar  1 · 1 · 1
//   /listings/[id]                booking-panel          1 · 1 · 1
//   /host/listings/[id]/edit      wizard-step-rail       1 · 1 · 1
//   /host/listings/[id]/edit      publish-checklist      1 · 1 · 1
//   /listings/[id]/book?hold=…    checkout-sticky-bar    1 · 1 · 1   (price-total 1)
//   /host                         host-agenda            1 · 1 · 1
//   /host                         agenda-rows            1 · 1 · 1
//
// ⚠ ONE OF THOSE ROWS IS TRUE OF HALF THE PRODUCT'S LISTINGS ONLY, AND THE HALF IS FOUND HERE
// RATHER THAN ASSUMED. `availability-calendar.tsx:551-582` forks on the PERSISTED occupancy mode:
// an `open_capacity` (drop-in) listing takes an early return that renders a FRAGMENT — deliberately,
// so the drop-in tree keeps its box — and that fragment carries NO container id at all. So the
// declared id counts 1 on an `exclusive` listing and 0 on a drop-in one, and AC#12's claim cannot
// be ASKED of the drop-in calendar. It is a named skip below, not a silent one, and the discovery
// is recorded in this plan's summary as a finding for the phase's deferred items.
//
// AC#13's half — the navigation-landmark count — lands in the next commit, with its own per-route
// table. Its counts are NOT uniformly 1, which is why it needs one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • THE BOOKING SHEET IS COUNTED SHUT, NEVER OPEN. `listings/[id]/(detail)/page.tsx` mounts
//     `BookingPanel` twice — the RAIL placement, which is in the document at every width, and the
//     SHEET placement, which lives in a portal and is not in the document until the sticky bar's
//     trigger is tapped. Measured: `booking-panel` counts 1 on the resting page at all three widths.
//     Opening the sheet takes it to 2, and that second mount is RESP-02's sanctioned arrangement
//     (one component, two placements, one provider, one fetch) asserted by
//     `e2e/mobile-booker-path.spec.ts` — not contradicted here. What this row claims is the narrower
//     claim AC#12 makes: the RESTING document holds exactly one.
//   • THE MOBILE CARD STACK HAS NO CONTAINER ID, so the `row-card` family is a named skip rather
//     than a measurement. The skipped row carries the full reason and throws it into the run.
//   • THE DROP-IN CALENDAR IS THE SECOND NAMED SKIP, for the fork recorded above.
//   • THE LISTING ROWS DRIVE A SEEDED `exclusive` LISTING RATHER THAN WHICHEVER ONE IS FIRST IN
//     THE CATALOGUE, and that is a correction rather than a preference — see `seedBookableListing`'s
//     use below. A discovered listing makes the calendar row's SUBJECT depend on the seed: it counts
//     1 against an exclusive listing and 0 against a drop-in one, so the row passed twice and failed
//     once across three full runs on a tree with nothing wrong with it. A gate that flakes is a gate
//     people learn to ignore, and this one would have been ignored while telling the truth.
//   • ONE THEME. `seedTheme(context, "court")` runs on every case, because a count over the document
//     cannot vary by theme — the two themes differ in CSS custom properties, not in the tree — so a
//     second pass would double the run for a property that is theme-invariant by construction. The
//     theme is seeded rather than left to chance so the document under test is deterministic.
//   • ONE HEIGHT, 900px. Nothing here is a geometry assertion, so height is not a variable.
//   • LIKE THE REST OF THE SUITE, THIS FILE IS NOT IN CI (D-24). It runs locally, before
//     `/gsd:verify-work`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED REDS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// Recorded verbatim beside the clause each one belongs to — `expectOneInDocument` and the placement
// probe — rather than collected here. A watched red kept next to its assertion is a red the next
// editor of that assertion actually reads.

import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

import {
  BASE,
  placeHold,
  seedBookableListing,
  signUpBooker,
  type SeededListing,
} from "./helpers/booker-seed";
import { seedTheme } from "./helpers/theme";
import { SELECTOR_ATTRIBUTE, type SelectorId } from "../src/lib/design/selector-contract";

/**
 * The three declared widths — AC#12's own (`17-UI-SPEC § RESP-04`).
 *
 * 320 is the floor `overflow-320.spec.ts` sweeps, 768 is the `md:` boundary the host nav switches on,
 * and 1280 is the desktop frame every rail placement assumes. They are the widths at which a forked
 * variant would DIFFER, which is what makes them the right three rather than three round numbers.
 */
const WIDTHS = [320, 768, 1280] as const;

/** One height for every case. Nothing here is a geometry assertion — see the header's blind spots. */
const HEIGHT = 900;

/** The one theme every case seeds. A count over the document is theme-invariant — see the header. */
const THEME = "court" as const;

/**
 * The counted selector, BUILT FROM THE DECLARED INVENTORY rather than typed as a string literal.
 *
 * `SELECTOR_ATTRIBUTE` and the `SelectorId` union both come from
 * `src/lib/design/selector-contract.ts`, so a mistyped id in any row below is a COMPILE error rather
 * than a case that quietly counts zero elements and then fails as though the surface were broken.
 * That is the same bidirectional rule the contract file states for `src/`: a name that is not in the
 * inventory is not a name.
 */
function byId(page: Page, id: SelectorId): Locator {
  return page.locator(selectorFor(id));
}

/** The raw selector string, for the `document.querySelectorAll` guard and for failure messages. */
function selectorFor(id: SelectorId): string {
  return `[${SELECTOR_ATTRIBUTE}="${id}"]`;
}

/**
 * Load a route at one width, from a FRESH document, and wait for fonts.
 *
 * ⚠ A FRESH NAVIGATION PER WIDTH, NOT ONE NAVIGATION RESIZED THREE TIMES, AND THE DIFFERENCE IS THE
 * SUBJECT. `host-headings.spec.ts:370-395` resizes one document because a heading count cannot change
 * without a re-render; a MOUNT count can, and the mount this file is most interested in is the one
 * that happens during server render and hydration. A resized document has already hydrated at the
 * first width, so a variant that double-mounted on a cold load at 320 would be measured at whichever
 * width the case happened to start on. Three loads cost seconds and measure what a browser at that
 * viewport actually receives.
 */
async function openAt(page: Page, path: string, width: number): Promise<void> {
  await page.setViewportSize({ width, height: HEIGHT });
  await page.goto(`${BASE}${path}`);
  await page.evaluate(() => document.fonts.ready);
}

/**
 * How long a `tell` is given to resolve.
 *
 * A MEASURED ALLOWANCE, inherited rather than invented: `host-headings.spec.ts:398-411` records the
 * availability route missing its tell inside 20s on the run that COMPILED it, and passing in 3.8s
 * against the warm route on the very next invocation. `overflow-320.spec.ts:2196` carries the same
 * number for the same five host routes. 60s sits above the observed compile and below the per-case
 * budget, so a genuinely absent tell still fails inside the case with its own message rather than by
 * timing the whole test out with none.
 */
const TELL_TIMEOUT_MS = 60_000;

/**
 * TRAP 1 (`e2e/scroll-area-overflow.spec.ts:215-223`, and this file's threat T-17-44): assert the
 * route rendered ITS OWN surface before counting anything on it.
 *
 * A COUNT OF ZERO OVER A PAGE THAT NEVER RENDERED IS STILL A COUNT OF ZERO, and it reads like a
 * completely different defect: "the wizard renders no step rail" and "the wizard never loaded" are
 * the same red with the same number in it. Every row below therefore names something only its own
 * resolved surface produces, and — deliberately — never the id it is about to count. A tell that IS
 * the counted id proves nothing the count does not already prove.
 */
async function expectReachable(page: Page, tell: Locator, tellWhy: string, where: string) {
  await expect(
    tell,
    `${where}: the route did not render the element this row uses to prove it arrived — ${tellWhy} ` +
      "Every count below is satisfied by a redirect, a 404 body and the route's own loading plate, " +
      "which is why this runs first and is a failure rather than a skip. ⚠ If this is the first run " +
      "since a dev-server restart, the route may still be compiling: see `TELL_TIMEOUT_MS`.",
  ).not.toHaveCount(0, { timeout: TELL_TIMEOUT_MS });
}

/**
 * The raw DOM count, POLLED UNTIL IT SETTLES rather than sampled once.
 *
 * ⚠ THIS IS A CORRECTION, AND IT WAS BOUGHT WITH A FLAKE. The first version of this clause took a
 * SINGLE `document.querySelectorAll` sample immediately after the retrying locator assertion passed,
 * and treated any disagreement as proof that the locator was filtering. Observed 2026-08-29, twice in
 * five full-suite runs and never in 24 isolated replications of the same navigation:
 *
 *   Error: listing detail · the booking panel … · 768px:
 *   `document.querySelectorAll("[data-testid="booking-panel"]").length` is 2, but the locator
 *   count above reported 1. …  Expected: 1  Received: 2
 *
 * INVESTIGATED RATHER THAN RETRIED AWAY, because a duplicate booking panel would be a real defect:
 *   • the SERVED document holds exactly one — `curl` on the listing route counts 1 `booking-panel`,
 *     1 `availability-calendar`, 1 `listing-key-facts`, 0 `responsive-dialog`, and one
 *     `data-placement="rail"`;
 *   • the RESTING document holds exactly one — polled every 500ms for 8s at 320, 768 and 1280, the
 *     count never left 1 and the only placement present was `rail`;
 *   • the sheet placement is a portal and is not in the document until the sticky bar is tapped,
 *     which the resting page never is.
 *
 * So the second reading was not a second panel that stayed: it was ONE SAMPLE TAKEN MID-HYDRATION,
 * under the contention of a full suite run, at an instant the retrying locator assertion had already
 * moved past. A single sample is not a settled measurement, and a clause that compares one settled
 * number to one unsettled number reports a race as a library bug — which is worse than not having
 * the clause, because the message it prints sends the next reader looking in the wrong place.
 *
 * Polling loses NOTHING the clause existed for. If the locator ever filtered hidden nodes, the raw
 * count would settle at 2 while the locator settled at 1, and this still fails — now with the
 * offending nodes described. What it stops doing is failing on a document that was still arriving.
 */
async function settleRawCount(
  page: Page,
  selector: string,
): Promise<{ count: number; report: string }> {
  const deadline = Date.now() + RAW_SETTLE_MS;
  let count = await page.evaluate((sel) => document.querySelectorAll(sel).length, selector);
  while (count !== 1 && Date.now() < deadline) {
    await page.waitForTimeout(100);
    count = await page.evaluate((sel) => document.querySelectorAll(sel).length, selector);
  }
  if (count === 1) return { count, report: "" };

  // It never settled. Describe every node it found, so the failure names WHICH copies exist rather
  // than only how many — the question the next reader has is always "which one is the extra one".
  const nodes = await page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel)).map((el, i) => {
      const parent = el.parentElement;
      const computed = window.getComputedStyle(el);
      return (
        `#${i} <${el.tagName.toLowerCase()}` +
        `${el.getAttribute("data-placement") ? ` data-placement="${el.getAttribute("data-placement")}"` : ""}` +
        `> display=${computed.display} visibility=${computed.visibility} ` +
        `opacity=${computed.opacity} inHiddenSubtree=${el.closest("[hidden]") !== null} ` +
        `parent=<${parent?.tagName.toLowerCase() ?? "none"} class="${parent?.className ?? ""}">`
      );
    });
  }, selector);

  return {
    count,
    report:
      `${chrNl()}The ${count} node(s) the DOM holds, after ${RAW_SETTLE_MS}ms of polling:` +
      `${chrNl()}  ${nodes.join(`${chrNl()}  `)}`,
  };
}

/** A newline, as a call, so the surrounding template literals stay readable in a wrapped file. */
function chrNl(): string {
  return String.fromCharCode(10);
}

/**
 * How long the raw count is given to settle. Ten seconds is above every hydration window measured
 * on these routes (the longest observed disagreement resolved inside one 100ms tick) and below the
 * per-case budget, so a document carrying a REAL persistent duplicate still fails inside its case.
 */
const RAW_SETTLE_MS = 10_000;

/**
 * AC#12's assertion, in the two forms that together make it falsifiable.
 *
 * ⚠ WHY THERE ARE TWO COUNTS AND NOT ONE, WHICH IS THE GUARD-THE-GUARD THIS CLAUSE NEEDS. Playwright's
 * locator count is the ergonomic instrument and it retries, which is what makes it usable against a
 * streaming app. But this file's entire claim rests on the counter seeing nodes the USER cannot —
 * a `display: none` copy is the failure — so a locator that quietly filtered by paint would report
 * the defect as correct and nothing in this file would notice. The second count is
 * `document.querySelectorAll(sel).length`, evaluated in the page: the claim in its most literal form,
 * with no library between the assertion and the DOM. They must agree, and the message says so.
 *
 * ⚠ WATCHED RED, 29 August 2026 — the two-copies case, REPRODUCED rather than argued. A temporary
 * hook appended a second `<div data-testid="availability-calendar" style="display:none">` to
 * `document.body` on `/listings/[id]` immediately before this assertion. Observed at 320px, verbatim:
 *
 *   Error: calendar · /listings/[id] · 320px: the number of elements carrying
 *   `[data-testid="availability-calendar"]` IN THE DOCUMENT is not 1. RESP-04 requires exactly one.
 *   …
 *   expect(locator).toHaveCount(expected) failed
 *   Locator:  locator('[data-testid="availability-calendar"]')
 *   Expected: 1
 *   Received: 2
 *   …
 *     14 × locator resolved to 2 elements
 *
 * THE INJECTED COPY WAS `display: none` FOR THE WHOLE FIVE SECONDS, which is the entire argument of
 * this file in one observation: it was never on screen, and it was counted. An assertion phrased as
 * "the one the user can see is there" is GREEN against that document. The probe hook was removed
 * before the file was committed; it exists nowhere in this file now, which is why it is recorded.
 */
async function expectOneInDocument(
  page: Page,
  id: SelectorId,
  where: string,
  why: string,
): Promise<void> {
  const selector = selectorFor(id);

  await expect(
    byId(page, id),
    `${where}: the number of elements carrying \`${selector}\` IN THE DOCUMENT is not 1. RESP-04 ` +
      `requires exactly one. ${why}\n` +
      "⚠ READ THE NUMBER BEFORE READING THE SURFACE. More than one is the forked-variant failure " +
      "this criterion exists to catch: two copies rendered, one hidden with CSS. It is invisible on " +
      "screen and it double-mounts a client island, double-submits its form and offers two focus " +
      "targets. Fewer than one, with the tell above having passed, means the container lost its " +
      "declared id — check `src/lib/design/selector-contract.ts` for the row and its owner.\n" +
      "⚠ AND DO NOT 'FIX' THIS BY ASSERTING WHAT IS PAINTED. A visibility check is green against the " +
      "two-copy document, which is exactly why this file does not contain one.",
  ).toHaveCount(1);

  // The same claim with no library in the way. See this function's header for why both exist, and
  // `settleRawCount` for why it is polled rather than sampled once.
  const settled = await settleRawCount(page, selector);
  expect(
    settled.count,
    `${where}: \`document.querySelectorAll("${selector}").length\` settled at ${settled.count} ` +
      "while the retrying locator count above reported 1. The two disagreeing on a SETTLED document " +
      "means the locator is filtering something the DOM is not — which would retire this whole " +
      "file's claim, because the nodes it must not filter are precisely the hidden duplicates " +
      `RESP-04 is about.${settled.report}`,
  ).toBe(1);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AC#12 — THE SURFACE TABLE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ ZERO SILENT ABSENCES IS A MECHANICAL PROPERTY HERE, NOT A PROMISE (threat T-17-45). The six
// families RESP-04 names are a closed tuple below; every row declares which one it belongs to; and a
// test asserts the two sets are equal. A family that quietly stopped being measured — because its row
// was deleted, or renamed, or moved to a describe nobody runs — fails that test by name rather than
// disappearing from a run that still reports green.

/** The six surface families `17-UI-SPEC § RESP-04` names, verbatim and closed. */
const FAMILIES = [
  "search",
  "listing detail",
  "calendar",
  "wizard",
  "checkout",
  "list surfaces",
] as const;
type Family = (typeof FAMILIES)[number];

/** Which fixture a row needs. Every value here has a describe below that runs its rows. */
const SESSIONS = ["anonymous", "host", "checkout", "unreachable"] as const;
type Session = (typeof SESSIONS)[number];

/**
 * The routes a row can ask for, filled in by whichever describe owns the fixture.
 *
 * A row only ever reads the field its own `session` guarantees; reading a null one throws with a
 * named message rather than navigating to the string "null", which is a 404 that would then fail at
 * the tell and read like a product defect.
 */
type Routes = {
  /** The first listing in the catalogue, DISCOVERED from the running app (anonymous block). */
  readonly listingPath: string | null;
  /** The seeded host's listing id (host block). */
  readonly hostListingId: string | null;
  /** `/listings/[id]/book?hold=…` for a hold minted this run (checkout block). */
  readonly checkoutPath: string | null;
};

type SurfaceRow = {
  /** How the row is named in failures and in skip messages. */
  readonly name: string;
  /** Which of the six named families this row measures. Every family must appear at least once. */
  readonly family: Family;
  /** Which fixture the row needs — the describe that owns it runs it. */
  readonly session: Session;
  /**
   * The declared container id whose count must be 1. `null` only for a row this harness cannot
   * reach, in which case `skip` says why, IN THE RUN'S OUTPUT.
   */
  readonly id: SelectorId | null;
  /** Where to count it. `null` with a mandatory `skip` — a silent absence is not an absence. */
  readonly path: ((routes: Routes) => string) | null;
  /** Why the row is unreachable. Required whenever `path` is `null`. */
  readonly skip?: string;
  /** The element proving the row's own surface rendered. NEVER the id being counted. */
  readonly tell: (page: Page) => Locator;
  /** Why that element cannot be satisfied by a redirect, a 404 or this route's loading plate. */
  readonly tellWhy: string;
  /** What a count other than 1 would MEAN on this surface. Travels into the failure message. */
  readonly why: string;
  /** An interaction between `goto` and the tell, for a surface that needs the page settled first. */
  readonly settle?: (page: Page, where: string) => Promise<void>;
};

/**
 * `/` STREAMS, AND ITS OWN `loading.tsx` RENDERS A SECOND `SearchBar` — so the home route needs a
 * settle before anything on it is counted.
 *
 * `booker-seed.ts:349-363` records the measurement: the served document holds `id="search-category"`
 * at byte 11,713 (the pending fallback) and again at 84,158 (the resolved page), and while the
 * boundary is resolving BOTH are in the DOM. This file counts a DIFFERENT id, so the double bar is
 * not itself a failure here — but a count taken mid-stream is a count over a document that is still
 * two documents, and reading `search-results-region` in that window would be reading the wrong one.
 * Waiting for the search bar to collapse to one is waiting for the stream to finish.
 */
async function settleSearchHome(page: Page, where: string): Promise<void> {
  await expect(
    page.locator("#search-category"),
    `${where}: \`/\` still holds two \`#search-category\` controls — the pending shell's SearchBar ` +
      "and the resolved page's. This waits for the streamed boundary to resolve before anything on " +
      "the page is counted; a persistent 2 means the fallback stopped being replaced, which is a " +
      "product defect rather than a race and belongs in its own finding.",
  ).toHaveCount(1);
}

const SURFACE_ROWS: readonly SurfaceRow[] = [
  // ─── SEARCH ────────────────────────────────────────────────────────────────────────────────────
  {
    name: "search · /",
    family: "search",
    session: "anonymous",
    id: "search-results-region",
    path: () => "/",
    settle: settleSearchHome,
    tell: (page) => byId(page, "result-card"),
    tellWhy:
      "a result card, which ONLY the resolved page renders — `(public)/loading.tsx` composes the " +
      "real `SearchBar` and a `skeleton-card-grid` and no card at all. This block seeds a published " +
      "listing of its own, so a zero here is not an empty catalogue: it means the results grid " +
      "stopped rendering cards for a catalogue that demonstrably has one.",
    why:
      "The results region is the search surface's whole structure, and it is the one container that " +
      "is present in all six states `search-results.tsx` renders (fetch error, searching, results, " +
      "the relaxation band, zero-result and cold start) — which is why 17-03 hung the id on it " +
      "rather than on the heading, which is conditional, or on the cards, which are legitimately N.",
  },

  // ─── LISTING DETAIL ────────────────────────────────────────────────────────────────────────────
  {
    name: "listing detail · /listings/[id]",
    family: "listing detail",
    session: "anonymous",
    id: "listing-key-facts",
    path: (r) => requirePath(r.listingPath, "listingPath"),
    tell: (page) => byId(page, "booking-panel"),
    tellWhy:
      "the RAIL placement of the booking panel, which the resolved listing page renders at every " +
      "width (it is `max-lg:hidden`, i.e. in the document and unpainted below `lg:`). The route's " +
      "`loading.tsx` renders a `skeleton-panel` and no panel, so this cannot be satisfied by the " +
      "plate. It is deliberately NOT `listing-key-facts`: a tell that is the counted id proves " +
      "nothing the count does not already prove.",
    why:
      "The key-facts strip is the listing surface's structural spine. Two of them at any width is " +
      "the forked-variant defect in its most literal form — a mobile strip and a desktop strip, one " +
      "hidden — and it is exactly the arrangement that reads as correct on screen.",
  },
  {
    name: "listing detail · the booking panel (RESP-02's two placements, counted shut)",
    family: "listing detail",
    session: "anonymous",
    id: "booking-panel",
    path: (r) => requirePath(r.listingPath, "listingPath"),
    tell: (page) => byId(page, "listing-key-facts"),
    tellWhy:
      "the key-facts strip, which only the resolved listing page renders and which the row above " +
      "counts — so the two rows prove each other's arrival without either being its own tell.",
    why:
      "⚠ THIS ROW COUNTS THE RESTING DOCUMENT, AND THE DISTINCTION IS RECORDED RATHER THAN ELIDED. " +
      "`page.tsx` mounts `BookingPanel` twice: the rail, which is in the document at every width, " +
      "and the sheet, which is inside a portal and is not in the document until the sticky bar's " +
      "trigger is tapped. Measured shut: 1 at 320, 768 and 1280. A 2 HERE — with the sheet never " +
      "opened — is the failure: it means the second placement stopped being a portal and became a " +
      "second always-mounted copy, which is the double-mount RESP-02's arrangement exists to avoid. " +
      "The open-sheet state is asserted by `e2e/mobile-booker-path.spec.ts`, not here.",
  },

  // ─── CALENDAR ──────────────────────────────────────────────────────────────────────────────────
  {
    name: "calendar · /listings/[id] · the exclusive (hour-grid) surface",
    family: "calendar",
    session: "anonymous",
    id: "availability-calendar",
    path: (r) => requirePath(r.listingPath, "listingPath"),
    tell: (page) => byId(page, "listing-key-facts"),
    tellWhy:
      "the key-facts strip again, for the reason the row above gives — and on this row it matters " +
      "more than on any other, because the calendar's own loading fallback is a DIFFERENT declared " +
      "id and counting that one would answer 'is it loading' instead of 'is there one calendar'.",
    why:
      "17-03 put this id on the RESOLVED container and deliberately not on the loading fallback, " +
      "which was the only hook this surface had before that plan. The two answer opposite questions " +
      "on a resolved page: a one-instance gate hung on the fallback reports a perfect zero against " +
      "a document carrying two calendars. Two calendars is also the worst of the duplicates in this " +
      "table — the second one fetches availability on its own schedule and writes selection into " +
      "the same provider, so a booker can be shown one window and charged for another. " +
      "⚠ THIS ROW IS SCOPED TO THE EXCLUSIVE SURFACE, and the seeded listing is what scopes it. " +
      "The drop-in fork renders no container at all — see the skipped row below.",
  },
  {
    // The other half of `availability-calendar.tsx`'s fork. This is a SKIP rather than a second
    // measurement because of a fact about the component, not about this harness.
    name: "calendar · /listings/[id] · the open-capacity (drop-in) surface",
    family: "calendar",
    session: "unreachable",
    id: null,
    path: null,
    skip:
      "`availability-calendar.tsx:551-582` forks on the PERSISTED occupancy mode (OPEN-02): an " +
      "`open_capacity` listing takes an early return that renders a FRAGMENT wrapping " +
      "`CollisionNotice` and `DatePassPicker`, and that fragment carries NO container id — the " +
      "declared `availability-calendar` id sits only on the exclusive surface's root at :619. So " +
      "the count on a drop-in listing is 0, and AC#12's 'exactly one in the document' cannot be " +
      "ASKED of it: a 0 there is indistinguishable from a calendar that failed to render. MEASURED " +
      "2026-08-29, and this is how the row was found — the calendar row above originally drove " +
      "whichever listing was first in the catalogue, and it went red once in three full runs, on " +
      "the run that happened to land on a drop-in listing. THE FIX IS NOT ONE ATTRIBUTE and is " +
      "therefore not taken here: the fragment is deliberate (its own comment records choosing it " +
      "over a wrapper div so the drop-in tree keeps its box exactly), so hanging the id on that " +
      "branch means introducing a wrapper element into a shipped surface — a `src/` change outside " +
      "this plan's declared files that also reverses a recorded decision. Recorded as a finding " +
      "for this phase's deferred items and for whichever plan owns the drop-in surface.",
    tell: (page) => byId(page, "listing-key-facts"),
    tellWhy: "unused on a skipped row; declared because the type requires every row to name one.",
    why: "unused on a skipped row.",
  },

  // ─── WIZARD ────────────────────────────────────────────────────────────────────────────────────
  {
    name: "wizard · /host/listings/[id]/edit",
    family: "wizard",
    session: "host",
    id: "wizard-step-rail",
    path: (r) => `/host/listings/${requirePath(r.hostListingId, "hostListingId")}/edit`,
    tell: (page) => page.getByRole("button", { name: "Get started" }),
    tellWhy:
      "the advance action's name ON STEP 1 ONLY — `wizard.tsx:823` reads " +
      "`step === 0 ? \"Get started\" : \"Save and continue\"`. That ternary is what makes it a STEP " +
      "indicator rather than a caption, so it proves both that the wizard resolved and that it is " +
      "on the step this row measures. An `h1` would have been the trap: every step renders one, and " +
      "so does every other host route and this route's own plate.",
    why:
      "The step rail is the subtree every accent-count, tab-order and hit-area assertion about the " +
      "wizard is scoped inside (14-09 / D-148). Two rails would make every one of those assertions " +
      "ambiguous under Playwright's strict mode, and the nine-step form would offer two answers to " +
      "'where am I'.",
  },
  {
    // ⚠ THE SANCTIONED EXCEPTION, PROVED RATHER THAN EXEMPTED — and this row is the reason the whole
    // file exists in Playwright rather than as a second source scan.
    //
    // `usePublishChecklistPlacement()` is the ONE `matchMedia` call site in `src/`. It is compliant
    // for the reason RESP-04 exists: it does not render two trees and hide one, it CHOOSES one node,
    // so the one-instance count holds at all three widths. `17-UI-SPEC § RESP-04` says the audit's
    // job is to assert that property ON this component, not to remove the hook — and a source scan
    // structurally cannot, because "chooses one" and "draws two" are the same JSX until it runs.
    //
    // This row is that assertion. The companion `placement` probe in the same describe proves the
    // hook is genuinely CHOOSING — a different node at 320 than at 1280 — which is what makes a
    // steady count of 1 evidence rather than a coincidence.
    name: "wizard · the publish checklist (the sanctioned matchMedia exception)",
    family: "wizard",
    session: "host",
    id: "publish-checklist",
    path: (r) => `/host/listings/${requirePath(r.hostListingId, "hostListingId")}/edit`,
    tell: (page) => byId(page, "wizard-step-rail"),
    tellWhy:
      "the step rail, which only the resolved wizard renders — the row above counts it, so neither " +
      "row is its own tell.",
    why:
      "This is the one-instance property `17-UI-SPEC § RESP-04` asks to be asserted ON the " +
      "sanctioned exception. A 2 here would mean the hook stopped choosing and started drawing both " +
      "placements — the `hidden`/`block` variant pair its own docblock (`publish-checklist.tsx:118` " +
      "-124) records rejecting for exactly this reason: a variant pair reads as two checklists at " +
      "all three widths and the one-instance rule becomes unassertable. ⚠ DO NOT REMOVE THE HOOK TO " +
      "MAKE THIS PASS. A SECOND component reaching for it is a finding to escalate, not a precedent.",
  },

  // ─── CHECKOUT ──────────────────────────────────────────────────────────────────────────────────
  {
    name: "checkout · /listings/[id]/book (a live hold)",
    family: "checkout",
    session: "checkout",
    id: "checkout-sticky-bar",
    path: (r) => requirePath(r.checkoutPath, "checkoutPath"),
    tell: (page) => byId(page, "price-total"),
    tellWhy:
      "the resolved breakdown's own hook (GATE-05), which exists nowhere in " +
      "`book/loading.tsx`. `booker-seed.ts:416-432` records why nothing weaker works: the plate " +
      "renders the SAME `<h1>Confirm and pay</h1>` as the resolved page, so an `h1` check is " +
      "satisfied by the skeleton and every assertion after it runs against a body that never arrived.",
    why:
      "The sticky bar is what keeps the price on screen while the booker reads the terms (12-11 / " +
      "BFLOW-06). Two bars is two totals — the money surface is the one place in this app where a " +
      "duplicated DOM node is a duplicated FACT, and where the second one can be the stale one.",
  },

  // ─── LIST SURFACES ─────────────────────────────────────────────────────────────────────────────
  // The family is `row-card · result-card · agenda-rows · host-agenda`, and the assertion is over the
  // CONTAINER whose count is 1 — never over the cards, whose count is legitimately N.
  //   • `result-card`'s container is `search-results-region`, counted by the search row above.
  //   • `agenda-rows` and `host-agenda` are containers in their own right and are counted below.
  //   • `row-card`'s container does not exist. That is the skipped row, with its reason.
  {
    name: "list surfaces · the host agenda section",
    family: "list surfaces",
    session: "host",
    id: "host-agenda",
    path: () => "/host",
    tell: (page) => byId(page, "agenda-rows"),
    tellWhy:
      "the agenda's BUSY state — the row list only renders when the host has a session today, which " +
      "this fixture seeds. So it proves the surface AND the state: the quiet and empty states render " +
      "`agenda-next` / `agenda-none` instead, and `/host`'s own plate carries none of the three.",
    why:
      "One container that is present in all three booking states (14-05 / HFLOW-03), which is what " +
      "makes it the countable one. Two would mean the dashboard forked its agenda by viewport — the " +
      "defect this family is named after.",
  },
  {
    name: "list surfaces · the agenda row list",
    family: "list surfaces",
    session: "host",
    id: "agenda-rows",
    path: () => "/host",
    tell: (page) => byId(page, "host-agenda"),
    tellWhy:
      "the agenda section, which is present in all three states and so proves the route resolved " +
      "without proving the state — the row above pins the state, and between them neither row is " +
      "its own tell.",
    why:
      "The list itself, as distinct from the section around it. This is the row that would catch a " +
      "`hidden md:block` table beside a `md:hidden` card stack arriving on the dashboard: both trees " +
      "are in the document at every width, so the count goes to 2 and stays there.",
  },
  {
    name: "list surfaces · the request/booking mobile card stack",
    family: "list surfaces",
    session: "unreachable",
    id: null,
    path: null,
    skip:
      "`/host/requests` and `/host/bookings` render TWO trees for one list — a `hidden md:block` " +
      "table beside a `md:hidden` card stack — which is sanctioned technique 4 (one source of truth, " +
      "two placements, the inactive one removed from the accessibility tree with `hidden`). Both are " +
      "therefore in the document at every width by design, so `row-card` legitimately counts N and " +
      "the one-instance claim belongs to the CONTAINER around the stack. No such container id is " +
      "declared: `src/lib/design/selector-contract.ts` has no row for it, and adding one is a `src/` " +
      "change plus a compile-enforced contract row — which is 17-03's half of RESP-04 and not this " +
      "plan's (its `files_modified` is this spec alone). Measured 2026-08-29 so the gap is sized " +
      "rather than asserted: `/host/requests` reads `row-card` = 1 at 320, 768 and 1280 against a " +
      "one-request fixture, i.e. the cards are N and the table's rows are not `row-card`s at all. " +
      "Recorded as a finding for this phase's deferred items.",
    tell: (page) => byId(page, "row-card"),
    tellWhy: "unused on a skipped row; declared because the type requires every row to name one.",
    why: "unused on a skipped row.",
  },
];

/** A route a row needs that its describe did not provide. Fails by name rather than navigating to it. */
function requirePath(value: string | null, field: keyof Routes): string {
  if (value === null) {
    throw new Error(
      `this row asked for \`${field}\`, and the describe running it did not provide one. That is a ` +
        "wiring error in this file rather than a product defect: the row's `session` and the block " +
        "that runs it have gone out of step, so it is being driven by a fixture that cannot reach " +
        "its route.",
    );
  }
  return value;
}

test.describe("RESP-04 AC#12 — the surface table is complete", () => {
  // ⚠ THIS IS THE AC#2 DISCIPLINE APPLIED TO THIS TABLE (threat T-17-45), and it is the assertion
  // that makes "zero silent absences" mechanical. A row deleted, renamed or moved into a describe
  // nobody runs is invisible to every other test in this file: the run still reports green, having
  // measured one surface fewer. These two clauses fail by name instead.
  test("every named family is measured or explicitly skipped, and every row has a runner", () => {
    const covered = new Set(SURFACE_ROWS.map((r) => r.family));
    const missing = FAMILIES.filter((f) => !covered.has(f));
    expect(
      missing,
      `${missing.length} of RESP-04's six named surface families has no row in this table: ` +
        `${missing.join(", ") || "(none)"}. The families are declared closed in \`FAMILIES\` from ` +
        "`17-UI-SPEC § RESP-04`; a family with no row is a surface this audit silently stopped " +
        "measuring, which is the exact failure the mandatory `skip` on an unreachable row exists to " +
        "prevent. Add the row, or add it with a `skip` that says why it cannot be reached.",
    ).toEqual([]);

    const orphans = SURFACE_ROWS.filter((r) => !SESSIONS.includes(r.session));
    expect(
      orphans.map((r) => r.name),
      "these rows declare a session no describe in this file runs, so they are in the table and " +
        "never executed — the same silent absence as a missing row, wearing a row's clothes.",
    ).toEqual([]);

    for (const row of SURFACE_ROWS) {
      if (row.path !== null) continue;
      expect(
        (row.skip ?? "").length,
        `"${row.name}" has a null path and a skip reason of ${(row.skip ?? "").length} characters. ` +
          "An unreachable row states WHY, at length, in the run's own output — a one-line skip is a " +
          "silent absence with a label on it.",
      ).toBeGreaterThan(80);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE ROWS THIS HARNESS CANNOT REACH — NAMED, NEVER SILENT
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `overflow-320.spec.ts:765-771`'s idiom, and the reason is worth restating because it is the whole
// of threat T-17-45: a bare `test.skip()` prints a grey line and says nothing, which is
// indistinguishable in a run's output from a surface nobody thought to measure. Throwing the reason
// out of the skipped body puts it in the run's own output, so the gap travels with the result rather
// than living only in this file.
for (const row of SURFACE_ROWS.filter((r) => r.path === null)) {
  test.skip(`RESP-04 AC#12 — ${row.name} (unreachable)`, () => {
    throw new Error(`unreachable: ${row.skip}`);
  });
}

/**
 * One row, at all three widths, from three fresh documents.
 *
 * The shape is `host-headings.spec.ts:370-395`'s: one test per row, the width loop inside it, so a
 * failure names the row AND the width rather than reporting three-quarters of a table as red.
 */
async function measureRow(page: Page, row: SurfaceRow, routes: Routes): Promise<void> {
  const resolve = row.path;
  const id = row.id;
  expect(
    resolve !== null && id !== null,
    `${row.name}: a measured row needs both a path and an id; this one reached the loop with a null.`,
  ).toBe(true);

  for (const width of WIDTHS) {
    const where = `${row.name} · ${width}px`;
    await openAt(page, (resolve as (r: Routes) => string)(routes), width);
    if (row.settle) await row.settle(page, where);
    await expectReachable(page, row.tell(page), row.tellWhy, where);
    await expectOneInDocument(page, id as SelectorId, where, row.why);
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AC#12 · THE ANONYMOUS SURFACES — search, listing detail, the booking panel, the calendar
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The public listing every anonymous row drives — SEEDED, and `exclusive` BY NAME.
 *
 * ⚠ THIS REPLACES A DISCOVERED PATH, AND THE REPLACEMENT IS A MEASUREMENT RATHER THAN A PREFERENCE.
 * The first version of this block used `overflow-320.spec.ts:239-247`'s `firstListingPath` — "the
 * first listing in the catalogue", discovered from the running app — which is the right resolver for
 * an overflow sweep, because nothing it measures depends on what KIND of listing it lands on. It is
 * the wrong resolver here. `availability-calendar.tsx:551` forks on the persisted occupancy mode, so
 * the calendar row's subject is a different component depending on which listing happens to be first:
 * the exclusive surface carries the declared container and the drop-in surface carries none. Observed
 * across three full runs on an unchanged tree: two green, one red, on the run that landed on a
 * drop-in listing. A gate that flakes is a gate people learn to ignore, and this one would have been
 * ignored while telling the truth.
 *
 * So the fixture NAMES the mode. `seedBookableListing`'s `occupancy` option already existed for
 * exactly this reason and defaults to `exclusive`; it is passed explicitly because the default is the
 * load-bearing part here and a default that matters should be visible at the call site. The drop-in
 * surface is not thereby dropped — it is the second named skip in `SURFACE_ROWS`, with its measured
 * reason.
 *
 * It also removes this block's dependency on a non-empty local catalogue: the seeded listing is
 * published, so `/` has at least one result card and the search row's tell is about the search
 * surface rather than about the state of the developer's database.
 */
function listingPathOf(seed: SeededListing): string {
  return `/listings/${seed.listingId}`;
}

test.describe("RESP-04 AC#12 — one instance in the document · anonymous surfaces", () => {
  // SERIAL for the shared `beforeAll` fixture's reason (`overflow-320.spec.ts:2143-2146`): a
  // `beforeAll` runs once per WORKER, so a parallel block would seed one listing per worker and tear
  // another worker's rows out from under it. 180s: five rows × three fresh navigations each, against
  // a dev server that compiles on demand.
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  let seed: SeededListing;

  test.beforeAll(async () => {
    seed = await seedBookableListing({ occupancy: "exclusive", titlePrefix: "E2E One-Tree" });
  });

  test.afterAll(async () => {
    if (seed !== undefined) await seed.teardown();
  });

  for (const row of SURFACE_ROWS.filter((r) => r.session === "anonymous")) {
    test(row.name, async ({ page }) => {
      await seedTheme(page.context(), THEME);
      await measureRow(page, row, {
        listingPath: listingPathOf(seed),
        hostListingId: null,
        checkoutPath: null,
      });
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AC#12 · THE HOST SURFACES — the wizard, the sanctioned exception, and the agenda
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/** The Playwright process doesn't load .env; fall back to the deterministic dev URL (booker-seed.ts). */
const HOST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const HOST_VENUE_TZ = "Asia/Manila";

type HostFixture = {
  readonly listingId: string;
  readonly hostEmail: string;
  readonly bookerId: string;
  readonly sql: ReturnType<typeof postgres>;
  readonly cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
};

/**
 * One published listing owned by a UI-signed-up host, with today's session on it.
 *
 * `overflow-320.spec.ts:1732`'s `seedHostSurfaces`, REPLICATED rather than imported — that function
 * is module-local to a spec file, and `keyboard-composites.spec.ts:1230-1240` records the same
 * replication for the same reason. Trimmed to what this file needs, with the omissions deliberate.
 *
 * WHAT IS KEPT, AND WHY EACH PART IS LOAD-BEARING HERE:
 *   • THE UI SIGN-UP. A seeded session would skip `canHost`, which every `/host` route redirects on.
 *   • THE ACTIVATED PAYOUT WALLET — the `payouts_enabled` gate that makes a listing bookable.
 *   • EXACTLY ONE PHOTO. Under three, so the publish checklist's `3+ photos` row stays undone and the
 *     checklist renders its full shape; at least one, so the uploader is past its zero-photo branch.
 *   • ONE CONFIRMED BOOKING TODAY, which is what puts the agenda in its BUSY state — the only state
 *     that renders `agenda-rows`, and therefore the only state in which that row can be counted.
 *
 * ⚠ THE BOOKING IS POSITIONED BY VENUE-LOCAL DAY OFFSET FROM `now()`, AND THAT IS NOT THIS REPO'S
 * DATE-DEPENDENT TIME BOMB. Two pixel assertions have shipped here seeded from `now()` and both were
 * defects, so the distinction is stated rather than assumed: those measured a STRING or a BOX whose
 * value moved with the clock. Nothing in this file reads a date, a label or a geometry — the only
 * measurement is a COUNT of containers, which is invariant under every value the clock can take. And
 * "today" is not a convenience here: the agenda's busy state is BY DEFINITION the state with a
 * session today, so a fixed date would seed the wrong state on every day but one.
 */
async function seedHostSurfaces(page: Page): Promise<Omit<HostFixture, "cookies">> {
  const hostEmail = `e2e.onetree.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Onetree");
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

  const listingId = `e2e_onetree_listing_${runId}`;
  const bookerId = `e2e_onetree_booker_${runId}`;

  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${host.id}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${bookerId}, ${"E2E One-Tree Booker"}, ${`${bookerId}@example.com`}, ${true},
      ${"Bernardita"}, ${false}, ${true}, now(), now()
    )
  `;
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, status, cancellation_policy, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${host.id}, ${`One-Tree Memorial Multi-Sport Court ${runId.slice(0, 6)}`},
      ${"A covered court with two hoops, a scoreboard and a water station."},
      ${"multi_sport_court"}::space_type,
      ${"7 Real Street"}, ${"Makati"}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${10}, ${1}, ${HOST_VENUE_TZ},
      ${47333}, ${288888}, ${25000}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      ${"standard"}::cancellation_policy, now(), now(), now()
    )
  `;
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position, created_at)
    VALUES (
      ${`e2e_onetree_photo_${randomUUID()}`}, ${listingId},
      ${`fitout/listings/${listingId}/cover`}, ${"/vrt/photo-0.svg"}, ${0}, now()
    )
  `;
  // Today's session, venue-local — the agenda's BUSY state. See this function's header for why the
  // clock is safe on this fixture and load-bearing on this row.
  await sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
      currency, open_capacity, created_at
    ) VALUES (
      ${`e2e_onetree_booking_${randomUUID()}`}, ${listingId}, ${1}, ${bookerId},
      (date_trunc('day', now() AT TIME ZONE ${HOST_VENUE_TZ}) + make_interval(hours => ${8})) AT TIME ZONE ${HOST_VENUE_TZ},
      (date_trunc('day', now() AT TIME ZONE ${HOST_VENUE_TZ}) + make_interval(hours => ${10})) AT TIME ZONE ${HOST_VENUE_TZ},
      ${"confirmed"}::booking_status, ${"request"}::booking_mode, ${"standard"}::cancellation_policy,
      ${100_000}, ${5_000}, ${105_000}, ${"php"}, ${false}, now()
    )
  `;

  return { listingId, hostEmail, bookerId, sql };
}

/**
 * The publish checklist's collapsed disclosure trigger — the probe that turns a steady count of 1
 * into evidence.
 *
 * `publish-checklist.tsx:317` renders it for the `collapsible` placement and `:342` renders the
 * `panel` placement with no trigger at all, so the trigger's presence IS the placement. The boundary
 * is `PANEL_MEDIA_QUERY` = `(min-width: 64rem)` = 1024px, which puts 320 and 768 on the collapsible
 * and 1280 on the panel.
 */
const CHECKLIST_TRIGGER = / ready to publish$/;
const PANEL_BREAKPOINT_PX = 1024;

test.describe("RESP-04 AC#12 — one instance in the document · host surfaces", () => {
  // SERIAL, and 300s: the whole block shares ONE seeded host built in `beforeAll`, which runs once
  // per WORKER — a parallel block would sign one host up per worker and tear another's rows out from
  // under it (`overflow-320.spec.ts:2143-2146`'s measurement). The edit route is the heaviest in the
  // app and has been observed missing its tell inside 20s on the run that compiled it.
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  let fixture: HostFixture;

  test.beforeAll(async ({ browser }) => {
    // The signup happens in its own context, ONCE, and its cookies are what every case reuses:
    // `host-dashboard.spec.ts:142-155` records that a login per case drives
    // `POST /api/auth/sign-in/email` past `src/lib/auth.ts:167`'s five-per-sixty-seconds limiter,
    // and the refusal reads exactly like a product bug on the page under test.
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    const seeded = await seedHostSurfaces(page);
    const cookies = await context.cookies();
    await context.close();
    fixture = { ...seeded, cookies };
  });

  test.afterAll(async () => {
    if (fixture === undefined) return;
    // ORDER IS THE FK'S (`booker-seed.ts`'s header): `booking.booker_id` is ON DELETE RESTRICT, so
    // the notifications and bookings go first, then the booker, then the host — whose deletion
    // cascades to the listing and its photo. `sql.end()` is unconditionally last.
    await fixture.sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${fixture.listingId})`;
    await fixture.sql`DELETE FROM booking WHERE listing_id = ${fixture.listingId}`;
    await fixture.sql`DELETE FROM "user" WHERE id = ${fixture.bookerId}`;
    await fixture.sql`DELETE FROM "user" WHERE email = ${fixture.hostEmail}`;
    await fixture.sql.end();
  });

  for (const row of SURFACE_ROWS.filter((r) => r.session === "host")) {
    test(row.name, async ({ page }) => {
      await page.context().addCookies([...fixture.cookies]);
      await seedTheme(page.context(), THEME);
      await measureRow(page, row, {
        listingPath: null,
        hostListingId: fixture.listingId,
        checkoutPath: null,
      });
    });
  }

  // ── THE SANCTIONED EXCEPTION, PROVED AS A POSITIVE FACT ─────────────────────────────────────────
  //
  // The row above proves the checklist counts ONE at all three widths. On its own that is consistent
  // with a hook that is broken in the safe direction — one that returns `collapsible` always, never
  // reads the viewport, and would count 1 while delivering the wrong placement to every desktop host.
  // The audit's claim is stronger than that: `usePublishChecklistPlacement` CHOOSES, and the count
  // holds BECAUSE it chooses rather than despite it.
  //
  // So this probe reads the placement out of the rendered tree at each width and asserts it changed.
  // It asserts a CONTROL's presence, not a class string: `publish-checklist.tsx` renders the
  // disclosure trigger for `collapsible` and no trigger at all for `panel`, so the trigger IS the
  // placement, observed from outside the component.
  //
  // ⚠ WATCHED RED, 29 August 2026 — `PANEL_BREAKPOINT_PX` was temporarily set to 4000 so that every
  // width expected the collapsible. Observed at 1280, verbatim:
  //
  //   Error: the publish checklist at 1280px offers 0 disclosure trigger(s) matching
  //   `/ ready to publish$/`, and this width expects 1. …
  //   Expected: 1
  //   Received: 0
  //
  // which is the probe doing its job: it fails when the placement is not the one the width implies,
  // and it is therefore capable of failing when the hook stops choosing. Reverted.
  test("the sanctioned matchMedia exception CHOOSES one node — the placement changes, the count does not", async ({
    page,
  }) => {
    await page.context().addCookies([...fixture.cookies]);
    await seedTheme(page.context(), THEME);

    const observed: string[] = [];
    for (const width of WIDTHS) {
      const where = `publish checklist placement · ${width}px`;
      await openAt(page, `/host/listings/${fixture.listingId}/edit`, width);
      await expectReachable(
        page,
        byId(page, "wizard-step-rail"),
        "the step rail, which only the resolved wizard renders.",
        where,
      );

      const trigger = page.getByRole("button", { name: CHECKLIST_TRIGGER });
      const expected = width < PANEL_BREAKPOINT_PX ? 1 : 0;
      const message =
        `the publish checklist at ${width}px offers ` +
        `${await trigger.count()} disclosure trigger(s) matching \`${String(CHECKLIST_TRIGGER)}\`, ` +
        `and this width expects ${expected}. \`usePublishChecklistPlacement\` reads ` +
        `\`(min-width: 64rem)\` = ${PANEL_BREAKPOINT_PX}px and returns \`collapsible\` below it (a ` +
        "closed disclosure, which is what the trigger belongs to) and `panel` at or above it (the " +
        "rows rendered directly, with no trigger). A mismatch means the hook stopped choosing — and " +
        "if the one-instance row above is still green, it is green for the WRONG reason: a hook " +
        "wedged on one placement counts 1 at every width while delivering the wrong shape.\n" +
        "⚠ THE FIX IS NOT TO DELETE THE HOOK. `17-UI-SPEC § RESP-04` sanctions this one call site " +
        "precisely because it chooses one node instead of drawing two; a SECOND component reaching " +
        "for it is a finding to escalate, not a precedent.";

      if (expected === 1) {
        await expect(trigger, message).toHaveCount(1);
      } else {
        await expect(trigger, message).toHaveCount(0);
      }
      observed.push(`${width}:${expected === 1 ? "collapsible" : "panel"}`);
    }

    expect(
      new Set(observed.map((o) => o.split(":")[1])).size,
      `the checklist rendered the same placement at all three widths (${observed.join(" ")}). The ` +
        "one-instance count is then a fact about a hook that is not choosing, which is the weaker " +
        "claim — and the only reading under which a steady 1 is a coincidence rather than evidence.",
    ).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AC#12 · CHECKOUT — a LIVE hold, minted once
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ ONE MINT, THREE NAVIGATIONS, AND THE ASYMMETRY WITH EVERY OTHER BLOCK IS DELIBERATE. A hold is a
// real row with a real 15-minute TTL (`HOLD_TTL_MINUTES`, `src/lib/availability/units.ts:172`) minted
// by driving the whole booker path — search, listing, window, `Book this space`. Minting one per
// width would place three holds on one listing for one measurement and spend most of the case's
// budget on the fixture. The property this file cares about is preserved: each width still gets its
// own FRESH navigation to the checkout URL, so each is a cold server render at that viewport, which
// is where a double-mount would appear.

test.describe("RESP-04 AC#12 — one instance in the document · checkout", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  const row = SURFACE_ROWS.find((r) => r.session === "checkout");

  test("the checkout row is in the table", () => {
    expect(
      row?.name,
      "no row in `SURFACE_ROWS` declares the `checkout` session, so this whole block would run zero " +
        "cases and report green. Checkout is one of RESP-04's six named surfaces.",
    ).toBeTruthy();
  });

  test(row?.name ?? "checkout", async ({ page }) => {
    const seed = await seedBookableListing({ titlePrefix: "E2E One-Tree" });
    try {
      await seedTheme(page.context(), THEME);
      await page.setViewportSize({ width: WIDTHS[2], height: HEIGHT });

      await signUpBooker(page, seed);
      const hold = await placeHold(page, seed, "9:00 AM", "10:00 AM");
      const checkoutPath = `/listings/${seed.listingId}/book?hold=${hold}`;

      await measureRow(page, row as SurfaceRow, {
        listingPath: null,
        hostListingId: null,
        checkoutPath,
      });
    } finally {
      await seed.teardown();
    }
  });
});
