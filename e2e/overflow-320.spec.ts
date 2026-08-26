import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";
import postgres from "postgres";

import {
  openBookingSheet,
  seedBookableListing,
  signUpBooker,
  type SeededListing,
} from "./helpers/booker-seed";
import { expectRing, readFocus, type FocusReading } from "./helpers/focus";
import { FLOOR_PX, expectNoOverflow, expectNoOverflowWithin } from "./helpers/overflow";
import { seedPaymentStates, type SeededPaymentStates } from "./helpers/seed-payment-states";
import { BASE_URL as BASE, installTruncator } from "./helpers/served-document";
import { seedTheme } from "./helpers/theme";
// The support constant is imported rather than re-declared, for `site.ts`'s own stated reason: it is
// pure and isomorphic (no `server-only` guard) precisely so a gate can read it. The D-83 case below
// branches on it, so a spec carrying its own copy would go green the day the real one changed.
import { SUPPORT_EMAIL } from "../src/lib/site";
// Same rule, one phase later (plan 16-15). `src/lib/avatar.ts` is directive-free precisely so a gate
// can read it, and the crop dialog's title is the only string that distinguishes the overlay this
// file's new row measures from the two other `responsive-dialog` overlays in the app. A re-typed copy
// of it would go green the day the sentence changed, which is the whole failure the `tell` mechanism
// exists to catch.
import { AVATAR_CROP_TITLE } from "../src/lib/avatar";
// The same rule again, for the cover preview's heading — the string `openWizardPhotosStep` waits on to
// prove the walk arrived at the photos step. `src/lib/listing/cover-frames.ts` is directive-free for
// this purpose, and a re-typed copy would report ARRIVAL the day the heading changed while the walk
// was in fact still standing on the wizard's first step (D10).
import { COVER_PREVIEW_TITLE } from "../src/lib/listing/cover-frames";

// RESP-01 / AC#29 — nothing overflows the viewport horizontally at 320px, on seventeen named routes
// plus three route STATES, in both themes. Measured in real pixels in real Chromium.
//
// ONE OF THOSE STATES IS `/listings/[id]` WITH THE BOOKING SHEET OPEN (plan 12-10), and it is a state
// rather than a route on purpose: RESP-02's sheet is a portal holding a second month grid inside a
// full-bleed overlay, so at this width it is the widest subtree on the route — and it does not exist in
// the document at all until a booker taps the sticky bar. See that row for the whole argument.
//
// THE OTHER TWO ARRIVED WITH PLAN 15-10, alongside the five account routes AUTHUI-03 gate 1 names —
// `/login`, `/signup`, `/forgot-password`, `/reset-password` and `/profile`. Both extra states are
// FORM-REPLACING branches: `/forgot-password` after its submit (the form gone, the enumeration-safe
// sentence in its place) and `/reset-password` with no token in the URL (the form gone, a notice and
// one link out). Each is a genuinely different document from the row above it, and neither can be
// reached by the plain row — the first needs an interaction, the second needs the query string
// omitted. See the Phase-15 block in `ROUTES`.
//
// ⚠ TWO PRE-EXISTING ROW COMMENTS BELOW STILL SAY "twelve-route table", and they are LEFT
// BYTE-IDENTICAL on purpose: plan 15-10's own acceptance criteria forbid editing any pre-existing
// row, so the phrase is left standing and flagged HERE as history rather than silently corrected in
// a place the criteria protect. The current figure is in the `ROUTES` docblock and nowhere else.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THIS HARNESS IS NET-NEW, AND THAT IS A CORRECTION TO THE PHASE'S OWN INPUTS
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `11-RESEARCH` marks RESP-01's harness as "⚠ harness exists (10-16)". MEASURED, before a line of
// this file was written: `e2e/` contained ZERO `setViewportSize` calls and ZERO
// `documentElement.scrollWidth` assertions. Nothing existed to extend. What DID transfer is the
// MEASUREMENT IDIOM — `scroll-area-overflow.spec.ts:143-172`'s typed object returned from one
// `page.evaluate` and asserted in Node against a named tolerance constant — and this file is built on
// it.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY A NUMBER IS NOT ENOUGH, AND WHAT `offenders` IS FOR
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `scrollWidth > clientWidth` tells you the page overflows. It does not tell you WHAT overflows, and
// on a page with 800 elements that is the difference between a fix and an afternoon. So the same
// evaluate also returns the offending elements, named by tag, declared test id and class prefix.
//
// THE FILTER IS THE LOAD-BEARING PART OF THAT LIST, and it was MEASURED rather than reasoned about.
// The first version reported every element whose right edge exceeded the viewport, and on
// `/listings/[id]` it named three: two `img.leaflet-tile` at right=502 and an `svg` at right=333.
// All three are inside a map pane with `overflow: hidden`, so none of them can widen the document —
// the page measured 320 = 320 with three "offenders" listed. A diagnostic that cries wolf on a green
// page is a diagnostic nobody reads by the third time. `collectOffenders` therefore walks each
// candidate's ancestors and drops it if anything between it and the document element clips.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AN INHERITED TRAP — STALE CSS FROM A REUSED DEV SERVER (`reduced-motion.spec.ts` trap 4).
// `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, and the dev server is what
// serves the compiled stylesheet. A server left running across a `git checkout` of a layout or of
// `src/components/patterns/site-footer.tsx` can keep serving CSS that no longer matches the tree.
// IF THIS FILE FAILS ON A CLEAN `git status`, KILL THE SERVER ON :3000 AND RE-RUN BEFORE TOUCHING
// THE COMPONENT.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// WATCHED RED — 17 August 2026, run and reverted. Command:
// `npx playwright test e2e/overflow-320.spec.ts --project=chromium`
//
//   MUTATION: `min-w-[400px]` added to `site-footer.tsx`'s inner container (the `mx-auto grid …`
//   div), i.e. one block in the shell declaring itself wider than the 320px floor.
//   **12 failed / 4 passed / 8 skipped**, and BOTH numbers are the finding. Twelve is every route
//   that mounts the footer × both themes; the four that pass are the two routes `site-footer.tsx`
//   names as its deliberate exceptions — the checkout composition and the root error boundary, which
//   render no footer and therefore cannot be affected by a defect in one. A mutation whose blast
//   radius matches the component's own declared mount list is a mutation the harness understood.
//
//     Error: / · court · 320px: the document scrolls horizontally — scrollWidth 400 against a
//     clientWidth of 320. Offending elements (right edge past the viewport):
//       div.mx-auto grid w-full min-w-[400px] max-w-6xl gap- right=400
//       div.space-y-3 right=384
//       p.text-sm text-muted-foreground right=384
//       div.space-y-3 right=384
//       h2.text-sm font-medium text-foreground right=384
//       ul.space-y-2 right=384
//       li. right=384
//       …
//     expect(received).toBeLessThanOrEqual(expected)
//     Expected: <= 320.5
//     Received: 400
//
//   The FIRST line of that list is the mutated element itself, printed with the offending class
//   still in it. Everything after it is a descendant carried along, which is what the list should
//   look like: the outermost offender is the cause and the rest are consequences. Reverted;
//   16 passed, 8 skipped.
//
//   THE RED RUN ALSO FOUND A DEFECT IN THIS FILE, which is the second reason to run one. Under the
//   load of twelve failing tests each writing a trace, `/listings/[id]` twice missed its `h1` inside
//   `expectReachable`'s default 5s — on a page that renders that heading server-side. The dev server
//   compiles routes on demand, so the guard was racing a compile. It now allows 15s; a reachability
//   guard that flakes is one people learn to ignore.
//
//   SECOND WATCHED RED — 18 August 2026, plan 12-09, run and reverted. Command:
//   `npx playwright test e2e/overflow-320.spec.ts --project=chromium --grep "listings"`
//
//   MUTATION: `min-w-0` on the calendar day button restored to the vendored `min-w-(--cell-size)` in
//   `availability-calendar.tsx` — i.e. the 44px hit area BFLOW-05 asks for, floored on the wrong axis.
//   Seven of those is 308px inside a 270px content box. **2 failed / 0 passed**, and the offender list
//   is the whole reason this file collects one:
//
//     Error: /listings/[id] · court · 320px: the document scrolls horizontally — scrollWidth 342
//     against a clientWidth of 320. Offending elements (right edge past the viewport):
//       button.group/button inline-flex shrink-0 items-center j right=333
//       table.w-full border-collapse rdp-month_grid right=333
//       td.group/day relative aspect-square h-full w-full r right=333
//       button.group/button shrink-0 items-center justify-cente right=333
//       …
//     Expected: <= 320.5
//     Received:    342
//
//   It names the day buttons and the month grid by class, in both themes, and 342 − 320 = 22 is
//   exactly 308 + 18 (the calendar's own chrome) − 304. A number and a list; the number alone would
//   have sent a reader looking at the footer again. Reverted; 16 passed, 8 skipped.
//
//   VACUITY PROBE, same session: `/terms`' row repointed at `/a-route-that-renders-nothing-11-21`,
//   which 404s into the root not-found. The overflow assertion PASSED (that page does not overflow
//   either) and `expectReachable` failed instead, naming the selector it could not find:
//
//     Error: /terms · court · 320px: the route rendered no
//     `[data-testid="legal-placeholder-notice"]`, so it is not the surface this row names.
//
//   That is the whole reason every row carries a `tell`: without one, this file would have measured
//   a 404 twice and reported `/terms` and `/privacy` as covered.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file:
//   • FOUR OF THE SEVENTEEN ROUTES ARE SKIPPED, EACH WITH A NAMED REASON (see `ROUTES`). They are four
//     of the five error boundaries, and they are unreachable because plan 11-18 added exactly ONE
//     dev throw affordance and `src/app/dev/**` sits under no route group, so it can only ever reach
//     the ROOT boundary. Skipping is deliberate and loud; it is never silent.
//   • ONE VIEWPORT AND ONE HEIGHT. 320 × 800. It does not sweep the ladder, and it says nothing
//     about vertical overflow or about what a 320px page looks like — only that it does not scroll
//     sideways.
//   • THIS SPEC IS NOT IN CI (D-24). It runs locally and before `/gsd:verify-work`.
//   • The listing and checkout rows need a non-empty local catalogue. They DISCOVER the id from the
//     running app rather than naming a seeded row, and they fail with a named reason when the
//     catalogue is empty — but they cannot run against a database with nothing in it.

// THE FLOOR, THE TOLERANCE, THE VACUITY BAR AND THE SCAN ITSELF ALL LIVE IN `helpers/overflow.ts`
// SINCE PLAN 12-11, and the move is a measurement-sharing decision rather than tidying. Plan 12-11 put
// a fixed confirm bar and a full-width disclosure trigger on `/listings/[id]/book`, neither of which is
// in the SERVED document this table's checkout row measures — see that row. Reaching the resolved
// checkout needs a minted hold, and adding that seed HERE would have made the cheapest gate in the
// suite the fifth DB-seeding spec sharing one Postgres, which `deferred-items.md` warns against by
// name. So `e2e/mobile-booker-path.spec.ts` — which already mints a hold — takes the resolved checkout
// to 320px and calls the SAME function. Two fixtures, one definition of the assertion.
//
// Nothing about this file's 26 cases changed in that move: the constants, the scan and the three
// expectations are byte-identical, and their reasons travelled with them. (26 was the figure AT THAT
// MOVE and is left as the historical claim it is; plan 15-10 took the table to 40. The current count
// lives in the `ROUTES` docblock and is derived from the array there.)

const THEMES = ["court", "grove"] as const;

/**
 * The first listing in the catalogue, DISCOVERED from the running app and memoised per worker.
 *
 * Discovered rather than hardcoded: a spec that names a seeded row stops running the first time the
 * seed changes (this plan's threat model, and the measured reason `scroll-area-overflow.spec.ts`
 * drives `/dev/theme` instead of the real notification panel). Memoised because two rows need it and
 * each was navigating to `/` and waiting for the grid — on a dev server compiling routes on demand
 * that cost four of the sixteen tests their whole 30s budget, all four failing with
 * `locator.getAttribute: Test timeout` on a tree with nothing wrong with it. Playwright runs a
 * worker's tests serially, so one module-scope value per worker is safe.
 */
let cachedListingPath: string | null | undefined;

async function firstListingPath(page: Page): Promise<string | null> {
  if (cachedListingPath !== undefined) return cachedListingPath;
  await page.goto(`${BASE}/`);
  cachedListingPath = await page
    .getByTestId("result-card")
    .first()
    .getAttribute("href", { timeout: 20_000 });
  return cachedListingPath;
}

/**
 * `/profile`, reached by signing a booker up THROUGH THE UI (plan 15-10).
 *
 * A resolver rather than a literal path, because `/profile` is the one route in this table behind a
 * session: `(app)/profile/page.tsx` reads the session itself and `redirect("/login")`s without one.
 * The `RouteRow` type already supports a resolver (`firstListingPath` is one), so this is the shape
 * the table was built for rather than a new mechanism.
 *
 * ⚠ IT IS NOT MEMOISED, AND THAT IS THE OPPOSITE DECISION FROM `firstListingPath` ABOVE, FOR A
 * STRUCTURAL REASON. What that one caches is a STRING discovered from the app, which is the same for
 * every context. What this one produces is a SESSION COOKIE, and Playwright's `page` fixture is
 * per-test — a fresh context and a fresh cookie jar each time — so a cached "/profile" handed to a
 * second test would navigate an anonymous browser to a route that redirects, and every assertion in
 * this file is true of the page it would land on. Two themes therefore cost two signups, which is the
 * honest price of the row.
 *
 * NO SEED AND NO DATABASE FIXTURE. This drives the shipped signup form exactly as
 * `e2e/login-persistence.spec.ts:31-42` and `helpers/booker-seed.ts:327-338` do, so the table stays
 * seed-free in the sense its own header means: no `postgres()` client, no seeded rows, nothing that
 * stops running the first time a fixture changes.
 *
 * ⚠ THE CLOCK IS IN THE EMAIL AND NOWHERE ELSE. `Date.now()` here buys uniqueness against the email
 * unique constraint across repeated runs; it never reaches a measured string. The one clock-derived
 * sentence on the rendered surface is `PageHeader`'s `Member since …` lede, which lives in a wrapping
 * `<p className="max-w-prose">` with no fixed width — a paragraph that wraps cannot widen the
 * document, which is the only thing this row asserts. Stated because this repository has shipped two
 * time-bomb pixel assertions seeded from `now()`, and the reason this is not a third is a property of
 * the assertion rather than good luck.
 */
