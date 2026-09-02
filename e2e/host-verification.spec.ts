// LVER-05 / D-255 (PM-C) — THE HOST-FACING HALF OF THE LISTING-CREATION GATE (plan 18.1-12).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THIS FILE IS A SUPPLEMENT AND NEVER THE PROOF — PROJECT D-24
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Playwright is OUT OF CI. Nothing below runs on a commit, on a merge, or on a release; a green `npm
// test` and a green pipeline say NOTHING about this file. It can sit red for a month and only a hand
// run will find out — `axe-sweep.spec.ts`'s own completeness check sat red through four review passes
// in phase 17 for exactly that reason, and it is recorded there in the same words.
//
// So the PROOF that D-255's gate holds is `tests/listing/crud.test.ts`'s LVER-05 census, which drives
// all six verification states through the real `createDraftListing` and asserts the `listing` row
// count did not move. The proof that the REFUSAL IS ROUTED rather than swallowed (FINDING F-2) is
// claim 4 of `tests/host/verification-surface.test.ts`, which asserts the ordering structurally over
// comment-stripped source. Both of those run on every commit.
//
// What THIS file adds, and what neither of them can: that a real person pressing a real button in a
// real browser ends up somewhere that explains itself. An ordering assertion cannot tell you whether
// the destination has a sentence on it. That is the whole subject here.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE COPY IS IMPORTED, NEVER RE-TYPED (rule F2)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `e2e/avatar-crop.spec.ts:121-123` states it: a spec carrying its own copy of a sentence goes green
// the day the real one changes. `src/lib/host/verification-signal.ts` is directive-free precisely so
// a gate can read it, and the assertions below therefore measure the shipped strings rather than a
// transcription of them. This matters more here than usual: two of the sentences contain typographic
// apostrophes, which is the exact character a re-typing spec gets wrong.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS DELIBERATELY NOT DRIVEN HERE, AND WHY IT IS A NAMED SKIP RATHER THAN A SILENCE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Pressing *Start the check* on the form. See the skipped test at the foot of this file: that press
// reaches the LIVE checking-partner application (18.1-RESEARCH § ADDENDUM B2 measured it — the
// operator's key refuses `sandbox_scenario` because the application is live), so an automated run
// would mint real sessions against a real account on every invocation. The reachable half — that a
// host whose check IS in progress reads the in-progress panel and is told they cannot create a
// listing yet — is measured directly, by seeding the row the submission would have written.

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE STREAMING-BUFFER RULE — why every `/host/verify` locator here carries `.filter({ visible: true })`
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// MEASURED IN THIS FILE'S FIRST HAND RUN, not anticipated: the `pending` assertion below failed with
// `strict mode violation: resolved to 2 elements`, both `<h2 class="text-heading">Your check is in
// progress</h2>`, the first of them `hidden`.
//
// The cause is the repository's already-documented one. React parks a Suspense boundary's payload in a
// `<div hidden id="S:n">` while it reveals it, so on a route WITH a `loading.tsx` every server-rendered
// element briefly exists TWICE — once live, once in that buffer. A Playwright locator matches hidden
// elements, so it resolves to 2 and strict mode throws BEFORE `toBeVisible()` ever filters.
// `/host/verify` ships a `loading.tsx` (plan 18.1-11), so it is squarely in scope. The canonical
// account — the DOM timeline, the measurements, and why `.first()`, a longer timeout and a CSS scope
// were each rejected — is in `e2e/search-and-book.spec.ts`; search it for THE STREAMING-BUFFER RULE.
// `e2e/hold-countdown.spec.ts:146-166` states the same rule for its own one exposed site.
//
// ⚠ APPLIED TO EVERY `/host/verify` READ, INCLUDING THE ONE THAT PASSED. The first test passed on that
// run and the second did not, which is the signature of a RACE rather than of a real difference
// between the two: both routes are the same route with the same plate. Leaving the passing one bare
// would leave a spec that is green today and intermittently red later, which is worse than red.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

