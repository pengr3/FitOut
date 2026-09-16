// AUTH-04 / D-04 / threat T-04-02: the host dashboard is a DISTINCT surface gated on canHost,
// and the Airbnb-style mode switch reaches it.
//
// Two real flows against the dev app + dev Postgres (email/password — no external creds):
//   1. A user who signed up to HOST (canHost=true) lands on /host, sees the distinct host dashboard,
//      and the mode switch is present. (The signup→/host redirect IS the mode-switch routing seam.)
//   2. A user who signed up to BOOK (canHost=false) who navigates DIRECTLY to /host is redirected
//      AWAY (to /) by the per-page server gate — the UI/middleware cannot be bypassed by URL.
//
// Unique emails per run so the unique-email constraint never collides across reruns.

import { test, expect } from "@playwright/test";

import { expectRing, readFocus } from "./helpers/focus";

const BASE = "http://localhost:3000";

function uniqueEmail(tag: string) {
  return `e2e.mode.${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function signUp(
  page: import("@playwright/test").Page,
  email: string,
  intent: "book" | "host",
) {
  await page.goto(`${BASE}/signup`);
  await page
    .getByRole("radio", { name: intent === "host" ? "Host a space" : "Book a space" })
    .click();
  await page.getByLabel("First name").fill("Switchy");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("averylongpassword");
  await page.getByLabel("Confirm password").fill("averylongpassword");
  await page
    .getByRole("button", {
      name: intent === "host" ? /sign up to host/i : /sign up to book/i,
    })
    .click();
}

async function expectNotificationBeforeNavigationMenu(page: import("@playwright/test").Page) {
  const header = page.getByTestId("site-header");
  const notificationButton = header.getByRole("button", { name: /Notifications, \d+ unread/ });
  const navigationMenu = header.getByRole("button", { name: "Navigation menu" });

  await expect(notificationButton).toBeVisible();
  await expect(navigationMenu).toBeVisible();

  const [notificationBox, navigationMenuBox] = await Promise.all([
    notificationButton.boundingBox(),
    navigationMenu.boundingBox(),
  ]);
  expect(notificationBox).not.toBeNull();
  expect(navigationMenuBox).not.toBeNull();
  expect(notificationBox!.x).toBeLessThan(navigationMenuBox!.x);
}

test("a host-capable user can switch to booking from the navigation menu (AUTH-04, D-04)", async ({
  page,
}) => {
  const email = uniqueEmail("host");
  await signUp(page, email, "host");

  // Host signup redirects to /host (D-05 routing). Wait for the host surface.
  await page.waitForURL((url) => url.pathname.startsWith("/host"), {
    timeout: 15_000,
  });

  // The distinct host dashboard is rendered (its own surface, not a booker page).
  await expect(page.locator("[data-host-dashboard]")).toBeVisible();
  await expect(page.getByRole("heading", { name: /your hosting/i })).toBeVisible();

  await expectNotificationBeforeNavigationMenu(page);

  // Account navigation and context controls share one accessible icon menu.
  const navigationMenu = page.getByRole("button", { name: "Navigation menu" });
  await expect(navigationMenu).toBeVisible();
  await expect(navigationMenu).toHaveAttribute("data-mode-switch", "");
  await expect(navigationMenu).toHaveAttribute("data-current", "host");

  await navigationMenu.click();
  const profile = page.getByRole("menuitem", { name: "Profile" });
  await expect(profile).toHaveAttribute("href", "/profile");

  await page.getByRole("menuitem", { name: "Switch to booking" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
  await expect(page).toHaveURL(`${BASE}/`);
});

test("a booker-only user is redirected away from /host by the server gate (T-04-02)", async ({
  page,
}) => {
  const email = uniqueEmail("book");
  await signUp(page, email, "book");

  // Book signup redirects to "/". Wait until we're off /signup and authenticated.
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), {
    timeout: 15_000,
  });
  const session = await page.request.get(`${BASE}/api/auth/get-session`);
  expect((await session.json())?.user?.email).toBe(email);

  // Direct-URL attempt at the host surface — the per-page gate must bounce us to "/" (no canHost).
  await page.goto(`${BASE}/host`);
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
  await expect(page).toHaveURL(`${BASE}/`);
  // And the host dashboard is NOT rendered.
  await expect(page.locator("[data-host-dashboard]")).toHaveCount(0);
});

test("a booker can activate hosting from the navigation menu", async ({ page }) => {
  const email = uniqueEmail("book-to-host");
  await signUp(page, email, "book");

  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });

  await page.goto(`${BASE}/profile`);
  await page.waitForURL((url) => url.pathname === "/profile", { timeout: 15_000 });
  await expectNotificationBeforeNavigationMenu(page);

  await page.getByRole("button", { name: "Navigation menu" }).click();
  const profile = page.getByRole("menuitem", { name: "Profile" });
  await expect(profile).toHaveAttribute("href", "/profile");

  await page.getByRole("menuitem", { name: "Start hosting" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/host"), { timeout: 15_000 });
  await expect(page.locator("[data-host-dashboard]")).toBeVisible();
});

test("the navigation menu follows the shared keyboard and grouping recipe", async ({ page }) => {
  const email = uniqueEmail("keyboard-menu");
  await page.setViewportSize({ width: 375, height: 900 });
  await signUp(page, email, "book");

  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });

  await expectNotificationBeforeNavigationMenu(page);

  // The public header's wordmark is the first tab stop, then notifications, then the compact menu at 375px.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  await expect(page.getByRole("button", { name: /Notifications, \d+ unread/ })).toBeFocused();
  await page.keyboard.press("Tab");
  const trigger = page.getByRole("button", { name: "Navigation menu" });
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("data-size", "icon");

  const focus = await readFocus(page);
  expect(focus, "the navigation trigger did not receive keyboard focus").not.toBeNull();
  expectRing(focus!, "375px navigation-menu trigger");

  await page.keyboard.press("Enter");
  const profile = page.getByRole("menuitem", { name: "Profile" });
  await expect(profile).toHaveAttribute("href", "/profile");
  await expect(profile).toBeFocused();

  await page.keyboard.press("ArrowDown");
  const oppositeContext = page.getByRole("menuitem", { name: "Start hosting" });
  await expect(oppositeContext).toBeFocused();
  await expect(page.getByRole("menuitem", { name: "Switch context" })).toHaveCount(0);

  const menuBox = await page.getByRole("menu").boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x).toBeGreaterThanOrEqual(0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(375);

  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("a booker can end only the current browser session from the navigation menu", async ({
  page,
}) => {
  const email = uniqueEmail("sign-out");
  await signUp(page, email, "book");

  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
  await page.getByRole("button", { name: "Navigation menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 15_000 });

  const session = await page.request.get(`${BASE}/api/auth/get-session`);
  expect(await session.json()).toBeNull();

  await page.goto(`${BASE}/profile`);
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 15_000 });
});
