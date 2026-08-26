---
phase: 16-image-crop-framing
verified: 2026-08-26T14:45:00Z
re_verification: false
status: passed
score: 4/4 requirements verified (CROP-01, CROP-02, CROP-03, CROP-04)
head: 24332b8
overrides_applied: 0
gaps: []
gates_rerun_by_this_verifier:
  tsc: "exit 0 · 0 errors"
  vitest: "exit 0 · 185 files passed | 2 skipped (187) · 2121 passed | 5 skipped (2126) · 0 unhandled errors"
  test_design: "exit 0 · 59 files passed (59) · 1140 passed | 3 skipped (1143) · 0 unhandled errors · 45.74s"
  build: "exit 0 (lint + test:design + next build)"
  e2e_avatar_crop: "exit 0 · 33 passed (1.8m)"
  e2e_overflow_320: "exit 0 · 64 passed | 15 skipped"
  e2e_full_chromium: "242 passed | 10 failed | 16 skipped | 13 did not run (12.1m) — ZERO failures in Phase 16 files; see W-1"
  gate_vrt: "NOT RUNNABLE on win32 (linux-only project) — CI-discharged at bfb58cd, see W-2"
measurements_settled_by_this_pass:
  - "M1 ANSWERED: `Save photo` clears the fold at every viewport 16-UI-SPEC Δ2 names. 320x568 → confirm bottom 553.41 of 568 (14.59px of margin); 360x640 → 573.02 of 640; 390x844 → 776 of 844. The 44px stage discrepancy does NOT push the confirm below the fold, and Δ2's Reversals row 14 (`40dvh` → `35dvh`) is not needed."
deferred:
  - truth: "D2..D9 in deferred-items.md remain open"
    addressed_in: "Filed during the phase, none of them CROP-01..04 clauses"
    evidence: "D10 closed by 6123766. D1 is closed IN CODE but its row still reads open — see F-1."
human_verification: []
---

# Phase 16: Image Crop & Framing — Verification Report

**Phase Goal:** A user controls how their image is framed before it is committed, and the server stops re-framing what they just chose.
**Verified:** 2026-08-26 · at `24332b8` · **Status: passed — 4/4 requirements, no gaps**

> **What "passed" claims.** Every automatable truth in this phase was re-run in this session at HEAD
> and is green. All three manual-only verifications that `16-VALIDATION.md` declared are discharged
> with evidence on disk. The one open measurement the hardware walk could not answer (M1) was
> **measured by this pass and resolves in the product's favour**, so the human-verification section
> is empty. Two warnings below (W-1, W-2) are about the tree and the CI boundary, not about this
> phase's deliverables.

---

## 1. What this pass did NOT take on trust

Every decisive number was re-measured here. The SUMMARY and review-fix transcripts were treated as
claims, not evidence.

| Claim on disk | Reproduced here | Result |
| --- | --- | --- |
| `16-REVIEW-FIXES.md`: `tsc: "exit 0"` | `npx tsc --noEmit` | **exit 0, 0 errors** |
| `16-REVIEW-FIXES.md`: `vitest: 2121 passed / 5 skipped` | `npm run test` | **185 files / 2121 passed / 5 skipped, exit 0** — matches exactly |
| `16-REVIEW-FIXES.md`: `test_design: 59 files · 1138 passed` | `npm run test:design` | **59 files / 1140 passed / 3 skipped, exit 0** — two MORE than recorded, which is `6123766`'s D10 rows |
| `16-REVIEW-FIXES.md`: `build: exit 0` | `npm run build` | **exit 0** |
| `16-REVIEW-FIXES.md`: `e2e_avatar_crop: 33 passed` | `npx playwright test --project=chromium e2e/avatar-crop.spec.ts` | **33 passed (1.8m)** — matches exactly |
| `6123766`: `overflow-320 64 passed (was 62)` | `npx playwright test --project=chromium e2e/overflow-320.spec.ts` | **64 passed / 15 skipped**, incl. both `crop dialog open` rows and both `photos step` rows |
| `16-05-SUMMARY.md`: Cloudinary `folder_mode: "dynamic"` | Read back from the SUMMARY's recorded HTTP 200 body | Recorded verbatim, not a guess — accepted |

### ⚠ A false red this pass produced, and disproved

