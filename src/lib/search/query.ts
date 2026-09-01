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
import { isFitoutChecked } from "@/lib/listing/fitout-check";
import type { SearchParams } from "@/lib/validation/booking";
import { parsePickedDate, parseWindowHour } from "./window-params";

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
  /** Phase-9 (OC-01). Which arbiter governs the listing; the card forks its badge, price line and link
   *  params on it — never on the accident of a NULL rate column (a drop-in listing may still carry one). */
  occupancyMode: "exclusive" | "open_capacity";
  /** Phase-9 (D-125). The listing's per-person day-pass BASE price; null on every exclusive listing. */
  perHeadPriceCents: number | null;
  /**
   * Server-derived scarcity for the PICKED date, or null when no date is in play or the listing is
   * exclusive. OC-12: with no date chosen a drop-in card shows the badge and the rate and NO number at all.
   * `state` is computed by the read model from a NON-PUBLIC server threshold — never here and never in the
   * card (OC-11 / 09-UI-SPEC "The state must be SERVER-DERIVED").
   */
  spots: { remaining: number; cap: number; state: "open" | "low" | "full" } | null;
  /**
   * HVER-05 / D-212 — has a person at FitOut checked BOTH this host's account and this listing?
   *
   * A finished BOOLEAN, reduced by `isFitoutChecked` in `toRow` below and never in the card. The card
   * is rendered from a `"use client"` shell, so shipping the two statuses to it would put the D-212
   * distinction in the browser — where a component that has been told which rows are grandfathered is
   * a component that can badge them. It is never told.
   */
  fitoutChecked: boolean;
};

export type SearchResult = { results: SearchResultRow[]; hasMore: boolean };

/** Results per page for the Load-more probe (D-32). */
export const SEARCH_PAGE_SIZE = 20;

// The two searched-window param parsers MOVED to `./window-params` and are RE-EXPORTED here, so every
// existing `from "@/lib/search/query"` import keeps working unchanged. They had to move because
// `src/lib/validation/booking.ts` — which is in the CLIENT graph via `search-bar.tsx` — now canonicalises
// the listing page's searched window through them, and this module transitively imports the guarded,
// `server-only` read model. The measured build failure and the full argument live in `./window-params`.
// One implementation, two importers; never a second copy of "on the hour".
export { parsePickedDate, parseWindowHour } from "./window-params";
export type { PickedDate } from "./window-params";

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
  occupancy_mode: string | null;
  per_head_price_cents: number | null;
  // HVER-05 / D-212. Both terms of the check rule, and NEITHER is a filter — see the SELECT's own
  // comment, which is where the reason for reading them at all is written down.
  review_state: string | null;
  host_verification_status: string | null;
};

function toRow(r: RawRow): SearchResultRow {
  const rates = { hourlyRateCents: r.hourly_rate_cents, dayRateCents: r.day_rate_cents };
  // The column is NOT NULL DEFAULT 'exclusive', so the coalesce is belt-and-braces for a hand-written
  // fixture — it names the same thing the column default names, never a client-supplied flag.
  const occupancyMode = (r.occupancy_mode ?? "exclusive") as SearchResultRow["occupancyMode"];
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
    // Phase-9: the two extra fields select the `/person` branch for a drop-in listing (09-UI-SPEC § 4).
    allInRateParts: allInRateParts({
      ...rates,
      perHeadPriceCents: r.per_head_price_cents,
      occupancyMode,
    }),
    occupancyMode,
    perHeadPriceCents: r.per_head_price_cents,
    // Stage-2 fills this for an open listing on a picked date; it stays null everywhere else (OC-12).
    spots: null,
    // HVER-05 / D-212 — reduced HERE, server-side, for `allInRateParts`'s reason three fields up:
    // composing on the server is what guarantees two surfaces cannot disagree. The listing page runs
    // the SAME `isFitoutChecked` over the same two columns, so a card and the page it links to can
    // never differ about whether FitOut checked the listing. The card receives the answer only.
    fitoutChecked: isFitoutChecked(r.host_verification_status, r.review_state),
  };
}

/**
 * Caller-side bounds on ONE search. Optional everywhere; the default browse and Load-more paths pass
 * nothing and are byte-for-byte the query they always were.
 */
