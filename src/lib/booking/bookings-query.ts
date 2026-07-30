// The owner-scoped bookings read model (MANAGE-01 / MANAGE-02 / HOST-02 · D-101..D-106) — the ONE place
// /bookings and /host/bookings get their rows from, so the booker and host lists can never drift on the
// partition, the derived status, or the paging key.
//
// Three load-bearing decisions this module encodes:
//
//   1. OWNER SCOPING LIVES IN THE `WHERE`, NEVER IN A POST-FILTER (Security V4 / T-07-28). The booker query
//      filters `booking.booker_id = $1`; the host query JOINs `listing` and filters `listing.host_id = $1`.
//      The `(host)` route group is NOT the gate — it is a layout, and a layout cannot scope a row set. A
//      foreign row must be UNSELECTABLE, not merely unrendered: anything that reaches the RSC has already
//      leaked (tests/security/bookings-owner-scope.test.ts asserts zero foreign rows on both sides and both
//      tabs). The `?listing=` filter is applied INSIDE the already-host-scoped predicate as an extra AND, so
//      a foreign listing id can only ever NARROW the result set, never widen it (T-07-30).
//
//   2. THE UPCOMING/PAST PARTITION USES THE DB CLOCK, not a JS boundary computed in the RSC (D-103 /
//      T-07-32). Both tab predicates are expressed against `now()` inside the same statement that reads the
//      rows, so the two tabs are provably disjoint and their union is the full set. A JS boundary would let
//      a booking straddling the instant appear in BOTH tabs or NEITHER, depending on which of the two page
//      renders was slower. For the same reason `completed` is derived in SQL (D-102) — see below.
//
//   3. KEYSET PAGING, NOT SKIP-COUNT PAGING — a deliberate DIVERGENCE from the Phase-4 search idiom
//      (`search-results.tsx` pages via `?page=`, a skip-count read). The Past tab accumulates without
//      bound, where skip-count paging degrades linearly AND drifts: a row changing status between page 1
//      and page 2 shifts every subsequent row, silently skipping or repeating one. The ordering key
//      `(starts_at, id)` is total (id breaks ties), stable, and index-supported by
//      `booking_booker_idx (booker_id, starts_at DESC)`. Search keeps its skip-count read because its
//      result set is a fixed catalogue snapshot; a bookings list is a mutating feed.
//
// D-102: the `completed` value is DERIVED at read time and NEVER written. The CASE below is the single
// place that derivation happens in SQL; `deriveDisplayStatus` (components/booking/booking-status.ts) is the
// same rule in TS for surfaces that already hold a row. The `completed` enum value therefore stays unused
// and the booking_no_overlap GiST EXCLUDE predicate is untouched.
//
// Pure/isomorphic: no client and no server directive, and `dbConn` is injected rather than imported, so an
// RSC binds the prod db and an integration test binds an isolated schema (the convention every queryable in
// src/lib follows — cf. read-model.ts, request-expiry.ts).

import { sql } from "drizzle-orm";

import type { DbConn } from "@/lib/availability/read-model";
import type { BookingDbStatus } from "@/components/booking/booking-status";
import type { PayoutLedgerState } from "@/components/host/payout-ledger-status";

/** Default rows per page. A named constant, never a literal at a call site (Phase-7 config discipline). */
export const BOOKINGS_PAGE_SIZE = 10;

/** Hard ceiling on a page, so a crafted query string can never request an unbounded read (T-07-31). */
export const BOOKINGS_MAX_PAGE_SIZE = 50;

/** Which half of the lifecycle is being read. Upcoming is the default when `?tab=` is absent (D-103). */
export type BookingsTab = "upcoming" | "past";

