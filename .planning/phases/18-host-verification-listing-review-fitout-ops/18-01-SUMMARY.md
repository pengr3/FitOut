---
phase: 18-host-verification-listing-review-fitout-ops
plan: 01
subsystem: auth
tags: [better-auth, rbac, staff, drizzle, audit, cli, next-16, notfound, postgres]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: "the dead `role` additionalField on `user` (input:false) and the nullable `role` column"
  - phase: 08-money-observability
    provides: "the `audit` table, `recordAudit`'s deliberate swallow, and the ops-CLI shape (scripts/ops-alerts.ts, src/lib/ops/*)"
provides:
  - "`requireStaff()` — the one server-side staff gate every ops page and ops server action calls (OPS-02)"
  - "`readStaff()` — the single cache()'d expression the whole phase resolves staffness through"
  - "`assertStaff()` — the layout-level 404-status-line layer that says at its own site that it is NOT the security boundary"
  - "`src/lib/ops/grant.ts` — grantStaff/revokeStaff/listStaff/parseGrantArgs over an injected DbConn"
  - "`npm run ops:grant` / `ops:revoke` / `ops:staff` — the only path to staff standing (D-217)"
  - "an AUTHENTICATED ops actorId, which every later ops audit row in this phase is written with (OPS-03)"
  - "a measured guarantee that /api/auth/update-user cannot write `role` (T-18-0101)"
