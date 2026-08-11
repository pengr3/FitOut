// THE declared inventory of legal foreground/background pairings (DS-06 / D-13) — the single source
// of truth for what the design system claims is readable, and the only list `tests/design/contrast.test.ts`
// measures.
//
// WHY AN INVENTORY AT ALL. "All our colours pass AA" is not a checkable claim: contrast is a
// property of a PAIR, and the set of pairs a UI actually renders is a design decision, not something
// derivable from a palette. Measuring the cross product would be both wrong (it includes pairings no
// surface uses) and useless (it fails on pairings nobody cares about). So the legal pairings are
// declared here, by hand, and every one is measured in BOTH themes.
//
// WHY THIS MODULE LIVES AT `src/lib/design/`. The leak gate scans `src/app/**` and
// `src/components/**` only (see `config/design-leak-patterns.mjs` → LEAK_SCAN_PREFIXES). This file
// necessarily names tokens and bars, and a future edit may want a literal; keeping it outside the
// scanned tree means it can be honest without needing a per-line exemption.
//
// THE ALPHA FIELD IS THE POINT (T-10-10). A row like `text-destructive` on `bg-destructive/10` is
// NOT the raw `destructive`/`destructive` pair — the rendered background is the tint composited over
// whatever surface it sits on. Asserting the raw pair is exactly the mistake that let the focus ring
// ship measuring 2.58 as a token pair and 1.54 as actually rendered. Rows that need compositing
// carry `alpha`, and the test composites BEFORE measuring.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • A CROSS-ELEMENT pairing is invisible to the same-string drift check that reads this file
//     (`tests/design/pair-drift.test.ts`). A `text-brand` child rendered inside a `bg-muted` parent
//     is a real pairing that no string comparison can see, because the two class names never appear
//     on the same element. That class of defect is covered instead by Phase 17's two-theme axe
//     pass, on the rendered DOM.
//   • This is an inventory of pairings the system DECLARES legal. Nothing here proves a component
//     actually uses one of them — a surface can still hand-roll an undeclared pairing, and only the
//     leak gate plus the drift check push back on that.
//   • Every ratio is WCAG 2.x, which is a luminance model with known weaknesses at low lightness and
//     for large text. Clearing the bar is a floor, not a claim of good typography.
//   • `--border` / `--input` are NOT in the inventory. They are in `EXCLUDED_PAIRS` with a reason,
//     which is deliberate: an inventory that silently omits a failing pair is the exact shape of the
//     defect DS-06 exists to remove.

// ---------------------------------------------------------------------------
// Bars and the epsilon
// ---------------------------------------------------------------------------

/**
 * D-12: every declared pair must clear its bar PLUS this margin, not merely reach it.
 *
 * A 0.02 margin flips to a failure if `--brand-foreground` moves a hair, if a browser rounds an
 * OKLCH→sRGB conversion a bit differently, or if a future token edit shifts a surface by one 8-bit
 * step. 0.05 is small enough to cost nothing in colour choice and large enough that a green run
 * today is still green after an unrelated edit tomorrow. Both the brand and the destructive
 * derivations were re-solved specifically because their first candidates landed inside this margin.
 */
export const AA_EPSILON = 0.05;

/** WCAG 2.2 SC 1.4.3 — normal-size text. */
export const TEXT_BAR = 4.5;

/** WCAG 2.2 SC 1.4.11 — non-text contrast: icons, glyphs, focus indicators, meaningful graphics. */
export const NON_TEXT_BAR = 3.0;

// ---------------------------------------------------------------------------
// Derived surfaces — colours a pair can sit on that are not themselves tokens
// ---------------------------------------------------------------------------

/**
 * Surfaces produced by `color-mix()` rather than declared as a token, keyed by the pseudo-token name
 * a `CONTRAST_PAIRS` row uses for them.
 *
 * The brand hover recipe is `color-mix(in oklch, var(--brand), var(--foreground) 10%)`. It exists
 * because the obvious hover — a 90%-ALPHA tint of the accent — measures 4.04 (court) / 3.87 (grove)
 * against `--brand-foreground`: an alpha tint over a LIGHT surface always lightens, so correcting
 * the brand to 4.57 at rest and then hovering into 4.04 would ship the very defect DS-06 removes.
 * Mixing toward `--foreground` darkens instead — 5.41 / 5.36 — and it is theme-portable precisely
 * because `--foreground` is per-theme. This is not new vocabulary: it is the idiom already shipped
 * for the `secondary` variant. It is also NOT a second brand token — the mix lives once, inside the
 * CVA variant, and no call site ever chooses between two corals.
 *
 * The rejected alpha class is described rather than quoted, here and in the `note` below. That is
 * deliberate: `tests/design/brand-recipe.test.ts` asserts the utility appears ZERO times anywhere
 * under `src/`, and a comment naming it is textually indistinguishable from a call site using it.
 * Do not "restore" the literal as a documentation improvement — it turns a committed gate red.
 */
export const DERIVED_SURFACES = {
  "brand-hover": { base: "brand", mixWith: "foreground", pct: 0.1 },
  "primary-hover": { base: "primary", mixWith: "foreground", pct: 0.1 },
} as const;

