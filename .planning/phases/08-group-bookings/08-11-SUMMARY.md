---
phase: 08-group-bookings
plan: 11
subsystem: security
tags: [rate-limit, dos, memory, server-actions, group-bookings, unauthenticated]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-06)
    provides: submitRsvp — the app's one session-less write, and the token-keyed budget CR-04 is about
  - phase: 02-auth (WR-06)
    provides: src/lib/rate-limit.ts — the shared module-level fixed-window limiter
provides:
  - "src/lib/rate-limit.ts is HARD-BOUNDED at RATE_LIMIT_MAX_BUCKETS = 50,000, whatever any caller keys on"
  - "expired-window sweep (throttled to 1/s) plus unconditional insertion-order eviction"
  - "__rateLimitBucketCount / __resetRateLimit test seams for asserting facts about the store itself"
  - "submitRsvp resolves the invite token BEFORE charging any budget; the link budget is keyed on group.groupId"
  - "an unauthenticated caller sending unknown tokens mints ZERO buckets — measured delta, not an estimate"
  - "two mutation-proven regression files: tests/security/rate-limit-bound.test.ts, tests/group/rsvp-rate-limit.test.ts"
affects: [08-12, 08-13, 08-17, phase-09, any-future-unauthenticated-endpoint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Resolve-then-budget: a rate-limit key on an unauthenticated path must name a row the database confirmed, never a string the caller chose"
    - "Two independent bounds: the caller bounds its key space, the store bounds itself — neither is sufficient alone"
    - "A Map is already an LRU-by-insertion; insertion-order eviction needs no dependency"

key-files:
  created:
    - tests/security/rate-limit-bound.test.ts
    - tests/group/rsvp-rate-limit.test.ts
  modified:
    - src/lib/rate-limit.ts
    - src/app/actions/group.ts

key-decisions:
  - "The ceiling check is `size >= MAX_BUCKETS` and evicts to `size < MAX_BUCKETS`, NOT the plan's `> / <=` — the plan's arithmetic settles at MAX+1 under flood and would have failed its own acceptance criterion"
  - "sweepExpired is throttled to once per second; the hard eviction is not throttled. The sweep is the cheap win, the eviction is what holds the invariant"
  - "NO coarse pre-resolution budget was added (plan-level decision 5): one shared key on the app's only public write is a global availability lever"
  - "guest-email:${guestEmailNorm} was left exactly as it is — it sits behind a resolved, active token and a committed claim, and its key space is now covered by the ceiling. Widening it is WR-05, out of scope"
  - "A regenerated invite link now SHARES its predecessor's budget. That is the visible consequence of keying on the group, and it is correct: the budget was never about the credential"

patterns-established:
  - "Pattern: an unauthenticated write path owes a measured bucket-count DELTA of zero for unresolvable input, not a 'small' number — a bound that is merely small is the bug with a coefficient on it"
  - "Pattern: a store-level ceiling must be pinned by a flood test with a positive control (the keys really were distinct), or it also passes against a limiter that stores nothing"
  - "Pattern: an accepted availability tradeoff (a live key losing its window under eviction) is written down as a passing test case, so it stays a stated tradeoff rather than a latent surprise"

requirements-completed: [GROUP-03, GROUP-05]

metrics:
  duration: ~22 min
  completed: 2026-07-28
  tasks: 2
  files-modified: 4
---

# Phase 8 Plan 11: Bound the Rate-Limit Store and Resolve Before Budgeting Summary

**CR-04 is closed by two independent bounds: `submitRsvp` now resolves the invite token before charging any
budget (so an unknown token mints zero buckets — measured, 200 → 0), and `src/lib/rate-limit.ts` hard-caps
its store at 50,000 entries so no future caller can reintroduce the class.**

## What Shipped

`submitRsvp` is the only server action in the app reachable with **no session**. It shape-checked the invite
token and then immediately charged `rateLimit(\`rsvp:${parsedToken.data}\`)` — *before* `getGroupByToken` had
any opinion on whether that token names a real group. Every caller through Phase 7 keyed on an authenticated
`userId`, so "a module-level `Map` that is never evicted from" was harmless: the key space was the user
table. Here it was `32^20` caller-selectable strings, each buying a durable ~150-200 byte entry with no
session, no group and no database row behind it. On the container host CLAUDE.md prescribes that is memory
exhaustion against the whole process — and it takes the booking path, the core value, down with it.

### 1. The store is hard-bounded (`src/lib/rate-limit.ts`)

```ts
const MAX_BUCKETS = 50_000;
export const RATE_LIMIT_MAX_BUCKETS = MAX_BUCKETS;

function enforceCeiling(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  if (now - lastSweepAt >= SWEEP_INTERVAL_MS) sweepExpired(now);
  if (buckets.size < MAX_BUCKETS) return;
  for (const k of buckets.keys()) {
    if (buckets.size < MAX_BUCKETS) break;
    buckets.delete(k);
  }
}
```

`enforceCeiling` runs at the top of every `rateLimit` call, so the invariant is stated as a post-condition:
**after every call, `buckets.size <= MAX_BUCKETS`, whatever a caller keys it on.** The sweep alone is not a
ceiling — a flood of distinct keys inside one 60s window expires nothing — which is exactly why the
unconditional insertion-order eviction is the load-bearing half. A `Map` iterates in insertion order, so it
is already an LRU-by-insertion for this purpose; no LRU dependency was added.

`RateLimitResult`, `RateLimitOptions`, the fixed-window arithmetic and `requireWithinRateLimit` are
byte-unchanged.

### 2. `submitRsvp` resolves before it budgets (`src/app/actions/group.ts`)

```ts
const group = await getGroupByToken(db, parsedToken.data);
if (!group.active) return { ok: false, error: INVITE_INACTIVE };
if (group.rsvpClosed) return { ok: false, error: RSVP_CLOSED };

const linkBudget = rateLimit(`rsvp:${group.groupId}`, RSVP_RATE_LIMIT);
```

The key space is now real `booking_group` rows. Resolving first leaks **nothing**: unknown, voided and
regenerated tokens already collapse onto one identical `INVITE_INACTIVE` sentence (T-08-17), so there is no
new distinguishable response to read — if anything it *reduces* timing variance, because the lookup now
happens for every caller rather than only for those under budget.

Verified by grep (the plan's acceptance criteria):

```
$ grep -c 'rsvp:${parsedToken.data}' src/app/actions/group.ts
0
$ grep -n 'rsvp:${group.groupId}' src/app/actions/group.ts
355:  const linkBudget = rateLimit(`rsvp:${group.groupId}`, RSVP_RATE_LIMIT);
$ grep -n 'getGroupByToken(db' src/app/actions/group.ts
345:  const group = await getGroupByToken(db, parsedToken.data);
```

355 > 345 — the budget is charged after the resolution, in the same function.

### 3. Three comments that had become false statements were rewritten, not annotated

- the inline *"Bound the LINK before doing any work. A shared credential is the abusable surface here, not
  the person."* — it was the argument **for** the bug.
- the `RSVP_RATE_LIMIT` doc *"It bounds the link, not the person"* — it now bounds the **group**, and names
  the consequence: a regenerated link shares its predecessor's budget.
- the `src/lib/rate-limit.ts` v1-scope header — extended (not replaced) with the invariant, the T-08-36
  eviction tradeoff, and the rule that a caller keying on unauthenticated input must **also** bound its own
  key space, pointing at `submitRsvp` as the worked example.

A fifth bullet was added to the file's SECURITY CONTRACT header naming the property outright: *no
`rateLimit` key on this path is ever derived from unvalidated caller input.*

## Measured Numbers

| Measurement | Before | After |
|---|---|---|
| Buckets minted by 200 distinct, well-formed, **unknown** tokens (unauthenticated) | **200** | **0** |
| Buckets minted by 1 unknown token with a **session** | 2 (link + identity) | **0** |
| Buckets minted by 1 token that **resolves** | 1 | **1** (unchanged) |
| `db.execute` calls for a **malformed** token | 0 | **0** |
| `db.execute` calls for an **unknown** token (T-08-34 residual, `accept`) | 0 | **1** indexed lookup, no write, no tx |
| Store size after 60,000 distinct keys in one window | 60,000 | **50,000** |

The unknown-token delta is asserted as an exact **0**, not as "small" — a bound that is merely small is the
bug with a coefficient on it.

## Task Commits

1. **Task 1: Bound the rate-limit store (sweep + hard ceiling) + test seam** — `3809d55` (test, RED) → `eaf983d` (feat, GREEN)
2. **Task 2: submitRsvp resolves the token before charging any caller-keyed budget** — `bab21d3` (test, RED) → `a51fc3d` (feat, GREEN)

No REFACTOR commit was needed on either task.

## Mutation Testing (both recorded red → green, verbatim)

### Mutation 1 — delete the hard-eviction loop from `enforceCeiling`, keep only `sweepExpired`

**RED:**
```
 ❯ tests/security/rate-limit-bound.test.ts (6 tests | 2 failed) 109ms
     × stays at or below the ceiling after 60,000 DISTINCT keys inside one window 38ms
     × gives a LIVE key evicted under flood a fresh window on its next hit 30ms

 FAIL  tests/security/rate-limit-bound.test.ts > CR-04 — the bucket store has a pinned hard ceiling > stays at or below the ceiling after 60,000 DISTINCT keys inside one window
AssertionError: expected 60000 to be less than or equal to 50000
 ❯ tests/security/rate-limit-bound.test.ts:66:40

 FAIL  tests/security/rate-limit-bound.test.ts > T-08-36 — the accepted eviction tradeoff, written down > gives a LIVE key evicted under flood a fresh window on its next hit
AssertionError: expected 50101 to be less than or equal to 50000
 ❯ tests/security/rate-limit-bound.test.ts:139:40

 Test Files  1 failed (1)
      Tests  2 failed | 4 passed (6)
```

**GREEN (loop restored, byte-identical):**
```
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  576ms
```

The sweep survives the mutation untouched and the flood case still fails — which is the point: the sweep is
not, and cannot be, the ceiling.

### Mutation 2 — move the link budget back above `getGroupByToken` and re-key it on the token

```ts
const mutLinkBudget = rateLimit(`rsvp:${parsedToken.data}`, RSVP_RATE_LIMIT);
if (!mutLinkBudget.ok) return { ok: false, error: TOO_FAST };
const group = await getGroupByToken(db, parsedToken.data);
```

**RED:**
```
 ❯ tests/group/rsvp-rate-limit.test.ts (7 tests | 4 failed) 5143ms
     × adds EXACTLY ZERO buckets across 200 distinct, well-formed, unknown tokens 672ms
     × POSITIVE CONTROL: a token that DOES resolve mints exactly one bucket 60ms
     × mints no bucket for a SIGNED-IN caller on an unknown token either 108ms
     × does not hand a fresh budget to a token minted for the same group 919ms
AssertionError: expected 200 to be +0 // Object.is equality
 ❯ tests/group/rsvp-rate-limit.test.ts:217:55
AssertionError: expected 2 to be 1 // Object.is equality
 ❯ tests/group/rsvp-rate-limit.test.ts:226:55
AssertionError: expected 1 to be +0 // Object.is equality
 ❯ tests/group/rsvp-rate-limit.test.ts:236:55
 Test Files  1 failed (1)
      Tests  4 failed | 3 passed (7)
```

**GREEN (restored):**
```
 Test Files  7 passed (7)
      Tests  67 passed (67)
```

The `expected 200 to be +0` line is CR-04 itself, reproduced on demand: 200 unauthenticated requests, 200
permanent buckets, zero database rows to show for them.

## Files Created/Modified

- `src/lib/rate-limit.ts` — `MAX_BUCKETS`/`RATE_LIMIT_MAX_BUCKETS`, `sweepExpired`, `enforceCeiling`, the
  `__rateLimitBucketCount`/`__resetRateLimit` seams, and an extended header stating the invariant and the
  T-08-36 tradeoff. (+93 lines, 0 removed — nothing in the existing contract changed.)
- `src/app/actions/group.ts` — the budget block moved below the resolution and re-keyed; three false
  comments rewritten; a fifth SECURITY CONTRACT bullet added.
- `tests/security/rate-limit-bound.test.ts` (new, 149 lines) — the ceiling under a 60,000-key flood, the
  sweep asserted as an exact count, the unchanged budget contract, and the eviction tradeoff.
- `tests/group/rsvp-rate-limit.test.ts` (new, 310 lines) — the zero-delta proof against the real limiter and
  a real Postgres, the regeneration case, and the measured T-08-34 residual.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's ceiling arithmetic is off by one against its own acceptance criterion**

- **Found during:** Task 1
- **Issue:** The plan prescribed *"when `buckets.size > MAX_BUCKETS`, call `sweepExpired`; … evict … until
  `buckets.size <= MAX_BUCKETS`"*. Traced under flood: at size 50,000 the guard is false, so the insert
  takes it to 50,001; the next call evicts back to 50,000 and inserts again → **the steady state is
  MAX_BUCKETS + 1**. The plan's own acceptance criterion (`__rateLimitBucketCount() <=
  RATE_LIMIT_MAX_BUCKETS` after the flood) would therefore have been red on a faithful implementation.
- **Fix:** the guard is `size >= MAX_BUCKETS` and the eviction loop runs until `size < MAX_BUCKETS`, leaving
  room for the insert that follows. The invariant is now a clean post-condition of every call, and the flood
  measures exactly 50,000.
- **Files modified:** `src/lib/rate-limit.ts`
- **Commit:** `eaf983d`

**2. [Rule 3 - Blocking] `sweepExpired` needed a throttle or the plan's own flood test was unrunnable**

- **Found during:** Task 1
- **Issue:** Sweeping on every over-ceiling call is a full O(size) scan. In the plan's mandated 60,000-key
  flood that is ~10,000 over-ceiling calls × 50,000 entries ≈ **5 × 10⁸ iterations** — the required test
  would have taken tens of seconds and made the suite hostile to run.
- **Fix:** `SWEEP_INTERVAL_MS = 1_000` + a `lastSweepAt` clock gate the **sweep only**. The hard eviction
  runs unconditionally, so the ceiling is completely unaffected by the throttle (proven: mutation 1 removes
  eviction and the flood immediately breaches, throttle or not). `__resetRateLimit()` clears `lastSweepAt`
  too, so the sweep case stays deterministic across files in one worker. Flood case now runs in ~40ms.
- **Files modified:** `src/lib/rate-limit.ts`
- **Commit:** `eaf983d`

### Deliberately NOT done (per plan)

- No coarse pre-resolution budget (the review's drafted fix suggested one; the plan overrides it, and
  STATE.md planning decision 5 says why: one shared key on the app's only public write is a global
  availability lever).
- `guest-email:${guestEmailNorm}` left byte-identical at its original site. That is WR-05, out of scope.
- No packages added or upgraded (T-08-SC: nothing to verify).

## Verification

| Check | Result |
|---|---|
| `npx vitest run tests/security/rate-limit-bound.test.ts` | **exit 0** — 6 passed |
| `npx vitest run tests/group/` | **exit 0** — 7 files / 67 tests |
| `npx vitest run` (full suite, no `DATABASE_URL` override) | **exit 0** — **94 files / 810 tests** (was 92 / 797 after 08-10; +2 files, +13 tests) |
| `npx tsc --noEmit` | **exit 0** |
| `npm run lint` | **0 errors**, 7 pre-existing warnings (5 in `tests/helpers/mocks.ts`, 2 React-Compiler notes in the host wizard — none in touched files) |
| `npm run build` (bare, no env workaround) | **exit 0**, 27 routes incl. `ƒ /invite/[token]` |
| `tests/group/guest-email-guard.test.ts` | green — the D-117 guard is untouched (D-117 truth) |
| `tests/group/rsvp-identity.test.ts` | green — single-path identity de-dup untouched |
| `tests/security/rate-limit.test.ts` | green — the shipped WR-06 limiter contract is unchanged |

## Success Criteria

- ✅ A flood of distinct well-formed unknown invite tokens produces **zero** new rate-limit buckets
  (measured delta 200 → 0, mutation-proven).
- ✅ The limiter's store cannot exceed 50,000 entries under any caller (measured 50,000 after 60,000 distinct
  keys in one window, mutation-proven).
- ✅ `submitRsvp` still requires no session (`tests/group/rsvp-rate-limit.test.ts` drives every public case
  with an empty cookie), still returns one calm sentence for every inactive-token case (unknown, malformed
  and regenerated all asserted against the same pinned string), and every shipped group test stays green.

## Known Stubs

None. No placeholder values, no hardcoded empties, no unwired data sources introduced.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change — this plan removed surface
rather than adding it. T-08-33 is `mitigate`, done and verified; T-08-34/35/36 are `accept` and now each
carry a passing test that states the accepted cost out loud.

## For Future Phases

1. **The rule this plan generalises, for any future unauthenticated endpoint:** *a rate-limit key must name
   something the database confirmed.* The store's 50,000 ceiling is the second line of defence, not the
   first — it caps the blast radius, it does not make an attacker-chosen key safe (they still get to churn
   the store and evict live budgets, which is T-08-36). Bound the key space at the caller.
2. **A regenerated invite link shares its predecessor's budget.** If a future flow ever regenerates a link
   *because* the old one was being hammered, the new link inherits the exhausted bucket. That is the correct
   trade today (the group is what is being hammered, not the string), but it is the one product-visible
   consequence of the fix and it is worth remembering before anyone builds "rotate the link to escape
   abuse".
3. **`__rateLimitBucketCount` / `__resetRateLimit` exist for tests only.** Any new test that touches the
   real limiter should call `__resetRateLimit()` in `beforeEach` — the store is module-level state that
   outlives a single test. Note the subtlety `tests/group/rsvp-rate-limit.test.ts` documents: the limiter
   must be imported **after** `vi.resetModules()`, from the same registry as the action under test, or the
   Map being counted is not the Map being written. The "a resolving token mints exactly one bucket" positive
   control is what catches that mistake.
4. **The single-instance caveat is unchanged and now the only one left.** The store is still per-process; a
   distributed limiter (Redis) remains the >1-instance hardening the `rate-limit.ts` header flags, and it is
   what T-08-34 says to revisit the residual lookup with.
