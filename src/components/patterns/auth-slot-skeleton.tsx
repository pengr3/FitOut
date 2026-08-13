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

import { Skeleton } from "@/components/ui/skeleton";
import {
  AUTH_SLOT_BOX,
  AUTH_SLOT_CONTROL,
  AUTH_SLOT_ICON,
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
