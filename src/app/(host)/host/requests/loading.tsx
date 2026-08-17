// STATE-01 — the loading state for `/host/requests`. Convention: see `(app)/bookings/loading.tsx`.
//
// The lede names the approval SLA, and it reads that number from `@/lib/payments/config` — the same
// import the page itself uses — rather than typing "24". A fallback that hardcoded the hours would be
// a second declaration of a payments constant, and it would silently start lying the first time the
// SLA moved, on the one surface whose entire subject is that deadline.
//
// A ROW LIST: the resolved page is a stack of request rows, each a guest waiting on a yes.

import { APPROVAL_SLA_HOURS } from "@/lib/payments/config";
import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";

export default function HostRequestsLoading() {
  return (
    // Container, title, lede and the `mt-8` offset are `(host)/host/requests/page.tsx`'s own.
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <PageHeader
        title="Requests"
        lede={
          `Guests waiting on your yes. Approve or decline within ${APPROVAL_SLA_HOURS} hours — ` +
          `after that a request expires and the slot frees automatically.`
        }
      />

      <div className="mt-8">
        <RowListSkeleton label="Loading your requests" />
      </div>
    </div>
  );
}
