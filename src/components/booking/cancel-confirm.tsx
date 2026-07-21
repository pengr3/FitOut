"use client";

// The confirm/back pair on the SC#2 cancel review screen (BOOK-07 · 07-UI-SPEC § 3). Clones the
// client-action wiring in components/host/request-row.tsx: disable-on-click, a pending label, a `sonner`
// toast on the calm error paths, and navigation on success.
//
// THIS IS THE ONLY CLIENT BOUNDARY ON THE REVIEW PAGE, and it exists solely to own the pending state. It
// receives NOTHING but the booking id — no amount, no tier, no rung. The server recomputes all of it from
// the booking's own snapshot, so there is deliberately nothing here for a tampered client to influence.
//
// COLOUR RATIONALE (07-UI-SPEC § 3, recorded here so a future design pass does not "fix" it):
//   - Confirm is neutral `outline` — NOT coral, NOT destructive-red. Cancelling is an expected lifecycle
//     outcome, not a data-destroying error. Red would misrepresent a refund the booker is contractually
//     entitled to as a dangerous act; coral would advertise the action FitOut least wants taken. The weight
//     of this decision is carried by disclosure and step count, not by colour.
//   - Back is `ghost` — the visually calmer of the two, because it is the outcome that costs nobody
//     anything.

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelBookingAsBooker } from "@/app/actions/cancel-booking";

export function CancelConfirm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleCancel() {
    if (pending) return; // double-click guard, before the disabled attribute can apply
    setPending(true);
    try {
      const res = await cancelBookingAsBooker(bookingId);
      if (res.ok) {
        // ⚠️ D-57 — the refund POST records INTENT only; the webhook is the single writer of terminal
        // refund state. So the copy is "on its way", never "Refunded". The detail page renders the durable
        // truth; keep the button disabled through the navigation.
        toast.success("Booking cancelled. Your refund is on its way.");
        router.push(`/bookings/${bookingId}`);
        router.refresh();
      } else {
        // Every failure path from the action is a CALM message (not yours / no longer active / already
        // started / going a little fast) — never a stack trace and never a red 500.
        toast.error(res.error);
        setPending(false);
      }
    } catch (e) {
      setPending(false);
      throw e;
    }
  }

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row-reverse sm:justify-start">
      <Button
        variant="outline"
        onClick={handleCancel}
        disabled={pending}
        aria-disabled={pending}
        className="sm:min-w-40"
      >
        {pending ? "Cancelling…" : "Cancel booking"}
      </Button>
      <Button asChild variant="ghost" disabled={pending} className="sm:min-w-40">
        <Link href={`/bookings/${bookingId}`}>Keep booking</Link>
      </Button>
    </div>
  );
}
