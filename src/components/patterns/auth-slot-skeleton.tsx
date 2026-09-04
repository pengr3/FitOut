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

import { Skeleton } from "@/components/ui/skeleton";
import {
  AUTH_SLOT_BOX,
  AUTH_SLOT_CONTROL,
  AUTH_SLOT_ICON,
  NOTIFICATION_BELL_BOX,
} from "@/lib/design/measurements";
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
