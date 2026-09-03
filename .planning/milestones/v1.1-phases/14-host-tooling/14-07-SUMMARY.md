---
phase: 14-host-tooling
plan: 07
subsystem: ui
tags: [design-system, nextjs-rsc, host-surfaces, copy-ownership, keyset-pagination, playwright, responsive]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "`HOST_LIST_SHELL` (14-01) — the declared host-list container a page and its own `loading.tsx` both read — and 14-06's worked example of adopting it plus `PageHeader` on a host list route without touching the read beneath it"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`patterns/page-header.tsx` (exactly one `<h1>`, a title that wraps and never truncates), `patterns/empty-state.tsx` and `tests/design/elevation-z.test.ts`'s per-file raised inventory — the gate that pins this route at exactly one raised element"
  - phase: 7-host-side-management
    provides: "`queryHostBookings`, `parseTab`, `BOOKINGS_PAGE_SIZE` and the keyset cursor — the information architecture D-154 forbids this plan from touching"
provides:
  - "`src/lib/host/bookings-copy.ts` — `HOST_BOOKINGS_HEADER`, the bookings title and lede as ONE frozen pair, SPREAD into `PageHeader` at both call sites so it cannot be half-adopted"
  - "`/host/bookings` and its plate reading one shell constant and one header constant; three table cells naming the label role they were standing in for"
  - "The host-side GATE-NOREG assertions that did not exist: the tab partition and the keyset pager asserted against `queryHostBookings`, both observed failing against deliberate regressions"
  - "A recorded 320px / 1280px measurement of this route — overflow, every control's box, and the `requested` row's two action controls on BOTH breakpoints"
