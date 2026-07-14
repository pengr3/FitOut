---
phase: 03-availability-the-double-booking-guarantee
reviewed: 2026-07-14T12:00:00Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - drizzle/0004_availability_tables.sql
  - drizzle/0005_booking_exclusion.sql
  - e2e/availability.spec.ts
  - package.json
  - src/app/(host)/host/listings/[id]/availability/page.tsx
  - src/app/actions/availability.ts
  - src/app/actions/blocks.ts
  - src/app/actions/operating-hours.ts
  - src/app/listings/[id]/page.tsx
  - src/components/availability/availability-calendar.tsx
  - src/components/availability/blocks-editor.tsx
  - src/components/availability/slot-picker.tsx
  - src/components/availability/slot-selection.ts
  - src/components/availability/weekly-hours-editor.tsx
  - src/components/ui/calendar.tsx
  - src/components/ui/scroll-area.tsx
  - src/components/ui/toggle-group.tsx
  - src/components/ui/toggle.tsx
  - src/lib/availability/read-model.ts
  - src/lib/availability/slots.ts
  - src/lib/availability/units.ts
  - src/lib/db/schema.ts
  - src/lib/pg.ts
  - src/lib/validation/availability.ts
  - src/lib/validation/booking.ts
  - tests/availability/blocks.test.ts
  - tests/availability/error-map.test.ts
  - tests/availability/exclusion-race.test.ts
  - tests/availability/hours-validation.test.ts
  - tests/availability/read-model.test.ts
  - tests/availability/slot-selection.test.ts
  - tests/availability/slots.test.ts
  - tests/availability/units.test.ts
  - tests/helpers/db.ts
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-07-14T12:00:00Z
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

This phase ships the availability read model, the host write paths (operating hours + close-only blocks), the booker range-fill SlotPicker, and — the keystone — the Postgres GiST `EXCLUDE` constraint that makes double-booking structurally impossible.

**The load-bearing invariant is sound.** I traced the double-booking guarantee end-to-end and it holds:
- `drizzle/0005` is the sole authority: `EXCLUDE USING gist (listing_id =, unit =, tstzrange(starts_at, ends_at, '[)') &&) WHERE status IN ('pending','confirmed')`. `booking.unit` is `NOT NULL`, so the `=` term is always concrete.
- The half-open `'[)'` bound and the `('pending','confirmed')` occupying set are **byte-for-byte identical** across the constraint (`0005`), the read model (`read-model.ts:105`), and the advisory find-free probe (`units.ts:54-55`). No range/status drift.
- `units.ts` carries **no app-level query-then-insert guard** — the SELECT is explicitly advisory and the DB rejects the loser. Both `23P01` and `40P01` drive a retry and both map to the clean "just taken" copy (`units.ts:76`, `units.ts:90`).
- Timezone conversion consistently avoids the `TZDate.toISOString()` offset-local pitfall by normalizing through the epoch (`new Date(tzdate.getTime()).toISOString()`) in every venue-local→UTC site (`slots.ts:42-43`, `read-model.ts:82-83`, `blocks.ts:74`).
- IDOR is re-checked server-side on **every** host write (`operating-hours.ts:40-48/64-67`, `blocks.ts:46-54/90-93/149-156`), not left to the `(host)` route group. Tests prove non-owner add/unblock/save all fail.

No Critical defects. The four Warnings are: a missing authorization + input-validation gate on the one public read action; a server-side validation gap on block `unit`; a latent retry-loop-in-transaction trap that will defeat SC#4 the moment Phase 4 wires it; and a duplicate-`Toaster` UI defect.

> No `<structural_findings>` block was provided for this run. All findings below are narrative (direct-read) findings.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Public `getDayAvailability` action has no published-status gate and no runtime input validation

**File:** `src/app/actions/availability.ts:20-25` (and `src/lib/availability/read-model.ts:60-86`)

**Issue:** `getDayAvailability` is a `"use server"` action reachable by any client. Two problems:

1. **Missing authorization gate.** It delegates straight to `getAvailability`, which looks up the listing by id only (`read-model.ts:69-72`) with **no `status = 'published'` check** (confirmed: `read-model.ts` never references `listing.status`). The public listing page carefully `notFound()`s draft/unlisted listings (`listings/[id]/page.tsx:121`), but this action bypasses that gate entirely. A caller who knows/leaks a **draft or unlisted** listing id can retrieve its timezone, unit count, operating hours, and busy/blocked windows (bookings surface as unavailable slots) — data the page deliberately hides. Ids are UUIDs so enumeration is impractical, but the gate is genuinely absent and inconsistent with the page.