affects: [18-05 ops actions, 18-12 (ops) route group, 18-13 enforcement, 18-14 status-line audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "one expression, two jobs: a cache()'d read shared by a layout-level status assert and a page/action-level decision (the assertPublicListing shape, applied to auth)"
    - "positive-equality role predicate over a NULLABLE column — never an inequality against the default"
    - "the grant policy as an importable module over an injected DbConn, so a CLI rule is executable (and mutable) in a test"

key-files:
  created:
    - src/lib/ops/staff.ts
    - src/lib/ops/grant.ts
    - scripts/ops-grant.ts
    - tests/ops/staff-guard.test.ts
    - tests/ops/grant-cli.test.ts
    - tests/auth/ops-role.test.ts
  modified:
    - package.json

key-decisions:
  - "The shipped predicate is `role === \"staff\"` — positive string equality. `role` is NULLABLE (src/lib/db/schema.ts:45, `text(\"role\").default(\"user\")`, no `.notNull()`), so an inequality against the default reads a NULL as staff. Mutation-tested: the inverted form reddens exactly 4 of 7 cases."
  - "The Better Auth admin plugin was NOT added. Read from the installed package: it mounts FIFTEEN privileged routes that the existing `[...all]` catch-all would publish instantly — including set-role, impersonate-user, set-user-password, remove-user — for a `role` field declaration attribute-identical to the one already in src/lib/auth.ts:112."
  - "`requireStaff()`'s correctness depends on `session.cookieCache` staying unconfigured; the dependency is written into the module header because enabling it as a performance change would keep a REVOKED staff grant alive for the cache TTL, with no test going red."
  - "The CLI's `actorId` is ASSERTED, not authenticated (it has no session). The ops console's own writes (18-05) are the authenticated ones. This is stated at the module, at the script and on every line the CLI prints."
  - "`audit.meta` on a staff grant carries the target user id and enum-shaped values only — never the email the operator typed (D-72). Consequence stated rather than hidden: a `denied` row for an unknown target cannot name what was attempted."
  - "MEASURED CORRECTION to the plan's prediction: a smuggled `role` does not get stripped out of an update-user body — it takes the WHOLE request down with 400 FIELD_NOT_ALLOWED, so a legitimate field riding alongside it is not written either. Stronger than expected. `role: null` is dropped, not written."

patterns-established:
  - "Guard triple (readStaff / requireStaff / assertStaff): one cache()'d expression, a security boundary that 404s, and a status-line layer whose own header disclaims being the boundary."
  - "CLI grant policy: `fn(dbConn: DbConn, …)` with NO default, because a `= db` default is the import that hangs a short-lived script; the audit row goes through the same injected connection rather than `recordAudit`."
  - "Every audit assertion in this plan's tests is a SELECT against the table, never a return value — `recordAudit`-style writes swallow their own failure by design."

requirements-completed: [OPS-01, OPS-02]

# Metrics
duration: 21min
completed: 2026-08-31
---

# Phase 18 Plan 01: Staff Identity & the Ops Guard Summary

**FitOut now has an authenticated staff identity: one `cache()`'d expression reads `user.role` off the session, `requireStaff()` refuses everyone else with the same 404 a nonexistent route gives, and the only way to become staff is a CLI Drizzle write that leaves an audit row a test reads back — with zero new dependencies, zero middleware changes and zero files under `src/app/`.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-08-31T20:04:40Z
- **Completed:** 2026-08-31T20:26:15Z
- **Tasks:** 2
- **Files created/modified:** 7 (6 created, 1 modified)

## Accomplishments

- **`src/lib/ops/staff.ts`** — three exports, three jobs, each stated at its own site. `readStaff` is the one expression; `requireStaff` is the security boundary (D-216) and 404s rather than 403s (D-219); `assertStaff` exists only to win the HTTP status line above the `loading.tsx` Suspense boundary and its header says, in `src/middleware.ts:1`'s own words, that it is **not** the boundary.
- **`src/lib/ops/grant.ts` + `scripts/ops-grant.ts`** — staff is granted by `npm run ops:grant -- <email> --by "<name>"` and by nothing else. No server action, no route handler, no env allow-list, no `process.env` fallback for the operator's name.
- **The escalation half is measured, not asserted.** `tests/auth/ops-role.test.ts` POSTs a crafted body at `/api/auth/update-user` through the same `auth.handler` the catch-all dispatches to, and watches the row.
- **Every audit claim is read back out of the table**, because `recordAudit` swallows its own insert failure by design and no audit-writing function's return value has ever been evidence in this codebase.
- **The three refusal classes are asserted INDISTINGUISHABLE from each other**, which is the actual content of D-219 — a per-case "was refused" assertion cannot see a difference *between* cases.

## Task Commits

1. **Task 1: The one staff expression — readStaff / requireStaff / assertStaff** — `d0e6913` (feat)
2. **Task 2: The CLI grant — an injectable policy and a thin shell** — `d19ed17` (feat)

## Files Created/Modified

- `src/lib/ops/staff.ts` — **created.** `readStaff` (cache()'d, the one expression), `requireStaff` (LAYER 2/3, the security boundary), `assertStaff` (LAYER 1, explicitly not the boundary). Carries the cookie-cache invariant, the nullable-column reasoning, and the recorded decision not to add the admin plugin.
- `src/lib/ops/grant.ts` — **created.** `grantStaff` / `revokeStaff` / `listStaff` / `parseGrantArgs` over an injected `DbConn`. Privileged Drizzle flip + audit row through the same connection.
- `scripts/ops-grant.ts` — **created.** The shell only: own `postgres.js` client (single connection + `sql.end()` in `finally`), `USAGE`, `grant`/`revoke`/`list`, `process.exitCode` never `process.exit()`.
- `tests/ops/staff-guard.test.ts` — **created.** 7 cases (staff, non-staff, NULL role, near-miss role, signed out, indistinguishability, layer agreement) against a real Better Auth session on an isolated schema.
- `tests/ops/grant-cli.test.ts` — **created.** 12 cases; every audit assertion is a `SELECT … FROM audit`.
- `tests/auth/ops-role.test.ts` — **created.** 6 cases including a positive control that stops the file measuring a guard that refuses everybody.
- `package.json` — **modified.** `ops:grant`, `ops:revoke`, `ops:staff` beside the existing `ops:alerts` trio.

## Decisions Made

### The `role` predicate, exactly as shipped

```ts
return u.role === "staff" ? { id: u.id } : null;
```

Positive string equality. The column is `text("role").default("user")` with no `.notNull()`, and a DEFAULT is not a constraint — any path that names the column explicitly can leave NULL. The inverted form (`!== "user"`) would read that NULL as staff.

**This was mutation-tested rather than argued.** Installing the inverted predicate and changing nothing else:

```
× case 3 — a NULL role is NOT staff (the column is nullable; the predicate must fail closed)
× case 4 — a near-miss role ('admin') is NOT staff (D-215: there is exactly ONE staff role)
× case 6 — all four refusals are INDISTINGUISHABLE from each other (D-219, the existence oracle)
× case 7 — the status-line layer and the decision layer never disagree
      Tests  4 failed | 3 passed (7)
```

Cases 1, 2 and 5 — staff is staff, `role='user'` is refused, signed-out is refused — stayed **green** under a predicate that hands the ops console to every NULL-role row in the table. The three obvious cases are exactly the ones that cannot see this defect. Recorded verbatim in the test file's header.

### The cookie-cache invariant

`auth.api.getSession()` reads the database on every call because `session.cookieCache` is unconfigured (repo-wide grep: one hit, in a comment at `src/lib/session-check.ts:20`). That is what makes a staff **revocation** take effect on the very next request with no session-invalidation step. Enabling cookie caching would let a revoked grant keep opening ops surfaces for the cache TTL and **nothing in the suite would go red** — so the dependency is written into `src/lib/ops/staff.ts`'s header the way `src/lib/auth.ts:73` writes down its dependency on `revokeSessionsOnPasswordReset`'s non-default.

### The Better Auth admin plugin was rejected, and the number is 15

Read out of the installed package (`node_modules/better-auth/dist/plugins/admin/`), not out of docs. `routes.mjs` mounts **fifteen** endpoints, and `src/app/api/auth/[...all]/route.ts` is `toNextJsHandler(auth)` — a catch-all — so adding the plugin publishes all fifteen instantly, among them `set-role` (a role-grant HTTP endpoint, when D-217 says grants are CLI-only), `impersonate-user`, `set-user-password` and `remove-user`. Its own `role` declaration is attribute-identical to the one already in `src/lib/auth.ts:112`, so it adds nothing to the field this phase uses. The rejection is recorded in the module header so it reads as a decision, not an omission.

### The CLI's actor is asserted; the console's will be authenticated

`scripts/ops-grant.ts` has no session, so `--by` records who **claims** to have made a grant. This is the same limitation `scripts/ops-alerts.ts` records about its own `resolved_by` and that `src/lib/db/schema.ts` notes at the column. It is stated at the module, at the script, and on every success line the CLI prints. It cannot be otherwise: the first staff member must be granted by something that is not the console they cannot yet reach. **The ops console's own writes (plan 18-05) carry an authenticated `actorId` from `requireStaff()`** — that is the whole point of the phase, and `requireStaff()` returning the staff id is what makes it available at every call site for free.

### `audit.meta` carries no email

Ids and enum-shaped values only (D-72). The consequence is stated rather than hidden: a `denied` row for an unknown target **cannot name what was attempted**, because the only handle the operator supplied is an email address. The row records that a grant was attempted, by whom, and that it found nothing. `tests/ops/grant-cli.test.ts` case 3 serialises the whole row and asserts the address is absent from `meta`, `actor_id` and `action` alike.

## Deviations from Plan

### 1. [Rule 2 - Missing critical functionality] `parseGrantArgs` added as a fourth export of `grant.ts`

- **Found during:** Task 2
- **Issue:** The plan assigned "argv parsing" to `scripts/ops-grant.ts` while also naming `src/lib/ops/resolve-args.ts` in `<read_first>` for *"WHY the policy is a module and not twenty lines inside the script"*. Parsing inside the script is untestable — the script cannot be imported (it opens a client and calls `main()` at module load) — so the `--by`-is-required rule would have shipped as a promise rather than a measurement. Reusing `parseResolveArgs` unchanged was the other option and was rejected: its refusal wording is `resolve needs an audit id.`, which is actively wrong on a grant verb.
- **Fix:** `parseGrantArgs` lives in `src/lib/ops/grant.ts` (flags consumed before positionals, three distinct refusals, `process.env` read nowhere) and is covered by cases 8-12, including the `ghost-default` probe planted in both `USERNAME` and `USER`. `BY_FLAG_HELP` is still **imported** from `resolve-args.ts` so the two CLIs cannot drift on what the flag means, with a note in `USAGE` re-pointing its verb-specific last clause.
- **Files modified:** `src/lib/ops/grant.ts`, `scripts/ops-grant.ts`, `tests/ops/grant-cli.test.ts`
- **Verification:** `npx vitest run tests/ops/grant-cli.test.ts` — 12 passed.
- **Committed in:** `d19ed17`

### 2. [Rule 3 - Blocking] `grant.ts`'s `DbConn` parameter has no `= db` default

- **Found during:** Task 2
- **Issue:** The plan named `alertStuckHeld(dbConn: DbConn = db)` as the signature idiom, but that function lives in `src/inngest/` and can afford to import the singleton. `src/lib/ops/grant.ts` is imported by a short-lived CLI, and `@/lib/db` opens a connection nothing in that process closes — the script prints its result and then hangs forever.
- **Fix:** Required first parameter, no default — matching `src/lib/ops/alerts.ts`, the shipped module under the identical constraint, whose import set was copied exactly. The reason is written at the site.
- **Files modified:** `src/lib/ops/grant.ts`
- **Verification:** `npx tsx scripts/ops-grant.ts` with no arguments prints `USAGE` and exits 1 **and terminates**; the full verb sweep below all terminated.
- **Committed in:** `d19ed17`

### 3. [Rule 1 - Wrong prediction corrected] `update-user` rejects the whole request; it does not strip the field

- **Found during:** Task 2
- **Issue:** The plan (and `src/lib/auth.ts:120-135`'s summary of it) implied a field-level strip, so `tests/auth/ops-role.test.ts` was first written expecting `{bio, role:"staff"}` → `200` with `bio` written and `role` untouched. It went **red at 400**.
- **Fix:** Probed the endpoint four ways and rewrote the cases against measured behaviour, recorded verbatim in the test header. A truthy `role` raises `FIELD_NOT_ALLOWED` and takes the whole request down, so the legitimate field alongside it is **not** written either — a *stronger* guarantee than expected. A new control case (`{bio}` alone → `200`) proves the 400 was caused by `role` and not by anything else about the request, and a new case pins that `role: null` is **dropped, not written** — which matters here specifically, because NULL is the value the guard must fail closed on.
- **Files modified:** `tests/auth/ops-role.test.ts`
- **Verification:** `npx vitest run tests/auth/ops-role.test.ts` — 6 passed.
- **Committed in:** `d19ed17`

---

**Total deviations:** 3 auto-fixed (1 × Rule 1, 1 × Rule 2, 1 × Rule 3)
**Impact on plan:** No scope creep. Nothing was added beyond the plan's file list; deviation 1 adds one export and five test cases to files the plan already names, and deviations 2-3 are the plan's own instructions corrected against what the runtime actually does. All three are documented at their sites, not just here.

## Issues Encountered

**None that required problem-solving beyond the deviations above.** Two things worth recording for the next executor in this phase:

- `npx tsx <file>` cannot resolve `postgres` from a file outside the repo tree (module resolution is rooted at the file, not at cwd). A throwaway probe script must live inside the repo. It also cannot take top-level `await` under the CJS output format — wrap in `async function main()`.
- Capturing a URL from `node -e` in this shell picks up dotenv's tip banner on stdout; pipe through `tail -1` or write with `process.stdout.write`.

## Verification

| Check | Result |
|---|---|
| `npx vitest run tests/ops/staff-guard.test.ts tests/ops/grant-cli.test.ts tests/auth/ops-role.test.ts` | **25 passed (3 files)** |
| `npx tsc --noEmit` | **exit 0** |
| `npx eslint` on all 6 new files | **exit 0** |
| `git diff --exit-code src/middleware.ts` | **clean** (D-216: middleware untouched) |
| `git status --porcelain src/app/` | **empty** (this plan ships no route; `(ops)` belongs to 18-12) |
| `npm test` (run alone) | **193 files / 2248 passed, 5 skipped** — baseline was 190 / 2223, i.e. **+3 files and +25 tests, exactly this plan's own, zero regressions** |
| `npm run test:design` (run alone) | **71 files / 1291 passed, 3 skipped** — build-blocking gate green |
| `npx tsx scripts/ops-grant.ts` (no args) | **USAGE + exit 1, terminates** |

### The CLI, run end to end against `fitout_test` before it was committed

Twelve isolated-schema cases cover `src/lib/ops/grant.ts`; **none of them can cover the script**, because a test cannot import it. So it was run — every verb, on a throwaway account, with the rows read back and then deleted:

```
(no args) ......................... USAGE + exit 1
grant <email>            (no --by) . the three-sentence policy refusal, exit 1
grant <email> --by "…" ............ Granted staff … previous role "user" …           exit 0
grant <email> --by "…" (again) .... was ALREADY staff … nothing changed, recorded     exit 0
list .............................. one row: id, email, created                        exit 0
revoke <user-id> --by "…" ......... Revoked … takes effect on their very next request  exit 0
grant nobody@… --by "…" ........... No account matches … the attempt was recorded      exit 1
list .............................. No staff accounts.                                 exit 0
```

and the four `audit` rows those calls left, read straight back out of the table:

```
ops_grant_staff  ok      {targetUserId, previousRole:"user",  role:"staff"}
ops_grant_staff  ok      {targetUserId, previousRole:"staff", role:"staff"}   ← the repeat, legible
ops_revoke_staff ok      {targetUserId, previousRole:"staff", role:"user"}
ops_grant_staff  denied  {reason:"target_not_found"}                          ← and NO email in it
```

### Requirement status — deliberately `Partial`, not `Complete`

`.planning/REQUIREMENTS.md` marks **OPS-01** and **OPS-02** *Partial*, and their checkboxes stay unticked. Both are cross-cutting, exactly as the `[04-02]` / `[06-03]` / `[06-04]` precedents in STATE.md describe:

- **OPS-01** — "staff standing is read server-side from a field no client can write" is **done and measured**. "A staff member signs in to **FitOut Ops**" needs the console (18-12).
- **OPS-02** — the guard half is done. The *route* half lands in 18-12, and the HTTP **status-line** half is not observable from Vitest at all and lands as the production-build `curl` audit in 18-14.

Marking either Complete here would be claiming a surface that does not exist yet. Completion is validated at the phase transition.

### Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-18-0101 | mitigated | `tests/auth/ops-role.test.ts` cases 1-4 — measured at the handler, stronger than predicted |
| T-18-0102 | mitigated | Plugin not added; `grep -c 'better-auth/plugins/admin'` = 0 in `staff.ts`, `auth.ts`, `package.json` |
| T-18-0103 | mitigated | `notFound()` in both guards; `grep -c 'forbidden\|redirect('` = 0 in `staff.ts`; indistinguishability asserted in case 6 |
| T-18-0104 | mitigated | Positive equality, mutation-scored |
| T-18-0105 | mitigated | Invariant written into the module header; `grep -n cookieCache src/lib/ops/staff.ts` = 2 hits |
| T-18-0106 | mitigated | Audit row per attempt (both branches), read back by `SELECT` in every case |
| T-18-0107 | mitigated | CLI-only, `--by` required, no env fallback, no server action, no route |
| T-18-SC | mitigated | **Zero packages installed.** `package.json` `dependencies`/`devDependencies` byte-unchanged — only three `scripts` entries added. |

## Known Stubs

None. Every export in this plan is wired and exercised.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. It reads an existing column and writes it from a shell.

## User Setup Required

**One operator action before the ops console lands (18-12), and it cannot be automated:** somebody must be granted staff.

```bash
npm run ops:grant -- <your-email> --by "<your name>"
npm run ops:staff          # confirm
```

There is exactly ONE staff role (D-215) — no tiers, no partial ops powers. Anyone granted it will reach every ops surface in this phase, including cancel-and-refund on a live booking. The audit trail is the control.

## Next Phase Readiness

**Ready.** Every later plan in Phase 18 is a consumer of this one:

- **18-05 (ops actions)** — `requireStaff()` returns the staff id, so every ops action already holds the **authenticated** `actorId` OPS-03 needs. This is the phase's answer to `audit.resolved_by` being *"asserted, not authenticated"* since Phase 8.
- **18-12 (`(ops)` route group)** — call `assertStaff()` in `(ops)/ops/layout.tsx` **above** the Suspense boundary (that is the only thing that wins the 404 status line) **and** `requireStaff()` in every page. Layer 1 does not retire Layer 2. Do **not** add an `(ops)`-scoped `not-found.tsx` — a distinct 404 body under `/ops` is the same existence oracle D-219 forbids.
- **18-14 (status-line audit)** — the HTTP status half of OPS-02 is not observable from Vitest (`tests/design/soft-404-status.test.ts:31-39`). It needs the production-build `curl` sweep: staff / non-staff / signed-out / nonexistent must all return the same number.

**One standing hazard to carry forward:** if anyone proposes enabling `session.cookieCache` as a performance change, `src/lib/ops/staff.ts` is what has to be fixed first. A revoked staff grant would otherwise keep working for the cache TTL, and no test in this repo would go red.

## Self-Check: PASSED

Files verified present on disk:

- `src/lib/ops/staff.ts` — FOUND
- `src/lib/ops/grant.ts` — FOUND
- `scripts/ops-grant.ts` — FOUND
- `tests/ops/staff-guard.test.ts` — FOUND
- `tests/ops/grant-cli.test.ts` — FOUND
- `tests/auth/ops-role.test.ts` — FOUND

Commits verified in `git log`:

- `d0e6913` — FOUND (Task 1)
- `d19ed17` — FOUND (Task 2)

---
*Phase: 18-host-verification-listing-review-fitout-ops*
*Completed: 2026-08-31*
