// D-94/D-96 expiry-cap correctness (07-05) — the integration proof that NO HOLD EVER OUTLIVES ITS OWN
// SESSION and that the DATABASE CLOCK is the sole expiry authority.
//
// A hold that outlives its session is, in effect, a slot sold twice: the calendar keeps showing it held
// while the session it holds is already running or over. Before this plan BOTH hold-write sites were
// uncapped, and the higher-traffic instant path additionally computed its expiry from the JS clock
// (`Date.now()`), which is skewed relative to the very rows it is compared against.
//
// What is proven here, against a real Postgres on an isolated schema:
//   boundary matrix   — for starts_at at 0 / 1 / 2 / 4 / 25 hours out, in BOTH modes, expires_at is
//                       EXACTLY LEAST(now() + window, starts_at); at the near boundaries the mode's
//                       lead-time guard refuses instead, with its specific copy (never a throw).
//   JS-clock skew     — Date.now() is monkey-patched one hour into the future for the duration of one
//                       createPendingHold call; the PERSISTED expires_at is unaffected, because it is
//                       computed by Postgres. This is the direct proof of D-94 (T-07-23).
//   D-96 split        — a request 4h out yields a 2h host SLA, leaving ~2h for the booker — NOT a 3h59m
//                       SLA and a one-minute booker window.
//   D-96 floor        — the SLA never falls below MIN_APPROVE_WINDOW_HOURS, asserted across the whole
//                       matrix and exactly at the binding boundary.
//   mode-scoped guard — a request 1h out is refused while an INSTANT hold 1h out is accepted; an instant
//                       hold 10 minutes out is refused. Submitted straight to the server, bypassing the
//                       SlotPicker entirely (T-07-22 — the disabled chips are a courtesy, never the gate).
//
// Clock discipline in the assertions: every window is derived from a `SELECT now()` reading, NOT from the
// JS clock, and every expectation is compared against that same reading. Otherwise a Docker/host clock
// skew of a few seconds would make the D-96 half-the-time-to-start arithmetic look wrong when it is right.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import { createPendingHold, HOLD_TTL_MINUTES } from "@/lib/availability/units";
import {
  APPROVAL_SLA_HOURS,
  MIN_APPROVE_WINDOW_HOURS,
  MIN_LEAD_INSTANT_MINUTES,
  MIN_LEAD_REQUEST_HOURS,
} from "@/lib/payments/config";

let testDb: TestDb;

const HOST = "ec_host";
const BOOKER = "ec_booker";
const HOURLY = 5000;
const DAY_RATE = 30000;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Round-trip tolerance. The DB clock advances between the reading below and the insert's own now(). */
const TOL_MS = 5 * 1000;

/**
 * Windows are placed this far PAST the nominal offset. The lead-time guard is a strict boundary
 * (`starts_at >= now() + notice`), and `now()` advances by the round trip between the reading a window
 * is derived from and the statement that evaluates the guard. A window sitting exactly ON the boundary
 * would therefore fail by milliseconds — a property of the boundary, not a defect. This margin keeps
 * "at the boundary, permitted" cases deterministically permitted while staying far inside TOL_MS.
 */
const GUARD_EPSILON_MS = 2 * 1000;

type Mode = "instant" | "request";

/** The DB transaction clock — the ONLY clock any expiry expectation in this file is derived from. */
async function dbNow(): Promise<Date> {
  const [row] = await testDb.client<{ now: Date | string }[]>`SELECT now() AS "now"`;
  return new Date(row.now); // coerce: the driver may hand back a Date or an ISO string
}

/** A dedicated listing per case, so seeded rows never collide on the booking_no_overlap EXCLUDE. */
async function makeListing(id: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
  });
}

type HoldOutcome =
  | { placed: true; base: Date; expiresAt: Date; startsAt: Date }
  | { placed: false; base: Date; error: string };

