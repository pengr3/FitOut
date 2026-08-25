// @vitest-environment jsdom

// AUTHUI-02 — THE PROFILE DESIGN PASS, AS A COMMAND THAT EXITS NON-ZERO.
//
// 15-UI-SPEC's profile claims (AC#9-12) are unusually PRECISE for prose: one `<h1>` at the adopted
// scale, exactly two `panel-card` containers, the page and its plate reading ONE shell import each,
// zero accent fills, zero destructive variants, zero success tokens, every shipped sentence
// byte-identical, a save path with no timer, and an avatar block that gained no removal control.
// Every one of them was still prose until this file existed — plan 15-08 shipped the markup and
// verified it with a table of `grep -c` results pasted into a summary, which is a measurement of one
// afternoon rather than a property of the tree.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE FOUR-LINK CHAIN — PAGE → PATTERN (AST) → ATTRIBUTE (DOM) → CONTRACT (UNION)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `cancel-page-shell.test.tsx:42-47`'s chain and `auth-composition.test.tsx:11-27`'s, on the profile
// side of the same phase. A source scan alone proves only the FIRST link — that a file composes a
// pattern. It cannot see what that pattern renders, so a gate built from source alone stays perfectly
// green the day `PanelCard` loses its hook. So:
//
//   1. file → pattern      an AST walk over the FOUR profile files: what each composes, what it
//                          does NOT compose, and which import it reads its container class from.
//                          Aliased imports resolved through `propertyName ?? name`.
//                          ⚠ FOUR SINCE PLAN 16-11, and the fourth is not decoration. The avatar
//                          block left `profile-form.tsx` for `components/profile/avatar-field.tsx`
//                          (CROP-01), which emptied the two assertions in (10) that were scanned
//                          against `FORM` specifically. They were RE-SCOPED to the new file by
//                          NAME rather than widened to "somewhere in the tree": the claim is that
//                          exactly ONE file input and exactly ONE `Upload avatar` name exist, and
//                          a claim that does not say where is not worth making (T-16-39).
//   2. pattern → attribute a RENDER of the REAL `ProfileForm` in jsdom, counting the test-id
//                          attribute off the produced DOM rather than off anybody's source.
//   3. attribute → contract that value pinned against `SELECTOR_IDS`, the closed union that declares
//                          it. A hook outside the union is a hook nothing declares.
//   4. the copy            every shipped sentence written into this file as a literal, so a copy
//                          change has to move a test file and be seen in the diff (T-15-28).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THE DOM LINK IS THE REAL COMPONENT, AND THE PLAN EXPECTED IT NOT TO BE — MEASURED, 24 Aug 2026
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 15-10-PLAN warns that `profile-form.tsx` "imports server actions, which may not resolve under the
// design config", and instructs a fallback: render `PanelCard` directly, keep the two-panel count as
// an AST assertion, and SAY SO. That fallback is not needed, and the reason is worth writing down
// because it is not the one the plan predicted.
//
//   PROBE 1 — `await import("@/app/(app)/profile/profile-form")` under
//   `vitest.design.config.ts`. RESULT: **NO ERROR.** The server-action modules resolve fine; under
//   this config a `"use server"` file is a plain module, and the `server-only` alias
//   (`vitest.design.config.ts`'s own entry) is what makes that true. The predicted blocker is not
//   one. Stdout carried one unrelated warning, transcribed so a future reader is not alarmed by it:
//
//     WARN [Better Auth]: Social provider google is missing clientId or clientSecret
//
//   PROBE 2 — rendering it. RESULT: **it threw**, and on something else entirely:
//
//     RENDER-ERR: Error: invariant expected app router to be mounted | cards=0
//
//   That is `useRouter()` from `next/navigation`, which needs an App Router context this config
//   deliberately does not provide (`auth-composition.test.tsx`'s NOT COVERED footer records the
//   config as "database-free and router-free by construction").
//
//   PROBE 3 — the same render with ONE `vi.mock` of `next/navigation` supplying a router object with
//   three no-op methods. RESULT:
//
//     OK | cards=2 | h2=Public profile/Private account info
//
// So the two-panel count below is a DOM FACT rather than an AST count, which is strictly stronger
// than what the plan's fallback would have bought. WHAT IS STUBBED, STATED PLAINLY SO THIS IS NOT
// OVER-TRUSTED: the router, and nothing else. `updateProfile` and `uploadAvatarAction` are the real
// imported modules (never called — this file submits nothing), `react-hook-form`, `zodResolver`, the
// shared `profileSchema`, `PanelCard`, `Avatar`, `Input`, `Textarea` and `Button` are all real. The
// stub replaces a navigation side effect that has no bearing on what the form DRAWS, which is the
// only thing this file measures.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY AN AST WALK AND NOT A GREP
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `cancel-page-shell.test.tsx:30-36`'s reason, and this phase has now paid it nine times (15-06 ×4,
// 15-07 ×3, 15-08 ×1, 15-09 ×1). All three profile files carry headers that EXPLAIN the conversion —
// they name the removed container, the refused second skeleton and the deliberately absent removal
// control in prose — so a text scan would report the comment describing the fix as the defect.
// `loading.tsx` is the extreme case: it quotes a whole `AssertionError` inside a block comment. An
// AST scan's unit is a JSX element, a JSX attribute and a string literal, none of which a comment
// can be.
//
// It is also why the "no removal affordance" assertion below reads the AST's STRING LITERALS AND JSX
// TEXT rather than the file's bytes. The seam comment above `profile-form.tsx`'s avatar row still
// says in prose that avatar teardown is CROP-03 and has not landed — plan 16-11 REWROTE that comment
// rather than deleting it, because half of what it recorded is now discharged and half is not — and a
// prose grep for the removal register would report that comment, the one that explains why there is
// no removal control, as the removal control.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS DOES NOT DUPLICATE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/design/auth-composition.test.tsx` (plan 15-09) is the AUTHUI-01/03 gate over the four
// `(auth)` screens and their layout. It shares this file's scanner SHAPE and none of its subjects:
// nothing here reads an auth route and nothing there reads a profile file. `live-regions.test.tsx`
// owns the inventory of what a screen reader hears on this form — this file asserts only the ONE
// name AC#12 pins (`Save state`) and the ABSENCE of a timer that could produce a false one.
// `card-pattern-coverage.test.ts` owns the repo-wide card inventory that `profile-form.tsx` joined as
// its 21st row; this file owns the per-surface shape that inventory cannot see.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE MUTATION WALK — SIX PROBES PLUS A NEGATIVE CONTROL, ALL RUN, ALL REVERTED (24 Aug 2026)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ THIS BLOCK IS DELIBERATE HISTORY RATHER THAN AN OMISSION, and it is `auth-composition.test.tsx`'s
// own arrangement (that file's header records reading exactly this in commit `e9d0155`). The gate is
// committed GREEN-BUT-UNPROBED with the walk's state stated in its own header, so that a run which
// dies between writing the gate and testing it cannot leave behind a header claiming reds nobody
// watched. Each probe below is filled in by its own commit, after being run and reverted.
//
// Command for every probe:
// `npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts`
// GREEN IS 13 PASSED. `git diff --exit-code src/` must exit 0 after each probe is reverted.
//
//   (M1) RUN AND REVERTED. The pattern swapped back for the raw primitive UNDER AN ALIAS, on
//        `profile-form.tsx`: `import { PanelCard } from "@/components/patterns/panel-card"` replaced
//        by `import { Card as PanelCard } from "@/components/ui/card"`. This is the laundering the
//        `propertyName ?? name` resolution exists for — the TAG spelling never changes, at either
//        call site, so a scan keyed on tag names reports a perfectly clean file. 3 failed / 10 passed:
//
//          AssertionError: the profile form renders a container from the vendored card primitive. …
//          Aliasing the import does not help: the scan resolves the EXPORTED name.: expected [ …(2) ]
//          to deeply equal []
//          + "src/app/(app)/profile/profile-form.tsx:114 — <PanelCard> (imported from @/components/ui/card)"
//          + "src/app/(app)/profile/profile-form.tsx:219 — <PanelCard> (imported from @/components/ui/card)"
//
//          AssertionError: the profile panels' titles are not the pinned pair, in order.: expected []
//          to deeply equal [ 'Public profile', …(1) ]
//
//          TestingLibraryElementError: Unable to find an element by: [data-testid="panel-card"]
//
//        THREE THINGS IN THAT RUN ARE WORTH THE TRANSCRIPTION.
//        ① The COPY failure is an ABSENCE presenting as a drift — `panelTitles` is read off PATTERN
//          containers only, so when the binding stops being one the pinned literals stop being FOUND
//          rather than stopping being EQUAL. `auth-composition.test.tsx`'s M1 found the identical
//          shape one plan earlier; read (7) first when both fire, (11) is the echo.
//        ② THE DOM HALF FIRED ON ITS OWN, which is the whole argument for case (12) existing. The
//          render produced a `data-slot="card"` div with `title`, `description` and `titleas` sitting
//          on it as unrecognised DOM attributes — a box that looks approximately right on screen and
//          emits no declared hook at all. A source-only gate would have caught this one, but a source-
//          only gate catches NOTHING the day the pattern itself stops emitting the attribute, and this
//          is the case that would.
//        ③ THE `titleAs` LOOP INSIDE (7) NEVER RAN. The raw-container assertion above it threw first.
//          Two assertions in one `it()` are ORDERED, not independent — 15-09 arrived at this reading
//          twice in one walk and it is worth stating rather than re-deriving.
//   (M2) RUN AND REVERTED. The plate re-types the container while KEEPING its import:
//        `className={BOOKING_SHELL}` on `loading.tsx` replaced by the literal
//        `"mx-auto w-full max-w-2xl px-4 py-8 sm:py-12"`, which is byte-identical to the constant's
//        current value. 1 failed / 12 passed:
//
//          AssertionError: src/app/(app)/profile/loading.tsx writes the booker container's width out
//          as a class again. That is the duplication the import above removed, arriving back one file
//          at a time — and the second copy is invisible in review because no single file contains
//          both halves of the disagreement.: expected [ Array(1) ] to deeply equal []
//          + "src/app/(app)/profile/loading.tsx:49 — className=\"mx-auto w-full max-w-2xl px-4 py-8 sm:py-12\""
//
//        THE MUTATION WAS CHOSEN TO KEEP THE IMPORT, and that is the finding rather than a detail.
//        The obvious probe — delete the import and use a literal — would have thrown on the FIRST
//        assertion in this `it()`'s loop and said nothing at all about the second, exactly as M1 left
//        (7)'s `titleAs` loop unrun. Leaving the import in place is what proves the hand-typed check
//        is a live assertion rather than dead code behind the import check.
//        ⚠ AND IT IS A ZERO-PIXEL DEFECT. The literal renders identically to the constant today, so
//        nothing visual would ever notice it — not a screenshot, not a baseline, not review. It only
//        becomes a defect on the day somebody changes `BOOKING_SHELL` and this one file silently does
//        not move, which is the failure `measurements.ts:385-400` exists to make impossible and the
//        precise reason this assertion reads the IMPORT rather than the value.
//   (M3) RUN AND REVERTED. The save submit takes the accent fill: `variant="brand"` added to
//        `profile-form.tsx`'s submit. D-162 is "one coral per viewport, on the primary action of a
//        conversion", broken in the single most plausible way — by promoting the one button on the
//        page that IS the primary action of the form. 1 failed / 12 passed:
//
//          AssertionError: the profile form ships an accent-filled control. D-162 gives each viewport
//          ONE coral and gives it to the primary action of a CONVERSION; a profile edit is a form
//          somebody is finishing, so its submit is the neutral solid. profile-form.tsx:268-271 argues
//          it at length.: expected [ Array(1) ] to deeply equal []
//          + "src/app/(app)/profile/profile-form.tsx:298 — variant=brand"
//
//        ⚠ AND `tests/design/brand-recipe.test.ts` WENT RED ON THE SAME MUTATION, measured rather
//        than assumed, which is the one result in this walk worth measuring twice — 1 failed /
//        24 passed:
//
//          FAIL … > adopts the brand variant at exactly 28 call sites across src/app and
//          src/components
//          AssertionError: expected 29 to be 28 // Object.is equality
//
//        THE TWO READINGS ARE NOT REDUNDANT AND THE DIFFERENCE IS WHY BOTH EXIST. The repo-wide total
//        is a BUDGET: it says the tree has one more coral than the last plan declared, and it would be
//        equally satisfied by moving the number to 29 — which is a one-character edit somebody makes
//        while chasing a green run. This file says something a budget structurally cannot: that THIS
//        surface may have none, whatever the repo-wide count is willing to absorb. A coral traded away
//        somewhere else and re-spent here would leave the budget at 28 and never redden there at all.
//   (M4) RUN AND REVERTED. The D-10 promise drifts by ONE CHARACTER: the private panel's
//        `description` loses its full stop — `"Only you can see this. Never shown to other people."`
//        → `"…other people"`. T-15-28's threat, mutated at its smallest possible size: the change
//        least likely to be noticed in a diff of a 300-line file. 1 failed / 12 passed:
//
//          AssertionError: src/app/(app)/profile/profile-form.tsx no longer carries a sentence
//          15-UI-SPEC pins byte-for-byte. … A copy change is fine — it just has to move this file and
//          be seen.: expected [ Array(1) ] to deeply equal []
//          + "Only you can see this. Never shown to other people."
//
//        THE POINT IS NOT THAT PUNCTUATION MATTERS. It is that the mechanism which catches a dropped
//        full stop is the same one that catches a well-meaning rewrite of this exact sentence — and
//        THIS sentence is the private half of the D-09/D-10 split stated to the person typing into
//        the box. A softened version ("Only visible to you") reads better and promises less
//        precisely, and the surface would look identical afterwards. A gate that only fired on large
//        edits would not be on that path at all.
//        ⚠ ONLY THE PRESENCE HALF OF (11) FIRED. The whole-list assertion further down the same
//        `it()` never ran — the ordered-assertion reading again — and it would have caught the same
//        defect from the other side. Both are kept because the presence half reports the MISSING
//        sentence by name, which is the actionable half, while the list half is what catches an ADDED
//        panel that satisfies every presence check.
//   (M5) RUN AND REVERTED. THE OPTIMISTIC SAVE. `onSubmit`'s awaited result and its refusal branch
//        replaced by `void updateProfile(values); setTimeout(() => setSaved(true), 800);` — the exact
//        shape T-15-29 names, and the shape somebody reaches for when the save "feels slow".
//        1 failed / 12 passed:
//
//          AssertionError: the profile form contains a timer. A save reported on a schedule rather
//          than on a result is a false money-adjacent claim: the sentence appears whether or not the
//          server agreed, and the person closes the tab believing their details changed.: expected
//          [ Array(1) ] to deeply equal []
//          + "src/app/(app)/profile/profile-form.tsx:70 — setTimeout"
//
//        ⚠ THE WHOLE DESIGN SUITE WAS RUN AGAINST THIS MUTATION, and that measurement is the reason
//        this assertion is worth more than the other twelve put together:
//
//          Test Files  1 failed | 53 passed (54)
//               Tests  1 failed | 907 passed | 3 skipped (911)
//
//        FIFTY-THREE OTHER FILES SAW NOTHING. This is a mutation that leaves the markup, the copy,
//        the containers, the counts, the tokens, the live regions and every pixel byte-identical, and
//        changes only WHETHER THE SENTENCE IS TRUE. Nothing else in the repository is looking at that
//        question on this surface — not the card inventory, not the live-region inventory, not the
//        brand budget — and `tests/profile/` cannot see it either, because it drives the server action
//        rather than the component. 14-CONTEXT D-150 cites this file as the reference truthful-save
//        model; this is the assertion that makes the citation checkable.
//   (M6) RUN AND REVERTED. A REMOVAL CONTROL SHIPPED AHEAD OF ITS BEHAVIOUR: a
//        `<Button variant="destructive" size="sm">Remove photo</Button>` added to the avatar block,
//        wired to `setAvatarUrl(null)` — i.e. a button that clears the preview and persists nothing.
//        This is not a strawman; it is the single most likely edit anybody makes to this block before
//        Phase 16's CROP-03 exists, and `profile-form.tsx:120-122` was written to argue against it.
//        3 failed / 10 passed:
//
//          AssertionError: the profile form ships a destructive control. There is no destructive
//          ACTION on this surface — avatar teardown is Phase 16's CROP-03 — so a filled destructive
//          button here is an affordance shipped ahead of the behaviour behind it, which is a button
//          that lies. …: expected [ Array(1) ] to deeply equal []
//          + "src/app/(app)/profile/profile-form.tsx:148 — variant=destructive"
//
//          AssertionError: the profile form ships a control whose name reads as a removal. …:
//          expected [ 'Remove photo' ] to deeply equal []
//          + "Remove photo"
//
//          AssertionError: a rendered control on the profile form is named as a removal.: expected
//          [ 'Remove photo' ] to deeply equal []
//
//        THE THIRD FAILURE IS THE INDEPENDENT ONE. Cases (8) and (10) read SOURCE; case (12) read the
//        RENDERED accessible name off the document, and it would still fire against a control whose
//        label arrived from a variable, a constant or a translation lookup — the exact direction this
//        file's NOT COVERED footer admits the AST walk is blind in. Two of the three would go quiet on
//        `{REMOVE_LABEL}`; the DOM one would not.
//   (M7) RUN AND REVERTED — THE NEGATIVE CONTROL, and the only probe here whose PASS is the result.
//        The sentence `// A future plan may add a Remove photo control here (CROP-03).` inserted as a
//        COMMENT beside the avatar block, with no markup change at all. GREEN, 13 passed.
//
//        A `grep -i remove` over this file would have reported that line as the violation — the same
//        grep-versus-prose collision this phase has now paid ten times, and the specific reason
//        `profile-form.tsx` can carry a header explaining WHY there is no removal control without
//        that header becoming the removal control. A ban that cannot be written down beside its own
//        explanation is a ban somebody eventually deletes.
//
//        ⚠ PROCESS FAULT, RECORDED RATHER THAN QUIETLY FIXED. M7's paragraph above was written and
//        COMMITTED (`93f1b42`) one commit BEFORE the probe was run — the exact thing this walk's
//        green-but-unprobed discipline exists to prevent, committed by the person enforcing it. The
//        probe was then run and the result MATCHED what had been written: 13 passed, with
//        `grep -ci remove` over the mutated file reporting 1. So the paragraph is accurate and is
//        left standing; this note is here because "it turned out to be right" is not the same claim
//        as "it was watched", and a reader deciding how far to trust the rest of this walk should be
//        able to tell which paragraph was which. 15-09's M3 note was corrected in its own commit for
//        the same reason and this follows that precedent.
//
// WALK CLOSED. Six positive probes, each applied alone, each run, each reverted with
// `git diff --exit-code src/` confirmed clean before the next started, plus one negative control.
// Every red above is TRANSCRIBED from the run rather than written from what the failure was expected
// to look like.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • `page.tsx` IS NEVER RENDERED. It is an async Server Component that reads `auth` and
//     `next/headers`; the design config is database-free by construction. Its half of the chain is
//     source-only, and the rendered proof of `/profile` is `e2e/overflow-320.spec.ts`'s row and
//     `tests/profile/`.
//   • IT POLICES CONTAINERS, COUNTS, COPY AND ABSENCES — NOT LAYOUT. A hand-rolled
//     `<div className="bg-card ring-1 rounded-xl">` is invisible here exactly as it is to
//     `card-pattern-coverage.test.ts`; `leak.test.ts` and `elevation-z.test.ts` police that half and
//     15-11's baselines police pixels.
//   • IT READS AUTHORED SOURCE. A `variant` or a class composed at runtime from a variable is
//     invisible to the walk. That direction is safe for a BAN (it can miss a violation, never invent
//     one) and it is a real hole — the same one `live-regions.ts`'s own footer records.
//   • THE COPY ASSERTION IS PRESENCE PLUS TWO EXACT LISTS. The two panel titles and the two panel
//     descriptions are asserted as whole arrays, so an added panel reddens; every other sentence is
//     asserted PRESENT, so a sentence ADDED beside the shipped ones does not. Deleting or editing one
//     always does, which is the direction T-15-28 is about.
//   • THE SAVED SENTENCE IS NOT RENDERED HERE. `saved` is false at first paint by construction, so
//     the DOM half sees no status region. That the region exists at all with the right name is
//     asserted from source, and what a screen reader hears is `live-regions.test.tsx`'s row.

