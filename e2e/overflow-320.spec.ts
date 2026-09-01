import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
// The D-201 inventory assertion at the foot of this file walks `src/app/**` in Node. It is the only
// filesystem read in the suite, and it is here rather than in `tests/design/` because the set it
// compares against is THIS FILE'S three route tables — a gate in another file could only assert about a
// list it was also given, which is the remembering D-201 exists to replace.
import { readdirSync, existsSync, type Dirent } from "node:fs";
import path from "node:path";
import postgres from "postgres";

import {
  openBookingSheet,
  seedBookableListing,
  seedReviewQueue,
  signUpBooker,
  signUpStaff,
  type SeededListing,
} from "./helpers/booker-seed";
import { expectRing, readFocus, type FocusReading } from "./helpers/focus";
// RESP-03 clause C's ONE definition of "this text did not wrap", shipped by plan 17-04 and imported
// here by plan 17-11 as its SECOND consumer — which is the entire reason it was extracted rather than
// left inline in `mobile-booker-path.spec.ts`. Never re-implemented: see the declared-set block above
// the AC#30 describe for what this file measures with it and what it deliberately does not.
import { expectNoWrap } from "./helpers/nowrap";
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
// TWO INHERITED DEFECTS IN THIS HARNESS, CLOSED BY PLAN 17-06 (29 August 2026)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Both were found by the plans that could not fix them, written up in their own phases'
// `deferred-items.md`, and both are defects in the INSTRUMENT rather than in the product — which is
// why they are recorded here, at the top of the instrument, rather than only in a summary.
//
//   • [16-D9] — THE `/listings/[id] · sheet open` ROW MEASURED NOTHING. A Radix modal makes `<body>`
//     a 320px box that clips its own content, retiring all three of `expectNoOverflow`'s clauses at
//     once, so the one row this table added BECAUSE the floor is hardest there could not fail. Closed
//     by `scope: '[data-testid="responsive-dialog"]'` on that row — the field, its consumer and its
//     vacuity guards all shipped in 16-15; only the adoption was missing. BOTH SIDES RE-MEASURED ON
//     THIS TREE, 29 August 2026, rather than inherited from the finding:
//
//       clean, both themes     found true · examined 129 · scrollWidth 320 · clientWidth 320 ·
//                              offenders []
//       500px div appended     scrollWidth 532 against clientWidth 320, 48 named offenders (court):
//       into the open sheet    `div.flex flex-col gap-2 right=516` first, then the sheet's own month
//                              grid at right=333 carried along behind it
//
//     The 129 is the half that makes the empty list mean something — `expectNoOverflowWithin` asserts
//     `found` and then `examined >= MIN_EXAMINED_ELEMENTS` before it asserts anything about width, so
//     the green is 129 laid-out descendants judged rather than a selector that matched nothing. The
//     532 is 16-15's own probe reproduced here: the row fails when the sheet overflows, which is the
//     property that was missing. The sheet itself is clean, and never being able to know that was the
//     defect.
//
//   • [15-12] — THE TARGET-SIZE SCAN RACED THE SURFACE IT MEASURED, firing its own "zero controls is
//     never clean" guard on a correct tree, on a row that moved run to run, and passing on retry.
//     Closed by polling that guard for the same fifteen seconds `expectReachable` already allows. The
//     whole argument, including the re-measured line numbers that rule out the ORDERING reading of
//     the finding, is above `expectTargets`.
//
// Neither closure weakens an assertion: one adds a measurement where there was none, and the other
// gives an existing measurement time to be true. That direction is the test — a fix to a gate that
// makes the gate ask less is a fix to the wrong thing.
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
/**
 * The signup drive itself, extracted by plan 17-12 so that three rows can share it.
 *
 * ⚠ EXTRACTED, NOT REWRITTEN. Every line below is `signUpAndReachProfile`'s, byte for byte, with the
 * one radio and the one submit-button pattern parameterised by intent. The paragraphs above are still
 * the argument for all of it — they are attached to that function rather than moved here because it is
 * the one a reader arrives at from the `/profile` row.
 *
 * WHY THE INTENT IS A PARAMETER AND NOT A SECOND COPY OF THIS FUNCTION: `(host)/host` needs the host
 * CAPABILITY, not just a session, and the capability flag is `input: false` — the server derives it
 * from the intent on the signup form and there is no other honest way for a browser to obtain it. So
 * the difference between the two fixtures this table needs is exactly one radio.
 */