export type BookingListRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingDbStatus;
  /** DB-derived (D-102): CASE WHEN status='confirmed' AND ends_at<=now() THEN 'completed' ELSE status END */
  displayStatus: BookingDbStatus;
  /**
   * T8 (07-18): who ended the booking — `'booker' | 'host' | 'system' | null` (the cancelled_by enum, NULL
   * on rows no party retired). Threaded into BookingStatusBadge so a booker-cancelled `requested` hold
   * (stored `declined` + cancelled_by='booker' by cancelUnpaidHold) reads Cancelled, not Declined. No PII —
   * it only names the actor, and the row is already owner-scoped by the WHERE (T-07-18-01).
   */
  cancelledBy: string | null;
  /** The all-in CHARGED total (D-49) — what the booker actually paid. Rendered as `amountLabel`. */
  quotedTotalCents: number | null;
  /**
   * The booking's PERSISTED creation-time full-day snapshot (booking.full_day, drizzle 0016 / WR-06) —
   * the AUTHORITY `composeWhenLabelShort` renders "Full day" vs an hour range from. Nothing here
   * re-derives the mode from a price any more (08-15 / CR-01): the D-108 per-head surcharge is folded
   * into `spacePriceCents`, so a price comparison mislabels ordinary surcharged hourly bookings.
   */
  fullDay: boolean | null;
  /**
   * The booking's PERSISTED occupancy-mode snapshot (booking.open_capacity, drizzle 0021 / OC-03) — TRUE
   * for a drop-in day pass, whose startsAt/endsAt are the venue's opening/closing instants rather than a
   * reserved window. REQUIRED by `composeWhenLabelShort`, which renders it as `… · Drop-in pass` instead of
   * a sixteen-hour range (09-08). `NOT NULL DEFAULT false` in the DB, so this is always a real boolean.
   */
  openCapacity: boolean;
  /**
   * The frozen SPACE price (D-74) — the listing-priced portion, WITHOUT the booker-facing service fee.
   * Read by the formatter ONLY for pre-0016 rows (`fullDay IS NULL`), and only as a positive match
   * against the listing's day rate.
   */
  spacePriceCents: number | null;
  refundCents: number | null;
  currency: string;
  listingId: string;
  listingTitle: string | null;
  listingPhotoUrl: string | null;
  timezone: string;
  city: string | null;
  /** The listing's day rate — the formatter's pre-0016 positive-match reference, nothing else. */
  dayRateCents: number | null;
  /** Host view only — the booker's first name, or null when withheld. */
  bookerFirstName?: string | null;
  /** Host view only — the payout ledger state, scoped to kind='payout'. Null when there is no payout yet. */
  payoutState?: PayoutLedgerState | null;
};

export type BookingsPage = {
  rows: BookingListRow[];
  /** `"{startsAtIso}|{id}"` for the next page, or null when this page exhausted the set. */
  nextCursor: string | null;
};

/**
 * The row shape Postgres actually hands back. This is NOT cosmetic — `dbConn.execute` returns raw driver
 * rows, and a `timestamptz` arrives as Postgres TEXT (`2027-03-01 02:00:00+00`), not as a Date. Typing the
 * projection as `Date` and hoping would hand `date-fns` and `BookingStatusBadge` a string, which fails at
 * RUNTIME with data present and passes every compile-time check — the worst possible failure mode for a
 * page whose whole job is showing times.
 *
 * So each timestamp is selected as a STRICT ISO-8601 UTC string via to_char (see `isoUtc` below) and
 * converted once, here, at the boundary. Strict ISO because parsing Postgres' native text format relies on
 * implementation-defined leniency in the JS engine; ISO-8601 parsing is specified.
 */
type RawBookingRow = Omit<BookingListRow, "startsAt" | "endsAt"> & {
  startsAtIso: string;
  endsAtIso: string;
};

/**
 * `to_char` mask producing the exact shape `Date.prototype.toISOString` emits, so cursors round-trip.
 *
 * EXPORTED as the repo's single timestamp-boundary mask (07-07). Every module reading a `timestamptz`
 * through `dbConn.execute` needs this same conversion for the reason documented on `RawBookingRow`; a
 * second copy of the mask is a second thing to get subtly wrong (a dropped `.MS`, a missing `Z`), and the
 * failure mode is invisible until real rows exist. One mask, one hydration rule.
 */
