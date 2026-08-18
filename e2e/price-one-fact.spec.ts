// BFLOW-04 / D-38 / D-39 / D-40 — ONE PRICE FACT, TWO SURFACES, MEASURED IN A REAL BROWSER.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS CLAIM CANNOT BE SETTLED ANYWHERE ELSE IN THIS REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// BFLOW-04 says a booker should RECOGNISE the price in the listing rail and the price at checkout as
// the same fact rather than as a second opinion. That is a claim about pixels, and every other layer
// answers a different question:
//
//   • `tests/design/price-surface.test.ts` reads SOURCE. It proves the two surfaces compute nothing and
//     say nothing forbidden. Its own footer says it cannot see this: jsdom has no layout and no
//     cascade, so two elements with DIFFERENT classes report the same (empty) computed style.
//   • `e2e/price-parity.spec.ts` proves the checkout's NUMBER equals the number the database froze. It
//     never opens the listing rail.
//   • "Both files import `PriceBreakdown`" is not the claim either. A component with a surface flag can
//     grow a branch that changes a weight, and every import stays exactly where it was.
//
// So the assertion here is COMPUTED-STYLE IDENTITY: `getComputedStyle` on both total elements,
// `font-size` / `font-weight` / `font-variant-numeric`, in BOTH themes. Equality AND the absolute
// expected values, separately — two elements that agree at the wrong size are as "equal" as two that
// agree at the right one, and only one of those is BFLOW-04 satisfied (`skeleton-geometry.spec.ts`
// records the same two-part shape for boxes).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS COPIED, AND FROM WHERE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • The seed, the signup, the venue-tz day math and `pickWindow` — `e2e/helpers/booker-seed.ts`. Its
//     day math is a BYTE-IDENTICAL copy of `price-parity.spec.ts`'s, not a re-derivation: timezone/DST
//     math re-derived per spec is the top booking-app failure mode (CLAUDE.md), so the rule is "same
//     math or none".
//   • `countHook` / `expectReachable` — `price-parity.spec.ts:207-232`. A BOUNDED POLL rather than a
//     locator auto-wait, deliberately, so "the hook was renamed" and "the page is slow" stay
//     distinguishable: an absent hook returns 0 and lands on the guard's own message instead of on a
//     generic locator timeout that says nothing about which invariant broke.
//   • The both-themes loop, `seedTheme` before the first `goto`, `document.fonts.ready` before any
//     measurement and the null-box guard — `skeleton-geometry.spec.ts` / `hold-countdown.spec.ts`.
//
// ⚠️ `e2e/price-parity.spec.ts` IS NOT TOUCHED BY THIS FILE and must not be. It is the ONE e2e spec that
// runs in CI (D-35) and its contract is that its only environment input is `DATABASE_URL`. This spec
// takes the same one and adds nothing, but it is a SEPARATE file precisely so that the CI-gated money
// spec's surface cannot drift through an edit made for a rendering claim.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — run and reverted, 18 August 2026. Command:
// `npx playwright test e2e/price-one-fact.spec.ts --project=chromium`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// PROBE (a) — THE MUTATION THIS FILE IS FOR. `src/components/booking/price-breakdown.tsx`'s RAIL
// branch taken off the shared `TOTAL_VALUE_CLASS` constant and given
// `"text-lg font-semibold tabular-nums"` — i.e. exactly the "one surface was restyled and the other
// was not" regression, and exactly the edit that leaves every source gate, every unit test and
// `price-parity.spec.ts` green.
//
//   ✘ 1 failed, 2 did not run:
//
//     Error: court: the rail's Total and the checkout's Total do not resolve to the same computed
//     type. rail {"fontSize":"18px","fontWeight":"600","fontVariantNumeric":"tabular-nums"} vs
//     checkout {"fontSize":"20px","fontWeight":"600","fontVariantNumeric":"tabular-nums"}. BFLOW-04's
//     claim is that a booker RECOGNISES these as one fact; a size or weight that differs between the
//     rail and checkout is the requirement failing, not a nuance. Both branches consume
//     TOTAL_VALUE_CLASS in price-breakdown.tsx precisely so this is true by construction rather than
//     by copy-paste.
//
//     expect(received).toEqual(expected)   - "fontSize": "18px"   + "fontSize": "20px"
//
//   The failure names BOTH computed sizes, which is what makes it actionable without opening the
//   component. ⚠️ "2 did not run" IS THE SERIAL MODE, NOT A BLIND SPOT IN THE MUTATION: this file is
//   `mode: "serial"`, so the grove case and the popover case are skipped once court is red. The grove
//   arm is exercised by every GREEN run — and it is the arm that would catch a HARDCODED 20px, since
//   grove's token resolves to 22px.
//
// PROBE (b) — WHY THE EQUALITY IS NOT THE WHOLE ASSERTION. The same mutation applied to BOTH branches
// (both `text-lg`). The two surfaces now AGREE — at the wrong size — the equality above passes
// perfectly, and the ABSOLUTE assertion is what goes red instead:
//
//     Error: court · rail: the Total does not render at the type 12-UI-SPEC rule 2 pins (text-xl
//     font-semibold, resolved through this theme's --text-xl / --font-weight-semibold tokens).
//     expect(received).toEqual(expected)   - "fontSize": "20px"   + "fontSize": "18px"
//
// That is the reason both halves are asserted separately rather than one being taken to imply the
// other, and it is the two-part shape `skeleton-geometry.spec.ts:309-318` records for boxes.
//
//   ✔ Both probes reverted → 3 passed (23.6s), `git diff` clean on `src/`.
//
// ⚠️ ONE MORE THING THE FIRST RUN OF THIS FILE MEASURED, because it cost 3 minutes and will cost the
// next reader the same: it failed on a STALE DEV SERVER. `playwright.config.ts` sets
// `reuseExistingServer: !process.env.CI`, and a `next dev` left running across the commits that
// created `service-fee-popover.tsx` served a 500 whose only page-side symptom was
// `Jest worker encountered 2 child process exceptions` — which surfaced here as
// `waiting for getByRole('button', { name: '8:00 AM' })` and reads exactly like a slot-picker defect.
// IF THIS FILE FAILS ON A CLEAN `git status`, KILL THE SERVER ON :3000 AND RE-RUN BEFORE TOUCHING A
// COMPONENT. (`reduced-motion.spec.ts` trap 4, restated by `skeleton-geometry.spec.ts:103-109`.)
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • IT DOES NOT VISIT THE SHEET. RESP-02's mobile booking sheet is plan 12-10's, and so is
//     `sheet-price-total`. This file asserts `.toBe(1)` on the two hooks that exist TODAY and
//     deliberately says nothing about a third; 12-10 extends it. A `sheet-price-total` assertion added
//     here before that plan would be red for a surface nobody has written.
//   • ONE VIEWPORT WIDTH (1280) FOR BOTH SURFACES. The rail and the checkout column are compared where
//     they both render at desktop, and nowhere else. Nothing here says the two totals still agree at
//     375px — where the rail is not the surface a booker reads at all — and the sticky-bar / sheet
//     widths are 12-10's and 12-11's to measure.
//   • IT MEASURES TYPE, NOT VALUE. Two elements can resolve to identical type while showing different
//     numbers. The NUMBER is `price-parity.spec.ts`'s (DOM vs the frozen DB column) and
//     `tests/booking/all-in-table.test.ts`'s (`space + fee === total`, per key).
//   • ONE LISTING, ONE MODE, ONE WINDOW SHAPE. An `instant`, EXCLUSIVE, hourly booking at a flat rate.
//     It says nothing about the full-day line, the D-108 surcharge line, or the drop-in per-pass
//     breakdown — all three of which the rail can now render.
//   • THE POPOVER CASE PROVES BEHAVIOUR, NOT COMPREHENSION. It proves the explanation is reachable by
//     click, dismissible by `Escape`, and states no percentage. Whether the sentence answers the
//     question a booker actually has is a UAT question, not a Playwright one.
//   • NOT IN CI (D-24). It seeds real rows and signs users up against the local Postgres.

