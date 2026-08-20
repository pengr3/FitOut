// GATE-01 — THE PER-SURFACE DRIVE FOR PHASE 12'S PRODUCT BASELINES (plan 12-14).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS AT ALL, AND WHY IT IS A HELPER RATHER THAN A FUNCTION IN A SPEC
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 11's eleven baselined surfaces were all reachable by a `goto`, so `surfaces.spec.ts` needed
// exactly one drive: navigate, hook, shoot. FOUR OF PHASE 12'S SEVEN ARE STATES RATHER THAN URLS:
//
//   listing-lightbox   an overlay opened by a click on a mosaic cell
//   listing-sheet      a bottom sheet opened by the sticky bar's own trigger, below `lg:` only
//   checkout           only exists behind a `?hold=<id>` that the POST `placeHold` action minted, for
//                      a signed-in booker — `book/page.tsx` 404s otherwise, deliberately (T-04-GETDUP)
//   collision-notice   only exists for as long as a hold has just been REFUSED
//
// BOTH VISUAL SPECS NEED THOSE DRIVES. `surfaces.spec.ts` compares against a committed PNG and
// `theme-swap.spec.ts` compares two buffers from the same run, and a surface that only one of them can
// reach is a surface that silently drops out of the other's coverage. A spec cannot import a spec —
// `e2e/helpers/visual-freeze.ts`'s header records the mechanism: the `visual` project's `testMatch` is
// `e2e/visual/**/*.spec.ts`, so importing one spec into the other would execute its `test()` calls a
// second time under the importing file's scope. So the drives live here, in the directory neither
// project collects, exactly as `theme.ts`, `visual-freeze.ts` and `booker-seed.ts` do.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE THING EVERY DRIVE HERE IS BUILT TO PREVENT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A screenshot assertion against the WRONG STATE does not fail — on the run that has no baseline it
// MINTS one, and every run afterwards agrees with it. For Phase 11's surfaces the wrong state was a
// blank page or a 404, which a reachability hook rejects. Here the wrong state is *the page one step
// earlier*, and it is always plausible: a closed lightbox, an unopened sheet, a checkout still showing
// `book/loading.tsx`'s skeleton (whose `<h1>` is byte-identical to the resolved page's — measured in
// `e2e/hold-countdown.spec.ts`), a listing page with a priced selection whose hold was never refused.
// Every one of those photographs beautifully.
//
// So each drive below (a) does the interaction, (b) is followed by a hook declared in
// `visual-baselines.ts` that CANNOT match the state one step earlier, and (c) distinguishes its own
// failure modes rather than leaving them to a locator timeout. Where a retry appears it is a MEASURED
// requirement and the comment says so — a server-rendered control is clickable before React has
// attached its handler, and the click is LOST, not queued (this repository's fourth, fifth and sixth
// sightings of that shape: `openBookingSheet`, `reduced-motion.spec.ts`'s `advanceMonth`,
// `collision-in-place.spec.ts` step 3).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// DETERMINISM — THE FOUR SOURCES OF FRAME-TO-FRAME VARIATION PHASE 12 ADDED, AND WHAT CLOSES EACH
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. THE WALL CLOCK IN THE CALENDAR. `(detail)/page.tsx` renders `todayLocal` when no `date` param
//      is given, so the month grid, the highlighted day and the disabled past days all change daily.
//      CLOSED by pinning `?date=` to the fixture's own collision day on every listing-page drive.
//   2. THE COUNTDOWN. Phase 12 is the first phase to baseline a surface that renders a clock, and
//      `e2e/visual/freeze.css`'s header says in advance that the first such surface must freeze time in
//      the same change. CLOSED by `checkoutDrive` below — the hold's deadline is re-frozen to a
//      FIXED instant and the page clock is driven to exactly 14:52 remaining.
//   3. OPENSTREETMAP TILES. `listing-map.tsx` fetches `https://{s}.tile.openstreetmap.org/...` at
//      runtime. `e2e/public-listing.spec.ts` keeps them out of its assertion path; a pixel baseline
//      cannot, because they are IN THE FRAME. CLOSED by `stubMapTiles` — every tile request is fulfilled
//      locally with one fixed flat SVG, so the map is offline, instant and identical every run.
//   4. TWO CAPTURES THAT DIFFER IN CONTENT RATHER THAN IN TOKENS. D-135's smoke is
//      `court.png !== grove.png`, and Task 3 asks a human to confirm the pair diverged for every
//      surface. Two different booking windows would diverge without a single token moving. CLOSED by
//      the slot allocation below: one FIXED window per (surface, width), shared by both themes.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// SLOT ALLOCATION ON THE FIXTURE'S DAY — 06:00-21:00 VENUE-LOCAL, TWO UNITS, AND WHY IT IS A TABLE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `playwright.config.ts` sets `fullyParallel: true`, so the two visual specs and every row inside them
// can run concurrently. Two drives that mint a hold over the same hours on the same unit are not a
// flake, they are a REFUSAL — and a refused hold on the checkout drive produces the collision surface
// instead, i.e. exactly the wrong baseline, minted green. So the windows are allocated once, here:
//
//   hours (venue-local, on VRT_COLLISION.dayIso)   who                                    holds
//   ---------------------------------------------  -------------------------------------  -----
//   09:00-11:00   the COMMITTED fixture's conflict, both units — never touched by a drive     2/2
//   12:00-13:00   surfaces.spec  collision-notice  (court then grove, SERIAL)                 0/2
//   14:00-15:00   surfaces.spec  checkout @ 320    (court then grove)                         2/2
//   15:00-16:00   surfaces.spec  checkout @ 1280   (court then grove)                         2/2
//   17:00-18:00   theme-swap     collision-notice  (court then grove, one test = serial)      0/2
//   18:00-19:00   theme-swap     checkout          (court then grove)                         2/2
//
// TWO PROPERTIES OF THAT TABLE ARE LOAD-BEARING AND NEITHER IS OBVIOUS:
//
//   • THE CHECKOUT ROWS NEED NO CLEANUP TO BE CORRECT. `unit_count` is 2, so a window carries exactly
//     two live holds — which is exactly the number of themes. A window per WIDTH (not per surface) is
//     what keeps the pair inside that budget, so a drive whose cleanup never ran still cannot make its
//     partner's hold be refused. Cleanup below is hygiene, not the mechanism.
//   • THE COLLISION ROWS DO NEED CLEANUP, AND THEREFORE SERIAL ORDER. Their window must be FREE when
//     the page loads (the server only seeds a selection over hours the read model says are available —
//     `seedSelectionFromWindow`, T-12-02-SEEDTRUST) and FULL a moment later. Court's conflict must
//     therefore be gone before grove's drive loads. Each drive also deletes its own prefix BEFORE
//     inserting, so a crashed predecessor is recovered from rather than inherited.
//
// ⚠ THE FIXTURE'S DAY IS A FIXED LITERAL AND SO HAS A SHELF LIFE. `scripts/seed-baseline-fixtures.ts`
// chose fixed dates over relative ones deliberately (a relative date shows up as a pixel diff on every
// dispatch and trains people to re-mint), and the cost is that once real time passes 2026-09-16 the
// window is in the PAST, `openOnSearchedDay` goes false and no selection is seeded. THE FAILURE IS
// LOUD: `expectSelectionSeeded` below names it in one sentence. The fix is the fixture's constants plus
// a re-dispatch — never a widened threshold and never a skip.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//   • IT CANNOT RUN OUTSIDE THE PINNED LINUX IMAGE, because nothing that imports it can: the `visual`
//     project is not constructed off Linux (D-29). Every claim below was reasoned from the shipped
//     specs it copies, not observed on a developer machine — which is why it copies rather than invents.
//   • THE HOLDS AND BOOKERS IT MINTS ARE NOT `vrt_%`, so `seed-baseline-fixtures.ts`'s `reset()` does
//     not sweep them. That is harmless where it matters (the dispatch job's database is destroyed with
//     the job) and is why `cleanup()` exists at all. The rows it INSERTS itself are `vrt_`-prefixed on
//     purpose, so a re-dispatch's reset does sweep those.
//   • A STUBBED TILE IS NOT A MAP. These baselines pin the map PANEL's box, its ring, its caption and
//     its attribution — not cartography. That is the right trade: a baseline of real tiles would pin
//     OpenStreetMap's rendering, which nobody in this project controls or reviews.

