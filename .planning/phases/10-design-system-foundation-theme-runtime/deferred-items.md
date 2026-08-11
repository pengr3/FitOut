# Phase 10 — deferred items

Discoveries logged rather than fixed, because they sit outside the scope of the plan that found them.

---

## D-1 — Tailwind's content scan reads `.planning/**/*.md`, so PROSE emits utilities

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

## D-1 UPDATE (2026-08-11, from 10-07) — the phantom utility is now demonstrable in the SHIPPED bundle

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
