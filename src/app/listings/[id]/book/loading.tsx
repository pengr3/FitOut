// STATE-01 — the loading state for `/listings/[id]/book`, the checkout route.
// Convention: see `(app)/bookings/loading.tsx`.
//
// THE HEADING IS RENDERED AND THE LEDE IS NOT, and both halves are decisions. "Review and book" is a
// fixed string at Display scale, so it is copied verbatim — through the page's own classes rather
// than `PageHeader`, whose contract is `text-xl` and which would shrink the largest text on the
// screen for the duration of the fallback. The line under it is the venue's timezone note, composed
// from the listing's city; there is no honest placeholder for it, so it is simply absent and the
// ~20px it occupies is accepted, measured, residual.
//
// SHELL-03 STILL HOLDS HERE. This route's layout renders zero `<a href>` inside the header so that
// nothing can silently abandon an active hold, and this file adds no link of its own — a "Back to
// the listing" escape hatch would be a convenience that undoes the reason the layout exists.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function CheckoutLoading() {
  return (
    // Container, header and the `mt-8` data-region offset are `book/page.tsx`'s own, verbatim.
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="space-y-1">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
          Review and book
        </h1>
      </header>

      <div className="mt-8">
        <PanelSkeleton label="Loading your booking" />
      </div>
    </main>
  );
}
