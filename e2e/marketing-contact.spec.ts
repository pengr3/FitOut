import { expect, test, type Page } from "@playwright/test";

// Controlled responses below prove browser feedback only: simulated test transport,
// never actual inbox delivery. The final test exercises the real unconfigured route.
test.use({ baseURL: "http://marketing.localhost:3000" });
async function fill(page: Page, confirm = "person@example.com") {
  await page.getByLabel("Name", { exact: true }).fill("Demo visitor");
  await page.getByLabel("Email", { exact: true }).fill("person@example.com");
  await page.getByLabel("Confirm Email", { exact: true }).fill(confirm);
  await page.getByLabel("Message", { exact: true }).fill("A local demo question\nabout FitOut");
}
test.beforeEach(async ({ page }) => { await page.goto("/contact"); });

test("without JavaScript inquiry fields cannot enter the URL", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const url = "http://marketing.localhost:3000/contact";
    await page.goto(url);
    await expect(page.getByLabel("Name", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Message", { exact: true })).toBeDisabled();
    await expect(page.locator("main form")).toHaveAttribute("method", "post");
    await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
    await page.keyboard.press("Enter");
    expect(page.url()).toBe(url);
  } finally { await context.close(); }
});

test("exact fields, keyboard order, mismatch and optional phone", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const labels = ["Name", "Email", "Confirm Email", "Mobile Number (optional)", "Message"];
  await expect(page.locator("main form label")).toHaveText(labels);
  await expect(page.getByLabel("Name", { exact: true })).toBeEnabled();
  await page.getByLabel("Name", { exact: true }).focus();
  for (const label of labels.slice(1)) { await page.keyboard.press("Tab"); await expect(page.getByLabel(label, { exact: true })).toBeFocused(); }
  await fill(page, "another@example.com");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Email addresses must match.")).toBeVisible();
  await expect(page.getByLabel("Confirm Email", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("A local demo question\nabout FitOut");
});

test("simulated test transport: pending deduplication and accepted announcement", async ({ page }) => {
  let count = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/contact", async (route) => { count++; await gate; await route.fulfill({ status: 200, json: { ok: true } }); });
  await fill(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await expect(page.locator("main form")).toHaveAttribute("aria-busy", "true");
  await page.locator("main form").evaluate((form) => { (form as HTMLFormElement).requestSubmit(); (form as HTMLFormElement).requestSubmit(); });
  await expect.poll(() => count).toBe(1);
  release();
  await expect(page.getByRole("status")).toHaveText("Your message was sent to FitOut.");
  await page.getByRole("button", { name: "Write another message" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
});

for (const status of [400, 429, 503]) {
  test(`simulated test transport: ${status} retains inquiry and recovers`, async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/contact", (route) => {
      attempts++;
      return route.fulfill(attempts > 1 ? { status: 200, json: { ok: true } } : { status, headers: { "Retry-After": "60" }, json: { ok: false, fieldErrors: status === 400 ? { name: "Check your name." } : undefined } });
    });
    await fill(page);
    await page.getByLabel("Mobile Number (optional)").fill("+63 917 123 4567");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText(status === 400 ? "Check your contact" : status === 429 ? "60 seconds" : "could not be sent");
    for (const [label, value] of [["Name", "Demo visitor"], ["Email", "person@example.com"], ["Confirm Email", "person@example.com"], ["Mobile Number (optional)", "+63 917 123 4567"], ["Message", "A local demo question\nabout FitOut"]]) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    if (status === 400) await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toHaveText("Your message was sent to FitOut.");
  });
}

test("simulated test transport: network failure preserves values without success", async ({ page }) => {
  await page.route("**/api/contact", (route) => route.abort("failed"));
  await fill(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Check your connection");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Demo visitor");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("A local demo question\nabout FitOut");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
});

test("actual unconfigured route never announces delivery", async ({ page }) => {
  expect(process.env.FITOUT_E2E_REAL_EMAIL).not.toBe("1");
  await fill(page);
  const response = page.waitForResponse((result) => result.url().endsWith("/api/contact") && result.request().method() === "POST");
  await page.getByRole("button", { name: "Send message" }).click();
  expect((await response).status()).toBe(503);
  await expect(page.getByRole("status")).toContainText("could not be sent");
  await expect(page.getByRole("status")).not.toContainText("was sent");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("A local demo question\nabout FitOut");
});
