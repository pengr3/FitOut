// DS-11 — THE boxed panel. Third and last of the named card patterns; a fourth is a scope alarm.
//
// WHAT THIS REPLACES (nobody yet — the adoption plans swap the surfaces): the listing page's sticky
// booking rail (`listings/[id]/page.tsx:365`), `booking/price-breakdown.tsx`'s container,
// `host/payout-summary.tsx`, `invite/[token]`'s `InviteCard`, and the hours-missing notices. Five
// surfaces that each re-decide padding, radius and elevation today.
//
// A SERVER COMPONENT with no domain imports and no product copy — see `result-card.tsx`'s header for
// the rule and the D-130 reason it is not stylistic. `title`, `description` and everything inside
// `children` arrive as props; this file owns no sentence.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// ELEVATION: NONE AT REST. A PANEL IS FLAT.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// There is no `shadow-` utility anywhere in this file and there must not be one. `shadow-raised` is
// for surfaces that are LIFTED off the page (a tab strip's active tab, the search bar); `shadow-overlay`
// is for things that float above it (a dropdown, a popover, the marketplace tile on hover). A panel is
// neither — it is a region OF the page, and it already carries `ui/card.tsx:15`'s `ring-1
// ring-foreground/10` hairline, which is the boundary a flat surface needs. Adding elevation here would
// put a shadow on five surfaces at once and flatten the three-step scale into two.

import type { ReactNode } from "react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PanelCardProps = {
  /**
   * Rendered as an `<h2 className="text-heading">` — the role `11-UI-SPEC § Typography` assigns to
   * "`PanelCard` title" by name, so the panel's heading travels per theme (20/600 court, 24/700 grove).
   *
   * OPTIONAL, and that is a fact about the adopters rather than a convenience: several of the five
   * render no heading at all (the price breakdown has none), which is also the reason
   * `selector-contract.ts` gives for this pattern needing a `data-testid` in the first place — there
   * is nothing semantic to select even in principle.
   */
  title?: string;
  /** The lede beneath the title. */
  description?: string;
  /**
   * Rendered through `CardFooter`, whose shipped `border-t bg-muted/50 p-4` is ALREADY the treatment
   * the UI-SPEC prescribes for this slot. It is deliberately not restated here: composing the
   * vendored primitive through its public props is the whole DS-11 contract, and re-declaring its
   * classes at the call site is how a composition quietly becomes a fork.
   */
  footer?: ReactNode;
  /**
   * Pins the panel beside a scrolling column from `lg:` up.
   *
   * THE OFFSET IS PART OF THE PROP, so no surface re-derives it. See the note at the call site below
   * for the arithmetic and for the general rule it is an instance of.
   */
  sticky?: boolean;
  /**
   * `"muted"` swaps `bg-card` for `bg-muted` — the treatment the legal placeholder notice and in-page
   * advisories use. It is the `neutral` status tone at panel scale: ZERO new tones and zero new
   * colour pairings, because `foreground on muted` and `muted-foreground on muted` are both already
   * declared and measured in `contrast-pairs.ts`.
   */
  tone?: "default" | "muted";
  children?: ReactNode;
};

export function PanelCard({
  title,
  description,
  footer,
  sticky = false,
  tone = "default",
  children,
}: PanelCardProps) {
  return (
    <Card
      data-testid="panel-card"
      className={cn(
        // `gap-0 py-0` — the panel's ONLY padding is `CardContent`'s `p-4 sm:p-6`, which is what
        // makes the UI-SPEC's stated padding literally true rather than approximately so. This tree's
        // `ui/card.tsx:15` carries `py-4` on `Card` ITSELF and only `px-4` on `CardContent`, so a
        // panel that also asks `CardContent` for `p-4 sm:p-6` pays the block padding twice (32px at
        // the mobile step, 40px at `sm:`). Measured in Chromium for the row card's twin of this
        // problem; see `row-card.tsx`'s note and the phase's `deferred-items.md`.
        //
        // `gap-0` for the same reason on the other axis: `Card`'s own `gap-4` would open a 16px
        // channel between the content and a `CardFooter` whose `border-t` is meant to sit flush.
        "gap-0 py-0",
        // THE STICKY OFFSET IS 80px, AND THAT NUMBER IS DERIVED, NOT CHOSEN. The app shell's header
        // (plan 11-10) is 64px from `sm:` up and is `sticky top-0`, so a rail pinned any closer than
        // 64px to the viewport top scrolls UNDER it. 64 + a 16px gap = 80px = the 20th spacing step.
        //
        // THE GENERAL RULE, STATED ONCE, HERE: *every `lg:sticky` offset in the app is at least the
        // header height plus 16px.* It is no longer only a rule: `tests/design/sticky-offset.test.ts`
        // (plan 11-10) asserts it over the source of `src/app/**` and `src/components/**`.
        //
        // CORRECTED BY PLAN 11-10, in that plan's own commit. This note used to say the two shipped
        // sites — `listings/[id]/(detail)/page.tsx` and `booking/reserve-view.tsx` — were "both
        // offset by 32px, the 8th spacing step", which was true when this file was written and became
        // false when the header landed. Both moved to the 20th step in the same commit that shipped
        // the header, so all three sites in the app now agree. Both still move onto this prop when
        // they adopt the pattern (plan 11-13); what changed is that they are no longer wrong while
        // they wait.
        //
        // The wrong offset is named DESCRIPTIVELY above rather than quoted as a class, following
        // `booking-row.tsx:112`'s precedent ("Named descriptively rather than quoted, because the
        // DS-03 gate counts that string"): the rule is now falsifiable as a source scan, and a scan
        // for the wrong offset must not be tripped by the comment explaining why it is wrong.
        sticky && "lg:sticky lg:top-20",
        tone === "muted" && "bg-muted",
      )}
    >
      <CardContent className="space-y-4 p-4 sm:p-6">
        {title || description ? (
          <div className="space-y-1">
            {title ? <h2 className="text-heading">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        ) : null}
        {children}
      </CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
