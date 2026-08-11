// Host "Your listings" grid (LIST-05). RSC: canHost re-check (defense in depth), fetch the caller's
// OWN non-deleted listings (deletedAt IS NULL) newest-first, plus their cover photos and the cached
// payout flag, then render the card grid with per-card actions. deriveBookable (D-15) decides the
// "Live" vs "Published · not bookable" badge — payoutsEnabled defaults false until Plan 06 wires
// PayMongo onboarding, so this plan stays payment-agnostic (it only READS the cached gate flag).
//
// v1.0 audit finding #4: the page also reports which of the host's PUBLISHED listings have no weekly
// hours — read ONCE for the whole grid (never per card) and passed down as a boolean — so a host can
// learn that their live listing shows every date as closed. It is a signal only: no listing's
// bookability, badge, or search eligibility changes because of it.

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing, listingPhoto, hostPayout } from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
import { loadPublishedListingsMissingHours } from "@/lib/listing/hours-signal";
import { unlistListing, softDeleteListing } from "@/app/actions/listing";
import {
  ListingCard,
  type ListingCardData,
} from "@/components/listing/listing-card";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export default async function HostListingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & {
    canHost?: boolean;
    emailVerified?: boolean;
  };
  if (!u.canHost) {
    redirect("/");
  }

  const rows = await db
    .select()
    .from(listing)
    .where(and(eq(listing.hostId, session.user.id), isNull(listing.deletedAt)))
    .orderBy(desc(listing.updatedAt));

  // Cover photos (position 0) for the fetched listings, in one query.
  const ids = rows.map((r) => r.id);
  const covers = ids.length
    ? await db
        .select()
        .from(listingPhoto)
        .where(and(inArray(listingPhoto.listingId, ids), eq(listingPhoto.position, 0)))
    : [];
  const coverByListing = new Map(covers.map((c) => [c.listingId, c.url]));

  // One PayMongo Linked Account per host (D-14) — read the cached gate flag once. Plan 06 sets it.
  const payoutRows = await db
    .select({ payoutsEnabled: hostPayout.payoutsEnabled })
    .from(hostPayout)
    .where(eq(hostPayout.userId, session.user.id));
  const payoutsEnabled = payoutRows[0]?.payoutsEnabled ?? false;
  const emailVerified = Boolean(u.emailVerified ?? session.user.emailVerified);

  // v1.0 audit finding #4 — which published listings have no weekly hours, in ONE owner-scoped query,
  // collapsed to a Set the render reads from. Same idiom as coverByListing above; deliberately NOT
  // called inside rows.map, which would put a query in a render loop (T-IU7-04). The helper already
  // filters to published + non-deleted + this host, so `.has(id)` is false for a draft or an unlisted
  // listing by construction — no second status check belongs in the render or in the card.
  const missingHours = new Set(
    (await loadPublishedListingsMissingHours(db, session.user.id)).map((l) => l.id),
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Toaster />
      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Your listings</h1>
        {rows.length > 0 && (
          <Button asChild variant="brand">
            <Link href="/host/listings/new">Create listing</Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-lg font-medium">No listings yet</h2>
          <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
            List your space and start earning. We&apos;ll walk you through it step by step.
          </p>
          <Button asChild variant="brand" className="mt-4">
            <Link href="/host/listings/new">Create your first listing</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const data: ListingCardData = {
              id: r.id,
              title: r.title,
              primarySpaceType: r.primarySpaceType,
              hourlyRateCents: r.hourlyRateCents,
              dayRateCents: r.dayRateCents,
              currency: r.currency,
              status: r.status,
              coverUrl: coverByListing.get(r.id) ?? null,
              // Phase 9 (OC-01/D-125): the persisted mode + per-head price, so the card prices a drop-in
              // listing per person. Read straight off the row — never inferred from which rate is null.
              occupancyMode: r.occupancyMode,
              perHeadPriceCents: r.perHeadPriceCents,
            };
            // The FOURTH deriveBookable term (v1.0 audit finding #4), taken from the ONE grouped query
            // above rather than asked per card — free, and never an N+1 inside a render loop.
            //
            // ⚠️ SOUNDNESS, because the inversion is not obviously safe. `missingHours` contains PUBLISHED
            // listings only (that is iu7's predicate), so for a DRAFT or UNLISTED row `!has(id)` reports
            // the hours term as TRUE even when the calendar is genuinely empty. That is sound ONLY
            // because deriveBookable ANDs the status term, which is already false for those rows. The
            // truth table pins this: `draft × emailVerified × payoutsEnabled × hasOperatingHours=true`
            // must derive false (tests/listing/bookability.test.ts), so nobody can later "simplify" the
            // AND and silently make this grid claim a hours-less draft is sellable.
            const bookable = deriveBookable(
              { status: r.status, hasOperatingHours: !missingHours.has(r.id) },
              { emailVerified, payoutsEnabled },
            );
            return (
              <ListingCard
                key={r.id}
                listing={data}
                bookable={bookable}
                hoursMissing={missingHours.has(r.id)}
                editHref={`/host/listings/${r.id}/edit`}
                availabilityHref={`/host/listings/${r.id}/availability`}
                onUnlist={unlistListing}
                onDelete={softDeleteListing}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
