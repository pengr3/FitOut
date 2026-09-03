---
phase: 10-design-system-foundation-theme-runtime
plan: 14
subsystem: design-system
tags: [design-system, theming, dark-mode, palette-leak, source-scan, pinned-count, THEME-05, DS-13, D-15, D-17]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 04
    provides: "the two-theme colour contract in globals.css and the declared token set every rewrite chose from"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 05
    provides: "config/design-leak-patterns.mjs — the single source of truth for `palette-class` and `white-black-class`"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 07
    provides: "the walker + Windows path-normalisation idiom, AND the two focus-ring removals that moved the vendored count 56 -> 54 (deferred item D-2)"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 10
    provides: "STATUS_TONE_RECIPES and D-14 — the rule that decided both numbered greens"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 12
    provides: "the `(?<![\\w-])` call-site lookbehind, and via D-1 the narrowed Tailwind content root that makes compiled-output checks sound"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 13
    provides: "the negative-utility finding that made the boundary probe in this plan mandatory rather than optional"
provides:
  - "**THEME-05 CLOSED.** Zero `dark:` occurrences survive under `src/app/**` or `src/components/**` outside `src/components/ui/**`; the 54 vendored survivors are pinned as a number"
  - "The last 18 raw palette-class CODE occurrences in the app tree are gone, including the one vendored site (D-17, no exemption) — DS-13's violations are cleared ahead of 10-17's gate"
  - "`tests/design/dark-scope.test.ts` — 8 assertions, watched red FOUR ways, with two controls on the metric itself"
  - "A corrected THEME-05 requirement text: the vendored count is 54 and the metric is OCCURRENCES, both stated in REQUIREMENTS.md so the stale 56 cannot be 'restored'"
affects: [10-15, 10-16, 10-17, 11]

# Tech tracking
tech-stack:
  added: []   # no dependency installed; 18 class-string rewrites, 4 comment rewrites, 1 new test file
  patterns:
    - "State the METRIC beside the number. This tree yields 54 (occurrences), 24 (lines) and 14 (files) for the same property; three plans quoted three of them as if they were one."
    - "A text scan cannot tell a Tailwind variant from a TypeScript object key — `dark:` and `dark: 1` are the same five characters after whitespace. Count it twice (loose + variant-shaped) and assert the two agree."
    - "Probe the preceding-character histogram of every match BEFORE trusting a substring count. 10-13 lost two dividers to `-` being a word boundary; the histogram is the cheap general form of that check."
    - "An alpha modifier is part of a value. Migrating `bg-black/10` to a token means `bg-foreground/10`, not the stock library's `/50` — the plan named the token AND an alpha, and only the token was the leak."
    - "A hue that has no text-bar row in the contrast inventory cannot be the answer for text, no matter what the source colour was. `--success` has only a 3:1 row, by construction."

key-files:
  created:
    - tests/design/dark-scope.test.ts               # Task 2 — 8 assertions, the pinned 54
  modified:
    - src/app/(app)/layout.tsx                      # Task 1 (COMMENT only)
    - src/app/(app)/profile/profile-form.tsx        # Task 1
    - src/app/(auth)/layout.tsx                     # Task 1 (2 sites + 2 variants)
    - src/app/(auth)/login/page.tsx                 # Task 1 (2 sites + 2 variants)
    - src/app/(auth)/signup/page.tsx                # Task 1 (3 sites + 3 variants)
    - src/app/(host)/host/layout.tsx                # Task 1 (1 site + 1 variant + COMMENT)
    - src/components/ui/dialog.tsx                  # Task 1 (the one vendored site, D-17)
    - src/components/booking/bookings-tabs.tsx      # Task 2 (2 variants)
    - .planning/REQUIREMENTS.md                     # THEME-05 count corrected 56 -> 54
    - .planning/phases/10-.../deferred-items.md     # D-8 new; D-6 UPDATE

