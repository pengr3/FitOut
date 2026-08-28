---
quick_id: 260828-q1x
slug: add-missing-transformation-source-prohib
status: complete
completed: 2026-08-28
threats_cited: [T-16.1-01]
closes: W-1 (16.1-SECURITY.md)
commits:
  - aebf21c (test — the `/transformation/i` prohibition 16.1-04 declared and never wrote)
  - d07bbf5 (test — MUTATION 3 transcribed, the observed RED, src reverted)
key_files:
  modified:
    - tests/design/photo-uploader-options.test.ts
  uncommitted_for_orchestrator:
    - .planning/phases/16.1-upload-hardening-storage-economy/16.1-SECURITY.md
---

# Quick 260828-q1x — write the `transformation` prohibition · SUMMARY

## What shipped

**One assertion, in one existing test file, watched RED once.** `16.1-04-PLAN.md:313` declared, as
T-16.1-01's second-layer defence, that "the source assertion prohibits the literal
[`transformation`]". No such assertion was ever written — it appeared in no task action and no
acceptance criterion, which is why that plan's `Deviations: None` was literally true. The 16.1
security audit found the hole and filed it as **W-1**. It now exists.

`tests/design/photo-uploader-options.test.ts` gained one `it()` in the prohibitions describe, placed
after the `sources` prohibition (same threat family — a widget option that hands the boundary back
to the caller) and before the photo-cap one. It does two things, in order:

1. **Anchors**, on `optionsRegion(CODE)` still containing `maxFiles:`.
2. **Prohibits**, `expect(CODE, "<message>").not.toMatch(/transformation/i)` over the whole stripped
   source.

**This was never an open vulnerability and the test does not pretend otherwise.** The boundary
control for T-16.1-01 lives in `src/app/api/cloudinary/sign/route.ts` and is triple-pinned there —
`ALLOWED_SIGN_KEYS` (`:80`, four entries, `transformation` deliberately excluded with the reasoning
at `:70-79`), the 400-before-the-signer gate (`:159-162`), and the value-smuggling checks
(`:217-238`). What was missing was the client-side regression pin, and the failure message says so
explicitly, so a reader hitting it at 3am learns the refusal already exists at the route and that
this test's job is to surface it as a red in CI rather than as a broken uploader in production.

## The two judgement calls the plan measured, carried into the code as comments

**Whole file, not the region.** The known pitfall — a whole-file `not.toContain` going falsely RED
because the correct file names in prose what it forbids in code — is live here: the raw component
*does* contain the token, once, at **`:211`**, inside a `//` comment saying the boundary is the
transformation the *preset* carries. `stripComments` removes it completely; the stripped source has
**zero** case-insensitive matches. So unlike the photo-cap prohibition (where `delayDuration={200}`
puts `"20"` back outside any comment and narrowing is forced), no narrowing is needed here, and the
whole-file form is the strictly stronger property: it also catches a `transformation` grown on a
second widget, a helper, or a prop rather than as an options key.

**The anchor is not redundant with the existing read-guard.** That guard anchors on
`CldUploadWidget` and `export function PhotoUploader` — **both outside** the `options={{ … }}` body
(`photo-uploader.tsx:205-263`). A phantom block comment of the kind 16.1-03 actually measured (a
`/*` inside a line comment, opening a block the stripper then closes far below) could swallow the
entire options object and leave that guard green while this prohibition passed over nothing — the
falsely-GREEN half of the `verify-workflows.mjs:24-32` finding. `optionsRegion` **throws** when it
matches nothing, so requiring it to still carry a real key makes a restructured widget report
itself. No second narrowing or stripping helper was written; `optionsRegion` and `stripComments` are
reused unchanged.

## Observed RED — MUTATION 3, real output

`transformation: "c_limit,w_4096"` added inside the widget's `options`, next to `maxFiles`:

```
 ❯ tests/design/photo-uploader-options.test.ts (17 tests | 1 failed) 13ms
     × no `transformation` is passed from the client — the preset's ceiling stays the preset's 6ms
```

