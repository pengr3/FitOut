// CR-02 — a host who blocks a date on a DROP-IN listing must actually stop passes selling for it.
//
// WHY THIS FILE EXISTS, AND WHY IT DRIVES THE HOST ACTION RATHER THAN AN INSERT. `availability_block` is
// pre-Phase-9 machinery. It is read in exactly ONE place in `src/` — the exclusive branch of
// `getAvailability` — which sits BELOW the Phase-9 fork, so `getOpenDay`, `getOpenMonthAvailability` and
// `createOpenCapacityHold` never query it at all. That is the SEAM: a date-shaped drop-in pass meeting
// machinery written for hours-and-minutes reservations, with the handoff itself untested. The host page
// meanwhile renders the shipped `BlocksEditor` under "Blocked dates" / "block off any dates you can't host",
// and 09-UI-SPEC § 1g says in as many words that for open listings "blocks still zero a date".
//
// So every case here creates its block through the REAL `addBlock` server action, with a REAL host session on
// a REAL owned listing — never a bare INSERT — and case 3 asserts the DATABASE, not a sentence: after a
// crafted claim on a blocked date, `booking` must hold ZERO rows for that (listing, venue-local day). A
// refusal that returns the right words and mints the row anyway is the failure this file is built to catch,
// and the picker is a courtesy that is never the gate (Security V4).
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 rule): the claim refuses a
// past date and one beyond the 90-day horizon, so a hardcoded date would quietly turn case 3's claim into a
// PAST_DATE refusal the moment the calendar passed it — and the case would go green for the wrong reason,
// which is worse than red.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TASK-1 CONFIRMATION RUN — **BRANCH A: CR-02 REPRODUCES.** 31 July 2026, `npx vitest run
// tests/availability/open-capacity-blocks.test.ts` against UNCHANGED `src/` (`git status --short -- src/`
// empty, HEAD = ab68543). This run IS the independent confirmation — a failing test, not a reading of the
// reviewer's prose. Output VERBATIM (the two `[Better Auth] Social provider google is missing clientId or
// clientSecret` stderr lines that precede it are the harness's standing warning on every DB-backed file):
//
//    ❯ tests/availability/open-capacity-blocks.test.ts (3 tests | 3 failed) 1102ms
//         × 1 · the day panel reports ZERO spots on a blocked date 80ms
//         × 2 · the month grid disables the blocked date 8ms
//         × 3 · the CLAIM refuses a blocked date and mints NO booking row 27ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/availability/open-capacity-blocks.test.ts > CR-02 — a host block must withdraw a drop-in
//    date from sale > 1 · the day panel reports ZERO spots on a blocked date
//   AssertionError: expected 3 to be +0 // Object.is equality
//
//   - Expected
//   + Received
//
//   - 0
//   + 3
//
//    ❯ tests/availability/open-capacity-blocks.test.ts:254:29
//       252|     //    SpotsLeftChip and the DatePassPicker already render; a block…
//       253|     const after = await spotsOn(BLOCKED);
//       254|     expect(after.remaining).toBe(0);
//          |                             ^
//       255|     expect(after.state).toBe("full");
//       256|     expect(after.bookable).toBe(false);
//
//   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯
//
//    FAIL  … > 2 · the month grid disables the blocked date
//   AssertionError: expected [] to include '2026-08-30'
//    ❯ tests/availability/open-capacity-blocks.test.ts:264:41
//       262|     // The day panel and the grid are two different queries over the s…
//       263|     // them is the NT-02 class of bug: the grid offers a date the pane…
//       264|     expect(await fullDatesFor(BLOCKED)).toContain(ymd(BLOCKED));
//          |                                         ^
//       265|   });
//
//   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯
//
//    FAIL  … > 3 · the CLAIM refuses a blocked date and mints NO booking row
//   AssertionError: expected [ { …(3) } ] to have a length of +0 but got 1
//
//   - Expected
//   + Received
//
//   - 0
//   + 1
//
//    ❯ tests/availability/open-capacity-blocks.test.ts:275:47
//       273|     // ── DATABASE TRUTH FIRST. The harm is not a missing sentence, it…
//       274|     //    closed — so the row count is what fails first, before anythi…
//       275|     expect(await bookingsOn(L_OPEN, BLOCKED)).toHaveLength(0);
//          |                                               ^
//       276|
//       277|     // …and only then, that the caller was actually refused.
//
//   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯
//
//    Test Files  1 failed (1)
//         Tests  3 failed (3)
//    Duration  3.18s
//
// READ THE THREE FAILURES AS ONE SENTENCE. `expected 3 to be +0` — the public calendar offers the FULL cap
// on a date the host closed and can see listed under "Blocked dates". `expected [] to include …` — the month
// grid never disables it either, so search and the date picker keep offering it. And `expected [ … ] to have
// a length of +0 but got 1` — THE CLAIM GRANTED AND PRICED A PASS ANYWAY: one paid admission on a closed day.
// The host then either honours a day they shut or cancels every pass and pays the D-71 host-cancel fee on
// each one. Exactly the stale-availability failure CLAUDE.md names as unacceptable.
//
// (The line numbers above are from the confirmation run; this header was expanded afterwards to hold the
// record, so the assertions they name now sit further down the file.)
//
// The `'2026-08-30'` in failure 2 is emitted BY VITEST — it is the clock-relative fixture date rendered into
// the assertion message, not a literal in this file. See the note on the plan's `grep -c "2026-"` acceptance
// criterion in 09-20-SUMMARY.md § Deviations.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TASK-2 MUTATION — EXECUTED, not merely described. The `not_blocked` refusal was deleted from
// `createOpenCapacityHold` (units.ts step 5), leaving the READ-MODEL half in place — so the calendar still
// says the date is shut while the claim happily sells it. Observed output, VERBATIM (the OBSERVED set, not
// the predicted one — 09-18's lesson):
//
//    ❯ tests/availability/open-capacity-blocks.test.ts (7 tests | 2 failed) 3646ms
//         × 3 · the CLAIM refuses a blocked date and mints NO booking row 42ms
//         × 4 · removing the block re-opens the date with the day's full remaining capacity 32ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  … > 3 · the CLAIM refuses a blocked date and mints NO booking row
//   AssertionError: expected [ { …(3) } ] to have a length of +0 but got 1
//
//   - Expected
//   + Received
//
//   - 0
//   + 1
//
//    ❯ tests/availability/open-capacity-blocks.test.ts:436:47
//
//    FAIL  … > 4 · removing the block re-opens the date with the day's full remaining capacity
//   AssertionError: expected 2 to be 3 // Object.is equality
//
//   - Expected
//   + Received
//
//   - 3
//   + 2
//
//    ❯ tests/availability/open-capacity-blocks.test.ts:457:29
//
//    Test Files  1 failed (1)
//         Tests  2 failed | 5 passed (7)
//
// ONE PAID ADMISSION ON A DAY THE HOST CLOSED, while the calendar showed it shut — that is what
// `expected [ … ] to have a length of +0 but got 1` is. Note WHICH cases stayed green under it: 1, 2, 6 and 7
// all pass, because the read-model half was left intact. A fix applied to the calendar alone would therefore
// look like four-sevenths of a success, and the only case that can tell you otherwise is the one that reads
// the `booking` table back. This is the T-09-64 assertion: the picker is a courtesy, the claim is the gate.
//
// Case 4's cascade is itself part of the finding rather than noise: the pass the mutation let through is
// STILL OCCUPYING A HEAD on that date, so when the host unblocks, only 2 of the 3 admissions come back
// (`expected 2 to be 3`). The host's way out does not undo the sale that should never have happened.
//
// Restored → 7/7 green → `git diff --exit-code src/` printed nothing.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, operatingHours, availabilityBlock } from "@/lib/db/schema";
import { getAvailability, getOpenMonthAvailability } from "@/lib/availability/read-model";
import { BLOCKED_DATE_MESSAGE, loadOpenDayWindow } from "@/lib/availability/open-capacity";
import { createOpenCapacityHold } from "@/lib/availability/units";

