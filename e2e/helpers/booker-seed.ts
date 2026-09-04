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

import { expect, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { grantStaff } from "@/lib/ops/grant";
import * as schema from "@/lib/db/schema";

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

/**
 * Navigate the venue-tz calendar to the seeded target day, inside a GIVEN scope.
 *
 * ⚠ ONE COPY OF THE MATH, TWO ENTRY POINTS (plan 12-10). `selectTargetDay(page)` below delegates here,
 * so the day arithmetic and the react-day-picker label form still exist exactly once — the rule this
 * file's header states and the reason the file exists at all.
 *
 * THE SCOPE PARAMETER IS NOT CONVENIENCE. RESP-02 mounts a SECOND booking view inside a sheet on
 * `/listings/[id]`, so while that sheet is open the document holds two month grids. Radix marks
 * everything outside its portal `aria-hidden`, which means the two ROLE queries below already resolve to
 * the sheet's grid alone — but `.and(page.locator(…))` composes a CSS locator that does not, and an
 * unscoped intersection would silently match zero elements. Passing the sheet as the scope makes both
 * halves address the same subtree.
 */
// VERBATIM from price-parity.spec.ts:171-183 — see the header's copy note.
export async function selectTargetDayIn(scope: Page | Locator): Promise<void> {
  if (crossesMonth) {
    await scope.getByRole("button", { name: /next month/i }).click();
  }
  // Scope to the enabled, in-month occurrence so the click never lands on a showOutsideDays duplicate.
  const day = scope
    .getByRole("button", { name: targetDayLabel })
    .and(scope.locator("td:not([data-outside='true']) button"))
    .and(scope.locator("button:not([disabled])"));
  await day.first().click();
}

/** Navigate the venue-tz calendar to the seeded target day (advancing one month if it's next month). */
export async function selectTargetDay(page: Page): Promise<void> {
  await selectTargetDayIn(page);
}

/** RESP-02's sticky-bar trigger, and the overlay it opens. Both declared in `selector-contract.ts`. */
const SHEET_TRIGGER_NAME = "Check availability";
const SHEET_SELECTOR = '[data-testid="responsive-dialog"]';

/**
 * Open the listing page's booking sheet through the sticky bar's own trigger — RETRIED.
 *
 * ⚠ THE RETRY IS A MEASURED REQUIREMENT, NOT A HEDGE, AND IT IS 12-09's FINDING 6 IN A SECOND SHAPE.
 * `e2e/overflow-320.spec.ts`'s sheet-open row passed every isolated invocation and then failed in the
 * full-suite run, in BOTH themes, with Playwright's own call log naming the mechanism:
 *
 *     - locator resolved to <button … data-slot="dialog-trigger">Check availability</button>
 *     - attempting click action
 *       - waiting for element to be visible, enabled and stable
 *       - element is not stable
 *     - retrying click action
 *     - element was detached from the DOM, retrying
 *
 * The trigger EXISTS in the server-rendered document — `toHaveCount(1)` resolved it immediately — and
 * is then replaced while React finishes with the route. Under load the click lands on a node on its way
 * out and the event goes with it: the click is LOST, not queued, so polling for the sheet afterwards
 * would hang until the test timeout on a page with nothing wrong with it. Retrying the CLICK until the
 * overlay is mounted is the guard, exactly as `reduced-motion.spec.ts`'s `advanceMonth` retries the
 * month-nav click for the same reason.
 *
 * The guard is not weakened by the retry: a trigger that opens nothing still fails, with this
 * function's own message rather than with a generic locator timeout.
 */
export async function openBookingSheet(page: Page, where: string): Promise<Locator> {
  const sheet = page.locator(SHEET_SELECTOR);
  const trigger = page.getByRole("button", { name: SHEET_TRIGGER_NAME });

  await expect(
    trigger,
    `${where}: the sticky bar rendered no \`${SHEET_TRIGGER_NAME}\` action, so the sheet cannot be ` +
      "opened. With no selection this is the bar's ONLY action (D-59 #3 replaces it with the hold " +
      "submission once a window is picked), and the bar itself is `lg:hidden` — a viewport at or above " +
      "`lg:` renders neither.",
  ).toHaveCount(1, { timeout: 15_000 });

  await expect
    .poll(
      async () => {
        if ((await sheet.count()) > 0) return true;
        await trigger.click({ timeout: 5_000 }).catch(() => {});
        return (await sheet.count()) > 0;
      },
      {
        timeout: 30_000,
        message:
          `${where}: tapping \`${SHEET_TRIGGER_NAME}\` never opened the booking sheet. The click is ` +
          "retried because a server-rendered trigger is clickable before React has finished with the " +
          "route (see this helper's note); a persistent failure here means the bar's trigger is not " +
          "wired to the one overlay primitive at all.",
      },
    )
    .toBe(true);

  await expect(sheet).toBeVisible();
  return sheet;
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
  // …and so is an ops-APPROVED host_verification row (phase 18, D-224 — deriveBookable's SIXTH term). A
  // host with NO row reads as 'unverified' and every spec below would land on a listing that refuses to
  // sell. ⚠ These specs do NOT run in CI (D-24), so nothing but a hand run can catch this.
  await sql`
    INSERT INTO "host_verification" (user_id, status, provider, created_at, updated_at)
    VALUES (${hostId}, ${"approved"}::host_verification_status, ${"manual"}, now(), now())
  `;

  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, status, review_state, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${title},
      ${"A matted boxing gym with heavy bags, a ring and wraps."}, ${SPACE_TYPE}::space_type,
      ${"2 Real Street"}, ${LISTING_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${LISTING_LNG}, ${LISTING_LAT}), 4326), ${false}, ${8}, ${unitCount}, ${VENUE_TZ},
      ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS},
      ${occupancy === "open_capacity" ? PER_HEAD_PRICE_CENTS : null},
      ${occupancy}::occupancy_mode,
      ${"php"}, ${"instant"}::booking_mode, ${"published"}::listing_status,
      -- The FIFTH deriveBookable term (phase 18, D-224); the column DEFAULTS to 'pending'.
      ${"approved"}::listing_review_state,
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

  // ⚠ THE CTA IS ADDRESSED BY THE HOLD-CTA FAMILY AND NOT BY THE RAIL'S NAME, AS OF PLAN 12-10, AND
  // THIS HELPER'S CALLERS ARE WHY. RESP-02 makes the listing rail `max-lg:hidden` and puts the hold
  // action on a sticky bottom bar reading `Book · {total}` below `lg:`, so `Book this space` — the name
  // this line used to carry — resolves to ZERO elements at any width the rail does not render at.
  //
  // MEASURED, not anticipated: `e2e/hold-countdown.spec.ts` sets 375px before minting its hold (its
  // geometry run sweeps 375 / 768 / 1280) and went red here with `element(s) not found` on a tree that
  // was working exactly as designed. This helper's own docstring calls it "the whole booker path in one
  // call", and a booker path that only exists above 1024px is not one.
  //
  // The regex is safe to leave unqualified precisely because RESP-02 asserts what it depends on:
  // `e2e/mobile-booker-path.spec.ts` case (c) pins EXACTLY ONE reachable hold CTA at 375px and at
  // 1280px. It deliberately does not match `slot-picker.tsx`'s `Book full day`, which selects a window
  // and places no hold — the same distinction that spec's header records measuring.
  const bookBtn = page.getByRole("button", { name: /^Book(?: this space| · )/ });
  await expect(
    bookBtn,
    "the listing page rendered no reachable hold CTA. Below `lg:` that is the sticky bar's " +
      "`Book · {total}`, which only appears once a window is picked; at and above it, the rail's " +
      "`Book this space`. More than one means the placement that should be `hidden` is not.",
  ).toHaveCount(1);
  await expect(bookBtn).toBeEnabled();
  await bookBtn.click();

  await page.waitForURL(/\/book\?hold=/);
  const holdId = new URL(page.url()).searchParams.get("hold");
  expect(holdId, "placeHold redirected without a ?hold= id").toBeTruthy();

  // ⚠️ THE URL IS NOT THE PAGE, AND ON THIS ROUTE THE DIFFERENCE IS INVISIBLE. MEASURED
  // (2026-08-18): `app/listings/[id]/book/loading.tsx` renders the SAME `<h1>Confirm and pay</h1>` as
  // the resolved page, plus a `PanelSkeleton`. A caller that waits for the URL and then checks for the
  // h1 — the obvious spelling, and the one `shell.spec.ts` uses on a route where it is sufficient — is
  // satisfied by the SKELETON, and every subsequent assertion runs against a page whose body has not
  // arrived. Observed once already (plan 12-03, when the heading still read `Review and book`):
  // `main`'s whole text content read "Review and bookLoading your booking" while a countdown assertion
  // reported zero timers. Plan 12-11 renamed the heading on BOTH files in one commit — which changes
  // nothing here, and that is the point: the trap is the DUPLICATION, not the string.
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

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE STAFF SESSION (plan 18-12) — the only way any spec reaches `/ops`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ THE GRANT GOES THROUGH `src/lib/ops/grant.ts`, NOT THROUGH A SECOND `UPDATE "user"` WRITTEN HERE.
//
// That module is the staff-grant POLICY (OPS-01 / D-217) and its own header says why it is a module at
// all: *"A policy nothing can execute in isolation is a policy nothing can MUTATE in isolation
// either — and 'how does one become staff?' is the single most load-bearing rule in Phase 18."* A
// hand-rolled `UPDATE` here would be a SECOND way to become staff, living in a test helper, outside
// every assertion `tests/ops/grant-cli.test.ts` makes about the first one — including the audit row it
// writes on both branches. It would also drift silently the day the policy grows a condition.
//
// It takes an INJECTED `DbConn` with no default, deliberately (the `= db` default is the import that
// hangs a short-lived process), so this file builds one over the same `postgres.js` connection the
// rest of the fixture uses. Drizzle is imported here and nowhere else in `e2e/`.
//
// AND IT IS NOT BETTER AUTH'S USER-UPDATE API EITHER, WHICH COULD NOT WORK ANYWAY. `role` is
// `input: false` (`src/lib/auth.ts:112`), so that endpoint raises `FIELD_NOT_ALLOWED` and takes the
// WHOLE request down — measured in `tests/auth/ops-role.test.ts`, which found the behaviour stronger
// than the plan that predicted a field-level strip. D-217 says a role-grant HTTP path does not get to
// exist; this helper is not the place to invent one.
//
// ⚠ THE ENDPOINT IS NAMED DESCRIPTIVELY AND NOT SPELLED, DELIBERATELY. 18-12's acceptance criterion
// is a ZERO-count grep for that identifier over this file, and a paragraph explaining why it is
// forbidden would make the count 1 against a correct file. That is the eighth instance of this shape
// in this repository (18-04 § 4, 18-05 × 3, 18-10 × 2); `price-breakdown.tsx`'s GREP TRIPWIRE rule
// says to describe the prohibition rather than to write it out, and this is that rule applied.
//
// THE AUDIT ROW IS TORN DOWN BY THE CALLER. `grantStaff` writes one (that is the point of it), and
// `audit` carries NO foreign key by design, so no cascade reaches it — the same trap
// `overflow-320.spec.ts`'s Phase-14 teardown records for `/host/payouts/refresh`. `staffTeardown`
// below is the statement, and it is returned rather than folded into `SeededListing.teardown()`
// because a spec may seed a staff session without seeding a listing.

