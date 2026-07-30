---
phase: 09-open-capacity-bookings
plan: 06
subsystem: listing-lifecycle
tags: [zod, validation, publish-gate, server-actions, occupancy-mode, open-capacity, security]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings
    plan: 01
    provides: "occupancy_mode gains 'open_capacity', listing.per_head_price_cents, and the booking_no_overlap narrowing that makes an upstream mixed-row guard load-bearing"
  - phase: 07-bookings-management-cancellation-notifications
    provides: "D-77 — the publish gate runs server-side against the PERSISTED row; the wizard checklist is a courtesy"
  - phase: 08-group-bookings
    provides: "SURCHARGE_UNREACHABLE_MESSAGE and the single-literal reject-copy discipline (08-20/08-22 HG-01)"
provides:
  - "publishSchema forked per occupancy mode — an open listing publishes with a price per person and NO rates; an exclusive listing still requires both"
  - "OCCUPANCY_MODE_VALUES / OccupancyModeValue — the exported two-member union the wizard's mode cards and the publish gate share"
  - "Six new single-literal reject-copy constants (EXCLUSIVE_RATES_REQUIRED_MESSAGE, PER_HEAD_PRICE_REQUIRED_MESSAGE, DROP_IN_CAP_REQUIRED_MESSAGE, DROP_IN_INSTANT_ONLY_MESSAGE, DROP_IN_SINGLE_SPACE_MESSAGE, DROP_IN_NO_GUEST_PRICING_MESSAGE) + MODE_LOCKED_MESSAGE"
  - "src/lib/listing/mode-lock.ts — getModeLockState / ModeLockState, the ONE OC-17 authority (locked, lockedByCount, unlocksAt)"
  - "saveListingStep refuses a genuine occupancy-mode CHANGE while any booking is still ahead; perHeadPriceCents joins the autosave whitelist"
  - "publishListing re-parses perHeadPriceCents + unitCount from the PERSISTED row"
affects: [09-07 wizard occupancy step + mode-forked pricing/checklist + the 1f lock alert, 09-13 host editor, 09-16 walkthrough]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mode-forked Zod gate: a requirement that cannot hold for every variant MOVES from the object level into superRefine and is re-imposed per branch, rather than weakening for everyone"
    - "One lock authority, two consumers: getModeLockState is RENDERED by the wizard and ENFORCED by the action, so the disabled control and the refusal can never disagree"
    - "Change-only enforcement: the guard fires on `incoming !== persisted`, never on `incoming !== undefined`, so an unrelated autosave that echoes the stored value is not frozen"

key-files:
  created:
    - src/lib/listing/mode-lock.ts
    - tests/listing/mode-lock.test.ts
  modified:
    - src/lib/validation/listing.ts
    - src/app/actions/listing.ts
    - tests/validation/listing-schema.test.ts

key-decisions:
  - "Zod 4 probed before writing the fork: superRefine STILL RUNS when a base CHECK fails (maxOccupancy: 0 -> too_small) but is SKIPPED when a required field is missing (invalid_type aborts). That is why DROP_IN_CAP_REQUIRED_MESSAGE is reachable for a bad cap but a MISSING cap still shows Zod's generic invalid_type — the plan's own note that the message 'exists so the host reads the drop-in meaning' is therefore true for values, not for absence"
  - "The open branch `return`s before the 08-20 surcharge-reachability rule rather than running both: an open listing with extraHeadFee > 0 AND included >= maxOccupancy gets ONE reason (extra guest pricing doesn't apply), not two contradictory ones"
  - "unitCount is added to publishSchema but NOT to draftSchema — there is no wizard control for it, so the PERSISTED row is the only honest source and the field exists purely for the publish re-parse"
  - "getModeLockState mirrors the EXCLUSIVE occupying predicate (confirmed | pending/requested/approved not expired), not the narrower open-capacity one — the lock must count whatever is currently on the calendar regardless of which arbiter minted it"

