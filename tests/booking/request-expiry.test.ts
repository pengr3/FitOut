// Phase-6 request-to-book SLA / payment-window expiry sweeps (BOOK-05 / PAY-05, D-64).
//
// The 06-06 cron (src/inngest/functions/request-expiry.ts) drives the VISIBLE terminal flip + the booker
// email for two lapsed request-to-book holds, DB-clock-authoritative. These integration tests exercise the
// factored queryExpired / expireOne against an isolated schema, with the Inngest client stubbed so the
// emitted notice is observable. They assert the load-bearing behavior:
//   - SLA auto-decline      : a `requested` hold past `expires_at` (DB clock now()) → `declined`, the slot
//                             frees (an overlapping createPendingHold now succeeds — declined is
//                             non-occupying), and the booker is notified ONCE. The cron is the SOLE
//                             booker-notice authority (A6).
//   - payment-window release: an `approved` hold past `expires_at` → `cancelled`, the slot frees, and NO
//                             notice fires (D-66/A3 — the booker chose not to pay).
//   - idempotency           : a second expireOne over an already-terminal row flips 0 rows (noop) and never
//                             re-notifies / re-flips.
//   - selectivity           : a hold still WITHIN its window (future expires_at) is never selected by the
//                             DB-clock sweep.
// Nothing is ever refunded/voided on expiry (D-63) — the freed states are simply non-occupying.
//
// The DB-clock-manip idiom (the first `it` below, from the 06-02 scaffold) proves the harness the cron sweeps
// rely on: force a live hold's `expires_at` into the past with `UPDATE ... expires_at = now() - interval` so
// it becomes selectable without sleeping. The seed helpers here insert an already-past `expires_at` directly
// (the same-machine local Docker DB clock is the authority) for the same effect.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION, EXECUTED 2026-08-06 (quick task 260806-gwt, TIER1-04). The pinned windows this file used to
// carry ("2026-11-01T…", hour-templated) became derived; the templating is preserved, so hours
// 2/4/5/6/7/8 are still six disjoint venue-local windows on one day and the seeded rows still cannot
// collide on booking_no_overlap. The mutation proves the conversion did NOT hollow the file. It targets
// what THIS file uniquely owns (the SLA sweep) on the case that RE-HOLDS the freed slot through the
// derived window (`createPendingHold(windowAt(4))`, line ~201 — a too-soon window would throw there):
//
//   src/inngest/functions/request-expiry.ts: flip the `requested` terminal target declined → cancelled
//     → "SLA auto-decline: a `requested` hold past expires_at → `declined`…" RED:
//       `AssertionError: expected 'cancelled' to be 'declined' // Object.is equality`
//       at `expect(await readStatus(row.id)).toBe("declined")` (line 196)
//     → DIVERGENCE FROM PREDICTION, and an instructive one: the plan predicted the red would land one
//       assertion EARLIER, at `expect(res).toEqual({ status: "declined", notified: true })` (line 193).
//       It did NOT — `expireOne` returns a HARDCODED `{ status: "declined" }` literal rather than
//       reading back what the UPDATE actually wrote, so the return-value assertion cannot detect a
//       changed terminal status. Only the DB READBACK catches it. Worth knowing: line 193 is weaker
//       than it looks, and line 196 is the one carrying the Warning-1 terminal-status contract.
//     → Also RED (expected, same root): "each sweep is idempotent…" at line 246, same message.
// Restored by EDITING THE LINE BACK; `git status --porcelain -- src/` clean before this file shipped.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { venueWindow, assertBookableWindow, instantAt } from "../helpers/dates";
import { user, listing, booking } from "@/lib/db/schema";
import { mockResend } from "../helpers/mocks";
import { createPendingHold } from "@/lib/availability/units";

// 07-10 / D-83: the cron no longer sends the declined email itself — it EMITS `fitout/notify`, which fans
// out to the durable in-app row AND the email (D-91). The probe therefore moved from mockResend to the
// Inngest client, stubbed at the MODULE the cron's graph resolves so the emission is observable (the
// cancellation.test.ts idiom). A bare `vi.spyOn` on an import held here would patch the wrong instance and
// silently miss — and `emitNotify` swallows its own errors, so a miss would be indistinguishable from a pass.
type NotifyEnvelope = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    email: string | null;
    payload: Record<string, unknown>;
  };
};
// `vi.hoisted` because `vi.mock` is hoisted above every `const` in the file: the factory would otherwise
// close over an uninitialised binding and the whole suite would fail to load. The sibling action suites use
// `vi.doMock` + `vi.resetModules` instead — they need a live db/auth mock bound at import time; this file
// imports the cron directly, so the static form is the right one here.
const { inngestSend } = vi.hoisted(() => ({
  inngestSend: vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] })),
}));
// `createFunction` is stubbed too: the module registers its cron at import time, and these cases drive the
// factored `queryExpired` / `expireOne` directly rather than through the Inngest runtime.
vi.mock("@/inngest/client", () => ({
  inngest: {
    send: inngestSend,
    createFunction: (_opts: unknown, handler: unknown) => handler,
  },
}));