import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { render, screen, cleanup } from "@testing-library/react";

import { SELECTOR_ATTRIBUTE, SELECTOR_IDS } from "@/lib/design/selector-contract";
// ⚠ IMPORTED STATICALLY, AND THAT IS A MEASURED FIX RATHER THAN A STYLE PREFERENCE. Case (12) first
// reached for this module with `await import(...)` INSIDE the test body. That passes in isolation
// (the whole file ran in 2.1s) and FAILED THE FIRST FULL-SUITE RUN:
//
//   Error: Test timed out in 5000ms.
//    ❯ tests/design/profile-pass.test.tsx:917:3
//        917| it("(12) the REAL form renders two declared panel-card hooks, and th…
//
// The import pulls in the two server actions and, through them, Better Auth and the schema layer —
// 817ms of module resolution on an idle machine, and past the 5s default under 54 files' worth of
// contention. A static import moves that cost to COLLECTION, where vitest does not time it against a
// per-test budget, and the run's own numbers are the reason to record it: 53 files passed and this
// one failed on a clock rather than on an assertion, which is the kind of red that gets misread as a
// flake and retried.
import { ProfileForm } from "@/app/(app)/profile/profile-form";

// ⚠ THE ONE STUB IN THIS FILE, and the whole of it. See PROBE 2/3 in the header for the measured
// reason: `profile-form.tsx` calls `useRouter()` on both of its result paths, and this config has no
// App Router mounted. The three methods are no-ops because nothing here submits anything — the form
// is rendered and read, never driven.
//
// `vi.mock` is HOISTED above the import block by vitest's transform, so the static import above
// resolves against the stub rather than racing it — which is what makes moving the import out of the
// test body safe.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: () => {},
    push: () => {},
    replace: () => {},
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The three files, and the copy 15-UI-SPEC pins for them
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const PAGE = "src/app/(app)/profile/page.tsx";
const LOADING = "src/app/(app)/profile/loading.tsx";
const FORM = "src/app/(app)/profile/profile-form.tsx";
/**
 * The avatar field, extracted out of `FORM` by plan 16-11 (CROP-01).
 *
 * It joins this file's set because two of AC#12's claims WENT WITH IT — the hidden file input and its
 * accessible name — and an assertion scanned against `FORM` after the extraction is an assertion over
 * an empty list. Adding the path is what keeps them claims about a NAMED file.
 *
 * ⚠ IT IS NOT ADDED TO (7), (8) OR (9), AND THE OMISSION IS THE DESIGN. Case (8)'s destructive ban is
 * scoped to `FORM` on purpose and must stay green forever: CROP-03's removal confirm lands in THIS
 * file in plan 16-12 and will legitimately carry `variant="destructive"`. Keeping the confirm out of
 * `profile-form.tsx` is what lets a surface hold a destructive control and a reference truthful-save
 * machine at once without either gate having to be softened — an argument for the file layout, not
 * merely a consequence of it.
 */
