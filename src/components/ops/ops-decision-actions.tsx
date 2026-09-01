"use client";

// OPS-03 / OPS-05 / ENF-01 — THE DECISION CONTROLS, AND THE ONE NAMED REFUSAL REGION.
//
// Three affordances, and their WEIGHTS are the design:
//
//   1. APPROVE — neutral SOLID `<Button size="touch">`, inline, ONE press, no overlay. Never the
//      brand variant: an ops reviewer approving forty listings must not be nudged toward yes by a
//      colour, which is the same call `request-row.tsx` and `/host/earnings` already record. Approve
//      carries NO reason field — OPS-05 scopes the reason to the REFUSAL, and an approval's message
//      to the host is its outcome. The host is still told (plan 18-09).
//   2. REJECT — neutral OUTLINE, and it can never be one press, because a rejection needs a reason.
//      It opens the dialog and nothing else.
//   3. THE ENFORCEMENT ESCALATION — NOT A CONTROL HERE AT ALL. It lives inside the dialog, behind a
//      radio whose default is always the lighter lever. There is nothing on this row that can
//      cancel-and-refund, which is the whole answer to "it must not be hit by muscle memory".
//
// Both controls are 44px at every width (DS-09's `size="touch"`) and WRAP onto two lines rather than
// shrinking, on the argument `request-row.tsx` records: a control that is only reachable-sized on the
// surface somebody remembered is not a floor.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE REFUSAL REGION — ONE PER ROW, AND EXACTLY ONE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// On SUCCESS the queue refreshes and the row goes away, so a toast is the only possible report —
// there is no surface left to write on by the time the report is due. On REFUSAL the row is still on
// screen and the sentence belongs ON it, not in a dismissible, timed, unaddressable overlay. One
// outcome, one announcement (GATE-03 rule 6).
//
// ONE refusal slot is shared by approve and reject, because a row can only ever have refused one
// thing; two slots would render two regions for one outcome, which is the shape rule 6 forbids.
//
// ⚠ THE SENTENCE IS THE SERVER ACTION'S OWN, VERBATIM. No client re-authoring anywhere in this file:
// a second wording of a refusal is a second thing that has to be kept in agreement with the action
// that refused. That is also why the reject dialog is GENERIC over its taxonomy — a non-generic
// dialog would hand back a widened `string`, the cast back would need an impossible-branch fallback,
// and that fallback would be a client-authored refusal sentence.
//
// The region is NAMED "Decision not recorded" — a LABEL, not a second copy of the sentence, on
// `share-link-box.tsx:109-121`'s measured grounds: on the VoiceOver/Safari pairing a named live
// region can be announced by its NAME instead of its CONTENT, so a name duplicating the sentence
// would read it twice and a name paraphrasing it would replace it with a worse version. Ordinary
// ink, no alarm colour, and no retry affordance — the row's own two controls are the retry.
//
// ⚠ THE QUEUE DOES NOT CLEAR ITSELF YET. `ops-review.ts` deliberately does not revalidate `/ops`,
// because the route does not exist until plan 18-12, which owns adding it (18-05-SUMMARY § Carried
// forward). Until then a successful decision reports through its toast and the row stays until the
// next navigation; pressing again is refused calmly by the action's own guard and the sentence lands
// in the region below. Nothing here papers over that with a client-side refresh, which would be this
// file quietly taking a decision that belongs to the route.

import * as React from "react";
import { toast } from "sonner";

import { OpsRejectDialog, type OpsRejectChoice } from "@/components/ops/ops-reject-dialog";
import { Button } from "@/components/ui/button";
import {
  approveHost,
  approveListing,
  rejectHost,
  rejectListing,
} from "@/app/actions/ops-review";
import { cancelBookingAsOps } from "@/app/actions/cancel-booking";
import type { OpsCancelImpact } from "@/lib/ops/cancel-impact";
import {
  HOST_REJECT_REASONS,
  LISTING_REJECT_REASONS,
  OPS_ENFORCEMENT_LEVERS,
  type HostRejectReason,
  type ListingRejectReason,
} from "@/lib/validation/ops";

/**
 * The refusal region's NAME. Three words that say WHICH region this is.
 *
 * Exported so the specs and `live-regions.ts` read the string instead of retyping it — the
 * `HOST_REQUEST_RULE` idiom.
 */
export const OPS_REFUSAL_REGION_NAME = "Decision not recorded";

