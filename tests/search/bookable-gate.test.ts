// D-16 / RESEARCH Pitfall 5 — search must inline the EXACT deriveBookable predicate
// (published ∧ non-deleted ∧ host.emailVerified ∧ host.payoutsEnabled). Mirrors
// tests/listing/status-gate.test.ts: seed each non-bookable reason and assert every one is ABSENT from
// results, while a fully-bookable control listing IS returned. If the SQL predicate ever drifts from
// bookability.ts, one of these exclusions breaks — the drift guard (Pitfall 5).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, hostPayout, listing } from "@/lib/db/schema";
import { searchParamsSchema } from "@/lib/validation/booking";
import { searchListings } from "@/lib/search/query";

let testDb: TestDb;

async function makeHost(id: string, opts: { emailVerified: boolean; payoutsEnabled: boolean }): Promise<void> {
  await testDb.db.insert(user).values({
    id,
    name: id,
    email: `${id}@fitout.seed`,
    firstName: "Gate",
    emailVerified: opts.emailVerified,
    canHost: true,
  });
  await testDb.db.insert(hostPayout).values({
    userId: id,
    activationStatus: opts.payoutsEnabled ? "activated" : "pending",
    payoutsEnabled: opts.payoutsEnabled,
    onboardingComplete: opts.payoutsEnabled,
  });
}

async function makeListing(
  id: string,
  hostId: string,
  status: "draft" | "published" | "unlisted",
): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    primarySpaceType: "gym_fitness_floor",
    city: "Makati",
    location: { x: 121.0244, y: 14.5547 },
    hourlyRateCents: 40000,
    dayRateCents: 250000,
    currency: "php",
    status,
    publishedAt: status === "published" ? new Date() : null,
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();

  // Control: published + verified email + payouts enabled → the ONLY listing that should surface.
  await makeHost("gate_host_ok", { emailVerified: true, payoutsEnabled: true });
  await makeListing("gate_pub", "gate_host_ok", "published");

  // Reason 1: draft status (same fully-bookable host) → excluded.
  await makeListing("gate_draft", "gate_host_ok", "draft");

  // Reason 2: host email unverified (published listing, payouts on) → excluded.
  await makeHost("gate_host_unverified", { emailVerified: false, payoutsEnabled: true });
  await makeListing("gate_unverified", "gate_host_unverified", "published");

  // Reason 3: host payouts disabled (published listing, verified email) → excluded.
  await makeHost("gate_host_nopayout", { emailVerified: true, payoutsEnabled: false });
  await makeListing("gate_nopayout", "gate_host_nopayout", "published");

  // Reason 4 (bonus — the `deleted_at IS NULL` clause): soft-deleted published listing → excluded.
  await makeListing("gate_deleted", "gate_host_ok", "published");
  await testDb.db.update(listing).set({ deletedAt: new Date() }).where(eq(listing.id, "gate_deleted"));
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("searchListings — bookable gate (D-16, deriveBookable parity, Pitfall 5)", () => {
  it("returns a fully-bookable listing but excludes draft, unverified-host, payouts-off, and soft-deleted listings", async () => {
    const { results } = await searchListings(testDb.db, searchParamsSchema.parse({}));
    const ids = results.map((r) => r.id);

    expect(ids).toContain("gate_pub"); // published + verified + payouts on
    expect(ids).not.toContain("gate_draft"); // not published
    expect(ids).not.toContain("gate_unverified"); // host email unverified
    expect(ids).not.toContain("gate_nopayout"); // host payouts disabled
    expect(ids).not.toContain("gate_deleted"); // soft-deleted
  });
});