const FIELD = "src/components/profile/avatar-field.tsx";

/** The vendored primitive's module. ANY binding imported from here is a raw container. */
const UI_CARD_MODULE = "@/components/ui/card";
/** The pattern module whose component is the only container these surfaces may render. */
const PANEL_MODULE = "@/components/patterns/panel-card";
/** The page-title pattern. One per document, and the owner of `/profile`'s `<h1>`. */
const HEADER_MODULE = "@/components/patterns/page-header";
/** The panel loading shape. */
const SKELETON_MODULE = "@/components/patterns/panel-skeleton";
/**
 * The measurements module, and the assertion below is about the IMPORT rather than the string.
 *
 * Asserting `className={BOOKING_SHELL}` by its VALUE would move ownership of the container into this
 * test: the constant's whole purpose (`measurements.ts:385-400`) is that fourteen surfaces stop
 * carrying their own copy of the string, and a gate that re-typed it here would be the fifteenth.
 * What must be true is that both files READ it, which is what makes the page and its own plate unable
 * to disagree about the box.
 */
const MEASUREMENTS_MODULE = "@/lib/design/measurements";
const SHELL_EXPORT = "BOOKING_SHELL";

/**
 * THE SHIPPED SENTENCES, byte-for-byte, collected from the AST rather than from the file's bytes.
 *
 * Deliberate friction (T-15-28). Two of these are the D-09/D-10 leak boundary stated to the user in
 * words — *"What other people on FitOut can see."* against *"Only you can see this. Never shown to
 * other people."* — and that pair is the surface's whole promise about which panel is safe to type
 * into. A restyle that swapped or softened either sentence would leave a page that looks identical
 * and lies about a boundary it does not own. Both must move THIS FILE to move at all.
 *
 * The third load-bearing one is `Profile saved.` — see case (8): the sentence is the entire signal
 * that a save happened, and the assertions around it exist so it can only appear after a real result.
 */
