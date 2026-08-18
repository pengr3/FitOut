"use client";

// ReserveActions (D-42/D-44 · D-57) — the terminal `Confirm & pay` control that wraps the confirmBooking
// server action. On click it disables + swaps the label to `Taking you to checkout…` (aria-disabled while
// submitting) so a double-click is a client-side no-op; the DB-level idempotency backstop lives in
// createPendingHold and the already-confirmed short-circuit lives in confirmBooking, so a booker
// double-clicking their OWN slot always resolves cleanly (D-42). D-57: the action now creates a hosted
// PayMongo checkout and REDIRECTS OFF-SITE on success — this component unmounts on navigation, so the
// on-success assumption still holds. The coral CTA is the one primary action on the reserve page; the
// reassurance line names the charged amount + rails honestly (`You'll pay {total} now…`).
//
// CORRECTION (T-08-79, quick task 260801-kv2): this header used to credit "the stable checkout
// Idempotency-Key" as part of the double-click story. It is not one — PayMongo does NOT honor the key on
// POST /v1/checkout_sessions (probed: two byte-identical POSTs mint two different payable session ids). The
// real guards are both SERVER-side: the compare-and-swap checkout lease, which admits exactly one concurrent
// attempt per booking, and expire-before-create, which retires a superseded session on a sequential
// resubmission. The disable below is a courtesy, never the guarantee.
//
// A booker refused by that lease gets `reason: "in-flight"` and we render the server's own sentence INLINE,
// keeping the page usable — reserve-view.tsx flips the whole page to HoldExpiredState only for
// `expired | denied | checkout`, and this hold has NOT expired.
//
// ⚠️ WE RENDER `result.error`, AND WE DO NOT IMPORT `CHECKOUT_IN_FLIGHT_MESSAGE`. Naming the constant and
// its module (src/lib/payments/checkout-lease.ts) in prose is fine; IMPORTING it is not. This is a
// "use client" component and that module imports drizzle + the schema, so an import would pull the ORM into
// the client bundle. Rendering the server-supplied string instead makes this component STRUCTURALLY
// incapable of drifting from the constant — there is no second copy to drift. The assertion against the
// literal belongs in the tests, which import it directly.
//
// Analog: the ConfirmDialog button-disable idiom (listing-card.tsx:96-107).
//
// ── BFLOW-06 (plan 12-11) — ONE STATE, ONE ACTION, TWO BOXES ─────────────────────────────────────────
// Below `lg:` the terminal action lives in a fixed bottom bar so a booker on a phone can reach it
// without scrolling past the breakdown; at `lg:` and above the desktop rail keeps it inline, exactly as
// it shipped. Both boxes are rendered by THIS component, from THIS component's `pending`, through THIS
// component's `handleConfirm` — `grep -n "confirmBooking" src/components/booking/` finds one call site,
// which is the property that matters on a money path where the provider does not honour an idempotency
// key. `hidden` is what keeps exactly one of the two reachable (`max-lg:hidden` on the inline control,
// `lg:hidden` on the bar), which is the same mechanism RESP-02's two booking placements use one route
// earlier; jsdom applies no Tailwind (D-131), so unit tests see BOTH and query accordingly.
//
// THE REASSURANCE LINE AND THE REFUSAL NOTICE STAY IN THE PANEL AT EVERY WIDTH, and that is a decision
// rather than an omission. A 64px bar has room for a label and an amount and nothing else; the sentence
// naming the amount, the rails and the destination belongs beside the money it describes, where the
// booker is already reading. Same shape as D-49's split of the countdown: the words stay, the control
// moves.

import * as React from "react";

import { Button } from "@/components/ui/button";
import { CheckoutStickyBar } from "@/components/booking/checkout-sticky-bar";
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
  /** The calm inline notice for a lease refusal (T-08-79). Server-supplied text, never a re-typed literal. */
  const [notice, setNotice] = React.useState<string | null>(null);

  async function handleConfirm() {
    if (pending) return; // D-42: guard the double-click even before the disabled attribute applies
    setPending(true);
    setNotice(null); // a fresh attempt clears the previous refusal before the next result lands
    try {
      // On success confirmBooking redirects (no return) and this component unmounts as we navigate; a
      // graceful failure resolves a ConfirmResult we surface + re-enable so the user can retry.
      const result: ConfirmResult | undefined = await confirmBooking(holdId);
      if (result) {
        // Scoped to `in-flight` ONLY. `checkout`/`expired`/`denied` stay the parent's whole-page recovery
        // path — surfacing them here too would show the booker two different recoveries at once.
        if (result.reason === "in-flight") setNotice(result.error);
        onResult?.(result);
        setPending(false);
      }
    } catch (e) {
      // A genuinely thrown error (never the mapped results) — re-enable so the CTA isn't stuck disabled.
      setPending(false);
      throw e;
    }
  }

  // ONE LABEL EXPRESSION, READ BY BOTH BOXES. Two copies could disagree about which state they are in,
  // and the state they would disagree about is "a payment is being started" — see the label's own note.
  const label = pending ? "Taking you to checkout…" : "Confirm & pay";

  return (
    <>
      <div className="space-y-2">
        <Button
          variant="brand"
          size="lg"
          onClick={handleConfirm}
          disabled={pending}
          aria-disabled={pending}
          // `max-lg:hidden` — the bar below owns this action on a phone. Hidden rather than unmounted:
          // a media query in JS is banned on this path, and `hidden` is what removes the inactive copy
          // from the accessibility tree so a role query finds exactly one reachable confirm per width.
          className="w-full max-lg:hidden"
        >
          {label}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          You&apos;ll pay {totalLabel} now — cards, GCash, Maya, or QR Ph. Payments are processed securely.
        </p>
        {/* Muted and quiet, never an alert variant and never red: nothing went wrong — the booker's own other
            attempt is winning. role="status" because it appears after an action they took. */}
        {notice ? (
          <p className="text-center text-sm text-muted-foreground" role="status">
            {notice}
          </p>
        ) : null}
      </div>

      {/* BFLOW-06's bottom bar. It owns no state and calls no action of its own — see this file's header
          and the bar's. The amount it renders is the SAME `totalLabel` string the reassurance line above
          names and `PriceBreakdown`'s `Total` formats, which is what makes their byte-equality a
          property of one `formatMoney` call rather than of three surfaces agreeing. */}
      <CheckoutStickyBar totalLabel={totalLabel} pending={pending} onConfirm={handleConfirm}>
        {label}
      </CheckoutStickyBar>
    </>
  );
}
