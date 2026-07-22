---
type: deliberation
title: In-house the Inngest background-job layer (Postgres outbox + worker)
supersedes_candidate: D-56
status: recommended — not yet formalized as an ADR, not yet executed
created: 2026-07-22T10:47:24.843Z
gate: Do NOT execute mid-Phase-7. Formalize as an ADR superseding D-56 first, then plan as a slice BETWEEN phases.
---

# Deliberation — In-house the background-job layer

## Question

Should FitOut replace **Inngest** (the managed background-job runner chosen in **D-56**) with an
**in-house Postgres transactional outbox + a single long-lived worker process**, to remove the
third-party vendor from the money/notification path?

## Decision lean (this session)

**Yes — in-house it.** The user's stated driver: avoid a third-party vendor in the critical path.
The reasons that actually carry weight: vendor independence / no lock-in, everything inside the
Postgres we already trust for correctness, and it **closes the "dropped-event gap" that
`src/lib/notifications.ts:106` currently documents as merely deferred**. Cost is roughly neutral and
is NOT the deciding factor (see below).

This is a **recommendation captured for a future ADR**, not an executed change. No code was modified
this session.

## What Inngest does today (grounded in code)

Two distinct kinds of work are bundled under "Inngest":

1. **Four scheduled crons** (`src/app/api/inngest/route.ts` registers all five functions):
   - `payoutSweep` (:00) — `src/inngest/functions/payout-sweep.ts`
   - `requestExpirySweep` (:15) — `src/inngest/functions/request-expiry.ts`
   - `payoutReconcile` (:30) — `src/inngest/functions/payout-reconcile.ts`
   - `remindersSweep` (:45) — `src/inngest/functions/reminders.ts`
   Each is "wake up, `SELECT` due rows, act." **All correctness already lives in Postgres**
   (claim-with-status-transition, `FOR UPDATE`, ledger `kind` scoping, the GiST EXCLUDE). Inngest here
   is only an **alarm clock**.

2. **One event-driven fan-out** — `notify` (`src/inngest/functions/notify.ts`), triggered by
   `fitout/notify`. Two memoized steps: (1) write the durable `notification` row, (2) send the email.
   Memoization = an email retry can't duplicate the row. `onFailure` writes a `needs_attention`
   audit row (closed WR-04). This is the part that genuinely earns its keep.

## The in-house design (sketched against the real schema)

### `notification_outbox` table (Drizzle-expressible — no EXCLUDE)
- `id` (text PK) — **reused AS `notification.id`** when the worker writes the durable row; that reuse
  is the whole idempotency story (PK conflict on retry → `ON CONFLICT DO NOTHING`). Mirrors the
  house "UNIQUE is the lock" idiom (`booking_reminder` `UNIQUE(booking_id, kind)`, schema.ts:489).
- Flattened `NotifyEvent`: `type`, `recipient_id`, `booking_id`, `email` (nullable), `payload` (jsonb).
- Queue metadata: `state` pgEnum(`pending|processing|done|failed`), `attempts`, `next_attempt_at`,
  `locked_at`, `last_error`, `created_at`, `processed_at`.
- Partial index `WHERE state = 'pending'` on `next_attempt_at` (the `notification_unread_idx` trick).

### The load-bearing inversion — `emitNotify` moves INTO the transaction
- **Today** (`notifications.ts:100`): "⚠️ NEVER CALL INSIDE A DATABASE TRANSACTION" — because
  `inngest.send` is an outbound HTTP call and a rollback would orphan a sent event.
- **Outbox INVERTS this**: emit becomes an `INSERT` into `notification_outbox` in the **same
  transaction** as the state change. Commit is atomic (state change + intent land together, or
  neither). This is what **closes the accepted dropped-event gap** — there is no post-commit HTTP
  hop left to fail.

