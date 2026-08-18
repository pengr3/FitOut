# Deferred Items — Phase 12

Out-of-scope discoveries logged during execution. Not fixed by the plan that found them.

- **[12-01] The `/dev/theme` visual baselines are now stale and must be regenerated in the Linux dispatch job.** `RESULT_GRID_GAP` retires the 20px card-grid gutter, and `/dev/theme` section 14 renders BOTH the card-grid skeleton and the resolved grid — so `dev-theme-1280-court-visual-linux.png`, `dev-theme-768-court-visual-linux.png` and `dev-theme-320-court-visual-linux.png` under `e2e/visual/surfaces.spec.ts-snapshots/` no longer match the tree. This is a **consequence of the plan, not a defect**: the gutter change is the plan's whole point, and a baseline that still shows the old gutter is the stale artefact.

  **Not regenerated here, deliberately.** `playwright.config.ts` sets `updateSnapshots: "none"` unconditionally and the `visual` project is not created at all off Linux (D-28 / D-29), so the only sanctioned write path is the `--update-snapshots` dispatch job in `mcr.microsoft.com/playwright:v1.60.0-noble`. Minting a `*-win32.png` locally is exactly the illegal baseline that config exists to prevent. Whoever runs the next dispatch: expect a three-file diff on `dev-theme-*`, confined to the card-grid section's column widths (skeleton cells narrow by 2.67px at 1280 as the gutter goes 20 → 24).

  The functional `chromium` project is unaffected and green — `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` is 8 passed after the change.

- **[12-01] `e2e/skeleton-geometry.spec.ts`'s header measurement table is now one number out of date.** The table recorded at 17 August 2026 lists the card-grid media box at `179.33 × 134.48` in both themes on `/dev/theme` at 1280px. With the gutter at 24px the measured box is `176.66 × 134.48`. The table is prose, not an assertion — the ±2px comparison re-measures on every run and is green — so nothing is broken, but a reader who trusts the table will be 2.67px wrong about the width. Refresh it the next time that file is opened for a real change.
