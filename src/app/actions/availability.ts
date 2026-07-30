"use server";

// Public, READ-ONLY availability action (AVAIL-03). It exists so the booker calendar can fetch a
// newly-selected day's slots on the client without a full navigation — the Server Component seeds the
// FIRST day (today, venue-tz) and every subsequent day-change calls this.
//
// SECURITY: this has NO session/ownership gate — availability of a PUBLISHED listing is public (anyone
// browsing the detail page can see it; threat T-03-ENUM: accept — the read model returns only
// free/blocked state, never PII or booker identity). It DOES re-enforce the public page's
// published + non-deleted gate (WR-01) so a leaked draft/unlisted id can't reveal a hidden schedule,
// and it validates the untrusted dayLocal at runtime (server-action arg types are NOT enforced at
// runtime — a NaN/"abc" would otherwise reach new Date(NaN).toISOString() → a 500). It is strictly a
// read; it performs NO mutation. All correctness (venue tz, the identical '[)' overlap bound, per-slot
// free-unit counts) lives in the Plan-02 read model — this is a thin server entry point around it.
//
// Phase 9 (OPEN-04) adds a SECOND public read here, getOpenMonthAvailability, under the identical posture:
// no session, the same published + non-deleted re-gate written out again, the same Zod-validated
// venue-local input, the same "empty payload, never a throw" failure mode. Both remain thin — the open
// fork's occupancy math lives in the same read model, next to the exclusive one.

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { listing } from "@/lib/db/schema";
import {
  getAvailability,
  // Aliased: the exported ACTION below carries the same name on purpose (it is the public entry point for
  // exactly this read model function, mirroring getDayAvailability → getAvailability).
  getOpenMonthAvailability as readOpenMonthAvailability,
  type DayAvailability,
  type OpenMonthAvailability,
} from "@/lib/availability/read-model";

// Runtime validation for the untrusted dayLocal arg (WR-01). A crafted { year: "abc" }/NaN must not
// reach the read model's date math (new Date(NaN).toISOString() → a 500); an invalid shape returns the
// same empty availability as an unknown listing rather than throwing.
const dayLocalSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
});

// The month twin of dayLocalSchema, for the same reason and with the same bounds — a crafted
// { year: "abc" } must not reach TZDate's month arithmetic.
const monthLocalSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

const EMPTY_MONTH: OpenMonthAvailability = { cap: 0, fullDates: [] };

const EMPTY_AVAILABILITY: DayAvailability = {
  timezone: "UTC",
  unitCount: 0,
  hasHours: false,
  // There are no slots to label, so the mode is inert here; `instant` matches the read model's own
  // unknown-listing fallback and the listing table's default, so the two can never drift apart.
  bookingMode: "instant",
  slots: [],
  // Phase-9 (OC-01), on the same reasoning as `bookingMode` directly above: `exclusive` is what the read
  // model's own unknown-listing fallback returns AND the listing table's column default, so this literal
  // and that one cannot drift. There is no date to project, so there is no open payload to carry.
  occupancyMode: "exclusive",
  openCapacity: null,
};

/**
 * Fetch a listing's availability for one venue-local calendar day. `dayLocal.month` is 1-based
 * (calendar-natural). Validates the untrusted input and re-enforces the public page's published +
 * non-deleted gate before delegating to the server-authoritative read model; a malformed input or a
 * non-published/leaked id returns empty availability rather than throwing or leaking a hidden schedule.
 */
export async function getDayAvailability(
  listingId: string,
  dayLocal: unknown,
): Promise<DayAvailability> {
  const parsed = dayLocalSchema.safeParse(dayLocal);
  if (!parsed.success) return EMPTY_AVAILABILITY;

  // Re-enforce the page's gate (listings/[id]/page.tsx notFound()s draft/unlisted/deleted): only a
  // published, non-deleted listing exposes availability. A missing/unpublished row → empty.
  const [row] = await db
    .select({ status: listing.status })
    .from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  if (!row || row.status !== "published") return EMPTY_AVAILABILITY;

  return getAvailability(db, listingId, parsed.data);
}

/**
 * The fully-booked date set for ONE venue-local month on an open-capacity listing (OPEN-04 / OC-11).
 * `monthLocal.month` is 1-based (calendar-natural). Feeds the calendar's react-day-picker `disabled`
 * matcher so a full date is PROGRAMMATICALLY disabled, never merely greyed (09-UI-SPEC § 2a, an a11y
 * non-negotiable).
 *
 * Same public-read posture as getDayAvailability — no session (an open listing's occupancy is exactly as
 * public as an exclusive listing's calendar, T-09-15 accept) — and the SAME published + non-deleted re-gate
 * repeated inline rather than shared, so neither action can lose it in a refactor of the other (WR-01).
 * Malformed input, an unknown/unpublished/deleted id, and an EXCLUSIVE listing all return the empty map
 * rather than throwing. It is strictly a read; it performs NO mutation.
 */
export async function getOpenMonthAvailability(
  listingId: string,
  monthLocal: unknown,
): Promise<OpenMonthAvailability> {
  const parsed = monthLocalSchema.safeParse(monthLocal);
  if (!parsed.success) return EMPTY_MONTH;

  // The gate is SERVER-DERIVED — the caller never gets to say which listing statuses count (threat
  // T-09-12). A leaked draft/unlisted id reveals nothing about the host's schedule.
  const [row] = await db
    .select({ status: listing.status })
    .from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  if (!row || row.status !== "published") return EMPTY_MONTH;

  return readOpenMonthAvailability(db, listingId, parsed.data);
}
