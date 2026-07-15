"use client";

// ReserveActions (D-42/D-44) — the terminal `Confirm booking` control that wraps the confirmBooking server
// action. On click it disables + swaps the label to `Confirming…` (aria-disabled while submitting) so a
// double-click is a client-side no-op; the DB-level idempotency backstop lives in createPendingHold and the
// confirmed→confirmed short-circuit lives in confirmBooking, so a booker double-clicking their OWN slot
// always resolves to success (the confirmation page), never a false "just taken/expired" (D-42). The coral
// CTA is the one primary action on the reserve page; the `You won't be charged yet.` line sets the
// no-payment expectation honestly (Phase 4).
//
// Analog: the ConfirmDialog button-disable idiom (listing-card.tsx:96-107).

import * as React from "react";

import { Button } from "@/components/ui/button";
import { confirmBooking, type ConfirmResult } from "@/app/actions/booking";

export function ReserveActions({
  holdId,
  onResult,
}: {
  holdId: string;
  /** Surfaces a graceful failure (expired / denied) to the parent so it can flip to the expiry state. */
  onResult?: (result: ConfirmResult) => void;
}) {
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    if (pending) return; // D-42: guard the double-click even before the disabled attribute applies
    setPending(true);
    try {
      // On success confirmBooking redirects (no return) and this component unmounts as we navigate; a
      // graceful failure resolves a ConfirmResult we surface + re-enable so the user can retry.
      const result: ConfirmResult | undefined = await confirmBooking(holdId);
      if (result) {
        onResult?.(result);
        setPending(false);
      }
    } catch (e) {
      // A genuinely thrown error (never the mapped results) — re-enable so the CTA isn't stuck disabled.
      setPending(false);
      throw e;
    }
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        onClick={handleConfirm}
        disabled={pending}
        aria-disabled={pending}
        className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {pending ? "Confirming…" : "Confirm booking"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">You won&apos;t be charged yet.</p>
    </div>
  );
}