affects: [14-12, 14-13, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A page's header copy gets ONE owner beside its surface, and both the route and its `loading.tsx` SPREAD it — a spread cannot be half-adopted, so 'the page and the plate say the same thing' becomes a property of the syntax rather than of a reviewer noticing"
    - "A restyle proves it did not move an information architecture by extracting each protected block from `git show HEAD:<file>` and from the working tree and diffing them — 'zero changed lines inside the tab parser' is asserted, not asserted-by-eyeball"
    - "A no-regression gate is added where the shipped coverage turns out to cover only the sibling query: 'the predicate is shared so the property is inherited' is a claim about today's implementation, which is exactly what the gate exists to stop resting on"

key-files:
  created:
    - src/lib/host/bookings-copy.ts
  modified:
    - src/app/(host)/host/bookings/page.tsx
    - src/app/(host)/host/bookings/loading.tsx
    - tests/booking/views.test.ts

key-decisions:
  - "The header pair is ONE frozen object spread at both call sites, not two sibling string exports. Two exports would still let a future edit import one and hand-type the other; `<PageHeader {...HOST_BOOKINGS_HEADER} />` cannot be half-adopted"
  - "The copy lives in `src/lib/host/bookings-copy.ts`, NOT in `measurements.ts`. That module owns boxes and their derivations; a sentence a host reads is product copy, and filing it under design would give a layout module a reason to change when the product's wording does"
  - "`HostBookingRow`'s own refund line was NOT unified with the page's. The row component is out of D-154's reach, so the two are now NAMED differently (`text-label` on the table, the bare small-text utility on the card) and COMPUTE identically at 14px — measured, disclosed in a comment, not silently reconciled"
  - "The four GATE-NOREG behaviours were split: two already had committed assertions and were RE-RUN, two covered only `queryBookerBookings` and were ADDED to the file that already owns the concern. No new test file was authored"
  - "The 320px measurement was taken with a THROWAWAY Playwright script against the running dev server rather than by authoring a seventh DB-seeding spec — 14-RESEARCH names the contention flake by name, and this plan's frontmatter budgets three source files"

patterns-established:
  - "Block-level diff proof: name each protected region, extract it from both revisions, and report IDENTICAL or the diff — a per-block claim a reviewer can re-run"
  - "Probe both new gates, one regression each, and check that the SIBLING case stays green — the host pager probe reddened the host case alone, which is what proves it covers the host path rather than the shared one"

requirements-completed: []   # HFLOW-04 is SHARED across six plans — see the note below
requirements-advanced: [HFLOW-04]   # the bookings-table half only; the availability editor and the week strip are downstream

# Metrics
duration: 20min
completed: 2026-08-23
---

# Phase 14 Plan 07: The Bookings Table Wears the Design System Summary

**`/host/bookings` took the shell, the page header and the named type roles — and the diff proves, block
by block, that the tab partition, the `?listing=` filter, the owner-scoped read, the display map, both
empty states and the keyset pager are byte-identical to what shipped; while writing the no-regression
proof it turned out that two of the four behaviours D-154 protects had never been asserted against the
HOST query at all, only against its booker twin.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-23T10:39Z (baseline `tsc`; baseline design run started 10:40:42 local)
- **Completed:** 2026-08-23T10:57Z
- **Tasks:** 2 (2 commits)
- **Files:** 4 (3 modified, 1 created)

## Accomplishments

- **The page and its plate can no longer disagree about their own words.** Both sentences were written
  twice — once in the page's hand-rolled `<h1>`/`<p>` and once in `loading.tsx`'s `PageHeader` — and
  agreed only because somebody had typed them identically in two files, neither of which contains both
  halves of the agreement. `HOST_BOOKINGS_HEADER` is now the single owner and both call sites **spread**
  it. `grep -c '"Bookings"'` and `grep -c 'Every booking across your spaces'` are **0 / 0** in both route
  files.
- **The box has one owner too.** `grep -c 'max-w-4xl'` is **0 / 0**; `HOST_LIST_SHELL` is imported and
  rendered once in each file.
- **D-154's untouched list is a `diff` result, not a claim.** Seven protected regions were extracted from
  `git show HEAD:` and from the working tree and compared — all seven **IDENTICAL** (table below).
- **Landmine 4 held.** `grep -c 'shadow-raised'` on the page is still exactly **1**, on the same element
  (`select#listing-filter`), and `tests/design/elevation-z.test.ts` passes with
  `git diff --stat tests/design/elevation-z.test.ts` **empty**.
- **Two missing host-side gates were found and closed.** `describe("D-103 …")` and `describe("D-106 …")`
  in `tests/booking/views.test.ts` assert the tab partition and the keyset pager against
  `queryBookerBookings` **only**. `/host/bookings`' tabs and `Load more` are driven by
  `queryHostBookings`. Both new cases were **observed failing** against deliberate regressions.
- **The 320px behaviour is a set of numbers.** No horizontal overflow at 320 (`scrollWidth 320` against
  `clientWidth 320`, **111 elements examined**, **zero** unclipped offenders); the smallest control axis
  on the surface is **28px** against the WCAG 2.5.8 AA bar of 24; and the `requested` row's two primary
  actions measure **90×44** and **84.6×44** — the app's `size="touch"` floor — on the mobile card at 320
  **and** on the desktop table at 1280.
- **Zero schema change, zero query change, zero design-gate edit, zero package.** `git diff drizzle/`
  empty, `tests/design/` untouched, `package.json`/`package-lock.json` untouched.

## Task Commits

1. **Task 1: One owner for the header pair, and the shared shell on the page and its plate** — `bab26a7`
   (refactor) · `+142 / −12` across 3 files
2. **Task 2: GATE-NOREG — the partition, the filter, the page size and the owner scope still behave** —
   `3c3d4b6` (test) · `+181 / −2` in `tests/booking/views.test.ts`

## Files Created/Modified

- `src/lib/host/bookings-copy.ts` **(created, 54 lines)** — `HOST_BOOKINGS_HEADER`, an `as const` pair.
  Its header states why the module exists (a plate that drifts from its page is the exact failure a plate
  exists to prevent), why it is one constant and not two, why the words are not in `measurements.ts`, and
  why it carries no `"use client"` directive (`hours-signal.ts`'s recorded UAT crash).
- `src/app/(host)/host/bookings/page.tsx` — `+86 / −12`, of which **46 lines are the new header comment**
  enumerating the three changes and the eight things D-154 forbids. The functional diff is four regions:
  two imports, the container + heading block, and three table cells.
- `src/app/(host)/host/bookings/loading.tsx` — `+14 / −2`. The shell constant, the copy constant, and a
  header note recording that the container and the header are no longer copied but imported.
- `tests/booking/views.test.ts` — `+181 / −2`. One optional `listingId` on the existing `seedBooking`
  helper (defaulting to `LISTING`, so every pre-existing fixture is byte-unchanged) and a
  `GATE-NOREG / D-154` describe of three cases.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (baseline, before any edit) | exit **0** |
| `npm run test:design` (baseline) | 49 files / 827 passed / 3 skipped / **0 failed** |
| `npm run test:design -- elevation-z status-vocab empty-state-adoption loading-coverage` | 4 files / **136 passed**, all four files UNEDITED |
| `npm run test:design -- price-surface` | 1 file / **19 passed**, file UNEDITED |
| `npm run test:design` (final) | **49 files / 827 passed / 3 skipped / 0 failed** — baseline exactly unmoved |
| `npx vitest run tests/booking/views.test.ts` (after Task 1, before Task 2) | 1 file / **12 passed** |
| `npx vitest run tests/security/bookings-owner-scope.test.ts tests/booking/views.test.ts tests/booking/host-booking-row.test.tsx` | 3 files / **34 passed** |
| `npx vitest run tests/security tests/booking tests/host` (final) | 68 files / **770 passed**, zero failures (14-06 recorded 767; +3 is exactly this plan's three new cases) |
| `npx tsc --noEmit` (final) | exit **0** |
| `npx eslint` on all four touched files | exit **0** |
| `git diff --stat drizzle/` across both commits | **empty** — zero migrations (PROJECT D-136) |
| `git diff --stat HEAD~2 HEAD -- tests/design/` | **empty** — no design gate was edited to make this work pass |
| `git diff HEAD~2 HEAD -- package.json package-lock.json` | **empty** — no package installed |
| `git diff --diff-filter=D` on both commits | **no deletions** |
| `grep -c 'HOST_LIST_SHELL'` page / plate | **2 / 2** (one import + one render each — the 14-01 disclosure, restated) |
| `grep -c 'max-w-4xl'` page / plate | **0 / 0** |
| `grep -c 'shadow-raised'` page | **1**, on `select#listing-filter` — unmoved |
| `grep -c '"Bookings"'` page / plate | **0 / 0** |
| `grep -c 'Every booking across your spaces'` page / plate | **0 / 0** |

**No `--project=visual` invocation** — the project is not collected on win32. `e2e/availability.spec.ts:261`,
the pre-existing standing red, was neither run, touched nor claimed: **no `npx playwright test` invocation
was made at all** (see the 320px section for what was run instead).

### D-154's untouched list, proved block by block

Each protected region extracted from `git show HEAD:src/app/(host)/host/bookings/page.tsx` and from the
working tree, then `diff`ed. The line ranges are the old file's and the new file's:

| Protected region | Old lines | New lines | Result |
|---|---|---|---|
| `parseTab` — the attacker-controlled tab parameter | 60–63 | 109–112 | **IDENTICAL** |
| `refundLabelFor` — D-79's two sentences | 65–74 | 114–123 | **IDENTICAL** |
| THE READ — `queryHostBookings` and its five arguments | 107–113 | 156–162 | **IDENTICAL** |
| The display map — every label, every formatter | 115–142 | 164–191 | **IDENTICAL** |
| The tabs strip and the `?listing=` GET form (incl. the raised `<select>`) | 160–189 | 212–241 | **IDENTICAL** |
| Both empty states, forked by tab | 191–211 | 243–263 | **IDENTICAL** |
| The D-106 keyset pager and `Load more` | 286–293 | 354–361 | **IDENTICAL** |

`git diff -U0` reports exactly **eight hunks**, and every one of them is in the header comment, the two
import lines, the container/heading block, or one of the three table cells. Nothing else moved.

### The four GATE-NOREG behaviours, each with a green command

| # | Behaviour (14-UI-SPEC row) | Where it is asserted | Added here? | Command |
|---|---|---|---|---|
| 1 | The two tabs return the same row sets — disjoint and exhaustive, on the HOST query | `tests/booking/views.test.ts` → `GATE-NOREG / D-154 …` → *"row 1 — puts every booking on the host's spaces in exactly one tab"* | **YES — no host-side assertion existed** | `npx vitest run tests/booking/views.test.ts` |
| 2 | A `?listing=` naming a listing the host does not own returns zero rows, never a widened set | `tests/booking/views.test.ts:316` *"narrows, and never widens, when a listing filter is supplied"* **and** `tests/security/bookings-owner-scope.test.ts:226` *"cannot be widened by pointing `?listing=` at another host's space"* | no — re-run only, both files UNEDITED | `npx vitest run tests/security/bookings-owner-scope.test.ts tests/booking/views.test.ts` |
| 3 | The page size and the load-more cursor produce the same sequence | `tests/booking/views.test.ts` → *"row 4 — walks the host's rows a page at a time…"* and *"row 4 — honours `BOOKINGS_PAGE_SIZE`…"* | **YES — the shipped D-106 describe pages the BOOKER query only** | `npx vitest run tests/booking/views.test.ts` |
| 4 | A `requested` row still renders both action controls at their new size | `tests/booking/host-booking-row.test.tsx:72` (the row component, **UNEDITED**) + the browser measurement below, which reads the DESKTOP TABLE's own cluster at 1280 | no — re-run, plus a measurement | `npx vitest run tests/booking/host-booking-row.test.tsx` |

**Two of the four had no host-side assertion, and that is the finding.** `tabPredicate`, `keysetPredicate`
and `clampLimit` are shared between `queryBookerBookings` and `queryHostBookings`, so the properties were
*inherited* — but "inherited" is a statement about today's implementation, and the day somebody adds a
host-side branch to the shared predicate is precisely the day a no-regression gate is supposed to fire.

### Both new gates have been observed FAILING, and the sibling stayed green

Applied one at a time, run, recorded, reverted; `git diff` checked clean after each.

**(a) THE PAST PREDICATE BROKEN** — `tabPredicate`'s `NOT (b.ends_at > now() AND …)` replaced with
`b.ends_at <= now()`, i.e. the naive partition that strands inert future bookings in neither tab.
Four cases red, including the new one:

```
× row 1 — puts every booking on the host's spaces in exactly one tab
AssertionError: expected 12 to be 15 // Object.is equality
```

Three rows on the host's space fell out of both tabs. The exhaustive clause is what noticed.

**(b) THE HOST PAGER'S SENTINEL ROW REMOVED** — `LIMIT ${limit + 1}` → `LIMIT ${limit}` **inside
`queryHostBookings` only**, so `hasMore` can never be true and `nextCursor` is always null:

```
× row 4 — walks the host's rows a page at a time with no duplicate, no gap, and a null terminal cursor
AssertionError: expected [ 'bk_gate_0', 'bk_gate_1', …(4) ] to deeply equal [ 'bk_gate_0', 'bk_gate_1', …(3) ]
      Tests  1 failed | 14 passed (15)
```

**Exactly one case red — the new one.** The shipped D-106 booker pager stayed green, which is the proof
that the added case covers the host path rather than re-asserting the shared one.

### The 320px measurement — observed numbers, and how they were produced

**Not a Playwright spec.** 14-RESEARCH § *The DB-contention flake pattern* records four contention flakes
across the six existing DB-seeding e2e specs and warns against a seventh; this plan's frontmatter budgets
three source files and no spec. So the measurement was taken by a **throwaway Node script** driving
`playwright`'s `chromium` against a local `npm run dev` server, using the UAT host (`host@fitout.test`)
and three bookings seeded straight into the dev database and deleted afterwards. **Both `evaluate` bodies
were copied verbatim** from `e2e/helpers/overflow.ts` (`measureOverflow`) and `e2e/overflow-320.spec.ts`
(`collectControls`), so the numbers below are what those shipped gates would report. The script was
removed after the run; `git status --short` was checked and shows no stray file.

The fixture: one `requested` booking (so the action cluster renders), one `confirmed`, one `cancelled`
with a zero refund. Teardown verified — `SELECT count(*) … WHERE id = ANY(seeded)` returned **0**.

```
===== 320 × 800  (horizontal overflow, e2e/helpers/overflow.ts's definition) =====
  scrollWidth       : 320   clientWidth: 320   examined: 111
  offenders         : []                      ← zero unclipped elements past the viewport

===== 320 × 568  (target size, AC#22's iPhone-SE floor) =====
  examined          : 104
  controls found    : 6          smallest axis: 28px   (WCAG 2.5.8 AA floor 24)
  under 24px        : []
      101.8 x 44   a[Upcoming]
       96.0 x 44   a[Past]
      233.0 x 44   select[All spaces / CLMC Yoga Space / KAI Sports Center / …]   ← the ONE raised element
       57.2 x 28   button[Apply]
       90.0 x 44   button[Approve request from Twilight]
       84.6 x 44   button[Decline request from Twilight]

===== the type roles, computed, at 320 and again at 1280 (identical at both) =====
  <h1> count        : 1
  <h1>              : 20px / 600  "Bookings"
  lede              : 14px / 400  "Every booking across your spaces, upcoming and past."
  table cell 0 Guest: 14px / 400   ← text-label
  table cell 1 Space: 14px / 600   ← font-medium, unchanged
  table cell 2 When : 14px / 400   ← text-label text-muted-foreground
  table cell 3 Statu: 14px / 400
  table cell 4 Payou: 14px / 400
  table cell 5 Actio: 14px / 400

===== the requested row's action cluster, scoped to each breakpoint's own tree =====
  320 × 568  desktop table     : visible=false  Approve×0  Decline×0
  320 × 568  mobile card stack : visible=true   Approve×1 90x44   Decline×1 84.6x44
  1280 × 800 desktop table     : visible=true   Approve×1 90x44   Decline×1 84.6x44
  1280 × 800 mobile card stack : visible=false  Approve×0  Decline×0
```

**Reading of the three floors this plan was asked to confirm:**

1. **No horizontal overflow at 320.** `scrollWidth 320 === clientWidth 320`, and the per-element scan —
   the stronger claim, since a `position: fixed` box can sit past the viewport without widening the
   document — returned **zero** offenders against **111 laid-out elements** examined.
2. **Every control at or above the target-size floor.** The smallest axis on the whole surface is **28px**
   (the filter's `Apply` button, 57.2 × 28), 4px clear of the WCAG 2.5.8 AA bar of 24. `Apply` is a
   secondary filter control, not a primary action, and it lives inside the GET form D-154 forbids this
   plan from touching — so its being under 44 is the shipped, deliberate state, not a finding.
3. **Every primary action at or above the touch floor.** Approve **90 × 44** and Decline **84.6 × 44** —
   `size="touch"`'s 44px exactly, on the mobile card at 320 **and** on the desktop table at 1280. This is
   the direct measurement behind GATE-NOREG row 4: 14-03 changed that cluster's control size, and both
   breakpoints still render both controls at it.

**No fix was needed, so none was made.** Nothing about the route required a change to satisfy the floor,
which is the outcome that avoids the scope alarm the task defines (a fix touching the filter, the tabs or
the cursor).

**What this measurement does NOT cover, stated so the next reader under-trusts it:** one theme (`court` —
the phase locked coral as the single product theme), one browser, one fixture, and it is a **throwaway**:
there is no committed gate that will re-run it. See *Deferred / not done* below.

## Decisions Made

**1. The header pair is ONE frozen object, spread — not two string exports.**
The must-have reads "asserted against ONE exported constant, not two literals that happen to match today".
Two sibling exports would satisfy the letter and miss the point: a future edit could import
`HOST_BOOKINGS_TITLE` and hand-type the lede, and the two files would be back to agreeing by coincidence
with an import in the way to make it look otherwise. `<PageHeader {...HOST_BOOKINGS_HEADER} />` cannot be
half-adopted — you take both fields or you do not compile — so the identity is a property of the syntax.
It also makes the acceptance grep exact: neither literal appears in either route file, at all.

**2. The words live in `src/lib/host/bookings-copy.ts`, not in `measurements.ts`.**
`measurements.ts` owns boxes and their derivations, and `HOST_LIST_SHELL` already lives there. Putting a
sentence beside it would file product copy where nobody looks for it, and would give a layout module a
reason to change every time the product's wording does. `src/lib/listing/hours-signal.ts` is the shape the
plan named and the shape followed: a small module beside its surface that owns the state's words.

**3. `HostBookingRow`'s refund line was deliberately NOT unified with the page's.**
The page's D-79 refund sibling moved from the bare small-text utility to `text-label`. The mobile card
renders its own copy of that line (`host-booking-row.tsx:96`) and still spells the utility. Unifying them
would have opened the row component, which D-154 lists under "unchanged composition" and which this plan's
frontmatter does not name. The two are now **named differently and compute identically** — both 14px,
measured in the browser above — and a comment on the page's line says exactly that, so the asymmetry is a
disclosure rather than a trap. A later HFLOW-04 plan that opens the row can fold it in.

**4. The four GATE-NOREG behaviours were split rather than uniformly re-tested or uniformly re-written.**
The task's rule is "re-run the shipped coverage rather than write a new assertion for a behaviour that
already has one; where no test exists, add the case to the file that already owns the concern". Applied
literally, that split the four two-and-two. Behaviour 2 has **two** independent committed assertions and
behaviour 4 has one; both were re-run with their files unedited. Behaviours 1 and 3 turned out to be
booker-only, and both went into `tests/booking/views.test.ts`, which is the file whose header already
enumerates the tab partition and the keyset pager as properties 2 and 3 of the read model. **No new test
file was authored.**

**5. The pager case seeds its own host and its own space.**
Every pre-existing fixture in `views.test.ts` inserts onto `LISTING`, which `HOST` owns — so paging `HOST`
would have been asserting "these five rows, in this order" about whatever the eleven earlier cases happened
to seed first, and would break the day one of them adds a row. A dedicated host + listing makes the
sequence a claim about five known rows. That is what the new optional `listingId` on `seedBooking` is for;
it defaults to `LISTING`, so every existing call site is byte-unchanged.

**6. `BOOKINGS_PAGE_SIZE` is asserted as the CONSTANT, never as the number 10.**
The page passes `limit: BOOKINGS_PAGE_SIZE` and nothing else. A test asserting `10` would keep passing
while the shipped page size changed underneath it; a test asserting the constant forces a plan that moves
the page size to move it here too, in that plan's own commit.

**7. The 320px measurement is a throwaway script, not a seventh seeding spec.**
Argued above and in *Deferred / not done*. The verification block's own wording — *"if an end-to-end run
**is used** for the 320px measurement"* — treats the spec as optional, and both `evaluate` bodies were
copied verbatim from the shipped helpers so the numbers are the same numbers a spec would report.

## Deviations from Plan

None — plan executed exactly as written. Four disclosures that are **not** deviations but would surprise a
reviewer if unstated:

**(a) `grep -c 'HOST_LIST_SHELL'` returns 2 per file, not 1.**
The acceptance criterion says "one hit each". The two hits are the import line and the single usage; there
is exactly one *usage* in each file. This is 14-01's own recorded disclosure, restated rather than quietly
re-read.

**(b) THIS ROUTE HAS NO GUEST-PAYS COLUMN, so "keeps its right alignment and tabular figures" is
vacuously true.** The action says *"The guest-pays column keeps its right alignment and tabular figures."*
`/host/bookings`' desktop table has six columns — `Guest · Space · When · Status · Payout · (Actions)` —
and no money column at all; `amountLabel` is computed in the display map and rendered **only** by the
mobile card's `<dl>`, which is the untouched row component. Nothing was added and nothing was moved. The
sentence appears to have travelled from 14-06's requests table, which does have that column. Reported
rather than "fixed" by adding one — adding a column is exactly the new-capability move D-154 defers.

**(c) "The row meta" likewise has no counterpart inside `page.tsx`.** The action asks for the type roles
"in the table cells and the row meta". The row meta is `HostBookingRow`'s `<dl>`, which is the shared row
pattern and is on D-154's do-not-touch list and outside this plan's three files. So the type-role pass
landed on the three sites that exist here: the guest cell, the venue-local window cell and the refund
sibling. See decision 3 for the consequence.

**(d) Explanatory comments were added at every changed region, and the page's header grew by 46 lines.**
The functional diff is small; the comment is not. This is the house style the repo enforces everywhere
else (14-01 disclosed the same thing), and on this file in particular the header is where D-154's
do-not-touch list now lives in the tree rather than only in a planning document.

**Total deviations:** 0 auto-fixed (0 Rule 1, 0 Rule 2, 0 Rule 3, 0 Rule 4).
**Impact on plan:** none. Zero scope absorbed — no filter, no sort, no column, no date range, no new
status word, no migration, no package.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-07-IDOR | **mitigated** | The `?listing=` filter block is byte-identical (table above). The cannot-widen case is asserted twice — `views.test.ts:316` and `bookings-owner-scope.test.ts:226` — and both files are UNEDITED and green |
| T-14-07-TABPARSE | **mitigated** | `parseTab` old 60–63 vs new 109–112: **IDENTICAL**. The partition is now additionally asserted on the host query, and that assertion was observed failing |
| T-14-07-CURSOR | **mitigated** | The pager block is IDENTICAL; `BOOKINGS_PAGE_SIZE`, the clamp to `BOOKINGS_MAX_PAGE_SIZE` and the malformed-cursor-is-boring rule now each have a host-side assertion. Observed failing |
| T-14-07-VOCAB | **mitigated** | `npm run test:design -- status-vocab` green with the file unedited; no host-side status word was minted. `BookingStatusBadge` and its shared derivation were not opened |
| T-14-07-ELEVATION | **mitigated** | `grep -c 'shadow-raised'` = **1**, on `select#listing-filter`, the same element as before; `elevation-z.test.ts` green and `git diff --stat` on it empty (landmine 4) |
| T-14-07-MONEY | **mitigated** | Zero arithmetic added. The frozen quote still goes through `formatMoney` in the untouched display map; `price-surface` re-run green with its file unedited |
| T-14-07-SC | **mitigated** | **No package was installed.** `git diff HEAD~2 HEAD -- package.json package-lock.json` is empty |

No new threat surface: no network endpoint, no auth path, no file-access pattern, no schema change. The
page's own two authorization gates (the session + `canHost` re-check, and the owner-scoped `WHERE`) are
both inside blocks proved identical. **No `## Threat Flags` section is owed.**

## Known Stubs

**None.** Nothing on this surface renders a placeholder, an empty hardcoded collection or a "coming soon".
The one em-dash fallback on the Payout cell is the shipped, deliberate D-105 behaviour for a booking with
no ledger row yet — an accessible-labelled absence, not an invented badge state — and it was not opened.

## Deferred / not done, with the reason

**There is no COMMITTED gate for this route's 320px floor.** The measurement above is real and reproducible
by hand, but it will not run again by itself. Authoring `e2e/host-bookings-320.spec.ts` would make it the
**seventh** DB-seeding e2e spec sharing one Postgres — the growth 14-RESEARCH § *The DB-contention flake
pattern* and `11/deferred-items.md` both warn about by name, and which `e2e/host-inbox-hierarchy.spec.ts`'s
own header already flags itself as the sixth instance of. It is also outside this plan's three declared
files. **The natural home is `e2e/overflow-320.spec.ts`'s route table** — if that table ever grows a
session-bearing row, `/host/bookings` should be it, because its `expectNoOverflow` and `expectTargets` are
already exactly the two functions used above. Recorded here rather than in `deferred-items.md`: this is a
coverage choice this plan made deliberately, not an out-of-scope discovery it tripped over.

## Issues Encountered

**Two of the four "just re-run it" behaviours had nothing to re-run.** The task is written on the
assumption that the shipped coverage exists and the work is confirming it. For the host tab partition and
the host pager it did not — `views.test.ts`'s D-103 and D-106 describes both drive `queryBookerBookings`,
and the file's own header describes those properties as belonging to "the two list pages", which is true of
the SQL and false of the tests. The gap is invisible in a green run: every gate passes, and the property
holds, through a fragment the two queries happen to share.

**The first attempt at the browser probe used Tailwind's escaped-colon selectors** (`.hidden.md\:block`) to
tell the desktop table from the mobile stack, which the shell heredoc mangled into an invalid selector.
Replaced with `table` and `[data-testid="row-card"]` — which is better anyway: it scopes by what the two
trees ARE rather than by the utility classes that hide them, so the reading survives a breakpoint change.

**Non-issue, recorded so it is not re-discovered:** the desktop table and the mobile card stack are BOTH in
the DOM at every width (`hidden md:block` / `md:hidden`), so a raw `document.querySelectorAll` count reports
two table rows at 320px. The measurements above are scoped to each tree and report `visible=false` for the
one that is not laid out, which is why the Approve/Decline boxes are attributed to the right breakpoint.

## Requirements

`requirements-completed` is deliberately **empty**, even though the plan's frontmatter carries `HFLOW-04`.
The requirement reads *"The host bookings table **and availability editor** carry the design system, **and
the editor shows a week-at-a-glance preview** of what was set"* — three clauses, of which this plan spends
exactly one. `HFLOW-04` appears in **six** plans' frontmatter (14-04, 14-07, 14-12, 14-13, 14-15, 14-16);
the availability editors (D-155) and the week strip (D-152/D-153) are downstream. Ticking it here would
mark a requirement satisfied whose larger half has not shipped. Precedent: 14-02, 14-03 and 14-05 all made
the same call for their shared requirements. `requirements-advanced: [HFLOW-04]` records the half spent.

## User Setup Required

None — no external service configuration, no environment variable, no package install. (The 320px
measurement used the already-running local Docker Postgres and the existing UAT seed, and deleted the three
rows it added.)

## Next Phase Readiness

**Ready.** `/host/bookings` is the third of the phase's five surfaces to take the shell and the header
pattern, and it is the one whose "do not change this" list is now enforceable rather than aspirational.

Three standing notes for the plans that follow:

1. **`src/lib/host/bookings-copy.ts` is the copy-ownership precedent for this phase.** A surface whose page
   and plate both render the same sentence should get one of these rather than a third hand-typed copy. It
   is the sentence-side twin of what `HOST_LIST_SHELL` did for the container.
2. **The two new GATE-NOREG cases are the shape for a shared-fragment property.** Any later plan that
   restyles a surface reading `queryHostBookings`, `queryBookerBookings` or `queryHostAgenda` should check
   whether the property it is relying on is asserted against *its* query or only against a sibling.
3. **`HostBookingRow`'s refund line still spells the small-text utility** where the page beside it now names
   the label role. Whichever HFLOW-04 plan opens that component should fold it in; the two compute
   identically today (both 14px, measured), so it is a naming debt and not a rendering one.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All five claimed files exist on disk and both claimed commits (`bab26a7`, `3c3d4b6`) resolve in `git log`.
No missing items.