2. **Missing input validation.** `dayLocal: { year; month; day }` is trusted as-is. Server-action arg types are **not** enforced at runtime, so a crafted call with `year: "abc"`/`NaN` flows into `new TZDate(NaN, …).getTime()` → `NaN`, then `new Date(NaN).toISOString()` at `read-model.ts:84` throws `RangeError: Invalid time value` — an unhandled 500. This is exactly the "never trust the client" discipline the phase mandates for the other actions, not applied here.

**Fix:** Validate and authorize before delegating:
```ts
import { z } from "zod";
const dayLocalSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
});

export async function getDayAvailability(listingId: string, dayLocal: unknown): Promise<DayAvailability> {
  const day = dayLocalSchema.parse(dayLocal);
  // Re-enforce the page's gate: only published, non-deleted listings expose availability.
  const [row] = await db
    .select({ status: listing.status })
    .from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  if (!row || row.status !== "published") {
    return { timezone: "UTC", unitCount: 0, hasHours: false, slots: [] };
  }
  return getAvailability(db, listingId, day);
}
```

### WR-02: `addBlock` never validates block `unit` against the listing's `unitCount`, so the read model miscounts free units

**File:** `src/app/actions/blocks.ts:81-134` · `src/lib/validation/availability.ts:90` · `src/lib/availability/read-model.ts:138-142`

**Issue:** `blockSchema.unit` is `z.number().int().min(1).nullable()` — **no upper bound**. `addBlock` inserts `b.unit` verbatim (`blocks.ts:125`) and has no access to / check against `owned.unitCount` (confirmed: `blocks.ts` never references `unitCount`). The `BlocksEditor` UI only offers `1..unitCount` (`blocks-editor.tsx:411`), but a crafted request can POST `unit: 999` on an 8-unit listing and it persists.

The read model then folds every distinct blocked/booked unit into a `Set` and computes `freeUnits = Math.max(0, unitCount - taken.size)` (`read-model.ts:142`). A phantom unit inflates `taken.size` without a corresponding real unit, so **`freeUnits` is under-reported**. Concrete failure: on a `unitCount: 1` listing, a block with `unit: 2` yields `taken = {2}`, `freeUnits = 1 - 1 = 0` → the slot renders **unavailable even though unit 1 is free**. This hides bookable inventory. (It fails safe with respect to the money invariant — it never over-reports availability, so it cannot cause a double-book — hence Warning, not Blocker.)

**Fix:** Cap `unit` server-side in `addBlock` (it already holds the owned listing row):
```ts
if (b.unit != null && b.unit > owned.unitCount) {
  return { ok: false, error: "That unit doesn't exist for this listing." };
}
```
Optionally also clamp defensively in the read model: only add to `taken` when `b.unit >= 1 && b.unit <= unitCount`.

### WR-03: `createBooking`'s retry loop cannot recover inside a DB transaction — a conflict surfaces as a raw 500, defeating SC#4

**File:** `src/lib/availability/units.ts:49-80`

**Issue:** The loop does `SELECT free unit → INSERT → on 23P01/40P01 continue` with **no per-attempt savepoint** (confirmed: `units.ts` has no `transaction`/savepoint wrapper). This is correct only in auto-commit mode, which is how the tests exercise it (`units.test.ts` passes `testDb.db`). But the module header states this is "the code path Phase 4 will call to actually insert a booking," and CLAUDE.md prescribes "**Wrap the booking insert in a transaction**; on constraint violation, return 'slot just taken'."

The moment Phase 4 does `db.transaction(tx => createBooking(tx, …))`, the loop breaks: the first `INSERT` that hits `23P01`/`40P01` puts Postgres into the **aborted-transaction** state. The `catch` calls `continue`, and the next iteration's `dbConn.execute(sql\`SELECT …\`)` (`units.ts:51`) fails with SQLSTATE **`25P02`** ("current transaction is aborted"). `25P02` is neither `23P01` nor `40P01`, so `units.ts:76` is false → `units.ts:77` re-throws it → `mapBookingError` re-throws unknown codes (`units.ts:93`) → **raw 500**. The clean "That time was just taken. Pick another slot." is never produced for the concurrent case — the exact SC#4 outcome the constraint exists to deliver is lost.

**Fix:** Make each attempt its own savepoint so a conflict rolls back only that attempt, or contract-enforce auto-commit. With Drizzle, a nested `transaction` is a savepoint:
```ts
try {
  await dbConn.transaction(async (sp) => {
    await sp.insert(booking).values({ id: randomUUID(), listingId, bookerId, unit, startsAt, endsAt, status });
  });
  return unit;
} catch (e) {
  if (isPgError(e, "23P01") || isPgError(e, "40P01")) continue; // savepoint rolled back; outer tx still usable
  throw e;
}
```
At minimum, document in the header that `dbConn` MUST be auto-commit and add a Phase-4 integration test that wraps `createBooking` in `db.transaction` and asserts a concurrent conflict still maps to the clean message.

