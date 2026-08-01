---
phase: 9
slug: open-capacity-bookings
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-30
completed: 2026-07-30
audited: 2026-08-01
audit_scope: plans 09-16…09-25 (post-sign-off), + the date-pass-picker harness defect
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `09-RESEARCH.md` §Validation Architecture. The SC#3 concurrent-overbook
> race is the non-negotiable acceptance gate (the Phase-3 SC#4 analog).
>
> **Filled in against the shipped plans by 09-15 (2026-07-30).** Every row below names a real
> plan/task, a file that exists on disk, and a command that was run.
>
> **Extended 2026-08-01 by `/gsd-validate-phase 9`.** The 09-15 sign-off was honest at the time it was
> made, but the phase did not stop there: plans **09-16 … 09-25** shipped afterwards, closing six
> code-review findings (CR-01…CR-06) and five warnings (WR-01…WR-05) with ten more mutation-measured
> test files. The map below now runs to the end of the phase. **No behaviour from those ten plans was
> found uncovered** — the gap was that this contract asserted compliance on evidence that stopped ten
> plans early. See the Validation Audit section at the foot of this file.

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

### Post-sign-off gap plans (09-16 … 09-25)

> These ten plans ran AFTER the 09-15 sign-off, each closing a specific `09-REVIEW.md` finding. The
> **Wave** column reads `gap` because they were sequential remediation plans, not a parallel wave. Every
> row was mutation-measured: the fix was deleted or inverted, the case observed RED, then restored with
> `git diff --exit-code src/` = 0. Several began as **confirmation** runs against unchanged `src/`
> (09-21 CR-04, 09-22 CR-05, 09-23 CR-06/WR-01, 09-24 WR-02) — the finding was reproduced red before
> any fix existed, which is a stronger provenance than a test written after the fix.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-16 T2 | 09-16 | gap | OPEN-04 | T-09-39 | OC-11 expectation gap converted to an ASSERTED contract: e2e case 2 buys passes ONE AT A TIME and pins the INVISIBLE 3 → 2 step (chip still `Spots available`, still digit-free at 2 of 3) as intentional, not a bug | e2e (real browser) | `npx playwright test e2e/open-capacity.spec.ts` | ✅ | ✅ green |
| 09-16 T2 | 09-16 | gap | OPEN-02 | T-09-31 | Pitfall-5 proven in the DATABASE: after a host-cancel of a drop-in booking, `availability_block` returns 0 rows and the date stays bookable for everyone else | manual walkthrough + live DB read-back | *(discharged 2026-07-31 — see Manual-Only)* | ✅ | ✅ green |
| 09-17 T1-T2 | 09-17 | gap | OPEN-02 | T-09-50 | **CR-01**: `confirmBooking`'s D-94 checkout cutoff forks on the PERSISTED `booking.open_capacity` — `ends_at` for a pass, `starts_at` for an exclusive booking, so a same-day pass is payable all day. NT-01 (booking.ts half): the "session has already started" sentence is now reachable only by an exclusive booking | integration + e2e | `npx vitest run tests/booking/open-capacity-confirm.test.ts` (3) · `npx playwright test e2e/open-capacity.spec.ts` (case 6) | ✅ | ✅ green |
| 09-18 T1-T3 | 09-18 | gap | OPEN-03, OPEN-04 | T-09-54…57 | **CR-03 layer 1**: the counter's identity is the VENUE-LOCAL CALENDAR DAY over the stored `starts_at`, not the opening instant re-derived from mutable host config — an hours edit can no longer empty the counted set, split the advisory lock into two domains for one date, or make a second full cap sellable. Mutation-measured at `expected 4 to be 3`; the month grid's own aggregate needed a SECOND, separate mutation | integration (hours-edit → claim seam) | `npx vitest run tests/availability/open-capacity-hours-rekey.test.ts` (5) | ✅ | ✅ green |
| 09-19 T1-T2 | 09-19 | gap | OPEN-03 | T-09-58 | **CR-03 layer 2**: an hours edit that would STRAND passes already sold is refused server-side by the REAL `saveOperatingHours` through a REAL session, and the persisted `operating_hours` rows are read back from Postgres to prove they did not move. Mutation-measured at `expected '07:00:00' to be '06:00:00'` | integration (drives the shipped action, not the new module) | `npx vitest run tests/availability/hours-lock.test.ts` (5) | ✅ | ✅ green |
| 09-20 T1-T3 | 09-20 | gap | OPEN-04, OPEN-02 | T-09-64 | a host `availability_block` closes a drop-in date on ALL surfaces: `getOpenDay` zeroes it in the same statement as the heads SUM, the month grid expands block rows to venue-local dates, and `createOpenCapacityHold` refuses it INSIDE the transaction under the advisory lock — case 3 asserts **no `booking` row exists**, so a crafted date cannot bypass the picker | integration | `npx vitest run tests/availability/open-capacity-blocks.test.ts` (7) | ✅ | ✅ green |
| 09-21 T1-T3 | 09-21 | gap | OPEN-01, OPEN-02 | T-09-68…72 | **CR-04** (confirmed real against unchanged `src/` first): the published-row EDIT path re-imposes all four drop-in publish rules, reusing the publish gate's own sentences. The claim FAILS CLOSED on money — a NULL/non-positive rate is a returned refusal, never a raised 500 (`grep -c "rejects"` prints 0), and host-input ceilings keep `perHead × cap` provably below int4 (mutation B proved the 22003 was genuinely reachable) | integration | `npx vitest run tests/listing/open-capacity-edit-gate.test.ts` (7) | ✅ | ✅ green |
| 09-22 T1-T2 | 09-22 | gap | OPEN-03 | T-09-73…77 | **CR-05** (confirmed real first): a drop-in pass cannot mint a group — guarded in BOTH `createGroup`'s pre-read gate and its defence-in-depth INSERT predicate, so `cap − 1` strangers can never be told they are coming. The caller sees the shared DENIED sentence; the `open_capacity` distinction lives only in the audit trail | integration | `npx vitest run tests/group/open-capacity-group-guard.test.ts` (3) | ✅ | ✅ green |
| 09-23 T1-T3 | 09-23 | gap | OPEN-02 | T-09-78…82 | **CR-06** (confirmed real first): a booker who PAID for passes on a date can buy more — the tokenless arm matches a LIVE `pending` hold and nothing else, so no silent redirect to the paid row. **WR-01** on both paths: `AND booker_id = …` in both key arms PLUS a booker-namespaced stored key, because mutation 2b proved the predicate alone trades disclosure for a 23505/500 | integration + component | `npx vitest run tests/booking/open-capacity-replay.test.ts` (7) · `npx vitest run tests/availability/date-pass-picker.test.tsx` (case 6b) | ✅ | ✅ green |
| 09-24 T1-T3 | 09-24 | gap | OPEN-04, OPEN-02 | T-09-83 / T-09-86 (AR-16) | **WR-02**: a split shift rolling past midnight sells ONE pass covering the whole envelope, and the hold is born payable not expired — while the counter's anchor deliberately does NOT follow the envelope (case 12 pins this so a future "fix" re-opens CR-03 in red, not in production). **WR-03**: `OPEN_LOW_STOCK_MAX` is parsed safely with a documented fallback, driving the SHIPPED `spotsState`/`getAvailability` under `vi.stubEnv`, not the constant | integration | `npx vitest run tests/availability/open-capacity-readmodel.test.ts` (16, incl. 12-16) | ✅ | ✅ green |
| 09-25 T1-T3 | 09-25 | gap | OPEN-02 | T-09-87…92 | **WR-05 / NT-01**: the booker cancellation window forks on mode (`ends_at` for a pass), so a same-day pass bought at 15:00 is no longer instantly non-cancellable — and `windowAlreadyOpen` is a REQUIRED prop rendered BEFORE payment, so a non-refundable charge is never undisclosed. The HOST flip is byte-untouched and its comment now records the asymmetry as a choice | integration + component | `npx vitest run tests/booking/open-capacity-cancel.test.ts` (9) · `npx vitest run tests/booking/cancellation-copy.test.tsx` (9) | ✅ | ✅ green |
| audit | — | audit | OPEN-04 | — | **harness defect, fixed 2026-08-01**: `date-pass-picker` case 4 intermittently hit Vitest's 5000ms default under multi-suite load (reproduced verbatim at **5384ms**). `vitest.config.ts` gained `testTimeout: 20_000` — the test's assertions are byte-unchanged, no `src/` change, no retry, no skip | harness | `npx vitest run tests/booking tests/payments tests/availability` (3 consecutive green post-fix) | ✅ | ✅ green |

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

| Calendar day-panel updates on the FIRST click, against a production build | OPEN-04 | `npx playwright test e2e/open-capacity.spec.ts` failed at case 1 in 4 of 5 attempts against `next dev` — a React-hydration/HMR race, not a logic defect (the sibling exclusive calendar was 4/4 with the identical click pattern, and `date-pass-picker.test.tsx` proves the selection logic 10/10 in jsdom). Whether it is inert needs a real production build, which Playwright against `next dev` cannot answer. | `npm run build && npm start`, open a published drop-in listing, click a date cell immediately after first paint without pausing, confirm the panel (heading, chip, hours, stepper) reflects the clicked date on the first click. | **09-VERIFICATION.md** |
| Concurrent reuse of ONE idempotency key across TWO different dates (`deferred-items.md` item 6) | OPEN-02 | Pre-existing and **unreachable from the shipped client** — `BookCta`'s token is memoized on `[listingId, dateIso, passes]`, so two dates cannot share a token; reaching it needs a hand-crafted concurrent pair of POSTs. Two simultaneous claims take two different advisory locks, so neither serialises the other and the loser's 23505 escapes as a raw 500. Fixing it means a new retry shape on the money path — more risk than the finding carries. | Not scheduled. If ever exercised: fire two concurrent `placeOpenHold` POSTs as the same booker, same idempotency key, two different dates; expect one 500. **Sequential** reuse is safe and IS covered — `open-capacity-replay.test.ts` case 6 pins that an existing key always replays. | *deferred (accepted)* |
| D-110 — `extraHeadFee > 0` refused on a drop-in listing's EDIT path (`deferred-items.md` item 5) | OPEN-01 | **Deliberate scope decision, not an omission.** Enforced at PUBLISH but not on edit, because `quoteOpenCapacity` never reads `extra_head_fee` — a stale surcharge changes no charge, payout or refund. Enforcing it would create a dead end: the wizard hides the group-pricing fields in drop-in mode, so a host would be refused with no control to clear the value. | Not scheduled. If closed later, prefer having `saveListingStep` NULL the column when the effective mode is `open_capacity` (a write, not a refusal). | *deferred (accepted)* |

*The PayMongo row above is the only manual-only item that was ever **correctness-critical**, and it is
discharged. Of the three added by this audit, one is a discharged-with-caveat harness question and two are
recorded **accepted** non-coverage — behaviours deliberately left unenforced or unreachable, logged here so
their absence from the map is a decision on the record rather than a silent hole. All correctness-critical
(no-overbook / spots-left / publish-gate / mode-refusal / partial-grant / replay / cancellation-window)
behaviors have automated verification, and the no-overbook gate is mutation-measured rather than merely green.*

**✅ DISCHARGED 2026-07-31 by the 09-16 walkthrough.** Three REAL PayMongo `checkout_session.payment.paid`
deliveries confirmed three drop-in bookings on the live `sk_test_` rail (Makati time):
`evt_oGtPa9Vd7ZqWFiPRntuSjacm` @ 01:31:16 → booking `215d2739-cca3-441b-a9d7-c9d5a339bcea`;
`evt_zBVdHpjZL1N6hmVtasiZ5K6X` @ 01:34:56 → `340b5323-b619-469a-81ae-dd79173e6e37`;
`evt_BRQR1Xx9FQcJhy2Dgvmti6m4` @ 01:36:14 → `5b992c46-abaf-4f16-b680-23c6b9296f81`. A `booking_confirmed`
notification row landed within ONE SECOND of each (01:31:16→:16, 01:34:56→:57, 01:36:14→:15), so the whole
chain — PayMongo → tunnel → webhook route → status flip → `inngest.send` → notify function → notification row
— is proven live, not mocked. See `09-16-SUMMARY.md` step 3.

**⚠️ DISCHARGED WITH CAVEAT 2026-08-01 — the calendar first-click row.** It **does not reproduce** against a
production build: `npm run build` (exit 0) + `npm start`, then `npx playwright test e2e/open-capacity.spec.ts`
run FOUR consecutive times → 6/6 every time (12.7s / 12.4s / 12.6s / 13.0s), with the shipped `pickDay()`
helper byte-unchanged and no settle wait added. The full e2e suite against the same production server was
**22/22 across 8 specs in 25.8s**. The `next dev` HMR/hydration diagnosis is confirmed and the defect is inert
in production. **The caveat is who discharged it: the execute-phase orchestrator, not a human.** It is left
in this table rather than struck out so that fact stays visible — re-run it with a human present if
independent confirmation is wanted. See `09-VERIFICATION.md` frontmatter, caveat (1).

---

## Recorded Gate Results (09-15 T2, 2026-07-30 — superseded, kept for provenance)

| Gate | Command | Result |
|------|---------|--------|
| Full unit/integration suite | `npx vitest run` | **1035 passed / 4 skipped (1039)** across 113 files passed / 1 skipped — **+174 tests over the 861 pre-phase baseline**, 0 failures |
| Typecheck | `npx tsc --noEmit` | exit 0, **0 errors** |
| Lint | `npm run lint` | exit 0, **0 errors / 7 warnings** (the accepted pre-existing baseline — 1 `react-hooks/incompatible-library` on the wizard's `form.watch()`, 6 unused-arg warnings in test mocks; no new warning) |
| Production build | `npm run build` | exit 0, full route table (29 routes + proxy/middleware) |
| E2E | `npx playwright test` | **21 passed** across 8 specs (16 pre-existing + 5 new) |
| Schema drift | `npm run db:generate` → `git status --short -- drizzle/` | *"No schema changes, nothing to migrate"*; `drizzle/` status **empty** — the 0019 phantom-migration lesson holds |

---

## Recorded Gate Results (current — 09-VERIFICATION 2026-08-01 + this audit)

> The 09-15 table above measured a repository that was ten plans younger. These are the numbers that hold.

| Gate | Command | Result |
|------|---------|--------|
| Full unit/integration suite | `npx vitest run` | **1087 passed / 4 skipped (1091)** across 120 files — **+52 over the 1035 recorded at 09-15**, 0 failures |
| Typecheck | `npx tsc --noEmit` | exit 0, **0 errors** |
| Lint | `npm run lint` | exit 0, **0 errors / 7 warnings** — the same accepted baseline as 09-15, no new warning across ten plans |
| E2E (production build) | `npm run build && npm start` → `npx playwright test` | **22 passed** across 8 specs in 25.8s |
| Phase-9 subset (this audit, 2026-08-01) | `npx vitest run tests/availability tests/booking tests/listing tests/group tests/search tests/validation tests/paymongo` | **800 passed / 4 skipped (804)** across 84 files, 117.2s, 0 failures |
| Flaky-case load gate (this audit) | `npx vitest run tests/booking tests/payments tests/availability` | **610 passed (610)** × 3 consecutive post-fix runs (81.5s / 88.3s / 89.1s). Pre-fix, the same command reproduced `Test timed out in 5000ms` at **5384ms** on run 2 of 2 |

---

## Validation Audit 2026-08-01

Run by `/gsd-validate-phase 9`. **State A** — audited the existing contract rather than reconstructing it.

| Metric | Count |
|--------|-------|
| Gaps found | 5 |
| Resolved | 5 |
| Escalated | 0 |
| Tests generated | 0 (none were needed — see below) |
| Impl files modified | **0** (`git status --short -- src/` empty) |

**What the audit actually found.** The contract was signed off at 09-15 and never revisited, while plans
09-16…09-25 shipped ten more mutation-measured test files. Four of the five gaps were therefore **record**
gaps, not coverage gaps — the tests existed, ran green, and simply were not named here:

1. Per-Task Map ended at 09-15; twelve files / ~55 cases from the ten gap plans were unrecorded → **map extended**.
2. Gate results still quoted 1035 passed → **refreshed to 1087**, with the 09-15 table kept for provenance.
3. `date-pass-picker.test.tsx` case 4 intermittently timed out under multi-suite load (`deferred-items.md`
   item 3) → **fixed**, the one real defect. `vitest.config.ts` had `hookTimeout: 120_000` and no
   `testTimeout`, leaving Vitest's 5s default; the failure was reproduced verbatim at 5384ms and the global
   knob raised to 20s. The test's assertions are byte-unchanged — no weakening, no `retry`, no skip, no `src/`
   change. A per-case override was rejected: the contention is generic to the box, so patching the one case
   that happened to get caught would leave every other async test equally exposed.
4. `deferred-items.md` items 5 and 6 were uncovered by design but absent from Manual-Only → **recorded as
   accepted non-coverage**, with the reasoning and the way out.
5. `09-VERIFICATION.md`'s human item was discharged **by the orchestrator, not a human** → **recorded with
   that caveat intact** rather than being quietly inherited as "done".

**Nothing shipped by 09-16…09-25 was found without automated verification.** The honest finding is not that
Phase 9 was under-tested — it is that the validation contract stopped tracking a phase that kept moving, so
`nyquist_compliant: true` was resting on a map that ended ten plans early. It no longer is.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (quick), full suite before phase gate
- [x] The frontmatter nyquist-compliance flag is set (see the header block)
- [x] The SC#3 no-overbook gate is **mutation-measured**, not merely green
- [x] Every correctness-critical row is ✅; the one correctness-critical manual-only row (PayMongo) is discharged
- [x] **The map covers the WHOLE phase, 09-01 … 09-25** — not just the plans that existed at first sign-off
- [x] Every post-sign-off gap plan (09-16…09-25) is mutation-measured; four began as red confirmations against unchanged `src/`
- [x] No test in the suite is knowingly flaky — the one intermittent case is fixed at the harness layer, not skipped or retried
- [x] Non-coverage is **recorded**, not implicit: deferred items 5 and 6 are named in Manual-Only as accepted

**Approval:** signed off 2026-07-30 by 09-15 Task 2 (repository gate green, no schema drift).
**Re-affirmed 2026-08-01** by `/gsd-validate-phase 9` after extending the map through 09-25 and fixing the
`date-pass-picker` harness defect. Full suite 1087 passed / 4 skipped / 0 failed; `src/` untouched.
