---
phase: 24-search-bar-rework
reviewed: 2026-09-15T11:22:35Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/search/search-experience.tsx
  - e2e/progressive-search.spec.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-09-15T11:22:35Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the Plan 24-18 delta and its imported Button/overlay contracts. The local `sm:flex` override correctly leaves the shared Button recipe and mobile breakpoint unchanged, and the focused Chromium journey plus scoped ESLint both pass. One newly added geometry assertion is not portable to classic-scrollbar browser configurations.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Midpoint proof measures a different width than the CSS layout area

**File:** `C:/Users/Admin/Roaming/FitOut/e2e/progressive-search.spec.ts:193`, `C:/Users/Admin/Roaming/FitOut/e2e/progressive-search.spec.ts:251`
**Issue:** The new assertions compare the trigger's auto-margin-based layout position with `window.innerWidth`. `innerWidth` includes a reserved vertical scrollbar, whereas the normal-flow containing block that `sm:mx-auto` centers in excludes it. On Chromium configurations that reserve scrollbar space, a centered 768px trigger can be offset by roughly half the scrollbar width from this expected midpoint and fail the one-pixel check even though the implementation has not regressed. That makes the required regression test platform-dependent.
**Fix:** Compare against the document layout viewport width (or the trigger's containing block) consistently in both assertions:

```ts
const desktopViewport = await page.evaluate(() => ({
  width: document.documentElement.clientWidth,
}));
```

Use the same measurement after Cancel. If the acceptance criterion intentionally means the browser chrome-inclusive visual viewport instead, change the production layout to center against that coordinate system and retain `innerWidth`; do not mix the two coordinate systems in the test.

---

_Reviewed: 2026-09-15T11:22:35Z_
_Reviewer: Codex (gsd-code-reviewer)_
_Depth: standard_
