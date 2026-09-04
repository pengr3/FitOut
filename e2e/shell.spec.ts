import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

import {
  BASE_URL as BASE,
  COMPLETION_MARKER,
  installTruncator,
  type TruncatorState,
} from "./helpers/served-document";
import {
  placeHold,
  seedBookableListing,
  signUpBooker,
  type SeededListing,
} from "./helpers/booker-seed";
import { seedPaymentStates, type SeededPaymentStates } from "./helpers/seed-payment-states";
import { seedTheme } from "./helpers/theme";

// SHELL-01 / SHELL-03 — the app shell's geometry, measured in real pixels in real Chromium.
//
// AC#2 (header height), AC#3 (the auth slot reserves its box), AC#4 (one navigation landmark),
// AC#5 (the checkout carve-out) and AC#6 (the host composition stays distinct).
//
// WHY THIS LAYER EXISTS ALONGSIDE THE SOURCE GATES, and why neither alone is sufficient — the same
// two-layer argument `scroll-area-overflow.spec.ts:15-24` and `reduced-motion.spec.ts` make:
//
//   • `tests/design/**` reads the SOURCE and the COMPILED STYLESHEET, and runs inside `npm run build`,
//     so it is the layer that can stop the fix being deleted. What it proves is that `HEADER_HEIGHT`
//     is imported and that `h-14 sm:h-16` is emitted.
//   • It cannot prove either LANDS. jsdom performs no layout — `getBoundingClientRect()` returns
//     zeros — so "the header measures 56 and then 64", "the brand does not move when the session
//     arrives" and "there is exactly one navigation landmark at 320px" are all out of reach of every
//     test in `tests/design/**`. Those are the claims, so they are measured with a browser.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE PENDING STATE IS A TRUNCATED SERVED DOCUMENT, NOT A TIMING TRICK — MEASURED, NOT PREFERRED
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Plan 11-21 prescribes "stall the session request with `page.route` and a delay". There is no such
// request to stall, and that was measured rather than assumed: `PublicAuthSlot`
// (`src/components/site/public-header.tsx:87`) and both group layouts call
// `auth.api.getSession({ headers: await headers() })` ON THE SERVER, inside a `<Suspense>` boundary.
// The browser makes ONE request — the document — and the slot's two states arrive as two parts of
// that one streamed response. A `page.route` delay moves both states later by the same amount.
//
// What this file does instead uses `page.route` for real, and removes timing from the measurement
// completely. It fetches the document, finds React's first streamed-boundary completion segment
// (`<div hidden id="S:…">`, the payload that replaces a fallback), and fulfils the request with
// everything BEFORE it. That is not a mock: it is the server's own bytes, exactly the prefix the
// browser paints first, with the resolutions removed. Nothing is timed, nothing is polled, and the
// same navigation without truncation gives the resolved state.
//
// MEASURED ON `/`, 17 August 2026: the document is 106,723 bytes and the first completion segment
// begins at 26,866. The prefix contains `data-testid="site-auth-slot"` holding `AuthSlotSkeleton`
// and does NOT contain the string "Log in"; the full document contains both. Two consequences are
// asserted rather than trusted — the truncation point must have been FOUND (a marker that stops
// appearing would make "pending" and "resolved" the same document and every equality below
// vacuously true), and the two documents must genuinely differ in the slot's contents.
//
// The truncated document does not hydrate, because the bundle tags sit after the cut. That is
// correct for a geometry measurement: it is the pre-hydration paint, which is precisely the moment
// a layout shift would be visible to a user.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AN INHERITED TRAP — STALE CSS FROM A REUSED DEV SERVER (`reduced-motion.spec.ts` trap 4).
// `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, and the dev server is what
// serves the compiled stylesheet. A server left running across a `git checkout` of
// `src/components/patterns/site-chrome.tsx` or `src/lib/design/measurements.ts` can keep serving CSS
// that no longer matches the tree. IF THIS FILE FAILS ON A CLEAN `git status`, KILL THE SERVER ON
// :3000 AND RE-RUN BEFORE TOUCHING THE COMPONENT.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// WATCHED RED — TWO MUTATIONS, RUN AND REVERTED, 17 August 2026. Recorded verbatim, because a gate
// nobody watched fail is not a gate. Command:
// `npx playwright test e2e/shell.spec.ts --project=chromium`
//
//   (a) THE TYPE-DRIVEN HEADER. `HEADER_HEIGHT` in `src/lib/design/measurements.ts` replaced with
//       `py-3`, i.e. the header sized by padding around its own contents rather than by a token —
//       the exact defect `site-chrome.tsx:26-34` says the token exists to prevent. **6 failed / 0
//       passed**, one per composition × theme, and the six numbers ARE the argument:
//
//         /          court 57      grove 57
//         /bookings  court 57      grove 57
//         /host      court 81      grove 84.09     ← one edit, two heights, no error anywhere
//
//         Error: /host · grove · 375px: the header measured 84.09 instead of 56. HEADER_HEIGHT is
//         the token that makes this number identical in both themes; a header sized by the type
//         inside it measures differently in each.
//         expect(received).toBe(expected)
//         Expected: 56
//         Received: 84.09
//
//       The host row is the one to read. Its header carries a nav and a drawer trigger, so a
//       padding-sized box tracks the theme's type and the two themes end up 3.09px apart — at which
//       point a real geometry regression and the theme swap are the same measurement. The public and
//       booker rows agree at 57 only because their wordmark is `text-lg`, a Tailwind default rather
//       than a theme token; that agreement is a coincidence of the current markup, not a property.
//       Reverted; 6 passed.
//
//   (b) THE RESERVATION REMOVED — AND THE PROBE AS PRESCRIBED WAS VACUOUS. `AUTH_SLOT_BOX`'s
//       `min-w-44` deleted. Plan 11-21 names this as the mutation that should turn AC#3 red.
//       **It did not: 6 passed.** Both prescribed boxes — the header and the brand — stayed
//       byte-identical in all six combinations, and the reason is written in `site-chrome.tsx`
//       itself: the slot is `ml-auto … justify-end`, the LAST flex child, so resolution moves only
//       its own left edge and the reservation cannot reach the brand at all.
//
//       So a third box was added to this test — the slot itself, which is what `min-w-44` actually
//       pins. Re-run with the SAME mutation, **2 failed / 4 passed**:
//
//         Error: / · court · 375px: the site-auth-slot box CHANGED SIZE when the session landed.
//         pending {"x":219,"y":11.5,"width":140,"height":32}
//         resolved {"x":212.13,"y":11.5,"width":146.88,"height":32}
//
//         Error: / · grove · 375px: … pending width 140 → resolved width 155.05
//
//       Two more findings in those numbers. The resolved cluster measures 146.88 in court and 155.05
//       in grove — the reservation is a FIXED token precisely because the thing it reserves for is
//       type-sized. And only the PUBLIC composition fails: the booker and host slots hold the bell's
//       own `NOTIFICATION_BELL_BOX` in both states, so their pending and resolved clusters are the
//       same width by construction and no reservation is load-bearing there. Reverted; 6 passed.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file:
//   • THIS SPEC IS NOT IN CI (D-24). It signs users up against the local Postgres, so it runs
//     locally and before `/gsd:verify-work`, never in the workflow.
//   • It measures three compositions on three routes. It does not visit every route in the app, and
//     a fourth composition added later is invisible to it until someone adds a row.
//   • AC#5 is measured on the checkout route's SERVED document. Reaching a fully-resolved checkout
//     needs a minted hold — a session, a bookable listing and an open slot — and a gate with that
//     seed dependency stops running the first time the seed changes (this plan's own threat model).
//     See that test's own note for the two states it measured and why it asserts on the first.
//     AMENDED BY PLAN 12-03: the seed-bearing half now exists as its own describe at the bottom of
//     this file, because SHELL-03's third criterion — EXACTLY ONE `<a href>` inside `<main>` — is a
//     PRESENCE claim and cannot be made against a not-found boundary. The two are deliberately kept
//     apart rather than merged: the cheap absence gate above keeps running when the seed breaks.
//   • It says nothing about colour, contrast or type. Those are `tests/design/**` and Phase 17.

/** The two themes, seeded pre-paint through the provider's own storage key. */
const THEMES = ["court", "grove"] as const;

/** The three compositions `site-chrome.tsx` serves, and the route each one is reached on. */
type Composition = {
  readonly name: "public" | "booker" | "host";
  readonly route: string;
  /** `null` for the anonymous composition; otherwise the signup intent that unlocks the route. */
  readonly intent: "book" | "host" | null;
};

