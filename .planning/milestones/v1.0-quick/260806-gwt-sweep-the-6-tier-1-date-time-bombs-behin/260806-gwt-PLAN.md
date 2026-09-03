---
phase: quick-260806-gwt
quick_id: 260806-gwt
mode: quick-full
type: execute
plan: 01
wave: 1
depends_on: []
autonomous: true
requirements: [TIER1-01, TIER1-02, TIER1-03, TIER1-04, TIER1-05, TIER1-06]
files_modified:
  - tests/helpers/dates.ts
  - tests/booking/hold-expiry.test.ts
  - tests/booking/pending-hold.test.ts
  - tests/booking/state-machine.test.ts
  - tests/booking/request-expiry.test.ts
  - tests/booking/notify-emission.test.ts
  - tests/booking/request-lifecycle.test.ts
  - .planning/quick/260805-nb7-fix-def-ir9-01-time-bomb-make-hold-expir/deferred-items.md

must_haves:
  truths:
    - "TIER1-01..06: no Tier-1 hold window is a calendar literal any more — every window handed to createPendingHold/placeHold is derived from real now() at run time"
    - "hold-expiry.test.ts imports the shared derivation instead of owning it, still passes, and MUTATION A still turns it RED (the extraction is faithful, not a hollowing)"
    - "Each of the 5 converted files has a NEW verbatim RED recorded in its header, from a mutation targeting what THAT file uniquely proves"
    - "src/ is byte-unchanged at the end: `git status --porcelain -- src/` prints nothing"
    - "Tier 2 and Tier 3 are untouched — request-lifecycle.test.ts's read-model anchor (NOW / SLOT_0600_START / AVAIL_S / AVAIL_E / DAY) is byte-identical"
    - "request-expiry.test.ts still templates its per-booking windows by hour, so its seeded rows still cannot collide on booking_no_overlap"
    - "`npx tsc --noEmit` exits 0 and `npx vitest run` reports 0 failures"
    - "deferred-items.md records Tier 1 CLOSED, Tier 2 still open, and that the shared helper makes a Tier-2 conversion trivial"
  artifacts:
    - path: "tests/helpers/dates.ts"
      provides: "The single clock-relative venue-window derivation + its fixture self-check, lifted from hold-expiry.test.ts with rationale intact"
      exports: ["VENUE_TZ", "LocalDate", "venueDateOf", "instantAt", "venueDow", "plusDays", "LEAD_CLEARANCE_MS", "VenueWindow", "venueWindow", "assertBookableWindow"]
      min_lines: 90
    - path: "tests/booking/hold-expiry.test.ts"
      provides: "The proof the extraction is faithful — the reference file now consumes the helper"
      contains: "helpers/dates"
    - path: "tests/booking/pending-hold.test.ts"
      provides: "TIER1-01 converted + WR-03 hold-transaction mutation recorded"
    - path: "tests/booking/state-machine.test.ts"
      provides: "TIER1-02 converted + status-transition mutation recorded"
    - path: "tests/booking/request-expiry.test.ts"
      provides: "TIER1-04 converted (hour-templating preserved) + SLA-sweep mutation recorded"
    - path: "tests/booking/notify-emission.test.ts"
      provides: "TIER1-06 converted + replay-suppression mutation recorded"
    - path: "tests/booking/request-lifecycle.test.ts"
      provides: "TIER1-03 + TIER1-05 converted, Tier-2 anchor untouched, TWO mutations recorded"
  key_links:
    - from: "tests/booking/*.test.ts (all 6)"
      to: "tests/helpers/dates.ts"
      via: "import { venueWindow, assertBookableWindow } from '../helpers/dates'"
      pattern: "from \"\\.\\./helpers/dates\""
    - from: "tests/helpers/dates.ts"
      to: "src/lib/payments/config.ts + src/lib/availability/slots.ts"
      via: "the self-check asserts against the REAL guard constants, never a copied number"
      pattern: "MIN_LEAD_INSTANT_MINUTES|MIN_LEAD_REQUEST_HOURS|BOOKING_HORIZON_DAYS"
    - from: "tests/helpers/dates.ts"
      to: "@date-fns/tz TZDate"
      via: "the slotsForWindow idiom — never a hand-rolled +8 offset"
      pattern: "TZDate"
---

