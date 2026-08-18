// LIST-06 / D-13 — the PUBLIC listing detail page is reachable WITHOUT a session; draft/unlisted
// listings 404 to the public.
//
// GREEN as of Plan 05: src/app/listings/[id]/page.tsx is a public RSC placed OUTSIDE the (app)/(host)
// gated groups. This spec seeds — directly into the dev Postgres (public schema, the same DB the
// Playwright webServer's dev app reads) — one PUBLISHED, one DRAFT, and one UNLISTED listing owned by a
// throwaway test host, then asserts WITHOUT logging in:
//   - GET /listings/<published> renders the detail page (title heading + a book CTA) and does NOT
//     redirect to /login.
//   - GET /listings/<draft> and /listings/<unlisted> return HTTP 404 (D-13, T-05-NONPUB).
//
// External-network bits (Leaflet/OSM tiles) are deliberately OUT of the assertion path — they render
// client-side and are covered by 02-HUMAN-UAT.md manual checks. Everything is torn down in afterAll
// (deleting the host cascades to its listings + photos), and ids/emails are unique per run so repeated
// runs never collide.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 12 (plan 12-02) — D-59 #1: THE SEARCHED WINDOW SURVIVES THE CLICK
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A THIRD listing is seeded here — BOOKABLE (a second host with an activated payout wallet) with weekly
// hours 06:00-21:00 — because the three new cases need a day that actually HAS free hours to assert
// against. The recipe is `e2e/availability.spec.ts`'s; the two original listings are untouched.
//
// `search-result-card.tsx` has always written `?date=YYYY-MM-DD&start=HH:mm&end=HH:mm` onto every
// listing link. Until plan 12-02 the listing route read none of it. These cases assert the property
// rather than the intention:
//
//   (4) the searched day AND window are open on arrival, with NO interaction at all
//   (5) an off-the-hour `start` opens the day but seeds NO selection, and raises no error region
//   (6) one day selection issues EXACTLY ONE availability request (RESP-02 AC#21, first half)
//
// ⚠ THE SERVER-ACTION HEADER, OBSERVED RATHER THAN ASSUMED. Case (6) counts requests by a header
// because a Next server action POSTs to the CURRENT ROUTE URL — there is no distinguishing path to
// filter on, and filtering on the path would count the navigation itself. The header had no in-repo
// precedent, so it was captured from a real request in this spec and logged once before being asserted:
//
//   OBSERVED (2026-08-18, Next 16.2.7, dev), printed verbatim by case (6)'s one-time log:
//
//     [12-02] server-action request observed:
//       next-action=6017805515c500eae8865f8676457899da89a088cf
//       url=http://localhost:3000/listings/e2e_pl_bookable_242324e6-aa0a-4c52-93d9-7ce734c36ad5
//       rsc=undefined
//
//   So: the header is `next-action` - a LOWERCASE key in Playwright's `request.headers()` (Playwright
//   lowercases header names) carrying the action id as its value. Two things in that line are worth
//   more than the name itself. The `url` is the LISTING ROUTE ITSELF, which is why the counter cannot
//   filter on a path. And `rsc` is UNDEFINED on this request - so an `rsc`-based filter, the obvious
//   second guess, would count zero and the gate would be green for no reason. The counter matches on
//   `next-action` ALONE.
//
// ⚠ THE VENUE-TZ DAY MATH BELOW IS A VERBATIM COPY of `e2e/price-parity.spec.ts:88-107`, which is
// itself a verbatim copy of `search-and-book.spec.ts`. It is NOT re-derived: timezone/DST math
// re-derived per spec is the top booking-app failure mode (CLAUDE.md), so the rule is "same math or
// none". `new Date()` arithmetic appears nowhere in the new cases.

import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { seedTheme } from "./helpers/theme";

const BASE = "http://localhost:3000";
const VENUE_TZ = "Asia/Manila";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as tests/helpers/db.ts does).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

const hostId = `e2e_host_${randomUUID()}`;
const publishedId = `e2e_pub_${randomUUID()}`;
const draftId = `e2e_draft_${randomUUID()}`;
const unlistedId = `e2e_unlisted_${randomUUID()}`;

