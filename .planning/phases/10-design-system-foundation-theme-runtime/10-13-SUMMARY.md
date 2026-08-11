---
phase: 10-design-system-foundation-theme-runtime
plan: 13
subsystem: design-system
tags: [design-system, z-index, stacking, source-scan, compiled-output, tailwind-v4, DS-03]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 04
    provides: "the four-step z scale in a plain `:root` block (10/20/30/40) and `tests/design/elevation-z.test.ts` itself"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 11
    provides: "the line-oriented comment stripper and the control-on-the-control rule"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 12
    provides: "the `(?<![\\w-])` call-site lookbehind, the shadow half of this same gate file, and — via D-1 — SOUND compiled-output assertions"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 07
    provides: "the walker and the Windows path-normalisation idiom the scan reuses"
provides:
  - "**DS-03 CLOSED — both clauses.** 20 z-index call sites map to the four-step scale; zero raw `z-10` / `-z-10` / `z-50` remain anywhere in `src/`"
  - "`tests/design/elevation-z.test.ts` extended 31 → 53 assertions: a z source scan with per-file inventories on BOTH sides, compiled-output absence with an unforced-presence control, and a direct proof that the bare `z-dialog` form emits nothing"
  - "`tests/design/helpers/compile-css.ts` — the safelist sanitiser widened to admit the CSS-variable arbitrary-value syntax, with its break-out property now ASSERTED rather than only documented"
  - "An independent second proof that deferred item D-6 failure 1 is pre-existing, taken at a five-commits-later baseline"
affects: [10-14, 10-16, 10-17, 11, 18]

# Tech tracking
tech-stack:
  added: []   # no dependency installed; 20 class swaps, 2 comment rewrites, 2 test files
  patterns:
    - "`-z-(--z-token)` compiles to `z-index: calc(var(--token) * -1)`. A negative raw z is still a scale member, mirrored — it must NOT be flattened to the positive step."
    - "A raw grep for `\\bz-10\\b` MATCHES INSIDE `-z-10`, because `-` is a word boundary. Every inventory built that way silently conflates a layer with its mirror."
    - "Assert the silent-failure form directly: force-safelist `z-dialog` and require NO rule. It removes the only innocent explanation (\"nothing uses it yet\") for an absence."
    - "A validator that cannot express the only legal form of the thing under test forces the test to be dropped — the worse failure. Widen it, then assert the property it existed for."
    - "Prove a pre-existing e2e failure by checking the plan's own files out at the pre-plan commit and re-running. Reasoning about blast radius is not evidence."

key-files:
  created: []
  modified:
    - src/app/(auth)/login/page.tsx                  # Task 1 (negative)
    - src/app/(auth)/signup/page.tsx                 # Task 1 (negative)
    - src/components/booking/booking-row.tsx         # Task 1
    - src/components/host/host-booking-row.tsx       # Task 1 (+ comment rewrite)
    - src/components/ui/avatar.tsx                   # Task 2
    - src/components/ui/calendar.tsx                 # Task 2 (2 sites)
    - src/components/ui/select.tsx                   # Task 2 (2 sticky + 1 dialog)
    - src/components/ui/toggle-group.tsx             # Task 2 (2 sites)
    - src/components/ui/dialog.tsx                   # Task 3 (2 sites)
    - src/components/ui/dropdown-menu.tsx            # Task 3 (2 sites)
    - src/components/ui/popover.tsx                  # Task 3
    - src/components/ui/tooltip.tsx                  # Task 3 (3 sites)
    - tests/design/elevation-z.test.ts               # Task 3 (+22 assertions)
    - tests/design/helpers/compile-css.ts            # Task 3 (deviation 2)
    - .planning/phases/10-.../deferred-items.md      # D-6 UPDATE

