// Hold expiry — the D-48 lazy-read + sweep-on-write PAIR, proven end-to-end (BOOK-02).
//
// Integration test (isolated schema), mirroring tests/availability/read-model.test.ts conventions. It
// proves why BOTH halves of D-48 are required — neither alone is sufficient (RESEARCH Pattern 3):
//   - LAZY READS keep the UI honest: a pending hold past its expires_at reads as FREE in getAvailability.
//   - SWEEP-ON-WRITE keeps the write path from failing against a slot the UI showed free: the
//     booking_no_overlap EXCLUDE constraint has NO time awareness, so a stale-but-not-yet-cancelled
//     pending row would still 23P01 an insert. createPendingHold flips it to 'cancelled' in the SAME tx
//     before inserting, so the constraint sees the freed slot.
// The inverse guards the guarantee: a LIVE (future-expiry) hold still occupies the slot AND blocks a new
// overlapping hold by someone else — mapped to the clean "just taken", never a double-book.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THREE MUTATIONS, ALL EXECUTED 2026-08-05 (quick task 260805-nb7, closing DEF-IR9-01). The date fix
// below had to be proven NOT to hollow the file out — a test that passes because it stopped asserting is
// a false green, and this file guards the money path. Each mutation broke ONE production behaviour, was
// observed RED on the EXACT case that behaviour belongs to, and was then restored by editing the file
// back (`git diff --exit-code src/` clean before this file shipped). Verbatim output:
//
//   MUTATION A — src/lib/availability/units.ts: neuter createPendingHold's in-tx stale-hold sweep
//     (step (2)'s UPDATE gated to `AND false`, so no expired hold is ever flipped out of the way)
//     → case 1 (b) RED: `AssertionError: expected false to be true // Object.is equality`
//       at `expect("ok" in res && res.ok).toBe(true)` — i.e. the new hold was refused "just taken"
//       against a slot the read model had, one line earlier, correctly called FREE. THE EXACT
//       lazy-reads-alone-are-not-enough failure this file exists to name.
//
//   MUTATION B — src/lib/availability/read-model.ts: delete the D-48a lazy-expiry treatment from the
//     occupying predicate (`AND expires_at > now()` removed, so a lapsed hold keeps occupying)
//     → case 1 (a) RED: `AssertionError: expected 'unavailable' to be 'available'`
//       — a dead hold blanking a bookable hour off the calendar forever; no background worker exists
//       to free it, which is why the lazy read IS the release.
//
//   MUTATION C — src/lib/availability/units.ts: widen the SAME sweep to ignore expiry
//     (`AND expires_at <= now()` removed, so it flips LIVE holds out too)
//     → case 2 RED: `AssertionError: expected false to be true // Object.is equality`
//       at `expect("error" in res).toBe(true)` — a stranger's createPendingHold CANCELLED a live hold
//       and took the slot. The double-book itself, named: this is why case 2's inverse must exist.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TZDate } from "@date-fns/tz";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, operatingHours, booking } from "@/lib/db/schema";
import { getAvailability } from "@/lib/availability/read-model";
import { createPendingHold } from "@/lib/availability/units";
import { BOOKING_HORIZON_DAYS } from "@/lib/availability/slots";
import { MIN_LEAD_INSTANT_MINUTES, MIN_LEAD_REQUEST_HOURS } from "@/lib/payments/config";

let testDb: TestDb;

