---
phase: 08-group-bookings
plan: 12
subsystem: payments
tags: [paymongo, checkout-session, idempotency, drizzle-migration, database, group-bookings]

# Dependency graph
requires:
  - phase: 05-payments
    provides: src/lib/paymongo.ts — paymongoFetch, the Idempotency-Key discipline, and createCheckoutSession whose id this plan finally persists
  - phase: 08-group-bookings (08-05)
    provides: D-108's amount-scoped checkout key — the change that made a re-priced hold mint a SECOND payable session
provides:
  - "booking.checkout_session_id — a nullable, backfill-free text column, APPLIED to the live database (drizzle 0019)"
  - "expireCheckoutSession(id) in src/lib/paymongo.ts — POST /v1/checkout_sessions/{id}/expire with a SESSION-scoped stable Idempotency-Key"
  - "mockPayMongo.expireCheckoutSession — stub + reset() wiring, so 08-13 can assert on the call without touching the network"
  - "five mutation-proven regression cases in tests/payments/paymongo-calls.test.ts pinning the full URL, the key, the absent body and the thrown error"
affects: [08-13, 08-17, phase-09, any-future-checkout-session-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An idempotency key must be scoped to the RESOURCE the call retires, not to the business object that owns it — a booking owns many sessions over its life"
    - "A schema column is not landed until information_schema confirms it; tsc and next build read schema.ts and pass either way"

key-files:
  created:
    - drizzle/0019_booking_checkout_session.sql
    - drizzle/meta/0019_snapshot.json
  modified:
    - src/lib/db/schema.ts
    - src/lib/paymongo.ts
    - tests/helpers/mocks.ts
    - tests/payments/paymongo-calls.test.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "The Idempotency-Key is checkout-expire:<sessionId>, NOT checkout-expire:<bookingId> — a booking-scoped key would make the second session's expire replay the first call's 200 and silently leave a live session payable"
  - "The column is deliberately NOT UNIQUE and NOT indexed — a UNIQUE would turn a retried write into a constraint error on the money path, and the column is only ever read by primary key"
  - "The generated migration was renamed off drizzle-kit's 0019_mushy_hobgoblin adjective and the journal tag updated to match, so the migration history is readable"
  - "expireCheckoutSession THROWS on non-2xx rather than swallowing — 08-13 catches, audits needs_attention, and REFUSES the re-price"

patterns-established:
  - "Session-scoped idempotency: the createRefund one-refund-per-payment trap is now documented in BOTH places it bites (refund and expire), because the second occurrence proved it generalises"
  - "A [BLOCKING] migration task is verified against information_schema plus a fresh-schema replay, never against a green tsc"

requirements-completed: [GROUP-01]

# Metrics
duration: 20min
completed: 2026-07-28
---

# Phase 8 Plan 12: CR-02 Part 1 — Persist the Checkout Session Id and Ship the Expire Call Summary

**"Exactly one live checkout session per booking" is now an *enforceable* statement: the live session id has a home in the database (applied, not just declared), and the one module allowed to speak to PayMongo can retire a superseded session with a session-scoped key that makes a retry a no-op and a failure loud.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-28T05:59Z
- **Completed:** 2026-07-28T06:14Z
- **Tasks:** 3 of 3
- **Files modified:** 5 modified, 2 created

## Accomplishments

### Task 1 — `booking.checkoutSessionId` in the Drizzle schema (`7ecce6f`)

`checkoutSessionId: text("checkout_session_id")` sits at `src/lib/db/schema.ts:699`, inside the PayMongo
payment cluster — after `payment_id` (`:679`) and before `payment_method` (`:715`), so the three columns
describing one payment sit together. Nullable, no default, no backfill, exactly like every Phase-5/7/8
column around it.

The comment records the four facts a later reader needs: it holds the `cs_...` id of the **currently live**
session; `confirmBooking` writes it right after `createCheckoutSession` resolves; a re-price expires the id
found here **before** minting a new session; and NULL is a legitimate, expected state (a booking that never
reached checkout, or one confirmed before this column existed) for which no expire is attempted.

No index and no UNIQUE, both deliberate and both stated at the column:

- **Not indexed** — it is only ever read by primary key, alongside the rest of the booking row.
- **Not UNIQUE** — PayMongo session ids are already distinct on their side, and a UNIQUE here would turn a
  harmless retried write into a constraint error **on the money path**.

Nothing else in the table moved: the `booking_idem_uq` partial-unique index and the five
exclusion-constraint columns (`listing_id`, `unit`, `starts_at`, `ends_at`, `status`) are byte-identical.

> **Tripwire note (07-04 discipline).** The first draft of this comment used the lowercase word "unique"
> twice in prose, which moved `grep -c "unique" src/lib/db/schema.ts` from **23 to 24** and tripped the
> task's own "no new unique constraint" acceptance grep. The prose was reworded (`UNIQUE` / "distinct")
> rather than the criterion relaxed — a comment forbidding a thing must not itself trip the grep that
> detects the thing. Final count: **23, unchanged**.

### Task 2 — `[BLOCKING]` migration 0019, generated AND applied (`baf6bdc`)

`npm run db:generate` proposed **exactly one statement and nothing else** — no drop, no rename, no
constraint, no type change. That is itself a finding: `schema.ts` and the live database had **not** drifted
before this plan, so nothing rode along inside a money-path migration.

**`drizzle/0019_booking_checkout_session.sql` verbatim:**

```sql
ALTER TABLE "booking" ADD COLUMN "checkout_session_id" text;
```

Single line, backfill-free — identical in shape to the `0016_booking_full_day.sql` precedent.

drizzle-kit named it `0019_mushy_hobgoblin.sql`; it was renamed to the plan's name and
`drizzle/meta/_journal.json`'s `tag` updated to `0019_booking_checkout_session` to match, so the applied
filename and the migration history agree. (`drizzle/meta/0019_snapshot.json` is named off the index, not the
tag, so it needed no rename.) Journal entry:

```json
{ "idx": 19, "version": "7", "when": 1785218508230, "tag": "0019_booking_checkout_session", "breakpoints": true }
```

**Applied** with `DATABASE_URL` set inline for that one command only
(`DATABASE_URL=postgresql://fitout:fitout@localhost:5432/fitout npm run db:migrate` → `migrations applied
successfully!`). The value was never exported into the shell — every subsequent command re-confirmed
`DATABASE_URL: [<unset>]` before running, so `tests/setup.ts`'s non-overriding `.env.local` load stayed
authoritative and no integration test was affected.

**Live-database check (the verification that `tsc` cannot fake):**

```
$ docker exec fitout-db-1 psql -U fitout -d fitout -c \
    "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns
     WHERE table_name='booking' AND column_name='checkout_session_id';"

 table_name |     column_name     | data_type | is_nullable | column_default
------------+---------------------+-----------+-------------+----------------
 booking    | checkout_session_id | text      | YES         |
(1 row)
```

One row, `data_type = text`, `is_nullable = YES`, no default — exactly the declared shape.

**Fresh-schema replay:** `npx vitest run tests/booking/pending-hold.test.ts` → **4/4 passed**. That file
replays *every* file in `drizzle/` into an isolated schema from zero, so the new SQL is proven to apply
cleanly to a database that has never seen it — not just to the one already-migrated local instance.

### Task 3 (TDD) — `expireCheckoutSession` + mock + tests (`9b7c14d` RED → `06eddc9` GREEN → `44bf871`)

`src/lib/paymongo.ts:236-246` — `expireCheckoutSession(id: string): Promise<{ id: string }>`, immediately
after `createCheckoutSession`, through the same `paymongoFetch` helper:

```ts
const json = await paymongoFetch<{ data: { id: string } }>(
  `/v1/checkout_sessions/${id}/expire`,
  {
    method: "POST",
    idempotencyKey: `checkout-expire:${id}`,
    // No body — the endpoint takes none.
  },
);
```

No new env var, no new boot guard, no version constant — the module's existing `PAYMONGO_BASE`, auth header
and fail-closed guards cover it, and the path is fully versioned (`/v1/`) per the Pitfall-3 rule.

**The key is scoped to the SESSION, and that is the load-bearing decision.** Documented at the call site
because this is the second place the trap bites, the first being `createRefund`'s
one-refund-per-payment key: expiring one session twice must be a no-op (the stable key gives that), but a
booking legitimately owns **more than one session over its life** — that is exactly what a re-price
creates. A booking-scoped key would make the second session's expire **replay the first call's response**:
PayMongo answers 200, we believe the session was retired, and it stays payable. The pattern is now stated
in both places.

Failures **throw** through `paymongoFetch`'s descriptive error shape and are deliberately not swallowed —
08-13 catches, records a `needs_attention` audit, and refuses the re-price.

`tests/helpers/mocks.ts`: `expireCheckoutSession: vi.fn(async (id = "cs_test_123") => ({ id }))` beside
`createCheckoutSession`, plus its `mockPayMongo.expireCheckoutSession.mockClear()` line in `reset()` — a
stub missing from `reset()` leaks call counts between tests. The stub **echoes the id it was handed** so an
08-13 test can assert *which* session was expired, and can be overridden with `mockRejectedValueOnce` to
drive the refuse-the-re-price branch.

## Task 3 mutation testing (required by the plan)

**RED gate (`9b7c14d`), before any implementation:** `5 failed | 4 passed` —
`TypeError: expireCheckoutSession is not a function` on all five new cases, the four pre-existing cases
untouched.

**Mutation 1 — random key.** `idempotencyKey: \`checkout-expire:${randomUUID()}\``:

```
× POSTs to /v1/checkout_sessions/<id>/expire with Basic auth and a session-scoped Idempotency-Key
× uses the IDENTICAL Idempotency-Key on a retry of the same session, so a duplicate expire is a no-op
× scopes the key to the SESSION, not the booking — two sessions of one booking expire independently

AssertionError: expected 'checkout-expire:f4f72491-ebcf-4eb7-8c…' to be 'checkout-expire:cs_abc'
```
**3 failed** — a retry would mint a fresh key and re-hit PayMongo instead of being a no-op.

**Mutation 2 — booking-scoped (constant) key.** `idempotencyKey: \`checkout-expire:booking\``:

```
× POSTs to /v1/checkout_sessions/<id>/expire with Basic auth and a session-scoped Idempotency-Key
× uses the IDENTICAL Idempotency-Key on a retry of the same session, so a duplicate expire is a no-op
× scopes the key to the SESSION, not the booking — two sessions of one booking expire independently

AssertionError: expected 'checkout-expire:booking' to be 'checkout-expire:cs_one'
```
**3 failed** — and specifically the "two sessions expire independently" case, which is the exact production
failure (session B's expire replaying session A's response). This is the mutation that proves the test
pins *session*-scoping and not merely *some* stable string.

**Restored → GREEN.** `git diff --stat src/lib/paymongo.ts` showed `34 insertions(+)`, **0 deletions** —
a pure addition, confirming the mutations left nothing behind. `tests/payments/ tests/paymongo/`:
**17 files / 183 tests, exit 0.**

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run lint` | **0 errors**, 7 warnings (all pre-existing: 2 in wizard/RHF + 5 unused-var in `tests/helpers/mocks.ts`) |
| Live DB `information_schema.columns` | 1 row — `text` / `is_nullable=YES` (pasted above) |
| `npx vitest run tests/booking/pending-hold.test.ts` (fresh-schema replay) | **4/4 passed** |
| `npx vitest run tests/payments/ tests/paymongo/` | **17 files / 183 tests, exit 0** |
| `npx vitest run` (full suite, no `DATABASE_URL` override in shell) | **94 files / 815 tests, exit 0** (+5 tests over the 810 baseline) |
| `npm run build` (bare, no env workaround) | **exit 0**, 29 route entries listed — no PayMongo boot guard fired |

Full-suite delta is **+5 tests, 0 new files** — the five new cases all landed in the existing
`tests/payments/paymongo-calls.test.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Two new tests reused a single `Response` across calls**
- **Found during:** Task 3 GREEN
- **Issue:** The retry case and the two-sessions case used `fetchMock.mockResolvedValue(jsonResponse(...))`,
  which hands back the **same** `Response` object on every call. `paymongoFetch` does `await res.text()`,
  and a `Response` body can only be read once — so the second call threw
  `TypeError: Body is unusable: Body has already been read` from `src/lib/paymongo.ts:92`. A defect in the
  tests written in this task, not in the product.
- **Fix:** switched both multi-call cases to `fetchMock.mockImplementation(async () => jsonResponse(...))`
  so each call gets a fresh `Response`, with a comment naming the reason. The single-call cases keep
  `mockResolvedValue`.
- **Files modified:** `tests/payments/paymongo-calls.test.ts`
- **Commit:** `06eddc9`

**2. [Rule 1 — Bug] `lastCall`'s hand-written return type hid `rawBody` from `tsc`**
- **Found during:** plan-level verification (`npx tsc --noEmit` after the Task-3 commit)
- **Issue:** `lastCall` was left with its original explicit return-type annotation while its body was
  changed to delegate to the new `callAt`, which returns an extra `rawBody` field. TS narrowed to the
  declared type, so the no-body assertion failed compilation
  (`TS2339: Property 'rawBody' does not exist…`) — **while vitest passed**, because vitest transpiles
  without typechecking. A green test run is not a green `tsc`.
- **Fix:** `function lastCall(...): ReturnType<typeof callAt>` — restating the shape by hand is what let the
  two drift, so the annotation now derives from the single source.
- **Files modified:** `tests/payments/paymongo-calls.test.ts`
- **Commit:** `44bf871`

**3. [Rule 2 — Correctness] Reworded a comment that tripped its own task's acceptance grep**
- **Found during:** Task 1 verification
- **Issue:** Task 1's criterion is `grep -c "unique" src/lib/db/schema.ts` unchanged (23). The new column
  comment explained *why* the column is not unique, using the lowercase word twice — pushing the count to
  24 and making the tripwire fire on prose rather than on a constraint.
- **Fix:** reworded to `UNIQUE` / "already distinct on their side". Count back to **23**. The rationale is
  fully preserved; only the casing changed.
- **Files modified:** `src/lib/db/schema.ts`
- **Commit:** `7ecce6f`

### Naming deviation (allowed by the plan)

drizzle-kit generated `0019_mushy_hobgoblin.sql`. Per the plan's Task-2 instruction, the file was renamed to
`0019_booking_checkout_session.sql` and `drizzle/meta/_journal.json`'s `tag` updated to match. No adjective
left in the migration history.

## Authentication Gates

None. No PayMongo credential was needed — Task 3 stubs the global `fetch` and imports the real client, and
no live PayMongo call was made at any point in this plan.

## Known Stubs

None. This plan adds a persisted column and one REST client function; there is no UI, no placeholder copy,
and no hardcoded empty value.

## What This Plan Does NOT Close

**CR-02 remains OPEN.** This is the *enabling half* and is explicitly **not** a closure on its own
(threat register T-08-37). The column is empty on every row and `expireCheckoutSession` has no production
caller. Until **08-13** wires them in, a re-priced hold still leaves two payable sessions.

Concretely, `08-13` must:

1. Persist `checkout.id` into `booking.checkoutSessionId` in `confirmBooking` — it is still discarded at
   `src/app/actions/booking.ts:553`.
2. In `updateDeclaredPax`, **expire → then refreeze** (that ordering is a planning decision, not the
   executor's to revisit), and **refuse the re-price on a failed expire** — refusing costs a booker one
   retry, proceeding costs an unrefunded double capture.
3. Catch the throw into a `needs_attention` audit — never surface PayMongo's error text to the browser
   (the T-05-15 / T-08-39 discipline).

## Contracts for Downstream Plans

1. *The expire key is `checkout-expire:<sessionId>` and must stay session-scoped.* Two mutations prove the
   tests catch a change. A booking-scoped key is the exact bug this call exists to avoid — it would report
   success while leaving a session payable.
2. *A NULL `checkout_session_id` is normal, not an error.* Pre-0019 bookings and bookings that never reached
   checkout hold NULL. The re-price path must attempt **no** expire for a NULL, and must not treat it as a
   failure.
3. *`mockPayMongo.expireCheckoutSession` echoes the id it receives.* Assert on the argument to prove **which**
   session was expired — expiring the wrong one kills the session the booker is looking at while leaving the
   stale payable one alive. Override with `mockRejectedValueOnce` for the refuse-the-re-price branch. It is
   in `reset()`, so call counts do not leak between tests.
4. *`expireCheckoutSession` throws; it never returns a failure sentinel.* Callers must `try/catch`. An
   uncaught throw inside a server action would surface a raw 500 on the money path.
5. *The next migration is 0020.* `drizzle/meta/_journal.json` now ends at `idx: 19`.

## Threat Flags

None. Both new surfaces — the outbound expire call and the new column — are already dispositioned in this
plan's threat register (T-08-37 … T-08-40). No new endpoint, auth path, file access pattern, or trust-boundary
schema change was introduced beyond what the register anticipated.

## Self-Check: PASSED

**Files claimed created — all present:**
- `drizzle/0019_booking_checkout_session.sql` — FOUND
- `drizzle/meta/0019_snapshot.json` — FOUND

**Files claimed modified — all carry the claimed content:**
- `src/lib/db/schema.ts` — `checkout_session_id` at `:699` (exactly 1 match)
- `src/lib/paymongo.ts` — `/v1/checkout_sessions/${id}/expire` at `:240`, `checkout-expire:` at `:243`
- `tests/helpers/mocks.ts` — `expireCheckoutSession` ×2 (stub + `reset()`)
- `tests/payments/paymongo-calls.test.ts` — full-path assertion at `:113`
- `drizzle/meta/_journal.json` — `idx: 19`, tag `0019_booking_checkout_session`

**Commits claimed — all present in `git log`:**
- `7ecce6f` — FOUND (Task 1)
- `baf6bdc` — FOUND (Task 2)
- `9b7c14d` — FOUND (Task 3 RED)
- `06eddc9` — FOUND (Task 3 GREEN)
- `44bf871` — FOUND (tsc fix)

Working tree clean after the last task commit.
