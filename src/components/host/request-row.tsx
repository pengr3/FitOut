"use client";

// RequestRow + RequestActions — the host request-inbox row (HOST-01 · D-65). RequestRow is the mobile
// stacked card (mirrors PayoutRow: space title 600 + venue-local window meta + booker + "Guest pays {₱total}"
// tabular-nums + the "Expires in …" hours-scale countdown); RequestActions is the Approve/Decline control
// wired to the 06-07 owner-gated, atomic, SLA-guarded server actions. The desktop shadcn table (rendered by
// /host/requests page) reuses RequestActions + RequestCountdown per row directly.
//
// D-65 discretionary lock: Approve = neutral `default` solid, INLINE + direct (no dialog — the affirmative,
// reversible-by-timer path; the booker still must pay to confirm). Decline = neutral `outline` opening a
// confirm dialog before firing (the irreversible "no" that rejects a real person + frees the slot). NO coral
// on the inbox (mirrors /host/earnings' calm neutral surface). Money is the SERVER-FROZEN quote (formatMoney
// display only — zero arithmetic). Freshness is via revalidatePath inside the actions (no polling); a lapsed
// / already-actioned request resolves to a calm "no longer pending" toast, never a red 500.

import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RequestCountdown } from "@/components/booking/request-countdown";
import { approveRequest, declineRequest } from "@/app/actions/host-requests";
import { APPROVAL_PAYMENT_WINDOW_HOURS } from "@/lib/payments/config";

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
 * RequestActions — the Approve (inline, direct) + Decline (confirm-dialog) control. Both call the 06-07
 * owner-gated/atomic/SLA-guarded server actions; toasts via sonner; the actions revalidatePath so the row
 * refreshes away on success. A 0-row result (lapsed / already actioned — the 06-06 cron or another tab won
 * the race) surfaces the calm "no longer pending" error, never a crash.
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

  async function handleApprove() {
    if (approving) return; // double-click guard even before the disabled attribute applies
    setApproving(true);
    try {
      const res = await approveRequest(requestId);
      if (res.ok) {
        // On success the action revalidatePath's the inbox — this row refreshes away; keep the button
        // disabled through the transition. The booker is asked to pay within the payment window.
        toast.success(
          `Request approved. We've asked ${bookerLabel} to pay — the slot stays held for ${APPROVAL_PAYMENT_WINDOW_HOURS} hours.`,
        );
      } else {
        toast.error(res.error);
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
    try {
      const res = await declineRequest(requestId);
      if (res.ok) {
        toast.success(`Request declined. The slot is free again and we've let ${bookerLabel} know.`);
        setDeclineOpen(false);
      } else {
        toast.error(res.error);
        setDeclining(false);
        setDeclineOpen(false);
      }
    } catch (e) {
      setDeclining(false);
      throw e;
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Approve — neutral solid, inline + direct (no dialog). Disable-on-click → "Approving…". */}
      <Button
        size="sm"
        onClick={handleApprove}
        disabled={approving}
        aria-disabled={approving}
        aria-label={`Approve request from ${bookerLabel}`}
      >
        {approving ? "Approving…" : "Approve"}
      </Button>

      {/* Decline — neutral outline opening a confirm dialog (the irreversible "no"). NOT destructive-red. */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" aria-label={`Decline request from ${bookerLabel}`}>
            Decline
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this request?</DialogTitle>
            <DialogDescription>
              We&apos;ll let {bookerLabel} know their request for {whenLabel} wasn&apos;t available, and free
              the slot for other guests. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={declining}>
                Keep it
              </Button>
            </DialogClose>
            <Button variant="outline" onClick={handleDecline} disabled={declining} aria-disabled={declining}>
              {declining ? "Declining…" : "Decline request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** RequestRow — the mobile stacked card (mirrors PayoutRow). The desktop table row is rendered by the page. */
export function RequestRow({ row }: { row: RequestRowData }) {
  return (
    <Card>
      <CardContent className={cn("space-y-3 p-4")}>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{row.spaceTitle}</p>
          <p className="text-sm text-muted-foreground">{row.whenLabel}</p>
        </div>

        <dl className="space-y-1.5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Guest</dt>
            <dd>{row.bookerLabel}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Guest pays</dt>
            <dd className="tabular-nums">{row.totalLabel}</dd>
          </div>
        </dl>

        <RequestCountdown expiresAt={row.expiresAt} label="Expires in" />

        <RequestActions
          requestId={row.requestId}
          bookerLabel={row.bookerLabel}
          whenLabel={row.whenLabel}
        />
      </CardContent>
    </Card>
  );
}
