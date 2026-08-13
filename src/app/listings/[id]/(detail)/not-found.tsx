// The listing detail route's not-found boundary — what `(detail)/page.tsx:122`'s `notFound()` renders.
//
// ── THE SEGMENT BOUNDARY IS THE POINT ────────────────────────────────────────────────────────────
// It sits in `(detail)/` rather than in `listings/[id]/`, so it is a sibling of the page that raises
// it and it renders inside `(detail)/layout.tsx` — which supplies the public header. Placing it one
// level up would also have made it the boundary for `listings/[id]/book`, the checkout route whose
// whole layout contract (SHELL-03) is that it carries no navigation at all while a hold is live.
// The header therefore comes from the layout, and this file renders only the panel.
//
// ── AN UNLISTED SPACE IS A NORMAL STATE ──────────────────────────────────────────────────────────
// A listing reaches here when it is missing, unpublished, or soft-deleted — i.e. mostly when a host
// took it down, which is a thing hosts are supposed to be able to do. The person reading this did
// nothing wrong and nothing is broken, so 11-UI-SPEC's copywriting contract bans two things on this
// surface: the HTTP status number, and the word for a fault. Neither appears anywhere in this file,
// COMMENTS INCLUDED, so the zero-count in this plan's acceptance criteria is unambiguous rather than
// dependent on a stripper.
//
// The same rule is why the glyph is muted and not red: occupancy and unavailability are never an
// alarm in this app (D-14 / 11-UI-SPEC § Color), and `EmptyState`'s neutral tone is the one that
// says "this is a state", not "this is a problem".
//
// The single action is the app's core value — find a space — rather than a browser-flavoured "go
// back": somebody who opened a stale listing link still wants a court at 7pm.
//
// ── MEASURED: THIS PANEL IS CLIENT-RENDERED, AND THAT IS THE FRAMEWORK'S CHOICE, NOT THIS FILE'S ──
// `curl` against `next start` (plan 11-19, Next 16.2.7): `/listings/does-not-exist` answers with the
// right status, and the initial HTML is a bare `__next_…__` document shell — no header, no panel.
// This component arrives in the flight payload beside it (both its copy and the header markup are in
// there, measured) and React renders it once the client boots. Same shape in `next dev`.
//
// The root not-found does NOT behave this way: an unmatched URL like `/nope`, or
// `/listings/does-not-exist/extra`, is fully server-rendered. The difference is WHEN the segment
// gives up. An unmatched URL never enters a page; here the page raises the signal DURING a render
// whose layout has already begun streaming a `<Suspense>` shell for the header's auth slot (plan
// 11-10), so there is no un-sent HTML left to replace and the fallback has to happen on the client.
//
// The consequence is honest and small: a visitor with scripting disabled gets a blank page with the
// correct status instead of this panel. The alternative — returning this component from the page
// instead of raising the signal — would serve a 2xx for a listing that is gone, which tells crawlers
// to keep the URL and is a worse trade than a blank page for a rare visitor. Recorded in
// `deferred-items.md`; if Next later renders these boundaries on the server, nothing here changes.

import Link from "next/link";
import { MapPinOffIcon } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";
import { Button } from "@/components/ui/button";

export default function ListingNotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
      <EmptyState
        icon={MapPinOffIcon}
        title="This space isn't available"
        body="It may have been unlisted, or the link may be out of date."
        actions={
          <Button asChild>
            <Link href="/">Find another space</Link>
          </Button>
        }
      />
    </main>
  );
}
