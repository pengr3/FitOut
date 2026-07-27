"use client";

// PaxStepper (GROUP-01/GROUP-05 · D-108/D-113, 08-UI-SPEC § 5) — the `declaredPax` control on the reserve
// page, rendered ONLY when the listing actually charges per head (`extraHeadFee > 0`). On a flat listing
// this component is never mounted, so those bookers see exactly the checkout they see today.
//
// ⚠️ THE ZERO-ARITHMETIC CONTRACT, inherited verbatim from price-breakdown.tsx and PROVEN BY ABSENCE here.
// This file contains NO price of any kind: no money formatter, no fee, no multiplication, no total. Changing
// the headcount calls `updateDeclaredPax`, which RE-FREEZES the quote server-side from the LISTING's own
// included/extra_head_fee (never anything this client sends), and then `router.refresh()` re-renders the
// server breakdown. A client that computed the new price optimistically would be showing a number PayMongo
// has not agreed to charge — the core-value trust failure (UI-SPEC Open Q5 / T-08-12).
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
// ⚠️ GREP GATE. "No client price math here" is checked by grepping this file for the money formatter and the
// frozen-total field name — BOTH must return zero, and a named React import is used below rather than a
// namespace one so no line of code carries a stray multiplication glyph either. The only arithmetic in this
// file is on HEADCOUNTS (±1 and a clamp); if you ever need a peso figure here, you have taken a wrong turn —
// pass it down as a server-computed prop, exactly as PriceBreakdown does.

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
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

  const atMin = pax <= 1;
  const atMax = pax >= maxOccupancy;

  return (
    <div className="space-y-2">
      <Label htmlFor="declared-pax">How many people are coming?</Label>
      <InputGroup className="h-11 w-40">
        <InputGroupAddon align="inline-start">
          <InputGroupButton
            className="size-9"
            aria-label="Remove a guest"
            disabled={atMin || pending}
            onClick={() => commit(pax - 1)}
          >
            <MinusIcon />
          </InputGroupButton>
        </InputGroupAddon>
        {/* Read-only by design: the value is whatever the SERVER last froze a price against, so it changes
            only through a committed re-quote. Arrow keys keep it fully keyboard-operable. */}
        <InputGroupInput
          id="declared-pax"
          type="number"
          inputMode="numeric"
          readOnly
          min={1}
          max={maxOccupancy}
          className="text-center tabular-nums"
          value={pax}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              commit(pax + 1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              commit(pax - 1);
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            className="size-9"
            aria-label="Add a guest"
            disabled={atMax || pending}
            onClick={() => commit(pax + 1)}
          >
            <PlusIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {/* D-113 — the organizer IS attendee #1, and saying so is the difference between a booker declaring
          "3 friends" and "3 people including me". The cap names the listing's own maxOccupancy. */}
      <p className="text-xs text-muted-foreground">This includes you. Up to {maxOccupancy}.</p>
    </div>
  );
}
