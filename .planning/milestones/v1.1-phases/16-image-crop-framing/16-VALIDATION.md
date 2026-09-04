---
phase: 16
slug: image-crop-framing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-25
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `16-RESEARCH.md` § E. Validation Architecture (measured 2026-08-25).
> **Per-Task Verification Map is backfilled from the PLAN.md files after
> gsd-plan-checker passes them** — same sequence 15-VALIDATION.md followed.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest **4.1.8** (main config + design config — NEVER run concurrently, they share `fitout_test`) + Playwright **1.60.0** |
| **Config file** | `vitest.config.ts` (main, `environment: "node"`, Postgres via `globalSetup`) / `vitest.design.config.ts` (design, **no `setupFiles`, no DB**) |
| **jsdom** | **29.1.1**, opted into per-file with `// @vitest-environment jsdom` |
| **Quick run command** | `npx vitest run <touched spec files>` (add `--config vitest.design.config.ts` for design specs) |
| **Full suite command** | `npm test` then `npm run test:design` (sequential, never parallel) |
| **Build gate** | `npm run build` = `npm run lint && npm run test:design && next build` |
| **E2E** | `npx playwright test --project=chromium` (`e2e/*.spec.ts`) |
| **VRT** | `visual` project is constructed **only when `process.platform === "linux"`** and `updateSnapshots: "none"` is unconditional → **GATE-VRT is a CI-dispatch checkpoint on this machine**, exactly as 15-11-02 was |
| **Preconditions for `npm test`** | Docker up → `npm run db:up` → `npm run db:test:setup` |
| **Estimated runtime** | ~100s main / ~60s design |

### ⚠ The single fact that shapes this phase's validation

`react-easy-crop` renders the crop-area element **only when `state.cropSize` is truthy**, which needs a
non-zero `getBoundingClientRect()` **and** a decoded `<img>` with real naturals. Probed jsdom 29.1.1 has
**neither**: `getContext('2d')` → `null`, `createImageBitmap`/`OffscreenCanvas`/`ResizeObserver`/
`URL.createObjectURL`/`Image.prototype.decode` → `undefined`, every `getBoundingClientRect()` → zeros.

> **In jsdom the crop stage does not exist in the DOM.** Everything geometric, gestural or pixel-bearing
> is **Playwright or human**. jsdom's honest job here is copy, structure, ARIA wiring, disabled state,
> focus order, and the state machine *around* the cropper.
>
> The repo has stubbed `ResizeObserver` five times (idiomatic); it has **never** stubbed
> `getBoundingClientRect`, and two specs record in prose that it refuses to pretend jsdom has layout.
> **Follow that precedent — do not stub layout to manufacture a passing stage test.**

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command (design-config runs need no database and are the fastest signal in the repo)
- **After every plan wave:** Run `npm test` then `npm run test:design` (sequential)
- **Phase gate:** `npm run build` + full Playwright `chromium` project + the CI baselines dispatch + the CROP-04 hardware walk
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

*Backfilled after plans pass gsd-plan-checker. Source rows: `16-RESEARCH.md` § Phase Requirements → Test Map (items 1–32).*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(pending planner)* | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

### Test files (none exist today)

- [ ] `tests/profile/avatar-zoom.test.ts` — pure `avatarMaxZoom` arithmetic, all 7 IC-05 rows (design config, no DB)
- [ ] `tests/profile/avatar-field.test.tsx` — jsdom: pre-dialog guards, **no network before confirm** (F4), disabled zoom row + soft-source note (F8), save-failure `role="alert"` (F5), removal focus lands on `Keep photo`, footer DOM order, pending state
- [ ] `tests/profile/avatar-remove.test.ts` — integration: null-first ordering, destroy-failure tolerance, session gate
- [ ] `tests/design/avatar-copy.test.tsx` — the exported-literal copy contract
- [ ] `tests/design/responsive-dialog-autofocus.test.tsx` — the additive prop's default-inert guard **and** its positive half
- [ ] `tests/listing/cover-frame-preview.test.tsx` — jsdom: visibility ≥1 photo, imported ratio classes (no literal), server-safety, follows `photos[0]` through keyboard reorder
- [ ] `tests/listing/cloudinary-provenance.test.ts` — the pure validator (legitimate shapes + the attacker set) **and the absent-env fail-closed case**
- [ ] `e2e/avatar-crop.spec.ts` — **the only place the stage actually exists**: geometry, computed `touch-action: none`, mask-ring/scrim cascade win, EXIF-6 preview↔bytes equality, white matte, animated-still-frame, 400×400 output, GATE-STATES rendering assertions

