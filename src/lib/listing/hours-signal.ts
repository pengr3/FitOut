// v1.0 audit finding #4 — the host-side signal for a live listing with no weekly hours.
//
// THE FINDING. `publishListing` never required operating hours, so a host could go Live with an empty
// calendar and be told nothing about it. Every booker who opened that listing saw each date render
// Closed, with no route forward — and the host had no way to learn why nobody was booking. The missing
// thing was never a refusal; it was a SENTENCE.
//
// THE SIGNAL AND THE GATE ARE COMPLEMENTARY, and they shipped in that order:
//
//   - 260801-iu7 shipped THIS MODULE — the signal. It names the affected listings on the host's own
//     surfaces and links into the availability editor.
//   - 260810-sti shipped THE GATE. Hours became the FOURTH term of `deriveBookable`
//     (src/lib/bookability.ts), together with its inlined SQL twin in search Stage-1
//     (src/lib/search/query.ts) and both server-side re-derivations in booking.ts. A published listing
//     with no hours is no longer sellable: it drops out of search and both hold mutations refuse it.
//
//     ⚠️ THIS SUPERSEDES what this header used to say. It previously claimed the fix was "a SIGNAL,
//     DELIBERATELY NOT A GATE" and that `deriveBookable` would stay BYTE-UNCHANGED. Both statements are
//     now false and were corrected in the same change that made them false. The desync worry behind the
//     original wording was real but is addressed rather than avoided: the predicate and its SQL twin
//     moved together in one commit, and tests/search/bookable-gate.test.ts now asserts set-equality
//     between them (the Pitfall-5 drift guard that replaced the retired byte-unchanged gate).
//
//   The division of labour: THE GATE STOPS THE SALE, THE SIGNAL TELLS THE HOST WHY AND HOW TO FIX IT.
//   Neither is sufficient alone — a gate with no signal is a listing that mysteriously stops earning,
//   and a signal with no gate is the dead end this finding is about. The signal's own sentence ("every
//   date on this listing shows as closed and no one can book it") became literally true rather than
//   merely descriptive, which is why the copy constants below did not change.
//
//   - `publishListing` and `publishSchema` are STILL untouched. Publishing behaviour is exactly what it
//     was, and that remains deliberate: turning this into a publish-time refusal would block a host
//     mid-setup for something they can fix in thirty seconds afterwards, and would say nothing at all
//     to the hosts who are already live — who are precisely the hosts the finding is about. The gate is
//     a DERIVATION, so a host who sets hours becomes sellable again instantly, with no listing write.
//
// WHY `status = 'published'` IS PART OF THE PREDICATE. A draft with no hours is not a broken promise to
// anyone; nobody can see it, so nothing is wrong yet. An unlisted listing is off the market by the
// host's own choice. Only a PUBLISHED listing with no hours is actively costing the host bookings, and a
// signal that fires on the other two would be noise the host learns to scroll past.
//
// WHY THE COPY CONSTANTS LIVE HERE and not in `src/lib/validation/listing.ts`. Those modules hold REJECT
// copy — the sentence a zod schema returns when it refuses. This signal has no schema and no refusal, so
// filing its words under validation would advertise a gate that does not exist. One module owns the
// state and the words for it, which is why the two host surfaces and the tests cannot drift apart.
//
// NON-CLIENT MODULE — no "use client", no "use server", no client-only imports. The header on
// src/components/host/payout-status.ts records why: a "use client" module's exports become client
// references when a Server Component imports them and cannot be invoked server-side, which crashed /host
// in UAT. Both host surfaces here are Server Components, so the same rule holds.

import { and, desc, eq, isNull, notExists, sql } from "drizzle-orm";
import type { DbConn } from "@/lib/availability/read-model";
import { listing, operatingHours } from "@/lib/db/schema";

/**
 * The state, in the host's words. Sentence case, calm, never alarmed — nothing has gone wrong, the host
 * simply has not finished setting up. Rendered as muted information on both surfaces, never as an alert
 * variant and never red (09-UI-SPEC § Error/edge states).
 */