const COMPOSITIONS: readonly Composition[] = [
  { name: "public", route: "/", intent: null },
  { name: "booker", route: "/bookings", intent: "book" },
  { name: "host", route: "/host", intent: "host" },
];

/** `HEADER_HEIGHT`'s two rendered numbers. Asserted as integers, never as a range. */
const HEADER_PX = { mobile: 56, desktop: 64 } as const;

type Box = { x: number; y: number; width: number; height: number };

/**
 * Sign up through the UI, exactly as `login-persistence.spec.ts` does.
 *
 * The shipped idiom rather than seeded rows, for the reason that file gives: email/password needs no
 * external credentials, and a unique address per run means repeated runs never collide on the unique
 * email constraint. The intent radio maps to the canBook/canHost capability (D-02), which is what
 * makes `/host` reachable at all.
 */
async function signUp(page: Page, intent: "book" | "host"): Promise<string> {
  const email = `e2e.shell.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page
    .getByRole("radio", { name: intent === "book" ? "Book a space" : "Host a space" })
    .click();
  await page.getByLabel("First name").fill("Shelly");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("averylongpassword");
  await page
    .getByRole("button", { name: intent === "book" ? /sign up to book/i : /sign up to host/i })
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 20_000 });
  return email;
}

/**
 * TRAP 1, in `scroll-area-overflow.spec.ts:215-223`'s form: assert the page rendered the thing under
 * test before asserting anything about it.
 *
 * Every box comparison in this file is `expect(a).toEqual(b)` over two values read from the DOM, and
 * `undefined` equals `undefined` perfectly. A route that 404s, redirects to `/login` or renders a
 * different composition would satisfy the comparison and prove nothing.
 */
async function expectShellReachable(page: Page, where: string): Promise<void> {
  await expect(
    page.getByTestId("site-header"),
    `${where}: no [data-testid="site-header"] on the page. Every geometry assertion in this file ` +
      "compares two boxes read off this element, and two absent boxes compare equal — so this is a " +
      "failure, not a skip. A redirect to /login is the likely cause.",
  ).toHaveCount(1);
  await expect(page.getByTestId("site-brand"), `${where}: no [data-testid="site-brand"]`).toHaveCount(
    1,
  );
}

/** Read one element's box, rounded to 2dp so a sub-pixel float cannot fail an equality. */
async function boxOf(page: Page, testId: string): Promise<Box | null> {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const round = (n: number) => Math.round(n * 100) / 100;
    return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
  }, testId);
}

/** How many placeholder boxes the auth slot is currently holding. The pending/resolved tell. */
async function skeletonsInAuthSlot(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.querySelectorAll('[data-testid="site-auth-slot"] [data-slot="skeleton"]').length,
  );
}

/**
 * TRAP 2: the two documents must genuinely be two documents.
 *
 * If React ever stops emitting the completion marker, `installTruncator` serves the full document in
 * both states and every equality below passes against one page compared with itself — green, and
 * worth nothing. This is the probe that makes the comparison mean something, and it is the direct
 * analogue of `scroll-area-overflow.spec.ts`'s "the probe must genuinely overflow".
 */
function expectTruncated(state: TruncatorState, where: string): void {
  expect(
    state.cut,
    `${where}: the streamed-completion marker \`${COMPLETION_MARKER}\` was not found in a ` +
      `${state.length}-byte document. The pending and resolved states would then be the SAME ` +
      "document, and every box equality in this file would pass vacuously. Read this file's header " +
      "before changing the marker.",
  ).toBeGreaterThan(0);
  expect(state.cut, `${where}: the cut landed at the very start of the document`).toBeLessThan(
    state.length,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// AC#2 — the header's height is 56 and then 64, in every composition and in both themes.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("AC#2 — the header's height comes from a token", () => {
  for (const composition of COMPOSITIONS) {
    for (const theme of THEMES) {
      test(`${composition.name} · ${theme} · the header is 56 at 375 and 64 from 640 up`, async ({
        page,
      }) => {
        await seedTheme(page.context(), theme);
        if (composition.intent) await signUp(page, composition.intent);

        for (const [width, expected] of [
          [375, HEADER_PX.mobile],
          [640, HEADER_PX.desktop],
          [1280, HEADER_PX.desktop],
        ] as const) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${BASE}${composition.route}`);
          const where = `${composition.route} · ${theme} · ${width}px`;
          await expectShellReachable(page, where);

          const header = await boxOf(page, "site-header");
          expect(
            header?.height,
            `${where}: the header measured ${header?.height} instead of ${expected}. ` +
              "HEADER_HEIGHT is the token that makes this number identical in both themes; a header " +
              "sized by the type inside it measures differently in each.",
          ).toBe(expected);
          // The header spans the viewport, which is what makes the height claim a claim about the
          // shell rather than about a box that happens to be the right height somewhere on the page.
          expect(header?.width, `${where}: the header is not full-bleed`).toBe(width);
        }
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// AC#3 — the header and brand boxes are byte-identical across the auth slot's pending→resolved swap.
// Three widths × two themes × two boxes × three compositions. Deliberately not rubber-stampable.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("AC#3 — the header does not move when the auth slot resolves", () => {
  for (const composition of COMPOSITIONS) {
    for (const theme of THEMES) {
      test(`${composition.name} · ${theme} · the header and brand boxes are byte-identical`, async ({
        page,
      }) => {
        await seedTheme(page.context(), theme);
        if (composition.intent) await signUp(page, composition.intent);

        const truncator = installTruncator(page);
        await truncator.ready;

        for (const width of [375, 768, 1280]) {
          const where = `${composition.route} · ${theme} · ${width}px`;
          await page.setViewportSize({ width, height: 900 });

          truncator.set(true);
          await page.goto(`${BASE}${composition.route}`);
          await page.evaluate(() => document.fonts.ready);
          await expectShellReachable(page, `${where} (pending)`);
          expectTruncated(truncator.state, where);
          const pendingSkeletons = await skeletonsInAuthSlot(page);
          const pendingHeader = await boxOf(page, "site-header");
          const pendingBrand = await boxOf(page, "site-brand");
          const pendingSlot = await boxOf(page, "site-auth-slot");

          truncator.set(false);
          await page.goto(`${BASE}${composition.route}`);
          await page.evaluate(() => document.fonts.ready);
          await expectShellReachable(page, `${where} (resolved)`);
          const resolvedSkeletons = await skeletonsInAuthSlot(page);
          const resolvedHeader = await boxOf(page, "site-header");
          const resolvedBrand = await boxOf(page, "site-brand");
          const resolvedSlot = await boxOf(page, "site-auth-slot");

          // TRAP 2, the second half: the slot must actually have been holding a placeholder in the
          // first state and be holding none in the second, or the two "states" are one state and the
          // equalities below are a page compared with itself.
          expect(
            pendingSkeletons,
            `${where}: the auth slot held NO placeholder in the pending document — the slot never ` +
              "reserved anything, so there is no swap to be unmoved by.",
          ).toBeGreaterThanOrEqual(1);
          expect(
            resolvedSkeletons,
            `${where}: the auth slot is STILL holding ${resolvedSkeletons} placeholder(s) in the ` +
              "resolved document — the session never landed, so this comparison is pending vs pending.",
          ).toBe(0);

          expect(
            resolvedHeader,
            `${where}: the site-header box MOVED when the auth slot resolved. ` +
              `pending ${JSON.stringify(pendingHeader)} resolved ${JSON.stringify(resolvedHeader)}`,
          ).toEqual(pendingHeader);
          expect(
            resolvedBrand,
            `${where}: the site-brand box MOVED when the auth slot resolved. ` +
              `pending ${JSON.stringify(pendingBrand)} resolved ${JSON.stringify(resolvedBrand)}. ` +
              "`ml-auto justify-end` on the slot is what keeps the brand still: only the cluster's " +
              "own left edge is allowed to move.",
          ).toEqual(pendingBrand);

          // THE THIRD BOX, AND THE REASON IT IS HERE IS A MEASUREMENT RATHER THAN THOROUGHNESS.
          // Plan 11-21 asks for the header and the brand only, and prescribes deleting
          // `AUTH_SLOT_BOX`'s `min-w-44` as the mutation that should turn this test red. RUN, 17
          // August 2026: it did NOT. Both boxes stayed byte-identical in all six composition/theme
          // combinations and the suite reported `6 passed`. The probe as prescribed is VACUOUS, and
          // the reason is written in `site-chrome.tsx` itself — the slot is `ml-auto … justify-end`,
          // so it is the LAST flex child and resolution moves only its own left edge. The brand and
          // the header box are protected by the anchoring, not by the reservation, and a mutation to
          // the reservation therefore cannot reach either of them.
          //
          // `min-w-44`'s actual job is stated in the same paragraph: it "stops the fallback
          // collapsing to zero", i.e. it pins THE SLOT'S OWN WIDTH across the swap. That is a real
          // claim, it is the one the constant makes, and nothing was asserting it. It is asserted
          // here — see the SUMMARY's Verification Run for the numbers the mutation produces.
          expect(
            resolvedSlot,
            `${where}: the site-auth-slot box CHANGED SIZE when the session landed. ` +
              `pending ${JSON.stringify(pendingSlot)} resolved ${JSON.stringify(resolvedSlot)}. ` +
              "AUTH_SLOT_BOX's `min-w-44` is the widest resolved state, rounded up to the ladder; " +
              "without it the slot shrink-wraps to whichever cluster is currently in it and the " +
              "reservation reserves nothing.",
          ).toEqual(pendingSlot);
        }
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// AC#4 — exactly ONE navigation landmark, at the width where the nav collapses into a drawer and at
// the width where it does not (T-11-NAVDUP).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("AC#4 — one navigation landmark at every width", () => {
  for (const theme of THEMES) {
    test(`host · ${theme} · getByRole("navigation") is exactly 1 at 320px and at 1280px`, async ({
      page,
    }) => {
      await seedTheme(page.context(), theme);
      await signUp(page, "host");

      for (const width of [320, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${BASE}/host`);
        const where = `/host · ${theme} · ${width}px`;
        await expectShellReachable(page, where);

        // Reachability for THIS assertion specifically: the host composition is the only one that
        // renders a primary nav, so a run that reached a nav-less composition would be asserting
        // "0 is not 1" for the wrong reason — or, worse, "1 is 1" against some other landmark.
        await expect(
          page.getByTestId("site-nav"),
          `${where}: the host composition rendered no [data-testid="site-nav"]`,
        ).toHaveCount(1);

        await expect(
          page.getByRole("navigation"),
          `${where}: the app rendered a number of navigation landmarks other than one. ` +
            "`SiteNav` renders the SAME links in two DOM placements — an inline bar above `md:` and " +
            "a drawer below it — and both live inside the ONE `<nav>`. The inactive placement is " +
            "hidden with `hidden` (display:none removes it from the accessibility tree); `sr-only` " +
            "or `opacity-0` there would announce the site's navigation twice at every width.",
        ).toHaveCount(1);
      }
    });
  }

  test("the public composition renders NO primary nav, and never two", async ({ page }) => {
    // The other half of T-11-NAVDUP, and the reason it is a separate test: `site-footer.tsx`'s
    // header reads AC#4 as app-wide ("resolves to exactly 1 at 320px and at 1280px"). MEASURED, that
    // is not true and does not need to be — `/` renders ZERO navigation landmarks, because the
    // public composition has no primary nav and the footer deliberately does not wrap its links in
    // one. The regression AC#4 is about is TWO, and that is what is asserted here.
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/`);
      await expectShellReachable(page, `/ · ${width}px`);
      await expect(page.getByTestId("site-footer")).toHaveCount(1);
      const count = await page.getByRole("navigation").count();
      expect(
        count,
        `/ · ${width}px: ${count} navigation landmarks. The public header has no primary nav and ` +
          "the footer must not add one — a second landmark here would break AC#4 on every route.",
      ).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// AC#4's SIBLING — exactly ONE `main` landmark, on the three routes that used to ship two.
//
// The same claim as AC#4 above, about the other landmark, and it lives here because the argument that
// describe makes about counting the RIGHT thing is exactly the argument this one needs: "0 is not 1 for
// the wrong reason — or, worse, 1 is 1 against some other landmark". A main-landmark count is the
// sharpest case of it, because the ONE landmark this test wants to see is rendered by
// `(app)/layout.tsx:96` — the shell — and is on screen before the page under test has produced a byte.
// A count of 1 proves nothing unless the page's OWN body is live when it is taken.
//
// WHAT THIS PINS (quick task 260820-nested-main-landmarks, 20 Aug 2026). `/bookings/[id]`,
// `…/cancel` and `…/group` each opened their own `main` INSIDE the layout's, across nine return
// branches — `document.querySelectorAll("main").length === 2`, measured on the detail route. Two nested
// main landmarks are resolved differently by different assistive tech (dropped by some, announced as
// duplicates by others), and the outer one is the layout shell rather than the page's content either
// way. `(app)/bookings/[id]/loading.tsx:14-15` had the rule written down and obeyed it against a
// container it copies from the page verbatim; the pages it mirrors did not. NOTHING in `e2e/` or
// `tests/` counted landmarks before this, so the regression that arrives by copying a sixth return
// branch from the fifth would have been invisible.
//
// ⚠ TWO HALVES OF THE STREAMING-BUFFER RULE (`e2e/search-and-book.spec.ts:230-283` — read it there;
// it is cited, not restated) decide how this is written:
//
//   1. THE MATCHER IS PART OF THE ASSERTION. `getByRole("main")` is buffer-IMMUNE — React's
//      `<div hidden id="S:N">` staging copy is display:none and therefore out of the accessibility
//      tree, so a role query counts the live tree only. That file MEASURED the staged copy carrying
//      this very route's container (`class="mx-auto w-full max-w-2xl …"`), so a CSS `locator("main")`
//      here would have counted 2 during the ~100ms overlap and failed against a document no user sees.
//   2. VACUITY IS THE REAL HAZARD. `toHaveCount(1)` goes green while the page body is still staged,
//      satisfied by the shell's landmark alone — green against the exact document in which a nested
//      landmark would still be sitting in the buffer. So every route below is gated on a RESOLVED-ONLY
//      signal first, taken from that route's own `loading.tsx`: the detail and cancel skeletons render
//      NO h1 (their headers say why), so an h1 proves the body landed; the group skeleton DOES render
//      `Your group`, so that route is gated on `Copy link`, which only the resolved page mounts. This
//      is the same trap SHELL-03 records below for the checkout's `Confirm and pay`.
//
// ONE THEME, not two. AC#2/AC#3 loop `THEMES` because they measure PIXELS and a theme token can move
// them. A landmark count is structural — the same tree in both themes — so a second pass would double
// the runtime of a seeded test to re-measure an integer that cannot vary.
//
// WATCHED RED — 20 Aug 2026, recorded verbatim, because a gate nobody watched fail is not a gate.
// The confirmed branch's container in `(app)/bookings/[id]/page.tsx` (line 580 / 686 — the branch the
// defect was originally MEASURED on) reverted to the nested landmark, the other eight left fixed.
// Command: `npx playwright test e2e/shell.spec.ts --project=chromium --workers=1 -g "landmark on the
// booking routes"`. **1 failed**, on the FIRST route at the FIRST width:
//
//     Error: /bookings/e2e_landmark_booking_50bf5961-… · court · 320px: the document exposes a number
//     of `main` landmarks other than one. …
//     expect(locator).toHaveCount(expected) failed
//     Locator:  getByRole('main')
//     Expected: 1
//     Received: 2
//     Call log:
//       - waiting for getByRole('main')
//         14 × locator resolved to 2 elements
//           - unexpected value "2"
//
// READ THE CALL LOG, not just the number: 14 consecutive polls over the 5s timeout all saw 2. The
// streaming buffer's overlap is ~100ms (search-and-book.spec.ts's own measurement), so a buffer
// artifact could not have held for 14 samples — this is the live tree holding two landmarks, which is
// the claim. Restored; green, and green again on an immediately consecutive run (the streaming defect
// is warmth-dependent, so one green proves little).
//
// ── EXTENDED, PLAN 13-01 — THE THREE BRANCHES THE 20 AUG FIX MISSED AND THIS SPEC COULD NOT SEE. ────
// The quick task above fixed nine return branches across three ROUTE files and left three COMPONENTS
// untouched: `pending-payment-state.tsx`, `payment-reversed-state.tsx` and `expired-approval-state.tsx`
// each opened their own `main` inside the layout's, and every one of them is a `/bookings/[id]` render.
// So the defect survived on the same route this describe already covered — invisible because the ONLY
// booking shape any e2e seed could produce was `confirmed`, and a `confirmed` row reaches none of the
// three. 13-RESEARCH Pitfall 7 recorded it as a verified live defect; this is where it becomes a gate.
//
// The three rows now come from `e2e/helpers/seed-payment-states.ts` (13-VALIDATION § Wave 0). The
// fixture is seeded at `hoursOffset: 24` because its own `confirmed` shape starts at +10h — exactly
// where this test's inline `confirmed` row starts — and three of its five shapes OCCUPY the slot under
// `booking_no_overlap`, so an un-shifted block collides 23P01 with the seed directly above it.
//
// Each new row is addressed through the URL its branch actually requires, and those differ: the pending
// and reversed branches only render on the checkout RETURN (`?paid=1` — the UX signal, never the
// authority), while the lapsed-approval branch renders on a PLAIN visit and would be swallowed by the
// reversed branch with `?paid=1` appended, because that branch is checked first and keys on nothing but
// `status='cancelled'`. The markers are all `h1`s, which is resolved-only on this route for the reason
// point 2 above gives: `bookings/[id]/loading.tsx` renders no heading at all.
//
// WATCHED RED — 20 Aug 2026, plan 13-01, recorded verbatim in that plan's SUMMARY. The `div` in
// `payment-reversed-state.tsx` was reverted to `<main>` and the spec re-run:
//
//     Error: /bookings/e2e_landmark_pay_reversed_cedb26e8-4bc6-407a-b560-faa6646e011a?paid=1 · court ·
//     320px: the document exposes a number of `main` landmarks other than one. …
//     Expected: 1
//     Received: 2
//     Call log:
//       - waiting for getByRole('main')
//         14 × locator resolved to 2 elements
//
// READ WHAT THE FAILURE POSITION PROVES, not just that it failed. The loop is width-outer/route-inner,
// so a red on the FIFTH route at the FIRST width means routes 1–4 — the three original ones AND the new
// pending route — were visited and green in the same run: the new rows are genuinely reached, not
// skipped past. The sixth (lapsed) route is not reached in a red run, and it is covered by the green
// run either side. And 14 consecutive polls at 2 rules out the streaming buffer, whose overlap this
// file measures at ~100ms. Restored; green, and green again on an immediately consecutive run.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("AC#4's sibling — one `main` landmark on the booking routes", () => {
  test.describe.configure({ mode: "serial" });

  let seed: SeededListing;
  /** Set inside the test (it needs the signed-up booker), read by `afterAll` — hence this scope. */
  let groupId: string | null = null;
  /** Same reason: the payment-state fixture needs the booker id, and `afterAll` has to delete it. */
  let payStates: SeededPaymentStates | null = null;

  test.beforeAll(async () => {
    seed = await seedBookableListing({ titlePrefix: "E2E Landmark" });
  });

  test.afterAll(async () => {
    // ORDER, and it is not the helper's order: `booking_group.booking_id` is ON DELETE RESTRICT
    // (`schema.ts:970-975` — "a booking that owns a group cannot be hard-deleted"), so the group row
    // must go BEFORE `teardown()` deletes the booking it hangs off. Without this the whole seed is
    // undeletable and the failure reads as a teardown bug rather than as a missing DELETE here.
    if (groupId) {
      await seed.sql`DELETE FROM booking_group WHERE id = ${groupId}`;
    }
    // Same trap, one layer down, which is why the fixture owns its own DELETEs: it must run BEFORE
    // `seed.teardown()`, because `teardown()` ends the connection both of them run on.
    if (payStates) {
      await payStates.teardown();
    }
    await seed.teardown();
  });

  test("/bookings/[id], its cancel and its group render exactly one `main` at 320px and 1280px", async ({
    page,
  }) => {
    // 240s, up from 120s (plan 13-01). The route table doubled from three rows to six and every row is
    // walked at both widths, so this test now performs twelve full page loads instead of six — three of
    // them on branches `next dev` has never compiled before. The budget is raised rather than the
    // coverage trimmed: this is a serial, seeded structural test, and a timeout here would read as a
    // landmark failure.
    test.setTimeout(240_000);
    await seedTheme(page.context(), "court");
    await page.setViewportSize({ width: 1280, height: 900 });

    // The booker signs up through the UI (the shipped idiom, for `booker-seed.ts`'s own reason) and the
    // BOOKING is seeded directly — a `confirmed` row on a refundable rail, 10 hours before its session,
    // copied from `e2e/cancel.spec.ts:88-104`. Driving a real payment is impossible from Playwright (a
    // hosted checkout) and irrelevant here: this test reads landmark structure, not money. The 10 hours
    // are not arbitrary — they are what makes `…/cancel` render its LIVE branch rather than the
    // "already started" refusal, so the container under test is the one a booker actually reaches.
    const email = await signUpBooker(page, seed);
    const [bookerRow] = await seed.sql`SELECT id FROM "user" WHERE email = ${email}`;
    expect(
      bookerRow?.id,
      "the signed-up booker has no row in `user`, so the booking below cannot be owned by the session " +
        "this test drives — every route would 404 and every landmark count would be a measurement of " +
        "the not-found boundary instead",
    ).toBeTruthy();
    const bookerId = bookerRow.id as string;

    const bookingId = `e2e_landmark_booking_${randomUUID()}`;
    await seed.sql`
      INSERT INTO "booking" (
        id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
        cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
        currency, payment_id, payment_method, created_at
      ) VALUES (
        ${bookingId}, ${seed.listingId}, ${1}, ${bookerId},
        now() + make_interval(hours => ${10}),
        now() + make_interval(hours => ${11}),
        ${"confirmed"}::booking_status, ${"instant"}::booking_mode,
        ${"standard"}::cancellation_policy, ${100000}, ${5000}, ${105000}, ${"php"},
        ${`pay_e2e_${randomUUID()}`}, ${"gcash"}, now()
      )
    `;

    // A group row is the ONLY thing that makes `…/group` reachable: without one the page redirects to
    // the booking (`group/page.tsx` — "a REDIRECT rather than a 404, because this visitor demonstrably
    // owns the booking"), and a redirect would silently move this assertion onto the detail route,
    // where it is already made. `capacity_snapshot` is the seeded listing's `max_occupancy`.
    groupId = `e2e_landmark_group_${randomUUID()}`;
    await seed.sql`
      INSERT INTO "booking_group" (id, booking_id, capacity_snapshot, access_token, created_at)
      VALUES (${groupId}, ${bookingId}, ${8}, ${`e2e-landmark-${randomUUID()}`}, now())
    `;

    // The three payment-state rows this describe grew for in plan 13-01. `hoursOffset: 24` moves the
    // whole fixture block off the inline `confirmed` row above — see the header for why that is not
    // optional. Only three of the five shapes are visited here; the other two are seeded because the
    // helper seeds the SET (a fixture that varies by caller is a fixture nobody can reason about), and
    // they cost one INSERT each.
    payStates = await seedPaymentStates(seed, bookerId, {
      idPrefix: "e2e_landmark_pay",
      hoursOffset: 24,
    });

    /** Route, and the ONE thing on it that only the RESOLVED page renders (see the header, point 2). */
    const routes = [
      {
        url: `/bookings/${bookingId}`,
        resolved: () => page.getByRole("heading", { level: 1, name: "Booking confirmed" }),
        resolvedName: 'the h1 "Booking confirmed"',
      },
      {
        url: `/bookings/${bookingId}/cancel`,
        resolved: () => page.getByRole("heading", { level: 1, name: "Cancel this booking?" }),
        resolvedName: 'the h1 "Cancel this booking?"',
      },
      {
        url: `/bookings/${bookingId}/group`,
        resolved: () => page.getByRole("button", { name: "Copy link" }),
        resolvedName: 'the "Copy link" button (this route\'s skeleton renders the h1 too)',
      },
      // ── The three payment-state branches (plan 13-01). Every URL below is the one its branch
      // actually requires — see the header. Only the PENDING row still carries the checkout-return
      // parameter: that branch genuinely reads it (plan 13-05 owns it). The reversed row LOST its
      // copy in plan 13-04 and that is the point of D-87 — the state is now reached from DB status
      // plus the D-84 probe, so a URL with no query string on it is the honest fixture. The lapsed
      // row never had one.
      {
        url: `/bookings/${payStates.bookingIds.pendingLiveHold}?paid=1`,
        resolved: () => page.getByRole("heading", { level: 1, name: "Confirming your payment" }),
        resolvedName: 'the h1 "Confirming your payment" (PendingPaymentState, D-57/D-71/D-102)',
      },
      {
        url: `/bookings/${payStates.bookingIds.reversed}`,
        resolved: () =>
          page.getByRole("heading", { level: 1, name: "We couldn't complete this booking" }),
        resolvedName: 'the h1 "We couldn\'t complete this booking" (PaymentReversedState, D-58/D-83)',
      },
      {
        url: `/bookings/${payStates.bookingIds.lapsedApproval}`,
        resolved: () => page.getByRole("heading", { level: 1, name: "This approval expired" }),
        resolvedName: 'the h1 "This approval expired" (ExpiredApprovalState, D-97)',
      },
    ];

    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });

      for (const route of routes) {
        await page.goto(`${BASE}${route.url}`);
        const where = `${route.url} · court · ${width}px`;
        await expectShellReachable(page, where);

        await expect(
          route.resolved(),
          `${where}: ${route.resolvedName} is absent, so this page is still its skeleton (or a 404). ` +
            "The layout's own landmark satisfies the count below on its own, so asserting it now would " +
            "pass against a document whose body — the thing that used to add the second landmark — has " +
            "not rendered yet.",
        ).toHaveCount(1);

        await expect(
          page.getByRole("main"),
          `${where}: the document exposes a number of \`main\` landmarks other than one. ` +
            "`(app)/layout.tsx:96` wraps every child in the ONE main landmark this group gets, so a " +
            "page under it that opens its own nests a second inside the first — the defect this " +
            "describe exists for. The container a page returns is the one its `loading.tsx` renders: " +
            "a `div` carrying the page's classes, on every return branch.",
        ).toHaveCount(1);
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // D-87 (plan 13-04) — THE REVERSED STATE, REACHED WITH NO QUERY STRING
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // WHY THIS LIVES HERE rather than in its own file: it needs the reversed fixture, and the fixture is
  // seeded by the test above under `mode: "serial"`. Sharing it is the same shape `groupId` already
  // uses in this describe, and re-seeding a second copy would collide on `booking_no_overlap`.
  //
  // WHAT IT PROVES, AND WHAT IT DELIBERATELY DOES NOT. It proves the state is reachable from DB status
  // plus the D-84 probe alone — the precondition D-60 needs before the confirmation moment may consume
  // the checkout-return parameter, and the reason plan 13-04 runs before plan 13-11. It does NOT prove
  // the automatic branch: the fixture's `checkout_session_id` is a synthetic `cs_e2e_…` id, so the
  // probe can never read a paid session for it and the render is deterministically the by-hand branch
  // — with a key it is a 404 and without one no request is made at all, and `probeCheckoutSession`
  // resolves to null on both paths. That determinism is the reason this assertion can name a branch,
  // and it is also this case's coverage of the "the page still renders when the provider is
  // unavailable" requirement: no round trip succeeds here and the surface still explains itself.
  test("a reversed booking renders its money statement with NO query string on the URL", async ({
    page,
  }) => {
    expect(
      payStates,
      "the payment-state fixture is null, so the test above did not reach its seed. This case shares " +
        "that fixture under `mode: \"serial\"`; a null here is a failure of the previous test, not of " +
        "this assertion.",
    ).not.toBeNull();

    // ⚠️ THE SESSION DOES NOT CARRY ACROSS TESTS, AND THAT COST A WATCHED RED. `mode: "serial"` shares
    // module state between these two tests but Playwright still hands each one a FRESH browser context,
    // so the cookie `signUpBooker` left in the test above is gone here. `/bookings/[id]` is owner-gated
    // and answers a signed-out visitor with the same bare 404 it gives a foreign row (T-04-CONFIRMIDOR)
    // — so the first draft of this case failed with "0 headings" and read exactly like the D-87
    // regression it exists to catch. Logging the SAME booker back in is the fix: the fixture rows are
    // owned by that user id, so a fresh signup would 404 for a completely different (and correct)
    // reason. The password is `signUpBooker`'s own constant; the email is the one it recorded.
    const bookerEmail = seed.bookerEmails[seed.bookerEmails.length - 1];
    expect(bookerEmail, "the test above recorded no booker email to log back in with").toBeTruthy();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(bookerEmail);
    await page.getByLabel("Password").fill("averylongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });

    // The narrow viewport on purpose: STATE-06 requires the money statement inside the initial
    // viewport at 320x568, and while the geometry itself belongs to plan 13-15, there is no reason to
    // prove reachability at a width the requirement never asks about.
    await page.setViewportSize({ width: 320, height: 568 });
    const url = `/bookings/${payStates!.bookingIds.reversed}`;
    await page.goto(`${BASE}${url}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "We couldn't complete this booking" }),
      `${url}: the reversed heading is absent, so this page is still its skeleton (or fell through to ` +
        "the generic cancelled branch — which is exactly the D-87 regression: with no query string on " +
        "the URL, a reversed booking used to render as an ordinary cancellation with no money " +
        "statement at all).",
    ).toHaveCount(1);

    await expect(
      page.getByTestId("payment-state-reversed"),
      `${url}: STATE-05's reversed container is not the one that rendered.`,
    ).toHaveCount(1);

    const panel = page.getByTestId("money-statement");
    await expect(
      panel,
      `${url}: the reversed state rendered without STATE-06's money statement. The whole argument for ` +
        "consuming the checkout-return parameter is that everything the moment states is repeated on " +
        "the ordinary detail page; a reversal with no money sentence is that argument being false.",
    ).toHaveCount(1);
    // ⚠️ CORRECTED BY 13-CONTEXT D-96 (plan 13-10). This used to assert the by-hand branch's
    // "You were charged {amount}" — and this fixture is the exact row that made that assertion
    // wrong. Its `checkout_session_id` is a synthetic `cs_e2e_...`, so the probe deterministically
    // learns NOTHING, and a row with no `cancelled_by`, no `payment_id` and a real session id is
    // SHARED with an abandoned hold that a later booker's stale-hold sweep flipped to `cancelled`
    // (`availability/units.ts:487` / `:922`). That booker was never charged one centavo. So the
    // committed proof of "the page still explains itself when the provider is unavailable" was also
    // the committed proof that it asserted a charge it had no way to know had happened.
    //
    // The branch is now `indeterminate` and every sentence in it is conditional on a charge, which is
    // true under BOTH readings of this row. The pair below is what matters: the conditional form is
    // present, and the amount is nowhere in the document.
    await expect(
      panel,
      `${url}: the money statement does not carry D-96's conditional form. With the probe unanswerable ` +
        "this row is indistinguishable from a swept unpaid hold, so the copy may state that money is " +
        "coming back but may not assert that money went out.",
    ).toContainText("If you were charged for this booking");
    await expect(
      page.locator("body"),
      `${url}: an amount reached a surface that does not know a charge occurred. That is 13-CONTEXT ` +
        "D-96 exactly — the last place FitOut could state a money fact it has not verified.",
    ).not.toContainText("1,050.00");

    await expect(
      page.getByTestId("booking-reference"),
      `${url}: TRUST-02 requires the reference on every status, and on this branch it is the token a ` +
        "person needs in order to move the money by hand.",
    ).toHaveCount(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // D-70 (plan 13-07) — THE NOT-COMPLETED STATE, AND THE LANDING IT MUST NOT STEAL
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // WHY THESE LIVE HERE, like the D-87 case above: they need the payment-state fixture, and the
  // fixture is seeded by the first test in this serial describe. Re-seeding a second copy on the same
  // listing collides 23P01 on `booking_no_overlap`.
  //
  // WHAT THE PAIR PROVES, AND WHY IT TAKES TWO ROWS THAT DIFFER IN ONE COLUMN. `pendingLiveHold` and
  // `pendingExpiredHold` are identical except for the sign of `expires_at`, which is exactly the
  // boundary D-70 draws: a live hold may render the new state, a lapsed one must fall through to the
  // reserve page, where `hold-expired-state.tsx` — which already owns that landing — renders. A spec
  // that only ever loaded a live hold would prove the state exists and nothing about whether the
  // older landing still works, and a duplicated expiry surface is the failure D-70 names.
  //
  // ⚠️ AND THE PROBE IS DELIBERATELY LEFT UNANSWERABLE IN THE FIRST TWO CASES. The fixture writes a
  // synthetic `cs_e2e_…` id, so `probeCheckoutSession` resolves to null on every machine — with a key
  // it is a 404, without one no request is made at all (D-35's CI secret boundary). That makes these
  // two cases deterministic AND makes them the committed coverage of the third acceptance criterion:
  // when the provider answers nothing, the branch degrades to the shipped redirect rather than to a
  // false money statement, and the page renders instead of raising.

  test("a pending booking with an EXPIRED hold never renders the not-completed state (D-70)", async ({
    page,
  }) => {
    expect(
      payStates,
      "the payment-state fixture is null, so the first test in this serial describe did not reach " +
        "its seed. A null here is a failure of that test, not of this assertion.",
    ).not.toBeNull();

    // The session does not carry across tests under `mode: "serial"` — see the D-87 case above for
    // the watched red that cost. Same booker, because the fixture rows are owned by that user id.
    const bookerEmail = seed.bookerEmails[seed.bookerEmails.length - 1];
    expect(bookerEmail, "the first test recorded no booker email to log back in with").toBeTruthy();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(bookerEmail);
    await page.getByLabel("Password").fill("averylongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });

    const url = `/bookings/${payStates!.bookingIds.pendingExpiredHold}`;
    await page.goto(`${BASE}${url}`);

    await expect(
      page.getByTestId("payment-state-incomplete"),
      `${url}: the not-completed state rendered for a hold that has already lapsed. D-70 forbids it ` +
        "in those words: `hold-expired-state.tsx` owns that landing, and two surfaces telling a " +
        "booker their hold is gone is two surfaces to keep true about one fact.",
    ).toHaveCount(0);

    // …and the landing that DOES own it is the one that rendered, one navigation away.
    await expect(
      page,
      `${url}: a lapsed hold did not end on the reserve page. The redirect is the shipped behaviour ` +
        "this branch keeps precisely so the expiry landing is not duplicated.",
    ).toHaveURL(new RegExp(`/listings/[^/]+/book\\?hold=${payStates!.bookingIds.pendingExpiredHold}$`));
    await expect(
      page.getByText("Your hold expired"),
      `${url}: the reserve page rendered something other than the expiry interstitial for a dead hold.`,
    ).toHaveCount(1);
  });

  test("a pending booking whose probe answers NOTHING degrades to the redirect, not to a money claim", async ({
    page,
  }) => {
    expect(payStates).not.toBeNull();

    const bookerEmail = seed.bookerEmails[seed.bookerEmails.length - 1];
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(bookerEmail);
    await page.getByLabel("Password").fill("averylongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });

    const url = `/bookings/${payStates!.bookingIds.pendingLiveHold}`;
    const response = await page.goto(`${BASE}${url}`);

    // The page rendered. A third-party read on a render path must never be able to fail the page —
    // and this branch's whole job is to explain a payment, so failing it is the worst outcome
    // available (T-13-07-PROBEDOS).
    expect(
      response?.status(),
      `${url}: the pending branch raised instead of rendering when the provider answered nothing.`,
    ).toBeLessThan(400);

    await expect(
      page.getByTestId("payment-state-incomplete"),
      `${url}: the not-completed state rendered off a probe that learned NOTHING. Telling a booker ` +
        "they have not been charged while a payment may be settling is a false money statement, " +
        "which is the failure this phase exists to remove; the redirect is a navigation.",
    ).toHaveCount(0);
    await expect(page).toHaveURL(
      new RegExp(`/listings/[^/]+/book\\?hold=${payStates!.bookingIds.pendingLiveHold}$`),
    );
  });

  test("a pending booking whose checkout session is ACTIVE renders the not-completed state", async ({
    page,
  }) => {
    // ⚠️ D-35's CI SECRET BOUNDARY. This is the ONE case in the pair that cannot be proved against a
    // synthetic session id: the branch requires the provider to say `active`, and only a real
    // test-mode session can. The PayMongo key is absent in CI by design, so this case SKIPS there
    // rather than being weakened into something that passes without it. Run it locally with the test
    // key exported into the spec process's environment.
    test.skip(
      !process.env.PAYMONGO_SECRET_KEY,
      "no PayMongo test key in this environment (D-35) — the active-session branch needs a real session",
    );
    expect(payStates).not.toBeNull();

    // Mint a REAL test-mode checkout session and point the seeded row at it. Raw fetch rather than the
    // app's own client: this file is a Playwright spec, not a server module, and the app's PayMongo
    // wrapper is behind the server-only guard.
    const key = process.env.PAYMONGO_SECRET_KEY!;
    const minted = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [{ amount: 105_000, currency: "PHP", name: "E2E not-completed", quantity: 1 }],
            payment_method_types: ["card", "gcash", "paymaya", "qrph"],
            reference_number: `e2e-${payStates!.bookingIds.pendingLiveHold}`,
            description: "E2E fixture — never paid",
            success_url: `${BASE}/`,
            cancel_url: `${BASE}/`,
          },
        },
      }),
    });
    expect(minted.status, "PayMongo refused to mint a test checkout session").toBeLessThan(300);
    const sessionId = ((await minted.json()) as { data: { id: string } }).data.id;

    await seed.sql`
      UPDATE booking SET checkout_session_id = ${sessionId}
      WHERE id = ${payStates!.bookingIds.pendingLiveHold}
    `;

    const bookerEmail = seed.bookerEmails[seed.bookerEmails.length - 1];
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(bookerEmail);
    await page.getByLabel("Password").fill("averylongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });

    const url = `/bookings/${payStates!.bookingIds.pendingLiveHold}`;
    await page.goto(`${BASE}${url}`);

    await expect(
      page.getByTestId("payment-state-incomplete"),
      `${url}: a live hold with an ACTIVE session did not render STATE-05's third state. Before this ` +
        "plan the branch redirected unconditionally, which told a booker nothing about the payment " +
        "they thought they had made.",
    ).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your payment didn't go through",
    );
    await expect(page.getByTestId("money-statement")).toContainText("You haven't been charged.");
    await expect(page.getByRole("link", { name: "Try paying again" })).toHaveAttribute(
      "href",
      new RegExp(`/book\\?hold=${payStates!.bookingIds.pendingLiveHold}$`),
    );
    // STATE-05's negative, at the one place both could plausibly appear.
    await expect(page.getByTestId("payment-state-pending")).toHaveCount(0);
    await expect(page.getByTestId("payment-state-reversed")).toHaveCount(0);
  });

  // ═════════════════════════════════════════════
  // T-13-10-NFORACLE (plan 13-10) — A MISSING BOOKING AND SOMEBODY ELSE'S ARE THE SAME ANSWER
  // ═════════════════════════════════════════════
  //
  // WHY THIS IS AN E2E CASE AND NOT A UNIT ONE. The property is about the RESPONSE, not about a
  // component: two requests, two status codes, two rendered documents, compared. jsdom can render
  // `not-found.tsx` all day and never tell you that the owner gate routed both situations to it, nor
  // that Next served 404 for both. Plan 08-06 closed this class of defect on the invite route and
  // recorded the distinction that decides it: identical MARKUP is not an identical RESPONSE.
  //
  // WHAT AN ORACLE WOULD COST HERE. `/bookings/[id]` renders the host's name, the venue's exact street
  // address and payment amounts. If a stranger could tell "no such booking" from "not yours" —
  // from a different sentence, a different action, a different status — they would learn which
  // ids name real bookings without ever being allowed to see one, and the id space is the only thing
  // between them and the rest. The gate itself is untouched by plan 13-10; what is new is the page
  // both answers land on, and a new not-found page is exactly where a well-meant "this one isn't
  // yours" gets written.
  //
  // THE FOREIGN ROW IS REAL, NOT SYNTHETIC. It is the fixture's `confirmed` booking, owned by the
  // booker the first test in this describe signed up — so this case signs up a DIFFERENT one. A
  // case that compared two ids which were both missing would pass forever while proving nothing.
  //
  // ⚠️ IT RUNS LAST IN THIS DESCRIBE ON PURPOSE. `signUpBooker` APPENDS to `seed.bookerEmails`,
  // and every case above logs the fixture's owner back in by reading the LAST entry of that array
  // (the session does not cross a test boundary — see the D-87 case's watched red). Moving this
  // case earlier would silently hand those cases a booker who owns none of the rows, and every one of
  // them would fail with the owner gate's 404, which is indistinguishable from the regressions they
  // exist to catch.
  test("a missing booking and a foreign booking answer identically (T-13-10-NFORACLE)", async ({
    page,
  }) => {
    expect(
      payStates,
      "the payment-state fixture is null, so the first test in this serial describe did not reach " +
        "its seed. A null here is a failure of that test, not of this assertion.",
    ).not.toBeNull();

    await signUpBooker(page, seed);

    const foreign = `/bookings/${payStates!.bookingIds.confirmed}`;
    // A well-formed UUID that names nothing. Deliberately not a malformed id: the route matches any
    // string, and a malformed one would be a different and weaker question than the one being asked.
    const missing = `/bookings/${randomUUID()}`;

    const read = async (url: string) => {
      const response = await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      const panel = page.getByTestId("empty-state");
      await expect(
        panel,
        `${url}: the owner gate did not land on the booking not-found boundary at all. Either the ` +
          "gate let the render through, or the boundary is missing and something else answered.",
      ).toHaveCount(1);
      return {
        status: response?.status() ?? null,
        // THE PANEL'S markup, not the document's. The shell around it carries the signed-in booker's
        // own chrome, which is identical across these two requests only by the accident of both being
        // made in one session; scoping to the panel asserts the thing that is actually promised.
        html: await panel.innerHTML(),
        // The whole document, for the OTHER half — that neither answer leaked a fact off the row.
        text: (await page.locator("body").innerText()).replace(/\s+/g, " "),
      };
    };

    const notMine = await read(foreign);
    const notThere = await read(missing);

    // ── THE STATUS CODES ARE ASSERTED EQUAL TO EACH OTHER, NOT EQUAL TO 404 ──────────────────────
    //
    // The first draft of this case asserted 404 on both and MEASURED 200 on both, which is worth
    // recording rather than quietly fixing. `(app)/layout.tsx` streams a `<Suspense>` shell for the
    // header's auth slot, so by the time `page.tsx` reaches its owner gate and raises `notFound()`
    // the response headers are long gone; Next renders the boundary into the already-open stream and
    // the client swaps it in. That is measured HERE, on this case's own two routes, and it is the
    // framework's choice rather than this page's: `read(foreign)` and `read(missing)` both return the
    // same status, and the assertion below reads them against EACH OTHER rather than against 404.
    //
    // ── THE AUTHORITY THIS PARAGRAPH USED TO BORROW IS GONE, AND WAS WRONG ANYWAY (plan 17.1-02) ──
    // It used to end "it is the same measurement [the `not-found.tsx` under
    // `src/app/listings/[id]/(detail)/`] records at length for its own route, in both `next dev` and
    // `next start`" — the path spelled out in full, where this quotes it. Both halves failed. That file's
    // header was written by plan 11-19 and went false at `89fb451`, when `(detail)/layout.tsx` gained
    // the `assertPublicListing` guard; the file itself has since been deleted as unreachable in every
    // state (`[17-D3]`). And the claim it was cited for is not even true of that route: measured
    // under `next build && next start` at Next 16.2.7, `/listings/[id]` answers a HARD 404 on a draft
    // id, a nonexistent id, and 200 on a published control — 404/404/200, twice
    // (`17.1-EVIDENCE.md` § P1). So this case never needed a sibling to vouch for it. It has its own
    // two readings, below, and they are the only evidence this paragraph rests on now.
    //
    // WHY THAT IS NOT A DEFECT HERE, WHILE IT WOULD BE ON A PUBLIC PAGE. The listing route weighs a
    // 2xx for a listing that is gone against crawlers keeping the URL. `/bookings/**` sits behind
    // `(app)`'s session gate and is in no index, so no crawler ever sees either answer.
    //
    // AND EQUALITY IS THE PROPERTY ANYWAY. T-13-10-NFORACLE is about a DIFFERENCE, not about a
    // number: a script walking the id space learns nothing from 200/200 and everything from 200/404
    // or 404/403. Pinning the literal would also make this case go red on a framework change that
    // altered nothing about the oracle — an assertion pinning the wrong thing.
    expect(
      notMine.status,
      `${foreign} vs ${missing}: the two answers carry DIFFERENT status codes, which is an ownership ` +
        "oracle a script reads instantly whatever the page says. A booking that exists but is not " +
        "yours must be indistinguishable from one that does not exist.",
    ).toBe(notThere.status);
    expect(notMine.status, "no response status was captured at all").not.toBeNull();

    // ── AND THE LEAK ITSELF, which parity alone does not cover: two identical pages that both
    // rendered somebody else's booking would satisfy every assertion above perfectly. Nothing off the
    // row may reach the document — not the venue, not the money. (The exact street and the host's
    // name are the other two, and both are unreachable for the same reason these are: the page
    // returned before it read the listing at all.)
    expect(
      notMine.text,
      `${foreign}: the venue of somebody else's booking reached the response.`,
    ).not.toContain(seed.title);
    expect(
      notMine.text,
      `${foreign}: the amount on somebody else's booking reached the response.`,
    ).not.toContain("1,050.00");

    expect(
      notMine.html,
      "the two answers differ. Any difference at all — a sentence, an action, a glyph, a heading " +
        "level — lets somebody walking the id space learn which ids name real bookings. The copy " +
        "is ONE set of three strings for both situations, deliberately.",
    ).toBe(notThere.html);

    // GUARD THE GUARD. An equality between two empty strings is satisfied perfectly by a panel that
    // rendered nothing, and both `toHaveCount(1)` assertions above are just as happy with an empty
    // container. So the compared markup is asserted to be real, and to be the copy it should be.
    expect(
      notMine.html.length,
      "the compared markup is empty, so the equality above proves nothing",
    ).toBeGreaterThan(50);
    expect(notMine.html).toContain("find that booking");
  });

});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// AC#5 — the checkout carve-out. Zero header anchors, zero footers (SHELL-03).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("AC#5 — the checkout composition has no way out of the page", () => {
  for (const theme of THEMES) {
    test(`${theme} · /listings/[id]/book renders no header anchor and no footer`, async ({
      page,
    }) => {
      await seedTheme(page.context(), theme);

      // The id is DISCOVERED from the running app rather than hardcoded. A spec that names a seeded
      // row stops running the first time the seed changes (this plan's threat model, and the
      // measured reason `scroll-area-overflow.spec.ts` drives `/dev/theme` instead of the real
      // notification panel).
      await page.goto(`${BASE}/`);
      const href = await page.getByTestId("result-card").first().getAttribute("href");
      expect(
        href,
        "the catalogue rendered no result cards, so there is no listing to reach the checkout " +
          "route on. Seed the local database (`npm run db:seed`) before reading this as a failure " +
          "of the shell.",
      ).toBeTruthy();

      // WHY THE SERVED DOCUMENT AND NOT THE HYDRATED ONE, MEASURED BOTH WAYS on 17 August 2026:
      //
      //   served (this assertion)   1 header · brand is a <span> · 0 header anchors · 0 footers
      //   hydrated, no hold         1 header · brand is an <a>    · 3 header anchors · 1 footer
      //
      // The second row is not a failure of SHELL-03 — it is a DIFFERENT composition. Without a
      // minted hold the checkout page calls `notFound()`, and the client swaps the whole tree for
      // the root not-found, which mounts its own header and footer on purpose. Asserting AC#5
      // against that would be asserting the wrong thing about the wrong shell. The contract lives in
      // `src/app/listings/[id]/book/layout.tsx` — `brandHref={null}`, no `nav`, no `actions`, no
      // footer — and the served document is that layout's own output.
      const truncator = installTruncator(page);
      await truncator.ready;
      truncator.set(true);
      await page.goto(`${BASE}${href}/book`);
      const where = `${href}/book · ${theme}`;
      await expectShellReachable(page, where);

      // Reachability, sharpened: this must be the CHECKOUT composition and not a fallback that
      // happens to have no footer. `brandHref={null}` is the branch only this route takes, and the
      // page's own title is what proves the route resolved at all.
      const brandTag = await page.evaluate(
        () => document.querySelector('[data-testid="site-brand"]')?.tagName ?? null,
      );
      expect(
        brandTag,
        `${where}: the brand rendered as <${brandTag}>. The checkout composition passes ` +
          "brandHref={null} and renders a <span>; an <a> here means some other composition was " +
          "measured, and its zero-footer count would mean nothing.",
      ).toBe("SPAN");
      await expect(
        page.getByRole("heading", { level: 1 }),
        `${where}: the checkout route rendered no <h1> — the document is empty enough that both ` +
          "counts below are trivially zero",
      ).toHaveCount(1);

      const anchors = await page.evaluate(
        () =>
          document.querySelector('[data-testid="site-header"]')?.querySelectorAll("a[href]")
            .length ?? -1,
      );
      expect(
        anchors,
        `${where}: the checkout header holds ${anchors} <a href>. SHELL-03 forbids navigation that ` +
          "can silently lose an active hold, and a wordmark link home is the single most likely way " +
          "to lose one.",
      ).toBe(0);

      await expect(
        page.getByTestId("site-footer"),
        `${where}: the checkout route rendered a footer. A footer is a grid of links, which is the ` +
          "same hazard as a linked wordmark. `site-footer.tsx` names this route as one of its two " +
          "deliberate exceptions.",
      ).toHaveCount(0);

      await expect(
        page.getByTestId("site-nav"),
        `${where}: the checkout route rendered a primary nav`,
      ).toHaveCount(0);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SHELL-03 (plan 12-03) — AC#5's three criteria on a REAL, RESOLVED checkout, and the one way back.
//
// WHY THIS IS A SECOND DESCRIBE RATHER THAN THREE MORE ASSERTIONS IN AC#5's. AC#5 above measures the
// SERVED document, and its own note says why: without a minted hold the checkout `notFound()`s and the
// client swaps in the root not-found, which mounts a different shell entirely. That is the right call
// for the two ABSENCE claims (zero header anchors, zero footers) — an absence is provable on the
// server's own bytes and needs no seed.
//
// The third criterion is a PRESENCE claim — exactly one `<a href>` inside `<main>`, and it must point
// at `/listings/` and must not carry the resume discriminator — and there is no way to make it on a
// document whose `<main>` is a not-found boundary. So it needs a real hold, which means a seed, which
// is exactly the dependency AC#5 was written to avoid. Keeping them apart means the cheap absence
// gate keeps running unchanged when this one's seed breaks.
//
// ⚠️ ONE MORE MEASURED TRAP, and it is the same one `booker-seed.ts:placeHold` records:
// `app/listings/[id]/book/loading.tsx` renders the SAME `<h1>Confirm and pay</h1>` as the resolved
// page. Counting anchors inside a `<main>` that is still a skeleton yields ZERO — a perfect pass for
// the wrong reason, on the criterion that is supposed to prove the booker is NOT trapped. The helper
// waits for `price-total`, which exists only in the resolved body.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("SHELL-03 — the checkout gives the booker exactly one labelled way back", () => {
  test.describe.configure({ mode: "serial" });

  let seed: SeededListing;

  test.beforeAll(async () => {
    seed = await seedBookableListing({ titlePrefix: "E2E Shell" });
  });

  test.afterAll(async () => {
    await seed.teardown();
  });

  test("a live checkout: 0 header anchors, 0 footers, and EXACTLY ONE anchor in <main>", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await seedTheme(page.context(), "court");
    await page.setViewportSize({ width: 1280, height: 900 });

    await signUpBooker(page, seed);
    await placeHold(page, seed, "9:00 AM", "10:00 AM");
    const where = "/listings/[id]/book (live hold) · court";
    await expectShellReachable(page, where);

    // The two ABSENCE claims, restated here against the RESOLVED document. AC#5 proves them on the
    // served bytes; this proves the hydrated, hold-bearing page did not grow one — a countdown in the
    // header (D-49) is new chrome on this route, and "new chrome" is exactly how a link arrives.
    const headerAnchors = await page.evaluate(
      () =>
        document.querySelector('[data-testid="site-header"]')?.querySelectorAll("a[href]").length ??
        -1,
    );
    expect(
      headerAnchors,
      `${where}: the checkout header holds ${headerAnchors} <a href>. SHELL-03 forbids navigation that ` +
        "can silently lose an active hold, and the hold on this page is a real row with a real expiry. " +
        "The countdown that now fills the actions slot is a <div>, not a link, and must stay one.",
    ).toBe(0);

    await expect(
      page.getByTestId("site-footer"),
      `${where}: the checkout route rendered a footer. A footer is a grid of links, which is the same ` +
        "hazard as a linked wordmark.",
    ).toHaveCount(0);

    // THE PRESENCE CLAIM. "No way out" and "trapped" are different things: the booker must have exactly
    // ONE labelled way back, it must go to the listing, and it must not be able to mint a second hold.
    const mainAnchors = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main a[href]")).map((a) => ({
        href: a.getAttribute("href") ?? "",
        text: (a.textContent ?? "").trim(),
      })),
    );
    expect(
      mainAnchors.length,
      `${where}: <main> holds ${mainAnchors.length} anchors: ${JSON.stringify(mainAnchors)}. ` +
        "EXACTLY ONE is the requirement in both directions — zero traps the booker on a page whose " +
        "header deliberately has nothing to click, and two or more re-opens the wandering-off problem " +
        "SHELL-03 exists to close.",
    ).toBe(1);

    const [back] = mainAnchors;
    expect(
      back.href.startsWith("/listings/"),
      `${where}: the one way back points at "${back.href}". It must return the booker to the listing ` +
        "they are holding, not to the catalogue and not off-site.",
    ).toBe(true);
    expect(
      back.href.includes("resume"),
      `${where}: the way back carries "${back.href}". The resume discriminator re-fires a hold on ` +
        "arrival (book-cta.tsx), which turns this link into a hold-creating GET — the T-04-GETDUP " +
        "shape, arriving through the one anchor SHELL-03 allows (T-12-03-GETDUP).",
    ).toBe(false);
    expect(
      back.text,
      `${where}: the one way back reads "${back.text}". An unlabelled or vaguely-labelled escape from ` +
        "a page holding a live booking is the same defect as no escape at all.",
    ).toBe("Back to the listing");

    // …and it says what happens to the hold. The promise is what makes the link safe to use rather
    // than merely present.
    await expect(
      page.getByText(/we'll keep your hold/i),
      `${where}: the way back does not state that the hold survives it.`,
    ).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// AC#6 — one shared BOX, three distinct compositions (D-04). Measured, not grepped.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("AC#6 — the host composition stays visually distinct", () => {
  test("the host header paints a different surface and carries a different wordmark", async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // The booker composition, in its own context so the two sessions cannot collide.
    const bookerContext = await browser.newContext();
    const bookerPage = await bookerContext.newPage();
    try {
      await bookerPage.setViewportSize({ width: 1280, height: 900 });
      await signUp(bookerPage, "book");
      await bookerPage.goto(`${BASE}/bookings`);
      await expectShellReachable(bookerPage, "/bookings");
      const booker = await bookerPage.evaluate(() => {
        const header = document.querySelector('[data-testid="site-header"]')!;
        return {
          background: getComputedStyle(header).backgroundColor,
          wordmark: document.querySelector('[data-testid="site-brand"]')?.textContent ?? "",
          height: header.getBoundingClientRect().height,
        };
      });

      await signUp(page, "host");
      await page.goto(`${BASE}/host`);
      await expectShellReachable(page, "/host");
      const host = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="site-header"]')!;
        return {
          background: getComputedStyle(header).backgroundColor,
          wordmark: document.querySelector('[data-testid="site-brand"]')?.textContent ?? "",
          height: header.getBoundingClientRect().height,
        };
      });

      // WHAT IS SHARED IS THE BOX. Asserted first, because it is the claim that makes the two
      // differences below safe rather than a drift: `site-chrome.tsx` merges height, padding,
      // container width, the boundary and stickiness, and merges nothing about content.
      expect(
        host.height,
        `the two compositions measure different heights (host ${host.height}, booker ` +
          `${booker.height}). One geometry, three compositions — that is the whole contract.`,
      ).toBe(booker.height);

      expect(
        host.background,
        `the host header paints ${host.background}, the same surface as the booker's. D-04 made the ` +
          "host shell deliberately distinct and `site-chrome.tsx`'s `surface` prop preserves that " +
          "rather than normalising it.",
      ).not.toBe(booker.background);

      expect(
        host.wordmark.trim(),
        `the host wordmark reads "${host.wordmark}", the same string as the booker's. The wordmark ` +
          "is CONTENT, passed in by the composition — it is the prop that lets one geometry serve " +
          "three surfaces without merging them.",
      ).not.toBe(booker.wordmark.trim());
      expect(host.wordmark).toContain("FitOut");
    } finally {
      await bookerContext.close();
    }
  });
});
