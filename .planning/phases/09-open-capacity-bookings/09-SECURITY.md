---
phase: 09
slug: open-capacity-bookings
status: issues_found
threats_total: 93
threats_closed: 58
threats_open: 35
asvs_level: 2
block_on: high
created: 2026-07-31
audited_by: gsd-security-auditor
register_origin: authored_at_plan_time (25 PLAN files, all carry a parseable <threat_model> block)
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Verification mode: **evidence-required**. No threat is marked closed on documentation, intent, or a
> SUMMARY discharge claim alone — every `closed` row cites a file:line in shipped code (or a recorded live
> observation for the two manual-verification threats). Every `open` row cites the greps that came back empty.

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

| Population | Plans | Threat IDs | Expectation | Result |
|---|---|---|---|---|
| 1 — EXECUTED | 09-01 … 09-16 (16 SUMMARYs) | T-09-01 … T-09-49 | mitigations present in `src/` | **49/49 closed** |
| 2 — PLANNED, NOT EXECUTED | 09-17 … 09-25 (0 SUMMARYs) | T-09-50 … T-09-92, T-09-SC | mitigations absent | **9 closed · 35 open** |

**Non-execution of population 2 is proven, not assumed.** `git log --name-only -- src/ drizzle/ tests/ e2e/`
shows the last implementation commit is `22afa2f feat(09-14)`. Everything after it —
`d792f0a` (review), `def2e68` (wip), `d4a3dde` / `73791e8` / `3d4322c` / `b363991` (gap-plan docs) — touches
no implementation file. `package.json` has no commit in the window (supply-chain threat T-09-SC).

**Nine population-2 threats were found already mitigated or structurally satisfied by shipped code** — see
"Gap-plan mitigations already present" below. These were not assumed open on the strength of the missing
commit; each was greped against `src/`.

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
| operator env → `OPEN_LOW_STOCK_MAX` | server-only config governing a booker-visible disclosure | **unvalidated** `Number(env)` — see T-09-84 / T-09-86 |
| host operating-hours rows → admissions counter | host-mutable data that derives the counter's identity key | **unguarded** — see T-09-54 |

---

## Threat Register

Status legend: `closed` (mitigation verified in code) · `open` (declared mitigation absent; hazard live in
shipped code — **BLOCKER**) · `open-deferred` (declared mitigation absent, but the hazard it guards is
introduced by the same unexecuted plan, so there is **no live exposure today**).

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

### Population 2 — gap plans 09-17 … 09-25 (NOT EXECUTED)

