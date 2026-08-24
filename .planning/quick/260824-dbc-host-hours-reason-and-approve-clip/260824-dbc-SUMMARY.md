---
type: quick
slug: dbc-host-hours-reason-and-approve-clip
completed: 2026-08-24
source: Phase 14 UAT pass — findings F-1 and F-2
duration: ~2h15m
tasks: 3
outcome: F-1 fixed · F-2 measured, diagnosed and ESCALATED (fix implemented, then reverted)
commits:
  - 6de5b5a  fix(260824-dbc): F-1 name the reason on an impossible hours row, Save left live
  - aff2941  fix(260824-dbc): F-2 stop clipping Approve on /host/bookings at 1280px
  - 423a0fe  docs(260824-dbc): record F-1 and F-2 dispositions in the phase 14 UAT log
  - 6a8e577  revert(260824-dbc): back out the F-2 wrap fix — it is a measurement decision, not a polish
  - 6baa049  docs(260824-dbc): correct F-2's disposition — measured and escalated, not fixed
  - 7b191fb  docs(260824-dbc): record three undeclared standing reds in e2e/availability.spec.ts
files_modified:
  - src/components/availability/weekly-hours-editor.tsx
  - tests/availability/week-strip.test.tsx
  - src/app/(host)/host/bookings/page.tsx  (comment only — the F-2 measurement, no behaviour)
  - .planning/phases/14-host-tooling/14-UAT-LOG.md
  - .planning/phases/14-host-tooling/deferred-items.md
open_decision: F-2 — un-clip the Approve control at the cost of a moved Phase-14 measurement, or leave the sideways scroll
---

# Name the reason on an impossible hours row; measure the Approve clip — Summary

F-1 is fixed: an impossible window now says why on its own row and **Save stays pressable**, with the
schema still the one authority for the sentence and the server still the authority for the write. F-2
reproduced **worse than reported** against the seeded catalogue, was diagnosed, was fixed, and the fix
was then **backed out** — the phase's own geometry gate showed it is a Phase-14 measurement decision
with a host-visible cost, not a two-class polish. That call is the PM's and is written up as a fork.

## F-1 — fixed (`6de5b5a`)

**The mechanism was measured before anything was built on it, which is what the plan asked for, and the
UAT log's hypothesis holds exactly.** `hoursWindowSchema` hangs its close-after-open refusal on the
`closeTime` path. React-hook-form's onChange path looks an error up at the path of the field that
*changed* — walking `windows.N.openTime` → `windows.N`, finding nothing there, and writing only that
empty result into form state. The sibling's issue was computed by the resolver on every keystroke and
then thrown away.

**The proof it was computed rather than never produced:** pressing *Save hours* in that same state DID
render the sentence and did NOT call the server action. So the message and its `<FormMessage />` wiring
were already correct — only the onChange path failed to populate them. That distinction is what made the
fix one line instead of a new error surface.

**Why the mistake is reachable at all, and only in one direction.** The close select disables every hour
at or before the current open, so the impossible pair cannot be typed forwards. It is reachable
*backwards* — drag a 5 AM–6 AM window's OPEN time to the evening — and that is exactly the path on which
the message never surfaced. The one way to make the mistake was the one way to not be told about it.

**The fix adds no rule and no sentence.** The open select re-asks the resolver about its own row's close
field after a change, so the answer lands at the path the existing message already reads.
`weeklyHoursSchema` remains the single authority for both the rule and its wording, on the client and on
the server. The sentence is not quoted anywhere new — not even in a comment.

**Save is untouched** (D-130). It is disabled only while a save is in flight. The server re-validates
every write with the same schema and stays the authority on what can be stored.

**Covered by `tests/availability/week-strip.test.tsx` cases (11) and (12)**, which read their expected
sentence **out of the schema** rather than spelling it, and locate the row by the weekday's own label
rather than by a container class. Both watched failing against the defect each names:

