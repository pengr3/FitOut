---
phase: 16-image-crop-framing
plan: 01
subsystem: ui
tags: [shadcn, radix-ui, slider, design-tokens, design-gates, leak-gate, focus-recipe, DS-05]

# Dependency graph
requires:
  - phase: 10-design-system
    provides: the canonical DS-05 focus recipe, the DS-13 leak gate and D-17's "no vendored exemption"
  - phase: 12-listing-detail
    provides: commit `26ddcf8` — the four landing conditions this repo applies to a vendored registry block
provides:
  - "`src/components/ui/slider.tsx` — the vendored Radix Slider, token-mapped to this repo's gates on arrival"
  - "A 44px-hit-area, DS-05-focused zoom control ready for the avatar cropper's zoom row (999.2 § 2c)"
  - "The vendored-primitive census moved 31 -> 32 with the new file named, its red watched first"
affects: [16-09 crop dialog zoom row, any future phase vendoring a shadcn block]

# Tech tracking
tech-stack:
  added: []   # zero npm rows — @radix-ui/react-slider is already a dependency of the installed radix-ui@1.4.3
  patterns:
    - "A registry block and its token corrections land in ONE commit, never two"
    - "A vendored-primitive count move is watched red before it is edited"

key-files:
  created:
    - src/components/ui/slider.tsx
  modified:
    - tests/design/leak.test.ts

key-decisions:
  - "The `shadcn add` and its three token corrections are a single edit and a single commit — the emitted block is red on two gates on arrival, so a two-commit sequence would put that red on `dev`"
  - "Pinned the CLI to `shadcn@4.10.0`, the exact version commit `26ddcf8` used for `collapsible`, rather than floating `latest` over `components.json`"
  - "`bg-primary`, `touch-none` and `data-disabled:opacity-50` kept exactly as emitted — all three are load-bearing, not oversights"

patterns-established:
  - "Vendored-block arrival: read the emitted file in full, disposition every Tailwind value explicitly, correct in the same edit, admit to the census in the same commit"
  - "Census moves are proven, not asserted: run the gate, transcribe the failure, then move the number"

requirements-completed: []
requirements-advanced: [CROP-01]

# Metrics
duration: 12min
completed: 2026-08-25
---

# Phase 16 Plan 01: Vendor the Slider Block Summary

**The zoom control's primitive is in the tree with its `bg-white`, its half-alpha ring and its 28px hit area already corrected, and the leak gate counts it at 32 rather than stepping around it.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-25T07:04Z
- **Completed:** 2026-08-25T07:16Z
- **Tasks:** 2/2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **`src/components/ui/slider.tsx` vendored and token-mapped in one edit.** The block `npx shadcn@4.10.0 add slider` emits is byte-identical to the copy research quoted in §D14 — including all three things this repo rejects. All three were corrected before the file was ever staged, so the phase's first commit is green.
- **Zero npm dependencies added.** `git show --stat HEAD -- package.json package-lock.json` prints no rows. The block's only Radix import is the unified `radix-ui` package, already at `1.4.3` and already carrying `@radix-ui/react-slider` as its own dependency (re-measured this run).
- **The vendored-primitive census moved 31 -> 32 with its red watched first,** and the new file named beside the number — the same three-part move `collapsible` got at `leak.test.ts:339`.
- **`alert-dialog` was not added** (D-168), `selector-contract.ts` was not touched (Δ18), `accent-uses.ts` stays at ten (Δ9), and `drizzle/` still ends at `0025_audit_resolved_by.sql` (GATE-06).

## Task Commits

Tasks 1 and 2 share ONE commit **by the plan's own instruction** — Task 2's acceptance criteria state it explicitly: *"Task 1's file edit and this inventory move are in ONE commit (`git show --stat HEAD` lists both `src/components/ui/slider.tsx` and `tests/design/leak.test.ts`)"*. The reason is in the plan's objective: with `slider.tsx` on disk and the census still reading 31, the tree is red; splitting the commit would publish that red on `dev`.

1. **Task 1: Add the slider block and map its three rejected values** — `85a439d` (feat)
2. **Task 2: Move the vendored-primitive census 31 -> 32, watched red first** — `85a439d` (feat, same commit)

**Plan metadata:** see the `docs(16-01)` commit that carries this file.

## Files Created/Modified

- `src/components/ui/slider.tsx` — **created.** The vendored Radix Slider. Root, Track, Range and an N-thumb map over `_values`. The CLI's own formatting (no semicolons, double quotes) is untouched, as with `collapsible`.
- `tests/design/leak.test.ts` — **modified.** `it()` title 31 -> 32, `toHaveLength(32)`, a new `toContain("src/components/ui/slider.tsx")` with its own reason comment, and a paragraph recording the watched red. The `toEqual([])` violations assertion was not touched.