key-decisions:
  - "The plan's `z-10 ×12` inventory is 9 code sites + 1 COMMENT + 2 NEGATIVE `-z-10`. The two negatives are the `or` dividers on login and signup: they must render BEHIND their own labels, so they map to `-z-(--z-sticky)`, not to the positive step. Mapping them as written would have inverted two real surfaces while every count in the gate still read correctly."
  - "The true mapped total is 20 code sites (11 sticky + 9 dialog), not 21. The 21st is `globals.css`'s own CONSUMPTION FORM comment, which quotes `z-(--z-dialog)`. Twelfth occurrence of the phase's grep-versus-comment collision — and this time it lands on the SAME NUMBER the plan predicted, by a different composition, which is the most dangerous shape it has taken yet."
  - "`z-0` stays exempt and `-z-10` does not. `z-0` is the stacking-context origin (paired with `isolate` on calendar's range endpoints), not a layer; `-z-10` contains the magic 10 the scale exists to name."
  - "`compile-css.ts`'s safelist sanitiser was WIDENED, not worked around. `z-(--z-dialog)` is the only legal spelling of a named z layer and the old character class rejected every parenthesis; a helper that cannot express it forces the test to be dropped."
  - "DS-03 marked **Complete**. All three of its literal clauses hold, plus the z-index call-site migration the phase's own plans (10-04 deviation 2, 10-12) treated as its declared second half and assigned to this plan."

patterns-established:
  - "Count a negative utility SEPARATELY from its positive twin. A single inventory keyed on the unsigned name cannot tell a layer from its mirror, and the mirror is where the visible bug lives."
  - "Observe red TWICE when a gate claims to catch two different failure modes. A wrong name and a DELETE have measurably different blast radii here — 6 failures versus 2 — and only the second one justifies the count assertions."

requirements-completed: [DS-03]

# Metrics
duration: 30min
completed: 2026-08-12
---

# Phase 10 Plan 13: Z-Index Call Sites → The Four-Step Scale Summary

**Two magic numbers stopped arbitrating every stacking decision in this app — and the inventory the plan handed over was wrong in a way that would have inverted two real surfaces while every count still read correctly**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-12T03:07Z
- **Completed:** 2026-08-12T03:37Z
- **Tasks:** 3 (all `auto`, no checkpoints)
- **Files:** 0 created, 15 modified

## Accomplishments

- **All 20 z-index call sites are migrated, and DS-03 is closed.** 11 sticky (9 positive + 2
  negative), 9 dialog, 2 `z-0` deliberately untouched, across 12 files. Zero raw `z-10`, `-z-10` or
  `z-50` survives anywhere under `src/` — verified in the source AND in the emitted stylesheet.
- **The consumption form was verified before a single edit, not assumed.** A throwaway compile of
  the real `globals.css` proved `z-(--z-sticky)` → `z-index: var(--z-sticky)`, `-z-(--z-sticky)` →
  `z-index: calc(var(--z-sticky) * -1)`, and — the point — that `z-dialog` and `z-sticky` emit
  **nothing at all**. Tailwind v4 has no z-index namespace, so the readable-looking bare form is not
  an error, not a warning, and not a rule; it is silence, and an element keeps whatever stacking it
  inherits. That is now an assertion in the gate rather than a warning in a comment.
- **The two `-z-10` sites are the finding that mattered.** The plan, the UI-SPEC and this phase's
  own tooling all counted `z-10 ×12`, because `grep -E '\bz-10\b'` **matches inside `-z-10`** — `-`
  is a word boundary. Two of those twelve are the `or` dividers on `/login` and `/signup`: a rule
  that must render BEHIND the label it crosses. Following the plan's instruction verbatim ("replace
  all 5 `z-10` occurrences with `z-(--z-sticky)`") would have flipped a decorative line in front of
  its own text on the two highest-traffic unauthenticated pages in the app — and every count in the
  gate would still have read 21.
- **The mapped total is 20, not 21, and the 21st is a comment quoting the class it documents.**
  `globals.css`'s CONSUMPTION FORM block writes `z-(--z-dialog)` verbatim while explaining why the
  bare form fails. So the raw grep total lands on exactly the number the plan predicted — by a
  different composition. That is the twelfth occurrence of this phase's grep-versus-comment
  collision and the most dangerous shape it has taken: previous ones produced a WRONG number, which
  gets noticed. This one produced the RIGHT number for the wrong reason.
- **The `z-50` mapping is NOT value-preserving, and that is deliberate.** `--z-dialog` is 30, not
  50. All nine former `z-50` layers moved together, so relative order is unchanged — including the
  case worth checking rather than assuming: `dialog.tsx`'s overlay and content were BOTH 50 and are
  BOTH 30, with DOM order (`<DialogOverlay />` then `<DialogPrimitive.Content>`) deciding exactly as
  before. The dialog still renders above its own overlay.