patterns-established:
  - "Pattern (re-confirmed from 09-02): an acceptance grep that counts an imported symbol is unsatisfiable at 1 — a named import always adds a matching line. Count call sites (`grep -c 'sym('`) or usages (`grep -c '\\[SYM\\]'`) instead"
  - "Pattern: a comment that NAMES the forbidden construct defeats its own grep tripwire (`no new Date() in this module` makes `grep -c 'new Date()'` return 1). Describe the ban in prose; never quote it"

requirements-completed: [OPEN-01]

# Metrics
duration: 35min
completed: 2026-07-30
---

# Phase 9 Plan 06: Mode-Forked Publish Gate + the OC-17 Lock Summary

**`publishSchema` now forks on `occupancyMode` — a drop-in listing publishes with a price per person, a people-per-day cap, instant booking and one unit and NO hourly or day rate, while an exclusive listing's Phase-2 both-rates gate is re-imposed verbatim — and `getModeLockState` becomes the single server-side authority that stops a host flipping the mode out from under a live booking.**

## Performance

| Metric | Value |
|---|---|
| Tasks | 2 / 2 |
| Commits | 2 (plus this doc commit) |
| Files created | 2 |
| Files modified | 3 |
| New tests | 20 (11 schema cases, 9 lock cases) |
| Full suite | 899 passed / 4 skipped (100 files) — was 879 / 4 (99 files) |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors, 7 baseline warnings |
| Mutation kills confirmed | 4 / 4 |

## What Shipped

### 1. The mode fork (`src/lib/validation/listing.ts`)

`occupancyModeValues` gains `open_capacity` and is exported as `OCCUPANCY_MODE_VALUES` /
`OccupancyModeValue`, following the `CANCELLATION_POLICY_VALUES` idiom so the wizard's mode cards
(09-07) and this gate cannot drift. The comment that claimed "there is deliberately NO host-facing
control" is retired — leaving it would have made it this change's own alibi.

**`hourlyRateCents` and `dayRateCents` moved from object-level `.positive()` required to
`.positive().optional()`**, with the requirement re-imposed inside `superRefine` for `exclusive` only.
The requirement did not weaken; it moved. An open listing has no rates at all (OC-08), so a top-level
requirement made every drop-in listing permanently unpublishable.

The open branch requires, each with its own host-facing literal:

| Rule | Field | Source |
|---|---|---|
| a price per person | `perHeadPriceCents` | OC-08 / D-123 |
| a positive daily cap | `maxOccupancy` | D-124 (A2 reuses this column as the cap) |
| instant booking only | `bookingMode` | OC-10 |
| exactly one unit | `unitCount` | 09-RESEARCH A4 / Q3 |
| no extra-guest pricing | `extraHeadFee` | D-110 |

`draftSchema` gains `perHeadPriceCents: z.number().int().min(0).optional()` — `≥ 0` rather than
`.positive()` so a half-typed value still autosaves (D-01), exactly like `extraHeadFee`.

### 2. The OC-17 lock (`src/lib/listing/mode-lock.ts`)

One query, one authority:

```sql
SELECT count(*)::int AS n, MAX(ends_at) AS unlocks_at
FROM booking
WHERE listing_id = $1
  AND ends_at > now()
  AND (status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
```

Returns `{ locked, lockedByCount, unlocksAt }` — the exact payload 09-UI-SPEC § 1f's alert needs to say
**why**, **when it lifts**, and (via cancellation) **a way out** (O7). `ends_at > now()` is what makes
"upcoming or active" true: a finished session cannot be stranded, so a host is never frozen out by their
own back catalogue. A lapsed hold does not lock (D-48a lazy expiry) and a cancelled booking never locks —
which is precisely why "cancel those bookings first" is a real escape hatch with no release code behind it.
The DB clock is the only clock.

### 3. Enforcement + threading (`src/app/actions/listing.ts`)

