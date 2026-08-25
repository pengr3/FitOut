// A booker session that lands on `/profile`, minted by driving the SHIPPED signup form.
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────────────
//
// `/profile` is the only route the avatar crop flow lives on, and it is behind a session:
// `(app)/profile/page.tsx` reads the session itself and `redirect("/login")`s without one. So every
// case in `e2e/avatar-crop.spec.ts` needs a signed-in browser before it can so much as see the file
// input. This is that step, and nothing else.
//
// MODELLED LINE-FOR-LINE ON `e2e/overflow-320.spec.ts:200-239` (`signUpAndReachProfile`), whose two
// load-bearing properties travel with it:
//
//   NO SEED AND NO DATABASE FIXTURE. This drives the real signup form exactly as
//   `e2e/login-persistence.spec.ts:31-42` and `e2e/helpers/booker-seed.ts:327-338` do — no
//   `postgres()` client, no seeded rows, nothing that stops running the first time a fixture
//   changes. The account it produces is a throwaway booker with a randomised address, which is the
//   whole of T-16-50's accepted disclosure: no credential is stored and nothing is reused.
//
//   ⚠ IT IS NOT MEMOISED, AND THAT IS DELIBERATE. `overflow-320.spec.ts` caches `firstListingPath`
//   one module-scope value per worker and explicitly does NOT cache this one, because what the two
//   produce are different KINDS of thing: a discovered STRING is the same for every browser context,
//   whereas what this returns is a SESSION COOKIE and Playwright's `page` fixture is per-test — a
//   fresh context and a fresh cookie jar each time. A cached result handed to a second test would
//   navigate an anonymous browser to a route that redirects, and every assertion downstream would be
//   true of the page it landed on instead. N cases therefore cost N signups, which is the honest
//   price of the fixture.
//
// ── WHY `overflow-320.spec.ts` WAS NOT CHANGED TO IMPORT THIS ─────────────────────────────────────
//
// The duplication below is on purpose and is the cheaper trade. That spec passes today, Phase 16 has
// no requirement that needs it changed, and refactoring a green gate for tidiness is the trade this
// project has already declined twice on the record (`09-UI-SPEC` Open Question 8, and `999.2`'s Open
// Question 6 in its original resolution). Its copy also carries a paragraph about the clock living in
// the email and nowhere else that is specific to that file's pixel assertions; moving the function
// would either orphan that paragraph or drag it somewhere it does not apply.
//
// ⚠ THE CLOCK IS IN THE EMAIL AND NOWHERE ELSE, here too. `Date.now()` buys uniqueness against the
// email unique constraint across repeated runs; it never reaches a measured string, a geometry
// assertion or a snapshot. This repository has shipped two time-bomb assertions seeded from `now()`,
// and the reason this is not a third is a property of where the value goes rather than good luck.

import { expect, type Page } from "@playwright/test";

/** The dev server every spec in this directory drives. Same literal as `helpers/booker-seed.ts:45`. */
export const BASE = "http://localhost:3000";

/**
 * Sign a fresh booker up through the UI and land on `/profile`, with the avatar control rendered.
 *
 * Returns the email, so a failure can name the account it was on — the dev database accumulates
 * these and "which of the four hundred `e2e.avatar.*` rows was this" is otherwise unanswerable.
 *
 * @param page the per-test page fixture. A fresh context each time; see the header on memoisation.
 */
export async function signUpAndReachProfile(page: Page): Promise<string> {
  const email = `e2e.avatar.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto(`${BASE}/signup`);
  // The intent defaults to "book"; clicked explicitly to be deterministic, which is the reason
  // `login-persistence.spec.ts` gives for doing the same.
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Avatar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("averylongpassword");
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });

  await page.goto(`${BASE}/profile`);

  // THE REACHABILITY GUARD, before any case asserts anything — `photo-lightbox.spec.ts`'s spine. A
  // signup that silently failed lands on `/login`, where there is no file input at all, and every
  // downstream failure would then be a timeout on a locator instead of this sentence.
  await expect(
    page.getByRole("button", { name: "Upload photo" }),
    "`/profile` did not render the avatar upload control. The signup did not produce a session, or " +
      "`AvatarField` is no longer mounted on this route — either way nothing below this line is " +
      "measuring the crop flow.",
  ).toBeVisible({ timeout: 30_000 });

  return email;
}