import { expect, type Locator, type Page } from "@playwright/test";
import postgres from "postgres";

// The committed fixture's constants — IMPORTED, never re-declared. That script's own header states the
// coupling this closes: the collision window is positioned relative to `VRT_CLOCK_ISO`, so a spec that
// re-typed either would drift silently. Importing it does NOT seed: `main()` sits behind a
// direct-execution guard at the bottom of that file for exactly this call site.
import {
  VRT_CLOCK_ISO,
  VRT_COLLISION,
  VRT_EXCLUSIVE_TITLE,
  VRT_HOST_ID,
  VRT_IDS,
  VRT_RIVAL_ID,
} from "../../scripts/seed-baseline-fixtures";
import {
  SPACE_TYPE_LABEL,
  openBookingSheet,
  readExpiresAt,
  signUpBooker,
  type SeededListing,
} from "./booker-seed";
import type { BaselineTheme, SurfaceId } from "../../src/lib/design/visual-baselines";

// The Playwright process does not load `.env`; the dev fallback matches `tests/helpers/db.ts` and
// `booker-seed.ts`. In the dispatch job this is the service container's own fixed pair.
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

/** The fixture's exclusive listing — every Phase-12 product surface is a view of this one row. */
const LISTING_ID = VRT_IDS.exclusive;

/** The remainder the checkout baseline is captured at, in ms. Same reading `hold-countdown.spec.ts` uses. */
const AT_14_52_MS = 14 * 60_000 + 52_000;

/**
 * ⚠ `page.clock.fastForward`'s REAL CEILING, and it is not documented anywhere in Playwright's API.
 *
 * The injected clock computes `shiftTicks(this._now.ticks, ticks | 0)`, and `| 0` is a signed 32-bit
 * cast — so any argument above 2^31-1 ms (~24.8 days) wraps NEGATIVE and the next line throws "Cannot
 * fast-forward to the past". MEASURED against the shipped `playwright-core`, not read off the docs:
 * `fastForward(2_147_483_647)` is accepted and `fastForward(2_147_483_648)` throws. `pauseAt` has no
 * such cast and can cross any distance — which is why the checkout drive pauses to its target and
 * fast-forwards only the last second. Named here because the truncation is invisible at the call site.
 */
const MAX_FAST_FORWARD_MS = 2_147_483_647;

/**
 * How far short of 14:52 the absolute pause lands, so there is a jump left to fire the countdown's
 * interval on. One second, because that is the countdown's own tick period — see the block in
 * `checkoutDrive.interact` for why a jump is needed at all after an absolute pause.
 */
const LAST_TICK_MS = 1_000;

/** The hold CTA family (12-10). Below `lg:` it is the sticky bar's `Book · {total}`; above, the rail's
 *  `Book this space`. Deliberately NOT `/^Book/`, which also collects `slot-picker.tsx`'s `Book full day`. */
const HOLD_CTA = /^Book(?: this space| · )/;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The shared context every drive receives
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * WHICH SPEC IS DRIVING, and it decides one thing only: which booking window this drive claims.
 *
 * `surfaces.spec.ts` and `theme-swap.spec.ts` run CONCURRENTLY (`fullyParallel: true`) and both need
 * the checkout and the collision surfaces. Two drives that claim the same hours are not a flake, they
 * are a REFUSAL — and a refused checkout drive photographs the collision surface instead. The
 * slot-allocation table in this file's header is the whole of the answer; this parameter is how a drive
 * reads its own row of it.
 */
export type DrivePurpose = "baseline" | "swap";

export type DriveContext = {
  readonly page: Page;
  readonly theme: BaselineTheme;
  /** The viewport width this row is captured at. Some drives are only reachable at some widths. */
  readonly width: number;
  /** A human label naming the row, so a failure says WHICH baseline was being driven. */
  readonly where: string;
};

/**
 * How a surface is captured. `fullPage` is Phase 11's default and stays the default.
 *
 * `viewport` exists for the two OVERLAY surfaces, and it is a correctness choice rather than a
 * preference: the lightbox and the sheet are `position: fixed` over a scroll-locked document, so a
 * full-page stitch scrolls a body that cannot scroll and pins a stitching artefact instead of the
 * overlay. The page BEHIND them is already baselined at the same widths by `listing-detail`.
 */
