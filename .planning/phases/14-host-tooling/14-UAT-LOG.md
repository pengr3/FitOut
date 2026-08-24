# Phase 14 — Human UAT Log

> Live operator walkthroughs. **Only what a human actually observed is recorded here.**
> A walk is discharged when the operator states the outcome, never when the automated half is green —
> the automated half is precisely the part that could not answer these questions.

**Operator:** the PM · **Environment:** local dev on `:3000`, Docker Postgres (`fitout-db-1`)
**Evidence prepared:** 2026-08-24 by the coordinator, via a throwaway Playwright fixture (deleted after the
run; `git status` clean of it). No product source was touched.

**Screenshots live outside the repo**, in this session's scratchpad — they are evidence, not artifacts:

```
C:\Users\Admin\AppData\Local\Temp\claude\C--Users-Admin-Roaming-FitOut\76ecd8fc-e097-4de3-b91a-4992fc06dee9\scratchpad\uat-14\
```

**How the fixture was built.** One host, signed up through the app's own signup endpoint (never a typed
password, so the 5-per-60s sign-in limiter at `src/lib/auth.ts:167` is never approached), session captured
once and replayed — the idiom `e2e/host-dashboard.spec.ts:158` records. Every booking instant was built by
**Postgres, in the venue's own timezone**, so "today at 08:00 in Manila" is a property of that venue's local
day rather than of the runner's clock. All seeded rows were torn down in the foreign-key order
`booker-seed.ts` records.

---

## Discharged

**Both walks PASSED — PM verdict, 2026-08-24.** The PM viewed the evidence pack and stated the outcome for
each. Recorded here because a walk is discharged when the operator says so, never when the automated half
is green — the automated half is precisely the part that could not answer these questions.

| Walk | Requirement | PM verdict | What changes |
|------|-------------|-----------|--------------|
| A — the two-timezone dashboard | HFLOW-03 / D-141 | **Reads correctly — pass** | Nothing. The city name on each line does the work; backwards dates under one *Today* heading read as two real sessions, not as a bug. D-141's no-date decision stands as shipped. |
| B — the mistyped window, before saving | HFLOW-04 / D-152 | **Yes — the blank column is obvious** | Nothing about the strip. The mistake is visible at a glance, before saving, without reading anything — which is D-152's whole stated purpose. |

**One change WAS requested, and it is finding F-1's disposition rather than a walk failure:** with an
impossible window the blank column is currently the *only* pre-save signal, and the PM chose
**"explain on the row, keep Save live"** — name the reason next to the offending day, leave the button
pressable, and keep the server the authority on what can be saved. Tracked below as F-1.

The two walk write-ups are retained verbatim below as the record of what was actually put in front of the
PM and what they were asked.

---

### Walk A — HFLOW-03 / D-141 · the two-timezone dashboard · **PASSED 2026-08-24**

**The claim under test.** D-141 says a host whose listings span two zones "gets each row labelled in its own
venue's time", and that the agenda heading therefore carries **no date** — because a single date under
*Today* "would be FALSE for one of them at exactly the hours the distinction matters, and it would be false
SILENTLY."

**What the SQL already proves, and what it cannot.** `tests/booking/agenda-query.test.ts` pins the
day-boundary predicate (`(b.starts_at AT TIME ZONE l.timezone)::date = (now AT TIME ZONE l.timezone)::date`)
from both sides. That is the arithmetic. What no test can answer is whether the resulting **sentence** reads
right to a human.

**What was set up.** One host owning two published, bookable listings in genuinely different zones:

| Space | Timezone | City label | Session seeded |
|-------|----------|-----------|----------------|
| Makati Rooftop Court | `Asia/Manila` (GMT+8) | Makati | today, venue-local **08:00–10:00** |
| Venice Beach Yoga Studio | `America/Los_Angeles` (GMT−7) | Los Angeles | today, venue-local **18:00–20:00** |

The run happened at **2026-08-23 22:11 UTC** — a moment at which the two venues were on **different calendar
dates**: Monday 24 August in Makati, Sunday 23 August in Los Angeles. That divergence is the entire point;
it is the only condition under which D-141's rule is visible at all. Both sessions were still ahead of the
clock and both sit at hours a human reads as ordinary.

**What the page rendered**, verbatim from the DOM:

```
Today                                                        View all bookings

  Marisol   Makati Rooftop Court · Mon, Aug 24, 8:00 AM – 10:00 AM (Makati time)        Confirmed
  Teodoro   Venice Beach Yoga Studio · Sun, Aug 23, 6:00 PM – 8:00 PM (Los Angeles time) Confirmed
```

**The screenshots.**

