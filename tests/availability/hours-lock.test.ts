// CR-03 layer 2 — a host may not change the operating hours of a weekday that still carries drop-in passes.
//
// WHY THIS FILE EXISTS, AND WHY IT DRIVES THE ACTION RATHER THAN THE LOCK MODULE. `saveOperatingHours` is
// pre-Phase-9 code with NO booking awareness whatsoever: it deletes every window for the listing and
// reinserts the posted set, inside one transaction, with no occupancy, mode or lock check. That is the SEAM
// — a date-shaped drop-in pass meeting machinery written for hours-and-minutes reservations — and every
// Phase-9 defect so far has lived at exactly such a handoff. A unit test of `getOpenHoursLockState` would go
// green while the action happily overwrote the rows; so every case here calls the REAL exported action, with
// a REAL session and a REAL owned listing, and ASSERTS THE PERSISTED `operating_hours` ROWS FIRST — the
// returned sentence is checked only afterwards. A refusal that returns the right words and writes the rows
// anyway is the failure this file is built to catch.
//
// The pass in case 1 is minted by the REAL `createOpenCapacityHold` (via `loadOpenDayWindow`, exactly as
// `placeOpenHold` steps 7-8 do), not hand-inserted, so the row the lock query sees is the row the product
// actually mints. Cases 4 and 5 DO hand-insert, deliberately: an already-finished pass and an exclusive
// confirmed booking are both states the claim path cannot legally produce for a future date.
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 rule): the claim refuses a
// past date and one beyond the 90-day horizon, so a hardcoded date would quietly turn case 1's mint into a
// PAST_DATE refusal the moment the calendar passed it, and the whole file would go green by vacuum.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION — EXECUTED, not merely described. The refusal was disabled in `saveOperatingHours`
// (src/app/actions/operating-hours.ts — the `owned.occupancyMode === "open_capacity"` guard's condition
// forced false, leaving the shipped session/ownership/validation contract and the replace-the-set
// transaction untouched), which is precisely the pre-09-19 behaviour of the file. Observed output,
// VERBATIM — the OBSERVED set, not the predicted one (09-18's lesson):
//
//    ❯ tests/availability/hours-lock.test.ts (5 tests | 4 failed) 2625ms
//         × 1 · a weekday carrying an upcoming drop-in pass cannot have its hours changed 80ms
//         × 2 · an unlocked weekday is still freely editable 25ms
//         × 3 · re-saving the same windows on a locked weekday succeeds 7ms
//         × 5 · a finished pass does not lock 22ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/availability/hours-lock.test.ts > CR-03 layer 2 — an hours edit may not strand passes
//    already sold > 1 · a weekday carrying an upcoming drop-in pass cannot have its hours changed
//   AssertionError: expected '07:00:00' to be '06:00:00' // Object.is equality
//
//   Expected: "06:00:00"
//   Received: "07:00:00"
//
//    ❯ tests/availability/hours-lock.test.ts:322:32
//       320|     //     write that stranded them, so THAT is what fails first.
//       321|     const persisted = await hoursFor(LISTING, TARGET_DOW);
//       322|     expect(persisted.openTime).toBe(BASE_OPEN_SS);
//          |                                ^
//       323|     expect(persisted.closeTime).toBe(BASE_CLOSE_SS);
//
//    FAIL  … > 2 · an unlocked weekday is still freely editable
//   AssertionError: expected '07:00:00' to be '06:00:00' // Object.is equality
//
//   Expected: "06:00:00"
//   Received: "07:00:00"
//
//    ❯ tests/availability/hours-lock.test.ts:348:60
//
//    FAIL  … > 3 · re-saving the same windows on a locked weekday succeeds
//   AssertionError: expected false to be true // Object.is equality
//
//    ❯ tests/availability/hours-lock.test.ts:358:97
//
//    FAIL  … > 5 · a finished pass does not lock
//   AssertionError: expected '07:00:00' to be '06:00:00' // Object.is equality
//
//   Expected: "06:00:00"
//   Received: "07:00:00"
//
//    ❯ tests/availability/hours-lock.test.ts:393:60
//
//    Test Files  1 failed (1)
//         Tests  4 failed | 1 passed (5)
//
// `expected '07:00:00' to be '06:00:00'` — THE HOST'S EDIT LANDED ON A WEEKDAY WHOSE PASSES WERE ALREADY
// SOLD. Every pass held for a future instance of that weekday now claims a 06:00 entry window on a venue
// that opens at 07:00, with a refund deadline and a payout sweep keyed off an opening time that no longer
// exists.
//
// FOUR cases went red where the plan predicted one, and the cascade is itself the finding: cases 2, 3 and 5
// each re-assert that the LOCKED weekday is still where the sold pass left it, so once case 1's edit
// actually lands, every later scope guard is measuring a listing whose rows have already moved. Case 3 fails
// one step earlier still — its "the payload really is seconds-less" precondition — because the set it reads
// back is no longer the seeded 06:00 one. Only case 4 stayed GREEN, correctly: it drives the EXCLUSIVE
// listing, which this guard never touches, so no mutation of the guard can move it.
//
// (The line numbers above are from the mutated run; this header was expanded afterwards to hold the record,
// so they now sit a few lines earlier than the assertions they name.)
//
// Restored → 5/5 green → `git diff --exit-code src/` printed nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user, listing, operatingHours, booking } from "@/lib/db/schema";
import { loadOpenDayWindow } from "@/lib/availability/open-capacity";
import { createOpenCapacityHold } from "@/lib/availability/units";
import { HOURS_LOCKED_MESSAGE } from "@/lib/validation/availability";
import type { WeeklyHoursInput } from "@/lib/validation/availability";

