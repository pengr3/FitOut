"use client";

// CreateGroupButton (GROUP-01 · D-119, 08-UI-SPEC §1) — the phase's front door, and the ONE coral action on
// the confirmed booking detail. Turns a paid booking into an invitable group and routes to the organizer's
// management surface.
//
// WHY THIS IS THE SURFACE'S ONLY CORAL. 08-UI-SPEC §Color enumerates the accent exhaustively: `Invite people`
// is accent #1, and one-primary-per-surface is what forced the shipped `Find another space` down to a ghost
// link on the same branch (Open Q3). Do not add a second solid button beside this one.
//
// THE BUTTON IS A COURTESY, NOT A GATE (Security V4). `createGroup` re-checks ownership AND
// `status === 'confirmed'` server-side before it writes, and snapshots the cap from the LISTING inside its
// own INSERT — this component proposes nothing but a booking id. The page's eligibility branch merely avoids
// offering an action that would certainly be refused.
//
// IDEMPOTENCE IS THE ACTION'S, NOT OURS. `createGroup` is `ON CONFLICT (booking_id) DO NOTHING` and returns
// the EXISTING group on a repeat, so a double submit lands on the same management page rather than erroring.
// The local `pending` guard is therefore about the double-render, not about correctness.
//
// ⚠️ THE ACCESS TOKEN NEVER LEAVES THIS FUNCTION. `createGroup` returns one; it is a bearer credential
// (D-118), so it is never logged, never toasted, and never put in a query string. The management RSC re-reads
// it owner-scoped from the database instead.
//
// Structurally a clone of CancelRequestDialog's submit half (disable-on-click, calm `sonner` error, no throw
// to the user) minus the dialog: creating a group destroys nothing and needs no confirmation.

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createGroup } from "@/app/actions/group";

export function CreateGroupButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleCreate() {
    if (pending) return; // double-click guard, before the disabled attribute can apply
    setPending(true);
    try {
      const res = await createGroup(bookingId);
      if (res.ok) {
        // Deliberately stays `pending` through the navigation — the button must not flick back to its idle
        // label while the route transition is in flight.
        router.push(`/bookings/${bookingId}/group`);
        return;
      }
      // Every failure from the action is a calm sentence (not yours / not confirmed / going a little fast).
      toast.error(res.error);
      setPending(false);
    } catch (e) {
      setPending(false);
      throw e;
    }
  }

  return (
    <Button
      variant="brand"
      onClick={handleCreate}
      disabled={pending}
      aria-disabled={pending}
      className="w-full"
    >
      {pending ? "Setting up…" : "Invite people"}
    </Button>
  );
}
