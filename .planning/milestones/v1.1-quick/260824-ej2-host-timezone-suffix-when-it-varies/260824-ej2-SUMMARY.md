---
type: quick
quick_id: 260824-ej2
slug: host-timezone-suffix-when-it-varies
completed: 2026-08-24
source: Phase 14 UAT finding F-2 — PM ruling, 2026-08-24
duration: ~3h
tasks: 3
outcome: F-2 FIXED — Approve is whole with 50px clear; one declared row height moved, re-measured; Walk A is a gate now
commits:
  - ea61f5f  feat(260824-ej2): name the venue timezone on host lists only when it varies
  - a9eda75  fix(260824-ej2): re-measure and re-pin what the shorter host label moves
  - cd04a48  docs(260824-ej2): record F-2's ruling, its measured result, and the rule it walks back
files_created:
  - src/lib/booking/venue-clock-scope.ts
  - tests/booking/venue-clock-scope.test.ts
files_modified:
  - src/app/(host)/host/bookings/page.tsx
  - src/app/(host)/host/requests/page.tsx
  - src/app/(host)/host/page.tsx
  - src/components/host/host-booking-row.tsx     (docblock only)
  - src/components/host/request-row.tsx          (docblock only)
  - src/lib/design/measurements.ts
  - e2e/skeleton-geometry.spec.ts
  - e2e/host-dashboard.spec.ts
  - e2e/host-headings.spec.ts                    (docblock only)
  - .planning/phases/14-host-tooling/14-UAT-LOG.md
  - .planning/phases/14-host-tooling/deferred-items.md
decisions:
  - '"Varies" is keyed on the TIMEZONE, never on the city name — the seeded catalogue is five cities on one clock'
  - '"Varies" is computed over the RENDERED set, not the host''s listings — truthful by construction, and needs no query'
  - when-label.ts was NOT touched; the three host list call sites pass a projected city instead
  - HOST_AGENDA_ROW_HEIGHT 132 → 112, moved with its argument after a 13,020-label re-sweep
---

# The venue-timezone suffix appears on host lists only when it VARIES — Summary

The PM ruled on Phase 14 UAT finding F-2 and this implements it. **Approve is now entirely inside its
container with 50px to spare**, where it used to sit 69 of its 90 pixels past the clip edge. The
shorter label moved exactly one declared Phase-14 row height, and that number was re-measured with
`[14-16]`'s own instrument before it was moved rather than after it went red. Walk A's verdict — the
one thing the ruling could silently break — is now a gate in two places instead of a screenshot.

## Task 1 — where "varies" is defined, and the two choices inside it

**One helper, `src/lib/booking/venue-clock-scope.ts`, used by all three surfaces.** It exports a
predicate for its own test and a PROJECTOR for the call sites:

```ts
const listCity = resolveListCity(page.rows);   // once, over the whole rendered set
…
city: listCity(r),                              // per row
```

The projector shape is the point. Exporting only the predicate and letting each page write its own
ternary is three chances to compute "varies" **inside** the map, against one row, where it is always
false and the suffix vanishes everywhere — including on Walk A. Returning a function makes that
mistake unwritable.

### Choice 1 — keyed on the TIMEZONE, never on the city name

The suffix disambiguates a **clock**; a city is only a readable proxy for one. The seeded catalogue
(`scripts/seed.ts:48-52`) is **five listings in five different cities and one timezone** — Makati,
Mandaluyong, Pasig, Quezon City, Muntinlupa, all `Asia/Manila`. A city-keyed rule would have kept all
five suffixes, kept all 357px of the When column, and fixed nothing. This is not a theoretical
distinction: it is the difference between fixing F-2 and not, on the exact data the finding was
measured against. Watched failing — case (2) went red printing all five rows keeping a suffix they do
not need.

### Choice 2 — computed over the RENDERED set, not the host's listings

The plan offered both and said *never-wrong is worth more than never-changes*. The rendered set is the
never-wrong one: the suffix is present **exactly** when two rows on screen together could be read as
one clock while being two. It also needs **no new read** — every one of the three call sites already
projects `timezone` and `city` for the formatter — and a rule that needs a query is a rule the fourth
surface can adopt wrongly.

