# Phase 10 — deferred items

Discoveries logged rather than fixed, because they sit outside the scope of the plan that found them.

---

## D-1 — CLOSED by 10-12 — Tailwind's content scan reads `.planning/**/*.md`, so PROSE emits utilities

**Status: RESOLVED 2026-08-12 in plan 10-12 (commit `bf5584d`).** Fixed with one directive —
`@import "tailwindcss" source("../")` in `src/app/globals.css`, which points automatic source
detection at `src/` instead of the repository root. Taken by 10-12 as 10-04 and 10-09 both suggested,
and made acute by 10-12 itself: migrating the 14 shadow call sites orphaned all five default
`shadow-*` rules, which kept shipping anyway from the stylesheet's own comment and the phase's plan
documents.

**Measured on a clean `rm -rf .next && npm run build`, both sides:**

| | before | after |
|---|---|---|
| shipped CSS | 134,132 bytes | **119,079 bytes** (−15,053, −11.2%) |
| distinct selectors | 1,233 | **1,114** (−119, **0 added**) |
| `.shadow-xs/sm/md/lg/2xl` | 5 rules | **0** |
| `.bg-brand\/90`, `.outline-ring\/50`, `.focus-visible\:ring-ring\/50` | present | **0** |

**Zero real utilities were lost, verified two independent ways.** (1) A strict standalone-class-token
scan of all `src/**/*.tsx` found **0 of the 119** removed selectors used anywhere. (2) The eight
highest-risk entries were checked by hand and their real prefixed forms confirmed still emitted:
`sticky` → `lg:sticky`, `bg-white` → `dark:bg-white`, `ring-3` → `aria-invalid:ring-3`,
`ring-offset-background` → `focus-visible:ring-offset-background`, `animate-in`/`zoom-in-95` →
`data-open:…`, `@container` → `@container/card-header`, `hover:bg-primary/80` →
`[a]:hover:bg-primary/80`, `focus-visible:ring-3` → genuinely unused. The removed list reads as what
it is: `text-[NNpx]`, `text-[Nrem]`, `bg-[--x]`, `bg-[color-mix(in_oklch,...)]`, `text-display/7`,
and the bare numbers `247031` / `2596` / `706708` — byte counts quoted in documents.

**The fix is worth more than the bytes, because removing the prose exposed two live defects that had
been masked by it.** Both had been passing tests for the wrong reason for the whole phase:

1. **`tests/design/helpers/compile-css.ts` — `@tailwindcss/postcss` caches its compiled design system
   KEYED ON THE INPUT FILE PATH.** Every compile passed `from: GLOBALS_CSS_PATH`, so the first one in
   a test file won and every later one silently returned the first one's candidate set — the appended
   `@source inline(…)` was accepted and ignored. `elevation-z.test.ts`'s "the default shadows are
   still literal" control was therefore **not** passing because its safelist worked; it was passing
   because a markdown file said `shadow-md`. Each compile is now attributed to a distinct filename in
   the same directory (imports and the content root resolve identically; nothing is written to disk).
2. **`tests/design/font-cycle.test.ts` — three DS-01 assertions read `.font-sans` / `.font-mono`
   rules that no file in `src/` uses.** `font-sans` reaches the app through `@apply font-sans` in
   `@layer base`, which *inlines* the declaration and never needs the utility to be generated. The
   assertions now read the artifacts that actually carry DS-01 — the compiled `html { font-family }`
   rule, and `.font-heading`, which has two real call sites — plus an explicit safelisted "IF it were
   used" claim with its own positive control. DS-01 was never broken: `html{font-family:var(--font-geist-sans)}`
   is present in the shipped bundle before and after.

**What this unlocks.** Compiled-output assertions are now SOUND in this repo for the first time.
`tests/design/elevation-z.test.ts` immediately makes the strongest DS-03 claim available — *no
default shadow rule exists in the emitted stylesheet, from any source* — guarded by a control that
the narrowed root still reaches `src/`, so a root narrowed one level too far (which would make every
absence assertion pass perfectly against an app shipping no CSS at all) goes red. Plans 10-13 through
10-17 may now assert against compiled output; before this they could not, and 10-07 and 10-11 both
had to route around it.

