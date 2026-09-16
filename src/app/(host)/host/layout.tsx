// Host route group layout — the DISTINCT host surface (D-04) and the REAL capability gate.
//
// This is the security boundary for hosting (threat T-04-02): the optimistic middleware and the
// UI mode switch can be bypassed via a direct URL, so EVERY page under (host) is gated HERE by a
// real server-side session check. A signed-out user is sent to /login; a signed-in user WITHOUT
// canHost is sent to / (the booking surface) — they must explicitly "Start hosting" (which flips
// canHost server-side) before this surface unlocks. The host UI is its own shell, not blended into
// the booker (app) pages (D-04).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// BOTH GATES ARE BLOCKING AND THEY STAY BLOCKING. NOTHING BELOW THEM MAY MOVE ABOVE THEM.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The session read, the /login redirect and the canHost redirect all run to completion BEFORE this
// function returns any JSX. This layout has TWO gates rather than one, so it is the file where the
// mistake is most expensive: moving either redirect behind the `<Suspense>` boundaries further down
// would stream the host dashboard's shell to a booker-only account and only then decide to send them
// away. What moved instead is the AMBIENT data: see `patterns/ambient-notifications.tsx`, whose
// header states what that file may not do, and `tests/design/blocking-session-gate.test.ts`, which
// asserts over the AST that neither gate sits inside a `Suspense` subtree here.
//
// Why it had to move at all: Next's documented behaviour is that a layout awaiting runtime data
// blocks navigation, so while this file awaited FOUR database reads a `loading.tsx` anywhere under
// (host) bought nothing — STATE-01 was unverifiable on most of the group.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AmbientHostNav, AmbientNotifications } from "@/components/patterns/ambient-notifications";
import { BellSlotSkeleton, NavSlotSkeleton } from "@/components/patterns/auth-slot-skeleton";
import { SiteChrome } from "@/components/patterns/site-chrome";
import { SiteFooter } from "@/components/patterns/site-footer";
import { NavIconMenu } from "@/components/nav-icon-menu";
import { HOST_NAV_LINKS } from "@/lib/nav";

export default async function HostLayout({
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

  // The real gate (D-04, T-04-02): no canHost => not allowed on the host surface.
  if (!u.canHost) {
    redirect("/");
  }

  // D-92 wants "a bell in the shared header", and as of plan 11-12 there IS a shared header — but
  // only its BOX is shared. `patterns/site-chrome.tsx` owns the height, the padding, the container
  // width, the bottom boundary, the stickiness and three named slots, so every composition in the app
  // measures the same. It owns nothing about CONTENT, which is what keeps D-04 intact: this shell
  // keeps its own wordmark, its own neutral-tint surface (the element below) and its own link set,
  // and the booker keeps its own. What ended is three independently-drifting BOXES, not the
  // distinction between the surfaces.
  //
  // THIS PARAGRAPH USED TO SAY *"There IS no shared header component… Do NOT refactor the two headers
  // into one here."* That instruction was correct when it was written and is now partially superseded,
  // by the plan that also wrote `site-chrome.tsx`'s own account of the merged/not-merged split. It is
  // amended rather than deleted because the half that still binds is the important half: do not merge
  // the two COMPOSITIONS. A shared box is not a shared header. The surface is named descriptively
  // rather than quoted, because the DS-13 leak gate counts that string and a comment that repeats it
  // is indistinguishable from a real call site.
  //
  // FOUR database reads used to sit here, all four now streamed: the D-65 pending-request count that
  // feeds the Requests badge, and the three ambient notification reads (the unread count, the recent
  // list and the database clock). All four live in `patterns/ambient-notifications.tsx` now, together
  // with the owner-scoping, the clock and the degradation arguments that travelled with them. They
  // are named descriptively for the same reason the surface above is: this plan's acceptance
  // criterion is a zero-count grep for those three identifiers in this file.
  return (
    <div className="flex min-h-full flex-col">
      <SiteChrome
        brand={
          <>
            FitOut <span className="text-muted-foreground">· Hosting</span>
          </>
        }
        brandHref="/host"
        surface="muted"
        nav={
          // ⚠ THIS COMMENT USED TO CLAIM THE FALLBACK WAS A SECOND `SiteNav` AND THAT THIS WAS SAFE:
          // *"the fallback is the identical `SiteNav` with no badges — which is byte-identical to the
          // resolved zero-count markup, because D-65 hides the badge at zero."* THAT CLAIM WAS
          // MEASURED AND IT IS FALSE, and it is replaced here rather than deleted so the next reader
          // inherits the correction instead of an absence.
          //
          // It was true of the LINKS and true of the BADGE — the two axes its author was thinking
          // about. It is false of the one axis that decides whether the two renders can be hydrated
          // against each other: `SiteNav` mounts `NavDrawer` -> `ResponsiveDialog` -> the app's one
          // Radix dialog below `md:`, and that dialog's trigger carries an `aria-controls` id
          // GENERATED PER RENDER. With a second `SiteNav` in the fallback, every `(host)` route
          // reported *"Hydration failed because the server rendered HTML didn't match the client. As
          // a result this tree will be regenerated on the client"*, with React's own diff naming
          // `<button … aria-label="Menu" … aria-controls="radix-_R_ad5ritulb_">` as client-only.
          // Cold cache and a production-build cache both, 1 each; the booker checkout route, whose
          // fallback is a plain box, 0. Transcript:
          // `.planning/phases/19.1-…/evidence/triage-host-hydration.txt`.
          //
          // So the fallback is now `NavSlotSkeleton` — the same static links from the same one
          // renderer, and the drawer trigger's `size-8` BOX instead of a second live trigger. The
          // boundary is unchanged in position and unchanged in what it wraps; what changed is that
          // only ONE side of it mounts the overlay. `tests/design/suspense-fallback-overlay.test.ts`
          // is what stops the second copy coming back.
          //
          // Unchanged and still true: the `<nav>` landmark itself is rendered by `SiteChrome` AROUND
          // this boundary, so it is present from the first byte and the landmark count is 1 at every
          // viewport whether the count has landed or not.
          <Suspense fallback={<NavSlotSkeleton links={HOST_NAV_LINKS} />}>
            <AmbientHostNav userId={session.user.id} />
          </Suspense>
        }
        actions={
          <>
            <NavIconMenu
              current="host"
              canBook={u.canBook ?? false}
              canHost={u.canHost ?? false}
            />
            {/* D-92 in-app notification centre — the SAME component the booker and public headers
                mount, sitting ALONGSIDE the D-65 Requests badge in the nav slot above. Two badges,
                two meanings: `Requests` is an action you owe someone; the bell is things that
                happened. Do not merge them. The fallback is the bell's own 44px box, so the cluster
                does not reflow when the read lands. */}
            <Suspense fallback={<BellSlotSkeleton />}>
              <AmbientNotifications userId={session.user.id} surface="host" />
            </Suspense>
          </>
        }
      />
      <main className="flex flex-1 flex-col">{children}</main>
      {/* SHELL-02 — the SAME footer the booker and public compositions render, and one of the very
          few things D-04 does NOT make distinct between the two shells. Its links are policy and
          product-level (Terms, Privacy, Find a space, Host your space), none of which is a host-side
          destination, so there is nothing here for the host surface to fork. */}
      <SiteFooter />
    </div>
  );
}
