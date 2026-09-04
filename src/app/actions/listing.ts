"use server";

// Listing lifecycle server actions (LIST-01/03/04/05 · D-01/D-02/D-03/D-04/D-05).
//
// SECURITY CONTRACT (mirrors the Phase-1 input:false discipline — profile.ts / capability.ts):
//   - SESSION: every action requires an authenticated session (auth.api.getSession).
//   - OWNERSHIP (T-03-IDOR): every mutating action asserts listing.hostId === session.user.id via
//     assertOwnership() BEFORE any write, and every UPDATE re-scopes its WHERE to (id AND hostId) as
//     belt-and-suspenders. A non-owner is rejected — they can never edit/publish/unlist/delete
//     someone else's listing.
//   - STATUS / hostId / publishedAt are NEVER accepted from a client body (T-03-STATUS). status is
//     transitioned ONLY by publishListing / unlistListing here; saveListingStep writes ONLY the
//     draftSchema-parsed editable fields (Zod strips any smuggled status/hostId/publishedAt).
//   - PRICE / capacity (T-03-PRICE): re-validated as positive INTEGER cents / positive int server-side
//     via publishSchema at publish — the client price is never trusted.
//   - PUBLISH GATE (D-02): publishListing enforces, server-side, publishSchema.parse(row) AND ≥3
//     photos AND host.emailVerified === true. This is where the Phase-1 soft email-verification gate
//     (01-CONTEXT D-07) is enforced. This plan is payment-agnostic — payout/bookability is Plan 06.
//   - CANCELLATION TIER (T-07-88 / D-77): publishSchema now REQUIRES cancellationPolicy, re-read from the
//     PERSISTED row. The wizard's live checklist is a courtesy, never the gate — a client that skips the
//     step, or a stale one that predates it, is rejected here. Gating PUBLISH (not creation) mirrors the
//     bookability gate and is what keeps pre-Phase-7 NULL-tier drafts saveable rather than bricked.
//   - HOST VERIFICATION (D-255 / PM-C, T-18.1-1201): createDraftListing enforces, server-side, that the
//     host has been CHECKED. It refuses for `unverified | pending | rejected | suspended`, reading the
//     one owner-scoped helper every other host surface reads. THE PAGE IN FRONT OF IT IS A HINT AND
//     THIS IS THE GATE — `/host/listings/new` reads the same row and redirects a refusing host to
//     `/host/verify` so the refusal is legible, but a client that skips the page, replays the POST or
//     types the action's endpoint meets this clause instead. The page read is a COURTESY, NEVER THE
//     GATE — this file's own words for the wizard's checklist, one action over, and the four
//     `Create listing` links are left enabled for the same reason (D-255): a hint on a surface has
//     never been an authorization decision here.
//     ⚠ Gating CREATION and not `saveListingStep` is D-270 — see that function's own note.
//   - Soft-deleted rows (deletedAt IS NOT NULL) are excluded from normal reads/writes.

import { randomUUID } from "node:crypto";
// `desc` is here for the D-02 reuse read's `ORDER BY created_at DESC` and nothing else — added by
// plan 19-06. The alternative was raw SQL for the ordering clause; the helper keeps the column
// reference type-aware, so a rename of `createdAt` reddens at compile time instead of at runtime.
import { and, desc, eq, isNull, sql, type InferInsertModel } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listing,
  listingPhoto,
  listingAmenity,
  listingActivityTag,
  user,
} from "@/lib/db/schema";
import {
  draftSchema,
  publishSchema,
  SURCHARGE_UNREACHABLE_MESSAGE,
  MODE_LOCKED_MESSAGE,
  PER_HEAD_PRICE_REQUIRED_MESSAGE,
  DROP_IN_CAP_REQUIRED_MESSAGE,
  DROP_IN_INSTANT_ONLY_MESSAGE,
  DROP_IN_SINGLE_SPACE_MESSAGE,
  type DraftListingInput,
} from "@/lib/validation/listing";
import { getModeLockState } from "@/lib/listing/mode-lock";
// D-255 / PM-C — the SIXTH reader of one owner-scoped read, never a seventh query. Its own header
// carries the argument: a host told one thing on `/host` and another here is the two-authorities
// defect PROJECT D-130 / GATE-05 is named for, and this module deciding whether a listing may exist
// has to agree with the surfaces that tell the host why it may not.
import { loadHostVerification } from "@/lib/host/verification-status";
// The refusal's ONE owner. It cannot be a const at the top of this file: a `"use server"` module may
// export only async functions (`tests/use-server-exports.test.ts`'s recorded incident), so a literal
// here would be module-private and invisible to the banned-language corpus that polices every
// host-facing sentence. Same split, same reason, as `host-verification.ts` one action over.
import { HOST_VERIFICATION_LISTING_REFUSED } from "@/lib/host/verification-refusals";
// D-03 / HSURF-02 — the sentence a host reads when creation genuinely failed, IMPORTED for the
// identical reason the refusal above is: this module opens with the server-action directive, so it may
// export only async functions, and a `const` here would be module-private and invisible to the
// banned-language corpus that polices every host-facing sentence. Importing it also means the origin
// (this catch) and the destination (`(host)/host/listings/page.tsx`'s notice) cannot drift — there is
// one string in the repository and both ends read it.
import { LISTING_CREATE_FAILED_STATE } from "@/lib/listing/create-signal";
// LVER-03 — the guarded re-review flip. A shared WRITE helper, deliberately (its header records why
// D-227's no-shared-helper rule governs booking.ts's sell-gate re-statements and not this).
import { markForReReview } from "@/lib/listing/re-review";
// D-188 — softDeleteListing destroys the listing's Cloudinary assets. A new CALLER of the existing
// helper, never a new helper: `src/lib/cloudinary.ts` counts its own destroy call sites and this
// module is server-only, so importing it into a `"use server"` module is the move
// `listing-photo.ts` already makes.
import { destroyListingPhoto } from "@/lib/cloudinary";

const MIN_PHOTOS = 3; // D-02/D-04 — minimum photos to publish.