<objective>
Sweep the six Tier-1 date time bombs behind one shared `tests/helpers/dates.ts`, so that no booking
window handed to `createPendingHold` / `placeHold` is a calendar literal any more.

**Why now:** sites 1 and 2 both fuse on **2026-09-01** — two files go red at once, ~4 weeks out. This
exact failure already detonated once (DEF-IR9-01, `hold-expiry.test.ts`, red 2026-08-02 → 2026-08-05).

**Why it detonates at all:** `createPendingHold`'s D-96 lead-time guard is a SQL expression evaluated
against **Postgres `now()`**. `units.ts` documents the zero-JS-clock rule as deliberate. The JS clock can
be frozen; the DB clock cannot. A pinned window is therefore a time bomb *by construction*, and the fix
is on the TEST side only.

**Output:** one new helper, six converted test files, six new mutation records, an updated deferred-items
log, and `src/` byte-unchanged.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@CLAUDE.md
@.planning/quick/260805-nb7-fix-def-ir9-01-time-bomb-make-hold-expir/deferred-items.md
@tests/booking/hold-expiry.test.ts
@tests/helpers/db.ts
@src/lib/availability/slots.ts
@src/lib/payments/config.ts

<interfaces>
<!-- Extracted from the codebase. The executor should NOT go hunting for these. -->

The four constants the self-check must assert against (src/lib/payments/config.ts,
src/lib/availability/slots.ts) — import the NAMES, never the numbers:

  MIN_LEAD_INSTANT_MINUTES = 30      // instant-book lead guard (holdStatus 'pending')
  MIN_LEAD_REQUEST_HOURS   = 2       // request-to-book lead guard (holdStatus 'requested')
  MIN_APPROVE_WINDOW_HOURS = 1       // approveRequest refuses inside this
  APPROVAL_PAYMENT_WINDOW_HOURS = 12 // approveRequest sets LEAST(now()+12h, starts_at)
  BOOKING_HORIZON_DAYS     = 90      // D-26 display horizon (read model only)

The venue-local → UTC idiom this helper must mirror (src/lib/availability/slots.ts):

```ts
const start = new TZDate(y, m /* 0-based */, d, h, 0, 0, tz);
// TZDate.toISOString() renders "+08:00"; normalize through the epoch for a true "…Z":
new Date(start.getTime()).toISOString();
export function venueDayOfWeek(y, m, d, tz) { return new TZDate(y, m, d, 12, 0, 0, tz).getDay(); }
```

The ONLY clock-sensitive guard on the write path (src/lib/availability/units.ts:409-467) — verified,
not assumed. There is NO horizon check and NO operating-hours check in createPendingHold:

```ts
const leadIntervalSql = holdStatus === "requested"
  ? sql`make_interval(hours => ${MIN_LEAD_REQUEST_HOURS}::int)`
  : sql`make_interval(mins  => ${MIN_LEAD_INSTANT_MINUTES}::int)`;
leadOk: sql<boolean>`(${startIso}::timestamptz >= now() + ${leadIntervalSql})`
```

The distance-to-start constraint request-lifecycle's HR_* window silently depends on
(src/app/actions/host-requests.ts:205-217):

```sql
UPDATE booking SET status='approved',
  expires_at = LEAST(now() + make_interval(hours => 12), starts_at)
WHERE id=$1 AND status='requested' AND expires_at > now()
  AND starts_at > now() + make_interval(hours => 1)
```

Case (a) asserts `exp` lands within ±1h of `now()+12h`, so **HR_START must be > now()+11h** or the LEAST
cap silently shortens the window and the assertion fails. `minDaysOut: 5` clears it with room.
</interfaces>
</context>

<decisions>

## D-GWT-01 — The fixture self-check LIVES IN THE HELPER. (Asked for explicitly; decided.)

**Decision:** `assertBookableWindow(w, opts?)` ships in `tests/helpers/dates.ts` and every converted file
calls it in one line from a `beforeAll`. It is NOT re-hand-written six times.

**Justification:**
1. Three of its four invariants are *universal* (clears both D-96 lead guards; the window is exactly
   `hours × 1h`; inside the D-26 horizon). Only the weekday check is per-file, and that is exactly what a
   parameter is for.
2. Hand-copying a check into six files is the same act that produced six copies of a hardcoded date. The
   duplication IS the bug class being closed. Closing it in one place and re-duplicating a different
   thing beside it would be theatre.
