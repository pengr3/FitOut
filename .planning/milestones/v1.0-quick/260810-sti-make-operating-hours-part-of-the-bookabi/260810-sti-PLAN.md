---
phase: quick-260810-sti
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/bookability.ts
  - src/lib/search/query.ts
  - src/lib/listing/hours-signal.ts
  - src/app/listings/[id]/page.tsx
  - src/app/actions/booking.ts
  - src/app/(host)/host/listings/page.tsx
  - src/components/listing/listing-card.tsx
  - tests/listing/bookability.test.ts
  - tests/search/bookable-gate.test.ts
  - tests/booking/state-machine.test.ts
  - tests/booking/open-capacity-hold.test.ts
  - tests/booking/notify-emission.test.ts
  - tests/booking/request-lifecycle.test.ts
  - tests/paymongo/webhook-merchant-activated.test.ts
  - tests/listing/listing-card.test.tsx
  - tests/listing/hours-signal.test.ts
  - tests/availability/availability-calendar.test.tsx
autonomous: true
requirements: ["v1.0-AUDIT-4"]

must_haves:
  truths:
    - "A published listing whose host is verified and payout-activated but which has ZERO operating_hours rows is NOT bookable (D-15 gains a fourth term)."
    - "That listing is absent from a DEFAULT no-date browse search — not just from a date-filtered one (D-16)."
    - "placeHold REFUSES that listing server-side with reason 'not-bookable' (Security V4) — the refusal does not depend on any client-side CTA."
    - "placeOpenHold REFUSES the drop-in equivalent server-side with reason 'not-bookable', proven by its OWN test against an open_capacity fixture — the clause is a deliberate RE-STATEMENT (booking.ts:351-354), so it is independently duplicated code and gets independent coverage."
    - "The booker-facing listing page still renders the real availability calendar for that listing, read-only — a preview, never a dead end (Phase-3 rule)."
    - "A host who deletes their LAST operating_hours row un-sells the listing instantly, with no listing write (the D-14 auto-revert property, now over a fourth input)."
    - "A draft or unlisted listing is unaffected: the status term already decides it, whatever its hours."
    - "In-flight bookings are unaffected — no existing booking row is re-derived anywhere."
    - "The TypeScript predicate and its inlined SQL twin agree, and a test FAILS if either drifts (Pitfall 5)."
    - "deriveBookable stays PURE — no DB, no I/O — so the truth table still drives it directly."
  artifacts:
    - path: "src/lib/bookability.ts"
      provides: "The sell-gate with a fourth term, still pure; header records why the term is a parameter and not a query"
      contains: "hasOperatingHours"
    - path: "src/lib/search/query.ts"
      provides: "The inlined SQL twin, with an UNCONDITIONAL EXISTS on operating_hours inside the deriveBookable block"
      contains: "operating_hours oh_any"
    - path: "src/lib/listing/hours-signal.ts"
      provides: "listingHasOperatingHours single-listing read + a corrected header (the module is no longer 'signal, not gate')"
      exports: ["HOURS_MISSING_STATE", "HOURS_MISSING_REASON", "HOURS_MISSING_CTA", "loadPublishedListingsMissingHours", "listingHasOperatingHours"]
    - path: "tests/listing/bookability.test.ts"
      provides: "16-row truth table over (published?, emailVerified, payoutsEnabled, hasOperatingHours) + the last-hours-row-removed revert"
      min_lines: 80
    - path: "tests/search/bookable-gate.test.ts"
      provides: "Real-DB proof that a zero-hours listing is excluded from a no-date browse search, plus a set-equality parity assertion against deriveBookable itself"
      min_lines: 110
    - path: "tests/booking/state-machine.test.ts"
      provides: "The EXCLUSIVE server-side refusal anchor — placeHold on a published, payout-activated, zero-hours listing returns not-bookable and mints no row"
      contains: "L_nohours"
    - path: "tests/booking/open-capacity-hold.test.ts"
      provides: "The OPEN-CAPACITY server-side refusal anchor — placeOpenHold's re-stated bookability clause proven independently, never by inference from placeHold"
      contains: "L_OPEN_NOHOURS"
    - path: "tests/availability/availability-calendar.test.tsx"
      provides: "Read-only proof: bookable=false renders the real slots and refuses selection, rather than rendering nothing"
      min_lines: 70
  key_links:
    - from: "src/lib/search/query.ts"
      to: "src/lib/bookability.ts"
      via: "tests/search/bookable-gate.test.ts imports deriveBookable and asserts SQL result set == TS predicate over the same fixtures (the Pitfall-5 drift guard that replaces the retired byte-unchanged gate)"
      pattern: "deriveBookable"
    - from: "src/app/actions/booking.ts"
      to: "operating_hours"
      via: "a correlated EXISTS folded into the EXISTING bookability SELECT — zero extra round trips, in BOTH placeHold and placeOpenHold, each with its own RED anchor"
      pattern: "EXISTS \\(SELECT 1 FROM operating_hours"
    - from: "src/app/listings/[id]/page.tsx"
      to: "src/lib/listing/hours-signal.ts"
      via: "listingHasOperatingHours(db, id) inside the EXISTING Promise.all, so the derive gains a term but not a round trip"
      pattern: "listingHasOperatingHours"
    - from: "src/app/(host)/host/listings/page.tsx"
      to: "src/lib/listing/hours-signal.ts"
      via: "hasOperatingHours: !missingHours.has(r.id) — reuses the ONE grouped query iu7 already issues; never a per-card read"
      pattern: "missingHours.has"
---

<objective>
Close v1.0 milestone-audit tech-debt item #4 (`.planning/v1.0-MILESTONE-AUDIT.md:307-308`) by making
"the listing has at least one `operating_hours` row" the FOURTH term of the bookability sell-gate.

A listing with an empty calendar may still be PUBLISHED. It is simply not SELLABLE.

Purpose: today a host can go Live with no hours, and every booker who opens that listing sees every date
render Closed with no route forward. Quick task `260801-iu7` deliberately shipped a host-side SIGNAL and
left the gate half open (`260801-iu7-SUMMARY.md` § "What remains open"). This plan closes the other half —
and closes the BOOKER-facing dead end through machinery that already exists, rather than by inventing UI.