/**
 * A staff account signed in through the shipped UI, plus the teardown its audit row needs.
 *
 * SIGNED UP THROUGH THE FORM rather than seeded as a session row, for `login-persistence.spec.ts`'s
 * reason: email/password needs no external credential, and a unique address per run means repeated
 * runs never collide on the unique email constraint. The grant happens AFTER the signup and the page
 * is reloaded, because `readStaff()` reads `user.role` off the session's DATABASE row on every
 * request (`src/lib/ops/staff.ts` — `session.cookieCache` is unconfigured, and that module's header
 * records that this file's correctness depends on it staying that way).
 */
/**
 * The `--by` handle every e2e staff grant is recorded under — one constant, so the teardown's
 * `DELETE FROM audit` can find exactly the rows this fixture wrote and nothing else.
 */
const STAFF_GRANT_ACTOR = "e2e staff fixture";

/**
 * Run one statement batch against a connection that is OPENED AND CLOSED INSIDE THE CALL.
 *
 * ⚠ THIS IS WHAT LETS `axe-sweep.spec.ts` USE THESE HELPERS WITHOUT BREAKING ITS OWN RULE. That file
 * states, in as many words, that it opens no `postgres()` client — because `deferred-items.md` warns
 * against another DB-seeding spec holding a `postgres({max:1})` client for its whole lifetime, and six
 * specs already do. Nothing below holds one: each call takes a connection, does its work and ends it,
 * so the spec's steady state is still zero. The rule's SPIRIT is honoured rather than its letter
 * argued with, and this paragraph is here so the next reader can check that claim instead of taking
 * it.
 */
