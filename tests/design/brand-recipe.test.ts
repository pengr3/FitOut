// DS-08 / DS-09 / D-21 / D-22 — the coral accent reaches a booker through ONE variant, and the 44px
// touch target is a named size. This is the booker-tree half of that gate.
//
// WHY THIS FILE EXISTS AT ALL (T-10-24, T-10-39).
//
// Before this phase, fifteen call sites across the booking, group and search trees each repeated the
// same literal string in a `className`: `bg-brand text-brand-foreground hover:bg-brand/90`. Two
// things follow from that, and both are defects rather than style preferences:
//
//   1. THE HOVER FAILS WCAG AA, FIFTEEN TIMES OVER. `--brand-foreground` on a 90%-alpha brand
//      measures **4.04:1 in court and 3.87:1 in grove** against a 4.5:1 bar. The cause is
//      mechanical: an alpha modifier composites the surface toward whatever is BEHIND it, and behind
//      it is a light background — so the fill LIGHTENS and moves toward its own text colour. The
//      sanctioned recipe darkens instead, with a `color-mix` toward `--foreground`, and measures
//      5.41 / 5.36. That recipe is declared exactly once, in `src/components/ui/button.tsx`.
//   2. A REPEATED STRING IS INVISIBLE TO THE CONTRACT. Change the accent and fifteen files disagree
//      with the variant until someone finds them all. The variant is the only form the theme
//      runtime can actually reason about.
//
// The trap is live, not hypothetical: `10-RESEARCH.md` § Code Examples still ships a CVA block
// using the alpha hover. It is superseded, and this file plus `button-variants.test.ts` make
// copying it verbatim fail a committed gate rather than ship.
//
// SCOPE — COMPLETE as of plan 10-09. It was deliberately partial when 10-08 wrote it, covering only
// the four trees that plan owned (`src/app/(app)/bookings/**`, `src/components/booking/**`,
// `src/components/group/**`, `src/components/search/**`). Plan 10-09 added the host surface, the
// availability surface and the REPO-WIDE totals below, which is what closes DS-08. The per-tree
// blocks are kept intact rather than folded into the totals: a total of 20 is satisfiable by 20
// conversions in the wrong places, and the per-file maps are what make that unsatisfiable.
//
// THE 29 / 20 / 9 SPLIT — WHAT IS DELIBERATELY *NOT* CONVERTED, AND MUST NOT BE.
//
// Of the 29 source lines that carried the accent as a background before this phase, **20 are on a
// `<Button>` and 9 are not**. The 9 are the availability calendar's selected day, the date-pass
// picker's selected day, the slot picker's selected hour chip / soft-accent notice / full-day chip,
// the spots-left chip, the notification unread dot, and the listing wizard's two step markers. They
// are `data-[selected-single=true]:`- and `data-[state=on]:`-scoped recipes on react-day-picker and
// Radix primitives, a bare `<button>`, a `<Badge>`, a `<span>` and an `<ol>` marker — not buttons
// with a variant prop. Converting them breaks the availability calendar and the slot picker, the two
// surfaces the whole booking flow runs through (T-10-26).
//
// 10-08 asserted NOTHING about those 9, on purpose, because it did not own them. **This file now
// pins them by name and by count**, which inverts the guarantee: the 9 stop being an unexamined
// remainder and become a recorded, deliberate non-conversion. An over-eager future sweep that
// "finishes the job" goes red here with the file named.
//
// THE ALPHA BAN IS NOT ABOUT BUTTONS. The rejected hover measures **4.04:1 in court / 3.87:1 in
// grove**, and that is a property of the 90% alpha compositing over a light surface — not of the
// `<Button>` element. So 10-09 removed it from all five of its non-Button occurrences too: four
// hovers under `availability/` (variant prefixes preserved exactly) and one STATIC use on the
// wizard's done step marker, which was the same failure without a hover to hide behind. The
// replacement there is the SOLID token rather than a `color-mix`, deliberately — see T-10-41 and
// the comment at the call site: a `color-mix` would have dropped the pinned 9 to 8 silently.
//
// OBSERVED RED, NOT ASSUMED (every observation recorded per the plans' acceptance criteria):
//   • [10-08] The literal recipe reinstated on `src/components/group/create-group-button.tsx` (the
//     colour classes added back to its `className`, `variant="brand"` removed) → this file exits
//     NON-ZERO: **3 failed / 5 passed**, on exactly the three assertions that should care — the
//     adoption total (14, not 15), the per-file map (`create-group-button.tsx` 0, not 1), and the
//     banned-hover scan (which reports the offending file and matched text). Nothing else moved.
//     Reverted → exits 0 with **8 passed**.
//   • [10-09] `src/components/availability/slot-picker.tsx`'s full-day chip converted to a
//     `<Button variant="brand">` — the exact "helpful" sweep T-10-26 exists to stop → this file
//     exits NON-ZERO: **5 failed / 13 passed**, on exactly the five assertions that should care:
//     the slot-picker positive control (2 lines, not 3), the repo-wide adoption total (21, not
//     20), the surviving-accent MAP, its total (8, not 9), and the availability-hover map (the
//     converted chip took its `color-mix` with it). Every failure diff names the file, which is
//     the point — the message a future sweep gets is "you broke the slot picker", not "a number
//     moved". Reverted → exits 0 with **18 passed**.
//
//     Note for whoever repeats this: reverting with `git checkout -- <file>` restores HEAD, not
//     the pre-experiment working tree, so it silently discards uncommitted task edits in the same
//     file. Take a copy first.
//
// THE LITERALS THIS FILE BANS APPEAR IN THIS FILE, VERBATIM AND ON PURPOSE. `tests/` is outside the
// scanned tree (the walker below roots at `src/`), so a file whose job is to ban a string is allowed
// to name it. Inside `src/`, the same reasoning has to be written descriptively instead — that is
// the standing resolution for this phase's recurring grep-versus-comment collision, and the reason
// the comments added next to the two converted 44px CTAs describe their height rather than quote it.
// 10-09 extended that resolution to `src/lib/design/contrast-pairs.ts`, whose prose quoted the
// banned class twice while documenting the very measurement that condemns it.
//
// THAT EXEMPTION IS NOT FREE, AND 10-09 MEASURED THE BILL. It holds for THIS walker, which roots at
// `src/`. It does NOT hold for TAILWIND's content scan, which roots at the repo and reads every
// tracked file — so the prose above, and the phase's own planning markdown, still emit the banned
// utility into the shipped stylesheet: **770 bytes / 0.58%, across 4 orphan selectors, confirmed
// after a clean `rm -rf .next` rebuild**, for a class that exists in no component. Two scanners,
// two roots, and only one of them had ever been reasoned about. See deferred item D-1 (three
// sightings now: 10-04, 10-07, 10-09). It is why THIS gate is a source scan: an assertion of the
// shape "the banned recipe is absent from the compiled CSS" is unsatisfiable by construction here,
// against a perfectly clean source tree.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • PIXELS. This proves a prop is present, not that a browser paints coral. `cn()`/tailwind-merge
//     precedence at the call site, a later layer overriding the fill, and the actual rendered
//     contrast are all invisible here. Phase 11's visual pass and Phase 17's a11y audit see pixels.
//   • THE ACCENT BUDGET. Nothing here counts how MUCH coral a screen shows. `variant="brand"` on
//     every button in the app would pass every assertion below while destroying the 10% budget
//     D-21 exists to protect. `button-variants.test.ts` guards the half of that which is mechanical
//     (the default variant must stay neutral); the rest is a design judgement, not a scan.
//   • WHETHER THE 9 SURVIVORS STILL RENDER. This file proves they were not converted, which is not
//     the same as proving the calendar still paints a selected day. `npm run test:e2e` drives real
//     slot selection through both surfaces; that is the only mechanical check of the rendering.
//   • WHETHER `--brand` IS THE RIGHT COLOUR. That is `contrast.test.ts`'s job.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