let testDb: TestDb;
let testAuth: TestAuth;
let saveOperatingHours: (typeof import("@/app/actions/operating-hours"))["saveOperatingHours"];

// Mutable holder so the (hoisted) next/headers mock can pick up the host's session cookie — the
// blocks.test.ts / crud.test.ts harness, unchanged.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const LISTING = "l_hours_lock_open";
const EXCLUSIVE = "l_hours_lock_excl";
const BOOKER = "hours_lock_booker";
const PAST_BOOKER = "hours_lock_booker_past";
const EXCL_BOOKER = "hours_lock_booker_excl";

const CAP = 3;
const PER_HEAD_CENTS = 35_000;
const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8; // UTC+8 all year, no DST — every instant below is plain UTC arithmetic
const HOUR_MS = 3_600_000;

const BASE_OPEN = "06:00"; // the form's shape ("HH:mm" — page.tsx seeds the editor via slice(0, 5))
const BASE_OPEN_SS = "06:00:00"; // the shape Postgres `time` round-trips
const BASE_CLOSE_SS = "22:00:00";

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

/** An instant's VENUE-LOCAL calendar date, by plain +08 shift — no timezone library, so no assertion here
 *  can inherit a bug from the one the code under test uses. */
function venueLocalDate(at: Date): LocalDate {
  const shifted = new Date(at.getTime() + MANILA_OFFSET_HOURS * HOUR_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}
/** A venue-local calendar date `n` days out (negative = in the past) — clock-relative on purpose. */
function daysOut(n: number): LocalDate {
  return venueLocalDate(new Date(Date.now() + n * 24 * HOUR_MS));
}
/** A venue-local wall-clock hour on a venue-local date, as the real UTC instant it names. */
function venueInstant(d: LocalDate, hour: number): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hour - MANILA_OFFSET_HOURS, 0, 0));
}
/** The venue-local weekday, 0=Sun..6=Sat. Noon UTC is 20:00 Manila on the SAME calendar date. */
function dowOf(d: LocalDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, 12, 0, 0)).getUTCDay();
}