## The four dispositions, as landed

| # | Emitted | Landed | Why |
|---|---------|--------|-----|
| 1 | `bg-white` (Thumb) | `bg-background` | `config/design-leak-patterns.mjs` `white-black-class`, and `src/components/ui/**` is in `LEAK_SCAN_PREFIXES` by D-17 — **there is no vendored exemption** |
| 2 | `ring-ring/50` + `hover:ring-3` + `focus-visible:ring-3` + `active:ring-3` + `focus-visible:outline-hidden` | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` | `focus-recipe.test.ts:115` names `ring-ring/50` as *"the shadcn default this phase exists to delete"*; the replacement is `CANONICAL_RECIPE` (`:110-112`) verbatim |
| 3 | `after:-inset-2` | `after:-inset-4` | `size-3` (12px) + 8px/side = 28px, under Δ12's 44px bar. 12 + 32 = **44px**, and `-inset-4` is 16px — on the 4px grid, so no arbitrary value enters the tree |
| 4 | `bg-primary` (Range), `touch-none` (Root), `data-disabled:opacity-50` (Root) | **unchanged** | `--primary` is a near-black neutral in both themes and the coral is `--brand`, which the block never names, so Δ9 costs no edit; `touch-none` is the slider's half of Δ4; `data-disabled:opacity-50` gives rule F8's disabled row its treatment for free |

`border border-ring`, `transition-[color,box-shadow]`, `select-none`, `disabled:pointer-events-none` and `disabled:opacity-50` were kept, per the plan.

## The watched red (Task 2), transcribed verbatim

Run with `slider.tsx` on disk and the census still at 31:

```
 FAIL  tests/design/leak.test.ts > the DS-13 raw-design-value gate > visits all 31 vendored primitives — there is no vendored exemption (D-17)
AssertionError: expected [ Array(32) ] to have a length of 31 but got 32

- Expected
+ Received

- 31
+ 32

 ❯ tests/design/leak.test.ts:331:33
    329|     // exactly the case this positive control exists for: a new primit…
    330|     // identical, to a violations list, to a new primitive the walker …
    331|     expect(VENDORED_PRIMITIVES).toHaveLength(31);
       |                                 ^

 Test Files  1 failed (1)
      Tests  1 failed | 24 passed (25)
```

**One failure, not two — and that is the finding.** The `toEqual([])` violations assertion stayed green throughout, because the token mapping had already landed in the same edit. That green is precisely the argument for naming the file rather than trusting the count: a block whose in-scope `bg-white` was corrected before staging is, to a violations list, indistinguishable from a block the walker never opened. The reason comment now in the file says so.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit **0** |
| `npx vitest run tests/design/focus-recipe.test.ts tests/design/dark-scope.test.ts --config vitest.design.config.ts` | **2 files / 32 tests passed** |
| `npx vitest run tests/design/leak.test.ts --config vitest.design.config.ts` | **25 passed** (was 1 failed / 24 passed before the census move) |
| `npm run test:design` | **55 files, 1078 passed / 3 skipped**, exit 0 |
| `npm run lint` | **0 errors** (25 pre-existing `no-unused-vars` warnings in unrelated test files; zero findings naming `slider.tsx`) |
| `git show --stat HEAD -- package.json package-lock.json` | **no rows** |
| `node -p "…radix-ui…filter(d=>d.includes('slider'))"` | `[ '@radix-ui/react-slider' ]` |
| `git diff --stat components.json` | **no rows** — `registries` still `{}` |
| `ls src/components/ui \| wc -l` | **32** |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` — GATE-06 holds |
| `git diff --diff-filter=D HEAD~1 HEAD` | **no deletions** |
| `grep -c` acceptance set on `slider.tsx` | `bg-white\|bg-black\|text-black` **0**, `ring-ring/` **0**, `ring-3` **0**, `outline-hidden` **0**, `after:-inset-2` **0**, `after:-inset-4` **1**, canonical recipe **1**, `dark:` **0** |
| `grep -c` acceptance set on `leak.test.ts` | `toHaveLength(32)` **1**, `toContain("src/components/ui/slider.tsx")` **1**, `visits all 32 vendored primitives` **1** |

`dark-scope.test.ts`'s pins (13 files / 44 occurrences) did not move — the block carries zero `dark:` utilities, so the assertion passed unchanged rather than being re-pinned.

## Decisions Made

