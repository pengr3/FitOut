// SHELL-01 — the PUBLIC composition for `/listings/[id]`, and the reason `(detail)` exists.
//
// ── THE STRUCTURAL PROBLEM THIS GROUP SOLVES ──────────────────────────────────────────────────────
// `/listings/[id]` needs the public header. `/listings/[id]/book` must NOT have it: SHELL-03 forbids
// navigation on the checkout route because any link there can silently lose an active hold. Those are
// sibling URLs under one dynamic segment, and a layout at `src/app/listings/layout.tsx` — or at
// `src/app/listings/[id]/layout.tsx` — would wrap BOTH, because `book/` nests inside `[id]/`.
//
// A route group fixes it without touching a single URL. `(detail)` and `book/` are now SIBLINGS:
//
//   listings/[id]/(detail)/layout.tsx  →  wraps only /listings/[id]      (public composition)
//   listings/[id]/book/layout.tsx      →  wraps only /listings/[id]/book (minimal composition)
//
// The minimal presentation is therefore a property of the FILE TREE rather than of a conditional
// inside one shared layout. There is no `pathname.startsWith("/book")` anywhere, and there is no way
// for a future edit to the public header to leak a link onto the checkout route by accident.
//
// The wrapper is `flex min-h-dvh flex-col` for the same reason `(public)/layout.tsx` gives: plan
// `11-14`'s footer hangs off it with `mt-auto`.

import { assertPublicListing } from "@/lib/listing/public-listing";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/patterns/site-footer";
import { STICKY_BAR_CLEARANCE } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

// ── AND THE SECOND REASON THIS FILE EXISTS: IT IS WHERE THE 404 STATUS IS WON ─────────────────────
//
// `page.tsx` 404s draft/unlisted/missing listings (D-13) and always has. But `loading.tsx` wraps the
// page in a Suspense boundary, so the shell — this layout — is flushed with a `200` status line
// BEFORE the page body runs `notFound()`. The route answered 200 with not-found content: no leak, but
// a soft 404, and only a real 404 removes an unpublished listing from a search index.
//
// A layout renders in the shell, ABOVE that boundary, so awaiting here blocks the flush and the status
// is still settable. That is the whole trick, and it is why this call cannot be moved into the page.
// `assertPublicListing`'s header carries the measurements, the two fixes that DON'T work, and why the
// eight sibling routes with the same defect are deliberately left alone.
export default async function ListingDetailLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  await assertPublicListing(id);

  return (
    // ── AND THE THIRD REASON: THIS DIV IS THE SMALLEST ELEMENT CONTAINING BOTH `<main>` AND THE
    // FOOTER, WHICH IS WHY THE STICKY-BAR CLEARANCE LIVES HERE AND NOT ONE FILE OVER ────────────────
    //
    // `STICKY_BAR_CLEARANCE` (`pb-20` = 80px = 64 for the bar + 16 for a gap) sat on `<main>` in
    // `page.tsx` from plan 12-10 until 2026-08-30, and there it bought nothing while the control that
    // actually needed it went uncovered. `[17-D9]`, measured 2026-08-29 at 320×568 scrolled to the
    // document bottom, identically in BOTH themes:
    //
    //     last focusable candidate            a("Privacy")   {y: 515, height: 18, bottom: 533}
    //     [data-testid="booking-sticky-bar"]                 {y: 504, height: 64, bottom: 568}
    //
    // The footer's Privacy link sits ENTIRELY inside the bar's 64px band (`a("Terms")` clears it by
    // 3px) — untappable, and unreachable by scrolling because the document is already at its end. No
    // clearance inside `<main>` can reach it: `SiteFooter` renders AFTER `<main>`, so the bottom 64px
    // of the DOCUMENT is footer. `[17-D10]` is the same fact from the other side — deleting the
    // clearance from `<main>` on this route changed NOTHING measurable, because the last control
    // inside `<main>` is `a("OpenStreetMap")` at `{y: 243}`, some 1,700px above the fold.
    //
    // So the 80px hangs off the one element that wraps `<main>` AND `SiteFooter`. The padding has to
    // be BELOW the footer to cover the footer; that is the whole move.
    //
    // ⚠ `lg:pb-0` IS NOW REQUIRED, and `page.tsx`'s old "unconditional because 80px of trailing space
    // on a desktop page is invisible" argument does NOT survive the move. That argument held only
    // while the padding sat INSIDE `<main>`, above a painted footer. Below the footer, unconditional
    // means an 80px strip of unpainted `--background` under a `bg-muted border-t` block at every
    // width — a new visual defect, not a fix. Both bars are `lg:hidden` (`booking-sticky-bar.tsx:167`,
    // `checkout-sticky-bar.tsx:80`), so there is nothing to clear at or above `lg:`, and `lg:pb-0`
    // makes the clearance track the bar's own breakpoint exactly rather than approximately.
    //
    // `book/page.tsx` keeps ITS clearance on `<main>`, and that is correct rather than an
    // inconsistency: that route renders no footer (`shell.spec.ts:1221` pins "0 footers" on a live
    // checkout), so there `<main>` IS the document's bottom. One constant, applied on each route to
    // whatever element ends the document. `e2e/mobile-booker-path.spec.ts` measures both, and its
    // DRIVE 4 is the watched red for this class.
    <div className={cn("flex min-h-dvh flex-col", STICKY_BAR_CLEARANCE, "lg:pb-0")}>
      <PublicHeader />
      {children}
      {/* SHELL-02. The `(detail)` / `book/` split above is what lets this land here and NOT one
          directory over — the sibling layout gets no footer, and the reason is written in it. */}
      <SiteFooter />
    </div>
  );
}
