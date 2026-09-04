"use client";

// NotificationBell (D-84 / D-86 / D-92) — the in-app notification centre.
//
// WHY THIS COMPONENT IS THE SHARED THING. D-92 asks for "a bell in the shared header". There is no shared
// header component: the booker header ((app)/layout.tsx) and the host header ((host)/host/layout.tsx) are
// duplicated inline, and D-04 deliberately made the host shell distinct. So the BELL is what is shared —
// one component, mounted in both headers, fed server-computed props. See the note in either layout.
//
// IT FETCHES NOTHING. `unreadCount` and `items` are computed on the SERVER in each layout (owner-scoped in
// the query — src/lib/notifications.ts) and passed down. The app stays server-authoritative: there is no
// client-side notification endpoint to authorise, to rate-limit, or to accidentally leave unscoped.
//
// FRESHNESS (D-84): a bounded `router.refresh()` poller cloned from pending-payment-state.tsx:35-49 — the
// interval callback is the ONLY state-mutation site (never a synchronous setState in the effect body,
// react-hooks/set-state-in-effect), the interval is cleared on unmount, and the router is read through a
// ref so a new router identity never restarts it. TanStack Query is NOT installed and is NOT being added.
//
// Two deliberate adaptations from the payment poller, both in the comment on the effect below.

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { NotificationItem, type NotificationItemData } from "./notification-item";

// ~30s, not the payment poller's 2.5s. This is AMBIENT freshness, not someone staring at a screen waiting
// for money to settle, and the cost is paid by every open tab of every signed-in user simultaneously.
const POLL_INTERVAL_MS = 30_000;
// Bounded (T-07-85): ~20 minutes of ambient refresh, then it stops. An abandoned tab left open overnight
// must not refresh the RSC ~2,900 times. Any real interaction re-mounts the tree and starts a fresh budget.
const MAX_ATTEMPTS = 40;

/** Matches the server cap in `listRecent` (NOTIFICATIONS_MAX_LIMIT); drives the overflow footer only. */
const PANEL_LIMIT = 20;