**One correction to the original item, recorded for accuracy:** it claimed `bg-zinc-50` "exists
nowhere in `src/`". It does — `src/app/(auth)/layout.tsx:15` and `src/app/(host)/host/layout.tsx:84`
both render it on real surfaces. It is still in the bundle after the narrowing, correctly. It is a
raw-value leak for 10-17's DS-13 gate to judge, not a phantom.

The three later UPDATE sections further down this file (from 10-07, 10-09 and 10-10) are all
**superseded by this resolution** and are kept for the record — each measured a different phantom, and
together they are why the fix was taken rather than deferred again.

<details><summary>Original item as logged by 10-04</summary>

**Found during:** 10-04 Task 3, while sanity-checking the compiled stylesheet.

**What was measured.** Compiling the real `src/app/globals.css` emits `.bg-zinc-50` and
`.outline-ring\/50`. Neither string exists anywhere in `src/` (grep-verified, zero hits after this
plan removed the last `outline-ring/50`). Both appear in `.planning/phases/10-.../10-RESEARCH.md`
and `10-UI-SPEC.md` — `bg-zinc-50` as a leak-gate FIXTURE EXAMPLE, `outline-ring/50` as the
anti-pattern the phase exists to delete. Tailwind v4's automatic source detection walks the project
root respecting `.gitignore`, and markdown is not excluded, so the planning documents are content.

**Why it matters, in two different ways.**

1. **Bundle:** the shipped CSS carries utilities nothing in the app uses, including the exact class
   this phase is removing. Cosmetic today, but it grows with every document written.
2. **Gate soundness — the real one:** any design assertion of the form "utility X is present in the
   compiled output" can be satisfied by a sentence in a markdown file. That is the vacuous-pass
   shape this phase's guard-the-guard blocks exist to prevent, arriving through a side door.

**Why it is NOT this plan's to fix.** It predates the plan (it has held since Tailwind v4 was
adopted), it is not caused by any change here, and the fix — an explicit `@source` narrowing in
`globals.css`, or a `.gitignore`/`@source not` exclusion — changes what the production bundle
contains and deserves its own verification.

**What 10-04 did instead, and why the new tests are already immune.** The compiled-CSS assertions
added in this plan go through `compileGlobalsCssWith()`, which appends Tailwind's own
`@source inline(…)` safelist. Presence is therefore forced by the test rather than inherited from
whatever prose happens to exist, and the two positive controls (`text-figure`, `shadow-floating`)
stay valid regardless: the content scan can only emit a utility whose `@theme` key is declared, and
those two are declared nowhere, so a document mentioning them still cannot fabricate a rule.

**Suggested owner:** plan 10-12 (the drift check) is the natural home — it is the other plan whose
correctness depends on "what the compiled stylesheet contains" meaning "what the app uses".

</details>

---

## D-2 — CLOSED by 10-07 — the `destructive` variant overrides the focus ring with a 20%-alpha colour

**Status: RESOLVED 2026-08-11 in plan 10-07 Task 1 (commit `afdaf2b`).** Taken exactly as this item
suggested — 10-07 widened its assertion from the literal `ring-ring/50` to *any* alpha modifier on a
focus-scoped ring colour, and `tests/design/focus-recipe.test.ts` now pins it. The widening found the
same defect in a **second** file this item did not name: `src/components/ui/badge.tsx`'s `destructive`
variant carried the identical `focus-visible:ring-destructive/20` + `dark:focus-visible:ring-destructive/40`
pair. Both files lost the override and its dark-mode twin, plus `button.tsx`'s
`focus-visible:border-destructive/40` (the base no longer sets a focus border at all, so the override
had nothing left to override).