key-decisions:
  - "THE PIN IS 54, NOT THE PLAN'S 56, and the metric is OCCURRENCES. Plan 10-07 removed two alpha-diluted focus rings and their dark-mode twins closing deferred item D-2; 10-12, 10-13 and now 10-14 each measured 54 independently. The same tree is 24 by LINES and 14 by FILES — three numbers this phase has already conflated once, so the test states which one it pins and why it moved."
  - "The dialog scrim keeps its 10% alpha. The plan prescribed `bg-foreground/50`; the shipped overlay was `bg-black/10` PAIRED WITH A BACKDROP BLUR. The leak was the absolute black, not the alpha, and taking the plan literally would have darkened every modal in the app fivefold."
  - "Neither numbered green became `--success`. D-14 puts status hue in an ICON and `contrast-pairs.ts` has no text-bar row for `--success` because 0.58-lightness green cannot clear 4.5 on a light surface. Both are transient confirmations that render only on success, so the colour was decoration; they became neutral ink and the glyph option is logged as D-8."
  - "2 of the plan's 20 palette occurrences are COMMENTS — the 13th grep-versus-comment collision this phase, and the first to appear in DUPLICATE (the same D-92 paragraph is pasted into both shell layouts). 18 code occurrences were rewritten; both comments were rewritten descriptively per the booking-row.tsx:111 convention."
  - "Task 1 deleted 8 `dark:` occurrences, not Task 2. Eight of the ten app variants ARE palette classes, and Task 1's own acceptance criterion scans for the palette pattern in raw file text — so leaving them for Task 2 would have failed Task 1."
  - "THEME-05 marked Complete; DS-13 left Pending. This plan removes DS-13's last violations; 10-17 owns the gate that makes them stay removed."

patterns-established:
  - "Probe the match's neighbourhood before pinning a substring count: a preceding-character histogram over the whole tree answers 'is every hit really the thing I think it is' in one run, and it generalises 10-13's `-z-10` finding instead of re-learning it per-utility."
  - "Two counts of the same property, computed differently, are a control on the metric. Loose-versus-strict catches a shape that is not the thing; raw-versus-comment-stripped catches prose about the thing."

requirements-completed: [THEME-05]

# Metrics
duration: 30min
completed: 2026-08-12
---

# Phase 10 Plan 14: Palette Classes → Tokens, and the Vendored `dark:` Count as an Asserted Number Summary

**The half-built second colour scheme is gone from app code and every surface paints from a token — and the number this plan was told to pin had been wrong for seven plans, in a phase that has already measured the same property three different ways**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-11T19:38Z
- **Completed:** 2026-08-11T20:05Z
- **Tasks:** 2 (both `auto`, no checkpoints)
- **Files:** 1 created, 8 modified (plus 2 planning documents)

## Accomplishments

- **THEME-05 is closed.** Zero `dark:` occurrences survive anywhere under `src/app/**` or
  `src/components/**` outside the vendored tree — all 10 removed, from the 5 files the plan named,
  in exactly the per-file distribution it predicted (2 / 2 / 3 / 1 / 2). The mechanism stays: the
  custom-variant declaration and the dormant block in `globals.css` are both asserted present, because
  D-129 as amended keeps a cheap future theme (D-03) even while the app tree carries no variant.
- **Every raw palette class in the app AND in the vendored primitives is gone.** 18 code occurrences
  across 6 files, plus the one vendored site — `ui/dialog.tsx`'s overlay, which D-17 refuses to exempt
  and which measured exactly the one fix the plan predicted. `grep -rEc "bg-(black|white)\b"` over
  both trees now returns nothing, and running the two exported leak patterns over all 150 in-scope
  files returns zero hits. DS-13's violations are cleared ahead of 10-17's gate.
- **THE PINNED COUNT IS 54, AND THE PLAN SAID 56.** This is the headline finding and it was known
  before the plan was written — deferred item D-2 recorded it when 10-07 closed, and 10-12 and 10-13
  each re-measured it. 10-07 removed the `destructive` variant's alpha-diluted focus ring from
  `ui/button.tsx` and, via the widening D-2 asked for, from `ui/badge.tsx` as well; removing an
  override honestly takes its second-scheme twin with it, and there were exactly two. 56 − 2 = 54.
  Pinning 56 as written would have shipped a red gate, and "fixing" it by putting two variants back
  would have put two accessibility defects back with them.
