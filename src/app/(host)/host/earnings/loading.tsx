// STATE-01 — the loading state for `/host/earnings`. Convention: see `(app)/bookings/loading.tsx`.
//
// `PageHeader` with NO lede, because the page has none: the explanatory sentence about the 10%
// commission sits much further down, under the summary. The pattern renders the lede slot only when
// it is passed one, so the header box is exact. As of plan 14-01 the PAGE composes the same pattern
// with the same title, so this is no longer a fallback imitating a hand-rolled heading — it is the
// same component, rendered twice.
//
// A ROW LIST: the region this page is waiting on is the payout table — one row per payout — and that
// is what the fallback claims. What it does NOT claim, deliberately, is everything between the title
// and that table: `PayoutBanner` renders only when payouts are not yet enabled, the cancellation-fee
// notice only when there is unrecovered debt, and `PayoutSummary` is two figures whose box is fixed
// but whose position depends on both of the conditionals above it. Three conditional blocks stacked
// above the data region is the UI-SPEC's "metrics are unpredictable" case; the honest fallback claims
// the list and leaves the rest to arrive.

import { HOST_LIST_SHELL } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";

export default function HostEarningsLoading() {
  return (
    // The container is the DECLARED host-list shell, and the `mt-8` data-region offset is
    // `(host)/host/earnings/page.tsx`'s own. Until now this plate agreed with its page about the
    // container only because the same string was typed in both files; the two read one constant now,
    // so the fallback cannot draw a different box than the page it stands in for.
    <div className={HOST_LIST_SHELL}>
      <PageHeader title="Earnings" />

      <div className="mt-8">
        <RowListSkeleton label="Loading your earnings" />
      </div>
    </div>
  );
}
