import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { BASE, seedBookableListing, signUpBooker, type SeededListing } from "./helpers/booker-seed";
import { seedPaymentStates, type SeededPaymentStates } from "./helpers/seed-payment-states";
import { seedTheme } from "./helpers/theme";

// BFLOW-08 — THE CONFIRMATION MOMENT'S DECAY, MEASURED RATHER THAN DESCRIBED (D-60, D-61, D-89).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT ONLY A BROWSER CAN ANSWER, AND WHY THIS FILE EXISTS BESIDE AN RTL SUITE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/booking/confirmation-moment.test.tsx` owns everything a rendered TREE can answer: which
// facts, in which order, in which mode. It cannot answer ANY of the five things BFLOW-08 actually
// asks for, because jsdom has no layout and no history stack — every `getBoundingClientRect()` is
// zeros, so a height assertion there would pass against a component that rendered nothing (D-131).
//
// The requirement's words are *"a distinct confirmation moment that decays into the normal
// booking-detail page on later visits"*. Both halves are adjectives until they are measured:
//
//   DISTINCT →  the moment's box is at least the viewport minus the header, and `booking-detail`'s
//               top edge is at or past the viewport height — the ordinary page starts BELOW the fold.
//   DECAYS   →  the URL loses its query string in place, and a reload renders `booking-detail` with
//               ZERO `confirmation-moment` in the document.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠️ THE CASE THIS FILE PRIMARILY EXISTS FOR IS THE ONE THAT LOOKS LEAST RELATED: D-89
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `PendingPaymentState` polls `router.refresh()` — 8 attempts, 2500ms apart — which re-renders the
// RSC for whatever the address bar CURRENTLY says. So if `<ConsumePaidParam/>` were mounted anywhere
// the poller can reach, the first refresh after the strip would fall through the pending branch's
// probe into `redirect(…/book?hold=…)` and navigate a booker who has ALREADY PAID back to a checkout
// page, mid-webhook. That is a live booking-flow break, and it appears only under a slow webhook —
// which is to say, never on a developer's machine and always on a bad day in production.
//
// The measurement is a `framenavigated` COUNT rather than a final-URL comparison, and the difference
// matters: a bounce that landed the booker back on this URL by another route would satisfy "the URL
// is unchanged" perfectly. Counting navigations asks the question the defect is actually about.
//
// GUARD-THE-GUARD, AND IT IS NOT OPTIONAL: a navigation count of zero is satisfied PERFECTLY by a
// poller that never ran. So the same case asserts the poller reached its CAP — `PendingPaymentState`
// reveals its manual control only after the eighth attempt backs off, so that control appearing is
// the page's own evidence that all eight refreshes fired.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ONE BROWSER CONTEXT ACROSS THE WHOLE DESCRIBE, AND IT IS NOT A STYLE CHOICE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The booker signs up through the UI (the shipped idiom — `booker-seed.ts` gives its reasons), so the
// session lives in a COOKIE, and Playwright's `page` fixture builds a fresh context per test. MEASURED
// while writing this file: with the cases on the default fixture the first one passed and the second
// reported *"the pending payment state did not render"* — because the second context had no session
// at all and the owner gate (T-04-CONFIRMIDOR) 404s a booking that is not yours. Every box measured
// after that point would have been the not-found boundary's.
//
// `shell.spec.ts` answers this by putting everything in ONE test. This file instead creates the
// context once in `beforeAll` and hands the same page to each case, because two of the cases need a
// page the others must NOT have: the D-89 case installs a FAKE CLOCK, which is a document-level
// change that would then apply to every later navigation on the same page. A second page from the
// SAME context inherits the cookie and leaves the shared one untouched.

/** Read one element's box WITHOUT scrolling it into view — `shell.spec.ts:205`'s idiom, and its reason. */
async function boxOf(page: Page, testId: string) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const round = (n: number) => Math.round(n * 100) / 100;
    return { y: round(r.y), height: round(r.height) };
  }, testId);
}

/**
 * Every element inside the moment that is actually animating, with the two properties DS-04's global
 * reset sets.
 *
 * Scoped to the moment rather than to the document: the app shell above it carries its own motion
 * (the header, the toaster), and a document-wide scan would report on surfaces this file has nothing
 * to say about — 13-09's finding, that a claim must be measured over the thing it is a claim about.
 */
