// LIST-06 / D-13 — the PUBLIC listing detail page is reachable WITHOUT a session; unlisted/draft
// listings 404 to the public.
//
// RED until Plan 05 (src/app/listings/[id]/page.tsx placed OUTSIDE the (app)/(host) gated groups, plus
// a seeded/published listing). Marked test.fixme so they are SKIPPED (not failing) until Plan 05
// implements the public route. Plan 05's <verify> runs `playwright test e2e/public-listing.spec.ts`
// and replaces the SEEDED_* placeholders with real ids + un-fixmes the tests.

import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("public listing detail page (LIST-06) — RED until Plan 05", () => {
  test.fixme(
    "a published listing is viewable by an anonymous visitor (no session)",
    async ({ page }) => {
      const listingId = "SEEDED_PUBLISHED_LISTING_ID"; // Plan 05 seeds/publishes a listing.
      await page.goto(`${BASE}/listings/${listingId}`);
      await expect(page.getByRole("heading").first()).toBeVisible();
      // The book CTA reflects bookability state (D-13): a real "Book" or a disabled "Not bookable yet".
      await expect(
        page.getByRole("button", { name: /book|not bookable yet/i }),
      ).toBeVisible();
    },
  );

  test.fixme("a draft listing 404s to the public", async ({ page }) => {
    const draftId = "SEEDED_DRAFT_LISTING_ID";
    const res = await page.goto(`${BASE}/listings/${draftId}`);
    expect(res?.status()).toBe(404);
  });

  test.fixme("an unlisted listing 404s to the public", async ({ page }) => {
    const unlistedId = "SEEDED_UNLISTED_LISTING_ID";
    const res = await page.goto(`${BASE}/listings/${unlistedId}`);
    expect(res?.status()).toBe(404);
  });
});
