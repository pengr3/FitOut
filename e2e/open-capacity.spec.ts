// OPEN-01..04 · OC-02 / OC-07 / OC-11 / OC-12 / OC-13 — the DROP-IN (open-capacity) path, driven end to end
// in a real browser.
//
// WHY A BROWSER IS REQUIRED. Every other Phase-9 plan proved its own slice at the unit/integration layer:
// the admissions claim races two Postgres connections (tests/availability/open-capacity-race.test.ts), the
// read model projects `remaining` (open-capacity-readmodel.test.ts), the search fork keeps a drop-in
// candidate on a date alone (search tests), and each component renders in jsdom. NONE of them can show the
// one thing open capacity actually IS: a booker looking at a date, and the number of spots on it going down
// because SOMEBODY ELSE took one. That decrement is only observable across two independent bookers' views of
// the same rendered page, so it is only provable here. This spec composes the shipped pieces — the RSC
// listing page, the client DatePassPicker, the public availability actions, the two-stage search — against
// the real dev Postgres, and watches the figure move.
//
// THE E2E IDIOM (cloned from e2e/availability.spec.ts and e2e/search-and-book.spec.ts): seed DIRECTLY into
// the dev Postgres `public` schema — the same database the Playwright `webServer` dev app reads — with a
// unique `randomUUID()` id per row per run, and tear every row down in `afterAll`. A bookable listing needs
// its host `email_verified = true` AND a `host_payout` row with `payouts_enabled = true` (deriveBookable is
// enforced inside the search SQL and on the listing page; the `merchant.activated` webhook is Phase 2).
//
// SERIAL, AND DELIBERATELY SO. The five cases walk ONE listing's date through its whole scarcity lifecycle —
// empty → two heads taken → sold out — and each case asserts the state the previous one left behind. That
// progression IS the feature, so the cases share a fixture and run in order (`mode: "serial"`), the same
// choice e2e/search-and-book.spec.ts makes and the same fix Phase 7 applied to public-listing.spec after a
// parallel `CONNECTION_ENDED` flake. Two distinct dates keep the "still has spots" cases and the "sold out"
// cases from fighting over one row set.
//
// WHAT IS DELIBERATELY NOT HERE: the money path. `Confirm & pay` opens a PayMongo HOSTED CHECKOUT that
// Playwright cannot drive (see e2e/search-and-book.spec.ts's header); the real drop-in charge is the human
// walkthrough's job (09-16). Occupancy is therefore simulated the way the claim itself writes it — a
// `booking` row with `open_capacity = true, status = 'confirmed', declared_pax = N, unit = 1` and
// `starts_at`/`ends_at` set to the date's opening/closing instants — which is exactly the shape
// `createOpenCapacityHold` inserts and exactly the set `openTakenSql` counts.
//
// THE CONTROL. A second, EXCLUSIVE listing is seeded on the same host with the same space type, hours and
// city. It is what makes the absences meaningful: the hour grid is missing from the drop-in page because
// that page forks, not because the hour grid stopped rendering anywhere (case 1), and a drop-in listing
// disappearing from a sold-out date's results is a fact about occupancy, not about the search query dying
// (case 5). The drop-in listing also deliberately KEEPS its `hourly_rate_cents`/`day_rate_cents` columns:
// 09-06 requires a price per person but never CLEARS the exclusive rate columns, and OC-17 lets a host
// switch modes, so "open listing ⇒ null rates" is never safe — a fork keyed on a null rate rather than on
// the persisted mode would quote ₱472.50/hr here and this spec would catch it (09-07's lesson).

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { format } from "date-fns";
import { tz, TZDate } from "@date-fns/tz";

const BASE = "http://localhost:3000";
const VENUE_TZ = "Asia/Manila";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as tests/helpers/db.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

// ---- Unique ids per run -----------------------------------------------------
const hostId = `e2e_open_host_${randomUUID()}`;
const openListingId = `e2e_open_listing_${randomUUID()}`;
const exclusiveListingId = `e2e_open_control_${randomUUID()}`;
const bookerAId = `e2e_open_bookerA_${randomUUID()}`;
const bookerBId = `e2e_open_bookerB_${randomUUID()}`;
const bookerCId = `e2e_open_bookerC_${randomUUID()}`;

