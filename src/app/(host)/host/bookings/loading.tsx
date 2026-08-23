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

import { HOST_LIST_SHELL } from "@/lib/design/measurements";
import { HOST_BOOKINGS_HEADER } from "@/lib/host/bookings-copy";
import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";
import { BookingsTabs } from "@/components/booking/bookings-tabs";

export default function HostBookingsLoading() {
  return (
    // ⚠ THE CONTAINER AND THE HEADER ARE NO LONGER COPIED — THEY ARE IMPORTED (plan 14-07 · D-154).
    // This file used to type the page's container string and both of the page's sentences a second
    // time, and the two agreed only because somebody had typed them identically. Both halves now come
    // from ONE owner each — the declared host-list shell and the one bookings header pair — so the
    // plate cannot draw a different box or announce different words than the page it stands in for,
    // which is the entire job of a loading plate. Both `mt-8` region offsets below are still
    // `(host)/host/bookings/page.tsx`'s own.
    <div className={HOST_LIST_SHELL}>
      <PageHeader {...HOST_BOOKINGS_HEADER} />

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <BookingsTabs basePath="/host/bookings" active="upcoming" />
      </div>

      <div className="mt-8">
        <RowListSkeleton label="Loading your bookings" />
      </div>
    </div>
  );
}
