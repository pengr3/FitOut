---
phase: 09-open-capacity-bookings
plan: 14
subsystem: ui
tags: [search, react, jsdom, vitest, tailwind, shadcn, drop-in, occupancy-mode]

# Dependency graph
requires:
  - phase: 09-05
    provides: "SearchResultRow.occupancyMode / perHeadPriceCents / spots{remaining,cap,state}, the server-composed allInRateParts `/person` branch, and the Stage-2 rule that a `full` date never reaches a card"
  - phase: 09-11
    provides: "SpotsLeftChip (server-decided state passed straight through) and DropInBadge, both with an optional className"
provides:
  - "The drop-in search card: the Drop-in badge inline on the space-type line, the all-in ₱/person price with the shipped `Service fee included` qualifier, a date-only availability line, and the scarcity chip only when a date is in play"
  - "O2 as an executable rule: a drop-in card renders no clock time even when the searcher supplied start and end hours"
  - "Drop-in card links carry `?date=` ALONE — start/end are never put on the URL (the dead-link fix 09-05 and 09-12 both flagged)"
  - "The host `Your listings` tile prices a drop-in listing per person from the one shared allInRateParts definition, with no badge and no scarcity"
  - "A measured (not asserted) byte-identity proof for the exclusive search card across 5 prop frames"
