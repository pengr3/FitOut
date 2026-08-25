---
phase: 16-image-crop-framing
plan: 02
subsystem: ui
tags: [avatar, copy-literals, zoom-bound, react-easy-crop, use-server-contract, design-gates, vitest]

# Dependency graph
requires:
  - phase: 999.2-profile-picture-and-listing-photo-crop-ui
    provides: "§ Copywriting's 21 AVATAR_* literals and IC-05's seven worked zoom rows — inherited verbatim, not re-derived"
  - phase: 04-profile
    provides: "`src/lib/validation/profile.ts`'s directive-free header — the argument this module inherits, and the `\"use server\"` incident it records"
  - phase: 10-design-system
    provides: "`vitest.design.config.ts` (D-16) — the DB-free, build-blocking config this plan's spec is collected by"
provides:
  - "`src/lib/avatar.ts` — the phase's contract module: 21 AVATAR_* literals, AVATAR_OUTPUT_PX, AVATAR_MIN_SOURCE_PX, AVATAR_MAX_ZOOM_CEILING, AVATAR_ALLOWED_TYPES, avatarMaxZoom()"
  - "`tests/design/avatar-zoom.test.ts` — IC-05's arithmetic as a build-blocking, DB-free gate (19 assertions)"
  - "A structural directive-prologue assertion on the contract module, so T-16-04 is asserted from both sides"
affects: [16-07 Zod schema narrowing, 16-08 avatar-canvas encode, 16-09 crop dialog, 16-10 avatar-field, 16-11 removal, 16-13 copy gate]

# Tech tracking
tech-stack:
  added: []   # zero package.json rows — package.json and package-lock.json are byte-unchanged
  patterns:
    - "One output size, read by both the encoder and the bound that is derived from it"
    - "One MIME array with two consumers, so the picker and the server schema cannot disagree"
    - "A pure-arithmetic contract lives under tests/design/, never tests/profile/, so it stays DB-free and build-blocking"

key-files:
  created:
    - src/lib/avatar.ts
    - tests/design/avatar-zoom.test.ts
  modified: []

key-decisions:
  - "The zoom spec ships at `tests/design/avatar-zoom.test.ts`, a named deviation from 16-VALIDATION.md — `vitest.design.config.ts:53` includes `tests/design/**` only, so the document's own `tests/profile/` path would pay a Postgres preflight for a function that touches nothing, and would sit outside `npm run build`"
  - "`avatarMaxZoom` is an `export function` whose docblock states the DERIVATION (crop window = min(w,h)/z real pixels, so z <= min(w,h)/AVATAR_OUTPUT_PX) rather than the formula — the bound is derived from D-172's output size, not tuned"
  - "The `no directive prologue` assertion is read over the TypeScript AST, not by grep — the module's own header quotes both directives to explain it uses neither, so a text count returns non-zero against a correct file"
  - "The header prose deliberately never spells the jsdom environment pragma, because the plan's acceptance criterion counts that token and a mention explaining its absence would fail it"
  - "IC-05's `180 x 240` row is asserted as the AVATAR_MIN_SOURCE_PX boundary rather than as a zoom row — it is refused before the dialog opens, so `avatarMaxZoom` is never called on it"

patterns-established:
  - "Contract module shape: directive-free, three-part header (what + which D-numbers own it / what it deliberately does NOT do / the prior incident), one-line docblock per export"
  - "A table of worked rows is always backed by a swept invariant, so N special cases cannot satisfy the gate"
  - "A structural detector carries a both-directions self-test in the same file (leak.test.ts:208-212's rule)"

requirements-completed: []
requirements-advanced: [CROP-01, CROP-03]

# Metrics
duration: 16min
completed: 2026-08-25
---

# Phase 16 Plan 02: The Avatar Contract Module Summary

**`src/lib/avatar.ts` now holds all 21 avatar strings, the four numbers and the one derivation the crop dialog, the guard chain, the Zod schema and the tests will each read — and IC-05's arithmetic is a 19-assertion gate that runs in 0.8s with Docker down and blocks `npm run build`.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-08-25T15:19Z
- **Completed:** 2026-08-25T15:35Z
- **Tasks:** 2/2
- **Files modified:** 2 (2 created, 0 modified)