async function withClient<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

export type SeededStaff = {
  readonly email: string;
  readonly userId: string;
  staffTeardown(): Promise<void>;
};

export async function signUpStaff(page: Page): Promise<SeededStaff> {
  const email = `e2e.staff.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Ops");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("averylongpassword");
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 60_000 });

  const userId = await withClient(async (sql) => {
    const result = await grantStaff(drizzle(sql, { schema }), email, STAFF_GRANT_ACTOR);
    expect(
      result.outcome,
      `the staff grant refused ${email} (${result.outcome}). Every /ops row in this suite would then ` +
        "measure the 404 a non-staff caller gets (D-219), which renders the ROOT not-found body — a " +
        "real document that passes an accessibility scan and does not overflow, so the failure would " +
        "look exactly like a pass.",
    ).toBe("written");

    const [row] = await sql<{ id: string; role: string | null }[]>`
      SELECT id, role FROM "user" WHERE email = ${email}
    `;
    expect(row?.role, `${email} is not staff after the grant`).toBe("staff");
    return row.id;
  });

  // The session cookie is already minted and the role is re-read from the row on the NEXT request —
  // `src/lib/ops/staff.ts` depends on `session.cookieCache` staying unconfigured, and its header says
  // so. If that ever changes, this helper has to mint the session AFTER the grant instead.
  return {
    email,
    userId,
    async staffTeardown() {
      await withClient(async (sql) => {
        // The grant's own audit row FIRST. `audit` carries no foreign key by design, so no cascade
        // reaches it and the rows would otherwise accumulate one per run, forever — the same trap
        // `overflow-320.spec.ts`'s Phase-14 teardown records for `/host/payouts/refresh`.
        await sql`DELETE FROM audit WHERE actor_id = ${STAFF_GRANT_ACTOR}`;
        await sql`DELETE FROM "user" WHERE email = ${email}`;
      });
    },
  };
}

/**
 * Give ONE host, by email, an APPROVED `host_verification` row — the D-255 CREATION gate (18.1-12).
 *
 * ⚠ WHY A SECOND SEEDER IN A FILE THAT ALREADY WRITES AN APPROVED ROW, AND WHY IT IS AN ADDITION
 * RATHER THAN A REPLACEMENT. `seedBookableListing` above writes one for the host it INVENTS, because
 * that host must be able to SELL (`deriveBookable`'s sixth term, D-224). This one is for a host that
 * SIGNED UP THROUGH THE FORM, which leaves no row at all — and from plan 18.1-12 a host with no row
 * cannot even CREATE a draft: `createDraftListing` refuses `unverified | pending | rejected |
 * suspended`, and `/host/listings/new` redirects them to `/host/verify` before the action is reached.
 *
 * So the gate this closes is a DIFFERENT one from the sell-gate, one step earlier in the same host's
 * life, and the spec that needs it is `axe-sweep.spec.ts`: it mints its draft listing by DRIVING
 * `/host/listings/new` with a freshly signed-up account, and that navigation now lands on the account
 * check instead of the wizard unless this runs first.
 *
 * ⚠ IT DOES NOT RETURN A TEARDOWN, AND THAT IS DELIBERATE. Its one caller composes it with
 * `seedPendingHostVerification` below, whose `ON CONFLICT DO UPDATE` flips this row to `pending` and
 * whose own teardown deletes it. A second teardown here would either double-delete or race with that
 * one, and a helper that hands back a cleanup its caller must remember NOT to call is worse than one
 * that documents whose cleanup owns the row.
 *
 * ⚠ THESE SPECS DO NOT RUN IN CI (D-24). Nothing but a hand run can catch a miss here — which is
 * precisely how this class of fixture gap has stayed red through three review passes before.
 */
export async function seedApprovedHostVerification(email: string): Promise<string> {
  return withClient(async (sql) => {
    const [row] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${email}`;
    expect(
      row?.id,
      `no account for ${email} — the sign-up that should have created it did not`,
    ).toBeTruthy();
    await sql`
      INSERT INTO host_verification (user_id, status, provider, created_at, updated_at)
      VALUES (${row.id}, ${"approved"}::host_verification_status, ${"manual"}, now(), now())
      ON CONFLICT (user_id) DO UPDATE
        SET status = ${"approved"}::host_verification_status,
            updated_at = now()
    `;
    return row.id;
  });
}

