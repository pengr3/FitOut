---
phase: 07-bookings-management-cancellation-notifications
plan: 13
subsystem: notifications-reminders
tags: [inngest, cron, reminders, at-most-once, idempotency, db-clock, manage-03]
requires:
  - bookingReminder
  - reminderKind
  - emitNotify
  - NOTIFY_EVENT
  - composeWhenLabel
  - composeDeadlineLabel
  - isoUtc
  - formatMoney
  - PRE_EXPIRY_REMINDER_HOURS
  - PRE_SLA_REMINDER_HOURS
  - PRE_SESSION_BOOKER_REMINDER_HOURS
  - PRE_SESSION_HOST_REMINDER_HOURS
provides:
  - remindersSweep
  - queryDuePreExpiry
  - queryDuePreSessionBooker
  - queryDuePreSessionHost
  - queryDuePreSlaHost
  - claimReminder
  - remindOne
  - ReminderKind
  - ReminderRef
  - DueReminder
  - RemindOneResult
affects:
  - src/app/api/inngest/route.ts
tech-stack:
  added: []
  patterns:
    - "Reachability guard: `deadline - OFFSET >= created_at` — a fixed offset whose instant predates the booking is a NO-SEND, not an immediate send"
    - "Only JSON-safe scalars cross an Inngest step boundary; the row is re-read inside the per-item step"
    - "Send-time re-read of the due predicate, so a status checked at schedule time is not mistaken for a guarantee"
    - "One parameterised due query, batch mode anti-joins the claim table, single-row mode deliberately does not"
    - "Mutation-verified guard test (the guard was removed on purpose to prove the test fails)"
key-files:
  created:
    - src/inngest/functions/reminders.ts
    - tests/notifications/reminders.test.ts
  modified:
    - src/app/api/inngest/route.ts
decisions:
  - "The plan's range-only predicate fires an unreachable reminder IMMEDIATELY; a reachability guard against booking.created_at is what makes it a clean no-send"
  - "ReminderRef (two strings) is the only thing crossing a step boundary — a Date returned from find-due would reappear as a string on replay"
  - "remindOne re-reads the booking at SEND time, adding a third result member `skipped-not-due`"
  - "The single-booking reload omits the booking_reminder anti-join: the CLAIM is the authority on at-most-once, not the join"
metrics:
  duration: ~15m
  completed: 2026-07-21
  tasks: 2
  commits: 2
---

# Phase 7 Plan 13: Reminders Summary

The four D-85 reminders on an hourly singleton cron at `:45`, with at-most-once enforced by `booking_reminder`'s `UNIQUE(booking_id, kind)` claim rather than Inngest's 24-hour dedupe TTL — the last of the five events MANAGE-03 names.

## What Was Built

**Task 1 — the cron** (`16e4bbb`). `src/inngest/functions/reminders.ts` runs four DB-clock RANGE due queries (`pre_expiry`, `pre_sla_host`, `pre_session_booker`, `pre_session_host`), each status-scoped to a live state and each resolving its recipient by an explicit join (`booking.booker_id` for booker reminders, `listing.host_id` for host ones). `claimReminder` is an `INSERT … ON CONFLICT (booking_id, kind) DO NOTHING RETURNING id`; an empty return means already sent and emits nothing. `remindOne` re-reads, claims, then emits through the shared `emitNotify`. Registered as the fifth function at `/api/inngest`.

**Task 2 — the proof** (`cee8cdb`). `tests/notifications/reminders.test.ts` — 12 cases against a real isolated schema, every fixture instant computed by Postgres rather than the JS clock.

## The Three Guarantees, and How Each Is Actually Held

**At-most-once is a database constraint.** The INSERT *is* the lock; there is deliberately no app-level "already sent?" pre-query, because a `SELECT … then INSERT` is exactly the race the constraint exists to kill — the one shape that looks correct in review and fails only under concurrency. Proven with `makeRacingClients(schema, 2)`: two INDEPENDENT connections claiming the same `(booking, kind)` simultaneously produce exactly one winner and exactly one row. The shared `max:1` client would have serialized and proven nothing, so it is not used for that case. A second racing test drives the whole `remindOne` path concurrently: one `sent`, one `skipped-claimed`, one claim row, one emission. The Inngest step-retry shape (the same body running again, later, unchanged) is covered sequentially.

**The claim is written before the send.** A crash between the two loses a reminder rather than double-sending one — the strictly better failure under D-87, and the same ordering `payOne` uses for money. Test 7 pins the consequence honestly: when the transport rejects, `remindOne` still returns `sent`, the claim is still consumed, the reminder is genuinely lost, and a retry correctly reports `skipped-claimed`. A permanent send failure surfaces through the 07-07 `onFailure` `needs_attention` audit path, not through a re-send.

**A dead booking is never reminded about.** Two different failures, two different mechanisms. A booking already terminal when the sweep runs is excluded by the status-scoped predicate (test 8). A booking cancelled *after* it was scheduled is caught by the send-time re-read (test 9) — an Inngest step boundary is a real gap and a retried step can run much later than the tick that queued it, so a status checked only at schedule time is not a guarantee.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's range-only predicate fires an unreachable reminder IMMEDIATELY, not never**

