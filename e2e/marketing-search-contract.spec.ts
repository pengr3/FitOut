import { expect, test, type Page } from "@playwright/test";

const base = "http://localhost:3000";

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

for (const width of [320, 375, 768, 1440]) {
  test(`real search retains one focused panel and input across resize at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://marketing.localhost:3000/");
    await page.getByRole("link", { name: "Open App", exact: true }).click();
    const group = page.getByRole("group", { name: "Search spaces", exact: true });
    await expect(group).toHaveCount(1);
    const trigger = group.getByRole("button", { name: "Start your search", exact: true });
    await expect(trigger).toBeVisible();
    const anchor = await trigger.boundingBox();
    expect(anchor).not.toBeNull();
    await trigger.click();
    const panel = page.getByRole("dialog", { name: "Search spaces", exact: true });
    await expect(panel).toHaveCount(1);
    const heading = panel.getByRole("heading", { name: "What are you looking for?", exact: true });
    await expect(heading).toBeFocused();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    if (width < 640) {
      expect(box!.x).toBe(0);
      expect(box!.y).toBe(0);
      expect(box!.width).toBe(width);
      expect(box!.height).toBe(900);
    } else {
      expect(Math.abs(box!.y - (anchor!.y + anchor!.height + 8))).toBeLessThan(2);
      expect(box!.x).toBeGreaterThanOrEqual(16);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width - 15);
    }
    const input = panel.getByRole("combobox", { name: "Search for activity or type" });
    await input.fill("basket");
    await input.evaluate((element) => { (window as Window & { retainedSearchInput?: Element }).retainedSearchInput = element; });
    await page.setViewportSize({ width: width < 640 ? 1440 : 375, height: 900 });
    await expect(panel).toHaveCount(1);
    await expect(input).toHaveValue("basket");
    await expect(input).toBeFocused();
    expect(await input.evaluate((element) => element === (window as Window & { retainedSearchInput?: Element }).retainedSearchInput)).toBe(true);
    await noOverflow(page);
    expect(context.pages()).toEqual([page]);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(panel.getByRole("combobox", { name: "Search for activity or type" })).toHaveValue("");
    await panel.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await noOverflow(page);
  });
}

test("URL-backed long answers retain identity, edit focus and browser Back", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(base);
  const query = new URLSearchParams({ category: "basketball", lat: "14.5547", lng: "121.0244", partySize: "2", locationLabel: "A long resolved location address in Metro Manila with a building, street, district and city" });
  await page.goto(`${base}/?${query}`);
  const group = page.getByRole("group", { name: "Search spaces", exact: true });
  await expect(group).toHaveCount(1);
  const location = group.getByRole("button", { name: /^Location:/ });
  await expect(location).toBeVisible();
  await noOverflow(page);
  const before = page.url();
  await location.click();
  const panel = page.getByRole("dialog", { name: "Search spaces", exact: true });
  await expect(panel.getByRole("heading", { name: "Where do you want to play?", exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(page.url()).toBe(before);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  // Cancel intentionally clears the progressive journey; browser Back restores the URL answers.
  await expect(page).toHaveURL(`${base}/`);
  await page.goBack();
  await expect(page).toHaveURL(before);
  await expect(page.getByRole("button", { name: /^Location:/ })).toHaveCount(1);
  expect(context.pages()).toEqual([page]);
});
