import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedTheme } from "../helpers/theme";
import { emulateVisualMedia, injectFreezeStylesheet } from "../helpers/visual-freeze";
import {
  THEME_SWAP_EXCLUSIONS,
  THEME_SWAP_SURFACES,
  VISUAL_SURFACES,
  type BaselineTheme,
  type DocumentSurfaceId,
} from "../../src/lib/design/visual-baselines";

// D-135 / AC#30 — the theme-swap smoke. For every baselined DOCUMENT surface, `court.png` and
// `grove.png` must differ BYTE-WISE, because two identical two-theme screenshots mean that surface
// ignored the tokens.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS CATCHES THAT NO OTHER GATE IN THE REPOSITORY DOES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/design/theme-nesting.test.ts` proves the `@theme inline` mechanism is in the stylesheet.
// `tests/design/contrast.test.ts` proves both themes' declared pairs clear their bars. Neither can
// see a SURFACE that was built with a colour the theme cannot reach — a Tailwind default class, a
// vendored component's own palette, an inline style. Every one of those compiles, passes lint,
// passes the leak gate where the file is outside its scanned tree, and renders identically in both
// themes. Rendering the page twice and diffing the bytes is the only instrument that notices.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// IT TAKES NO BASELINE, AND THAT IS WHY IT IS A SEPARATE FILE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `surfaces.spec.ts` compares against committed PNGs. This file compares two buffers it captured in
// the same run, so it needs no baseline, cannot be affected by a stale one, and would keep working
// on the day every baseline is regenerated. Mixing the two into one file would make a
// `--update-snapshots` run silently rewrite the thing this smoke is comparing.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE THREE WAYS THIS SMOKE COULD PASS WHILE PROVING NOTHING, AND WHAT CLOSES EACH
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. SEEDING SILENTLY DOES NOTHING and both shots are court. Then the buffers are IDENTICAL and
//      the smoke fails — but it fails naming the wrong thing, sending the reader to the surface
//      instead of to the seam. `e2e/helpers/theme.ts:3-9` records that this is the exact failure
//      mode a duplicated storage-key literal produces. Closed by asserting `<html data-theme>` is
//      the seeded value in each pass, BEFORE the buffers are compared.
//   2. THE SET BEING COMPARED IS EMPTY, or has quietly shrunk to one. Every `for` loop over an empty
//      list is a green run — the scan-of-nothing failure this phase has now recorded seven times,
//      most recently in 11-21 where a prescribed probe left all twelve of its equalities green.
//      Closed by pinning the compared COUNT and the compared MEMBERS, not just iterating them.
//   3. THE EXCLUSION EXCLUDES SOMETHING THAT WAS NEVER A CANDIDATE. Excluding an OG card would read
//      as a considered decision and remove nothing, because a server-rendered image has no theme to
//      swap in the first place. Closed at COMPILE time: `ThemeSwapExclusion.surface` is typed to
//      `DocumentSurfaceId`, a union derived from each surface's `kind`, so an image id does not
//      compile. Re-asserted at runtime below in case that derivation is ever widened.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE EXCLUSION
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `global-error`, which cannot be themed by construction: it renders its own document and receives
// no global styles, so an app-level `data-theme` attribute never reaches it and an identical
// court/grove pair is CORRECT there. Carried as data with its reason in
// `src/lib/design/visual-baselines.ts`, in `contrast-pairs.ts`'s `EXCLUDED_PAIRS` idiom. It is also
// currently BLOCKED for a second and independent reason — nothing in this repository can render a
// root-layout failure — so it is skipped here twice over, which is stated rather than left to be
// discovered.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AND THE INHERITED TRAP — STALE CSS FROM A REUSED DEV SERVER
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Copied verbatim from `e2e/scroll-area-overflow.spec.ts:49-56` on plan 11-03's instruction:
//
//   `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, and the dev server is what
//   serves the compiled stylesheet. A server left running across a `git checkout` of a component can
//   keep serving CSS that no longer matches the tree. IF THIS FILE FAILS ON A CLEAN `git status`,
//   KILL THE SERVER ON :3000 AND RE-RUN BEFORE TOUCHING THE COMPONENT.
//
// Here the stale-server failure has a specific and nasty shape: the token layer is exactly what a
// stale stylesheet holds, so BOTH passes render from the same stale CSS and the difference the smoke
// measures is the difference that stylesheet happened to have — which may be none. A reused server
// can therefore turn this file RED against a perfectly correct tree, and (after a token change that
// the stale sheet predates) GREEN against a broken one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • "The bytes differ" is the WEAKEST possible statement of "this surface honours the tokens". One
//     changed pixel satisfies it. A surface whose body re-skins but whose cards do not would pass.
//     The strong version is the committed baseline pair in `surfaces.spec.ts`, which a human read
//     once; this is the cheap standing check that the pair is still two different things.
//   • ONE WIDTH (1280). A surface that re-skins at desktop and not at the 320px floor passes here.
//   • It says nothing about the three OG cards or about `global-error`, by construction — see above.
//   • It cannot distinguish "ignores the tokens" from "renders nothing at all"; the reachability
//     hook is what rejects the second, and it runs first.

/** One width. The smoke is a mechanism check, not a responsive one — see NOT COVERED. */
const SWAP_VIEWPORT = { width: 1280, height: 800 } as const;

/**
 * The number of surfaces this smoke compares: six document surfaces minus the one exclusion.
 *
 * PINNED, not derived from the same expression the loop uses. A count computed by the code under
 * test agrees with itself no matter what it is — that is trap 2 above, and it is how a loop over an
 * empty list reports a green run.
 */
const EXPECTED_COMPARED_SURFACES = 5;

