"use server";

// Weekly operating-hours server action (AVAIL-01 · D-25). Backend for the Plan-04 host editor.
//
// SECURITY CONTRACT (mirrors listing.ts — the Phase-1/2 input:false discipline):
//   - SESSION: requires an authenticated session (auth.api.getSession) — early return otherwise.
//   - OWNERSHIP (T-03-IDOR-HOURS): assertOwnership(listingId, userId) — listing.hostId === session
//     user id — runs BEFORE any write, and the writes are re-scoped inside a transaction on the OWNER's
//     listingId. The (host) route group is NOT sufficient alone: an authenticated host could POST a
//     listingId they don't own, so ownership is re-checked here (RESEARCH Security V4).
//   - VALIDATION (T-03-VALIDATE): the client is NEVER trusted for times — weeklyHoursSchema.safeParse
//     re-runs server-side (close>open, no same-day overlap, on-the-hour, :ss-tolerant) → fieldErrors
//     on failure (RESEARCH Security V5).
//   - Times are stored as Postgres `time` (venue-local wall clock) — the read model combines them with a
//     concrete date via TZDate to get a UTC instant. Hours are listing-wide (all units share, D-25).

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing, operatingHours } from "@/lib/db/schema";
import { weeklyHoursSchema, type WeeklyHoursInput } from "@/lib/validation/availability";

export type AvailabilityResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Resolve the signed-in user's id, or null if there is no session (cloned from listing.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * IDOR guard: load a non-deleted listing and return it ONLY if it belongs to `userId`, else null.
 * Every mutating action funnels through this before touching a row (cloned from listing.ts).
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
 * Save the listing's FULL weekly operating hours (D-25 multiple windows/day). "Replace the set":
 * inside ONE transaction, delete every existing window for the listing then insert the parsed set —
 * so the editor is a full-state save (no stale windows leak, and clearing all windows = closed).
 */
export async function saveOperatingHours(
  listingId: string,
  input: WeeklyHoursInput,
): Promise<AvailabilityResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to edit hours." };
  }

  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours to edit." };
  }

  // Never trust the client — re-validate with the SAME schema the host editor form uses.
  const parsed = weeklyHoursSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the hours and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { windows } = parsed.data;

  await db.transaction(async (tx) => {
    // Replace the set: clear all existing windows for THIS listing, then insert the new set.
    await tx.delete(operatingHours).where(eq(operatingHours.listingId, listingId));
    if (windows.length > 0) {
      await tx.insert(operatingHours).values(
        windows.map((w) => ({
          id: randomUUID(),
          listingId,
          dayOfWeek: w.dayOfWeek,
          openTime: w.openTime,
          closeTime: w.closeTime,
        })),
      );
    }
  });

  // Host editor + public calendar both reflect the new hours.
  revalidatePath(`/host/listings/${listingId}/availability`);
  revalidatePath(`/listings/${listingId}`);
  return { ok: true, id: listingId };
}