export const HOURS_MISSING_STATE = "No hours set";

/**
 * WHY it matters. Rule O7: a signal always names the reason, in host vocabulary — "hours", never
 * "operating_hours" or "rows". One sentence, no exclamation mark.
 */
export const HOURS_MISSING_REASON =
  "Until you set your weekly hours, every date on this listing shows as closed and no one can book it.";

/** The WAY OUT — the link label. Rule O7 again: a dead end with no route forward is what we do not ship. */
export const HOURS_MISSING_CTA = "Set your hours";

/** One row of the signal: enough to name a listing and to link into its own availability editor. */
export type ListingMissingHours = { id: string; title: string | null };

/**
 * The caller's OWN published, non-deleted listings that have zero weekly-hours rows — in ONE query.
 *
 * Three properties, each load-bearing:
 *
 *   - **Owner-scoped by argument, never by anything a client can send** (T-IU7-01). Both call sites pass
 *     `session.user.id`. There is no listing-id parameter to tamper with and no path where a search param
 *     reaches this function, so one host can never be shown another host's listing.
 *
 *   - **One round trip, never N+1** (T-IU7-04). A correlated `NOT EXISTS` on `operating_hours`, backed by
 *     `operating_hours_listing_idx` and short-circuiting on the first row, costs the same whether the host
 *     owns one listing or fifty. The alternative — asking per card — would put a query inside a render
 *     loop on the grid. Callers collapse the result into a `Set`/`Map` once, exactly as the cover-photo
 *     read on /host/listings already does.
 *
 *   - **`desc(updatedAt)` matches the grid.** /host/listings orders its own rows the same way, so the
 *     dashboard's "your one listing" link and the first affected card in the grid always mean the same
 *     listing.
 */
export async function loadPublishedListingsMissingHours(
  dbConn: DbConn,
  hostId: string,
): Promise<ListingMissingHours[]> {
  return dbConn
    .select({ id: listing.id, title: listing.title })
    .from(listing)
    .where(
      and(
        eq(listing.hostId, hostId),
        isNull(listing.deletedAt),
        eq(listing.status, "published"),
        notExists(
          dbConn
            .select({ one: sql`1` })
            .from(operatingHours)
            .where(eq(operatingHours.listingId, listing.id)),
        ),
      ),
    )
    .orderBy(desc(listing.updatedAt));
}

/**
 * Does ONE listing have at least one weekly-hours row — the fourth `deriveBookable` term, for the
 * single-listing call site (the booker-facing listing page).
 *
 * Built the same way as its neighbour above: a short-circuiting existence probe on
 * `operating_hours_listing_idx` (schema.ts), `LIMIT 1`, so it costs the same on a listing with one hours
 * row as on one with seventy. The listing page folds it into the `Promise.all` it was already awaiting,
 * so the derive gains a term but not a round trip.
 *
 * TWO DIFFERENCES FROM `loadPublishedListingsMissingHours`, both deliberate:
 *
 *   - **It takes a LISTING ID, not a host id, so it is NOT owner-scoped.** That is safe here and the
 *     reasoning is worth stating rather than assuming (T-STI-04). It answers only "does this listing
 *     have a calendar", which is already public to any booker — an hours-less listing renders every date
 *     Closed on a page anyone can open. It is called only with an id the caller has ALREADY resolved and
 *     404-gated server-side, so it cannot be used to confirm the existence of a draft, unlisted or
 *     soft-deleted listing. Nothing owner-scoped is read and nothing private is returned.
 *
 *   - **It does not filter on `status`.** The status question is answered by `deriveBookable` itself,
 *     which ANDs the status term; asking it twice here would only invite the two answers to disagree.
 */
export async function listingHasOperatingHours(dbConn: DbConn, listingId: string): Promise<boolean> {
  const rows = await dbConn
    .select({ one: sql`1` })
    .from(operatingHours)
    .where(eq(operatingHours.listingId, listingId))
    .limit(1);
  return rows.length > 0;
}
