// BOOK-07 / PAY-06 · ROADMAP SC#2 — the cancellation journey, end to end, against the REAL app.
//
// THE POINT OF THIS SPEC, in one sentence: the number the booker READS on the review screen is the number
// they GET. Asserting only that the status flipped to Cancelled would pass against an implementation that
// refunded the wrong amount, which is the single failure this phase exists to prevent — so the previewed
// total is captured off the rendered page and then asserted against the persisted refund.
//
// It drives the dev app against the dev Postgres (public schema), cloning e2e/search-and-book.spec.ts for
// the seed/teardown shape and the signed-in-booker storageState idiom.
//
// ⚠️ NAVIGATION NOTE — RESOLVED BY PLAN 12. This spec used to deep-link to /bookings/[id]/cancel because the
// `Cancel booking` entry point on the detail page did not exist yet (07-09 is Wave 3; the page is Plan 12's
// file, Wave 4). That entry now exists, so the spec reaches the review screen the way a booker does: it lands
// on the booking detail page and CLICKS the entry. The journey is therefore whole — entry included — and the
// coverage gap 07-09 documented is closed.
//
// The entry is a LINK (role=link) and the review screen's confirm is a BUTTON (role=button); both are named
// `Cancel booking`, so every locator below is role-qualified. That is not incidental — D-104 requires the
// entry to route to the disclosure rather than act, and the role difference is what proves it still does.
//
// The booking is seeded directly as `confirmed` rather than paid through PayMongo: a hosted checkout cannot
// be driven from Playwright, and the payment path already has its own coverage (tests/paymongo). The rail is
// seeded as `gcash` so the action takes the API-refundable branch — no live PayMongo call fires because the
// action's refund POST is the ONLY outbound call and it is exercised against test credentials that fail
// closed into the audited operator-alert path, which never affects the durable flip this spec asserts.

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const BASE = "http://localhost:3000";
const VENUE_TZ = "Asia/Manila";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

const hostId = `e2e_cx_host_${randomUUID()}`;
const listingId = `e2e_cx_listing_${randomUUID()}`;
const bookingId = `e2e_cx_booking_${randomUUID()}`;
const bookerEmail = `e2e.cancel.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
const bookerPassword = "averylongpassword";

const LISTING_TITLE = "E2E Cancel Yoga Studio";

// ₱1,000 space + ₱50 service fee = ₱1,050 charged — the 07-UI-SPEC worked example, so the rendered
// breakdown is the one the spec was written against.
const SPACE_PRICE_CENTS = 100000;
const SERVICE_FEE_CENTS = 5000;

// STANDARD tier, 10 hours out ⇒ the 24h→6h rung ⇒ 50% of the space price ⇒ ₱500 back, ₱500 retained.
// Chosen deliberately over a 100% rung: a partial refund is the case where a wrong number is possible at
// all, and it is the only case that also proves the service fee was excluded.
const HOURS_TO_START = 10;
const EXPECTED_REFUND_CENTS = 50000;

let bookerState: Awaited<ReturnType<BrowserContext["storageState"]>>;
let bookerId: string;

async function seedHostAndListing(): Promise<void> {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (${hostId}, ${"E2E CX Host"}, ${`${hostId}@example.com`}, ${true}, ${"Hana"}, ${true}, ${false}, now(), now())
  `;
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country,
      show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, currency, booking_mode, cancellation_policy,
      status, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${LISTING_TITLE},
      ${"A calm mirrored studio with mats and props."}, ${"yoga_studio"}::space_type,
      ${"2 Real Street"}, ${"Makati"}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"},
      ${false}, ${12}, ${1}, ${VENUE_TZ},
      ${SPACE_PRICE_CENTS}, ${300000}, ${"php"}, ${"instant"}::booking_mode, ${"standard"}::cancellation_policy,
      ${"published"}::listing_status, now(), now(), now()
    )
  `;
}

/** A CONFIRMED, paid-looking booking on a refundable rail, HOURS_TO_START hours before its session. */
async function seedConfirmedBooking(): Promise<void> {
  await sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
      currency, payment_id, payment_method, created_at
    ) VALUES (
      ${bookingId}, ${listingId}, ${1}, ${bookerId},
      now() + make_interval(hours => ${HOURS_TO_START}),
      now() + make_interval(hours => ${HOURS_TO_START + 1}),
      ${"confirmed"}::booking_status, ${"instant"}::booking_mode,
      ${"standard"}::cancellation_policy, ${SPACE_PRICE_CENTS}, ${SERVICE_FEE_CENTS},
      ${SPACE_PRICE_CENTS + SERVICE_FEE_CENTS}, ${"php"},
      ${`pay_e2e_${randomUUID()}`}, ${"gcash"}, now()
    )
  `;
}

