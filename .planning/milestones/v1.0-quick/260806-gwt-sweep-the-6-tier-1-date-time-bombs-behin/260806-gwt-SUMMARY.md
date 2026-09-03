---
phase: quick-260806-gwt
quick_id: 260806-gwt
plan: 01
type: execute
subsystem: tests/booking fixtures
tags: [time-bombs, test-fixtures, mutation-testing, DEF-IR9-01]
requires: ["tests/helpers/db.ts", "src/lib/payments/config.ts", "src/lib/availability/slots.ts"]
provides: ["tests/helpers/dates.ts"]
affects: ["tests/booking/*.test.ts (6 files)"]
tech-stack:
  added: []
  patterns: ["clock-relative fixture derivation via TZDate", "in-helper fixture self-check called from beforeAll"]
key-files:
  created: ["tests/helpers/dates.ts"]
  modified:
    - tests/booking/hold-expiry.test.ts
    - tests/booking/pending-hold.test.ts
    - tests/booking/state-machine.test.ts
    - tests/booking/request-expiry.test.ts
    - tests/booking/request-lifecycle.test.ts
    - tests/booking/notify-emission.test.ts
    - .planning/quick/260805-nb7-fix-def-ir9-01-time-bomb-make-hold-expir/deferred-items.md
decisions: [D-GWT-01, D-GWT-02, D-GWT-03, D-GWT-04]
requirements: [TIER1-01, TIER1-02, TIER1-03, TIER1-04, TIER1-05, TIER1-06]
metrics:
  duration: ~65 min
  completed: 2026-08-06
  tasks: 3
  commits: 3
  mutations_executed: 7
---

# Quick 260806-gwt: Sweep the 6 Tier-1 date time bombs Summary

All six Tier-1 booking windows now derive from real `now()` at run time through one shared, self-checking
`tests/helpers/dates.ts` — the 2026-09-01 double fuse and the four behind it cannot fire, and every
converted file was proven still-asserting by a mutation that turned it RED.

## What shipped

| Commit | Task |
|--------|------|
| `d2e314b` | Lift the derivation into `tests/helpers/dates.ts`; refactor `hold-expiry.test.ts` onto it |
| `d26ea11` | Convert `pending-hold`, `state-machine`, `request-expiry` (TIER1-01/-02/-04) |
| `277bff6` | Convert `request-lifecycle` (TIER1-03/-05) + `notify-emission` (TIER1-06); close the log |

`tests/helpers/dates.ts` exports all ten planned names (`VENUE_TZ`, `LocalDate`, `venueDateOf`,
`instantAt`, `venueDow`, `plusDays`, `LEAD_CLEARANCE_MS`, `VenueWindow`, `venueWindow`,
`assertBookableWindow`) and carries the two-clocks rationale, so nobody has to re-derive why a pinned
window is a time bomb by construction. `LEAD_CLEARANCE_MS` and the horizon check are computed from the
imported `MIN_LEAD_*` / `BOOKING_HORIZON_DAYS` constants, never copied numbers.

## Anti-vacuity: 7 mutations, all RED

Every mutation was restored by **editing the file back**, never `git checkout`. `src/` is byte-unchanged.

| # | File proven | Mutation | Observed RED |
|---|-------------|----------|--------------|
| A (re-run) | `hold-expiry` | `units.ts`: gate the in-tx stale-hold sweep with `AND false` | case 1(b) `expected false to be true` at `expect("ok" in res && res.ok).toBe(true)` — identical to the 2026-08-05 record, so the extraction is faithful |
| 1 | `pending-hold` | `units.ts`: gate the D-42 own-hold lookup with `AND false` | "idempotency (own-hold)" `expected false to be true` at `expect(isOk(second)).toBe(true)` (L125) |
| 2 | `state-machine` | `booking.ts`: delete the D-58 extend UPDATE | "extend-hold" `expected false to be true` at `expect(future).toBe(true)` (L228) |
| 3 | `request-expiry` | `request-expiry.ts`: flip `requested` terminal target declined→cancelled | "SLA auto-decline" `expected 'cancelled' to be 'declined'` at `expect(await readStatus(row.id)).toBe("declined")` (L196) |
| 4 | `request-lifecycle` HOLD_W | `units.ts`: hardcode inserted status to `'pending'` | "mints a REQUESTED hold…" `expected 'pending' to be 'requested'` at `expect(rows[0].status).toBe("requested")` (L336) |
| 5 | `request-lifecycle` HR_W | `host-requests.ts`: delete `AND expires_at > now()` | case (b) `expected true to be false` at `expect(res.ok).toBe(false)` (L763) |
| 6 | `notify-emission` | `booking.ts`: remove the `!res.replayed` emission guard | case (7) `…to have a length of 1 but got 2` at `expect(emissionsFor("request_received", holdId)).toHaveLength(1)` (L549) |

