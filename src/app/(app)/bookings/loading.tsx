// STATE-01 — the loading state for `/bookings`, and THE MODEL every other `loading.tsx` in this phase
// copies. It is also the file that was itself in violation of the rule it models, which is worth
// stating plainly rather than quietly fixing:
//
// ── WHAT WAS WRONG WITH THE SHIPPED MODEL (fixed here, plan 11-17) ────────────────────────────────
//   1. NO `role="status"`. It carried `aria-hidden="true"` on the row block and nothing else, so a
//      screen reader was told the placeholder is decorative — correct — and told NOTHING about the
//      page being busy. AC#18 asks every loading state for exactly one `role="status"` with a
//      non-empty accessible name; this file had zero. The phase treated it as the model for eighteen
//      new files, which is how one missing attribute becomes twenty.
//   2. A HARDCODED `h-20`, beside a comment deriving 80px from a Card's `p-4` around a 48px thumb.
//      That derivation moved to `ROW_CARD_HEIGHT` in `src/lib/design/measurements.ts` in plan 11-07;
//      the literal here was the second copy, and two files agreeing on a number is exactly the drift
//      STATE-01 exists to remove.
//
// Both are gone: the shell, the role and the box all come from `patterns/row-list-skeleton.tsx`.
//
// ── WHY THE TAB STRIP IS THE REAL COMPONENT AND NOT A PLACEHOLDER BAR ─────────────────────────────
// The shipped file drew the strip as `<Skeleton className="h-11 w-52" />` — two literal box classes
// standing in for a control whose real width is `2 × min-w-24 + p-[3px]`, i.e. a number nobody
// measured. `BookingsTabs` is a SERVER component that reads no data and takes no session: rendering
// the real one costs nothing and is pixel-identical to the resolved page by construction, which a
// guessed box can never be. That is the whole point of a loading state (11-12 measured a 132px reflow
// from getting this wrong on the notification bell).
//
// THE ONE HONEST CAVEAT: `loading.tsx` receives no `searchParams`, so the strip cannot know whether
// `?tab=past` is loading and renders `Upcoming` as current for the duration of the fallback. That is
// a wrong `aria-current` for a sub-second window, traded for a tab strip that does not move when the
// rows land. The alternative — a grey bar of approximately the right size — is wrong for the whole
// window AND moves.

import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";
import { BookingsTabs } from "@/components/booking/bookings-tabs";

export default function BookingsLoading() {
  return (
    // Container, title, lede and both `mt-8` offsets are `(app)/bookings/page.tsx`'s own, verbatim:
    // only the data region below swaps when the query lands.
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <PageHeader
        title="Your bookings"
        lede="Everything you've booked, and everything you've booked before."
      />

      <div className="mt-8">
        <BookingsTabs basePath="/bookings" active="upcoming" />
      </div>

      <div className="mt-8">
        <RowListSkeleton label="Loading your bookings" />
      </div>
    </div>
  );
}