3. It stays a **call**, not a module-load side effect, so the failure surfaces as a `beforeAll` failure
   attributed to the offending file — the loud-setup-failure property the reference file added on purpose.
4. It asserts against the imported CONSTANTS (`MIN_LEAD_*`, `BOOKING_HORIZON_DAYS`), so a future policy
   tune moves the check automatically instead of staling a literal — the same rule
   `request-lifecycle.test.ts:714-715` already states for `APPROVAL_PAYMENT_WINDOW_HOURS`.

It uses `expect` imported from `"vitest"` rather than `throw new Error`, so a break prints the same
familiar `AssertionError` shape the reference file produced. Helpers are not collected as test files
(`include: ["tests/**/*.test.ts"]`), so this is import-safe.

## D-GWT-02 — `MONDAY` becomes a `weekday?` PARAMETER, and it is OPTIONAL.

**CORRECTED after plan review — the original wording here was factually wrong, and the wrong version is
worth seeing so nobody re-derives it.** It claimed "only `hold-expiry.test.ts` seeds `operating_hours`;
the five conversion targets insert listings only." That is FALSE: `request-lifecycle.test.ts` imports
`operatingHours` and calls `addMondayHours` at lines 142-144 (invoked at 244/264/284).

The CONCLUSION survives, but only because of a fact the original premise never stated: those
`addMondayHours` calls are scoped **exclusively to the Tier-2 `describe("getAvailability occupancy
fan-out…")` block** and never touch the Tier-1 `HOLD_W` / `HR_W` sites at lines 120-121 and 628-629.
So the accurate claim is about SITES, not files:

> **No Tier-1 window site in any conversion target depends on seeded operating hours.** Neither
> `placeHold` (src/app/actions/booking.ts:122-232) nor `createPendingHold` consults `operating_hours`
> on the write path — note `placeHold`'s own comment claims the check is "re-derived inside
> createPendingHold", and it is NOT (an inaccurate comment, out of scope here, logged in
> deferred-items). So forcing a weekday on the Tier-1 sites would be pure noise.

Because the premise was wrong once, do NOT trust it a second time: Task 2 AND Task 3 each re-verify per
file with a grep before omitting `weekday`; a file that DOES seed hours must pass its own seeded
`dayOfWeek`.

## D-GWT-03 — `|| 7` is preserved as `minDaysOut >= 1`.

The original IIFE's `|| 7` is what stops a run ON the target weekday from targeting today (whose early
slot may already have passed). In the helper this becomes: the search STARTS at `today + max(1, minDaysOut)`
days, so "today" is never a candidate. Same guarantee, stated instead of encoded. A bounded roll-forward
loop then pushes out (7 days at a time when a weekday is pinned, 1 otherwise) until the start instant
clears `LEAD_CLEARANCE_MS` — so the derivation cannot produce a too-soon window even when run at 23:59
venue-local.

## D-GWT-04 — Venue-local hour `10` for the four `02:00Z` sites.

`02:00Z` IS `10:00` Asia/Manila. Deriving at venue-local hour 10 makes every converted window
venue-locally identical to the literal it replaces, so nothing about what the tests exercise changes.
`request-expiry` keeps its own hour numbers (see Task 2).

</decisions>

<tasks>

<task type="auto">
  <name>Task 1: Lift the derivation into tests/helpers/dates.ts and prove the extraction on hold-expiry</name>
  <files>tests/helpers/dates.ts (new), tests/booking/hold-expiry.test.ts</files>
  <action>