- **The gate is 53 assertions (was 31) and was watched go red TWICE, because the two failure modes
  have measurably different blast radii.** A `z-50` reinstated at `popover.tsx` → **6 failed / 47
  passed**. The z-index DELETED from that same line → **2 failed / 51 passed** — only the count and
  the per-file inventory fire, because every zero-violations assertion passes perfectly against a
  tree with no stacking at all. That second number is the entire argument for pinning exact counts
  on both sides (T-10-49), and it is the first time this phase has measured it rather than asserted
  it.
- **292/292 design tests green** (was 270), DB-free, ~4.7s. Full DB suite **1197 passed / 4
  skipped**, unchanged. `tsc --noEmit` exit 0, `npm run build` exit 0, lint 0 errors / 9 warnings —
  unchanged from the phase baseline.

## The safelist sanitiser, and why widening it was the right call

`compileGlobalsCssWith()` validates every utility before interpolating it into `@source inline("…")`,
with the character class `[a-z0-9:/-]`. That admits every utility this repo had ever safelisted,
because all of them are word-shaped. It rejects `z-(--z-dialog)` outright.

Which is a problem, because that is **the only legal spelling of a named z layer**. There is no
`z-dialog` to fall back to. A helper that cannot express the thing under test does not make the test
safer, it makes the test impossible — and the two assertions it blocked are the two that carry the
most weight in this plan: *the bare form emits nothing even when forced*, and *the two unused steps
would compile correctly if adopted*.

So the class was widened to admit `(`, `)`, `[`, `]`, `.`, `_`, `%` and an optional leading `-`, and
the reasoning is recorded at the check. **The security property is unchanged and is the only one
that matters**: the value lands inside a CSS string literal, so a quote, a backslash, a newline, a
`;` or a brace must still be refused — and now that the class is wider, that is **asserted** (six
hostile shapes rejected, both real shapes accepted) instead of being left to a docstring. A widened
validator with no test on it is how a validator keeps widening.

## Task Commits

1. **Task 1: The app-level sticky layers** — `8ab6cfd` (refactor)
2. **Task 2: The vendored internal layers and the select popover** — `598b6d0` (refactor)
3. **Task 3: The 8 portal layers and the DS-03 z gate** — `3a51ded` (test)

**Plan metadata:** see the `docs(10-13)` commit that carries this file.

## Files Created/Modified

- **The 4 app-level sites (Task 1).** `/login` and `/signup`'s "or" dividers (`-z-10` →
  `-z-(--z-sticky)`), `booking-row`'s Pay-now CTA and `host-booking-row`'s Approve/Decline block —
  both of the latter lift above a stretched-link card overlay, and both are value-preserving.
  `booking-row.tsx:114` also carries `variant="brand"` from plan 10-08; only the `z-10` changed, and
  the criterion pinning it to 1 still holds.
- **`host-booking-row.tsx`'s comment rewritten descriptively.** It quoted ``` `relative z-10` ```
  while documenting the line beneath it, which is why the plan's inventory said 5 sites in 4 files
  where the code has 4. It now names the class rather than spelling it — the convention
  `booking-row.tsx:111` established for this exact reason, and the reason is stated in the comment so
  it does not get "clarified" back.
- **The 7 vendored sticky sites + the select popover (Task 2).** Avatar badge, calendar day cell and
  its focused-day lift, both select scroll buttons, toggle-group's `focus:` / `focus-visible:` lift,
  and `SelectContent`'s `z-50` → `z-(--z-dialog)`. `calendar.tsx`'s two `z-0` on the range endpoints
  are untouched; they sit alongside `isolate` and are the stacking-context origin for an `::after`
  bleed, not a layer.
- **The 8 remaining portal sites (Task 3).** Dialog overlay + content, dropdown content +
  sub-content, popover content, tooltip content + its `**:data-[slot=kbd]:` slot + the arrow. All
  nine dialog-layer sites were read and confirmed to be Radix portal layers before being mapped
  (T-10-48). Ten of the twelve edited files are vendored — they join the fork surface D-17 already
  accepts (T-10-46).
