import { expect, test, type Page } from "@playwright/test";

import { seedTheme } from "../helpers/theme";
import { emulateVisualMedia, injectFreezeStylesheet } from "../helpers/visual-freeze";
import {
  baselineArg,
  blockedSurfaces,
  VISUAL_BASELINES,
  VISUAL_SURFACES,
  type BaselineRow,
} from "../../src/lib/design/visual-baselines";

// GATE-01 — the comparison half. One test per declared baseline, driven off
// `src/lib/design/visual-baselines.ts` rather than off whatever PNGs happen to be on disk.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THIS FILE CANNOT RUN ON A DEVELOPER MACHINE, AND THAT IS THE DESIGN (D-27 / D-29)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `playwright.config.ts` does not CONSTRUCT the `visual` project off Linux — not "declares it and
// skips it", does not construct it — so `npx playwright test --project=visual` here errors with
// `Project(s) "visual" not found`, and a plain `npx playwright test` never collects this file at all.
// Baselines are generated and compared ONLY inside `mcr.microsoft.com/playwright:v1.60.0-noble`, by
// the same runner, so author-vs-CI drift is structurally impossible rather than merely discouraged.
//
// The one thing that CAN write a baseline is the `--update-snapshots` CLI flag, and it exists in
// exactly one place in this repository: `.github/workflows/baselines.yml`'s `workflow_dispatch` job.
// `playwright.config.ts` sets `updateSnapshots: "none"` UNCONDITIONALLY (D-28), so no run on any
// machine — including this one, including CI job 1 — can mint a PNG. Measured behaviour under that
// setting (11-RESEARCH Finding 4): a missing baseline writes ZERO files, the error loses its
// `, writing actual.` clause, and the failure is RETRIABLE, so it stays red across every attempt.
// That last property is the whole point: under Playwright's default `"missing"` the same situation
// writes the PNG and the next bare re-run is GREEN with no code change, which is the textbook rubber
// stamp — nobody investigates a gate that passes when you press the button again.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE TRAP THIS FILE IS BUILT AROUND, AND IT IS THE WORST ONE IN THE PHASE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A screenshot assertion against a blank page, a 404, a 500 or a still-compiling route DOES NOT
// FAIL. On the run that has no baseline it mints one — of the wrong page — and every run afterwards
// compares against it and passes forever. Every other vacuity this phase has recorded (six-plus
// scan-of-nothing passes) at least stayed green *without* creating evidence; this one manufactures
// the evidence.
//
// So EVERY row declares a `hook` selector with the reason it proves the surface rendered its
// SUBJECT, `expectReachable` runs before any pixel is read, and the three image rows additionally
// assert an HTTP 200, an `image/png` content type and a decoded 1200 × 630 — a 404 body decodes to
// 0 × 0, so that check cannot be satisfied by an error page.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AND ONE INHERITED TRAP — STALE CSS FROM A REUSED DEV SERVER, WHICH IS WORSE HERE THAN ANYWHERE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Copied from `e2e/scroll-area-overflow.spec.ts:49-56`, which took it from `reduced-motion.spec.ts`
// trap 4, and carried here on plan 11-03's explicit instruction (`11-03-SUMMARY.md` § Next Phase
// Readiness):
//
//   `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, and the dev server is what
//   serves the compiled stylesheet. A server left running across a `git checkout` of a component can
//   keep serving CSS that no longer matches the tree. IF THIS FILE FAILS ON A CLEAN `git status`,
//   KILL THE SERVER ON :3000 AND RE-RUN BEFORE TOUCHING THE COMPONENT.
//
// IN THE VISUAL PROJECT THE ESCALATION IS THE POINT. Everywhere else a stale server causes a false
// RED, which is annoying and self-correcting. Here, on a `--update-snapshots` run, it causes a
// BASELINE CAPTURED FROM STALE CSS — a reference that is wrong forever, that every future run agrees
// with, and that no gate in this repository can detect. That is why `reuseExistingServer` is false
// on CI (`!process.env.CI`) and why the dispatch job runs in a fresh container: the only machine
// allowed to write a baseline is the one that cannot have a stale server.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • TWO OF THE 27 DECLARED ROWS ARE BLOCKED and are skipped with their reason (`global-error`,
//     `og-listing`). A complete run therefore compares 25 baselines. The blocked SET is pinned by
//     the first test below, so a third one joining it is a failure rather than a quieter run.
//   • A baseline pins WHAT WAS SHOT, including a defect present on the day it was shot. Nothing here
//     knows what a surface should look like. The surfaces chosen are ones whose correctness is
//     separately asserted (contrast, type scale, skeleton geometry, the 320px floor).
//   • It compares a rendering of the DEVELOPMENT server. `next dev` and `next build` can differ
//     (chunking, the dev overlay `freeze.css` hides, unminified CSS ordering). This gate protects
//     against change, not against a dev/prod divergence.
//   • The `hook` is a floor, not a description: it proves the subject mounted, not that the rest of
//     the page did.
//   • ⚠ A CHANGE CONFINED TO `--border` ON `--background` IS INVISIBLE HERE. Measured 2026-08-17
//     while driving D-30's second OBSERVED RED, and it is the reason that proof failed 18 baselines
//     rather than the 20 the plan predicted. `toHaveScreenshot`'s default `threshold` is 0.2, which
//     pixelmatch turns into a per-pixel cutoff of `35215 * 0.2^2 = 1408.6` on YIQ deltaSquared. The
//     border/background pair measures **341.6** in court (`rgb(229,229,229)` on `rgb(255,255,255)`)
//     and **397.2** in grove — four times under the cutoff, so those pixels are not counted as
//     different at all. It is the same pair `src/lib/design/contrast-pairs.ts` carries in
//     `EXCLUDED_PAIRS` at 1.26:1 / 1.28:1 because it is a nearly invisible decorative divider; a
//     gate cannot see what a person cannot see, and the two facts have the same cause.
//
//     The default is kept ON PURPOSE. Driving `threshold` toward 0 would make font antialiasing a
//     failure on every run, and a gate that cries wolf is retried until green — the exact outcome
//     this phase exists to remove. So the blind spot is recorded rather than closed. The practical
//     consequence, stated plainly: **a regression that only moves a divider will not be caught
//     here — AND NOTHING ELSE CATCHES IT EITHER. There is no compensating control.**
//
//     An earlier draft of this footer said there was one: that the design gate covered the gap by
//     asserting divider geometry on the emitted stylesheet. IT NEVER DID, and the claim is deleted
//     rather than left standing, because a stated reason that has quietly become false is worse
//     than no reason — and a compensating control that does not exist is exactly how a blind spot
//     gets read as covered. Re-searched 2026-08-17, and what is actually there:
//       • `config/design-leak-patterns.mjs` has five categories (`raw-hex`, `color-function`,
//         `arbitrary-text-px`, `palette-class`, `white-black-class`). Every one of them bans a raw
//         design VALUE. None of them looks at an edge's THICKNESS, so an arbitrary edge-width
//         utility passes the leak gate untouched.
//       • The `tests/design/*.test.ts` files that do read the compiled stylesheet assert colour
//         pairs, the z scale, the motion budget, the font cycle, theme nesting and the type scale.
//         Not one asserts how many pixels wide an edge is.
//       • `site-contacts.test.ts` is the only gate that reads `site-footer.tsx` at all, and it
//         reads the support entry, not the class that draws the top edge D-30's second RED nudged.
//     So the blind spot is exactly as wide as the paragraph above says, with nothing behind it.
//
//     `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` `[11-22]` holds
//     the measurement and the decision to leave it open; this footer is where a reader of the gate
//     actually meets it. If a future surface makes a border load-bearing, give THAT baseline its
//     own tightened `threshold` at the call site — never the whole suite.

