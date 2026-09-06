// SHELL-03 / GATE-03 — THE CHECKOUT HEADER'S COUNTDOWN, MEASURED WITH A CONTROLLED CLOCK.
//
// Three claims, and each one is unreachable from every other layer in this repository:
//
//   (a) HEADER BOX STABILITY. The header and the countdown slot measure identically with the slot
//       empty, at 14:52, at 0:09 and at "Hold expired", at 375 / 768 / 1280, in both themes. jsdom
//       performs no layout, so `tests/design/**` cannot see this at all.
//   (b) ANNOUNCE-ONCE. The sr-only polite region's text changes EXACTLY ONCE across a full run —
//       `toBe(1)`, never `toBeGreaterThan(0)`, because the whole property is the UPPER bound.
//   (c) ONE COUNTDOWN PER DOCUMENT. `[data-testid="hold-countdown"]` resolves to exactly 1.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THIS IS THE FIRST `page.clock` USER IN THIS REPOSITORY, AND THE INSTALL ORDER IS LOAD-BEARING
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `e2e/` contained ZERO occurrences of `page.clock` when this file landed (measured, not assumed), so
// there was no in-repo analog to copy for the clock half. Playwright's own caveat is the thing to carry
// forward, quoted from `clock.pauseAt`'s documentation:
//
//   "For best results, install the clock before navigating the page and set it to a time slightly
//    before the intended test time. This ensures that all timers run normally during page loading,
//    preventing the page from getting stuck."
//
// So `page.clock.install()` is called BEFORE the navigation to the page whose timers it must control.
// A clock installed after that navigation does not control the timers the page already created, and
// the countdown's `setInterval` is exactly such a timer: the spec would then be measuring a real
// fifteen-minute wall clock and would pass by never reaching any state at all.
//
// ⚠ "BEFORE THE FIRST `goto` IN EVERY TEST" IS WHAT THIS BLOCK USED TO SAY, AND IT WAS TOO WIDE BY
// THREE NAVIGATIONS. THAT OVER-APPLICATION IS WHAT MADE THIS FILE RED ON THE RUNNER FOR FOUR PLANS.
// Installing before the SIGNUP navigation also puts the fake clock in force over `/listings/[id]`'s
// availability calendar — a surface this file never asserts anything about and merely walks through.
// 19.1-18 measured, in the runner's own image, what the fake clock does to it:
//
//     clock installed :  the grid arrives with YESTERDAY marked selected (9/5), and a click on the
//                        target day "September 9th, 2026" marks 9/8 — one venue-day early
//     no clock        :  the grid arrives with today marked (9/6); the same click marks 9/9
//
// `data-day` and `aria-label` agree on every cell in both conditions, so nothing was mis-targeted:
// `availability-calendar.tsx:537` rebuilds the selection as `new TZDate(y, m - 1, d, timezone)`, and
// that constructor shifts under a replaced global `Date`. `install({ time: new Date() })` does not
// help — the instant is not the variable, the fake `Date` is. The click itself was RECEIVED on every
// attempt (`DETACHED=no`, the trace's own click call log), so no retry was warranted and none was
// added. Transcript: `.planning/phases/19.1-…/evidence/triage-day-click-container.txt`.
//
// The narrowest fix that keeps BOTH facts true is `placeHold`'s `beforeCheckoutNavigation` hook: the
// calendar is walked with a real clock, and the fake one is installed on the listing page immediately
// before the click that navigates to `/…/book`. Proved in the container to still drive the countdown
// — a 60-second `fastForward` moved it `14:57 → 13:56`.
//
// The other half of that caveat is why the states are reached with `pauseAt` / `fastForward` and NEVER
// with a wait: a paused clock fires no timers, so a NAVIGATION under a paused clock can hang React's
// scheduler. Every navigation in this file happens with the clock running, and the clock is `resume()`d
// before the one reload that follows a pause.
//
// ⚠️ `fastForward` and `pauseAt` "only fire due timers AT MOST ONCE" — the laptop-lid semantics. A
// one-minute `fastForward` therefore produces ONE tick with a 60-second delta, not sixty ticks. That is
// what makes the minute-by-minute sampling in (b) exactly 15 samples rather than 900, and it is also
// why the component's threshold latch requires a POSITIVE remainder (see `hold-countdown.tsx`).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE TTL IS RE-FROZEN BEFORE THE GEOMETRY RUN, AND THAT IS NOT A CHEAT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A fake clock can only move FORWARD. By the time a booker has signed up, searched, picked a window and
// landed on the checkout, a real 15-minute hold has perhaps 14:55 left — so "pause at 14:52 remaining"
// is a target three seconds away on a fast machine and already in the past on a slow one, and the spec
// would be flaky for a reason that has nothing to do with the header.
//
// So the row's `expires_at` is re-frozen to a generous TTL and the page reloaded before the geometry
// states are driven. What the countdown renders is the REMAINDER, so the box measured at 14:52 is
// byte-for-byte the box a real hold shows at 14:52; the TTL's absolute length is not an input to
// anything under test here. Case (b) does NOT do this — it drives a genuine hold from the deadline the
// server actually froze.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — see the SUMMARY for the verbatim output of both.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   (i)  THE EXPIRY ARM RESTORED. `hold-countdown.tsx`'s announcement region given back its
//        `expired ? "Your hold has expired." : …` arm and an unconditional `aria-live="polite"`.
//        Case (b) fails with a change count of 2, printing the whole sampled sequence. Blast radius:
//        the jsdom cases (3), (4) and (5) in `tests/booking/hold-countdown.test.tsx` fail too, which is
//        the correct shape — the browser gate and the unit gate are measuring one property from two
//        sides, and a mutation that only one of them caught would mean the other was decorative.
//
//   (ii) THE RESERVATION REMOVED. `HOLD_COUNTDOWN_BOX` at the countdown slot replaced with `min-w-0`.
//        Case (a) fails on the COUNTDOWN box, naming the two states that differ and their widths.
//
//        ⚠️ THE HEADER BOX ALONE WOULD HAVE STAYED GREEN, and that is the whole reason this file reads
//        two boxes rather than the one the plan names. `site-header` is `HEADER_HEIGHT` tall and
//        full-bleed, so its bounding box is a function of the VIEWPORT and cannot move no matter what
//        the slot inside it does. `e2e/shell.spec.ts:92-112` records the identical finding for
//        `AUTH_SLOT_BOX`: the prescribed mutation left both prescribed boxes byte-identical, and the
//        fix was to measure the box the constant actually pins. Same lesson, second time.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • NOT IN CI (D-24). It signs users up against the local Postgres and boots a dev server.
//   • It says nothing about what a screen reader actually SPEAKS. A text-change count is a proxy — a
//     good one, because a live region whose text does not change cannot announce — not an AT recording.
//   • It measures the EXCLUSIVE hourly path only. A drop-in (open-capacity) hold reaches the same
//     header through the same context, and nothing here would notice if it did not.
//   • It does not assert the countdown's ABSOLUTE width. `HOLD_COUNTDOWN_BOX`'s 96px is pinned in
//     `src/lib/design/measurements.ts` and by the source gates; what is asserted here is that the four
//     states agree, which is the claim the reservation exists to make.
//   • The expiry SWAP of the page body (D-44 → `HoldExpiredState`) is asserted only incidentally, by
//     the `Hold expired` state being reachable. `tests/booking/**` owns that behaviour.

