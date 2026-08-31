import "server-only";

// OPS-04 / D-246 — THE review queue. ONE list, both kinds interleaved, oldest first.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS IS, AND WHAT SHAPE IT DELIBERATELY IS NOT
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `/ops` is ONE page with ONE queue (D-246): hosts awaiting verification and listings awaiting
// review in the SAME list, sorted by how long each has been waiting, whatever kind it is. Not two
// arrays the page renders one after the other, not two tabs, not a kind filter, and not a summary
// row you click into to see the photos — 18-UI-SPEC § The queue row makes the row TERMINAL, so
// everything a reviewer needs to decide is selected HERE, once, rather than fetched per row.
//
// ⚠ THIS QUERY NEVER READS THE DURABLE TRAIL TABLE `recordAudit` WRITES TO, AND THAT IS A
// CORRECTNESS REQUIREMENT RATHER THAN A STYLE CHOICE. `recordAudit` SWALLOWS ITS OWN INSERT FAILURE
// BY DESIGN — its own words are "Losing a trail ROW is acceptable; losing the ACK is not", because
// it is awaited at 57 call sites and many sit inside `catch` blocks on money paths. So a queue built
// on that table would silently lose items with nothing going red anywhere: a host would sit
// unreviewed forever while the console looked empty and healthy. The DOMAIN tables —
// `host_verification`, `listing`, `listing_review` — are the source of truth for what is waiting,
// and each is written inside the same statement as the decision itself. Do not add that join here,
// not even for display.
//
// (The table's NAME is deliberately not spelled anywhere in this file. An acceptance grep asserts it
// appears ZERO times, and the very paragraph forbidding a string must not be what trips the gate —
// drizzle/0021's rule, restated at src/lib/validation/cancellation.ts:16-19.)
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE PII CONTRACT IS STRUCTURAL, NOT A COMMENT (src/lib/ops/alerts.ts:25-34)
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Every column is named EXPLICITLY. There is no `select()` over a whole table anywhere in this file,
// for the reason `listUnresolvedAlerts` states in one line: because the row TYPE has no field for a
// column, re-exporting it is a TYPE ERROR at every consumer rather than something a reviewer has to
// catch.
//
// ⚠ AND THE HOST BRANCH SELECTS NOTHING THAT COULD CARRY A DOCUMENT REFERENCE — because no such
// column exists (HVER-02 / D-206 / D-220: `host_verification` has no column for a document, an ID
// number or an image, pinned by the exact-column-set allow-list in
// tests/ops/verification-schema.test.ts). The `OpsQueueHostItem` type below therefore has NO FIELD
// for one either, which is what stops a later "just show the operator the ID" edit being a one-line
// change. 18-UI-SPEC is explicit that the row must not even imply a document is coming: no panel, no
// empty state for one, no disabled control. There is nothing to render and the type says so.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// D-249 — THE WAIT CLOCK, AND WHY THE LISTING BRANCH DOES NOT SIMPLY READ `listing.created_at`
// ════════════════════════════════════════════════════════════════════════════════════════════════
// A material edit pulls an `approved | grandfathered | rejected` listing back to `pending`
// (D-232/D-249), which is the normal marketplace loop — a host fixes the thing that was wrong and
// resubmits. A RESUBMISSION ENTERS THE QUEUE AT ITS RESUBMISSION TIME. Keying the clock on the
// listing's own `created_at` would let a host who resubmits repeatedly sit permanently at the top of
// an oldest-first queue, ahead of every first-time submitter — the line-jumping D-249 exists to
// forbid. So the clock is the LATEST `listing_review.submitted_at` for that listing, and
// `listing.created_at` is only the FALLBACK for a row that has no review history at all (a
// grandfathered listing pulled into review before any `listing_review` row was ever written).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORDERING, AND AN HONEST NOTE ABOUT THE TWO PARTIAL INDEXES
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `src/lib/db/schema.ts` declares `host_verification_queue_idx` and `listing_review_queue_idx`, both
// partial (`WHERE status = 'pending'` / `WHERE review_state = 'pending'`) and both ASC, and both
// carry a note that the console's `ORDER BY` must byte-match them — `src/lib/ops/alerts.ts:12-24`'s
// measurement, that an ORDER BY which does not match the index's DECLARED ordering forces a Sort
// node on top of the scan and the partial index stops being usable.
//
// Every `ORDER BY` in this file is ASC, matching both. What the indexes buy is the property they
// were built for: each branch stays O(pending) rather than O(catalogue) as the catalogue grows.
//
// ⚠ BUT THE UNION'S FINAL ORDER IS A SORT, BY CONSTRUCTION, AND CLAIMING OTHERWISE WOULD BE FALSE.
// Two heterogeneous sources cannot be merged in index order by any index, and the listing branch's
// clock is a COALESCE over a joined column rather than the indexed `listing.created_at` — D-249
// requires that and it is worth the sort. The merge below is therefore an explicit, stable,
// deterministic sort in JS over two already-ordered branches, at `O(pending log pending)` on a set
// bounded by how much work a human ops team has not yet done. Stated plainly so nobody later reads
// "byte-matches the index" as a promise the union does not keep.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY TWO STATEMENTS RATHER THAN ONE SQL `UNION ALL`
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The two kinds share exactly one column (the wait clock). A SQL union would have to pad ~15
// NULL-typed columns across both branches — which defeats the explicit-column contract above (every
// column would have to be spelled twice, once truthfully and once as a typed NULL), makes the row
// type a wide partial, and needs an explicit cast on every padded column to get past the same
// `SELECT`-side type resolution that produced the 42804 in drizzle/0026. The union that matters is
// the OUTPUT: `loadReviewQueue` returns ONE array in ONE order, so no caller can concatenate two
// lists in the wrong order — which is the property D-246 is actually asking for.

