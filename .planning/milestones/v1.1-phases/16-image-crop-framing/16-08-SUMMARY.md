---
phase: 16-image-crop-framing
plan: 08
subsystem: ui
tags: [avatar, crop, canvas, exif, react-easy-crop, dependency-audit, jpeg, white-matte]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    plan: 02
    provides: "`src/lib/avatar.ts` — `AVATAR_OUTPUT_PX`, the directive-free home this module imports the output size from rather than restating `400`"
  - phase: 999.2-profile-picture-and-listing-photo-crop-ui
    provides: "IC-02 / IC-06 and § 2e — the encode contract (JPEG, q0.9, white matte, always 400x400), inherited verbatim and not re-derived"
provides:
  - "`react-easy-crop@^6.2.3` — the phase's one and only dependency addition, resolved at 6.2.3, audited and measured rather than asserted"
  - "`src/lib/avatar-canvas.ts` — `measureImage()`, `encodeAvatarBlob()`, `revokeAvatarObjectUrl()` and the `AvatarCropArea` type; directive-free, under `src/lib/**`"
  - "The one decode decision, executed: the encoder draws the caller's own `<img>`, so preview and stored bytes are one bitmap by identity"
affects: [16-09 crop dialog, 16-10 avatar-field guard chain, 16-12 EXIF Playwright proof, 16-13 stylesheet-cascade measurement]

# Tech tracking
tech-stack:
  added:
    - "react-easy-crop@^6.2.3 (resolves 6.2.3) — MIT, first published 2018-06-19, 3.1M downloads/wk, one transitive dependency (normalize-wheel), no postinstall hook"
  patterns:
    - "One decode, one bitmap: the encoder takes an `HTMLImageElement` IN rather than a URL, so there is no second EXIF correction that has to agree with the first"
    - "A colour literal is authored under `src/lib/**` — outside `LEAK_SCAN_PREFIXES` — and deliberately NOT exported, so no component can import it past the leak gate"
    - "Rejected APIs are described in prose rather than spelled, because the acceptance greps that guard the decision count those exact identifiers (the `src/lib/avatar.ts` header precedent)"

key-files:
  created:
    - src/lib/avatar-canvas.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "The plan's verification path `node_modules/react-easy-crop/dist/index.module.mjs` does not exist — the published tarball is FLAT, with `index.module.mjs` at the package root. The measurement was re-run at the real path and returns 0 for the deny-listed gesture library, which is what the criterion was actually asking"
  - "Task 2 carries `tdd=\"true\"` and its own `<action>` says `Write NO unit test for this module`. The action was followed: there is no RED/GREEN pair for this file, because jsdom returns null from `getContext(\"2d\")` and has no `createObjectURL`, so a Vitest spec here would assert against a stub of a fiction"
  - "The matte constant is module-private, not exported. The crop stage renders the same white through `bg-background` (Delta-7); an exported literal would be a legal-looking way for a component to import a raw colour"
  - "`AVATAR_MATTE`, `AVATAR_OUTPUT_TYPE` and `AVATAR_OUTPUT_QUALITY` are named local constants rather than inline literals — the value has one home and a docblock each, and `src/lib/avatar.ts` stays the phase's leaf contract because none of the three is shared"
  - "`encodeAvatarBlob` is not `async`: the two synchronous failure branches return `Promise.reject` so the caller sees one uniform promise, while `toBlob`'s callback is wrapped exactly the way `cloudinary.ts:45-60` wraps `upload_stream`'s"

requirements-completed: []
requirements-advanced: [CROP-01]

# Metrics
duration: ~30min
completed: 2026-08-25
---

# Phase 16 Plan 08: The Crop Engine and the Encoder Summary

