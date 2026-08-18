// SEARCH-01..05 + BOOK-01..03 · SC#1–SC#4 — the whole Phase-4 promise, driven against the REAL app.
//
// A single Playwright spec that drives the dev app against the dev Postgres (public schema — the same DB
// the Playwright webServer's dev app reads):
//   search (`/`) → apply a filter → click a result card → open the listing → pick a venue-tz window →
//   `Book this space` → land on the LIVE reserve page (venue-tz window + ₱ price breakdown + the live
//   mm:ss countdown, which plan 12-03 moved into the checkout HEADER — see the amended assertions
//   below). The seeded listing is `instant` (the host is payouts-enabled), so `Book this space`
//   mints a 15-min hold and redirects to `/book?hold=<id>` — the reserve page is the automatable END of the
//   instant flow. The tail past it (`Confirm booking` → a PayMongo HOSTED CHECKOUT → the durable
//   confirmation) CANNOT be driven from Playwright, so the durable-confirmation coverage comes from a
//   DIRECTLY-SEEDED `confirmed` booking (D-43) — exactly as e2e/cancel.spec.ts does: a separate test loads
//   `/bookings/<id>`, asserts the `FIT-XXXXXXXX` reference + the `Confirmed` badge, and reloads to prove the
//   read is a durable RSC read of persisted state. Plus the abandoned-hold EXPIRY UX: place a hold, force
//   its `expires_at` into the past (the graceful-expiry path — never a real 15-min sleep), reload, and assert
//   the calm `Your hold expired` state with a recovery CTA (D-44 — never a red error).
//
// Mirrors e2e/availability.spec.ts for the seed/teardown + venue-tz day navigation, and
// e2e/login-persistence.spec.ts for the signed-in `canBook` booker (Book is gated, D-41 — a signup with
// intent "book" maps to canBook=true server-side, so the booker can reserve without the activate detour).
//
// Serial: the tests share ONE seeded instant-bookable listing + ONE signed-in booker (storageState captured
// in beforeAll) + ONE directly-seeded confirmed booking. The live-hold test books 5–7 PM; the expiry case
// books a DISJOINT window (8–10 AM) so the two never contend for the same slot; the confirmed seed sits a
// few hours out so it derives as `confirmed`, NOT `completed` (D-102), and never contends with the +3-day
// windows. Unique randomUUID ids per run + cascade-correct teardown (bookings FIRST — booker_id is ON DELETE
// RESTRICT) keep repeated runs from colliding or leaving rows behind.

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
// The directly-seeded `confirmed` booking (Task 3 / D-43) — its own id so teardown + the detail-page URL
// both address it precisely (it is also swept by the listing-scoped booking DELETE in afterAll).
const confirmedBookingId = `e2e_sb_booking_${randomUUID()}`;
const bookerEmail = `e2e.searchbook.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
const bookerPassword = "averylongpassword";

// The booker's captured session (set in beforeAll) — re-applied to each test's context so every test runs
// as the signed-in canBook booker without a per-test signup. Using addCookies (not test.use storageState)
// avoids the manual-context inheritance that would make beforeAll's own newContext read a not-yet-written file.
let bookerState: Awaited<ReturnType<BrowserContext["storageState"]>>;
// The signed-up booker's DB id — resolved from their email after the UI signup (as e2e/cancel.spec.ts does),
// so the confirmed booking can be seeded against the real row Better Auth created.
let bookerId: string;

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
      ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS}, ${"php"}, ${"instant"}::booking_mode, ${"published"}::listing_status,
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

// The confirmed seed sits CONFIRMED_HOURS_TO_START hours out (a clean 1-hour window at the listing's hourly
// rate) so deriveDisplayStatus reads it as `confirmed`, NOT the past-endsAt `completed` (D-102). A few hours
// from now can never collide with the +3-day live-hold / expiry windows the other tests use.
const CONFIRMED_HOURS_TO_START = 10;
const CONFIRMED_SERVICE_FEE_CENTS = 4500; // ~10% of the 1-hour space price — a realistic frozen fee split.

/**
 * A CONFIRMED, paid-looking booking on THIS spec's seeded listing + booker (D-43). Seeded DIRECTLY rather
 * than paid through PayMongo because a hosted checkout cannot be driven from Playwright (see the header and
 * e2e/cancel.spec.ts). It carries a `payment_id` + a refundable `gcash` rail so the row looks exactly like a
 * real confirmed booking; its future window makes it derive as `confirmed`, never `completed`.
 */
async function seedConfirmedBooking(): Promise<void> {
  await sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
      currency, payment_id, payment_method, created_at
    ) VALUES (
      ${confirmedBookingId}, ${listingId}, ${1}, ${bookerId},
      now() + make_interval(hours => ${CONFIRMED_HOURS_TO_START}),
      now() + make_interval(hours => ${CONFIRMED_HOURS_TO_START + 1}),
      ${"confirmed"}::booking_status, ${"instant"}::booking_mode,
      ${"standard"}::cancellation_policy, ${HOURLY_RATE_CENTS}, ${CONFIRMED_SERVICE_FEE_CENTS},
      ${HOURLY_RATE_CENTS + CONFIRMED_SERVICE_FEE_CENTS}, ${"php"},
      ${`pay_e2e_${randomUUID()}`}, ${"gcash"}, now()
    )
  `;
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

  // (3) Resolve the booker's real DB id (Better Auth wrote the row during the UI signup) and seed a durable
  // `confirmed` booking against it — the D-43 durable-confirmation coverage (Task 3) that the un-automatable
  // PayMongo tail can no longer provide.
  const [row] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${bookerEmail}`;
  bookerId = row.id;
  await seedConfirmedBooking();
});

test.afterAll(async () => {
  // Bookings FIRST (booker_id is ON DELETE RESTRICT), then the host (cascades listing/photos/hours/tags),
  // then the signed-up booker. Order is load-bearing — mirrors availability.spec.ts:134-141. Any notification
  // rows for this listing's bookings are cleared first (defensive; none are emitted for directly-seeded rows).
  await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${listingId})`;
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

