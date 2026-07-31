"use server";

// Group booking actions (GROUP-01/02/03/05 · D-111/D-112/D-116/D-117/D-118/D-119/D-120/D-121) — the
// organizer's create + manage surface, and the ONE public, session-less write in the whole app.
//
// FOUR ENTRY POINTS, and the split is deliberate:
//   createGroup     : ORGANIZER. Turns a paid, confirmed, OWNED booking into an invitable group and
//                     snapshots the cap (D-111). Clones cancel-booking.ts's skeleton verbatim.
//   submitRsvp      : PUBLIC. The token is the sole credential; no session is required (D-116/GROUP-03).
//   removeAttendee  : ORGANIZER. Frees a seat under the SAME group-row lock the seat-claim takes.
//   regenerateLink  : ORGANIZER. Mints a new invite credential; the old one stops resolving (D-121).
//
// SECURITY CONTRACT (the four properties this file exists to hold):
//   - OWNER GATE / IDOR (T-08-14 / T-08-15 / Security V4). Every organizer action re-checks
//     `booking.bookerId === session.user.id` server-side BEFORE any write, and repeats the owner scope
//     INSIDE the statement's own WHERE as defence in depth. A MISSING booking and a CROSS-USER booking
//     return the SAME calm denial, byte for byte, so a guessed or leaked id is not an enumeration oracle.
//     `createGroup` additionally re-checks `status === 'confirmed'` (D-119) — the button on the detail page
//     is a courtesy; this check is the gate.
//   - THE CAP IS NEVER CLIENT-PROPOSED (D-111). `capacity_snapshot` is read from the LISTING inside the
//     INSERT itself, in one statement, so there is no request shape and no window in which a different cap
//     could be substituted. `createGroupSchema` has exactly one field for the same reason.
//   - THE SEAT-CLAIM IS THE ONLY ARBITER OF "FULL" (D-112). This file never counts confirmed RSVPs and then
//     decides — that is the CLAUDE.md count-then-insert anti-pattern. It calls `claimSeat`, whose
//     `SELECT … FOR UPDATE` row lock is the atomic authority, and renders whatever comes back.
//   - NOTIFICATIONS EMIT AFTER THE CLAIM RETURNS, NEVER INSIDE A TRANSACTION (the notifications.ts
//     contract). `claimSeat` owns its own transaction and RESOLVES before any emit below runs; every emit
//     is additionally wrapped so a notification outage can never fail an RSVP that already committed.
//   - NO RATE-LIMIT KEY ON THE PUBLIC PATH IS DERIVED FROM UNVALIDATED CALLER INPUT (CR-04/T-08-33).
//     `rateLimit` stores its counters in a module-level Map, so a key is durable process memory. Every
//     other caller in the app keys on an authenticated `userId` — bounded by the user table. This one is
//     session-less, so `submitRsvp` RESOLVES the token against the database FIRST and keys its budget on
//     the resolved `group.groupId`: the key space is real `booking_group` rows, and a token naming no
//     group mints nothing at all. Resolving before budgeting leaks NOTHING — unknown, voided and
//     regenerated tokens already collapse onto one identical INVITE_INACTIVE sentence (T-08-17), so
//     there is no new distinguishable response to read. The residual (one indexed lookup per
//     unauthenticated request) is dispositioned `accept`: a coarse pre-resolution budget would put a
//     single shared key on the app's only public write, which is a global availability lever — one
//     caller could deny every RSVP in the system. `src/lib/rate-limit.ts` carries the second, independent
//     bound (a hard 50,000-bucket ceiling) so no FUTURE caller can reintroduce the class.
//
// THE D-117 OPT-IN EMAIL GUARD (T-08-16 — the spam cannon), stated once, deliberately: an invite link is
// public and shareable, so "email the attendee" is one careless line away from "email anyone, on demand,
// from our domain". The rule is therefore narrow and structural: the ONLY address this file ever emails is
// the one submitted on THIS request, by the person submitting it. No address is ever read back out of the
// database to be mailed, no address is carried over from a previous RSVP, and a blank-email guest gets NO
// send at all — their on-screen confirmation is the whole of it (D-117/G3). The address is additionally
// rate-limited by its own normalized value, so re-submitting cannot turn one link into a mail bomb aimed at
// one inbox.