// Phase-12: a BOOKABLE listing (its own host, with an activated payout wallet) + real operating hours.
const bookableHostId = `e2e_pl_hostB_${randomUUID()}`;
const bookableId = `e2e_pl_bookable_${randomUUID()}`;

// ---- Target day: +3 days out (future, within the 90-day horizon), venue-local ----------------------
// VERBATIM from price-parity.spec.ts:88-107 — see the header's copy note. Three days out, so "the
// selected day is not TODAY" can never pass vacuously (the plan requires at least two).
const inTz = tz(VENUE_TZ);
const now = new Date();
const initMonth = Number(format(now, "M", { in: inTz }));
const initYear = Number(format(now, "yyyy", { in: inTz }));
const base = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
const targetYear = Number(format(base, "yyyy", { in: inTz }));
const targetMonth = Number(format(base, "M", { in: inTz })); // 1-based
const targetDay = Number(format(base, "d", { in: inTz }));
const targetMonthName = format(base, "MMMM", { in: inTz });
const crossesMonth = targetMonth !== initMonth || targetYear !== initYear;

/** react-day-picker default day-button aria-label is "EEEE, MMMM do, yyyy" — match by month/day/year. */
const targetDayLabel = new RegExp(
  `${targetMonthName}\\s+${targetDay}(st|nd|rd|th)?,?\\s+${targetYear}`,
);

/** The venue-local `YYYY-MM-DD` the search card would write, and the `EEEE, MMM d` heading it produces. */
const targetDateParam = format(base, "yyyy-MM-dd", { in: inTz });
const targetDayHeading = format(base, "EEEE, MMM d", { in: inTz });
/** Venue-local TODAY, for the "and not today" half of the assertion. */
const todayDateParam = format(now, "yyyy-MM-dd", { in: inTz });