import { expect, test, type Page } from "@playwright/test";

import {
  openSeededListing,
  pickWindow,
  seedBookableListing,
  signUpBooker,
  type SeededListing,
} from "./helpers/booker-seed";
import { seedTheme } from "./helpers/theme";

// Run in ONE worker, sequentially: every test seeds through the same connection and signs a booker up,
// and the rapid open/close churn of parallel workers intermittently drops the client mid-query
// (`public-listing.spec.ts:108-112` and `hold-countdown.spec.ts:102-104` record the same reason).
test.describe.configure({ mode: "serial" });

const THEMES = ["court", "grove"] as const;

/** Both surfaces are compared here and only here — see the NOT COVERED footer. */
const WIDTH = 1280;

/**
 * The type the Total resolves to, per theme — 12-UI-SPEC § Typography rule 2, which calls this "the
 * single most load-bearing typographic fact in the phase".
 *
 * DERIVED FROM THE TOKENS, not guessed: `TOTAL_VALUE_CLASS` is `text-xl font-semibold tabular-nums`,
 * and `globals.css` re-declares both tokens per theme — `--text-xl` is 1.25rem in court and 1.375rem in
 * grove, `--font-weight-semibold` is 600 and 700. At the 16px root that is 20px/600 and 22px/700.
 *
 * The GROVE row is the one that makes this assertion worth writing. If the two themes shared a size,
 * a spec that only ever ran court could not tell "the token travels" from "the token is hardcoded".
 */