/** The members, not just the count. A swap of one surface for another keeps the count at 5. */
const EXPECTED_COMPARED: readonly DocumentSurfaceId[] = [
  "dev-theme",
  "terms",
  "privacy",
  "root-not-found",
  "auth-login",
];

type Capture = {
  readonly buffer: Buffer;
  /** What `<html>` actually carried. The positive control for trap 1. */
  readonly resolvedTheme: string | null;
};

/**
 * Render one surface in one theme in its OWN browser context, and return the bytes plus what the
 * document element actually resolved to.
 *
 * A fresh context per theme rather than one page re-seeded twice, because `seedTheme` installs an
 * init script and init scripts ACCUMULATE: seeding court and then grove on the same context leaves
 * both scripts registered and the surviving value decided by execution order. That is a coin flip
 * dressed as a test.
 */
async function capture(
  browser: Browser,
  baseURL: string,
  surfaceId: DocumentSurfaceId,
  theme: BaselineTheme,
): Promise<Capture> {
  const surface = VISUAL_SURFACES[surfaceId];
  const context = await browser.newContext({ baseURL, viewport: { ...SWAP_VIEWPORT } });
  try {
    await seedTheme(context, theme);
    const page: Page = await context.newPage();
    await emulateVisualMedia(page);
    await page.goto(surface.url as string);
    await injectFreezeStylesheet(page);

    await expect(
      page.locator(surface.hook).first(),
      `${surfaceId} (${surface.url}) rendered NO \`${surface.hook}\` — ${surface.hookWhy} ` +
        "Two screenshots of a page that never rendered differ or agree for reasons that have " +
        "nothing to do with the tokens, so this is a failure, not a skip.",
    ).toBeVisible();

    const resolvedTheme = await page.locator("html").getAttribute("data-theme");
    const buffer = await page.screenshot({
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    });
    return { buffer, resolvedTheme };
  } finally {
    await context.close();
  }
}

test.describe("AC#30 — every baselined surface re-skins, except the one that cannot", () => {
  test("the compared set and the single exclusion are what this gate claims", () => {
    // Trap 2. The count AND the members, both pinned against literals rather than against the
    // expression that produced them.
    expect(
      [...THEME_SWAP_SURFACES],
      "the set of surfaces this smoke compares changed. A surface leaving it is coverage lost " +
        "silently — the loop below would still report green, because a loop over a shorter list is " +
        "a loop that passes.",
    ).toEqual([...EXPECTED_COMPARED]);
    expect(THEME_SWAP_SURFACES.length).toBe(EXPECTED_COMPARED_SURFACES);

    // AC#30 verbatim: exactly one exclusion, so a second must be argued for rather than appended.
    // The compile gate in `visual-baselines.ts` catches this off Linux, where this file never runs;
    // this is the runtime half, and it is the one that names the number in its failure.
    expect(
      THEME_SWAP_EXCLUSIONS.length,
      "AC#30 allows exactly ONE theme-swap exclusion (`global-error`). A second entry is a claim " +
        "that a second surface cannot be themed, which is an argument somebody has to make in " +
        "prose — appending a row is not making it.",
    ).toBe(1);

    for (const exclusion of THEME_SWAP_EXCLUSIONS) {
      // Trap 3's runtime half. The compile-time half is the `DocumentSurfaceId` type on the field.
      expect(
        VISUAL_SURFACES[exclusion.surface].kind,
        `${exclusion.surface} is excluded from a smoke it was never a candidate for. Excluding a ` +
          "server-rendered image reads as a decision and removes nothing.",
      ).toBe("document");
      expect(
        exclusion.reason.length,
        `${exclusion.surface} is excluded with an empty reason`,
      ).toBeGreaterThan(80);
      expect([...THEME_SWAP_SURFACES]).not.toContain(exclusion.surface);
    }
  });

  for (const surfaceId of THEME_SWAP_SURFACES) {
    test(`${surfaceId} renders differently in court and grove`, async ({ browser, baseURL }) => {
      const surface = VISUAL_SURFACES[surfaceId];
      test.skip(surface.blocked !== null, surface.blocked ?? "");
      expect(baseURL, "no baseURL configured").toBeTruthy();

      const court = await capture(browser, baseURL as string, surfaceId, "court");
      const grove = await capture(browser, baseURL as string, surfaceId, "grove");

      // Trap 1 — THE POSITIVE CONTROL, and it runs before the comparison so a seam regression names
      // itself instead of being reported as a surface that ignores the tokens.
      expect(
        [court.resolvedTheme, grove.resolvedTheme],
        "the seeded theme did not reach <html>, so both passes rendered the same theme and the " +
          "byte comparison below is measuring nothing. Check the storage key in " +
          "`src/components/theme/theme-provider.tsx` against the one `e2e/helpers/theme.ts` seeds " +
          "— they are the same import for exactly this reason.",
      ).toEqual(["court", "grove"]);

      // …and the buffers are real frames, not two empty responses agreeing to differ by a header.
      expect(court.buffer.byteLength, "the court capture is implausibly small").toBeGreaterThan(1000);
      expect(grove.buffer.byteLength, "the grove capture is implausibly small").toBeGreaterThan(1000);

      expect(
        court.buffer.equals(grove.buffer),
        `${surfaceId} renders byte-identically in court and grove, which means it does not read ` +
          "the theme tokens at all. The usual causes, in order of frequency: a Tailwind default " +
          "colour class (`bg-white`, `text-gray-500`) instead of a token utility; a vendored " +
          "component carrying its own palette; an inline style with a literal. Note this cannot be " +
          "a rounding or antialiasing question — identical bytes mean identical pixels.",
      ).toBe(false);
    });
  }
});
