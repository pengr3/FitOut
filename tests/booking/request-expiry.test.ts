// Phase-6 request-to-book SLA / payment-window expiry sweeps (BOOK-05, D-64) — Wave-0 SCAFFOLD.
//
// This file reserves the DB-clock-manip harness the 06-06 SLA cron tests fill in. The two cron sweeps are:
//   - SLA auto-decline      : a `requested` hold past `expires_at` (now()+APPROVAL_SLA_HOURS) → `declined`,
//                             the slot frees automatically (declined leaves the occupying set), and the
//                             booker is emailed. The cron is the SOLE booker-email authority.
//   - payment-window release: an `approved` hold past `expires_at` (now()+APPROVAL_PAYMENT_WINDOW_HOURS) →
//                             `cancelled`, the slot frees, and the booker is emailed (approved-but-unpaid).
//
// 06-02 (this plan) only proves the in-tx sweep's terminal WRITE-TARGET mirrors these mappings
// (requested→declined / approved→cancelled) — see tests/booking/request-lifecycle.test.ts. The scheduled
// cron behavior itself (batch selection, per-row step.run, the emails) is 06-06's; the `it.todo`
// placeholders below name the cases so 06-06 fills them against this same isolated-schema harness.
//
// The one REAL test here proves the DB-clock-manip idiom the cron tests rely on: force a live hold's
// `expires_at` into the past with `UPDATE ... expires_at = now() - interval` (the payout-sweep.test.ts
// pattern) and confirm it becomes selectable as "past its window" — so 06-06 can drive the sweeps
// deterministically without sleeping.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";

let testDb: TestDb;

const HOST = "re_host";
const BOOKER = "re_booker";

const START = "2026-11-01T02:00:00.000Z";
const END = "2026-11-01T03:00:00.000Z";

beforeAll(async () => {
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
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("request-to-book expiry sweeps — DB-clock-manip harness (06-06 fills the cron cases)", () => {
  it("the DB-clock-manip idiom forces a live `requested` hold's expires_at into the past deterministically", async () => {
    // Seed a live request (expires_at comfortably in the future), then push it past-window via the DB clock —
    // the exact idiom the 06-06 SLA-cron tests use to select and sweep without sleeping.
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

  // ── 06-06 fills these against this harness ─────────────────────────────────
  it.todo("SLA auto-decline: a `requested` hold past expires_at (now()+APPROVAL_SLA_HOURS) → `declined`, slot freed, booker emailed once");
  it.todo("payment-window release: an `approved` hold past expires_at (now()+APPROVAL_PAYMENT_WINDOW_HOURS) → `cancelled`, slot freed, booker emailed once");
  it.todo("neither sweep touches a hold still within its window (a live requested/approved row is not swept)");
  it.todo("each sweep is idempotent: a re-run over an already-terminal row is a 0-row no-op (no duplicate emails)");
});