/**
 * Put ONE host into the review queue, by email, without seeding a listing.
 *
 * For a spec that needs `/ops` to be deterministically non-empty but has no listing fixture and wants
 * none — `axe-sweep.spec.ts` is the case, and its own header explains why it holds no client. A host
 * signed up through the form has NO `host_verification` row at all, and a missing row reads as
 * `unverified` (fail-closed), which is not `pending` and therefore not in the queue.
 */
export async function seedPendingHostVerification(email: string): Promise<() => Promise<void>> {
  const userId = await withClient(async (sql) => {
    const [row] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${email}`;
    expect(row?.id, `no account for ${email} — the sign-up that should have created it did not`).toBeTruthy();
    await sql`
      INSERT INTO host_verification (user_id, status, provider, created_at, updated_at)
      VALUES (${row.id}, ${"pending"}::host_verification_status, ${"manual"}, now() - interval '9 days', now())
      ON CONFLICT (user_id) DO UPDATE
        SET status = ${"pending"}::host_verification_status,
            created_at = now() - interval '9 days'
    `;
    return row.id;
  });
  return async () => {
    await withClient(async (sql) => {
      await sql`DELETE FROM host_verification WHERE user_id = ${userId}`;
    });
  };
}

/**
 * Put a seeded listing INTO the review queue, and give its host a pending verification.
 *
 * `seedBookableListing` writes `review_state='approved'` and an approved `host_verification` because
 * every OTHER spec needs the listing to SELL (D-224's sell-gate). `/ops` needs the opposite, so this
 * flips the two columns rather than forking the seed — one fixture, one place the sell-gate terms are
 * written down.
 *
 * ⚠ IT SEEDS ONE OF EACH KIND ON PURPOSE. The queue interleaves hosts and listings oldest-first
 * (D-246) and the two row shapes are structurally different — a listing row carries a photo mosaic
 * and is roughly twice the height of a host row. A fixture with only one kind would leave every
 * assertion below measuring half the surface. `submitted_at` is backdated so the wait figure renders
 * a stable `Waiting {N} days` rather than an hours figure that changes while the suite runs.
 */
export async function seedReviewQueue(seed: SeededListing): Promise<void> {
  await seed.sql`
    UPDATE listing SET review_state = 'pending'::listing_review_state WHERE id = ${seed.listingId}
  `;
  // ⚠ NO `listing_review` ROW IS INSERTED, AND THAT IS TWO DECISIONS RATHER THAN A SHORTCUT.
  //
  //   1. D-249 makes the wait clock the LATEST `listing_review.submitted_at` **else**
  //      `listing.created_at`, so backdating the listing is enough to produce a stable
  //      `Waiting {N} days` — and it exercises the fallback branch, which is the branch a
  //      first-submission listing actually takes.
  //   2. `listing_review.listing_id` is ON DELETE **RESTRICT** (`schema.ts`), so a row here would make
  //      `seedBookableListing`'s teardown fail on the host delete with a foreign-key error that says
  //      nothing about ordering — the exact trap that file's own header warns about, one table over.
  await seed.sql`
    UPDATE listing SET created_at = now() - interval '6 days' WHERE id = ${seed.listingId}
  `;
  await seed.sql`
    UPDATE host_verification
    SET status = 'pending'::host_verification_status, created_at = now() - interval '9 days'
    WHERE user_id = ${seed.hostId}
  `;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE `/host/listings` GRID FIXTURE (phase 19, HSURF-01 / D-08)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

/** What `seedHostGridFixture` hands back: the host it signed up, its three cards, and one teardown. */
export type SeededHostGrid = {
  /** The address the sign-up form minted. Kept so a caller can name it in a failure message. */
  readonly hostEmail: string;
  readonly hostId: string;
  /** Card 1 — DRAFT, `title IS NULL`, no space type, no rates. The SHORTEST card. Three controls. */
  readonly untitledDraftId: string;
  /** Card 2 — PUBLISHED, zero `operating_hours` rows. The two-line notice, and FOUR controls. */
  readonly publishedNoHoursId: string;
  /** Card 3 — DRAFT whose title wraps at every measured band. */
  readonly longTitleDraftId: string;
  /** Card 3's title verbatim, so a spec can assert on it without re-spelling the string. */
  readonly longTitle: string;
  teardown(): Promise<void>;
};

/**
 * The long title, spelled once. Long enough to wrap at EVERY band this fixture is measured at, not
 * only at 320px: the widest band (1280) still gives the card ~315px, and `CardContent`'s `px-4` plus
 * the status badge beside the title leave the `TitleTag` roughly 200px of line box.
 */
const HOST_GRID_LONG_TITLE =
  "The Really Rather Long Riverside Boxing And Conditioning Studio With A Name Nobody Shortened";

/**
 * Seed ONE host owning THREE `/host/listings` cards whose `CardContent` heights genuinely differ, at
 * least one of them PUBLISHED — the fixture HSURF-01's two guards are measured against.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THE HEIGHTS MUST DIFFER, AND WHY THAT IS THE WHOLE POINT OF THIS HELPER
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * The defect guard A measures is a footer band floating MID-CARD: `Card` is `flex flex-col` with
 * `gap-0` at the call site (`listing-card.tsx:352`) and no child declares `flex-1`, so the children
 * pack to the top and the height the grid stretched the card to lands as dead space BELOW the tinted,
 * top-bordered footer. That dead space is EXACTLY the difference between the tallest card in a visual
 * row and this one. Three cards of identical content are stretched to a height they already had, the
 * gap below every footer is zero, and THE GUARD REPORTS GREEN AGAINST THE SHIPPED DEFECT — which is
 * the vacuity trap `19-VALIDATION` records under "Read this before writing any HSURF-01 assertion",
 * alongside the two other obvious signals that are already green.
 *
 * So the three cards below are not "some listings". Each one is a named height source, and
 * `19-RESEARCH § 3.4` lists them cheapest-first:
 *
 *   1. `untitledDraftId`    — DRAFT, `title IS NULL`, `primary_space_type IS NULL`, no rates. Renders
 *                             the "Untitled listing" fallback, NO space-type line, and the "No pricing
 *                             yet" fallback. The shortest card in the grid.
 *   2. `publishedNoHoursId` — PUBLISHED with ZERO `operating_hours` rows, so
 *                             `loadPublishedListingsMissingHours` (`(host)/host/listings/page.tsx:118-121`)
 *                             reports it and the card renders the TWO-LINE hours notice. Tallest.
 *   3. `longTitleDraftId`   — DRAFT with a title that wraps to two or more lines. Between the two.
 *
 * None of the three is given a cover photo, so all three render the "No photos yet" fallback. That is
 * deliberate and it is NOT a height source: `AspectRatio ratio={4/3}` pins the media band whether an
 * `<img>` or the fallback is inside it. It is stated here so the next reader does not add photos
 * believing they will change a number.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * WHY ONE OF THEM MUST BE PUBLISHED — THIS IS NOT A NICETY
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * `CardFooter` renders `Unlist` only when `listing.status === "published"` (`listing-card.tsx:450`).
 * So a DRAFT card renders THREE footer controls (Edit, Availability, Delete) and a PUBLISHED one
 * renders FOUR (Edit, Availability, Unlist, Delete). Guard B — `scrollWidth <= clientWidth` on
 * `[data-slot="card-footer"]` — is a width claim, and at a card width of ~288-322px the three-control
 * cluster very nearly fits while the four-control cluster does not. A DRAFTS-ONLY FIXTURE LEAVES
 * GUARD B GREEN AGAINST THE BROKEN TREE, which is the same vacuity trap repeating on the second
 * guard. Confirmed against the PM's screenshot of the shipped surface: the draft card's `Delete`
 * rendered in full while the published cards clipped `Unlist` and `Delete`.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THIS SEEDS ROWS DIRECTLY INSTEAD OF DRIVING THE WIZARD N TIMES
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * The obvious spelling is the wizard-driving draft-mint helper at `axe-sweep.spec.ts:295-315`, called three
 * times. UNDER D-02 THAT RETURNS THE SAME ID THREE TIMES. D-02 makes `createDraftListing` idempotent
 * by reusing the host's own untouched draft — pressing "Create listing" twice yields ONE row, on
 * purpose, because the orphan-draft class is what D-01/D-02 exist to kill. A fixture built by
 * repeating the mint would therefore seed ONE card, the spec's vacuity gate would fire, and the
 * failure would read as a selector bug. The loop would have to TOUCH each draft between mints to
 * defeat the reuse predicate — i.e. deliberately defeat a shipped guarantee in order to build a
 * fixture. So this helper writes its rows directly, and that wizard helper is never called from here.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * THE SHAPE: UI SIGN-UP, THEN SHORT-LIVED WRITES, THEN ONE TEARDOWN
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * The host signs up through the FORM — the shipped idiom (`host-headings.spec.ts:203-223`,
 * `signUpStaff` directly above), for the reason those sites give: email/password needs no external
 * credentials and a per-run address never collides on the unique email constraint. The intent radio is
 * what sets `canHost`, and `(host)/host/listings/page.tsx` re-checks it itself, so a seeded user row
 * alone would not reach the grid.
 *
 * A signed-up host has NO `host_verification` row at all, which reads as `unverified`, so
 * `seedApprovedHostVerification` runs before anything else — the same D-255 creation gate
 * `axe-sweep.spec.ts` hits one route over.
 *
 * EVERY WRITE GOES THROUGH `withClient`, so this file's steady state stays at ZERO held connections.
 * Six e2e specs already hold a long-lived single-connection client for their whole lifetime and
 * `deferred-items.md` warns against a seventh; a spec that imported this helper and opened its own
 * client would be that seventh. The number of client-opening call sites in this file is pinned by plan
 * 19-02's acceptance criteria for exactly that reason.
 *
 * `teardown()` deletes the three listings by id (which cascades their photos, hours and tags) and then
 * the host account, whose delete cascades the `host_verification` row this helper wrote. The account
 * is included even though the FORM created it, because this helper is what drove that form — the same
 * ownership `signUpStaff`'s `staffTeardown` above takes for the account its own sign-up produced.
 */
export async function seedHostGridFixture(page: Page): Promise<SeededHostGrid> {
  const hostEmail = `e2e.grid.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Gretel");
  await page.getByLabel("Email").fill(hostEmail);
  await page.getByLabel("Password").fill("averylongpassword");
  await page.getByRole("button", { name: /sign up to host/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 60_000 });

  // The D-255 creation gate. Also the only reason `/host/listings/new` would be reachable at all for
  // this host — this fixture does not drive that route, but a caller that adds a case which does would
  // otherwise land on `/host/verify` and read the redirect as a routing defect.
  const hostId = await seedApprovedHostVerification(hostEmail);

  const runId = randomUUID();
  const untitledDraftId = `e2e_grid_untitled_${runId}`;
  const publishedNoHoursId = `e2e_grid_published_${runId}`;
  const longTitleDraftId = `e2e_grid_longtitle_${runId}`;

  await withClient(async (sql) => {
    // `updated_at` IS SET EXPLICITLY AND DESCENDING, because the grid orders by it
    // (`page.tsx:154`, `.orderBy(desc(listing.updatedAt))`) and guard A measures the FIRST VISUAL ROW
    // only. At the `sm` band that row is the first TWO cards, so the shortest card and the tallest
    // card have to BE those two or the guard measures a row with no height variation in it. Left to
    // `defaultNow()` all three rows would share a statement timestamp and the order would be whatever
    // the planner happened to return.

    // 1 — the title-less draft. Every fallback on the card at once: "Untitled listing", no space-type
    // line (the `primarySpaceType &&` branch at `listing-card.tsx:377`), and "No pricing yet".
    await sql`
      INSERT INTO "listing" (id, host_id, title, primary_space_type, status, created_at, updated_at)
      VALUES (
        ${untitledDraftId}, ${hostId}, ${null}, ${null},
        ${"draft"}::listing_status, now(), now()
      )
    `;

    // 2 — PUBLISHED, and deliberately given NO `operating_hours` rows, which is what makes
    // `loadPublishedListingsMissingHours` report it and the card render the two-line hours notice.
    // `review_state` is 'approved' rather than the column's 'pending' DEFAULT so this card renders the
    // hours notice ALONE: a pending listing would also render the review notice, which would add a
    // second variable to the card whose job here is to be the tall one for ONE named reason.
    await sql`
      INSERT INTO "listing" (
        id, host_id, title, primary_space_type, city, timezone,
        hourly_rate_cents, day_rate_cents, status, review_state, published_at, created_at, updated_at
      ) VALUES (
        ${publishedNoHoursId}, ${hostId}, ${"Riverside Ring"}, ${SPACE_TYPE}::space_type,
        ${LISTING_CITY}, ${VENUE_TZ}, ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS},
        ${"published"}::listing_status, ${"approved"}::listing_review_state,
        now(), now(), now() - interval '1 minute'
      )
    `;

    // 3 — the long title. Wraps at every band, so it sits between the other two.
    await sql`
      INSERT INTO "listing" (
        id, host_id, title, primary_space_type, hourly_rate_cents, status, created_at, updated_at
      ) VALUES (
        ${longTitleDraftId}, ${hostId}, ${HOST_GRID_LONG_TITLE}, ${SPACE_TYPE}::space_type,
        ${HOURLY_RATE_CENTS}, ${"draft"}::listing_status, now(), now() - interval '2 minutes'
      )
    `;
  });

  return {
    hostEmail,
    hostId,
    untitledDraftId,
    publishedNoHoursId,
    longTitleDraftId,
    longTitle: HOST_GRID_LONG_TITLE,
    async teardown() {
      await withClient(async (sql) => {
        // The listings first, by id — `listing_photo`, `operating_hours` and `listing_activity_tag`
        // are ON DELETE CASCADE from `listing`, so nothing is left behind. Then the account, whose
        // delete cascades `host_verification`. No booking rows can exist: none of the three listings
        // is bookable (no `host_payout` row, and the published one has no hours).
        await sql`
          DELETE FROM "listing"
          WHERE id IN (${untitledDraftId}, ${publishedNoHoursId}, ${longTitleDraftId})
        `;
        await sql`DELETE FROM "user" WHERE id = ${hostId}`;
      });
    },
  };
}