| File | What it shows |
|------|---------------|
| `walkA-two-timezone-dashboard-1280.png` | `/host` at a desktop width, full page |
| `walkA-two-timezone-dashboard-320.png` | The same page at the declared 320px floor (D-131), full page |

**⚠ THE THING TO LOOK AT.** The two dates run **backwards** down the list — *Mon, Aug 24* above *Sun, Aug 23*
— under one heading that says **Today**. That is not a bug in the query; it is what "each venue's own local
day" looks like when the two venues straddle a date line. It is also exactly the shape a host could
misread as one.

**The question the PM is being asked:**

> Looking at that page cold, as a host who owns a court in Makati and a studio in Venice Beach: does the
> list read as **two real sessions, each in its own city's time** — or does it read as a **bug**, a
> contradiction, or a page that has got its dates confused? Is naming the city in every row
> (`(Makati time)` / `(Los Angeles time)`) enough to carry that on its own, or does the surface need to say
> something more?

A "yes, it reads right" discharges **HFLOW-03**. A "no" is a design finding for a follow-up phase, not a
defect in this one — the arithmetic is correct either way.

---

### Walk B — HFLOW-04 / D-152 · the mistyped window, before saving · **PASSED 2026-08-24**

**The claim under test.** D-152: the strip draws the weekly pattern "**as the host edits and before they
save**, so a mistyped window is visible immediately." 14-VALIDATION states the walk as: *set Monday 6 PM →
6 AM and confirm the strip shows it wrong at a glance, without saving.*

**What was set up.** The availability editor for **Makati Rooftop Court**, whose seeded weekly hours are an
ordinary 6:00 AM – 10:00 PM on all seven days. Nothing below was ever saved: no submit, no round trip, and
the **Save hours** button was left untouched and fully enabled the whole time.

**The control first, then the mistake** — so the PM can compare "obviously right" against "obviously wrong"
rather than judging one picture in isolation:

| File | State |
|------|-------|
| `walkB-control-strip-only.png` | The strip alone, Monday a sensible **6:00 AM – 10:00 PM** |
| `walkB-control-full-page.png` | The whole route in that state |
| `walkB-mistyped-6pm-to-6am-strip-only.png` | The strip alone, Monday **6:00 PM → 6:00 AM**, unsaved |
| `walkB-mistyped-6pm-to-6am-full-page.png` | The whole route in that state |
| `walkB-mistyped-strip-and-monday-row-together.png` | Both in one frame — the strip above, and the Monday selects reading *6:00 PM to 6:00 AM* below it |

**What the strip did.** Monday's column went **completely blank** while the other six kept their tall black
bars. The strip's accessible text — the same derivation that draws the bars — changed from
`Monday: 6:00 AM to 10:00 PM` to `Monday: closed`. Bar count in the Monday column: **0**.

**The question the PM is being asked:**

> A host has just typed Monday as *6:00 PM to 6:00 AM* and has not saved. Is the blank Monday column, sitting
> among six filled ones, enough to make them stop and look — **at a glance, without reading anything**?
> Or does a column that simply empties read as "Monday is closed" (which is what it says) rather than
> "you typed something impossible"?

That distinction is the whole walk. The strip is telling the truth about what it can draw; whether the truth
it tells is the one the host needs is the perceptual judgement only the PM can make.

**Three facts the PM should have while judging it** — all observed, none of them fixed:

1. **The mistake cannot be typed forwards.** With Monday's open time set to 6:00 PM, *every* close hour up
   to and including 6:00 PM is greyed out in the dropdown — `6:00 AM` comes back
   `aria-disabled="true"`. See `walkB-close-6am-is-blocked-when-open-is-6pm.png`, where every option from
   12:00 AM to 6:00 PM is visibly dimmed. The editor makes the canonical mistake unpickable in that order.
2. **It IS reachable backwards, which is the realistic host mistake.** A window that was *5:00 AM – 6:00 AM*
   and whose **open** time is later dragged to the evening lands on 6 PM → 6 AM with nothing blocking it —
   the editor only constrains the close select against the current open, never the reverse. That is the
   route used to produce the screenshots, and it is an ordinary thing for a host to do.
3. **In that state the product says nothing else at all.** No inline validation message appeared under the
   Monday row (`Close time must be after open time.` was not rendered), no alert appeared anywhere on the
   page, and **Save hours stayed enabled**. So on this path the empty column is the *only* signal the host
   gets before they press Save. That raises the stakes on the question above rather than answering it.
   → logged as a finding below.

---

## Context — the other three restyled surfaces, in their normal state

Not walks. These are here so the PM can form an overall read of the phase from the same pass. Nothing about
them is outstanding and nothing is being asked.

