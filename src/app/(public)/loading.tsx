import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";
import { AUTH_SLOT_BOX, TEXT_BAR_HEIGHT } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

// Next.js streams this parameterless Server Component until the public page resolves.
export default function PublicLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-display">Find a space to play</h1>
          <p className="text-muted-foreground">
            Search fitness and recreational spaces you can book by the hour or the day.
          </p>
        </header>

        <div
          aria-hidden="true"
          data-testid="search-idle-pill-shell"
          className={cn(AUTH_SLOT_BOX, "flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background px-4")}
        >
          <span className={cn(TEXT_BAR_HEIGHT, "flex-1 rounded bg-muted")} />
          <span className={cn(TEXT_BAR_HEIGHT, "flex-1 rounded bg-muted")} />
        </div>

        <CardGridSkeleton label="Loading spaces" />
      </div>
    </main>
  );
}
