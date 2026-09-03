---
phase: quick-260805-ir9
plan: 01
subsystem: auth
tags: [auth, middleware, session, cookies, better-auth, lockout, regression-test]
status: awaiting-human-verification
requires:
  - better-auth 1.6.14 (deleteSessionCookie, auth.handler, $context.authCookies)
  - next 16.2 (middleware, route handlers, NextResponse)
provides:
  - "/auth/session-check — the authoritative stale-cookie self-heal endpoint"
  - "src/lib/session-check.ts — shared Edge-safe constants + open-redirect guard + handler body"
  - "middleware delegation instead of an optimistic terminal bounce"
affects:
  - src/middleware.ts
  - "every logged-out-only route (/login, /signup) for a cookie-bearing visitor"
tech-stack:
  added: []
  patterns:
    - "middleware DEFERS to a Route Handler rather than deciding from cookie presence"
    - "auth.handler (routed) over auth.api.getSession (direct) when Set-Cookie must reach the browser"
    - "non-200 from the auth layer is treated as NOT authoritative — never clear on uncertainty"
key-files:
  created:
    - src/lib/session-check.ts
    - src/app/auth/session-check/route.ts
    - tests/auth/stale-session-selfheal.test.ts
    - tests/auth/login-reachable-after-reset.test.ts
    - e2e/stale-session-selfheal.spec.ts
  modified:
    - src/middleware.ts
decisions:
  - "Middleware delegates to /auth/session-check instead of deleting the bounce (user's explicit choice at review; also self-heals expired sessions, admin revocation and rotated secrets)"
  - "The clearing runs through auth.handler, NOT auth.api.getSession — measured: the direct call loses Max-Age=0 to the nextCookies() store replay"
  - "_sc is a forgeable query-param loop guard, checked before the cookie, accepted because the bounce is UX and not a boundary"
  - "A non-200 from the auth layer takes the degraded path: never clear a cookie we are not sure about"
metrics:
  tasks-completed: 2 of 3 (Task 3 is a blocking human checkpoint)
  commits: 5
  duration: ~50m
  completed: 2026-08-05
---

# Quick 260805-ir9: Post-Reset Lockout Self-Heal Summary

A stale session cookie now self-heals: middleware defers to `/auth/session-check`, which runs the
authoritative session read and returns Better Auth's own cookie-expiring headers on a redirect back
to `/login` — so a password reset can no longer lock a user out of the login page for 30 days.

## Status: Tasks 1-2 COMPLETE — Task 3 AWAITING HUMAN VERIFICATION (blocking)

Task 3 is a `checkpoint:human-verify` gate. Its required automated half
(`e2e/stale-session-selfheal.spec.ts`) is written and **passing**. The human half has **not** been
performed and is **not** claimed. Steps are at the bottom of this file.

## What Was Built

| Task | What | Commit |
| ---- | ---- | ------ |
| 1 (RED) | `tests/auth/stale-session-selfheal.test.ts` — 4 cases, real Postgres, real reset | `56a2044` |
| 1 (GREEN) | `src/lib/session-check.ts` + `src/app/auth/session-check/route.ts` | `aefb140` |
| 2 (RED) | `tests/auth/login-reachable-after-reset.test.ts` — Layer 1 + the loop closure | `c7d1c99` |
| 2 (GREEN) | `src/middleware.ts` rewritten to delegate | `acaebda` |
| — | Browser-driven correction: route via `auth.handler`; `e2e/stale-session-selfheal.spec.ts` | `3c25ace` |

The shipped journey:

```
GET /login (STALE cookie) -> middleware: 307 /auth/session-check?next=%2Flogin
                          -> handler: session is null -> 307 /login?_sc=1
                             + Set-Cookie: better-auth.session_token=; Max-Age=0
                          -> middleware: marker present (and no cookie) -> next()
                          -> /login renders. The locked-out user is free.

GET /login (VALID cookie) -> ... -> handler: session is a user -> 307 /   (no clearing at all)
GET /login (NO cookie)    -> middleware: next(). Zero hops, unchanged.
```

## The Deviation That Matters: the fix was wrong in a real browser, and only the browser said so

The plan's `<automated>` for Task 3 was corrected pre-dispatch to REQUIRE a persistent-context
Playwright spec. That requirement paid for itself immediately.

**On its first run the e2e spec FAILED — while all 11 in-process assertions were green.**

