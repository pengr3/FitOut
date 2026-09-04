import { expect, test, type Page } from "@playwright/test";

// DS-04 — the reduced-motion reset (`src/app/globals.css`, @layer base), proven at the
// browser level rather than by eye.
//
// `10-VALIDATION.md` listed this as Manual-Only: "the CSS rule's presence is testable;
// that the OS setting suppresses a real animation is a browser-level observation." The
// second half turns out to be mechanisable — `page.emulateMedia()` drives the same
// `prefers-reduced-motion` media query the reset is written against, and
// `getComputedStyle` reads the outcome. No OS setting, and no trying to eyeball a 120ms
// transition.
//
// THREE OF THE RESET'S FOUR DECLARATIONS ARE COVERED, on two elements:
//
//   transition-duration: 0.01ms     -> a real shipped <Button> (transition-all, 0.12s)
//   animation-duration: 0.01ms      -> a utility-layer keyframe animation
//   animation-iteration-count: 1    -> the same, and the one a human is least likely to
//                                      catch: INFINITE animations (spinners, pulsing
//                                      skeletons) stop after a single cycle
//
// (`scroll-behavior` is not asserted — it has no observable computed effect without a
// scroll, and the other three establish the rule is applying.)
//
// EVERY ASSERTION RUNS IN BOTH DIRECTIONS, which is load-bearing rather than
// thorough-for-its-own-sake. Three traps were hit writing this, and each produced a
// GREEN result against a page where nothing was under test:
//
//   1. `test.use({ reducedMotion })` at describe level never reached the page —
//      `matchMedia("(prefers-reduced-motion: reduce)").matches` read `false` inside a
//      test that had declared `reduce`, and everything "passed". Emulation is therefore
//      applied per-test via `page.emulateMedia()` and ASSERTED (`expectMediaQuery`)
//      rather than assumed.
//   2. Reading `[role="listbox"]` returned an element with `animation-duration: 0s` —
//      Radix puts the animation on `[data-slot="select-content"]`, and the listbox role
//      sits on an inner node. `0 < 0.001` satisfied the suppressed-direction assertion
//      vacuously.
//   3. Even the right node does not animate: `select-content` also carries
//      `data-[align-trigger=true]:animate-none`, and the open element really does have
//      `data-align-trigger="true"`, so `animationName` computes to `none` BY DESIGN when
//      the panel aligns to its trigger. A Select is a vacuous vehicle for this test in
//      both directions. (`data-open:` itself is fine — it compiles to
//      `:where([data-state="open"], [data-open]:not([data-open="false"]))` and does match
//      Radix.) The synthetic probe below is used instead: the reset targets `*` with
//      `!important`, so any utility-layer keyframe animation proves its reach.
//   4. A REUSED DEV SERVER CAN SERVE A STALE STYLESHEET. `playwright.config.ts` sets
//      `reuseExistingServer: !process.env.CI`, and a server left running across a
//      `git checkout` of `globals.css` kept serving the reverted-away CSS: the source on
//      disk carried all four declarations while `/_next/static/chunks/…css` carried two.
//      This spec read the server, went red on `iterationCount` and named a defect that
//      did not exist. Restarting the dev server fixed it. If this file fails on a clean
//      `git status`, kill the server on :3000 and re-run BEFORE touching `globals.css`.
//      The direction of that failure is the safe one — stale CSS produces a false RED
//      here — and the false-green twin (someone deletes the reset, a stale server keeps
//      serving it) is closed at the other layer: `npm run test:design -- motion-budget`
//      asserts the `@media (prefers-reduced-motion: reduce)` block's presence in the
//      SOURCE, and runs inside `npm run build`. Neither layer alone is sufficient.

const PAGE = "/dev/theme";

