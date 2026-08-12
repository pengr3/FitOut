---
phase: 10-design-system-foundation-theme-runtime
plan: 17
subsystem: design-system
tags: [eslint, build-gate, DS-13, DS-06, DS-04, leak-scan, pair-drift, observed-red, reduced-motion, checkpoint-discharged]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`vitest.design.config.ts` — the DB-free config this plan wires into `build`, and `config/design-leak-patterns.mjs`, the one shared pattern list both gates now read"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 02
    provides: "`readThemeTokens()` — the single stylesheet parser the drift check reads its colour vocabulary and its alias groups out of"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 12
    provides: "the narrowed Tailwind content root, which is why `npm run lint` now measures 17s rather than RESEARCH's 85s"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 14
    provides: "a tree with zero DS-13 violations — the precondition for turning the gate on at all"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 15
    provides: "`src/lib/design/tokens.generated.ts` and the explicit handoff that `src/lib/design/**` must be EXCLUDED from the leak scan"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 16
    provides: "`/dev/theme` — the surface Task 3's human checkpoint is performed on — and D-9, whose disposition this plan owned"
provides:
  - "`fitout/no-raw-design-value` — an inline ESLint 9 flat-config plugin over the shared pattern list, zero new dependencies"
  - "`tests/design/leak.test.ts` — the authoritative DS-13 gate (18 assertions) with the observed-red evidence recorded in its own header"
  - "`tests/design/pair-drift.test.ts` — D-13's companion (13 assertions): every rendered fg/bg pairing must be a DECLARED one"
  - "**`build` is now `npm run lint && npm run test:design && next build`** — the only place DS-13's 'fails the build' can happen on Next 16, in a repository with no CI"
  - "A raw hex in a component has been WATCHED turning `npm run build` red, and the failing run is pasted into the guard that produced it"
  - "Two inventory rows the drift check found on its first run: the inverted surface (`ui/tooltip.tsx:45`, `listing/photo-uploader.tsx:278`)"
  - "D-9 dispositioned — ACCEPTED as debt, with the 119,835-byte figure re-verified without a rebuild"
  - "`e2e/reduced-motion.spec.ts` — DS-04's reduced-motion reset proven at the browser level in BOTH directions, promoting the requirement out of `10-VALIDATION.md` § Manual-Only"
  - "D-10 — DS-09's Pending state stated in `deferred-items.md` rather than left as an unexplained unticked box at the phase boundary"
affects: [11, 17]

# Tech tracking
tech-stack:
  added: []   # zero new npm dependencies; the ESLint plugin is defined inline (T-10-36)
  patterns:
    - "A gate that bans a string must not READ raw text. Both halves parse — ESLint visits `Literal`/`TemplateElement`, the Vitest gate visits the TypeScript AST's string literals and template chunks — so the phase's twelve grep-versus-comment collisions cannot recur inside the gate itself."
    - "Two consumers, one exported list, and the SHARED SCOPE is imported too. `eslint.config.mjs` spreads `LEAK_SCAN_GLOBS` rather than retyping the globs, so the halves cannot disagree about WHERE the rule applies any more than about WHAT it bans."
    - "A naive cross product over class strings is not a drift check. Variant chains must be compatible before a foreground and a background are treated as a rendered pairing, or mutually exclusive states synthesise a 1.1:1 phantom that is resolvable by neither of the two honest routes."
    - "When a check SKIPS something, pin the reason it is safe to skip. `dark:` utilities are excluded because nothing activates `.dark`; all four mechanisms that could change that are asserted, so the narrowing cannot outlive its justification."
    - "Verify an accepted-debt measurement without paying for it. Summing the emitted CSS chunks reproduced 10-16's 119,835 bytes exactly, with no clean rebuild."
    - "Before accepting `manual-only`, ask what the human would actually SEE. DS-04's prescribed manual check pointed at a control that shows no animation in EITHER state — its two outcomes were indistinguishable, so it would have been signed off as a pass. A manual check whose pass and fail look the same is not a weak test, it is a non-test."
    - "Assert that the EMULATION applied, not just the outcome. `test.use({ reducedMotion })` at describe level never reached the page and every assertion passed against a browser with no preference set."

key-files:
  created:
    - tests/design/leak.test.ts
    - tests/design/pair-drift.test.ts
    - e2e/reduced-motion.spec.ts                     # DS-04 mechanised (Task 3)
  modified:
    - eslint.config.mjs                              # the inline fitout/no-raw-design-value plugin
    - package.json                                   # the blocking build gate
    - src/lib/design/contrast-pairs.ts               # +2 rows, found by the drift check
    - .planning/phases/10-.../deferred-items.md      # D-9 DISPOSITION, then D-10 (DS-09)
    - .planning/phases/10-.../10-VALIDATION.md       # DS-04 promoted out of Manual-Only
    - .planning/REQUIREMENTS.md                      # DS-13 + DS-06 marked Complete
  deleted: []

key-decisions:
  - "The plan's naive cross product had to be narrowed TWICE before the drift check was honest. Without narrowing A, `ui/calendar.tsx:221` synthesises `text-foreground` on `bg-primary` — two mutually exclusive day states — which measures ~1.1:1 and is resolvable by NEITHER route the plan offers: adding the row declares a 1.1:1 pairing legal, and 'fix the component' means breaking a calendar that is not broken."
  - "The 2 rows the drift check demanded are REAL and both were measured before being declared: the inverted tooltip (19.80 court / 18.42 grove) and the photo uploader's 80% Cover chip (11.20 / 10.24), both against a 4.5 bar."
  - "Alias groups are DERIVED from token values, not typed. The plan names two groups; the stylesheet has six. A hand-written list would have been wrong on day one and silently wrong forever."
  - "`npm run lint` measures 17s on this box, not the 85s the plan told me to record. 10-12's content-root narrowing is the likely cause. Recording the plan's number would have been a false measurement in a phase whose whole argument is that measurements beat documents."
  - "D-9 ACCEPTED rather than fixed, with the reasoning written down: `@source not` would make `/dev/theme` render unstyled — the very surface Task 3's checkpoint is performed on — and a safelist is the second list D-16 and D-18 exist to abolish."
  - "DS-13 and DS-06 were held Pending across Tasks 1-2 until the D-11 verdict arrived, because a rejection could have re-derived `--brand` and moved every contrast measurement DS-06 rests on. D-11 was ACCEPTED, `--brand` did not move, and both are now Complete — closed by the input arriving, not by the deadline."
  - "DS-04's manual row was not merely automatable, it was UNTESTABLE by the route prescribed. The developer could not find a deterministic hand check because there is none: the Select they were pointed at computes `animation-name: none` by design, so reduced-motion ON and OFF look identical."
  - "DS-09 stays Pending at the phase boundary and is now the ONLY unticked Phase 10 requirement. It has an adoption clause that no static gate can answer — 'booker-facing primary action' is a judgement about a surface's role — so it is recorded as D-10 and owned by Phase 17, per the decision already written at `ui/button.tsx:80-83`."

