// PAY-04 / D-14 — the merchant.activated / merchant.declined webhook drives the bookability gate.
//
// GREEN as of Plan 06 (src/app/api/paymongo/webhook + host_payout writes). The webhook is the ONLY
// writer of host_payout.payoutsEnabled (server/webhook-set, never client). merchant.activated flips
// payoutsEnabled=true (+ activationStatus=activated); merchant.declined flips it false, which — via the
// pure deriveBookable — auto-reverts every one of that host's listings to not-bookable with no
// per-listing write (D-14). These POST a signed body (mockPayMongo.signWebhook) to the exported handler
// and read back the host_payout row + deriveBookable, using the isolated-schema harness.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, hostPayout, listing } from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
import { mockPayMongo } from "../helpers/mocks";

const SECRET = "whsec_test_merchant";
const TS = 1_700_000_000;

let testDb: TestDb;
let POST: (typeof import("@/app/api/paymongo/webhook/route"))["POST"];
let prevSecret: string | undefined;

beforeAll(async () => {
  testDb = await setupTestDb();
  prevSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  process.env.PAYMONGO_WEBHOOK_SECRET = SECRET;
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.resetModules();
  ({ POST } = await import("@/app/api/paymongo/webhook/route"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  process.env.PAYMONGO_WEBHOOK_SECRET = prevSecret;
  await teardownTestDb(testDb);
});

/** Insert a host user + a pending host_payout row with a known Linked-Account id. */
async function makeHost(opts: { accountId: string; emailVerified?: boolean }): Promise<string> {
  const userId = randomUUID();
  await testDb.db.insert(user).values({
    id: userId,
    name: "Host",
    email: `${userId}@example.com`,
    firstName: "Host",
    emailVerified: opts.emailVerified ?? false,
    canHost: true,
  });
  await testDb.db.insert(hostPayout).values({
    userId,
    paymongoAccountId: opts.accountId,
    activationStatus: "pending",
    payoutsEnabled: false,
  });
  return userId;
}

/** Insert a published listing owned by `hostId`; returns its id. */
async function makePublishedListing(hostId: string): Promise<string> {
  const id = randomUUID();
  await testDb.db.insert(listing).values({
    id,
    hostId,
    status: "published",
    bookingMode: "request",
  });
  return id;
}

async function readPayout(userId: string) {
  const rows = await testDb.db.select().from(hostPayout).where(eq(hostPayout.userId, userId));
  return rows[0];
}
async function readListing(id: string) {
  const rows = await testDb.db.select().from(listing).where(eq(listing.id, id));
  return rows[0];
}

/** A PayMongo-shaped event body targeting a Linked Account (attributes.data.id = account id). */
function eventBody(
  eventId: string,
  type: string,
  accountId: string,
  extraAttrs: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    data: { id: eventId, attributes: { type, data: { id: accountId }, ...extraAttrs } },
  });
}

function post(body: string): Promise<Response> {
  const sig = mockPayMongo.signWebhook(body, SECRET, TS);
  return POST(
    new Request("http://localhost/api/paymongo/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "paymongo-signature": sig },
      body,
    }),
  );
}

