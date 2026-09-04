---
phase: 14-host-tooling
plan: 02
subsystem: data
tags: [postgres, timezone, read-model, drizzle, vitest, integration-test, idor, owner-scoping]

# Dependency graph
requires:
  - phase: 07-booking-management
    provides: "`bookings-query.ts` — the owner-scoped host row shape, `isoUtc`, `readDbNow`, the keyset bound-instant idiom, and `tests/security/bookings-owner-scope.test.ts`'s crossed two-host fixture"
  - phase: 09-open-capacity
    provides: "`hours-lock.ts`'s per-row-column `AT TIME ZONE l.timezone` shape and its settled `starts_at`-decides-the-day rule, plus the clock-relative-fixture discipline"
provides:
  - "`queryHostAgenda(dbConn, {hostId, now})` — the phase's one new owner-scoped read: today's sessions in each venue's OWN local day plus D-142's next-upcoming fallback, from ONE statement driven by ONE bound clock instant"
  - "`HostAgenda` / `HostAgendaBucket` / `HOST_AGENDA_TODAY_LIMIT` — the shape and bound every downstream agenda surface consumes"
  - "`ACTIVE_STATUS_SQL` — the upcoming tab's status half, now a single owned fragment spliced by four predicates instead of typed out in each"
  - "`hydrateRow` — the module's one driver-row-to-`BookingListRow` boundary, now shared by the paged reads and the agenda"
  - "`tests/booking/agenda-query.test.ts` — the D-141 day rule, executable, with the two-zone straddling-midnight falsifying fixture"
  - "the agenda read inside the shipped owner-scope matrix (4 new cases, T-14-02-IDOR)"
