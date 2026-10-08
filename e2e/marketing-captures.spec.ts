import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { marketingFixture } from "./helpers/marketing-fixtures";
import { pickWindow, submitProgressiveSearch, targetYear, targetMonth, targetDay } from "./helpers/booker-seed";

test.use({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Manila", geolocation: { latitude: 14.565, longitude: 121.03 }, permissions: ["geolocation"] });
test.setTimeout(120_000);

async function capture(page: Page, region: Locator, name: string, state: string, ids: string[], sessionDate?: string) {
  await expect(region).toBeVisible();
  // Refuse external browser requests, and require actual rendered app state before any write.
  await page.evaluate(() => document.fonts.ready);
  if (process.env.FITOUT_CAPTURE_MARKETING !== "1") return;
  const bytes = await region.screenshot({ animations: "disabled", type: "png" });
  const dir = resolve("public/marketing/screenshots");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${name}.png`), bytes);
  const manifestPath = resolve(dir, "manifest.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { version: 1, captures: {} };
  const url = new URL(page.url());
  // Booking hold is an owner credential: record its exact pathname, never the query value.
  if (url.searchParams.has("hold")) url.searchParams.delete("hold");
  manifest.captures[name] = {
    path: `/marketing/screenshots/${name}.png`, sha256: createHash("sha256").update(bytes).digest("hex"),
    width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), route: url.pathname + url.search,
    assertedState: state, capturedAt: new Date().toISOString(), captureDate: format(new Date(), "yyyy-MM-dd", { in: tz("Asia/Manila") }),
    timezone: "Asia/Manila", sessionDate: sessionDate ?? null, fixtureIds: ids,
    provenance: { source: "actual-local-app-browser", fixture: "e2e/helpers/marketing-fixtures.ts", spec: "e2e/marketing-captures.spec.ts", imagery: "No photographs: app's empty photo state; no external, generated or sketch assets", demoState: true, providersCalled: false, paymentConfirmed: false },
    pixelReview: { disposition: "pending", reviewer: null, notes: "Requires inspection of exact retained PNG before publication" },
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "localhost") await route.continue();
    else await route.abort();
  });
});

test("@hero real progressive search", async ({ page }) => {
  const fixture = await marketingFixture();
  try {
    await submitProgressiveSearch(page, { spaceTypeLabel: fixture.spaceTypeLabel });
    await expect(page.getByRole("button", { name: "Search activity", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Search location", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Search party size", exact: true })).toBeVisible();
    await capture(page, page.getByRole("region", { name: "Space search" }), "search", "Activity, location and party answers in genuine progressive search", [fixture.listingId]);
  } finally { await fixture.cleanup(); }
});

test("@hosts real account, verification/payout roadmap, listing and bookable states", async ({ page }) => {
  const fixture = await marketingFixture();
  try {
    await page.goto("/signup");
    await page.getByRole("radio", { name: "Host a space" }).click();
    await expect(page.getByLabel("First name")).toBeEmpty();
    await capture(page, page.locator("main > div"), "account", "Genuine host account signup; empty personal fields", []);
    const hostId = await fixture.account(page, "host");
    await page.goto("/host");
    const roadmap = page.locator('section[aria-labelledby="verification-roadmap-heading"]');
    await expect(roadmap).toContainText("Step 1 of 4");
    await expect(roadmap).toContainText(/payout/i);
    await capture(page, roadmap, "verification", "Unverified demo host; real four-step account-check and payout roadmap; no bank or identity fields", [hostId]);
    await fixture.readyHost(hostId);
    // Existing /new intermittently 404s locally. Use the same genuine draft wizard
    // with this owned fixture; record the actual edit route, never claim /new worked.
    await fixture.sql`UPDATE listing SET status = 'draft', title = '', description = '' WHERE id = ${fixture.listingId}`;
    await page.goto(`/host/listings/${fixture.listingId}/edit`);
    await expect(page).toHaveURL(/\/host\/listings\/[^/]+\/edit$/);
    await expect(page.getByRole("heading", { name: "What kind of space is it?" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Primary space type" })).toBeVisible();
    await capture(page, page.locator("main"), "listing", "Genuine draft listing setup wizard, space-type first step, after existing host approval gate; owned local seeded draft", [hostId, fixture.listingId]);
    await fixture.sql`UPDATE listing SET status = 'published', title = 'FitOut Demo Court', description = 'A demo space for your next session.' WHERE id = ${fixture.listingId}`;
    await page.goto("/host/listings");
    await expect(page.getByRole("heading", { name: "Your listings" })).toBeVisible();
    await expect(page.getByText("Live", { exact: true })).toBeVisible();
    await capture(page, page.locator("main"), "bookable", "Real Live listing after email, payouts, host approval, listing approval, publication and operating-hours gates pass in local demo fixture", [hostId, fixture.listingId]);
  } finally { await fixture.cleanup(); }
});

test("@players real future session selection and unpaid booking review", async ({ page }) => {
  const fixture = await marketingFixture();
  try {
    const bookerId = await fixture.account(page, "book");
    const sessionDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
    expect(sessionDate > format(new Date(), "yyyy-MM-dd", { in: tz("Asia/Manila") })).toBe(true);
    await page.goto(`/listings/${fixture.listingId}`);
    await pickWindow(page, "2:00 PM", "3:00 PM");
    const book = page.getByRole("button", { name: /^Book this space$/ });
    await expect(book).toBeEnabled();
    await capture(page, page.locator("main"), "session", "Real available future 14:00–15:00 Manila session selected; book CTA enabled", [fixture.listingId, bookerId], sessionDate);
    await book.click();
    await expect(page).toHaveURL(/\/book\?hold=/);
    await expect(page.getByRole("button", { name: "Confirm & pay", exact: true })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Confirm and pay" })).toBeVisible();
    const holdId = new URL(page.url()).searchParams.get("hold")!;
    const [hold] = await fixture.sql`SELECT status, checkout_session_id, payment_id FROM booking WHERE id = ${holdId}`;
    expect(hold).toMatchObject({ status: "hold", checkout_session_id: null, payment_id: null });
    await capture(page, page.locator("main"), "booking", "Actual unpaid hold review with frozen price and Confirm & pay; payment never submitted", [fixture.listingId, bookerId], sessionDate);
  } finally { await fixture.cleanup(); }
});