/** Fail loudly if emulation silently did not apply — see trap 1 above. */
async function expectMediaQuery(page: Page, shouldMatch: boolean) {
  const matches = await page.evaluate(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(
    matches,
    `prefers-reduced-motion emulation did not reach the page (expected matches=${shouldMatch})`,
  ).toBe(shouldMatch);
}

/** A real shipped component: `<Button>` renders `transition-all` at 0.12s. */
async function readButtonTransitionSeconds(page: Page): Promise<number> {
  const button = page.locator('button[data-slot="button"]').first();
  await expect(button).toBeVisible();
  const raw = await button.evaluate((el) => getComputedStyle(el).transitionDuration);
  // Computed values are seconds ("0.12s" / "0.00001s"); parse rather than string-match so
  // the assertion survives a formatting change in the engine.
  return Number.parseFloat(raw);
}

/**
 * An infinite, utility-layer keyframe animation. `animate-pulse` is emitted because
 * `src/components/ui/skeleton.tsx` uses it, and the reset targets `*`, so an element
 * created at runtime is subject to it exactly as a rendered skeleton is.
 *
 * `animationName` is returned so the caller can assert the animation is actually
 * ATTACHED. Without that check, a class that was never emitted would report the initial
 * value `"1"` and be indistinguishable from the reset having worked.
 */
async function readPulse(
  page: Page,
): Promise<{ name: string; iterationCount: string; durationSeconds: number }> {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "animate-pulse";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const result = {
      name: cs.animationName,
      iterationCount: cs.animationIterationCount,
      durationSeconds: Number.parseFloat(cs.animationDuration),
    };
    probe.remove();
    return result;
  });
}

