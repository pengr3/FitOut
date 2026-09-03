---
phase: 16-image-crop-framing
plan: 04
subsystem: testing
tags: [fixtures, codegen, png, apng, jpeg, exif, gif, svg, drift-gate, zero-dependency, design-gate]

# Dependency graph
requires:
  - phase: 10-design-system
    provides: "`scripts/generate-design-tokens.mjs` + `tests/design/token-drift.test.ts` — D-18's committed-with-a-drift-check contract, the header voice, the PATH SAFETY rule and the pure-renderer / `main()` split this generator copies wholesale"
  - phase: 11-responsive-and-mobile
    provides: "`tests/design/gitignore-baselines.test.ts` — the `execFileSync` + guard-the-guard `git ls-files` idiom, and the `*-win32.png` / `*-darwin.png` rules the new directory must not collide with"
provides:
  - "`e2e/fixtures/` — eleven committed, generator-produced image fixtures; the first binary INPUTS to a spec in this repository"
  - "`scripts/generate-image-fixtures.mjs` — pure `crc32` / `pngChunk` / `renderPng` / `renderApng` / `renderGif` / `renderSvg` / `renderJpeg` / `exifOrientationApp1` / `truncate` / `solidRgba`, plus a `FIXTURES` descriptor both `main()` and the drift test read"
  - "`npm run fixtures:images` — the regeneration entry point, registered beside `design:tokens`"
  - "`tests/design/image-fixtures.test.ts` — the drift gate (20 assertions, build-blocking via `npm run test:design`)"
  - "`e2e/fixtures/README.md` — per-fixture provenance naming the consuming plan and behaviour, the ±8 tolerance policy, and the recorded `animated.webp` → `animated.png` substitution"
  - "THREE MEASURED FACTS downstream plans must assert from, two of which contradict 16-04-PLAN: the EXIF-6 corner is TOP-RIGHT; a mid-scan JPEG truncation does NOT fire `onerror` in Chromium; the APNG genuinely animates and presents frame one at load"
  - "`.gitattributes` pins for `e2e/fixtures/` — `binary` for png/jpg/gif, `eol=lf` for svg"
affects: [16-13 the real-browser cropper spec, 16-14 the byte-honesty proofs, 16-16 the PM hardware walk]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "binary-codegen-with-a-drift-gate: the D-18 committed-artifact contract extended from text to bytes — pure renderers, a `main()` behind an entry-point guard, and a test that re-renders in memory and never calls `main()`"
    - "a shared `FIXTURES` descriptor (name + render thunk) read by BOTH the writer and the gate, so a fixture cannot exist on one side and not the other"
    - "flat-block DC-only JPEG encoding: 8px-aligned source rectangles make every 8x8 block one colour, so the encoder needs one DC coefficient per block and no AC path — and it re-verifies flatness per block rather than trusting the alignment check"
    - "measure the decoder, do not reason about it: every claim this plan makes about EXIF orientation, animation and decode failure was probed in real Chromium before it was written down"

key-files:
  created:
    - scripts/generate-image-fixtures.mjs
    - tests/design/image-fixtures.test.ts
    - e2e/fixtures/README.md
    - e2e/fixtures/exif-orientation-6.jpg
    - e2e/fixtures/transparent.png
    - e2e/fixtures/animated.png
    - e2e/fixtures/panorama-4000x500.jpg
    - e2e/fixtures/portrait-strip-500x4000.jpg
    - e2e/fixtures/square-400.png
    - e2e/fixtures/small-300.png
    - e2e/fixtures/tiny-150.png
    - e2e/fixtures/corrupt.jpg
    - e2e/fixtures/tiny.gif
    - e2e/fixtures/tiny.svg
  modified:
    - package.json
    - .gitattributes

