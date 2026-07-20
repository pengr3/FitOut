---
phase: 06-full-booking-payment-integration
plan: 07
subsystem: server-actions
tags: [request-to-book, host-actions, approve, decline, owner-gate, idor, sla-guard, atomic-update, db-clock, pay-on-approval, email, rate-limit, audit]

# Dependency graph
requires:
  - phase: 06-full-booking-payment-integration
    plan: 01
    provides: "booking_status +requested/+approved + APPROVAL_PAYMENT_WINDOW_HOURS config (the approve flip sets expires_at = now() + this window)"
  - phase: 06-full-booking-payment-integration
    plan: 02
    provides: "the lazy read predicates that free a `declined` slot automatically (declined is non-occupying) — decline does NO manual slot manipulation"
  - phase: 06-full-booking-payment-integration
    plan: 03
    provides: "sendRequestApproved (booker pay-now) + sendRequestDeclined (booker) fire-and-forget email leaves"
  - phase: 06-full-booking-payment-integration
    plan: 04
    provides: "confirmBooking accepts an `approved` hold + the GREATEST/payment-window idiom the approve flip mirrors (the approved hold occupies the slot until the payment window lapses)"
  - phase: 06-full-booking-payment-integration
    plan: 06
    provides: "the request-expiry cron terminal mapping (requested→declined) + DB-clock SLA authority these actions race atomically against (status='requested' guard = whoever flips first wins)"
provides:
  - "approveRequest(requestId) — owner-gated, atomic, DB-clock SLA-guarded requested→approved flip that opens the booker's payment window + fires the pay-now email (HOST-01, the host side of the pay-on-approval fork)"
  - "declineRequest(requestId) — owner-gated atomic requested→declined flip that frees the slot automatically + fires the booker declined email"
  - "loadOwnedRequest(requestId, userId) — the BOOKING⨝LISTING host-ownership read (returns the row only if listing.hostId === userId AND canHost) that a missing id and a cross-host id both resolve to the SAME calm denial (IDOR/Security V4)"
  - "the exact /host/requests owner-scope READ predicate (WHERE listing.host_id=<host> AND status='requested' ORDER BY expires_at ASC) proven in an automated test — the predicate 06-08's inbox page consumes"
affects: [06-08, request-to-book, host-inbox]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A host mutation action clones the blocks.ts skeleton (session → owner-gate → mutate → revalidate) but swaps the listing-ownership guard for a BOOKING⨝LISTING host-ownership guard: a missing row and a cross-host row both return the SAME calm denial (leak nothing)"
    - "An atomic status-scoped UPDATE ... WHERE id=$id AND status='requested' [AND expires_at > now()] RETURNING id is the concurrency lock: a 0-row result (already-terminal, already-approved, or lapsed) yields a calm result, never a 500 or a silent flip; a race with the 06-06 SLA cron resolves atomically (whoever flips first wins)"
    - "Money-adjacent host actions carry rateLimit(`<action>:<userId>`) + recordAudit on denial (WR-06), mirroring confirmBooking"
    - "The booker email is dispatched fire-and-forget (`void sendXxx(...)`, T-06-22) after the successful flip so a Resend failure never rejects the action"

key-files:
  created:
    - src/app/actions/host-requests.ts
  modified:
    - tests/booking/request-lifecycle.test.ts