- **`tests/design/elevation-z.test.ts` — 31 → 53 assertions.** A z scan reusing the file's own
  walker, `label()` and comment stripper: reach floor (216 files, >200) with `dialog.tsx` named as
  the positive-control file; zero banned values of either sign; the raw-z set asserted as an
  EQUALITY so an invented `z-[999]` or `z-auto` fails the same assertion as a regression to 50; a
  four-name vocabulary check that is where a bare `z-dialog` gets caught; per-file inventories for
  sticky (9), negative sticky (2), dialog (9) and the surviving `z-0` (2); the co-located-pair
  assertion on `tooltip.tsx`'s two-on-one-line; a compiled-output block with the unforced-presence
  control; the force-safelisted proof that the bare form emits nothing; and three controls on the
  controls, including one asserting that `tz-safe` / `tz-note` are never folded into the vocabulary.
- **`tests/design/helpers/compile-css.ts`** — see the section above.
- **`.planning/…/deferred-items.md`** — a `D-6 UPDATE` recording the second independent proof.

## Decisions Made

- **`-z-10` maps to `-z-(--z-sticky)`, not to `z-(--z-sticky)`.** See Accomplishments and
  Deviation 1.
- **`z-0` stays exempt, `-z-10` does not.** `z-0` is not a layer in a four-step scale; it is the
  stacking-context origin. `-z-10` contains the magic 10 the scale exists to name.
- **The gate asserts CODE counts (20), not raw-text counts (21).** The token contract and its
  explanatory comment may keep saying what they say.
- **The safelist sanitiser was widened rather than routed around**, and its security property is now
  asserted.
- **`--z-sheet` and `--z-toast` get no invented homes**, and both zeros are asserted. `--z-sheet` is
  reserved for a genuine mobile overlay/sheet, which the tree does not have; the Sonner toaster sets
  its own z-index internally and is not edited here.
- **DS-03 marked `Complete`** — the first requirement this phase has closed across two plans by
  design (10-12's shadow clause + this plan's z clause), exactly as 10-04's deviation 2 predicted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two of the five Task-1 sites are `-z-10`, not `z-10` — mapping them as written would have inverted two real surfaces**

- **Found during:** Task 1 `read_first`, before any edit
- **Issue:** `src/app/(auth)/login/page.tsx:170` and `src/app/(auth)/signup/page.tsx:194` carry
  `-z-10` — a NEGATIVE z-index on the "or" divider, which must render behind the `bg-card` label it
  crosses. The plan (and `10-UI-SPEC.md` § Z-index, and every count downstream of them) reads
  `z-10 ×12`, because `grep -E '\bz-10\b'` matches inside `-z-10`: `-` is a word boundary. Task 1's
  instruction — "Replace all 5 `z-10` occurrences in these 4 files with `z-(--z-sticky)`" — would
  have moved both dividers from `z-index: -10` to `z-index: 10`, in front of their own text, on the
  two highest-traffic unauthenticated pages in the app. Every acceptance criterion in the plan would
  still have passed.
- **Fix:** Mapped to `-z-(--z-sticky)`, verified by compiling the real stylesheet to emit
  `z-index: calc(var(--z-sticky) * -1)` — value-preserving at −10, and still reading from the scale
  rather than from a bare 10. The gate counts the negative form as its own inventory so a future
  flattening to the positive step fails a named assertion rather than passing a total.
- **Files modified:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`,
  `tests/design/elevation-z.test.ts`
- **Verification:** `NEGATIVE_STICKY_INVENTORY` pins both files at 1; the compiled `.-z-\(--z-sticky\)`
  rule is asserted as the exact emitted expression, not merely as non-null.
- **Committed in:** `8ab6cfd`, `3a51ded`

**2. [Rule 3 - Blocking] The safelist sanitiser rejected the only legal spelling of a named z layer**

- **Found during:** Task 3, first run of the new compiled-output assertions — 2 red
- **Issue:** `compileGlobalsCssWith()` validates each utility against `/^[a-z0-9][a-z0-9:/-]*$/` and
  threw `refusing to safelist a utility with unexpected characters: "z-(--z-dialog)"`. Tailwind v4
  has no z-index namespace, so there is no word-shaped alternative — the check made the two most
  load-bearing assertions in this plan impossible to write.
- **Fix:** Widened to `/^-?[a-z0-9][a-z0-9:/._()[\]%-]*$/` (the arbitrary-value and CSS-variable
  syntaxes, plus negative utilities), with the reasoning recorded at the check. `"`, `\`, newline,
  `;`, `{` and `}` are still refused — and that property is now asserted (Rule 2, below) instead of
  being documented only.
