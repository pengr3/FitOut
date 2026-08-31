// LVER-03 — re-review on material edit (D-213 / D-231 / D-232 / D-242 / D-249).
//
// WHAT THIS IS. One guarded WRITE, shared by the TWO sites that can observe a material edit. It is not
// a predicate, not a derivation and not a read helper: it flips `listing.review_state` back to pending
// and appends the `listing_review` row that the OPS-04 queue orders by. Approval is not a permanent
// grant — a host who changes what the space IS after being approved goes back in the queue.
//
// ── WHY THIS IS A SHARED HELPER WHILE THE SELL-GATE RE-STATEMENTS ARE NOT (D-227) ────────────────────
// D-227 forbids folding `placeHold` / `placeOpenHold`'s re-derived bookability terms into a shared
// helper, and it is right to: duplicated security code on the money path only stays honest if each copy
// is measured independently. That rule governs those RE-STATEMENTS. It does not govern this module, and
// the difference is not stylistic:
//   - Those two are READS that must each refuse independently. If one copy drifts, the OTHER still
//     refuses — so two copies are strictly safer than one.
//   - This is a WRITE that must produce the SAME row shape from both call sites. If two copies drifted,
//     one detection site would write a `listing_review` row the queue orders differently from the
//     other's, and D-249's no-line-jumping guarantee would hold for edits made through one action and
//     not the other. Two copies here are strictly MORE dangerous than one.
// So: do not "consistently" extract booking.ts's terms because this module exists, and do not
// "consistently" inline this because those are inlined.
//
// ── THE TWO DETECTION SITES, AND WHY THERE ARE TWO (D-242) ───────────────────────────────────────────
//   1. `src/app/actions/listing.ts` `saveListingStep` — address, space type, capacity, price.
//   2. `src/app/actions/listing-photo.ts` `persistPhoto` / `removePhoto` — photos.
// D-231's own sentence says detection happens in `saveListingStep`, and for one of its own five fields
// that sentence is not achievable: `draftSchema` (`src/lib/validation/listing.ts`) has no photos field
// and `saveListingStep` never touches `listing_photo`, so a host could swap every photo on an approved
// listing — the single highest-signal fake-listing edit there is — and the wizard's save action would
// never run. Detection therefore lives in two places BY NECESSITY. Both sites say so, and each has its
// own test anchor in `tests/listing/material-edit.test.ts`, exactly as the sell-gate re-statements do.
//
// ── THE GUARD IS IN THE WHERE ────────────────────────────────────────────────────────────────────────
// `cancel-booking.ts`'s discipline, applied here: every source state lives in the UPDATE's own WHERE, so
// a 0-row result is the single calm no-op and there is no branch a future edit can forget. A listing
// already awaiting review stays where it is; a listing the host has taken off the market is not dragged
// back into a queue nobody asked for. Neither is a code path — both are the absence of a matching row.
//
// ⚠ ONE STATE IS DELIBERATELY OUTSIDE `RE_REVIEW_SOURCE_STATES` AND ITS NAME IS NOT SPELLED ANYWHERE IN
// THIS FILE. It is the fifth member of `listing_review_state` in `src/lib/db/schema.ts` — the one
// meaning the listing has been taken out of review by its own side. The literal is absent on purpose:
// this plan's acceptance gate counts occurrences of that quoted string in this file and a comment
// naming it would make a correct file read as a broken one (the collision `src/lib/validation/
// cancellation.ts:16-19` states as a rule — "a grep is only a real guard if the very comment forbidding
// a string cannot trip it", and the one 18-05 hit three times in one plan). Do not "restore clarity" by
// typing it here; the tuple below is the whole specification and the enum in `schema.ts` is the list.
//
// NON-CLIENT MODULE — no "use client", no client-only imports, per `hours-signal.ts`'s header. It is
// imported by two `"use server"` action modules and runs inside their transactions.

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { listing, listingReview, type ListingReviewState } from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";

/**
 * A connection OR an open transaction. BOTH call sites pass a TRANSACTION, and that is the whole point
 * of accepting one: `saveListingStep` passes the `tx` of its existing `db.transaction`, and the photo
 * actions pass the `tx` of theirs (`removePhoto` already had one; `persistPhoto`'s bare insert was
 * paired into one so the two writes could not separate). A listing whose address — or whose photo set —
 * committed while its review state did not is a sellable fake, and a helper that only accepted a
 * connection would have made that the default outcome at both sites.
 *
 * The parameter still admits a plain connection, so a future caller with nothing to be atomic WITH is
 * not forced to open a transaction for one statement.
 *
 * Typed at the `PgDatabase` base both `db` and a postgres-js transaction extend, rather than as a
 * union — a union of the two would make every builder call an overload-resolution problem.
 */
export type ReReviewConn = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;

/**
 * WHICH detection site fired. Carried through to the result and the log line so a failure names the
 * site rather than the symptom — the two sites are structurally different code and a regression in one
 * looks exactly like a regression in the other from the listing row alone.
 */
export type ReReviewTrigger = "listing_fields" | "listing_photos";

/**
 * D-231's material field set: exactly the ROADMAP's five, no more and no fewer.
 *
 * ⚠ `title` and `description` are DELIBERATELY EXCLUDED, and that is a recorded gap rather than an
 * oversight: a fake listing lies in its words as much as in its fields. The exclusion holds the
 * ROADMAP's stated five as written; widening the set is a product decision, and it is carried as a
 * live deferred item in `.planning/REQUIREMENTS.md` § Deferred ("Title/description as material-edit
 * fields") and in 18-CONTEXT § Deferred Ideas. Anyone adding a sixth member here must add its
 * detection at the site that can see it AND a case in `tests/listing/material-edit.test.ts`; the
 * negative case in that file (a title/description-only edit does NOT flip) is what will go red first,
 * and it should be UPDATED rather than deleted, so the change is visible in a diff.
 *
 * This tuple is documentation with a type, not a dispatch table — the two detection sites compare
 * concrete columns, because "address" is eight columns plus a PostGIS point and no string key could
 * stand for that honestly.
 */
