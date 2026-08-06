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
//
// MUTATION A RE-RUN 2026-08-06 (quick task 260806-gwt) — the date derivation above was LIFTED OUT into
// tests/helpers/dates.ts, and an extraction can hollow a file exactly as silently as a bad refactor. So
// A was re-executed against the refactored file and produced the SAME red, verbatim:
//   `AssertionError: expected false to be true // Object.is equality` at hold-expiry.test.ts:144
//   `expect("ok" in res && res.ok).toBe(true)`
// The lift is faithful; this file still asserts what it claims to. Restored by editing the line back.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { VENUE_TZ, venueWindow, assertBookableWindow } from "../helpers/dates";
import { user, listing, operatingHours, booking } from "@/lib/db/schema";
import { getAvailability } from "@/lib/availability/read-model";
import { createPendingHold } from "@/lib/availability/units";

let testDb: TestDb;

// ── WHY EVERY DATE BELOW IS COMPUTED AND NOT PINNED (DEF-IR9-01 — do NOT "simplify" this back) ───────
// The derivation this file introduced (venue-local date math via TZDate + the fixture self-check) now
// LIVES IN @tests/helpers/dates.ts, which carries the full two-clocks explanation: createPendingHold's
// D-96 lead guard is SQL evaluated against POSTGRES's now(), so a pinned window is a time bomb BY
// CONSTRUCTION. Quick task 260806-gwt lifted it there to sweep the five sibling Tier-1 sites; this file
// is the reference implementation and its MUTATION A below was re-run to prove the lift is faithful.
const MONDAY = 1; // operating_hours.dayOfWeek / JS Date.getDay — the weekday makeListing() seeds hours on

// The 06:00-07:00 venue-local slot on the next strictly-future Monday, derived from REAL now.
const W = venueWindow({ hour: 6, weekday: MONDAY });
const DAY = W.day;
const S = W.start;
const E = W.end;
const SLOT_0600_START = W.startUtc;
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
    timezone: VENUE_TZ, // the SAME zone the slot instants above were derived in — one source, never two

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
  // A derived fixture that silently derives the WRONG day is no better than a rotted literal, so the
  // properties the two cases depend on are checked here, where a break is a loud suite failure rather than
  // a confusing assertion about "just taken" three cases later. `weekday` is passed because makeListing
  // seeds operating hours on dayOfWeek 1 ONLY.
  assertBookableWindow(W, { weekday: MONDAY });

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