async function signUpThroughTheForm(page: Page, intent: "book" | "host"): Promise<void> {
  const email = `e2e.overflow.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  // The intent defaults to "book"; clicked explicitly to be deterministic, which is the same reason
  // `login-persistence.spec.ts` gives.
  await page
    .getByRole("radio", { name: intent === "host" ? "Host a space" : "Book a space" })
    .click();
  await page.getByLabel("First name").fill("Overflow");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("averylongpassword");
  await page
    .getByRole("button", { name: intent === "host" ? /sign up to host/i : /sign up to book/i })
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
}

async function signUpAndReachProfile(page: Page): Promise<string | null> {
  await signUpThroughTheForm(page, "book");
  return "/profile";
}

/**
 * `/dev-throw-app`, reached by signing a booker up through the UI (plan 17-12).
 *
 * THE SAME RESOLVER SHAPE AS `signUpAndReachProfile`, AND THE SAME REASON IT IS NOT MEMOISED: what it
 * produces is a SESSION COOKIE, and Playwright's `page` fixture is per-test. It exists as a separate
 * function only because the two rows want different destinations behind the same session.
 *
 * ⚠ THE SESSION IS NOT OPTIONAL HERE AND THE ROW WOULD LIE WITHOUT IT. `(app)/layout.tsx` carries a
 * BLOCKING session gate, so an anonymous request to `/dev-throw-app` is answered by `redirect("/login")`
 * before the page body runs — measured 30 August 2026 against the production build, `307 → /login`.
 * A row that navigated anonymously would render the login page and, since plan 15-07, `/login` renders
 * `[data-testid="panel-card"]`; the `tell` below would catch that, but only because it names copy no
 * other document has. This is the `/profile` row's hole, arriving on a boundary row.
 */
async function signUpAndReachAppThrow(page: Page): Promise<string | null> {
  await signUpThroughTheForm(page, "book");
  return "/dev-throw-app";
}

/**
 * `/host/dev-throw`, reached by signing a HOST up through the UI (plan 17-12).
 *
 * ⚠ THIS IS NOT `seedHostSurfaces`, AND THAT IS A DELIBERATE DEPARTURE FROM 17-12'S OWN PLAN TEXT.
 * The plan says to give this row "the host fixture". It cannot have it, for a structural reason
 * measured rather than argued: `seedHostSurfaces` returns a fixture containing an OPEN `postgres()`
 * client plus a seeded host, listing, booker, booking, notification and payout-ledger row, and the
 * AC#36 block that owns it closes all of that in a `describe`-scoped `afterAll` with five explicit
 * DELETE statements and an `sql.end()`. A `RouteRow` resolver is handed nothing but a `Page` and has
 * nowhere to put teardown, so calling it from here would leak one connection and one whole fixture
 * into the dev database PER THEME, PER RUN, forever — and three of those rows are ones no cascade
 * reaches (that block's own teardown comment names them).
 *
 * WHAT THIS ROW ACTUALLY NEEDS IS SMALLER THAN THAT FIXTURE. It needs a session carrying the host
 * capability and nothing else: the route it drives reads no listing, no booking and no ledger — it
 * throws. So it takes the shape this table was built for and the one its own header declares — "NO
 * SEED AND NO DATABASE FIXTURE … no `postgres()` client, no seeded rows, nothing that stops running
 * the first time a fixture changes" — and drives the shipped signup form with the host intent, which
 * the server maps to the capability flag.
 *
 * BOTH of `(host)/host/layout.tsx`'s gates are real here: without a session it redirects to `/login`,
 * and with a booker-only session it redirects to `/`. Measured anonymously against the production
 * build: `307 → /login`.
 */
async function signUpAndReachHostThrow(page: Page): Promise<string | null> {
  await signUpThroughTheForm(page, "host");
  return "/host/dev-throw";
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
 * ⚠ RE-MEASURED AGAIN BY PLAN 17-11: **SEVENTEEN routes and FIVE route states — 22 rows, 44 cases, of
 * which 10 are the five unreachable rows × two themes.** The sentence above is left standing as the
 * historical claim it is (this file's amendment idiom), and the split enumerated below is amended in
 * place where it would otherwise be wrong. The one new row is `/listings/[id]`'s NOT-FOUND boundary,
 * and it is the fifth unreachable row rather than the fourteenth reachable one — it was written as a
 * measurement, went red at `expectReachable`, and the probe that followed found the cause. Read that
 * row: it is the only surface in the app whose own boundary file cannot be rendered.
 *
 * ⚠ RE-MEASURED AGAIN BY PLAN 17-12: **TWENTY-ONE routes and FIVE route states — 22 rows, 44 cases, of
 * which 2 are the ONE remaining unreachable row × two themes.** The ROW count does not move and the
 * ROUTE count moves by four, which is the arithmetic a reader is most likely to get wrong here and is
 * therefore stated that way round. No row was added: four rows that carried `path: null` and a named
 * skip now carry a real path, because 17-12 BUILT the four group-local throw routes those skip strings
 * named as their price. Forty-two of the forty-four cases are now measurements; before this plan
 * thirty-four were.
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
 *     [17-11: FIVE are not, and the asymmetry sentence is now false. The fifth is a NOT-FOUND boundary
 *     — `listings/[id]/(detail)/not-found.tsx` — and its reason has nothing to do with dev throw
 *     affordances: a layout wins the 404 above it, so nothing can render it. The bullet above is left
 *     standing because its four-error-boundary argument is unchanged and is what those four rows cite.]
 *     [17-12: ONE is not. The four error boundaries are MEASURED — plan 17-12 built the four
 *     group-local throw routes the skip strings named as their price, so `(app)`, `(host)/host`,
 *     `(auth)` and `(legal)` each drive their own boundary and prove it by a route out the root
 *     boundary does not render. The only remaining unreachable row is 17-11's not-found one. The two
 *     bullets above are left standing as the history they are; what they DESCRIBE is the tree before
 *     30 August 2026, and the four skip strings themselves are quoted in full at the rows that
 *     replaced them.]
 *     [17.1: ZERO are not (plan 17.1-02). 22 rows and 44 cases become 21 and 42, and the count of
 *     `path: null` rows in this table is now NIL — every row drives a real URL. The difference from
 *     the two brackets above is the whole point and is why this one is worth reading: 17-12 moved
 *     four rows from unreachable to measured by BUILDING what they needed, and this moves the last row off
 *     the table by DELETING ITS SUBJECT: the `not-found.tsx` under `src/app/listings/[id]/(detail)/`
 *     is gone from the tree ([17-D3], resolved). The row did not become reachable and its reason did
 *     not change; there is no longer a file for it to name. Its measurement is not lost — the skip
 *     string it carried is quoted in full in that commit's message and in `[17-D3]`'s RESOLVED block,
 *     the same way 17-12 preserved the four skip strings it replaced. An unreachable count that falls
 *     because a surface was DELETED and one that falls because somebody stopped looking are the same
 *     number and opposite events, so this bracket says which.
 *     ⚠ THE ONE PLACE THAT PATH IS STILL SPELLED IN THIS TREE IS THE `[17-11:` BRACKET FOUR LINES UP,
 *     and it stays. 17.1-02's own acceptance criterion greps for zero occurrences, which cannot be
 *     reconciled with that bracket being frozen history — and freezing wins. A dated amendment that
 *     edits the sentence it amends is not an amendment. Everything the plan could move, moved; what
 *     is left is a record of what was true in August 2026, which is the one thing here that must not
 *     be true of the tree.]
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
    // ⚠ [16-D9], CLOSED HERE (plan 17-06). ONE LINE THAT TURNS A ROW WHICH COULD NOT FAIL INTO ONE
    // THAT CAN — and it is placed above the row's own comment rather than beside `tell` so that the
    // field stays visibly attached to the row it belongs to. With the sheet open a Radix modal makes
    // `<body>` a 320px box that clips its own content, retiring all three of `expectNoOverflow`'s
    // clauses at once; the `scope` field's own docblock has the mechanism and the file header has both
    // re-measured readings — clean `examined 129 · 320 === 320 · offenders []` in both themes, and
    // `scrollWidth 532` with 48 named offenders once a 500px div is appended into the open sheet.
    scope: '[data-testid="responsive-dialog"]',
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

  // ─── PHASE 17 — THE FOUR THIS HARNESS COULD NOT REACH, AND NOW DOES (plan 17-12) ─────────────────
  //
  // ⚠ THE HISTORY IS KEPT RATHER THAN DELETED, BECAUSE THE WRONG FIX IS THE OBVIOUS ONE.
  //
  // WHAT THESE FOUR ROWS USED TO SAY. Until 30 August 2026 all four carried `path: null` and a named
  // skip. The first one's reason, quoted so the correction has something to be a correction OF:
  // *"no dev throw affordance exists inside the (app) route group — 11-18 shipped one route, at
  // src/app/dev/throw, which reaches the ROOT boundary only. Reaching this one needs a new page.tsx
  // inside (app), which moves loading-coverage.test.ts's pinned route counts and adds a route to the
  // production table."* The other three said "same as (app)", plus: `(host)` additionally sits behind
  // the capability gate; `(auth)`'s routes are forms that render successfully, so no input makes them
  // throw; and `/terms` and `/privacy` are static prose with no data path that can fail, *"which is
  // why they are the two routes in the app least able to reach their own boundary"*. Every one of
  // those sentences is still TRUE. What changed is that plan 17-12 paid the price they named.
  //
  // WHAT 17-12 BUILT: four `page.tsx` files, one inside each group, each a copy of `src/app/dev/throw`
  // behind the same build-time production guard. `loading-coverage.test.ts`'s pins moved 29→33 and
  // 8→12 with the decision recorded beside them, and `EXPECTED_QUALIFYING` did not move.
  //
  // ⚠ AND THE UI-SPEC'S SUGGESTED SHAPE WOULD HAVE CLOSED NOTHING — RECORDED SO IT IS NOT RE-PROPOSED.
  // 17-UI-SPEC's `[11-21]` row proposes *"one `src/app/dev/throw-in/[group]/page.tsx` per group behind
  // the same build-time `NODE_ENV` guard"*. That file sits under NO route group, exactly as
  // `src/app/dev/throw` does, so every value of `[group]` would be caught by `src/app/error.tsx` — the
  // ROOT boundary, which the row above already covers. It would have produced four rows reporting
  // success while measuring the same document four more times, which is strictly worse than four
  // honest skips. WHICH BOUNDARY CATCHES A THROW IS A PROPERTY OF THE THROWING FILE'S PATH; nothing
  // about a URL segment, a search param or a dynamic segment can move it.
  //
  // WHICH IS WHY EVERY `tell` BELOW NAMES THE ROUTE OUT AND NOT `[data-testid="error-state"]`. All
  // five boundaries render the same `ErrorState` with the same title and the same body — that
  // uniformity is `tests/design/error-boundaries.test.ts`'s subject and it pins the strings — so the
  // panel hook proves "a boundary rendered" and NOT "THIS boundary rendered". The route out is the one
  // thing each of the five composes differently, so it is the discriminator: root `Back to search`,
  // `(app)` `Your bookings`, `(host)/host` `Host dashboard`, `(auth)` `Back to log in`, `(legal)`
  // `Back to FitOut`. This is 17-RESEARCH Pitfall 6's warning sign — *"a 'closed' boundary row whose
  // rendered copy is the ROOT boundary's copy"* — made mechanical.
  //
  // MEASURED BEFORE THE ROWS WERE WRITTEN, 30 August 2026, at 320px, each route driven with whatever
  // session its group's gates demand. Each document rendered exactly one `error-state`, carried its
  // OWN route out, and contained the root's `Back to search` ZERO times. The sentinel the throw
  // carries appeared in no document's `innerText` (`e2e/error-leak.spec.ts` owns that claim in full).
  {
    name: "error boundary · src/app/(app)/error.tsx",
    // THE RESOLVER IS A SIGNUP, NOT A LITERAL PATH, and it is the group's blocking session gate that
    // makes it one — see `signUpAndReachAppThrow`. Anonymous, this route answers `307 → /login`.
    path: signUpAndReachAppThrow,
    tell: '[data-testid="error-state"]:has-text("Your bookings")',
  },
  {
    name: "error boundary · src/app/(host)/host/error.tsx",
    // TWO gates, so the resolver signs up with the HOST intent — see `signUpAndReachHostThrow` for
    // why this is not `seedHostSurfaces` and what that would have cost the dev database.
    path: signUpAndReachHostThrow,
    tell: '[data-testid="error-state"]:has-text("Host dashboard")',
  },
  {
    name: "error boundary · src/app/(auth)/error.tsx",
    // No fixture: `(auth)/layout.tsx` is presentational and gates nothing. The URL segment is
    // `dev-throw-auth` rather than `dev-throw` because `(app)` and `(auth)` share the root URL
    // namespace and two pages resolving to one path fail the build; the route file says so too.
    path: "/dev-throw-auth",
    tell: '[data-testid="error-state"]:has-text("Back to log in")',
  },
  {
    name: "error boundary · src/app/(legal)/error.tsx",
    // No fixture either. This row closes the boundary the old skip called the least reachable in the
    // app — and it still is, in the sense that mattered: nothing a booker can do to `/terms` or
    // `/privacy` reaches it. What reaches it is a route built for the purpose.
    path: "/dev-throw-legal",
    tell: '[data-testid="error-state"]:has-text("Back to FitOut")',
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
//   • THIS BULLET WAS A BLIND SPOT AND IS NOW A COVERED CASE (plan 17-06) — replaced rather than
//     deleted, because what it recorded was true when it was written. It read: *"THE TARGET-SIZE SCAN
//     DOES NOT SEE THE APP SHELL, and the shell has a real 16x16 control in it below `sm:`."* The
//     control is 28x28 as of D-196 and the scan sees the header as of this commit, so what remains
//     outside it is the FOOTER — measured, and exempt by WCAG 2.5.8's own inline exception anyway.
//     `collectControls`'s docstring carries both halves.
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

type Control = {
  readonly label: string;
  readonly w: number;
  readonly h: number;
  /** True for a control inside `site-header`. See `collectControls`'s docstring and `expectTargets`. */
  readonly inShell: boolean;
};

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
 * ⚠ THE HEADER HALF OF THE SHELL EXCLUSION IS GONE (plan 17-06, 17-CONTEXT D-196), AND THE PARAGRAPH
 * THAT STOOD HERE HAS BEEN REPLACED RATHER THAN ANNOTATED. It recorded a real finding — 13-15 measured
 * `site-chrome.tsx`'s `ProfileLink` as a bare `size-4` glyph below `sm:`, a **16x16** pointer target,
 * 8px under the AA bar, on the control that reaches a user's own account, on every signed-in route —
 * and then said, correctly for that plan, that it was NOT ITS TO FIX. It now is fixed, and a sentence
 * declaring a closed finding out of scope, sitting one line above the exclusion it justifies, is the
 * defect class this file's own header (`:342-349`) says Phase 15 exists to repair. The finding and its
 * measurement are kept, annotated CLOSED, in `13-…/deferred-items.md` — that is where a measurement
 * belongs, not here.
 *
 * SO THE SITE HEADER'S CONTROLS ARE IN THE SCAN NOW, and they clear the bar. MEASURED at 320px,
 * 29 August 2026, with `p-1.5` on `ProfileLink`:
 *
 *   `/` (signed out)      a[FitOut] 52x28 · a[Log in] 62.3x32 · a[Sign up] 72.6x32
 *   `/profile` (signed in) a[FitOut] 52x28 · button[Booking] 94.4x28 ·
 *                          button[Notifications, 0 unread] 44x44 · a[Profile] 28x28
 *
 * ⚠ THE FOOTER HALF IS KEPT, AND — MEASURED — IT IS A NO-OP TODAY, WHICH IS ITSELF THE REASON TO SAY
 * SO RATHER THAN LEAVE IT UNARGUED. All five footer controls are `display: inline` at every width
 * (`a[FitOut] 42.2x18`, `a[Find a space] 81x18`, `a[Host your space] 104x18`, `a[Terms] 38.5x18`,
 * `a[Privacy] 46.8x18`), so the inline clause four lines below would drop every one of them anyway,
 * by WCAG 2.5.8's own exception. It is retained because widening this gate's subject to the footer is
 * a decision D-196 did not make and `site-footer.tsx` is on no list this plan owns — not because
 * anything down there fails.
 *
 * ⚠ AND THE COST OF KEEPING IT IS STATED, BECAUSE A NO-OP EXCLUSION IS THE KIND THAT SURVIVES PAST ITS
 * REASON: the day the footer ships a BLOCK-LEVEL control, this line hides it from the only gate that
 * would have measured it. Whoever adds one should delete this clause in the same commit — the header
 * half above is the worked example of what that costs (nothing: the controls passed).
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
    const out: { label: string; w: number; h: number; inShell: boolean }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(SEL))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.display === "inline") continue;
      if (el.closest(".sr-only") !== null) continue;
      // Out of the accessibility tree AND out of the tab order — see the docstring's second
      // exclusion. Both halves are required; either alone would exclude a real control.
      if (el.closest('[aria-hidden="true"]') !== null && el.tabIndex < 0) continue;
      // The footer only, and its measured reason is in the docstring above. The header half of this
      // clause was deleted by plan 17-06 — D-196 fixed the control it was written around.
      if (el.closest('[data-testid="site-footer"]') !== null) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const name =
        el.getAttribute("aria-label") ??
        (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
      out.push({
        label: `${el.tagName.toLowerCase()}[${name || el.getAttribute("id") || "?"}]`,
        w: Math.round(rect.width * 10) / 10,
        h: Math.round(rect.height * 10) / 10,
        // WHICH HALF OF THE PAGE THE CONTROL CAME FROM, and it is load-bearing rather than
        // diagnostic: the vacuity guard in `expectTargets` claims the SURFACE'S OWN content produced
        // a control, and that claim was true for free while the header was excluded. With the header
        // in the scan, an unfiltered count would be satisfied by the shell on every route in the app
        // — the same assertion, gone quiet. See `expectTargets`.
        inShell: el.closest('[data-testid="site-header"]') !== null,
      });
    }
    return out;
  });
}

/**
 * GATE-A11Y's target-size half. The vacuity guard is first, for `expectNoOverflow`'s reason.
 *
 * ⚠ THE VACUITY GUARD IS POLLED RATHER THAN READ ONCE, AND THAT IS [15-12]'S CLOSURE (plan 17-06).
 * THE CLAIM IS UNCHANGED — zero controls is still never a clean result, and the floor below is still
 * 24. What changed is that the claim is now given fifteen seconds to become true.
 *
 * THE FINDING, as `15-deferred-items.md` recorded it across five runs on 25 August 2026: this
 * assertion fired on a CORRECT tree, on a row that varied run to run (`the receipt · court`, `the
 * confirmed detail` in either theme), and run 5 — the CI retry policy — reported *59 passed / 1 flaky*.
 * The decisive run is the fourth: the file was `git checkout --`'d back to `HEAD` and the same
 * assertion failed in the same block on a different row, which is what rules out the change that was
 * in flight at the time. Fixture state was checked rather than assumed and the database was clean
 * between runs; the cause is in-page timing.
 *
 * THE MECHANISM: the case's reachability tell (`booking-detail`) is satisfied by the SERVER-RENDERED
 * detail shell, and the scan below then ran with no wait for the surface's ACTIONS to paint. On a
 * loaded box it lands after the shell and before the buttons, and reads zero — which the message says,
 * correctly, must never be treated as clean. The assertion was behaving; the instrument was
 * under-synchronised.
 *
 * ⚠ AND IT IS A WAIT RATHER THAN A REORDERING, WHICH IS WORTH STATING BECAUSE THE OBVIOUS READING OF
 * THE FINDING IS THAT THE CALL RUNS BEFORE THE TELL. IT DOES NOT, AND THAT WAS RE-MEASURED BEFORE
 * THIS FIX WAS WRITTEN. Read out of the tree as it stood at `335bf6c`, the commit this plan started
 * from, so the numbers stay checkable after this file grew: in the AC#30 block the tell's
 * `not.toHaveCount(0, { timeout: 20_000 })` was at `:1381` and `expectTargets` at `:1396`; in the
 * Phase-14 block the tell was at `:2071` and the call at `:2086`. Both already run the tell first, and
 * both still do. Moving a call that is already in the right place would have closed nothing while
 * producing a diff that looks like a fix, which is the more expensive of the two mistakes.
 *
 * The fifteen seconds are `expectReachable`'s measured allowance, for its measured reason: the dev
 * server compiles routes on demand and a guard that flakes is a guard people learn to ignore.
 */
async function expectTargets(
  page: Page,
  where: string,
  /**
   * ⚠ THE ONE SURFACE IN THE APP THAT SHIPS NO INTERACTIVE CONTROL OF ITS OWN, DECLARED (plan 17-11).
   *
   * The guard below asserts *"every Phase-13 and Phase-14 surface ships at least one action of its
   * own"*. MEASURED 30 August 2026, when `/host/earnings` joined this file's tables: that sentence is
   * FALSE of the shipped app. The route polled zero non-shell controls for the full fifteen seconds on
   * a page with nothing wrong with it — `payouts_enabled` suppresses `PayoutBanner` (its `Set up
   * payouts` button is the only one the surface can render), `payout-row.tsx` states in as many words
   * that a payout row is TERMINAL and takes no `href`, and the zero-ledger branch passes
   * `actions={null}` with its own argument for doing so. It is a read-only status view by design.
   *
   * SO THE ROW DECLARES IT AND THE GUARD INVERTS, rather than the row being exempted from the scan.
   * Passing this string turns the guard from "at least one" into "EXACTLY zero, and here is why" —
   * which is the stronger claim on this surface, because it fails BOTH when the declaration is wrong
   * (a control appeared and the row must lose its declaration) and when the surface stops rendering.
   * The 24px floor below is untouched and still runs over every control the scan found, shell
   * included; nothing about this route is excused from it.
   *
   * ⚠ IT IS ONE READING RATHER THAN A POLL, and the asymmetry is the reason. The original guard polls
   * because it asserts the PRESENCE of something that paints late ([15-12]); asserting absence has the
   * opposite timing profile, and a poll for zero would pass on its first check anyway. Every control
   * this route could grow is server-rendered (the page is an RSC and the one client component on it is
   * the banner), so a single reading taken after the `tell` resolved sees it. A control that only
   * appeared at hydration would slip past — named here rather than left to be discovered.
   */
  declaredControlless?: string,
): Promise<void> {
  let controls: Control[] = [];

  if (declaredControlless !== undefined) {
    controls = await collectControls(page);
    const own = controls.filter((c) => !c.inShell);
    expect(
      own.map((c) => `  ${c.label} ${c.w}x${c.h}`),
      `${where}: this row DECLARES that the surface renders no interactive control of its own — ` +
        `${declaredControlless} — and the scan found ${own.length}. A control appearing here is not ` +
        "a product failure; it is a row whose declaration has gone stale, and the fix is to delete " +
        "the declaration so the ordinary 'at least one action of its own' guard applies again. The " +
        `${TARGET_FLOOR_PX}px floor below still runs over every control the scan found, shell ` +
        "included.",
    ).toEqual([]);
  } else {
    await expectOwnControlsPresent(page, where, (c) => {
      controls = c;
    });
  }

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

/**
 * The polled vacuity guard, EXTRACTED VERBATIM from `expectTargets` by plan 17-11 so that the
 * declared-controlless branch above sits beside it rather than inside it.
 *
 * Not one character of the claim, the window or the message changed in the move — [15-12]'s closure is
 * this poll and it is the thing that must not drift. `report` hands the collected list back so the
 * 24px clause still measures what the poll last saw, which is what the shared `controls` variable did
 * before the extraction.
 */
async function expectOwnControlsPresent(
  page: Page,
  where: string,
  report: (controls: Control[]) => void,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const controls = await collectControls(page);
        report(controls);
        // ⚠ THE GUARD COUNTS NON-SHELL CONTROLS, WHICH IS THE CLAIM IT HAS ALWAYS MADE — it is
        // spelled out only because plan 17-06 put the site header INTO the scan (D-196). While the
        // header was excluded, "how many controls did the scan find" and "did the surface's own
        // content produce one" were the same number. They are not any more: an unfiltered count is
        // satisfied by the brand link on every route in the app, so the guard would go quiet
        // everywhere while still reading like a guard — and it would re-open [15-12] as well, since
        // the shell paints before the surface's actions do.
        return controls.filter((c) => !c.inShell).length;
      },
      {
        timeout: 15_000,
        message:
          `${where}: the target-size scan found ZERO interactive controls in the surface's OWN ` +
          "content, and kept finding zero for fifteen seconds. The site header IS scanned (its " +
          "controls are judged against the same floor); it is discounted HERE because every route " +
          "renders it, so counting it would make this guard true of a page with nothing on it. " +
          "Every Phase-13 and Phase-14 surface ships at least one action of its own. An empty list " +
          "is a page that did not render or a selector that stopped matching, never a clean result. " +
          "The poll is what separates those from a surface whose actions had not painted yet " +
          "([15-12]); fifteen seconds in, it is the former.",
      },
    )
    .toBeGreaterThan(0);
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
    // ⚠ PLAN 17-11 — THE SEVENTH OF THE SEVEN ROUTES WITH ZERO 320px MEASUREMENT, and the only one of
    // them that is a BOOKER surface rather than a host one. It is a row HERE rather than in the AC#36
    // host block or in a fourth table for one reason: `/bookings` needs a booker session with real
    // bookings behind it, and this block's fixture is the only one in the file that produces both. The
    // other six are host routes and are rows in the Phase-14 table for the mirror-image reason.
    //
    // WHAT IT ADDS THAT THE ROWS BELOW DO NOT: this is the only LIST on the booker side, and at 320px a
    // list is a different composition from a detail — `md:hidden` card stack, one `RowCard` per
    // booking, each carrying a status chip, a `whenLabel` and a right-aligned `tabular-nums` money
    // figure in a `flex justify-between` row. Three of the fixture's six seeded bookings land on the
    // upcoming tab (`ends_at > now() AND status NOT IN ('cancelled','declined')`), so the surface is
    // measured with rows on it rather than in its empty state.
    name: "/bookings (the booker's list)",
    path: () => "/bookings",
    tell: (page) => page.getByTestId("row-card"),
    tellWhy:
      "a booking row in the MOBILE tree, which is the only tree that exists at this width (the route " +
      "renders a `hidden md:block` table beside a `md:hidden` card stack). The heading is the trap " +
      "here: `bookings/loading.tsx` composes `PageHeader title=\"Your bookings\"` and the real " +
      "`BookingsTabs` verbatim — deliberately, so the strip does not move when the rows land — so an " +
      "`h1` or a tab hook is satisfied by the skeleton. The plate's data region is a " +
      "`skeleton-row-list` and BOTH empty branches render `empty-state`, so this id pins the surface " +
      "AND the state that has something to overflow with.",
  },
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

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// RESP-03 CLAUSE C — THE DECLARED NO-WRAP SET, ON THE PHASE-13 SURFACES (plan 17-11, AC#8)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE SECOND CONSUMER OF `e2e/helpers/nowrap.ts`, AND THE REASON THE EXTRACTION EXISTS. Plan 17-04
// pulled `expectNoWrap` out of `mobile-booker-path.spec.ts` case (b) specifically so this file could
// ask the same question of subjects that spec's fixture cannot reach, and it left TWO rows in its own
// declared set carrying a paragraph skip that names PLAN 17-11 TASK 3 as their owner. These are those
// rows. The measurement is IMPORTED, never re-inlined: three copies of a no-wrap criterion is the
// drift that goes silent in the worst direction — the day a subject stops resolving a numeric
// `line-height`, one copy grows a guard and the others keep reporting green about `NaN`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY THE SET IS A TABLE AND NOT A LOOP OVER A SELECTOR
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// 17-UI-SPEC § Typography declares THREE classes — price, countdown, label — and a wrap means
// something different in each. A table makes every member carry its class, its locator, the surfaces
// it is measured on, and WHY it may not wrap; a bare `document.querySelectorAll('.tabular-nums')`
// sweep would measure whatever happened to match and would say nothing about what was left out. The
// integrity case at the foot of this block asserts the table cannot quietly lose a reason, an owner or
// a whole class — 17-04's discipline, applied to this file's half of the same set.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// ⚠ THE STATUS CHIP CANNOT BE MEASURED BY `expectNoWrap`, AND THAT IS A MEASUREMENT
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// The plan's own words for this task are *"every status chip label … measure at 320px in both
// themes"*, and 17-04's skip row hands them here. MEASURED FIRST, on `/dev/theme` at 320px in both
// themes (44 badges), and the result changes the instrument rather than the subject:
//
//   shipped, roomy                  clientHeight 18 · scrollHeight 19 · clientWidth 135 · scrollWidth 135
//   `nowrap` deleted, roomy         clientHeight 18 · scrollHeight 19 · clientWidth 135 · scrollWidth 135
//   `nowrap` deleted AND squeezed   clientHeight 18 · scrollHeight 27 · clientWidth  58 · scrollWidth  64
//   `nowrap` restored, squeezed     clientHeight 18 · scrollHeight 19 · clientWidth  58 · scrollWidth  90
//
// `clientHeight` is **18 in every one of those four states**, because `ui/badge.tsx`'s recipe pins the
// box at `h-5` — 20px less 1px of border top and bottom. So `expectNoWrap` on a chip is wrong in BOTH
// directions at once: it is RED on a correct tree (18 against a 16px line-height plus the 1px
// tolerance is 18 <= 17, false) and it is UNFALSIFIABLE (a genuine wrap leaves `clientHeight` at 18).
// That is 17-04's finding F3 — "a declared reservation compared against a line box" — arriving on a
// different element, and it is why the hold countdown's `h-8` slot is measured through its
// `p[role="timer"]` child rather than through the box.
//
// WHAT THE FOUR READINGS DO GIVE IS THE RIGHT CLAUSE, AND THE FIRST DRAFT OF IT WAS WRONG TOO — which
// is recorded rather than quietly corrected, because the wrong version looked obviously right. It
// asserted `scrollHeight <= clientHeight + 1` alongside the width clause and went RED on shipped code:
//
//   /bookings · grove · the first mobile row card    clientHeight 18 · scrollHeight 20
//
// EVERY shipped chip already lays out 1–2px more content than its box holds, because `h-5` is tighter
// than `py-0.5` plus a 16px line box by design — the ink fits, the line box does not — and the
// overhang varies by SURFACE (19 on `/dev/theme` in both themes, 20 on `/bookings`) rather than by
// theme. A tight vertical bound is therefore red on correct code, and a bound loose enough to be green
// would have to permit a whole extra line box.
//
// SO THE CLAUSE IS ASSERTED AT THE CAUSE INSTEAD. A chip is `h-5 overflow-hidden whitespace-nowrap`;
// while that last declaration holds, a wrap is IMPOSSIBLE, and the two things that can actually take
// the label away are the declaration being removed and the chip being squeezed. `expectChipNotClipped`
// asserts (1) the computed `white-space` is still `nowrap` — measured, deleting it changes nothing
// visible until a parent squeezes the chip, so a symptom-side gate would go green on the very commit
// that removed the protection — and (2) `scrollWidth <= clientWidth + 1`, which is the clip a nowrap
// chip actually has (90 against 58 squeezed; 135 = 135 shipped).
//
// IT IS NOT A SECOND DEFINITION OF "THIS TEXT DID NOT WRAP". It reads no `line-height` and makes no
// single-line claim; it is the measurement `expectNoWrap` structurally cannot make on a box whose
// height is a declaration. Every subject in this table that HAS its own text box goes through the
// shared helper, and the entry that does not says so in `measureWhy`.

