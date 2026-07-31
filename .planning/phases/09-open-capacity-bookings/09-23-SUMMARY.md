---
phase: 09-open-capacity-bookings
plan: 23
subsystem: booking
tags: [open-capacity, drop-in, cr-06, wr-01, idempotency, d-42, replay, mutation-testing, vitest]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings
    provides: "`findOwnOpenHold` and the claim it guards — `createOpenCapacityHold` (09-02), `placeOpenHold` (09-07), `BookCta`'s open branch (09-12), the reserve page's `status === 'confirmed'` redirect (09-13); the venue-local day range 09-18 installed in this same predicate, and the block/rate refusals 09-20 and 09-21 left in the claim's step 5"
  - phase: 04-booking-holds
    provides: "the D-42 own-hold idempotency contract, `findOwnActiveHold`, and the `booking_idem_uq` GLOBAL partial-unique index this plan had to work around"
provides:
  - "CR-06 CLOSED: `findOwnOpenHold`'s tokenless arm matches a LIVE `pending` hold and nothing else. A booker who bought and PAID for passes on a date can buy more for that date — a second booking row, not a silent redirect to the first."
  - "WR-01 CLOSED on BOTH paths: a client-supplied idempotency key can only ever return the supplying caller's own booking. Two halves — `AND booker_id = …` in both key arms, and a booker-namespaced STORED key (`scopedIdempotencyKey`) so the global unique index cannot collide across callers."
  - "T-09-80 held while doing it: the key arm is deliberately STATUS-AGNOSTIC, so an existing key always replays instead of falling through to the INSERT and escaping as a raw 23505/500."
  - "`scopedIdempotencyKey(bookerId, key)` — the one place a client key becomes a stored key, length-prefixed so the encoding is injective. Applied in BOTH `createPendingHold` and `createOpenCapacityHold`."
  - "`BookCta` mints a PER-SELECTION idempotency token (memo on listing + date + pass count) on the OPEN payload only; the exclusive payload is byte-untouched."
  - "tests/booking/open-capacity-replay.test.ts — a 7-case DB-backed gate that begins as the confirmation and ends as the guard, with 3 mutations recorded verbatim."
  - "tests/availability/date-pass-picker.test.tsx case 6b — the only measurement of the memo's dependency list, mutation-proven."
affects: [phase-verification, future-phases-touching-idempotency-or-the-open-claim]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When one `OR` predicate serves two different questions, give each ARM its own status filter rather than hoisting one clause over both. A single top-level filter forces the two questions to agree about liveness when they must not: 'is this the submit I already handled' is status-agnostic, 'is this a hold being re-entered' is emphatically not."
    - "Scoping a lookup predicate by owner is only half of scoping a GLOBAL unique key. The other half is the STORED value: narrowing the predicate alone converts an information disclosure into a unique-violation 500 for the next caller. Mutate the two halves SEPARATELY or you will not learn which one is load-bearing."
    - "A namespace encoding embedded in a unique key must be INJECTIVE, not merely prefixed. `${id}:${key}` collides for (u1, '2:x') and ('u1:2', x); `${id.length}:${id}:${key}` cannot."
    - "A client-side idempotency token's DEPENDENCY LIST is the entire design and needs its own test. Nothing else in the suite can tell a token that is stable-per-selection from one that is stable-per-mount."
    - "A payload asserted as an exact KEY SET is a deliberate tripwire: widening the payload SHOULD break it. Reconcile it by naming the new field and keeping the key-set form — never by loosening it to `toMatchObject` alone."

key-files:
  created:
    - tests/booking/open-capacity-replay.test.ts
  modified:
    - src/lib/availability/units.ts
    - src/components/booking/book-cta.tsx
    - tests/availability/date-pass-picker.test.tsx
    - .planning/phases/09-open-capacity-bookings/deferred-items.md

