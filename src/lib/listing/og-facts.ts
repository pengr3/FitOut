import "server-only";

// SHELL-04 — the four public facts a shared listing link is allowed to state, and the ONE read that
// fetches them.
//
// WHY THIS MODULE EXISTS RATHER THAN A QUERY IN EACH CONSUMER. A pasted `/listings/<id>` link is
// rendered twice, by two SEPARATE HTTP requests: the page's `generateMetadata` writes the `og:title`
// and `og:description` into the HTML head, and the scraper then fetches
// `/listings/<id>/opengraph-image` to draw the card. Those two must agree — a card naming one space
// under a description naming another is the kind of defect nobody sees until it is embarrassing —
// and the only way to guarantee it is for both to read one projection and one composer.
//
// ⚠ THE PLAN ASKED FOR THE PAGE'S EXISTING LOADER TO BE REUSED. There is none. Measured:
// `src/app/listings/[id]/(detail)/page.tsx` inlines a three-table join (listing ⋈ user ⋈ host_payout)
// plus a `Promise.all` of four more reads, all as statements inside the component, and it selects the
// FULL listing row. Reusing it would mean either exporting a loader from a route module (which Next's
// segment-export validation has opinions about) or hauling the host, the payout flag, the photos, the
// amenities and the activity tags into an image that shows four strings. So this is a NEW, deliberately
// narrow projection, and the page's own query is untouched.
//
// ── WHAT IS DELIBERATELY NOT SELECTED (T-05-PII / D-09) ───────────────────────────────────────────
// No `addressLine1`, no `addressLine2`, no `lat`/`lng`, no host identity. A share card is fetched by
// every intermediary that sees the link — chat services, link scanners, corporate preview proxies —
// and the withheld-exact-address rule that governs the page must govern anything the page's link
// causes to be fetched. `city` is the coarse field the listing page already renders publicly to
// anonymous visitors (`coarseLocation`), so it is in scope; the street never is.
//
// ── THE VIEWABILITY PREDICATE IS THE PAGE'S OWN, CALLED — NOT RESTATED (T-05-NONPUB / D-247) ──────
// A draft or unlisted listing 404s on the page (D-13), and since phase 18 so does an unreviewed one
// (D-208). If this read were looser, a card would unfurl the title of a listing whose page refuses to
// render — an unauthenticated read-around, and one nobody would think to look for. Returning `null`
// here is what makes the OG route serve its generic fallback card, which is the same answer a missing
// listing gets.
//
// ⚠ THIS FUNCTION USED TO SPELL THAT RULE OUT BY HAND, AND THAT IS THE DEFECT PHASE 18 CLOSED. The
// hand-written copy said only "the status is published". When the review gate was added to the page
// and the layout, the two of them started 404ing a pending listing while THIS read kept returning its
// title, space type, city and rate — so `/listings/<id>/opengraph-image` went on painting a real card
// for an unreviewed space, to every scraper, link scanner and chat-preview proxy that fetched it. The
// page and the card disagreed, and nobody could see it: an OG route is never rendered in a browser.
//
// The copy is gone. This is now the THIRD CALL SITE of `isPubliclyViewable` (`@/lib/listing/
// public-listing` — read its header for the other two and for why its third parameter is required and
// positional). The card and the page agree BY CONSTRUCTION rather than by two people independently
// writing the same condition and one of them later being updated.

import { and, eq, isNull } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";
import { listing } from "@/lib/db/schema";
import { isPubliclyViewable } from "@/lib/listing/public-listing";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import { SPACE_TYPE_LABELS } from "@/lib/listing-vocab";

