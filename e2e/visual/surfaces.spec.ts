import { expect, test, type Page } from "@playwright/test";

import { seedTheme } from "../helpers/theme";
import { emulateVisualMedia, injectFreezeStylesheet } from "../helpers/visual-freeze";
import {
  FIXTURE_URL_CONTRACT,
  newDrive,
  SERIAL_SURFACES,
} from "../helpers/visual-drive";
import {
  baselineArg,
  blockedSurfaces,
  VISUAL_BASELINES,
  VISUAL_SURFACES,
  type BaselineRow,
} from "../../src/lib/design/visual-baselines";

// GATE-01 — the comparison half. One test per declared baseline, driven off
// `src/lib/design/visual-baselines.ts` rather than off whatever PNGs happen to be on disk.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THIS FILE CANNOT RUN ON A DEVELOPER MACHINE, AND THAT IS THE DESIGN (D-27 / D-29)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `playwright.config.ts` does not CONSTRUCT the `visual` project off Linux — not "declares it and
// skips it", does not construct it — so `npx playwright test --project=visual` here errors with
// `Project(s) "visual" not found`, and a plain `npx playwright test` never collects this file at all.
// Baselines are generated and compared ONLY inside `mcr.microsoft.com/playwright:v1.60.0-noble`, by
// the same runner, so author-vs-CI drift is structurally impossible rather than merely discouraged.
//
// The one thing that CAN write a baseline is the `--update-snapshots` CLI flag, and it exists in
// exactly one place in this repository: `.github/workflows/baselines.yml`'s `workflow_dispatch` job.
// `playwright.config.ts` sets `updateSnapshots: "none"` UNCONDITIONALLY (D-28), so no run on any
// machine — including this one, including CI job 1 — can mint a PNG. Measured behaviour under that
// setting (11-RESEARCH Finding 4): a missing baseline writes ZERO files, the error loses its
// `, writing actual.` clause, and the failure is RETRIABLE, so it stays red across every attempt.
// That last property is the whole point: under Playwright's default `"missing"` the same situation
// writes the PNG and the next bare re-run is GREEN with no code change, which is the textbook rubber
// stamp — nobody investigates a gate that passes when you press the button again.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE TRAP THIS FILE IS BUILT AROUND, AND IT IS THE WORST ONE IN THE PHASE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A screenshot assertion against a blank page, a 404, a 500 or a still-compiling route DOES NOT
// FAIL. On the run that has no baseline it mints one — of the wrong page — and every run afterwards
// compares against it and passes forever. Every other vacuity this phase has recorded (six-plus
// scan-of-nothing passes) at least stayed green *without* creating evidence; this one manufactures
// the evidence.
//
// So EVERY row declares a `hook` selector with the reason it proves the surface rendered its
// SUBJECT, `expectReachable` runs before any pixel is read, and the three image rows additionally
// assert an HTTP 200, an `image/png` content type and a decoded 1200 × 630 — a 404 body decodes to
// 0 × 0, so that check cannot be satisfied by an error page.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AND ONE INHERITED TRAP — STALE CSS FROM A REUSED DEV SERVER, WHICH IS WORSE HERE THAN ANYWHERE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Copied from `e2e/scroll-area-overflow.spec.ts:49-56`, which took it from `reduced-motion.spec.ts`
// trap 4, and carried here on plan 11-03's explicit instruction (`11-03-SUMMARY.md` § Next Phase
// Readiness):
//
//   `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, and the dev server is what
//   serves the compiled stylesheet. A server left running across a `git checkout` of a component can
//   keep serving CSS that no longer matches the tree. IF THIS FILE FAILS ON A CLEAN `git status`,
//   KILL THE SERVER ON :3000 AND RE-RUN BEFORE TOUCHING THE COMPONENT.
//
// IN THE VISUAL PROJECT THE ESCALATION IS THE POINT. Everywhere else a stale server causes a false
// RED, which is annoying and self-correcting. Here, on a `--update-snapshots` run, it causes a
// BASELINE CAPTURED FROM STALE CSS — a reference that is wrong forever, that every future run agrees
// with, and that no gate in this repository can detect. That is why `reuseExistingServer` is false
// on CI (`!process.env.CI`) and why the dispatch job runs in a fresh container: the only machine
// allowed to write a baseline is the one that cannot have a stale server.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 12 ADDED TWO THINGS THIS FILE DID NOT HAVE, AND BOTH ARE IN `e2e/helpers/visual-drive.ts`
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// (1) A PER-SURFACE DRIVE. Every Phase-11 surface was one `goto` away. Four of Phase 12's seven are
// STATES rather than URLs — an opened lightbox, an opened sheet, a checkout behind a `?hold=` that
// only a POST can mint, and a hold that has just been REFUSED — so the navigation, the interaction,
// the timeout and the capture mode are per-surface. They live in a HELPER rather than here because
// `theme-swap.spec.ts` needs the same drives and a spec cannot import a spec (`visual-freeze.ts`'s
// header records the mechanism). Read that helper's slot-allocation table before adding a row: two
// drives that mint a hold over the same hours produce a REFUSAL, and a refused checkout drive
// photographs the collision surface instead — the wrong baseline, minted green.
//
// (2) THE FIRST FROZEN CLOCK. `e2e/visual/freeze.css`'s header names this phase's countdown in
// advance and says the first surface that renders a clock must freeze one IN THE SAME CHANGE that
// baselines it. `checkout` does: the drive installs the clock BEFORE the first navigation (Playwright's
// own caveat, quoted in `e2e/hold-countdown.spec.ts`, this repository's first clock user), re-freezes
// the hold's deadline to the fixture's fixed instant, and jumps the frozen clock to exactly 14:52
// remaining — asserted, not assumed, before any pixel is compared.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • TWENTY-ONE OF THE 51 DECLARED ROWS ARE BLOCKED and are skipped with their reasons
//     (`global-error`, plus twenty Phase-13 rows across eleven surfaces). A complete run therefore
//     compares 30 baselines. The blocked SET is pinned by the first test below, so a surface joining
//     it is a failure rather than a quieter run.
//   • THE INVENTORY IS COURT ONLY (D-138). Until 23 August 2026 every surface here was shot in both
//     themes and the diff between the two was a standing check that the surface read its tokens.
//     `court` is now the single product theme, the 44 grove rows and 24 grove PNGs are gone, and
//     that check survives for FOUR surfaces only, in `e2e/visual/theme-swap.spec.ts`. Nothing in
//     THIS file compares two themes any more.
//   • A baseline pins WHAT WAS SHOT, including a defect present on the day it was shot. Nothing here
//     knows what a surface should look like. The surfaces chosen are ones whose correctness is
//     separately asserted (contrast, type scale, skeleton geometry, the 320px floor).
//   • It compares a rendering of the DEVELOPMENT server. `next dev` and `next build` can differ
//     (chunking, the dev overlay `freeze.css` hides, unminified CSS ordering). This gate protects
//     against change, not against a dev/prod divergence.
//   • The `hook` is a floor, not a description: it proves the subject mounted, not that the rest of
//     the page did.
//   • ⚠ A CHANGE CONFINED TO `--border` ON `--background` IS INVISIBLE HERE. Measured 2026-08-17
//     while driving D-30's second OBSERVED RED, and it is the reason that proof failed 18 baselines
//     rather than the 20 the plan predicted. `toHaveScreenshot`'s default `threshold` is 0.2, which
//     pixelmatch turns into a per-pixel cutoff of `35215 * 0.2^2 = 1408.6` on YIQ deltaSquared. The
//     border/background pair measures **341.6** in court (`rgb(229,229,229)` on `rgb(255,255,255)`)
//     and **397.2** in grove — four times under the cutoff, so those pixels are not counted as
//     different at all. It is the same pair `src/lib/design/contrast-pairs.ts` carries in
//     `EXCLUDED_PAIRS` at 1.26:1 / 1.28:1 because it is a nearly invisible decorative divider; a
//     gate cannot see what a person cannot see, and the two facts have the same cause.
//
//     The default is kept ON PURPOSE. Driving `threshold` toward 0 would make font antialiasing a
//     failure on every run, and a gate that cries wolf is retried until green — the exact outcome
//     this phase exists to remove. So the blind spot is recorded rather than closed. The practical
//     consequence, stated plainly: **a regression that only moves a divider will not be caught
//     here — AND NOTHING ELSE CATCHES IT EITHER. There is no compensating control.**
//
//     An earlier draft of this footer said there was one: that the design gate covered the gap by
//     asserting divider geometry on the emitted stylesheet. IT NEVER DID, and the claim is deleted
//     rather than left standing, because a stated reason that has quietly become false is worse
//     than no reason — and a compensating control that does not exist is exactly how a blind spot
//     gets read as covered. Re-searched 2026-08-17, and what is actually there:
//       • `config/design-leak-patterns.mjs` has five categories (`raw-hex`, `color-function`,
//         `arbitrary-text-px`, `palette-class`, `white-black-class`). Every one of them bans a raw
//         design VALUE. None of them looks at an edge's THICKNESS, so an arbitrary edge-width
//         utility passes the leak gate untouched.
//       • The `tests/design/*.test.ts` files that do read the compiled stylesheet assert colour
//         pairs, the z scale, the motion budget, the font cycle, theme nesting and the type scale.
//         Not one asserts how many pixels wide an edge is.
//       • `site-contacts.test.ts` is the only gate that reads `site-footer.tsx` at all, and it
//         reads the support entry, not the class that draws the top edge D-30's second RED nudged.
//     So the blind spot is exactly as wide as the paragraph above says, with nothing behind it.
//
//     `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` `[11-22]` holds
//     the measurement and the decision to leave it open; this footer is where a reader of the gate
//     actually meets it. If a future surface makes a border load-bearing, give THAT baseline its
//     own tightened `threshold` at the call site — never the whole suite.