// Run this file's tests in ONE worker, sequentially. With `fullyParallel`, these fast tests otherwise
// distribute across workers, each re-running beforeAll (seed) + afterAll (`sql.end()`); that rapid
// open/close churn intermittently drops the client mid-query (`write CONNECTION_ENDED localhost:5432`).
// The reliably-green DB-seeding specs (cancel, search-and-book) are serial for the same reason.
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // Throwaway host (email verified so it's a realistic publishable owner; no host_payout row, so the
  // listing is published-but-not-payable → the CTA is the "Not bookable yet" state, which is exactly
  // what we want to assert renders for an anonymous viewer).
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, created_at, updated_at)
    VALUES (
      ${hostId}, ${"E2E Host"}, ${`e2e.host.${hostId}@example.com`}, ${true},
      ${"Ezra"}, ${true}, now(), now()
    )
  `;

  // PUBLISHED listing — fully populated so the detail page renders title/price/amenities/map.
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, hourly_rate_cents, day_rate_cents,
      currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${publishedId}, ${hostId}, ${"Sunlit Yoga Studio in Poblacion"},
      ${"A calm, mirrored studio with mats, props, and a sound system."}, ${"yoga_studio"}::space_type,
      ${"123 Real Street"}, ${"Makati"}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0345}, ${14.5679}), 4326), ${false}, ${12}, ${50000}, ${300000},
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status, now(), now(), now()
    )
  `;
  // ⚠ PHASE-12 (12-08): the tier is set AFTER the insert rather than added to the column list above,
  // so the shipped INSERT stays byte-identical and this line reads as what it is — a fact case (7)
  // depends on. `CancellationPolicyDisclosure` renders NOTHING for a null tier and the listing page
  // gates the whole `Cancellation policy` SECTION on the same value, so a listing with no tier has
  // five headings, not six. Every listing publishable after D-77 has one; the seed rows predate that
  // gate, which is why it has to be stated here instead of inherited.
  await sql`
    UPDATE "listing" SET cancellation_policy = ${"standard"}::cancellation_policy WHERE id = ${publishedId}
  `;
  // Three cover-first photos + a couple of amenities so the gallery/amenities sections have content.
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
      (${randomUUID()}, ${publishedId}, ${"fitout/e2e/0"}, ${"https://example.com/e2e-0.jpg"}, ${0}),
      (${randomUUID()}, ${publishedId}, ${"fitout/e2e/1"}, ${"https://example.com/e2e-1.jpg"}, ${1}),
      (${randomUUID()}, ${publishedId}, ${"fitout/e2e/2"}, ${"https://example.com/e2e-2.jpg"}, ${2})
  `;
  await sql`
    INSERT INTO "listing_amenity" (listing_id, amenity) VALUES
      (${publishedId}, ${"showers"}), (${publishedId}, ${"mirrors"})
  `;

  // DRAFT and UNLISTED listings owned by the same host — must NOT be publicly viewable (D-13).
  await sql`
    INSERT INTO "listing" (id, host_id, title, status, created_at, updated_at)
    VALUES (${draftId}, ${hostId}, ${"Draft space (private)"}, ${"draft"}::listing_status, now(), now())
  `;
  await sql`
    INSERT INTO "listing" (id, host_id, title, status, created_at, updated_at)
    VALUES (${unlistedId}, ${hostId}, ${"Unlisted space (off market)"}, ${"unlisted"}::listing_status, now(), now())
  `;

  // ── Phase-12: the BOOKABLE listing the searched-window cases need ───────────────────────────────
  // A SECOND host, because the first deliberately has no host_payout row (that is what makes the
  // original case's "Not bookable yet" assertion meaningful) and D-59 #1's seeding is gated on
  // `deriveBookable`. Recipe copied from e2e/availability.spec.ts.
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${bookableHostId}, ${"E2E Host B"}, ${`e2e.host.${bookableHostId}@example.com`}, ${true},
      ${"Bea"}, ${true}, ${true}, now(), now()
    )
  `;
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${bookableHostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${bookableId}, ${bookableHostId}, ${"Searched Window Studio"},
      ${"A studio seeded so a searched window has real hours to land on."}, ${"yoga_studio"}::space_type,
      ${"9 Real Street"}, ${"Makati"}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0345}, ${14.5679}), 4326), ${false}, ${12}, ${1}, ${VENUE_TZ},
      ${50000}, ${300000}, ${"php"}, ${"instant"}::booking_mode, ${"published"}::listing_status,
      now(), now(), now()
    )
  `;
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
      (${randomUUID()}, ${bookableId}, ${"fitout/e2e/b0"}, ${"https://example.com/e2e-b0.jpg"}, ${0})
  `;
  // Weekly hours 06:00-21:00 every day, so the +3-day target has free hours whatever weekday it lands on
  // (and so `listingHasOperatingHours`, the fourth deriveBookable term, is satisfied).
  for (let dow = 0; dow < 7; dow++) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${randomUUID()}, ${bookableId}, ${dow}, ${"06:00"}, ${"21:00"}, now())
    `;
  }
});

test.afterAll(async () => {
  // Deleting the host cascades to its listings, photos, and amenities (ON DELETE CASCADE).
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE id = ${bookableHostId}`;
  await sql.end();
});

/**
 * TRAP 1, the shared spine's reachability guard (e2e/overflow-320.spec.ts:341-353).
 *
 * Every assertion in the three Phase-12 cases below is "a thing is selected" or "a thing is absent",
 * and a blank page, a 404 and a redirect to /login all satisfy the second kind. This names a selector
 * only THIS route produces, and it runs before anything else. The 15s timeout is copied too — it is a
 * measured allowance for the dev server's on-demand compiles, not a hedge.
 */
async function expectListingReachable(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: /searched window studio/i }),
    "the listing route rendered no title heading, so it is not the surface these cases assert about",
  ).toBeVisible({ timeout: 15_000 });
}

/** The month-grid button for a venue-local date — react-day-picker tags the `<td>` with an ISO `data-day`. */
function dayButton(page: Page, iso: string) {
  return page.locator(`td[data-day="${iso}"] button`);
}

