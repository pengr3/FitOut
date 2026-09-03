---
phase: 16-image-crop-framing
plan: 07
subsystem: api
tags: [crop-01, cloudinary, gravity, zod, mime-allow-list, svg-xss, use-server, D-171, T-16-22, T-16-23]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    provides: "16-02's `src/lib/avatar.ts` — `AVATAR_ALLOWED_TYPES` (the readonly three-MIME tuple) in a DIRECTIVE-FREE leaf module, which is what lets a Zod schema shared with a client component import it"
  - phase: 01-foundation
    provides: "`src/lib/cloudinary.ts`'s `uploadAvatar` (upload_stream + the 400x400 transform), `src/app/actions/avatar.ts`'s `uploadAvatarAction`, `src/lib/validation/profile.ts`'s `avatarFileSchema`, and `tests/use-server-exports.test.ts` — the guard that made this plan's 'add nothing to the action file' rule enforceable rather than aspirational"
provides:
  - "`gravity: \"center\"` at `src/lib/cloudinary.ts` — the server never selects an avatar region again (D-171). The 400x400 `c_fill` transform is KEPT, as a fail-closed dimension normaliser for the publicly-reachable bypass path"
  - "Both comments this change falsified, corrected in the same commit as the change: `cloudinary.ts`'s header docblock and `actions/avatar.ts`'s security contract"
  - "`avatarFileSchema` narrowed from `image/*` to a membership test against the shared `AVATAR_ALLOWED_TYPES` — SVG can no longer reach the avatar path (T-16-23) — with the refusal message byte-unchanged"
  - "Four ADDED test cases in `tests/profile/avatar.test.ts` (transform pin, webp accepted, gif rejected, svg rejected); zero edits to the six that shipped"
  - "A reusable way to assert Cloudinary upload OPTIONS: the globally-mocked `upload_stream` vi.fn, grabbed after `vi.resetModules()`, since `mockCloudinary` only captures the RESULT"
