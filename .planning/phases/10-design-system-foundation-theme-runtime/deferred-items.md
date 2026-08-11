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
