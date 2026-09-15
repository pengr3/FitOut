import { expect, test, type Page } from "@playwright/test";

import { expectAxeClean } from "./helpers/axe";
import { BASE, seedBookableListing, type SeededListing } from "./helpers/booker-seed";

const ADDRESS_LABEL = "2 Real Street, Makati, Metro Manila, Philippines";
const LOCATION = { latitude: 14.5547, longitude: 121.0244 };
const MANDALUYONG_LOCATION = { latitude: 14.5794, longitude: 121.0359 };
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile-375", width: 375, height: 812 },
] as const;

function expectedUrl(partySize: number, locationLabel = ADDRESS_LABEL) {
  const query = new URLSearchParams({
    category: "martial_arts_boxing",
    lat: String(LOCATION.latitude),
    lng: String(LOCATION.longitude),
    locationLabel,
    partySize: String(partySize),
  });
  return `${BASE}/?${query.toString()}`;
}

async function mockAddressLookup(page: Page) {
  // Photon requests its query directly on `/api` (there is no path segment after it), so the route
  // pattern deliberately includes the query string rather than the old non-matching `/api/**` shape.
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

async function beginActivity(page: Page, seed: SeededListing, keyboard = false) {
  await expect(page.getByRole("button", { name: "Start your search" })).toHaveCount(1);
  await expect(page.getByLabel("Search for activity or type")).toHaveCount(0);
  await page.getByRole("button", { name: "Start your search" }).click();
  await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeFocused();

  // cmdk owns the native input's composite ARIA semantics; anchor to the repository's stable slot
  // and assert the public label explicitly rather than asking the label engine to infer it through cmdk.
  const filter = page.locator('[data-slot="command-input"]');
  await expect(filter).toHaveAttribute("aria-label", "Search for activity or type");
  await filter.fill("not-in-the-catalogue");
  await expect(page.getByText("No matching activity or type")).toBeVisible();
  await expect(filter).toBeFocused();
  await expect(page).toHaveURL(`${BASE}/`);

  await filter.fill(seed.spaceTypeLabel);
  const option = page.getByRole("option", { name: seed.spaceTypeLabel, exact: true });
  if (keyboard) {
    await option.focus();
    await page.keyboard.press("Enter");
  } else {
    await option.click();
  }
  await expect(page.getByRole("heading", { name: "Where do you want to play?" })).toBeFocused();
}

async function chooseAddress(page: Page) {
  await page.getByRole("combobox", { name: "Search for your address" }).click();
  await page.getByPlaceholder("Type a street or city…").fill("Makati");
  await page.getByRole("option", { name: /2 Real Street, Makati/i }).click();
  await expect(page.getByRole("heading", { name: "Who is this for?" })).toBeFocused();
}

async function submitSoloAddressSearch(page: Page, seed: SeededListing) {
  await mockAddressLookup(page);
  await page.goto(BASE);
  await beginActivity(page, seed);
  await chooseAddress(page);
  await page.getByRole("button", { name: "For me" }).click();
  await expect(page).toHaveURL(expectedUrl(1));
}

async function submitGroupLocationSearch(page: Page, seed: SeededListing, partySize = 4) {
  await page.goto(BASE);
  await beginActivity(page, seed, true);
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByRole("heading", { name: "Who is this for?" })).toBeFocused();
  await page.getByRole("button", { name: "For a group" }).click();
  await page.getByLabel("Number of people").fill(String(partySize));
  await page.getByRole("button", { name: "See spaces" }).click();
  await expect(page).toHaveURL(expectedUrl(partySize, "Current location"));
}

async function expectExactlyOneJourneyTree(page: Page) {
  await expect(page.getByLabel("Space search")).toHaveCount(1);
  await expect(page.getByTestId("search-results-region")).toHaveCount(1);
  await expect(page.getByTestId("search-idle-pill-shell")).toHaveCount(0);
}

