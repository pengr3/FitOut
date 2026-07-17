---
phase: 5
slug: payments-payouts
status: secured
threats_open: 0
asvs_level: 1
created: 2026-07-17
---

# Security Audit — Phase 5: Payments & Payouts

Verification of every declared threat mitigation in the Phase-5 `<threat_model>`
against the code at current HEAD (dev @ `5ced190`). Each `mitigate` threat was
confirmed by locating the actual mitigation call in the cited file(s); the single
`accept` threat (T-05-05) is logged below and confirmed resolved by T-05-29's
owner-scoping. The post-execution review fixes (CR-01, WR-01/02/03/04/05) were
verified present in the shipped code, not merely in the fix report.

## Trust Boundaries

| # | Boundary | Untrusted input | Control enforced in code |
|---|----------|-----------------|--------------------------|
| TB-1 | Booker browser → server actions (`placeHold`, `confirmBooking`) | Form payload, `holdId` | Session gate (`requireUserId`), `canBook` re-read, Zod re-validate, server re-derivation of `deriveBookable`, owner-gate `bookerId === userId`, server-frozen `quotedTotalCents` (action takes only `holdId`) — `src/app/actions/booking.ts` |
| TB-2 | Booker browser → confirmation RSC (`/bookings/[id]`) | URL id, `?paid=1` | Owner-gate `bookerId === userId` → `notFound()`; "Confirmed" rendered ONLY on DB `status='confirmed'`; `?paid=1`+pending → finalizing interstitial — `src/app/bookings/[id]/page.tsx` |
| TB-3 | PayMongo → webhook (`/api/paymongo/webhook`) | Raw HTTP body, `Paymongo-Signature` | Constant-time HMAC-SHA256 over raw body (`timingSafeEqual`) → 400 on any failure; `paymongo_event` id dedupe → replay 200 no-op; state DERIVED from verified event type; fail-closed prod boot guard — `src/app/api/paymongo/webhook/route.ts` |
| TB-4 | Inngest → serve endpoint (`/api/inngest`) | Signed Inngest request | `serve()` verifies signature; fail-closed `INNGEST_SIGNING_KEY` prod boot guard — `src/app/api/inngest/route.ts` |
| TB-5 | Server → PayMongo REST (`src/lib/paymongo.ts`) | Outbound money-movement calls | Secret is HTTP-Basic username server-only (never in error text); `Idempotency-Key` on every POST; versioned base URL; fail-closed prod boot guards on secret + platform wallet |
| TB-6 | Database invariants | Concurrent writes | GiST `EXCLUDE booking_no_overlap` (double-book authority, `drizzle/0005`); `UNIQUE(booking_id)` on `host_payout_ledger` (at-most-once payout, `drizzle/0008`) |
| TB-7 | Host browser → earnings RSC (`/host/earnings`) | Session, route group | RSC re-gate (`!user`→/login, `!canHost`→/) + owner-scoped ledger read `WHERE host_id = session.user.id` — `src/app/(host)/host/earnings/page.tsx` |

## Threat Register

All 33 threats. 32 `mitigate` (all CLOSED with a located mitigation), 1 `accept`
(T-05-05, CLOSED via accepted-risk log + T-05-29 resolution).

