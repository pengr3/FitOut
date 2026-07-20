// Host route group layout — the DISTINCT host surface (D-04) and the REAL capability gate.
//
// This is the security boundary for hosting (threat T-04-02): the optimistic middleware and the
// UI mode switch can be bypassed via a direct URL, so EVERY page under (host) is gated HERE by a
// real server-side session check. A signed-out user is sent to /login; a signed-in user WITHOUT
// canHost is sent to / (the booking surface) — they must explicitly "Start hosting" (which flips
// canHost server-side) before this surface unlocks. The host UI is its own shell, not blended into
// the booker (app) pages (D-04).

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { ModeSwitch } from "@/components/mode-switch";

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

  // Pending-request count (D-65) for the header nudge — owner-scoped booking JOIN listing, status='requested'
  // (the same owner-scope predicate as the /host/requests inbox). Drives the count badge, hidden at 0.
  const [{ p } = { p: 0 }] = await db
    .select({ p: count() })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")));
  const pendingRequests = p ?? 0;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
        <Link href="/host" className="text-lg font-semibold tracking-tight">
          FitOut <span className="text-muted-foreground">· Hosting</span>
        </Link>
        <div className="flex items-center gap-3">
          {/* Airbnb-style context switch — currently in the hosting context (D-04). */}
          <ModeSwitch
            current="host"
            canBook={u.canBook ?? false}
            canHost={u.canHost ?? false}
          />
          {/* Neutral earnings/payouts nav (HOST-03) — status view, not coral. */}
          <Link
            href="/host/earnings"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Earnings
          </Link>
          {/* Neutral request-inbox nav (D-65) — a secondary count badge, hidden at 0. Never coral. */}
          <Link
            href="/host/requests"
            className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
          >
            Requests
            {pendingRequests > 0 && (
              <Badge variant="secondary" aria-label={`${pendingRequests} requests to review`}>
                {pendingRequests}
              </Badge>
            )}
          </Link>
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