import { expect, test, type Page } from "@playwright/test";

import {
  placeHold,
  readExpiresAt,
  seedBookableListing,
  signUpBooker,
  type SeededListing,
} from "./helpers/booker-seed";
import { seedTheme } from "./helpers/theme";

// Run in ONE worker, sequentially: every test seeds through the same connection and signs a booker up,
// and the rapid open/close churn of parallel workers intermittently drops the client mid-query
// (`public-listing.spec.ts:108-112` records the same reason).
test.describe.configure({ mode: "serial" });

const THEMES = ["court", "grove"] as const;
const WIDTHS = [375, 768, 1280] as const;

/** A generous TTL for the geometry run — see the header. */
const GEOMETRY_TTL_MINUTES = 30;

/** The two mid-hold readings the states are named for, as remaining milliseconds. */
const AT_14_52_MS = 14 * 60_000 + 52_000;
const AT_0_09_MS = 9_000;

/** One window per test, so two live holds on one exclusive listing never overlap. */
const WINDOWS = {
  courtGeometry: ["8:00 AM", "9:00 AM"],
  groveGeometry: ["11:00 AM", "12:00 PM"],
  announce: ["2:00 PM", "3:00 PM"],
  count: ["5:00 PM", "6:00 PM"],
} as const;

type Box = { x: number; y: number; width: number; height: number };