The design suite was **first** run concurrently with `npm test`. It returned `53 files / 1062 passed`
with **6 unhandled `Failed to start forks worker` errors** — and still `exit 0`, i.e. six files
silently never ran behind a green exit code. That is the collision `tests/global-setup.ts` causes
(both configs TRUNCATE `public` in `fitout_test`). Re-run **alone** it is `59 files / 1140 passed`,
**zero errors**, and 45.74s against the contaminated run's 172.80s. The 6 errors were entirely an
artefact of how they were invoked. Recorded because the failure mode is convincing: a green exit
code over six unrun files is exactly the shape of a gate that proves less than it claims.

---

## 2. Goal-backward: the four success criteria

### SC-1 — "pan and zoom **before** anything uploads, and what they framed is what is stored; the server's blind `gravity: "face"` re-crop no longer re-frames their choice" ✅

- **The framing surface exists and is pre-upload.** `src/components/profile/image-crop-dialog.tsx`
  (`react-easy-crop`, one zoom slider) is mounted by `avatar-field.tsx` behind a four-step guard
  chain, and the bytes are produced client-side by `src/lib/avatar-canvas.ts` — `drawImage` from the
  **same** `croppedAreaPixels` the stage reported, then `toBlob`.
- **The server can no longer re-frame.** `src/lib/cloudinary.ts:67` is `gravity: "center"` (it was
  `g_face` until D-171), and its header carries the rule in block capitals. The transform is
  `width/height = AVATAR_OUTPUT_PX, crop: "fill"` applied to an **already-square 400x400** client
  output — arithmetically an identity operation, so it bounds the stored size and cannot select a
  region. This is the structural half of the criterion, and it is stronger than a test.
- **The round trip is measured, not assumed.** `e2e/avatar-crop.spec.ts` carries IC-02 (*"what the
  person saw is what leaves the browser"* — the saved square samples the same as the preview),
  IC-06 on a rotated source, the EXIF byte-honesty proofs, and the D-172/D-177 transparency and
  animated-source cases. 33/33 green here, and 33/33 again inside the full project run.
- **The closure is a measurement, not a formality.** CROP-01 was held open through seven plans on the
  standing ground that jsdom has no crop stage, and 16-14's own assertion then **caught a real
  shipped bug**: the stage sized itself from a rect taken mid `zoom-in-95`, so the mask rendered at
  182.4px over media laid out at 192px — the saved avatar carried a ~5% ring that was never inside
  the circle, on every open, at every viewport (fixed in `7dca510`). Ticking CROP-01 before that
  would have claimed a round trip while the preview and the bytes were still two different rectangles.

### SC-2 — "A user can remove their avatar" ✅

`removeAvatarAction` (`src/app/actions/avatar.ts:140`) nulls **both** columns first through Drizzle,
scoped to `session.user.id`, then destroys the Cloudinary asset best-effort (D-169). The affordance
and its `ResponsiveDialog` confirm ship in `avatar-field.tsx`, with open-time focus pinned to
`Keep photo` (D-168's binding mitigation — the pattern's default would have focused the destructive
button). Covered by `tests/profile/avatar-remove.test.ts` and three e2e a11y cases, including CR-03
(*a SUCCESSFUL removal returns focus to a real control, not `<body>`*).

### SC-3 — "a non-destructive preview of what the 16:9 hero and the 4:3 cards each cut off — nothing baked into the stored asset and no delivery-code change" ✅

- **Non-destructive by construction.** `src/components/listing/cover-frame-preview.tsx` is a server
  component whose two frames are **imported class strings** (`MOSAIC_ASPECT`, `RESULT_CARD_MEDIA`) —
  not parsed into numbers, not handed to the Radix aspect primitive. It therefore *structurally
  cannot* disagree with the surfaces it previews, and declares no ratio of its own to disagree with.
  `src/lib/listing/cover-frames.ts` is copy literals only.
- **Nothing baked.** `src/app/actions/listing-photo.ts` carries no `crop`, no `transformation`, no
  gravity — grep returns nothing. The stored asset is untouched.
- **No delivery-code change — verified over the whole phase diff, not asserted.** Phase 16 touched
  **19 files under `src/`**, and none of them is a delivery or render site: `photo-gallery.tsx`,
  `patterns/result-card.tsx` and the listing detail page are all absent from the list.
- **GATE-RESP is now a measurement.** This was CROP-02's whole outstanding debt. `6123766` added the
  320px row that reaches the wizard's **photos step** (via the publish checklist's `Fix` link — the
  only seam, since `wizard.tsx` holds the step in client state with no query parameter). Both themes
  ran green here.

### SC-4 — "Cropping works on a real touch device — drag, pinch and the slider, verified on hardware — and cancelling then re-picking **the same file** re-opens the cropper" ✅

