// SEARCH-01..05 + BOOK-01..03 · SC#1–SC#4 — the whole Phase-4 promise lived once, end-to-end.
//
// A single Playwright spec that drives the REAL app against the dev Postgres (public schema — the same DB
// the Playwright webServer's dev app reads):
//   search (`/`) → apply a filter → click a result card → open the listing → pick a venue-tz window →
//   `Book this space` → land on the reserve page (venue-tz window + ₱ price breakdown + live "Held for
//   mm:ss" countdown) → `Confirm booking` → reach the durable confirmation (`FIT-XXXXXXXX`) → refresh and
//   confirm it persists. Plus the abandoned-hold EXPIRY UX: place a hold, force its `expires_at` into the
//   past (the graceful-expiry path — never a real 15-min sleep), reload, and assert the calm
//   `Your hold expired` state with a recovery CTA (D-44 — never a red error).
//
// Mirrors e2e/availability.spec.ts for the seed/teardown + venue-tz day navigation, and
// e2e/login-persistence.spec.ts for the signed-in `canBook` booker (Book is gated, D-41 — a signup with
// intent "book" maps to canBook=true server-side, so the booker can reserve without the activate detour).
//
// Serial: both tests share ONE seeded bookable listing + ONE signed-in booker (storageState captured in
// beforeAll). The happy path books 5–7 PM; the expiry case books a DISJOINT window (8–10 AM) so the two
// never contend for the same slot. Unique randomUUID ids per run + cascade-correct teardown (bookings
// FIRST — booker_id is ON DELETE RESTRICT) keep repeated runs from colliding or leaving rows behind.

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

const BASE = "http://localhost:3000";
const VENUE_TZ = "Asia/Manila";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as tests/helpers/db.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

// ---- Unique ids / auth per run ---------------------------------------------
const hostId = `e2e_sb_host_${randomUUID()}`;
const listingId = `e2e_sb_listing_${randomUUID()}`;
const bookerEmail = `e2e.searchbook.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
const bookerPassword = "averylongpassword";

// The booker's captured session (set in beforeAll) — re-applied to each test's context so every test runs
// as the signed-in canBook booker without a per-test signup. Using addCookies (not test.use storageState)
// avoids the manual-context inheritance that would make beforeAll's own newContext read a not-yet-written file.
let bookerState: Awaited<ReturnType<BrowserContext["storageState"]>>;

// A distinctive title + a space type NONE of the other seeds use (tennis_court), so the category filter
// narrows to EXACTLY this listing — the search step is deterministic regardless of other dev-DB data.
const LISTING_TITLE = "E2E SearchBook Tennis Court";
const LISTING_CITY = "Makati";
const HOURLY_RATE_CENTS = 45000;
const DAY_RATE_CENTS = 280000;

// Listing at Makati CBD; the origin sits ~1.1 km north so the distance line renders a real, in-radius value.
const LISTING_LAT = 14.5547;
const LISTING_LNG = 121.0244;
const ORIGIN_LAT = 14.5647;
const ORIGIN_LNG = 121.0244;

// ---- Target day: +3 days out (future, within the 90-day horizon), venue-local ----------------
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

async function seedUser(id: string, canHost: boolean): Promise<void> {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${id}, ${"E2E SB Host"}, ${`${id}@example.com`}, ${true},
      ${"Ezra"}, ${canHost}, ${false}, now(), now()
    )
  `;
}