import { stripComments } from "./helpers/strip-comments";
import { COLOUR_ROLE } from "../../config/design-leak-patterns.mjs";

const SRC_DIR = resolve(process.cwd(), "src");

/** The four trees plan 10-08 converts. The repo-wide blocks below cover everything else. */
const SCOPED_TREES = [
  "src/app/(app)/bookings/",
  "src/components/booking/",
  "src/components/group/",
  "src/components/search/",
] as const;

/**
 * Where an adopting call site can live, for the repo-wide total of 20.
 *
 * NOT all of `src/`, and the reason is worth naming so nobody "tightens" it later: the accent
 * variant is referenced in PROSE in `src/lib/design/contrast-pairs.ts`, describing the pairing it
 * measures. Widening this to `src/` makes the total 21 and the failure reads as a stray conversion
 * rather than as a doc comment. `src/components/ui/**` is inside the scope on purpose — the CVA
 * declares the variant but never *calls* it, so it contributes 0 and would expose a default flipped
 * to brand. That specific regression is `button-variants.test.ts`'s job; this is a second net.
 */
const ADOPTION_TREES = ["src/app/", "src/components/"] as const;

/**
 * THE 9 SURVIVORS — the non-Button accent recipes that stay token classes, by file and line count.
 *
 * This is the mitigation for T-10-26 and the whole point of the 10-09 half of this file. A bare
 * `toBe(9)` is satisfied by converting the slot picker's chip and un-converting a button somewhere
 * else; this map is not. `src/components/ui/**` is excluded because the CVA's own `bg-brand` is the
 * declaration these 9 deliberately do NOT route through.
 */
const EXPECTED_SURVIVING_ACCENT_LINES: Record<string, number> = {
  // 1 rather than 2 since WR-15: the wizard's `current` and `done` markers were two branches with
  // byte-identical output, kept apart only because this map counted LINES. They are one branch now.
  "src/app/(host)/host/listings/[id]/edit/wizard.tsx": 1,
  "src/components/availability/availability-calendar.tsx": 1,
  "src/components/availability/date-pass-picker.tsx": 1,
  "src/components/availability/slot-picker.tsx": 3,
  "src/components/availability/spots-left-chip.tsx": 1,
  "src/components/notifications/notification-item.tsx": 1,
};

/** The declaration site, excluded from the map above and asserted to be excluded. */
const CVA_TREE = "src/components/ui/";

/**
 * The sanctioned darkening hover, per file, under the availability tree.
 *
 * A per-file map rather than a bare total, for one specific failure mode: a migration that DELETED
 * the failing hover instead of replacing it would satisfy the alpha ban perfectly while silently
 * removing the hover affordance from a selected day. Pinning where the replacements landed makes
 * delete-instead-of-replace go red at the file that lost it.
 */
const EXPECTED_AVAILABILITY_HOVERS: Record<string, number> = {
  "src/components/availability/availability-calendar.tsx": 1,
  "src/components/availability/date-pass-picker.tsx": 1,
  "src/components/availability/slot-picker.tsx": 2,
};

const AVAILABILITY_TREE = "src/components/availability/";
const SANCTIONED_HOVER = "color-mix(in_oklch,var(--brand)";

/**
 * The exact conversion map, per file, rather than a bare total.
 *
 * T-10-39: fifteen near-identical edits across eleven files is precisely where an over-eager
 * find-and-replace strips a layout class or converts one site twice and another not at all. A total
 * of 15 is satisfiable by 15 conversions in the wrong eleven places; this map is not.
 *
 * SIXTEEN AS OF PLAN 12-10, and the new row is an ADDITION rather than a conversion: RESP-02's sticky
 * bottom bar is a net-new surface, so nothing was migrated onto the variant here — the variant is
 * simply the only way this repo is allowed to render the accent, which is exactly what DS-08 buys. It
 * is `variant="brand" size="touch"`, the D-22 pair, because the bar's one action is the page's focal
 * point below `lg:` (12-UI-SPEC § Visual Hierarchy) and a 44px hit area is the requirement.
 *
 * SEVENTEEN AS OF PLAN 12-11, and this addition is a DUPLICATION where 12-10's was not — which is the
 * fact worth recording rather than smoothing over. `booking/checkout-sticky-bar.tsx` renders the
 * checkout's `Confirm & pay` a SECOND time, in a fixed bottom bar, while `reserve-actions.tsx` keeps the
 * inline one for `lg:` and up; `hidden` is what leaves exactly one of the two reachable at any width.
 * The alternative — one `<Button>` element in a local layout fork, the shape `book-cta.tsx` uses — was
 * available and rejected: it would have kept this number at 16 while the rendered document held two
 * coral buttons either way, and a map that reports one accent where a browser paints two is measuring
 * the wrong thing. The accent budget (D-21) is unaffected: the two are mutually exclusive, so a booker
 * never sees more than one coral control on this route at any width.
 *
 * NINETEEN AS OF PLAN 13-07, and the two new sites are one file: `booking/not-completed-state.tsx`,
 * STATE-05's third payment state, which had no surface at all before that plan. Like 12-10's row it is
 * an ADDITION rather than a conversion — nothing was migrated onto the variant, because nothing existed
 * to migrate.
 *
 * ⚠ IT IS 2 IN ONE FILE, AND THE REASON IS NOT THE CHECKOUT BAR'S. The two are the arms of a RUNTIME
 * conditional, not a pair of `hidden`-swapped elements: while the hold is alive the coral is `Try paying
 * again`, and the moment the countdown reaches zero that element is UNMOUNTED and replaced in place by
 * `Back to availability`. So unlike `checkout-sticky-bar.tsx` — where both buttons are real elements in
 * one document and both had to be counted — here the rendered document holds exactly ONE coral at every
 * instant, at every width, in both states. `expired-approval-state.tsx` is the shape this follows.
 * `tests/booking/payment-states.test.tsx` asserts the rendered count directly (exactly one `bg-brand`
 * anchor in the document), so the accent budget (D-21) is checked where it is actually spent rather
 * than inferred from this map.
 */
const EXPECTED_CONVERSIONS: Record<string, number> = {
  "src/app/(app)/bookings/[id]/page.tsx": 3,
  "src/app/(app)/bookings/page.tsx": 2,
  "src/components/booking/book-cta.tsx": 1,
  "src/components/booking/booking-row.tsx": 1,
  "src/components/booking/booking-sticky-bar.tsx": 1,
  "src/components/booking/checkout-sticky-bar.tsx": 1,
  "src/components/booking/expired-approval-state.tsx": 2,
  "src/components/booking/hold-expired-state.tsx": 1,
  "src/components/booking/not-completed-state.tsx": 2,
  "src/components/booking/payment-reversed-state.tsx": 1,
  "src/components/booking/reserve-actions.tsx": 1,
  "src/components/group/create-group-button.tsx": 1,
  "src/components/group/rsvp-form.tsx": 1,
  "src/components/search/party-step.tsx": 2,
};

/** The two booker CTAs that hand-rolled a 44px height before D-22 gave it a name. */
const TOUCH_SITES = [
  "src/components/group/rsvp-form.tsx",
  "src/components/search/party-step.tsx",
] as const;

const BRAND_VARIANT = 'variant="brand"';
const TOUCH_SIZE = 'size="touch"';

/**
 * ANY background use of the accent token, not just the one banned spelling.
 *
 * `bg-brand/90` is the form that measures 4.04 / 3.87, but `/95` and `/85` are one plausible typo
 * away and are equally broken; the bare `bg-brand` is the half that belongs in the variant. Matching
 * the token itself catches all of them, and catches a re-introduction that arrives in a
 * `data-[…]:`-scoped or `hover:`-scoped position too.
 */
