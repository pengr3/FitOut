// Host dashboard landing (D-04) — a DISTINCT host surface, not blended into the booker pages.
//
// Reaching this page already means canHost is true (the (host) layout gated it); we re-read the
// session (defense in depth) so the greeting can use the first name and this page fails closed if
// reached directly. Phase-2 (Plan 03): the Phase-1 placeholder CTA is now wired to the real listing
// wizard — "Create your first listing" when the host has none, "Create listing" + "Your listings"
// once they do. Payout onboarding is still Plan 06 (not surfaced here).
//
// v1.0 audit finding #4: the dashboard also reports PUBLISHED listings with no weekly hours, from the
// same shared helper the listings grid uses, so a host learns here that a live listing shows every date
// as closed. It is a SIGNAL — bookability, publishing and search are untouched by it.

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
import {
  loadPublishedListingsMissingHours,
  HOURS_MISSING_STATE,
  HOURS_MISSING_REASON,
  HOURS_MISSING_CTA,
} from "@/lib/listing/hours-signal";

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

  // v1.0 audit finding #4 — the host's published listings with no weekly hours, owner-scoped by
  // session.user.id (never by anything a client sends) in ONE query, from the same authority the
  // listings grid reads.
  const missingHours = await loadPublishedListingsMissingHours(db, session.user.id);

  // The nudge's sentence, assembled as ONE string (SWC's JSX whitespace transform strips the leading
  // space of text following an expression container — the "₱300.00in cancellation fees" lesson). It
  // pluralises honestly: one listing is NAMED, because "1 listing" makes a host go looking for which;
  // several are COUNTED, because naming them all here would be a second listings page.
  const hoursNudge =
    missingHours.length === 1
      ? `${HOURS_MISSING_STATE} on “${missingHours[0].title || "your listing"}”. ${HOURS_MISSING_REASON}`
      : `${HOURS_MISSING_STATE} on ${missingHours.length} of your live listings. ${HOURS_MISSING_REASON}`;

  // One listing → straight into its own availability editor (the route its card already links to);
  // several → the grid, where each affected card now carries its own editor link. Both are existing
  // routes; there is deliberately no third one.
  const hoursNudgeHref =
    missingHours.length === 1 ? `/host/listings/${missingHours[0].id}/availability` : "/host/listings";

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

      {/*
        v1.0 audit finding #4 / rule O7 — the state, the reason, and the way out, on the surface a host
        lands on. Calm muted information, NOT an Alert and never a destructive/red variant (09-UI-SPEC
        § Error/edge states: this phase's host surfaces carry no alert variant): nothing has gone wrong,
        the host simply has not finished setting up. Hidden entirely at zero, like the requests badge.
      */}
      {missingHours.length > 0 && (
        <p
          className="mt-4 text-sm text-muted-foreground"
          data-hours-missing={missingHours.length}
        >
          {hoursNudge}{" "}
          <Link href={hoursNudgeHref} className="underline underline-offset-4">
            {HOURS_MISSING_CTA}
          </Link>
        </p>
      )}

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
