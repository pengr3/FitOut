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
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { Building2Icon } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing, listingPhoto, hostPayout, listingReview } from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
import { loadHostVerification } from "@/lib/host/verification-status";
import { loadPublishedListingsMissingHours } from "@/lib/listing/hours-signal";
import { HostingPausedNotice } from "@/components/host/hosting-paused-notice";
// D-130 / GATE-05: the tile's price line is composed HERE, in the RSC, and handed to the client card as
// finished strings. See src/lib/listing/card-price.ts for why, and src/lib/search/query.ts for the same
// seam on the search grid.
import { listingCardPriceParts } from "@/lib/listing/card-price";
import { RESULT_GRID_GAP } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";
import { unlistListing, softDeleteListing } from "@/app/actions/listing";
import {
  ListingCard,
  type ListingCardData,
} from "@/components/listing/listing-card";
import { EmptyState } from "@/components/patterns/empty-state";
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

  // One host_verification row per host (phase 18, D-224) — the SIXTH deriveBookable term, read ONCE for
  // the whole grid beside `payoutsEnabled` above and never per card. Every listing on this page belongs
  // to the same host, so a per-card read would be the same answer fetched N times (T-IU7-04).
  //
  // NO ROW ⇒ "unverified", never verified: the row is not created with the user, so absence is the
  // ordinary state of a host nobody has checked yet, and it must fail the gate rather than pass it.
  // That reasoning, and the row's `reason` column, now live in `loadHostVerification` — this page had
  // the only copy of the read, and D-243/D-252 gave it two more consumers (`/host` and
  // `/host/earnings`). The statement is the same statement; it moved so that three surfaces cannot
  // disagree about whether a host is suspended.
  const verification = await loadHostVerification(db, session.user.id);
  const verificationStatus = verification.status;

  // OPS-05 / D-230 — THE OPERATOR'S REJECTION SENTENCES, ONE QUERY FOR THE WHOLE GRID.
  //
  // The pre-collapsed `Map` idiom `coverByListing` above already uses, and deliberately NOT a query
  // inside `rows.map` — that would put a round trip in a render loop, once per rejected card
  // (T-IU7-04). Restricted to the ids that are actually rejected, so a host with no rejections runs no
  // query at all.
  //
  // ORDERED ASCENDING SO THE LATEST DECISION WINS THE `Map` KEY. `listing_review` is a HISTORY table
  // (D-221): a listing that was rejected, materially edited back into review (D-249) and rejected again
  // holds two rows, and the host must read the sentence about the listing as it stands now. Keyed on
  // `submitted_at`, which is NOT NULL on every row, rather than on `decided_at`, which is null while a
  // cycle is open — and a null sorts LAST in Postgres ascending, so an open cycle would otherwise win
  // the key and blank the sentence the host is meant to be reading.
  //
  // ⚠ THE REASON STAYS READABLE UNTIL THE HOST RESUBMITS (D-249). Nothing here clears it, and nothing
  // should: clearing it on the re-review flip would delete the only thing that makes editing purposeful.
  const rejectedIds = rows.filter((r) => r.reviewState === "rejected").map((r) => r.id);
  const rejectionRows = rejectedIds.length
    ? await db
        .select({ listingId: listingReview.listingId, reason: listingReview.reason })
        .from(listingReview)
        .where(
          and(inArray(listingReview.listingId, rejectedIds), eq(listingReview.state, "rejected")),
        )
        .orderBy(asc(listingReview.submittedAt))
    : [];
  const rejectionReasonByListing = new Map(rejectionRows.map((r) => [r.listingId, r.reason]));

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

      {/* D-243 / D-252 — a suspended host is TOLD, at the top of every surface they own, before they
          start wondering why nothing is selling. Above the grid rather than inside it: the suspension
          is about the HOST, and a per-card sentence would repeat one fact N times while implying it is
          a property of each listing. Rendered in the zero-listings state too — a host suspended before
          they ever published still needs the sentence. */}
      {verification.suspended && (
        <div className="mb-8">
          <HostingPausedNotice reason={verification.reason} />
        </div>
      )}

      {rows.length === 0 ? (
        // STATE-04 (plan 11-16) — shell B through the one shared shell: the small radius at 40px
        // becomes the card radius at 32px (the padding class is named by value rather than quoted —
        // see the note in `(app)/bookings/page.tsx`), the `<h2>` survives via `titleAs`, and both
        // strings are byte-
        // identical to the shipped ones. `variant="brand"` on "Create your first listing" is preserved
        // exactly — Phase 10's accent list is closed, and this is on it. Its `mt-4` is dropped because
        // the pattern's actions row owns the offset (`mt-5`); the button itself is unchanged.
        //
        // THE SAME COPY SHIPS ON `(host)/host/page.tsx`, deliberately: the dashboard's zero state and
        // this grid's zero state are one product decision rendered twice, and both now render the same
        // shell. Change them together or not at all.
        <EmptyState
          icon={Building2Icon}
          titleAs="h2"
          title="No listings yet"
          body="List your space and start earning. We'll walk you through it step by step."
          actions={
            <Button asChild variant="brand">
              <Link href="/host/listings/new">Create your first listing</Link>
            </Button>
          }
        />
      ) : (
        // THE GUTTER IS `RESULT_GRID_GAP` (D-57, plan 12-01), not a literal. This route's
        // `loading.tsx` composes `CardGridSkeleton`, which moved onto the constant — so leaving the
        // 20px literal here would have opened a FRESH ±4px shift on a shipped host surface, between
        // this grid and the placeholder that stands in front of it, which is the exact defect the
        // constant exists to close. `/host/listings` adopts the constant rather than getting a
        // second one; the column count stays literal because how many columns fit is a window
        // question, not a measurement.
        <div className={cn(RESULT_GRID_GAP, "grid sm:grid-cols-2 lg:grid-cols-3")}>
          {rows.map((r) => {
            const data: ListingCardData = {
              id: r.id,
              title: r.title,
              primarySpaceType: r.primarySpaceType,
              status: r.status,
              coverUrl: coverByListing.get(r.id) ?? null,
              // Free from the `select()` above (`r` is a full listing row), and REQUIRED on the card's
              // data shape so this projection cannot forget it — the tile's chip is the host's only
              // on-surface answer to "why has this stopped selling" (D-230).
              reviewState: r.reviewState,
            };
            // D-130 / GATE-05 — the rate columns stop HERE. Phase 9 (OC-01/D-125): the persisted mode and
            // the per-head price are read straight off the row, never inferred from which rate is null, and
            // the fork lives in the shared helper so this grid and the search grid cannot drift.
            const priceParts = listingCardPriceParts({
              hourlyRateCents: r.hourlyRateCents,
              dayRateCents: r.dayRateCents,
              perHeadPriceCents: r.perHeadPriceCents,
              occupancyMode: r.occupancyMode,
              currency: r.currency,
            });
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
            // The FIFTH and SIXTH terms (phase 18, D-224): `r.reviewState` comes free from the `select()`
            // above (r is a full listing row), and `verificationStatus` was read ONCE for the whole grid.
            const bookable = deriveBookable(
              { status: r.status, hasOperatingHours: !missingHours.has(r.id), reviewState: r.reviewState },
              { emailVerified, payoutsEnabled, verificationStatus },
            );
            return (
              <ListingCard
                key={r.id}
                listing={data}
                priceParts={priceParts}
                // ⚠ `h2`, NOT THE CARD'S DEFAULT `h3` — MEASURED (plan 17-07). This page's outline is
                // the `<h1>` above and then this grid, with nothing between them, so the card's
                // default skipped a rung: the first GATE-02 axe sweep reported `heading-order
                // (moderate) x1: h3` here at both 320 and 1280.
                //
                // ⚠ THE SENTENCE THAT USED TO FOLLOW WAS FALSE, and is corrected here rather than
                // deleted (phase-17 code review, WR-05). It read: *"`/` keeps the default because it
                // HAS the intermediate heading (`search-results.tsx:187`'s results `h2`), which is
                // why the level is a prop rather than a change inside the card."* `/` does not render
                // `ListingCard` at all — it renders `SearchResultCard` → `ResultCard`, whose title is
                // hard-coded at `patterns/result-card.tsx:153`. THIS IS THE COMPONENT'S ONLY CALL
                // SITE. The prop still earns its place: it is what lets the page own its rung instead
                // of the card guessing, and `listing-card.tsx`'s docblock carries the full argument
                // for why the default stays `h3` anyway.
                titleAs="h2"
                bookable={bookable}
                hoursMissing={missingHours.has(r.id)}
                // D-230 — the operator's own sentence for THIS listing, from the one grouped read
                // above. Undefined for every non-rejected card, which is what the map returning
                // nothing already means; the card falls back to the product's sentence alone.
                rejectionReason={rejectionReasonByListing.get(r.id) ?? null}
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