test.describe("search → book → live hold + durable confirmation + expiry UX (SC#1–SC#4)", () => {
  test("search → filter → card → listing → Book → live instant hold on the reserve page (SC#1/#2/#4)", async ({
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
    // Venue-tz window + tz note (SC#2), the frozen ₱ breakdown, and the live countdown.
    await expect(page.getByText(/\(GMT\+8\)/i).first()).toBeVisible();
    await expect(page.getByText(/5:00\s*PM\s*[–-]\s*7:00\s*PM/i)).toBeVisible();
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    await expect(page.getByText(/₱[\d,]+/).first()).toBeVisible();
    // AMENDED BY PLAN 12-03 (D-49). This line read `getByText(/Held for/i)` and went red on a correct
    // tree: the countdown moved out of the booking rail and into the CHECKOUT HEADER, where it is a
    // clock glyph plus mm:ss inside a 96px reservation and has no room for a sentence. The rail keeps
    // the words and loses the digits, so both halves of the old assertion still exist — they are just
    // in two places now, and asserting each where it actually lives is what makes this a real check
    // rather than a copy pin. The `role="timer"` line below is unchanged and is still the digits.
    await expect(page.getByText(/We.re holding this for you while you review/i)).toBeVisible();
    await expect(
      page.getByTestId("site-header").getByRole("timer"),
      "the countdown is not in the checkout header (D-49 / SHELL-03)",
    ).toBeVisible();
    await expect(page.getByRole("timer")).toContainText(/\d+:\d{2}/);
    // The terminal action + its HONEST pre-charge reassurance (D-57): the current reserve page shows a
    // `Confirm & pay` CTA and "You'll pay {total} now — cards, GCash, Maya, or QR Ph." — NOT the stale
    // "you won't be charged yet" the never-run Phase-4 draft asserted, which contradicts the live copy.
    await expect(page.getByRole("button", { name: /confirm & pay/i })).toBeVisible();
    await expect(page.getByText(/You.ll pay .* now.*cards, GCash, Maya, or QR ?Ph/i)).toBeVisible();

    // The reserve page is where the automatable instant flow ENDS. Clicking `Confirm booking` from here now
    // opens a PayMongo HOSTED CHECKOUT that Playwright cannot complete (see the header + e2e/cancel.spec.ts),
    // so the durable-confirmation assertions live in the next test against a directly-seeded confirmed booking
    // (D-43) — proving the same persisted-confirmation UX without depending on a hosted-checkout redirect.
  });

  test("directly-seeded confirmed booking → the durable confirmation, unchanged across a refresh (D-43)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsBooker(page);

    // The confirmation is a pure RSC read of persisted booking state (D-43) — no ephemeral hold, no client
    // countdown — so it is reachable directly and must survive a reload. Seeded confirmed in beforeAll because
    // a PayMongo hosted checkout can't be driven from Playwright; this is exactly e2e/cancel.spec.ts's pattern.
    await page.goto(`${BASE}/bookings/${confirmedBookingId}`);

    // The one terminal --success surface: the "Booking confirmed" heading, the "Booking reference" label, the
    // shared `Confirmed` status badge (icon + text, never colour-only), and the FIT-XXXXXXXX reference.
    await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();
    await expect(page.getByText(/booking reference/i)).toBeVisible();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    const reference = await page.getByText(/FIT-[0-9A-Z]{8}/).textContent();
    expect(reference).toMatch(/FIT-[0-9A-Z]{8}/);

    // ── Durable across a refresh (D-43) — the same reference re-renders from persisted state, no hold. ──
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
    // Sanity: an ACTIVE hold shows the countdown before we force it to expire. AMENDED BY PLAN 12-03
    // (D-49) for the same reason as the line above: the digits are in the checkout HEADER now, so the
    // sanity check is the timer's presence there rather than the rail sentence that used to accompany
    // it. `role="timer"` is the accessible query and stays one.
    await expect(page.getByTestId("site-header").getByRole("timer")).toContainText(/\d+:\d{2}/);

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
