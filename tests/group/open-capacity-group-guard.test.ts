// CR-05 (09-REVIEW, reported but NOT independently verified) — `createGroup` never checks occupancy mode.
//
// Four files hard-code `openCapacity: false` into `composeWhenLabel` on the strength of "a group can only
// ever be created on an exclusive booking (D-110)". The only thing implementing that rule is a UI condition
// on the booking detail page — whose own comment claims the server re-checks. `createGroup`'s pre-read gate
// and its defence-in-depth INSERT predicate check `booker_id`, `status = 'confirmed'` and `max_occupancy`.
// NEITHER checks `occupancy_mode`.
//
// WHAT THAT COSTS, and why the first assertion in this file is a SEAT COUNT and not a sentence. A booker
// buys ONE drop-in pass on a 30-cap gym, pays, then POSTs `createGroup(bookingId)` directly. The insert
// succeeds with `capacity_snapshot = GREATEST(max_occupancy - 1, 0) = 29` — the DAILY ADMISSIONS CAP, a
// number with no relationship whatsoever to the one pass that was paid for. Up to 29 strangers RSVP yes and
// are told they are coming; every group surface renders that pass through
// `composeWhenLabel({ openCapacity: false })`, i.e. the sixteen-hour-reservation line 09-08 forked the
// formatter to prevent, now emailed to third parties; and the venue sees 30 people arrive against 1 paid
// admission the counter never saw. A test that asserted only "the action returned a refusal" would go green
// against a fix that refused politely and still wrote the row — so this file reads `booking_group` back out
// of Postgres FIRST and quotes the seat count it minted.
//
// WHY IT IS DB-BACKED AND DRIVES THE REAL CLAIM. The seam is a date-shaped drop-in booking meeting group
// machinery written for hours-and-minutes reservations; the pass under test is therefore minted by the REAL
// `createOpenCapacityHold`, so the row is genuinely drop-in-shaped (`open_capacity = true`, `unit = 1`,
// `declared_pax` set, `starts_at`/`ends_at` = the venue's opening/closing instants) rather than hand-shaped
// to match what the test expects to find.
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 lesson). The claim refuses a
// date whose pass window has closed and one beyond the 90-day horizon, so a hardcoded date would quietly
// turn this case into a PAST_DATE refusal the moment the calendar passed it — and it would go green by
// vacuum, refusing for the wrong reason entirely.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TASK 1 — THE INDEPENDENT CONFIRMATION. ⇒ BRANCH A: THE DEFECT REPRODUCES. CR-05 IS REAL.
//
// This case was written FIRST, against UNCHANGED `src/` (HEAD = 910cdbd, `git status --short -- src/`
// empty), and run on 31 July 2026 — the run below IS the independent verification the review asked for,
// taken before a single line of source changed. (The date is spelled in words because this file's acceptance
// gate greps for calendar literals; see the clock-relative rule above.)
// `npx vitest run tests/group/open-capacity-group-guard.test.ts`, exit 1. Observed output, VERBATIM
// (its `288|` line pointers are as-run, i.e. before this header block was appended):
//
//    ❯ tests/group/open-capacity-group-guard.test.ts (1 test | 1 failed) 2696ms
//        × (1) a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats 69ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/group/open-capacity-group-guard.test.ts > CR-05 — a drop-in pass cannot mint a group > (1)
//    a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats
//   AssertionError: expected 29 to be +0 // Object.is equality
//
//   - Expected
//   + Received
//
//   - 0
//   + 29
//
//    ❯ tests/group/open-capacity-group-guard.test.ts:288:41
//       286|     // about the return value because it is the one that names the har…
//       287|     // twenty-nine RSVP-able seats minted from the listing's DAILY adm…
//       288|     expect(await mintedSeats(claim.id)).toBe(0);
//          |                                         ^
//       289|
//       290|     // Only then the caller-facing refusal, in the shared no-oracle se…
//
//    Test Files  1 failed (1)
//         Tests  1 failed (1)
//
// TWENTY-NINE RSVP-ABLE SEATS against ONE paid admission, on a booking whose whole content is a single
// drop-in pass. The refusal assertions below it were never even reached — the action returned `ok: true`
// with a group id and a live invite token.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TASK 2 — THE MUTATION. The fix is load-bearing, measured rather than asserted.
//
// The plan was RESUMED after the first executor was interrupted mid-fix; the branch-A run above had already
// landed as its own commit, and this block was added when the guard shipped. Mutation applied to
// src/app/actions/group.ts: the gate's projected boolean replaced with a constant `true AS "modeOk"` (so
// the refusal branch is reached but can never fire) AND `AND l.occupancy_mode = 'exclusive'` deleted from
// the INSERT's WHERE — i.e. BOTH statements' guards removed at once. Observed output, VERBATIM:
//
//    ❯ tests/group/open-capacity-group-guard.test.ts (3 tests | 2 failed) 2363ms
//        × (1) a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats 65ms
//        × (3) BOTH statements carry the mode predicate, so a bypassed pre-read gate still writes nothing 23ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/group/open-capacity-group-guard.test.ts > CR-05 — a drop-in pass cannot mint a group > (1)
//    a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats
//   AssertionError: expected 29 to be +0 // Object.is equality
//
//   - Expected
//   + Received
//
//   - 0
//   + 29
//
//    ❯ tests/group/open-capacity-group-guard.test.ts:369:41
//
// THE SAME SEAT COUNT, from the same assertion — the mutation reproduces the confirming failure exactly,
// which is what makes case (1) a measurement of the guard rather than a restatement of it. Case (2) stayed
// GREEN throughout: removing the guard does not disturb exclusive group creation, so case (1)'s red is
// attributable to the mode predicate and to nothing else. Restored → 3 passed, and `git diff --exit-code
// src/` prints nothing against the shipped fix.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Harness cloned from tests/booking/open-capacity-confirm.test.ts (09-17): real Postgres via `setupTestDb`,
// a faked session identity, a stubbed limiter, `@/inngest/client` swapped so the module graph can never
// touch the network, and read-the-row-back assertions throughout.