// =====================================================================================================
// BFLOW-02 / D-56 - the conventional order, and the hydration site that is now gone (plan 12-08)
// =====================================================================================================
//
// ONE THEME, DELIBERATELY. Both cases below run under `court` only and there is no both-themes loop.
// Document order is a fact about the markup, not about the palette: the two themes swap CSS custom
// properties and nothing else, so a second pass would re-run identical assertions at twice the cost and
// report the same result twice. The same is true of the hydration listener - a mismatch is React
// comparing trees, which no colour token participates in. `seedTheme` still runs before the first
// `goto` (spine item 3) so a theme is applied pre-paint rather than swapped in after it.
//
// THE LISTING THESE USE IS THE NOT-PAYABLE ONE, and that is the point of case (8): `publishedId`'s host
// has no `host_payout` row, so the rail renders the disabled `Not bookable yet` affordance - which is
// where the `[11-13]` tooltip stood. A bookable listing would exercise `BookCta` instead and the case
// would pass without ever visiting the node it is about.
//
// ⚠ THIS BLOCK IS DECLARED FIRST IN THE FILE ON PURPOSE, AND THE REASON IS MECHANICAL. This file is
// `mode: "serial"`, so ONE failure skips every test declared after it - and the file carries a LOGGED
// STANDING RED that nothing in this phase has fixed: `a draft listing 404s to the public` answers 200
// (deferred-items.md, `[12-02]`). Declared below it, these two cases would be collected, skipped and
// reported as "did not run" in every whole-file invocation, which reads in CI exactly like a spec
// nobody wrote. Declaring them above it is the whole mitigation; it changes no shipped case's order
// relative to any other and suppresses nothing. When the draft-404 red is fixed, this paragraph is the
// thing to delete, not the ordering - move the block back only after re-reading why it moved.
//
// The red itself is NOT dev-only, and that is measured rather than assumed: plan 12-08 ran the same
// spec against `npm run build && npm start` and it failed identically at `Expected 404 / Received 200`,
// so it is a real rendering-strategy defect and not the streaming artefact `[11-13]` turned out to be.

test.describe("the listing page's information architecture (BFLOW-02) and the deleted [11-13] site (D-56)", () => {
  test.beforeEach(async ({ page }) => {
    await seedTheme(page.context(), "court");
  });

  /** BFLOW-02 / 12-UI-SPEC AC#3 - the six section headings, in the order a booker expects them. */
  const REQUIRED_HEADINGS = [
    "About this space",
    "Amenities",
    "Availability",
    "Location",
    "Cancellation policy",
    "Your host",
  ];

  test("(7) the six section headings appear in the required document order", async ({ page }) => {
    test.setTimeout(90_000);

    const res = await page.goto(`${BASE}/listings/${publishedId}`);
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: /sunlit yoga studio/i }),
      "the listing route rendered no title heading, so this is not the surface the case asserts about",
    ).toBeVisible({ timeout: 15_000 });

    // SCOPED TO `main`, AND THAT IS MEASURED RATHER THAN TIDY. `SiteFooter` renders its own two `<h2>`s
    // (`Product`, `Legal & support`) inside this route's layout, so an unscoped heading query returns
    // EIGHT names and the ordered comparison would fail on markup that is entirely correct. The count
    // guard on `main` is the vacuity check: with zero mains the array below would be empty and an
    // equality against six names would fail loudly rather than silently pass.
    await expect(page.locator("main")).toHaveCount(1);

    // ONE EXPECTATION OVER THE WHOLE SEQUENCE, not six existence checks. A reorder is the failure this
    // case exists for, and six independent `toBeVisible()`s are all still green after one - they can
    // only report a MISSING heading, never a moved one. Comparing the arrays prints both sequences, so
    // the diff names what moved and where it went.
    const headings = await page.locator("main h2").allInnerTexts();
    expect(
      headings.map((h) => h.trim()),
      "the listing page's `<h2>` sequence is not BFLOW-02's order. The requirement is the ORDER, not " +
        "the presence: availability above the map, and cancellation as a section of its own",
    ).toEqual(REQUIRED_HEADINGS);
  });

  test("(8) a full load of the not-payable listing raises no hydration mismatch (D-56)", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // Listeners attached BEFORE the navigation - a hydration error is thrown during the first client
    // render, so a listener registered after `goto` resolves can miss the only message it wants.
    const messages: string[] = [];
    page.on("console", (m) => messages.push(m.text()));
    page.on("pageerror", (e) => messages.push(e.message));

    const res = await page.goto(`${BASE}/listings/${publishedId}`);
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole("button", { name: /not bookable yet/i }),
      "the disabled affordance is missing, which is itself the symptom a regenerated tree produces",
    ).toBeVisible({ timeout: 15_000 });

    // THE EXPLANATION IS NOW READABLE WITHOUT ANY INTERACTION. This is the accessibility half of D-56
    // and it is asserted before the negative below, because it is the property a reader of this case
    // should see first: no hover, no focus, no pointer - the sentence is simply on the page.
    await expect(
      page.getByText(/isn.t accepting bookings yet — the host is finishing their payout setup/i),
    ).toBeVisible();

    // ...and the second sentence the tooltip duplicated is gone, so the rail says it once.
    await expect(page.getByText(/you can browse now/i)).toHaveCount(0);

    // PROVE THE PAGE HYDRATED BEFORE ASSERTING AN ABSENCE ON IT. 12-07 recorded this the third time
    // this repo met it: an absence assertion against a hydrated page measures the pre-hydration gap
    // unless something first shows the client JavaScript ran. Opening and closing the photo lightbox
    // requires the island to be live in both directions, and it is the cheapest interactive surface on
    // this route (the calendar's controls are all disabled on a not-payable listing).
    await page.getByRole("button", { name: /photo 1 of 3/i }).first().click();
    await expect(page.locator('[data-testid="photo-lightbox"]')).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="photo-lightbox"]')).toHaveCount(0);

    const hydrationErrors = messages.filter((m) => m.includes("Hydration failed"));
    expect(
      hydrationErrors,
      `the page reported ${hydrationErrors.length} hydration mismatch(es). React's own remedy is ` +
        `"this tree will be regenerated on the client", which is the duplicate-node mechanism Phase 11 ` +
        `chased four times — and on this route it left the "Not bookable yet" affordance off the ` +
        `hydrated tree entirely. Messages: ${JSON.stringify(hydrationErrors)}`,
    ).toEqual([]);
  });
});

