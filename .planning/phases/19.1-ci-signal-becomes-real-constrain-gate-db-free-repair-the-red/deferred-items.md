# Phase 19.1 — deferred items (out of scope for the plan that found them)

Discovered while running a plan's own `<verify>`, in a file that plan does not own. Logged
rather than fixed, per the executor scope boundary.

## D-19.1-A — `tests/design/e2e-email-silence.test.ts` times out under full-suite load

- **Found during:** plan 19.1-01, Task 3's `npm run build` verify.
- **Observed:** `LINK 1 — playwright.config.ts silences Resend for every server it boots >
  by DEFAULT the booted server gets RESEND_API_KEY=""` failed with
  `Test timed out in 5000ms` on the FIRST full-suite run of the session
  (1 failed / 1370 passed, aggregate `import 266.81s`). Run in isolation the same file
  passes 5/5 in 796 ms. A second full-suite run passed 78/78 files, 1371 tests,
  `BUILD-EXIT=0`.
- **Reading:** a cold-module-cache flake, not a defect in the assertion. The case
  `await loadWebServer("")`s `playwright.config.ts`, and on this box the first
  transform+import of that graph under parallel load exceeds vitest's default 5 s
  `testTimeout`. It is timing, not behaviour.
- **Why it is not fixed here:** plan 19.1-01 owns `scripts/verify-workflows.mjs`,
  `tests/design/workflow-invariants.test.ts` and comment lines in
  `.github/workflows/ci.yml`. Nothing it changed is reachable from this file, and a
  green-chasing timeout bump in a file this plan does not own is exactly the edit the
  phase's own prohibitions exist to prevent.
- **Suggested disposition:** whoever owns the design-suite reliability work should decide
  between a per-case `testTimeout` on the `loadWebServer` cases and leaving it — a flake
  that fires only on a cold cache is a CI risk on a fresh runner, where the cache is always
  cold. Not a decision for a plan whose subject is the workflow checker.

## D-19.1-B — two tracking-file gaps found while updating them, both pre-existing

- **Found during:** plan 19.1-02's close-out (STATE/ROADMAP update step).
- **Observed:**
  1. `.planning/STATE.md` is **2,017 lines / 510 KB**. `execute-plan.md`'s own instruction is
     "Keep STATE.md under 150 lines." Every plan that reads it pays for the excess.
  2. `.planning/ROADMAP.md`'s `## Progress` table had **no row for phase 19.1 at all**, and its
     Phase 19 row reads `11/11` where the phase directory holds fifteen `*-PLAN.md` files with
     fifteen `*-SUMMARY.md` beside them.
- **What this plan did:** added the missing `19.1 … 2/15 | In Progress` row (that is this plan's
  own required update). It did **not** touch the Phase 19 row and did **not** prune STATE.md.
- **Why not fixed here:** both are outside this plan's subject, and the Phase 19 count in
  particular is a phase-completion question — the verifier's call, never a plan's. Pruning
  STATE.md is a judgement about which accumulated context is still load-bearing, which no single
  plan is positioned to make.
- **Suggested disposition:** run `/gsd-health` or a deliberate prune pass; correct the Phase 19
  row at that phase's verification, not from inside 19.1.

## D-19.1-C — `T-11-DBFREE` anchors on a substring of a `run:` body (the CR-02 idiom, one job over)

- **Found during:** plan 19.1-05, Task 2's pre-fix evidence capture.
- **Observed:** `scripts/verify-workflows.mjs:741-751` locates the build job with
  `ciRunsByJob.filter(([, rs]) => rs.some((r) => r.includes("npm run build")))`. That is
  19-REVIEW.md CR-02's substring-anchor idiom used for a POSITIVE assertion, which
  `19.1-PATTERNS.md` §F forbids. Three consequences, all measured:
  1. It is why deleting `gate-db-free`'s build step was already red before this plan — a red
     that arrives by accident rather than an invariant about that step.
  2. It is satisfied by every SOFTENED form of the step: `npm run build --decoy` and
     `if: false` both left it green (evidence/guards-05-pre-fix.txt, MUTATIONS 5 and 6).
  3. Moving `npm run build` into a DIFFERENT job would keep it green while `gate-db-free`'s own
     gate is gone. Plan 19.1-05's build-step invariant closes 2 and 3 for `gate-db-free`; the
     anchor itself is untouched.