async function signUpAndReachProfile(page: Page): Promise<string | null> {
  const email = `e2e.overflow.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  // The intent defaults to "book"; clicked explicitly to be deterministic, which is the same reason
  // `login-persistence.spec.ts` gives.
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Overflow");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("averylongpassword");
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
  return "/profile";
}

/**
 * The committed fixture the crop-dialog row stages (plan 16-15).
 *
 * `e2e/fixtures/` is generator-produced and gated byte-for-byte by `tests/design/image-fixtures.test
 * .ts`, so these bytes are as fixed as a string literal — which is what a geometry gate needs and
 * what a file picked off the machine would not be.
 *
 * ⚠ `square-400.png` RATHER THAN ONE OF THE OTHER TEN, AND THE REASON IS THAT IT RENDERS THE MOST.
 * `avatarMaxZoom(400) === 1`, so this source lands on IC-05's 400x400 row: the zoom control is
 * DISABLED (rule F8 disables it, never hides it) *and* the soft-source note renders beside it. That
 * is one more block inside the sheet than any source with real headroom produces — a strictly larger
 * subtree to measure at the floor, which is the only axis this row is judged on. It is also the
 * smallest of the eleven at 1208 bytes, so the extra coverage costs nothing in decode time.
 */
const AVATAR_CROP_FIXTURE = path.join(__dirname, "fixtures", "square-400.png");

/**
 * Open the avatar crop dialog on `/profile`, for the row below (plan 16-15).
 *
 * The session is already established — `signUpAndReachProfile` above is this row's `path`, and the
 * driver navigates before `open` runs — so all this does is hand a file to the shipped picker and
 * wait for the overlay it produces.
 *
 * ⚠ THE INPUT IS ADDRESSED BY TYPE, NOT BY A TEST ID, and Playwright's strict mode is what makes that
 * safe: `avatar-field.tsx` records that this is the only `<input type="file">` in `src/`, so a second
 * one appearing anywhere on this route fails here rather than silently staging the wrong control.
 *
 * ⚠ AND THE WAIT IS ON THE DIALOG'S ACCESSIBLE NAME rather than on the file input's `change`. Guards
 * 1-4 in `avatar-field.tsx` refuse four classes of file BEFORE any dialog mounts — a refusal renders
 * an alert on the page and no overlay at all — so a wait on anything weaker than the named dialog
 * would hand a refused file to the measurement and report the page behind it as covered.
 */
async function openAvatarCropDialog(page: Page): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles(AVATAR_CROP_FIXTURE);
  await expect(
    page.getByRole("dialog", { name: AVATAR_CROP_TITLE }),
    "the crop dialog did not open after a valid fixture was staged. Either the pre-dialog guards " +
      "refused it (check for an alert on `/profile`) or the decode never resolved — either way the " +
      "row below would be measuring the profile page, which the row above it already measures.",
  ).toBeVisible({ timeout: 30_000 });
}

type RouteRow = {
  /** How the route is named in failures and skip messages. */
  readonly name: string;
  /**
   * `null` for a route this harness cannot reach, in which case `skip` says why, IN THE MESSAGE.
   * A resolver rather than a literal where the path depends on the catalogue.
   */
  readonly path: ((page: Page) => Promise<string | null>) | string | null;
  /** Why it is unreachable. Required when `path` is `null` — a silent skip is not a skip. */
  readonly skip?: string;
  /**
   * The declared selector that proves the route actually rendered ITS OWN surface.
   *
   * `expectReachable`'s subject (`scroll-area-overflow.spec.ts:215-223`). Every assertion below is
   * satisfied by a blank page, so each row has to name something only that route renders.
   */
  readonly tell: string;
  /** Serve the pre-hydration document instead of the hydrated one — see the checkout row's reason. */
  readonly served?: boolean;
  /**
   * An interaction to perform AFTER `goto` and BEFORE the measurement, for a row whose subject only
   * exists once a booker has done something.
   *
   * Added by plan 12-10 for exactly one row and deliberately not generalised further: RESP-02's booking
   * sheet is a portal, so at 320px the widest thing on the whole route is a subtree that is not in the
   * document until the sticky bar is tapped. A row that measured the closed page would be measuring the
   * page this table already covers, twice.
   */
  readonly open?: (page: Page) => Promise<void>;
  /**
   * A SECOND, SCOPED measurement, for a row whose subject is an open overlay (plan 16-15).
   *
   * ⚠ NOT A CONVENIENCE, AND NOT A DUPLICATE OF THE DOCUMENT SCAN. A Radix modal locks body scroll —
   * measured, `<body>` computes `overflow: hidden` the instant one opens — which retires all three of
   * `expectNoOverflow`'s clauses at once: the document can no longer widen, and `isClipped` walks
   * through `<body>` and reports everything on the page as clipped. A 500px-wide div appended into
   * the open crop dialog produced `scrollWidth 320` and `offenders: []`. So a row that only opens an
   * overlay and calls the document scan CANNOT FAIL, which is the measurement-side twin of the
   * vacuity the `tell` above exists to catch. `helpers/overflow.ts`'s second header has the numbers.
   *
   * Set to the selector of the overlay's own box. `expectNoOverflowWithin` then asks whether anything
   * inside it reaches past ITS right edge, which is the question that is still answerable.
   */
  readonly scope?: string;
};

/**
 * SEVENTEEN ROUTES AND FOUR ROUTE STATES — 21 rows, 42 cases at two themes each.
 *
 * RE-MEASURED AGAINST THE ARRAY BELOW BY PLAN 15-10, which added five routes and two states. The
 * previous figure ("the twelve routes `11-UI-SPEC § Responsive Baseline` names, in its order — eight
 * reachable, four not") was written when this table was the Phase-11 baseline and nothing but the
 * two Phase-12 states had joined it; it is replaced rather than annotated, because a stale measured
 * count in a gate's own header is the defect class Phase 15 exists to repair.
 *
 * RE-MEASURED AGAIN BY PLAN 16-15, which adds ONE row and no route: `/profile` with the avatar crop
 * dialog OPEN. The ROUTE count therefore does not move — 17 is still 17, because the new row is a
 * STATE of a route this table already covers — and only the state count, the row count and the case
 * count do. Stated that way round on purpose: the arithmetic a reader is most likely to get wrong
 * here is incrementing the route count for a row that adds no route, and the header is the one place
 * that mistake would be believed.
 *
 * THE SPLIT, counted from the rows below:
 *
 *   • 13 of the 17 routes are REACHABLE — the 8 `11-UI-SPEC` names plus the 5 account routes
 *     AUTHUI-03 gate 1 adds (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/profile`).
 *   • 4 are NOT, and each says why in the string a skipped run prints. All four are error boundaries;
 *     that asymmetry is the finding rather than a shortfall — see the note on the first skipped row.
 *   • 4 STATES ride alongside their routes: the booking sheet open (12-10), forgot-password after
 *     submit and reset-password with no token (both 15-10), and the avatar crop dialog open (16-15).
 *   • 8 of the 42 cases are the four unreachable rows × two themes.
 *
 * THE ORDER IS BY OWNING PLAN, not by URL, for `selector-contract.ts`'s stated reason: the reading
 * question this table gets asked is "has the phase that owns this surface run yet", not "where is /x
 * alphabetically".
 */