let testDb: TestDb;
let testAuth: TestAuth;
let addBlock: (typeof import("@/app/actions/blocks"))["addBlock"];
let removeBlock: (typeof import("@/app/actions/blocks"))["removeBlock"];
type CancelActions = typeof import("@/app/actions/cancel-booking");
let cancelBookingAsHost: CancelActions["cancelBookingAsHost"];

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the client (case 5's cancel emits two). */
type NotifyEnvelope = { name: string; data: Record<string, unknown> };
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

// Mutable holder so the (hoisted) next/headers mock can pick up the host's session cookie — the
// blocks.test.ts / hours-lock.test.ts harness, unchanged.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const HOST_EMAIL = "ocb.host@example.com";
const PASSWORD = "averylongpassword";
const BOOKER_A = "ocb_booker_a";
const BOOKER_B = "ocb_booker_b";

const L_OPEN = "l_ocb_open";
const L_EXCL = "l_ocb_excl"; // case 7 — the exclusive path must be byte-unchanged by all of this

const CAP = 3;
const PER_HEAD_CENTS = 35_000;
const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8; // UTC+8 all year, no DST — every instant below is plain UTC arithmetic
const OPEN_HOUR = 6; // 06:00 venue-local
const CLOSE_HOUR = 22; // 22:00 venue-local
const HOUR_MS = 3_600_000;

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

function toLocalDate(d: Date): LocalDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
/** A venue-local calendar date `n` days out — clock-relative on purpose (see the header). */
function daysOut(n: number): LocalDate {
  return toLocalDate(new Date(Date.now() + n * 24 * HOUR_MS));
}
function ymd(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}
/** A venue-local wall-clock hour on a venue-local date, as the real UTC instant it names — plain +08
 *  arithmetic, so no assertion here can inherit a bug from the timezone library the code under test uses. */
function venueInstant(d: LocalDate, hour: number): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hour - MANILA_OFFSET_HOURS, 0, 0));
}
/** The CR-03 counter identity for a venue-local date: `[midnight, next midnight)`. Plain +08 arithmetic, so
 *  it is an INDEPENDENT second opinion on `venueDayBoundsUtc` rather than a re-run of it. */
