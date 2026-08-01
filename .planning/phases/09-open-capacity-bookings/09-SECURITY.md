---
phase: 09
slug: open-capacity-bookings
status: verified
threats_total: 93
threats_closed: 93
threats_open: 0
asvs_level: 2
block_on: high
created: 2026-07-31
last_audited: 2026-08-01
audited_by: gsd-security-auditor
register_origin: authored_at_plan_time (25 PLAN files, all carry a parseable <threat_model> block)
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Verification mode: **evidence-required**. No threat is marked closed on documentation, intent, or a
> SUMMARY discharge claim alone — every `closed` row cites a file:line in shipped code (or a recorded live
> observation for the two manual-verification threats). Every `open` row cites the greps that came back empty.

---

## ✅ Re-audit (2026-08-01) — population 2 executed; all 35 open threats re-verified CLOSED

**The 2026-07-31 verdict is superseded, not corrected.** That audit's `35 open` rested on ONE premise —
gap plans 09-17 … 09-25 had not been executed (0 SUMMARYs, last implementation commit `22afa2f feat(09-14)`).
All nine have since executed. `git diff --name-only 22afa2f HEAD -- src/ drizzle/ tests/ e2e/` returns 33
files; every one of the 35 threats was re-greped against the code as it stands today and every one now
resolves `closed` on a file:line in shipped code.

**Nothing from 2026-07-31 was deleted.** The three signed Corrections, their struck-through original wording,
and the register's per-threat prose all stand. Only the Status/Evidence cells of the 35 re-verified rows moved,
and each records the CURRENT file:line rather than the stale "ABSENT" grep.

**Method (unchanged bar, re-applied):** the prior audit's "ABSENT" verdicts were treated as presumed stale and
re-run from scratch, not inherited. No threat was closed on a SUMMARY discharge claim; each was read out of the
source file. `drizzle/`, `package.json`, `src/app/api/paymongo/webhook/route.ts`,
`src/lib/payments/cancellation.ts`, `src/inngest/functions/payout-sweep.ts`, `src/lib/search/query.ts` and
`src/lib/listing/mode-lock.ts` were confirmed ABSENT from the diff, which is what re-proves T-09-47, T-09-SC,
T-09-53/AR-11, T-09-89, T-09-90/AR-15, T-09-14/16/17/18 and T-09-19/37 by inaction.

**Correction 1's live check was run and passes.**
`grep -v '^\s*//' src/app/actions/cancel-booking.ts | grep -c "AND starts_at > now()"` prints **`1`** —
exactly the post-fork value 09-25 predicted. The booker flip at `cancel-booking.ts:651` is now
`(CASE WHEN open_capacity THEN ends_at ELSE starts_at END) > now()`; the host flip at `:1080` retains the
literal, deliberately unforked. Correction 1 is vindicated by measurement.

**Correction 2's condition has been met.** 09-24 landed the clamp it predicted
(`open-capacity.ts:49-54`). AR-16 is therefore **promoted from pending to active**, and T-09-86 closes.

**Zero population-1 regressions.** The five rows the re-audit was directed to spot-check —
T-09-27 (replay predicate, rewritten by 09-23), T-09-13 / T-09-14 (read model + threshold, rewritten by
09-18/09-24), T-09-33 (booker `starts_at` guard, forked by 09-25) and T-09-31 (`cancel-booking.ts` open fork)
— were each re-verified at their new line numbers and all hold. See "Population-1 regression spot-check" below.

---

## ⚠️ Corrections (2026-07-31, entered by quick 260731-lsx) — three findings retracted

**The audit's verdict is unchanged.** 93 threats · 58 closed · 35 open (27 live, 8 deferred) ·
`status: issues_found` · ship gate **BLOCKED**. No threat was re-audited, no threat changed status, and no
count moved. What follows retracts three *findings* recorded alongside that verdict which, on re-verification
against the gap plans and the shipped code, are factually wrong. Because this is a committed, signed-off
audit artifact, the original wording is left standing in place — struck through or marked, never silently
rewritten — so the record of what was claimed, and when it was withdrawn, survives.

### Correction 1 — T-09-91's "plan-gate defect" is retracted. 09-25's gate is correct.

The audit read the mitigation PROSE in 09-25's own threat register (`09-25-PLAN.md:331` — "an acceptance grep
asserts `AND starts_at > now()` still appears exactly once") and then greped that literal with no comment
filter, getting 4 hits: the two real guards at `cancel-booking.ts:568` and `:991`, plus `:551` and `:968`,
which are comment lines that merely *quote* the guard.

09-25's ACTUAL acceptance gate, stated twice at `09-25-PLAN.md:209` and `:341`, is
`grep -v '^\s*//' src/app/actions/cancel-booking.ts | grep -c "AND starts_at > now()"`. It filters those
comments on purpose, so the tripwire measures code rather than prose. Re-run against current
`src/app/actions/cancel-booking.ts` it prints `2` — exactly the pre-fix value the plan itself predicts
("prints `1` (was `2`…)") — from the booker flip at `:568`, which 09-25 forks, and the host flip at `:991`,
which 09-25 deliberately leaves alone. After the fork it becomes `1`.

**The gate is correctly specified and correctly calibrated — do not change it.** T-09-91 remains `closed`;
that half of the original finding was right and stands.

### Correction 2 — T-09-86's rationale is the register's present tense, not a false claim. AR-16 restored.

The audit rejected AR-16 because the rationale reads "…is now clamped to a finite integer ≥ 1" while
`open-capacity.ts:27` is a bare `Number(process.env.OPEN_LOW_STOCK_MAX ?? 5)`. The clamp is absent because
**09-24 is the unexecuted plan that ADDS it** — `09-24-PLAN.md:194` specifies exactly that
parse-then-validate: accept the env value "only when it is a finite number ≥ 1, flooring it to an integer;
otherwise fall back to the documented default of `5`".

Every GSD threat register's `Mitigation Plan` column is written in the post-mitigation present tense, and the
three sibling rows in the SAME table prove the convention: T-09-83 — "The envelope **is** reduced over real
instants"; T-09-84 — "The ceiling **is** validated and falls back to the documented default"; T-09-85 — "A
zero-or-negative cap **now** returns every in-month date as unavailable". None of those three was rejected on
that wording.

T-09-86 therefore stays **open**, and stays counted among the **27 live**-open — open *pending 09-24*, like
every other unexecuted gap-plan threat, and *live* because the unvalidated value sits in shipped code today,
exactly as its twin T-09-84 records. What is withdrawn is only the "acceptance rationale not satisfied / not
acceptable as written" verdict: AR-16 is restored as a **pending** accepted risk that takes effect when 09-24
lands. The audit's one genuinely new observation stands — the value is server-only with no `NEXT_PUBLIC_`
prefix (verified), so the disclosure half of the rationale already holds today.

### Correction 3 — UF-01 is not an unregistered flag. NT-01 is registered in both halves.

