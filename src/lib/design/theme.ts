// The product's own name for its look: the two theme names, which one the app renders, and the key
// the theme is remembered under.
//
// The idiom is `src/lib/site.ts:1-12`'s, and so is the reason: *the exported NAME is imported
// everywhere, never a hardcoded literal*. `"court"` retyped in a second module is exactly the drift
// this file exists to prevent — EMAIL-02 requires the email tier to paint from the SAME theme the
// `ThemeProvider` mounts, and a second spelling of the name would let the two diverge silently while
// every test stayed green.
//
// Pure/isomorphic, and that is the whole point of the relocation: this file declares NO rendering
// directive of any kind on its first line, imports NO environment guard, and — load-bearing — imports
// NO theme-runtime library. It has zero imports at all. Nothing here decides what anybody is charged,
// so D-34's deny-list does not reach it either.
//
// The three absences above are asserted by grep in this phase's plan rather than left to review,
// which is also why this header never spells any of them: naming a banned token in prose is what
// turns a clean module into a red gate (15-RESEARCH § Pitfall 9).
//
// TWO READERS, ONE OWNER:
//
//   1. `src/components/theme/theme-provider.tsx` — the mounted theme runtime (THEME-01 / D-06 / D-07
//      / D-08). It imports these back and RE-EXPORTS all four names, so every module that already
//      says `from "@/components/theme/theme-provider"` keeps compiling untouched.
//   2. `src/lib/email-shell.ts` — the email tier (this phase). It resolves its palette as
//      `THEME_TOKENS[DEFAULT_THEME]`, which makes it the FIRST server-side reader these constants
//      have ever had.
//
// WHY THEY MOVED (EMAIL-02 / 15-RESEARCH § Pitfall 3). The four declarations below lived inside the
// provider module, which is client-scoped and pulls a React-context library in at module top level,
// and which had **zero server-side readers**. Importing `DEFAULT_THEME` from there into
// `src/lib/email.ts` would have dragged that library across a client boundary and into the import
// graph of every Inngest function and of the DB-free design-test config — for one string literal.
// The failure mode is the quiet one: nothing breaks, and a client library ships in the server graph
// unnoticed.
//
// Do NOT solve the same problem by adding the theme name to `tokens.generated.ts` instead: that file
// is generated, and `tests/design/token-drift.test.ts` must keep passing with zero edits.

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