`saveListingStep` refuses a mode change against the PERSISTED mode and the live booking set
(threat T-09-19). The guard is deliberately **change-only** (`d.occupancyMode !== owned.occupancyMode`):
every autosave of an unrelated step re-sends the stored mode, and refusing those would freeze the whole
wizard for any host with a booking on the calendar. `perHeadPriceCents` joins the explicit patch whitelist
with the same forward-only note as the tier and the group fields; `publishListing` re-parses
`perHeadPriceCents` and `unitCount` from the persisted row (threat T-09-20).

**Why this gate carries more weight than a normal courtesy-vs-gate split:** 09-01 narrowed
`booking_no_overlap` to `... AND open_capacity = false`, so the database will happily hold both row shapes
for one listing. Nothing at the DB layer stops a mixed listing. This guard plus the publish fork are the
entire defence.

## Verification

```
npx vitest run tests/validation tests/listing   → 12 files, 134 tests, all green
npx vitest run (full)                           → 899 passed / 4 skipped (100 files)
npx tsc --noEmit                                → 0
npm run lint                                    → 0 errors / 7 baseline warnings
```

**Mutation verification (all four confirmed RED, then restored):**

| Mutation | Expected RED | Observed |
|---|---|---|
| neutralise the OC-17 refusal in `saveListingStep` | (7) | (7) failed, 8 passed |
| drop `&& d.occupancyMode !== owned.occupancyMode` | (8) | (8) failed, 8 passed |
| drop `AND ends_at > now()` from the lock query | (3) | (3) and (9) failed |
| drop `AND expires_at > now()` from the status test | (4b) | (4) failed, 8 passed |

**Grep gates (Task 1 — all satisfied):**

| Gate | Result |
|---|---|
| `["exclusive", "open_capacity"] as const` | 1 |
| each of the six new literals | 1 each |
| `MODE_LOCKED_MESSAGE` literal | 1 |
| `Base price covers must be fewer` (08-20 gate survives) | 1 |
| `hourlyRateCents: z.number().int().positive(),` | 0 |
| `hourlyRateCents: z.number().int().positive().optional()` | 1 |

**Grep gates (Task 2):** `export async function getModeLockState` = 1; `unitCount: row.unitCount` = 1;
`perHeadPriceCents` in the action = 2 (save patch + publish re-parse); `the Zod enum has exactly one` = 0;
`new Date()|Date.now()` in `mode-lock.ts` = 0. Two gates were restated — see Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two Task-2 acceptance greps were unsatisfiable as written**
- **Found during:** Task 2 verification
- **Issue:** The plan asserts `grep -c "getModeLockState" src/app/actions/listing.ts` == 1 and
  `grep -c "MODE_LOCKED_MESSAGE" src/app/actions/listing.ts` == 1. Both symbols must be IMPORTED to be
  used, and a named import always contributes its own matching line, so the true count is 2 for each —
  the same class of unsatisfiable gate 09-02 hit with `openTakenSql`.
- **Fix:** Counted the load-bearing form instead: call sites `grep -c "getModeLockState("` = 1 and usages
  `grep -c "\[MODE_LOCKED_MESSAGE\]"` = 1. The plan's INTENT — exactly one call site, exactly one refusal
  — is satisfied and verified. No code change.
- **Commit:** 0590cf3

**2. [Rule 1 - Bug] A comment defeated its own grep tripwire**
- **Found during:** Task 2 verification
- **Issue:** `grep -c "new Date()\|Date.now()" src/lib/listing/mode-lock.ts` returned 1 — from the doc
  comment asserting "no `new Date()` in this module". The tripwire the plan wanted would have been
  permanently red for a file that does exactly what the plan asked.
- **Fix:** Reworded the ban in prose ("no JS wall clock anywhere in this module") and noted explicitly
  that the one `new Date(...)` in the body is a PARSE of a DB-returned value, not a clock read. Gate now
  returns 0. Same reword-not-reimplement resolution 09-01 applied to three of its own greps.
- **Commit:** 0590cf3