test.describe("public listing detail page (LIST-06)", () => {
  test("a published listing is viewable by an anonymous visitor (no session)", async ({ page }) => {
    const res = await page.goto(`${BASE}/listings/${publishedId}`);
    expect(res?.status(), "published listing returns 200").toBe(200);

    // Not redirected to auth — the page is public (LIST-06).
    expect(page.url()).toContain(`/listings/${publishedId}`);
    expect(page.url()).not.toContain("/login");

    // The title renders as a heading.
    await expect(
      page.getByRole("heading", { name: /sunlit yoga studio/i }),
    ).toBeVisible();

    // The book CTA reflects bookability state (D-13): a real "Book" or a disabled "Not bookable yet".
    await expect(
      page.getByRole("button", { name: /book|not bookable yet/i }),
    ).toBeVisible();
  });

  test("a draft listing 404s to the public", async ({ page }) => {
    const res = await page.goto(`${BASE}/listings/${draftId}`);
    expect(res?.status()).toBe(404);
  });

  test("an unlisted listing 404s to the public", async ({ page }) => {
    const res = await page.goto(`${BASE}/listings/${unlistedId}`);
    expect(res?.status()).toBe(404);
  });
});

// =====================================================================================================
// D-59 #1 - the searched window survives the click (plan 12-02)
// =====================================================================================================