key-decisions:
  - "The hand-rolled zero-dependency encoder was chosen over `sharp`, as the plan directed, and the argument is written into the generator's header so a future reader does not re-litigate it: Phase 11's empty-`package.json`-diff criterion, this phase's one dependency exception already spent on `react-easy-crop` (D-167), and the fact that third-party bytes are exactly as magic as hand-committed ones."
  - "`renderJpeg` takes `{ width, height, pixels }` — the RGBA plane `solidRgba` produces — not the `{ width, height, blocks }` the plan's prose names. An encoder needs the base colour as well as the rectangles, and `read_first` required reusing `solidRgba` and its alignment assertion; `pixels` is the only coherent input that does both."
  - "The 8px alignment assertion lives in `solidRgba` (as planned) AND a per-block flatness assertion lives in `renderJpeg`. The second is not redundant: alignment is a property of the rectangles, flatness is the property the DC-only encoder actually depends on, and a future caller could satisfy one without the other."
  - "All four Annex-K Huffman tables are transcribed verbatim and validated at module load (`sum(bits) === values.length` for each). A mis-transcribed table still produces a file — just an undecodable one — so the cheap structural check is the only thing standing between a typo and a fixture set that fails two plans later."
  - "The DQT is ALL ONES, which makes DC quantization the identity, so a decoded colour is a pure function of the input rather than of a quality setting. The remaining ±1 error is YCbCr rounding, which is why the ±8 tolerance is documented as the CONSUMER's job in the README."
  - "The drift test imports the renderers and never calls `main()`. A test that invoked it would repair the file it was checking and then pass — a regeneration step wearing a test's clothes."
  - "`EXPECTED_TRACKED_PATHS = 12` is spelled out rather than derived from `FIXTURES.length + 1`, so adding a fixture without documenting it fails in the file whose subject is that these bytes are accounted for."
  - "The test re-parses the EXIF IFD with its own little-endian reader rather than running `exifOrientationApp1` backwards. A decoder written from the same misunderstanding as its encoder agrees with it perfectly."

patterns-established:
  - "For a generated BINARY artifact, `.gitattributes` is part of the contract, not housekeeping. Under `* text=auto`, an LF→CRLF normalisation inside a DEFLATE stream or an entropy-coded scan does not produce odd line endings — it produces a corrupt image, and the drift gate then goes red for a reason that has nothing to do with drift."
  - "When a plan states a decoder behaviour as fact, probe it before building on it. Two of this plan's stated behaviours were wrong, both would have surfaced two plans later, and in both cases the cheapest repair at that point would have been to weaken the assertion."
  - "Record a corrected fact in THREE places — the generator comment, the fixture README, and the SUMMARY — because the downstream plan that needs it may reach any one of them first."

requirements-completed: []
requirements-advanced: [CROP-01]

# Metrics
duration: 25min
completed: 2026-08-25
---

# Phase 16 Plan 04: The image fixtures and their generator — Summary

**Eleven committed image fixtures whose every byte — including the EXIF Orientation tag — is written by a zero-dependency generator a reader can audit, gated by a drift test that was watched red before it was trusted; and two of the plan's stated decoder behaviours were measured false and corrected before they could reach the specs that depend on them.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-25T15:40+08:00
- **Completed:** 2026-08-25T16:05+08:00
- **Tasks:** 3/3
- **Commits:** 3 (+ this one)

## What was built

| Commit | Task | What landed |
|---|---|---|
| `61341b2` | 1 | `scripts/generate-image-fixtures.mjs` (PNG/APNG/GIF/SVG half) + seven fixtures + the `.gitattributes` pins |
| `750708f` | 2 | The DC-only baseline JPEG encoder, `exifOrientationApp1`, `truncate`, + four JPEG fixtures |
| `bc19c92` | 3 | `npm run fixtures:images`, `e2e/fixtures/README.md`, `tests/design/image-fixtures.test.ts` |

### The eleven byte sizes (recorded as the plan required)

| File | Bytes |
|---|---:|
| `tiny.gif` | 45 |
| `tiny.svg` | 133 |
| `corrupt.jpg` | 260 |
| `tiny-150.png` | 344 |
| `transparent.png` | 640 |
| `animated.png` | 788 |
| `small-300.png` | 810 |
| `square-400.png` | 1,208 |
| `exif-orientation-6.jpg` | 4,890 |
| `panorama-4000x500.jpg` | 55,840 |
| `portrait-strip-500x4000.jpg` | 55,875 |
| **Total** | **120,833** |

`panorama-4000x500.jpg` is **55,840 bytes**, comfortably under the 200 KB the plan asked to be flagged. The arithmetic behind that: 500 × 63 = 31,500 MCUs, each costing 14 bits (Y: 2-bit DC category + 4-bit EOB; Cb and Cr: 2 + 2 each) once the DC differences settle to zero across a flat field — about 55 KB, which is what came out.

## Verification

