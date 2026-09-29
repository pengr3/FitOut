import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function PayoutsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Payout destination</h1>
      <div className="mt-8">
        <PanelSkeleton label="Loading payout destination" />
      </div>
    </div>
  );
}
