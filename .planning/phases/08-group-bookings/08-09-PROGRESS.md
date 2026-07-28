---
phase: 08-group-bookings
plan: 09
status: in-progress
tasks_complete: 1
tasks_total: 2
blocked_on: "Task 2 — checkpoint:human-verify (gate: blocking)"
---

# Phase 08 Plan 09 — IN PROGRESS (Task 1 done, Task 2 blocking)

> This is **not** a SUMMARY. Plan 08-09 is **not complete**: Task 2 is a blocking
> `checkpoint:human-verify` that only a human can perform. The real
> `08-09-SUMMARY.md` gets written after the human signs off. This file exists so the
> Task-1 mutation evidence survives the checkpoint pause and does not have to be re-run.

## Task 1 — Full suite green + GROUP-05 race mutation-verification — DONE

No files modified (`<files></files>`). The mutation was applied and reverted; nothing was committed
in a mutated state.

### Full suite (baseline, before mutation)

```
 Test Files  92 passed (92)
      Tests  792 passed (792)
   Duration  100.49s
```

### Full suite (after mutation reverted, exit code captured)

```
 Test Files  92 passed (92)
      Tests  792 passed (792)
   Duration  125.65s

FULL_SUITE_EXIT=0
```

Against the Phase-7 baseline of 78 files / 655 tests: **+14 files / +137 tests**. Acceptance criterion
("above the Phase-7 baseline") met.

### Mutation A — the PLAN's literal instruction: remove `FOR UPDATE` from `src/lib/group/seat-claim.ts`

```diff
--- a/src/lib/group/seat-claim.ts
+++ b/src/lib/group/seat-claim.ts
@@ -51,7 +51,6 @@ export async function claimSeat(
         const [g] = (await tx.execute(sql`
           SELECT capacity_snapshot FROM booking_group
           WHERE id = ${args.groupId} AND voided_at IS NULL
-          FOR UPDATE
         `)) as unknown as { capacity_snapshot: number }[];
```

Result — **STAYED GREEN**, so this mutation does NOT prove the gate:

```
=== RUN RACE TEST (production FOR UPDATE removed) ===
 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  1.99s
EXIT=0
```

And the whole group suite also stayed green with the production lock deleted:

```
=== tests/group/ with production FOR UPDATE removed ===
 Test Files  6 passed (6)
      Tests  60 passed (60)
   Duration  15.89s
EXIT=0
```

**Why:** `tests/group/seat-claim-race.test.ts` never imports `claimSeat` — it INLINES the seat-claim SQL
inside each racer's transaction by design (its own header explains this, and the design is sound: it makes
the lock itself the thing under test). So the plan's Task-1 text is not executable as written. Logged as
**deferred-items.md item 4** — the shipped `claimSeat` lock has no mutation coverage.

### Mutation B — the gate as the test file's own header and 08-VALIDATION.md define it

Removed the inlined `FOR UPDATE` at `tests/group/seat-claim-race.test.ts:91`. **RED, for the right reason:**

```
 ❯ tests/group/seat-claim-race.test.ts (2 tests | 2 failed) 712ms
     × caps 3 concurrent →yes at capacity_snapshot=1 — exactly ONE 'yes' ever survives 58ms
     × caps 4 concurrent →yes at capacity_snapshot=2 — exactly TWO 'yes' survive (not merely 'one') 55ms

AssertionError: expected 3 to be 1 // Object.is equality
- Expected
+ Received
- 1
+ 3
 ❯ tests/group/seat-claim-race.test.ts:117:28

AssertionError: expected 4 to be 2 // Object.is equality
- Expected
+ Received
- 2
+ 4
 ❯ tests/group/seat-claim-race.test.ts:137:28

 Test Files  1 failed (1)
      Tests  2 failed (2)
EXIT=1
```

This is a real assertion failure after a 712ms run — **not** a compile error, **not** a syntax error,
**not** a timeout.

The first assertion (`claimedCount`) fires before the committed-row re-count, so the `claimedCount`
assertion was temporarily softened to a `console.log` to reach the load-bearing one. That yields direct
proof of **committed** overflow, read back through an INDEPENDENT connection (`testDb.client`):