export type ListingResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * `createDraftListing`'s OWN result — `ListingResult` with the success arm's `id` made REQUIRED.
 *
 * ⚠ THIS IS WHAT MAKES THE PAGE'S DEAD `!res.id` CHECK IMPOSSIBLE RATHER THAN MERELY DELETED, and the
 * two are different acts. `new/page.tsx` used to test `!res.ok || !res.id`; the second half could
 * never be true, because every `ok: true` return here carries an id. Deleting a branch because it
 * *looks* unreachable is a judgement a later edit can silently falsify. Narrowing the TYPE makes
 * `tsc` prove it: an `ok: true` return that omitted `id` would stop compiling here, at the origin,
 * rather than reaching a page that no longer checks.
 *
 * It is a TYPE, so a `"use server"` module may export it — `ListingResult` above already is one, and
 * the rule that bites is about VALUES (`tests/use-server-exports.test.ts`'s recorded `avatar.ts`
 * incident). That same rule is why the failure SENTENCE is imported rather than declared here.
 *
 * Assignable to `ListingResult` in both arms, deliberately: `{ ok: true; id: string }` satisfies
 * `{ ok: true; id?: string }` and the failure arm only drops an optional field. Nothing else in the
 * tree that expects a `ListingResult` is affected — proven by `npx tsc --noEmit`, not by reasoning.
 */
export type CreateDraftListingResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Resolve the signed-in user's id, or null if there is no session (copied from capability.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * IDOR guard: load a non-deleted listing and return it ONLY if it belongs to `userId`, else null.
 * Every mutating action funnels through this before touching a row.
 */
async function assertOwnership(listingId: string, userId: string) {
  const rows = await db
    .select()
    .from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const row = rows[0];
  if (!row || row.hostId !== userId) return null;
  return row;
}

/**
 * Create an empty DRAFT owned by the signed-in user (D-01 draft-first) — OR HAND BACK THE HOST'S
 * OWN UNTOUCHED EMPTY DRAFT IF THEY ALREADY HAVE ONE (D-02). The wizard then autosaves into it via
 * saveListingStep. status defaults to "draft" and bookingMode to "instant" (D-62 — the demand-first
 * default flip, was "request" under D-04). This create-code default is independent of (and mirrors)
 * the DB SET DEFAULT flipped in 06-01's migration; existing listings are unaffected.
 *
 * ── D-02: REUSE-THEN-MINT, AND WHAT "UNTOUCHED" MEANS ─────────────────────────────────────────────
 *
 * WHY. Plan 19-01 measured FOUR empty drafts owned by one host, minted across 46 seconds
 * (10:51:56 → 10:52:39) — a human pressing *Create listing*, going back, and pressing again while a
 * redirect failed to land. Plan 19-04 deleted them. This branch is what makes that delete a genuine
 * one-off rather than the first of many: it treats the SOURCE rather than the residue.
 *
 * WHAT "UNTOUCHED" IS DEFINED AS, and it is defined from the columns a freshly-minted row actually
 * carries rather than from intent: the insert below writes exactly four values, so everything else
 * on a fresh row is NULL or a column default. The predicate therefore asks for a row that is still
 * in precisely that state — `deleted_at IS NULL`, `status = 'draft'`, `title IS NULL`,
 * `updated_at = created_at`, and no child row in `listing_photo`, `operating_hours` or
 * `availability_block`.
 *
 * WHY THE TIMESTAMP COMPARISON CARRIES THE MEANING. `schema.ts:264-267` declares
 * `updatedAt: timestamp(...).defaultNow().$onUpdate(() => new Date()).notNull()`, and Drizzle's
 * `$onUpdate` fires on EVERY `db.update()` through this table object. Every write path in the app
 * goes through it — `saveListingStep`, publish, unlist, soft-delete, the LVER-03 re-review flip. So
 * "the host has done literally anything to this row" collapses to ONE comparison that will not
 * drift as the schema grows twenty more columns.
 * ⚠ Its one real limit, stated rather than hidden: `$onUpdate` is a DRIZZLE-CLIENT HOOK, NOT A
 * DATABASE TRIGGER. A raw-SQL `UPDATE listing SET …` bypassing Drizzle would not bump it.
 *
 * ⚠ CENSUSING THOSE WRITERS TAKES TWO PATTERNS, NOT ONE, AND THIS SENTENCE USED TO CLAIM OTHERWISE.
 * It previously said that `grep -n 'update(listing)' src/` returns this file at four sites plus
 * `src/lib/listing/re-review.ts`, "and nothing else". That is a true grep and a FALSE CENSUS: the
 * Drizzle call site is only one of the two ways this row gets written, and the pattern is blind to
 * the other. The method is (1) the Drizzle `update(listing)` call sites AND (2) raw-SQL statements
 * against the table, which the first pattern cannot see. Run against pattern 2, the single-pattern
 * grep was missing `src/app/actions/ops-review.ts:667` and `src/app/actions/ops-review.ts:751`, two
 * `db.execute(sql\`UPDATE listing …\`)` statements. BOTH OF THEM SET `updated_at = now()`
 * EXPLICITLY, so each pushes a row toward the TOLERABLE ("too tight") direction rather than the
 * unacceptable one — which is why this correction fixes a METHOD and not a bug. The raw-SQL half is
 * now machine-checked by `tests/design/listing-reuse-predicate-census.test.ts`, which asserts over
 * comment-stripped source that every raw `UPDATE` of this row sets `updated_at` before its `WHERE`,
 * so the census cannot silently go stale again the way this paragraph did.
 *
 * WHY THE THREE `NOT EXISTS` CONJUNCTS ARE NOT BELT-AND-BRACES. `listing-photo.ts:294` inserts into
 * `listing_photo` inside a transaction and does NOT update the `listing` row; `operating-hours.ts:165-167`
 * does the same for `operating_hours`; `src/app/actions/blocks.ts`'s `addBlock` does the same for
 * `availability_block`, inserting a subtractive block and performing no update of the listing row
 * (measured, all three). So a host who minted a draft, uploaded a cover photo and abandoned it has
 * `updated_at = created_at` AND a photo — and a host who blocked dates on a draft from the
 * Availability page has `updated_at = created_at` AND a blackout — and without these conjuncts a
 * second *Create listing* would silently adopt that work into what the host believes is a brand-new
 * listing. `title IS NULL` genuinely IS belt-and-braces (the timestamp term should already imply it)
 * and is kept anyway, because every extra conjunct can only make reuse RARER.
 * ⚠ `availability_block` WAS THE THIRD INSTANCE OF ONE CLASS, AND TWO PROSE CENSUSES MISSED IT
 * (19-VERIFICATION gap 1 / 19-REVIEW CR-02) — each of the two earlier fixes closed the instance in
 * front of it and re-asserted completeness in a comment. A comment cannot be re-run and cannot be
 * watched go red, which is why completeness is now a CHECKED PROPERTY; see the paragraph below.
 *
 * HOW A FOURTH CHILD TABLE GETS CAUGHT. `tests/design/listing-reuse-predicate-census.test.ts` is a
 * standing, DB-free, build-blocking gate: it derives from `src/lib/db/schema.ts` at runtime every
 * table declaring `.references(() => listing.id`, and requires each one to be EITHER covered by a
 * `NOT EXISTS` conjunct here OR carry a written exemption reason there. An eighth child table
 * reddens it BY NAME until someone decides which. The four exemptions and their reasons, so a reader
 * of this function need not open the test to learn what was decided:
 *   • `listing_amenity` — written only by `saveListingStep`, inside the SAME `db.transaction` as its
 *     `.update(listing).set(patch)` whose `patch` sets `updatedAt` explicitly; the timestamp term
 *     already catches it.
 *   • `listing_activity_tag` — identical writer, identical transaction, identical reason.
 *   • `listing_review` — the D-221 ops review-HISTORY table (not a guest review). Its only writer,
 *     `markForReReview`, appends a row solely when its preceding Drizzle `update(listing)` moved a
 *     row (so `$onUpdate` already fired), and that update is guarded to
 *     `review_state IN (approved, grandfathered, rejected)` while a fresh draft defaults to
 *     `pending` — a 0-row no-op on any draft.
 *   • `booking` — a draft is never bookable: `deriveBookable` requires `status = 'published'` AND an
 *     `operating_hours` row, so no draft can carry one.
 *
 * WHY EVERY AMBIGUITY RESOLVES TOWARD TIGHTNESS — the two failure directions are NOT symmetric:
 *   • TOO LOOSE: the host presses *Create listing* to start their SECOND space, lands in the wizard
 *     for their FIRST one already half filled in, edits it, overwrites real work, and NEVER LEARNS a
 *     second listing was not created. Silent data loss on a host's own content. Unacceptable.
 *   • TOO TIGHT: one extra empty draft appears in the grid. That is TODAY's behaviour — visible,
 *     deletable, one row. Tolerable.
 *
 * WHERE IT SITS, AND WHY THERE. AFTER the D-255 verification gate and BEFORE the insert. Before the
 * gate would let an unverified host discover whether they own a reusable draft (an existence leak to
 * an account nobody has checked); in `new/page.tsx` it would be bypassable, which is the argument
 * that page's own header already makes about the verification gate itself.
 *
 * ⚠ THIS IS A CHECK-THEN-ACT AND IT MUST NOT BE DESCRIBED AS RACE-FREE. Two tabs can both find zero
 * reusable drafts and both insert. IT MAKES CREATION IDEMPOTENT AGAINST A HUMAN RETRY, NOT AGAINST
 * CONCURRENCY. That is accepted here, and the reason is written down rather than assumed: the
 * residual race costs ONE SURPLUS EMPTY DRAFT AND NO DATA LOSS — not a double-booked room and not a
 * double charge, so the domain rule `CLAUDE.md § What NOT to Use` protects when it bans
 * query-then-insert FOR BOOKINGS (money, exclusivity) is simply absent here. The observed defect was
 * SEQUENTIAL (four inserts across 46 seconds is a person, not a race), which is exactly what a
 * check-then-act does fix. The correct-by-construction alternative is a partial unique index on
 * `(host_id) WHERE status='draft' AND updated_at = created_at` — a SCHEMA MIGRATION, and zero schema
 * migrations is a v1.2 invariant; D-02 says so in as many words ("No migration — this is a query
 * plus a branch"). A docblock claiming idempotency without this qualifier would be the
 * confident-wrong-claim the house rules forbid, so do not delete this paragraph to make the function
 * sound stronger than it is.
 *
 * ⚠ `saveListingStep` STAYS UNGATED (D-270). This branch changes what `createDraftListing` RETURNS;
 * nothing about what the wizard may WRITE changes. See that function's own note.
 * PINNED BY: `tests/listing/crud.test.ts` — the four D-02 cases. Delete the timestamp conjunct and
 * "(D-02 · case 2)" reddens by name; delete the `availability_block` conjunct and
 * "(D-02 · case 4) a draft with an availability_block is never reused, even though updated_at =
 * created_at" reddens by name. The completeness of the conjunct SET is pinned separately, by
 * `tests/design/listing-reuse-predicate-census.test.ts`.
 */