import { sql } from "drizzle-orm";

import type { DbConn } from "@/lib/availability/read-model";
import { db } from "@/lib/db";
import type { HostVerificationStatus } from "@/lib/db/schema";

/** One listing photo, exactly the three fields `PhotoGallery` reads (`PublicListingPhoto`). */
export type OpsQueuePhoto = {
  id: string;
  url: string;
  position: number;
};

/**
 * A host awaiting verification.
 *
 * The four `<dl>` rows 18-UI-SPEC specifies — Account since, Email confirmed, Listings waiting,
 * Submitted — plus the ids the decision actions need. NOTHING ELSE, and in particular no document,
 * no image and no ID number: see the header.
 */
export type OpsQueueHostItem = {
  kind: "host";
  userId: string;
  hostName: string;
  /** `user.created_at` — "Account since". NOT the wait clock. */
  accountCreatedAt: Date;
  emailVerified: boolean;
  /** How many of this host's listings are themselves waiting — the row's `meta` line. */
  listingsWaiting: number;
  /** THE WAIT CLOCK. `host_verification.created_at`, matching `host_verification_queue_idx`. */
  submittedAt: Date;
};

/**
 * A listing awaiting review.
 *
 * Carries every field 18-UI-SPEC § The evidence, per kind puts on the row — the address, the space
 * type, the capacity, the price, the photos, and the HOST's name plus their CURRENT verification
 * status. That last one is on this row deliberately even though it is not on this row's own record:
 * both terms of the sell-gate are needed to know whether approving this listing actually makes it
 * sellable (D-224), and a reviewer who cannot see the host term is guessing.
 */
export type OpsQueueListingItem = {
  kind: "listing";
  listingId: string;
  title: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  primarySpaceType: string | null;
  maxOccupancy: number | null;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  perHeadPriceCents: number | null;
  occupancyMode: string;
  currency: string;
  hostId: string;
  hostName: string;
  /** The OTHER term of the sell-gate. `'unverified'` is what NO ROW AT ALL reads as (fail-closed). */
  hostVerificationStatus: HostVerificationStatus;
  photos: OpsQueuePhoto[];
  /** THE WAIT CLOCK. Latest `listing_review.submitted_at`, else `listing.created_at` (D-249). */
  submittedAt: Date;
};

/**
 * One queue item. A DISCRIMINATED UNION on `kind`, so the row component branches on the discriminant
 * and a third kind fails to COMPILE rather than throwing in front of an operator
 * (18-UI-SPEC's `payout-state-badge.tsx:53-62` exhaustiveness lesson).
 */
