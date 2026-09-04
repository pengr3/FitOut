---
quick_id: 260824-ej2
slug: host-timezone-suffix-when-it-varies
created: 2026-08-24
source: Phase 14 UAT finding F-2 — PM ruling, 2026-08-24
autonomous: true
---

# Quick — the venue-timezone suffix appears on host lists only when it VARIES

## The PM's ruling

F-2 measured the Approve control on `/host/bookings` as **87% clipped at 1280px** against the seeded
catalogue's real space names (container 864 vs `scrollWidth` 1043). The widest column is **When at 366px**,
because every row repeats `({City} time)`. Two fixes were offered and one was chosen:

> **"Show the timezone only when it varies."** Drop the suffix when all the host's spaces share one
> timezone; keep it when they don't. Attacks the widest column directly — no wrapping, no row-height
> change from wrapping, no re-pinned measurements from a second line.

The PM was told, and accepted, the cost: **this walks back the shipped rule that every time on a host
surface names its venue's timezone** (SC#2 / D-105), so a single-city host stops seeing it. That is the
ruling. Implement it; do not re-litigate it.

## The good news, and the boundary it sets

`composeWhenLabelShort` **already** omits the suffix when `city` is null — `when-label.ts:58` documents it
and `:131` implements it (`const citySuffix = input.city ? \` (${input.city} time)\` : ""`).

**So this is a CALL-SITE decision, not a formatter change.** Do NOT touch `src/lib/booking/when-label.ts`.
It is the single shared venue-local formatter and the BOOKER path renders through it too — a change there
would silently restyle booker surfaces this task has no ruling about.

## Task 1 — decide and implement "varies"

**Define it once, in one helper, used by every host list that adopts this.** The definition is yours, but
these two properties are required and the choice must be stated in the SUMMARY:

- It must be **truthful**: the suffix is present whenever two rendered rows could be read as the same
  clock when they are not.
- It must be **stable under the `?listing=` filter** in whichever direction you choose — either it depends
  on the rendered set (so filtering can remove the suffix, always truthful, mildly surprising) or on the
  host's distinct listing timezones (so it never flickers, occasionally shows a suffix that is not strictly
  needed). **Never-wrong is worth more than never-changes here**; if you pick the stable-but-redundant
  option, say why.

**Apply it to the host LIST surfaces that repeat the label per row:**
`/host/bookings` (the measured one), `/host/requests`, and `/host`'s agenda.

⚠ **`/host`'s agenda is the one to be careful with.** Walk A of the Phase 14 UAT **PASSED on 2026-08-24
specifically because the city name did the work** when the two rows straddled a date boundary — see
`14-UAT-LOG.md` § Walk A. That verdict must survive: with two zones the suffix STILL appears on the agenda.
If your "varies" rule cannot guarantee that, the rule is wrong, not Walk A.

Detail surfaces that render ONE booking (`/host/bookings/[id]`, emails, the booker path) keep the suffix
unconditionally — there is no "varies" to compute on a single row, and dropping it there is not what was
ruled on.

## Task 2 — re-measure what the shorter label moves

Dropping the suffix **shortens the label**, which changes wrap counts, which moves declared row heights.
`[14-15]` declared them and `[14-16]` re-pinned them after exactly this class of surprise.

1. Re-run `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` **alone**.
2. If a pinned height moves, **re-measure against the real rendered route** and move the constant with its
   argument — never widen a tolerance.
3. **Whatever you re-pin must stay date-independent.** `[14-16]`'s whole lesson is that a height seeded
   against `now()` is a time bomb; that spec now uses absolute far-future instants and a fixed-length title
   for exactly this reason. Do not re-introduce a relative fixture.
4. Confirm the clip is actually gone: measure `clientWidth` vs `scrollWidth` on `/host/bookings` at 1280px
   against the **seeded catalogue's** titles (`scripts/seed.ts:48-52`), not a fixture with invented names.
   Record the before/after numbers. F-2's table in the UAT log is the format to match.

## Task 3 — record it

Update `.planning/phases/14-host-tooling/14-UAT-LOG.md` § F-2 with the ruling, the implementation and the
measured after-numbers. If the SC#2 "every time names its venue timezone" rule is written down anywhere as
a standing contract, amend it there too with the PM's ruling and its date — a rule that has been overridden
must not stay on the books as if it were still true.
