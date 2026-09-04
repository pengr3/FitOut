"use client";

// The confirm/back pair on the SC#2 cancel review screen (BOOK-07 · 07-UI-SPEC § 3). Clones the
// client-action wiring in components/host/request-row.tsx: disable-on-click, a pending label, a `sonner`
// toast on the calm error paths, and navigation on success.
//
// THIS IS THE ONLY CLIENT BOUNDARY ON THE REVIEW PAGE, and it exists solely to own the pending state. It
// receives NOTHING but the booking id — no amount, no tier, no rung. The server recomputes all of it from
// the booking's own snapshot, so there is deliberately nothing here for a tampered client to influence.
//
// ── STATE-08 (plan 13-05) — THE MONEY SENTENCE DOES NOT TRAVEL IN THE TOAST ──────────────────────────────
//
// This toast used to carry the amount coming back to the booker. That is the single most re-read sentence
// in the whole flow, and a toast is dismissible, timed, unaddressable and gone the moment the page
// reloads — so a booker who blinked had no way back to it. It now says exactly one thing: the booking is
// cancelled. Do not append to it.
//
// WHERE THE MONEY TRUTH ACTUALLY LIVES, and why removing it from here loses nothing: the next line
// navigates to `/bookings/{id}`, whose cancelled branch ALREADY renders it as durable page content, with
// D-79's two wordings — the amount and *on its way*, or the no-money-back sentence WITH its reason. That
// is a fact the booker can re-read tomorrow. Plan 13-10 moves that same line onto `<MoneyStatement/>`;
// the wording is D-79's either way and is not this file's to re-phrase.
//
// ⚠️ D-57, WHICH IS WHY THE DESTINATION'S SENTENCE READS *on its way* RATHER THAN A PAST TENSE. The cancel
// action's PayMongo POST records INTENT only; the webhook is the single writer of terminal state, and a
// booking row carries no settled signal to read. Claiming a completed return here would be a claim the
// system cannot stand behind — the same class of false money statement 13-04's reversed-state bans.
//
// ⚠️ AND THIS FILE DELIBERATELY DOES NOT SPELL THE MONEY WORD, comments included — the 07-04 tripwire
// idiom (13-PATTERNS § H). The absence of that vocabulary from this file is checked by grepping for it,
// and a grep the comment forbidding the thing can trip is not a guard. Which is also why the action's
// amount field is described rather than named: this component no longer reads it at all. The branch it
// fed is the destination's now, and re-deriving it here would put two answers to one question on two
// surfaces.
//
// COLOUR RATIONALE (07-UI-SPEC § 3, recorded here so a future design pass does not "fix" it):
//   - Confirm is neutral `outline` — NOT coral, NOT destructive-red. Cancelling is an expected lifecycle
//     outcome, not a data-destroying error. Red would misrepresent money the booker is contractually
//     entitled to getting back as a dangerous act; coral would advertise the action FitOut least wants
//     taken. The weight of this decision is carried by disclosure and step count, not by colour.
//     (The money word is deliberately not spelled here either — see the tripwire note above. This line
//     said it until plan 13-05, and leaving it would have made the file's own grep read 1.)
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
        // STATE-08 — THE WHOLE TOAST, AND NOTHING ELSE (see the header). The money truth is the
        // destination's; this sentence is a receipt for the click.
        toast.success("Booking cancelled.");
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
