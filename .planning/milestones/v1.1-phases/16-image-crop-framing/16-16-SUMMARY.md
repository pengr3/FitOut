---
phase: 16-image-crop-framing
plan: 16
subsystem: testing
tags: [uat, human-verification, touch, ios-safari, android-chrome, react-easy-crop, crop-04]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "`15-UAT-EMAIL.md` — the house shape for a human_needed UAT document (header block, coverage matrix with a named BLOCKED column, empty observation cells, a dated acceptance line), and `15-VALIDATION.md`'s closing rule on conjunctive requirements"
  - phase: 16-image-crop-framing
    provides: "the shipped surface being walked — `ImageCropDialog` (16-09), the four pre-dialog guards + removal (16-12), the real-browser geometry and `touch-action` measurements (16-13), the mask/bytes fix and the zoom slider's accessible name (16-14)"
provides:
  - "`16-UAT-CROP.md` — the CROP-04 hardware walk document: six clause rows, a two-platform device axis, and every observation cell empty and waiting for a human"
  - "A named answer to 16-13's 227.1875px finding (M1) and a hardware confirmation slot for 16-14's mask/bytes fix (M2)"
  - "The environment recipe for reaching this machine's dev server from a phone, including the `BETTER_AUTH_URL` trusted-origin gotcha that would otherwise look like a broken sign-in"
affects: [16-verification, phase-16-close, 16.1-upload-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "human_needed UAT document: one row per clause of a conjunctive requirement, observation cells empty until a person fills them"
    - "an unavailable device is a named `BLOCKED — <reason>` row, never an omission"

key-files:
  created:
    - .planning/phases/16-image-crop-framing/16-UAT-CROP.md
  modified: []

key-decisions:
  - "The walk table carries exactly six rows — one per CROP-04 clause — because the requirement is conjunctive and Phase 15 recorded what a partial map costs"
  - "The 227.1875px stage measurement (16-13) is folded in as its own observation (M1), not as a seventh clause: it is a question the phase raised, not a clause of CROP-04, so it does not gate the tick"
  - "16-14's mask-vs-bytes fix gets a hardware confirmation slot (M2) rather than being assumed closed by the Chromium assertion"
  - "The `BETTER_AUTH_URL` / `trustedOrigins` mismatch is documented as environment setup with an explicit 'do not record this as a defect' instruction"

patterns-established:
  - "Measurements the walk can settle are numbered M1..M3, separately from the six clauses, so nothing that does not gate the requirement can be mistaken for something that does"
  - "A 'known and filed — do not re-raise' block (D3, D5, D7) so a walker's true observations are not spent re-discovering deferred items"

requirements-completed: [CROP-04]  # discharged 2026-08-26 by the PM's walk on BOTH required platforms

# Metrics
duration: 12min
completed: 2026-08-25
---

# Phase 16 Plan 16: The CROP-04 Hardware Walk Summary

**Task 1 of 2 done: `16-UAT-CROP.md` is authored in the Phase-15 house shape — six clause rows, an
{iOS Safari, Android Chrome} device axis, and every observation cell empty. Task 2, the PM hardware
walk that is CROP-04's only discharge, is awaiting the PM and CROP-04 remains `Pending`.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-25T16:43:00Z
- **Completed:** 2026-08-25T16:55:09Z
- **Tasks:** 2 of 2 complete. Task 2 was walked by the PM on 2026-08-26 on iOS Safari AND Android Chrome; see 16-UAT-CROP.md for what the tick does and does not claim.
- **Files modified:** 1 created, 0 modified

## Accomplishments

- **`16-UAT-CROP.md` exists and nothing in it is claimed on the PM's behalf.** 271 lines. Header block
  naming the operator, the requirement and the six decisions in force (D-167, D-173, D-174, D-175,
  Δ4/Delta-4, D-177); an environment section; a device inventory; the six-row walk table; a block on what
  the automated suite showed and why it discharges nothing; three measurement sections; an expected-not-
  defects block; screenshots, defects and a dated acceptance line. **Every observation cell is empty.**
- **One row per clause, verified mechanically.** `grep -c '^| [1-6] '` returns exactly `6`, and no other
  table in the file uses a bare-numeral first cell, so the clause count cannot drift by accident. This is
  the correction Phase 15 recorded at its own close: AUTHUI-03's map covered three of five conjunctive
  clauses, so "all green" was true and meaningless at once. That sentence is quoted in the document above
  the table, and the document says plainly that **this table is CROP-04's map**.
- **Both required platforms are columns, and the BLOCKED convention is stated even though nothing is
  currently blocked.** The device inventory carries an `iOS Safari` row, an `Android Chrome` row and an
  optional third slot for a short phone, each with a `Status` cell that is either `walked` or
  `BLOCKED — <the specific reason>`. The file repeats 15's words for why: *an inventory somebody can work
  from, never a gap dressed as coverage.* The reason a second platform is mandatory is stated as a
  mechanical fact, not a preference — `react-easy-crop` registers a dedicated Safari
  `gesturestart`/`gesturechange`/`gestureend` path in `componentDidMount`, separate from the two-finger
  `touchmove` path Android Chrome runs, so one device leaves the other branch unexecuted by anything.
- **The phase's two real measurements are folded in as things to look at, not as claims.**
  **M1:** 16-13 measured the 320x568 crop stage at **227.1875px**, against the `183` printed in
  `16-UI-SPEC` Δ2 and repeated downstream — 183 was Δ2's own chrome-budget figure, not what
  `min(320px, 100vw - 2rem, 40dvh)` produces. The stage on a short phone is **44px taller than the budget
  assumed**, and Δ2's stated reason for existing was that without the cap the confirm falls below the
  fold. So the walk carries a question it did not have before, with its own empty cells: *is `Save photo`
  still above the fold on a short phone?* The named reversal (one value in one class) is cited beside it.
  **M2:** 16-14 found and fixed a shipped bug where the stage sized itself from a bounding rect captured
  mid `zoom-in-95` — the mask rendered at 182.4px over media laid out at 192px, so every saved avatar
  carried a ~5% ring the person never saw inside the circle (commit `7dca510`). M2 asks the operator to
  confirm on real hardware that **what the circle shows is what gets saved**, rather than treating the
  Chromium assertion as the end of it.
- **The environment section answers the question a walker would otherwise hit first.** Not just
  `npm run db:up` + `npm run dev` and the seeded `host@fitout.test` login, but the LAN specifics: the
  `Network:` URL (and `-H 0.0.0.0` if it is absent), the Windows Defender inbound rule, and the one that
  silently breaks the walk — **`src/lib/auth.ts:52-63` passes `BETTER_AUTH_URL` as the only entry in
  `trustedOrigins`**, so a phone loading `http://<LAN-IP>:3000` has its sign-in POST refused as an
  untrusted origin. Documented with an explicit *"this is environment setup, not a product defect — do not
  record it as one."* The same treatment is given to a Cloudinary credentials failure on `Save photo`.
- **A "known and filed" block protects the walk's signal.** D3 (the soft-source note firing at exactly
  400px, where nothing is soft), D5 (the stage's focus indicator comes from the UA outline because the
  vendor's unlayered `box-shadow` beats Tailwind's layered `ring-*`), and D7 (the locked zoom thumb
  exposes no `aria-disabled`) are named as already-filed, so an operator's observations are spent on new
  information. D7 additionally gets an optional **M3** section: if a VoiceOver or TalkBack pass is run
  over a disabled zoom row, record what was **heard**; if not, the cells stay empty.
