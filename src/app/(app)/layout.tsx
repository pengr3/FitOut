// Logged-in booker shell (the (app) route group).
//
// This is the REAL per-page session gate (the optimistic middleware only hints): every page under
// (app) requires a session; if there is none we redirect to /login (threat T-04-06). The header
// hosts the Airbnb-style mode switch so a user can flip between booking and hosting context, plus a
// link to their profile.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE GATE IS BLOCKING AND IT STAYS BLOCKING. NOTHING BELOW IT MAY MOVE ABOVE IT.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The session read and the redirect below run to completion BEFORE this function returns any JSX.
// That ordering is the whole of T-04-06, and it is the reason plan 11-12 was the riskiest edit in its
// phase: moving either line behind the `<Suspense>` boundary further down would stream this gated
// shell to an anonymous browser and only then decide to redirect it — and bytes already on the wire
// cannot be un-sent. What moved instead is the AMBIENT read: see `patterns/ambient-notifications.tsx`,
// whose header states what that file may not do, and `tests/design/blocking-session-gate.test.ts`,
// which asserts over the AST that neither gate sits inside a `Suspense` subtree here.
//
// Why it had to move at all: Next's documented behaviour is that a layout awaiting runtime data
// blocks navigation, so while this file awaited three database reads a `loading.tsx` anywhere under
// (app) bought nothing — STATE-01 was unverifiable on most of the group.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AmbientNotifications } from "@/components/patterns/ambient-notifications";
import { BellSlotSkeleton } from "@/components/patterns/auth-slot-skeleton";
import { ProfileLink, SiteChrome } from "@/components/patterns/site-chrome";
import { SiteFooter } from "@/components/patterns/site-footer";
import { ModeSwitch } from "@/components/mode-switch";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const u = session.user as typeof session.user & {
    canBook?: boolean;
    canHost?: boolean;
  };

  // D-92 wants "a bell in the shared header", and as of plan 11-12 there IS a shared header — but
  // only its BOX is shared. `patterns/site-chrome.tsx` owns the height, the padding, the container
  // width, the bottom boundary, the stickiness and three named slots, so every composition in the app
  // measures the same. It owns nothing about CONTENT, which is what keeps D-04 intact: the host shell
  // stays deliberately distinct (its own wordmark, its own neutral-tint surface, its own link set)
  // and this one keeps its own. What ended is three independently-drifting BOXES, not the distinction
  // between the surfaces.
  //
  // THIS PARAGRAPH USED TO SAY *"There IS no shared header component… Do NOT refactor the two headers
  // into one here."* That instruction was correct when it was written and is now partially superseded,
  // by the plan that also wrote `site-chrome.tsx`'s own account of the merged/not-merged split. It is
  // amended rather than deleted because the half that still binds is the important half: do not merge
  // the two COMPOSITIONS. A shared box is not a shared header. The host header's surface is named
  // descriptively rather than quoted, because the DS-13 leak gate counts that string and a comment
  // that repeats it is indistinguishable from a real call site.
  //
  // The three ambient reads that used to sit here — the unread count, the recent list and the
  // database clock — now live in `patterns/ambient-notifications.tsx`, behind the boundary below,
  // together with the owner-scoping, the clock and the degradation arguments that travelled with
  // them. They are named descriptively for the same reason the surface above is: this plan's
  // acceptance criterion is a zero-count grep for those three identifiers in this file.
  return (
    <div className="flex min-h-full flex-col">
      <SiteChrome
        brand="FitOut"
        brandHref="/"
        actions={
          <>
            {/* Airbnb-style booker/host context switch (D-04) — currently in the booking context.
                Rendered OUTSIDE the boundary: it is derived from the session this function has
                already awaited, so it has nothing to wait for. */}
            <ModeSwitch
              current="book"
              canBook={u.canBook ?? false}
              canHost={u.canHost ?? false}
            />
            {/* D-92 in-app notification centre — the same component the host and public headers
                mount, and the ONLY part of this cluster that touches the database. The fallback is
                the bell's own 44px box, so the cluster does not reflow when the read lands. */}
            <Suspense fallback={<BellSlotSkeleton />}>
              <AmbientNotifications userId={session.user.id} surface="app" />
            </Suspense>
            <ProfileLink />
          </>
        }
      />
      <main className="flex flex-1 flex-col">{children}</main>
      {/* SHELL-02 — the same footer every other composition renders. It sits AFTER `<main>` and
          OUTSIDE the Suspense boundaries above: it reads two constants and reaches nothing, so it
          has nothing to wait for and must not be inside a fallback's subtree. */}
      <SiteFooter />
      {/* WR-04: mount the Toaster exactly once at the shared ancestor, the same idiom the host
          availability page uses. Until now it was mounted ONLY on three host pages, so every
          `toast()` on the booker side resolved into silence — Phase 7's cancel/refund surfaces and
          all four Phase 8 group controls among them. ShareLinkBox's "Link copied" is the ONLY
          confirmation the organizer gets that the copy worked, and RemoveAttendeeButton's calm
          error sentences are its only failure channel; both were unreachable. Mounting it here
          covers every page under (app) at once. Do NOT also mount it per-page underneath this —
          two Toasters render a toast twice. It stays OUTSIDE the `<Suspense>` boundary above and
          outside `SiteChrome`: it is a portal host for the whole group, not header content. */}
      <Toaster />
    </div>
  );
}