/** The 1px allowance both clauses carry, and it is the SAME number for the same reason. */
const WRAP_TOLERANCE_PX = 1;

/**
 * ⚠ WHAT MAKES A `tabular-nums` ELEMENT A MONEY FIGURE — AND IT IS NOT THE CLASS. WATCHED RED.
 *
 * The first draft of the facts-list entry below located `dd.tabular-nums` and nothing else, which is
 * 17-UI-SPEC's price class read literally. It failed on the receipt with a 48px reading against a 24px
 * line box, and the subject it named was not a price:
 *
 *   Text: "Sunday, Aug 30, 10:51 AM – 11:51 AM (Makati time)"   clientHeight 48 · lineHeight 24
 *
 * `tabular-nums` is applied to DATES too — deliberately, and by rule: `payout-row.tsx` says in as many
 * words that a when-label carries the utility because it is a date. A when-label is prose, it is
 * `max-w-prose`-shaped, and it wraps by design; asserting one line on it is red on a correct tree and
 * names the wrong defect, which is the same trap `[data-testid="paid-statement"]` is declared a skip
 * for one entry down. So the class is NECESSARY and not SUFFICIENT, and the sufficient condition is
 * the one thing every money figure in this product renders and nothing else does: the currency symbol
 * `formatMoney` puts in front of it (optionally behind D-59's minus sign for a commission line).
 *
 * MEASURED with the filter, court, 320×568, on the Phase-13 fixture — the counts every `atLeast` below
 * is taken from, and the receipt is where the filter earns itself:
 *
 *   /bookings              3 visible `dd.tabular-nums`, 3 money   (₱1,050.00 ×3, one per row card)
 *   confirmation moment    3 visible, 3 money                     (₱1,000.00 · ₱50.00 · ₱1,050.00)
 *   confirmed detail       3 visible, 3 money                     (as above)
 *   the receipt            5 visible, 3 money                     (2 dropped: both when-labels)
 *   /bookings/[id]/cancel  6 visible, 6 money                     (the refund arithmetic)
 *
 * ⚠ IT IS CURRENCY-SPECIFIC, AND THE `atLeast` FLOORS ARE WHAT KEEP THAT HONEST. If the display
 * currency ever stops being `₱`, this filter matches nothing and every entry using it fails its floor
 * by name — which is the right failure, rather than a silent green over zero subjects.
 */
const MONEY_FIGURE = /^\s*[−-]?\s*₱/;

/** One member of the declared no-wrap set, on this file's Phase-13 surfaces. */
type NoWrapEntry = {
  /** How the member is named in failures and in the skip output. */
  readonly name: string;
  /** 17-UI-SPEC § Typography's three classes. The integrity case asserts all three are represented. */
  readonly kind: "price" | "countdown" | "label";
  /**
   * Which measurement this subject ADMITS.
   *
   * `no-wrap` goes through the shared `expectNoWrap`. `not-clipped` is for a subject whose height is a
   * DECLARED RESERVATION rather than a line box, where the shared helper is red on a correct tree and
   * unfalsifiable at the same time — `measureWhy` is then required and carries the readings.
   */
  readonly measure: "no-wrap" | "not-clipped";
  /** Required when `measure` is `not-clipped`: why the shared helper cannot be pointed at this. */
  readonly measureWhy?: string;
  /** The `PHASE_13_ROWS` names this entry is measured on. Asserted to resolve. */
  readonly on: readonly string[];
  /** `null` for a member no instrument in THIS file can reach; `skip` then says why, IN THE MESSAGE. */
  readonly locate: ((page: Page) => Locator) | null;
  /**
   * The vacuity floor for this entry's locator on every surface in `on`.
   *
   * A `for` loop over zero matches measures nothing and passes, which is the failure every guard in
   * this file exists to prevent. It is a FLOOR, never a pin: low enough that ordinary fixture
   * variation does not trip it, high enough that zero can never pass. Each entry's `why` carries the
   * count actually measured, so the two are readable side by side and a drift is visible.
   */
  readonly atLeast: number;
  /** Why this member may not wrap, in RESP-03's terms. */
  readonly why: string;
  /** Required when `locate` is `null`. A paragraph, and it names an owner. */
  readonly skip?: string;
};

/**
 * ⚠ MEASURED 30 August 2026 AT 320×568, court, against the Phase-13 fixture, before any of it was
 * trusted. The readings are in each entry, because a bound with no reading behind it is a guess:
 *
 *   booking-reference   clientHeight 24 · lineHeight 24 · display block   → ONE LINE, ZERO SLACK
 *   receipt-total       clientHeight 26 · lineHeight 26 · display block   → ONE LINE, ZERO SLACK
 *   paid-statement      clientHeight 72 · lineHeight 24 · display block   → THREE LINES, BY DESIGN
 *   [data-slot=badge]   clientHeight 18 · lineHeight 16 · display flex    → A RESERVATION, NOT A LINE
 *
 * The third and fourth are why two members of this table are not measured by `expectNoWrap`, and both
 * are recorded rather than dropped: a money figure is not automatically a no-wrap subject, and neither
 * is a fixed-height chip.
 */
const PHASE_13_NO_WRAP: readonly NoWrapEntry[] = [
  {
    name: "the booking reference",
    kind: "label",
    measure: "no-wrap",
    on: [
      "the confirmation moment",
      "the confirmed detail, no query",
      "payment state: pending settlement",
      "payment state: reversed, INDETERMINATE branch (D-96)",
      "the receipt",
    ],
    locate: (page) => page.getByTestId("booking-reference"),
    atLeast: 1,
    why:
      "TRUST-02 / D-78's booking reference — the string a booker reads out to support when something " +
      "has gone wrong with their money, on the five surfaces that render one. It is " +
      "`font-mono tabular-nums` at `text-body`, and MEASURED it has ZERO SLACK: `clientHeight 24` " +
      "against a resolved `line-height` of 24. A reference one character longer, or a theme one type " +
      "step up, wraps — and a reference read out from a clipped second line is a reference that " +
      "identifies the wrong booking or none at all.",
  },
  {
    name: "the receipt's Total",
    kind: "price",
    measure: "no-wrap",
    on: ["the receipt"],
    locate: (page) => page.getByTestId("receipt-total"),
    atLeast: 1,
    why:
      "The figure the receipt exists to state, on the surface a booker keeps. Measured `clientHeight " +
      "26` against a 26px line-height — one line, no slack, at the largest type step on the document. " +
      "17-UI-SPEC's price class names `price-total` explicitly; this is that hook's receipt-surface " +
      "twin (`price-breakdown.tsx` forks the id per surface so one document holds exactly one total).",
  },
  {
    name: "the itemised money figures in the booking facts list",
    kind: "price",
    measure: "no-wrap",
    on: ["the confirmation moment", "the confirmed detail, no query", "the receipt"],
    locate: (page) => page.locator("dd.tabular-nums").filter({ hasText: MONEY_FIGURE }),
    atLeast: 3,
    why:
      "17-UI-SPEC's price class is *every `tabular-nums` money figure in a fixed-height box*, and this " +
      "is where they are densest: each one is the `<dd>` of a `flex items-baseline justify-between` " +
      "row whose `<dt>` label is beside it, so a wrap does not push the row taller in a way anybody " +
      "reviews — it re-flows the amount UNDER its own label and the two stop reading as one fact. " +
      "Measured with the money filter: 3 on the moment, 3 on the detail, 3 on the receipt " +
      "(₱1,000.00 / ₱50.00 / ₱1,050.00 on each). The filter is not decoration — see `MONEY_FIGURE` " +
      "for the receipt's two `tabular-nums` when-labels, which this entry went red on first.",
  },
  {
    name: "the booker list's per-row amounts",
    kind: "price",
    measure: "no-wrap",
    on: ["/bookings (the booker's list)"],
    locate: (page) =>
      page.locator('[data-testid="row-card"] dd.tabular-nums').filter({ hasText: MONEY_FIGURE }),
    atLeast: 1,
    why:
      "The same class on the only LIST the booker has, where the box is tighter than on a detail page: " +
      "a `RowCard` at 320px carries a 48px thumbnail, a title, a meta line and this figure. Scoped " +
      "INSIDE `row-card` deliberately — the route renders a `hidden md:block` table beside the " +
      "`md:hidden` stack, and naming the tree that EXISTS at this width says more than relying on the " +
      "visibility filter to drop the other one. Measured: 3, one per seeded upcoming booking.",
  },
  {
    name: "the cancellation quote's money figures",
    kind: "price",
    measure: "no-wrap",
    on: ["/bookings/[id]/cancel"],
    locate: (page) => page.locator("dd.tabular-nums").filter({ hasText: MONEY_FIGURE }),
    atLeast: 3,
    why:
      "The refund arithmetic a booker is agreeing to before they cancel — measured, SIX money figures " +
      "on one 320px screen (₱1,050.00 · ₱1,000.00 · ₱50.00 · ₱500.00 · ₱0.00 · ₱500.00), the densest " +
      "money surface in the app. D-79's rule that a refund figure is a SIBLING line rather than part " +
      "of a badge is what puts them all here, in their own rows, where a wrap would separate an amount " +
      "from the thing it is an amount of. The floor is 3 rather than 6 because how many lines the " +
      "quote has depends on which cancellation window the fixture's booking falls in.",
  },
  {
    name: "every status chip label on the booking surfaces",
    kind: "label",
    measure: "not-clipped",
    measureWhy:
      "THE SHARED HELPER IS RED ON A CORRECT TREE AND UNFALSIFIABLE AT THE SAME TIME, MEASURED. " +
      "`ui/badge.tsx` pins the chip at `h-5`, so `clientHeight` reads 18 (20 less 1px of border top " +
      "and bottom) in EVERY state — with the label short, with `whitespace-nowrap` deleted, and with " +
      "the chip squeezed to 58px and genuinely broken over two lines. Against a 16px `line-height` " +
      "plus the 1px tolerance, `expectNoWrap` compares 18 <= 17 and fails a shipped chip; raise the " +
      "tolerance to make that pass and the clause can never fail again, because the number it reads " +
      "is a declaration and not a line box. It is 17-04's finding F3 on a different element. So the " +
      "clause is asserted at the CAUSE: `expectChipNotClipped` reads the computed `white-space` — the " +
      "one declaration that makes a wrap impossible in this box — and then the clip a nowrap chip " +
      "actually has (`scrollWidth 90 > clientWidth 58` squeezed; 135 = 135 shipped). It carries NO " +
      "vertical bound, and that is a measurement too: shipped chips read `scrollHeight` 19–20 against " +
      "an 18px box on correct code, varying by surface, so any tight vertical clause is red on a " +
      "clean tree. It reads no line-height and is a complement to the shared helper, not a copy.",
    on: [
      "/bookings (the booker's list)",
      "the confirmation moment",
      "the confirmed detail, no query",
      "the receipt",
    ],
    locate: (page) => page.locator('[data-slot="badge"]'),
    atLeast: 1,
    why:
      "A status chip whose label is clipped in a fixed-height chip is a clipped STATUS, and status is " +
      "the one thing these surfaces exist to communicate — `Awaiting payment` and `Approved — pay " +
      "now` are the longest in the vocabulary and both are states where money is outstanding. " +
      "Measured on the fixture: 6 chips on the booker's list, 1 on each detail surface.",
  },
  {
    name: "the money-carrying paid statement",
    kind: "price",
    measure: "no-wrap",
    on: ["the confirmation moment", "the confirmed detail, no query"],
    locate: null,
    atLeast: 0,
    why:
      "It carries a `tabular-nums` money figure inside a sentence, which is exactly the shape a reader " +
      "adding to this table would assume belongs in the price class.",
    skip:
      "NOT A NO-WRAP SUBJECT, AND THE MEASUREMENT IS THE POINT — recorded as a row rather than left " +
      "out, because the next author to widen this table will reach for it first. " +
      "`[data-testid=\"paid-statement\"]` measured `clientHeight 72` against a resolved `line-height` " +
      "of 24 on the confirmed detail at 320px: it renders on THREE LINES, by design. It is " +
      "`mx-auto max-w-prose` prose that happens to contain ₱1,050.00, not a figure in a declared box, " +
      "and 17-UI-SPEC's price class is *every tabular-nums money figure in a FIXED-HEIGHT BOX*. " +
      "Pointing the shared helper at it would be red on a correct tree and the diagnosis would name " +
      "the wrong thing entirely — a wrapped sentence rather than a clipped amount. The figure INSIDE " +
      "it is not separately addressable (it is a bare text node in the sentence), so measuring it " +
      "honestly would need a wrapper element, which is a product-source change this audit may not " +
      "make (17-UI-SPEC § Remediation). Same class of instrument limit as 17-04's F3; RECORDED FOR " +
      "PLAN 17-13's ledger.",
  },
  {
    name: "the checkout header's live hold countdown",
    kind: "countdown",
    measure: "no-wrap",
    on: ["the confirmation moment"],
    locate: null,
    atLeast: 0,
    why:
      "17-UI-SPEC's countdown class has exactly one member, and a table that represented only two of " +
      "the three classes would report clause C as covered while saying nothing about the third.",
    skip:
      "NOT ON ANY SURFACE THIS BLOCK REACHES, AND ALREADY MEASURED BY ITS OWNER. The countdown class's " +
      "one member is the checkout header's `HOLD_COUNTDOWN_BOX` (`h-8 min-w-24`) on " +
      "`/listings/[id]/book`, which needs a MINTED HOLD — and `e2e/mobile-booker-path.spec.ts` is the " +
      "only spec in the tree that mints one. Plan 17-04 measured it there, in both themes at 320px, " +
      "through this same `expectNoWrap`, pointed at the box's `p[role=\"timer\"]` CHILD rather than at " +
      "the box (the reservation reads `clientHeight 32` against a 20px line-height and is red on a " +
      "correct tree — the same trap the status-chip row above records one element over). The " +
      "Phase-13 surfaces render no countdown: the confirmation moment's decay (D-60) is a marker with " +
      "no ticking digits, and the pending state's 2.5s poller (D-71) renders no clock at all. This " +
      "row exists so the class is REPRESENTED with its owner named, rather than absent.",
  },
];

