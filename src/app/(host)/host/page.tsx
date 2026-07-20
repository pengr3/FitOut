// Host dashboard landing (D-04) — a DISTINCT host surface, not blended into the booker pages.
//
// Reaching this page already means canHost is true (the (host) layout gated it); we re-read the
// session (defense in depth) so the greeting can use the first name and this page fails closed if
// reached directly. Phase-2 (Plan 03): the Phase-1 placeholder CTA is now wired to the real listing
// wizard — "Create your first listing" when the host has none, "Create listing" + "Your listings"
// once they do. Payout onboarding is still Plan 06 (not surfaced here).

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, count, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, hostPayout, listing } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayoutBanner } from "@/components/host/payout-banner";
import { derivePayoutStatus } from "@/components/host/payout-status";

export default async function HostDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & {
    firstName?: string | null;
    canHost?: boolean;
  };
  // Defense in depth: the layout already gates, but never render hosting content without canHost.
  if (!u.canHost) {
    redirect("/");
  }

  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(listing)
    .where(and(eq(listing.hostId, session.user.id), isNull(listing.deletedAt)));
  const hasListings = (n ?? 0) > 0;

  // Pending-request count (D-65) — booking JOIN listing owner-scoped to this host, status='requested'. Drives
  // the neutral "Requests" nudge below (hidden at 0). Same owner-scope predicate as the /host/requests inbox.
  const [{ p } = { p: 0 }] = await db
    .select({ p: count() })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")));
  const pendingRequests = p ?? 0;

  // Live payout state (D-12) — drives the persistent nudge below. payoutsEnabled is webhook-set only.
  const [payoutRow] = await db
    .select()
    .from(hostPayout)
    .where(eq(hostPayout.userId, session.user.id));
  const payoutStatus = derivePayoutStatus(payoutRow);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12" data-host-dashboard>
      <h1 className="text-2xl font-semibold tracking-tight">
        Your hosting{u.firstName ? `, ${u.firstName}` : ""}
      </h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        This is your hosting space, separate from booking. List a fitness or
        recreational space and set its availability so people can find and book
        it.
      </p>

      {/* Persistent payout-setup nudge (D-12) — never blocks publishing; gates bookability. */}
      <div className="mt-8">
        <PayoutBanner status={payoutStatus} />
      </div>

      {hasListings ? (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/host/listings/new">Create listing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/host/listings">Your listings</Link>
          </Button>
          {/* Neutral status view (HOST-03) — not coral (05-UI-SPEC: the earnings page is not an action surface). */}
          <Button asChild variant="outline">
            <Link href="/host/earnings">Earnings</Link>
          </Button>
          {/* Neutral request-inbox nudge (D-65) — a secondary count badge, hidden at 0. Never coral. */}
          <Button asChild variant="outline">
            <Link href="/host/requests">
              Requests
              {pendingRequests > 0 && (
                <Badge
                  variant="secondary"
                  aria-label={`${pendingRequests} requests to review`}
                >
                  {pendingRequests}
                </Badge>
              )}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
          <h2 className="text-lg font-medium">No listings yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            List your space and start earning. We&apos;ll walk you through it
            step by step.
          </p>
          <Button asChild className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/host/listings/new">Create your first listing</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