const ROUTES: readonly RouteRow[] = [
  {
    name: "/",
    path: "/",
    tell: '[data-testid="site-footer"]',
  },
  {
    name: "/listings/[id]",
    path: firstListingPath,
    // THE `tell` IS THE CALENDAR, NOT THE `h1` (plan 12-09 · T-12-09-OVERFLOW). BFLOW-05 puts a
    // SEVEN-COLUMN grid of 44px-tall day cells on this route, and the shipped vendored day button
    // floors its own width at `--cell-size`: seven of those is 308px against the 288px content box
    // this row measures, i.e. the one control on the whole twelve-route table that is structurally
    // able to break it. MEASURED while writing the override — with `w-[326px] max-w-full` and no
    // `min-w-0` on the button, this route reported `scrollWidth 342` against `clientWidth 320`.
    //
    // An `h1` proves the listing page rendered; it does NOT prove the calendar did, and the calendar
    // is what this row is now covering. A calendar that failed to mount would leave the `h1` in place
    // and the assertions below green — the same "true of a blank page" hole every other row's `tell`
    // exists to close, arriving one level in.
    tell: '[data-slot="calendar"]',
  },
  {
    name: "/listings/[id] · sheet open",
    path: firstListingPath,
    // ⚠ THE SAME ROUTE, MEASURED IN A STATE THE ROW ABOVE STRUCTURALLY CANNOT REACH (plan 12-10).
    // RESP-02's booking sheet is a Radix portal: its contents do not exist in the document until the
    // sticky bar's `Check availability` is tapped, so the row above measures a page the sheet is not on.
    // And the sheet is where the 320px floor is HARDEST — it mounts a second month grid (seven cells,
    // the one control on this whole twelve-route table structurally able to break the floor, per the
    // row above), inside a full-bleed overlay whose own `p-4` leaves a 288px content box, with a
    // `sticky bottom-0` action bar pinned inside it. Every one of those is a fresh chance to overflow
    // and none of them was previously measured anywhere.
    //
    // THE `tell` IS THE SHEET'S OWN CALENDAR, addressed through the overlay hook rather than by
    // `[data-slot="calendar"]` alone — the closed page already renders one of those in the main column,
    // so the plainer selector would be satisfied by a tap that did nothing at all.
    //
    // ⚠ THE OPEN IS RETRIED, AND THE RETRY WAS EARNED IN THIS FILE. This row passed every isolated
    // invocation and failed the first FULL-SUITE run in both themes, with Playwright's call log
    // reporting the trigger `not stable` and then `detached from the DOM` — a server-rendered control
    // clicked while React was still finishing with the route, where the event is LOST rather than
    // queued. `openBookingSheet` carries the whole measurement; it is the same shape
    // `reduced-motion.spec.ts`'s `advanceMonth` needed for the month-nav click.
    open: (page) => openBookingSheet(page, "/listings/[id] · sheet open").then(() => undefined),
    tell: '[data-testid="responsive-dialog"] [data-slot="calendar"]',
  },
  {
    name: "/listings/[id]/book",
    path: async (page) => {
      const href = await firstListingPath(page);
      return href ? `${href}/book` : null;
    },
    // THE ONE ROW MEASURED PRE-HYDRATION, and the reason is a measurement. Without a minted hold the
    // checkout page calls `notFound()`, and after hydration the client replaces the whole tree with
    // the ROOT not-found — a different composition, which the row below already measures. Measured
    // both ways on 17 August 2026: served = 1 header, brand is a `<span>`, 0 footers; hydrated = 1
    // header, brand is an `<a>`, 3 header anchors, 1 footer. Minting a real hold needs a session, a
    // bookable listing and an open slot, and a gate with that seed dependency stops running the
    // first time the seed changes (this plan's threat model). The served document is
    // `listings/[id]/book/layout.tsx`'s own output, which is the composition AC#29 is about here.
    //
    // ⚠ WHAT THIS ROW DOES NOT COVER, STATED RATHER THAN LEFT TO BE DISCOVERED (plan 12-11). The served
    // document is the SHELL plus `book/loading.tsx`'s skeleton. It does not contain the fixed 64px
    // confirm bar, the price disclosure or the breakdown — all three of which 12-11 put on the resolved
    // body, and two of which are the kind of thing that overflows at this width (a full-bleed fixed bar
    // with a `whitespace-nowrap` amount beside a 44px action; a `-mx-4 w-full` trigger that deliberately
    // renders wider than its own content box). Those are measured at 320px in both themes by
    // `e2e/mobile-booker-path.spec.ts`, which already mints a real hold, through the SAME
    // `expectNoOverflow` this table calls. The seed stayed there rather than coming here for the reason
    // in the note above `ROUTES`.
    served: true,
    tell: '[data-testid="skeleton-panel"]',
  },
  {
    name: "/invite/[token]",
    // A DELIBERATELY UNMATCHED TOKEN, and it is not a shortcut. A live invite needs a seeded group
    // booking; this path renders `(public)/invite/[token]/not-found.tsx`, which plan 11-19 built to
    // be a BYTE-IDENTICAL inactive twin of the invite surface (T-11-ORACLE) — the same `InviteCard`
    // in the same public shell. For a horizontal-overflow measurement that is the same geometry, and
    // it needs no seed at all.
    path: "/invite/deadbeefdeadbeefdeadbeef",
    tell: "h1",
  },
  {
    name: "/terms",
    path: "/terms",
    tell: '[data-testid="legal-placeholder-notice"]',
  },
  {
    name: "/privacy",
    path: "/privacy",
    tell: '[data-testid="legal-placeholder-notice"]',
  },
  {
    name: "root not-found",
    path: "/a-route-that-does-not-exist-11-21",
    tell: '[data-testid="empty-state"]',
  },
  {
    name: "error boundary · src/app/error.tsx (root)",
    // Reached through plan 11-18's dev throw affordance, which 404s in production (T-11-THROWROUTE).
    // `dev/` sits under no route group, so the root boundary is the one it reaches — confirmed by
    // driving the route and reading the rendered copy, not inferred from the file tree.
    path: "/dev/throw",
    tell: '[data-testid="error-state"]',
  },

  // ─── PHASE 15 — THE FIVE ACCOUNT SURFACES AND THE TWO FORM-REPLACING BRANCHES (plan 15-10) ───────
  //
  // AUTHUI-03's first gate is `scrollWidth <= clientWidth` at 320px on all four auth routes in every
  // state, and until this block existed this table measured twelve routes, none of which was a form.
  //
  // THESE ARE THE CHEAPEST ROWS IN THE TABLE AND THAT IS WORTH SAYING OUT LOUD. Four of them are
  // literal paths on static routes: no seed, no catalogue discovery, no clock, no interception, no
  // determinism work of any kind. The two that are not — the post-submit branch and the signed-in
  // profile — each cost exactly one mechanism the table already had (`open` and a resolver `path`).
  //
  // ⚠ ON `tell` AND WHAT THESE FOUR CAN AND CANNOT PROVE, stated rather than left to be discovered.
  // Plan 15-07 put all four auth screens on ONE composition, so `[data-testid="panel-card"]` proves
  // "an auth screen rendered" and NOT "this particular auth screen rendered" — a `/signup` row would
  // stay green if it somehow served `/login`. That hole is closed by construction rather than by the
  // selector: all four are literal paths to routes that exist and that redirect nowhere, so the
  // failure the `tell` is really guarding (a 404, a blank page, a redirect) is covered — the root
  // not-found renders `empty-state` and no panel, and neither auth route redirects to the other. The
  // ONE row where the redirect is real is `/profile`, and its `tell` is narrowed accordingly; see it.
  {
    name: "/login",
    path: "/login",
    tell: '[data-testid="panel-card"]',
  },
  {
    name: "/signup",
    // THE TALLEST OF THE FOUR — the intent radio pair, four fields and two submits. Plan 15-07
    // measured its geometry at this width with a ruler rather than reasoning about it: the
    // `Book a space` / `Host a space` pair is 124px × 38px per button inside a 256px inner box, one
    // line at 14px/600, so `grid-cols-2` shipped and the spec's `sm:`-stacking contingency was never
    // needed. This row is what stops that measurement being a one-afternoon fact.
    //
    // ⚠ M2 — DOES THE TALL CARD CLIP AT 320×568 INSIDE THE LAYOUT'S `main`? MEASURED 24 Aug 2026, in
    // real Chromium at the iPhone-SE viewport, and the answer is NO. Stated as a measurement rather
    // than a prediction, with the numbers, because "it probably scrolls" is exactly the reasoning
    // that produced the clipping bugs this gate exists for:
    //
    //   card 544px tall, top 100 → bottom 644 · main 692px · document scrollHeight 1041 against a
    //   clientHeight of 568 · scrollWidth 320 = clientWidth 320
    //
    // So 76px of the card sits BELOW THE FOLD at rest, and the document scrolls to reveal it:
    // scrolling to the bottom lands at scrollY 473 and puts the card's bottom edge at y=171, well
    // inside the viewport. Below the fold is not clipped.
    //
    // THE ONE `overflow: hidden` ANCESTOR IS THE CARD'S OWN ROOT (`ui/card.tsx`'s `overflow-hidden`,
    // which is there to clip a first-child image to the radius), and it cuts nothing: its
    // clientHeight and scrollHeight are BOTH 544. The layout's `main` does not constrain it either —
    // 692 > 544. Walked ancestor by ancestor rather than inferred from the class list. The other
    // three auth cards at the same viewport: login 404px, forgot 268px, reset 268px, all with the
    // same single non-clipping hidden ancestor and all reporting 320 = 320.
    path: "/signup",
    tell: '[data-testid="panel-card"]',
  },
  {
    name: "/forgot-password",
    path: "/forgot-password",
    tell: '[data-testid="panel-card"]',
  },
  {
    name: "/forgot-password · post-submit",
    // ⚠ THE SAME ROUTE, IN A STATE THE ROW ABOVE STRUCTURALLY CANNOT REACH. The post-submit branch
    // REPLACES the form rather than sitting beside it: the fields, the one coral submit and the whole
    // `<Form>` subtree are gone, and what remains is the enumeration-safe sentence plus one
    // cross-link. That is a different document with a different widest element, and the row above
    // measures a page this branch is not on.
    //
    // THE `tell` IS THE BRANCH'S OWN ACCESSIBLE NAME, not the panel — the panel is present in BOTH
    // branches, so the plainer selector would be satisfied by a submit that did nothing at all.
    // `Reset request result` is the name plan 15-07 gave this region and plan 15-09 declared in
    // `live-regions.ts`, so the selector is a declared string rather than one invented here.
    path: "/forgot-password",
    open: async (page) => {
      // A FIXED literal address with no account behind it, and both halves are deliberate. Fixed,
      // because nothing here may be seeded from the clock. Account-less, because the branch is
      // reached IDENTICALLY either way — that uniformity is T-03-02's whole point — and an address
      // with no user attached means no email is even attempted, so this row cannot depend on the
      // dev environment's mail configuration.
      await page.getByLabel("Email").fill("overflow.320.no-account@example.com");
      await page.getByRole("button", { name: /send reset link/i }).click();
    },
    tell: '[aria-label="Reset request result"]',
  },
  {
    name: "/reset-password",
    // THE TOKEN IS IN THE URL BECAUSE THE PAGE BRANCHES ON ITS PRESENCE, and a fixed literal is a
    // deterministic fixture rather than a shortcut: the form does not validate the token client-side
    // beyond non-emptiness (the shared `resetSchema` requires a non-empty string and nothing more),
    // so any non-empty value renders the same form the real link renders. Nothing is submitted here,
    // so the token is never checked against the database and no seed is needed.
    path: "/reset-password?token=e2e-overflow-320-fixed-token",
    tell: '[data-testid="panel-card"]',
  },
  {
    name: "/reset-password · missing token",
    // THE SECOND FORM-REPLACING BRANCH, reached by OMITTING the query string rather than by an
    // interaction. This is the page a malformed or truncated reset link produces, and like the forgot
    // branch it replaces the form entirely: one destructive-ink sentence and one link out, zero
    // buttons and therefore zero coral (plan 15-07 verified both counts at 0 rather than assuming
    // them).
    //
    // THE `tell` IS THE ROUTE OUT, which only this branch renders — the token branch's only link is
    // `Back to log in`. Scoped through the panel so it cannot be satisfied by a link somewhere else
    // in the shell.
    path: "/reset-password",
    tell: '[data-testid="panel-card"] a[href="/forgot-password"]',
  },
  {
    name: "/profile",
    // THE ONE ROW BEHIND A SESSION, and the resolver drives the shipped signup form to get one — see
    // `signUpAndReachProfile` for why it is not memoised and why it needs no seed.
    //
    // ⚠ THE `tell` IS NARROWED, AND THIS IS THE ROW WHERE THAT MATTERS. `(app)/profile/page.tsx`
    // redirects an anonymous visitor to `/login`, and since plan 15-07 `/login` RENDERS
    // `[data-testid="panel-card"]` — so the plain hook would be satisfied by the exact failure the
    // `tell` mechanism exists to catch, and this row would have measured the login page twice and
    // reported `/profile` as covered. That is byte-for-byte the vacuity probe this file's own header
    // records for `/terms`, arriving on a new row a phase later. Narrowing it to the panel that
    // carries the PRIVATE group's sentence makes the selector true of `/profile` and of nothing else
    // in the app: the string is one of the two D-09/D-10 promises, pinned byte-for-byte by
    // `tests/design/profile-pass.test.tsx`, so the two gates move together or one of them goes red.
    path: signUpAndReachProfile,
    tell: '[data-testid="panel-card"]:has-text("Private account info")',
  },
  {
    name: "/profile · crop dialog open",
    // ⚠ THE SAME ROUTE, MEASURED IN A STATE THE ROW ABOVE STRUCTURALLY CANNOT REACH (plan 16-15) —
    // the second time this table has needed that sentence, and the `open` seam exists because of the
    // first. Its own docblock says it is for "a row whose subject only exists once a booker has done
    // something", which is precisely this: `ResponsiveDialog` is a Radix portal, so nothing the crop
    // flow renders is in the document until a file is staged.
    //
    // WHY THE FLOOR IS WORTH MEASURING HERE AT ALL, in the shape the sheet-open row argues its case:
    // at 320px this overlay is a BOTTOM SHEET, and inside it sits the one element on this whole table
    // that is sized by a `min()` of three different units — the crop stage, capped at
    // `min(320px, 100vw - 2rem, 40dvh)`. At this width the middle term wins and the stage is the full
    // 288px content box, i.e. the widest subtree in the document with nothing to spare. Beside it are
    // a slider whose track is the only horizontally-stretching control in the flow, and (with this
    // fixture) rule F8's disabled-with-its-reason note. None of that was previously measured anywhere.
    //
    // ⚠ THE `tell` NAMES THE DIALOG, AND ON THIS ROW THAT IS THE WHOLE POINT — the same argument the
    // row above makes about `/login`, arriving one layer in. `[data-testid="panel-card"]` is rendered
    // by the profile page BEHIND this overlay, so a row hooked on it would pass with the dialog shut,
    // report this state as covered, and measure the document the row above already measures, twice.
    // Scoping to the overlay hook AND the dialog's own accessible name is what makes the selector
    // true of this state and of nothing else in the app: `responsive-dialog` alone is also rendered
    // by the removal confirm and by the booking sheet, and the title is the string that separates
    // them. It is IMPORTED (`AVATAR_CROP_TITLE`) rather than typed, for the reason the import says.
    //
    // MEASURED, 26 August 2026, before this row was trusted — the vacuity probe this file's own
    // header demands, run in both directions with the `open` removed so the dialog stays shut:
    //   • `tell: '[data-testid="panel-card"]'`  → 2 passed. The bare hook reports a closed page as
    //     this state. That is the failure the narrowing prevents, observed rather than argued.
    //   • `tell` as it ships below                → 2 failed at `expectReachable`, "the route rendered
    //     no `[data-testid=\"responsive-dialog\"]:has-text(\"Position your photo\")`". The shipped
    //     selector cannot pass without the interaction.
    //
    // ⚠ AND THE SECOND PROBE FOUND SOMETHING THE FIRST DOES NOT COVER, WHICH IS WHY THIS ROW CARRIES
    // A `scope`. A correct `tell` proves the row is LOOKING at the overlay; it says nothing about
    // whether the MEASUREMENT can fail on it. Measured: with a modal open `<body>` computes
    // `overflow: hidden`, and a 500px-wide div appended straight into this dialog produced
    // `scrollWidth 320` and an EMPTY offender list — every clause of the document scan retired at
    // once. Scoped to the overlay's own box the same div reports `scrollWidth 532` against
    // `clientWidth 320` and fourteen named offenders. See `helpers/overflow.ts`'s second header for
    // all three measurements and `deferred-items.md` D9 for the pre-existing row this also affects.
    path: signUpAndReachProfile,
    open: openAvatarCropDialog,
    tell: `[data-testid="responsive-dialog"]:has-text("${AVATAR_CROP_TITLE}")`,
    scope: '[data-testid="responsive-dialog"]',
  },

  // ─── THE FOUR THIS HARNESS CANNOT REACH ──────────────────────────────────────────────────────────
  // Plan 11-21 says to drive the boundaries "through the same dev throw affordance plan 11-18 added
  // under `src/app/dev/**`, per group". MEASURED: 11-18 added exactly ONE such route, and `src/app/
  // dev/` sits under no route group, so it can only ever reach the ROOT boundary. Reaching the other
  // four would mean four NEW `page.tsx` files inside four route groups — which moves
  // `loading-coverage.test.ts`'s pinned counts, adds four routes to the production route table, and
  // is a source change no acceptance criterion in this plan asks for.
  //
  // WHAT COVERS THEM INSTEAD, stated so the gap is legible rather than merely declared: each of the
  // four renders `patterns/error-state.tsx` inside its group's shell, and both halves are measured
  // elsewhere at 320px — the shells by the reachable rows above (`/` is the public shell; the booker
  // and host shells are measured at 320px by `e2e/shell.spec.ts`'s AC#4 test), and the panel by
  // `/dev/theme` section 12, which renders `ErrorState` in both themes with and without a digest.
  // What is NOT covered is the composite, and that is the honest size of this hole.
  {
    name: "error boundary · src/app/(app)/error.tsx",
    path: null,
    skip: "no dev throw affordance exists inside the (app) route group — 11-18 shipped one route, at src/app/dev/throw, which reaches the ROOT boundary only. Reaching this one needs a new page.tsx inside (app), which moves loading-coverage.test.ts's pinned route counts and adds a route to the production table.",
    tell: '[data-testid="error-state"]',
  },
  {
    name: "error boundary · src/app/(host)/host/error.tsx",
    path: null,
    skip: "same as (app): no dev throw affordance inside the (host) route group, and this boundary additionally sits behind the canHost capability gate, so reaching it needs a seeded or signed-up host as well as a new route.",
    tell: '[data-testid="error-state"]',
  },
  {
    name: "error boundary · src/app/(auth)/error.tsx",
    path: null,
    skip: "same as (app): no dev throw affordance inside the (auth) route group. Every route under it is a form that renders successfully, so there is no input that makes it throw either.",
    tell: '[data-testid="error-state"]',
  },
  {
    name: "error boundary · src/app/(legal)/error.tsx",
    path: null,
    skip: "same as (app): no dev throw affordance inside the (legal) route group. /terms and /privacy are static prose with no data path that can fail, which is why they are the two routes in the app least able to reach their own boundary.",
    tell: '[data-testid="error-state"]',
  },
];

/**
 * TRAP 1: assert the route rendered ITS OWN surface before asserting anything about its width.
 *
 * "Nothing is wider than the viewport" is perfectly true of a blank page, of a 404 and of a redirect
 * to `/login`. Every row above therefore names a selector only that route produces.
 */
async function expectReachable(page: Page, row: RouteRow, where: string): Promise<void> {
  await expect(
    page.locator(row.tell),
    `${where}: the route rendered no \`${row.tell}\`, so it is not the surface this row names. ` +
      "Every assertion in this file passes against a page with nothing on it, which is why this " +
      "check runs first and is a failure rather than a skip.",
    // A LONGER TIMEOUT THAN THE DEFAULT 5s, and it is a measured allowance rather than a hedge. The
    // dev server compiles routes on demand: during the watched red below — twelve failing tests, each
    // writing a trace — `/listings/[id]` twice missed its `h1` inside 5s on a page that renders it
    // server-side. A reachability guard that flakes is a guard people start ignoring, which costs
    // more than the seconds.
  ).not.toHaveCount(0, { timeout: 15_000 });
}

