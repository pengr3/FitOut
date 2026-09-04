---
phase: quick-260812-usm
plan: 01
subsystem: auth
tags: [security, open-redirect, cwe-601, url-parsing, next-router, vitest]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    provides: the security audit that found SEC-01 and disputed T-10-29
provides:
  - Output-side rejection in the `?callbackURL` guard — the returned value is checked in its own right before it leaves
  - Seven dot-segment attack vectors pinned, watched RED against the unmodified guard first
  - T-10-29 re-underwritten from `accept` to `mitigate` with a file:line citation
affects: [phase-11, gsd-secure-phase-10, auth, login]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard the OUTPUT of a sanitiser, not only its input, whenever the caller re-parses the returned value"
    - "Re-run the caller's own operation as the check, rather than a prefix that approximates it"
    - "A regression test is not one until its red run has been observed and recorded in the file itself"

key-files:
  created: []
  modified:
    - src/lib/safe-callback-url.ts
    - tests/security/safe-callback-url.test.ts
    - .planning/phases/10-design-system-foundation-theme-runtime/10-SECURITY.md

key-decisions:
  - "Two rejections, not one: the `//` prefix check names the finding, but the re-resolution against the origin is the load-bearing half because one prefix is only one spelling"
  - "The login route was NOT edited — the guard has exactly one importer and the defect was wholly inside the module; re-editing that route is what put T-10-29 into dispute"
  - "T-10-29 moved to `mitigate` rather than re-worded — its acceptance basis was the exact claim SEC-01 disproved"
  - "`status: blocked` left standing in 10-SECURITY.md; re-issuing the verdict is `/gsd-secure-phase 10`'s job"
  - "Test and fix shipped in ONE commit so no commit on `dev` has a red tree; the red run is preserved as recorded evidence in the test header, this repo's established convention"

patterns-established:
  - "Throwaway root vitest config for DB-free single-file runs, deleted before lint/tsc so it never faces either"

requirements-completed: [SEC-01, T-10-29]

# Metrics
duration: 18min
completed: 2026-08-12
---

# Quick 260812-usm: Close SEC-01 — the residual post-auth open redirect

**The origin check was never the defect — the escape rode out on the RETURN, so the guard now rejects an authority-shaped candidate and re-resolves what it is about to hand back, with seven dot-segment vectors pinned by assertions that were watched failing against the unmodified guard first.**

## Performance

- **Duration:** ~18 min
- **Tasks:** 3/3
- **Files modified:** 3
- **Commits:** 2 (`e6180a0` code, `459f0b2` docs)

## Accomplishments

### Task 1 — the RED observation (the whole point of the ticket)

The throwaway runner behaved exactly as the plan's recipe promised: `vitest.sec.tmp.config.ts` at
the repo root, no `globalSetup`, no `setupFiles`, `@` → `./src`, `include` pinned to the one file.
It ran the **unmodified** test file GREEN at **9 passed in 332ms** with no Postgres — which is the
control that makes the red below attributable to the new cases rather than to the runner.

The new `it()` block asserts the mechanism before it asserts the guard: `new URL("/..//evil.com",
ORIGIN).origin` **is** `ORIGIN` (so the origin check at `:101` is genuinely satisfied and is not
what was missing), its `.pathname` **is** `//evil.com`, and `new URL("//evil.com", ORIGIN).origin`
**is** `https://evil.com`. It then records the tightening: the pre-WR-12 prefix guard returned
`/..//evil.com` verbatim, asserted rather than claimed.

**Observed RED, verbatim** (`npx vitest run --config vitest.sec.tmp.config.ts`, guard at `8b9db10`,
untouched):

