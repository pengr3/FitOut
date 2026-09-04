// THE BEHAVIOURAL PROOF OF D-113 — PayMongo's own record says the lapsed hold can no longer take money.
//
// Every other assertion in this phase about the retire sweep is a CALL COUNT against a stub. A call count
// proves the code did what the test told it to do; it does not prove the provider agrees. This file is the
// one that asks PayMongo. It mints a REAL `sk_test_` checkout session, confirms the provider reports it
// `active` — payable — seeds a lapsed `pending` hold that holds it, runs THE SHIPPED SWEEP over that row,
// and then asks PayMongo again, over a fresh request. The assertion the whole plan turns on is step (5):
// the provider itself now says `expired`.
//
// ⚠ IT DRIVES THE PRODUCTION PATH, NEVER `expireCheckoutSession` DIRECTLY. `queryRetirableSessions` must
// SELECT the row and `retireOne` must retire it. The point is not that "expire retires a session" —
// `checkout-idempotency-real.test.ts` case (2) already proved that live, and this file deliberately extends
// that precedent rather than duplicating it. The point is that THE LAPSE PATH retires a session.
//
// ── WHAT THE RED LOOKS LIKE — PERFORMED 2026-08-22, VERBATIM ────────────────────────────────────────────
// `await expireCheckoutSession(row.checkoutSessionId);` was deleted from
// `src/lib/payments/retire-checkout.ts` and this file re-run with the flag. The module was then restored
// from a SAVED COPY in the scratchpad — never `git checkout --`.
//
//   [step1] minted cs_4d478861ff9f48cc71098294
//   [step2] pre-sweep status=active
//   [step4] retireOne outcome=retired          ← unchanged. NO call count moved.
//   [step5] post-sweep status=active           ← PayMongo says the session is STILL PAYABLE
//   AssertionError: expected 'active' not to be 'active'
//   [cleanup] cs_4d478861ff9f48cc71098294 final status=expired
//
// Read step (4) against step (5): the sweep selected the row, the policy resolved `"retired"`, and NOTHING
// a stub could count changed. Only the provider's own record disagreed. That gap is the entire reason this
// file exists — and it is why `retireOne`'s outcome is not evidence of anything on its own.
//
// (The observed red also fixed an ordering defect in this spec: the differential assertion fired first and
// its message — `expected 'active' not to be 'active'` — explained nothing. The explaining assertion is now
// first. A red nobody can read is a guard nobody will trust.)
//
// GREEN, from the same run after the revert: minted `cs_95208137133e72b0722056fc`, pre-sweep `active`,
// post-sweep `expired`, cleanup `expired`.
//
// ── THE GATE ────────────────────────────────────────────────────────────────────────────────────────────
// Copied verbatim from `checkout-idempotency-real.test.ts`. The PRIMARY gate is the explicit
// `RUN_LIVE_PAYMONGO_PROBE=1` opt-in, NOT the key prefix: `.env.local` carries a real `sk_test_` key that
// `tests/setup.ts` loads FIRST, so a prefix-only gate would make the DEFAULT suite hit the live API
// forever. Every session this file mints is expired in cleanup — no live payable session may leak.
//
// ── IT COMBINES TWO IDIOMS THAT HAVE NEVER MET ──────────────────────────────────────────────────────────
// The existing live file makes ZERO database calls. This one needs a `booking` row, so it also carries
// `setupTestDb` / `teardownTestDb`, and `@/lib/db` is mocked onto that isolated schema so the policy's
// audit row lands there too. `@/lib/paymongo` is NOT mocked — that is the entire point of the file.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createCheckoutSession,
  expireCheckoutSession,
  getCheckoutSession,
} from "@/lib/paymongo";
import { readPaymentState } from "@/lib/payments/checkout-probe";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const runLive =
  process.env.RUN_LIVE_PAYMONGO_PROBE === "1" &&
  !!process.env.PAYMONGO_SECRET_KEY &&
  process.env.PAYMONGO_SECRET_KEY.startsWith("sk_test_");

/** Every session id this file mints — expired in `afterAll`, and its final status reported. */
const created: string[] = [];

afterAll(async () => {
  for (const id of created) {
    try {
      await expireCheckoutSession(id);
    } catch {
      /* already expired — a repeat expire is itself the tolerated case-4 no-op (LW-01) */
    }
    try {
      const final = await getCheckoutSession(id);

      console.log(`[cleanup] ${id} final status=${final.status}`);
    } catch {
      /* the report is best-effort; the expire above is the guarantee */
    }
  }
});

const HOST = "lh_host";
const BOOKER = "lh_booker";
const LISTING = "L_lh";

