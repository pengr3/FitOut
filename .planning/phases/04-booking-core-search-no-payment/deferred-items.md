# Phase 4 — Deferred Items (out-of-scope discoveries)

Items found during execution that are OUT OF SCOPE for the plan that found them (SCOPE BOUNDARY rule).
Logged, not fixed. Pick up in a dedicated quick-task or the phase code-review.

| Found in | Item | Evidence | Status |
|----------|------|----------|--------|
| 04-02 | `tests/auth/secret-config.test.ts > "throws at boot in production when BETTER_AUTH_SECRET is missing"` fails in the FULL parallel `vitest run` but PASSES when `tests/auth/` runs in isolation (28/28). Pre-existing cross-file state pollution: another test file imports/boots `@/lib/auth` (or leaves `NODE_ENV` stubbed) before this file, so the `vi.stubEnv` + module-cache reset no longer triggers the expected fail-closed throw. | Reproduced with plan 04-02's new test EXCLUDED: full suite = 222 passed / 1 failed (the same 223-total baseline), the auth test still failing → NOT caused by 04-02 (booking validation / seed touch no auth code). Isolated `tests/auth/` = 28/28 green. | OPEN — unrelated to 04-02 booking/search work; belongs to auth test-isolation. Suggest a quick-task: make `secret-config.test.ts` robust to prior module state (`vi.resetModules()` + re-import under stubbed env, or run in its own pool/isolate). |

_Note: this does not affect any 04-02 deliverable — `tests/validation/booking-schemas.test.ts` is 19/19 green and `npx tsc --noEmit` is clean._
