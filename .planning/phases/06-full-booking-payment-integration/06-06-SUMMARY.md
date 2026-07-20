---
phase: 06-full-booking-payment-integration
plan: 06
subsystem: background-jobs
tags: [inngest, cron, request-to-book, sla-expiry, payment-window, db-clock, lazy-expiry, email, dual-timer]

# Dependency graph
requires:
  - phase: 06-full-booking-payment-integration
    plan: 01
    provides: "booking_status +requested/+approved + APPROVAL_SLA_HOURS / APPROVAL_PAYMENT_WINDOW_HOURS config (consumed at WRITE time; the sweep only reads expires_at <= now())"
  - phase: 06-full-booking-payment-integration
    plan: 02
    provides: "the in-tx stale-hold sweep terminal mapping (requested→declined, else→cancelled) this cron is the canonical source of + the lazy read predicates that free a lapsed slot between ticks + the request-expiry.test.ts DB-clock-manip scaffold"
  - phase: 06-full-booking-payment-integration
    plan: 03
    provides: "sendRequestDeclined(to, spaceTitle, whenLabel, { expired? }) fire-and-forget email leaf"
  - phase: 05-payments
    plan: 05a
    provides: "payout-sweep.ts — the 2-arg createFunction(options, handler) singleton cron shape (queryDuePayouts DB-clock sweep + per-row step.run) this file near-clones"
  - phase: 05-payments
    plan: 05b
    provides: "src/app/api/inngest/route.ts serve() mount + fail-closed prod INNGEST_SIGNING_KEY guard this appends to"
provides:
  - "requestExpirySweep — an hourly (minute-15, TZ=Asia/Manila) singleton Inngest cron that drives the VISIBLE terminal flip + booker email for lapsed request-to-book holds (D-64, BOOK-05/PAY-05)"
  - "queryExpired(dbConn) — the DB-clock now() sweep of requested/approved holds past expires_at (explicit dbConn for test injection, LIMIT 100)"
  - "expireOne(dbConn, row) — requested→declined (+ booker email) / approved→cancelled (silent); status-scoped RETURNING ⇒ idempotent (a re-run is a 0-row no-op)"
  - "the /api/inngest serve() now mounts all three crons [payoutSweep, payoutReconcile, requestExpirySweep]"