Create `tests/helpers/dates.ts`. Move the WHY block from `hold-expiry.test.ts:51-67` into it **with the
explanatory comments intact** (the two-clocks explanation, the "a pinned literal is a time bomb BY
CONSTRUCTION" sentence, and the NEVER-hand-roll-a-+8-offset rule). Adapt only the file-specific framing.
Add a short header stating this module is the single source of clock-relative fixture windows and that
DEF-IR9-01 is why it exists.

Export, lifted from `hold-expiry.test.ts:68-98` and generalised:

- `VENUE_TZ = "Asia/Manila"`
- `type LocalDate = { year: number; month: number; day: number }` — keep the `// month is 1-BASED` comment
- `venueDateOf(instant: Date, tz = VENUE_TZ): LocalDate` — the read-model `venueLocalDateParts` idiom
- `instantAt(d: LocalDate, hour: number, tz = VENUE_TZ): Date` — the `slotsForWindow` idiom: TZDate for the
  DST-correct mapping, then normalize through the epoch so it renders as "…Z". Keep that comment.
- `venueDow(d: LocalDate, tz = VENUE_TZ): number` — the `slots.ts venueDayOfWeek` idiom; keep the
  noon-avoids-midnight-ambiguity comment
- `plusDays(d: LocalDate, n: number, tz = VENUE_TZ): LocalDate`
- `LEAD_CLEARANCE_MS` = `Math.max(MIN_LEAD_INSTANT_MINUTES * 60_000, MIN_LEAD_REQUEST_HOURS * 3_600_000)`,
  imported from `@/lib/payments/config` — never the numbers
- `type VenueWindow = { day: LocalDate; hour: number; hours: number; tz: string; weekday: number;
  start: Date; end: Date; startUtc: string; endUtc: string }`
- `venueWindow(opts: { hour: number; weekday?: number; minDaysOut?: number; hours?: number; tz?: string }):
  VenueWindow`
- `assertBookableWindow(w: VenueWindow, opts?: { weekday?: number; withinHorizon?: boolean }): void`

`venueWindow` algorithm — write it as explicit steps, not a clever IIFE:
1. `let d = plusDays(venueDateOf(new Date(), tz), Math.max(1, minDaysOut ?? 1), tz)`. Comment that
   starting at >= today+1 is what makes "today" impossible — this is the original `|| 7`, stated (D-GWT-03).
2. If `weekday != null`, advance `d` one day at a time (at most 6) until `venueDow(d, tz) === weekday`.
3. While `instantAt(d, hour, tz).getTime() <= Date.now() + LEAD_CLEARANCE_MS`, advance by
   `weekday != null ? 7 : 1` days. Bound the loop (max 8 iterations) and `throw` with a diagnostic if it
   is ever exceeded — a runaway here must be loud, never a silent wrong window.
4. Build `start = instantAt(d, hour, tz)`, `end = instantAt(d, hour + (hours ?? 1), tz)` and return the
   full record, `startUtc`/`endUtc` as `.toISOString()`.

`assertBookableWindow` (import `expect` from `"vitest"`, per D-GWT-01) asserts, in this order:
- when `opts.weekday != null`: `expect(w.weekday).toBe(opts.weekday)` — the file seeds operating hours on
  that dayOfWeek ONLY
- `expect(w.start.getTime()).toBeGreaterThan(Date.now() + LEAD_CLEARANCE_MS)` — clears BOTH D-96 lead
  guards, which are SQL `now()` and not any injected JS clock
- when `opts.withinHorizon !== false`: `expect(w.start.getTime()).toBeLessThan(Date.now() +
  BOOKING_HORIZON_DAYS * 86_400_000)` — the D-26 horizon (read-model display only; the write path has no
  horizon check, verified in units.ts)
- `expect(w.end.getTime() - w.start.getTime()).toBe(w.hours * 3_600_000)` — on-the-hour slots (D-22)

Then refactor `tests/booking/hold-expiry.test.ts` to consume it:
- Delete the local `TZ`, `LocalDate`, `venueDateOf`, `instantAt`, `venueDow`, `plusDays` and the `DAY` IIFE.
  Import `VENUE_TZ`, `venueWindow`, `assertBookableWindow` from `"../helpers/dates"`.
- Keep `const MONDAY = 1;` in this file — it is THIS file's seeded weekday, not a global fact.
- `const W = venueWindow({ hour: 6, weekday: MONDAY });` then `const DAY = W.day; const S = W.start;
  const E = W.end; const SLOT_0600_START = W.startUtc;` so every existing call site stays byte-identical.
- `makeListing` uses the imported `VENUE_TZ` for `timezone`.
- Replace the four `expect(...)` lines in `beforeAll` with `assertBookableWindow(W, { weekday: MONDAY });`,
  keeping the "assert the derivation, don't assume it" rationale comment above it.
- Replace the deleted WHY block with a 3-4 line pointer: what moved, that DEF-IR9-01 is why, and
  `@tests/helpers/dates.ts`. Leave the existing THREE-MUTATIONS record (lines 14-38) untouched.

Then PROVE the extraction is faithful by re-running the reference file's own MUTATION A: in
`src/lib/availability/units.ts`, gate step (2)'s in-tx stale-hold sweep UPDATE (the
`AND status IN ('pending','requested','approved') AND expires_at <= now()` one, ~line 479) with
`AND false`. Run the file. Case 1 (b) MUST go RED with `expected false to be true` at
`expect("ok" in res && res.ok).toBe(true)`. Restore by EDITING THE LINE BACK — never `git checkout`.
If it does NOT go red, the extraction hollowed the file: stop and fix the extraction.
  </action>
  <verify>
    <automated>npx vitest run tests/booking/hold-expiry.test.ts</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>git status --porcelain -- src/</automated>
  </verify>
  <done>