// ── WHY EVERY DATE BELOW IS COMPUTED AND NOT PINNED (DEF-IR9-01 — do NOT "simplify" this back) ───────
// This file used to carry THREE independent calendar literals: an injected `NOW` (2026-07-15), a target
// `DAY` (Aug 3 2026), and the slot's UTC instants ("2026-08-02T22:00Z"). They rotted on 2026-08-03 and
// left the suite red, because the two clocks in play are NOT the same clock:
//   - `NOW` is a JS value and reaches getAvailability ONLY — it drives the past/horizon/too_soon DISPLAY
//     states and nothing else.
//   - createPendingHold takes NO clock. Its D-96 lead-time guard is a SQL expression evaluated against
//     POSTGRES's now() (units.ts documents this as deliberate: "never the JS clock"), so it moves with
//     real time whatever the test injects.
// So the moment real time passed Aug 3 2026 the guard began refusing the fixture window and the "just
// taken" case started asserting against "That start time is too soon to book." instead. A pinned literal
// is a time bomb here BY CONSTRUCTION — the JS clock can be frozen, the DB clock cannot.
//
// The fix: pick the target Monday RELATIVE TO REAL NOW, then DERIVE the day parts and both UTC instants
// from that one value, so the three can never disagree again. Instants are built with TZDate from the
// venue-local wall clock — the src/lib/availability/slots.ts idiom. NEVER hand-roll a "+8" offset: Manila
// is UTC+8 with no DST today, but a hardcoded offset is the same class of rot as a hardcoded date.
const TZ = "Asia/Manila";
const MONDAY = 1; // operating_hours.dayOfWeek / JS Date.getDay — the weekday makeListing() seeds hours on

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

/** An instant's VENUE-LOCAL calendar date (read-model.ts venueLocalDateParts idiom). */
function venueDateOf(instant: Date): LocalDate {
  const z = new TZDate(instant.getTime(), TZ);
  return { year: z.getFullYear(), month: z.getMonth() + 1, day: z.getDate() };
}
/** Venue-local `hour`:00 on a venue-local date → the TRUE UTC instant (slotsForWindow's exact idiom:
 *  TZDate for the DST-correct mapping, then normalize through the epoch so it renders as "…Z"). */
function instantAt(d: LocalDate, hour: number): Date {
  return new Date(new TZDate(d.year, d.month - 1, d.day, hour, 0, 0, TZ).getTime());
}
/** Venue-local day-of-week (slots.ts venueDayOfWeek idiom; noon avoids midnight-boundary ambiguity). */
function venueDow(d: LocalDate): number {
  return new TZDate(d.year, d.month - 1, d.day, 12, 0, 0, TZ).getDay();
}
/** `n` venue-local days later; the TZDate constructor rolls month/year over via Date math. */
function plusDays(d: LocalDate, n: number): LocalDate {
  const z = new TZDate(d.year, d.month - 1, d.day + n, 12, 0, 0, TZ);
  return { year: z.getFullYear(), month: z.getMonth() + 1, day: z.getDate() };
}

// The next STRICTLY-FUTURE Monday in the VENUE's own calendar (1..7 days out — `|| 7` is what makes it
// never "today", so a run ON a Monday can't land on a 06:00 slot that has already passed).
const DAY: LocalDate = (() => {
  const today = venueDateOf(new Date());
  return plusDays(today, ((MONDAY - venueDow(today) + 7) % 7) || 7);
})();
// The 06:00-07:00 venue-local slot on THAT Monday, derived from DAY — one source, three consistent values.
const S = instantAt(DAY, 6);
const E = instantAt(DAY, 7);
const SLOT_0600_START = S.toISOString();
// The injected read-model clock is REAL now, because DAY is derived from real now: the display states and
// the SQL guards now reason about the same era, which is precisely what the pinned literals broke.
const NOW = new Date();

const HOST = "he_host";
const BOOKER = "he_booker";
const OTHER = "he_booker_other";
const HOURLY = 5000;
const DAYRATE = 30000;

async function makeListing(id: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount: 1,
    timezone: TZ, // the SAME zone the slot instants above were derived in — one source, never two

    hourlyRateCents: HOURLY,
    dayRateCents: DAYRATE,
  });
  await testDb.db.insert(operatingHours).values({
    id: `oh_${id}`,
    listingId: id,
    dayOfWeek: 1, // Monday
    openTime: "06:00:00",
    closeTime: "09:00:00",
  });
}

