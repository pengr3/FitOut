import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

// Explicit local test DB only; this spec cannot inherit a production connection.
const sql = postgres("postgresql://fitout:fitout@localhost:5432/fitout_test", { max: 1 });
const accounts: string[] = [];
const password = "averylongpassword";
test.describe.configure({ mode: "serial" });
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
  await page.getByRole("button", { name: "Start hosting", exact: true }).click();
  await expect(page).toHaveURL(/\/host$/);
  const [row] = await sql`SELECT can_book, can_host, email_verified FROM "user" WHERE email = ${email}`;
  expect(row).toMatchObject({ can_book: true, can_host: true, email_verified: false });
  const audit = await sql`SELECT action, outcome FROM audit WHERE actor_id = (SELECT id FROM "user" WHERE email = ${email}) AND action = 'activateHosting'`;
  expect(audit).toHaveLength(1);
  expect(audit[0]).toMatchObject({ outcome: "ok" });
  expect(context.pages()).toEqual([page]);
});

test("existing host entry continues to host without activating again", async ({ page }) => {
  const email = await createAccount(page, "host");
  await page.goto("/start-hosting");
  await expect(page).toHaveURL(/\/host$/);
  const audit = await sql`SELECT id FROM audit WHERE actor_id = (SELECT id FROM "user" WHERE email = ${email}) AND action = 'activateHosting'`;
  expect(audit).toHaveLength(0);
});