key-decisions:
  - "The KEY arm carries NO status filter, deliberately (the plan's `<design_decision>`, verified rather than assumed). `booking_idem_uq` is GLOBAL and partial on `idempotency_key IS NOT NULL`, so a key whose row exists can never be re-inserted; refusing to replay it guarantees a 23505 that `mapBookingError` re-throws as a raw 500 on the money path. Replaying a lapsed or cancelled row is honest — the reserve page renders `HoldExpiredState` for one — and strictly better."
  - "The TOKENLESS arm drops `status = 'confirmed'` entirely and keeps `status = 'pending' AND expires_at > now()`. On the open path a date IS the window, so a confirmed pass is not a hold being re-entered; on the exclusive path the same arm compares an exact `(starts_at, ends_at)` pair, which is why CR-06 never reached `findOwnActiveHold`."
  - "The STORED key is booker-namespaced (`scopedIdempotencyKey`), applied in BOTH claims. This is a DEVIATION from the plan's literal instruction and it is load-bearing, not defensive: MUTATION 2b proves that scoping the predicate WITHOUT it trades WR-01's disclosure for a 23505/500 on both the open and the exclusive claim — the exact T-09-80 failure the plan's own design decision exists to prevent."
  - "`findOwnActiveHold` is otherwise untouched: its status set (including the D-63 `requested`/`approved` states) and its exact-window match are correct for the exclusive path and out of scope. The deleted-lines grep for `requested','approved` prints 0."
  - "`BookCta`'s token is `${listingId}:${date}:${passes}:${crypto.randomUUID()}` memoized on those three. Composing the deps INTO the value rather than listing them as unused memo deps is what keeps `react-hooks/exhaustive-deps` at 0 new warnings, and it makes a token legible in a log."
  - "No token is sent on the exclusive payload. `placeHold`'s window match is already exact, and adding one is a change to a shipped path this plan has no confirmation for."
  - "Case 2 uses a DIFFERENT date for the second booker on purpose: it removes the own-window arm from the picture entirely, so the only predicate that can possibly match is the key arm — the clause WR-01 actually names."

patterns-established:
  - "Pattern: when a fix has two independent halves, run the plan's prescribed mutation FIRST and report it even when it comes back GREEN. MUTATION 2a (the plan's literal WR-01 mutation) could not go red, which is itself the finding that justified 2b and 2c."
  - "Pattern: a mutation whose output quotes calendar-shaped values cannot live in a file whose own tripwire forbids calendar literals. Record the assertion-bearing lines in the header, the full driver output in the SUMMARY, and say which lines were omitted and why."

requirements-completed: [OPEN-02]

# Metrics
duration: 41min
completed: 2026-08-01
---

# Phase 9 Plan 23: Replay Predicate (CR-06 + WR-01) Summary

**`findOwnOpenHold`'s single `WHERE` clause now answers its two questions separately — the tokenless arm
matches a LIVE `pending` hold and nothing else, so a booker who paid for two passes on Saturday can buy two
more; the key arm matches any status but only for its own caller, and the stored key is booker-namespaced so
scoping it cannot fall through the global unique index into a 500.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-08-01T19:15Z (03:15 Makati, 2 Aug)
- **Completed:** 2026-08-01T19:56Z (03:56 Makati, 2 Aug)
- **Tasks:** 2/2
- **Files modified:** 5 (1 created, 4 modified)
- **Commits:** `b92822e`, `722f242`

## Task 1 — the independent confirmation (`b92822e`)

**This plan was CONFIRM-THEN-FIX, and both defects arrived "reported, NOT independently verified". Both were
written as failing assertions FIRST, against unchanged `src/`, and BOTH PROVED REAL.**