/** Every image row is this size — `OG_SIZE` in `src/app/og-render.ts`. */
const OG_NATURAL = { width: 1200, height: 630 } as const;

/**
 * The image rows are shot in a viewport LARGER than the card, deliberately.
 *
 * Chromium's standalone image document shrink-to-fits an image wider than the viewport. At exactly
 * 1200 the result depends on whether that document carries a body margin — a browser detail, not a
 * property of this app — and a shrunk capture would be a SCALED baseline, in which the few-pixel
 * shift D-30's second proof depends on is resampled away. So the viewport is oversized and the
 * rendered box is asserted to be the natural size before the element is captured.
 */
const OG_VIEWPORT = { width: 1400, height: 900 } as const;

/**
 * The surfaces that cannot be shot today, PINNED as a set rather than merely skipped.
 *
 * A skip is invisible in a green run. Pinning the set means a surface joining it fails here, naming
 * itself, instead of quietly reducing coverage — which is the same argument `THEME_SWAP_EXCLUSIONS`
 * makes for having exactly one entry.
 *
 * ONE ENTRY AS OF PLAN 12-14, DOWN FROM TWO. `og-listing` was blocked for want of a published listing
 * and is now shot against a committed fixture; the row it left behind is the one surface nothing in
 * this repository can render at all. A surface LEAVING this list is coverage that has been won, and
 * this pin is where that gets recorded rather than merely happening.
 */