**The accepted consequence, stated rather than discovered:** "rendered set" means the rows on *this*
page of *this* tab under *this* filter. A two-zone host who filters `/host/bookings` to one space loses
the suffix; a host whose second zone only appears on page two sees it appear on *Load more*. Both are
truthful at the moment they are read.

### What was NOT touched

`src/lib/booking/when-label.ts`. It has always omitted the suffix for a null city (`:58` documents it,
`:131` implements it) and the **booker** path renders through it — a rule added there would have
silently restyled surfaces this ruling says nothing about. Detail surfaces that render ONE booking
(`/host/bookings/[id]`, the cancel review, the emails, the whole booker path) still name the zone
unconditionally: there is no "varies" to compute on a single row.

## Task 2 — what the shorter label moved, measured before it was trusted

Fourteen characters is a wrap count, and one wrapped `text-sm` line is 20px. So every declared row
height was re-swept with `[14-16]`'s own instrument — the meta paragraph swapped in place over all
2,604 date tokens `EEE, MMM d` can compose × five window spellings, **13,020 labels per shape** —
*before* anything was re-pinned:

| shape | 320px | 1280px | what the sweep said |
|---|---|---|---|
| agenda row · `/host` | **132 → 112** (4 → 3 meta lines) | 72 | 3 lines on **all 13,020** |
| request row · `/host/requests` | 254.05 (3 → 2 meta lines) | 83.02 | meta lost a line, height did not move |
| host booking row · `/host/bookings` | 176 (still 2 meta lines) | 36.52 | 2 lines on **all 13,020** — one outcome |

**Exactly one constant moved, and it moved with its argument.** `HOST_AGENDA_ROW_HEIGHT` 132 → 112 in
`measurements.ts`, with the sweep table, the plateau and the re-measured width ladder written beside it.

Three results are worth naming because they are stronger than "re-pinned":

1. **The fixture's title did not have to change, and now has more headroom.** `[14-16]` chose a
   24-character `HOST_LISTING_TITLE` because it was the length at which every date token wrapped the
   same way. Under the shorter label the plateau is **19-27 characters** (28 breaks: 12,885 at three
   lines, 135 at four), so the same title sits mid-plateau with ≥5 characters of margin below and 3
   above — wider than the 1-below/2-above it had before.
2. **`/host/bookings`' calendar coupling is closed at the source.** That shape used to have **two**
   heights at 320px (176 on 69% of dates, 196 on 31%), which is the whole reason `[14-16]` had to seed
   absolute instants. The shortened label wraps to two lines on **all 13,020** — one outcome, never a
   second. There is no longer a date this row can be seeded on that changes its height.
3. **The request row's insensitivity was confirmed from the other direction.** Its meta genuinely lost
   a line and its height did not move, because that 320px box is the status column, the description
   list and the actions row. The wrap-count clause is what makes those two separate reds.

**The width ladder was re-measured too**, since the docblock explains where the breakpoint sits: 112 at
320/360/375, 92 from 414 to 560, 72 at 639 and above. The row now reaches its floor **below** the `sm:`
breakpoint instead of at ~700px, so `sm:h-18` is exact from 640 up where it used to over-claim.

### The gate that lost its instrument, and what replaced it

`META_LINE_PX` (20) is the unit every derived expectation in that block is written in, and it used to be
measured as the **difference** between the bookings list's two wrap counts. That shape now has one
height, so the difference is structurally zero and cannot state it. Rather than let a load-bearing
constant become prose, a new `(step)` case measures it off the agenda row's two declared boxes —
(112 − 72) ÷ (3 − 1) — same card, same content, same padding, no DOM mutation. The subtraction also
proves the card's vertical padding is width-independent, which is what makes the subtraction legitimate.

The `(wrap)` case was rewritten rather than deleted: two absolute venue-local days seven months apart
now assert **one** height as an equality. That is a stronger statement than the two-heights version, and
a re-coupling to the calendar has to make two absolute dates disagree to pass it.

## Walk A — asserted, not assumed