**`react-easy-crop@^6.2.3` is installed on a one-line `package.json` diff with every audit claim re-measured rather than trusted, and `src/lib/avatar-canvas.ts` now turns a crop rectangle into the exact bytes we store — one decode, one bitmap, opaque white painted before the draw, and a destination rectangle that is always 400x400 no matter how small the source is.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-25T09:05Z
- **Completed:** 2026-08-25T09:35Z
- **Tasks:** 2/2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- **The phase's one dependency is in, and its argument is on the record.** Every claim in the RESEARCH audit table was re-measured against the installed tree, not copied: `npm ls` resolves `6.2.3`, `package.json` moves by exactly `1 insertion(+)` and zero deletions, the dependency list is exactly `[ 'normalize-wheel' ]`, `scripts.postinstall` is `undefined`, and the deny-listed `@use-gesture/react` appears **zero** times anywhere in the shipped package.
- **No gate moved and no deny-list widened.** `git diff --exit-code tests/design/sheet-absent.test.ts` exits 0. The library's auto-injected `<style>` carries raw `rgba()` values but lives in `node_modules`, outside `LEAK_SCAN_PREFIXES` (`["src/app/", "src/components/"]`), so the leak gate never sees it — and no `import "react-easy-crop/react-easy-crop.css"` was written (`grep -rn "react-easy-crop.css" src/` → 0 matches).
- **The decode decision is executed, not merely documented.** `encodeAvatarBlob` takes the `HTMLImageElement` the cropper measured and draws *that element*. There is no second decoder anywhere in the module: the acceptance grep for the two rejected decode APIs and the element's own decode promise returns **0**.
- **The output is 400x400 on every source size.** The destination rectangle is the literal `0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX`; `area.width` appears in exactly one place and only as a *source* dimension. That is the single fact that lets `cloudinary.ts`'s 400x400 `c_fill` be called the geometric identity on the honest path.
- **Transparency flattens deterministically.** `fillStyle` + `fillRect` across the whole canvas happen *before* `drawImage`, so a transparent PNG composites onto white in every browser instead of onto Firefox's black.
- **Neither null can be swallowed.** `getContext("2d") === null` returns a rejected promise; `toBlob(null)` rejects inside the callback. A swallowed null would have reached `fd.set("avatar", …)` and surfaced as a confusing server-side Zod complaint instead of the shipped save-failure sentence.
- **No regression anywhere.** Full suite 183 files / 2072 passed / 5 skipped — byte-identical to the post-16-07 baseline. Design suite 58 files / 1126 passed. `npm run build` exit 0.

## Task Commits

1. **Task 1: install `react-easy-crop@^6.2.3` and prove the diff is one line** — `6ea7b1f` (chore)
2. **Task 2: `src/lib/avatar-canvas.ts` — measure, encode, and the white matte** — `e8c35c5` (feat)

**Plan metadata:** see the `docs(16-08)` commit that carries this file.

## Files Created/Modified

- `src/lib/avatar-canvas.ts` (created, 207 lines) — the three exports and the `AvatarCropArea` type, with a header in this tree's three-part shape (what owns it / what it deliberately does not do / the lesson as the reason).
- `package.json` (modified, +1 line) — `"react-easy-crop": "^6.2.3"`, inserted in sorted position between `react-dom` and `react-hook-form`.
- `package-lock.json` (modified, +20 lines) — the two new entries (`react-easy-crop`, `normalize-wheel`) and the parent's dependency edge.

## Decisions Made

- **Version specifier is `^6.2.3`, matching every one of the other 33 dependencies in this file.** `npm view react-easy-crop dist-tags` was checked first: `latest` is `6.2.3`, so the caret resolves to the exact version the audit vetted, today. The install was verified to have landed on `6.2.3` rather than assumed. Note the tags that exist and must never be reached for: `canary` is `7.0.0--canary…` and `alpha` is `4.0.0-alpha.0` — a floating `@latest` would be fine today and would not be after the next major.
- **`@types/react-easy-crop` was not installed** — the package ships `index.d.ts` and `index.d.mts` and an `exports` map that points at both. `npx tsc --noEmit` exits 0 with no additional types package.
- **`normalize-wheel` stays transitive** and was not installed directly; `Object.keys(pkg.dependencies)` filtered for it returns `["react-easy-crop"]` only.
- **The three rejected decode paths are named descriptively, not spelled.** This is the deliberate collision-avoidance the `src/lib/avatar.ts` header established, and the file says so out loud in a paragraph headed *"A NOTE ON SPELLING"* so a later reader does not "helpfully" restore the identifiers and turn the acceptance greps red against a correct file. The same applies to the cross-origin attribute, which is discussed in prose form.
- **The HEIC asymmetry is recorded in `measureImage`'s docblock as correct behaviour**, not as a bug to chase: Safari on macOS decodes HEIC in an `<img>` and Chrome on Windows does not, so the same file is measurable on one machine and refused on another, and both outcomes are right. We accept exactly what the user's own browser can render — which is also exactly what the crop stage will be able to show them.
- **`revokeAvatarObjectUrl` is a one-line wrapper and earns it** by naming the three paths it must run on (unmount, cancel, re-pick) and by pairing itself, in the docblock, with D-174's file-input `value` reset.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's `use-gesture` verification path does not exist in the published package**

