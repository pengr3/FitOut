---
phase: quick-260801-kv2
plan: 01
subsystem: payments
tags: [postgres, concurrency, compare-and-swap, paymongo, drizzle, checkout, race-proof]

requires:
  - phase: 08-group-bookings
    provides: "expire-before-create (the SEQUENTIAL double-submit guard) and booking.checkout_session_id, the column that made one-live-session-per-booking expressible at all"
  - phase: 09-open-capacity-bookings
    provides: "makeRacingClients + the two-layer mutation-measured race-proof discipline (open-capacity-race.test.ts)"
provides:
  - "booking.checkout_lock_at — a compare-and-swap checkout lease claimed before any PayMongo call"
  - "src/lib/payments/checkout-lease.ts — claimCheckoutLease / releaseCheckoutLease / CHECKOUT_IN_FLIGHT_MESSAGE"
  - "CHECKOUT_LEASE_TTL_SECONDS (90s, env-tunable) — the self-heal bound for a crashed checkout attempt"
  - "ConfirmResult reason 'in-flight' + its inline booker-facing notice on the reserve page"
  - "tests/booking/checkout-lease-race.test.ts — an 8-case two-connection race proof for the money path"
affects: [payments, booking, checkout, any future caller that mints a PayMongo session]

tech-stack:
  added: []
  patterns:
    - "Compare-and-swap lease: one autocommit UPDATE ... WHERE <free> RETURNING as a mutual-exclusion primitive that holds NO lock across an external HTTP call"
    - "TTL-as-a-predicate-term: staleness is evaluated by the Postgres clock inside the CAS, so abandonment self-heals with no sweep, cron or operator"
    - "Release requires the claimed instant, so a racer that lost is structurally incapable of releasing the winner's lease"

key-files:
  created:
    - src/lib/payments/checkout-lease.ts
    - drizzle/0023_booking_checkout_lease.sql
    - drizzle/meta/0023_snapshot.json
    - tests/booking/checkout-lease-race.test.ts
    - tests/booking/reserve-actions.test.tsx
  modified:
    - src/lib/db/schema.ts
    - src/lib/payments/config.ts
    - src/app/actions/booking.ts
    - src/lib/paymongo.ts
    - src/components/booking/reserve-actions.tsx
    - tests/booking/confirm-double-submit.test.ts
    - .planning/phases/08-group-bookings/deferred-items.md
    - .planning/phases/08-group-bookings/08-SECURITY.md
    - .planning/v1.0-MILESTONE-AUDIT.md

key-decisions:
  - "The lease is a nullable timestamptz COLUMN, not pg_try_advisory_lock — src/lib/db/index.ts is a default max:10 postgres.js pool with no connection pinning across await boundaries, so a session-scoped lock could be released on a different backend and leak with no TTL to heal it; the xact-scoped variant releases at COMMIT, which is before the HTTP calls begin"
  - "The CAS is NOT wrapped in a transaction and carries no FOR UPDATE: under READ COMMITTED a blocked racer re-evaluates its WHERE against the newly committed row version (EvalPlanQual), matches zero rows, and RETURNING comes back empty"
  - "date_trunc('milliseconds', now()) rather than bare now(): postgres.js/Drizzle round-trip timestamptz through a millisecond-precision JS Date, so a microsecond value could never be matched back and every release would silently no-op"
  - "NO status term in the CAS predicate — it would make a zero-row result ambiguous between 'another attempt is in flight' and 'this hold is not live', and would not close the window it appears to (a webhook confirm can land after the CAS and before the create)"
  - "'in-flight' is a SEPARATE ConfirmResult reason, not a flavour of 'checkout': reserve-view.tsx flips the whole page to HoldExpiredState for expired|denied|checkout, and this booker's hold has not expired"
  - "The client component renders result.error and does NOT import CHECKOUT_IN_FLIGHT_MESSAGE — checkout-lease.ts pulls in drizzle + the schema, and rendering the server's own string makes drift structurally impossible"
  - "TTL = 90s: the FLOOR is the dangerous direction (paymongoFetch sets no AbortSignal, so a TTL below the slow path would let a retry overtake a live attempt and re-open the race); the ceiling is 2.5% of PAYMENT_WINDOW_MINUTES"
  - "updateDeclaredPax stays out of scope by decision — it mints no payable session, so its worst concurrent outcome is a redundant expire, not a double charge"

