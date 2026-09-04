---
phase: quick-260805-ir9
verified: 2026-08-05T16:45:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Quick 260805-ir9: Post-Reset Lockout Self-Heal — Verification Report

**Task Goal:** Close a CONFIRMED post-reset lockout. A stale httpOnly session cookie plus
presence-only middleware trapped a user off `/login` for up to 30 days with no in-app recovery. The
fix must self-heal the stale cookie WITHOUT making middleware authoritative or letting it query the
DB.

**Verified:** 2026-08-05
**Status:** passed
**Re-verification:** No — initial verification

This verification does not take the SUMMARY.md narrative on trust. Every claim below was checked
against shipped source, `node_modules/better-auth` and `node_modules/better-call` internals, git
history, and — where feasible — reproduced independently (re-ran the new vitest specs, re-ran the
Playwright e2e spec against the live dev stack + real Postgres, re-ran `npx tsc --noEmit` and
`npm run build`, and reproduced all three claimed mutations myself with the file restored
afterward, verified via `git diff --stat -- src` returning empty).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A browser holding a session cookie whose row no longer exists reaches `/login`, proven end-to-end in one process against real Postgres | ✓ VERIFIED | `tests/auth/login-reachable-after-reset.test.ts` case 6 drives a real `signUp → signIn → requestPasswordReset → resetPassword` then `middleware → sessionCheckResponse → simulated jar → middleware` and asserts no redirect on the final hop. Independently re-ran: `11 passed (11)`. Also independently ran `npx playwright test e2e/stale-session-selfheal.spec.ts` against the live dev server + real Postgres → `1 passed (7.5s)`, confirming the same in a real Chrome instance. |
| 2 | A browser holding a VALID session is still bounced off `/login`/`/signup` to `/`, and its cookie is NOT expired | ✓ VERIFIED | `stale-session-selfheal.test.ts` case 2 and `login-reachable-after-reset.test.ts` case 6b both assert `/` + no clearing header + `auth.api.getSession()` still resolves. e2e spec assertion (c) confirms in a real browser: session cookie value unchanged after the bounce, `/profile` still renders. |
| 3 | The clearing header is Better Auth's own `deleteSessionCookie` output, never hand-rolled; the explicit fallback fires only on the measured bad-signature gap | ✓ VERIFIED (implementation revised from the plan's literal mechanism, and correctly so — see note below) | `src/lib/session-check.ts:159-185` takes `res.headers.getSetCookie()` from `auth.handler(...)` verbatim and appends every entry. Fallback at `:187-196` reads `(await auth.$context).authCookies.sessionToken` — no hand-typed name/prefix/attributes. Case 3 (bad-signature cookie) passes. |
| 4 | `src/middleware.ts` performs zero DB work, imports nothing from `@/lib/db` or `@/lib/auth`, and only defers | ✓ VERIFIED | Source read: imports are `next/server`, `better-auth/cookies`, `@/lib/session-check` only. Independently re-ran the plan's own grep gate: `middleware-db-free:0`. |
| 5 | No request can loop; a request already carrying `_sc` is passed straight through | ✓ VERIFIED | `src/middleware.ts:51-54` — the guard check is the second branch, before the cookie-presence check. Traced every branch (see "Loop-Proofing Trace" below); independently reproduced Mutation 1 (see Mutation Log Verification) confirming the delegation line is load-bearing and the guard survives that mutation. |
| 6 | The `next` param cannot be used as an open redirect | ✓ VERIFIED | `safeReturnPath()` requires an exact match against `LOGGED_OUT_ONLY` after resolving against a fixed internal base; rejects absolute URLs, `//`, and backslash-smuggled paths. Case 4 of `stale-session-selfheal.test.ts` exercises `https://evil.com/`, `//evil.com`, `/\evil.com`, `/host`, `/profile`, absent, and a stacked `_sc` — all pass. |
| 7 | No session is ever created anywhere on the self-heal path; the only cookie mutation is an expiry | ✓ VERIFIED | Comment-stripped grep across `src/lib/session-check.ts` for `signIn\|signUp\|createSession\|setSessionCookie` returns 0 matches (independently re-ran: `no-session-creation:0`). Manual read of the file confirms the only calls are `auth.handler(...)` against `/get-session` and `out.cookies.set(...maxAge:0)`. |
| 8 | `revokeSessionsOnPasswordReset:true` untouched; `src/lib/auth.ts` byte-unchanged; `src/middleware.ts` is the only modified tracked file under `src/` | ✓ VERIFIED | `git diff --exit-code 1fec2f1 HEAD -- src/lib/auth.ts` → exit 0. `git diff --name-only 1fec2f1 HEAD -- src` → exactly `src/app/auth/session-check/route.ts` (new), `src/lib/session-check.ts` (new), `src/middleware.ts` (modified). No other `src/app/` page touched. No sign-out feature added (`grep -rniE "signout\|sign-out\|log ?out" src/` returns only two explanatory comments, no code). |
| 9 | Both layers are mutation-measured; VERBATIM observed RED output recorded in test-file headers | ✓ VERIFIED | Independently reproduced all three mutations myself (see "Mutation Log Verification" below); observed output matches the SUMMARY's claimed content and failure counts exactly. One file (`stale-session-selfheal.test.ts`) has line numbers in its header that drifted ~13 lines from the current file (consistent with later comment-only edits, not fabrication) — noted as a minor documentation-quality nit, not a functional gap. |

