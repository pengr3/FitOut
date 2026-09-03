---
phase: 13-confirmation-bookings-trust
plan: 17
subsystem: testing
tags: [ci, hermetic-tests, d-35, secret-boundary, paymongo, checkout-probe, gap-closure]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 03
    provides: "`src/lib/payments/checkout-probe.ts` and `tests/booking/checkout-probe.test.ts` — the D-84 probe, its no-secret short-circuit, and the spec this plan makes hermetic"
provides:
  - "`tests/booking/checkout-probe.test.ts` runs the SAME branch with the PayMongo key present and absent — the two CI failures are fixed without touching production behaviour, skipping a case, or granting CI a key"
  - "Request-count assertions on cases (3), (4) and (5), which were passing in CI for the wrong reason: `null` is what the no-secret short-circuit returns, so an absent request was satisfying an absence assertion"
  - "The measurement that the ENTIRE suite is now key-independent: 156 files / 1516 tests, identical with and without `PAYMONGO_SECRET_KEY`"
affects: [gate-db, ci, phase-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A spec that reads an env var only THROUGH the module under test declares that var itself rather than inheriting it — the ambient value is an input, and an unstubbed input is a per-machine branch"
    - "The case whose SUBJECT is the empty-env branch overrides the harness default back to empty, so the branch is a condition it creates rather than the state it happens to sit in"
    - "An absence assertion (`resolves.toBeNull()`) is paired with a positive request-count assertion, because the two ways of reaching `null` are otherwise indistinguishable"

key-files:
  created:
    - .planning/phases/13-confirmation-bookings-trust/13-17-SUMMARY.md
  modified:
    - tests/booking/checkout-probe.test.ts

key-decisions:
  - "The secret is stubbed IN THE SPEC (`vi.stubEnv`), not mocked at the config module — `vi.stubEnv` is already this file's own idiom (case 6) and the repo's (auth/secret-config, email-dev-fallback), and the existing `vi.unstubAllEnvs()` already restores it"
  - "The harness value is deliberately NOT `sk_test_`-shaped: only `authHeader()` reads it, into a Basic credential the mocked fetch never inspects, so a realistic literal buys no fidelity and plants a secret-shaped string for a scanner to trip on"
  - "Cases (3), (4) and (5) were STRENGTHENED rather than left alone — they were green in CI while (1) and (7) were red, which is the worse failure, and the fix alone would have made them correct-but-still-unable-to-notice"
  - "`checkout-probe.ts` is unchanged. Answering `null` with no request when no secret exists is correct and load-bearing for D-35; the defect was the spec's assumption about it, not the behaviour"

requirements-completed: []

# Metrics
duration: 55m
completed: 2026-08-21
---

# Phase 13 Plan 17: The Spec That Only Passed Here Summary

**Two CI failures traced to an ambient `PAYMONGO_SECRET_KEY` that `.env.local` supplies on this machine and CI withholds by design — fixed by declaring the credential in the harness, and three cases that were passing for the same accidental reason strengthened so they can never do it again.**

## Performance

- **Duration:** ~55m (roughly half of it recovering a crashed Docker Desktop before any test could run at all)
- **Completed:** 2026-08-21T05:14Z
- **Tasks:** 1 of 1
- **Files modified:** 1 (`tests/booking/checkout-probe.test.ts`), in one commit

## What Was Wrong

`probeCheckoutSession` answers `null` **with no request** when `PAYMONGO_SECRET_KEY` is unset
(`src/lib/payments/checkout-probe.ts:73-75`). Its own header states why, under
*"D-35's CI SECRET BOUNDARY — The PayMongo test key is absent in CI BY DESIGN."*

`tests/booking/checkout-probe.test.ts` mocks the global `fetch` and asserts over the fetch path — but
never declared the variable that decides whether the fetch path is reached. `tests/setup.ts` loads
`.env.local`, which on this machine carries a real key, so locally the short-circuit never fired and
the spec looked hermetic. In CI it fired on every case.

The spec's own header carried the wrong claim in prose — *"Nothing here needs a PayMongo secret"* —
which is true of the *wrapper* and false of the *spec*, and that conflation is the whole defect.

## Reproduced First — The Verbatim Red

`PAYMONGO_SECRET_KEY=` in the process environment reproduces CI exactly: `dotenv` does not override an
already-present key (verified: `hasOwnProperty` is true for the empty string, and the value survives the
`.env.local` load), so the module sees no secret while everything else about the run is normal.

```
$ PAYMONGO_SECRET_KEY= npx vitest run tests/booking/checkout-probe.test.ts

 ❯ tests/booking/checkout-probe.test.ts (13 tests | 2 failed) 32ms
     × (1) returns the widened session state on success — the rail and the paid-at instant 24ms
     × (7) applies a DECLARED deadline — an AbortSignal reaches fetch, and a hung provider yields null 1ms

 FAIL  tests/booking/checkout-probe.test.ts > probeCheckoutSession — the D-84 booker-facing probe > (1) returns the widened session state on success — the rail and the paid-at instant
AssertionError: expected null not to be null
 ❯ tests/booking/checkout-probe.test.ts:64:23
     62|     const state = await probeCheckoutSession("cs_ok");
     63|
     64|     expect(state).not.toBeNull();
       |                       ^

 FAIL  tests/booking/checkout-probe.test.ts > probeCheckoutSession — the D-84 booker-facing probe > (7) applies a DECLARED deadline — an AbortSignal reaches fetch, and a hung provider yields null
TypeError: Cannot read properties of undefined (reading '1')
 ❯ tests/booking/checkout-probe.test.ts:135:34
    135|     expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].signa…
       |                                  ^

 Test Files  1 failed (1)
      Tests  2 failed | 11 passed (13)
```

Same two cases, same messages, same lines as run `32447216221` job `gate-db`.

## The Wider Finding — Three Cases Were Passing For The Same Reason

This is the part the CI failure did not show, and it is worse than the part it did.

Cases **(3)**, **(4)** and **(5)** all assert `resolves.toBeNull()`. `null` is *also* what the no-secret
short-circuit returns. So in CI they were green while proving nothing: an **absent request** was
satisfying an **absorbed failure** assertion. The tell was in the reproduction above — the whole file ran
in **32ms**, when case (7) alone must take ~3s if its deadline actually fires.

They are now paired with a positive `expect(fetchMock.mock.calls).toHaveLength(1)`, so the two routes to
`null` are distinguishable. Watched failing, with the new `vi.stubEnv` line temporarily disabled and the
key absent — **five** red, not two:

```
 ❯ tests/booking/checkout-probe.test.ts (13 tests | 5 failed) 36ms
     × (1) returns the widened session state on success — the rail and the paid-at instant 25ms
     × (3) NEVER RAISES: a rejecting fetch underneath RESOLVES to null 4ms
     × (4) a NON-2xx from the provider also resolves to null, and its prose does not escape 1ms
     × (5) an UNRECOGNISED response shape resolves to null rather than a half-built state 1ms
     × (7) applies a DECLARED deadline — an AbortSignal reaches fetch, and a hung provider yields null 1ms
      Tests  5 failed | 8 passed (13)
```

Cases **(2)** (null id) and **(6)** (no secret) were and remain hermetic — both assert *zero* requests, so
neither can be satisfied by the short-circuit it is not testing. Case (6) additionally now **overrides**
the harness default back to empty, which turns it from a case that agreed with the ambient state into one
that creates the condition it asserts.

Nothing else in the repository shares the dependence: `tests/booking/detail-completeness.test.tsx` and
`tests/booking/reference-surface.test.tsx` both `vi.mock` `probeCheckoutSession` outright, and the full
suite is now measurably key-independent (below).

## The Fix

One file, 46 insertions:

1. **`HARNESS_SECRET` + `vi.stubEnv("PAYMONGO_SECRET_KEY", …)` in `beforeEach`.** The credential is
   declared by the spec, never inherited. The file's existing `vi.unstubAllEnvs()` in `afterEach` restores
   whatever the environment actually had, so no other spec in the worker sees the value — proven by the
   whole-suite runs below.
2. **Request-count assertions on (3), (4), (5)** — see above.
3. **Case (6) documents its override** of that default.
4. **The header's wrong sentence rewritten**, with the reason it was wrong recorded in place, since the
   claim is exactly what a future reader would otherwise re-derive.

## Verification

| Command | Result |
|---|---|
| `PAYMONGO_SECRET_KEY= npx vitest run tests/booking/checkout-probe.test.ts` (secret **absent** — CI) | **13 passed**, tests 3.06s |
| `npx vitest run tests/booking/checkout-probe.test.ts` (secret **present** — this machine) | **13 passed**, tests 3.05s |
| `npm test` (secret **present**) | **156 files passed \| 1 skipped**, **1516 passed \| 4 skipped** |
| `PAYMONGO_SECRET_KEY= npm test` (secret **absent** — full CI simulation) | **156 files passed \| 1 skipped**, **1516 passed \| 4 skipped** |
| `npx eslint tests/booking/checkout-probe.test.ts` | clean |
| `npx tsc --noEmit` | clean |

The two whole-suite runs are **identical**, which is the real claim: no spec in this repository now has a
key-dependent outcome. The per-file duration moving from **32ms → 3.05s** is the positive evidence that
case (7)'s 3-second deadline is genuinely firing rather than being skipped.

CI reported 1514 passed + 2 failed = 1516; the suite is now 1516 passed.

## Constraints Honoured

- **No test skipped, `.skip`-ed, `.todo`-ed or conditionally guarded.** Every case runs in both
  environments; three of them now assert strictly more than before.
- **No assertion weakened.** Case (7) still proves an `AbortSignal` reaches `fetch` and that a hung
  provider yields `null`; case (1) still proves the widened state carries the rail (`qrph`) and the
  paid-at instant.
- **`src/lib/payments/checkout-probe.ts` untouched** (`git diff --name-only -- src/` → 0 files). The
  no-request-without-a-secret behaviour is correct and load-bearing for D-35.
- **No secret added to any workflow** (`git diff --name-only -- .github/` → 0 files). The harness value is
  a literal in a test file and deliberately not key-shaped; CI still needs no `sk_test_`.
- **`drizzle/` untouched**, still ending at `0025_audit_resolved_by.sql`.

## Deviations from Plan

None — this is gap-closure work with a single stated objective, executed as stated.

One environment deviation worth recording for the next person: **Docker Desktop 4.81 would not start on
this machine**, crashing at boot with `initializing Inference manager: … remove
C:/Users/Admin/AppData/Local/Docker/run/dockerInference: The file cannot be accessed by the system`, then
with the same error for `…/docker-secrets-engine/engine.sock`. These are dangling AF_UNIX socket entries
left by an earlier crash: they list as `-????????? ?` and cannot be deleted by `del` or `rm` (the path
itself is rejected as invalid). **Each failed start recreates one**, so cleaning only the socket named in
the last crash loops forever. The fix is to kill every `Docker Desktop` / `com.docker.*` process and
rename **both** parent directories in one pass before restarting — Docker recreates them clean.
`npm run db:up` then works normally.

## Known Stubs

None.

## Notes For Later

The end-of-run `[test-db] LEAKED WRITES` report (2 `public.audit` rows, `action=guest-email` and
`action=notify`) is pre-existing, documented in `vitest.config.ts`, and out of scope here — it is a
containment report, not a failure, and it appeared identically before this change.

## Self-Check: PASSED

- `tests/booking/checkout-probe.test.ts` — FOUND, modified, committed
- `.planning/phases/13-confirmation-bookings-trust/13-17-SUMMARY.md` — FOUND
- Commit `145845b` — FOUND in `git log`