- **Files modified:** `tests/design/helpers/compile-css.ts`
- **Verification:** `elevation-z` 53/53; `shadow-*` safelists unaffected; whole design gate 292/292.
- **Committed in:** `3a51ded`

**3. [Rule 2 - Missing] The widened sanitiser had no test on it at all**

- **Found during:** Deviation 2's fix
- **Issue:** Nothing anywhere in `tests/` asserted the sanitiser's behaviour — verified by grep. A
  security check that has just been widened and is guarded only by a docstring is a check that will
  keep widening, one convenience at a time.
- **Fix:** Added an assertion in the existing `guard-the-guard` block: six hostile shapes (a quote
  that closes `@source inline("…")` and appends an `@import`, a `;`, a trailing backslash, an
  embedded newline, braces, a trailing space) must all throw; both real shapes — `shadow-raised` and
  `z-(--z-dialog)` / `-z-(--z-sticky)` — must not.
- **Files modified:** `tests/design/elevation-z.test.ts`
- **Verification:** 53/53 green; removing the leading-`^` anchor from the regex makes it red.
- **Committed in:** `3a51ded`

**4. [Rule 1 - Bug] The plan's Task-1 and Task-2 acceptance counts, and the `dark:` pin, are wrong against the tree**

- **Found during:** Tasks 1 and 2 acceptance verification
- **Issue:** Four criteria do not hold literally. Task 1's `z-(--z-sticky) | wc -l` returns **4**,
  not 5 — the 5th was `host-booking-row.tsx:121`, a COMMENT quoting the class it documents. Task 3's
  `grep -rho -- "z-(--z-" | wc -l` returns **21** as promised, but as 20 code sites plus one comment
  in `globals.css`'s CONSUMPTION FORM block, not as 12 sticky + 9 dialog. And the `dark:` occurrence
  pin is **54**, not the plan's 56 — deferred item D-2 recorded that drop after 10-07 and 10-12
  re-confirmed it.
- **Fix:** Verified the real code counts instead — 11 sticky, 9 dialog, 20 mapped, 2 `z-0`, zero raw
  — and encoded those in the gate via the comment stripper and the lookbehind. Rewrote
  `host-booking-row.tsx`'s comment descriptively so it stops being a phantom call site. The `dark:`
  count was measured at 54 before the edits and 54 after, rather than adjusted to fit.
- **Files modified:** `src/components/host/host-booking-row.tsx` (comment), `tests/design/elevation-z.test.ts`
- **Verification:** all 20 code sites enumerated by file and line; the gate's control-on-the-control
  asserts `globals.css`'s raw text still contains `z-dialog` while its stripped code contributes
  nothing to the vocabulary.
- **Committed in:** `8ab6cfd`, `598b6d0`, `3a51ded`

---

**Total deviations:** 4 (2 × Rule 1, 1 × Rule 2, 1 × Rule 3). No Rule 4 checkpoint was needed.
**Impact on plan:** Every site the plan intended to migrate is migrated and every acceptance
criterion holds on its intent. Two counts were satisfied by measuring code rather than raw text, and
one instruction (map all five Task-1 sites to the positive step) was deliberately NOT followed
literally, because following it would have shipped a visible regression that the plan's own gate
could not have caught.

## Deferred Issues

**None new.** One existing item gained a second, independent confirmation:
`.planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md` now carries a **D-6
UPDATE**. `e2e/open-capacity.spec.ts:376` fails on the `Saturday, Aug 15` panel heading, exactly as
D-6 item 1 recorded from plan 10-08. Because this plan remaps stacking — the one change class that
could genuinely put an overlay above its own content — causality was proven rather than argued: all
twelve source files were checked out at `45ecf07` (five commits after the baseline D-6 used) and the
full suite re-run, producing an **identical** signal (17 passed / 1 failed / 5 did not run, same
test, same assertion, same locator). Restored to HEAD afterwards and re-verified green. Two facts
were added to the item: Playwright reports `element(s) not found`, meaning the heading is absent from
the DOM, which no z-index can cause; and the failure is order-sensitive (running the spec file alone
once, case 1 passed and case 2 failed instead), which sharpens D-6's untested date-derivation
hypothesis. Leftover rows were ruled out — 0 `e2e_%` rows in `booking`, `listing` and `user`.

## Issues Encountered