// ── Case 6's OWN fixture (09-17 / CR-01). Deliberately separate from the five-case one above. ──────────
// Case 6 buys a pass for TODAY, which needs (a) a listing whose venue has ALREADY OPENED at run time and
// (b) a genuinely signed-in `canBook` session, because `Book this space` is gated (D-41). Its own listing,
// its own space type and its own cap keep it out of cases 3 and 5's category-scoped search counts and out
// of cases 1/2/4's date occupancy, so nothing above it moves.
const todayListingId = `e2e_open_today_${randomUUID()}`;
const todayBookerEmail = `e2e.open.today.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
const todayBookerPassword = "averylongpassword";
/** The signed-up booker's session, captured once and re-applied per test (search-and-book.spec.ts's idiom). */
let todayBookerState: Awaited<ReturnType<BrowserContext["storageState"]>>;

// A space type NO other seeded spec uses (availability/cancel/public-listing seed yoga_studio;
// search-and-book seeds tennis_court) and which the dev DB has none of, so the category filter narrows to
// exactly these two listings no matter what else lives in the dev database or runs in parallel.
const SPACE_TYPE = "pilates_barre_studio";
const SPACE_TYPE_LABEL = "Pilates / barre studio";
// No colon in either title — case 3 asserts a drop-in card renders no clock time at all, and the title is
// part of the card's rendered text.
const OPEN_TITLE = "E2E Drop-In Pilates Loft";
const EXCLUSIVE_TITLE = "E2E Whole-Space Pilates Room";
const CITY = "Makati";

// CAP 3 → lowStockThreshold(3) = clamp(floor(3/2), 1, OPEN_LOW_STOCK_MAX=5) = 1, so `low` fires at exactly
// 1 remaining. CONSEQUENCE, asserted in case 2 and NOT an accident: at this cap the FIRST pass sold moves the
// count 3 → 2 with NO visible change at all (both are the digit-free `Spots available`); only the second head
// crosses the threshold. Case 2 buys the two heads ONE AT A TIME so that silent transition is a pinned
// contract rather than a blind spot — 09-16's human walkthrough hit it and read it as a broken counter.
const CAP = 3;
const PER_HEAD_PRICE_CENTS = 35000;
const HOURLY_RATE_CENTS = 47000;
const DAY_RATE_CENTS = 290000;
const OPEN_HOUR = 6; // 06:00 → "6:00 AM"
const CLOSE_HOUR = 22; // 22:00 → "10:00 PM"

// Case 6's listing: its own type/title (invisible to cases 3 and 5, which filter on SPACE_TYPE) and its own
// cap (so the stepper ceiling and the chip state are its own).
const TODAY_SPACE_TYPE = "dance_studio";
const TODAY_TITLE = "E2E Same-Day Drop-In Dance Loft";
const TODAY_CAP = 4;

// ---- Target dates: venue-local, a few days out (future + inside the 90-day horizon) ----------------
const inTz = tz(VENUE_TZ);
const now = new Date();
const initMonth = Number(format(now, "M", { in: inTz }));
const initYear = Number(format(now, "yyyy", { in: inTz }));

type DayLocal = { year: number; month: number; day: number };

function dayAt(offsetDays: number): DayLocal {
  const d = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return {
    year: Number(format(d, "yyyy", { in: inTz })),
    month: Number(format(d, "M", { in: inTz })),
    day: Number(format(d, "d", { in: inTz })),
  };
}

// Both dates are pinned into the SAME venue-local month so one "next month" click reaches both — the sold-out
// case navigates between them inside a single page session, and hopping a month boundary mid-test would make
// the grid navigation (not the feature) the thing under test.
let offset = 3;
while (dayAt(offset).month !== dayAt(offset + 2).month) offset++;
/** Stays bookable throughout: empty → 2 heads taken → 1 left. */
const spotsDate = dayAt(offset);
/** Driven to zero: empty → 3 heads taken → fully booked. */
const soldDate = dayAt(offset + 2);
const crossesMonth = spotsDate.month !== initMonth || spotsDate.year !== initYear;

// ── Case 6's date: TODAY, with a window that has ALREADY OPENED (09-17 / CR-01). ───────────────────────
// The rule is identical to the one tests/booking/open-capacity-confirm.test.ts uses, on purpose — both
// proof layers exercise the same shape. `open_time` is the venue-local wall clock two hours ago floored to
// the hour, clamped at venue midnight; `close_time` is 23:59. Together they make this fixture deterministic
// at ANY hour of the day: at 01:31 Makati — the hour the 09-16 walkthrough ran, before that fixture's 06:00
// opening, which is precisely how CR-01 escaped nine human steps — this resolves to 00:00, still open.
const todayDate = dayAt(0);
const nowVenueHour = Number(format(now, "H", { in: inTz }));
const TODAY_OPEN_HOUR = Math.max(0, nowVenueHour - 2);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** The venue-local calendar day as the wire shape the search params and the hold action both use. */
function isoOf(d: DayLocal): string {
  return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
}

/** A UTC instant for `hour:00` venue-local on `d` — the same TZDate→epoch normalization openDayWindow uses. */
function utcAt(d: DayLocal, hour: number): Date {
  return new Date(new TZDate(d.year, d.month - 1, d.day, hour, 0, 0, VENUE_TZ).getTime());
}

/** react-day-picker's default day-button aria-label is "EEEE, MMMM do, yyyy" — match by month/day/year. */
function availableDayLabel(d: DayLocal): RegExp {
  const monthName = format(new Date(d.year, d.month - 1, d.day), "MMMM");
  return new RegExp(`${monthName}\\s+${d.day}(st|nd|rd|th)?,?\\s+${d.year}`);
}

/** A fully booked cell's label is REPLACED by DatePassPicker's own (date-pass-picker.tsx:266-273). */
function fullDayLabel(d: DayLocal): string {
  return `${format(new Date(d.year, d.month - 1, d.day), "EEEE, MMM d")} — fully booked`;
}

/** The day panel's own heading for a date ("EEEE, MMM d"). */
function panelHeading(d: DayLocal): string {
  return format(new Date(d.year, d.month - 1, d.day), "EEEE, MMM d");
}

/** The venue-local weekday (0 = Sunday, the `operating_hours.day_of_week` convention). Noon UTC is 20:00
 *  Manila on the SAME calendar date, so this needs no timezone library and cannot inherit a bug from one. */
function dowOf(d: DayLocal): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, 12, 0, 0)).getUTCDay();
}

// ---- Seeding ----------------------------------------------------------------

async function seedUser(id: string, name: string): Promise<void> {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (${id}, ${name}, ${`${id}@example.com`}, ${true}, ${"Ezra"}, ${true}, ${true}, now(), now())
  `;
}

