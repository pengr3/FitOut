"use client";

// ReserveActions (D-42/D-44 · D-57) — the terminal `Confirm & pay` control that wraps the confirmBooking
// server action. On click it disables + swaps the label to `Taking you to checkout…` (aria-disabled while
// submitting) so a double-click is a client-side no-op; the DB-level idempotency backstop lives in
// createPendingHold and the already-confirmed short-circuit + the stable checkout Idempotency-Key live in
// confirmBooking, so a booker double-clicking their OWN slot always resolves cleanly (D-42). D-57: the
// action now creates a hosted PayMongo checkout and REDIRECTS OFF-SITE on success — this component unmounts
// on navigation, so the on-success assumption still holds. The coral CTA is the one primary action on the
// reserve page; the reassurance line names the charged amount + rails honestly (`You'll pay {total} now…`).
//
// Analog: the ConfirmDialog button-disable idiom (listing-card.tsx:96-107).

import * as React from "react";

import { Button } from "@/components/ui/button";
import { confirmBooking, type ConfirmResult } from "@/app/actions/booking";

export function ReserveActions({
  holdId,
  totalLabel,
  onResult,
}: {
  holdId: string;
  /** Server-formatted charged amount (formatMoney(quotedTotalCents, currency)) — the truthful "you'll pay". */
  totalLabel: string;
  /** Surfaces a graceful failure (checkout / expired / denied) to the parent so it can flip to a calm state. */
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
        {pending ? "Taking you to checkout…" : "Confirm & pay"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You&apos;ll pay {totalLabel} now — cards, GCash, Maya, or QR Ph. Payments are processed securely.
      </p>
    </div>
  );
}