Output: a four-term `deriveBookable`, a matching SQL twin, four updated call sites, and tests that make
the two halves of the predicate unable to drift apart.
</objective>

<decision_record>
## The route: derivation, not a publish gate — LOCKED by the operator

Both routes were put to the operator and this one was chosen. The reasoning, recorded so it is not
relitigated:

1. **A publish gate only prevents NEW cases.** Listings already live with an empty calendar would stay
   live and stay a dead end. That is precisely why `260801-iu7` shipped a signal instead of a gate.
2. **A gate blocks a legitimate host** who wants to publish first and set hours thirty seconds later.
3. **`src/lib/bookability.ts` exists to express exactly this state.** Its own header: *"the SINGLE place
   that decides whether a listing may be sold … downstream phases read ONLY deriveBookable — never
   `status` alone — so 'published' can never be mistaken for 'sellable'."* A listing that cannot be sold
   for lack of hours is that boundary doing its job.

`publishListing` and `publishSchema` are **NOT touched**. Publishing behaviour is exactly what it was.

## The four claims from the brief — VERIFIED against the current tree (HEAD `f0814b7`)

All four hold. The dead end closes through existing, already-tested machinery. Corrections in bold.

| Claim | Verdict | Evidence |
|---|---|---|
| Search Stage-1 inlines deriveBookable, so a non-bookable listing is already excluded | TRUE | `src/lib/search/query.ts:205-210` — the `KEEP IN SYNC (Pitfall 5)` comment plus the four SQL terms. **Exactly one inlined twin exists** in `src/` (grep for `email_verified = true` returns only this file) |
| The calendar enables selection only when `bookable` | TRUE | `availability-calendar.tsx:100` prop → `:171` (open fork) and `:282` `disabled={!bookable}` → `slot-picker.tsx:160`. **Caveat: this is covered ONLY by Playwright (`e2e/availability.spec.ts:271`), never by the vitest suite.** Task 3 fixes that |
| `listing-card.tsx:84` already renders `Published · not bookable` | TRUE | verbatim at that line |
| `placeHold` re-derives bookability server-side | TRUE, **but there are TWO such sites, not one** | `booking.ts:184-192` (placeHold) and `booking.ts:421-429` (placeOpenHold). Both must gain the term, and — because the second is a deliberate re-statement rather than a shared helper — **both must be tested independently**. See the security note below |

## Call-site census — every `deriveBookable(` in `src/`, with the cost of its new argument

There are exactly four. All four construct a **fresh object literal**, so adding a required field makes
every one of them a compile error — the enumeration is done by the compiler, not by grep.

| # | Site | Where `hasOperatingHours` comes from | Added cost |
|---|---|---|---|
| 1 | `src/app/listings/[id]/page.tsx:118` | `listingHasOperatingHours(db, id)` added as a fourth promise to the **existing** `Promise.all` at `:126`, with the derive moved just below it | **zero added latency** — it rides an existing concurrent batch. `bookable` is first read at `:328`, so moving the derive down is safe |
| 2 | `src/app/actions/booking.ts:186` (placeHold) | a correlated `EXISTS` column folded into the **existing** bookability `SELECT` at `:158-183` | **zero extra round trips** |
| 3 | `src/app/actions/booking.ts:423` (placeOpenHold) | the same, folded into the select at `:410-420` | **zero extra round trips** |
| 4 | `src/app/(host)/host/listings/page.tsx:114` | `!missingHours.has(r.id)` — the `Set` iu7 already builds at `:71-73` from ONE grouped `NOT EXISTS` | **free** |

There is no N+1 anywhere: site 4 reuses iu7's grouped read, sites 2/3 add a subquery to a query that was
already being run, and site 1 joins an existing `Promise.all`.

