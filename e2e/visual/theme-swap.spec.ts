import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedTheme } from "../helpers/theme";
import { emulateVisualMedia, injectFreezeStylesheet } from "../helpers/visual-freeze";
import { newDrive, swapWidthFor } from "../helpers/visual-drive";
import {
  THEME_SWAP_EXCLUSIONS,
  THEME_SWAP_SURFACES,
  VISUAL_SURFACES,
  type BaselineTheme,
  type DocumentSurfaceId,
} from "../../src/lib/design/visual-baselines";

// D-135 / AC#30, scoped by D-138 — the theme-swap smoke, and since 23 August 2026 THE token
// contract. For each of FOUR fixed surfaces, `court.png` and `grove.png` must differ BYTE-WISE,
// because two identical two-theme screenshots mean that surface ignored the tokens.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SET IS DELIBERATELY FIXED AT FOUR, AND THIS FILE IS THE WHOLE OF WHAT SURVIVED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-138 makes `court` (coral) FitOut's SINGLE product theme and demotes `grove` from a candidate
// brand direction to a TOKEN-CONTRACT PROBE: it is never shippable, is never presented as a brand
// option, and exists only so that a hard-coded colour fails a test. What that costs is now three
// cheap things — `tests/design/theme-tokens.test.ts` (24-name key-set parity),
// `contrast-pairs.ts` + `tests/design/contrast.test.ts` (both themes' declared pairs), and THIS
// FILE, which renders four representative surfaces in both themes and requires the frames to differ.
//
// The set does NOT grow per phase. It was derived until now (documents minus exclusions) and it grew
// 5 → 12 → 24 as the inventory grew, which is exactly the recurring tax D-138 ended. A FIFTH SURFACE
// IS NOT A ROW TO APPEND: it is a claim that these four cannot reach a token family, which is an
// amendment to D-138 and is argued in prose. The four and the argument for each live in
// `THEME_SWAP_SURFACES` in `src/lib/design/visual-baselines.ts`.
//
// This file also costs nothing per UI change: it takes NO STORED BASELINE (see below), so unlike
// `surfaces.spec.ts` it does not have to be re-shot when a surface legitimately changes. That is
// what made it the half worth keeping.
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
// BLOCKED for a second and independent reason — nothing in this repository can render a root-layout
// failure.
//
// ⚠ IT IS NO LONGER WHAT KEEPS `global-error` OUT, and that matters to how you read the list. Under
// D-135 membership was documents-MINUS-exclusions, so this entry was load-bearing; under D-138 the
// compared set is an allow-list of four and `global-error` is simply not in it, along with
// twenty-two other document surfaces that carry no exclusion entry at all. The entry survives as the
// recorded ARGUMENT (deleting an argument is not the same as it becoming false) and as a
// belt-and-braces guarantee, asserted below, that nothing excluded is in the compared set — a check
// that is trivially satisfied today precisely because the four are written out by hand.
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
//     ⚠ AND THERE IS NO LONGER A STRONG VERSION BEHIND IT. Until D-138 this bullet pointed at the
//     committed court/grove baseline PAIR in `surfaces.spec.ts` that a human had read once, and
//     called this the cheap standing check that the pair was still two different things. That pair
//     no longer exists — the inventory is court only — so this weak statement is now the whole of
//     the automated claim. The four surfaces were chosen to make it as strong as one pixel can be:
//     between them they move colour, type scale, radius and elevation.
//   • ONE WIDTH PER SURFACE, and it is 1280 for all four. A surface that re-skins at desktop and not
//     at the 320px floor passes here. `swapWidthFor` still carries a 375 branch for `listing-sheet`
//     (whose trigger is `lg:hidden`, so a 1280 capture would compare the page BEHIND a sheet that
//     cannot exist); that surface is not in D-138's four, so the branch is currently unreached. It
//     is kept because it is generic and correct, not because it runs.
//   • It says nothing about the three OG cards or about `global-error`, by construction — see above.
//   • It cannot distinguish "ignores the tokens" from "renders nothing at all"; the reachability
//     hook is what rejects the second, and it runs first.
//   • THE "TWO DIFFERENT PAGES" VACUITY IS GONE, AND THAT IS SAID HERE RATHER THAN DELETED. Plan
//     12-14 added a warning to this list: four of the then-twelve compared surfaces were STATES
//     driven through `e2e/helpers/visual-drive.ts` and two of those minted database rows (a checkout
//     hold, a collision conflict), so if the court pass and the grove pass ever claimed DIFFERENT
//     booking windows the buffers would differ on CONTENT and this smoke would be green with the
//     tokens untouched. D-138's four are ALL PLAIN NAVIGATIONS — no drive, no interaction, no minted
//     row, no fixture date — which is a membership rule rather than a coincidence, and it removes
//     that failure mode instead of guarding it. The slot-allocation table that used to close it is
//     still correct and still binds this file's `"swap"` lane; it simply has nothing left to do here.
//   • THE CAVEAT THAT REPLACES IT: `search-results` DEPENDS ON THE SEEDED FIXTURE LISTINGS. Its URL
//     is the fixture's `VRT_ORIGIN` and its hook is a result TILE, so an unseeded database gives it
//     nothing to render. That fails LOUDLY at the reachability assertion rather than comparing two
//     empty grids — which would be the same vacuity in a new place, since two empty grids of a page
//     that never rendered differ or agree for reasons that have nothing to do with the tokens.
//   • ONLY FOUR SURFACES ARE CHECKED AT ALL. Twenty-three document surfaces are outside this smoke
//     without appearing in `THEME_SWAP_EXCLUSIONS`, because membership is now an allow-list rather
//     than documents-minus-exclusions. A hard-coded colour on one of those twenty-three is caught by
//     the DS-13 leak gate if the file is inside its scanned tree and BY NOTHING AT ALL if it is not.
//     That is the cost D-138 accepted, stated here rather than left to be discovered.

