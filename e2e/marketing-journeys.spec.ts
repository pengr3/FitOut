import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

// Explicit local test DB only; this spec cannot inherit a production connection.
const sql = postgres("postgresql://fitout:fitout@localhost:5432/fitout_test", { max: 1 });
const accounts: string[] = [];
const password = "averylongpassword";
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
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find a space to play" })).toBeVisible();
  await page.goto("/start-hosting");
  await expect(page).toHaveURL(/\/login\?callbackURL=%2Fstart-hosting$/);
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  expect(context.pages()).toEqual([page]);
});

test("booker GETs never activate; the explicit protected action preserves booking", async ({ page, context }) => {
  const email = await createAccount(page, "book");
  for (let visit = 0; visit < 2; visit++) {
    await page.goto("/start-hosting");
    await expect(page.getByRole("button", { name: "Start hosting", exact: true })).toBeVisible();
    const [row] = await sql`SELECT can_book, can_host FROM "user" WHERE email = ${email}`;
    expect(row).toMatchObject({ can_book: true, can_host: false });
  }
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

test("existing host entry continues to host without activating again", async ({ page }) => {
  const email = await createAccount(page, "host");
  await page.goto("/start-hosting");
  await expect(page).toHaveURL(/\/host$/, { timeout: 15_000 });
  const audit = await sql`SELECT id FROM audit WHERE actor_id = (SELECT id FROM "user" WHERE email = ${email}) AND action = 'activateHosting'`;
  expect(audit).toHaveLength(0);
});

test("hosting login and signup switches resume the explicit entry without a capability grant", async ({ page, context }) => {
  await page.goto("/start-hosting");
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
  await page.goto("/start-hosting");
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
