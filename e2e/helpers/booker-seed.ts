// THE SHARED PHASE-12 BOOKER FIXTURE — one seeded host + listing + hours, one signup, one window
// picker, and ONE copy of the venue-tz day math.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS, AND WHAT IT IS DELIBERATELY NOT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every Phase-12 spec that has to reach the checkout needs the same four things: a payouts-enabled host,
// a published bookable listing with hours on all seven days, a booker signed up through the UI, and a
// venue-local target day that is inside the 90-day horizon. Before this file the fourth one — the day
// math — existed as THREE verbatim copies (`search-and-book.spec.ts`, `price-parity.spec.ts`,
// `public-listing.spec.ts`), each carrying the same note explaining that it was a copy and that hoisting
// it was a clean follow-up. This is that follow-up.
//
// ⚠️ THE DAY MATH, `selectTargetDay` AND `pickWindow` BELOW ARE A BYTE-IDENTICAL COPY of
// `e2e/price-parity.spec.ts:88-107,171-192`. They were COPIED, not re-derived. The rule is recorded in
// that spec and in CLAUDE.md: timezone/DST math re-derived per spec is the top booking-app failure mode,
// so it is "same math or none". If one of them ever has to change, every copy changes with it — which is
// the whole reason there should stop being copies.
//
// ⚠️ `e2e/price-parity.spec.ts` IS NOT MIGRATED ONTO THIS HELPER AND MUST NOT BE. It is the ONE e2e spec
// that runs in CI (D-35), and its contract — stated in its own header and restated in the workflow — is
// that its ONLY environment input is `DATABASE_URL`. Rewriting a shipped, UAT-relevant money gate to
// import a helper introduced by an unrelated plan trades a real guarantee for tidiness. It stays byte-
// unmodified; this file is what the specs written AFTER it use.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO PROPERTIES A CALLER MUST NOT BREAK
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. IDS ARE PER-RUN UUIDS. A fixed id makes two runs (or a CI retry in a fresh worker) collide on the
//      primary key, and the failure reads as a seed bug rather than as a collision.
//   2. TEARDOWN ORDER IS LOAD-BEARING. `booking.booker_id` is `ON DELETE RESTRICT`, so the booking rows
//      go first (with their notifications), THEN the host — whose deletion cascades to listing, photos,
//      hours and tags — and THEN the signed-up booker. Deleting the booker first fails with a foreign-key
//      error that says nothing about ordering.

import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

/** Every route these specs drive is served by the dev server Playwright boots on :3000. */
export const BASE = "http://localhost:3000";

/** The seeded listing's venue timezone. Every day/hour figure in this file is venue-local. */
export const VENUE_TZ = "Asia/Manila";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as tests/helpers/db.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Venue-local target day: +3 days out (future, inside the 90-day horizon).
// VERBATIM from price-parity.spec.ts:88-107 — see the header's copy note.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const inTz = tz(VENUE_TZ);
const now = new Date();
const initMonth = Number(format(now, "M", { in: inTz }));
const initYear = Number(format(now, "yyyy", { in: inTz }));
const base = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
export const targetYear = Number(format(base, "yyyy", { in: inTz }));
export const targetMonth = Number(format(base, "M", { in: inTz })); // 1-based
export const targetDay = Number(format(base, "d", { in: inTz }));
const targetMonthName = format(base, "MMMM", { in: inTz });
const crossesMonth = targetMonth !== initMonth || targetYear !== initYear;

/** react-day-picker default day-button aria-label is "EEEE, MMMM do, yyyy" — match by month/day/year. */
const targetDayLabel = new RegExp(
  `${targetMonthName}\\s+${targetDay}(st|nd|rd|th)?,?\\s+${targetYear}`,
);

