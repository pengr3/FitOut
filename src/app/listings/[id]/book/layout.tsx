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
// ── THE `actions` SLOT NOW HOLDS THE LIVE HOLD COUNTDOWN (D-49, plan 12-03) ───────────────────────
// Phase 11 left this slot empty with a named owner, and this is that owner composing into it rather
// than replacing the header around it: `SiteChrome` is called with the same `brand`, the same
// `brandHref={null}`, no `nav` and no footer — one new prop and nothing else. The countdown is the one
// piece of chrome this route genuinely wants, because it tells the booker how long they have rather
// than offering them somewhere else to go, and it is therefore not an `<a href>`: AC#5's zero-anchor
// count over this subtree is unaffected by it.
//
// ── WHY A CONTEXT WRAPS BOTH SLOTS, AND WHY `{children}` STAYS SERVER-RENDERED ─────────────────────
// The value the header displays — the hold's `expiresAt` — is read, OWNER-GATED, in `book/page.tsx`,
// one component tree BELOW the header that must display it, and an App Router layout receives nothing
// from the page it wraps. So both the header and `{children}` sit inside ONE `HoldProvider`
// (`components/booking/hold-provider.tsx`, which carries the whole argument), the page publishes its
// already-authorised `expiresAt` into it, and the countdown publishes `expired` back up for
// `ReserveView`'s D-44 swap. The layout itself fetches NOTHING: it composes.
//
// Wrapping `{children}` in a client provider does NOT client-ify the page. `children` is an
// ALREADY-RENDERED server node passed through as a prop — the standard App Router composition, and the
// reason this works at all. THIS FILE CARRIES NO BOUNDARY DIRECTIVE AND MUST NOT ACQUIRE ONE: adding
// the one that opts a module into the client graph would drag `book/page.tsx`'s owner gate, its db
// reads and every money computation on this route across the boundary in a single edit (GATE-05).
//
// NAMED DESCRIPTIVELY RATHER THAN SPELLED, and this is the TWELFTH instance of the collision the note
// four paragraphs down records. Plan 12-03's acceptance criterion is a zero-count grep for that
// directive over this file, and a comment that quotes it satisfies the prose while failing the check,
// on a tree that is exactly correct. `booking-row.tsx:112` set the precedent; `site-chrome.tsx:45-50`
// and this file's own header followed it.
//
// ── THERE IS NO FOOTER HERE, AND THE OMISSION IS THE REQUIREMENT (SHELL-02 / SHELL-03, plan 11-14) ─
// The shared footer pattern renders on all SIX other shell-composition sites in `src/app/**` and
// deliberately not on this one. A footer is a grid of links — Find a space, Host your space, Terms,
// Privacy — and SHELL-03's rule is about links, not about headers: any one of them abandons the hold
// this route is holding, silently, with no warning and no way back. Adding one here to make the six a
// seven would undo the entire reason this layout exists, and it would look like a consistency fix
// while doing it. `11-UI-SPEC.md` AC#5 and AC#7 both name this route as the carve-out;
// `global-error.tsx` is the other, for the unrelated reason that it receives no stylesheet at all.
//
// THE COMPONENT IS NAMED DESCRIPTIVELY ABOVE RATHER THAN BY ITS BINDING, and the reason is the
// eleventh instance of one recurring collision in this phase. 11-14's acceptance criteria are (1)
// this file carries a deliberate-omission comment and (2) a zero-count grep for the binding over this
// file — and a comment that spells the binding satisfies the first while failing the second, on a
// tree that is exactly correct. `booking-row.tsx:112` set the precedent and `site-chrome.tsx:45-50`
// followed it: name the thing you are refusing, do not spell it.
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
import { HoldProvider } from "@/components/booking/hold-provider";
import { HoldCountdown } from "@/components/booking/hold-countdown";

export default function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <HoldProvider>
      <div className="flex min-h-dvh flex-col">
        {/* brandHref={null} renders the wordmark as a <span>. No `nav`, no footer, and the one slot
            that IS filled holds a countdown rather than a link. */}
        <SiteChrome brand="FitOut" brandHref={null} actions={<HoldCountdown />} />
        {children}
      </div>
    </HoldProvider>
  );
}