**3. [Rule 1 - Bug] The plan's `validOpenPublish` fixture used a space type outside the D-08 vocabulary**
- **Found during:** Task 1
- **Issue:** The plan describes the open fixture as "the shipped `validPublish` minus the rates"; written
  out in full, `primarySpaceType: "gym"` is not a member of `spaceTypeValues` (the real key is
  `gym_fitness_floor`). The base object parse then aborted, so `superRefine` never ran and SEVEN of the
  new cases failed for a reason that had nothing to do with the fork.
- **Fix:** Corrected the fixture to `gym_fitness_floor`.
- **Commit:** 10c0794

### Intentional Choices Not Spelled Out by the Plan

- **Zod-4 semantics probed before writing the fork.** `superRefine` runs when a base *check* fails
  (`maxOccupancy: 0`) but is skipped when a required field is *missing*. `DROP_IN_CAP_REQUIRED_MESSAGE`
  is therefore reachable for a bad cap and NOT for an absent one — see Deferred Issues.
- **The open branch `return`s before the surcharge rule** rather than evaluating both, so a listing that
  is both open-mode and carrying group pricing reads ONE reason instead of two.
- **`unitCount` was added to `publishSchema` only, not `draftSchema`** — there is no wizard control for it,
  so accepting it on autosave would create a write path for a field the host cannot see.
- **The lock mirrors the EXCLUSIVE occupying predicate**, which is wider than `OPEN_OCCUPYING_STATUS_SQL`.
  Deliberate: the lock must count whatever is currently on the calendar, whichever arbiter minted it.

## Deferred Issues

**A MISSING drop-in cap shows Zod's generic `invalid_type` message, not `DROP_IN_CAP_REQUIRED_MESSAGE`.**
`maxOccupancy` stays required-`.positive()` at the object level exactly as the plan specifies, and Zod 4
aborts before `superRefine` on a missing required field. The publish is still correctly BLOCKED and the
`fieldErrors` key is still `maxOccupancy`, so the checklist row (09-07) resolves to the right label — only
the inline message text is generic. Two clean fixes exist if 09-07 wants the drop-in wording there too:
make `maxOccupancy` object-level optional and require it per mode (mirroring the rates), or have
`publishListing` substitute the copy the way it already does for `cancellationPolicy`. Not fixed here
because the plan explicitly pins `maxOccupancy` at the object level and 09-07 owns the checklist.

## Requirement Status

`OPEN-01` ("Host can set a listing to open-capacity mode with a per-head price and a capacity cap") is left
**Pending** in REQUIREMENTS.md, not marked Complete. This plan ships the entire SERVER half — the gate, the
copy, the lock — but the host-facing control that lets a host actually *set* the mode is 09-10's wizard step.
Marking it complete now would claim a capability no host can reach. Same convention 09-02 applied to
OPEN-02/OPEN-03.

## Known Stubs

None. Every constant added is consumed by the gate that owns it; `MODE_LOCKED_MESSAGE` and
`OCCUPANCY_MODE_VALUES` are exported for 09-07's wizard, which is the next plan in the wave that renders
them, and `getModeLockState`'s `lockedByCount` / `unlocksAt` are the alert's declared data contract.

## Threat Flags

None. Every surface touched is inside the plan's own register (T-09-19 mode switch, T-09-20 mis-configured
publish, T-09-21 smuggled autosave fields, T-09-22 accepted forward-only price edit). No new network
endpoint, auth path, file access or schema change was introduced — this plan adds zero migrations.

## Self-Check: PASSED

- `src/lib/validation/listing.ts` — FOUND (modified)
- `src/lib/listing/mode-lock.ts` — FOUND (created)
- `src/app/actions/listing.ts` — FOUND (modified)
- `tests/validation/listing-schema.test.ts` — FOUND (modified)
- `tests/listing/mode-lock.test.ts` — FOUND (created)
- commit `10c0794` — FOUND
- commit `0590cf3` — FOUND