`tests/helpers/dates.ts` exists and exports all ten names. `hold-expiry.test.ts` contains no local date
math and no calendar literal outside its comment headers; it imports from `../helpers/dates` and passes.
MUTATION A was re-run against the refactored file, produced the recorded RED verbatim, and was edited
back — `git status --porcelain -- src/` prints nothing. `npx tsc --noEmit` exits 0.
  </done>
</task>

<task type="auto">
  <name>Task 2: Convert pending-hold, state-machine and request-expiry (TIER1-01, -02, -04) with one mutation each</name>
  <files>tests/booking/pending-hold.test.ts, tests/booking/state-machine.test.ts, tests/booking/request-expiry.test.ts</files>
  <action>
For EACH file below, first re-verify the weekday question (D-GWT-02) rather than trusting this plan:
`grep -n "operatingHours\|operating_hours" <file>`. No match → omit `weekday`. A match → pass the seeded
`dayOfWeek` and say so in the comment. All three are expected to have no match.

**pending-hold.test.ts (TIER1-01, fuses 2026-09-01)** — replace lines 34-35:
- ⚠ `const DAY = 30000` already exists in this file as the DAY RATE. Do NOT introduce a `DAY` identifier.
  Name the window `W`.
- `const W = venueWindow({ hour: 10, minDaysOut: 3 });` `const START = W.startUtc;` `const END = W.endUtc;`
  — call sites pass strings and stay byte-identical.
- Rewrite the "A fixed future window" comment to say the window is DERIVED and why (SQL `now()` lead guard,
  not the JS clock). Add `assertBookableWindow(W);` as the first statement of the existing `beforeAll`,
  before `setupTestDb()`.

**state-machine.test.ts (TIER1-02, fuses 2026-09-01)** — replace lines 57-58 with the same shape
(`hour: 10`, `minDaysOut: 3`), keeping the existing per-listing-window comment's intent. Add
`assertBookableWindow(W);` as the first statement of `beforeAll`.

**request-expiry.test.ts (TIER1-04, fuses 2026-11-01)** — PRESERVE the hour-templating (hard constraint 4):
- `const BASE = venueWindow({ hour: 2, minDaysOut: 3 });` then `const START = BASE.startUtc;`
  `const END = BASE.endUtc;` — note `START/END` is exactly `windowAt(2)`, which is why they share a base.