patterns-established:
  - "Watch the gate go red from BOTH directions. The drift check was proven by removing inventory rows (the inventory-drifts direction) AND by injecting an undeclared pairing into a real component (the code-drifts direction). One run proves half a check."
  - "Restore from a copy, never from git, when mutation-checking a file. 10-15 lost uncommitted work to `git checkout --`; every one of this plan's five mutation checks restored from a backup copy in the scratchpad."
  - "A `manual-only` row is a claim, and claims get re-examined at the checkpoint that would discharge them. Two of this phase's four survived (both aesthetic); one was automated in Task 2; the fourth turned out to describe a check that could not have worked."
  - "When a test that has passed goes red on a clean `git status`, suspect the SERVER before the source. A dev server reused across a `git checkout` served the reverted-away stylesheet and named a defect that did not exist."

requirements-completed: [DS-13, DS-06]   # closed after the D-11 verdict; DS-09 deliberately left Pending, see D-10

# Metrics
duration: 21min (Tasks 1-2) + 13min (Task 3 discharge) = 34min
completed: 2026-08-12
---

# Phase 10 Plan 17: The Gates Go On — and One of Them Was Watched Going Red Summary

**`npm run build` now fails on a raw hex, and that sentence is true because a raw hex was put in `badge.tsx` and the build was watched failing — not because a test was written that says so**

## Status: COMPLETE — all 3 tasks, checkpoint discharged

Task 3's `gate="blocking"` human checkpoint returned an explicit **approved**. Two of its three items
were accepted by the developer on the screen; the third was not accepted, because it turned out not
to be a matter of taste at all — see the section below.

## Performance

- **Duration:** ~34 min total — ~21 min (Tasks 1-2) + ~13 min (Task 3 discharge)
- **Started:** 2026-08-12 05:42
- **Tasks 1-2 complete:** 2026-08-12 06:03
- **Task 3 complete:** 2026-08-12 10:39
- **Tasks:** 3 of 3 (2 `auto` + 1 `checkpoint:human-verify`) + 1 deviation-driven commit
- **Files:** 3 created, 6 modified, 0 deleted

## Accomplishments

- **DS-13's "fails the build" is structurally met for the first time.** `package.json`'s `build` is
  now `npm run lint && npm run test:design && next build`. This was the load-bearing change in the
  plan: Next 16 removed `next lint` and no longer runs ESLint during `next build` (landmine L1), and
  `.github/workflows` does not exist (landmine L2), so **the npm script layer IS the gate boundary**.
  Until this string changed, DS-13 was unmet no matter how good the test was.
- **The gate was watched failing, on the real build, and the run is pasted into the guard's own
  header.** `const LEAK_PROBE = "#ff0000";` at `src/components/ui/badge.tsx:18` — inside the vendored
  tree D-17 refuses to exempt — produced `npm run build` **exit 1** with
  `18:20  error  Raw design value "#ff0000" — use a design token (DS-13 / D-15)  fitout/no-raw-design-value`
  and `✖ 11 problems (1 error, 10 warnings)`. `&&` short-circuited, so neither the design gate nor
  `next build` ran — which is the correct behaviour and is stated in the header rather than left to
  be inferred. `npm run test:design -- leak` then caught the same probe **independently of ESLint**:
  **1 failed / 17 passed**, naming the file, the line, the pattern class and the matched text.
  Reverted; `npm run build` **exit 0 in 72s**.
- **Both gates read ONE list, and one SCOPE (D-16).** `eslint.config.mjs` imports
  `DESIGN_LEAK_PATTERNS` *and* spreads `LEAK_SCAN_GLOBS` into its `files:` key, so the two halves
  cannot disagree about where the rule applies any more than about what it bans. Zero new npm
  dependencies — the plugin is defined inline, which is T-10-36's disposition honoured rather than
  merely accepted.
- **10-15's handoff is asserted three ways, not honoured by omission.** `src/lib/design/**` is
  excluded from the scan because `tokens.generated.ts` carries hex literals by design. The test
  asserts the file was **walked**, is **not scanned**, and **WOULD produce ≥40 violations** if it
  were — so the exclusion is proven to be doing work rather than being an artifact of never looking.
- **D-17 is made checkable.** The positive control asserts all **30** vendored primitives were
  visited by name-count, plus `button.tsx`, `badge.tsx` and `dialog.tsx` individually — the last
  because `dialog.tsx:42` carried the one vendored `bg-black` at baseline. Without it,
  `expect(violations).toEqual([])` would pass just as happily against a scanner that visited nothing.
- **D-13's drift check found a real, undeclared pairing on its first run** — and exactly one. See the
  section below.
