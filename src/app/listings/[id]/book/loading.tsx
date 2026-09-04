// STATE-01 — the loading state for `/listings/[id]/book`, the checkout route.
// Convention: see `(app)/bookings/loading.tsx`.
//
// THE HEADING IS RENDERED AND THE LEDE IS NOT, and both halves are decisions. "Confirm and pay" is a
// fixed string at Display scale, so it is copied verbatim — through the page's own classes rather
// than `PageHeader`, whose contract is `text-xl` and which would shrink the largest text on the
// screen for the duration of the fallback. The line under it is the venue's timezone note, composed
// from the listing's city; there is no honest placeholder for it, so it is simply absent and the
// ~20px it occupies is accepted, measured, residual.
//
// SHELL-03 STILL HOLDS HERE. This route's layout renders zero `<a href>` inside the header so that
// nothing can silently abandon an active hold, and this file adds no link of its own — a "Back to
// the listing" escape hatch would be a convenience that undoes the reason the layout exists.
//
// ⚠ THE HEADING IS COPIED FROM `book/page.tsx` AND MOVES WITH IT (plan 12-11, BFLOW-07). It changed
// from the review-shaped wording to the payment-shaped one here in the same commit as the page. A
// skeleton that announces a different screen than the one arriving is a flash of the wrong page — and
// three e2e files record the *other* consequence of the duplication: a reachability guard built on this
// `<h1>` passes against THIS file, so specs wait for `price-total`, which only the resolved body has.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function CheckoutLoading() {
  return (
    // Container, header and the `mt-8` data-region offset are `book/page.tsx`'s own, verbatim.
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="space-y-1">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
          Confirm and pay
        </h1>
      </header>

      <div className="mt-8">
        <PanelSkeleton label="Loading your booking" />
      </div>
    </main>
  );
}
