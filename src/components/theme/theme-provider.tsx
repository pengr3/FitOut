"use client";

// The one mounted theme runtime (THEME-01 / D-06 / D-07 / D-08).
//
// `next-themes` has been a dependency for the whole life of this project and NO provider has ever
// mounted — which is why src/components/ui/sonner.tsx read the OS colour scheme and rendered dark
// toasts inside a light-only app. This module is that missing mount.
//
// D-06 — THERE IS NO RUNTIME THEME SWITCHER. `enableSystem` is false and the default is fixed at
// `court`, so the app always renders court for a user. `grove` is a placeholder brand direction that
// exists to be *compared*, not chosen; the two override paths below are for tests and for reviewers.
//
// D-07 — The provider applies the theme by writing `data-theme` on `document.documentElement` from an
// inline pre-paint script, BEFORE React hydrates. That is why `<html suppressHydrationWarning>` in
// src/app/layout.tsx is load-bearing rather than belt-and-braces: without it React warns on every load
// because the server-rendered attribute and the client's differ by construction.
//
// D-08 — Two override paths exist, and both go through THIS module's storage key:
//   1. Tests    — Playwright seeds `localStorage["theme"]` via `context.addInitScript` before
//                 navigation (see e2e/helpers/theme.ts). This is the seam Phase 11's theme-swap smoke
//                 and Phase 17's two-theme axe pass both depend on.
//   2. Humans   — `?theme=` outside production (see ./theme-query-param.tsx).
//
// BROWSER-LOCAL STATE THIS PHASE CREATES: `localStorage["theme"]`. next-themes persists every
// `setTheme()` call, so a developer who once loaded `/?theme=grove` keeps seeing grove on EVERY
// subsequent load of localhost, on every route, until they clear that key. That is a real "why does
// my app look wrong" trap and it is not a bug. It is also NOT session state — it carries no identity
// and grants no capability (threat T-10-16), so nothing may ever be authorised off the back of it.

import { ThemeProvider as NextThemes } from "next-themes";

/** The complete set of theme names. Anything not in here must never reach the DOM attribute. */
export const THEMES = ["court", "grove"] as const;

export type ThemeName = (typeof THEMES)[number];

/** D-06: the app always renders court. */
export const DEFAULT_THEME: ThemeName = "court";

/**
 * next-themes' OWN default storage key. Exported rather than duplicated as a literal in
 * e2e/helpers/theme.ts, because a Playwright helper seeding a key the provider does not read is a
 * silent no-op — the smoke test would pass while asserting nothing (D-08).
 */
export const THEME_STORAGE_KEY = "theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    // Every prop is stated explicitly even where it matches next-themes 0.4.6's own default. The
    // readability IS the point: each one below is a decision this phase made, and a reader must not
    // have to open node_modules to learn which behaviours are chosen and which are inherited.
    //
    // NOTE the one prop that is deliberately ABSENT: next-themes' forced-theme prop, which pins a
    // single theme regardless of what is stored. It short-circuits the pre-paint script BEFORE
    // localStorage is read, so adding it would defeat BOTH of D-08's override paths at once — the
    // Playwright seam and `?theme=` would each silently do nothing. It is not spelled with its
    // literal identifier anywhere in this file because its absence is asserted by a grep.
    <NextThemes
      attribute="data-theme" // THEME-01: never `class` — that would collide with the dormant `.dark` block.
      themes={[...THEMES]} // Library default is ["light","dark"]; must be overridden.
      defaultTheme={DEFAULT_THEME} // D-06.
      enableSystem={false} // D-06: the app never follows the OS.
      enableColorScheme={false} // Neither name is light|dark, so there is no colour scheme to declare.
      storageKey={THEME_STORAGE_KEY} // The key Playwright seeds (D-08).
      disableTransitionOnChange // Deterministic swap for Phase 11's screenshots.
    >
      {children}
    </NextThemes>
  );
}
