// GATE-01 — the determinism seam, in ONE place because both visual specs need both halves of it.
//
// WHY THIS IS A HELPER MODULE AND NOT A FUNCTION INSIDE A SPEC. `e2e/visual/theme-swap.spec.ts` and
// `e2e/visual/surfaces.spec.ts` both need it, and a spec cannot import from another spec: the
// `visual` project's `testMatch` is `e2e/visual/**/*.spec.ts`, so importing one spec into the other
// would execute its `test()` calls a second time inside the importing file's scope and every
// baseline would be compared twice under two different titles. `e2e/helpers/` is where this
// repository already puts exactly this (`theme.ts`, `served-document.ts`), and nothing under it is
// collected by either project.
//
// THE TWO HALVES, AND WHY NEITHER COVERS THE OTHER — the argument is written out in full at the top
// of `e2e/visual/freeze.css`. In short: a stylesheet cannot set a media feature, so
// `prefers-reduced-motion` is emulated here; and an emulated preference only reaches code that
// bothers to ask for it, so the durations are forced there. Calling one without the other is the
// failure this module exists to make impossible.

import path from "node:path";

import type { Page } from "@playwright/test";

/**
 * The determinism sheet's absolute path.
 *
 * Resolved from THIS file rather than from `process.cwd()`, because Playwright's working directory
 * is the config's directory today and that is a fact about the runner, not a guarantee. A wrong path
 * here throws (`addStyleTag` rejects on a missing file), which is the correct loud failure — the
 * alternative, silently skipping the freeze, would produce baselines with live animation in them.
 */
export const FREEZE_STYLESHEET = path.join(__dirname, "..", "visual", "freeze.css");

/**
 * Half 1 — emulation. Call BEFORE the first `goto`, so the very first paint already has it.
 *
 * `reducedMotion: "reduce"` is the media feature `freeze.css` cannot set. `colorScheme: "light"` is
 * set explicitly rather than left at the runner's default: `next-themes` is mounted with
 * `enableSystem={false}` and `enableColorScheme={false}` so the APP does not follow the OS, but the
 * tree still contains a dormant `.dark` block and at least one vendored component has read the OS
 * scheme on its own in this project's history (`ui/sonner.tsx`, before the provider was mounted).
 * Pinning it means a container whose default ever changes cannot silently re-shoot the whole set.
 */
export async function emulateVisualMedia(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
}

/**
 * Half 2 — the stylesheet. Call AFTER every `goto`, because a navigation discards the injected tag.
 *
 * Returns nothing and asserts nothing on purpose: this is plumbing, and the assertions that make a
 * frame trustworthy (the surface rendered, the theme really swapped) belong to the specs.
 */
export async function injectFreezeStylesheet(page: Page): Promise<void> {
  await page.addStyleTag({ path: FREEZE_STYLESHEET });
}
