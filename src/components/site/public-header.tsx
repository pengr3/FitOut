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
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// `Sign up` IS `variant="default"`, NOT `variant="brand"` — AND THAT IS A DEFERRAL, NOT A JUDGEMENT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Making the acquisition CTA coral is a perfectly defensible product call. It is just not this
// phase's to make: D-21 reserves the accent for the places someone explicitly asked for it, the
// reserved-for list is closed at 8 entries, and Phase 15 owns the auth surfaces this button leads to.
// A neutral primary button is the shipped default for every un-variantted `<Button>` in the app.

import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";

import { AuthSlotSkeleton } from "@/components/patterns/auth-slot-skeleton";
import { ProfileLink, SiteChrome } from "@/components/patterns/site-chrome";
import { ModeSwitch } from "@/components/mode-switch";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  toNotificationItems,
  type NotificationItemData,
} from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readDbNow } from "@/lib/booking/bookings-query";
import { countUnread, listRecent, NOTIFICATIONS_MAX_LIMIT } from "@/lib/notifications";

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
 * SIGNED IN it is the booker cluster — mode switch, bell, profile — because a signed-in user who
 * moves between `/` and `/bookings` must not watch the header change identity underneath them. That
 * drift IS the problem this plan exists to end; a public header missing the bell would be a fourth
 * independently-drifting box wearing the shell's geometry.
 */
async function PublicAuthSlot() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/login">Log in</Link>
        </Button>
        {/* `variant="default"` is written out even though it IS the default, which is against the
            repo's usual idiom (D-21: an un-variantted `<Button>` stays neutral, and the codebase
            leans on that). This is the one button in the app most likely to attract a future edit to
            `variant="brand"`, so the neutral is stated as a CHOICE sitting next to the paragraph
            above explaining why it was chosen — an absence cannot be read as a decision. */}
        <Button variant="default" asChild>
          <Link href="/signup">Sign up</Link>
        </Button>
      </>
    );
  }

  const u = session.user as typeof session.user & {
    canBook?: boolean;
    canHost?: boolean;
  };

  // Both reads are OWNER-SCOPED IN THE QUERY on session.user.id (T-07-82) — never post-filtered, and
  // never from anything the request supplied. Relative labels are composed against the DATABASE clock
  // (readDbNow), not the viewer's, because a skewed client clock would render "in 3 hours" on a
  // notification that just arrived. Both properties are copied from `(app)/layout.tsx:54-68`, which
  // is the shape plan 11-12 will consolidate when it converts that layout onto this same shell.
  //
  // WRAPPED, AND ON THIS SURFACE THAT MATTERS MORE THAN IT DOES IN `(app)`. A notification read is an
  // AMBIENT convenience; here it sits in the header of `/` and `/invite/[token]` — the app's front
  // door and a page opened by strangers holding a link. A throw would take down the whole public
  // surface for a signed-in visitor. It degrades to a calm in-panel message instead.
  let unreadCount = 0;
  let notificationItems: NotificationItemData[] = [];
  let notificationsFailed = false;
  try {
    const [unread, rows, now] = await Promise.all([
      countUnread(db, session.user.id),
      listRecent(db, session.user.id, NOTIFICATIONS_MAX_LIMIT),
      readDbNow(db),
    ]);
    unreadCount = unread;
    notificationItems = toNotificationItems(rows, now);
  } catch (err) {
    console.error("[notifications] bell_read_failed", { surface: "public", err });
    notificationsFailed = true;
  }

  return (
    <>
      {/* Airbnb-style booker/host context switch (D-04) — the public surface is a booking context. */}
      <ModeSwitch current="book" canBook={u.canBook ?? false} canHost={u.canHost ?? false} />
      {/* D-92 in-app notification centre — the SAME component both group headers mount. */}
      <NotificationBell
        unreadCount={unreadCount}
        items={notificationItems}
        error={notificationsFailed}
      />
      <ProfileLink />
    </>
  );
}