let seed: SeededListing;

test.beforeAll(async () => {
  seed = await seedBookableListing({ titlePrefix: "E2E HoldCountdown" });
});

test.afterAll(async () => {
  await seed.teardown();
});

/**
 * TRAP 1 (`scroll-area-overflow.spec.ts:215-223`): assert the page rendered the thing under test BEFORE
 * asserting anything about it.
 *
 * Every comparison in case (a) is `expect(a).toEqual(b)` over two values read from the DOM, and
 * `null` equals `null` perfectly. A checkout that 404'd, redirected or lost its header would satisfy
 * every equality and prove nothing.
 */
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE STREAMING-BUFFER RULE — why some locators here carry `.filter({ visible: true })`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// React parks a Suspense boundary's payload in a `<div hidden id="S:n">` while it reveals it, so on a
// route with a `loading.tsx` every SERVER-RENDERED element on the page briefly exists TWICE — once live,
// once in that buffer. A Playwright locator matches hidden elements, so it resolves to 2 and strict mode
// throws before `toBeVisible()` ever filters. The canonical account — the DOM timeline, the measurements,
// and why `.first()`, a longer timeout and a CSS scope were each rejected — is in
// `e2e/search-and-book.spec.ts`; search it for THE STREAMING-BUFFER RULE. Session:
// `.planning/debug/resolved/confirmation-reference-duplicate.md`.
//
// MEASURED FOR THIS FILE: exactly ONE site is exposed — `price-total` in `expectCheckoutReachable`
// below. The checkout header's countdown is composed in `listings/[id]/book/layout.tsx`, outside the
// page's Suspense boundary, so `site-header` / `hold-countdown` / `role="timer"` never enter the buffer
// (observed on 8/8 loads) and every geometry and announce-once assertion here stands as written.
//
// AND THE FAKE CLOCK CHANGES NOTHING. This file is the repo's first `page.clock` user, so it was worth
// checking rather than assuming: with `page.clock.install()` and without it, the buffer appeared on 8/8
// loads with a byte-identical payload. The clock governs the page's timers; the streaming reveal is the
// document parser and React's runtime, which the clock does not touch. Navigations here already happen
// with the clock running (see the header), so nothing about the install order interacts with this.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

