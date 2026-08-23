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
//
// ⚠ THE ROW HEIGHT IS RESPONSIVE BECAUSE THE PAGE RENDERS TWO TREES (plan 14-15). Below the medium
// breakpoint the resolved page is a stack of cards; at and above it the card stack is hidden and a
// table takes its place. Measured on this route: the resting row — a CONFIRMED booking, with a status
// badge and a three-term description list and no actions — is 196px at the 320px floor and 37px as a
// table row at the desktop width, against the 80px bar this plate drew at both. The declared constant
// carries both numbers and their derivation.
//
// AND IT CARRIES A DELTA THIS PLATE CANNOT CLOSE, recorded rather than smoothed over: a row whose
// booking is still awaiting the host's answer grows an approve/decline actions row and measures
// 232–252px at the floor and 61px at the desktop width. This tab mixes both shapes, so no single bar
// is right for every row it will hold. The bar draws the ordinary case; the geometry spec pins the
// deviation with both measured numbers so a later change to it fails visibly.

import { HOST_BOOKING_ROW_HEIGHT, HOST_LIST_SHELL } from "@/lib/design/measurements";
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
        <RowListSkeleton label="Loading your bookings" height={HOST_BOOKING_ROW_HEIGHT} />
      </div>
    </div>
  );
}
