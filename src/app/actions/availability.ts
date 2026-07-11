"use server";

// Public, READ-ONLY availability action (AVAIL-03). It exists so the booker calendar can fetch a
// newly-selected day's slots on the client without a full navigation — the Server Component seeds the
// FIRST day (today, venue-tz) and every subsequent day-change calls this.
//
// SECURITY: unlike the host hours/blocks actions this has NO session/ownership gate — availability of a
// PUBLISHED listing is public (anyone browsing the detail page can see it; threat T-03-ENUM: accept —
// the read model returns only free/blocked state, never PII or booker identity). It is strictly a read;
// it performs NO mutation. All correctness (venue tz, the identical '[)' overlap bound, per-slot
// free-unit counts) lives in the Plan-02 read model — this is a thin server entry point around it.

import { db } from "@/lib/db";
import { getAvailability, type DayAvailability } from "@/lib/availability/read-model";

/**
 * Fetch a listing's availability for one venue-local calendar day. `dayLocal.month` is 1-based
 * (calendar-natural). Delegates entirely to the server-authoritative read model.
 */
export async function getDayAvailability(
  listingId: string,
  dayLocal: { year: number; month: number; day: number },
): Promise<DayAvailability> {
  return getAvailability(db, listingId, dayLocal);
}
