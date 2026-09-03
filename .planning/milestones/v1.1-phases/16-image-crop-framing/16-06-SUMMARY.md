---
phase: 16-image-crop-framing
plan: 06
subsystem: ui
tags: [crop-02, cover-preview, server-component, measurements, aspect-ratio, ast-assertion, jsdom, D-170, D-A]

# Dependency graph
requires:
  - phase: 12-listing-detail
    provides: "`src/lib/design/measurements.ts` — `MOSAIC_ASPECT` (`:365`) and `RESULT_CARD_MEDIA` (`:50`) as CLASS STRINGS, plus `photo-gallery.tsx:39-47`'s recorded argument (*'The class IS the constant, so there is one spelling'*) that this plan inherits wholesale"
  - phase: 11-design-patterns
    provides: "`patterns/empty-state.tsx:17-21` — the server-safety header convention and the grep-versus-comment finding; `tests/design/empty-state-adoption.test.ts:657-663` — the `ts.createSourceFile` directive-prologue detector reused here"
  - phase: 04-listing-creation
    provides: "`src/components/listing/photo-uploader.tsx` — the `space-y-4` wrapper, the zero-photo early return, `commitOrder`'s optimistic-with-revert reorder and the keyboard move controls this plan's spec drives"
provides:
  - "`src/lib/listing/cover-frames.ts` — the four `COVER_PREVIEW_*` copy literals, directive-free, and deliberately NO ratios"
  - "`src/components/listing/cover-frame-preview.tsx` — a Server Component rendering two frames from one URL, sized by the imported class strings; no hooks, no client-boundary import, no ratio of its own"
  - "The mount in `photo-uploader.tsx` between `</DndContext>` and the `MIN_PHOTOS` block — one import, one element, nothing else on that surface moved"
  - "`tests/listing/cover-frame-preview.test.tsx` — 8 cases across visibility, the imported class, server-safety (AST + both-directions self-test) and reorder-follow"