/**
 * RESP-03 clause C's other half, for a subject whose height is a DECLARATION.
 *
 * ⚠ READ THE BLOCK HEADER BEFORE CHANGING THIS. It is deliberately NOT a second `expectNoWrap`: it
 * reads no `line-height` and makes no single-line claim. On a `whitespace-nowrap overflow-hidden`
 * chip a wrap is IMPOSSIBLE while the declaration holds, so the two things that can actually take the
 * label away are (1) the declaration being removed and (2) the chip being squeezed until its one line
 * is clipped at the right edge. This asserts both, in that order.
 *
 * ⚠ AND THERE IS DELIBERATELY NO VERTICAL CLAUSE. The first draft asserted
 * `scrollHeight <= clientHeight + 1` and WENT RED ON SHIPPED CODE, which is the measurement worth
 * keeping rather than the assertion:
 *
 *   /dev/theme, court AND grove   clientHeight 18 · scrollHeight 19   (six chips, both themes)
 *   /bookings,  grove             clientHeight 18 · scrollHeight 20   (the first mobile row card)
 *   nowrap deleted AND squeezed   clientHeight 18 · scrollHeight 27
 *
 * Every shipped chip already lays out 1–2px MORE content than its box holds, because `h-5` (20px, less
 * 1px of border top and bottom = 18) is tighter than `py-0.5` plus a 16px line box by design — the ink
 * fits, the line box does not, and how much it overhangs varies by SURFACE (19 on `/dev/theme`, 20 on
 * `/bookings`) rather than by theme. So a tight vertical bound is red on correct code, and a bound
 * loose enough to be green would have to allow a whole extra line box, at which point it is no longer
 * measuring anything. A real wrap adds ~9px (27 against 18) and is caught by clause (1) at its cause.
 */
async function expectChipNotClipped(locator: Locator, where: string): Promise<void> {
  await expect(
    locator,
    `${where}: no element matched, so there is nothing to measure a clip on. A chip that stopped ` +
      "rendering and a chip that fits are the same green to every assertion below.",
  ).toHaveCount(1);

  const m = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      overflow: style.overflow,
      whiteSpace: style.whiteSpace,
      text: (el.textContent ?? "").trim(),
    };
  });

  // The same guard (a) `expectNoWrap` carries: an empty chip clips nothing.
  expect(
    m.text.length,
    `${where}: the chip rendered no text, so a clip assertion over it is free.`,
  ).toBeGreaterThan(0);

  // ── CLAUSE (1) — THE DECLARATION THAT MAKES A WRAP IMPOSSIBLE IS STILL THERE ────────────────────
  // This is the clause that stands in for a no-wrap measurement on this subject, and it is asserted at
  // the CAUSE rather than at the symptom on purpose: measured, deleting `whitespace-nowrap` from
  // `ui/badge.tsx`'s recipe changes NOTHING visible while the chip has room (`clientHeight 18 ·
  // scrollHeight 19` before and after), and only produces a clipped second line once a parent squeezes
  // it (`scrollHeight 27`). A gate that waited for the symptom would report green on the commit that
  // removed the protection and red on some unrelated layout change months later.
  expect(
    m.whiteSpace,
    `${where}: this chip computes \`white-space: ${m.whiteSpace}\`, not \`nowrap\`. Text: ` +
      `${JSON.stringify(m.text)}. That declaration is the ONLY thing stopping the label wrapping ` +
      "inside a box whose height is fixed at `h-5` and whose overflow is hidden — measured, a chip " +
      "with it removed and 58px of room lays out 27px of content inside an 18px box and simply does " +
      "not paint the second line. The wrap is invisible to `scrollWidth` gates and invisible to " +
      "`expectNoWrap` (the box height is a declaration, so `clientHeight` reads 18 either way), which " +
      "is why the property itself is the assertion here.",
  ).toBe("nowrap");

  // ── CLAUSE (2) — THE CLIP A NOWRAP CHIP ACTUALLY HAS ────────────────────────────────────────────
  expect(
    m.scrollWidth,
    `${where}: this chip's label is CLIPPED HORIZONTALLY — ${m.scrollWidth}px of content inside a ` +
      `${m.clientWidth}px box (computed \`overflow: ${m.overflow}\`). Text: ` +
      `${JSON.stringify(m.text)}. This is the failure a nowrap chip has INSTEAD of a wrap: squeezed ` +
      "by a parent, it keeps its one line and loses the end of the word. Measured at 90 against 58 " +
      "with the chip forced to 58px, against 135 = 135 shipped. `Awaiting payment` and `Approved — " +
      "pay now` are the longest labels in the vocabulary and are the two to check first.",
  ).toBeLessThanOrEqual(m.clientWidth + WRAP_TOLERANCE_PX);
}

/**
 * Run every declared member of the no-wrap set that lives on this row, through the ONE shared helper
 * (or, for the chip, through the clip clause the header argues for).
 *
 * ⚠ CALLED AFTER THE ROW'S OWN TELL HAS RESOLVED, and that ordering is [15-12] in a different clause:
 * a no-wrap measurement taken over a skeleton reads the plate's boxes and reports them as the
 * surface's. The loop below places the call after the tell and after `expectNoOverflow`, and BEFORE
 * `expectVisibleFocus` — which walks the keyboard forward and SCROLLS, which `expectMoneyStatement-
 * AboveFold`'s own note records as the thing that broke the first draft of this block's ordering.
 */
async function expectDeclaredNoWrap(page: Page, where: string, rowName: string): Promise<void> {
  for (const entry of PHASE_13_NO_WRAP) {
    if (entry.locate === null) continue;
    if (!entry.on.includes(rowName)) continue;

    // ⚠ `visible: true` IS AN INSTRUMENT CORRECTION, NOT A RELAXED ASSERTION, AND IT IS THIS FILE'S
    // OWN PRECEDENT — `expectMoneyStatementAboveFold` carries the same filter with the same
    // measurement, one screen up. TWO different invisible trees would otherwise be measured here:
    //
    //   • THE RETAINED PREVIOUS TREE UNDER A DRIVEN CLOCK. Watched red, 30 August 2026: on `the
    //     confirmation moment` (a `ticks: true` row, so `page.clock` is installed before the first
    //     navigation) `[data-testid="booking-reference"]` matched TWO elements, and #1 read
    //     `display: block · clientHeight 0 · rectHeight 0` with the same text. That is the mid-flight
    //     `router.refresh()` tree a frozen clock leaves inside a `hidden` container on `<body>`. It
    //     paints nothing, no booker can read it — and `expectNoWrap`'s guard (c) caught it and named
    //     it exactly, which is guard (c) doing its job on the first real subject that met it.
    //   • THE DESKTOP TABLE ON EVERY LIST SURFACE. `/bookings` renders `hidden md:block` beside
    //     `md:hidden`, so an unfiltered `[data-slot="badge"]` matched 6 where 3 are on screen.
    //     A `display: none` element reports 0 for every box, so it would satisfy the width clause
    //     trivially and report the surface as measured having measured nothing.
    //
    // The claim is therefore stated on what is RENDERED. The floor below counts visible matches, so a
    // subject that stopped painting still fails rather than passing quietly.
    const locator = entry.locate(page).filter({ visible: true });

    // ⚠ THE FLOOR IS POLLED, AND THE POLL WAS EARNED IN A RED-WATCH RATHER THAN ADDED IN ADVANCE.
    // `locator.count()` is an IMMEDIATE snapshot with no auto-wait — unlike every `expect(locator)`
    // form in this file — so the first draft raced the surface it measured. Watched, 30 August 2026,
    // during the `whitespace-nowrap` mutation below: `the receipt` reported *"the booking reference
    // matched 0 element(s) … under its floor of 1"* on a surface that renders one, because the dev
    // server was recompiling and the row's `tell` had resolved while the rest of the document had not.
    // That is [15-12] exactly — a vacuity guard firing on a correct tree — and 17-06's closure is the
    // one to copy: give the existing claim the same fifteen seconds `expectReachable` already allows,
    // and change nothing about what it asserts.
    let count = 0;
    await expect
      .poll(
        async () => {
          count = await locator.count();
          return count;
        },
        {
          timeout: 15_000,
          message:
            `${where}: the declared no-wrap member "${entry.name}" (${entry.kind}) stayed under its ` +
            `floor of ${entry.atLeast} for fifteen seconds. ${entry.why} A loop over zero matches ` +
            "measures nothing and passes, so an absent subject is a failure here — either the fixture " +
            "no longer reaches the state that renders it, or the subject moved and this entry must " +
            "move with it.",
        },
      )
      .toBeGreaterThanOrEqual(entry.atLeast);

    for (let i = 0; i < count; i += 1) {
      const subject = locator.nth(i);
      const label = `${where} · ${entry.kind}: ${entry.name} #${i}`;
      if (entry.measure === "not-clipped") {
        await expectChipNotClipped(subject, label);
      } else {
        await expectNoWrap(subject, label, WRAP_TOLERANCE_PX);
      }
    }
  }
}

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

        // RESP-03 clause C, AFTER the tell and BEFORE the focus walk (which scrolls). The declared set
        // and the reason for that placement are in the block above this describe.
        await expectDeclaredNoWrap(page, where, row.name);

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
// THE DECLARED NO-WRAP SET ASSERTS ITS OWN INTEGRITY (plan 17-11, 17-04's discipline)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A SIXTH DESCRIBE, AND LIKE D-201's IT OPENS NO BROWSER. `PHASE_13_NO_WRAP` is a claim about
// COVERAGE, and a set that quietly loses a member reports "clause C: covered" while a status chip
// clips its label on a surface nobody looked at. 17-04's own table carries the same case for the same
// reason; this is its half of the set. Everything here is about the TABLE, never about a page.
test.describe("RESP-03 clause C — the declared no-wrap set is complete and every row carries a reason", () => {
  const PHASE_13_ROW_NAMES = new Set(PHASE_13_ROWS.map((r) => r.name));

  test("every entry names Phase-13 rows that exist", () => {
    const dangling: string[] = [];
    for (const entry of PHASE_13_NO_WRAP) {
      if (entry.on.length === 0) dangling.push(`${entry.name} -> (no surface named)`);
      for (const rowName of entry.on) {
        if (!PHASE_13_ROW_NAMES.has(rowName)) dangling.push(`${entry.name} -> "${rowName}"`);
      }
    }
    expect(
      dangling,
      `${dangling.length} no-wrap entr(ies) name a Phase-13 row that does not exist, or name none at ` +
        `all:\n${dangling.map((s) => `  ${s}`).join("\n")}\n` +
        "An entry whose surfaces do not resolve is measured on nothing and still reads like coverage " +
        "— the same failure D-201's inventory catches one level up. Renaming a row is what usually " +
        "breaks this; rename the entry with it.",
    ).toEqual([]);
  });

  test("every entry carries prose, and every unreachable one carries a paragraph and an owner", () => {
    const thin = PHASE_13_NO_WRAP.filter((e) => e.why.trim().length < 80).map(
      (e) => `${e.name} (why: ${e.why.trim().length} chars)`,
    );
    expect(
      thin,
      `${thin.length} entr(ies) have a \`why\` shorter than 80 characters:\n` +
        `${thin.map((s) => `  ${s}`).join("\n")}\n` +
        "RESP-03's clause is *why it may not wrap*, per member. A locator with no argument behind it " +
        "is a selector somebody will delete the first time it is inconvenient.",
    ).toEqual([]);

    const silentSkips = PHASE_13_NO_WRAP.filter(
      (e) => e.locate === null && (e.skip ?? "").trim().length < 80,
    ).map((e) => `${e.name} (skip: ${(e.skip ?? "").trim().length} chars)`);
    expect(
      silentSkips,
      `${silentSkips.length} unreachable entr(ies) carry no paragraph reason:\n` +
        `${silentSkips.map((s) => `  ${s}`).join("\n")}\n` +
        "A silent absence is the failure; a NAMED skip is a measurement of a different kind. Say what " +
        "stands in the way, why this file's fixture cannot produce it, and which plan or spec owns it.",
    ).toEqual([]);

    const orphanSkips = PHASE_13_NO_WRAP.filter(
      (e) => e.locate !== null && e.skip !== undefined,
    ).map((e) => e.name);
    expect(
      orphanSkips,
      `${orphanSkips.length} entr(ies) are MEASURED and also carry a skip reason:\n` +
        `${orphanSkips.map((s) => `  ${s}`).join("\n")}\n` +
        "A reason for not measuring something that is being measured is a stale sentence, and stale " +
        "sentences in a gate are what plan 17-06 spent a task removing.",
    ).toEqual([]);
  });

  test("a `not-clipped` entry explains why the shared helper cannot be used on it", () => {
    const unexplained = PHASE_13_NO_WRAP.filter(
      (e) => e.measure === "not-clipped" && (e.measureWhy ?? "").trim().length < 80,
    ).map((e) => e.name);
    expect(
      unexplained,
      `${unexplained.length} entr(ies) opt out of \`expectNoWrap\` without saying why:\n` +
        `${unexplained.map((s) => `  ${s}`).join("\n")}\n` +
        "There is ONE definition of \"this text did not wrap\" in this repository and every subject " +
        "that can go through it must. An entry that takes the clip clause instead is making a claim " +
        "about its subject's BOX — that its height is a declaration rather than a line box — and that " +
        "claim needs its readings written down, or the next author will assume the helper was simply " +
        "inconvenient.",
    ).toEqual([]);
  });

  test("all three of 17-UI-SPEC's classes are represented, and the set is not all skips", () => {
    const kinds = new Set(PHASE_13_NO_WRAP.map((e) => e.kind));
    for (const kind of ["price", "countdown", "label"] as const) {
      expect(
        kinds.has(kind),
        `17-UI-SPEC § Typography declares THREE no-wrap classes — price, countdown, label — and this ` +
          `table represents ${[...kinds].join(", ")}. A missing class is a class nobody is measuring ` +
          "and nobody can see is unmeasured. If this file genuinely cannot reach a member of it, add " +
          "the row with `locate: null` and a paragraph naming its owner, the way the countdown row " +
          "does.",
      ).toBe(true);
    }

    const measured = PHASE_13_NO_WRAP.filter((e) => e.locate !== null);
    expect(
      measured.length,
      `this table declares ${PHASE_13_NO_WRAP.length} member(s) and MEASURES ${measured.length} of ` +
        "them. A set that measures nothing is a set of reasons, and clause C would be reported as " +
        "covered by a table that never opened a page.",
    ).toBeGreaterThanOrEqual(4);

    // The shared helper has to be the one doing most of the work, or the extraction bought nothing.
    const throughHelper = measured.filter((e) => e.measure === "no-wrap");
    expect(
      throughHelper.length,
      `${throughHelper.length} of the ${measured.length} measured entr(ies) go through the shared ` +
        "`expectNoWrap`. The clip clause is a complement for ONE subject class whose box is a " +
        "declared height; if it has become the majority, the file has grown a second definition of " +
        "the criterion by attrition, which is the exact drift `helpers/nowrap.ts` was extracted to " +
        "prevent.",
    ).toBeGreaterThan(measured.length - throughHelper.length);
  });
});


// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 14 — THE FIVE HOST SURFACES (plan 14-16) · WIDENED TO ELEVEN BY PLAN 17-11 (RESP-03 / AC#1)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ THE HEADING KEEPS ITS ORIGINAL CLAIM AND ADDS THE NEW ONE BESIDE IT, which is this file's
// amendment idiom (plan 17-06 established it: a closed finding's stale sentence is REPLACED with its
// own text quoted as history, never silently deleted). "Five" is what plan 14-16 shipped and is what
// every paragraph below was written about; ELEVEN is the count as of plan 17-11, which added six host
// routes that had zero 320px measurement anywhere. The six are grouped at the END of `PHASE_14_ROWS`
// under their own banner with their own argument — read that block, not this paragraph, for why each
// one is here and what it can and cannot prove.
//
// TWO SENTENCES BELOW ARE NOW HISTORY AND ARE MARKED WHERE THEY STAND rather than rewritten in place:
// the "TWO OF THE FIVE SURFACES DECLARE NONE" bullet (it is EIGHT OF THE ELEVEN as of 17-11, and the
// argument is identical) and the NOT-COVERED list, which gains two entries from this plan.
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
// [AMENDED BY PLAN 17-11 — it is EIGHT OF THE ELEVEN now, because all six routes that plan added
// declare an empty list too. The sentence below is left standing because its ARGUMENT is unchanged and
// is the one every new row cites by name; only the arithmetic moved.]
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
//   • THE SITE HEADER IS NO LONGER A BLIND SPOT, AND THIS BULLET IS REPLACED RATHER THAN DELETED
//     (plan 17-06). It read: *"THE SHELL CHROME IS STILL EXCLUDED from the target-size scan, and it
//     still fails — the 16x16 `ProfileLink` below `sm:` is a Phase-11 finding carried in
//     `deferred-items.md`."* Both halves are now false. D-196 padded the control to 28x28 and this
//     commit deleted the `site-header` half of `collectControls`'s exclusion, so the host header's
//     controls — which are the same header's — are measured against the 24px floor on every row in
//     this block. What IS still excluded is the FOOTER, and its reason is measured rather than
//     inherited; see `collectControls`.
//   • THE FOCUS WALK CAN LAND IN THE FOOTER ON A CONTROL-LESS SURFACE (found by plan 17-11, NOT fixed
//     here). `expectVisibleFocus` walks Tab until `inHeader` is false — and `inHeader` is `site-header`
//     alone, so on `/host/earnings`, which ships no action of its own (see its row's `noOwnControls`),
//     the "first in-surface control" it measures is a FOOTER link. The ring assertion is still made and
//     still true; what it is not is a statement about that route. Fixing it means teaching the walk
//     what "the surface" is, which changes what every row in two blocks measures — out of scope for a
//     plan whose subject is coverage. Recorded for 17-13's ledger.
//   • `/host/payouts/refresh` ISSUES A REAL PAYMONGO REQUEST PER CASE. Its row's comment has the whole
//     measurement; it is repeated here because it is the only thing in this file that leaves the
//     machine, and a reader auditing this suite's blast radius should not have to find it in a row.
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
  /**
   * The signed-up host's own id (plan 17-11).
   *
   * Needed by TWO of this plan's six new rows and by the teardown. `/host/earnings` reads
   * `host_payout_ledger` scoped to `host_id`, so the fixture's one ledger row has to name it; and
   * `/host/payouts/refresh` writes an `audit` row per visit whose `actor_id` is this value. `audit`
   * carries NO foreign key by design (schema.ts's D4 note), so those rows do not block the teardown —
   * which is exactly why they have to be deleted explicitly rather than left to a cascade.
   */
  readonly hostId: string;
  /**
   * The FUTURE confirmed booking's id — the row `/host/bookings/[id]` is measured on (plan 17-11).
   *
   * The future one specifically, and it is the fixture's own `cancellable` predicate that decides it:
   * `(host)/host/bookings/[id]/page.tsx` renders the cancel section only while
   * `status === 'confirmed' && starts_at > now()`, so today's session (dayOffset 0, which has already
   * started by the time a run reaches it) renders the SHORTER document. This block's stated rule is to
   * measure the state with the most in it, so the row takes the one that still carries the separator,
   * the fee sentence and the dialog trigger.
   */
  readonly confirmedBookingId: string;
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
  // …and an ops-APPROVED host_verification row — deriveBookable's SIXTH term (phase 18,
  // D-224). A host with NO row reads as 'unverified' and cannot sell, so without this the
  // listing seeded below is not bookable and this spec fails on a page that never renders.
  // ⚠ e2e does NOT run in CI (D-24) — only a hand run can catch a miss here.
  await sql`
    INSERT INTO "host_verification" (user_id, status, provider, created_at, updated_at)
    VALUES (${host.id}, ${"approved"}::host_verification_status, ${"manual"}, now(), now())
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
      currency, booking_mode, status, review_state, cancellation_policy, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${host.id}, ${listingTitle},
      ${"A covered court with two hoops, a scoreboard and a water station."},
      ${"multi_sport_court"}::space_type,
      ${"7 Real Street"}, ${HOST_VENUE_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"},
      ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${10}, ${1}, ${HOST_VENUE_TZ},
      ${47333}, ${288888}, ${25000}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status, ${"approved"}::listing_review_state,
      ${"standard"}::cancellation_policy,
      now(), now(), now()
    )
  `;

  /**
   * One booking, positioned by VENUE-LOCAL day offset — `host-dashboard.spec.ts:263-280`'s idiom.
   *
   * RETURNS THE ID SINCE PLAN 17-11, and the change is one line for a reason worth stating: the
   * `/host/bookings/[id]` row needs a real booking id and the alternative — re-querying the table for
   * "the confirmed one" — would make the row depend on a SELECT that another seeded row could satisfy.
   * The id the fixture minted is the id the fixture means.
   */
  const addBooking = async (
    dayOffset: number,
    startHour: number,
    endHour: number,
    status: "confirmed" | "requested",
  ): Promise<string> => {
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
    return id;
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
  const confirmedBookingId = await addBooking(3, 14, 16, "confirmed");

  // ⚠ ONE PAYOUT LEDGER ROW, AND IT IS THE DIFFERENCE BETWEEN MEASURING `/host/earnings` AND MEASURING
  // ITS EMPTY STATE (plan 17-11). MEASURED first, on a signed-up host with no ledger row: the route
  // renders `PageHeader`, the two `PayoutSummary` panels and `EmptyState` — i.e. everything except the
  // thing that can overflow. The mobile tree the 320px floor is actually about is `PayoutRow`, a
  // `RowCard` carrying three `tabular-nums` money figures in `flex items-baseline justify-between`
  // rows, one of them labelled `FitOut commission (10%)` — the longest label/figure pair on any host
  // surface. A row that swept the empty state would have reported this route COVERED while the only
  // composition on it able to break the floor was never on screen, which is the silent-absence failure
  // this whole plan exists to close, arriving one level in.
  //
  // `kind: 'payout'`, because `(host)/host/earnings/page.tsx`'s query scopes to it and a
  // `host_cancel_fee` row would render nowhere. `state: 'held'` because that is what a confirmed,
  // not-yet-delivered session's payout IS under the hold-until-session model (CLAUDE.md § Payments) —
  // the fixture's future booking has not happened, so any other state would be a lie the surface then
  // renders as a badge.
  //
  // ⚠ TEARDOWN IS NOT A CASCADE HERE. `host_payout_ledger.booking_id` AND `.host_id` are both
  // ON DELETE RESTRICT (schema.ts:432-439), so this row BLOCKS both the booking delete and the host
  // delete. `afterAll` deletes it first, explicitly; see the note there.
  const commissionCents = 10_500; // 10% of the seeded 105,000 quoted total (D-52's gross − commission).
  await sql`
    INSERT INTO "host_payout_ledger" (
      id, booking_id, host_id, gross_cents, commission_rate_bps, commission_cents, net_cents,
      currency, state, kind, created_at, updated_at
    ) VALUES (
      ${`e2e_of320_ledger_${randomUUID()}`}, ${confirmedBookingId}, ${host.id},
      ${105_000}, ${1_000}, ${commissionCents}, ${105_000 - commissionCents},
      ${"php"}, ${"held"}::payout_ledger_state, ${"payout"}::ledger_kind, now(), now()
    )
  `;

  return { listingId, bookerId, hostId: host.id, hostEmail: email, confirmedBookingId, sql };
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
  /**
   * This surface renders NO interactive control of its own — the reason, in the message (plan 17-11).
   *
   * ⚠ A DECLARATION, NOT AN EXEMPTION, and the distinction is the same one `touch: []` + `touchWhy`
   * makes one field up. Setting it INVERTS `expectTargets`'s vacuity guard from "at least one action of
   * its own" to "exactly zero, and here is why", so the row goes red the day the surface grows a
   * control — which is the direction a stale declaration fails in. The 24px floor is unaffected and
   * still runs over every control the scan found, shell included.
   *
   * Exactly one row sets it today. See `expectTargets`'s parameter docblock for the measurement that
   * made the original guard's own sentence false of the shipped app.
   */
  readonly noOwnControls?: string;
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

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // PLAN 17-11 — THE SIX HOST ROUTES WITH ZERO 320px MEASUREMENT (RESP-03 clause A, AC#1)
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // ENUMERATED, NOT REMEMBERED (17-CONTEXT D-201). `src/app/**/page.tsx` is 29 files; less the two
  // `src/app/dev/**` instruments that is 27 production-reachable page routes. Twenty were measured at
  // 320px in both themes before this plan and SEVEN were absent from this file entirely — all seven
  // behind the host or booker session gate, which is why they were never seed-free enough for the AC#29
  // table. Six of them are here; the seventh (`/bookings`) is a BOOKER surface and lives in the Phase-13
  // block, whose fixture already produces the session it needs.
  //
  // THEY ARE ROWS IN THIS TABLE RATHER THAN A FOURTH TABLE, and that is the plan's own instruction with
  // its own reason: a fourth table is a fourth place a surface can be silently absent, which is exactly
  // what the D-201 inventory assertion below exists to forbid. Every one runs the block's existing
  // chain unchanged — `seedTheme`, `setViewportSize` to `FLOOR_PX`, `goto`, `document.fonts.ready`, the
  // `tell`, then `expectNoOverflow`, `expectTargets` at 24 and `expectTouchTargets` at 44 BY NAME.
  //
  // ⚠ NOT ONE OF THE SIX DECLARES A TOUCH TARGET, AND THAT IS SIX DECLARATIONS RATHER THAN SIX
  // OMISSIONS. 14-UI-SPEC § Primary CTAs gives a height note to exactly four controls in the whole host
  // area, and all four are already asserted by the rows above. Every control on these six ships at the
  // Button's default height — D-22 makes 44px an explicit OPT-IN and never a responsive default — so a
  // blanket 44 here would be red against shipped, reviewed, deliberate code, which is the false-positive
  // failure `TARGET_FLOOR_PX`'s docstring records this file refusing twice already. Each row says which
  // control it looked at.
  {
    name: "/host/bookings/[id]",
    path: (f) => `/host/bookings/${f.confirmedBookingId}`,
    // THE `tell` IS A DEFINITION TERM, AND THE OBVIOUS HOOKS ARE ALL TRAPS ON THIS ROUTE. The `h1` is
    // the listing title, which four other rows in this table also render; the back button
    // (`← Back to bookings`) is composed BYTE-IDENTICALLY by `bookings/[id]/loading.tsx:24-26`, so a
    // control hook is satisfied by the plate. What only the RESOLVED page renders is its `<dl>` — the
    // plate's data region is a `PanelSkeleton` with no list in it at all. `Guest paid` is the string
    // that names it: grepped over `src/`, it appears exactly ONCE, in this route's own page.tsx:150.
    tell: 'dt:text-is("Guest paid")',
    tellWhy:
      "the detail's own definition list, which the route's `loading.tsx` does not render — its data " +
      "region is a `PanelSkeleton` and it composes the same container and the same back button " +
      "verbatim, so anything weaker is satisfied by the plate. A booking that is missing OR not this " +
      "host's takes the same bare `notFound()` (never a distinguishing message), which renders the " +
      "host not-found boundary and no `<dl>`; `/login` renders `panel-card` and no `<dl>` either.",
    touch: [],
    touchWhy:
      "NONE DECLARED. This surface has exactly one action below the fold — `Cancel booking`, the " +
      "dialog trigger at `host-cancel-dialog.tsx:131` — and it is `variant=\"outline\"` at the " +
      "Button's DEFAULT height with no `size` prop. 14-UI-SPEC § Primary CTAs gives it no height " +
      "note, so asserting 44 would be the `/host` argument again on a different control. The 24px AA " +
      "bar applies to it and `expectTargets` runs.",
  },
  {
    name: "/host/earnings",
    path: () => "/host/earnings",
    // ⚠ THE PLATE COMPOSES THE SAME `PageHeader title="Earnings"` — MEASURED, `earnings/loading.tsx:28`,
    // and it reads one shared constant with the page precisely so the two cannot drift. So the heading
    // is the trap here, not the tell: an `h1` hook would report this route covered off its own skeleton.
    // `PayoutSummary` is what only the resolved page renders, and the panel carrying `Upcoming payouts`
    // is the one element on the surface that exists in every state — empty ledger or full.
    tell: '[data-testid="panel-card"]:has-text("Upcoming payouts")',
    tellWhy:
      "the earnings summary pair. The route's plate renders `PageHeader` with the IDENTICAL title and " +
      "a `skeleton-row-list`, and carries no panel card — so the heading is satisfied by the skeleton " +
      "and this is not. Scoped by the label rather than by `panel-card` alone because `PayoutBanner` " +
      "and the empty state are panels on this surface too.",
    touch: [],
    touchWhy:
      "NONE DECLARED. In the fixture's state (`payouts_enabled`) this surface renders NO button at " +
      "all — the banner is suppressed, the payout rows are terminal (`payout-row.tsx` states in as " +
      "many words that a payout row navigates nowhere) and the empty state passes `actions={null}`. " +
      "There is no control here to give a height note to, which is a stronger form of the same " +
      "declaration the rows above make.",
    // ⚠ THE ONLY ROW IN EITHER BLOCK THAT SETS THIS, AND IT WAS FOUND BY GOING RED. This row's first
    // run failed `expectTargets`'s vacuity guard — zero non-shell controls, polled for the full
    // fifteen seconds, on a correct tree — which means the guard's own sentence ("every Phase-13 and
    // Phase-14 surface ships at least one action of its own") was false of the shipped app and nobody
    // could know until a control-less surface joined the table. It is declared rather than exempted;
    // see the field's docblock and `expectTargets`'s parameter.
    noOwnControls:
      "`/host/earnings` is a read-only status view and ships no action. In the fixture's " +
      "`payouts_enabled` state `PayoutBanner` (whose `Set up payouts` button is the only control this " +
      "route can render) is suppressed by the page's own condition; `payout-row.tsx` takes NO `href` " +
      "on purpose, stating that a payout row is terminal and that giving it a destination would be a " +
      "product change smuggled in by a container swap; and the zero-ledger branch passes " +
      "`actions={null}` with its own written argument (the next step is a guest booking the space, " +
      "which the host cannot do). Every route that could give this surface an action is elsewhere",
  },
  {
    name: "/host/listings",
    path: () => "/host/listings",
    // THE SAME PLATE TRAP AS `/host/earnings`, one route over: `listings/loading.tsx:39` composes
    // `PageHeader title="Your listings"` verbatim. The `Availability` action on a listing card is what
    // the plate cannot produce — `CardGridSkeleton` draws boxes and no anchors — and it also pins the
    // STATE with a card in it, since the zero-listings branch renders `EmptyState` whose only link is
    // `/host/listings/new`.
    tell: 'a[href^="/host/listings/"][href$="/availability"]',
    tellWhy:
      "the `Availability` action on a real listing card. The route's plate composes the identical " +
      "`PageHeader` and a `skeleton-card-grid` with no anchors in it; the no-listings state renders " +
      "`empty-state` and links only to `/host/listings/new`. So this href pins the surface AND the " +
      "state that has something to overflow with — a card grid carrying the fixture's deliberately " +
      "long space title.",
    touch: [],
    touchWhy:
      "NONE DECLARED, and it is `/host`'s argument verbatim: `Create listing` is this page's one " +
      "accent-filled control and it renders at the Button's DEFAULT height. The card's own " +
      "`Edit`/`Availability`/`Unlist`/`Delete` cluster is `size=\"sm\"`, i.e. SMALLER than the " +
      "default by design. Asserting 44 on any of them would be red against reviewed code; all of them " +
      "are inside `expectTargets`'s 24px scan.",
  },
  {
    name: "/host/payouts/return",
    path: () => "/host/payouts/return",
    // ⚠ THE WORST PLATE TRAP IN THE TABLE, AND IT IS WORTH NAMING AS ONE. `payouts/return/loading.tsx`
    // renders `<h1>Thanks — that&apos;s submitted</h1>` BYTE-IDENTICALLY to the page it stands in for —
    // deliberately, so the sentence does not move when the payout state lands. A heading hook here does
    // not merely fail to prove the resolved page; it proves the SKELETON. `PayoutBanner` is the one
    // element the plate replaces with a `PanelSkeleton`, so it is the only honest tell on this route.
    tell: "[data-payout-banner]",
    tellWhy:
      "the payout banner, which is the entire difference between this route's resolved document and " +
      "its plate — the plate renders the SAME `h1` verbatim and a `PanelSkeleton` in the banner's " +
      "slot. The attribute is state-agnostic on purpose: the banner renders one of four states and " +
      "`derivePayoutStatus` picks it from the fixture's `host_payout` row, so pinning a single state " +
      "here would make the row a fixture assertion rather than a reachability guard.",
    touch: [],
    touchWhy:
      "NONE DECLARED. The one control is `Back to your dashboard`, `variant=\"outline\"` at the " +
      "Button's default height (`payouts/return/page.tsx:49`), with no height note anywhere in the " +
      "spec. The banner's own `Set up payouts` action does not render in the fixture's enabled state.",
  },
  {
    name: "/host/payouts/refresh",
    path: () => "/host/payouts/refresh",
    // ⚠ THIS ROW MEASURES A FALLBACK, AND THE FALLBACK IS THE ONLY THING IT CAN MEASURE — MEASURED
    // 30 August 2026 rather than reasoned about, because the plan's own threat model got this route
    // wrong (T-17-59 asserts these two rows "issue no PayMongo call").
    //
    // `payouts/refresh/page.tsx` calls `refreshOnboardingLink()` → `startPayoutOnboarding()` →
    // `createOnboardingLink()`, which is a REAL `POST https://api.paymongo.com/v1/linked_accounts/
    // onboarding_links` with whatever `PAYMONGO_SECRET_KEY` the local `.env` carries. On success the
    // page `redirect()`s to PayMongo and there is no document here at all. Platforms / Linked Accounts
    // is beta / sales-gated (src/lib/paymongo.ts's own BETA NOTE), so the call fails, `res.ok` is
    // false, and the host lands on the retry sentence this row names. PROBED on a freshly signed-up
    // host, both directions of the failure: `h1: "Let's pick up where you left off"`, no redirect.
    //
    // WHAT THAT COSTS, stated so nobody discovers it: two outbound POSTs per run (one per theme), each
    // writing one `audit` row with `outcome: "error"`. Neither creates a PayMongo resource — the
    // endpoint 404s before it reaches one — and `afterAll` deletes the audit rows. It also spends 2 of
    // `startPayoutOnboarding`'s 5-per-60s per-identity budget, which is why the two cases are the only
    // visits this file makes to this route.
    //
    // AND THE PLATE IS NOT A TRAP HERE, unusually: `payouts/refresh/loading.tsx` renders one
    // `Reopening payout setup…` paragraph and no heading at all.
    tell: 'h1:has-text("pick up where you left off")',
    tellWhy:
      "the retry sentence's own heading, which exists on no other route and which the route's plate " +
      "does not render (its whole content is a `Reopening payout setup…` status paragraph). It is " +
      "matched on a substring rather than in full because the shipped copy contains a typographic " +
      "apostrophe (`&apos;`), and a spec re-typing one is the drift `AVATAR_CROP_TITLE`'s import note " +
      "warns about — the substring carries no apostrophe and cannot go quietly wrong.",
    touch: [],
    touchWhy:
      "NONE DECLARED. The fallback renders exactly one control, `Back to your dashboard`, " +
      "`variant=\"outline\"` at the Button's default height and with no height note in the spec — the " +
      "same opt-in argument every row above records.",
  },
  {
    // ⚠ LAST IN THIS TABLE ON PURPOSE, AND THE ORDER IS THE MEASUREMENT. Every visit to this route
    // CREATES A DRAFT LISTING owned by the fixture host (`createDraftListing`, then `redirect` into
    // `[id]/edit`), so two visits add two cards to the grid `/host/listings` measures three rows above.
    // Sitting last, this row cannot change what any earlier row measured; sitting anywhere else it
    // would silently make one of them measure a different page than the one it names. The drafts
    // themselves are cleaned by the cascade — `listing.host_id` is ON DELETE CASCADE — see `afterAll`.
    //
    // ⚠ AND WHAT IT MEASURES IS A COMPOSITION THIS TABLE ALREADY COVERS, WHICH IS RECORDED RATHER THAN
    // TREATED AS A REASON TO DROP THE ROW. MEASURED, 30 August 2026: `page.goto('/host/listings/new')`
    // ends on `h1: "What kind of space is it?"` with one `wizard-step-rail` — i.e. the wizard's FIRST
    // STEP, the same composition the `/host/listings/[id]/edit` row measures, with strictly LESS in it
    // (a brand-new draft has no title, no photos and no rates). D-201 still wants the route in the
    // table with a measurement rather than a reason, and the measurement is cheap; what it is NOT is a
    // new surface, and a later reader counting distinct compositions should count this one as zero.
    name: "/host/listings/new",
    path: () => "/host/listings/new",
    tell: '[data-testid="wizard-step-rail"]',
    tellWhy:
      "the step rail, which only the resolved wizard renders — and on THIS route it proves one thing " +
      "more than it does on the two rows above: `page.tsx` redirects to `/host/listings` when " +
      "`createDraftListing` fails, and that grid renders no rail. So the rail is also the proof that " +
      "the draft was created rather than that the fallback was taken. The route's own plate is a " +
      "`Creating your listing…` status paragraph with no rail, and `/login` renders `panel-card`.",
    touch: [],
    touchWhy:
      "NONE DECLARED, for the `/host/listings/[id]/edit · photos step` row's reason: the one control " +
      "14-UI-SPEC gives a height note to on the wizard is the publish checklist's disclosure trigger, " +
      "and the row three above already asserts it on the same composition. Asserting it here would be " +
      "the same measurement twice on a strictly emptier document.",
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
// ⚠ THE PARAMETER IS THE `touch` SLICE AND NOT `Phase14Row`, AS OF PLAN 18-12 — a strict widening,
// because the Phase-18 block below declares the same field on a row that resolves its path from no
// fixture at all. Nothing here ever read anything else off the row, so the narrower type was a
// coupling rather than a constraint.
async function expectTouchTargets(
  page: Page,
  where: string,
  row: { readonly touch: readonly TouchTarget[] },
): Promise<void> {
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
    //
    // ⚠ THREE OF THE FIVE STATEMENTS ARE PLAN 17-11'S, AND EACH IS A ROW NO CASCADE WOULD REACH:
    //
    //   • `host_payout_ledger` — the earnings row this fixture seeds. BOTH its `booking_id` and its
    //     `host_id` are ON DELETE RESTRICT (schema.ts:432-439), so leaving it would fail the booking
    //     delete AND the host delete and leak the entire fixture into the dev database. It goes FIRST.
    //   • `audit` — `/host/payouts/refresh` calls `startPayoutOnboarding`, which records one audit row
    //     per visit (two per run, one per theme). The table carries NO foreign key by design, so these
    //     rows are invisible to every cascade and would accumulate silently, one pair per run, forever.
    //   • The DRAFT LISTINGS `/host/listings/new` creates — one per theme per run. `listing.host_id` IS
    //     ON DELETE CASCADE, so the host delete below already removes them; they are named here only so
    //     the next reader does not go looking for the statement that must be missing.
    await fixture.sql`DELETE FROM host_payout_ledger WHERE host_id = ${fixture.hostId}`;
    await fixture.sql`DELETE FROM audit WHERE actor_id = ${fixture.hostId}`;
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
        await expectTargets(page, where, row.noOwnControls);
        await expectTouchTargets(page, where, row);
        await expectVisibleFocus(page, where);
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// OPS-04 — THE ONE PHASE-18 SURFACE AT 320px, IN BOTH THEMES (plan 18-12)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A FIFTH DESCRIBE, and it exists rather than a row in the tables above for one reason: no table
// above can carry a STAFF session. `ROUTES` drives anonymously, `PHASE_13_ROWS` carries a booker and
// `PHASE_14_ROWS` a host — and staff standing is CLI-only by D-217, a database write no sign-up
// intent can produce.
//
// ⚠ THIS IS THE ONLY INSTRUMENT IN THE REPOSITORY THAT CAN PROVE THE PHOTO-BEARING ROW DOES NOT
// OVERFLOW AT THE FLOOR, and it is worth saying why the question is real rather than ceremonial.
// `/ops` is the one list surface whose row contains a PICTURE: `PhotoGallery`'s mosaic, at
// `OPS_QUEUE_SHELL`'s wider `max-w-5xl` measure, beside a `shrink-0` status column and above a
// six-term description list and two 44px buttons. 18-UI-SPEC names three narrow-viewport hazards for
// it by name — the status-column squeeze, a horizontal photo strip, and controls that shrink instead
// of wrapping — and a jsdom test can see none of the three.
//
// ⚠ AND IT IS NOT A GATE. PROJECT D-24 keeps every e2e spec but `price-parity.spec.ts` out of CI, so
// what these two cases produce is a ONE-TIME AUDIT RESULT recorded in the plan's SUMMARY, not ongoing
// enforcement. Nothing anywhere may describe them as enforcing OPS-04.
//
// THE FIXTURE IS THE SHIPPED BOOKER SEED, FLIPPED. `seedBookableListing` writes an APPROVED review
// state and an approved host verification, because every other spec needs its listing to sell (the
// D-224 sell-gate); `seedReviewQueue` flips both to `pending`, which puts ONE listing AND ONE host in
// the queue — the two structurally different row shapes, which is what makes "the queue" a real
// subject here rather than one card.

const PHASE_18_TOUCH: readonly TouchTarget[] = [
  {
    name: /^Approve /,
    why:
      "18-UI-SPEC § The decision controls: `Approve` is a neutral SOLID at `size=\"touch\"` (44px). " +
      "Never the brand variant — an ops reviewer working through forty listings must not be nudged " +
      "toward yes by a colour — and never below the touch height, because it is the control the " +
      "whole surface exists for.",
  },
  {
    name: /^Reject /,
    why:
      "the same height as its pair, and for `/host/requests`' reason restated: a 44px yes beside a " +
      "smaller no is a thumb-sized bias. It opens the reject overlay rather than acting, which is " +
      "why it can never be one press.",
  },
];

test.describe(`OPS-04 — the /ops review queue at ${FLOOR_PX}px, in both themes`, () => {
  // SERIAL for the Phase-13 and Phase-14 blocks' reason: one seeded fixture built in `beforeAll`,
  // which runs once per WORKER — so a parallel block would sign one staff account up per worker and
  // tear down another worker's rows from under it.
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let seed: SeededListing | null = null;
  let staff: Awaited<ReturnType<typeof signUpStaff>> | null = null;
  let staffCookies: Awaited<ReturnType<BrowserContext["cookies"]>> = [];

  test.beforeAll(async ({ browser }) => {
    seed = await seedBookableListing({ photos: 5, titlePrefix: "E2E Ops" });
    await seedReviewQueue(seed);

    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    staff = await signUpStaff(page);
    staffCookies = await context.cookies();
    await context.close();
  });

  test.afterAll(async () => {
    // The staff account and its audit row first — it is unrelated to the listing's foreign keys, and
    // ordering it first means a failure there cannot leave the bigger fixture behind.
    await staff?.staffTeardown();
    await seed?.teardown();
  });

  for (const theme of THEMES) {
    test(`/ops · ${theme}`, async ({ page }) => {
      expect(seed, "the ops fixture is null — `beforeAll` failed and there is nothing to measure")
        .not.toBeNull();
      expect(
        staffCookies.length,
        "the staff sign-up produced no cookies, so this navigation would be answered by the 404 a " +
          "non-staff caller gets (D-219) — the ROOT not-found body, which is a real document that " +
          "does not overflow and whose controls all clear the floor. The failure would look green.",
      ).toBeGreaterThan(0);

      await page.context().addCookies([...staffCookies]);
      await seedTheme(page.context(), theme);
      await page.setViewportSize({ width: FLOOR_PX, height: 900 });

      await page.goto(`${BASE}/ops`);
      await page.evaluate(() => document.fonts.ready);

      const where = `/ops · ${theme} · ${FLOOR_PX}px`;

      // THE TELL IS A PHOTOGRAPH, not the page header and not a row card. `row-card` would be
      // satisfied by the HOST row alone, which carries no image and is therefore not the shape this
      // block exists to measure; the page header is satisfied by the plate AND by the empty panel.
      // The gallery renders only on a resolved LISTING row, and it is addressed by its own
      // ACCESSIBLE NAME rather than by a declared id — `selector-contract.ts` is UNCHANGED by Phase 18
      // (18-UI-SPEC's does-not-move table), and its scope rule is explicit: an id is added only where
      // a role or label query cannot express the target. `section[aria-label]` can.
      await expect(
        page.locator('[data-testid="row-card"] section[aria-label^="Photos of "]'),
        `${where}: the queue rendered no photo mosaic, so the row this block exists to measure is ` +
          "not on the page. Either the fixture's listing did not reach the queue (check " +
          "`review_state`), or the session is not staff and this is the root 404 — which does not " +
          "overflow, so every assertion below would pass having measured the wrong document.",
      ).not.toHaveCount(0, { timeout: 60_000 });

      await expectNoOverflow(page, where);
      await expectTargets(page, where);
      await expectTouchTargets(page, where, { touch: PHASE_18_TOUCH });
      await expectVisibleFocus(page, where);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AC#22 / 17-CONTEXT D-196 — THE SIGNED-IN HEADER CLUSTER (plan 17-06)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A FOURTH DESCRIBE, AND IT IS THE ONLY ONE IN THIS FILE WHOSE SUBJECT IS NOT A SURFACE. The three
// above sweep routes; this one makes two claims about the APP SHELL, which every one of those routes
// renders. That is why it is not a row in any of their tables: a row asserts something about the page
// it names, and this would assert the same two numbers 79 times.
//
// It exists because D-196 is a PAIR of decisions that have to hold together, and the blocks above can
// only see half of it. `ProfileLink` reaching the 24px AA floor is now enforced by `expectTargets` on
// every Phase-13 and Phase-14 case (the header entered that scan in this same commit). The 226px
// cluster budget the padding SPENDS FROM is enforced nowhere — no overflow scan can see it, because
// the cluster is `ml-auto` inside a flex row and a cluster over budget pushes the brand, wraps, or
// shrinks a sibling long before the document scrolls sideways. D-196 says a miss there is a finding to
// escalate rather than something to make room for silently, and a decision with no assertion under it
// is a decision that survives exactly as long as nobody edits the header.
//
// ⚠ NO DATABASE FIXTURE. `signUpAndReachProfile` drives the shipped signup form, which is what the
// `/profile` rows in the table above already do. Two signups per run, one per theme, for the reason
// that resolver's own note gives: it produces a SESSION COOKIE and the `page` fixture is per-test, so
// it is deliberately not memoised.

/**
 * The signed-in header cluster's width budget, and it is the SPEC'S number rather than the measured
 * one — deliberately, because the spec's is the tighter of the two and the assertion should be the
 * harder claim.
 *
 * 226 is `11-UI-SPEC § Responsive behaviour`'s figure, quoted by `site-chrome.tsx`'s module header and
 * by `measurements.ts`. MEASURED at 320px on 29 August 2026 the available width is **224px** — the
 * header's 288px content box (320 less two `px-4`s) less the 52px brand less the one `gap-3` between
 * them — so the spec rounded its own arithmetic up by 2px. Asserting 226 rather than 224 is not
 * sloppiness: the 2px sit between "the spec's stated budget" and "what this composition happens to
 * lay out today", and a gate that pins the second would go red the day the wordmark's font metrics
 * moved by a pixel, which is not the failure anybody wants reported here.
 *
 * The cluster measures **190.4px in court and 191.6px in grove** against it after D-196's `p-1.5`
 * (178.4 court before), so the tightest headroom is 34.4px against the spec's budget and 32.4px
 * against the measured one. The 1.2px between the themes is a font-metric difference and it is
 * recorded rather than averaged: `measurements.ts` already notes grove as the wider of the two in the
 * header (*"the host cluster measures 352px … at 320px in grove"*), so the theme that would fail
 * first is the theme that was already known to be the tight one.
 *
 * BOTH ASSERTIONS BELOW WERE WATCHED RED, 29 August 2026, so their messages have been read rather
 * than merely written (`money-path-invariants.test.ts:71-77`'s rule):
 *   • budget set to 150 → *"court · 320px: the signed-in header cluster measures 190.4px against its
 *     150px budget — over by 40.4px"*, and grove at 191.6. Reverted.
 *   • the `site-header` half of `collectControls`'s exclusion restored → *"the target-size scan
 *     returned no `a[Profile]` from inside `site-header`. The scan found 0 shell control(s): (none)"*,
 *     in both themes. That is the positive control doing its job: it fails when the narrowing is
 *     undone, which is the only thing that makes the two floor assertions worth reading. Reverted.
 */
const HEADER_CLUSTER_BUDGET_PX = 226;

test.describe(`AC#22 / D-196 — the signed-in header cluster at ${FLOOR_PX}px`, () => {
  // 60s for the twelve-route table's reason: this block signs a user up through the real form against
  // a dev server that may still be compiling `/signup` and `/profile`.
  test.describe.configure({ timeout: 60_000 });

  for (const theme of THEMES) {
    test(`${theme} · Profile clears ${TARGET_FLOOR_PX}px and the cluster fits its budget`, async ({
      page,
    }) => {
      await seedTheme(page.context(), theme);
      await page.setViewportSize({ width: FLOOR_PX, height: 800 });

      const path = await signUpAndReachProfile(page);
      expect(
        path,
        `${theme}: the signup flow did not produce a signed-in route, so there is no signed-in header ` +
          "to measure and both assertions below would be about the anonymous one.",
      ).toBeTruthy();
      await page.goto(`${BASE}${path as string}`);
      await page.evaluate(() => document.fonts.ready);

      const where = `${theme} · ${FLOOR_PX}px`;

      // ── THE VACUITY GUARD, AND HERE IT IS ALSO THE POSITIVE CONTROL FOR THIS COMMIT ──────────────
      // The two assertions below are about a control that, until this commit, `collectControls`
      // deliberately skipped. Reading it out of the SCAN rather than off the page is what proves the
      // exclusion was actually narrowed: if the header were still excluded, this would be `undefined`
      // and the case would fail here rather than passing on a measurement nothing else can see.
      const controls = await collectControls(page);
      const shell = controls.filter((c) => c.inShell);
      const profile = shell.find((c) => c.label === "a[Profile]");
      expect(
        profile,
        `${where}: the target-size scan returned no \`a[Profile]\` from inside \`site-header\`. The ` +
          `scan found ${shell.length} shell control(s): ${shell.map((c) => `${c.label} ${c.w}x${c.h}`).join(", ") || "(none)"}. ` +
          "Either the header is excluded from `collectControls` again — the exclusion D-196 narrowed " +
          "— or the signed-in cluster stopped rendering the Profile control, and the two assertions " +
          "below would be vacuous either way.",
      ).toBeDefined();

      const { w, h } = profile as Control;
      expect(
        w,
        `${where}: the Profile control measures ${w}x${h}px, and its WIDTH is ` +
          `${Math.round((TARGET_FLOOR_PX - w) * 10) / 10}px under the ${TARGET_FLOOR_PX}px WCAG 2.5.8 ` +
          "AA target-size floor. This is the control that reaches a user's own account, on every " +
          "signed-in route in the product. D-196's fix is PADDING on the link (`p-1.5`, 6px, taking " +
          "a 16px glyph to 28px) — not a bigger glyph, and not on `NAV_LINK_CLASS`, which four " +
          "header links share.",
      ).toBeGreaterThanOrEqual(TARGET_FLOOR_PX);
      expect(
        h,
        `${where}: the Profile control measures ${w}x${h}px, and its HEIGHT is ` +
          `${Math.round((TARGET_FLOOR_PX - h) * 10) / 10}px under the ${TARGET_FLOOR_PX}px floor. ` +
          "Both axes are asserted separately so the failure names which one moved: padding fixes " +
          "both, a width-only change fixes neither.",
      ).toBeGreaterThanOrEqual(TARGET_FLOOR_PX);

      // ── THE OTHER HALF OF D-196: THE BUDGET THE PADDING SPENDS FROM ──────────────────────────────
      const slot = page.getByTestId("site-auth-slot");
      await expect(
        slot,
        `${where}: the signed-in header renders no \`site-auth-slot\`. That slot is the cluster this ` +
          "assertion is about, and a missing one measures nothing.",
      ).toHaveCount(1);
      const box = await slot.boundingBox();
      expect(
        box,
        `${where}: \`site-auth-slot\` is in the document but has no layout box, so its width is not a ` +
          "measurement of anything.",
      ).not.toBeNull();

      const width = Math.round((box as { width: number }).width * 10) / 10;
      expect(
        width,
        `${where}: the signed-in header cluster measures ${width}px against its ` +
          `${HEADER_CLUSTER_BUDGET_PX}px budget — over by ` +
          `${Math.round((width - HEADER_CLUSTER_BUDGET_PX) * 10) / 10}px. Measured on 29 August 2026 ` +
          "it was 190.4px in court and 191.6px in grove, i.e. ~34px of headroom, so something has " +
          "been added to the cluster or a control in it has grown.\n" +
          "⚠ D-196: THIS IS A FINDING TO ESCALATE, NOT A LICENCE TO REDESIGN THE HEADER. Do not " +
          "shrink another control, drop another label or reduce a gap to make this pass — the budget " +
          "was re-opened deliberately and a miss is the thing it was re-opened to detect. Record the " +
          "measurement in this phase's `deferred-items.md` with the theme, the width and the number.",
      ).toBeLessThanOrEqual(HEADER_CLUSTER_BUDGET_PX);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 17-CONTEXT D-201 / 17-UI-SPEC AC#2 — THE INVENTORY IS ENUMERATED, NOT REMEMBERED (plan 17-11)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A FIFTH DESCRIBE, AND THE ONLY ONE IN THIS FILE THAT OPENS NO BROWSER. The four above measure
// surfaces; this one measures the TABLES — it asks whether the set of surfaces they name is the set of
// surfaces that exist. That question cannot be answered from inside a route sweep, because a sweep can
// only ever visit what it was told about.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY IT EXISTS, IN ONE SENTENCE
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// RESP-03 says EVERY surface. Until this block, "every" meant "every one somebody remembered", and
// nothing in the tree could tell a surface that was audited and found clean from a surface nobody had
// ever opened at 320px — both read as green. Plan 17-11's own starting condition is the proof: SEVEN
// production page routes had zero measurement anywhere and were absent from this file entirely, and
// that was discovered by a human reading a directory listing, which is not a gate.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SHAPE — A DECLARED MAP, ASSERTED IN BOTH DIRECTIONS
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `SURFACE_INVENTORY` below maps every surface to HOW it is covered: either `coveredBy` (row names in
// this file's three tables) or `excluded` (a D-201 reason). The assertions run both ways round, and
// all three directions are load-bearing:
//
//   • disk → map: a surface on disk with no entry FAILS BY PATH. This is D-201's own clause.
//   • map → disk: an entry naming a surface that no longer exists FAILS TOO, so the map cannot rot
//     into a list of routes the app deleted while still reading like coverage.
//   • map → tables: every `coveredBy` name must resolve to a REAL row in `ROUTES`, `PHASE_13_ROWS` or
//     `PHASE_14_ROWS`. Without this the map could claim coverage that does not exist anywhere, which
//     is the same failure one level up.
//
// ⚠ THE FOUR D-201 EXCLUSIONS ARE ROWS HERE, NOT ABSENCES, and that distinction is the decision. An
// excluded surface and a forgotten surface look identical in a table that only lists what it measures;
// they look nothing alike in a table where the excluded one carries its reason.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// GUARD THE GUARD — THE SCAN OF NOTHING
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// A recursive `readdirSync` that resolves to `[]` makes every assertion below pass VACUOUSLY: an empty
// disk set is trivially a subset of any map. This repository has recorded the scan-of-nothing failure
// often enough that `loading-coverage.test.ts` opens with the same guard and `helpers/overflow.ts`
// carries `MIN_EXAMINED_ELEMENTS` for the DOM version of it. `MIN_APP_PAGES` below is that guard, and
// it is asserted FIRST — before anything is compared — so a broken scan reports itself rather than
// reporting success.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — stated so the next reader under-trusts this block
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//   • IT PROVES A ROW EXISTS, NOT THAT THE ROW IS GOOD. A `coveredBy` pointing at a row whose `tell`
//     is the site header would satisfy every assertion here. That claim is the `tell` mechanism's, and
//     each table makes it separately.
//   • THE ROUTE DERIVATION IS SYNTACTIC — route groups stripped, `page.tsx` dropped. It does not read
//     `next.config`, rewrites, middleware or `generateStaticParams`, so a route reachable only through
//     a rewrite would not be enumerated. There is no such route in this tree today.
//   • THE `loading.tsx` FILES ARE COVERED AS A CLASS, not one row each. Their per-file claim here is
//     narrower and is stated at that entry: each one sits beside a `page.tsx` whose route IS in the
//     map. Their geometry is `skeleton-geometry.spec.ts`'s subject and their existence is
//     `loading-coverage.test.ts`'s.
//   • `src/app/api/**` AND `auth/session-check` ARE NOT ENUMERATED. They are `route.ts` handlers that
//     return JSON or a redirect; there is no document, no viewport and no theme. The families this
//     block walks are the five that render one.

/** The scanned tree, as ONE constant — `loading-coverage.test.ts`'s idiom, for its reason. */
const APP_DIR = path.resolve(process.cwd(), "src/app");

/**
 * The scan-of-nothing floor. 25 rather than the 29 on disk today, deliberately: this number is a
 * VACUITY guard, not a second copy of `loading-coverage.test.ts`'s `EXPECTED_PAGES` pin. That file
 * already owns the exact count and fails loudly when a route is added or removed; pinning 29 here as
 * well would make every route addition fail in two places with two different remedies, and the remedy
 * HERE is never "bump the number" — it is "add a row to the inventory". 25 is low enough that no
 * ordinary edit trips it and high enough that a scan resolving to a handful of files cannot pass.
 */
const MIN_APP_PAGES = 25;

/** One surface, and how the audit accounts for it. Exactly one of `coveredBy` / `excluded` is set. */
type SurfaceCoverage = {
  /**
   * The surface's key. A derived ROUTE for a `page.tsx` (`/host/earnings`), and the repo-relative FILE
   * PATH for a route STATE (`src/app/(app)/error.tsx`) — because that is how the shipped skip rows
   * already name those four, and a key that matches the row names is a key a reader can follow.
   */
  readonly surface: string;
  /** Row names in `ROUTES` / `PHASE_13_ROWS` / `PHASE_14_ROWS`. Asserted to resolve. */
  readonly coveredBy?: readonly string[];
  /** The D-201 reason this surface is not an audit subject. Required when `coveredBy` is absent. */
  readonly excluded?: string;
  /** True for an entry that describes a CLASS of files rather than one path on disk. */
  readonly declaredClass?: boolean;
};

/**
 * ⚠ EVERY SURFACE IN `src/app/**`, WITH ITS ACCOUNT. Ordered by family, then by path.
 *
 * A row here is not a measurement — the tables above are. It is the sentence that says which
 * measurement covers this file, or why no measurement does. Both are answers; an ABSENCE is not.
 */
const SURFACE_INVENTORY: readonly SurfaceCoverage[] = [
  // ─── PAGE ROUTES · PUBLIC ─────────────────────────────────────────────────────────────────────
  { surface: "/", coveredBy: ["/"] },
  { surface: "/listings/[id]", coveredBy: ["/listings/[id]", "/listings/[id] · sheet open"] },
  { surface: "/listings/[id]/book", coveredBy: ["/listings/[id]/book"] },
  { surface: "/invite/[token]", coveredBy: ["/invite/[token]"] },
  { surface: "/terms", coveredBy: ["/terms"] },
  { surface: "/privacy", coveredBy: ["/privacy"] },

  // ─── PAGE ROUTES · ACCOUNT (AUTHUI-03 gate 1, plan 15-10) ─────────────────────────────────────
  { surface: "/login", coveredBy: ["/login"] },
  { surface: "/signup", coveredBy: ["/signup"] },
  { surface: "/forgot-password", coveredBy: ["/forgot-password", "/forgot-password · post-submit"] },
  { surface: "/reset-password", coveredBy: ["/reset-password", "/reset-password · missing token"] },
  { surface: "/profile", coveredBy: ["/profile", "/profile · crop dialog open"] },

  // ─── PAGE ROUTES · BOOKER (Phase 13, plan 13-15 · `/bookings` added by 17-11) ─────────────────
  { surface: "/bookings", coveredBy: ["/bookings (the booker's list)"] },
  {
    surface: "/bookings/[id]",
    coveredBy: [
      "the confirmation moment",
      "the confirmed detail, no query",
      "payment state: pending settlement",
      "payment state: not completed",
      "payment state: reversed, AUTOMATIC branch",
      "payment state: reversed, MANUAL branch",
      "payment state: reversed, INDETERMINATE branch (D-96)",
    ],
  },
  { surface: "/bookings/[id]/receipt", coveredBy: ["the receipt"] },
  { surface: "/bookings/[id]/cancel", coveredBy: ["/bookings/[id]/cancel"] },
  { surface: "/bookings/[id]/group", coveredBy: ["/bookings/[id]/group"] },

  // ─── PAGE ROUTES · HOST (Phase 14, plan 14-16 · six added by 17-11) ───────────────────────────
  { surface: "/host", coveredBy: ["/host"] },
  { surface: "/host/requests", coveredBy: ["/host/requests"] },
  { surface: "/host/bookings", coveredBy: ["/host/bookings"] },
  { surface: "/host/bookings/[id]", coveredBy: ["/host/bookings/[id]"] },
  { surface: "/host/earnings", coveredBy: ["/host/earnings"] },
  { surface: "/host/listings", coveredBy: ["/host/listings"] },
  { surface: "/host/listings/new", coveredBy: ["/host/listings/new"] },
  {
    surface: "/host/listings/[id]/edit",
    coveredBy: ["/host/listings/[id]/edit", "/host/listings/[id]/edit · photos step"],
  },
  { surface: "/host/listings/[id]/availability", coveredBy: ["/host/listings/[id]/availability"] },
  { surface: "/host/payouts/return", coveredBy: ["/host/payouts/return"] },
  { surface: "/host/payouts/refresh", coveredBy: ["/host/payouts/refresh"] },

  // ─── PAGE ROUTES · OPS (plan 18-12) ───────────────────────────────────────────────────────────
  //
  // COVERED, NOT EXCLUDED, AND THE "it's internal" ARGUMENT IS REFUSED RATHER THAN UNCONSIDERED.
  // `/ops` is staff-only, so it is tempting to file it beside `/dev/theme` as a non-subject. It is
  // not one: a real person uses it, on a real phone, to decide whether real spaces may sell, and
  // 18-UI-SPEC states there is no "it's only for staff" exemption anywhere in this repository's
  // gates. It is additionally the ONLY list surface in the product whose row carries a photograph,
  // which makes it the hardest 320px case in this file rather than the softest.
  { surface: "/ops", coveredBy: ["/ops"] },

  // ─── PAGE ROUTES · THE `src/app/dev` EXCLUSION (D-201, exclusion 1 of 4) ──────────────────────
  {
    surface: "/dev/theme",
    excluded:
      "AN AUDIT INSTRUMENT, NOT AN AUDIT SUBJECT (D-201). `/dev/theme` is the token and component " +
      "gallery several gates in this repository DRIVE in order to measure something else — " +
      "`scroll-area-overflow.spec.ts` uses it precisely because it is deterministic where the real " +
      "notification panel is not, and section 12 of it is what covers `ErrorState` for the four " +
      "unreachable error-boundary rows above. It is `NODE_ENV`-gated out of production, so no visitor " +
      "can reach it and its 320px behaviour is a claim about nobody's experience.",
  },
  {
    surface: "/dev/throw",
    excluded:
      "THE SAME EXCLUSION (D-201, `src/app/dev`), plus one fact worth keeping in view: this instrument " +
      "is the VEHICLE for the `error boundary · src/app/error.tsx (root)` row above, which drives it to " +
      "reach a boundary that has no other route into it. So it is excluded as a SUBJECT while being " +
      "load-bearing as a MECHANISM — deleting it would take a measured row with it, which is not " +
      "obvious from its path.",
  },

  // ─── PAGE ROUTES · THE FOUR GROUP-LOCAL THROW ROUTES (plan 17-12) ─────────────────────────────
  //
  // ⚠ COVERED, NOT EXCLUDED — AND THAT IS THE OPPOSITE DISPOSITION FROM `/dev/throw` DIRECTLY ABOVE,
  // WHICH IS WORTH ONE PARAGRAPH BECAUSE THE TWO LOOK ALIKE.
  //
  // `/dev/theme` and `/dev/throw` are excluded as SUBJECTS under D-201's `src/app/dev` exclusion:
  // `/dev/theme` is a gallery whose 320px behaviour is a claim about nobody's experience, and
  // `/dev/throw` is a vehicle whose own document is the ROOT boundary — measured by the row that
  // names that boundary, not by a row that names the route.
  //
  // These four are vehicles too, and by the same argument their document IS the boundary each one
  // reaches. The difference is that a vehicle and its subject coincide here: the ONLY document any of
  // these four routes can ever produce is its group's `error.tsx` rendered inside that group's real
  // layout stack, which is precisely what the four rows above measure at 320px in both themes. So
  // `coveredBy` is the honest account and an exclusion would be a false one — there is no unmeasured
  // 320px behaviour left over for the exclusion to be about.
  //
  // They are also production route-table entries in a way `/dev/theme` is not exempt from either: all
  // four are `NODE_ENV`-guarded out of a production build, probed rather than assumed (three answer a
  // hard 404 and `/host/dev-throw` a soft one — the route file records the `loading.tsx` cause).
  {
    surface: "/dev-throw-app",
    coveredBy: ["error boundary · src/app/(app)/error.tsx"],
  },
  {
    surface: "/host/dev-throw",
    coveredBy: ["error boundary · src/app/(host)/host/error.tsx"],
  },
  {
    surface: "/dev-throw-auth",
    coveredBy: ["error boundary · src/app/(auth)/error.tsx"],
  },
  {
    surface: "/dev-throw-legal",
    coveredBy: ["error boundary · src/app/(legal)/error.tsx"],
  },

  // ─── ROUTE STATES · not-found (3) ─────────────────────────────────────────────────────────────
  { surface: "src/app/not-found.tsx", coveredBy: ["root not-found"] },
  { surface: "src/app/(app)/bookings/[id]/not-found.tsx", coveredBy: ["bookings/[id]/not-found"] },
  {
    // The `/invite/[token]` row drives a DELIBERATELY unmatched token, so the document it measures IS
    // this file — plan 11-19 built it as a byte-identical inactive twin of the invite surface
    // (T-11-ORACLE). That row's own comment carries the argument; this entry records that the row
    // covers two surfaces rather than one, which is not visible from the row's name.
    surface: "src/app/(public)/invite/[token]/not-found.tsx",
    coveredBy: ["/invite/[token]"],
  },

  // ─── ROUTE STATES · error boundaries (5) ──────────────────────────────────────────────────────
  { surface: "src/app/error.tsx", coveredBy: ["error boundary · src/app/error.tsx (root)"] },
  { surface: "src/app/(app)/error.tsx", coveredBy: ["error boundary · src/app/(app)/error.tsx"] },
  { surface: "src/app/(auth)/error.tsx", coveredBy: ["error boundary · src/app/(auth)/error.tsx"] },
  {
    surface: "src/app/(host)/host/error.tsx",
    coveredBy: ["error boundary · src/app/(host)/host/error.tsx"],
  },
  {
    surface: "src/app/(legal)/error.tsx",
    coveredBy: ["error boundary · src/app/(legal)/error.tsx"],
  },
  {
    surface: "src/app/(ops)/ops/error.tsx",
    excluded:
      "UNREACHABLE BY CONSTRUCTION, AND THE CONSTRUCTION IS A DECISION RATHER THAN AN ACCIDENT. The " +
      "five boundaries above are each reached through the group-local deliberate-throw route plan " +
      "17-12 built for it. The equivalent here would be a second page under `(ops)`, and D-246 holds " +
      "that console at EXACTLY ONE page — a count `tests/design/ops-guard-coverage.test.ts` asserts, " +
      "and one that a second page would move together with all three of " +
      "`loading-coverage.test.ts`'s pins. So the cheapest way to measure this surface is also a " +
      "product change nobody asked for, which is a different kind of unreachable from the four this " +
      "file's `/dev/throw` note describes and is why it is written out here rather than assumed. " +
      "What it renders IS measured as a composition: `patterns/error-state.tsx` at 320px in both " +
      "themes through `/dev/theme` section 12, and inside five different shells by the five rows " +
      "above. Its structure is gated per commit by `tests/design/error-boundaries.test.ts`, which " +
      "grew to six declared boundaries in the same commit as this entry.",
  },

  // ─── THE `global-error` EXCLUSION (D-201, exclusion 2 of 4) ───────────────────────────────────
  {
    surface: "src/app/global-error.tsx",
    excluded:
      "THE ONE DECLARED ROUTE-LEVEL EXCLUSION (D-201). `global-error.tsx` renders its OWN `html` and " +
      "`body` — it REPLACES the root layout rather than sitting inside it — so it carries neither the " +
      "theme class nor the app shell, and there is nothing for a theme sweep to sweep. It is already " +
      "`THEME_SWAP_EXCLUSIONS`' only entry, with the same reason, which is why this is a restatement " +
      "rather than a new decision. What it renders IS measured as a composition elsewhere: the panel " +
      "is `patterns/error-state.tsx`, covered by `/dev/theme` section 12 in both themes.",
  },

  // ─── THE OG-IMAGE EXCLUSION (D-201, exclusion 3 of 4) ─────────────────────────────────────────
  {
    surface: "src/app/opengraph-image.tsx",
    excluded:
      "NOT AN INTERACTIVE DOCUMENT (D-201). An OG route renders a fixed-size PNG — no viewport, no " +
      "theme class, no controls, and no text a booker can wrap. `scrollWidth <= clientWidth` is a " +
      "question about a document that scrolls, and this one is an image. `og-routes.test.ts` owns them " +
      "and asserts the things that ARE true of an image.",
  },
  {
    surface: "src/app/listings/[id]/opengraph-image.tsx",
    excluded:
      "Same as the root OG route (D-201): an image, not a document — no viewport and nothing to " +
      "scroll. `og-routes.test.ts` owns it, and it is the gate to extend if this image gains a rule.",
  },
  {
    surface: "src/app/(public)/invite/[token]/opengraph-image.tsx",
    excluded:
      "Same as the root OG route (D-201): an image, not a document — no viewport and nothing to " +
      "scroll. `og-routes.test.ts` owns it, and it is the gate to extend if this image gains a rule.",
  },

  // ─── THE EMAIL-TEMPLATE EXCLUSION (D-201, exclusion 4 of 4) ───────────────────────────────────
  {
    surface: "src/lib/email-shell.ts",
    declaredClass: true,
    excluded:
      "NOT BROWSER DOCUMENTS (D-201). Every transactional email in this product is rendered by " +
      "`src/lib/email-shell.ts` into table-layout HTML for mail clients that support neither the " +
      "viewport units nor the custom properties this file's whole subject rests on. A 320px sweep of " +
      "one would measure Chromium's opinion of a document Chromium never renders. `email-shell.test.ts` " +
      "and `email-tokens.test.ts` own them and assert the constraints that ARE real there. ⚠ THE ENTRY " +
      "IS A CLASS rather than a path per template, and the assertion below pins the half that matters: " +
      "no email module may live under `src/app`, or it would be routable and this exclusion would be " +
      "hiding a route.",
  },

  // ─── THE `loading.tsx` FAMILY (a class, per this block's NOT-COVERED note) ────────────────────
  {
    surface: "src/app/**/loading.tsx",
    declaredClass: true,
    excluded:
      "A TRANSIENT FALLBACK, COVERED AS A CLASS AND NOT ROW BY ROW. A `loading.tsx` is on screen only " +
      "while its page resolves, and it is never a destination — no link points at one and no booker " +
      "can hold one still. What IS asserted per file, below, is the claim that makes the class " +
      "argument sound: every one of them sits beside a `page.tsx` whose route is in this inventory, so " +
      "a plate for a route nobody audits cannot hide here. Their geometry is " +
      "`skeleton-geometry.spec.ts`'s subject, their existence and box literals are " +
      "`loading-coverage.test.ts`'s, and ONE of them is measured at 320px directly — " +
      "`book/loading.tsx`, through the `served: true` row above, which is the only row in this file " +
      "whose subject is a plate.",
  },
];

/** Every file with a given basename under a directory, recursively. `[]` on a missing tree. */
function collectAppFiles(dir: string, basename: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // A broken scan surfaces as ONE named guard-the-guard failure below, never as a stack trace that
    // buries which gate went quiet — `loading-coverage.test.ts`'s rule, and the reason `MIN_APP_PAGES`
    // is asserted before anything is compared.
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectAppFiles(full, basename, out);
    else if (entry.name === basename) out.push(full);
  }
  return out;
}

/** Repo-relative, forward-slashed — the spelling every inventory key and every row name uses. */
const relFromRepo = (p: string): string => path.relative(process.cwd(), p).split(path.sep).join("/");

/**
 * `src/app/(host)/host/earnings/page.tsx` becomes `/host/earnings`. Route groups are dropped because
 * Next drops them; `(detail)` is why `src/app/listings/[id]/(detail)/page.tsx` is `/listings/[id]` and
 * not something with a parenthesis in it.
 */
function routeOfPage(pageFile: string): string {
  const segments = relFromRepo(pageFile)
    .replace(/^src\/app\//, "")
    .replace(/\/page\.tsx$/, "")
    .split("/")
    .filter((s) => s.length > 0 && !(s.startsWith("(") && s.endsWith(")")));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

test.describe("D-201 / AC#2 — every surface on disk is in this file's tables, or excluded by name", () => {
  const PAGES = collectAppFiles(APP_DIR, "page.tsx");
  const NOT_FOUNDS = collectAppFiles(APP_DIR, "not-found.tsx");
  const ERRORS = collectAppFiles(APP_DIR, "error.tsx");
  const GLOBAL_ERRORS = collectAppFiles(APP_DIR, "global-error.tsx");
  const OG_IMAGES = collectAppFiles(APP_DIR, "opengraph-image.tsx");
  const LOADINGS = collectAppFiles(APP_DIR, "loading.tsx");

  const bySurface = new Map(SURFACE_INVENTORY.map((e) => [e.surface, e]));

  /** Every row name in this file's three route tables — the set `coveredBy` must resolve into. */
  const ROW_NAMES = new Set<string>([
    ...ROUTES.map((r) => r.name),
    ...PHASE_13_ROWS.map((r) => r.name),
    ...PHASE_14_ROWS.map((r) => r.name),
    // The Phase-18 block is not a TABLE — it is two cases over one route, because a single-surface
    // block needs no row array to iterate. Its `coveredBy` name is declared here so the map-to-tables
    // assertion still resolves, rather than the assertion being loosened to let one name through.
    "/ops",
  ]);

  /** Every surface key derivable from disk, across the five document-rendering families. */
  const onDisk = (): string[] => [
    ...PAGES.map(routeOfPage),
    ...NOT_FOUNDS.map(relFromRepo),
    ...ERRORS.map(relFromRepo),
    ...GLOBAL_ERRORS.map(relFromRepo),
    ...OG_IMAGES.map(relFromRepo),
  ];

  // ⚠ THE WRONG REMEDY, SAID OUT LOUD — `loading-coverage.test.ts` and `gitignore-baselines.test.ts`
  // both do this, and for the same reason: the cheapest way to make either of the clauses below pass
  // is to make the enumeration smaller, and a failure message that does not forbid that is a message
  // that suggests it. The phrase "NEVER AUDITED" is deliberately kept on ONE line so a grep over this
  // file finds it in the source and not only in a rendered failure.
  const REMEDY =
    "THE REMEDY IS TO ADD A ROW — with a measurement, or with a named reason — AND NEVER TO NARROW " +
    "THE ENUMERATION. A surface silently absent from these tables is one that was NEVER AUDITED, and " +
    "it is indistinguishable from one that was audited and found clean, because both read as green. " +
    "Deleting the path from this inventory, adding it to an ignore list, or making the scan skip its " +
    "directory would each make this assertion pass while making the claim it protects false — which " +
    "is the wrong fix, said out loud here so nobody has to guess.";

  // ⚠ FIRST, AND BEFORE ANYTHING IS COMPARED. Everything below is a subset test against the disk set,
  // and an EMPTY disk set is a subset of everything.
  test("guard the guard: the enumeration actually scanned the app tree", () => {
    expect(
      PAGES.length,
      `the recursive scan of ${relFromRepo(APP_DIR)} found ${PAGES.length} \`page.tsx\` file(s), ` +
        `under the floor of ${MIN_APP_PAGES}. Every assertion in this block is a subset test against ` +
        "that list, so an empty or truncated scan makes ALL of them pass having compared nothing — " +
        "the scan-of-nothing failure this repository has recorded on both the DOM side " +
        "(`MIN_EXAMINED_ELEMENTS`) and the filesystem side (`loading-coverage.test.ts`). Either the " +
        "tree moved, or this process is running from a different working directory.",
    ).toBeGreaterThanOrEqual(MIN_APP_PAGES);

    // The other five families are asserted non-empty for the same reason, in one place, by name.
    for (const [label, files] of [
      ["not-found.tsx", NOT_FOUNDS],
      ["error.tsx", ERRORS],
      ["global-error.tsx", GLOBAL_ERRORS],
      ["opengraph-image.tsx", OG_IMAGES],
      ["loading.tsx", LOADINGS],
    ] as const) {
      expect(
        files.length,
        `the scan found ZERO \`${label}\` files under ${relFromRepo(APP_DIR)}. This tree has at ` +
          "least one of every family; zero means the scan is broken, not that the family was removed.",
      ).toBeGreaterThan(0);
    }
  });

  test("disk to inventory: every surface on disk is accounted for, by path", () => {
    const absent = onDisk()
      .filter((s) => !bySurface.has(s))
      .sort();
    expect(
      absent,
      `${absent.length} surface(s) exist in \`src/app\` and appear NOWHERE in this file's route ` +
        `tables and nowhere in its declared exclusions:\n${absent.map((s) => `  ${s}`).join("\n")}\n` +
        REMEDY,
    ).toEqual([]);
  });

  test("inventory to disk: no entry claims a surface that is gone", () => {
    const present = new Set(onDisk());
    const stale = SURFACE_INVENTORY.filter(
      (e) => e.declaredClass !== true && !present.has(e.surface),
    ).map((e) => e.surface);
    expect(
      stale,
      `${stale.length} inventory entr(ies) name a surface that is not on disk:\n` +
        `${stale.map((s) => `  ${s}`).join("\n")}\n` +
        "This direction matters as much as the other one: a map that keeps entries for deleted routes " +
        "grows into a list of things the app used to have while still reading like coverage, and the " +
        "next reader counts it as evidence. Delete the entry, and delete its rows in the tables above " +
        "in the same commit.",
    ).toEqual([]);
  });

  test("every entry carries exactly one account — a measurement or a reason, never neither", () => {
    const malformed = SURFACE_INVENTORY.filter((e) => {
      const covered = (e.coveredBy?.length ?? 0) > 0;
      const excluded = (e.excluded ?? "").trim().length > 0;
      return covered === excluded; // both, or neither
    }).map((e) => e.surface);
    expect(
      malformed,
      `${malformed.length} inventory entr(ies) are neither covered nor excluded, or claim to be ` +
        `both:\n${malformed.map((s) => `  ${s}`).join("\n")}\n` +
        "An entry with no account is the silent absence with extra steps — it is IN the table and " +
        "still says nothing about whether the surface was ever opened at 320px.",
    ).toEqual([]);

    // A reason has to be a REASON. The four D-201 exclusions are paragraphs in the decision's own
    // words; a one-line "n/a" would satisfy the clause above while carrying no argument at all.
    const thin = SURFACE_INVENTORY.filter(
      (e) => e.excluded !== undefined && e.excluded.trim().length < 80,
    ).map((e) => `${e.surface} (${e.excluded?.trim().length} chars)`);
    expect(
      thin,
      `${thin.length} exclusion reason(s) are shorter than 80 characters:\n` +
        `${thin.map((s) => `  ${s}`).join("\n")}\n` +
        "An exclusion is a decision somebody has to be able to re-evaluate. Say what the surface is, " +
        "why a 320px measurement of it would not be a measurement of anything, and which gate owns it.",
    ).toEqual([]);
  });

  test("inventory to tables: every `coveredBy` name resolves to a real row", () => {
    const dangling: string[] = [];
    for (const entry of SURFACE_INVENTORY) {
      for (const name of entry.coveredBy ?? []) {
        if (!ROW_NAMES.has(name)) dangling.push(`${entry.surface} -> "${name}"`);
      }
    }
    expect(
      dangling,
      `${dangling.length} inventory entr(ies) name a row that does not exist in \`ROUTES\`, ` +
        `\`PHASE_13_ROWS\` or \`PHASE_14_ROWS\`:\n${dangling.map((s) => `  ${s}`).join("\n")}\n` +
        "Without this clause the inventory could claim coverage that is nowhere in the file — the " +
        "same failure this block exists to catch, one level up. Renaming a row is what usually breaks " +
        "it; rename the entry with it.",
    ).toEqual([]);
  });

  test("the `loading.tsx` class entry earns its class treatment", () => {
    const orphans = LOADINGS.filter((f) => {
      const beside = path.join(path.dirname(f), "page.tsx");
      return !PAGES.includes(beside) || !bySurface.has(routeOfPage(beside));
    }).map(relFromRepo);
    expect(
      orphans,
      `${orphans.length} \`loading.tsx\` file(s) have no \`page.tsx\` beside them, or sit beside one ` +
        `whose route is not in this inventory:\n${orphans.map((s) => `  ${s}`).join("\n")}\n` +
        "The class entry's whole argument is that a plate belongs to a route that IS audited. A plate " +
        "for an unaudited route would be exactly the silent absence this block forbids, wearing a " +
        `different basename. ${REMEDY}`,
    ).toEqual([]);
  });

  test("the email-template exclusion names something real, and nothing under `src/app`", () => {
    expect(
      existsSync(path.resolve(process.cwd(), "src/lib/email-shell.ts")),
      "the email-template exclusion names `src/lib/email-shell.ts`, and that file does not exist. An " +
        "exclusion pointing at nothing is an exclusion nobody can check — either the shell moved and " +
        "the entry must move with it, or the templates are somewhere this inventory is not looking.",
    ).toBe(true);

    // The half that could actually hide a route: an email module UNDER `src/app` would be routable.
    const emailUnderApp = collectAppFiles(APP_DIR, "email-shell.ts")
      .concat(collectAppFiles(APP_DIR, "email.ts"))
      .map(relFromRepo);
    expect(
      emailUnderApp,
      `${emailUnderApp.length} email module(s) live under \`src/app\`, where they are routable:\n` +
        `${emailUnderApp.map((s) => `  ${s}`).join("\n")}\n` +
        "The exclusion's argument is that email templates are not browser documents. That holds only " +
        "while they are also not routes.",
    ).toEqual([]);
  });

  test("all four D-201 exclusions are present, each with its reason", () => {
    const declared = SURFACE_INVENTORY.filter((e) => e.excluded !== undefined).map((e) => e.surface);
    for (const [label, matcher] of [
      ["src/app/dev", (s: string) => s.startsWith("/dev/")],
      ["email templates", (s: string) => s.includes("email-shell")],
      ["OG-image routes", (s: string) => s.includes("opengraph-image")],
      ["global-error", (s: string) => s.includes("global-error")],
    ] as const) {
      expect(
        declared.filter(matcher).length,
        `17-CONTEXT D-201 names FOUR exclusions and requires each to be recorded IN the table with ` +
          `its reason. \`${label}\` is not among the ${declared.length} excluded entr(ies): ` +
          `${declared.join(", ")}. An exclusion that is merely absent is indistinguishable from a ` +
          "surface nobody looked at, which is the whole distinction this block exists to make.",
      ).toBeGreaterThan(0);
    }
  });
});