| Threat ID | Category | Component | Disp. | Evidence | Status |
|---|---|---|---|---|---|
| T-09-50 | DoS (self-inflicted) | `confirmBooking` D-94 cutoff on an open row | mitigate | **ABSENT.** `actions/booking.ts:723` is still `if (bk.startsAt.getTime() <= nowFromDb.getTime())` with no mode fork. Greps across `src/`: `openCapacity ? bk.endsAt` → 0; `cutoff` → 0. **LIVE:** a same-day pass is holdable but never payable (CR-01). | **open** |
| T-09-51 | Tampering | widening the cutoff for EXCLUSIVE bookings | mitigate | **ABSENT** — no fork exists, so no verbatim-sentence test or NULL-`checkout_session_id` read-back exists. No live exposure: exclusive behaviour is unchanged at `booking.ts:723-729`. | open-deferred |
| T-09-52 | Spoofing | inferring mode from a null rate / `full_day` | mitigate | **ABSENT.** `confirmBooking`'s projection (`booking.ts:~680-690`) does not select `booking.openCapacity`; grep `bk.openCapacity` returns 12 hits, none in `booking.ts`'s confirm path. No live exposure until the fork ships. | open-deferred |
| T-09-53 | Repudiation | start-time condition leaking into the webhook | accept (guarded) | **VERIFIED.** `api/paymongo/webhook/route.ts` contains no `starts_at` condition — `startsAt` appears only at `:228` / `:253` as notification payload data. D-57 intact; `handleGoneSlot` auto-refund backstop unchanged. | closed |
| T-09-54 | Tampering (capacity) | counter keyed on a host-mutable value | mitigate | **ABSENT.** Lock key `units.ts:761-762` uses `openIso`; counted set `open-capacity.ts:78` `b.starts_at = ${dayOpenIso}`; sweep `units.ts:784` same. Greps: `AT TIME ZONE l.timezone` → 0; `open_date` → 0. **LIVE:** up to 2× cap sellable after an hours edit (CR-03). | **open** |
| T-09-55 | Info disclosure / stale availability | month grid + search advertising a saturated date | mitigate | **ABSENT.** `read-model.ts:437` still `GROUP BY b.starts_at` (the opening instant), not a venue-local date. Two `starts_at` groups are each compared to `cap` separately at `:442`. | **open** |
| T-09-56 | DoS | stranded hold no later claim can sweep | mitigate | **ABSENT.** `units.ts:780-784` sweep is scoped `AND starts_at = ${openIso}` — same re-derived instant as the counter. | **open** |
| T-09-57 | EoP | over/under-serialising the advisory lock | accept | **VERIFIED.** `units.ts:753-757` — the shipped comment records that a `hashtextextended` collision can only OVER-serialise, never under-serialise. Correctness-safe by construction. | closed |
| T-09-58 | Tampering | hours edit stranding passes already sold | mitigate | **ABSENT.** `actions/operating-hours.ts:80-94` deletes and reinserts every window with no booking awareness. Grep `getOpenHoursLockState` across `src/` → 0. **LIVE.** | **open** |
| T-09-59 | DoS (bookers) | deleting a weekday's hours while passes exist | mitigate | **ABSENT.** Same site: `operating-hours.ts:82` unconditional `tx.delete(operatingHours)`; `windows.length === 0` is accepted (`:83`). **LIVE.** | **open** |
| T-09-60 | DoS (host) | canonicalisation bug freezing the editor | mitigate | **ABSENT** — no `HH:mm:ss` comparison exists to be buggy. No live exposure (the comparison is introduced by 09-19). | open-deferred |
| T-09-61 | EoP | reading/freezing another host's listing | mitigate | **ALREADY PRESENT.** `actions/operating-hours.ts:64-67` `assertOwnership(listingId, userId)` runs before validation and before the write; `:40-48` scopes on `hostId` + `isNull(deletedAt)`. | closed |
| T-09-62 | Info disclosure | advisory naming bookings on a non-owner page | mitigate | **ABSENT** — the advisory is not rendered anywhere. No live exposure (the surface is introduced by 09-19). | open-deferred |
| T-09-63 | Info disclosure / stale availability | open read model advertising a host-blocked date | mitigate | **ABSENT.** `availability_block` is queried in exactly ONE place in the whole availability library — `read-model.ts:221` — which sits below the open fork at `:196`. `getOpenDay` (`:323-386`) and `getOpenMonthAvailability` (`:394-447`) never read it. Grep `openBlockedSql` / `OPEN_BLOCK_UNIT_SCOPE_SQL` → 0. **LIVE** (CR-02). | **open** |
| T-09-64 | Tampering | crafted date payload on a blocked date | mitigate | **ABSENT.** `units.ts:790-805` — the claim's single cap/rate statement selects `max_occupancy`, `per_head_price_cents`, `cancellation_policy`, `taken`, `day_open_ok`, `horizon_ok`. No `NOT EXISTS (… availability_block …)`. **LIVE.** | **open** |
| T-09-65 | DoS (other bookers) | one host cancel closing a whole drop-in day | mitigate | **ALREADY PRESENT.** `cancel-booking.ts:1055` `if (!row.openCapacity)` fork is shipped and live-verified (`09-16-SUMMARY.md:270-282`). *(The 09-20 "case 5 re-proof under real blocks" is absent, but the fork itself is what mitigates the threat.)* | closed |
| T-09-66 | DoS (host) | undeletable block stranding a date | mitigate | **ABSENT** as a case, but the underlying rule is present: `actions/blocks.ts:149,169` — `removeBlock` refuses only the `host_cancellation` sentinel, so a host-created block stays deletable. No live exposure (blocks have no effect on open listings today — T-09-63). | open-deferred |
| T-09-67 | Tampering | drift between claim's block test and read model's | mitigate | **ABSENT.** Zero shared block predicate exists (grep `openBlockedSql` → 0); there are zero call sites, not three. | **open** |
| T-09-68 | Tampering | published listing edited into unpublishable drop-in config | mitigate | **ABSENT.** `actions/listing.ts:133-144` — the published-row re-gate covers ONLY the HG-01 surcharge rule. `occupancyMode`, `perHeadPriceCents`, `bookingMode`, `unitCount` are written straight through at `:184`, `:197`, `:202`. **LIVE** (CR-04). | **open** |
| T-09-69 | DoS | unhandled server-action error on the money path | mitigate | **ABSENT.** `pricing.ts:163-166` — `quoteOpenCapacity` still `throw`s on a null `perHeadPriceCents`; `units.ts:824-834` guards `cap` (`cap ?? 0`) but not `perHead`. Grep `perHead == null` → 0; `MAX_MONEY_CENTS` → 0. **LIVE:** the T-03-500 outcome `mapBookingError`'s docblock promises never happens. | **open** |
| T-09-70 | Info disclosure | Next.js error digest / stack to a booker | mitigate | **ABSENT.** Same site as T-09-69 — the exception escapes `placeOpenHold` (`booking.ts:437-451` handles only `"error" in res`). **LIVE.** | **open** |
| T-09-71 | Tampering (money) | int4 overflow (22003) on money columns | mitigate | **ABSENT.** `validation/listing.ts:155` `perHeadPriceCents: z.number().int().positive().optional()` — no ceiling; `maxOccupancy` likewise unbounded above. No product guard at `units.ts:834`. The docblock at `validation/booking.ts:126-130` asserts a protection that does not exist. | **open** |
| T-09-72 | EoP | editing another host's listing | accept | **VERIFIED.** `actions/listing.ts:109-112` `assertOwnership` runs before validation, before the published-row gate, before the write; `:216` re-scopes `(id AND hostId)`. Posture unchanged. | closed |
| T-09-73 | EoP | `createGroup` on a drop-in booking | mitigate | **ABSENT.** `actions/group.ts` — grep `occupancy_mode = 'exclusive'` across `src/` → 0. The pre-read gate and the INSERT `WHERE` (`:296`) check only `booker_id`, `status='confirmed'`, `l.max_occupancy >= 2`. **LIVE** (CR-05). | **open** |
| T-09-74 | Spoofing (capacity) | cap−1 strangers against one paid admission | mitigate | **ABSENT.** Same guard. `capacity_snapshot` is `GREATEST(max_occupancy − 1, 0)` — the DAILY cap. **LIVE.** | **open** |
| T-09-75 | Info disclosure | invite emails describing a pass as a 16-hour reservation | mitigate | **ABSENT.** The four `openCapacity: false` literals remain assumed-true, not enforced-true: `group/page.tsx:118`, `actions/group.ts:188`, `invite/[token]/page.tsx:152`, `bookings/[id]/page.tsx` group branch. **LIVE.** | **open** |
| T-09-76 | Repudiation | comment asserting a server re-check that does not exist | mitigate | **ABSENT.** `app/(app)/bookings/[id]/page.tsx:549` still reads "`createGroup` re-checks ownership and confirmation server-side…" while `:556` gates on `lst.occupancyMode === "exclusive"` client-side only. | **open** |
| T-09-77 | Info disclosure (oracle) | "not yours" vs "can't host a group" | accept | **VERIFIED.** `actions/group.ts:105` `DENIED`, `:109` `NOT_CONFIRMED = DENIED`, returned at `:228`, `:273`, `:318`. One sentence, no oracle. | closed |
| T-09-78 | Info disclosure (existence oracle) | `idempotency_key` matched without booker scope | mitigate | **ABSENT.** `units.ts:684-687` — `(idempotency_key = ${key} OR (booker_id = … AND starts_at = …))`; the key arm carries no `booker_id`. Twin at `:265` (`findOwnActiveHold`) identical. **LIVE via crafted POST** (`openHoldSchema` accepts a 200-char key; `booking_idem_uq` is global). | **open** |
| T-09-79 | DoS (revenue + attendance) | confirmed pass swallowing later purchases | mitigate | **ABSENT.** `units.ts:683` still `(status = 'confirmed' OR (status='pending' AND expires_at > now()))`; for an open row `starts_at` IS the whole date, so all purchases for a date collapse into the first. **LIVE** (CR-06). | **open** |
| T-09-80 | DoS | 23505 escaping `mapBookingError` as a raw 500 | mitigate | **ABSENT.** The key arm at `units.ts:685` sits inside the status filter at `:683`, so a cancelled row bearing the key does not replay — it falls through to the INSERT and raises 23505, which `mapBookingError` re-throws. | **open** |
| T-09-81 | Tampering | client token as a lookup handle for another user's row | mitigate | **ABSENT.** Same predicate as T-09-78. | **open** |
| T-09-82 | Repudiation | losing D-42 while narrowing the predicate | mitigate | **ABSENT** — no narrowing occurred, so cases 3/4 and the `BookCta` per-selection token memo do not exist. Grep `idempotencyKey` in `book-cta.tsx` → 0. No live exposure (D-42 is currently held by the over-broad predicate). | open-deferred |
| T-09-83 | DoS | hold born already expired on a split-shift day | mitigate | **ABSENT.** `open-capacity.ts:160-161` still `min(open_time)` / `max(close_time)` in SQL — `MAX` on a wall-clock `time` cannot express a shift rolling past midnight; `:119` `rollsPastMidnight` is computed from the collapsed envelope, not per row. **LIVE** (WR-02). | **open** |
| T-09-84 | Info disclosure (suppressed) | OPEN-04 scarcity off from a config typo | mitigate | **ABSENT.** `open-capacity.ts:27` — `export const OPEN_LOW_STOCK_MAX = Number(process.env.OPEN_LOW_STOCK_MAX ?? 5);` with no `Number.isFinite` and no positivity check. Grep `Number.isFinite(parsed)` → 0. `Math.min(x, NaN)` → `NaN`; `remaining <= NaN` is always false. **LIVE** (WR-03). | **open** |
| T-09-85 | Info disclosure / stale availability | month grid offering dates the day panel refuses | mitigate | **ABSENT.** `read-model.ts:410` `cap = maxOccupancy ?? 0`; `:442` `.filter(r => Number(r.taken) >= cap)` — with `cap = 0` a date with no bookings produces no row and stays selectable, while `getOpenDay` (`:362-363`) renders "Fully booked". **LIVE** (NT-02). | **open** |
| T-09-86 | Tampering | operator env value reaching arithmetic unvalidated | accept (bounded) | **ACCEPTANCE RATIONALE NOT SATISFIED.** The rationale reads "…is now clamped to a finite integer ≥ 1". No clamp exists (`open-capacity.ts:27`). The value IS server-only (no `NEXT_PUBLIC_` prefix — verified), so the disclosure half of the rationale holds; the clamp half does not. Not acceptable as written. | **open** |
| T-09-87 | DoS (booker) | pass uncancellable for the whole day it is valid | mitigate | **ABSENT.** `cancel-booking.ts:568` `AND starts_at > now()` on the booker flip, unforked. Grep `openCapacity ? … endsAt` → 0. Currently masked by T-09-50; closing T-09-50 exposes it directly (WR-05). | **open** |
| T-09-88 | Repudiation | charging for a non-refundable purchase with no disclosure | mitigate | **ABSENT.** Grep `windowAlreadyOpen` across `src/` → **0 occurrences**. No such prop exists on `CancellationPolicyDisclosure` (`cancellation-policy-disclosure.tsx:174-215`). | **open** |
| T-09-89 | Tampering (money) | refund path changing while the window moves | mitigate | **ABSENT** as a gate (no diff gate, no case) — but `quoteRefund`/`LADDER` are in fact untouched (`cancel-booking.ts:61`, `:508`). No live exposure. | open-deferred |
| T-09-90 | Tampering (payout) | host paid for a cancelled pass / clawback | accept (structurally safe) | **VERIFIED.** `inngest/functions/payout-sweep.ts:122` — `b.ends_at + make_interval(hours => ${PAYOUT_DELAY_HOURS}) <= now()` with `PAYOUT_DELAY_HOURS` default 24 (`payments/config.ts:16`). Booker cancel requires `starts_at > now()` (`cancel-booking.ts:568`) ⇒ always pre-payout. `retained_space_cents` written at `:561`. | closed |
| T-09-91 | EoP | widening the window for the HOST cancel path | mitigate | **VERIFIED (by inaction).** The host flip retains `AND starts_at > now()` at `cancel-booking.ts:991`. ⚠️ The plan's acceptance grep ("appears exactly once") is **mis-specified**: the literal occurs **4 times** in this file (`:568`, `:991`, plus 2 in comments at `:551`, `:968`). Fix the gate before 09-25 runs. | closed |
| T-09-92 | Repudiation | past-window denials reclassified in the audit trail | mitigate | **ABSENT.** `cancel-booking.ts:578` and `:1001` still use the identity comparison `reason === PAST_START ? "past_start" : "not_active"`; only one `PAST_START` constant exists (`:112`). Greps: `isPastStart` → 0, `PAST_START_OPEN` → 0. No live exposure (nothing has been reclassified yet). | open-deferred |
| T-09-SC | Tampering | npm/pip/cargo installs (supply chain) | mitigate | **VERIFIED.** `git log --since=2026-07-29 -- package.json` returns no commits; working tree clean. No package was installed by any gap plan. The Package Legitimacy Gate was never triggered because no install occurred. | closed |

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
| T-09-91 | The host flip's `AND starts_at > now()` is present at `cancel-booking.ts:991`. |