- **Two recorded trades are pre-labelled expected rather than defects** — D-177's white letterbox bars on
  a panorama, and Δ3's inert close `×` during a save — each with its named reversal if the PM judges
  otherwise.

## Task Commits

1. **Task 1: Author `16-UAT-CROP.md`** — `6676fcf` (docs)
2. **Task 2: The PM hardware walk** — **RUN 2026-08-26, both required platforms.** No defects filed (one candidate raised and withdrawn on disambiguation). Three sub-observations recorded as unanswered rather than passed — clause 6's focus half is not observable on touch hardware without a keyboard, clause 4's header/footer half, and M1.

## Files Created/Modified

- `.planning/phases/16-image-crop-framing/16-UAT-CROP.md` — the CROP-04 walk log. Header, environment and
  fixture list, device inventory with the BLOCKED convention, the six-row clause table with empty
  observation cells per platform, the "what the automated suite cannot answer" block, M1/M2/M3, the
  expected-not-defects and already-filed blocks, screenshots, defects, and an undated acceptance line.

No product source was touched. No image file was added — `git show --stat HEAD` is one markdown file,
271 insertions, zero deletions.

## Verification

| Check | Result |
|---|---|
| `test -f .../16-UAT-CROP.md` | pass |
| line count (`min_lines: 60`) | **271** |
| `grep -c "CROP-04"` | 11 |
| `grep -c "iOS Safari"` / `"Android Chrome"` | 9 / 10 |
| `grep -c "^| [1-6] "` — the six clause rows | **6**, exactly |
| `grep -c "D-17[3457]"` (>= 4 required) | 11 |
| `Delta-4` and `D-177` both present | 2 / 3 |
| `grep -c "BLOCKED"` (>= 1 required) | 3 |
| the automated-suite block names >= 3 things it cannot answer | 4 — the Safari gesture path, a finger on the stage, iOS momentum/rubber-banding, the OS file picker |
| every observation cell empty | yes — walk table, device inventory, M1/M2/M3, screenshots, defects and both acceptance rows are all blank |
| `git status --porcelain` shows no image files added | confirmed |