export async function createDraftListing(): Promise<CreateDraftListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to create a listing." };
  }

  // ── D-255 / PM-C — THE HOST-VERIFICATION GATE, AND IT IS THE GATE (T-18.1-1201) ────────────────
  //
  // Owner-scoped by ARGUMENT from the session, exactly as `loadHostVerification`'s docblock requires:
  // there is no id parameter on this action, so one host can never be measured against another's
  // decision. NO ROW READS AS `unverified` (that helper's header rule), which is precisely the state
  // that must refuse — a host nobody has checked is the ordinary state of a new account, and it is
  // the whole reason this gate exists.
  //
  // ⚠ `grandfathered` IS DELIBERATELY NOT A REFUSING STATE — 18.1-RESEARCH FINDING F-7, written here
  // because a later reader will read D-255's own sentence ("a host cannot create a listing until they
  // are verified") and try to "fix" this set. D-255 names FOUR refusing states and `grandfathered` is
  // not among them. `drizzle/0026` grandfathered the hosts who already owned a published listing at
  // cutover, and D-211/D-224 make them SELLABLE — so refusing them a NEW listing would make an
  // account that is selling today unable to grow tomorrow, which is a scope change nobody decided.
  // Their route to a real check is LVER-04's backfill, which stays deferred.
  // PINNED BY: `tests/listing/crud.test.ts` — "grandfathered SUCCEEDS (FINDING F-7)", whose failure
  // message states this whole argument. Delete the term below and that case reddens by name.
  //
  // ⚠ THE FOUR ARE SPELLED POSITIVELY, NOT AS `!== "approved"`. A negation would silently start
  // refusing every state added to `host_verification_status` after today, including `grandfathered`
  // — the exact "fix" the paragraph above exists to prevent, arrived at by accident.
  const verification = await loadHostVerification(db, userId);
  if (
    verification.status === "unverified" ||
    verification.status === "pending" ||
    verification.status === "rejected" ||
    verification.status === "suspended"
  ) {
    // ONE sentence for all four, and that is a privacy property rather than an economy: a suspended
    // host must not be able to tell, from the SHAPE of a listing refusal, that they are
    // distinguishable from a host who simply has not asked yet. Where a suspension is legitimately
    // explained — once, to its owner — is `/host/verify`, which is where the page in front of this
    // action sends all four. `HOST_VERIFICATION_NOTHING_CHANGED` carries the identical argument for
    // the identical reason one action over.
    return { ok: false, error: HOST_VERIFICATION_LISTING_REFUSED };
  }

  // ── THE GUARDED REGION (D-03 / HSURF-02, 19-REVIEW CR-01) ──────────────────────────────────────
  //
  // ⚠ THE `try` OPENS **HERE**, AFTER BOTH REFUSALS HAVE ALREADY RETURNED, AND THE PLACEMENT IS THE
  // WHOLE PROPERTY. A catch must never convert a DELIBERATE REFUSAL into a generic infrastructure
  // apology: the refusal carries information the host needs — that there is a check, and where to ask
  // about it — and the apology destroys it, sending them to a grid that explains nothing. So the
  // session check and the verification gate both return ABOVE this line and are unreachable from
  // inside it. `tests/listing/create-failure.test.ts` drives a SUSPENDED host through an injected
  // database failure and asserts they still receive `HOST_VERIFICATION_LISTING_REFUSED`.
  //
  // ⚠ AND IT WRAPS THE REUSE READ AS WELL AS THE INSERT. CR-01 names both statements and both throw;
  // guarding only the insert would close half the gap and read as if it closed all of it.
  //
  // WHAT THIS FIXED. Until this wrapper existed the function had no `try`/`catch` anywhere, so a dead
  // connection, a timeout or a constraint violation threw straight out of the page render and landed
  // on Next's error boundary. `(host)/host/listings/new/page.tsx`'s failure branch and every constant
  // in `src/lib/listing/create-signal.ts` were written for exactly that case — and it was the ONE case
  // that could not reach them. The words shipped; the failure that was supposed to arrive at them
  // could not. That is what this returns instead of throwing.
  //
  // ⚠ THE ERROR IS LOGGED AND NEVER RETURNED (T-19-32). `create-signal.ts` names no mechanism BY
  // DESIGN — an error string, a component name or a status code on a host surface tells the host
  // nothing they can act on and leaks the shape of a system they control nothing about. The operator
  // gets the whole error under a greppable tag; the host gets a fixed constant. And the constant is
  // IMPORTED rather than spelled, so the origin here and the destination that renders it cannot drift.
  try {
    // ── D-02 — REUSE-THEN-MINT. The argument is in this function's docblock; this is the query. ───
    //
    // Owner-scoped BY ARGUMENT FROM THE SESSION, exactly as the verification read above is: this
    // action takes ZERO parameters, so no request value can select the row and one host can never be
    // measured against another's. Keep the signature at zero arguments — an `id` parameter here would
    // turn a convenience into an IDOR.
    const [reusable] = await db
      .select({ id: listing.id })
      .from(listing)
      .where(
        and(
          eq(listing.hostId, userId),
          isNull(listing.deletedAt),
          eq(listing.status, "draft"),
          // The load-bearing term ($onUpdate, schema.ts:264-267) — see docblock.
          sql`${listing.updatedAt} = ${listing.createdAt}`,
          // Belt-and-braces; the term above should already imply it.
          isNull(listing.title),
          // The real gaps: neither child insert touches the listing row, so neither bumps updated_at.
          sql`NOT EXISTS (SELECT 1 FROM listing_photo WHERE listing_id = ${listing.id})`,
          sql`NOT EXISTS (SELECT 1 FROM operating_hours WHERE listing_id = ${listing.id})`,
          // `blocks.ts`'s addBlock inserts a subtractive block and performs no update of the listing
          // row, so a draft the host has blocked dates on still reads `updated_at = created_at`.
          sql`NOT EXISTS (SELECT 1 FROM availability_block WHERE listing_id = ${listing.id})`,
        ),
      )
      .orderBy(desc(listing.createdAt))
      .limit(1);
    if (reusable) {
      // The host's most recent untouched empty draft. Returned rather than re-minted, and NOTHING is
      // written — a reuse must not bump `updated_at`, or the second press would make the row
      // ineligible for the third and the whole branch would fix only one repeat.
      return { ok: true, id: reusable.id };
    }

    const id = randomUUID();
    await db.insert(listing).values({
      id,
      hostId: userId,
      status: "draft",
      bookingMode: "instant",
    });
    return { ok: true, id };
  } catch (err) {
    // The operator's half. The WHOLE error goes here and nowhere else — see the paragraph above.
    console.error("[listing:create] draft mint failed", { userId, err });
    return { ok: false, error: LISTING_CREATE_FAILED_STATE };
  }
}