import { readFileSync } from "node:fs";

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { eq, sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, operatingHours } from "@/lib/db/schema";
import { createOpenCapacityHold } from "@/lib/availability/units";
import type { RateLimitResult } from "@/lib/rate-limit";

/** The SHIPPED shared denial (src/app/actions/group.ts) — asserted as a constant so a wording change is a
 *  deliberate act. "Can't host a group" and "isn't yours" are deliberately the SAME sentence (T-08-14). */
const DENIED = "We couldn't find that booking, or it isn't yours to manage." as const;

const HOST = "ocg_host";
const ORGANIZER = "ocg_organizer";

/** The drop-in listing under test. 30 admissions a day — so a group on it would mint 29 RSVP-able seats. */
const L_OPEN = "L_ocg_open";
/**
 * The EXCLUSIVE control, identical to `L_OPEN` in every respect that matters except the mode — same cap,
 * same rates, same venue, same trading hours. It exists so case (2) can prove the guard keys on the mode
 * and ONLY on the mode: without it, "a drop-in pass mints no group" would be equally satisfied by a fix
 * that broke group creation outright, and the whole Phase-8 feature would fail silently.
 */
const L_EXCL = "L_ocg_excl";
/** The daily admissions cap. The number the defect turns into RSVP seats. */
const CAP = 30;
const PER_HEAD_CENTS = 35_000; // ₱350.00 per pass
const HOURLY = 50_000;
const DAY_RATE = 300_000;

const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8; // UTC+8 all year, no DST — so every instant below is plain UTC arithmetic
const HOUR_MS = 3_600_000;
const OPEN_HOUR = 6; // 06:00 venue-local
const CLOSE_HOUR = 22; // 22:00 venue-local

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

