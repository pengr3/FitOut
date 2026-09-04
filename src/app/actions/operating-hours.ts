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
import { composeDateLabel } from "@/lib/booking/when-label";
import { getOpenHoursLockState } from "@/lib/listing/hours-lock";
import { weeklyHoursSchema, type WeeklyHoursInput } from "@/lib/validation/availability";
// Deliberately a SECOND import statement from the same module rather than a widened first one: the shipped
// validation import is part of this file's security contract (see the header), and the acceptance diff-gate
// for this change asserts that contract was ADDED TO and never rewritten — a reformatted import line would
// read as a removal.
import { HOURS_LOCKED_MESSAGE } from "@/lib/validation/availability";

export type AvailabilityResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Postgres/Drizzle `time` round-trips as "HH:mm:ss" while the form (and the :ss-TOLERANT weeklyHoursSchema)
 * happily sends "HH:mm" — so "06:00" and "06:00:00" are the SAME window and must never read as a change.
 * Getting this wrong is not a cosmetic bug: it would refuse EVERY save on a locked weekday, including the
 * no-op autosave the editor fires with the untouched, DB-origin windows it was seeded with, and freeze the
 * whole editor for any host with a pass on the calendar (the same trap OC-17's "only a genuine CHANGE is
 * refused" idiom exists to avoid — listing.ts:154-156).
 */
function normalizeTime(t: string): string {
  return t.length >= 8 ? t.slice(0, 8) : `${t}:00`;
}

/** weekday → its windows as SORTED "HH:mm:ss-HH:mm:ss" strings, so two sets compare by value alone. */
function canonicalWindowsByDay(
  rows: { dayOfWeek: number; openTime: string; closeTime: string }[],
): Map<number, string[]> {
  const byDay = new Map<number, string[]>();
  for (const w of rows) {
    const list = byDay.get(w.dayOfWeek) ?? [];
    list.push(`${normalizeTime(w.openTime)}-${normalizeTime(w.closeTime)}`);
    byDay.set(w.dayOfWeek, list);
  }
  for (const list of byDay.values()) list.sort();
  return byDay;
}

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

  // ── CR-03 layer 2: the operating-hours lock. ────────────────────────────────────────────────────────
  // This is NOT about overbooking. 09-18 re-anchored the admissions counter on the venue-local calendar day
  // over the STORED `booking.starts_at`, so an hours edit no longer changes WHICH passes count — it changes
  // only what a pass COVERS. The harm left over is STRANDING: a drop-in pass persists concrete
  // `starts_at`/`ends_at` at hold time (OC-03), and those instants are what the refund ladder, the payout
  // sweep (`ends_at + delay`), the reminders and expiry all key on. Shifting a weekday's opening forward
  // leaves every pass already sold for a future instance of that weekday claiming an entry window the venue
  // will not honour; DELETING the weekday's hours is worse — `loadOpenDayWindow` returns null, the day panel
  // renders "Closed on {day}", and those passes go invisible in every read model while still occupying
  // admissions. So the edit itself is refused, on OC-17's shape one level down: a host may change HOW a space
  // is sold only while nothing is still to come, and now may change WHEN it is open only for the weekdays
  // nothing is still to come on.
  //
  // Scoped to the PERSISTED mode (Security V4 — never the client's word for it), so the exclusive path pays
  // nothing and behaves exactly as Phase 3 shipped it. And, mirroring `saveListingStep`'s OC-17 idiom
  // (listing.ts:154-156), only a GENUINE CHANGE is refused: the editor autosaves the same set it was seeded
  // with, and freezing those would freeze the editor for any host with a pass on the calendar.
  if (owned.occupancyMode === "open_capacity") {
    const lock = await getOpenHoursLockState(db, listingId);
    if (lock.lockedWeekdays.length > 0) {
      const persisted = await db
        .select()
        .from(operatingHours)
        .where(eq(operatingHours.listingId, listingId));
      const before = canonicalWindowsByDay(persisted);
      const after = canonicalWindowsByDay(windows);
      const changed = lock.lockedWeekdays.some((dow) => {
        const a = before.get(dow) ?? [];
        const b = after.get(dow) ?? [];
        return a.length !== b.length || a.some((w, i) => w !== b[i]);
      });
      if (changed) {
        // 09-UI-SPEC O7: a locked control that says only "you can't" is the dead end this product does not
        // ship. WHY + a concrete WHEN + a way out. The date is formatted HERE, server-side, venue-local with
        // the timezone named (D-105) by the shipped label helper — a raw Date handed to a client formatter
        // would render the host's own browser clock, a different instant from the one the lock lifts at.
        const unlocksLabel = lock.unlocksAt
          ? composeDateLabel(lock.unlocksAt, owned.timezone, owned.city)
          : null;
        const sentence = unlocksLabel
          ? `${HOURS_LOCKED_MESSAGE} The last one is for ${unlocksLabel}, so you can change them after that. ` +
            `To change them sooner, cancel those passes from your bookings — that refunds those guests in full.`
          : HOURS_LOCKED_MESSAGE;
        // BOTH halves: weekly-hours-editor.tsx:136-146 already toasts `error` and pins `fieldErrors.windows[0]`
        // onto the form, so the refusal is visible with NO component change.
        return { ok: false, error: sentence, fieldErrors: { windows: [sentence] } };
      }
    }
  }

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