export function isoUtc(column: string) {
  return sql`to_char(${sql.raw(column)} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

type ParsedCursor = { startsAtIso: string; id: string };

/**
 * ISO-8601 UTC instant, exactly as `Date.prototype.toISOString` emits it. Validated by SHAPE rather than by
 * parsing, so this module needs no JS clock at all — the string is handed straight to Postgres and cast
 * there, keeping `now()` the sole temporal authority in the statement.
 */
const CURSOR_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

/**
 * Parse `"{startsAtIso}|{id}"` DEFENSIVELY. `?cursor=` is attacker-controlled, so anything that is not
 * exactly the shape we emitted is treated as ABSENT — a malformed cursor yields page 1, never a 500
 * (T-07-31). Returning null rather than throwing is the whole point: a crafted string must be boring.
 */
function parseCursor(cursor: string | null): ParsedCursor | null {
  if (!cursor) return null;
  const separator = cursor.indexOf("|");
  if (separator <= 0) return null;
  const startsAtIso = cursor.slice(0, separator);
  const id = cursor.slice(separator + 1);
  if (!CURSOR_INSTANT.test(startsAtIso)) return null;
  if (id.length === 0 || id.length > 128) return null;
  return { startsAtIso, id };
}

/** Clamp an attacker-supplied page size into [1, BOOKINGS_MAX_PAGE_SIZE]; non-numeric falls back to default. */
function clampLimit(limit: number): number {
  const n = Number.isFinite(limit) ? Math.trunc(limit) : BOOKINGS_PAGE_SIZE;
  return Math.min(Math.max(n, 1), BOOKINGS_MAX_PAGE_SIZE);
}

/**
 * D-103 tab partition, expressed against the DB clock. The Past predicate is the exact logical COMPLEMENT
 * of the Upcoming one — written as `NOT (…)` rather than re-derived — so the two sets are disjoint and
 * exhaustive BY CONSTRUCTION and cannot drift apart under a later edit. Cancelled and declined bookings
 * live under Past even when their window is still in the future, because they are equally inert.
 */
function tabPredicate(tab: BookingsTab) {
  return tab === "upcoming"
    ? sql`b.ends_at > now() AND b.status NOT IN ('cancelled','declined')`
    : sql`NOT (b.ends_at > now() AND b.status NOT IN ('cancelled','declined'))`;
}

/**
 * D-102, in SQL, ONCE. Both queries splice this same fragment, so the booker list and the host list can
 * never disagree about whether a session is over. The boundary is `<=`, matching the half-open `[)` window
 * the double-booking constraint uses and `deriveDisplayStatus`'s TS implementation of the same rule.
 * Nothing here writes: `completed` exists only in the projection.
 */
const displayStatusExpr = sql`CASE WHEN b.status = 'confirmed' AND b.ends_at <= now() THEN 'completed' ELSE b.status::text END`;

/** Keyset predicate on the total ordering key `(starts_at, id)`; empty when there is no usable cursor. */
function keysetPredicate(tab: BookingsTab, cursor: ParsedCursor | null) {
  if (!cursor) return sql``;
  return tab === "upcoming"
    ? sql`AND (b.starts_at, b.id) > (${cursor.startsAtIso}::timestamptz, ${cursor.id}::text)`
    : sql`AND (b.starts_at, b.id) < (${cursor.startsAtIso}::timestamptz, ${cursor.id}::text)`;
}

/** Ordering must match the keyset direction exactly, or paging silently skips rows. */
function orderBy(tab: BookingsTab) {
  return tab === "upcoming"
    ? sql`ORDER BY b.starts_at ASC, b.id ASC`
    : sql`ORDER BY b.starts_at DESC, b.id DESC`;
}

/**
 * Trim the sentinel row, convert the boundary types, and emit the cursor. We read `limit + 1` rows: if the
 * extra one came back there IS a next page, and the cursor is the LAST KEPT row's key — never the
 * sentinel's, which would skip it.
 */
function toPage(raw: RawBookingRow[], limit: number): BookingsPage {
  const hasMore = raw.length > limit;
  const kept = hasMore ? raw.slice(0, limit) : raw;
  const last = kept[kept.length - 1];
  const rows: BookingListRow[] = kept.map((r) => ({
    ...r,
    startsAt: new Date(r.startsAtIso),
    endsAt: new Date(r.endsAtIso),
  }));
  return {
    rows,
    nextCursor: hasMore && last ? `${last.startsAtIso}|${last.id}` : null,
  };
}

/**
 * The DB clock, as a Date, for the surfaces that must thread `now` into a status derivation (D-102). Lives
 * here so no page re-derives the same cast: `SELECT now()` through `execute` is TEXT for exactly the reason
 * documented on RawBookingRow, and a page that forgot would crash on `.getTime()` with real data.
 */
export async function readDbNow(dbConn: DbConn): Promise<Date> {
  const [row] = (await dbConn.execute(sql`
    SELECT ${isoUtc("now()")} AS "nowIso"
  `)) as unknown as { nowIso: string }[];
  return new Date(row.nowIso);
}

/**
 * MANAGE-01 — the booker's own bookings. Owner-scoped on `booking.booker_id`; joins the listing for the
 * venue-local label inputs and its position-0 cover photo for the 48×48 row thumbnail, and selects
 * `refund_cents` so a cancelled row can render the D-79 sibling line.
 */
export async function queryBookerBookings(
  dbConn: DbConn,
  args: { bookerId: string; tab: BookingsTab; cursor: string | null; limit: number },
): Promise<BookingsPage> {
  const limit = clampLimit(args.limit);
  const cursor = parseCursor(args.cursor);

  const rows = (await dbConn.execute(sql`
    SELECT
      b.id,
      ${isoUtc("b.starts_at")} AS "startsAtIso",
      ${isoUtc("b.ends_at")} AS "endsAtIso",
      b.status::text AS "status",
      ${displayStatusExpr} AS "displayStatus",
      b.cancelled_by::text AS "cancelledBy",
      b.quoted_total_cents AS "quotedTotalCents",
      b.full_day AS "fullDay",
      b.open_capacity AS "openCapacity",
      b.space_price_cents AS "spacePriceCents",
      b.refund_cents AS "refundCents",
      b.currency,
      l.id AS "listingId",
      l.title AS "listingTitle",
      ph.url AS "listingPhotoUrl",
      l.timezone,
      l.city,
      l.day_rate_cents AS "dayRateCents"
    FROM booking b
    INNER JOIN listing l ON l.id = b.listing_id
    LEFT JOIN listing_photo ph ON ph.listing_id = l.id AND ph.position = 0
    WHERE b.booker_id = ${args.bookerId}
      AND ${tabPredicate(args.tab)}
      ${keysetPredicate(args.tab, cursor)}
    ${orderBy(args.tab)}
    LIMIT ${limit + 1}
  `)) as unknown as RawBookingRow[];

  return toPage(rows, limit);
}

/**
 * HOST-02 — every booking across the signed-in host's spaces. Owner-scoped on `listing.host_id` via the
 * INNER JOIN, so a host can never read another host's rows.
 *
 * The payout LEFT JOIN is scoped to payout-kind rows only (D-71 / T-07-33). That scope is MANDATORY: a
 * host_cancel_fee row is a signed DEBIT sharing the same booking_id, and unscoped it would render as this
 * booking's payout state — telling a host their cancelled booking is "Held" and about to pay out.
 */
export async function queryHostBookings(
  dbConn: DbConn,
  args: {
    hostId: string;
    tab: BookingsTab;
    listingId: string | null;
    cursor: string | null;
    limit: number;
  },
): Promise<BookingsPage> {
  const limit = clampLimit(args.limit);
  const cursor = parseCursor(args.cursor);
  // Applied INSIDE the host-scoped predicate — it can only narrow, never widen (T-07-30).
  const listingFilter = args.listingId ? sql`AND b.listing_id = ${args.listingId}` : sql``;

  const rows = (await dbConn.execute(sql`
    SELECT
      b.id,
      ${isoUtc("b.starts_at")} AS "startsAtIso",
      ${isoUtc("b.ends_at")} AS "endsAtIso",
      b.status::text AS "status",
      ${displayStatusExpr} AS "displayStatus",
      b.cancelled_by::text AS "cancelledBy",
      b.quoted_total_cents AS "quotedTotalCents",
      b.full_day AS "fullDay",
      b.open_capacity AS "openCapacity",
      b.space_price_cents AS "spacePriceCents",
      b.refund_cents AS "refundCents",
      b.currency,
      l.id AS "listingId",
      l.title AS "listingTitle",
      NULL::text AS "listingPhotoUrl",
      l.timezone,
      l.city,
      l.day_rate_cents AS "dayRateCents",
      u.first_name AS "bookerFirstName",
      p.state::text AS "payoutState"
    FROM booking b
    INNER JOIN listing l ON l.id = b.listing_id
    INNER JOIN "user" u ON u.id = b.booker_id
    LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
    WHERE l.host_id = ${args.hostId}
      ${listingFilter}
      AND ${tabPredicate(args.tab)}
      ${keysetPredicate(args.tab, cursor)}
    ${orderBy(args.tab)}
    LIMIT ${limit + 1}
  `)) as unknown as RawBookingRow[];

  return toPage(rows, limit);
}
