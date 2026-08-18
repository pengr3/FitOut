import { expect, test, type Page } from "@playwright/test";

import { openBookingSheet } from "./helpers/booker-seed";
import { FLOOR_PX, expectNoOverflow } from "./helpers/overflow";
import { BASE_URL as BASE, installTruncator } from "./helpers/served-document";
import { seedTheme } from "./helpers/theme";

// RESP-01 / AC#29 — nothing overflows the viewport horizontally at 320px, on twelve named routes plus
// one route STATE, in both themes. Measured in real pixels in real Chromium.
//
// THE THIRTEENTH ROW IS `/listings/[id]` WITH THE BOOKING SHEET OPEN (plan 12-10), and it is a state
// rather than a route on purpose: RESP-02's sheet is a portal holding a second month grid inside a
// full-bleed overlay, so at this width it is the widest subtree on the route — and it does not exist in
// the document at all until a booker taps the sticky bar. See that row for the whole argument.
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
//   • FOUR OF THE TWELVE ROUTES ARE SKIPPED, EACH WITH A NAMED REASON (see `ROUTES`). They are four
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
// expectations are byte-identical, and their reasons travelled with them.

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
};

/**
 * THE TWELVE ROUTES `11-UI-SPEC § Responsive Baseline` names, in its order.
 *
 * Eight are reachable and are measured in both themes; four are not, and each says why in the string
 * a skipped run prints. That asymmetry is the finding rather than a shortfall — see the note on the
 * first skipped row.
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
      });
    }
  }
});
