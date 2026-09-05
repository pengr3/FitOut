// STATE-01 / SHELL-01 — the header auth slot's `<Suspense>` fallback.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS IS FOR: THE SLOT MUST BE THE SAME SIZE EMPTY AS IT IS FULL
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `/` and `/listings/[id]` read no session today. A session-aware header opts them into dynamic
// rendering, and the session read is the one thing in the header that resolves LATER than the rest of
// it — so the boundary between "resolving" and "resolved" is the only place a layout shift can come
// from. `site-chrome.tsx` reserves the box (`AUTH_SLOT_BOX` — `h-8 min-w-44`, right-anchored) and
// this component fills it while the session is in flight.
//
// Every box class here is read from `@/lib/design/measurements`, and that is mechanical rather than
// stylistic (AC#16 / T-11-GEODRIFT): a fallback that writes its own `h-8` beside a slot that also
// writes `h-8` satisfies a review and drifts the first time one of them changes — and the drift shows
// up as the layout shift this component exists to prevent, caused by this component. There is one
// spelling of each number, and it is in the inventory.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// IT READS AS "TWO CONTROLS ARE COMING", NOT AS A BLANK
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A reserved-but-empty box is the correct GEOMETRY and the wrong SIGNAL: a header with a visible hole
// in its top-right corner reads as broken, not as loading. Two shimmering boxes at the widths of the
// two controls that are about to appear (`AUTH_SLOT_CONTROL` = the mode switch's 96px,
// `AUTH_SLOT_ICON` = the bell's 32px) say what is happening without claiming to know which of the
// anonymous or signed-in clusters will win.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// IT IS A SERVER COMPONENT AND IT IS `aria-hidden`
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// No state, no effect, no event handler — nothing here needs the client, and a `<Suspense>` fallback
// that shipped JavaScript would be paying for the privilege of rendering two grey rectangles.
//
// `aria-hidden` rather than `role="status"`, which is the OPPOSITE call from the three shipped
// skeleton shells in this directory, and the difference is the point. Those three stand in for a
// PAGE's content and a screen-reader user needs to know the page is still arriving. This one stands
// in for a header affordance that has not appeared yet; announcing "loading" for the top-right corner
// of every page in the application is noise on every single navigation. The slot resolves in
// milliseconds and its resolved contents announce themselves.

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SECOND FALLBACK: A SLOT THAT IS ALREADY RESOLVED EXCEPT FOR ONE CONTROL (PLAN 11-12)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `AuthSlotSkeleton` above stands in for the WHOLE cluster, on the three PUBLIC compositions, where
// the session itself is what has not resolved yet and nobody knows which cluster will win.
//
// The two GROUP layouts are the opposite case and need the opposite fallback. `(app)` and `(host)`
// resolve the session BEFORE they render anything (that is the security gate, and plan 11-12 keeps it
// blocking), so the mode switch and the profile link are known immediately and are rendered outside
// the boundary. The only thing still in flight is the notification read — one control. Mounting the
// whole-cluster fallback there would put a 176px `min-w-44` box INSIDE an already-populated 234px
// cluster and then collapse it: measured on the source, 366px pending against 234px resolved, a 132px
// reflow on every authenticated page. `BellSlotSkeleton` is the bell's own box and nothing else, so
// the pending and resolved widths are equal.

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE THIRD FALLBACK: A SLOT WHOSE RESOLVED CHILD MOUNTS AN OVERLAY, AND WHOSE FALLBACK MUST NOT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `NavSlotSkeleton` is the host nav slot's fallback, and it exists because of a MEASUREMENT rather
// than because the slot wanted a shimmer. `(host)/host/layout.tsx` used to pass a whole second
// `SiteNav` as its fallback, which mounts `NavDrawer` -> `ResponsiveDialog` -> the app's one Radix
// dialog below `md:`. A Radix dialog trigger carries an `aria-controls` id GENERATED PER RENDER from
// React's own id hook, so the fallback render and the resolved render cannot agree on it, and every
// `(host)` route reported *"Hydration failed … this tree will be regenerated on the client"* with
// that button and that attribute named in React's own diff. Transcript:
// `.planning/phases/19.1-…/evidence/triage-host-hydration.txt`.
//
// The shape of the repair is not a preference either — it is the one the CONTROL in that same
// transcript selects. `(app)/layout.tsx` streams too, and it emits zero mismatches, and the only
// structural difference is that its fallback is `BellSlotSkeleton`: a box, not a second copy of an
// id-bearing subtree. So this file gains a third fallback of exactly that kind rather than the app
// gaining a second overlay mechanism (RESP-01 forbids one) or the vendored dialog being edited.
//
// WHAT IT RESERVES, AND WHY IT IS NOT A BLANK. Above `md:` the nav's LINKS are the same static
// inventory in both states — they read no session, generate no id and are safe to render in a
// fallback — so they are rendered here, from the ONE `NavLinks` renderer, never a second copy of the
// markup. Below `md:` the live drawer trigger is replaced by its own `AUTH_SLOT_ICON` box, which is
// byte-identical geometry to the `Button size="icon"` that lands: `size-8` on both sides, so the nav
// does not reflow when the badge count arrives.
//
// ⚠ THE BADGE IS DELIBERATELY ABSENT HERE AND THAT IS NOT A REGRESSION. D-65 hides the badge at zero,
// so a fallback with no badges is identical to the resolved ZERO-count nav; a non-zero count is the
// only thing that changes the nav's width when it lands, and that was already true before this file
// owned the fallback.

