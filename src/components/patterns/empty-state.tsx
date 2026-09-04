// STATE-04 — THE single empty shell. One shape, one radius, one padding, one title treatment.
//
// WHAT THIS REPLACES (nobody yet — the adoption plans swap the surfaces). Eight shipped empty blocks
// across TWO drifted shells, measured in `11-UI-SPEC § Empty`:
//
//   shell | sites                                                        | radius       | padding      | title
//   ------+--------------------------------------------------------------+--------------+--------------+---------------------------------
//   A     | `search/search-results.tsx` ×3                                | `rounded-xl` | `p-8`  (32 ✓) | `<p className="font-semibold">`
//   B     | `(app)/bookings/page.tsx` ×2, `/host/requests`, `/host/listings`, `/host/bookings` | `rounded-lg` | `p-10` (40 ✗) | `<h2 className="text-lg font-medium">`
//
// Two radii, two paddings, two title treatments — and shell A has NO HEADING ELEMENT in the empty
// region at all. Shell A's geometry wins because it is already on the spacing ladder (32px is the 8th
// step; 40px is off it), and shell B's HEADING wins because a `<p>` that looks like a title is not one.
// `titleAs` is how both halves survive: the element is always a heading, and the surface picks the
// level its own outline needs.
//
// A SERVER COMPONENT with no `"use client"` directive, no domain imports and no product copy — the
// `patterns/` membership rule 11-07 established. (This file has to quote the directive it does not use
// in order to say that; a raw `grep -c "use client"` on this file therefore returns a non-zero number
// against a correct file. The real property is "no directive prologue", which is verified over the AST
// — see the Verification Run in this plan's summary and the identical finding in 11-07 and 11-08.)
//
// NO PRODUCT COPY, AND THIS IS THE PATTERN'S SHARPEST RULE. `EmptyState` never contains the sentence
// "No spaces match those filters", or any other. `title` and `body` are props with no defaults; the
// sentence belongs to the surface, which is also why the conversion inventory can promise "copy
// preserved verbatim" for seven of the eight blocks. The one deliberate copy CHANGE
// (`/host/requests` → "You're all caught up") happens at that call site, not here.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// `border-dashed` READS `--border`, AND THAT PAIRING IS A DECLARED DECORATIVE EXCLUSION
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `--border` / `--input` are NOT in `contrast-pairs.ts`'s inventory; they sit in `EXCLUDED_PAIRS` with
// a reason, because they are decorative boundaries rather than meaning-bearing ink. The exclusion is
// legal HERE for two specific reasons, both of which have to hold or the row stops covering this file:
//
//   1. This panel is not a CONTROL. Nothing in the dashed box is focusable by virtue of the box; the
//      actions inside it are `Button`s carrying the DS-05 recipe, whose focus indicator is a solid
//      2px ring with its own offset band and its own measured 7.46 / 7.11 — not this border.
//   2. The border is not a STATE cue. It does not mean "empty"; the heading and the body say that in
//      words. Nothing is communicated by the border alone, so WCAG 1.4.11's non-text-contrast bar is
//      not engaged by it.
//
// Stated here rather than left implicit because plan `11-16`'s scoped `border-dashed` assertion needs
// a written home for this call site — an exclusion whose argument lives only in a reviewer's head is
// the shape `contrast-pairs.ts` exists to remove.

import type { ReactNode } from "react";
import { CheckCircle2, type LucideIcon } from "lucide-react";

import { STATUS_TONE_RECIPES } from "@/lib/design/status-tones";
import { cn } from "@/lib/utils";

type EmptyStateBase = {
  /**
   * The heading text. A prop with no default — see the no-product-copy rule above.
   */
  title: string;
  /**
   * WHICH HEADING ELEMENT the title renders as. Never a `<p>`; that is the whole reason this prop
   * exists rather than a fixed `<h2>`.
   *
   * The level is the SURFACE's decision because it depends on the surface's outline: an empty block
   * that is the only content under the page `<h1>` wants `h2`, and one that sits inside an already-
   * headed section (the `/bookings` tabs, the group roster) wants `h3`. A fixed level would push
   * every adopter into either a skipped level or a wrong one, and a skipped level is the a11y defect
   * the `<p>` was already causing in a louder way.
   */
  titleAs?: "h2" | "h3";
  /** The explanatory sentence beneath the title. A prop, for the same reason `title` is. */
  body: string;
  /**
   * The recovery actions. REQUIRED, with no default, because the copywriting contract's third
   * inherited rule is *"every state names what to do next — a state with no action is a dead end"*.
   * A caller with genuinely nothing to offer passes `null` and does so on purpose.
   */
  actions: ReactNode;
};

