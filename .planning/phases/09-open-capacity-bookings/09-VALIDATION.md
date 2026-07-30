---
phase: 9
slug: open-capacity-bookings
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-30
completed: 2026-07-30
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `09-RESEARCH.md` §Validation Architecture. The SC#3 concurrent-overbook
> race is the non-negotiable acceptance gate (the Phase-3 SC#4 analog).
>
> **Filled in against the shipped plans by 09-15 (2026-07-30).** Every row below names a real
> plan/task, a file that exists on disk, and a command that was run.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (integration via isolated Postgres schemas) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` + `tests/helpers/db.ts` (`makeRacingClients`) + `playwright.config.ts` (`webServer` boots `npm run dev`) |
| **Quick run command** | `npx vitest run tests/availability/open-capacity-race.test.ts` |
| **Full suite command** | `npx vitest run` |
| **E2E command** | `npx playwright test` |
| **Measured runtime** | quick ~8s · full suite 84.8s (114 files) · e2e 51.4s (8 specs) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/availability/open-capacity-race.test.ts`
- **After every plan wave:** Run `npx vitest run tests/availability tests/validation tests/paymongo`
- **Before `/gsd-verify-work`:** Full suite (`npx vitest run`) must be green
- **Max feedback latency:** ~15 seconds (quick), full suite before phase gate

---

## Per-Task Verification Map

> Task IDs are `{plan} T{n}`, matching the `<task>` blocks in each PLAN.md.
> The **Wave** column records the wave the test actually shipped in. This phase did not use a
> literal wave-0 test-first ordering: the SC#3 race gate (09-03) was deliberately sequenced
> AFTER the claim it arbitrates (09-02) so it could drive the **shipped**
> `createOpenCapacityHold` over real concurrent connections and prove itself by **deleting the
> production `pg_advisory_xact_lock` line and watching the suite go red** — a strictly stronger
> guarantee than a red-first test against a stub, and the reason `wave_0_complete` is set below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-03 T2 | 09-03 | 3 | OPEN-03 | T-09-RACE | (cap+1)-th concurrent single-head claim rejected; committed SUM(heads) never exceeds cap | integration (genuine race) | `npx vitest run tests/availability/open-capacity-race.test.ts` | ✅ | ✅ green |
| 09-03 T2 | 09-03 | 3 | OPEN-03 | T-09-RACE | concurrent MULTI-head claims never overshoot cap; partial-fill grants exactly `remaining` (OC-07) | integration (race) | `npx vitest run tests/availability/open-capacity-race.test.ts` | ✅ | ✅ green |
| 09-03 T3 | 09-03 | 3 | OPEN-03 | T-09-RACE | **mutation gate**: deleting the shipped `pg_advisory_xact_lock` line turns the real-claim cases RED (`expected 4 to be 3`) | mutation (executed + restored) | `npx vitest run tests/availability/open-capacity-race.test.ts` | ✅ | ✅ green |
| 09-09 T1 | 09-09 | 3 | OPEN-03 | T-09-RELEASE | released seat re-bookable (cancel → remaining increments → a DIFFERENT booker's claim takes exactly them; OC-15 needs no release code) | integration | `npx vitest run tests/booking/open-capacity-cancel.test.ts` | ✅ | ✅ green |
| 09-03 T1 | 09-03 | 3 | OPEN-03 | T-09-EXCLUDE | second same-date open booking is NOT rejected by the narrowed EXCLUDE (Pitfall 1); overlapping exclusive rows still 23P01 | integration | `npx vitest run tests/availability/open-capacity-exclude.test.ts` | ✅ | ✅ green |
| 09-01 T1-T3 | 09-01 | 1 | OPEN-03 | T-09-EXCLUDE | the DDL itself: `occupancy_mode` accepts `open_capacity`, `per_head_price_cents` + `booking.open_capacity` exist, `booking_no_overlap` carries `AND open_capacity = false` | integration (live catalog read-back) | `npx vitest run tests/availability/open-capacity-exclude.test.ts` | ✅ | ✅ green |
| 09-04 T3 | 09-04 | 3 | OPEN-04 | T-09-READMODEL | `remaining = cap − SUM(occupying heads)`; server-derived `state`; month map's fully-booked date set | integration | `npx vitest run tests/availability/open-capacity-readmodel.test.ts` | ✅ | ✅ green |
| 09-05 T3 | 09-05 | 4 | OPEN-04 | T-09-PRICEFILTER | search keeps a drop-in candidate on a DATE alone iff ≥1 spot left; one `effectivePriceSql` drives both the `priceMax` ceiling and the price sort (the NULL-hourly-rate trap) | integration | `npx vitest run tests/search/open-capacity-search.test.ts` | ✅ | ✅ green |
| 09-06 T1 | 09-06 | 2 | OPEN-01 | T-09-TAMPER | publish gate: open mode requires per-head price + a positive cap, forbids hourly/day, forces instant, forces `unitCount = 1`, forbids `extraHeadFee` | unit | `npx vitest run tests/validation/listing-schema.test.ts` | ✅ | ✅ green |
| 09-06 T2 | 09-06 | 2 | OPEN-01 | T-09-MODELOCK | OC-17: the occupancy mode is editable only until a live booking exists; `saveListingStep` refuses a genuine mode CHANGE, an autosave echoing the stored mode still passes | integration | `npx vitest run tests/listing/mode-lock.test.ts` | ✅ | ✅ green |
| 09-10 T1-T2 | 09-10 | 3 | OPEN-01 | — | the host wizard's occupancy step + the drop-in pricing/checklist fork; the booking-mode step leaves the WALKED list (OC-10) so "Step X of Y" stays truthful | component | `npx vitest run tests/listing/wizard-occupancy.test.tsx` | ✅ | ✅ green |
| 09-07 T1-T2 | 09-07 | 3 | OPEN-02 | T-09-26 / T-09-24 | `placeOpenHold` mints a real hold behind the same seven gates; `openHoldSchema` strips a smuggled `startUtc`/`endUtc`/`fullDay`; both cross-mode refusals (each mutation-measured) | integration | `npx vitest run tests/booking/open-capacity-hold.test.ts` | ✅ | ✅ green |
| 09-07 T3 | 09-07 | 3 | OPEN-02 | — | one booking row per payment; the confirm webhook flips an OPEN booking pending→confirmed with `declared_pax`/`open_capacity`/`unit`/`full_day`/both instants/the frozen triple unchanged | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ✅ | ✅ green |
| 09-02 T3 | 09-02 | 2 | OPEN-02 | — | `quoteOpenCapacity` freezes perHead × heads with NO duration term | unit | `npx vitest run tests/booking/open-capacity-pricing.test.ts` | ✅ | ✅ green |
| 09-08 T1-T3 | 09-08 | 2 | OPEN-02 | T-09-CR01 | a drop-in booking never renders as a 16-hour range on ANY surface; `WhenLabelInput.openCapacity` is REQUIRED (compiler census, 15 call sites / 14 files) + the raw-SQL alias guards | unit + integration | `npx vitest run tests/booking/when-label.test.ts tests/booking/views.test.ts tests/notifications/reminders.test.ts` | ✅ | ✅ green |
| 09-09 T2 | 09-09 | 3 | OPEN-02 | T-09-32 | host-cancel SKIPS the D-70 anti-resell auto-block for a drop-in booking; the consequence copy drops its Block bullet (mutation-measured both ways) | integration + component | `npx vitest run tests/booking/open-capacity-cancel.test.ts tests/booking/cancellation-copy.test.tsx` | ✅ | ✅ green |
| 09-11 T1-T2 | 09-11 | 3 | OPEN-04 | T-09-13 / T-09-39 | `SpotsLeftChip` renders the SERVER-decided state verbatim — never re-derives the threshold, never compares `remaining` to a literal, and the `open` state carries NO digit | component | `npx vitest run tests/availability/spots-left-chip.test.tsx tests/booking/pass-stepper.test.tsx` | ✅ | ✅ green |
| 09-12 T1-T3 | 09-12 | 4 | OPEN-02 | — | `DatePassPicker` mounts no hour picker of any kind; a full date rides react-day-picker's own `disabled` matcher; the exclusive calendar is byte-identical | component | `npx vitest run tests/availability/date-pass-picker.test.tsx` | ✅ | ✅ green |
| 09-13 T1-T2 | 09-13 | 4 | OPEN-02 | T-09-PARTIAL | OC-07 partial grant: the notice states the granted count, the FROZEN new total and `Nothing has been charged yet.`, precedes `Confirm & pay` in the tab order, and has no control that can hide it | component | `npx vitest run tests/booking/price-breakdown-open.test.tsx tests/booking/partial-grant-notice.test.tsx` | ✅ | ✅ green |
| 09-14 T1-T2 | 09-14 | 5 | OPEN-04 | — | a drop-in search card names the mode, prices `/person`, shows the chip only with a date in play (OC-12), and its link carries `?date=` alone | component | `npx vitest run tests/search/search-card-open.test.tsx tests/listing/listing-card.test.tsx` | ✅ | ✅ green |
| 09-15 T1 (amended 09-16) | 09-15 | 6 | OPEN-04 | T-09-46 | **E2E: two bookers share a date; the head count decrements in the DB on every pass and is DISCLOSED on screen only from `lowStockThreshold(cap) = clamp(floor(cap/2), 1, OPEN_LOW_STOCK_MAX)` downward — at the fixture's cap 3 the threshold is 1, so the first pass sold is deliberately INVISIBLE (`Spots available` at both 3 and 2 remaining) and only the second head reads `Only 1 left`. Both steps are now asserted (09-16 added the one-pass-at-a-time case). Sold out is calm + programmatically disabled, and a full date leaves search** | e2e (real browser) | `npx playwright test e2e/open-capacity.spec.ts` | ✅ | ✅ green |
| 09-15 T1 | 09-15 | 6 | OPEN-02 | T-09-CR01 | **UI-SPEC O2 against a REAL rendered page**: the only clock-time range in the drop-in document is the venue's own "Open …" hours line; no drop-in search card renders a `:` at all | e2e (real browser) | `npx playwright test e2e/open-capacity.spec.ts` | ✅ | ✅ green |
| 09-15 T2 | 09-15 | 6 | OPEN-01..04 | T-09-47 / T-09-48 | repository gate: full suite + tsc + lint + build + e2e green, and `npm run db:generate` proposes no migration (no schema drift) | gate | `npx vitest run && npx tsc --noEmit && npm run lint && npm run build && npm run db:generate && git status --short -- drizzle/` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/availability/open-capacity-race.test.ts` — the SC#3 acceptance gate (OPEN-03). **Shipped 09-03** (6 cases, two layers) using `makeRacingClients` (independent connections, never one `max:1` client) and driving the **real** `createOpenCapacityHold` with a DISTINCT seeded booker per racer. Mutation gate satisfied: deleting the `pg_advisory_xact_lock` line in `src/lib/availability/units.ts` turns the real-claim cases RED (`expected 4 to be 3`, `expected 6 to be 5`), measured against the COMMITTED head SUM read over an independent connection. Both mutations executed and restored (`git diff --exit-code` = 0).
- [x] `tests/availability/open-capacity-exclude.test.ts` — Pitfall 1 same-date multi-booking passes under the narrowed EXCLUDE (OPEN-03). **Shipped 09-03** (4 cases), reading `pg_get_constraintdef` back NAMESPACE-SCOPED to the isolated schema.
- [x] `tests/availability/open-capacity-readmodel.test.ts` — spots-left projection `{ remaining, cap, state }` (OPEN-04). **Shipped 09-04**, with both predicate mutations executed RED and restored.
- [x] Extend `tests/validation/listing-schema.test.ts` — mode-forked publish gate (OPEN-01). **Shipped 09-06**, all four mutation kills confirmed RED. *(Stale-path correction: the research map seeded a `listing` test path in that directory that has never existed on disk; the shipped file is and always was `listing-schema.test.ts`.)*
- [x] Extend `tests/paymongo/webhook-payment-paid.test.ts` — open booking confirm (OPEN-02). **Shipped 09-07**; the PayMongo rail itself is byte-untouched and proven so (`git diff --exit-code` on the webhook route = 0).
- [x] Playwright E2E — two-booker shared-date decrement + sold-out (OPEN-04). **Shipped 09-15** as `e2e/open-capacity.spec.ts` (5 serial cases). *(Stale-path correction: the research map left the Playwright spec unnamed; it resolves to this path.)* **Wording correction, 2026-07-31 / 09-16:** "decrement" here means the DB count moves on every head, while the SCREEN discloses an exact figure only at `remaining <= lowStockThreshold(cap)`. 09-15's case took 2 heads in ONE insert (3 → 1) and so never crossed the invisible 3 → 2 step a human buying one pass at a time hits first; 09-16 added that step as an explicit assertion (chip still `Spots available`, still digit-free, at 2 of 3), mutation-measured. See 09-15-SUMMARY's Correction note and `deferred-items.md` item 2.
- Framework install: **none** (Vitest + Playwright + `makeRacingClients` all present, as predicted).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Owner |
|----------|-------------|------------|-------------------|-------|
| Real PayMongo hosted-checkout charge for an open-capacity booking | OPEN-02 | A PayMongo hosted checkout cannot be driven from Playwright (e2e/search-and-book.spec.ts header). The rail is unchanged and already UAT-covered by Phase 6/8; what remains unproven by machine is a real drop-in charge end to end. | Book an open listing end-to-end in test mode; confirm the `checkout_session.payment.paid` webhook flips the single open booking `pending→confirmed` with `declared_pax`, `open_capacity`, `unit`, `full_day` and the frozen price triple unchanged. | **09-16** (human-verify checkpoint plan) |

*This is the ONLY remaining manual-only verification in the phase. All correctness-critical
(no-overbook / spots-left / publish-gate / mode-refusal / partial-grant) behaviors have automated
verification, and the no-overbook gate is mutation-measured rather than merely green.*

**✅ DISCHARGED 2026-07-31 by the 09-16 walkthrough.** Three REAL PayMongo `checkout_session.payment.paid`
deliveries confirmed three drop-in bookings on the live `sk_test_` rail (Makati time):
`evt_oGtPa9Vd7ZqWFiPRntuSjacm` @ 01:31:16 → booking `215d2739-cca3-441b-a9d7-c9d5a339bcea`;
`evt_zBVdHpjZL1N6hmVtasiZ5K6X` @ 01:34:56 → `340b5323-b619-469a-81ae-dd79173e6e37`;
`evt_BRQR1Xx9FQcJhy2Dgvmti6m4` @ 01:36:14 → `5b992c46-abaf-4f16-b680-23c6b9296f81`. A `booking_confirmed`
notification row landed within ONE SECOND of each (01:31:16→:16, 01:34:56→:57, 01:36:14→:15), so the whole
chain — PayMongo → tunnel → webhook route → status flip → `inngest.send` → notify function → notification row
— is proven live, not mocked. See `09-16-SUMMARY.md` step 3.

---

## Recorded Gate Results (09-15 T2, 2026-07-30)

| Gate | Command | Result |
|------|---------|--------|
| Full unit/integration suite | `npx vitest run` | **1035 passed / 4 skipped (1039)** across 113 files passed / 1 skipped — **+174 tests over the 861 pre-phase baseline**, 0 failures |
| Typecheck | `npx tsc --noEmit` | exit 0, **0 errors** |
| Lint | `npm run lint` | exit 0, **0 errors / 7 warnings** (the accepted pre-existing baseline — 1 `react-hooks/incompatible-library` on the wizard's `form.watch()`, 6 unused-arg warnings in test mocks; no new warning) |
| Production build | `npm run build` | exit 0, full route table (29 routes + proxy/middleware) |
| E2E | `npx playwright test` | **21 passed** across 8 specs (16 pre-existing + 5 new) |
| Schema drift | `npm run db:generate` → `git status --short -- drizzle/` | *"No schema changes, nothing to migrate"*; `drizzle/` status **empty** — the 0019 phantom-migration lesson holds |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (quick), full suite before phase gate
- [x] The frontmatter nyquist-compliance flag is set (see the header block)
- [x] The SC#3 no-overbook gate is **mutation-measured**, not merely green
- [x] Every correctness-critical row is ✅; the one manual-only row is assigned to 09-16

**Approval:** signed off 2026-07-30 by 09-15 Task 2 (repository gate green, no schema drift).
