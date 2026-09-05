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

## 19.1-10 — an absent `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` takes the whole `(host)` subtree down

**Found during:** 19.1-10 Task 1, reproducing `e2e/overflow-320.spec.ts:3400` under `gate-e2e`'s
environment (every Cloudinary variable emptied).

**Observed, on the dev server's stderr:**

    [browser] [boundary] (host)/host Error: A Cloudinary Cloud name is required, please make sure
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set and configured in your environment.

`src/components/listing/photo-uploader.tsx` renders `<CldUploadWidget>`, and `next-cloudinary` THROWS
at render when that variable is absent. The throw is caught by the route's error boundary, so the
wizard's photos step renders NOTHING — not a degraded uploader, not a message about photos being
unavailable, but no step. A single missing PUBLIC configuration value removes a whole surface.

**Why it is not fixed here:** the fix is in product source (a guard around the widget, or a rendered
"photo uploads are unavailable" state), and 19.1-10 modifies no product file. The plan's subject is
the CI signal, and that half IS closed: `playwright.config.ts` now supplies an invented placeholder to
every server the e2e suite boots, so the gate measures the step rather than the error boundary.

**Suggested disposition:** decide whether an absent public cloud name should degrade or crash. It is a
deployment-shaped risk rather than a test one — a Vercel environment missing this variable would take
`/host/listings/[id]/edit` down in production the same way, and no gate would now notice, because the
e2e harness supplies its own. ⚠ That last clause is the cost of this plan's repair, stated plainly: it
buys a true CI signal for the 320px layout and it removes the accidental one for the missing variable.
**Severity:** medium — a real production failure mode, currently unguarded and now unwatched.

## 19.1-12 — a hydration mismatch on the two `checkout` baselines, which are currently GREEN

**Found during:** 19.1-12 Task 1, reading `gate-visual`'s job log (run `33968421339`, job
`101312530205`) for the mismatch `19.1-RESEARCH.md` reported without locating.

**Located, from the log's interleaved `[WebServer]` and reporter lines:** it fires twice, at
`13:22:04.754` and `13:22:12.588`, bracketed by test 49 `checkout-320-court.png` (passed, 9.3s) and
test 50 `checkout-1280-court.png` (passed, 6.0s). The React stack names `url={"/listing..."}`
`params={{id:"vrt_li..."}}`.

    [browser] Uncaught Error: Hydration failed because the server rendered text didn't match the
    client. As a result this tree will be regenerated on the client.

**Why it is not fixed here:** the surface it fires on is not among this plan's twelve failing
baselines — both `checkout` rows pass — so no image this plan regenerates is downstream of it, and
19.1-12 modifies no product source. Fixing it means finding which text differs between server and
client render on the listing/checkout tree, which is a product investigation and not a CI one.

**Why it is worth keeping:** a hydration mismatch means the DOM the screenshot captured is one React
regenerated on the client, so those two baselines are green by timing rather than by construction.
They passed all three attempts of this run, which bounds the risk but does not remove it. If
`checkout-320` or `checkout-1280` ever starts flapping, this is the first thing to read.

**Severity:** low today (both baselines green, three-for-three), medium if either begins to flake.

## 19.1-12 — `scripts/seed-baseline-fixtures.ts` seeds `created_at` with `now()`, and four baselines read the clock

**Found during:** 19.1-12 Task 1, reading the uploaded diff images rather than the height arithmetic.

**Two date-dependent differences, both measured and both confirmed in source:**

* the availability calendar marks today with a neutral ring
  (`src/components/availability/availability-calendar.tsx:661`), so the September 2026 grid gains a
  marked cell on day 5 that the 2026-08-30 baseline does not have;
* `Host since August 2026` renders as `Host since September 2026`, because
  `scripts/seed-baseline-fixtures.ts:193` inserts the host with `created_at` = `now()`,
  `src/components/listing/host-block.tsx:159` renders `formatMemberSince(createdAt)`, and
  `src/lib/profile.ts:74` formats it as long month plus year.