/** Every image row is this size — `OG_SIZE` in `src/app/og-render.ts`. */
const OG_NATURAL = { width: 1200, height: 630 } as const;

/**
 * The image rows are shot in a viewport LARGER than the card, deliberately.
 *
 * Chromium's standalone image document shrink-to-fits an image wider than the viewport. At exactly
 * 1200 the result depends on whether that document carries a body margin — a browser detail, not a
 * property of this app — and a shrunk capture would be a SCALED baseline, in which the few-pixel
 * shift D-30's second proof depends on is resampled away. So the viewport is oversized and the
 * rendered box is asserted to be the natural size before the element is captured.
 */
const OG_VIEWPORT = { width: 1400, height: 900 } as const;

/**
 * The surfaces that cannot be shot today, PINNED as a set rather than merely skipped.
 *
 * A skip is invisible in a green run. Pinning the set means a third surface joining it fails here,
 * naming itself, instead of quietly reducing coverage — which is the same argument
 * `THEME_SWAP_EXCLUSIONS` makes for having exactly one entry.
 */
const EXPECTED_BLOCKED = ["global-error", "og-listing"] as const;

/** 11-UI-SPEC § GATE-01's total: 3 + 12 + 4 + 1 + 4 + 3. Compile-checked too — see the module. */
const EXPECTED_BASELINE_COUNT = 27;