| Probe | Result |
|-------|--------|
| The fix removed (the tree as the UAT pass found it) | **2 failed / 10 passed** — both on `Unable to find an element with the text: Close time must be after open time.` |
| Save gated on client validity (`disabled={saving \|\| !form.formState.isValid}`) | **1 failed / 11 passed** — case (12) alone, on its own clause |

## F-2 — reproduced, measured, and escalated. No source change shipped.

### It reproduces, and the UAT log's caveat is wrong

The UAT pass filed a caveat that the clip might be an artefact of its fixture's long titles. **Tested,
and wrong in the direction that matters:** the seeded catalogue is the *worse* case, because
`QC Strength & Conditioning Gym` (30 characters) is longer than either fixture title. Driven in Chromium
at 1280px through a throwaway fixture carrying the catalogue's own five titles and cities
(`scripts/seed.ts:48-52`), with the UAT's own row shape — five upcoming bookings, three confirmed and
two requested:

| | `clientWidth` | `scrollWidth` | overflow | Approve box | past the clip edge |
|---|---|---|---|---|---|
| **Before** | 864 | 1043 | 179px | x=1060→1150 | **78 of its 90px** |
| **After the attempted fix** | 864 | 864 | 0 | x=881→971 | none — 101px clear |

Columns before: Guest 69 · Space 234 · **When 366** · Status 112 · Payout 63 · Actions 199.
After: Guest 69 · Space 174 · When 248 · Status 112 · Payout 63 · Actions 199.

So it is a real defect on a primary action and **three times worse than reported** (78px, not ~26px).

### The mechanism is not the Space column

The shared table cell forbids wrapping on every cell it renders. Two of this route's cells hold a
**sentence** rather than a token — the space title and the venue-local window label — so each
contributes its full unbroken length to the table's minimum width. The *window label* is the wider
offender at 366px. Between them they were 600 of those 1043 pixels.

### Why the fix was backed out (`6a8e577` reverts `aff2941`)

Letting exactly those two cells wrap removes the clip completely — the "After" row above is a real
measurement of that change, not a projection. It was implemented, measured, gated and committed. Then
`e2e/skeleton-geometry.spec.ts` was run, and went red:

```
host booking row · /host/bookings · 1280px: the resolved table measures 56.53px, but this shape
was measured at 36.52px when its height was declared.
Expected: <= 4   Received: 20.009999999999998
```

Twenty pixels is one line. Wrapping makes the desktop row two lines instead of one, and that has three
consequences that are decisions rather than mechanics:

1. **`HOST_BOOKING_ROW_HEIGHT`'s desktop value moves**, and `bookings/loading.tsx`'s plate redraws with
   it — a declared Phase-14 measurement that `[14-15]` pinned and `[14-16]` re-pinned, days ago.
2. **The row's height stops being a property of the row.** A table shares column widths across all its
   rows, so the resting row wraps or not depending on the widest label *anywhere in the list*. Two of
   this route's fixture rows are seeded relative to the clock — so the number starts moving with the
   calendar again, which is precisely the ambush `[14-16]` closed, re-opened one breakpoint up.
3. **Two further pinned cases in that file state "at 1280 nothing wraps" as a standing assumption**,
   which the fix falsifies.

The gate was not weakened and no inventory was moved. Doing this properly means measuring *both* wrap
counts at 1280 and seeding both at absolute instants, exactly as 320px already does — a plan-sized piece
of work on a measurement the phase just finished pinning twice, with a consequence every host sees.

**F-2 carries no PM ruling** and the plan framed it as measure-then-decide. It is measured. The
trade-off is host-visible, so it is not one to settle by shipping something that quietly implies an
answer.

### The fork, for the PM