UF-01 recorded that the `cancel-booking.ts` half of review finding NT-01 "appears in no gap plan's register".
It is in fact explicitly owned across both halves, declared in plan frontmatter: `09-17-PLAN.md:13`
`closes: [CR-01, NT-01-booking-half]`, with the body at `:48-50` handing the `cancel-booking.ts` half to
09-25; and `09-25-PLAN.md:17` `closes: [WR-05, NT-01]`, with the objective at `:44` ("Close **WR-05** and the
`cancel-booking.ts` half of **NT-01**") and the body at `:52-54` restating the split ("09-17 forked the
`booking.ts` copy; this plan forks the `cancel-booking.ts` one").

NT-01 is a review-finding ID rather than a `T-09-NN` register ID, which is presumably what a register-scoped
search missed. UF-01 is therefore downgraded from an unregistered flag to a tracking note. **UF-02 and UF-03
were re-checked and are accurate — untouched.**

---

## Audit Scope and Method

**Two populations, verified separately.**

| Population | Plans | Threat IDs | Expectation | Result (2026-07-31) | Result (2026-08-01 re-audit) |
|---|---|---|---|---|---|
| 1 — EXECUTED | 09-01 … 09-16 (16 SUMMARYs) | T-09-01 … T-09-49 | mitigations present in `src/` | **49/49 closed** | **49/49 closed** (5 spot-checked for regression) |
| 2 — ~~PLANNED, NOT EXECUTED~~ **EXECUTED** | 09-17 … 09-25 (9 SUMMARYs) | T-09-50 … T-09-92, T-09-SC | mitigations present in `src/` | 9 closed · 35 open | **44/44 closed** |

~~**Non-execution of population 2 is proven, not assumed.** `git log --name-only -- src/ drizzle/ tests/ e2e/`
shows the last implementation commit is `22afa2f feat(09-14)`.~~ *(Superseded 2026-08-01 — that statement was
true when written and is now historical. All nine gap plans have executed; the commits are listed below.)*

**Execution of population 2 is proven, not assumed (2026-08-01).**
`git diff --name-only 22afa2f HEAD -- src/ drizzle/ tests/ e2e/` returns 33 files. The implementing commits:

| Plan | Implementation commits |
|---|---|
| 09-17 | `f09690c` fix (confirm cutoff fork) · `5096c06` test |
| 09-18 | `6c62776` + `3647d38` fix (venue-local counter + claim re-key) · `68851d7` test |
| 09-19 | `fbc9a5c` feat (`getOpenHoursLockState`) · `9973a46` feat (hours-edit refusal) |
| 09-20 | `fc0c623` feat (host block withdraws a drop-in date) · `10053d5` test |
| 09-21 | `e6382bc` fix (edit-path re-gate) · `e1d51b2` fix (money product bound) · `34f9c3e` test |
| 09-22 | `443e74b` feat (drop-in cannot mint a group) · `c15e35c` test |
| 09-23 | `722f242` fix (both key arms scoped, open replay narrowed) · `b92822e` test |
| 09-24 | `6a972c5` + `11c9cd5` + `3fd06bb` fix (envelope, clamp, month grid) · `276535e` test |
| 09-25 | `ed3eb1c` fix (booker cancel fork) · `3efada0` feat (non-refundable disclosure) |

**What the diff does NOT touch is itself evidence.** `drizzle/`, `package.json` / `package-lock.json`,
`src/app/api/paymongo/webhook/route.ts`, `src/lib/payments/cancellation.ts`,
`src/inngest/functions/payout-sweep.ts`, `src/lib/search/query.ts` and `src/lib/listing/mode-lock.ts` are all
absent from it. Working tree clean at re-audit time. That re-proves T-09-47 (schema drift), T-09-SC (supply
chain), T-09-53 / AR-11 (D-57 webhook), T-09-89 (refund ladder), T-09-90 / AR-15 (payout basis),
T-09-14/16/17/18 (search) and T-09-19 / T-09-37 (mode lock) by inaction rather than by assertion.

**Nine population-2 threats were found already mitigated or structurally satisfied by shipped code** — see
"Gap-plan mitigations already present" below. These were not assumed open on the strength of the missing
commit; each was greped against `src/`. All nine remain closed after execution.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → `placeOpenHold` | authenticated server action that mints a money-bearing row | `listingId`, venue-local `date`, `requestedPasses`, client-supplied `idempotencyKey` |
| browser → `getDayAvailability` / `getOpenMonthAvailability` | **unauthenticated** public server actions | caller-supplied listing id + `{year,month,day}`; returns occupancy counts |
| server action → claim transaction | `createOpenCapacityHold` — advisory lock + SUM + INSERT as one critical section | head request (never a bound); cap/rate/tier read in-tx |
| claim transaction → database | the only arbiter for open rows since `0022` removed them from `booking_no_overlap` | `pg_advisory_xact_lock(hashtextextended(listing_id ‖ ':' ‖ dayOpenIso))` |
| host browser → `saveListingStep` / `publishListing` / `saveOperatingHours` | authenticated but untrusted; wizard controls are courtesies | occupancy mode, per-head price, weekly hours |
| booker browser → `confirmBooking` | mints a PayMongo checkout against a server-frozen amount | `holdId` only; charge is the persisted `quoted_total_cents` |
| PayMongo → `/api/paymongo/webhook` | external confirm authority (D-57) | signed event body; **untouched this phase** (verified: no start-time condition, `route.ts` projects `startsAt` only for notification data at `:228`, `:253`) |
| URL query string → reserve page RSC | `?requested=` fully attacker-controlled | display-only integer, clamped |
| operator env → `OPEN_LOW_STOCK_MAX` | server-only config governing a booker-visible disclosure | ~~**unvalidated** `Number(env)` — see T-09-84 / T-09-86; the clamp arrives with 09-24~~ **VALIDATED (2026-08-01)** — `open-capacity.ts:50-54` accepts the override only when `Number.isFinite(...) && >= 1`, floored; else the documented default `5`. Still no `NEXT_PUBLIC_` prefix. |
| host operating-hours rows → admissions counter | host-mutable data that derives the counter's identity key | ~~**unguarded** — see T-09-54~~ **DECOUPLED + GUARDED (2026-08-01)** — the counter is re-anchored on the venue-local calendar date (`open-capacity.ts:165-180`, `units.ts:892`), so hours no longer derive its identity at all; and the edit itself is refused while live passes exist (`operating-hours.ts:130-159`). |
| host browser → `saveOperatingHours` | *(new surface characterisation, 09-19)* authenticated + owner-gated; can strand passes already sold | refused for any weekday `getOpenHoursLockState` reports locked (`hours-lock.ts:81`, `operating-hours.ts:131`) |
| booker browser → `placeOpenHold` (`idempotencyKey`) | client-supplied token, ≤200 chars, against a GLOBAL unique index | both key arms booker-scoped (`units.ts:302`, `:771`); stored value booker-namespaced (`units.ts:259-261`) |

---

## Threat Register

Status legend: `closed` (mitigation verified in code) · `open` (declared mitigation absent; hazard live in
shipped code — **BLOCKER**) · `open-deferred` (declared mitigation absent, but the hazard it guards is
introduced by the same unexecuted plan, so there is **no live exposure today**).

*(2026-08-01 — after the re-audit no row carries `open` or `open-deferred`. The legend is retained because the
2026-07-31 verdict it describes is preserved in the Audit Trail and in the struck-through cells below.)*

### Population 1 — executed plans (09-01 … 09-16)

| Threat ID | Category | Component | Disp. | Evidence | Status |
|---|---|---|---|---|---|
| T-09-01 | Tampering | `booking_no_overlap` predicate | mitigate | `drizzle/0022_booking_exclusion_v3.sql:20-27` — narrowed ONLY by `AND "open_capacity" = false`; status complement `NOT IN ('cancelled','declined','completed')` byte-unchanged. `tests/availability/open-capacity-exclude.test.ts` reads `pg_get_constraintdef` back. | closed |
| T-09-02 | DoS | migration run (55P04) | mitigate | `drizzle/0020_open_capacity_enum.sql:10` — `ALTER TYPE … ADD VALUE IF NOT EXISTS` is the file's only statement; `0021:8-9` and `0022:11-15` both record that the enum literal is never named again. | closed |
| T-09-03 | Tampering | `booking.open_capacity` default | mitigate | `drizzle/0021_open_capacity_columns.sql:14` — `boolean DEFAULT false NOT NULL`; an INSERT omitting the flag falls UNDER the EXCLUDE (fail-safe). | closed |
| T-09-04 | Info Disclosure | new columns | accept | `per_head_price_cents` = public listing pricing; `open_capacity` = public availability fact. No PII. Rationale re-verified against `read-model.ts:374-384` payload. | closed |
| T-09-05 | Tampering | `requestedHeads` / oversized `requestedPasses` | mitigate | `units.ts:824-828` — `remaining = (cap ?? 0) - taken` from the in-tx listing row + in-tx SUM; `granted = Math.max(1, Math.floor(Math.min(requestedHeads, remaining)))`. Shape bound `validation/booking.ts:135` `.int().min(1).max(10_000)`. | closed |
| T-09-06 | Tampering | price on the open path (D-49) | mitigate | `units.ts:790-807` reads `l.per_head_price_cents` in-tx; `:834` `quoteOpenCapacity({perHeadPriceCents: perHead, heads: granted})`; frozen triple read back off `.returning()` `:870-875`. `CreateOpenCapacityHoldInput` (`:645-657`) has no amount field. | closed |
| T-09-07 | Tampering/DoS-of-correctness | concurrent over-claim | mitigate | `units.ts:761-762` — `pg_advisory_xact_lock(hashtextextended(listingId ‖ ':' ‖ openIso, 0))` is the literal first statement, spanning sweep(`:780`) → SUM(`:794`) → INSERT(`:838`). `tests/availability/open-capacity-race.test.ts:51-56` records BOTH lock-deletion mutations executed 2026-07-30 (2 failed / 4 passed each). | closed |
| T-09-08 | Repudiation/Tampering | double-submit replay | mitigate | `units.ts:768-774` — `findOwnOpenHold` runs INSIDE the lock and returns the same booking with `replayed: true`. `booking_idem_uq` remains the DB backstop. | closed |
| T-09-09 | DoS | advisory-lock hold time | mitigate | `units.ts:745-892` — every statement between the lock and COMMIT is local SQL (sweep, SELECT, INSERT). No `fetch`, no `emitNotify`. Rule stated at `:759-760`; transaction-scoped lock releases on rollback. | closed |
| T-09-10 | Tampering | stale-hold drift | mitigate | `open-capacity.ts:74-80` — `openTakenSql` is a live `SUM(declared_pax)` over the occupying set. No stored counter anywhere. | closed |
| T-09-11 | Tampering | vacuous race test | mitigate | `open-capacity-race.test.ts:15-19` (distinct `bookerId` per racer, `idempotencyKey: null`), `:39-41`/`:65` (`makeRacingClients` → one `drizzle(client)` per independent connection). | closed |
| T-09-12 | Info Disclosure | public availability actions | mitigate | `actions/availability.ts:77` `dayLocalSchema.safeParse`, `:85-86` `isNull(listing.deletedAt)` + `row.status !== "published"` → `EMPTY_AVAILABILITY`; same pair at `:107`, `:115-116` for the month action. | closed |
| T-09-13 | Tampering | client-derived scarcity | mitigate | `read-model.ts:377` `state: spotsState(remaining, cap)` server-side; `spots-left-chip.tsx:40` imports `type SpotsState` only — no `OPEN_LOW_STOCK_MAX`, no `lowStockThreshold`, no literal comparison. *(Cross-ref: the server threshold itself is unvalidated — T-09-84.)* | closed |
| T-09-14 | Tampering | read-model / claim / search drift | mitigate | `read-model.ts:356` and `units.ts:794` both call `openTakenSql`; `read-model.ts:436` imports `OPEN_OCCUPYING_STATUS_SQL` for the month aggregate; `search/query.ts:243` calls `getAvailability` and contains no `FROM booking`. *(Cross-ref: residual drift instances are tracked as T-09-55 and T-09-85.)* | closed |
| T-09-15 | Info Disclosure | occupancy enumeration | accept | Same class as the exclusive calendar (T-03-ENUM). Payload `read-model.ts:374-384` carries `{remaining, cap, state, …}` and no booker identity. | closed |
| T-09-16 | Tampering | `priceMax` / `date` / `start` params | mitigate | `search/query.ts:165` `parsePickedDate` (round-trip guarded, `:72`), `:237-238` `parseWindowHour` degrades to date-only, `:216` `${effectivePriceSql} <= ${priceMax}` bound as a parameter — no interpolation. | closed |
| T-09-17 | Info Disclosure | drop-in scarcity in results | accept | `query.ts` returns `{remaining, cap, state}` only. Rationale re-verified. | closed |
| T-09-18 | DoS | Stage-2 per-candidate queries | accept | `query.ts:243` — the open branch makes the SAME single `getAvailability` call the exclusive branch already made; bounded by the existing over-fetch limit. | closed |
| T-09-19 | EoP/Tampering | occupancy-mode switch under live bookings | mitigate | `actions/listing.ts:156-165` — refusal keyed on `d.occupancyMode !== owned.occupancyMode` (PERSISTED) + `getModeLockState(db, listingId)`; `assertOwnership` at `:109`; write re-scoped `(id AND hostId)` at `:216`. | closed |
| T-09-20 | Tampering | publishing a mis-configured open listing | mitigate | `actions/listing.ts:277-309` re-parses the PERSISTED row; `validation/listing.ts:162-244` superRefine fork requires `perHeadPriceCents` (`:210-214`), instant-only (`:234`), single-space (`:244`). | closed |
| T-09-21 | Tampering | smuggled fields on autosave | mitigate | `actions/listing.ts:170-205` explicit patch whitelist; `status`/`hostId`/`publishedAt` absent from both `draftSchema` and the patch. | closed |
| T-09-22 | Repudiation | silent price change on a live booking | accept | `actions/listing.ts:194-197` — forward-only; every booking freezes `space_price_cents` at hold time (`units.ts:862`). Rationale verified against the claim. | closed |
| T-09-23 | EoP/Tampering | cross-mode hold minting | mitigate | `actions/booking.ts:186` (`placeHold` diverts `open_capacity`) and `:422` (`placeOpenHold` refuses `!== "open_capacity"`), both from the persisted `listing.occupancyMode` (`:152`, `:399`). | closed |
| T-09-24 | Tampering | crafted `?requested=` | accept (bounded) | `listings/[id]/book/page.tsx:266-272` — integer-checked, `Math.min(Math.max(raw, granted+1), requestedCeiling)`; `:260` records the charge is `booking.quotedTotalCents`. Display-only. | closed |
| T-09-25 | Tampering | `updateDeclaredPax` raising heads | mitigate | `actions/booking.ts:526` projects `booking.openCapacity`; `:554-555` `if (row.openCapacity) return { ok:false, error: PASSES_FIXED_MESSAGE }` — before the flat-listing short-circuit. | closed |
| T-09-26 | Tampering | smuggled window on the open path | mitigate | `validation/booking.ts:132-137` — `openHoldSchema` has no window field at all; `actions/booking.ts:428` derives the window from `loadOpenDayWindow`. | closed |
| T-09-27 | Repudiation | double-click double hold | mitigate | `actions/booking.ts:443` threads `idempotencyKey` into the claim; `units.ts:768-774` pre-check. **Note:** `book-cta.tsx` sends no key, so the guarantee currently rests on the tokenless `(booker_id, starts_at)` arm — which works for a double-click but is over-broad (T-09-79). | closed |
| T-09-28 | Repudiation | mis-stated booking window | mitigate | `when-label.ts:76` `openCapacity: boolean` (required) + `:108` branch on the PERSISTED snapshot. Live-verified on three surfaces: `09-16-SUMMARY.md:108-114`, `:117`, `:249-252`. | closed |
| T-09-29 | Tampering | a surface forgetting the drop-in case | mitigate | `when-label.ts:76` — required, not `?: boolean`. Grep for `openCapacity ?? false` across `src/` returns 0. The 8 `openCapacity: false` literals are the documented exclusive-only paths. *(Cross-ref: the 4 group-surface literals are unenforced — T-09-73…75.)* | closed |
| T-09-30 | Info Disclosure | label content on public surfaces | accept | The drop-in variant exposes strictly less than the exclusive one (no reservation window). Verified at `when-label.ts:108`. | closed |
| T-09-31 | DoS (other bookers) | host-cancel auto-block on a drop-in date | mitigate | `cancel-booking.ts:1055` `if (!row.openCapacity)` guards the `availabilityBlock` insert. Live DB read-back: `09-16-SUMMARY.md:17`, `:270-282` — 0 `availability_block` rows after a drop-in host cancel; date stayed bookable. | closed |
| T-09-32 | Repudiation | dialog promising a block that never happens | mitigate | `components/host/host-cancel-dialog.tsx:78` `openCapacity: boolean` (required), `:189` two-vs-three consequences, `:211` `{!openCapacity && …}`; audit meta `autoBlocked: !row.openCapacity` at `cancel-booking.ts:1023`. | closed |
| T-09-33 | EoP | cancelling someone else's drop-in booking | mitigate | `cancel-booking.ts:565-568` — `WHERE id = … AND booker_id = ${userId} AND status='confirmed' AND starts_at > now()`; zero rows → `explainNoRows` calm result (`:572-580`), indistinguishable from "not found". No new entry point. | closed |
| T-09-34 | Tampering | refund amount on a drop-in cancel | mitigate | `cancel-booking.ts:508` — one `quoteRefund` call; `:61` imports `quoteRefund, tierOrDefault` unchanged. No open-specific refund path exists. | closed |
| T-09-35 | Tampering | client-side publish eligibility | mitigate | `actions/listing.ts:277` `publishSchema.safeParse` against the persisted row; the wizard checklist is display-only. | closed |
| T-09-36 | Repudiation | host mis-selling their space | mitigate | `09-16-SUMMARY.md:94-105` — Step 1 PASS; the "does the mode choice read clearly without product knowledge?" question answered YES, screenshot-confirmed. | closed |
| T-09-37 | Info Disclosure | lock alert naming other bookings | accept | `lib/listing/mode-lock.ts:60` — `SELECT count(*)::int AS n, MAX(ends_at) AS unlocks_at`. No booker identity is selected. | closed |
| T-09-38 | Tampering | client-side price arithmetic in a stepper | mitigate | Grep for `₱` / `formatMoney` / `toFixed` / `Cents *` across `pass-stepper.tsx`, `stepper-control.tsx`, `date-pass-picker.tsx` → **0 matches in all three**. | closed |
| T-09-39 | Repudiation | scarcity as a dark pattern | mitigate | `spots-left-chip.tsx:67` (`Only {remaining} left`, `low` only), `:73` (`Fully booked`), `:78` (`Spots available`) — three fixed strings, digit only in `low`. | closed |
| T-09-40 | Tampering | client-side money in rail / card | mitigate | `availability-calendar.tsx:341`, `:406` — `computeServiceFee(…, serviceFeeBps)` with the server-threaded prop (`:308`, `:377`); `SERVICE_FEE_BPS` appears in that file only inside comments. `search/query.ts:136` composes `allInRateParts` server-side; `search-result-card.tsx:139` renders the given string. | closed |
| T-09-41 | Info Disclosure | month-level occupancy map | accept | `read-model.ts:441-447` returns `{cap, fullDates}` only. | closed |
| T-09-42 | DoS | month re-fetch on navigation | accept | One grouped query per month (`read-model.ts:429-438` — "never 31 round trips"), bounded by the 90-day horizon. | closed |
| T-09-43 | Repudiation | silent partial charge | mitigate | `partial-grant-notice.tsx:98` — `…estimated for ${requestedPasses}. Nothing has been charged yet.`; mounted at `book/page.tsx:301-304` ahead of the confirm control. | closed |
| T-09-44 | Tampering | client-side money on reserve page | mitigate | `partial-grant-notice.tsx:40-44` — imports are `next/link`, `lucide-react`, `alert`, `button`; no money helper. Figures are server-computed props (`book/page.tsx:280-282`). | closed |
| T-09-45 | Repudiation | card advertising hours a pass doesn't reserve | mitigate | `search-result-card.tsx:92-94` — the drop-in availability line "takes the date STRING, not the searched window … and never an hour". `start`/`end` are not forwarded on the open branch. | closed |
| T-09-46 | Tampering | e2e fixtures polluting the dev DB | mitigate | `e2e/open-capacity.spec.ts:59-64` — every id is `${prefix}_${randomUUID()}`; `:260` `test.afterAll` teardown. No shared fixed ids. | closed |
| T-09-47 | Tampering | undetected schema drift | mitigate | `09-15-SUMMARY.md:139` — `npm run db:generate` → *"No schema changes, nothing to migrate"*; `git status --short -- drizzle/` empty. Re-confirmed: working tree clean at audit time. | closed |
| T-09-48 | Repudiation | a green suite hiding a compile error | mitigate | `09-15-SUMMARY.md:135-137` — `npx tsc --noEmit` exit 0 / 0 errors; `npm run lint` exit 0; `npm run build` exit 0. | closed |
| T-09-49 | Tampering | a provider assumption validated only by a mock | mitigate | `09-16-SUMMARY.md:117-138` — three REAL PayMongo `sk_test_` checkouts, three `checkout_session.payment.paid` webhooks, three `booking_confirmed` notification rows within one second each (timestamps recorded `:132-134`). | closed |

### Population 2 — gap plans 09-17 … 09-25 (~~NOT EXECUTED~~ **EXECUTED, re-verified 2026-08-01**)

Every Evidence cell below was re-greped on 2026-08-01 against the code as it stands. The 2026-07-31 "ABSENT"
verdict is retained struck-through in each re-verified row, because it was accurate against the code of that
date and the record of what was claimed must survive.

| Threat ID | Category | Component | Disp. | Evidence | Status |
|---|---|---|---|---|---|
| T-09-50 | DoS (self-inflicted) | `confirmBooking` D-94 cutoff on an open row | mitigate | **PRESENT (2026-08-01).** `actions/booking.ts:757` `const cutoff = bk.openCapacity ? bk.endsAt : bk.startsAt;` and `:758` `if (cutoff.getTime() <= nowFromDb.getTime())`. The fork keys on the PERSISTED column, and `:762-765` returns pass words for an open row. Gate: `tests/booking/open-capacity-confirm.test.ts:403-439` — a same-day pass minted by the REAL claim reaches checkout, with `row.openCapacity === true` and `startsAt` in the past asserted at `:435-437` so the case cannot go green outside the CR-01 window. ~~**ABSENT.** `actions/booking.ts:723` is still `if (bk.startsAt.getTime() <= nowFromDb.getTime())` with no mode fork. Greps across `src/`: `openCapacity ? bk.endsAt` → 0; `cutoff` → 0. **LIVE:** a same-day pass is holdable but never payable (CR-01).~~ | **closed** |
| T-09-51 | Tampering | widening the cutoff for EXCLUSIVE bookings | mitigate | **PRESENT (2026-08-01).** The exclusive arm of `booking.ts:757` is `bk.startsAt`, and the sentence at `:764` is byte-identical to the shipped one. Both halves of the declared gate exist: `tests/booking/open-capacity-confirm.test.ts:441-459` seeds an exclusive booking started an hour ago with `ends_at` deliberately in the FUTURE (so a mode-blind widening turns it RED), asserts the verbatim `SESSION_STARTED` constant (`:105`) at `:455`, and reads `checkoutSessionId` back as NULL at `:458`. ~~**ABSENT** — no fork exists, so no verbatim-sentence test or NULL-`checkout_session_id` read-back exists. No live exposure: exclusive behaviour is unchanged at `booking.ts:723-729`.~~ | **closed** |
| T-09-52 | Spoofing | inferring mode from a null rate / `full_day` | mitigate | **PRESENT (2026-08-01).** `actions/booking.ts:692` `openCapacity: booking.openCapacity` and `:693` `endsAt: booking.endsAt` are now in `confirmBooking`'s projection, both taken from the drizzle schema object (never a raw SQL alias), so a dropped column is a compile error rather than a falsy `undefined`. `:745-747` records that the mode is never inferred from a null rate, a null `declared_pax` or `full_day`. ~~**ABSENT.** `confirmBooking`'s projection (`booking.ts:~680-690`) does not select `booking.openCapacity`; grep `bk.openCapacity` returns 12 hits, none in `booking.ts`'s confirm path. No live exposure until the fork ships.~~ | **closed** |
| T-09-53 | Repudiation | start-time condition leaking into the webhook | accept (guarded) | **VERIFIED.** `api/paymongo/webhook/route.ts` contains no `starts_at` condition — `startsAt` appears only at `:228` / `:253` as notification payload data. D-57 intact; `handleGoneSlot` auto-refund backstop unchanged. | closed |
| T-09-54 | Tampering (capacity) | counter keyed on a host-mutable value | mitigate | **PRESENT (2026-08-01).** All three legs re-anchored on the venue-local calendar date. Lock key: `units.ts:891-892` `pg_advisory_xact_lock(hashtextextended(${input.listingId} \|\| ':' \|\| ${dateKey}, 0))`, with `dateKey` from `venueDayBoundsUtc` (`open-capacity.ts:165-180`), composed from the NUMERIC y/m/d, never by formatting a Date (`:178`). Counted set: `openTakenSql(listingId, dayStartIso, dayEndIso)` at `units.ts:933`, whose range is the half-open `[dayStart, dayEnd)` at `open-capacity.ts:210-211` — the former equality against the re-derived opening instant is gone. The `dayStartIso`/`dayEndIso`/`dateKey` locals are deliberately held apart from `openIso`/`closeIso` at `units.ts:844-849` and are never written to a column. Gate: `tests/availability/open-capacity-hours-rekey.test.ts:327` case 1, `:380` case 3. ~~**ABSENT.** Lock key `units.ts:761-762` uses `openIso`; counted set `open-capacity.ts:78` `b.starts_at = ${dayOpenIso}`; sweep `units.ts:784` same. Greps: `AT TIME ZONE l.timezone` → 0; `open_date` → 0. **LIVE:** up to 2× cap sellable after an hours edit (CR-03).~~ | **closed** |
| T-09-55 | Info disclosure / stale availability | month grid + search advertising a saturated date | mitigate | **PRESENT (2026-08-01).** `read-model.ts:498` `SELECT to_char((b.starts_at AT TIME ZONE ${timezone}::text)::date, 'YYYY-MM-DD') AS day_local` with `GROUP BY 1` at `:506` — one group per venue-local date, so the `>= cap` test at `:545` means what it says. `GROUP BY 1` rather than a restated expression is deliberate (`:493-495`) so the grouping key cannot drift from the projected key. Gate: `open-capacity-hours-rekey.test.ts:368` case 2, `:429` case 5 (search agrees with the day panel). ~~**ABSENT.** `read-model.ts:437` still `GROUP BY b.starts_at` (the opening instant), not a venue-local date. Two `starts_at` groups are each compared to `cap` separately at `:442`.~~ | **closed** |
| T-09-56 | DoS | stranded hold no later claim can sweep | mitigate | **PRESENT (2026-08-01).** `units.ts:914-919` — the in-tx lazy-expiry sweep is now `AND starts_at >= ${dayStartIso}::timestamptz AND starts_at < ${dayEndIso}::timestamptz`, the SAME range `openTakenSql` counts at `:933`. A hold minted under the old operating hours is therefore swept by a claim made under the new ones; `:907-913` records exactly that reasoning. ~~**ABSENT.** `units.ts:780-784` sweep is scoped `AND starts_at = ${openIso}` — same re-derived instant as the counter.~~ | **closed** |
| T-09-57 | EoP | over/under-serialising the advisory lock | accept | **VERIFIED.** `units.ts:753-757` — the shipped comment records that a `hashtextextended` collision can only OVER-serialise, never under-serialise. Correctness-safe by construction. | closed |
| T-09-58 | Tampering | hours edit stranding passes already sold | mitigate | **PRESENT (2026-08-01).** `lib/listing/hours-lock.ts:81-121` `getOpenHoursLockState` exists (weekday from `EXTRACT(DOW FROM (b.starts_at AT TIME ZONE l.timezone))` at `:86`, occupying predicate IMPORTED not retyped at `:94`, DB clock only at `:93`). `actions/operating-hours.ts:130-159` calls it and RETURNS a refusal when a locked weekday's window set genuinely changes — before the `db.transaction` at `:163`, so nothing is written. Scoped to the PERSISTED mode at `:130`. Gate: `tests/availability/hours-lock.test.ts:331` case 1 reads `operating_hours` back. ~~**ABSENT.** `actions/operating-hours.ts:80-94` deletes and reinserts every window with no booking awareness. Grep `getOpenHoursLockState` across `src/` → 0. **LIVE.**~~ | **closed** |
| T-09-59 | DoS (bookers) | deleting a weekday's hours while passes exist | mitigate | **PRESENT (2026-08-01).** The empty-`windows` case is refused by the SAME comparison, not accepted: `operating-hours.ts:139-143` — for a locked weekday `b = after.get(dow) ?? []` is the empty array, so `a.length !== b.length` is true and `changed` is set. The unconditional delete at `:165` is now unreachable for a locked weekday. ~~**ABSENT.** Same site: `operating-hours.ts:82` unconditional `tx.delete(operatingHours)`; `windows.length === 0` is accepted (`:83`). **LIVE.**~~ | **closed** |
| T-09-60 | DoS (host) | canonicalisation bug freezing the editor | mitigate | **PRESENT AND CORRECT (2026-08-01).** `operating-hours.ts:45-47` `normalizeTime(t) => t.length >= 8 ? t.slice(0, 8) : \`${t}:00\`` — `"06:00"` and `"06:00:00"` both canonicalise to `"06:00:00"`, so a `:ss`-less autosave is a no-op, not a change. Both sides go through it: `canonicalWindowsByDay` (`:50-61`) is applied to the PERSISTED rows at `:137` and the incoming set at `:138`, and each day's list is sorted (`:59`) so two sets compare by value alone. Gate: `hours-lock.test.ts:388` case 3 re-saves a seconds-less window on a locked weekday and succeeds. ~~**ABSENT** — no `HH:mm:ss` comparison exists to be buggy. No live exposure (the comparison is introduced by 09-19).~~ | **closed** |
| T-09-61 | EoP | reading/freezing another host's listing | mitigate | **ALREADY PRESENT.** `actions/operating-hours.ts:64-67` `assertOwnership(listingId, userId)` runs before validation and before the write; `:40-48` scopes on `hostId` + `isNull(deletedAt)`. | closed |
| T-09-62 | Info disclosure | advisory naming bookings on a non-owner page | mitigate | **PRESENT AND SAFE (2026-08-01).** The advisory is assembled at `(host)/host/listings/[id]/availability/page.tsx:124-133` and its content is weekday LABELS, a `lockedByCount` integer and one `composeDateLabel` date — no booker id, name or email is projected: `getOpenHoursLockState`'s query selects only `dow`, `count(*)`, `MAX(ends_at)` (`hours-lock.ts:86-88`), the same posture as `mode-lock.ts` under AR-08. The page is owner-gated ahead of the read: session at `:74`, `canHost` at `:78`, and `notFound()` on `row.hostId !== session.user.id` at `:88-90` — the lock query at `:100` runs after all three. ~~**ABSENT** — the advisory is not rendered anywhere. No live exposure (the surface is introduced by 09-19).~~ | **closed** |
| T-09-63 | Info disclosure / stale availability | open read model advertising a host-blocked date | mitigate | **PRESENT (2026-08-01).** `getOpenDay` evaluates the shared predicate: `read-model.ts:377` `${openBlockedSql(listingId, dayStartIso, dayEndIso)} AS blocked`, consumed at `:380`, forcing `remaining = 0` at `:391` and `bookable = false` at `:398-399`. The month grid reads `availability_block` at `:513-519` under the imported `OPEN_BLOCK_UNIT_SCOPE_SQL` (`:516`), expands each block to venue-local dates through `venueDayBoundsUtc` at `:535` and merges them into `fullDates` at `:546`. Search inherits it via `getAvailability` (`search/query.ts:243`, untouched). Gate: `tests/availability/open-capacity-blocks.test.ts:444` case 1, `:472` case 2. ~~**ABSENT.** `availability_block` is queried in exactly ONE place in the whole availability library — `read-model.ts:221` — which sits below the open fork at `:196`. `getOpenDay` (`:323-386`) and `getOpenMonthAvailability` (`:394-447`) never read it. Grep `openBlockedSql` / `OPEN_BLOCK_UNIT_SCOPE_SQL` → 0. **LIVE** (CR-02).~~ | **closed** |
| T-09-64 | Tampering | crafted date payload on a blocked date | mitigate | **PRESENT (2026-08-01).** The block test rides on the claim's single cap/rate statement — `units.ts:934` `NOT ${openBlockedSql(input.listingId, dayStartIso, dayEndIso)} AS not_blocked` — so it is evaluated INSIDE the transaction and UNDER the advisory lock taken at `:891`, and the refusal at `:961` `if (!rows[0].not_blocked) return { error: BLOCKED_DATE_MESSAGE };` precedes every write. Bare `{ error }`, no `soldOut` flag, so the CTA does not invite a retry. Gate: `open-capacity-blocks.test.ts:478` case 3 asserts NO `booking` row exists, not merely that a sentence was returned. ~~**ABSENT.** `units.ts:790-805` — the claim's single cap/rate statement selects `max_occupancy`, `per_head_price_cents`, `cancellation_policy`, `taken`, `day_open_ok`, `horizon_ok`. No `NOT EXISTS (… availability_block …)`. **LIVE.**~~ | **closed** |
| T-09-65 | DoS (other bookers) | one host cancel closing a whole drop-in day | mitigate | **ALREADY PRESENT.** `cancel-booking.ts:1055` `if (!row.openCapacity)` fork is shipped and live-verified (`09-16-SUMMARY.md:270-282`). *(The 09-20 "case 5 re-proof under real blocks" is absent, but the fork itself is what mitigates the threat.)* | closed |
| T-09-66 | DoS (host) | undeletable block stranding a date | mitigate | **VERIFIED LIVE (2026-08-01).** The rule was already present and is now exercised for real: `actions/blocks.ts:149,169` still refuses only the `host_cancellation` sentinel, and `open-capacity-blocks.test.ts:498` case 4 removes a host-created block through the REAL `removeBlock` and re-claims the date, asserting the day's full remaining capacity comes back. Now that blocks genuinely bite (T-09-63/64), the case is no longer vacuous. ~~**ABSENT** as a case … No live exposure (blocks have no effect on open listings today — T-09-63).~~ | **closed** |
| T-09-67 | Tampering | drift between claim's block test and read model's | mitigate | **PRESENT (2026-08-01).** ONE exported predicate with the ⚠️ DO NOT COPY note (`open-capacity.ts:110-114`, and `DO NOT COPY` appears 3× in that file). Every acceptance grep the plan declared (`09-20-PLAN.md:270-273`) was re-run and matches exactly: `export function openBlockedSql` → 1 · `export const OPEN_BLOCK_UNIT_SCOPE_SQL` → 1 · `openBlockedSql(` in `read-model.ts` → 1 · `openBlockedSql(` in `units.ts` → 1 · `OPEN_BLOCK_UNIT_SCOPE_SQL` in `read-model.ts` → 2 (import + month-query interpolation). Three call sites: `read-model.ts:377`, `units.ts:934`, `read-model.ts:516`. The month grid imports only the UNIT SCOPE by design (`:508-512`) because a per-date expansion cannot share a single-date `EXISTS` — the drifting half is imported, the shape half is not. ~~**ABSENT.** Zero shared block predicate exists (grep `openBlockedSql` → 0); there are zero call sites, not three.~~ | **closed** |
| T-09-68 | Tampering | published listing edited into unpublishable drop-in config | mitigate | **PRESENT (2026-08-01).** `actions/listing.ts:171-186` — inside the `owned.status === "published"` branch, on the EFFECTIVE post-save values (incoming ?? persisted ?? default), all four publish rules are re-imposed: `perHeadPriceCents` (`:177`), `maxOccupancy` (`:178`), `bookingMode !== "instant"` (`:179`), `unitCount !== 1` (`:180`), each with the sentence IMPORTED from the publish gate rather than retyped. Draft rows stay permissive by design (`:167-170`). Gate: `tests/listing/open-capacity-edit-gate.test.ts:563` case 1 (sparse autosave refused, persisted row untouched), `:607` case 3 (approval mode and multi-unit each refused with their own sentence), `:630` case 4 (a draft is still permissive). ~~**ABSENT.** `actions/listing.ts:133-144` — the published-row re-gate covers ONLY the HG-01 surcharge rule. `occupancyMode`, `perHeadPriceCents`, `bookingMode`, `unitCount` are written straight through at `:184`, `:197`, `:202`. **LIVE** (CR-04).~~ | **closed** |
| T-09-69 | DoS | unhandled server-action error on the money path | mitigate | **PRESENT (2026-08-01).** The claim now FAILS CLOSED instead of throwing: `units.ts:984` `if (perHead == null \|\| perHead <= 0) return { error: SOLD_OUT_MESSAGE };` — a RETURNED structured refusal, evaluated before `quoteOpenCapacity` is reached. `<= 0` and not merely `== null` is deliberate (`:975-977`): `draftSchema` admits a transient 0. `quoteOpenCapacity`'s own invariant throw is preserved for every other caller (`:971-973`). Gate: `open-capacity-edit-gate.test.ts:647` case 5 asserts a RETURNED result and NO booking row. ~~**ABSENT.** `pricing.ts:163-166` — `quoteOpenCapacity` still `throw`s on a null `perHeadPriceCents`; `units.ts:824-834` guards `cap` (`cap ?? 0`) but not `perHead`. Grep `perHead == null` → 0; `MAX_MONEY_CENTS` → 0. **LIVE**…~~ | **closed** |
| T-09-70 | Info disclosure | Next.js error digest / stack to a booker | mitigate | **PRESENT (2026-08-01).** Same site — with `units.ts:984` and the product guard at `:1019-1026` both returning rather than raising, there is no path from a mis-configured listing to an exception escaping `placeOpenHold`. Gate: `open-capacity-edit-gate.test.ts:647` case 5 and `:738` case 7 both assert the action RETURNS rather than rejects (case 7 names the 22003 explicitly). ~~**ABSENT.** Same site as T-09-69 — the exception escapes `placeOpenHold` (`booking.ts:437-451` handles only `"error" in res`). **LIVE.**~~ | **closed** |
| T-09-71 | Tampering (money) | int4 overflow (22003) on money columns | mitigate | **PRESENT — THE PRODUCT IS BOUNDED, NOT JUST THE SHAPE (2026-08-01).** Three layers, all verified. (1) Host-input ceilings in BOTH schemas: `validation/listing.ts:95` `MAX_PER_HEAD_PRICE_CENTS = 1_000_000`, `:100` `MAX_OPEN_CAPACITY = 1_000`, applied at `:123`/`:144` (draft) and `:172`/`:207` (publish); the arithmetic is spelled out at `:72-86` — 1,000 × 1,000,000 = 1e9, +5% D-74 fee = 1.05e9, under int4's 2,147,483,647. (2) Runtime PRODUCT guard for legacy rows: `units.ts:1019-1026` checks `Number.isSafeInteger(spaceCents)`, `spaceCents > MAX_MONEY_CENTS` AND `computeServiceFee(spaceCents).allInCents > MAX_MONEY_CENTS`, against `pricing.ts:60 MAX_MONEY_CENTS = 2_147_483_647`. (3) The docblock is now TRUE: `validation/booking.ts:101-117` and `:139-151` explicitly state the `.max()` is a SHAPE ceiling and NOT the overflow protection, and name the two layers that are. Gate: `open-capacity-edit-gate.test.ts:679` case 6 (both schemas refuse above the ceilings), `:738` case 7 (a legacy stadium row is refused calmly and mints NO booking). ~~**ABSENT.** `validation/listing.ts:155` … no ceiling; `maxOccupancy` likewise unbounded above. No product guard at `units.ts:834`. The docblock at `validation/booking.ts:126-130` asserts a protection that does not exist.~~ | **closed** |
| T-09-72 | EoP | editing another host's listing | accept | **VERIFIED.** `actions/listing.ts:109-112` `assertOwnership` runs before validation, before the published-row gate, before the write; `:216` re-scopes `(id AND hostId)`. Posture unchanged. | closed |
| T-09-73 | EoP | `createGroup` on a drop-in booking | mitigate | **PRESENT IN BOTH STATEMENTS (2026-08-01).** Pre-read gate: `actions/group.ts:244` selects `(l.occupancy_mode = 'exclusive') AS "modeOk"` and `:279-287` refuses on `!gate.modeOk`, auditing `reason: "open_capacity"` while returning the shared `DENIED` sentence (so no new oracle — AR-14 intact). INSERT `WHERE`: `:333` `AND l.occupancy_mode = 'exclusive'`, so a bypassed pre-read gate still writes zero rows. Selected-not-filtered in the pre-read is deliberate (`:234-241`) so the audit trail can tell "drop-in pass" from "no such booking". Gate: `tests/group/open-capacity-group-guard.test.ts:378` case 1 (asserts the minted seat count), `:429` case 3 (BOTH statements carry the predicate). ~~**ABSENT.** `actions/group.ts` — grep `occupancy_mode = 'exclusive'` across `src/` → 0. The pre-read gate and the INSERT `WHERE` (`:296`) check only `booker_id`, `status='confirmed'`, `l.max_occupancy >= 2`. **LIVE** (CR-05).~~ | **closed** |
| T-09-74 | Spoofing (capacity) | cap−1 strangers against one paid admission | mitigate | **PRESENT (2026-08-01).** `GREATEST(l.max_occupancy - 1, 0)` at `group.ts:314` is now unreachable on an open booking: the mode refusal at `:279-287` runs BEFORE the capacity floor at `:295`, explicitly so the daily admissions cap is never read in a context where the floor thinks it is a room rating (`:270-274`), and the INSERT's own `WHERE` at `:333` repeats the scope. `capacity_snapshot` therefore can no longer be minted from a drop-in daily cap. Gate: `open-capacity-group-guard.test.ts:378` case 1 asserts the seat count, not a sentence. ~~**ABSENT.** Same guard. `capacity_snapshot` is `GREATEST(max_occupancy − 1, 0)` — the DAILY cap. **LIVE.**~~ | **closed** |
| T-09-75 | Info disclosure | invite emails describing a pass as a 16-hour reservation | mitigate | **ENFORCED-TRUE (2026-08-01).** The literals are now guaranteed by construction rather than assumed: `booking_group` has exactly ONE writer in the whole codebase (`grep -rn "INSERT INTO booking_group" src/` → `group.ts:311` only), and that statement carries `AND l.occupancy_mode = 'exclusive'` at `:333`. No group surface can therefore receive an open booking, which is what makes `openCapacity: false` correct at `bookings/[id]/group/page.tsx:118`, `actions/group.ts:188` and `invite/[token]/page.tsx:152`. The fourth site is gone: `bookings/[id]/page.tsx` now gates the group read on `lst.occupancyMode === "exclusive"` at `:559` before `getOwnedGroupByBooking` at `:561`. ~~**ABSENT.** The four `openCapacity: false` literals remain assumed-true, not enforced-true … **LIVE.**~~ | **closed** |
| T-09-76 | Repudiation | comment asserting a server re-check that does not exist | mitigate | **CORRECTED AND NOW TRUE (2026-08-01).** `app/(app)/bookings/[id]/page.tsx:549-553` reads "`createGroup` re-checks ownership, confirmation AND the listing's occupancy mode server-side before it writes anything — the mode in BOTH its pre-read gate and the INSERT's own WHERE", and records what the sentence used to omit. Each of the three named re-checks is verifiable in BOTH statements: ownership `group.ts:248` + `:331`, confirmation `:249` + `:332`, mode `:244`/`:279-287` + `:333`. The false two-of-three sentence is gone. ~~**ABSENT.** `app/(app)/bookings/[id]/page.tsx:549` still reads "`createGroup` re-checks ownership and confirmation server-side…" while `:556` gates on `lst.occupancyMode === "exclusive"` client-side only.~~ | **closed** |
| T-09-77 | Info disclosure (oracle) | "not yours" vs "can't host a group" | accept | **VERIFIED.** `actions/group.ts:105` `DENIED`, `:109` `NOT_CONFIRMED = DENIED`, returned at `:228`, `:273`, `:318`. One sentence, no oracle. | closed |
| T-09-78 | Info disclosure (existence oracle) | `idempotency_key` matched without booker scope | mitigate | **BOTH ARMS SCOPED (2026-08-01).** `units.ts:771` (`findOwnOpenHold`) — `(idempotency_key = ${args.idempotencyKey} AND booker_id = ${args.bookerId})`. `units.ts:302` (`findOwnActiveHold`, the exclusive twin) — identical form. The narrowing is paired with `scopedIdempotencyKey` at `:259-261`, which stores the key LENGTH-PREFIX-namespaced by booker (`${bookerId.length}:${bookerId}:${key}`, injective by construction per `:252-254`) so the global `booking_idem_uq` index cannot turn the new scope into a 23505 for the next caller. Applied at the ONE entry point each: `:364` and `:852`. Gate: `tests/booking/open-capacity-replay.test.ts:456` case 2 (the returned id is not the other booker's, mutation-proven), `:599` case 7 (the exclusive path changed in exactly one respect). ~~**ABSENT.** `units.ts:684-687` … the key arm carries no `booker_id`. Twin at `:265` … **LIVE via crafted POST**…~~ | **closed** |
| T-09-79 | DoS (revenue + attendance) | confirmed pass swallowing later purchases | mitigate | **NARROWED (2026-08-01).** `units.ts:789-792` — the tokenless arm is now `(booker_id = … AND starts_at >= ${dayStartIso} AND starts_at < ${dayEndIso} AND status = 'pending' AND expires_at > now())`. `status = 'confirmed'` is deliberately ABSENT from this arm and the reason is recorded at `:774-785`: on the open path a date IS the window, so a confirmed row is not a hold being re-entered. The status filter now lives INSIDE the tokenless arm rather than over the whole predicate — the asymmetry is documented at `:715-716` and `:725-729`. Gate: `open-capacity-replay.test.ts:415` case 1 (a booker who already PAID can buy more for the same date), `:541` case 5 (a lapsed tokenless hold does not replay). ~~**ABSENT.** `units.ts:683` still `(status = 'confirmed' OR (status='pending' AND expires_at > now()))` … **LIVE** (CR-06).~~ | **closed** |
| T-09-80 | DoS | 23505 escaping `mapBookingError` as a raw 500 | mitigate | **PRESENT (2026-08-01).** The key arm at `units.ts:769-772` is now OUTSIDE the status filter and carries none of its own — deliberately, per `:762-768`: a key whose row exists but failed a status test would fall through to the INSERT and raise 23505 on the global partial-unique index, which `mapBookingError` re-throws. So a cancelled or lapsed row bearing the caller's key replays instead. Gate: `open-capacity-replay.test.ts:564` case 6 — "a key naming a LAPSED or CANCELLED row replays — it never falls through into a 23505". ~~**ABSENT.** The key arm at `units.ts:685` sits inside the status filter at `:683`, so a cancelled row bearing the key does not replay…~~ | **closed** |
| T-09-81 | Tampering | client token as a lookup handle for another user's row | mitigate | **PRESENT (2026-08-01).** Same predicate as T-09-78 — `units.ts:771` and `:302`. The token now only ever NARROWS a query already scoped to the caller; `:733` records that "a crafted key can only ever reach the caller's own". `openHoldSchema` still accepts an arbitrary ≤200-char string (`validation/booking.ts:157`), which is correct: the token is untrusted input, and the scope rather than the shape is what makes it safe. ~~**ABSENT.** Same predicate as T-09-78.~~ | **closed** |
| T-09-82 | Repudiation | losing D-42 while narrowing the predicate | mitigate | **D-42 SURVIVES THE NARROWING (2026-08-01) — the threat that actually mattered, now that the narrowing HAS occurred.** Two independent locks. Server: the tokenless arm at `units.ts:789-792` still matches a LIVE `pending` hold, so a second submit inside the TTL replays with or without a token (`:787-788`). Client: `components/booking/book-cta.tsx:100-103` — `React.useMemo` keyed on `[listingId, openPick?.dateIso, openPick?.passes]`, so repeated clicks on the SAME selection carry ONE token, and a different date or pass count (or a fresh mount after the post-booking redirect) mints a new one; threaded at `:118`. Gate: `open-capacity-replay.test.ts:504` case 3 (tokened double-submit → one booking), `:524` case 4 (tokenless double-submit while the hold is live). ~~**ABSENT** — no narrowing occurred, so cases 3/4 and the `BookCta` per-selection token memo do not exist. Grep `idempotencyKey` in `book-cta.tsx` → 0…~~ | **closed** |
| T-09-83 | DoS | hold born already expired on a split-shift day | mitigate | **REDUCED OVER INSTANTS (2026-08-01).** `open-capacity.ts:344-349` — every operating-hours ROW is first turned into its own instant pair through the pure `openDayWindow` (which owns the `close <= open ⇒ next calendar day` roll at `:269-279`), and the envelope is then `reduce` over `dayOpenUtc.getTime()` / `dayCloseUtc.getTime()`. The SQL `MIN(open_time)`/`MAX(close_time)` on wall-clock `time` is gone; `:294-309` records why no ordering of wall clocks can place 02:00 after 12:00. Display strings come from the rows that WON the reduction (`:358-359`). The counter is explicitly NOT moved with it (`:311-314`), so this cannot re-open CR-03. Gate: `tests/availability/open-capacity-readmodel.test.ts:642` case 12 (whole envelope of a shift rolling past midnight), `:673` case 13 (a same-day split shift mints a PAYABLE hold, asserting the persisted `expires_at` is in the future). ~~**ABSENT.** `open-capacity.ts:160-161` still `min(open_time)` / `max(close_time)` in SQL … **LIVE** (WR-02).~~ | **closed** |
| T-09-84 | Info disclosure (suppressed) | OPEN-04 scarcity off from a config typo | mitigate | **CLAMPED (2026-08-01).** `open-capacity.ts:49-54` — `const parsedLowStockMax = Number(process.env.OPEN_LOW_STOCK_MAX);` then `Number.isFinite(parsedLowStockMax) && parsedLowStockMax >= 1 ? Math.floor(parsedLowStockMax) : OPEN_LOW_STOCK_MAX_DEFAULT` with the default declared as `5` at `:49`. Fail-to-default, not fail-to-off — the reasoning, including the `Math.min(x, NaN) → NaN` chain that switched OPEN-04 off platform-wide, is recorded at `:36-48`. A ceiling below 1 is refused rather than clamped up, on purpose. Gate: `open-capacity-readmodel.test.ts:712` case 14 drives the PUBLIC functions rather than the constant. ~~**ABSENT.** `open-capacity.ts:27` — `export const OPEN_LOW_STOCK_MAX = Number(process.env.OPEN_LOW_STOCK_MAX ?? 5);` … **LIVE** (WR-03).~~ | **closed** |
| T-09-85 | Info disclosure / stale availability | month grid offering dates the day panel refuses | mitigate | **FAILS CLOSED (2026-08-01).** `read-model.ts:457-467` — `if (cap <= 0)` returns EVERY in-month date in `fullDates`, short-circuited BEFORE the aggregate query. The invariant is stated as the invariant rather than the branch at `:442-456`: "an empty result set is not 'nothing is full'; here it is 'nothing was asked'". No new `SpotsState` and no new matcher — it reuses the existing `fullDates` channel. Gate: `open-capacity-readmodel.test.ts:745` case 15 asserts the two projections AGREE ("offers NO date at all when the cap is unusable — grid and panel agree"), `:770` case 16 confirms a positive cap is untouched. ~~**ABSENT.** `read-model.ts:410` `cap = maxOccupancy ?? 0`; `:442` `.filter(r => Number(r.taken) >= cap)` … **LIVE** (NT-02).~~ | **closed** |
| T-09-86 | Tampering | operator env value reaching arithmetic unvalidated | accept (bounded) | **ACCEPTANCE RATIONALE NOW FULLY SATISFIED (2026-08-01) — AR-16 promoted from pending to active.** Correction 2's condition has been met: 09-24 landed the clamp it predicted. Both halves of the rationale hold in shipped code. *Clamped:* `open-capacity.ts:50-54` accepts the override only when finite and ≥ 1, floored to an integer, else the documented default `5`. *Server-only:* re-verified — `grep -rn "OPEN_LOW_STOCK_MAX\|lowStockThreshold" src/components/ src/app/` returns **0**, so no browser bundle re-derives the threshold; the `state` field is computed server-side at `read-model.ts:407` and merely rendered by the client (T-09-13). Residual risk as accepted: an operator choosing a large-but-valid ceiling — a configuration choice, not an injection. ~~**ABSENT (pending 09-24).** No clamp exists yet — `open-capacity.ts:27` is a bare `Number(env)`; 09-24 is the plan that adds it (`09-24-PLAN.md:194`). … **LIVE**, alongside its twin T-09-84.~~ *(Corrected 2026-07-31 — the original cell read "ACCEPTANCE RATIONALE NOT SATISFIED … Not acceptable as written", rejecting the acceptance on wording that is simply the register's post-mitigation present tense. See Correction 2. That retraction is now vindicated by the landed clamp.)* | **closed** |
| T-09-87 | DoS (booker) | pass uncancellable for the whole day it is valid | mitigate | **FORKED (2026-08-01).** `cancel-booking.ts:651` — the booker flip's guard is now `AND (CASE WHEN open_capacity THEN ends_at ELSE starts_at END) > now()`, evaluated by Postgres, from the PERSISTED column and nothing inferred (`:629-631`). The refusal path forks with it: `explainNoRows` takes a `CancelWindow` and builds the matching `windowEnd` at `:311-314`, so the page and the server cannot contradict each other. The RSC forks identically at `bookings/[id]/cancel/page.tsx:161-162`, so the cancellation is not dead-ended one click earlier. Gate: `tests/booking/open-capacity-cancel.test.ts:897` case 6 (a drop-in pass can be cancelled while the venue is open — persisted status, zero refund, returned spot), `:976` case 8 (a fully-ended day cannot be, in pass words). ~~**ABSENT.** `cancel-booking.ts:568` `AND starts_at > now()` on the booker flip, unforked…~~ | **closed** |
| T-09-88 | Repudiation | charging for a non-refundable purchase with no disclosure | mitigate | **PRESENT (2026-08-01).** `windowAlreadyOpen` is a REQUIRED (non-optional) prop at `components/booking/cancellation-policy-disclosure.tsx:223`, destructured at `:238`, and drives `const nonRefundable = openCapacity && windowAlreadyOpen` at `:265`, which renders `PASS_NON_REFUNDABLE_MESSAGE` in the COLLAPSED `<summary>` at `:275-276` — read without interaction, per D-81. Computed SERVER-SIDE at both call sites: `listings/[id]/book/page.tsx:398` `bk.openCapacity && bk.startsAt.getTime() <= now.getTime()`, mounted at `:425`; and `listings/[id]/page.tsx:371` `windowAlreadyOpen={false}`. Requiring rather than defaulting the prop is what makes it a two-file compiler census (`:215-218`). ~~**ABSENT.** Grep `windowAlreadyOpen` across `src/` → **0 occurrences**. No such prop exists on `CancellationPolicyDisclosure` (`cancellation-policy-disclosure.tsx:174-215`).~~ | **closed** |
| T-09-89 | Tampering (money) | refund path changing while the window moves | mitigate | **VERIFIED BY DIFF, now that the window HAS moved (2026-08-01) — this is the threat 09-25 actually put at risk.** `src/lib/payments/cancellation.ts` is ABSENT from `git diff --name-only 22afa2f HEAD`; its last two commits are `5592420 feat(07-19)` and `1617ec1 feat(07-03)`, both pre-Phase-9, so `quoteRefund` and the `LADDER` are byte-unchanged. In `cancel-booking.ts` the import at `:61` is unchanged and `grep -c 'quoteRefund('` prints **1** — still exactly ONE call, at `:564`, feeding `refund_cents` and `retained_space_cents` at `:643-644`. The 0% outcome for a live-window cancel is the ladder's EXISTING fall-through, not a new rung (`:623-625`). Gate: `open-capacity-cancel.test.ts:787` case 5 (a standard-tier pass cancelled well before opening still refunds the full space price). ~~**ABSENT** as a gate (no diff gate, no case) — but `quoteRefund`/`LADDER` are in fact untouched (`cancel-booking.ts:61`, `:508`). No live exposure.~~ | **closed** |
| T-09-90 | Tampering (payout) | host paid for a cancelled pass / clawback | accept (structurally safe) | **VERIFIED, AND RE-VERIFIED AGAINST THE MOVED WINDOW (2026-08-01).** `inngest/functions/payout-sweep.ts` is ABSENT from the Phase-9 diff (last commits `2832bbd feat(07-04)` / `d98da80 fix(07-01)`), so payout eligibility is still `b.ends_at + make_interval(hours => ${PAYOUT_DELAY_HOURS}) <= now()` with the default 24 (`payments/config.ts:16`). 09-25 moved the booker cancel window from `starts_at > now()` to `(CASE WHEN open_capacity THEN ends_at ELSE starts_at END) > now()` (`cancel-booking.ts:651`) — the acceptance still holds and by the same margin: a live-window cancel occurs at `now() < ends_at`, which is strictly earlier than `ends_at + 24h`, so it remains a platform-wallet reversal and never a clawback. `retained_space_cents` is written at `:644`. *(AR-15's evidence pointer refreshed accordingly — see the Accepted Risks Log.)* ~~Booker cancel requires `starts_at > now()` (`cancel-booking.ts:568`) ⇒ always pre-payout. `retained_space_cents` written at `:561`.~~ | closed |
| T-09-91 | EoP | widening the window for the HOST cancel path | mitigate | **VERIFIED (by inaction).** The host flip retains `AND starts_at > now()` at `cancel-booking.ts:991`. ~~⚠️ The plan's acceptance grep ("appears exactly once") is **mis-specified**: the literal occurs **4 times** in this file (`:568`, `:991`, plus 2 in comments at `:551`, `:968`). Fix the gate before 09-25 runs.~~ *(Corrected 2026-07-31 — the gate is `grep -v '^\s*//' src/app/actions/cancel-booking.ts \| grep -c "AND starts_at > now()"` (`09-25-PLAN.md:209`, `:341`), which filters those two comment lines on purpose; it prints `2` today and `1` after the fork. Correctly specified and correctly calibrated — do not change it. See Correction 1.)* **GATE RE-RUN 2026-08-01 → prints `1`.** Exactly the post-fork value Correction 1 predicted. The host flip retains the literal at `cancel-booking.ts:1080`; the booker flip at `:651` is now the `CASE WHEN open_capacity` fork. The deliberate asymmetry is recorded in-code at `:633-636` and `:1055`. | closed |
| T-09-92 | Repudiation | past-window denials reclassified in the audit trail | mitigate | **PRESENT (2026-08-01).** The identity comparison is now a predicate recognising BOTH constants: `cancel-booking.ts:143-145` `function isPastWindow(result) { return result === PAST_START \|\| result === PASSES_ENDED; }`, with the repudiation reasoning recorded at `:134-142`. Applied at BOTH denial sites — booker `:661` and host `:1090` — each still writing `meta.reason: "past_start"` vs `"not_active"`. The second constant `PASSES_ENDED` is at `:128-132`; `PAST_START` at `:112-116` is deliberately byte-identical so the shipped Phase-7 tests that assert it verbatim still hold. `explainNoRows` picks between them at `:328` on `row.openCapacity && cancelWindow === "booker"`. Gate: `open-capacity-cancel.test.ts:1004` case 9 — "the audit trail still records past_start for a drop-in past-window refusal". ~~**ABSENT.** `cancel-booking.ts:578` and `:1001` still use the identity comparison … Greps: `isPastStart` → 0, `PAST_START_OPEN` → 0. No live exposure (nothing has been reclassified yet).~~ | **closed** |
| T-09-SC | Tampering | npm/pip/cargo installs (supply chain) | mitigate | **RE-VERIFIED 2026-08-01, now that all nine gap plans have executed.** `git log --since=2026-07-29 -- package.json package-lock.json` returns no commits, and neither file appears in `git diff --name-only 22afa2f HEAD`. Working tree clean. 09-23's only new primitive is `crypto.randomUUID` (a platform global, `book-cta.tsx:101`), which is exactly what its plan predicted. No install occurred, so the Package Legitimacy Gate was never triggered — the correct outcome, not a skipped one. | closed |

---

## Gap-plan mitigations already present (finding: not everything in 09-17…09-25 is open)

Nine population-2 threats resolve to `closed` against shipped code. These are recorded explicitly because
assuming them open on the strength of the missing commit would have been wrong:

| Threat ID | Why it is already closed |
|---|---|
| T-09-53 | The webhook route genuinely carries no start-time condition — verified, not inferred. |
| T-09-57 | The over-serialise-only property is a structural fact of `hashtextextended`, recorded in the shipped comment at `units.ts:753-757`. |
| **T-09-61** | `assertOwnership` already runs first in `saveOperatingHours` (`operating-hours.ts:64`). 09-19's "unchanged posture" claim is true. |
| **T-09-65** | 09-09 already shipped the Consequence-3 fork (`cancel-booking.ts:1055`) and it was live-verified in the DB during the 09-16 walkthrough. |
| T-09-66 (partial) | `removeBlock`'s sentinel refusal (`blocks.ts:149,169`) already means a host-created block is deletable. |
| T-09-72 | `assertOwnership` in `saveListingStep` (`listing.ts:109`) + `(id AND hostId)` re-scope (`:216`). |
| T-09-77 | The shared `DENIED` sentence already exists (`group.ts:105,109`). |
| T-09-90 | Payout eligibility is genuinely `ends_at + 24h` (`payout-sweep.ts:122`), and the booker cancel window is strictly pre-`starts_at`. |
| T-09-91 | The host flip's `AND starts_at > now()` is present at `cancel-booking.ts:991`, and 09-25's comment-filtered acceptance grep measures it correctly (see Correction 1). |

**All nine re-checked 2026-08-01 and all nine still hold** at their post-execution line numbers
(`units.ts:753-757` → `:876-880`; `operating-hours.ts:64` → `:97`; `cancel-booking.ts:1055` → `:1144`;
`listing.ts:109`/`:216` → `:113`/`:259`; `group.ts:105,109` unchanged; `blocks.ts:149,169` unchanged;
`payout-sweep.ts:122` unchanged; `cancel-booking.ts:991` → `:1080`). None was regressed by the gap plans that
touched the same files.

---

## Population-1 regression spot-check (2026-08-01)

Population 1 (T-09-01 … T-09-49) was verified 49/49 closed in the prior audit and its premise has not changed,
so it was not re-audited wholesale. Five rows WERE re-checked because a gap plan rewrote the code they depend
on. All five hold; there is **no regression to escalate**.

| Threat ID | Why re-checked | Result at current line numbers |
|---|---|---|
| T-09-27 (double-click double hold) | 09-23 rewrote the replay predicate the guarantee rests on | **HOLDS, and is now stronger.** The prior audit noted the guarantee rested solely on the over-broad tokenless arm because `book-cta.tsx` sent no key. It now rests on two independent locks: the per-selection token (`book-cta.tsx:100-103`, threaded at `:118`, received at `booking.ts:384` and passed to the claim at `:450`) and the still-live tokenless arm (`units.ts:789-792`). Pinned by `open-capacity-replay.test.ts:504` and `:524`. |
| T-09-13 (client-derived scarcity) | 09-24 rewrote the threshold constant | **HOLDS.** `state` is still computed server-side — `read-model.ts:407` `state: spotsState(remaining, cap)`. `grep -rn "OPEN_LOW_STOCK_MAX\|lowStockThreshold" src/components/ src/app/` returns **0**, so nothing client-side re-derives it. The cross-referenced defect (the unvalidated threshold) is now itself closed as T-09-84. |
| T-09-14 (read-model / claim / search drift) | 09-18 + 09-24 rewrote both projections | **HOLDS.** `openTakenSql` is still the single shared fragment, called at `read-model.ts:376` and `units.ts:933`; the month aggregate still imports `OPEN_OCCUPYING_STATUS_SQL` (`read-model.ts:505`); `search/query.ts` is absent from the Phase-9 diff and still calls `getAvailability` at `:243` with no `FROM booking`. The two residual drift instances the row cross-referenced (T-09-55, T-09-85) are now closed, and a THIRD shared predicate (`openBlockedSql`) was added under the same rule (T-09-67). |
| T-09-33 (cancelling someone else's drop-in booking) | 09-25 forked the `starts_at > now()` guard this row cited | **HOLDS.** The owner scope is untouched: `cancel-booking.ts:648-651` still `WHERE id = … AND booker_id = ${userId} AND status = 'confirmed'`, with only the window term forked. Zero rows still routes to the calm `explainNoRows` result (`:656`, `:305-331`), indistinguishable from "not found". No new entry point. |
| T-09-31 (host-cancel auto-block on a drop-in date) | 09-25 edited the file containing the `:1055` fork | **HOLDS.** The fork moved to `cancel-booking.ts:1144` `if (!row.openCapacity)` guarding the `availabilityBlock` insert at `:1146`; the audit meta `autoBlocked: !row.openCapacity` is at `:1112`. Re-proven under REAL blocks now that blocks bite: `tests/availability/open-capacity-blocks.test.ts:520` case 5. |

~~**Plan-gate defect found:** T-09-91's acceptance grep ("`AND starts_at > now()` still appears exactly once")
is unsatisfiable — the literal occurs 4× in `cancel-booking.ts`. 09-25 will fail this gate for the wrong
reason. Scope the grep to the host UPDATE statement.~~

**Plan-gate re-verified — no defect (2026-07-31).** The sentence struck through above quoted 09-25's
mitigation PROSE (`09-25-PLAN.md:331`), not its gate. The actual acceptance gate, given twice at
`09-25-PLAN.md:209` and `:341`, is
`grep -v '^\s*//' src/app/actions/cancel-booking.ts | grep -c "AND starts_at > now()"` — it strips comment
lines first, so it counts only the two real guards (the booker flip at `cancel-booking.ts:568`, which 09-25
forks, and the host flip at `:991`, which 09-25 leaves alone) and ignores the two comments at `:551` and
`:968` that quote the literal. Re-run today it prints `2`, exactly the pre-fix value the plan predicts
("was `2`"); after the fork it prints `1`. **Leave the gate exactly as written.** See Correction 1.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Verified against code | Accepted By | Date |
|---|---|---|---|---|---|
| AR-01 | T-09-04 | New columns are public listing pricing / public availability facts; no PII, no secrets. | `drizzle/0021:13-14`; payload `read-model.ts:374-384` | 09-01 planner | 2026-07-31 |
| AR-02 | T-09-15 | Occupancy enumeration on a public listing — same class as the exclusive calendar (T-03-ENUM). No booker identity returned. | `read-model.ts:371-385` | 09-04 planner | 2026-07-31 |
| AR-03 | T-09-17 | Drop-in scarcity in search results — same class as AR-02; only `{remaining, cap, state}` leaves the server. | `search/query.ts` Stage-2 mapping | 09-05 planner | 2026-07-31 |
| AR-04 | T-09-18 | Stage-2 per-candidate cost unchanged — the open branch reuses the same single `getAvailability` call. | `search/query.ts:243` | 09-05 planner | 2026-07-31 |
| AR-05 | T-09-22 | Price edits are forward-only; every booking freezes `space_price_cents` at hold time. | `listing.ts:194-197`; `units.ts:862` | 09-06 planner | 2026-07-31 |
| AR-06 | T-09-24 | `?requested=` is display-only and clamped to `[granted+1, cap]`; the charge is the frozen `quoted_total_cents`. | `book/page.tsx:259-272` | 09-07 / 09-13 planner | 2026-07-31 |
| AR-07 | T-09-30 | Drop-in labels expose strictly less than exclusive ones (no reservation window). | `when-label.ts:108` | 09-08 planner | 2026-07-31 |
| AR-08 | T-09-37 | Mode-lock alert exposes a count and one instant, never a guest identity. | `mode-lock.ts:60` | 09-10 planner | 2026-07-31 |
| AR-09 | T-09-41 | Month occupancy map exposes date→full only. | `read-model.ts:441-447` | 09-12 planner | 2026-07-31 |
| AR-10 | T-09-42 | One grouped read per month change, bounded by the 90-day horizon. | `read-model.ts:429-438` | 09-12 planner | 2026-07-31 |
| AR-11 | T-09-53 | D-57 intact — the webhook carries no start-time condition; post-window payments fall to `handleGoneSlot`. | `api/paymongo/webhook/route.ts` (no `starts_at` predicate) | 09-17 planner | 2026-07-31 |
| AR-12 | T-09-57 | Advisory-lock hash collisions can only over-serialise. | `units.ts:753-757` | 09-18 planner | 2026-07-31 |
| AR-13 | T-09-72 | `assertOwnership` unchanged; no new entry point. | `listing.ts:109`, `:216` | 09-21 planner | 2026-07-31 |
| AR-14 | T-09-77 | Shared `DENIED` sentence; the distinction lives only in the audit trail. | `group.ts:105,109` | 09-22 planner | 2026-07-31 |
| AR-15 | T-09-90 | Cancel is always pre-payout. ~~(`starts_at > now()` ≪ `ends_at + 24h`)~~ **Rationale refreshed 2026-08-01:** 09-25 moved the booker window to `ends_at` for open rows, and the acceptance survives unchanged — a live-window cancel happens at `now() < ends_at`, still strictly earlier than the `ends_at + 24h` payout boundary. | ~~`cancel-booking.ts:568`~~ `cancel-booking.ts:651`; `payout-sweep.ts:122` (unchanged) | 09-25 planner | 2026-07-31 · refreshed 2026-08-01 |
| AR-16 | T-09-86 | ~~**Pending — takes effect when 09-24 lands.**~~ **ACTIVE as of 2026-08-01 — 09-24 has landed.** The threshold env value is clamped to a finite integer ≥ 1 (`Number.isFinite(...) && >= 1`, floored; else the documented default `5`); it is server-only with no `NEXT_PUBLIC_` prefix and no client-side re-derivation. Residual risk accepted: an operator choosing a large-but-valid ceiling — a configuration choice, not an injection. *(Un-rejected 2026-07-31 — the original row was struck through and marked REJECTED on a misreading of the register's post-mitigation present tense. See Correction 2. Promoted pending → active 2026-08-01 on the landed clamp.)* | ~~`open-capacity.ts:27` — clamp pending 09-24~~ `open-capacity.ts:50-54` — clamp present; no `NEXT_PUBLIC_` prefix; `grep -rn "OPEN_LOW_STOCK_MAX\|lowStockThreshold" src/components/ src/app/` → 0 | 09-24 planner | 2026-07-31 · activated 2026-08-01 |

**Re-verification of the accepted risks (2026-08-01).** All 16 rationales were re-checked against current code.
Fourteen are unaffected by the gap plans (their cited files are absent from the Phase-9 diff, or their cited
lines are byte-unchanged). Two moved and are recorded above: AR-15's evidence pointer (the booker cancel window
was deliberately moved by 09-25 — the acceptance still holds, and by the same margin) and AR-16 (promoted from
pending to active). **0 rejected.**

---

## Unregistered Flags (WARNING — informational, not blocking)

| Flag | Detail |
|---|---|
| **UF-01** *(downgraded 2026-07-31 — tracking note, NOT an unregistered flag)* | **`PAST_START` copy, tracked as review finding NT-01.** NT-01 (`cancel-booking.ts:111-116`) — the cancel refusal says "This session has already started" to a drop-in booker, the exact framing 09-08 forked `when-label.ts` to eliminate. The `booking.ts:726-728` half is covered by T-09-50's mitigation text and is declared at `09-17-PLAN.md:13` (`closes: [CR-01, NT-01-booking-half]`); ~~the `cancel-booking.ts` half appears in no gap plan's register~~ — that half is declared at `09-25-PLAN.md:17` (`closes: [WR-05, NT-01]`), with the objective at `:44` and the split restated at `:52-54`. NT-01 is a review-finding ID, not a `T-09-NN` register ID, which is presumably what a register-scoped search missed. Repudiation-adjacent (a booker is told something untrue about what they bought), and owned end-to-end by 09-17 + 09-25. See Correction 3. |
| **UF-02** | **8 of 16 SUMMARYs carry no `## Threat Flags` section**: 09-02, 09-03, 09-05, 09-08, 09-09, 09-11, 09-14, 09-15. Several substitute a "Threat Register Status" / "Threat Model Coverage" discharge table (09-02:169, 09-08:198, 09-09:170), which is a different artifact — it discharges *known* threats and cannot assert *no new attack surface appeared*. `placeOpenHold` (a new authenticated server-action entry point) was declared in 09-07's section; nothing comparable exists for 09-05's new search SQL branch (`effectivePriceSql`) or 09-02's new claim transaction. Process gap, not a defect. |
| **UF-03** | **Two review findings resolved outside the register.** 09-16 Step 4's reported FAIL was reclassified PASS-with-note by operator decision (`09-16-SUMMARY.md:42`), and NT-03's three items are recorded in `deferred-items.md`. Both are legitimate dispositions; noted so a later auditor does not read them as silent dismissals. |
| **UF-04** *(new 2026-08-01 — process observation, NOT new attack surface)* | **`## Threat Flags` was read on all nine gap-plan SUMMARYs and all nine report "None".** Each names the reason rather than asserting the header: no new network endpoint, auth path, file-access pattern or schema change at a trust boundary. Independently corroborated — `drizzle/` and `package.json` are absent from `git diff 22afa2f HEAD`, and every file the diff touches already appears in the Trust Boundaries table. **One format deviation:** `09-25-SUMMARY.md:238` uses `## Threat Register Outcomes` instead of `## Threat Flags`, so the phase's ninth plan carries a discharge table where a flag section belongs — the SAME substitution UF-02 records for eight population-1 SUMMARYs. A discharge table settles *known* threats; it cannot assert *no new surface appeared*. For 09-25 the assertion was reconstructed by the auditor from the diff (two files, both already trust boundaries) and holds. Process gap only; it does not change any threat's status. |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open (live) | Open (deferred) | Run By |
|------------|---------------|--------|------|------|--------|
| 2026-07-31 | 93 | 58 | 27 | 8 | gsd-security-auditor (Claude) |
| 2026-08-01 | 93 | **93** | **0** | **0** | gsd-security-auditor (Claude) — re-audit after 09-17 … 09-25 executed |

**Breakdown (2026-07-31):** population 1 (executed) 49/49 closed · population 2 (unexecuted) 9/44 closed.
**Breakdown (2026-08-01):** population 1 49/49 closed (5 spot-checked for regression, 0 found) ·
population 2 **44/44 closed**. All 35 previously-open threats re-greped individually against current code;
none was closed on a SUMMARY discharge claim.

---

## Ship Gate

~~`block_on: high` — **27 live-open threats. The phase must not ship.**~~

**`block_on: high` — 0 open threats. The security gate is CLEAR (2026-08-01).**

Every one of the 27 live-open and 8 deferred threats the 2026-07-31 audit recorded has been closed by its own
gap plan and re-verified against shipped code:

| Plan | Threats it closed | Verified at |
|---|---|---|
| 09-17 | T-09-50, 51, 52 | `booking.ts:692`, `:693`, `:757-765` |
| 09-18 | T-09-54, 55, 56 | `units.ts:892`, `:914-919`, `:933`; `open-capacity.ts:165-180`, `:206-213`; `read-model.ts:498`, `:506` |
| 09-19 | T-09-58, 59, 60, 62 | `hours-lock.ts:81-121`; `operating-hours.ts:45-47`, `:130-159`; `availability/page.tsx:89-90`, `:126-134` |
| 09-20 | T-09-63, 64, 66, 67 | `open-capacity.ts:103`, `:130-136`; `read-model.ts:377`, `:516`; `units.ts:934`, `:961`; `blocks.ts:149,169` |
| 09-21 | T-09-68, 69, 70, 71 | `listing.ts:171-186`; `units.ts:984`, `:1019-1026`; `validation/listing.ts:95`, `:100`; `pricing.ts:60` |
| 09-22 | T-09-73, 74, 75, 76 | `group.ts:244`, `:279-287`, `:333`; `bookings/[id]/page.tsx:549-553`, `:559` |
| 09-23 | T-09-78, 79, 80, 81, 82 | `units.ts:259-261`, `:302`, `:769-772`, `:789-792`; `book-cta.tsx:100-103`, `:118` |
| 09-24 | T-09-83, 84, 85, 86 | `open-capacity.ts:50-54`, `:344-349`; `read-model.ts:457-467` |
| 09-25 | T-09-87, 88, 89, 92 | `cancel-booking.ts:128-132`, `:143-145`, `:311-314`, `:651`; `cancellation-policy-disclosure.tsx:223`, `:265`; `book/page.tsx:398`, `:425` |

**The five highest-severity hazards the prior gate named are each closed and each carries a test that would
turn red if the fix were reverted** — that is the standard applied here, not "a fix appears to exist":

1. **T-09-54** (up to 2× the daily cap sellable after an hours edit) — counter, lock key and sweep all
   re-anchored on the venue-local calendar date; `open-capacity-hours-rekey.test.ts:327` case 1 is
   mutation-measured.
2. **T-09-73 / T-09-74** (`cap−1` RSVP seats from one paid pass) — the mode predicate is in BOTH the pre-read
   gate and the INSERT's `WHERE`; `open-capacity-group-guard.test.ts:429` case 3 pins both statements.
3. **T-09-63 / T-09-64** (host "Blocked dates" had zero effect) — one shared `openBlockedSql` at three call
   sites; `open-capacity-blocks.test.ts:478` case 3 asserts NO booking row, not a sentence.
4. **T-09-50** (a same-day pass holdable but never payable) — the cutoff forks on the persisted mode;
   `open-capacity-confirm.test.ts:403` case 1 books one in the CR-01 window and asserts the row shape.
5. **T-09-69 / T-09-70** (raw 500 + Next.js digest on the money path) — the claim fails closed on a
   NULL/non-positive rate AND on an int4-overflowing product; `open-capacity-edit-gate.test.ts:647` case 5 and
   `:738` case 7 assert the action RETURNS rather than rejects.

**Residual, non-blocking:** UF-02 and UF-04 are process observations about SUMMARY format, not attack surface.
UF-01 remains a tracking note per Correction 3.

---

## Sign-Off

- [x] All 93 threats have a disposition (mitigate / accept / transfer) — 0 `transfer` in this phase
- [x] Every `mitigate` threat verified by grep against the cited file — **2026-08-01: all 35 previously-open threats re-greped individually; every `closed` row cites a file:line in shipped `src/` / `tests/`**
- [x] Every `accept` threat's rationale re-checked against shipped code — the one rejection (T-09-86 / AR-16) was retracted 2026-07-31, so the count is now **0 rejected** (see Correction 2); AR-16 promoted pending → **active** 2026-08-01 on the landed clamp
- [x] Accepted risks documented in Accepted Risks Log (16 accepted — **all active**; 0 pending, 0 rejected)
- [x] Unregistered flags logged (UF-02, UF-03, UF-04; UF-01 downgraded 2026-07-31 to a tracking note — see Correction 3)
- [x] Population-1 regression spot-check performed on the 5 rows the gap plans could have broken — **0 regressions**
- [x] No implementation file modified by this audit — `src/`, `drizzle/`, `tests/`, `e2e/` read-only throughout; only this file was written
- [x] `threats_open: 0` confirmed — **YES (2026-08-01)**. ~~**NO: 35 open (27 live, 8 deferred)**~~
- [x] `status: verified` set in frontmatter — **YES (2026-08-01)**. ~~**NO: `issues_found`**~~

~~**Approval:** pending — re-run `/gsd:secure-phase` after 09-17 … 09-25 execute.~~

**Approval: GRANTED (2026-08-01).** 09-17 … 09-25 have executed and every threat they were written to close was
re-verified against shipped code, not against their SUMMARYs. 93/93 closed, 0 open. The phase clears the
security gate.
