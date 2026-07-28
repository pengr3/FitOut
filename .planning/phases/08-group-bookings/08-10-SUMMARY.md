---
phase: 08-group-bookings
plan: 10
subsystem: booking
tags: [zod, drizzle, postgres, pricing, input-validation, security]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-03)
    provides: the D-108 pax surcharge folded into the frozen spacePriceCents inside createPendingHold
  - phase: 08-group-bookings (08-05)
    provides: updateDeclaredPax's server-side maxOccupancy clamp — the existing clamp this mirrors
provides:
  - "bookingCreateSchema.declaredPax bounded at .max(10_000) — a SHAPE ceiling that keeps any accepted value orders of magnitude below int4"
  - "createPendingHold selects listing.maxOccupancy inside its own transaction and clamps declaredPax before the price is frozen"
  - "booking.declared_pax can never persist above the listing's own maxOccupancy"
  - "a fail-CLOSED fallback (cap 1) for listings with no recorded capacity on the creation path"
  - "mutation-verified regression cases on a fixture that actually carries maxOccupancy"
affects: [08-13, 08-14, 08-17, phase-09, payouts, refunds]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shape ceiling at the schema + real cap read in-transaction: two different jobs, two different numbers"
    - "Creation-path clamps fail CLOSED; owner-gated re-price paths may fall back to the caller's value"

key-files:
  created: []
  modified:
    - src/lib/validation/booking.ts
    - src/lib/availability/units.ts
    - tests/booking/pax-surcharge-hold.test.ts

key-decisions:
  - "The null-maxOccupancy fallback on the creation path is 1 (surcharge-free), deliberately DIFFERENT from updateDeclaredPax's fallback to the client value — a crafted POST must not be trusted for its own bound"
  - "A clamped headcount is a SUCCESS, not a refusal: no new error branch, no new failure shape for callers"
  - "The pre-CR-03 test fixture had to GAIN a default maxOccupancy (12) to keep its at-or-below-cap meaning — leaving it NULL turned every existing surcharge case into a fail-closed case"

patterns-established:
  - "Pattern: a client-supplied multiplier that reaches an integer money column owes BOTH a schema ceiling (keeps it away from int4) and an in-transaction cap read from the row it prices (keeps it truthful)"
  - "Pattern: the clamp is proven by mutation, not by coverage — a case that still passes with the clamp deleted is not a regression guard"

metrics:
  duration: ~25 min
  completed: 2026-07-28
  tasks: 2
  files-modified: 3
---

# Phase 8 Plan 10: Clamp `declaredPax` at Hold Creation Summary

`declaredPax` is now bounded twice — a `.max(10_000)` shape ceiling at `bookingCreateSchema` and a
`min(declaredPax, listing.maxOccupancy)` clamp read inside `createPendingHold`'s own transaction — so no
crafted POST can shape the frozen `space_price_cents` that the payout, service-fee and refund bases all read.

## What Shipped