import { queryExpired, expireOne, type ExpiredBooking } from "@/inngest/functions/request-expiry";

let testDb: TestDb;

const HOST = "re_host";
const BOOKER = "re_booker";

// A DERIVED base window — never a calendar literal (DEF-IR9-01; see @tests/helpers/dates.ts). The
// literal that used to sit here ("2026-11-01T…") was Tier-1: this file re-holds a freed slot through
// createPendingHold, whose D-96 lead-time guard is SQL evaluated against POSTGRES's now(), so a pinned
// window is refused the moment real time passes it. No `weekday` is passed — this file seeds no
// operating_hours and the write path does not consult them.
// START/END is exactly `windowAt(2)`, which is why they share ONE base: the day must be the same day the
// templated windows below are built on, or the two families could drift apart.
const BASE = venueWindow({ hour: 2, minDaysOut: 3 });
const START = BASE.startUtc;
const END = BASE.endUtc;

/** A distinct 1-hour window per booking so seeded rows never collide on the booking_no_overlap EXCLUDE.
 *  `hour` is now VENUE-LOCAL (it templates off BASE.day through the same TZDate idiom), not UTC — the
 *  per-booking DISTINCTNESS that keeps the seeded rows off each other's constraint is unchanged: hours
 *  2/4/5/6/7/8 on ONE venue-local day are still six disjoint, non-adjacent 1-hour windows. */
function windowAt(hour: number): { startsAt: Date; endsAt: Date } {
  return { startsAt: instantAt(BASE.day, hour), endsAt: instantAt(BASE.day, hour + 1) };
}

/** Seed a request-to-book hold with an explicit status + `expires_at` (past = ready to sweep). */
async function seedHold(opts: {
  id: string;
  status: "requested" | "approved";
  hourUtc: number;
  /** ms from now for `expires_at`: negative = already lapsed (swept), positive = still live. */
  expiresInMs: number;
}): Promise<ExpiredBooking> {
  const { startsAt, endsAt } = windowAt(opts.hourUtc);
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: "L_expiry",
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: opts.status,
    bookingMode: "request",
    quotedTotalCents: 5000, // matches hourlyRate × 1h → whenLabel renders the hourly time span, not "Full day"
    currency: "php",
    expiresAt: new Date(Date.now() + opts.expiresInMs),
  });
  return { id: opts.id, status: opts.status, listingId: "L_expiry", bookerId: BOOKER };
}

async function readStatus(id: string): Promise<string> {
  const [row] = await testDb.db.select({ status: booking.status }).from(booking).where(eq(booking.id, id));
  return row.status;
}

/** Declined/expired notices EMITTED for the booker (this cron is the SOLE booker-notice authority, A6). */
function declinedEmissions(): NotifyEnvelope[] {
  return inngestSend.mock.calls
    .map((c) => c[0])
    .filter(
      (e) =>
        e.name === "fitout/notify" &&
        e.data.type === "request_declined" &&
        e.data.email === "re_booker@example.com",
    );
}

beforeAll(async () => {
  // Assert the derivation, don't assume it. Checking BASE (hour 2) alone is SUFFICIENT: it is the
  // EARLIEST templated hour, and every other window (4/5/6/7/8) is strictly later on the same day, so
  // if hour 2 clears the lead guard they all do.
  assertBookableWindow(BASE);
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "RE Host", email: "re_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "RE Booker", email: "re_booker@example.com", firstName: "Booker", emailVerified: true },
  ]);
  await testDb.db.insert(listing).values({
    id: "L_expiry",
    hostId: HOST,
    title: "Expiry Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Manila",
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });
});