affects: [09-15, 09-16, search, host-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A mode fork whose unsafe branch is unreachable BY SIGNATURE: `datePassLine(date, city, tz)` takes the date STRING, so the searched hours are not in scope and no later edit inside it can render one"
    - "Required-not-optional card props (`ListingCardData.occupancyMode`) so the compiler censuses every call site — the 09-08/09-09 device applied to a presentational type"
    - "Pre-fork/post-fork DOM hashing as the standard for 'the shipped surface is unchanged' (09-12/09-13 precedent), with a one-class negative control"

key-files:
  created:
    - tests/search/search-card-open.test.tsx
  modified:
    - src/components/search/search-result-card.tsx
    - src/components/listing/listing-card.tsx
    - src/app/(host)/host/listings/page.tsx
    - tests/listing/listing-card.test.tsx

key-decisions:
  - "The drop-in card's date line is composed by a helper that receives only the DATE STRING — O2 enforced by the signature, not by a comment, so the two-hour branch is unreachable by construction"
  - "The card renders NO sold-out treatment: `full` cannot reach a search card (Stage-2, OC-12), and a branch for it would be dead UI no test can pin"
  - "The `Drop-in` badge renders even when a listing has no space type — the mode must never be the silent thing on the card"
  - "The host tile's drop-in line is the ADVERTISED all-in `/person` rate (09-UI-SPEC § 4) while its `/hr` · `/day` lines stay the host's raw rates — a deliberate, documented asymmetry, since the shipped exclusive line had to stay unchanged"

patterns-established:
  - "Fork on the PERSISTED occupancy mode, never on a null rate column (09-07's leftover-columns lesson) — both new fixtures deliberately keep the exclusive rate columns so a wrongly-keyed fork fails"
  - "Server-derived scarcity is passed straight through: the card imports no threshold and compares `remaining` to nothing (T-09-13)"

requirements-completed: [OPEN-04, OPEN-01]

# Metrics
duration: 20min
completed: 2026-07-30
---

# Phase 9 Plan 14: The Drop-in Search Card Summary

**A drop-in listing is now legible in search — badged, priced per person all-in, scarcity only when a date is in play — and it can no longer advertise a time range or hand the listing page an hour window that surface cannot resume.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-30T14:09:23Z
- **Completed:** 2026-07-30T14:29:00Z
- **Tasks:** 2
- **Files modified:** 4 (+1 created)

## Accomplishments

- **O2 is now an executable rule, not a paragraph.** Two cases assert that the WHOLE rendered text of a drop-in card matches no `/\d:/` — one of them with `start=09:00&end=11:00` deliberately supplied. Reverting the availability-line fork produces exactly the sentence the spec forbids: `Available 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time` (captured below).
- **The dead link 09-05 and 09-12 both flagged is closed.** An open card's href carries `?date=` alone; `start`/`end` are not merely unused, they are never put on the URL.
- **Scarcity comes from the server, unmodified.** `SpotsLeftChip` receives `row.spots.state` and `row.spots.remaining` straight through; the card imports no threshold and compares `remaining` to nothing. With no date in play the row carries no spots and the chip does not mount at all (OC-12).
- **The exclusive card's rendering was MEASURED unchanged**, not asserted — five prop frames hashed against the pre-fork component (`git show HEAD`), all equal, with a negative control that turned all five red.
- **The host tile prices a drop-in listing per person from the one shared definition**, with no badge and no scarcity, and its header says why a later "consistency" edit must not add them.

## Task Commits

1. **Task 1: the drop-in search card branch** — `3ca1867` (feat)
2. **Task 2: the host's own listing card reads per person** — `22afa2f` (feat)

**Plan metadata:** see the final `docs(09-14)` commit.

## Files Created/Modified

- `src/components/search/search-result-card.tsx` — the four-part fork: `DropInBadge` inline on the space-type line, a date-only availability line, `SpotsLeftChip` gated on `listing.spots`, and date-only link params. New shared `niceDateOf()` (one date-token definition for both modes) and `datePassLine()`.
- `src/components/listing/listing-card.tsx` — `ListingCardData` gains required `occupancyMode` + `perHeadPriceCents`; the price line forks to the shared `allInRateParts` open branch.
- `src/app/(host)/host/listings/page.tsx` — threads both fields off the listing row.
- `tests/search/search-card-open.test.tsx` *(new)* — 6 jsdom cases.
- `tests/listing/listing-card.test.tsx` — 2 new cases + the two new fixture fields.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run tests/search/search-card-open.test.tsx` | 6 passed |
| `npx vitest run tests/search tests/listing` | 16 files / 113 passed |
| `npm test` (full suite) | **1035 passed / 4 skipped** (113 files passed, 1 skipped) — up from 1027 by exactly the 8 new cases |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors / 7 baseline warnings |
| `npm run build` | exit 0 |

### The exclusive card is unchanged — measured, not asserted

A throwaway probe rendered the pre-fork `SearchResultCard` (`git show HEAD:…`) beside the current one via `renderToStaticMarkup` at five exclusive prop frames and hashed both:

| Frame | Bytes | sha256 (16) — before \| after |
|---|---|---|
| bare | 1275 | `bb99f3f6b4f192ad` \| `bb99f3f6b4f192ad` |
| date only | 1370 | `a98f7261411e0618` \| `a98f7261411e0618` |
| date + hours + distance + cover | 1541 | `cf972e48b514dd56` \| `cf972e48b514dd56` |
| no title / no type / no rates | 1254 | `62649044f822d5d6` \| `62649044f822d5d6` |
| no city (tz-derived label) | 1370 | `ffbdbdc826cd6acd` \| `ffbdbdc826cd6acd` |

**Negative control:** changing one class on the shared container (`space-y-1 py-4` → `py-5`) turned **all five frames red**; restored, and the probe files (`tests/__probe-identity.test.tsx`, `tests/__probe-prefork-card.tsx`) were deleted before the task commit.

### Mutations executed and restored

| Mutation | Result |
|---|---|
| `if (!isDropIn)` → `if (true)` around the link params (i.e. forward start/end on a drop-in card) | case (5) RED — `Received: "/listings/open-listing?date=2025-08-08&start=09%3A00&end=11%3A00"` |
| `availabilityLine = isDropIn ? null : windowLine(...)` → always `windowLine(...)` | case (3) RED — `Received: "…Drop-in₱367.50/personService fee included**Available 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time**Fri, Aug 8 · Makati time…"` — the exact lie O2 forbids |
| host card fork keyed on `hourlyRateCents == null` instead of the mode | case (3) RED — the drop-in tile printed `₱307.50/hr · ₱1,800.00/day` |

All three reverted; `git diff` clean before each commit.

## Decisions Made

1. **O2 is enforced by a signature.** `datePassLine(date: string | undefined, city, timezone)` takes the date STRING rather than the `SearchedWindow`. The searched hours are not in scope inside the function, so no future edit to it can render a range by accident — the comment the plan prescribed is still there, but it is not the only thing holding the rule up.
2. **One date-token definition.** `niceDateOf()` was extracted so `windowLine` (exclusive) and `datePassLine` (drop-in) can never render the same searched day two different ways. `windowLine`'s output strings are byte-identical to before (proven by the identity probe's `date only` and `date+hours` frames).
3. **No sold-out treatment on the card.** `full` cannot reach a search card — Stage-2 keeps an open candidate only when the picked date still has a spot (OC-12 / 09-05). A `full` branch here would be dead UI nothing can reach and no test can pin; a comment says so instead.
4. **The badge renders even with no space type.** A drop-in listing with `primarySpaceType: null` still shows `Drop-in`. The type line forks whole (rather than appending inside the shipped `<p>`) precisely so the exclusive markup stays byte-identical.
5. **`ListingCardData.occupancyMode` is REQUIRED.** The column is `NOT NULL`; a defaulted mode here would quietly price a drop-in listing by the hour on the host's own dashboard. Required makes the compiler census the call sites — there were two (the host page and the card test).
6. **The host tile's drop-in line is the all-in advertised rate** (`₱367.50/person`) while its `/hr` and `/day` lines remain the host's raw set rates. See "Known consideration" below.

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 2 — missing critical] The `Drop-in` badge must survive a null space type**

- **Found during:** Task 1
- **Issue:** The plan's `Gym · [Drop-in]` framing assumes a type label exists. The shipped line is `{typeLabel && <p …>}`, so a drop-in listing with no `primarySpaceType` would have rendered NO badge at all — the mode silently absent on the one surface where a booker compares it against whole-space listings.
- **Fix:** The whole line forks; the drop-in branch renders unconditionally with the badge, the exclusive branch is the shipped conditional verbatim.
- **Verification:** identity probe frame "no title / no type / no rates" is byte-equal for exclusive; the drop-in path is exercised by cases 1-5.
- **Committed in:** `3ca1867`

**2. [Plan gate unsatisfiable — 15th and 16th occurrence this phase] Two acceptance greps cannot hold as written**

- `grep -c "DropInBadge" src/components/search/search-result-card.tsx` prints **2**, not 1 — a named import always adds a line. The load-bearing form `grep -c "<DropInBadge"` prints **1**. Identically for `SpotsLeftChip`: 2 lines, `<SpotsLeftChip` = 1.
- No code was reshaped to satisfy the broken gate (the alternative would be inlining the components, which defeats 09-11 entirely).
- The gates that DO hold as written: `grep -c 'occupancyMode === "open_capacity"'` = 1 (≥1 ✓); `grep -c "brand"` = **0, unchanged from before the task** (no coral added); on the host card `allInRateParts` = 4, `perHeadPriceCents` = 2, `SpotsLeftChip\|DropInBadge` = 0, `formatMoney(.*\*` = 0.

**3. [Scope choice] The two host-card cases live in `tests/listing/listing-card.test.tsx`**

- The plan allowed either file. They were put in the existing listing-card test (its `next/link` / `next/navigation` / `sonner` stubs and `makeListing` fixture already exist), which also keeps `tests/search/search-card-open.test.tsx` at exactly the 6 cases the plan's acceptance criterion counts.

---

**Total deviations:** 1 auto-fix (Rule 2), 2 documentation-only adjustments.
**Impact on plan:** No scope creep. The plan's four prescribed changes and nothing else.

## Known consideration (deliberate, spec-directed)

The host tile now shows two *semantically different* kinds of number depending on mode: `₱367.50/person` is the **advertised all-in** rate a booker is quoted (D-75), while `₱307.50/hr` is the **raw rate the host set**. This asymmetry is what 09-UI-SPEC § 4's final paragraph asks for ("from the same `allInRateParts` branch") combined with the plan's own requirement that the shipped `/hr` line render unchanged — the two cannot both hold any other way. It is commented in `listing-card.tsx` so it reads as a decision rather than an oversight. If a later plan wants one rule for the whole tile, the change is to move the exclusive lines onto `allInRateParts` too — a deliberate copy change to a host-facing surface, not a refactor.

## Issues Encountered

None beyond the two unsatisfiable greps above. The `Fri, Aug 8` fixtures are anchored on **2025-08-08** (09-08's calendar-slip finding: 2026-08-08 is a Saturday), which is what lets the spec's literal date token be pinned byte-for-byte.

## Known Stubs

None. Every branch added renders real data from the read model; nothing is hardcoded, mocked or placeholdered.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

- **Wave 5 is complete.** Next is Wave 6 (09-15), then Wave 7 (09-16, human-verify checkpoint).
- **Still open for a later plan (unchanged by this one):** `?date=` does not seed the picked date on the listing page's `DatePassPicker` (documented in 09-12; the shipped exclusive calendar behaves the same way). The link this plan fixed now delivers a resumable, hour-free `?date=` — the receiving half is what remains.
- **For 09-15/09-16:** 09-UI-SPEC § 5b's remaining drop-in copy forks (cancel review context line, "before the space opens" tier rationale, generic policy disclosure) are still owed.

## Self-Check: PASSED

All 5 claimed source/test files exist on disk, both task commits (`3ca1867`, `22afa2f`) are in `git log`, and both throwaway probe files are gone (`ls tests/__probe*` → no such file).

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-30*