key-decisions:
  - "The (host) route group is NOT the gate (Security V4/T-06-19). loadOwnedRequest joins booking→listing→host-user(canHost)+booker-user(email) in ONE read and returns the row only if listing.hostId === session.user.id AND the host still holds canHost — else null. A missing id and a cross-host id resolve to the SAME calm denial so a guessed booking id leaks nothing (IDOR)."
  - "approveRequest is an ATOMIC DB-clock SLA-guarded flip: UPDATE booking SET status='approved', expires_at = now() + make_interval(hours => APPROVAL_PAYMENT_WINDOW_HOURS) WHERE id=$id AND status='requested' AND expires_at > now() RETURNING id. 0 rows → calm 'no longer pending' (a lapsed approve one second past the SLA is refused server-side, never a 500, never a silent approve; T-06-20)."
  - "On a genuine approve the flip opens the booker's FULL payment window (mirrors the 06-04 GREATEST/payment-window idiom — the approved hold keeps occupying the slot until the window lapses) and fires the pay-now email to /listings/[id]/book?hold=<id>."
  - "declineRequest is an ATOMIC status-scoped flip: UPDATE booking SET status='declined', expires_at=NULL WHERE id=$id AND status='requested' RETURNING id. Freeing the slot is AUTOMATIC — `declined` is non-occupying (06-01 EXCLUDE + 06-02 lazy reads), so there is NO manual slot manipulation."
  - "A race with the 06-06 SLA cron is fine: the status='requested' guard means whoever flips first wins atomically; a 0-row approve/decline on an already-declined/expired request returns a calm result, never a duplicate side-effect."
  - "Nothing is ever refunded/voided (D-63 — no money moved at request time). Both actions revalidatePath('/host/requests') + ('/host') for D-65 freshness (no websockets/polling)."
  - "Both booker emails are fire-and-forget (`void sendRequestApproved(...)` / `void sendRequestDeclined(...)`, T-06-22) so a Resend failure never rejects the server action; approve is rate-limited + audited (WR-06, money-adjacent, mirrors confirmBooking)."
  - "The /host/requests owner-scope READ isolation (host-A cannot see host-B's requests) is committed to an automated test HERE — the exact SELECT predicate 06-08's inbox page consumes (read-path IDOR closed before the page exists)."

requirements-completed: []  # BOOK-05 / PAY-05 / HOST-01 stay In-progress — the approve/decline actions ship here, but the request-to-book loop only closes with the inbox + booker views (06-08) + the human-verify checkpoint (06-09); completion validated at the phase transition, per the 06-01..06 cross-cutting precedent.

# Metrics
duration: ~18min
completed: 2026-07-20
---

# Phase 6 Plan 07: Host Approve/Decline Server Actions (Owner-Gated, Atomic, SLA-Guarded) Summary

**`approveRequest` + `declineRequest` (src/app/actions/host-requests.ts) — the host side of the pay-on-approval fork (HOST-01). Both clone the blocks.ts skeleton but swap the listing-ownership guard for a BOOKING⨝LISTING host-ownership guard where a missing id and a cross-host id return the SAME calm denial (IDOR/Security V4). Approve is an atomic DB-clock SLA-guarded `requested → approved` flip that opens the booker's full payment window and fires the pay-now email; decline is an atomic `requested → declined` flip that frees the slot automatically (declined is non-occupying) and emails the booker. The DB clock is the sole SLA authority; a race with the 06-06 cron resolves atomically via the `status='requested'` guard.**

## Performance
- **Duration:** ~18 min
- **Started:** 2026-07-20
- **Completed:** 2026-07-20
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- **`src/app/actions/host-requests.ts` (new, 250 lines)** — two POST server actions (never GET side-effects) that drive the pay-on-approval fork:
  - **`loadOwnedRequest(requestId, userId)`** joins booking→listing→host-user(canHost)+booker-user(email) in ONE read and returns the row only if `listing.hostId === userId` AND the host still holds `canHost` — else `null`. A missing id and a cross-host id both resolve to the SAME calm denial so a guessed booking id leaks nothing (IDOR/Security V4/T-06-19; the `(host)` route group is NOT the gate).
  - **`approveRequest(requestId)`** = rateLimit(`approve-request:<userId>`) + recordAudit-on-denial (WR-06, mirrors confirmBooking) → owner-gate → an ATOMIC DB-clock SLA-guarded flip `UPDATE booking SET status='approved', expires_at = now() + make_interval(hours => APPROVAL_PAYMENT_WINDOW_HOURS) WHERE id=$id AND status='requested' AND expires_at > now() RETURNING id`. 0 rows → calm 'no longer pending' (a lapsed approve is refused server-side, never a 500, never a silent approve; T-06-20). On ≥1 row it opens the booker's full payment window (mirrors the 06-04 GREATEST/payment-window idiom) and fires `void sendRequestApproved(bookerEmail, title, whenLabel, totalLabel, ${base}/listings/${listingId}/book?hold=${id})` fire-and-forget (T-06-22) → revalidatePath('/host/requests') + ('/host').
  - **`declineRequest(requestId)`** = owner-gate → an ATOMIC status-scoped flip `UPDATE booking SET status='declined', expires_at=NULL WHERE id=$id AND status='requested' RETURNING id`. Freeing the slot is AUTOMATIC — `declined` is non-occupying (06-01 EXCLUDE + 06-02 lazy reads), so there is NO manual slot manipulation → `void sendRequestDeclined(...)` fire-and-forget → revalidatePath('/host/requests') + ('/host').