```
AssertionError: expected 3 to be 1 // Object.is equality
- Expected
+ Received
- 1
+ 3
 ❯ tests/group/seat-claim-race.test.ts:124:17
    122|       const [{ n }] = await testDb.client`
    123|         SELECT count(*)::int AS n FROM rsvp WHERE group_id = ${CAP1_GI…
    124|       expect(n).toBe(1);

AssertionError: expected 4 to be 2 // Object.is equality
- Expected
+ Received
- 2
+ 4
 ❯ tests/group/seat-claim-race.test.ts:141:17
```

**3 committed 'yes' rows at `capacity_snapshot = 1`** and **4 at `capacity_snapshot = 2`** — exactly the
overflow signature the gate demands.

### Restore — GREEN again

```
RESTORE-B OK: race test byte-identical
seat-claim.ts still byte-identical
src/lib/group/seat-claim.ts:54:          FOR UPDATE
tests/group/seat-claim-race.test.ts:91:      SELECT capacity_snapshot FROM booking_group WHERE id = ${groupId} FOR UPDATE
=== GREEN RE-RUN ===
 Test Files  1 passed (1)
      Tests  2 passed (2)
EXIT=0
```

`git diff --exit-code src/lib/group/seat-claim.ts tests/group/seat-claim-race.test.ts` exits **0**;
`git status --porcelain` is **empty**; HEAD unchanged at `dea2cd4`. The mutated state was never committed.

## Task 2 — Cross-session guest RSVP + real email — NOT STARTED (blocking checkpoint)

No product code was written for Task 2, per the plan ("Claude makes NO code changes here").

### UAT fixture prepared (test data only, fully reversible)

The seed genuinely had **zero** future-dated confirmed bookings (all 4 confirmed rows start
`2026-07-25` or earlier; `now()` = `2026-07-28`), confirming the 08-08 report. A group created against
any of them lands straight in `closed`. Fixture created:

```sql
INSERT INTO booking (
  id, listing_id, unit, booker_id, starts_at, ends_at, status,
  quoted_total_cents, space_price_cents, service_fee_cents, currency,
  booking_mode, cancellation_policy, full_day
) VALUES (
  'uat-08-09-group', 'uat_listing_bookable', 1, 'AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy',
  '2026-08-05 02:00:00+00', '2026-08-05 04:00:00+00', 'confirmed',
  100000, 100000, 0, 'php',
  'request', 'standard', false
);
```

Reversal:

```sql
DELETE FROM rsvp WHERE group_id IN (SELECT id FROM booking_group WHERE booking_id='uat-08-09-group');
DELETE FROM booking_group WHERE booking_id='uat-08-09-group';
DELETE FROM booking WHERE id='uat-08-09-group';
```

A NEW row was created rather than moving an existing booking forward because every existing confirmed
booking carries Phase-7 baggage: `61726f09…` has a stray `host_cancel_fee` ledger row (`uat-t9-cancelfee`,
`held`, net −30000), and `42132ab1…` is the live PayMongo refund fixture (payment
`pay_C4PW6fRGtUTNm6GsKCpt4P36`) that step 5's cancellation must not touch. The new row has
`payment_id = NULL`, so step 5 cancels cleanly without attempting a real refund.

All three D-119 group-entry conditions hold for it (`page.tsx:555`): `status === 'confirmed'` ✅,
`sessionAhead` ✅ (2026-08-05 > 2026-07-28), `occupancyMode === 'exclusive'` ✅. `capacity_snapshot` will
freeze at **12** from `listing.max_occupancy`.

### Env readiness — both required vars PRESENT; nothing missing blocks the UAT

| Var | State | Consequence |
|-----|-------|-------------|
| `RESEND_API_KEY` | **SET** (`re_…`, len 36) — validated live, `GET /domains` → HTTP 200 | Real Resend delivery is ON; `email.ts` does NOT take the `[email:dev]` branch |
| `INNGEST_DEV` | **SET** (`1`) | `emitNotify` enqueues will not fail silently |
| `BETTER_AUTH_URL` | **SET** (`http://localhost:3000`) | Invite links compose absolutely |
| `EMAIL_FROM` | **MISSING** (falls back to `FitOut <onboarding@resend.dev>`) | Test-mode sender — see below |

`GET /domains` returned `{"object":"list","has_more":false,"data":[]}` — **no verified domain**. So with
the `onboarding@resend.dev` fallback sender, Resend delivers **only to the account owner**,
`pengr.clmc.3@gmail.com`. That is the address the guest-with-email RSVP must use at step 3.

Nothing was changed in `.env.local`.

### Known limitation of this fixture

`uat_listing_bookable.extra_head_fee` is **NULL**, so the plan's **optional step 6** (PaxStepper re-quote,
"Extra guests" breakdown line, top-up nudge) is **not exercisable** on this listing. It needs a listing
with an extra-guest fee set in the wizard.