const PINNED_COPY: Readonly<Record<string, readonly string[]>> = {
  [PAGE]: [
    "Your profile",
    // The member-since line is a TEMPLATE, so what is pinned is its SHAPE: one literal head and one
    // interpolation. A fabricated fallback (`Member since —`) would be a plain literal and would not
    // match; a reworded head would not match either. `page.tsx:48-51` records why it stays
    // conditional rather than gaining a default.
    "Member since ${…}",
  ],
  [LOADING]: ["Your profile", "Loading your profile"],
  [FORM]: [
    "Public profile",
    "What other people on FitOut can see.",
    "Private account info",
    "Only you can see this. Never shown to other people.",
    // ⚠ FIVE AVATAR SENTENCES LEFT THIS ENTRY IN PLAN 16-11, AND NOT ONE OF THEM WAS DROPPED — a pin
    // dropped is a copy contract silently retired (T-16-40). Where each one went:
    //   `Your avatar` and `Upload avatar`  → PINNED_COPY[FIELD] below. Still literals, new file.
    //   `Upload photo`                     → `tests/design/avatar-copy.test.tsx`. It is no longer a
    //                                        literal ANYWHERE under src/ — the field renders
    //                                        AVATAR_UPLOAD_LABEL from `@/lib/avatar` — so an AST pin
    //                                        cannot see it and a RENDER compared to the export can.
    //   `JPG or PNG, up to 5 MB. Optional.` → RETIRED by Δ14 and replaced by AVATAR_HELPER, which
    //                                        names WebP. `avatar-copy.test.tsx` asserts the new one
    //                                        renders byte-for-byte AND that the shipped one is gone
    //                                        from the whole tree.
    //   the shipped busy label             → RETIRED by Δ14 outright. Nothing uploads between the
    //   (`Uploading` + an ellipsis)          pick and the confirm any more, so it described a state
    //                                        that no longer exists. `avatar-copy.test.tsx` asserts
    //                                        its absence over src/ rather than over one render, and
    //                                        it is spelled out THERE and not here on purpose: this
    //                                        line would otherwise be the last copy of a string the
    //                                        phase is retiring, sitting inside the note explaining
    //                                        the retirement.
    "First name",
    "Shown publicly as your display name.",
    "About",
    "A little about you…",
    "Public. Keep it short.",
    "City",
    "e.g. Austin",
    "Public, general area.",
    "Last name",
    "Private (used later for payouts). Never shown publicly.",
    "Phone",
    "Private. Optional.",
    "Save state",
    "Profile saved.",
    "Saving…",
    "Save profile",
  ],
  // The two avatar sentences that are still AUTHORED LITERALS after the extraction, pinned against
  // the file that now authors them. Everything else the field says is an imported constant and is
  // pinned in `avatar-copy.test.tsx` instead — see the note in [FORM] above for where each one went.
  [FIELD]: ["Your avatar", "Upload avatar"],
};

/** The two panels, in source order, asserted as WHOLE lists so a third panel reddens here too. */
const PANEL_TITLES = ["Public profile", "Private account info"] as const;
const PANEL_DESCRIPTIONS = [
  "What other people on FitOut can see.",
  "Only you can see this. Never shown to other people.",
] as const;

/**
 * The removal register, as whole words.
 *
 * AUTHUI-02's last clause is "and avatar removal is possible", which REQUIREMENTS.md's own conflict
 * note assigns to Phase 16 CROP-03 — so on THIS tree the correct state is that no such control
 * exists. `profile-form.tsx:120-122` says the same thing from the other side and gives the reason: a
 * destructive affordance shipped ahead of the action behind it is a button that lies.
 *
 * ⚠ WHEN CROP-03 LANDS, THIS ASSERTION IS THE ONE THAT REDDENS, AND THAT IS THE POINT. It is not a
 * ban forever; it is a pin saying the capability has not arrived yet, so the plan that adds it must
 * move this file and declare the new control's accessible name here.
 */
const REMOVAL_WORDS = /\b(remove|removing|delete|deleting)\b/i;

/** The success token family. Illegal as text on this surface (DS-10 / D-14) and absent from it. */
const SUCCESS_TOKEN = /(^|[\s:])(text|bg|border|ring|fill|stroke|from|via|to)-success\b/;

/** The discriminating token of the hand-typed booker container the two files stopped carrying. */
const HAND_TYPED_SHELL = "max-w-2xl";
/** The pre-adoption heading step. `/profile` was the app's last 24px `<h1>`. */
const RETIRED_HEADING_STEP = "text-2xl";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The scanner
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Finding = { readonly what: string; readonly line: number };

type Scan = {
  /** Every JSX element whose tag resolves to a binding imported from `ui/card`. Must be empty. */
  readonly rawContainers: readonly Finding[];
  /** Every JSX element whose tag resolves to `PanelCard`, however the import spelled it. */
  readonly panelCards: readonly Finding[];
  /** Every `PageHeader` element, with whether it was passed a lede. */
  readonly pageHeaders: readonly (Finding & { readonly hasLede: boolean })[];
  /** Every `PanelSkeleton` element. */
  readonly panelSkeletons: readonly Finding[];
  /** Every `titleAs` attribute with a literal value, as `titleAs=h2`. */
  readonly titleAs: readonly Finding[];
  /** The `title` string literals passed to a pattern container, in source order. */
  readonly panelTitles: readonly string[];
  /** The `description` string literals passed to a pattern container, in source order. */
  readonly panelDescriptions: readonly string[];
  /** Named imports of `BOOKING_SHELL` from the measurements module. */
  readonly shellImports: readonly Finding[];
  /** Every `<main>` opened in this module. */
  readonly mainElements: readonly Finding[];
  /** Every literal `className` value, so a retired class can be banned without a text scan. */
  readonly classLiterals: readonly Finding[];
  /** Every `variant` attribute with a literal value, as `variant=brand`. */
  readonly variants: readonly Finding[];
  /** Every literal `aria-label` value. */
  readonly ariaLabels: readonly Finding[];
  /** Every `<input>` carrying `type="file"` — the avatar upload mechanism. */
  readonly fileInputs: readonly Finding[];
  /** Every identifier naming a timer function. The save path must contain none. */
  readonly timers: readonly Finding[];
  /**
   * Every AUTHORED sentence: string literals, no-substitution templates, JSX text, and the SHAPE of
   * a template expression. Module specifiers are excluded — an import path is not a sentence.
   * Comments cannot appear here at all, which is the whole reason the copy and removal assertions
   * read this rather than the file's bytes.
   */
  readonly texts: readonly string[];
  /** Total JSX elements seen — the guard-the-guard floor. A scan of nothing satisfies nine empties. */
  readonly jsxElements: number;
};

/**
 * `(path, text)` rather than `(path)` on purpose — `leak.test.ts:208-212`'s rule,
 * `cancel-page-shell.test.tsx:94-102`'s signature and `auth-composition.test.tsx:301-310`'s. The
 * positive control at the bottom feeds this function a fixture that is NEVER written to disk, so the
 * code path the fixture proves is EXACTLY the one the real assertions run. A `(path)` signature would
 * have forced the fixture onto disk or onto a second, unproven code path.
 *
 * Aliased imports are resolved through `propertyName ?? name`, so `import { Card as PanelCard }` is
 * still a raw container and renaming an import cannot launder one past a tag-name check.
 */
