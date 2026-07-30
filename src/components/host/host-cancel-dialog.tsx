"use client";

// HostCancelDialog — the two-pane host cancellation confirm (D-80 · 07-UI-SPEC § 4). ROADMAP SC#3's product
// path: without a UI trigger, D-70's four consequences have nothing to fire them.
//
// ⚠️ THE FRICTION DELTA IS THE CONTRACT — DO NOT EQUALISE THE TWO CANCEL FLOWS.
//   Booker cancel: 1 step,  no reason,       no acknowledgment.
//   Host cancel:   2 steps, REQUIRED reason, REQUIRED acknowledgment.
// D-80 mandates "deliberately more friction than the booker's cancel" because a host breaking a confirmed
// booking the booker already paid for is the more damaging event. A future pass that notices the asymmetry
// and "tidies it up" would be removing the mechanism, not a rough edge. The extra weight is carried by
// DISCLOSURE and STEP COUNT — never by colour (see the button note below).
//
// The reason field is LOAD-BEARING, not theatrical: D-70 requires an audit record against the host, the
// value is persisted to booking.decline_reason, and the notification composer reads it. It is not a survey.
//
// MONEY: the fee arrives as a SERVER-COMPUTED, ALREADY-CAPPED prop from previewHostCancelFee. This component
// performs ZERO arithmetic and NEVER applies the D-71 cap itself — a cap applied in two places is a cap that
// can disagree with itself, and the half a host would notice is the half understating what they are charged.
//
// Client wiring (pending state, sonner toast, calm 0-row handling, disable-on-submit) is cloned unchanged
// from request-row.tsx:89-106.

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cancelBookingAsHost, type HostCancelReason } from "@/app/actions/cancel-booking";

/** The five D-70 reasons and their host-facing labels, verbatim from 07-UI-SPEC § 4. */
const REASON_OPTIONS: ReadonlyArray<{ value: HostCancelReason; label: string }> = [
  { value: "space_unavailable", label: "Space is unavailable" },
  { value: "double_booked", label: "Double-booked elsewhere" },
  { value: "maintenance", label: "Maintenance or damage" },
  { value: "guest_requested", label: "Guest asked me to cancel" },
  { value: "other", label: "Other" },
];

export type HostCancelDialogProps = {
  bookingId: string;
  /** The guest's display name, for the consequences copy. */
  guestLabel: string;
  /** Pre-formatted full refund the booker receives (formatMoney) — the UI does no price arithmetic. */
  refundLabel: string;
  /** Pre-formatted, SERVER-CAPPED cancellation fee (formatMoney). Rendered verbatim. */
  feeLabel: string;
  /** Pre-formatted outstanding unrecovered debt, or null when the host owes nothing. */
  outstandingLabel: string | null;
  /** Venue-local "{date}, {time} ({City} time)" for the window that will be blocked. */
  whenLabel: string;
  /**
   * The booking's OC-03 mode snapshot (`booking.open_capacity`) — true ⇒ a drop-in pass, and the third
   * consequence below is NOT rendered because the action deliberately does not perform it.
   *
   * REQUIRED, never optional, for the same reason `WhenLabelInput.openCapacity` is (09-08 / 08-15 contract
   * #2): an optional flag lets a host surface silently keep promising a calendar block that will never
   * exist. The dialog's copy and `cancelBookingAsHost`'s behaviour fork on the SAME persisted column, so
   * they cannot disagree (threat T-09-32).
   */
  openCapacity: boolean;
};