async function seedListing(): Promise<void> {
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${LISTING_TITLE},
      ${"A bright indoor tennis court with a sprung surface and net."}, ${"tennis_court"}::space_type,
      ${"1 Real Street"}, ${LISTING_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${LISTING_LNG}, ${LISTING_LAT}), 4326), ${false}, ${8}, ${1}, ${VENUE_TZ},
      ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS}, ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      now(), now(), now()
    )
  `;
  // Three cover-first photos so the search + listing cards render (broken src is fine — the <img> exists).
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
      (${randomUUID()}, ${listingId}, ${"fitout/e2e-sb/0"}, ${"https://example.com/e2e-sb-0.jpg"}, ${0}),
      (${randomUUID()}, ${listingId}, ${"fitout/e2e-sb/1"}, ${"https://example.com/e2e-sb-1.jpg"}, ${1}),
      (${randomUUID()}, ${listingId}, ${"fitout/e2e-sb/2"}, ${"https://example.com/e2e-sb-2.jpg"}, ${2})
  `;
  // Weekly hours 06:00–21:00 every day so the target day is bookable across morning + evening.
  for (let dow = 0; dow < 7; dow++) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${randomUUID()}, ${listingId}, ${dow}, ${"06:00"}, ${"21:00"}, now())
    `;
  }
  // A matching activity tag (D-35) so the type-OR-tag category vocabulary has real supply.
  await sql`INSERT INTO "listing_activity_tag" (listing_id, tag) VALUES (${listingId}, ${"tennis"})`;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  // (1) Seed the bookable listing: host email-verified + an activated payout wallet → deriveBookable true
  // (the merchant.activated webhook is Phase 2; seed the host_payout row directly, as availability.spec does).
  await seedUser(hostId, true);
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
  await seedListing();

  // (2) Sign up the booker via the UI (intent "book" → canBook=true server-side, D-41) and capture the
  // session cookie as storageState so BOTH tests run as an authenticated canBook booker.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Booker");
  await page.getByLabel("Email").fill(bookerEmail);
  await page.getByLabel("Password").fill(bookerPassword);
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 20_000 });
  bookerState = await ctx.storageState();
  await ctx.close();
});

test.afterAll(async () => {
  // Bookings FIRST (booker_id is ON DELETE RESTRICT), then the host (cascades listing/photos/hours/tags),
  // then the signed-up booker. Order is load-bearing — mirrors availability.spec.ts:134-141.
  await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
  await sql.end();
});

/** Apply the captured booker session cookies to this test's context (Book is gated on a canBook session). */
async function loginAsBooker(page: Page): Promise<void> {
  await page.context().addCookies(bookerState.cookies);
}

/** Navigate the venue-tz calendar to the seeded target day (advancing one month if it's next month). */
async function selectTargetDay(page: Page): Promise<void> {
  if (crossesMonth) {
    await page.getByRole("button", { name: /next month/i }).click();
  }
  // Scope to the enabled, in-month occurrence so the click never lands on a showOutsideDays duplicate.
  const day = page
    .getByRole("button", { name: targetDayLabel })
    .and(page.locator("td:not([data-outside='true']) button"))
    .and(page.locator("button:not([disabled])"));
  await day.first().click();
}

/** Open the listing, navigate to the target day, and pick the [startLabel, endLabel] hourly run. */
async function pickWindow(page: Page, startLabel: string, endLabel: string): Promise<void> {
  await expect(page.getByText(/Times shown in .*Makati.*\(GMT\+8\)/i)).toBeVisible();
  await selectTargetDay(page);
  await page.getByRole("button", { name: startLabel, exact: true }).click(); // start anchor
  await page.getByRole("button", { name: endLabel, exact: true }).click(); // end → fills the run
}

test.describe("full search → book → confirm flow + expiry UX (SC#1–SC#4)", () => {
  test("search → filter → card → listing → Book → reserve → Confirm → durable confirmation", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsBooker(page);

    // ── Search home replaced the Next.js scaffold (D-29). ──────────────────────────────────────────────
    await page.goto(`${BASE}/`);
    await expect(page.getByRole("heading", { name: /find a space to play/i })).toBeVisible();
    await expect(page.locator("#search-submit")).toBeVisible();

    // ── Apply a filter through the SearchBar (a Select + Search — no network geocoding). ────────────────
    await page.locator("#search-category").click();
    await page.getByRole("option", { name: "Tennis court" }).click();
    await page.locator("#search-submit").click();
    await page.waitForURL(/category=tennis_court/);

    // The result card renders photo + name + ₱ price (only the tennis listing matches the filter, SEARCH-05).
    await expect(page.getByRole("img", { name: LISTING_TITLE })).toBeVisible();
    await expect(page.getByRole("heading", { name: LISTING_TITLE })).toBeVisible();
    await expect(page.getByText(/₱[\d,]+(\.\d+)?\/hr/).first()).toBeVisible();

    // A location-origin search shows the distance line (SEARCH-03 radius + SEARCH-05 distance) — deterministic.
    await page.goto(
      `${BASE}/?lat=${ORIGIN_LAT}&lng=${ORIGIN_LNG}&category=tennis_court&radius=25`,
    );
    await expect(page.getByText(/\d+(\.\d+)?\s*km away/i)).toBeVisible();

    // ── Click the card → the public listing detail page. ───────────────────────────────────────────────
    await page.getByRole("link", { name: new RegExp(LISTING_TITLE) }).click();
    await page.waitForURL(new RegExp(`/listings/${listingId}`));

    // ── Pick a venue-tz window (5–7 PM) and Book. ──────────────────────────────────────────────────────
    await pickWindow(page, "5:00 PM", "6:00 PM"); // run spans 5:00 PM – 7:00 PM (end = the 6 PM slot's end)
    const bookBtn = page.getByRole("button", { name: "Book this space" });
    await expect(bookBtn).toBeEnabled();
    await bookBtn.click();

    // ── Reserve page: the placeHold POST minted the pending hold and redirected here (?hold=<id>). ──────
    await page.waitForURL(/\/book\?hold=/);
    await expect(page.getByRole("heading", { name: /review and book/i })).toBeVisible();
    // Venue-tz window + tz note (SC#2), the frozen ₱ breakdown, and the live "Held for mm:ss" countdown.
    await expect(page.getByText(/\(GMT\+8\)/i).first()).toBeVisible();
    await expect(page.getByText(/5:00\s*PM\s*[–-]\s*7:00\s*PM/i)).toBeVisible();
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    await expect(page.getByText(/₱[\d,]+/).first()).toBeVisible();
    await expect(page.getByText(/Held for/i)).toBeVisible();
    await expect(page.getByRole("timer")).toContainText(/\d+:\d{2}/);
    await expect(page.getByText(/You won.t be charged yet/i)).toBeVisible();

    // ── Confirm → the durable confirmation page. ───────────────────────────────────────────────────────
    await page.getByRole("button", { name: /confirm booking/i }).click();
    await page.waitForURL(new RegExp(`/bookings/`));
    await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();
    await expect(page.getByText(/booking reference/i)).toBeVisible();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    const reference = await page.getByText(/FIT-[0-9A-Z]{8}/).textContent();
    expect(reference).toMatch(/FIT-[0-9A-Z]{8}/);

    // ── Durable across a refresh (D-43) — a pure RSC read of persisted state, no ephemeral hold. ────────
    await page.reload();
    await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();
    await expect(page.getByText(reference!.trim(), { exact: true })).toBeVisible();
  });

  test("abandoned hold → the calm 'Your hold expired' state with a recovery CTA (D-44)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsBooker(page);

    // Place a fresh hold on a DISJOINT morning window (8–10 AM) so it never contends with the 5–7 PM confirm.
    await page.goto(`${BASE}/listings/${listingId}`);
    await pickWindow(page, "8:00 AM", "9:00 AM"); // run spans 8:00 AM – 10:00 AM
    const bookBtn = page.getByRole("button", { name: "Book this space" });
    await expect(bookBtn).toBeEnabled();
    await bookBtn.click();

    await page.waitForURL(/\/book\?hold=/);
    // Sanity: an ACTIVE hold shows the countdown before we force it to expire.
    await expect(page.getByText(/Held for/i)).toBeVisible();

    const holdId = new URL(page.url()).searchParams.get("hold");
    expect(holdId).toBeTruthy();

    // Force the hold past its TTL (the server is the sole expiry authority — reload re-reads expires_at).
    // This is the graceful-expiry path without a real 15-minute wait.
    await sql`UPDATE booking SET expires_at = now() - interval '1 minute' WHERE id = ${holdId}`;
    await page.reload();

    // The reserve content degrades to the calm expiry interstitial: "Your hold expired" + a recovery CTA.
    await expect(page.getByRole("heading", { name: /your hold expired/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to availability/i })).toBeVisible();
    // Occupancy/expiry is a NORMAL state (D-44): the interstitial is announced via role="status" (calm),
    // NOT a role="alert" red error — assert the expiry copy lives inside that status region.
    await expect(
      page.getByRole("status").filter({ hasText: /your hold expired/i }),
    ).toBeVisible();
  });
});
