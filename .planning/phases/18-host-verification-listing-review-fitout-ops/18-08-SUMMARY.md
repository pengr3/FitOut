---
phase: 18-host-verification-listing-review-fitout-ops
plan: 08
subsystem: payments
tags: [server-actions, postgres, drizzle, refunds, enforcement, ops, policy-constant, vitest]

# Dependency graph
requires:
  - phase: 18-02
    provides: "`'ops'` on the `cancelled_by` pgEnum (drizzle/0027) — added by a migration that wrote it nowhere, which is what made it safe under PG 55P04. This plan is its first runtime write."
  - phase: 18-05
    provides: "`requireStaff()`, the ops rate-limit/audited-denial idiom, `src/lib/validation/ops.ts` and the listing rejection taxonomy"
  - phase: 18-07
    provides: "the payout freeze — the reason a cancellation fee on a suspended host would never be collected, and the sweep predicate this plan relies on to pay the host nothing"
  - phase: 07
    provides: "`cancelBookingAsHost` and the whole cancellation module: `loadBookingRow`, the frozen split, the auto-block, the refund dispatch with its two needs_attention branches, `voidGroupAndNotifyAttendees`"
provides:
  - "ENF-03: `cancelBookingAsOps` — FitOut cancels a confirmed booking on a listing it has judged fake and sends the booker's money back, with an authenticated staff actor on the record"
  - "`OPS_CANCEL_REFUNDS_SERVICE_FEE` — a LITERAL `false` in `src/lib/payments/fees.ts`, read at exactly ONE site, absent from `.env.example` by design"
  - "`opsRefundBasisCents` — the one expression both the money and the console's impact figures go through, carrying the D-236 conflict in full"
  - "`loadOpsCancelImpact(dbConn, listingId)` — the pre-formatted figures 18-UI-SPEC's confirm dialog renders, including D-241's `notCancellableCount` and its reason"
  - "`opsCancelSchema` — both ids, the two-member D-233 lever defaulting to the LIGHTER one, the taxonomy reason and the bounded note"
  - "tests/payments/ops-cancel.test.ts — 16 cases, three mutation REDs"