**CR-03 (BLOCKER) is closed.** Before this plan, `bookingCreateSchema.declaredPax` had `.min(1)` and no
upper bound, and `createPendingHold` never even SELECTed `listing.max_occupancy` — it passed
`input.declaredPax` verbatim into `quoteWindow` and into `declared_pax`. The contract the phase wrote for
itself (`src/components/booking/pax-stepper.tsx:20-21`: *"the server clamps the value against the listing's
own maxOccupancy on every call, so a crafted POST cannot declare 400 people"*) was true only of the OTHER
entry point, `updateDeclaredPax`. It is now true of the one that actually creates the booking.

### 1. The shape ceiling (`src/lib/validation/booking.ts:108`)

```ts
declaredPax: z.coerce.number().int().min(1).max(10_000).optional(),
```

Same ceiling `declaredPaxSchema` already uses on the re-price path (`src/app/actions/booking.ts:81`) — one
number, no new constant. The comment block above it was REWRITTEN: the old sentence *"The real seat-cap
enforcement is D-112's seat-claim, not this field, so no upper bound is asserted here"* was a false statement
about the system and is gone. The replacement says what is true — this is a shape ceiling that keeps the
value away from the `integer` money columns, and the real cap is the listing's own `maxOccupancy`.

### 2. The in-transaction clamp (`src/lib/availability/units.ts`)

`maxOccupancy: listing.maxOccupancy` joins the in-tx `.select({…})` projection alongside the rates, so the
cap is read by the SAME transaction that freezes the price against it (D-111). Immediately before
`quoteWindow`:

```ts
const paxCap = maxOccupancy != null && maxOccupancy > 0 ? maxOccupancy : 1;
const declaredPax =
  input.declaredPax == null ? undefined : Math.min(Math.max(1, input.declaredPax), paxCap);
```

The CLAMPED local feeds both `quoteWindow` and `declaredPaxToPersist`. `grep -c "input.declaredPax"` on the
file prints exactly **1** — the clamp expression itself is the only place the raw input is read.

`quoteWindow`, `paxSurcharge`, `computeServiceFee` and the D-74 frozen-triple composition are untouched. A
clamped value returns a normal successful hold: the booker gets the price for the headcount the listing can
actually hold, with no new error branch.

### 3. The fail-CLOSED fallback is a decision, not an oversight

`max_occupancy` is nullable (`schema.ts:189`). On this path a listing with no recorded capacity falls back to
a cap of **1** — surcharge-free — rather than to the submitted number. That is deliberately DIFFERENT from
`updateDeclaredPax` (`src/app/actions/booking.ts:376`), which falls back to the client's value. The
difference is the threat: `updateDeclaredPax` is owner-gated on an existing hold, while `createPendingHold`
is the entry point a crafted POST reaches. The rationale is stated in a comment at the clamp site so a later
reader does not "harmonise" the two.

## Mutation Evidence (both halves, verbatim)

**MUTATION A — revert the clamp so `quoteWindow` receives `input.declaredPax` again:**

```
 FAIL  tests/booking/pax-surcharge-hold.test.ts > CR-03 declaredPax is clamped to the LISTING's maxOccupancy inside the price-freezing tx > declaredPax 500 against maxOccupancy 6 freezes the price for 6, and persists declared_pax = 6
AssertionError: expected 848500 to be 107500 // Object.is equality
 FAIL  tests/booking/pax-surcharge-hold.test.ts > CR-03 declaredPax is clamped to the LISTING's maxOccupancy inside the price-freezing tx > an int4-overflowing declaredPax resolves cleanly and freezes the SAME clamped figures (no 22003)
Caused by: PostgresError: value "3150000103425" is out of range for type integer
 FAIL  tests/booking/pax-surcharge-hold.test.ts > CR-03 declaredPax is clamped to the LISTING's maxOccupancy inside the price-freezing tx > a listing with NO recorded maxOccupancy fails CLOSED: declared_pax = 1 and no surcharge
AssertionError: expected 112000 to be 100000 // Object.is equality
 Test Files  1 failed (1)
      Tests  3 failed | 7 passed (10)
```

The overflow case reproduced the exact CR-03 consequence chain on live Postgres — `code: '22003'`,
`routine: 'pg_strtoint32_safe'`, with the crafted parameters visible in the failed INSERT
(`space_price_cents: 3000000098500`, `service_fee_cents: 150000004925`, `quoted_total_cents: 3150000103425`).
That is the raw-500 path `mapBookingError` re-throws.

**Restored** (`git checkout -- src/lib/availability/units.ts`, working tree byte-identical to HEAD):

```
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

**MUTATION B — remove `.max(10_000)` from `src/lib/validation/booking.ts`:**

```
 FAIL  tests/booking/pax-surcharge-hold.test.ts > CR-03 bookingCreateSchema bounds declaredPax before it can reach the quote > rejects declaredPax = 10_001
AssertionError: expected true to be false // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 9 passed (10)
```

**Restored:**

```
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

Both mutations are surgical: A fails only the three clamp cases and B fails only the shape case, so neither
test half is passing for the other's reason.

## Test Coverage Added

`tests/booking/pax-surcharge-hold.test.ts` grew from 5 to 10 cases (+101 lines). Every new case asserts on
the row read back OUT of Postgres — `declared_pax`, `space_price_cents`, `service_fee_cents`,
`quoted_total_cents` — because the frozen row, not the return value, is what the payout and refund paths
read. Each clamped row also re-asserts the D-74 triple `quoted == space + fee`, so CR-03 cannot be closed in
future by breaking the composition.

| Case | Fixture | Asserts |
|------|---------|---------|
| over-cap | `maxOccupancy 6`, `included 1`, fee ₱15, `declaredPax 500` | `declared_pax = 6`, space = 100000 + 5×1500 = **107500** |
| int4 overflow | same, `declaredPax 2_000_000_000` | resolves cleanly, **byte-identical** 107500 figures, no 22003 |
| fail-closed | `maxOccupancy NULL`, `included 1`, fee ₱15, `declaredPax 9` | `declared_pax = 1`, space = base only |
| shape ceiling | pure `safeParse`, no DB | `10_001` → `success: false`; `10_000` → `success: true` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The pre-CR-03 fixture had to gain a `maxOccupancy` for Task 1 to go green**

- **Found during:** Task 1 verification
- **Issue:** The plan's Task 1 acceptance required `pax-surcharge-hold.test.ts` to stay green, and Task 2
  stated the existing fixture should stay as-is. But `makeListing` never set `maxOccupancy`, so every
  existing per-head case ran against a NULL cap — and the (deliberate, plan-specified) fail-closed fallback
  of 1 clamped them. Two shipped cases went red: `declaredPax 5` froze 100000 instead of 104500 and
  persisted `declared_pax = 1` instead of 5; `declaredPax 2` persisted 1 instead of 2. The two assertions
  were correct about D-108 and the code was correct about CR-03 — the FIXTURE was the thing that no longer
  expressed "at or below the cap".
- **Fix:** `ListingOpts` gained `maxOccupancy`, and `makeListing` defaults it to `DEFAULT_MAX_OCCUPANCY = 12`
  (above every headcount the pre-CR-03 cases use, 1–12) with an explanatory comment. The fail-closed case
  passes `maxOccupancy: null` explicitly and the over-cap cases pass a small cap. No existing assertion was
  weakened or deleted — all five original cases still assert their original numbers.
- **Files modified:** `tests/booking/pax-surcharge-hold.test.ts`
- **Commit:** `4ab8c58`

No other deviations. The fallback value itself was NOT revisited — it is the plan's explicit, reasoned
decision and the review's drafted fix.

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | **0 errors**, 7 warnings — the same 7 pre-existing ones (2 React-Compiler `incompatible-library` in host wizards, 5 unused-arg in `tests/helpers/mocks.ts`); none in a touched file |
| `npx vitest run` (full suite, no `DATABASE_URL` override) | **92 files / 797 tests, exit 0** (+5 tests over the 792 baseline; +0 files) |
| `npm run build` (bare, no dummy-env workaround) | exit 0 — `✓ Compiled successfully in 20.0s`, 27 routes |
| `grep -n "max(10_000)" src/lib/validation/booking.ts` | matches line 108 |
| `grep -v '^\s*//' … \| grep -c "no upper bound is asserted here"` | 0 |
| `grep -n "maxOccupancy: listing.maxOccupancy" src/lib/availability/units.ts` | matches line 393 (in-tx select) |
| `grep -c "input.declaredPax" src/lib/availability/units.ts` | **1** (the clamp expression only) |

## Success Criteria

- ✅ No value accepted by `bookingCreateSchema.declaredPax` can produce a frozen `space_price_cents` derived
  from anything other than `min(declaredPax, listing.maxOccupancy)` — the raw input reaches exactly one
  expression, and that expression is the clamp.
- ✅ `booking.declared_pax` is never persisted above the listing's own `maxOccupancy` — `declaredPaxToPersist`
  reads the clamped local.
- ✅ Listings with `extraHeadFee = 0` or `null` are byte-identical to today — the two flat-listing cases still
  assert `declared_pax IS NULL` and an unmoved price for `declaredPax` 9 and 12.

## Threat Model Outcomes

| Threat ID | Disposition | Outcome |
|-----------|-------------|---------|
| T-08-30 (Tampering — price freeze) | mitigate | Clamped in-tx against the listing's own cap; mutation-verified RED. |
| T-08-31 (DoS — int4 overflow → raw 500) | mitigate | `.max(10_000)` shape bound + the clamp; the overflow was REPRODUCED under mutation (`22003`) and is unreachable with the fix in place. |
| T-08-32 (Repudiation — payout basis) | mitigate | Every clamped row asserted straight out of Postgres including `quoted == space + fee`. |
| T-08-SC (supply chain) | accept | No packages added or upgraded. `package.json` untouched. |

## Notes for Future Plans

1. **The two clamps are intentionally asymmetric on a null cap.** Creation (`createPendingHold`) → **1**,
   fail closed. Re-price (`updateDeclaredPax`) → the caller's value, because it is owner-gated on an
   existing hold. Anyone "unifying" them must decide which threat they are choosing to accept.
2. **A host who sets `extra_head_fee` but leaves `max_occupancy` empty now collects no surcharge at hold
   time** (every booker clamps to 1). That is safe (it can only undercharge) but is a product-visible
   consequence — a publish-time nudge pairing the two fields would be the real close. Not in scope here;
   08-14's `max_occupancy >= 2` floor moves toward it for the group path.
3. **08-17's pax-surcharge UAT should use a listing with BOTH `extra_head_fee` and `max_occupancy` set** —
   with `max_occupancy` NULL the stepper's surcharge line will now correctly render nothing, which would
   look like the 08-09 non-verification all over again.
4. **`tests/booking/pax-surcharge-hold.test.ts` fixtures now carry a capacity by default (12).** Any new case
   that means to exercise the cap must name its own `maxOccupancy`.

## Self-Check: PASSED

- `src/lib/validation/booking.ts` — FOUND (modified, `.max(10_000)` at :108)
- `src/lib/availability/units.ts` — FOUND (modified, `maxOccupancy` projection at :393, clamp at :438-450)
- `tests/booking/pax-surcharge-hold.test.ts` — FOUND (modified, 10 cases)
- Commit `4ab8c58` — FOUND in `git log`
- Commit `113445d` — FOUND in `git log`
