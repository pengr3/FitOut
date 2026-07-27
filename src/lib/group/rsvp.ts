// The group READ layer (GROUP-02/GROUP-03/GROUP-04) — the organizer's roster + headcount, and the public
// token lookup that the invite page and `submitRsvp` both resolve through. Every mutation lives elsewhere
// (the D-112 seat-claim in seat-claim.ts, the actions in app/actions/group.ts); this module only reads.
//
// THREE PROPERTIES, all load-bearing, all proven by tests/group/group-owner-scope.test.ts:
//
//   1. OWNER SCOPE IS IN THE WHERE, NEVER A POST-FILTER (T-08-14 / Security V4). Every organizer read takes
//      the organizer's id and joins `booking.booker_id = ${organizerId}` INSIDE the statement, so a foreign
//      group is UNREADABLE rather than merely unrendered. The action's own gate is the second layer, not the
//      first — a read that returned the row and left the filtering to a caller would be one refactor away
//      from leaking someone else's guest list. Mirrors notifications.ts:listRecent / bookings-query.ts.
//
//   2. NO ENUMERATION ORACLE ON THE TOKEN (T-08-17). `getGroupByToken` returns the byte-identical
//      `GROUP_INACTIVE` value for an UNKNOWN token, a REGENERATED (replaced) token and a VOIDED group. The
//      invite link is a shared, guessable-LENGTH bearer credential; a 404 that differed from a "revoked"
//      state would let someone walking the token space learn which tokens name a real group. It is one
//      frozen object so the two paths cannot drift apart by a later edit to one of them.
//
//   3. `db.execute` HANDS BACK `timestamptz` AS POSTGRES TEXT, NOT AS A Date (the repo-wide 07-06 contract
//      documented on bookings-query.ts:RawBookingRow). Every timestamp below is therefore selected through
//      the shared `isoUtc` mask and hydrated ONCE, here, at the boundary. A `as unknown as` cast over a
//      Date-typed projection compiles, lints and builds cleanly and then hands the renderer a string on the
//      first real row.
//
// PRIVACY. The organizer roster deliberately returns `hasEmail: boolean` and NEVER the attendee's address:
// the roster is a display surface (name + Guest/Account tag + answer, 08-UI-SPEC §2) and an address on it
// would be a durable copy of personal data the surface has no use for (T-07-38 discipline). The ONE read
// that does carry addresses is `listReachableYesAttendees`, whose whole job is to feed a send.

import { sql } from "drizzle-orm";

import type { DbConn } from "@/lib/availability/read-model";
import { isoUtc } from "@/lib/booking/bookings-query";

/**
 * Hard ceiling on the roster read. A group cannot exceed its `capacity_snapshot`, so this is not a paging
 * device — it is the same "a crafted call can never request an unbounded scan" bound `listRecent` carries.
 */
export const ROSTER_MAX_LIMIT = 200;

/**
 * The de-dup + opt-in-email KEY (D-117). Lowercased and trimmed so `Ann@Example.com ` and `ann@example.com`
 * are ONE identity — which is what makes the `rsvp_group_email_uq` partial unique index mean "one person",
 * and what makes the guest-email rate-limit budget un-dodgeable by re-casing the address.
 *
 * Returns null for a blank/absent address so callers have exactly one "no address" branch to handle: a
 * name-only guest (D-117) must never be de-duped and must never be emailed.
 */
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const normalized = raw.trim().toLowerCase();
  return normalized === "" ? null : normalized;
}

/** The public invite view: everything `/invite/[token]` and `submitRsvp` need, or the calm inactive state. */
export type GroupByToken =
  | {
      active: true;
      groupId: string;
      bookingId: string;
      /** The token this view was resolved by — the credential the attendee already holds. */
      accessToken: string;
      /** The D-111 cap AUTHORITY (never live listing.maxOccupancy). */
      capacitySnapshot: number;
      /** Confirmed 'yes' count — a COURTESY for the "full" UI state. The FOR UPDATE claim is the gate. */
      confirmedYes: number;
      /** D-120, evaluated by the POSTGRES clock inside the query: RSVPs close when the session starts. */
      rsvpClosed: boolean;
      organizerId: string;
      organizerEmail: string | null;
      organizerName: string | null;
      listingId: string;
      listingTitle: string | null;
      timezone: string;
      city: string | null;
      showExactAddress: boolean;
      addressLine1: string | null;
      addressLine2: string | null;
      startsAt: Date;
      endsAt: Date;
      /** The three `composeWhenLabel` inputs, so no caller re-queries the listing to render a time. */
      spacePriceCents: number | null;
      quotedTotalCents: number | null;
      hourlyRateCents: number | null;
    }
  | { active: false };

/**
 * THE single calm "this invite is no longer active" value (08-UI-SPEC §3). Unknown, replaced and voided all
 * return THIS object — one frozen constant rather than three object literals that could drift apart.
 */
