import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listing, listingReview, user } from "@/lib/db/schema";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";

let testDb: TestDb;

async function loadReviewHistoryByListing(dbConn: TestDb["db"], hostId: string) {
  // Keep the RED phase an assertion failure rather than a module-load crash while the public loader
  // does not exist yet. The variable path stops Vite resolving the future module before this test can
  // make the missing behavior explicit; once GREEN creates it, the same call exercises the real file.
  const modulePath = "../../src/lib/listing/review-history.ts";
  const reviewHistory = await import(/* @vite-ignore */ modulePath).catch(() => null);
  expect(reviewHistory, "the public review-history loader should exist").not.toBeNull();
  return reviewHistory!.loadReviewHistoryByListing(dbConn, hostId);
}

beforeAll(async () => {
  testDb = await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

async function makeHost(label: string): Promise<string> {
  const id = randomUUID();
  await testDb.db.insert(user).values({
    id,
    name: `${label} Host`,
    email: `${id}@example.com`,
    firstName: label,
    emailVerified: true,
  });
  return id;
}

async function makeListing(
  hostId: string,
  label: string,
  deletedAt: Date | null = null,
): Promise<string> {
  const id = randomUUID();
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `${label} Court`,
    status: "published",
    reviewState: "pending",
    deletedAt,
  });
  return id;
}

async function makeCycle(input: {
  id?: string;
  listingId: string;
  state: "pending" | "approved" | "rejected" | "withdrawn" | "grandfathered";
  submittedAt: string;
  decidedAt?: string | null;
  reason?: string | null;
  staff?: string | null;
}): Promise<void> {
  await testDb.db.insert(listingReview).values({
    id: input.id ?? randomUUID(),
    listingId: input.listingId,
    state: input.state,
    reason: input.reason ?? null,
    decidedByStaffId: input.staff ?? null,
    submittedAt: new Date(input.submittedAt),
    decidedAt: input.decidedAt ? new Date(input.decidedAt) : null,
  });
}

