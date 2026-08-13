// DS-11 — THE list row. Second of exactly three named card patterns; a fourth is a scope alarm.
//
// WHAT THIS REPLACES (nobody yet — the adoption plans swap the surfaces): the CONTAINERS of
// `booking/booking-row.tsx`, `host/host-booking-row.tsx`, `host/request-row.tsx`,
// `host/payout-row.tsx` and `notifications/notification-item.tsx`. The domain logic stays where it
// is; what is extracted here is the shell those five files each re-decide today.
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
  /** Where the row goes. Reached through the overlay pseudo-element below, not a wrapping anchor. */
  href: string;
  /**
   * The 48px thumbnail's contents, or nothing — an empty box renders as a neutral `bg-muted` tile.
   *
   * There is deliberately NO `mediaFallback` prop here, unlike `ResultCard`. At 48px there is no
   * room for a sentence, and the caller already knows whether it has a photo: a row that wants a
   * placeholder passes the placeholder AS `media`. One slot, no branch.
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
};

export function RowCard({ href, media, title, meta, status, trailing, actions }: RowCardProps) {
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
          <div className={cn(ROW_CARD_THUMB, "shrink-0 overflow-hidden rounded-md bg-muted")}>
            {media}
          </div>

          <div className="min-w-0 flex-1">
            {/* The whole card is the link to the detail page — an overlay pseudo-element rather than
                a wrapping anchor, so the inline CTA below stays a sibling and never nests inside it.
                Copied from `booking-row.tsx:79`; the absent `ring-offset` is the declared exception
                explained in this file's header (7.46 / 7.36 against a 3.0 bar). */}
            <Link
              href={href}
              className="truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {title}
            </Link>
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

        {/* SIBLINGS OF THE LINK, AND ABOVE ITS OVERLAY. `relative` makes this a positioned box so it
            can be stacked at all; `z-(--z-sticky)` is the named step the shipped analog uses, read
            from the global four-layer scale rather than as a bare 10 (DS-03). */}
        {actions ? <div className="relative z-(--z-sticky)">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
