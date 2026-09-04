// DS-11 — THE boxed panel. Third and last of the named card patterns; a fourth is a scope alarm.
//
// WHAT THIS REPLACES — ALL FIVE SURFACES ARE ADOPTED. None of them re-decides padding, radius or
// elevation any more; this file decides for all five.
//
//   1. The listing page's booking rail — `src/app/listings/[id]/(detail)/page.tsx` (plan 11-13).
//      This line used to cite `listings/[id]/page.tsx:365`, a path that plan 11-10's route-group
//      restructure retired; the `(detail)` segment is the same page after the move.
//   2. The checkout rail — `src/components/booking/reserve-view.tsx` (plan 11-13). This is the box
//      `11-UI-SPEC § PanelCard` means by *"`booking/price-breakdown.tsx`'s container"*, and the
//      distinction is load-bearing rather than pedantic: `price-breakdown.tsx`'s own root is a bare
//      div and stays one, because boxing it in its own file would nest two cards and pay the block
//      padding twice. Its header says so from the other side. A reader who goes looking for an
//      adoption INSIDE `price-breakdown.tsx` will not find one, and that is correct.
//   3. The earnings summary figures — `src/components/host/payout-summary.tsx` (plan 11-13).
//   4. The invite route's `InviteCard` (plan 11-13), which MOVED to
//      `src/components/group/invite-card.tsx` in plan 11-19 when that route gained a not-found
//      boundary required to render a byte-identical surface (T-11-ORACLE). The page imports it now
//      instead of declaring it.
//   5. The hours-missing notice on `src/app/(host)/host/page.tsx` (plan 11-13), as `tone="muted"`.
//      The spec says "notices", plural; a scan finds one other site and it is an inline meta line
//      inside a tile, not a panel.
//
// This list is prose. `tests/design/card-pattern-coverage.test.ts`'s `CARD_SURFACES` carries the
// same five rows with their reasons and is the machine-checked half — if the two ever disagree,
// that file is the one that can fail.
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
  /**
   * WHICH HEADING ELEMENT the title renders as. Always a heading; never a `<p>`.
   *
   * ⚠ THIS PROP IS `EmptyState`'s, ADOPTED RATHER THAN INVENTED (WR-03), and the defect it repairs is
   * the one that pattern's own docblock predicted: *"a fixed level would push every adopter into
   * either a skipped level or a wrong one."* This component hard-coded `<h2>`, and the availability
   * route paid for it — plan 14-12 moved a shipped `<h3>Set your weekly hours</h3>` onto a panel and
   * plan 14-13 mounted `WeekStrip`'s own panel beside it, so a route whose section is already headed
   * `<h2>Weekly hours</h2>` grew two more sibling `<h2>`s for content SUBORDINATE to it. Three
   * siblings at one level where two are children of the third is not an outline; it is a list.
   *
   * The inconsistency was internal to one plan's own work: `blocks-editor.tsx` passes `titleAs="h3"`
   * to `EmptyState` in that same commit, with the identical reasoning written out beside it.
   *
   * THE LEVEL IS THE SURFACE'S DECISION, for `EmptyState`'s reason word for word: a panel that is the
   * only content under the page `<h1>` wants `h2`, and one inside an already-headed section wants
   * `h3`. Nothing here can know which it is, so nothing here decides — the default stays `h2` so
   * every shipped call site keeps the element it already rendered.
   *
   * PLAN 15-06 EXTENDS THAT SAME ARGUMENT ONE MEMBER UPWARD, in the direction 14-12 went downward:
   * on the four `(auth)` routes the panel is not content under a page `<h1>` — it IS the document,
   * so `Log in` / `Create your account` is that document's `<h1>` and there is no heading above it
   * to be subordinate to. A fixed `h2` there would leave four documents with no level-1 heading at
   * all, which is the mirror image of the skipped level 14-12 repaired. The default is untouched at
   * `"h2"`, so this widening moves nothing that ships today.
   */
  titleAs?: "h1" | "h2" | "h3";
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
  titleAs = "h2",
  description,
  footer,
  sticky = false,
  tone = "default",
  children,
}: PanelCardProps) {
  // The heading ELEMENT, chosen by the surface. Capitalised so JSX reads it as a component rather than
  // as the literal tag, and typed by the union above so it can only ever be one of the three levels —
  // `empty-state.tsx`'s idiom, followed rather than re-derived.
  const Title = titleAs;

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
        // ── THE PANEL FLATTENS ON PAPER (plan 13-12 / D-74 / 13-RESEARCH Pitfall 3). ───────────────
        //
        // THIS LIVES HERE AND NOT AT A CALL SITE, and that placement is the whole DS-11 argument rather
        // than a convenience. This file decides the panel's radius, hairline, elevation and padding for
        // all five adopters; how that BOX renders in print media is a property of the same box. A route
        // that reached in to flatten it for itself would be re-deciding the panel's appearance in one
        // medium, which is exactly the fork this component exists to prevent — and it could not do so
        // through props anyway, because `PanelCard` deliberately takes no `className`.
        //
        // IT IS UNCONDITIONAL BECAUSE IT IS UNIVERSALLY CORRECT. Print starts with backgrounds dropped
        // (Chrome's Background graphics box is off by default), so a panel that kept its fill on screen
        // and lost it on paper would print a hairline ring around nothing — a box drawn for a surface
        // that is not there. Flattening states the same thing the medium was going to do anyway, and
        // ⚠ AND THERE IS NO ELEVATION UTILITY HERE, THOUGH 13-UI-SPEC's PRINT CONTRACT LISTS ONE.
        // The spec's row reads `print:bg-transparent print:ring-0 print:shadow-none`, and the third of
        // those is INERT on this component: the header above states, at length, that a panel is flat at
        // rest and that there is no `shadow-` utility in this file and must not be one. Removing a
        // shadow that cannot exist documents nothing; it only adds a call site.
        //
        // It was written first and `elevation-z.test.ts` measured it, which is the reason this note is
        // a measurement rather than an opinion: `expected { …(4) } to deeply equal { …(3) }`, the pin
        // reporting a SIXTH `shadow-none` site against an inventory of five that all live in vendored
        // `ui/` files. A pinned inventory going red on a redundant class is the pin doing its job, and
        // the fix is to delete the class rather than to move the number.
        //
        // The forward rule from 13-UI-SPEC § The Print Contract is what the two remaining utilities
        // preserve: *the receipt never relies on a painted background.* That is a property to keep, not
        // a value to re-tune — it survives `.dark` ever being activated, which is why nothing here
        // forces exact colour.
        "print:bg-transparent print:ring-0",
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
        // the header, so all three sites agreed from that point on.
        //
        // BOTH RAILS HAVE SINCE MOVED ONTO THIS PROP (plan 11-13), so the arithmetic is written in
        // exactly one place now — here. `sticky-offset.test.ts`'s pinned site count went 3 → 1 in
        // that commit, which is the measurement plan 11-10 predicted and the shape of a correct
        // conversion: a count that had stayed at 3 would have meant the two rails kept their own
        // offsets alongside the prop. The one site that remains is this file's own encoded offset,
        // and it is the only one of the three that was never wrong to begin with.
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
            {title ? <Title className="text-heading">{title}</Title> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        ) : null}
        {children}
      </CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