- **Why not fixed here:** the predicate's subject is the DB-free property, not this plan's, and
  repairing `gate-e2e`-era substring anchors is explicitly plan 06's scope (19-REVIEW.md CR-02).
  Widening or re-anchoring it from inside this plan would edit a predicate whose comment argues a
  scope this plan did not measure.
- ~~**Suggested disposition:** plan 06's audit. The fix shape is the one PATTERNS.md §F names —
  find the job by key (`CI_CHECKER_JOB`) and assert `npm run build` on it, keeping the substring
  filter only in the deny direction where over-matching fails closed.~~

#### AUDITED — plan 19.1-06, verdict **CARRIED** (row 7 of `evidence/sc2-audit-inventory.md`)

**The predicate is left as it is, deliberately, and the reason is written at the site.** The
suggested fix above was NOT applied, and should not be applied later without re-reading this.

Two things were established by the audit:

1. **Its dangerous direction is the opposite of every other row.** The property is "the job that
   builds declares no services". OVER-matching adds a *phantom* job to `buildJobs`; if that phantom
   declares services the check goes RED. A false red on a safety property fails closed, and a
   spurious extra entry can never make this check pass. UNDER-matching would be the danger here, and
   a containment test cannot under-match. This is the one place in the file where the CR-02 idiom is
   not the wrong tool.
2. **Re-anchoring it by job key would defeat its own stated purpose.** The predicate's heading says
   it is spelled by what the job DOES precisely so that it survives a rename. `CI_CHECKER_JOB` is
   the string it exists not to depend on.

**What mitigates the original concern:** consequences 2 and 3 of the finding above are already closed
by plan 19.1-05's build-step invariant, which owns the claim that `gate-db-free` runs the build —
exact `name:` anchor, trimmed exact-equality invocation, three-key allow-list. Consequence 1 (the
accidental red) is now impossible to mistake for coverage: the site carries a comment stating in full
that this predicate is **not** an assertion about the build step, and case 24 asserts the FAIL line
names the build-step invariant specifically.

**Residual, stated not closed:** moving `npm run build` into a different job still leaves this
predicate green. That is correct behaviour for *this* predicate — its subject is the DB-free
property, not job identity — and the build-step invariant is what would go red.

---

### D-A2 — `CalendarMonthSkeleton` reserved six week rows against a five-row grid — **CLOSED BY REPAIR (2026-09-05)**

- **Found during:** plan 19.1-03, Task 2 — after `reachableCalendar` stopped pinning six, the two
  AC#15 cases got past the guard and failed 52.81px LATER, at `expectSameBox`.
- **Observed:** `src/components/availability/availability-calendar.tsx` — `CalendarMonthSkeleton`
  renders `Array.from({ length: 6 })` week rows unconditionally, and its docblock derives its 409px
  from `312 = 6 × (44 + 8)`. The resolved grid renders the month's actual row count. Measured this
  session at all three widths, in both themes:
  `skeleton {"width":288,"height":410}` vs `resolved {"width":288,"height":357.1875}` — Δheight 52.81,
  Δwidth 0. That is exactly one week row (44 + 8) plus the 0.81px weekday-row approximation the
  component itself declares.
- **Why it matters:** the plate exists to occupy the box the grid will occupy — that is AC#15 /
  BFLOW-05 and the component's own "THE BOX IS THE ARGUMENT" docblock. So this is a real 52.81px
  layout shift on `/listings/[id]` when the calendar resolves. Computed over the next 12 months
  (Sunday-start): only **2 of 12 are six-row months** (2027-01 and 2027-05), so the shift is live
  **10 months in 12**. It was invisible because the spec and the component were both written in
  August 2026 — one of the two six-row months.