/**
 * Trap 1. Assert the surface rendered its subject before any pixel is read.
 *
 * The message says why this is a failure and not a skip, because the reader who sees it will be
 * looking at a run that would otherwise have written a baseline of a 404.
 */
async function expectReachable(page: Page, row: BaselineRow): Promise<void> {
  const surface = VISUAL_SURFACES[row.surface];
  await expect(
    page.locator(surface.hook).first(),
    `${row.surface} (${surface.url}) rendered NO \`${surface.hook}\` — ${surface.hookWhy} ` +
      "A screenshot assertion does not fail against a blank page, a 404 or a 500: on the run that " +
      "has no baseline it MINTS one of the wrong page, and every run afterwards compares against " +
      "it and passes. So this is a failure, not a skip.",
  ).toBeVisible();
}

test.describe("GATE-01 — the declared baseline inventory", () => {
  test("the inventory is the 27 rows the UI-SPEC declares, and exactly two are blocked", () => {
    expect(
      VISUAL_BASELINES.length,
      "11-UI-SPEC § GATE-01 declares 27 baselines (3 + 12 + 4 + 1 + 4 + 3). This is the runtime " +
        "half of the compile gate in `visual-baselines.ts`; the type-level one is what catches it " +
        "off Linux, where this file never runs.",
    ).toBe(EXPECTED_BASELINE_COUNT);

    const blocked = blockedSurfaces();
    expect(
      blocked.map((entry) => entry.id),
      "the set of surfaces that cannot be shot changed. A surface joining this list is a baseline " +
        "that silently stopped existing; a surface leaving it is coverage that has been won and " +
        "should be celebrated in the same commit that updates this pin.",
    ).toEqual([...EXPECTED_BLOCKED]);

    for (const entry of blocked) {
      expect(
        entry.reason.length,
        `${entry.id} is blocked with an empty reason — an absent baseline and an argued exclusion ` +
          "look identical in a green run, and only one of them is a decision",
      ).toBeGreaterThan(80);
    }
  });
});