### Worker (claim-then-process, connection-pool-aware)
- Its **own** small `postgres({ max: 2 })` client (do not draw from the app's `max: 10` pool).
- CLAIM: `UPDATE ... SET state='processing', locked_at=now() WHERE id IN (SELECT ... WHERE
  state='pending' AND next_attempt_at <= now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20)
  RETURNING *` — flips a batch and releases the row lock immediately (no lock held across SMTP).
- Step 1 = `insertNotification` with `id = row.id` + `ON CONFLICT DO NOTHING` (memoization equivalent).
- Step 2 = **reuse `sendForType` verbatim** (`notify.ts`) — the pure dispatcher is unchanged.
- Failure → `attempts++`; `>= MAX` → `recordAudit('needs_attention', ...)` (the `onFailure`
  equivalent) + `state='failed'`; else exponential backoff via `next_attempt_at`.
- **Reaper**: reset `state='processing' AND locked_at < now() - interval '5 min'` → `pending`
  (crash recovery — the one thing Inngest did invisibly that we now own).
- **Wake mechanism**: poll every ~2s OR — recommended — **`LISTEN/NOTIFY`** (emit fires
  `pg_notify('outbox')`, delivered at commit; worker sleeps otherwise → zero idle query load).

### Crons → scheduled tasks in the same worker
- Same batch model; internals unchanged. `remindersSweep` already uses the `booking_reminder`
  UNIQUE-claim for exactly-once, so it's already in-house-shaped and does NOT rely on Inngest's
  (documented-as-unreliable 24h) idempotency key.

### Footprint
- **Add**: `notification_outbox` table + generated migration; `src/worker/` (entry + drain + scheduler)
  + its own pg client.
- **Change**: `emitNotify` → txn-local INSERT taking `dbConn` (+ flip its docstring rule);
  `insertNotification` → accept injected id + `ON CONFLICT DO NOTHING`; move the emit inside the txn
  at the 5 call sites (booking.ts, re-request.ts, host-requests.ts, cancel-booking.ts, webhook/route.ts).
- **Reuse as-is**: `sendForType` + all `email.ts` senders; `notifyEventSchema`; `recordAudit`.
- **Delete**: `src/inngest/*` (5 fns + client), `/api/inngest/route.ts`, the `inngest` dependency,
  `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`.
- **Deploy**: one new `worker` process alongside `web` (a Procfile line / compose service).

## Performance implications

- **Crons**: identical Postgres load — same SELECT-due-rows-and-act; only the trigger source changes.
- **notify**: user-facing request latency **slightly better** (drops the post-commit HTTP hop; emit
  becomes a sub-ms INSERT). Delivery latency is controllable (poll interval, or `LISTEN/NOTIFY` for
  <100ms). Costs are **operational, not throughput**.
- No new datastore (the win over the BullMQ+**Redis** alternative). Postgres-as-a-queue vacuum
  pressure is real only at very high volume — irrelevant at single-city launch scale.

## Cost of operation

- **Neutral at launch**: Inngest free tier ($0) vs. one small always-on worker box (~a few $/mo).
- **Cheaper at scale**: flat worker cost vs. usage-priced vendor bill; crossover = the moment you'd
  exceed Inngest's free tier.
- **No second datastore** (unlike BullMQ+Redis).
- The real cost is **one-time engineering** (~2 files + owning backoff/reaper/observability), offset
  by shedding the vendor-integration maintenance (SDK upgrades, signing-key rotation, API drift).
- Verdict: decide on **control + correctness, not price**.

## Metrics / capacity model

Three layers (do not conflate):
- **Worker** = fixed infra, NOT per-transaction. **1** process (2 for HA). SKIP LOCKED makes 2 safe.
- **Job** = one outbox row (one notification) OR one cron-picked side-effect (payout transfer, refund).
- **Execution/step** = notify job → **2** (write row → send email); payout/refund → **1**; retries
  add executions only on failure.

Jobs & executions per workflow (immediate = written in the request txn; deferred = cron/later):

| Workflow | Immediate jobs | Deferred jobs | Lifetime jobs | Executions |
|---|---|---|---|---|
| Instant book & pay | 1 (`booking_confirmed`) | 2 reminders + 1 payout | ~4 | ~7 |
| Request → approve → pay | 4 (received + to-host + approved + confirmed) | ≤4 reminders + 1 payout | ~7–9 | ~13–15 |
| Request declined/expired | 2–3 | 0–1 reminder | ~3–4 | ~6–8 |
| Booker cancels | 2 + 1 refund call | 0–1 retained payout | ~3–4 | ~5–7 |
| Host cancels | 3 (2 notifs + 1 refund call) | 0 | ~3 | ~5 |

Jobs per transaction are **bounded single digits** — no fan-out grows with attendees/listings.

**Fixed cron baseline**: 4 crons × hourly = 96 ticks/day, volume-independent.

**Aggregate @ ~100 bookings/day** (70% instant / 30% request / ~10% cancel): ~400 notify + ~250
reminders + ~110 payouts/refunds ≈ **~750 jobs/day ≈ 0.009 jobs/sec avg**; ~1,300 step-executions/day.
A single worker (poll 2s, batch 20) clears ~36,000 jobs/hour → **~50× the daily volume in one hour**.
Sizing conclusion: **1 worker, ~50–100× over-provisioned at launch.**

**Does polling count as an execution?** No — an empty poll does zero work, processes no job, and hits
no meter; it was excluded from the ~1,300/day. As a raw DB op it's a microsecond index probe; at 2s
that's a constant ~43k empty SELECTs/day/worker, volume-independent and near-free. `LISTEN/NOTIFY`
drops it to ~0 (worker sleeps, wakes only on real work) → recommended default so idle query load is zero.

## Recommendation

1. In-house the layer as designed above.
2. **Default the design to `LISTEN/NOTIFY`** (zero idle query load) and a **single worker** (2 for HA).
3. Formalize as an **ADR that supersedes D-56** via a GSD decision cycle.
4. Schedule as a slice **between phases** — NOT mid-Phase-7 (Phase 7 is blocked on the human QRPh
   probe at 07-16; ripping out Inngest now would churn the 628 green tests).

## Gate / constraints for a resuming agent

- Do NOT begin implementation before the ADR superseding D-56 exists and Phase 7 has closed.
- The `emitNotify` transaction-rule inversion is the crux — get it right or the robustness win is lost.
- Reuse `sendForType` and the `email.ts` senders unchanged; the change is transport, not templates.
