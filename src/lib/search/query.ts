// Two-stage true-availability search (SEARCH-01..05, RESEARCH Pattern 1 / D-34).
//
// Stage-1 (this file's SQL) narrows to a bounded candidate set using ONLY cheap, indexable predicates:
// the inlined bookable gate + a `::geography` metric radius + the single-combined category (type OR tag)
// + a price ceiling + a tz-independent "open this weekday" existence check, ordered nearest-first (or by
// price) with a stable created_at tiebreaker and a Load-more probe. Stage-2 reuses the SAME
// `getAvailability` read model the listing page uses to enforce the true free-window filter (D-34), so
// search results and the listing calendar structurally cannot diverge (never a second SQL availability
// predicate — RESEARCH Anti-Pattern).
//
// HIGHEST-RISK trap (RESEARCH Pitfall 1): `ST_DWithin`/`ST_Distance` on `geometry(Point,4326)` measure in
// DEGREES — a km radius then matches EVERYTHING. BOTH operands are cast `::geography` so the unit is
// meters; the `listing_location_geog_gist` functional index (0007) serves exactly this cast. Axis order is
// x=lng / y=lat (Pitfall 4): `ST_MakePoint(lng, lat)`. All user input is parameter-bound via Drizzle `sql`
// (never string-concatenated — Security V5).

import { sql } from "drizzle-orm";
import { TZDate } from "@date-fns/tz";
import { getAvailability, type DbConn } from "@/lib/availability/read-model";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import type { SearchParams } from "@/lib/validation/booking";

/**
 * One search result card (SEARCH-05). `distanceM` is meters from the search origin (NULL for the
 * no-origin default city view, D-30); the UI renders km. `primarySpaceType` is the enum's text value.
 */
export type SearchResultRow = {
  id: string;
  title: string | null;
  primarySpaceType: string | null;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  timezone: string;
  city: string | null;
  coverPhotoUrl: string | null;
  distanceM: number | null;
  /**
   * D-75 ALL-IN advertised rate parts (`["₱525/hr", "₱2,625/day"]`), fee-composed SERVER-SIDE here so the
   * card — which is rendered from a `"use client"` shell — performs zero money arithmetic and never needs
   * SERVICE_FEE_BPS in the browser bundle. Empty when the listing advertises neither rate.
   */
  allInRateParts: string[];
};

export type SearchResult = { results: SearchResultRow[]; hasMore: boolean };

/** Results per page for the Load-more probe (D-32). */
export const SEARCH_PAGE_SIZE = 20;

/** A picked venue-local calendar day. `month` is 1-based (getAvailability's convention). */
export type PickedDate = { year: number; month: number; day: number; iso: string };

/**
 * Strictly parse a `YYYY-MM-DD` search-param date into calendar components, or null when absent/malformed.
 * Strict on purpose: `date` is attacker-controllable and flows into a `::date` cast — a canonical literal
 * (never the raw string) is what reaches SQL, so a crafted value can never raise `22007` mid-query. When
 * this returns null the weekday pre-filter and the Stage-2 availability filter are both skipped (the
 * default browse view, D-30).
 */
export function parsePickedDate(date: string | undefined): PickedDate | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Round-trip guard: rejects impossible dates (e.g. 2026-02-31) by checking the Date recomposes exactly.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day, iso: `${m[1]}-${m[2]}-${m[3]}` };
}

/**
 * Parse a venue-local wall-clock `HH:mm` (or `HH`) search-param time into an on-the-hour integer 0–23, or
 * null when absent / malformed / off-the-hour (D-22). Like `date`, the time is attacker-controllable and
 * only ever interpreted per-venue in Stage-2 (never bound into SQL) — a non-conforming value simply
 * degrades to the date-only filter, never a crash.
 */
export function parseWindowHour(t: string | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(t);
  if (!m) return null;
  const hour = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (hour < 0 || hour > 23 || min !== 0) return null; // on-the-hour only (D-22)
  return hour;
}

// Raw postgres.js row (snake_case keys, exactly as aliased in the SELECT below).
type RawRow = {
  id: string;
  title: string | null;
  primary_space_type: string | null;
  hourly_rate_cents: number | null;
  day_rate_cents: number | null;
  timezone: string;
  city: string | null;
  cover_photo_url: string | null;
  distance_m: number | null;
};

function toRow(r: RawRow): SearchResultRow {
  const rates = { hourlyRateCents: r.hourly_rate_cents, dayRateCents: r.day_rate_cents };
  return {
    id: r.id,
    title: r.title,
    primarySpaceType: r.primary_space_type,
    ...rates,
    timezone: r.timezone,
    city: r.city,
    coverPhotoUrl: r.cover_photo_url,
    distanceM: r.distance_m === null ? null : Number(r.distance_m),
    // D-75: composed HERE (server-side) rather than in the card, so the browse rate and the checkout
    // breakdown are guaranteed to use the same SERVICE_FEE_BPS. See src/lib/booking/all-in-rate.ts.
    allInRateParts: allInRateParts(rates),
  };
}

/**
 * Search bookable listings (SEARCH-01..05). Stage-1 SQL narrows to a bounded, bookable-only candidate set
 * by radius / category / price / weekday; when a `date` is picked, Stage-2 reuses `getAvailability` (the
 * same read model as the listing calendar, D-34) to keep only listings with a real free window. `now` is
 * injectable for deterministic slot past/horizon state (mirrors getAvailability); it defaults to real time.
 */
