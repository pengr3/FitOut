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
//      THE WORDS THAT VALUE IS RENDERED AS LIVE HERE TOO, AS OF PLAN 11-19 (T-11-ORACLE). `GROUP_INACTIVE`
//      froze the VALUE; `INACTIVE_TITLE` / `INACTIVE_BODY` below freeze the SENTENCES, for exactly the same
//      reason and one level up. They were module-private consts inside the invite page until 11-19 needed a
//      SECOND surface — `invite/[token]/not-found.tsx` — to render the identical state, and two literals in
//      two files are two things that drift; the moment they drift, the difference between them is the
//      oracle this property exists to close. They are hoisted to this module rather than exported from a
//      `page.tsx` because the analog they mirror (`GROUP_INACTIVE`) is already here, because the invite
//      page's own comment pointed here, and because a route module's named exports are a shape Next's
//      segment-export validation has opinions about.
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
      /**
       * The four `composeWhenLabel` inputs, so no caller re-queries the listing to render a time.
       * `fullDay` is the booking's PERSISTED creation-time snapshot and is the AUTHORITY for
       * "Full day" vs an hour range (08-15 / CR-01); the two price figures and `dayRateCents` are
       * consulted only by the formatter's pre-0016 positive day-rate fallback.
       *
       * `openCapacity` is DELIBERATELY ABSENT (09-08, Rule B): under D-110 open capacity does not combine
       * with group bookings in v1, so every group's booking is exclusive by construction and its callers
       * pass the literal `false`. If groups ever open up, this read model must carry the column and those
       * literals become projections — the compiler will not remind you here, only there.
       */
      fullDay: boolean | null;
      spacePriceCents: number | null;
      quotedTotalCents: number | null;
      dayRateCents: number | null;
    }
  | { active: false };

/**
 * THE single calm "this invite is no longer active" value (08-UI-SPEC §3). Unknown, replaced and voided all
 * return THIS object — one frozen constant rather than three object literals that could drift apart.
 */
export const GROUP_INACTIVE: GroupByToken = Object.freeze({ active: false as const });

/**
 * THE two sentences that value is rendered as — the ONLY declaration of either one in `src/`
 * (T-11-ORACLE, plan 11-19). Values are byte-unchanged from the invite page they were hoisted out of.
 *
 * THREE consumers, zero copies:
 *   • `src/app/(public)/invite/[token]/page.tsx`      — the one inactive branch (08-06's single state)
 *   • `src/app/(public)/invite/[token]/not-found.tsx` — the same state, reached the other way
 *   • `src/app/actions/group.ts`                      — `INVITE_INACTIVE`, composed as `${TITLE}. ${BODY}`,
 *                                                       the sentence `submitRsvp` returns for BOTH a
 *                                                       malformed and an unknown token
 *
 * A FOURTH COPY IS THE VULNERABILITY, not a style breach: the invite token is a bearer credential in a
 * URL, and the whole control is that every way of failing to resolve one produces the same words. A
 * reword applied to two of three sites tells an attacker walking the token space which shapes exist.
 * `tests/design/invite-notfound-parity.test.ts` asserts each sentence appears as a string literal exactly
 * ONCE in `src/`, and that every other site reaches it by import.
 *
 * Deliberately NOT `Object.freeze`d or joined into one object: they are primitives, so they are already
 * immutable, and the two render in separate elements (`<h1>` / `<p>`) on both surfaces.
 */
export const INACTIVE_TITLE = "This invite is no longer active";
export const INACTIVE_BODY = "Ask the organizer for the latest link.";

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
  fullDay: boolean | null;
  spacePriceCents: number | null;
  quotedTotalCents: number | null;
  dayRateCents: number | null;
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
      b.full_day AS "fullDay",
      b.space_price_cents AS "spacePriceCents",
      b.quoted_total_cents AS "quotedTotalCents",
      l.day_rate_cents AS "dayRateCents"
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
    fullDay: r.fullDay,
    spacePriceCents: r.spacePriceCents,
    quotedTotalCents: r.quotedTotalCents,
    dayRateCents: r.dayRateCents,
  };
}

/**
 * The SIGNED-IN viewer's own answer on a group they already hold the invite to (D-120, the change-answer
 * affordance on `/invite/[token]`). Returns null when they have not answered yet.
 *
 * SELF-SCOPED BY CONSTRUCTION, and that is the whole security story: `r.user_id = ${userId}` is the WHERE,
 * so this read can only ever return the caller's OWN row. It is deliberately keyed on the group id the
 * caller just resolved from the token it presented — not on the token again — so it cannot be used to probe
 * for anything the caller has not already proven possession of.
 *
 * THERE IS NO GUEST EQUIVALENT, and its absence is a decision rather than a gap (D-116/D-117). A guest is
 * identified by the address they type on the form; on a plain GET they have typed nothing, so recognising a
 * returning guest would mean either matching them on something they did not supply or handing the page a
 * way to look up an RSVP by address — which is an oracle over who has been invited. A guest-with-email
 * changes their answer by answering again with the same address, which the `rsvp_group_email_uq` partial
 * unique index resolves onto their existing row (08-01/08-02).
 */
export async function getMyRsvpStatus(
  dbConn: DbConn,
  args: { groupId: string; userId: string },
): Promise<"yes" | "no" | null> {
  const rows = (await dbConn.execute(sql`
    SELECT r.status::text AS "status"
    FROM rsvp r
    WHERE r.group_id = ${args.groupId}
      AND r.user_id = ${args.userId}
    LIMIT 1
  `)) as unknown as { status: "yes" | "no" }[];
  return rows[0]?.status ?? null;
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
  /**
   * The four `composeWhenLabel` inputs. `fullDay` is the booking's PERSISTED creation-time snapshot
   * and is the AUTHORITY for "Full day" vs an hour range (08-15 / CR-01); the prices and `dayRateCents`
   * feed only the formatter's pre-0016 positive day-rate fallback. `openCapacity` is absent for the same
   * D-110 reason as `GroupByToken` above (09-08, Rule B): a group booking is exclusive by construction.
   */
  fullDay: boolean | null;
  spacePriceCents: number | null;
  quotedTotalCents: number | null;
  dayRateCents: number | null;
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
  b.full_day AS "fullDay",
  b.space_price_cents AS "spacePriceCents",
  b.quoted_total_cents AS "quotedTotalCents",
  l.day_rate_cents AS "dayRateCents",
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
    fullDay: r.fullDay,
    spacePriceCents: r.spacePriceCents,
    quotedTotalCents: r.quotedTotalCents,
    dayRateCents: r.dayRateCents,
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