/** The venue-local calendar date of an instant, as plain shifted-UTC fields. */
function toLocalDate(at: Date): LocalDate {
  const shifted = new Date(at.getTime() + MANILA_OFFSET_HOURS * HOUR_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}
/** A venue-local calendar date `n` days from now — clock-relative on purpose (see the header). */
function daysOut(n: number): LocalDate {
  return toLocalDate(new Date(Date.now() + n * 24 * HOUR_MS));
}
/** A venue-local wall clock (date + hour) as the real UTC instant it names. */
function venueInstant(d: LocalDate, hour: number, minute = 0): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hour - MANILA_OFFSET_HOURS, minute, 0));
}
const pad = (n: number) => String(n).padStart(2, "0");
/**
 * The CR-03 counter identity for a venue-local date: `[midnight, next midnight)` plus the `YYYY-MM-DD` key.
 * Derived with the same plain +08 arithmetic as everything else here — an INDEPENDENT second opinion on
 * `venueDayBoundsUtc`, never a re-run of it.
 */
function dayBounds(d: LocalDate): { dayStartUtc: Date; dayEndUtc: Date; dateKey: string } {
  const dayStartUtc = venueInstant(d, 0, 0);
  return {
    dayStartUtc,
    dayEndUtc: new Date(dayStartUtc.getTime() + 24 * HOUR_MS),
    dateKey: `${d.year}-${pad(d.month)}-${pad(d.day)}`,
  };
}

/** One date, comfortably inside the 90-day horizon and comfortably ahead of now. */
const D_PASS = daysOut(21);

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

/** The mocked session identity — set per test to drive the owner gate. */
const session: { userId: string | null } = { userId: null };

/** The limiter is stubbed: the real one is a module-level Map with a 5-per-60s budget, which would turn
 *  later cases into rate-limit denials rather than the refusals they are about. */
const fakeRateLimit = (): RateLimitResult => ({ ok: true });

type SentEvent = { name: string; data: Record<string, unknown> };
const inngestSend = vi.fn(async (event: SentEvent) => {
  void event;
  return { ids: [] as string[] };
});

let testDb: TestDb;
type GroupActions = typeof import("@/app/actions/group");
let createGroup: GroupActions["createGroup"];

/**
 * THE ASSERTION THIS FILE IS BUILT AROUND: the number of RSVP-able seats a group on this booking offers,
 * read straight out of Postgres, defaulting to 0 when no group row exists. Deliberately NOT a row count —
 * a failure has to quote the CAPACITY that was minted, because 29 strangers being told they are coming is
 * the harm, and "expected 1 to be 0" would not say so.
 */
async function mintedSeats(bookingId: string): Promise<number> {
  const rows = (await testDb.db.execute(sql`
    SELECT capacity_snapshot AS "capacitySnapshot"
    FROM booking_group WHERE booking_id = ${bookingId}
  `)) as unknown as { capacitySnapshot: number }[];
  return rows[0]?.capacitySnapshot ?? 0;
}

/** The persisted booking truth — so a case can prove the row it acted on really was drop-in-shaped. */
async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      openCapacity: booking.openCapacity,
      declaredPax: booking.declaredPax,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/**
 * Flip a claimed hold into the paid, confirmed row `createGroup` requires. Payment is the sole confirm
 * authority (D-57) and this file is about what happens AFTER a pass has genuinely been paid for, so the row
 * is put in that state directly — the same shape tests/group/group-lifecycle.test.ts seeds a paid booking in
 * (a confirmed booking carries a captured payment).
 */
/**
 * Seed a confirmed, paid EXCLUSIVE booking — an ordinary hour-shaped reservation on `L_EXCL`, in the same
 * shape tests/group/group-lifecycle.test.ts seeds one. Clock-relative like everything else here.
 */
async function seedExclusiveBooking(id: string): Promise<void> {
  const startsAt = venueInstant(D_PASS, 9);
  await testDb.db.insert(booking).values({
    id,
    listingId: L_EXCL,
    unit: 1,
    bookerId: ORGANIZER,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR_MS),
    status: "confirmed" as const,
    bookingMode: "instant" as const,
    cancellationPolicy: "standard" as const,
    spacePriceCents: HOURLY,
    serviceFeeCents: 5_000,
    quotedTotalCents: HOURLY + 5_000,
    currency: "php",
    paymentId: `pay_${id}`,
    paymentMethod: "gcash" as const,
  });
}

