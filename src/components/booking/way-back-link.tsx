// WayBackLink (12-CONTEXT D-59 §2 · 13-CONTEXT D-101.2) — the checkout's one explicit, safe way out.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE REQUIREMENT, AND WHY IT NOW HAS A COMPONENT INSTEAD OF LIVING INLINE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 12-CONTEXT D-59 §2 is unusually specific for a context document, because the failure it describes is
// self-inflicted: the checkout deliberately has NO header navigation (SHELL-03 — a linked wordmark on a
// page holding a live 15-minute hold is a way to lose the hold by accident), so without one explicit
// way back the page *"reads as a dead end and the abandonment it causes is self-inflicted"*. The
// requirement is *one explicit, safe way back … that states the hold is kept.*
//
// IT SHIPPED AS `variant="ghost"`, WHICH IS PLAIN BODY TEXT UNTIL YOU HOVER IT. The PM found it in live
// UAT: on `/listings/[id]/book` the only way out of the checkout was invisible. Every clause of D-59
// was satisfied except the one the whole paragraph is about — a booker has to be able to SEE it. A
// requirement stated in prose, implemented inline in a 700-line RSC and asserted only for its label and
// its href is a requirement that can ship looking like nothing at all, which is exactly what happened.
//
// So it is a component now, with a hook and its own cases. Not because the markup is complicated — it
// is nine lines — but because D-59 §2 is a real requirement and it had no owner and no test that could
// see the thing it is actually about.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// `outline`, AND WHY NOT SOMETHING LOUDER OR QUIETER
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `outline` is the product's neutral secondary: a real bordered control with a background, the same
// weight `Cancel booking`, `View receipt` and `Manage group` carry on the booking detail. It reads as
// something you can press from across the room, and it reads as clearly NOT the primary.
//
//   • NOT `brand`. The checkout's coral is `Confirm & pay`, and one accent per viewport is a standing
//     rule (10-CONTEXT § button hierarchy). A coral escape hatch beside a coral commit is two equal
//     invitations at the moment of payment, and the wrong one is free to press.
//   • NOT `secondary`. The filled grey sits visually closer to the primary than the outline does, and
//     on this page the only thing that should look filled is the thing that takes the money.
//   • NOT `ghost` — the defect. Ghost contributes only hover states; at rest it is indistinguishable
//     from the paragraph beneath it.
//   • NOT `link`. Underlined text is what D-59 §2 already rejected in effect: the point of the clause
//     is an affordance, and prose that happens to be clickable is the thing that failed UAT.
//
// `size="touch"` is preserved from the shipped call site — DS-09's 44px target, opt-in and not a
// responsive default (D-22) — because this is a booker-facing control on a mobile checkout, which is
// the exact case that opt-in exists for.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE PROMISE BENEATH IT IS NOT DECORATION — IT IS WHAT MAKES A LINK SAFE HERE AT ALL
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// *"We'll keep your hold — the timer keeps running."* The hold is a real row with a real expiry, and a
// booker who does not know it survives a look at the listing will sit on this page rather than check
// the thing they wanted to check. The sentence is rendered by this component rather than left to the
// call site, so the control and its promise cannot be separated by an edit to either one.
//
// ⚠ THE `href` MUST NOT CARRY THE RESUME DISCRIMINATOR. `book-cta.tsx` re-fires a hold on arrival when
// it sees one, which would turn this link into a hold-creating GET — the T-04-GETDUP shape, arriving
// through the one anchor SHELL-03 allows (T-12-03-GETDUP). The caller composes the href from the
// hold's own frozen instants; `e2e/shell.spec.ts` asserts the rendered href carries no `resume`, and
// case (5) below asserts it from the component's side so a bad caller fails in unit time.
//
// ⚠ AND THERE IS EXACTLY ONE ANCHOR IN HERE. `<main>` on this route must hold exactly one `<a href>`
// (SHELL-03, asserted in `e2e/shell.spec.ts` at 320 and 1280): zero traps the booker on a page whose
// header deliberately has nothing to click, and two or more re-opens the wandering-off problem. This
// component is that one anchor, so it may never grow a second.

import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * The label and the promise, as TS constants rather than JSX text — `react/no-unescaped-entities`
 * makes a literal apostrophe in JSX an error, so the promise written inline would have to be
 * `We&apos;ll`, and the source would stop being the same bytes as the sentence `e2e/shell.spec.ts`
 * matches. DELIBERATELY NOT EXPORTED: these are a copy contract, so
 * `tests/booking/way-back-link.test.tsx` retypes them from 12-UI-SPEC instead — a test importing them
 * would compare the component to itself and pass through any rewording.
 */
const LABEL = "Back to the listing";
const HOLD_PROMISE = "We'll keep your hold — the timer keeps running.";

export type WayBackLinkProps = {
  /**
   * `/listings/{id}` with the window recomposed from the hold's OWN frozen instants, and never a
   * `resume` discriminator — see the header for why that would make this a hold-creating GET.
   */
  href: string;
};

export function WayBackLink({ href }: WayBackLinkProps) {
  return (
    <div data-testid="checkout-way-back">
      <Button asChild variant="outline" size="touch">
        <Link href={href}>{LABEL}</Link>
      </Button>
      <p className="mt-1 text-xs text-muted-foreground">{HOLD_PROMISE}</p>
    </div>
  );
}