**The `dark:` pin was restated first, as this item required — and the restatement found the pin was
being read two different ways.** `grep -c "dark:" src/components/ui/button.tsx` returns **4**, which
is a LINE count; `grep -rho "dark:" src/components/ui/ | wc -l` returns **56**, which is an
OCCURRENCE count. THEME-05's 56 and 10-06's 4 are different metrics over different scopes, and the
`awk -F: '{s+=$2}'` form written into 10-07's own acceptance criteria computes a THIRD number (24,
the line-count sum) that matches neither. After this plan the vendored occurrence total is **54** —
the two removed dark-mode twins, and nothing else. Any future plan re-pinning this number must say
which metric it means.

<details><summary>Original item as logged by 10-06</summary>


**Found during:** 10-06 Task 1, while replacing the base focus recipe.

**What is there.** `src/components/ui/button.tsx`'s `destructive` variant carries
`focus-visible:border-destructive/40 focus-visible:ring-destructive/20` (plus a dark-mode twin at
`/40`). Those are *variant-level overrides of the base recipe's colour*: a focused destructive button
therefore paints a 2px ring at 20% alpha, not the solid `--ring` this plan just made canonical. It is
the same defect class as the 50%-alpha ring DS-05 exists to remove — arithmetically it is worse, and
no token value fixes it — but at a different alpha and in a different position.

**Why it is NOT this plan's to fix.** It is pre-existing and is not caused by anything changed here:
before this plan the base was also alpha, so the override changed nothing about the outcome. 10-06's
action is explicitly scoped to four recipes and one size, and its acceptance criteria pin
`grep -c "dark:"` at its before-value — removing the override honestly would mean touching the
dark-mode twin too, which would break that pin and THEME-05's vendored count of 56.

**Why it is NOT already covered.** Plan 10-07 owns "the remaining 12 `focus-visible:ring-ring/50`
sites". This string is `ring-destructive/20`, so a scan for `ring-ring/50` will not see it and 10-07
will close green with this still shipping.

**Suggested owner:** plan 10-07, as a widening of its DS-05 assertion from the literal
`ring-ring/50` to *any* alpha modifier on a `focus-visible:ring-*` colour — the same widening
`tests/design/button-variants.test.ts` already applies locally (`expect(...).not.toMatch(/ring-ring\/\d+/)`).
If 10-07 takes it, the `dark:` count pin in that plan must be restated first.

</details>

---

## D-3 — three controls now paint TWO focus indicators: a 1px outline inside a 2px ring

**Found during:** 10-07 Task 1, while applying the canonical recipe.

**What is there.** `src/components/ui/scroll-area.tsx`, `src/components/ui/tabs.tsx` and
`src/components/booking/bookings-tabs.tsx` each carry `focus-visible:outline-1` (two of them with an
explicit `focus-visible:outline-ring`) *in addition to* the ring recipe this plan gave them. With the
ring now solid and offset by 2px, a focused control at those three sites renders a 1px solid `--ring`
line at the border box, then a 2px `--background` gap, then a 2px `--ring` ring. That is a visible
double-ring, not the single indicator DS-05's wording describes.

**Why it was NOT fixed here.** 10-07's action is scoped to the alpha and the offset; it does not
mention the outline utilities. More importantly `10-UI-SPEC.md:384-385` explicitly accounts for these
as surviving sites — it describes `globals.css`'s `outline-ring` as *"the colour source for the 3
`focus-visible:outline-1` sites"* — so removing them contradicts the spec this phase is executing.
And the defect is cosmetic, not an accessibility failure: it is MORE indicator, not less, and both
layers are solid, verified colours.

**Suggested owner:** the phase's visual pass (Phase 11 GATE-01), which sees real pixels and can
decide whether the doubled indicator reads as intentional. If it does not, the fix is deleting three
`focus-visible:outline-*` utilities and the matching sentence in the UI-SPEC.

---

## D-4 — the invalid-state rings are still low-alpha (18 occurrences, 9 files)

