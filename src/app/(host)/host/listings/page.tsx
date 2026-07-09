// Host "Your listings" grid (LIST-05). RSC: canHost re-check (defense in depth), fetch the caller's
// OWN non-deleted listings (deletedAt IS NULL) newest-first, plus their cover photos and the cached
// payout flag, then render the card grid with per-card actions. deriveBookable (D-15) decides the
// "Live" vs "Published · not bookable" badge — payoutsEnabled defaults false until Plan 06 wires
// PayMongo onboarding, so this plan stays payment-agnostic (it only READS the cached gate flag).

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing, listingPhoto, hostPayout } from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Toaster />
      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Your listings</h1>
        {rows.length > 0 && (
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
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
          <Button asChild className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90">
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
            };
            const bookable = deriveBookable(
              { status: r.status },
              { emailVerified, payoutsEnabled },
            );
            return (
              <ListingCard
                key={r.id}
                listing={data}
                bookable={bookable}
                editHref={`/host/listings/${r.id}/edit`}
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