/**
 * The props, as a DISCRIMINATED UNION rather than a flat record, because `tone` and `icon` are not
 * independent.
 *
 * `tone="positive"` is STATE-04's inbox-zero clause, and the UI-SPEC states it as a fact about the
 * rendered glyph: *"the icon becomes `CheckCircle2` at `text-success`"*. If `icon` stayed a plain
 * required prop the component would have to silently IGNORE it whenever the tone is positive — a
 * dead prop, and a caller passing `XCircle` with `tone="positive"` would get a green check with no
 * warning. Expressing it in the type instead makes that combination a COMPILE error, which is the
 * same move `status-tones.ts` makes with its total `Record` and `selector-contract.ts` with its total
 * `Record` over a closed union: the vocabulary is a type, not a convention.
 *
 * If a later phase genuinely needs a positive empty state with a different glyph, the honest change
 * is to widen this union with the new pairing and record why — not to loosen `icon?: never`.
 */
export type EmptyStateProps =
  | (EmptyStateBase & {
      /** The default tone. Neutral ink, neutral glyph. */
      tone?: "neutral";
      /** `size-6`, `aria-hidden` — decorative, because the heading beside it carries the meaning. */
      icon: LucideIcon;
    })
  | (EmptyStateBase & {
      /**
       * D-14 AT PANEL SCALE, WITH ZERO NEW TONES AND ZERO NEW PAIRINGS. `positive` here is literally
       * `STATUS_TONE_RECIPES.positive`: green retreats to the icon, the title and body stay
       * `--foreground`, and there is no green fill and no green text anywhere in this file. Success
       * on background measures 4.00 court / 3.86 grove against a 3.0 non-text bar (declared in
       * `contrast-pairs.ts`) — which is exactly why the hue may sit on a glyph and may not sit on the
       * 4.5-bar text beside it.
       */
      tone: "positive";
      /** Owned by the tone. Passing one is a compile error — see the union's docblock above. */
      icon?: never;
    });

export function EmptyState(props: EmptyStateProps) {
  const { title, titleAs = "h2", body, actions } = props;

  // The heading ELEMENT, chosen by the surface. Capitalised so JSX reads it as a component rather
  // than as the literal tag `<titleAs>`, and typed by the union above so it can only ever be one of
  // the two heading levels.
  const Title = titleAs;

  // The glyph and its hue, both read from the tone rather than restated. `neutral`'s
  // `text-muted-foreground` and `positive`'s `text-success` are the `icon` slots of the two
  // `STATUS_TONE_RECIPES` entries by NAME — so a change to the status vocabulary reaches this panel
  // instead of leaving it as a fifth place that agrees with the vocabulary by coincidence.
  const positive = props.tone === "positive";
  const Icon = positive ? CheckCircle2 : props.icon;
  const iconTone = positive
    ? STATUS_TONE_RECIPES.positive.icon
    : STATUS_TONE_RECIPES.neutral.icon;

  return (
    <div
      data-testid="empty-state"
      // Shell A's geometry, unchanged: 32px is the 8th spacing step and `rounded-xl` is the card
      // radius every other panel in this layer uses. `border-dashed` — see the header's exclusion
      // argument, which is what makes this line legal rather than merely shipped.
      className="rounded-xl border border-dashed p-8 text-center"
    >
      <Icon className={cn("mx-auto size-6", iconTone)} aria-hidden="true" />
      {/* `mt-3 text-body font-semibold text-foreground` — the same ink in both tones. The tone is
          allowed to reach the glyph above and nothing else; that invariant is what the plan's
          "identical across tones" criterion is about. */}
      <Title className="mt-3 text-body font-semibold text-foreground">{title}</Title>
      <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">{body}</p>
      {actions ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
