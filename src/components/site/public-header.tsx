// SHELL-01 — THE public composition, in one place, for the three route trees that use it.
//
// `(public)/layout.tsx` (`/`, `/invite/[token]`), `listings/[id]/(detail)/layout.tsx` and
// `(auth)/layout.tsx` all render the SAME header. Writing it three times would recreate, on the
// public side, exactly the three-independently-drifting-boxes problem `site-chrome.tsx` exists to
// end — so the composition lives here and each layout is a two-line file.
//
// ── WHY THIS IS NOT IN `patterns/` ────────────────────────────────────────────────────────────────
// `patterns/site-chrome.tsx` is presentational and domain-ignorant: it owns geometry and three named
// slots and knows nothing about sessions, notifications or product copy. THIS file is the opposite —
// it is the composition, so it holds the wordmark text, the destinations, the session read and the
// notification read. Keeping the two apart is what lets the host and booker compositions differ from
// this one without any of the three forking the box.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SESSION IS READ ON THE SERVER, INSIDE A SUSPENSE BOUNDARY. NEVER FROM THE CLIENT. (T-11-SESSION)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `<PublicAuthSlot>` is an async Server Component that calls `auth.api.getSession({ headers: await
// headers() })` — the identical call `(app)/layout.tsx:28` and every owner-gated page in the app
// makes. A client fetch would be wrong twice over, and both halves matter:
//
//   • IT WOULD LEAK SESSION SHAPE INTO THE BUNDLE. Whatever the client asks for, it has to know the
//     shape of — so the user object's fields, the capability flags and the endpoint that serves them
//     all become part of a payload shipped to anonymous visitors on the app's most public pages.
//     Server-side, the anonymous visitor receives rendered markup for two buttons and nothing else.
//   • IT WOULD REINTRODUCE THE LAYOUT SHIFT THE SLOT CONTRACT EXISTS TO PREVENT. A client fetch
//     resolves AFTER hydration, i.e. after the page is interactive and being read; the slot would
//     swap its contents under the user's cursor. Server-side inside `<Suspense>`, the swap happens
//     during streaming, into a box that was already reserved at its final size.
//
// The `<Suspense>` boundary is what keeps the session read off the critical path: the header, the
// wordmark and the whole page below stream immediately, and only the slot's own contents wait.
//
// ── WHAT THIS DOES TO THE BUILD, PREDICTED AND MEASURED ───────────────────────────────────────────
// `await headers()` is a dynamic API, so every route under these three layouts becomes `ƒ Dynamic`.
// That flips `/login`, `/signup`, `/forgot-password`, `/reset-password` and `/_not-found` from
// `○ Static` — predicted in 11-RESEARCH § The Named Open Risk caveat 3, and harmless: dynamic routes
// are not prerendered, so the DB-free-build assertion is unaffected. The dynamic bailout fires BEFORE
// any database call, which is why the unreachable-`DATABASE_URL` build still exits 0.
//
// ── WHERE THE SIGNED-OUT PAIR WENT (plan 11-19) ──────────────────────────────────────────────────
// `Log in` + `Sign up` — and the paragraph explaining why `Sign up` is `variant="default"` and not
// `variant="brand"` — now live in `@/components/site/anonymous-auth-actions`, because
// `src/app/not-found.tsx` renders the same cluster and cannot import this file: the session read
// below reaches `@/lib/db`, and that route is prerendered. Nothing about the rendered pair changed.

import { Suspense } from "react";
import { headers } from "next/headers";

import { AmbientNotifications } from "@/components/patterns/ambient-notifications";
import { AuthSlotSkeleton } from "@/components/patterns/auth-slot-skeleton";
import { SiteChrome } from "@/components/patterns/site-chrome";
import { AnonymousAuthActions } from "@/components/site/anonymous-auth-actions";
import { NavIconMenu } from "@/components/nav-icon-menu";
import { auth } from "@/lib/auth";

/**
 * The public header. Wordmark home, no primary nav, a session-aware actions cluster.
 */
export function PublicHeader() {
  return (
    <SiteChrome
      brand="FitOut"
      brandHref="/"
      actions={
        <Suspense fallback={<AuthSlotSkeleton />}>
          <PublicAuthSlot />
        </Suspense>
      }
    />
  );
}

/**
 * The actions cluster, resolved from the session on the server.
 *
 * SIGNED OUT it is `Log in` (ghost) + `Sign up` (default) — and it NEVER collapses behind a
 * hamburger. The pair measures 138px against 226px available at 320px in grove, so it fits; and
 * hiding the acquisition CTA of a two-sided marketplace behind a menu is not a responsive strategy.
 *
 * SIGNED IN it is the booker cluster — navigation menu and bell — because a signed-in user who
 * moves between `/` and `/bookings` must not watch the header change identity underneath them. That
 * drift IS the problem this plan exists to end; a public header missing the bell would be a fourth
 * independently-drifting box wearing the shell's geometry.
 */
async function PublicAuthSlot() {
  const session = await auth.api.getSession({ headers: await headers() });

  // THE SIGNED-OUT PAIR MOVED TO `@/components/site/anonymous-auth-actions` (plan 11-19), and the
  // paragraph above about `Sign up` staying neutral moved with it. `src/app/not-found.tsx` renders the
  // same cluster and cannot import THIS file — the session read three lines up reaches `@/lib/db`, and
  // the root not-found is the one prerendered route left in the build. One component, two call sites,
  // rather than a second signed-out cluster on the app's most-hit anonymous surface.
  if (!session?.user) return <AnonymousAuthActions />;

  const u = session.user as typeof session.user & {
    canBook?: boolean;
    canHost?: boolean;
  };

  // THE THIRD COPY OF THE AMBIENT READ IS GONE (plan 11-12). This block used to hold the same eight
  // lines as `(app)/layout.tsx` and `(host)/host/layout.tsx` — the unread count, the recent list and
  // the database clock, owner-scoped in the query and wrapped so a failure degrades. Plan 11-10's
  // summary flagged it as the extraction 11-12 owed; `patterns/ambient-notifications.tsx` is where it
  // lives now, with the owner-scoping, the clock and the degradation arguments moved across intact.
  //
  // IT IS NOT GIVEN ITS OWN NESTED `<Suspense>` HERE, and the group layouts are the reason it is in
  // one there. Those two resolve the session BEFORE rendering, so the bell is the only thing in their
  // cluster still in flight and it gets its own boundary. On THIS surface the session read is itself
  // the pending thing — this whole component is already the boundary's child, behind
  // `AuthSlotSkeleton` — so a second boundary inside it would reserve a box inside a box that is
  // itself not yet drawn. The slot resolves as one unit, exactly as it did before the extraction.
  return (
    <>
      {/* D-92 in-app notification centre — the SAME async child both group headers mount. */}
      <AmbientNotifications userId={session.user.id} surface="public" />
      <NavIconMenu current="book" canBook={u.canBook ?? false} canHost={u.canHost ?? false} />
    </>
  );
}