| Threat ID | Category | Disposition | Status | Evidence (file:line / construct) |
|-----------|----------|-------------|--------|----------------------------------|
| T-05-01 | Tampering | mitigate | CLOSED | `commission.ts:39-44` — throws on non-integer/negative gross + `rateBps ∉ [0,10000]`; `Math.round(gross*rateBps/10000)` integer-only |
| T-05-02 | Tampering | mitigate | CLOSED | `schema.ts:290-293` `.unique()` + `drizzle/0008_payout_ledger.sql:17` `UNIQUE("booking_id")` |
| T-05-03 | Repudiation/Integrity | mitigate | CLOSED | `schema.ts:299-300` `commissionRateBps`/`commissionCents` frozen `notNull`; `drizzle/0008:8-9`; sweep freezes on claim `payout-sweep.ts:111,121-124` |
| T-05-04 | Tampering | mitigate | CLOSED | `schema.ts:179` `currency.default("php")`; `drizzle/0008:20` `SET DEFAULT 'php'` + `:26` backfill `UPDATE listing SET currency='php' WHERE currency='usd'` |
| T-05-05 | Info-disclosure | accept | CLOSED | No ledger read surface shipped in Plan 01; owner-gating enforced at read time — see Accepted Risks Log + resolved by T-05-29 (`earnings/page.tsx:77`) |
| T-05-06 | Tampering | mitigate | CLOSED | `paymongo.ts:24` version-less base `https://api.paymongo.com`; callers pass full `/v1`/`/v2` paths; `:276` exact `/v2/batch_transfers` |
| T-05-07 | Tampering/financial | mitigate | CLOSED | `paymongo.ts:80-83` every POST sets `Idempotency-Key`; stable keys at all POST callers (`linked-account:`, `checkout:`, `refund:`, `payout:`); GET carries none |
| T-05-08 | Info-disclosure | mitigate | CLOSED | `paymongo.ts:93-97` error surfaces first PayMongo detail only (no secret); `authHeader` server-only; `:27-32` fail-closed prod boot |
| T-05-09 | DoS/availability | mitigate | CLOSED | `paymongo.ts:39-47` fail-closed prod boot on `PLATFORM_WALLET_NUMBER`/`NAME` |
| T-05-10 | Tampering | mitigate | CLOSED | `paymongo.ts:283` `amount: input.netCents` verbatim; `commission.ts:45` `netCents = gross − commission` (never fee-reduced) |
| T-05-11 | Tampering | mitigate | CLOSED | `booking.ts:163` `confirmBooking(holdId)`; reads `quotedTotalCents` server-side `:177`; charge `:239` uses it, no client amount |
| T-05-12 | Spoofing | mitigate | CLOSED | `bookings/[id]/page.tsx:74-87` Confirmed only on DB `confirmed`; pending+`?paid=1`→`PendingPaymentState` (poll-refresh only, never fabricates); cancelled+`?paid=1`→`PaymentReversedState` |
| T-05-13 | Elevation/IDOR | mitigate | CLOSED | `booking.ts:182` `if (!bk || bk.bookerId !== userId)` before any checkout |
| T-05-14 | Tampering/financial | mitigate | CLOSED | `booking.ts:188` already-confirmed short-circuit before charge; `:246` stable `Idempotency-Key checkout:<holdId>` |
| T-05-15 | Info-disclosure | mitigate | CLOSED | `booking.ts:237-257` try/catch → generic `ConfirmResult` + `recordAudit`; raw error never returned |
| T-05-16 | Availability | mitigate | CLOSED | `booking.ts:228-230` `UPDATE booking SET expires_at = now() + make_interval(mins => PAYMENT_WINDOW_MINUTES)` before `createCheckoutSession`, scoped owner + `status='pending'` |
| T-05-17 | Spoofing/Tampering | mitigate | CLOSED | `webhook/route.ts:95-105` `timingSafeEqual` over `${t}.${rawBody}`; `:254` raw `req.text()`; `:266-267`→400; `:284-290` `paymongo_event` dedupe→200 |
| T-05-18 | Tampering/privilege | mitigate | CLOSED | `webhook/route.ts:278` state derived from verified `type`; confirm reads `reference_number` `:299`; frozen amount re-read `:130-138` |
| T-05-19 | Availability/financial | mitigate | CLOSED | `webhook/route.ts:309-312` 0-row→`handleGoneSlot`; `:140-169` refundable→`createRefund`, else `[PAYMENT_ALERT] needs_manual_refund` + audit; strengthened by WR-01/WR-02 in `handleRefund` |
| T-05-20 | Tampering | mitigate | CLOSED | `webhook/route.ts:306-308` confirm `WHERE ... status='pending'` only (no `expires_at` guard re-imposed); EXCLUDE prevents double-confirm |
| T-05-21 | Info-disclosure | mitigate | CLOSED | `webhook/route.ts` PII-free `[PAYMENT_ALERT]`/`console` lines + `recordAudit` meta; generic 200/400; `audit.ts:35-44` structured line, meta "must not contain secrets/PII" |
| T-05-22 | Tampering/financial | mitigate | CLOSED | `drizzle/0005_booking_exclusion.sql:9-15` `EXCLUDE USING gist(... tstzrange('[)') &&) WHERE status IN ('pending','confirmed')`; loser 0 rows→`handleGoneSlot` |
| T-05-23 | Tampering/financial | mitigate | CLOSED | `payout-sweep.ts:120-130` `INSERT ... ON CONFLICT (booking_id) DO UPDATE ... WHERE state='failed'` (at-most-once preserved for non-failed, per WR-04); `:195` `concurrency:1`; `payout:<bookingId>` key |
| T-05-24 | Tampering | mitigate | CLOSED | `payout-sweep.ts:78-79` predicate `status='confirmed' AND ends_at + PAYOUT_DELAY_HOURS <= now()` (DB clock) |
| T-05-25 | Tampering | mitigate | CLOSED | `payout-sweep.ts:111,157-163` transfer sends exactly `net_cents`; `commission_rate_bps`/`commission_cents` frozen on claim `:121-124` |
| T-05-26 | Spoofing | mitigate | CLOSED | `inngest/route.ts:23-27` fail-closed `INNGEST_SIGNING_KEY` prod boot; `serve()` verifies; `client.ts` correctly carries no guard |
| T-05-27 | Availability | mitigate | CLOSED | `payout-sweep.ts:137-152` only `status==='activated'` wallets; no match → roll claim back (`DELETE ... WHERE state='held'`), alert, fire nothing (CR-01 improves over "leave held") |
| T-05-28 | Repudiation | mitigate | CLOSED | `payout-reconcile.ts:87` polls `getTransfer`; `:99-109` failed→alert; `:114-121` stuck-processing alert; `:133-149` `alertStuckHeld` (CR-01) |
| T-05-29 | Elevation/IDOR | mitigate | CLOSED | `earnings/page.tsx:77` `.where(eq(hostPayoutLedger.hostId, session.user.id))` |
| T-05-30 | Info-disclosure | mitigate | CLOSED | `earnings/page.tsx:47-54` `!user`→/login, `!canHost`→/ (RSC gate, defense in depth) |
| T-05-31 | Tampering | mitigate | CLOSED | `earnings/page.tsx` figures = frozen ledger cents; `payout-ledger-status.ts:59-70` `summarizePayouts` pure integer sum; `payout-row.tsx`/`payout-summary.tsx` `formatMoney`-only, zero arithmetic |
| T-05-32 | Info-disclosure | mitigate | CLOSED | `payout-row.tsx`/`payout-summary.tsx`/`payout-state-badge.tsx` show only gross/−10%/net + calm state; no wallet/transfer-id/gateway-fee wording; page select omits `transferId` |
| T-05-33 | Tampering/misdelivery | mitigate | CLOSED | `payout-sweep.ts:138` `wallets.find(w => w.id === b.paymongoAccountId)` — never `[0]`; no match → fire nothing + alert |