const EXPECTED_BLOCKED = [
  "global-error",
  // --- 13-15 - eleven of Phase 13's twelve surfaces -------------------------------------------
  // TWO independent blockers, both argued in full at the rows in `visual-baselines.ts`: three of
  // these need a checkout session the provider has CONFIRMED (D-35 keeps the key out of the one job
  // that can write a baseline), and every one of them needs a COMMITTED Phase-13 fixture, because a
  // per-run seed renders a different booking reference, a different session date and a different
  // booker email on every dispatch. `booking-not-found` is the one that is neither and is shot.
  //
  // ELEVEN ENTRIES ARRIVING AT ONCE IS EXACTLY WHAT THIS PIN IS FOR. The list's own argument is that
  // a surface joining it must do so deliberately; that argument does not weaken because eleven join
  // together, it is the reason the number is restated here rather than derived.
  "booking-moment",
  "booking-confirmed",
  "payment-pending",
  "payment-not-completed",
  "payment-reversed-auto",
  "payment-reversed-manual",
  "payment-reversed-indeterminate",
  "receipt-screen",
  "receipt-print",
  "booking-group",
  "invite-active",
  // --- 14-16 - ALL NINE of Phase 14's host surfaces -------------------------------------------
  // Nine entries arriving at once, for the second time in this list's history, and the argument is
  // the one the Phase-13 block already made: a surface joining here must do so deliberately, and
  // that does not weaken because nine join together.
  //
  // They share ONE structural blocker before any of their own: `visual-drive.ts`'s `DRIVES` map has
  // no host entry, so a host row falls through to the default plain `goto` with no session — and
  // every host route redirects an unauthenticated visitor. Nine baselines of `/login`, permanent,
  // silent and green, is the worst outcome available here. Each row's own `blocked` string in
  // `visual-baselines.ts` names what it needs ON TOP of that: seeded bookings at fixed literal
  // instants, a fixed booker first name, a `requested` row at a fixed remaining duration, a payout
  // ledger with literal dates, an uneven week of operating hours, and a drive that WALKS the wizard.
  //
  // ⚠ NONE OF THE NINE WAS GENERATED. `playwright.config.ts:39` builds this project only on Linux;
  // plan 14-16 ran on win32, where the project does not exist. The declaration is an inventory to
  // work from, never a claim of coverage.
  "host-dashboard-agenda",
  "host-dashboard-quiet",
  "host-dashboard-none",
  "host-requests-triage",
  "host-requests-zero",
  "host-bookings-upcoming",
  "host-wizard-rail",
  "host-availability-strip",
  "host-earnings",
  // --- 15-11 - the profile, and ONLY the profile ----------------------------------------------
  // The first block since Phase 12 that adds MORE unblocked rows than blocked ones, which is why
  // this is one entry and not four. `auth-signup`, `auth-forgot` and `auth-reset` are anonymous
  // static forms — no session, no seed, no drive, no clock, no fixture date — so they arrive
  // shootable, and a surface LEAVING this list (or never joining it) is coverage won.
  //
  // `profile` joins for the SAME structural reason as the nine above and with one extra sting: it
  // is behind the session gate, `DRIVES` has no entry for it, and the default drive's plain `goto`
  // would land on `/login` — which renders a `panel-card` and therefore SATISFIES this surface's
  // hook. So the usual protection does not apply here: an undriven capture would not fail
  // reachability, it would mint two baselines of the sign-in page and pass forever. Its `blocked`
  // string in `visual-baselines.ts` names both what it needs (a `DRIVES` entry, a `vrt_%` user with
  // a literal `createdAt` and no avatar) and what it does NOT (a clock — the member-since line is
  // derived from `createdAt`, never from `now`).
  "profile",
  // --- 16-15 - the crop dialog and the wizard's cover preview ----------------------------------
  // BOTH of Phase 16's surfaces join, and neither is a surprise: both are STATES of documents this
  // list already contains a blocker for. `avatar-crop-dialog` is `/profile` one interaction in and
  // inherits its two blockers whole, plus a third (the dialog does not exist until a file has passed
  // all four pre-dialog guards, so a drive must stage one). `wizard-cover-preview` is the same wizard
  // `host-wizard-rail` names, so it shares the Phase-14 structural blocker — no host entry in
  // `DRIVES` — and adds one of its own: the wizard's step is CLIENT state with no query parameter, so
  // no URL reaches the photos step and the drive has to walk the rail.
  //
  // ⚠ ONE OF THE TWO IS SAFER THAN ITS PARENT, AND IT IS WORTH KNOWING WHICH. `profile`'s sting above
  // is that an undriven capture SATISFIES its hook (`/login` renders a `panel-card`).
  // `avatar-crop-dialog`'s hook is the crop dialog's own box narrowed by its title, and `/login`
  // renders no dialog at all — so the same mistake there times out instead of minting a permanent
  // picture of the sign-in page. Blocked is still the right state; the failure mode is just louder.
  "avatar-crop-dialog",
  "wizard-cover-preview",
] as const;