```
 ❯ tests/security/safe-callback-url.test.ts (10 tests | 2 failed) 20ms
     × SEC-01 — rejects the DOT-SEGMENT bypass that made the RETURNED pathname an authority 10ms
     × works on a localhost origin with a port, which is every developer's session 1ms

 FAIL  tests/security/safe-callback-url.test.ts > WR-12 — the guard rejects everything that leaves the origin > SEC-01 — rejects the DOT-SEGMENT bypass that made the RETURNED pathname an authority
AssertionError: "/..//evil.com": expected '//evil.com' to be '/' // Object.is equality

Expected: "/"
Received: "//evil.com"

 ❯ tests/security/safe-callback-url.test.ts:62:72

 FAIL  tests/security/safe-callback-url.test.ts > WR-12 — the guard preserves every legitimate relative callback > works on a localhost origin with a port, which is every developer's session
AssertionError: expected '//evil.com' to be '/' // Object.is equality

Expected: "/"
Received: "//evil.com"

 ❯ tests/security/safe-callback-url.test.ts:149:72

 Test Files  1 failed (1)
      Tests  2 failed | 8 passed (10)
   Duration  347ms

EXIT=1
```

This is recorded in the test file's own header at `tests/security/safe-callback-url.test.ts:19-66`,
so the claim is auditable from the repository rather than from this SUMMARY.

**Where the red is, is the diagnosis.** Inside the SEC-01 block the three URL-parser assertions
*above* the loop all passed — the failure is at the loop's first vector. The origin comparison was
satisfied; the escape was in the returned string. That localises the defect to the OUTPUT and is
why the fix does not add another input prefix.

### Task 2 — the fix

`src/lib/safe-callback-url.ts` only. The `!raw.startsWith("/")` early return and the
`target.origin !== self.origin` check are byte-identical to before; both additions are rejections.

- `:103` — the return value is computed into a local so it can be checked before it leaves.
- `:107` — **first rejection**: a candidate beginning with `//` is refused. Names the finding.
- `:115` — **second rejection, load-bearing**: the candidate is re-resolved against `origin` inside
  a try/catch that also refuses on a throw. This runs *the caller's own operation* —
  `new URL(value, origin)` is exactly what `router.push()` causes at `login/page.tsx:99` — so it
  answers the real question instead of the nearest proxy. The catch is not decorative: `/..//`
  produces `//`, which throws on re-parse with an empty host.
- `:35-66` — the module header gains a SEC-01 section: what the hole was, that WR-12 did not
  introduce it, the chain to `isExternalURL` → hard navigation, and that the social leg has an
  independent vendor backstop (`better-auth` trusted-origins → 403 `INVALID_CALLBACK_URL`) while
  `router.push` has none, which is why that leg was the exploitable one. Written descriptively
  where it refers to the guarded shapes, so a future grep-based criterion cannot count it.

**Observed GREEN**, same command: `Test Files 1 passed (1)` · `Tests 10 passed (10)` · 367ms ·
`EXIT=0`. Both previously-red blocks pass; the "does not newly ACCEPT anything the old guard
rejected" test and the entire "preserves every legitimate relative callback" describe were left
unmodified and stayed green throughout — that is the regression wall, and it never moved.

### Task 3 — 10-SECURITY.md

T-10-29 moved `accept` → `mitigate` and out of the Open table into Closed (now 50 rows, verified by
count). Re-wording the acceptance was not available: its basis — "the edits are class strings only
… no auth path changes" — is precisely what SEC-01 disproved, so keeping `accept` would have meant
asserting the disproved thing. The surviving true half is kept: `(auth)/signup/page.tsx` really is
two class strings plus a comment.

SEC-01's reproduction table and exploit chain are kept **verbatim** — they are the record — with a
`Fixed` subsection appended and the Remediation paragraph re-read as discharged rather than
outstanding. Frontmatter `threats_open: 1 → 0`, `threats_closed: 49 → 50`, dispositions corrected
`29/21 → 30/20`, Sign-Off box ticked, audit-trail row added for 2026-08-12 naming `e6180a0`.

