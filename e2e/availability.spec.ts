// AVAIL-03/04/05 · SC#2 — the booker availability calendar on the public listing page.
//
// Clones e2e/public-listing.spec.ts: seeds directly into the dev Postgres (public schema — the same DB
// the Playwright webServer's dev app reads), then asserts WITHOUT logging in. Two listings are seeded:
//   - a BOOKABLE listing (host email-verified + a host_payout row with payouts_enabled → deriveBookable
//     true) with weekly hours 06:00–21:00, an availability_block over one hour, and one confirmed
//     booking over another hour on a single-unit listing (so that hour is fully booked).
//   - a NOT-PAYABLE listing (a second host with NO host_payout row → deriveBookable false) with the same
//     weekly hours, so the calendar renders read-only with the "Not bookable yet" rail.
//
// Assertions (venue tz = Asia/Manila, GMT+8):
//   1. tz note "Times shown in … (GMT+8)" is visible on the public page (SC#2).
//   2. the booked hour and the blocked hour render disabled (aria-disabled) and are unselectable (AVAIL-05).
//   3. selecting two adjacent available hours shows the selection summary (date · time range) in the rail.
//   4. the not-payable listing shows the calendar but slots are disabled + a "Not bookable yet" affordance.
//
// The webhook that sets payouts_enabled is Phase 2 / out of scope here, so the bookable case seeds the
// host_payout row directly. Everything is torn down in afterAll with unique ids per run (no collisions).

import { test, expect } from "@playwright/test";
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
const hostBookableId = `e2e_avail_hostA_${randomUUID()}`;
const hostNoPayoutId = `e2e_avail_hostB_${randomUUID()}`;
const bookerId = `e2e_avail_booker_${randomUUID()}`;
const bookableListingId = `e2e_avail_pub_${randomUUID()}`;
const notPayableListingId = `e2e_avail_nopay_${randomUUID()}`;

// ---- Target day: +3 days out (in the future, within the 90-day horizon), venue-local ----------------
const inTz = tz(VENUE_TZ);
const now = new Date();
const initMonth = Number(format(now, "M", { in: inTz }));
const initYear = Number(format(now, "yyyy", { in: inTz }));
const base = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
const targetYear = Number(format(base, "yyyy", { in: inTz }));
const targetMonth = Number(format(base, "M", { in: inTz })); // 1-based
const targetDay = Number(format(base, "d", { in: inTz }));
const targetMonthName = format(base, "MMMM", { in: inTz }); // e.g. "July"
const crossesMonth = targetMonth !== initMonth || targetYear !== initYear;

/** A UTC instant for `hour:00` venue-local on the target day (normalized through the epoch). */
function utcAt(hour: number): Date {
  return new Date(new TZDate(targetYear, targetMonth - 1, targetDay, hour, 0, 0, VENUE_TZ).getTime());
}

/** react-day-picker default day-button aria-label is "EEEE, MMMM do, yyyy" — match by month/day/year. */
const targetDayLabel = new RegExp(
  `${targetMonthName}\\s+${targetDay}(st|nd|rd|th)?,?\\s+${targetYear}`,
);

async function seedUser(id: string, emailVerified: boolean) {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${id}, ${"E2E Avail User"}, ${`${id}@example.com`}, ${emailVerified},
      ${"Ezra"}, ${true}, ${true}, now(), now()
    )
  `;
}

async function seedListing(id: string, hostId: string, title: string) {
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${id}, ${hostId}, ${title},
      ${"A calm, mirrored studio with mats, props, and a sound system."}, ${"yoga_studio"}::space_type,
      ${"123 Real Street"}, ${"Makati"}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0345}, ${14.5679}), 4326), ${false}, ${12}, ${1}, ${VENUE_TZ},
      ${50000}, ${300000}, ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      now(), now(), now()
    )
  `;
  // Three cover-first photos so the gallery renders (not asserted, keeps the page realistic).
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
      (${randomUUID()}, ${id}, ${"fitout/e2e/0"}, ${"https://example.com/e2e-0.jpg"}, ${0}),
      (${randomUUID()}, ${id}, ${"fitout/e2e/1"}, ${"https://example.com/e2e-1.jpg"}, ${1}),
      (${randomUUID()}, ${id}, ${"fitout/e2e/2"}, ${"https://example.com/e2e-2.jpg"}, ${2})
  `;
  // Weekly hours 06:00–21:00 every day so any selected day shows availability.
  for (let dow = 0; dow < 7; dow++) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${randomUUID()}, ${id}, ${dow}, ${"06:00"}, ${"21:00"}, now())
    `;
  }
}

