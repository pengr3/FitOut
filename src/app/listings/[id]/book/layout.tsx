// SHELL-01 / SHELL-03 — the MINIMAL composition, for `/listings/[id]/book` only.
//
// ── WHAT "MINIMAL" MEANS, AND WHY IT IS NOT A FOURTH COMPOSITION ──────────────────────────────────
// This is the SAME shell as the public one with its slots left empty: the brand renders as a `<span>`
// rather than a `<Link>` (`brandHref={null}`), and neither `nav` nor `actions` is passed. The header
// box, its height, its border and its stickiness are byte-identical to every other route's — a booker
// who lands here does not experience a different application, they experience one with nothing to
// click away with.
//
// ── WHY THERE IS NOTHING TO CLICK ─────────────────────────────────────────────────────────────────
// SHELL-03: *"no navigation that can silently lose an active hold"*. The hold on this route is a real
// row in the database with a real expiry; a stray wordmark link home is a one-click way to abandon a
// slot the booker believes they are holding, with no warning and no way back. So the falsifiable form
// is an absence — `/listings/[id]/book` renders ZERO `<a href>` inside `[data-testid="site-header"]`
// — and it is guaranteed by the file tree (this layout wraps only `book/`) rather than by a
// conditional that a later edit could invert.
//
// ── THE `actions` SLOT IS EMPTY ON PURPOSE, AND PHASE 12 IS THE OWNER ─────────────────────────────
// Phase 12's SHELL-03 fills the actions slot with the LIVE HOLD COUNTDOWN — the one piece of chrome
// this route genuinely wants, because it tells the booker how long they have rather than offering
// them somewhere else to go. It is deliberately not built here: filling the slot now would mean
// Phase 12 REPLACING a header this phase has just built, instead of composing into the slot it left
// open for exactly that purpose. An empty slot with a named owner is a hand-off; an empty slot with
// no note is an oversight.
//
// The page itself (`book/page.tsx`) is untouched by this plan and stays where it is — only the
// wrapper is new.
//
// This is the ONE layout that composes `SiteChrome` directly rather than through
// `@/components/site/public-header`, and the reason is the point of the whole file: the public header
// is defined by what it CONTAINS, and this composition is defined by what it does not. Reaching for
// the public header and then subtracting from it would put the checkout's safety property inside a
// component whose job is to add things to headers.

import { SiteChrome } from "@/components/patterns/site-chrome";

export default function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* brandHref={null} renders the wordmark as a <span>. No `nav`, no `actions`, no footer. */}
      <SiteChrome brand="FitOut" brandHref={null} />
      {children}
    </div>
  );
}