beforeAll(async () => {
  // ── FIXTURE SELF-CHECK — assert the derivation, don't assume it (the other half of the DEF-IR9-01 fix).
  // A derived fixture that silently derives the WRONG day is no better than a rotted literal, so the three
  // properties the two cases depend on are checked here, where a break is a loud suite failure rather than
  // a confusing assertion about "just taken" three cases later.
  expect(venueDow(DAY)).toBe(MONDAY); // makeListing seeds operating hours on dayOfWeek 1 ONLY
  const leadMs = Date.now() + Math.max(MIN_LEAD_INSTANT_MINUTES * 60_000, MIN_LEAD_REQUEST_HOURS * 3_600_000);
  expect(S.getTime()).toBeGreaterThan(leadMs); // clears BOTH D-96 lead-time guards (SQL now(), not NOW)
  expect(S.getTime()).toBeLessThan(Date.now() + BOOKING_HORIZON_DAYS * 86_400_000); // D-26 horizon
  expect(E.getTime() - S.getTime()).toBe(3_600_000); // one on-the-hour slot (D-22)

  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "HE Host", email: "he_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "HE Booker", email: "he_booker@example.com", firstName: "Booker", emailVerified: true },
    { id: OTHER, name: "HE Other", email: "he_booker_other@example.com", firstName: "Other", emailVerified: true },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("hold expiry — lazy reads + sweep-on-write (D-48)", () => {
  it("a stale pending hold reads FREE (lazy) AND a new hold on it succeeds (sweep frees the slot)", async () => {
    await makeListing("L_stale");
    // A pending hold whose expiry already passed vs the DB clock (SQL now()), covering the 06:00 slot.
    const pastExpiry = new Date(Date.now() - 60 * 60 * 1000);
    await testDb.db.insert(booking).values({
      id: "stale_hold",
      listingId: "L_stale",
      unit: 1,
      bookerId: BOOKER,
      startsAt: S,
      endsAt: E,
      status: "pending",
      expiresAt: pastExpiry,
    });

    // (a) LAZY READ: the read model reports the slot FREE despite the (stale) pending row.
    const avail = await getAvailability(testDb.db, "L_stale", DAY, NOW);
    const slot = avail.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot.state).toBe("available");
    expect(slot.freeUnits).toBe(1);

    // (b) SWEEP-ON-WRITE: a new hold on the SAME window succeeds — the sweep flips the stale hold to
    // cancelled in the SAME tx so the EXCLUDE constraint sees the freed slot (lazy reads alone can't).
    const res = await createPendingHold(testDb.db, {
      listingId: "L_stale",
      bookerId: OTHER,
      startsAt: S,
      endsAt: E,
    });
    expect("ok" in res && res.ok).toBe(true);

    // The stale row is now cancelled; exactly the fresh pending hold occupies unit 1.
    const staleRows = await testDb.client`SELECT status FROM booking WHERE id = 'stale_hold'`;
    expect(staleRows[0].status).toBe("cancelled");
    const [{ n }] = await testDb.client`
      SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_stale' AND status = 'pending'`;
    expect(n).toBe(1);
  });

  it("a LIVE (future-expiry) pending hold still occupies the slot AND blocks a new overlapping hold", async () => {
    await makeListing("L_live");
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await testDb.db.insert(booking).values({
      id: "live_hold",
      listingId: "L_live",
      unit: 1,
      bookerId: BOOKER,
      startsAt: S,
      endsAt: E,
      status: "pending",
      expiresAt: futureExpiry,
    });

    // Lazy read: the slot is (correctly) occupied by the live hold.
    const avail = await getAvailability(testDb.db, "L_live", DAY, NOW);
    const slot = avail.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot.state).toBe("unavailable");
    expect(slot.freeUnits).toBe(0);

    // A DIFFERENT booker cannot hold the still-live slot — it maps to the clean "just taken" (not a
    // replay: that would only happen for the hold's OWN booker, the D-42 own-hold path).
    const res = await createPendingHold(testDb.db, {
      listingId: "L_live",
      bookerId: OTHER,
      startsAt: S,
      endsAt: E,
    });
    expect("error" in res).toBe(true);
    if ("error" in res) expect(res.error).toMatch(/just taken/i);

    // Still exactly one pending hold (the live one) — the sweep did NOT touch it; no double-book.
    const [{ n }] = await testDb.client`
      SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_live' AND status = 'pending'`;
    expect(n).toBe(1);
  });
});