/**
 * All six UI-SPECs' totals, COURT ONLY since D-138: 17 + 13 + 21 + 15 + 8 + 4 (13-UI-SPEC's table
 * adds to 19; the extra two are the reversed state's third branch, which that table predates). It was
 * 95 while every surface carried a second-theme row; `court` is now FitOut's single product theme and
 * the 44 `grove` rows are gone from the inventory. No surface lost its last row. Compile-checked too
 * — see `BaselineCountIsEightyFive` in the module, which is what catches it off Linux where this
 * file never runs.
 *
 * ⚠ 74 DECLARED, 38 BLOCKED, 36 SHOT as of plan 15-11 — and this is the first time since Phase 12
 * that the third number moved. It was 66/36/30 through Phases 13 and 14, whose rows were
 * declarations and not pictures: all of their surfaces are blocked, nothing under
 * `surfaces.spec.ts-snapshots/` was added or re-minted, and the plans that declared them could not
 * have shot one if they had wanted to (this project is not constructed off Linux). Phase 15 adds
 * eight rows of which SIX are shootable — three anonymous static auth documents at two widths each —
 * plus two blocked `profile` rows.
 *
 * ⚠ AND 36 SHOT IS NOT 36 NEW FILES: two of them REPLACE the `auth-login` pair, which has pinned a
 * header that left `(auth)/layout.tsx` in plan 15-06 and is stale on disk. A dispatch that adds six
 * files and leaves those two standing means the hook edit did not take.
 *
 * ⚠ THIS LITERAL IS WHY THE PHASE-15 EDIT NEEDED TWO COMMITS, AND THE REASON IS WORTH KNOWING BEFORE
 * YOU ADD A ROW. It is the deliberate SECOND spelling of a number whose FIRST spelling is a compile
 * gate (`BaselineCountIsEightyFive`), so that an edit to one without the other fails loudly — but
 * it is a `const`, not a type, so `tsc` reads it as a number and says nothing at all when it goes
 * stale. What a stale value here produces is worse than a compile error and arrives much later: the
 * `baselines` dispatch runs this spec, the test below fails on the count, the Playwright step exits
 * non-zero, and the stage/commit steps never run — a dispatch that renders every surface and commits
 * NOTHING, reported as a test failure rather than as a stale literal.
 *
 * ⚠ PLAN 16-15 MOVED BOTH LITERALS IN ONE COMMIT, WHICH IS THE CHANGE 15-11's TWO-COMMIT SPLIT
 * INVITED. `git show --stat` on that commit lists `src/lib/design/visual-baselines.ts` and this file
 * together. And it found a THIRD place the paragraph above does not name: `EXPECTED_BLOCKED` at the
 * top of this file, which moves whenever a NEW surface arrives blocked — as both of Phase 16's did.
 * Three pins, one commit. The count is not the whole of it.
 *
 * ⚠ 85 DECLARED, 42 BLOCKED, 43 SHOT after plan 24-08 replaces five retired search rows with twelve
 * progressive-search states. Both
 * Phase-16 surfaces are blocked, so a 16-15 dispatch is expected to add ZERO files to
 * `surfaces.spec.ts-snapshots/` — a dispatch that adds one has shot something the inventory says it
 * cannot reach. Measured against the tree as this was written:
 * `git ls-files 'e2e/visual/surfaces.spec.ts-snapshots/*-visual-linux.png' | wc -l` → 36.
 */
const EXPECTED_BASELINE_COUNT = 85;

/**
 * Trap 1. Assert the surface rendered its subject before any pixel is read.
 *
 * The message says why this is a failure and not a skip, because the reader who sees it will be
 * looking at a run that would otherwise have written a baseline of a 404.
 */
async function expectReachable(page: Page, row: BaselineRow): Promise<void> {
  const surface = VISUAL_SURFACES[row.surface];
  await expect(
    page.locator(surface.hook).first(),
    `${row.surface} (${surface.url}) rendered NO \`${surface.hook}\` — ${surface.hookWhy} ` +
      "A screenshot assertion does not fail against a blank page, a 404 or a 500: on the run that " +
      "has no baseline it MINTS one of the wrong page, and every run afterwards compares against " +
      "it and passes. So this is a failure, not a skip.",
  ).toBeVisible();
}