affects: [16-08 and later avatar-cropper plans (the client now owns framing and must send a 400x400 square), 16-15 the phase gate inventory, 16.1 upload-hardening (the pixel guard this plan deliberately did not add)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "one-word-change-plus-its-comments: a behaviour change that falsifies a comment ships the correction in the SAME commit, because a false comment on this path is how the next reader reintroduces the bug"
    - "allow-list-by-import: the Zod refine tests membership of the SAME array the client picker's `accept` reads, so a picker that offers what the server refuses is not expressible"
    - "options-not-results: assert on the mocked `upload_stream`'s call arguments (`toEqual` on the whole transformation object), which also fails if a `format`/`quality`/`fetch_format`/eager transform is ever slipped in"
    - "prove-the-call-happened: every options assertion is preceded by `calls.length === before + 1`, so it cannot pass vacuously against an upload that never ran"

key-files:
  created: []
  modified:
    - src/lib/cloudinary.ts
    - src/app/actions/avatar.ts
    - src/lib/validation/profile.ts
    - tests/profile/avatar.test.ts

key-decisions:
  - "The transform is retained, not deleted (D-171 / 999.2 § 4). `uploadAvatarAction` is publicly reachable and `avatarFileSchema` guards type and byte size but NOT pixel count, so a non-browser client can POST a 4.9 MB 8000x6000 JPEG and never touch the cropper. The 400x400 `c_fill` is what makes that case store a bounded asset."
  - "`center` and not `auto`/`faces`/`custom`: it is the only value that cannot invent a framing — on the square the cropper produces it is a no-op, and on a bypassed non-square input it takes the middle."
  - "`toEqual` on the whole `transformation` object rather than a `gravity`-only assertion. The plan forbids adding `format`, `quality`, `fetch_format` or an eager transform; a whole-object equality is the assertion that actually enforces that, and it costs nothing extra."
  - "The upload spy is read off `await import(\"cloudinary\")` AFTER `vi.resetModules()`, copying `tests/listing/cloudinary-sign.test.ts`'s api_sign_request pattern, rather than extending `tests/helpers/mocks.ts`. `mocks.ts` is shared by the whole suite and this plan's file list did not include it; the existing precedent gets the same evidence with a blast radius of one file."
  - "The refusal message stayed byte-identical (`Only image files are allowed.`) and is asserted with `toBe`, not `toContain` — 16-UI-SPEC pins it as the server-side backstop and the client shows `AVATAR_WRONG_TYPE_MESSAGE` instead."
  - "No pixel guard was absorbed, deliberately (T-16-24 accepted). The server holds a File and never learns how many pixels are inside it, so such a refine could not run; the retained transform is the backstop and the real guard is Phase 16.1 (D-164 / D-166)."
  - "Two comment wordings were chosen to keep the plan's literal greps honest: the `cloudinary.ts` header says `g_face` and 'centre-gravity' in prose rather than repeating the two `gravity: \"...\"` literals, and `validation/profile.ts` says 'pixel-size' rather than 'pixel-dimension'. Same meaning; the greps stay a signal rather than a thing to explain away."

patterns-established:
  - "Watch the red on the case that is supposed to be the ONLY one that moves. `image/gif` was run against the unmodified schema and observed ACCEPTED — that is the single case proving the narrowing happened, and it is why the plan named it rather than trusting the webp case."
  - "A comment correction is part of the behaviour change's hunk, not a follow-up. Both false sentences were fixed inside commit 87ade7f, alongside the one word that falsified them."

requirements-completed: []
requirements-advanced: [CROP-01]

# Metrics
duration: 15min
completed: 2026-08-25
---

# Phase 16 Plan 07: The server stops guessing a framing — Summary

**`gravity: "face"` is gone: the avatar transform now takes the middle it can never re-choose, it is retained on purpose as a fail-closed size normaliser for the bypass path, both comments that claimed otherwise were corrected in the same commit, and the file guard narrowed from `image/*` to the three types the client picker itself offers — so an SVG can no longer reach Cloudinary.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-25T16:50:00+08:00
- **Completed:** 2026-08-25T17:05:00+08:00
- **Tasks:** 2 of 2
- **Files modified:** 4 (0 created)

## Accomplishments

- **The phase's origin bug is closed on the server.** `gravity: "face"` on a source with no face falls back to an arbitrary region — literally the complaint that created Phase 16. It is now `center`, the only value that cannot select a region: a no-op on the square the cropper produces, the middle on anything else.
- **The transform survived the fix, which is the point.** Deleting it would open a hole the schema cannot close: `uploadAvatarAction` is a public server action whose Zod guard checks content-type and bytes but not pixel count, so a client that skips the cropper can hand it a 4.9 MB 8000x6000 JPEG. The 400x400 `c_fill` is what bounds that case. It stopped being a framing decision without stopping being a ceiling.
- **Both false comments were corrected in the same commit as the word that falsified them.** `actions/avatar.ts` no longer claims Cloudinary "normalizes to 400x400 face-cropped"; `cloudinary.ts`'s header now states that bytes arrive pre-framed from the user's own crop, that the transform is a dimension normaliser for the bypass path, and that `gravity` must never again select a region.
- **The avatar file guard is now the same list the picker offers.** `avatarFileSchema` tests membership of `AVATAR_ALLOWED_TYPES` imported from `@/lib/avatar` — three MIME strings in one place with two consumers, so the picker and the server cannot disagree. The security half is free: an SVG is a scriptable document, and it no longer reaches Cloudinary (T-16-23).
- **Extended, never weakened.** All six shipped assertions are byte-unchanged; four were added. The full suite went 2068 → 2072 passing, which is exactly the four new cases and nothing else.

## Task Commits

1. **Task 1: gravity center, and both false comments corrected in the same commit** — `87ade7f` (fix)
2. **Task 2: Narrow `avatarFileSchema` to the shared allow-list, extending the existing spec** — `fde00ac` (fix)

## Files Modified

- `src/lib/cloudinary.ts` — `gravity: "face"` → `"center"` (one word, inside `uploadAvatar`'s `transformation`). `folder`, `public_id`, `overwrite`, `width`/`height`/`crop` and the callback-to-Promise wrapper are untouched; no `format`, `quality`, `fetch_format` or eager transform was added. The header docblock gained three paragraphs: bytes arrive pre-framed (CROP-01/D-171), why the transform is retained as a bypass-path normaliser rather than deleted, the never-select-a-region rule with the `g_face` history that motivates it, and the geometry-vs-bytes note from RESEARCH §C12.
- `src/app/actions/avatar.ts` — the SECURITY CONTRACT bullet that read *"Cloudinary's transformation additionally normalizes to 400x400 face-cropped, so a hostile aspect ratio cannot blow up storage"* now says the framing is the user's and the transform is a dimension normaliser for the bypass path only. It also names the narrowed type list. **Nothing else changed in this file** — it is `"use server"`, so no constant, no schema, no re-export; the incident record at `:19-32` is intact and `export type AvatarResult` is the only non-function export, as it has always been.
- `src/lib/validation/profile.ts` — imports `AVATAR_ALLOWED_TYPES` from `@/lib/avatar`; the third refine's predicate is now a membership test. The message is byte-identical. The schema docblock names the three types, says where the list lives, notes that the client picker's `accept` reads the same array, and records why there is deliberately no pixel-size refine here.
- `tests/profile/avatar.test.ts` — four ADDED cases and the spy wiring (`type Mock` import, `uploadStreamSpy`, one `await import("cloudinary")` in `beforeAll`). No existing `expect` line was touched.

## Verification Run

Every command was run in this working tree, **alone** — never concurrently, because `tests/global-setup.ts` TRUNCATEs `fitout_test` on every run and a second vitest process would wipe the first's fixtures mid-flight.

Preconditions recorded as run: Docker container `fitout-db-1` **Up**, and `npm run db:test:setup` executed before the first suite (*"migrations applied successfully … Test database URL: postgresql://fitout:fitout@localhost:5432/fitout_test"*).

| Command | Result |
|---|---|
| `npx tsc --noEmit` (after task 1, and again after task 2) | exit 0, no output |
| `npx vitest run tests/profile/avatar.test.ts tests/use-server-exports.test.ts` | **2 files, 11 passed**, exit 0 |
| `npx vitest run tests/profile/` | **2 files, 15 passed**, exit 0 |
| `npm run test:design` | **58 files, 1126 passed / 3 skipped**, exit 0 — identical to the post-wave-1 baseline |
| `npm test` (full suite, alone) | **183 files passed / 2 skipped, 2072 passed / 5 skipped**, exit 0 — baseline was 2068; +4 is exactly this plan's four new cases |
| `npm run build` | exit 0, full route table emitted |
| `npx eslint` on all four changed files | clean, exit 0 |
| `git diff --exit-code src/app/api/cloudinary/sign/route.ts` | exit 0 — `ALLOWED_SIGN_KEYS` untouched |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` — GATE-06 holds, zero migrations |

The full-suite run's end-of-run leak report named 2 rows in `public.audit` (`action=guest-email`, `action=notify`). That is the pre-existing, documented containment finding from `tests/setup.ts` — unrelated to this plan, and unchanged by it.

### The plan's greps, run

| Assertion | Required | Result |
|---|---|---|
| `grep -c 'gravity: "face"' src/lib/cloudinary.ts` | `0` | `0` |
| `grep -c 'gravity: "center"' src/lib/cloudinary.ts` | `1` | `1` |
| `grep -ci "face-cropped" src/lib/cloudinary.ts src/app/actions/avatar.ts` | `0` both | `0` and `0` |
| `grep -cE '^export (const\|let\|var\|class\|enum)\|export \*\|export \{[^}]*\} from' src/app/actions/avatar.ts` | `0` | `0` (only `export type AvatarResult` and `export async function uploadAvatarAction`) |
| `grep -c "toEqual(buffer)\|byte-identical" tests/profile/avatar.test.ts` | `0` | `0` |
| `grep -c 'startsWith("image/")' src/lib/validation/profile.ts` | `0` | `0` |
| `grep -c "AVATAR_ALLOWED_TYPES" src/lib/validation/profile.ts` | `>= 1` | `3` |
| `grep -c "Only image files are allowed." src/lib/validation/profile.ts` | `1` | `1` |
| `grep -c "dimension\|naturalWidth\|width" src/lib/validation/profile.ts` | `0` | `0` |
| `git diff tests/profile/avatar.test.ts` shows only ADDED cases | — | confirmed on both commits; the diff is pure `+` inside the existing describe plus one new describe |

## The two watched reds

Both are the plan's own acceptance criteria, and both were observed before the corresponding source change.

**1. The transform pin, run against the shipped `gravity: "face"`** (task 1, before `src/lib/cloudinary.ts` was edited). Transcribed verbatim:

```
 FAIL  tests/profile/avatar.test.ts > the server never guesses a framing (CROP-01, D-171, threat
 T-16-22) > uploads with gravity center and keeps the 400x400 fill normaliser
AssertionError: expected { width: 400, height: 400, …(2) } to deeply equal { width: 400, height: 400, …(2) }

- Expected
+ Received

  {
    "crop": "fill",
-   "gravity": "center",
+   "gravity": "face",
    "height": 400,
    "width": 400,
  }

 ❯ tests/profile/avatar.test.ts:175:36

 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

The failure names the real shipped value, and the other six cases stayed green — so the assertion is reading the actual upload options, not failing on wiring. It went green on the one-word change.

**2. `image/gif` and `image/svg+xml` accepted by the unmodified schema** (task 2, before `src/lib/validation/profile.ts` was edited). This is the only pair that proves the narrowing happened — under `startsWith("image/")` both **pass**, i.e. red for our purposes:

```
 FAIL  tests/profile/avatar.test.ts > avatar file validation (threat T-04-04) > rejects image/gif —
 the narrowing itself (it passed under startsWith("image/"))
AssertionError: expected true to be false // Object.is equality
 ❯ tests/profile/avatar.test.ts:115:25

 FAIL  tests/profile/avatar.test.ts > avatar file validation (threat T-04-04) > rejects
 image/svg+xml — a scriptable document must not reach Cloudinary (T-16-23)
AssertionError: expected true to be false // Object.is equality
 ❯ tests/profile/avatar.test.ts:122:25

 Test Files  1 failed (1)
      Tests  2 failed | 8 passed (10)
```

The `image/webp` case passed in that same run — correctly, since `image/webp` was already inside `image/*`. It is not evidence of the narrowing; it is the assertion that keeps `AVATAR_HELPER`'s WebP promise honest against the schema afterwards.

## Threat Model Dispositions

| Threat ID | Disposition | What actually shipped |
|---|---|---|
| T-16-22 (tampering with the framing) | **mitigated** | `gravity: "center"`, pinned by a whole-object `toEqual` on the mocked upload options, watched red against `"face"`. |
| T-16-23 (SVG served from our origin) | **mitigated** | `avatarFileSchema` narrowed to `AVATAR_ALLOWED_TYPES`; `image/svg+xml` has its own rejection case asserting the message with `toBe`. |
| T-16-24 (decompression bomb via a bypassed action) | **accepted, on the record** | NOT fixed here, deliberately. The schema checks type and bytes, never pixels; the retained 400x400 `c_fill` is the bounded-storage backstop, and a real pixel guard is Phase 16.1 (D-164 / D-166). This is the residual risk D-171 keeps the transform for. |
| T-16-25 (a value exported from a `"use server"` module) | **mitigated** | This plan added no export to `src/app/actions/avatar.ts` — only a comment changed. `tests/use-server-exports.test.ts` was in both verify runs and passed. |

## Requirements

- **CROP-01 — advanced, NOT completed.** Its second clause (*"the server's blind face-gravity re-crop no longer re-frames what the user just chose"*) is discharged by this plan. Its first clause (*"a user can frame and zoom their avatar before it uploads"*) needs the cropper itself, which lands in the later plans of this phase. Nine plans in phase 16 carry `requirements: [CROP-01]`; per the orchestrator's single-writer rule, only the plan closing the last clause ticks the box. `.planning/REQUIREMENTS.md` was **not** modified.

## Deviations from Plan

**None affecting behaviour.** Two wording adjustments were made so the plan's own literal greps stay honest, both inside comments the plan asked me to write anyway:

1. `src/lib/cloudinary.ts`'s new header first said *"It was `gravity: \"face\"` until D-171"* and quoted the full transformation object in prose. That made `grep -c 'gravity: "face"'` return `1` and `grep -c 'gravity: "center"'` return `2`, against acceptance criteria of `0` and `1`. Reworded to `g_face` and "centre-gravity". Same meaning, and the greps remain a signal rather than a thing a future reader has to explain away.
2. `src/lib/validation/profile.ts`'s new docblock first said *"no pixel-dimension refine"*, which tripped the `dimension\|naturalWidth\|width` grep the plan uses to prove no pixel guard was absorbed. Reworded to "pixel-size". No guard exists either way.

No Rule 1/2/3 auto-fixes were needed: nothing was found broken, nothing was missing, nothing blocked. No architectural question arose, so no Rule 4 checkpoint.

## Known Stubs

None. Both changes are complete behaviour, not placeholders.

## Notes for Later Plans

- **The client now owns the framing, and the server will not rescue a bad one.** A later plan's cropper must send exactly a 400x400 square (D-172: JPEG, transparency flattened onto white). If it sends a non-square, `c_fill` + `center` will crop the middle out of it silently — geometrically correct, but not what the user positioned.
- **Do not assert byte equality anywhere on this path.** An upload `transformation` is an *incoming* transformation: Cloudinary decodes and re-encodes, so the stored asset is not the blob the client produced (RESEARCH §C12). "Identity" is a claim about geometry only. The test file carries this in a comment so the next reader does not write that test.
- **To assert Cloudinary upload options, use the spy, not `mockCloudinary`.** `mockCloudinary.uploads()`/`.last()` capture only the RESULT (`secure_url`/`public_id`). `beforeAll`'s `await import("cloudinary")` after `vi.resetModules()` gets the `upload_stream` vi.fn whose `.mock.calls` hold the options. Note that `resetMocks()` (afterEach) does not clear vi.fn call history, so read `calls.at(-1)` and bracket it with a `calls.length` check rather than assuming index 0.
- **`src/lib/avatar.ts` now has its first `src/` consumer.** `validation/profile.ts` — which `profile-form.tsx` (a client component) imports — pulls `AVATAR_ALLOWED_TYPES` through it. `npm run build` is green with that chain, which is the practical confirmation that 16-02's directive-free choice was the right one.

## Self-Check

- `src/lib/cloudinary.ts` — FOUND, `gravity: "center"` present
- `src/app/actions/avatar.ts` — FOUND, no "face-cropped" string
- `src/lib/validation/profile.ts` — FOUND, `AVATAR_ALLOWED_TYPES` present
- `tests/profile/avatar.test.ts` — FOUND, 10 cases (6 shipped + 4 added)
- Commit `87ade7f` — FOUND in `git log`
- Commit `fde00ac` — FOUND in `git log`
- `.planning/STATE.md` / `.planning/ROADMAP.md` — NOT modified (orchestrator is the single writer)

## Self-Check: PASSED