- **Worse than a stale number: three numbers.** The same tree yields **54** by occurrences
  (`grep -rho | wc -l`), **24** by lines (the `awk -F: '{s+=$2}'` form written into this plan's own
  acceptance criteria, and into 10-07's), and **14** by files. All three were measured here and all
  three are recorded in the test's header, with the pinned one named explicitly. THEME-05's own text
  in `REQUIREMENTS.md` has been corrected to 54 with the metric stated, so the stale number cannot be
  restored by a reader who only sees the requirement.
- **The regex-boundary hazard was probed, not assumed.** 10-13's warning is that `\bz-10\b` matches
  inside `-z-10`. The general form of that check is cheap: a preceding-character histogram over every
  `dark:` in `src/` returns exactly one bucket — a space, 64 occurrences, no `-`, no compound
  `group-` form, and zero occurrences on comment-shaped lines. So the substring metric is sound
  *today*. The gate does not rely on that staying true: it counts twice.
- **The gate was watched go red FOUR ways**, and the spread is the useful part. A variant reinstated
  in app code → **1 failed / 7 passed**. One vendored occurrence deleted → **2/6** (the pin AND the
  file count). An object key named `dark` added → **2/6** (the metric control fires before the pin's
  meaning is corrupted). The Windows path normalisation removed → **5 failed / 3 passed**, which is
  T-10-27 exactly: the app-zero assertion is one of the three that still PASSES in that case, because
  a partition that classified nothing as app code has zero app violations. That is the whole reason
  the positive control names one file on each side.
- **Design gate 300/300** (was 292), DB-free, ~5.1s. Full DB suite **1197 passed / 4 skipped**,
  unchanged. `tsc --noEmit` exit 0, `npm run build` exit 0, lint **0 errors / 9 warnings** — unchanged
  from the phase baseline. `npm run test:e2e` 17 passed / 1 failed / 5 did not run, the failure being
  D-6 item 1 with a byte-identical signal for the third time.

## The two numbered greens, and why neither became `--success`

The plan's mapping says a numbered green "becomes `--success` only if it is a status signal". Both
sites are status signals — `(auth)/login`'s "Password updated — please sign in." and `profile`'s
"Profile saved." both carry `role="status"`. Neither became `--success`, and the reason is arithmetic
rather than taste.

**`--success` has no text-bar row in `contrast-pairs.ts`, by construction.** It appears three times,
all at the 3:1 NON-TEXT bar, each noted "the hue lives in the icon, never in the text" (D-14). A
0.58-lightness green cannot clear 4.5 on a light surface, which is why 10-10 retired four filled green
chips and moved the hue into the glyph. `text-success` on a sentence would have been a DS-06 violation
that **the contrast suite could not have caught**, because the pairing exists — at the wrong bar.

That leaves two honest outcomes: neutral, or neutral plus a success glyph. This plan took neutral,
because both of these render **only** in the success case and each one's own sentence is the entire
signal — so the colour was decoration, which is precisely what DS-10 pushes back on. The four chips
10-10 re-treated were a different shape: a persistent lifecycle state sitting in a column beside its
siblings, where the tone genuinely distinguishes. The glyph option is not lost — it is logged as
**deferred item D-8** with the reason it was not taken here, which is a gate rather than laziness:
`status-vocab.test.ts:369` asserts the positive-icon set equals four files BY NAME and `:372` requires
each to carry all three recipe slots, and `profile-form.tsx`'s bare inline `<p>` has no surface to
tint. Taking it means splitting that pin into chip and inline categories, in a file 10-10 owns.

## Task Commits

1. **Task 1: The palette-class rewrites** — `a23c4f9` (refactor)
2. **Task 2: The `dark:` strip and the pinned-count gate** — `1a2939f` (test)

**Plan metadata:** see the `docs(10-14)` commit that carries this file.

## Files Created/Modified

- **`(auth)/layout.tsx` — 4 occurrences on 2 elements.** The shell surface (a numbered neutral with an
  absolute-black twin) → `bg-muted`; the wordmark (an absolute black with a numbered-neutral twin) →
  `text-foreground`. `foreground` on `muted` is a declared pairing at 18.16 court / 16.89 grove.
- **`(auth)/signup/page.tsx` — 6 occurrences on ONE element.** The selected intent radio was an
  absolute-black fill with absolute-white ink plus a fully inverted twin. It is now the neutral CONTROL
  fill — `border-primary bg-primary text-primary-foreground` — which is D-21's point exactly: an
  un-varianted control paints `--primary`, never the accent, and its label pairing is declared at the
  4.5 text bar.
- **`(auth)/login/page.tsx` and `(app)/profile/profile-form.tsx`** — see the section above.
- **`(host)/host/layout.tsx`** — the host header → `bg-muted`, keeping D-04's "the host shell is
  visibly distinct" intent while making the distinction a token instead of a frozen value.
- **`ui/dialog.tsx` — the one vendored site, and the one place the plan was followed only halfway.**
  `bg-black/10` → `bg-foreground/10`. Verified in the shipped stylesheet as
  `color-mix(in oklab, var(--foreground) 10%, transparent)`, so the scrim now tints with grove's ink
  instead of staying an absolute black inside a themed subtree. The alpha is deliberately unchanged —
  see Deviation 2.
- **The two duplicated comments.** `(app)/layout.tsx:40` and `(host)/host/layout.tsx:58` are the SAME
  D-92 paragraph pasted into both shell layouts, and both quote the class the host header used to
  carry. Rewritten descriptively per the convention `booking-row.tsx:111` established, with the reason
  stated in the comment so it does not get "clarified" back.
- **`booking/bookings-tabs.tsx`** — the last 2 app variants. This file transcribes the vendored
  `tabs.tsx` trigger, so it now diverges from the recipe it copies in exactly the dark-scheme aspect.
  That divergence is stated at the constants, with a "do NOT restore them here to match tabs.tsx"
  and a pointer to the pinned count — written without naming the prefix, because this file is inside
  the tree the new gate scans.
- **`tests/design/dark-scope.test.ts`** — 8 assertions in three blocks. A positive-control block
  (app partition > 100 files, 14 vendored files with hits, `ui/button.tsx` and `booking/bookings-tabs.tsx`
  asserted on opposite sides AND asserted *not* on the wrong side, an exhaustive-partition
  reconciliation proving no file fell through all three predicates, and the two metric controls);
  THEME-05's app-code zero with the `path:line` list rendered into the failure message; and the pinned
  54 plus the two `globals.css` survivals. The banned prefix is assembled from a template literal so
  the constant's own declaration cannot be mistaken for a call site by a future scanner that walks
  `tests/` too.

## Decisions Made

- **The pin is 54, the metric is OCCURRENCES, and both are stated in the test and in REQUIREMENTS.md.**
- **The dialog scrim keeps 10% alpha.** See Deviation 2.
- **Neither green became the semantic green.** See the section above; the alternative is D-8.
- **Task 1 owns 8 of the 10 variant removals**, forced by its own acceptance criterion.
- **`bg-muted` rather than `bg-background` for the two shell surfaces.** Both were a numbered neutral
  at the 50 end, which is the plan's stated `bg-muted` mapping, and both exist to be *distinguishable*
  from the page — mapping them to `bg-background` would have deleted the distinction D-04 asks for.
- **THEME-05 Complete, DS-13 still Pending.** 10-17 owns the gate; this plan owns the violations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The pinned count is 54, not the plan's 56 — and pinning 56 would have shipped a red gate**

- **Found during:** Task 2 `read_first`, and re-measured before any edit
- **Issue:** The plan's `must_haves`, its Task 2 action (`expect(vendoredDarkCount).toBe(56)`), its
  acceptance criteria and its `artifacts.contains` all say **56**. The tree holds **54**. Plan 10-07
  closed deferred item D-2 by removing `focus-visible:ring-destructive/20` from `ui/button.tsx` and —
  via the widening D-2 explicitly asked for — from `ui/badge.tsx`; each removal took its second-scheme
  twin with it. D-2 records the drop verbatim, and 10-12 and 10-13 both re-verified 54 in their
  SUMMARY verification tables. Compounding it, D-2 also records that this phase has read this property
  as three different numbers, and the `awk -F: '{s+=$2}'` form in this plan's own criteria computes
  the LINE sum (24), which matches neither.
- **Fix:** Pinned `toBe(54)` with the move from 56 explained at the assertion and in the file header,
  and with the metric named. All three metrics were measured and recorded: 54 occurrences / 24 lines /
  14 files. `REQUIREMENTS.md`'s THEME-05 text was corrected in the same pass, because marking a
  requirement Complete while its own wording asserts a false number is how the stale number survives.
- **Files modified:** `tests/design/dark-scope.test.ts`, `.planning/REQUIREMENTS.md`
- **Verification:** `grep -c "toBe(54)"` returns 1 and `toBe(56)` returns 0; the gate is green at 54
  and goes red at 55 (probe D) and at 53 (probe B).
- **Committed in:** `1a2939f`

**2. [Rule 1 - Bug] The dialog scrim's alpha is 10%, and the plan prescribed 50% — a fivefold darkening of every modal**

- **Found during:** Task 1 `read_first`, at `ui/dialog.tsx:42`
- **Issue:** The plan says "Replace it with `bg-foreground/50`". The shipped overlay is **`bg-black/10`**,
  paired on the same element with `supports-backdrop-filter:backdrop-blur-xs`. The pair was tuned
  together — the blur does the occluding and the tint only darkens — and `/50` is the stock shadcn
  value for an overlay that has no blur. Following the instruction verbatim would have darkened the
  scrim behind every dialog, dropdown-adjacent modal and confirmation in the app by 5×, and every
  acceptance criterion in the plan would still have passed: they check `bg-black` is absent and
  `bg-foreground/` is present, and neither reads the alpha.
- **Fix:** `bg-foreground/10` — the leak was the absolute black, not the alpha. The plan's own
  `key_links.pattern` is `bg-foreground/`, which this satisfies. Verified in the shipped stylesheet as
  `color-mix(in oklab, var(--foreground) 10%, transparent)`, and value-preserving in court
  (`--foreground` is `oklch(0.145 0 0)`) while newly theme-following in grove (`oklch(0.17 0.02 190)`).
  The reasoning is recorded above the component so it is not "corrected" to the stock value later.
- **Files modified:** `src/components/ui/dialog.tsx`
- **Verification:** `grep -c "bg-black" src/components/ui/dialog.tsx` → 0; the compiled rule read back
  from `.next/static/chunks/*.css`; `npm run test:e2e` exercised real dialogs with 17 passing.
- **Committed in:** `a23c4f9`

**3. [Rule 1 - Bug] 2 of the plan's 20 palette occurrences are COMMENTS, and they are DUPLICATED**

- **Found during:** Task 1 inventory, before any edit
- **Issue:** The plan (and RESEARCH § Landmines L7, and `10-PATTERNS.md:1035`) counts **20 across 7
  files**. The raw count is 20 — but `(app)/layout.tsx:40` and `(host)/host/layout.tsx:58` are the
  SAME D-92 paragraph pasted into both shell layouts, each quoting the class the host header carried.
  So there are **18 code occurrences across 6 files**, and `(app)/layout.tsx` — a file in the plan's
  own `files_modified` list — has no class to change at all. This is the 13th occurrence of this
  phase's grep-versus-comment collision and the first to arrive in duplicate.
- **Fix:** Rewrote both comments descriptively, per the convention `booking-row.tsx:111` and
  `host-booking-row.tsx:121` established, with the reason stated in the comment. Rewriting them was
  not optional: Task 1's first acceptance criterion runs the exported patterns over raw file text, so
  a comment quoting the class fails it exactly as a call site would.
- **Files modified:** `src/app/(app)/layout.tsx`, `src/app/(host)/host/layout.tsx`
- **Verification:** the pattern scan over all 150 in-scope files returns 0 hits in 0 files.
- **Committed in:** `a23c4f9`

**4. [Rule 2 - Missing] Neither numbered green could legally become `--success`, and the plan's mapping does not say so**

- **Found during:** Task 1, choosing replacements for `login/page.tsx:48` and `profile-form.tsx:254`
- **Issue:** The plan says a numbered green "becomes `--success` only if it is a status signal". Both
  ARE status signals (`role="status"`), so the literal reading gives `text-success` on TEXT — which
  D-14 forbids structurally and which `contrast-pairs.ts` cannot catch, because `--success` appears
  there three times and every row is the 3:1 NON-TEXT bar. A 0.58-lightness green cannot clear 4.5 on
  a light surface; that is why 10-10 retired four filled green chips rather than re-solving the token.
- **Fix:** Both became neutral ink — the notice takes the neutral tint with full-contrast ink, the save
  line takes secondary ink — with the arithmetic recorded at each site so neither gets "restored" to a
  green. The alternative (keep the signal, move the hue into a `CheckCircle2`) is logged as **D-8**
  with the pinned gate that blocks it from this plan's scope.
- **Files modified:** `src/app/(auth)/login/page.tsx`, `src/app/(app)/profile/profile-form.tsx`,
  `.planning/phases/10-.../deferred-items.md`
- **Verification:** `npm run test:design -- contrast` green; `status-vocab.test.ts`'s four-file
  positive-icon set unmoved (300/300 overall). Both files were deliberately written WITHOUT the string
  `text-success` anywhere, including in their comments — naming it would have added them to that
  pinned set through a comment, which is the same collision as Deviation 3 in a different gate.
- **Committed in:** `a23c4f9`

**5. [Rule 3 - Blocking] Task 1 had to delete 8 `dark:` occurrences that the plan assigns to Task 2**

- **Found during:** Task 1 acceptance verification
- **Issue:** The plan sequences the palette rewrite first and the variant strip second, "so do this
  pass after the palette rewrite rather than before it". But 8 of the 10 app variants ARE palette
  classes (`dark:bg-black`, `dark:text-zinc-50`, `dark:bg-emerald-950`, `dark:text-emerald-200`,
  `dark:border-white`, `dark:bg-white`, `dark:text-black`, `dark:bg-zinc-900`), and Task 1's first
  criterion runs the palette pattern over raw file text — which matches a variant-prefixed class just
  as readily as a bare one. Leaving them for Task 2 fails Task 1.
- **Fix:** Deleted them in Task 1 rather than rewriting them, which is what Task 2 would have done
  anyway. Task 2 removed the remaining 2 (both in `bookings-tabs.tsx`, both already semantic tokens)
  and built the gate. Every file the plan named is still touched; only the task boundary moved.
- **Files modified:** the four `(auth)`/`(host)` files, in Task 1's commit
- **Verification:** app-code `dark:` count 10 → 2 after Task 1, → 0 after Task 2, each measured.
- **Committed in:** `a23c4f9`, `1a2939f`

**6. [Rule 2 - Missing] A substring count of `dark:` cannot tell a variant from an object key, and nothing in the plan guards it**

- **Found during:** Task 2, while building the boundary probe 10-13's finding demands
- **Issue:** The probe was written to answer 10-13's question — does the match ever land inside a
  larger token, the way `\bz-10\b` lands inside `-z-10`? The answer today is no: every one of the 64
  occurrences in `src/` is preceded by a space and none sits on a comment line. But the histogram
  exposes a *different* hazard the same evidence implies: an indented TypeScript property named `dark`
  — `theme: { dark: "…" }` — is also preceded by a space and is textually identical to a variant.
  There are zero today. A pinned number that can be moved by an unrelated object literal is not a pin.
- **Fix:** The gate counts twice. LOOSE is the historical `grep -rho` metric and stays the pinned one
  so the number remains comparable across the phase; STRICT re-counts with 10-12's `(?<![\w-])`
  lookbehind plus a utility-shaped lookahead, and a third count runs over comment-stripped text. Both
  are asserted equal to LOOSE, so an object key, a compound `group-`-prefixed variant, or a comment
  quoting the prefix each turn a silent drift into a named failure.
- **Files modified:** `tests/design/dark-scope.test.ts`
- **Verification:** probe D (an object key `dark: 1` inserted into `ui/avatar.tsx`) → **2 failed / 6
  passed**, the metric control firing alongside the pin.
- **Committed in:** `1a2939f`

---

**Total deviations:** 6 (3 × Rule 1, 2 × Rule 2, 1 × Rule 3). No Rule 4 checkpoint was needed.
**Impact on plan:** Every site the plan intended to migrate is migrated and every acceptance criterion
holds on its intent. Two numeric criteria were satisfied against the measured tree rather than the
plan's text (54 not 56; 18 code occurrences not 20), and one instruction — `bg-foreground/50` — was
deliberately not followed, because following it would have shipped a visible regression in every modal
that the plan's own criteria could not have detected.

## Deferred Issues

**One new: D-8.** The two transient positive confirmations now carry no positive affordance at all —
neutral ink, no glyph. The full reasoning is in
`.planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md`; the short version is
that the only way to keep a positive signal under D-14 is a `CheckCircle2` in the success hue, and
adding one grows a set `tests/design/status-vocab.test.ts:369` pins BY NAME to four files while
`:372` requires each of those four to carry all three slots of the `positive` recipe — which
`profile-form.tsx`'s surfaceless inline `<p>` cannot. That is the D-7 shape: a rewire whose gate lives
in another plan's file. Owner: Phase 11's visual pass (GATE-01).

**One existing item gained a third confirmation.** A `D-6 UPDATE` records that `npm run test:e2e`
produced a byte-identical signal again — 17 passed / 1 failed / 5 did not run, `e2e/open-capacity.spec.ts:376`,
same locator, same `element(s) not found`. Causality was **not** re-derived, deliberately: 10-13 asked
the next executor not to, and this plan changes only class strings, comments and one test file. What
WAS verified, because this plan edits two auth routes (T-10-29): `login-persistence.spec.ts:23` and
`password-reset.spec.ts:51` were re-run on their own and both pass, and `stale-session-selfheal.spec.ts:90`
passed inside the full run.

## Issues Encountered

- **The plan's central number had been stale for seven plans, and the correction was already written
  down.** D-2 recorded the 56 → 54 drop when 10-07 closed; 10-12 and 10-13 both re-measured it and
  both said so in their summaries. The plan was nonetheless written against 56 in four separate
  places. The lesson is not "measure before you pin" — every plan in this phase says that — it is that
  a corrected number in a deferred-items file does not propagate back into the requirement it
  corrects. `REQUIREMENTS.md` now carries the correction at the source.
- **The grep-versus-comment collision arrived in DUPLICATE for the first time.** Both shell layouts
  carry the same pasted D-92 paragraph, so one comment inflated the inventory by two and put a file in
  the plan's `files_modified` list that had no class to change.
- **The boundary probe found no boundary bug and was still worth running.** 10-13's `-z-10` finding
  makes a preceding-character histogram cheap due diligence; here it came back clean in one bucket,
  and in the process surfaced the object-key hazard that Deviation 6 addresses. A probe that confirms
  the obvious is not wasted if it changes what you assert.
- **`gsd-sdk`'s `state.add-decision` and `state.record-session` remain broken in v1.42.3** (the known
  positional-argument bug). STATE.md's frontmatter, Current Position, metrics row and Decisions were
  hand-written per the toolchain notes. `requirements.mark-complete THEME-05` and
  `roadmap.update-plan-progress 10` both worked.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- dark-scope` | exit 0 — **8 passed** (plan asked for ≥5) |
| Observed RED: a variant reinstated in `bookings-tabs.tsx` | **1 failed / 7 passed** |
| Observed RED: one vendored occurrence deleted from `ui/avatar.tsx` | **2 failed / 6 passed** — the pin AND the 14-file count |
| Observed RED: an object key `dark: 1` added to `ui/avatar.tsx` | **2 failed / 6 passed** — the metric control fires |
| Observed RED: the Windows path normalisation removed from the test | **5 failed / 3 passed** — T-10-27; the app-zero assertion is one of the 3 that still passes |
| Observed GREEN after every revert | exit 0 — **8 passed** |
| `npm run test:design` (whole gate) | exit 0 — 15 files, **300 passed** (was 292), ~5.1s, no database |
| `npm run db:up && npm run db:test:setup && npm test` | exit 0 — **1197 passed / 4 skipped**, unchanged |
| Palette + white/black patterns over all 150 in-scope files | **0 occurrences, 0 files** (was 20 / 7) |
| `grep -rEc "bg-(black\|white)\b" src/app src/components` | no output |
| `grep -c "bg-black" src/components/ui/dialog.tsx` | **0** |
| App-code `dark:` (src/app + src/components, excluding `ui/`) | **0** (was 10 across 5 files) |
| Vendored `dark:` — OCCURRENCES / LINES / FILES | **54 / 24 / 14** |
| Preceding-character histogram, every `dark:` in `src/` | one bucket: `" "` × 54 — no `-`, no compound form |
| `dark:` on comment-shaped lines anywhere in `src/` | **0** |
| `grep -c "@custom-variant dark" src/app/globals.css` | **1** — asserted in the gate too |
| `grep -c "^\.dark {" src/app/globals.css` | **1** — asserted in the gate too |
| `grep -c "toBe(54)"` / `grep -c "toBe(56)"` in the gate | **1** / **0** |
| Compiled `.bg-foreground\/10` | `color-mix(in oklab, var(--foreground) 10%, transparent)` |
| Compiled `.bg-muted` / `.bg-primary` / `.text-primary-foreground` | `var(--muted)` / `var(--primary)` / `var(--primary-foreground)` |
| Compiled `.bg-zinc-50` / `.bg-black` / `.text-emerald-*` / `.text-green-600` | **absent** from the shipped stylesheet |
| `npx tsc --noEmit` | exit **0** |
| `npm run build` | exit **0** |
| `npm run lint` | **0 errors / 9 warnings** — unchanged from baseline |
| `npm run test:e2e` | **17 passed / 1 failed / 5 did not run** — D-6 item 1, third identical signal |
| `npx playwright test login-persistence password-reset` | **2 passed** — T-10-29 discharged on real routes |
| `git diff --diff-filter=D` on both commits | no file deletions |
| `git status --short` after each commit | clean |

## Known Stubs

None. Every edit is a real class swap on a real rendered surface, verified to compile from the
production stylesheet rather than merely to be present in source. The 54 vendored survivors are **not**
a stub: they are provably-inert dead code kept on purpose, with the reason recorded, the number
asserted, and the mechanism they depend on (`@custom-variant`, the dormant block) asserted present in
the same file.

## Threat Flags

None. This plan changes 18 class strings, 4 comments and one new test file. No network endpoint, auth
path, file access pattern or schema change; `drizzle/` untouched at `0025` (GATE-06).

Threat register dispositions honoured: **T-10-27** (a path-prefix partition broken by Windows
backslashes silently classifies every file as one side, making both assertions meaningless) — the
normalisation line is copied verbatim from `tests/use-server-exports.test.ts:302`, the positive control
pins 14 vendored files, >100 app files and one named file on each side *plus* the negative
(`ui/button.tsx` is asserted **not** in the app partition and vice versa), an exhaustive-partition
reconciliation proves no file fell through all three predicates, and **the collapse was measured**: the
line removed gives 5 failed / 3 passed. **T-10-28** (a future `npx shadcn add` moves the pin silently)
— `toBe(54)` with the rationale, the metric and the 56 → 54 history in the `it()` name and the file
header, plus two controls so the number cannot be moved by something that is not a variant at all.
**T-10-29** (auth-route edits) — accepted as planned and then verified rather than argued: the edits
are class strings and one comment only, no form field, action target, validation or session handling
was touched, and both auth e2e specs were re-run standalone and pass.

## Next Phase Readiness

- **10-17 (the DS-13 gate)** — its violations are now **zero**: the two exported patterns return no
  hits across all 150 in-scope files, including the vendored tree D-17 refuses to exempt. 10-17 should
  observe its gate red by injecting a leak, not by finding one. Note the shape this plan hit twice: a
  comment quoting a banned string is indistinguishable from a call site to `config/design-leak-patterns.mjs`,
  which scans raw text — the ESLint rule will report on comment lines unless it is node-scoped.
- **10-15 / 10-16** — `tests/design/dark-scope.test.ts` is self-contained and adds ~0.1s. A
  `/dev/theme` page under `src/app/**` grows the app partition (>100 still holds comfortably at 120)
  and must not carry the variant; if it demonstrates the dormant block, that is a conscious change to
  THEME-05's app-code zero and belongs in the same commit.
- **Phase 11 (GATE-01)** — baselines must be shot after this plan. Six real surfaces changed colour:
  both shell backgrounds, the auth wordmark, the signup intent selector, two status messages, and the
  dialog scrim (now theme-tinted). **D-8 is the visual pass's to judge** — whether a confirmation that
  looks identical to ordinary secondary text still reads as confirmation.
- **e2e health (D-6)** — item 1 now has three identical reproductions at three baselines. Start from
  the D-6 entry; do not re-derive causality a fourth time.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 9 files verified on disk (1 created, 8 modified) plus this file and the two planning documents, and
both task commits verified in `git log` (`a23c4f9`, `1a2939f`). `REQUIREMENTS.md` re-read after the
mark: **THEME-05 reads `Complete`** in both the checklist (line 37) and the traceability table (line
194), and its wording now carries the corrected count of **54** with the metric named. **DS-13 is
deliberately still `Pending`** — this plan removes its last violations, but 10-17 owns the gate that
keeps them removed, and marking it here would claim an enforcement that does not exist yet.
`deferred-items.md` re-read: **D-8** is present with the `status-vocab.test.ts:369/:372` gate that
blocks the glyph, and the **D-6 UPDATE** records the third identical e2e signal plus the two passing
auth specs. `ROADMAP.md` Phase 10 progress reads **14/17, In Progress** (`roadmap.update-plan-progress 10`
re-run AFTER this file existed, so the summary count is 14 rather than 13). STATE.md's frontmatter,
Current Position, metrics row and Decisions were hand-written, as the toolchain notes prescribe after
`state.add-decision` rejected its positional argument. Working tree confirmed clean of stray files
before the docs commit; the three probe scripts written during this plan live in the session
scratchpad, never in the repo, and every mutation they made was restored and re-verified green.