test.describe("GATE-01 — the declared baseline inventory", () => {
  test("the inventory is the 85 rows including progressive search, and the blocked set is the declared one", () => {
    expect(
      VISUAL_BASELINES.length,
      "the visual inventory declares 85 court baselines — 17 from 11-UI-SPEC § GATE-01, 20 from " +
        "12-UI-SPEC § Visual Baselines, 21 from 13-UI-SPEC § Visual Baselines, 15 from " +
        "14-UI-SPEC § Visual Baselines, 8 from 15-UI-SPEC § Visual Baselines and 4 from " +
        "16-UI-SPEC § Delta-16. D-138 makes `court` the single product theme, so the second theme's " +
        "rows are no longer declared here. 15-UI-SPEC's table has FIVE rows and contributes FOUR " +
        "surfaces: the fifth is `auth-login`, which Phase 11 already declared and plan 15-11 EDITED " +
        "rather than added twice. Phase 16's two are STATES of `/profile` and of the wizard rather " +
        "than new routes, and both arrive blocked. This is the runtime half of the compile gate in " +
        "`visual-baselines.ts`; the type-level one is what catches it off Linux, where this file " +
        "never runs.",
    ).toBe(EXPECTED_BASELINE_COUNT);

    const blocked = blockedSurfaces();
    expect(
      blocked.map((entry) => entry.id),
      "the set of surfaces that cannot be shot changed. A surface joining this list is a baseline " +
        "that silently stopped existing; a surface leaving it is coverage that has been won and " +
        "should be celebrated in the same commit that updates this pin.",
    ).toEqual([...EXPECTED_BLOCKED]);

    for (const entry of blocked) {
      expect(
        entry.reason.length,
        `${entry.id} is blocked with an empty reason — an absent baseline and an argued exclusion ` +
          "look identical in a green run, and only one of them is a decision",
      ).toBeGreaterThan(80);
    }
  });

  /**
   * THE ONE DRIFT `tsc` CANNOT SEE, CLOSED HERE (plan 12-14).
   *
   * Every Phase-12 row's `url` embeds the fixture's exclusive listing id and its collision day as
   * STRING LITERALS, because `visual-baselines.ts` lives in `src/` and cannot import
   * `scripts/seed-baseline-fixtures.ts` — that module imports `postgres`, and `src/` is inside
   * `next build`'s graph. The fixture's own header names the consequence: "renaming one orphans a
   * declared surface, and `tsc` will not catch it, because a baseline row's URL is a string." An
   * orphaned row does not fail loudly, either: `/listings/<renamed>` 404s, the reachability hook
   * rejects it, and the failure reads as a broken listing page rather than as a stale literal.
   *
   * So the pair is asserted, against the CONSTANTS the seed script exports, in the run that would
   * otherwise be baselining a not-found boundary.
   */
  test("every Phase-12 row's URL names the fixture ids the seed script actually creates", () => {
    const listingRows = VISUAL_BASELINES.filter((row) =>
      (VISUAL_SURFACES[row.surface].url ?? "").startsWith("/listings/"),
    );
    expect(
      listingRows.length,
      "no baseline row addresses `/listings/…` any more, so this assertion is a scan of nothing — " +
        "the seventh-plus sighting of the vacuity shape this phase keeps recording",
    ).toBeGreaterThan(0);

    for (const row of listingRows) {
      const url = VISUAL_SURFACES[row.surface].url as string;
      expect(
        url,
        `${row.surface} addresses a listing id that is not the fixture's. ` +
          `\`VRT_IDS.exclusive\` is "${FIXTURE_URL_CONTRACT.listingId}"; this row says "${url}". A ` +
          "renamed fixture id leaves the row pointing at a listing nobody seeds, which 404s — and a " +
          "404's not-found boundary is a page that photographs perfectly well.",
      ).toContain(`/listings/${FIXTURE_URL_CONTRACT.listingId}`);
    }

    // The DAY, separately: it selects the fixture's booked day. The two surfaces that render the
    // calendar before/after a collision also carry TODAY, whose exact seed value pins the opening
    // month, disabled past-day set and ring. Presence alone is insufficient: a parser-rejected value
    // silently degrades to the wall clock.
    const clockBearingSurfaces = new Set(["listing-detail", "collision-notice"]);
    expect(clockBearingSurfaces.size, "the clock-bearing surface census became empty").toBe(2);
    for (const row of listingRows.filter((r) => (VISUAL_SURFACES[r.surface].url ?? "").includes("?"))) {
      expect(
        VISUAL_SURFACES[row.surface].url,
        `${row.surface} pins a day other than the fixture's ${FIXTURE_URL_CONTRACT.dayIso}. Without ` +
          "the fixture's own day the hour grid does not show the seeded conflict, and without a day " +
          "at all the month grid changes with the wall clock.",
      ).toContain(`date=${FIXTURE_URL_CONTRACT.dayIso}`);
      if (clockBearingSurfaces.has(row.surface)) {
        expect(
          VISUAL_SURFACES[row.surface].url,
          `${row.surface} does not pin venue-local today to ${FIXTURE_URL_CONTRACT.todayIso}; ` +
            "without that exact accepted value the ring returns to the renderer's clock.",
        ).toContain(`today=${FIXTURE_URL_CONTRACT.todayIso}`);
      }
    }
  });
});