| Check | Result |
|---|---|
| `npm run fixtures:images` → `git diff --exit-code e2e/fixtures` | exit 0, working tree clean |
| Generator run twice → `git status --porcelain e2e/fixtures` | empty (idempotent by `writeIfChanged`) |
| `git ls-files e2e/fixtures \| wc -l` | **12** |
| `npx vitest run tests/design/image-fixtures.test.ts --config vitest.design.config.ts` | **20 passed** (6 guard-the-guard, **11 byte-equality**, 3 tracking) |
| `npm run test:design` | **58 files, 1126 passed, 3 skipped** (baseline before this plan: 57 / 1106) |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on both new files | exit 0, zero warnings |
| `git show --stat HEAD -- package-lock.json` | **no rows** — zero dependencies added (T-16-12) |
| `grep -c "process.argv\|process.env" scripts/generate-image-fixtures.mjs` | **0** (T-16-10) |
| `grep -c "animated.webp" e2e/fixtures/README.md` | **1** — the substitution is on the record |

### The drift gate, watched red before it was trusted (T-16-11)

Flipped one byte of the committed `e2e/fixtures/exif-orientation-6.jpg` (offset 28, inside the EXIF value field, `0x00` → `0x01`) and ran the spec. Verbatim:

```
 ❯ tests/design/image-fixtures.test.ts (20 tests | 1 failed) 43ms
     × e2e/fixtures/exif-orientation-6.jpg matches a fresh in-memory render 13ms

AssertionError: e2e/fixtures/exif-orientation-6.jpg has drifted from
scripts/generate-image-fixtures.mjs (same length (4890), first difference at byte 28:
committed 0x01 vs rendered 0x00) — run `npm run fixtures:images` — do NOT edit a fixture
by hand, and do NOT edit this test: expected 1 to deeply equal +0

 Test Files  1 failed (1)
      Tests  1 failed | 19 passed (20)
```

That is the correct blast radius: one named file, the exact byte offset, and the other ten fixtures plus the guard-the-guard block left alone. Restored with `npm run fixtures:images` (the remedy the message names) → `git diff --exit-code e2e/fixtures` exit 0 → **20 passed**.

### Real-decoder verification (throwaway Playwright probes, not committed)

Every fixture was loaded into real Chromium and its decoded pixels sampled, because a hand-rolled encoder that produces a *plausible* file is the failure mode this plan exists to rule out.

| Fixture | Chromium reported |
|---|---|
| `transparent.png` | 320×320; `(32,32)` = `[255,0,0,255]`; `(160,160)` / `(319,32)` / `(32,319)` / `(319,319)` = `[0,0,0,0]` |
| `square-400.png` | 400×400, uniform `[0,0,255,255]` |
| `small-300.png` | 300×300, uniform `[0,255,0,255]` |
| `tiny-150.png` | 150×150, uniform `[255,0,0,255]` |
| `animated.png` | 160×160, `[255,0,0,255]` at load (**frame one**); **two distinct rendered frames observed over 3.6 s** — it genuinely animates, so `acTL`/`fcTL`/`fdAT` sequencing is correct |
| `tiny.gif` | 8×8, `[255,0,0,255]` — the hand-rolled LZW decodes |
| `tiny.svg` | 8×8, `[255,0,0,255]` |
| `exif-orientation-6.jpg` | **320×480 portrait**; pure red at `(319,32)`; white at `(32,32)`, `(32,479)`, `(319,479)` |
| `panorama-4000x500.jpg` | 4000×500; red at the left edge, blue at the right, white body |
| `portrait-strip-500x4000.jpg` | 500×4000; red at the top, blue at the bottom |
| `corrupt.jpg` | `<img>` fires **`error`**, `img.decode()` **throws**, `naturalWidth` **0** |

`e2e/fixtures/exif-orientation-6.jpg` and `e2e/fixtures/square-400.png` were also opened with a second, independent image renderer as the plan's human-visible sanity check. Observed: `square-400.png` renders a square, flat, pure-blue image; `exif-orientation-6.jpg` renders **portrait, taller than wide, with the red block in the TOP-RIGHT** — agreeing with Chromium and disagreeing with the plan (see Deviation 2).

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] `corrupt.jpg` is cut inside the DHT segment, not mid-scan — because mid-scan measurably does not fail**