// Four DISTINCT weekdays, so no case can pass because of another case's edit:
//   TARGET  (+7 → today's weekday)   the one a live pass freezes
//   FREE    (+9 → today's weekday+2) case 2 — nothing is sold on it
//   PAST    (−4 → today's weekday+3) case 5 — only a FINISHED pass sits on it
//   EXCL    (+8 → today's weekday+1) case 4 — on the OTHER, exclusive listing
const TARGET = daysOut(7);
const FREE = daysOut(9);
const PAST = daysOut(-4);
const EXCL = daysOut(8);
const TARGET_DOW = dowOf(TARGET);
const FREE_DOW = dowOf(FREE);
const PAST_DOW = dowOf(PAST);
const EXCL_DOW = dowOf(EXCL);

function openListing(id: string, mode: "open_capacity" | "exclusive") {
  return {
    id,
    hostId: HOST_ID,
    title: id,
    status: "published" as const,
    publishedAt: new Date(),
    primarySpaceType: "gym_fitness_floor" as const,
    city: "Makati",
    currency: "php" as const,
    occupancyMode: mode,
    bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
    cancellationPolicy: "standard" as const, // D-67 tier the claim snapshots
    maxOccupancy: CAP,
    unitCount: 1,
    perHeadPriceCents: PER_HEAD_CENTS,
    // The exclusive rate columns are DELIBERATELY kept on BOTH listings: 09-06 requires a per-head price but
    // never clears them, so every assertion below can only pass by keying on the persisted occupancy_mode,
    // never on the accident of a NULL column.
    hourlyRateCents: 90_000,
    dayRateCents: 400_000,
    timezone: TIMEZONE,
  };
}

let HOST_ID = "";

/** The listing's persisted weekly set, as the DB holds it (sorted, so comparisons are by value). */
async function readHours(listingId: string) {
  const rows = await testDb.db
    .select()
    .from(operatingHours)
    .where(eq(operatingHours.listingId, listingId));
  return rows.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.openTime.localeCompare(b.openTime));
}

/** The single persisted window for one weekday. Throws rather than returning undefined, so a fixture that
 *  silently lost a row fails LOUDLY here instead of turning an assertion into `undefined === undefined`. */
async function hoursFor(listingId: string, dow: number) {
  const row = (await readHours(listingId)).find((h) => h.dayOfWeek === dow);
  if (!row) throw new Error(`no persisted window for weekday ${dow} on ${listingId}`);
  return row;
}

/**
 * Exactly what the browser re-posts: the persisted set, read back and normalised to "HH:mm" the way
 * page.tsx seeds the editor (`.slice(0, 5)`). Used as the BASE of every save so each case changes ONE
 * weekday and leaves the other six byte-identical — which is also what makes case 3 a real no-op autosave.
 */
async function formSetOf(listingId: string): Promise<WeeklyHoursInput> {
  const rows = await readHours(listingId);
  return {
    windows: rows.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime.slice(0, 5),
      closeTime: h.closeTime.slice(0, 5),
    })),
  };
}