| File | Surface | State shown |
|------|---------|-------------|
| `context-requests-inbox-1280.png` | `/host/requests` | Two pending requests, each with its countdown, guest, space and venue-local window — one Makati, one Los Angeles |
| `context-host-bookings-table-1280.png` | `/host/bookings` | The upcoming tab: five bookings across both spaces, three confirmed and two requested |
| `context-listing-wizard-checklist-and-rail-1280.png` | The listing wizard on a fresh draft | The step rail (*Step 1 of 9*, numbered 1–9) and the persistent **Ready to publish?** checklist panel, all ten rows unmet |

---

## Findings raised by this pass

These were observed while gathering evidence. **The pass itself changed no product source** — the
write-ups below are preserved exactly as they were filed. **F-1 and F-2 each now carry a DISPOSITION**
appended underneath it, added by quick task `260824-dbc` on 2026-08-24. F-3 carries none because it names
no product defect — it records what was suppressed in the screenshots and why.

### F-1 · A mistyped window's only pre-save signal is the strip going blank

Described in full as fact 3 of Walk B. The shared schema's `Close time must be after open time.` message
(`src/lib/validation/availability.ts:59-61`) did not render in the observed state, and Save stayed enabled.
The likely mechanism: the form validates `onChange`, and the last field the host touched on this path is
`openTime`, while the schema attaches that message to `closeTime` — so the error is computed but not
surfaced for the field that was changed. **Unverified as a root cause; stated as a hypothesis, not a
diagnosis.** The server still refuses the save (`weeklyHoursSchema` re-validates every write), so this is a
feedback gap and not a correctness hole. It is, however, directly load-bearing on the question Walk B asks.

**DISPOSITION — FIXED. `6de5b5a` (quick `260824-dbc`, 2026-08-24).**

**The hypothesis was verified before anything was built on it, and it holds exactly.** The schema hangs
its refusal on the `closeTime` path; react-hook-form's onChange path looks an error up at the path of the
field that CHANGED, walking `windows.N.openTime` → `windows.N`, finding nothing there, and writing only
that empty result into form state. The sibling's issue was computed by the resolver on every keystroke
and then discarded. **The proof it was computed:** pressing *Save hours* in that same state DID render
the sentence and did NOT call the server action — so the message and its wiring were already correct, and
only the onChange path failed to populate it.

**The fix adds no rule and no sentence.** The open select now re-asks the resolver about its own row's
close field after a change, so the answer lands at the path the existing message already reads.
`weeklyHoursSchema` remains the one authority for both the rule and its wording, on the client and on the
server. **Save is untouched and stays pressable** — the PM's second clause, and D-130's requirement.

Covered by `tests/availability/week-strip.test.tsx` cases (11) and (12), each watched failing against the
defect it names: with the fix removed both went red on the missing sentence; with Save gated on client
validity, (12) alone went red on its own clause.

### F-2 · The Approve control on `/host/bookings` is clipped at 1280px

Measured, not guessed: the table sits in a `w-full overflow-x-auto` container whose `clientWidth` is 864
against a `scrollWidth` of 992, and the Approve button's box runs from x=1009 to x=1099 — about 26px past
the container's right clip edge. It is reachable by scrolling the table sideways, so nothing is lost, but at
rest the primary action on a pending row reads as cut in half. Visible in
`context-host-bookings-table-1280.png`.

⚠ **Caveat, stated so this is not over-trusted:** the fixture's two listing titles ("Makati Rooftop Court",
"Venice Beach Yoga Studio") are longer than the seeded catalogue's, and the Space column is what pushes the
table past its container. A host with short space names may not see this. It is a width-and-content
interaction, not an unconditional defect.

**DISPOSITION — REPRODUCED AGAINST THE SEEDED CATALOGUE, MEASURED, AND ESCALATED. NOT FIXED.**
*(quick `260824-dbc`, 2026-08-24. Fix attempted in `aff2941`, reverted in `6a8e577` — see below.)*

**The caveat above is wrong, and it was wrong in the direction that matters.** The seeded catalogue is the
WORSE case, not the milder one: `QC Strength & Conditioning Gym` (30 characters) is longer than either
fixture title, and `Quezon City` is as long as `Los Angeles`. Driven at 1280px through a throwaway fixture
carrying the catalogue's own five titles and cities (`scripts/seed.ts:48-52`), with the UAT's own row
shape — five upcoming bookings, three confirmed and two requested:

| | `clientWidth` | `scrollWidth` | overflow | Approve box | past the clip edge |
|---|---|---|---|---|---|
| **Before** | 864 | 1043 | 179px | x=1060→1150 | **78 of its 90px** |
| **After** | 864 | 864 | 0 | x=881→971 | none — 101px clear |