affects: [06-07, 06-08, request-to-book, sla-expiry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A scheduled sweep near-clones payout-sweep.ts: queryX(dbConn) DB-clock now() predicate (explicit dbConn for isolated-schema test injection) + 2-arg createFunction singleton (concurrency:1, cron in options.triggers) + per-row step.run"
    - "A status-scoped UPDATE ... WHERE id=$id AND status='<from>' RETURNING id is the idempotency lock: a re-run over an already-terminal row flips 0 rows, so the email side-effect fires ONLY on a genuine transition (mirrors payout-sweep's ON CONFLICT RETURNING claim)"
    - "Cron minute-offsetting (sweep :00, reconcile :30, request-expiry :15) keeps the three concurrency:1 crons from ever contending"
    - "A scheduled side-effect email is composed via a self-contained, self-swallowing helper (read + await send inside try/catch, log-and-continue) so it never throws out of the durable step — the same fire-and-forget realization 06-05 used for the confirmed email"

key-files:
  created:
    - src/inngest/functions/request-expiry.ts
  modified:
    - src/app/api/inngest/route.ts
    - tests/booking/request-expiry.test.ts

key-decisions:
  - "The DB clock now() is the SOLE expiry authority (T-06-16) — queryExpired keys off SQL `expires_at <= now()`, never a JS/client clock (mirrors the Phase-4 lazy-expiry discipline)."
  - "expireOne's UPDATE is status-scoped (`AND status='requested'|'approved'`) with `RETURNING id` — the empty-RETURNING 0-row path is the idempotency gate, so the declined email fires ONLY on a genuine flip and can never double-send on a re-run."
  - "This cron is the CANONICAL terminal mapping (requested→declined, approved→cancelled) the 06-02 in-tx sweep mirrors (Warning-1); it is also the SOLE booker-email authority — the in-tx sweep deliberately fires no email (accepted bounded race A6)."
  - "The approved→cancelled payment-window release is SILENT (NO email, D-66/A3 — the booker chose not to pay); only the requested→declined SLA path emails."
  - "The booker email is composed via a self-contained self-swallowing sendDeclinedNotice (venue-local whenLabel exactly as the reserve/confirmed-email surfaces; try/catch logs `[request-expiry] declined_email_send_failed`) that never throws out of the step (T-06-17) — a faithful, safer realization of the 06-03 `void sendXxx(...)` fire-and-forget contract."
  - "requestExpirySweep is offset to cron minute 15 so it never contends with the payout crons (sweep :00, reconcile :30, Pitfall 4); mounted alongside them in serve() with the fail-closed prod guard unchanged."

requirements-completed: []  # BOOK-05 / PAY-05 stay In-progress — the SLA/payment-window cron ships here, but the request-to-book loop only closes with host approve/decline (06-07) + the request views (06-08); completion validated at the phase transition, per the 06-01..05 cross-cutting precedent.

# Metrics
duration: ~14min
completed: 2026-07-20
---

# Phase 6 Plan 06: Request-Expiry Inngest Cron (SLA Auto-Decline / Payment-Window Auto-Release) Summary

**A DB-clock-authoritative dual-timer Inngest cron (`requestExpirySweep`, a near-clone of `payout-sweep.ts`) that flips `requested` holds past their SLA to `declined` (+ the booker declined/expired email) and `approved` holds past their payment window to `cancelled` (silent), mounted at cron minute 15 in the `/api/inngest` serve() alongside the two payout crons — the lazy reads already free the slot between ticks, so this cron owns only the visible flip + the email.**

## Performance
- **Duration:** ~14 min
- **Started:** 2026-07-20
- **Completed:** 2026-07-20
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- **`src/inngest/functions/request-expiry.ts` (new)** near-clones `payout-sweep.ts`: `queryExpired(dbConn)` is a DB-clock `now()` sweep — `WHERE (status='requested' AND expires_at <= now()) OR (status='approved' AND expires_at <= now()) ORDER BY expires_at ASC LIMIT 100` — with an explicit `dbConn` param so a test injects an isolated schema.
- **`expireOne(dbConn, row)`** branches on the row status: `requested` → `UPDATE booking SET status='declined', expires_at=NULL WHERE id=$id AND status='requested' RETURNING id`, and on a genuine ≥1-row flip fires the booker declined/expired email; `approved` → `… SET status='cancelled' … AND status='approved'` — the payment-window auto-release, **silent** (no email, D-66/A3). The `AND status='<from>'` scoping + `RETURNING id` make both flips idempotent (a re-run flips 0 rows → `noop`, never re-sends/re-flips).
- **Sole booker-email authority (A6).** The declined email flows through a self-contained `sendDeclinedNotice(dbConn, bookingId)` that joins booking⨝user⨝listing, composes the venue-local `whenLabel` `{date}, {time} ({City} time)` exactly as the reserve/confirmed-email surfaces, and `await`s `sendRequestDeclined(email, title, whenLabel, { expired: true })` inside a try/catch that logs `[request-expiry] declined_email_send_failed` and never throws out of the step (T-06-17).
- **Canonical terminal mapping (Warning-1).** requested→declined / approved→cancelled — the exact mapping the 06-02 in-tx stale-hold sweep mirrors via its `CASE`, so the terminal value never depends on which write path wins.
- **`requestExpirySweep`** = a 2-arg `createFunction({ id:'request-expiry-sweep', concurrency:1, triggers:[{ cron:'TZ=Asia/Manila 15 * * * *' }] }, …)` singleton, per-row `step.run`, offset to minute 15 so it never contends with the payout crons (sweep :00, reconcile :30 — Pitfall 4).
- **Mounted in `src/app/api/inngest/route.ts`** serve() `functions: [payoutSweep, payoutReconcile, requestExpirySweep]` — the fail-closed prod `INNGEST_SIGNING_KEY` guard + `runtime='nodejs'` are unchanged.
- **`tests/booking/request-expiry.test.ts`** (the 06-02 scaffold) filled: SLA auto-decline (declined + slot freed via an overlapping `createPendingHold` + emailed exactly once), payment-window release (cancelled + slot freed + NO email), sweep idempotency (a 2nd `expireOne` is a 0-row `noop` with no duplicate email), and selectivity (a live future-`expires_at` requested/approved row is never swept).

## Task Commits
Each task was committed atomically:

1. **Task 1: request-expiry cron + /api/inngest serve() mount** — `17aab91` (feat)
2. **Task 2: SLA auto-decline + payment-window auto-release tests** — `cdec048` (test)

**Plan metadata:** _(final docs commit — this summary + STATE.md + ROADMAP.md)_

## Files Created/Modified
- `src/inngest/functions/request-expiry.ts` (created) — `queryExpired` (DB-clock sweep, explicit dbConn, LIMIT 100), `expireOne` (requested→declined+email / approved→cancelled silent, status-scoped RETURNING ⇒ idempotent), `sendDeclinedNotice` (self-swallowing venue-local booker email), and the `requestExpirySweep` 2-arg createFunction singleton at cron minute 15.
- `src/app/api/inngest/route.ts` (modified) — imported `requestExpirySweep` and appended it to the serve() `functions[]` array; fail-closed prod guard + runtime unchanged; comment updated to "ALL THREE crons".
- `tests/booking/request-expiry.test.ts` (modified) — replaced the four `it.todo` placeholders with real cron-behavior tests (SLA auto-decline, payment-window release, idempotency, selectivity) against the isolated-schema harness; the 06-02 DB-clock-manip idiom test kept.

## Decisions Made
- **DB clock is the sole expiry authority (T-06-16).** `queryExpired` compares `expires_at` against SQL `now()`, never a JS `Date` — the same discipline as the Phase-4 lazy-expiry reads and the payout-sweep due predicate.
- **Status-scoped RETURNING is the idempotency lock.** `… WHERE id=$id AND status='<from>' RETURNING id` — an empty RETURNING means the row was already terminal, so `expireOne` returns `noop` and the email never re-fires. This is the direct analog of payout-sweep's `ON CONFLICT … RETURNING id` claim.
- **The email is awaited inside a self-swallowing helper, not a bare `void sendRequestDeclined(...)`.** A cron step has no ACK-latency constraint, so awaiting the read+send inside try/catch (log-and-continue) is the most robust realization of the fire-and-forget contract — identical to how 06-05 realized its confirmed email. It guarantees "never throws out of the step" (T-06-17) and makes the test deterministic without `vi.waitFor`.
- **Approved release is silent (D-66/A3).** Only the requested→declined SLA path emails; the booker who chose not to pay in the payment window gets no email.
- **BOOK-05/PAY-05 stay In-progress.** The SLA/payment-window cron ships here, but the request-to-book loop only closes with host approve/decline (06-07) + the request views (06-08); completion is validated at the phase transition, per the 06-01..05 cross-cutting precedent.

## Deviations from Plan
None — plan executed exactly as written.

The one realization choice worth noting (not a behavior deviation): the plan's `<interfaces>` sketched the email as an inline `void sendRequestDeclined(...)`; it is implemented as an `await`ed self-contained self-swallowing `sendDeclinedNotice` helper. This is the same faithful, safer realization 06-05 used for its confirmed email (STATE precedent) — it honors the fire-and-forget contract (a send/read failure never throws out of the step, T-06-17) while keeping the test deterministic. No behavior, status mapping, email content, or scheduling changed.

## Issues Encountered
None. Docker (`fitout-db-1`) was already up; vitest ran with no `DATABASE_URL` shell override per the machine convention (`.env.local` is the source).

## Verification
- `npx tsc --noEmit` — exit 0 (clean).
- `npx eslint src/inngest/functions/request-expiry.ts src/app/api/inngest/route.ts tests/booking/request-expiry.test.ts` — 0 errors.
- `npx vitest run tests/booking/request-expiry.test.ts` — 5 passed (harness + SLA decline + payment-window release + idempotency + selectivity).
- `npx vitest run tests/booking tests/paymongo tests/payments` — 18 files, 125 passed (up 4 from the prior 121/4-todo — the four former `it.todo` scaffolds are now real, green tests; no payout-cron/serve regressions).
- Acceptance greps: `expires_at <= now()` present for both branches; `TZ=Asia/Manila 15` cron; `requestExpirySweep` appended to serve() functions[].

## Threat Model Coverage
- **T-06-16 (Tampering — expiry authority):** mitigated — the sweep keys off SQL `now()` vs `expires_at` (DB clock), and every UPDATE is status-scoped + idempotent (a re-run is a 0-row no-op).
- **T-06-17 (DoS — email/read failure in a step):** mitigated — `sendDeclinedNotice` swallows read/send failures (`[request-expiry] …`) and never throws out of the step; the status flip is the durable side-effect and the lazy reads free the slot regardless.
- **T-06-18 (Info Disclosure — Inngest serve endpoint):** accept — the fail-closed prod `INNGEST_SIGNING_KEY` guard already gates the endpoint (unchanged); dev/test tolerate its absence.

## Known Stubs
None. The 06-02 `it.todo` placeholders this plan owned are now real, passing tests.

## Next Phase Readiness
- **06-07 (host approve/decline)** completes the request-to-book loop: the host acts within the SLA window this cron enforces; a `requested` hold the host never touches auto-declines here, an `approved` hold the booker never pays auto-releases here.
- The three concurrency:1 crons are cadence-separated (:00 / :15 / :30) and all mounted in `/api/inngest` serve().
- **Downstream reminder still in force:** any NEW read/occupancy predicate must mirror the occupying set `{pending,confirmed,requested,approved}` (or the complement) or a request-held slot reads as free.

## Self-Check: PASSED
- All 3 files exist on disk: `src/inngest/functions/request-expiry.ts` (created), `src/app/api/inngest/route.ts` (modified), `tests/booking/request-expiry.test.ts` (modified).
- Both task commits present in git history: `17aab91` (Task 1 feat), `cdec048` (Task 2 test).
- Acceptance markers verified: `expires_at <= now()` (both branches) + `TZ=Asia/Manila 15` in request-expiry.ts; `requestExpirySweep` imported + appended to serve() functions[] in route.ts.
- Suites green: request-expiry 5 passed; booking+paymongo+payments 125 passed; tsc exit 0; eslint 0 errors.

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
