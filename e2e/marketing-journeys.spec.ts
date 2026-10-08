import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { marketingFixture } from "./helpers/marketing-fixtures";

// Explicit local test DB only; this spec cannot inherit a production connection.
const sql = postgres("postgresql://fitout:fitout@localhost:5432/fitout_test", { max: 1 });
const accounts: string[] = [];
const password = "averylongpassword";
const marketing = "http://marketing.localhost:3000";

for (const path of ["login", "signup"]) {
  test(`${path} without JavaScript cannot put credentials in the URL`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      const url = `http://localhost:3000/${path}?callbackURL=%2Fstart-hosting`;
      await page.goto(url);
      const form = page.locator("main form");
      await expect(form).toHaveAttribute("method", "post");
      await expect(page.getByLabel("Email")).toBeDisabled();
      await expect(page.getByLabel("Password", { exact: true })).toBeDisabled();
      await expect(form.getByRole("button", { name: path === "login" ? "Log in" : "Create account", exact: true })).toBeDisabled();
      await page.keyboard.press("Enter");
      expect(page.url()).toBe(url);
      expect(new URL(page.url()).searchParams.has("password")).toBe(false);
    } finally { await context.close(); }
  });
}

async function startFromHome(page: Page, audience: "host" | "player") {
  await page.goto(`${marketing}/`);
  await page.getByRole("link", { name: audience === "host" ? "I have a space" : "I want to play", exact: true }).click();
  await expect(page).toHaveURL(`${marketing}/${audience === "host" ? "hosts" : "players"}`);
  await page.getByRole("link", { name: audience === "host" ? "Start hosting" : "Find a space", exact: true }).click();
}
test.afterAll(async () => {
  for (const email of accounts) await sql`DELETE FROM "user" WHERE email = ${email}`;
  await sql.end();
});

