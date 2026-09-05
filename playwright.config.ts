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

/**
 * `[17-D28]` — REAL EMAIL IS AN OPT-IN, BY NAME, AND NEVER THE DEFAULT.
 *
 * Measured under the phase-17.1 § P3 census at `9683ad9`: a full run of `e2e/overflow-320.spec.ts`
 * made **12** `POST https://api.resend.com/emails`, and `e2e/axe-sweep.spec.ts` made **2** — all 14 on
 * the operator's live key, to synthetic recipients minted by the `signUp` fixtures, and all 14 really
 * left the machine. This flag is the one way back to that behaviour.
 *
 * ⚠ THIS FILE NEVER READS THE SECRET'S VALUE, IN EITHER BRANCH. The opt-in branch emits no
 * `RESEND_API_KEY` entry at all and lets the merge below inherit the operator's own environment; the
 * default branch writes a constant `""`. Neither reads, logs or interpolates the key. That is how the
 * "never print the credential" rule is satisfied structurally rather than by remembering.
 */
const REAL_EMAIL = process.env.FITOUT_E2E_REAL_EMAIL === "1";

/**
 * `[19.1-10]` — THE PUBLIC CLOUDINARY CLOUD NAME, SUPPLIED AS AN INVENTED LITERAL.
 *
 * ⚠ THIS IS NOT A CREDENTIAL, AND THE DISTINCTION IS THE WHOLE REASON THIS LINE IS ALLOWED TO EXIST.
 * `NEXT_PUBLIC_*` variables are inlined into the client bundle and served to every browser that loads
 * the site, so the cloud NAME is public by construction. The two things that are secret —
 * `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` — are NOT set here and must never be: a real
 * credential could only reach `.github/workflows/ci.yml` as a `${{ secrets.X }}` reference, and
 * `scripts/verify-workflows.mjs:813` asserts "zero `secrets.` references in any env / run / with
 * VALUE, across every job". The value below is deliberately shaped like `ci.yml:1076-1078`'s three
 * `ci-build-only-placeholder-not-a-real-*` literals, for the same reason those are literals: so that
 * anybody who "promotes it to a secret" turns the checker red on the spot.
 *
 * WHAT IT BUYS, MEASURED RATHER THAN ASSUMED (`.planning/phases/19.1-…/evidence/triage-upload-capability.txt`,
 * runs R4–R6). `src/components/listing/photo-uploader.tsx` renders `<CldUploadWidget>`, and
 * `next-cloudinary` THROWS at render when this variable is absent — "A Cloudinary Cloud name is
 * required". The throw takes the wizard's photos step down through the route's error boundary, so
 * `e2e/overflow-320.spec.ts:3400` (`· photos step ·`, both themes) never finds the cover-preview
 * heading and fails with a message about the listing having no photo — which it has. With this
 * literal supplied and BOTH secrets still absent, both themes pass. The gate was red for a reason
 * nothing in the repository could have supplied a credential for, because it never needed one.
 *
 * WHY IT LIVES HERE AND NOT IN `ci.yml`. `gate-e2e` boots its server through this config
 * (`npx playwright test --project=chromium`), so one line here fixes the gate AND every local run at
 * once, with no workflow edit. That is also what this `env` block is for: the comment on
 * `reuseExistingServer` below argues that the environment the suite boots must be "a STATIC PROPERTY
 * OF THIS FILE" rather than a runtime condition. A value only CI sets would be exactly the property
 * that file argument rejects.
 *
 * THE COST, STATED RATHER THAN HIDDEN: this SHADOWS an operator's real `.env.local` cloud name for
 * the duration of an e2e run, so a spec that drove a real listing-photo upload through the widget
 * would now address a cloud that does not exist. No spec does (grepped, 19.1-10) — every fixture
 * seeds `listing_photo` rows pointing at committed local assets — and the day one does, it needs a
 * deliberate opt-in of its own, on the `FITOUT_E2E_REAL_EMAIL` model.
 */
const CLOUDINARY_PUBLIC_CLOUD_NAME = "fitout-e2e-placeholder-not-a-real-cloud";