- **Why not fixed here:** it is a production source change, outside 19.1-03's declared
  `files_modified`, and the plan states "No production source file is modified." More importantly it
  is a **product fork** with two legitimate repairs that differ in visible UX:
  1. **Derive the plate's row count** for the month it stands in for — keeps today's appearance, but
     the plate is the PRE-HYDRATION paint, so the count is computed server-side and a
     server-vs-client month disagreement across a timezone boundary is a hydration mismatch.
  2. **`fixedWeeks` on the DayPicker call site** — one prop, removes the date dependence from the
     PRODUCT rather than from the spec, and makes the plate correct as written. Cost: every month
     then renders a trailing week of the next month.
  Both ripple into `e2e/skeleton-geometry.spec.ts`, `tests/design/skeleton-a11y.test.tsx`,
  `src/lib/design/selector-contract.ts` and the component's own 409px docblock arithmetic.
- ~~**Suggested disposition:** an operator decision between (1) and (2), then its own plan.~~

#### CLOSED — repair 2026-09-05, orchestrator-directed between waves 2 and 3

**The decision:** the operator chose **(1) derive the plate's row count**. **(2) `fixedWeeks` was
REJECTED** — it renders a trailing week of the next month *every* month, a permanent visible UX
change. It was not implemented and must not be proposed back.

**What shipped.** `CalendarMonthSkeleton` now takes a **required** `month` prop and renders
`weekRowsForMonth(month)` week rows. `weekRowsForMonth` is `ceil((leadingBlanks + daysInMonth) / 7)`
over `Date.UTC` — pure, no clock. The Sunday week start is **measured, not assumed**: a design test
mounts this repository's own `ui/calendar.tsx` for 24 consecutive months and requires the helper to
match the `tbody tr` it renders, and the sweep includes **November 2026** (a Sunday 1st), the only
month shape where a Sunday-start and a Monday-start calendar disagree.

**How the hydration condition was met.** The condition attached to the decision was that the plate is
the pre-hydration paint, so a month re-derived from `new Date()` on each side is a hydration mismatch
near a month boundary. It is met **by construction**: `src/app/listings/[id]/(detail)/loading.tsx` is
a Server Component, reads the clock **once**, binds it to one `const`, and passes `{year, month}` as a
serialized prop. The client derives nothing, so there is no second derivation to disagree with the
first. Exercised rather than asserted in `tests/design/calendar-plate-month.test.tsx` (build-blocking)
by a real `renderToString` → `hydrateRoot` across a month boundary — **carrying a deliberately
clock-reading control that is required to FAIL**, plus a behavioural purity test and a source census.
That control earned its keep twice: it caught `vi.useFakeTimers()` stalling React's scheduler, and a
control that was silently a function of this box's own timezone. Both would have been a green that
measured nothing.

**What was MEASURED.** Reproduced first, from scratch: `skeleton {"width":288,"height":410}` vs
`resolved {"width":288,"height":357.1875}`, **Δ52.8125** — 19.1-03's numbers confirmed to the last
digit. After the repair, on **both** month shapes, every figure a printed box:

| rows | plate | resolved | Δ |
| --- | --- | --- | --- |
| 5 (2026-09, real clock) | 288/326 × 358 | 288/326 × 357.19 | **0.81** |
| 6 (2027-01, dev-server clock shifted +127 days) | 288/326 × 410 | 288/326 × 409.19 | **0.81** |

Δ0.81 at *both* counts — the plate's own declared weekday-row approximation, which does not grow with
the row count. **No tolerance was widened, no assertion deleted, no test annotated.**

**The trap, also measured.** With the row count put back to the hard-coded six, AC#15 is **2 PASSED**
under the faked January clock and **2 FAILED at Δ52.81** under the real September one. The month the
bug is invisible in is the month it was written in — which is why this was verified on a six-row month
as well as a five-row one.

**Tests closed.** `e2e/calendar-hit-area.spec.ts` AC#15 (court + grove) is **GREEN**. Those two are no
longer among the fourteen and were never allowlist candidates. ⚠ **For plan 11: the cases have MOVED —
AC#15 `:455` → `:492`, AC#14 `:302` → `:304`.** Comments only; no assertion moved.

