"use client";

// PaxStepper (GROUP-01/GROUP-05 · D-108/D-113, 08-UI-SPEC § 5) — the `declaredPax` control on the reserve
// page, rendered ONLY when the listing actually charges per head (`extraHeadFee > 0`). On a flat listing
// this component is never mounted, so those bookers see exactly the checkout they see today.
//
// SPLIT NOTE (09-11). The markup now lives in stepper-control.tsx; this file is the SERVER-BOUND binding
// and nothing else. The rendered output is byte-identical to the pre-split component — this is a UAT-passed
// money surface (08-17 step 2), and the extraction was allowed to change nothing a booker sees. It moved
// because a drop-in listing needs the same control BEFORE a hold exists (09-UI-SPEC § 2c), which this
// binding structurally cannot provide: everything below assumes a persisted booking row.
//
// ⚠️ THE ZERO-ARITHMETIC CONTRACT, inherited verbatim from price-breakdown.tsx and PROVEN BY ABSENCE here.
// This file contains NO price of any kind: no money formatter, no fee, no multiplication, no total.
// Changing the headcount calls the re-price action, which RE-FREEZES the quote server-side from the
// LISTING's own included/extra_head_fee (never anything this client sends), and then `router.refresh()`
// re-renders the server breakdown. A client that computed the new price optimistically would be showing a
// number PayMongo has not agreed to charge — the core-value trust failure (UI-SPEC Open Q5 / T-08-12).
//
// STATE: the PERSISTED `declaredPax` prop is the only source of truth. `useOptimistic` shows the tapped
// value while the server round-trips and REVERTS to the persisted value by itself when the transition
// settles — so a refused re-price can never leave a headcount on screen that the database does not hold.
// (This is also why there is no `useEffect` prop-sync here: that is the cascading-render pattern eslint
// rejects, and the 07-era address-autocomplete fix established deriving over syncing.)
//
// The `max` bound is a COURTESY, exactly like the SlotPicker's unselectable chips: the server clamps the
// value against the listing's own maxOccupancy on every call, so a crafted POST cannot declare 400 people.
//
// ⚠️ GREP GATE — NOW IN TWO FILES, AND BOTH MUST BE GREPPED. "No client price math here" is checked by
// grepping for the money formatter, the frozen-total field name and the currency glyph — all must return
// zero on this file AND on stepper-control.tsx, which is where the markup went. A gate left behind on a
// file that no longer holds the markup is not a gate. A named React import is used below rather than a
// namespace one so no line of code carries a stray multiplication glyph either. The only arithmetic in this
// file is on HEADCOUNTS (±1 and a clamp); if you ever need a peso figure here, you have taken a wrong turn
// — pass it down as a server-computed prop, exactly as PriceBreakdown does.

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { StepperControl } from "@/components/booking/stepper-control";
import { updateDeclaredPax } from "@/app/actions/booking";

export function PaxStepper({
  holdId,
  declaredPax,
  maxOccupancy,
}: {
  holdId: string;
  /** The PERSISTED booking.declared_pax (server-authoritative). The organizer is attendee #1 (D-113). */
  declaredPax: number;
  /** The listing's own cap. Courtesy bound only — the server re-clamps (Security V4). */
  maxOccupancy: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pax, setOptimisticPax] = useOptimistic(declaredPax);

  function commit(next: number) {
    const clamped = Math.min(Math.max(1, next), maxOccupancy);
    if (clamped === declaredPax) return;
    startTransition(async () => {
      setOptimisticPax(clamped);
      const res = await updateDeclaredPax(holdId, clamped);
      if (!res.ok) {
        // No manual rollback needed — leaving the transition restores the persisted prop.
        toast.error(res.error);
        return;
      }
      // Re-render the SERVER tree so the freshly-frozen quote (breakdown + total) replaces the old one.
      router.refresh();
    });
  }

  return (
    <StepperControl
      id="declared-pax"
      label="How many people are coming?"
      // D-113 — the organizer IS attendee #1, and saying so is the difference between a booker declaring
      // "3 friends" and "3 people including me". The cap names the listing's own maxOccupancy.
      helper={`This includes you. Up to ${maxOccupancy}.`}
      value={pax}
      min={1}
      max={maxOccupancy}
      disabled={pending}
      decrementLabel="Remove a guest"
      incrementLabel="Add a guest"
      onCommit={commit}
    />
  );
}
