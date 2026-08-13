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

import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/patterns/site-footer";

export default function ListingDetailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      {children}
      {/* SHELL-02. The `(detail)` / `book/` split above is what lets this land here and NOT one
          directory over — the sibling layout gets no footer, and the reason is written in it. */}
      <SiteFooter />
    </div>
  );
}