**No mutation came back green.** Full verbatim output is recorded in each file's own header.

## Divergences from the plan's predictions (recorded as observed, not smoothed over)

1. **Mutation 1 reddened BOTH D-42 arms**, not just own-hold. The concurrent-same-key 23505/23P01
   backstop re-reads through the same lookup to resolve the loser to the winner's row.
2. **Mutation 3 landed one assertion LATER than predicted** — and this is the informative one. The plan
   expected `expect(res).toEqual({ status: "declined", notified: true })` (L193) to fire. It did not:
   `expireOne` returns a **hardcoded** `{ status: "declined" }` literal rather than reading back what the
   UPDATE wrote, so the return-value assertion cannot detect a changed terminal status. Only the DB
   readback at L196 catches it. L193 is weaker than it looks.
3. **Mutation 4 also reddened case (c)** (mode-flip independence), which places its own request-mode hold
   before flipping the mode.
4. **Mutation 6 landed at L549, not L551.** The per-type assertions fire before the aggregate count.

## D-GWT-02 re-verified, not trusted

The plan required a per-file `grep -n "operatingHours\|operating_hours"` before omitting `weekday`,
because that decision's original premise was factually wrong. Actually run:

- `pending-hold`, `state-machine`, `request-expiry`, `notify-emission` → **no match** → `weekday` omitted.
- `request-lifecycle` → **match** (import L26, `addMondayHours` L143). Traced the call sites: 244/264/284,
  all inside the Tier-2 `getAvailability occupancy fan-out` describe (241–303), which uses only
  `AVAIL_S`/`AVAIL_E`/`DAY`/`NOW`/`SLOT_0600_START`. Neither Tier-1 family touches seeded hours →
  `weekday` correctly omitted for both.
- `hold-expiry` keeps `weekday: MONDAY` — it genuinely seeds `dayOfWeek: 1`.

## Verification

| Gate | Result |
|------|--------|
| `git status --porcelain -- src/` | prints nothing |
| `git diff --exit-code -- src/` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| Comment-stripped literal scan (6 files) | ONLY the 3 Tier-2 anchor lines (`NOW`, `SLOT_0600_START`, `AVAIL_E`) |
| `grep -c 'year: 2026, month: 8, day: 3'` | 1 (Tier-2 `DAY` intact) |
| Tier-2 anchor in `git diff` | absent entirely — byte-identical |
| All six `grep -l 'helpers/dates'` | 6/6 |
| `npx vitest run` | **125 files passed / 1 skipped; 1123 passed / 4 skipped / 0 failures** — exactly baseline |

## Scope held

Tier 2 untouched and re-documented as deliberately open (its trigger is a file gaining a write path, not
a date). Tier 3 untouched. The SQL lead guard was **not** made injectable — the fix is test-side only, as
the threat model required.

## Deviations from Plan

None. All three tasks executed as written; the plan's two review corrections (the D-GWT-02 re-grep and
`request-expiry`'s `instantAt` import) were both applied.

## Known Stubs

None.

## Self-Check: PASSED

- `tests/helpers/dates.ts` — FOUND
- All six modified test files — FOUND
- Commits `d2e314b`, `d26ea11`, `277bff6` — FOUND in `git log`
