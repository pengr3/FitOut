"use client";

// RegenerateLinkButton (D-121, 08-UI-SPEC §2) — the organizer kills a leaked invite link and mints a fresh
// one. A neutral `outline` trigger opening a confirm dialog, cloned structurally from CancelRequestDialog /
// RemoveAttendeeButton (disable-on-click, pending label, calm `sonner` error).
//
// ⚠️ THE BUTTON IS NEUTRAL, AND THAT IS A DECISION, NOT AN OVERSIGHT (08-UI-SPEC §Color / Open Q6). This is a
// SECURITY action, not a demolition: it rotates a credential and preserves everything that matters. The
// roster survives intact, the group survives, the booking survives — the only casualty is a string that had
// escaped the organizer's control, which is precisely the outcome they came here for. An alarm colour would
// discourage the one action that fixes an over-shared link, and this phase deliberately uses NO alarm colour
// anywhere in the group and RSVP flows. It continues the Phase-2 unlist and Phase-7 cancel precedents.
//
// ⚠️ GREP TRIPWIRE (the 07-04 idiom). The absence of the red button variant is checked by grepping this file
// for that variant's own name — so the name is not spelled out anywhere here, comments included. A guard the
// comment forbidding the thing can trip is not a guard.
//
// ⚠️ THE NEW TOKEN IS NEVER TOUCHED ON THE CLIENT (D-118). `regenerateLink` returns the freshly minted
// `accessToken` on its success value, and this component deliberately DOES NOT read it: it does not put it in
// state, it does not compose a URL out of it, and above all it does not put it through the browser logger.
// The refreshed RSC re-reads the token under the owner scope and hands ShareLinkBox a finished URL — so the
// credential's only client-side existence stays exactly where D-118 put it, inside one read-only input. A
// toast that echoed the new link would be a bearer credential written into a transient, screenshot-able,
// extension-readable surface for the sake of a nicety.
//
// WHAT THE SERVER ACTUALLY DOES, and why the copy is worded the way it is: `regenerateLink` UPDATEs
// `access_token` in place under the owner scope, leaving the rsvp rows untouched — so "people who've already
// RSVP'd stay on your list" is a description of the statement, not a reassurance invented for the dialog. The
// old token afterwards resolves to the SAME calm inactive state as a token that never existed (T-08-17), so
// whoever holds the leaked link learns nothing from its death. A voided group refuses outright — handing an
// organizer a working link to a session that is not happening would be worse than useless.
//
// THE GATE IS THE ACTION'S. `regenerateLink` re-reads the group under `booker_id = session.user.id` and
// repeats that scope inside the UPDATE's own WHERE (Security V4). This component sends a group id and
// nothing else.

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";
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
import { regenerateLink } from "@/app/actions/group";

export function RegenerateLinkButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleRegenerate() {
    if (pending) return; // double-click guard, before the disabled attribute can apply
    setPending(true);
    try {
      const res = await regenerateLink(groupId);
      if (res.ok) {
        // `res.accessToken` is deliberately NOT read — see the header. The refresh below is what puts the
        // new link on screen, through the same owner-scoped server read that rendered the old one.
        toast.success("New link ready. Copy it and share it again.");
      } else {
        // Calm sentences only (not yours / no longer active / going a little fast) — never a stack trace.
        toast.error(res.error);
      }
      setPending(false);
      setOpen(false);
      // The action revalidates the group surfaces; refresh so the share box shows the new link immediately.
      router.refresh();
    } catch (e) {
      setPending(false);
      throw e;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* h-11 clears the 44px touch target (08-UI-SPEC §Spacing). Full width on mobile, intrinsic from
            `sm` up, matching the Copy-link control it sits beneath. */}
        <Button variant="outline" className="h-11 w-full sm:w-auto">
          <RefreshCwIcon aria-hidden="true" />
          Regenerate link
        </Button>
      </DialogTrigger>
      {/* The shipped shadcn dialog: focus is trapped while open, Escape dismisses, and focus returns to this
          trigger on close (08-UI-SPEC §Accessibility). Reused rather than re-implemented for exactly that. */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Get a new invite link?</DialogTitle>
          <DialogDescription>
            The current link stops working, so anyone you&apos;ve already shared it with will need the new
            one. People who&apos;ve already RSVP&apos;d stay on your list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep this link
            </Button>
          </DialogClose>
          <Button variant="outline" onClick={handleRegenerate} disabled={pending} aria-disabled={pending}>
            {pending ? "Regenerating…" : "Regenerate link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