patterns-established:
  - "Three-layer mutation measurement for a correctness guard: the inlined PATTERN, the SHIPPED module, and the CALL SITE — because a race file that never imports the action leaves a call-site deletion green (measured in Phase 8)"
  - "Anti-pattern grep gates strip comment-only lines before matching syntax, so required prose NAMING a rejected anti-pattern cannot trip the gate that forbids it"
  - "Behavioural proof of 'no transaction survives': a FOR UPDATE NOWAIT probe on an independent connection, with an in-test instrument check proving the probe really does reject (55P03) while a transaction holds the row"

requirements-completed: ["T-08-79", "v1.0-AUDIT-5"]

duration: 32min
completed: 2026-08-01
---

# Quick Task 260801-kv2: Close T-08-79 — the compare-and-swap checkout lease

**Two genuinely concurrent `confirmBooking` calls for one booking can no longer each mint a payable PayMongo checkout session: an atomic `UPDATE … WHERE <lease is free> RETURNING` admits exactly one, and it holds no DB lock across either PayMongo HTTP round-trip.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-08-01T07:45:00Z
- **Completed:** 2026-08-01T08:17:00Z
- **Tasks:** 3/3
- **Files modified:** 14 (5 created, 9 modified)

## Accomplishments

### Task 1 — the lease (commit `c2bcd5f`)

- `booking.checkout_lock_at`, a nullable `timestamptz`, added via a **generated** `drizzle/0023_booking_checkout_lease.sql` holding exactly one `ADD COLUMN`, registered at `idx: 23` with a snapshot, applied locally.
- `CHECKOUT_LEASE_TTL_SECONDS = 90` in `src/lib/payments/config.ts`, `Math.round`ed because the value is bound into `make_interval(secs => …::int)` and a fractional env override would raise a cast error on the money path.
- `src/lib/payments/checkout-lease.ts`: `claimCheckoutLease` (one autocommit CAS), `releaseCheckoutLease` (scoped to the exact claimed instant, best-effort), `CHECKOUT_IN_FLIGHT_MESSAGE`.
- `tests/booking/checkout-lease-race.test.ts`: 8 cases over **independent** postgres.js connections via `makeRacingClients` — Layer 1 (inlined CAS, autocommit) and Layer 2 (the shipped module through `drizzle(client)` per racer).

### Task 2 — the call site (commit `1a7b076`)

- The claim sits immediately before the expire-before-create block, as late as possible, so no pre-existing guard can return with a lease outstanding and no existing test's expectations moved.
- All three completing exits are wired per the contract: success clears the lease **in the same `.set()`** that names `checkout_session_id`; the expire-failure refusal releases; the `createCheckoutSession` catch releases. Only process death falls through to the TTL.
- The refusal emits `confirm_pay` / `denied` / `reason: "checkout_in_flight"` (WR-06 non-repudiation), mirroring the shipped rate-limit denial.
- `confirm-double-submit.test.ts` gains cases (6)-(10), including a `FOR UPDATE NOWAIT` probe on an independent connection proving no transaction survives the flow.
- The stale comments in `booking.ts` (two places) and `paymongo.ts` were corrected, stating the closure **positively** so the dumb string gates on `accepted residual` / `CONCURRENCY RESIDUAL` stay usable tripwires.

### Task 3 — the booker, the suite, the record (commits `6a5e709`, `1a85510`)

- `ReserveActions` renders the server's own sentence as a muted `role="status"` line under the CTA; the reserve page stays usable and the CTA re-enables.
- `tests/booking/reserve-actions.test.tsx`: 3 cases, spot-mutated to confirm they are load-bearing.
- `deferred-items.md`, `08-SECURITY.md` (AR-08-02 **RETIRED**, T-08-79 `accept → mitigate` / `closed`) and `v1.0-MILESTONE-AUDIT.md` now report the closure; T-08-74 and LW-01 are left accurately open.

