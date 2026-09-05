# Phase 19.1 — deferred items (out of scope for the plan that found them)

Discovered while running a plan's own `<verify>`, in a file that plan does not own. Logged
rather than fixed, per the executor scope boundary.

## D-19.1-A — `tests/design/e2e-email-silence.test.ts` times out under full-suite load

- **Found during:** plan 19.1-01, Task 3's `npm run build` verify.
- **Observed:** `LINK 1 — playwright.config.ts silences Resend for every server it boots >
  by DEFAULT the booted server gets RESEND_API_KEY=""` failed with
  `Test timed out in 5000ms` on the FIRST full-suite run of the session
  (1 failed / 1370 passed, aggregate `import 266.81s`). Run in isolation the same file
  passes 5/5 in 796 ms. A second full-suite run passed 78/78 files, 1371 tests,
  `BUILD-EXIT=0`.
- **Reading:** a cold-module-cache flake, not a defect in the assertion. The case
  `await loadWebServer("")`s `playwright.config.ts`, and on this box the first
  transform+import of that graph under parallel load exceeds vitest's default 5 s
  `testTimeout`. It is timing, not behaviour.
- **Why it is not fixed here:** plan 19.1-01 owns `scripts/verify-workflows.mjs`,
  `tests/design/workflow-invariants.test.ts` and comment lines in
  `.github/workflows/ci.yml`. Nothing it changed is reachable from this file, and a
  green-chasing timeout bump in a file this plan does not own is exactly the edit the
  phase's own prohibitions exist to prevent.
- **Suggested disposition:** whoever owns the design-suite reliability work should decide
  between a per-case `testTimeout` on the `loadWebServer` cases and leaving it — a flake
  that fires only on a cold cache is a CI risk on a fresh runner, where the cache is always
  cold. Not a decision for a plan whose subject is the workflow checker.