export type OpsQueueItem = OpsQueueHostItem | OpsQueueListingItem;

/**
 * WHICH LISTINGS COUNT AS "AWAITING REVIEW", and why `draft` is excluded.
 *
 * D-240's backfill left every `draft` row at `review_state = 'pending'` — deliberately, so a draft
 * that publishes after this phase goes through review like any new listing. But a draft is not
 * SUBMITTED: the host is still building it, its title/address/capacity/price are all nullable and
 * routinely NULL mid-wizard, and 18-UI-SPEC's evidence `<dl>` would render a row of blanks with a
 * photo gallery that has no photos. Reviewing that is not a decision, it is guesswork — and on the
 * dev catalogue alone it is 32 rows of it against 19 real ones.
 *
 * `unlisted` IS included: the host has pulled it from sale but it is a finished listing, and D-240's
 * own words are "if a host brings it back, FitOut checks it" — reviewing it while it is down means
 * the check is already done when they relist, rather than the host waiting on ops at that moment.
 *
 * Soft-deleted rows are excluded for the obvious reason.
 */
const LISTING_QUEUE_PREDICATE = sql`
  l.review_state = 'pending'
  AND l.deleted_at IS NULL
  AND l.status <> 'draft'
`;

type HostRow = {
  userId: string;
  hostName: string;
  accountCreatedAt: Date | string;
  emailVerified: boolean;
  listingsWaiting: number;
  submittedAt: Date | string;
};

type ListingRow = Omit<OpsQueueListingItem, "kind" | "photos" | "submittedAt"> & {
  photos: OpsQueuePhoto[] | null;
  submittedAt: Date | string;
};

/**
 * MEASURED, NOT ASSUMED (2026-09-01): `dbConn.execute(sql\`…\`)` returns `timestamptz` columns as
 * RAW STRINGS, not `Date`s — probed against the isolated schema, which answered
 * `"2026-08-31 22:52:04.821009+00"` with `typeof === "string"`. That is why
 * `src/inngest/functions/payout-reconcile.ts:148` types its own `createdAt` as `Date | string`; it
 * only ever logs the value, so it never had to resolve the ambiguity. This module SORTS on the
 * value, so it must.
 *
 * The Postgres wire form is not strict ISO 8601 (a space instead of `T`, a two-digit offset with no
 * minutes). V8 happens to parse it through its LENIENT non-standard path, and relying on that is
 * exactly the kind of dependency that breaks on a runtime upgrade with no test to catch it — so the
 * value is normalised to strict ISO first and the lenient parse is kept only as a fallback for a
 * shape this normaliser does not recognise. `Date` inputs pass straight through, so the day the
 * driver starts parsing them nothing here changes.
 */
function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const iso = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
}

/**
 * THE review queue — one interleaved, oldest-first array over both kinds (OPS-04 / D-246).
 *
 * `dbConn` is injected with a `= db` default, the `alertStuckHeld(dbConn: DbConn = db)` idiom
 * (src/inngest/functions/payout-reconcile.ts:138): the RSC calls it with no argument, the
 * isolated-schema integration tests pass their own connection. The default is safe HERE — unlike
 * `src/lib/ops/grant.ts`, which has none because it is imported by a short-lived CLI that nothing
 * would close the singleton's connection for — because every caller of this module is a long-lived
 * server process that already holds the singleton.
 */
