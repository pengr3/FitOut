import { expect, test } from "@playwright/test";

import { BASE, seedBookableListing, type SeededListing } from "./helpers/booker-seed";

test.describe.serial("progressive search", () => {
  let eligible: SeededListing;
  let ineligible: SeededListing;

  test.beforeAll(async () => {
    eligible = await seedBookableListing({ titlePrefix: "Progressive eligible" });
    ineligible = await seedBookableListing({ titlePrefix: "Progressive ineligible" });
    await ineligible.sql`UPDATE listing SET max_occupancy = NULL WHERE id = ${ineligible.listingId}`;
  });

  test.afterAll(async () => {
    await eligible.teardown();
    await ineligible.teardown();
  });

  test("address and For me reach capacity-filtered results", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole("button", { name: "Start your search" })).toBeVisible();
    await expect(page.getByLabel("Search for activity or type")).toHaveCount(0);

    await page.getByRole("button", { name: "Start your search" }).click();
    await page.getByRole("option", { name: eligible.spaceTypeLabel, exact: true }).click();

    await page.route("https://photon.komoot.io/api/**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          features: [{ geometry: { coordinates: [121.0244, 14.5547] }, properties: { name: "2 Real Street", city: "Makati", state: "Metro Manila", country: "Philippines" } }],
        }),
      });
    });
    await page.getByRole("button", { name: "Search for your address" }).click();
    await page.getByPlaceholder("Type a street or city…").fill("Makati");
    await page.getByRole("option", { name: /2 Real Street, Makati/i }).click();
    await page.getByRole("button", { name: "For me" }).click();

    await expect(page).toHaveURL(
      new RegExp("^http://localhost:3000/\\?category=martial_arts_boxing&lat=14\\.5547&lng=121\\.0244&locationLabel=2\\+Real\\+Street%2C\\+Makati%2C\\+Metro\\+Manila%2C\\+Philippines&partySize=1$"),
    );
    await expect(page.getByRole("link", { name: eligible.title })).toBeVisible();
    await expect(page.getByRole("link", { name: ineligible.title })).toHaveCount(0);

    await page.getByRole("button", { name: /Activity:/ }).click();
    await expect(page.getByRole("heading", { name: /What are you looking for/i })).toBeFocused();
    await page.getByRole("button", { name: /Location:/ }).click();
    await expect(page.getByRole("heading", { name: /Where do you want to play/i })).toBeFocused();
    await page.getByRole("button", { name: "1 person" }).click();
    await expect(page.getByRole("heading", { name: /Who is this for/i })).toBeFocused();
  });

  test("Use my location reaches the same solo results contract", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"], { origin: BASE });
    await context.setGeolocation({ latitude: 14.5547, longitude: 121.0244 });
    await page.goto(BASE);
    await page.getByRole("button", { name: "Start your search" }).click();
    await page.getByRole("option", { name: eligible.spaceTypeLabel, exact: true }).click();
    await page.getByRole("button", { name: "Use my location" }).click();
    await page.getByRole("button", { name: "For me" }).click();

    await expect(page).toHaveURL(/partySize=1/);
    await expect(page).toHaveURL(/locationLabel=Current\+location/);
    await expect(page.getByRole("link", { name: eligible.title })).toBeVisible();
  });
});
