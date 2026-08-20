---
phase: 13
slug: confirmation-bookings-trust
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-20
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `13-RESEARCH.md` § Validation Architecture. Task IDs are filled in during planning.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.8 (unit + design), Playwright 1.60.0 (e2e + VRT) |
| **Config file** | `vitest.config.ts`, `vitest.design.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:design` |
| **Full suite command** | `npm test && npm run test:design && npm run build` |
| **Estimated runtime** | ~90s quick (design only) / several minutes full |

⚠ **DB-backed tests need the provisioned test database.** `tests/setup.ts` unconditionally sets
`DATABASE_URL` to `fitout_test`; run `npm run db:test:setup` once per machine or `globalSetup` fails
fast. Do **not** pass a `DATABASE_URL` override. `npm run test:design` is DB-free by construction.

---

## Sampling Rate

- **After every task commit:** Run `npm run test:design`
- **After every plan wave:** Run `npm test && npm run test:design && npm run build`
- **Before `/gsd:verify-work`:** Full suite green **and** the five hard gates for every touched surface
- **Max feedback latency:** ~90 seconds (quick), design suite is DB-free and fast by design

---

## Per-Task Verification Map

Task IDs are assigned during planning; the requirement→test contract below is fixed now so no plan can
invent its own verification. Every row must resolve to a real command before the phase gate.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | BFLOW-08 | — | `?paid=1` shows the moment once; URL becomes `/bookings/{id}`; reload renders the ordinary page | e2e | `npx playwright test e2e/confirmation-decay.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BFLOW-08 | — | The poller never navigates away after the param is consumed (D-89 / Pitfall 2) | e2e | same spec, pending-seeded case | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TRUST-01 | — | Every status renders status + meaning, venue, address, venue-local time, host, itemised total, deadline, reference | unit (RTL) | `npx vitest run tests/booking/detail-completeness.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TRUST-01 / STATE-05 | T-13-SUP | Zero support affordances while `SUPPORT_EMAIL === null`; new components guarded lexically (D-64, Pitfall 4) | design | `npx vitest run --config vitest.design.config.ts tests/design/site-contacts.test.ts` | ✅ exists — **must stay green UNMODIFIED** | ⬜ pending |
| TBD | TBD | TBD | TRUST-02 | — | Reference present on every status; copy button writes the exact `FIT-` string | unit | `npx vitest run tests/booking/reference-surface.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TRUST-02 | — | `tabular-nums` (or `font-mono`) actually renders fixed-width — measured, not assumed (Open Q1) | e2e (rendering assertion) | `npx playwright test e2e/tabular-figures.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TRUST-03 | — | On-screen policy shows concrete dates derived from `LADDER` | unit | `npx vitest run tests/booking/cancellation-policy.test.ts` | ✅ exists — extend to new call sites | ⬜ pending |
| TBD | TBD | TBD | TRUST-04 | — | No forbidden trust string renders (`superhost`, `verified`, `responds within`, `rating`) — D-68 | design (source scan) | `npx vitest run --config vitest.design.config.ts tests/design/trust-signals.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TRUST-05 | T-13-PRICE | Receipt totals equal the DB's frozen centavos; refund is a separate line (D-76, GATE-05) | e2e | `npx playwright test e2e/receipt-parity.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TRUST-05 | — | Print stylesheet suppresses chrome; reference + total stay visible (D-74, Pitfall 3) | e2e (`emulateMedia({media:'print'})`) | `npx playwright test e2e/receipt-print.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | STATE-05 | — | Three states visibly distinct; not-completed never appears for an expired hold (D-70) | unit + e2e | `npx vitest run tests/booking/payment-states.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | STATE-05 | T-13-MONEY | Reversed copy never contains the not-completed sentence; manual-return branch never says "refunded" (D-83) | design (grep tripwire, two-piece idiom) | `npx vitest run --config vitest.design.config.ts tests/design/reversed-copy.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | STATE-06 | — | The money sentence renders above the fold in all three states, from one component (D-73) | unit | included in `payment-states.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | STATE-08 | — | No `toast()` call on any must-read outcome in `bookings/**` | design (AST scan) | extend `tests/design/status-vocab.test.ts` | ✅ exists — extend | ⬜ pending |
| TBD | TBD | TBD | (cross) D-88.1 | — | Exactly one `main` landmark on the pending / reversed / lapsed branches | e2e | extend `e2e/shell.spec.ts` with a `pending` seed | ✅ exists — extend | ⬜ pending |
| TBD | TBD | TBD | (cross) D-88.2 | — | Every Phase-13 live region is declared; the 10 named exclusions are discharged | design | `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx` | ✅ exists — exclusions must move | ⬜ pending |
| TBD | TBD | TBD | (cross) D-80 / GATE-06 | — | `drizzle/` still ends at `0025_audit_resolved_by.sql` — zero migrations | design | `npx vitest run --config vitest.design.config.ts tests/design/infra.test.ts` (or a new one-line assertion) | ⚠ verify | ⬜ pending |
| TBD | TBD | TBD | (cross) D-81 | — | `REFUNDABLE_RAILS` still excludes `qrph` — the re-probe result is pinned, not re-litigated | design | assertion over `src/lib/payments/refund-rail.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/helpers/seed-payment-states.ts` — seed `pending`, `pending`+live-hold, `cancelled`-reversed and `confirmed`-with-frozen-money rows. **Every payment-state test depends on it; today only `confirmed` rows are seeded anywhere.** This is the single highest-leverage Wave 0 item.
- [ ] `tests/design/trust-signals.test.ts` — the TRUST-04 forbidden-string scan. **Must use the two-piece string idiom** (`price-surface.test.ts`'s rule) so the test cannot disarm its own grep.
- [ ] `tests/design/reversed-copy.test.ts` — same two-piece idiom, for the D-83 sentence branch.
- [ ] `e2e/confirmation-decay.spec.ts`, `e2e/receipt-parity.spec.ts`, `e2e/receipt-print.spec.ts`, `e2e/tabular-figures.spec.ts`
- [ ] `tests/booking/payment-states.test.tsx`, `tests/booking/detail-completeness.test.tsx`, `tests/booking/reference-surface.test.tsx`
- [ ] Constant bumps that are **part of the work, not chores**: `loading-coverage.test.ts` 28/20/8 → 29/21/8; `live-regions.ts` exclusion count; `selector-contract.ts` rows for any new `data-testid`; `ALLOWED_RAW_CARD` if a raw `<Card>` is used.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A real hosted-checkout return renders the confirmation moment and consumes the param | BFLOW-08 | Requires a live PayMongo `sk_test_` checkout paid on the hosted page; no automated harness mints a real return | Book a slot, pay in test mode, confirm the moment renders, then confirm the URL bar reads `/bookings/{id}` and a reload shows the ordinary page |
| The receipt prints correctly on paper/PDF in **both** themes | TRUST-05 | `emulateMedia` proves the stylesheet applies; it cannot prove a dark-theme receipt is legible on paper | Print to PDF from the receipt route under both themes; confirm no solid-black flood and that reference + total are readable |
| QRPh manual-return copy matches what actually happens to the money | STATE-05 / D-82 / D-83 | The manual return is an operator action outside the app | Trigger a gone-slot reversal on a QRPh test payment; confirm the `needs_attention` audit row appears and the copy never says "refunded" |
| PayMongo's docs claim QR Ph is refundable; our probe says otherwise | D-81 | Third-party behaviour can change under us | Re-run the `/v1/refunds` probe with a fresh `Idempotency-Key`. If it ever returns 2xx, that is a **finding**, not a fix to apply silently — it changes D-82's policy split |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