- **Found during:** Task 1 (verification step)
- **Issue:** The plan specifies `grep -rc "use-gesture" node_modules/react-easy-crop/dist/index.module.mjs`. There is no `dist/` directory — the published tarball is flat: `index.js`, `index.module.mjs`, `index.d.ts`, `index.d.mts`, `react-easy-crop.css`, `LICENSE`, `README.md` and the four `.map` files at the package root. The command as written exits 2 with `No such file or directory`, which is *not* the same evidence as a `0`; a missing-file exit could hide the very vendoring the check exists to rule out. (16-RESEARCH §A1 quotes the file as `index.module.mjs` without a `dist/` prefix, so the path is a plan-side typo, not a package change.)
- **Fix:** Re-ran the measurement at the real path — `grep -c "use-gesture" node_modules/react-easy-crop/index.module.mjs` → **0** — and then strengthened it to the whole package rather than one file: `grep -rl "use-gesture" node_modules/react-easy-crop/ | wc -l` → **0**. The deny-listed library is neither a dependency nor vendored anywhere in the package.
- **Files modified:** none (measurement only).
- **Verification:** both counts are 0; `git diff --exit-code tests/design/sheet-absent.test.ts` exits 0, so the three-name list stays unwidened.
- **Committed in:** `6ea7b1f` (the finding is recorded in the commit body).

**2. [Rule 1 - Bug] The task's own acceptance criteria contradict its `<action>` on how to name the rejected APIs**

- **Found during:** Task 2 (drafting the docblocks)
- **Issue:** The `<action>` requires `measureImage`'s docblock to *name* the three rejected alternatives, and requires a comment explaining why the cross-origin attribute is never set. The acceptance criteria then require `grep -c "createImageBitmap\|OffscreenCanvas\|\.decode()"` and `grep -c "crossOrigin"` to both return **0** over the same file. Written literally, the two cannot both hold — a docblock that spells the identifiers fails the greps that exist to prove the file does not *use* them.
- **Fix:** Named all three alternatives and the attribute precisely enough to be unmistakable, without spelling the counted tokens — *"the async global that decodes a File straight to an `ImageBitmap`"*, *"the image element's own `decode` promise"*, *"parsing the file header by hand"*, *"no cross-origin attribute is set on anything here"* — and added a `A NOTE ON SPELLING` paragraph to the header stating why the prose is worded that way, so the wording is a recorded decision rather than an accident waiting to be undone. This is the same collision, and the same remedy, as 16-02's deviation #2 (`vitest-environment`).
- **Files modified:** `src/lib/avatar-canvas.ts`
- **Verification:** both greps return **0**; the three alternatives and the attribute rationale are all still on the record in the file.
- **Committed in:** `e8c35c5`

### Deliberate non-deviations (recorded so a reader does not read them as gaps)

**3. [Process] Task 2 carries `tdd="true"` but ships with no Vitest spec — as its own `<action>` instructs**

The task attribute and the task body disagree. The body wins, and it is right: jsdom 29.1.1 returns `null` from `getContext("2d")` and does not implement `URL.createObjectURL`, so every assertion a unit test could make here would be an assertion about a mock. **This module carries no Vitest spec; its proofs are the Playwright assertions in plans 16-12 and 16-13**, which drive a real browser over a real EXIF-Orientation-6 fixture and compare a pixel of the preview against the same pixel of the produced Blob. That sentence is also written into the file's own header so the gap is never silent. Consequently there is no `test(...)` RED commit for Task 2 — see § TDD Gate Compliance.

**4. [Process] One phantom red inside `npm run build`, reproduced as environmental and not investigated further**

`npm run build` was first run immediately after two back-to-back `npm test` runs and its `test:design` step reported `1 failed` in `tests/design/elevation-z.test.ts` (*"emits no default shadow rule at all, from any source"* — a Tailwind compile assertion). Re-run alone, `npm run test:design` passed **58 files / 1126 tests** and `npm run build` exited **0**. Per the repo's own back-to-back gotcha, the first red was not trusted and not chased; the new file contains zero occurrences of `shadow`, so it cannot be the cause. No fix was applied and none was needed.

---

