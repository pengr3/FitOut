import { expect, test } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expectAxeClean } from "./helpers/axe";
import { assertMarketingSafety, MARKETING_TEST_DATABASE } from "./helpers/marketing-fixtures";

const app = "http://localhost:3000";
const marketing = "http://marketing.localhost:3000";
const ops = "http://ops.localhost:3000";
const pages = ["/", "/hosts", "/players", "/about", "/faq", "/contact"];
const privateText = /matrix-private-(customer|staff)|Staff management|Account settings/;

test.beforeEach(async ({ page }) => {
  let errors = 0;
  page.on("pageerror", (error) => {
    if (errors++ < 5) console.log("[hydration-pageerror]", error.message.split("\n")[0].replace(/https?:\/\/\S+/g, "[url]").slice(0, 200));
  });
  page.on("response", (response) => {
    if (response.request().resourceType() === "script" && response.status() >= 400) {
      console.log("[hydration-script]", JSON.stringify({ path: new URL(response.url()).pathname, status: response.status(), type: response.headers()["content-type"] }));
    }
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "script") console.log("[hydration-script-failed]", JSON.stringify({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
  });
});

for (const width of [320, 375, 768, 1440]) {
  for (const path of pages) {
    test(`Court ${path} at ${width}: real content, metadata, no overflow and axe`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const response = await page.goto(`${marketing}${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("div[data-theme='court']")).toHaveCount(1);
      // WHATWG serializes an empty root path as '/'; Next metadata may omit it.
      // Still require the exact authority, path and query, including every non-root path.
      expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).href).toBe(new URL(`${marketing}${path}`).href);
      expect(new URL((await page.locator('meta[property="og:url"]').getAttribute("content"))!).href).toBe(new URL(`${marketing}${path}`).href);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${marketing}/marketing/screenshots/search.png`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
      for (const screenshot of await page.locator('main img[alt^="FitOut demo"]').all()) {
        await screenshot.scrollIntoViewIfNeeded();
        await expect.poll(() => screenshot.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { message: "real marketing screenshot decodes" }).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectAxeClean(page, `marketing ${path} Court ${width}px`);
    });
  }
}

test("keyboard mobile menu, skip focus and FAQ Enter/Space", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${marketing}/`);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await expect(menu).toBeEnabled();
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link")).toHaveText(["Home", "Hosts", "Players", "About", "FAQ", "Contact"]);
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await nav.getByRole("link", { name: "FAQ", exact: true }).click();
  await expect(page).toHaveURL(`${marketing}/faq`);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  const summary = page.locator("main summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main details").first()).toHaveAttribute("open", "");
  await page.keyboard.press("Space");
  await expect(page.locator("main details").first()).not.toHaveAttribute("open");
  await expect(summary).toBeFocused();
  await expectAxeClean(page, "marketing keyboard FAQ Court 320px");
});

test("real Next Link Flight navigation, history, refresh and explicit prefetch", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${marketing}/`);
  await expect(page.locator("header")).toHaveAttribute("data-hydrated", "true");
  const flights: string[] = [];
  page.on("response", (response) => {
    if (response.request().headers().rsc === "1") flights.push(response.url());
  });
  for (const [label, path] of [["Hosts", "/hosts"], ["Players", "/players"], ["About", "/about"], ["FAQ", "/faq"], ["Contact", "/contact"]]) {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${marketing}${path}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${marketing}${path}`);
  }
  expect(flights.length, "actual client transitions emitted Flight requests").toBeGreaterThan(0);
  expect(flights.every((url) => !new URL(url).pathname.startsWith("/marketing"))).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(`${marketing}/faq`);
  await page.goForward();
  await expect(page).toHaveURL(`${marketing}/contact`);
  await page.reload();
  await expect(page.locator("main form")).toBeVisible();
  for (const path of pages) {
    const flight = await request.get(`${marketing}${path}?_rsc=matrix`, {
      headers: { RSC: "1", "Next-Router-Prefetch": "1" },
    });
    expect(flight.status()).toBe(200);
    expect(flight.headers()["content-type"]).toContain("text/x-component");
    expect(await flight.text()).not.toMatch(privateText);
  }
});

test("alternating authorities keep repeated HTML and Flight payloads separate", async ({ request }) => {
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const rsc of [false, true]) {
      for (const [origin, expected, absent] of [[marketing, "Good plans need a place.", "Find a space to play"], [app, "Find a space to play", "Good plans need a place."]]) {
        const result = await request.get(`${origin}/`, { headers: rsc ? { RSC: "1" } : {} });
        expect(result.status()).toBe(200);
        const body = await result.text();
        expect(body).toContain(expected);
        expect(body).not.toContain(absent);
        expect(body).not.toMatch(privateText);
        if (rsc) expect(result.headers()["content-type"]).toContain("text/x-component");
      }
    }
  }
});

test("authority, namespace and forged private headers fail closed for HTML and RSC", async ({ request }) => {
  for (const rsc of [false, true]) {
    for (const host of ["localhost:3001", "marketing.localhost:3001", "marketing.localhost.evil:3000", "unknown.localhost:3000"]) {
      const result = await request.get(`${app}/`, { headers: { host, "x-forwarded-host": "marketing.localhost:3000", ...(rsc ? { RSC: "1" } : {}) } });
      expect(result.status(), host).toBe(404);
    }
    for (const origin of [app, marketing, ops]) {
      for (const path of ["/marketing", "/marketing/hosts", "/marketing/robots.txt", "/marketing/sitemap.xml"]) {
        const result = await request.get(`${origin}${path}`, { headers: { "x-fitout-marketing-source": "/", "x-fitout-host-class": "marketing", ...(rsc ? { RSC: "1" } : {}) } });
        expect(result.status(), `${origin}${path}`).toBe(404);
      }
    }
  }
  for (const path of pages.slice(1)) expect((await request.get(`${app}${path}`)).status()).toBe(404);
});

test("legacy full queries/methods retain the exact app authority", async ({ request, page }) => {
  for (const method of ["GET", "HEAD"]) {
    for (const path of ["/login", "/host/listings/new", "/bookings/demo", "/privacy", "/?category=boxing_mma"]) {
      const url = `${marketing}${path}${path.includes("?") ? "&" : "?"}utm_source=matrix&tag=one&tag=two&paid=1`;
      const result = await request.fetch(url, { method, maxRedirects: 0 });
      expect(result.status()).toBe(307);
      expect(new URL(result.headers().location, url).href).toBe(url.replace(marketing, app));
    }
  }
  for (const query of ["page=2&sort=price&relax=1", "utm_source=matrix&_rsc=tracker"]) {
    const result = await request.get(`${marketing}/?${query}`, { maxRedirects: 0 });
    expect(result.status()).toBe(200);
    expect(await result.text()).toContain("Good plans need a place.");
  }
  for (const path of ["/host", "/login", "/api/auth/sign-up/email"]) expect((await request.post(`${marketing}${path}`, { data: {}, maxRedirects: 0 })).status()).toBe(405);
  const query = "utm_source=matrix&tag=one&tag=two&paid=1";
  await page.goto(`${marketing}/login?${query}`);
  await expect(page).toHaveURL(`${app}/login?${query}`);
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
});

test("Contact and machine receivers retain direct host/method boundaries", async ({ request }) => {
  for (const origin of [app, ops]) expect((await request.post(`${origin}/api/contact`, { data: {} })).status()).toBe(404);
  expect((await request.get(`${marketing}/api/contact`)).status()).toBe(405);
  for (const origin of [app, marketing]) {
    for (const path of ["/api/paymongo/webhook", "/api/didit/webhook"]) {
      const result = await request.post(`${origin}${path}`, { data: {}, maxRedirects: 0 });
      expect(result.status()).toBe(400);
      expect(await result.text()).toBe("Invalid signature");
      expect(result.headers().location).toBeUndefined();
      expect((await request.get(`${origin}${path}`, { maxRedirects: 0 })).status()).toBe(405);
    }
    const info = await request.get(`${origin}/api/inngest`, { maxRedirects: 0 });
    expect(info.status()).toBe(200); // local dev introspection, not production signature proof
    expect(info.headers().location).toBeUndefined();
    expect((await request.delete(`${origin}/api/inngest`)).status()).toBe(405);
  }
});

test("actual marketing robots text and sitemap contain exactly six canonical pages", async ({ request }) => {
  const robots = await request.get(`${marketing}/robots.txt`);
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain(`Sitemap: ${marketing}/sitemap.xml`);
  const sitemap = await request.get(`${marketing}/sitemap.xml`);
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(6);
  for (const path of pages) expect(xml).toContain(`<loc>${marketing}${path}</loc>`);
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
  expect(locations.every((url) => !url.pathname.startsWith("/marketing"))).toBe(true);
  expect(xml).not.toContain(`${app}/`);
});

test("real customer/staff sessions stay host-only and marketing serializes neither", async ({ browser }) => {
  test.setTimeout(90_000);
  assertMarketingSafety();
  const sql = postgres(MARKETING_TEST_DATABASE, { max: 1 });
  const customer = await browser.newContext({ baseURL: app });
  const staff = await browser.newContext({ baseURL: ops });
  const publicContext = await browser.newContext({ baseURL: marketing });
  const ids: string[] = [];
  try {
    for (const [context, role, origin] of [[customer, "customer", app], [staff, "staff", ops]] as const) {
      const id = `matrix_${randomUUID()}`;
      ids.push(id);
      const email = `${id}@example.com`;
      const password = "MatrixLocalPassword123!";
      const hash = await hashPassword(password);
      await sql`INSERT INTO "user" (id, name, first_name, email, email_verified, can_book, can_host, role, created_at, updated_at) VALUES (${id}, ${`matrix-private-${role}`}, 'Matrix', ${email}, true, ${role === "customer"}, false, ${role === "staff" ? "staff" : null}, now(), now())`;
      await sql`INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (${randomUUID()}, ${id}, 'credential', ${id}, ${hash}, now(), now())`;
      const login = await context.request.post(`${origin}/api/auth/sign-in/email`, { headers: { origin }, data: { email, password } });
      expect(login.status()).toBe(200);
      expect((await context.cookies()).filter((cookie) => cookie.name.includes("session_token")).every((cookie) => cookie.domain === new URL(origin).hostname)).toBe(true);
    }
    expect((await (await customer.request.get(`${app}/api/auth/get-session`)).json()).user.id).toBe(ids[0]);
    expect((await (await staff.request.get(`${ops}/api/auth/get-session`)).json()).user.id).toBe(ids[1]);
    expect(await (await staff.request.get(`${app}/api/auth/get-session`)).json()).toBeNull();
    expect(await (await customer.request.get(`${ops}/api/auth/get-session`)).json()).toBeNull();
    for (const context of [customer, staff, publicContext]) {
      for (const rsc of [false, true]) {
        const result = await context.request.get(`${marketing}/`, { headers: rsc ? { RSC: "1" } : {} });
        expect(result.status()).toBe(200);
        expect(await result.text()).not.toMatch(privateText);
        expect(result.headers()["set-cookie"]).toBeUndefined();
      }
    }
    expect((await staff.request.get(`${ops}/ops`)).status()).toBe(200);
    expect((await customer.request.get(`${app}/ops`)).status()).toBe(404);
  } finally {
    for (const id of ids) { await sql`DELETE FROM audit WHERE actor_id = ${id}`; await sql`DELETE FROM "user" WHERE id = ${id}`; }
    await sql.end();
    await customer.close(); await staff.close(); await publicContext.close();
  }
});