/** Exactly what a share card and a share description may say about a space, and nothing else. */
export type ListingCardFacts = {
  /** The listing's own title. Never empty — a titleless row falls back before it reaches here. */
  readonly title: string;
  /** "Pickleball court", "Yoga studio" — the vocabulary label, or null when the host set no type. */
  readonly spaceTypeLabel: string | null;
  /** The coarse city line the public page already shows, or null. */
  readonly city: string | null;
  /**
   * The FIRST all-in rate part — `₱472.50/hr`, `₱2,940/day` or `₱367/person`.
   *
   * A RATE, NEVER A COMPUTED TOTAL (D-75). "from ₱472.50/hr" is a promise checkout keeps; "from
   * ₱1,417" is a promise checkout can break by a centavo, because the service fee is rounded once
   * over the whole space price rather than per hour. The card and the description therefore quote
   * the same fee-inclusive rate the listing page and the search grid quote, from the same helper.
   */
  readonly rate: string | null;
  /** Drives the one mode-dependent sentence in the description. */
  readonly openCapacity: boolean;
};

/**
 * The public facts for one listing, or `null` when the public may not read that listing at all.
 *
 * `cache()`d so that a request which asks twice pays once. Note what that does and does not buy: the
 * page render and its `generateMetadata` share a request and therefore share this read, while the
 * scraper's separate fetch of the image route is a different request and necessarily reads again.
 */
export const listingCardFacts = cache(async (id: string): Promise<ListingCardFacts | null> => {
  const rows = await db
    .select({
      title: listing.title,
      primarySpaceType: listing.primarySpaceType,
      city: listing.city,
      hourlyRateCents: listing.hourlyRateCents,
      dayRateCents: listing.dayRateCents,
      perHeadPriceCents: listing.perHeadPriceCents,
      occupancyMode: listing.occupancyMode,
      status: listing.status,
      deletedAt: listing.deletedAt,
      // The two columns the shared predicate needs beyond `status`. `deletedAt` is redundant with the
      // WHERE below and is selected anyway, so this call site hands the expression the real row rather
      // than a hardcoded `null` that would quietly stop tracking the rule.
      reviewState: listing.reviewState,
    })
    .from(listing)
    .where(and(eq(listing.id, id), isNull(listing.deletedAt)));

  const row = rows[0];
  // THE THIRD CALL SITE OF THE ONE EXPRESSION — see this module's header for what the hand-written
  // copy that used to live on this line cost. A listing awaiting ops review must render NO Open Graph
  // card: not a redacted one, not a partial one. `null` here routes the OG route to the generic
  // FitOut card, which is the identical answer a nonexistent id gets, so the card leaks no
  // route-existence signal either.
  if (!row || !isPubliclyViewable(row.status, row.deletedAt, row.reviewState)) return null;

  const title = row.title?.trim();
  if (!title) return null;

  const parts = allInRateParts({
    hourlyRateCents: row.hourlyRateCents,
    dayRateCents: row.dayRateCents,
    perHeadPriceCents: row.perHeadPriceCents,
    occupancyMode: row.occupancyMode,
  });

  return {
    title,
    spaceTypeLabel: row.primarySpaceType ? SPACE_TYPE_LABELS[row.primarySpaceType] : null,
    city: row.city?.trim() || null,
    rate: parts[0] ?? null,
    openCapacity: row.occupancyMode === "open_capacity",
  };
});

/**
 * The `og:description` for a listing — one sentence about what the space is, where it is and what it
 * costs, then what to do about it.
 *
 * ASSEMBLED FROM PARTS THAT MAY BE ABSENT, because every input above is nullable in the schema. The
 * shape the plan specified — `"{Space type} in {city} · from {rate}. Book by the hour on FitOut."` —
 * degrades rather than emitting `"in  · from ."` for a listing whose host skipped a field.
 *
 * THE CLOSING SENTENCE IS MODE-AWARE, and that is a correctness fix rather than a flourish: a
 * drop-in listing is sold as day passes, its price is per person, and duration never scales it
 * (OC-02). Telling a scraper it can be booked "by the hour" would be a false claim about the product
 * on the one surface a person reads before they ever reach the app.
 */
export function listingShareDescription(facts: ListingCardFacts): string {
  const place = [facts.spaceTypeLabel ?? "Fitness space", facts.city ? `in ${facts.city}` : null]
    .filter(Boolean)
    .join(" ");
  const lead = facts.rate ? `${place} · from ${facts.rate}` : place;
  const call = facts.openCapacity ? "Book a day pass on FitOut." : "Book by the hour on FitOut.";
  return `${lead}. ${call}`;
}