### Post-execution review-fix verification (against HEAD)

| Fix | Requirement | Verified location |
|-----|-------------|-------------------|
| CR-01 | No payout stranded in `held`; wallet lookup guarded; no-wallet rolls claim back; any post-claim failure → `failed`; stuck-held alert | `payout-sweep.ts:135-183` (guarded try/catch, `DELETE` rollback), `payout-reconcile.ts:133-149` (`alertStuckHeld`) |
| WR-01 | Refund flip only on `state='held'`; post-payout row → clawback alert, never silent rewrite | `webhook/route.ts:216-243` (`.where(... eq(state,'held'))` + `refund_after_payout` alert on processing/paid) |
| WR-02 | Refund transition gated on terminal-success refund status, not event type | `webhook/route.ts:207-208` `if (!["succeeded","refunded"].includes(refundStatus ?? "")) return` |
| WR-03 | Fail-closed prod boot guard for `PAYMONGO_WEBHOOK_SECRET` | `webhook/route.ts:29-33` |
| WR-04 | Bounded automated retry of `failed` payouts | `config.ts:26-31` (`PAYOUT_RETRY_BACKOFF_HOURS`/`MAX_AGE_HOURS`); `payout-sweep.ts:82-86,125-127` (backoff + max-age predicate, `DO UPDATE WHERE state='failed'`) |
| WR-05 | `booking.status` default flipped to safe `'pending'` | `schema.ts:399` + `drizzle/0009_booking_status_default_pending.sql:8` |

## Accepted Risks Log

| Threat ID | Category | Risk | Rationale | Resolution status |
|-----------|----------|------|-----------|-------------------|
| T-05-05 | Info-disclosure — ledger rows readable across hosts | The `host_payout_ledger` had no read surface in Plan 01; cross-host disclosure could only arise once a read UI shipped. | Disposition `accept` (deferred to Plan 06): no read surface shipped in Plan 01, so there was nothing to owner-gate at that time. | RESOLVED by T-05-29 — the Plan-06 HOST-03 earnings page owner-scopes every ledger read `WHERE host_id = session.user.id` (`src/app/(host)/host/earnings/page.tsx:77`), plus the RSC `canHost` re-gate (T-05-30). Accepted risk is closed. |

## Unregistered Flags

None. Every `## Threat Flags` / `## Threat Register Coverage` / `## Threat
Compliance` section across the seven sub-plan summaries (05-01..05-06) reports no
new network endpoints, auth paths, or schema surface beyond the registered model.
The webhook and `/api/inngest` endpoints map to existing registered threats
(T-05-17..22, T-05-26). No new attack surface appeared during implementation
without a threat mapping.

## Security Audit Trail

| Audit date | Threats total | Closed | Open | Accepted | ASVS level | Run by |
|------------|---------------|--------|------|----------|------------|--------|
| 2026-07-17 | 33 | 33 | 0 | 1 (T-05-05, resolved) | 1 | gsd-security-auditor |

## Sign-Off

**Status: SECURED.** All 33 registered threats resolve to CLOSED — 32 `mitigate`
threats have a located mitigation in shipped HEAD code, and the single `accept`
threat (T-05-05) is logged and confirmed resolved by T-05-29's owner-scoping. All
six post-execution review fixes (CR-01, WR-01/02/03/04/05) are present in the
implementation, not just in the fix report. `block_on: high` — no open high-severity
threat remains, so the phase is clear to ship on the security axis.

Operational follow-ups (out of security-audit scope, tracked as Info in
05-REVIEW.md, not blockers): IN-01 (`transferId=""` un-reconcilable row), IN-02
(non-atomic webhook idempotency — harmless while every handler is idempotent),
IN-03 (`BETTER_AUTH_URL` localhost fallback has no prod guard). These are
robustness/operability items, not declared-threat gaps.

_Audited: 2026-07-17 · gsd-security-auditor · ASVS L1_