| Option | What the host gets | What it costs |
|---|---|---|
| **Leave it** *(what is shipped today)* | The table scrolls sideways; nothing is unreachable | At rest, the Approve control on a pending row is **87% hidden** |
| **Let the two cells wrap** | Approve always whole, 101px clear; nothing to scroll | Every desktop row becomes two lines; a declared measurement and its loading plate move; the row height becomes calendar-coupled again unless both wrap counts are seeded and pinned |
| **Something else** | — | Widening the route's container means moving `HOST_LIST_SHELL`, which the frozen `/host/earnings` also reads. A sticky actions column touches the elevation inventory this route is pinned on. Neither is cheaper. |

### What was left behind instead of a fix

The measurement and the diagnosis, recorded twice so the next reader finds them before re-deriving them:
a comment block at the top of `src/app/(host)/host/bookings/page.tsx` (comment only — no behaviour), and
the full write-up with the fork table in `14-UAT-LOG.md` § F-2.

## Deviations from plan

**1. [Rule 4 — architectural] F-2's fix was implemented and then reverted rather than shipped.**
The plan pre-authorised a fix and asked for "the smallest change that keeps the actions column whole".
The smallest change turns out to move a declared Phase-14 measurement and re-open a calendar coupling
`[14-16]` had closed. Escalated rather than taken. Found during Task 2; commits `aff2941` → `6a8e577`.

**2. [Rule 3 — blocking] The plan's F-2 test target did not exist.**
`tests/design/host-bookings-wrap.test.tsx` was written as the F-2 gate (three cases, both watched
failing) and was deleted with the revert. Its measurement survives in the two documents above.

**3. [Out of scope — logged, not fixed] `e2e/availability.spec.ts` has four standing reds, not one.**
The phase has been carrying `:261` as *the* pre-existing red; run alone the file reports 160, 203, 236
and 261. **Verified not caused by this task** rather than assumed: backing the single source file out to
its pre-task content reproduced the same three (160/203/236), and `:261` passed in that run — the set is
not stable. Logged to `deferred-items.md` (`7b191fb`).

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0** |
| `npm run test:design` | **50 files · 837 passed · 3 skipped · 0 failed** — the declared baseline, restored exactly by the revert |
| `npx vitest run` (full) | **1885 passed / 5 skipped / 0 failed** — baseline 1883, **+2** = F-1's cases (11) and (12) |
| `npm run build` | **exit 0** |
| `git diff --stat drizzle/` | **empty** — zero schema migrations |
| `e2e/skeleton-geometry.spec.ts` (alone) | **14 passed** — the pinned geometry is exactly as the phase left it |
| `e2e/availability.spec.ts` (alone) | 4 failed — **all pre-existing**, see deviation 3 |
| F-2 fixture teardown | verified gone: 0 listings, 0 bookings, 0 users, 0 notifications |

Playwright was never invoked bare; DB-seeding specs were run alone. `--project=visual` was not used
(it does not exist on win32).

## Phase rules honoured

- No raw colour literals or bracketed type sizes added, in source **or in comments**; the banned
  spellings are named descriptively throughout.
- `tests/design/elevation-z.test.ts:306` untouched — the route still carries exactly one raised element.
- `brand-recipe.test.ts`'s host accent total untouched; no coral added to either surface.
- `earnings-freeze.test.ts` untouched — no `/host/earnings` or `payout-*` file was opened.
- Zero schema migrations.
- Save was not disabled; the server remains the authority (D-130).
- No editing power added to the hours editor (Phase 19's "copy to all" untouched).
- D-154 intact: no filter, sort, column or date range added to `/host/bookings`; the tab partition, the
  `?listing=` filter, the page size, the cursor and the owner-scoped WHERE were never opened.
- No gate weakened and no inventory moved to make a red go away — the one red that appeared is why F-2
  was escalated.
- Every new assertion watched failing against the defect it names, with the observed output recorded in
  each test file's own header.

## Self-Check: PASSED

All five modified files exist on disk, both planning artifacts exist, all six commits resolve, and
`tests/design/host-bookings-wrap.test.tsx` is absent as the revert intends.
