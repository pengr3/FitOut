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
- **Suggested disposition:** plan 06's audit. The fix shape is the one PATTERNS.md §F names —
  find the job by key (`CI_CHECKER_JOB`) and assert `npm run build` on it, keeping the substring
  filter only in the deny direction where over-matching fails closed.

---

### D-A2 — `CalendarMonthSkeleton` reserves six week rows against a five-row grid (PRODUCT defect, needs an operator decision)

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
- **Suggested disposition:** an operator decision between (1) and (2), then its own plan. Until then
  `e2e/calendar-hit-area.spec.ts:455` (court + grove) stays RED and is an **open product finding**,
  NOT one of the fourteen written off and NOT a known-failures-allowlist candidate. Full triage in
  `evidence/triage-calendar-hit-area.txt` §2 (FINDING D-A2) and the VERDICT.

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