- **The CLI was pinned to `shadcn@4.10.0`**, the exact version commit `26ddcf8` used for `collapsible`, rather than the plan's literal floating `npx shadcn add slider`. Rationale: a floating `latest` can rewrite `components.json` (schema keys, `registries`) as a side effect of an add, and T-16-01's mitigation requires `registries` to stay `{}`. Verified after the run: `git diff --stat components.json package.json package-lock.json` printed nothing, and the emitted file is byte-identical to the `radix-nova` block research quoted on 2026-08-25. Recorded as a deviation below.
- **The canonical recipe was placed where the deleted ring utilities were**, keeping the emitted class order otherwise intact, so the four recipe tokens sit contiguous in a single string literal. `focus-recipe.test.ts` treats one class string as one element (WR-02 / IN-13), so contiguity in one literal is what makes the pairing check pass on its own merits rather than by a sibling vouching for it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking/Tooling] Pinned the shadcn CLI version instead of floating it**
- **Found during:** Task 1 (Add the slider block)
- **Issue:** The plan's action reads `npx shadcn add slider`, which resolves to whatever the registry publishes today. T-16-01's mitigation requires `components.json` `registries` to remain `{}` and the dependency graph to remain untouched — neither is guaranteed by an unpinned CLI, which can migrate `components.json` on invocation.
- **Fix:** Ran `npx --yes shadcn@4.10.0 add slider --yes` — the exact version commit `26ddcf8` used for the repo's most recent registry add. Backed up `components.json` and `package.json` beforehand.
- **Files modified:** none beyond the plan's own (`src/components/ui/slider.tsx` created)
- **Verification:** `git diff --stat components.json package.json package-lock.json` prints nothing; the emitted file matches `16-RESEARCH.md` §D14's verbatim quote of the registry item exactly.
- **Committed in:** `85a439d`

---

**Total deviations:** 1 auto-fixed (1 × Rule 3).
**Impact on plan:** None on scope or output. The deviation strengthens T-16-01's own mitigation rather than working around it.

**Not a deviation, though it looks like one:** Tasks 1 and 2 in a single commit is the plan's instruction, not a departure from it — Task 2's acceptance criteria require exactly that.

## Issues Encountered

None. The emitted block matched research §D14 byte-for-byte, the four dispositions applied cleanly, and every gate went green on the first run after the intended red.

## Threat Register Outcomes

| Threat ID | Disposition | Outcome |
|---|---|---|
| T-16-01 | mitigate | **Held.** Official shadcn registry only, CLI pinned to the repo's own precedent version, `components.json` `registries` still `{}`, emitted file read in full and all four Tailwind values dispositioned explicitly before staging. |
| T-16-02 | mitigate | **Held.** `git show --stat HEAD -- package.json package-lock.json` prints no rows; `@radix-ui/react-slider` re-measured as a dependency of the installed `radix-ui@1.4.3`. |
| T-16-03 | mitigate | **Held.** The census move was watched red (`expected … length of 31 but got 32`) before the number changed; the transcript is above. |

## Known Stubs

None. The block is complete and consumable as emitted-plus-corrections.

## Requirements

**CROP-01 — advanced, not completed.** This plan lands the zoom row's *primitive*; the requirement closes when the cropper itself ships (plan 16-09 is the named consumer). `REQUIREMENTS.md` is deliberately untouched.

## Consumer Contract (for 16-09)

Unchanged from the plan's `<interfaces>`, and re-confirmed against the landed file: pass `value={[zoom]}` as an **array**, `min={1}`, `max={maxZoom}`, `step={0.01}`, `aria-label="Zoom"`. A scalar `value` makes `_values` fall through to `[min, max]` and renders **two** thumbs at the extremes — the `Array.from({ length: _values.length })` map is intact and must not be "simplified".

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The zoom control is available as `import { Slider } from "@/components/ui/slider"` and needs no further token work at its call site.
- The remaining net-new dependency this phase must justify is `react-easy-crop` (D-167) — untouched here, so `package.json` is still clean going into the wave that adds it.
- Three inventories research flagged as moving later in the phase are **not** moved by this plan and remain open: `tests/design/profile-pass.test.tsx` (four assertions), `src/lib/design/visual-baselines.ts` (`BaselineCountIsSeventyFour` + the duplicated literal in `.github/workflows/baselines.yml`), and `src/lib/design/live-regions.ts` (26 -> 28).

## Self-Check: PASSED

- `src/components/ui/slider.tsx` — FOUND
- `tests/design/leak.test.ts` — FOUND (modified, in HEAD)
- Commit `85a439d` — FOUND in `git log`
- `.planning/STATE.md` / `.planning/ROADMAP.md` — NOT modified by this executor (orchestrator owns them)

---
*Phase: 16-image-crop-framing*
*Completed: 2026-08-25*
