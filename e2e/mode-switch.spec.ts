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

  // Account navigation and context controls share one accessible icon menu.
  const navigationMenu = page.getByRole("button", { name: "Navigation menu" });
  await expect(navigationMenu).toBeVisible();
  await expect(navigationMenu).toHaveAttribute("data-mode-switch", "");
  await expect(navigationMenu).toHaveAttribute("data-current", "host");

  await navigationMenu.click();
  const profile = page.getByRole("menuitem", { name: "Profile" });
  await expect(profile).toHaveAttribute("href", "/profile");

  await page.getByRole("menuitem", { name: "Switch context" }).hover();
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