function scanModule(path: string, text: string): Scan {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  /** local JSX name → what module it came from. Built from import clauses, never from the tag. */
  const rawLocals = new Set<string>();
  const panelLocals = new Set<string>();
  const headerLocals = new Set<string>();
  const skeletonLocals = new Set<string>();
  const shellImports: Finding[] = [];
  /** Every module-specifier literal, so the text corpus can exclude import paths. */
  const specifierNodes = new Set<ts.Node>();

  const visitImports = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specifierNodes.add(node.moduleSpecifier);
      const specifier = node.moduleSpecifier.text;
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const local = element.name.text;
          // THE EXPORTED name decides what the binding IS; the LOCAL name is only how the JSX spells
          // it. Reading the local name would let a rename change the verdict.
          const exported = (element.propertyName ?? element.name).text;
          if (specifier === UI_CARD_MODULE) rawLocals.add(local);
          if (specifier === PANEL_MODULE && exported === "PanelCard") panelLocals.add(local);
          if (specifier === HEADER_MODULE && exported === "PageHeader") headerLocals.add(local);
          if (specifier === SKELETON_MODULE && exported === "PanelSkeleton") {
            skeletonLocals.add(local);
          }
          if (specifier === MEASUREMENTS_MODULE && exported === SHELL_EXPORT) {
            shellImports.push({ what: `${SHELL_EXPORT} as ${local}`, line: lineOf(element) });
          }
        }
      }
    }
    ts.forEachChild(node, visitImports);
  };
  visitImports(sf);

  const rawContainers: Finding[] = [];
  const panelCards: Finding[] = [];
  const pageHeaders: (Finding & { hasLede: boolean })[] = [];
  const panelSkeletons: Finding[] = [];
  const titleAs: Finding[] = [];
  const panelTitles: string[] = [];
  const panelDescriptions: string[] = [];
  const mainElements: Finding[] = [];
  const classLiterals: Finding[] = [];
  const variants: Finding[] = [];
  const ariaLabels: Finding[] = [];
  const fileInputs: Finding[] = [];
  const timers: Finding[] = [];
  const texts: string[] = [];
  let jsxElements = 0;

  const TIMER_NAMES = new Set(["setTimeout", "setInterval"]);
  const ARIA_LABEL = ["aria", "label"].join("-");

  /** `x="literal"` → the literal; anything else (an expression, a ternary) → null. */
  const literalOf = (attr: ts.JsxAttribute): string | null => {
    const init = attr.initializer;
    if (init === undefined) return null;
    if (ts.isStringLiteral(init)) return init.text;
    if (ts.isJsxExpression(init) && init.expression !== undefined) {
      if (ts.isStringLiteral(init.expression)) return init.expression.text;
      if (ts.isNoSubstitutionTemplateLiteral(init.expression)) return init.expression.text;
    }
    return null;
  };

  /** One sentence, whitespace-collapsed. JSX text arrives indented and line-wrapped. */
  const pushText = (value: string): void => {
    const normalised = value.replace(/\s+/g, " ").trim();
    if (normalised.length > 0) texts.push(normalised);
  };

  const visitElement = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): void => {
    jsxElements += 1;

    const attrs = new Map<string, ts.JsxAttribute>();
    for (const property of node.attributes.properties) {
      if (ts.isJsxAttribute(property) && ts.isIdentifier(property.name)) {
        attrs.set(property.name.text, property);
      }
    }

    const tag = node.tagName;
    const tagText = tag.getText(sf);
    const line = lineOf(node);

    if (tagText === "main") mainElements.push({ what: "main", line });
    if (tagText === "input" && literalOf(attrs.get("type") as ts.JsxAttribute) === "file") {
      fileInputs.push({ what: '<input type="file">', line });
    }

    if (ts.isIdentifier(tag)) {
      const name = tag.text;
      if (rawLocals.has(name)) {
        rawContainers.push({ what: `<${name}> (imported from ${UI_CARD_MODULE})`, line });
      }
      if (panelLocals.has(name)) {
        panelCards.push({ what: `<${name}>`, line });
        const title = attrs.get("title");
        if (title !== undefined) {
          const value = literalOf(title);
          if (value !== null) panelTitles.push(value);
        }
        const description = attrs.get("description");
        if (description !== undefined) {
          const value = literalOf(description);
          if (value !== null) panelDescriptions.push(value);
        }
      }
      if (headerLocals.has(name)) {
        pageHeaders.push({ what: `<${name}>`, line, hasLede: attrs.has("lede") });
      }
      if (skeletonLocals.has(name)) panelSkeletons.push({ what: `<${name}>`, line });
    }

    const titleAsAttr = attrs.get("titleAs");
    if (titleAsAttr !== undefined) {
      const value = literalOf(titleAsAttr);
      if (value !== null) titleAs.push({ what: `titleAs=${value}`, line });
    }

    const variant = attrs.get("variant");
    if (variant !== undefined) {
      const value = literalOf(variant);
      if (value !== null) variants.push({ what: `variant=${value}`, line });
    }

    const className = attrs.get("className");
    if (className !== undefined) {
      const value = literalOf(className);
      if (value !== null) classLiterals.push({ what: value, line });
    }

    const label = attrs.get(ARIA_LABEL);
    if (label !== undefined) {
      const value = literalOf(label);
      if (value !== null) ariaLabels.push({ what: value, line });
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) visitElement(node);

    if (ts.isIdentifier(node) && TIMER_NAMES.has(node.text)) {
      timers.push({ what: node.text, line: lineOf(node) });
    }

    if (ts.isStringLiteral(node) && !specifierNodes.has(node)) pushText(node.text);
    else if (ts.isNoSubstitutionTemplateLiteral(node)) pushText(node.text);
    else if (ts.isJsxText(node)) pushText(node.text);
    else if (ts.isTemplateExpression(node)) {
      // THE SHAPE, not the value: the head and tail literals with each interpolation marked. This is
      // what lets a composed sentence be pinned at all — the runtime value is a date nobody can pin.
      const shape =
        node.head.text +
        node.templateSpans.map((span) => "${…}" + span.literal.text).join("");
      pushText(shape);
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);

  return {
    rawContainers,
    panelCards,
    pageHeaders,
    panelSkeletons,
    titleAs,
    panelTitles,
    panelDescriptions,
    shellImports,
    mainElements,
    classLiterals,
    variants,
    ariaLabels,
    fileInputs,
    timers,
    texts,
    jsxElements,
  };
}

/**
 * THE POSITIVE CONTROL. A module that violates every clause this file claims to catch, fed to the
 * SAME scanner, and NEVER written to disk.
 *
 * `13-05`'s finding applied, and `cancel-page-shell.test.tsx:174-195`'s shape: a scan whose list of
 * things-to-catch was never shown catching one of them reports a clean tree forever, and nothing in
 * a green run distinguishes that from a correct tree.
 *
 * It carries, in one pass: an ALIASED raw container (the cheapest laundering past a tag-name scan), a
 * THIRD `PanelCard`, a `variant="brand"` fill, a `variant="destructive"` control, a success token in
 * a class, the retired 24px heading step, the hand-typed shell string, a `<main>`, a `setTimeout` on
 * the save path, and a `Remove photo` control.
 */
const VIOLATING_FIXTURE = [
  'import { Card as Panel, CardContent } from "@/components/ui/card";',
  'import { PanelCard } from "@/components/patterns/panel-card";',
  'import { Button } from "@/components/ui/button";',
  "export function Bad() {",
  "  function onSubmit() {",
  // The false save: a timer that reports success without ever having a result to report.
  "    setTimeout(() => setSaved(true), 800);",
  "  }",
  "  return (",
  '    <main className="mx-auto w-full max-w-2xl px-4 py-10">',
  '      <h1 className="text-2xl font-semibold">Your profile</h1>',
  '      <PanelCard title="Public profile" description="What other people on FitOut can see.">',
  "        <Panel>",
  '          <CardContent className="text-success">Saved</CardContent>',
  "        </Panel>",
  '        <Button variant="brand">Save profile</Button>',
  '        <Button variant="destructive">Remove photo</Button>',
  "      </PanelCard>",
  '      <PanelCard title="Private account info" />',
  '      <PanelCard title="A third panel" />',
  "    </main>",
  "  );",
  "}",
].join("\n");

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Read once, at module level; every `it()` below only asserts against these.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Read = { readonly path: string; readonly bytes: number; readonly scan: Scan };

function readAndScan(path: string): Read {
  const abs = resolve(process.cwd(), path);
  const text = readFileSync(abs, "utf8");
  return { path, bytes: statSync(abs).size, scan: scanModule(path, text) };
}

const page = readAndScan(PAGE);
const loading = readAndScan(LOADING);
const form = readAndScan(FORM);
const field = readAndScan(FIELD);
const files = [page, loading, form, field] as const;

/** A file smaller than this is a stub or a truncated read; the smallest real one here is 3.3 KB. */
const MIN_BYTES = 2000;

/**
 * ⚠ THE SET IS FOUR SINCE PLAN 16-11 and the three vacuity guards below walk all four. Nothing else
 * does: (4) walks the page and its plate, (5)-(9) name `page`, `loading` and `form` individually, and
 * (11) reads `PINNED_COPY` per path — so a file with no entry is pinned to nothing rather than
 * silently exempted from a ban. That distinction is what keeps case (8)'s destructive ban scoped to
 * `FORM` deliberately rather than by omission; see `FIELD`'s docblock.
 */

