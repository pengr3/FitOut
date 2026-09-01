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

---

## Second sighting — the same `e2e-email-silence.test.ts` flake (18.1-02, 2026-09-02)

Recorded because a flake seen twice in two consecutive plans, on two unrelated trees, is starting to
be a fact about the loader rather than about either plan.

Identical symptom to the 18.1-01 entry above: the first `npm run test:design` of the run failed with

```
FAIL tests/design/e2e-email-silence.test.ts
  > LINK 1 — playwright.config.ts silences Resend for every server it boots
  > by DEFAULT the booted server gets RESEND_API_KEY=""
  Error: Test timed out in 5000ms.  (tests/design/e2e-email-silence.test.ts:111)
```

Re-run of that file ALONE: `5 passed` in 1.19 s. Re-run of the whole suite: `73 passed`,
`1331 passed | 3 skipped`. `npm run build` (which runs `test:design` as its second step) then passed
end to end.

18.1-02 touched `src/lib/host/frozen-payouts.ts`, `src/lib/listing/review-signal.ts`,
`src/components/host/hosting-paused-notice.tsx`, `src/app/(host)/host/earnings/page.tsx` and two test
files. None is in this test's import graph and none concerns Resend, `playwright.config.ts` or the
e2e env contract — so the deferral reasoning in the entry above carries over unchanged.

**What the second sighting adds:** it is a TIMEOUT under full-suite parallel load, at 5000 ms, in a
case whose solo runtime is ~0.7 s. That points at contention in `loadWebServer`'s config read rather
than at any assertion being wrong. The fix, when someone owns it, is most likely a per-test timeout
or a hoisted config load — **not** a weakened assertion.