function dayBounds(d: LocalDate): { dayStartUtc: Date; dayEndUtc: Date } {
  const dayStartUtc = new Date(Date.UTC(d.year, d.month - 1, d.day, -MANILA_OFFSET_HOURS, 0, 0));
  return { dayStartUtc, dayEndUtc: new Date(dayStartUtc.getTime() + 24 * HOUR_MS) };
}

// One date per concern, so one case's block or committed heads can never decide another case's expectation.
const BLOCKED = daysOut(30); // the date the host closes — cases 1-4
const CANCEL_DAY = daysOut(31); // case 5 — two pass-holders, one host cancel
const SCOPE_BLOCKED = daysOut(32); // case 6 — the block that must not leak sideways
const SCOPE_CLEAR = daysOut(33); // case 6 — the neighbouring date it must not touch
const EXCL_DAY = daysOut(34); // case 7 — on the EXCLUSIVE listing

let HOST_ID = "";
/** The id `addBlock` minted in case 1 — case 4 hands it straight back to the real `removeBlock`. */
let BLOCKED_DATE_BLOCK_ID = "";

/** The read model's own answer for a drop-in date — the shape a booker's calendar renders from. */
async function spotsOn(day: LocalDate) {
  const availability = await getAvailability(testDb.db, L_OPEN, day);
  expect(availability.occupancyMode).toBe("open_capacity");
  expect(availability.openCapacity).not.toBeNull();
  return availability.openCapacity!;
}

/** The month grid's `disabled` set for the month a date belongs to. */
async function fullDatesFor(day: LocalDate): Promise<string[]> {
  const map = await getOpenMonthAvailability(testDb.db, L_OPEN, {
    year: day.year,
    month: day.month,
  });
  return map.fullDates;
}

/**
 * The claim, driven EXACTLY as `placeOpenHold` drives it — re-deriving the window through the real
 * `loadOpenDayWindow` — so the statement under test is the one the money path executes.
 */