const EXPECTED_TOTAL_TYPE = {
  court: { fontSize: "20px", fontWeight: "600" },
  grove: { fontSize: "22px", fontWeight: "700" },
} as const;

/**
 * `tabular-nums` is asserted as a third dimension rather than folded into the class string, because it
 * is the one of the three that a booker notices as MOVEMENT: proportional digits change width as the
 * total changes, so a figure that re-renders appears to jitter. GATE-05's visual half.
 */
const EXPECTED_VARIANT = "tabular-nums";

/** One window per test, so two live holds on one exclusive listing never overlap. */
const WINDOWS = {
  court: ["8:00 AM", "9:00 AM"],
  grove: ["11:00 AM", "12:00 PM"],
  popover: ["2:00 PM", "3:00 PM"],
} as const;

/** The accessible name D-39 assigns the fee explainer's trigger. A question, because that is the ask. */
const TRIGGER_NAME = "What is the service fee?";

/** Radix's own hook on the open bubble. Not a `data-testid`: the primitive already publishes it. */
const POPOVER_CONTENT = '[data-slot="popover-content"]';

/** The hedge D-40 removed. Word-anchored and case-sensitive, exactly as the source gate's needle is. */
const HEDGE = /\bEst\./;

type ComputedType = {
  fontSize: string;
  fontWeight: string;
  fontVariantNumeric: string;
};

let seed: SeededListing;

test.beforeAll(async () => {
  seed = await seedBookableListing({ titlePrefix: "E2E PriceOneFact" });
});

test.afterAll(async () => {
  await seed.teardown();
});

/**
 * A BOUNDED poll rather than a locator auto-wait — the `price-parity.spec.ts:207-220` idiom, widened to
 * take the hook's name because this file addresses three of them.
 *
 * 15s rather than 10: this spec drives two ROUTE transitions per test on a `next dev` server, and a
 * cold Turbopack compile of the listing route has been measured at over 5s in this repository. The
 * point of the bound is that an ABSENT hook still returns 0 and lands on `expectReachable`'s own
 * message, not that the number is tight.
 */
async function countHook(page: Page, testId: string): Promise<number> {
  const hook = page.getByTestId(testId);
  const deadline = Date.now() + 15_000;
  let count = await hook.count();
  while (count === 0 && Date.now() < deadline) {
    await page.waitForTimeout(250);
    count = await hook.count();
  }
  return count;
}

/**
 * TRAP 1 (`scroll-area-overflow.spec.ts:215-223`): assert the page rendered the thing under test BEFORE
 * asserting anything about it.
 *
 * `.toBe(1)` and never `toBeGreaterThan(0)`, on both counts and for two different reasons. ZERO means
 * every measurement below runs against nothing — and a computed-style comparison of two absent elements
 * is the vacuity this whole file is written around. MORE THAN ONE means a document holds two totals for
 * one surface, which is precisely what `rail-price-total` exists to prevent: `price-parity.spec.ts`
 * normalises the hook's text back to integer centavos, and with two matches it would silently parse
 * whichever came first in the DOM — on the one CI-gated money spec.
 */
function expectReachable(count: number, testId: string, where: string): void {
  expect(
    count,
    `${where}: the page rendered ${count} elements carrying the \`${testId}\` hook; expected exactly ` +
      `1. 0 means the hook was renamed or the surface stopped rendering its breakdown, and every ` +
      `assertion below would then be measuring nothing. More than 1 means one document holds two ` +
      `totals for one surface, which makes "the rendered total" ambiguous for the parity spec that ` +
      `reads it. Both ids are declared in src/lib/design/selector-contract.ts and rendered by ` +
      `src/components/booking/price-breakdown.tsx.`,
  ).toBe(1);
}

