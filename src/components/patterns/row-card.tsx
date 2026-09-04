// DS-11 — THE list row. Second of exactly three named card patterns; a fourth is a scope alarm.
//
// WHAT THIS REPLACES: the CONTAINERS of `booking/booking-row.tsx`, `host/host-booking-row.tsx`,
// `host/request-row.tsx` and `host/payout-row.tsx` — all four adopted by plan 11-11. The domain logic
// stays where it is; what is extracted here is the shell those four files each re-decided.
//
// `notifications/notification-item.tsx` is on the UI-SPEC's *Replaces* line and is NOT an adopter, for
// four independent reasons written up in the phase's `deferred-items.md` under `[11-11]`. The short
// form, because the next reader will otherwise try it: its `href` is NULLABLE BY SECURITY DESIGN (a
// payload that fails `safeHref`'s scheme allow-list degrades to non-navigable content, and this
// pattern's `href` cannot be satisfied without fabricating a destination the writer never wrote), and
// it is not a card at all — it is a row inside a `divide-y` list in a `PopoverContent p-0`, where a
// `bg-card ring-1 rounded-xl` box per item is a visual regression rather than an adoption.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT PLAN 11-11 CHANGED HERE, AND WHY EACH CHANGE WAS FORCED BY A DECLARED ADOPTER
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// 11-08 shipped this pattern prop-complete AGAINST THE UI-SPEC'S TABLE. The table turned out not to
// describe the five surfaces the same spec names as its adopters, which only adoption could measure:
//
//   1. `children` — a BODY slot. All four adopters render a `<dl>` of label/value pairs beneath the
//      header row, which is a deliberate accessibility decision the shipped files record ("so the
//      label↔value association survives linearisation on a narrow screen"). There was no slot for it.
//      It cannot go through `meta`: that renders inside a `<p>`, and a `<dl>` inside a `<p>` is
//      invalid — the parser closes the paragraph and the tree hydrates mismatched. It cannot go
//      through `actions` either: that slot is LIFTED above the overlay link, so a `<dl>` there would
//      steal every click meant for the card.
//   2. `href` OPTIONAL — `request-row.tsx` and `payout-row.tsx` navigate NOWHERE today. Giving them a
//      destination is a product change (Phase 14 owns those surfaces), and inventing one to satisfy a
//      required prop is exactly the kind of silent scope creep a container swap must not smuggle in.
//      With no `href` the title renders as the plain `<p className="truncate text-sm font-semibold">`
//      those two files ship today, and no overlay pseudo-element is created at all.
//   3. `media` OPTIONAL AS A WHOLE BOX — three of the four adopters have no thumbnail. The old
//      unconditional box would have put an empty 48px `bg-muted` square on every host booking, request
//      and payout row: a visible defect introduced by a refactor, not a container swap. Only
//      `booking-row.tsx` has a thumbnail, and it passes its own "No photos yet" tile AS `media`, which
//      is why there is still deliberately no `mediaFallback` prop here (see the slot's own note).
//
// The 80px height claim below is unaffected: the UI-SPEC scopes it to "the 48px-media configuration",
// which is `booking-row.tsx` alone. A row with no thumbnail and no body is shorter, and a row with a
// `<dl>` body is taller — 80px was always the RESTING height of the media configuration.
//
// A SERVER COMPONENT, DELIBERATELY, and with no domain imports — see `result-card.tsx`'s header for
// the rule and the D-130 reason it is not stylistic. No product copy either: every string is a prop.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE OVERLAY LINK, AND ITS DECLARED DS-05 EXCEPTION
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Navigation is an overlay PSEUDO-ELEMENT on the title link, never an anchor wrapping the row. That
// is not a preference: `actions` must be able to contain a button, a button inside an anchor is
// invalid HTML, and the browser resolves the ambiguity by swallowing the button's own click. The
// shipped analogs already do it this way (`booking-row.tsx:79`, `host-booking-row.tsx:81`) and the
// class string below is copied from the first of them.
//
// THE MISSING `ring-offset` IS THE EXCEPTION, NOT A DEFECT TO FIX. DS-05's canonical recipe pairs
// `ring-offset-2` with `ring-offset-background`; this form carries neither, because an overlay
// pseudo-element filling its container has no surface to offset INTO — the 2px band would be drawn
// inside the card's own content, over the thumbnail and the title. It is legal without one because
// the ring is solid and sits on `--card`: `ring on card` measures **7.46 (court) / 7.36 (grove)**
// against WCAG 1.4.11's 3.0 non-text bar, so the indicator clears the bar by more than 2× with no
// offset band at all. `tests/design/focus-recipe.test.ts` records the same exemption in its NOT
// COVERED footer, naming these two shipped sites. Do not "complete" the recipe here.

