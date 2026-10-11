import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const marketing = "http://marketing.localhost:3000";
test("@ui owner feedback: centered nav, photo heroes, removed captions and responsive layout", async ({ page }) => {
  test.setTimeout(180_000);
  const dir = resolve(".planning/notes/marketing-ui-20261012");
  mkdirSync(dir, { recursive: true });
  for (const width of [1310, 768, 375, 320]) {
    await page.setViewportSize({ width, height: width > 1000 ? 900 : 850 });
    for (const path of ["/", "/hosts", "/players", "/about", "/contact"]) {
      const response = await page.goto(marketing + path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("header[data-hydrated]")).toHaveAttribute("data-hydrated", "true");
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (path !== "/contact") {
        await expect(page.locator(".marketing-hero-photo img")).toBeVisible();
        await page.locator(".marketing-hero-photo img").evaluate((image) => (image as HTMLImageElement).decode());
        expect(await page.locator("figcaption").count()).toBe(0);
        await expect(page.getByText(/Demo app screens|Demo host signup|Demo account with checks/)).toHaveCount(0);
      }
      if (width === 1310) {
        const nav = await page.getByRole("navigation", { name: "Main navigation" }).boundingBox();
        expect(nav).not.toBeNull();
        expect(Math.abs(nav!.x + nav!.width / 2 - width / 2)).toBeLessThan(2);
      }
      if (width === 1310 || width === 375) {
        for (const image of await page.locator("img").all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate((element) => (element as HTMLImageElement).decode());
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: resolve(dir, `${path === "/" ? "home" : path.slice(1)}-${width}.png`), fullPage: true, animations: "disabled", style: "nextjs-portal { display: none; }" });
      }
    }
    if (width < 1024) {
      const menu = page.getByRole("button", { name: "Menu", exact: true });
      await menu.click();
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
    }
  }
});
