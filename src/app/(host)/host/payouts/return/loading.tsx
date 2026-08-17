// STATE-01 — the loading state for `/host/payouts/return`, where PayMongo drops the host after the
// hosted onboarding flow. Convention: see `(app)/bookings/loading.tsx`.
//
// THE HEADING IS RENDERED because "Thanks — that's submitted" is unconditional: this route thanks the
// host for submitting whether or not activation has landed yet, and only the sentence BELOW it forks
// on the payout state. That sentence is therefore absent here — it is the one thing on the page the
// database read decides, and previewing either branch would be telling a host their account is (or
// is not) ready before anything has been read.
//
// Copied through the page's own classes rather than `PageHeader`: `text-2xl` against the pattern's
// `text-xl`.
//
// VOICE (D-13): never "PayMongo", "KYC" or "webhook" — the announcement says payouts.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function PayoutReturnLoading() {
  return (
    // Container and the `mt-8` offset are `(host)/host/payouts/return/page.tsx`'s own, verbatim.
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Thanks — that&apos;s submitted</h1>

      <div className="mt-8">
        <PanelSkeleton label="Loading your payout status" />
      </div>
    </div>
  );
}