/** Parse "₱1,050" / "₱1,050.00" into integer centavos, so the assertion is on MONEY, not on a string. */
function parseMoneyToCents(label: string): number {
  const cleaned = label.replace(/[^\d.]/g, "");
  return Math.round(Number(cleaned) * 100);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await seedHostAndListing();

  // Sign the booker up through the UI (intent "book" → canBook server-side, D-41) and capture the session.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Cassie");
  await page.getByLabel("Email").fill(bookerEmail);
  await page.getByLabel("Password").fill(bookerPassword);
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 20_000 });
  bookerState = await ctx.storageState();
  await ctx.close();

  const [row] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${bookerEmail}`;
  bookerId = row.id;
  await seedConfirmedBooking();
});

test.afterAll(async () => {
  // Bookings FIRST (booker_id is ON DELETE RESTRICT), then the host (cascades the listing), then the booker.
  await sql`DELETE FROM notification WHERE booking_id = ${bookingId}`;
  await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
  await sql.end();
});

async function loginAsBooker(page: Page): Promise<void> {
  await page.context().addCookies(bookerState.cookies);
}

test.describe("booker cancellation — the previewed refund is the refund given (SC#2)", () => {
  test("bookings list → cancel review → exact itemised refund → confirm → same amount persisted", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsBooker(page);

    // ── The booking is visible on the booker's own list (MANAGE-01). ───────────────────────────────────
    await page.goto(`${BASE}/bookings`);
    await expect(page.getByText(LISTING_TITLE).first()).toBeVisible();

    // ── The ENTRY POINT (D-104). Below the primary content on the detail page, and a LINK to the review —
    //    never an inline action, so the itemised breakdown is always seen before money moves. ────────────
    await page.goto(`${BASE}/bookings/${bookingId}`);
    const cancelEntry = page.getByRole("link", { name: "Cancel booking" });
    await expect(cancelEntry).toBeVisible();
    await cancelEntry.click();
    await page.waitForURL(new RegExp(`/bookings/${bookingId}/cancel$`), { timeout: 20_000 });

    // ── The SC#2 review screen, reached the way a booker reaches it. ───────────────────────────────────
    await expect(page.getByRole("heading", { name: /cancel this booking\?/i })).toBeVisible();

    // The tier rationale explains WHICH policy and WHY this rung (D-78's "which tier applies and why").
    await expect(page.getByText(/uses the Standard cancellation policy/i)).toBeVisible();
    await expect(page.getByText(/50% of the space price is refunded/i)).toBeVisible();

    // The full six-element itemisation, including the UNCONDITIONAL non-refundable disclosure (C2).
    await expect(page.getByText("You paid", { exact: true })).toBeVisible();
    await expect(page.getByText("Space price", { exact: true })).toBeVisible();
    await expect(page.getByText("Service fee", { exact: true })).toBeVisible();
    await expect(page.getByText("Service fee refund", { exact: true })).toBeVisible();
    await expect(page.getByText(/Service fees aren.t refunded/i)).toBeVisible();
    await expect(page.getByText("Refund to you", { exact: true })).toBeVisible();

    // ── CAPTURE THE PREVIEWED NUMBER off the rendered page. This is the value the whole spec turns on. ─
    const previewedLabel = (
      await page.getByText("Refund to you", { exact: true }).locator("xpath=following-sibling::dd[1]").textContent()
    )?.trim();
    expect(previewedLabel).toBeTruthy();
    const previewedCents = parseMoneyToCents(previewedLabel!);
    expect(previewedCents).toBe(EXPECTED_REFUND_CENTS);

    // The confirm is neutral, and the calmer `Keep booking` sits beside it (07-UI-SPEC § 3).
    await expect(page.getByRole("link", { name: "Keep booking" })).toBeVisible();

    // ── Confirm. ──────────────────────────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await page.waitForURL(new RegExp(`/bookings/${bookingId}$`), { timeout: 20_000 });

    // ── THE ASSERTION THIS SPEC EXISTS FOR: previewed === persisted, to the centavo. ───────────────────
    await expect
      .poll(
        async () => {
          const [row] = await sql<{ status: string; refund_cents: number | null }[]>`
            SELECT status::text AS status, refund_cents FROM booking WHERE id = ${bookingId}
          `;
          return row ? `${row.status}:${row.refund_cents}` : "missing";
        },
        { timeout: 15_000 },
      )
      .toBe(`cancelled:${previewedCents}`);

    // And the retained half — the D-69 payout basis — is the exact complement, no centavo invented or lost.
    const [row] = await sql<{ refund_cents: number; retained_space_cents: number; space_price_cents: number }[]>`
      SELECT refund_cents, retained_space_cents, space_price_cents FROM booking WHERE id = ${bookingId}
    `;
    expect(row.refund_cents + row.retained_space_cents).toBe(row.space_price_cents);
    // The service fee never came back: at most the space price can, and here exactly half of it did.
    expect(row.refund_cents).toBeLessThan(SPACE_PRICE_CENTS + SERVICE_FEE_CENTS);

    // ── The booker's own surfaces now show the cancellation (MANAGE-01 / D-79). ───────────────────────
    await page.goto(`${BASE}/bookings?tab=past`);
    await expect(page.getByText(/cancelled/i).first()).toBeVisible();
  });

  test("re-opening the review screen for an already-cancelled booking redirects, never re-refunds", async ({
    page,
  }) => {
    // The review route is status-scoped to `confirmed`. A booker who bookmarked the URL, or hit back after
    // confirming, must land somewhere calm — never on a second confirm button over money already returned.
    await loginAsBooker(page);
    await page.goto(`${BASE}/bookings/${bookingId}/cancel`);
    await page.waitForURL(new RegExp(`/bookings/${bookingId}$`), { timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);

    // And the ENTRY is gone too (07-12) — a terminal booking offers no route back into the money flow, so
    // there is no second door to the confirm the assertion above just proved is absent.
    await expect(page.getByRole("link", { name: "Cancel booking" })).toHaveCount(0);

    // The detail page now RENDERS the cancellation rather than 404ing it, with the refund as a muted sibling
    // line beneath the badge (D-79) — and phrased "on its way", never "refunded", because the webhook is the
    // single writer of terminal refund state (D-57).
    await expect(page.getByText(/refund on its way/i)).toBeVisible();

    // The refund column is still the single value written by the one successful cancel.
    const [row] = await sql<{ refund_cents: number }[]>`
      SELECT refund_cents FROM booking WHERE id = ${bookingId}
    `;
    expect(row.refund_cents).toBe(EXPECTED_REFUND_CENTS);
  });
});