test.describe(`AC#29 — nothing scrolls sideways at ${FLOOR_PX}px`, () => {
  // 60s rather than the default 30s. Two rows resolve their path from the running app and every row
  // waits on a route the dev server may still be compiling; the default budget was measured failing
  // four tests on a clean tree. See `firstListingPath` for the other half of that fix.
  test.describe.configure({ timeout: 60_000 });

  for (const row of ROUTES) {
    for (const theme of THEMES) {
      const title = `${row.name} · ${theme}`;

      if (row.path === null) {
        // NAMED, never silent. The reason travels into the run's own output.
        test.skip(title, () => {
          throw new Error(`unreachable: ${row.skip}`);
        });
        continue;
      }

      const resolvePath = row.path;

      test(title, async ({ page }) => {
        await seedTheme(page.context(), theme);
        await page.setViewportSize({ width: FLOOR_PX, height: 800 });

        const path = typeof resolvePath === "string" ? resolvePath : await resolvePath(page);
        expect(
          path,
          `${title}: this row resolves its path from the running app, and the app produced none. ` +
            "The local catalogue is empty — seed it (`npm run db:seed`) before reading this as an " +
            "overflow failure.",
        ).toBeTruthy();

        // THE INTERCEPTOR IS INSTALLED ONLY FOR THE ROW THAT ASKS FOR IT, and that is a measurement
        // rather than tidiness. Installed unconditionally (even in "serve the whole document" mode),
        // the root error boundary never rendered: `/dev/throw` throws on the SERVER, so `error.tsx`
        // is delivered through the flight channel and mounted during hydration, and re-serving the
        // body through `route.fulfill` loses whatever Next needs for that to happen. Measured, 17
        // August 2026: `[data-testid="error-state"]` resolved to 0 elements over a 5s poll with the
        // interceptor installed, and renders immediately without it.
        if (row.served) {
          const truncator = installTruncator(page);
          await truncator.ready;
          truncator.set(true);
        }

        await page.goto(`${BASE}${path}`);
        await page.evaluate(() => document.fonts.ready);

        // The one row whose subject is behind an interaction. It runs BEFORE `expectReachable`, because
        // that guard's `tell` is the thing the interaction produces.
        if (row.open) {
          await row.open(page);
          await page.evaluate(() => document.fonts.ready);
        }

        const where = `${title} · ${FLOOR_PX}px`;
        await expectReachable(page, row, where);

        await expectNoOverflow(page, where);

        // The overlay rows' second measurement. Runs AFTER the document scan rather than instead of
        // it: the document clause is still the right question for the page BEHIND the overlay, and
        // dropping it would trade one blind spot for another.
        if (row.scope) await expectNoOverflowWithin(page, row.scope, where);
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 13 — THE CONFIRMATION, PAYMENT-STATE, RECEIPT AND GROUP SURFACES (plan 13-15)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ROADMAP § Cross-Cutting Constraints makes GATE-RESP and GATE-A11Y exit criteria on every
// surface-touching phase. 13-UI-SPEC states them as AC#30 (`scrollWidth <= clientWidth` at 320px, both
// themes, on every surface this phase touches; every control clears the target-size bar; focus visible
// through the one DS-05 recipe) and AC#22 (`money-statement` fully inside the initial viewport at
// 320x568 and 1280x800, both themes, on the payment states).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY THIS IS A SECOND DESCRIBE IN THIS FILE RATHER THAN A FOURTEENTH ROW IN THE TABLE ABOVE
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// The table above is deliberately SEED-FREE — it discovers a listing id from the running catalogue and
// every other path is static, which is what lets 26 cases run with no database fixture.
// `helpers/overflow.ts`'s header records the decision that follows from that: plan 12-11 needed the
// RESOLVED checkout at 320px and did NOT add a seeded row here, because `deferred-items.md` warns by
// name against a fifth DB-seeding spec sharing one Postgres with a `postgres({max:1})` client apiece.
//
// Every Phase-13 surface IS a seeded booking — there is no catalogue to discover one from, and four of
// them are payment states that exist only as particular column combinations. So the seed arrives, but as
// ONE fixture for the whole block rather than one per row: a single listing, a single booker, one call
// to `seedPaymentStates`, one group. That is one more Postgres client than this file had, not eleven,
// and the 26 cases above are untouched — their ids, their table and their three expectations are
// byte-identical, which `npx playwright test --list` is the check for.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SESSION IS ESTABLISHED ONCE, AND THAT IS A MEASURED COST RATHER THAN A STYLE PREFERENCE
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Playwright's `page` fixture is per-TEST — a fresh context, a fresh cookie jar — so the shipped pattern
// (`receipt-parity.spec.ts:104-118`, `shell.spec.ts:733-742`) logs the booker in again in every case. At
// this block's case count that is a sign-in per case against a dev server compiling routes on demand.
// Instead the booker signs up ONCE in `beforeAll`, in its own context, and that context's `storageState`
// cookies are installed on each test's context. Same session, same cookie, one signup.
//
// ⚠ IF EVERY CASE BELOW FAILS AT ITS `tell` AND THE BOOKER IS ON `/login`, THAT IS THE FIRST THING TO
// CHECK: an unauthenticated `(app)` route redirects, and a redirect renders a perfectly good page with
// none of these hooks on it.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THREE OF THE SPEC'S SURFACES ARE NOT REACHABLE, AND THE REASON IS STRUCTURAL RATHER THAN SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// MEASURED 21 August 2026 by seeding all six `seedPaymentStates` shapes and requesting every URL:
//
//   • THE NOT-COMPLETED STATE (D-70) NEVER RENDERS FROM A SEED. `page.tsx`'s pending branch reaches it
//     only when `readPaymentState(status, session) === "not-completed"`, and that pair requires the D-84
//     probe to answer `active`. `probeCheckoutSession` returns null for a session PayMongo does not know
//     — which every `cs_e2e_…` fixture id is — and the fallback direction is DELIBERATE and argued in
//     that file: a probe that learns nothing lands on the redirect, never on the new state, because
//     *"showing 'you have not been charged' while a payment is quietly settling is a false money
//     statement"*. The seeded row redirects to `/listings/{id}/book?hold=…`.
//   • THE TWO NAMED REVERSED BRANCHES ARE THE SAME STORY FROM THE OTHER END. `auto` and `manual` are
//     chosen by `session === null ? "indeterminate" : isApiRefundable(rail) ? "auto" : "manual"`, so both
//     presuppose a session the provider confirmed. A seeded row reaches the THIRD branch — D-96's
//     `indeterminate`, added by plan 13-10 AFTER 13-UI-SPEC's tables were written — which is what a
//     booker sees in every environment with no live PayMongo session, including CI.
//
// Reaching any of the three needs a REAL PayMongo checkout session, and `receipt-parity.spec.ts`'s header
// records why no spec here may mint one: GATE-05 runs in a job that must never hold a live key (D-35).
// So the three are SKIPPED WITH THEIR REASON IN THE MESSAGE, never silently, and the reversed row that IS
// reachable is measured under the branch name it actually renders.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — stated so the next reader under-trusts this block
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//   • THE TARGET-SIZE BAR IS WCAG 2.5.8 AA (24px), NOT THE APP'S 44px `size="touch"`. See
//     `TARGET_FLOOR_PX` for the measured reason a blanket 44 would be red on correct code.
//   • THE TARGET-SIZE SCAN DOES NOT SEE THE APP SHELL, and the shell has a real 16x16 control in it
//     below `sm:`. Measured, argued and deferred — `collectControls`'s docstring carries the whole
//     entry and `deferred-items.md` carries the row.
//   • FOCUS IS CHECKED ON TWO STOPS, not on every control: the first tab stop (which is shell chrome on
//     every route, so it is really one assertion made many times) and the first stop INSIDE the
//     surface's own content, which is the one that says something per-row.
//   • The above-the-fold claim is `y + height <= viewport.height` with `scrollY === 0`. It says nothing
//     about whether the sentence is legible at that size.
//   • Like the rest of this file, none of it runs in CI (D-24).

/**
 * ⚠ THE FLOOR'S HEIGHT IS 568, NOT THIS FILE'S 800. AC#22 names 320x568 — the iPhone SE viewport and the
 * shortest screen the product supports. The block above measures at 800 because horizontal overflow does
 * not depend on height; the above-the-fold claim depends on nothing else.
 */
const SHORT_VIEWPORT = { width: FLOOR_PX, height: 568 } as const;
const DESKTOP_VIEWPORT = { width: 1280, height: 800 } as const;

/**
 * How far AHEAD of the runner's own clock the two ticking Phase-13 surfaces are frozen — and this
 * used to be a DATE LITERAL, which is the finding rather than the fix.
 *
 * `page.clock.pauseAt` fast-forwards, so it can only ever move time FORWARD. The literal here read
 * `2026-08-21T09:00:00Z`, which was two days in the future when plan 13-15 wrote it and is in the past
 * on every run after 21 August 2026. MEASURED 23 August 2026, running this case ALONE (plan 14-16):
 *
 *   Error: clock.pauseAt: Error: Cannot fast-forward to the past
 *
 * — with nothing wrong with the surface. It is the same shelf-life trade `visual-baselines.ts`'s NOT
 * COVERED section records for the Phase-12 fixture dates, arriving in a spec instead of a baseline,
 * and it fails LOUDLY, which is why it was worth taking there and is worth removing here.
 *
 * WHAT THE PIN IS ACTUALLY FOR, and why a relative instant serves it exactly as well: the two rows
 * marked `ticks` render a 2.5s `router.refresh()` poller (D-71) and the confirmation moment's decay
 * (D-60), and a sweep that measured either mid-frame is a flake. The claim is that time STOPS, not
 * that it stops on a particular date — and the fixture's own rows are `now()`-relative anyway, so the
 * literal never anchored the DATA. A one-second lead is enough for `pauseAt` to have somewhere to
 * fast-forward to and small enough that the moment is still fresh, which is the state `?paid=1` is
 * about.
 */
const CLOCK_PAUSE_LEAD_MS = 1_000;

/**
 * The target-size floor, and it is 24 rather than 44 BECAUSE 44 WOULD BE RED ON CORRECT CODE.
 *
 * `e2e/calendar-hit-area.spec.ts:153-156` already carries both numbers and the distinction between them:
 * 44px is this app's declared `size="touch"` (D-22) and the WCAG 2.5.5 figure, while **24px is the WCAG
 * 2.5.8 AA bar** — a conformance requirement rather than a house style. The app ships deliberate sub-44
 * controls on these very surfaces (`<Button>`'s default is `h-9`, i.e. 36px; `size="sm"` chrome is
 * smaller still), so a gate asserting 44 on every control would report a dozen shipped, reviewed,
 * deliberate boxes as defects on its first run. A gate with a high false-positive rate on a clean tree is
 * a gate somebody deletes — `price-surface.test.ts:60` records the same reasoning about a scan with a
 * 100% false-positive rate.
 *
 * The 44px claim is still made, where it is actually made: on the `size="touch"` controls, by
 * `calendar-hit-area.spec.ts` and by the components' own tests.
 */
const TARGET_FLOOR_PX = 24;

type Control = { readonly label: string; readonly w: number; readonly h: number };

/**
 * Every interactive control laid out on the page, with its box.
 *
 * WCAG 2.5.8's OWN EXCEPTION IS IMPLEMENTED RATHER THAN ASSUMED: a target laid out *in a sentence* is
 * exempt, and the test is the element's computed `display` being `inline` — which is the spec's own
 * criterion. Without it this gate reports every inline link in the trust block and the refund copy, which
 * is exactly the "cries wolf on a green page" failure `collectOffenders` above was rewritten to avoid.
 *
 * `sr-only` controls are excluded for a different reason and it is not the same one: they are 1x1 by
 * construction (`clip-path` plus `w-px h-px`) and are not pointer targets at all — the skip link is the
 * example — so measuring them would be measuring a thing no finger can miss.
 *
 * ⚠ THE SHELL CHROME IS EXCLUDED, AND IT IS EXCLUDED BECAUSE IT FAILS — which is the opposite of the
 * reason an exclusion is usually written, so it is stated rather than implied. MEASURED on this block's
 * second run, 21 August 2026: `site-chrome.tsx`'s `ProfileLink` renders as a bare `size-4` icon link
 * below `sm:` (the label is `hidden sm:inline` to fit the signed-in cluster into 226px), so at the 320px
 * floor it is a **16x16** pointer target — 8px under the AA bar, on the control that reaches a user's own
 * account, on every signed-in route in the app.
 *
 * That is a real finding and it is NOT this plan's to fix: `site-chrome.tsx` is the Phase-11 app shell,
 * it is on no Phase-13 surface list, and widening it changes the header on every route in the product
 * while re-opening the responsive budget its own docstring records. Silently letting it fail here would
 * have made twenty-two Phase-13 cases red for one Phase-11 element; silently dropping the assertion would
 * have hidden it. So the scan is scoped to the surface's OWN content, the finding is written up in
 * `deferred-items.md` with this plan named as the finder, and this comment is the pointer.
 *
 * ⚠ A SECOND EXCLUSION ARRIVED WITH THE PHASE-14 BLOCK, AND IT IS THE `sr-only` ONE UNDER A DIFFERENT
 * SPELLING (plan 14-16). Radix's `Select` renders a NATIVE `<select>` beside its trigger — its
 * `SelectBubbleInput` — carrying `aria-hidden={true}`, `tabIndex={-1}` and the library's
 * visually-hidden inline styles, so that a form submit carries the value. MEASURED on
 * `/host/listings/[id]/edit` at the floor, on this block's first run: `select[?] 1x1`.
 *
 * It is excluded on the SAME grounds the `sr-only` clause states — "1x1 by construction and not a
 * pointer target at all" — and the condition is written as the CONJUNCTION rather than either half,
 * which is what keeps it from swallowing a real control: an element removed from the accessibility
 * tree AND removed from the tab order is reachable by no user, with a pointer or otherwise. Either
 * half alone would be too wide (a visible `aria-hidden` decoration is still clickable; a `tabindex=-1`
 * control is still a pointer target), and that is exactly why both are required. The `.sr-only` clause
 * is kept beside it rather than folded in: it catches the app's OWN spelling, which carries neither
 * attribute.
 */
async function collectControls(page: Page): Promise<Control[]> {
  return page.evaluate(() => {
    const SEL =
      'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], ' +
      '[role="link"], [role="switch"], [role="checkbox"], [role="tab"]';
    const out: { label: string; w: number; h: number }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(SEL))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.display === "inline") continue;
      if (el.closest(".sr-only") !== null) continue;
      // Out of the accessibility tree AND out of the tab order — see the docstring's second
      // exclusion. Both halves are required; either alone would exclude a real control.
      if (el.closest('[aria-hidden="true"]') !== null && el.tabIndex < 0) continue;
      // The app shell, excluded with a measurement and a reason — see the docstring above.
      if (
        el.closest('[data-testid="site-header"]') !== null ||
        el.closest('[data-testid="site-footer"]') !== null
      ) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const name =
        el.getAttribute("aria-label") ??
        (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
      out.push({
        label: `${el.tagName.toLowerCase()}[${name || el.getAttribute("id") || "?"}]`,
        w: Math.round(rect.width * 10) / 10,
        h: Math.round(rect.height * 10) / 10,
      });
    }
    return out;
  });
}

/** GATE-A11Y's target-size half. The vacuity guard is first, for `expectNoOverflow`'s reason. */
async function expectTargets(page: Page, where: string): Promise<void> {
  const controls = await collectControls(page);
  expect(
    controls.length,
    `${where}: the target-size scan found ZERO interactive controls INSIDE the surface. The shell's ` +
      "header and footer are excluded by design (see `collectControls`), so this counts only the row's " +
      "own content — and every Phase-13 surface ships at least one action. An empty list is a page that " +
      "did not render or a selector that stopped matching, never a clean result.",
  ).toBeGreaterThan(0);

  const undersized = controls
    .filter((c) => Math.min(c.w, c.h) < TARGET_FLOOR_PX)
    .map((c) => `  ${c.label} ${c.w}x${c.h}`);
  expect(
    undersized,
    `${where}: ${undersized.length} control(s) are smaller than the ${TARGET_FLOOR_PX}px WCAG 2.5.8 AA ` +
      `target-size bar on their smaller axis:\n${undersized.join("\n")}\n` +
      "Inline targets (a link inside a sentence) are exempt by the success criterion itself and are " +
      "already filtered out, so anything listed here is a block-level control that is genuinely too " +
      "small to hit. The app's own bar for a primary action is higher still — `size=\"touch\"`, 44px.",
  ).toEqual([]);
}

// `FocusReading` and `readFocus` MOVED to the shared focus helper under `e2e/helpers/` (plan 15-12),
// unchanged, because `e2e/auth-keyboard.spec.ts` needs the same reading and two copies of a focus
// criterion drift apart silently. Imported at the top of this file — the module path is named
// descriptively here rather than quoted, following `booking-row.tsx:112`, because plan 15-12's
// acceptance scan counts that string in this file and expects to find exactly the import.
// `expectVisibleFocus` below stayed put; that helper's own header says why.

/**
 * GATE-A11Y's focus half, and it is a RENDERED check rather than "focus moved".
 *
 * DS-05 ships exactly one recipe — `focus-visible:ring-2 focus-visible:ring-ring
 * focus-visible:ring-offset-2 focus-visible:ring-offset-background` (`tests/design/focus-recipe.test.ts`
 * pins its spelling across the tree) — and Tailwind draws a `ring-*` as a **box-shadow**, not as an
 * outline. So "the ring is visible" is: a non-`none` box-shadow, or a real outline with a width. Either
 * satisfies the criterion; NEITHER is satisfied by focus merely having moved, which is the weaker
 * assertion this function exists instead of.
 *
 * The keyboard is what makes it a `:focus-visible` match. A programmatic `.focus()` does not qualify in
 * Chromium, so a version of this that called `.focus()` would report every control as ringless and would
 * be red on a correct tree.
 *
 * TWO STOPS, and the second is the one that says anything per-row: the first tab stop is shell chrome on
 * every route in the app, so asserting only that would be one assertion repeated. The loop walks forward
 * until focus leaves the header and asserts the ring there too.
 */
async function expectVisibleFocus(page: Page, where: string): Promise<void> {
  await page.keyboard.press("Tab");
  const first = await readFocus(page);
  expect(
    first,
    `${where}: one Tab from a freshly loaded document moved focus nowhere. Either the page has no ` +
      "focusable control at all, or something is swallowing the key — both are GATE-A11Y failures.",
  ).not.toBeNull();
  expectRing(first as FocusReading, `${where} (first tab stop)`);

  // …then walk to the first stop that is NOT shell chrome. A bounded loop: an unbounded one on a page
  // with a focus trap never returns, and a hang is a worse failure report than an assertion.
  let inSurface: FocusReading | null = null;
  for (let i = 0; i < 40; i += 1) {
    const reading = await readFocus(page);
    if (reading !== null && !reading.inHeader) {
      inSurface = reading;
      break;
    }
    await page.keyboard.press("Tab");
  }
  expect(
    inSurface,
    `${where}: forty Tab presses never left the site header, so this row's own controls were never ` +
      "reached and the ring assertion below would only ever have measured the shell.",
  ).not.toBeNull();
  expectRing(inSurface as FocusReading, `${where} (first in-surface control)`);
}

// `expectRing` MOVED to the same shared focus helper (plan 15-12), unchanged. The paragraph above
// `expectVisibleFocus` still explains its criterion; the function it explains now lives next door.

/**
 * AC#22 / STATE-06 — the money statement is fully inside the INITIAL viewport, with nothing scrolled.
 *
 * `scrollY === 0` is asserted rather than assumed: `boundingBox()` is viewport-relative, so a page that
 * had been scrolled would report a box that fits while the booker had to scroll to see it, which is
 * precisely the claim being denied.
 */
async function expectMoneyStatementAboveFold(page: Page, where: string): Promise<void> {
  // ⚠ `visible: true` IS A CORRECTION TO A MEASUREMENT INSTRUMENT, NOT A RELAXED ASSERTION, AND THE
  // MEASUREMENT IS RECORDED BECAUSE IT LOOKS EXACTLY LIKE THE DEFECT AC#22 FORBIDS.
  //
  // The first draft counted every element carrying the hook and demanded exactly one, which is AC#22's
  // own wording. On the pending-settlement surface it reported TWO and went red. Probed 21 August 2026
  // by loading that surface twice in one run, once with `page.clock` installed and once without:
  //
  //   clock=false  count=1   288x100 @ y=184   div[money-statement] < … < div[payment-state-pending] < main
  //   clock=true   count=2   288x100 @ y=184   (as above)
  //                          0x0     @ y=0     div[money-statement] < … < div(hidden) < body
  //
  // The second copy exists ONLY under a driven clock, is inside a `hidden` container attached directly
  // to `<body>`, and measures 0x0 — the retained previous tree of a `router.refresh()` transition that a
  // frozen clock leaves mid-flight. The poller is D-71's, it is on this surface by design, and a driven
  // clock is what keeps the frame deterministic; so the instrument that makes the surface measurable is
  // the thing that produces the duplicate. It paints nothing and no booker can read it.
  //
  // The claim being made is therefore stated on what is RENDERED: exactly one money statement is visible.
  // The total is still reported in the failure message, so a real second panel — which would be visible —
  // still fails, and fails with both numbers in the sentence.
  const hook = page.getByTestId("money-statement").filter({ visible: true });
  await expect(
    hook,
    `${where}: this surface renders no VISIBLE \`money-statement\` (${await page
      .getByTestId("money-statement")
      .count()} carry the hook in total). STATE-06 is a claim about a specific element, and a state ` +
      "that stopped rendering one has not satisfied it — it has removed the sentence the criterion is " +
      "about. More than one VISIBLE panel is the AC#22 defect: two money statements in one document " +
      "are two things that can disagree about what happened to the booker's money.",
  ).toHaveCount(1);

  expect(
    await page.evaluate(() => window.scrollY),
    `${where}: the document was already scrolled when the measurement ran, so a box that fits is not ` +
      "the same claim as a sentence the booker can see on arrival.",
  ).toBe(0);

  const box = await hook.boundingBox();
  expect(box, `${where}: the money statement has no layout box`).not.toBeNull();
  const viewport = page.viewportSize();
  expect(viewport, `${where}: no viewport size`).not.toBeNull();
  const bottom = (box as { y: number; height: number }).y + (box as { height: number }).height;
  expect(
    bottom,
    `${where}: the money statement's bottom edge is at ${Math.round(bottom)}px in a ` +
      `${(viewport as { height: number }).height}px viewport — the booker has to scroll to read the ` +
      "sentence that says what happened to their money. STATE-06 puts it above the fold on every " +
      "payment state at both declared sizes.",
  ).toBeLessThanOrEqual((viewport as { height: number }).height);
}

/**
 * The fixture: one listing, one booker, six payment-state rows and one group, for the whole block.
 *
 * `cookies` rather than a login per case — see this block's header.
 */
type Phase13Fixture = {
  readonly seed: SeededListing;
  readonly states: SeededPaymentStates;
  readonly inviteToken: string;
  readonly cookies: readonly { name: string; value: string; domain: string; path: string }[];
};

type Phase13Row = {
  readonly name: string;
  /** `null` for a surface this block cannot reach; `skip` then says why, IN THE MESSAGE. */
  readonly path: ((f: Phase13Fixture) => string) | null;
  readonly skip?: string;
  /** The declared selector proving this surface rendered ITS OWN subject, not the state one step before. */
  readonly tell: (page: Page) => ReturnType<Page["locator"]>;
  /** Why that selector cannot be satisfied by the skeleton, the redirect or the branch next door. */
  readonly tellWhy: string;
  /** STATE-06 applies: this surface renders a money statement. */
  readonly money?: boolean;
  /** Something on this surface ticks, so the clock is installed before the first navigation. */
  readonly ticks?: boolean;
};

/**
 * ⚠ MUST SATISFY `inviteTokenSchema` — `/^[0-9A-HJKMNP-TV-Z]{20}$/`, Crockford base32, exactly twenty.
 *
 * A token of any other shape folds onto the SAME inactive branch an unknown one reaches (deliberately —
 * the shape check must not become a probe), so a fixture with a sloppy token renders `InviteInactive`
 * and every assertion below measures the wrong surface while looking perfectly healthy. Measured while
 * writing this block: a 16-character lower-case token did exactly that.
 */
function mintInviteToken(): string {
  const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let out = "";
  for (let i = 0; i < 20; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

const PHASE_13_ROWS: readonly Phase13Row[] = [
  {
    name: "the confirmation moment",
    path: (f) => `/bookings/${f.states.bookingIds.confirmed}?paid=1`,
    tell: (page) => page.getByTestId("confirmation-moment"),
    tellWhy:
      "the moment's own container. The confirmed DETAIL renders at the same URL without the query and " +
      "carries `booking-detail` instead, so nothing weaker tells the before-picture from the after.",
    ticks: true,
  },
  {
    name: "the confirmed detail, no query",
    path: (f) => `/bookings/${f.states.bookingIds.confirmed}`,
    tell: (page) => page.getByTestId("booking-detail"),
    tellWhy:
      "the detail shell, which the moment does NOT render — so this row cannot be satisfied by the row " +
      "above, and neither can be satisfied by the route's `loading.tsx` plate.",
  },
  {
    name: "payment state: pending settlement",
    path: (f) => `/bookings/${f.states.bookingIds.pendingLiveHold}?paid=1`,
    tell: (page) => page.getByTestId("payment-state-pending"),
    tellWhy:
      "the pending container. All three payment states are role-less sectioning `div`s " +
      "(`selector-contract.ts` records why each needs its own box), and the same row WITHOUT `?paid=1` " +
      "redirects to checkout — so the query and this hook together are what pin the surface.",
    money: true,
    ticks: true,
  },
  {
    name: "payment state: not completed",
    path: null,
    skip:
      "UNREACHABLE FROM A SEED, and the reason is `page.tsx`'s own documented fallback rather than a " +
      "missing fixture. The pending branch renders `NotCompletedState` only when " +
      "`readPaymentState(status, session) === 'not-completed'`, which needs the D-84 probe to answer " +
      "`active`. `probeCheckoutSession` returns null for any session PayMongo does not know — every " +
      "`cs_e2e_…` id is one — and the branch then REDIRECTS rather than rendering, deliberately: " +
      "'showing you have not been charged while a payment is quietly settling is a false money " +
      "statement'. Reaching it needs a real hosted checkout session, which D-35 forbids this suite " +
      "from minting. Covered instead, in the rendered tree, by tests/booking/payment-states.test.tsx.",
    tell: (page) => page.getByTestId("payment-state-incomplete"),
    tellWhy: "moot while the row is skipped; kept so the row is complete if the surface becomes reachable.",
    money: true,
  },
  {
    name: "payment state: reversed, AUTOMATIC branch",
    path: null,
    skip:
      "UNREACHABLE FROM A SEED. The branch is `session === null ? 'indeterminate' : " +
      "isApiRefundable(rail) ? 'auto' : 'manual'`, so `auto` presupposes a provider-confirmed session " +
      "AND a refundable rail. A seeded row has neither: the probe returns null. Same credential " +
      "boundary as the not-completed row above (D-35).",
    tell: (page) => page.getByTestId("payment-state-reversed"),
    tellWhy: "moot while the row is skipped.",
    money: true,
  },
  {
    name: "payment state: reversed, MANUAL branch",
    path: null,
    skip:
      "UNREACHABLE FROM A SEED, for the automatic branch's reason plus one more: `manual` additionally " +
      "requires the confirmed session to name a NON-refundable rail (QR Ph, UBP). Two provider facts " +
      "this suite may not manufacture. See the dedicated ordering case below, which states the second, " +
      "INDEPENDENT reason that assertion cannot run today.",
    tell: (page) => page.getByTestId("payment-state-reversed"),
    tellWhy: "moot while the row is skipped.",
    money: true,
  },
  {
    name: "payment state: reversed, INDETERMINATE branch (D-96)",
    path: (f) => `/bookings/${f.states.bookingIds.reversed}`,
    tell: (page) => page.getByTestId("payment-state-reversed"),
    tellWhy:
      "the reversed container, reached with NO query string — which is D-87's falsifiable form: the " +
      "state used to be gated on `?paid=1` and would have vanished the moment 13-11's confirmation " +
      "moment consumed that parameter. This is the branch a seeded row actually renders (D-96); the " +
      "two the UI-SPEC names are skipped above with their reason.",
    money: true,
  },
  {
    name: "the receipt",
    path: (f) => `/bookings/${f.states.bookingIds.confirmed}/receipt`,
    tell: (page) => page.getByTestId("receipt"),
    tellWhy:
      "the receipt shell. The route's own loading plate carries no `receipt` id, and the D-76 predicate " +
      "refusing the row would land on the not-found boundary, which carries none either.",
  },
  {
    name: "/bookings/[id]/cancel",
    path: (f) => `/bookings/${f.states.bookingIds.confirmed}/cancel`,
    tell: (page) => page.getByRole("heading", { name: "Cancel this booking?" }),
    tellWhy:
      "the LIVE branch's own heading. `cancel/loading.tsx` renders a `PanelSkeleton` labelled 'Loading " +
      "your cancellation options' and no heading at all, and the already-started refusal renders a " +
      "different one — so this string separates the branch being measured from both neighbours.",
  },
  {
    name: "/bookings/[id]/group",
    path: (f) => `/bookings/${f.states.bookingIds.confirmed}/group`,
    tell: (page) => page.locator("#invite-link"),
    tellWhy:
      "the share box's own input, and the heading would have been the trap: `group/loading.tsx` renders " +
      "`<h1>Your group</h1>` byte-identically to the resolved page, so an `h1` hook is satisfied by the " +
      "skeleton. The load-FAILURE branch renders neither.",
  },
  {
    name: "/invite/[token]",
    path: (f) => `/invite/${f.inviteToken}`,
    tell: (page) => page.getByRole("heading", { name: /^You(’|')re invited to / }),
    tellWhy:
      "the ACTIVE invite's own heading. Two neighbours make anything weaker useless: " +
      "`invite/[token]/loading.tsx` is a SEARCH-PAGE skeleton whose `h1` reads 'Find a space to play' " +
      "(measured — a curl of this route returns exactly that), and every inactive token folds onto " +
      "`InviteInactive`'s two sentences under a different heading.",
  },
  {
    name: "bookings/[id]/not-found",
    path: () => "/bookings/a-booking-id-that-must-never-exist-13-15",
    tell: (page) => page.getByTestId("empty-state"),
    tellWhy:
      "the EmptyState this boundary composes. `not-found.tsx` deliberately uses `EmptyState` rather " +
      "than `ErrorState` — a stale link is a state, not a fault, and `ErrorState` paints its glyph with " +
      "the alarm token this phase renders nowhere — so the id is the boundary's signature.",
  },
];

test.describe(`AC#30 / AC#22 — every Phase-13 surface at ${FLOOR_PX}px, in both themes`, () => {
  // SERIAL, and it is not a performance setting: the whole block shares ONE seeded fixture built in
  // `beforeAll`. Playwright runs `beforeAll` once per WORKER, so a parallel block would seed one listing
  // and one booker per worker and tear down another worker's rows from under it.
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let fixture: Phase13Fixture;

  test.beforeAll(async ({ browser }) => {
    const seed = await seedBookableListing({ titlePrefix: "E2E Phase13 Sweep" });

    // The signup happens in its own context, ONCE. Its cookies are what every case below reuses.
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    const email = await signUpBooker(page, seed);
    const cookies = (await context.storageState()).cookies;
    await context.close();

    const [{ id: bookerId }] = await seed.sql<{ id: string }[]>`
      SELECT id FROM "user" WHERE email = ${email}
    `;
    const states = await seedPaymentStates(seed, bookerId, { idPrefix: "e2e_p13sweep" });

    const inviteToken = mintInviteToken();
    await seed.sql`
      INSERT INTO "booking_group" (id, booking_id, capacity_snapshot, access_token, created_at)
      VALUES (
        ${`bg_p13sweep_${inviteToken}`}, ${states.bookingIds.confirmed}, ${8}, ${inviteToken}, now()
      )
    `;

    fixture = { seed, states, inviteToken, cookies };
  });

  test.afterAll(async () => {
    if (fixture === undefined) return;
    // ORDER IS THE FK'S, not this block's: `booking_group.booking_id` is ON DELETE RESTRICT, so the
    // group goes before the bookings and the bookings before the listing — and `seed.teardown()` ends
    // the connection the earlier statements run on, so it is unconditionally last.
    await fixture.seed.sql`DELETE FROM booking_group WHERE access_token = ${fixture.inviteToken}`;
    await fixture.states.teardown();
    await fixture.seed.teardown();
  });

  for (const row of PHASE_13_ROWS) {
    for (const theme of THEMES) {
      const title = `${row.name} · ${theme}`;

      if (row.path === null) {
        // NAMED, never silent — the same shape the four unreachable error boundaries above use. A skip
        // whose reason is only in a comment is a skip nobody reads.
        test.skip(title, () => {
          throw new Error(`unreachable: ${row.skip}`);
        });
        continue;
      }

      const resolvePath = row.path;

      test(title, async ({ page }) => {
        await page.context().addCookies([...fixture.cookies]);
        await seedTheme(page.context(), theme);

        // ⚠ BEFORE THE FIRST NAVIGATION — Playwright's own caveat for `clock`, quoted in
        // `e2e/hold-countdown.spec.ts`: a clock installed after a navigation does not control the timers
        // the page already created. Two surfaces here tick: the pending state's 2.5s `router.refresh()`
        // poller (D-71) and the confirmation moment's decay (D-60). A sweep that measured a page mid-poll
        // is a flake, and a `router.refresh()` landing between the box read and the assertion is exactly
        // the shape that gets a threshold widened instead of a clock installed.
        if (row.ticks) {
          await page.clock.install();
          await page.clock.pauseAt(new Date(Date.now() + CLOCK_PAUSE_LEAD_MS));
        }

        await page.setViewportSize({ ...SHORT_VIEWPORT });
        await page.goto(`${BASE}${resolvePath(fixture)}`);
        await page.evaluate(() => document.fonts.ready);

        const where = `${title} · ${FLOOR_PX}px`;
        await expect(
          row.tell(page),
          `${where}: the route rendered no reachability tell — ${row.tellWhy} Every assertion in this ` +
            "case passes against a page with nothing on it, which is why this runs first and is a " +
            "failure rather than a skip.",
        ).not.toHaveCount(0, { timeout: 20_000 });

        await expectNoOverflow(page, where);

        // ⚠ THE ORDER OF THE NEXT THREE IS LOAD-BEARING AND IT WAS MEASURED. STATE-06's claim is about
        // the INITIAL viewport, and `expectVisibleFocus` walks the keyboard forward until focus leaves
        // the header — which SCROLLS the document. The first draft ran the focus walk first and the
        // reversed row failed with `scrollY` of 28, i.e. the guard inside `expectMoneyStatementAboveFold`
        // catching this file's own instrument rather than a product defect. It is exactly the failure
        // that guard exists for, arriving from the wrong direction, so the fix is the order and NOT a
        // `scrollTo(0, 0)` — resetting the scroll would have made the guard unable to see a real one.
        if (row.money === true) {
          await expectMoneyStatementAboveFold(page, `${where} (STATE-06)`);
        }

        await expectTargets(page, where);
        await expectVisibleFocus(page, where);

        if (row.money === true) {
          // …and again at the desktop size AC#22 names. A second `goto` rather than a resize, because a
          // resize leaves the scroll position (see above) and the poller's state from the first pass in
          // place.
          await page.setViewportSize({ ...DESKTOP_VIEWPORT });
          await page.goto(`${BASE}${resolvePath(fixture)}`);
          await page.evaluate(() => document.fonts.ready);
          await expect(row.tell(page)).not.toHaveCount(0, { timeout: 20_000 });
          await expectMoneyStatementAboveFold(
            page,
            `${title} · ${DESKTOP_VIEWPORT.width}px (STATE-06)`,
          );
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // D-83 / 13-UI-SPEC § The Reversed State — READING ORDER BEATS COLOUR
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // The falsifiable claim: in the MANUAL branch, at 320x568 in both themes, the support control's
  // bounding box is fully inside the initial viewport and its `boundingBox().y` is LESS than the coral
  // primary's. That is how D-72's single coral recovery action and D-83's unmissable support path coexist
  // without a second accent fill in one viewport.
  //
  // ⚠ IT SKIPS TODAY, FOR TWO INDEPENDENT REASONS, AND A SKIP WITH A NAMED REASON IS THE POINT. An
  // assertion that quietly passed over an absent element is the vacuity this repository has now recorded
  // nine times; both reasons are computed here rather than asserted in prose, so the day either one is
  // fixed this case starts RUNNING rather than staying green for the wrong reason.
  test("D-83 — the support control sits above the coral primary in the reversed manual branch", async ({
    page,
  }) => {
    const blockers: string[] = [];

    // (1) THE CONTROL DOES NOT RENDER AT ALL. `SUPPORT_EMAIL` is `null` (D-26/D-64), and the support
    // component renders nothing in that state by design — `tests/design/site-contacts.test.ts` is an
    // INVERTED gate asserting zero support affordances anywhere while it is unset, and D-64 forbids
    // setting it to a placeholder to make a surface pass. This is a `human_needed` item: one line,
    // `src/lib/site.ts:70`, and it is the PM's to write.
    if (SUPPORT_EMAIL === null) {
      blockers.push(
        "SUPPORT_EMAIL is null (src/lib/site.ts:70), so `support-path` renders NOTHING anywhere in the " +
          "app — D-64, and site-contacts.test.ts is the inverted gate that keeps it that way. There is " +
          "no element to measure, and measuring an absent one is how an assertion passes vacuously.",
      );
    }

    // (2) THE BRANCH ITSELF IS NOT REACHABLE. Independent of (1): even with the constant set, a seeded
    // row lands on D-96's `indeterminate` branch, because `manual` requires a provider-confirmed session
    // on a non-refundable rail. Stated separately so fixing one does not silently look like fixing both.
    blockers.push(
      "the MANUAL branch is not reachable from a seed: `page.tsx` picks it only when the D-84 probe " +
        "returns a session AND `isApiRefundable(rail)` is false, and `probeCheckoutSession` returns " +
        "null for every fixture session id. A seeded reversed row renders the INDETERMINATE branch " +
        "(D-96), which carries a different sentence and no rail. Minting a real hosted session is what " +
        "D-35 forbids this suite from doing.",
    );

    test.skip(
      blockers.length > 0,
      `D-83 ordering NOT asserted — ${blockers.length} independent blocker(s): ${blockers.join(" ALSO: ")}`,
    );

    // ── From here down the case RUNS the moment both blockers are gone. ───────────────────────────
    await page.context().addCookies([...fixture.cookies]);
    await seedTheme(page.context(), "court");
    await page.setViewportSize({ ...SHORT_VIEWPORT });
    await page.goto(`${BASE}/bookings/${fixture.states.bookingIds.reversed}`);

    const support = page.getByTestId("support-path");
    await expect(
      support,
      "the reversed manual branch rendered no `support-path`. The whole claim is about that control's " +
        "position, so an absent one is a failure and never a pass.",
    ).toHaveCount(1);

    const primary = page.getByRole("link", { name: "Back to availability" });
    await expect(primary).toHaveCount(1);

    const supportBox = await support.boundingBox();
    const primaryBox = await primary.boundingBox();
    expect(supportBox, "the support control has no layout box").not.toBeNull();
    expect(primaryBox, "the coral primary has no layout box").not.toBeNull();

    const s = supportBox as { y: number; height: number };
    const p = primaryBox as { y: number };
    const viewport = page.viewportSize() as { height: number };

    expect(
      s.y + s.height,
      `the support control's bottom edge is at ${Math.round(s.y + s.height)}px in a ` +
        `${viewport.height}px viewport. D-83 requires it fully inside the INITIAL viewport: it is the ` +
        "only route to the booker's money, and a control below the fold is decorative.",
    ).toBeLessThanOrEqual(viewport.height);

    expect(
      s.y,
      `the support control is at y=${Math.round(s.y)} and the coral primary at ` +
        `y=${Math.round(p.y)}. Reading order is what makes the support path unmissable WITHOUT a second ` +
        "accent fill in the viewport (12-UI-SPEC's one-accent rule forbids that resolution), so the " +
        "order is the requirement, not a layout preference.",
    ).toBeLessThan(p.y);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 14 — THE FIVE HOST SURFACES (plan 14-16)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ROADMAP § Cross-Cutting Constraints makes GATE-RESP and GATE-A11Y exit criteria on every
// surface-touching phase. 14-UI-SPEC states them as AC#36: `scrollWidth <= clientWidth` at 320px on
// every Phase-14 surface, every control at or above the target floor, every PRIMARY action at or above
// the 44px touch floor, and visible focus through the one DS-05 recipe.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THIS IS A THIRD BLOCK IN THIS FILE, NOT A SECOND SWEEP IN A SECOND FILE, AND THE DISTINCTION IS THE
// ONE THAT MATTERS
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Every assertion below is the SAME function the twelve-route table and the Phase-13 block call:
// `expectNoOverflow`, `expectTargets`, `expectVisibleFocus`. That is the property worth protecting — a
// second copy of the overflow scan would be free to disagree with the first about what "clipped"
// means, and `helpers/overflow.ts`'s header records that being the whole reason the measurement was
// extracted in the first place. What is new here is a route table and ONE assertion (the touch floor),
// and a sixth host surface is a ROW in that table rather than a sixth file.
//
// It is a separate `describe` rather than five more rows in `ROUTES` for the reason the Phase-13 block
// gives at length: that table is deliberately SEED-FREE, which is what lets its 26 cases run with no
// database fixture at all. Every surface below needs a signed-in HOST, a listing they own and — for
// three of the five — rows on it. So the seed arrives as ONE fixture for the whole block, exactly as
// Phase 13's did. NO NEW SPEC FILE SEEDS A DATABASE as a result of this plan, which is the count
// `deferred-items.md` warns about by name.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE TOUCH FLOOR IS DECLARED PER ROW, AND AN EMPTY DECLARATION CARRIES A REASON
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `TARGET_FLOOR_PX` above is 24 — WCAG 2.5.8 AA — and its docstring records the measurement behind
// that: this app ships deliberate sub-44 controls, so a blanket 44 would report a dozen reviewed boxes
// as defects on its first run. AC#36's second clause is narrower and is about PRIMARY actions, so it
// is asserted narrowly: each row NAMES the controls 14-UI-SPEC § Primary CTAs declares at 44px, by
// accessible name, and each named control must be PRESENT and at least 44px tall.
//
// ⚠ TWO OF THE FIVE SURFACES DECLARE NONE, AND THAT IS RECORDED RATHER THAN QUIETLY OMITTED.
// `/host`'s `Create listing` is the page's one accent-filled control and it renders at the Button's
// DEFAULT height, not the touch one — D-22 makes 44px an EXPLICIT OPT-IN and never a responsive
// default, and this surface did not take it. Asserting 44 there would be red against shipped,
// reviewed, deliberate code, which is the failure mode this file already refused once. So those rows
// declare an empty list WITH the argument, and the day somebody opts that control in, the row gains an
// entry.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — stated so the next reader under-trusts this block
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//   • THE WIZARD IS MEASURED AT ITS FIRST STEP ONLY. Nine questions in two occupancy modes is a WALK,
//     and this file is a sweep; `e2e/host-headings.spec.ts` walks both lists. What the first step does
//     carry — and what makes it the right single frame for this block — is the step rail, the
//     persistent publish checklist in its collapsed 320px placement, and the footer's save-state line.
//   • `/host/bookings` IS MEASURED ON THE UPCOMING TAB ONLY. The past tab renders the same row shape
//     with a refund line; the tab partition is `bookings-query.ts`'s subject, not this file's.
//   • THE DASHBOARD'S QUIET, EMPTY AND NO-LISTINGS STATES ARE NOT SWEPT. This block measures the state
//     with the most in it, because that is the one that can overflow; the other three are strictly
//     less content in the same containers.
//   • THE SHELL CHROME IS STILL EXCLUDED from the target-size scan, and it still fails — the 16x16
//     `ProfileLink` below `sm:` is a Phase-11 finding carried in `deferred-items.md`. Host routes
//     render that same header, so the exclusion is doing exactly as much work here as it does for the
//     Phase-13 block above.
//   • Like the rest of this file, none of it runs in CI (D-24).

/** AC#36's second clause. DS-09 / D-22's declared control height, in pixels. */
const TOUCH_FLOOR_PX = 44;

/** The Playwright process doesn't load .env; fall back to the deterministic dev URL (booker-seed.ts). */
const HOST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

/** The seeded listing's venue timezone. "Today" is resolved in THIS zone, never in the runner's (D-141). */
const HOST_VENUE_TZ = "Asia/Manila";
const HOST_VENUE_CITY = "Makati";
const HOST_PASSWORD = "averylongpassword";

type HostFixture = {
  readonly listingId: string;
  readonly bookerId: string;
  readonly hostEmail: string;
  readonly sql: ReturnType<typeof postgres>;
  readonly cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
};

/**
 * One published listing owned by a UI-signed-up host, with today's session, a live request and a
 * future confirmed booking on it.
 *
 * The seeding is written here rather than imported, and that is this repository's own pattern rather
 * than a shortcut: `host-dashboard.spec.ts` and `host-inbox-hierarchy.spec.ts` each carry their own,
 * because each needs a DIFFERENT shape and a shared factory taking six flags is harder to read than
 * two explicit fixtures. What is shared — and what must stay shared — is the ASSERTION, which is why
 * this block calls `expectNoOverflow` rather than re-scanning.
 *
 * The sign-up drive itself is the shipped idiom (`e2e/mode-switch.spec.ts:20-37`,
 * `e2e/shell.spec.ts:168-182`): email/password needs no external credentials and a unique address per
 * run never collides on the unique-email constraint.
 */
async function seedHostSurfaces(page: Page): Promise<Omit<HostFixture, "cookies">> {
  const email = `e2e.of320.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Ovie");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(HOST_PASSWORD);
  await page.getByRole("button", { name: /sign up to host/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });

  const sql = postgres(HOST_DATABASE_URL, { max: 1, onnotice: () => {} });
  const runId = randomUUID();

  const [host] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${email}`;
  if (!host) {
    await sql.end();
    throw new Error(
      `the host signed up as ${email} is not in the database, so there is no owner to hang a listing ` +
        "on. The signup drive above did not persist a user.",
    );
  }

  const listingId = `e2e_of320_listing_${runId}`;
  const bookerId = `e2e_of320_booker_${runId}`;

  // An ACTIVATED payout wallet is what makes a listing bookable (the `payouts_enabled` gate). Seeded
  // directly, exactly as `booker-seed.ts` does — the `merchant.activated` webhook is a Phase 2 concern.
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${host.id}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;

  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${bookerId}, ${"E2E Overflow Booker"}, ${`${bookerId}@example.com`}, ${true},
      ${"Bernardita"}, ${false}, ${true}, now(), now()
    )
  `;

  // ⚠ THE TITLE IS DELIBERATELY LONG, AND IT IS THE ONE FIXTURE CHOICE THAT IS ABOUT THIS BLOCK'S OWN
  // SUBJECT. A 320px sweep against a six-character space name measures a page nothing is pushing on:
  // the row titles, the table cells, the wizard's review rows and the agenda's meta line all take
  // their width from this string. A long name is what makes "nothing scrolls sideways" a claim about
  // the layout rather than about the fixture.
  const listingTitle = `Bernardita Memorial Multi-Sport Court ${runId.slice(0, 6)}`;

  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, status, cancellation_policy, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${host.id}, ${listingTitle},
      ${"A covered court with two hoops, a scoreboard and a water station."},
      ${"multi_sport_court"}::space_type,
      ${"7 Real Street"}, ${HOST_VENUE_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"},
      ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${10}, ${1}, ${HOST_VENUE_TZ},
      ${47333}, ${288888}, ${25000}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      ${"standard"}::cancellation_policy,
      now(), now(), now()
    )
  `;

  /** One booking, positioned by VENUE-LOCAL day offset — `host-dashboard.spec.ts:263-280`'s idiom. */
  const addBooking = async (
    dayOffset: number,
    startHour: number,
    endHour: number,
    status: "confirmed" | "requested",
  ): Promise<void> => {
    const id = `e2e_of320_booking_${randomUUID()}`;
    await sql`
      INSERT INTO "booking" (
        id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
        cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
        currency, payment_id, payment_method, expires_at, checkout_session_id,
        refund_cents, cancelled_by, cancelled_at, open_capacity, declared_pax, created_at
      ) VALUES (
        ${id}, ${listingId}, ${1}, ${bookerId},
        (date_trunc('day', now() AT TIME ZONE ${HOST_VENUE_TZ})
          + make_interval(days => ${dayOffset}, hours => ${startHour})) AT TIME ZONE ${HOST_VENUE_TZ},
        (date_trunc('day', now() AT TIME ZONE ${HOST_VENUE_TZ})
          + make_interval(days => ${dayOffset}, hours => ${endHour})) AT TIME ZONE ${HOST_VENUE_TZ},
        ${status}::booking_status, ${"request"}::booking_mode,
        ${"standard"}::cancellation_policy,
        ${100_000}, ${5_000}, ${105_000}, ${"php"},
        ${null}, ${null}, ${null}, ${null},
        ${null}, ${null}::cancelled_by, ${null},
        ${false}, ${null},
        now()
      )
    `;
    if (status === "requested") {
      // A live approval deadline, clear of the one-hour alarm threshold so the row renders its
      // ordinary shape — the widest one, since the D-99 reason line is what fills the status column.
      await sql`UPDATE "booking" SET expires_at = now() + make_interval(hours => ${20}) WHERE id = ${id}`;
    }
  };

  // ⚠ EXACTLY ONE PHOTO, AND THE COUNT IS LOAD-BEARING IN BOTH DIRECTIONS (D10).
  //   - At least one, or `photo-uploader.tsx:199` returns its zero-photo empty state and
  //     `CoverFramePreview` never renders, so the photos row would have nothing to measure.
  //   - Fewer than three, or the checklist's `3+ photos` row goes `done`, its `Fix` link stops
  //     rendering (`publish-checklist.tsx:220`) and `openWizardPhotosStep` loses its only seam.
  // One is the only count that satisfies both. `openWizardPhotosStep` asserts each half separately so
  // that raising this number fails with a message naming the cause rather than a timeout.
  //
  // A LOCAL URL, NOT A CLOUDINARY ONE. `public/vrt/photo-0.svg` is committed and served by the dev
  // server, so this fixture needs no upload, no credential and no network — the preview renders
  // `photo.url` directly and derives nothing from the Cloudinary-shaped `public_id`.
  // `scripts/seed-baseline-fixtures.ts` seeds its eight rows the same way for the same reason.
  //
  // No teardown: `listing_photo.listing_id` is `ON DELETE CASCADE` and `afterAll` deletes the host,
  // whose deletion cascades to the listing. The FK does the work the DELETE order would have.
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position, created_at)
    VALUES (
      ${`e2e_of320_photo_${randomUUID()}`}, ${listingId},
      ${`fitout/listings/${listingId}/cover`}, ${"/vrt/photo-0.svg"}, ${0}, now()
    )
  `;

  // Today's session (the agenda's busiest state), a live request (the inbox's row state, and the
  // requested row on the bookings list that carries the two 44px controls), and a future confirmed
  // booking (the bookings list's resting row).
  await addBooking(0, 8, 10, "confirmed");
  await addBooking(2, 9, 11, "requested");
  await addBooking(3, 14, 16, "confirmed");

  return { listingId, bookerId, hostEmail: email, sql };
}

/** One control 14-UI-SPEC § Primary CTAs declares at the touch height, named the way a user reaches it. */
type TouchTarget = { readonly name: RegExp; readonly why: string };

type Phase14Row = {
  readonly name: string;
  readonly path: (f: HostFixture) => string;
  /** The declared selector proving this route rendered ITS OWN surface, not a redirect or its plate. */
  readonly tell: string;
  /** Why that selector cannot be satisfied by `/login`, a 404 or the route's own `loading.tsx`. */
  readonly tellWhy: string;
  /** The 44px controls this surface declares. AN EMPTY LIST IS A DECLARATION — `touchWhy` says why. */
  readonly touch: readonly TouchTarget[];
  readonly touchWhy: string;
  /**
   * An interaction to perform AFTER `goto` and AFTER `tell`, but BEFORE the measurement — for a row
   * whose subject only exists once the host has walked somewhere (plan 16-15's D10).
   *
   * ⚠ THE SHAPE IS `RouteRow.open`'s, DELIBERATELY, AND THE DUPLICATION IS THE POINT. The AC#29 table
   * one block up has carried this field since 12-10 and the two tables have separate drivers, so this
   * is a second declaration of one idea rather than a shared one. Merging the tables to share it was
   * considered and rejected: they measure different acceptance criteria, seed different fixtures and
   * assert different touch floors, and a single table taking a discriminant would be harder to read
   * than two that each fit on a screen.
   *
   * ⚠ AN `open` IS NOT ITS OWN PROOF — `subject` IS. See the field below; this one only navigates.
   */
  readonly open?: (page: Page) => Promise<void>;
  /**
   * The declared element proving the walk ARRIVED, asserted by the loop AFTER `open` returns.
   *
   * ⚠ WHY THIS IS A ROW FIELD AND NOT A LINE AT THE END OF `open`, MEASURED RATHER THAN PREFERRED.
   * It was written the other way first — `openWizardPhotosStep` ended in its own arrival assertion —
   * and the discriminator killed it: stubbing the helper to `return` immediately made the row PASS,
   * because the early return skipped the assertion that was supposed to catch exactly that. The proof
   * and the thing it proves cannot live in the same function, or one edit removes both.
   *
   * On the row, the loop asserts it unconditionally and a helper that stops walking goes red. That is
   * a stronger arrangement than the AC#29 table's (its `open` implementations assert internally), and
   * it is the one to copy if that table ever grows another walked row.
   *
   * `tell` and `subject` are different claims: `tell` proves the ROUTE resolved (for the wizard, the
   * step rail — which every step renders), `subject` proves WHICH STATE is on screen. A row with an
   * `open` and no `subject` is a row that can silently degrade into a duplicate of an earlier one.
   */
  readonly subject?: (page: Page) => Locator;
  /** Why that element cannot be satisfied by the step the route mounts on. Required with `subject`. */
  readonly subjectWhy?: string;
};

/**
 * Walk the wizard from its mount step to the PHOTOS step, the way a host actually gets there.
 *
 * ⚠ WHY A WALK AND NOT A URL. `wizard.tsx` holds the step in CLIENT state (`const [step, setStep] =
 * useState(0)`) with no query parameter and no per-step route, so there is no path to point a row at.
 * It also mounts at step 0 with only `STEPS[0].key` in `visitedKeys`, which means the step RAIL is no
 * route either: a marker is only a control when its step is both `done` and visited, so on a fresh
 * load every marker past the first is an inert `<span>`.
 *
 * The seam that does exist is the publish checklist's `Fix` link. `publish-checklist.tsx:220` renders
 * it for any row that is `!done` with a `step`, and `wizard.tsx:1769` wires `onFix={goToStep}` —
 * reachable from the FIRST step since 14-10. So the walk is the shipped one: open the checklist, press
 * `Fix` on the photos row.
 *
 * ⚠ IT DEPENDS ON THE FIXTURE SEEDING FEWER THAN THREE PHOTOS, and that is asserted rather than
 * assumed. The checklist row is `{ label: "3+ photos", done: photoCount >= 3 }`; at three the row goes
 * `done`, the `Fix` link stops rendering and this walk has no seam. One photo satisfies both halves at
 * once — under three so the link exists, and at least one so `photo-uploader.tsx:199` returns past its
 * zero-photo branch and `CoverFramePreview` is on the page to be measured.
 */
async function openWizardPhotosStep(page: Page): Promise<void> {
  // The collapsed disclosure. D-149 defaults the checklist closed at this width, and this trigger is
  // the row's own declared 44px touch target — so the walk starts on the control the table already
  // asserts is reachable by thumb.
  const trigger = page.getByRole("button", { name: / ready to publish$/ });
  await expect(
    trigger,
    "the publish checklist's disclosure trigger is not on the page, so there is no route to the " +
      "photos step. The wizard holds its step in client state with no query parameter, and the step " +
      "rail's markers are inert on a fresh mount — this trigger is the only seam.",
  ).toBeVisible({ timeout: 60_000 });
  await trigger.click();

  const fix = page.getByRole("button", { name: "Fix" }).first();
  await expect(
    fix,
    "the checklist rendered no `Fix` link. `publish-checklist.tsx:220` renders one only for a row " +
      "that is NOT done, so the likeliest cause is the fixture seeding three or more photos — at " +
      "three, `3+ photos` goes done and this walk loses its only seam. See `seedHostSurfaces`.",
  ).toBeVisible({ timeout: 30_000 });
  await fix.click();

  // NO ARRIVAL ASSERTION HERE, DELIBERATELY. It lives on the row as `subject`, because a proof that
  // sits inside the function it is proving is removed by the same edit that breaks the walk — watched:
  // stubbing this helper to `return` early made the row pass. See `Phase14Row.subject`.
}

const PHASE_14_ROWS: readonly Phase14Row[] = [
  {
    name: "/host",
    path: () => "/host",
    tell: '[data-testid="agenda-rows"]',
    tellWhy:
      "the agenda's BUSY state, which is the widest thing this route renders — a booker's first name " +
      "over a meta line carrying the space title, the venue-local day and the window with its city " +
      "suffix. The route's `loading.tsx` plate composes the same `PageHeader` and carries none of the " +
      "three agenda hooks, and the quiet and empty states carry the other two, so this id pins both " +
      "the surface and the state.",
    touch: [],
    touchWhy:
      "NONE DECLARED, and this is the row where that is most worth stating. `Create listing` is this " +
      "page's one accent-filled control (AC#5) and it renders at the Button's DEFAULT height: D-22 " +
      "makes the 44px size an explicit OPT-IN and never a responsive default, and 14-UI-SPEC § " +
      "Primary CTAs lists it as `(brand)` with no height note. Asserting 44 here would be red against " +
      "shipped, reviewed, deliberate code — the exact false-positive failure `TARGET_FLOOR_PX`'s " +
      "docstring records this file refusing once already. The 24px AA bar still applies to it.",
  },
  {
    name: "/host/requests",
    path: () => "/host/requests",
    tell: '[data-testid="row-card"]',
    tellWhy:
      "a request row in the MOBILE tree — which is the only tree that exists at this width, because " +
      "the route renders a `hidden md:block` table beside a `md:hidden` card stack. Inbox-zero " +
      "renders `empty-state` and no row card, and the plate renders neither, so this id pins the " +
      "surface AND the state that has something to overflow with.",
    touch: [
      {
        name: /^Approve request from /,
        why:
          "14-UI-SPEC § Primary CTAs: `Approve` (neutral solid, 44px). It is the action the whole " +
          "surface exists for.",
      },
      {
        name: /^Decline request from /,
        why:
          "14-UI-SPEC § Primary CTAs: `Decline` (outline, 44px, opens the dialog). Declared at the " +
          "same height as its pair, because a 44px yes beside a smaller no is a thumb-sized bias.",
      },
    ],
    touchWhy: "the two row actions, declared at the touch height by the spec and by the component.",
  },
  {
    name: "/host/bookings",
    path: () => "/host/bookings?tab=upcoming",
    tell: '[data-testid="row-card"]',
    tellWhy:
      "a booking row in the MOBILE tree — same two-tree structure as the inbox. The empty state for " +
      "either tab renders `empty-state` instead, and `bookings/loading.tsx` draws a skeleton list " +
      "carrying no row card at all.",
    touch: [
      {
        name: /^Approve request from /,
        why:
          "the SAME cluster as the inbox, rendered on this surface's `requested` rows. " +
          "`request-row.tsx` states in as many words that both controls are touch-sized on BOTH " +
          "surfaces, because a floor that only holds where somebody remembered is not a floor. The " +
          "fixture seeds a live request so this row is present rather than assumed.",
      },
      { name: /^Decline request from /, why: "its pair, for the same reason." },
    ],
    touchWhy:
      "the approve/decline cluster, which this list renders on any row still awaiting an answer.",
  },
  {
    name: "/host/listings/[id]/edit",
    path: (f) => `/host/listings/${f.listingId}/edit`,
    tell: '[data-testid="wizard-step-rail"]',
    tellWhy:
      "the step rail, which only the resolved wizard renders. An `h1` would have been the trap here: " +
      "every step of the wizard renders one, and so does every other host route, so a heading hook " +
      "would be satisfied by any of them.",
    touch: [
      {
        name: / ready to publish$/,
        why:
          "the publish checklist's disclosure trigger, which opts into the touch size at " +
          "`publish-checklist.tsx:317`. It is the 320px placement's ONLY route into the checklist — " +
          "D-149 defaults it closed at this width precisely because vertical space is the constraint " +
          "here — so a smaller trigger would put the whole persistent checklist behind a target too " +
          "small to hit.",
      },
    ],
    touchWhy:
      "one control, and it is the disclosure rather than an advance button: `Get started` and `Save " +
      "and continue` are listed by 14-UI-SPEC as `(neutral solid)` with no height note and ship at " +
      "the Button's default, the same opt-in argument `/host` records above.",
  },
  {
    // CROP-02's GATE-RESP half, and the ONLY row on this table that measures a wizard step other than
    // the one it mounts on. Filed as D10 by plan 16-15 with its measurements; this is that measurement.
    //
    // WHAT IS AT RISK HERE, so a later reader knows what a red would mean: `CoverFramePreview` renders
    // two `CoverFrame`s in a `flex items-start gap-2`, each `w-32 sm:w-40`. At this width that is
    // 128 + 8 + 128 = 264px against a 320px floor, which clears the gutters and does not wrap. Plan
    // 16-06's hand-off note says exactly that — as ARITHMETIC. This row is the measurement that
    // arithmetic never was, and it also covers the uploader's tiles and its `3 photos minimum` note,
    // which share the step.
    name: "/host/listings/[id]/edit · photos step",
    path: (f) => `/host/listings/${f.listingId}/edit`,
    tell: '[data-testid="wizard-step-rail"]',
    tellWhy:
      "the same rail the row above pins, and for the same reason — it is what proves the WIZARD " +
      "resolved rather than a redirect or a plate. It deliberately does NOT prove which step is on " +
      "screen (every step renders the rail); that is `open`'s job, and it asserts it.",
    open: openWizardPhotosStep,
    subject: (page) => page.getByRole("heading", { name: COVER_PREVIEW_TITLE }),
    subjectWhy:
      "the cover preview's own heading, which ONLY the photos step renders and only once the listing " +
      "has at least one photo (`photo-uploader.tsx:199` returns its empty state before the preview " +
      "exists). The wizard's first step — the one this route mounts on and the row above measures — " +
      "renders no such heading, so this is what tells the two apart. Imported from " +
      "`cover-frames.ts`, never re-typed: a spec carrying its own copy of a heading reports ARRIVAL " +
      "the day the heading changes while the walk is still standing on the wrong step.",
    touch: [],
    touchWhy:
      "NONE DECLARED ON THIS STEP. The row above already asserts the checklist trigger, which is the " +
      "one control 14-UI-SPEC § Primary CTAs gives a height note to on this route, and this walk " +
      "presses that very control to get here — so asserting it again would be the same measurement " +
      "twice. The uploader's own controls are listed as SHIPPED with no height note, the same opt-in " +
      "argument `/host` records. The 24px AA bar still applies and `expectTargets` still runs.",
  },
  {
    name: "/host/listings/[id]/availability",
    path: (f) => `/host/listings/${f.listingId}/availability`,
    tell: '[data-testid="week-strip"]',
    tellWhy:
      "the week-at-a-glance preview, which is D-152's own element and exists on no other route. The " +
      "route's plate renders the same `PageHeader` and no strip.",
    touch: [],
    touchWhy:
      "NONE DECLARED. 14-UI-SPEC § Primary CTAs lists this surface's three controls — `Add hours` " +
      "(outline), `Save hours` (neutral solid) and `Add block` (neutral solid) — as SHIPPED, " +
      "UNCHANGED, with no height note on any of them. The 24px AA bar still applies, and it is the " +
      "bar that matters on a surface whose densest control is a row of hour selects.",
  },
];

/**
 * AC#36's touch clause, asserted on the controls the spec actually declares.
 *
 * ⚠ PRESENCE IS ASSERTED BEFORE HEIGHT, and that is not belt-and-braces: a `for` loop over zero
 * matches passes silently, having measured nothing. This block's whole subject is a floor, and a floor
 * that reports green over an absent control is the vacuity failure this file has now recorded three
 * times.
 */
async function expectTouchTargets(page: Page, where: string, row: Phase14Row): Promise<void> {
  for (const target of row.touch) {
    const control = page.getByRole("button", { name: target.name });
    const count = await control.count();
    expect(
      count,
      `${where}: this row declares a ${TOUCH_FLOOR_PX}px control matching ${String(target.name)} and ` +
        `the surface rendered NONE. ${target.why} An absent control satisfies a height assertion ` +
        "perfectly, so this is a failure — either the fixture no longer reaches the state that " +
        "renders it, or the control moved and this row must move with it.",
    ).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const box = await control.nth(i).boundingBox();
      expect(box, `${where}: ${String(target.name)} #${i} has no layout box`).not.toBeNull();
      const { height, width } = box as { height: number; width: number };
      expect(
        Math.round(height * 10) / 10,
        `${where}: the primary action matching ${String(target.name)} measures ` +
          `${Math.round(width)}x${Math.round(height)} — under the ${TOUCH_FLOOR_PX}px height DS-09 ` +
          `declares and 14-UI-SPEC § Primary CTAs assigns it. ${target.why} This is the app's own ` +
          "bar, higher than the AA one every control clears, and it is opt-in — so a control that " +
          "falls below it has usually lost its size prop rather than shrunk.",
      ).toBeGreaterThanOrEqual(TOUCH_FLOOR_PX);
    }
  }
}

test.describe(`AC#36 — every Phase-14 host surface at ${FLOOR_PX}px, in both themes`, () => {
  // SERIAL for the Phase-13 block's reason: the whole block shares ONE seeded fixture built in
  // `beforeAll`, and `beforeAll` runs once per WORKER — so a parallel block would sign one host up per
  // worker and tear down another worker's rows from under it.
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let fixture: HostFixture;

  test.beforeAll(async ({ browser }) => {
    // The signup happens in its own context, ONCE. Its cookies are what every case below reuses —
    // `host-dashboard.spec.ts:142-155` records the measurement: a login per case drives
    // `POST /api/auth/sign-in/email` past `src/lib/auth.ts:167`'s five-per-sixty-seconds limiter, and
    // the refusal reads exactly like a product bug on the page under test.
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    const seeded = await seedHostSurfaces(page);
    const cookies = await context.cookies();
    await context.close();

    fixture = { ...seeded, cookies };
  });

  test.afterAll(async () => {
    if (fixture === undefined) return;
    // ORDER IS THE FK'S (`booker-seed.ts`'s header): `booking.booker_id` is ON DELETE RESTRICT, so the
    // notifications and bookings go first, then the booker, then the host — whose deletion cascades to
    // the listing. `sql.end()` is unconditionally last.
    await fixture.sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${fixture.listingId})`;
    await fixture.sql`DELETE FROM booking WHERE listing_id = ${fixture.listingId}`;
    await fixture.sql`DELETE FROM "user" WHERE id = ${fixture.bookerId}`;
    await fixture.sql`DELETE FROM "user" WHERE email = ${fixture.hostEmail}`;
    await fixture.sql.end();
  });

  for (const row of PHASE_14_ROWS) {
    for (const theme of THEMES) {
      const title = `${row.name} · ${theme}`;

      test(title, async ({ page }) => {
        await page.context().addCookies([...fixture.cookies]);
        await seedTheme(page.context(), theme);
        await page.setViewportSize({ width: FLOOR_PX, height: 800 });

        await page.goto(`${BASE}${row.path(fixture)}`);
        await page.evaluate(() => document.fonts.ready);

        const where = `${title} · ${FLOOR_PX}px`;
        await expect(
          page.locator(row.tell),
          `${where}: the route rendered no \`${row.tell}\` — ${row.tellWhy} Every assertion in this ` +
            "case passes against a page with nothing on it, which is why this runs first and is a " +
            "failure rather than a skip. ⚠ If this is the first run since a dev-server restart, the " +
            "route may still be compiling: these five are among the heaviest in the app and the " +
            "timeout is sized for a cold one.",
          // 60s rather than the twelve-route table's 15s, and it is measured rather than hedged: on
          // the run that COMPILED the availability route, its tell did not resolve inside 20s on a
          // page with nothing wrong with it, and the next invocation against the warm route resolved
          // in under four seconds. `e2e/host-headings.spec.ts` carries the same allowance and note.
        ).not.toHaveCount(0, { timeout: 60_000 });

        // AFTER the tell, BEFORE the measurement. The tell proves the route RESOLVED; the walk moves
        // to the state being measured, and `subject` proves it got there.
        if (row.open) await row.open(page);
        if (row.subject) {
          await expect(
            row.subject(page),
            `${where}: the walk did not reach the surface this row measures — ${row.subjectWhy} ` +
              "Without this the case would measure the state the route MOUNTS on, which an earlier " +
              "row already covers, and report green having measured the same pixels twice.",
          ).toBeVisible({ timeout: 30_000 });
        }

        await expectNoOverflow(page, where);
        await expectTargets(page, where);
        await expectTouchTargets(page, where, row);
        await expectVisibleFocus(page, where);
      });
    }
  }
});