## Mutation log

Every mutation was **executed**, not described. All were reverted **by editing the file back** — never via git, because `checkout-lease.ts` was untracked at the time and `git add -N` would have pinned an empty index baseline and turned `git checkout --` into a truncation.

| Mutation | Target | Observed | Predicted | Verdict |
|---|---|---|---|---|
| M1 | inlined CAS predicate (test file) | 2 failed \| 6 passed — RED {1,2} | {1,2} | match |
| M2a | whole lease predicate (`checkout-lease.ts`) | 3 failed \| 5 passed — RED {3,4,5} | {3,4,5} | match |
| M2b | only the `< now() - make_interval(...)` half | 1 failed \| 7 passed — RED {4} | {4} | match |
| M2c | only `eq(booking.bookerId, bookerId)` | 1 failed \| 7 passed — RED {7} | {7} | match |
| A | the `if (!lease.claimed)` refusal | 1 failed \| 9 passed — RED {6} | {6} | match |
| B | `checkoutLockAt: null` in the persist `.set()` | 8 failed \| 2 passed — RED {1,2,3,5,7,8,9,10} | {7} | **broader** |
| C | release in the expire-failure branch | 1 failed \| 9 passed — RED {8} | {8} | match |
| D | release in the `paymongo_error` catch | 5 failed \| 5 passed — RED {5,7,8,9,10} | {9} | **broader** |

Verbatim failure text for each is recorded in the two test-file headers.

## Deviations from Plan

### Divergences from the plan's RED predictions (recorded, not reconciled)

The plan was explicit that its RED predictions are hypotheses. Two came back **broader** than predicted. Nothing was changed to make observation match prediction.

**1. MUTATION B predicted RED {7}; observed RED {1,2,3,5,7,8,9,10}.**
Both the plan and the test file note that cases (1)-(5) are *themselves* a release guard — each fires `confirmBooking` two or three times sequentially against one booking — but the prediction for B did not carry that through. Without the success-path clear, their second submit is refused with `in-flight`. Cases (8)(9)(10) then inherit a queued-session desync, because a refused call consumes no queued mock session. Case (7) run in isolation gives the clean signal (`expected 2026-08-01T08:01:17.551Z to be null`), which is recorded alongside.

**2. MUTATION D predicted RED {9}; observed RED {5,7,8,9,10}.**
Same mechanism, and case (5)'s failure is a genuine second signal rather than noise: it is the pre-existing NOT-TRAPPED recovery case, which fires `confirmBooking` three times, so without the create-failure release its third submit is refused — precisely the "one retry becomes a 90-second dead end" cost the release exists to prevent.

**3. MUTATION A was applied as a disabled guard, not a deleted call.**
The plan's wording was "delete the `claimCheckoutLease` call + refusal". Deleting the call as well would leave `lease.lockedAt` undefined in the two release branches, so cases (8) and (9) would fail with a `ReferenceError` and confound mutations C and D. The refusal guard was disabled instead, which isolates case (6) exactly. Observed failure is stronger than expected: case (6) fails with a **`RedirectError`** — the refused caller ran the whole flow, expired the lease-holder's session and minted a second independently payable one. The mutation reproduced the live T-08-79 double charge in a test.

### [Rule 3 — Blocking] `npm run db:migrate` has no `DATABASE_URL`

