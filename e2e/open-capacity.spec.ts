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

import { test, expect, type Page } from "@playwright/test";
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

const CAP = 3; // → lowStockThreshold(3) = clamp(floor(3/2), 1, 5) = 1, so `low` fires at exactly 1 left.
const PER_HEAD_PRICE_CENTS = 35000;
const HOURLY_RATE_CENTS = 47000;
const DAY_RATE_CENTS = 290000;
const OPEN_HOUR = 6; // 06:00 → "6:00 AM"
const CLOSE_HOUR = 22; // 22:00 → "10:00 PM"

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
};

async function seedListing({
  id,
  title,
  occupancyMode,
  perHeadPriceCents,
  maxOccupancy,
}: SeedListingArgs): Promise<void> {
  // Both rate columns are set on BOTH listings on purpose — see the header. A drop-in listing that carried
  // NULL rates would let a fork keyed on the wrong thing (a null column instead of the persisted mode) pass.
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, cancellation_policy, status, published_at, created_at, updated_at
    ) VALUES (
      ${id}, ${hostId}, ${title},
      ${"A warm reformer studio with props, mats and a sprung floor."}, ${SPACE_TYPE}::space_type,
      ${"7 Real Street"}, ${CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0345}, ${14.5679}), 4326), ${false}, ${maxOccupancy}, ${1}, ${VENUE_TZ},
      ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS}, ${perHeadPriceCents}, ${occupancyMode}::occupancy_mode,
      ${"php"}, ${"instant"}::booking_mode, ${"standard"}::cancellation_policy,
      ${"published"}::listing_status, now(), now(), now()
    )
  `;
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
      (${randomUUID()}, ${id}, ${`fitout/e2e-open/${id}/0`}, ${"https://example.com/e2e-open-0.jpg"}, ${0}),
      (${randomUUID()}, ${id}, ${`fitout/e2e-open/${id}/1`}, ${"https://example.com/e2e-open-1.jpg"}, ${1}),
      (${randomUUID()}, ${id}, ${`fitout/e2e-open/${id}/2`}, ${"https://example.com/e2e-open-2.jpg"}, ${2})
  `;
  // 06:00–22:00 every weekday, so whichever weekday the clock-relative target dates land on is open.
  for (let dow = 0; dow < 7; dow++) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${randomUUID()}, ${id}, ${dow}, ${`${pad2(OPEN_HOUR)}:00`}, ${`${pad2(CLOSE_HOUR)}:00`}, now())
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

test.beforeAll(async () => {
  await seedUser(hostId, "E2E Open Host");
  await seedUser(bookerAId, "E2E Open Booker A");
  await seedUser(bookerBId, "E2E Open Booker B");
  await seedUser(bookerCId, "E2E Open Booker C");

  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
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
});

test.afterAll(async () => {
  // Bookings FIRST (booker_id is ON DELETE RESTRICT), then the host (cascades listings/photos/hours), then
  // the bookers. Order is load-bearing — mirrors availability.spec.ts:134-141.
  await sql`DELETE FROM booking WHERE listing_id IN (${openListingId}, ${exclusiveListingId})`;
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE id IN (${bookerAId}, ${bookerBId}, ${bookerCId})`;
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
      page.getByText("Pick a day — your pass is good any time they're open.", { exact: true }),
    ).toBeVisible();
    // SC#2 — the venue timezone is named regardless of the browser's.
    await expect(page.getByText(/Times shown in .*Makati.*\(GMT\+8\)/i)).toBeVisible();

    // ── THE ABSENCE IS THE PRIMARY SIGNAL (§ 2). The hour picker is not disabled, it is NOT MOUNTED. ──
    // SlotPicker's Radix ToggleGroup is the hour grid (slot-picker.tsx:156-161); "Book full day" is D-23's
    // whole-day shortcut. Neither exists in this mode, and neither does a single hour chip.
    await expect(page.getByRole("group", { name: "Available hours" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /book full day/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^\d{1,2}:00 (AM|PM)$/ })).toHaveCount(0);

    await pickDay(page, spotsDate);

    // The day panel: the date, the scarcity chip, the venue's opening hours, and the pass framing.
    await expect(page.getByRole("heading", { name: panelHeading(spotsDate) })).toBeVisible();
    await expect(page.getByText("Spots available", { exact: true })).toBeVisible();
    await expect(page.getByText("Open 6:00 AM – 10:00 PM · Makati time", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Your pass covers the whole day — come any time while they're open.", {
        exact: true,
      }),
    ).toBeVisible();
    // OC-06 — the head count is chosen PRE-hold, on this page.
    await expect(page.getByText("How many passes?", { exact: true })).toBeVisible();

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

  test("2 · spots decrement in a booker's browser because ANOTHER booker took passes (OPEN-02/04)", async ({
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

    // ── Meanwhile, Booker B reserves TWO of the three passes for that same date. ──
    await takePasses(spotsDate, bookerBId, 2);

    // ── Booker A reloads and looks at the same date again. The figure has MOVED, and it moved because
    // somebody else is coming: cap 3 − 2 heads = 1 remaining, and lowStockThreshold(3) = 1, so the exact
    // count is disclosed (`low`). A reload re-renders the page seeded on TODAY, so the date is re-picked —
    // this is a genuinely fresh server read of the same date, not a client-side re-render.
    await page.reload();
    await pickDay(page, spotsDate);
    await expect(chip).toHaveText("Only 1 left");
    await expect(page.getByText("Only 1 left", { exact: true })).toBeVisible();

    // The date is still bookable — a low count is scarcity, never a refusal.
    await expect(page.getByText("How many passes?", { exact: true })).toBeVisible();
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

    const card = page.locator(`a[href*="/listings/${openListingId}"]`);
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
    await expect(page.getByText("Spots available", { exact: true })).toBeVisible();

    await takePasses(soldDate, bookerAId, 1);
    await takePasses(soldDate, bookerBId, 1);
    await takePasses(soldDate, bookerCId, 1);

    // Re-read the SAME date from the server. The month grid's full-date set was fetched before the last three
    // passes were taken, so this is the OC-13 path the calendar exists to make rare but can never prevent: an
    // advisory picker offering a date the claim has since sold out. The answer is a calm panel, not an error.
    await pickDay(page, spotsDate); // move off the date so re-selecting it re-fetches
    await pickDay(page, soldDate);
    await expect(page.getByRole("heading", { name: panelHeading(soldDate) })).toBeVisible();
    await expect(page.getByText("Fully booked", { exact: true })).toBeVisible();
    await expect(
      page.getByText(`All ${CAP} passes for this day are taken. Try another day.`, { exact: true }),
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
    await expect(page.getByText("Only 1 left", { exact: true })).toBeVisible();
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
    await expect(page.locator(`a[href*="/listings/${exclusiveListingId}"]`)).toBeVisible();

    // The same query one date earlier still shows both: the drop-in listing is gone from the sold-out date
    // only, not from search.
    await page.goto(`${BASE}/?category=${SPACE_TYPE}&date=${isoOf(spotsDate)}&start=09:00&end=11:00`);
    await expect(page.locator(`a[href*="/listings/${openListingId}"]`)).toBeVisible();
    await expect(page.locator(`a[href*="/listings/${exclusiveListingId}"]`)).toBeVisible();
  });
});