### Image fixtures — **zero exist in this repo today**

`find tests e2e -name "*.jpg" -o -name "*.png"` returns only VRT baselines. All eleven must be created,
small and deterministic, and **generated by a committed `scripts/` helper** so the EXIF byte is auditable
rather than magic:

- [ ] `e2e/fixtures/exif-orientation-6.jpg` — landscape-encoded / portrait-intent, one coloured corner block. **The named acceptance criterion.**
- [ ] `e2e/fixtures/transparent.png` — alpha in a known region (proves the white matte)
- [ ] `e2e/fixtures/panorama-4000x500.jpg` — pans one axis, pinned on the other
- [ ] `e2e/fixtures/portrait-strip-500x4000.jpg` — axes swapped
- [ ] `e2e/fixtures/square-400.png` — `maxZoom === 1`, zoom row disabled
- [ ] `e2e/fixtures/small-300.png` — 200–399px, soft-source note
- [ ] `e2e/fixtures/tiny-150.png` — below `AVATAR_MIN_SOURCE_PX`, refused before the dialog
- [ ] `e2e/fixtures/animated.webp` — still first frame
- [ ] `e2e/fixtures/corrupt.jpg` — truncated bytes, valid extension → `AVATAR_UNREADABLE_MESSAGE`
- [ ] `e2e/fixtures/tiny.gif` + `e2e/fixtures/tiny.svg` — the two new type-rejection cases

### Inventory moves (each **watched red first**, each in the same commit as the code that made it true)

- [ ] `tests/design/leak.test.ts:331` — 31 → 32 + `toContain("src/components/ui/slider.tsx")`
- [ ] `src/lib/design/live-regions.ts` — 26 → 28 files, alias → `DeclaredFileCountIsTwentyEight`, **plus re-keying the two existing rows whose line numbers shift** (R9)
- [ ] `tests/design/brand-recipe.test.ts:361` — `EXPECTED_DILUTED_TOKENS` **20 → 21** (`foreground/55`) — **conditional on the §A5 cascade route taken** (R3)
- [ ] `tests/design/profile-pass.test.tsx` — four assertions (`:1045`, `:1062`, `:1152`, `PINNED_COPY` at `:397`) (R10)
- [ ] `tests/listing/photos.test.ts` — 8 `persistPhoto` fixtures rewritten to legitimate shapes (R2)
- [ ] `src/lib/design/visual-baselines.ts` + `.github/workflows/baselines.yml` — `BaselineCountIsSeventyFour` and the duplicated workflow literal move together, **only if** new VRT rows are added. **`profile` is already a VRT surface, so its existing baselines are invalidated regardless.** (R6)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| drag-pan · pinch-zoom · slider · short-viewport vertical drag · cancel → re-pick **the identical file** · removal | **CROP-04** | **D-175 forbids claiming CROP-04 from a Playwright run.** Playwright can synthesise touch and assert `touch-action`, but cannot reach Safari's `gesturestart`/`gesturechange` path (a *different* code path in the library), real finger occlusion of a 183px stage, iOS momentum/rubber-banding, or the OS file picker that D-174's re-pick bug lives in. | Operator walk on **{iOS Safari, Android Chrome}** — one device does not discharge CROP-04, because iOS pinch runs a different code path from Android's. Recorded in `16-UAT-CROP.md`, mirroring `15-UAT-EMAIL.md`. **One table row per clause** — CROP-04 is conjunctive (the lesson Phase 15 recorded at its own close). |
| GATE-VRT court-only baselines for the crop dialog + cover preview, **and** regeneration of the existing `profile` baselines | CROP-01, CROP-03 | The Playwright `visual` project is constructed only on Linux; this machine is Windows. `updateSnapshots: "none"` is unconditional. | **CI dispatch checkpoint (blocking)** via `.github/workflows/baselines.yml`, exactly as 15-11-02 was handled. |
| Cloudinary account `folder_mode` confirmation before the D-165 prefix test is pinned | CROP-02 / D-165 | `.env.local` holds dummy Cloudinary values and Docker was down at research time; the §C9 conclusion rests on three agreeing doc pages + one corroborating in-repo fixture (confidence **MEDIUM-HIGH**). | One `curl` against the Admin API `config` endpoint with real credentials, reading `folder_mode`. Raises §C9 to HIGH. Non-blocking for planning; blocking for pinning the prefix assertion. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (8 test files + 11 image fixtures)
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Phase: 16-image-crop-framing*
*Created: 2026-08-25 from 16-RESEARCH.md § E*