if (REAL_EMAIL) {
  // Same idiom as the VISUAL_OFF_LINUX_REASON warning above: one line, on stderr, naming the FLAG and
  // never the key. A run that sends real email should say so before it sends any.
  console.warn(
    "[playwright] FITOUT_E2E_REAL_EMAIL=1: RESEND_API_KEY is INHERITED from your environment and " +
      "this run WILL send real email to the synthetic addresses the fixtures mint (17-D28).",
  );
}

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

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    // `[17-D24]` / `[17-D28]`. UNCONDITIONAL, and — like `updateSnapshots` above — there is
    // deliberately no CI-conditional ternary here. Restoring `!process.env.CI` is the regression this
    // line exists to prevent, and `tests/design/e2e-email-silence.test.ts` turns that restoration red.
    //
    // WHAT THE OLD VALUE COST. `reuseExistingServer: !process.env.CI` adopts whatever process already
    // holds :3000 — along with whatever environment THAT process was booted with. Every guarantee
    // expressed in `env` below is therefore silently void on any machine with a dev server already
    // running. `[17-D24]` records a second bite of the same trap: a `.next`-wedged server answering
    // 500 on every route was adopted rather than replaced, and the run reported the 500s as failures
    // of the product. This has produced false results twice already (17.1 waves 1 and 2).
    //
    // WHY DELETION RATHER THAN DETECTION. A marker-file plus pid-liveness probe could tell an adopted
    // server from a booted one, but such a probe can itself go vacuous — which is the exact failure
    // class this repo keeps paying for. With the adoption case gone, the `env` guarantee is a STATIC
    // PROPERTY OF THIS FILE, checkable by reading it, rather than a runtime condition that must be
    // trusted. Note that on CI the trap never existed (`!process.env.CI` is already false there), so
    // this changes local behaviour only — while the exposure that mattered was always the CI one.
    //
    // THE COST, STATED RATHER THAN HIDDEN: `npx playwright test` now FAILS when anything else holds
    // :3000, and Playwright's own error names the port. Free the port first. That is loud where the
    // old behaviour was silent. Turbopack's `.next` compile cache survives boots, so the price is a
    // boot (~0.7s measured) and not a rebuild.
    // ─────────────────────────────────────────────────────────────────────────────────────────────
    reuseExistingServer: false,

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    // `[17-D28]` — THE SILENCE. `src/lib/email.ts:34-35` binds `resend = key ? new Resend(key) : null`
    // at MODULE LOAD, and `send()` at `:38-53` returns on the `!resend` branch BEFORE ANY TRANSPORT
    // OBJECT EXISTS. For Resend the key IS the switch, so emptying it here removes the network — not
    // merely the credential. (Contrast `instrumentation.ts:20-22`, where PayMongo's `authHeader()`
    // falls back to `""` and still sends `Basic <base64 of ":">`: same-looking finding, opposite
    // mechanism, which is why THAT one needed an interception and this one does not. `src/lib/email.ts`
    // is not touched by this fix and must stay that way.)
    //
    // ⚠ WHY `""` AND NOT AN UNSET — BOTH HALVES MEASURED, NEITHER GUESSED:
    //   • `webServer.env` MERGES over `process.env` (`{ ...process.env, ...this._options.env }`,
    //     Playwright 1.60.0, `webServerPlugin.js`). A key simply omitted here inherits the live one.
    //   • `@next/env` applies a `.env.local` value ONLY when `typeof initialEnv[key] === "undefined"`.
    //     A deleted variable would therefore be re-supplied from `.env.local` at server boot; `""` is
    //     a defined string, so it survives and shadows the operator's real key.
    //
    // The result, measured on both census spec files: 12 → 0 and 2 → 0 outbound Resend requests, with
    // every spec still green — no spec depends on delivery, because the two that need an emailed token
    // read it from Postgres and say why (`e2e/password-reset.spec.ts:8-10`,
    // `e2e/stale-session-selfheal.spec.ts:44-50`). Sends route to `src/lib/email.ts`'s `[email:dev]`
    // console fallback instead, which is that module's own designed test posture.
    // ─────────────────────────────────────────────────────────────────────────────────────────────
    // ⚠ THE SPREAD KEEPS THE MAIL BRANCH EXACTLY AS IT WAS. `[17-D28]`'s guarantee is that the
    // opt-in branch emits NO `RESEND_API_KEY` KEY AT ALL rather than an empty one, and
    // `tests/design/e2e-email-silence.test.ts` asserts both halves by key presence — so the mail
    // entry stays inside its own conditional and 19.1-10's public cloud name is added BESIDE it,
    // unconditionally, never merged into either branch.
    env: {
      ...(REAL_EMAIL ? {} : { RESEND_API_KEY: "" }),
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: CLOUDINARY_PUBLIC_CLOUD_NAME,
    },

    timeout: 120_000,
  },
});
