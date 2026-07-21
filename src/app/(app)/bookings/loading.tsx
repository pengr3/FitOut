// Skeleton for /bookings. Row heights match the real rows (a card is p-4 around a 48px thumbnail, so ~80px)
// so the list does not jump when the data lands — the shell, the title and the tab strip all stay put and
// only the rows swap in (07-UI-SPEC § 1, Loading).

import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_ROWS = [0, 1, 2, 3];

export default function BookingsLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Your bookings</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Everything you&apos;ve booked, and everything you&apos;ve booked before.
      </p>

      <div className="mt-8">
        <Skeleton className="h-11 w-52 rounded-lg" />
      </div>

      <div className="mt-8 space-y-3" aria-hidden="true">
        {PLACEHOLDER_ROWS.map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}