**Found during:** 10-07 Task 2, while widening the scan past the literal.

**What is there.** `aria-invalid:ring-destructive/20` (9 occurrences) and its dark-mode twin
`dark:aria-invalid:ring-destructive/40` (9 occurrences) across `badge`, `button`, `checkbox`,
`input-group`, `input`, `radio-group`, `select`, `switch`, `textarea`, `toggle`. Arithmetically these
are the *same* defect as the ring DS-05 removed — a colour diluted by a `color-mix` toward
transparent — at an alpha worse than the one that measured 2.32:1.

**Why it is NOT DS-05's.** DS-05's wording is about the FOCUS indicator ("no control relies on a
50%-alpha ring as its **only focus indicator**"). An invalid-state ring is a validation affordance
that never appears alone — it is accompanied by `aria-invalid:border-destructive` (a solid 1px
boundary) and, at every call site in this app, by a text error message, which is the affordance a
screen reader and a colour-blind user actually rely on. Widening this plan's gate to cover it would
also have moved the vendored `dark:` occurrence total by 9 in a single stroke, on a class of
utilities nobody has measured yet.

**What is needed before fixing it.** A measurement, not an edit: what does
`color-mix(in oklab, var(--destructive) 20%, transparent)` composite to over `--background` and over
`--card` in both themes, and does the accompanying solid border already carry the 3:1 bar on its own?
If the border carries it, these rings are decorative and may stay.

**Suggested owner:** Phase 17's a11y audit, or a dedicated DS requirement in a later milestone.

---

## D-5 — the slot picker's anchor ring is a 50%-alpha brand colour

**Found during:** 10-07 Task 2, while surveying every alpha-modified ring in the tree.

**What is there.** `src/components/availability/slot-picker.tsx:212` —
`isAnchor && "border-brand ring-2 ring-brand/50"`. It is the only remaining half-alpha ring in
`src/`, and it is `--brand` rather than `--ring`.

**Why it is NOT this plan's.** It is not a focus indicator — it marks the anchor slot in a
multi-slot selection, it is driven by application state rather than by `:focus-visible`, and it is
paired with a solid `border-brand` that carries the boundary on its own. DS-05 says nothing about
selection affordances, and 10-07's gate is deliberately scoped to focus-scoped rings so that it does
not quietly become the owner of every ring in the app.

**Also worth noting for whoever takes it:** an accent-coloured ring is exactly what D-132 rejected
for the FOCUS indicator (it spends the 10% accent budget and makes focus indistinguishable from brand
emphasis). Here the brand colour is the point — this ring *is* a brand-emphasis signal — so the
question is only the alpha, not the hue.

**Suggested owner:** plan 10-13 or Phase 11's visual pass.

---

## D-1 UPDATE — SUPERSEDED by the 10-12 fix (2026-08-11, from 10-07) — the phantom utility is now demonstrable in the SHIPPED bundle

`npm run build` at the end of 10-07 emits, into `.next/static/chunks/*.css`:

```css
.focus-visible\:ring-ring\/50:focus-visible{--tw-ring-color:color-mix(in oklab, var(--ring) 50%, transparent)}
```

**Zero files under `src/` reference that class** — verified by the committed scan in
`tests/design/focus-recipe.test.ts`, which walks all 215 `.ts`/`.tsx`/`.css` files and finds none. The
rule is emitted purely from PROSE: the phase's own planning markdown, and now
`tests/design/focus-recipe.test.ts` itself, which must name the banned string in order to ban it.

This sharpens D-1 from "cosmetic bundle growth plus a theoretical gate hole" to a concrete one: **any
DS-05 assertion phrased against the COMPILED stylesheet — "the half-alpha rule is absent from the
output" — would fail today against a perfectly clean source tree.** That is why 10-07's gate is a
source scan and not a compile assertion, and it is the strongest argument yet for 10-12 narrowing
Tailwind's `@source`.

---

## D-6 (2026-08-12, from 10-08) — three PRE-EXISTING e2e failures on the drop-in, confirmation and cancel surfaces

Found while running plan 10-08's verification block. **None is caused by this plan**, and each was
proven so rather than assumed: the eleven source files 10-08 modified were checked out at the
pre-plan commit `ffbf6b5`, the same specs were re-run, and the failures reproduced with an identical
signal (`2 failed / 6 did not run / 1 passed` on `open-capacity` + `search-and-book`, byte-for-byte
the same as HEAD). Logged rather than fixed, per the executor's scope boundary.

**1. `e2e/open-capacity.spec.ts:376` — the drop-in day panel does not follow the picked day.**
The spec clicks the day three days out (Sat Aug 15) and waits for the panel heading. The Playwright
snapshot shows the click landed on an enabled, in-month, non-outside cell, and the panel still reads
**"Wednesday, Aug 12" — today**, which the picker auto-selects on mount. This is the *core-value*
drop-in surface, so it is the most important of the three. Two mitigating facts before anyone panics:
`tests/availability/date-pass-picker.test.tsx` is green in the 1197-test suite, and the describe block
is SERIAL — this one failure is what skips its four siblings, so the blast radius reads far wider than
the single root cause it is. Most likely a date/fixture interaction (`spotsDate = dayAt(3)` is derived
from `new Date()` at module load against a Makati-tz venue), not a broken picker; that hypothesis is
untested and should be the first thing checked.

**2. `e2e/search-and-book.spec.ts:296` — the FIT reference resolves to two elements after a reload.**
`getByText(reference, { exact: true })` raises a strict-mode violation with two matching nodes on the
durable-confirmation page. Either the booking reference genuinely renders twice on `/bookings/[id]`
(a real duplicate the assertion is right to catch) or the locator needs scoping. Worth answering
rather than silencing — this is the D-43 durable-confirmation guarantee.

**3. `e2e/cancel.spec.ts:224` — intermittent, and environmental.** The server log carries
`[CANCEL_ALERT] refund_dispatch_failed … PayMongo POST /v1/refunds failed (404): No such payment with
id pay_e2e_…`. The fixture seeds a synthetic payment id that PayMongo test mode does not know, so the
refund dispatch 404s. It did not fire in the final full run, which is why it is called intermittent.

**Suggested owner:** not a design-system plan. These are booking-flow regressions or fixture rot and
belong to whoever next owns e2e health; Phase 11's visual pass will be running these surfaces anyway.

---

## D-1 UPDATE — SUPERSEDED by the 10-12 fix (2026-08-12, from 10-09) — now measured in bytes, and the accent case is the sharpest yet

10-04 found the mechanism, 10-07 demonstrated it in the shipped bundle for the focus ring. 10-09 is
the first plan to remove the LAST source usage of an accent recipe, which makes the leftover
measurable rather than theoretical.

**After a `rm -rf .next && npm run build` clean rebuild** — verified clean, not cached: the rebuilt
CSS is byte-identical (133,801 bytes) to the incremental one — the stylesheet still contains **8
rules across 4 selectors** for a class that exists nowhere in `src/`:

```
.bg-brand\/90                                                                    (× 2)
.hover\:bg-brand\/90:hover                                                       (× 2)
.data-\[selected-single\=true\]\:hover\:bg-brand\/90[data-selected-single=true]:hover   (× 2)
.data-\[state\=on\]\:hover\:bg-brand\/90[data-state=on]:hover                    (× 2)
```

**770 bytes, 0.58% of the shipped stylesheet**, for the exact recipe this phase exists to delete.
(Each selector appears twice because Tailwind emits a fallback plus an `@supports (color:color-mix…)`
block.)

**The provenance is provable, not inferred.** The variant-prefixed form
`data-[selected-single=true]:hover:bg-brand/90` appears in exactly ONE tracked non-`src/` file —
`.planning/phases/10-.../10-09-PLAN.md:140`, where the plan instructs the executor to remove it. The
plan document that orders the deletion is what keeps the deleted rule in the bundle. The other three
come from `tests/design/brand-recipe.test.ts` and `button-variants.test.ts`, which must name the
literal in order to ban it.

**Why this matters beyond bytes.** It puts a measured cost on this phase's standing resolution
(*"a file whose job is to ban a string is allowed to name it, because `tests/` is outside the scanned
tree"*). That is true of the **design gate's** walker, which roots at `src/`. It is NOT true of
**Tailwind's** content scan, which roots at the repo. Two scanners, two different roots, and only one
of them was ever reasoned about. Nothing is broken — no element carries these classes, and Tailwind
would emit the utility on demand anyway — but any future assertion of the shape *"the banned recipe
is absent from the compiled output"* is unsatisfiable by construction while this holds.

**Still not fixed here, same reason as before:** the fix is an `@source` narrowing in
`src/app/globals.css`, which changes what the production bundle contains and is owned by 10-12.
`src/app/globals.css` is not in 10-09's file scope, and 10-09's gate is deliberately a SOURCE scan
for precisely this reason.

---

## D-7 (2026-08-12, from 10-10) — `soft-accent` is declared with no adopter wired to it

`STATUS_TONE_RECIPES["soft-accent"]` ships as `bg-brand/10` / `text-foreground` / `text-brand`, which
is **exactly** what `src/components/availability/spots-left-chip.tsx:64,66` already renders — as three
literal classes that know nothing about the vocabulary. So the tone is correct and shipped, but the
one surface that embodies it is not routed through it, and a future change to the soft accent would
move the recipe and leave the chip behind.

**Not fixed here, and the reason is a gate rather than laziness.** `spots-left-chip.tsx` is one of the
6 files whose accent-line count `tests/design/brand-recipe.test.ts` pins BY NAME (1 line, part of the
DS-08 nine). Rewiring it to read `STATUS_TONE_RECIPES` changes how many lines in that file match
`bg-brand`, so the rewire and the gate have to move together — and the file is not in 10-10's scope.
`status-vocab.test.ts` deliberately does NOT assert a soft-accent adopter for the same reason: an
assertion that the chip imports the vocabulary would be asserting something this plan is not allowed
to make true.

The three lifecycle tones (`neutral`, `positive`, `attention`) are all genuinely reached — `positive`
by four call sites pinned as a set, `neutral` and `attention` by both derive functions driven over
every status. `soft-accent` is the only tone with a declared-but-unwired adopter.

## D-1 UPDATE — SUPERSEDED by the 10-12 fix (2026-08-12, from 10-10) — a fourth phantom recipe, from this plan's own gate

`tests/design/status-vocab.test.ts` must name the retired filled pairing verbatim in order to pin it
to one file, so `bg-success` and `text-success-foreground` now join the accent recipes in Tailwind's
repo-rooted content scan. `src/app/(host)/host/listings/[id]/edit/wizard.tsx` still carries the real
one, so nothing is phantom *yet* — the day that marker changes, the utility survives in the bundle
with no element using it, exactly as D-1 describes. `10-10-PLAN.md` itself quotes the pairing three
times, which is the same self-inflicted shape 10-09 measured. Owned by 10-12 (`@source` narrowing).

---

## D-6 UPDATE (2026-08-12, from 10-13) — failure 1 re-confirmed pre-existing at a five-commits-later baseline; failures 2 and 3 did not fire

Plan 10-13 remapped 20 z-index call sites, which is exactly the class of change that *could* put an
overlay above its own content — so `npm run test:e2e` was the plan's stated verification and D-6
item 1 fired again, at the same line, on the same date: `e2e/open-capacity.spec.ts:376`, waiting for
the `Saturday, Aug 15` panel heading, `element(s) not found`.

**Proven pre-existing a second time, independently, and against a newer baseline than D-6 used.** All
twelve source files this plan touched were checked out at `45ecf07` (the 10-12 docs commit, five
commits after the `ffbf6b5` baseline D-6 tested) and the full suite re-run: **identical signal — 17
passed / 1 failed / 5 did not run, same test, same assertion, same locator.** Restored to HEAD
afterwards and re-verified: design gate 292/292, `tsc --noEmit` exit 0, working tree clean.

Two observations worth adding to the original entry:

- **It is not a stacking bug, which was the one hypothesis this plan was obliged to rule out.**
  Playwright reports `element(s) not found`, meaning the heading is absent from the DOM — a z-index
  cannot do that, and an intercepted click would have failed inside `pickDay` rather than at the
  assertion after it. The pre-plan reproduction settles it regardless of the reasoning.
- **It is order-sensitive, which sharpens D-6's untested hypothesis.** Running the spec file alone
  once, case 1 PASSED and case 2 failed instead (on the scarcity chip reading `Spots available`
  where `Only 1 left` was contracted). Running it under `--workers=1` and under the full suite, case
  1 failed. So the describe block's serial state machine — not just the module-load date derivation
  — is part of the picture. Leftover rows were ruled out: `booking`, `listing` and `user` all report
  **0** `e2e_%` rows between runs, so `afterAll` teardown is working.

**Failures 2 and 3 did not reproduce in any of this plan's four full runs** (`search-and-book` and
`cancel` were among the 17 passed each time), consistent with D-6 calling item 3 intermittent.

**Owner unchanged:** not a design-system plan. Recorded here so the next executor does not re-derive
the causality check a third time.

---

## D-6 UPDATE (2026-08-11, from 10-14) — a THIRD identical reproduction; the two auth specs pass

`npm run test:e2e` at the end of 10-14: **17 passed / 1 failed / 5 did not run** — the same test
(`e2e/open-capacity.spec.ts:376`), the same locator (`getByRole('heading', { name: 'Saturday, Aug 15' })`),
the same `element(s) not found`. Byte-identical to the signal D-6 recorded from 10-08 and the D-6
UPDATE recorded from 10-13.

**Causality was NOT re-derived, deliberately** — 10-13's summary asked the next executor not to, and
this plan has no mechanism to reach that surface: it changes 18 class strings, 4 comments and one new
test file, with no DOM structure, no stacking, no date arithmetic and no query touched. What WAS
verified, because 10-14 edits `(auth)/login` and `(auth)/signup` (threat T-10-29): both auth specs
were re-run on their own and **both pass** — `login-persistence.spec.ts:23` (AUTH-02/D-12) and
`password-reset.spec.ts:51` (AUTH-03), plus `stale-session-selfheal.spec.ts:90` inside the full run.

---

## D-8 (2026-08-11, from 10-14) — two transient positive confirmations now carry no positive affordance

**Found during:** 10-14 Task 1, while retiring the last two numbered greens.

**What is there.** `src/app/(auth)/login/page.tsx`'s `ResetNotice` ("Password updated — please sign
in.") and `src/app/(app)/profile/profile-form.tsx`'s save confirmation ("Profile saved.") were both
GREEN TEXT and are now neutral: the notice is the neutral tint with full-contrast ink, the save line
is secondary ink. Neither carries a hue any more, and neither carries an icon.

**Why the green could not simply be re-pointed at the semantic token.** D-14 is structural: status
hue lives in an ICON and never in TEXT, and `contrast-pairs.ts` has no text-bar row for `--success`
because 0.58-lightness green cannot clear 4.5 on a light surface. `text-success` on a sentence would
have been a DS-06 violation that the contrast suite could not catch, because the pairing exists — at
the 3:1 non-text bar. So the only two honest outcomes were "neutral" or "neutral + a success glyph",
and this plan took the first.

**Why the glyph was NOT added here, and it is a gate rather than laziness.** `tests/design/status-vocab.test.ts:369`
asserts `positiveIconSites` **equals** a four-file set BY NAME, and `:372` requires each of those four
to carry all three slots of the `positive` recipe — surface, text and icon. Adding a glyph to either
site grows that set, and `profile-form.tsx`'s line is a bare inline `<p>` beside a bare inline error
`<p>`: it has no chip surface to tint, so it would need a SECOND category in a pinned gate that plan
10-10 shaped deliberately around status *chips*. That is the same shape as D-7 — a rewire whose gate
lives in another plan's file — and `status-vocab.test.ts` is not in 10-14's scope.

**What is and is not lost.** Nothing accessibility-relevant: both elements keep `role="status"`, both
render ONLY on success, and each one's own sentence is the entire signal, so colour was never
carrying meaning (which is exactly DS-10's rule — the four chips 10-10 re-treated were different,
because there a persistent state was being distinguished from its siblings). What is lost is a
pleasant affordance and consistency with the four re-treated chips.

**Suggested owner:** Phase 11's visual pass (GATE-01), which sees real pixels and can decide whether a
confirmation that looks identical to ordinary secondary text reads as confirmation. If it takes it,
the change is a `CheckCircle2` in the positive tone's icon slot at each site plus a split of
`POSITIVE_CALL_SITES` into a chip list (surface + text + icon) and an inline list (text + icon, with
the absent surface asserted rather than merely unmentioned).

---

## D-6 UPDATE (2026-08-12, from 10-16) — a FIFTH identical reproduction; the design gate and full DB suite are unmoved

`npm run test:e2e` at the end of 10-16: **17 passed / 1 failed / 5 did not run** — the same test
(`e2e/open-capacity.spec.ts:376`), the same locator (`getByRole('heading', { name: 'Saturday, Aug 15' })`),
the same `element(s) not found`. Byte-identical to the signals D-6 recorded from 10-08 and the UPDATEs
from 10-13, 10-14 and 10-15.

**Causality was NOT re-derived**, per 10-13's standing request. This plan adds one route that nothing
in `e2e/` navigates to, plus two test files. It DOES change one repo-wide utility — `cn()` — so the
relevant check is not the failing spec but the 17 that pass: every one of them renders shipped
product surfaces through `cn()` in a real browser, and the full DB suite is **1197 passed / 4
skipped**, unchanged from the recorded baseline. The merge registration is additive (four names move
from the text-colour group to the font-size group) and no shipped call site composes those names.

---

## D-9 (2026-08-12, from 10-16) — `/dev/theme`'s utilities ship to production, where the route 404s

**Found during:** 10-16 verification, on a clean rebuild of both sides.

**What is there.** The production guard makes the route unreachable — `npm run build && npm start`
then `GET /dev/theme` returns **404** with Next's built-in not-found page, verified. But Tailwind's
content scan reaches `src/app/dev/theme/**` like any other source, so the utilities only that page
uses are still compiled into the stylesheet every user downloads: the third elevation step, the three
non-Display type roles, the upper radius steps, the border swatch fill and a handful of layout
classes.

**Measured, not estimated.** Clean `rm -rf .next && npm run build` with the route directory moved out
of `src/` and then back:

| | bytes |
|---|---|
| without `src/app/dev/**` | 118,732 |
| with it | **119,835** |
| delta | **+1,103 (+0.93%)** |

**Why it was accepted rather than fixed.** The only mechanism that would remove it is excluding the
directory from the content root (`@source not`), and that makes `/dev/theme` render UNSTYLED in
development — which destroys the one surface the phase ships. The alternative, an explicit
`@source inline(…)` safelist listing every class the preview needs, is a second list that drifts
silently from the page the moment a section is edited, and this phase's whole argument (D-16, the
leak patterns; D-18, the generated tokens) is against second lists.

**Suggested owner:** plan 10-17, which owns the build gate and is the plan most likely to look at the
bundle; or Phase 17's audit. If either takes it, the honest fix is probably not a safelist but a
build-time decision about whether the route is emitted at all. Recording the number here so it is a
known 0.93% rather than a surprise.