const ACCENT_BACKGROUND = /[^\s"'`]*bg-brand(\/\d+)?/g;

/**
 * The same pattern WITHOUT the `g` flag, for per-line `.test()` calls.
 *
 * Not a style choice. A `/g` regex carries `lastIndex` across `.test()` calls, so reusing
 * `ACCENT_BACKGROUND` inside a `.filter()` would match line 1, resume from that offset on line 2,
 * miss it, reset, match line 3 — undercounting by roughly half and turning the pinned 9 into a
 * number that happens to be smaller. The failure would look like a successful conversion.
 */
const ACCENT_BACKGROUND_LINE = /[^\s"'`]*bg-brand(\/\d+)?/;

/**
 * THE banned recipe, named exactly, in every position it can arrive in.
 *
 * The leading `[^\s"'`]*` is what makes this catch `hover:bg-brand/90`,
 * `data-[state=on]:hover:bg-brand/90` and the bare static form the wizard's done marker carried —
 * one regex for all three, because the 4.04 / 3.87 failure does not care which prefix delivered it.
 */
const BANNED_ALPHA_HOVER = /[^\s"'`]*bg-brand\/90/g;

/**
 * Any alpha on the accent — in ANY role — other than the one that was measured.
 *
 * `/10` is a declared pairing that passes (`contrast-pairs.ts` measures foreground-on-brand@10%
 * over both background and card) and ships on the spots-left chip and the slot picker's notice.
 * Every other alpha is unmeasured, and `/85` / `/95` are one keystroke from `/90` and equally
 * broken — the same widening `button-variants.test.ts` applies inside the CVA, applied to call
 * sites. Deliberately narrower than a blanket alpha ban, which would delete a shipped soft accent.
 *
 * THE ROLE PREFIX IS NOW A SET, NOT JUST `bg-` (CR-01/CR-03). This pattern read `bg-brand/…`, so it
 * policed the FILL and nothing else — and the phase's own argument is about compositing, which is
 * indifferent to which property carries the alpha. Three shapes walked straight through the old
 * form and all three shipped:
 *
 *   • `text-brand-foreground/80` — the slot picker's "N of M free" sub-label, painted on the coral
 *     fill set ten lines above it, measuring 3.38:1 (court) / 3.51:1 (grove) against a 4.5 bar.
 *     An alpha tint over a light surface lightens, so diluting the INK drags it toward the fill
 *     exactly as diluting the fill drags it toward the ink. Same arithmetic, opposite operand.
 *   • `ring-brand/50` — the pending-start anchor, 2.23:1 / 2.03:1 against a 3:1 bar.
 *   • `border-brand/30` — recorded as a shipping composite by IN-05 and equally unmeasured.
 *
 * `brand-foreground` is matched as well as `brand` because the token name is a prefix of it; the
 * alternation is ordered longest-first so the longer name wins the match.
 *
 * THE ROLE LIST IS IMPORTED, NOT RETYPED (WR-08). It used to be a second hand-written alternation,
 * written into this file two hours before `config/design-leak-patterns.mjs` introduced `COLOUR_ROLE`
 * to stop exactly that kind of drift — and it was missing the two families that fragment exists for.
 * `border-b-brand/30`, `border-t-brand/40` and `divide-x-brand/50` were all verified UNMATCHED by
 * the old alternation: a directional accent edge at an unmeasured dilution was invisible here while
 * `border-b-gray-200` was banned by the leak gate. Now the two lists cannot disagree, because there
 * is one list.
 *
 * THE MODIFIER IS EITHER NUMERIC OR ARBITRARY, AND BOTH ARE POLICED (IN-06). This read `\/\d+`, so
 * it saw the percentage spelling and not the bracketed one — while Tailwind compiles
 * `bg-brand/[0.34]`, `ring-brand/[.5]` and `ring-destructive/[20%]` to exactly the same thing as
 * their numeric twins. `pair-drift.test.ts` has always known the shape exists (it keys the arbitrary
 * form as `NaN` so it can never match a declared row, fail-closed); this scan and the one below did
 * not, so one of three gates understood the spelling and two were blind to it.
 *
 * The `/10` carve-out is deliberately NOT extended to `[0.1]`. It is the same value, but the
 * declared row is keyed on the canonical numeric spelling, so an arbitrary one is unmeasured by
 * definition here — matching it forces the author onto the form the inventory can actually see.
 */
const UNMEASURED_ACCENT_ALPHA = new RegExp(
  `[^\\s"'\`]*${COLOUR_ROLE}-(?:brand-foreground|brand)\\/(?:(?!10(?![\\d.]))\\d+|\\[[^\\]\\s]+\\])`,
  "g",
);

/**
 * EVERY diluted colour utility in the tree, whatever token it names (WR-07).
 *
 * WHY THIS EXISTS AND WHY IT IS A PIN RATHER THAN A ZERO. The scan above is token-scoped to the
 * brand family, and the fix report for the pass that widened it recorded the widening as covering
 * "every colour role" — true of the ROLE side, and only ever true of two TOKEN names. So
 * `border-destructive/40` — a live, shipping composite on every host with a failed payout, measured
 * with this suite's own arithmetic at **2.126:1 over `--card` in both themes** against a 3.0
 * non-text bar — was not a `CONTRAST_PAIRS` row, not an `EXCLUDED_PAIRS` row, and not matched by any
 * scan. That is precisely the third state `contrast-pairs.ts` says must not exist, and the widening
 * that was supposed to catch it existed and did not.
 *
 * WHY IT IS NOT A ZERO-VIOLATIONS ASSERTION. Twenty-one distinct diluted shapes ship today, and
 * classifying all of them — measuring each composite, deciding legal-vs-decorative-vs-failing —
 * is a design pass, not a fix. Asserting zero would mean writing twenty exemptions I have not
 * measured, which is the same "a comment asserts what nobody checked" failure this whole review is
 * about. So the inventory is PINNED instead: every shape that ships is named here with its status,
 * and a NEW one goes red at the file that introduced it. That converts "invisible" into "recorded",
 * which is the property `contrast-pairs.ts:34-36` actually asks for.
 *
 * The brand family stays at ZERO through the scan above; this is the wider net around it.
 *
 * IT MATCHES THE ARBITRARY MODIFIER TOO (IN-06). Verified before the widening, on the real tree:
 * `bg-accent/35` on `booking-row.tsx` went red naming the file, and `bg-accent/[0.35]` — the SAME
 * dilution, which Tailwind compiles identically — left the whole suite at 442/442 green. The
 * bracketed value is kept verbatim in the key (`accent/[0.35]`, not `accent/35`), because a shape
 * the inventory has not seen should arrive as a new key and go red, rather than quietly folding
 * into an existing entry whose recorded measurement was taken of the other spelling.
 */
const DILUTED_TOKEN = new RegExp(
  `(?<![\\w-])${COLOUR_ROLE}-([a-z][a-z0-9-]*)\\/(\\d+|\\[[^\\]\\s]+\\])`,
  "g",
);

/**
 * Every diluted composite that ships, and what is known about each.
 *
 * `declared` — a `CONTRAST_PAIRS` row measures it (`alpha` or `fgAlpha`).
 * `exempt`   — an `EXCLUDED_PAIRS` row or a local decorative exemption carries it, with a number.
 * `inert`    — only ever reached under a second colour scheme this app never activates (THEME-05
 *              pins the count of those variants; `dark-scope.test.ts` is what keeps them inert).
 * `recorded` — measured, clears its bar, but nothing in the inventory names it yet.
 *
 * A shape moving between statuses is a decision; a shape appearing that is not here at all is the
 * regression this map exists to surface.
 */
const EXPECTED_DILUTED_TOKENS: Readonly<Record<string, string>> = {
  "background/80": "recorded — overlay scrim over the page, never carries text",
  "brand/10": "declared — foreground-on-brand@10% over background and card",
  "brand/30": "exempt — DECORATIVE_ACCENT_EDGE, 1.60 court / 1.49 grove, never the sole boundary",
  "destructive/10": "declared — destructive-on-destructive@10% over background and card",
  "destructive/20": "recorded — destructive tint behind a solid destructive glyph",
  "destructive/30": "recorded — destructive tint behind a solid destructive glyph",
  "destructive/40": "exempt — container edge, 2.126 court / 2.126 grove over card (WR-07)",
  "destructive/50": "inert — second-colour-scheme variant only",
  "destructive/90": "recorded — alert description ink, 5.24 court / 5.11 grove over background",
  "foreground/10": "exempt — the decorative card/overlay hairline (focus-recipe.test.ts)",
  "foreground/60": "declared — inactive tab label on the muted track, 5.11 / 4.81 (WR-09)",
  "foreground/80": "recorded — overlay scrim, never carries text",
  // 12-07. THE SAME CLASS OF THING AS THE TWO SCRIM ROWS ABOVE, and it is `recorded` rather than
  // `declared` or `exempt` for the reason those are: a surface carrying NO TEXT AND NO BOUNDARY has
  // nothing for a contrast ratio to be about. WCAG 1.4.3 is about text and 1.4.11 is about a UI
  // component's visual boundary; a full-screen tint behind a photograph is neither.
  //
  // THE "CARRIES NO TEXT" CLAIM IS STRUCTURAL HERE, NOT A PROMISE. `photo-lightbox.tsx` puts the
  // counter, prev/next and close on a `bg-background` plate carrying `text-foreground` — a declared,
  // measured pairing — precisely so the scrim never has ink on it. The scrim is the one surface on
  // that route with no page token behind it, so ink placed directly on it would be a pairing outside
  // `contrast-pairs.ts` entirely, which is the third state that inventory exists to forbid. If a
  // later plan ever writes a string onto the scrim, this row stops being true and the pairing has to
  // be measured and declared — do not read `recorded` as blanket permission for the token.
  "foreground/90": "recorded — the photo lightbox's full-screen scrim (12-07), carries no text",
  "input/30": "inert — second-colour-scheme variant only",
  "input/50": "inert — second-colour-scheme variant only",
  "input/80": "inert — second-colour-scheme variant only",
  "muted/40": "recorded — hover tint; muted-foreground on it measures 5.03–5.68",
  "muted/50": "recorded — hover tint; muted-foreground on it measures 5.03–5.68",
  "primary/80": "recorded — pressed-state tint on a solid fill",
  "secondary/80": "recorded — pressed-state tint on a solid fill",
};

/**
 * The one diluted accent that is NOT ink and NOT an indicator — the chip's ornamental edge.
 *
 * Measured, because an exemption without a number is just an opinion: the 30% coral composites to
 * `#f4c0c2` (court) / `#b3d7d6` (grove) and measures 1.60:1 / 1.49:1 against the page. It is legal
 * anyway, for the same reason `contrast-pairs.ts` carries `--border` and `--input` in
 * `EXCLUDED_PAIRS`: it is never the sole boundary and never an indicator. Both call sites — the
 * spots-left chip and the slot picker's gap notice — draw it around a FILLED surface whose tint is
 * what actually bounds the shape, carry their words as `text-foreground` on that tint (a declared,
 * measured row), and put the meaning in a SOLID `text-brand` icon beside them. Deleting the edge
 * would change how the chip looks and improve nothing anyone can read.
 *
 * NOTE WHY THIS LIVES HERE AND NOT IN `EXCLUDED_PAIRS`. That inventory is keyed on `fg`+`bg` with
 * no alpha in the key, and `brand on background` is already a measured row — so the exemption
 * cannot be stated there without colliding with the row it is not talking about. That is the same
 * alpha-blind-key defect WR-05 records in `pair-drift.ts`, met from the other side.
 *
 * BARE FORM ONLY, exactly as with the ring hairline in `focus-recipe.test.ts`: a variant chain
 * means the edge appears in response to a state, and a state edge is an indicator.
 */
const DECORATIVE_ACCENT_EDGE = new Set(["border-brand/30"]);

/** A hand-rolled 44px height class, as a whole token — `min-h-11` and `h-110` must not match. */
const BARE_TOUCH_HEIGHT = /(^|[\s"'`:])h-11(?![\d.])/;

type Violation = string;

/**
 * Collect every `.ts`/`.tsx` file under a directory, recursively.
 *
 * Copied from `tests/design/focus-recipe.test.ts:69` (plan 10-07), which is this phase's reference
 * walker. `.css` is not collected here: unlike the focus ring, the accent recipe never lived in the
 * stylesheet — `globals.css` declares `--brand` as a token and never composes a `bg-brand` utility.
 */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — copied verbatim from `tests/design/focus-recipe.test.ts:90`, which
 * took it from `tests/use-server-exports.test.ts:302`. Load-bearing, not cosmetic: on this box
 * `path.relative` emits backslash separators, while every scope decision in this file is a
 * FORWARD-SLASH path-prefix comparison. Without this line `SCOPED_TREES` matches nothing, the
 * violation lists come back empty, the per-file map comes back empty — and every assertion below
 * passes vacuously. That is exactly what the guard-the-guard block exists to catch.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/**
 * Extract the opening `<Button …>` tag that encloses a given index.
 *
 * Written properly rather than as a "read to the next `>`", because one of the converted call sites
 * carries `onClick={form.handleSubmit((v) => onSubmit(v, "yes"))}` — an arrow function whose `>`
 * sits inside the props. Brace depth and quote state are tracked so the tag ends at the real `>`.
 *
 * This is what lets the touch assertions be made PER ELEMENT instead of per file. That distinction
 * is the whole point here: these files legitimately keep other 44px height classes on `<Input>`,
 * `<SelectTrigger>` and `<InputGroup>` primitives, which have no `touch` size to opt into, so a
 * file-level "contains no h-11" assertion would be asserting something untrue and unrelated.
 *
 * CORRECTED (WR-01): that sentence used to be written as if it covered EVERY remaining `h-11` in
 * these two files. It does not — both also carried `<Button variant="outline">` elements
 * hand-rolling the height, and a `<Button>` is exactly the element that DOES expose the size. The
 * per-element scope is still right; the reason is that this assertion speaks only for the brand
 * element, not that no other control in the file could opt in.
 *
 * The `depth`/`quote` walk is what makes it usable for counting: a naive `<Button[^>]*>` truncates
 * at the `>` inside an arrow function like `onClick={(v) => …}`, which silently reads a fragment of
 * the tag and misses the `className` that follows it.
 */
function enclosingButtonTag(text: string, index: number): string {
  const start = text.lastIndexOf("<Button", index);
  if (start === -1) return "";

  let depth = 0;
  let quote: string | null = null;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return text.slice(start, i + 1);
  }
  return text.slice(start);
}

interface Scan {
  /** Normalised forward-slash paths of every file the walker visited. */
  scanned: string[];
  /** Files inside the four trees plan 10-08 owns. */
  inScope: string[];
  /** `variant="brand"` occurrences, per in-scope file that has any. */
  conversions: Record<string, number>;
  /** Every background use of the accent token inside the four trees, as `file: matched-text`. */
  accentBackgrounds: Violation[];
  /** Raw text of every scanned file, keyed by normalised path. */
  text: Map<string, string>;

  // ---- Repo-wide, added by plan 10-09 -------------------------------------------------------
  /** `variant="brand"` occurrences per file across `ADOPTION_TREES` — the total must be 20. */
  adoption: Record<string, number>;
  /** LINES containing the accent background, per file, outside the CVA tree — the 9 survivors. */
  survivingAccentLines: Record<string, number>;
  /** Every occurrence of the banned alpha under `src/`, as `file: matched-text`. Must be empty. */
  bannedAlphaHovers: Violation[];
  /** Every unmeasured alpha on the accent background under `src/`. Must be empty. */
  unmeasuredAlphas: Violation[];
  /** Every diluted colour utility in the tree, as `token/alpha` → the files carrying it (WR-07). */
  dilutedTokens: Map<string, Set<string>>;
  /** Occurrences of the sanctioned darkening hover per file under the availability tree. */
  availabilityHovers: Record<string, number>;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): Scan {
  const scan: Scan = {
    scanned: [],
    inScope: [],
    conversions: {},
    accentBackgrounds: [],
    text: new Map(),
    adoption: {},
    survivingAccentLines: {},
    bannedAlphaHovers: [],
    unmeasuredAlphas: [],
    dilutedTokens: new Map(),
    availabilityHovers: {},
  };

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const text = readFileSync(file, "utf8");
    scan.scanned.push(name);
    scan.text.set(name, text);

    // --- Repo-wide, over EVERY file under `src/` ------------------------------------------
    // The alpha bans are unscoped on purpose: the 4.04 / 3.87 failure is a property of the tint,
    // so there is no tree where the recipe is acceptable. `tests/` is outside this walker's root,
    // which is why this file may name the banned literals verbatim and `src/` may not.
    for (const m of text.matchAll(BANNED_ALPHA_HOVER)) {
      scan.bannedAlphaHovers.push(`${name}: ${m[0]}`);
    }
    for (const m of text.matchAll(UNMEASURED_ACCENT_ALPHA)) {
      // `m[0]` carries any variant chain, so a state-scoped edge can never equal the bare key.
      if (DECORATIVE_ACCENT_EDGE.has(m[0])) continue;
      scan.unmeasuredAlphas.push(`${name}: ${m[0]}`);
    }

    // WR-07 — the wider net: EVERY diluted colour utility, whatever token it names. Read from
    // stripped code so a comment describing a composite is not counted as one shipping.
    for (const m of stripComments(text).matchAll(DILUTED_TOKEN)) {
      const key = `${m[1]}/${m[2]}`;
      const files = scan.dilutedTokens.get(key) ?? new Set<string>();
      files.add(name);
      scan.dilutedTokens.set(key, files);
    }

    // EVERY COUNT BELOW READS `code`, NOT `text` (WR-04) — comments are removed first, so prose
    // describing a conversion cannot be mistaken for the conversion. The ZERO assertions above
    // deliberately keep reading raw `text`: for a class that must appear nowhere at all, a comment
    // quoting it is indistinguishable from a call site using it, and the phase relies on that
    // strictness (see the note in `contrast-pairs.ts` about describing rather than quoting).
    //
    // THE STRIPPER IS SHARED AND IT STRIPS TRAILING COMMENTS (WR-02). This file used to carry its
    // own copy, one of four in the suite, and every copy was line-anchored — so a comment that
    // OPENED a line was blanked and a TRAILING one survived. That was not academic: the primary
    // booker CTA was changed to `variant="secondary"` with a trailing comment naming the old
    // variant, and all six counts below stayed green while "Book this space" stopped being coral.
    // `tests/design/strip-comments.test.ts` holds that escape as a fixture.
    const code = stripComments(text);

    if (name.startsWith(AVAILABILITY_TREE)) {
      const hovers = code.split(SANCTIONED_HOVER).length - 1;
      if (hovers > 0) scan.availabilityHovers[name] = hovers;
    }

    if (ADOPTION_TREES.some((tree) => name.startsWith(tree))) {
      const adopted = code.split(BRAND_VARIANT).length - 1;
      if (adopted > 0) scan.adoption[name] = adopted;

      // OCCURRENCES, not lines (WR-15). Counting lines let a test's convenience dictate the shape
      // of production code: `wizard.tsx` kept two branches with byte-identical output purely so the
      // token would land on two lines, and its comment said so outright — the obvious refactor
      // would have turned a committed gate red for a reason with nothing to do with the design
      // contract. A count of occurrences is invariant to how the source is wrapped, so the code is
      // free to take whatever shape is clearest.
      if (!name.startsWith(CVA_TREE)) {
        const hits = [...code.matchAll(ACCENT_BACKGROUND)].length;
        if (hits > 0) scan.survivingAccentLines[name] = hits;
      }
    }

    // --- The four trees plan 10-08 owns ----------------------------------------------------
    if (!SCOPED_TREES.some((tree) => name.startsWith(tree))) continue;
    scan.inScope.push(name);

    const count = code.split(BRAND_VARIANT).length - 1;
    if (count > 0) scan.conversions[name] = count;

    for (const m of text.matchAll(ACCENT_BACKGROUND)) {
      scan.accentBackgrounds.push(`${name}: ${m[0]}`);
    }
  }

  return scan;
}

const scan = scanSrc();

describe("DS-08 — the scan itself reaches what it claims to police", () => {
  // GUARD-THE-GUARD. Every violation assertion below is an empty-list or a count assertion, and a
  // scanner that visited zero in-scope files satisfies the empty lists perfectly. A moved directory,
  // a `process.cwd()` that is not the repo root, or a backslash creeping back into the path
  // comparison would each turn this file green and blind in the same stroke.
  it("visits the whole source tree, not a fraction of it", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("reaches a converted file — the positive control for the whole map", () => {
    // Not merely "was visited": the walker must have read a file that actually carries the variant,
    // which is the only way to distinguish a real clean tree from an empty scan.
    expect(scan.scanned).toContain("src/components/booking/book-cta.tsx");
    expect(scan.text.get("src/components/booking/book-cta.tsx")).toContain(BRAND_VARIANT);
  });

  it("reaches all four of the trees this plan owns", () => {
    for (const tree of SCOPED_TREES) {
      expect(scan.inScope.filter((f) => f.startsWith(tree)).length).toBeGreaterThan(0);
    }
  });
});

describe("DS-08 — the accent reaches the booker through the variant, never through a string", () => {
  it("converts exactly 20 call sites across the booking, group and search trees", () => {
    // 15 -> 16 by plan 12-10's `booking/booking-sticky-bar.tsx`. See EXPECTED_CONVERSIONS for why that
    // one is an addition rather than a conversion, and why a bar with a brand action is the shape
    // 12-UI-SPEC asks for at this width rather than an accent someone reached for.
    //
    // 16 -> 17 by plan 12-11's `booking/checkout-sticky-bar.tsx`, BFLOW-06's checkout bar. That one is
    // a DUPLICATION of an existing accent rather than a new one — the same `Confirm & pay`, in a second
    // box, with `hidden` keeping exactly one reachable per width. EXPECTED_CONVERSIONS records why it
    // is counted honestly instead of being folded into a layout fork to keep this number still.
    //
    // 17 -> 19 by plan 13-07's `booking/not-completed-state.tsx`, STATE-05's third payment state, which
    // rendered nothing at all before that plan. Both of its sites are in ONE file and are the two arms
    // of a runtime conditional — the retry while the hold is alive, the recovery once it lapses — so
    // exactly one is mounted at any instant. See EXPECTED_CONVERSIONS for why that is a different fact
    // from the checkout bar's two, and where the rendered accent count is actually asserted.
    const total = Object.values(scan.conversions).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(20);
  });

  it("converts exactly the right sites — the per-file map, not just the total", () => {
    expect(scan.conversions).toEqual(EXPECTED_CONVERSIONS);
  });

  it("leaves no bg-brand in any form, because hover:bg-brand/90 measures 4.04:1 in court and 3.87:1 in grove against a 4.5 bar", () => {
    // The failure is a property of the alpha, not of any one element: a tint over a light surface
    // LIGHTENS, moving a filled control toward its own text colour. The sanctioned hover darkens
    // with a color-mix (5.41 / 5.36) and lives once, inside the variant in `ui/button.tsx`.
    expect(scan.accentBackgrounds).toEqual([]);
  });
});

describe("DS-09 / D-22 — the two 44px CTAs say so by name", () => {
  it("names the touch size on both sites that hand-rolled the height", () => {
    // AT LEAST ONCE, not exactly once (WR-01). The original pin was an equality, which quietly made
    // "a second control in this file adopted the named size" a test failure — the opposite of what
    // DS-09 wants. `rsvp-form.tsx` now carries two: the brand CTA and the outline button beside it,
    // which previously hand-rolled the same 44px and rendered with different padding for it.
    for (const site of TOUCH_SITES) {
      const text = scan.text.get(site);
      expect(text, `${site} was not scanned`).toBeDefined();
      expect(
        text!.split(TOUCH_SIZE).length - 1,
        `${site} should opt into the touch size`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("puts the touch size on the brand element itself, with no hand-rolled height beside it", () => {
    // PER ELEMENT, not per file, and the distinction is load-bearing — but NOT for the reason this
    // comment used to give (WR-01). It claimed both files keep their other 44px heights on `<Input>`
    // and `<SelectTrigger>` primitives, "which have no `touch` size to opt into". That was false for
    // both files: `search-bar.tsx` and `rsvp-form.tsx` each carried `<Button variant="outline">`
    // elements hand-rolling `h-11`, and a `<Button>` is precisely the element that DOES expose the
    // size. The justification described a limitation of the primitives rather than the real scope of
    // the contract, and would have sent the next reader looking for a constraint that is not there.
    //
    // The true reason is narrower and holds: THIS assertion is about the BRAND element — the one
    // control D-22 named the size for — so it reads the enclosing tag of `variant="brand"` and says
    // nothing about any other control in the file. Repo-wide adoption is a separate claim, measured
    // by the test below rather than asserted by a comment.
    const offenders: Violation[] = [];

    for (const site of TOUCH_SITES) {
      const text = scan.text.get(site)!;
      const tag = enclosingButtonTag(text, text.indexOf(BRAND_VARIANT));

      if (!tag.includes(TOUCH_SIZE)) offenders.push(`${site}: brand element is missing the size`);
      if (BARE_TOUCH_HEIGHT.test(tag)) offenders.push(`${site}: brand element hand-rolls its height`);
    }

    expect(offenders).toEqual([]);
  });

  it("requires that ZERO <Button> elements hand-roll the height (DS-09, closed by Phase 17)", () => {
    // THIS WAS A MEASUREMENT AND IS NOW A REQUIREMENT. DS-09 shipped Pending with Phase 17 named as
    // its owner, so until that phase arrived this could not fail the build for sites nobody had
    // reached yet; what it had to do instead was stop the adoption gap being invisible, which is how
    // the gap came to be described by a comment that was simply wrong (WR-01). Phase 17 (plan 17-05)
    // converted the sites, so the ceiling is gone and the assertion below is a zero.
    //
    // Counts `<Button …>` tags carrying a bare `h-11`. `<Input>`, `<SelectTrigger>`, `<InputGroup>`
    // and `<Skeleton>` are excluded because they genuinely expose no `touch` size — the claim the
    // old comment made about Buttons, which is true only of these.
    const handRolled: Violation[] = [];
    for (const [name, text] of scan.text) {
      const code = stripComments(text);
      for (let i = code.indexOf("<Button"); i !== -1; i = code.indexOf("<Button", i + 1)) {
        const tag = enclosingButtonTag(code, i);
        if (BARE_TOUCH_HEIGHT.test(tag)) {
          handRolled.push(`${name}: ${tag.replace(/\s+/g, " ").slice(0, 70)}…`);
        }
      }
    }

    // ZERO is now the record, and a rise is the only way this can move. If it RISES, a new site
    // hand-rolled the height that should have opted into the size, and that is the regression this
    // gate exists to surface. Do not answer a red here by raising a number back into this line.
    //
    // THE LITERAL SAID SIX AND THE TREE MEASURED FIVE — recorded because the gap is the point, not
    // a footnote. When plan 17-05 reached this line the count came back **5**, reproduced through
    // this file's own scan (same walker, same `BARE_TOUCH_HEIGHT`, same `enclosingButtonTag`, same
    // `stripComments`) over the pre-conversion tree, in four files:
    //
    //   src/components/search/search-bar.tsx        — the date trigger and the price trigger
    //   src/components/group/group-refresh.tsx      — the load-failure retry
    //   src/components/group/regenerate-link-button.tsx
    //   src/components/group/remove-attendee-button.tsx
    //
    // So the gate had been PASSING AT 5 AGAINST A LITERAL OF 6, and would have kept passing if a
    // sixth site appeared. That is exactly the shape this file's own docblock warns about: a ceiling
    // that reads as a considered decision and is a forgotten one. The arithmetic that produced the 6
    // is the same lesson from the other side — the WR-01 review enumerated the sites by hand and
    // found seven, running the count found EIGHT (`rsvp-form.tsx`'s "Change my answer" was missed by
    // the hand pass), two were converted then and the literal was set to six without the remainder
    // ever being re-counted. A comment describing the gap was wrong twice over; a stale ceiling was
    // wrong a third time. Only a number that must be zero cannot drift.
    //
    // The scan is deliberately NOT scoped to exclude the D-22 files, and that argument still stands
    // at zero: `search-bar.tsx` is a named D-22 site and it carried two of the five, so a per-site
    // exemption would have hidden the largest part of the gap and recreated exactly the comfortable,
    // wrong story WR-01 is about.
    //
    // The offender list stays in the failure message. At `toBe(0)` the message is the only thing
    // that tells the next author WHICH site regressed, and a zero with no names is a gate nobody can
    // act on.
    expect(
      handRolled.length,
      `hand-rolled 44px <Button> heights:\n${handRolled.join("\n")}`,
    ).toBe(0);
  });
});

// =============================================================================================
// PLAN 10-09 — the repo-wide half, which is what closes DS-08.
// =============================================================================================

describe("DS-08 — the repo-wide scan reaches the trees it now claims to police", () => {
  // GUARD-THE-GUARD, restated for the wider scope. The blocks below are dominated by empty-list
  // and exact-map assertions, every one of which a scanner that read nothing satisfies perfectly.
  it("visits more than 200 source files", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("reaches the slot picker — the file T-10-26 says must never be converted", () => {
    // The positive control for the non-conversion half: a walker that cannot see this file cannot
    // notice it being converted either, and the "exactly 9" assertion would go green on a broken
    // availability surface.
    expect(scan.scanned).toContain("src/components/availability/slot-picker.tsx");
    expect(scan.survivingAccentLines["src/components/availability/slot-picker.tsx"]).toBe(3);
  });

  it("reaches the CVA and still excludes it from the 9, which is the scope rule working", () => {
    // `ui/button.tsx` DOES carry the accent background — it is the declaration. If it were merely
    // unscanned, the exclusion below would be indistinguishable from a walker that never got here.
    expect(scan.scanned).toContain("src/components/ui/button.tsx");
    expect(scan.text.get("src/components/ui/button.tsx")).toMatch(ACCENT_BACKGROUND_LINE);
    expect(Object.keys(scan.survivingAccentLines)).not.toContain("src/components/ui/button.tsx");
  });
});

describe("DS-08 / D-21 — coral appears on exactly the 22 buttons someone asked for it", () => {
  it("adopts the brand variant at exactly 29 call sites across src/app and src/components", () => {
    // 15 from plan 10-08 (bookings, booking, group, search) + 5 from plan 10-09 (the host surface) +
    // 1 from plan 12-10 (RESP-02's sticky bottom bar, the mobile listing page's single focal action) +
    // 1 from plan 12-11 (BFLOW-06's checkout bar, the mobile checkout's single focal action). The
    // per-tree maps above and the surviving map below are what stop this total being satisfied by 22
    // conversions in the wrong twenty-two places.
    //
    // ⚠ THE LISTING BAR ADDS EXACTLY ONE, AND THAT IS THE ASSERTION DOING WORK HERE. That bar renders
    // two MUTUALLY EXCLUSIVE actions — the sheet trigger and, once a window is picked, `BookCta` in its
    // bar layout — and only the trigger is a brand call site in this file. `BookCta` was already
    // counted, and it stayed at 1 because its layout fork changes that button's size and width and
    // never duplicates the element. A 2 there would mean the fork became a second button.
    //
    // ⚠ THE CHECKOUT BAR ADDS ONE FOR THE OPPOSITE REASON, and the contrast is the point. It IS a
    // second button: `reserve-actions.tsx` keeps the inline `Confirm & pay` for `lg:` and up and the
    // bar renders its own for below, with `hidden` leaving exactly one reachable at any width. Both
    // are real elements in the rendered document, so both are counted — see EXPECTED_CONVERSIONS for
    // why the layout-fork spelling was rejected here rather than borrowed from `BookCta`.
    //
    // ⚠ AND PLAN 13-07's TWO ADD FOR A THIRD REASON AGAIN, which is why this comment keeps growing
    // instead of being summarised: `not-completed-state.tsx`'s pair are the arms of a RUNTIME
    // conditional, so only one of them is ever an element in the document. They are counted because
    // this scan reads source, and the honest place to assert what a booker actually sees is a render —
    // `tests/booking/payment-states.test.tsx` does exactly that, and asserts ONE.
    //
    // ⚠ AND PLAN 15-07's TWO ADD FOR A FOURTH REASON, which is the simplest one this comment has had
    // to record: `(auth)/login/page.tsx` and `(auth)/forgot-password/page.tsx` each gained ONE brand
    // submit where they had an un-varianted one, so 24 → 26 is two files, two sites, one apiece. No
    // fork, no duplication, no runtime conditional — 15-CONTEXT D-162 puts coral on the primary
    // action and nowhere else, so `Continue with Google` stays outline and every link stays neutral.
    // The screens each render exactly one accent-filled element, and the forgot page's post-submit
    // branch renders ZERO because the ternary replaces the form rather than sitting beside it.
    //
    // WHY THIS NUMBER MOVES WHILE THE SCOPED 19 ABOVE DOES NOT — it is `ADOPTION_TREES` vs
    // `SCOPED_TREES`, and the pairing is the check that this is a real conversion rather than an
    // accounting slip. `(auth)` pages live under `src/app/`, which is inside the repo-wide trees and
    // outside all four scoped ones, so a change here with no change there is exactly what a Phase-15
    // auth conversion looks like. If BOTH moved, something landed in the booking/group/search trees.
    //
    // THE RED WAS WATCHED BEFORE THIS NUMBER MOVED. With both submits converted and the assertion
    // still reading 24, this gate said, verbatim:
    //
    //   FAIL  tests/design/brand-recipe.test.ts > DS-08 / D-21 — coral appears on exactly the 22
    //   buttons someone asked for it > adopts the brand variant at exactly 24 call sites across
    //   src/app and src/components
    //   AssertionError: expected 26 to be 24 // Object.is equality
    //
    // 26 → 28 IN THAT PLAN'S SECOND COMMIT, for the identical reason and with the identical shape:
    // `(auth)/signup/page.tsx` and `(auth)/reset-password/page.tsx` each gained ONE brand submit. All
    // four auth screens now carry exactly one accent-filled element apiece, and the two conditional
    // branches on those screens carry zero — the forgot page's post-submit sentence and the reset
    // page's missing-token notice both REPLACE the form rather than sitting beside it, so neither has
    // a primary action for coral to be on. The signup intent pair is NOT one of these 4: it keeps the
    // neutral control fill (D-21), which is why this number moved by exactly 4 across the two commits
    // and not by 5.
    //
    // Its red was watched the same way, with both submits converted and the assertion still at 26:
    //
    //   AssertionError: expected 28 to be 26 // Object.is equality
    //
    // THE SCOPED 19 ABOVE IS UNMOVED ACROSS BOTH COMMITS, which is the cross-check that all four
    // conversions really landed in `(auth)` and nowhere else.
    const total = Object.values(scan.adoption).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(29);
  });

  it("lands the 5 host conversions on the host surface, not somewhere convenient", () => {
    const host = Object.entries(scan.adoption)
      .filter(([file]) => file.startsWith("src/app/(host)/"))
      .reduce((sum, [, n]) => sum + n, 0);
    expect(host).toBe(5);
  });
});

describe("DS-08 / T-10-26 — the non-Button recipes are a RECORDED deliberate non-conversion, not an oversight, and an over-eager future sweep must go red here", () => {
  it("keeps exactly the 8 accent occurrences, in exactly the 6 files that are allowed to have them", () => {
    // Read this as a contract, not as a count. Each of these lines is a react-day-picker DayButton,
    // a Radix ToggleGroupItem, a bare <button>, a <Badge>, an unread dot or an <ol> step marker —
    // none of them a <Button> with a variant prop. Converting any of them breaks the availability
    // calendar or the slot picker, the two surfaces the core booking value runs through.
    //
    // If this assertion fails, the question is not "how do I make the number match". It is which
    // of the two happened: a survivor was converted (the calendar or picker is now broken), or a
    // NEW literal recipe was added (it belongs on the variant instead).
    expect(scan.survivingAccentLines).toEqual(EXPECTED_SURVIVING_ACCENT_LINES);
  });

  it("counts 8 in total — the UI-SPEC's 29 / 20 / 9 split, less the branch WR-15 merged", () => {
    // WAS 9, COUNTED AS LINES. It is 8 counted as OCCURRENCES, and the difference is not a
    // conversion: the wizard's `current` and `done` step markers were two branches emitting
    // byte-identical output, kept apart only because this assertion counted lines containing the
    // token. Nothing was converted and no surface changed — one duplicated branch collapsed into
    // the condition it should always have been. The UI-SPEC's 9 refers to the pre-merge line count.
    const total = Object.values(scan.survivingAccentLines).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(8);
    expect(Object.keys(scan.survivingAccentLines)).toHaveLength(6);
  });
});

describe("DS-08 / T-10-25 — the 90%-alpha accent is gone from src/ in EVERY form, because it measures 4.04:1 in court and 3.87:1 in grove against a 4.5 bar", () => {
  it("finds it nowhere — not hover-prefixed, not variant-prefixed, not static", () => {
    // The failure is a property of the tint, not of the <Button> element: alpha over a LIGHT
    // surface lightens, dragging a filled control toward its own text colour. So it is banned on
    // the four availability hovers and on the wizard's static done marker too, not just on buttons.
    expect(scan.bannedAlphaHovers).toEqual([]);
  });

  it("allows only the one alpha that was actually measured — the /10 soft accent", () => {
    // Widened past the single banned spelling on purpose: `/85` and `/95` are one keystroke away
    // and equally broken. Narrowed to exempt `/10`, which contrast-pairs.ts measures over both
    // background and card and which ships on the spots-left chip and the slot picker's notice.
    expect(scan.unmeasuredAlphas).toEqual([]);
  });

  it("catches a diluted accent in ANY role, not just the fill (CR-03)", () => {
    // POSITIVE CONTROL, and the reason this assertion is not the one it used to be. The pattern
    // read `bg-brand/…` and so policed the FILL alone, while the phase's whole argument is about
    // COMPOSITING — which does not care which property carries the alpha. All three shapes below
    // were shipping and all three were invisible: the first is CR-03's sub-label on the coral fill
    // at 3.38:1, the second the slot picker's anchor ring at 2.23:1, the third IN-05's border.
    for (const shape of [
      'isSelected ? "text-brand-foreground/80" : "text-muted-foreground"',
      'className="border-brand ring-2 ring-brand/50"',
      'className="hover:border-brand/30"',
      'className="hover:bg-brand/90"',
    ]) {
      expect([...shape.matchAll(UNMEASURED_ACCENT_ALPHA)], shape).not.toEqual([]);
    }

    // …and must still let the measured tint and every solid form through, or it deletes a shipped
    // affordance instead of a failing one.
    for (const legal of [
      'className="bg-brand/10 text-foreground"',
      'className="text-brand-foreground"',
      'className="ring-2 ring-brand"',
      'className="bg-brand text-brand-foreground"',
    ]) {
      expect([...legal.matchAll(UNMEASURED_ACCENT_ALPHA)], legal).toEqual([]);
    }
  });

  it("catches a diluted accent on a DIRECTIONAL edge and a PREFIXED role too (WR-08)", () => {
    // POSITIVE CONTROL for the shared role fragment. These three were verified UNMATCHED by the
    // hand-written alternation this scan used to carry — the two families `COLOUR_ROLE` was
    // introduced for, missing from the copy written two hours earlier in the same fix pass. A
    // single-side border is the ordinary way to draw a list separator, so this is authoring, not
    // exotica.
    for (const shape of [
      'className="border-b-brand/30"',
      'className="border-t-brand/40"',
      'className="divide-x-brand/50"',
      'className="ring-offset-brand/20"',
      'className="from-brand/40"',
    ]) {
      expect([...shape.matchAll(UNMEASURED_ACCENT_ALPHA)], shape).not.toEqual([]);
    }

    // …and the measured tint must still pass on those roles, or the widening deletes a shipped one.
    for (const legal of ['className="border-b-brand/10"', 'className="from-brand/10"']) {
      expect([...legal.matchAll(UNMEASURED_ACCENT_ALPHA)], legal).toEqual([]);
    }
  });

  it("catches the ARBITRARY opacity spelling as well as the numeric one (IN-06)", () => {
    // Both scans read `\/\d+` only, so the bracketed modifier walked through both. Tailwind
    // compiles the two spellings identically, so this was a pure notation escape: the same
    // dilution was caught written one way and invisible written the other.
    //
    // Measured on the real tree before the widening — `bg-accent/35` on `booking-row.tsx` failed
    // naming the file, `bg-accent/[0.35]` left all 442 tests green.
    for (const shape of [
      'className="bg-brand/[0.34]"',
      'className="ring-brand/[.5]"',
      'className="bg-brand/[34%]"',
      'className="text-brand-foreground/[0.8]"',
      // The declared `/10` tint has no arbitrary twin: the inventory is keyed on the numeric
      // spelling, so this one must be reported rather than quietly treated as the measured row.
      'className="bg-brand/[0.1]"',
    ]) {
      expect([...shape.matchAll(UNMEASURED_ACCENT_ALPHA)], shape).not.toEqual([]);
    }

    // The wider net must see the same shapes on a NON-brand token, which is the half
    // `UNMEASURED_ACCENT_ALPHA` is token-scoped away from.
    for (const [shape, key] of [
      ['className="ring-destructive/[20%]"', "destructive/[20%]"],
      ['className="bg-accent/[0.35]"', "accent/[0.35]"],
    ] as const) {
      const found = [...shape.matchAll(DILUTED_TOKEN)].map((m) => `${m[1]}/${m[2]}`);
      expect(found, shape).toContain(key);
    }

    // An arbitrary value is NOT an opacity modifier when it is the utility's own value, and
    // widening must not start reporting those — `bg-[#fff]` is the leak gate's business, not this
    // one's, and `w-[34%]` is not a colour at all.
    for (const legal of ['className="bg-[#ffffff]"', 'className="w-[34%]"', 'className="grid-cols-[1fr_2fr]"']) {
      expect([...legal.matchAll(DILUTED_TOKEN)], legal).toEqual([]);
      expect([...legal.matchAll(UNMEASURED_ACCENT_ALPHA)], legal).toEqual([]);
    }
  });

  it("pins EVERY diluted composite in the tree, not just the accent's (WR-07)", () => {
    // THE THIRD STATE, MADE VISIBLE. `contrast-pairs.ts` says a pairing is either measured or
    // exempted and that there is no third state. `border-destructive/40` was in it — shipping on
    // every host with a failed payout, measured here at 2.126:1 over `--card` in both themes
    // against a 3.0 bar — because the scan that was recorded as covering "every colour role" only
    // ever covered two TOKEN names.
    //
    // Read this as an inventory, not as a count. A shape appearing here that the map does not name
    // has never been measured by anyone; the fix is to measure it and add it with its status, not
    // to add the key.
    const seen = [...scan.dilutedTokens.keys()].sort();
    const expected = Object.keys(EXPECTED_DILUTED_TOKENS).sort();

    const undeclared = seen.filter((k) => !(k in EXPECTED_DILUTED_TOKENS));
    expect(
      undeclared,
      `diluted composites nothing has measured:\n${undeclared
        .map((k) => `  ${k} — ${[...(scan.dilutedTokens.get(k) ?? [])].join(", ")}`)
        .join("\n")}`,
    ).toEqual([]);

    // …and the other direction: a map entry for a shape that no longer ships is dead weight that
    // only makes the inventory look more complete than it is. DELETE it rather than leave it.
    expect(expected.filter((k) => !seen.includes(k)), "declared but no longer in the tree").toEqual(
      [],
    );
  });

  it("the diluted-token scan actually reaches the tree it claims to inventory (WR-07)", () => {
    // GUARD-THE-GUARD. The assertion above is an empty-list plus a set comparison, and a scan that
    // matched nothing would fail the second half loudly — but only because the map is non-empty
    // today. This pins the positive directly, and names the two shapes the finding is about.
    expect(scan.dilutedTokens.size).toBeGreaterThan(10);
    expect(
      [...(scan.dilutedTokens.get("destructive/40") ?? [])],
      "the WR-07 composite must still be found by the scan",
    ).toContain("src/components/host/payout-state-badge.tsx");
    expect([...(scan.dilutedTokens.get("foreground/60") ?? [])].sort()).toEqual([
      "src/components/booking/bookings-tabs.tsx",
      "src/components/ui/tabs.tsx",
    ]);
  });

  it("exempts the BARE decorative chip edge and nothing wearing a variant", () => {
    // Asserted in both directions, for the same reason as the ring hairline: an exemption is the
    // one place a widened gate can be quietly re-narrowed into uselessness.
    expect(DECORATIVE_ACCENT_EDGE.has("border-brand/30")).toBe(true);
    expect(DECORATIVE_ACCENT_EDGE.has("hover:border-brand/30")).toBe(false);

    // …and it must still describe something the tree actually renders. If the chip edge is ever
    // redrawn, DELETE the entry rather than leaving it standing open.
    const chip = scan.text.get("src/components/availability/spots-left-chip.tsx") ?? "";
    expect(chip).toContain("border-brand/30");
  });

  it("replaced the four availability hovers rather than deleting them", () => {
    // The failure mode this catches: a migration that removed the failing hover and stopped there
    // would satisfy both assertions above perfectly while silently dropping the hover affordance
    // from a selected day. The per-file map names which file lost it.
    expect(scan.availabilityHovers).toEqual(EXPECTED_AVAILABILITY_HOVERS);

    const total = Object.values(scan.availabilityHovers).reduce((sum, n) => sum + n, 0);
    expect(total).toBeGreaterThanOrEqual(4);
  });
});