**Ripple list, verified against the code rather than inherited.** Real: the component (+ its 409px
docblock, now `98 + r × 52` with both measured rows), `e2e/calendar-hit-area.spec.ts` (comments only),
`tests/design/skeleton-a11y.test.tsx` (the `7 * 6 + 7 + 1` literal is now two month cases). **NOT
ripples, contrary to 19.1-03's list:** `e2e/skeleton-geometry.spec.ts` (drives `/dev/theme`, which
renders no calendar at all) and `src/lib/design/selector-contract.ts` (declares the hook, encodes no
geometry). **The site 19.1-03 did not name is the one the repair needed:**
`src/app/listings/[id]/(detail)/loading.tsx`, the only mount.

**Gates:** `npm run build` exit 0; `npm run test:design` 80 files / 1394 passed; `npx tsc --noEmit`
still exactly the nine pre-existing `tests/design/` errors, zero in any file touched.

**Residuals, stated not closed** (neither is a regression, and neither reintroduces the hydration
hazard — both are about *which* month the single source names, never about the two sides naming
different ones):
1. `loading.tsx` cannot know the *listing's* zone (no params, no DB), so it uses the launch region
   (`schema.ts:223`'s `Asia/Manila` default). A listing elsewhere can be one row out for the few hours
   a year when its date, Manila's date, and the two months' row counts all differ.
2. `?date=` can open the resolved grid on a month that is not the current one (D-59 #1) and a
   `loading.tsx` cannot read search params. Unchanged by this repair; unfixable from a fallback.
3. No real-browser hydration test across a real month boundary exists. The property is proved at the
   jsdom layer with a control; section 3 of the evidence names the harness that would prove it through
   Next.js.

Full triage: `evidence/triage-plate-month.txt` (10 sections + VERDICT). The finding's original
discovery record stays in `evidence/triage-calendar-hit-area.txt` §2.

---

### `npx tsc --noEmit` has been exiting 2 on nine pre-existing errors in `tests/design/`

- **Found during:** plan 19.1-03, Task 2's verification step.
- **Observed:** 9 `error TS` lines, all in two files this plan never touched —
  `tests/design/mail-credential-refusal.test.ts` (TS2741 `NODE_ENV` missing on a `ProcessEnv`
  literal; TS2344/TS2635 on `vi.mocked(spawnSync)`; two TS7006 implicit-`any` params) and
  `tests/design/workflow-invariants.test.ts` (two more TS2344/TS2635 `spawnSync` pairs).
  Zero errors in `e2e/calendar-hit-area.spec.ts`.
- **Proof they are pre-existing rather than introduced:** at the time of the run the ONLY tracked
  modification in the working tree was `e2e/calendar-hit-area.spec.ts`
  (`git status --porcelain | grep -v '^??'` returned exactly one line), and that file contributes
  none of the nine, so HEAD produces the same nine.
- **Why not fixed here:** out of this plan's scope boundary — a different subsystem, and repairing
  `vi.mocked(spawnSync)` generics is unrelated to the calendar geometry this plan measures.
- **Suggested disposition:** whichever 19.1 plan owns the type gate. Note that this makes the
  plan-level verification line "`npx tsc --noEmit` exits 0" unachievable for any 19.1 plan until it
  is closed; the achievable form is "contributes no new `error TS` lines".

## 19.1-04 — DEFECT 3: `pickWindow`'s tz-note assertion is strict-mode ambiguous on TEXT

**Found:** 19.1-04 Task 3, post-repair. Transcript in
`evidence/triage-collision-in-place.txt` section 7 and VERDICT DEFECT 3.

`e2e/helpers/booker-seed.ts:180` asserts on the timezone note with an UNSCOPED
`getByText`. Two elements carry that text whenever two booking surfaces are in
the document — the responsive sheet below `lg:`, and the streaming overlap of
the served shell with the resolved content (the same mechanism already recorded
for `#search-category` at `booker-seed.ts:363-373`). 19.1-04 made the two ids
unique, which closes the HTML-validity and `aria-describedby` half; it does NOT
change the TEXT, so the locator still resolves to 2 and the assertion is still
strict-mode ambiguous. The plan's key-link claim that this repair "removes the
strict-mode ambiguity" is falsified by the transcript.

**Not repaired here:** outside 19.1-04's `files_modified`, shared by many specs,
and 19.1-PATTERNS section 7 charters **plan 08** to harden that helper.

**Brief for plan 08:** scope or settle the assertion the way `selectTargetDayIn`
already takes a scope. Do NOT weaken it to `.first()` — that goes green against
a page that renders only the pending shell.

**Severity:** flake, not a hard failure (it passed on retry, both variants green
overall with CI's `--retries=2`).

## 19.1-09 — THE HOST GEOMETRY CONSTANTS WERE ALL MEASURED ON A RASTERISER THAT GATES NOTHING

**Found during:** 19.1-09 Task 1, reproducing `e2e/skeleton-geometry.spec.ts:1807`.
**Full transcript:** `evidence/triage-skeleton-geometry.txt` (14 sections, one VERDICT).

`gate-e2e` runs inside `mcr.microsoft.com/playwright:v1.60.0-noble` (`ci.yml:1561-1568`), whose
Chromium quantises glyph advances to WHOLE PIXELS. Every measurement in
`e2e/skeleton-geometry.spec.ts`'s host block and in `src/lib/design/measurements.ts` is fractional —
145.17, 174.03, 218.92, 36.52, 254.05 — because it was read on a Windows laptop, where they are not.
Measured, same page, same commit, `/host/bookings` at 1280px:

| | Windows | container |
|---|---|---|
| `HOST_LISTING_TITLE` ink | 145.17 | 152 |
| the residual Space `<td>` | 183.70 | 166 |
| margin | +22.53 | **−2.00** |

19.1-09 re-measured and repaired the ONE string the failure turned on. **Everything else in that
block is still a Windows number** — `HOST_REQUEST_ROW_HEIGHT` 254.05, the 320px bars, the `(step)`
20px, `/ops`. They pass in the container today only because `HOST_TOLERANCE_PX` (4) happens to absorb
the 2–5% inflation. That is luck, not design: the next constant to drift will drift the same silent
way, red only in CI, green on every laptop that triages it.

**Suggested disposition:** whichever plan owns the CI-signal hardening. Two shapes are available —
(a) re-sweep the whole host block inside the pinned image and record both columns beside each
constant, or (b) a note at the head of the file saying which rasteriser its numbers are true of and
how to run it in the container. (b) is cheap and would have saved this plan most of its budget.

**Reproduction harness, since it is not obvious and took a while to build:** run the dev server and
Postgres on the host; `docker run --rm --ipc=host --add-host=host.docker.internal:host-gateway -v
<repo>:/repo -w /repo -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
mcr.microsoft.com/playwright:v1.60.0-noble …` with (i) a ~10-line Node loopback forwarder inside the
container mapping 127.0.0.1:3000/:5432 to `host.docker.internal` — `e2e/helpers/served-document.ts:39`
hardcodes `http://localhost:3000` — and (ii) a throwaway config that imports the real
`playwright.config.ts` and removes ONLY its `webServer` block. Do not flip `reuseExistingServer`
([17-D24]/[17-D28]). Windows `node_modules` work: `@playwright/test` and `postgres` are pure JS and
the browsers come from `/ms-playwright`.

## 19.1-09 — `src/lib/design/measurements.ts:718-732` documents a fixture title that no longer exists

**Found during:** 19.1-09 Task 2.
The plateau table beside `HOST_AGENDA_ROW_HEIGHT` names `"Geo Courts Poblacion One"` (24 chars) as
"the fixture's title, unchanged". That string was replaced on 24 August 2026 (`260824-ght`, → 20) and
again on 5 September 2026 (19.1-09, → 17, `"Geo Courts Makati"`), so the comment is now two revisions
stale. Its 19–27 plateau is also a Windows figure; in the container the plateau is **13–19**, which
is why the 20-character title reddened `(agenda row · /host)` at 320px there.

**Not repaired here:** `src/lib/design/measurements.ts` is outside 19.1-09's `files_modified`, and the
constant it documents did NOT move — only the prose around it is wrong.
**Severity:** comment only; no assertion or constant is affected.