## Accomplishments

- **The phase's single source of truth exists and is directive-free.** `AVATAR_OUTPUT_PX = 400` is read by both the encoder-to-be and the zoom ceiling that is derived from it; `AVATAR_ALLOWED_TYPES` is one `readonly` tuple that plan 16-07 will import into `validation/profile.ts` rather than duplicating (T-16-05).
- **All seven of IC-05's worked rows reproduce exactly**, plus both clamp arms, plus the `AVATAR_MIN_SOURCE_PX` boundary — nine `toBe` rows, each naming the 999.2 row it came from.
- **The bound is proven derived, not tuned.** A swept 1..5000 invariant and a band probe that recomputes `shorter / AVATAR_OUTPUT_PX` from the exported constant mean a module that divides by a hard-coded `400` goes red the moment D-172's output size moves — the one failure that every render gate in this phase would miss.
- **T-16-04 is now asserted from both sides.** `tests/use-server-exports.test.ts` guards `src/app/actions/`; this spec guards the constants' home, over the AST, so the module can never quietly acquire a directive and become unimportable from a client component.
- **Zero `package.json` movement.** Phase 11's empty-diff criterion holds; `package.json` and `package-lock.json` are byte-unchanged.

## Task Commits

1. **Task 1 (RED): the IC-05 spec, written before the module** — `5a9d927` (test)
2. **Task 1 (GREEN): `src/lib/avatar.ts`** — `7738ce1` (feat)
3. **Task 2: the completed spec — constants, invariant, directive gate** — `eee39a1` (test)

No REFACTOR commit: the GREEN implementation is a two-call clamp and a list of literals; there was nothing to clean up.

**Plan metadata:** see the `docs(16-02)` commit that carries this file.

## Files Created/Modified

- `src/lib/avatar.ts` (created, 183 lines) — the contract module. Four constants, one `readonly` MIME tuple, `avatarMaxZoom()`, and the 21 `AVATAR_*` copy literals from 999.2 § Copywriting with the single Delta-14 substitution.
- `tests/design/avatar-zoom.test.ts` (created, 255 lines) — 19 assertions across four `describe` blocks: the nine zoom rows, the four constant pins, the two invariant probes, and the four-part directive gate.

## Decisions Made