beforeEach(() => {
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("request-to-book expiry sweeps — DB-clock-manip harness (06-06 cron behavior)", () => {
  it("the DB-clock-manip idiom forces a live `requested` hold's expires_at into the past deterministically", async () => {
    // Seed a live request (expires_at comfortably in the future), then push it past-window via the DB clock —
    // the exact idiom the SLA-cron sweeps use to select and expire without sleeping.
    await testDb.db.insert(booking).values({
      id: "bk_sla_seed",
      listingId: "L_expiry",
      unit: 1,
      bookerId: BOOKER,
      startsAt: new Date(START),
      endsAt: new Date(END),
      status: "requested",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await testDb.db.execute(sql`UPDATE booking SET expires_at = now() - interval '1 minute' WHERE id = 'bk_sla_seed'`);

    const [{ past }] = await testDb.client<{ past: boolean }[]>`
      SELECT expires_at <= now() AS past FROM booking WHERE id = 'bk_sla_seed'`;
    expect(past).toBe(true);
  });

  it("SLA auto-decline: a `requested` hold past expires_at → `declined`, slot freed, booker notified once", async () => {
    const row = await seedHold({ id: "bk_sla_decline", status: "requested", hourUtc: 4, expiresInMs: -5 * 60_000 });

    // queryExpired (DB clock now()) selects the lapsed requested hold.
    const due = await queryExpired(testDb.db);
    expect(due.map((d) => d.id)).toContain(row.id);

    const before = declinedEmissions().length;
    const res = await expireOne(testDb.db, due.find((d) => d.id === row.id)!);
    expect(res).toEqual({ status: "declined", notified: true });

    // The VISIBLE flip: requested → declined (the cron's canonical decline target, Warning-1).
    expect(await readStatus(row.id)).toBe("declined");

    // The slot FREES — declined is non-occupying, so an overlapping createPendingHold now succeeds (nothing
    // was refunded/voided, D-63; the freed state is simply non-occupying).
    const { startsAt, endsAt } = windowAt(4);
    const hold = await createPendingHold(testDb.db, { listingId: "L_expiry", bookerId: BOOKER, startsAt, endsAt });
    if ("error" in hold) throw new Error(`overlapping hold on the freed slot failed: ${hold.error}`);
    expect(hold.ok).toBe(true);

    // The booker got EXACTLY ONE declined/expired notice (the SOLE booker-notice authority, A6).
    expect(declinedEmissions().length - before).toBe(1);
  });

  it("payment-window release: an `approved` hold past expires_at → `cancelled`, slot freed, NO email (silent, D-66/A3)", async () => {
    const row = await seedHold({ id: "bk_pay_release", status: "approved", hourUtc: 5, expiresInMs: -5 * 60_000 });

    const due = await queryExpired(testDb.db);
    expect(due.map((d) => d.id)).toContain(row.id);

    const res = await expireOne(testDb.db, due.find((d) => d.id === row.id)!);
    expect(res).toEqual({ status: "cancelled" });

    // approved → cancelled (the payment-window auto-release, mirrors the 06-02 in-tx sweep).
    expect(await readStatus(row.id)).toBe("cancelled");

    // The slot frees — an overlapping hold now succeeds.
    const { startsAt, endsAt } = windowAt(5);
    const hold = await createPendingHold(testDb.db, { listingId: "L_expiry", bookerId: BOOKER, startsAt, endsAt });
    if ("error" in hold) throw new Error(`overlapping hold on the freed slot failed: ${hold.error}`);
    expect(hold.ok).toBe(true);

    // The payment-window release is SILENT — the booker chose not to pay in time (D-66/A3), so NOTHING is
    // emitted and nothing is sent, in either channel.
    expect(declinedEmissions()).toHaveLength(0);
    expect(mockResend.sent()).toHaveLength(0);
  });

  it("each sweep is idempotent: a re-run over an already-terminal row is a 0-row no-op (no duplicate notice)", async () => {
    const row = await seedHold({ id: "bk_idem", status: "requested", hourUtc: 6, expiresInMs: -5 * 60_000 });

    const before = declinedEmissions().length;
    const first = await expireOne(testDb.db, row);
    expect(first).toEqual({ status: "declined", notified: true });
    const afterFirst = declinedEmissions().length;
    expect(afterFirst - before).toBe(1);

    // Second pass over the SAME (now `declined`) row: the status-scoped UPDATE flips 0 rows → noop, and the
    // notice is NEVER re-emitted (T-06-16 idempotency). The flip IS the dedupe claim.
    const second = await expireOne(testDb.db, row);
    expect(second).toEqual({ status: "noop" });
    expect(await readStatus(row.id)).toBe("declined"); // unchanged
    expect(declinedEmissions().length).toBe(afterFirst); // no duplicate notice
  });

  it("neither sweep touches a hold still WITHIN its window (a live requested/approved row is not swept)", async () => {
    const liveReq = await seedHold({ id: "bk_live_req", status: "requested", hourUtc: 7, expiresInMs: 24 * 3_600_000 });
    const liveApp = await seedHold({ id: "bk_live_app", status: "approved", hourUtc: 8, expiresInMs: 24 * 3_600_000 });

    const ids = (await queryExpired(testDb.db)).map((d) => d.id);
    expect(ids).not.toContain(liveReq.id); // requested, expires_at in the future → NOT due
    expect(ids).not.toContain(liveApp.id); // approved, expires_at in the future → NOT due

    // And they are untouched — still holding their slots.
    expect(await readStatus(liveReq.id)).toBe("requested");
    expect(await readStatus(liveApp.id)).toBe("approved");
  });
});