export const GROUP_INACTIVE: GroupByToken = Object.freeze({ active: false as const });

type RawTokenRow = {
  groupId: string;
  bookingId: string;
  accessToken: string;
  capacitySnapshot: number;
  confirmedYes: number;
  rsvpClosed: boolean;
  organizerId: string;
  organizerEmail: string | null;
  organizerName: string | null;
  listingId: string;
  listingTitle: string | null;
  timezone: string;
  city: string | null;
  showExactAddress: boolean;
  addressLine1: string | null;
  addressLine2: string | null;
  startsAtIso: string;
  endsAtIso: string;
  spacePriceCents: number | null;
  quotedTotalCents: number | null;
  hourlyRateCents: number | null;
};

/**
 * Resolve a group by its bearer invite token — the SOLE credential on this path (D-118). No session is
 * consulted and none is required: GROUP-03 exists precisely so a stranger with the link can answer.
 *
 * The active predicate is `voided_at IS NULL` AND the parent booking still being live. The booking-status
 * half is defence in depth behind the D-121 auto-void: if any future cancellation path ever forgot to void
 * the group, an invite must still stop accepting RSVPs for a booking that is no longer happening.
 */
export async function getGroupByToken(dbConn: DbConn, token: string): Promise<GroupByToken> {
  const rows = (await dbConn.execute(sql`
    SELECT
      g.id AS "groupId",
      g.booking_id AS "bookingId",
      g.access_token AS "accessToken",
      g.capacity_snapshot AS "capacitySnapshot",
      (SELECT count(*)::int FROM rsvp r WHERE r.group_id = g.id AND r.status = 'yes') AS "confirmedYes",
      -- D-120 by the DB clock, never a JS Date: the same authority the action re-checks before claiming.
      (now() >= b.starts_at) AS "rsvpClosed",
      b.booker_id AS "organizerId",
      u.email AS "organizerEmail",
      u.first_name AS "organizerName",
      l.id AS "listingId",
      l.title AS "listingTitle",
      l.timezone,
      l.city,
      l.show_exact_address AS "showExactAddress",
      l.address_line1 AS "addressLine1",
      l.address_line2 AS "addressLine2",
      ${isoUtc("b.starts_at")} AS "startsAtIso",
      ${isoUtc("b.ends_at")} AS "endsAtIso",
      b.space_price_cents AS "spacePriceCents",
      b.quoted_total_cents AS "quotedTotalCents",
      l.hourly_rate_cents AS "hourlyRateCents"
    FROM booking_group g
    JOIN booking b ON b.id = g.booking_id
    JOIN listing l ON l.id = b.listing_id
    JOIN "user" u ON u.id = b.booker_id
    WHERE g.access_token = ${token}
      AND g.voided_at IS NULL
      AND b.status NOT IN ('cancelled', 'declined')
    LIMIT 1
  `)) as unknown as RawTokenRow[];

  const r = rows[0];
  // Unknown, replaced (regenerated) and voided all land here, on the SAME object. Do not "improve" this by
  // distinguishing them — the indistinguishability IS the control (T-08-17).
  if (!r) return GROUP_INACTIVE;

  return {
    active: true,
    groupId: r.groupId,
    bookingId: r.bookingId,
    accessToken: r.accessToken,
    capacitySnapshot: r.capacitySnapshot,
    confirmedYes: r.confirmedYes,
    rsvpClosed: r.rsvpClosed,
    organizerId: r.organizerId,
    organizerEmail: r.organizerEmail,
    organizerName: r.organizerName,
    listingId: r.listingId,
    listingTitle: r.listingTitle,
    timezone: r.timezone,
    city: r.city,
    showExactAddress: r.showExactAddress,
    addressLine1: r.addressLine1,
    addressLine2: r.addressLine2,
    startsAt: new Date(r.startsAtIso),
    endsAt: new Date(r.endsAtIso),
    spacePriceCents: r.spacePriceCents,
    quotedTotalCents: r.quotedTotalCents,
    hourlyRateCents: r.hourlyRateCents,
  };
}

/** The organizer's own group, as `/bookings/[id]/group` and the management actions read it. */
export type OwnedGroup = {
  groupId: string;
  bookingId: string;
  accessToken: string;
  capacitySnapshot: number;
  voidedAt: Date | null;
  organizerId: string;
  listingId: string;
  listingTitle: string | null;
  timezone: string;
  city: string | null;
  startsAt: Date;
  endsAt: Date;
  spacePriceCents: number | null;
  quotedTotalCents: number | null;
  hourlyRateCents: number | null;
  declaredPax: number | null;
  extraHeadFee: number | null;
};

