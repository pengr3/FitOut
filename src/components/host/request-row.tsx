"use client";

// RequestRow + RequestActions — the host request-inbox row (HOST-01 · D-65). RequestRow is the mobile
// stacked card; RequestActions is the Approve/Decline control wired to the 06-07 owner-gated, atomic,
// SLA-guarded server actions. The desktop shadcn table (rendered by /host/requests page) reuses
// RequestActions + RequestCountdown per row directly.
//
// D-65 discretionary lock: Approve = neutral `default` solid, INLINE + direct (the affirmative,
// reversible-by-timer path; the booker still must pay to confirm). Decline = neutral `outline` opening a
// confirm overlay before firing (the irreversible "no" that rejects a real person + frees the slot). NO coral
// on the inbox (mirrors /host/earnings' calm neutral surface). Money is the SERVER-FROZEN quote (formatMoney
// display only — zero arithmetic). Freshness is via revalidatePath inside the actions (no polling).
//
// This file is `"use client"` and `RowCard` is authored as a Server Component. Importing it here compiles
// it into the client bundle, which is correct and not a boundary leak: the pattern renders markup, imports
// no domain module, and reaches only `ui/card`, `next/link` and two design constants.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT PLAN 14-03 CHANGED, AND WHICH DECISION FORCED EACH CHANGE (HFLOW-01)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// 11-11 swapped the CONTAINER onto `patterns/row-card.tsx` and deliberately changed nothing else,
// leaving three questions open and naming Phase 14 as their owner. This is the plan that answers them.
//
//   1. D-144 — THE ROW IS TERMINAL, AND THAT IS NOW A DECISION RATHER THAN AN INHERITANCE.
//      `RowCard`'s optional `href` stays unused. A triage queue that browses is no longer a triage
//      queue, and two places carrying approve/decline is two places that must be kept in agreement.
//      Everything needed to decide is ON the row: guest, space, venue-local window, the server-frozen
//      total and the SLA deadline. `tests/host/request-row.test.tsx` asserts the terminality as a
//      RENDERED fact — zero anchors and zero link-role elements inside the card — so a later plan that
//      adds a destination fails there rather than in review.
//
//   2. D-146 — THE DEADLINE LEADS, AND "LOUDEST" IS CARRIED BY SCALE AND POSITION, NEVER BY A HUE.
//      The countdown moves into `RowCard`'s `status` slot with the shared component's new
//      `emphasis="lead"`, which puts the largest type in the row on the row's FIRST line. The money
//      figure moves the other way — out of `trailing` and into the description list — so it can no
//      longer read as the row's headline figure. Neither the money nor the guest name is enlarged,
//      weighted or coloured to compete: both render at the same declared value class below.
//
//   3. D-145 — DECLINE CONFIRMS THROUGH THE APP'S ONE OVERLAY PRIMITIVE; APPROVE STAYS ONE PRESS.
//      The directly-composed overlay is gone. `ResponsiveDialog` composes the same vendored dialog;
//      what it adds is the below-`sm:` bottom-sheet presentation, which is the whole reason a host
//      confirming a decline on a phone gets a reachable overlay. ⚠ THIS FILE IS THE FIRST HOST-SIDE
//      ADOPTER — 14-CONTEXT D-145 states the pattern is "already used by the host cancel dialog" and
//      that is measurably false: `host-cancel-dialog.tsx` imports the vendored dialog directly. That
//      file is NOT converted here; it was not named for conversion, and converting a second overlay on
//      the strength of a corrected footnote is scope this plan did not budget.
//      NEITHER ACTION'S SERVER SEMANTICS CHANGE (D-130): `approveRequest` and `declineRequest` are
//      called with the same arguments, in the same order, behind the same in-flight labels.
//
//   4. A REFUSED ACTION NOW REPORTS ON THE ROW, NOT IN A TOAST THAT IS GONE ON REFRESH.
//      On SUCCESS the action revalidatePath's the inbox and this row refreshes away, so a toast is the
//      only possible report — both success toasts therefore stay exactly as they were. On REFUSAL — a
//      lapsed SLA, a request another tab already actioned — the row is still on screen, and the sentence
//      explaining why belonged in a dismissible, timed, unaddressable overlay. Both refusal toasts are
//      deleted and ONE named in-row status region takes their place, carrying the server action's own
//      sentence verbatim. One outcome, one announcement (GATE-03 rule 6) — a region PLUS a toast is two.
//
// ⚠ REQUESTACTIONS RENDERS ON TWO SURFACES. `/host/requests` mounts it through this card's `actions`
// slot, and `/host/bookings`' desktop table mounts it directly in the Actions cell of every `requested`
// row (`bookings/page.tsx:265-271`). Every change in this file is a change to both, which is why the
// touch sizing below is written down as deliberate rather than left to be discovered, and why
// `tests/booking/host-booking-row.test.tsx` passing UNEDITED is this plan's proof of the coupling.

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RowCard } from "@/components/patterns/row-card";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { RequestCountdown } from "@/components/booking/request-countdown";
import { approveRequest, declineRequest } from "@/app/actions/host-requests";
import { APPROVAL_PAYMENT_WINDOW_HOURS } from "@/lib/payments/config";
import { REQUEST_STATUS_CAP } from "@/lib/design/measurements";