- **The grep-versus-comment collision hit for the twelfth time, and this is its most dangerous
  form.** Every prior occurrence produced a WRONG number, which gets noticed. This one produced the
  **right** number — 21 — for the wrong reason: 20 code sites plus one comment quoting the class it
  documents. A gate written against the raw total would have been green, permanently, while
  believing something false about the composition.
- **The negative-z conflation is a new failure class for this phase and it is not a comment
  problem.** `\bz-10\b` matching inside `-z-10` is a property of the regex, not of prose, and it
  propagated from the UI-SPEC into the plan into the acceptance criteria without anyone writing
  anything incorrect. The lesson is narrower and sharper than "strip comments": **a sign is part of
  a value, and a boundary assertion does not know that.**
- **The two red observations disagreeing by 4 assertions is the most useful thing measured here.**
  6 failures for a wrong name, 2 for a delete. If the gate had only ever been watched red on the
  wrong-name case, the count assertions would look like belt-and-braces; the delete case shows they
  are the only thing standing between a green gate and a tree with no stacking in it.
- **`state.add-decision` rejected its documented positional argument** (`{"error":"summary
  required"}`) and `state.record-session` reported missing fields — the known `gsd-sdk` v1.42.3
  behaviour. STATE.md's frontmatter, Current Position, metrics row and Decisions were hand-written
  per the toolchain notes. `requirements.mark-complete DS-03` and `roadmap.update-plan-progress 10`
  both worked.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- elevation-z` | exit 0 — **53 passed** (was 31) |
| Observed RED: `z-50` reinstated at `popover.tsx:33` | exit non-zero — **6 failed / 47 passed** |
| Observed RED: the z-index DELETED from that same line | exit non-zero — **2 failed / 51 passed** (only the count + inventory fire) |
| Observed GREEN after revert | exit 0 — **53 passed** |
| `npm run test:design` (whole gate) | exit 0 — 14 files, **292 passed** (was 270), ~4.7s, no database |
| `npm run db:up && npm run db:test:setup && npm test` | exit 0 — **1197 passed / 4 skipped**, unchanged |
| Code sites: sticky (+) / sticky (−) / dialog / `z-0` | **9 / 2 / 9 / 2** — 20 mapped, 12 files |
| Raw `z-10`, `-z-10`, `z-50` anywhere in `src/` | **0** |
| `grep -rho -- "z-(--z-" src/app src/components \| wc -l` | **21** — 20 code + 1 `globals.css` comment |
| Compiled `.z-\(--z-sticky\)` (unforced) | `z-index: var(--z-sticky);` |
| Compiled `.-z-\(--z-sticky\)` (unforced) | `z-index: calc(var(--z-sticky) * -1);` — value-preserving at −10 |
| Compiled `.z-\(--z-dialog\)` (unforced) | `z-index: var(--z-dialog);` |
| Compiled `.z-10` / `.-z-10` / `.z-50` | **null** — absent from the shipped stylesheet |
| Compiled `.z-0` | `z-index: 0;` — the exemption is a real surviving surface |
| Compiled `.z-dialog` / `.z-sticky` / `.z-sheet` / `.z-toast`, FORCE-SAFELISTED | **null** — the bare form does not compile |
| Compiled `.z-\(--z-sheet\)` / `.z-\(--z-toast\)` unforced → forced | **null → emitted** |
| Scan reach | **216** files walked; `dialog.tsx` and `calendar.tsx` reached by name |
| Vendored `dark:` occurrence total | **54** before and after (plan says 56; see deviation 4) |
| `grep -c 'variant="brand"' src/components/booking/booking-row.tsx` | **1** — 10-08's edit survived |
| `npx tsc --noEmit` | exit **0** |
| `npm run build` | exit **0** |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, unchanged from baseline |
| `npm run test:e2e` | **17 passed / 1 failed / 5 did not run** — the failure is D-6 item 1, re-proven pre-existing at `45ecf07` |
| `git diff --diff-filter=D` on all 3 commits | no file deletions |
| `git status --short` after each commit | clean |

## Known Stubs

None. Every edit is a real class swap on a real rendered surface, every assertion runs against the
live source tree or its real compiled output, and nothing is mocked or placeholder. `--z-sheet` and
`--z-toast` having zero call sites is **not** a stub: they are reserved steps with asserted zeros, a
stated reason each (no mobile sheet exists in the tree; Sonner sets its own z-index), and a proof in
the same file that both would compile correctly the day a surface adopts one.

## Threat Flags

None. This plan changes 20 class strings, 2 comments and 2 test files. No network endpoint, auth
path, file access pattern or schema change; `drizzle/` untouched at `0025` (GATE-06).

Threat register dispositions honoured: **T-10-48** (a mis-mapped z puts a modal behind its own
backdrop) — every `z-50` site was READ and confirmed to be a Radix portal layer before being mapped;
all nine moved together; the `dialog.tsx` overlay/content pair was specifically checked (both were
50, both are now 30, DOM order decides exactly as before); and `npm run test:e2e` exercised the real
dialogs, menus and popovers with 17 passing and the single failure independently proven pre-existing.
**T-10-49** (a zero-raw-z assertion passes against a scanner that visited nothing, and a delete
passes too) — mitigated four ways and one of them was MEASURED: exact counts on both sides pinned per
file, a >200-file reach floor, `dialog.tsx` named as the positive-control file, and the gate observed
red on a delete at **2 failed / 51 passed**, which is the precise size of the hole the counts fill.
**T-10-50** (Leaflet at 1000) — accepted as planned; lowering the portal layer from 50 to 30 does not
change the relationship to a vendor that already sat above both, and the Phase 18 rule is recorded in
`globals.css` at the scale and in the test file's blind-spot list.

## Next Phase Readiness

- **10-14 / 10-16 / 10-17** — `elevation-z.test.ts` is now 53 assertions across two self-contained
  clauses (shadows, then z). Both use the same walker, the same comment stripper and the same
  `(?<![\w-])` lookbehind; a third clause should reuse all three rather than add a fourth scanner.
- **10-16 (`/dev/theme`)** — unchanged warning from 10-12: the elevation gate asserts `shadow-sticky`
  has **zero** call sites, and a `/dev/theme` ladder under `src/app/**` will legitimately move that.
  The **z** gate makes no such assumption about a page that does not exist yet — but note that a
  `/dev/theme` z-ladder demonstrating all four steps WOULD move three assertions here: the sticky and
  dialog per-file inventories, and both `--z-sheet` / `--z-toast` zeros (including their
  absent-from-the-bundle compiled assertions). Expected, and to be updated in the same commit.
- **10-17 (the build gate)** — `test:design` remains DB-free and fast (~4.7s for 292). The
  `compile-css.ts` sanitiser is now wider AND tested; the DS-13 leak gate can safely safelist
  arbitrary-value utilities.
- **Phase 11 (GATE-01)** — baselines must be shot after this plan as well as after 10-12. Nine portal
  layers moved from z-index 50 to 30. Relative order is preserved and no visual change is expected,
  but a screenshot taken before this plan is invalid for the same reason 10-12's was.
- **Phase 18 (map)** — the rule is unchanged and now has a second home: wrap Leaflet in a CSS
  stacking context (`isolate`); do not inflate the scale. Recorded in `globals.css`, in
  `elevation-z.test.ts`'s blind-spot list, and asserted nowhere, because nothing here can catch it.
- **e2e health (D-6)** — item 1 is now proven pre-existing twice, at two different baselines, and has
  a sharper reproduction (order-sensitive, not purely date-derived). It is the drop-in surface, which
  is core value; whoever owns e2e health next should start from the D-6 UPDATE rather than re-deriving
  causality a third time.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 15 modified files verified on disk plus this file, and all 3 task commits verified in `git log`
(`8ab6cfd`, `598b6d0`, `3a51ded`). `REQUIREMENTS.md` re-read after the mark: **DS-03 now reads
`Complete`** in both the checklist (line 18) and the traceability table (line 178) — the accurate
state, since both of its clauses now hold and 10-12 held the ID open specifically for this plan.
`deferred-items.md` re-read: the **D-6 UPDATE** is present with the `45ecf07` reproduction. `ROADMAP.md`
Phase 10 progress reads **13/17, In Progress** (`roadmap.update-plan-progress 10` re-run AFTER this
file existed, so the summary count is 13 rather than 12). STATE.md's frontmatter, Current Position,
the metrics row and the four new Decisions entries were hand-written, as the toolchain notes prescribe
after `state.add-decision` rejected its positional argument and `state.record-session` reported
missing fields. Working tree confirmed clean of stray files before the docs commit; the two probe
scripts written during this plan live in the session scratchpad, never in the repo.