/** The heavier lever, read from the schema's tuple so this file states no policy of its own. */
const ESCALATION_LEVER = OPS_ENFORCEMENT_LEVERS[1];

/** The row's shared value class — ordinary ink at the label role, nothing promoted. */
const ROW_VALUE_CLASS = "text-label";

/**
 * What a decision is being made ABOUT.
 *
 * A DISCRIMINATED UNION on `kind`, branched on the discriminant, with every per-kind lookup below
 * keyed as a TOTAL `Record` over it — `payout-state-badge.tsx:53-62`'s exhaustiveness lesson, so a
 * third kind fails to COMPILE rather than throwing at runtime in front of an operator.
 */
export type OpsDecisionSubject =
  | {
      kind: "host";
      userId: string;
      /** What the controls are named after — the host's display name, or a stand-in. */
      label: string;
      /** Who gets told. On a host row this is the same person as `label`. */
      hostLabel: string;
    }
  | {
      kind: "listing";
      listingId: string;
      label: string;
      hostLabel: string;
      /**
       * The server-computed figures, and — the part that makes the escalation real — the ids of the
       * bookings it would cancel. Every money field is a finished string; this component performs no
       * arithmetic on any of them.
       */
      impact: OpsCancelImpact;
    };

type OpsDecisionKind = OpsDecisionSubject["kind"];

/** The overlay's accessible name, per kind. */
const DIALOG_TITLE: Record<OpsDecisionKind, string> = {
  host: "Reject this host?",
  listing: "Reject this listing?",
};

/** The confirm's plain-language act under the LIGHTER lever, per kind. */
const CONFIRM_LABEL: Record<OpsDecisionKind, string> = {
  host: "Reject host",
  listing: "Reject listing",
};

/** What that confirm says while the action runs. */
const SUBMITTING_LABEL: Record<OpsDecisionKind, string> = {
  host: "Rejecting…",
  listing: "Rejecting…",
};

/**
 * ⚠ "This can't be undone here" IS EXACT AND IS NOT SOFTENING. It is true — there is no un-reject
 * action in this console — and it deliberately promises no appeal, no reply and no route back. Host
 * appeals are backlog 999.6 and OUT (D-243).
 */
function rejectDescription(hostLabel: string): string {
  return `${hostLabel} will be told, and will see the reason you pick below. This can't be undone here.`;
}