**Which baselines:** `HostBlock` and `AvailabilityCalendar` are rendered by exactly one route,
`src/app/listings/[id]/(detail)/page.tsx` — so `listing-detail-320`, `listing-detail-768`,
`listing-detail-1280` and `collision-notice-1280`. The other eight failing baselines are clean.

**Why it is not fixed here:** 19.1-12's Task 2 is a blocking human classification and this plan halted
there. Whether the calendar's today-ring and a member-since line are correct product behaviour that the
FIXTURE must pin (freeze the seeded `created_at`, and pin the clock the visual project runs under), or
something else, is a decision this executor is specifically forbidden to make on the PM's behalf.

**Why it matters:** regenerating these four today mints a reference that records *today is 5 September*
and *Host since September 2026*. They go red again on 6 September and again on 1 October. D-04's
purpose is that `gate-visual` stops being red on every push; regeneration alone buys one push.

**Severity:** high for the plan — it is the difference between a gate that is green and a gate that is
green until tomorrow.

## 19.1-12 — the SC2 guard suite is a WINDOWS-ONLY green: 6 of its 36 cases are red on every LF checkout

**Found during:** 19.1-12 Task 1, reading `gate-db-free`'s log after the first push of this phase's work
(run `33968421339`, job `101312530095`). This is the first time plans 19.1-01 through 19.1-11 have run
in CI at all — `dev` was 125 commits ahead of `origin/dev`, so every one of them was validated on this
laptop only.

**Measured, not suspected.** `npm run test:design` is 36/36 here and **6 failed | 30 passed** on the
runner, with `YAMLParseError: All mapping items must start at the same column`:

    × case 7:  continue-on-error as an Actions expression on the JOB is red
    × case 11: a job-level defaults: block on gate-e2e is red
    × case 18 (CR-03): a literal continue-on-error on the gate-db-free JOB is red
    × case 19 (CR-03): continue-on-error as an Actions expression on the gate-db-free JOB is red
    × case 22 (CR-03): a job-level defaults: block on gate-db-free is red
    × case 25 (CR-01): a nothing-matching branch list on the pull-request trigger is red

**Reproduced locally and controlled, in that order.** Converting `ci.yml` and `baselines.yml` to LF in
the working tree reproduces **exactly those six**, same names, nothing else. Then the control: the SAME
six fail at `f03be7b^` — the tree WITHOUT this plan's upload step — so 19.1-12's edit is exonerated by
measurement rather than by argument. The working tree was restored from a pre-measurement copy and the
suite verified back at 36/36 with an empty `git diff HEAD -- .github/`.

**The cause, and it is one class:** the mutation builders that insert a key at JOB scope or into the
`on:` block reassemble the file around a hardcoded `\n`. On a CRLF working tree the surviving `\r`
happens to keep the emitted YAML well-formed; on an LF checkout the inserted line lands at the wrong
column and `yaml` refuses the document. STEP-scope builders are unaffected, which is why all twelve of
plan 06's own cases (25–36) survive except 25, the one trigger-level case among them.

**Why it is not fixed here:** `tests/design/workflow-invariants.test.ts` is not in 19.1-12's
`files_modified`, the defect is not caused by this plan's task, and the scope boundary says an
out-of-scope discovery is logged rather than repaired. Repairing six mutation builders in the phase's
most sensitive file, inside a plan halted at a blocking-human checkpoint, is scope creep on exactly the
artifact that is supposed to be trustworthy.

**Why it matters more than its size suggests.** These six cases are the standing memory of CR-01 and
CR-03 — the trigger-neutering vectors and the job-level softening vectors. On the machine that gates the
repository they do not run; they error. A guard suite that is green only on its author's laptop is the
same category of defect as plan 19.1-06's row 6: a check whose printed name claims a property it is not,
on that machine, testing. It should be fixed by making the builders use `eolOf(text)` — the idiom
19.1-12 used for its own `ci.yml` insertion precisely because of the note in this phase's own
environment brief — and re-run somewhere with an LF checkout before being believed.

**Severity:** high. It is not a broken product; it is a broken instrument, and the instrument is the one
this whole phase is building.