test.beforeAll(async () => {
  await seedUser(hostBookableId, true);
  await seedUser(hostNoPayoutId, true);
  await seedUser(bookerId, true);

  // The bookable host has an activated payout wallet → deriveBookable true (the webhook is Phase 2).
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostBookableId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;

  await seedListing(bookableListingId, hostBookableId, "Sunlit Yoga Studio (bookable)");
  await seedListing(notPayableListingId, hostNoPayoutId, "Twilight Studio (not payable)");

  // On the BOOKABLE listing's target day: one confirmed booking (08:00–09:00, unit 1 → that hour is
  // fully booked on a single-unit listing) and one whole-listing block (10:00–11:00).
  await sql`
    INSERT INTO "booking" (id, listing_id, unit, booker_id, starts_at, ends_at, status, created_at)
    VALUES (${randomUUID()}, ${bookableListingId}, ${1}, ${bookerId}, ${utcAt(8)}, ${utcAt(9)}, ${"confirmed"}::booking_status, now())
  `;
  await sql`
    INSERT INTO "availability_block" (id, listing_id, unit, starts_at, ends_at, reason, created_at)
    VALUES (${randomUUID()}, ${bookableListingId}, ${null}, ${utcAt(10)}, ${utcAt(11)}, ${"Maintenance"}, now())
  `;
});

test.afterAll(async () => {
  // Remove bookings first (booker_id is ON DELETE RESTRICT), then the users (listings cascade from host).
  await sql`DELETE FROM booking WHERE listing_id = ${bookableListingId}`;
  await sql`DELETE FROM "user" WHERE id = ${hostBookableId}`;
  await sql`DELETE FROM "user" WHERE id = ${hostNoPayoutId}`;
  await sql`DELETE FROM "user" WHERE id = ${bookerId}`;
  await sql.end();
});

/** Navigate the venue-tz calendar to the seeded target day (advancing one month if it's next month). */
async function selectTargetDay(page: import("@playwright/test").Page) {
  if (crossesMonth) {
    await page.getByRole("button", { name: /next month/i }).click();
  }
  await page.getByRole("button", { name: targetDayLabel }).first().click();
}

test.describe("booker availability calendar (AVAIL-03/04/05, SC#2)", () => {
  test("bookable listing: venue-tz note, unselectable booked/blocked hours, consecutive selection", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const res = await page.goto(`${BASE}/listings/${bookableListingId}`);
    expect(res?.status(), "published listing returns 200").toBe(200);
    expect(page.url()).not.toContain("/login");

    // (1) SC#2 — the calendar always names the venue timezone, independent of the browser tz.
    await expect(page.getByRole("heading", { name: /availability/i })).toBeVisible();
    await expect(page.getByText(/Times shown in .*Manila.*\(GMT\+8\)/i)).toBeVisible();

    await selectTargetDay(page);

    // The two adjacent early hours are available (booking is 08:00, block is 10:00).
    const sixAm = page.getByRole("button", { name: "6:00 AM", exact: true });
    const sevenAm = page.getByRole("button", { name: "7:00 AM", exact: true });
    await expect(sixAm).toBeVisible();

    // (2) AVAIL-05 — the booked hour and the blocked hour are aria-disabled + unselectable, not red.
    const bookedHour = page.getByRole("button", { name: /8:00 AM.*Unavailable/i });
    const blockedHour = page.getByRole("button", { name: /10:00 AM.*Unavailable/i });
    await expect(bookedHour).toHaveAttribute("aria-disabled", "true");
    await expect(bookedHour).toBeDisabled();
    await expect(blockedHour).toHaveAttribute("aria-disabled", "true");

    // (3) AVAIL-04 — select two consecutive available hours → the rail selection summary appears.
    await sixAm.click();
    await sevenAm.click();
    await expect(sixAm).toHaveAttribute("aria-pressed", "true");
    // 06:00 + 07:00 → the run spans 6:00 AM – 8:00 AM (end = the second hour's end).
    await expect(page.getByText(/6:00 AM\s*[–-]\s*8:00 AM/i)).toBeVisible();
  });

  test("published-but-not-payable listing: calendar renders read-only, slots not selectable", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const res = await page.goto(`${BASE}/listings/${notPayableListingId}`);
    expect(res?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: /availability/i })).toBeVisible();
    await expect(page.getByText(/Times shown in .*Manila.*\(GMT\+8\)/i)).toBeVisible();

    // The "Not bookable yet" affordance is shown (deriveBookable false — no host_payout row).
    await expect(page.getByRole("button", { name: /not bookable yet/i })).toBeVisible();

    // The real availability is still SHOWN, but every slot is read-only (the group is disabled).
    await selectTargetDay(page);
    await expect(page.getByRole("button", { name: "6:00 AM", exact: true })).toBeDisabled();
  });
});