/** Navigate the venue-tz calendar to the seeded target day (advancing one month if it's next month). */
// VERBATIM from price-parity.spec.ts:171-183 — see the header's copy note.
export async function selectTargetDay(page: Page): Promise<void> {
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
// VERBATIM from price-parity.spec.ts:185-192 — see the header's copy note.
export async function pickWindow(
  page: Page,
  startLabel: string,
  endLabel: string,
): Promise<void> {
  await expect(page.getByText(/Times shown in .*Makati.*\(GMT\+8\)/i)).toBeVisible();
  await selectTargetDay(page);
  await page.getByRole("button", { name: startLabel, exact: true }).click(); // start anchor
  await page.getByRole("button", { name: endLabel, exact: true }).click(); // end → fills the run
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The seed
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type SeedOptions = {
  /** How many cover-first photos to insert. A broken `src` is fine — the `<img>` is what renders. */
  photos?: number;
  /** Which booking surface the listing gets (OC-01). `exclusive` is the hour-grid path. */
  occupancy?: "exclusive" | "open_capacity";
  /** `unit_count`. 1 is the exclusive single-space listing every window assertion assumes. */
  unitCount?: number;
  /** Distinguishes concurrent seeds in the search results. Defaults to a per-run label. */
  titlePrefix?: string;
};

export type SeededListing = {
  readonly hostId: string;
  readonly listingId: string;
  readonly title: string;
  /** The category label the search filter narrows on — unique to these seeds. */
  readonly spaceTypeLabel: string;
  /** The live connection, so a spec can read back what the app actually persisted. */
  readonly sql: ReturnType<typeof postgres>;
  /** Emails signed up through the UI during this run, deleted in order by `teardown()`. */
  readonly bookerEmails: string[];
  teardown(): Promise<void>;
};

/**
 * A space type NO other e2e seed and no dev seed uses, so a category filter isolates these listings.
 *
 * The same one `price-parity.spec.ts` uses. Two specs seeding it concurrently would each see two
 * results, which is why every helper below addresses its listing by TITLE rather than by category
 * alone.
 */
const SPACE_TYPE = "martial_arts_boxing";
export const SPACE_TYPE_LABEL = "Martial arts / boxing gym";
const ACTIVITY_TAG = "boxing_mma";

/** Deliberately not round — a rounded service fee is the interesting case (price-parity's reason). */
const HOURLY_RATE_CENTS = 47333;
const DAY_RATE_CENTS = 288888;
const PER_HEAD_PRICE_CENTS = 25000;

const LISTING_CITY = "Makati";
const LISTING_LAT = 14.5547;
const LISTING_LNG = 121.0244;

/**
 * Seed a payouts-enabled host + one published, bookable listing with 06:00–21:00 hours on all 7 days.
 *
 * Returns the ids, the live `sql` connection and an ORDERED teardown. Call `teardown()` from
 * `test.afterAll` — it also ends the connection, so nothing else may use `sql` afterwards.
 */
export async function seedBookableListing(options: SeedOptions = {}): Promise<SeededListing> {
  const { photos = 3, occupancy = "exclusive", unitCount = 1, titlePrefix = "E2E Booker" } = options;

  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  const runId = randomUUID();
  const hostId = `e2e_bk_host_${runId}`;
  const listingId = `e2e_bk_listing_${runId}`;
  // The title carries the run id so two concurrent seeds (or a stale row from a crashed run) can never
  // make `getByRole("link", { name: title })` ambiguous — a strict-mode violation reads like a selector
  // bug and is actually a seed collision.
  const title = `${titlePrefix} Gym ${runId.slice(0, 8)}`;
  const bookerEmails: string[] = [];

  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${hostId}, ${"E2E Booker Host"}, ${`${hostId}@example.com`}, ${true},
      ${"Ezra"}, ${true}, ${false}, now(), now()
    )
  `;
  // An ACTIVATED payout wallet is what makes the listing bookable (deriveBookable / the `payouts_enabled`
  // gate). Seeded directly, as availability.spec.ts does — the merchant.activated webhook is Phase 2.
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;

  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${title},
      ${"A matted boxing gym with heavy bags, a ring and wraps."}, ${SPACE_TYPE}::space_type,
      ${"2 Real Street"}, ${LISTING_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${LISTING_LNG}, ${LISTING_LAT}), 4326), ${false}, ${8}, ${unitCount}, ${VENUE_TZ},
      ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS},
      ${occupancy === "open_capacity" ? PER_HEAD_PRICE_CENTS : null},
      ${occupancy}::occupancy_mode,
      ${"php"}, ${"instant"}::booking_mode, ${"published"}::listing_status,
      now(), now(), now()
    )
  `;

  for (let i = 0; i < photos; i++) {
    await sql`
      INSERT INTO "listing_photo" (id, listing_id, public_id, url, position)
      VALUES (${randomUUID()}, ${listingId}, ${`fitout/e2e-bk/${i}`}, ${`https://example.com/e2e-bk-${i}.jpg`}, ${i})
    `;
  }

  // Weekly hours 06:00–21:00 every day so the target day is bookable whatever weekday it lands on.
  for (let dow = 0; dow < 7; dow++) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${randomUUID()}, ${listingId}, ${dow}, ${"06:00"}, ${"21:00"}, now())
    `;
  }
  await sql`INSERT INTO "listing_activity_tag" (listing_id, tag) VALUES (${listingId}, ${ACTIVITY_TAG})`;

  return {
    hostId,
    listingId,
    title,
    spaceTypeLabel: SPACE_TYPE_LABEL,
    sql,
    bookerEmails,
    async teardown() {
      // ORDER IS LOAD-BEARING — see the header. Copied from price-parity.spec.ts:160-169.
      await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${listingId})`;
      await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
      await sql`DELETE FROM "user" WHERE id = ${hostId}`;
      for (const email of bookerEmails) {
        await sql`DELETE FROM "user" WHERE email = ${email}`;
      }
      await sql.end();
    },
  };
}

/**
 * Sign a booker up through the UI with intent "book" (D-41 → `canBook`, which `Book this space` is
 * gated on). Registers the email for teardown.
 *
 * The shipped idiom rather than a seeded session, for the reason `login-persistence.spec.ts` gives:
 * email/password needs no external credentials, and a unique address per run means repeated runs never
 * collide on the unique email constraint.
 */
export async function signUpBooker(page: Page, seed: SeededListing): Promise<string> {
  const email = `e2e.booker.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  seed.bookerEmails.push(email);
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Booker");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("averylongpassword");
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
  return email;
}

/**
 * Search → the seeded listing. Addressed by TITLE, which carries the run id.
 *
 * The category filter narrows the catalogue to this seed's space type; the title link then disambiguates
 * within it, so a second concurrent seed of the same type cannot make this ambiguous.
 */
export async function openSeededListing(page: Page, seed: SeededListing): Promise<void> {
  await page.goto(`${BASE}/`);

  // ⚠️ `/` STREAMS, AND ITS OWN `loading.tsx` RENDERS A SECOND `SearchBar`. MEASURED (2026-08-18): the
  // served document holds `id="search-category"` at byte 11,713 (the pending fallback) and again at
  // 84,158 (the resolved page), with React's first completion segment at 26,879 between them. While the
  // boundary is still resolving BOTH are in the DOM, and `page.locator("#search-category").click()`
  // fails Playwright's strict mode with "resolved to 2 elements" — an error that reads like a duplicate
  // id and is actually a race. The shipped specs get away with it only because they happen to arrive
  // late. `toHaveCount(1)` retries until the fallback is gone, which is the wait this needs and states
  // why it is there.
  const category = page.locator("#search-category");
  await expect(
    category,
    "`/` still holds two #search-category controls — the pending shell's SearchBar and the resolved " +
      "page's. This waits for the streamed boundary to resolve; a persistent 2 means the fallback " +
      "stopped being replaced.",
  ).toHaveCount(1);
  await category.click();
  await page.getByRole("option", { name: seed.spaceTypeLabel }).click();
  await page.locator("#search-submit").click();
  await page.waitForURL(new RegExp(`category=${SPACE_TYPE}`));

  await page.getByRole("link", { name: new RegExp(seed.title) }).click();
  await page.waitForURL(new RegExp(`/listings/${seed.listingId}`));
}

/**
 * The whole booker path in one call: search → listing → window → `Book this space` → the reserve page.
 *
 * Returns the minted hold id, read off the URL `placeHold` redirected to. The caller is expected to have
 * signed a booker up already — the two are separate because a spec that drives two windows signs up once.
 */
export async function placeHold(
  page: Page,
  seed: SeededListing,
  startLabel: string,
  endLabel: string,
): Promise<string> {
  await openSeededListing(page, seed);
  await pickWindow(page, startLabel, endLabel);

  const bookBtn = page.getByRole("button", { name: "Book this space" });
  await expect(bookBtn).toBeEnabled();
  await bookBtn.click();

  await page.waitForURL(/\/book\?hold=/);
  const holdId = new URL(page.url()).searchParams.get("hold");
  expect(holdId, "placeHold redirected without a ?hold= id").toBeTruthy();

  // ⚠️ THE URL IS NOT THE PAGE, AND ON THIS ROUTE THE DIFFERENCE IS INVISIBLE. MEASURED
  // (2026-08-18): `app/listings/[id]/book/loading.tsx` renders the SAME `<h1>Review and book</h1>` as
  // the resolved page, plus a `PanelSkeleton`. A caller that waits for the URL and then checks for the
  // h1 — the obvious spelling, and the one `shell.spec.ts` uses on a route where it is sufficient — is
  // satisfied by the SKELETON, and every subsequent assertion runs against a page whose body has not
  // arrived. Observed once already: `main`'s whole text content read "Review and bookLoading your
  // booking" while a countdown assertion reported zero timers.
  //
  // `price-total` is the resolved breakdown's own hook (GATE-05, plan 11-06) and exists nowhere in the
  // fallback, so waiting for it is waiting for the real page rather than for a duration.
  await expect(
    page.getByTestId("price-total"),
    "the checkout URL resolved but the page body did not — `book/loading.tsx`'s skeleton is still up. " +
      "Its <h1> is identical to the resolved page's, so an h1 check would have passed here.",
  ).toHaveCount(1);

  return holdId!;
}

/** The hold's server-frozen TTL deadline, in epoch milliseconds. The clock is driven against THIS. */
export async function readExpiresAt(seed: SeededListing, holdId: string): Promise<number> {
  const [row] = await seed.sql<{ expires_at: Date | null }[]>`
    SELECT expires_at FROM booking WHERE id = ${holdId}
  `;
  expect(row, `no booking row for hold ${holdId} — the hold the UI just placed is not in the database`)
    .toBeTruthy();
  expect(
    row.expires_at,
    `booking ${holdId} has a null expires_at, so there is no deadline to drive a clock against`,
  ).not.toBeNull();
  return row.expires_at!.getTime();
}