/**
 * Read one total element's computed type.
 *
 * The null guard is the same one `hold-countdown.spec.ts:180-197` writes around boxes and for the same
 * reason: every comparison in this file is an equality over two values read from the DOM, and two
 * absent elements produce two identical nulls. `expectReachable` runs first; this is the second net.
 */
async function typeOf(page: Page, testId: string, where: string): Promise<ComputedType> {
  const measured = await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null;
    const style = window.getComputedStyle(el);
    return {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontVariantNumeric: style.fontVariantNumeric,
    };
  }, testId);

  expect(
    measured,
    `${where}: [data-testid="${testId}"] has no computed style — the element is not in the document. ` +
      `Two null styles compare equal, which is the vacuity every assertion here is written around.`,
  ).not.toBeNull();
  return measured!;
}

/**
 * The rendered text of the PRICE SURFACE a given total belongs to — the enclosing `PanelCard`.
 *
 * Scoped by walking UP from the total rather than by naming a selector per route, because the two
 * surfaces are two different routes and a per-route selector is a second thing to keep true. Scoped at
 * all rather than reading the whole page, so the hedge assertion cannot be reddened (or, worse,
 * greened) by copy that has nothing to do with the price.
 */
async function priceSurfaceText(page: Page, testId: string, where: string): Promise<string> {
  const text = await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    const panel = el?.closest('[data-testid="panel-card"]');
    return panel instanceof HTMLElement ? panel.innerText : null;
  }, testId);

  expect(
    text,
    `${where}: [data-testid="${testId}"] is not inside a [data-testid="panel-card"], so there is no ` +
      `price surface to read. An absence assertion over a null string is vacuous.`,
  ).not.toBeNull();
  return text!;
}