/**
 * Autosave one wizard step (D-01). Re-validates with the shared draftSchema (never trusts the client),
 * writes ONLY the editable draft fields to the OWNER's row (never status/hostId/publishedAt), maps
 * lat/lng → PostGIS point {x:lng, y:lat} (Pitfall 1), and replaces the amenity/activity-tag join rows
 * when those arrays are provided. Idempotent partial save — undefined fields are left untouched.
 *
 * ⚠ NO HOST-VERIFICATION READ HERE, AND THAT IS D-270 RATHER THAN AN OVERSIGHT. `createDraftListing`
 * above is gated; this is not, and it must not become so. Gating autosave would STRAND WORK HOSTS
 * ALREADY DID: every draft begun before D-255 landed belongs to a host with no verification row, so
 * the first save after deploy would refuse and the wizard would become a form that cannot be left.
 * It is the identical shape as the cancellation-tier gate below — gate the transition that creates
 * something sellable, never the autosave that keeps a half-finished draft reachable — and the
 * bookability gate makes the same choice one domain over. A host who cannot sell can still finish
 * their sentence; they simply cannot publish, and cannot start a NEW listing.
 * PINNED BY: `tests/listing/crud.test.ts` — "saveListingStep on an EXISTING draft still succeeds for
 * an UNVERIFIED host (D-270)".
 */
