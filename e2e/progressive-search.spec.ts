import { expect, test, type Page } from "@playwright/test";

import { expectAxeClean } from "./helpers/axe";
import { BASE, seedBookableListing, type SeededListing } from "./helpers/booker-seed";

const LOCATION = { latitude: 14.5547, longitude: 121.0244 };
const ADDRESS_LABEL = "2 Real Street, Makati, Metro Manila, Philippines";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
] as const;

async function mockAddressLookup(page: Page) {
  await page.route("https://photon.komoot.io/api**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        features: [{
          geometry: { coordinates: [LOCATION.longitude, LOCATION.latitude] },
          properties: { name: "2 Real Street", city: "Makati", state: "Metro Manila", country: "Philippines" },
        }],
      }),
    });
  });
}

async function chooseActivity(page: Page, label: string) {
  await page.getByRole("button", { name: "Search activity" }).click();
  await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeFocused();
  const filter = page.locator('[data-slot="command-input"]');
  await expect(filter).toHaveAttribute("aria-label", "Search for activity or type");
  await filter.fill(label);
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(page.getByTestId("search-results-region")).toHaveCount(1);
  await expect(page).toHaveURL(/category=/);
}

async function chooseAddress(page: Page) {
  await page.getByRole("button", { name: "Search location" }).click();
  await expect(page.getByRole("heading", { name: "Where do you want to play?" })).toBeFocused();
  await page.getByRole("combobox", { name: "Search for your address" }).click();
  await page.getByPlaceholder("Type a street or city…").fill("Makati");
  await page.getByRole("option", { name: /2 Real Street, Makati/i }).click();
  await expect(page.getByTestId("search-results-region")).toHaveCount(1);
  await expect(page).toHaveURL(/locationLabel=/);
}

async function chooseSolo(page: Page) {
  await page.getByRole("button", { name: "Search party size" }).click();
  await expect(page.getByRole("heading", { name: "Who is this for?" })).toBeFocused();
  await page.getByRole("button", { name: "For me" }).click();
  await expect(page).toHaveURL(/partySize=1/);
}

async function chooseGroup(page: Page, size: number) {
  await page.getByRole("button", { name: "Search party size" }).click();
  await page.getByRole("button", { name: "For a group" }).click();
  await page.getByLabel("Number of people").fill(String(size));
  await page.getByRole("button", { name: "See spaces" }).click();
  await expect(page).toHaveURL(new RegExp(`partySize=${size}`));
}

function expectOneSearchTree(page: Page) {
  return Promise.all([
    expect(page.getByLabel("Space search")).toHaveCount(1),
    expect(page.getByTestId("search-results-region")).toHaveCount(1),
  ]);
}

test.describe.serial("independent search fields", () => {
  let equalCapacity: SeededListing;
  let aboveCapacity: SeededListing;
  let undersized: SeededListing;

  test.beforeAll(async () => {
    equalCapacity = await seedBookableListing({ titlePrefix: "Search equal capacity" });
    aboveCapacity = await seedBookableListing({ titlePrefix: "Search above capacity" });
    undersized = await seedBookableListing({ titlePrefix: "Search undersized" });
    await equalCapacity.sql`UPDATE listing SET max_occupancy = 4 WHERE id = ${equalCapacity.listingId}`;
    await aboveCapacity.sql`UPDATE listing SET max_occupancy = 8 WHERE id = ${aboveCapacity.listingId}`;
    await undersized.sql`UPDATE listing SET max_occupancy = 3 WHERE id = ${undersized.listingId}`;
  });

  test.afterAll(async () => {
    await Promise.all([equalCapacity.teardown(), aboveCapacity.teardown(), undersized.teardown()]);
  });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name}: each field searches on its own, and combined answers filter capacity`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockAddressLookup(page);
      await page.goto(BASE);
      await expect(page.getByRole("button", { name: "Search activity" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Search location" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Search party size" })).toBeVisible();

      await chooseActivity(page, equalCapacity.spaceTypeLabel);
      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      await expect(page).toHaveURL(/category=/);

      await chooseAddress(page);
      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      await expect(page).toHaveURL(/locationLabel=/);

      await chooseGroup(page, 4);
      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      await expect(page.getByRole("link", { name: aboveCapacity.title })).toBeVisible();
      await expect(page.getByRole("link", { name: undersized.title })).toHaveCount(0);
      await expectOneSearchTree(page);
      const url = new URL(page.url());
      expect(url.searchParams.get("category")).toBeTruthy();
      expect(url.searchParams.get("locationLabel")).toBe(ADDRESS_LABEL);
      expect(url.searchParams.get("partySize")).toBe("4");
      const shared = page.url();
      await page.reload();
      await expect(page).toHaveURL(shared);
      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();

      await chooseGroup(page, 1000);
      await expect(page.getByRole("heading", { name: "No spaces match those answers" })).toBeVisible();
      await expectOneSearchTree(page);
    });

    test(`${viewport.name}: location and party alone return results`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockAddressLookup(page);
      await page.goto(BASE);
      await chooseAddress(page);
      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      expect(new URL(page.url()).searchParams.has("category")).toBe(false);
      await page.goto(BASE);
      await chooseSolo(page);
      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      expect(new URL(page.url()).searchParams.get("partySize")).toBe("1");
      expect(new URL(page.url()).searchParams.has("category")).toBe(false);
    });

    test(`${viewport.name}: dialog remains reachable and Cancel restores the field`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(BASE);
      const results = page.getByTestId("search-results-region");
      await expect(results).toBeVisible();
      const before = await results.boundingBox();
      await page.getByRole("button", { name: "Search activity" }).click();
      const dialog = page.getByRole("dialog", { name: "Search spaces" });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeFocused();
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      if (viewport.width > 600) {
        expect(box!.width).toBeGreaterThan(600);
        expect(box!.width).toBeLessThanOrEqual(768);
      } else {
        expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
      }
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(`${BASE}/`);
      await expect(page.getByRole("button", { name: "Search activity" })).toBeFocused();
      expect((await results.boundingBox())?.y).toBe(before?.y);
      await expectAxeClean(page, `${viewport.name} independent search idle`);
    });
  }

  test("location denial keeps manual address entry available", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
        configurable: true,
        value: (_success: PositionCallback, failure?: PositionErrorCallback) => failure?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      });
    });
    await page.goto(BASE);
    await page.getByRole("button", { name: "Search location" }).click();
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByRole("status", { name: "Search progress" })).toContainText("Type an address instead");
    await expect(page.getByRole("combobox", { name: "Search for your address" })).toBeVisible();
    await expect(page).toHaveURL(`${BASE}/`);
  });

  test("a late geolocation result cannot search after Cancel", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
        configurable: true,
        value: (success: PositionCallback) => {
          (window as Window & { releaseLocationCallback?: () => void }).releaseLocationCallback = () => {
            success({ coords: { latitude: 14.5547, longitude: 121.0244 } } as GeolocationPosition);
          };
        },
      });
    });
    await page.goto(BASE);
    await page.getByRole("button", { name: "Search location" }).click();
    await page.getByRole("button", { name: "Use my location" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.evaluate(() => (window as Window & { releaseLocationCallback?: () => void }).releaseLocationCallback?.());
    await expect(page).toHaveURL(`${BASE}/`);
    await expect(page.getByRole("button", { name: "Search location" })).toBeVisible();
  });
});