Walk A passed **because** the city name on each line did the work. This ruling makes that name
conditional, so the verdict was one boolean away from being false and was held up by a screenshot from
earlier the same day. It is now asserted twice, and each was watched failing in **both** directions:

| Where | What it asserts | Watched red |
|---|---|---|
| `tests/booking/venue-clock-scope.test.ts` (1) | Walk A's own fixture, composed through the real formatter, against the two labels the UAT log records **verbatim** | `() => null` projector: 2 failed / 5 passed, printing `"Mon, Aug 24, 8:00 AM – 10:00 AM"` where the Makati suffix was expected |
| `e2e/host-dashboard.spec.ts` (7) | The **same** single-zone host from case (4) gains a listing in `America/Los_Angeles` with a session on that venue's own local today — and the suffix comes back **on every row** | `varies && false`: *"no agenda row names Los Angeles"*, Expected 1 / Received 0 — while case (4) stayed green |

That pairing is the design: an always-omit rule keeps a single-zone list correct and quietly breaks the
walk; an always-show rule keeps the walk and restores the clip. Each direction reddens exactly one case.

`e2e/host-dashboard.spec.ts` case (4) now asserts the **absence** of the suffix (Expected 0 / Received 3
under the always-show probe). Its retired clause was *"the city suffix, once — proof the labels came
through the venue-local composer"*; that proof is replaced by something stronger, which was already
there: three sessions seeded at three distinct **venue-local hours**, asserted verbatim. A page
rendering in the runner's zone fails on those, by name.

## F-2, measured before and after

Chromium at 1280px, throwaway fixture carrying the seeded catalogue's own five titles and cities, five
upcoming bookings (three confirmed, two requested), one per listing. **"Before" is a real measurement of
the fixed tree with the rule forced on** — not the previous task's numbers quoted back:

| | `clientWidth` | `scrollWidth` | overflow | Approve box | past the edge | Decline box | past the edge |
|---|---|---|---|---|---|---|---|
| **Before** | 864 | 1033 | 169px | x=1051→1141 | **69 of its 90px** | x=1149→1233 | **161px — wholly past it** |
| **After** | 864 | 915 | **51px** | x=932→1022 | **none — 50px clear** | x=1030→1115 | 43 of its 85px |

Columns before: Guest 69 · Space 234 · **When 357** · Status 112 · Payout 63 · Actions 199.
After: Guest 69 · Space 234 · **When 238** · Status 112 · Payout 63 · Actions 199. The When column lost
**119px**; nothing else moved.

**⚠ The finding is fixed and the route is not yet whole, and that is stated rather than rounded up.**
F-2 names the *Approve* control and Approve is whole. But 51px still overflows, and the **Decline**
button sits in it — improving from *entirely invisible at rest* to *about half visible*. The residue is
the **Space** column, the other half of `260824-dbc`'s two-sentence-cells diagnosis, which this ruling
did not address and whose only remaining levers are the ones the PM did not rule on. Logged to
`deferred-items.md` with the numbers.

## Task 3 — the rule that was walked back is off the books

A rule that has been overridden must not stay written as if it were still true. Every place that stated
it unconditionally now states the ruling and its date: `/host/requests`' page header (which read *"Every
time names the venue timezone (SC#2)"*), the `whenLabel` prop docblocks on `host-booking-row.tsx` and
`request-row.tsx`, and the venue-city constants in the three e2e specs that seed one. `14-UAT-LOG.md`
§ F-2 carries a **second** disposition beneath its first — the first one is the argument the ruling was
made on, so both are kept, in order — and Walk A's row in the discharged table names the two assertions
that now hold its verdict up.

## Deviations from plan

**1. [Rule 2 — missing critical coverage] The plan asked for `/host`'s agenda to keep Walk A true; it
did not ask for a route-level gate.** The unit test alone would have left the page's *wiring* unpinned —
whether the projector is actually computed over the right set on the rendered route. `e2e/host-dashboard.spec.ts`
case (7) closes that, and required extending the spec's fixture (a second listing helper, a
timezone-aware `addBooking`, and a teardown that sweeps **every** listing's bookings before the bookers —
`booking.booker_id` is ON DELETE RESTRICT). Found during Task 1; commit `a9eda75`.