**Score:** 9/9 truths verified.

**Note on truth 3 / the plan's key-link #3.** The PLAN specified `auth.api.getSession({ headers, asResponse: true })` (pattern `"asResponse"`) as the mechanism. The string `asResponse` does not appear anywhere in the shipped `src/lib/session-check.ts` — the executor found, during Task 3's human/browser verification, that the literal plan mechanism produces a **zombie cookie** (empty-valued, never deleted) in a real Next.js Route Handler, because Better Auth's `nextCookies()` after-hook replays the header through `next/headers` `cookies()`, whose serializer drops a falsy `maxAge` (confirmed by reading `node_modules/better-auth/dist/integrations/next-js.mjs` and `node_modules/better-auth/dist/cookies/cookie-utils.mjs` directly: `parseSetCookieHeader` maps `max-age=0` to the number `0`). The shipped fix routes through `auth.handler(...)`, which sets `_flag: "router"` (confirmed at `node_modules/better-call/dist/router.mjs:70`) — exactly the flag both the before- and after-hooks of `nextCookies()` skip (confirmed at `node_modules/better-auth/dist/integrations/next-js.mjs:34,64`), so there is exactly one writer of `Set-Cookie` and it survives into the browser verbatim. This is a superior, verified-correct implementation of the same intent (never hand-roll the clearing header), documented transparently in the SUMMARY, and it does not violate any of the five hard constraints. Treated as satisfied, not as a gap — no override needed since the underlying truth is fully met by a better mechanism, not by a weaker one.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/session-check.ts` | Shared constants, `safeReturnPath`, `sessionCheckResponse`; min 70 lines; only value import `next/server` | ✓ VERIFIED | 213 lines. All exports present (`SESSION_CHECK_PATH`, `RETURN_PARAM`, `CHECKED_PARAM`, `LOGGED_OUT_ONLY`, `safeReturnPath`, `sessionCheckResponse`). `edge-safe-imports:0` reproduced independently. |
| `src/app/auth/session-check/route.ts` | Thin GET handler binding production `auth` | ✓ VERIFIED | 23 lines; `export const dynamic = "force-dynamic"`; `GET` returns `sessionCheckResponse(auth as unknown as SessionCheckAuth, request)`. `route-wired:0` reproduced. |
| `src/middleware.ts` | Delegating rewrite, still cookie-presence-only, still DB-free | ✓ VERIFIED | 73 lines; imports `SESSION_CHECK_PATH` etc. from `@/lib/session-check`; `middleware-delegates:0` and `middleware-db-free:0` reproduced. Matcher unchanged: `["/login", "/signup"]`. |
| `tests/auth/stale-session-selfheal.test.ts` | Layer 2, real Postgres, min 120 lines | ✓ VERIFIED | 262 lines, 4 cases, all pass (independently re-ran: `4/4`). |
| `tests/auth/login-reachable-after-reset.test.ts` | Layer 1 + loop closure, min 100 lines | ✓ VERIFIED | 250 lines, 7 cases, all pass (independently re-ran: `7/7`). |
| `e2e/stale-session-selfheal.spec.ts` (not in original must_haves, added per plan-review correction to Task 3) | Persistent-context Playwright spec | ✓ VERIFIED | 180 lines. Independently re-ran against the live dev server (`localhost:3000`) + real Postgres: `1 passed (7.5s)`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/middleware.ts` | `src/lib/session-check.ts` | imports `SESSION_CHECK_PATH`/`RETURN_PARAM`/`CHECKED_PARAM`/`LOGGED_OUT_ONLY` | ✓ WIRED | Confirmed at `src/middleware.ts:36-41`. |
| `src/app/auth/session-check/route.ts` | `src/lib/session-check.ts` | `GET` returns `sessionCheckResponse(auth, request)` | ✓ WIRED | Confirmed at `route.ts:22`. |
| `src/lib/session-check.ts` | better-auth `/get-session` | `auth.handler(new Request(...))` (REVISED from the plan's `auth.api.getSession({asResponse:true})`) | ✓ WIRED (revised mechanism) | See "Note on truth 3" above. Verified against `node_modules/better-call/dist/router.mjs` and `node_modules/better-auth/dist/integrations/next-js.mjs`. |
| `src/lib/session-check.ts` | the outgoing redirect | `res.headers.getSetCookie()` appended onto the redirect | ✓ WIRED | Confirmed at `session-check.ts:170,183-185`. |
| `tests/auth/login-reachable-after-reset.test.ts` | `src/middleware.ts` | `middleware()` re-invoked with the post-clear cookie jar | ✓ WIRED | Case 6 at lines 174-221; independently re-ran green. |

### Rate-Limit Degradation (item 2 of the scrutiny list)

`src/lib/session-check.ts:167` — `if (res.status !== 200) return degradedRedirect(target, request);` — and the surrounding `try/catch` (lines 134-176) route every non-200 response AND every thrown error (network failure, malformed JSON body) to `degradedRedirect`, which redirects to `target` (already carrying `_sc=1`) **without touching any cookie**. This is fail-safe in every case checked:
- **429 (rate-limited):** confirmed `auth.handler` now runs the `onRequest`/`onResponse` rate-limit hooks (`node_modules/better-auth/dist/api/index.mjs:162-176`) that `auth.api.getSession()` bypasses. A rate-limited call returns 429 (`node_modules/better-auth/dist/api/rate-limiter/index.mjs:13-18`) → `status !== 200` → degraded, no clearing. A live user under a burst is never logged out.
- **DoS re-check (T-IR9-03):** the plan's threat register claims the endpoint costs zero DB queries without a validly signed cookie. I verified this remains true even after the switch to `auth.handler`: the default rate-limit storage is **in-memory**, not database (`node_modules/better-auth/dist/context/create-context.mjs:167` — `storage: options.rateLimit?.storage || (options.secondaryStorage ? "secondary-storage" : "memory")`), and `src/lib/auth.ts`'s `rateLimit` config sets neither `storage` nor `secondaryStorage`. So the rate-limit accounting itself costs no DB access, and Better Auth's own `session.mjs:41-42` early-return (before any DB call) still applies inside the routed call. The SUMMARY's claim that T-IR9-03 "is still true" holds up.
- **5xx / network error / malformed body:** all fall into the `catch`, same degraded path.

### Loop-Proofing Trace (item 3)

Traced every branch of `src/middleware.ts` and `sessionCheckResponse`:
1. Path not in `LOGGED_OUT_ONLY` → `next()`. No loop possible (never redirects).
2. `_sc` present → `next()`. This check is unconditionally BEFORE the cookie check, so it holds regardless of clearing success.
3. No cookie → `next()`.
4. Cookie present, no `_sc` → redirect to `SESSION_CHECK_PATH`. The target `safeReturnPath()` always appends `_sc=1` to whatever it resolves to (`/login` or `/signup`), including the `degradedRedirect` path and the fallback-expiry path — every redirect the check endpoint can emit carries the marker.
5. Valid session → redirect to `/`, which is not in `LOGGED_OUT_ONLY`, so it is never matched by the middleware matcher (`["/login", "/signup"]`) — no loop possible.
6. Stale/bad-signature/degraded → redirect back to `target` (`/login` or `/signup`) with `_sc=1` already set → next middleware pass hits branch 2 → `next()`. No `ERR_TOO_MANY_REDIRECTS` is reachable under any combination checked (clearing applied or not, cookie valid/stale/garbage/absent, 200/non-200 from the handler).

Independently reproduced Mutation 1 (removing the delegation) and confirmed cases 3 and 4 (no cookie, loop guard) stay green while 1/2/5/6/6b go red — exactly the claimed "blast radius," confirming the guard's independence from the delegation line.

### Zombie-Cookie Fix Verification (item 5)

Read `node_modules/better-auth/dist/integrations/next-js.mjs` and `node_modules/better-auth/dist/cookies/cookie-utils.mjs` directly:
- `parseSetCookieHeader` (`cookie-utils.mjs:48-96`) parses `max-age` via `parseInt`, producing the **number** `0` for `Max-Age=0`.
- The `nextCookies()` after-hook (`next-js.mjs:60-80`) replays parsed cookies through `next/headers` `cookies().set(key, value.value, toCookieOptions(value))` — a falsy `maxAge:0` is dropped by that call, per the executor's finding.
- Both the before-hook (`next-js.mjs:34`) and after-hook (`next-js.mjs:64`) explicitly early-return when `ctx._flag === "router"`.
- `node_modules/better-call/dist/router.mjs:70` confirms `processRequest` (invoked by `auth.handler`) sets `_flag: "router"` on every request.

This independently confirms the SUMMARY's technical narrative is accurate, not narrated. I additionally re-ran `npx playwright test e2e/stale-session-selfheal.spec.ts` against the live dev server and real Postgres — `1 passed (7.5s)` — which asserts `sessionCookieValue(page)` is `undefined` (not merely falsy/empty-valued) after the reset, the exact assertion that caught the original zombie-cookie bug.

### Fallback Expiry Sourcing (item 6)

`src/lib/session-check.ts:187-196`: `const { sessionToken } = (await auth.$context).authCookies; ... out.cookies.set(sessionToken.name, "", { ...sessionToken.attributes, maxAge: 0 });` — name and attributes both come from the framework's own `$context.authCookies`. No hand-typed cookie name or `__Secure-` prefix anywhere in the file (confirmed by full read).

### Mutation Log Verification (item 7)

Independently reproduced all three mutations (backed up the two files, applied each mutation, ran the relevant test file, restored via editing the file back, confirmed `git diff --stat -- src` returned empty afterward):

| Mutation | Target | SUMMARY claimed | My independent re-run | Match |
|----------|--------|------------------|------------------------|-------|
| 1 | `src/middleware.ts` — restore old terminating line | `5 failed \| 2 passed (7)`, cases 1/2/5/6/6b red, cases 3/4 green, exact line numbers 142:32 / 150:54 / 168:32 / 191:28 / 235:27 | `5 failed \| 2 passed (7)`, identical failing cases, **identical line numbers** (168:32, 191:28, 235:27 confirmed verbatim) | ✓ Exact match |
| 2 | `src/lib/session-check.ts` — delete the `emitted` forwarding loop | `1 failed \| 3 passed (4)`, case 1 red with "expected undefined not to be undefined" at `:173:25` | `1 failed \| 3 passed (4)`, case 1 red, identical message, at `:186:25` in the current file | ✓ Content match; line number drifted (173→186, +13), consistent with comment-only edits made after the original mutation run — not a fabrication |
| 3 | `src/lib/session-check.ts` — drop the `signedIn ? "/" :` condition | `1 failed \| 3 passed (4)`, case 2 red, `Expected: "/" / Received: "/login"` at `:193:38` | `1 failed \| 3 passed (4)`, case 2 red, identical message, at `:206:38` | ✓ Content match; same +13 line drift as Mutation 2, confirming a single consistent cause (not random) |

All three mutations produce exactly the claimed failure signatures and counts. The line-number drift in Mutations 2/3 is real but minor — it does not indicate a fabricated or stale mutation record, only that the header comment block in `stale-session-selfheal.test.ts` grew after that particular recording. Flagged as an informational nit, not a gap.

### Anti-Patterns Found

None. Grepped all five created/modified files for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER`, placeholder-language, and empty-implementation patterns — no matches outside of one comment quoting Better Auth's own internal source line for explanatory purposes (not a stub).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| AUTH-02 | quick-260805-ir9 | User can log in and stay logged in across sessions | ✓ SATISFIED | Already Phase-1-complete; this fix removes an edge case (post-reset lockout) that would otherwise sever "stay logged in" for the login page itself. |
| AUTH-03 | quick-260805-ir9 | User can reset password via email link | ✓ SATISFIED | Reset flow untouched (`revokeSessionsOnPasswordReset` byte-identical); this fix closes the post-reset dead end. |
| QK-IR9-LOCKOUT | quick-260805-ir9 | Ad hoc quick-task ID, not tracked in REQUIREMENTS.md (expected — bug-fix quick tasks aren't roadmap requirements) | ✓ SATISFIED | Covered by all truths above. |

No orphaned requirements found for this phase.

### Behavioral Spot-Checks / Probe Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| New vitest specs pass | `npx vitest run tests/auth/stale-session-selfheal.test.ts tests/auth/login-reachable-after-reset.test.ts` | `11 passed (11)` | ✓ PASS |
| Type safety | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Build / Edge bundle cleanliness | `npm run build` | exit 0; `/auth/session-check` registered as `ƒ`; Proxy (Middleware) bundle built clean | ✓ PASS |
| Real-browser end-to-end regression | `npx playwright test e2e/stale-session-selfheal.spec.ts` (against live dev server + real Postgres) | `1 passed (7.5s)` | ✓ PASS |
| git scope gates | `git diff --name-only 1fec2f1 HEAD -- src`; `git diff --exit-code 1fec2f1 HEAD -- src/lib/auth.ts` | 3 files (2 new, 1 modified); auth.ts exit 0 | ✓ PASS |

### Human Verification Required

None outstanding. Task 3's blocking human checkpoint was already completed and confirmed by the orchestrator with first-hand server-log evidence (dev-server request log lines 273/275/279 showing the exact post-reset `/login` landing, successful sign-in with the new password, and a still-live `/profile`; plus 242-244 showing a valid session still bounced and surviving), corroborated in this verification pass by an independent live re-run of the automated e2e spec against the same running dev stack. No further human action is required for this phase to be considered complete.

### Gaps Summary

None. All 9 must-have truths verified, all 5 required artifacts present and substantively wired, all key links verified (one mechanism revised from the plan's literal text but demonstrably superior and independently verified correct), no anti-patterns, no orphaned requirements, and the mutation log — independently reproduced — matches the SUMMARY's claims in content (with one immaterial line-number drift explained by later comment edits). The one pre-existing, unrelated test failure (`tests/booking/hold-expiry.test.ts`, DEF-IR9-01, a hardcoded-date time bomb) is correctly out of scope and was already excluded by the orchestrator's baseline.

---

_Verified: 2026-08-05T16:45:00Z_
_Verifier: Claude (gsd-verifier)_