**Soundness note for site 4, which must be written into the code as a comment.** `missingHours` holds only
PUBLISHED listings (that is iu7's predicate), so for a draft or unlisted row `!has(id)` reports
`hasOperatingHours: true` even when the calendar is empty. This is sound *only* because `deriveBookable`
ANDs the status term, which is already false for those rows. Task 1 pins that reasoning with truth-table
rows `draft × hasOperatingHours=true → false`, so nobody can later "simplify" the AND and silently make
the host grid lie.

**SECURITY NOTE for site 3, and the reason it gets its own test rather than inheriting site 2's.**
`placeOpenHold`'s gate block is written *"deliberately by RE-STATEMENT rather than extraction"*
(`booking.ts:351-354`) — it is independently duplicated code, on the money path. A typo, a wrong table
alias, a wrong field name, or a missing `=== true` coercion in that duplicate would compile, pass `tsc`,
pass the exclusive-path anchor, and pass the full suite, while leaving a real drop-in booking hole open.
An untested duplicate of a security check is worse than no duplicate, because it reads as covered. Task 1
therefore ships **two** refusal anchors — `L_nohours` (exclusive) and `L_OPEN_NOHOURS` (open capacity) —
and Task 3's M1 predicts RED in both.

Test-side direct callers (pure calls, compiler-forced): `tests/listing/bookability.test.ts` and
`tests/paymongo/webhook-merchant-activated.test.ts:127,:139,:179`.

## Consequences, decided up front

1. **Currently-published listings with no hours drop out of search and become non-bookable.** Intended,
   and identical in kind to the three exclusions that already exist. **The seed is clean — VERIFIED, not
   assumed:** `scripts/seed.ts:100-105` inserts all 7 weekdays of hours for every one of the five
   `seed_listing_*` rows, so `npm run db:seed` cannot produce an hours-less listing and nothing vanishes
   from local search. `uat_listing_*` exists only as hand-run SQL inside Phase 5/7/8 UAT docs, never in
   `db:seed` — out of scope, and no seed fix is warranted.
2. **A host deleting their last hours row silently un-sells the listing.** Correct, and the iu7 signal
   already surfaces it: `loadPublishedListingsMissingHours` keys on published + `NOT EXISTS` hours, so the
   listing names itself on `/host/listings` and `/host` the moment the row goes. The signal's own sentence
   — *"every date on this listing shows as closed and no one can book it"* — becomes literally true rather
   than merely descriptive, so **no copy changes**. Task 1 pins the revert as a truth-table case.
3. **In-flight bookings are unaffected.** VERIFIED via the census: bookability is derived at exactly four
   places, all of them entry points (page render, two hold mutations, host grid). Nothing in
   `confirmBooking`, the webhook, cancellation, or payout re-derives it for an existing row.
4. **Draft / unlisted are unaffected** — the status term already returns false. Covered by 8 of the 16
   truth-table rows.

## Fixture blast radius — the real cost, enumerated so the executor is not hunting

Adding a fourth gate term breaks every test fixture that expects a published listing to be sellable but
never seeded hours. **Four files need REPAIR, verified by reading them:**

| File | Helper to fix | Why it breaks |
|---|---|---|
| `tests/booking/state-machine.test.ts` | `seedBookableListing` (`:92`) — L_happy, L_idem, L_exp, L_own | header `:80-81` says outright *"this file seeds no operating_hours"*; every placeHold case would return `not-bookable` |
| `tests/booking/notify-emission.test.ts` | `seedListing` (`:148`) | same, stated at `:531-532` |
| `tests/booking/request-lifecycle.test.ts` | `seedModedListing` (`:481`) only — L_af_request / L_af_instant / L_af_flip / L_af_approved | these reach `placeHold`. **Do NOT touch `makeListing` (`:171`)** — family-A cases call `addMondayHours` (`:184`) which uses id `oh_${listingId}`, so seeding there would duplicate-key |
| `tests/search/bookable-gate.test.ts` | `makeListing` (`:33`) — the `gate_pub` control | the control listing has no hours and would stop being returned |

**Verified to need NO repair** (they already seed hours for every listing that reaches a gated action):
`tests/booking/open-capacity-hold.test.ts`, `tests/booking/open-capacity-replay.test.ts` (its `L_EXCL` is
driven through `createPendingHold` directly, which has no bookability gate),
`tests/listing/open-capacity-edit-gate.test.ts`, `tests/availability/*`, `tests/search/{radius,filters,
availability-filter,open-capacity-search}.test.ts`.

`open-capacity-hold.test.ts` needs no *repair*, but it is where the new open-path **anchor** lands
(Task 1(c2)) — it is the only file that already owns the whole `placeOpenHold` harness.

Task 2's full-suite run is the backstop for anything this census missed. The rule to apply: *any published
fixture that reaches `placeHold`, `placeOpenHold`, or `searchListings` now needs at least one
`operating_hours` row.*

## Documents that become FALSE and must be corrected in the same change

- `src/lib/listing/hours-signal.ts:8-19` — the header states *"SO THIS IS A SIGNAL, DELIBERATELY NOT A
  GATE"* and *"`deriveBookable` … stays BYTE-UNCHANGED"*. Both stop being true here.
- `src/components/listing/listing-card.tsx:151-159` — the `hoursMissing` prop's JSDoc carries the
  identical claim: *"It changes NOTHING about bookability or the badge: a listing with no hours still
  reads 'Live' if it is otherwise bookable … That is the decided behaviour (this is a signal, not a
  gate)."* **Behaviour here is unaffected** — the badge reads `bookable`, which is computed upstream — so
  this is a stale comment, not a defect. But correcting its test while leaving the component it describes
  is not acceptable.
- `tests/listing/hours-signal.test.ts:5` — same claim, one line.
- `tests/listing/listing-card.test.tsx:155-172` — renders `<ListingCard bookable hoursMissing />` and
  asserts the badge still reads `Live`. That combination is now **unreachable in production**: a listing
  with no hours can never be bookable. The case must be re-pointed at the state the app can actually
  produce (`bookable={false} hoursMissing` → `Published · not bookable` + the notice), or it becomes a
  test of an impossible state.

## Why a parameter and not a query — the constraint that must not break

`deriveBookable` is PURE ("no DB, no I/O"), which is what lets the truth table drive it, and it has an
INLINED SQL TWIN. So the hours term arrives as **input**, never as a lookup. Two payoffs, both worth
stating in the module header: purity survives, and the compiler forces every call site to answer the
question.

**The anti-desync device replaces the retired byte-unchanged gate.** Prior tasks pinned
`bookability.ts` and `search/query.ts` with `git diff --exit-code`. Both must change now, so that gate is
gone and something stronger takes its place: `tests/search/bookable-gate.test.ts` **imports
`deriveBookable` itself** and asserts that the set of ids the SQL returns equals the set the TypeScript
predicate accepts, over the same fixtures. Drift in either direction fails the test. A grep gate backs it
up structurally.
</decision_record>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/quick/260801-iu7-signal-on-host-surfaces-when-a-published/260801-iu7-SUMMARY.md

@src/lib/bookability.ts
@src/lib/listing/hours-signal.ts

Read only the ranges named in each task's `<files>` for the rest — they are large files.
</context>

<constraints>
- **NO schema change, NO migration.** `operating_hours` already exists. `drizzle/` must still end at
  `0024_audit_table.sql` after this work.
- **No new npm dependency.**
- `publishListing` / `publishSchema` / `src/lib/validation/listing.ts` are **byte-unchanged**.
- The three `HOURS_MISSING_*` copy constants are **byte-unchanged** — the sentence is already correct.
- `deriveBookable` stays PURE: no `await`, no import of `db`, no I/O.
- **`placeHold` and `placeOpenHold` stay separate by RE-STATEMENT.** Do not "DRY up" the two gate blocks
  into a shared helper while adding the term — `booking.ts:351-354` records why the duplication is
  deliberate, and the two independent anchors in Task 1 are what make the duplication safe.
- Worktrees are OFF. Run sequentially on `dev`, main working tree.
- **Test running (rule CHANGED 2026-08-10 by quick task `260810-km4`):** run `npx vitest run <path>` bare
  with **no `DATABASE_URL` exported** — `tests/setup.ts` forces the suite onto a separate `fitout_test`
  database. If it is missing, provision with `npm run db:test:setup`. The old "never override
  DATABASE_URL" rule is retired.
- **Suite baseline: 1163 passed / 4 skipped / 0 failed.** The final count must be baseline + exactly the
  cases added here, with no pre-existing test moved.
</constraints>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write every assertion against UNCHANGED src, record the RED verbatim, and repair the four fixture files</name>
  <files>tests/listing/bookability.test.ts, tests/search/bookable-gate.test.ts, tests/booking/state-machine.test.ts, tests/booking/open-capacity-hold.test.ts, tests/booking/notify-emission.test.ts, tests/booking/request-lifecycle.test.ts</files>
  <behavior>
    - Truth table: `published × emailVerified × payoutsEnabled × hasOperatingHours=false` → `false` (currently returns `true` → RED)
    - Truth table: removing the last hours row with nothing else changed → `false` (currently `true` → RED)
    - Truth table: all 8 `draft × …` rows → `false`, including `draft × hasOperatingHours=true` (already green; pins site 4's soundness)
    - Search: a published, email-verified, payout-activated listing with ZERO `operating_hours` rows is ABSENT from a no-date browse search (currently present → RED)
    - Search: the control `gate_pub`, now WITH hours, is still present (green, and it proves the new EXISTS is not a blanket exclusion)
    - placeHold (EXCLUSIVE): a fully-payable published listing with ZERO hours is refused `{ ok: false, reason: "not-bookable" }` and mints no booking row (currently redirects → RED)
    - placeOpenHold (OPEN CAPACITY): an otherwise fully-claimable `open_capacity` listing with ZERO hours is refused `{ ok: false, reason: "not-bookable" }` and mints no booking row (currently mints a hold → RED)
  </behavior>
  <action>
This is CONFIRM-THEN-FIX branch A. Write the assertions FIRST, against byte-unchanged `src/`, run them,
and record the observed failures **verbatim** (exact `AssertionError` text and line) in the header of each
test file. Do not touch `src/` in this task.

**Expected and correct:** `npx tsc --noEmit` FAILS at the end of this task, on the new test lines only —
TypeScript's excess-property check rejects `hasOperatingHours` in an object literal passed to the current
three-term signature. Vitest transpiles without type-checking, so the tests still RUN, and at runtime the
extra property is ignored, which is exactly what produces the RED. Do not "fix" this; Task 2 clears it.

**(a) `tests/listing/bookability.test.ts` — give the truth table its fourth dimension.**
Widen the `rows` array from 8 to **16**, adding `hasOperatingHours: boolean` to the row type and to the
`deriveBookable` listing argument. Keep the existing shape: one `it` per row, the `expected` value spelled
out per row rather than computed. Update the `it` title template to name the fourth input. Update the
meta-assertion to "is bookable in EXACTLY one of the 16 rows" and extend its `toMatchObject` with
`hasOperatingHours: true`. Add `hasOperatingHours: true` to the `unlisted` case and to both calls in the
D-14 auto-revert case (that case must keep measuring payouts, not hours).

Add ONE new case beside the D-14 one, phrased as its sibling:
`"un-sells the moment the host deletes their LAST hours row, with nothing else changed (consequence 2)"` —
derive `true` with `hasOperatingHours: true`, then `false` with `{ ...listing, hasOperatingHours: false }`.

Rewrite the file header to state the four terms and to record why the fourth is a PARAMETER (purity +
compiler-forced call-site enumeration), and to name the SQL twin as the thing the search test now pins.

**(b) `tests/search/bookable-gate.test.ts` — the real-DB exclusion and the drift guard.**
- Add an `hours: boolean` parameter to the local `makeListing` helper; when true, insert 7
  `operatingHours` rows (`id: \`${id}_oh_${dow}\``, `dayOfWeek: dow`, `06:00:00`–`21:00:00`). Import
  `operatingHours` from `@/lib/db/schema`.
- Give `gate_pub`, `gate_draft`, `gate_unverified`, `gate_nopayout` and `gate_deleted` hours (they must
  each keep failing for their OWN single reason — that is the point of the file).
- Add fixture **`gate_nohours`**: published, host `gate_host_ok` (verified + payouts on), **no hours**.
- Add the named case:
  `it("a published, fully-payable listing with ZERO operating_hours rows is absent from a no-date browse search")`
  asserting `expect(ids).not.toContain("gate_nohours")`. **This is the RED anchor for the SQL half.**
- Add the **parity / drift guard**. Declare a `FIXTURES` table carrying, per id, the four
  `deriveBookable` inputs, then assert set equality:

  `expect(new Set(ids)).toEqual(new Set(FIXTURES.filter(f => deriveBookable({ status: f.status, hasOperatingHours: f.hasOperatingHours }, { emailVerified: f.emailVerified, payoutsEnabled: f.payoutsEnabled })).map(f => f.id)))`

  plus a separate `expect(ids).not.toContain("gate_deleted")` — soft-delete is a SQL-only term that
  `deriveBookable` deliberately does not model, so it stays outside the parity table and is asserted on
  its own. Import `deriveBookable` from `@/lib/bookability`.

  **Be honest about what this assertion measures.** Against unchanged `src/` it passes VACUOUSLY (both
  sides ignore the hours field), so it is NOT a Task-1 RED anchor — it is the standing drift guard, and it
  is measured by mutation M2 in Task 3. Write that sentence into the file header.

**(c1) The EXCLUSIVE server-side refusal — `tests/booking/state-machine.test.ts`.**
- Add 7 weekdays of `operatingHours` (`06:00:00`–`22:00:00`) inside `seedBookableListing` so L_happy,
  L_idem, L_exp and L_own stay sellable. Import `operatingHours` from `@/lib/db/schema`. Delete the now-
  false clause *"this file seeds no operating_hours and the write path does not consult them"* from the
  `W` comment at `:80-81` and replace it with: the write path still does not consult hours, but the
  bookability GATE now does.
- Seed a new listing `L_nohours`: identical to a `seedBookableListing` row (published, same verified +
  payout-activated HOST) but with **zero** hours rows.
- Add to the `placeHold — capability + bookability gate` describe:
  `it("a published, fully-payable listing with NO operating hours is refused server-side — the CTA is not the gate")`
  asserting `{ ok: false, reason: "not-bookable" }` and, exactly as the neighbouring L_draft case does,
  `SELECT count(*) FROM booking WHERE listing_id = 'L_nohours'` is `0`. **This is the RED anchor for the
  exclusive security half.**

**(c2) The OPEN-CAPACITY server-side refusal — `tests/booking/open-capacity-hold.test.ts`.**
This is a SEPARATE anchor, not an inference from (c1): `placeOpenHold`'s gate block is a deliberate
re-statement (`booking.ts:351-354`), so it is independently duplicated code on the money path and needs
independently observed behaviour. This file is the cheapest home — it already owns the whole harness
(`placeOpenHold` imported at `:547`, the verified + payout-activated `hostId`, `ymd()`, `dowOf()`, and the
`rowsOn(listingId, date)` row counter used by cases 3 and 4a).

- Add a fixture `L_OPEN_NOHOURS` to the existing listing-insert array (~`:290-338`): published,
  `occupancyMode: "open_capacity"`, `bookingMode: "instant"`, same `hostId`, and — following the file's
  own **DELIBERATELY ADVERSARIAL** idiom — a real `maxOccupancy` and `perHeadPriceCents` so the claim
  would genuinely succeed if the gate were absent. A fixture that fails closed on a NULL cap would pass
  for the wrong reason. Give it **zero** `operating_hours` rows (i.e. do not add it to the hours insert
  block at `:340-363`), and say so in a comment right there, because every other listing in that block
  deliberately has hours.
- Add the case, beside the existing gate cases:
  `it("a published, payout-activated DROP-IN listing with NO operating hours is refused by placeOpenHold's OWN re-stated gate")`
  asserting `expect(res).toEqual({ ok: false, reason: "not-bookable", error: "This space isn't accepting bookings right now." })`
  and — the assertion that matters, mirroring case 4a's note at `:474-476` — `expect(await rowsOn(L_OPEN_NOHOURS, ymd(<a date>))).toBe(0)`.
  Assert the ROW ABSENCE, not just the return value: a copy check alone would pass even if the refusal
  ran after the claim.
- Write into the case's comment WHY it duplicates `state-machine.test.ts`'s intent rather than trusting
  it: an untested duplicate of a security check reads as covered while being able to drift silently.
- Note the gate ORDER while you are there — `placeOpenHold`'s docblock (`:356-368`) puts BOOKABILITY at
  step 5, ahead of the occupancy-mode refusal at step 6 and the claim at step 7 — so this case must come
  back `not-bookable`, never `invalid`. If it returns `invalid`, the term went into the wrong gate.
  **This is the RED anchor for the open-capacity security half.**

**(d) Inert fixture repair — the remaining two files.** Add hours so pre-existing green cases stay green:
- `tests/booking/notify-emission.test.ts`: 7 weekday rows inside `seedListing` (`:148`), ids
  `oh_ne_${id}_${dow}`.
- `tests/booking/request-lifecycle.test.ts`: 7 weekday rows inside **`seedModedListing` only** (`:481`),
  ids `oh_af_${id}_${dow}`. **Leave `makeListing` (`:171`) alone** — `addMondayHours` (`:184`) already
  writes `oh_${listingId}` for the family-A cases and would collide on the primary key.
Both are inert against unchanged `src/` (neither `placeHold` nor `createPendingHold` reads hours on the
write path), so they must not move any result in this task. Confirm that.

Commit as `test(quick-260810-sti) …` with the RED recorded in the message.
  </action>
  <verify>
    <automated>npx vitest run tests/listing/bookability.test.ts 2>&1 | tail -30</automated>
    <automated>npx vitest run tests/search/bookable-gate.test.ts 2>&1 | tail -30</automated>
    <automated>npx vitest run tests/booking/state-machine.test.ts tests/booking/open-capacity-hold.test.ts 2>&1 | tail -40</automated>
    <automated>npx vitest run tests/booking/notify-emission.test.ts tests/booking/request-lifecycle.test.ts 2>&1 | tail -30</automated>
    <automated>git diff --exit-code src/</automated>
  </verify>
  <done>
Exactly five cases are RED, each for the stated reason, with the observed failure text pasted verbatim
into the headers of `bookability.test.ts`, `bookable-gate.test.ts`, `state-machine.test.ts` and
`open-capacity-hold.test.ts`: two in the truth table, one in the search gate, one in `placeHold`, and one
in `placeOpenHold`. The two refusal anchors failed for the same reason on two independently written code
paths — if the open-path case came back `invalid` rather than a redirect/`not-bookable`, the fixture is
wrong (wrong occupancy mode) and must be fixed before proceeding. Every other case in those six files is
GREEN — in particular the notify-emission and request-lifecycle fixture repairs moved nothing.
`git diff --exit-code src/` is clean: not one line of `src/` changed in this task.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add the fourth term to the predicate, its SQL twin and all four call sites — in ONE commit so they cannot desync</name>
  <files>src/lib/bookability.ts, src/lib/search/query.ts, src/lib/listing/hours-signal.ts, src/app/listings/[id]/page.tsx, src/app/actions/booking.ts, src/app/(host)/host/listings/page.tsx, src/components/listing/listing-card.tsx, tests/paymongo/webhook-merchant-activated.test.ts, tests/listing/listing-card.test.tsx, tests/listing/hours-signal.test.ts</files>
  <action>
Everything here lands together. The TypeScript predicate and its inlined SQL twin must never exist in the
tree in a desynced state, so `bookability.ts` and `search/query.ts` are in the SAME commit.

**(a) `src/lib/bookability.ts`.** Add `hasOperatingHours: boolean` to the **listing** parameter object
(not a third positional argument): hours are a fact about the listing, matching the existing
listing-facts / host-facts split, and a fresh object literal at every call site means the compiler flags
each one.

```
listing: { status: "draft" | "published" | "unlisted"; hasOperatingHours: boolean }
```

Return `listing.status === "published" && listing.hasOperatingHours && host.emailVerified && host.payoutsEnabled`.
Update the JSDoc to name four terms. Extend the module header with a short block recording: (i) the
operator's decision that this is a derivation and not a publish gate, and the three reasons from
`<decision_record>`; (ii) that the term is a PARAMETER so the function stays pure and the compiler
enumerates the call sites; (iii) that `search/query.ts` carries the SQL twin and
`tests/search/bookable-gate.test.ts` now asserts set-equality between the two — naming that test as the
replacement for the retired byte-unchanged gate; (iv) that the predicate has **two** server-side
re-derivation sites in `booking.ts`, written by re-statement, each with its own refusal anchor.

**(b) `src/lib/search/query.ts` — the SQL twin.** Inside the inlined-deriveBookable block (`:205-210`),
directly under the `payouts_enabled` line, add the **unconditional** term:

`AND EXISTS (SELECT 1 FROM operating_hours oh_any WHERE oh_any.listing_id = l.id)`

Use the alias `oh_any` so it is textually distinct from the date-specific subquery below and greppable.
Update the `KEEP IN SYNC (Pitfall 5)` comment to spell out all four conditions. **Leave the existing
`${picked ? … }` per-day EXISTS at `:217-218` exactly as it is** — and add one sentence saying why the two
coexist: the new one is the SELL GATE (does this listing have a calendar at all), the old one is a
per-request FILTER (is it open on the day the booker picked). Note in the same comment that the old term's
conditionality is precisely why a no-hours listing survived the default browse view until now.

**(c) `src/lib/listing/hours-signal.ts`.** Add one export beside `loadPublishedListingsMissingHours`,
built the same way (indexed by `operating_hours_listing_idx`, short-circuits on the first row):

```
export async function listingHasOperatingHours(dbConn: DbConn, listingId: string): Promise<boolean>
```
— `select({ one: sql`1` }).from(operatingHours).where(eq(operatingHours.listingId, listingId)).limit(1)`,
returning `rows.length > 0`. Unlike its neighbour this one takes a listing id, so document that it is
called only with an id the caller has already resolved server-side, and that it reads nothing owner-scoped
(hours existence is not private — it is already visible to any booker as a calendar full of Closed days).

Then **rewrite the module header lines 8-19**. The "SIGNAL, DELIBERATELY NOT A GATE" framing and the
"`deriveBookable` stays BYTE-UNCHANGED" claim are now false. Replace with: iu7 shipped the signal; this
task shipped the gate; the two are complementary — the gate stops the sale, the signal tells the host why
and how to fix it. Keep the `status = 'published'` rationale and the copy-location rationale (both still
true), and keep the NON-CLIENT MODULE warning verbatim.

**(d) The four call sites** (see the census table in `<decision_record>` for the source of each value):

1. `src/app/listings/[id]/page.tsx` — add `listingHasOperatingHours(db, id)` as a fourth element of the
   existing `Promise.all` at `:126`, destructuring `hasOperatingHours`, and MOVE the `deriveBookable`
   call (`:117-124`) to immediately after that block, passing `{ status: row.listing.status,
   hasOperatingHours }`. `bookable` is not read until `:328`, so this is safe. Add a comment noting the
   read costs no extra latency because it rides an existing concurrent batch.
2. `src/app/actions/booking.ts` placeHold (`:158-192`) — add to the existing select:
   `hasOperatingHours: sql<boolean>\`EXISTS (SELECT 1 FROM operating_hours oh WHERE oh.listing_id = ${listing.id})\``
   (`sql` is already imported at `:28`). Pass `hasOperatingHours: lr.hasOperatingHours === true` into the
   derive — the explicit `=== true` keeps a driver-shape surprise from reading as truthy. Extend the
   `(4)` comment to name the fourth condition and keep the `Keep this join in sync with bookability.ts
   (Pitfall 5)` note.
3. `src/app/actions/booking.ts` placeOpenHold (`:410-429`) — the identical change, by RE-STATEMENT rather
   than extraction, exactly as that function's docblock at `:351-354` requires. **Do not refactor the two
   into a shared helper.** Update gate 5's line in the numbered docblock (`:363`) to say the join now
   carries the hours term, and name `open-capacity-hold.test.ts`'s `L_OPEN_NOHOURS` case as the anchor
   that keeps this duplicate honest.
4. `src/app/(host)/host/listings/page.tsx:114` — `hasOperatingHours: !missingHours.has(r.id)`. Add the
   soundness comment from `<decision_record>` verbatim in substance: the `Set` contains PUBLISHED listings
   only, so this reports `true` for a hours-less draft, which is sound only because the status term is
   already false — and the truth table pins that.

**(e) Stale-document and compiler-forced updates.**
- `src/components/listing/listing-card.tsx:151-159` — rewrite the `hoursMissing` JSDoc. Keep the first
  paragraph (derived upstream in one grouped query, the card never asks the DB). Replace the second: a
  listing with no hours is no longer bookable, so the badge it sits under now reads
  `Published · not bookable` and the notice explains why. The card's own behaviour is UNCHANGED — it
  still renders whatever `bookable` it is handed and re-derives nothing — and say that explicitly so the
  next reader does not go looking for a behavioural change that is not there.
- `tests/paymongo/webhook-merchant-activated.test.ts:127,:139,:179` — add `hasOperatingHours: true` to
  each listing literal. Those cases measure the payout flip; keeping hours true keeps them about payouts.
- `tests/listing/listing-card.test.tsx:155-172` — re-point the case at the reachable state: render
  `bookable={false} hoursMissing`, assert the notice IS present and the badge now reads
  `Published · not bookable`. Replace the comment *"this listing is still Live"* with a note that
  `bookable && hoursMissing` became unreachable in production when hours joined the sell-gate.
- `tests/listing/hours-signal.test.ts:5` — correct the one-line "signal, not a gate" claim in the header.

Commit as `feat(quick-260810-sti) …`, one commit for the whole predicate + twin + call sites.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>npx vitest run tests/listing/bookability.test.ts tests/search/bookable-gate.test.ts tests/booking/state-machine.test.ts tests/booking/open-capacity-hold.test.ts 2>&1 | tail -25</automated>
    <automated>npx vitest run 2>&1 | tail -25</automated>
    <automated>test $(grep -v '^\s*--' src/lib/search/query.ts | grep -c 'operating_hours oh_any') -eq 1</automated>
    <automated>test $(grep -c 'EXISTS (SELECT 1 FROM operating_hours' src/app/actions/booking.ts) -eq 2</automated>
    <automated>test $(grep -rn 'hasOperatingHours: true' src/ | grep -c '') -eq 0</automated>
    <automated>test "$(ls drizzle/*.sql | tail -1)" = "drizzle/0024_audit_table.sql"</automated>
    <automated>git diff --exit-code src/lib/validation/listing.ts src/app/actions/listing.ts</automated>
  </verify>
  <done>
`tsc --noEmit` exits 0. All five Task-1 RED cases are GREEN, including BOTH refusal anchors. The EXISTS
subquery appears exactly twice in `booking.ts` — once per re-stated gate — and no shared helper was
introduced. The FULL suite is **1163 + (exactly the cases added in Task 1) passed / 4 skipped / 0
failed**, with no pre-existing test moved — if anything else went red it is an unlisted hours-less fixture
and it gets hours, and the SUMMARY records which. The unconditional `oh_any` EXISTS appears exactly once
outside comments; no call site hardcodes `hasOperatingHours: true` in `src/`; `drizzle/` still ends at
`0024_audit_table.sql`; `publishListing` and the validation schema are byte-unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 3: Prove the booker sees a read-only preview and not a dead end, then measure all three assertions by mutation</name>
  <files>tests/availability/availability-calendar.test.tsx</files>
  <action>
**(a) The read-only proof.** Create `tests/availability/availability-calendar.test.tsx` (new file,
`// @vitest-environment jsdom` on line 1), following the established idiom in
`tests/availability/date-pass-picker.test.tsx:1-51`: `vi.mock("next/navigation", …)` and
`vi.mock("@/app/actions/availability", …)` so the server-action module graph never loads under jsdom.

Render `AvailabilityCalendar` with `occupancyMode="exclusive"`, a supplied `initialDay` carrying at least
one `state: "available"` slot and one occupied slot, and never change the date — so the mocked
`getDayAvailability` is never called. Wrap in `BookingSelectionProvider`, and render a tiny probe child
that reads `useBookingSelection()` and prints the current selection into the DOM, so selection is observed
behaviourally rather than through Radix internals.

Two cases, a measured pair:

1. `bookable={false}` — the AVAILABLE slot chip is still IN THE DOCUMENT (this is the whole point: a
   preview of the real availability, not an empty panel and not a dead end), AND clicking it leaves the
   probe reading "no selection".
2. `bookable={true}` — the same chip renders and clicking it DOES produce a selection.

Assert the click behaviour as the primary signal and the `disabled` / `aria-disabled` attribute only as a
secondary check; the behavioural form survives a Radix internals change, the attribute form does not.

Write into the header that this file exists because the "non-bookable ⇒ read-only preview" rule was
previously covered ONLY by Playwright (`e2e/availability.spec.ts:271`), never by the vitest suite, and
that this quick task is what made that state reachable for a brand-new reason (no hours). Also record,
honestly, that this is a REACHABILITY proof rather than a RED anchor — it characterises behaviour that
already existed — and that mutation M3 below is what measures it.

**(b) Mutation measurement — house anti-vacuity standard.** Apply each mutation to `src/`, run the named
tests, paste the observed failure output **verbatim** (message + file + line) into the header of the test
file that owns the assertion, then revert by editing the statement back. Report OBSERVED results, not
predicted ones — if a mutation kills more or fewer cases than predicted, say so plainly.

| # | Mutation | Predicted RED |
|---|---|---|
| M1 | `src/lib/bookability.ts` — delete `&& listing.hasOperatingHours` from the return | `bookability.test.ts`: the `published × true × true × false` row and the last-hours-row-removed case; `state-machine.test.ts`: the `L_nohours` refusal; **`open-capacity-hold.test.ts`: the `L_OPEN_NOHOURS` refusal** |
| M2 | `src/lib/search/query.ts` — re-wrap the new EXISTS as `${picked ? sql\`…\` : sql\`\`}` (its exact pre-task conditional form) | `bookable-gate.test.ts`: the `gate_nohours` exclusion case AND the parity set-equality — M2 is what proves the drift guard has teeth, since it passed vacuously in Task 1 |
| M3 | `src/components/availability/availability-calendar.tsx` — `disabled={!bookable}` → `disabled={false}` | the new calendar case 1 (click on a non-bookable listing now produces a selection) |

**M1 carries a finding condition, not just a prediction.** Both refusal anchors must go RED under a single
deletion in `bookability.ts`. If `L_OPEN_NOHOURS` stays GREEN while `L_nohours` goes red, that is itself
the result to report: `placeOpenHold`'s re-stated clause is not wired to the same predicate — it is
refusing for some other reason — and that must be fixed and re-measured before the task is done, not
written off as a passing test.

After all three are reverted, `git diff --exit-code src/` must be clean.

**(c) Final gates**, in this order: `npx tsc --noEmit`; `npx eslint` on every touched source file plus the
new test; `npx vitest run` full suite.

Commit as `test(quick-260810-sti) …` with the three mutation results in the message.
  </action>
  <verify>
    <automated>npx vitest run tests/availability/availability-calendar.test.tsx 2>&1 | tail -25</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>npx eslint src/lib/bookability.ts src/lib/search/query.ts src/lib/listing/hours-signal.ts "src/app/listings/[id]/page.tsx" src/app/actions/booking.ts "src/app/(host)/host/listings/page.tsx" src/components/listing/listing-card.tsx tests/availability/availability-calendar.test.tsx</automated>
    <automated>npx vitest run 2>&1 | tail -20</automated>
    <automated>git diff --exit-code src/</automated>
  </verify>
  <done>
The new calendar file is GREEN on both cases. All three mutations were applied, observed, recorded
verbatim in the owning test headers, and reverted — with any divergence from the prediction reported as
observed rather than smoothed over. M1 reddened BOTH refusal anchors from a single deletion, proving the
two re-stated gates share one predicate; if it did not, that was treated as a defect and fixed rather than
accepted. `tsc --noEmit` exits 0, eslint reports no new errors or warnings, the full suite is at the
Task-2 count with the two calendar cases added, and `git diff --exit-code src/` is clean after the last
revert.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|---|---|
| booker → `placeHold` / `placeOpenHold` | an untrusted caller names a `listingId`; the reserve route group is NOT the gate (Security V4) |
| booker → search params | untrusted filters reach Stage-1 SQL |
| host → `operating_hours` rows | a host's own edits change what is sellable, with no listing write |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-STI-01 | Elevation of privilege | `placeHold` (exclusive path) | mitigate | Re-derives the FOUR-term gate server-side from the listing row; a booker who reaches `/listings/{id}/book` by hand-typing the URL on an hours-less listing is refused `not-bookable` and no row is minted. Pinned by the `L_nohours` case in `state-machine.test.ts` (return value AND row count) and measured by M1 |
| T-STI-02 | Elevation of privilege | `placeOpenHold` (drop-in path) — a deliberate RE-STATEMENT of T-STI-01's clause (`booking.ts:351-354`), i.e. independently duplicated security code on the money path | mitigate | Gets its OWN anchor, never inherited from T-STI-01: `L_OPEN_NOHOURS` in `open-capacity-hold.test.ts` — a published, payout-activated, otherwise-fully-claimable `open_capacity` listing with zero hours must return `not-bookable` (not `invalid`, since bookability is gate 5 and occupancy is gate 6) and mint no row. Measured by M1, which must redden BOTH anchors from one deletion; if it reddens only one, the duplicate is not wired to the same predicate and that is a defect to fix, not a pass. A typo or wrong alias in this duplicate would otherwise compile, pass `tsc` and pass the whole suite while leaving a real drop-in booking hole |
| T-STI-03 | Tampering | the TS predicate vs. its inlined SQL twin | mitigate | The byte-unchanged gate that protected Pitfall 5 is retired because both files must change. Replaced by a set-equality assertion in `tests/search/bookable-gate.test.ts` that imports `deriveBookable` and compares it to the SQL result over shared fixtures, plus a grep gate that the unconditional `oh_any` EXISTS is present exactly once outside comments. Measured by M2 |
| T-STI-04 | Information disclosure | `listingHasOperatingHours(dbConn, listingId)` — a NON-owner-scoped read, unlike its neighbour | accept | It answers only "does this listing have a calendar", a fact already public to any booker (an hours-less listing renders every date Closed). It is called with an id the page has already resolved and 404-gated at `:113`, so it cannot confirm the existence of a draft, unlisted or soft-deleted listing |
| T-STI-05 | Denial of service | the new reads on hot paths | mitigate | Zero added round trips on three of four call sites (folded into existing queries / an existing `Promise.all`), and free on the fourth (reuses iu7's grouped `Set`). Every read is a short-circuiting `EXISTS` on `operating_hours_listing_idx` (`schema.ts:677`). No per-card query is introduced anywhere |
| T-STI-06 | Repudiation | a host silently losing sales by deleting their last hours row | mitigate | Not silent: `loadPublishedListingsMissingHours` fires on published + no hours, so `/host/listings` and `/host` both name the listing, state the reason and link to the availability editor the moment the row goes |
| T-STI-SC | Tampering | npm/pip/cargo installs | n/a | No package is installed by this plan |
</threat_model>

<verification>
1. `npx tsc --noEmit` → exit 0.
2. `npx vitest run` → 1163 + the cases added here passed / 4 skipped / **0 failed**, no pre-existing test moved.
3. `npx eslint` on all seven touched source files + the new test → no new errors or warnings.
4. `test "$(ls drizzle/*.sql | tail -1)" = "drizzle/0024_audit_table.sql"` → no migration was added.
5. `git diff --exit-code src/lib/validation/listing.ts src/app/actions/listing.ts` → publishing behaviour is byte-unchanged.
6. `grep -v '^\s*--' src/lib/search/query.ts | grep -c 'operating_hours oh_any'` → exactly `1`.
7. `grep -c 'EXISTS (SELECT 1 FROM operating_hours' src/app/actions/booking.ts` → exactly `2` — both re-stated gates carry the term, and neither was refactored away into a shared helper.
8. `grep -rn 'hasOperatingHours: true' src/ | grep -c ''` → `0`; no call site stubs the value.
9. `git diff --exit-code src/` clean after every mutation is reverted.
10. All three mutations recorded verbatim in the owning test headers, reported as observed — including whether M1 reddened both refusal anchors.
</verification>

<success_criteria>
- [ ] `deriveBookable` takes four terms, is still pure (no `await`, no `db` import), and the 16-row truth table has exactly one true row
- [ ] The inlined SQL twin carries the same four terms, with the hours EXISTS **unconditional**, and the per-day `picked` EXISTS untouched beside it
- [ ] A published, verified, payout-activated listing with zero hours is absent from a **no-date** browse search, proven against a real database
- [ ] `placeHold` refuses it server-side with `not-bookable`, minting no booking row
- [ ] `placeOpenHold` refuses the `open_capacity` equivalent with `not-bookable` (never `invalid`), minting no booking row — proven by its OWN case, and reddened by the same M1 deletion that reddens the exclusive one
- [ ] The two gate blocks remain separate by re-statement; no shared helper was introduced
- [ ] The booker still gets a read-only availability preview on that listing — proven in vitest, not only in Playwright
- [ ] Deleting the last hours row un-sells the listing, and the iu7 host signal names it
- [ ] Draft and unlisted listings are unaffected, and the host grid's reuse of the iu7 `Set` is pinned by truth-table rows rather than left as an unstated assumption
- [ ] The TS predicate and its SQL twin cannot drift without a test failing, and M2 proves that guard has teeth
- [ ] No schema change, no migration, no new dependency, `publishListing` byte-unchanged
- [ ] Every document that this change makes false — `hours-signal.ts`'s header, the `hoursMissing` JSDoc in `listing-card.tsx`, the hours-signal test header, and the listing-card "still Live" case — is corrected in the same change
</success_criteria>

<output>
Create `.planning/quick/260810-sti-make-operating-hours-part-of-the-bookabi/260810-sti-SUMMARY.md` when done.
</output>
</content>