Column widths before: Guest 69 · Space 234 · **When 366** · Status 112 · Payout 63 · Actions 199.
After: Guest 69 · Space 174 · When 248 · Status 112 · Payout 63 · Actions 199.

So it is a real defect on a primary action, and **worse than this pass measured** — 78px past the edge
rather than ~26px. **The mechanism is not the Space column alone.** The shared table cell forbids
wrapping on every cell it renders, and TWO of this route's cells hold a SENTENCE rather than a token: the
space title and the venue-local window label. The window label is the wider offender, at 366px. Between
them they are 600 of those 1043 pixels.

**THE FIX WORKS, AND IT IS NOT SMALL. THAT IS WHY IT WAS BACKED OUT.**

Letting exactly those two cells wrap removes the clip completely — the "After" row above is a real
measurement of that change, not a projection. It was implemented, measured, committed (`aff2941`), and
then **reverted (`6a8e577`)** when the phase's own gates were run against it. `e2e/skeleton-geometry.spec.ts`
went red, and its red is the argument:

```
host booking row · /host/bookings · 1280px: the resolved table measures 56.53px, but this shape
was measured at 36.52px when its height was declared.
Expected: <= 4   Received: 20.009999999999998
```

Twenty pixels is one line. Wrapping makes the desktop row two lines instead of one, and that has three
consequences that are decisions rather than mechanics:

1. **`HOST_BOOKING_ROW_HEIGHT`'s desktop value moves**, and `bookings/loading.tsx`'s plate redraws with
   it — a Phase-14 declared measurement that `[14-15]` pinned and `[14-16]` re-pinned, days ago.
2. **The row's height stops being a property of the row.** A table shares column widths across all its
   rows, so the resting row would wrap or not depending on the WIDEST label anywhere in the list. Two of
   this route's rows are seeded relative to the clock, so the number starts moving with the calendar
   again — which is precisely the ambush `[14-16]` closed, re-opened one breakpoint up.
3. **Two further pinned cases in that file state "at 1280 nothing wraps" as a standing assumption**,
   which the fix falsifies.

**So this is a product decision, and F-2 carries no PM ruling.** The fork, stated plainly:

| | What the host gets | What it costs |
|---|---|---|
| **Leave it** (today) | The table scrolls sideways; nothing is unreachable | At rest, the Approve control on a pending row is 87% hidden |
| **Let the two cells wrap** | Approve always whole, 101px clear; nothing to scroll | Every desktop row becomes two lines; a declared Phase-14 measurement and its loading plate move; the row's height becomes calendar-coupled again unless both wrap counts are seeded and pinned the way 320px already is |
| **Something else** | — | Widening this route's container means moving `HOST_LIST_SHELL`, which `/host/earnings` also reads and which is frozen. A sticky actions column touches the elevation inventory this route is pinned on. Neither is cheaper. |

Nothing about the source changed in the end. What this task leaves behind is the measurement, the
diagnosis, and a note recording both at the top of `src/app/(host)/host/bookings/page.tsx` so the next
reader finds them before re-deriving them. D-154 was not touched: no filter, sort, column or date range
was added, and `tests/design/elevation-z.test.ts:306` never moved.

The throwaway fixture used for the measurement was torn down in the foreign-key order `booker-seed.ts`
records, and verified gone (0 listings, 0 bookings, 0 users, 0 notifications).

### F-3 · The `1 Issue` pill in the screenshots is dev tooling, and was hidden

Next.js's dev-tools overlay paints a floating red *"N · 1 Issue"* pill over the bottom-left of every page a
dev server serves. It is not product and does not exist in a production build. It was suppressed in every
screenshot in this pack so it could not be mistaken for the product reporting a fault in the very thing
being judged. **What it is counting was checked before hiding it:** every host surface in this pass was
driven with console-error and page-error listeners attached, and **zero** browser errors or warnings were
emitted. The pill is a dev-time build/route diagnostic, not a runtime fault on these screens.

---

## Not covered by this pack

Stated plainly so the next reader under-trusts it correctly.

- **The nine visual-regression baselines** (14-VALIDATION's third manual-only row) are untouched here. They
  remain DECLARED AND BLOCKED: `--project=visual` is not created off Linux, and these are ad-hoc
  screenshots, deliberately not written into `e2e/visual/**-snapshots/`.
- **One instant, one browser, one theme.** Every shot is Chromium at the default theme, taken in a single
  minute. Walk A in particular is a snapshot of one date-straddling moment; it says nothing about how the
  page reads at other hours of the day.
- **Two widths only** (1280 and 320) for Walk A; Walk B is desktop-only.
- **No provider round-trip, no real money, no email.** Nothing in this pack touched PayMongo.

---

*Last updated: 2026-08-24 (findings F-1 and F-2 dispositioned by quick `260824-dbc`).*