`drizzle.config.ts` reads `process.env.DATABASE_URL` and the npm script loads no env file, so `npm run db:migrate` fails with `url: undefined`. Ran `DATABASE_URL=… npx drizzle-kit migrate` instead (value taken from the project's own `.env.local`). Pre-existing tooling gap, not caused by this task; **not** fixed here (out of blast radius). Logged as a follow-up below.

### [Rule 1 — Bug] The race test read timestamps as strings, not `Date`s

First run of the race file failed 5/8 with `getTime is not a function`. Cause, and it is a genuinely load-bearing fact about this codebase: **`drizzle(client)` MUTATES the postgres.js client it is handed** — `drizzle-orm/postgres-js` installs a transparent parser for every date/time OID (1184 `timestamptz` included) so Drizzle can do its own column mapping. `setupTestDb` calls `drizzle(client)` on `testDb.client`, so a bare `SELECT checkout_lock_at` through it returns the raw Postgres string. Fixed by having Postgres format the value (`to_char(… AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`), which also yielded a **better precision proof**: the six-digit microseconds field is asserted to end in `000`, direct evidence that `date_trunc('milliseconds', now())` did its job (a raw `now()` reads e.g. `498074`). Reasoning recorded in the helper's docblock.

### [Rule 3 — Blocking] `vi.mock` hoisting in the new component test

A top-level `const confirmBooking = vi.fn()` above `vi.mock` throws `Cannot access 'confirmBooking' before initialization`. Switched to `vi.hoisted`, with the reason recorded inline.

## Verification

| Gate | Result |
|---|---|
| `npm run db:migrate` (0023) | applied clean; `checkout_lock_at` present on `booking` |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | **1112 passed \| 4 skipped \| 0 failures** (baseline 1096 + exactly the 16 new cases; no suite outside `tests/booking/` moved) |
| `npx eslint` (all touched src + tests) | clean |
| `ALTER TABLE … ADD COLUMN "checkout_lock_at"` anchored at line start | pass |
| journal contains `0023_booking_checkout_lease` exactly once | pass |
| no `accepted residual` / `CONCURRENCY RESIDUAL` in `booking.ts` / `paymongo.ts` | pass |
| `claimCheckoutLease` ≥2, `releaseCheckoutLease` ≥3 on executable lines of `booking.ts` | 2 / 3 |
| anti-pattern gate (comment-stripped) on `booking.ts` and `checkout-lease.ts` | pass |
| no executable `checkout-lease` reference in `reserve-actions.tsx` | pass |
| refusal literal appears exactly once in `src/` | pass |
| `git diff --exit-code` on webhook route, `bookability.ts`, `search/query.ts`, `reserve-view.tsx` | byte-unchanged |

Constraint #2 is additionally proven by **measurement**, not only by grep: `confirm-double-submit.test.ts` case (10) shows an independent connection can take `FOR UPDATE NOWAIT` on the booking row after a successful flow, with an in-test instrument check proving that same probe really does reject with `55P03` while a transaction holds the row.

## Known Stubs

None. No placeholder values, no unwired data paths.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema change beyond the single additive column, which is structurally inert for occupancy (it appears in no `booking_no_overlap` predicate, no expiry sweep and no read model).

## Named residual (accepted, deliberately not closed here)

**T-KV2-04** — the TTL bounds the **lease**, not the HTTP call. `paymongoFetch` sets no `AbortSignal`, so a request hung beyond 90s can still be overtaken. Probability is low (90s is ~45× the normal two-round-trip cost) and the blast radius is the pre-existing T-08-79 outcome, not a new one. Adding `AbortSignal.timeout` to `paymongoFetch` is the follow-up that would make the bound total; it was out of this plan's blast radius (constraint #5 kept `paymongo.ts` to a comment fix).

## Follow-ups (not done here)

1. **`npm run db:migrate` cannot see `DATABASE_URL`.** Either load `.env.local` in `drizzle.config.ts` (`dotenv`) or make the npm script do it. Every migration today needs the variable passed manually.
2. **T-KV2-04** — `AbortSignal.timeout` on `paymongoFetch`, per above.

## Commits

| Hash | Message |
|---|---|
| `c2bcd5f` | feat(quick-260801-kv2): add the compare-and-swap checkout lease |
| `1a7b076` | feat(quick-260801-kv2): claim the checkout lease in confirmBooking |
| `6a5e709` | feat(quick-260801-kv2): show the refused booker one calm sentence inline |
| `1a85510` | docs(quick-260801-kv2): close the T-08-79 record |

## Self-Check: PASSED

All five created files verified present on disk; all four commit hashes verified in `git log`. The only uncommitted path is this quick-task directory (`PLAN.md` + `SUMMARY.md`), which the orchestrator commits. `STATE.md` and `ROADMAP.md` were deliberately not touched — closing a phase residual is not a project-state transition.