export type CaptureMode = "fullPage" | "viewport";

export type SurfaceDrive = {
  /**
   * Install a controlled clock BEFORE the first navigation.
   *
   * Playwright's own caveat, quoted in `e2e/hold-countdown.spec.ts` (this repository's first clock
   * user): "install the clock before navigating the page … This ensures that all timers run normally
   * during page loading, preventing the page from getting stuck." A clock installed after navigation
   * does not control the timers the page already created, and the countdown's `setInterval` is exactly
   * such a timer — the run would then be measuring a real fifteen-minute wall clock.
   */
  readonly needsClock: boolean;
  readonly captureMode: CaptureMode;
  /**
   * The per-test timeout this drive needs, in ms.
   *
   * A CEILING, NEVER A WAIT — raising it cannot make a failing capture pass, it only decides how long a
   * genuine hang is allowed to look like progress. The driven surfaces need a generous one because they
   * sign a booker up through the UI, place a real hold and wait on the dev server's on-demand compiles;
   * `hold-countdown.spec.ts` and `collision-in-place.spec.ts` set 120-180s for the same three reasons.
   */
  readonly timeoutMs: number;
  /**
   * The width `theme-swap.spec.ts` must use for this surface, when 1280 is not reachable.
   *
   * Only `listing-sheet` sets it: the sticky bar that opens the sheet is `lg:hidden`, so at 1280 there
   * is no trigger, no overlay and nothing to compare. A smoke that silently captured the page behind a
   * sheet that cannot exist would report two different frames and prove nothing about the sheet.
   */
  readonly swapWidth?: number;
  /** Everything up to and including the LAST document navigation. The freeze sheet is injected after. */
  navigate(ctx: DriveContext): Promise<void>;
  /** Post-freeze: put the surface into the state being captured. */
  interact?(ctx: DriveContext): Promise<void>;
  /** Undo whatever database rows this drive minted. Hygiene for the checkout; the MECHANISM for the collision. */
  cleanup?(ctx: DriveContext): Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Plumbing
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

type Sql = ReturnType<typeof postgres>;

/** One short-lived connection per drive, closed in a `finally`. A worker must not outlive its client. */
async function withSql<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * A `SeededListing` view of the COMMITTED fixture, so `booker-seed.ts`'s shipped helpers can be reused
 * verbatim instead of re-implemented here.
 *
 * ⚠ `teardown()` IS DELIBERATELY A NO-OP THAT ONLY CLOSES THE CONNECTION. Every other consumer of that
 * type owns the rows it seeded and tears them down; this one is a view of a fixture the CI job seeded
 * before Playwright started, and deleting the host would cascade to the listing, the photos, the hours
 * and the seeded conflict — i.e. it would destroy the fixture every other baseline in the run is being
 * compared against. The type demands the method; this is the honest implementation of it.
 */
function fixtureAsSeed(sql: Sql): SeededListing {
  return {
    hostId: VRT_HOST_ID,
    listingId: LISTING_ID,
    title: VRT_EXCLUSIVE_TITLE,
    // The fixture's exclusive listing is `martial_arts_boxing`, the same space type `booker-seed.ts`
    // labels — so a category filter narrows to it, should a future drive need one.
    spaceTypeLabel: SPACE_TYPE_LABEL,
    sql,
    bookerEmails: [],
    async teardown() {
      /* see the docstring: the fixture is not ours to delete */
    },
  };
}

/**
 * A flat, local, instant stand-in for every OpenStreetMap tile.
 *
 * SVG rather than a base64 PNG on purpose: the bytes are legible in this file, so a reader can see
 * exactly what the map region will contain, and there is no encoded blob to get subtly wrong. Served
 * for every tile request, so the map region is one uniform field in every capture.
 */
const TILE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' +
  '<rect width="256" height="256" fill="#e9e9e9"/></svg>';

/** Every tile URL `listing-map.tsx` builds: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. */
const TILE_URL = /tile\.openstreetmap\.org/;

/**
 * Stub the tiles, BEFORE navigating. Call it on every drive that renders `/listings/[id]`.
 *
 * A `route.abort()` was the cheaper spelling and is worse: a broken `<img>` inside Leaflet's tile pane
 * renders browser-dependent chrome (a broken-image glyph, or nothing, depending on the build), and
 * `leaflet-tile-loaded` never appears — so there would also be nothing deterministic to wait for.
 * Fulfilling means the map reaches a settled, waitable, identical state with no network at all.
 */
async function stubMapTiles(page: Page): Promise<void> {
  await page.route(TILE_URL, (route) =>
    route.fulfill({ status: 200, contentType: "image/svg+xml", body: TILE_SVG }),
  );
}

/**
 * Wait for the map to be SETTLED, not merely mounted.
 *
 * `listing-map-panel.tsx` loads the map through `next/dynamic({ ssr: false })` with a `Skeleton`
 * fallback, so the region passes through three states — skeleton, mounted-and-empty, tiled — and two of
 * them photograph fine. `freeze.css` stops the skeleton PULSING; it cannot make it not be the skeleton.
 * With the tiles stubbed, the third state arrives immediately, so this is a settle and not a hedge.
 */
async function expectMapSettled(page: Page, where: string): Promise<void> {
  await expect(
    page.locator("img.leaflet-tile-loaded").first(),
    `${where}: the listing map never painted a tile. With the tile route stubbed this cannot be a ` +
      "network problem, so either the dynamic import did not resolve (the region is still the " +
      "skeleton, which photographs perfectly well and would become the reference) or the tile URL in " +
      "`listing-map.tsx` no longer matches the pattern this helper intercepts.",
  ).toBeVisible({ timeout: 20_000 });
}

/** The listing URL for a drive: the row's own declared prefix plus, optionally, a searched window. */
function listingUrl(slot?: Slot): string {
  const base = `/listings/${LISTING_ID}?date=${VRT_COLLISION.dayIso}`;
  return slot === undefined ? base : `${base}&start=${slot.start}&end=${slot.end}`;
}

/**
 * The server really did seed the window the URL asked for.
 *
 * ⚠ THIS IS THE GUARD THAT MAKES THE TWO INTERACTIVE BOOKING SURFACES HONEST, and it is not the same
 * claim as "the page loaded". `seedSelectionFromWindow` returns null — silently, and correctly — when
 * ANY hour in the requested run is not `available`: taken, blocked, past, too soon, or outside the
 * host's operating hours. The page then renders the right day with an EMPTY selection and a DISABLED
 * CTA, which is a perfectly good listing page and a completely wrong basis for both drives below. The
 * checkout drive would have nothing to click; the collision drive would insert its conflict over hours
 * nobody selected and then photograph a page where the feature never fired.
 *
 * The enabled CTA is the observable that proves the selection registered, and the rail total is the
 * second half — a CTA can be enabled by a full-day selection that priced nothing.
 */
async function expectSelectionSeeded(page: Page, where: string): Promise<Locator> {
  const cta = page.getByRole("button", { name: HOLD_CTA });
  await expect(
    cta,
    `${where}: no reachable hold CTA on the listing page. Above \`lg:\` that is the rail's ` +
      "`Book this space`; below it, the sticky bar's `Book · {total}`, which only appears once a " +
      "window is selected. More than one means the placement that should be `hidden` is not.",
  ).toHaveCount(1, { timeout: 20_000 });
  await expect(
    cta,
    `${where}: the hold CTA is DISABLED, so the searched window was not seeded into the picker. The ` +
      "server only seeds a run it can see is free (T-12-02-SEEDTRUST), so the likely causes, in " +
      `order: the fixture's day ${VRT_COLLISION.dayIso} is now in the PAST (see this file's shelf-life ` +
      "note — the fix is the fixture's constants plus a re-dispatch), a concurrent drive is holding " +
      "these hours (check the slot-allocation table in this file), or the listing stopped being " +
      "bookable. This is a failure, not a skip: every drive under it would photograph the page one " +
      "step before the surface.",
  ).toBeEnabled({ timeout: 20_000 });
  return cta;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The windows, allocated once — see the table in this file's header
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

type Slot = { readonly start: string; readonly end: string };

const WINDOWS = {
  /** surfaces.spec's collision pair. Must be FREE at load and FULL a moment later. */
  collision: { start: "12:00", end: "13:00" },
  /** surfaces.spec's checkout pair at 320. Two themes, two units — the budget is exact. */
  checkout320: { start: "14:00", end: "15:00" },
  /** surfaces.spec's checkout pair at 1280. */
  checkout1280: { start: "15:00", end: "16:00" },
  /** theme-swap's collision captures, which run court-then-grove inside ONE test. */
  swapCollision: { start: "17:00", end: "18:00" },
  /** theme-swap's checkout captures. */
  swapCheckout: { start: "18:00", end: "19:00" },
} as const satisfies Record<string, Slot>;

/**
 * Which window a checkout row gets, keyed by the width it is captured at.
 *
 * PER WIDTH AND NOT PER ROW, which is the whole of the D-135 argument in one function: both themes of
 * one width must show the SAME booking window, or the pair diverges byte-wise because the content
 * differs and the smoke stops saying anything about the tokens.
 */
function checkoutWindow(width: number): Slot {
  return width <= 320 ? WINDOWS.checkout320 : WINDOWS.checkout1280;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The drives
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** `/listings/[id]` itself: stub the tiles, pin the day, wait for the map to settle. */
function listingDetailDrive(_purpose: DrivePurpose): SurfaceDrive {
  return {
    needsClock: false,
    captureMode: "fullPage",
    timeoutMs: 120_000,
    async navigate({ page }) {
      await stubMapTiles(page);
      await page.goto(listingUrl());
    },
    async interact({ page, where }) {
      await expectMapSettled(page, where);
    },
  };
}

/** The lightbox, opened on photo 1 of 8 — the hero, so the frame is the same one every dispatch. */
function lightboxDrive(_purpose: DrivePurpose): SurfaceDrive {
  return {
    needsClock: false,
    // The scrim is `position: fixed` over a scroll-locked body — see `CaptureMode`.
    captureMode: "viewport",
    timeoutMs: 120_000,
    async navigate({ page }) {
      await stubMapTiles(page);
      await page.goto(listingUrl());
    },
    async interact({ page, where }) {
      // The mosaic cell is addressed by the accessible name a booker's screen reader announces, which
      // is the form `e2e/photo-lightbox.spec.ts` uses: `{title} — photo {n} of {N}`.
      const cell = page.getByRole("button", {
        name: `${VRT_EXCLUSIVE_TITLE} — photo 1 of 8`,
        exact: true,
      });
      await expect(
        cell,
        `${where}: the mosaic rendered no photo-1 trigger. The fixture seeds EIGHT photos on this ` +
          "listing (the count is in the accessible name, so a fixture that seeded a different number " +
          "changes this string) and the mosaic wraps each cell's server-rendered `<img>` in a button.",
      ).toHaveCount(1, { timeout: 20_000 });

      // ⚠ THE CLICK IS RETRIED, AND IT IS A MEASURED REQUIREMENT RATHER THAN A HEDGE. The trigger is
      // server-rendered, so it EXISTS and is clickable well before React has attached its handler;
      // under load the click lands on a node on its way out and the event is LOST, not queued. Waiting
      // for the overlay afterwards would then hang until the timeout on a page with nothing wrong with
      // it. Same shape and same remedy as `openBookingSheet`, `advanceMonth` and
      // `collision-in-place.spec.ts` step 3. Retrying is safe here because opening a lightbox mutates
      // nothing.
      const lightbox = page.locator('[data-testid="photo-lightbox"]');
      await expect
        .poll(
          async () => {
            if ((await lightbox.count()) > 0) return true;
            await cell.click({ timeout: 5_000 }).catch(() => {});
            return (await lightbox.count()) > 0;
          },
          {
            timeout: 30_000,
            message:
              `${where}: tapping the first mosaic cell never opened the lightbox. A persistent ` +
              "failure here is not a lost click — it means the cell is not wired to the dialog, and " +
              "the capture would otherwise be a baseline of the listing page under the lightbox's name.",
          },
        )
        .toBe(true);
      await expect(lightbox).toBeVisible();
    },
  };
}

/** The booking sheet at 375, opened through the sticky bar's own trigger. */
function sheetDrive(_purpose: DrivePurpose): SurfaceDrive {
  return {
    needsClock: false,
    captureMode: "viewport",
    timeoutMs: 120_000,
    // 1280 has no sticky bar and therefore no sheet — see `swapWidth`'s docstring.
    swapWidth: 375,
    async navigate({ page }) {
      await stubMapTiles(page);
      // NO `start`/`end` HERE, AND THAT IS LOAD-BEARING. `openBookingSheet` presses `Check
      // availability`, which is the bar's only action while nothing is selected — D-59 #3 REPLACES it
      // with the hold submission the moment a window is picked. A seeded selection would therefore
      // delete the very trigger this drive needs.
      await page.goto(listingUrl());
    },
    async interact({ page, where }) {
      // The shipped helper, retry and failure message included, rather than a second copy of it.
      const sheet = await openBookingSheet(page, where);
      await expect(
        sheet.locator('[data-testid="booking-panel"]'),
        `${where}: the sheet opened but holds no booking panel, so RESP-02's duplicate is not what is ` +
          "inside the overlay. A capture now would pin an empty sheet.",
      ).toHaveCount(1);
    },
  };
}

/**
 * The checkout, and the first frozen clock in this inventory.
 *
 * FOUR STEPS, AND THE ORDER OF THE FIRST TWO IS THE API'S OWN CAVEAT: install the clock, then sign up
 * (the signup navigation is the first `goto` of the flow). Then land a real hold through the shipped
 * POST path — never a hand-written booking row, because the quote on this surface is the SERVER-FROZEN
 * one (D-49) and a fixture that computed its own would be baselining arithmetic nobody ships.
 */
function checkoutDrive(purpose: DrivePurpose): SurfaceDrive {
  let holdId: string | null = null;
  let bookerEmail: string | null = null;

  return {
    needsClock: true,
    captureMode: "fullPage",
    timeoutMs: 240_000,
    async navigate(ctx) {
      const { page, where, width } = ctx;
      const slot = purpose === "swap" ? WINDOWS.swapCheckout : checkoutWindow(width);

      await withSql(async (sql) => {
        const seed = fixtureAsSeed(sql);
        bookerEmail = await signUpBooker(page, seed);

        await page.goto(listingUrl(slot));
        const cta = await expectSelectionSeeded(page, where);
        await cta.click();

        await page.waitForURL(/\/book\?hold=/, { timeout: 30_000 });
        const id = new URL(page.url()).searchParams.get("hold");
        expect(
          id,
          `${where}: the hold CTA did not redirect to a \`?hold=\` id. If the URL is still the ` +
            "listing page the hold was REFUSED, which means these hours were already taken — check " +
            "the slot-allocation table in this file before assuming a product defect.",
        ).toBeTruthy();
        holdId = id;

        // ⚠ THE DEADLINE IS RE-FROZEN TO A FIXED INSTANT, AND THAT IS THE OPPOSITE OF A CHEAT.
        //
        // Two things on this surface come from the clock: the header's REMAINDER and the page's own
        // deadline label, which `book/page.tsx` composes server-side from this column. A real hold's
        // `expires_at` is `now() + 15 minutes`, so that label reads a different time on every dispatch
        // — a guaranteed pixel diff, on a surface whose baseline exists to catch pixel diffs.
        //
        // Setting it to the fixture's own `VRT_CLOCK_ISO` makes BOTH deterministic and mutually
        // consistent: the label reads that instant, and the clock is then driven to exactly 14:52
        // before it, so the frame is byte-for-byte the frame a real hold shows at 14:52 remaining. It
        // is also the constant `seed-baseline-fixtures.ts`'s header requires the spec to install, so
        // the fixture and the drive cannot drift onto two different instants.
        await sql`
          UPDATE booking SET expires_at = ${VRT_CLOCK_ISO}::timestamptz WHERE id = ${holdId}
        `;
        // …and reload so the page publishes the new deadline into the header. WITH THE CLOCK RUNNING:
        // a navigation under a PAUSED clock fires no timers and can hang React's scheduler.
        await page.reload();
      });
    },

    async interact({ page, where }) {
      await expect(
        page.getByTestId("price-total"),
        `${where}: the checkout body has not resolved — \`book/loading.tsx\`'s skeleton is still up, ` +
          "and its `<h1>` is identical to the resolved page's (measured in `hold-countdown.spec.ts`), " +
          "so nothing weaker than the total can tell them apart.",
      ).toHaveCount(1, { timeout: 30_000 });

      const expiresAt = await withSql((sql) => readExpiresAt(fixtureAsSeed(sql), holdId as string));
      const pageNow = await page.evaluate(() => Date.now());
      expect(
        expiresAt - pageNow,
        `${where}: the re-frozen hold has ${Math.round((expiresAt - pageNow) / 1000)}s left, which is ` +
          "already past the 14:52 this capture has to reach. A fake clock only moves forward. This is " +
          `the shelf-life failure: ${VRT_CLOCK_ISO} is no longer in the future.`,
      ).toBeGreaterThan(AT_14_52_MS + 60_000);

      // ⚠ THE PAUSE CARRIES THE WHOLE DISTANCE AND THE `fastForward` CARRIES ONE SECOND. THAT SPLIT IS
      // THE FIX FOR THE FIRST-RUN FAILURE IN CI 32228371235, AND BOTH HALVES ARE MEASURED.
      //
      // WHAT BROKE. `pauseAt(pageNow + 1_000)` used to leave the clock at REAL now, so the jump to the
      // re-frozen deadline had to be carried by `fastForward(delta)` — and `delta` is the distance from
      // real now to `VRT_CLOCK_ISO`, i.e. WEEKS. Playwright truncates that argument:
      // `fastForward(ticks)` computes `shiftTicks(this._now.ticks, ticks | 0)`, and `| 0` is a 32-bit
      // SIGNED cast. Measured locally against the shipped `playwright-core`: `fastForward(2_147_483_647)`
      // is accepted, `fastForward(2_147_483_648)` throws, and the real delta of 2_316_858_550 ms became
      // -1_978_108_746 ms — so the very next line inside Playwright rejected it as "Cannot fast-forward
      // to the past". The two guards above were INNOCENTLY TRUE: `delta` really was positive, and the
      // wrap happens after they run, inside the browser-side clock. That is why neither fired.
      //
      // WHY THE PAUSE CAN CARRY IT. `pauseAt(instant)` computes `toConsume = time - this._now.time` with
      // NO `| 0` and hands it straight to the same forward-only check, so an absolute pause crosses weeks
      // that `fastForward` cannot. Measured: `pauseAt` to `VRT_CLOCK_ISO - 14:52 - 1s` lands the page
      // clock exactly there.
      //
      // WHY THERE IS STILL A `fastForward` AT ALL. Plan 12-03's measurement stands: `pauseAt(<absolute
      // instant>)` alone did NOT move the digits — the countdown's interval was due a second after mount,
      // the one tick it is allowed to fire ran at its own scheduled time, and the slot still read the
      // un-jumped remainder. `fastForward` from an ALREADY-PAUSED clock does land the tick on the jumped
      // instant. So the pause stops one second short of the target and the jump covers that second.
      //
      // The delta is now EXACT rather than nearly exact, which is the other thing this buys: it is
      // computed from `expiresAt` (a database constant) instead of from a `Date.now()` read while the
      // clock was still running, so no real milliseconds can slip in between the read and the jump.
      await page.clock.pauseAt(new Date(expiresAt - AT_14_52_MS - LAST_TICK_MS));
      const frozenNow = await page.evaluate(() => Date.now());
      const delta = expiresAt - AT_14_52_MS - frozenNow;
      expect(delta, `${where}: reaching 14:52 needs the clock to move ${delta}ms, which is backwards`)
        .toBeGreaterThan(0);
      // THE GUARD THAT SHOULD HAVE CAUGHT THE FIRST-RUN FAILURE AND DID NOT EXIST. `> 0` is not the
      // precondition `fastForward` actually has — its precondition is `> 0 AND within a signed 32-bit
      // int`, because of the `| 0` above. Asserting the ceiling here turns Playwright's opaque "Cannot
      // fast-forward to the past" into the sentence that names the cause, and it can only ever fail on a
      // clock that was installed too far from the deadline — never on a correct one, where the distance
      // is `LAST_TICK_MS`.
      expect(
        delta,
        `${where}: the jump to 14:52 is ${delta}ms, past the ${MAX_FAST_FORWARD_MS}ms ceiling ` +
          "`page.clock.fastForward` silently truncates to (it casts its argument with `| 0`, a signed " +
          "32-bit int, so anything larger WRAPS NEGATIVE and is then rejected as \"the past\"). The " +
          "pause above is what is supposed to carry the distance; if this fails, the pause did not land " +
          "where it was aimed.",
      ).toBeLessThanOrEqual(MAX_FAST_FORWARD_MS);
      await page.clock.fastForward(delta);

      // The determinism claim, ASSERTED rather than commented. A checkout baseline whose digits were
      // not driven is a reference every future run disagrees with, and the fix people reach for is a
      // wider threshold — which is a gate quietly reduced (`freeze.css`'s header says exactly this).
      await expect(
        page.getByTestId("hold-countdown"),
        `${where}: the countdown did not reach 14:52, so the clock freeze did not take and this ` +
          "capture would be a guaranteed flake. Observed: " +
          `"${(await page.getByTestId("hold-countdown").textContent()) ?? ""}"`,
      ).toContainText("14:52");
    },

    async cleanup() {
      // Hygiene, not the mechanism — see the slot table's first load-bearing property. Order matters:
      // `booking.booker_id` is ON DELETE RESTRICT, so the hold goes before the booker.
      await withSql(async (sql) => {
        if (holdId !== null) {
          await sql`DELETE FROM notification WHERE booking_id = ${holdId}`;
          await sql`DELETE FROM booking WHERE id = ${holdId}`;
        }
        if (bookerEmail !== null) {
          await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
        }
      });
    },
  };
}

/**
 * STATE-07's collision notice, fired deterministically.
 *
 * ⚠ THE COMMITTED FIXTURE'S OWN CONFLICT CANNOT DRIVE THIS SURFACE, AND THE REASON IS WORTH STATING
 * BECAUSE IT LOOKS LIKE IT SHOULD. `seed-baseline-fixtures.ts` seeds 09:00-11:00 as `confirmed` on BOTH
 * units, so those hours render as already taken: the picker will not let a booker select them, the CTA
 * stays disabled, and there is no hold to refuse. A collision is a LOST RACE — it needs hours that are
 * free when the page loads and taken when the button is pressed. So this drive borrows the fixture's
 * SHAPE (same columns, same `unit`, same cast, both units, `confirmed`) over its OWN window, inserted
 * BETWEEN the load and the click, exactly as `e2e/collision-in-place.spec.ts` does.
 *
 * BOTH UNITS, AND THAT IS THE FIXTURE'S OWN LESSON: the GiST `EXCLUDE` arbitrates per (listing, unit),
 * so one confirmed row on a two-unit listing leaves unit 2 free and the hold SUCCEEDS — and the
 * baseline is then a picture of the feature not firing.
 *
 * ⚠ AND IT NEEDS A SIGNED-IN BOOKER, WHICH IS WHAT THIS DRIVE WAS MISSING ON ITS FIRST RUN (CI
 * 32228371235). A COLLISION IS THE SECOND-TO-LAST GATE `placeHold` APPLIES, NOT THE FIRST: the action
 * opens with the D-41 session gate and returns `reason: "sign-in"` to an anonymous caller, at which point
 * `book-cta.tsx` pushes `/login?callbackURL=…` and NO HOLD IS EVER ATTEMPTED. The picker still seeds, the
 * rail still prices and the CTA is still enabled — an anonymous booker is *allowed* to press Book, they
 * are just sent to sign in first — so `expectSelectionSeeded` passes and the drive walks into a 45s poll
 * for a notice that nothing can produce. `e2e/collision-in-place.spec.ts` signs a booker up before its
 * first `goto` for this reason, and so does `checkoutDrive` above; this drive did not, and it was the only
 * driven surface that touched the hold path without one.
 */
function collisionDrive(purpose: DrivePurpose): SurfaceDrive {
  const idPrefix = purpose === "swap" ? "vrt_swap_coll" : "vrt_vis_coll";
  const slot = purpose === "swap" ? WINDOWS.swapCollision : WINDOWS.collision;
  let bookerEmail: string | null = null;
  return {
    needsClock: false,
    captureMode: "fullPage",
    timeoutMs: 240_000,
    async navigate({ page, theme, where }) {
      await stubMapTiles(page);

      await withSql(async (sql) => {
        // THE SESSION, FIRST — before the listing `goto`, because signing up navigates. The shipped
        // helper, so this drive authenticates by the same path the functional specs do rather than by a
        // hand-written session row. Its booker mints nothing here (every submit below is refused), but it
        // is still deleted in `cleanup` so a re-dispatch does not accumulate one user per capture.
        bookerEmail = await signUpBooker(page, fixtureAsSeed(sql));

        // Delete BEFORE inserting, not only after capturing. The two themes share one window (D-135 —
        // see the header), so a crashed predecessor would otherwise leave the window full and the next
        // drive would fail at `expectSelectionSeeded` for a reason that has nothing to do with the
        // tree. `vrt_`-prefixed so a re-dispatch's `reset()` sweeps whatever survives.
        await sql`DELETE FROM booking WHERE id LIKE ${idPrefix + "_%"}`;

        await page.goto(listingUrl(slot));
        await expectSelectionSeeded(page, where);
        // GUARD THE GUARD: the price the collision has to remove really is on the rail first. Copied
        // from `collision-in-place.spec.ts` — without it, a rail that never priced anything looks the
        // same afterwards as one the notice emptied.
        await expect(
          page.locator('[data-testid="rail-price-total"]'),
          `${where}: the rail priced nothing, so there is nothing for the collision to take away.`,
        ).toHaveCount(1);

        for (const unit of [1, 2]) {
          await sql`
            INSERT INTO "booking" (id, listing_id, unit, booker_id, starts_at, ends_at, status, created_at)
            VALUES (
              ${`${idPrefix}_${theme}_u${unit}`}, ${LISTING_ID}, ${unit}, ${VRT_RIVAL_ID},
              ${`${VRT_COLLISION.dayIso}T${slot.start}:00+08:00`}::timestamptz,
              ${`${VRT_COLLISION.dayIso}T${slot.end}:00+08:00`}::timestamptz,
              ${"confirmed"}::booking_status, now()
            )
          `;
        }
      });
    },

    async interact({ page, where }) {
      const cta = page.getByRole("button", { name: HOLD_CTA });
      const notice = page.locator('[data-testid="collision-notice"]');

      // ⚠ RETRIED, for the fourth-sighting reason recorded above — and retrying is safe here in a way
      // it would not be on a green path: every submit in this drive is REFUSED, so no click can mint a
      // hold. The poll bails the moment the URL leaves the listing, because that is what a GRANTED hold
      // looks like, and a granted hold is a fixture failure rather than something to retry through.
      //
      // ⚠ THE `navigated` VALUE CARRIES THE URL, AND THAT IS THE LESSON OF CI 32228371235. This poll
      // returned a bare `"navigated"` for 45 seconds while the message below offered two hypotheses —
      // hold-succeeded, or plain-notice branch — and the truth was a THIRD one it did not name: the drive
      // had no session, so the click went to `/login?callbackURL=…` and no hold was ever attempted.
      // `expect.poll` prints the received value, so putting the destination INSIDE it is what makes the
      // three outcomes tell themselves apart in the log: `/listings/…/book?hold=` is a granted hold,
      // `/login?…` is a missing session, and `pending` is a page that stayed put with no notice on it.
      await expect
        .poll(
          async () => {
            if ((await notice.count()) > 0) return "notice";
            const url = page.url();
            if (!url.includes(`/listings/${LISTING_ID}`)) return `navigated → ${url}`;
            await cta.click({ timeout: 5_000 }).catch(() => {});
            return (await notice.count()) > 0 ? "notice" : "pending";
          },
          {
            timeout: 45_000,
            message:
              `${where}: no collision notice. Read the RECEIVED value: \`pending\` means the page stayed ` +
              "on the listing and never rendered the notice — either the hold SUCCEEDED (the inserted " +
              "conflict did not occupy the hours that were selected) or the refusal took the plain-notice " +
              "branch instead of D-55's in-place one. `navigated → …` names where it went instead: a " +
              "`/book?hold=` URL is a GRANTED hold and therefore a fixture failure, and a `/login` URL " +
              "means the click hit `placeHold`'s D-41 session gate, i.e. this drive lost its signed-in " +
              "booker and never reached the collision at all. The click is retried because a " +
              "server-rendered control is clickable before it is interactive; a persistent failure here " +
              "is not a lost click.",
          },
        )
        .toBe("notice");

      // Stated separately from the poll so a granted hold reports ITSELF rather than reading as a
      // missing element on a page that has silently become the checkout.
      expect(
        page.url(),
        `${where}: the hold was granted — the inserted conflict did not take.`,
      ).toContain(`/listings/${LISTING_ID}`);

      await expectMapSettled(page, where);
    },

    async cleanup({ theme }) {
      await withSql(async (sql) => {
        // ORDER MATTERS for the same reason it does on the checkout drive: `booking.booker_id` is ON
        // DELETE RESTRICT. The conflict rows belong to the RIVAL and are the mechanism (see the slot
        // table's second load-bearing property), so they go first regardless; the signed-up booker owns
        // no bookings here — every submit was refused — but is deleted so a re-dispatch does not
        // accumulate one user per capture.
        await sql`DELETE FROM booking WHERE id LIKE ${`${idPrefix}_${theme}_%`}`;
        if (bookerEmail !== null) {
          await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
        }
      });
    },
  };
}

/**
 * `bookings/[id]/not-found` — the ONE Phase-13 surface that is shot (plan 13-15).
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════════════
 * WHY IT NEEDS A DRIVE AT ALL, WHEN ITS URL IS A PLAIN PATH
 * ═════════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * `newDrive`'s default — navigate to the declared URL and shoot — is what every Phase-11 surface uses,
 * and it is exactly wrong here. This route lives under `(app)`, whose layout redirects an
 * unauthenticated visit to `/login`; the default drive would therefore photograph the LOGIN PAGE and
 * file it under this surface's name. The reachability hook is what stops that becoming a baseline
 * (`/login` renders no `empty-state`), but a hook can only fail the run — it cannot produce a session.
 * So the drive signs a booker up first, exactly as `checkoutDrive` and `collisionDrive` do, and for the
 * same D-41 reason those two record.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THIS ONE IS DETERMINISTIC WHEN THE OTHER ELEVEN PHASE-13 SURFACES ARE NOT
 * ═════════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * Every other Phase-13 surface is a view of a BOOKING, and a per-run seed puts three moving values in
 * frame: the TRUST-02 reference (a SHA-256 over a `randomUUID()`-suffixed id), the session window (a
 * `now()`-relative `starts_at`), and — on the moment and the pending state — the booker's own per-run
 * email address. `visual-baselines.ts` blocks all eleven on that, with the fixture named as the fix.
 *
 * This surface renders NONE of them: it is `EmptyState`'s glyph, heading, one line of copy and one
 * action, inside the signed-in shell. The booker the drive mints is not in the frame — the header
 * carries `Bookings`, a `Profile` link whose visible label is a literal, and a notification bell that
 * is empty for a user seconds old. The URL is a sentence-shaped literal that must never become a real
 * id, in the shape `root-not-found` already uses and for its stated reason.
 *
 * ⚠ THE ONE THING THAT WOULD BREAK IT is the shell starting to render the signed-in user's name or
 * email. That is not hypothetical — `AUTH_SLOT_BOX`'s docstring describes the widest resolved state as
 * "an avatar plus a name" — so if this baseline ever goes red across both themes with nothing else
 * changed, look at the header before looking at the boundary.
 */
function bookingNotFoundDrive(_purpose: DrivePurpose, url: string | null): SurfaceDrive {
  let bookerEmail: string | null = null;

  return {
    needsClock: false,
    captureMode: "fullPage",
    // Generous for the same two reasons `checkoutDrive` gives: a UI signup plus the dev server's
    // on-demand compile of two routes. A ceiling, never a wait.
    timeoutMs: 120_000,
    async navigate({ page, where }) {
      await withSql(async (sql) => {
        // The shipped helper rather than a hand-written session row, so this drive authenticates by
        // the same path the functional specs do. It mints nothing else — no listing, no booking.
        bookerEmail = await signUpBooker(page, fixtureAsSeed(sql));
      });
      expect(
        url,
        `${where}: this surface declares no URL, so there is nothing to navigate to. The row is not ` +
          "blocked, so a null here is an inventory error rather than a decision.",
      ).not.toBeNull();
      await page.goto(url as string);
    },
    async cleanup() {
      // The booker owns no bookings — nothing on this path can mint one — so there is no FK order to
      // respect. Deleted anyway so a re-dispatch does not accumulate one user per capture, which is
      // `collisionDrive`'s stated reason for the same line.
      await withSql(async (sql) => {
        if (bookerEmail !== null) {
          await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
        }
      });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The registry the specs read
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A drive per surface that needs one. A surface with NO entry is reached by a plain `goto` of its
 * declared `url` and captured `fullPage` — which is every Phase-11 surface and the two search surfaces.
 *
 * FACTORIES RATHER THAN OBJECTS, because two of the drives carry per-invocation state (the hold id, the
 * booker's email, the conflict rows' theme). A shared singleton would leak one row's hold into the next
 * row's cleanup, and the two rows that share a window are exactly the pair where that matters.
 */
const DRIVES: Partial<
  Record<SurfaceId, (purpose: DrivePurpose, url: string | null) => SurfaceDrive>
> = {
  "listing-detail": listingDetailDrive,
  "listing-lightbox": lightboxDrive,
  "listing-sheet": sheetDrive,
  checkout: checkoutDrive,
  "collision-notice": collisionDrive,
  // ⚠ THE FIRST DRIVE THAT NEEDS THE ROW'S OWN URL, which is why the signature grew a second
  // parameter in plan 13-15. The five above all address the fixture's listing and compose their paths
  // from `LISTING_ID`; this one navigates to a literal declared in `visual-baselines.ts`, and
  // re-typing that literal here is exactly the drift `FIXTURE_URL_CONTRACT` below exists to close for
  // the Phase-12 rows. Passing it through means there is one spelling of the path in the repository.
  "booking-not-found": bookingNotFoundDrive,
};

/** The default: navigate to the declared URL, capture the whole page, compare at 1280. */
export function newDrive(
  surfaceId: SurfaceId,
  url: string | null,
  purpose: DrivePurpose = "baseline",
): SurfaceDrive {
  const factory = DRIVES[surfaceId];
  if (factory !== undefined) return factory(purpose, url);
  return {
    needsClock: false,
    captureMode: "fullPage",
    // Phase 11's eleven surfaces are one navigation and one hook. 60s rather than Playwright's 30s
    // default only because the dev server compiles a route on demand on the first hit.
    timeoutMs: 60_000,
    async navigate({ page }) {
      await page.goto(url as string);
    },
  };
}

/**
 * The surfaces whose rows must run SEQUENTIALLY, in one worker.
 *
 * ONE ENTRY, AND IT IS NOT A PERFORMANCE CHOICE. `collision-notice`'s two rows share one window that
 * must be free at load and full at click, so court's conflict has to be gone before grove's drive
 * loads. Run in parallel they would delete each other's conflict mid-flight and the failure would look
 * like an intermittent product defect. Everything else in the inventory is parallel-safe by
 * construction — see the slot-allocation table.
 */
export const SERIAL_SURFACES: readonly SurfaceId[] = ["collision-notice"];

/** The theme-swap smoke's viewport width for one surface. 1280 unless the surface cannot exist there. */
export function swapWidthFor(surfaceId: SurfaceId): number {
  // `null` for the url on purpose: this function constructs a drive ONLY to read its declared
  // `swapWidth`, never to run it, and no factory touches the url outside `navigate`. Passing a real
  // path here would imply this call site knows which surface it is asking about, which it does not.
  return DRIVES[surfaceId]?.("swap", null).swapWidth ?? 1280;
}

/**
 * The fixture ids the inventory spells as URL literals, so a rename fails a spec instead of a dispatch.
 *
 * `visual-baselines.ts` lives in `src/` and cannot import `scripts/seed-baseline-fixtures.ts` (that
 * module imports `postgres`, and `src/` is inside `next build`'s graph), so the exclusive listing's id
 * necessarily appears in both files. The fixture's own header names this as the drift `tsc` cannot see:
 * "renaming one orphans a declared surface, because a baseline row's URL is a string." This is the
 * closure — asserted in the spec, in the run that would otherwise baseline a 404.
 */
export const FIXTURE_URL_CONTRACT = {
  listingId: LISTING_ID,
  dayIso: VRT_COLLISION.dayIso,
  title: VRT_EXCLUSIVE_TITLE,
} as const;