- **Found during:** Task 2, writing the plan's own test case 6.
- **Issue:** The plan (and 07-RESEARCH Pitfall 9) both state that the `expires_at > now()` guard turns a D-96 cap-shortened SLA into a clean no-send, and the plan's test case 6 asserts *"yields ZERO rows from `queryDuePreSlaHost`"*. **With the plan's SQL it yields one row.** A request 4h out gets a ~2h SLA; `expires_at = now()+2h` satisfies `expires_at > now()` AND `expires_at <= now() + 6h`, so the range selects it on the very first tick and fires a "6 hours left" reminder roughly at the moment the request was created — spam, arriving alongside the request notification itself. `> now()` only excludes a deadline that has *already passed*; it says nothing about whether the reminder instant was ever reachable. The plan's SQL and the plan's test contradicted each other, and the phase brief resolves it explicitly: *"the correct behaviour is a clean NO-SEND, not a reminder fired immediately or one scheduled in the past."*
- **Fix:** A fourth clause on all four predicates — `deadline - make_interval(hours => OFFSET) >= b.created_at`. The reminder instant must have fallen inside the booking's own life. `booking.created_at` already exists (`defaultNow()`, not null), so no migration.
- **Mutation-verified:** removing the guard from `pre_sla_host` makes the unreachable case fail (`1 failed | 11 passed`); restored and green.
- **Accepted consequence, stated plainly:** a session booked less than an offset ahead gets no pre-session reminder — a booking made 23h out receives no 24h booker reminder. That is correct: the booking-confirmed notification sent 23h before the session already *is* that reminder, and a second one minutes later is noise. The host's 12h reminder for the same booking is still reachable and still fires; a dedicated test asserts that, so the guard is demonstrably about reachability rather than a blanket suppression of short-notice bookings.
- **Files modified:** `src/inngest/functions/reminders.ts`
- **Commit:** `cee8cdb`

**2. [Rule 1 - Bug] `DueReminder` must not cross an Inngest step boundary**

- **Found during:** Task 1, writing the sweep body.
- **Issue:** The plan's `DueReminder` carries `startsAt/endsAt/expiresAt` as `Date`, and the plan's sweep shape passes due rows from a `find-due` step into per-row steps. A step's return value is JSON-serialized and **memoized**: on a replay those `Date`s come back as **strings**, and every downstream `format()` call either throws or mislabels. This is the same class of failure as the `db.execute` timestamp contract, one layer up — and it would only appear on a retry, in production.
- **Fix:** `ReminderRef` (`{bookingId, kind}` — two strings) is the only thing crossing the boundary; the full row is re-read inside each send step. This costs one indexed lookup and buys the send-time status re-verification above for free.
- **Files modified:** `src/inngest/functions/reminders.ts`
- **Commit:** `16e4bbb`

### Deliberate Divergences from the Plan Text

**3. `RemindOneResult` has a third member.** The plan specifies `{status:"sent"} | {status:"skipped-claimed"}`. Added `{status:"skipped-not-due"}` for a booking that stopped qualifying between scheduling and sending. Without a distinct value, a cancelled-after-scheduling booking would have to be reported as one of the other two, both of which are untrue.

**4. `DueReminder` carries two fields the plan's interface omits.** `spacePriceCents` is **required** by `composeWhenLabel` — under D-74 the charged total is all-in and can never equal `hourlyRate × hours`, so deriving `fullDay` from `quotedTotalCents` would label *every* hourly booking "Full day" in *every* reminder, silently. (`quotedTotalCents` is still carried and still used, correctly, as the `totalLabel` money figure.) `bookerLabel` is required by the `reminder_pre_sla` payload, which names the guest to the host. Also added `listingId`, because the `pre_expiry` CTA points at the checkout for the hold that is about to lapse.

**5. The single-booking reload omits the `booking_reminder` anti-join.** The batch query anti-joins it to skip claimed rows cheaply; the reload deliberately does not. The claim, not the join, is the authority on at-most-once — letting the reload decide would turn a genuine duplicate into a `skipped-not-due` and hide the very race the constraint exists to report.

**6. Three CTA targets are the plan's "where relevant" left unspecified.** `pre_expiry` → `/listings/{id}/book?hold={bookingId}` (the same Phase-5 checkout `approveRequest` links to); `pre_session_booker` → `/bookings/{id}`; `pre_session_host` → `/host/bookings/{id}`; `pre_sla_host` → `/host/requests`. All absolute — one `href` feeds both channels (D-91) and a root-relative one is a dead link in an email client.

### Plan-Text Inaccuracies (no code impact)

