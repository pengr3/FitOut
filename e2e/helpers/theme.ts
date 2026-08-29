// D-08's first override path: the Playwright theme seam.
//
// THIS IS THE SEAM PHASE 11'S THEME-SWAP SMOKE AND PHASE 17'S AXE SWEEP BOTH DEPEND ON — AND THE
// AXE HALF OF THAT SENTENCE IS NARROWER THAN IT WAS. Amended by plan 17-07; the previous version
// read *"PHASE 17'S TWO-THEME AXE PASS"* — SUPERSEDED — and it is quoted here rather than deleted,
// because a promise this file made for six phases is worth seeing superseded rather than absent.
// **D-138 (2026-08-23) postdates it and makes the sweep COURT ONLY** — `e2e/axe-sweep.spec.ts`
// scans one theme, at two widths, and no other. What that costs is written out at the bottom of
// this header, under its own heading, because the honest size of it is not a clause.
//
// It is created here, in the phase that mounts the provider, rather than in the phase that first
// needs it — because the storage key it writes is a property of the provider, and a helper that
// seeds a key the provider does not read is a SILENT no-op: the swap smoke would go green while
// screenshotting the same theme twice, and the sweep would seed nothing and audit whatever the
// default happens to be while reporting that it audited court. That second failure is SMALLER than
// the one this sentence used to describe and it has not gone away — it used to read *"the axe pass
// would audit court twice and report full two-theme coverage"* (SUPERSEDED, same amendment: there
// is no second theme in the sweep to be wrong about any more, only a seed that must be the theme it
// claims). Neither failure has a symptom, which is why the key is imported from the provider
// (below) instead of being duplicated here as the string literal "theme".
//
// WHY SEEDING BEATS CLICKING: there is no runtime theme switcher to click (D-06 — the app always
// renders court for a user, and this phase deliberately does not ship a toggle). Seeding storage
// BEFORE navigation means next-themes' inline pre-paint script reads the value on the very first
// paint, so there is no flash of the default theme and no post-hydration switch to wait out. It
// works on EVERY route with no app surface to gate and nothing to expose in production.
//
// THE BASELINE PROHIBITION THAT STOOD HERE IS SATISFIED — READ THE NEXT PARAGRAPH AS HISTORY, NOT AS
// A STANDING RULE. Amended by plan 11-03; a prohibition left sitting beside the thing it prohibits is
// exactly the drift Phase 11 exists to end, so it is rewritten rather than deleted.
//
// While Phase 10 was in flight this paragraph read "NO VISUAL-REGRESSION BASELINE MAY BE CAPTURED IN
// THIS PHASE", because DS-01 (the Geist fix) plus 10-04's type-scale, elevation and transition-timing
// changes invalidated any screenshot taken before them. All of those have landed. GATE-01 is Phase
// 11's, and the baselines are captured by plan **11-22** — in the pinned Linux image only. Two things
// now enforce that structurally instead of by this sentence: `playwright.config.ts` sets
// `updateSnapshots: "none"` unconditionally, so no run on any machine can mint a baseline (D-28), and
// its `visual` project is not created at all off Linux (D-29). This helper is what makes that capture
// mean something — it seeds the theme pre-paint, so a shot is genuinely of the theme it is filed
// under. ⚠ THE PREVIOUS VERSION OF THIS SENTENCE ENDED *"so a two-theme shot is genuinely two
// themes"* (SUPERSEDED by plan 17-07, and quoted rather than deleted for the same reason as above).
// **D-138 made `VISUAL_BASELINES` court-only too** — one shot per width, 44 second-theme rows gone —
// so the only place a genuinely two-theme pair is still compared is `e2e/visual/theme-swap.spec.ts`'s
// FIXED FOUR surfaces. This helper still does the same job; there is simply far less of it to do.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THE COURT-ONLY NARROWING COSTS — the whole of it, not a clause (D-138, plan 17-07)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
//   • IN COURT the cross-element residue is FULLY covered, on the rendered DOM, by
//     `e2e/axe-sweep.spec.ts`. That is the theme every user gets, and it is completely audited.
//   • IN THE PROBE THEME it is covered only by the four-surface swap contract in
//     `e2e/visual/theme-swap.spec.ts` (`search-results`, `auth-login`, `terms`, `root-not-found`),
//     plus `tests/design/theme-tokens.test.ts`'s 24-name key-set parity check and the two-theme
//     declared-pair table in `src/lib/design/contrast-pairs.ts`. So a cross-element pairing that is
//     LEGAL in court and SUB-BAR in the probe theme, on any surface outside those four, IS NOT
//     DETECTED. Nothing looks for it and nothing would go red.
//   • THAT IS ACCEPTABLE, AND IT IS THE POINT OF D-138 rather than a shortfall it left behind: the
//     second direction is a token-contract PROBE, not a shippable theme, and no user can reach it.
//     The residue would be a defect in a theme nobody sees.
//   • IT BECOMES A REAL GAP THE DAY THAT THEME — OR ANY SECOND THEME — BECOMES SHIPPABLE. That is a
//     DSFUT-02 concern (dark mode), and this paragraph is what a future milestone should re-read
//     before turning a probe into a product.
//
// (The previous version of this paragraph also claimed that Playwright's screenshot-assertion API was
// absent from this file and from `playwright.config.ts` "because its absence from both is asserted by
// a grep". No such grep has ever existed — measured at 11-03, across `tests/**` and `scripts/**`.
// Recorded rather than quietly dropped, because a header comment that invents a guard is worse than
// no comment: it retires the reader's suspicion without retiring the risk.)

import type { BrowserContext } from "@playwright/test";

import {
  THEME_STORAGE_KEY,
  type ThemeName,
} from "../../src/components/theme/theme-provider";

/**
 * Seed next-themes' storage key so the given theme is applied pre-paint on the next navigation.
 *
 * Call it on the CONTEXT (not the page) and BEFORE the first `goto`, e.g.
 *
 * ```ts
 * await seedTheme(page.context(), "grove");
 * await page.goto("/");
 * ```
 *
 * The try/catch is not defensive noise: the seeded init script also runs on `about:blank`, where a
 * localStorage access can throw a SecurityError and would fail the test for a reason that has
 * nothing to do with what the test is asserting.
 */
export async function seedTheme(
  context: BrowserContext,
  theme: ThemeName,
): Promise<void> {
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // about:blank and other opaque origins — nothing to seed, nothing to report.
      }
    },
    [THEME_STORAGE_KEY, theme] as const,
  );
}