**Plan-gate defect found:** T-09-91's acceptance grep ("`AND starts_at > now()` still appears exactly once")
is unsatisfiable — the literal occurs 4× in `cancel-booking.ts`. 09-25 will fail this gate for the wrong
reason. Scope the grep to the host UPDATE statement.

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
| AR-15 | T-09-90 | Cancel is always pre-payout (`starts_at > now()` ≪ `ends_at + 24h`). | `cancel-booking.ts:568`; `payout-sweep.ts:122` | 09-25 planner | 2026-07-31 |
| ~~AR-16~~ | ~~T-09-86~~ | **REJECTED.** Rationale asserts the value "is now clamped to a finite integer ≥ 1". No clamp exists. Re-file once `open-capacity.ts:27` is fixed. | `open-capacity.ts:27` — bare `Number(env)` | — | — |

---

## Unregistered Flags (WARNING — informational, not blocking)

| Flag | Detail |
|---|---|
| **UF-01** | **`PAST_START` copy has no threat mapping.** Review finding NT-01 (`cancel-booking.ts:111-116`) — the cancel refusal says "This session has already started" to a drop-in booker, the exact framing 09-08 forked `when-label.ts` to eliminate. The `booking.ts:726-728` half is covered by T-09-50's mitigation text; the `cancel-booking.ts` half appears in no gap plan's register. Repudiation-adjacent (a booker is told something untrue about what they bought). |
| **UF-02** | **8 of 16 SUMMARYs carry no `## Threat Flags` section**: 09-02, 09-03, 09-05, 09-08, 09-09, 09-11, 09-14, 09-15. Several substitute a "Threat Register Status" / "Threat Model Coverage" discharge table (09-02:169, 09-08:198, 09-09:170), which is a different artifact — it discharges *known* threats and cannot assert *no new attack surface appeared*. `placeOpenHold` (a new authenticated server-action entry point) was declared in 09-07's section; nothing comparable exists for 09-05's new search SQL branch (`effectivePriceSql`) or 09-02's new claim transaction. Process gap, not a defect. |
| **UF-03** | **Two review findings resolved outside the register.** 09-16 Step 4's reported FAIL was reclassified PASS-with-note by operator decision (`09-16-SUMMARY.md:42`), and NT-03's three items are recorded in `deferred-items.md`. Both are legitimate dispositions; noted so a later auditor does not read them as silent dismissals. |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open (live) | Open (deferred) | Run By |
|------------|---------------|--------|------|------|--------|
| 2026-07-31 | 93 | 58 | 27 | 8 | gsd-security-auditor (Claude) |

