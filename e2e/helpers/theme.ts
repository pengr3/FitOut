// D-08's first override path: the Playwright theme seam.
//
// THIS IS THE SEAM PHASE 11'S THEME-SWAP SMOKE AND PHASE 17'S TWO-THEME AXE PASS BOTH DEPEND ON.
// It is created here, in the phase that mounts the provider, rather than in the phase that first
// needs it — because the storage key it writes is a property of the provider, and a helper that
// seeds a key the provider does not read is a SILENT no-op: the swap smoke would go green while
// screenshotting the same theme twice, and the axe pass would audit court twice and report full
// two-theme coverage. That failure has no symptom at all, which is why the key is imported from the
// provider (below) instead of being duplicated here as the string literal "theme".
//
// WHY SEEDING BEATS CLICKING: there is no runtime theme switcher to click (D-06 — the app always
// renders court for a user, and this phase deliberately does not ship a toggle). Seeding storage
// BEFORE navigation means next-themes' inline pre-paint script reads the value on the very first
// paint, so there is no flash of the default theme and no post-hydration switch to wait out. It
// works on EVERY route with no app surface to gate and nothing to expose in production.
//
// NO VISUAL-REGRESSION BASELINE MAY BE CAPTURED IN THIS PHASE. GATE-01 is Phase 11's, and DS-01
// (the Geist fix) plus 10-04's type-scale, elevation and transition-timing changes invalidate any
// screenshot taken before them. A screenshot-comparison assertion appearing alongside this helper
// would be a scope alarm, not a convenience — this helper exists so that Phase 11 can shoot the
// baseline correctly, once. (Playwright's screenshot-assertion API is not named literally anywhere
// in this file or in playwright.config.ts, because its absence from both is asserted by a grep.)

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
