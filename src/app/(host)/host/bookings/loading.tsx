// STATE-01 — the loading state for `/host/bookings`. Convention: see `(app)/bookings/loading.tsx`.
//
// This is the host-side twin of the booker's `/bookings` model: same `PageHeader`, same real
// `BookingsTabs` (a server component that reads nothing, so the strip is pixel-identical rather than
// a guessed bar), same `RowListSkeleton`. Both pages' title and lede are fixed strings at exactly
// `PageHeader`'s own `text-xl` scale, which is why the pattern is composed here and copied verbatim
// on the Display-scale surfaces.
//
// THE SAME `aria-current` CAVEAT AS THE BOOKER MODEL: `loading.tsx` receives no `searchParams`, so
// the strip shows `Upcoming` as current for the duration of the fallback even when `?tab=past` is
// what is loading. A wrong current-tab announcement for a sub-second window, traded for a strip that
// does not move when the rows land.
//
// NOT RENDERED, and recorded rather than faked: the multi-listing filter form beside the tabs, which
// appears only for a host with two or more spaces. It is a `<select>` populated from a query — the
// exact case where a placeholder would be asserting a shape that half of all hosts never see.

import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";
import { BookingsTabs } from "@/components/booking/bookings-tabs";

export default function HostBookingsLoading() {
  return (
    // Container, title, lede and both `mt-8` offsets are `(host)/host/bookings/page.tsx`'s own.
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <PageHeader title="Bookings" lede="Every booking across your spaces, upcoming and past." />

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <BookingsTabs basePath="/host/bookings" active="upcoming" />
      </div>

      <div className="mt-8">
        <RowListSkeleton label="Loading your bookings" />
      </div>
    </div>
  );
}
