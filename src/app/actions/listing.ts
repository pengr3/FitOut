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
//   - Soft-deleted rows (deletedAt IS NOT NULL) are excluded from normal reads/writes.

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql, type InferInsertModel } from "drizzle-orm";
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
 * Create an empty DRAFT owned by the signed-in user (D-01 draft-first). The wizard then autosaves
 * into it via saveListingStep. status defaults to "draft" and bookingMode to "instant" (D-62 — the
 * demand-first default flip, was "request" under D-04). This create-code default is independent of
 * (and mirrors) the DB SET DEFAULT flipped in 06-01's migration; existing listings are unaffected.
 */
export async function createDraftListing(): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to create a listing." };
  }
  const id = randomUUID();
  await db.insert(listing).values({
    id,
    hostId: userId,
    status: "draft",
    bookingMode: "instant",
  });
  return { ok: true, id };
}

/**
 * Autosave one wizard step (D-01). Re-validates with the shared draftSchema (never trusts the client),
 * writes ONLY the editable draft fields to the OWNER's row (never status/hostId/publishedAt), maps
 * lat/lng → PostGIS point {x:lng, y:lat} (Pitfall 1), and replaces the amenity/activity-tag join rows
 * when those arrays are provided. Idempotent partial save — undefined fields are left untouched.
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
