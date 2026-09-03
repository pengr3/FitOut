---
phase: 16-image-crop-framing
plan: 03
subsystem: ui
tags: [radix, dialog, focus-management, accessibility, design-gate, jsdom, vitest]

# Dependency graph
requires:
  - phase: 11-responsive-and-mobile
    provides: "`src/components/patterns/responsive-dialog.tsx` — THE overlay primitive, and the recorded refusal of `sheet`/`vaul` that D-167 and D-168 both reason from"
  - phase: 12-listing-detail-and-booking
    provides: "the `onCloseAutoFocus` prop and its docblock — the structural twin this addition follows verbatim"
provides:
  - "`onOpenAutoFocus?: (event: Event) => void` on `ResponsiveDialogProps`, forwarded verbatim to `DialogContent`, default `undefined`"
  - "the mechanism D-168's binding mitigation needs — 'default focus lands on the safe action, never on Remove photo' is now implementable under `ResponsiveDialog`"
  - "`tests/design/responsive-dialog-autofocus.test.tsx` — a standing, build-blocking guard that the default is inert AND that the handler moves focus"
  - "a MEASURED fact for downstream plans: with no handler, Radix focuses `Remove photo` (the destructive action) in Δ5b's own footer order"
affects: [16-09 ImageCropDialog, 16-12 avatar removal confirm, any future overlay with a destructive footer action]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "additive-prop-on-a-shared-pattern: forward verbatim, default `undefined`, and prove inertness with a RENDERING assertion rather than a diff"
    - "adopter census: a standing spec reads the adopter files from disk each run, with a liveness guard that the censused token still exists in the pattern"

key-files:
  created:
    - tests/design/responsive-dialog-autofocus.test.tsx
  modified:
    - src/components/patterns/responsive-dialog.tsx

key-decisions:
  - "The prop's docblock deliberately does NOT name the prop, so `grep -c onOpenAutoFocus` on the pattern returns exactly 3 (type, destructure, forward) as the plan's acceptance criterion requires — the twin `onCloseAutoFocus` returns 4 because its prose quotes itself."
  - "`dismissLocked` was NOT added (RESEARCH §D13). Δ3's single `onOpenChange` guard is the contract and the briefly-inert `×` is an accepted, recorded trade; it stays a named reversal in 16-UI-SPEC Open Question 16."
  - "`SHEET_PRESENTATION` was not touched and no `[NNvh]` string was written anywhere in the pattern — AC#28 scans that file's SOURCE with `/\\[\\d+vh\\]/`."
  - "The spec uses the removal confirm's real copy (`Remove your photo?` / `Remove photo` / `Keep photo`) and Δ5b's real DOM order (destructive FIRST), so half two is the mitigation itself and not a shape resembling it."
  - "No `ResizeObserver` stub and no `getBoundingClientRect` stub — measured unnecessary; `tests/host/request-refusal.test.tsx` already drives this overlay under jsdom with neither."

patterns-established:
  - "Prove an additive prop is additive in BOTH directions: a `git diff --exit-code` over adopters is true once at commit time and is blind to a changed DEFAULT, because no adopter mentions the prop. A rendering assertion pinning the no-handler focus target is the only thing that closes that gap."
  - "Assert focus by ACCESSIBLE NAME with `toBe`, resolved through `@testing-library`'s `{ name }` option (never by importing `dom-accessibility-api`), so failures read as `expected 'Remove photo' to be 'Keep photo'` rather than as an element identity mismatch."
  - "A third case asserting the two halves DISAGREE is what makes the prop load-bearing rather than decorative — a single-direction spec cannot tell 'the handler works' from 'focus lands there anyway'."

requirements-completed: []
requirements-advanced: [CROP-03]

# Metrics
duration: 22min
completed: 2026-08-25
---

# Phase 16 Plan 03: `onOpenAutoFocus` on `responsive-dialog` Summary

**D-168 traded `alert-dialog` away and left "focus lands on `Keep photo`" as a binding mitigation with no mechanism behind it; this plan builds the mechanism — one additive prop, forwarded verbatim — and proves in the same commit that it changed nothing for the six existing call sites.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-25T15:26Z
- **Completed:** 2026-08-25T15:48Z
- **Tasks:** 2 of 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments

- **`onOpenAutoFocus?: (event: Event) => void` exists on `ResponsiveDialogProps`**, positioned immediately above the `onCloseAutoFocus` it twins, forwarded verbatim to `DialogContent` with no wrapper, no default value, no `?? undefined` and no conditional spread. Its docblock states the structural argument — Radix autofocuses the first tabbable element, `DialogFooter` is `flex-col-reverse … sm:flex-row`, so DOM order and visual order are inverted below `sm:` and **no DOM order satisfies both the stacking order and "focus never lands on the destructive action"** — and names D-168 as the decision that made it binding.
- **The five adopter files are byte-unchanged**, verified by `git diff --exit-code` at commit time and by a standing census that re-reads them from disk on every run.
- **The measured default is recorded, not predicted.** With no handler, Radix focuses **`Remove photo`** — the *destructive* action — in Δ5b's own footer order. That is Δ5b's complaint reproduced as an executable assertion instead of an argument in a document.
- **`dismissLocked` was not added and `SHEET_PRESENTATION` was not touched**, so `tests/design/sheet-absent.test.ts`'s three-name deny-list and AC#28's `vh` scan are both untouched and both still green.

## Task Commits

1. **Task 1: Add `onOpenAutoFocus` to `ResponsiveDialogProps` and forward it verbatim** — `db600cd` (feat)
2. **Task 2: `tests/design/responsive-dialog-autofocus.test.tsx` — both halves of the guard** — `58c7204` (test)

## Files Created/Modified

- `src/components/patterns/responsive-dialog.tsx` — +22 lines: the docblock, the prop, the destructure entry, and the `DialogContent` attribute. Nothing else in the file moved.
- `tests/design/responsive-dialog-autofocus.test.tsx` — 253 lines, 9 assertions across two `describe` blocks. Runs in the design config (no Docker, no Postgres), so it is inside `npm run build`'s `lint && test:design && next build` chain.

## The measurement the plan asked for

> *"Record in the SUMMARY the accessible name Radix focuses by default with no handler, as measured — not as predicted."*

**`Remove photo`.**

Measured by watched red rather than by reading Radix's source. Half one was flipped to expect the safe name and run:

```
FAIL  tests/design/responsive-dialog-autofocus.test.tsx > … > omitting the prop leaves Radix's
      own autofocus in place — the first footer button in DOM order
AssertionError: expected 'Remove photo' to be 'Keep photo' // Object.is equality
  Expected: "Keep photo"
  Received: "Remove photo"
Test Files  1 failed (1) · Tests  1 failed | 8 passed (9)
```

The `Received` line is the reading. The flip was reverted immediately and the file byte-compared against its pre-probe copy (`IDENTICAL TO PRE-PROBE`). The red transcript is recorded in the spec's own header so the value cannot later be mistaken for a prediction.

**Why it matters downstream:** the tree under test uses Δ5b's mandated footer DOM order (`Remove photo` first, `Keep photo` second — chosen so `flex-col-reverse` puts the safe action under the thumb on mobile and `sm:flex-row` puts it on the right on desktop). In exactly that order, Radix's untouched behaviour focuses the **destructive** button. Plan 16-12's removal confirm therefore *must* pass a handler; leaving it off is not a cosmetic miss, it is the D-168 mitigation failing open.

## Why three halves and not one

The plan's own Task 1 verify runs `git diff --exit-code` over the five adopters. That check is worth having and it passed — but note precisely what it can see: it compares the adopters against **themselves**, and none of them mentions the new prop. Give the prop a default handler, wrap it, or coerce it, and every adopter file is still byte-identical while all six overlays change their focus behaviour at once. A diff is also true exactly once, at commit time.

| Half | What it asserts | What it catches that nothing else does |
|---|---|---|
| 1 — default is inert | no handler → focus is on `Remove photo`, by name, with `toBe` | a changed DEFAULT on the shared pattern — invisible to the adopter diff, invisible to `tsc`, and it would move all six call sites silently |
| 2 — handler moves focus | `preventDefault()` + `safeRef.focus()` → focus is on `Keep photo`, and provably *not* on `Remove photo` | the mitigation shipping as a no-op and being discovered by a human on a device |
| 3 — the halves disagree | the two names are different, and are exactly `[Remove photo, Keep photo]` | a spec that would pass with the prop deleted, because focus happened to land in the right place anyway |
| census | the five adopter files contain no `onOpenAutoFocus`, and the pattern still does | the diff's one-shot nature; the liveness guard also catches a rename that would make the census pass by vacuum |

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0** (run twice — after Task 1 and after Task 2) |
| `npm run test:design` | **0** — 57 files, **1106 passed** / 3 skipped (was 56 files / 1097 before this plan) |
| `npx vitest run tests/design/responsive-dialog-autofocus.test.tsx --config vitest.design.config.ts` | **0** — 9 passed |
| `git diff --exit-code` over the five adopter files | **0** — byte-unchanged |
| `npx playwright test e2e/mobile-booker-path.spec.ts e2e/photo-lightbox.spec.ts --project=chromium` | **0** — **22 passed** (1.8m), two adopters still work in a real browser |
| `npx eslint tests/design/responsive-dialog-autofocus.test.tsx` | clean |
| `grep -c "onOpenAutoFocus" src/components/patterns/responsive-dialog.tsx` | **3** (type, destructure, forward) |
| `grep -c "dismissLocked" …` | **0** |
| `grep -cE "\[[0-9]+vh\]" …` | **0** |
| `ls src/components/ui/alert-dialog.tsx` | does not exist; `grep -rc alert-dialog src/components/ui/` → no matching file |