/**
 * The height every comparison is taken at. The WIDTH is per-surface: 1280 for all but `listing-sheet`,
 * which does not exist above `lg:` — see NOT COVERED and `swapWidthFor`. The smoke is a mechanism
 * check, not a responsive one.
 */
const SWAP_HEIGHT = 800;

/**
 * The number of surfaces this smoke compares: a FIXED FOUR, fixed by D-138.
 *
 * PINNED, not derived from the same expression the loop uses. A count computed by the code under
 * test agrees with itself no matter what it is — that is trap 2 above, and it is how a loop over an
 * empty list reports a green run. This pin is NOT that trap: `THEME_SWAP_SURFACES` is a literal in
 * `visual-baselines.ts` and this is a SECOND literal in a SECOND file, so an edit to one without the
 * matching edit here fails loudly. That is the whole reason both exist.
 *
 * ⚠ THIS NUMBER USED TO GROW, AND NOT GROWING IS NOW THE REQUIREMENT. It was 5, then 12 in plan
 * 12-14, then 24 in 13-15, because the compared set was DERIVED — documents minus exclusions — so
 * every product surface added to the inventory joined this smoke automatically. An earlier draft of
 * this docstring described that as the mechanism working. It was the cost: a proof that a fixed
 * sample already gives, re-charged in full every phase, in a dispatch job on a pinned Linux image.
 *
 * D-138 makes the set an allow-list of four chosen to move colour, type scale, radius and elevation
 * between them, and IT DOES NOT GROW PER PHASE. A FIFTH IS NOT A ROW TO APPEND: it is a claim that
 * these four cannot reach a token family, which amends D-138 and is argued in prose. The membership
 * argument surface by surface — and why `/dev/theme`, the three listing surfaces, `checkout` and
 * `collision-notice` are deliberately NOT in it — lives at `THEME_SWAP_SURFACES`.
 */
const EXPECTED_COMPARED_SURFACES = 4;