for (const row of VISUAL_BASELINES) {
  const surface = VISUAL_SURFACES[row.surface];

  if (surface.kind === "document") {
    test(baselineArg(row), async ({ page }) => {
      test.skip(surface.blocked !== null, surface.blocked ?? "");
      // `url` is non-null for every unblocked document row; the skip above is what makes this safe,
      // and the assertion below is what makes that claim checkable rather than assumed.
      expect(surface.url, `${row.surface} is unblocked but declares no URL`).not.toBeNull();

      // On the CONTEXT and BEFORE the first goto — `e2e/helpers/theme.ts:44-56`. next-themes' inline
      // pre-paint script reads the seeded key on the very first paint, so there is no flash of the
      // default theme in the frame and no post-hydration switch to wait out.
      await seedTheme(page.context(), row.theme);
      await page.setViewportSize({ width: row.width, height: row.height });
      await emulateVisualMedia(page);

      await page.goto(surface.url as string);
      await injectFreezeStylesheet(page);

      await expectReachable(page, row);

      // The theme really is the one this row names. Without it a seeding regression (a renamed
      // storage key, a `forcedTheme` prop, a provider that stopped mounting) would re-shoot every
      // grove baseline in court and nothing would notice — the pair would still differ from each
      // other on the previous run's files and then agree forever after the next regeneration.
      await expect(
        page.locator("html"),
        `the seeded theme did not reach <html>. Every "grove" baseline in this file is a claim ` +
          "about a document that carries that attribute; without it they are court screenshots " +
          "under grove filenames.",
      ).toHaveAttribute("data-theme", row.theme);

      await expect(page).toHaveScreenshot(baselineArg(row), {
        // FULL PAGE, not the viewport. Two reasons, and the second is not optional: `/dev/theme`'s
        // sections 10-14 and both legal pages' notices sit below the fold at every declared width,
        // so a viewport capture would pin a header and call it coverage — and D-30's second proof
        // nudges the FOOTER's padding, which a viewport capture cannot see at all.
        fullPage: true,
        animations: "disabled",
        caret: "hide",
      });
    });
    continue;
  }

  test(baselineArg(row), async ({ page }) => {
    test.skip(surface.blocked !== null, surface.blocked ?? "");
    expect(surface.url, `${row.surface} is unblocked but declares no URL`).not.toBeNull();

    await page.setViewportSize({ ...OG_VIEWPORT });
    await emulateVisualMedia(page);

    // NO `freeze.css` on this path, and the absence is deliberate: the document Chromium builds for
    // a standalone PNG contains one `<img>` and no application CSS, so there is no animation, no
    // transition and no caret for the sheet to freeze. Injecting it anyway would imply this capture
    // depends on it and would quietly hide a future regression where an OG route started serving
    // HTML — which the content-type assertion above is what actually catches.

    // Navigate to the PNG itself. Chromium renders it as an image document containing one `<img>`,
    // which is the element captured below — so the baseline is the card and not a browser's viewer
    // chrome around it. `setContent` with an absolute URL was the alternative and is worse: it
    // moves the document to an opaque origin and makes the load a cross-document image fetch, which
    // is more browser behaviour to depend on, not less.
    const response = await page.goto(surface.url as string);

    expect(response, `${surface.url} produced no response at all`).not.toBeNull();
    expect(
      response?.status(),
      `${surface.url} did not answer 200. For the invite card the most likely cause is the ` +
        "route-group hash: Next appends a djb2 suffix to a metadata route under any route group, " +
        "so the UNSUFFIXED path is a 404 (measured in plan 11-20).",
    ).toBe(200);
    expect(
      response?.headers()["content-type"],
      `${surface.url} did not serve an image — an HTML error page decodes to 0 × 0 below, but ` +
        "naming the content type here says WHY in one line instead of leaving a dimension mismatch",
    ).toContain("image/png");

    const img = page.locator("img");
    await expect(img, `${surface.url} rendered no <img> — ${surface.hookWhy}`).toBeVisible();

    // The decoded size, which is the reachability check no selector can make: a 404 body, an empty
    // response and a broken PNG all decode to 0 × 0.
    const natural = await img.evaluate((el) => ({
      width: (el as HTMLImageElement).naturalWidth,
      height: (el as HTMLImageElement).naturalHeight,
    }));
    expect(natural, `${surface.url} did not decode to the declared card size`).toEqual({
      ...OG_NATURAL,
    });

    // …and it is rendered at that size rather than shrunk to fit — see OG_VIEWPORT's comment. A
    // scaled capture would resample away exactly the few-pixel differences this gate exists to catch.
    const box = await img.boundingBox();
    expect(box, "the <img> has no layout box").not.toBeNull();
    expect(
      { width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) },
      "the card is not rendered at its natural size — Chromium shrink-to-fit is in play, and a " +
        "scaled baseline cannot detect a few-pixel shift",
    ).toEqual({ ...OG_NATURAL });

    await expect(img).toHaveScreenshot(baselineArg(row), {
      animations: "disabled",
      caret: "hide",
    });
  });
}
