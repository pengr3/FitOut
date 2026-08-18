import { expect, test, type Page } from "@playwright/test";

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
// `app/listings/[id]/book/loading.tsx` renders the SAME `<h1>Review and book</h1>` as the resolved
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