/** The same set with ONE weekday's opening time moved — the routine host edit this whole plan is about. */
function withOpeningAt(set: WeeklyHoursInput, dow: number, openTime: string): WeeklyHoursInput {
  return {
    windows: set.windows.map((w) => (w.dayOfWeek === dow ? { ...w, openTime } : w)),
  };
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ saveOperatingHours } = await import("@/app/actions/operating-hours"));

  // A REAL host session — the action is session- AND owner-gated, and driving it any other way would test a
  // path no host can reach.
  const email = "hours.lock.host@example.com";
  const signedUp = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Hours Lock Host",
    firstName: "Hours",
    intent: "host",
  })) as { user: { id: string } };
  HOST_ID = signedUp.user.id;
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";

  await testDb.db.insert(user).values(
    [BOOKER, PAST_BOOKER, EXCL_BOOKER].map((id) => ({
      id,
      name: id,
      email: `${id}@example.com`,
      firstName: "Booker",
      emailVerified: true,
      canBook: true,
    })),
  );

  await testDb.db
    .insert(listing)
    .values([openListing(LISTING, "open_capacity"), openListing(EXCLUSIVE, "exclusive")]);

  // Hours on EVERY weekday of BOTH listings, so all four target weekdays are genuinely open and the only
  // thing that changes mid-file is what a case deliberately edits.
  await testDb.db.insert(operatingHours).values(
    [LISTING, EXCLUSIVE].flatMap((listingId) =>
      Array.from({ length: 7 }, (_, dow) => ({
        id: randomUUID(),
        listingId,
        dayOfWeek: dow,
        openTime: BASE_OPEN_SS,
        closeTime: BASE_CLOSE_SS,
      })),
    ),
  );

  // Case 5's fixture: a drop-in pass whose day is OVER. Hand-inserted because the claim path refuses a past
  // date outright — which is exactly why "a host is never frozen by their own back catalogue" needs proving.
  await testDb.db.insert(booking).values({
    id: "bk_hours_lock_finished",
    listingId: LISTING,
    unit: 1,
    bookerId: PAST_BOOKER,
    startsAt: venueInstant(PAST, 6),
    endsAt: venueInstant(PAST, 22),
    status: "confirmed",
    openCapacity: true,
    declaredPax: 1,
    quotedTotalCents: PER_HEAD_CENTS,
  });

  // Case 4's fixture: a CONFIRMED, still-upcoming EXCLUSIVE booking. It would lock under OC-17's mode rule,
  // and it must NOT lock the hours — the refusal is scoped to drop-in passes and must not leak onto the path
  // Phase 3 shipped.
  await testDb.db.insert(booking).values({
    id: "bk_hours_lock_exclusive",
    listingId: EXCLUSIVE,
    unit: 1,
    bookerId: EXCL_BOOKER,
    startsAt: venueInstant(EXCL, 8),
    endsAt: venueInstant(EXCL, 10),
    status: "confirmed",
    quotedTotalCents: 180_000,
  });
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