- **Discharged the only way D-175 permits.** The PM walked **both** required platforms on 2026-08-26:
  *"did the walk step 1-6 was smooth and end goal was acheved"* (iOS Safari) and *"I walked on
  android now, it works fine the same with ios safari"* (Android Chrome). Two platforms is the
  minimum because `react-easy-crop` registers a **dedicated Safari `gesturestart`/`gesturechange`
  path** that is a genuinely different branch from Android's two-finger `touchmove`.
- **D-174's same-file re-pick** is `avatar-field.tsx:304` — `e.target.value = ""`, because a browser
  fires no `change` event when the file picked is byte-identical.
- **This verifier did not, and cannot, add to that discharge.** No Playwright run is an input to
  CROP-04; the spec's own header says so.

---

## 3. Requirements traceability

| Requirement | Status | Closed by | Verified here |
| --- | --- | --- | --- |
| **CROP-01** | Complete | plan 16-14 (`requirements-completed: [CROP-01]`) | e2e 33/33, IC-02/IC-06 round trip, `gravity: "center"` read at source |
| **CROP-02** | Complete | D10 follow-up `6123766` + `b401be3` | 320px photos-step row green in both themes; delivery diff empty |
| **CROP-03** | Complete | plan 16-12 (`requirements-completed: [CROP-03]`) | unit + 3 e2e a11y cases green |
| **CROP-04** | Complete | plan 16-16 (`requirements-completed: [CROP-04]`) | PM hardware walk, both platforms, `16-UAT-CROP.md` |

**F-2 · A traceability hole, benign but worth naming.** No plan SUMMARY carries
`requirements-completed: [CROP-02]`. 16-06 shipped its substance and 16-15 filed the GATE-RESP debt
as D10; the closure then landed in a follow-up commit that has no SUMMARY of its own. The
requirement **is** met and is now measured — this is a bookkeeping gap in the plan→requirement
chain, not a coverage gap.

### Decision coverage

All fifteen of the phase's own decisions — **D-164 … D-178** — are cited in plan frontmatter
`must_haves`. (`D-127`/`D-129`/`D-130` appear in CONTEXT as inherited references, not phase
decisions.) Checked by hand rather than through `check.decision-coverage-plan`, which is known to
report "no trackable decisions" against this CONTEXT's heading-grouped `<decisions>` shape.

### Manual-only verifications declared in `16-VALIDATION.md` — all three discharged

| Declared | Status |
| --- | --- |
| CROP-04 operator walk on `{iOS Safari, Android Chrome}` | **Done** 2026-08-26, both platforms, recorded per clause |
| GATE-VRT court-only baselines via CI dispatch | **Done** — dispatch run `32925834322` added **zero** files exactly as predicted; comparison `ci` run `32924501782` on `bfb58cd`, `gate-visual` **success** |
| Cloudinary `folder_mode` before pinning the D-165 prefix | **Done** — `GET /v1_1/da8uglpk6/config?settings=true` → HTTP 200, `{"settings":{"folder_mode":"dynamic"}}`; §C9 raised MEDIUM-HIGH → HIGH |

---

## 4. M1 — settled by this pass

`16-UAT-CROP.md` records M1 as *"the one question this walk was uniquely placed to answer and did
not"*: the crop stage measures **227.1875px** at 320x568 against the `183` printed through the phase
text, and Δ2's stated reason for capping the stage was that *"without the cap the confirm falls
below the fold on common phones."* The walk completed and photos were saved, but whether that
required scrolling was never asked.

**It is geometry, not feel, so it is machine-measurable.** Measured at HEAD with the dialog open on
`square-400.png`, after animations settled:

| Viewport | Stage | `Save photo` bottom | Fold | Verdict | Sheet overflow |
| --- | --- | --- | --- | --- | --- |
| 320 x 568 | 227.19px | **553.41px** | 568 | **above the fold, 14.59px to spare** | 53px |
| 360 x 640 | 256px | **573.02px** | 640 | above the fold | 1px |
| 390 x 844 | 320px | **776px** | 844 | above the fold | none — sheet does not scroll |

**M1 resolves in the product's favour.** The 44px discrepancy is real, but it does **not** push the
confirm below the fold at any viewport Δ2 names, and `16-UI-SPEC` § Reversals row 14 (`40dvh` →
`35dvh`) is **not** needed. The 53px of sheet overflow at 320x568 is content *below* the confirm, not
the confirm itself.

**What this measurement is and is not.** It is desktop Chromium at an emulated viewport, so it
settles the layout arithmetic, not a hardware observation. It is nonetheless strong for this
question: the stage is sized in `dvh`, so when real browser chrome reduces the usable height the
stage shrinks with it and the margin is broadly preserved — the failure mode Δ2 feared is one where
a *fixed* stage crowds out a *shrinking* viewport, and the shipped stage is not fixed.

