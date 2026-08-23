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
//   • TWO EXCLUSIONS ARE CONDITIONAL, AND THIS FILE CANNOT CHECK THEIR CONDITION. The two skeleton
//     fills (`muted` on `background` / on `card`, 1.09:1) are legal ONLY while the loading state's
//     meaning is carried by a `role="status"` + `aria-busy="true"` + `sr-only` label wrapper instead
//     of by the fill. Nothing here can see whether a skeleton renders that wrapper — the condition is
//     enforced by `tests/design/skeleton-a11y.test.tsx`, and if that gate is ever deleted these two
//     rows stop being exclusions and become WCAG 1.4.11 failures. Delete the gate, delete the rows.

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
  /**
   * The INK's own opacity, composited over the rendered background before measuring.
   *
   * Added when `pair-drift.test.ts` gained an alpha-aware key (WR-05) and immediately surfaced a
   * diluted ink the inventory had no way to describe. Until then `alpha` above — which describes
   * the BACKGROUND — was the only opacity the inventory could express, so a diluted foreground was
   * not merely unmeasured but inexpressible. That is the gap CR-03 fell through: a foreground at
   * 80% on a filled surface is a real rendered colour, and an inventory that cannot state it will
   * never measure it.
   */
  readonly fgAlpha?: number;
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
    note: "The ONE legal use of --success-foreground: a non-text glyph on a filled --success surface (the listing wizard's publish-checklist done marker, a progress indicator rather than a status badge). It is ILLEGAL as text — the filled bg-success/text-success-foreground badge measured 3.24 and is retired by DS-10. The marker lived in the wizard route file until plan 14-10 made the checklist persistent and lifted it into components/host/publish-checklist.tsx; the pairing, the measurement and the glyph-only rule are unchanged, only the address is.",
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

  // =========================================================================
  // EXPOSED BY THE ALPHA-AWARE DRIFT KEY (WR-05). Every row below was already
  // rendering; none was declared, because `pair-drift.test.ts` dropped the
  // opacity from its lookup key and so matched each of them against a solid
  // row that happens to pass. They are measured here, not assumed.
  // =========================================================================
  {
    fg: "primary-foreground",
    bg: "primary",
    bar: TEXT_BAR,
    alpha: { value: 0.8, over: "card" },
    note: "The default <Badge> under the cursor when it is a link (`ui/badge.tsx`'s `[a]:hover`). 9.19 (court) / 8.20 (grove) — the neutral primary is far enough from its own foreground that diluting the fill costs nothing. `over: card` is the tighter of the two surfaces a badge sits on.",
  },
  {
    fg: "secondary-foreground",
    bg: "secondary",
    bar: TEXT_BAR,
    alpha: { value: 0.8, over: "card" },
    note: "The secondary <Badge> under the cursor. 16.73 / 14.69 — the widest margin in the inventory.",
  },
  {
    fg: "destructive",
    bg: "background",
    bar: TEXT_BAR,
    alpha: { value: 0.8, over: "card" },
    note: "The photo uploader's remove button (`listing/photo-uploader.tsx:324`): a translucent scrim over a listing photograph carrying destructive ink. `over: card` is the worst case rather than the true one — the real surface is an image, and the scrim is 80% of a near-white background either way. 5.76 / 5.62.",
  },
  {
    fg: "muted-foreground",
    bg: "background",
    bar: TEXT_BAR,
    alpha: { value: 0.8, over: "card" },
    note: "The photo uploader's drag handle (`listing/photo-uploader.tsx:287`), on the same scrim. 5.25 / 5.82.",
  },
  {
    fg: "destructive",
    bg: "card",
    bar: TEXT_BAR,
    fgAlpha: 0.9,
    note: "The destructive Alert's DESCRIPTION is set a notch softer than its title (`ui/alert.tsx:13`), which is a deliberate typographic hierarchy rather than an oversight — so it is measured rather than removed: 5.24 in both themes against the 4.5 bar, versus 5.76 solid. This row is also the reason `fgAlpha` exists; see the field's own note.",
  },
  {
    fg: "foreground",
    bg: "muted",
    bar: TEXT_BAR,
    fgAlpha: 0.6,
    note: "The INACTIVE tab label on the segmented control's muted track (`booking/bookings-tabs.tsx:52` and `ui/tabs.tsx:66`, both `TRIGGER_IDLE`). A shipped, diluted INK on a filled surface — the same shape as the row above and the one the first review's CR-03 was about — and it was in neither the inventory nor the exclusions when WR-09 found it. Measured: court composites the ink to #686868 for 5.11, grove to #616c6b for 4.81. Both clear 4.5 + epsilon, so it is DECLARED rather than removed. Grove has 0.26 of headroom against a token that is free to move, which is exactly why it belongs in a file that re-measures on every run instead of in a comment.",
  },

  // =========================================================================
  // THE SEARCH-RESULT CARD'S HOVER FILL (plan 11-07). `search-result-card.tsx:176`
  // ships `group-hover:bg-muted/40` on a Card whose ink is `text-card-foreground`
  // and whose sub-lines are `text-muted-foreground`. Both pairings render on every
  // hovered search result and neither was declared: they are CROSS-ELEMENT (the
  // fill is on the Card, the ink is on a `<p>` inside it), which is the exact class
  // `pair-drift.test.ts` states it cannot see, so nothing would ever have found them.
  // =========================================================================
  {
    fg: "foreground",
    bg: "muted",
    bar: TEXT_BAR,
    alpha: { value: 0.4, over: "background" },
    note: "The search-result card's TITLE and price under the cursor. `over: background` and NOT `over: card` is the whole correctness of this row: `group-hover:bg-muted/40` is applied to the Card itself, so it REPLACES the Card's own `bg-card` rather than layering over it — the 40% tint composites against whatever is behind the card, which is the page. Writing `over: card` would measure a stack that never renders, the same class of error that let the focus ring ship at 2.58 as a token pair and 1.54 as actually rendered. Measured 19.13 (court) / 17.76 (grove) against the 4.5 bar; the UI-SPEC session's table said 19.42 / 17.80 and this gate is the authority (D-12), so the corrected numbers are the ones recorded here.",
  },
  {
    fg: "muted-foreground",
    bg: "muted",
    bar: TEXT_BAR,
    alpha: { value: 0.4, over: "background" },
    note: "The same hovered search-result card's SECONDARY lines — space type, distance, the searched window, `Service fee included`. The tightest of the two by a wide margin, which is why the pair is declared as two rows rather than waved through on the title's 19:1. `over: background` for the identical reason as the row above: the hover fill replaces the card surface, it does not layer over it. Measured 5.07 (court) / 5.55 (grove) against the 4.5 bar; the UI-SPEC session's table said 5.08 / 5.56 and the gate wins (D-12). Court keeps 0.52 of headroom over bar + epsilon here, so a future darkening of the muted tint is a real risk this row is what would catch.",
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
  {
    fg: "destructive-40",
    bg: "card",
    measured: "2.13 (court) / 2.13 (grove)",
    reason:
      "container edge at 40% opacity on the failed-payout Alert (`host/payout-state-badge.tsx`) — never the sole boundary and never an indicator, exactly like --border and --input above. The Alert carries its meaning in solid destructive ink at 5.76 and a solid destructive glyph beside it; the diluted edge only tints the container. Recorded here rather than left as the third state contrast-pairs is written to forbid: WR-09 of the re-review found it shipping on every host with a failed payout, measured by nothing. The `fg` names the composite rather than a raw token because the exclusion is about the 40% form specifically — the solid `destructive on card` at 5.76 is a separate, passing row.",
  },
  {
    fg: "muted",
    bg: "background",
    measured: "1.09 (court) / 1.09 (grove)",
    reason:
      "SKELETON FILL on the page — `ui/skeleton.tsx:7`'s `animate-pulse rounded-md bg-muted`, which is every loading placeholder in the app. A skeleton bar is a NON-INFORMATIONAL placeholder: it stands for content that does not exist yet, so there is nothing for its contrast to make legible and WCAG 1.4.11 does not apply to it. THE EXCLUSION IS CONDITIONAL AND THE CONDITION IS MECHANICAL, not a promise: the loading state's MEANING must be carried by a `role=\"status\" aria-busy=\"true\"` region with a non-empty `sr-only` label, with every pulse bar `aria-hidden=\"true\"`, so the fill carries no information at all. Without that wrapper the fill IS the only carrier of \"loading\" and this stops being a declared exclusion and becomes a real 1.4.11 failure. `tests/design/skeleton-a11y.test.tsx` is what makes the condition binding — it asserts exactly one status region per skeleton with an accessible name, and it has been watched failing at counts of 0 and 2 (T-11-A11YFILL). A SECOND NON-INFORMATIONAL FILL SHARES THIS ROW AS OF PLAN 14-12 — the week-at-a-glance strip's empty track (`availability/week-strip.tsx`), which is the same measurement and needs no separate one — and it is legal under a compensating requirement of exactly the same mechanical shape: D-153 hides the ENTIRE seven-column grid from assistive technology and carries its meaning in a per-day text equivalent derived from the same function that draws it, so the track fill states nothing that the seven sentences beside it do not. Un-hide the grid and this stops being an exclusion for the strip too, on the identical reasoning; `tests/availability/week-strip.test.tsx` is what makes that condition binding, asserting the grid computes as hidden and that the accessibility tree holds the seven sentences and zero of the bars.",
  },
  {
    fg: "muted",
    bg: "card",
    measured: "1.09 (court) / 1.13 (grove)",
    reason:
      "The SAME skeleton fill inside a card or a panel, which is where most of them sit — a card-grid cell's media block, a panel's body. A genuinely separate measurement rather than a duplicate of the row above: grove's card is pure white while its page background is tinted, so the fill sits on two different surfaces in that theme (1.09 vs 1.13). Legal for the same reason and under the SAME compensating requirement — a non-informational placeholder whose meaning is carried by the mandatory `role=\"status\"` + `aria-busy=\"true\"` + `sr-only` label wrapper, never by the fill. Remove the wrapper and both rows become 1.4.11 failures together. THIS IS THE ROW THE WEEK STRIP'S TRACK ACTUALLY LANDS ON, and naming it here is why no new row was added in plan 14-12: the strip sits inside a `PanelCard`, so its empty track is this second non-informational fill on a card ground rather than the page one above, at the identical measurement. Its compensating requirement is the same shape and is stated in the same sentence — the entire seven-column grid computes as hidden from assistive technology (D-153) and its meaning is carried by a per-day text equivalent derived from the same function that draws the bars, so the fill carries no information at all; un-hide the grid and this row's exemption stops covering the strip exactly as removing the status wrapper stops it covering a skeleton.",
  },
  {
    fg: "foreground-10",
    bg: "card",
    measured: "1.24 (court) / 1.24 (grove)",
    reason:
      "The HAIRLINE ON EVERY CARD IN THE APP — `ui/card.tsx:15`'s `ring-1 ring-foreground/10`, shipped since v1.0 and measured by nothing until this row. It is the identical class of thing as the already-declared `--border` and `--input` exclusions above: a decorative container edge, never a control's sole visible boundary and never a focus indicator (the focus ring is `--ring`, declared and measured on all three surfaces at the 3.0 bar). The `fg` names the COMPOSITE rather than a raw token because the exclusion is about the 10% form specifically — solid `foreground on card` is a separate, passing 4.5-bar row at the top of the inventory, and naming this one `foreground` would collide with it. Recorded here rather than omitted for the reason this whole list exists: a failing pairing that is simply absent is indistinguishable from one nobody thought about, and this one is on every surface in the product.",
  },
  {
    fg: "brand-30",
    bg: "card",
    measured: "1.60 (court) / 1.50 (grove)",
    reason:
      "THE SOFT-ACCENT NOTICE'S EDGE — `border-brand/30`, shipping today at `slot-picker.tsx:268`'s gap hint and at `spots-left-chip.tsx:64`, and measured by nothing until this row. Nothing WOULD have found it: `pair-drift.test.ts` classifies `border-*` as the `edge` role and deliberately mints no pairing from it, so an undeclared container edge is invisible to the one gate that reads rendered classes. Declared now, in plan 12-01, because Phase 12 adds two more adopters (the STATE-07 collision notice and the STATE-03 band's relaxed filter chip) and a recipe should be inside the inventory BEFORE it spreads, not after. It is legal for the identical reason and in the identical class as the `destructive-40 on card`, `--border` and `--input` exclusions above: a decorative container edge, never a control's sole visible boundary and never a focus indicator (the focus ring is `--ring`, declared and measured on all three surfaces at the 3.0 bar). THE COMPENSATING REQUIREMENT, which is what makes the exemption an argument rather than a shrug: the notice must carry its meaning in DECLARED, PASSING ink and glyph — `foreground` on `brand@10%` (17.04 / 16.24) for the sentence and `brand` on `brand@10%` (4.10 / 4.06, 3.0 bar) for the icon, both already rows in the inventory above — and never in the edge. A notice whose only signal is the tinted border is not covered by this row. The `fg` names the COMPOSITE rather than a raw token because the exclusion is about the 30% form specifically; solid `brand on card` is a separate, passing 3.0-bar row at the top of the inventory, and naming this one `brand` would collide with it. THE COURT FIGURE IS CORRECTED, not copied: 12-UI-SPEC's session table said ≈1.59, and re-running the inventory's own gamma-space composite against the compiled tokens returns 1.60. The gate is the authority (D-12), so the gate's number is the one recorded — the same direction the two `bg-muted/40` hover rows above were corrected in.",
  },
] as const satisfies readonly ExcludedPair[];