type RawOwnedGroupRow = Omit<OwnedGroup, "voidedAt" | "startsAt" | "endsAt"> & {
  voidedAtIso: string | null;
  startsAtIso: string;
  endsAtIso: string;
};

const ownedGroupColumns = sql`
  g.id AS "groupId",
  g.booking_id AS "bookingId",
  g.access_token AS "accessToken",
  g.capacity_snapshot AS "capacitySnapshot",
  ${isoUtc("g.voided_at")} AS "voidedAtIso",
  b.booker_id AS "organizerId",
  l.id AS "listingId",
  l.title AS "listingTitle",
  l.timezone,
  l.city,
  ${isoUtc("b.starts_at")} AS "startsAtIso",
  ${isoUtc("b.ends_at")} AS "endsAtIso",
  b.space_price_cents AS "spacePriceCents",
  b.quoted_total_cents AS "quotedTotalCents",
  l.hourly_rate_cents AS "hourlyRateCents",
  b.declared_pax AS "declaredPax",
  l.extra_head_fee AS "extraHeadFee"
`;

function hydrateOwnedGroup(r: RawOwnedGroupRow): OwnedGroup {
  return {
    groupId: r.groupId,
    bookingId: r.bookingId,
    accessToken: r.accessToken,
    capacitySnapshot: r.capacitySnapshot,
    voidedAt: r.voidedAtIso === null ? null : new Date(r.voidedAtIso),
    organizerId: r.organizerId,
    listingId: r.listingId,
    listingTitle: r.listingTitle,
    timezone: r.timezone,
    city: r.city,
    startsAt: new Date(r.startsAtIso),
    endsAt: new Date(r.endsAtIso),
    spacePriceCents: r.spacePriceCents,
    quotedTotalCents: r.quotedTotalCents,
    hourlyRateCents: r.hourlyRateCents,
    declaredPax: r.declaredPax,
    extraHeadFee: r.extraHeadFee,
  };
}

/**
 * GROUP-04 — the organizer's group for one BOOKING. `booker_id = ${organizerId}` is in the WHERE, so a
 * missing booking and a stranger's booking are the SAME empty result: the caller cannot tell them apart and
 * therefore cannot turn a guessed booking id into a membership oracle (T-08-14).
 */
export async function getOwnedGroupByBooking(
  dbConn: DbConn,
  args: { bookingId: string; organizerId: string },
): Promise<OwnedGroup | null> {
  const rows = (await dbConn.execute(sql`
    SELECT ${ownedGroupColumns}
    FROM booking_group g
    JOIN booking b ON b.id = g.booking_id
    JOIN listing l ON l.id = b.listing_id
    WHERE g.booking_id = ${args.bookingId}
      AND b.booker_id = ${args.organizerId}
    LIMIT 1
  `)) as unknown as RawOwnedGroupRow[];
  return rows[0] ? hydrateOwnedGroup(rows[0]) : null;
}

/** The same owner-scoped read, keyed by GROUP id — what `regenerateLink(groupId)` gates on. */
export async function getOwnedGroupById(
  dbConn: DbConn,
  args: { groupId: string; organizerId: string },
): Promise<OwnedGroup | null> {
  const rows = (await dbConn.execute(sql`
    SELECT ${ownedGroupColumns}
    FROM booking_group g
    JOIN booking b ON b.id = g.booking_id
    JOIN listing l ON l.id = b.listing_id
    WHERE g.id = ${args.groupId}
      AND b.booker_id = ${args.organizerId}
    LIMIT 1
  `)) as unknown as RawOwnedGroupRow[];
  return rows[0] ? hydrateOwnedGroup(rows[0]) : null;
}