## Decisions Made

- **The six clauses are the table; the measurements are not.** M1 (the 227.1875px stage / above-the-fold
  question) and M2 (the mask-vs-bytes confirmation) are real questions this walk is the only pass that can
  answer, but neither is a clause of CROP-04's text. Folding them into the clause table would have made a
  seven-row map for a six-clause requirement and put the tick behind a question the requirement never
  asked. They are numbered separately and the document says they do not gate the tick.
- **The `BLOCKED` convention is stated even though nothing is blocked yet.** The plan's acceptance asked
  for exactly this, and it is the difference between an operator writing `BLOCKED — no iPhone on hand` and
  an operator quietly deleting a column.
- **CROP-04's status was not touched.** `.planning/REQUIREMENTS.md` still reads `CROP-04 | Phase 16 |
  Pending`, and the document's own closing line says so, so a later reader cannot mistake an authored walk
  for a walked one.

## Deviations from Plan

None — plan executed exactly as written for Task 1. Task 2 was not attempted, by design.

**Total deviations:** 0
**Impact on plan:** none.

## Issues Encountered

None. One thing worth recording rather than an issue: the plan's own prose (and `<what-built>`) repeats
the stale `183px` stage figure that 16-13 measured false at **227.1875px**. The document was written to
the measured number, and the discrepancy is explained in M1 rather than silently corrected or silently
copied.

## CROP-04 — what is still owed, stated plainly

**Task 2 is a blocking human checkpoint and it is the requirement's only discharge.** D-175 forbids
CROP-04 being claimed from any Playwright run, and **CROP-04 has not been claimed from one here** — this
plan produced a document and nothing else. The four things no suite can reach are named in the file:
Safari's `gesturestart`/`gesturechange` branch (a different code path from Android's, fired by no
emulator), a real fingertip occluding the stage, iOS momentum and rubber-banding during a vertical drag,
and the OS file picker where D-174's re-pick actually lives.

The walk needs: a phone on this machine's LAN, `BETTER_AUTH_URL` pointed at the LAN URL, the seeded host
login, `panorama-4000x500.jpg` and `square-400.png` side-loaded onto the device, and roughly twenty
minutes per platform. **CROP-04 stays `Pending` until every one of the six clause rows is filled on both
required platforms, or the PM explicitly accepts a named gap at phase close.**

## User Setup Required

None for Task 1. Task 2 requires the PM, two physical devices and the environment recipe in
`16-UAT-CROP.md` § Environment.

## Next Phase Readiness

- **Blocked on the PM, not on code.** Nothing in the phase's remaining work depends on this document
  being *filled* — only CROP-04's tick does.
- Phase 16's other open item is **CROP-02**'s GATE-RESP clause, filed as **D10**: the cover preview has no
  320px row and `/host/listings/[id]/edit` cannot reach it. That is independent of this walk.
- Plan **16-15** is parked at its own operator checkpoint (Task 3, a CI baselines dispatch that cannot run
  on win32).

## Self-Check: PASSED

| Claim | Verified |
|---|---|
| `.planning/phases/16-image-crop-framing/16-UAT-CROP.md` exists | FOUND |
| `.planning/phases/16-image-crop-framing/16-16-SUMMARY.md` exists | FOUND |
| commit `6676fcf` exists in `git log --all` | FOUND |
| `git diff --name-only HEAD~1 HEAD` is the one markdown file | confirmed — no images, no product source |
| `REQUIREMENTS.md:234` still reads `CROP-04 \| Phase 16 \| Pending` | confirmed, untouched |
| `.planning/STATE.md` / `.planning/ROADMAP.md` unmodified by this plan | confirmed — neither appears in this plan's diff |

---
*Phase: 16-image-crop-framing*
*Plan: 16 — Task 1 of 2 complete; Task 2 awaiting the PM*
*Completed (Task 1): 2026-08-25*
