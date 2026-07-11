"use server";

// Close-only availability block server actions (AVAIL-02 · D-24). Backend for the Plan-04 host editor.
//
// SECURITY CONTRACT (mirrors listing.ts / operating-hours.ts):
//   - SESSION: requires an authenticated session — early return otherwise.
//   - OWNERSHIP (T-03-IDOR-HOURS / T-03-BLOCK-UNBLOCK): assertOwnership(listingId, userId) runs BEFORE
//     any write, and removeBlock's DELETE is re-scoped to (blockId AND listingId owned by user) so a
//     non-owner can never add to or unblock someone else's listing. The (host) route group is NOT
//     sufficient alone (RESEARCH Security V4).
//   - VALIDATION (T-03-VALIDATE): blockSchema.safeParse re-runs server-side (whole-day vs partial-range,
//     end>start, unit>=1 or null) → fieldErrors on failure. The client is never trusted (Security V5).
//   - TZ (T-03-TZNAIVE): block start/end are stored as timestamptz (UTC), derived from the venue-local
//     date via TZDate (the listing's IANA timezone) — never naive/local timestamps (CLAUDE.md). Whole
//     day = venue-local 00:00 → next-day 00:00.
//
// Blocks are close-only/subtractive (D-24): "add" inserts a row the read model subtracts; "unblock"
// deletes the row. There is NO positive-override path. Block-vs-booking is NOT enforced at the DB here
// (RESEARCH Q1 — booking-vs-booking is the money-critical DB invariant; the Phase-4 insert tx guards
// block-vs-booking). unit NULL = whole listing; else a single unit.

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { TZDate } from "@date-fns/tz";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing, availabilityBlock } from "@/lib/db/schema";
import { blockSchema, type BlockInput } from "@/lib/validation/availability";

export type AvailabilityResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Resolve the signed-in user's id, or null if there is no session (cloned from listing.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * IDOR guard: load a non-deleted listing and return it ONLY if it belongs to `userId`, else null
 * (cloned from listing.ts). Returns the row so callers can read listing.timezone.
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

/** "YYYY-MM-DD" → { y, m0 (0-based), d }. Assumes the schema-validated shape. */
function parseDate(date: string): { y: number; m0: number; d: number } {
  const [y, m, d] = date.split("-").map((p) => parseInt(p, 10));
  return { y, m0: m - 1, d };
}

/** "HH:mm" / "HH:mm:ss" → { h, min }. Assumes a schema-validated 24h string. */
function parseTime(t: string): { h: number; min: number } {
  const [h, min] = t.split(":").map((p) => parseInt(p, 10));
  return { h, min };
}

/**
 * Venue-local wall clock → the true UTC instant. Build with TZDate (DST-correct for every IANA zone)
 * then normalize through the epoch — TZDate.toISOString() renders the offset-local form, so we take the
 * epoch and wrap a plain Date for the drizzle timestamptz insert (03-02 finding).
 */
function venueLocalToUtc(y: number, m0: number, d: number, h: number, min: number, tz: string): Date {
  return new Date(new TZDate(y, m0, d, h, min, 0, tz).getTime());
}

/**
 * Add a close-only block (D-24). Converts the venue-local date (+ start/end, or 00:00→next-day 00:00
 * for a whole day) to UTC timestamptz via the listing's timezone, then inserts one subtractive row.
 */
export async function addBlock(
  listingId: string,
  input: BlockInput,
): Promise<AvailabilityResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to block time." };
  }

  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours to edit." };
  }

  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the block and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const b = parsed.data;
  const tz = owned.timezone;
  const { y, m0, d } = parseDate(b.date);

  let startsAt: Date;
  let endsAt: Date;
  if (b.wholeDay) {
    // Venue-local 00:00 today → 00:00 next day (day+1 rolls month/year over via Date math).
    startsAt = venueLocalToUtc(y, m0, d, 0, 0, tz);
    endsAt = venueLocalToUtc(y, m0, d + 1, 0, 0, tz);
  } else {
    // superRefine guarantees both times exist when !wholeDay; keep a defensive fallback for the types.
    const s = parseTime(b.startTime ?? "00:00");
    const e = parseTime(b.endTime ?? "00:00");
    startsAt = venueLocalToUtc(y, m0, d, s.h, s.min, tz);
    endsAt = venueLocalToUtc(y, m0, d, e.h, e.min, tz);
  }

  const id = randomUUID();
  await db.insert(availabilityBlock).values({
    id,
    listingId,
    unit: b.unit, // null = whole listing; else one unit (D-24)
    startsAt,
    endsAt,
    reason: b.reason ?? null,
  });

  revalidatePath(`/host/listings/${listingId}/availability`);
  revalidatePath(`/listings/${listingId}`);
  return { ok: true, id };
}

/**
 * Remove (unblock) a block (D-24 — reversible/neutral, not destructive). The DELETE is scoped to
 * (blockId AND listingId) behind assertOwnership so a non-owner cannot unblock someone's listing.
 */
export async function removeBlock(
  listingId: string,
  blockId: string,
): Promise<AvailabilityResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to unblock time." };
  }

  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours to edit." };
  }

  await db
    .delete(availabilityBlock)
    .where(and(eq(availabilityBlock.id, blockId), eq(availabilityBlock.listingId, listingId)));

  revalidatePath(`/host/listings/${listingId}/availability`);
  revalidatePath(`/listings/${listingId}`);
  return { ok: true, id: blockId };
}