function formatInstant(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

describe("LVER-07 review history — owner and serialization boundary", () => {
  it("returns only owner-owned, non-deleted parents and sends no staff or internal identifiers into a history DTO", async () => {
    const ownerId = await makeHost("Owner");
    const otherId = await makeHost("Other");
    const ownedId = await makeListing(ownerId, "Owned");
    const otherListingId = await makeListing(otherId, "Other");
    const deletedListingId = await makeListing(
      ownerId,
      "Deleted",
      new Date("2026-09-01T00:00:00Z"),
    );

    await makeCycle({
      listingId: ownedId,
      state: "rejected",
      submittedAt: "2026-09-08T01:00:00Z",
      decidedAt: "2026-09-08T02:30:00Z",
      reason: "<script>keep this as selectable text</script>",
      staff: "staff-secret-owned",
    });
    await makeCycle({
      listingId: otherListingId,
      state: "rejected",
      submittedAt: "2026-09-08T01:00:00Z",
      decidedAt: "2026-09-08T02:30:00Z",
      reason: "another host's reason",
      staff: "staff-secret-other",
    });
    await makeCycle({
      listingId: deletedListingId,
      state: "rejected",
      submittedAt: "2026-09-08T01:00:00Z",
      decidedAt: "2026-09-08T02:30:00Z",
      reason: "deleted parent's reason",
      staff: "staff-secret-deleted",
    });

    const byListing = await loadReviewHistoryByListing(testDb.db, ownerId);

    expect([...byListing.keys()]).toEqual([ownedId]);
    const owned = byListing.get(ownedId);
    expect(owned).toBeDefined();
    expect(owned?.reviewHistory.cycles).toHaveLength(1);
    expect(Object.keys(owned!.reviewHistory).toSorted()).toEqual(["cycles", "hasOlder"]);
    expect(Object.keys(owned!.reviewHistory.cycles[0]).toSorted()).toEqual(["events", "reason"]);
    expect(JSON.stringify(owned?.reviewHistory)).not.toMatch(
      /staff-secret|decidedBy|listingId|reviewId|hostId|\"state\"|rejected/,
    );
    expect(owned?.latestRejectionReason).toBe("<script>keep this as selectable text</script>");
  });

  it("maps one open and one decided cycle newest-first into truthful absolute lifecycle events", async () => {
    const ownerId = await makeHost("Lifecycle");
    const listingId = await makeListing(ownerId, "Lifecycle");
    await makeCycle({
      listingId,
      state: "approved",
      submittedAt: "2026-09-07T00:00:00Z",
      decidedAt: "2026-09-07T04:15:00Z",
    });
    await makeCycle({
      listingId,
      state: "pending",
      submittedAt: "2026-09-08T03:00:00Z",
    });

    const byListing = await loadReviewHistoryByListing(testDb.db, ownerId);
    expect(byListing.get(listingId)?.reviewHistory).toEqual({
      cycles: [
        {
          events: [`Submitted ${formatInstant("2026-09-08T03:00:00Z")}`, "Waiting"],
        },
        {
          events: [
            `Submitted ${formatInstant("2026-09-07T00:00:00Z")}`,
            "Waiting",
            `Approved ${formatInstant("2026-09-07T04:15:00Z")}`,
          ],
        },
      ],
      hasOlder: false,
    });
  });
});

describe("LVER-07 review history — bounded and total lifecycle mapping", () => {
  it("returns no entry for a current listing with zero review cycles", async () => {
    const ownerId = await makeHost("Zero");
    const listingId = await makeListing(ownerId, "Zero");

    const byListing = await loadReviewHistoryByListing(testDb.db, ownerId);

    expect(byListing.has(listingId)).toBe(false);
  });

  it("keeps five newest cycles, uses only row six as the older-history sentinel, and never loads row seven", async () => {
    const ownerId = await makeHost("Bounded");
    const listingId = await makeListing(ownerId, "Bounded");
    const submitted = Array.from({ length: 7 }, (_, index) =>
      `2026-08-${String(index + 1).padStart(2, "0")}T01:00:00Z`,
    );

    for (const [index, submittedAt] of submitted.entries()) {
      await makeCycle({
        id: `bounded-${index}`,
        listingId,
        state: "approved",
        submittedAt,
        decidedAt: submittedAt.replace("T01:", "T02:"),
      });
    }

    const history = (await loadReviewHistoryByListing(testDb.db, ownerId)).get(
      listingId,
    )?.reviewHistory;

    expect(history?.cycles).toHaveLength(5);
    expect(history?.hasOlder).toBe(true);
    expect(history?.cycles.map((cycle) => cycle.events[0])).toEqual(
      submitted
        .toReversed()
        .slice(0, 5)
        .map((instant) => `Submitted ${formatInstant(instant)}`),
    );
    expect(JSON.stringify(history)).not.toContain(formatInstant(submitted[0]));
  });

  it("orders tied submitted instants by descending review id", async () => {
    const ownerId = await makeHost("Tie");
    const listingId = await makeListing(ownerId, "Tie");
    const submittedAt = "2026-09-08T01:00:00Z";

    await makeCycle({
      id: "tie-a",
      listingId,
      state: "rejected",
      submittedAt,
      decidedAt: "2026-09-08T02:00:00Z",
      reason: "a second",
    });
    await makeCycle({
      id: "tie-z",
      listingId,
      state: "rejected",
      submittedAt,
      decidedAt: "2026-09-08T02:00:00Z",
      reason: "z wins",
    });

    const result = (await loadReviewHistoryByListing(testDb.db, ownerId)).get(listingId);
    expect(result?.reviewHistory.cycles.map((cycle) => cycle.reason)).toEqual([
      "z wins",
      "a second",
    ]);
    expect(result?.latestRejectionReason).toBe("z wins");
  });

  it("maps every persisted state and omits only a rejected cycle's missing optional reason", async () => {
    const ownerId = await makeHost("States");
    const listingId = await makeListing(ownerId, "States");
    const cycle = async (
      state: "pending" | "approved" | "rejected" | "withdrawn" | "grandfathered",
      day: number,
      decided: boolean,
    ) =>
      makeCycle({
        id: `state-${day}`,
        listingId,
        state,
        submittedAt: `2026-09-0${day}T01:00:00Z`,
        decidedAt: decided ? `2026-09-0${day}T02:00:00Z` : null,
        reason: state === "rejected" ? "   " : null,
      });

    await cycle("grandfathered", 1, false);
    await cycle("withdrawn", 2, true);
    await cycle("approved", 3, true);
    await cycle("rejected", 4, true);
    await cycle("pending", 5, false);

    const history = (await loadReviewHistoryByListing(testDb.db, ownerId)).get(
      listingId,
    )?.reviewHistory;

    expect(history).toEqual({
      cycles: [
        {
          events: [`Submitted ${formatInstant("2026-09-05T01:00:00Z")}`, "Waiting"],
        },
        {
          events: [
            `Submitted ${formatInstant("2026-09-04T01:00:00Z")}`,
            "Waiting",
            `Not approved ${formatInstant("2026-09-04T02:00:00Z")}`,
          ],
        },
        {
          events: [
            `Submitted ${formatInstant("2026-09-03T01:00:00Z")}`,
            "Waiting",
            `Approved ${formatInstant("2026-09-03T02:00:00Z")}`,
          ],
        },
        {
          events: [
            `Submitted ${formatInstant("2026-09-02T01:00:00Z")}`,
            "Waiting",
            `Review ended ${formatInstant("2026-09-02T02:00:00Z")}`,
          ],
        },
        { events: ["Listing was already live when reviews began."] },
      ],
      hasOlder: false,
    });
    expect(Object.hasOwn(history!.cycles[1], "reason")).toBe(false);
  });

  it("rejects impossible pending/decision pairings at the server boundary", async () => {
    const decidedOwnerId = await makeHost("MalformedDecided");
    const decidedListingId = await makeListing(decidedOwnerId, "MalformedDecided");
    await makeCycle({
      listingId: decidedListingId,
      state: "approved",
      submittedAt: "2026-09-08T01:00:00Z",
      decidedAt: null,
    });
    await expect(loadReviewHistoryByListing(testDb.db, decidedOwnerId)).rejects.toThrow(
      "approved cycle is missing decidedAt",
    );

    const pendingOwnerId = await makeHost("MalformedPending");
    const pendingListingId = await makeListing(pendingOwnerId, "MalformedPending");
    await makeCycle({
      listingId: pendingListingId,
      state: "pending",
      submittedAt: "2026-09-08T01:00:00Z",
      decidedAt: "2026-09-08T02:00:00Z",
    });
    await expect(loadReviewHistoryByListing(testDb.db, pendingOwnerId)).rejects.toThrow(
      "pending cycle unexpectedly has decidedAt",
    );
  });
});