describe("merchant.activated / merchant.declined gate (PAY-04/D-14)", () => {
  it("merchant.activated sets host_payout.payoutsEnabled=true and activationStatus=activated", async () => {
    const accountId = `acct_${randomUUID()}`;
    const userId = await makeHost({ accountId });

    const res = await post(eventBody(`evt_${randomUUID()}`, "merchant.activated", accountId));
    expect(res.status).toBe(200);

    const row = await readPayout(userId);
    expect(row?.payoutsEnabled).toBe(true);
    expect(row?.activationStatus).toBe("activated");
    expect(row?.onboardingComplete).toBe(true);
  });

  it("a published listing becomes bookable once the host's payoutsEnabled flips true (deriveBookable)", async () => {
    const accountId = `acct_${randomUUID()}`;
    const userId = await makeHost({ accountId, emailVerified: true });
    const listingId = await makePublishedListing(userId);

    // Before activation: published + email-verified but payouts pending → NOT bookable.
    //
    // `hasOperatingHours: true` throughout this file (deriveBookable's fourth term, added 260810-sti) is
    // deliberate: these cases measure the PAYOUT flip, so every other term is held true to keep the
    // observed change attributable to payouts alone. Hours are exercised in tests/listing/bookability.
    let payout = await readPayout(userId);
    let listingRow = await readListing(listingId);
    expect(
      deriveBookable(
        { status: listingRow!.status, hasOperatingHours: true },
        { emailVerified: true, payoutsEnabled: payout!.payoutsEnabled },
      ),
    ).toBe(false);

    await post(eventBody(`evt_${randomUUID()}`, "merchant.activated", accountId));

    // After activation: payoutsEnabled true → the published listing is now bookable.
    payout = await readPayout(userId);
    listingRow = await readListing(listingId);
    expect(
      deriveBookable(
        { status: listingRow!.status, hasOperatingHours: true },
        { emailVerified: true, payoutsEnabled: payout!.payoutsEnabled },
      ),
    ).toBe(true);
  });

  it("merchant.declined sets payoutsEnabled=false and activationStatus=declined", async () => {
    const accountId = `acct_${randomUUID()}`;
    const userId = await makeHost({ accountId });
    // Start activated.
    await post(eventBody(`evt_${randomUUID()}`, "merchant.activated", accountId));
    expect((await readPayout(userId))?.payoutsEnabled).toBe(true);

    const res = await post(eventBody(`evt_${randomUUID()}`, "merchant.declined", accountId));
    expect(res.status).toBe(200);

    const row = await readPayout(userId);
    expect(row?.payoutsEnabled).toBe(false);
    expect(row?.activationStatus).toBe("declined");
  });

  it("declined auto-reverts the host's published listings to NOT bookable with no listing write (D-14)", async () => {
    const accountId = `acct_${randomUUID()}`;
    const userId = await makeHost({ accountId, emailVerified: true });
    const listingId = await makePublishedListing(userId);

    await post(eventBody(`evt_${randomUUID()}`, "merchant.activated", accountId));
    // Snapshot the listing row AFTER activation — the decline must not touch it.
    const before = await readListing(listingId);

    await post(eventBody(`evt_${randomUUID()}`, "merchant.declined", accountId));

    const after = await readListing(listingId);
    // The listing row is byte-for-byte unchanged (auto-revert is pure derivation — zero per-listing writes).
    expect(after).toEqual(before);

    // Yet the listing is now NOT bookable, because deriveBookable reads the flipped flag.
    const payout = await readPayout(userId);
    expect(
      deriveBookable(
        { status: after!.status, hasOperatingHours: true },
        { emailVerified: true, payoutsEnabled: payout!.payoutsEnabled },
      ),
    ).toBe(false);
  });

  it("payoutsEnabled is written by the webhook logic, never from a client-supplied body field", async () => {
    const accountId = `acct_${randomUUID()}`;
    const userId = await makeHost({ accountId });
    // Force the row to activated so a smuggled 'enable' would be a no-op only if honored.
    await testDb.db
      .update(hostPayout)
      .set({ payoutsEnabled: true, activationStatus: "activated" })
      .where(eq(hostPayout.userId, userId));

    // A verified merchant.declined event that ALSO smuggles payoutsEnabled:true + activationStatus:'activated'.
    // The handler must derive the flag from the event TYPE (declined → false), never from the body fields.
    const body = eventBody(`evt_${randomUUID()}`, "merchant.declined", accountId, {
      payoutsEnabled: true,
      activationStatus: "activated",
    });
    const res = await post(body);
    expect(res.status).toBe(200);

    const row = await readPayout(userId);
    expect(row?.payoutsEnabled).toBe(false); // smuggled 'true' was ignored — webhook logic wins.
    expect(row?.activationStatus).toBe("declined");
  });
});
