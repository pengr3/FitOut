// AUTHUI-03's **AA** clause — the auth surface's CROSS-ELEMENT contrast gate.
//
// WHY THIS FILE EXISTS, AND WHY `contrast.test.ts` COULD NOT BE IT. That file is a TOKEN-LAYER gate
// and says so in its own header: it measures the pairings `src/lib/design/contrast-pairs.ts`
// DECLARES, and it "cannot see a pairing a component invents". `pair-drift.test.ts` closes half of
// the remaining gap by recovering the pairings components actually WRITE — but only SAME-STRING
// ones, and it names that blind spot in its own header too: *"a `text-brand` child rendered inside a
// `bg-muted` parent is a real pairing that no string comparison can see, because the two class names
// never appear on the same element."*
//
// That blind spot is the exact shape of the composition D-162 shipped. The wordmark now sits
// directly on the layout's `bg-muted`, where the public header previously supplied its own surface;
// the `<h1>` inherits its ink from a `<Card>` three components up; the `or` divider paints
// `text-muted-foreground` on a parent and `bg-card` on the span inside it. Not one of those is a
// same-string pairing, so before this file NOTHING in the repository measured them. Phase 15's only
// contrast-adjacent verification line was 15-07's `git diff --exit-code src/lib/design/contrast-pairs.ts`
// → exit 0, which asserts that no new pairing was DECLARED. That is a negative check, not a
// measurement: it is equally green when the composition renders a pairing nobody ever measured.
//
// SO THIS FILE MEASURES THE COMPOSITION, NOT THE PALETTE. Each row below names an ink, a ground, the
// EXACT class string in the EXACT file that produces each side, and the element a person sees. Every
// row is measured in BOTH themes and must clear its WCAG bar plus `AA_EPSILON`; and every row must
// then RESOLVE to something the design system already declares — a `CONTRAST_PAIRS` row, an
// `EXCLUDED_PAIRS` row, or an `AUTH_EXEMPT` entry with a stated reason. An unlisted rendered pairing
// is the defect this gate exists for, and "we just don't measure that one" is precisely the shape
// DS-06 exists to remove.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASURED TABLE — re-derived on every run, transcribed here as of 25 August 2026.
//
// This table is the artifact AUTHUI-03's AA clause asks for. It is NOT the authority: the run is
// (D-12). If a number here and a number the gate prints ever disagree, the gate wins and this table
// is corrected — which is the whole reason it is transcribed into a file a command re-derives rather
// than into a report nobody re-runs.
//
//   ink on ground                          element                            court            grove
//   ────────────────────────────────────────────────────────────────────────────────────────────────
//   foreground / muted            the wordmark above the card   #0a0a0a on #f5f5f5 18.16   #051211 on #eaf3f2 16.89
//   foreground / muted            a footer column heading       #0a0a0a on #f5f5f5 18.16   #051211 on #eaf3f2 16.89
//   foreground / muted   (hover)  a footer link under the cursor#0a0a0a on #f5f5f5 18.16   #051211 on #eaf3f2 16.89
//   muted-foreground / muted      the footer tagline and links  #6c6c6c on #f5f5f5  4.82   #5a6665 on #eaf3f2  5.28
//   card-foreground / card        the h1 on each screen         #0a0a0a on #ffffff 19.80   #051211 on #ffffff 19.07
//   card-foreground / card        the typed value in a field    #0a0a0a on #ffffff 19.80   #051211 on #ffffff 19.07
//   muted-foreground / card       the lede under the h1         #6c6c6c on #ffffff  5.25   #5a6665 on #ffffff  5.96
//   muted-foreground / card       a field's placeholder         #6c6c6c on #ffffff  5.25   #5a6665 on #ffffff  5.96
//   muted-foreground / card       the `or` divider label        #6c6c6c on #ffffff  5.25   #5a6665 on #ffffff  5.96
//   muted-foreground / card       the cross-link line           #6c6c6c on #ffffff  5.25   #5a6665 on #ffffff  5.96
//   muted-foreground / card       reset's Suspense fallback     #6c6c6c on #ffffff  5.25   #5a6665 on #ffffff  5.96
//   muted-foreground / card       forgot's submitted notice     #6c6c6c on #ffffff  5.25   #5a6665 on #ffffff  5.96
//   destructive / card            the submit refusal line       #cd0916 on #ffffff  5.76   #cd0916 on #ffffff  5.76
//   destructive / card            reset's missing-token notice  #cd0916 on #ffffff  5.76   #cd0916 on #ffffff  5.76
//   destructive / card            a field's validation message  #cd0916 on #ffffff  5.76   #cd0916 on #ffffff  5.76
//   destructive / card            an invalid field's label      #cd0916 on #ffffff  5.76   #cd0916 on #ffffff  5.76
//   brand-foreground / brand      the coral submit              #fafafa on #da2d34  4.57   #f7fbfb on #13807c  4.57
//   brand-foreground / brand-hover the coral submit, hovered    #fafafa on #c32b37  5.41   #f7fbfb on #137470  5.36
//   primary-foreground / primary  signup's SELECTED intent      #fafafa on #171717 17.18   #f7fbfb on #0c2422 15.60
//   card-foreground / background  signup's IDLE intent          #0a0a0a on #ffffff 19.80   #051211 on #f7fcfc 18.42
//   card-foreground / accent (hv) signup's idle intent, hovered #0a0a0a on #f5f5f5 18.16   #051211 on #eaf3f2 16.89
//   card-foreground / background  the outline Google button     #0a0a0a on #ffffff 19.80   #051211 on #f7fcfc 18.42
//   ring / background   (focus)   the focus indicator           #555555 on #ffffff  7.46   #495958 on #f7fcfc  7.11
//
//   THE EXEMPT SURFACES, measured rather than skipped (see `AUTH_EXEMPT` for the argument):
//   foreground@10% / card         every card's hairline         #e7e7e7 on #ffffff  1.24   #e6e7e7 on #ffffff  1.24
//   input / background            the idle intent radio's edge  #e5e5e5 on #ffffff  1.26   #d7e2e1 on #f7fcfc  1.28
//   border / card                 the outline button + divider  #e5e5e5 on #ffffff  1.26   #d7e2e1 on #ffffff  1.32
//   primary / card                the selected radio's edge     #171717 on #ffffff 17.93   #0c2422 on #ffffff 16.27
//   brand-fg@50% / brand@50%      the in-flight submit          #fdfdfd on #ed969a  2.19   #fbfdfd on #89c0be  1.99
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE D-162 WORDMARK NUMBER — CONFIRMED, NOT CORRECTED.
//
// `src/app/(auth)/layout.tsx`'s prose cites `foreground` on `muted` at **18.16 court / 16.89 grove**.
// That figure was declared and measured in an EARLIER phase, against a different composition — the
// public header used to supply the wordmark's own surface, and D-162 moved the wordmark onto the
// layout's `bg-muted` ground. Re-measured here against the tree as it stands, the composition
// returns **18.16 / 16.89**: the layout's comment is accurate, and this run is now what keeps it
// accurate rather than the fact that somebody once checked. That is the point of re-measuring a
// cited number instead of inheriting it — a confirmation is a finding too, and an unconfirmed
// citation is indistinguishable from a stale one until somebody runs it.
//
// ZERO NEW `CONTRAST_PAIRS` ROWS WERE NEEDED, and that is the measured outcome rather than a
// convenience. Every one of the 23 rows below canonicalises onto a pairing the inventory already
// declares (the alias map derived below is what makes `card-foreground on card` and `foreground on
// card` one measurement rather than two). A row invented so this plan had something to add would be
// the INVERSE defect — a declared pairing nothing renders — and `pair-drift.test.ts` is
// one-directional and would never have caught it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE DOES NOT COVER — real blind spots, listed so the next reader under-trusts it.
//
//   • SAME-STRING pairings on these screens are `pair-drift.test.ts`'s, not this file's, and are
//     deliberately absent from the inventory below. `login/page.tsx`'s reset notice writes
//     `bg-muted` and `text-foreground` on ONE element, so a string comparison sees it; duplicating
//     it here would grow the inventory without growing the coverage. The completeness census still
//     requires both of its tokens to appear in some declared row, so removing this file's wordmark
//     row would not silently un-cover the notice's ink.
//   • THE VENDORED PRIMITIVES ARE ANCHORED, NOT CENSUSED. `ui/button.tsx`, `ui/input.tsx`,
//     `ui/form.tsx` and `ui/card.tsx` serve the whole app; a whole-file census there would report
//     variants these six documents never render. Their contribution enters only through the anchored
//     `inkFrom`/`groundFrom` of the rows that name them.
//   • This is arithmetic on compiled tokens, not a paint. Nothing here proves a browser rendered the
//     colour it computed — that is the visual-baseline suite's half, and it is a different claim.
//   • WCAG 2.x is a luminance model. Clearing a bar is a floor, not a claim that a pairing is
//     comfortable, and it says nothing about colour-blind differentiability.
//   • Every row is a SOLID pairing. The declared set below is filtered to solid inventory rows for
//     that reason: letting a `/10` tint row vouch for a solid pairing is exactly the defect WR-05
//     removed from `pair-drift.test.ts`'s key, and it must not be reintroduced here. A future auth
//     surface that ships a tint needs the opacity in this file's key BEFORE it gets a row.