export async function loadReviewQueue(dbConn: DbConn = db): Promise<OpsQueueItem[]> {
  // ── The HOST branch. Explicit columns; nothing that could carry a document reference. ──────────
  const hostRows = (await dbConn.execute(sql`
    SELECT
      hv.user_id                     AS "userId",
      u.name                         AS "hostName",
      u.created_at                   AS "accountCreatedAt",
      u.email_verified               AS "emailVerified",
      COALESCE(lw.n, 0)              AS "listingsWaiting",
      hv.created_at                  AS "submittedAt"
    FROM host_verification hv
    JOIN "user" u ON u.id = hv.user_id
    -- The row's meta line: how many of THIS host's listings are themselves waiting. A lateral
    -- count rather than a GROUP BY, so the predicate stays byte-identical to the listing branch's
    -- (below) and the two can never drift into disagreeing about what "waiting" means.
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS n
      FROM listing l
      WHERE l.host_id = hv.user_id AND ${LISTING_QUEUE_PREDICATE}
    ) lw ON true
    -- Byte-matches host_verification_queue_idx's partial predicate.
    WHERE hv.status = 'pending'
    ORDER BY hv.created_at ASC
  `)) as unknown as HostRow[];

  // ── The LISTING branch. Everything 18-UI-SPEC's evidence <dl> and gallery need, selected once. ─
  const listingRows = (await dbConn.execute(sql`
    SELECT
      l.id                                        AS "listingId",
      l.title                                     AS "title",
      l.address_line1                             AS "addressLine1",
      l.address_line2                             AS "addressLine2",
      l.city                                      AS "city",
      l.region                                    AS "region",
      l.postal_code                               AS "postalCode",
      l.country                                   AS "country",
      l.primary_space_type::text                  AS "primarySpaceType",
      l.max_occupancy                             AS "maxOccupancy",
      l.hourly_rate_cents                         AS "hourlyRateCents",
      l.day_rate_cents                            AS "dayRateCents",
      l.per_head_price_cents                      AS "perHeadPriceCents",
      l.occupancy_mode::text                      AS "occupancyMode",
      l.currency                                  AS "currency",
      l.host_id                                   AS "hostId",
      u.name                                      AS "hostName",
      -- FAIL-CLOSED AT THE NULLABLE JOIN, exactly as the sell-gate's SQL twin does it
      -- (src/lib/search/query.ts, D-224): a host with NO host_verification row has never been
      -- checked, and 'unverified' is the value that reads as. A NULL here would render as a blank
      -- cell and quietly look like "fine".
      COALESCE(hv.status::text, 'unverified')     AS "hostVerificationStatus",
      -- D-249 — the wait clock. See the header.
      COALESCE(lr.submitted_at, l.created_at)     AS "submittedAt",
      ph.photos                                   AS "photos"
    FROM listing l
    JOIN "user" u ON u.id = l.host_id
    LEFT JOIN host_verification hv ON hv.user_id = l.host_id
    LEFT JOIN LATERAL (
      SELECT r.submitted_at
      FROM listing_review r
      WHERE r.listing_id = l.id
      ORDER BY r.submitted_at DESC
      LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object('id', p.id, 'url', p.url, 'position', p.position)
               ORDER BY p.position ASC
             ) AS photos
      FROM listing_photo p
      WHERE p.listing_id = l.id
    ) ph ON true
    WHERE ${LISTING_QUEUE_PREDICATE}
    ORDER BY COALESCE(lr.submitted_at, l.created_at) ASC
  `)) as unknown as ListingRow[];

  const items: OpsQueueItem[] = [
    ...hostRows.map(
      (r): OpsQueueHostItem => ({
        ...r,
        kind: "host",
        accountCreatedAt: toDate(r.accountCreatedAt),
        submittedAt: toDate(r.submittedAt),
      }),
    ),
    ...listingRows.map(
      ({ photos, ...rest }): OpsQueueListingItem => ({
        ...rest,
        kind: "listing",
        submittedAt: toDate(rest.submittedAt),
        // `json_agg` over an empty set is NULL, not '[]' — a listing with no photos yet is a real
        // state (and one a reviewer should see as such), so it becomes an empty array here rather
        // than a null the row component would have to guard.
        photos: photos ?? [],
      }),
    ),
  ];

  // THE INTERLEAVE. One array, strictly oldest-first ACROSS kinds — a host row sits BETWEEN two
  // listing rows whenever its wait clock falls between theirs. See the header for why this is a
  // sort and not an index walk.
  //
  // The id tie-break is not decoration: two items can share a `submitted_at` (a backfill, a
  // same-instant resubmission), and without it their relative order would depend on which branch
  // happened to be spread first — a stable sort over an arbitrary input order is still arbitrary.
  // A deterministic queue is what makes "the oldest thing is at the top" a testable claim.
  return items.sort((a, b) => {
    const delta = a.submittedAt.getTime() - b.submittedAt.getTime();
    if (delta !== 0) return delta;
    const aId = a.kind === "host" ? a.userId : a.listingId;
    const bId = b.kind === "host" ? b.userId : b.listingId;
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  });
}