test.describe("DS-04 — reduced motion", () => {
  test("with no motion preference, motion plays", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(PAGE);
    await expectMediaQuery(page, false);

    const pulse = await readPulse(page);
    expect(pulse.name).toBe("pulse");
    expect(pulse.iterationCount).toBe("infinite");
    expect(pulse.durationSeconds).toBeGreaterThan(0.01);

    // A floor rather than equality, so a token change does not break this while a
    // suppressed transition still fails it.
    expect(await readButtonTransitionSeconds(page)).toBeGreaterThan(0.01);
  });

  test("with prefers-reduced-motion: reduce, motion is suppressed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(PAGE);
    await expectMediaQuery(page, true);

    const pulse = await readPulse(page);
    // Still attached — the reset caps the animation's repeats rather than removing it.
    expect(pulse.name).toBe("pulse");
    expect(pulse.iterationCount).toBe("1");
    // 0.01ms. Anything at or above a millisecond means the reset did not apply.
    expect(pulse.durationSeconds).toBeLessThan(0.001);

    expect(await readButtonTransitionSeconds(page)).toBeLessThan(0.001);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 12-UI-SPEC AC#17 / BFLOW-05 — THE MONTH GRID ANIMATES NOTHING, WITH THE PREFERENCE OFF AS WELL AS ON
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY AN ABSENCE RATHER THAN A NUMBER UNDER A CAP. `12-UI-SPEC § The calendar and slot picker` states
// the contract as *"no enter/exit animation on the month grid at all"* and gives the reason: a month
// grid that animates is a layout-shift generator, and "no animation" is falsifiable in a way that "an
// animation under 320ms" is not. `tests/design/motion-budget.test.ts` already caps every declared
// duration at 320ms from the SOURCE side; this is the rendered side of the same requirement, and it is
// stronger — a `animate-in fade-in-0` on the grid would satisfy the cap and fail here.
//
// WHY IT RUNS IN BOTH MEDIA STATES. With `prefers-reduced-motion: reduce` the DS-04 reset forces
// `animation-duration: 0.01ms` on `*`, so an animating grid would LOOK silenced — every case in this
// file above exists because that reset works. Running the same assertion with the preference OFF is
// what makes the absence a property of the component rather than of the reset.
//
// ── WHAT IS ASSERTED, AND WHY IT IS NOT "ZERO DURATIONS" ─────────────────────────────────────────
// MEASURED first, then written. Inside the resolved calendar, with no motion preference, exactly ONE
// shape reports any duration at all:
//
//   35 × button   transition: all 0.12s   animation-name: none   animation-duration: 0s
//
// — the shipped `<Button>` hover transition at `--motion-fast`, which is the motion the UI-SPEC
// explicitly PERMITS ("the only motion is the nav button's own `--motion-fast` transition"). Nothing
// else in the grid transitions: the table, the head, the week rows, the weekday cells and the day
// `<td>`s all report 0s. And `animation-name` is `none` on all 85.
//
// So the two clauses are:
//   (a) ZERO ANIMATIONS anywhere in the grid — `animation-name: none` on every element. This is the
//       enter/exit claim, and it is the falsifiable absence.
//   (b) ZERO TRANSITIONS on the grid's STRUCTURE — every non-`<button>` element reports 0s. A
//       month-change transition would be written on the table, the tbody or a wrapper, never on 35
//       individual day buttons, so this is where such a thing would land.
// Plus a cap on what the buttons themselves may spend, so "it's only a hover transition" cannot become
// a 2s one.
//
// ── THE GUARD THAT MAKES IT NON-VACUOUS ──────────────────────────────────────────────────────────
// The caption text is read before and after the nav click and asserted to have CHANGED. Without it a
// click that missed — a disabled `Next month` at the horizon, a mis-typed accessible name, a page that
// never finished compiling — would leave a perfectly still grid and the absence would pass for the
// wrong reason. The element count is asserted too, for the same reason `overflow-320.spec.ts` asserts
// `examined`: "no element reports a duration" is trivially true of no elements.
//
// ── WATCHED RED, run and reverted, 18 August 2026 ────────────────────────────────────────────────
//
//   (a) A 200ms TRANSITION ON THE GRID. `transition-[opacity] duration-200` added to the `Calendar`
//       root's className in `availability-calendar.tsx` — exactly the "tasteful" month-change
//       transition this contract forbids, and comfortably inside the 320ms cap the SOURCE gate
//       applies, so `motion-budget.test.ts` stays green throughout.
//
//       ⚠ THE FIRST RUN OF THIS PROBE PASSED, AND THAT IS THE MOST USEFUL THING IN THIS BLOCK. The
//       scan originally started at the `<table>` and walked its descendants — which is where a month
//       grid "is" — and a transition on an ANCESTOR does not inherit, so the mutation was invisible:
//       **2 passed**, against a tree carrying the exact defect. The scan now starts at
//       `[data-slot="calendar"]`, which is where such a transition would actually be written.
//       After the fix, **1 failed / 1 passed**, verbatim:
//
//         Error: month grid · no-preference: 1 element(s) inside the month grid report a non-zero
//         transition-duration on something that is not a <button>. The month change must animate
//         NOTHING (12-UI-SPEC AC#17) — a grid that animates is a layout-shift generator, and this is
//         the assertion that makes "no animation" falsifiable rather than a comment:
//           div.rdp-root group/calendar bg-background p-2 [- — transition opacity 0.2s, animation
//           none 0s
//
//       The `reduce` case stayed GREEN under the mutation — the DS-04 reset really does silence it —
//       which is the whole reason this assertion runs with the preference OFF as well. Reverted;
//       4 passed.
//
//   (b) THE GUARD, PROBED TWICE. First by breaking the locator (`Next month` → `Nxt month`): that
//       fails at `locator.click` with Playwright's own timeout after 90s, which is a red but an
//       uninformative one and never reaches the guard at all. The probe that actually exercises it is
//       a click that LANDS AND DOES NOTHING — `advanceMonth`'s click commented out, standing in for a
//       nav button disabled at the horizon or a month change that silently no-ops:
//
//         Error: month grid · no-preference: `Next month` was clicked repeatedly over 20s and the
//         caption never moved off "August 2026". Either the control is dead or the grid does not
//         respond to it — both are real failures, and both would otherwise leave every absence below
//         asserting about a month nobody changed.
//
//       **2 failed**, one per media state, and without the guard both would have been green against a
//       month nobody changed. Restored; 4 passed.
//
//   (c) NOT A PROBE — A REAL FAILURE THIS FILE PRODUCED, recorded because it is the more useful kind.
//       Both cases passed on four consecutive isolated invocations and then failed in the FULL-SUITE
//       run, at the guard, in both media states. The month grid is server-rendered, so `Next month`
//       is clickable long before React attaches a handler to it; under load the click landed on a
//       node that was not yet interactive and the event was simply lost. `advanceMonth` retries the
//       click for that reason, and its docblock carries the measurement.
//
// ── NOT COVERED ──────────────────────────────────────────────────────────────────────────────────
//   • COMPUTED STYLE IS NOT A PAINT. `motion-budget.test.ts`'s own header records that only a real
//     paint settles whether a Radix animation is genuinely silenced; that half is Phase 17's manual
//     pass. What is settled here is that the grid declares no animation to silence.
//   • ONE MONTH CHANGE, FORWARD. It does not click back.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/** The declared cap (`--motion-slow`), restated from `tests/design/motion-budget.test.ts`. */
const MOTION_CAP_SECONDS = 0.32;

/** A page with nothing laid out on it reports no durations at all — `overflow-320.spec.ts`'s idiom. */
const MIN_GRID_ELEMENTS = 40;

/**
 * The first listing in the catalogue, DISCOVERED from the running app.
 *
 * The same idiom `overflow-320.spec.ts:195` uses and for its stated reason: a spec that names a seeded
 * row stops running the first time the seed changes. It is re-implemented here rather than imported
 * because that file does not export it, and because this file has no database dependency of any kind —
 * adding one would put a fifth DB-seeding spec on a single Postgres, which `deferred-items.md` already
 * records as the source of the cross-file contention flakes.
 */
async function firstListingPath(page: Page): Promise<string> {
  await page.goto("/");
  const href = await page.getByTestId("result-card").first().getAttribute("href", {
    timeout: 20_000,
  });
  expect(
    href,
    "this case resolves its listing from the running app and the app produced none. The local " +
      "catalogue is empty — seed it (`npm run db:seed`) before reading this as a motion failure.",
  ).toBeTruthy();
  return href!;
}

type GridMotion = {
  examined: number;
  /** Non-`<button>` elements reporting a transition, described. */
  structureTransitions: string[];
  /** Anything with an animation NAME, described. */
  animated: string[];
  /** The largest transition-duration anywhere inside the grid, in seconds. */
  maxTransitionSeconds: number;
  caption: string;
};

/** ONE evaluate, ONE typed object, asserted in Node — `overflow-320.spec.ts:147`'s idiom. */
async function measureGridMotion(page: Page): Promise<GridMotion> {
  return page.evaluate(() => {
    const root = document.querySelector('[data-slot="calendar"]')!;
    const structureTransitions: string[] = [];
    const animated: string[] = [];
    let maxTransitionSeconds = 0;
    let examined = 0;

    const describe = (el: Element, cs: CSSStyleDeclaration) => {
      const cls = typeof el.className === "string" ? el.className : "";
      return (
        `${el.tagName.toLowerCase()}.${cls.slice(0, 44)} — transition ` +
        `${cs.transitionProperty.slice(0, 20)} ${cs.transitionDuration}, animation ` +
        `${cs.animationName} ${cs.animationDuration}`
      );
    };

    // FROM THE CALENDAR ROOT DOWN, NOT FROM THE `<table>`. Measured: a first draft scanned the table
    // and its descendants, and the watched red below — a `transition-[opacity] duration-200` on the
    // Calendar's own className — PASSED, because a transition on an ancestor does not inherit. The
    // root is precisely where a month-change transition would be written, so it is precisely what the
    // scan has to include.
    for (const el of [root, ...root.querySelectorAll("*")]) {
      const cs = getComputedStyle(el);
      examined += 1;
      const transition = Number.parseFloat(cs.transitionDuration) || 0;
      if (transition > maxTransitionSeconds) maxTransitionSeconds = transition;
      // `> 0.001` rather than `> 0`: under the DS-04 reset every element reports 0.01ms, which is the
      // reset WORKING. The threshold is the one the two cases above already use.
      if (transition > 0.001 && el.tagName !== "BUTTON") {
        structureTransitions.push(describe(el, cs));
      }
      if (cs.animationName !== "none") animated.push(describe(el, cs));
    }

    return {
      examined,
      structureTransitions,
      animated,
      maxTransitionSeconds,
      caption: root.querySelector(".rdp-caption_label")?.textContent?.trim() ?? "",
    };
  });
}

/**
 * Click `Next month` until the caption actually says a different month.
 *
 * ⚠ A SINGLE `click()` IS NOT ENOUGH, AND THAT WAS MEASURED RATHER THAN ANTICIPATED. Both cases below
 * passed on four consecutive isolated invocations of this file and then FAILED in the full-suite run —
 * at the caption guard, in both media states, on a page whose calendar had already rendered:
 *
 *   Error: month grid · reduce: the caption still reads "August 2026" after clicking `Next month`, so
 *   the month never changed and every assertion below would be about a grid nothing happened to.
 *
 * The month grid is server-rendered, so the nav button EXISTS and is clickable long before React has
 * attached a handler to it. Under full-suite load the click lands on a node that is not yet
 * interactive, and the event is not queued — it is simply lost, so no amount of waiting afterwards
 * recovers it. Polling the caption alone would therefore have hung; the click has to be RETRIED.
 *
 * The guard is not weakened by this — it still fails if the month never changes, and its failure
 * message is unchanged. What moves is that "the click was swallowed by hydration" is now retried
 * instead of being reported as "the grid does not respond to its own nav button".
 */
async function advanceMonth(page: Page, captionBefore: string, where: string): Promise<void> {
  const next = page.getByRole("button", { name: /next month/i });
  await expect
    .poll(
      async () => {
        const now = (await measureGridMotion(page)).caption;
        if (now !== captionBefore) return true;
        await next.click().catch(() => {});
        return (await measureGridMotion(page)).caption !== captionBefore;
      },
      {
        timeout: 20_000,
        message:
          `${where}: \`Next month\` was clicked repeatedly over 20s and the caption never moved off ` +
          `"${captionBefore}". Either the control is dead or the grid does not respond to it — ` +
          "both are real failures, and both would otherwise leave every absence below asserting " +
          "about a month nobody changed.",
      },
    )
    .toBe(true);
}

test.describe("AC#17 — the month change animates nothing", () => {
  // 90s: this block navigates to `/`, discovers a listing and loads it, against a dev server that
  // compiles routes on demand — `overflow-320.spec.ts`'s measured reason for the same allowance.
  test.describe.configure({ timeout: 90_000 });

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`with prefers-reduced-motion: ${reducedMotion}, the grid declares no animation`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      const listing = await firstListingPath(page);
      await page.goto(listing);
      await expectMediaQuery(page, reducedMotion === "reduce");

      const where = `month grid · ${reducedMotion}`;
      await expect(
        page.locator('[data-slot="calendar"]'),
        `${where}: the listing route rendered no calendar, so there is no month grid to change`,
      ).not.toHaveCount(0, { timeout: 15_000 });

      const captionBefore = (await measureGridMotion(page)).caption;
      await advanceMonth(page, captionBefore, where);

      const m = await measureGridMotion(page);

      // GUARD THE GUARD, FIRST — both halves. A grid nobody changed animates nothing, and a grid with
      // no elements reports no durations.
      expect(
        m.caption,
        `${where}: the caption still reads "${captionBefore}" after clicking \`Next month\`, so the ` +
          "month never changed and every assertion below would be about a grid nothing happened to.",
      ).not.toBe(captionBefore);
      expect(
        m.examined,
        `${where}: the scan examined ${m.examined} elements inside the month grid. A grid with ` +
          "nothing in it satisfies every absence below perfectly.",
      ).toBeGreaterThanOrEqual(MIN_GRID_ELEMENTS);

      // (a) THE ABSENCE THE CONTRACT IS ABOUT: no animation, anywhere, named or otherwise.
      expect(
        m.animated,
        `${where}: ${m.animated.length} element(s) inside the month grid declare a keyframe ` +
          "animation. 12-UI-SPEC AC#17 is an ABSENCE — the month change has no enter/exit animation " +
          "at all, because a grid that animates is a layout-shift generator and a duration under a " +
          "cap is not a falsifiable claim:\n" +
          m.animated.map((row) => `  ${row}`).join("\n"),
      ).toEqual([]);

      // (b) NOTHING STRUCTURAL TRANSITIONS. A month-change transition lands on the table, the tbody or
      // a wrapper — never on 35 individual day buttons — so this is where one would show up.
      expect(
        m.structureTransitions,
        `${where}: ${m.structureTransitions.length} element(s) inside the month grid report a ` +
          "non-zero transition-duration on something that is not a <button>. The month change must " +
          "animate NOTHING (12-UI-SPEC AC#17) — a grid that animates is a layout-shift generator, " +
          "and this is the assertion that makes \"no animation\" falsifiable rather than a comment:\n" +
          m.structureTransitions.map((row) => `  ${row}`).join("\n"),
      ).toEqual([]);

      // The permitted motion, bounded. The day and nav buttons carry the shipped `<Button>` hover
      // transition at `--motion-fast`; this stops "it's only a hover transition" covering a 2s one.
      expect(
        m.maxTransitionSeconds,
        `${where}: the longest transition inside the month grid is ${m.maxTransitionSeconds}s, past ` +
          `the ${MOTION_CAP_SECONDS}s cap tests/design/motion-budget.test.ts applies to the source`,
      ).toBeLessThanOrEqual(MOTION_CAP_SECONDS);
    });
  }
});
