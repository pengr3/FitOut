---
quick_id: 260824-ght
slug: wrap-the-space-column
created: 2026-08-24
source: Phase 14 UAT finding F-2 — PM ruling #2, 2026-08-24
autonomous: true
---

# Quick — wrap the Space column so Decline is whole at rest

## The PM's ruling

> **"Wrap the space column."**

This is the second and final ruling on F-2. Quick `260824-ej2` shipped the first one (name the venue
timezone only when it varies), which took the When column 357 → 238px and freed **Approve**. It left
**51px** of overflow with the **Decline** control sitting in it — 43 of its 85px past the clip edge — and
named the Space column (234px, unchanged) as the remaining offender. This closes that.

## Why this is the safe half of the pair, and say so in the code

Quick `260824-dbc` implemented wrapping on **both** the space title and the venue-local window label,
measured it clean, and then **reverted it** (`aff2941` → `6a8e577`) because it re-coupled
`HOST_BOOKING_ROW_HEIGHT` to the calendar: the window label's text changes every day, so a shared-column
table's wrap count — and therefore the resting row height — started moving with the date again. That is the
exact ambush `[14-16]` closed at 320px.

**Wrapping the SPACE column alone does not have that property.** A space title is a stable string chosen by
the host; it does not change with the wall clock. The row height becomes a function of the longest space
NAME in the rendered set, which is stable, measurable, and seedable. Put that reasoning in the source
comment at the cell you change, so the next reader does not "helpfully" extend the wrap to the When column
and silently re-arm the trap.

## Task 1 — wrap the Space cell on `/host/bookings`

1. Let the Space cell wrap. The shared table cell forbids wrapping on every cell it renders — change this
   ONE cell's behaviour, not the shared primitive, unless you can show the primitive change is inert
   everywhere else it is used (it is used across the app; prefer the local change).
2. **Do not touch the When cell.** It stays non-wrapping. That is the whole point of this split.
3. Measure at 1280px against the **seeded catalogue's** real titles and cities (`scripts/seed.ts:48-52`) —
   not invented fixture names. Record `clientWidth` / `scrollWidth` / per-column widths, before and after,
   in the same table format `14-UAT-LOG.md` § F-2 already uses.
4. **The bar:** overflow reaches **zero**, and BOTH `Approve` and `Decline` are fully inside the container
   at rest with no sideways scroll. Anything less is not done — report the number rather than rounding it.

## Task 2 — re-measure and re-pin what wrapping moves

Wrapping changes the desktop row height whenever a title wraps.

1. Re-run `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` **alone**.
2. If `HOST_BOOKING_ROW_HEIGHT`'s desktop value moves, re-measure against the real rendered route and move
   the constant **with its argument**. Never widen a tolerance to absorb a wrap.
3. **Whatever you re-pin must stay date-independent** — that spec uses absolute far-future instants and a
   fixed-length title precisely so a height cannot drift overnight. Do not re-introduce a relative fixture.
4. **New obligation this change creates:** the resting row height now depends on the longest space title in
   the rendered set. **Seed that explicitly and pin it**, the way the 320px case already pins its wrap
   count — so a future catalogue with a longer name reports itself as a wrap change rather than as a
   mystery 20px. State the seeded title's length and the plateau it sits in.
5. `260824-ej2` reported that `/host/bookings` now has ONE height at 320px instead of two. Confirm that
   still holds after this change, or say plainly that it does not.

## Task 3 — `/host/requests` is in scope only if it measures over

That route renders the same space title in a similar table. **Measure it at 1280px before deciding.** If it
does not overflow, change nothing there and say so — consistency is not a reason to move a surface that is
already correct. If it does overflow, apply the same single-cell wrap with the same reasoning.

## Task 4 — record it

Update `.planning/phases/14-host-tooling/14-UAT-LOG.md` § F-2 with this ruling, the measured after-numbers,
and F-2's final disposition. Close the residue entry in `deferred-items.md` rather than leaving it open —
if the numbers say it is closed, say so there.
