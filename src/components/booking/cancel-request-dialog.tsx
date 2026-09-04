"use client";

// The UNPAID-hold cancel (07-UI-SPEC § 3, "Unpaid holds") — a plain confirm dialog on /bookings/[id] for a
// `requested` or `approved` booking.
//
// WHY THIS IS A DIALOG AND THE PAID CANCEL IS A WHOLE ROUTE. Nothing moves here. D-63's pay-on-approval means
// an unpaid hold was never charged, so there is no refund to compute, no tier to explain and no rung to
// disclose — and therefore nothing for D-78's itemised breakdown to itemise. Rendering money UI over a
// booking that has none would invent a refund that does not exist. The paid path gets the dedicated
// /bookings/[id]/cancel review precisely because it DOES move money; this one gets one sentence.
//
// Structurally a clone of the decline dialog in components/host/request-row.tsx: disable-on-click, a pending
// label, a `sonner` toast on the calm error paths, and a neutral `outline` confirm — never an alarm colour.
// Cancelling is an expected lifecycle outcome, not a data-destroying error (07-UI-SPEC § Color).

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { cancelUnpaidHold } from "@/app/actions/cancel-booking";

export function CancelRequestDialog({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleCancel() {
    if (pending) return; // double-click guard, before the disabled attribute can apply
    setPending(true);
    try {
      const res = await cancelUnpaidHold(bookingId);
      if (res.ok) {
        toast.success("Request cancelled. We've let the host know and freed the slot.");
        setOpen(false);
        router.refresh();
      } else {
        // Every failure path from the action is a CALM message (not yours / no longer active / going a
        // little fast) — never a stack trace.
        toast.error(res.error);
        setPending(false);
        setOpen(false);
        router.refresh();
      }
    } catch (e) {
      setPending(false);
      throw e;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Cancel request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this request?</DialogTitle>
          {/* NO breakdown and NO money figure anywhere in this dialog — see the header. */}
          <DialogDescription>
            We&apos;ll let the host know and free the slot. You haven&apos;t been charged, so there&apos;s
            nothing to refund.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep it
            </Button>
          </DialogClose>
          <Button variant="outline" onClick={handleCancel} disabled={pending} aria-disabled={pending}>
            {pending ? "Cancelling…" : "Cancel request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}