export async function saveListingStep(
  listingId: string,
  input: DraftListingInput,
): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to edit a listing." };
  }

  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours to edit." };
  }

  // Never trust the client — re-validate with the SAME schema the wizard form uses.
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  // ── HG-01 (08-22): surcharge reachability on the EDIT path. ─────────────────────────────────────────
  // 08-20 rejects included >= maxOccupancy at PUBLISH (publishSchema). But this autosave writes
  // included/extraHeadFee/maxOccupancy straight to the live row with NO publish re-gate, so without this a
  // host could silently make the per-head surcharge unreachable AFTER publishing (raise included, or lower
  // maxOccupancy below it) — the exact revenue-loss 08-20 closes, one step later, on the routine edit-my-
  // price workflow. Evaluate the EFFECTIVE post-save values (incoming ?? persisted ?? default), mirroring
  // paxSurcharge's `included ?? 1` / `extraHeadFee ?? 0`, so a SPARSE save carrying only one field is still
  // caught. PUBLISHED rows only — a draft stays permissive because publishSchema catches it at publish.
  if (owned.status === "published") {
    const effFee = d.extraHeadFee ?? owned.extraHeadFee ?? 0;
    const effIncluded = d.included ?? owned.included ?? 1;
    const effMax = d.maxOccupancy ?? owned.maxOccupancy ?? 0;
    if (effFee > 0 && effIncluded >= effMax) {
      return {
        ok: false,
        error: "Please check the form and try again.",
        fieldErrors: { included: [SURCHARGE_UNREACHABLE_MESSAGE] },
      };
    }

    // ── CR-04: the same lesson, applied to the fields Phase 9 added. ────────────────────────────────────
    // publishSchema's open branch requires four things of a drop-in listing — a price per person, a
    // positive daily people cap, instant booking, and a single space. This autosave writes occupancyMode
    // straight to the live row and NEVER re-runs that gate, so without this the four rules hold only at the
    // instant of publishing and never again. The wizard makes the bypass the NORMAL route, not an edge
    // case: STEPS puts `occupancy` BEFORE `pricing`, and saveAndContinue persists the whole form on every
    // step — so a host who picks "Drop-in passes" and clicks Save and continue leaves a published, bookable
    // listing in drop-in mode with no price at all, and the next booker's click reaches the claim with a
    // NULL rate. That is a real interval on the money path, not a theoretical one.
    //
    // Same effective-value idiom as HG-01 above (incoming ?? persisted ?? default), for the same reason: a
    // SPARSE autosave carrying only the mode must still be caught. `effMax` is deliberately the SAME local
    // the surcharge rule reads — one definition of "the capacity this save would leave behind". unitCount
    // has no form field at all (D-21), so the persisted value is the only honest source.
    //
    // Every sentence here is IMPORTED from the publish gate, never retyped: there stays exactly one copy of
    // each, so the publish path and the edit path cannot drift into two slightly different refusals.
    //
    // DRAFT ROWS STAY PERMISSIVE — the guard is inside the `published` branch only. A draft mid-wizard MUST
    // be able to sit in drop-in mode with no price yet, because that is precisely the state the occupancy
    // step leaves behind on the way to the pricing step, and publishListing catches it at publish. Anyone
    // "tightening" this to all rows breaks the wizard's own step order.
    const effMode = d.occupancyMode ?? owned.occupancyMode;
    if (effMode === "open_capacity") {
      const effPerHead = d.perHeadPriceCents ?? owned.perHeadPriceCents ?? 0;
      const effBookingMode = d.bookingMode ?? owned.bookingMode;
      const effUnitCount = owned.unitCount ?? 1;
      const openErrors: Record<string, string[]> = {};
      if (!(effPerHead > 0)) openErrors.perHeadPriceCents = [PER_HEAD_PRICE_REQUIRED_MESSAGE];
      if (!(effMax > 0)) openErrors.maxOccupancy = [DROP_IN_CAP_REQUIRED_MESSAGE];
      if (effBookingMode !== "instant") openErrors.bookingMode = [DROP_IN_INSTANT_ONLY_MESSAGE];
      if (effUnitCount !== 1) openErrors.unitCount = [DROP_IN_SINGLE_SPACE_MESSAGE];
      if (Object.keys(openErrors).length > 0) {
        // The SAME outer sentence the surcharge guard returns, so the wizard's existing failure surface
        // handles this with no component change.
        return { ok: false, error: "Please check the form and try again.", fieldErrors: openErrors };
      }
    }
  }

  // ── OC-17: the occupancy-mode lock. ─────────────────────────────────────────────────────────────────
  // The wizard disables the other mode card and explains why (09-UI-SPEC § 1f), but a stale tab or a
  // crafted client can still POST a different mode — so the refusal lives HERE, evaluated against the
  // PERSISTED mode and the LIVE booking set (Security V4, threat T-09-19). It matters more than a normal
  // courtesy-vs-gate split because 09-01 deliberately narrowed `booking_no_overlap` to
  // `... AND open_capacity = false`: the DB will happily hold both row shapes for one listing, so this
  // gate (plus the publish fork) is the ONLY thing keeping a listing's bookings all one kind.
  //
  // Only a genuine CHANGE is refused. Every autosave of an unrelated step re-sends the same stored mode,
  // and freezing those would freeze the whole wizard for any host with a booking on the calendar.
  if (d.occupancyMode !== undefined && d.occupancyMode !== owned.occupancyMode) {
    const lock = await getModeLockState(db, listingId);
    if (lock.locked) {
      return {
        ok: false,
        error: "Please check the form and try again.",
        fieldErrors: { occupancyMode: [MODE_LOCKED_MESSAGE] },
      };
    }
  }

  // ── LVER-03 / D-231 / D-232 / D-249: MATERIAL-EDIT DETECTION — SITE ONE OF TWO. ────────────────────
  // Approval is not a permanent grant. A host who is approved and then changes what the space IS —
  // where it is, what kind of space it is, how many people it holds, what it costs, and (since D-231's
  // 2026-09-01 promotion) what it CALLS itself and how it DESCRIBES itself — has changed the
  // thing ops checked, so the listing goes back in the queue (D-232), and the SAME edit is the burn-down
  // path out of `grandfathered` (D-213) and the resubmission path out of a rejection (D-249). The flip
  // itself, its three source states and its history row live in `src/lib/listing/re-review.ts`; this
  // block's only job is to answer "did a MATERIAL field genuinely change?".
  //
  // ⚠ DETECTION LIVES IN TWO PLACES BY NECESSITY, AND THE OTHER ONE IS
  // `src/app/actions/listing-photo.ts` (`persistPhoto` / `removePhoto`). D-231 names seven material
  // fields — address, space type, capacity, PHOTOS, price, title, description — and says they are
  // detected here. For six of them that is true and this block is it. For photos it is structurally
  // impossible: `draftSchema`
  // (`src/lib/validation/listing.ts`) carries no photos field, and this action never touches
  // `listing_photo` — photos are written by three separate actions in that other file. So D-231's own
  // sentence is unachievable at the site it names for one of its own fields (D-242), and the answer
  // is NOT to quietly drop photos from the set: swapping every photo on an approved listing is the
  // single highest-signal fake-listing edit there is. Do not "consolidate" the two sites; neither can
  // see what the other sees. Each has its own anchor in `tests/listing/material-edit.test.ts`.
  //
  // ⚠ ONLY A GENUINE CHANGE COUNTS — the same guard the occupancy-mode lock states at :202-213, and it
  // is what separates a re-review trigger from a wizard that freezes on every keystroke. The wizard's
  // `saveAndContinue` re-sends the whole form on EVERY step, so an unrelated step's autosave carries the
  // same stored address and the same stored price; treating those as edits would pull every published
  // listing on the platform back into review the moment its host opened the editor. Compared with the
  // EFFECTIVE-VALUE idiom this file already uses twice above (incoming ?? persisted), so a SPARSE save
  // carrying exactly one field is still caught.
  //
  // ⚠ `unitCount` is part of "capacity" in the data but is NOT checked here, and that is not an
  // omission: it has no form field at all (D-21, and the drop-in gate above says so at `effUnitCount`),
  // it is absent from `draftSchema`, and this action therefore cannot change it. A field this action
  // cannot write cannot be edited through this action, materially or otherwise. If a form control for it
  // is ever added, it must be added to `draftSchema`, to `patch`, AND to the capacity line below.
  const changed = <T>(incoming: T | undefined, persisted: T | null): boolean =>
    (incoming ?? persisted) !== persisted;

  const addressChanged =
    changed(d.addressLine1, owned.addressLine1) ||
    changed(d.addressLine2, owned.addressLine2) ||
    changed(d.city, owned.city) ||
    changed(d.region, owned.region) ||
    changed(d.postalCode, owned.postalCode) ||
    changed(d.country, owned.country) ||
    changed(d.neighborhood, owned.neighborhood) ||
    // The coordinates, under the SAME both-or-neither condition the patch below writes them (a save
    // carrying only one of the pair writes nothing, so it changes nothing). AXIS ORDER, Pitfall 1:
    // x = longitude, y = latitude — read in that order here so this comparison and that write cannot
    // disagree. A listing that had no point and now has one is a change, which `?.` gives for free.
    (typeof d.lat === "number" &&
      typeof d.lng === "number" &&
      (d.lng !== owned.location?.x || d.lat !== owned.location?.y));

  const spaceTypeChanged = changed(d.primarySpaceType, owned.primarySpaceType);

  const capacityChanged = changed(d.maxOccupancy, owned.maxOccupancy);

  // The pax terms are in the price set because they change what a BOOKER PAYS: `extraHeadFee` is
  // charged per head above `included`, so moving either moves the quote for the same group size just as
  // surely as moving the hourly rate does. `quoteGroup`/`paxSurcharge` read all four.
  const priceChanged =
    changed(d.hourlyRateCents, owned.hourlyRateCents) ||
    changed(d.dayRateCents, owned.dayRateCents) ||
    changed(d.perHeadPriceCents, owned.perHeadPriceCents) ||
    changed(d.extraHeadFee, owned.extraHeadFee) ||
    changed(d.included, owned.included);

  // THE WORDS. Title and description ARE here, as of D-231's promotion on 2026-09-01 (Phase 18.1, plan
  // `18.1-03`). They were deliberately outside the set until then — a recorded gap, not an oversight,
  // carried as a live deferred item — and the PM closed it for the reason the deferred entry itself
  // gave: a fake listing lies in its words as much as in its fields, and rewriting an approved
  // listing's prose into a different space is the approve-then-swap this block exists to catch.
  //
  // ⚠ THE ACCEPTED COST, STATED SO NOBODY SOFTENS IT: the flip below sets `review_state = 'pending'`
  // and `deriveBookable` requires `approved | grandfathered`, so A TYPO FIX IN A DESCRIPTION TAKES THE
  // LISTING OFF THE MARKET until ops re-approves it. That was ruled acceptable over a "material but
  // still sellable" variant, which would need a state the sell-gate does not have. Do not add a
  // length threshold, a diff-size heuristic or a "trivial edit" escape here — each is that rejected
  // variant wearing a smaller hat, and none of them is a decision this code path gets to make.
  //
  // Unlike photos, this site CAN see both fields: they are in `draftSchema` and they are written to
  // `patch` below, so there is no second detection site for them. `MATERIAL_FIELDS` in `re-review.ts`
  // restates the same seven beside the same note.
  const titleChanged = changed(d.title, owned.title);

  const descriptionChanged = changed(d.description, owned.description);

  const materialEdit =
    addressChanged ||
    spaceTypeChanged ||
    capacityChanged ||
    priceChanged ||
    titleChanged ||
    descriptionChanged;

  // Build the editable-field patch. status / hostId / publishedAt are NOT here — they can never be
  // set via autosave (they aren't in draftSchema, and Zod strips any smuggled keys). updatedAt is
  // always set so the SET clause is never empty on a sparse save.
  //
  // The review state is NOT here either, and must never be: it is not a `draftSchema` field, so Zod
  // strips any smuggled key, and it is written ONLY server-side through `markForReReview` below. Adding
  // it to this object would put the one column that decides whether a listing is sellable on the same
  // footing as its title.
  const patch: Partial<InferInsertModel<typeof listing>> = {
    title: d.title,
    description: d.description,
    primarySpaceType: d.primarySpaceType,
    addressLine1: d.addressLine1,
    addressLine2: d.addressLine2,
    city: d.city,
    region: d.region,
    postalCode: d.postalCode,
    country: d.country,
    neighborhood: d.neighborhood,
    maxOccupancy: d.maxOccupancy,
    hourlyRateCents: d.hourlyRateCents,
    dayRateCents: d.dayRateCents,
    bookingMode: d.bookingMode,
    // D-67: the listing's CURRENT tier. Editing it is forward-only by construction — every booking
    // snapshots the tier at creation (booking.cancellation_policy), so a retier here can never rewrite
    // the refund terms of a booking already made. Nothing on this path touches a booking row.
    cancellationPolicy: d.cancellationPolicy,
    // D-108 group pricing. Same forward-only semantics as the tier above: every booking freezes its own
    // price at hold time (booking.space_price_cents), so editing the fee here can never reprice a booking
    // already made. `undefined` (a step that doesn't carry them) leaves the columns untouched.
    included: d.included,
    extraHeadFee: d.extraHeadFee,
    // D-123 open-capacity price per person. Same forward-only semantics as the fields above: every booking
    // freezes its own price at hold time (booking.space_price_cents, quoteOpenCapacity), so editing this
    // can never reprice a booking already made.
    perHeadPriceCents: d.perHeadPriceCents,
    // D-109/D-123: the host now genuinely chooses this — Phase 9 adds both the second enum member
    // (`open_capacity`) and the wizard's occupancy step, retiring the "there is NO wizard control, so a
    // crafted client can only write the default" note that stood here. What still holds: Zod pins the value
    // to the two-member enum, and the OC-17 lock above refuses a CHANGE while any booking is still ahead.
    occupancyMode: d.occupancyMode,
    showExactAddress: d.showExactAddress,
    updatedAt: new Date(),
  };
  // AXIS ORDER (Pitfall 1): x = longitude, y = latitude. Only write when BOTH are present.
  if (typeof d.lat === "number" && typeof d.lng === "number") {
    patch.location = { x: d.lng, y: d.lat };
  }

  await db.transaction(async (tx) => {
    // Re-scope the write to (id AND hostId) — defense in depth on top of assertOwnership.
    await tx
      .update(listing)
      .set(patch)
      .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));

    // ⚠ INSIDE THE TRANSACTION, NOT AFTER IT (LVER-03, T-18-0604). `tx` is passed, not `db`, so the
    // field write and the re-review flip commit or roll back TOGETHER. A listing whose address
    // committed but whose review state did not is a sellable fake — an approved-looking row describing
    // a different space — and that is exactly what a flip placed after this block would produce every
    // time the process died between the two. The helper is guarded in its own WHERE, so a listing in
    // any other state is a 0-row no-op here rather than a branch this call site has to know about.
    if (materialEdit) {
      await markForReReview(tx, listingId, "listing_fields");
    }

    // Amenities / activity tags: when the array is provided, REPLACE the set atomically (no stale
    // rows leak across saves). An empty array clears them; undefined leaves them untouched.
    if (d.amenities !== undefined) {
      await tx.delete(listingAmenity).where(eq(listingAmenity.listingId, listingId));
      if (d.amenities.length > 0) {
        await tx
          .insert(listingAmenity)
          .values(d.amenities.map((amenity) => ({ listingId, amenity })));
      }
    }
    if (d.activityTags !== undefined) {
      await tx.delete(listingActivityTag).where(eq(listingActivityTag.listingId, listingId));
      if (d.activityTags.length > 0) {
        await tx
          .insert(listingActivityTag)
          .values(d.activityTags.map((tag) => ({ listingId, tag })));
      }
    }
  });

  revalidatePath(`/host/listings/${listingId}/edit`);
  return { ok: true, id: listingId };
}