export type DerivedSurfaceName = keyof typeof DERIVED_SURFACES;

// ---------------------------------------------------------------------------
// The inventory
// ---------------------------------------------------------------------------

/**
 * One declared pairing.
 *
 * `fg` and `bg` are token names WITHOUT the leading `--` (or a `DERIVED_SURFACES` key). `alpha`,
 * when present, means the rendered background is `bg` at `value` opacity composited over `over` —
 * the test must composite first and measure second.
 */
export type ContrastPair = {
  readonly fg: string;
  readonly bg: string;
  readonly bar: number;
  readonly alpha?: { readonly value: number; readonly over: string };
  readonly note: string;
};

export const CONTRAST_PAIRS = [
  // =========================================================================
  // TEXT BARS (4.5) — anything a user reads as words.
  // =========================================================================
  {
    fg: "foreground",
    bg: "background",
    bar: TEXT_BAR,
    note: "Body copy on the page. The single most-rendered pairing in the app.",
  },
  {
    fg: "foreground",
    bg: "card",
    bar: TEXT_BAR,
    note: "Body copy inside a card. Grove's card is pure white while its background is tinted, so this is a genuinely different measurement, not a duplicate of the row above.",
  },
  {
    fg: "foreground",
    bg: "muted",
    bar: TEXT_BAR,
    note: "Status-chip and table-header text. D-14 puts ALL status text here — ink on a neutral tint — so the hue can retreat to the icon.",
  },
  {
    fg: "muted-foreground",
    bg: "background",
    bar: TEXT_BAR,
    note: "Secondary/help text on the page.",
  },
  {
    fg: "muted-foreground",
    bg: "card",
    bar: TEXT_BAR,
    note: "Secondary text inside a card — listing metadata, booking sub-lines.",
  },
  {
    fg: "muted-foreground",
    bg: "muted",
    bar: TEXT_BAR,
    note: "The tightest neutral pairing in the system, and the one that forced --muted-foreground to darken: the shipped value measured 4.35 here.",
  },
  {
    fg: "primary-foreground",
    bg: "primary",
    bar: TEXT_BAR,
    note: "An un-varianted <Button> label (D-21 — neutral, never the accent).",
  },
  {
    fg: "secondary-foreground",
    bg: "secondary",
    bar: TEXT_BAR,
    note: "Secondary button label.",
  },
  {
    fg: "accent-foreground",
    bg: "accent",
    bar: TEXT_BAR,
    note: "Hover fill on ghost/outline controls and menu items.",
  },
  {
    fg: "brand-foreground",
    bg: "brand",
    bar: TEXT_BAR,
    note: 'The <Button variant="brand"> label at rest. THE pairing that forced --brand to darken: the shipped coral measured 3.60 here, so the primary booker CTA failed AA.',
  },
  {
    fg: "background",
    bg: "foreground",
    bar: TEXT_BAR,
    note: "The INVERTED surface: `ui/tooltip.tsx:45` paints bg-foreground with text-background. WCAG contrast is symmetric so this measures the same as foreground-on-background, but it is a distinct DECLARED pairing — and declaring it is what stops the pair-drift check reporting the app's own tooltip as an undeclared invention. Added by plan 10-17 when the drift check first ran.",
  },
  {
    fg: "destructive",
    bg: "background",
    bar: TEXT_BAR,
    note: "Destructive Alert body copy and inline failure messages.",
  },
  {
    fg: "destructive",
    bg: "card",
    bar: TEXT_BAR,
    note: "The destructive Alert pattern proper, which is bg-card text-destructive.",
  },

  // =========================================================================
  // NON-TEXT BARS (3.0) — icons, glyphs, focus indicators, meaningful graphics.
  // =========================================================================
  {
    fg: "brand",
    bg: "background",
    bar: NON_TEXT_BAR,
    note: "The unread-notification dot and the wizard's completed-step markers, on the page.",
  },
  {
    fg: "brand",
    bg: "card",
    bar: NON_TEXT_BAR,
    note: "The selected day in the availability calendar and the selected hour run in the slot picker — the canonical accent-carries-meaning surfaces.",
  },
  {
    fg: "brand",
    bg: "muted",
    bar: NON_TEXT_BAR,
    note: "A brand glyph sitting on a neutral tint, e.g. inside a chip.",
  },
  {
    fg: "success",
    bg: "background",
    bar: NON_TEXT_BAR,
    note: "The positive-status icon on the page (D-14: the hue lives in the icon, never in the text).",
  },
  {
    fg: "success",
    bg: "card",
    bar: NON_TEXT_BAR,
    note: "The positive-status icon inside a card.",
  },
  {
    fg: "success",
    bg: "muted",
    bar: NON_TEXT_BAR,
    note: "The positive-status icon on its chip tint. This is the pairing that retired the shipped --success: it measured 3.01 on grove's --muted, failing the bar the moment a second theme existed.",
  },
  {
    fg: "success-foreground",
    bg: "success",
    bar: NON_TEXT_BAR,
    note: "The ONE legal use of --success-foreground: a non-text glyph on a filled --success surface (the wizard's completed-step marker, a progress indicator rather than a status badge). It is ILLEGAL as text — the filled bg-success/text-success-foreground badge measured 3.24 and is retired by DS-10.",
  },
  {
    fg: "destructive",
    bg: "muted",
    bar: NON_TEXT_BAR,
    note: "The attention-tone status icon on a neutral chip — genuine failure needing a human, e.g. payout failed.",
  },
  {
    fg: "ring",
    bg: "background",
    bar: NON_TEXT_BAR,
    note: "DS-05: the focus indicator on the page. Was 2.58 with the shipped --ring.",
  },
  {
    fg: "ring",
    bg: "card",
    bar: NON_TEXT_BAR,
    note: "DS-05: the focus indicator on a card. The ring-offset-2 band is --background-coloured, so the indicator has a verified surface on BOTH sides.",
  },
  {
    fg: "ring",
    bg: "muted",
    bar: NON_TEXT_BAR,
    note: "DS-05: the focus indicator on a tinted control. The hardest of the three, which is why all three are asserted rather than just the page.",
  },

  // =========================================================================
  // ALPHA-COMPOSITED — the rendered background is a tint over a real surface.
  // The test MUST composite before measuring (T-10-10).
  // =========================================================================
  {
    fg: "destructive",
    bg: "destructive",
    bar: TEXT_BAR,
    alpha: { value: 0.1, over: "background" },
    note: "The destructive button at rest: bg-destructive/10 text-destructive, on the page. Measuring the raw destructive/destructive pair here would return 1.0 and fail loudly; measuring destructive on background would return 5.76 and pass WRONGLY. Only the composite is the truth.",
  },
  {
    fg: "destructive",
    bg: "destructive",
    bar: TEXT_BAR,
    alpha: { value: 0.1, over: "card" },
    note: "The same destructive button inside a card, which is where it usually lives.",
  },
  {
    fg: "foreground",
    bg: "brand",
    bar: TEXT_BAR,
    alpha: { value: 0.1, over: "background" },
    note: "Status-chip text on the soft-accent tone (bg-brand/10) — the spots-left chip.",
  },
  {
    fg: "brand",
    bg: "brand",
    bar: NON_TEXT_BAR,
    alpha: { value: 0.1, over: "background" },
    note: "The soft-accent chip's ICON on its own tint. The tightest alpha row in the inventory.",
  },
  {
    fg: "background",
    bg: "foreground",
    bar: TEXT_BAR,
    alpha: { value: 0.8, over: "background" },
    note: "The photo uploader's Cover chip (`listing/photo-uploader.tsx:278`): bg-foreground/80 with text-background, sitting on top of a listing photograph. `over: background` is the WORST case rather than the true one — the real surface is an image, and any photo darker than the page background composites darker still, which only increases contrast against the near-white text. Added by plan 10-17 when the drift check first ran.",
  },

  // =========================================================================
  // HOVER — a control's hover state is a rendered pairing too, and it is the
  // one no prior document measured. Both rows below were found failing.
  // =========================================================================
  {
    fg: "brand-foreground",
    bg: "brand-hover",
    bar: TEXT_BAR,
    note: "The brand button under the cursor. The obvious hover — a 90%-alpha tint of the accent — measures 4.04 (court) / 3.87 (grove) — a tint over a light surface LIGHTENS. The color-mix recipe darkens instead: 5.41 / 5.36.",
  },
  {
    fg: "destructive-foreground",
    bg: "destructive",
    bar: TEXT_BAR,
    note: "The destructive button under the cursor. It flips to a SOLID fill rather than deepening the tint, because hover:bg-destructive/20 moves the surface toward the text colour — the wrong direction — and measures 4.01.",
  },
] as const satisfies readonly ContrastPair[];