/**
 * One document baseline: seed the theme, drive the surface into its state, then compare.
 *
 * A FUNCTION RATHER THAN A LOOP BODY, because the rows are no longer all registered the same way:
 * `collision-notice`'s two rows share one booking window and must therefore run SEQUENTIALLY, which in
 * Playwright means being registered inside a `serial` describe. Registration order and grouping are the
 * only difference — the drive, the hook and the comparison are identical, and keeping them in one
 * function is what stops the serial rows quietly drifting into a weaker check than the parallel ones.
 */
function registerDocumentBaseline(row: BaselineRow): void {
  const surface = VISUAL_SURFACES[row.surface];

  test(baselineArg(row), async ({ page }) => {
    test.skip(surface.blocked !== null, surface.blocked ?? "");
    // `url` is non-null for every unblocked document row; the skip above is what makes this safe,
    // and the assertion below is what makes that claim checkable rather than assumed.
    expect(surface.url, `${row.surface} is unblocked but declares no URL`).not.toBeNull();

    const where = `${row.surface} @ ${row.width}px · ${row.theme}`;
    const drive = newDrive(row.surface, surface.url);
    test.setTimeout(drive.timeoutMs);

    // On the CONTEXT and BEFORE the first goto — `e2e/helpers/theme.ts:44-56`. next-themes' inline
    // pre-paint script reads the seeded key on the very first paint, so there is no flash of the
    // default theme in the frame and no post-hydration switch to wait out.
    await seedTheme(page.context(), row.theme);
    await page.setViewportSize({ width: row.width, height: row.height });
    await emulateVisualMedia(page);

    // ⚠ THE CLOCK GOES HERE — BEFORE THE FIRST NAVIGATION, NOT BEFORE THE CAPTURE. Playwright's own
    // caveat for `clock`, quoted in `e2e/hold-countdown.spec.ts` (the repository's first clock user):
    // "install the clock before navigating the page … This ensures that all timers run normally
    // during page loading, preventing the page from getting stuck." A clock installed after a
    // navigation does not control the timers the page already created, and the countdown's
    // `setInterval` is exactly such a timer — the run would then be measuring a real fifteen-minute
    // wall clock and would pass by never reaching any state at all. The checkout drive is the only
    // surface that asks for one; `freeze.css`'s header named it in advance.
    if (drive.needsClock) await page.clock.install();

    try {
      await drive.navigate({ page, theme: row.theme, width: row.width, where });
      // AFTER the last navigation, because a navigation discards the injected tag.
      await injectFreezeStylesheet(page);
      // …and the interaction runs AFTER the freeze, so the overlay that is about to open does so with
      // zero-duration transitions rather than being caught mid-flight.
      await drive.interact?.({ page, theme: row.theme, width: row.width, where });

      await expectReachable(page, row);

      // The theme really is the one this row names, and this assertion is MORE load-bearing since
      // D-138, not less. While every surface carried a court/grove pair, a seeding regression (a
      // renamed storage key, a `forcedTheme` prop, a provider that stopped mounting) at least had a
      // second theme to disagree with. Now every row names `court`, so a document that silently
      // stopped carrying `data-theme` at all — or carries a default nobody chose — would re-shoot
      // the entire inventory under the wrong document with NOTHING left to notice. Do not weaken,
      // condition or delete this.
      await expect(
        page.locator("html"),
        "the seeded theme did not reach <html>. Every baseline in this file is a claim about a " +
          "document that carries `data-theme=\"court\"`; without it they are screenshots of " +
          "whatever theme the provider fell back to, filed under court filenames.",
      ).toHaveAttribute("data-theme", row.theme);

      await expect(page).toHaveScreenshot(baselineArg(row), {
        // FULL PAGE for every surface except the two OVERLAYS. Two reasons for the default, and the
        // second is not optional: `/dev/theme`'s sections 10-14 and both legal pages' notices sit
        // below the fold at every declared width, so a viewport capture would pin a header and call
        // it coverage — and D-30's second proof nudges the FOOTER's padding, which a viewport capture
        // cannot see at all. The lightbox and the sheet are the exception BY CONSTRUCTION: they are
        // `position: fixed` over a scroll-locked document, so a full-page stitch scrolls a body that
        // cannot scroll and pins a stitching artefact instead of the overlay. The page behind them is
        // already baselined at the same widths by `listing-detail`.
        fullPage: drive.captureMode === "fullPage",
        animations: "disabled",
        caret: "hide",
      });
    } finally {
      // IN A `finally`, and that is the whole point — INCLUDING NOW THAT `collision-notice` HAS ONE
      // ROW RATHER THAN TWO (D-138). The old reason was that court's inserted conflict had to be gone
      // before grove's drive loaded the same window; there is no second drive to protect any more,
      // but the conflict row is written into the COMMITTED FIXTURE's window and outlives the test
      // process. Left behind by a failed drive it makes that window permanently busy, so the next
      // run — or a re-dispatch, or any other spec that reads the fixture — loads a surface whose
      // hours are already struck through and fails for a reason that has nothing to do with it. A
      // cleanup that only runs on the happy path turns one real failure into a cascade of
      // unrelated ones.
      await drive.cleanup?.({ page, theme: row.theme, width: row.width, where });
    }
  });
}

