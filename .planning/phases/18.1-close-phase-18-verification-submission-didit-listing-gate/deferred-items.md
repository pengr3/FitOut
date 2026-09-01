# Phase 18.1 — Deferred Items

Out-of-scope discoveries logged during execution. Per the executor's SCOPE BOUNDARY rule these are
**not** fixed by the plan that found them: each was proved pre-existing / unrelated before being
deferred.

---

## D1 — `tests/design/e2e-email-silence.test.ts` LINK 1 is INTERMITTENTLY RED

**Found during:** 18.1-01, gate 4 (`npm run test:design`).

**Symptom:** one run of `npm run test:design` reported `1 failed | 1330 passed`, in:

```
LINK 1 — playwright.config.ts silences Resend for every served page
  > by DEFAULT the booted server gets RESEND_API_KEY=""
  (tests/design/e2e-email-silence.test.ts:111, inside `const webServer = await loadWebServer("")`)
```

Two immediately-subsequent runs of the identical command were **fully green** (`73 passed`,
`1331 passed | 3 skipped`), and the fifth gate `npm run build` — which runs `test:design` as its
second step — also passed end to end.

**Why it is deferred, not fixed:**

- **Unrelated surface.** 18.1-01 touched four files: `.planning/REQUIREMENTS.md`,
  `src/lib/payments/fees.ts`, `src/lib/ops/cancel-impact.ts` and
  `tests/payments/ops-cancel.test.ts`. None is in this test's import graph, none is
  `playwright.config.ts`, and none concerns Resend or `RESEND_API_KEY`.
- **Non-deterministic, not newly broken.** The assertion reads a config file through a loader; it
  passed on 2 of 3 consecutive runs against a byte-identical tree.

**Recommended owner:** whichever later 18.1 plan next touches `playwright.config.ts` or the e2e env
contract. If it reddens deterministically at that point, treat it as a real finding rather than a
flake and pin the loader rather than the assertion.