#### CLOSED — repair 2026-09-05, orchestrator-directed between waves

Full transcript: `evidence/eol-mutation-builders.txt` (6 sections + VERDICT).

**Reproduced first, from scratch, on an LF tree** — `tr -d '\r'` over the two workflow files and
nothing else. Exactly the six named above, and no others: **6 failed | 30 passed (36)**, against
**36/36** on the untouched CRLF checkout at the same commit.

**⚠ THE DIAGNOSIS ABOVE WAS HALF RIGHT, AND THE HALF THAT WAS WRONG MATTERS.**

1. **Two of the six were never parse errors.** Cases 7 and 11 target `gate-e2e`; on an LF tree their
   mutation landed one line early, at the tail of the PRECEDING job (`gate-price-parity`), which no
   invariant watches for softening. The checker parsed a valid file and **exited 0**. So two of the
   six did not error on the runner — they went green over a mutation they were written to redden,
   which is a worse failure than the four that threw. (Case 25's error is also not the column error
   but `Map keys must be unique`: its filter landed under `push:`, which already has `branches:`.)
2. **The hardcoded `\n` anchors are NOT the defect** — measured, not argued. The cause is one line
   in the shared primitive `insertAfterLineContaining`: `ci.indexOf(eol, at)` began the search for
   the anchored line's end **at the anchor's own first byte**. For the two builders whose anchor
   starts with a terminator, `at` IS a terminator on LF, so the search returns `at` and the
   insertion goes one line early. On CRLF the same search skips the `\r` and stops at the `\n` one
   byte later — inside the SAME terminator — and comes out correct. **The bug hid behind one byte.**

**Three controls, each reverting one half of the repair, run against an LF tree:**

| control | reverted | result |
| --- | --- | --- |
| A | the primitive AND both `\n` anchors (= HEAD) | 7 failed / 31 — the six, plus new case 37 |
| B | ONLY the `\n` anchors; primitive repaired | **39 passed** — the anchors are not the defect |
| C | ONLY the primitive; anchors composed from `eolOf` | the same six fail — **and on CRLF too** |

Control C is the one worth remembering: `eolOf`-composed anchors do not make a builder correct, they
make it **EOL-symmetric** — wrong on both checkouts instead of wrong on one. That is the fail-closed
direction, and it is why both edits shipped: the primitive fix is the repair, the `eolOf` anchors are
the insurance that a future arithmetic slip is red on this laptop as well as on the runner.

**Three new cases hold the class closed, and each was proved by putting the defect back:**
`case 37` (every builder mutates an LF copy and a CRLF copy identically, and writes no bare LF into a
CRLF document — a 24-row table over all 23 builders); `case 38` (that table is a census of the file's
own `function with…` declarations, so a builder added later without an entry is RED); `case 39` (the
two terminator-anchored builders insert on the line AFTER the key they name — the correctness claim,
added because case 37 is green under control C and would have missed it).

**Every builder was audited, not just the two named** — all 23, listed one by one in section 2 of the
evidence with the reason each is safe. Exactly two carried a hardcoded terminator; one primitive
carried the arithmetic.

**Gates, on BOTH checkouts:** `workflow-invariants.test.ts` **39/39 on LF and 39/39 on CRLF**;
`npm run test:design` **81 files / 1416 passed | 3 skipped** on LF and on CRLF; `verify-workflows.mjs`
exit 0 on both, still printing `All 55 invariants hold … (baselines=11, ci=36, cross=8)` — the total
did not move, and nothing outside `tests/design/workflow-invariants.test.ts` was edited.
`npx tsc --noEmit` still exactly the seven pre-existing `error TS` lines, **zero new**.

**The temporary conversion is fully reverted**, restored from byte copies taken before the first
conversion rather than via `git checkout --`: both files' sha256 are identical to the pre-measurement
values (`79647e93…` / `93f9306e…`), `git diff --stat -- .github/` is empty, and the only tracked
modification is the test file itself.

