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
      hourly_rate_cents, day_rate_cents, currency, booking_mode, status, review_state, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${LISTING_TITLE},
      ${"A bright indoor tennis court with a sprung surface and net."}, ${"tennis_court"}::space_type,
      ${"1 Real Street"}, ${LISTING_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${LISTING_LNG}, ${LISTING_LAT}), 4326), ${false}, ${8}, ${1}, ${VENUE_TZ},
      ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS}, ${"php"}, ${"instant"}::booking_mode, ${"published"}::listing_status, ${"approved"}::listing_review_state,
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
  // …and an ops-APPROVED host_verification row — deriveBookable's SIXTH term (phase 18,
  // D-224). A host with NO row reads as 'unverified' and cannot sell, so without this the
  // listing seeded below is not bookable and this spec fails on a page that never renders.
  // ⚠ e2e does NOT run in CI (D-24) — only a hand run can catch a miss here.
  await sql`
    INSERT INTO "host_verification" (user_id, status, provider, created_at, updated_at)
    VALUES (${hostId}, ${"approved"}::host_verification_status, ${"manual"}, now(), now())
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * THE STREAMING-BUFFER RULE — why every `getByText` in this file is visibility-filtered
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * Assertions here kept going red with `strict mode violation: … resolved to 2 elements`, naming two
 * nodes with identical tags, identical classes and identical text. Every obvious reading is wrong and
 * each was ruled out: the FIT- reference is a SHA-256 of the booking id so two bookings cannot collide;
 * `bookings/[id]/page.tsx` has exactly ONE `{reference}`; there are no parallel or intercepting route
 * segments and no `template.tsx` anywhere under `src/app`.
 *
 * A MutationObserver installed before the reload's first script (full record in
 * `.planning/debug/resolved/confirmation-reference-duplicate.md`) showed what actually happens:
 *
 *   t=121 ms  ONE match, inside  <div hidden="" id="S:1">   ← React's out-of-order STREAMING buffer
 *   t=218 ms  TWO matches: the live one under `<main>`, plus that staged copy, still unreclaimed
 *   t=316 ms  ONE match, live only — the hidden staging div is gone
 *
 * `<div hidden id="S:N">` is where React parks a Suspense boundary's payload until it swaps it into
 * place. Every route in this flow has a `loading.tsx`, so every navigation in this file creates one.
 * When the client is warm the boundary is client-rendered from the flight payload BEFORE `$RC` reclaims
 * the buffer, and for roughly a tenth of a second the document holds both copies. The staged copy is
 * under the `hidden` attribute — display:none, out of the accessibility tree, off every screenshot — so
 * A USER NEVER SEES ANYTHING TWICE. Only a Playwright locator does, because locators match hidden
 * elements and strict mode counts them BEFORE `toBeVisible()` filters. In every overlapping sample the
 * browser console was empty: no hydration error, nothing recovered, nothing wrong with the page.
 *
 * `getByRole` IS IMMUNE (the staged subtree is out of the a11y tree — measured at exactly 1 on all 16
 * iterations of a run where `getByText` saw 2 on 15 of them). `getByText` IS NOT. That asymmetry is why
 * the heading assertions in this file never failed while the text ones did.
 *
 * ── THE TREATMENT, AND WHY IT IS A STRENGTHENING ────────────────────────────────────────────────────
 *
 * `.filter({ visible: true })` + `toHaveCount(n)` where the visible count is deterministic. The bare
 * `toBeVisible()` it replaces required exactly one TOTAL match; this requires exactly n VISIBLE matches,
 * so a genuine double render — two copies a person could actually read — still fails, which is the only
 * interesting half of the claim.
 *
 * REJECTED, with the measurements that rejected them:
 *   • `.first()` / a longer timeout — both stop asserting cardinality altogether. `.first()` is also
 *     unsafe on its own terms here: the staging div precedes the live tree in DOM order, so `.first()`
 *     can resolve to the hidden copy and then fail `toBeVisible()` with a misleading message.
 *   • A CSS scope — does not work. The staged copy carries its own `<main class="mx-auto w-full
 *     max-w-2xl …">`, so scoping to it measured 2 on 13 of 15 overlapping iterations and 1 on the rest.
 *
 * WHERE `.first()` SURVIVES it is because the VISIBLE count is genuinely greater than one and the number
 * itself is incidental; those two sites say so at the call site and keep `.filter({ visible: true })` in
 * front of `.first()` so the buffer can never be what `.first()` picks.
 *
 * MEASURED EXPOSURE (10 fresh contexts, warm dev server, shipped assertions run verbatim):
 *   :263 `km away`                 5/10 strict-mode violations   ← the site that was still live
 *   :341 reference after reload    8/10 with the bare assertion, 0/10 with the treatment
 *   :333 `booking reference`       1/10        :334 `Confirmed`  1/10
 *   every other site               0/10, but structurally identical — 0/10 is not evidence of safety
 *                                  when the worst site only fires half the time
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 */