**Total deviations:** 2 auto-fixed (both Rule 1), plus 2 recorded process notes. **Impact on scope:** none. Every file the plan named was touched and no file it did not name was.

## Verification Run

All commands from the repo root, **sequentially** — never concurrently, because the design and main suites share `fitout_test` and `tests/global-setup.ts` truncates it on every run.

| Command | Result |
|---|---|
| `npm ls react-easy-crop` | **`react-easy-crop@6.2.3`** |
| `git diff --stat package.json` (pre-commit) | **`1 file changed, 1 insertion(+)`** — zero deletions |
| `node -p "Object.keys(require('./node_modules/react-easy-crop/package.json').dependencies)"` | **`[ 'normalize-wheel' ]`** |
| `node -p "require('./node_modules/react-easy-crop/package.json').scripts?.postinstall"` | **`undefined`** |
| `grep -c "use-gesture" node_modules/react-easy-crop/index.module.mjs` | **0** (path corrected — deviation 1) |
| `grep -rl "use-gesture" node_modules/react-easy-crop/ \| wc -l` | **0** — not vendored anywhere in the package |
| `git diff --exit-code tests/design/sheet-absent.test.ts` | **exit 0** — deny-list byte-unchanged |
| `grep -rn "react-easy-crop.css" src/` | **0 matches** |
| `npx tsc --noEmit` | **exit 0** (run twice — after each task) |
| `npm run lint` | **exit 0** — 25 pre-existing warnings, none in a file this plan touched |
| `npm run test:design` | **exit 0** — 58 files, **1126 passed**, 3 skipped |
| `npx vitest run tests/use-server-exports.test.ts` | **exit 0** — 4 passed |
| `npm test` (alone) | **exit 0** — 183 files, **2072 passed**, 5 skipped — identical to the post-16-07 baseline |
| `npm run build` (alone) | **exit 0** |

### Acceptance criteria, measured

| Check | Required | Measured |
|---|---|---|
| `npm ls react-easy-crop` | `6.2.3` | **6.2.3** |
| `git diff --stat package.json` | 1 insertion, 0 deletions | **1 insertion, 0 deletions** |
| library dependency list | exactly `[ 'normalize-wheel' ]` | **`[ 'normalize-wheel' ]`** |
| library `scripts.postinstall` | `undefined` | **`undefined`** |
| `git diff --exit-code tests/design/sheet-absent.test.ts` | exit 0 | **exit 0** |
| `grep -c "react-easy-crop.css" src/` | 0 | **0** |
| `grep -c '^"use ' src/lib/avatar-canvas.ts` | 0 | **0** |
| `grep -c "createImageBitmap\|OffscreenCanvas\|\.decode()" src/lib/avatar-canvas.ts` | 0 | **0** |
| `grep -c "crossOrigin" src/lib/avatar-canvas.ts` | 0 | **0** |
| `grep -c "AVATAR_OUTPUT_PX" src/lib/avatar-canvas.ts` | ≥ 4 | **9** |
| `grep -n "area.width," src/lib/avatar-canvas.ts` | source dimension only | **1 site, line 176, inside `drawImage`'s source rect** |
| `grep -rc "#ffffff\|#fff\b" src/app src/components` | 0 | **0** |
| `src/lib/avatar-canvas.ts` line count | ≥ 70 | **207** |
| `getContext` null and `toBlob` null both reject | yes | **yes** — `Promise.reject(...)` at the guard, `reject(...)` inside the `toBlob` callback |

## TDD Gate Compliance

⚠ **Task 2 carries `tdd="true"` and there is no `test(...)` RED commit for it.** This is intentional and instructed: the task's own `<action>` says *"Write NO unit test for this module"*, and gives the measured reason — jsdom has no 2d context, no `createObjectURL` and no image `decode`, so a Vitest spec here would be a stub asserting against a fiction. The plan's frontmatter is `type: execute`, not `type: tdd`, so no plan-level RED/GREEN/REFACTOR sequence is claimed either. The module's proofs are deferred, explicitly and in writing (in this SUMMARY, in the plan, and in the file's own header), to the Playwright specs in **plans 16-12 and 16-13**.

Task 1 is an install task with no behaviour to drive and carries no `tdd` attribute.

## Issues Encountered

