import "server-only";

import { sql } from "drizzle-orm";

import type { DbConn } from "@/lib/availability/read-model";

const VISIBLE_CYCLE_LIMIT = 5;
const QUERY_CYCLE_LIMIT = VISIBLE_CYCLE_LIMIT + 1;

export type ReviewCycleDisplay = {
  events: string[];
  reason?: string;
};

/** The complete browser boundary for one listing's review history. */
export type ListingReviewHistory = {
  cycles: ReviewCycleDisplay[];
  hasOlder: boolean;
};

export type ListingReviewHistoryResult = {
  reviewHistory: ListingReviewHistory;
  latestRejectionReason: string | null;
};

type ReviewHistoryRow = {
  listingId: string;
  state: string;
  reason: string | null;
  submittedAt: Date | string;
  decidedAt: Date | string | null;
  cycleNumber: number | string | bigint;
};

function parseInstant(value: Date | string, field: "submittedAt" | "decidedAt"): Date {
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value;
    throw new Error(`listing_review.${field} is not a valid instant`);
  }

  const iso = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`listing_review.${field} is not a valid instant`);
  }
  return parsed;
}

function formatHostInstant(value: Date | string, field: "submittedAt" | "decidedAt"): string {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(parseInstant(value, field));
}

function requireDecision(row: ReviewHistoryRow): Date | string {
  if (row.decidedAt === null) {
    throw new Error(`listing_review ${row.state} cycle is missing decidedAt`);
  }
  return row.decidedAt;
}

function toDisplayCycle(row: ReviewHistoryRow): ReviewCycleDisplay {
  if (row.state === "grandfathered") {
    return { events: ["Listing was already live when reviews began."] };
  }

  const events = [`Submitted ${formatHostInstant(row.submittedAt, "submittedAt")}`, "Waiting"];

  if (row.state === "pending") {
    if (row.decidedAt !== null) {
      throw new Error("listing_review pending cycle unexpectedly has decidedAt");
    }
    return { events };
  }

  const decidedAt = formatHostInstant(requireDecision(row), "decidedAt");
  if (row.state === "approved") {
    return { events: [...events, `Approved ${decidedAt}`] };
  }
  if (row.state === "rejected") {
    const reason = row.reason && row.reason.trim().length > 0 ? row.reason : undefined;
    return {
      events: [...events, `Not approved ${decidedAt}`],
      ...(reason === undefined ? {} : { reason }),
    };
  }
  if (row.state === "withdrawn") {
    return { events: [...events, `Review ended ${decidedAt}`] };
  }

  throw new Error(`Unsupported listing_review state: ${row.state}`);
}

/**
 * Load the newest review cycles for every non-deleted listing owned by `hostId` in one statement.
 *
 * The owner/deleted boundary is enforced in SQL before any history row can cross into application
 * memory. The projection intentionally excludes review ids, staff ids, and raw lifecycle states;
 * those values are implementation details, not host-facing data. Six rows per parent are enough to
 * return five visible cycles plus a truthful "older history exists" sentinel without loading an
 * unbounded trail.
 */
export async function loadReviewHistoryByListing(
  dbConn: DbConn,
  hostId: string,
): Promise<Map<string, ListingReviewHistoryResult>> {
  const rows = (await dbConn.execute(sql`
    WITH ranked AS (
      SELECT
        r.listing_id AS "listingId",
        r.state::text AS "state",
        r.reason AS "reason",
        r.submitted_at AS "submittedAt",
        r.decided_at AS "decidedAt",
        row_number() OVER (
          PARTITION BY r.listing_id
          ORDER BY r.submitted_at DESC, r.id DESC
        ) AS cycle_number
      FROM listing_review r
      INNER JOIN listing l ON l.id = r.listing_id
      WHERE l.host_id = ${hostId}
        AND l.deleted_at IS NULL
    )
    SELECT
      "listingId",
      "state",
      "reason",
      "submittedAt",
      "decidedAt",
      cycle_number AS "cycleNumber"
    FROM ranked
    WHERE cycle_number <= ${QUERY_CYCLE_LIMIT}
    ORDER BY "listingId" ASC, cycle_number ASC
  `)) as unknown as ReviewHistoryRow[];

  const byListing = new Map<string, ListingReviewHistoryResult>();
  const latestRejectedObserved = new Set<string>();

  for (const row of rows) {
    let entry = byListing.get(row.listingId);
    if (!entry) {
      entry = {
        reviewHistory: { cycles: [], hasOlder: false },
        latestRejectionReason: null,
      };
      byListing.set(row.listingId, entry);
    }

    const cycleNumber = Number(row.cycleNumber);
    if (!Number.isSafeInteger(cycleNumber) || cycleNumber < 1) {
      throw new Error("listing_review rank is invalid");
    }

    if (row.state === "rejected" && !latestRejectedObserved.has(row.listingId)) {
      latestRejectedObserved.add(row.listingId);
      entry.latestRejectionReason = row.reason && row.reason.trim().length > 0 ? row.reason : null;
    }

    if (cycleNumber <= VISIBLE_CYCLE_LIMIT) {
      entry.reviewHistory.cycles.push(toDisplayCycle(row));
    } else {
      entry.reviewHistory.hasOlder = true;
    }
  }

  return byListing;
}