export type RequestRowData = {
  requestId: string;
  spaceTitle: string;
  /** Pre-formatted, venue-tz-safe window label "{date}, {time} ({City} time)". */
  whenLabel: string;
  /** Booker first name, or "A guest" when withheld. */
  bookerLabel: string;
  /** Pre-formatted, server-frozen quoted total (formatMoney) — the UI does ZERO price arithmetic. */
  totalLabel: string;
  /** ISO expires_at for the hours-scale SLA countdown (DB clock is the authority; this is a display cue). */
  expiresAt: string;
};

/**
 * The refusal region's NAME, which is a different mechanism from its CONTENT.
 *
 * `role="status"` is `nameFrom: author` in ARIA — a status region takes NO name from its own text — so
 * without an author-supplied label the accessible name is the empty string. `live-regions.ts`'s rule 5
 * requires a non-empty one.
 *
 * ⚠ IT IS A LABEL, NOT A SECOND COPY OF THE SENTENCE, following `share-link-box.tsx:109-121` and for the
 * measured reason recorded there: on the VoiceOver/Safari pairing a NAMED live region can be announced by
 * its name INSTEAD of its content, so a name that duplicated the sentence would read it twice and a name
 * that paraphrased it would replace it with a worse version. Three words that say which region this is,
 * and the server's sentence stays the content.
 */
const REFUSAL_REGION_NAME = "Request not actioned";

/**
 * The description list's VALUE class — ONE constant, so the two values cannot drift apart.
 *
 * D-146's third falsifiable is that the money figure and the guest name compute an IDENTICAL size and
 * weight: neither is promoted to compete with the deadline. Two hand-typed class strings are two chances
 * to promote one of them by accident, and the promotion would be invisible in review.
 */
const ROW_VALUE_CLASS = "text-label";

/** The money value — the same role as the guest name, plus the figure treatment. Derived, never retyped. */
const ROW_MONEY_CLASS = `${ROW_VALUE_CLASS} tabular-nums`;

/**
 * The status slot's content class — the row rhythm, plus the DECLARED ceiling on how wide that column
 * may grow.
 *
 * ⚠ THE CEILING IS NOT COSMETIC, AND IT WAS MEASURED RATHER THAN PREDICTED (deferred item `[14-03]`,
 * discharged by plan `14-06`). `RowCard` renders the status column `shrink-0`, so it keeps its
 * max-content width at every viewport and the title column beside it absorbs the whole squeeze. That is
 * fine for `Expires in` over `23h 45m`; it is not fine once the D-99 cap-shortened reason SENTENCE
 * shares the slot. At the 320px floor, before this cap: the column measured 235.34px, the countdown
 * inside it needed 84.20px, and the space title was left **8.66px** — an ellipsis where the name of the
 * space being requested should be.
 *
 * The number, its derivation and what it deliberately does not do live on `REQUEST_STATUS_CAP` in
 * `measurements.ts`. It is applied to this CONTENT div rather than to the pattern's column because a
 * definite max-width on the child is what caps the flex item's intrinsic size, and because relaxing
 * `shrink-0` on `row-card.tsx` would change all four adopters to fix one.
 */