export async function searchListings(
  db: DbConn,
  params: SearchParams,
  now: Date = new Date(),
): Promise<SearchResult> {
  const { lat, lng, radius, priceMax, category, sort, page } = params;

  const hasOrigin = lat !== undefined && lng !== undefined;
  // Axis order x=lng / y=lat (Pitfall 4). Cast to ::geography at each use site so the radius is metric.
  const originGeog = hasOrigin ? sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)` : null;
  const radiusMeters = radius * 1000;
  const picked = parsePickedDate(params.date);

  const distanceSelect = originGeog
    ? sql`ST_Distance(l.location::geography, ${originGeog}::geography)`
    : sql`NULL`;

  const orderBy = sort === "price"
    ? sql`l.hourly_rate_cents ASC, l.created_at DESC`
    : sql`distance_m ASC NULLS LAST, l.created_at DESC`; // no-origin ⇒ all distance NULL ⇒ created_at DESC (D-30)

  // Stage-2 (per-candidate availability) can drop candidates below the page size, so over-fetch when a
  // date is picked (Pitfall 8 / A5); otherwise a simple +1 "has more" probe suffices.
  const needsAvailabilityFilter = picked !== null;
  const fetchLimit = needsAvailabilityFilter ? SEARCH_PAGE_SIZE * 2 + 1 : SEARCH_PAGE_SIZE + 1;
  const offset = page * SEARCH_PAGE_SIZE;

  const rows = (await db.execute(sql`
    SELECT
      l.id, l.title, l.primary_space_type, l.hourly_rate_cents, l.day_rate_cents, l.timezone, l.city,
      (SELECT lp.url FROM listing_photo lp
         WHERE lp.listing_id = l.id ORDER BY lp.position ASC LIMIT 1) AS cover_photo_url,
      ${distanceSelect} AS distance_m
    FROM listing l
    JOIN "user" u ON u.id = l.host_id
    LEFT JOIN host_payout hp ON hp.user_id = u.id
    -- Inlined deriveBookable (src/lib/bookability.ts:16-21) — KEEP IN SYNC (Pitfall 5):
    --   status==='published' && host.emailVerified && host.payoutsEnabled  (+ non-deleted)
    WHERE l.status = 'published'
      AND l.deleted_at IS NULL
      AND u.email_verified = true
      AND COALESCE(hp.payouts_enabled, false) = true
      ${originGeog ? sql`AND ST_DWithin(l.location::geography, ${originGeog}::geography, ${radiusMeters})` : sql``}
      ${category ? sql`AND (
        l.primary_space_type::text = ${category}
        OR EXISTS (SELECT 1 FROM listing_activity_tag t WHERE t.listing_id = l.id AND t.tag = ${category})
      )` : sql``}
      ${priceMax !== undefined ? sql`AND l.hourly_rate_cents <= ${priceMax}` : sql``}
      ${picked ? sql`AND EXISTS (SELECT 1 FROM operating_hours oh
        WHERE oh.listing_id = l.id AND oh.day_of_week = EXTRACT(DOW FROM ${picked.iso}::date))` : sql``}
    ORDER BY ${orderBy}
    LIMIT ${fetchLimit} OFFSET ${offset}
  `)) as unknown as RawRow[];

  const candidates = rows.map(toRow);

  // No picked date ⇒ the default browse view returns Stage-1 candidates directly (D-30).
  if (!needsAvailabilityFilter) {
    return {
      results: candidates.slice(0, SEARCH_PAGE_SIZE),
      hasMore: candidates.length > SEARCH_PAGE_SIZE,
    };
  }

  // Stage-2: reuse the SAME getAvailability read model the listing calendar uses (D-34) — never a second
  // SQL availability predicate (RESEARCH Anti-Pattern). Interpret the picked date/time in EACH candidate's
  // OWN venue tz: getAvailability derives the day from `picked`; the optional window is resolved below via
  // the same TZDate→epoch convention as slots.ts, so the same local wall clock lands per-venue.
  const startHour = parseWindowHour(params.start);
  const endHour = parseWindowHour(params.end);
  const hasWindow = startHour !== null && endHour !== null && endHour > startHour;

  const kept: SearchResultRow[] = [];
  for (const c of candidates) {
    const avail = await getAvailability(db, c.id, picked, now);
    if (hasWindow) {
      const winStartUtc = new Date(
        new TZDate(picked.year, picked.month - 1, picked.day, startHour, 0, 0, avail.timezone).getTime(),
      ).toISOString();
      const winEndUtc = new Date(
        new TZDate(picked.year, picked.month - 1, picked.day, endHour, 0, 0, avail.timezone).getTime(),
      ).toISOString();
      // On-the-hour slots fully inside the picked window. A genuine offer needs at least one and EVERY one
      // bookable — state==='available' ⟹ freeUnits>=1 AND future AND within-horizon (same rule as date-only).
      const inWindow = avail.slots.filter((s) => s.startUtc >= winStartUtc && s.endUtc <= winEndUtc);
      if (inWindow.length > 0 && inWindow.every((s) => s.state === "available")) kept.push(c);
    } else if (avail.slots.some((s) => s.state === "available")) {
      // date-only: kept iff any hour that day is bookable.
      kept.push(c);
    }
  }

  return { results: kept.slice(0, SEARCH_PAGE_SIZE), hasMore: kept.length > SEARCH_PAGE_SIZE };
}