describe("CR-03 layer 2 — an hours edit may not strand passes already sold", () => {
  it("1 · a weekday carrying an upcoming drop-in pass cannot have its hours changed", async () => {
    // Mint the pass through the REAL claim, re-deriving the day window from the listing's CURRENT hours
    // exactly as placeOpenHold does — so the row under the lock is the row the product mints.
    const win = await loadOpenDayWindow(testDb.db, LISTING, TARGET);
    if (!win) throw new Error("fixture broken: the venue is closed on the target date");
    const hold = await createOpenCapacityHold(testDb.db, {
      listingId: LISTING,
      bookerId: BOOKER,
      dayOpenUtc: win.dayOpenUtc,
      dayCloseUtc: win.dayCloseUtc,
      dayStartUtc: win.dayStartUtc,
      dayEndUtc: win.dayEndUtc,
      dateKey: win.dateKey,
      requestedHeads: 1,
      idempotencyKey: null,
    });
    if (!("ok" in hold)) throw new Error(`fixture broken: the claim was refused: ${hold.error}`);

    // ── THE EDIT. Ordinary and well-meant — a new class schedule pushes Monday's opening back an hour.
    const res = await saveOperatingHours(
      LISTING,
      withOpeningAt(await formSetOf(LISTING), TARGET_DOW, "07:00"),
    );

    // (1) DATABASE TRUTH FIRST. The harm is not a missing sentence, it is the ROW MOVING under a sold pass:
    //     the booker holds a 06:00–22:00 entry window and a refund deadline derived from it, and this is the
    //     write that stranded them, so THAT is what fails first.
    const persisted = await hoursFor(LISTING, TARGET_DOW);
    expect(persisted.openTime).toBe(BASE_OPEN_SS);
    expect(persisted.closeTime).toBe(BASE_CLOSE_SS);

    // (2) …and only then, what the host is actually told — both halves, because weekly-hours-editor.tsx
    //     toasts `error` and pins `fieldErrors.windows[0]` onto the form.
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("unreachable");
    expect(res.error).toContain(HOURS_LOCKED_MESSAGE);
    expect(res.fieldErrors?.windows?.[0]).toContain(HOURS_LOCKED_MESSAGE);
    // O7: a concrete WHEN and a way out, never a bare "you can't". The date is rendered venue-local with the
    // zone named (D-105) — asserted structurally, not as a calendar literal.
    expect(res.error).toMatch(/The last one is for .+\(Makati time\)/);
    expect(res.error).toContain("cancel those passes");
  });

  it("2 · an unlocked weekday is still freely editable", async () => {
    const res = await saveOperatingHours(
      LISTING,
      withOpeningAt(await formSetOf(LISTING), FREE_DOW, "08:00"),
    );
    expect(res.ok).toBe(true);

    // The new window is READ BACK from operating_hours — the save is only real if the row moved.
    expect((await hoursFor(LISTING, FREE_DOW)).openTime).toBe("08:00:00");
    // …and the locked weekday is still exactly where the sold pass left it. The lock is scoped to weekdays
    // that carry passes, not to the listing.
    expect((await hoursFor(LISTING, TARGET_DOW)).openTime).toBe(BASE_OPEN_SS);
  });

  it("3 · re-saving the same windows on a locked weekday succeeds", async () => {
    // The no-op autosave the editor fires with the seconds-less, DB-origin windows it was seeded with. If
    // the canonicalisation were wrong ("06:00" ≠ "06:00:00") this would be refused and the editor would be
    // frozen for any host with a pass on the calendar — a denial of service against the host, delivered by
    // the guard meant to protect their bookers.
    const before = await readHours(LISTING);
    const sameSet = await formSetOf(LISTING);
    expect(sameSet.windows.some((w) => w.dayOfWeek === TARGET_DOW && w.openTime === BASE_OPEN)).toBe(
      true,
    ); // the payload really is seconds-less, so the case cannot pass vacuously

    const res = await saveOperatingHours(LISTING, sameSet);
    expect(res.ok).toBe(true);

    const after = await readHours(LISTING);
    expect(after.map((h) => `${h.dayOfWeek}:${h.openTime}-${h.closeTime}`)).toEqual(
      before.map((h) => `${h.dayOfWeek}:${h.openTime}-${h.closeTime}`),
    );
  });

  it("4 · an EXCLUSIVE listing is unaffected", async () => {
    // Same shape of edit, on a listing with a CONFIRMED upcoming booking on that very weekday. The refusal
    // is scoped to the persisted occupancy_mode and must not leak onto the whole-space path.
    const res = await saveOperatingHours(
      EXCLUSIVE,
      withOpeningAt(await formSetOf(EXCLUSIVE), EXCL_DOW, "09:00"),
    );
    expect(res.ok).toBe(true);
    expect((await hoursFor(EXCLUSIVE, EXCL_DOW)).openTime).toBe("09:00:00");
  });

  it("5 · a finished pass does not lock", async () => {
    // Its ends_at is already behind us, so nothing can be stranded — a host must never be frozen out of
    // their own calendar by a back catalogue that only grows.
    const res = await saveOperatingHours(
      LISTING,
      withOpeningAt(await formSetOf(LISTING), PAST_DOW, "10:00"),
    );
    expect(res.ok).toBe(true);
    expect((await hoursFor(LISTING, PAST_DOW)).openTime).toBe("10:00:00");
    // …while the weekday the LIVE pass sits on is still frozen — proof this case passed because the pass is
    // finished, not because the guard stopped working.
    expect((await hoursFor(LISTING, TARGET_DOW)).openTime).toBe(BASE_OPEN_SS);
  });
});