test.describe("the searched window survives the click to the listing (D-59 #1)", () => {
  // These are BEHAVIOUR assertions, not measurements, so there is no both-themes loop and no
  // `document.fonts.ready` - nothing here reads a `boundingBox()`. `seedTheme` still runs before the
  // first `goto` (spine item 3) so a theme is applied pre-paint rather than swapped in after it.
  test.beforeEach(async ({ page }) => {
    await seedTheme(page.context(), "court");
  });

  test("(4) arriving with ?date&start&end opens THAT day with THAT window selected - no interaction", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // Exactly what search-result-card.tsx writes: a venue-local day and an on-the-hour venue-local window.
    const res = await page.goto(
      `${BASE}/listings/${bookableId}?date=${targetDateParam}&start=17:00&end=18:00`,
    );
    expect(res?.status(), "the listing must render, never 404, for a link carrying a window").toBe(200);
    await expectListingReachable(page);

    // -- THE DAY --------------------------------------------------------------------------------
    // If the target lands in next month the page must have opened ON that month, with no click from us.
    await expect(
      dayButton(page, targetDateParam),
      "the searched day's cell is not even in the rendered month - the page did not open on it",
    ).toHaveCount(1);
    await expect(dayButton(page, targetDateParam)).toHaveAttribute("data-selected-single", "true");

    // ...AND NOT TODAY. The target is +3 days out by construction, so this cannot pass vacuously - but
    // asserting it explicitly is what makes the case fail loudly if the seeding silently no-ops back to
    // the shipped behaviour (which was: always today).
    expect(todayDateParam, "the target day must not BE today, or the next assertion is vacuous").not.toBe(
      targetDateParam,
    );
    const todayCell = dayButton(page, todayDateParam);
    if ((await todayCell.count()) > 0) {
      await expect(todayCell).not.toHaveAttribute("data-selected-single", "true");
    }

    // The day heading beside the slot grid names the searched day, not today.
    await expect(page.getByRole("heading", { name: targetDayHeading })).toBeVisible();

    // -- THE WINDOW -----------------------------------------------------------------------------
    // 5-6 PM reads as SELECTED in the picker. `aria-pressed` is the picker's own honest signal for a
    // committed run (slot-picker.tsx), and it is asserted before the rail so a failure names the grid.
    await expect(page.getByRole("button", { name: "5:00 PM", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // The run is 17:00-18:00 - ONE hour - so 6:00 PM must NOT be swept in.
    await expect(page.getByRole("button", { name: "6:00 PM", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // -- THE RAIL -------------------------------------------------------------------------------
    // The lifted selection reached the rail summary, which names the window back to the booker.
    await expect(page.getByText(/5:00 PM\s*[-–]\s*6:00 PM/i)).toBeVisible();

    // And the CTA is live: the booker can act on what they already told us, without re-picking anything.
    await expect(page.getByRole("button", { name: "Book this space" })).toBeEnabled();
  });

  test("(5) an off-the-hour start opens the day with NO selection and no error region", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const res = await page.goto(
      `${BASE}/listings/${bookableId}?date=${targetDateParam}&start=17:30&end=18:00`,
    );
    expect(res?.status()).toBe(200);
    await expectListingReachable(page);

    // THE DAY SURVIVES - a rejected window must not cost the booker the day they asked for.
    await expect(dayButton(page, targetDateParam)).toHaveAttribute("data-selected-single", "true");
    await expect(page.getByRole("heading", { name: targetDayHeading })).toBeVisible();

    // THE SELECTION DOES NOT. Nothing in the picker is pressed: not a half-seeded 5 PM anchor, not a
    // rounded-down 5-6 PM run. `Book full day` also carries aria-pressed, and it is false too, so this
    // covers every pressed control on the surface in one count.
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.getByText(/5:00 PM\s*[-–]\s*6:00 PM/i)).toHaveCount(0);

    // AND NOTHING WENT WRONG. A discarded param is a normal outcome, not a failure: no alert region,
    // and specifically not the day-fetch error box (T-12-02-PARAMTAMPER).
    //
    // SCOPED TO `main`, AND THAT IS MEASURED RATHER THAN TIDY. An unscoped `getByRole("alert")` resolves
    // to 1 on every page in `next dev`: Playwright pierces shadow DOM, so it finds the dev overlay's own
    // alert inside `<nextjs-portal>`. An assertion that counts the framework's dev chrome is red for a
    // reason that has nothing to do with the booker. The page's own content root is the `<main>` this
    // route renders, and the count guard on it is the vacuity check for the empty-list assertion below.
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await expect(page.getByText(/could ?n.t load this day/i)).toHaveCount(0);
  });

  test("(6) one day selection issues EXACTLY ONE availability request (RESP-02 AC#21)", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // Count by HEADER, never by path: a Next server action POSTs to the CURRENT ROUTE URL, so a path
    // filter would either match the navigation too or match nothing. See this file's header for the
    // observed name and how it was captured.
    let actionRequests = 0;
    let loggedOnce = false;
    await page.route("**/*", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const headers = request.headers();
        if (headers["next-action"] !== undefined) {
          actionRequests += 1;
          if (!loggedOnce) {
            loggedOnce = true;
            // Printed once per run so the observed header name recorded in this file's header stays
            // checkable by the next reader rather than having to be taken on trust.
            console.log(
              `[12-02] server-action request observed: next-action=${headers["next-action"]} ` +
                `url=${request.url()} rsc=${headers["rsc"]}`,
            );
          }
        }
      }
      await route.continue();
    });

    // Arrive with NO params, so the page opens on venue-local today and the click below is a real day
    // CHANGE. The count starts from the first paint, which the RSC served - that read cost no action
    // request at all, and this asserts it.
    const res = await page.goto(`${BASE}/listings/${bookableId}`);
    expect(res?.status()).toBe(200);
    await expectListingReachable(page);
    expect(actionRequests, "the first paint must be served by the RSC, with no client fetch").toBe(0);

    // Navigate the venue-tz calendar to the target day and click it - ONE day selection.
    // VERBATIM from price-parity.spec.ts (selectTargetDay) - see this file's header copy note.
    if (crossesMonth) {
      await page.getByRole("button", { name: /next month/i }).click();
    }
    const day = page
      .getByRole("button", { name: targetDayLabel })
      .and(page.locator("td:not([data-outside='true']) button"))
      .and(page.locator("button:not([disabled])"));
    await day.first().click();

    // Wait for the NEW day to be on screen before counting, so a count of 1 cannot mean "the second
    // request has not fired yet".
    await expect(page.getByRole("heading", { name: targetDayHeading })).toBeVisible();
    await expect(page.getByRole("button", { name: "5:00 PM", exact: true })).toBeVisible();

    // Give a would-be second request room to arrive and still be counted - otherwise `=== 1` would be
    // asserting a race rather than a property.
    await page.waitForTimeout(1_500);

    expect(
      actionRequests,
      `one day selection issued ${actionRequests} availability requests. EXACTLY ONE is the ` +
        `requirement (RESP-02 AC#21): two means the day is held in more than one place again, which ` +
        `is precisely what hoisting it into BookingSelectionProvider (plan 12-02) was for. This is ` +
        `=== 1 and not >= 1 on purpose - >= 1 is green for the defect.`,
    ).toBe(1);
  });
});

