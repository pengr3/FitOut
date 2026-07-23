---
phase: 07-bookings-management-cancellation-notifications
plan: 16
subsystem: payments-refunds
tags: [qrph, refund, instapay, paymongo, D-58, D-72, idempotency, pitfall-10, ph-dpa, collect-and-never-store, PAY-06]
requires:
  - isApiRefundable
  - cancelBookingAsBooker
  - quoteRefund
  - booking.paymentMethod
  - createBatchTransfer (the payout: namespace the refund path must never reuse)
  - recordAudit needs_attention channel
  - readDbNow
provides:
  - "The SETTLED QRPh verdict: confirmed NOT API-refundable, by observed API behaviour (refund-rail.ts header)"
  - createRefundTransfer (instapay, refund: namespace, per-attempt reference, ceiling guard)
  - listReceivingInstitutions
  - INSTAPAY_CEILING_CENTS
  - qrphRefundDestinationSchema
  - RefundDestinationForm
  - "cancelBookingAsBooker(bookingId, destination?) — the D-72 collect-and-never-store branch"
  - CancelActionResult.notice
affects:
  - phase-7-verification
  - manual-UAT (A3 + Money Movement re-verification)
tech-stack:
  added: []
  patterns:
    - "Verdict-by-observation: a gating product question settled by a captured API response recorded verbatim in the code that branches on it"
    - "Real-module-over-intercepted-fetch testing: assert the WIRE (provider, Idempotency-Key, reference_number), not what the action passed to a mock"
    - "Collect-and-never-store: sensitive fields pass straight through to the provider call; only a masked fragment survives, proven by row-scan + log-scan tests"
    - "A worst-case provider echo baked into the failure fixture so the no-leakage test is genuinely fallible"
key-files:
  created:
    - src/lib/validation/qrph-refund.ts
    - src/components/booking/refund-destination-form.tsx
    - tests/paymongo/refund.test.ts
    - tests/paymongo/instapay-refund.test.ts
  modified:
    - src/lib/payments/refund-rail.ts
    - src/lib/paymongo.ts
    - src/app/actions/cancel-booking.ts
    - src/app/(app)/bookings/[id]/cancel/page.tsx
key-decisions:
  - "VERDICT recorded from the 2026-07-23 probe: HTTP 400 'Refunds are not allowed for payments with source type qrph.' — D-58 stands, Branch B built"
  - "A3 recorded as BLOCKED (Money Movement endpoints absent on this account), never fabricated; design keeps the documented stable-key/rotating-reference shape"
  - "Destination validated (shape + live-BIC membership) BEFORE the flip, so a booking is never cancelled with an undeliverable refund"
  - "Transfer-failure path logs NO error content — a PayMongo error detail can echo the destination, and the leakage test feeds it one that does"
  - "Persistence home for transferId + masked last-4 is the audit trail (recordAudit meta) — zero schema changes, per the plan's own no-migration guard"
patterns-established:
  - "Refund transfers use refund:${bookingId}; payouts keep payout:${bookingId} — grep-asserted distinct (Pitfall 10)"
  - "createRefund's key is payment-scoped: one-refund-per-payment is now an explicit, tested assumption, not a latent one"
requirements-completed: [PAY-06]
duration: ~25min
completed: 2026-07-23
---

# Phase 7 Plan 16: QRPh Refund Probe & the D-72 Collect-and-Never-Store Path Summary

**The QRPh question is settled by an observed HTTP 400 — not docs — and the D-72 branch ships: a QRPh booker now supplies a bank/e-wallet destination that flows straight through to an InstaPay transfer with a `refund:` idempotency namespace, a ₱50k ceiling guard, a server-frozen amount, and proven no-persistence/no-log-leakage.**

## Performance