import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { ROW_CARD_THUMB } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

export type RowCardProps = {
  /**
   * Where the row goes, reached through the overlay pseudo-element below rather than a wrapping
   * anchor — or ABSENT, for a row that navigates nowhere.
   *
   * Optional since 11-11: `request-row.tsx` and `payout-row.tsx` are terminal rows, and a required
   * `href` would have been satisfied by inventing a destination. With none, the title renders as
   * plain text and no `::after` overlay is created, so nothing on the row is clickable that was not
   * clickable before.
   */
  href?: string;
  /**
   * The 48px thumbnail's contents, or nothing at all — in which case the BOX ITSELF is not rendered.
   *
   * There is deliberately NO `mediaFallback` prop here, unlike `ResultCard`. At 48px there is no
   * room for a sentence, and the caller already knows whether it has a photo: a row that wants a
   * placeholder passes the placeholder AS `media`. One slot, no branch.
   *
   * Absent `media` omits the box rather than drawing an empty one (11-11). Three of the four
   * adopters have no thumbnail, and an empty `bg-muted` square on each of them would be a defect
   * this pattern introduced.
   */
  media?: ReactNode;
  /** Truncates rather than wraps — a row is one line tall by contract (see the height note below). */
  title: string;
  /**
   * The muted line beneath the title (the when-label, on four of the five adopters).
   *
   * Optional, like every slot but `href` and `title`: RowCard's five named adopters genuinely differ
   * in what they fill — a payout row has no thumbnail, a notification has no trailing amount — and a
   * required slot that half the adopters would satisfy with `null` is a required prop in name only.
   */
  meta?: ReactNode;
  /** Top-right. A badge on every shipped analog, but the pattern does not require one. */
  status?: ReactNode;
  /** Beneath `status`, right-aligned and `tabular-nums`. */
  trailing?: ReactNode;
  /**
   * Rendered as SIBLINGS of the overlay link, never nested inside it, and lifted above the overlay.
   *
   * Both halves are load-bearing. Nesting a button inside the anchor is invalid HTML and swallows
   * the click; leaving the actions un-lifted is subtler and just as broken — the link's `::after` is
   * a POSITIONED descendant, so it paints above a later sibling that is merely in flow, and every
   * click on an action lands on the overlay instead. `booking-row.tsx:109-117` records the same
   * fix in the same words, which is where the `z-(--z-sticky)` step below comes from.
   */
  actions?: ReactNode;
  /**
   * The row's BODY — everything beneath the header line, on the `space-y-3` rhythm.
   *
   * On all four adopters this is the `<dl>` of label/value pairs the shipped rows use so that the
   * label↔value association survives linearisation on a narrow screen, plus (on `request-row`) the
   * SLA countdown and (on `payout-row`) the expected/paid date line. It is a plain slot rather than
   * a typed structure on purpose: the pattern owns the BOX, and what a booking row says about money
   * is not the box's business.
   *
   * NOT `meta` and NOT `actions`. `meta` renders inside a `<p>`, where a `<dl>` is invalid and
   * hydrates mismatched; `actions` is lifted above the overlay link, where a body would swallow
   * every click meant for the card.
   */
  children?: ReactNode;
};