type SeedListingArgs = {
  id: string;
  title: string;
  occupancyMode: "exclusive" | "open_capacity";
  perHeadPriceCents: number | null;
  maxOccupancy: number;
  /** Case 6's listing overrides these; omitted everywhere else, so cases 1-5 seed exactly as before. */
  spaceType?: string;
  hours?: { daysOfWeek: number[]; openTime: string; closeTime: string };
};

async function seedListing({
  id,
  title,
  occupancyMode,
  perHeadPriceCents,
  maxOccupancy,
  spaceType = SPACE_TYPE,
  hours = {
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    openTime: `${pad2(OPEN_HOUR)}:00`,
    closeTime: `${pad2(CLOSE_HOUR)}:00`,
  },
}: SeedListingArgs): Promise<void> {
  // Both rate columns are set on BOTH listings on purpose — see the header. A drop-in listing that carried
  // NULL rates would let a fork keyed on the wrong thing (a null column instead of the persisted mode) pass.
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, cancellation_policy, status, review_state, published_at, created_at, updated_at
    ) VALUES (
      ${id}, ${hostId}, ${title},
      ${"A warm reformer studio with props, mats and a sprung floor."}, ${spaceType}::space_type,
      ${"7 Real Street"}, ${CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0345}, ${14.5679}), 4326), ${false}, ${maxOccupancy}, ${1}, ${VENUE_TZ},
      ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS}, ${perHeadPriceCents}, ${occupancyMode}::occupancy_mode,
      ${"php"}, ${"instant"}::booking_mode, ${"standard"}::cancellation_policy,
      ${"published"}::listing_status, ${"approved"}::listing_review_state, now(), now(), now()
    )
  `;
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
      (${randomUUID()}, ${id}, ${`fitout/e2e-open/${id}/0`}, ${"https://example.com/e2e-open-0.jpg"}, ${0}),
      (${randomUUID()}, ${id}, ${`fitout/e2e-open/${id}/1`}, ${"https://example.com/e2e-open-1.jpg"}, ${1}),
      (${randomUUID()}, ${id}, ${`fitout/e2e-open/${id}/2`}, ${"https://example.com/e2e-open-2.jpg"}, ${2})
  `;
  // 06:00–22:00 every weekday by default, so whichever weekday the clock-relative target dates land on is
  // open. Case 6 passes its own already-opened window for today's weekday only.
  for (const dow of hours.daysOfWeek) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${randomUUID()}, ${id}, ${dow}, ${hours.openTime}, ${hours.closeTime}, now())
    `;
  }
}

/**
 * ANOTHER BOOKER TAKES `pax` PASSES on `date` — written exactly as `createOpenCapacityHold` writes it: one
 * ordinary booking row, `open_capacity = true`, the sentinel `unit = 1`, `declared_pax` always set, and the
 * whole operating day as the window (OC-03 — a pass's `starts_at` is the venue's OPENING instant, which is
 * also the key `openTakenSql` groups on). Seeded directly rather than paid, because the checkout tail is not
 * automatable; the claim path itself is proven under genuine concurrency in
 * tests/availability/open-capacity-race.test.ts.
 */
async function takePasses(date: DayLocal, bookerId: string, pax: number): Promise<void> {
  const spaceCents = PER_HEAD_PRICE_CENTS * pax;
  const feeCents = Math.round(spaceCents * 0.05);
  await sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, open_capacity, declared_pax, full_day,
      space_price_cents, service_fee_cents, quoted_total_cents, currency, created_at
    ) VALUES (
      ${randomUUID()}, ${openListingId}, ${1}, ${bookerId},
      ${utcAt(date, OPEN_HOUR)}, ${utcAt(date, CLOSE_HOUR)},
      ${"confirmed"}::booking_status, ${"instant"}::booking_mode, ${"standard"}::cancellation_policy,
      ${true}, ${pax}, ${false},
      ${spaceCents}, ${feeCents}, ${spaceCents + feeCents}, ${"php"}, now()
    )
  `;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await seedUser(hostId, "E2E Open Host");
  await seedUser(bookerAId, "E2E Open Booker A");
  await seedUser(bookerBId, "E2E Open Booker B");
  await seedUser(bookerCId, "E2E Open Booker C");

  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
  // …and an ops-APPROVED host_verification row — deriveBookable's SIXTH term (phase 18,
  // D-224). A host with NO row reads as 'unverified' and cannot sell, so without this the
  // listing seeded below is not bookable and this spec fails on a page that never renders.
  // ⚠ e2e does NOT run in CI (D-24) — only a hand run can catch a miss here.
  await sql`
    INSERT INTO "host_verification" (user_id, status, provider, created_at, updated_at)
    VALUES (${hostId}, ${"approved"}::host_verification_status, ${"manual"}, now(), now())
  `;

  await seedListing({
    id: openListingId,
    title: OPEN_TITLE,
    occupancyMode: "open_capacity",
    perHeadPriceCents: PER_HEAD_PRICE_CENTS,
    maxOccupancy: CAP,
  });
  await seedListing({
    id: exclusiveListingId,
    title: EXCLUSIVE_TITLE,
    occupancyMode: "exclusive",
    perHeadPriceCents: null,
    maxOccupancy: 8,
  });

  // ── Case 6's same-day listing: open since two hours ago, closing at 23:59, TODAY's weekday only. ──────
  await seedListing({
    id: todayListingId,
    title: TODAY_TITLE,
    occupancyMode: "open_capacity",
    perHeadPriceCents: PER_HEAD_PRICE_CENTS,
    maxOccupancy: TODAY_CAP,
    spaceType: TODAY_SPACE_TYPE,
    hours: {
      daysOfWeek: [dowOf(todayDate)],
      openTime: `${pad2(TODAY_OPEN_HOUR)}:00`,
      closeTime: "23:59",
    },
  });

  // Case 6's booker signs up through the UI (intent "book" → canBook server-side, D-41) and the session
  // cookie is captured as storageState, exactly as e2e/search-and-book.spec.ts does. The raw-SQL bookers
  // above have no Better Auth account and could never reach a reserve page.
  const ctx = await browser.newContext();
  const signupPage = await ctx.newPage();
  await signupPage.goto(`${BASE}/signup`);
  await signupPage.getByRole("radio", { name: "Book a space" }).click();
  await signupPage.getByLabel("First name").fill("Sameday");
  await signupPage.getByLabel("Email").fill(todayBookerEmail);
  await signupPage.getByLabel("Password", { exact: true }).fill(todayBookerPassword);
  await signupPage.getByLabel("Confirm password").fill(todayBookerPassword);
  await signupPage.getByRole("button", { name: /sign up to book/i }).click();
  await signupPage.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 20_000 });
  todayBookerState = await ctx.storageState();
  await ctx.close();
});