async function expectCheckoutReachable(
  page: Page,
  where: string,
  mode: "live" | "expired-body",
): Promise<void> {
  await expect(
    page.getByTestId("site-header"),
    `${where}: no [data-testid="site-header"]. Every box comparison here reads this element, and two ` +
      `absent boxes compare equal — so this is a failure, not a skip.`,
  ).toHaveCount(1);

  // ⚠️ THE `<h1>` IS NOT A REACHABILITY SIGNAL ON THIS ROUTE, and that was measured the hard way.
  // `app/listings/[id]/book/loading.tsx` renders the SAME `<h1>Confirm and pay</h1>` as the resolved
  // page. A guard built on it passes against the SKELETON — observed on the first run of this file,
  // with `main`'s entire text reading "Review and bookLoading your booking" — the heading plan 12-11
  // later renamed on BOTH files at once, which changes nothing about the trap, because the trap is the
  // DUPLICATION and not the string. The assertion under it reported zero timers and looked like a
  // component defect. So each mode names the thing that only exists once its own body has arrived.
  //
  // AND THE EXPIRED BODY HAS NO `<h1>` AT ALL: `book/page.tsx` returns `<HoldExpiredState/>` directly
  // on a non-live hold — no `<main>`, no page header. Requiring one in both modes would have failed the
  // empty-slot state for a reason that has nothing to do with the header.
  if (mode === "live") {
    // ⚠️ `.filter({ visible: true })` — THE STREAMING-BUFFER RULE (see the block above the describe).
    // This is the ONLY exposed locator in this file, and that was measured rather than assumed: the
    // buffer parked on this route holds PAGE content only —
    //
    //   id=S:0  siteHeader=false  holdCountdown=false  timer=false  priceTotal=TRUE  main=true
    //   testids=[panel-card, price-disclosure, price-total, checkout-sticky-bar]      (8/8 loads)
    //
    // — so `site-header`, `hold-countdown`, its sr-only child and `role="timer"` are all composed in
    // `book/layout.tsx`, OUTSIDE the page's boundary, and cannot be duplicated by it. Every countdown
    // assertion in this file is therefore immune as written; `price-total` is the one thing here that
    // lives inside the boundary.
    //
    // AND THE HAZARD IS VACUITY, NOT A STRICT-MODE VIOLATION — the two matchers fail in opposite
    // directions and this one is a `toHaveCount`. `toHaveCount(1)` RETRIES, so a transient count of 2
    // heals itself and is harmless. What does not heal is the other phase: in the staged-only window
    // `price-total` exists ONLY inside the hidden buffer, the count is 1, and this guard goes green
    // while the live page is still showing `book/loading.tsx`'s skeleton — which is precisely the
    // vacuity the guard was written to prevent, arriving by a route its author could not have known
    // about. Requiring a VISIBLE one closes it. (`toBeVisible()` sites have the mirror-image problem:
    // strict mode is not retried away, so for them a transient 2 is the hard failure.)
    //
    // HONEST LIMIT OF THE EVIDENCE: across 10 fresh loads sampled the instant the readiness heading
    // resolved, this site showed neither phase — 0/10 vacuous, 0/10 overlapping. It is treated on the
    // STRUCTURAL fact (the buffer demonstrably contains `price-total` on 8/8 loads), not on a failure
    // anyone has watched here. 0/10 is not evidence of safety: the worst site in `search-and-book`
    // was green 5 times out of 10.
    //
    // `price-total` measured total=1 / visible=1 at 375, 768 AND 1280 — all three widths `capture()`
    // drives — so the filter cannot turn this guard red at a narrow viewport.
    await expect(
      page.getByTestId("price-total").filter({ visible: true }),
      `${where}: the checkout body has not resolved — book/loading.tsx's skeleton is still up, and ` +
        `its <h1> is identical to the resolved page's.`,
    ).toHaveCount(1);
  } else {
    await expect(
      page.getByRole("heading", { name: /your hold expired/i }),
      `${where}: the expected HoldExpiredState body is not on screen.`,
    ).toBeVisible();
  }
}

/** Read one element's box, rounded to 2dp so a sub-pixel float cannot fail an equality. */
// Copied from e2e/shell.spec.ts:192-201 / e2e/skeleton-geometry.spec.ts's null-box guard.
async function boxOf(page: Page, testId: string, where: string): Promise<Box> {
  const box = await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const round = (n: number) => Math.round(n * 100) / 100;
    return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
  }, testId);
  expect(
    box,
    `${where}: [data-testid="${testId}"] has no layout box — absent, or display:none. A null box ` +
      `compares equal to another null box, which is the vacuity every assertion here is written ` +
      `around.`,
  ).not.toBeNull();
  return box!;
}

/** The countdown slot's rendered text, whatever state it is in. */
async function slotText(page: Page): Promise<string> {
  return (await page.getByTestId("hold-countdown").textContent()) ?? "";
}