import { describe, it, expect } from "vitest";

import { readThemeTokens, THEME_NAMES } from "./helpers/compile-css";
import { composite, contrast, resolveToken } from "./helpers/contrast-math";
import {
  AA_EPSILON,
  CONTRAST_PAIRS,
  EXCLUDED_PAIRS,
  NON_TEXT_BAR,
  TEXT_BAR,
  type ContrastPair,
} from "../../src/lib/design/contrast-pairs";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The files the auth composition is assembled from
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const LAYOUT = "src/app/(auth)/layout.tsx";
const LOGIN = "src/app/(auth)/login/page.tsx";
const SIGNUP = "src/app/(auth)/signup/page.tsx";
const FORGOT = "src/app/(auth)/forgot-password/page.tsx";
const RESET = "src/app/(auth)/reset-password/page.tsx";
const PANEL = "src/components/patterns/panel-card.tsx";
const FOOTER = "src/components/patterns/site-footer.tsx";
const CHROME = "src/components/patterns/site-chrome.tsx";
const CARD = "src/components/ui/card.tsx";
const BUTTON = "src/components/ui/button.tsx";
const INPUT = "src/components/ui/input.tsx";
const FORM = "src/components/ui/form.tsx";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The declared inventory of what the auth composition ACTUALLY paints
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Where one side of a pairing comes from: the EXACT class string, in the EXACT file that writes it.
 *
 * `classString` is asserted to still exist as a string literal or a template chunk in `file` — see
 * the anchor block below. That is what stops a row outliving the markup it describes, which is the
 * only way a green run here could be about a surface that no longer exists.
 */
type Anchor = {
  readonly file: string;
  readonly classString: string;
};