```
Error: expect(received).toBeUndefined()
Received: ""
  > 135 |   expect(await sessionCookieValue(page)).toBeUndefined();
```

The browser was left holding a **zombie** `better-auth.session_token` — present, empty-valued, never
deleted. Probing the live server showed why:

```
=== STALE COOKIE ===   (before the fix)
    "better-auth.session_token=; Path=/; HttpOnly; SameSite=lax"      <- Max-Age=0 GONE
    "better-auth.session_data=; Path=/; HttpOnly; SameSite=lax"
    "better-auth.dont_remember=; Path=/; HttpOnly; SameSite=lax"
=== BAD SIGNATURE ===  (the explicit fallback path, via NextResponse.cookies)
    "better-auth.session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=lax"   <- correct
```

**Root cause.** `auth.api.getSession()` is a *direct server-API* call, so Better Auth's
`nextCookies()` after-hook treats it as having no HTTP response of its own and replays the
Set-Cookie through `next/headers` `cookies()`. Planning had measured that this replay is swallowed
in an RSC — but a **Route Handler is a writable cookie scope, so the replay SUCCEEDS**, and corrupts
the header on the way: `parseSetCookieHeader` (`cookie-utils.mjs:62`) maps `Max-Age=0` to the
**number 0**, and `cookies().set()` drops a **falsy** `maxAge`. Next then merges that request-scoped
store *over* the response. Measured: neither `headers.append("set-cookie", …)` nor
`NextResponse.cookies.set(…)` could win that merge.

**Fix (Rule 1).** Route through `auth.handler` instead. That goes via `better-call`'s router, which
sets `_flag: "router"` (`better-call/dist/router.mjs:70`) — exactly the flag the `nextCookies`
after-hook returns early on, because a routed call already carries its Set-Cookie on a real HTTP
response. Result: exactly ONE writer of Set-Cookie, and it is Better Auth's own header, verbatim:

```
=== STALE COOKIE ===   (after the fix)
    "better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
    "better-auth.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
    "better-auth.dont_remember=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
```

This also removes a **test/prod divergence that was the reason the bug could hide**: the in-process
tests now take the same routed path production takes.

**Why the lockout was still "fixed" before this correction, and why that was not good enough.**
`getSessionCookie` returns the cookie value and treats `""` as falsy, so middleware passed the
request through anyway. The fix would have rested on a coincidence of truthiness, DevTools would
still have shown the cookie (failing the human check at step 7), and any future change to a
presence-based check would have silently restored the lockout.

### Other deviations

**[Rule 2 - Missing critical functionality] Non-200 is not authoritative.** Going through
`auth.handler` means the request now passes through the configured `rateLimit`. A 429 would have
parsed as "no user" and cleared a **live** user's cookie — a self-inflicted forced-logout under
load. The handler now takes the degraded path (redirect, no clearing) on any non-200. Found while
reasoning about the `auth.handler` switch, fixed in the same commit.

