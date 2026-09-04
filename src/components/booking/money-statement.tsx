// MoneyStatement (STATE-06 · D-73 · D-94) — THE single owner of every "where is your money" sentence on
// `/bookings/**`.
//
// D-73's argument, in its own words: *three bespoke paragraphs are three things that drift; one component
// is one thing that is testable.* Before this file the pending, reversed and cancelled branches each
// wrote their own `<p>`, in their own place, at their own weight — three copies of one fact, and no way
// to assert that the fact was stated at all. One component means the sentence cannot be omitted on a
// branch, cannot be spelled twice on a surface, and has exactly one box to measure.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ZERO-ARITHMETIC CONTRACT (D-130 / GATE-05 · T-13-02-MONEYCROSS)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `refund-breakdown.tsx:3-15` states it for the itemisation; this is the same contract for the sentence,
// and it is stricter here because a sentence has nowhere to hide a rounding. THE WHOLE SENTENCE ARRIVES
// FINISHED. This component does not add, subtract, round, percentage, compare, format or even CONCATENATE
// a money figure. There is no `number` prop for it to do any of that to, and that absence is the design:
// the amount a booker reads must be the amount the server wrote, composed in the RSC that read the row.
// If you find yourself wanting a `cents` prop here, the arithmetic belongs upstream.
//
// The consequence for the `sentence` prop is that it is not a template either — the caller passes the
// completed string, including its money figure and its rail name. A component that interpolated would be
// a second copywriter no reviewer could see.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// D-94 — WHERE THIS MOUNTS, AND THE ONE THING AN EXECUTOR MUST NOT DO
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// IT MOUNTS ONLY ON A STATUS WHOSE SENTENCE IS SPECIFIED, and 13-UI-SPEC § Copywriting Contract → The
// money statement specifies FOUR: **pending**, **not completed**, **reversed** and **cancelled**. On
// every other status it is ABSENT — those statuses carry their money facts through the status-meaning
// sentence and the itemised-total panel, which already own them.
//
// ⚠ IF A FIFTH STATUS APPEARS TO NEED A MONEY SENTENCE, THAT IS A QUESTION TO RAISE, NOT A SENTENCE TO
//   WRITE. D-94 says so in those terms. An invented sentence is an un-reviewed claim about somebody's
//   money, on the one surface where being wrong is expensive.
//
// ─── The one reconciliation to state out loud, so a reviewer does not read it as a contradiction ───
//
// The CANCELLED branch says *"{₱X} refund on its way"* and NEVER *"refunded"*, because a booker-initiated
// cancel records only the refund INTENT (PROJECT D-57). The REVERSED branch says *"We've refunded {₱X} in
// full"*, because that describes an action FitOut took, and it is paired in the same breath with a
// VERIFIED window (D-83: card *up to 30 days*, GCash *within 24 hours*, Maya *within 24 hours* — and QR
// Ph gets no window at all, because it routes to a manual return that must never use the word
// "refunded"). Two sentences because they are two different facts. Neither wording is a style choice and
// neither may be harmonised into the other.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// COMPOSITION AND PLACEMENT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • `PanelCard tone="muted"` — Phase 11's DECLARED in-page advisory surface (DS-11). Never a raw
//     `<Card>`, never a toast, never an `Alert`, never a fourth container: DS-11 says three, and a fourth
//     boxed shape is a scope alarm. `tone="muted"` costs zero new colour pairings — `foreground on muted`
//     and `muted-foreground on muted` are both already declared and measured in `contrast-pairs.ts`.
//   • NO PADDING OF ITS OWN. `PanelCard`'s `CardContent p-4 sm:p-6` is the panel's only padding
//     (`panel-card.tsx:88-99`), and a wrapper that also supplies `bg-card ring-1 rounded-xl` pays the
//     block padding twice — measured at 112px against 80px for the row card's twin of this problem.
//   • THE HOOK SITS ON A WRAPPER, NOT ON THE PANEL, and that is the shape the tree already uses:
//     `src/app/(legal)/terms/page.tsx:147-152` records both halves of the reason. `PanelCard` owns its
//     own `data-testid="panel-card"` and takes no pass-through props; and `selector-contract.test.ts`'s
//     collector is an AST walk over JSX attributes whose value is a STRING LITERAL, so an id threaded
//     through a prop would be invisible to the contract in both directions.
//     The wrapper is a bare `<div>` with no box of its own, so its `boundingBox()` IS the panel's — which
//     matters, because STATE-06's assertion is that this element's `y + height` fits inside the initial
//     viewport, and a hook on the inner content would silently exclude the panel's own padding from the
//     measurement and pass a panel whose bottom edge is off screen.
//   • PLACEMENT IS THE CALLER'S HALF OF THE CONTRACT: the first element after the heading block, with no
//     element between the `<h1>` and this panel (13-UI-SPEC § The Money Statement).
//   • NO LIVE REGION. This is page content that is already there when the page arrives, not an
//     announcement — see 13-UI-SPEC § Live Regions. The politeness attribute appears NOWHERE in this
//     file and must not be added; the pending state's SETTLEMENT announcement is a different element
//     with a different owner.
//
//     THE ATTRIBUTE IS NAMED DESCRIPTIVELY ABOVE RATHER THAN QUOTED, and that is a measured choice
//     rather than a stylistic one — `booking-row.tsx:112`'s precedent, and the same trap plan 13-01
//     hit in its own Task 2. This plan's acceptance criterion for this file IS a raw grep for the
//     attribute returning ZERO, so the only way to write "this file does not carry it" while keeping
//     the criterion checkable in the form it was written is not to write it. The first draft of this
//     very paragraph quoted it and made the criterion read 1 against a correct file.
//
// A SERVER COMPONENT in the domain layer: it takes product copy, so it belongs under `components/booking/`
// rather than `patterns/` (`result-card.tsx`'s membership rule). No hooks, no client-boundary directive.