export const MATERIAL_FIELDS = [
  "address",
  "space_type",
  "capacity",
  "photos",
  "price",
] as const;

export type MaterialField = (typeof MATERIAL_FIELDS)[number];

/**
 * The three states a material edit pulls BACK into review.
 *
 * `approved` (D-232) — approval is not a permanent grant; the approve-then-swap is the whole threat.
 * `grandfathered` (D-213) — the material edit is the burn-down path, and the ONLY route out of
 *   grandfathered short of a deliberate backfill. D-211 keeps the state first-class precisely so this
 *   works without ever writing it as though a human approved it.
 * `rejected` (D-249) — and this one is the addition D-232 as written did not make. Without it a single
 *   rejection kills a listing forever, while the host surface offers an "Edit this listing" route that
 *   goes nowhere. This is RESUBMISSION AFTER FIXING THE THING THAT WAS WRONG — the normal marketplace
 *   loop. It is NOT an appeal: an appeal contests a decision without changing anything, and appeals are
 *   backlog 999.6 and remain OUT of scope. The distinction is load-bearing, because the only way into
 *   this branch is an actual edit to a material field.
 */
const RE_REVIEW_SOURCE_STATES = [
  "approved",
  "grandfathered",
  "rejected",
] as const satisfies readonly ListingReviewState[];

export type ReReviewResult = {
  /** true only when the guarded UPDATE actually moved a row (and therefore appended a history row). */
  flipped: boolean;
  trigger: ReReviewTrigger;
  /** The appended `listing_review` row's id, or null when nothing moved. */
  reviewId: string | null;
};

/**
 * Pull a listing back into review because a material field genuinely changed (LVER-03).
 *
 * Two statements, in this order and never reordered:
 *
 *  1. THE GUARDED FLIP. `review_state = 'pending'` for this listing, WHERE its current state is one of
 *     the three above. Everything else is a 0-row no-op by construction. Nothing else on the row is
 *     touched — this is not the place to write status, and it never writes anything a client supplied.
 *
 *  2. THE HISTORY ROW, ONLY IF STEP 1 MOVED SOMETHING. A fresh `listing_review` row at `pending`, with
 *     `submitted_at` left to the column's own `defaultNow()` so the timestamp is POSTGRES' clock inside
 *     this transaction rather than a JS `Date` composed here. That fresh timestamp IS D-249's first
 *     guard: the OPS-04 queue is oldest-first and orders a listing by its LATEST
 *     `listing_review.submitted_at` (`src/lib/ops/review-queue.ts`), so a resubmission enters the queue
 *     at its RESUBMISSION time and a repeat-resubmitter cannot jump the line ahead of a first-time
 *     submitter. Guarding the insert on step 1 having moved a row is what keeps that true in the other
 *     direction too: a listing already waiting is not re-stamped to the back of the queue every time
 *     its host saves the wizard.
 *
 *     The new row is opened, not decided — `decided_at` stays NULL, which `schema.ts` documents at the
 *     column as "still awaiting a decision" and which is exactly what `ops-review.ts`'s
 *     `closeReviewCycle` looks for when a staff member later decides it. One row is one
 *     submission-and-its-decision, and this is the statement that opens the next one.
 *
 * ⚠ WHAT THIS FUNCTION NEVER WRITES: the previous rejection's explanation. It is not read, not copied
 * forward, not blanked. D-249's second guard is that a rejected host can still SEE what they are fixing
 * while they fix it — the prior `listing_review` row keeps its own text untouched, and erasing it on
 * the flip would delete the only thing that makes the edit purposeful. There is no statement in this
 * module that assigns to that column at all, which is the strongest form of "it survives".
 *
 * It never throws for a listing that does not exist, is soft-deleted, or is in any other state: those
 * are all 0 rows.
 */
export async function markForReReview(
  conn: ReReviewConn,
  listingId: string,
  trigger: ReReviewTrigger,
): Promise<ReReviewResult> {
  const flipped = await conn
    .update(listing)
    .set({ reviewState: "pending" })
    .where(
      and(
        eq(listing.id, listingId),
        // Every guard in the WHERE. See RE_REVIEW_SOURCE_STATES for why each member is here and the
        // header for why the fifth enum member is not.
        inArray(listing.reviewState, [...RE_REVIEW_SOURCE_STATES]),
      ),
    )
    .returning({ id: listing.id });

  if (flipped.length === 0) {
    return { flipped: false, trigger, reviewId: null };
  }

  const reviewId = randomUUID();
  await conn.insert(listingReview).values({
    id: reviewId,
    listingId,
    state: "pending",
    // `submittedAt` is OMITTED so the column's defaultNow() supplies Postgres' clock (D-249). Binding a
    // JS Date here would work through the query builder, but the timestamp would then be the app
    // server's — and the queue this row is ordered in is ordered by Postgres' own comparisons.
    // `decidedAt` is omitted for the same structural reason: NULL means "awaiting a decision".
  });

  // Low volume by construction — this line is only reached when a listing that HAD been decided is
  // being pulled back in, which is a real event an operator may need to correlate with a queue row.
  console.info("[re-review] listing returned to review after a material edit (LVER-03)", {
    listingId,
    trigger,
    reviewId,
  });

  return { flipped: true, trigger, reviewId };
}