`status:` is **still `blocked`**, the BLOCKED verdict wording still stands, and both carry an
explicit note that the two blocking items are discharged but the verdict is `/gsd-secure-phase 10`'s
to re-issue. W-1, W-2 and W-3 untouched.

## Verification

| Check | Result | Baseline |
|---|---|---|
| Security file, RED at Task 1 | **EXIT=1**, 2 failed / 8 passed of 10 | non-zero exit required |
| Security file, GREEN at Task 2 | **EXIT=0**, 10 passed | 10 passed |
| `npm run test:design` | **21 files / 449 passed**, 10.03s | 21 / 449 — unmoved |
| `npx tsc --noEmit` | **exit 0**, no output | clean — unmoved |
| `npm run lint` | **0 errors, 9 warnings** | 0 / 9 — unmoved, byte-identical warning list |
| `vitest.sec.tmp.config.ts` deleted | confirmed absent from `git status --porcelain` | required |
| Working tree | only `scope.tmp.txt` + this quick-task dir untracked | as at start |

`npm test` was NOT run — it requires a provisioned Postgres this box does not have. `npm run
test:e2e` was NOT run: the change is confined to one pure function with a single importer, and the
login route file is not edited.

## Deviations from Plan

**None affecting behaviour.** Every predicted number came out exactly as written for once — 9
passed on the pre-change runner, 2 failed / 8 passed of 10 at RED, 10 passed at GREEN, 21/449
design, 0 errors / 9 warnings. Worth stating plainly given this codebase's record of plans
predicting the wrong counts: this plan's predictions were all correct.

Three additions the plan did not spell out, none of them scope changes:

1. **A green control run before the red one.** The throwaway config was run against the *unmodified*
   test file first (9 passed) so that the subsequent red is provably the new assertions and not a
   misconfigured runner. A red run with no green control cannot distinguish the two.
2. **A note in the test header that the recorded `:62` / `:149` line numbers pre-date the header
   block itself.** The verbatim output is left un-rebased on purpose — the point of the record is
   that it is an observation, not a reconstruction — but an unexplained off-by-45 would send a
   future reader chasing the wrong lines.
3. **Two consistency edits in 10-SECURITY.md the plan's three bullets did not name**: the register's
   disposition tally (`mitigate 29, accept 21` → `30 / 20`, since T-10-29 changed disposition) and
   the Accepted Risks Log's T-10-29 row (which said "NOT accepted" pointing at an Open table that no
   longer exists). Leaving either would have made the document contradict itself.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change — the only source
edit is three rejections and a comment block inside an existing pure function.

## Notes for Future Work

- **The end-to-end claim is still not browser-verified.** The exploit chain was traced through
  installed source, not driven through a live Chromium, and this ticket did not change that. The fix
  is a pure function with an exhaustive attack list, which is the layer where it is testable; a
  Playwright spec driving `/login?callbackURL=…` would close the last gap.
- **`/gsd-secure-phase 10` still owns the verdict.** `threats_open` is 0 and both blocking items are
  discharged, but nothing here sets `status: verified`.
- **W-2 is vindicated, not closed.** The audit's warning — that a security-critical auth-path module
  was created during phase 10 with no register entry and no Threat Flag — is exactly the gap SEC-01
  fell through. The fix does not address the process hole that let it.

## Self-Check: PASSED

- `src/lib/safe-callback-url.ts` — FOUND, contains `startsWith("//")` at `:107`
- `tests/security/safe-callback-url.test.ts` — FOUND, contains `/..//evil.com` and the recorded RED
- `.planning/phases/10-design-system-foundation-theme-runtime/10-SECURITY.md` — FOUND,
  `threats_open: 0`, `status: blocked`, T-10-29 in the Closed table as `mitigate`
- Commit `e6180a0` — FOUND (2 files: guard + test, no deletions)
- Commit `459f0b2` — FOUND (1 file: 10-SECURITY.md)
- `vitest.sec.tmp.config.ts` — CONFIRMED ABSENT