describe.skipIf(!runLive)("D-113 live — the lapse path renders a real session non-payable", () => {
  let testDb: TestDb;
  let sweep: typeof import("@/inngest/functions/checkout-retire");

  beforeAll(async () => {
    testDb = await setupTestDb();
    await testDb.db.insert(user).values([
      {
        id: HOST,
        name: "LH Host",
        email: "lh_host@example.com",
        firstName: "Host",
        emailVerified: true,
      },
      { id: BOOKER, name: "LH Booker", email: "lh_booker@example.com", firstName: "Booker" },
    ]);
    await testDb.db.insert(listing).values({
      id: LISTING,
      hostId: HOST,
      title: "LH Listing",
      status: "published",
      unitCount: 1,
      timezone: "Asia/Manila",
      hourlyRateCents: 150000,
      dayRateCents: 300000,
      currency: "php",
    });

    // ONLY the database is mocked. `@/lib/paymongo` stays REAL — that is the whole file.
    vi.doMock("@/lib/db", () => ({ db: testDb.db }));
    vi.doMock("@/inngest/client", () => ({
      inngest: { send: vi.fn(async () => ({ ids: [] })), createFunction: vi.fn((o: unknown) => o) },
    }));
    vi.resetModules();
    sweep = await import("@/inngest/functions/checkout-retire");
  });

  afterAll(async () => {
    vi.doUnmock("@/lib/db");
    vi.doUnmock("@/inngest/client");
    await teardownTestDb(testDb);
  });

  it(
    "a lapsed pending hold's checkout session is reported EXPIRED by PayMongo after the sweep runs",
    async () => {
      const bookingId = `bk_lh_${randomUUID().slice(0, 8)}`;

      // ── (1) MINT A REAL SESSION ────────────────────────────────────────────────────────────────────
      const ref = `lapse-${randomUUID()}`;
      const minted = await createCheckoutSession({
        amountCents: 50_000,
        currency: "php",
        name: "D-113 lapse probe",
        referenceNumber: ref,
        metadata: { booking_id: ref },
        successUrl: "https://example.test/ok",
        cancelUrl: "https://example.test/cancel",
        idempotencyKey: `lapse-${randomUUID()}`,
      });
      created.push(minted.id);

      console.log(`[step1] minted ${minted.id}`);

      // ── (2) GUARD THE GUARD ────────────────────────────────────────────────────────────────────────
      // Assert the session is PAYABLE before anything retires it. Without this, the proof would pass just
      // as happily against a session that was never payable to begin with — the failure mode this
      // repository has hit more than twenty times.
      const before = await getCheckoutSession(minted.id);

      console.log(`[step2] pre-sweep status=${before.status}`);
      expect(
        before.status,
        "the freshly minted session is not `active`, so step (5) would prove nothing — a session that was " +
          "never payable cannot be shown to have STOPPED being payable",
      ).toBe("active");

      // ── (3) SEED A LAPSED HOLD THAT HOLDS IT ───────────────────────────────────────────────────────
      await testDb.db.insert(booking).values({
        id: bookingId,
        listingId: LISTING,
        unit: 1,
        bookerId: BOOKER,
        startsAt: new Date("2027-06-01T10:00:00.000Z"),
        endsAt: new Date("2027-06-01T11:00:00.000Z"),
        status: "pending",
        quotedTotalCents: 50_000,
        currency: "php",
        expiresAt: new Date(Date.now() - 60_000), // lapsed one minute ago
        checkoutSessionId: minted.id,
      });

      // ── (4) RUN THE PRODUCTION PATH ────────────────────────────────────────────────────────────────
      const candidates = await sweep.queryRetirableSessions(testDb.db);
      expect(
        candidates.map((r) => r.bookingId),
        "the SHIPPED selector did not pick up a lapsed pending hold holding a live session — the sweep " +
          "would never have reached this row in production either",
      ).toContain(bookingId);

      const row = candidates.find((r) => r.bookingId === bookingId)!;
      const result = await sweep.retireOne(row);

      console.log(`[step4] retireOne outcome=${result.outcome}`);
      expect(result.outcome).toBe("retired");

      // ── (5) THE PROOF ──────────────────────────────────────────────────────────────────────────────
      // PayMongo's own record, over a FRESH request, saying this session can no longer take money.
      const after = await getCheckoutSession(minted.id);

      console.log(`[step5] post-sweep status=${after.status}`);
      // The EXPLAINING assertion goes first on purpose. Measured during deliberate break #2: with the
      // differential (`not.toBe(before.status)`) first, the red read `expected 'active' not to be 'active'`
      // and the sentence naming what that MEANS was never reached.
      expect(
        after.status,
        `PayMongo still reports this session ${after.status} AFTER the lapse sweep ran over it. The ` +
          "booker's open tab or unscanned QR can still take their money for a booking FitOut no longer " +
          "holds — D-113 is not true. Note that NO call count moved: the sweep selected the row and " +
          "retireOne resolved `retired`. Only the provider's own record disagrees, which is why this file " +
          "exists.",
      ).toBe("expired");
      // The differential, kept as the second half: the status genuinely CHANGED, so step (2) and step (5)
      // cannot both be reading a cached or constant answer.
      expect(after.status).not.toBe(before.status);

      // ── (6) THE APP'S OWN VOCABULARY AGREES ────────────────────────────────────────────────────────
      // `pending` + `expired` is already a named reading with an owned landing (`hold-expired-state.tsx`),
      // which is why this plan ships zero new copy.
      expect(readPaymentState("pending", after)).toBe("hold-expired");

      // ── (7) THE EVIDENCE RULE, ON A REAL SESSION ───────────────────────────────────────────────────
      // The session is retired; the BOOKING is untouched. The row is still `pending` — which is precisely
      // and only what plan 13.1-02's `queryUnconfirmedPaid` selects — and it still names its session, so a
      // payment that landed at the last second is still discoverable.
      const [readBack] = await testDb.db
        .select({
          status: booking.status,
          expiresAt: booking.expiresAt,
          checkoutSessionId: booking.checkoutSessionId,
        })
        .from(booking)
        .where(eq(booking.id, bookingId));

      expect(readBack.status).toBe("pending");
      expect(readBack.checkoutSessionId).toBe(minted.id);
      expect(readBack.expiresAt).not.toBeNull();
    },
    60_000,
  );
});
