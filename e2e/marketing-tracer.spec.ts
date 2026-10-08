import { expect, test } from "@playwright/test";

test("apex Home opens real anonymous app search in the same tab", async ({ page, context }) => {
  await page.goto("http://marketing.localhost:3000/");
  await expect(page.getByRole("heading", { name: "Good plans need a place." })).toBeVisible();
  const openApp = page.getByRole("link", { name: "Open App", exact: true });
  await expect(openApp).toHaveAttribute("href", "http://localhost:3000/");
  await openApp.click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: "Find a space to play" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Search spaces" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search activity", exact: true })).toBeVisible();
  await expect(page.getByText("Something went wrong loading spaces", { exact: true })).toHaveCount(0);
  expect(context.pages()).toEqual([page]);
  await expect(page.getByRole("heading", { name: "Good plans need a place." })).toHaveCount(0);
});

test("unknown authorities and direct marketing namespace fail closed", async ({ request }) => {
  for (const host of ["attacker.localhost:3000", "localhost:3001", "marketing.localhost.evil:3000"]) {
    const response = await request.get("http://localhost:3000/", { headers: { host } });
    expect(response.status(), host).toBe(404);
  }
  for (const host of ["localhost:3000", "marketing.localhost:3000", "ops.localhost:3000", "attacker.localhost:3000"]) {
    for (const path of ["/marketing", "/marketing/players"]) {
      const response = await request.get(`http://localhost:3000${path}`, { headers: { host } });
      expect(response.status(), `${host}${path}`).toBe(404);
    }
  }
});