import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { emitNotify } from "@/lib/notifications";
// The event name + emitter, NOT the Inngest function module: that file registers its function at module
// scope, and importing it here would run that registration inside this server action's module graph.
import { emitGuestEmail } from "@/lib/group/guest-notify";
import { composeWhenLabel } from "@/lib/booking/when-label";
import { claimSeat } from "@/lib/group/seat-claim";
import { makeInviteToken } from "@/lib/group/token";
import {
  getGroupByToken,
  getOwnedGroupById,
  normalizeEmail,
  type GroupByToken,
} from "@/lib/group/rsvp";
import {
  createGroupSchema,
  groupIdSchema,
  inviteTokenSchema,
  rsvpIdSchema,
  rsvpSchema,
} from "@/lib/validation/group";

// ── Results ─────────────────────────────────────────────────────────────────────────────────────────────
// Every failure is a calm structured value, never a throw to the client (the booking.ts / cancel-booking.ts
// convention). A thrown server action is a 500 on a surface whose whole job is to feel effortless.

export type CreateGroupResult =
  | { ok: true; groupId: string; accessToken: string; alreadyExisted: boolean }
  | { ok: false; error: string };

export type SubmitRsvpResult =
  | {
      ok: true;
      status: "yes" | "no";
      /** D-117/G3 — false for a blank-email guest: their on-screen state is their ONLY confirmation. */
      reachable: boolean;
    }
  | { ok: false; error: string };

export type ManageGroupResult = { ok: true } | { ok: false; error: string };
export type RegenerateLinkResult = { ok: true; accessToken: string } | { ok: false; error: string };

// ── Calm copy (08-UI-SPEC §Error / edge states). Shared constants, so two paths cannot drift. ────────────

/** The SAME denial for a missing booking AND a stranger's booking (T-08-14/T-08-15 — leak nothing). */
const DENIED = "We couldn't find that booking, or it isn't yours to manage." as const;
const NEEDS_SESSION = "Sign in to manage your bookings." as const;
const TOO_FAST = "You're going a little fast. Please try again in a moment." as const;
/** D-119 — a booking that is not paid-and-confirmed cannot host a group. Same words as DENIED, on purpose. */
const NOT_CONFIRMED = DENIED;
/** Unknown = revoked = voided = cancelled, all one sentence (T-08-17, no oracle). */
const INVITE_INACTIVE = "This invite is no longer active. Ask the organizer for the latest link." as const;
const RSVP_CLOSED = "RSVPs have closed — this session has already started." as const;
const RSVP_FAILED = "We couldn't save your RSVP. Try again." as const;
const GROUP_NOT_ACTIVE = "This group is no longer active." as const;

/** The "just filled up" copy — composed with the real cap so the number a guest reads is the real one. */
const groupFullCopy = (capacity: number) =>
  `This group just filled up — all ${capacity} spots are taken.`;

// ── Budgets ─────────────────────────────────────────────────────────────────────────────────────────────

/** WR-06 — the organizer-side budget, mirroring approveRequest / cancelBooking (5 per 60s per identity). */
const CREATE_GROUP_RATE_LIMIT = { window: 60, max: 5 } as const;
/** Roster management is chattier than a money move (remove a few, regenerate once) — a looser budget. */
const MANAGE_GROUP_RATE_LIMIT = { window: 60, max: 20 } as const;
/**
 * The PER-GROUP RSVP budget. Deliberately generous: a real group of ten answering at once is the SUCCESS
 * case, and a limit tuned for a single identity would throttle exactly that. The anti-abuse control that
 * matters here is the email budget below, not the row write.
 *
 * KEYED ON THE RESOLVED GROUP, NEVER ON THE TOKEN (CR-04). The token is a caller-supplied string with
 * `32^20` possible values; the group id is a row that exists. Keying on the token let an unauthenticated
 * caller mint a durable bucket per request — see the ordering note in `submitRsvp`. The visible
 * consequence of the fix: a link that `regenerateLink` replaced SHARES its predecessor's budget, because
 * the budget was never about the credential, it was about the group behind it.
 */
const RSVP_RATE_LIMIT = { window: 60, max: 30 } as const;
/** The per-identity budget for a SIGNED-IN attendee — one person changing their mind, not a crowd. */
const RSVP_IDENTITY_RATE_LIMIT = { window: 60, max: 10 } as const;
/**
 * T-08-16 — THE SPAM-CANNON BUDGET, keyed on the NORMALIZED address itself. Three sends per hour per
 * address: enough for a genuine change-of-answer, nowhere near enough to weaponise a public link against
 * someone's inbox. Keyed on the normalized value so re-casing or padding the address cannot mint a fresh
 * budget (that is the other half of what `normalizeEmail` is for).
 */