import {
  BASE,
  seedPendingHostVerification,
} from "./helpers/booker-seed";
import { VERIFICATION_LEDE, VERIFICATION_SIGNAL } from "../src/lib/host/verification-signal";

/** The Playwright process doesn't load .env; fall back to the deterministic dev URL (booker-seed.ts). */
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const PASSWORD = "averylongpassword";

/** One visible occurrence of a shipped sentence — the streaming-buffer rule, applied once. */
function shownText(page: Page, text: string): Locator {
  return page.getByText(text, { exact: false }).filter({ visible: true });
}

/** The four `<Link href="/host/listings/new">` sites D-255 leaves ALONE. Read from disk, not listed. */
const LINK_FILES = [
  "src/app/(host)/host/listings/page.tsx",
  "src/app/(host)/host/page.tsx",
] as const;

/**
 * Run one statement batch against a connection OPENED AND CLOSED INSIDE THE CALL.
 *
 * `helpers/booker-seed.ts`'s `withClient` carries the argument — `deferred-items.md` warns by name
 * against another spec HOLDING a `postgres({max:1})` client for its lifetime, and six already do. This
 * file's steady state is zero clients.
 */
async function withClient<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

/**
 * Sign a HOST up through the shipped form — the idiom `mode-switch.spec.ts:20-37` and
 * `axe-sweep.spec.ts` both use, not a third sign-up path.
 *
 * ⚠ THE ACCOUNT IT PRODUCES HAS NO `host_verification` ROW, AND THAT IS THE FIXTURE. `loadHostVerification`
 * reports absence as `unverified` (its header rule), which is one of D-255's four refusing states —
 * so a bare sign-up IS the refused host, with nothing seeded. That is the state a real new host is in
 * the moment they finish signing up, which is what makes it the right one to drive.
 *
 * The clock is in the email and nowhere else: `Date.now()` buys uniqueness against the unique-email
 * constraint across repeated runs and never reaches a measured string.
 */
