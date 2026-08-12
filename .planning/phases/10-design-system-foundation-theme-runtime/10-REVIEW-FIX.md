---
phase: 10-design-system-foundation-theme-runtime
fixed_at: 2026-08-12
review_path: .planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW.md
iteration: 1
findings_in_scope: 18
fixed: 18
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-08-12
**Source review:** `.planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 18 (CR-01..CR-03, WR-01..WR-15)
- Fixed: 18
- Skipped: 0
- Info findings (IN-01..IN-14): out of scope, not addressed — except IN-05's `border-brand/30`, which CR-03's widened gate surfaced and which therefore had to be resolved (measured and exempted as data).

## Gate state

Run after every fix and again at the end, in the isolated worktree:

| Gate | Baseline | Final |
|---|---|---|
| `npm run test:design` | 20 files / **376 passed** | 20 files / **405 passed** |
| `npm run lint` | **0 errors**, 9 pre-existing warnings | **0 errors**, 9 pre-existing warnings |
| `npx tsc --noEmit` | clean | clean |
| `npx next build` | not run at baseline | **succeeds** (compile + TypeScript + page data) |

The 9 lint warnings are pre-existing `no-unused-vars` in `tests/helpers/mocks.ts`,
`tests/security/audit-durable.test.ts` and a `react-hooks/incompatible-library` in the wizard. None
was introduced or touched here.

**Not run: `npm test` (the main unit suite).** It requires a provisioned Postgres
(`npm run db:up` + `npm run db:test:setup`) and fails at global setup in this environment. This is
environmental and pre-existing, not a regression — but it means the non-design suites were not
exercised. `tsc --noEmit` and a full production build are the substitutes that did run.

## Environment note (acted on, worth knowing)

Two things about the starting state, neither caused by this review:

1. **A prior `--fix` run had been interrupted.** It left a recovery sentinel, an orphan worktree and
   an unmerged `gsd-reviewfix/10-52744` branch holding one complete, verified commit (CR-02). The
   transaction was completed rather than discarded: `dev` was fast-forwarded to capture that commit,
   then the worktree, branch and sentinel were removed. An uncommitted in-progress CR-03 edit in
   that worktree was discarded and redone here, because it lacked the required gate half.
2. **`node_modules` in the main repo is empty**, so nothing could be verified there. Dependencies
   were installed into the isolated worktree instead. **The main repo is still in this state** —
   run `npm ci` there before expecting `npm run lint` / `npm test` to work.

## Fixed Issues

### CR-01: `aria-invalid` overrides the DS-05 focus ring on every form control

**Files modified:** `src/components/ui/{button,badge,checkbox,input,input-group,radio-group,select,switch,textarea,toggle}.tsx`, `src/components/availability/slot-picker.tsx`, `tests/design/focus-recipe.test.ts`, `tests/design/dark-scope.test.ts`
**Commit:** `7cb5d56`

Removed the invalid-state ring colour from all ten primitives so `focus-visible:ring-ring` wins.
`input-group.tsx` carried the same defect in a `has-[…]` variant form the review's grep shape did
not show; it is fixed too.

**Deviation from the suggested fix, deliberate.** The review proposed keeping
`aria-invalid:ring-3`. I probed the compiled stylesheet: Tailwind v4 emits
`var(--tw-ring-color, currentcolor)` and gives `--tw-ring-color` no initial value, so a bare
`ring-3` paints in **currentcolor** — a 3px near-black halo on every invalid field. The width was
therefore dropped with the colour. `aria-invalid:border-destructive` already carries the error
meaning, which is what the 1.44:1 wash was failing to add.

Also made the slot picker's pending-anchor ring solid: at 50% alpha it measured **2.23 (court) /
2.03 (grove)** against the 3:1 bar — a finding beyond the review, produced by reproducing its
arithmetic.

**Gate half:** dropped the `focus` anchor from `ALPHA_FOCUS_RING` so any ring colour with an alpha
is caught, variant-scoped or bare. The decorative `ring-1 ring-foreground/10` card hairline is
exempted **as data**, and only in its bare form.

### CR-02: DS-13's leak gate does not match a hex inside a Tailwind arbitrary value

**Files modified:** `config/design-leak-patterns.mjs`, `tests/design/leak.test.ts`
**Commit:** `a04f2d9` (recovered from the interrupted prior run, then independently verified)

Not re-done — verified. Confirmed `bg-[#E8484E]`, `text-[#fff]`, `border-[#000]`,
`shadow-[0_1px_2px_#00000010]` and `hover:bg-[#c0392b]` all flag; `see #3388 for details` and the
phase's own `bg-[color-mix(…)]` still do not; and the rule fires end-to-end through ESLint.

### CR-03: Unmeasured 80%-alpha ink on the coral fill fails AA

**Files modified:** `src/components/availability/slot-picker.tsx`, `tests/design/brand-recipe.test.ts`
**Commit:** `d67cfe3`

Dropped the modifier (3.38/3.51 → 4.57/4.53). Reproduced the review's numbers exactly before
changing anything.

**Note on the suggested contrast row.** The review offered a `CONTRAST_PAIRS` row as an alternative
and observed it "goes red at 3.38 — which is the point". Adding it *alongside* the source fix would
have committed a red suite, so the gate half is instead the hole the review identifies:
`UNMEASURED_ACCENT_ALPHA` policed `bg-` only and now covers every colour role. Running it widened
immediately surfaced `border-brand/30` (the review's IN-05); measured at 1.60/1.49 and exempted as
data with its reason, since both call sites draw it around a filled surface whose tint is the actual
boundary.

### WR-05: `pair-drift`'s alpha-blind key lets a passing `/10` row legalise a failing solid pairing

**Files modified:** `tests/design/pair-drift.test.ts`, `tests/design/contrast.test.ts`, `src/lib/design/contrast-pairs.ts`, `src/components/ui/badge.tsx`
**Commits:** `73676a0`, `43fdf81`

The highest-yield fix in the set. Putting the opacity in the key exposed 8 pairings that were
rendering undeclared. Two were artifacts of Narrowing A cross-multiplying a hover foreground with a
rest background, so Narrowing A′ now skips a pairing when the same chain redefines the opposing
role. Five of the remaining six measured clean and are declared with their numbers.

**The sixth was a real bug:** `badge.tsx`'s destructive link-hover still deepened its own tint to
20%, measuring **4.01 / 3.87** — the exact numbers `contrast-pairs.ts` already cites as the reason
the destructive *Button* stopped doing this in plan 10-07. It survived precisely because the
alpha-blind key matched it against the solid row. It now flips to a solid fill like its Button twin.

Also added an `fgAlpha` field: a diluted ink was previously inexpressible in the inventory, which is
the gap CR-03 fell through.

`43fdf81` is a follow-up: reading the optional fields off the `as const` union was a type error that
**neither gate could see** (vitest transpiles without typechecking, eslint does not run the
type-aware rule there). Found by running `tsc --noEmit`, which is why it is now part of the routine.

### WR-02: `focus-recipe.test.ts` pairing checks are file-level

**Files modified:** `tests/design/focus-recipe.test.ts`
**Commit:** `d271ee2`

Both checks moved to per-class-string using the AST literal walker from `pair-drift.test.ts`. Carries
a two-element positive control where the file-level question still answers "yes", plus a
guard asserting the walker actually splits.

### WR-09 + WR-03: `status-vocab` checks are file-level and accept opacity-modified surfaces

**Files modified:** `tests/design/status-vocab.test.ts`
**Commit:** `d483834`

Utilities are now tokenised per class string with the variant chain stripped and the opacity modifier
**kept**, making the tint/solid distinction structural rather than a lookahead. Surface and ink are
required on the same element; the icon stays file-level because the recipe puts the hue on a child
glyph — that remaining blind spot is now stated rather than implied. Four evasion shapes are
asserted, each also asserted to have been invisible to the old adjacency check.

### WR-04 + WR-15: comment-blind counting, and line counts dictating production code

**Files modified:** `tests/design/brand-recipe.test.ts`, `src/app/(host)/host/listings/[id]/edit/wizard.tsx`
**Commit:** `a4541d3`

The stripper is applied to the **count** paths only; the zero-assertions keep reading raw text,
because for a class that must appear nowhere a comment quoting it is indistinguishable from a call
site using it, and the phase relies on that. The wizard's two byte-identical branches are merged; the
pinned total moves 9 → 8 as a direct and stated result.

### WR-06: `scaffold-residue`'s metadata assertion silently disarms

**Files modified:** `tests/design/scaffold-residue.test.ts`
**Commit:** `47d00df`

Both anchors asserted before use, with failure messages that say to re-point rather than delete.

### WR-12: `metadataBase` crashes the root layout on an empty `NEXT_PUBLIC_APP_URL`

**Files modified:** `src/app/layout.tsx`
**Commit:** `d4a7bf4`

Verified against `undefined`, `""`, `"   "`, `"example.com"` and two valid origins: the old shape
throws on three, the new one falls back on exactly those three and passes valid values through.

### WR-13: Payout badge exhaustiveness rests on a cast plus a guard over a derived value

**Files modified:** `src/components/host/payout-state-badge.tsx`, `tests/design/status-vocab.test.ts`
**Commits:** `01b7489`, `9283617`

Branches on `state === "failed"`; the cast is gone and the narrowing is real. Output is unchanged —
`failed` is the only state mapping to the attention tone.

`9283617` is a follow-up I caught while working on WR-08: the DS-10 gate asserted the component
contained `view.tone === "attention"` against **raw** text, so after the fix it kept passing because
my own explanatory comment quoted the old condition. It now strips comments, asserts the real
branch, and asserts the derived-value form is absent.

### WR-14: The "one rule id" constant is not read by the ESLint half

**Files modified:** `eslint.config.mjs`, `tests/design/leak.test.ts`
**Commit:** `94a81cc`

The D-16 test had the same defect as the config and moved with it: it required the literal id to
*appear*, which passed just as well when re-typed as when shared. Verified end-to-end that the rule
still reports under the same id and that `eslint-disable-next-line` still suppresses it.

### WR-11: The generator silently clamps an out-of-gamut colour

**Files modified:** `scripts/generate-design-tokens.mjs`, `tests/design/token-drift.test.ts`
**Commit:** `05bbe95`

`hexOf` is exported so the throw can be **observed failing**, following the module's existing pattern.
Asserted in both directions using the recorded out-of-gamut value, then across every declared token.
Generator output unchanged: `wrote 0/3`, twice.

### WR-10: Four type-role names hand-maintained in three places with no derivation

**Files modified:** `src/lib/utils.ts`, `tests/design/type-scale.test.ts`
**Commit:** `e1d8020`

`ROLES` is parsed out of `@theme inline`; `utils.ts` exports its list so the two are compared. A role
is defined precisely as a `--text-<name>` whose value is `var(--fs-<name>)` — the `--fs-` wiring is
what makes a step travel per theme, and it cleanly separates roles from the default t-shirt steps the
same block re-declares. Verified the derivation returns exactly four today and picks up a synthetic
fifth.

### WR-07: Palette and white/black patterns miss directional and prefixed forms

**Files modified:** `config/design-leak-patterns.mjs`, `tests/design/leak.test.ts`
**Commit:** `9c9d641`

Both patterns now build from one shared `COLOUR_ROLE` fragment so they cannot drift. All 11 named
shapes plus 3 more now flag; 6 neighbouring token forms still do not. Latent debt — none was present
in the tree.

### WR-08: DS-10's tone→recipe map is implemented for one of four tones

**Files modified:** `src/lib/design/status-tones.ts`, `tests/design/status-vocab.test.ts`
**Commit:** `ecaee51`

All four recipes pinned by value; `soft-accent` gains a per-element call-site assertion like
`positive`'s, since it turns out to have a genuine adopter. The false claim about `outline` is
corrected precisely: the collapse removed it from the **tone union**, but did not restyle the badges.

**One half deliberately not done, and recorded as such.** Making `neutral` and `attention` load-bearing
at call sites means deciding whether `approved`/`processing` lose their border treatment and whether
the closed lifecycle statuses lose their de-emphasised muted ink. Those are design decisions with
visible consequences on every booking and payout surface, not refactors. (`--secondary` and `--muted`
are byte-identical in both themes, so the surface would not move — but the ink and the border would.)
A test now asserts the current arrangement so the deferral cannot rot into a claim nobody re-checks.

### WR-01: DS-09 is ~20% adopted and the gate's recorded justification is wrong

**Files modified:** `tests/design/brand-recipe.test.ts`, `src/components/group/rsvp-form.tsx`
**Commit:** `57f52ee`

Corrected the false justification and replaced the description with a **measurement** (a ceiling, not
a zero, since DS-09 is Pending with Phase 17 as owner).

Measuring paid for itself: the review enumerated seven sites by hand; the count found **eight** —
`rsvp-form.tsx`'s "Change my answer" button was missed. Both of that file's are converted, one
because it sat beside an already-converted sibling and the pair rendered the same 44px with different
padding. Six remain, all Phase 17's. The ceiling deliberately does not exempt the D-22 files even
though `search-bar.tsx` is one and still has two.

## Judgement calls worth a second opinion

Three places where I did something other than the literal suggestion. All are green, all are
argued in the commit messages and in code comments, but they are the places to look first:

1. **CR-01 dropped `aria-invalid:ring-3`** as well as the colour, on the currentcolor evidence above.
   If the soft error halo is wanted, the shape that preserves it without re-breaking focus is a
   `not-focus-visible`-scoped ring — but that requires an explicit gate exemption, and I judged
   subtraction safer than a new variant idiom.
2. **CR-03's gate half is the widened alpha scan, not the suggested `CONTRAST_PAIRS` row**, because
   the row goes red by the review's own account and would have meant committing a red suite.
3. **WR-08 is deliberately half-done**, per the design decision recorded above.

Two changes are visible in the product beyond the literal findings, both forced by a gate that
started reporting truthfully: `badge.tsx`'s destructive link-hover (was failing AA at 4.01/3.87), and
the slot picker's anchor ring (was 2.23/2.03). Both now use already-declared, already-measured
pairings.

---

_Fixed: 2026-08-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
