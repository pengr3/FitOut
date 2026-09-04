// D-13's rule — "draft/unlisted/missing → 404 to the public" — as ONE expression, plus the assertion
// that makes the HTTP status actually say so.
//
// ── WHY THIS MODULE EXISTS AT ALL, AND WHY THE ASSERT LIVES IN A LAYOUT ───────────────────────────
//
// `/listings/[id]` answered **200** for a draft, an unlisted listing and a wholly nonexistent id. Not
// a leak — the body was the not-found page and the listing's title was measurably absent — but the
// STATUS LINE was wrong, which is the half that machines read.
//
// The cause is streaming, and it is a property of the ROUTE rather than of the listing. `loading.tsx`
// wraps the page in a `<Suspense>` boundary, so Next flushes the shell — committing `200` — before the
// page body ever reaches `notFound()`. The not-found UI then streams in underneath a status line that
// was already sent. Measured rather than reasoned, because two plausible fixes are wrong:
//
//   nonexistent id, same route ............................. 200  (so: the route, not the draft status)
//   bogus path on a route with NO loading.tsx .............. 404
//   `notFound()` added to `generateMetadata` ............... 200  ← NOT early enough. The metadata
//                                                                  hook resolves before the head is
//                                                                  emitted, and it is STILL too late.
//   `loading.tsx` deleted ................................. 404  ← proves the cause, and is not the fix
//   this module, called from the LAYOUT .................... 404  ← the fix
//
// ⚠ DELETING `loading.tsx` IS NOT AVAILABLE, and a future reader should not rediscover this the hard
// way. `tests/design/loading-coverage.test.ts` is build-blocking (it runs inside `npm run test:design`,
// which both `npm run build` and CI's `gate-db-free` run) and its rule is that every page which awaits
// on the server MUST have a `loading.tsx` — with dead ones failing too. Deleting the file trades a
// status-code bug for a red gate and a lost loading state.
//
// The layout is the seam because a layout renders in the SHELL, above the page's Suspense boundary.
// Awaiting there blocks the flush, so the status line is still open when `notFound()` runs.
//
// ── THE COST, STATED SO IT IS A CHOICE AND NOT AN ACCIDENT ────────────────────────────────────────
//
// `(detail)/layout.tsx`'s header and footer no longer stream until this query resolves. That is one
// indexed primary-key lookup, and `cache()` collapses it to a single round trip per request no matter
// how many callers ask. It is the price of a settable status line.
//
// ── SCOPE: NINE ROUTES CARRY THIS DEFECT AND ONLY THIS ONE IS FIXED ───────────────────────────────
//
// Every route with a `loading.tsx` and a `notFound()` has the same soft 404 — nine of them. Measured
// anonymously (no cookies), only this one has an observable consequence:
//
//   listings/[id] .................. 200 + REAL CONTENT on a published listing → public, indexable
//   listings/[id]/book ............. 200, content withheld. Reached ONLY by `redirect()` from a server
//                                    action (`app/actions/booking.ts:351,513`); no `<a href>` points to
//                                    it and the URL needs an unguessable `?hold=<uuid>`, so no crawler
//                                    can discover it.
//   7 × bookings/[id]*, host/* ..... 307 → /login. The page never renders for an anonymous client, so
//                                    its status is unobservable from outside a session. They also carry
//                                    `T-04-CONFIRMIDOR`-class owner-gates their headers mark
//                                    MUST-NOT-SKIP, and none owns a layout.
//
// So the other eight are ACCEPTED, not overlooked. Anything that makes one of them publicly reachable
// — a crawlable link to `book`, or dropping the `/login` redirect — brings its soft 404 with it, and
// this module is what it should call.
//
// ── WHAT THIS IS WORTH ────────────────────────────────────────────────────────────────────────────
//
// Index hygiene, not security. A listing that is unpublished or deleted was previously crawlable, and
// a 404 is the only signal that removes it from a search index; a 200 keeps it, so bookers keep
// landing on dead listings. The app ships no `sitemap.ts`, no `robots.ts` and no `noindex` today, so
// the exposure is LATENT — which is the argument for fixing it now, while it is one file, rather than
// after a few hundred dead URLs are indexed.

import { cache } from "react";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { listing } from "@/lib/db/schema";

