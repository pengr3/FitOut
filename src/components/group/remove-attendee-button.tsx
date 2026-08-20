"use client";

// RemoveAttendeeButton (D-121, 08-UI-SPEC §2) — the organizer takes someone off the roster and frees their
// spot. A neutral `outline` trigger opening a confirm dialog, cloned structurally from CancelRequestDialog /
// the decline dialog in host/request-row.tsx (disable-on-click, pending label, calm `sonner` error).
//
// ⚠️ THE BUTTON IS NEUTRAL, AND THAT IS A DECISION, NOT AN OVERSIGHT (08-UI-SPEC §Color / Open Q6). Removing
// an attendee destroys nothing and is not one-way: the seat goes back into the pool and the person can RSVP
// again if they still hold the link — which is exactly what the confirm copy promises them. An alarm colour
// would misreport an ordinary bit of roster housekeeping as an error, and this phase deliberately uses NO
// alarm colour anywhere in the group and RSVP flows. It continues the Phase-2 unlist and Phase-7 cancel
// precedents.
//
// ⚠️ GREP TRIPWIRE (the 07-04 idiom). The absence of the red button variant is checked by grepping this file
// for that variant's own name — so the name is not spelled out anywhere here, comments included. A guard the
// comment forbidding the thing can trip is not a guard.
//
// WHAT THE SERVER ACTUALLY DOES, and why the copy is worded the way it is: `removeAttendee` DELETES the rsvp
// row rather than flipping it to `no`, inside a transaction that first takes the seat-claim's own
// `SELECT capacity_snapshot … FOR UPDATE` on the group row — so a removal and a concurrent RSVP serialise.
// "Removed by the organizer" and "said they can't make it" are different facts, and filing the first under
// "Can't make it" would put words in someone's mouth on a list they cannot see.
//
// THE GATE IS THE ACTION'S. `removeAttendee` re-checks that the rsvp belongs to a group on a booking THIS
// user booked, and repeats that scope inside the DELETE's own WHERE (Security V4). This component sends an
// rsvp id and nothing else.
//
// NEVER RENDERED ON THE ORGANIZER'S OWN ROW (08-UI-SPEC §2) — the roster's row #1 is a display fixture with
// no rsvp id to remove, and "remove yourself from your own booking" is cancelling, which lives elsewhere.
//
// ── STATE-08 (plan 13-05) — THE OUTCOME LEFT THE TOAST, AND THIS FILE NO LONGER ANNOUNCES IT ─────────────
// The success toast used to say the seat was free again. That is a CAPACITY fact: it changes who the
// organizer can still ask, so it is something they will want to re-read, and a toast is dismissible,
// timed, unaddressable and gone on refresh. It now travels UP — `onRemoved` hands the outcome to
// `AttendeeRoster`, which renders it as one in-page alert directly above the list it describes.
//
// ⚠️ THERE IS NO TOAST BESIDE THAT ALERT, AND THAT IS THE POINT RATHER THAN AN OMISSION. Two live regions
// announcing one outcome is GATE-03 rule 6's defect — a screen reader hears the removal twice, in two
// different wordings, from two places on the page. The alert REPLACES the toast; it does not join it.
//
// THE FAILURE PATH KEEPS ITS `toast.error`, deliberately. A server refusal is not a fact to retain: it is
// "that didn't happen, try again", the roster is unchanged behind it, and the whole content of the message
// is the calm sentence itself. STATE-08's split puts exactly that on a toast.
//
// ⚠️ THIS COMPONENT PERFORMS NO ARITHMETIC ON THE COUNTS (T-13-05-COUNTCROSS). Both numbers arrive finished
// on the action's own result, computed server-side inside the transaction that did the delete. Do not add
// one to `attending` here — it already includes the organizer (D-113), and a second increment would claim a
// body that does not exist.

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserRoundMinusIcon } from "lucide-react";
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
import { removeAttendee } from "@/app/actions/group";

/** What the roster needs to state the outcome. Every field is finished; nothing here is computed. */
export type AttendeeRemoved = {
  /** Guest-typed free text. Escaped React text at the alert, exactly as it is here (G6). */
  name: string;
  /** Organizer-INCLUSIVE, straight off the action's result (D-113). Never incremented again. */
  attending: number;
  /** `rsvp` places still claimable, straight off the action's result. */
  spotsFree: number;
};

export function RemoveAttendeeButton({
  rsvpId,
  /** Guest-typed free text — rendered as an escaped React text child in the confirm copy (G6). */
  name,
  /**
   * Where the OUTCOME goes now that it no longer rides a toast (STATE-08). The parent owns the single
   * announcing region; this component owns the action and the pending state, and nothing else.
   */
  onRemoved,
}: {
  rsvpId: string;
  name: string;
  onRemoved: (removed: AttendeeRemoved) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleRemove() {
    if (pending) return; // double-click guard, before the disabled attribute can apply
    setPending(true);
    try {
      const res = await removeAttendee(rsvpId);
      if (res.ok) {
        // Passed THROUGH, not derived. See the header: the two figures are the server's.
        onRemoved({ name, attending: res.attending, spotsFree: res.spotsFree });
      } else {
        // Calm sentences only (not yours / already gone / going a little fast) — never a stack trace.
        toast.error(res.error);
      }
      setPending(false);
      setOpen(false);
      // The action revalidates the group surfaces; refresh so the roster and the headcount move together.
      router.refresh();
    } catch (e) {
      setPending(false);
      throw e;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* h-11 clears the 44px touch target (08-UI-SPEC §Spacing). The label is hidden on the narrowest
            viewports where a roster row has no room for it — the `aria-label` carries the whole action AND
            the person either way, so the control is never ambiguous to a screen reader or a keyboard user. */}
        <Button variant="outline" className="h-11 px-3" aria-label={`Remove ${name} from this group`}>
          <UserRoundMinusIcon aria-hidden="true" />
          <span className="hidden sm:inline">Remove attendee</span>
        </Button>
      </DialogTrigger>
      {/* The shipped shadcn dialog: focus is trapped while open, Escape dismisses, and focus returns to this
          trigger on close (08-UI-SPEC §Accessibility). Reused rather than re-implemented for exactly that. */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name} from this group?</DialogTitle>
          <DialogDescription>
            This frees up their spot. They can RSVP again if they still have the link.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep them
            </Button>
          </DialogClose>
          <Button variant="outline" onClick={handleRemove} disabled={pending} aria-disabled={pending}>
            {pending ? "Removing…" : "Remove attendee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
