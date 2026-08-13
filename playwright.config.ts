import { defineConfig, devices } from "@playwright/test";

// E2E config for the auth flows (signup -> login persistence, password reset,
// mode switch). Specs live in /e2e (added by Plans 02-04).
//
// `webServer` boots the Next dev server on :3000 and reuses an already-running
// one locally so you don't fight over the port. The DB must be up (`npm run db:up`)
// before E2E runs that touch real data.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// GATE-01 — TWO PROJECTS, AND A SNAPSHOT MODE THAT CANNOT WRITE (D-28, D-29)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The visual-regression gate lives in its own project so that (a) a local `npx playwright test` never
// tries to compare screenshots on a machine whose baselines are illegal, and (b) the two projects'
// collected files are DISJOINT — `e2e/*.spec.ts` for `chromium`, `e2e/visual/**/*.spec.ts` for
// `visual`. Without the explicit `testMatch` on `chromium`, the default pattern would collect every
// visual spec into the functional project too, and the shipped suite would start taking screenshots.
//
// The `visual` project's specs and baselines arrive in plan `11-22`. `e2e/visual/` does not exist yet;
// an empty match is the correct state for wave 1 and is not a misconfiguration.

/**
 * Why the `visual` project is not collected anywhere except Linux — named rather than implied, so a
 * developer who runs the suite here and counts one project instead of two is told the reason instead
 * of going looking for a bug.
 */
const VISUAL_OFF_LINUX_REASON =
  "baselines are generated and compared ONLY in mcr.microsoft.com/playwright:v1.60.0-noble " +
  "(D-27/D-29); a non-Linux run would compare against, or be tempted to mint, a platform baseline " +
  "that can never be committed";

/**
 * A HARD skip, not a soft one: off Linux the project entry is not created at all, so there is no
 * project to select with `--project=visual` and no way to reach a screenshot assertion by accident.
 * Everything else about a local run is unchanged — `npx playwright test` still collects and runs the
 * functional `chromium` specs exactly as it did before this file grew a second project.
 */
const RUN_VISUAL_PROJECT = process.platform === "linux";

if (!RUN_VISUAL_PROJECT) {
  // One line, on stderr, on every non-Linux run. The alternative — silence — makes an absent project
  // indistinguishable from a config that failed to load one.
  console.warn(
    `[playwright] project "visual" is NOT collected on ${process.platform}: ${VISUAL_OFF_LINUX_REASON}.`,
  );
}

export default defineConfig({
  testDir: "e2e",

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // D-28. UNCONDITIONAL. There is deliberately no CI-conditional ternary here, and adding one back is
  // the regression this line exists to prevent.
  //
  // D-135 originally prescribed a mode that varied by environment — refusing to write on CI, writing
  // freely everywhere else. Two things are wrong with that, and the second was MEASURED against
  // Playwright 1.60.0 in this repo rather than reasoned about (11-RESEARCH § GATE-01 Findings):
  //
  //   • The default mode ("missing") does NOT quietly report green on the run that finds no baseline.
  //     It fails that run — non-retriably, ignoring `--retries` — AND WRITES THE PNG. The next bare
  //     re-run is then green, off a baseline the failed run just minted. A red that turns green when
  //     you press the button again is the textbook rubber stamp: nobody investigates it, and the
  //     reference every future run compares against was produced by whichever machine happened to go
  //     second. (Finding 3.)
  //   • Under "none" the same missing baseline writes ZERO files, loses the `, writing actual.` clause
  //     from its error, and becomes retriable — so it stays red across every attempt and every re-run.
  //     (Finding 4.)
  //
  // An environment-conditional mode also means the guarantee only holds where the flag happens to be
  // set. This one holds on every machine, which is the point: the author's laptop is exactly where an
  // illegal `*-win32.png` would be minted.
  //
  // REGENERATION STILL WORKS. The `--update-snapshots` CLI flag overrides this value — Playwright
  // resolves the CLI override first and the config value second (Finding 5) — so D-27's dispatch job
  // in the pinned Linux image can still produce baselines. The flag is the ONLY sanctioned write path.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  updateSnapshots: "none",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // Top level only. `e2e/visual/**` belongs to the other project and must never be collected here:
      // a screenshot assertion running under `chromium` would write its baseline under a `-chromium-`
      // name, outside every rule that exists to catch one.
      testMatch: "e2e/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(RUN_VISUAL_PROJECT
      ? [
          {
            // The project NAME is load-bearing beyond selection: it is a segment of every baseline
            // filename ("{arg}-{projectName}-{platform}{ext}", measured — 11-RESEARCH Finding 1), so
            // renaming this string orphans every committed baseline at once.
            name: "visual",
            testMatch: "e2e/visual/**/*.spec.ts",
            use: { ...devices["Desktop Chrome"] },
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