- **Found during:** Task 2, verifying the fixture in real Chromium
- **Issue:** The plan specifies `truncate(renderJpeg(...), 0.4)` cutting the entropy-coded scan, and the fixture's stated purpose is `<img>` `onerror` → `AVATAR_UNREADABLE_MESSAGE`. Those two are incompatible in Chromium. Probed at five depths — keeping 90 %, 60 %, 40 %, 20 % and 5 % of the scan — **every single one fired `load`, not `error`; `img.decode()` resolved; `naturalWidth`/`naturalHeight` read 64×64.** Chromium treats a short scan as a partially-received image and renders what it got. The fixture would have been an input that provably cannot exercise the branch it exists for, and the failure would have surfaced in 16-13 where the cheapest repair is to weaken the assertion.
- **Fix:** `truncate` now walks the marker chain (rather than searching for the `FFC4` byte pair, which could land inside a payload), finds DHT, and keeps its marker + length field plus `keepRatio` of the table payload. Everything a decoder reads first — SOI, the all-ones DQT, the real 64×64 baseline SOF0 — is intact, so the file is still a plausible JPEG by extension **and** by header and still reaches the decode path instead of being turned away by the type guard. Re-probed at the same five depths: **`error`, `decode()` throws, `naturalWidth` 0** at every one.
- **Consequence for consumers:** `corrupt.jpg` no longer contains an SOS marker. Nothing downstream asserts on that; it is recorded because the plan's prose said "keeping the SOI/DQT/SOF0/DHT/SOS prefix".
- **Files modified:** `scripts/generate-image-fixtures.mjs`, `e2e/fixtures/corrupt.jpg` (645 → 260 bytes)
- **Commit:** `750708f`

**2. [Rule 1 — Bug] EXIF Orientation 6 puts the corner block in the displayed TOP-RIGHT, not the bottom-left the plan predicted**

- **Found during:** Task 2, the plan's own "open it and look" acceptance criterion
- **Issue:** 16-04-PLAN's acceptance criterion says the fixture must show "a PORTRAIT image with the red block in the **BOTTOM-LEFT** of the displayed frame (the 90-degree-CW correction applied)", and the plan's dictated code comment repeats it. That is the *inverse* of what the tag means. EXIF value 6 says the 0th row of the stored raster is the visual **right-hand side** and the 0th column is the visual **top** — equivalently, rotate the stored raster 90° **clockwise** to display it. A 90° clockwise rotation carries a top-left corner to the **top-right**.
- **Measured, twice, independently:** Chromium reports `naturalWidth` 320 / `naturalHeight` 480 with pure red at `(319, 32)` and white at the other three sampled corners. A second, unrelated image renderer draws the same picture: portrait, red top-right. Both decoders honour the tag; both disagree with the plan.
- **Fix:** No byte of the fixture changed — the fixture is correct as specified (Orientation = 6, block at the stored top-left). What changed is every place that states the consequence: the `exifOrientationApp1` docblock now states the tag's meaning from the standard, gives the corner as TOP-RIGHT, records the measurement inline, and says in as many words that downstream assertions must read TOP-RIGHT. The README repeats it under its own heading, and this SUMMARY is the third place.
- **Why this matters beyond a comment:** 16-14 Task 2 line 220 asserts that the saved crop puts the corner block "where the CORRECTED orientation puts it, not the one the raw raster would". Written from the plan's sentence, that assertion would have looked in the wrong corner and failed against correct code. This is exactly the payoff the plan claimed for generating the fixture rather than committing opaque bytes: the byte is auditable, so the audit caught the error.
- **Files modified:** `scripts/generate-image-fixtures.mjs`, `e2e/fixtures/README.md`
- **Commits:** `750708f`, `bc19c92`

**3. [Rule 2 — Missing critical] `.gitattributes` pins for `e2e/fixtures/` (a file the plan does not list)**

- **Found during:** Task 1, before the first fixture was staged
- **Issue:** `.gitattributes:2` is `* text=auto`, and `.gitattributes:11` says in as many words *"If another generated-and-byte-compared artifact is added, it belongs here too."* Eleven byte-compared artifacts were about to be added with no entry. For a binary file the consequence is worse than for a text one: an LF→CRLF rewrite inside a DEFLATE stream or an entropy-coded scan is not odd line endings, it is a **corrupt image**, and the drift gate would go red on a fresh clone for a reason that has nothing to do with drift. `tiny.svg` is genuinely text and is byte-compared, so it needs the same `eol=lf` pin the three existing generated artifacts carry.
- **Fix:** Added `e2e/fixtures/*.png|*.jpg|*.gif → binary` and `e2e/fixtures/*.svg → text eol=lf`, with a comment explaining why the guess is removed rather than tuned. Verified with `git check-attr text eol diff` before the first commit: the PNG reports `text: unset` / `diff: unset`, the SVG reports `eol: lf`.
- **Files modified:** `.gitattributes`
- **Commit:** `61341b2`