/**
 * Place a hold whose session starts `hoursOut` hours after the DB clock, and read the PERSISTED
 * expires_at back. `base` is the DB-clock reading the window was derived from — every expectation is
 * measured from it, never from the JS clock.
 */
async function placeAt(id: string, mode: Mode, hoursOut: number): Promise<HoldOutcome> {
  await makeListing(id);
  const base = await dbNow();
  const startsAt = new Date(base.getTime() + hoursOut * HOUR + GUARD_EPSILON_MS);
  const endsAt = new Date(startsAt.getTime() + HOUR);

  const res = await createPendingHold(testDb.db, {
    listingId: id,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    holdStatus: mode === "request" ? "requested" : "pending",
    bookingMode: mode,
  });
  if ("error" in res) return { placed: false, base, error: res.error };

  // Read the row back — the persisted value is the one that decides whether the slot is held or free.
  const [row] = await testDb.db
    .select({ expiresAt: booking.expiresAt })
    .from(booking)
    .where(eq(booking.id, res.id));
  return { placed: true, base, expiresAt: row.expiresAt!, startsAt };
}

/**
 * The window each mode asks for BEFORE the session-start cap, expressed in ms from `now()`:
 *   instant — the flat hold TTL.
 *   request — the D-96 proportional split: GREATEST(floor, LEAST(SLA, half the time to start)).
 * Kept as an independent re-derivation of the spec (not a copy of the SQL) so it can genuinely disagree.
 */
function requestedWindowMs(mode: Mode, msToStart: number): number {
  if (mode === "instant") return HOLD_TTL_MINUTES * MIN;
  return Math.max(MIN_APPROVE_WINDOW_HOURS * HOUR, Math.min(APPROVAL_SLA_HOURS * HOUR, msToStart / 2));
}