/**
 * The state a pairing renders in, and it is PART OF THE ROW'S IDENTITY rather than a label: a hover
 * ink over a hover ground is a different measurement from the resting pair, and collapsing the two
 * is how a hover that fails ships behind a rest that passes. That is not hypothetical — the brand
 * button's rejected 90%-alpha hover measured 4.04 against a rest of 4.57.
 */
type PairState = "rest" | "hover" | "focus-visible" | "in-flight";

type InkOnGround = {
  /** Token name in `contrast-pairs.ts`'s spelling — no leading `--`. */
  readonly ink: string;
  /** Token name or `DERIVED_SURFACES` key, same spelling. */
  readonly ground: string;
  readonly bar: number;
  readonly state: PairState;
  readonly inkFrom: Anchor;
  readonly groundFrom: Anchor;
  /**
   * The ink is INHERITED rather than declared on the element. `inkFrom.classString` is then the
   * class the inheritance passes THROUGH, and the note must say where the colour actually comes
   * from and what would break the inheritance.
   */
  readonly inherited?: true;
  /** The element a person sees, in the words a person would use. */
  readonly where: string;
  readonly note: string;
};

/**
 * THE COMPOSITION, ROW BY ROW. Walked from the four pages, the layout, `PanelCard`, `ui/card` and
 * `SiteFooter` on 25 August 2026 — not copied from a spec.
 */