export function NotificationBell({
  unreadCount,
  items,
  error = false,
}: {
  unreadCount: number;
  items: NotificationItemData[];
  /** The layout's notification read failed. The shell still renders; the panel says so calmly. */
  error?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  // router is read through a ref so a new router identity each render never re-subscribes the interval.
  const routerRef = React.useRef(router);
  React.useEffect(() => {
    routerRef.current = router;
  }, [router]);

  React.useEffect(() => {
    // The interval callback is the ONLY place anything is mutated (never synchronously in the effect
    // body). `count` is a local closure mutable, exactly as in pending-payment-state.tsx.
    //
    // THE ONE GENUINELY NEW GUARD: a hidden tab neither refreshes NOR burns an attempt. Refreshing a tab
    // nobody is looking at is pure server load for zero benefit, and — the subtler half — spending the
    // bounded budget while hidden would mean a tab backgrounded for 20 minutes comes back permanently
    // stale. Pausing, rather than merely skipping, is what makes the bound behave.
    let count = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      count += 1;
      routerRef.current.refresh();
      if (count >= MAX_ATTEMPTS) window.clearInterval(id);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const hasUnread = unreadCount > 0;
  // Cap the DISPLAY only — the aria-label below still carries the true number.
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  function handleSelect(notificationId: string) {
    setOpen(false);
    // The Link navigates on its own; the mark-read is a parallel, non-blocking write. If it fails the
    // user still lands on their booking — a stuck-unread row is a far smaller harm than a swallowed click.
    startTransition(async () => {
      await markNotificationRead(notificationId);
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      routerRef.current.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-11"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <BellIcon className="size-5" aria-hidden="true" />
          {/* Neutral `secondary` pill, HIDDEN at 0. Never coral, never destructive-red: a notification
              badge is information, not an alarm — coral is reserved for the one primary action per
              surface, and red for genuine failure. */}
          {hasUnread && (
            <Badge
              variant="secondary"
              aria-hidden="true"
              className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-5 justify-center px-1 py-0 text-xs tabular-nums"
            >
              {badgeLabel}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      {/* `popover`, NOT `dropdown-menu`. Both are installed, but dropdown-menu carries `menuitem`
          semantics; this panel is a list of navigable LINKS plus a button, and announcing them as menu
          items misreports the content to assistive technology (a menu implies a command surface with
          roving-tabindex arrow navigation, which is not what this is). Cosmetically identical either way;
          the difference is entirely in what AT is told. */}
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
          <h2 className="text-xl leading-tight font-semibold tracking-tight">Notifications</h2>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-sm font-medium"
              onClick={handleMarkAll}
              disabled={pending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* A panel is not a page: fixed height cap + internal scroll, so it can never grow unbounded
            (T-07-86). Deliberately NO live-region attribute anywhere in this panel — the poller refreshes
            on a timer, and re-announcing the list every 30 seconds would make the page unusable with a
            screen reader. Freshness is worth nothing if it shouts. */}
        <ScrollArea className="max-h-96">
          {error ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              We couldn&apos;t load your notifications. Try again.
            </p>
          ) : items.length === 0 ? (
            // ─────────────────────────────────────────────────────────────────────────────────────
            // STATE-04 (plan 11-16) — the panel's zero, through the one shared shell.
            // ─────────────────────────────────────────────────────────────────────────────────────
            //
            // The plan recorded this surface as having NO empty state. It has had one since D-92 —
            // an undesigned one: no icon, and a title that was a `<p className="text-sm
            // font-semibold">`, which is shell A's `<p>`-that-looks-like-a-heading defect in a third
            // place the UI-SPEC's two-shell table never counted. Both strings below are byte-
            // identical to the shipped ones; what changed is the shell, the glyph and the ELEMENT.
            //
            // `titleAs="h3"` — the panel's own header is `<h2>Notifications</h2>`, eleven lines up.
            //
            // THE CLIENT BOUNDARY, MEASURED RATHER THAN ASSUMED. This module is `"use client"`, so
            // importing `EmptyState` here compiles the pattern into the client bundle. That is legal
            // and it does NOT touch the pattern's own status: `empty-state.tsx` still has no
            // directive prologue, and its whole transitive import graph is isomorphic — `react`
            // (type-only), `lucide-react`, `lib/design/status-tones.ts` (zero imports) and
            // `lib/utils.ts` (clsx + tailwind-merge). Nothing under it imports `server-only`, the
            // database, or the request headers, so there is nothing here that a client bundle must
            // not have. `search/search-results.tsx` is a `"use client"` module doing the same thing
            // in the same commit.
            //
            // THE ALTERNATIVE WAS REJECTED ON A MEASUREMENT, not on convenience. Passing the shell
            // down as a `ReactNode` from the server parent is a real option — this component has
            // exactly ONE call site, `patterns/ambient-notifications.tsx:137` — but that file's
            // header states as a property that it "renders no wordmark, no destinations and no
            // product copy", and these two sentences are product copy. Buying a server render for
            // the pattern by moving copy into the one module that promises not to hold any is a bad
            // trade. The copy stays on the surface that owns it, which is also `empty-state.tsx`'s
            // own sharpest rule.
            //
            // `tone="neutral"` DESPITE THE COPY MATCHING `/host/requests`' new positive title, and
            // that is a scope decision rather than an oversight: AC#24 pins exactly one positive
            // empty state this phase, an emptied WORK QUEUE the host cleared themselves. A bell at
            // zero is ambient — nobody achieved it — and a green check in a 320px popover is a
            // second accent decision that belongs to whoever redesigns this panel.
            //
            // `actions={null}`: there is deliberately no `/notifications` page (deferred at D-92,
            // see the overflow note below), so every candidate action here is a dead link.
            <EmptyState
              icon={BellIcon}
              titleAs="h3"
              title="You're all caught up"
              body="Booking updates, approvals, and reminders will show up here."
              actions={null}
            />
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id}>
                  <NotificationItem item={item} onSelect={handleSelect} />
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {/* Overflow is stated, not linked. There is no /notifications page in v1 (deferred at D-92), and a
            dead link is worse than none — it promises history the product does not have. */}
        {!error && items.length >= PANEL_LIMIT && (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Showing your 20 most recent.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