/**
 * The strict draft→publish gate (D-02), enforced ENTIRELY server-side. Publishing requires:
 *   1. publishSchema.parse(row) — all core fields + BOTH positive integer-cents rates + lat/lng (D-03/D-10)
 *   2. ≥3 photos (D-04)
 *   3. host.emailVerified === true (the Phase-1 soft gate, 01-CONTEXT D-07)
 * On any failure it returns a structured error naming exactly what's missing (drives the wizard's
 * live "finish these to publish" checklist). status is flipped to "published" ONLY here, never from
 * a client field.
 */
export async function publishListing(listingId: string): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to publish a listing." };
  }

  const row = await assertOwnership(listingId, userId);
  if (!row) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours to publish." };
  }

  // The two non-form halves of the gate: the host's verified email and the listing's photo count.
  const hostRows = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId));
  const emailVerified = hostRows[0]?.emailVerified ?? false;

  const photoRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, listingId));
  const photoCount = photoRows[0]?.count ?? 0;

  // Re-validate ALL core fields from the PERSISTED row (never trust prior client state). lat/lng are
  // read back out of the PostGIS point with the correct axis order (y=lat, x=lng).
  const parsed = publishSchema.safeParse({
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    primarySpaceType: row.primarySpaceType ?? undefined,
    addressLine1: row.addressLine1 ?? undefined,
    addressLine2: row.addressLine2 ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    postalCode: row.postalCode ?? undefined,
    country: row.country ?? undefined,
    neighborhood: row.neighborhood ?? undefined,
    lat: row.location?.y,
    lng: row.location?.x,
    maxOccupancy: row.maxOccupancy ?? undefined,
    hourlyRateCents: row.hourlyRateCents ?? undefined,
    dayRateCents: row.dayRateCents ?? undefined,
    bookingMode: row.bookingMode,
    // D-77 — read from the PERSISTED row, never from client state. The wizard's live checklist is a
    // courtesy; THIS is the gate. A stale or crafted client that never visited the tier step lands here
    // with null and is rejected.
    cancellationPolicy: row.cancellationPolicy ?? undefined,
    // D-108 — re-validated from the PERSISTED row like everything else, but OPTIONAL in publishSchema, so a
    // listing that never touched the group-pricing fields (i.e. every listing that predates Phase 8) still
    // publishes unchanged. What this DOES buy: a persisted value outside the contract (a float, a negative
    // fee) blocks publish instead of reaching the quote engine.
    included: row.included ?? undefined,
    extraHeadFee: row.extraHeadFee ?? undefined,
    occupancyMode: row.occupancyMode,
    // OPEN-01 — the open-mode half of the gate, re-validated from the PERSISTED row exactly like the rest.
    // A crafted client that skipped the wizard's occupancy/pricing steps lands here with a NULL price per
    // person and is rejected; `unitCount` is not a form field at all, so the PERSISTED value is the only
    // honest source for the single-space rule (threat T-09-20).
    perHeadPriceCents: row.perHeadPriceCents ?? undefined,
    unitCount: row.unitCount ?? undefined,
    showExactAddress: row.showExactAddress,
  });

  const fieldErrors: Record<string, string[]> = {};
  if (!parsed.success) {
    Object.assign(fieldErrors, parsed.error.flatten().fieldErrors);
  }
  // D-77: replace Zod's generic enum complaint with copy that names the choice and routes the host back
  // to the step. A host who never made a choice must be told what to choose, not that input was invalid.
  if (!row.cancellationPolicy) {
    fieldErrors.cancellationPolicy = [
      "Choose a cancellation policy — Flexible, Standard or Strict — before publishing.",
    ];
  }
  const hasMinPhotos = photoCount >= MIN_PHOTOS; // >= 3 photos (D-02/D-04)
  if (!hasMinPhotos) {
    const need = MIN_PHOTOS - photoCount;
    fieldErrors.photos = [
      `Add ${need} more photo${need === 1 ? "" : "s"} to publish (minimum ${MIN_PHOTOS}).`,
    ];
  }
  if (!emailVerified) {
    fieldErrors.emailVerified = ["Verify your email to publish."];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Almost there — finish these to publish.", fieldErrors };
  }

  // Full gate passed. status is set HERE only — the single sanctioned draft→published transition.
  await db
    .update(listing)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));

  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}/edit`);
  return { ok: true, id: listingId };
}

/**
 * Take a published listing off the market (D-05). Sets status="unlisted" — data is fully preserved
 * and the listing is re-publishable. Reversible; NOT destructive.
 */
export async function unlistListing(listingId: string): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to unlist a listing." };
  }
  const row = await assertOwnership(listingId, userId);
  if (!row) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours." };
  }
  await db
    .update(listing)
    .set({ status: "unlisted" })
    .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));

  revalidatePath("/host/listings");
  return { ok: true, id: listingId };
}

/**
 * Soft-delete a listing (Claude's discretion) — sets deletedAt so the row is retained (forward-safe
 * for when bookings FK to listings in later phases) but excluded from all normal reads.
 *
 * ── D-188: IT ALSO DESTROYS THE LISTING'S CLOUDINARY ASSETS, IMMEDIATELY AND BEST-EFFORT ─────────
 * Before this, a deleted listing's photos were billed FOREVER: the row went dark, every read
 * excluded it, and the bytes stayed on Cloudinary with nothing left in the product that could ever
 * name them. That is a permanent cost for something no one can reach.
 *
 * ⚠ THE READ HAPPENS BEFORE THE WRITE, AND THAT ORDERING IS BEHAVIOUR, NOT TIDINESS. `assertOwnership`
 * filters `isNull(listing.deletedAt)`, so anything routed through it AFTER the `deletedAt` write
 * finds nothing — the destroy loop would iterate an empty array, do nothing at all, and every test
 * of it would still be GREEN while the bill ran forever. The photo read below is scoped to
 * `listingId` and sits above the UPDATE for exactly that reason.
 *
 * ⚠ AND THE DESTROY HAPPENS AFTER THE WRITE, for the reason `avatar.ts`'s `removeAvatarAction`
 * gives: if the assets went first and the write then failed, a LIVE listing would point at bytes
 * that no longer exist — broken images on a public surface, unfixable by retrying. In this order the
 * worst case is an orphaned asset nobody references, which is the tolerated outcome, not the lie.
 *
 * ⚠ NO FAILURE CHANGES THE RESULT. A Cloudinary outage must not tell a host their delete failed when
 * the row is already gone. Both of the helper's failure shapes are handled — it RESOLVES
 * `{ result: "not found" }` for a missing id and REJECTS only on network/auth failure — and neither
 * reaches the caller.
 *
 * D-188's two consequences, recorded rather than softened:
 *   1. The `listing_photo` ROWS SURVIVE. No column, no migration, no schema change (GATE-06). Their
 *      urls become 404s the moment the assets are destroyed, which is harmless because a
 *      soft-deleted listing is excluded from every read in the product — but it is stated here
 *      rather than left for someone to discover from a broken image in a database browser.
 *   2. THERE IS NO RESTORE PATH ANYWHERE. Nothing in this codebase sets `deletedAt` back to null;
 *      there is no undelete action and no UI, and this soft delete exists for forward-safe FK
 *      integrity (see the paragraph above), not for host-facing undo. So destroying the photos costs
 *      nothing a host can reach TODAY — and whoever ever builds an undelete inherits a listing with
 *      no photos from this decision. That is the trade, made knowingly.
 *
 * There is no path that double-destroys: `removePhoto` (`listing-photo.ts`) funnels through its own
 * `assertOwnership`, which carries the same `isNull(deletedAt)` filter, so a soft-deleted listing's
 * photos can no longer be removed one at a time.
 */
export async function softDeleteListing(listingId: string): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to delete a listing." };
  }
  const row = await assertOwnership(listingId, userId);
  if (!row) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours." };
  }

  // READ FIRST — see the ⚠ in the docblock. Ownership is already proven by `assertOwnership` above,
  // so this select needs only the listing scope. After the UPDATE below it would return nothing.
  const photos = await db
    .select({ publicId: listingPhoto.publicId })
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, listingId));

  await db
    .update(listing)
    .set({ deletedAt: new Date() })
    .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));

  // …and only then the assets (D-188). Sequential on purpose: a listing holds at most the photo cap,
  // so there is nothing to gain from fanning out, and a serial loop keeps the log readable. Both
  // failure shapes are logged distinguishably — `warn` = the vendor answered and declined, `error` =
  // we never got an answer — and NEITHER changes the `{ ok: true }` below.
  for (const photo of photos) {
    try {
      const res = await destroyListingPhoto(photo.publicId);
      if (res.result !== "ok") {
        console.warn("[listing:destroy] non-ok on soft-delete — orphan tolerated (D-188)", {
          listingId,
          publicId: photo.publicId,
          result: res.result,
        });
      }
    } catch (err) {
      console.error("[listing:destroy] failed on soft-delete — orphan tolerated (D-188)", {
        listingId,
        publicId: photo.publicId,
        err,
      });
    }
  }

  revalidatePath("/host/listings");
  return { ok: true, id: listingId };
}
