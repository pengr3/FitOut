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
