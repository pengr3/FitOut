// Logged-in booker shell (the (app) route group).
//
// This is the REAL per-page session gate (the optimistic middleware only hints): every page under
// (app) requires a session; if there is none we redirect to /login (threat T-04-06). The header
// hosts the Airbnb-style mode switch (wired in Task 2) so a user can flip between booking and
// hosting context, plus a link to their profile.

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readDbNow } from "@/lib/booking/bookings-query";
import { countUnread, listRecent, NOTIFICATIONS_MAX_LIMIT } from "@/lib/notifications";
import { ModeSwitch } from "@/components/mode-switch";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  toNotificationItems,
  type NotificationItemData,
} from "@/components/notifications/notification-item";

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

  // D-92 wants "a bell in the shared header". There IS no shared header component: the booker header
  // ((app)/layout.tsx) and the host header ((host)/host/layout.tsx) are duplicated inline, and D-04
  // deliberately made the host shell distinct (different wordmark, bg-zinc-50). Merging them is out of
  // scope and contradicts D-04. The BELL is the shared thing D-92 requires, not the header — so one
  // component is mounted in both. Do NOT refactor the two headers into one here.
  //
  // Both reads are OWNER-SCOPED IN THE QUERY on session.user.id (T-07-82) — never post-filtered, and
  // never from anything the request supplied. The relative "2h ago" labels are composed here against the
  // DATABASE clock (readDbNow), not the viewer's, because a skewed client clock would otherwise render
  // "in 3 hours" on a notification that just arrived.
  //
  // Wrapped: a notification read is an AMBIENT convenience, and it must never take down the shell that
  // carries the session gate and every page under (app). A failure degrades to a calm in-panel message.
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
    console.error("[notifications] bell_read_failed", { surface: "app", err });
    notificationsFailed = true;
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          FitOut
        </Link>
        <div className="flex items-center gap-3">
          {/* Airbnb-style booker/host context switch (D-04) — currently in the booking context. */}
          <ModeSwitch
            current="book"
            canBook={u.canBook ?? false}
            canHost={u.canHost ?? false}
          />
          {/* D-92 in-app notification centre — the same component the host header mounts. */}
          <NotificationBell
            unreadCount={unreadCount}
            items={notificationItems}
            error={notificationsFailed}
          />
          <Link
            href="/profile"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Profile
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