**2. [Rule 3 — blocking] Three specs failed intermittently on "this seeded route rendered no rows",
and it was the dev server exhausting Postgres connections.** Observed on `skeleton-geometry` (D-57, a
*different theme* each run), and on two different `host-headings` cases on consecutive runs. Diagnosed
rather than retried: `docker exec … psql` refused with `FATAL: sorry, too many clients already` at the
same moment, so the ceiling was reached by the dev server and not by the specs' own `max: 1` clients —
19 connections immediately after a container restart, 27 after one spec file. **Verified not caused by
this task** rather than assumed: with the source change forced back to its pre-ruling behaviour the same
class of failure reproduced, at a *different* case. Worked around with a DB restart + route warm before
each gate; every gate then went green. Logged to `deferred-items.md` with the suggested source fix
(`globalThis`-cached db singleton).

**3. [Recorded, not a deviation] The plan anticipated re-tuning `HOST_LISTING_TITLE`.** The sweep said
it was unnecessary — the shipped title still sits on a plateau, a wider one than before — so it was left
alone. Changing a measured fixture constant that measurement says is correct would have been churn.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0** |
| `npm run test:design` | **50 files · 837 passed · 3 skipped · 0 failed** — the declared baseline, unmoved |
| `npx vitest run` (full) | **1892 passed / 5 skipped / 0 failed** — baseline 1885, **+7** = the new helper's cases |
| `npm run build` | **exit 0** |
| `git diff --stat drizzle/` | **empty** — zero schema migrations |
| `e2e/skeleton-geometry.spec.ts` (alone) | **15 passed** (14 before + the new `(step)` case) |
| `e2e/host-dashboard.spec.ts` (alone) | **7 passed** (6 before + Walk A's case 7) |
| `e2e/host-headings.spec.ts` (alone) | **14 passed** |
| `e2e/host-inbox-hierarchy.spec.ts` (alone) | **3 passed** |
| `e2e/overflow-320.spec.ts` (alone) | **46 passed / 15 skipped** |
| Throwaway fixture teardown | verified gone: 0 listings, 0 bookings, 0 users, 0 notifications for both harnesses |

Playwright was never invoked bare; every DB-seeding spec was run alone. `--project=visual` was not used
(it does not exist on win32). `e2e/availability.spec.ts`'s four standing reds were neither caused nor
fixed — no file this task touched is mounted by any of them.

## Phase rules honoured

- **`src/lib/booking/when-label.ts` was not modified.** Confirmed by `git diff` — it is not in any of
  the three commits.
- **Walk A's two-timezone case still shows the suffix**, asserted at unit and route level, both
  directions watched failing.
- No raw colour literals, no `rgb(`/`oklch(` spellings and no bracketed type sizes added, in source or
  in comments; banned tokens are named descriptively throughout.
- `tests/design/elevation-z.test.ts:306` untouched — `/host/bookings` still carries exactly one raised
  element. `brand-recipe.test.ts`'s host accent total untouched. No coral added.
- `tests/design/earnings-freeze.test.ts` untouched — no `/host/earnings` or `payout-*` file was opened.
- Zero schema migrations.
- **D-154 intact:** no filter, sort, column or date range added to `/host/bookings`; the tab partition,
  the `?listing=` filter, the page size, the cursor and the owner-scoped WHERE were never opened; money
  is still the server-frozen quote and time is still the DB clock read once and threaded.
- **Every re-pinned height is date-independent.** No fixture was put back on the clock; both 2099
  instants stay absolute; no tolerance was widened and no gate weakened — the one constant that moved
  moved with its measurement.
- Every new or changed assertion was watched failing against the defect it names, with the observed
  output recorded in each file's own header.

## Self-Check: PASSED

Both created files and both planning artifacts exist on disk; all three commits resolve; both throwaway
measurement harnesses are absent as intended. `git diff ea61f5f~1..cd04a48` is **empty** for
`src/lib/booking/when-label.ts` and for `drizzle/` — the two hard prohibitions, checked mechanically
rather than asserted.