async function animationsInsideMoment(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="confirmation-moment"]');
    if (!root) return null;
    return Array.from(root.querySelectorAll("*"))
      .map((el) => {
        const cs = getComputedStyle(el);
        return {
          name: cs.animationName,
          // Computed values are seconds ("0.32s" / "0.00001s"). Parsed rather than string-matched so
          // the assertion survives a formatting change in the engine (`reduced-motion.spec.ts`'s note).
          durationSeconds: Number.parseFloat(cs.animationDuration),
          iterationCount: cs.animationIterationCount,
        };
      })
      .filter((a) => a.name !== "none" && a.name !== "");
  });
}

/** Fail loudly if emulation silently did not apply — `reduced-motion.spec.ts`'s trap 1. */
async function expectReducedMotion(page: Page, shouldMatch: boolean) {
  const matches = await page.evaluate(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(
    matches,
    `reduced-motion emulation did not reach the page (expected matches=${shouldMatch})`,
  ).toBe(shouldMatch);
}

test.describe("BFLOW-08 — the confirmation moment fills the first screen and then decays", () => {
  test.describe.configure({ mode: "serial" });

  let seed: SeededListing;
  /** Seeded in `beforeAll` (it needs the signed-up booker), read by `afterAll` — hence this scope. */
  let payStates: SeededPaymentStates | null = null;
  /** The ONE context every case below runs inside — see the header for why the fixture will not do. */
  let context: BrowserContext;
  /** The shared page. The D-89 case opens its own from this same context; nothing else does. */
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    seed = await seedBookableListing({ titlePrefix: "E2E Decay" });
    context = await browser.newContext();
    page = await context.newPage();

    await page.setViewportSize({ width: 1280, height: 900 });
    const email = await signUpBooker(page, seed);
    const [bookerRow] = await seed.sql`SELECT id FROM "user" WHERE email = ${email}`;
    expect(
      bookerRow?.id,
      "the signed-up booker has no row in `user`, so every route below would 404 on the owner gate " +
        "and every box measured would be the not-found boundary's",
    ).toBeTruthy();

    payStates = await seedPaymentStates(seed, bookerRow.id as string, {
      idPrefix: "e2e_decay_pay",
    });
  });

  test.afterAll(async () => {
    await context?.close();
    // The fixture owns its own DELETEs and must run BEFORE `seed.teardown()`, which ends the
    // connection both of them run on (the trap `shell.spec.ts` records).
    if (payStates) await payStates.teardown();
    await seed.teardown();
  });

  test("the moment is a full screen, the detail starts below the fold, and a reload shows the ordinary page", async () => {
    // Six page loads for geometry (three viewports × two themes) plus the decay, the reload and the
    // Back case, several of them on branches `next dev` has never compiled before.
    test.setTimeout(240_000);
    const confirmedId = payStates!.bookingIds.confirmed;

    // ── 1 & 2. THE GEOMETRY, IN BOTH THEMES AT THREE WIDTHS ─────────────────────────────────────
    //
    // The three viewports are 13-UI-SPEC's: the narrowest supported width, a common phone, and a
    // desktop. `sm:` (640px) crosses between the second and the third, and BOTH sides of that
    // breakpoint are in the constant (`min-h-[calc(100svh-3.5rem)] sm:min-h-[calc(100svh-4rem)]`), so
    // a viewport list that stayed on one side of it would leave half the constant unmeasured.
    for (const theme of ["court", "grove"] as const) {
      await seedTheme(context, theme);

      for (const { width, height } of [
        { width: 320, height: 568 },
        { width: 375, height: 667 },
        { width: 1280, height: 800 },
      ]) {
        await page.setViewportSize({ width, height });
        await page.goto(`${BASE}/bookings/${confirmedId}?paid=1`);

        const where = `${theme} · ${width}×${height}`;
        await expect(
          page.getByTestId("confirmation-moment"),
          `${where}: the moment did not render on ?paid=1 + a confirmed booking. Its trigger is the ` +
            "parameter AND the DB status, both — so this is either a broken mount or a 404 from the " +
            "owner gate.",
        ).toHaveCount(1);

        // ⚠ THIS LINE EXISTS BECAUSE `toHaveCount(1)` ABOVE IS NOT ENOUGH, AND WHAT IT CAUGHT IS NOT
        // WHAT IT WAS ADDED FOR. Read the whole note before touching it; the obvious "fix" is wrong.
        //
        // WHAT WAS OBSERVED FIRST — a 0px moment, twice, on two runs and two DIFFERENT viewports:
        //   run 33848750657 `gate-e2e` (flaky, passed on retry):
        //     court · 375×667:  the moment is 0px tall in a 667px viewport… Expected: >= 603  Received: 0
        //   run 33972688199 `gate-e2e` (flaky, passed on retry):
        //     court · 1280×800: the moment is 0px tall in a 800px viewport… Expected: >= 736  Received: 0
        //
        // THE HYPOTHESIS THAT READING PRODUCED — 19.1-RESEARCH.md § "The two flaky": "a 0px measurement
        // means the element was measured before layout; likely a missing settle" — IS REFUTED. It was
        // refuted by adding this assertion and reading what it actually printed. Run 33975274855:
        //
        //   court · 320×568: … Error: strict mode violation: getByTestId('confirmation-moment')
        //   resolved to 2 elements:
        //     1) <section data-testid="confirmation-moment" …> aka getByRole('main').getByTestId('confirmation-moment')
        //     2) <section data-testid="confirmation-moment" …> aka getByTestId('confirmation-moment').nth(1)
        //   - locator resolved to <section …>  - unexpected value "hidden"
        //
        // AND IT REPRODUCES OFF CI, which the 0px reading never did. This box, cold `.next` per
        // `evidence/triage-harness.md` step 3, `--retries=2`: attempt 1 fails with the SAME two-element
        // violation (grove · 320×568), attempt 2 passes — `1 flaky, 3 passed (52.7s)`. Run again with a
        // `.next` left dirty by a production build it fails on ALL THREE attempts, at two viewports and
        // both themes. So it is intermittent at rest and deterministic under compile pressure, which is
        // exactly the shape a 2-core runner produces and why CI has only ever reported it as flaky.
        //
        // THE MOMENT IS NOT UNLAID-OUT. THERE ARE TWO OF IT, and one of them is HIDDEN. `boxOf` uses
        // `document.querySelector`, which takes the FIRST match — so the "0px tall" every earlier run
        // reported was the box of the WRONG SECTION, not an unsettled box of the right one. Note also
        // that `toHaveCount(1)` two statements above PASSED: the second copy appears BETWEEN the two
        // assertions, so it is an overlap during the route's own streaming and not a static duplicate.
        //
        // WHY THIS ASSERTION STAYS, EXACTLY AS IT IS. Strict mode is what turned a vague, viewport-
        // shaped number into a named defect with both elements printed. That is the whole value.
        //
        // ⚠ DO NOT "FIX" THIS BY SCOPING THE LOCATOR (`getByRole('main').getByTestId(...)`) OR BY
        // GIVING `boxOf` THE VISIBLE ONE. Either turns the suite green and deletes the only instrument
        // that has ever named this defect — and the same two-elements-one-in-`main` signature is live
        // in `e2e/avatar-crop.spec.ts:162` (`input[type="file"]` resolved to 2, run 33972688199). The
        // duplicate mount is handed forward as a defect to be MEASURED, not waited out;
        // `.planning/phases/19.1-…/evidence/suite-remeasurement.txt` VERDICT N2 and the FINAL section
        // name the plan that owns it.
        //
        // WHAT THIS DELIBERATELY IS NOT: no timeout is widened (the default `expect` timeout is used,
        // and the case's own `test.setTimeout(240_000)` is untouched), and no expected height is
        // lowered — `height - 64` below is unchanged.
        await expect(
          page.getByTestId("confirmation-moment"),
          `${where}: the moment must resolve to exactly ONE laid-out section before anything below ` +
            "measures its box. A `strict mode violation … resolved to 2 elements` here is the known " +
            "duplicate mount (run 33975274855), and it is why the earlier `0px tall` reports were the " +
            "box of the WRONG section rather than an unsettled box of the right one — `boxOf` takes " +
            "`document.querySelector`'s first match. An `unexpected value \"hidden\"` with a count of " +
            "one instead means the moment renders and never takes a box. Do not scope this locator to " +
            "make it pass: see the note above this line.",
        ).toBeVisible();

        const moment = await boxOf(page, "confirmation-moment");
        const detail = await boxOf(page, "booking-detail");
        expect(moment, `${where}: no confirmation-moment box`).not.toBeNull();
        expect(detail, `${where}: no booking-detail box`).not.toBeNull();

        expect(
          moment!.height,
          `${where}: the moment is ${moment!.height}px tall in a ${height}px viewport. ` +
            "`CONFIRMATION_MOMENT_MIN_H` is the viewport minus the header, and it is the ONLY thing " +
            "that makes BFLOW-08's \"distinct confirmation moment\" a measurement rather than an " +
            "adjective.",
        ).toBeGreaterThanOrEqual(height - 64);

        expect(
          detail!.y,
          `${where}: booking-detail starts at y=${detail!.y} in a ${height}px viewport, so the ` +
            "ordinary page is already on screen beside the moment. The moment is supposed to fill " +
            "the first screen; the detail is supposed to be one scroll away.",
        ).toBeGreaterThanOrEqual(height);
      }

      // ── 3. THE DECAY. The URL loses its query IN PLACE, and a reload renders the ordinary page.
      const stripped = `${BASE}/bookings/${confirmedId}`;
      await expect
        .poll(
          () => page.url(),
          {
            timeout: 5_000,
            message:
              `${theme}: the checkout-return parameter is still in the address bar after the moment ` +
              "painted. D-60's decay is the whole mechanism: consumed, never persisted — so a " +
              "refresh, a bookmark or a pasted link renders the ordinary booking-detail page.",
          },
        )
        .toBe(stripped);

      await page.reload();
      await expect(
        page.getByTestId("booking-detail"),
        `${theme}: the ordinary detail did not render on the stripped URL`,
      ).toHaveCount(1);
      await expect(
        page.getByTestId("confirmation-moment"),
        `${theme}: the moment rendered AGAIN on a later visit. It is a moment, not a state — and ` +
          "the reason consuming the parameter is safe at all is that every fact it states is " +
          "repeated inside booking-detail (tests/booking/detail-completeness.test.tsx).",
      ).toHaveCount(0);
    }

    // ── 4. BACK DOES NOT RETURN INTO THE MOMENT ────────────────────────────────────────────────
    //
    // The history entry is REPLACED, never pushed. In production the entry behind the moment is the
    // cross-origin hosted checkout page, which Playwright cannot drive; the property under test is
    // the same either way and is the one D-60 rules on — the booker must not be able to press Back
    // INTO a moment whose premise has since changed.
    await page.goto(`${BASE}/bookings`);
    await page.goto(`${BASE}/bookings/${confirmedId}?paid=1`);
    await expect(page.getByTestId("confirmation-moment")).toHaveCount(1);
    await expect.poll(() => page.url(), { timeout: 5_000 }).toBe(`${BASE}/bookings/${confirmedId}`);

    await page.goBack();
    expect(
      page.url(),
      "Back landed on the moment's own URL. The history entry must be REPLACED rather than pushed, " +
        "or the booker walks back into a screen that is no longer true.",
    ).not.toContain("paid=1");
    expect(page.url()).toBe(`${BASE}/bookings`);
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // 5. THE D-89 CASE — THE REASON THIS FILE EXISTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  test("a seeded pending row completes all 8 poll attempts with ZERO navigations (D-89)", async () => {
    test.setTimeout(180_000);
    expect(
      payStates,
      "the payment-state fixture is null, so this describe's `beforeAll` did not reach its seed — " +
        "this case would otherwise pass vacuously against a URL that names nothing",
    ).not.toBeNull();

    // ITS OWN PAGE, FROM THE SHARED CONTEXT. The fake clock below is a document-level change that
    // would otherwise apply to every later navigation on the shared page; the cookie lives on the
    // CONTEXT, so a second page is signed in without repeating the sign-up.
    const poll = await context.newPage();
    try {
      // THE CLOCK IS DRIVEN, NOT WAITED OUT. The poller's cap is 8 × 2500ms = 20 real seconds, and a
      // spec that slept through it would be both slow and — worse — indistinguishable from one whose
      // timers never fired. `page.clock` is installed BEFORE navigation, which is the documented
      // requirement: it replaces the page's timer functions at document start.
      await poll.clock.install();
      await poll.setViewportSize({ width: 1280, height: 900 });

      const pendingId = payStates!.bookingIds.pendingLiveHold;
      await poll.goto(`${BASE}/bookings/${pendingId}?paid=1`);

      await expect(
        poll.getByRole("heading", { level: 1, name: "Confirming your payment" }),
        "the pending payment state did not render, so the poller under test is not running and a " +
          "navigation count of zero would mean nothing",
      ).toHaveCount(1);

      // The moment must NOT be here. The trigger is the parameter AND `status === 'confirmed'`, both,
      // always (PROJECT D-57) — a forgeable parameter alone moves no branch off DB status.
      await expect(
        poll.getByTestId("confirmation-moment"),
        "the confirmation moment rendered over a PENDING booking. The checkout-return parameter is " +
          "a UX signal and never proof of payment; the webhook is the sole confirm authority.",
      ).toHaveCount(0);

      // ── THE MEASUREMENT, AND ITS FIRST DRAFT WAS WRONG IN THE INSTRUCTIVE DIRECTION ───────────
      //
      // MEASURED, not assumed: over these eight poll attempts the main frame emits EIGHT
      // `framenavigated` events on correct code, one per `router.refresh()`. Next's router keeps the
      // history entry in sync as it re-fetches the RSC payload, and Playwright reports that as a
      // same-document navigation. The first draft of this case asserted a raw count of zero and went
      // red at 8 — against an implementation that is doing exactly the right thing.
      //
      // That the eight are IN-PLACE refreshes rather than real navigations is not an assumption
      // either: the client component's own state survives all of them (the manual control asserted
      // below appears only because `setSlow(true)` ran in the eighth callback of an interval that was
      // never remounted). A genuine navigation would have thrown that state away.
      //
      // So the count is scoped to what the defect actually is — 13-10's finding, that an assertion
      // must name the THREAT and not a proxy for it. D-89's threat is the booker being taken to a
      // DIFFERENT url: the strip itself changes it (`?paid=1` → bare), and the redirect that follows
      // changes it again to a checkout page. Recording the url of every event and requiring all of
      // them to be this one catches both, and is strictly stronger than comparing the FINAL url —
      // a bounce that returned here by another route would satisfy that and be caught by this.
      const urlBefore = poll.url();
      let events = 0;
      const wentElsewhere: string[] = [];
      poll.on("framenavigated", (frame) => {
        if (frame !== poll.mainFrame()) return;
        events += 1;
        if (frame.url() !== urlBefore) wentElsewhere.push(frame.url());
      });

      // Eight attempts, one at a time, each followed by a short REAL pause so the `router.refresh()`
      // round trip it fires can land before the next tick is delivered.
      for (let attempt = 1; attempt <= 8; attempt += 1) {
        await poll.clock.runFor(2_500);
        await poll.waitForTimeout(250);
      }

      // ── THE THREAT IS ASSERTED FIRST, AND THE ORDER WAS CHOSEN BY WATCHING THE RED ────────────
      //
      // The vacuity guards below are what make a PASS trustworthy, so the instinct is to run them
      // first. Measured with the defect deliberately reproduced, that ordering reports the WRONG
      // finding: the booker is bounced off this page mid-poll, `PendingPaymentState` unmounts with
      // it, and the first thing to notice is that its manual control never appeared — *"the poller
      // did not reach its cap"*, which reads as a flaky harness rather than as a booker being sent
      // to a checkout page for a booking they already paid for.
      //
      // A guard against vacuity works from ANY position, because a green run has to satisfy every
      // assertion in the block. What position decides is which sentence a reader sees first, and on
      // this case that sentence should name the url the booker was taken to.
      expect(
        wentElsewhere,
        `the pending page was navigated to ${wentElsewhere.length} other url(s) while the webhook ` +
          `was still in flight (${events} main-frame navigation events in total). THIS IS D-89: ` +
          "`<ConsumePaidParam/>` may be mounted on the CONFIRMED branch only. `router.refresh()` " +
          "re-renders the RSC for the CURRENT url, so a parameter stripped anywhere the poller can " +
          "reach drops the next poll into the no-parameter path — a probe and then " +
          "`redirect(…/book?hold=…)` — and bounces a booker who has already paid back to checkout.",
      ).toEqual([]);

      expect(
        poll.url(),
        "the address bar changed under the poller. Even without a navigation, a stripped query " +
          "string here is the first half of the same defect.",
      ).toBe(urlBefore);

      // ── THE TWO VACUITY GUARDS. Everything above is an ABSENCE, and an absence is satisfied
      //    perfectly by a page that never polled and a listener that never listened.
      //
      // (a) The listener really was attached and the frame really did tick.
      expect(
        events,
        "the main frame emitted no navigation events at all over eight poll attempts, so the " +
          "assertions above had nothing to be an absence OF — the listener, not the page, is what " +
          "failed",
      ).toBeGreaterThan(0);

      // (b) The poller reached its CAP, which is the page's own evidence that all eight refreshes
      //     fired: `PendingPaymentState` reveals its manual control only in the eighth callback of
      //     an interval that was never remounted. Its presence therefore also proves the eight
      //     events above were in-place refreshes rather than real navigations — a navigation would
      //     have thrown that client state away.
      await expect(
        poll.getByRole("button", { name: "Refresh status" }),
        "the pending state never backed off, so the poller did not reach its cap and the " +
          "navigation assertions above were measuring a page that never polled",
      ).toHaveCount(1);

      // …and the booker is still looking at the settlement state, not at a checkout page.
      await expect(poll.getByTestId("payment-state-pending")).toHaveCount(1);
    } finally {
      await poll.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // 6. REDUCED MOTION — HONOURED THROUGH THE ONE GLOBAL MECHANISM
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // DS-04 requires ONE global reset and forbids a second, per-component mechanism beside it, so the
  // assertion has to read the OUTCOME in a browser rather than either mechanism's source. Both
  // directions are run, for `reduced-motion.spec.ts`'s reason: a suppressed-duration assertion is
  // satisfied vacuously by a page with no animation on it at all.
  for (const theme of ["court", "grove"] as const) {
    test(`${theme} · the success mark honours reduced motion, and nothing loops`, async () => {
      test.setTimeout(120_000);
      expect(
        payStates,
        "the payment-state fixture is null, so this describe's `beforeAll` did not reach its seed",
      ).not.toBeNull();

      const url = `${BASE}/bookings/${payStates!.bookingIds.confirmed}?paid=1`;
      await seedTheme(context, theme);
      await page.setViewportSize({ width: 1280, height: 900 });

      // ── THE POSITIVE CONTROL FIRST. Without it, every assertion below is indistinguishable from a
      //    scan that found nothing to look at.
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(url);
      await expect(page.getByTestId("confirmation-moment")).toHaveCount(1);
      await expectReducedMotion(page, false);

      const moving = await animationsInsideMoment(page);
      expect(moving, `${theme}: the moment is not in the document`).not.toBeNull();
      expect(
        moving!.length,
        `${theme}: nothing inside the moment is animating, so the reduced-motion assertion below ` +
          "would pass against a page with no motion on it. 13-UI-SPEC allows exactly ONE beat here: " +
          "a non-looping fade+scale on the success mark.",
      ).toBe(1);
      expect(
        moving![0].durationSeconds,
        `${theme}: the one beat runs for ${moving![0].durationSeconds}s. It is specified at ` +
          "`--motion-slow` (320ms), which is also the motion budget's cap — so it is inside the " +
          "budget by construction rather than by a literal somebody has to keep in range.",
      ).toBeCloseTo(0.32, 2);

      // ── ZERO INFINITE ITERATIONS, IN *EITHER* MOTION MODE. Confetti, a pulsing mark and a spinner
      //    that never stops are all one property away from each other, and the reduced-motion reset
      //    is not the place to catch them: a looping animation on a terminal success screen is wrong
      //    for every reader, not only for one who asked for less motion.
      expect(
        moving!.filter((a) => a.iterationCount === "infinite"),
        `${theme}: something inside the moment loops forever`,
      ).toEqual([]);

      // ── THE SUPPRESSED DIRECTION.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(url);
      await expect(page.getByTestId("confirmation-moment")).toHaveCount(1);
      await expectReducedMotion(page, true);

      const stilled = await animationsInsideMoment(page);
      expect(stilled, `${theme}: the moment is not in the document`).not.toBeNull();
      expect(
        stilled!.length,
        `${theme}: the animated element vanished under reduced motion, so this assertion would be ` +
          "vacuous. The reset suppresses DURATION; it does not remove the animation.",
      ).toBe(1);
      for (const a of stilled!) {
        expect(
          a.durationSeconds,
          `${theme}: "${a.name}" still runs for ${a.durationSeconds}s with the reduce preference ` +
            "set. The global `@layer base` reset in globals.css sets `animation-duration: 0.01ms " +
            "!important` — its `!important` is what reaches `tw-animate-css`'s utility-layer " +
            "keyframes, and `animate-in` is exactly one of those.",
        ).toBeLessThanOrEqual(0.001);
        expect(a.iterationCount, `${theme}: "${a.name}" loops forever`).not.toBe("infinite");
      }
    });
  }
});