affects: [18-09 (owns the ops-cancellation notification copy this path deliberately does not send), 18-10 (the console that calls loadOpsCancelImpact and cancelBookingAsOps), 18-14 (the phase summary this conflict LEADS)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A money POLICY as a literal constant with exactly one read site and the counter-argument written beside it — deliberately NOT env-tunable, so changing it is a reviewed one-line commit rather than a deployment setting"
    - "Sibling action over a flagged one: where two of five forks would fail SILENTLY, a second function with each fork documented at its own site beats a boolean parameter"
    - "A suppressed consequence proved by RUNTIME EVIDENCE — assert the consequences that bracket it ran, so the absence cannot be satisfied by a short-circuit"

key-files:
  created:
    - src/lib/ops/cancel-impact.ts
    - tests/payments/ops-cancel.test.ts
  modified:
    - src/lib/payments/fees.ts
    - src/lib/validation/ops.ts
    - src/app/actions/cancel-booking.ts

key-decisions:
  - "D-209 shipped EXACTLY as the PM stated it — booker refunded the space price, FitOut retains the D-74 service fee, host paid nothing — despite a shipped precedent arguing the opposite. The conflict is documented, not resolved."
  - "The single read site is `opsRefundBasisCents` in `src/lib/ops/cancel-impact.ts`, not `cancel-booking.ts` as the plan named — that module is `\"use server\"`, so a shared pure helper cannot live there, and the alternative was two restatements of a money policy with no compiler tying them together"
  - "D-241 implemented as a REPLACEMENT guard in the flip's WHERE (`NOT EXISTS` a payout row in `processing`/`paid`), never as a dropped guard — the no-clawback property D-94 protected is preserved, the fraud blind spot is not"
  - "The D-71 fee debit is an ABSENCE, not a zero: a zero fee would still write a ledger row and drive a ₱0 claim, which this file already calls CR-01's disease in a new place"
  - "The escalation is re-asserted SERVER-SIDE: an omitted `lever` parses to the lighter D-233 option and cancels nothing, because 18-UI-SPEC's three-deliberate-acts arrangement is a client arrangement and a `\"use server\"` export is reachable by POST"
  - "30/60s rate budget (the ops budget) rather than this file's 5/60s money budget — one operator decision fans out over every booking on a listing, and 5 would leave a fake listing HALF-cancelled"

patterns-established:
  - "Pattern 1: when a policy is contested, isolate it behind ONE literal constant with ONE read site and put the losing argument at that site — the next reader inherits the trade-off instead of rediscovering it"
  - "Pattern 2: prove a suppression by observing the consequences on BOTH sides of it (auto-block before, refund dispatch after), so 'no row' cannot mean 'the code never got there'"
  - "Pattern 3: a refusal that names its own reason and audits it under a distinct meta reason (`payout_already_sent` vs `not_active`) — a repudiation problem, not a copy one"

requirements-completed: [ENF-03]

# Metrics
duration: 80min
completed: 2026-09-01
---

# Phase 18 Plan 08: Ops Cancel-and-Refund Summary

**FitOut can now cancel the bookings on a confirmed-fake listing and put the bookers' money back — at five forks from the host-cancel machinery, two of which would otherwise have failed silently — and the one place this phase diverges from a shipped precedent sits behind a literal `false` with the counter-argument written beside it.**

---

## ⚠ LEADS THE PHASE SUMMARY — D-236, THE ONE PLACE THIS PHASE CONTRADICTS SHIPPED CODE

**This is for the PM, and it is not resolved. It was implemented exactly as answered.**

The PM answered PM-4 on 2026-09-01, in their own words:

> *"booker 100% refund, but not the service fee / platform fee"*

That is what ships: an ops-forced cancellation refunds the booker the **space price** (₱1,000 on the test fixture), FitOut **retains the D-74 service fee** (₱50), and the host is paid **nothing**.

**The conflict, found AFTER they answered.** `src/app/actions/cancel-booking.ts:1134-1137` — the HOST-initiated cancellation path — already refunds the booker the full charge *including that same service fee*, and argues the point in its own words:

> *"The refund is the FULL charge — space price AND the D-74 service fee. This is the ONE case where the non-refundable fee IS returned: the booker did nothing wrong, so the platform, not the booker, absorbs the gateway cost of the reversal. Read off the frozen row, never recomputed."*

An ops-forced cancellation fires because **FitOut has confirmed the listing is fake**. That is a *strictly stronger* instance of "the booker did nothing wrong" than a host who merely flaked — the booker was not let down, they were defrauded on a marketplace that took their money and its own cut. As it stands, **FitOut is less generous to a defrauded booker than to an inconvenienced one**, and the two paths state opposite principles about the same fee four hundred lines apart.

**The question put to the PM did not mention this precedent. That is an omission in how the question was framed, not in their answer**, and a money call is not re-decided by an engineer who noticed a better argument afterwards.

**What was done instead:**

| | |
|---|---|
| The constant | `OPS_CANCEL_REFUNDS_SERVICE_FEE = false` — `src/lib/payments/fees.ts:82` |
| Is it a literal? | **Yes.** Not `process.env`, not `=== "true"`. Every neighbour in that file reads the environment with a documented default; this one deliberately does not, so flipping it is a **reviewed code change**, never a deployment setting that could change silently. |
| In `.env.example`? | **No, deliberately** — documenting it there would advertise exactly the tunability it exists to refuse. |
| Read sites | **One.** `opsRefundBasisCents`, `src/lib/ops/cancel-impact.ts:95`. |
| Where is the argument written? | **In full, at that read site**, with the precedent quoted verbatim — and restated at the call site in `cancelBookingAsOps`, which points back to it. |
| Cost to flip | **One line.** `false` → `true`. It changes the money AND the figures the console shows, together, because both go through that one expression. |
| Is "one line" measured? | **Yes** — `tests/payments/ops-cancel.test.ts` cases 1, 2 and 3 run the action and the impact read under **both** values, with explicit centavos (₱1,000.00 / ₱1,050.00 refunded; ₱50.00 / ₱0.00 retained). Nothing in `cancel-booking.ts` is touched to flip it. |

**PM: if you re-decide this, the whole change is `false` → `true` at `src/lib/payments/fees.ts:82`, and case 1 of the test file swaps with case 2.** Nothing else moves.

---

## The five forks, and what each now does

`cancelBookingAsOps` is a **sibling** of `cancelBookingAsHost` in the same module — not a flag on it — because **two of the five host-specific parts fail SILENTLY** rather than loudly. Each fork is documented at its own site so nobody editing one has to find a header block first.

| # | Host-path behaviour | Failure mode if inherited | What the ops path does |
|---|---|---|---|
| 1 | `loadHostOwnedBooking(bookingId, userId)` | **Loud** — refuses every ops call (the benign one) | Not called. The ops read is the authorization-free `loadBookingRow`; ops standing was settled by `requireStaff()` before the parse, and the SCOPE moves into the WHERE at fork 2. |
| 2 | `AND EXISTS (… l.host_id = ${userId})` | 0-row flip explained as *"no longer active"* — **misleading**, the booking is perfectly active | `AND listing_id = ${listingId}` — the booking must belong to the listing the operator judged. Same SHAPE: still a guard in the WHERE, so a 0-row result stays the single calm failure path. |
| 3 | `AND starts_at > now()` (D-94) | **SILENT** — protects exactly the bookings most worth undoing, reported as a past-start refusal | **Replaced, not dropped** (D-241): `AND NOT EXISTS (… host_payout_ledger … kind='payout' AND state IN ('processing','paid'))`. A space confirmed fake is fake whether or not the clock started; the property D-94 protected (never promise a refund we'd have to claw back) is stated directly. |
| 4 | `SET cancelled_by = 'host'` | **SILENT** — durably blames the host for FitOut's own decision | `cancelled_by = 'ops'` (D-244). `'system'` was rejected in the other direction: it means *no person decided this*, and an ops cancellation is a named human's decision — the whole point of OPS-03. |
| 5 | `emitNotify("booking_cancelled_by_host")` ×2 | **SILENT** — tells a defrauded booker their host cancelled on them, and quotes the host a fee D-235 suppresses | Neither call fires. The gap is deliberate and **dated**: the comment names plan **18-09** as the owner of the correct ops copy. Attendees ARE still told (`group_cancelled` blames nobody and is true here). |

### The four consequences, re-decided one by one

1. **The money** — refunded on the D-209 basis (see above), dispatched through the shipped `createRefund` discipline with both `refund_dispatch_failed` and `refund_manual_required` needs_attention branches reused unchanged. Money is never silently kept.
2. **The audit row** — `ops_cancel_booking`, a verb distinct from `host_cancel_booking`, with `actorId` = the id `requireStaff()` returned (D-218) and `hostId` in the meta so the row is still findable by host. Written on **both** branches; D-215 says the trail is the control, so it is not optional.
3. **The auto-block of the freed window** — **KEPT**. Weaker purpose here (the listing is being pulled anyway) but it costs nothing, and removing a consequence is a decision rather than a simplification. The Phase-9 drop-in fork is inherited unchanged.
4. **The D-71 fee debit** — **SUPPRESSED** (D-235), as an **absence**, not a zero. Billing a host ₱300 for being removed for fraud is meaningless, and 18-07 froze the payout it would net against, so it would never be collected either — just a permanent phantom debt on a suspended account. A zero fee would still write a ledger row and drive a ₱0 claim, which this very file calls *"CR-01's disease in a new place"*. The host path's debit block is **untouched** (`grep -c "host_cancel_fee"` unchanged at 4).

**`retained_space_cents = 0`** stays in the flip, and it is the *entire* mechanism by which "the host is paid nothing" is enforced: `queryDuePayouts`'s shipped `status='cancelled' AND COALESCE(retained_space_cents,0) > 0` predicate then excludes the booking, with **no new code anywhere**. NULL would fall through to `COALESCE(retained, space_price)` and pay the host the full space price — the exact inversion. Asserted by driving the sweep **before and after**.

---

## `'ops'` was written for the first time here, long after its migration committed

D-244's migration hazard, closed. `drizzle/0027` added `'ops'` to the `cancelled_by` pgEnum in 18-02 and **did nothing else** — no backfill, no write. PG `55P04` forbids *using* a value added to an already-committed type inside the same transaction, and both migrators wrap all pending migrations in one. That separation is exactly what made the migration safe, and it left the value inert until now. The first runtime write is the `SET cancelled_by = 'ops'` in this plan's flip, one wave later.

---

## The by-hand review of the `cancelledBy` display forks (tsc cannot flag these)

`deriveDisplayStatus` / `deriveBookingStatusView` / `declinedCopy` all take `cancelledBy` as a **widened `string | null`**, and the column is read as `::text`. So `tsc` sees nothing when a new enum value appears — this review is the only census there is.

| # | Site | Predicate | With `'ops'` |
|---|---|---|---|
| 1 | `src/components/booking/booking-status.ts:79` (`deriveDisplayStatus`) | `status === "declined" && cancelledBy === "booker"` | Falls through (ops rows are `cancelled`, never `declined`; and `'ops' !== 'booker'`) → renders **`cancelled`**. ✅ |
| 2 | `src/components/booking/booking-status.ts:93` (`deriveBookingStatusView`) | forwards to #1, exhaustive switch | Lands on `case "cancelled"` → **"Cancelled"**, `tone: neutral`, `icon: Ban`, both sides. ✅ |
| 3 | `src/components/booking/booking-status.ts:150` (`declinedCopy`) | `cancelledBy === "booker"` else host-decline copy | **Structurally unreachable**: only rendered on a `declined` booking, and the ops path only touches `confirmed` rows, whose terminal status is `cancelled`. Recorded as a latent (not live) wrong sentence if any future path ever writes `'ops'` onto a `declined` row. |
| 4 | Three `cancelledBy === null` predicates — `bookings/[id]/page.tsx:995` (`systemRetired`), `bookings/[id]/page.tsx:1050` (`lapsedApproval`), `receipt/page.tsx:197` (`reversalShape`) | `=== null` | `'ops'` is non-null ⇒ all **false**, which is the correct answer: an ops cancellation *is* a decision — exactly what those predicates exclude — and it is a paid booking with a refund, not a lapse. ✅ |

Plus one **action** fork, reviewed on the same pass: `src/app/actions/re-request.ts:177` (`isResendableLapse`) also requires `cancelledBy === null`, so an ops-cancelled booking is correctly **not** offered "re-request the same window" on a listing FitOut just pulled. ✅

**Verdict: `'ops'` renders as a plain "Cancelled" everywhere, and no surface needed a change.**

---

## The three mutation REDs (watched, observed, reverted)

Each mutation was applied to `src/app/actions/cancel-booking.ts`, the suite run, the message recorded, and the file restored with `git checkout --` (verified: `git status --porcelain` clean afterwards, greps back at baseline).

| # | Mutation | Observed | Message |
|---|---|---|---|
| 1 | `cancelled_by = 'ops'` → `'host'` | **3 failed / 13 passed** — cases 2, 6, 8 | `AssertionError: expected 'host' to be 'ops' // Object.is equality` |
| 2 | The `NOT EXISTS` payout predicate deleted from the flip's WHERE | **2 failed / 14 passed** — cases 9 (`processing`) and 10 (`paid`) | `AssertionError: expected true to be false // Object.is equality` |
| 3 | `emitNotify("booking_cancelled_by_host")` added to the ops path | **1 failed / 15 passed** — case 12 | `AssertionError: expected [ 'booking_cancelled_by_host' ] to not include 'booking_cancelled_by_host'` |

All three are forks that would otherwise fail **silently**, which is precisely why they were the ones mutation-proved.

---

## Guarding against vacuous assertions

Two of this plan's claims are *absences*, and the toolchain landmine here is real — this repo shipped `checkout-probe.test.ts` with three cases passing for the wrong reason, where the tell was **runtime, not output**. So:

- **The absent fee debit (case 4)** additionally asserts the path **ran through** the position where the debit would be written: the auto-block insert lands **before** it (asserted present, with the right window) and the refund dispatch lands **after** it (asserted called once). A short-circuit, a throw, or an early return cannot satisfy both. Case 4 also asserts the absence *twice* — a Drizzle kind-scoped select AND a raw `COUNT(*)::int = 0` — so "no rows" cannot be misread later as "a row that happened to be zero".
- **Case 5 is a positive control** driving the HOST path over a comparable booking and showing the debit row **is** written there, with `netCents < 0`. Without it, case 4 would also pass against a broken query or the wrong ledger kind.
- **Case 12's negative** (no host-cancel notification) is paired **in the same test** with a positive control that drives the host path and asserts the observer catches **2** emissions.
- **Case 7's sweep exclusion** drives `queryDuePayouts` **before** the cancel (asserting the booking IS due) as well as after, so the exclusion is a change this action caused rather than a booking the sweep never wanted.
- **Case 14's gate refusal** is paired with a positive control running the identical call as staff.
- **Case 1** asserts the value of the constant itself first, so a future flip fails there — naming the reason — instead of cases 1 and 2 mysteriously swapping results.

---

## Deviations from Plan

### 1. [Rule 3 — Blocking] The single read site is `cancel-impact.ts`, not `cancel-booking.ts`

- **Found during:** Task 1, designing the impact read.
- **Issue:** The plan named `src/app/actions/cancel-booking.ts` as the constant's single read site, and *also* required `loadOpsCancelImpact` to compute "the sum of the per-booking refund basis chosen by `OPS_CANCEL_REFUNDS_SERVICE_FEE`". Both cannot be true: `cancel-booking.ts` carries `"use server"`, so every export from it is a POST-reachable server action and a shared **pure** helper cannot live there. Honouring the plan literally would have forced the impact read to *restate* the ternary — two copies of a money policy in two files with no compiler tying them together, which is the exact shape D-253 has just finished recording as a known structural gap on the payout freeze, and which would let the dialog promise a figure different from the one the server moves (D-130 / GATE-05).
- **Fix:** `opsRefundBasisCents` lives in `src/lib/ops/cancel-impact.ts` (a plain `server-only` module) and is **called** by both `loadOpsCancelImpact` and `cancelBookingAsOps`. This satisfies 18-04's carried-forward rule that *the census counts callers, not restatements*, and it holds the plan's own acceptance criterion — `grep -rl OPS_CANCEL_REFUNDS_SERVICE_FEE src/ --include=*.ts` returns **exactly two files** — after *both* tasks rather than only after Task 1.
- **The conflict is still documented at the read site, in full, with the precedent quoted verbatim**, and restated at the call site in `cancelBookingAsOps` (`grep -c "the booker did nothing wrong" src/app/actions/cancel-booking.ts` = 3, plan required ≥ 2).
- **Files:** `src/lib/ops/cancel-impact.ts`, `src/app/actions/cancel-booking.ts`
- **Commits:** `cb7dc5a`, `eff3939`

### 2. [Rule 2 — Missing critical functionality] The escalation is re-asserted server-side

- **Found during:** Task 1, writing `opsCancelSchema`.
- **Issue:** 18-UI-SPEC's answer to *"this must not be hit by muscle memory"* is that no control on the queue row can cancel-and-refund anything — the operator must open a dialog, choose a reason, and actively move a radio off its default. That is a **client arrangement**, and a `"use server"` export is reachable by POST whatever the UI shows. Nothing in the plan re-checked it on the server, so a bare POST could have reached the escalation with no deliberate act at all.
- **Fix:** `lever` is a required field of the parsed schema with the LIGHTER D-233 option as its default; `cancelBookingAsOps` refuses unless `block_new_and_cancel` was passed explicitly, with an audited `lever_not_escalated` denial. An omitted lever cancels nothing.
- **Files:** `src/lib/validation/ops.ts`, `src/app/actions/cancel-booking.ts` · **Test:** case 15 · **Commits:** `cb7dc5a`, `eff3939`

### 3. [Rule 1 — Bug] Backticks inside a `sql` template literal

- **Found during:** Task 2, first typecheck. Four SQL comments quoted identifiers in backticks *inside* the tagged template, terminating it — `TS1005: ',' expected` ×4.
- **Fix:** the four comments reworded without backticks. Caught by `tsc` in the same task, before commit.

### 4. Acceptance-grep hygiene (the recurring landmine, four phases running)

The plan's Task-2 action text asks for reasoning that *spells* strings its own acceptance criteria count. Two prose occurrences had to be reworded so the comments explaining a behaviour were not what moved the count:

- `starts_at > now()` → written as *"the host path refuses once the session has begun (D-94)"*. Count held at **3**.
- `host_cancel_fee` → written as *"the cancellation-fee DEBIT row"*, with a parenthetical saying why the literal is not spelled — the repo's own `drizzle/0021` idiom, restated at `validation/cancellation.ts:16-19` and `review-queue.ts`. Count held at **4**.

Final greps, all at or within their required values: `starts_at > now()` **3** (unchanged) · `booking_cancelled_by_host` **5** (unchanged; the plan's stated baseline of "2" was stale) · `host_cancel_fee` **4** (unchanged) · `cancelled_by = 'ops'` **1** · `NOT EXISTS` **1** · `the booker did nothing wrong` **3** (≥2) · `OPS_CANCEL_REFUNDS_SERVICE_FEE` in `.env.example` **0** · files containing the token **2**.

---

## Execution history — this run was interrupted and resumed

The run **died mid-plan on a transport-level API error**, not a work failure, immediately after Task 2's commit and before the test file was written. Recording it because the next reader should not have to infer it from timestamps:

- **Before the interruption:** `cb7dc5a` (Task 1) and `eff3939` (Task 2) were already committed; the working tree was clean and nothing was lost or half-written.
- **After resuming:** the committed source was **re-read off disk rather than trusted from memory** (the crash sits between intent and disk, and this is the money path), then Task 3 was written, run, mutation-proved and committed as `0d88eda`.

---

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run tests/payments/ops-cancel.test.ts` | **16/16 passed** |
| `npx vitest run` over ops-cancel + host-cancel + payout-sweep + payout-suspension-freeze | **4 files / 56 passed** |
| `npm test` (run **alone**) | **202 files / 2392 passed / 5 skipped** — baseline was 201 / 2376 / 5, so **+1 file / +16 tests**, exactly this plan's additions |
| `npm run test:design` (run **alone**) | **72 files / 1304 passed / 3 skipped** — byte-identical to baseline |
| `npx eslint` on all five touched files | **exit 0** |
| `tests/payments/host-cancel.test.ts` | **unchanged on disk and 17/17 green** — the host path was not altered |
| Mutation REDs | **3/3 observed and reverted** (table above) |

Pre-existing and not this plan's: the `[test-db] LEAKED WRITES` block naming `notify` and `guest-email`; three red e2e specs already in `deferred-items.md`.

---

## Known Stubs

**None.** The one deliberate gap is Fork 5 — the ops path sends no cancellation notification to either party — and it is **not a stub**: it is a documented refusal to send copy that would be false, with plan **18-09** named at the site as the owner of the correct copy, and a test that goes red if the wrong notification is re-added by reflex. There is no placeholder, no empty state and no disabled control anywhere; nothing renders a value it does not have.

## Threat Flags

None. Every surface this plan adds is inside the plan's own `<threat_model>`: the staff→action boundary (T-18-0801/0807), the ops decision→booking record boundary (T-18-0801/0803/0804), and the ops decision→PayMongo refund boundary (T-18-0802/0808). No new endpoint, no new auth path, no schema change, and **no package was installed** (T-18-SC).

## Carried forward

- **For the PM, and it leads the phase summary: D-236.** One line at `src/lib/payments/fees.ts:82` if they re-decide. See the top of this document.
- **D-253 does not bind this plan.** Nothing added here reads `host_verification.status` on a money path — the new predicate reads `host_payout_ledger` — so `tests/payments/payout-suspension-freeze.test.ts` needed no extension. The constraint still stands for the next reader who adds one.
- **18-09 owes the ops-cancellation notification copy.** Both parties are currently told nothing by this path, by decision. The site says so and names 18-09.
- **`declinedCopy`'s `'ops'` branch is latent, not live.** It is unreachable today because no path writes `'ops'` onto a `declined` row. If one ever does, that host-decline sentence becomes wrong.

## Commits

| Hash | Message |
|---|---|
| `cb7dc5a` | `feat(18-08): add the ops-cancel refund-policy constant and the impact read` |
| `eff3939` | `feat(18-08): cancelBookingAsOps — five forks, each documented at its own site` |
| `0d88eda` | `test(18-08): ENF-03 measured — refund basis under both constant values, the absent debit, the excluded payout, the unsent notification` |