const DOCUMENT_ROWS = VISUAL_BASELINES.filter(
  (row) => VISUAL_SURFACES[row.surface].kind === "document",
);
const IMAGE_ROWS = VISUAL_BASELINES.filter((row) => VISUAL_SURFACES[row.surface].kind === "image");

// The parallel-safe document rows — everything whose drive mutates nothing another row depends on.
for (const row of DOCUMENT_ROWS) {
  if (SERIAL_SURFACES.includes(row.surface)) continue;
  registerDocumentBaseline(row);
}

// …and the ones that must not overlap. `SERIAL_SURFACES` holds the argument; it is not a performance
// setting. Registering them inside a `serial` describe is the only way Playwright expresses "these
// share a resource", and the describe's title says so on the report where somebody will read it.
//
// ITS ONE ENTRY NOW HAS ONE ROW RATHER THAN TWO (D-138 dropped the grove half), and the registration
// is deliberately unchanged: the claim was never "two rows of this surface race each other", it was
// "this surface mutates a booking window the fixture owns". One row makes the describe a formality
// on today's inventory and a live guard the moment a second width is declared — which is cheaper
// than removing it and re-deriving the argument then.
for (const surfaceId of SERIAL_SURFACES) {
  const rows = DOCUMENT_ROWS.filter((row) => row.surface === surfaceId);
  if (rows.length === 0) continue;
  test.describe(`${surfaceId} — SERIAL (its rows mutate one shared booking window)`, () => {
    test.describe.configure({ mode: "serial" });
    for (const row of rows) registerDocumentBaseline(row);
  });
}