const AUTH_INK_ON_GROUND: readonly InkOnGround[] = [
  // ── GROUND A: `muted` — the layout's page ground and the footer's block ────────────────────────
  {
    ink: "foreground",
    ground: "muted",
    bar: TEXT_BAR,
    state: "rest",
    inherited: true,
    inkFrom: { file: CHROME, classString: "text-lg font-semibold tracking-tight" },
    groundFrom: {
      file: LAYOUT,
      classString: "flex flex-1 flex-col items-center justify-center bg-muted px-4 py-12",
    },
    where: "the wordmark above the card",
    note:
      "THE D-162 PAIRING, and the reason this file exists. The wordmark reads the chrome's class " +
      "constant, which carries NO colour utility, so its ink is `foreground` inherited from " +
      "globals.css's `body` rule — and the ground is the layout's own `bg-muted`, not a surface the " +
      "header used to supply. Two class names on two elements in two files: invisible to every " +
      "same-string check in the suite. If someone gives the wordmark a colour utility the premise " +
      "assertion below fails first, which is the correct order — this row would then be measuring " +
      "the wrong ink.",
  },
  {
    ink: "foreground",
    ground: "muted",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: FOOTER, classString: "text-sm font-medium text-foreground" },
    groundFrom: { file: FOOTER, classString: "mt-auto border-t bg-muted print:hidden" },
    where: "a footer column heading, and the footer's own wordmark link",
    note:
      "The footer is the SECOND ground painted with the same token, and the auth surface keeps it " +
      "unmodified (SHELL-02): /terms and /privacy stay reachable from the page where someone is " +
      "asked to create an account. Cross-element in the same file — the heading class is a module " +
      "constant and the fill is on the `<footer>` root.",
  },
  {
    ink: "muted-foreground",
    ground: "muted",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: FOOTER, classString: "text-sm text-muted-foreground" },
    groundFrom: { file: FOOTER, classString: "mt-auto border-t bg-muted print:hidden" },
    where: "the footer tagline and every footer link label at rest",
    note:
      "THE TIGHTEST PAIRING ON THE WHOLE AUTH SURFACE — 4.82 court against a 4.55 requirement, so " +
      "0.27 of headroom against two tokens that are both free to move. It is the pairing that " +
      "forced --muted-foreground to darken in phase 10 and it is the one a future tint change " +
      "would break first, which is why it gets its own row rather than being waved through on the " +
      "heading's 18:1.",
  },
  {
    ink: "foreground",
    ground: "muted",
    bar: TEXT_BAR,
    state: "hover",
    inkFrom: {
      file: FOOTER,
      classString: "underline-offset-4 hover:underline hover:text-foreground",
    },
    groundFrom: { file: FOOTER, classString: "mt-auto border-t bg-muted print:hidden" },
    where: "a footer link under the cursor",
    note:
      "A hover that changes only the INK, over a ground that does not move. Declared separately " +
      "from the resting row because a state is a different measurement, and because the direction " +
      "matters: this hover DARKENS the ink, which is the safe direction, and a future restyle that " +
      "lightened it instead would be caught here and nowhere else.",
  },

  // ── GROUND B: `card` — `ui/card.tsx`'s root, composed by `PanelCard` ───────────────────────────
  {
    ink: "card-foreground",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inherited: true,
    inkFrom: { file: PANEL, classString: "text-heading" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "the h1 on each of the four screens",
    note:
      "`text-heading` is a TYPE role and carries no colour, so the heading's ink is " +
      "`card-foreground` inherited from the Card root three components up — a cross-element, " +
      "cross-file pairing. The ground is `bg-card` and never the `tone === 'muted'` branch, which " +
      "is a premise asserted from the four call sites rather than assumed from the pattern's " +
      "default.",
  },
  {
    ink: "card-foreground",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inherited: true,
    inkFrom: { file: INPUT, classString: "bg-transparent" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "the value a person types into an email or password field",
    note:
      "THE FIELD DECLARES NO FILL AND NO INK. `bg-transparent` means the surface behind the input " +
      "IS the card, and the typed text inherits `card-foreground` through it — so the pairing a " +
      "person reads while typing their password is composed of two tokens neither of which the " +
      "input names. Give the input a fill and this row is measuring a surface that is no longer " +
      "there; the anchor is what says so.",
  },
  {
    ink: "muted-foreground",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: PANEL, classString: "text-sm text-muted-foreground" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "the lede under the h1",
    note:
      "The pattern writes the ink and the vendored primitive writes the ground, two files apart. " +
      "Two of the four ledes are load-bearing beyond tone — the reset screens' wording is what " +
      "keeps the flow from confirming whether an address has an account — so this is copy a person " +
      "genuinely has to be able to read, not decoration.",
  },
  {
    ink: "muted-foreground",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: INPUT, classString: "placeholder:text-muted-foreground" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "the placeholder inside an email or password field",
    note:
      "A variant-scoped ink on a transparent element over the card. A placeholder is the only " +
      "instruction some fields carry ('At least 10 characters' is the password rule on the reset " +
      "screen), so it is content rather than chrome and it takes the 4.5 bar.",
  },
  {
    ink: "muted-foreground",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: LOGIN, classString: "relative text-center text-xs text-muted-foreground" },
    groundFrom: { file: LOGIN, classString: "bg-card px-2" },
    where: "the `or` label between the submit and the Google button",
    note:
      "A CROSS-ELEMENT PAIR INSIDE A CROSS-ELEMENT PAIR: the ink is on the wrapper `<div>` and the " +
      "ground is re-declared on the `<span>` inside it, specifically so the label knocks a hole in " +
      "the rule that passes behind it. The span's `bg-card` is a re-statement of the surface it " +
      "already sits on, which is why it looks redundant and is not — remove it and the label sits " +
      "on the divider line.",
  },
  {
    ink: "muted-foreground",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inherited: true,
    inkFrom: { file: LOGIN, classString: "font-medium underline" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "the cross-link at the foot of each card (`Create an account`, `Log in`, `Back to log in`)",
    note:
      "THE INK IS INHERITED FROM THE PARAGRAPH, NOT FROM THE BODY — this is the one inherited row " +
      "whose source is neither the body rule nor the card. The link declares weight and underline " +
      "only; the enclosing `<p className=\"text-center text-sm text-muted-foreground\">` supplies " +
      "the colour, so a link that looks like a link is painted in the SECONDARY ink. That is the " +
      "route out of a failed login on three of the four screens, which is why it is measured " +
      "rather than assumed to be a link colour.",
  },
  {
    ink: "muted-foreground",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: RESET, classString: "text-sm text-muted-foreground" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "reset-password's Suspense fallback while the token is read",
    note:
      "A DESIGNED STATE, and 15-UI-SPEC's five hard gates require designed states to be designed " +
      "rather than absent: one muted line, no spinner, no layout shift. A loading line nobody can " +
      "read is the same defect as a loading line nobody drew.",
  },
  {
    ink: "muted-foreground",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: FORGOT, classString: "text-sm text-muted-foreground" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "forgot-password's post-submit notice, which replaces the whole form",
    note:
      "THE ONLY THING LEFT ON THE SCREEN after a reset request, and it is the sentence that keeps " +
      "the flow from confirming whether an address has an account (T-03-02). A person who cannot " +
      "read it cannot tell whether their request was taken, and the branch renders no other " +
      "content at all — it replaces the form rather than sitting beside it.",
  },
  {
    ink: "destructive",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: LOGIN, classString: "text-sm text-destructive" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "the submit refusal line — why a login or a signup was rejected",
    note:
      "The one sentence that tells a person why they cannot get in. It is also an announced region " +
      "(role=alert), so a screen-reader user gets it regardless — which makes this row about the " +
      "sighted half of the same guarantee, not a duplicate of it.",
  },
  {
    ink: "destructive",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: RESET, classString: "text-sm text-destructive" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "reset-password's missing-token notice",
    note:
      "A SEPARATE ROW FROM THE REFUSAL LINE ABOVE even though the pairing measures the same, " +
      "because it is a separate anchor in a separate file with a separate failure mode: this one " +
      "renders for a malformed URL and carries the only route forward (`Request a new link`). " +
      "Collapsing the two rows would mean deleting one page's markup silently stops covering it.",
  },
  {
    ink: "destructive",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: FORM, classString: "text-destructive text-sm" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "a field's validation message — 'At least 10 characters', a malformed email",
    note:
      "The per-field half of the refusal above, written by the vendored form primitive. Note the " +
      "class order differs from the pages' (`text-destructive text-sm` rather than " +
      "`text-sm text-destructive`), which is exactly why the anchor is a parsed literal rather " +
      "than a grep for a canonical spelling.",
  },
  {
    ink: "destructive",
    ground: "card",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: FORM, classString: "data-[error=true]:text-destructive" },
    groundFrom: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    where: "an invalid field's LABEL, which turns red alongside its message",
    note:
      "A DATA-ATTRIBUTE-SCOPED INK, and it is at REST when it applies — no pointer, no focus, no " +
      "in-flight submit. The state is a property of the FIELD, not of the pairing. It is declared " +
      "because it is the one restyle that repaints a label a person is reading, and because a " +
      "variant-scoped colour is the shape a naive scan classifies as a utility named " +
      "`data-[error=true]:text-destructive` rather than as an ink.",
  },

  // ── GROUND C: `brand` — the one coral submit per screen ────────────────────────────────────────
  {
    ink: "brand-foreground",
    ground: "brand",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: {
      file: BUTTON,
      classString:
        "bg-brand text-brand-foreground hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]",
    },
    groundFrom: {
      file: BUTTON,
      classString:
        "bg-brand text-brand-foreground hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]",
    },
    where: "the coral submit — `Log in`, `Sign up to book`, `Send reset link`, `Set new password`",
    note:
      "THE TIGHTEST DECLARED PAIRING IN THE SYSTEM at 4.57 against a 4.55 requirement, and the one " +
      "that forced --brand to darken (the shipped coral measured 3.60). It is same-string in the " +
      "variant, so `pair-drift.test.ts` sees it too — it is carried here anyway because it is the " +
      "primary action on all four screens and because the hover row below only makes sense beside " +
      "its rest.",
  },
  {
    ink: "brand-foreground",
    ground: "brand-hover",
    bar: TEXT_BAR,
    state: "hover",
    inkFrom: {
      file: BUTTON,
      classString:
        "bg-brand text-brand-foreground hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]",
    },
    groundFrom: {
      file: BUTTON,
      classString:
        "bg-brand text-brand-foreground hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]",
    },
    where: "the coral submit under the cursor",
    note:
      "The ground is a `color-mix` and not a token, resolved through DERIVED_SURFACES. The recipe " +
      "DARKENS toward --foreground precisely because the obvious hover — a 90%-alpha tint — " +
      "LIGHTENS over a light surface and measures 4.04/3.87, under the bar. A hover state is a " +
      "rendered pairing, and it is the one no document measured before phase 10.",
  },

  // ── GROUND D: `primary` — signup's SELECTED intent radio ───────────────────────────────────────
  {
    ink: "primary-foreground",
    ground: "primary",
    bar: TEXT_BAR,
    state: "rest",
    inkFrom: { file: SIGNUP, classString: "border-primary bg-primary text-primary-foreground" },
    groundFrom: { file: SIGNUP, classString: "border-primary bg-primary text-primary-foreground" },
    where: "signup's SELECTED `Book a space` / `Host a space` control",
    note:
      "D-21's neutral control fill, byte-frozen by 15-07: a selected intent is a choice the person " +
      "made, not the action the page is asking for, so it is never painted with the accent. " +
      "Same-string, so `pair-drift` sees it — carried here because the IDLE branch beside it is " +
      "NOT same-string and the pair only reads as a pair with both branches present.",
  },

  // ── GROUND E: `background` — signup's IDLE intent radio, and the outline button ────────────────
  {
    ink: "card-foreground",
    ground: "background",
    bar: TEXT_BAR,
    state: "rest",
    inherited: true,
    inkFrom: {
      file: SIGNUP,
      classString: "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
    },
    groundFrom: { file: SIGNUP, classString: "border-input bg-background hover:bg-accent" },
    where: "signup's IDLE intent control — the one the person has not chosen",
    note:
      "THE IDLE BRANCH DECLARES A FILL AND NO INK, so the label is `card-foreground` inherited " +
      "from the Card while the fill is `background` — two different tokens from two different " +
      "elements, and in grove they are two genuinely different colours (#ffffff card against " +
      "#f7fcfc page). The base class chunk and the idle branch are separate strings in the same " +
      "template, which is precisely why no same-string check pairs them.",
  },
  {
    ink: "card-foreground",
    ground: "accent",
    bar: TEXT_BAR,
    state: "hover",
    inherited: true,
    inkFrom: {
      file: SIGNUP,
      classString: "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
    },
    groundFrom: { file: SIGNUP, classString: "border-input bg-background hover:bg-accent" },
    where: "signup's idle intent control under the cursor",
    note:
      "The hover changes only the GROUND, so the inherited ink stays. `accent` holds the same value " +
      "as `muted` in both themes today, which the derived alias map below discovers rather than " +
      "assumes — a future theme that pulls the two apart splits the group automatically and this " +
      "row starts being measured on its own.",
  },
  {
    ink: "card-foreground",
    ground: "background",
    bar: TEXT_BAR,
    state: "rest",
    inherited: true,
    inkFrom: { file: BUTTON, classString: "border-border bg-background hover:bg-muted hover:text-foreground" },
    groundFrom: { file: BUTTON, classString: "border-border bg-background hover:bg-muted hover:text-foreground" },
    where: "the `Continue with Google` button on login and signup",
    note:
      "The outline variant declares a FILL and no resting ink, so its label is inherited from the " +
      "card exactly like the idle intent radio. It stays outline on purpose (D-162: coral on the " +
      "primary action only) — a second accent-filled control would make one screen ask twice.",
  },

  // ── THE FOCUS INDICATOR ────────────────────────────────────────────────────────────────────────
  {
    ink: "ring",
    ground: "background",
    bar: NON_TEXT_BAR,
    state: "focus-visible",
    inkFrom: {
      file: BUTTON,
      classString:
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    },
    groundFrom: {
      file: BUTTON,
      classString:
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    },
    where: "the focus indicator on any control inside the card",
    note:
      "THE GROUND IS `background` AND NOT `card`, and that is the offset band's whole purpose: " +
      "`ring-offset-background` paints a 2px page-coloured band between the control and the ring, " +
      "so the indicator has a verified surface on both sides no matter what the control sits on. " +
      "Measuring this as ring-on-card would be measuring a stack that does not render — the same " +
      "class of error that let the focus ring ship at 2.58 as a token pair and 1.54 as rendered. " +
      "The wordmark is deliberately NOT covered by this row: it overrides nothing and keeps the " +
      "browser default indicator, which `e2e/auth-keyboard.spec.ts` measures in a real engine.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// What the auth surface renders and this file deliberately does NOT measure
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * An exemption is a DECISION; a silent skip is the defect DS-06 exists to remove.
 *
 * Each entry names the utility as written, where it is written, and the reason it is legal unmeasured
 * — and where the design system already carries that reason as data, it points at the
 * `EXCLUDED_PAIRS` row rather than restating it.
 */
type Exempt = {
  /** The utility exactly as the class string writes it, minus any variant chain. */
  readonly utility: string;
  readonly from: Anchor;
  readonly state: PairState;
  /** The `EXCLUDED_PAIRS` row that already carries this reason, when one exists. */
  readonly excluded?: { readonly fg: string; readonly bg: string };
  /**
   * The pairing this entry exempts, when the exemption is about a PAIR rather than about a single
   * utility. An auth row whose pair resolves here is exempt; one that resolves nowhere is the defect.
   */
  readonly pair?: { readonly ink: string; readonly ground: string };
  readonly reason: string;
};

const AUTH_EXEMPT: readonly Exempt[] = [
  {
    utility: "ring-foreground/10",
    from: {
      file: CARD,
      classString: "bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
    },
    state: "rest",
    excluded: { fg: "foreground-10", bg: "card" },
    reason:
      "THE HAIRLINE ON EVERY CARD IN THE APP, and therefore on all four auth cards — 1.24 in both " +
      "themes. A decorative container edge, never a control's sole visible boundary and never a " +
      "focus indicator (that is --ring, measured above at the 3.0 bar). Already carried as data by " +
      "the design system, which is why this entry points at the row instead of re-arguing it.",
  },
  {
    utility: "border-input",
    from: { file: SIGNUP, classString: "border-input bg-background hover:bg-accent" },
    state: "rest",
    excluded: { fg: "input", bg: "background" },
    reason:
      "THE IDLE INTENT RADIO'S EDGE — 1.26 (court) / 1.28 (grove) against the page, 1.26 / 1.32 " +
      "against the card behind it. Legal for the reason --input is already excluded: a decorative " +
      "divider, never a control's sole visible boundary. THE COMPENSATING REQUIREMENT is what makes " +
      "that an argument rather than a shrug here, because this edge IS on a control: the selected " +
      "state is signalled by a FILL CHANGE (background → primary) carrying inverted ink at 17.18 / " +
      "15.60, and by `aria-checked` on a `role=radio`, never by the border. A restyle that moved " +
      "the selection signal into the edge would need this exemption re-argued.",
  },
  {
    utility: "border-border",
    from: {
      file: BUTTON,
      classString: "border-border bg-background hover:bg-muted hover:text-foreground",
    },
    state: "rest",
    excluded: { fg: "border", bg: "background" },
    reason:
      "THE OUTLINE BUTTON'S EDGE and the `or` divider's rule — 1.26 / 1.32 on the card. The same " +
      "decorative-divider class as --input above, already excluded as data. The `Continue with " +
      "Google` control does not depend on its edge to be found: it is a `<button>` with a label, " +
      "and its focus indicator is the measured --ring.",
  },
  {
    utility: "border-primary",
    from: { file: SIGNUP, classString: "border-primary bg-primary text-primary-foreground" },
    state: "rest",
    pair: { ink: "primary", ground: "card" },
    reason:
      "THE SELECTED INTENT RADIO'S EDGE — 17.93 (court) / 16.27 (grove), which CLEARS every bar it " +
      "could be held to and is exempt anyway, deliberately. `pair-drift.test.ts` classifies " +
      "`border-*` as the `edge` role and mints no pairing from it (IN-10), so consuming edges as " +
      "inks is a design pass the whole repository has not taken. Declaring this one pair here " +
      "rather than adding a --primary/card row to the shared inventory keeps that decision in one " +
      "place; the number is recorded so the exemption is measured rather than assumed.",
  },
  {
    utility: "disabled:opacity-50",
    from: { file: BUTTON, classString: "disabled:opacity-50" },
    state: "in-flight",
    pair: { ink: "brand-foreground", ground: "brand" },
    reason:
      "THE IN-FLIGHT SUBMIT. `disabled` is set from `form.formState.isSubmitting` on all four " +
      "screens, and element opacity composites the WHOLE control — fill and label together — so " +
      "the pairing a person sees mid-submit measures 2.19 (court) / 1.99 (grove), well under the " +
      "text bar. WCAG 2.2 SC 1.4.3 exempts INACTIVE user-interface components explicitly, and this " +
      "control is inactive for as long as the dimming lasts. STATED RATHER THAN SKIPPED because " +
      "the exemption is conditional on the dimming being tied to genuine inactivity: a decorative " +
      "`opacity-50` on an ENABLED control would be a real 1.4.3 failure wearing this row's clothes. " +
      "The in-flight label change ('Logging in…', 'Sending…') is the other half of the signal.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The alias map — derived from token VALUES, never typed
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const themes = readThemeTokens();

/**
 * A token is a COLOUR token when its value is a single `oklch()` call and nothing else — the same
 * rule `pair-drift.test.ts` and `scripts/generate-design-tokens.mjs` apply, restated rather than
 * imported because it is three lines and importing it from a `.test.ts` file is the shape this plan
 * just finished removing.
 */
const SINGLE_OKLCH = /^oklch\([^()]*\)$/;

const COLOUR_TOKENS: readonly string[] = Object.keys(themes[THEME_NAMES[0]])
  .filter((name) => THEME_NAMES.every((theme: string) => SINGLE_OKLCH.test(themes[theme][name] ?? "")))
  .map((name) => name.replace(/^--/, ""));

/**
 * Two tokens holding the SAME VALUE IN BOTH THEMES are the same colour, so a pairing written with
 * one is the same measurement as the same pairing written with the other. DERIVED from the compiled
 * values, never typed: a future theme that pulls `--accent` away from `--muted` splits the group
 * automatically instead of leaving a hand-written list quietly wrong. Today's groups are
 * {secondary, muted, accent}, {card, popover} and {foreground, card-foreground, popover-foreground},
 * and the assertion below pins that they are still derived rather than collapsed to everything.
 */
const ALIAS_OF = new Map<string, string>();
{
  const byValue = new Map<string, string[]>();
  for (const token of COLOUR_TOKENS) {
    const key = THEME_NAMES.map((theme: string) => themes[theme][`--${token}`]).join("||");
    const bucket = byValue.get(key);
    if (bucket === undefined) byValue.set(key, [token]);
    else bucket.push(token);
  }
  for (const members of byValue.values()) {
    const representative = [...members].sort()[0];
    for (const member of members) ALIAS_OF.set(member, representative);
  }
}

const canonical = (token: string): string => ALIAS_OF.get(token) ?? token;

const pairKey = (ink: string, ground: string): string =>
  `${canonical(ink)} on ${canonical(ground)}`;

/**
 * Every SOLID pairing the design system declares legal, canonicalised.
 *
 * FILTERED TO SOLID ROWS ON PURPOSE. Every row in this file is a solid pairing, and letting an
 * alpha-composited inventory row (`destructive/10 over card`) vouch for a solid one is exactly the
 * defect WR-05 removed from `pair-drift.test.ts`'s lookup key: the exemption and the violation
 * become the same string. If an auth surface ever ships a tint, the opacity has to enter this
 * file's key BEFORE the row is written, not after.
 */
const DECLARED_SOLID = new Set(
  (CONTRAST_PAIRS as readonly ContrastPair[])
    .filter((pair) => pair.alpha === undefined && pair.fgAlpha === undefined)
    .map((pair) => pairKey(pair.fg, pair.bg)),
);

/** Every pairing the design system declares FAILING-BUT-LEGAL, canonicalised the same way. */
const EXCLUDED_KEYS = new Set(EXCLUDED_PAIRS.map((entry) => pairKey(entry.fg, entry.bg)));

/** Every pairing THIS file exempts with a stated reason. */
const EXEMPT_KEYS = new Set(
  AUTH_EXEMPT.filter((entry) => entry.pair !== undefined).map((entry) =>
    pairKey(entry.pair!.ink, entry.pair!.ground),
  ),
);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The measurement, run identically for both themes
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe.each(THEME_NAMES)("the auth composition in %s", (theme: string) => {
  const tokens = themes[theme];
  const resolve = (name: string): string => resolveToken(tokens, name, theme);

  it.each<InkOnGround>([...AUTH_INK_ON_GROUND])(
    "$ink on $ground ($state) clears $bar + epsilon — $where",
    ({ ink, ground, bar, state, where, note, inherited }) => {
      const inkHex = resolve(ink);
      const groundHex = resolve(ground);
      const measured = contrast(inkHex, groundHex);
      const how = inherited === true ? " (ink INHERITED)" : "";
      expect(
        measured,
        `[${theme}] ${where}${how}: ${ink} (${inkHex}) on ${ground} (${groundHex}) in the ` +
          `${state} state measured ${measured.toFixed(2)}, needs ${(bar + AA_EPSILON).toFixed(2)} — ${note}`,
      ).toBeGreaterThanOrEqual(bar + AA_EPSILON);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Every measured pair must RESOLVE to something declared
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("every pairing the auth composition renders is declared somewhere", () => {
  it.each<InkOnGround>([...AUTH_INK_ON_GROUND])(
    "$ink on $ground ($state) resolves to a declared row — $where",
    ({ ink, ground, where, state }) => {
      const key = pairKey(ink, ground);
      const home =
        (DECLARED_SOLID.has(key) ? "CONTRAST_PAIRS" : null) ??
        (EXCLUDED_KEYS.has(key) ? "EXCLUDED_PAIRS" : null) ??
        (EXEMPT_KEYS.has(key) ? "AUTH_EXEMPT" : null);
      expect(
        home,
        `[${where}] the ${state} pairing "${ink} on ${ground}" canonicalises to "${key}", which ` +
          "appears in NONE of the three lists it must join. A rendered pairing that is in no list " +
          "is the exact defect this gate exists for: it is not measured by the token-layer gate " +
          "(which only measures what is declared) and it is not seen by the drift check (which " +
          "only sees same-string pairings). The honest fixes, in order: add a CONTRAST_PAIRS row " +
          "with a real note and raise that file's floor in the SAME commit; or, if it cannot clear " +
          "its bar and is legal anyway, add an EXCLUDED_PAIRS row with the compensating " +
          "requirement written out; or, if it is an edge or an inactive control, add an " +
          "AUTH_EXEMPT entry here carrying `pair`. Deleting the row is not one of them.",
      ).not.toBeNull();
    },
  );

  it("does not let an alpha-composited row vouch for a solid pairing", () => {
    // WR-05's lesson, pinned rather than trusted: the declared set this file matches against is
    // filtered to SOLID rows, so a `/10` tint measured over one surface cannot legalise the solid
    // form of the same tokens. Both numbers are floors — the inventory is free to grow.
    const solid = (CONTRAST_PAIRS as readonly ContrastPair[]).filter(
      (pair) => pair.alpha === undefined && pair.fgAlpha === undefined,
    );
    expect(solid.length).toBeLessThan(CONTRAST_PAIRS.length);
    expect(DECLARED_SOLID.size).toBeLessThanOrEqual(solid.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The alias map is derived, and it discriminates
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("the alias map", () => {
  it("derives today's groups from values rather than from a typed list", () => {
    expect(canonical("card-foreground")).toBe(canonical("foreground"));
    expect(canonical("muted")).toBe(canonical("accent"));
    expect(canonical("card")).toBe(canonical("popover"));
  });

  it("keeps genuinely different colours apart", () => {
    // Without this control the map would be a way of making every pairing look declared: a
    // canonicaliser that collapsed everything onto one representative would satisfy every lookup
    // above and measure nothing.
    expect(canonical("foreground")).not.toBe(canonical("muted-foreground"));
    expect(canonical("brand")).not.toBe(canonical("muted"));
    expect(canonical("card")).not.toBe(canonical("background"));
  });

  it("reads a real colour vocabulary out of the stylesheet", () => {
    expect(COLOUR_TOKENS.length).toBeGreaterThanOrEqual(20);
    expect(COLOUR_TOKENS).toContain("brand");
    expect(COLOUR_TOKENS).toContain("muted-foreground");
    // The filter is doing work: type, radius and elevation values are NOT colours.
    expect(COLOUR_TOKENS).not.toContain("radius");
    expect(COLOUR_TOKENS).not.toContain("elevation-raised");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The inventory's own shape
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("the declared inventory says enough to be checkable", () => {
  it.each<InkOnGround>([...AUTH_INK_ON_GROUND])(
    "$ink on $ground ($state) names its element and its reason — $where",
    (row) => {
      expect(row.where.length, `${row.ink} on ${row.ground}`).toBeGreaterThan(10);
      expect(row.note.length, `${row.ink} on ${row.ground}`).toBeGreaterThan(20);
      expect(row.inkFrom.classString.length).toBeGreaterThan(0);
      expect(row.groundFrom.classString.length).toBeGreaterThan(0);
      expect([TEXT_BAR, NON_TEXT_BAR]).toContain(row.bar);
    },
  );

  it.each<Exempt>([...AUTH_EXEMPT])("$utility is exempt with a stated reason", (entry) => {
    expect(entry.reason.length, entry.utility).toBeGreaterThan(20);
    expect(entry.from.classString).toContain(entry.utility.split(":").pop());
    if (entry.excluded !== undefined) {
      // A pointer at a row that does not exist is worse than no pointer: it reads as an argument
      // somebody made and nobody can find.
      expect(
        EXCLUDED_PAIRS.some(
          (row) => row.fg === entry.excluded!.fg && row.bg === entry.excluded!.bg,
        ),
        `${entry.utility} points at EXCLUDED_PAIRS row ${entry.excluded.fg}/${entry.excluded.bg}, which is not there`,
      ).toBe(true);
    }
  });

  it("covers every ground the composition paints and both bars", () => {
    // A floor on the SHAPE of the inventory rather than on its length: if the card ground or the
    // muted ground ever vanished from this list, the rows measuring them went with it.
    const grounds = new Set(AUTH_INK_ON_GROUND.map((row) => canonical(row.ground)));
    for (const ground of ["muted", "card", "brand", "primary", "background"]) {
      expect(grounds, `the composition paints ${ground} and no row measures it`).toContain(
        canonical(ground),
      );
    }
    const states = new Set(AUTH_INK_ON_GROUND.map((row) => row.state));
    expect(states).toContain("rest");
    expect(states).toContain("hover");
    expect(states).toContain("focus-visible");
    expect(AUTH_INK_ON_GROUND.some((row) => row.bar === NON_TEXT_BAR)).toBe(true);
    expect(AUTH_INK_ON_GROUND.some((row) => row.inherited === true)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Guard the guard — the measuring path can actually fail
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard", () => {
  it("measures at least 20 rows in both themes", () => {
    // Every assertion above is "a list of things that all passed", and an empty list passes all of
    // them. 23 rows when this file was written; the floor is set just below and moves WITH the
    // inventory, never ahead of it.
    expect(AUTH_INK_ON_GROUND.length).toBeGreaterThanOrEqual(20);
    expect(AUTH_EXEMPT.length).toBeGreaterThanOrEqual(3);
    expect(THEME_NAMES.length).toBeGreaterThanOrEqual(2);
  });

  it("has a measuring path that can actually fail", () => {
    // Positive control, on a REAL failing pair rather than a synthetic one: the skeleton fill
    // EXCLUDED_PAIRS records at 1.09, measured through the same functions and the same token map
    // every assertion above uses. If this ever clears the text bar, the arithmetic is wrong and
    // every green row above is vacuous.
    for (const theme of THEME_NAMES as string[]) {
      const fill = resolveToken(themes[theme], "muted", theme);
      const card = resolveToken(themes[theme], "card", theme);
      expect(contrast(fill, card), `${theme}: muted on card`).toBeLessThan(TEXT_BAR);
    }
    // …and the in-flight exemption's number is real too: compositing the whole control at 50%
    // drops the coral submit under the bar, which is why it is exempt rather than measured.
    const tokens = themes[THEME_NAMES[0]];
    const label = composite(resolveToken(tokens, "brand-foreground", "court"), 0.5, resolveToken(tokens, "card", "court"));
    const fill = composite(resolveToken(tokens, "brand", "court"), 0.5, resolveToken(tokens, "card", "court"));
    expect(contrast(label, fill)).toBeLessThan(TEXT_BAR);
  });

  it("resolves an unknown token by throwing rather than by defaulting", () => {
    // The resolver's contract, exercised here because every row above depends on it: a row naming a
    // token nothing declares must fail loudly. A resolver that returned a default would turn a
    // typo'd row into a permanent silent pass, measuring a colour the app never paints.
    expect(() => resolveToken(themes[THEME_NAMES[0]], "not-a-token", "court")).toThrow(
      /--not-a-token/,
    );
  });
});