**[Deviation from the plan's step 6, resolved back to the plan]** An intermediate attempt made the
explicit expiry unconditional and applied it to every clearing cookie. Once `auth.handler` removed
the corruption at its source, that was reverted to the plan's original semantics: the explicit
fallback fires **only** when Better Auth emitted no session-token header (the measured
bad-signature / rotated-secret path).

## Mutation Testing — all three executed, verbatim, and re-run against the shipped code

> Predictions are hypotheses. Recorded below is what was OBSERVED. Both divergences are recorded
> rather than smoothed over. Every mutation was restored by **editing the file back**, never via git
> (`git diff --exit-code` is blind to untracked files; `git add -N` pins an empty index baseline and
> makes `git checkout --` truncate to 0 bytes — both verified empirically in this repo). The green
> re-run is the restore evidence.

**MUTATION 1** — restore the old terminating line in `src/middleware.ts`
(`return NextResponse.redirect(new URL("/", request.url))`). *Predicted: "the Layer 1 cases and case
6 RED".*

```
OBSERVED — Tests  5 failed | 2 passed (7)
  × case 1: a cookie-bearing /login request is sent to the verifier, NOT to /
    AssertionError: expected '/' to be '/auth/session-check' // Object.is equality
    Expected: "/auth/session-check"
    Received: "/"
     ❯ tests/auth/login-reachable-after-reset.test.ts:142:32
  × case 2: the post-reset ?reset=1 notice survives the delegation hop
    AssertionError: expected null to be '/login?reset=1' // Object.is equality
     ❯ tests/auth/login-reachable-after-reset.test.ts:150:54
  × case 5: /signup delegates identically                      ❯ ...:168:32
  × case 6: middleware -> session-check -> browser jar -> middleware, in one process   ❯ ...:191:28
  × case 6b (constraint 4): the same journey with a VALID session still ends at /      ❯ ...:235:27
```

**DIVERGENCE:** not every Layer 1 case went red. Cases 3 (no cookie) and 4 (loop guard) stayed
GREEN because neither reaches the delegation line. That is the correct blast radius, and a useful
negative result: case 4 alone would **not** have caught the shipped bug, so it is not redundant with
case 1 — it guards a different failure (`ERR_TOO_MANY_REDIRECTS`).

**MUTATION 2** — delete the `for (const c of emitted) out.headers.append("set-cookie", c)` loop.
*Predicted: case 1 RED, "possibly 3".*

```
OBSERVED — Tests  1 failed | 3 passed (4)
  × case 1 (THE BUG): a stale session cookie is cleared and the user is sent back to /login
    AssertionError: expected undefined not to be undefined
     ❯ tests/auth/stale-session-selfheal.test.ts:173:25
```

**DIVERGENCE:** case 3 stayed GREEN. Better Auth's forwarded header carries case 1; the explicit
fallback carries case 3. They cover disjoint paths and neither substitutes for the other — which is
precisely why both exist.

**MUTATION 3** — drop the `signedIn ? "/" :` condition so the redirect target is always `target`.
*Predicted: case 2 RED.*

```
OBSERVED — Tests  1 failed | 3 passed (4)
  × case 2 (CONVERSE, constraint 4): a VALID session is still bounced to / and is NOT cleared
    AssertionError: expected '/login' to be '/' // Object.is equality
    Expected: "/"
    Received: "/login"
     ❯ tests/auth/stale-session-selfheal.test.ts:193:38
```

Constraint 4 is held by CODE, not by luck.

**What no in-process mutation can catch — stated plainly.** Reverting `auth.handler` to
`auth.api.getSession` leaves **all 11** in-process assertions green while shipping a broken cookie
clear. Only `e2e/stale-session-selfheal.spec.ts` fails. That is recorded in both spec headers.

## Verification

| Gate | Result |
| ---- | ------ |
| `npx tsc --noEmit` | **0** |
| `npm run build` | **0** — `/auth/session-check` registered (ƒ); Edge middleware bundle clean |
| `npx vitest run` (new specs) | **11 passed** (4 + 7) |
| `npx playwright test e2e/stale-session-selfheal.spec.ts` | **1 passed** |
| `npx vitest run` (full) | **1121 passed / 2 failed / 4 skipped** — see below |
| edge-safe-imports / no-session-creation / route-wired | 0 / 0 / 0 |
| middleware-delegates / middleware-db-free | 0 / 0 |
| `git diff --exit-code src/lib/auth.ts` | **0** — constraint 2 intact |
| other tracked `src/` files modified | **0** |
| pre-existing `e2e/` or `tests/` specs touched | **0** |
| files deleted since pre-dispatch | **0** |

### Full-suite totals — OBSERVED, and they do not match the stated baseline

Stated baseline: 1112 passed / 4 skipped / **0 failures**. Observed: **1121 passed / 2 failed / 4
skipped (1127)**. 1112 + 11 new = 1123 non-skipped, of which 2 fail.

The 2 failures are in `tests/booking/hold-expiry.test.ts`, **which this plan does not touch and which
does not import anything this plan changed**. It is a hardcoded-date time bomb that expired on
2026-08-02: the file pins its slot to `2026-08-02T22:00Z` and uses **no fake timers**, so the
production lead-time guard now rejects it (`"That start time is too soon to book. Pick a time at
least half an hour out."`). It fails identically in isolation. Per the scope boundary it was **logged,
not fixed** — see `deferred-items.md` (DEF-IR9-01). The stated baseline cannot hold on any run dated
after 2026-08-02.

## Constraints — all five intact

1. **Middleware not authoritative, no DB.** Gated (`middleware-db-free:0`). It only DEFERS.
2. **`revokeSessionsOnPasswordReset: true` untouched.** `git diff --exit-code src/lib/auth.ts` = 0.
3. **No session created anywhere.** Gated by comment-stripped grep; the only cookie mutation is an expiry.
4. **The bounce still works for a VALID session.** Task 1 case 2, Task 2 case 6b, e2e assertion (c);
   mutation 3 proves it is held by code.
5. **Scope is the lockout only.** No sign-out added; no page under `src/app/` changed; all 15
   existing `redirect("/login")` gates byte-unchanged.

## Known Stubs

None.

## Threat Flags

None. No new network surface beyond `/auth/session-check`, which is in the plan's threat register
(T-IR9-01..06). One register entry is worth re-reading with the shipped code: T-IR9-03 (DoS) noted
the endpoint costs zero queries without a validly-signed token. Still true — and it is now
additionally covered by the configured `rateLimit`, since the call routes through `auth.handler`.

## Self-Check: PASSED

All five created files exist on disk; all five commits exist in `git log`. Verified below.

---

# TASK 3 — BLOCKING HUMAN CHECKPOINT (not performed, not self-approved)

**Automated half: DONE.** `npx playwright test e2e/stale-session-selfheal.spec.ts` → 1 passed. It
drives ONE persistent context across signup → reset → /login → sign-in and asserts (a) the post-reset
landing is /login with the form, (b) `better-auth.session_token` is gone from the real cookie jar,
(c) a valid session is still bounced to / and survives, (d) no redirect loop.

**Human half: PENDING.** Steps below. The dev server is already running on http://localhost:3000
(it survived both builds).

Use a THROWAWAY account, NOT the seeded `host@fitout.test`.

1. Sign up at http://localhost:3000/signup with e.g. `ir9probe@example.com` / a 10+ char password.
2. Visit `/profile` — it should render, not redirect.
3. In the SAME browser, go to `/forgot-password` and submit `ir9probe@example.com`.
4. **Get the reset token from Postgres — do NOT wait for an email.**

   > **Correction to the plan's step 4.** The plan said `.env.local` has no `RESEND_API_KEY` so the
   > email is only logged (`[email:dev]`). **That is out of date: `RESEND_API_KEY` IS set and real
   > mail is sent.** But Resend's shared `onboarding@resend.dev` sender only delivers to the Resend
   > account owner's own address, so a throwaway `@example.com` recipient **422s and no email will
   > ever arrive**. `sendResetPassword` is fire-and-forget (`void`, Pitfall 4), so the token is
   > stored regardless. Read it the way `e2e/password-reset.spec.ts:29-45` does:

   ```sql
   SELECT v.identifier
   FROM "verification" v JOIN "user" u ON u.id = v.value
   WHERE u.email = 'ir9probe@example.com'
     AND v.identifier LIKE 'reset-password:%'
     AND v.expires_at > now()
   ORDER BY v.created_at DESC LIMIT 1;
   ```

   The token is the part after `reset-password:`.
5. Open `/reset-password?token=<token>` in that SAME browser and set a new password.
6. **THE FIX.** You should land on `/login?reset=1&_sc=1` with the login form and the green
   "Password updated — please sign in." notice. Confirm the URL bar shows **/login and NOT /**.
7. DevTools → Application → Cookies → localhost:3000. `better-auth.session_token` should be **GONE**
   (not present-with-an-empty-value — that empty-value state was a real bug found and fixed today).
8. Log in with the NEW password. It should work and land you on `/`.
9. **Constraint 4.** Holding a VALID session, type `http://localhost:3000/login`. You should be
   bounced to `/`. Then visit `/profile` and confirm you are STILL logged in.
10. **No loop.** Through steps 6 and 9, no `ERR_TOO_MANY_REDIRECTS`, and each navigation settles in
    one or two hops (Network tab, "Preserve log" on).
11. **Logged-out sanity.** In an incognito window, go to `/login`. It should render immediately with
    NO redirect hop (a single 200).

**Resume signal:** type "approved", or paste the URL you landed on at step 6, the cookie state at
step 7, and what happened at steps 9-10.

**Note on latency, so it is not later read as a bug.** A user holding a VALID session who navigates
to `/login` now costs 2 redirects / 1 DB read instead of 1 / 0. That is the accepted price of keeping
the bounce (deleting it outright was considered and explicitly declined). It is correctly scoped:
`config.matcher` stays `["/login", "/signup"]`, and a logged-out visitor still reaches `/login` in a
single 200 with no hop.
