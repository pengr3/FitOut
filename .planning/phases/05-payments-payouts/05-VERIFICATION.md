---
phase: 05-payments-payouts
verified: 2026-07-16T22:20:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 5: Payments & Payouts Verification Report

**Phase Goal:** Money flows correctly through the proven booking core — the booker pays the full listed price on a hosted PayMongo checkout (cards/GCash/Maya/QR Ph), the booking confirms only when the `checkout_session.payment.paid` webhook lands, the platform keeps a host-side commission, and the host is paid `price − commission` only after the session via a delayed inhouse transfer held on the platform wallet — with a refund mechanism that never keeps money for an undeliverable slot.

**Verified:** 2026-07-16T22:20:00Z
**Status:** human_needed (all automated must-haves pass; real PayMongo money-movement is UAT-gated by a standing external beta-enablement blocker, which requires human sign-off, not a code gap)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criteria) | Status | Evidence |
|---|---|---|---|
| 1 | Booker can pay via PayMongo hosted checkout (cards/GCash/Maya/QR Ph), full amount collected to the platform wallet | VERIFIED | `src/lib/paymongo.ts:173-213` `createCheckoutSession` posts to `/v1/checkout_sessions` with `payment_method_types: ["card","gcash","paymaya","qrph"]` and `amount: input.amountCents`. `src/app/actions/booking.ts:236-247` calls it with `amountCents: bk.quotedTotalCents` (server-frozen, read from DB, never client-supplied) and `redirect(checkout.checkoutUrl)` sends the booker off-site. Test: `tests/payments/checkout-create.test.ts` asserts the mock received exactly `quotedTotalCents`. |
| 2 | Platform deducts a host-side commission (10%, config-tunable); booker breakdown stays subtotal=total; host receives price−commission | VERIFIED | `src/lib/payments/commission.ts` `computeCommission` = `Math.round(gross*rateBps/10000)`, `net = gross - commission`, default rate from `COMMISSION_RATE_BPS` (`src/lib/payments/config.ts`, env-tunable, default 1000bps). `src/components/booking/price-breakdown.tsx` has no commission/fee line, final copy "Final price — no added fees." `src/components/host/payout-row.tsx` renders `FitOut service fee (10%) −{commission}` / `Your payout {net}` to the HOST only. 13/13 commission unit tests green (boundaries, fuzz invariant `commission+net==gross`). |
| 3 | Payment state driven by signature-verified, idempotent `checkout_session.payment.paid` webhook (confirm authority) + refund events — NOT the browser redirect | VERIFIED | `src/app/actions/booking.ts` confirmBooking no longer contains a `SET status='confirmed'` sync flip (grep-confirmed absent). `src/app/api/paymongo/webhook/route.ts:200-289` verifies `Paymongo-Signature` (HMAC-SHA256, constant-time) before any parsing, dedupes via `paymongo_event`, and only its `checkout_session.payment.paid` branch flips `pending→confirmed` (`UPDATE booking SET status='confirmed' ... WHERE status='pending'`). `src/app/bookings/[id]/page.tsx` renders `PendingPaymentState`/`PaymentReversedState` based on DB `status`, never trusting `?paid=1` as proof. Tests: forged-signature→400 (no state change), replay-once, confirm-even-with-past-expiry (payment is authority) — all present and green. |
| 4 | Host is paid `price − commission` via inhouse `/v2/batch_transfers` fired T+24h after session ends (held until then; never paid at booking time), at most once per booking | VERIFIED (with a documented robustness gap — see Anti-Patterns/CR-01) | `src/inngest/functions/payout-sweep.ts` — `queryDuePayouts` selects only `status='confirmed' AND ends_at + PAYOUT_DELAY_HOURS <= now()` (DB clock) with no existing ledger row. `payOne` claims via `INSERT ... ON CONFLICT (booking_id) DO NOTHING RETURNING id` (DB-enforced at-most-once — proven under `makeRacingClients` concurrency in `payout-sweep.test.ts`), then correlates the wallet to `b.paymongoAccountId` (never `wallets[0]`, proven by a multi-host A→A/B→B test), then fires `createBatchTransfer({netCents, ...})` moving the ledger Held→Processing. `payout-reconcile.ts` polls `GET /v2/transfers/{id}` and closes Processing→Paid/Failed idempotently. Live DB confirms `host_payout_ledger` with `UNIQUE(booking_id)`. **However**, code review finding CR-01 (independently re-verified by reading `payout-sweep.ts:93-143`) shows a real gap: `listWalletAccounts()` (line 109) is a network call that can throw and is NOT wrapped in the try/catch that only guards `createBatchTransfer`; a throw there, or a no-match wallet, leaves the claimed ledger row permanently `held` because `queryDuePayouts`'s `LEFT JOIN ... WHERE p.id IS NULL` never re-selects a booking once any ledger row exists, and the reconcile cron only ever touches `state='processing'` rows. This is a genuine, verified defect in the failure-recovery path, not a fabricated concern — see Anti-Patterns below. |
| 5 | Genuinely-gone-slot payment auto-refunded (or operator-alerted for QRPh); host sees per-booking payout status (Held/Processing/Paid/Refunded) with commission breakdown | VERIFIED | `handleGoneSlot` in `webhook/route.ts` branches: `REFUNDABLE_RAILS = {card,gcash,grab_pay,paymaya}` → `createRefund` for the frozen amount; else (`qrph`/`dob_ubp`/unknown) → `console.error("[PAYMENT_ALERT] needs_manual_refund", ...)` + `recordAudit(outcome:'needs_attention')`, never calling the refund API for an unrefundable rail. Both branches set `status='cancelled'` guarded `status<>'confirmed'`. `src/app/(host)/host/earnings/page.tsx` (owner-gated, `WHERE host_id = session.user.id`, live-verified in `earnings-view.test.ts` host-A-never-sees-host-B) renders `PayoutStateBadge` (Held/Processing/Paid=success/Refunded, Failed=destructive Alert) + the gross→−10%→net breakdown + `PayoutSummary` (Upcoming=Held+Processing, Paid out=Paid). |

