import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";
import { SEARCH_BAR_SHELL_MIN_HEIGHT } from "@/lib/design/measurements";

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
          className={`grid w-full grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-2 sm:mx-auto sm:max-w-3xl ${SEARCH_BAR_SHELL_MIN_HEIGHT}`}
        >
          <span className="rounded-xl bg-muted" />
          <span className="rounded-xl bg-muted" />
          <span className="rounded-xl bg-muted" />
        </div>

        <CardGridSkeleton label="Loading spaces" />
      </div>
    </main>
  );
}