const ROW_STATUS_CLASS = `space-y-0.5 ${REQUEST_STATUS_CAP}`;

/**
 * RequestActions — the Approve (inline, direct) + Decline (confirm-overlay) control. Both call the 06-07
 * owner-gated/atomic/SLA-guarded server actions; the actions revalidatePath so the row refreshes away on
 * success. A 0-row result (lapsed / already actioned — the 06-06 cron or another tab won the race) surfaces
 * the server's own calm sentence in the in-row region below, never a crash and never a toast.
 */
export function RequestActions({
  requestId,
  bookerLabel,
  whenLabel,
}: {
  requestId: string;
  bookerLabel: string;
  whenLabel: string;
}) {
  const [approving, setApproving] = React.useState(false);
  const [declining, setDeclining] = React.useState(false);
  const [declineOpen, setDeclineOpen] = React.useState(false);
  // ONE refusal slot for BOTH paths. Two states would render two regions on a row that can only ever
  // have refused one thing, and two regions for one outcome is the shape GATE-03 rule 6 forbids.
  const [refusal, setRefusal] = React.useState<string | null>(null);

  async function handleApprove() {
    if (approving) return; // double-click guard even before the disabled attribute applies
    setApproving(true);
    setRefusal(null);
    try {
      const res = await approveRequest(requestId);
      if (res.ok) {
        // On success the action revalidatePath's the inbox — this row refreshes away; keep the button
        // disabled through the transition. The booker is asked to pay within the payment window.
        // A TOAST IS THE ONLY POSSIBLE REPORT HERE, which is why this one stays: there is no row left
        // to write on by the time the report is due.
        toast.success(
          `Request approved. We've asked ${bookerLabel} to pay — the slot stays held for ${APPROVAL_PAYMENT_WINDOW_HOURS} hours.`,
        );
      } else {
        // THE SERVER'S OWN SENTENCE, VERBATIM. No client-side re-authoring: a second wording of a
        // refusal is a second thing that has to be kept in agreement with the action that refused.
        setRefusal(res.error);
        setApproving(false);
      }
    } catch (e) {
      setApproving(false);
      throw e;
    }
  }

  async function handleDecline() {
    if (declining) return;
    setDeclining(true);
    setRefusal(null);
    try {
      const res = await declineRequest(requestId);
      if (res.ok) {
        toast.success(`Request declined. The slot is free again and we've let ${bookerLabel} know.`);
        setDeclineOpen(false);
      } else {
        setRefusal(res.error);
        setDeclining(false);
        setDeclineOpen(false);
      }
    } catch (e) {
      setDeclining(false);
      throw e;
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* BOTH CONTROLS ARE TOUCH-SIZED AT EVERY WIDTH (DS-09's 44px bar), and that is deliberate on
            BOTH surfaces this cluster renders on — the inbox card AND the requested rows of
            /host/bookings' desktop table. A 44px primary is the floor every Phase-14 surface asserts,
            and a control that is only reachable-sized on the surface somebody remembered is not a floor.
            The table row grows a little as a result; a host approving a real booking on a phone is the
            case that decides this one. */}
        {/* Approve — neutral solid, inline + direct (no overlay). Disable-on-click → "Approving…". */}
        <Button
          size="touch"
          onClick={handleApprove}
          disabled={approving}
          aria-disabled={approving}
          aria-label={`Approve request from ${bookerLabel}`}
        >
          {approving ? "Approving…" : "Approve"}
        </Button>

        {/* Decline — neutral outline opening the SHARED overlay (the irreversible "no"). The variant does
            not change and never becomes the alarm one: declining a request is an expected lifecycle
            outcome, not a fault.

            `onCloseAutoFocus` is deliberately LEFT UNDEFINED. `responsive-dialog.tsx:180-201` records the
            measured Radix defect it exists for — an adopter whose trigger UNMOUNTS while the overlay is
            open loses the browser's focus restore — and this trigger is stable, so Radix's own behaviour
            is correct here and taking the decision over would be a claim with no basis.

            The footer's "Keep it" closes through the CONTROLLED state rather than a vendored
            `DialogClose`: this file reaches the overlay through the one pattern and imports nothing from
            the vendored dialog module, which is what keeps the primitive single. */}
        <ResponsiveDialog
          open={declineOpen}
          onOpenChange={setDeclineOpen}
          title="Decline this request?"
          description={`We'll let ${bookerLabel} know their request for ${whenLabel} wasn't available, and free the slot for other guests. This can't be undone.`}
          trigger={
            <Button variant="outline" size="touch" aria-label={`Decline request from ${bookerLabel}`}>
              Decline
            </Button>
          }
          footer={
            <>
              <Button variant="ghost" disabled={declining} onClick={() => setDeclineOpen(false)}>
                Keep it
              </Button>
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={declining}
                aria-disabled={declining}
              >
                {declining ? "Declining…" : "Decline request"}
              </Button>
            </>
          }
        />
      </div>

      {/* THE ONE REFUSAL REGION, replacing the two toasts that used to carry this sentence.
          Ordinary ink at the label role — no alarm colour, because a lapsed SLA or a request another tab
          already answered is an expected outcome and not a fault of the host's. No retry affordance
          either: the row's OWN controls are the retry, and a second button that re-presses the first one
          is a control that acts on nothing. */}
      {refusal ? (
        <p role="status" aria-label={REFUSAL_REGION_NAME} className={ROW_VALUE_CLASS}>
          {refusal}
        </p>
      ) : null}
    </div>
  );
}

/**
 * RequestRow — the mobile stacked card. The desktop table row is rendered by the page.
 *
 * `countdownReason` is the D-99 sibling line (07-12), passed in as an already-rendered ReactNode rather than
 * derived here. It is a SERVER component that needs the row's `created_at`, `starts_at` and the DB clock —
 * none of which belongs in a client card — so the page renders it and hands it down through this slot. The
 * mobile card and the desktop table therefore render the SAME node. Absent, nothing renders beneath the
 * deadline.
 */
export function RequestRow({
  row,
  countdownReason,
}: {
  row: RequestRowData;
  countdownReason?: React.ReactNode;
}) {
  return (
    <RowCard
      /* NO `href` — D-144, and Phase 14 has now DECIDED rather than inherited it: the inbox row is
         terminal, it browses nowhere, and `RowCard`'s optional slot stays unused. `payout-row.tsx` is
         the other terminal adopter. `tests/host/request-row.test.tsx` holds the decision. */
      /* NO `media` either: a request row has never had a thumbnail, and the pattern omits the box
         rather than drawing an empty square. */
      title={row.spaceTitle}
      meta={row.whenLabel}
      /* THE DEADLINE LEADS (D-146). `status` is the pattern's declared top-right region, which puts the
         row's largest type on its FIRST line without inventing a slot. The D-99 reason sits beneath the
         digits on the same rhythm it had before, muted and never an alarm colour.
         NO `trailing`: the money moved into the description list below, precisely so it cannot read as
         this row's headline figure. */
      status={
        <div className={ROW_STATUS_CLASS}>
          <RequestCountdown expiresAt={row.expiresAt} label="Expires in" emphasis="lead" />
          {countdownReason}
        </div>
      }
      actions={
        <RequestActions
          requestId={row.requestId}
          bookerLabel={row.bookerLabel}
          whenLabel={row.whenLabel}
        />
      }
    >
      {/* The `<dl>` carries BOTH facts a host weighs after the deadline — who is asking, and what they
          pay — at the SAME declared value class. See `ROW_VALUE_CLASS`: equality here is the whole point,
          not an accident of two similar strings. */}
      <dl className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-label text-muted-foreground">Guest</dt>
          <dd className={ROW_VALUE_CLASS}>{row.bookerLabel}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-label text-muted-foreground">Guest pays</dt>
          <dd className={ROW_MONEY_CLASS}>{row.totalLabel}</dd>
        </div>
      </dl>
    </RowCard>
  );
}
