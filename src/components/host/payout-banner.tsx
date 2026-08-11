"use client";

// Persistent payout-setup banner (D-12/D-13/D-14). A host can create, edit, AND publish listings with
// no payout setup — this banner only NUDGES; it never blocks publishing. Payout onboarding is what makes
// a listing BOOKABLE (the webhook-driven gate), so the banner reflects the live payout state and offers
// the right call to action for each one.
//
// VOICE (02-UI-SPEC line 106): host-facing copy never says "Stripe" / "PayMongo" / "KYC" / "webhook" —
// we say "payouts" / "get paid". The banner uses the neutral/destructive alert (coral is NOT used here).
//
// The interactive states call the startPayoutOnboarding server action, then redirect the browser to the
// PayMongo-hosted onboarding URL it returns (single-use link, minted fresh on every click server-side).

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { startPayoutOnboarding } from "@/app/actions/paymongo-connect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PayoutStatus } from "./payout-status";

// PayoutStatus + derivePayoutStatus live in ./payout-status (a NON-client module) so Server
// Components can call derivePayoutStatus — a "use client" module's exports become client
// references and cannot be invoked server-side (that crashed the /host dashboard in UAT).
export type { PayoutStatus } from "./payout-status";

export function PayoutBanner({ status }: { status: PayoutStatus }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function beginOnboarding() {
    setError(null);
    startTransition(async () => {
      const res = await startPayoutOnboarding();
      if (res.ok) {
        // Redirect into the hosted onboarding flow (single-use link, minted fresh server-side).
        window.location.href = res.url;
      } else {
        setError(res.error);
      }
    });
  }

  // Payouts enabled → all set; a listing that's published can now accept bookings.
  //
  // DS-10 / D-14: this badge was a FILLED green chip carrying its meaning in the fill alone — no icon at
  // all, so to a colour-blind reader it was indistinguishable from any other chip. It now takes the
  // `positive` recipe (ink on the neutral tint) AND the CheckCircle2 glyph that carries the hue, so it is
  // icon + text like every other status in the vocabulary rather than colour-only.
  if (status === "enabled") {
    return (
      <Alert data-payout-banner="enabled">
        <AlertTitle className="flex items-center gap-2">
          <Badge className="border-transparent bg-muted text-foreground">
            <CheckCircle2 className="size-3 text-success" aria-hidden="true" />
            Payouts enabled
          </Badge>
        </AlertTitle>
        <AlertDescription>
          You&apos;re all set to get paid — your published listings can accept bookings.
        </AlertDescription>
      </Alert>
    );
  }

  // Auto-reverted (D-14) — the account needs attention; bookings are paused until it's resolved.
  if (status === "paused") {
    return (
      <Alert variant="destructive" data-payout-banner="paused">
        <AlertTitle>Bookings are paused</AlertTitle>
        <AlertDescription>
          Your payout account needs attention — guests can&apos;t book until it&apos;s resolved.
        </AlertDescription>
        <div className="mt-3">
          <Button onClick={beginOnboarding} disabled={pending}>
            Review payout setup
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </Alert>
    );
  }

  // Not started, or started-but-not-finished — the persistent nudge (never blocks publishing).
  const isIncomplete = status === "incomplete";
  return (
    <Alert data-payout-banner={isIncomplete ? "incomplete" : "not_started"}>
      <AlertTitle>
        {isIncomplete ? "Finish setting up payouts" : "Set up payouts to accept bookings"}
      </AlertTitle>
      <AlertDescription>
        {isIncomplete
          ? "You've started payout setup. Finish it so guests can book your space and you get paid."
          : "You can create and publish listings now. To accept bookings and get paid, set up payouts."}
      </AlertDescription>
      <div className="mt-3">
        <Button onClick={beginOnboarding} disabled={pending}>
          {isIncomplete ? "Finish payout setup" : "Set up payouts"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </Alert>
  );
}

// derivePayoutStatus moved to ./payout-status (see the import note above) so Server Components
// can call it. The banner is a pure presentational client component driven by the `status` prop.