/**
 * A BOUNDED poll rather than a locator auto-wait, so the two failure modes stay distinguishable: a slow
 * render is waited out, and a hook that is genuinely absent returns 0 and lands on the guard's own
 * message instead of on a generic "locator resolved to 0 elements" timeout that says nothing about
 * which invariant broke. Idiom copied verbatim from `e2e/price-parity.spec.ts:207-220`.
 */
async function countHook(page: Page): Promise<number> {
  const hook = page.getByTestId("hold-countdown");
  const deadline = Date.now() + 10_000;
  let count = await hook.count();
  while (count === 0 && Date.now() < deadline) {
    await page.waitForTimeout(250);
    count = await hook.count();
  }
  return count;
}

/** Land a booker on a live checkout, with the clock installed and RUNNING. Returns the hold id. */
async function reachCheckout(
  page: Page,
  window: readonly [string, string] | readonly string[],
): Promise<string> {
  // ⚠ THE CLOCK IS INSTALLED BEFORE THE CHECKOUT NAVIGATION, NOT BEFORE THE SIGNUP ONE — see the
  // header's install-order block for what that distinction cost and how it was measured. Playwright's
  // caveat is about the page whose timers the clock has to control, and that page is `/…/book`.
  // `placeHold` runs this hook after the last calendar interaction and immediately before the click
  // that navigates there, so the countdown's `setInterval` is created under the fake clock exactly as
  // it was before, and the availability calendar is never driven under one.
  await signUpBooker(page, seed);
  return placeHold(page, seed, window[0], window[1], {
    beforeCheckoutNavigation: () => page.clock.install(),
  });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (a) HEADER BOX STABILITY — four states, three widths, two themes.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("SHELL-03 — the checkout header does not reflow once per session", () => {
  for (const theme of THEMES) {
    test(`${theme} · the header and countdown boxes are identical in all four states`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await seedTheme(page.context(), theme);
      await page.setViewportSize({ width: WIDTHS[0], height: 900 });

      const window = theme === "court" ? WINDOWS.courtGeometry : WINDOWS.groveGeometry;
      const holdId = await reachCheckout(page, window);

      // Re-freeze the TTL so a forward-only clock can reach 14:52 with headroom, then reload so the
      // page publishes the new deadline into the header. See the header for why this is sound.
      await seed.sql`
        UPDATE booking SET expires_at = now() + (${GEOMETRY_TTL_MINUTES} || ' minutes')::interval
        WHERE id = ${holdId}
      `;
      await page.reload();
      const expiresAt = await readExpiresAt(seed, holdId);

      const pageNow = await page.evaluate(() => Date.now());
      expect(
        expiresAt - pageNow,
        `the re-frozen hold has ${Math.round((expiresAt - pageNow) / 1000)}s left, which is already ` +
          `past the 14:52 state this run has to reach. A forward-only clock cannot get there. Raise ` +
          `GEOMETRY_TTL_MINUTES.`,
      ).toBeGreaterThan(AT_14_52_MS + 5_000);

      // FREEZE FIRST, THEN JUMP BY A MEASURED DELTA — and this shape was arrived at by measurement,
      // not preference. `pauseAt(<absolute instant>)` alone did NOT move the digits: with the clock
      // running and the interval due a second after mount, the one tick it is allowed to fire ran at
      // its own scheduled time rather than at the jumped-to instant, and the slot still read
      //
      //   Observed: "Time left to confirm30:00"   (expected to contain "14:52")
      //
      // `fastForward(delta)` from a clock that is ALREADY paused does land the tick on the jumped
      // instant — proven by case (b), whose fifteen one-minute jumps decrement the remainder by exactly
      // sixty seconds each and put the threshold announcement on the fourteenth step to the millisecond.
      // Pausing first is also what makes the deltas exact: while the clock runs, real time passes
      // between reading `Date.now()` and issuing the jump, and a few hundred milliseconds of drift is
      // the difference between rendering 14:52 and 14:51.
      await page.clock.pauseAt(new Date(pageNow + 1_000));

      /** Jump the frozen clock so the hold has exactly `remainingMs` left. */
      const driveTo = async (remainingMs: number, label: string) => {
        const now = await page.evaluate(() => Date.now());
        const delta = expiresAt - remainingMs - now;
        expect(
          delta,
          `${theme}: reaching ${label} needs the clock to move ${delta}ms, which is backwards. A fake ` +
            `clock only moves forward, so the states must be driven in descending order of remainder.`,
        ).toBeGreaterThan(0);
        await page.clock.fastForward(delta);
      };

      const boxes: { state: string; width: number; header: Box; slot: Box }[] = [];

      const capture = async (state: string, mode: "live" | "expired-body" = "live") => {
        for (const width of WIDTHS) {
          const where = `${theme} · ${width}px · ${state}`;
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(() => document.fonts.ready);
          await expectCheckoutReachable(page, where, mode);
          boxes.push({
            state,
            width,
            header: await boxOf(page, "site-header", where),
            slot: await boxOf(page, "hold-countdown", where),
          });
        }
      };

      // ── STATE 1: ticking, mid-hold ───────────────────────────────────────────────────────────────
      await driveTo(AT_14_52_MS, "14:52");
      await expect(
        page.getByTestId("hold-countdown"),
        `${theme}: the countdown did not reach 14:52. Observed: "${await slotText(page)}"`,
      ).toContainText("14:52");
      await capture("14:52", "live");

      // ── STATE 2: the final minute, where the numerals turn destructive ──────────────────────────
      await driveTo(AT_0_09_MS, "0:09");
      await expect(
        page.getByTestId("hold-countdown"),
        `${theme}: the countdown did not reach 0:09. Observed: "${await slotText(page)}"`,
      ).toContainText("0:09");
      await capture("0:09", "live");

      // ── STATE 3: expired ────────────────────────────────────────────────────────────────────────
      await driveTo(-2_000, "the expired render");
      await expect(
        page.getByTestId("hold-countdown"),
        `${theme}: the countdown did not reach its expired render. Observed: "${await slotText(page)}"`,
      ).toContainText("Hold expired");
      // "expired-body": the countdown reaching zero publishes `expired`, ReserveView swaps the page
      // for HoldExpiredState (D-44) and `price-total` goes with it. The mode is therefore also an
      // incidental proof that the bidirectional half of the context works.
      await capture("Hold expired", "expired-body");

      // ── STATE 4: the slot BEFORE a deadline is published ─────────────────────────────────────────
      // Reached as a REAL product state rather than by racing hydration: a cancelled hold renders
      // HoldExpiredState, so `book/page.tsx` never mounts its publisher, so the context's `expiresAt`
      // stays null and the header holds its empty reservation — which is exactly the state a booker
      // sees on the server's very first paint of this route. The clock is resumed first: a navigation
      // under a paused clock fires no timers and can hang React's scheduler.
      await page.clock.resume();
      await seed.sql`UPDATE booking SET status = 'cancelled' WHERE id = ${holdId}`;
      await page.reload();
      await expect(
        page.getByRole("heading", { name: /your hold expired/i }),
        `${theme}: cancelling the hold did not produce HoldExpiredState, so the "empty slot" state ` +
          `was never reached.`,
      ).toBeVisible();
      expect(
        (await slotText(page)).trim(),
        `${theme}: the countdown slot is not empty on a page that publishes no deadline. Observed: ` +
          `"${await slotText(page)}"`,
      ).toBe("");
      await capture("slot empty", "expired-body");

      // ── THE COMPARISON ───────────────────────────────────────────────────────────────────────────
      for (const width of WIDTHS) {
        const atWidth = boxes.filter((b) => b.width === width);
        expect(atWidth.length, `${theme} · ${width}px: expected 4 captured states`).toBe(4);
        const reference = atWidth[0];
        for (const observed of atWidth.slice(1)) {
          expect(
            observed.header,
            `${theme} · ${width}px: the site-header box MOVED between "${reference.state}" and ` +
              `"${observed.state}". ${JSON.stringify(reference.header)} vs ` +
              `${JSON.stringify(observed.header)}. SHELL-03's header is a fixed box; a countdown that ` +
              `resizes it reflows the whole page once per session.`,
          ).toEqual(reference.header);
          expect(
            observed.slot,
            `${theme} · ${width}px: the hold-countdown box CHANGED SIZE between "${reference.state}" ` +
              `and "${observed.state}". ${JSON.stringify(reference.slot)} vs ` +
              `${JSON.stringify(observed.slot)}. HOLD_COUNTDOWN_BOX is the reservation that makes all ` +
              `four states occupy one box; without it the slot shrink-wraps to whichever string is ` +
              `currently in it and the header's contents shuffle as the hold runs down.`,
          ).toEqual(reference.slot);
        }
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (b) ANNOUNCE-ONCE — the GATE-03 assertion, on a genuine server-frozen deadline.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("GATE-03 — the countdown announces exactly once", () => {
  test("the sr-only region's text changes ONCE across the hold, and not at expiry", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await seedTheme(page.context(), "court");
    await page.setViewportSize({ width: 1280, height: 900 });

    const holdId = await reachCheckout(page, WINDOWS.announce);
    // NO TTL re-freeze here: this case drives the deadline the server actually froze, so the property
    // is measured on a real hold rather than on a fixture-shaped one.
    const expiresAt = await readExpiresAt(seed, holdId);

    // The region is addressed as a DIRECT CHILD of the slot. The timer paragraph holds its own sr-only
    // span — the accessible name "Time left to confirm" — and a `.sr-only` query matching both would
    // report that name's disappearance at expiry as an announcement.
    const region = page.locator('[data-testid="hold-countdown"] > span.sr-only');
    await expect(
      region,
      "no sr-only announcement region as a direct child of the countdown slot — every sample below " +
        "would be null and the change count would be 0 for the wrong reason.",
    ).toHaveCount(1);

    // Start 14 minutes out: a forward-only clock cannot pause at a remainder the real hold has already
    // burned through, and reaching the checkout costs a few seconds of a 15-minute TTL.
    const STEPS = 14;
    const startRemaining = STEPS * 60_000;
    const pageNow = await page.evaluate(() => Date.now());
    expect(
      expiresAt - pageNow,
      `the hold has ${Math.round((expiresAt - pageNow) / 1000)}s left, less than the ${STEPS}-minute ` +
        `drive this case needs. The booker path took too long; the TTL is 15 minutes.`,
    ).toBeGreaterThan(startRemaining);

    await page.clock.pauseAt(new Date(expiresAt - startRemaining));

    const samples: { minuteMark: number; text: string }[] = [
      { minuteMark: STEPS, text: (await region.textContent()) ?? "" },
    ];
    for (let step = 1; step <= STEPS; step++) {
      await page.clock.fastForward(60_000);
      // The tick that `fastForward` fires is a page-side event; give React a real-time beat to paint it
      // before sampling. `waitForTimeout` here is the RUNNER's clock, not the page's.
      await page.waitForTimeout(50);
      samples.push({ minuteMark: STEPS - step, text: (await region.textContent()) ?? "" });
    }

    // Guard the guard #1 — the drive must have reached expiry, or "no change at expiry" is a claim
    // about a step that never happened.
    expect(
      await slotText(page),
      `the ${STEPS}-minute drive did not reach the expired render, so the expiry step below was ` +
        `never taken. Samples: ${JSON.stringify(samples)}`,
    ).toContain("Hold expired");

    const changes = samples.filter((s, i) => i > 0 && s.text !== samples[i - 1].text);

    // Guard the guard #2 — something must have been said, or the upper bound below is one assertion
    // away from passing on a countdown that announces nothing at all.
    expect(
      changes.length,
      `the region never changed text across the whole drive. The threshold announcement is the one ` +
        `thing this countdown is allowed to say. Samples: ${JSON.stringify(samples)}`,
    ).toBeGreaterThan(0);

    expect(
      changes.length,
      `the region's text changed ${changes.length} times. GATE-03 requires EXACTLY ONE — this is an ` +
        `upper bound, which is why it is toBe(1) and not toBeGreaterThan(0): every extra change is an ` +
        `extra sentence spoken over the booker, and a >= assertion is green for the defect. ` +
        `Samples: ${JSON.stringify(samples)}`,
    ).toBe(1);

    expect(
      changes[0].minuteMark,
      `the one change landed at ${changes[0].minuteMark} minutes remaining; it must land at the ` +
        `60-second threshold. Samples: ${JSON.stringify(samples)}`,
    ).toBe(1);
    expect(changes[0].text).toContain("One minute left");

    // Stated separately from the count, because "one change somewhere" and "one change, and it was not
    // at expiry" are different claims and only the second is GATE-03 rule 6.
    const atExpiry = samples[samples.length - 1];
    const beforeExpiry = samples[samples.length - 2];
    expect(
      atExpiry.text,
      `the expiry step changed the region from "${beforeExpiry.text}" to "${atExpiry.text}". ` +
        `HoldExpiredState — the thing that actually replaced the page — owns the expiry announcement; ` +
        `a second region reporting the same event is the double-announcement GATE-03 exists to catch.`,
    ).toBe(beforeExpiry.text);

    // …and the expired header carries no live region and no timer at all.
    const liveRegions = await page.evaluate(
      () =>
        document
          .querySelector('[data-testid="hold-countdown"]')
          ?.querySelectorAll("[aria-live], [role='timer']").length ?? -1,
    );
    expect(
      liveRegions,
      `the expired countdown still holds ${liveRegions} live-region/timer elements.`,
    ).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (c) ONE COUNTDOWN PER DOCUMENT.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

test.describe("D-49 — the digits exist exactly once on the checkout", () => {
  test("[data-testid=\"hold-countdown\"] resolves to exactly 1, and the rail carries no digits", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await seedTheme(page.context(), "court");
    await page.setViewportSize({ width: 1280, height: 900 });

    await reachCheckout(page, WINDOWS.count);
    await expectCheckoutReachable(page, "one-countdown", "live");

    const count = await countHook(page);
    expect(
      count,
      `the checkout rendered ${count} elements carrying the hold-countdown hook; expected exactly 1. ` +
        `0 means the hook was renamed or the header slot stopped rendering (every geometry assertion ` +
        `in this file would then be measuring nothing). More than 1 means the rail got its timer back ` +
        `— two role="timer" elements and two live regions on one money surface, which is the ` +
        `double-announcement GATE-03 exists to catch.`,
    ).toBe(1);

    // The countdown is in the HEADER, not in the page body. Asserted positionally rather than by
    // counting, because "one countdown" is satisfied by a countdown in the wrong place.
    const inHeader = await page.evaluate(
      () =>
        document
          .querySelector('[data-testid="site-header"]')
          ?.querySelector('[data-testid="hold-countdown"]') !== null,
    );
    expect(inHeader, "the one countdown is not inside the site header (D-49)").toBe(true);

    // And exactly one timer / one polite region in the whole document — the rail keeps the words and
    // loses the digits, so a second of either means the rail's copy grew a live region.
    const totals = await page.evaluate(() => ({
      timers: document.querySelectorAll('[role="timer"]').length,
      polite: document.querySelectorAll('main [aria-live="polite"]').length,
    }));
    expect(totals.timers, `the document holds ${totals.timers} role="timer" elements`).toBe(1);
    expect(
      totals.polite,
      `<main> holds ${totals.polite} polite live regions. D-49 puts the ONE region in the header; a ` +
        `polite region in the rail would announce alongside it.`,
    ).toBe(0);
  });
});
