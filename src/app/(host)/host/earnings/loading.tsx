// STATE-01 — the loading state for `/host/earnings`. Convention: see `(app)/bookings/loading.tsx`.
//
// `PageHeader` with NO lede, because the page has none: "Earnings" is a bare `text-xl` h1 and the
// explanatory sentence about the 10% commission sits much further down, under the summary. The
// pattern renders the lede slot only when it is passed one, so the header box is exact.
//
// A ROW LIST: the region this page is waiting on is the payout table — one row per payout — and that
// is what the fallback claims. What it does NOT claim, deliberately, is everything between the title
// and that table: `PayoutBanner` renders only when payouts are not yet enabled, the cancellation-fee
// notice only when there is unrecovered debt, and `PayoutSummary` is two figures whose box is fixed
// but whose position depends on both of the conditionals above it. Three conditional blocks stacked
// above the data region is the UI-SPEC's "metrics are unpredictable" case; the honest fallback claims
// the list and leaves the rest to arrive.

import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";

export default function HostEarningsLoading() {
  return (
    // Container and the `mt-8` data-region offset are `(host)/host/earnings/page.tsx`'s own.
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <PageHeader title="Earnings" />

      <div className="mt-8">
        <RowListSkeleton label="Loading your earnings" />
      </div>
    </div>
  );
}