/** The members, not just the count. A swap of one surface for another keeps the count at 4. */
const EXPECTED_COMPARED: readonly DocumentSurfaceId[] = [
  "search-results",
  "auth-login",
  "terms",
  "root-not-found",
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
  const width = swapWidthFor(surfaceId);
  const where = `${surfaceId} @ ${width}px · ${theme} (theme-swap)`;
  // `"swap"` IS NOT A LABEL — it selects this spec's OWN booking windows, so that a driven surface
  // running here concurrently with `surfaces.spec.ts` does not claim the window that spec's copy
  // needs (two passes claiming one window produce a REFUSED hold, and a refused checkout drive
  // photographs the collision surface instead). The slot-allocation table in `visual-drive.ts` is
  // the whole argument. NOTE that D-138's four surfaces are all plain navigations, so today this
  // argument selects nothing: `newDrive` returns the default drive for all four and the purpose is
  // inert. It is passed anyway because the alternative is dropping the lane and re-deriving it the
  // day a driven surface is ever argued into the contract set.
  const drive = newDrive(surfaceId, surface.url, "swap");
  const context = await browser.newContext({ baseURL, viewport: { width, height: SWAP_HEIGHT } });
  try {
    await seedTheme(context, theme);
    const page: Page = await context.newPage();
    await emulateVisualMedia(page);
    // BEFORE the first navigation — Playwright's own caveat for `clock`; see `surfaces.spec.ts`.
    if (drive.needsClock) await page.clock.install();

    try {
      await drive.navigate({ page, theme, width, where });
      // AFTER the last navigation (a navigation discards the tag) and BEFORE the interaction, so an
      // overlay opens with zero-duration transitions rather than being caught mid-flight.
      await injectFreezeStylesheet(page);
      await drive.interact?.({ page, theme, width, where });

      await expect(
        page.locator(surface.hook).first(),
        `${surfaceId} (${surface.url}) rendered NO \`${surface.hook}\` — ${surface.hookWhy} ` +
          "Two screenshots of a page that never rendered differ or agree for reasons that have " +
          "nothing to do with the tokens, so this is a failure, not a skip.",
      ).toBeVisible();

      const resolvedTheme = await page.locator("html").getAttribute("data-theme");
      const buffer = await page.screenshot({
        // All four of D-138's surfaces are `fullPage`, which is what the default drive returns. The
        // branch stays because the drive decides, not this file: the two overlay surfaces (not in
        // the contract set) are captured as the VIEWPORT for the reason `surfaces.spec.ts` gives —
        // they are `position: fixed` over a scroll-locked document, so a full-page stitch scrolls a
        // body that cannot scroll and pins a stitching artefact instead of the overlay.
        fullPage: drive.captureMode === "fullPage",
        animations: "disabled",
        caret: "hide",
      });
      return { buffer, resolvedTheme };
    } finally {
      // BEFORE the context closes and therefore before the second theme's pass, and in a `finally`
      // because a failed court pass must not leave a mutated fixture behind that makes grove's pass
      // fail for an unrelated reason. NONE of D-138's four surfaces has a `cleanup` — they are plain
      // navigations that mutate nothing — so this is currently a no-op, kept as the correct shape
      // rather than removed: the day a driven surface is argued into the contract set, this file
      // runs its drive TWICE and the ordering requirement is immediate.
      await drive.cleanup?.({ page, theme, width, where });
    }
  } finally {
    await context.close();
  }
}

test.describe("AC#30 / D-138 — the four contract surfaces re-skin, and the set has not grown", () => {
  test("the compared set and the single exclusion are what this gate claims", () => {
    // Trap 2. The count AND the members, both pinned against literals rather than against the
    // expression that produced them.
    expect(
      [...THEME_SWAP_SURFACES],
      "the set of surfaces this smoke compares changed. A surface leaving it is coverage lost " +
        "silently — the loop below would still report green, because a loop over a shorter list is " +
        "a loop that passes. A surface JOINING it is D-138 being amended by append rather than by " +
        "argument: the set is a FIXED FOUR, and a fifth is a claim that those four cannot reach a " +
        "token family.",
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

      // TWICE the drive's own ceiling, because this test performs the whole drive twice — once per
      // theme, in two fresh contexts. A ceiling, never a wait: raising it cannot turn a failing
      // comparison green, it only decides how long a genuine hang is allowed to look like progress.
      // D-138's four all take the default drive's modest ceiling (one navigation and one hook, with
      // headroom for the dev server compiling a route on demand). It is still computed from the
      // drive rather than written as a literal here, so a driven surface argued into the contract
      // set later gets its own ceiling without an edit.
      test.setTimeout(newDrive(surfaceId, surface.url, "swap").timeoutMs * 2);

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