**Score:** 5/5 truths verified (4 cleanly; 1 verified-with-a-documented-gap, tracked as a WARNING, not a truth failure — see below)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/payments/config.ts` | COMMISSION_RATE_BPS/PAYOUT_DELAY_HOURS/PAYMENT_WINDOW_MINUTES | VERIFIED | All three exported, env-tunable, documented defaults (1000/24/60) |
| `src/lib/payments/commission.ts` | computeCommission pure integer-cents | VERIFIED | Imports COMMISSION_RATE_BPS default; Math.round rule; throws on invalid input; 13/13 tests |
| `src/lib/db/schema.ts` | host_payout_ledger + payout_ledger_state enum + booking.payment_id + listing.currency='php' | VERIFIED | All present (line 179 currency default 'php', 271-313 ledger+enum, 404 booking.paymentId) |
| `drizzle/0008_payout_ledger.sql` | Migration applied live | VERIFIED | Live DB confirmed: `\d host_payout_ledger` shows UNIQUE(booking_id), both FKs restrict; `SELECT DISTINCT currency FROM listing` → only `php`; `booking.payment_id` column present |
| `src/lib/paymongo.ts` | createCheckoutSession/createBatchTransfer/createRefund/listWalletAccounts/getTransfer | VERIFIED | All five present with correct /v1 vs /v2 paths (no `/v1/v2/...`), Idempotency-Key on POSTs, PLATFORM_WALLET fail-closed prod guard |
| `src/app/actions/booking.ts` | confirmBooking = Confirm & pay, no sync flip | VERIFIED | Sync `SET status='confirmed'` removed; extends hold via `make_interval`; creates checkout with server-frozen amount; redirects off-site |
| `src/app/api/paymongo/webhook/route.ts` | payment.paid confirm authority + gone-slot backstop + refund handlers | VERIFIED | All three present and tested (8+4 tests across webhook-payment-paid.test.ts / webhook-refund.test.ts) |
| `src/inngest/functions/payout-sweep.ts` | at-most-once claim, wallet correlation, transfer | VERIFIED | ON CONFLICT claim, wallet.id===paymongoAccountId correlation, createBatchTransfer(netCents); CR-01 gap noted above |
| `src/inngest/functions/payout-reconcile.ts` | getTransfer poll → Processing→Paid/Failed | VERIFIED | mapTransferStatus safe-default; idempotent AND state='processing' guards; stuck-row alert |
| `src/app/api/inngest/route.ts` | serve() mounting both crons, fail-closed prod guard | VERIFIED | Registers payoutSweep + payoutReconcile; throws in prod if INNGEST_SIGNING_KEY missing |
| `src/app/(host)/host/earnings/page.tsx` | Owner-gated HOST-03 earnings RSC | VERIFIED | Owner-scoped WHERE host_id=session.user.id; renders PayoutSummary + rows + empty state; no coral CTA |
| `src/components/host/payout-ledger-status.ts` | derivePayoutLedgerView + summarizePayouts | VERIFIED | Pure, non-"use client"; both exported and tested |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `confirmBooking` | `createCheckoutSession` | server action charge | WIRED | `src/app/actions/booking.ts:238` |
| `webhook/route.ts` | `booking.status='confirmed'` | UPDATE...WHERE status='pending' | WIRED | Confirmed live in route.ts:254-256; no `expires_at>now()` re-check (deliberate, D-57/Pitfall 4) |
| `webhook/route.ts` | `createRefund` | auto-refund backstop | WIRED | `handleGoneSlot` calls it for refundable rails only |
| `payout-sweep.ts` | `host_payout_ledger` | ON CONFLICT (booking_id) claim | WIRED | Confirmed live in payOne; racing-clients test proves exactly one winner |
| `payout-sweep.ts` | `host_payout.paymongo_account_id` | wallet.id === paymongoAccountId correlation | WIRED | Multi-host test proves A→A, B→B, never crossed |
| `payout-reconcile.ts` | `getTransfer` | poll GET /v2/transfers/{id} | WIRED | reconcileOne calls getTransfer then advances the ledger |
| `earnings/page.tsx` | `host_payout_ledger` | owner-scoped query | WIRED | `.where(eq(hostPayoutLedger.hostId, session.user.id))`; host-A-never-B test passes |
| `host/page.tsx` + `host/layout.tsx` | `/host/earnings` | Earnings nav link | WIRED | grep-confirmed in both files |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `earnings/page.tsx` rows | `rows` (ledger join) | `db.select(...).from(hostPayoutLedger).innerJoin(booking)...where(hostId=session.user.id)` | Yes — real DB query, owner-scoped, no static fallback | FLOWING |
| `PayoutSummary` totals | `upcomingCents/paidCents` | `summarizePayouts(rows.map(...))` — pure summing of the real query results | Yes | FLOWING |
| `payout-sweep.ts` due list | `due` | `queryDuePayouts(db)` — real SQL against `booking`/`listing`/`host_payout`/`host_payout_ledger` | Yes | FLOWING |
| `confirmBooking` charge amount | `bk.quotedTotalCents` | `db.select(...).from(booking).where(eq(booking.id, holdId))` | Yes — server-frozen DB read, never client input | FLOWING |

No hollow props or disconnected data sources found in the phase's rendering paths.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| PAY-01 | 05-01, 05-02, 05-03, 05-04 | Booker can pay online via hosted checkout | SATISFIED | Checkout creation + webhook confirm authority both live and tested |
| PAY-02 | 05-01, 05-05a, 05-06 | Platform deducts commission | SATISFIED | computeCommission + ledger freeze + host-visible breakdown |
| PAY-03 | 05-02, 05-05a, 05-05b | Host payout held until after session | SATISFIED | Sweep + reconcile lifecycle live, at-most-once proven; CR-01 robustness gap noted as WARNING |
| HOST-03 | 05-06 | Host sees payout status | SATISFIED | /host/earnings owner-scoped, state badges, commission breakdown |

No orphaned requirements — all four phase requirement IDs (PAY-01, PAY-02, PAY-03, HOST-03) appear in at least one plan's frontmatter `requirements:` field, and REQUIREMENTS.md traceability table marks all four "Complete" against Phase 5, consistent with the evidence above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/inngest/functions/payout-sweep.ts` | 93-143 (`payOne`) | Claim-before-verify: the at-most-once ledger row is INSERTed (line 99-105) before `listWalletAccounts()` (line 109, an un-try/catch'd network call) and before the transfer fires. Independently re-verified: `queryDuePayouts` (line 61-77) excludes any booking that already has a ledger row (`LEFT JOIN host_payout_ledger p ... WHERE p.id IS NULL`), and `queryProcessingLedger` (reconcile) only selects `state='processing'`. A `listWalletAccounts()` throw, or a no-match wallet, therefore leaves the row permanently `held` with **no future sweep, no reconcile pass, and no stuck-`held` alert** ever touching it again — this is CR-01 from `05-REVIEW.md`, confirmed present, unfixed. | WARNING | The host is silently never paid for that specific booking until a human manually re-processes the row. Does not violate the "at most once" guarantee (it is still ≤1) and does not corrupt any other booking's payout, but is a real gap in "money flows correctly" for the affected edge case. Real transfers are UAT-gated on PayMongo /v2 beta enablement, so this has not yet manifested against real money; recommend a follow-up fix (make the post-claim block a single try/catch that marks `failed` — not silent `held` — on ANY post-claim exception, per the review's proposed fix) before UAT. |
| `src/app/api/paymongo/webhook/route.ts` | 188-191 (`handleRefund`) | Refund handler flips ANY ledger row not already `refunded` to `refunded`, including `processing`/`paid` rows — a late/manual/dashboard refund after payout has already fired would silently overwrite the record that the host was paid, with no clawback and no alert (WR-01, confirmed present, unfixed). | WARNING | Same phase-boundary reasoning as D-60 (pre-payout refund only) — the design assumes refunds only occur pre-payout, which is true for every code path built in Phase 5, but nothing enforces it against an out-of-band (dashboard) refund. Low likelihood in the phase's own automated flows; recommend gating the transition to `state='held'` only, alerting otherwise. |
| `src/app/api/paymongo/webhook/route.ts` | 183-198 (`handleRefund`) | Refund handler reads only the event `type`, never the refund resource's actual `status` — a `payment.refund.updated` event with `status:'failed'` still cancels the booking and marks the ledger refunded (WR-02, confirmed present, unfixed). | WARNING | Could mark a failed refund as succeeded, leaving the booker un-refunded while the booking is already cancelled. Recommend gating on `status ∈ {succeeded, refunded}` per the review's fix. |
| `src/app/api/paymongo/webhook/route.ts` | 203 | No fail-closed production boot guard on `PAYMONGO_WEBHOOK_SECRET` (unlike `paymongo.ts` and `route.ts` for Inngest) — a missing/rotated secret in prod silently 400s every webhook forever, with no startup signal (WR-03, confirmed present, unfixed). | WARNING | Operational risk (silent total outage of the confirm authority), not a functional gap in the current phase — every test still runs with a secret configured. Recommend adding the same guard pattern used elsewhere in this phase. |
| `src/lib/db/schema.ts` | 394 | `booking.status` defaults to `'confirmed'` (a Phase-3 forward-compat default), meaning a hypothetical future insert path that omits `status` would create a payout-eligible-but-never-paid-for booking (WR-05, confirmed present, unfixed). | WARNING | Latent — no current insert path in the codebase omits status (holds are always inserted `'pending'` explicitly, per `createPendingHold`). Money-safety footgun for future code, not an active defect. |

None of the above are Blockers: each is a documented, independently-confirmed edge-case/robustness gap in a mechanism whose happy path is implemented, wired, and tested; none contradicts a ROADMAP success criterion in the tested/common-case flow.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase-5 payments+paymongo test suite green | `npx vitest run tests/payments tests/paymongo` | 71/71 passed | PASS |
| Full test suite has no phase-5 regressions | `npx vitest run` | 337/338 passed (1 failure = pre-existing flaky `tests/auth/secret-config.test.ts` 5s timeout, a Phase-1 test untouched by Phase 5) | PASS |
| Type-check clean | `npx tsc --noEmit` | exit 0 | PASS |
| Live DB has host_payout_ledger + reconciled currency | `docker compose exec db psql ... \d host_payout_ledger` / `SELECT DISTINCT currency FROM listing` | Table present with UNIQUE(booking_id); currency → only `php` | PASS |
| No TODO/FIXME/placeholder markers in phase-5 files | grep across 17 core phase-5 files | none found | PASS |

### Human Verification Required

### 1. Real hosted checkout + webhook confirm end-to-end (test-mode PayMongo)

**Test:** Complete a real booking through the hosted PayMongo Checkout Session (test mode) using each rail (card, GCash, Maya, QR Ph), forward the webhook via ngrok/cloudflared, and confirm the booking flips `pending→confirmed` and the confirmation page resolves off the `PendingPaymentState` interstitial.
**Expected:** Each rail completes checkout, the webhook lands, and `/bookings/[id]` shows Confirmed within the ~20s poll window (or the "taking longer" fallback still resolves on manual refresh).
**Why human:** Requires a live/test-mode PayMongo account, a real checkout redirect, and a reachable tunneled webhook endpoint — none of which can be exercised from this sandboxed verification pass. All code paths are covered by mocked tests only.

### 2. Real inhouse payout transfer + wallet correlation (PayMongo /v2 beta)

**Test:** Once PayMongo enables the money-movement `/v2` beta (batch_transfers, wallet enumeration) for the account, run the sweep against a real confirmed+past-T+24h booking and confirm the transfer lands in the correct host's actual wallet, then confirm the reconcile cron polls it to `Paid`.
**Expected:** Ledger row moves Held→Processing→Paid with the correct `net_cents` amount in the host's real wallet; `mapTransferStatus`'s terminal-enum mapping (A4, currently a documented assumption) matches the real PayMongo response shape.
**Why human:** This is externally UAT-gated — PayMongo's Platforms/Linked-Accounts money-movement `/v2` beta is sales-gated and not yet enabled on the account (a standing STATE blocker, not a Phase-5 code gap). Cannot be exercised in this environment; all sweep/reconcile logic is proven only against `mockPayMongo`.

### 3. QRPh operator-alert manual-refund workflow

**Test:** Trigger a genuinely-gone-slot payment on the QRPh rail (test mode) and confirm the `[PAYMENT_ALERT] needs_manual_refund` + `recordAudit(needs_attention)` signal reaches wherever operators actually monitor alerts (currently `console.error` + an audit row — no alerting/paging integration exists yet).
**Expected:** An operator is able to discover and act on the alert in a reasonable time window so the booker is refunded out-of-band.
**Why human:** No dashboard/alerting UI ships in this phase (out of scope) — verifying the OPERATIONAL side of "never silently retain money" requires a human process check, not just a code check.

## Gaps Summary

No BLOCKER-level gaps. All five ROADMAP success criteria are implemented, wired, and covered by substantive (non-vacuous) automated tests; the live Postgres database independently confirms the schema/migration claims; the full test suite is green apart from one pre-existing, unrelated flaky test. Cross-referencing all seven plans' `requirements:` frontmatter against REQUIREMENTS.md shows complete coverage of PAY-01/PAY-02/PAY-03/HOST-03 with no orphaned requirement IDs.

Two categories of follow-up are flagged, both WARNING (not BLOCKER) severity:

1. **CR-01 (critical per the code review, re-verified independently here):** a post-claim wallet-lookup failure or no-wallet-match permanently strands a payout in `held` with zero recovery path and no stuck-alert — a real money-safety gap in the payout mechanism's failure path, though the happy path is fully proven. Recommend addressing before real transfers go live (the fix is scoped in `05-REVIEW.md`).
2. **WR-01/02/03/05:** refund-robustness and boot-guard gaps in edge paths (post-payout refund overwrite, refund status vs type, missing webhook-secret boot guard, an unsafe schema default) — all confirmed still present in the code, all documented, none currently exploited by any code path built in this phase.

Real money-movement (hosted checkout redirect, inhouse transfer, transfer-status polling) is externally UAT-gated on PayMongo's Platforms/Linked-Accounts `/v2` beta enablement — a standing, pre-existing STATE blocker outside this phase's control. This routes the phase to `human_needed` rather than `passed`, per the verification process (any identified human-verification item takes priority over an otherwise-clean automated score). This is not a code deficiency — every mechanism the phase can control has been implemented, wired, and tested against mocks.

---

_Verified: 2026-07-16T22:20:00Z_
_Verifier: Claude (gsd-verifier)_