- **Duration:** ~25 min (execution; Task 1's human probe ran earlier in the session)
- **Started:** 2026-07-23T06:06:44Z
- **Completed:** 2026-07-23T06:28:42Z
- **Tasks:** 3 (Task 1 resolved at checkpoint; Tasks 2–3 executed, Branch B)
- **Files modified:** 8 (4 created, 4 modified)
- **Full suite:** 78 files / 639 tests, exit 0 (was 76 / 628)

## The Verdict — Settled by Observation (Task 1, resolved at checkpoint)

Run 2026-07-23 in TEST mode (the paid payment's raw body shows `livemode:false`):

- QRPh-only checkout session `cs_809b1190ba4c3d44b7a77cdc` (₱100.00 = 10000 centavos) paid by the human on the hosted page; captured payment `pay_ru6sXqhRJto1NW3T83cqak4q`, `source.type: "qrph"`.
- `POST /v1/refunds` with `Idempotency-Key: qrph-refund-probe-1` → **HTTP 400**, raw body verbatim:
  `{"errors":[{"code":"parameter_invalid","detail":"Refunds are not allowed for payments with source type qrph.","source":{"pointer":"payment_id","attribute":"payment_id"}}]}`
- Outcome-matrix row 1 (sync 4xx naming the rail) → **VERDICT: `confirmed` — QRPh is NOT API-refundable. D-58 stands. Branch B built.** No refund resource was created, so terminal-status polling does not apply (it guards the HTTP-200 branch).

**A3 is BLOCKED, not settled.** `GET /v2/wallets?status=activated` → HTTP 200 with zero wallets (Platforms/Linked Accounts not enabled on this test account). `GET /v2/transfers/receiving_institutions?provider=instapay` → HTTP 404, raw body `{"errors":[{"code":"not_found","detail":"failed to get transfer: resource not found"}]}` — the router resolved `receiving_institutions` as a transfer-id lookup, i.e. the Money Movement endpoints are absent until PayMongo enables the feature. The stable-`Idempotency-Key` + per-attempt rotating `reference_number` design is kept exactly as documented (PayMongo's own retry guidance); **A3 is flagged for re-verification in manual UAT once Money Movement is enabled.** All of this, with the raw bodies and the date, is recorded in the `refund-rail.ts` header — the single source of truth the plan mandates.

## What Was Built

**Task 2 — the verdict + the transfer path** (`3fa3156`).

- `refund-rail.ts` header rewritten: the "MEDIUM-HIGH, docs are 404" hedge replaced by the observed fact (date, session/payment ids, raw 400 body, A3-blocked evidence). `REFUNDABLE_RAILS` unchanged — still the four API-refundable rails, still the only Set literal in `src/`.
- `createRefundTransfer` in `paymongo.ts`: a SEPARATE exported function (never an overload of `createBatchTransfer`), POSTing `/v2/batch_transfers` with InstaPay as the provider, `purpose: "Disbursement"`, **`refund:${bookingId}`** idempotency key (Pitfall 10 — `payout:${bookingId}` untouched, both grep-asserted at exactly 1), per-attempt `refund-${bookingId}-${attempt}` reference, and an `INSTAPAY_CEILING_CENTS` (5_000_000) throw as defence in depth beneath the action's own check.
- `listReceivingInstitutions()` wrapping the documented institutions endpoint, with the live-404 behaviour recorded in its JSDoc and callers required to tolerate a throw.
- The **one-refund-per-payment** assumption at `createRefund`'s key is now an explicit comment plus `tests/paymongo/refund.test.ts`: case (1) pins a PARTIAL refund's exact centavos + `Idempotency-Key` present (positive movement); case (2) proves a second `createRefund` for the same payment produces NO second refund resource — PayMongo replays the first response even for a different amount, which is the double-refund guard today and a silent no-op trap for any future top-up flow.

**Task 3 — the collect-and-never-store destination** (`81dd608`).

- `qrph-refund.ts`: the destination schema (institution BIC + account name 1..100 + account number 6..20 digits) under the load-bearing COLLECT-AND-NEVER-STORE header; shape validated by Zod, **BIC membership enforced server-side against the live `listReceivingInstitutions()` set** (T-07-99).
- `cancelBookingAsBooker(bookingId, destination?)`: destination shape-validated at entry (malformed → calm denial, nothing written), BIC verified **before the flip** (unknown BIC → calm denial, booking stays live), transfer fired only inside the owner-gated flow on the row just flipped for the server-computed `quote.totalRefundCents`, ceiling routed to `needs_attention`, transfer failure → `needs_attention` + a calm `notice` on the result (no silent same-reference retry), and **only `transferId` + `••••1234` survive**, in the audit meta.
- `RefundDestinationForm`: RHF + `zodResolver` over the SAME schema, institution `Select` fed server-side, neutral styling (no coral, no destructive), copy stating plainly the details are used once and not stored.
- The cancel review page renders the form **only** when `!isApiRefundable(paymentMethod)` and money is owed; a ₱0 refund and every API-refundable rail keep the plain `CancelConfirm`. **If the institutions fetch fails server-side (the current live 404), the page does not crash:** it falls back to `CancelConfirm` plus a calm line that the team will arrange the refund directly — the action's existing `needs_attention` seam picks the money up. The same degradation exists in the action (case 9): a destination whose institution list is unverifiable cancels the booking, fires no transfer, and routes to `refund_manual_required` with an honest notice.

## Owner Gate — Mutation-Verified

| Mutation | `tests/paymongo/instapay-refund.test.ts` |
|---|---|
| **Baseline** | 9 passed |
| **Remove `row.bookerId !== userId` from `loadOwnedBooking`** | **1 failed — case (7)**: the cross-user denial flipped from the byte-exact `DENIED` string to the 0-row `NOT_ACTIVE` message. The in-WHERE `booker_id` scope still blocked the write and the transfer never fired — the two layers are independently meaningful. |
| **Restored** | 9 passed; `grep -c "row.bookerId !== userId"` = 1 |

The positive control (cases 1 and 7b: the genuine owner CAN cancel with a destination and the transfer genuinely fires) is what stops a deny-everything implementation from passing.

## Task Commits

1. **Task 1: QRPh settling probe** — no commit (human checkpoint, resolved; evidence recorded in Task 2's code)
2. **Task 2: verdict + InstaPay transfer path** — `3fa3156` (feat)
3. **Task 3: collect-and-never-store destination** — `81dd608` (feat)

## Decisions Made

| Decision | Choice | Why |
|---|---|---|
| A3 recording | BLOCKED with raw evidence, design unchanged | The endpoints are absent on this account; fabricating `a3-ok` would be recording a result never observed. The design follows PayMongo's documented retry contract either way. |
| Destination validation timing | Shape at entry, BIC before the flip | A booking must never end up cancelled with an undeliverable refund; both rejections leave the row live so the booker fixes the form. |
| Transfer-failure logging | `{ bookingId }` only — no error content | A provider error detail can echo the destination (the test's 500 fixture deliberately does); logging it would breach the no-leakage rule. The test goes red if this regresses. |
| Persistence home for transferId + last-4 | `recordAudit` meta | The plan forbids schema changes (`accountNumber` grep on schema.ts = 0). The audit trail is the established operator channel; a durable audit table adoption (audit.ts's documented future) inherits the entry unchanged. |
| Result shape | `CancelActionResult` gains optional `notice` | The transfer-failure / ceiling / unverifiable-list paths succeed as cancellations but must not imply the refund is en route. Additive; every existing `toEqual` assertion unbroken. |
| Ceiling check placement | Action (routing) + `createRefundTransfer` (throw) | The action owns the `needs_attention` routing; the module-level throw is defence in depth so no future caller can fire a doomed transfer. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `tests/paymongo/refund.test.ts` did not exist to "extend"**
- **Found during:** Task 2. The plan says "extending, not rewriting", but no such file exists (the prior refund coverage is `webhook-refund.test.ts` and the action-level cases in `tests/booking/cancellation.test.ts`).
- **Fix:** Created the file with exactly the two mandated cases, at the HTTP level (real module, stubbed fetch) — the only level where the Idempotency-Key semantics are observable.
- **Committed in:** `3fa3156`

**2. [Rule 2 — Missing critical] The cancel review page had to change (not in the plan's `files_modified`)**
- **Found during:** Task 3(b) — the form must render "on the cancel review page only when `!isApiRefundable(paymentMethod)`", but the page neither selected `paymentMethod` nor had a mount point.
- **Fix:** `src/app/(app)/bookings/[id]/cancel/page.tsx` selects the rail, fetches institutions server-side (fail-calm), swaps the "back to your original payment method" copy on the QRPh branch, and renders form vs. fallback. Without this the entire Task-3 UI would be dead code.
- **Committed in:** `81dd608`

**3. [Rule 2 — Missing critical] Pre-flip destination validation (ordering not specified by the plan)**
- **Found during:** Task 3(c). The plan says "re-validate it server-side" but not when; validating after the flip would cancel bookings with unusable destinations.
- **Fix:** Shape validation before any read; live-BIC membership before the flip; the unverifiable-list case (live 404) proceeds and degrades to the operator seam per the checkpoint resolution. Case (8) proves the row stays `confirmed` on both rejections.
- **Committed in:** `81dd608`

### Total

**3 auto-fixed** (1 blocking, 2 missing-critical). All three were prerequisites for the plan's own stated behaviour; no scope creep — no schema changes, no new dependencies, no new notification types.

## Acceptance-Criteria Discrepancies

| Criterion | Stated | Actual | Assessment |
|---|---|---|---|
| `grep -rc "new Set(\["card\"" src/` | exactly 1 file | **0 (single-line grep)** | **Unsatisfiable as written, met in substance.** The one Set literal (refund-rail.ts, unchanged since 07-03) is formatted multi-line, so the single-line pattern cannot match. Verified directly: a multiline search for `new Set\(\[\s*"card"` returns exactly 1 file, and every dispatch site imports `isApiRefundable`. |
| `npx vitest run tests/paymongo/instapay-refund.test.ts` — "all 7 cases" | 7 | **9** | The 7 mandated cases plus (8) malformed/unknown-BIC pre-flip rejection (T-07-99's actual mitigation test) and (9) the unverifiable-institutions degradation (the live-404 reality). |
| All other Task-2/3 greps | — | — | Met exactly (VERDICT ≥1 with date + observed outcome; refund:/payout: namespaces 1 each; ceiling ≥1; one-refund-per-payment ≥1; COLLECT-AND-NEVER-STORE = 1; schema.ts accountNumber = 0; InstaPay provider literal = 1). |

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all 8 touched files) | clean, 0 errors 0 warnings |
| `npx vitest run tests/paymongo` | **7 files / 49 passed** |
| `npx vitest run tests/booking tests/payments tests/security tests/paymongo` | **37 files / 350 passed** |
| `npx vitest run tests/availability` (D-21 gate) | **103 passed** |
| **`npm test` (full suite)** | **78 files / 639 tests, exit 0** (was 76 / 628) |
| `npm run build` (with the documented 3-var placeholder prefix) | exit 0, both times (Task 2 and Task 3) |
| Owner-gate mutation | Red as designed (1/9 fail), restored, predicate re-verified present |

## Issues Encountered

None beyond the deviations above. The pre-existing `npm run build` env-placeholder requirement (deferred-items.md) was hit exactly as documented and worked around without touching the guards.

## Known Stubs

None. Every path is wired end to end: the form calls the real action, the action fires the real `createRefundTransfer` HTTP builder (proven at the wire in tests), and the fallback paths route to the established operator seam.

**Known LIMITATION (not a stub):** at runtime on this PayMongo account, `listReceivingInstitutions()` 404s until Money Movement is enabled — so the destination form cannot render live yet and QRPh cancellations degrade to the (fully functional, tested) operator-seam fallback. This is PayMongo's feature gate, not missing wiring; the moment the endpoints exist, the form lights up with no code change. Flagged for manual UAT alongside A3.

## Threat Register Status

| Threat ID | Disposition | How this plan discharges it |
|---|---|---|
| T-07-94 | mitigate | Destination accepted ONLY inside the owner-gated flow, on the row just flipped, amount = server `quote.totalRefundCents`; never read from a prior request/session/store. Cases (5) and (7), owner gate mutation-verified. |
| T-07-95 | mitigate | Collect-and-never-store: straight-through to the transfer; only transferId + masked last-4 persist (audit meta). Case (3) scans the full booking row as text + all audit lines + all notification payloads; case (4) scans every console call under a provider error that deliberately echoes the destination. |
| T-07-96 | mitigate | `refund:${bookingId}` vs `payout:${bookingId}` — both namespaces exist exactly once in paymongo.ts (grep-asserted); case (1) pins the wire header. |
| T-07-97 | mitigate | Stable key + rotating reference proven at the wire (case 2); no silent retry on failure (case 4 asserts exactly one POST). A3 recorded as BLOCKED, not assumed. |
| T-07-98 | mitigate | `INSTAPAY_CEILING_CENTS` guard in the action (routing) and the module (throw); case (6) asserts zero transfer POSTs + the needs_attention row. |
| T-07-99 | mitigate | BIC validated against the live institutions set server-side, before the flip; case (8). |
| T-07-100 | mitigate | The verdict is an observed HTTP 400 recorded verbatim with its date in refund-rail.ts; the 200-branch polling requirement is documented as not applicable to this outcome. |

## Threat Flags

None — the new outbound surface (`/v2/batch_transfers` with a booker-supplied destination, and the institutions GET) is exactly the trust boundary the plan's own threat model names and mitigates. No surface beyond it was introduced.

## Next Phase Readiness

- **Phase 7 is code-complete: 16/16 plans have SUMMARYs.** PAY-06's D-72 half now exists in code with its invariants proven.
- **Manual UAT owes two PayMongo-gated verifications** (both blocked on PayMongo enabling Money Movement / Platforms on the account): (1) A3 — a real transfer accepting the stable-key/rotating-reference mix; (2) the institutions endpoint returning a real list so the destination form renders live.
- **Refund-transfer terminal status is currently operator-reconciled** via the audit trail (transferId in the `refund_transfer_dispatched` entry + `getTransfer`); there is no ledger row and no poller for refund transfers. Logged in deferred-items.md as a candidate follow-up once Money Movement is live.

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 9 claimed files verified present on disk and both task commit hashes (3fa3156, 81dd608) verified in `git log`. All acceptance-criteria greps re-run and passing (discrepancies documented above). Full suite 78/639 exit 0.