/** Every token or derived-surface name the inventory references. */
export type TokenName = (typeof CONTRAST_PAIRS)[number]["fg" | "bg"];

// ---------------------------------------------------------------------------
// Exclusions — carried as DATA, never as a silently absent row
// ---------------------------------------------------------------------------

export type ExcludedPair = {
  readonly fg: string;
  readonly bg: string;
  readonly measured: string;
  readonly reason: string;
};

/**
 * Pairings that do NOT clear a bar and are legal anyway, each with the reason it is legal.
 *
 * This has to be data. An inventory that simply omits a failing pairing is indistinguishable from
 * one that forgot it, and "we just don't test that one" is precisely the shape of the defect DS-06
 * exists to remove. Listing it forces the exemption to be argued in the open and lets the test
 * assert that every exemption carries a reason.
 */
export const EXCLUDED_PAIRS = [
  {
    fg: "border",
    bg: "background",
    measured: "1.26 (court) / 1.28 (grove)",
    reason:
      "decorative divider — never a control's sole visible boundary or its sole focus indicator",
  },
  {
    fg: "input",
    bg: "background",
    measured: "1.26 (court) / 1.28 (grove)",
    reason:
      "decorative divider — never a control's sole visible boundary or its sole focus indicator",
  },
] as const satisfies readonly ExcludedPair[];