/**
 * The per-file JSX-element floor, MEASURED against the tree this commit reads (24 August 2026) and
 * set below each real count rather than at it.
 *
 * Measured 24 August 2026: page 4 · loading 4 · profile-form 53. RE-MEASURED 25 August 2026, after
 * plan 16-11 moved the avatar block: page 4 · loading 4 · profile-form **45** · avatar-field **10**.
 * The spread is more than a factor of TEN, which is
 * why a single blanket floor was never on the table here — `auth-composition.test.tsx:571-583`
 * records watching exactly that mistake report two correct pages as unparsed, on a set whose spread
 * was only a factor of three.
 *
 * ⚠ THIS IS A VACUITY FLOOR, NOT AN INVENTORY. It exists so a scan that silently produced nothing (a
 * syntax change, a wrong `ScriptKind`, a renamed path) cannot report every absence below as
 * satisfied. Setting it AT the measured count would make it an element census that reddens on any
 * innocuous markup addition, which is a pin people learn to bump without reading.
 */
const JSX_FLOOR: Readonly<Record<string, number>> = {
  [PAGE]: 3,
  [LOADING]: 3,
  // ⚠ 40 → 33, AND THE MOVE IS THE POINT RATHER THAN AN ALLOWANCE. Plan 16-11 took nine JSX elements
  // out of this file and put one back, measured 53 → 45; the floor moves with the file it describes
  // because a floor left at a number the file can no longer reach is a gate that reddens on the work
  // it was written to permit. It stays BELOW the real count for the reason above.
  [FORM]: 33,
  // Measured 10 the same day, and set below it for the same reason. This one is DELIBERATELY low in
  // absolute terms: the field is a small composite (an avatar, an input, a button, two paragraphs and
  // a conditionally-mounted dialog), so the number that makes it "clearly parsed" is single-digit.
  [FIELD]: 7,
};

/**
 * The per-file AUTHORED-TEXT floor, measured the same day and for the same reason as `JSX_FLOOR` —
 * and it is a SEPARATE floor rather than a second use of that one, because the two vacuity
 * directions are independent: a tree can parse to fifty JSX elements while the string corpus comes
 * back empty (a `visit` that returned early, a corpus filtered to nothing), and every copy assertion
 * in (11) plus the removal absence in (10) reads only the corpus.
 *
 * Measured 24 August 2026: page 5 · loading 3 · profile-form 59. RE-MEASURED 25 August 2026, after
 * plan 16-11: page 5 · loading 3 · profile-form **40** · avatar-field **18**.
 *
 * ⚠ THE FORM'S FLOOR MOVED 40 → 30 AND THAT IS NOT AN ALLOWANCE. Nineteen authored strings left the
 * file with the avatar block, landing the count on EXACTLY the old floor of 40 — a floor sitting on
 * its own measured count is precisely the "element census" this docblock's last paragraph refuses,
 * and it would have reddened on the next innocuous deletion while telling nobody anything about
 * vacuity. It is re-set below the new count in the same proportion the original was set below its own
 * (~70%), which is the rule the number was chosen by both times.
 *
 * ⚠ THE FIRST DRAFT USED A BLANKET 4 AND WATCHED
 * `loading.tsx` REPORT AT 3 — a perfectly correct file whose whole authored vocabulary is one class,
 * one title and one skeleton label. Transcribed rather than paraphrased, because it is the same
 * blanket-floor mistake `auth-composition.test.tsx:571-583` records making on its own first run:
 *
 *   AssertionError: a profile file yielded almost no authored text … expected [ Array(1) ] to
 *   deeply equal []
 *     + "src/app/(app)/profile/loading.tsx — 3 authored strings"
 */
const TEXT_FLOOR: Readonly<Record<string, number>> = {
  [PAGE]: 4,
  [LOADING]: 3,
  [FORM]: 30,
  [FIELD]: 12,
};

afterEach(() => {
  cleanup();
});