/** Open the listing, navigate to the target day, and pick the [startLabel, endLabel] hourly run. */
async function pickWindow(page: Page, startLabel: string, endLabel: string): Promise<void> {
  // ONE visible tz note. Measured total=1 / visible=1 over 10 runs, and on a surface whose whole
  // subject is venue-local time a SECOND tz note would be a real defect worth failing on (SC#2).
  await expect(
    page.getByText(/Times shown in .*Makati.*\(GMT\+8\)/i).filter({ visible: true }),
    "the listing shows exactly one venue-tz note before a window is picked (SC#2)",
  ).toHaveCount(1);
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
    // CARRY-OVER, found while sweeping the other two specs: THE STREAMING-BUFFER RULE is not a
    // `getByText` rule. The buffer parked on `/` was measured to contain the SearchBar's own ids —
    // `search-category`, `search-date`, `search-start`, `search-end`, `search-price`, `search-radius`,
    // `search-submit` — so during the reveal this document holds two `#search-submit`s, and an id
    // locator matches hidden elements exactly as a text locator does. `.click()` enforces strict mode
    // too, so the two clicks below are exposed, not just the assertion. Observed at 0/8 here, which is
    // why they are treated on the structural fact rather than on the score: the worst site in this file
    // was also green 5 times out of 10.
    await expect(page.locator("#search-submit").filter({ visible: true })).toBeVisible();

    // ── Apply a filter through the SearchBar (a Select + Search — no network geocoding). ────────────────
    await page.locator("#search-category").filter({ visible: true }).click();
    await page.getByRole("option", { name: "Tennis court" }).click();
    await page.locator("#search-submit").filter({ visible: true }).click();
    await page.waitForURL(/category=tennis_court/);

    // The result card renders photo + name + ₱ price (only the tennis listing matches the filter, SEARCH-05).
    await expect(page.getByRole("img", { name: LISTING_TITLE })).toBeVisible();
    await expect(page.getByRole("heading", { name: LISTING_TITLE })).toBeVisible();
    // CONVERTED FROM `.first()`, and the conversion restores the claim the comment above makes.
    // SEARCH-05 is precisely "only the tennis listing matches the filter" — measured total=1 / visible=1
    // over 10 runs — so `.first()` was silencing the one assertion this line exists to make: with it, a
    // second result card carrying a second ₱/hr would have passed.
    await expect(
      page.getByText(/₱[\d,]+(\.\d+)?\/hr/).filter({ visible: true }),
      "the category filter narrows to exactly one result card, hence one ₱/hr price (SEARCH-05)",
    ).toHaveCount(1);

    // A location-origin search shows the distance line (SEARCH-03 radius + SEARCH-05 distance) — deterministic.
    await page.goto(
      `${BASE}/?lat=${ORIGIN_LAT}&lng=${ORIGIN_LNG}&category=tennis_court&radius=25`,
    );
    // ⚠ THE SITE THAT WAS STILL RED after the first pass at this bug fixed only the reference in the
    // next test. Bare, straight after a `goto` — 5 strict-mode violations in 10 warm runs, the worst in
    // the file. See THE STREAMING-BUFFER RULE above. Settled at total=1 / visible=1.
    await expect(
      page.getByText(/\d+(\.\d+)?\s*km away/i).filter({ visible: true }),
      "the location-origin search renders exactly one distance line (SEARCH-03 radius + SEARCH-05)",
    ).toHaveCount(1);

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
    await expect(page.getByRole("heading", { name: /confirm and pay/i })).toBeVisible();
    // Venue-tz window + tz note (SC#2), the frozen ₱ breakdown, and the live countdown.
    // `.first()` KEPT, deliberately, and this is one of the two sites where it is the honest choice:
    // measured total=2 / VISIBLE=2 — the window line's tz suffix and the standalone tz note are both
    // real and both on screen, so this line means "the venue tz is stated", not "stated once", and
    // pinning 2 would copy-pin an incidental number. `.filter({ visible: true })` goes IN FRONT of
    // `.first()` so `.first()` can never land on the streaming buffer's copy, which precedes the live
    // tree in DOM order and would fail `toBeVisible()` with a misleading message.
    await expect(page.getByText(/\(GMT\+8\)/i).filter({ visible: true }).first()).toBeVisible();
    await expect(
      page.getByText(/5:00\s*PM\s*[–-]\s*7:00\s*PM/i).filter({ visible: true }),
      "the booked window is stated once, in venue tz (SC#2)",
    ).toHaveCount(1);
    // AMENDED. This read `.first()`, under a comment explaining that checkout renders the word `Total`
    // TWICE since plan 12-11 — the breakdown's label, first in the DOM, and the sticky confirm bar's,
    // which is `lg:hidden` at this 1280px viewport and therefore present but NOT VISIBLE. That account
    // is exactly right and is confirmed by measurement (total=2, visible=1). It is also a real invariant,
    // so this line now ASSERTS it instead of stepping around it: exactly one `Total` is reachable at this
    // width. `.first()` made the documented claim untestable — a second VISIBLE `Total`, which is the
    // failure the `lg:hidden` is there to prevent, would have passed silently.
    await expect(
      page.getByText("Total", { exact: true }).filter({ visible: true }),
      "exactly one `Total` is reachable at 1280px — the sticky confirm bar's copy is lg:hidden",
    ).toHaveCount(1);
    // `.first()` KEPT — the second of the two honest at-least-one sites. The breakdown is several ₱
    // figures (measured total=3 / visible=2: the space price and the total, plus the bar's hidden copy)
    // and the count is incidental to what this line checks, which is that money is rendered at all.
    await expect(page.getByText(/₱[\d,]+/).filter({ visible: true }).first()).toBeVisible();
    // AMENDED BY PLAN 12-03 (D-49). This line read `getByText(/Held for/i)` and went red on a correct
    // tree: the countdown moved out of the booking rail and into the CHECKOUT HEADER, where it is a
    // clock glyph plus mm:ss inside a 96px reservation and has no room for a sentence. The rail keeps
    // the words and loses the digits, so both halves of the old assertion still exist — they are just
    // in two places now, and asserting each where it actually lives is what makes this a real check
    // rather than a copy pin. The `role="timer"` line below is unchanged and is still the digits.
    await expect(
      page.getByText(/We.re holding this for you while you review/i).filter({ visible: true }),
    ).toHaveCount(1);
    await expect(
      page.getByTestId("site-header").getByRole("timer"),
      "the countdown is not in the checkout header (D-49 / SHELL-03)",
    ).toBeVisible();
    await expect(page.getByRole("timer")).toContainText(/\d+:\d{2}/);
    // The terminal action + its HONEST pre-charge reassurance (D-57), MOVED BY PLAN 12-11 in the commit
    // that changed the copy. BFLOW-07's gap was one word: the line now NAMES THE DESTINATION —
    // "You'll pay {total} on PayMongo — card, GCash, Maya or QR Ph. We'll bring you straight back." —
    // where it previously said "now … Payments are processed securely", which reassures about
    // infrastructure the booker cannot check while telling them nothing about the domain they are about
    // to be handed to. It is still NOT the stale "you won't be charged yet" the never-run Phase-4 draft
    // asserted, which contradicts the live copy.
    //
    // ⚠ `toBeVisible()` AND NOT A COUNT. Checkout renders the confirm control TWICE as of 12-11 — inline
    // in the rail and in the fixed bottom bar — with `hidden` leaving exactly one reachable per width.
    // This spec runs at Playwright's default 1280×720, where the bar is `lg:hidden`, so a role query
    // resolves to the inline one alone. The per-width count is `e2e/mobile-booker-path.spec.ts`'s.
    await expect(page.getByRole("button", { name: /confirm & pay/i })).toBeVisible();
    await expect(
      page
        .getByText(/You.ll pay .* on PayMongo.*card, GCash, Maya or QR ?Ph/i)
        .filter({ visible: true }),
    ).toHaveCount(1);

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
    // These two ran against the COLD first load and were left bare by the first pass at this bug, on
    // the strength of 16 clean iterations. That was under-sampling: at 10 further warm iterations each
    // produced a strict-mode violation once. The cold load is less exposed than the reload, not unexposed.
    await expect(page.getByText(/booking reference/i).filter({ visible: true })).toHaveCount(1);
    await expect(
      page.getByText("Confirmed", { exact: true }).filter({ visible: true }),
      "one status badge, and it says Confirmed",
    ).toHaveCount(1);
    const referenceOnScreen = page.getByText(/FIT-[0-9A-Z]{8}/).filter({ visible: true });
    const reference = await referenceOnScreen.textContent();
    expect(reference).toMatch(/FIT-[0-9A-Z]{8}/);

    // ── Durable across a refresh (D-43) — the same reference re-renders from persisted state, no hold. ──
    await page.reload();
    await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();

    // The assertion that started all of this: it read `expect(getByText(ref, { exact: true }))
    // .toBeVisible()` and threw a strict-mode violation naming two identical `<p>` nodes — 8 times in
    // 10 warm runs, the worst-affected site in the file. THE STREAMING-BUFFER RULE at the top of this
    // file has the DOM timeline, the measurements and the rejected alternatives. Treated, it is 10/10.
    await expect(
      page.getByText(reference!.trim(), { exact: true }).filter({ visible: true }),
      "the durable confirmation must show exactly ONE on-screen booking reference after a refresh",
    ).toHaveCount(1);
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