with the full `AssertionError` transcribed verbatim into the file header alongside MUTATIONS 1 and
2. **One red, and exactly one** — the isolation is the point, and it is why the mutation used
`w_4096` rather than `w_2048`: `String(LISTING_MAX_PHOTOS)` is `"20"`, `"2048"` contains it, and a
2048 mutation would also have reddened the unrelated photo-cap prohibition and muddied the evidence
that the *new* pin is the thing doing the work.

The header's count was corrected from "the **two ways**" / "**Both mutations**" to three, with the
dates split (MUTATIONS 1 and 2: 2026-08-26 · MUTATION 3: 2026-08-28).

## `src/` is unchanged — proven, not asserted

The mutation was transient and reverted:

```
$ git checkout -- src/components/listing/photo-uploader.tsx
$ git diff --exit-code src/components/listing/photo-uploader.tsx   # exit 0
$ git diff --exit-code src/                                        # exit 0
```

`git diff --exit-code src/` returned **exit 0** before each of the two commits, and returns exit 0
now. Neither commit touches a production file — both are `tests/design/photo-uploader-options.test.ts`
alone.

## Gates

| Gate | Result |
| --- | --- |
| `npx vitest run --config vitest.design.config.ts tests/design/photo-uploader-options.test.ts` | **17 passed (17)** — 16 before + the new one |
| the same, under MUTATION 3 | **1 failed \| 16 passed (17)** — only the new test |
| `git diff --exit-code src/` | **exit 0** |
| `npx tsc --noEmit` | **exit 0** |
| `npm run test:design` (whole suite, run alone) | **64 files · 1208 passed \| 3 skipped** |

Every run was performed alone — no concurrent vitest process, and none back-to-back with
`npm test` or `npm run build`, because `tests/global-setup.ts` TRUNCATEs the test database and a
collision produces convincing but bogus reds in untouched files.

## W-1 closed

`16.1-SECURITY.md` gained a single resolution paragraph beneath the Warnings table naming the test
file, the assertion, and the observed RED. **The audited W-1 row, the Security Audit Trail table and
the Sign-Off block are byte-identical** — the diff is `1 file changed, 2 insertions(+)`, a pure
addition. That paragraph also records one correction made honestly rather than left: W-1 cites the
prose occurrence as `:271`; it is at **`:211`**. The substance of W-1 (one occurrence, in a comment,
stripped) is unaffected.

Per the execution constraints, `16.1-SECURITY.md` is left **uncommitted** for the orchestrator's
docs commit.

## Scope held

No `eager:` or `allowed_formats:` prohibition was added, though `route.ts:70-79` names all three as
the same class of mistake. Neither was declared by 16.1-04, and both are bounded where it counts —
`ALLOWED_SIGN_KEYS` refuses to sign them and the route answers 400 before the signer is reached.
Adding undeclared prohibitions is scope this task does not own; nothing declared was dropped.
`package.json` was not touched (W-3 belongs to a separate quick task). `ROADMAP.md` was not touched.

## Deviations from plan

**None in substance.** One tooling misstep worth recording so it is not repeated: an intermediate
in-place edit script anchored on a non-unique substring (`expected '"use client";`) and clobbered
MUTATION 2's transcript along with MUTATION 3's. Caught on read-back before any commit, repaired by
`git checkout --` back to the Task 1 commit, and re-applied against a unique anchor. Nothing was
lost — Task 1 was already committed — and the cause was mechanical: `git checkout` restores this
file with CRLF under `* text=auto`, so an `\n`-based anchor silently matched nothing on the retry.
The committed result is the intended one.

## Known Stubs

None.

## Threat Flags

None. This task adds a test-only regression pin over an existing, closed threat (T-16.1-01) and
introduces no new endpoint, auth path, file access pattern, or schema change.

## Self-Check: PASSED

- `tests/design/photo-uploader-options.test.ts` — FOUND, contains the `/transformation/i`
  prohibition and the MUTATION 3 transcript
- `.planning/phases/16.1-upload-hardening-storage-economy/16.1-SECURITY.md` — FOUND, carries the W-1
  resolution paragraph (uncommitted, by instruction)
- commit `aebf21c` — FOUND
- commit `d07bbf5` — FOUND
- `git diff --exit-code src/` — exit 0