### WR-04: Duplicate `<Toaster />` on the host availability page produces double toasts

**File:** `src/components/availability/weekly-hours-editor.tsx:158` and `src/components/availability/blocks-editor.tsx:108`

**Issue:** The host availability page renders **both** `WeeklyHoursEditor` and `BlocksEditor` (`availability/page.tsx:103,114`), and each component mounts its own `<Toaster />` (confirmed via grep — no shared root `Toaster`). Sonner's `toast()` writes to a single global store that **every** mounted `Toaster` subscribes to and renders, so on this page a single `toast.success("Hours saved")` / `toast.success("Block added")` renders **twice** (one per region). This is a visible UI defect.

**Fix:** Mount `<Toaster />` exactly once, at a shared ancestor (the host layout or the availability `page.tsx`), and remove it from both editor components — matching the "single Toaster" convention.

## Info

### IN-01: `slotSelectionSchema` / `SlotSelection` are unused in the current codebase

**File:** `src/lib/validation/booking.ts:18-29`

**Issue:** Grep shows `slotSelectionSchema` is referenced only in `.planning/` docs — no source file imports it. The SlotPicker/rail use `SlotSelectionValue` from `slot-selection.ts` instead. This is intentional forward-scaffolding for Phase 4 (documented in the file header), but as shipped it is dead/unreferenced code, and its shape duplicates `slot-selection.ts:35`.

**Fix:** Acceptable to keep as Phase-4 scaffolding; add a one-line `// Unused until Phase 4` marker so a future dead-code sweep doesn't delete it, or wire it into the client selection lift now to avoid two parallel `{startUtc,endUtc,fullDay}` type definitions.

### IN-02: `formatMoney` duplicated across the page and the calendar client

**File:** `src/components/availability/availability-calendar.tsx:65-76` and `src/app/listings/[id]/page.tsx:64-75`

**Issue:** Identical `Intl.NumberFormat` money formatter is copied into three places (these two plus `listing-card`, per the comments) with a "keep in sync" note — a drift hazard if the rounding/fraction rules ever change.

**Fix:** Extract one `formatMoney(cents, currency)` into a shared `@/lib/money` and import it everywhere.

### IN-03: `handleDaySelect` swallows availability-fetch failures with no user feedback

**File:** `src/components/availability/availability-calendar.tsx:143-148`

**Issue:** The fetch uses `try { … } finally { setLoading(false) }` with no `catch`. If `getDayAvailability` rejects (network error, or the WR-01 malformed-input 500), the rejection is unhandled and `dayAvail` silently retains the previous day's slots — the user sees stale availability for the newly-picked day with no error.

**Fix:** Add a `catch` that surfaces a toast/inline error and clears or flags `dayAvail` (e.g. show the existing "No availability yet" empty state) so the UI can't present a stale-but-plausible grid.

### IN-04: Hardcoded dev DB credentials as fallback in test helpers

**File:** `tests/helpers/db.ts:40` and `e2e/availability.spec.ts:33`

**Issue:** `process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout"` embeds a credentialed connection string. These are well-known local-dev defaults in test-only code (not production), so risk is low, but it is a credential literal in the repo.

**Fix:** Prefer failing loudly when `DATABASE_URL` is unset in CI, or centralize the dev fallback in one test-config helper so it isn't copy-pasted.

### IN-05: E2E `selectTargetDay` uses `.first()` with `showOutsideDays` enabled — fragile day selection

**File:** `e2e/availability.spec.ts:144-149`

**Issue:** The calendar renders with `showOutsideDays` defaulting to `true` (`calendar.tsx:18`), so a target day near a month boundary can appear **twice** (once as an outside/adjacent-month cell, once as the in-month cell) with the same `aria-label`. `page.getByRole("button", { name: targetDayLabel }).first()` may click the outside/disabled occurrence, making the test flaky for boundary-adjacent target days.

**Fix:** Scope the locator to the active month grid, or filter to the enabled cell (e.g. `.and(page.locator(':not([disabled])')`), rather than `.first()`.

### IN-06: `WeeklyHoursEditor` accepts a `timezone` prop it never uses

**File:** `src/components/availability/weekly-hours-editor.tsx:71-82`

**Issue:** `timezone` is declared in the props type (with a comment that it's accepted "for a consistent editor contract") but is not destructured or used; the tz note is built from `cityLabel`/`gmtLabel`. Documented-intentional, but it is a dead parameter passed from `page.tsx:105`.

**Fix:** Either drop the prop and its call-site argument, or actually use it (e.g. derive the label from it) to justify the contract.

---

_Reviewed: 2026-07-14T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
