import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

// The payout destination page waits on session, database, and bank directory reads.
export default function PayoutsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Payout destination</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Choose where FitOut should send your earnings after a completed session. Your account details are encrypted and are never shown on your public profile.
      </p>
      <div className="mt-8">
        <PanelSkeleton label="Loading payout destination" />
      </div>
    </div>
  );
}