- **Design gate 375/375** (was 340 at 10-16's close), 20 files, DB-free. Full DB suite **1197 passed
  / 4 skipped**, unchanged. `tsc --noEmit` exit 0. `npm run lint` **0 errors / 9 warnings** —
  byte-identical to the phase baseline, with the new rule live.

## Task 3 — the checkpoint, item by item

The plan requires a **separate** verdict for each of the three, and they did not resolve the same
way, so recording them as one "approved" would have destroyed the only interesting result.

### Verdict 1 — SC#3, two plausible brand directions: **ACCEPTED** (human)

The developer viewed `/dev/theme` and accepted that the court and grove panes read as two plausible
alternate brand directions rather than as a test fixture. This is aesthetic acceptance and it stays
in `10-VALIDATION.md` § Manual-Only, correctly — there is no property here to automate. 10-16's
Chromium measurements already showed the two panes differ in hue, radius, type and elevation; what a
machine cannot say is whether the *result* is a credible brand, and a human has now said it is.

### Verdict 2 — D-11, the accent visibly deepens: **ACCEPTED** (human)

The developer accepted the deepened `--brand`. **The deepened token stands and no `--brand-strong`
escape hatch was introduced** — which is the outcome the plan's own guardrail was written to protect
(*"if item 3 is rejected, do NOT reintroduce a `--brand-strong` escape hatch on the spot"*). That
option was considered and rejected in CONTEXT § Specific Ideas, and it stays rejected.

**This verdict is what unblocked DS-06.** Tasks 1-2 deliberately left DS-06 and DS-13 `Pending`
because a rejection here was a scope decision that could have re-derived `--brand`, moving every
contrast measurement DS-06 rests on. It was accepted, `--brand` did not move, and both requirements
are now marked Complete. The requirement closed because its input arrived — not because the plan ran
out of tasks.

### Verdict 3 — DS-04, reduced motion: **NOT a human verdict. Mechanised, and proven.**

The developer reported they could not find a deterministic way to test this by hand. **They were
right, and the reason is structural rather than a matter of technique — the prescribed manual check
could not have worked.**

`src/components/ui/select.tsx:72` puts `data-[align-trigger=true]:animate-none` on the
`select-content` node, and `:71` sets `data-align-trigger={position === "item-aligned"}` — which is
Radix's default `position`, so the open element really does carry `data-align-trigger="true"`
(verified in a live Chromium, not inferred). Its `animation-name` therefore computes to **`none` by
design** whenever the panel aligns to its trigger. The Select therefore plays no animation with reduced motion **OFF**
either. A human watching it cannot distinguish "the reset is working" from "there was nothing here
to suppress" — the two outcomes are visually identical. **A manual check whose pass and fail look the
same is not a weak test; it is a non-test**, and had it been performed it would have been signed off
as a pass regardless of whether the reset existed.

So it was automated instead. `e2e/reduced-motion.spec.ts` (2 tests) drives the same media query the
reset is written against via `page.emulateMedia({ reducedMotion })` — no OS setting — and reads the
outcome with `getComputedStyle`. **Three of the reset's four declarations are asserted, in BOTH
directions:**

| Declaration | Vehicle | no-preference | reduce |
|---|---|---|---|
| `transition-duration` | a real shipped `<Button>` (`transition-all`) | 0.12s | **<0.001s** |
| `animation-duration` | a utility-layer keyframe (`animate-pulse`) | 2s | **<0.001s** |
| `animation-iteration-count` | the same | `infinite` | **`1`** |

(`scroll-behavior` is not asserted — it has no observable computed effect without a scroll, and the
other three establish the rule is applying.)

The third row is the one worth having and the one a human is least likely to catch: **infinite**
animations — spinners, pulsing skeletons — stop after a single cycle. Nobody eyeballs an iteration
count.

**Both directions is load-bearing, not thoroughness for its own sake.** Four traps were hit writing
this, and three of them produced a **result against a page where nothing was under test**:

1. `test.use({ reducedMotion })` at describe level never reached the page —
   `matchMedia("(prefers-reduced-motion: reduce)").matches` read `false` inside a test that had
   declared `reduce`, and everything "passed". Emulation is therefore applied per-test and
   **asserted** (`expectMediaQuery`) rather than assumed.
2. `[role="listbox"]` is not the animated node — Radix animates `[data-slot="select-content"]` and
   the listbox role sits on an inner element, which reported `animation-duration: 0s`. `0 < 0.001`
   satisfied the suppressed-direction assertion **vacuously**.
3. Even the right node does not animate (the `animate-none` finding above) — a Select is a vacuous
   vehicle in both directions. (`data-open:` itself is fine: it compiles to
   `:where([data-state="open"], [data-open]:not([data-open="false"]))` and does match Radix. That was
   checked before being blamed.)
4. **Found in this continuation, on a clean `git status`:** a reused dev server served a stale
   stylesheet. See Issues Encountered.

**Watched red.** Neutering `animation-iteration-count: 1 !important` and
`transition-duration: 0.01ms !important` in `globals.css` failed the reduce test with
`Expected "1", Received "infinite"` while the no-preference test stayed **green** — which is the
correct asymmetry, since the no-preference direction does not exercise the reset at all.
`globals.css` was reverted and is clean.

**DS-04 is therefore promoted out of `10-VALIDATION.md` § Manual-Only**, leaving three rows there.
The map's DS-04 entry now carries the e2e command alongside `npm run test:design -- motion-budget`,
and names 10-17 as a second owning plan.

## The drift check found one undeclared pairing, and it took two narrowings to be sure it was the only one

The naive form the plan specifies — cross-multiply every `text-*` and every `bg-*` inside one string
— reports **25 raw pairings**, of which 7 are absent from the inventory. Six of those seven are
artifacts of the method, and the interesting thing is that they are artifacts of **two different**
failure modes, neither of which the plan anticipates.

**Narrowing A — variant chains must be able to co-apply.** `ui/calendar.tsx:221` carries
`data-[range-middle=true]:bg-muted`, `data-[range-middle=true]:text-foreground`,
`data-[range-end=true]:bg-primary` and `data-[range-end=true]:text-primary-foreground`. The naive
cross product pairs `text-foreground` with `bg-primary`: near-black ink on a near-black surface,
**~1.1:1**. Those two day states are mutually exclusive and never paint together.

That phantom matters because it is **resolvable by neither of the two routes the plan offers**. Its
own words: *"either it is legitimate, in which case add the row … or it fails the bar, in which case
the component is fixed."* Adding the row would declare a 1.1:1 pairing legal — `contrast.test.ts`
would fail on it immediately, correctly. "Fixing the component" would mean breaking a calendar that
is not broken. When a check produces a finding that neither honest route can close, **the check is
wrong**, and the check is what gets fixed. So a foreground and a background are paired only when
their variant chains are identical, or when at least one is unconditional.
`ui/dropdown-menu.tsx:76` produces the same shape across `not-data-[variant=destructive]:` and
`data-[variant=destructive]:` — a *negated* variant paired against the thing it negates.

**Narrowing B — `dark:` utilities cannot paint, so they are skipped.** `globals.css:32` defines the
variant as `&:is(.dark *)`, and nothing activates `.dark`: the provider writes
`attribute="data-theme"` *specifically* to avoid that collision, `enableSystem` is false, and the
theme list is overridden to court/grove (D-03/D-06). `dark:bg-input/30` in `button.tsx`, `input.tsx`
and `checkbox.tsx` was pairing against light-mode foregrounds and inventing three more phantoms.

**A skip is a hole unless the reason is pinned.** So all four mechanisms are asserted — the two
provider props, the exported `THEMES` tuple, and the `@custom-variant` selector itself — and the
header states that if `.dark` is ever activated the narrowing must be replaced by a **third theme in
the inventory**, not left in place. Watched red at **1 failed / 12 passed** with `attribute="class"`
substituted.

**What survived both narrowings is real, and it is one pairing at two sites.**

| Site | Classes | What it is |
|---|---|---|
| `src/components/ui/tooltip.tsx:45` | `bg-foreground` + `text-background` | the inverted dark tooltip |
| `src/components/listing/photo-uploader.tsx:278` | `bg-foreground/80` + `text-background` | the "Cover" chip over a listing photo |

Both are legitimate and both were **measured before being declared**, per the plan's rule:

| Row | court | grove | bar |
|---|---|---|---|
| `background` on `foreground` | **19.80** | **18.42** | 4.5 |
| `background` on `foreground` @80% over `background` | **11.20** | **10.24** | 4.5 |

**2 rows added** to `CONTRAST_PAIRS` (29 → 31), and `npm run test:design -- contrast` is green at
73 assertions. The `/80` row's `over: background` is the **worst case rather than the true one**, and
the note says so: the real surface is a photograph, and any photo darker than the page background
composites darker still, which only increases contrast against the near-white text.

**Watched red in both directions**, because one direction proves half a check:

| Mutation | Result |
|---|---|
| the 2 new rows removed from the inventory | **1 failed / 11 passed** — names both sites and both class pairs |
| `text-brand` injected beside `bg-primary` in `badge.tsx` | **1 failed / 11 passed** — `brand on accent-foreground`, 2 sites |

## Task Commits

1. **Task 1: The ESLint rule, the authoritative leak gate and the pair-drift companion** — `4e4b69a` (test)
2. **Task 2: Rewrite the build script and prove the gate goes red** — `de17846` (feat)
3. **Deviation: pin the dormancy that makes the `dark:` narrowing safe** — `1b4610d` (test)
4. **Tasks 1-2 SUMMARY, checkpoint open** — `38fdfcb` (docs)
5. **Task 3: mechanise DS-04 — reduced motion, proven in both directions** — `afd7c2a` (test)
6. **Task 3 close: verdicts, DS-13/DS-06 complete, D-10 opened** — final `docs` commit

**Task 3** carried no source change, as its acceptance criteria require: `git status --porcelain src/`
is empty across the whole discharge. The one file it added lives in `e2e/`.

## Files Created/Modified

- **`eslint.config.mjs` — modified.** One entry appended after `globalIgnores`, in the file's
  existing comment-above-each-entry style, plus an inline plugin defined above the `defineConfig`
  array. The rule visits `Literal` and `TemplateElement`; the type guard on `node.value` is
  load-bearing rather than defensive, because ESLint's `Literal` also fires on regex and numeric
  literals. The escape hatch is the repo's existing form —
  `// eslint-disable-next-line fitout/no-raw-design-value`, the same mechanism
  `listing-card.tsx:234` already uses for `@next/next/no-img-element` — and the header says
  explicitly not to invent a `/* design-token-exempt */` marker.
- **`tests/design/leak.test.ts` — created, 18 assertions.** Modelled on
  `tests/use-server-exports.test.ts` in structure and in discipline: an OBSERVED RED block (now
  holding two real failing runs), a COVERED / NOT COVERED header, scan-once-at-module-level,
  assert-in-`it()`, Windows path normalisation, guard-the-guard, synthetic fixtures, and the
  authoritative one-liner against an empty array. It parses with the TypeScript compiler API rather
  than grepping — the same reason `use-server-exports.test.ts` gives, sharpened by this phase's
  twelve grep-versus-comment collisions.
- **`tests/design/pair-drift.test.ts` — created, 13 assertions.** See the section above. Its
  `NOT COVERED` block lists five real blind spots, including the cross-element pairing the plan
  required to be stated and the alpha-blindness of the lookup (`contrast.test.ts` measures the
  alpha per row; this file only asks whether the pair is declared at all).
- **`package.json` — modified.** One line. Nothing else in the scripts block changed, and no CI
  workflow was created: `ls .github` fails, and `.github` does not exist at all.
- **`src/lib/design/contrast-pairs.ts` — modified.** +2 rows with their measurements in the notes,
  and one stale sentence corrected: the NOT COVERED header attributed the same-string drift check to
  "plan 10-12", which never owned it. It now names the file, which cannot go stale.
- **`deferred-items.md` — modified twice.** D-9's disposition (Task 2) and **D-10** (Task 3): DS-09's
  Pending state stated at the phase boundary rather than left as an unexplained unticked box.
- **`e2e/reduced-motion.spec.ts` — created, 2 tests, 8 assertions.** DS-04 at the browser level. Its
  header carries four traps, three of which produced a result against a page where nothing was under
  test. It lives in `e2e/`, not `tests/design/`, because it needs a real engine's `getComputedStyle`
  and a real media-query emulation — jsdom has neither.
- **`10-VALIDATION.md` — modified.** DS-04 promoted out of § Manual-Only (4 rows → 3) with the reason
  the prescribed manual check could not have worked recorded in its place, and the § Per-Task
  Verification Map row updated with the e2e command and 10-17 as a second owning plan.
- **`REQUIREMENTS.md` — modified.** DS-13 and DS-06 → `Complete`, checkbox and traceability table
  both. DS-04 was already `Complete` (10-04) and was **not** double-marked. DS-09 deliberately
  untouched.

## Decisions Made

- **Two narrowings of the cross product**, and the calendar phantom is the argument for both. See the
  dedicated section. Recorded as deviations rather than quietly implemented, because the plan's text
  specifies the naive form.
- **Alias groups are derived from token values, not typed.** The plan names two groups (`secondary`/
  `muted`/`accent` and `card`/`popover`); the stylesheet actually has **six**, including
  `foreground`/`card-foreground`/`popover-foreground`, without which `ui/alert.tsx`'s
  `bg-card text-card-foreground` reads as undeclared. A hand-written list would have been wrong on
  day one. Deriving them also means a future theme that pulls `--accent` away from `--muted` splits
  the group automatically instead of leaving the list silently wrong. The collapse is controlled: a
  test asserts that tokens with genuinely different values stay apart, otherwise the alias map would
  be a way of making every pairing look declared.
- **`npm run lint` is 17 seconds, not 85.** The plan instructs the SUMMARY to record ~85s. Measured
  three times on this box today: **17s**. 10-12's content-root narrowing is the likely cause
  (RESEARCH measured 85s before it). The accepted price of T-10-35 is therefore **~29s** of extra
  build (lint 17s + design gate 12s) against a 72s total, not 85s. Recording the plan's number would
  have been a false measurement in the one phase whose entire argument is that a measurement beats a
  document.
- **The Vitest gate is STRICTER than ESLint on one point, deliberately.** A file-level
  `/* eslint-disable fitout/no-raw-design-value */` is honoured by ESLint and **not** by the Vitest
  gate. The asymmetry runs in the safe direction — the authoritative half is the strict half — and it
  means a whole-file opt-out is impossible rather than merely discouraged. Stated in NOT COVERED.
- **D-9 ACCEPTED as debt, with reasoning and a re-verified number.** Full entry in
  `deferred-items.md`. Short form: the byte figure is unchanged (**119,835**, reproduced by summing
  the emitted chunks — no rebuild needed); `@source not` would make `/dev/theme` render **unstyled**,
  which is the surface Task 3's checkpoint is performed on, so that "fix" would break the acceptance
  step it competes with; a safelist is the second list D-16 and D-18 exist to abolish; and the third
  option (a build-time decision about whether the route is emitted) is net-new build configuration,
  the same class of scope the plan explicitly forbids for CI. In context: 10-12 took the stylesheet
  from 134,132 → 119,079 bytes, and `/dev/theme` puts 1,103 back — the phase still ships **−10.66%**.
- **DS-13 and DS-06 left Pending, not marked Complete.** Both are satisfied by Tasks 1-2. But Task 3
  asks the developer to accept or reject **D-11, the accent deepening**, and a rejection is a scope
  decision that could re-derive `--brand` — which would move every number DS-06 rests on. Closing a
  requirement before the input that could invalidate it has arrived is the kind of tidiness this
  phase has repeatedly refused. The continuation agent closes them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's naive cross product produces an unresolvable false positive**

- **Found during:** Task 1, first run of the drift check against the real tree
- **Issue:** `ui/calendar.tsx:221` pairs `data-[range-middle=true]:text-foreground` with
  `data-[range-end=true]:bg-primary` — two mutually exclusive day states — synthesising a ~1.1:1
  pairing that never renders. `ui/dropdown-menu.tsx:76` does the same across a `not-` variant and the
  variant it negates. The plan's two prescribed resolutions ("add the row" / "fix the component")
  both make the tree worse.
- **Fix:** Narrowing A — a foreground and a background are paired only when their variant chains are
  identical or at least one is unconditional. The reason is written at the narrowing, with the
  calendar named, and a synthetic fixture asserts the two REAL calendar pairings still pair while the
  phantom does not.
- **Files modified:** `tests/design/pair-drift.test.ts`
- **Verification:** the fixture asserts exactly 2 pairings from the calendar's 4 classes; the tree
  scan drops from 7 undeclared to 4.
- **Committed in:** `4e4b69a`

**2. [Rule 1 - Bug] `dark:`-scoped utilities were pairing against light-mode foregrounds**

- **Found during:** Task 1, same run
- **Issue:** `dark:bg-input/30` in `button.tsx`, `input.tsx` and `checkbox.tsx` was crossed with
  `text-foreground` / `placeholder:text-muted-foreground` / `data-checked:text-primary-foreground`.
  The inventory is measured from the two `[data-theme]` blocks and
  `config/design-tokens-source.mjs` never reads `.dark` at all — by design.
- **Fix:** Narrowing B — `dark:`-scoped utilities are skipped, because they cannot paint: nothing
  activates `.dark` (D-03/D-06).
- **Files modified:** `tests/design/pair-drift.test.ts`
- **Verification:** undeclared count drops from 4 to 1.
- **Committed in:** `4e4b69a`

**3. [Rule 2 - Missing] Narrowing B was a hole in the gate until its precondition was asserted**

- **Found during:** Task 2, while writing the SUMMARY's justification for narrowing B
- **Issue:** "`dark:` utilities cannot paint" is true *today*. Nothing enforced it. A future
  `attribute="class"`, an `enableSystem={true}`, or a `dark` entry in `THEMES` would make every
  skipped utility live and this gate would keep skipping them **silently** — a check that quietly
  stops checking, which is the exact failure class this phase exists to remove.
- **Fix:** four assertions pinning the mechanisms (`attribute="data-theme"`, `enableSystem={false}`,
  the exported `THEMES` tuple, and `globals.css`'s `@custom-variant dark (&:is(.dark *));`), plus a
  header instruction that an activated `.dark` must be answered with a third theme in the inventory
  rather than by keeping the skip.
- **Files modified:** `tests/design/pair-drift.test.ts`
- **Verification:** watched red at **1 failed / 12 passed** with `attribute="class"` substituted;
  restored from a backup copy and green at 13.
- **Committed in:** `1b4610d`

**4. [Rule 2 - Missing] Two inventory rows the drift check demanded**

- **Found during:** Task 1
- **Issue:** `ui/tooltip.tsx:45` and `listing/photo-uploader.tsx:278` both render the INVERTED
  surface — `text-background` on `bg-foreground` — and no row declared it. The plan's own rule
  requires resolution by adding a measured row or by fixing the component; both surfaces are correct,
  so both rows were added.
- **Fix:** +2 rows in `src/lib/design/contrast-pairs.ts`, each measured in both themes before being
  written (19.80/18.42 solid; 11.20/10.24 at 80%), with the `over: background` approximation
  identified in the note as the worst case rather than the true one.
- **Files modified:** `src/lib/design/contrast-pairs.ts`
- **Verification:** `npm run test:design -- contrast` green, 69 → 73 assertions.
- **Committed in:** `4e4b69a`

**5. [Rule 1 - Bug] A stale cross-reference in `contrast-pairs.ts`'s own NOT COVERED header**

- **Found during:** Task 1
- **Issue:** it attributed the same-string drift check to "plan 10-12", which never owned it and
  never wrote one.
- **Fix:** it now names `tests/design/pair-drift.test.ts`, which is a file rather than a guess and
  cannot go stale the way a plan number can.
- **Files modified:** `src/lib/design/contrast-pairs.ts`
- **Committed in:** `4e4b69a`

**6. [Rule 2 - Missing] DS-04's manual-only row described a check that could not have worked**

- **Found during:** Task 3, after the developer reported no deterministic way to test it by hand
- **Issue:** the prescribed check (open the Select on `/dev/theme`, toggle OS reduced motion) has two
  visually identical outcomes, because `select.tsx:72`'s `data-[align-trigger=true]:animate-none`
  makes the panel compute `animation-name: none` in **both** states. Signing it off would have
  recorded a pass that proved nothing about the reset.
- **Fix:** `e2e/reduced-motion.spec.ts` — three of the reset's four declarations, both directions,
  with the emulation itself asserted. `10-VALIDATION.md` updated to match.
- **Files modified:** `e2e/reduced-motion.spec.ts` (created),
  `10-VALIDATION.md`
- **Verification:** `2 passed`; watched red on a neutered `globals.css` with the no-preference
  direction correctly staying green; `globals.css` reverted and clean.
- **Committed in:** `afd7c2a`

### Instructions deliberately not followed literally

- **"Record that `npm run lint` measures roughly 85 seconds."** It measures 17. See Decisions.
- **The plan's Task 3 `<what-built>` says "pinning the vendored 56".** The pinned number is **54**.
  D-2 recorded the drop after 10-07 removed two dark-mode twins alongside two accessibility defects,
  10-12/10-13/10-14 each re-measured 54 independently, and 10-14 corrected `REQUIREMENTS.md` at
  source. This is flagged in the checkpoint hand-off so the developer is not shown a wrong number;
  **no source or requirement was changed to match the plan's text.**

---

**Total deviations:** 6 (3 × Rule 1, 3 × Rule 2). No Rule 4 checkpoint was needed.
**Impact on plan:** every artifact the plan names exists, every `must_haves` truth holds, and every
acceptance criterion in all three tasks passes. Two instructions were not followed literally and both
are recorded above with the measurement that overrode them.

## Deferred Issues

- **D-9 DISPOSITIONED — accepted as debt.** This plan was the nominated owner, looked at it, and
  wrote the decision and the re-verified number into `deferred-items.md` rather than leaving the item
  to drift to Phase 17 unexamined. Re-nominated to Phase 17 so the number is re-checked once, not
  carried forever.
- **D-10 OPENED — DS-09 closes the phase Pending, and it is the only requirement that does.** The
  contract half exists and is guarded (`buttonVariants({size:"touch"})` → `h-11`, asserted by
  `button-variants.test.ts`); the adoption half stands at **two** call sites,
  `group/rsvp-form.tsx:328` and `search/search-bar.tsx:411`. DS-09's wording is *"is the standard for
  booker-facing primary actions"*, and two adopters is not a standard. **It was not closed by a
  sweep**, because no static gate can answer it — "booker-facing primary action" is a judgement about
  a surface's role, the same class of limit as the pair-drift check's cross-element blind spot — and
  converting every `<Button>` on the phase's last day would satisfy a checkbox by resizing controls
  nobody assessed. Owner is **Phase 17's a11y audit**, per the decision already written into
  `ui/button.tsx:80-83` at the moment the `touch` size was declared. Recorded so the verifier reads a
  stated gap rather than inferring one from an unticked box.
- **Not new:** D-3, D-4, D-5, D-6, D-7, D-8 remain open and untouched.

## Issues Encountered

- **The most valuable finding was that the plan's own algorithm was wrong** — and the tell was not a
  failing test, it was a finding that neither of the plan's two prescribed resolutions could close.
  That shape is worth naming: when a gate reports something you can neither declare legal nor fix in
  the code, the gate is what is broken. Both narrowings came out of following that thread rather than
  reaching for the nearest exemption.
- **A REUSED DEV SERVER SERVED A STALE STYLESHEET, and the new spec went red on a clean
  `git status`.** The first run of `e2e/reduced-motion.spec.ts` in this continuation failed with
  `Expected "1", Received "infinite"` — the exact signature of the neutered `globals.css` used to
  watch it go red. `git status` was clean and `git diff src/app/globals.css` was empty; all four
  declarations were on disk at `:490-499`. The **server** was wrong, not the source: fetching
  `/_next/static/chunks/…css` from the running dev server returned a reduced-motion block containing
  only `scroll-behavior` and `animation-duration`. `playwright.config.ts` sets
  `reuseExistingServer: !process.env.CI`, so Playwright had attached to a server left running across
  the `git checkout` that reverted the neutering, and that server never recompiled. Killing PID 22624
  and letting Playwright boot a fresh one gave `2 passed`. **The direction of that failure is the
  safe one** — stale CSS produces a false RED here — and the false-green twin (someone deletes the
  reset while a stale server keeps serving it) is closed at the other layer, because
  `motion-budget.test.ts:117-133` asserts each declaration's presence in the SOURCE and runs inside
  `npm run build`. Both halves are now written into the spec's header as trap 4.
- **`npm run test:e2e` WAS run this time**, because this plan now owns a file in `e2e/`, and the
  result needs one correction to the phase's record. **19 passed / 1 failed / 5 did not run**
  (25 tests). The 1 failure is D-6 item 1 — `open-capacity.spec.ts:376`, the drop-in surface — a
  **sixth** byte-identical reproduction. **The 5 "did not run" are not a new problem and never were:**
  they are the remaining 5 tests of the same serial `open-capacity.spec.ts` block, cancelled after
  its first test fails. Every prior plan that reported "17 passed / 1 failed" was reporting an
  18-of-23 run and cropping the third number. The delta attributable to this plan is therefore
  **exactly +2 passes and nothing else**.
- **One flake worth naming rather than burying.** The first full e2e run also failed
  `search-and-book.spec.ts:296` (durable confirmation, a strict-mode violation resolving two elements
  for the same booking reference) — D-6 item 2, which 10-13 recorded as not firing. It **passed in
  2.2s on the immediate re-run**. Reporting only the clean run would have hidden that item 2 is
  intermittent rather than dormant.
- **The `time` builtin under Git Bash reports the npm wrapper, not the work.** `real 0m16.897s` with
  `user 0m0.213s` on the first lint measurement; every timing in this summary is wall-clock from
  `date +%s` around the command instead.
- **No blockers.**

## Verification Evidence

### Re-run at plan close (Task 3), after the doc and requirement edits

| Check | Result |
|---|---|
| `npm run build` (lint + design gate + `next build`) | exit **0**, **94s** |
| `npm run test:design` | exit **0** — **20 files, 375 passed**, 8.34s, no database |
| `npx playwright test e2e/reduced-motion.spec.ts` | exit **0** — **2 passed**, 13.0s |
| `npm run test:e2e` (full) | exit 1 — **19 passed / 1 failed / 5 did not run** of 25. The failure is D-6 item 1; the 5 are its serial block. **+2 passes vs the pre-plan baseline, no other change.** |
| **OBSERVED RED:** `animation-iteration-count`/`transition-duration` `!important` neutered in `globals.css` | reduce test **failed** `Expected "1", Received "infinite"`; no-preference test stayed **green** — the correct asymmetry. Reverted, `git diff src/app/globals.css` empty |
| `npx eslint e2e/reduced-motion.spec.ts` | exit **0** |
| `npx tsc --noEmit` | exit **0** |
| `git status --porcelain src/` across the whole of Task 3 | **empty** — the checkpoint's no-source-change criterion |
| `REQUIREMENTS.md` DS-13 / DS-06 | `[x]` + traceability **Complete** (SDK reported `marked_complete: [DS-06, DS-13]`, verified on disk) |
| `REQUIREMENTS.md` DS-04 | already `Complete` from 10-04 — **not** double-marked |
| `REQUIREMENTS.md` DS-09 | still `Pending`, deliberately — D-10 records why |

### Tasks 1-2, as measured at the time

| Check | Result |
|---|---|
| `npm run build` (clean tree) | exit **0**, **72s** — lint ~17s, design gate ~12s, `next build` ~43s |
| **OBSERVED RED:** `#ff0000` at `src/components/ui/badge.tsx:18`, `npm run build` | **exit 1** — `fitout/no-raw-design-value` at 18:20, `✖ 11 problems (1 error, 10 warnings)`; `&&` short-circuited before `test:design` |
| **OBSERVED RED:** same probe, `npm run test:design -- leak` | **exit 1** — **1 failed / 17 passed**, `"src/components/ui/badge.tsx:18 raw hex colour \`#ff0000\`"` |
| Probe reverted | `git status --porcelain src/components/ui/badge.tsx` **empty** |
| **OBSERVED RED:** 2 new inventory rows removed | **1 failed / 11 passed** — names `ui/tooltip.tsx:45` and `photo-uploader.tsx:278` |
| **OBSERVED RED:** `text-brand` injected beside `bg-primary` in `badge.tsx` | **1 failed / 11 passed** — `brand on accent-foreground` |
| **OBSERVED RED:** `attribute="class"` substituted in the provider | **1 failed / 12 passed** — the dormancy pin |
| `npm run test:design` (whole gate) | exit **0** — 20 files, **375 passed** (was 340), no database |
| `npm run test:design -- leak` | exit **0** — **18 passed** |
| `npm run test:design -- pair-drift` | exit **0** — **13 passed** |
| `npm run test:design -- contrast` | exit **0** — **73 passed** (was 69; +2 rows × 2 themes) |
| `npm run db:up && npm run db:test:setup && npm test` | exit **0** — 132 files passed / 1 skipped, **1197 passed / 4 skipped**, unchanged |
| `npx tsc --noEmit` | exit **0** |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, byte-identical to the phase baseline |
| ESLint rule probed against a fixture | 5 true positives; `color-mix(in_oklch,…)`, `see #3388`, `text-[0.8rem]` and the disable-comment all silent |
| AC: exact `build` string comparison via `node -e` | exit **0** |
| AC: `grep -c "no-raw-design-value" eslint.config.mjs` | **3** (≥2 required) |
| AC: `grep -c "design-leak-patterns" eslint.config.mjs` | **1** (exactly 1 required) |
| AC: `grep -c "NOT COVERED" tests/design/pair-drift.test.ts` | **1** |
| AC: `grep -c "src/components/ui" tests/design/leak.test.ts` | **6** (≥1 required) |
| AC: `grep -c "next build" package.json` | **1** |
| AC: `ls .github/workflows` | **exit 2** — and `.github` does not exist at all |
| AC: `fitout/no-raw-design-value` + the date in `leak.test.ts`'s header | **3** / **1** |
| Vendored primitives visited by the leak scan | **30 / 30** |
| `src/lib/design/tokens.generated.ts` | walked ✓, not scanned ✓, would yield **≥40** violations ✓ |
| Undeclared pairings after both narrowings | **1** canonical, at **2** sites — both resolved by adding a measured row |
| GATE-06 | `drizzle/` still at **0025**, 26 files, no new migration |
| `toHaveScreenshot` anywhere in `e2e/` or `tests/` | **none**; no `*-snapshots` directory exists |
| Shipped CSS (D-9 re-verify, no rebuild) | 105,550 + 10,572 + 3,713 = **119,835 bytes** — identical to 10-16 |
| `git diff --diff-filter=D` on all 3 commits | **no file deletions** |
| `git status --short` after each commit | clean |

## Known Stubs

**None.** Both new design test files are wired into `test:design`, which is now wired into `build`;
the ESLint rule is registered and was probed against a real fixture through the real `npx eslint`;
the two inventory rows are consumed by `contrast.test.ts` and each corresponds to a shipped surface.
`e2e/reduced-motion.spec.ts` is picked up by `playwright.config.ts`'s `testDir: "e2e"` with no
registration step — confirmed by `npx playwright test --list` reporting **25 tests in 10 files**,
up from 23 in 9. Nothing here is a placeholder waiting on a later plan.

## Threat Flags

None. No network endpoint, no auth path, no file access pattern, no schema change; `drizzle/`
untouched at `0025` (GATE-06).

Threat register dispositions honoured:

- **T-10-04** (repudiation — the DS-13 gate) — **mitigated, and demonstrated.** A raw hex was
  injected into the vendored tree, `npm run build` returned a non-zero exit naming the rule id and
  the file, the Vitest half caught it independently, the probe was reverted and the build re-run
  green — and the failing output is pasted into the guard's own header, dated, with what was injected
  and where.
- **T-10-34** (tampering — the `package.json` build script) — **mitigated.** The blocking form is
  asserted by an exact string comparison (`node -e "process.exit(require('./package.json').scripts.build===…)"`)
  and by an `artifacts.contains` check, so a later "speed up the build" edit that drops `test:design`
  is a visible diff rather than a silent regression.
- **T-10-35** (denial of service — `npm run lint` in `build`) — **accepted, and re-priced.** The real
  cost on this box is **~29s** (lint 17s + design gate 12s) against a 72s build, not the 85s the
  register assumed. The documented alternative — scoping the lint invocation to `src/` — remains
  unnecessary.
- **T-10-36** (elevation of privilege — the inline ESLint plugin) — **accepted as planned.** The rule
  is defined inline in `eslint.config.mjs` over a repo-local pattern list. `package.json`'s
  dependency and devDependency blocks are byte-identical to the previous commit; no new
  supply-chain surface entered the tree.

## Next Phase Readiness

- **The phase is unblocked.** All 17 plans are complete and Phase 10 is ready for
  `/gsd:verify-work`. **13 of its 14 requirements are `Complete`; the fourteenth is DS-09 and it is
  Pending on purpose** — see D-10, which exists so the verifier reads a stated gap instead of
  inferring one from an unticked box.
- **Phase 11 (GATE-01)** inherits a build that runs lint and the design gate before `next build`. A
  visual-regression baseline captured in Phase 11 will therefore be taken against a tree that cannot
  contain a raw design value — which is the precondition DS-01 needed. It also inherits a working
  `page.emulateMedia()` pattern: `10-VALIDATION.md` had scheduled DS-04's automation for Phase 11 and
  it landed here instead, so that is one item off Phase 11's plate rather than onto it.
- **Phase 17 (a11y audit)** inherits three things. (1) The pair-drift check's stated residue: a
  cross-element pairing (`text-brand` inside a `bg-muted` parent) is invisible to same-string
  analysis and is explicitly assigned to the two-theme axe pass on the rendered DOM. (2) **D-9**,
  re-nominated with its disposition and its re-verified 119,835-byte figure. (3) **D-10 — DS-09**,
  the `touch` size's adoption clause, which was assigned to Phase 17 in writing at
  `ui/button.tsx:80-83` on the day the size was declared, not retro-fitted here.
- **Anyone who sees `e2e/reduced-motion.spec.ts` fail on a clean tree** should kill the dev server on
  :3000 and re-run BEFORE touching `globals.css`. That cost real time in this plan and is trap 4 in
  the spec's header.
- **Anyone adding a `dark:` utility, or activating `.dark`** must read
  `tests/design/pair-drift.test.ts`'s narrowing B. The drift check currently skips `dark:` because it
  cannot paint; the moment that stops being true the answer is a third theme in
  `contrast-pairs.ts`, not a wider skip. Four assertions will go red first.
- **Anyone tempted to speed up `npm run build`** by dropping a stage: the exact-string check will
  catch it, and `tests/design/leak.test.ts`'s header explains why the string is the whole
  requirement.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-12 — all 3 tasks, checkpoint discharged*

## Self-Check: PASSED

**Artifacts.** All 9 claimed files verified on disk (3 created, 6 modified) plus this file.
`e2e/reduced-motion.spec.ts` was **read in full before being committed**, since it was written by the
orchestrator rather than by this agent — and reading it is what surfaced that its stated pass had
been taken against a dev server serving stale CSS.

**Commits.** All 5 verified in `git log`: `4e4b69a`, `de17846`, `1b4610d`, `38fdfcb`, `afd7c2a`, plus
this plan's closing `docs` commit. `git diff --diff-filter=D` reports **no file deletions** on any of
them. `git diff HEAD~2 HEAD -- package.json` at Task 2 showed exactly one changed line — the `build`
script — so the T-10-36 claim that no npm dependency entered the tree is verified rather than
asserted.

**Requirements.** `REQUIREMENTS.md` re-read after the SDK call: DS-13 and DS-06 carry `[x]` and
`Complete` in both the checklist and the traceability table. **DS-04 was already `Complete` from
10-04 and was not re-marked.** **DS-09 is still `Pending`, verified deliberate** — the SDK was never
asked to touch it, and D-10 in `deferred-items.md` states the reason, the two current adopters by
file:line, and the Phase 17 owner.

**Docs.** `10-VALIDATION.md` re-read: § Manual-Only is down to 3 rows and the DS-04 row in the
Per-Task Verification Map carries both commands and both owning plans. `deferred-items.md` re-read:
D-9's DISPOSITION intact, D-10 appended.

**One correction to a claim made in the Tasks 1-2 self-check.** That block said `deferred-items.md`
had "no new item opened", which was true then; Task 3 opened D-10, and the line above supersedes it.