affects: [14-03, 14-04, 14-05, 14-06, 14-07, 14-08, 14-09, 14-10, 14-11, 14-12, 14-13, 14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A venue-local day boundary is decided by projecting BOTH sides into the joined row's OWN timezone column, never into UTC and never into a bound zone string"
    - "A read whose answer depends on 'now' takes the clock as a BOUND PARAMETER read once via `readDbNow`, so one instant drives the predicate, the badge and the countdown"
    - "Two buckets that must agree on a predicate splice ONE fragment; a shared fragment is a different claim from two people typing carefully"
    - "A fixture instant is asked of Postgres as an offset from a NAMED VENUE's own local midnight, so a midnight-straddling fixture is still one tomorrow"
    - "A mutation probe is run before the case is trusted — a case that survives a dropped predicate is not a case"

key-files:
  created:
    - tests/booking/agenda-query.test.ts
  modified:
    - src/lib/booking/bookings-query.ts
    - tests/security/bookings-owner-scope.test.ts

key-decisions:
  - "`next` is null whenever `today` is non-empty — D-142's row is returned in exactly the one situation D-142 asks for it, so the double-count cannot be written rather than merely being discouraged"
  - "`ACTIVE_STATUS_SQL` was extracted rather than copied, because 'both buckets carry the identical status half' has to be true by construction; the emitted SQL is unchanged and `views.test.ts` + `booking-status.test.ts` were re-run UNEDITED as the proof"
  - "The projection is `queryHostBookings`'s verbatim including the `kind='payout'`-scoped LEFT JOIN, even though the agenda row does not render payout state — carrying the correctly-scoped join costs nothing and removes the chance a later plan adds the column back without the predicate (T-07-33)"
  - "The optional 26-hour UTC pre-filter is documented in the docblock and deliberately NOT taken — it buys nothing at v1 row counts and an unexercised bracket around a day boundary is wrong for one hour a year with nothing watching"
  - "The owner-scope cases reuse the shipped crossed fixture UNCHANGED by exploiting the injected clock — reading at the instant an existing booking starts, rather than seeding new 'today' rows that would have moved the shipped exact-set assertions"

patterns-established:
  - "The day-boundary rule is written down in the code (a docblock with the predicate and its three decisions) and executable beside it, so neither can drift without the other going red"
  - "Each integration case gets its OWN host and listings, so every assertion is an exact set rather than a membership probe"

requirements-completed: []

# Metrics
duration: 20min
completed: 2026-08-23
---

# Phase 14 Plan 02: The Venue-Local "Today" Read Summary

**`queryHostAgenda` answers "what is happening today" in each venue's own local day from one bound
database instant and one owner predicate, and the two-zone straddling-midnight case that a UTC comparison
gets wrong is now a committed fixture that has been watched rejecting the wrong rule.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-23T08:38Z (baseline `tsc` 08:39)
- **Completed:** 2026-08-23T08:56Z
- **Tasks:** 3
- **Files modified:** 3 (2 modified, 1 created) — 892 insertions, 7 deletions

## Accomplishments

- **The phase's one genuinely new piece of logic exists, in the module that already owns the host row.**
  `queryHostAgenda` is a UNION ALL of two bounded subqueries over `queryHostBookings`'s projection, JOIN set
  and owner predicate — one `execute` call, asserted as a count rather than as a timing.
- **D-141 is answered in writing and in code.** The predicate, and the three things about it that are
  decisions rather than syntax (per-row zone COLUMN; `starts_at` not `ends_at`; a bound clock instead of SQL
  `now()`), are in the function's docblock. The executable half is `tests/booking/agenda-query.test.ts`.
- **The wrong rule has been observed producing the wrong answer, twice over.** The UTC comparison does not
  merely mis-order a two-timezone edge case: the probe showed it also **silently truncates the morning of an
  ordinary single-venue host anywhere east of UTC**. That was not predicted; it was found, and it is
  recorded in the test's header.
- **Three copies did not get minted.** The status half became one owned fragment (`ACTIVE_STATUS_SQL`) that
  four predicates splice; the `Date` hydration became one boundary (`hydrateRow`) that the paged reads and
  the agenda share. Both extractions emit exactly what shipped, and the shipped tests were re-run unedited
  to say so.
- **The agenda sits inside the same owner-scope proof as the two reads it sits beside** — four cases added
  to the shipped crossed fixture, `118` lines added and `0` deleted, all four observed red against a widened
  predicate while the eleven shipped cases stayed green.
- **Zero migrations, zero packages, zero design-gate movement.** `git diff --stat drizzle/` is empty across
  all three commits; `package.json` and `package-lock.json` are untouched; `npm run test:design` is still
  exactly 49 files / 827 passed / 3 skipped / 0 failed.

## Task Commits

1. **Task 1: `queryHostAgenda` — two buckets, one statement, one clock** — `f4fb400` (feat)
2. **Task 2: The day boundary, proved against real Postgres with a two-zone falsifying fixture** — `0668863` (test)
3. **Task 3: The agenda read joins the existing owner-scope matrix** — `ae2b70c` (test)

## Files Created/Modified

- `src/lib/booking/bookings-query.ts` — `+252/-7`, now 577 lines. Adds `HOST_AGENDA_TODAY_LIMIT`,
  `HostAgendaBucket`, `RawAgendaRow`, `HostAgenda`, `hostAgendaProjection`, `hostAgendaFrom` and
  `queryHostAgenda`; extracts `ACTIVE_STATUS_SQL` and `hydrateRow` from code that already existed.
- `tests/booking/agenda-query.test.ts` **(created, 529 lines)** — 15 cases against the isolated per-file
  schema, one host per case. Header carries the verbatim mutation record.
- `tests/security/bookings-owner-scope.test.ts` — `+118/-0`, now 373 lines. A fourth `describe` block
  (`T-14-02-IDOR`) on the existing crossed fixture.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (baseline, before any edit) | exit **0** |
| `npx tsc --noEmit` (final) | exit **0** |
| `npx vitest run tests/booking/views.test.ts tests/booking/booking-status.test.ts` (after Task 1, tests UNEDITED) | 2 files / **38 passed** — `queryHostBookings` and the status derivation provably untouched |
| `npx vitest run tests/booking/agenda-query.test.ts` | 1 file / **15 passed** |
| `npx vitest run tests/booking tests/availability` | 74 files / **822 passed / 0 failed** |
| `npx vitest run tests/security` (shipped baseline, before Task 3) | 9 files / **65 passed** |
| `npx vitest run tests/security` (final) | 9 files / **69 passed** — strictly higher, as required |
| `npx vitest run tests/booking tests/security tests/availability` (plan verification) | **83 files / 891 passed / 0 failed** |
| `npm run test:design` | **49 files / 827 passed / 3 skipped / 0 failed** — the 14-01 baseline, unmoved |
| `npx eslint` on all three touched files | exit **0** |
| `git diff --stat drizzle/` | **empty** — zero migrations (PROJECT D-136) |
| `git diff --stat src/lib/db/schema.ts` | **empty** |
| `git diff --stat HEAD~3 HEAD -- package.json package-lock.json` | **empty** — no package installed |
| `git diff --diff-filter=D` per commit | **no deletions in any of the three commits** |
| `grep -rn 'queryHostAgenda' src/lib/ --include=*.ts \| grep -v bookings-query` | **nothing** — exactly one owner |
| `grep -c 'AT TIME ZONE' src/lib/booking/bookings-query.ts` | **1 → 4**; the two new statement occurrences both name `l.timezone`, the joined listing's column |
| `grep -n 'new Date()' src/lib/booking/bookings-query.ts` | **nothing** — none added |
| `grep -nE '20[0-9]{2}-[0-9]{2}-[0-9]{2}' tests/booking/agenda-query.test.ts` | **nothing** — every instant is clock-relative |
| `git diff --numstat tests/security/bookings-owner-scope.test.ts` | **118 added / 0 deleted** — T-07-28/29/30 extended, never replaced |

**No Playwright invocation was needed or made.** `e2e/availability.spec.ts:261` — the pre-existing standing
red — was neither touched nor claimed.

### Mutation 1 — the day boundary has been observed rejecting the wrong rule

Task 2's acceptance criterion. The venue-local comparison in `queryHostAgenda` was replaced with the rule
the whole file exists to reject — both sides projected into UTC instead of into the joined listing's own
timezone. Observed:

```
 ❯ tests/booking/agenda-query.test.ts (15 tests | 2 failed) 815ms
     × 1 · a far-east venue whose local day has already rolled over is NOT on today's agenda, and a
       far-west venue's session at the very same instant IS 13ms
     × 4 · cancelled and declined are absent; pending, requested, approved and confirmed are present 5ms

 FAIL  … > 1 · a far-east venue whose local day has already rolled over is NOT on today's agenda, and a
 far-west venue's session at the very same instant IS
AssertionError: expected [ 'ag_bk_east', 'ag_bk_west' ] to deeply equal [ 'ag_bk_west' ]

- Expected
+ Received

  [
+   "ag_bk_east",
    "ag_bk_west",
  ]

 FAIL  … > 4 · cancelled and declined are absent; pending, requested, approved and confirmed are present
AssertionError: expected [ 'ag_bk_approved', 'ag_bk_confirmed' ] to deeply equal [ 'ag_bk_pending', …(3) ]

- Expected
+ Received

  [
-   "ag_bk_pending",
-   "ag_bk_requested",
    "ag_bk_approved",
    "ag_bk_confirmed",
  ]
```

**TWO cases went red where the plan predicted one, and the second is a finding.** Case 4's six sessions are
seeded at Manila 06:00–11:00, which is 22:00–03:00 UTC — so under the UTC rule the day boundary falls
*through the middle of one venue's business day* and the two earliest sessions drop off the agenda entirely.
The wrong rule is therefore not a two-timezone edge case at all: it silently truncates the morning of an
ordinary single-venue host in any zone east of UTC, which is **every FitOut host at launch** (single-city
PH, `Asia/Manila`, UTC+8). Nothing about that surface would look broken.

Reverted → 15/15 green → `git diff --exit-code src/` printed nothing.

### Mutation 2 — the owner predicate has been observed being the thing that scopes

Task 3's acceptance criterion. `l.host_id = $1` was widened to `l.host_id IS NOT NULL` on **both agenda
buckets only**, leaving the two shipped reads untouched. Observed:

```
 ❯ tests/security/bookings-owner-scope.test.ts (15 tests | 4 failed) 727ms
     × gives host A only the sessions on host A's listing, with host B's rows present in the DB 20ms
     × gives host B their own rows and none of host A's — the symmetry that a bare empty result cannot fake 8ms
     × never lets either bucket carry a row on a listing the host does not own 9ms
     × returns empty buckets and no error for a host with no listings 5ms

AssertionError: expected [ { id: 'os_bk_by_b', …(21) } ] to deeply equal []
     … "bookerFirstName": "Ben", "listingId": "os_listing_a", "listingTitle": "A's Space" …
```

All four new cases red, the eleven shipped ones green — which is the scope claim as well as the sensitivity
one. The dumped row is the leak in full: host B is handed host A's listing, host A's title, and the first
name of a person who never booked with them.

Reverted → 15/15 green → `git diff --exit-code src/` printed nothing.

## Decisions Made

**1. `next` is null whenever `today` is non-empty.**
The `next` bucket's predicate is `starts_at > $now`, which a *later-today* session satisfies — so on a busy
day the soonest future row is usually also a `today` row. Returning it anyway hands every consumer the same
footgun: render both and one session is announced twice, once as an agenda row and once as "next". D-142
asks for this row in exactly one situation ("with nothing today…"), so it is returned in exactly that
situation and the double-count **cannot be written**. The plan's case 5 phrasing ("whatever the next bucket
contains is not double-counted by the caller") admits a weaker reading where the caller is trusted to
remember; the stronger reading was taken because a rule enforced by a return value outlives a rule enforced
by a comment. The SQL still runs the `next` subquery, so this costs zero round trips and the raw bucket is
one line away if a later plan turns out to want it with an argument for why.

**2. `ACTIVE_STATUS_SQL` was extracted, not copied.**
The plan says to reuse `tabPredicate("upcoming")`'s status clause rather than mint a third set. Reuse is
only literally possible if the clause is a fragment, so it became one, and `tabPredicate` now splices it —
which means the two agenda buckets and the two tabs are identical *by construction*, not by review. The
counter-argument (that touching `tabPredicate` risks the shipped partition) is answered by execution rather
than by argument: `views.test.ts` asserts the tabs are disjoint AND exhaustive as a set property, and it
plus `booking-status.test.ts` were re-run **unedited** immediately after the extraction — 38 passed.

**3. The projection carries the payout LEFT JOIN even though the agenda row does not render it.**
D-140's row is booker first name, space title, venue-local window, status — no payout. The join was kept
anyway, with its `kind = 'payout'` scope intact, because that scope is the T-07-33 control: a
`host_cancel_fee` row is a signed DEBIT sharing the same `booking_id`, and an unscoped join tells a host
their cancelled booking is about to pay out. Carrying the correctly-scoped join costs one bounded LEFT JOIN
on a set already bounded by the host predicate, and removes the scenario where a later plan adds the column
back and reconstructs the join without the predicate.

**4. The 26-hour pre-filter is documented and deliberately not taken.**
14-RESEARCH proves it is correctness-preserving and would make the shape index-narrowable. It is not taken
because at v1 row counts it buys nothing measurable, and an unexercised bracket around a day boundary is
exactly the kind of clever narrowing that is wrong for one hour a year with nothing watching. The docblock
records that it exists, why 26 hours is provably sufficient, and why it was left out — so the next reader
under load reaches for it rather than for a migration.

**5. The owner-scope cases seeded no new rows.**
The obvious way to test the agenda on the crossed fixture is to add "today" bookings to it. That would have
broken the shipped `expect(asBooker.rows.map(r => r.id)).toEqual([BOOKING_BY_A])` exact-set assertions and
turned an additive change into a replacement. Because D-141 makes the clock an *injected parameter*, each
new case instead reads **at the instant one of the existing crossed bookings starts** — which is venue-local
"today" for exactly one of the two hosts. The diff is 118 added, 0 deleted, and the shipped cases are
byte-identical. This is a second, unadvertised payoff of the bound-clock decision.

**6. Each integration case owns its host and listings.**
`agenda-query.test.ts` seeds seven hosts rather than one. A shared host would have made case 1's "the agenda
contains exactly this" untestable the moment case 2 seeded another session on the same local day, forcing
every assertion down to a membership probe — a strictly weaker claim, because a membership probe cannot
notice a row that should not be there. Both mutations above were caught by set equalities.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The first owner-scope case survived the mutation probe and was strengthened**
- **Found during:** Task 3, running the acceptance criterion's widening probe
- **Issue:** The case as first written asserted only host A's agenda at `AGENDA_CLOCK_A`. At that instant
  there is exactly one session "today" across *both* hosts, so a query with **no owner predicate at all**
  returns host A the very same single row. The case passed the probe. An assertion a dropped predicate
  cannot break is not an assertion — and it would have shipped as one, since it was green in both directions.
- **Fix:** Added the counterpart read — host B at the same instant, whose listing has nothing today, so any
  row at all in that result is host A's leaking. Re-ran the probe: the case now goes red. The block comment
  records the discovery and the general lesson (a scoping claim needs both sides asked, not one side
  answered), because the same trap is available to every future case added to this file.
- **Files modified:** `tests/security/bookings-owner-scope.test.ts`
- **Commit:** `ae2b70c`

### Disclosures that are not deviations

**(a) Two extractions inside `bookings-query.ts` touched existing code.**
`ACTIVE_STATUS_SQL` changes `tabPredicate`'s two lines, and `hydrateRow` changes one line of `toPage`. Both
are the plan's own instruction ("reuse … rather than minting a third status set", "the same `Date` hydration
on the way out") taken literally, both emit exactly what shipped, and the acceptance criterion for it — the
two shipped test files re-run with zero edits — passed. Disclosed rather than absorbed silently, since the
plan's `<files>` for Task 1 could be read as "additive only".

**(b) One docblock caveat was added to `queryHostAgenda` during Task 2's commit.**
`displayStatusExpr` is spliced verbatim and still derives `completed` against SQL `now()`, not against the
bound `$now`. That is deliberate (it is the shipped D-102 rule, and re-parameterising it would change
`queryHostBookings` too) and harmless (the caller reads `readDbNow` microseconds earlier, well inside the
`ends_at <= now()` boundary being compared). But a reader arriving at "one instant drives everything" and
then seeing `now()` two lines up deserves the sentence rather than a puzzle, so it is stated at the code
site. Documentation only — no behaviour changed, and the commit message names it.

**(c) `tests/booking/agenda-query.test.ts` has 15 cases where the plan enumerated 6 minima.**
The plan's six are all present; the extra nine are the sub-cases each one implies (the fixture assertion
that must precede case 1, the projection-completeness check, the tomorrow-side of the `starts_at` rule, the
next bucket's status half, and the no-listings case). Reported rather than left to a count comparison.

**Total deviations:** 1 auto-fixed (1 Rule 1, 0 Rule 2, 0 Rule 3, 0 Rule 4).
**Impact on plan:** none. Zero scope absorbed — no migration, no index, no package, no schema change, no
logic change to any shipped read.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-02-IDOR | **mitigated** | Ownership is a bound `WHERE l.host_id = $1` on both buckets. Four crossed-fixture cases added to `tests/security/bookings-owner-scope.test.ts`, all four observed red against `l.host_id IS NOT NULL` (message recorded above); the symmetry case proves a real predicate rather than an empty result |
| T-14-02-SQLI | **mitigated** | `hostId` and the clock instant are bound parameters. `grep -n 'sql.raw'` on the module returns exactly the one shipped `isoUtc` site (a column name) plus one comment; the agenda passes nothing caller-supplied through it |
| T-14-02-CLOCK | **mitigated** | `grep -n 'new Date()'` on the module returns nothing — none added. The clock arrives as `args.now`, documented as "must come from `readDbNow`", and case 5b threads the real `readDbNow` end to end |
| T-14-02-ZONE | **mitigated** | The predicate projects into `l.timezone`, a per-row column. The two-zone straddling-midnight fixture is committed and was observed rejecting the UTC rule — which the probe additionally showed breaks the *ordinary* single-venue PH host, not just the two-zone one |
| T-14-02-PII | **mitigated** | The projection is `queryHostBookings`'s verbatim: `u.first_name` only. No email, no surname, no phone. `git diff` on the projection block shows no column not already in the shipped host row shape |
| T-14-02-MIGRATION | **mitigated** | `git diff --stat drizzle/` empty on every commit; `src/lib/db/schema.ts` untouched. No index proposed or added — the docblock records why none is possible and none is needed |
| T-14-02-SC | **mitigated** | **No package was installed.** `package.json` / `package-lock.json` diff empty across all three commits |

No new threat surface was introduced: no network endpoint, no auth path, no file access pattern, no schema
change. `queryHostAgenda` is not yet reachable from any route — the page that calls it is a later plan's
work. No `## Threat Flags` section is owed.

## Known Stubs

None. `queryHostAgenda` returns real rows from real SQL; every field in the projection is selected from a
column. Nothing is hardcoded empty and no placeholder copy exists in either changed file.

## Declared but not yet consumed

Not a stub — this plan is deliberately the read half, and the plan that renders it is downstream (14-PATTERNS
§ 2). Recorded so a dead-code scan is not a surprise:

| Export | First expected consumer |
|---|---|
| `queryHostAgenda`, `HostAgenda`, `HostAgendaBucket`, `HOST_AGENDA_TODAY_LIMIT` | the `/host` dashboard page + the agenda component and its three states (D-140/D-142/D-143) |

## Issues Encountered

**The UNION ALL's row order is not something to assume.** The two subqueries each carry their own `ORDER
BY`, but a bare `UNION ALL` guarantees nothing about how the halves interleave — in practice an `Append`
runs them in sequence, and relying on "in practice" for the order of a host's day is the kind of thing that
holds until a plan change. Resolved by wrapping the union and ordering the outer query explicitly by bucket
rank, then start, then id. The alternative — sorting in TypeScript after partitioning — would have worked
but moves an ordering decision out of the statement that already owns every other one.

**Building a midnight-straddling fixture without writing a calendar date.** The two-zone case needs a clock
one hour past one venue's local midnight and a session two hours before it, and both of those are properties
of a *venue's local day*, not of any instant this process can name. Writing them in JavaScript would have
meant re-implementing the very rule under test in the test. Resolved with `venueInstant(zone, offset)`,
which asks Postgres for `date_trunc('day', now() AT TIME ZONE $zone) + $offset` projected back to an
instant — so the fixture is reconstructed on every run, in the zone that owns it, by the engine that will
evaluate the predicate. The far-west venue's window lands mid-morning in Los Angeles under either PST or
PDT, so the case does not depend on which side of a DST transition the run happens on.

## Requirements

`requirements-completed` is deliberately **empty**, even though this plan's frontmatter carries
`requirements: [HFLOW-03]`. HFLOW-03 is claimed by **five** plans in this phase (14-02, 14-05, 14-08, 14-15,
14-16); this one delivers the read the dashboard will stand on, not the dashboard. Checking the requirement
off here would make `REQUIREMENTS.md` claim a host can see today's sessions on a page that does not exist
yet. `requirements mark-complete` was therefore not run — the last plan that touches HFLOW-03 owns that.

## User Setup Required

None — no external service configuration, no environment variable, no package install. The DB-backed tests
need the local `postgis/postgis:18` container running, which is the existing convention.

## Next Phase Readiness

**Ready.** The agenda read is on disk, green, owner-scoped and mutation-proved.

Three things the plans that render it must carry forward:

1. **Read the clock ONCE per request and thread it.** `readDbNow(db)` → `queryHostAgenda(db, {hostId, now})`
   → the badge → the countdown. A second `readDbNow` on the same page reintroduces exactly the drift D-141
   forbade, and nothing will fail if it happens.
2. **`next` is already null on a busy day.** Render `today` when it is non-empty and the `next` sentence
   when it is not — the query has already made "both at once" unrepresentable, so no page-level guard is
   needed and none should be added.
3. **The row is `BookingListRow`, so `composeWhenLabelShort` takes it as-is.** `fullDay` and `openCapacity`
   are present and required; the venue-local window label has exactly one formatter (14-PATTERNS § S3) and
   the agenda must not grow a second.

**One standing caution, re-confirmed:** the day predicate cannot be index-sought and does not need to be.
If a later plan sees this read in a slow trace, the answer is the documented 26-hour bracket, **not** a
migration — `drizzle/` does not move in this phase (PROJECT D-136).

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All three claimed commits resolve in `git log` (`f4fb400`, `0668863`, `ae2b70c`), and all three claimed
files plus this summary exist on disk. No missing items.