/** Sign a booker up, open the seeded listing and pick a venue-tz window. Leaves the rail summarising. */
async function reachSelectedRail(
  page: Page,
  window: readonly string[],
): Promise<void> {
  await signUpBooker(page, seed);
  await openSeededListing(page, seed);
  await pickWindow(page, window[0], window[1]);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (a) + (b) + (c) — the same fact, the hook counts, and the absent hedge. Once per theme.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("BFLOW-04 — the rail's Total and checkout's Total are one fact", () => {
  for (const theme of THEMES) {
    test(`${theme} · both totals resolve to identical computed type`, async ({ page }) => {
      test.setTimeout(180_000);

      // BEFORE the first navigation, on the CONTEXT: next-themes' pre-paint script reads the seeded
      // key on the very first paint, so there is no flash and no post-hydration swap to wait out.
      await seedTheme(page.context(), theme);
      await page.setViewportSize({ width: WIDTH, height: 900 });

      // ── THE RAIL ────────────────────────────────────────────────────────────────────────────────
      await reachSelectedRail(page, WINDOWS[theme]);

      const railWhere = `${theme} · listing rail`;
      expectReachable(await countHook(page, "rail-price-total"), "rail-price-total", railWhere);

      // The listing page must NOT emit the checkout hook. This is the structural half of the
      // per-surface-id decision: `price-parity.spec.ts` reads `price-total` and normalises its text
      // back to centavos, so a rail that also emitted it would put a second candidate in a document
      // that spec never visits — and 12-10 is about to mount a THIRD breakdown on this very route.
      expect(
        await page.getByTestId("price-total").count(),
        `${railWhere}: the listing page emits the checkout's \`price-total\` hook. Each surface owns ` +
          `exactly one id (D-38 / 12-04) so that every document holds one match per hook.`,
      ).toBe(0);

      await expect(page.getByTestId("rail-price-total")).toBeVisible();
      // Fonts settle BEFORE anything is read: a fallback face resolves to a different computed size
      // in some engines, and a measurement taken mid-swap is a measurement of neither state.
      await page.evaluate(() => document.fonts.ready);
      const railType = await typeOf(page, "rail-price-total", railWhere);
      const railText = await priceSurfaceText(page, "rail-price-total", railWhere);

      // (d)'s cheap half, asserted on both surfaces: the fee explains itself HERE too, not only at
      // checkout. One component, three call sites — the rail is one of them.
      expect(
        await page.getByRole("button", { name: TRIGGER_NAME }).count(),
        `${railWhere}: the rail's Service fee line carries ${await page
          .getByRole("button", { name: TRIGGER_NAME })
          .count()} explainers; expected exactly 1 (D-39).`,
      ).toBe(1);

      // ── CHECKOUT ────────────────────────────────────────────────────────────────────────────────
      const bookBtn = page.getByRole("button", { name: "Book this space" });
      await expect(bookBtn).toBeEnabled();
      await bookBtn.click();
      await page.waitForURL(/\/book\?hold=/);

      const checkoutWhere = `${theme} · checkout`;
      expectReachable(await countHook(page, "price-total"), "price-total", checkoutWhere);
      expect(
        await page.getByTestId("rail-price-total").count(),
        `${checkoutWhere}: the checkout emits the listing rail's \`rail-price-total\` hook.`,
      ).toBe(0);

      await expect(page.getByTestId("price-total")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const checkoutType = await typeOf(page, "price-total", checkoutWhere);
      const checkoutText = await priceSurfaceText(page, "price-total", checkoutWhere);

      // ── (a) THE IDENTITY ────────────────────────────────────────────────────────────────────────
      expect(
        checkoutType,
        `${theme}: the rail's Total and the checkout's Total do not resolve to the same computed ` +
          `type. rail ${JSON.stringify(railType)} vs checkout ${JSON.stringify(checkoutType)}. ` +
          `BFLOW-04's claim is that a booker RECOGNISES these as one fact; a size or weight that ` +
          `differs between the rail and checkout is the requirement failing, not a nuance. Both ` +
          `branches consume TOTAL_VALUE_CLASS in price-breakdown.tsx precisely so this is true by ` +
          `construction rather than by copy-paste.`,
      ).toEqual(railType);

      // …AND THE ABSOLUTE VALUES, separately. Two elements that agree at the WRONG size are as
      // "equal" as two that agree at the right one, and the equality above cannot tell them apart.
      const expected = EXPECTED_TOTAL_TYPE[theme];
      for (const [surface, observed] of [
        ["rail", railType],
        ["checkout", checkoutType],
      ] as const) {
        expect(
          { fontSize: observed.fontSize, fontWeight: observed.fontWeight },
          `${theme} · ${surface}: the Total does not render at the type 12-UI-SPEC rule 2 pins ` +
            `(text-xl font-semibold, resolved through this theme's --text-xl / ` +
            `--font-weight-semibold tokens). A hardcoded size would show up here as court's value ` +
            `appearing under grove.`,
        ).toEqual(expected);
        expect(
          observed.fontVariantNumeric,
          `${theme} · ${surface}: the Total lost \`tabular-nums\`. Proportional digits change width ` +
            `as the figure changes, so a total that re-renders appears to jitter — GATE-05's visual ` +
            `half (12-UI-SPEC § Typography rule 1).`,
        ).toBe(EXPECTED_VARIANT);
      }

      // ── (c) THE HEDGE IS ABSENT FROM BOTH RENDERED SURFACES (D-40) ──────────────────────────────
      // The RENDERING half of 12-UI-SPEC AC#9; `tests/design/price-surface.test.ts` owns the source
      // half. Both are needed: source says nothing about a string assembled at runtime, and a DOM
      // scan says nothing about a file that is not on screen in this one state.
      for (const [surface, text] of [
        ["rail", railText],
        ["checkout", checkoutText],
      ] as const) {
        // Guard the guard: an absence assertion over an empty string is free.
        expect(
          text,
          `${theme} · ${surface}: the price surface rendered no text at all, so the hedge assertion ` +
            `below would pass over nothing.`,
        ).toContain("Total");
        expect(
          HEDGE.test(text),
          `${theme} · ${surface}: the price surface hedges its figure. The rail's number is EXACT — ` +
            `the RSC applies the same fee to the same space price checkout freezes — so hedging it ` +
            `understates a guarantee the system actually makes and teaches the booker to expect the ` +
            `number to move (D-40 / 12-UI-SPEC AC#9). Rendered text: ${JSON.stringify(text)}`,
        ).toBe(false);
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (d) THE POPOVER — reachable by touch, dismissible by keyboard, and naming no rate.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("D-39 — the fee explains itself, on touch as well as on hover", () => {
  test("44px trigger, opens on CLICK and not on hover, Escape restores focus, body has no %", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await seedTheme(page.context(), "court");
    await page.setViewportSize({ width: WIDTH, height: 900 });

    await reachSelectedRail(page, WINDOWS.popover);

    const where = "fee popover";
    expectReachable(await countHook(page, "rail-price-total"), "rail-price-total", where);

    const trigger = page.getByRole("button", { name: TRIGGER_NAME });
    await expect(
      trigger,
      `${where}: the rail's Service fee line has no explainer. Every assertion below reads this ` +
        `element, and a locator that matches nothing times out on a message about selectors rather ` +
        `than about the affordance.`,
    ).toHaveCount(1);
    await expect(trigger).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    // ── THE TARGET SIZE (WCAG 2.5.5 · 12-UI-SPEC § Spacing) ──────────────────────────────────────
    const box = await trigger.boundingBox();
    expect(
      box,
      `${where}: the trigger has no layout box — absent, or display:none. A null box cannot fail a ` +
        `size assertion, which is why this is checked before the numbers.`,
    ).not.toBeNull();
    expect(
      { width: box!.width, height: box!.height },
      `${where}: the fee explainer's hit area is ${box!.width} x ${box!.height}, below the 44 x 44 ` +
        `WCAG 2.5.5 target. The glyph is 16px INSIDE a 44px box on purpose (size-11); shrinking the ` +
        `box to the glyph makes the one explanation on this money surface a coin-flip to tap.`,
    ).toEqual({ width: 44, height: 44 });

    // A `title` is a browser tooltip by another name — the hover-only affordance D-39 rejected,
    // smuggled back in through the platform rather than through a component.
    expect(
      await trigger.getAttribute("title"),
      `${where}: the trigger carries a \`title\` attribute. That renders as a native tooltip, which ` +
        `is exactly the hover-only explanation D-39 refused: roughly half this traffic is touch, ` +
        `where a hover affordance is not a subtle explanation but an absent one.`,
    ).toBeNull();

    // ── HOVER MUST NOT OPEN IT. THE NEGATIVE IS THE POINT. ───────────────────────────────────────
    // A popover that also opens on hover has quietly become the tooltip that was rejected, and every
    // positive assertion below would still pass. The wait is real time on the runner's clock, long
    // enough to outlast any open delay a tooltip primitive would impose.
    await trigger.hover();
    await page.waitForTimeout(1_000);
    expect(
      await page.locator(POPOVER_CONTENT).count(),
      `${where}: hovering the trigger OPENED the explanation. D-39 requires click: a hover-only (or ` +
        `hover-also) affordance is unreachable on touch, and this is the money surface.`,
    ).toBe(0);

    // ── CLICK OPENS IT ──────────────────────────────────────────────────────────────────────────
    await trigger.click();
    const content = page.locator(POPOVER_CONTENT);
    await expect(
      content,
      `${where}: clicking the trigger did not open the explanation.`,
    ).toHaveCount(1);
    await expect(content).toBeVisible();

    const body = (await content.textContent()) ?? "";
    // Guard the guard FIRST: "contains no %" is satisfied perfectly by an empty bubble.
    expect(
      body,
      `${where}: the popover opened with no text in it, so the percentage ban below would pass over ` +
        `nothing.`,
    ).toContain("Service fee");
    expect(
      body.length,
      `${where}: the popover body is ${body.length} characters — too short to be the explanation.`,
    ).toBeGreaterThan(60);

    expect(
      body.includes("%"),
      `${where}: the fee explanation names a percentage. It must not, on two independent grounds ` +
        `(12-UI-SPEC AC#12): SERVICE_FEE_BPS is server-only and a non-public env override is NOT ` +
        `inlined into the browser bundle, so a hardcoded rate here can go stale while checkout ` +
        `charges something else — the number going UP between browsing and paying, which is the D-75 ` +
        `failure the all-in rate exists to prevent; and the fee's AMOUNT is on the line beside the ` +
        `trigger anyway. Rendered body: ${JSON.stringify(body)}`,
    ).toBe(false);

    // ── ESCAPE CLOSES IT AND FOCUS COMES BACK ───────────────────────────────────────────────────
    // Radix owns both behaviours; they are ASSERTED here rather than re-implemented in the component,
    // which is the whole reason `service-fee-popover.tsx` composes the vendored primitive. A
    // hand-rolled bubble is where focus goes to the document body and a keyboard user is dropped at
    // the top of the page — on the panel where money commits.
    await page.keyboard.press("Escape");
    await expect(
      content,
      `${where}: Escape did not dismiss the explanation.`,
    ).toHaveCount(0);
    expect(
      await trigger.evaluate((el) => el === document.activeElement),
      `${where}: focus did not return to the trigger after Escape. A keyboard user who opens this ` +
        `explanation and closes it must be back where they were, not at the top of the document.`,
    ).toBe(true);
  });
});