// =====================================================================================================
// NOT COVERED - real blind spots, stated so the next reader under-trusts this spec
// =====================================================================================================
//
//   - ONE VIEWPORT. These run at the project's default size, so the RESP-02 SHEET - the second booking
//     view whose existence is the whole reason the day was hoisted - is not mounted here. The "exactly
//     one request" count is therefore proven for the desktop placement only; the 375px half belongs to
//     the plan that builds the sheet.
//   - ONE MODE. Exclusive/hourly only. A drop-in (open_capacity) listing deliberately still opens on
//     venue-local today - DatePassPicker owns its own day state - and nothing here would notice if that
//     changed.
//   - THE DISCARD PATH IS TESTED WITH ONE SHAPE. Case (5) uses an off-the-hour `start`; the other four
//     discard shapes (a UTC ISO instant, `end <= start`, a partial window, a garbage `date`) are
//     asserted against the schema in `tests/validation/search-window.test.ts`, not against the page.
//   - NO HORIZON EDGE. A `date` in the past or beyond the 90-day horizon must fall back to today
//     silently. That branch is exercised by neither this spec nor the vitest file.
//   - NOTHING PAST THE LISTING PAGE. No hold is placed; `placeHold` re-deriving the window server-side
//     is the authority these cases deliberately do not stand in for.
//   - CASE (8) IS A DEV-MODE MEASUREMENT, because Playwright's `webServer` runs `npm run dev`. That is
//     the STRICTER of the two modes for this assertion and that was measured, not assumed: plan 12-08
//     ran the `[11-13]` discriminator both ways before writing the fix, and the mismatch appeared ONLY
//     in dev — a production build served the same route with zero. So a green here implies a green
//     under `npm start`, and a case written against a production server would have been green before
//     the fix as well as after it.
//   - CASE (7) DEPENDS ON THE LISTING HAVING A DESCRIPTION AND A CANCELLATION TIER. Both sections are
//     conditional in the page (a null tier renders no disclosure anywhere, so the heading would stand
//     over nothing), which is why the seed sets the tier explicitly. A listing missing either one has
//     five headings in the same relative order and this case would report the shorter array.
//   - THE ORDER IS ASSERTED, THE RHYTHM IS NOT. Nothing here reads a `boundingBox()`, so the
//     `Separator` spacing between sections and the key-facts strip's 2×2 collapse below 700px are
//     measured by neither this case nor `tests/listing/key-facts.test.tsx` (jsdom compiles no
//     Tailwind). A rendered geometry pass belongs with the viewport spec 12-11 owns.