async function claim(day: LocalDate, bookerId: string, heads: number) {
  const win = await loadOpenDayWindow(testDb.db, L_OPEN, day);
  if (!win) throw new Error("fixture broken: the venue is closed on that date");
  return createOpenCapacityHold(testDb.db, {
    listingId: L_OPEN,
    bookerId,
    dayOpenUtc: win.dayOpenUtc,
    dayCloseUtc: win.dayCloseUtc,
    dayStartUtc: win.dayStartUtc,
    dayEndUtc: win.dayEndUtc,
    dateKey: win.dateKey,
    requestedHeads: heads,
    idempotencyKey: null,
  });
}

/**
 * EVERY booking row on one (listing, venue-local day), whatever its status. The row-count assertion this
 * file's headline case rests on: a refusal is only real if nothing was written.
 */
async function bookingsOn(listingId: string, day: LocalDate) {
  const b = dayBounds(day);
  return (await testDb.db.execute(sql`
    SELECT id, status::text AS status, declared_pax
    FROM booking
    WHERE listing_id = ${listingId}
      AND starts_at >= ${b.dayStartUtc.toISOString()}::timestamptz
      AND starts_at <  ${b.dayEndUtc.toISOString()}::timestamptz
    ORDER BY id
  `)) as unknown as { id: string; status: string; declared_pax: number }[];
}

/** The listing's `availability_block` rows, read straight back. */
async function blocksOn(listingId: string) {
  return testDb.db
    .select()
    .from(availabilityBlock)
    .where(sql`${availabilityBlock.listingId} = ${listingId}`);
}

/**
 * Flip a claimed hold to the CONFIRMED, paid shape the PayMongo webhook writes (D-57 is the sole confirm
 * authority in production; there is no action to call here). Case 5 needs confirmed rows because
 * `cancelBookingAsHost` only ever cancels a confirmed, still-future booking.
 */
async function markPaid(bookingId: string): Promise<void> {
  await testDb.db.execute(sql`
    UPDATE booking
    SET status = 'confirmed', expires_at = NULL,
        payment_id = ${`pay_${bookingId}`}, payment_method = 'gcash'
    WHERE id = ${bookingId}
  `);
}

