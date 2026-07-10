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

import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const BASE = "http://localhost:3000";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as tests/helpers/db.ts does).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

const hostId = `e2e_host_${randomUUID()}`;
const publishedId = `e2e_pub_${randomUUID()}`;
const draftId = `e2e_draft_${randomUUID()}`;
const unlistedId = `e2e_unlisted_${randomUUID()}`;

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
});

test.afterAll(async () => {
  // Deleting the host cascades to its listings, photos, and amenities (ON DELETE CASCADE).
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql.end();
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