- **Task 1 criterion** `grep -c "concurrency: 1"` **returns 1** only after two explanatory comments were reworded to say "singleton" / "the singleton setting" instead of quoting the literal. Same treatment 07-07 applied to its own comment-matching criteria; the documentation is unweakened.
- **Task 1 criterion** `grep -c "make_interval(hours =>"` returns **8**, not 4 (criterion is ≥4) — two per predicate, because the reachability guard needs the offset a second time.
- **Task 1 criterion** `grep -c "Date.now()\|new Date()"` returns **0** as required. Timestamp hydration uses `new Date(r.startsAtIso)`, which is a parse of a DB-sourced string, not a clock read, and does not match the literal `new Date()`.
- **Task 2** specified 8 cases; 12 shipped (the extra four: timestamp hydration, a second racing test over the full `remindOne` path, the reachable-short-notice counterpart to the unreachable case, and the cancelled-after-scheduling case).

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (both touched source files + the test) | clean |
| `npm run build` | exit 0 — **with the two documented env placeholders**, see below |
| `npx vitest run tests/notifications/reminders.test.ts` | **12 passed** |
| `npx vitest run tests/notifications` | **3 files / 35 tests passed** |
| `npx vitest run tests/notifications tests/booking` | **17 files / 168 tests passed** |
| **`npm test` (full suite)** | **75 files / 616 tests, all passing** (was 74/604 — this plan adds 1 file / 12 tests) |
| Reachability guard **mutation-verified** | removing it makes the unreachable case FAIL; restored |
| `grep -c 'cron: "TZ=Asia/Manila 45 \* \* \* \*"'` | 1 |
| `grep -c "ON CONFLICT (booking_id, kind) DO NOTHING"` | 1 |
| `grep -c "expires_at > now()\|starts_at > now()"` | 6 (criterion ≥4) |
| `grep -c "dbConn"` | 16 (criterion ≥6) |
| offset constants referenced | 12 (criterion ≥4); zero hardcoded offsets |
| `grep -c "remindersSweep" route.ts` | 3 (criterion ≥2) |
| `makeRacingClients` / `unreachable` / `skipped-claimed` in the test | 4 / 4 / 3 |

### On the build gate

`npm run build` requires `PLATFORM_WALLET_NUMBER`, `PLATFORM_WALLET_NAME` (`src/lib/paymongo.ts`, 05-02) and `INNGEST_SIGNING_KEY` (`route.ts`, 05b) because Next 16 collects page data with `NODE_ENV=production` and this machine's `.env.local` lacks the production secrets. Pre-existing, already logged in `deferred-items.md` by 07-06 and reconfirmed by 07-07; untouched here (relaxing a fail-closed money guard is not a drive-by change). With the placeholders supplied the build compiles clean and lists all 21 routes.

## Known Stubs

None. Every export is implemented and tested, and the cron is registered — an unregistered function would tick never and fail nowhere, which is why the registration comment now says so explicitly.

## Threat Flags

None. All new surface is covered by the plan's register (T-07-76..81), and two mitigations landed stronger than specified: **T-07-79** gained the send-time re-read (the plan's register only claimed schedule-time status scoping, which does not cover a booking cancelled between the two), and **T-07-76** gained a second racing test over the full send path rather than the claim alone. The T-07-81 log-discipline assumption is now asserted — test 7 checks no error log carries a recipient address.

## Commits

| Hash | Message |
|---|---|
| `16e4bbb` | feat(07-13): the four D-85 reminders on an hourly singleton cron at :45 |
| `cee8cdb` | test(07-13): at-most-once under a real race, and the D-96 unreachable no-send |

## For Downstream Plans

- **MANAGE-03 is now observably complete.** All five named events — confirmation, request received, approved/declined, cancelled, and reminder — emit through the one `fitout/notify` event, and 07-14's renderer already has copy and icons for all three reminder notification types, so the in-app half needed no changes here.
- **The four crons now occupy every quarter hour** (`:00` payout-sweep, `:15` request-expiry, `:30` payout-reconcile, `:45` reminders). A fifth cron needs a different cadence or an explicit contention decision.
- **Adding a fifth reminder kind** is a four-touch change: the `reminder_kind` pgEnum (a migration), the `ReminderKind` union, a `duePredicate` branch, and a `buildEvent` branch. The switches have no fallback clause, so each omission is a compile error rather than a silent gap. Keep it that way.
- **The reachability guard reads `booking.created_at`.** Any future path that back-dates or rewrites `created_at` will silently change which reminders are reachable. It is a scheduling input now, not just an audit column.
- **Do not "optimise" the send-time re-read away.** It is the only thing standing between a cancelled booking and a reminder email, and its cost is one indexed lookup per reminder.
- **A reminder that fails to send is genuinely lost, by design.** The claim is consumed either way. If loss ever becomes unacceptable, the fix is a `sent_at IS NULL` two-phase claim (claim → send → mark sent, with a bounded re-drive of unsent claims), not moving the claim after the send — that reintroduces double-sending.

## Self-Check: PASSED

Both created files verified present on disk (`src/inngest/functions/reminders.ts`, `tests/notifications/reminders.test.ts`) and both commit hashes verified in `git log`.