`tests/booking/open-capacity-replay.test.ts` was created and run with `git status --short -- src/` empty.
Observed, **VERBATIM AND COMPLETE** (the header keeps everything except the two Better Auth stderr warnings
and the ISO-timestamped log prefixes, which the file's own clock-relative tripwire forbids):

```
 RUN  v4.1.8 C:/Users/Admin/Roaming/FitOut

stdout | tests/booking/open-capacity-replay.test.ts
◇ injected env (10) from .env.local // tip: ⌘ custom filepath { path: '/custom/path/.env' }
◇ injected env (0) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }

stderr | tests/booking/open-capacity-replay.test.ts
2026-07-31T19:20:34.314Z WARN [Better Auth]: Social provider google is missing clientId or clientSecret

stderr | tests/booking/open-capacity-replay.test.ts
2026-07-31T19:20:34.915Z WARN [Better Auth]: Social provider google is missing clientId or clientSecret

 ❯ tests/booking/open-capacity-replay.test.ts (2 tests | 2 failed) 3158ms
     × 1 · a booker who already PAID for passes on a date can buy more for the same date (CR-06) 187ms
     × 2 · one caller's idempotency key can never return another caller's booking (WR-01) 218ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/booking/open-capacity-replay.test.ts > findOwnOpenHold — the drop-in replay predicate (CR-06 / WR-01) > 1 · a booker who already PAID for passes on a date can buy more for the same date (CR-06)
AssertionError: expected 2 to be 4 // Object.is equality

- Expected
+ Received

- 4
+ 2

 ❯ tests/booking/open-capacity-replay.test.ts:310:58
    308|     // booker asked for two more passes, was redirected to the booking…
    309|     // counter never saw them.
    310|     expect(await headsFor(L_OPEN, aliceId, D_CONFIRMED)).toBe(4);
       |                                                          ^
    311|
    312|     // …and only then the mechanism: two DISTINCT rows, and the redire…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/booking/open-capacity-replay.test.ts > findOwnOpenHold — the drop-in replay predicate (CR-06 / WR-01) > 2 · one caller's idempotency key can never return another caller's booking (WR-01)
AssertionError: expected '/listings/L_oc_replay/book?hold=590ce…' not to contain '590ce17f-74ac-43e0-999f-a466090a19c7'

Expected: "590ce17f-74ac-43e0-999f-a466090a19c7"
Received: "/listings/L_oc_replay/book?hold=590ce17f-74ac-43e0-999f-a466090a19c7"

 ❯ tests/booking/open-capacity-replay.test.ts:357:28
    355|     // FIRST: the disclosure itself. Under the defect this redirect ca…
    356|     // confirmed-existence oracle for a row Mallory has no relationshi…
    357|     expect(malloryUrl).not.toContain(aliceBookingId);
       |                            ^
    358|     const malloryBookingId = holdIdIn(malloryUrl);
    359|     expect(malloryBookingId).not.toBe(aliceBookingId);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed (2)
```

| Defect | Branch | Verdict |
|--------|--------|---------|
| **CR-06** | **A** | **REPRODUCED.** `expected 2 to be 4` — a booker paid for 2 passes, came back for 2 more, and the venue is admitting 2. |
| **WR-01** | **A** | **REPRODUCED.** Mallory's redirect literally spells Alice's booking id. |

The assertion order is load-bearing. Case 1 asserts the **database truth first** — the booker's summed
`declared_pax` over the venue-local day — so the RED names the harm (heads that were paid for and never
counted) rather than a proxy for it. Only then does it check the two distinct rows and the redirect target.
Case 2 asserts the **disclosure first** — the URL not containing the other booker's id — so the RED prints
the oracle itself. The head-sum helper is deliberately **re-typed** over the venue-local day range with
plain +08 arithmetic rather than importing `openTakenSql` (the 09-18 rule: a helper written in the bug's own
dialect reproduces the bug it measures). Every fixture date is clock-relative; `grep -c "2026-"` on the file
prints **0**.

## Task 2 — the fix (`722f242`)

### `src/lib/availability/units.ts`

**`findOwnOpenHold` — the status filter split per arm.** The single top-level
`(status = 'confirmed' OR (status = 'pending' AND expires_at > now()))` is gone. In its place, two named
`sql` fragments, each carrying its own rationale at the point a future reader would edit it:

- **`keyArm`** — `(idempotency_key = … AND booker_id = …)`, and **no status filter at all**. The comment says
  why in the terms that make it un-tidy-away-able: the index is GLOBAL, a key that exists can never be
  re-inserted, and refusing to replay it guarantees a 23505 that `mapBookingError` re-throws as a raw 500.
- **`liveOwnDayArm`** — `booker_id` + the venue-local day range 09-18 installed + `status = 'pending' AND
  expires_at > now()`. `status = 'confirmed'` is dropped from this arm entirely, with the CR-06 journey and
  `PASSES_FIXED_MESSAGE` named in the comment, and OC-18's "deliberately no per-booker head cap" cited as
  the reason this was a policy nobody chose.

The docblock's "two deliberate differences" paragraph is now **three**, and 09-18's pointer comment naming
this plan is deleted. It also records the `ORDER BY created_at ASC` tie-break when both arms match.

**`findOwnActiveHold` — WR-01 only.** Its key arm gains `AND booker_id = …` and a comment citing WR-01. The
status set (including the D-63 `requested`/`approved` states) and the exact `(starts_at, ends_at)` window
match are untouched — `git diff -U0 … | grep '^-' | grep -c "requested','approved"` prints **0**.

**`scopedIdempotencyKey` (new) — the second half of WR-01.** See Deviation 1: this is not in the plan and it
is load-bearing. The stored key becomes `${bookerId.length}:${bookerId}:${key}`, applied at the ONE place
the key enters each claim (`createPendingHold` and `createOpenCapacityHold`), so the value looked up and the
value inserted can never be different strings.

### `src/components/booking/book-cta.tsx`

A per-**selection** token, sent on the open payload only:

```
const openIdempotencyKey = React.useMemo(
  () => `${listingId}:${openPick?.dateIso ?? ""}:${openPick?.passes ?? ""}:${crypto.randomUUID()}`,
  [listingId, openPick?.dateIso, openPick?.passes],
);
```

The dependency list **is** the design and is commented as such: stable across repeated clicks on the same
selection (so a genuine double-submit replays), and changing when the booker picks a different date or a
different pass count — plus a fresh one on the post-redirect mount, which is exactly CR-06's journey. The
deps are composed **into** the value rather than listed as unused memo deps, which is what keeps
`react-hooks/exhaustive-deps` at zero new warnings. `grep -c "randomUUID"` prints **1**; the exclusive
payload is byte-untouched (`git diff -U0 … | grep '^+' | grep -c "placeHold({"` prints **0**).

### The test file, extended to 7 cases

1. **CR-06** — a paid pass no longer swallows the next purchase (heads reach 4, two distinct rows, the
   redirect names the NEW id).
2. **WR-01** — Mallory gets her own booking, Alice's row untouched.
3. **the tokened double-submit still replays** — same id, heads counted once, ONE row.
4. **the tokenless double-submit still replays** — the shipped D-42 protection with no token, preserved.
5. **a LAPSED tokenless hold does not replay** — a new row is minted, the dead hold is swept to `cancelled`,
   and the booker holds 2 heads (not 4, not 0).
6. **a key naming a LAPSED *or* CANCELLED row replays** — the `<design_decision>` case, in both sub-shapes.
   Every call asserts through `expectRedirect`, so a 23505 escaping the claim fails the case with the
   driver's own error rather than silently.
7. **the exclusive path** — two different windows are still two different bookings; Mallory cannot fetch
   Alice's hold with Alice's key; Alice re-submitting her own key still replays onto her own booking.

## Mutations Executed

**Four, all run, all restored** (`git diff --exit-code src/` exit 0 after the fix commit). The fix has two
independent halves, and the plan's two prescribed mutations were not sufficient to measure them.

### MUTATION 1 — restore `status = 'confirmed'` to the TOKENLESS arm

Exactly the plan's prediction. Observed, **VERBATIM**:

```
 FAIL  … > 1 · a booker who already PAID for passes on a date can buy more for the same date (CR-06)
AssertionError: expected 2 to be 4 // Object.is equality

- Expected
+ Received

- 4
+ 2

 ❯ tests/booking/open-capacity-replay.test.ts:385:58
    383|     // booker asked for two more passes, was redirected to the booking…
    384|     // counter never saw them.
    385|     expect(await headsFor(L_OPEN, aliceId, D_CONFIRMED)).toBe(4);
       |                                                          ^

 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

Cases 3-6 stayed **GREEN** under it, which is the pair's real value: the confirmed-pass match is the only
thing that arm loses, and the D-42 double-submit replay is not collateral damage.

### MUTATION 2a — delete `AND booker_id = …` from `findOwnOpenHold`'s key arm (**the plan's prescribed WR-01 mutation**)

**Result: all 7 GREEN.** Recorded because it is the observed result and because it is the finding that
justified the next two. With the stored key already namespaced, Alice's row carries
`<len>:<alice id>:shared-token-alice` and Mallory looks up `<len>:<mallory id>:…` — the two can never name
one row whatever the predicate says. The predicate scope is **defence in depth**, not the load-bearing half,
and reporting the plan's mutation as red would have been a fiction.

### MUTATION 2b — revert `scopedIdempotencyKey` to the identity, keeping the predicate scope

**This is the shape the reviewer's literal fix would have shipped.** Cases **2 and 7** RED, on the open claim
and the exclusive one. Observed, **VERBATIM** (abridged only where the driver repeats the same INSERT
statement twice):

```
 FAIL  … > 2 · one caller's idempotency key can never return another caller's booking (WR-01)
Error: Failed query: insert into "booking" (…, "idempotency_key", …) values ($1, …) returning …
params: d60cbfa2-…,L_oc_replay,1,MBWKBnyymdfCKyPl8J7k8DWHNxmiK5Tv,2026-08-31T22:00:00.000Z,
        2026-09-01T14:00:00.000Z,pending,instant,false,15,2026-09-01T14:00:00.000Z,36750,php,
        shared-token-alice,standard,35000,1750,1,true
 ❯ src/lib/availability/units.ts:1036:26
 ❯ createOpenCapacityHold src/lib/availability/units.ts:868:14
 ❯ placeOpenHold src/app/actions/booking.ts:441:15

Caused by: PostgresError: duplicate key value violates unique constraint "booking_idem_uq"

Serialized Error: { severity: 'ERROR', code: '23505',
  detail: 'Key (idempotency_key)=(shared-token-alice) already exists.',
  constraint_name: 'booking_idem_uq', routine: '_bt_check_unique', … }

 FAIL  … > 7 · the EXCLUSIVE path changed in exactly one respect — its key arm is now booker-scoped
Error: Failed query: insert into "booking" (…) values (…) returning …
 ❯ src/lib/availability/units.ts:565:32
 ❯ Module.createPendingHold src/lib/availability/units.ts:421:14

Caused by: PostgresError: duplicate key value violates unique constraint "booking_idem_uq"
```

**A 23505 on the money path, on both claims.** `mapBookingError` maps only `NoUnitAvailableError` / 23P01 /
40P01 and re-throws everything else, and `createPendingHold`'s own 23505 handler can no longer rescue it
because its own-hold re-check is now booker-scoped too. This is the T-09-80 / `T-03-500` failure the plan's
own `<design_decision>` exists to prevent, reached from the other side — and it is why the fix has two
halves.

### MUTATION 2c — BOTH halves reverted (the true pre-fix key arm)

Case 2 RED with exactly the Task-1 shape, **VERBATIM**:

```
 FAIL  … > 2 · one caller's idempotency key can never return another caller's booking (WR-01)
AssertionError: expected '/listings/L_oc_replay/book?hold=40069…' not to contain '40069e9f-62ad-4c1c-9453-b6d9ae3d3858'

Expected: "40069e9f-62ad-4c1c-9453-b6d9ae3d3858"
Received: "/listings/L_oc_replay/book?hold=40069e9f-62ad-4c1c-9453-b6d9ae3d3858"
```

Case 7 went with it (the exclusive claim still 23505s, because 2c keeps `findOwnActiveHold`'s new
booker scope while the stored keys are raw again).

### MUTATION 3 — `BookCta`'s memo keyed on `[listingId]` alone

Run because the memo's dependency list is the whole of the client-side design and **nothing else in the
suite measures it**. Observed, **VERBATIM**:

```
 FAIL  … > (6b) the idempotency token is STABLE per selection and CHANGES when the selection does (CR-06)
AssertionError: expected 'listing-drop-in:::c8eb910f-37ec-4727-…' not to be 'listing-drop-in:::c8eb910f-37ec-4727-…' // Object.is equality
 ❯ tests/availability/date-pass-picker.test.tsx:335:26
    333|     expect(container.querySelector<HTMLInputElement>("#requested-passe…
    334|     await bookAgain(3);
    335|     expect(keyOf(2)).not.toBe(keyOf(0));
       |                          ^
```

The mutated token's empty date/pass segments (`listing-drop-in:::…`) are the tell: with the selection out of
the deps the memo froze on the first render, before a day was picked, and every purchase for that listing
would replay onto the first one forever.

## Verification

| Gate | Result |
|------|--------|
| Task 1 confirming run recorded verbatim, branch stated **per defect** | ✅ CR-06 = A, WR-01 = A |
| `git status --short -- src/` at end of Task 1 | empty ✅ |
| `grep -c "declared_pax\|declaredPax" tests/booking/open-capacity-replay.test.ts` | `7` (≥ 1) ✅ |
| `grep -c "2026-" tests/booking/open-capacity-replay.test.ts` | `0` ✅ |
| `grep -c 'booker_id = ${args.bookerId}' src/lib/availability/units.ts` | `4` (was `2`) ✅ |
| `grep -c "status = 'pending' AND expires_at > now()" src/lib/availability/units.ts` | `1` (≥ 1) ✅ |
| `grep -v '^\s*//' … \| grep -c "open_capacity = true"` (units.ts) | `2` — UNCHANGED ✅ |
| `grep -c "idempotencyKey" src/components/booking/book-cta.tsx` | `1` (≥ 1) ✅ |
| `grep -c "useMemo" src/components/booking/book-cta.tsx` | `2` (≥ 1) ✅ |
| `grep -c "randomUUID" src/components/booking/book-cta.tsx` | `1` ✅ |
| added `placeHold({` lines in book-cta.tsx diff | `0` ✅ — the exclusive payload is untouched |
| removed `requested','approved` lines in units.ts diff | `0` ✅ — the exclusive status set is intact |
| test-file header carries Task 1 + all mutations, incl. `expected 2 to be 4` and the WR-01 redirect assertion | ✅ |
| `npx vitest run tests/booking/open-capacity-replay.test.ts` | **7 passed** ✅ |
| `npx vitest run tests/availability/date-pass-picker.test.tsx` | **10 passed** ✅ (9 + case 6b) |
| `npx vitest run` (full suite) | **1087 passed \| 4 skipped, 0 failed** ✅ (1079 + 4 at plan start; +7 replay, +1 picker) |
| `npx tsc --noEmit` | `0` ✅ |
| `npm run lint` | **0 errors / 7 baseline warnings** ✅ — no new warning from the memo |
| `git diff --exit-code src/` after ALL mutations restored | `0` ✅ · `git status --short` empty ✅ |
| files added under `drizzle/` | `0` ✅ — next migration number is still **0023** |

## Deviations from Plan

### 1. [Rule 2 — missing critical functionality] The stored idempotency key is booker-namespaced, which the plan does not ask for

- **Found during:** Task 2, designing the key-arm scope.
- **Issue:** the plan's literal instruction — add `AND booker_id = …` to both key arms — is **not
  sufficient and is not safe on its own**. `booking_idem_uq` is a GLOBAL partial-unique index on
  `idempotency_key` alone. Once the predicate stops matching another caller's row, the claim falls straight
  through to the INSERT and Postgres raises a **23505**, which `mapBookingError` re-throws (it maps only
  `NoUnitAvailableError` / 23P01 / 40P01). The plan's own case 2 asks for a **redirect** for the second
  booker, which is unreachable in that shape. This is not a Mallory-only edge: `openHoldSchema` admits any
  string up to 200 chars, so any client that ever used a non-random key would break every other booker who
  sent the same one.
- **Fix:** `scopedIdempotencyKey(bookerId, key)` → `${bookerId.length}:${bookerId}:${key}`, applied at the
  single point the key enters each claim. The global index becomes effectively per-booker; one caller
  re-supplying their own string still lands on their own row, so the D-42 replay is preserved exactly.
  Length-prefixed because a bare `${id}:${key}` is **not injective** — ("u1", "2:x") and ("u1:2", "x") both
  render `u1:2:x`, re-opening at the character level the very collision the namespace closes.
- **Proof it was necessary:** **MUTATION 2b** — reverting only this half, keeping the predicate scope, turns
  cases 2 **and** 7 red with `PostgresError: duplicate key value violates unique constraint
  "booking_idem_uq"` on both the open and the exclusive claim. This is the same T-09-80 raw-500 the plan's
  `<design_decision>` spends a paragraph preventing on the same-booker path.
- **Cost, stated honestly:** rows written before this commit carry RAW keys, so an in-flight hold at deploy
  time would not be found by a replay of its own key (it would be found by the tokenless arm instead, which
  is the shipped client's actual behaviour today — `BookCta` sent no key before this plan). Holds live 15
  minutes; the exposure is one deploy window and the failure mode is a second hold, not a lost booking.
- **Files:** `src/lib/availability/units.ts`.

### 2. [Recorded, not reshaped] The plan's prescribed WR-01 mutation cannot go red, and is reported GREEN

- **Found during:** Task 2's mandatory mutations.
- **Plan's instruction** (`09-23-PLAN.md:270-272`): delete `AND booker_id = …` from `findOwnOpenHold`'s key
  arm → **case 2 RED**, the redirect carrying the other booker's id.
- **Observed:** **all 7 GREEN.** With the stored key namespaced, the two bookers' keys are different strings
  and the predicate never gets the chance to matter.
- **Disposition:** recorded verbatim as MUTATION 2a, and **two further mutations were run** to actually
  measure the assertion — 2b (namespace only) and 2c (both halves, i.e. the true pre-fix predicate, which
  reproduces the exact Task-1 RED). Reporting 2a as red would have been a fiction; deleting it would have
  hidden the fact that the predicate scope is defence in depth. Both halves stay: dropping the predicate
  would rest the whole fix on a string encoding, and dropping the namespace re-introduces the 23505.
- **Files:** `tests/booking/open-capacity-replay.test.ts` (header), this SUMMARY.

### 3. [Rule 3 — blocking] The shipped open-payload KEY-SET tripwire had to be reconciled

- **Found during:** the first full-suite run after the fix.
- **Issue:** `tests/availability/date-pass-picker.test.tsx` case 6 asserts the open payload as an **exact key
  set** (`["date", "listingId", "requestedPasses"]`) — the T-09-26 guard against a smuggled window field.
  Adding `idempotencyKey` broke it: `expected { …(3) } to deeply equal { …(2) }`, with the new field named
  in the diff. **This is the tripwire working**, not a defect, and the plan does not mention it.
- **Fix:** the key set is now `["date", "idempotencyKey", "listingId", "requestedPasses"]` and the new field
  is pinned by type and non-emptiness (it carries a nonce, so it cannot be compared literally). The key-set
  FORM is kept — loosening it to a bare `toMatchObject` would have removed the teeth. The three forbidden
  window fields are still asserted absent.
- **Files:** `tests/availability/date-pass-picker.test.tsx`.

### 4. [Rule 2 — missing critical functionality] Case 6b added: the memo's dependency list had no measurement

- **Found during:** Task 2, after (c).
- **Issue:** the plan's cases 3 and 4 pin the SERVER's replay behaviour, which is correct — but nothing
  anywhere measured the CLIENT half the plan calls "the whole design". A memo keyed on `[listingId]` alone
  would have passed every case in the plan while freezing one token for the component's lifetime.
- **Fix:** `date-pass-picker.test.tsx` case 6b — two submits on one selection carry the SAME token; changing
  the pass count produces a DIFFERENT one. Mutation-proven (MUTATION 3).
- **Files:** `tests/availability/date-pass-picker.test.tsx`.

### 5. [Recorded] The `date-pass-picker` case-4 timeout recurred once and is the known baseline flake

- **Found during:** the first full-suite run after the fix was complete.
- **Observed:** `(4) picking a new date resets the pass count to 1 and re-bounds it (§ 2c)` — `Test timed
  out in 5000ms`. The file passes **10/10 in isolation** (run twice), and the **immediately following full
  suite run was 1087 passed / 4 skipped / 0 failed**.
- **Disposition:** pre-existing, `deferred-items.md` item 3, explicitly out of scope. Not chased. Noted only
  because this plan adds one case (6b) to that file, which lengthens it marginally; case 6b itself passed in
  every run including the one where case 4 timed out.

## Threat Model Outcomes

| Threat ID | Disposition | Outcome |
|-----------|-------------|---------|
| T-09-78 | mitigate | **Closed.** Both key arms carry `AND booker_id = …` AND the stored key is booker-namespaced. Case 2 asserts the returned id is not the other booker's; MUTATION 2c proves the assertion bites with the exact Task-1 RED, and 2b proves the namespace half is load-bearing. |
| T-09-79 | mitigate | **Closed.** The tokenless arm matches only a LIVE `pending` hold. Case 1 asserts the booker's summed admitted heads reach 4, mutation-measured at `expected 2 to be 4`. |
| T-09-80 | mitigate | **Closed, and generalised.** The key arm stays status-agnostic (case 6 pins both the lapsed and the cancelled shape), and the namespace extends the same guarantee ACROSS callers — MUTATION 2b is the measurement of what its absence costs: a 23505 on both claims. |
| T-09-81 | mitigate | **Closed.** The token remains untrusted input: it is namespaced with the SERVER's own `bookerId` before it touches SQL and only ever narrows a query already scoped to the caller. It can never be a lookup handle. |
| T-09-82 | mitigate | **Held.** Cases 3 and 4 pin BOTH the tokened and the tokenless double-submit replays; MUTATION 1 leaves both green, so the CR-06 narrowing is provably not collateral. `BookCta`'s memo keys the token to the selection so a real double-click shares it (case 6b, mutation-proven). |
| T-09-SC | mitigate | **No package was installed by this plan.** `crypto.randomUUID` is a platform global. The Package Legitimacy Gate was never triggered. |

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data source was introduced.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The
change is confined to two existing authenticated claims' own-hold predicates, the STORED FORM of a column
that already existed, and one extra field on an existing client payload that the shipped Zod schema already
accepted.

## What This Does NOT Close

- **A pre-existing concurrent race:** two *simultaneous* claims by one booker reusing one key across two
  DIFFERENT dates take different advisory locks and can still collide on the insert (a 23505 → 500).
  Unreachable from the shipped UI (the memo cannot produce one token for two dates), unchanged by this plan,
  and logged as **`deferred-items.md` item 6** with the shape of a proper fix.
- **A live PayMongo re-proof.** The fix is proven at the integration layer against real Postgres; nothing in
  the money *path* changed (no rate, no quote, no charge), so no new `sk_test_` charge was warranted.

## Status of `09-REVIEW.md`'s 14 findings — the phase-verification starting point

**This was the last of the nine gap plans. All 14 findings are now closed in code, each with its own
DB-backed or component gate and at least one recorded mutation.**

| # | Finding | Closed by | Notes |
|---|---------|-----------|-------|
| CR-01 | Same-day pass holdable, never payable | 09-17 | verified before planning |
| CR-02 | Host blocked dates ignored on drop-in | 09-20 | confirm-then-fix, branch A (`expected 3 to be +0`) |
| CR-03 | Hours edit re-keys the counter (overbook) | 09-18 (layer 1) + 09-19 (layer 2) | verified before planning |
| CR-04 | Drop-in mode with no per-person price → raw 500 | 09-21 | confirm-then-fix, branch A |
| CR-05 | `createGroup` never checks occupancy mode | 09-22 | confirm-then-fix, branch A (`expected 29 to be +0`) |
| **CR-06** | **Second set of passes silently swallowed** | **09-23 (this plan)** | **confirm-then-fix, branch A (`expected 2 to be 4`)** |
| **WR-01** | **Key match not scoped to the booker** | **09-23 (this plan)** | **confirm-then-fix, branch A** |
| WR-02 | Split-shift day truncated → hold born expired | 09-24 | confirm-then-fix, branch A |
| WR-03 | `OPEN_LOW_STOCK_MAX` unvalidated `Number(env)` | 09-24 | |
| WR-04 | `.max()` shape ceiling does not bound the money product | 09-21 | |
| WR-05 | Drop-in pass uncancellable from opening, no disclosure | 09-25 | |
| NT-01 | `PAST_START` copy says "session" to a drop-in booker | 09-17 (booking.ts half) + 09-25 (cancel half) | |
| NT-02 | Month grid / day panel disagree on NULL `max_occupancy` | 09-24 | |
| NT-03 | Previously-recorded acknowledged items | n/a | recorded in `deferred-items.md`, not defects |

**Nothing from `09-REVIEW.md` remains open.** What remains before the phase can be marked complete is
**process**, not findings:

1. **`verify_phase_goal`** (`gsd-verifier`) has never been run for Phase 9 — it was deliberately skipped when
   the review re-opened the phase.
2. **`/gsd-secure-phase 9`** — `workflow.security_enforcement` is `true` and there is still no
   `09-SECURITY.md`.
3. **Deferred items 1-6** in `deferred-items.md` are accepted-design / non-urgent records, not blockers. Item
   3 (the `date-pass-picker` case-4 multi-suite timeout) is the only one that shows up as noise in a suite
   run.
4. Only then the ROADMAP / STATE phase checkbox.

## Self-Check: PASSED

- `src/lib/availability/units.ts` — FOUND (modified)
- `src/components/booking/book-cta.tsx` — FOUND (modified)
- `tests/booking/open-capacity-replay.test.ts` — FOUND (created, 648 lines ≥ 130 `min_lines`)
- `tests/availability/date-pass-picker.test.tsx` — FOUND (modified, case 6 reconciled + case 6b added)
- `.planning/phases/09-open-capacity-bookings/deferred-items.md` — FOUND (modified, item 6 added)
- Commit `b92822e` — FOUND
- Commit `722f242` — FOUND
- `git diff --exit-code src/` — exit 0 (all four mutations restored) · `git status --short` empty
