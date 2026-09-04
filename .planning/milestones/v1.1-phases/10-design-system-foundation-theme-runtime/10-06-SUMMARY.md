---
phase: 10-design-system-foundation-theme-runtime
plan: 06
subsystem: design-system
tags: [cva, button, focus-ring, accessibility, contrast, vendored-fork, wcag]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest gate, and `compileGlobalsCssWith()`, the safelisted compile this plan's token proof runs through"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "`--brand`, `--brand-foreground`, `--destructive-foreground` and the darkened `--ring`, declared identically in both theme blocks — every class this plan writes resolves through them"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 04
    provides: "`--font-weight-medium` aliased onto the emphasis weight, which is why the base string's `font-medium` needed zero edits here"
provides:
  - "`src/components/ui/button.tsx` — `variant=\"brand\"`, `size=\"touch\"`, and THE focus recipe (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`) that 10-07 copies into 10 more vendored files"
  - "the sanctioned brand hover `hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]` — declared ONCE, inside the variant, so the 20 call sites in 10-08/10-09 carry no colour string at all"
  - "`tests/design/button-variants.test.ts` (12) — the DS-08/DS-09/D-21 CVA proof, including the two negatives that make the superseded RESEARCH block unlandable"
affects: [10-07, 10-08, 10-09, 10-10, 10-11, 10-13, 11, 12, 17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A contrast fix that no token value can deliver is fixed in the RECIPE, not the palette: the 50%-alpha ring is 2.32:1 composited and the lightest neutral reaching 3:1 at half alpha still fails on `--muted`, so the alpha is what had to go."
    - "A hover that must darken is written as `color-mix` toward `--foreground`, never as an alpha modifier — an alpha tint over a light surface lightens, which moves a filled control the wrong way and a tinted control toward its own text colour."
    - "Interface-first: the CVA contract lands alone and first, so three downstream plans write against something committed rather than rediscovering it by exploration."
    - "Negative assertions are observed RED before being trusted. Both were: the alpha ring and the alpha brand hover were each reinstated, the suite went red on exactly one test, and the change was reverted."

key-files:
  created:
    - tests/design/button-variants.test.ts
  modified:
    - src/components/ui/button.tsx   # base focus recipe, brand variant, default + destructive hovers, touch size
    - .planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md  # D-2

key-decisions:
  - "The plan's grep criteria and its required comments collided for the fifth time in this phase — five banned literals this time (`ring-ring/50`, `bg-brand/90`, `h-11`, `hover:bg-destructive/20`, `dark:`) all needed explaining in a comment that must not contain them. Resolved the way 10-01 through 10-05 resolved it: the reasoning is kept in full and the literals are named descriptively (\"a 50% alpha\", \"a 90%-alpha brand\", \"4 x 11\", \"the 20%-alpha hover\", \"dark-mode-prefixed\")."
  - "`focus-visible:border-ring` was dropped along with the alpha ring, per the plan's literal replacement. The indicator is now ring + offset band only; the base keeps `border border-transparent` so nothing shifts by a pixel on focus."
  - "DS-05, DS-08 and DS-09 all stay Pending. Each requirement's wording contains an ADOPTION clause (\"applies app-wide\", \"the 19 literal recipes are replaced\", \"is the standard for booker-facing primary actions\") that plans 10-07 through 10-09 own. This plan delivers the contract, not its adoption."
  - "The destructive variant's own `focus-visible:ring-destructive/20` override was left in place and logged as deferred item D-2 rather than fixed: it is pre-existing, out of 10-07's `ring-ring/50` scan, and removing it honestly means touching its dark-mode twin — which would break this plan's `dark:` count pin and THEME-05's vendored total of 56."

patterns-established:
  - "The design gate can prove a class reaches a TOKEN, not just that the class is present: `compileGlobalsCssWith([\"ring-offset-background\"])` shows the utility emits `var(--background)` rather than Tailwind's hardcoded white default. That is the only layer where 'the offset is a leak in all but name' is legible."
  - "When a superseded code block still ships inside the phase's own research document, the test asserts the NEGATIVE of it by name, so copying it verbatim fails a committed gate rather than shipping."

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-08-11
---

# Phase 10 Plan 06: The Button CVA Contract Summary

**The one file three later plans write against: coral is now a variant with a hover that darkens (5.41 / 5.36 instead of 4.04 / 3.87), 44px is a named opt-in size, and the focus ring lost the 50% alpha that made every control in the repo render at 2.32:1**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-11T15:49Z
- **Completed:** 2026-08-11T16:01Z
- **Tasks:** 1 (`auto`, no checkpoints)
- **Files:** 1 created, 2 modified

## Accomplishments

- **The focus ring is solid, and its offset is a token rather than a hardcoded white.** The base string's `focus-visible:ring-3 focus-visible:ring-ring/50` is gone. `/50` compiles to `color-mix(in oklab, var(--ring) 50%, transparent)`, which composited over white measures **2.32:1** against a 3:1 non-text bar — and this is arithmetic, not preference: the lightest neutral that reaches 3:1 at half alpha still fails on `--muted` (2.93:1), so **no value of `--ring` could ever have fixed it**. 10-03's darkened `--ring` (7.46 court / 7.11 grove on background) only pays off once the alpha is gone, which is what this plan did. The offset colour is declared explicitly because Tailwind's default `--tw-ring-offset-color` is a literal `#fff` — a leak in all but name, and visibly wrong on grove's tinted background.
- **Coral is a variant, and its hover darkens.** `variant="brand"` is `bg-brand text-brand-foreground` with `hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]`. The banned form — `hover:bg-brand/90` — measures **4.04:1 (court) / 3.87:1 (grove)** against a 4.5 bar, because an alpha tint over a light surface *lightens*; the mix form measures **5.41 / 5.36**. The idiom is not new vocabulary: `secondary` has shipped it at `:16` for the whole life of the file. And it is not a `--brand-strong` escape hatch — there is still exactly one brand value and zero per-call-site judgement, because the hover now lives in one place.
- **`destructive`'s hover stopped moving in the wrong direction.** It deepened its own tint (`/10` → `/20`), which pushes the surface *toward* the text colour and is why it measured **4.01:1**. It now flips to a solid fill with 10-03's new `--destructive-foreground` token: **5.52:1 in both themes**.
- **44px exists as a named size, and its cost is written next to it.** `size="touch"` is `h-11` — 4 × 11, already on the spacing grid, so no arbitrary value. It is opt-in by decision (D-22), never a responsive default, because a responsive default would silently re-lay-out every dense host table on mobile at once. The consequence of that choice — **nothing enforces adoption**, so Phase 17's a11y audit is the catch — is recorded in a comment directly above the size rather than only in a planning document.
- **An un-varianted `<Button>` is still neutral, and there is now a test that fails if that changes.** `defaultVariants` did not move. `buttonVariants()` contains `bg-primary` and, asserted explicitly, does not contain `bg-brand` — the assertion that goes red the moment someone "helpfully" promotes `brand` to the default and quietly spends the 10% accent budget everywhere.
- **Both negatives were observed red.** The alpha ring was reinstated → 1 failed / 11 passed on *"carries no alpha on the ring colour"*. The alpha brand hover was reinstated → 1 failed / 11 passed on *"hovers by DARKENING with a color-mix"*. Neither guard is vacuous, which matters more than usual here: `10-RESEARCH.md` § Code Examples **still contains** a CVA block using `hover:bg-brand/90`, and it is now unlandable.
- **199/199 design tests green** (was 187), in **4.96s with no database**. `npx tsc --noEmit` exit 0, `npm run build` exit 0, `npm run lint` 0 errors / 9 warnings (byte-identical to the 10-04 and 10-05 baselines).
- **The regression watch holds.** `tests/booking/partial-grant-notice.test.tsx:192` asserts a `className` does *not* contain `bg-brand`; re-run against the real database after the change — **13/13 green**. The link it guards uses no variant, so a `brand` variant existing in the CVA cannot reach it.

## The grep-versus-comment collision, fifth occurrence

Five of this task's nine acceptance criteria are literal `grep -c` counts over `button.tsx` asserting an identifier is absent (`ring-ring/50`, `bg-brand/90`, `hover:bg-destructive/20`) or present exactly once (`h-11`, `focus-visible:ring-offset-background`, `variant: "default"`), plus one pinning `dark:` at its before-value — **while the same task requires a comment explaining every one of those absences.** A comment naming the identifier is textually indistinguishable from the identifier.

Resolved exactly as 10-01 through 10-05 resolved it, and as STATE.md records: the reasoning is kept in full and the literals are named descriptively — *"a 50% alpha"*, *"a 90%-alpha brand"*, *"the 20%-alpha hover it replaces"*, *"4 x 11"*, *"the offset COLOUR is declared explicitly"*, *"every dark-mode-prefixed utility below"*. The prose is longer than the literals would have been and says strictly more, since each one now carries its measured ratio.

One additional trap in this file, avoided deliberately: the header comment originally quoted grove's background as a hex. `config/design-leak-patterns.mjs`'s `raw-hex` pattern is colour-context anchored and a backtick is not in its anchor set, so it would have passed — **by one character of a regex nobody would think to check when editing a comment.** The hex was removed instead of relied on.

## Task Commits

1. **Task 1: The Button CVA contract — brand variant, touch size, solid ring** — `ecbd7c1` (feat)

**Plan metadata:** see the `docs(10-06)` commit that carries this file.

## Files Created/Modified

- **`src/components/ui/button.tsx` — modified.** Four recipe changes and one new size, each with its reason in a header block that opens by naming the file as a deliberate fork (D-17) so a future `npx shadcn add button` knows what it re-collides with. `text-sm font-medium` was **not** touched — it already renders at the theme's emphasis weight thanks to 10-04's `--font-weight-medium` alias, an accepted visible change requiring zero edits. `text-[0.8rem]` in `size: sm` was **not** touched — recorded, tolerated vendored debt, and the leak pattern is px-only by resolved decision. No dark-mode-prefixed utility was touched: the vendored total across `src/components/ui/**` is **still exactly 56**, and this file's own count is still 4.
- **`tests/design/button-variants.test.ts` — created.** 12 assertions across six `describe` blocks. It reads `buttonVariants(...)` rather than rendered markup, for the reason recorded at `tests/booking/partial-grant-notice.test.tsx:17-20`: the base string carries `aria-invalid:`-prefixed alarm utilities that can never apply to a valid control, so counting class names on a rendered node proves nothing about the colour a booker sees. Two assertions are wider than the plan asked — `not.toMatch(/bg-brand\/\d+/)` and `not.toMatch(/ring-ring\/\d+/)` — because the literal `/90` and `/50` are one plausible typo away from an equally broken `/95` or `/60`. The last block compiles the real stylesheet through the safelisted helper and asserts the offset and ring utilities emit `var(--background)` and `var(--ring)`, which is the only layer where the hardcoded-white default is visible at all. The header lists three real blind spots: adoption, `cn()`/tailwind-merge precedence at the call site, and pixels.
- **`deferred-items.md` — modified.** New item **D-2**, below.

## Decisions Made

- **No requirement is marked complete.** DS-05 says the recipe *"applies app-wide"* (12 sites remain — 10-07), DS-08 says *"the 19 literal `bg-brand …` recipes are replaced"* (20 call sites remain — 10-08/10-09), DS-09 says `touch` *"is the standard for booker-facing primary actions"* (zero call sites adopt it yet). All three have an adoption clause this plan deliberately does not touch. Marking any of them complete here would let the phase's own traceability table lie about a contract nothing consumes yet.
- **`focus-visible:border-ring` went with the alpha ring.** The plan's replacement string covers all three of the old focus utilities. The base retains `border border-transparent`, so the border box is unchanged and the indicator is carried entirely by the solid ring plus its offset band — one recipe, which is DS-05's literal wording.
- **`brand` is placed after `default` in the variant map, not before it.** CVA map order carries no precedence, and keeping `default` first matches every other shadcn primitive in the tree; putting `brand` first would have read as a hierarchy statement the code cannot enforce. The hierarchy lives in the UI-SPEC and in `defaultVariants`, which is where it is actually decided.
- **The compile assertion was added beyond the plan's list.** The plan's own `key_links` frontmatter declares the seam `button.tsx → globals.css --ring via focus-visible:ring-offset-background`. A source-level `toContain` proves the class was written; only the compiler proves it resolves to a token. Verified empirically before committing to it — Tailwind v4 does emit `ring-offset-*` utilities, and `.ring-offset-background` emits `--tw-ring-offset-color: var(--background)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Five acceptance greps collide with the same task's mandated comments**

- **Found during:** Task 1
- **Issue:** `grep -c` must return 0 for `ring-ring/50`, `bg-brand/90` and `hover:bg-destructive/20`, exactly 1 for `h-11` and `focus-visible:ring-offset-background`, and its before-value (4) for `dark:` — while the action text requires a comment explaining why each of those is absent, present once, or untouched. This is the fifth occurrence in this phase (10-01, 10-03, 10-04, 10-05, now 10-06) and STATE.md records the resolution.
- **Fix:** Every literal is named descriptively in the comments, with its measured contrast ratio attached, so the explanation is strictly more informative than the literal would have been. Additionally removed a hex colour from the header comment: it would have survived the `raw-hex` leak pattern only because a backtick is not in that pattern's anchor set.
- **Files modified:** `src/components/ui/button.tsx`
- **Verification:** all seven greps return their required counts (`ring-ring/50` 0, `bg-brand/90` 0, `hover:bg-destructive/20` 0, `h-11` 1, `focus-visible:ring-offset-background` 1, `variant: "default"` 1, `dark:` 4 — unchanged, vendored total still 56); full design suite green.
- **Committed in:** `ecbd7c1`

### Out of Scope — Logged, Not Fixed

**deferred-items.md D-2 — the `destructive` variant overrides the focus ring with a 20%-alpha colour.** `focus-visible:ring-destructive/20` (and its dark-mode twin at `/40`) sits in the variant string, so a focused destructive button paints at 20% alpha rather than the solid recipe this plan just made canonical. It is the same defect class as the `/50` ring, at a worse alpha. **Not caused by this change** — before this plan the base was alpha too, so the override changed nothing about the outcome — and **not covered by 10-07**, whose scan is for `ring-ring/50` and will close green with this still shipping. Suggested owner is 10-07, as a widening of its assertion from the literal to *any* alpha modifier on a `focus-visible:ring-*` colour, which is the form this plan's test already uses locally. Note for whoever takes it: 10-07's `dark:` count pin must be restated first, because the honest fix touches the dark-mode twin.

---

**Total deviations:** 1 (Rule 3). No Rule 4 checkpoint was needed. No Rule 1 or Rule 2 fix was required — nothing in the four recipe changes surfaced a bug beyond the two the plan was written to fix.

## Known Stubs

None. Every class this plan writes resolves to a token declared in both theme blocks by 10-03, and the compile assertion proves the two newest ones (`ring-offset-background`, `ring-ring`) emit `var()` references rather than literals.

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- button-variants` | 12/12 passed, 2.84s |
| `npm run test:design` (full gate) | **199/199 passed**, 4.96s, no database |
| Negative-guard red check (alpha ring reinstated) | 1 failed / 11 passed — reverted |
| Negative-guard red check (alpha brand hover reinstated) | 1 failed / 11 passed — reverted |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 |
| `npm run lint` | 0 errors, 9 warnings (unchanged baseline) |
| `npm run db:up && npm run db:test:setup && npx vitest run partial-grant-notice` | 13/13 passed; `:192`'s `not.toContain("bg-brand")` still holds |
| `grep -c "dark:" src/components/ui/button.tsx` | 4 before, 4 after; vendored total across `src/components/ui/**` still 56 |

## Self-Check: PASSED

All claimed files exist on disk (`src/components/ui/button.tsx`, `tests/design/button-variants.test.ts`, this SUMMARY, `deferred-items.md`) and the task commit `ecbd7c1` is present in `git log`.
