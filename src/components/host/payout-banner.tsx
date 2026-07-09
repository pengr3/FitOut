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
import { startPayoutOnboarding } from "@/app/actions/paymongo-connect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** The host's live payout state, derived server-side from host_payout and passed in as a prop. */
export type PayoutStatus = "not_started" | "incomplete" | "enabled" | "paused";

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
  if (status === "enabled") {
    return (
      <Alert data-payout-banner="enabled">
        <AlertTitle className="flex items-center gap-2">
          <Badge className="bg-success text-success-foreground">Payouts enabled</Badge>
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

/** Derive the banner state from a host_payout row (or its absence). Shared by the dashboard + pages. */
export function derivePayoutStatus(
  row:
    | { paymongoAccountId: string | null; payoutsEnabled: boolean; activationStatus: string }
    | undefined
    | null,
): PayoutStatus {
  if (!row || !row.paymongoAccountId) return "not_started";
  if (row.payoutsEnabled) return "enabled";
  if (row.activationStatus === "declined") return "paused";
  return "incomplete";
}