**Residual, stated not closed:** case 37 and case 39 measure the BUILDERS. The 36 spawning cases
still run against the workflow files exactly as the local checkout stores them, so a defect that
lives in the CHECKER's own handling of line endings — rather than in this harness — would still be
platform-split and still invisible here. `scripts/verify-workflows.mjs` reads with `yaml`, which is
EOL-agnostic, so there is no known instance; it is a gap in coverage, not a suspected bug.

---

## D-19.1-D — four visual baselines encode the CALENDAR, so regenerating them buys one push

- **Found during:** plan 19.1-12, Task 1's diff review (section 3), and confirmed in Task 3 by
  looking at what the dispatch actually minted.
- **Observed, two causes on one route:**
  1. The availability calendar marks TODAY. `react-day-picker@10.0.1`'s `DayPicker.js:131` does
     `if (!props.today) props = {...props, today: dateLib.today()}` — the wall clock at render —
     and neither `availability-calendar.tsx` nor `ui/calendar.tsx` passes a `today` prop.
  2. `Host since <month> <year>` is the month the seed ran:
     `scripts/seed-baseline-fixtures.ts:193` inserts the host with `created_at = now()`.
- **Which baselines:** rows 9–12 of `evidence/visual-diff-review.md` — the three `listing-detail`
  widths and `collision-notice-1280`. `HostBlock` and `AvailabilityCalendar` are rendered by exactly
  one route, `/listings/[id]`. Rows 1–8 are clean and WERE regenerated by plan 19.1-12.
- **Confirmed observationally, not inferred.** Run 33971562151 minted all twelve (the dispatch
  workflow has no filter). Cropped from the minted `listing-detail-1280` before it was un-minted:
  the host line reads `Host since September 2026`, and the September grid shows days 1–4 greyed with
  **day 5 carrying the today ring** — the day the dispatch ran. See
  `evidence/minted-rows-9-12-host-since.png` and `evidence/minted-rows-9-12-today-cell.png`.
- **What plan 19.1-12 did:** regenerated rows 1–8 and **un-minted rows 9–12** back to the restore
  point (`5d9e90f`). Those four stay RED, deliberately. D-04 permits blessing intentional drift; it
  does not permit minting a reference that expires at the next day-rollover, and the PM's
  classification was explicit that rows 9–12 are blocked on stability, not on correctness.