- **DB clock is the sole SLA authority (T-06-20).** The `AND expires_at > now()` guard (approve) and the `AND status='requested'` guard (both) mean a race with the 06-06 SLA cron resolves atomically — whoever flips first wins; the loser gets a calm 0-row result.
- **whenLabel** composed venue-local `{date}, {time} ({City} time)` via date-fns + @date-fns/tz, re-deriving Full-day from the FROZEN quote (mirrors the 06-06 notice helper) — the actions never re-price.
- **`tests/booking/request-lifecycle.test.ts` (+207 lines)** — extended the 06-02/06-04 `vi.doMock` harness with 6 host-action cases (two REAL signed-up hosts A+B, direct `requested`-row seeding since HOST is plain-inserted and can't sign in).

## Task Commits
Each task was committed atomically:

1. **Task 1: approveRequest + declineRequest owner-gated server actions** — `779cc43` (feat)
2. **Task 2: approve/decline atomicity + SLA guard + owner-gate + owner-scope READ tests** — `e3408cc` (test)

**Plan metadata:** _(final docs commit — this summary + STATE.md + ROADMAP.md; the SUMMARY was authored by the orchestrator after the executor agent was cut off by a mid-response API connection error, from the fully-committed code + tests + the executor's already-written STATE/ROADMAP detail — see Issues Encountered.)_

## Files Created/Modified
- `src/app/actions/host-requests.ts` (created) — `approveRequest`, `declineRequest`, and the shared `loadOwnedRequest` owner-gate read; rate-limit + audit on approve; fire-and-forget booker emails; dual revalidatePath.
- `tests/booking/request-lifecycle.test.ts` (modified) — +6 host-action cases: (a) approve → approved + expires_at ≈ now()+`APPROVAL_PAYMENT_WINDOW_HOURS` + pay-now email carries `hold=<id>`; (b) SLA guard — approve on a lapsed row → calm 'no longer pending', status unchanged; (c) decline → declined + slot freed (a subsequent overlapping `createPendingHold` succeeds) + booker emailed; (d) owner-gate — host-B on host-A's request → NO state change + the SAME denial as a missing id; (e) idempotency — a 2nd approve/decline is a calm 0-row no-op; (f) NON-OPTIONAL /host/requests owner-scope READ isolation — host-A's owner-scoped inbox SELECT returns ONLY A's rows, never host-B's (the exact predicate 06-08 consumes).

## Decisions Made
- **Owner-gate is a server-side re-read, not the route group (Security V4/T-06-19).** `loadOwnedRequest` re-derives host ownership from booking⨝listing and re-checks canHost from the DB; a missing row and a cross-host row are indistinguishable to the caller (calm denial), closing IDOR on both the write actions and the modeled read predicate.
- **Atomic status-scoped UPDATE is the concurrency lock.** `WHERE id=$id AND status='requested' [AND expires_at > now()] RETURNING id` — a 0-row result (already-terminal, already-approved, or lapsed) is a calm result, never a 500 or a silent flip. A race with the 06-06 SLA cron resolves atomically.
- **Approve opens the full payment window.** `expires_at = now() + make_interval(hours => APPROVAL_PAYMENT_WINDOW_HOURS)` so the approved hold keeps occupying the slot until the booker's window lapses (mirrors 06-04's GREATEST idiom) — the booker then pays via the SAME Phase-5 hosted checkout (pay-on-approval, PAY-05/D-63).
- **Decline frees the slot automatically.** `declined` is non-occupying (06-01 EXCLUDE + 06-02 lazy reads), so there is no manual slot manipulation; nothing is refunded/voided (D-63 — no money moved at request time).
- **BOOK-05/PAY-05/HOST-01 stay In-progress.** The approve/decline actions ship here, but the request-to-book loop only closes with the inbox + booker views (06-08) + the human-verify checkpoint (06-09); completion is validated at the phase transition, per the 06-01..06 cross-cutting precedent.

## Deviations from Plan
None — plan executed exactly as written.

One non-deviation worth noting: `revalidatePath` uses the double-quote codebase convention (booking.ts / blocks.ts), so the plan's single-quote example acceptance grep matches the double-quote variant instead — the intent (both revalidations present per action) is fully met (4 `revalidatePath` lines, 2 per action).

## Issues Encountered
- **Executor agent cut off mid-response (recovered).** The gsd-executor agent finished both tasks — code committed (`779cc43`), tests committed (`e3408cc`), and STATE.md + ROADMAP.md updated in the working tree — but was terminated by an API "connection closed mid-response" error at the SUMMARY-write step, before writing/committing this SUMMARY.md or committing the tracking files. The orchestrator verified the recovered state independently against git + a fresh test run (both task commits present; `tests/booking/request-lifecycle.test.ts` 22 passed; `tsc --noEmit` exit 0; working tree held only the uncommitted STATE.md/ROADMAP.md the executor had already written) and closed the plan out: authored this SUMMARY from the fully-committed code and the executor's own STATE/ROADMAP detail, then committed SUMMARY + STATE + ROADMAP together. No code was re-run or altered.
- Docker (`fitout-db-1`) was up; vitest ran with no `DATABASE_URL` shell override per the machine convention (`.env.local` is the source).

## Verification
- `npx tsc --noEmit` — exit 0 (clean).
- `npx eslint src/app/actions/host-requests.ts tests/booking/request-lifecycle.test.ts` — 0 errors (per the executor; re-confirmed tsc clean at close-out).
- `npx vitest run tests/booking/request-lifecycle.test.ts` — 22 passed (16 prior + 6 new) — re-run independently at close-out.
- `npx vitest run tests/booking tests/payments tests/paymongo` — 131 passed (up 6 from 125; no regressions).
- Acceptance greps: `loadOwnedRequest` host-ownership join present; `status='approved'` + `make_interval(hours => APPROVAL_PAYMENT_WINDOW_HOURS)` + `AND status='requested' AND expires_at > now()` in approveRequest; `status='declined'` + `AND status='requested'` in declineRequest; `void sendRequestApproved` / `void sendRequestDeclined` fire-and-forget; 4 `revalidatePath` lines (2 per action).

## Threat Model Coverage
- **T-06-19 (IDOR / Elevation — cross-host request access):** mitigated — `loadOwnedRequest` re-derives host ownership server-side (booking⨝listing host_id === session.user.id AND canHost); a missing id and a cross-host id return the SAME calm denial; the owner-scope READ isolation is proven by an automated test.
- **T-06-20 (Tampering — SLA / status race):** mitigated — the atomic `status='requested' [AND expires_at > now()]` guard makes a lapsed approve, a double approve/decline, and a race with the 06-06 cron all resolve to a calm 0-row result, never a 500 or a silent flip.
- **T-06-21 (Money integrity):** mitigated — nothing is charged/refunded/voided at request time (D-63); the approved hold reuses the server-frozen quote at pay time (PAY-05).
- **T-06-22 (DoS — email failure in an action):** mitigated — both booker emails are fire-and-forget (`void ...`), so a Resend failure never rejects the action; approve is additionally rate-limited + audited (WR-06).

## Known Stubs
None. The actions are fully functional; 06-08 consumes the proven owner-scope READ predicate to render the host inbox.

## Next Phase Readiness
- **06-08 (/host/requests inbox + booker requested/approved states)** consumes the exact owner-scope SELECT proven here (`WHERE listing.host_id=<host> AND status='requested' ORDER BY expires_at ASC`) and wires the approve/decline actions to inbox buttons.
- **Downstream reminder still in force:** any NEW read/occupancy predicate must mirror the occupying set `{pending,confirmed,requested,approved}` (or the complement) or a request-held slot reads as free; 06-08's `/host/requests` page MUST use the exact owner-scope SELECT proven here.

## Self-Check: PASSED
- Both files exist on disk: `src/app/actions/host-requests.ts` (created), `tests/booking/request-lifecycle.test.ts` (modified).
- Both task commits present in git history: `779cc43` (Task 1 feat), `e3408cc` (Task 2 test).
- Acceptance markers verified: `loadOwnedRequest` host-ownership join; atomic SLA-guarded approve (`status='approved'` + `make_interval(hours => APPROVAL_PAYMENT_WINDOW_HOURS)` + `AND status='requested' AND expires_at > now()`); atomic decline (`status='declined'` + `AND status='requested'`); fire-and-forget `void sendRequestApproved` / `void sendRequestDeclined`; dual `revalidatePath`.
- Suites green (independently re-run at close-out): request-lifecycle 22 passed; booking+payments+paymongo 131 passed; tsc exit 0.

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