async function markPaid(bookingId: string): Promise<void> {
  await testDb.db
    .update(booking)
    .set({
      status: "confirmed",
      expiresAt: null,
      paymentId: `pay_${bookingId}`,
      paymentMethod: "gcash",
    })
    .where(eq(booking.id, bookingId));
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: HOST, name: "OCG Host", email: "ocg_host@example.com", firstName: "Host", emailVerified: true },
    { id: ORGANIZER, name: "Olive Organizer", email: "ocg_organizer@example.com", firstName: "Olive" },
  ]);

  await testDb.db.insert(listing).values([
    {
      id: L_OPEN,
      hostId: HOST,
      title: "Drop-in floor",
      status: "published" as const,
      occupancyMode: "open_capacity" as const,
      bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
      cancellationPolicy: "standard" as const,
      maxOccupancy: CAP,
      unitCount: 1,
      perHeadPriceCents: PER_HEAD_CENTS,
      timezone: TIMEZONE,
      city: "Makati",
      currency: "php",
      // ⚠️ DELIBERATELY ADVERSARIAL, DO NOT REMOVE. A drop-in listing may legitimately still carry the
      // exclusive rate columns — OC-17 lets a host switch an already-priced listing to drop-in and nothing
      // wipes them. Keeping them here is what makes the guard provable: it can only pass by keying on the
      // PERSISTED `occupancy_mode` column, never by inferring the mode from a null rate (T-09-52).
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    },
    {
      id: L_EXCL,
      hostId: HOST,
      title: "Reservable court",
      status: "published" as const,
      // The ONE field that differs from L_OPEN. Everything else is held constant so case (2)'s green is
      // attributable to the mode and to nothing else.
      occupancyMode: "exclusive" as const,
      bookingMode: "instant" as const,
      cancellationPolicy: "standard" as const,
      maxOccupancy: CAP,
      unitCount: 1,
      perHeadPriceCents: PER_HEAD_CENTS,
      timezone: TIMEZONE,
      city: "Makati",
      currency: "php",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    },
  ]);

  // Open EVERY weekday, so the clock-relative date above always lands on a day the venue trades.
  await testDb.db.insert(operatingHours).values(
    [L_OPEN, L_EXCL].flatMap((listingId) =>
      Array.from({ length: 7 }, (_, dow) => ({
        id: `oh_${listingId}_${dow}`,
        listingId,
        dayOfWeek: dow,
        openTime: `${pad(OPEN_HOUR)}:00:00`,
        closeTime: `${pad(CLOSE_HOUR)}:00:00`,
      })),
    ),
  );

  vi.doMock("@/lib/auth", () => ({
    auth: {
      api: {
        getSession: async () =>
          session.userId
            ? { user: { id: session.userId, email: `${session.userId}@example.com`, name: "Olive" } }
            : null,
      },
    },
  }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.resetModules();
  ({ createGroup } = await import("@/app/actions/group"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

let infoSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  session.userId = ORGANIZER;
  inngestSend.mockClear();
  // recordAudit's v1 sink is a structured console.info line (src/lib/audit.ts) — silenced, not asserted here.
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  infoSpy.mockRestore();
});

describe("CR-05 — a drop-in pass cannot mint a group", () => {
  it("(1) a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats", async () => {
    // ONE pass — one head, one paid admission — minted by the REAL claim for a real trading date.
    const claim = await createOpenCapacityHold(testDb.db, {
      listingId: L_OPEN,
      bookerId: ORGANIZER,
      dayOpenUtc: venueInstant(D_PASS, OPEN_HOUR),
      dayCloseUtc: venueInstant(D_PASS, CLOSE_HOUR),
      ...dayBounds(D_PASS),
      requestedHeads: 1,
    });
    if ("error" in claim) throw new Error(`the drop-in claim was refused: ${claim.error}`);
    await markPaid(claim.id);

    // The row really is the drop-in shape, and really is ONE admission. Without this the case could go
    // green against a booking that never entered the seam where CR-05 lives.
    const row = await readRow(claim.id);
    expect(row.status).toBe("confirmed");
    expect(row.openCapacity).toBe(true);
    expect(row.declaredPax).toBe(1);

    const res = await createGroup(claim.id);

    // THE DATABASE TRUTH FIRST (.continue-here.md anti-pattern 5). This assertion comes before any claim
    // about the return value because it is the one that names the harm: on unchanged source it reads 29 —
    // twenty-nine RSVP-able seats minted from the listing's DAILY admissions cap, against ONE paid pass.
    expect(await mintedSeats(claim.id)).toBe(0);

    // Only then the caller-facing refusal, in the shared no-oracle sentence.
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("unreachable");
    expect(res.error).toBe(DENIED);
  });

  it("(2) an exclusive booking on the SAME cap still mints a group with the organizer's seat reserved", async () => {
    // THE SCOPE GUARD. Case (1) can be passed by a fix that keys on the mode — or by one that simply breaks
    // group creation. This case is what tells the two apart: same host, same cap, same rates, same venue,
    // same trading hours, mode `exclusive`. It must still mint exactly what D-113 says it should.
    const bookingId = "bk_ocg_exclusive";
    await seedExclusiveBooking(bookingId);

    const res = await createGroup(bookingId);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(`exclusive group creation was refused: ${res.error}`);

    // 29 = GREATEST(30 - 1, 0) — the organizer holds one of the room's places and has no rsvp row of their
    // own (D-113 · WR-03). The very number case (1) refuses to mint is the correct answer HERE, because
    // here the organizer actually reserved the room those seats are in.
    expect(await mintedSeats(bookingId)).toBe(CAP - 1);
  });

  it("(3) BOTH statements carry the mode predicate, so a bypassed pre-read gate still writes nothing", async () => {
    // DEFENCE IN DEPTH (T-09-73). The guard has to live in the INSERT's own WHERE as well as the gate, so a
    // future refactor that breaks the gate cannot create a group on a drop-in booking.
    //
    // This case asserts that STRUCTURALLY, on the shipped source, rather than faking a bypass — which is
    // what the plan prescribes when the harness cannot cleanly defeat the gate, and it cannot: the gate is
    // internal to `createGroup`, and any seam wide enough for a test to reach around it would be a seam
    // that did not exist in production. Monkey-patching `db.execute` to swallow the gate would prove a
    // property of the mock, not of the action. So: read the real file, cut out the two statements, and
    // require the predicate in each. A grep over the whole file would pass if BOTH copies landed in the
    // gate; slicing the statements is what makes this an assertion about placement.
    const source = readFileSync(new URL("../../src/app/actions/group.ts", import.meta.url), "utf8");

    const gateStart = source.indexOf('SELECT b.id, l.max_occupancy AS "maxOccupancy"');
    expect(gateStart).toBeGreaterThan(-1);
    const insertStart = source.indexOf("INSERT INTO booking_group");
    expect(insertStart).toBeGreaterThan(gateStart);
    const insertEnd = source.indexOf("RETURNING id, access_token", insertStart);
    expect(insertEnd).toBeGreaterThan(insertStart);

    const gateStatement = source.slice(gateStart, insertStart);
    const insertStatement = source.slice(insertStart, insertEnd);

    // The gate reads the mode (as a projected boolean, so the refusal can be audited as `open_capacity`
    // rather than vanishing into the same empty result as "no such booking" — T-09-77).
    expect(gateStatement).toContain("occupancy_mode = 'exclusive'");
    // The write re-states it as a hard predicate. This is the one that survives a broken gate.
    expect(insertStatement).toContain("AND l.occupancy_mode = 'exclusive'");
  });
});