- **IMPORT `instantAt` TOO** — this file needs `import { venueWindow, assertBookableWindow, instantAt } from "../helpers/dates"`, not just the first two. The rewritten `windowAt` below calls `instantAt` directly; omitting it is a `ReferenceError` at run time. (Caught in plan review; the task's own vitest gate would surface it loudly, but there is no reason to spend a cycle on it.)
- Rewrite `windowAt` to template off `BASE.day` in VENUE-LOCAL hours:
  `function windowAt(hour: number) { return { startsAt: instantAt(BASE.day, hour), endsAt: instantAt(BASE.day, hour + 1) }; }`
  Call sites keep passing 4, 5, 6, 7, 8 unchanged. Update its doc comment: the hour is now venue-local, and
  the per-booking distinctness (which is what keeps seeded rows off each other's `booking_no_overlap`) is
  unchanged — hours 2/4/5/6/7/8 on one day are still six disjoint 1-hour windows.
- Add `assertBookableWindow(BASE);` as the first statement of `beforeAll`. Comment that checking hour 2 is
  sufficient because it is the EARLIEST templated hour and every other window is strictly later that day.

Then run ONE mutation per file. Each must break what THAT file uniquely proves, on a case that USES the
derived window — a mutation that reddens some other case proves nothing about the conversion. Record the
verbatim RED (the assertion message AND the `expect(...)` line it fired on) in a dated block in that file's
header, matching the format already in `hold-expiry.test.ts:14-38`. Restore by EDITING BACK.

- `pending-hold` → **the WR-03 hold transaction.** In `src/lib/availability/units.ts`, neuter the D-42
  own-hold idempotency lookup: add `AND false` to the WHERE of the `SELECT id, unit, expires_at, ...` at
  ~line 297-304. Expect the "idempotency (own-hold)" case RED — a repeat submit now returns the false
  "just taken" the D-42 trap is named for.
- `state-machine` → **the status transitions.** In `src/app/actions/booking.ts`, delete the D-58 extend
  UPDATE (`SET expires_at = GREATEST(expires_at, now() + make_interval(mins => ${PAYMENT_WINDOW_MINUTES}))`,
  ~line 811-814). Expect the "extend-hold" case RED at `expect(future).toBe(true)` — a lapsed-but-pending
  hold is no longer pushed forward, so the sweep can take the slot mid-payment.
- `request-expiry` → **the SLA sweep.** In `src/inngest/functions/request-expiry.ts`, flip the `requested`
  terminal target from `declined` to `cancelled`. Expect the "SLA auto-decline" case RED at
  `expect(res).toEqual({ status: "declined", notified: true })` — this is the case that seeds at
  `windowAt(4)` and then re-holds the freed slot, so it is genuinely exercising the derived window.

**If any mutation does NOT go red, that conversion is vacuous.** Do not accept green as success: the file
has stopped asserting, which is strictly worse than a test that fails on a known date. Redo the conversion
(most likely cause: the derived window silently failed a guard and the case is now passing for the wrong
reason) before moving on.
  </action>
  <verify>
    <automated>npx vitest run tests/booking/pending-hold.test.ts tests/booking/state-machine.test.ts tests/booking/request-expiry.test.ts</automated>
    <automated>git status --porcelain -- src/</automated>
  </verify>
  <done>
All three files derive their windows from `venueWindow`, call `assertBookableWindow` in `beforeAll`, and
pass. `request-expiry` still templates by hour and its six windows are still disjoint. Each file's header
carries a NEW dated mutation record with verbatim RED output naming the exact case and assertion.
`git status --porcelain -- src/` prints nothing.
  </done>
</task>

<task type="auto">
  <name>Task 3: Convert request-lifecycle (TIER1-03 + -05) and notify-emission (TIER1-06), then close the log and run the full gates</name>
  <files>tests/booking/request-lifecycle.test.ts, tests/booking/notify-emission.test.ts, .planning/quick/260805-nb7-fix-def-ir9-01-time-bomb-make-hold-expir/deferred-items.md</files>
  <action>
**request-lifecycle.test.ts — two Tier-1 sites, and a Tier-2 anchor that MUST NOT MOVE.**

⚠ This file appears in BOTH tiers. Lines 113-117 (`DAY = { year: 2026, month: 8, day: 3 }`, `NOW`,
`SLOT_0600_START`, `AVAIL_S`, `AVAIL_E`) are **Tier 2 — leave byte-identical**. They are internally
consistent forever because `getAvailability` takes an injectable `now` pinned right beside the pinned day.
Rewriting them is churn on a working test. Only window families B and HR are Tier 1.

- Lines 120-121 (TIER1-03): `const HOLD_W = venueWindow({ hour: 10, minDaysOut: 3 });`
  `const START = HOLD_W.startUtc;` `const END = HOLD_W.endUtc;`. Do NOT name it `DAY` (taken, Tier-2) or
  `DAY_RATE` (taken). Keep the "no operating hours needed" note and add why it is now derived.
- Lines 628-629 (TIER1-05, inside the host approve/decline `describe`):
  `const HR_W = venueWindow({ hour: 10, minDaysOut: 5 });` `const HR_START = HR_W.startUtc;`
  `const HR_END = HR_W.endUtc;`. **`minDaysOut: 5` is load-bearing, not taste** — `approveRequest` sets
  `expires_at = LEAST(now() + APPROVAL_PAYMENT_WINDOW_HOURS, starts_at)` and case (a) asserts that lands
  within ±1h of `now()+12h`, so `HR_START` must be more than 11h out or the D-94 cap silently shortens the
  window and the case fails for a reason that has nothing to do with what it tests. State that in the
  comment. A different day from `HOLD_W` also preserves the existing two-distinct-families property.
- Add `assertBookableWindow(HOLD_W);` as the first statement of the module-level `beforeAll` (line 159) and
  `assertBookableWindow(HR_W);` as the first statement of the host-describe's own `beforeAll` (line 673).

**notify-emission.test.ts (TIER1-06)** — replace lines 505-506 inside the `describe`:
- `const W = venueWindow({ hour: 10, minDaysOut: 3 });` `const START = W.startUtc;` `const END = W.endUtc;`
- Add `beforeAll(() => assertBookableWindow(W));` INSIDE that same `describe`, right below the consts, so
  the window and its check stay together. Keep the existing "dedicated to this case's listing" comment.
- The other windows in this file are already clock-relative (`seedRequest`'s `msToStart`) — leave them.

Then run THREE mutations, recording verbatim RED in each file's header and restoring by EDITING BACK.

- `request-lifecycle` gets TWO — one per converted window family, because each site must be independently
  proven non-vacuous:
  1. **HOLD_W family → the request-to-book loop.** In `src/lib/availability/units.ts`, hardcode the
     inserted status to `'pending'` instead of the `holdStatus` parameter. Expect the createPendingHold
     parameterization case RED at `expect(rows[0].status).toBe("requested")` (and case (f)(a) too) — the
     06-04 request branch can no longer mint a `requested` hold.
  2. **HR_W family → the SLA guard.** In `src/app/actions/host-requests.ts`, delete `AND expires_at > now()`
     from `approveRequest`'s UPDATE WHERE (~line 214). Expect case (b) RED at `expect(res.ok).toBe(false)`
     — a host can now approve past the SLA the DB clock already closed.
- `notify-emission` gets ONE, and it MUST target case (7), the only case using the converted window: in
  `src/app/actions/booking.ts`, remove the `!res.replayed` guard on the request branch's emission pair.
  Expect case (7) RED at `expect(forThisBooking).toHaveLength(2)` (receives 4) — a double-submit now tells
  the host twice. Record in the header WHY this target and not the file's post-commit ordering harness: the
  ordering cases (1)-(6) already use clock-relative fixtures, so reddening them would say nothing about
  whether THIS conversion still asserts.

Same rule as Task 2: **a mutation that does not go red means that conversion is vacuous** — redo it rather
than banking the green.

**Close the log.** Update
`.planning/quick/260805-nb7-fix-def-ir9-01-time-bomb-make-hold-expir/deferred-items.md`:
- Mark the Tier-1 section **CLOSED** (quick task 260806-gwt, 2026-08-06), keeping the 6-site table as the
  historical record and adding the file each site now derives from.
- Say Tier 2 is **still open and still deliberately unfixed**: each file's injected `NOW` is pinned right
  beside its pinned day, so the pair stays internally consistent forever and the files are harmless as
  written. Note that `tests/helpers/dates.ts` now makes a Tier-2 conversion trivial IF one of those files
  ever gains a write path — that is the trigger, not a calendar date.
- Leave Tier 3 as-is (benign by design).
- Update the "Suggested fix" section to point at the shared helper as the landed pattern.

**Final gates**, in this order:
1. `git status --porcelain -- src/` → MUST print nothing. This is the byte-unchanged proof and it is
   scoped to `src/` precisely because every file under `src/` is tracked; `--porcelain` (not `diff`)
   catches an accidentally-created untracked file there too, which `git diff --exit-code` would miss.
2. `git diff --exit-code -- src/` → exits 0 (the explicitly requested gate).
3. `npx tsc --noEmit` → exits 0.
4. No calendar literal survives on any Tier-1 window. Strip `//` comments before counting, or the mutation
   records and rationale headers you just wrote will count themselves:
   `for f in tests/booking/hold-expiry.test.ts tests/booking/pending-hold.test.ts tests/booking/state-machine.test.ts tests/booking/request-lifecycle.test.ts tests/booking/request-expiry.test.ts tests/booking/notify-emission.test.ts; do sed 's,//.*,,' "$f" | grep -nE '"20[0-9]{2}-[0-9]{2}-[0-9]{2}' | sed "s,^,$f:,"; done`
   The ONLY acceptable output is request-lifecycle's Tier-2 anchor (`NOW`, `SLOT_0600_START`, `AVAIL_E`).
   Anything else in that output is an unconverted Tier-1 window. Also confirm the Tier-2 `DAY` literal is
   still present and untouched: `grep -c 'year: 2026, month: 8, day: 3' tests/booking/request-lifecycle.test.ts`
   MUST be 1.
5. `npx vitest run` → **0 failures**. Baseline before this task was 1123 passed / 4 skipped; the pass count
   must not DROP (it may rise by 0 — no new test cases are added by this plan).
  </action>
  <verify>
    <automated>npx vitest run</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>git diff --exit-code -- src/</automated>
  </verify>
  <done>
Both Tier-1 sites in `request-lifecycle.test.ts` derive from `venueWindow`; its Tier-2 anchor at 113-117 is
byte-identical to before this task. `notify-emission.test.ts` case (7) derives its window and self-checks
inside its own `describe`. Three new mutation records with verbatim RED are in the two file headers,
`notify-emission`'s recording why case (7) is the correct target. `deferred-items.md` marks Tier 1 CLOSED,
Tier 2 open, Tier 3 unchanged. `npx vitest run` reports 0 failures with the pass count at or above 1123,
`npx tsc --noEmit` exits 0, `git diff --exit-code -- src/` exits 0 and `git status --porcelain -- src/`
prints nothing, and the comment-stripped literal scan returns ONLY the three Tier-2 anchor lines.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| test fixtures → SQL guards evaluated against Postgres `now()` | The ONLY boundary this task touches. No production trust boundary moves: `src/` is byte-unchanged by construction. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-GWT-01 | Tampering | `src/` left mutated after a mutation cycle | mitigate | Restore by editing back, never `git checkout`. Gated by `git status --porcelain -- src/` (catches untracked too) AND `git diff --exit-code -- src/`, run at the end of every task. |
| T-GWT-02 | Repudiation | A conversion that silently stops asserting (false green) | mitigate | One mutation per converted file minimum, targeting that file's unique proof on a case using the derived window; verbatim RED recorded in-file. Plan states explicitly that a non-red mutation means the conversion is vacuous and must be redone. |
| T-GWT-03 | Tampering | Making the SQL lead guard injectable "to suit the test" | mitigate | Prohibited outright. The DB clock as sole expiry/lead authority is a deliberate project rule (`units.ts`: zero JS clock reads, asserted by grep in 07-05's acceptance criteria). The fix is test-side only. |
| T-GWT-04 | Denial of Service | Derivation loop runs away and yields a wrong window silently | mitigate | `venueWindow`'s roll-forward is bounded (max 8 iterations) and throws with a diagnostic rather than returning a wrong window. |
| T-GWT-SC | Tampering | npm/pip/cargo installs | n/a | No package installs. `@date-fns/tz` and `vitest` are already direct dependencies; no legitimacy gate applies. |
</threat_model>

<verification>
- `npx tsc --noEmit` exits 0.
- `npx vitest run` reports **0 failures**, pass count >= 1123 (baseline 1123 passed / 4 skipped).
- `git status --porcelain -- src/` prints nothing; `git diff --exit-code -- src/` exits 0.
- Comment-stripped scan of the six files yields ONLY request-lifecycle's three Tier-2 anchor lines.
- `grep -c 'year: 2026, month: 8, day: 3' tests/booking/request-lifecycle.test.ts` == 1 (Tier-2 intact).
- All six files `grep -l 'helpers/dates'`.
- Six new verbatim-RED mutation records exist across the five converted files (request-lifecycle has two)
  plus the re-run MUTATION A confirmation on hold-expiry.
</verification>

<success_criteria>
No booking window handed to `createPendingHold` / `placeHold` anywhere in `tests/` is a calendar literal.
Every one of them is derived at run time from real `now()` through one shared, self-checking helper — so
the 2026-09-01 double fuse, and the four behind it, cannot fire. Every converted file has been proven to
still assert by a mutation that turned it RED on the case it uniquely owns. `src/` is byte-unchanged, Tier
2 and Tier 3 are untouched, and the inventory says so.
</success_criteria>

<output>
Create `.planning/quick/260806-gwt-sweep-the-6-tier-1-date-time-bombs-behin/260806-gwt-SUMMARY.md` when done.
</output>