- **Placement of the spec (the plan's named deviation, executed as written).** `16-VALIDATION.md` puts the zoom spec at `tests/profile/avatar-zoom.test.ts` and calls it "design config, no DB", which `16-PATTERNS.md § Measured corrections #3` proved impossible. Verified first-hand this session: `vitest.design.config.ts` includes `tests/design/**` only and declares neither `globalSetup` nor `setupFiles`, and a `tests/`-anything-else run hard-fails without Postgres — observed directly when `npx vitest run tests/use-server-exports.test.ts` exited 1 with `[test-db] cannot reach the test database`. The spec is at `tests/design/`.
- **The `Uploading…` literal is declared nowhere**, per Delta-14 / rule F4 — `grep -c 'Uploading' src/lib/avatar.ts` returns 0.
- **`AVATAR_HELPER` names WebP.** The shipped `profile-form.tsx:149` string does not, and Delta-14 is explicit that this one must not be "reused verbatim".
- **`AVATAR_CROP_CONFIRM_BUSY` is byte-identical to the shipped `Saving…`** — confirmed at the byte level (`cat -A` on `profile-form.tsx:299` shows `M-bM-^@M-&`, i.e. U+2026), so the match is verified rather than assumed.
- **The `COVER_PREVIEW_*` literals and the three "reused verbatim" shipped strings are absent**, as the plan requires — they belong to `src/lib/listing/cover-frames.ts` (16-06) and to `validation/profile.ts` / `actions/avatar.ts` respectively.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The local Postgres container was not running, so a plan verify command could not execute**

- **Found during:** Task 1 (verification step)
- **Issue:** `npx vitest run tests/use-server-exports.test.ts` is in Task 1's `<verify>` and in the plan's `<verification>` block. It runs under the main config, whose `globalSetup` preflights `fitout_test` and hard-fails when unreachable. The container was down: `[test-db] cannot reach the test database … Fix: start Postgres (npm run db:up), then provision it: npm run db:test:setup`.
- **Fix:** Ran `npm run db:up` then `npm run db:test:setup` (both idempotent, both the messages' own prescribed remedy). No env var was set or overridden — `tests/setup.ts` supplies `DATABASE_URL` itself.
- **Files modified:** none (infrastructure only).
- **Verification:** the gate then passed, 4/4, exit 0.
- **Committed in:** no commit — nothing in the repo changed.

**2. [Rule 1 - Bug] The spec's own header defeated one of its acceptance criteria**

- **Found during:** Task 2 (acceptance-criteria check)
- **Issue:** The plan requires `grep -c "vitest-environment" tests/design/avatar-zoom.test.ts` to return `0`. The first draft's header explained *"there is no `// @vitest-environment jsdom` pragma"* — spelling the token in order to say it is absent, so the count returned `1` against a correct file. This is the same shape as the `empty-state.tsx` grep-versus-comment collision the design suite has recorded eleven times.
- **Fix:** Reworded the header to describe the pragma's absence without spelling it, and recorded *why* the wording is deliberate so a future reader does not "helpfully" restore the literal.
- **Files modified:** `tests/design/avatar-zoom.test.ts`
- **Verification:** count is now `0`; the spec still passes 19/19.
- **Committed in:** `eee39a1` (Task 2 commit)

**3. [Rule 2 - Missing Critical] Two structural assertions the plan did not name, added to keep the gate honest**

- **Found during:** Task 2
- **Issue:** (a) The plan's sweep proves the bound stays in `[1, ceiling]`, but a module that divided by a hard-coded literal `400` while `AVATAR_OUTPUT_PX` said something else would still pass every row and the sweep — which is precisely the drift the spec's stated purpose is to catch. (b) A structural directive detector that silently matched nothing would make the T-16-04 assertion vacuous against any file.
- **Fix:** Added a band probe that recomputes the expectation as `shorter / AVATAR_OUTPUT_PX` from the exported constant, and a both-directions self-test for the prologue detector (a `"use client"` fixture, a `"use server"` fixture, and a comment-only fixture), plus a read-guard asserting the file read actually contains `export function avatarMaxZoom`.
- **Files modified:** `tests/design/avatar-zoom.test.ts`
- **Verification:** 19/19 pass; the self-tests exercise the same `directivePrologue` code path the real assertion uses (`leak.test.ts:208-212`'s rule).
- **Committed in:** `eee39a1` (Task 2 commit)

**4. [Process] Task 1's TDD RED necessarily authored the file Task 2 completes**

- **Found during:** Task 1
- **Issue:** Task 1 carries `tdd="true"` and a nine-row `<behavior>` block, but the spec asserting that behaviour is Task 2's deliverable. Executing Task 1's RED gate honestly requires a failing spec to exist before `src/lib/avatar.ts` does.
- **Fix:** Task 1's RED wrote the nine `<behavior>` rows into `tests/design/avatar-zoom.test.ts` — the path Task 2 owns — and Task 2 then completed that file with its header, the constant pins, the invariants and the directive gate. The commit sequence is therefore `test → feat → test`, and both gates are real rather than one being backfilled.
- **Files modified:** `tests/design/avatar-zoom.test.ts`
- **Verification:** the RED was observed (`Cannot find package '@/lib/avatar'`, exit 1) and is transcribed verbatim into the shipped file's header.
- **Committed in:** `5a9d927`, `eee39a1`

---

**Total deviations:** 4 (1 blocking-infra, 1 bug, 1 missing-critical, 1 process). **Impact on plan:** none on scope. Every file the plan named was created and no file it did not name was touched.

## Verification Run

All commands run from the repo root, sequentially (never concurrently — the design and main suites share `fitout_test`, which `tests/global-setup.ts` truncates on every run).

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx eslint src/lib/avatar.ts tests/design/avatar-zoom.test.ts` | **exit 0** |
| `npx vitest run tests/design/avatar-zoom.test.ts --config vitest.design.config.ts` | **exit 0** — 19 passed |
| same command, **with the `fitout-db-1` container STOPPED** | **exit 0** — 19 passed, vitest duration **837 ms**, wall clock **3.6 s** (criterion: under 30 s) |
| `npm run test:design` (Docker still down) | **exit 0** — **56 files, 1097 passed, 3 skipped** |
| `npx vitest run tests/use-server-exports.test.ts` | **exit 0** — 4 passed |
| `git diff --exit-code src/app/actions/avatar.ts src/lib/validation/profile.ts package.json package-lock.json` | **exit 0** — all four byte-unchanged |

The Docker-down run is the load-bearing one: it is the direct evidence that this gate can run inside `npm run build` on a machine with no Postgres, which is the whole reason the spec is not at `tests/profile/`.

### Acceptance criteria, measured

| Check | Required | Measured |
|---|---|---|
| `grep -c '^"use ' src/lib/avatar.ts` | 0 | **0** |
| `grep -c 'Uploading' src/lib/avatar.ts` | 0 | **0** |
| `grep -c 'JPG, PNG, or WebP, up to 5 MB. Optional.' src/lib/avatar.ts` | 1 | **1** |
| `grep -c 'COVER_PREVIEW' src/lib/avatar.ts` | 0 | **0** |
| `grep -c 'vitest-environment' tests/design/avatar-zoom.test.ts` | 0 | **0** |
| `src/lib/avatar.ts` line count | ≥ 60 | **183** |
| zoom-row assertions | ≥ 9 | **10** (nine rows + the `AVATAR_MIN_SOURCE_PX` boundary) |

## Issues Encountered

- **The test database was down** and the plan's `use-server-exports` gate could not run. Resolved with the error message's own prescribed remedy (`npm run db:up` → `npm run db:test:setup`), both idempotent. The container was left **running** at hand-off, since the orchestrator's phase verification will want it.
- Nothing else. No fix-attempt limit was approached; no task needed more than one correction.

## Known Stubs

None. The module is complete: every export it declares is a finished value or a finished function, and nothing in it is wired to a placeholder.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no file access and no schema change. Both `mitigate` dispositions in the plan's register are discharged:

- **T-16-04** (a value export killing a `"use server"` module) — the constants live in a directive-free module, `tests/use-server-exports.test.ts` passes, and the new spec adds an AST-level prologue assertion on the module itself.
- **T-16-05** (client picker vs server schema drift) — `AVATAR_ALLOWED_TYPES` is one `readonly` tuple with its order pinned; plan 16-07 makes `validation/profile.ts` the second consumer.
- **T-16-06** (zoom-bound drift) — `accept`ed by the plan; the arithmetic gate plus the derivation probe is the recorded mitigation.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready to import, today:**

- `16-07` — narrow `avatarFileSchema`'s type refine by importing `AVATAR_ALLOWED_TYPES` from `@/lib/avatar`. Note the direction: `validation/profile.ts` imports from `avatar.ts`, never the reverse, so this module stays a leaf.
- `16-08` — `avatar-canvas.ts` reads `AVATAR_OUTPUT_PX` for the canvas size. It must NOT restate `400`.
- `16-09` — the crop dialog reads `avatarMaxZoom`, `AVATAR_CROP_*`, `AVATAR_ZOOM_LABEL`, `AVATAR_POSITION_LABEL`, `AVATAR_SOFT_SOURCE_NOTE`.
- `16-10` / `16-11` — `AVATAR_UPLOAD_LABEL`, `AVATAR_CHANGE_LABEL`, `AVATAR_HELPER`, the three refusal messages, and the full `AVATAR_REMOVE_*` set.

**Two things a later plan must not undo:**

1. `maxZoom` initial state is **1**, not 3 (16-RESEARCH § A4) — `onMediaLoaded` arrives after mount, and a zoom row briefly live at 3× on a 220px source is a visible lie.
2. The shadcn `Slider` needs `value={[zoom]}` **as an array** with `min={1} max={maxZoom} step={0.01}`; a scalar `value` silently yields a two-thumb slider at the extremes.

**Requirements:** `CROP-01` and `CROP-03` are **advanced, not completed** — this plan supplies their contract, not their behaviour. Neither `REQUIREMENTS.md` checkbox nor its traceability row was touched.

**No blockers.**

---
*Phase: 16-image-crop-framing*
*Completed: 2026-08-25*