const GUEST_EMAIL_RATE_LIMIT = { window: 3600, max: 3 } as const;

// ── Shared helpers ──────────────────────────────────────────────────────────────────────────────────────

/**
 * The app's base URL, from the SAME `BETTER_AUTH_URL` convention every other emit site uses. EVERY group
 * notification href is ABSOLUTE (the 07-10 rule): one payload string feeds both the in-app row and the
 * email CTA, and a root-relative href is a dead link in a mail client.
 */
function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

/** The shareable invite URL. The token is a real credential — render it, NEVER log it (08-UI-SPEC §2). */
function inviteUrl(accessToken: string): string {
  return `${appBaseUrl()}/invite/${accessToken}`;
}

/** Resolve the signed-in user, or null. The organizer actions require it; `submitRsvp` merely reads it. */
async function readSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user;
  if (!u?.id) return null;
  return { id: u.id, email: u.email ?? null, name: u.name ?? null };
}

/** The surfaces a group change touches. Shared so no path can revalidate a different set. */
function revalidateGroupSurfaces(bookingId: string): void {
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}/group`);
}

/** Project the token view onto the shared venue-local formatter's structural input (07-02). */
function whenLabelFor(group: Extract<GroupByToken, { active: true }>): string {
  return composeWhenLabel({
    startsAt: group.startsAt,
    endsAt: group.endsAt,
    timezone: group.timezone,
    city: group.city,
    fullDay: group.fullDay,
    // A group can only ever be created on an exclusive booking, so no group surface ever renders a drop-in
    // pass: open capacity does not combine with Phase-8 group bookings in v1 (D-110).
    openCapacity: false,
    spacePriceCents: group.spacePriceCents,
    quotedTotalCents: group.quotedTotalCents,
    dayRateCents: group.dayRateCents,
  });
}

// ── createGroup (GROUP-01 · D-111/D-118/D-119) ──────────────────────────────────────────────────────────

/**
 * Turn a confirmed, owned booking into an invitable group.
 *
 * THE ORDER IS LOAD-BEARING and mirrors cancel-booking.ts: gate before rate-limit (so a stranger's id is
 * denied without consuming the owner's budget), rate-limit before any write, then ONE statement that does
 * the whole thing.
 *
 * That single statement is the D-111 snapshot. `capacity_snapshot` is `SELECT`ed from the listing joined to
 * the booking inside the INSERT, so the cap is read and frozen in the same atomic step that creates the
 * group — there is no read-then-write window in which a host's capacity edit could land, and no request
 * shape in which a client could propose a cap of its own. It mirrors how the D-67 cancellation tier is
 * snapshotted inside `createPendingHold`'s transaction.
 *
 * ⚠️ `capacity_snapshot` COUNTS RSVP-ABLE SEATS, NOT PEOPLE (D-113 · WR-03). The organizer is attendee #1 and
 * holds one of the listing's places — structurally, because they are a display fixture on the roster with no
 * `rsvp` row of their own, and the seat-claim caps `rsvp` ROWS. So the snapshot reserves their seat:
 * `GREATEST(l.max_occupancy - 1, 0)`. A group on a `maxOccupancy = N` listing therefore admits at most
 * `N - 1` yes-RSVPs, and the organizer plus the roster can never exceed the number the host rated the room
 * for. `listing.max_occupancy`, `declaredPax` and every organizer-facing figure are organizer-INCLUSIVE;
 * `capacity_snapshot` is the one organizer-EXCLUSIVE number, and it is exclusive because of what it caps.
 *
 * EXISTING ROWS ARE FORWARD-ONLY. D-111 makes the snapshot immutable precisely so a later change cannot move
 * a cap people have already answered against; groups created before this rule keep their original number.
 *
 * IDEMPOTENT BY CONSTRUCTION. `ON CONFLICT (booking_id) DO NOTHING` is the at-most-one-group lock (the
 * booking_id UNIQUE, D-115) — a double-click returns the EXISTING group rather than a second one or an
 * error. There is deliberately no app-level "does a group exist?" pre-query: a read-then-write is exactly
 * the race the UNIQUE constraint exists to kill.
 */
export async function createGroup(bookingId: string): Promise<CreateGroupResult> {
  const parsed = createGroupSchema.safeParse({ bookingId });
  if (!parsed.success) return { ok: false, error: DENIED };

  const session = await readSession();
  if (!session) return { ok: false, error: NEEDS_SESSION };
  const userId = session.id;

  // Owner + status gate BEFORE any write. Missing, cross-user and not-yet-confirmed all fall through to
  // the SAME sentence — a booker walking ids learns nothing about which of them exist or are paid.
  // The occupancy mode is SELECTED as a boolean rather than filtered in the WHERE, deliberately (CR-05).
  // Filtering would collapse "this is a drop-in pass" into the same empty result as "no such booking", and
  // the whole point of the `open_capacity` audit reason below is that an OPERATOR can tell those two apart
  // in the trail — a row the WHERE discarded cannot say whether the caller was walking stranger ids or
  // holding a genuine pass they paid for. The CALLER still learns nothing: both paths return the same
  // DENIED sentence (T-09-77). Same single-round-trip idiom as `not_blocked` in availability/units.ts.
  const [gate] = (await db.execute(sql`
    SELECT b.id, l.max_occupancy AS "maxOccupancy",
           (l.occupancy_mode = 'exclusive') AS "modeOk"
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    WHERE b.id = ${parsed.data.bookingId}
      AND b.booker_id = ${userId}
      AND b.status = 'confirmed'
  `)) as unknown as { id: string; maxOccupancy: number | null; modeOk: boolean }[];
  if (!gate) return { ok: false, error: NOT_CONFIRMED };

  const limit = rateLimit(`create-group:${userId}`, CREATE_GROUP_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "create_group",
      outcome: "denied",
      meta: { reason: "rate_limit", bookingId: parsed.data.bookingId, retryAfter: limit.retryAfter },
    });
    return { ok: false, error: TOO_FAST };
  }

  // OCCUPANCY MODE — the rule D-110 always asserted and nothing ever enforced (CR-05 · T-09-73/T-09-74).
  // A group can only ever exist on an EXCLUSIVE booking, because a group is a claim on a RESERVED SPACE:
  // the organizer bought the room, and the seats they hand out are seats in the room they bought. A drop-in
  // pass buys ADMISSIONS, not the room — so there is no space to divide and no seat to give away.
  //
  // THIS IS CHECKED BEFORE THE CAPACITY FLOOR ON PURPOSE. On an open-capacity listing `max_occupancy` is
  // the venue's DAILY ADMISSIONS CAP, not a room rating (OC-01), so the floor below would be judging a
  // number that means something else entirely — and, left unchecked, `GREATEST(max_occupancy - 1, 0)` would
  // freeze that daily cap as `capacity_snapshot`: on a 30-admission gym, twenty-nine RSVP-able seats minted
  // against ONE pass that was paid for, every one of them a promise made to a stranger. Refusing on the
  // mode first means the cap is never read in a context where it does not mean what the floor thinks.
  //
  // The denial reuses the shared DENIED sentence for the same reason the `no_capacity` case does; the
  // distinct `open_capacity` audit reason is what keeps the two legible to an operator (T-09-77).
  if (!gate.modeOk) {
    await recordAudit({
      actorId: userId,
      action: "create_group",
      outcome: "denied",
      meta: { reason: "open_capacity", bookingId: parsed.data.bookingId },
    });
    return { ok: false, error: DENIED };
  }

  // A published listing always carries maxOccupancy (it is required by publishSchema), so this is a
  // legacy/draft-data guard rather than an expected path — but a group with no cap has no seat-claim, and
  // silently inventing one would be a cap nobody chose.
  //
  // THE FLOOR IS 2, NOT 1 (D-113 · WR-03). One of the listing's places is the organizer's, so a space rated
  // for a single person cannot host a group at all: the only seat is already taken. Below 2 the snapshot
  // would be 0 and the group would be one nobody could ever join — immutable, by D-111. The denial reuses
  // the shared DENIED sentence: "this listing cannot host a group" is not a state worth distinguishing from
  // "this booking isn't yours" to a caller walking booking ids.
  if (gate.maxOccupancy == null || gate.maxOccupancy < 2) {
    await recordAudit({
      actorId: userId,
      action: "create_group",
      outcome: "denied",
      meta: { reason: "no_capacity", bookingId: parsed.data.bookingId },
    });
    return { ok: false, error: DENIED };
  }

  const groupId = randomUUID();
  const accessToken = makeInviteToken(); // D-118 — ~100 bits of crypto-random, never a sequential id.

  const created = (await db.execute(sql`
    INSERT INTO booking_group (id, booking_id, capacity_snapshot, access_token)
    -- D-113 — the organizer's seat comes out of the listing's rating BEFORE the cap is frozen, because the
    -- cap governs rsvp ROWS and the organizer never has one. GREATEST(…, 0) is belt-and-braces beside the
    -- >= 2 floor below: the snapshot is a NOT NULL integer that can never legally go negative.
    SELECT ${groupId}, b.id, GREATEST(l.max_occupancy - 1, 0), ${accessToken}
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    -- DEFENCE IN DEPTH: the owner scope, the status scope and the OCCUPANCY-MODE scope are repeated HERE,
    -- inside the write, so even a future refactor that broke the pre-read gate above could not create a
    -- group on a stranger's — or a DROP-IN, or an
    -- unpaid — booking. The capacity floor is repeated for the same reason and one more: a host capacity
    -- edit landing BETWEEN the gate and this INSERT would otherwise freeze a capacity_snapshot of 0 — a
    -- group nobody can ever join, and immutable by D-111. Zero rows is the right answer to that race.
    --
    -- The mode scope earns its place here more than any of them, because on a drop-in booking this
    -- statement does not merely write a row it should not: the GREATEST(...) above reads the
    -- listing's DAILY ADMISSIONS CAP and freezes it as RSVP-able seats (CR-05 · T-09-73). A 30-admission
    -- gym would mint twenty-nine seats against the ONE pass that was paid for, D-111 would make that number
    -- immutable, and every seat handed out is a stranger told they are coming to a space nobody reserved.
    WHERE b.id = ${parsed.data.bookingId}
      AND b.booker_id = ${userId}
      AND b.status = 'confirmed'
      AND l.occupancy_mode = 'exclusive'
      AND l.max_occupancy IS NOT NULL
      AND l.max_occupancy >= 2
    ON CONFLICT (booking_id) DO NOTHING
    RETURNING id, access_token AS "accessToken", capacity_snapshot AS "capacitySnapshot"
  `)) as unknown as { id: string; accessToken: string; capacitySnapshot: number }[];

  if (created.length === 0) {
    // Either the group already exists (the common case — a double submit) or the guards above changed
    // underneath us. The owner-scoped read tells them apart WITHOUT widening what a stranger can learn.
    const existing = (await db.execute(sql`
      SELECT g.id, g.access_token AS "accessToken"
      FROM booking_group g
      JOIN booking b ON b.id = g.booking_id
      WHERE g.booking_id = ${parsed.data.bookingId} AND b.booker_id = ${userId}
    `)) as unknown as { id: string; accessToken: string }[];
    if (existing[0]) {
      return {
        ok: true,
        groupId: existing[0].id,
        accessToken: existing[0].accessToken,
        alreadyExisted: true,
      };
    }
    return { ok: false, error: DENIED };
  }

  await recordAudit({
    actorId: userId,
    action: "create_group",
    outcome: "ok",
    // NEVER the access token — it is a bearer credential, not an identifier (08-UI-SPEC §2).
    // `capacity` is the SNAPSHOTTED cap read back off the row this statement just wrote — not the listing's
    // raw rating. Auditing the rating would record a number that was never enforced (T-08-48).
    meta: {
      bookingId: parsed.data.bookingId,
      groupId: created[0].id,
      capacity: created[0].capacitySnapshot,
    },
  });

  revalidateGroupSurfaces(parsed.data.bookingId);
  return {
    ok: true,
    groupId: created[0].id,
    accessToken: created[0].accessToken,
    alreadyExisted: false,
  };
}

// ── submitRsvp (GROUP-03/GROUP-05 · D-112/D-116/D-117/D-120) ────────────────────────────────────────────

/**
 * The PUBLIC RSVP path. The invite token is the entire credential: this action does not require a session,
 * and that is not a gap — GROUP-03 exists precisely so a friend without a FitOut account can answer.
 *
 * A signed-in attendee is de-duped by `user_id` and a guest-with-email by normalized email; the two are
 * SINGLE-PATH (D-116/D-117), so when a session exists the submitted email is ignored entirely rather than
 * written alongside the account identity. A name-only guest matches neither index and is intentionally not
 * de-duped.
 *
 * D-120 is enforced twice over: `getGroupByToken` computes `rsvpClosed` with the POSTGRES clock (`now() >=
 * b.starts_at`) and this action refuses on it. There is no JS `Date` anywhere on this path.
 */
export async function submitRsvp(
  token: string,
  input: { name: string; email?: string; answer: "yes" | "no" },
): Promise<SubmitRsvpResult> {
  // A malformed token is the SAME calm state as an unknown one — never a distinguishable validation error
  // (T-08-17: the shapes of the two failures must not be a probe).
  const parsedToken = inviteTokenSchema.safeParse(token);
  if (!parsedToken.success) return { ok: false, error: INVITE_INACTIVE };

  // The session is READ, never required. Better Auth returns null for a guest.
  const session = await readSession();

  // A signed-in attendee RSVPs under their ACCOUNT's name, not a client-supplied one — the account name is
  // the trustworthy display string, and the invite form does not even render a name field when logged in.
  const name = session?.name?.trim() || input.name;
  const parsed = rsvpSchema.safeParse({ ...input, name });
  if (!parsed.success) return { ok: false, error: RSVP_FAILED };

  // RESOLVE FIRST. Nothing above this line has touched a rate-limit key (CR-04) — see the budget block
  // immediately below for why the order is the control.
  const group = await getGroupByToken(db, parsedToken.data);
  if (!group.active) return { ok: false, error: INVITE_INACTIVE };
  if (group.rsvpClosed) return { ok: false, error: RSVP_CLOSED };

  // THE BUDGETS, both keyed on something the DATABASE confirmed (CR-04/T-08-33). The link budget is keyed
  // on the RESOLVED `group.groupId`, so its key space is real `booking_group` rows — a token that names no
  // group mints no bucket at all, and the module-level store cannot be grown by anyone who can type. The
  // consequence to know about: a REGENERATED link shares its predecessor's budget, because the budget was
  // never about the credential, it was about the group behind it. The identity budget was always bounded
  // by the user table; it sits here so the ordering reads as one obvious step.
  const linkBudget = rateLimit(`rsvp:${group.groupId}`, RSVP_RATE_LIMIT);
  if (!linkBudget.ok) return { ok: false, error: TOO_FAST };
  if (session) {
    const identityBudget = rateLimit(`rsvp-identity:${session.id}`, RSVP_IDENTITY_RATE_LIMIT);
    if (!identityBudget.ok) return { ok: false, error: TOO_FAST };
  }

  // D-116/D-117 single-path identity. When a session exists the submitted address is DROPPED: writing both
  // would give one person two de-dup keys and therefore two possible rows.
  const userId = session?.id ?? null;
  const guestEmailNorm = userId ? null : normalizeEmail(parsed.data.email);

  // THE CAP IS DECIDED HERE AND NOWHERE ELSE (D-112). No pre-count, no "is it full?" read — the row lock
  // inside claimSeat is the authority, and a yes that loses the race comes back as a calm `full`.
  const claim = await claimSeat(db, {
    groupId: group.groupId,
    answer: parsed.data.answer,
    userId,
    guestEmailNorm,
    name: parsed.data.name,
  });
  if (!claim.ok) return { ok: false, error: groupFullCopy(group.capacitySnapshot) };

  // ── Everything below is a side-effect of a claim that has ALREADY COMMITTED. ──────────────────────────
  // `claimSeat` owns its transaction and has resolved; nothing here runs inside one (the emitNotify
  // contract). The whole block is guarded because a notification outage must never turn a successful RSVP
  // into an error for the person who just answered.
  const reachable = userId != null || guestEmailNorm != null;
  try {
    const whenLabel = whenLabelFor(group);
    const listingTitle = group.listingTitle ?? "the space";
    const base = appBaseUrl();

    // The ORGANIZER learns who answered — the point of the whole feature. Skipped when the organizer is
    // RSVPing to their own group: "You are coming to your own booking" is noise, not news.
    if (userId !== group.organizerId) {
      await emitNotify({
        type: "group_rsvp_received",
        recipientId: group.organizerId,
        bookingId: group.bookingId,
        email: group.organizerEmail,
        payload: {
          type: "group_rsvp_received",
          listingTitle,
          whenLabel,
          // Guest-typed free text (G6/T-08-08) — escaped by the email layer and auto-escaped as React text.
          attendeeLabel: parsed.data.name,
          answer: parsed.data.answer,
          href: `${base}/bookings/${group.bookingId}/group`,
        },
      });
    }

    // The attendee's own confirmation exists ONLY for a `yes`: the shipped copy on both channels is "you're
    // on the list", which would be a false statement to send to someone who just declined. A decline is
    // confirmed on-screen. Do NOT "complete the pattern" by inventing a declined type for it.
    if (parsed.data.answer === "yes") {
      if (userId) {
        // ACCOUNT attendee → the durable in-app row + email (fitout/notify).
        await emitNotify({
          type: "group_rsvp_confirmed",
          recipientId: userId,
          bookingId: group.bookingId,
          email: session?.email ?? null,
          payload: {
            type: "group_rsvp_confirmed",
            listingTitle,
            whenLabel,
            href: inviteUrl(group.accessToken),
          },
        });
      } else if (guestEmailNorm) {
        // GUEST-WITH-EMAIL → the email-only path. A guest has no `user.id`, so routing this through
        // fitout/notify would fail the recipient FK and burn four retries (RESEARCH Pitfall 2).
        //
        // THE D-117 OPT-IN GUARD, in one line: `guestEmailNorm` is derived from THIS request's own body.
        // No address is read out of the database here, and none is carried over from an earlier RSVP.
        const emailBudget = rateLimit(`guest-email:${guestEmailNorm}`, GUEST_EMAIL_RATE_LIMIT);
        if (emailBudget.ok) {
          await emitGuestEmail({
            to: guestEmailNorm,
            kind: "rsvp_confirmed",
            listingTitle,
            whenLabel,
            href: inviteUrl(group.accessToken),
          });
        } else {
          await recordAudit({
            actorId: "guest",
            action: "guest_email_suppressed",
            outcome: "denied",
            // NEVER the address (T-07-38 / T-08-09) — an anti-abuse record must not itself be the leak.
            meta: { reason: "rate_limit", groupId: group.groupId, retryAfter: emailBudget.retryAfter },
          });
        }
      }
      // A blank-email guest falls through with NO send of any kind (D-117/G3). Their on-screen
      // confirmation is the whole of it, and `reachable: false` is how the UI knows to say so.
    }
  } catch {
    // DELIBERATELY no error object in this log line: an enqueue error can echo the payload back, and the
    // payload carries a guest's address (the same no-leak discipline as the D-72 transfer catch).
    console.error("[group] rsvp_notify_failed", { groupId: group.groupId });
  }

  revalidateGroupSurfaces(group.bookingId);
  return { ok: true, status: claim.status, reachable };
}

// ── removeAttendee (D-121) ──────────────────────────────────────────────────────────────────────────────

/**
 * The organizer removes an attendee, freeing their spot.
 *
 * THE SEAT IS FREED UNDER THE SAME LOCK THE CLAIM TAKES. The delete runs inside a transaction that first
 * takes `SELECT capacity_snapshot … FOR UPDATE` on the group row — the identical statement `claimSeat`
 * opens with — so a removal and a concurrent RSVP serialise against each other instead of interleaving.
 * Without the lock the outcome would still be safe (a removal can only ever LOWER the count, so no
 * over-fill is possible), but a concurrent claim could count a row that is about to vanish and refuse a
 * guest a seat that was in fact free. Taking the lock costs one statement and removes the whole question.
 *
 * A row is DELETED, not flipped to 'no': "removed by the organizer" and "said they can't make it" are
 * different facts, and putting the first in the "Can't make it" list would put words in someone's mouth.
 * The UI says as much — they can RSVP again if they still have the link.
 */
export async function removeAttendee(rsvpId: string): Promise<ManageGroupResult> {
  const parsed = rsvpIdSchema.safeParse({ rsvpId });
  if (!parsed.success) return { ok: false, error: DENIED };

  const session = await readSession();
  if (!session) return { ok: false, error: NEEDS_SESSION };
  const userId = session.id;

  // Owner gate BEFORE any write, owner scope IN the read. Missing and not-mine are the same answer.
  const [owned] = (await db.execute(sql`
    SELECT r.id, g.id AS "groupId", g.booking_id AS "bookingId"
    FROM rsvp r
    JOIN booking_group g ON g.id = r.group_id
    JOIN booking b ON b.id = g.booking_id
    WHERE r.id = ${parsed.data.rsvpId}
      AND b.booker_id = ${userId}
  `)) as unknown as { id: string; groupId: string; bookingId: string }[];
  if (!owned) return { ok: false, error: DENIED };

  const limit = rateLimit(`group-manage:${userId}`, MANAGE_GROUP_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "remove_attendee",
      outcome: "denied",
      meta: { reason: "rate_limit", rsvpId: parsed.data.rsvpId, retryAfter: limit.retryAfter },
    });
    return { ok: false, error: TOO_FAST };
  }

  const removed = await db.transaction(async (tx) => {
    // The SAME lock the seat-claim takes, on the SAME single row — this is what serialises the free
    // against a concurrent claim (see the note above).
    await tx.execute(sql`SELECT capacity_snapshot FROM booking_group WHERE id = ${owned.groupId} FOR UPDATE`);
    return (await tx.execute(sql`
      DELETE FROM rsvp
      WHERE id = ${parsed.data.rsvpId}
        AND group_id = ${owned.groupId}
        -- DEFENCE IN DEPTH: the organizer scope lives in the DELETE's own WHERE too. Ownership is on the
        -- BOOKING, not on the rsvp, so it cannot be a bare column predicate — hence the EXISTS.
        AND EXISTS (
          SELECT 1 FROM booking_group g
          JOIN booking b ON b.id = g.booking_id
          WHERE g.id = rsvp.group_id AND b.booker_id = ${userId}
        )
      RETURNING id
    `)) as unknown as { id: string }[];
  });

  if (removed.length === 0) return { ok: false, error: DENIED };

  await recordAudit({
    actorId: userId,
    action: "remove_attendee",
    outcome: "ok",
    // The attendee's NAME and address are deliberately absent — an audit row is not a place to copy
    // someone's personal data to (T-07-38).
    meta: { groupId: owned.groupId, rsvpId: parsed.data.rsvpId },
  });

  revalidateGroupSurfaces(owned.bookingId);
  return { ok: true };
}

// ── regenerateLink (D-121) ──────────────────────────────────────────────────────────────────────────────

/**
 * Mint a NEW invite credential. The old token stops resolving the moment this commits — `getGroupByToken`
 * matches on `access_token`, so a replaced token is indistinguishable from one that never existed (which is
 * exactly the T-08-17 property: a leaked link dies quietly rather than announcing that it was revoked).
 *
 * The RSVPs are untouched. Regenerating kills the LINK, not the group — people who already answered stay on
 * the roster, which is what the confirmation copy promises.
 *
 * A VOIDED group cannot be regenerated: once a booking is cancelled its invites are dead (D-121) and
 * handing the organizer a fresh working link to a session that is not happening would be worse than useless.
 */
export async function regenerateLink(groupId: string): Promise<RegenerateLinkResult> {
  const parsed = groupIdSchema.safeParse({ groupId });
  if (!parsed.success) return { ok: false, error: DENIED };

  const session = await readSession();
  if (!session) return { ok: false, error: NEEDS_SESSION };
  const userId = session.id;

  const owned = await getOwnedGroupById(db, { groupId: parsed.data.groupId, organizerId: userId });
  if (!owned) return { ok: false, error: DENIED };

  const limit = rateLimit(`group-manage:${userId}`, MANAGE_GROUP_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "regenerate_group_link",
      outcome: "denied",
      meta: { reason: "rate_limit", groupId: parsed.data.groupId, retryAfter: limit.retryAfter },
    });
    return { ok: false, error: TOO_FAST };
  }

  const accessToken = makeInviteToken();
  const updated = (await db.execute(sql`
    UPDATE booking_group
    SET access_token = ${accessToken}
    WHERE id = ${parsed.data.groupId}
      AND voided_at IS NULL
      -- Owner scope repeated inside the UPDATE (defence in depth, as on every mutation in this file).
      AND EXISTS (
        SELECT 1 FROM booking b
        WHERE b.id = booking_group.booking_id AND b.booker_id = ${userId}
      )
    RETURNING id
  `)) as unknown as { id: string }[];

  if (updated.length === 0) return { ok: false, error: GROUP_NOT_ACTIVE };

  await recordAudit({
    actorId: userId,
    action: "regenerate_group_link",
    outcome: "ok",
    // NEITHER token appears here. An audit row that recorded the credential would outlive the rotation
    // that was the whole point of the action.
    meta: { groupId: parsed.data.groupId, bookingId: owned.bookingId },
  });

  revalidateGroupSurfaces(owned.bookingId);
  return { ok: true, accessToken };
}