/**
 * D-13 + D-208, as ONE expression. Every caller that decides "may the public see this listing?" goes
 * through here so the rule cannot drift between them — the failure mode being a route that 404s while
 * something else happily renders the same listing's contents.
 *
 * ── THE THREE CALL SITES, NAMED, BECAUSE THE THIRD IS THE ONE NOBODY LOOKS FOR ────────────────────
 *
 *   1. `assertPublicListing` (below), called from `(detail)/layout.tsx` — sets the HTTP STATUS.
 *   2. `src/app/listings/[id]/(detail)/page.tsx` — renders the BODY, and keeps the status honest.
 *   3. `src/lib/listing/og-facts.ts` (`listingCardFacts`) — renders the share CARD that
 *      `/listings/[id]/opengraph-image` paints.
 *
 * Site 3 held its OWN copy of the published check until phase 18 (D-247). A copy is not a rule: with
 * the review gate added to sites 1 and 2 only, an unreviewed listing's page would 404 while its Open
 * Graph route kept serving that listing's title, space type, city and rate to every scraper, link
 * scanner and preview proxy that fetched it — a public read of an unreviewed space, on a route that
 * is never seen in a browser and therefore never noticed. Add a fourth reader of a listing and it
 * calls THIS, or the same defect comes back.
 *
 * ── WHY THE THIRD PARAMETER IS REQUIRED AND POSITIONAL, NOT OPTIONAL ──────────────────────────────
 *
 * Because that is what turned every call site into a compile error the day it was added — the same
 * census mechanism `deriveBookable` uses for its six terms (D-224). `tsc` enumerated the sites; grep
 * would have missed the one in `og-facts.ts`, which spelled the rule out by hand instead of calling
 * this. **Never give it a default and never make it optional** — that trades a compiler for a
 * convention, and the convention is exactly what failed here once already.
 *
 * ── THE TERMS ─────────────────────────────────────────────────────────────────────────────────────
 *
 * `deletedAt` is part of the rule, not a separate concern: a soft-deleted row keeps its `published`
 * status, so a status-only test would serve deleted listings.
 *
 * `reviewState` is tested with POSITIVE literals — `approved` OR `grandfathered` — never as a
 * negative. A negative spelling (`!== "pending"`) would let `withdrawn` and any future value through
 * on the day it is added, which is the failure mode a hidden-until-approved gate cannot have.
 *
 * `grandfathered` is publicly viewable ON PURPOSE (D-207 / D-210 / D-211): the gate binds only
 * listings created or materially edited after phase 18, so the pre-existing catalogue keeps selling
 * and keeps being readable. It stays a DISTINCT state rather than being written as `approved`,
 * because nothing was ever checked on those rows and one `UPDATE` must be able to burn the backlog
 * down later.
 */
export function isPubliclyViewable(
  status: string | null | undefined,
  deletedAt: Date | null | undefined,
  reviewState: string | null | undefined,
): boolean {
  return (
    !deletedAt &&
    status === "published" &&
    (reviewState === "approved" || reviewState === "grandfathered")
  );
}

/**
 * 404 unless the listing is publicly viewable — and do it from somewhere the status line is still open.
 *
 * ⚠ CALL THIS FROM A LAYOUT, NOT FROM A PAGE. From a page it is correct but useless: the shell has
 * already been flushed with `200` and the only thing left to change is the body, which the page's own
 * guard already handles. The whole point of this function is WHERE it is called.
 *
 * `cache()` is not an optimisation here so much as the thing that makes calling it twice free — it is
 * request-scoped, so the layout's lookup and any later caller's are one query.
 *
 * ⚠ THIS FUNCTION IS SESSION-FREE, AND THAT IS LOAD-BEARING RATHER THAN INCIDENTAL. It runs from a
 * layout on a not-found-adjacent path, and `src/app/not-found.tsx:29-45` records what happened the one
 * time such a path was taught about sessions: a dynamic root not-found is part of EVERY route's tree,
 * so the request-header read that a session lookup forces took the whole build's prerendering with it
 * — the route table came back with ZERO static routes. So: no session lookup, no request-header read,
 * no other request-scoped input may be added here, and D-230's "the host sees its own listing and its
 * own review status" is NOT to be satisfied at this layer. The host sees it on the HOST surfaces,
 * which are already session-aware and cost nothing to make so; this layer answers one question —
 * "may an anonymous stranger read this?" — and must stay able to answer it without knowing who is
 * asking.
 *
 * (The two forbidden call expressions are described rather than named, deliberately: this plan's
 * acceptance check is a bare `grep` over the file, and a prohibition that spells its own token out is
 * falsely red against the correct file — the trap `tests/helpers/source-text.ts` was written for.)
 */
export const assertPublicListing = cache(async (id: string): Promise<void> => {
  const rows = await db
    .select({
      status: listing.status,
      deletedAt: listing.deletedAt,
      // D-208 / D-247: the review gate is a TERM OF VIEWABILITY, so it has to be read here too. A
      // pending listing 404s at this layer exactly as a draft does — the same soft-404 shape 17.1-01
      // measured, not a new error surface (D-229).
      reviewState: listing.reviewState,
    })
    .from(listing)
    .where(and(eq(listing.id, id), isNull(listing.deletedAt)));

  const row = rows[0];
  if (!row || !isPubliclyViewable(row.status, row.deletedAt, row.reviewState)) notFound();
});