/** One roster row as 08-UI-SPEC §2 renders it. NO email address — see the privacy note in the header. */
export type RosterEntry = {
  rsvpId: string;
  /** Guest-typed free text (G6/T-08-08) — escaped at every render and in every email body. */
  name: string;
  status: "yes" | "no";
  /** D-116 — drives the neutral `Account` / `Guest` tag, not any authorization decision. */
  isAccount: boolean;
  /** D-117 — whether this attendee is REACHABLE at all; never the address itself. */
  hasEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type RawRosterRow = Omit<RosterEntry, "createdAt" | "updatedAt"> & {
  createdAtIso: string;
  updatedAtIso: string;
};

/**
 * GROUP-04 — "who's coming", organizer-scoped. `b.booker_id = ${organizerId}` lives in the WHERE: a
 * non-organizer reading a real group id gets an EMPTY roster, not a filtered one. `yes` rows first (the
 * headcount is the point of the surface), then oldest-first within each answer.
 */
export async function getRoster(
  dbConn: DbConn,
  args: { groupId: string; organizerId: string; limit?: number },
): Promise<RosterEntry[]> {
  const capped = Math.min(
    Math.max(Number.isFinite(args.limit ?? NaN) ? Math.trunc(args.limit!) : ROSTER_MAX_LIMIT, 1),
    ROSTER_MAX_LIMIT,
  );

  const rows = (await dbConn.execute(sql`
    SELECT
      r.id AS "rsvpId",
      r.guest_name AS "name",
      r.status::text AS "status",
      (r.user_id IS NOT NULL) AS "isAccount",
      (r.user_id IS NOT NULL OR r.guest_email_norm IS NOT NULL) AS "hasEmail",
      ${isoUtc("r.created_at")} AS "createdAtIso",
      ${isoUtc("r.updated_at")} AS "updatedAtIso"
    FROM rsvp r
    JOIN booking_group g ON g.id = r.group_id
    JOIN booking b ON b.id = g.booking_id
    WHERE r.group_id = ${args.groupId}
      AND b.booker_id = ${args.organizerId}
    ORDER BY (r.status = 'yes') DESC, r.created_at ASC, r.id ASC
    LIMIT ${capped}
  `)) as unknown as RawRosterRow[];

  return rows.map((r) => ({
    rsvpId: r.rsvpId,
    name: r.name,
    status: r.status,
    isAccount: r.isAccount,
    hasEmail: r.hasEmail,
    createdAt: new Date(r.createdAtIso),
    updatedAt: new Date(r.updatedAtIso),
  }));
}

/** The GROUP-04 focal figure: `{confirmed} of {capacity}` spots filled. */
export type Headcount = { confirmed: number; capacity: number; full: boolean };

/**
 * The headcount, organizer-scoped in the WHERE exactly like the roster. Returns null — not a zero count —
 * for a missing or foreign group, so "no such group of yours" is never rendered as an empty-but-real group.
 *
 * `count(*)` is a bigint (postgres.js hands it back as a STRING), so it is cast `::int` in SQL rather than
 * coerced in JS — the house idiom from notifications.ts:countUnread.
 */
export async function getHeadcount(
  dbConn: DbConn,
  args: { groupId: string; organizerId: string },
): Promise<Headcount | null> {
  const rows = (await dbConn.execute(sql`
    SELECT
      g.capacity_snapshot AS "capacity",
      (SELECT count(*)::int FROM rsvp r WHERE r.group_id = g.id AND r.status = 'yes') AS "confirmed"
    FROM booking_group g
    JOIN booking b ON b.id = g.booking_id
    WHERE g.id = ${args.groupId}
      AND b.booker_id = ${args.organizerId}
    LIMIT 1
  `)) as unknown as { capacity: number; confirmed: number }[];

  const r = rows[0];
  if (!r) return null;
  return { confirmed: r.confirmed, capacity: r.capacity, full: r.confirmed >= r.capacity };
}

/**
 * Every attendee who said YES and can actually be reached (D-121). Feeds the cancel-time `group_cancelled`
 * fan-out and NOTHING else.
 *
 * DELIBERATELY NOT organizer-scoped, and that is not an oversight: the HOST cancellation path also fires
 * this, and the host is not the organizer — an organizer-scoped read would silently notify nobody on exactly
 * the cancellation the attendees least expect. The caller is already owner-gated (booker OR host) before it
 * gets here, and it is passed a group id it just read off its own gated booking row.
 *
 * This is the ONE read in the module that returns addresses, because its only consumer is a send. A blank-
 * email guest comes back with both address fields null and is UNREACHABLE by design (D-117) — the caller
 * must not invent a channel for them.
 */
export type ReachableAttendee = {
  rsvpId: string;
  name: string;
  /** Present ⇒ this attendee has an account ⇒ the durable `fitout/notify` path (D-122). */
  userId: string | null;
  /** The account's address (accounts) — used as the notify event's `email`, never as the routing decision. */
  accountEmail: string | null;
  /** The address THIS attendee submitted on the invite (guests) ⇒ the email-only `fitout/guest-email` path. */
  guestEmail: string | null;
};

export async function listReachableYesAttendees(
  dbConn: DbConn,
  groupId: string,
): Promise<ReachableAttendee[]> {
  return (await dbConn.execute(sql`
    SELECT
      r.id AS "rsvpId",
      r.guest_name AS "name",
      r.user_id AS "userId",
      u.email AS "accountEmail",
      r.guest_email_norm AS "guestEmail"
    FROM rsvp r
    LEFT JOIN "user" u ON u.id = r.user_id
    WHERE r.group_id = ${groupId}
      AND r.status = 'yes'
      -- Blank-email guests are excluded HERE rather than filtered later: they are unreachable by design,
      -- and a row with no channel in the result set is an invitation to invent one for it.
      AND (r.user_id IS NOT NULL OR r.guest_email_norm IS NOT NULL)
    ORDER BY r.created_at ASC, r.id ASC
    LIMIT ${ROSTER_MAX_LIMIT}
  `)) as unknown as ReachableAttendee[];
}