export function OpsDecisionActions({ subject }: { subject: OpsDecisionSubject }) {
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  // ONE slot for BOTH paths — see the header. A second refusal replaces this sentence with the next.
  const [refusal, setRefusal] = React.useState<string | null>(null);

  async function handleApprove() {
    if (approving) return; // double-press guard, before the disabled attribute can apply
    setApproving(true);
    setRefusal(null);
    try {
      const res =
        subject.kind === "host"
          ? await approveHost({ userId: subject.userId })
          : await approveListing({ listingId: subject.listingId });

      if (res.ok) {
        toast.success(`Approved. We've told ${subject.hostLabel}.`);
      } else {
        setRefusal(res.error);
        setApproving(false);
      }
    } catch (e) {
      setApproving(false);
      throw e;
    }
  }

  async function handleRejectHost(choice: OpsRejectChoice<HostRejectReason>) {
    if (subject.kind !== "host") return;
    const res = await rejectHost({
      userId: subject.userId,
      reason: choice.reason,
      note: choice.note.trim().length > 0 ? choice.note : undefined,
    });
    if (!res.ok) {
      setRefusal(res.error);
      setRejecting(false);
      return;
    }
    toast.success(`Not approved. We've told ${subject.hostLabel} why.`);
    setRejectOpen(false);
  }

  async function handleRejectListing(choice: OpsRejectChoice<ListingRejectReason>) {
    if (subject.kind !== "listing") return;
    const note = choice.note.trim().length > 0 ? choice.note : undefined;

    // THE LIGHTER ACT FIRST, ALWAYS. Blocking new bookings is what BOTH levers do; the cancellations
    // are the escalation applied to a listing that has already been judged. A refusal here — another
    // operator got there first, the listing left `pending` — must stop the whole thing, or this
    // console would cancel real bookings on a listing it did not actually reject.
    const res = await rejectListing({
      listingId: subject.listingId,
      reason: choice.reason,
      note,
    });
    if (!res.ok) {
      setRefusal(res.error);
      setRejecting(false);
      return;
    }

    if (choice.lever !== ESCALATION_LEVER) {
      toast.success(`Not approved. We've told ${subject.hostLabel} why.`);
      setRejectOpen(false);
      return;
    }

    // ── THE FAN-OUT. One operator decision, one cancellation per booking. ────────────────────────
    //
    // `cancelBookingAsOps` cancels ONE booking, which is why 18-08 gave it the 30/60s ops budget
    // rather than the 5/60s money budget its neighbours use — "5 would leave a fake listing HALF
    // cancelled", in that plan's own words.
    //
    // EVERY ID IS ATTEMPTED even after one refuses, and the FIRST refusal is what the operator is
    // shown. Stopping at the first would leave the rest of a confirmed-fake listing's bookings
    // standing for a reason that had nothing to do with them, and would make the retry a second
    // rejection of a listing that is no longer pending — a dead end rather than a retry.
    let firstRefusal: string | null = null;
    let cancelled = 0;
    for (const bookingId of subject.impact.cancellableBookingIds) {
      const outcome = await cancelBookingAsOps({
        bookingId,
        listingId: subject.listingId,
        lever: choice.lever,
        reason: choice.reason,
        note,
      });
      if (outcome.ok) cancelled += 1;
      else if (firstRefusal === null) firstRefusal = outcome.error;
    }

    if (firstRefusal !== null) {
      setRefusal(firstRefusal);
      setRejecting(false);
      setRejectOpen(false);
      return;
    }

    // The refunds are DISPATCHED, not settled (D-57), so the sentence says so rather than claiming
    // money has already landed.
    toast.success(
      `Not approved. ${cancelled} ${cancelled === 1 ? "booking" : "bookings"} cancelled — the refunds are on their way.`,
    );
    setRejectOpen(false);
  }

  async function handleReject(
    choice: OpsRejectChoice<HostRejectReason> | OpsRejectChoice<ListingRejectReason>,
  ) {
    if (rejecting) return;
    setRejecting(true);
    setRefusal(null);
    try {
      if (subject.kind === "host") {
        await handleRejectHost(choice as OpsRejectChoice<HostRejectReason>);
      } else {
        await handleRejectListing(choice as OpsRejectChoice<ListingRejectReason>);
      }
    } catch (e) {
      setRejecting(false);
      throw e;
    }
  }

  return (
    <div className="space-y-2">
      {/* `flex-wrap` rather than a shrink: at the narrow floor the two controls WRAP onto two lines
          and both stay 44px, which is what makes the touch target a floor rather than an aspiration. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="touch"
          onClick={handleApprove}
          disabled={approving}
          aria-disabled={approving}
          aria-label={`Approve ${subject.label}`}
        >
          {approving ? "Approving…" : "Approve"}
        </Button>

        {subject.kind === "host" ? (
          <OpsRejectDialog<HostRejectReason>
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            title={DIALOG_TITLE[subject.kind]}
            description={rejectDescription(subject.hostLabel)}
            reasons={HOST_REJECT_REASONS}
            impact={null}
            submitting={rejecting}
            confirmLabel={CONFIRM_LABEL[subject.kind]}
            submittingLabel={SUBMITTING_LABEL[subject.kind]}
            onConfirm={handleReject}
            trigger={
              <Button variant="outline" size="touch" aria-label={`Reject ${subject.label}`}>
                Reject
              </Button>
            }
          />
        ) : (
          <OpsRejectDialog<ListingRejectReason>
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            title={DIALOG_TITLE[subject.kind]}
            description={rejectDescription(subject.hostLabel)}
            reasons={LISTING_REJECT_REASONS}
            impact={subject.impact}
            submitting={rejecting}
            confirmLabel={CONFIRM_LABEL[subject.kind]}
            submittingLabel={SUBMITTING_LABEL[subject.kind]}
            onConfirm={handleReject}
            trigger={
              <Button variant="outline" size="touch" aria-label={`Reject ${subject.label}`}>
                Reject
              </Button>
            }
          />
        )}
      </div>

      {/* THE ONE REGION. Mounted only while a refusal exists, following the shipped shape, because the
          success path owes zero regions. Its name is a label; its content is the server's sentence. */}
      {refusal ? (
        <p role="status" aria-label={OPS_REFUSAL_REGION_NAME} className={ROW_VALUE_CLASS}>
          {refusal}
        </p>
      ) : null}
    </div>
  );
}