affects: [16-15 GATE-VRT/GATE-RESP inventory rows for this surface, 16-16 the PM hardware walk, 16.1 upload hardening — the widget options this plan pointedly did not touch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ratio-by-import-not-by-literal: a preview reads the previewed surface's own exported class string, so it structurally cannot disagree — the alternative (its own constants plus an equality test) is what D-170 / Δ8 deleted"
    - "server-safety-as-a-dividend: dropping the Radix ratio primitive is what removes the client-boundary import, so 'no `use client`' is a consequence of the ratio decision rather than a separate discipline"
    - "two-assertion-pair-for-an-inert-class: in jsdom the rendered `className` CONTAINS the imported constant (so a coincidental literal cannot satisfy it) AND the source contains no ratio literal at all (which closes the imports-it-and-also-hardcodes-it hole the first leaves open)"
    - "caption-anchored element lookup: frames are found through the caption the host reads, never by DOM order, so an accidental frame swap fails the test instead of passing it"

key-files:
  created:
    - src/lib/listing/cover-frames.ts
    - src/components/listing/cover-frame-preview.tsx
    - tests/listing/cover-frame-preview.test.tsx
  modified:
    - src/components/listing/photo-uploader.tsx
    - tests/design/live-regions.test.tsx

key-decisions:
  - "Δ8 honoured literally: the ratio-agreement test 999.2 Open Q6 made mandatory was NOT written. The import provides structurally what that test was reaching for, and a test asserting a constant equals itself is noise. What IS written instead is the pair of assertions that the import can actually fail on — the rendered class contains the imported value, and the source contains no ratio literal."
  - "The alt on each frame composes the caller's noun with the frame's own exported caption (`Cover photo — Listing page`), so both halves are single exported literals (rule F2), neither frame carries an empty alt (999.2 § 2g), and the two frames are distinguishable to a screen reader rather than being two identically-named images."
  - "`<figure>` / `<figcaption>` rather than two sibling divs. The caption is the frame's label, not a paragraph that happens to sit under it, and the association is what makes the caption-anchored lookup in the spec honest rather than positional."
  - "The heading is an `<h2>`, matching the sibling level the bespoke empty state already uses at `photo-uploader.tsx:202` — the wizard's single `<h1>` is `PageHeader`'s step question."
  - "`text-label font-medium` for the heading. `globals.css:299/398` aliases `--font-weight-medium` onto each theme's single emphasis weight (600 in court, 700 in grove), so `font-medium` IS 'the theme's emphasis weight' the UI-SPEC asks for, per-theme, with no third weight introduced."
  - "No `photos.length >= 1` guard at the call site and no margin, both as the plan measured: the zero-photo branch returns at `:198-210`, so a guard would be dead code shaped like a real branch, and the `space-y-4` wrapper already supplies the gutter."
  - "The mounted element carries a comment naming both of those absences. The plan's acceptance criterion said 'an added import and an added element'; the comment is part of that element's hunk and exists so the next reader does not 'fix' the missing guard back in."

patterns-established:
  - "A gate whose failure message tells you what to do is telling you the truth: `live-regions.test.tsx`'s reach constant said *'adding a component to one of the five surfaces is supposed to move this number — move the constant in the same commit and name the file in the diff'*, and that is exactly what the Rule-3 fix did, with the reasoning for why no INVENTORY row moved written into the constant's docblock."
  - "Probe the assertion that is supposed to be the only one that fires. Inlining `aspect-[16/9]` left the rendered-className assertion GREEN and reddened only the source scan — which is the measured proof that the two assertions are not redundant with each other."

requirements-completed: []
requirements-advanced: [CROP-02]

# Metrics
duration: 25min
completed: 2026-08-25
---

# Phase 16 Plan 06: The cover-frame preview (CROP-02) — Summary

**A host with at least one listing photo now sees, below the grid, exactly what the wide listing hero and the squarer search cards each cut off their cover — rendered through the shipped surfaces' own imported class strings, by a Server Component that bakes nothing into the stored asset and follows a reorder live.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-25T16:25:00+08:00
- **Completed:** 2026-08-25T16:38:00+08:00
- **Tasks:** 3 of 3
- **Files created/modified:** 5 (3 created, 2 modified)

## Accomplishments

- **CROP-02's honest half ships.** There is no single cover ratio to crop to — the same photo renders wide on the hero and squarer on both card surfaces, so any destructive cover crop bakes in the wrong framing for at least one of them and `object-cover` then crops it a second time. The real fix is a stored focal region delivered per-surface, which is a delivery-pipeline phase. This shows the host both cuts and changes nothing: no upload option, no signature param, no delivery URL, no shipped render surface.
- **The ratios are imported, not declared.** `MOSAIC_ASPECT` and `RESULT_CARD_MEDIA` are read as class strings and handed straight to a `<div className>`. The preview declares no ratio of its own, so it cannot drift from the surfaces it previews.
- **It is a Server Component, proven over the AST** — a direct dividend of not reaching for the Radix ratio primitive, which is what carries the client directive.
- **The wizard surface is otherwise byte-unchanged.** The widget options, the 10MB error toast, the bespoke empty state, the reorder sentence and every `PhotoTile` affordance are untouched — all of them Phase 16.1's, per D-164 / D-166.

## Task Commits

1. **Task 1: The copy module and the server-safe preview component** — `ca0f878` (feat)
2. **Task 2: Mount it in the wizard without moving anything that ships** — `301d27d` (feat)
3. **Task 3: `tests/listing/cover-frame-preview.test.tsx`** — `114219a` (test)

## Files Created/Modified

- `src/lib/listing/cover-frames.ts` **(created)** — the four `COVER_PREVIEW_*` literals, verbatim from `999.2-UI-SPEC.md:513-516`. Directive-free. Its header names what it deliberately does NOT hold (a ratio, and why D-170 removed it) and carries the F10 note that the body describes the app's behaviour and never blames the host's photo.
- `src/components/listing/cover-frame-preview.tsx` **(created)** — `CoverFramePreview({ url, alt })` plus a private `CoverFrame`. Import ceiling: `cn`, the two measurement constants, the four literals. Nothing else.
- `src/components/listing/photo-uploader.tsx` **(modified)** — one import, one element (with its comment) between `</DndContext>` and the `MIN_PHOTOS` block. No other hunk.
- `tests/listing/cover-frame-preview.test.tsx` **(created)** — 8 cases in four groups; 291 lines including the header's what-this-cannot-see section.
- `tests/design/live-regions.test.tsx` **(modified)** — `PHASE_14_SURFACE_FILE_COUNT` 18 → 19. See Deviations.

## Verification Run

Every command below was run in this working tree, alone (never concurrently — this repo's `tests/global-setup.ts` TRUNCATEs `fitout_test` on every run).

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, no output |
| `npx vitest run tests/listing/cover-frame-preview.test.tsx` | **1 file, 8 passed** |
| `npx vitest run tests/listing/` | **22 files, 233 passed** |
| `npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` | **26 passed** (after the Rule-3 fix; see below) |
| `npm run test:design` | **58 files, 1126 passed / 3 skipped** — identical to the post-16-05 baseline |
| `npx playwright test e2e/host-dashboard.spec.ts --project=chromium` | **7 passed** (32.2s) |
| `npm run build` | exit 0, full route table emitted |
| `npx eslint` on all three new files | clean |

### The plan's greps, run

| Assertion | Result |
|---|---|
| `grep -cE "16 ?/ ?9\|4 ?/ ?3\|aspect-" src/lib/listing/cover-frames.ts` | `0` |
| `grep -cE "16 ?/ ?9\|4 ?/ ?3\|AspectRatio" src/components/listing/cover-frame-preview.tsx` | `0` |
| `grep -c "MOSAIC_ASPECT"` / `"RESULT_CARD_MEDIA"` in the component | `3` / `3` |
| `grep -cE "useState\|useEffect\|useRef\|useMemo"` in the component | `0` |
| `grep -c 'alt=""'` in the component | `0` |
| `grep -c "maxFileSize\|clientAllowedFormats" src/components/listing/photo-uploader.tsx` | `0` |
| `grep -c 'sources: \["local", "camera", "url"\]' src/components/listing/photo-uploader.tsx` | `1` |
| `grep -c "dnd\|pointerDown\|dragStart" tests/listing/cover-frame-preview.test.tsx` | `0` |
| `git diff --exit-code src/lib/design/live-regions.ts src/lib/design/measurements.ts src/components/listing/photo-gallery.tsx src/components/listing/listing-card.tsx src/components/patterns/result-card.tsx src/components/search/search-result-card.tsx` | exit 0 — all six read-only |

**Two of those greps shaped the prose rather than the code**, and it is worth recording which way round that went. The copy module's header originally spelled Open Q6's two ratios in prose, and the component's docblock originally quoted `<AspectRatio ratio>` and an empty alt attribute in order to explain that it uses neither. All three were rewritten to say the same thing without the token — because a gate that cannot distinguish a comment from code is a gate whose comments have to be written for it. This is the twelfth instance of that collision in this tree, and `empty-state-adoption.test.ts` solves the harder half of it (the directive prologue) structurally, which is exactly why case 3 below is an AST assertion and not a grep.

## Watched Reds

Both were run against the real component, transcribed, and reverted. `git diff --exit-code` confirmed a clean restore after each.

### Case 2 — inline the ratio instead of importing it

Replaced `aspectClass={MOSAIC_ASPECT}` with `aspectClass="aspect-[16/9]"` in `cover-frame-preview.tsx`.

```
 ❯ tests/listing/cover-frame-preview.test.tsx (8 tests | 1 failed) 498ms
     × declares no ratio of its own anywhere in its source 10ms

 FAIL  CROP-02 (2) — the frames wear the shipped surfaces' own class strings >
       declares no ratio of its own anywhere in its source
 AssertionError: the preview writes its own arbitrary aspect class. Import the constant
 instead (D-170) — a second spelling of a value that already has one is what Δ8 removed.:
 expected '// CROP-02 — the two cuts a host\'s c…' not to match /aspect-\[/
```

**The finding that makes this probe worth running:** the OTHER assertion in the same describe — the one reading the rendered `className` — stayed **GREEN**. It has to: the inlined literal spells the identical string, so `toContain(MOSAIC_ASPECT)` is satisfied. That is the measured proof that the two assertions are not redundant, and it is precisely the defect Δ8 is about — a preview that renders the right shape today by coincidence and the wrong one the day `measurements.ts` is retuned.

### Case 3 — a `"use client"` prologue on the component

```
 ❯ tests/listing/cover-frame-preview.test.tsx (8 tests | 1 failed) 340ms
     × has no `use client` directive prologue 19ms

 FAIL  CROP-02 (3) — the preview is a Server Component > has no `use client` directive prologue
 AssertionError: the preview was marked `use client`. It renders one URL into two boxes and
 holds no state; a directive here would drag the block across the boundary for nothing and
 would mean the ratio primitive had crept back in.: expected true to be false
```

The detector carries its both-directions self-test in the same file (a fixture WITH a prologue detects `true`; one with the directive only inside a comment detects `false`), so the assertion above cannot be passing by never firing. It is stated in the spec, in a comment, that this is **not** `tests/design/server-only-guards.test.ts`'s property: that file polices `import "server-only"` — a claim that a module must never reach the browser — whereas this is the opposite direction, a claim that this module never *demands* the browser (16-PATTERNS § Measured corrections #1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `tests/design/live-regions.test.tsx` reach constant 18 → 19**

- **Found during:** Task 2, on the plan's own verification command.
- **Issue:** `SCAN 4 — the Phase-14 host surfaces` failed: *"the walk reached 19 files inside the owned trees, not 18."* `PHASE_14_SURFACE_FILE_COUNT` (`:1119`) pins the size of the import closure reachable from the five Phase-14 surface roots, and `src/components/listing/` is one of the four owned trees — so mounting a new component inside `photo-uploader.tsx` moves it by construction.
- **Fix:** Bumped the constant to 19 and named `src/components/listing/cover-frame-preview.tsx` in its docblock, which is verbatim what the assertion's own failure message instructs (*"That is not a failure by itself — adding a component to one of the five surfaces is supposed to move this number — but the reach of every assertion below just changed, so move the constant in the same commit and name the file in the diff"*). The docblock also records **why no inventory row moved**, so the next reader does not go looking: the preview authors no live region, and `at` is a 1-based ordinal among regions of the same kind in the same file (`live-regions.ts:227-229`), never a line number — so inserting markup ABOVE `photo-uploader.tsx`'s `role="status"` re-keys nothing.
- **Files modified:** `tests/design/live-regions.test.tsx`
- **Commit:** `301d27d` (same commit as the mount, as the gate requires)

**This confirms 16-PATTERNS § Measured corrections #2 rather than contradicting it.** `16-RESEARCH.md` §D18 warned that mounting above the status region would break its live-region key. It does not, and the plan told me to assert that rather than assume it: `git diff --exit-code src/lib/design/live-regions.ts` **exits 0** — the inventory is untouched, and only the *reach* constant in the test moved. Two different mechanisms with similar-looking symptoms; the plan's distinction held under contact.

### Deliberate reading of an acceptance criterion

The criterion for Task 2 reads *"shows ONLY an added import and an added element … no other hunk."* The added element is preceded by a four-line comment naming the two absences the plan is emphatic about (no `photos.length` guard, no margin). It is one hunk, at the mount point, and it exists so a future reader does not restore the dead-code guard as a "fix". Recorded here rather than left for a reviewer to notice.

### Not done, on the plan's explicit instruction

- **The 999.2 § 3a ratio-agreement test was NOT written** (Δ8 / D-170). Its premise — "no shared ratio constant exists" — was overturned by Phase 12.
- **No shipped render surface was edited.** `photo-gallery.tsx`, `listing-card.tsx`, `search-result-card.tsx`, `patterns/result-card.tsx` and `measurements.ts` all pass `git diff --exit-code`.
- **Nothing from Phase 16.1 was absorbed.** `maxFileSize` stays absent, `clientAllowedFormats` was not added, `sources: ["local", "camera", "url"]` is unchanged, and the error toast's *"an image under 10MB"* sentence — which describes a vendor default we neither control nor declare — was left wrong on purpose. Correcting it is 16.1's success criterion 1. **No scope alarm to raise:** nothing in this task's work created pressure to touch any of the five places R13 warned about.

## Requirements

**REQUIREMENTS.md was not touched.** CROP-02 is carried by three plans in this phase (`16-05`, `16-06`, `16-15`) and this one does not close its last clause — `16-15` is wave 9 and `depends_on: [16-06, …]`, carrying CROP-02's GATE-RESP and GATE-VRT clauses. Recorded as `requirements-advanced: [CROP-02]` in the frontmatter, per the orchestrator's shared-requirement rule. `REQUIREMENTS.md:99` and its traceability row at `:232` both correctly remain `Pending`.

**STATE.md and ROADMAP.md were not touched** — the orchestrator owns both on this repo.

## Known Stubs

None. Every element the preview renders is wired to real data: the URL is `photos[0].url`, the same value the public cover surfaces render, and the shapes are the same constants those surfaces read.

## Threat Flags

None. The three registered threats are all discharged or unchanged:

| Threat | Disposition | Outcome |
|---|---|---|
| T-16-19 — the `<img src>` | transfer | The URL is the same value the shipped cover surfaces already render, and its provenance is enforced upstream by 16-05's `persistPhoto` guard (D-165). This component adds no new trust in it and no new fetch of it. |
| T-16-20 — the wizard's upload options | mitigate | `git diff` on `photo-uploader.tsx` is two hunks; the option greps are in the Verification Run above. |
| T-16-21 — client/server boundary creep | mitigate | The AST assertion, with a both-directions self-test, is case 3 above and was watched failing. |

No file created or modified here introduces a network endpoint, an auth path, a file-access pattern or a schema change. `drizzle/` is untouched; GATE-06 holds.

## Notes for Future Phases

- **16-15** adds this surface to `SURFACE_IDS` / `VISUAL_SURFACES` / `VISUAL_BASELINES` (court-only) and a `/profile` row to `e2e/overflow-320.spec.ts`. Worth knowing at 320px: the two frames sit in a `flex gap-2` row at `w-32` each = 128 + 8 + 128 = **264px**, which clears 320 minus the wizard's gutters, and the frames do NOT wrap. The captions are `text-label` and both are short.
- **16.1** inherits an untouched `photo-uploader.tsx` widget-options block and an error toast that still names a limit our code does not enforce.
- If the delivery-pipeline phase ever lands a stored focal region, **this component is where the honest-preview claim gets replaced by a real one** — and at that point the two frames stop being an apology and become a control. It is presentational and takes one URL, so that swap is a prop change, not a rewrite.

## Self-Check: PASSED

- `src/lib/listing/cover-frames.ts` — FOUND
- `src/components/listing/cover-frame-preview.tsx` — FOUND
- `tests/listing/cover-frame-preview.test.tsx` — FOUND
- `src/components/listing/photo-uploader.tsx` — FOUND (modified)
- `tests/design/live-regions.test.tsx` — FOUND (modified)
- Commit `ca0f878` — FOUND
- Commit `301d27d` — FOUND
- Commit `114219a` — FOUND