async function signUpHost(page: Page, tag: string): Promise<string> {
  const email = `e2e.hver.${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Hilaria");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign up to host/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 60_000 });
  return email;
}

/** How many listings this host owns — the number a refused create must leave at zero. */
async function listingCountFor(email: string): Promise<number> {
  return withClient(async (sql) => {
    const rows = await sql<{ n: string }[]>`
      SELECT count(*)::text AS n FROM listing
      WHERE host_id = (SELECT id FROM "user" WHERE email = ${email})
    `;
    return Number(rows[0]?.n ?? "0");
  });
}

/** Remove the account this run created, so a repeated run starts clean. `listing` cascades. */
async function deleteHost(email: string): Promise<void> {
  await withClient(async (sql) => {
    await sql`DELETE FROM host_verification WHERE user_id = (SELECT id FROM "user" WHERE email = ${email})`;
    await sql`DELETE FROM "user" WHERE email = ${email}`;
  });
}

test.describe("LVER-05 / D-255 — a host cannot create a listing until they are checked", () => {
  // SEQUENTIAL, IN ONE WORKER, AND NOT FOR SPEED — `axe-sweep.spec.ts`'s reason exactly: each test
  // below drives a full sign-up, and `/sign-up/email` is rate limited to five per sixty seconds
  // (`src/lib/auth.ts`). Three workers would be three concurrent sign-ups per test and the resulting
  // 429 reads exactly like a product bug on the page under test.
  //
  // 90s rather than the default 30s: every test waits on a route the dev server may still be
  // compiling for the first time, and two of them wait on two.
  test.describe.configure({ mode: "default", timeout: 90_000 });

  test("an unverified host pressing Create listing lands on the account check and reads the state", async ({
    page,
  }) => {
    const email = await signUpHost(page, "unv");
    try {
      // ── The control is THERE, and it is NOT disabled (D-255) ────────────────────────────────────
      //
      // A fresh host owns nothing, so the affordance on this surface is the empty state's
      // `Create your first listing`. It keeps its href, its label and its `variant="brand"` and gains
      // no `disabled`, no `aria-disabled`, no tooltip and no badge. Asserted on the RENDERED DOM as
      // well as over source below, because the source scan cannot see a wrapper adding the attribute.
      await page.goto(`${BASE}/host/listings`);
      const create = page.getByRole("link", { name: /create your first listing/i });
      await expect(
        create,
        "the create affordance is not on `/host/listings` for an unverified host. D-255 says the four " +
          "links KEEP their href, label and variant: hiding the door teaches nothing, and a host who " +
          "cannot find `Create listing` concludes the product is broken rather than learning what is " +
          "needed. The gate is server-side regardless, so removing the control buys nothing.",
      ).toBeVisible();
      await expect(create).toHaveAttribute("href", "/host/listings/new");
      await expect(create).not.toHaveAttribute("aria-disabled", /.*/);
      await expect(create).not.toHaveAttribute("disabled", /.*/);

      // ── Pressing it lands on the CHECK, not back on the grid ───────────────────────────────────
      await create.click();
      await page.waitForURL(/\/host\/verify$/, { timeout: 60_000 });

      // ⚠ THE URL ALONE IS NOT THE CLAIM. SC5 is that the refusal names the STATE, the REASON and the
      // WAY OUT — so all three are read off the document. A bounce to a page with nothing on it would
      // satisfy a URL assertion perfectly, which is the vacuity this repository has shipped before.
      await expect(
        shownText(page, VERIFICATION_LEDE),
        "the destination does not carry the lede that EXPLAINS the bounce. `/host/verify`'s lede is " +
          "worded around listings rather than around identity for exactly this moment: the host " +
          "pressed `Create listing` and needs the first thing they read to say why they are here.",
      ).toBeVisible();
      await expect(shownText(page, VERIFICATION_SIGNAL.unverified.state)).toBeVisible();
      await expect(shownText(page, VERIFICATION_SIGNAL.unverified.reason)).toBeVisible();
      await expect(
        page.getByRole("button", { name: VERIFICATION_SIGNAL.unverified.wayOut! }).filter({
          visible: true,
        }),
        "the way out is missing — the panel names a state and a reason and then stops, which is the " +
          "dead end SC5 forbids for a state that HAS a way out.",
      ).toBeVisible();

      // ── And nothing was minted on the way (T-18.1-1201) ────────────────────────────────────────
      expect(
        await listingCountFor(email),
        "a draft listing was created for a host who was then redirected to the account check. That " +
          "means the page called `createDraftListing` BEFORE reading verification — the ordering " +
          "claim 4 of `tests/host/verification-surface.test.ts` asserts structurally — or the " +
          "action's own gate is gone.",
      ).toBe(0);
    } finally {
      await deleteHost(email);
    }
  });

  test("typing the URL is not a way round it — the route refuses a pending host too", async ({
    page,
  }) => {
    // ⚠ THIS IS THE BYPASS ATTEMPT, DRIVEN. The four links being enabled is D-255's decision, and the
    // reason it is safe is that knowing the URL buys nothing. So this test does not press a button:
    // it navigates straight at `/host/listings/new`, which is what a host who read the address bar
    // once would do.
    const email = await signUpHost(page, "pend");
    let release: (() => Promise<void>) | undefined;
    try {
      release = await seedPendingHostVerification(email);

      await page.goto(`${BASE}/host/listings/new`);
      await page.waitForURL(/\/host\/verify$/, { timeout: 60_000 });

      await expect(shownText(page, VERIFICATION_SIGNAL.pending.state)).toBeVisible();
      await expect(
        shownText(page, VERIFICATION_SIGNAL.pending.reason),
        "the in-progress panel does not carry its reason — which is the one sentence in the product " +
          "that tells a waiting host, in as many words, that they cannot create a listing until the " +
          "answer lands. It is shipped copy, so a `pending` host who COULD create one would make it " +
          "false, and `tests/listing/crud.test.ts`'s pending case is what keeps it true.",
      ).toBeVisible();

      expect(await listingCountFor(email), "a pending host minted a draft by typing the URL").toBe(0);
    } finally {
      await release?.();
      await deleteHost(email);
    }
  });

  test("the four create-listing sites carry no disabled or aria-disabled (D-255, source scan)", async () => {
    // A SOURCE SCAN, and it needs no browser — which is why it takes no `page`. 18.1-UI-SPEC § Surface
    // 3's gate table asks for exactly this shape ("source scan over the four files"), because the
    // claim is about all FOUR sites and only two of them render for a host who owns listings. A DOM
    // assertion can reach the two the fixture happens to produce; this reaches all four.
    //
    // ⚠ IT IS IN THIS FILE RATHER THAN IN `tests/` AND THAT IS A KNOWN COMPROMISE — D-24 means it does
    // not run in CI. It sits here because it is the same claim the DOM assertion in the first test
    // makes, on the same subject, and splitting one claim across two suites is how half of it gets
    // deleted. The DOM half is the one that would catch a wrapper adding the attribute at runtime.
    const root = path.resolve(__dirname, "..");
    for (const file of LINK_FILES) {
      const source = readFileSync(path.join(root, file), "utf8");
      expect(
        source.includes('href="/host/listings/new"'),
        `${file} no longer links to \`/host/listings/new\` — a create affordance was removed or ` +
          "repointed, which is the 'hide the door' move D-255 refuses.",
      ).toBe(true);
      expect(
        /aria-disabled|\bdisabled\b/.test(source),
        `${file} has grown a \`disabled\` or \`aria-disabled\`. D-255: a disabled link is a HINT, ` +
          "NOT A GATE — the gate is server-side in `createDraftListing` — so the attribute buys no " +
          "safety and costs the host the explanation they would have read on `/host/verify`.",
      ).toBe(false);
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════════════════════════
  // NAMED, NEVER SILENT — the one step this file will not drive
  // ═════════════════════════════════════════════════════════════════════════════════════════════════
  test.skip("submitting the form with a phone moves the panel to pending", async () => {
    // ⚠ SKIPPED BECAUSE THE PRESS REACHES A LIVE APPLICATION, NOT BECAUSE IT IS HARD.
    //
    // 18.1-RESEARCH § ADDENDUM B2 MEASURED the operator's account: `POST /v3/session/` refuses
    // `sandbox_scenario` with *"only accepted on sandbox applications"*, so the configured credential
    // belongs to a LIVE application. An automated spec pressing this control would therefore mint a
    // real verification session against a real account on every run — a side effect outside this
    // repository that no `afterAll` can undo, and one this project has already paid for once on a
    // different provider's endpoint.
    //
    // WHAT REPLACES IT, so this is a deferral and not a gap:
    //   · the ACTION's six branches — including the refusals and the fail-closed vendor path — are
    //     driven in `tests/ops/host-verification-submit.test.ts`, in CI, against the real UPDATE;
    //   · the FORM's markup, its two gates and its one live region are asserted in
    //     `tests/host/verification-panel.test.tsx`, in CI;
    //   · the DESTINATION of a successful submit — the in-progress panel, and its sentence about not
    //     being able to create a listing — is driven by the `pending` test above, which seeds the row
    //     the submission would have written rather than asking a vendor to write it.
    //
    // WHAT IS GENUINELY UNMEASURED: the round trip itself, and the hosted flow's mobile-only
    // behaviour (ADDENDUM B3 — `is_desktop_allowed: false`). Both are the hand-driven walk plan
    // 18.1-14 owns, on a real phone, which is where a mobile-only flow can honestly be measured at
    // all. Un-skip this only once a SANDBOX application exists (18.1-04's credential gate).
  });
});
