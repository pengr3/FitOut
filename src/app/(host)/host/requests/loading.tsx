// STATE-01 — the loading state for `/host/requests`. Convention: see `(app)/bookings/loading.tsx`.
//
// The lede names the approval SLA, and it reads that number from `@/lib/payments/config` — the same
// import the page itself uses — rather than typing "24". A fallback that hardcoded the hours would be
// a second declaration of a payments constant, and it would silently start lying the first time the
// SLA moved, on the one surface whose entire subject is that deadline.
//
// A ROW LIST: the resolved page is a stack of request rows, each a guest waiting on a yes.
//
// ⚠ AND ABOVE THE MEDIUM BREAKPOINT IT IS NOT A STACK AT ALL — IT IS A TABLE. The page renders two
// trees and shows exactly one of them per width. That is why the height passed below is a RESPONSIVE
// declared value rather than a single box: this plate stands in for a 254px card at the 320px floor
// and for an 83px table row at the desktop width, and one bar cannot be both. Measured on this route
// in plan 14-15; the numbers, the widths and the ladder step chosen for each live with the constant.
//
// WHY THE OLD 80px BAR WAS THE WORST OF THE THREE HOST PLATES. The request row is the tallest shape
// in the product — a lead-emphasis countdown and its reason line, a two-term description list and a
// full-width row of touch-height approve/decline buttons — so a plate promising 80px was promising
// less than a third of what arrives. Four rows of that is roughly 700px of page that appears under
// the reader after the data lands, on the one host surface whose whole subject is a deadline.

import { APPROVAL_SLA_HOURS } from "@/lib/payments/config";
import { HOST_LIST_SHELL, HOST_REQUEST_ROW_HEIGHT } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";

export default function HostRequestsLoading() {
  return (
    // The container is the DECLARED host-list shell, and the `mt-8` data-region offset is
    // `(host)/host/requests/page.tsx`'s own. As of plan 14-06 the PAGE composes the same constant and
    // the same `PageHeader` with the same two strings, so this plate is no longer a fallback imitating
    // a hand-rolled heading inside a hand-typed box — it is the same component in the same container,
    // rendered twice. Neither half can move without the other going with it.
    <div className={HOST_LIST_SHELL}>
      <PageHeader
        title="Requests"
        lede={
          `Guests waiting on your yes. Approve or decline within ${APPROVAL_SLA_HOURS} hours — ` +
          `after that a request expires and the slot frees automatically.`
        }
      />

      <div className="mt-8">
        <RowListSkeleton label="Loading your requests" height={HOST_REQUEST_ROW_HEIGHT} />
      </div>
    </div>
  );
}