export type SearchListingsOptions = {
  /**
   * Cap Stage-1's `LIMIT`, and with it the number of Stage-2 availability reads.
   *
   * WHAT THIS IS FOR, AND THE MEASURED NUMBER BEHIND IT (plan 12-12 / RESEARCH assumption A7).
   * Stage-2 below is a SEQUENTIAL per-candidate `getAvailability` loop, and `fetchLimit` derives to
   * **41** whenever a date is picked. That is the right budget for a page of 20 results with a
   * Load-more probe; it is the wrong budget for the STATE-03 relaxation ladder, whose rungs each
   * render at most SIX cards inside a band. Without this bound one zero-result search could pay for
   * up to 4 × 41 sequential availability reads to display 6 cards (T-12-12-LADDERCOST).
   *
   * A bound also moves the page size with it — `pageSize` below is `fetchLimit - 1`, so a bound of 7
   * buys exactly six results plus the has-more probe. A bound that shrank the LIMIT while leaving the
   * slice at 20 would have made `hasMore` permanently false for a reason nothing stated.
   */
  fetchLimit?: number;
};

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
  options: SearchListingsOptions = {},
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

  // Phase-9: the listing's ADVERTISED unit price, whichever unit it sells in — hourly for an exclusive
  // listing, per-person for a drop-in (D-125). Written ONCE and used by BOTH the price filter and the price
  // sort, so a drop-in listing can never be invisible to one and mis-ranked by the other.
  //
  // THE TRAP THIS CLOSES: the filter used to read `l.hourly_rate_cents <= ${priceMax}` directly. That column
  // is NULL on an open-capacity listing that prices only per head, and `NULL <= n` is NULL, not false — so a
  // price ceiling SILENTLY DELETED every drop-in listing from results, in both directions, while the same
  // expression on the ORDER BY buried them last. Comparing an hourly rate against a per-person day pass is
  // imperfect, and deliberately so: ranking a drop-in listing approximately is strictly better than making
  // it invisible. The `::text` cast on the enum matches the shipped `l.primary_space_type::text` idiom
  // below; this is a RUNTIME query, so naming an enum value here carries no 55P04 migration hazard.
  const effectivePriceSql = sql`(CASE WHEN l.occupancy_mode::text = 'open_capacity'
                                      THEN l.per_head_price_cents ELSE l.hourly_rate_cents END)`;

  const orderBy = sort === "price"
    ? sql`${effectivePriceSql} ASC, l.created_at DESC`
    : sql`distance_m ASC NULLS LAST, l.created_at DESC`; // no-origin ⇒ all distance NULL ⇒ created_at DESC (D-30)

  // Stage-2 (per-candidate availability) can drop candidates below the page size, so over-fetch when a
  // date is picked (Pitfall 8 / A5); otherwise a simple +1 "has more" probe suffices.
  const needsAvailabilityFilter = picked !== null;
  const derivedFetchLimit = needsAvailabilityFilter ? SEARCH_PAGE_SIZE * 2 + 1 : SEARCH_PAGE_SIZE + 1;
  // A caller-supplied bound can only ever SHRINK the fetch (`Math.min`) — a caller cannot widen the
  // page or make the loop below longer than it already is. `Math.max(2, …)` keeps `pageSize` at one or
  // more so a bound of 1 or 0 cannot produce an empty result set that reads as "nothing matched".
  const fetchLimit =
    options.fetchLimit === undefined
      ? derivedFetchLimit
      : Math.min(derivedFetchLimit, Math.max(2, Math.trunc(options.fetchLimit)));
  const pageSize = options.fetchLimit === undefined ? SEARCH_PAGE_SIZE : fetchLimit - 1;
  const offset = page * SEARCH_PAGE_SIZE;

  const rows = (await db.execute(sql`
    SELECT
      l.id, l.title, l.primary_space_type, l.hourly_rate_cents, l.day_rate_cents, l.timezone, l.city,
      l.occupancy_mode, l.per_head_price_cents,
      -- HVER-05 / D-212 — SELECTED PURELY TO TELL 'approved' FROM 'grandfathered'. THESE TWO COLUMNS
      -- ARE NOT A FILTER AND CAN NEVER BECOME ONE HERE. The WHERE clause below already admits exactly
      -- the two values on each of them, so every row this query returns is 'approved' or
      -- 'grandfathered' on both — reading them changes nothing about WHICH rows come back. They are
      -- read for one purpose: deciding whether the card may say a person at FitOut checked this
      -- listing (isFitoutChecked, in toRow).
      -- ⚠ DELETING EITHER AS "REDUNDANT WITH THE WHERE CLAUSE" SILENTLY BADGES THE ENTIRE
      -- GRANDFATHERED CATALOGUE — rows marked by a migration (D-207) that nobody has ever checked, and
      -- the majority of the catalogue on day one. That is the whole reason this comment is here rather
      -- than nowhere.
      l.review_state, hv.status AS host_verification_status,
      (SELECT lp.url FROM listing_photo lp
         WHERE lp.listing_id = l.id ORDER BY lp.position ASC LIMIT 1) AS cover_photo_url,
      ${distanceSelect} AS distance_m
    FROM listing l
    JOIN "user" u ON u.id = l.host_id
    LEFT JOIN host_payout hp ON hp.user_id = u.id
    -- LEFT, not INNER, and for the same reason as host_payout above: host_verification is 1:1 to user but
    -- is NOT created with the user, so a host with NO ROW is the common case. An INNER JOIN here would
    -- silently delete every un-checked host's listings from search for a reason nothing names.
    LEFT JOIN host_verification hv ON hv.user_id = u.id
    -- Inlined deriveBookable (src/lib/bookability.ts) — KEEP IN SYNC (Pitfall 5). All SIX terms:
    --   status==='published' && listing.hasOperatingHours
    --   && listing.reviewState in (approved, grandfathered)          -- LVER-01, phase 18
    --   && host.emailVerified && host.payoutsEnabled
    --   && host.verificationStatus in (approved, grandfathered)      -- HVER-03 / ENF-01, phase 18
    --   (+ non-deleted, which is a SQL-only term deriveBookable deliberately does not model)
    -- NOTE: no backticks or dollar-braces in comments inside this template literal — they would end the
    -- template / open an interpolation. The byte-unchanged git-diff gate that used to protect this
    -- pairing is retired; the drift guard is now tests/search/bookable-gate.test.ts, which imports
    -- deriveBookable and asserts this query's result set EQUALS the predicate's over shared fixtures.
    WHERE l.status = 'published'
      AND l.deleted_at IS NULL
      AND u.email_verified = true
      AND COALESCE(hp.payouts_enabled, false) = true
      -- OPS APPROVAL IS A TERM OF THE SELL GATE ITSELF (phase 18, D-224/D-226). These two lines are the
      -- reason a pending listing needs no separate hiding rule anywhere in search: the row never leaves
      -- Postgres (D-228). Both are enumerated as POSITIVE literals, never as a not-equals, so a value
      -- added to either enum later fails by default instead of passing by accident.
      AND l.review_state IN ('approved', 'grandfathered')
      -- COALESCE for the same fail-closed reason as COALESCE(hp.payouts_enabled, false) one line up: a
      -- host with NO host_verification row is UNVERIFIED, never verified. Note that 'suspended' fails
      -- here too, which is why suspension is enforced by this one read and needs no second check
      -- anywhere (D-222). The ::text cast matches the shipped l.primary_space_type::text idiom; this is
      -- a RUNTIME query, so naming enum values here carries no 55P04 migration hazard.
      AND COALESCE(hv.status::text, 'unverified') IN ('approved', 'grandfathered')
      -- THE SELL GATE: does this listing have a calendar AT ALL (v1.0 audit finding #4). UNCONDITIONAL,
      -- and that is the entire point — see the per-day EXISTS below, with which it deliberately coexists.
      AND EXISTS (SELECT 1 FROM operating_hours oh_any WHERE oh_any.listing_id = l.id)
      ${originGeog ? sql`AND ST_DWithin(l.location::geography, ${originGeog}::geography, ${radiusMeters})` : sql``}
      ${category ? sql`AND (
        l.primary_space_type::text = ${category}
        OR EXISTS (SELECT 1 FROM listing_activity_tag t WHERE t.listing_id = l.id AND t.tag = ${category})
      )` : sql``}
      ${priceMax !== undefined ? sql`AND ${effectivePriceSql} <= ${priceMax}` : sql``}
      -- The per-request FILTER, distinct from the sell gate above and left exactly as it was: is the
      -- venue open on the day THIS booker picked. Two clauses, two jobs — oh_any asks whether the
      -- listing may be sold at all, oh asks whether it is open on one date. The old term's
      -- CONDITIONALITY is precisely why a no-hours listing survived until now: on the default no-date
      -- browse view it is not emitted at all, so nothing anywhere excluded an empty-calendar listing.
      ${picked ? sql`AND EXISTS (SELECT 1 FROM operating_hours oh
        WHERE oh.listing_id = l.id AND oh.day_of_week = EXTRACT(DOW FROM ${picked.iso}::date))` : sql``}
    ORDER BY ${orderBy}
    LIMIT ${fetchLimit} OFFSET ${offset}
  `)) as unknown as RawRow[];

  const candidates = rows.map(toRow);

  // No picked date ⇒ the default browse view returns Stage-1 candidates directly (D-30).
  if (!needsAvailabilityFilter) {
    return {
      results: candidates.slice(0, pageSize),
      hasMore: candidates.length > pageSize,
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

    // ── PHASE-9 FORK (OC-12). A drop-in listing matches on DATE ONLY. `hasWindow` is deliberately NOT
    // consulted below: the searched start/end hours are IGNORED because a pass is not an hour window, and
    // filtering (or captioning) one by an hour range would advertise a reservation the booker is not buying
    // (09-UI-SPEC O2). Kept iff the date is open for business and still has at least one spot — so a `full`
    // date can never reach a search card (09-UI-SPEC "The three chip states").
    //
    // `avail.openCapacity` is the SAME read model the listing page renders (D-34) — this branch adds no SQL
    // of its own, exactly as the file header requires.
    if (avail.occupancyMode === "open_capacity") {
      const oc = avail.openCapacity; // null when the venue is closed that weekday
      if (oc && oc.bookable && oc.remaining >= 1) {
        kept.push({ ...c, spots: { remaining: oc.remaining, cap: oc.cap, state: oc.state } });
      }
      continue;
    }

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

  return { results: kept.slice(0, pageSize), hasMore: kept.length > pageSize };
}