/** The D-94 invariant itself: expires_at = LEAST(now() + window, starts_at). Measured from the DB clock. */
function expectedExpiryMs(mode: Mode, base: Date, startsAt: Date): number {
  const msToStart = startsAt.getTime() - base.getTime();
  return base.getTime() + Math.min(requestedWindowMs(mode, msToStart), msToStart);
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "EC Host", email: "ec_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "EC Booker", email: "ec_booker@example.com", firstName: "Booker", emailVerified: true },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

// ── 1. Boundary matrix ────────────────────────────────────────────────────────────────────────────────
describe("D-94 boundary matrix — expires_at is exactly LEAST(now() + window, starts_at) in both modes", () => {
  // 0h and 1h are inside one or both modes' notice windows; the matrix asserts the guard fires there and
  // the cap arithmetic holds everywhere else. 2h is the request mode's exact lead boundary (and therefore
  // the exact point at which the D-96 floor binds); 25h is the first case where half-the-time-to-start
  // finally exceeds nothing — the split still bites because 12.5h < the 24h SLA.
  const CASES: { hoursOut: number; instantPlaced: boolean; requestPlaced: boolean }[] = [
    { hoursOut: 0, instantPlaced: false, requestPlaced: false },
    { hoursOut: 1, instantPlaced: true, requestPlaced: false },
    { hoursOut: 2, instantPlaced: true, requestPlaced: true },
    { hoursOut: 4, instantPlaced: true, requestPlaced: true },
    { hoursOut: 25, instantPlaced: true, requestPlaced: true },
  ];

  for (const c of CASES) {
    for (const mode of ["instant", "request"] as Mode[]) {
      const shouldPlace = mode === "instant" ? c.instantPlaced : c.requestPlaced;

      it(`${mode} @ ${c.hoursOut}h out → ${shouldPlace ? "capped expiry" : "refused by the lead-time guard"}`, async () => {
        const out = await placeAt(`L_ec_${mode}_${c.hoursOut}`, mode, c.hoursOut);

        if (!shouldPlace) {
          // A refusal is a clean RESULT, never a throw — it rides the existing HoldResult error channel.
          expect(out.placed).toBe(false);
          if (out.placed) return;
          expect(out.error).toMatch(mode === "request" ? /too soon to request/i : /too soon to book/i);
          return;
        }

        expect(out.placed).toBe(true);
        if (!out.placed) return;

        const expected = expectedExpiryMs(mode, out.base, out.startsAt);
        expect(Math.abs(out.expiresAt.getTime() - expected)).toBeLessThanOrEqual(TOL_MS);

        // The one invariant, restated directly against the row: the hold NEVER outlives its session.
        expect(out.expiresAt.getTime()).toBeLessThanOrEqual(out.startsAt.getTime());

        // D-96 floor: a cap-shortened window can never collapse below the minimum approve window.
        if (mode === "request") {
          expect(out.expiresAt.getTime() - out.base.getTime()).toBeGreaterThanOrEqual(
            MIN_APPROVE_WINDOW_HOURS * HOUR - TOL_MS,
          );
        }
      });
    }
  }

  it("on the INSTANT path the cap is inert BY CONSTRUCTION today — and this is the tripwire if that changes", () => {
    // Honest accounting: with MIN_LEAD_INSTANT_MINUTES (30) > HOLD_TTL_MINUTES (15), no instant hold can
    // ever be created close enough to its session for LEAST to pick starts_at — the TTL always wins. So
    // the instant cap is a STRUCTURAL guarantee rather than a currently-exercised branch, and the cap is
    // proven to actually bite on the request path (the 2h/4h/25h rows above, whose SLA is cap-derived).
    //
    // If anyone ever lowers the instant notice below the hold TTL, the cap goes live on the higher-traffic
    // path and needs a matrix row of its own. This assertion fails first and says so.
    expect(MIN_LEAD_INSTANT_MINUTES).toBeGreaterThanOrEqual(HOLD_TTL_MINUTES);
  });
});

// ── 2. The DB clock survives JS clock skew (T-07-23) ──────────────────────────────────────────────────
describe("D-94 the database clock is the SOLE expiry authority", () => {
  it("a JS clock skewed ONE HOUR into the future does not move the persisted expires_at", async () => {
    await makeListing("L_ec_skew");
    const base = await dbNow();
    const startsAt = new Date(base.getTime() + 6 * HOUR);
    const endsAt = new Date(startsAt.getTime() + HOUR);

    const realNow = Date.now;
    let res: Awaited<ReturnType<typeof createPendingHold>>;
    try {
      // A hostile or merely misconfigured process clock. If ANY part of the expiry path still read the JS
      // clock, the hold would be minted an hour long instead of fifteen minutes — silently, with no error.
      Date.now = () => realNow() + HOUR;
      res = await createPendingHold(testDb.db, {
        listingId: "L_ec_skew",
        bookerId: BOOKER,
        startsAt,
        endsAt,
      });
    } finally {
      Date.now = realNow;
    }

    expect("error" in res).toBe(false);
    if ("error" in res) return;

    const [row] = await testDb.db
      .select({ expiresAt: booking.expiresAt })
      .from(booking)
      .where(eq(booking.id, res.id));

    // Unmoved: still the flat 15-minute TTL from the DB clock, NOT 1h15m from a skewed JS clock.
    const drift = row.expiresAt!.getTime() - (base.getTime() + HOLD_TTL_MINUTES * MIN);
    expect(Math.abs(drift)).toBeLessThanOrEqual(TOL_MS);

    // And the value handed back to the caller is the same DB-computed instant (Pitfall 8).
    expect(res.expiresAt).not.toBeNull();
    expect(res.expiresAt!.getTime()).toBe(row.expiresAt!.getTime());
  });
});

// ── 3. The D-96 proportional split ────────────────────────────────────────────────────────────────────
describe("D-96 when the session-start cap bites, the remaining time SPLITS", () => {
  it("a request 4h out gives the host a 2h SLA and leaves ~2h for the booker (not 3h59m / one minute)", async () => {
    const out = await placeAt("L_ec_split", "request", 4);
    expect(out.placed).toBe(true);
    if (!out.placed) return;

    const slaMs = out.expiresAt.getTime() - out.base.getTime();
    expect(Math.abs(slaMs - 2 * HOUR)).toBeLessThanOrEqual(TOL_MS);

    // The regression this guards: an SLA that consumes almost everything, leaving the booker no window
    // in which to actually pay. The booker's remaining share must be a real, comparable slice.
    const bookerMs = out.startsAt.getTime() - out.expiresAt.getTime();
    expect(bookerMs).toBeGreaterThanOrEqual(2 * HOUR - TOL_MS);
    expect(slaMs).toBeLessThan(3 * HOUR);
  });

  it("the split is capped by the SLA, not just by the session: a request 4 days out still gets APPROVAL_SLA_HOURS", async () => {
    // Half of 96h is 48h, which exceeds the 24h SLA — so LEAST(SLA, half) must pick the SLA.
    const out = await placeAt("L_ec_sla_cap", "request", 96);
    expect(out.placed).toBe(true);
    if (!out.placed) return;

    const slaMs = out.expiresAt.getTime() - out.base.getTime();
    expect(Math.abs(slaMs - APPROVAL_SLA_HOURS * HOUR)).toBeLessThanOrEqual(TOL_MS);
  });

  it("the floor binds exactly at the minimum request lead time: the SLA equals MIN_APPROVE_WINDOW_HOURS", async () => {
    // At MIN_LEAD_REQUEST_HOURS (2h) out, half the time to start is 1h — which IS the floor. This is the
    // shortest SLA the system can ever mint through this path, because no request may be created closer
    // in. NOTE: a sub-floor input cannot be exercised through createPendingHold at all (the lead-time
    // guard refuses first), so the floor is proven at its binding boundary rather than below it.
    const out = await placeAt("L_ec_floor", "request", MIN_LEAD_REQUEST_HOURS);
    expect(out.placed).toBe(true);
    if (!out.placed) return;

    const slaMs = out.expiresAt.getTime() - out.base.getTime();
    expect(Math.abs(slaMs - MIN_APPROVE_WINDOW_HOURS * HOUR)).toBeLessThanOrEqual(TOL_MS);
    expect(slaMs).toBeGreaterThanOrEqual(MIN_APPROVE_WINDOW_HOURS * HOUR - TOL_MS);
  });
});

// ── 4. Mode-scoped lead-time guards, enforced server-side (T-07-22) ───────────────────────────────────
describe("D-96 lead-time guards are MODE-SCOPED and enforced on the server", () => {
  it("a request 1h out is refused, but an INSTANT hold 1h out is accepted — same window, different mode", async () => {
    const req = await placeAt("L_ec_mode_req", "request", 1);
    expect(req.placed).toBe(false);
    if (!req.placed) expect(req.error).toMatch(/too soon to request/i);

    // Instant-book is ONE person and ONE checkout, so same-day booking deliberately stays available.
    const inst = await placeAt("L_ec_mode_inst", "instant", 1);
    expect(inst.placed).toBe(true);
  });

  it("an instant hold 10 minutes out is refused by the checkout-sized guard", async () => {
    const out = await placeAt("L_ec_inst_10m", "instant", 10 / 60);
    expect(out.placed).toBe(false);
    if (!out.placed) expect(out.error).toMatch(/too soon to book/i);
  });

  it("the guard is the SERVER's, not the picker's: a direct submit bypassing the UI is still refused", async () => {
    // T-07-22 — this call never touches SlotPicker. A crafted POST of a chip the picker rendered as
    // `too_soon` (and disabled) arrives here exactly like this one, and is refused identically.
    const out = await placeAt("L_ec_bypass", "request", 0.5);
    expect(out.placed).toBe(false);
    if (!out.placed) expect(out.error).toMatch(/too soon to request/i);
  });
});