describe("AUTHUI-02 — the profile design pass, as counts and absences", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Nine of the assertions below are ABSENCES, and an empty parse
  // satisfies all of them at once — `live-regions.test.tsx` probe (d) measured exactly that over a
  // path the walker never opened and reported a perfectly clean result indistinguishable from a real
  // one. This is the fifth time this repository has written this block for that reason.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(1) read all four real files rather than four empty ones", () => {
    const thin = files
      .filter((file) => file.bytes < MIN_BYTES)
      .map((file) => `${file.path} — ${file.bytes} bytes`);
    expect(
      thin,
      "a profile file read as (near) empty. Most assertions below are absences and an empty file " +
        "passes every one of them.",
    ).toEqual([]);
  });

  it("(2) resolved JSX in all four — an absence over an unentered tree is not an assertion", () => {
    const barren = files
      .filter((file) => file.scan.jsxElements < (JSX_FLOOR[file.path] ?? Number.MAX_SAFE_INTEGER))
      .map(
        (file) =>
          `${file.path} — ${file.scan.jsxElements} JSX elements, floor ${JSX_FLOOR[file.path]}`,
      );
    // …and a file with no floor at all is a file somebody added to the set without measuring it. The
    // `MAX_SAFE_INTEGER` fallback makes that loud instead of silently exempting it.
    expect(
      barren,
      "the scan resolved too few JSX elements on a file that renders many. A parse that silently " +
        "produced nothing reports every ban below as satisfied.",
    ).toEqual([]);
  });

  it("(3) the scan collected authored text from all four — the copy pins need a corpus", () => {
    // The third vacuity direction, and it is separate from (2) on purpose: the JSX floor is satisfied
    // by a tree whose string literals were never visited (a `visit` that returned early, a corpus
    // filtered to nothing), and the copy assertions below are all "this sentence is PRESENT" — which
    // an empty corpus fails loudly but a nearly-empty one could pass by accident.
    const starved = files
      .filter((file) => file.scan.texts.length < (TEXT_FLOOR[file.path] ?? Number.MAX_SAFE_INTEGER))
      .map(
        (file) =>
          `${file.path} — ${file.scan.texts.length} authored strings, floor ${TEXT_FLOOR[file.path]}`,
      );
    expect(
      starved,
      "a profile file yielded almost no authored text. The copy pins in (11) and the removal " +
        "absence in (10) both read this corpus, and a corpus of nothing makes the second of them " +
        "vacuous — an absence asserted over a corpus the walker never filled is not an assertion.",
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE PAGE AND ITS PLATE — one shell import each, one header, no landmark
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(4) the page and its plate each READ the declared booker shell rather than typing it", () => {
    for (const file of [page, loading]) {
      expect(
        file.scan.shellImports.map((f) => `${file.path}:${f.line} — ${f.what}`),
        `${file.path} does not import ${SHELL_EXPORT} from ${MEASUREMENTS_MODULE}. The two files ` +
          "have to agree about the box and nothing made them agree while the string was typed in " +
          "both; the constant is what ends that by construction (measurements.ts:385-400). The " +
          "IMPORT is asserted rather than the class string on purpose — re-typing the value here " +
          "would make this test the fifteenth copy of the thing the constant exists to collapse.",
      ).toHaveLength(1);

      const handTyped = file.scan.classLiterals.filter((f) => f.what.includes(HAND_TYPED_SHELL));
      expect(
        handTyped.map((f) => `${file.path}:${f.line} — className="${f.what}"`),
        `${file.path} writes the booker container's width out as a class again. That is the ` +
          "duplication the import above removed, arriving back one file at a time — and the second " +
          "copy is invisible in review because no single file contains both halves of the " +
          "disagreement.",
      ).toEqual([]);

      const retiredStep = file.scan.classLiterals.filter((f) =>
        f.what.split(/\s+/).includes(RETIRED_HEADING_STEP),
      );
      expect(
        retiredStep.map((f) => `${file.path}:${f.line} — className="${f.what}"`),
        `${file.path} carries the retired 24px heading step. /profile was the app's LAST such <h1> ` +
          "before plan 15-08; the heading is PageHeader's now and renders at the adopted 20px, so a " +
          "hand-sized heading here is either a second heading or a page that stopped using the " +
          "pattern.",
      ).toEqual([]);

      expect(
        file.scan.mainElements.map((f) => `${file.path}:${f.line}`),
        `${file.path} opens a document landmark. (app)/layout.tsx owns the one main per document ` +
          "(D-88.1); BOOKING_SHELL is a CONTAINER and adopting it does not make an element a " +
          "landmark — its own docblock says so, and three of its fourteen adopters had to be " +
          "corrected for exactly this.",
      ).toEqual([]);
    }
  });

  it("(5) the page renders one PageHeader with a lede; the plate renders one without", () => {
    expect(
      page.scan.pageHeaders.length,
      "the profile page does not compose exactly one PageHeader. Zero means the document has no " +
        "<h1> at all — the pattern owns it. Two means two level-1 headings on one document.",
    ).toBe(1);
    expect(
      page.scan.pageHeaders[0]?.hasLede,
      "the profile page passes no lede to PageHeader. The member-since sentence is the page's one " +
        "piece of context under the title, and it is CONDITIONAL rather than absent — see (9), " +
        "which pins its composed shape.",
    ).toBe(true);

    expect(
      loading.scan.pageHeaders.length,
      "the profile loading plate does not compose exactly one PageHeader. The heading is FIXED copy " +
        "and known before any data resolves, so a plate that draws a bar in its place shifts the " +
        "layout when the real one arrives.",
    ).toBe(1);
    expect(
      loading.scan.pageHeaders[0]?.hasLede,
      "the profile loading plate passes a lede. `Member since …` is data-derived AND conditional — " +
        "it is absent entirely for a user with no createdAt — so standing in for it is a shift in " +
        "whichever direction the data goes. loading.tsx's own header carries this word for word.",
    ).toBe(false);
  });

  it("(6) the plate draws exactly one panel skeleton — AC#18 permits no second", () => {
    // ⚠ ONE, NOT TWO, AND THE NUMBER IS A FINDING RATHER THAN A SHORTFALL. 15-10-PLAN's behaviour
    // list asks for "exactly two PanelSkeleton elements", one per panel. Plan 15-08 tried that FIRST
    // and `tests/design/loading-coverage.test.ts` refused it — each skeleton pattern carries its own
    // `role="status"`, so a second call site is a second live region announcing one navigation:
    //
    //   AssertionError: a loading state must announce itself exactly once … expected [ Array(1) ] to
    //   deeply equal []
    //     + "src/app/(app)/profile/loading.tsx (patterns: 2, own role=status: 0, named: false)"
    //
    // Asserting two here would pin this file against a gate that already rejects it, and the loser
    // would be whichever ran second. The count asserted is the one the tree can actually hold; the
    // reason it is not the plan's number is written here so it does not read as drift.
    expect(
      loading.scan.panelSkeletons.map((f) => `${LOADING}:${f.line} — ${f.what}`),
      "the profile loading plate does not draw exactly one panel skeleton. Zero means the fallback " +
        "claims no geometry at all on a route that has some; two is what AC#18 refuses (see the " +
        "quoted red above this assertion).",
    ).toHaveLength(1);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE FORM — two panels, no accent, no destructive, no success ink
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(7) the form composes exactly two PanelCards at h2, and zero raw containers", () => {
    expect(
      form.scan.rawContainers.map((f) => `${FORM}:${f.line} — ${f.what}`),
      "the profile form renders a container from the vendored card primitive. DS-11 declares three " +
        "card containers and 15-UI-SPEC puts this surface on PanelCard; ALLOWED_RAW_CARD never had a " +
        "row for this file, because before plan 15-08 it drew no box AT ALL — which is the one way " +
        "onto the inventory that neither of the usual routes covers. Aliasing the import does not " +
        "help: the scan resolves the EXPORTED name.",
    ).toEqual([]);

    expect(
      form.scan.panelCards.map((f) => `${FORM}:${f.line} — ${f.what}`),
      "the profile form does not compose exactly two panel containers. TWO is the D-09/D-10 split " +
        "made visible — one box for what other people can see, one for what only the account holder " +
        "can. One box would put a private field inside the public promise; three would invent a " +
        "third category the server-side boundary does not have.",
    ).toHaveLength(2);

    expect(
      form.scan.titleAs.map((f) => f.what),
      "a profile panel does not pass titleAs=\"h2\" explicitly. It is the DEFAULT, and it is passed " +
        "anyway because the level is a fact about this document's outline — the page's <h1> is " +
        "PageHeader's — rather than a default to inherit silently. A panel that inherits it reads " +
        "identically until somebody changes the default.",
    ).toEqual(["titleAs=h2", "titleAs=h2"]);
  });

  it("(8) the form carries no accent fill, no destructive variant and no success token", () => {
    const accent = form.scan.variants.filter((f) => f.what === "variant=brand");
    expect(
      accent.map((f) => `${FORM}:${f.line} — ${f.what}`),
      "the profile form ships an accent-filled control. D-162 gives each viewport ONE coral and " +
        "gives it to the primary action of a CONVERSION; a profile edit is a form somebody is " +
        "finishing, so its submit is the neutral solid. profile-form.tsx:268-271 argues it at length.",
    ).toEqual([]);

    const destructive = form.scan.variants.filter((f) => f.what === "variant=destructive");
    expect(
      destructive.map((f) => `${FORM}:${f.line} — ${f.what}`),
      "the profile form ships a destructive control. There is no destructive ACTION on this surface " +
        "— avatar teardown is Phase 16's CROP-03 — so a filled destructive button here is an " +
        "affordance shipped ahead of the behaviour behind it, which is a button that lies. (The " +
        "`text-destructive` INK on the two refusal lines is a different thing and is untouched: this " +
        "reads the variant attribute, not the class.)",
    ).toEqual([]);

    const success = form.scan.classLiterals.filter((f) => SUCCESS_TOKEN.test(f.what));
    expect(
      success.map((f) => `${FORM}:${f.line} — className="${f.what}"`),
      "the profile form carries a success token. DS-10 / D-14: the semantic green has no text-bar " +
        "row in contrast-pairs.ts because it cannot clear 4.5 on a light surface, and its ONE legal " +
        "pairing is a non-text glyph on a filled --success surface. The saved line is bare inline " +
        "text with no chip to tint and no glyph to hold a hue, so the colour was decoration and the " +
        "sentence is the whole signal.",
    ).toEqual([]);
  });

  it("(9) nothing on the save path can report a save that did not happen", () => {
    // T-15-29, and it is the repudiation threat of this surface rather than a style rule. `saved` is
    // set from the ACTUAL updateProfile result and cleared at the top of the next submit; a timer
    // anywhere in this file is the mechanism by which "probably worked" becomes "Profile saved." on
    // screen. 14-CONTEXT D-150 copied this file as the reference truthful-save model.
    expect(
      form.scan.timers.map((f) => `${FORM}:${f.line} — ${f.what}`),
      "the profile form contains a timer. A save reported on a schedule rather than on a result is " +
        "a false money-adjacent claim: the sentence appears whether or not the server agreed, and " +
        "the person closes the tab believing their details changed.",
    ).toEqual([]);

    const saveState = form.scan.ariaLabels.filter((f) => f.what === "Save state");
    expect(
      saveState.map((f) => `${FORM}:${f.line}`),
      "the saved line does not carry exactly one `Save state` accessible name. `role=\"status\"` is " +
        "nameFrom:author, so without one the region announces as the empty string; two would be two " +
        "regions for one save. The name is the wizard's precedent — two words naming WHICH line " +
        "moved, not a paraphrase of the sentence inside it.",
    ).toHaveLength(1);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE AVATAR BLOCK — the upload survives, the removal has not arrived
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(10) the avatar block keeps its upload and has gained no removal control", () => {
    // ⚠ THESE TWO ARE SCANNED AGAINST `FIELD`, NOT `FORM`, SINCE PLAN 16-11 — and they were watched
    // going to zero before they moved. The extraction emptied both against `FORM`, which this file's
    // own header did not predict (it predicts only the removal-register red below), and the failure was
    // read off a real run rather than reasoned about:
    //
    //   AssertionError: the profile form no longer carries a hidden file input. … expected [] to
    //   have a length of 1 but got +0
    //
    // The second one was HIDDEN BEHIND THE FIRST — two assertions in one `it()` are ordered, not
    // independent (M1 ③ and M2 record the same reading), so it was measured separately instead:
    // `form.scan.ariaLabels` came back as exactly `[{ what: "Save state", line: 239 }]`, with no
    // `Upload avatar` in it at all.
    //
    // THE RE-SCOPE NAMES THE NEW FILE AND DOES NOT WIDEN. "Somewhere in the tree there is a file
    // input" is not the claim; the claim is that this application has exactly ONE, in a file this
    // test can name, and that it carries exactly ONE accessible name (T-16-39). A search over `src/`
    // would have stayed green the day a second picker appeared in a third file.
    expect(
      field.scan.fileInputs.map((f) => `${FIELD}:${f.line} — ${f.what}`),
      "the avatar field no longer carries a hidden file input. That control IS the avatar upload " +
        "mechanism (D-09) — an absence here is a capability lost in a restyle, which is the failure " +
        "direction a ban-only gate would never notice.",
    ).toHaveLength(1);

    expect(
      field.scan.ariaLabels.filter((f) => f.what === "Upload avatar"),
      "the hidden file input lost its accessible name. It is visually hidden and triggered by a " +
        "sibling button, so the name is the only thing that identifies it to a screen reader.",
    ).toHaveLength(1);

    // …and the form it was lifted out of now carries NONE, which is the other half of the same
    // claim: two pickers on one surface is two ways to start one upload, and the extraction is only
    // correct if the original site is empty rather than duplicated.
    expect(
      form.scan.fileInputs.map((f) => `${FORM}:${f.line} — ${f.what}`),
      "the profile form carries a file input again. The avatar picker lives in avatar-field.tsx " +
        "since plan 16-11; a second one here would be a second way to start the same upload, and " +
        "only one of them would be behind the crop confirm (rule F4).",
    ).toEqual([]);

    // …and the ABSENCE, read from the AUTHORED TEXT rather than from the file's bytes. This is the
    // whole reason the corpus exists: profile-form.tsx:120-122 explains IN PROSE that crop and avatar
    // teardown are Phase 16's, and a byte scan for the removal register would report that comment —
    // the one saying there is deliberately no such control — as the control.
    const removalCopy = form.scan.texts.filter((value) => REMOVAL_WORDS.test(value));
    expect(
      removalCopy,
      "the profile form ships a control whose name reads as a removal. AUTHUI-02's last clause " +
        "(\"and avatar removal is possible\") is assigned to Phase 16 CROP-03 by REQUIREMENTS.md's " +
        "own conflict note, so on this tree the correct state is that no such affordance exists. " +
        "⚠ WHEN CROP-03 LANDS THIS IS THE ASSERTION THAT REDDENS, AND THAT IS THE POINT — the plan " +
        "adding the control must move this file and declare the new name here.",
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE COPY — byte-for-byte, by string-literal comparison over the source
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(11) every shipped profile sentence is present byte-for-byte", () => {
    for (const file of files) {
      const corpus = new Set(file.scan.texts);
      const missing = (PINNED_COPY[file.path] ?? []).filter((sentence) => !corpus.has(sentence));
      expect(
        missing,
        `${file.path} no longer carries a sentence 15-UI-SPEC pins byte-for-byte. This list lives ` +
          "in a test on purpose (T-15-28): the two panel descriptions ARE the D-09/D-10 leak " +
          "boundary stated to the user, and a page that softened either one would look identical " +
          "and promise something the server-side boundary does not enforce. A copy change is fine " +
          "— it just has to move this file and be seen.",
      ).toEqual([]);
    }

    // The two panels asserted as WHOLE lists, which is what (7)'s count cannot say: a third panel
    // carrying a fourth sentence would satisfy every presence check above.
    expect(
      form.scan.panelTitles,
      "the profile panels' titles are not the pinned pair, in order.",
    ).toEqual([...PANEL_TITLES]);
    expect(
      form.scan.panelDescriptions,
      "the profile panels' descriptions are not the pinned pair, in order. These two sentences are " +
        "the public/private promise; swapping them would put the private assurance on the public box.",
    ).toEqual([...PANEL_DESCRIPTIONS]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // LINKS 2 AND 3 — PATTERN → ATTRIBUTE (DOM) → CONTRACT (UNION)
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(12) the REAL form renders two declared panel-card hooks, and the id is in the contract", () => {
    // The link a source scan cannot make, and here it is made against the real component rather than
    // a stand-in — see the measured PROBE 1/2/3 note in this file's header for why that was
    // achievable and what the one stub is. Case (7) proves the SOURCE composes two panels; only a
    // render proves what those two panels actually put in the document.
    render(
      <ProfileForm
        initial={{ firstName: "Ada", lastName: "Lovelace", phone: "", bio: "", city: "" }}
        avatarUrl={null}
        displayName="Ada"
      />,
    );

    const rendered = screen.getAllByTestId("panel-card");
    expect(
      rendered,
      "the rendered profile form does not put exactly two panel-card hooks in the document. This is " +
        "the count case (7) asserts from source, measured from the other end — a PanelCard that " +
        "stopped emitting its hook would leave (7) perfectly green.",
    ).toHaveLength(2);
    for (const node of rendered) {
      expect(node.getAttribute(SELECTOR_ATTRIBUTE)).toBe("panel-card");
    }

    // …and the two headings really are level 2 with the pinned titles, which (7) and (11) assert only
    // as props. `panel-card.tsx` hard-coded h2 until plan 15-06 widened the union, so "the prop says
    // h2" and "the DOM has an h2" are genuinely independent claims.
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([...PANEL_TITLES]);

    // The third link. `panel-card` is not a string this file invented, it is a row in SELECTOR_IDS.
    expect(
      (SELECTOR_IDS as readonly string[]).includes("panel-card"),
      '"panel-card" is not in SELECTOR_IDS. The contract is closed; a hook outside it is a hook ' +
        "nothing declares, and a container query that scopes through it resolves on nothing.",
    ).toBe(true);

    // The rendered proof of the two things case (10) asserts from source: the upload control is
    // reachable by its name, and NO control in the document is named as a removal.
    //
    // ⚠ THIS HALF SURVIVED PLAN 16-11 UNCHANGED, AND THAT IS A RESULT RATHER THAN AN OVERSIGHT. The
    // plan budgeted a red here — the picker left `profile-form.tsx` for `avatar-field.tsx`, so a
    // missing mock or a client-boundary import would have taken the render down with it. It did not:
    // the run that reddened (10) and (11) left (12) GREEN, so `AvatarField` mounts inside
    // `ProfileForm` under this config with the SAME single `next/navigation` stub and nothing else.
    // The crop dialog is not mounted at first paint (it exists only while a file is staged), so
    // `react-easy-crop` is imported but never rendered. Not one line of this case's setup moved.
    expect(screen.getByLabelText("Upload avatar")).toBeTruthy();
    const controlNames = [
      ...screen.queryAllByRole("button"),
      ...screen.queryAllByRole("link"),
    ].map((el) => (el.textContent ?? "").trim());
    expect(
      controlNames.filter((name) => REMOVAL_WORDS.test(name)),
      "a rendered control on the profile form is named as a removal.",
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE POSITIVE CONTROL
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(13) every scanner this file claims is shown catching its violation, on one fixture", () => {
    const bad = scanModule("fixture.tsx", VIOLATING_FIXTURE);

    // The raw container, INCLUDING the aliased one — the laundering a tag-name scan would miss. Note
    // the alias is spelled `Panel`, so a scan keyed on tag names would see a perfectly clean file.
    expect(bad.rawContainers.map((f) => f.what.split(" ")[0]).sort()).toEqual([
      "<CardContent>",
      "<Panel>",
    ]);
    // …and the legitimate pattern containers in the same file are still recognised, so the scanner is
    // not simply reporting everything it sees — and there are THREE of them, which is (7)'s defect.
    expect(bad.panelCards).toHaveLength(3);
    // The heading level, absent entirely — the DEFAULT-to-h2 direction of (7)'s third assertion.
    expect(bad.titleAs).toEqual([]);
    // Both banned variants — (8).
    expect(bad.variants.map((f) => f.what).sort()).toEqual([
      "variant=brand",
      "variant=destructive",
    ]);
    // The success token, the retired heading step and the hand-typed shell — (4) and (8).
    expect(bad.classLiterals.filter((f) => SUCCESS_TOKEN.test(f.what))).toHaveLength(1);
    expect(
      bad.classLiterals.filter((f) => f.what.split(/\s+/).includes(RETIRED_HEADING_STEP)),
    ).toHaveLength(1);
    expect(bad.classLiterals.filter((f) => f.what.includes(HAND_TYPED_SHELL))).toHaveLength(1);
    // The landmark — (4).
    expect(bad.mainElements).toHaveLength(1);
    // The timer on the save path — (9).
    expect(bad.timers.map((f) => f.what)).toEqual(["setTimeout"]);
    // The removal control, caught in the AUTHORED TEXT — (10).
    expect(bad.texts.filter((value) => REMOVAL_WORDS.test(value))).toEqual(["Remove photo"]);
    // The upload mechanism, absent — the direction (10)'s first assertion covers.
    expect(bad.fileInputs).toEqual([]);
    // The copy, drifted: one pinned description survives, and the titles are not the pinned pair.
    expect(bad.panelDescriptions).toEqual(["What other people on FitOut can see."]);
    expect(bad.panelTitles).not.toEqual([...PANEL_TITLES]);
    // …and the guard-the-guard floors are themselves non-vacuous on this fixture.
    expect(bad.jsxElements).toBeGreaterThan(5);
    expect(bad.texts.length).toBeGreaterThan(4);
  });
});