import type { ReactNode } from "react";

import { PanelCard } from "@/components/patterns/panel-card";

export type MoneyStatementProps = {
  /**
   * THE FINISHED SENTENCE — server-composed, including any money figure and rail name, rendered
   * verbatim. See the zero-arithmetic block above: there is deliberately no `number` prop on this
   * component, and this string is not a template.
   *
   * e.g. `"We've refunded ₱1,428.00 in full."` · `"You haven't been charged."`
   */
  sentence: string;
  /**
   * The second line: the verified refund window, the reference, or the guarded support control.
   *
   * `ReactNode` rather than `string` because 13-UI-SPEC's own examples for this slot are ELEMENTS — the
   * reversed state's detail carries `<SupportPath/>`, the manual branch's carries the reference. That is
   * also why the line-2 container below is a `<div>` and not a `<p>`: flow content inside a paragraph is
   * invalid HTML, and the browser silently closes the `<p>`, which reparents the control out of the
   * statement and quietly breaks any assertion scoped to this panel.
   */
  detail?: ReactNode;
};

export function MoneyStatement({ sentence, detail }: MoneyStatementProps) {
  return (
    <div data-testid="money-statement">
      <PanelCard tone="muted">
        <div className="space-y-1">
          {/* LINE 1 — the money truth. `text-body font-semibold text-foreground`, and `tabular-nums`
              so the figure inside it lines up with the itemisation above and below it.

              IT IS A `<p>` AND IT STAYS ONE. 13-UI-SPEC § Typography rule 3: a semibold paragraph
              standing in for a heading is the shortcut Phase 11 removed from the empty states and
              Phase 12 from the key-facts strip. This is a sentence, not an outline entry. */}
          <p className="text-body font-semibold tabular-nums text-foreground">{sentence}</p>
          {/* LINE 2 — the window, or what to do next. Absent entirely when there is nothing to say;
              an empty second line reads as a missing sentence rather than as none. */}
          {detail !== undefined ? (
            <div className="text-label text-muted-foreground">{detail}</div>
          ) : null}
        </div>
      </PanelCard>
    </div>
  );
}