**Breakdown:** population 1 (executed) 49/49 closed · population 2 (unexecuted) 9/44 closed.

---

## Ship Gate

`block_on: high` — **27 live-open threats. The phase must not ship.**

Every live-open threat maps to a written, ready gap plan:

| Plan | Live-open threats it closes |
|---|---|
| 09-17 | T-09-50 |
| 09-18 | T-09-54, T-09-55, T-09-56 |
| 09-19 | T-09-58, T-09-59 |
| 09-20 | T-09-63, T-09-64, T-09-67 |
| 09-21 | T-09-68, T-09-69, T-09-70, T-09-71 |
| 09-22 | T-09-73, T-09-74, T-09-75, T-09-76 |
| 09-23 | T-09-78, T-09-79, T-09-80, T-09-81 |
| 09-24 | T-09-83, T-09-84, T-09-85, T-09-86 |
| 09-25 | T-09-87, T-09-88 |

The 8 `open-deferred` threats (T-09-51, 52, 60, 62, 66, 82, 89, 92) carry no live exposure and become
verifiable only when their own plan executes. They are not ship blockers *today*; they ARE gates on the
plans that introduce their surface.

**Highest-severity live-open, in order:**
1. **T-09-54** — up to 2× the daily cap sellable for one date after a routine hours edit. Money taken for
   admissions that do not exist; the correctness guarantee CLAUDE.md names as non-negotiable.