- **A heredoc-based file write failed** (`unexpected EOF while looking for matching '`) and wrote nothing; the file was created with the Write tool instead. No partial file was left behind — verified before retrying.
- **One phantom design-suite failure** inside a `npm run build` launched immediately after two `npm test` runs. Documented above as deviation note 4; clean on re-run.
- Nothing else. The 3-attempt auto-fix limit was never approached.

## Known Stubs

None. All three exports are complete implementations. The module has **no call sites yet** — that is the plan's shape, not a stub: `measureImage` is consumed by the pre-dialog guard chain in 16-10, `encodeAvatarBlob` and `revokeAvatarObjectUrl` by the crop dialog in 16-09.

## Threat Flags

None — this plan adds no network endpoint, no auth path, no schema change and no server-side file access. The register's two `mitigate` dispositions are discharged:

- **T-16-SC** (a tampered/slopsquatted dependency entering the bundle graph) — the audit's claims were **re-measured against the installed tree**, not trusted: registry-resolved version, dependency list, postinstall field, and a whole-package scan for the deny-listed gesture library. All four match the RESEARCH table. No `[SUS]`/`[ASSUMED]` verdict existed, so no blocking human checkpoint was required, and none was raised.
- **T-16-27** (EXIF metadata surviving into the stored avatar) — the canvas re-encode discards all source metadata by construction: `drawImage` copies pixels, and `toBlob` writes a fresh JPEG with no source APP1 segment. **This is the AVATAR path only.** EXIF/GPS on the LISTING path is Phase 16.1 (D-164 / D-166) and is explicitly not claimed here.
- **T-16-26** (vendored stylesheet injection) and **T-16-28** (a very large source decoded in the browser) are both `accept` dispositions and are unchanged by this plan.

## User Setup Required

None — no external service configuration required. `node_modules` is already installed; a fresh clone gets the dependency from the committed lockfile.

## Next Phase Readiness

**Ready to import, today:**

- `16-09` (crop dialog) — `import Cropper from "react-easy-crop"` inside a `"use client"` module (the package ships no directive of its own and is a class component with `componentDidMount`). Capture the element via `setImageRef`, keep the returned `croppedAreaPixels`, and hand both to `encodeAvatarBlob({ img, area })`. **Write no CSS import**; leave `disableAutomaticStylesInjection` at its default.
- `16-10` (avatar field / guard chain) — `measureImage(objectUrl)` for the decode+dimension steps of `type → size → decode → measure`, `revokeAvatarObjectUrl(objectUrl)` in the `finally` beside D-174's `e.target.value = ""`.
- The caller's Blob → File hop is `fd.set("avatar", blob, "avatar.jpg")`; `blob.type` is `"image/jpeg"`, inside the allow-list 16-07 narrowed, and `z.instanceof(File)` at `validation/profile.ts:40` holds unchanged.

**Four things a later plan must not undo:**

1. **`encodeAvatarBlob` takes an element, not a URL.** "Tidying" it into taking a URL reintroduces the two-decoders-must-agree structure IC-06 was written against. The file's header says so; this is the second place it is said.
2. **The destination rectangle stays the literal `0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX`.** Deriving it from `area.width` emits a 300x300 asset from a 300x300 source and breaks IC-06's "always 400x400".
3. **The matte is painted before the draw, and stays module-private.** Exporting it would give a component a legal-looking way to import a raw colour past the leak gate (Delta-7).
4. Carried forward from 16-02 and still load-bearing for 16-09: `maxZoom` initial state is **1**, not 3 (`onMediaLoaded` arrives after mount), and the shadcn `Slider` needs `value={[zoom]}` **as an array** with `min={1} max={maxZoom} step={0.01}`.

**Requirements:** `CROP-01` is **advanced, not completed** — this plan supplies the engine and the encoder, not the user-visible framing step. Neither the `REQUIREMENTS.md` checkbox nor its traceability row was touched.

**No blockers.**

---
*Phase: 16-image-crop-framing*
*Completed: 2026-08-25*

## Self-Check: PASSED

- `src/lib/avatar-canvas.ts` — FOUND (207 lines)
- `package.json` carries `"react-easy-crop": "^6.2.3"` — FOUND
- `node_modules/react-easy-crop/package.json` version `6.2.3` — FOUND
- `.planning/phases/16-image-crop-framing/16-08-SUMMARY.md` — FOUND
- Commits `6ea7b1f`, `e8c35c5` — both FOUND in `git log`
- Post-commit deletion check: **zero** tracked files deleted in either commit
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — **not modified by this executor** (orchestrator owns them)