export function RowCard({
  href,
  media,
  title,
  meta,
  status,
  trailing,
  actions,
  children,
}: RowCardProps) {
  return (
    // `py-0` — the row's ONLY padding is `CardContent`'s `p-4`, and that is what makes
    // `ROW_CARD_HEIGHT` true rather than aspirational.
    //
    // MEASURED, NOT DERIVED ON PAPER (Chromium 1223, against the compiled stylesheet, 640px wide):
    //
    //   <Card className="relative">        + CardContent p-4  ->  112px   ← the shipped analogs
    //   <Card className="relative py-0">   + CardContent p-4  ->   80px   ← this pattern
    //
    // `measurements.ts` derives `ROW_CARD_HEIGHT` as "a Card is `p-4` (16 top + 16 bottom) around a
    // 48px thumbnail, 16 + 48 + 16 = 80". That derivation is right about the box it describes and
    // wrong about which element owns the padding in THIS tree: the vendored `ui/card.tsx` carries
    // `py-4` on `Card` ITSELF and `px-4` on `CardContent`, so a row that also asks `CardContent` for
    // `p-4` pays the block padding twice. Zeroing the Card's own `py` is the composition that makes
    // the row measure the number `RowListSkeleton` shimmers — 80px, from the same constant, checked
    // in a browser rather than asserted in a comment.
    //
    // The shipped rows are 32px taller than their own skeleton today. That is a live defect on a
    // shipped route and NOT this plan's to fix (it is recorded in the phase's `deferred-items.md`);
    // it dies when `(app)/bookings` and the two host lists adopt this pattern.
    <Card className="relative py-0" data-testid="row-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          {/* `!= null` rather than a truthiness test: `media` is a ReactNode, and a caller who passes
              a legitimately falsy node still asked for a thumbnail. No media at all omits the BOX —
              see the prop's note for why an empty square was the wrong default. */}
          {media != null ? (
            <div className={cn(ROW_CARD_THUMB, "shrink-0 overflow-hidden rounded-md bg-muted")}>
              {media}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            {/* The whole card is the link to the detail page — an overlay pseudo-element rather than
                a wrapping anchor, so the inline CTA below stays a sibling and never nests inside it.
                Copied from `booking-row.tsx:79`; the absent `ring-offset` is the declared exception
                explained in this file's header (7.46 / 7.36 against a 3.0 bar).

                With no `href` the title is a paragraph instead — byte-identical to what
                `request-row.tsx` and `payout-row.tsx` shipped before they adopted this pattern. No
                overlay is created in that branch, so a terminal row has nothing invisible over it. */}
            {href ? (
              <Link
                href={href}
                className="truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                {title}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold">{title}</p>
            )}
            {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
          </div>

          {status || trailing ? (
            <div className="flex shrink-0 flex-col items-end gap-1">
              {status}
              {/* `tabular-nums` unconditionally, not "when the caller passes a number". The figure
                  here is a refund, a payout or an amount on every shipped analog, the utility is
                  inert on text that has no digits, and a conditional would be a rule somebody has to
                  remember at five call sites. Colour is left to the caller — a muted refund line and
                  a prominent payout total are both correct, and neither is the pattern's decision. */}
              {trailing ? <div className="text-right tabular-nums">{trailing}</div> : null}
            </div>
          ) : null}
        </div>

        {/* THE BODY, on the same `space-y-3` rhythm the header row sits on — which is what makes the
            adopters' `<dl>` blocks land exactly where they landed before the swap. */}
        {children}

        {/* SIBLINGS OF THE LINK, AND ABOVE ITS OVERLAY. `relative` makes this a positioned box so it
            can be stacked at all; `z-(--z-sticky)` is the named step the shipped analog uses, read
            from the global four-layer scale rather than as a bare 10 (DS-03). Kept for the no-`href`
            rows too: there is no overlay to clear there, but the step is inert rather than wrong, and
            one branch is one fewer rule for a call site to remember. */}
        {actions ? <div className="relative z-(--z-sticky)">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