2. **T-09-73 / T-09-74** — `createGroup` on a paid drop-in pass mints `cap−1` RSVP seats; up to 29 strangers
   told they are coming against one paid admission.
3. **T-09-63 / T-09-64** — host "Blocked dates" have zero effect; a closed venue keeps selling passes.
4. **T-09-50** — a same-day pass is holdable but never payable; the headline walk-in use case dead-ends.
5. **T-09-69 / T-09-70** — a raw 500 with a Next.js digest on the money path, reachable through the shipped
   wizard in the normal step order.

---

## Sign-Off

- [x] All 93 threats have a disposition (mitigate / accept / transfer) — 0 `transfer` in this phase
- [x] Every `mitigate` threat verified by grep against the cited file, or absence proven by empty grep
- [x] Every `accept` threat's rationale re-checked against shipped code (one rejected: T-09-86)
- [x] Accepted risks documented in Accepted Risks Log (15 accepted, 1 rejected)
- [x] Unregistered flags logged (UF-01 … UF-03)
- [x] No implementation file modified by this audit
- [ ] `threats_open: 0` confirmed — **NO: 35 open (27 live, 8 deferred)**
- [ ] `status: verified` set in frontmatter — **NO: `issues_found`**

**Approval:** pending — re-run `/gsd:secure-phase` after 09-17 … 09-25 execute.
