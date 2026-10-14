import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function StartHostingLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <PanelSkeleton label="Loading your hosting options." />
      </div>
    </main>
  );
}