import { NavLinks } from "@/components/patterns/site-chrome";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AUTH_SLOT_BOX,
  AUTH_SLOT_CONTROL,
  AUTH_SLOT_ICON,
  NOTIFICATION_BELL_BOX,
} from "@/lib/design/measurements";
import type { NavLink } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AuthSlotSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={cn(AUTH_SLOT_BOX, "flex items-center justify-end gap-3")}
    >
      <Skeleton className={AUTH_SLOT_CONTROL} />
      <Skeleton className={cn(AUTH_SLOT_ICON, "rounded-full")} />
    </div>
  );
}

/**
 * The notification bell's `<Suspense>` fallback: one 44px placeholder, `aria-hidden`.
 *
 * `aria-hidden` for the same reason `AuthSlotSkeleton` is, and here the argument is stronger rather
 * than weaker: this stands in for a single header affordance that resolves in milliseconds, on every
 * navigation in the signed-in app. Announcing "loading" for the top-right corner of every page would
 * be noise, and the bell's resolved state announces itself (`aria-label="Notifications, N unread"`).
 *
 * `rounded-lg` matches `ui/button.tsx`'s base radius — the bell is a ghost icon BUTTON, a rounded
 * square, not the circle `AuthSlotSkeleton`'s icon placeholder draws for an avatar.
 */
export function BellSlotSkeleton() {
  return <Skeleton aria-hidden="true" className={cn(NOTIFICATION_BELL_BOX, "rounded-lg")} />;
}

/**
 * The host nav slot's `<Suspense>` fallback: the static links, and the drawer trigger's box.
 *
 * See the block above this file's imports for the measurement that produced it. The property it
 * exists to hold is narrow and it should be stated narrowly: **a streaming boundary's fallback and
 * its resolved child must not both mount the subtree that composes the app's one overlay primitive**,
 * because that primitive carries a per-render generated identity attribute the two renders cannot
 * agree on. It is NOT "do not stream a nav slot" — the slot still streams, and the links in it still
 * render before the count lands.
 *
 * `aria-hidden` on the placeholder, for `BellSlotSkeleton`'s reason and not a weaker one: it stands in
 * for a single header affordance that resolves in milliseconds on every navigation of the host
 * surface, and the resolved control announces itself (`aria-label="Menu"`). `rounded-lg` matches
 * `ui/button.tsx`'s base radius, because what lands here is a ghost icon BUTTON.
 *
 * A SECOND PROPERTY FALLS OUT OF THIS, AND IT IS THE ONE THE E2E SUITE CARES ABOUT. While the slot is
 * pending there is now NO `button[aria-label="Menu"]` in the document at all — where before there was
 * one that React then replaced. `e2e/helpers/booker-seed.ts:118-160` records that exact shape as the
 * lost-click mechanism ("the control EXISTS in the server-rendered document and is then replaced
 * while React finishes with it, so under load the click lands on a node on its way out"). A control
 * that is absent and then appears is one Playwright's own auto-waiting handles; a control that is
 * present and then swapped is not.
 */
export function NavSlotSkeleton({ links }: { links: readonly NavLink[] }) {
  return (
    <>
      <div className="hidden md:flex">
        <NavLinks links={links} />
      </div>
      <div className="md:hidden">
        <Skeleton aria-hidden="true" className={cn(AUTH_SLOT_ICON, "rounded-lg")} />
      </div>
    </>
  );
}