test.describe.serial("progressive search", () => {
  let equalCapacity: SeededListing;
  let aboveCapacity: SeededListing;
  let undersized: SeededListing;
  let noCapacity: SeededListing;

  test.beforeAll(async () => {
    equalCapacity = await seedBookableListing({ titlePrefix: "Progressive equal capacity" });
    aboveCapacity = await seedBookableListing({ titlePrefix: "Progressive above capacity" });
    undersized = await seedBookableListing({ titlePrefix: "Progressive undersized" });
    noCapacity = await seedBookableListing({ titlePrefix: "Progressive no capacity" });
    await equalCapacity.sql`UPDATE listing SET max_occupancy = 4 WHERE id = ${equalCapacity.listingId}`;
    await aboveCapacity.sql`UPDATE listing SET max_occupancy = 8 WHERE id = ${aboveCapacity.listingId}`;
    await undersized.sql`UPDATE listing SET max_occupancy = 3 WHERE id = ${undersized.listingId}`;
    await noCapacity.sql`UPDATE listing SET max_occupancy = NULL WHERE id = ${noCapacity.listingId}`;
  });

  test.afterAll(async () => {
    await Promise.all([equalCapacity.teardown(), aboveCapacity.teardown(), undersized.teardown(), noCapacity.teardown()]);
  });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} journey keeps answers, filters capacity, and Cancel returns to browse`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await submitSoloAddressSearch(page, equalCapacity);

      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      await expect(page.getByRole("link", { name: undersized.title })).toBeVisible();
      await expect(page.getByRole("link", { name: noCapacity.title })).toHaveCount(0);
      await expect(page.getByText(/maximum capacity|remaining places|spots remaining/i)).toHaveCount(0);
      await expectExactlyOneJourneyTree(page);

      await page.getByRole("button", { name: /^Activity:/ }).click();
      await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeFocused();
      await expect(page.locator('[data-slot="command-input"]')).toHaveValue(equalCapacity.spaceTypeLabel);
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page).toHaveURL(`${BASE}/`);
      await expect(page.getByRole("button", { name: "Start your search" })).toBeVisible();
    });

    test(`${viewport.name} group reload and share preserve canonical capacity-honest results`, async ({ page, context, browser }) => {
      await page.setViewportSize(viewport);
      await context.grantPermissions(["geolocation"], { origin: BASE });
      await context.setGeolocation(LOCATION);
      await submitGroupLocationSearch(page, equalCapacity);

      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      await expect(page.getByRole("link", { name: aboveCapacity.title })).toBeVisible();
      await expect(page.getByRole("link", { name: undersized.title })).toHaveCount(0);
      await expect(page.getByRole("link", { name: noCapacity.title })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^Activity:/ })).toHaveCount(1);
      await expect(page.getByRole("button", { name: /^Location:/ })).toHaveCount(1);
      await expect(page.getByRole("button", { name: "4 people" })).toHaveCount(1);

      const sharedUrl = page.url();
      await page.reload();
      await expect(page).toHaveURL(sharedUrl);
      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();

      const sharedContext = await browser.newContext({ viewport });
      const sharedPage = await sharedContext.newPage();
      try {
        await sharedPage.goto(sharedUrl);
        await expect(sharedPage.getByRole("button", { name: /^Activity:/ })).toHaveCount(1);
        await expect(sharedPage.getByRole("button", { name: /^Location:/ })).toHaveCount(1);
        await expect(sharedPage.getByRole("button", { name: "4 people" })).toHaveCount(1);
        await expect(sharedPage.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      } finally {
        await sharedContext.close();
      }

      await page.getByRole("button", { name: "4 people" }).click();
      await page.getByRole("button", { name: "For a group" }).click();
      await page.getByLabel("Number of people").fill("1000");
      await page.getByRole("button", { name: "See spaces" }).click();
      await expect(page.getByRole("heading", { name: "No spaces match those answers" })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Activity:/ })).toHaveCount(1);
      await expect(page.getByRole("button", { name: /^Location:/ })).toHaveCount(1);
      await expect(page.getByRole("button", { name: "1000 people" })).toHaveCount(1);
      await expect(page.getByText(/maximum capacity|remaining places|spots remaining/i)).toHaveCount(0);
      await expectExactlyOneJourneyTree(page);
    });
  }

  test("overlay and sheet geometry anchor the progressive flow without route reflow", async ({ page }) => {
    await mockAddressLookup(page);

    await page.setViewportSize(VIEWPORTS[0]);
    await page.goto(BASE);
    const desktopResults = page.getByTestId("search-results-region");
    const desktopResultsBefore = await desktopResults.boundingBox();
    const desktopTrigger = page.getByRole("button", { name: "Start your search" });
    const desktopTriggerBox = await desktopTrigger.boundingBox();
    expect(desktopResultsBefore, "the idle results region must be measurable").not.toBeNull();
    expect(desktopTriggerBox, "the desktop search pill must be measurable").not.toBeNull();

    await desktopTrigger.click();
    const desktopOverlay = page.getByTestId("progressive-search-desktop-overlay");
    await expect(desktopOverlay).toBeVisible();
    await expect(page.getByTestId("progressive-search-mobile-sheet")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "What are you looking for?" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeFocused();

    const desktopOverlayBox = await desktopOverlay.boundingBox();
    const desktopResultsAfter = await desktopResults.boundingBox();
    expect(desktopOverlayBox, "the active desktop popover must be measurable").not.toBeNull();
    expect(desktopResultsAfter, "the results region must remain measurable").not.toBeNull();
    expect(desktopResultsAfter!.y).toBe(desktopResultsBefore!.y);
    expect(Math.abs(desktopOverlayBox!.y - (desktopTriggerBox!.y + desktopTriggerBox!.height))).toBeLessThanOrEqual(16);
    expect(desktopOverlayBox!.x).toBeGreaterThanOrEqual(desktopTriggerBox!.x - 1);
    expect(desktopOverlayBox!.x).toBeLessThanOrEqual(desktopTriggerBox!.x + desktopTriggerBox!.width);

    const desktopFilter = page.locator('[data-slot="command-input"]');
    await desktopFilter.fill(equalCapacity.spaceTypeLabel);
    await page.getByRole("option", { name: equalCapacity.spaceTypeLabel, exact: true }).click();
    await chooseAddress(page);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Where do you want to play?" })).toBeFocused();
    await chooseAddress(page);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(`${BASE}/`);

    await page.setViewportSize(VIEWPORTS[1]);
    await page.goto(BASE);
    await page.getByRole("button", { name: "Start your search" }).click();
    const mobileSheet = page.getByTestId("progressive-search-mobile-sheet");
    await expect(mobileSheet).toBeVisible();
    await expect(page.getByTestId("progressive-search-desktop-overlay")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "What are you looking for?" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeFocused();

    const mobileSheetBox = await mobileSheet.boundingBox();
    const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
    expect(mobileSheetBox, "the active mobile sheet must be measurable").not.toBeNull();
    expect(Math.abs(mobileSheetBox!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(mobileSheetBox!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(mobileSheetBox!.width - viewport.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(mobileSheetBox!.height - viewport.height)).toBeLessThanOrEqual(1);

    const mobileFilter = page.locator('[data-slot="command-input"]');
    await mobileFilter.fill(equalCapacity.spaceTypeLabel);
    await page.getByRole("option", { name: equalCapacity.spaceTypeLabel, exact: true }).click();
    await chooseAddress(page);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Where do you want to play?" })).toBeFocused();
    await chooseAddress(page);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(`${BASE}/`);
  });

  test("direct-edit desktop popover reachability", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[0]);
    await submitSoloAddressSearch(page, equalCapacity);

    const activityChip = page.getByRole("button", { name: /^Activity:/ });
    const activityChipBox = await activityChip.boundingBox();
    expect(activityChipBox, "the selected Activity chip must be measurable").not.toBeNull();

    await activityChip.click();
    const overlay = page.getByTestId("progressive-search-desktop-overlay");
    const cancel = page.getByRole("button", { name: "Cancel" });
    await expect(overlay).toBeVisible();
    await expect(cancel).toBeVisible();

    const [overlayBox, cancelBox, viewport] = await Promise.all([
      overlay.boundingBox(),
      cancel.boundingBox(),
      page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
    ]);
    expect(overlayBox, "the direct-edit desktop overlay must be measurable").not.toBeNull();
    expect(cancelBox, "the direct-edit Cancel control must be measurable").not.toBeNull();

    const verticalAnchorGap = Math.min(
      Math.abs(overlayBox!.y - (activityChipBox!.y + activityChipBox!.height)),
      Math.abs((overlayBox!.y + overlayBox!.height) - activityChipBox!.y),
    );
    expect(verticalAnchorGap, "the Popover must sit adjacent to the initiating Activity chip").toBeLessThanOrEqual(16);
    expect(overlayBox!.x).toBeLessThanOrEqual(activityChipBox!.x + activityChipBox!.width);
    expect(overlayBox!.x + overlayBox!.width).toBeGreaterThanOrEqual(activityChipBox!.x);
    expect(cancelBox!.x).toBeGreaterThanOrEqual(overlayBox!.x);
    expect(cancelBox!.y).toBeGreaterThanOrEqual(overlayBox!.y);
    expect(cancelBox!.x + cancelBox!.width).toBeLessThanOrEqual(overlayBox!.x + overlayBox!.width);
    expect(cancelBox!.y + cancelBox!.height).toBeLessThanOrEqual(overlayBox!.y + overlayBox!.height);
    expect(cancelBox!.x).toBeGreaterThanOrEqual(0);
    expect(cancelBox!.y).toBeGreaterThanOrEqual(0);
    expect(cancelBox!.x + cancelBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(cancelBox!.y + cancelBox!.height).toBeLessThanOrEqual(viewport.height);

    await cancel.click();
    await expect(page).toHaveURL(`${BASE}/`);
    await expect(page.getByRole("button", { name: "Start your search" })).toBeVisible();
  });

  test("location denial leaves address entry recoverable without a URL", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
        configurable: true,
        value: (_success: PositionCallback, failure?: PositionErrorCallback) => failure?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      });
    });
    await page.setViewportSize(VIEWPORTS[0]);
    await page.goto(BASE);
    await beginActivity(page, equalCapacity);
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByRole("status", { name: "Search progress" })).toContainText("Type an address instead");
    await expect(page.getByRole("combobox", { name: "Search for your address" })).toBeVisible();
    await expect(page).toHaveURL(`${BASE}/`);
  });

  test("stale location callback cannot advance after Back and address remains usable", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
        configurable: true,
        value: (success: PositionCallback) => window.setTimeout(() => success({ coords: { latitude: 14.5547, longitude: 121.0244 } } as GeolocationPosition), 100),
      });
    });
    await mockAddressLookup(page);
    await page.setViewportSize(VIEWPORTS[1]);
    await page.goto(BASE);
    await beginActivity(page, equalCapacity);
    await page.getByRole("button", { name: "Use my location" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeFocused();
    await page.waitForTimeout(150);
    await expect(page.getByRole("heading", { name: "Who is this for?" })).toHaveCount(0);
    await expect(page).toHaveURL(`${BASE}/`);
    await page.getByRole("option", { name: equalCapacity.spaceTypeLabel, exact: true }).click();
    await chooseAddress(page);
  });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} keyboard focus, status ownership, reduced motion, axe, and one tree`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await mockAddressLookup(page);
      await page.goto(BASE);
      await expect(page.getByRole("button", { name: "Start your search" })).toBeVisible();
      await expectAxeClean(page, `${viewport.name} idle pill`);

      await beginActivity(page, equalCapacity, true);
      await expect(page.getByRole("status", { name: "Search progress" })).toHaveCount(1);
      await expectAxeClean(page, `${viewport.name} activity`);
      await expect(page.evaluate(() => document.activeElement === document.body)).resolves.toBe(false);

      await expect(page.getByRole("status", { name: "Address lookup" })).toHaveCount(1);
      await expectAxeClean(page, `${viewport.name} location`);
      await chooseAddress(page);
      await expect(page.getByRole("status", { name: "Search progress" })).toHaveCount(1);
      // AddressAutocomplete owns its lookup announcement while the location step is mounted; selecting
      // an address advances to party and removes that owner rather than leaving a second stale region.
      await expect(page.getByRole("status", { name: "Address lookup" })).toHaveCount(0);
      await expect(page.evaluate(() => document.activeElement === document.body)).resolves.toBe(false);
      await expectAxeClean(page, `${viewport.name} party`);

      await page.getByRole("button", { name: "For me" }).click();
      await expect(page.getByRole("link", { name: equalCapacity.title })).toBeVisible();
      await expectExactlyOneJourneyTree(page);
      await expectAxeClean(page, `${viewport.name} populated results`);

      await page.getByRole("button", { name: "1 person" }).click();
      await expect(page.getByRole("heading", { name: "Who is this for?" })).toBeFocused();
      await page.getByRole("button", { name: "For a group" }).click();
      await page.getByLabel("Number of people").fill("1000");
      await page.getByRole("button", { name: "See spaces" }).click();
      await expect(page.getByRole("heading", { name: "No spaces match those answers" })).toBeVisible();
      await expectExactlyOneJourneyTree(page);
      await expectAxeClean(page, `${viewport.name} calm empty results`);
    });
  }

  test("fixed 25 km cross-municipality reach keeps nearby Makati results nearest-first", async ({ page }) => {
    const seeded: SeededListing[] = [];
    try {
      const nearestMandaluyong = await seedBookableListing({ titlePrefix: "Fixed reach Mandaluyong nearest" });
      seeded.push(nearestMandaluyong);
      const nearbyMakati = await seedBookableListing({ titlePrefix: "Fixed reach Makati nearby" });
      seeded.push(nearbyMakati);
      const beyondReach = await seedBookableListing({ titlePrefix: "Fixed reach beyond 25 km" });
      seeded.push(beyondReach);

      await nearestMandaluyong.sql`
        UPDATE listing
        SET address_line1 = ${"Mandaluyong origin marker"}, city = ${"Mandaluyong"},
            location = ST_SetSRID(ST_MakePoint(${MANDALUYONG_LOCATION.longitude}, ${MANDALUYONG_LOCATION.latitude}), 4326)
        WHERE id = ${nearestMandaluyong.listingId}
      `;
      await nearbyMakati.sql`
        UPDATE listing
        SET address_line1 = ${"Nearby Makati marker"}, city = ${"Makati"},
            location = ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326)
        WHERE id = ${nearbyMakati.listingId}
      `;
      await beyondReach.sql`
        UPDATE listing
        SET address_line1 = ${"Beyond reach marker"}, city = ${"San Jose del Monte"},
            location = ST_SetSRID(ST_MakePoint(${121.081}, ${14.878}), 4326)
        WHERE id = ${beyondReach.listingId}
      `;

      await page.route("https://photon.komoot.io/api**", async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            features: [{
              geometry: { coordinates: [MANDALUYONG_LOCATION.longitude, MANDALUYONG_LOCATION.latitude] },
              properties: {
                name: "Mandaluyong City Hall",
                city: "Mandaluyong",
                state: "Metro Manila",
                country: "Philippines",
              },
            }],
          }),
        });
      });

      await page.goto(BASE);
      await beginActivity(page, nearestMandaluyong);
      await page.getByRole("combobox", { name: "Search for your address" }).click();
      await page.getByPlaceholder("Type a street or city…").fill("Mandaluyong");
      await page.getByRole("option", { name: /Mandaluyong City Hall, Mandaluyong/i }).click();
      await page.getByRole("button", { name: "For me" }).click();
      await page.waitForURL((current) => current.searchParams.get("lat") === String(MANDALUYONG_LOCATION.latitude));

      const url = new URL(page.url());
      expect(url.searchParams.get("lat")).toBe(String(MANDALUYONG_LOCATION.latitude));
      expect(url.searchParams.get("lng")).toBe(String(MANDALUYONG_LOCATION.longitude));
      expect(url.searchParams.has("radius")).toBe(false);

      const results = page.getByTestId("search-results-region");
      await expect(results.getByRole("link", { name: nearestMandaluyong.title })).toBeVisible();
      await expect(results.getByRole("link", { name: nearbyMakati.title })).toBeVisible();
      await expect(results.getByRole("link", { name: beyondReach.title })).toHaveCount(0);
      const resultHrefs = await results.getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      const nearestIndex = resultHrefs.findIndex((href) => href?.startsWith(`/listings/${nearestMandaluyong.listingId}`));
      const makatiIndex = resultHrefs.findIndex((href) => href?.startsWith(`/listings/${nearbyMakati.listingId}`));
      expect(nearestIndex, "the selected Mandaluyong listing must be first by distance").toBe(0);
      expect(makatiIndex, "the eligible Makati listing must follow the nearer Mandaluyong listing").toBeGreaterThan(nearestIndex);
    } finally {
      await Promise.all(seeded.map((listing) => listing.teardown()));
    }
  });
});