export function HostCancelDialog({
  bookingId,
  guestLabel,
  refundLabel,
  feeLabel,
  outstandingLabel,
  whenLabel,
  openCapacity,
}: HostCancelDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pane, setPane] = React.useState<1 | 2>(1);
  const [reason, setReason] = React.useState<HostCancelReason | "">("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  /** Reopening always starts at pane 1 with both gates re-closed — never mid-flow, never pre-acknowledged. */
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPane(1);
      setReason("");
      setAcknowledged(false);
    }
  }

  async function handleConfirm() {
    if (pending || !reason || !acknowledged) return; // guard even before the disabled attribute applies
    setPending(true);
    try {
      const res = await cancelBookingAsHost(bookingId, reason);
      if (res.ok) {
        // The action revalidates this page; keep the button disabled through the transition. The refund is
        // asynchronous (D-57), so the copy says "on its way" — never "refunded".
        toast.success(`Booking cancelled. ${refundLabel} is on its way back to ${guestLabel}.`);
        handleOpenChange(false);
      } else {
        // A calm 0-row result (already cancelled, raced, or past start) — a message, never a crash.
        toast.error(res.error);
        setPending(false);
      }
    } catch (e) {
      setPending(false);
      throw e;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {/* Neutral outline, NOT coral and NOT destructive-red — see the confirm button note below. */}
        <Button variant="outline">Cancel booking</Button>
      </DialogTrigger>

      {/* Focus trap, Escape dismissal and focus return to the trigger are inherited from the shadcn dialog
          primitive. Do NOT override them. */}
      <DialogContent>
        {pane === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Why are you cancelling?</DialogTitle>
              <DialogDescription>
                We&apos;ll let {guestLabel} know. Pick the closest reason — this is recorded against your
                account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="host-cancel-reason">Reason</Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as HostCancelReason)}
              >
                <SelectTrigger id="host-cancel-reason" className="w-full">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Keep booking
              </Button>
              {/* GATE 1 of 2: no forward motion until a reason is chosen. */}
              <Button
                variant="outline"
                onClick={() => setPane(2)}
                disabled={!reason}
                aria-disabled={!reason}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cancelling this booking will:</DialogTitle>
              {/* The count is INTERPOLATED, not hardcoded: this description used to say "three" always,
                  which stopped being true the moment the block bullet became conditional. A screen-reader
                  user must not be told to expect a consequence the list does not contain. */}
              <DialogDescription className="sr-only">
                The {openCapacity ? "two" : "three"} consequences of cancelling, and an acknowledgment you
                must tick to continue.
              </DialogDescription>
            </DialogHeader>

            {/* THE CONSEQUENCES LIST IS THE FOCAL POINT OF THIS DIALOG — not the confirm button. Every D-70
                consequence that will ACTUALLY fire is stated plainly, in full, every time. */}
            <ul className="list-disc space-y-2 pl-5 text-sm">
              <li>
                Refund <strong>{refundLabel}</strong> to {guestLabel} in full — regardless of your
                cancellation policy.
              </li>
              <li>
                {/* The fee may render text-destructive ONLY alongside the explicit "deducted from your next
                    payout" label — never colour-only (07-UI-SPEC § Colour). */}
                Charge you a <strong className="text-destructive">{feeLabel}</strong> cancellation fee,
                deducted from your next payout.
              </li>
              {/* D-70's block bullet is OMITTED for a drop-in booking, because Consequence 3 is deliberately
                  skipped for one (cancel-booking.ts: a whole-date block would close the day for every other
                  pass-holder). Promising a block that will not happen is a false statement about the host's
                  own calendar — 09-UI-SPEC O8. */}
              {!openCapacity && (
                <li>
                  Block <strong>{whenLabel}</strong> on this space, so the slot can&apos;t be rebooked.
                </li>
              )}
            </ul>

            {outstandingLabel ? (
              <p className="text-sm text-muted-foreground">
                You have {outstandingLabel} in cancellation fees still to be deducted.
              </p>
            ) : null}

            {/* GATE 2 of 2: the required acknowledgment. This is also T-07-66's UI-level attestation — the
                host states, before the action fires, that they understood the charge. */}
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="host-cancel-ack"
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
              />
              <Label htmlFor="host-cancel-ack" className="text-sm leading-snug font-normal">
                I understand <strong>{feeLabel}</strong> will be deducted from my next payout.
              </Label>
            </div>

            <p className="text-sm text-muted-foreground">This can&apos;t be undone.</p>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={pending}>
                Keep booking
              </Button>
              {/* NEUTRAL outline, deliberately. Cancelling is an expected lifecycle outcome, not a
                  data-destroying error: red would misrepresent a refund the booker is entitled to, and coral
                  would advertise the action FitOut least wants taken. The weight lives in the disclosure
                  above and the two steps behind it — not in the colour of this button. */}
              <Button
                variant="outline"
                onClick={handleConfirm}
                disabled={pending || !acknowledged}
                aria-disabled={pending || !acknowledged}
              >
                {pending ? "Cancelling…" : "Cancel this booking"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