- **Why not fixed there:** measured against D-02's condition and found NOT small and localised —
  three changes in three layers plus a test, one of them production source
  (`availability-calendar.tsx`) whose behaviour change (the ring becomes venue-local rather than the
  rendering host's day) is a **product** question, not a fixture question. Compounding it, the
  visual project is not constructed off Linux (D-29), so the fix's effect on the rendered calendar
  cannot be observed before minting — doing it inside 19.1-12 would have put four references into
  the repository whose stability was an assumption.
- **⚠ It also means the 17-D26 seam is INCOMPLETE.** `devTodayOverride` (`?today=`) was built
  precisely to stop these four baselines expiring at the day-rollover. It moves `startMonth`,
  `endMonth`, `disabled` and the `initialDate` fallback — and it does not reach the one element that
  still expires. A reader who trusts the seam's docblock concludes it is covered; it is not.
- **Suggested disposition:** the six-point specification in
  `evidence/rows-9-12-fixture-probe.txt` is written so a follow-up plan does not have to re-derive
  any of this. Point (a) is a product decision and should be put to the PM, not assumed.

---

## D-19.1-E — `dev-theme-320-court` cannot hold still long enough to be photographed

- **Found during:** plan 19.1-12, Task 3's verifying run on the final head (`33972688199`).
- **Observed:** `gate-visual` reports `4 failed / 1 flaky / 42 skipped / 38 passed`. The flaky one is
  `dev-theme-320-court`, which failed attempt 1 in 10.1 s and passed `retry #1` in 4.3 s.
- **It is NOT a baseline mismatch, and this was measured before the log was read.** A full-image
  comparison of the failed attempt's `actual` against the committed regenerated reference returns
  **0 differing pixels, max channel delta 0** over 320×24842. The reference is correct.
- **The real reason, from the log:** `Failed to take two consecutive stable screenshots` —
  `21109 pixels (ratio 0.01 of all image pixels) are different` **between two consecutive captures of
  the page**, not against the baseline. `toHaveScreenshot` polls for two identical frames and timed
  out at 5000 ms. The attachment list naming a `-previous.png` is the signature of this failure mode
  rather than of a comparison failure.
- **Where the instability lives:** six bands — four **44 px tall** at y≈2542, 2594, 14597, 14649 (the
  slot-picker rows; 44 px is the `h-11` cell height) and two 10 px at y≈3746, 15849. `/dev/theme` at
  320 px is the tallest surface in the inventory at 24,842 px.
- **Why it is not fixed here:** plan 19.1-12 owns `.github/workflows/ci.yml`'s upload step, the
  baseline images and its own evidence files. The unstable thing is `/dev/theme`'s slot-picker
  preview — a surface this plan neither owns nor changed, and whose instability predates the
  regeneration (the reference matches; only the page's settling does not). Widening a timeout or a
  threshold on a file this plan does not own is precisely the green-chasing edit the phase's
  prohibitions exist to prevent.
- **⚠ Note the shape, because it is the phase's own subject.** This is a test that goes green when
  you press the button again. It is currently absorbed by `gate-visual`'s two retries and reported as
  `flaky` rather than red, so nothing stops it — and a surface that needs a retry today needs two
  tomorrow. Both `injectFreezeStylesheet` and Playwright's own "disabled all CSS animations" were
  active and did not settle it, so whatever is moving is not a CSS animation.
- **Suggested disposition:** find what changes between two consecutive captures in those four 44 px
  slot rows. One hypothesis worth testing first and cheaply, NOT asserted here: if the slot-picker
  preview derives which slots are struck through from the current time, the strike-through set can
  change between two captures taken either side of a boundary — which would make this a third
  instance of the clock-dependence `D-19.1-D` records, on a surface nobody suspected. Confirm or
  refute before reaching for a timeout.

---

## D-19.1-F — the secret scanner is BLIND to this project's transactional-mail key prefix

- **Found during:** plan 19.1-14, Task 1's positive control for the pre-public secret scan.
- **Observed, on a throwaway repository, with the same image and the same command shape:** a control
  file carrying three canaries — a payment-provider LIVE secret key, a transactional-mail key with
  this project's `re_` prefix, and an AWS access key id — was committed and then deleted. gitleaks
  `v8.30.1` reported **one** finding (`stripe-access-token`). It did not fire on the mail-provider
  prefix, and it did not fire on the bare AWS key id.
- **Why this is not a finding about the scan that just ran.** That scan is fine: plan 19.1-14 ran a
  second, independent, project-specific pass precisely because a generic detector tuned to limit
  false positives can miss a project-specific spelling, and the control turned that reasoning from a
  precaution into a measurement. Patterns for the payment and mail key shapes both read ZERO across
  all 2,244 commits. Nothing was missed **this time**.
- **What is open:** the blind spot itself, for anyone who reaches for gitleaks NEXT. A pre-commit
  secret hook, a scheduled scan, or a CI secret-scanning job built on the default ruleset would report
  green over a committed mail-provider key. That is this phase's own subject wearing a different hat —
  an instrument whose green is satisfiable without the property holding — and it would be discovered
  the same way every such green in this project has been: too late.
- **Why it is not fixed here:** plan 19.1-14 owns three evidence files and a checkpoint. Adding a
  custom gitleaks rule set, or wiring a scanning job into `ci.yml`, is neither in its `files_modified`
  nor in the phase boundary (§Out of scope: "no new CI jobs beyond what the five criteria require").
- **Suggested disposition:** if a secret-scanning control is ever added to this repository, it must
  carry a `.gitleaks.toml` with explicit rules for `re_` (Resend) and for the payment provider's
  `sk_test_` / `sk_live_` prefixes, AND a watched-red case proving each rule fires — the same
  discipline `tests/design/workflow-invariants.test.ts` applies to the workflow checker. The measured
  control transcript is in `evidence/secret-scan-pre-public.txt` §"POSITIVE CONTROL".