async function createAccount(page: Page, intent: "book" | "host") {
  const email = `e2e.host-intent.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
  accounts.push(email);
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: { email, password, name: "Journey", firstName: "Journey", intent },
  });
  expect(response.ok()).toBe(true);
  return email;
}

test("anonymous app browsing and hosting entry stay in the same tab", async ({ page, context }) => {
  await startFromHome(page, "player");
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: "Find a space to play" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Search spaces" })).toBeVisible();
  expect(await (await context.request.get("http://localhost:3000/api/auth/get-session")).json()).toBeNull();
  await startFromHome(page, "host");
  await expect(page).toHaveURL(/\/login\?callbackURL=%2Fstart-hosting$/);
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  expect(context.pages()).toEqual([page]);
});

test("booker GETs never activate; the explicit protected action preserves booking", async ({ page, context }) => {
  const email = await createAccount(page, "book");
  await startFromHome(page, "host");
  for (let visit = 0; visit < 2; visit++) {
    await page.goto("/start-hosting");
    await expect(page.getByRole("button", { name: "Start hosting", exact: true })).toBeVisible();
    const [row] = await sql`SELECT can_book, can_host FROM "user" WHERE email = ${email}`;
    expect(row).toMatchObject({ can_book: true, can_host: false });
  }
  await expect(page.getByRole("button", { name: "Start hosting", exact: true })).toBeEnabled();
  const activation = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/start-hosting", { timeout: 15_000 });
  await page.getByRole("button", { name: "Start hosting", exact: true }).click();
  expect((await activation).status()).toBe(200);
  const [row] = await sql`SELECT can_book, can_host, email_verified FROM "user" WHERE email = ${email}`;
  expect(row).toMatchObject({ can_book: true, can_host: true, email_verified: false });
  await expect(page).toHaveURL(/\/host$/, { timeout: 15_000 });
  const audit = await sql`SELECT action, outcome FROM audit WHERE actor_id = (SELECT id FROM "user" WHERE email = ${email}) AND action = 'activateHosting'`;
  expect(audit).toHaveLength(1);
  expect(audit[0]).toMatchObject({ outcome: "ok" });
  expect(context.pages()).toEqual([page]);
});

test("hosting activation without JavaScript remains disabled and grants no capability", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://localhost:3000" });
  try {
    const page = await context.newPage();
    const email = await createAccount(page, "book");
    await page.goto("/start-hosting");
    // The async page remains at its accessible loading boundary without JavaScript.
    // Inspect resolved streamed SSR markup only; this does not claim a usable no-JS flow.
    await expect(page.getByRole("status", { name: "Loading your hosting options." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start hosting", exact: true, includeHidden: true })).toBeDisabled();
    await page.keyboard.press("Enter");
    expect(page.url()).toBe("http://localhost:3000/start-hosting");
    const [row] = await sql`SELECT can_book, can_host FROM "user" WHERE email = ${email}`;
    expect(row).toMatchObject({ can_book: true, can_host: false });
    const audit = await sql`SELECT id FROM audit WHERE actor_id = (SELECT id FROM "user" WHERE email = ${email}) AND action = 'activateHosting'`;
    expect(audit).toHaveLength(0);
  } finally { await context.close(); }
});

test("existing host entry continues to host without activating again", async ({ page }) => {
  const email = await createAccount(page, "host");
  await startFromHome(page, "host");
  await expect(page).toHaveURL(/\/host$/, { timeout: 15_000 });
  const audit = await sql`SELECT id FROM audit WHERE actor_id = (SELECT id FROM "user" WHERE email = ${email}) AND action = 'activateHosting'`;
  expect(audit).toHaveLength(0);
});

test("hosting login and signup switches resume the explicit entry without a capability grant", async ({ page, context }) => {
  await startFromHome(page, "host");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/signup\?callbackURL=%2Fstart-hosting$/);
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?callbackURL=%2Fstart-hosting$/);
  await page.getByRole("link", { name: "Create an account" }).click();
  const email = `e2e.host-signup.${Date.now()}@example.com`;
  accounts.push(email);
  await page.getByLabel("First name").fill("Journey");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/start-hosting$/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Start hosting", exact: true })).toBeVisible();
  const [row] = await sql`SELECT can_book, can_host FROM "user" WHERE email = ${email}`;
  expect(row).toMatchObject({ can_book: true, can_host: false });
  expect(context.pages()).toEqual([page]);
});

test("password login and existing cookie resume hosting; a stale cookie retains the return", async ({ page, context }) => {
  const email = await createAccount(page, "book");
  await page.goto("/login?callbackURL=%2Fstart-hosting");
  await expect(page).toHaveURL(/\/start-hosting$/, { timeout: 15_000 });
  const signedOut = await context.request.post("/api/auth/sign-out", { data: {}, headers: { origin: "http://localhost:3000" } });
  expect(signedOut.status()).toBe(200);
  expect(await (await context.request.get("/api/auth/get-session")).json()).toBeNull();
  await startFromHome(page, "host");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/start-hosting$/, { timeout: 15_000 });
  await sql`DELETE FROM session WHERE user_id = (SELECT id FROM "user" WHERE email = ${email})`;
  await page.goto("/login?callbackURL=%2Fstart-hosting");
  await expect(page).toHaveURL(/\/login\?callbackURL=%2Fstart-hosting&_sc=1$/);
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  const cookie = (await context.cookies()).find((item) => item.name === "better-auth.session_token");
  expect(cookie).toBeUndefined();
  expect(context.pages()).toEqual([page]);
});

test("marketing host handoff reaches the actual approved-host new listing wizard", async ({ page, context }) => {
  test.setTimeout(90_000);
  const fixture = await marketingFixture();
  try {
    const id = await fixture.account(page, "host");
    await fixture.readyHost(id);
    await startFromHome(page, "host");
    await expect(page).toHaveURL(/\/host$/);
    // Existing intermittent /new 404 is a real assertion, never replaced by
    // the seeded edit capture used in Plan04. This creates only a local draft.
    const response = await page.goto("http://localhost:3000/host/listings/new");
    expect(response?.status(), "approved host reaches real creation route").toBe(200);
    await expect(page).toHaveURL(/\/host\/listings\/[^/]+\/edit$/);
    await expect(page.getByRole("heading", { name: "What kind of space is it?", exact: true })).toBeVisible();
    const draftId = new URL(page.url()).pathname.split("/")[3];
    const [draft] = await fixture.sql`SELECT host_id, status FROM listing WHERE id = ${draftId}`;
    expect(draft).toMatchObject({ host_id: id, status: "draft" });
    expect(context.pages()).toEqual([page]);
  } finally { await fixture.cleanup(); }
});