/** The claim's success shape, narrowed — a refusal here is a broken fixture, not an assertion. */
async function claimOrThrow(day: LocalDate, bookerId: string, heads: number): Promise<string> {
  const res = await claim(day, bookerId, heads);
  if (!("ok" in res)) throw new Error(`fixture broken: the claim was refused: ${res.error}`);
  return res.id;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  // Case 5 drives the REAL cancelBookingAsHost, which refunds and notifies. Both are stubbed at the same
  // surface tests/booking/open-capacity-cancel.test.ts uses; the D-72 QRPh exports are deliberately ABSENT,
  // so a refactor that routed a drop-in refund down that seam would crash loudly rather than pass on a stub.
  vi.doMock("@/lib/paymongo", () => ({
    createRefund: mockPayMongo.createRefund,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
  }));
  vi.doMock("@/inngest/client", () => ({
    inngest: { send: inngestSend, createFunction: (opts: { id: string }) => ({ id: opts.id }) },
  }));
  vi.resetModules();
  ({ addBlock, removeBlock } = await import("@/app/actions/blocks"));
  ({ cancelBookingAsHost } = await import("@/app/actions/cancel-booking"));

  // A REAL host session — `addBlock` is session- AND owner-gated, and driving it any other way would
  // exercise a path no host can reach.
  const signedUp = (await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "Blocks Host",
    firstName: "Blocks",
    intent: "host",
  })) as { user: { id: string } };
  HOST_ID = signedUp.user.id;
  const signIn = await testAuth.api.signInEmail({
    body: { email: HOST_EMAIL, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";

  await testDb.db.insert(user).values(
    [BOOKER_A, BOOKER_B].map((id) => ({
      id,
      name: id,
      email: `${id}@example.com`,
      firstName: "Booker",
      emailVerified: true,
      canBook: true,
    })),
  );

  // The host's payout wallet — the D-71 host-cancel fee debit in case 5 nets against it — plus the
  // ops-APPROVED host_verification row deriveBookable's SIXTH term needs (phase 18, D-224). Both through
  // the one shared fixture expression; the `user` row above is left alone.
  await makeVerifiedHost(testDb.db, HOST_ID, {
    insertUser: false,
    paymongoAccountId: "wal_ocb_1",
  });

  await testDb.db.insert(listing).values([
    {
      id: L_OPEN,
      hostId: HOST_ID,
      title: "Drop-in floor",
      status: "published",
      reviewState: "approved",
      publishedAt: new Date(),
      primarySpaceType: "gym_fitness_floor",
      city: "Makati",
      currency: "php",
      occupancyMode: "open_capacity",
      bookingMode: "instant", // OC-10 — open capacity is instant-only
      cancellationPolicy: "standard", // the D-67 tier the claim snapshots
      maxOccupancy: CAP,
      unitCount: 1,
      perHeadPriceCents: PER_HEAD_CENTS,
      // ⚠️ DELIBERATELY ADVERSARIAL, DO NOT REMOVE (the 09-07 lesson). A drop-in listing may legitimately
      // still carry hourly/day rates — 09-06 requires a per-head price but never CLEARS the exclusive
      // columns — so a fork keyed off a null rate rather than off the persisted occupancy_mode fails here.
      hourlyRateCents: 90_000,
      dayRateCents: 400_000,
      timezone: TIMEZONE,
    },
    {
      // Case 7's control. Its block must still subtract exactly the overlapped HOURS from the slot grid —
      // the shared predicate is for the open branch only and must not leak into the path Phase 3 shipped.
      id: L_EXCL,
      hostId: HOST_ID,
      title: "Whole court",
      status: "published",
      reviewState: "approved",
      publishedAt: new Date(),
      primarySpaceType: "gym_fitness_floor",
      city: "Makati",
      currency: "php",
      occupancyMode: "exclusive",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      unitCount: 1,
      hourlyRateCents: 90_000,
      dayRateCents: 400_000,
      timezone: TIMEZONE,
    },
  ]);

  // Both listings open EVERY weekday, so each case owns its own date without a "closed that day" surprise.
  await testDb.db.insert(operatingHours).values(
    [L_OPEN, L_EXCL].flatMap((listingId) =>
      Array.from({ length: 7 }, (_, dow) => ({
        id: randomUUID(),
        listingId,
        dayOfWeek: dow,
        openTime: `${String(OPEN_HOUR).padStart(2, "0")}:00:00`,
        closeTime: `${String(CLOSE_HOUR).padStart(2, "0")}:00:00`,
      })),
    ),
  );
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/inngest/client");
  await teardownTestDb(testDb);
});

describe("CR-02 — a host block must withdraw a drop-in date from sale", () => {
  it("1 · the day panel reports ZERO spots on a blocked date", async () => {
    // The date is genuinely on sale FIRST, so the case cannot pass because the fixture was never bookable.
    const before = await spotsOn(BLOCKED);
    expect(before.remaining).toBe(CAP);
    expect(before.bookable).toBe(true);

    // ── The host closes the day, through the shipped host action, exactly as the BlocksEditor does.
    const added = await addBlock(L_OPEN, {
      date: ymd(BLOCKED),
      wholeDay: true,
      unit: null, // whole listing (D-24) — the scope a "Blocked dates" entry uses
      reason: "public holiday",
    });
    expect(added.ok).toBe(true);
    BLOCKED_DATE_BLOCK_ID = added.ok ? (added.id ?? "") : "";
    expect(BLOCKED_DATE_BLOCK_ID).not.toBe("");
    expect(await blocksOn(L_OPEN)).toHaveLength(1);

    // ── THE BOOKER-VISIBLE TRUTH. `full` + not-bookable is the SHIPPED vocabulary the calendar, the
    //    SpotsLeftChip and the DatePassPicker already render; a blocked date needs no new state.
    const after = await spotsOn(BLOCKED);
    expect(after.remaining).toBe(0);
    expect(after.state).toBe("full");
    expect(after.bookable).toBe(false);
    // The cap itself is untouched — the date is withdrawn, not re-sized.
    expect(after.cap).toBe(CAP);
  });

  it("2 · the month grid disables the blocked date", async () => {
    // The day panel and the grid are two different queries over the same fact. A fix applied to only one of
    // them is the NT-02 class of bug: the grid offers a date the panel then shows shut.
    expect(await fullDatesFor(BLOCKED)).toContain(ymd(BLOCKED));
  });

  it("3 · the CLAIM refuses a blocked date and mints NO booking row", async () => {
    // The picker is a courtesy and never the gate (Security V4). This is the crafted-payload path: the date
    // is chosen by the caller, not by the calendar, and the refusal has to live inside the claim's own
    // transaction, under the advisory lock, in the same statement as the cap and the rate.
    const res = await claim(BLOCKED, BOOKER_A, 1);

    // ── DATABASE TRUTH FIRST. The harm is not a missing sentence, it is a PAID ADMISSION on a day the host
    //    closed — so the row count is what fails first, before anything about wording.
    expect(await bookingsOn(L_OPEN, BLOCKED)).toHaveLength(0);

    // …and only then, that the caller was actually refused, in the words the booker reads. The literal is
    // IMPORTED, never retyped, so the claim and this gate can never drift on a string.
    expect("error" in res).toBe(true);
    if ("ok" in res) throw new Error("unreachable");
    expect(res.error).toBe(BLOCKED_DATE_MESSAGE);
    // A closed day is NOT a race loss, so the OC-13 `soldOut` flag — which is what tells the CTA to refresh
    // the calendar and invite a retry on this very date — must be absent.
    expect(res.soldOut).toBeUndefined();
  });

  it("4 · removing the block re-opens the date with the day's full remaining capacity", async () => {
    // The host's way out, through the shipped unblock button. It must exist, and it also proves a
    // HOST-created block is not caught by removeBlock's `host_cancellation` refusal (T-07-62) — that
    // refusal is scoped to the punitive, system-written sentinel, and this block carries "public holiday".
    const res = await removeBlock(L_OPEN, BLOCKED_DATE_BLOCK_ID);
    expect(res.ok).toBe(true);
    expect(await blocksOn(L_OPEN)).toHaveLength(0);

    const after = await spotsOn(BLOCKED);
    expect(after.remaining).toBe(CAP);
    expect(after.state).toBe("open");
    expect(after.bookable).toBe(true);
    expect(await fullDatesFor(BLOCKED)).not.toContain(ymd(BLOCKED));

    // …and the date is genuinely SELLABLE again, not merely displayed as open. Case 3 proved the claim is
    // the gate; this proves the gate re-opens.
    const bookingId = await claimOrThrow(BLOCKED, BOOKER_A, 1);
    const rows = await bookingsOn(L_OPEN, BLOCKED);
    expect(rows.map((r) => r.id)).toEqual([bookingId]);
    expect((await spotsOn(BLOCKED)).remaining).toBe(CAP - 1);
  });

  it("5 · a host cancelling ONE drop-in pass still does not close the date for everyone else", async () => {
    // 09-09 / 09-RESEARCH Pitfall 5 / T-09-65, RESTATED NOW THAT BLOCKS ACTUALLY BITE. `cancelBookingAsHost`
    // skips D-70's anti-resell auto-block for a drop-in booking, because that block's window is the venue's
    // WHOLE OPERATING DAY on the sentinel unit 1 that every open row shares. Before this plan the skip was
    // load-bearing for a DIFFERENT reason (an undeletable `host_cancellation` row the host could never
    // clear); from this commit on it is load-bearing for the ORIGINAL one too — a single such row would now
    // genuinely zero the date for every remaining pass-holder. Without this case, a later refactor that
    // "restored" Consequence 3 for open rows would turn every drop-in host cancel into a whole-day outage
    // and nothing in the suite would notice.
    expect(await blocksOn(L_OPEN)).toHaveLength(0); // precondition: no block is standing in for the result

    const stays = await claimOrThrow(CANCEL_DAY, BOOKER_A, 2);
    const cancelled = await claimOrThrow(CANCEL_DAY, BOOKER_B, 1);
    await markPaid(stays);
    await markPaid(cancelled);
    expect((await spotsOn(CANCEL_DAY)).remaining).toBe(0); // the date is genuinely full first

    const res = await cancelBookingAsHost(cancelled, "maintenance");
    expect(res).toEqual({ ok: true, refundCents: expect.any(Number) });

    // ── THE ASSERTION. Zero blocks — so the date was never withdrawn from anyone.
    expect(await blocksOn(L_OPEN)).toHaveLength(0);
    // …and the booker-visible consequence of that: the OTHER pass-holder's 2 heads are still counted, the
    // cancelled head is back in the pool, and the day is still on sale.
    const after = await spotsOn(CANCEL_DAY);
    expect(after.remaining).toBe(1);
    expect(after.bookable).toBe(true);
    expect(await fullDatesFor(CANCEL_DAY)).not.toContain(ymd(CANCEL_DAY));
  });

  it("6 · a block on a DIFFERENT date does not affect this one", async () => {
    // The scope guard. A predicate that forgot its date range would close the whole listing, and cases 1-3
    // would all still be green — they only ever look at the blocked date.
    const added = await addBlock(L_OPEN, {
      date: ymd(SCOPE_BLOCKED),
      wholeDay: true,
      unit: null,
      reason: "deep clean",
    });
    expect(added.ok).toBe(true);

    expect((await spotsOn(SCOPE_BLOCKED)).remaining).toBe(0); // the block really did land…

    const neighbour = await spotsOn(SCOPE_CLEAR); // …and stopped exactly there
    expect(neighbour.remaining).toBe(CAP);
    expect(neighbour.state).toBe("open");
    expect(neighbour.bookable).toBe(true);
    expect(await fullDatesFor(SCOPE_CLEAR)).not.toContain(ymd(SCOPE_CLEAR));
    // The claim is date-scoped too — a listing-scoped refusal would take the whole calendar down with it.
    await claimOrThrow(SCOPE_CLEAR, BOOKER_A, 1);
    expect((await spotsOn(SCOPE_CLEAR)).remaining).toBe(CAP - 1);
  });

  it("7 · an EXCLUSIVE listing's block behaviour is unchanged", async () => {
    // The whole-date rule is an OPEN-CAPACITY rule (a date is one pass, OC-02). On the exclusive path a
    // block still subtracts exactly the HOURS it overlaps — anything else would be a Phase-3 regression
    // shipped under a Phase-9 heading.
    const added = await addBlock(L_EXCL, {
      date: ymd(EXCL_DAY),
      wholeDay: false,
      startTime: "10:00",
      endTime: "12:00",
      unit: null,
      reason: "court resurfacing",
    });
    expect(added.ok).toBe(true);

    const availability = await getAvailability(testDb.db, L_EXCL, EXCL_DAY);
    expect(availability.occupancyMode).toBe("exclusive");
    expect(availability.openCapacity).toBeNull(); // the OC-01 fork keeps the exclusive payload byte-identical

    const at = (hour: number) =>
      availability.slots.find((s) => s.startUtc === venueInstant(EXCL_DAY, hour).toISOString());
    // EXACTLY the overlapped hours are gone…
    expect(at(10)).toMatchObject({ freeUnits: 0, state: "unavailable" });
    expect(at(11)).toMatchObject({ freeUnits: 0, state: "unavailable" });
    // …and the hours on either side of the block are untouched, so the date did not collapse to a "pass".
    expect(at(9)).toMatchObject({ freeUnits: 1, state: "available" });
    expect(at(12)).toMatchObject({ freeUnits: 1, state: "available" });
    // The grid is still an HOUR grid: 06:00 → 22:00 is 16 slots, block or no block.
    expect(availability.slots).toHaveLength(CLOSE_HOUR - OPEN_HOUR);
  });
});
