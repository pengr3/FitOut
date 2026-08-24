---
quick_id: 260824-dbc
slug: host-hours-reason-and-approve-clip
created: 2026-08-24
source: Phase 14 UAT pass — PM verdict on findings F-1 and F-2
autonomous: true
files_modified:
  - src/components/availability/weekly-hours-editor.tsx
  - src/app/(host)/host/bookings/page.tsx
  - tests/availability/week-strip.test.tsx
  - .planning/phases/14-host-tooling/14-UAT-LOG.md
---

# Quick — name the reason on an impossible hours row, and settle the Approve clipping

Both items come from the Phase 14 UAT pass (`.planning/phases/14-host-tooling/14-UAT-LOG.md` § Findings).
Both walks PASSED; these are the two findings raised alongside them. **F-1 carries an explicit PM
decision. F-2 does not — it needs measuring before it needs fixing.**

## Task 1 — F-1: explain the impossible window on its own row, and keep Save live

**The PM's decision, verbatim from the UAT question they answered:**
> *"Show the reason next to the offending day and leave the button pressable. The host learns what's wrong
> without the UI second-guessing them, and the server stays the authority on what can be saved. Matches how
> the rest of the app treats validation."*

**What is true today** (observed in the UAT pass, and stated there as a hypothesis rather than a diagnosis —
**verify it before building on it**): setting Monday to open 18:00 / close 06:00 renders no message on the
row. The shared schema already carries the sentence — `Close time must be after open time.` at
`src/lib/validation/availability.ts:59-61` — and the strip correctly draws Monday as empty. The suspected
mechanism is that the form validates on change, the field the host last touched is `openTime`, and the
schema attaches the message to `closeTime`, so it is computed but never surfaced for the changed field.

**Do this:**
1. **Confirm the mechanism first.** If the real cause differs from the hypothesis above, say so plainly in
   the SUMMARY and fix the real one. Do not build on a guess.
2. Surface the EXISTING schema sentence on the offending day's row. **Do not invent a second copy of that
   message** — one authority, `weeklyHoursSchema`, exactly as the client/server split already requires.
3. **Save stays enabled.** Do not disable it, do not gate it on client validity. The server re-validates
   every write with the same schema and remains the authority on what can be stored (D-130).
4. Cover it: changing one day's window to an impossible pair renders the reason on THAT day's row, and the
   Save control's `disabled` state is unchanged. **Observe the new assertion failing** against the tree as
   it is today before trusting it.

## Task 2 — F-2: measure the Approve clipping, then decide

**No PM decision attached — this was reported, not ruled on.** The UAT pass measured the table container at
`clientWidth` 864 against `scrollWidth` 992 at 1280px, with the Approve button running ~26px past the clip
edge, and **stated its own caveat**: the fixture's space titles ("Makati Rooftop Court", "Venice Beach Yoga
Studio") are longer than the seeded catalogue's, and the Space column is what pushes the table over. It may
not reproduce with ordinary space names.

**Do this, in order:**
1. **Reproduce it against the SEEDED catalogue's real titles**, not the UAT fixture's. If it does not
   reproduce, say so and stop — record it in the UAT log as a fixture artefact and change no source.
2. If it DOES reproduce with ordinary titles, it is a real defect on a primary action and worth fixing.
   The container is already `w-full overflow-x-auto`, so the content is reachable by scrolling; the problem
   is that at rest the primary action reads as cut in half. Prefer the smallest change that keeps the
   actions column whole at 1280px.
3. **`tests/design/elevation-z.test.ts:306` pins `/host/bookings` at exactly ONE raised-elevation element**
   (the `?listing=` select). Do not disturb it.
4. **D-154 stands:** this route gets the design system and NOT a new information architecture. The tab
   partition, the `?listing=` filter, the page size, the cursor and the owner-scoped WHERE are untouched.
   Widening or reordering columns is fine; adding filtering or sorting is not.

## Task 3 — close the loop in the UAT log

Update `.planning/phases/14-host-tooling/14-UAT-LOG.md` § Findings so F-1 and F-2 each carry their
disposition and the commit that resolved them — or, for F-2, the measurement that showed there was nothing
to resolve.