for (const row of IMAGE_ROWS) {
  const surface = VISUAL_SURFACES[row.surface];

  test(baselineArg(row), async ({ page }) => {
    test.skip(surface.blocked !== null, surface.blocked ?? "");
    expect(surface.url, `${row.surface} is unblocked but declares no URL`).not.toBeNull();

    // 90s rather than the 30s default as of plan 12-14: the `og-listing` row now makes two extra
    // requests (the listing page, for its head, and the root card, for its byte length) and satori
    // renders a card from scratch on the dev server's first hit of each route. A ceiling, not a wait.
    test.setTimeout(90_000);

    await page.setViewportSize({ ...OG_VIEWPORT });
    await emulateVisualMedia(page);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // D-58 — THE TWO ASSERTIONS THAT MAKE THE LISTING CARD'S BASELINE MEAN ANYTHING, BEFORE ANY PIXEL
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    //
    // THE TRAP, restated because it is the whole reason this row was blocked for a phase: this route
    // ANSWERS 200 WITHOUT A DATABASE. `src/lib/listing/og-facts.ts` returns null for a listing it
    // cannot read and `opengraph-image.tsx` falls back to its `GenericCard`, which plan 11-20
    // measured as BYTE-IDENTICAL to the root card at 25,844 bytes. That fallback is a perfectly valid
    // 1200 × 630 PNG, so EVERY check the other two image rows make — 200, `image/png`, a decoded
    // 1200 × 630, a rendered box at natural size — passes against it. A baseline shot without a
    // fixture is therefore a second copy of `og-root` wearing the listing card's name: green forever,
    // and reading in every review as coverage of a card it has never seen.
    //
    // ⚠ THE SECOND ASSERTION IS NOT THE ONE 12-UI-SPEC SPELLED, AND THE SUBSTITUTION IS DELIBERATE.
    // The spec's falsifiable pair is "the byte length is not 25,844, and its `alt` export contains the
    // seeded listing's title". THE FIRST HALF IS IMPLEMENTED VERBATIM. The second cannot be: `alt` is
    // a STATIC module export on this route ("FitOut — a space, the city it is in, and what it costs by
    // the hour"), and `opengraph-image.tsx`'s own header records why, having rejected both ways to
    // interpolate a listing into it — `generateImageMetadata` makes Next append an image id so
    // `/listings/<id>/opengraph-image` stops resolving, and hand-writing `openGraph.images` replaces
    // the file convention and with it the automatic width/height/type tags. Asserting a substring of a
    // constant would be a check that cannot fail.
    //
    // So the claim is re-aimed at the thing that actually carries the seeded title into the unfurl,
    // and it is STRONGER rather than weaker: `og:title` on the listing page is composed from
    // `listingCardFacts(id)` — the SAME cached projection the image route calls, and the same null
    // check that decides `ListingCard` versus `GenericCard`. A non-null `og:title` carrying the seeded
    // title is therefore direct evidence that this deployment's image route took the real-card branch.
    // Plus `og:image`, which proves the page's head points at the very route being captured below.
    if (row.surface === "og-listing") {
      const listingPath = `/listings/${FIXTURE_URL_CONTRACT.listingId}`;
      await page.goto(listingPath);

      const ogTitle = await page
        .locator('meta[property="og:title"]')
        .getAttribute("content", { timeout: 20_000 });
      expect(
        ogTitle,
        `${listingPath} published og:title "${ogTitle ?? "(absent)"}". It is composed from ` +
          "`listingCardFacts(id)`, the same projection `opengraph-image.tsx` reads — so a title that " +
          "does not name the seeded listing means that read returned NULL, which means the card " +
          "captured below is the `GenericCard` fallback and not this space's card. Most likely the " +
          "fixture was not seeded before the visual run (see `.github/workflows/baselines.yml`'s " +
          "seed step) rather than anything wrong with the route.",
      ).toContain(FIXTURE_URL_CONTRACT.title);

      const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
      expect(
        ogImage,
        "the listing page's og:image does not point at the route this row captures, so the card " +
          "being baselined is not the card this page's links actually unfurl with",
      ).toContain(`${listingPath}/opengraph-image`);

      // THE BYTE LENGTHS, and the reason there are two comparisons rather than the one the spec asks
      // for. 25,844 is the literal plan 11-20 measured and it is pinned because it is the number in
      // the record — but a pinned literal goes VACUOUS the day the GenericCard's rendering changes by
      // a byte, and it would go vacuous silently, in the green direction. So the live root card is
      // fetched in the SAME RUN and compared too: whatever the fallback weighs today, the listing
      // card must not weigh it.
      const listingCard = await page.request.get(surface.url as string);
      expect(listingCard.status(), `${surface.url} did not answer 200 to a direct fetch`).toBe(200);
      const listingBytes = (await listingCard.body()).byteLength;

      const rootCard = await page.request.get("/opengraph-image");
      expect(rootCard.status(), "/opengraph-image did not answer 200").toBe(200);
      const rootBytes = (await rootCard.body()).byteLength;

      expect(
        listingBytes,
        `the listing card is ${listingBytes} bytes — exactly the 25,844 plan 11-20 measured for the ` +
          "`GenericCard` fallback. This capture is the DB-free card wearing the listing card's name.",
      ).not.toBe(25_844);
      expect(
        listingBytes,
        `the listing card and the root card are both ${listingBytes} bytes. They are different ` +
          "compositions with different text, so equal lengths mean the listing route served its " +
          "`GenericCard` — which 11-20 measured as byte-identical to the root card. This comparison " +
          "is the durable half of the assertion above: the 25,844 literal can go stale, this cannot.",
      ).not.toBe(rootBytes);
    }

    // NO `freeze.css` on this path, and the absence is deliberate: the document Chromium builds for
    // a standalone PNG contains one `<img>` and no application CSS, so there is no animation, no
    // transition and no caret for the sheet to freeze. Injecting it anyway would imply this capture
    // depends on it and would quietly hide a future regression where an OG route started serving
    // HTML — which the content-type assertion above is what actually catches.

    // Navigate to the PNG itself. Chromium renders it as an image document containing one `<img>`,
    // which is the element captured below — so the baseline is the card and not a browser's viewer
    // chrome around it. `setContent` with an absolute URL was the alternative and is worse: it
    // moves the document to an opaque origin and makes the load a cross-document image fetch, which
    // is more browser behaviour to depend on, not less.
    const response = await page.goto(surface.url as string);

    expect(response, `${surface.url} produced no response at all`).not.toBeNull();
    expect(
      response?.status(),
      `${surface.url} did not answer 200. For the invite card the most likely cause is the ` +
        "route-group hash: Next appends a djb2 suffix to a metadata route under any route group, " +
        "so the UNSUFFIXED path is a 404 (measured in plan 11-20).",
    ).toBe(200);
    expect(
      response?.headers()["content-type"],
      `${surface.url} did not serve an image — an HTML error page decodes to 0 × 0 below, but ` +
        "naming the content type here says WHY in one line instead of leaving a dimension mismatch",
    ).toContain("image/png");

    const img = page.locator("img");
    await expect(img, `${surface.url} rendered no <img> — ${surface.hookWhy}`).toBeVisible();

    // The decoded size, which is the reachability check no selector can make: a 404 body, an empty
    // response and a broken PNG all decode to 0 × 0.
    const natural = await img.evaluate((el) => ({
      width: (el as HTMLImageElement).naturalWidth,
      height: (el as HTMLImageElement).naturalHeight,
    }));
    expect(natural, `${surface.url} did not decode to the declared card size`).toEqual({
      ...OG_NATURAL,
    });

    // …and it is rendered at that size rather than shrunk to fit — see OG_VIEWPORT's comment. A
    // scaled capture would resample away exactly the few-pixel differences this gate exists to catch.
    const box = await img.boundingBox();
    expect(box, "the <img> has no layout box").not.toBeNull();
    expect(
      { width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) },
      "the card is not rendered at its natural size — Chromium shrink-to-fit is in play, and a " +
        "scaled baseline cannot detect a few-pixel shift",
    ).toEqual({ ...OG_NATURAL });

    await expect(img).toHaveScreenshot(baselineArg(row), {
      animations: "disabled",
      caret: "hide",
    });
  });
}