The walk's other two unanswered sub-observations stay unanswered and stay non-blocking: clause 6's
**focus** half (iOS paints no focus ring without a keyboard, so no person can observe it) and clause
4's header/footer half. Neither is a CROP-04 clause.

---

## 5. Findings

**F-1 · `deferred-items.md`'s D1 row is stale — D1 is closed in code.** D1 says the zoom slider ships
with no accessible name. It no longer does: `src/components/ui/slider.tsx:53-63,83` forwards the
caller's `aria-label` to `SliderPrimitive.Thumb` when there is exactly one thumb (and drops it from
the Root, which has no role), and `tests/profile/avatar-field.test.tsx:413` asserts
`getByRole("slider", { name: AVATAR_ZOOM_LABEL })` — green in the 2121-test run. The document should
be updated to match the tree; nothing in the code needs to change.

**F-2 · CROP-02 has no claiming plan SUMMARY** — see §3 above.

**D7 confirmed still genuinely open.** The two `aria-disabled` occurrences in
`image-crop-dialog.tsx:462,472` are on the save and cancel buttons, not the slider thumb. D2, D3, D4,
D5, D6, D8 and D9 also remain open as filed. None of them is a clause of CROP-01..04.

---

## 6. Warnings

**W-1 · The full `chromium` project is not green, and D6 stands at HEAD.** `242 passed · 10 failed ·
16 skipped · 13 did not run` in 12.1m. **Zero of the ten are Phase 16's** — `avatar-crop.spec.ts` is
33/33 and `overflow-320.spec.ts` is 64/64 *inside this same run*. All three of D6's named reproducible
failures reproduce unchanged:

| Spec | D6's classification |
| --- | --- |
| `public-listing.spec.ts:385` — *a draft listing 404s to the public* | reproducible — **D6 flags this one as reading like a real product regression, not a fixture race** |
| `cancel.spec.ts:224` — *re-opening the review screen … never re-refunds* | reproducible |
| `confirmation-decay.spec.ts:151` — *the moment is a full screen …* | reproducible |
| `hold-countdown.spec.ts:292`, `price-one-fact.spec.ts:313`, `reduced-motion.spec.ts:368`, `shell.spec.ts:291/1221/1302`, `stale-session-selfheal.spec.ts:90` | D2/D8 parallel-contention family (D6 measured 8 failures; this run measured 10 — the extra two are `shell.spec.ts` rows) |

D6's own verdict holds and is re-confirmed: `git diff --name-only` over the phase shows Phase 16
touched none of these surfaces, and each reproducible failure reproduces with `avatar-crop.spec.ts`
not collected at all. **This is a Phase-12/13 debt and a Phase-17 test-infrastructure item — it does
not gate Phase 16, but the phase gate must not be read off a bare full-project run until it is
triaged.**

**W-2 · CI has never run on HEAD.** `dev` is **4 commits ahead of `origin/dev`** (`bfb58cd`). One of
them, `6123766`, is a `feat` that changed `src/components/host/publish-checklist.tsx`. Checked before
raising: **no `/host/*` surface appears among the 36 committed VRT baselines**, so `gate-visual`
cannot go stale from that change — but the sentence *"gate-visual is green"* is true of `bfb58cd`,
not of `24332b8`. Push `dev` and let `ci` run before treating the CI half as covering this tree.

**W-3 · This verification pass orphaned 2 Cloudinary assets.** Per D4, `avatar-crop.spec.ts`'s Δ3
pending-save case performs one **real** upload per execution to
`fitout/avatars/<throwaway signup id>`, and this pass ran that spec twice (standalone, then inside
the full project). Two orphans, by design of the test, disclosed rather than left to be found.

**W-4 · Never invoke `npm test` and `npm run test:design` concurrently** — §1 above shows what it
produces: a green exit code over six files that never ran.

---

## 7. Verdict

**Phase 16's goal is achieved.** A user frames their avatar before anything uploads, the framing they
chose is the framing that is stored, the server can no longer re-frame it, they can remove it, a host
sees both cover cuts without a byte being altered, and the whole thing was driven by a human on real
iOS and real Android hardware. Four of four requirements are verified; there are no gaps and no
outstanding human checkpoints.

**Before the phase is treated as closed in tracking:** push `dev` so CI covers this tree (W-2). The
full-project e2e reds (W-1) are pre-existing cross-phase debt and are the right input to Phase 17,
not a blocker here.