**4. [Rule 2 — Missing] A second marker block at the far end of both panorama fixtures**

- **Found during:** Task 2
- **Issue:** The plan asks for "a 64×64 marker block at the left edge so a pan is observable". With one marker and a flat white body, a consumer can observe that the marker left the viewport but not **which end** it panned to — and the assertion these two fixtures exist for is "pans one axis, pinned on the other", which needs to distinguish the ends.
- **Fix:** Both fixtures carry a pure-red 64×64 marker at the near edge and a pure-blue one at the far edge (`x = 3936` on the panorama, `y = 3936` on the strip — both 8px-aligned, both flush with the far edge). Confirmed in Chromium: red at the near edge, blue at the far, white body.
- **Files modified:** `scripts/generate-image-fixtures.mjs`, `e2e/fixtures/panorama-4000x500.jpg`, `e2e/fixtures/portrait-strip-500x4000.jpg`
- **Commit:** `750708f`

### Naming clarification (not a deviation)

`renderJpeg` takes `{ width, height, pixels, orientation? }`, where `pixels` is the RGBA plane `solidRgba` returns. The plan's prose names the parameter `blocks`; an encoder needs the base colour as well as the rectangles, and Task 2's `read_first` requires reusing `solidRgba` and its 8px assertion, so `pixels` is the only input that satisfies both. The 8px-aligned-rectangles property the plan means by "blocks" is enforced in `solidRgba` and independently re-verified per block inside `renderJpeg`.

## Facts downstream plans must use

Three things were established by measurement here and are load-bearing for 16-13 / 16-14 / 16-16:

1. **`exif-orientation-6.jpg` honoured → 320×480 portrait, red block TOP-RIGHT.** Ignored → 480×320 landscape, red block top-left. Both aspect and corner differ, so the assertion cannot pass by accident. **Assert top-right.**
2. **A mid-scan JPEG truncation does not fire `onerror` in Chromium at any depth.** If a future fixture needs to be undecodable, cut inside the header segments, not the scan.
3. **`animated.png` presents frame one (pure red) at load and genuinely animates** (two distinct frames observed over 3.6 s). `drawImage(HTMLImageElement)` at load draws frame one, which is what the still-first-frame assertion needs.

Also worth carrying forward: the ±8 per-channel tolerance for JPEG round-tripped colours belongs to the consumer. Pure red comes back `(254, 0, 0)` and pure blue `(1, 0, 254)`. Do not "fix" a fixture over a one-off sample.

## Deferred / not done

- **A real animated WebP.** `16-VALIDATION.md` names `e2e/fixtures/animated.webp`; this plan ships `animated.png` (APNG) and records the substitution verbatim in `e2e/fixtures/README.md` § Substitutions. An animated WebP needs a VP8L encoder, which is larger than everything else in the generator combined, and no installed tool emits one. APNG satisfies the behaviour under test exactly (`image/png` is inside `AVATAR_ALLOWED_TYPES`, browsers animate it, `drawImage` at load draws frame one — all three confirmed in Chromium). **A real animated WebP is a `devDependency` decision for the PM, not an executor's call.**
- **REQUIREMENTS.md was not touched.** CROP-01 is carried by twelve plans in this phase and this one does not close its last clause — see `requirements-advanced` in the frontmatter.
- **STATE.md and ROADMAP.md were not touched**, per the orchestrator's single-writer instruction.

## Known Stubs

None. Every fixture is a complete, decoder-verified file; `corrupt.jpg` is deliberately and provably incomplete, which is its specification rather than a stub.

## Notes on the residual risk this plan knowingly carries

The DEFLATE streams inside the PNGs are the one thing not written byte by byte. `DEFLATE_OPTIONS` pins every parameter that affects zlib's output (level, `windowBits`, `memLevel`, strategy) but cannot pin the *implementation*. If a future Node ships a different deflate and the gate goes red on a machine where nobody edited anything, that is the reason; the remedy is a regeneration commit that says so, never a normalising comparison. This is stated in the generator header, in the test header's NOT COVERED list, and here.

## Self-Check: PASSED

All 15 claimed files exist on disk; all three claimed commits (`61341b2`, `750708f`, `bc19c92`) are in `git log`.