## Threat Model — dispositions discharged

| Threat ID | Disposition | How it was discharged here |
|---|---|---|
| T-16-07 (Tampering — one edit reaches six call sites) | mitigate | Additive prop, default `undefined`, forwarded verbatim. `git diff --exit-code` over the five adopters **plus** the standing rendering assertion that the default is inert — the second is what covers the case the first is blind to. |
| T-16-08 (Elevation — focus on a destructive confirm) | mitigate | Half two asserts the handler actually moves focus to a named safe action, and separately asserts focus is not on the destructive one. The mitigation cannot ship as a no-op. |
| T-16-09 (Spoofing — a second focus trap) | accept | `alert-dialog` was not added; `tests/design/sheet-absent.test.ts`'s three-name deny-list is untouched and green. Residual risk (a later phase adding one) is already covered by that gate. |

## Requirements

**CROP-03 — advanced, NOT completed.** This plan builds the *mechanism* CROP-03's removal confirm needs; it does not deliver removal. `removeAvatarAction` does not exist, the confirm overlay does not exist, and `profile-form.tsx:120-122` still carries its reserved seam. CROP-03 stays `Pending` in `REQUIREMENTS.md` (`:100`, traceability row `:233`) until the plan that closes its last clause lands, and `AUTHUI-02` stays Pending behind it (`:274`). `REQUIREMENTS.md` was deliberately not edited by this plan.

## Deviations from Plan

**None — the plan executed exactly as written.** Two things worth recording that were judgement calls *inside* the plan's instructions rather than departures from them:

1. **The docblock does not name the prop.** Task 1 asks for a docblock twinning `:185-199`'s shape, and the acceptance criterion asks for `grep -c "onOpenAutoFocus"` to return exactly `3`. The twin's prose quotes its own prop name, which would have made the count `4`. The docblock therefore refers to the hook descriptively ("Radix's open-time focus hook", "this hook") and carries the full structural argument and the D-168 citation without the token. This is the same shape as `responsive-dialog.tsx:113-117`'s standing rule — name the counted thing descriptively when a gate counts it.
2. **The `ResizeObserver` stub was not added.** Task 2 scopes it "if Radix needs it". It does not: `tests/host/request-refusal.test.tsx` already renders this exact overlay under jsdom with no such stub, and the new spec is green without one. The refusal is recorded in the spec's header rather than left as a silent omission.

## Deferred Issues

None from this plan. One pre-existing, out-of-scope observation, logged and **not** fixed (scope boundary): the Playwright run's dev-server log emits `resend error … Invalid 'to' field … domains like example.com` on the two checkout specs. It is unrelated to this plan's files, predates it, and does not fail any test.

## Notes for Next Phase

- **16-09 (`ImageCropDialog`) must use `onCloseAutoFocus`, not this prop** (Δ5c). It has no trigger, so Radix's suppression-without-restore defect applies and `Escape` would drop focus to `<body>`. The prop it needs already existed.
- **16-12 (removal confirm) is the first and, for now, only consumer of `onOpenAutoFocus`.** It passes the trigger (so `onCloseAutoFocus` stays undefined — Radix is correct there), keeps the footer DOM order `Remove photo` → `Keep photo`, and supplies a handler that `preventDefault()`s and focuses `Keep photo`. The moment it does, `tests/design/responsive-dialog-autofocus.test.tsx`'s census will still pass — the confirm is a *new* file, not one of the five censused adopters. If a censused adopter ever needs the prop, the census failure message says to record the decision rather than to edit the list.
- **The VRT consequence is still unmeasured on this machine** (RESEARCH §D13, last paragraph). `listing-sheet-375-court-visual-linux.png` is a committed baseline that renders `ResponsiveDialog`; a genuinely default-inert prop changes no pixel, but `playwright.config.ts` constructs the `visual` project only on Linux, so that claim is argued and asserted here rather than compared. The chromium e2e run (22 passed) is the strongest browser-level evidence available locally.

## Self-Check: PASSED

- `src/components/patterns/responsive-dialog.tsx` — FOUND (modified, +22)
- `tests/design/responsive-dialog-autofocus.test.tsx` — FOUND (created, 253 lines)
- Commit `db600cd` — FOUND in `git log`
- Commit `58c7204` — FOUND in `git log`
- `.planning/STATE.md` and `.planning/ROADMAP.md` — NOT modified by this plan (orchestrator owns them)
