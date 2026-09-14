import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";

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
          className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-4"
        >
          <span className="h-3 w-28 rounded bg-muted" />
          <span className="h-3 w-40 rounded bg-muted" />
        </div>

        <CardGridSkeleton label="Loading spaces" />
      </div>
    </main>
  );
}