test.afterAll(async () => {
  // Bookings FIRST (booker_id is ON DELETE RESTRICT), then the host (cascades listings/photos/hours), then
  // the bookers. Order is load-bearing — mirrors availability.spec.ts:134-141. Case 6 mints a REAL pending
  // hold on todayListingId, so that listing joins the booking sweep and its signed-up booker is removed by
  // email (Better Auth chose the id).
  await sql`DELETE FROM booking WHERE listing_id IN (${openListingId}, ${exclusiveListingId}, ${todayListingId})`;
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE id IN (${bookerAId}, ${bookerBId}, ${bookerCId})`;
  await sql`DELETE FROM "user" WHERE email = ${todayBookerEmail}`;
  await sql.end();
});

// ---- Page helpers -----------------------------------------------------------

/** Bring the month containing `d` into view (only ever forward — every target date is in the future). */
async function showMonthOf(page: Page, d: DayLocal): Promise<void> {
  if (!crossesMonth) return;
  const already = await page
    .getByRole("button", { name: availableDayLabel(d) })
    .or(page.getByRole("button", { name: fullDayLabel(d), exact: true }))
    .count();
  if (already === 0) {
    await page.getByRole("button", { name: /next month/i }).click();
  }
}

/**
 * Click the seeded date in the month grid. Scoped to the enabled, in-month occurrence: with showOutsideDays
 * a boundary-adjacent day renders twice under the SAME aria-label (IN-05), and the outside duplicate is
 * disabled — clicking it would silently do nothing.
 */
async function pickDay(page: Page, d: DayLocal): Promise<void> {
  await showMonthOf(page, d);
  const cell = page
    .getByRole("button", { name: availableDayLabel(d) })
    .and(page.locator("td:not([data-outside='true']) button"))
    .and(page.locator("button:not([disabled])"));
  await cell.first().click();
}

// ---- The five cases ---------------------------------------------------------

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE STREAMING-BUFFER RULE — why some locators here carry `.filter({ visible: true })`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// React parks a Suspense boundary's payload in a `<div hidden id="S:n">` while it reveals it, so on a
// route with a `loading.tsx` every SERVER-RENDERED element on the page briefly exists TWICE — once live,
// once in that buffer. A Playwright locator matches hidden elements, so it resolves to 2 and strict mode
// throws before `toBeVisible()` ever filters. The canonical account — the DOM timeline, the measurements,
// and why `.first()`, a longer timeout and a CSS scope were each rejected — is in
// `e2e/search-and-book.spec.ts`; search it for THE STREAMING-BUFFER RULE. Session:
// `.planning/debug/resolved/confirmation-reference-duplicate.md`.
//
// MEASURED FOR THIS FILE. All three routes it drives stage PAGE content and never the layout:
//   /                    id=S:1  main=true  siteHeader=false  testids=[result-card × 7]
//   /listings/[id]       id=S:2  main=true  siteHeader=false  testids=[listing-key-facts, panel-card,
//                                                                     booking-panel, booking-sticky-bar]
//   /listings/[id]/book  id=S:0  main=true  siteHeader=false  testids=[panel-card, price-disclosure,
//                                                                     price-total, checkout-sticky-bar]
//
// SO THE SPLIT IN THIS FILE IS, EXACTLY:
//   • filtered   — every `getByText` / `page.locator` that names PAGE content after a navigation
//   • NOT filtered, and each says so at the site:
//       - `getByRole(...)` — immune; the buffer is `hidden` and therefore out of the accessibility tree
//       - `toHaveCount(0)` — an absence claim; a duplicate cannot inflate zero, and filtering would
//         weaken it to "not visible" (see the `Closed for today` line)
//       - `getByTestId("site-header")` — layout, never staged
//       - `page.locator("body").innerText()` — `innerText` is RENDER-AWARE and already excludes the
//         buffer. Measured during an overlap: `textContent` found the needle 4 times, `innerText` 1.
//         (The locator itself resolves to `<body>`, of which there is only ever one.)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("drop-in (open-capacity) booking surface — OPEN-01..04", () => {
  test("1 · the public drop-in page asks for a DAY, and no hour is offered anywhere on it", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const res = await page.goto(`${BASE}/listings/${openListingId}`);
    expect(res?.status(), "published drop-in listing returns 200").toBe(200);
    expect(page.url(), "the public listing page needs no session").not.toContain("/login");

    // The section NAMES the mode before the picker is used (09-UI-SPEC § 2) — the accessible name of the
    // Availability heading carries the Drop-in badge's own word.
    await expect(page.getByRole("heading", { name: /availability\s+drop-in/i })).toBeVisible();
    await expect(
      page
        .getByText("Pick a day — your pass is good any time they're open.", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    // SC#2 — the venue timezone is named regardless of the browser's.
    await expect(
      page.getByText(/Times shown in .*Makati.*\(GMT\+8\)/i).filter({ visible: true }),
    ).toBeVisible();

    // ── THE ABSENCE IS THE PRIMARY SIGNAL (§ 2). The hour picker is not disabled, it is NOT MOUNTED. ──
    // SlotPicker's Radix ToggleGroup is the hour grid (slot-picker.tsx:156-161); "Book full day" is D-23's
    // whole-day shortcut. Neither exists in this mode, and neither does a single hour chip.
    await expect(page.getByRole("group", { name: "Available hours" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /book full day/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^\d{1,2}:00 (AM|PM)$/ })).toHaveCount(0);

    await pickDay(page, spotsDate);

    // The day panel: the date, the scarcity chip, the venue's opening hours, and the pass framing.
    await expect(page.getByRole("heading", { name: panelHeading(spotsDate) })).toBeVisible();
    await expect(
      page.getByText("Spots available", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Open 6:00 AM – 10:00 PM · Makati time", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Your pass covers the whole day — come any time while they're open.", {
          exact: true,
        })
        .filter({ visible: true }),
    ).toBeVisible();
    // OC-06 — the head count is chosen PRE-hold, on this page.
    await expect(
      page.getByText("How many passes?", { exact: true }).filter({ visible: true }),
    ).toBeVisible();

    // Still no hour grid once a date is picked (the fork is the whole surface, not just its empty state).
    await expect(page.getByRole("group", { name: "Available hours" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^\d{1,2}:00 (AM|PM)$/ })).toHaveCount(0);

    // ── UI-SPEC O2, measured against the REAL rendered page: the ONLY clock-time range anywhere on this
    // document is the venue's "Open …" hours line. A drop-in booking is a day, so any other range would be
    // describing a reservation the booker is not buying (the CR-01-class 16-hour range 09-08 forked out of
    // composeWhenLabel, and the "5:00 PM – 7:00 PM · 2 hours" the exclusive rail renders).
    const bodyText = await page.locator("body").innerText();
    const RANGE = /\d{1,2}:\d{2}\s*(?:AM|PM)\s*[–—-]\s*\d{1,2}:\d{2}\s*(?:AM|PM)/g;
    const OPEN_HOURS_LINE = /Open\s+\d{1,2}:\d{2}\s*(?:AM|PM)\s*[–—-]\s*\d{1,2}:\d{2}\s*(?:AM|PM)/g;
    const allRanges = bodyText.match(RANGE) ?? [];
    const openingHoursRanges = bodyText.match(OPEN_HOURS_LINE) ?? [];
    expect(openingHoursRanges, "the opening-hours line renders exactly once").toHaveLength(1);
    expect(
      allRanges,
      `every clock range on the drop-in page must be the opening-hours line; found: ${JSON.stringify(allRanges)}`,
    ).toHaveLength(openingHoursRanges.length);

    // ── THE CONTROL. The hour grid is missing above because THIS page forks, not because SlotPicker stopped
    // rendering: the exclusive listing, same host, same hours, same day, still shows hours and a full-day
    // shortcut. Without this the case-1 absences would also pass on a broken build that rendered no picker.
    await page.goto(`${BASE}/listings/${exclusiveListingId}`);
    await expect(page.getByRole("heading", { name: "Availability", exact: true })).toBeVisible();
    await pickDay(page, spotsDate);
    await expect(page.getByRole("group", { name: "Available hours" })).toBeVisible();
    await expect(page.getByRole("button", { name: "6:00 AM", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /book full day/i })).toBeVisible();
  });

  test("2 · spots decrement in a booker's browser because ANOTHER booker took passes — one pass at a time, and the first one is deliberately silent (OPEN-02/04, OC-11)", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // ── Booker A's first view: the date is untouched. `open` carries NO number at all (O4) — the read model
    // supplies only {remaining, cap}, which cannot substantiate urgency, so an always-on figure would be
    // invented scarcity. That absence is asserted, not assumed.
    await page.goto(`${BASE}/listings/${openListingId}`);
    await pickDay(page, spotsDate);
    const chip = page.getByRole("status").filter({ hasText: /Spots available|Only \d+ left|Fully booked/ });
    await expect(chip).toHaveText("Spots available");
    expect(
      (await chip.innerText()).match(/\d/),
      "the `open` chip carries no digit — no invented urgency",
    ).toBeNull();

    // ── ONE PASS AT A TIME — the INVISIBLE first decrement, pinned as INTENTIONAL (OC-11). ──
    // Booker B takes exactly ONE pass: 3 − 1 = 2 remaining. lowStockThreshold(3) = clamp(floor(3/2), 1, 5)
    // = 1, and 2 > 1, so the state is still `open` and the chip STILL reads "Spots available" with no digit.
    // The count MOVED in the database and, by design, NOT on screen.
    //
    // WHY THIS CASE EXISTS. 09-16's human walkthrough bought passes one at a time on a cap-3 listing, crossed
    // exactly this 3 → 2 transition, saw nothing change, and reported "i dont see chip auto deducting". The
    // arithmetic was correct the whole time; the DISPLAY RULE is what hid it. The half-capacity clamp is
    // deliberate (O4 / T-09-39 — invented urgency is a dark pattern: a chip that counts down from the first
    // booking is always-on noise), so the honest thing is to ASSERT the invisibility rather than leave it as
    // a blind spot the suite happens not to cover. The block below is the only place in the repository that
    // proves a real decrement can be correct AND unobservable, and it is why 09-15's "the spots-left figure
    // decrements between them" must be read as "at cap 3, only the SECOND head is disclosed".
    await takePasses(spotsDate, bookerBId, 1);

    await page.reload();
    await pickDay(page, spotsDate);
    await expect(
      chip,
      "cap 3, 2 remaining: still `open` — the first pass sold is deliberately not announced",
    ).toHaveText("Spots available");
    expect(
      (await chip.innerText()).match(/\d/),
      "2 of 3 left still carries NO digit — the count is disclosed only at the threshold",
    ).toBeNull();
    // The invisibility is a display rule, never a stale read: the server DID see the head. If the fork ever
    // stopped counting, `Only 1 left` below would not arrive either — so the two halves are read together.

    // ── Meanwhile, Booker B reserves a SECOND pass for that same date (2 of 3 heads taken in total). ──
    await takePasses(spotsDate, bookerBId, 1);

    // ── Booker A reloads and looks at the same date again. NOW the figure has moved on screen, and it moved
    // because somebody else is coming: cap 3 − 2 heads = 1 remaining, which is exactly the threshold, so the
    // exact count is disclosed (`low`). A reload re-renders the page seeded on TODAY, so the date is
    // re-picked — this is a genuinely fresh server read of the same date, not a client-side re-render.
    await page.reload();
    await pickDay(page, spotsDate);
    await expect(chip).toHaveText("Only 1 left");
    await expect(page.getByText("Only 1 left", { exact: true }).filter({ visible: true })).toBeVisible();

    // The date is still bookable — a low count is scarcity, never a refusal.
    await expect(
      page.getByText("How many passes?", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  });

  test("3 · a drop-in search card names the day, never a time range, and links with `date` alone", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // A searched WINDOW is supplied on purpose: a drop-in listing matches on the DATE alone (OC-12), so the
    // start/end hours must be ignored by the match, absent from the card, and absent from its link.
    await page.goto(
      `${BASE}/?category=${SPACE_TYPE}&date=${isoOf(spotsDate)}&start=09:00&end=11:00`,
    );

    // `.filter({ visible: true })` — THE STREAMING-BUFFER RULE. `/` stages the whole results `<main>`
    // (measured: testids=[result-card × 7]), so an unfiltered card locator resolves to 2 during the
    // reveal. It matters twice here: `expect(card).toBeVisible()` AND `card.innerText()` below, which
    // enforces strict mode before it reads anything.
    const card = page.locator(`a[href*="/listings/${openListingId}"]`).filter({ visible: true });
    await expect(card).toBeVisible();

    const cardText = await card.innerText();
    expect(cardText).toContain(OPEN_TITLE);
    expect(cardText).toContain(SPACE_TYPE_LABEL);
    expect(cardText, "the mode is named on the card").toContain("Drop-in");
    // The all-in per-person rate, composed SERVER-side from the same fee the checkout charges (D-75).
    expect(cardText).toMatch(/₱[\d,]+\.\d{2}\/person/);
    expect(cardText).toContain("Service fee included");
    // The scarcity chip rides straight through from the read model — the date has 1 of 3 left (case 2).
    expect(cardText).toContain("Only 1 left");
    // O2 — no clock time of ANY kind on a drop-in card. A `:` is the cheapest total proof: the drop-in
    // availability line is composed from the date STRING alone (search-result-card.tsx datePassLine), so the
    // searched 9:00 AM–11:00 AM cannot reach it.
    expect(cardText, `drop-in card must render no clock time; got: ${JSON.stringify(cardText)}`).not.toMatch(
      /\d{1,2}:\d{2}/,
    );
    // And it must not fall back to the leftover hourly rate the fixture deliberately keeps on the row.
    expect(cardText).not.toContain("/hr");

    // ── The link carries the DATE ALONE. `start`/`end` are not merely unused on the listing page (which has
    // no hour picker in this mode) — they are never put on the URL, because a window it cannot resume would
    // be a dead link and, worse, a promise of hours the pass does not reserve.
    const href = await card.getAttribute("href");
    expect(href).toContain(`date=${isoOf(spotsDate)}`);
    expect(href).not.toContain("start=");
    expect(href).not.toContain("end=");

    // The exclusive control, same query, KEEPS the searched window on its link — the difference above is the
    // fork, not a param that stopped being forwarded.
    const controlHref = await page
      .locator(`a[href*="/listings/${exclusiveListingId}"]`)
      .getAttribute("href");
    expect(controlHref).toContain("start=09%3A00");
    expect(controlHref).toContain("end=11%3A00");
  });

  test("4 · selling out is calm, unselectable, and never a dead end (OC-11/OC-13/OC-14)", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // A second date, untouched so far, is taken all the way to zero by three different bookers.
    await page.goto(`${BASE}/listings/${openListingId}`);
    await pickDay(page, soldDate);
    await expect(
      page.getByText("Spots available", { exact: true }).filter({ visible: true }),
    ).toBeVisible();

    await takePasses(soldDate, bookerAId, 1);
    await takePasses(soldDate, bookerBId, 1);
    await takePasses(soldDate, bookerCId, 1);

    // Re-read the SAME date from the server. The month grid's full-date set was fetched before the last three
    // passes were taken, so this is the OC-13 path the calendar exists to make rare but can never prevent: an
    // advisory picker offering a date the claim has since sold out. The answer is a calm panel, not an error.
    await pickDay(page, spotsDate); // move off the date so re-selecting it re-fetches
    await pickDay(page, soldDate);
    await expect(page.getByRole("heading", { name: panelHeading(soldDate) })).toBeVisible();
    await expect(
      page.getByText("Fully booked", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText(`All ${CAP} passes for this day are taken. Try another day.`, { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    // OC-14 — v1 ships NO back-in-stock affordance, so the sold-out panel must not offer one, and the
    // pass stepper is gone with the availability it was bounding.
    await expect(page.getByText("How many passes?", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /notify|waitlist|alert me/i })).toHaveCount(0);

    // ── A fresh load: the date is now PROGRAMMATICALLY disabled in the month grid, not merely greyed — it
    // rides react-day-picker's own `disabled` matcher, so keyboard and screen-reader state agree with the
    // paint, and the replaced aria-label says why.
    await page.reload();
    await showMonthOf(page, soldDate);
    const soldCell = page
      .getByRole("button", { name: fullDayLabel(soldDate), exact: true })
      .and(page.locator("td:not([data-outside='true']) button"));
    await expect(soldCell.first()).toBeVisible();
    await expect(soldCell.first()).toBeDisabled();

    // ── NEVER A DEAD END. The grid is still fully interactive: the other date is selectable and still sells.
    await pickDay(page, spotsDate);
    await expect(page.getByRole("heading", { name: panelHeading(spotsDate) })).toBeVisible();
    await expect(page.getByText("Only 1 left", { exact: true }).filter({ visible: true })).toBeVisible();
  });

  test("5 · a sold-out date drops the drop-in listing out of search, and only it (OC-12)", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.goto(`${BASE}/?category=${SPACE_TYPE}&date=${isoOf(soldDate)}&start=09:00&end=11:00`);

    // Stage-2 keeps an open candidate only while the picked date still has a spot, so a `full` date can never
    // reach a search card at all — there is deliberately no sold-out card treatment to fall back on.
    await expect(page.locator(`a[href*="/listings/${openListingId}"]`)).toHaveCount(0);
    // …and the exclusive control on the same date, same query, same host is still there — proving the
    // disappearance is a fact about that date's occupancy, not a search that returned nothing.
    await expect(
      page.locator(`a[href*="/listings/${exclusiveListingId}"]`).filter({ visible: true }),
    ).toBeVisible();

    // The same query one date earlier still shows both: the drop-in listing is gone from the sold-out date
    // only, not from search.
    await page.goto(`${BASE}/?category=${SPACE_TYPE}&date=${isoOf(spotsDate)}&start=09:00&end=11:00`);
    await expect(
      page.locator(`a[href*="/listings/${openListingId}"]`).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page.locator(`a[href*="/listings/${exclusiveListingId}"]`).filter({ visible: true }),
    ).toBeVisible();
  });

  // ── 09-17 · CR-01. THE BLIND SPOT THIS CASE EXISTS TO REMOVE. ────────────────────────────────────────
  // Cases 1-5 all book `offset >= 3` days out — not by preference but by construction: the month-alignment
  // loop above (`while (dayAt(offset).month !== dayAt(offset + 2).month) offset++`) starts at 3 and only
  // ever climbs, so before this case NOTHING in the browser proof ever placed a same-day booking. The 09-16
  // human walkthrough had the mirror-image gap: it ran at 01:31 Makati, before its fixture's 06:00 opening.
  // CR-01 — a pass for today that can be held but never paid for — lived in exactly the gap between those
  // two blind spots and survived 21/21 Playwright and 9/9 human steps.
  //
  // ⚠️ AND THIS CASE STILL CANNOT CATCH CR-01. Say it plainly: the defect lives on the click that LEAVES for
  // PayMongo, and `Confirm & pay` opens a HOSTED CHECKOUT Playwright cannot drive (the spec header's
  // documented boundary, which stands — see (d) below). Everything this case can reach renders correctly
  // both with and without the fix, and that was MEASURED, not assumed: with the CR-01 fork reverted in
  // src/app/actions/booking.ts this case still PASSES (recorded verbatim in 09-17-SUMMARY.md). That negative
  // result is the artifact. It demonstrates, rather than asserts, why a green browser proof said nothing
  // about CR-01, and why the gate for this class has to sit one layer down. The mutation-measured gate for
  // CR-01 is `tests/booking/open-capacity-confirm.test.ts` case 1, which drives the REAL confirmBooking.
  //
  // What this case DOES buy: the same-day path is now walked end to end by a real browser, so any future
  // regression that breaks it BEFORE the checkout click — a calendar that disables today, a rail that
  // refuses a same-day selection, a hold that lapses the instant it is minted (the `expires_at` divergence
  // in units.ts, whose absence would surface right here as the hold-expired state) — is caught.
  test("6 · a pass for TODAY can be bought after the venue has already opened (CR-01)", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // The Book gate is D-41, so this is the one case that needs a real session.
    await page.context().addCookies(todayBookerState.cookies);

    await page.goto(`${BASE}/listings/${todayListingId}`);
    await expect(page.getByRole("heading", { name: /availability\s+drop-in/i })).toBeVisible();

    // TODAY is always in the CURRENT month, so the month-alignment loop and `showMonthOf` are irrelevant
    // here — the cell is on the first grid the page paints. It is also never disabled: DatePassPicker's
    // matcher is `{ before: todayStart }`, which excludes yesterday and earlier, not today.
    await pickDay(page, dayAt(0));

    await expect(page.getByRole("heading", { name: panelHeading(todayDate) })).toBeVisible();
    // The venue opened up to two hours ago and closes at 23:59, so the day is live RIGHT NOW: the pass
    // framing renders, not the "Closed for today" evening state.
    await expect(
      page
        .getByText("Your pass covers the whole day — come any time while they're open.", {
          exact: true,
        })
        .filter({ visible: true }),
    ).toBeVisible();
    // NOT filtered, and deliberately: an ABSENCE claim. A streaming duplicate cannot turn 0 into
    // anything, and `.filter({ visible: true })` here would downgrade "this state is not rendered" to
    // "this state is not rendered VISIBLY" — the one direction that is a real weakening. Every
    // `toHaveCount(0)` in this file is left bare for the same reason.
    await expect(page.getByText("Closed for today", { exact: true })).toHaveCount(0);

    // ONE pass — the stepper's own reset value whenever a date is picked (pass-stepper.tsx), asserted
    // rather than clicked so the case measures the shipped default a walk-in booker actually gets.
    await expect(
      page.getByText("How many passes?", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(page.locator("#requested-passes").filter({ visible: true })).toHaveValue("1");

    const bookBtn = page.getByRole("button", { name: "Book this space" });
    await expect(bookBtn).toBeEnabled();
    await bookBtn.click();

    // ── The reserve page for a SAME-DAY pass: a real pending hold, minted minutes after the venue opened. ─
    await page.waitForURL(/\/book\?hold=/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /confirm and pay/i })).toBeVisible();

    // NOT the hold-expired interstitial. Before the `expires_at` divergence in createOpenCapacityHold this
    // is precisely what a same-day claim would have rendered — the hold would lapse at the instant it was
    // minted, because the pass's `starts_at` is the venue's OPENING instant and it is already in the past.
    await expect(page.getByRole("heading", { name: /your hold expired/i })).toHaveCount(0);
    await expect(page.getByText(/We released the slot/i)).toHaveCount(0);

    // The PAYABLE summary: the per-person run line (OC-08 — priced per head, no duration term), a Total,
    // and the live hold countdown.
    //
    // AMENDED BY PLAN 12-11 (D-50 / BFLOW-06). The ITEMISED lines — including this per-person run line —
    // now sit inside `PriceDisclosure`, and Radix UNMOUNTS a closed collapsible's content, so the run
    // line is genuinely absent until the booker asks how the price was built. That is the requirement,
    // not a regression: what may never collapse is the TOTAL, which is asserted below and is outside
    // the region. The trigger is pressed here rather than the assertion being weakened, because the
    // claim OC-08 makes is about the run line's WORDING — that a pass is priced per head with no
    // duration term — and that claim is only checkable against the line itself.
    await page.getByRole("button", { name: /Price details/ }).click();
    await expect(
      page.getByText(/₱[\d,]+\.\d{2}\/person × 1 pass/).filter({ visible: true }),
    ).toBeVisible();
    // AMENDED, the same way and for the same measured reason as `search-and-book.spec.ts`'s copy of
    // this line. The account under it was right — checkout renders the word `Total` TWICE since 12-11,
    // the breakdown's label and the sticky confirm bar's, the latter `lg:hidden` at this viewport —
    // and the measurement agrees exactly: total=2, VISIBLE=1. That is an invariant worth asserting, so
    // this counts the visible ones instead of stepping around them with `.first()`, which would have
    // passed just as happily on a second VISIBLE `Total` (the failure `lg:hidden` exists to prevent).
    // The bar's own copy is asserted, with its amount, by `e2e/mobile-booker-path.spec.ts` at the width
    // where it is the surface a booker reads.
    await expect(
      page.getByText("Total", { exact: true }).filter({ visible: true }),
      "exactly one `Total` is reachable at this width — the sticky confirm bar's copy is lg:hidden",
    ).toHaveCount(1);
    // AMENDED BY PLAN 12-03 (D-49): the countdown moved from the booking rail to the checkout HEADER,
    // where it is a clock glyph plus mm:ss in a 96px reservation and has no room for a sentence. The
    // rail keeps the reassurance without the digits; both halves are asserted where they now live. A
    // drop-in hold reaches the same header through the same context as an exclusive one, which is the
    // property this line is now checking.
    await expect(
      page.getByText(/We.re holding this for you while you review/i).filter({ visible: true }),
    ).toBeVisible();
    // NOT filtered: `site-header` is composed in the route's LAYOUT, outside the page's Suspense
    // boundary, so it never enters the streaming buffer (measured — siteHeader=false on 8/8 loads),
    // and `getByRole` is immune regardless because the buffer is `hidden` and out of the a11y tree.
    await expect(page.getByTestId("site-header").getByRole("timer")).toContainText(/\d+:\d{2}/);

    // …and the terminal control is PRESENT and ENABLED. This is the frontier of the browser proof.
    const confirm = page.getByRole("button", { name: /confirm & pay/i });
    await expect(confirm).toBeVisible();
    await expect(confirm).toBeEnabled();

    // (d) The click is DELIBERATELY NOT MADE. Pressing it would mint a live `sk_test_` PayMongo checkout
    // session from an automated run; the spec's documented money-path boundary stands, and the human
    // walkthrough (09-16) plus the integration gate named above are what cover the far side of it.
  });
});
