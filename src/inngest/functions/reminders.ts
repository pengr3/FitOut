// D-85/D-87 reminders. AT-MOST-ONCE IS A DATABASE CONSTRAINT, NOT AN APPLICATION CHECK AND NOT A VENDOR
// TTL. Inngest offers event-level `id` dedupe and function-level `idempotency`, but BOTH are documented as
// "an idempotency key over a 24 hour period" and are "bypassed by debouncing, event batching, and function
// pausing." A 24-hour window is a coincidental fit for reminders and a STRUCTURAL MISMATCH for the
// guarantee D-87 asks for — relying on it would make "one reminder each" depend on a vendor's dedupe TTL
// and on nobody enabling batching later.
//
// Instead we use the house idiom, already proven twice: booking_reminder's UNIQUE(booking_id, kind) where
// the INSERT ITSELF is the lock. There is deliberately NO app-level "already sent?" pre-query — that is
// the exact race the constraint exists to kill.
//
// D-88: there are NO notification preferences. Every reminder is transactional — tied to a booking the
// user themselves created — so it sits outside marketing-consent regimes (PH DPA, CAN-SPAM, GDPR all
// treat transactional mail this way).
//
// ---------------------------------------------------------------------------
// THE FOUR REMINDERS (D-85), and the two clocks they hang off
// ---------------------------------------------------------------------------
//   pre_expiry          → BOOKER, before an `approved` hold's payment window closes  (b.expires_at)
//   pre_sla_host        → HOST,   before a `requested` hold's approval SLA lapses    (b.expires_at)
//   pre_session_booker  → BOOKER, before a `confirmed` session starts                (b.starts_at)
//   pre_session_host    → HOST,   before a `confirmed` session starts                (b.starts_at)
//
// EVERY due query is a RANGE against the DB CLOCK, never an instant. An hourly cron cannot hit an offset
// more precisely than ±1 hour, so an equality/instant predicate would silently skip a reminder whenever a
// tick was late, paused or redeployed. A range plus the UNIQUE claim means a missed tick RECOVERS on the
// next one and still can never double-send — the two halves are complementary and neither works alone.
//
// ⚠️ A D-96 CAP-SHORTENED SLA CAN MAKE A REMINDER UNREACHABLE. 07-05 capped every hold expiry at
// `starts_at` and split the request SLA proportionally, so an SLA is no longer a flat 24h: a request 4h out
// gives the host a ~2h SLA and the 6h `pre_sla_host` offset can NEVER be satisfied for it. The
// `expires_at > now()` guard turns that into a clean NO-SEND — no row, no emission, no crash, and
// emphatically not a reminder fired immediately or scheduled in the past. That behaviour is CORRECT but
// SILENT, which is exactly why tests/notifications/reminders.test.ts asserts it explicitly.
//
// ---------------------------------------------------------------------------
// TIMESTAMP BOUNDARY (the 07-06 repo contract)
// ---------------------------------------------------------------------------
// `dbConn.execute` returns `timestamptz` as Postgres TEXT, not as a `Date`. An `as unknown as Row[]` cast
// over a `Date`-typed projection compiles, lints AND builds cleanly, then hands `composeWhenLabel` a string
// on the first real row. Reminder scheduling is entirely timestamp math, so every instant here is selected
// as strict ISO-8601 through the shared `isoUtc` mask and hydrated ONCE, at the boundary in `hydrate`.

import { randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";

import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { isoUtc } from "@/lib/booking/bookings-query";
import { composeWhenLabel, composeDeadlineLabel } from "@/lib/booking/when-label";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { emitNotify } from "@/lib/notifications";
import {
  PRE_EXPIRY_REMINDER_HOURS,
  PRE_SESSION_BOOKER_REMINDER_HOURS,
  PRE_SESSION_HOST_REMINDER_HOURS,
  PRE_SLA_REMINDER_HOURS,
} from "@/lib/payments/config";

/** How many due rows ONE kind claims per pass. Hourly cadence — one pass drains a normal backlog. */
const REMINDER_BATCH_SIZE = 100;

/** The four D-85 kinds, mirroring the `reminder_kind` pgEnum (schema.ts). */
export type ReminderKind = "pre_expiry" | "pre_session_booker" | "pre_session_host" | "pre_sla_host";

/**
 * The MINIMAL identity of a due reminder — and the ONLY thing that crosses an Inngest step boundary.
 *
 * A step's return value is JSON-serialized and MEMOIZED: on a replay it comes back as whatever JSON can
 * represent, so a `Date` returned from `find-due` would reappear as a STRING in a later step and every
 * downstream `format()` call would throw or mislabel. Passing two strings and RE-READING the row inside the
 * per-reminder step avoids that class of bug entirely — and buys the stronger property below.
 */
export type ReminderRef = { bookingId: string; kind: ReminderKind };

/** A due reminder with everything the copy needs. Instants are real `Date`s, hydrated at the boundary. */
export type DueReminder = {
  bookingId: string;
  kind: ReminderKind;
  listingId: string;
  /** WHO gets it: `booking.booker_id` for booker reminders, `listing.host_id` for host ones (T-07-78). */
  recipientId: string;
  email: string | null;
  listingTitle: string | null;
  /** The BOOKER's display name — the `reminder_pre_sla` payload names the guest to the host. */
  bookerLabel: string | null;
  startsAt: Date;
  endsAt: Date;
  /** The deadline the pre_expiry / pre_sla reminders hang off. Always non-null for those two kinds. */
  expiresAt: Date | null;
  timezone: string;
  city: string | null;
  quotedTotalCents: number | null;
  /**
   * The frozen SPACE price. REQUIRED by `composeWhenLabel` to re-derive "Full day" — under D-74 the
   * charged total is all-in (space + service fee) and can NEVER equal `hourlyRate × hours`, so deriving
   * from it would label EVERY hourly booking "Full day" in every reminder, silently.
   */
  spacePriceCents: number | null;
  hourlyRateCents: number | null;
  currency: string;
};

/** The raw driver row — see the TIMESTAMP BOUNDARY note in the header for why the ISO detour. */
type RawDueRow = Omit<DueReminder, "kind" | "startsAt" | "endsAt" | "expiresAt"> & {
  startsAtIso: string;
  endsAtIso: string;
  expiresAtIso: string | null;
};

/** The per-reminder outcome (JSON-serializable across the Inngest step boundary). */
export type RemindOneResult =
  | { status: "sent" }
  /** The ON CONFLICT loser: another pass / a retry / an overlapping sweep already owns this reminder. */
  | { status: "skipped-claimed" }
  /**
   * The booking stopped qualifying between SCHEDULING and SENDING — cancelled, declined, paid, expired, or
   * simply out of range now. NOT in the plan's result union; added because a status checked only at
   * schedule time is not a guarantee (see `remindOne`).
   */
  | { status: "skipped-not-due" };

/**
 * The kind's status + time predicate. All four are RANGE-based against the DB clock `now()` — never an
 * instant, never a JS clock (the same discipline as the payout sweep and both lazy-expiry sweeps).
 *
 * The `> now()` half of each range is not decoration. It is what makes an UNREACHABLE offset a clean
 * no-send: a deadline already in the past drops out of the range instead of firing a reminder about a
 * moment that has already gone by.
 *
 * Each predicate is also STATUS-SCOPED to a live state (T-07-79). A cancelled, declined, completed or
 * already-paid booking matches none of them, so a terminal booking can never be reminded about.
 */
function duePredicate(kind: ReminderKind): SQL {
  switch (kind) {
    // Approved but UNPAID — the highest-value reminder, the one D-89 accepted risk on.
    case "pre_expiry":
      return sql`b.status = 'approved'
        AND b.expires_at > now()
        AND b.expires_at <= now() + make_interval(hours => ${PRE_EXPIRY_REMINDER_HOURS}::int)`;

    // A host sitting on a pending request. ⚠️ A D-96 cap-shortened SLA can make this reminder UNREACHABLE —
    // a request 4h out gives the host a 2h SLA, so a 6h offset can never fire. The `expires_at > now()`
    // guard handles that gracefully (no row, no send), which is CORRECT but SILENT — hence the dedicated
    // test. Do NOT "fix" it by dropping the guard: that would fire the reminder after the deadline passed.
    case "pre_sla_host":
      return sql`b.status = 'requested'
        AND b.expires_at > now()
        AND b.expires_at <= now() + make_interval(hours => ${PRE_SLA_REMINDER_HOURS}::int)`;

    case "pre_session_booker":
      return sql`b.status = 'confirmed'
        AND b.starts_at > now()
        AND b.starts_at <= now() + make_interval(hours => ${PRE_SESSION_BOOKER_REMINDER_HOURS}::int)`;

    case "pre_session_host":
      return sql`b.status = 'confirmed'
        AND b.starts_at > now()
        AND b.starts_at <= now() + make_interval(hours => ${PRE_SESSION_HOST_REMINDER_HOURS}::int)`;
  }
}

/** The recipient column for a kind — resolved by an explicit join, never inferred downstream (T-07-78). */
function recipientColumn(kind: ReminderKind): SQL {
  return kind === "pre_session_host" || kind === "pre_sla_host"
    ? sql`l.host_id`
    : sql`b.booker_id`;
}

/**
 * Run a kind's due query.
 *
 * `bookingId === null` (the SWEEP path) anti-joins `booking_reminder` so already-claimed rows are skipped
 * cheaply, and batches. `bookingId !== null` (the SEND path) deliberately OMITS that anti-join: the CLAIM,
 * not the join, is the authority on at-most-once, and letting the reload decide would turn a genuine
 * duplicate into a "not due" and hide the very race the constraint exists to report.
 */
async function runDue(
  dbConn: DbConn,
  kind: ReminderKind,
  bookingId: string | null,
): Promise<DueReminder[]> {
  const antiJoin =
    bookingId === null
      ? sql`LEFT JOIN booking_reminder r ON r.booking_id = b.id AND r.kind = ${kind}::reminder_kind`
      : sql``;
  const scope =
    bookingId === null ? sql`AND r.id IS NULL` : sql`AND b.id = ${bookingId}`;

  const rows = (await dbConn.execute(sql`
    SELECT
      b.id                     AS "bookingId",
      b.listing_id             AS "listingId",
      ${recipientColumn(kind)} AS "recipientId",
      rcpt.email               AS "email",
      l.title                  AS "listingTitle",
      bkr.first_name           AS "bookerLabel",
      l.timezone               AS "timezone",
      l.city                   AS "city",
      b.quoted_total_cents     AS "quotedTotalCents",
      b.space_price_cents      AS "spacePriceCents",
      l.hourly_rate_cents      AS "hourlyRateCents",
      b.currency               AS "currency",
      ${isoUtc("b.starts_at")}  AS "startsAtIso",
      ${isoUtc("b.ends_at")}    AS "endsAtIso",
      ${isoUtc("b.expires_at")} AS "expiresAtIso"
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    JOIN "user" bkr ON bkr.id = b.booker_id
    JOIN "user" rcpt ON rcpt.id = ${recipientColumn(kind)}
    ${antiJoin}
    WHERE ${duePredicate(kind)}
    ${scope}
    ORDER BY COALESCE(b.expires_at, b.starts_at) ASC
    LIMIT ${REMINDER_BATCH_SIZE}
  `)) as unknown as RawDueRow[];

  return rows.map((r) => hydrate(r, kind));
}

/** The ONE timestamp-hydration site. `new Date(iso)` here is a parse, not a clock read. */
function hydrate(r: RawDueRow, kind: ReminderKind): DueReminder {
  return {
    bookingId: r.bookingId,
    kind,
    listingId: r.listingId,
    recipientId: r.recipientId,
    email: r.email,
    listingTitle: r.listingTitle,
    bookerLabel: r.bookerLabel,
    startsAt: new Date(r.startsAtIso),
    endsAt: new Date(r.endsAtIso),
    expiresAt: r.expiresAtIso === null ? null : new Date(r.expiresAtIso),
    timezone: r.timezone,
    city: r.city,
    quotedTotalCents: r.quotedTotalCents,
    spacePriceCents: r.spacePriceCents,
    hourlyRateCents: r.hourlyRateCents,
    currency: r.currency,
  };
}

/** Approved holds whose D-95 payment window closes within `PRE_EXPIRY_REMINDER_HOURS`. */
export function queryDuePreExpiry(dbConn: DbConn): Promise<DueReminder[]> {
  return runDue(dbConn, "pre_expiry", null);
}

/** Confirmed sessions starting within `PRE_SESSION_BOOKER_REMINDER_HOURS` — to the BOOKER. */
export function queryDuePreSessionBooker(dbConn: DbConn): Promise<DueReminder[]> {
  return runDue(dbConn, "pre_session_booker", null);
}

/** Confirmed sessions starting within `PRE_SESSION_HOST_REMINDER_HOURS` — to the HOST. */
export function queryDuePreSessionHost(dbConn: DbConn): Promise<DueReminder[]> {
  return runDue(dbConn, "pre_session_host", null);
}

/** Pending requests whose SLA lapses within `PRE_SLA_REMINDER_HOURS` — to the HOST. May be UNREACHABLE. */
export function queryDuePreSlaHost(dbConn: DbConn): Promise<DueReminder[]> {
  return runDue(dbConn, "pre_sla_host", null);
}

/**
 * CLAIM BEFORE SEND — the at-most-once lock, and the ORDER is the whole point.
 *
 * If the send were attempted first and the process died before the marker was written, the next tick would
 * DOUBLE-SEND. Claiming first means a crash between claim and send LOSES a reminder — the strictly better
 * failure under D-87 ("no double-tap"), and the same ordering `payOne` uses for money.
 *
 * The INSERT ITSELF is the lock. There is deliberately NO app-level "already sent?" pre-query — a
 * `SELECT … then INSERT` is precisely the race `UNIQUE(booking_id, kind)` exists to kill, and it is the
 * one shape that looks correct in every code review and fails only under concurrency. Immune to cron
 * overlap, Inngest step retries, backfills and multi-instance deploys, because the guarantee is a database
 * constraint rather than an application check or a vendor TTL.
 *
 * Empty `RETURNING` ⇒ someone already owns this (booking, kind) ⇒ return false and emit NOTHING.
 */
export async function claimReminder(
  dbConn: DbConn,
  bookingId: string,
  kind: string,
): Promise<boolean> {
  const claimed = (await dbConn.execute(sql`
    INSERT INTO booking_reminder (id, booking_id, kind)
    VALUES (${randomUUID()}, ${bookingId}, ${kind}::reminder_kind)
    ON CONFLICT (booking_id, kind) DO NOTHING
    RETURNING id
  `)) as unknown as { id: string }[];
  return claimed.length > 0;
}

/** Where each reminder's single CTA points. Absolute — one href feeds BOTH channels (D-91). */
function hrefFor(kind: ReminderKind, r: DueReminder): string {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  switch (kind) {
    // Straight to the Phase-5 checkout for the hold that is about to lapse — the whole point of the nudge.
    case "pre_expiry":
      return `${base}/listings/${r.listingId}/book?hold=${r.bookingId}`;
    case "pre_session_booker":
      return `${base}/bookings/${r.bookingId}`;
    case "pre_session_host":
      return `${base}/host/bookings/${r.bookingId}`;
    case "pre_sla_host":
      return `${base}/host/requests`;
  }
}

/**
 * Compose the `fitout/notify` event for a due reminder.
 *
 * Every time string comes from the SHARED venue-local formatters (07-02) — `composeWhenLabel` for the
 * booking window, `composeDeadlineLabel` for the single deadline instant. Never a new format, and never an
 * hour count from config: under D-96 the REAL deadline is frequently not `APPROVAL_SLA_HOURS` from now, so
 * a label rendered from the constant would be wrong on exactly the short-notice bookings where the
 * deadline matters most. Always compose from the row's own `expires_at`.
 *
 * Both deadline kinds are guarded by `expires_at > now()` in their due predicate, so `expiresAt` is
 * non-null here by construction; `startsAt` is the fallback rather than a `Date | null` leaking into
 * `format()` as an Invalid Date.
 */
function buildEvent(r: DueReminder): Parameters<typeof emitNotify>[0] {
  const listingTitle = r.listingTitle ?? "your space";
  const whenLabel = composeWhenLabel({
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    timezone: r.timezone,
    city: r.city,
    spacePriceCents: r.spacePriceCents,
    quotedTotalCents: r.quotedTotalCents,
    hourlyRateCents: r.hourlyRateCents,
  });
  const href = hrefFor(r.kind, r);

  if (r.kind === "pre_expiry") {
    return {
      type: "reminder_pre_expiry",
      recipientId: r.recipientId,
      bookingId: r.bookingId,
      email: r.email,
      payload: {
        type: "reminder_pre_expiry",
        listingTitle,
        whenLabel,
        totalLabel: formatMoney(r.quotedTotalCents ?? 0, r.currency ?? DISPLAY_CURRENCY),
        payByLabel: composeDeadlineLabel(r.expiresAt ?? r.startsAt, r.timezone, r.city),
        href,
      },
    };
  }

  if (r.kind === "pre_sla_host") {
    return {
      type: "reminder_pre_sla",
      recipientId: r.recipientId,
      bookingId: r.bookingId,
      email: r.email,
      payload: {
        type: "reminder_pre_sla",
        listingTitle,
        whenLabel,
        bookerLabel: r.bookerLabel ?? "A guest",
        respondByLabel: composeDeadlineLabel(r.expiresAt ?? r.startsAt, r.timezone, r.city),
        href,
      },
    };
  }

  // Both pre-session kinds share ONE notification type — the audience differs, the shape does not.
  return {
    type: "reminder_pre_session",
    recipientId: r.recipientId,
    bookingId: r.bookingId,
    email: r.email,
    payload: { type: "reminder_pre_session", listingTitle, whenLabel, href },
  };
}

/**
 * Send ONE reminder, at most once, ever. The order is load-bearing:
 *
 *   1. RE-READ the booking against its kind's live predicate. A status checked only when the sweep was
 *      SCHEDULED is not a guarantee — a booking can be cancelled, declined, paid or expire between the
 *      `find-due` step and this one (an Inngest step boundary is a real gap, and a retried step can run
 *      much later than the tick that queued it). Re-reading here means a dead booking is never reminded
 *      about, and it costs one indexed lookup.
 *   2. CLAIM. The INSERT is the lock; empty RETURNING ⇒ already owned ⇒ emit NOTHING.
 *   3. EMIT. Post-claim, and self-swallowing: `emitNotify` already swallows its own transport errors, and
 *      this catch additionally guards the LABEL COMPOSITION. A reminder that cannot be composed or
 *      delivered must never fail the sweep step — the claim is deliberately CONSUMED either way, which is
 *      the strictly better failure under D-87. The `onFailure` audit path (07-07) surfaces a send that
 *      exhausts its retries.
 *
 * Logs carry the booking id and the kind ONLY — never the recipient's address and never the payload.
 */
export async function remindOne(dbConn: DbConn, ref: ReminderRef): Promise<RemindOneResult> {
  const [target] = await runDue(dbConn, ref.kind, ref.bookingId);
  if (!target) return { status: "skipped-not-due" }; // cancelled / actioned / no longer in range

  if (!(await claimReminder(dbConn, ref.bookingId, ref.kind))) {
    return { status: "skipped-claimed" };
  }

  try {
    await emitNotify(buildEvent(target));
  } catch (err) {
    console.error("[reminders] emit_failed", { bookingId: ref.bookingId, kind: ref.kind, err });
  }
  return { status: "sent" };
}

/**
 * The D-85 reminder sweep: an hourly, timezone-aware, SINGLETON (single-concurrency) cron at minute 45 —
 * `:00` payout-sweep, `:15` request-expiry and `:30` payout-reconcile are taken, so :45 is the free slot
 * (Pitfall 4: crons must not contend).
 *
 * The singleton setting is DEFENCE IN DEPTH, not the guarantee. The guarantee is the UNIQUE claim; two
 * overlapping sweeps, a replayed step and a backfill all converge on exactly one reminder regardless.
 *
 * Each due reminder is sent inside its OWN `step.run` so a mid-batch failure retries just that reminder,
 * never the whole sweep — and only two STRINGS cross the step boundary (see `ReminderRef`).
 */
// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the cron trigger lives in
// options.triggers. The 3-arg (config, trigger, handler) skeleton in most online examples is STALE.
export const remindersSweep = inngest.createFunction(
  {
    id: "reminders-sweep",
    concurrency: 1, // singleton — no overlapping sweeps
    triggers: [{ cron: "TZ=Asia/Manila 45 * * * *" }], // hourly, minute 45 (offset from the three others)
  },
  async ({ step }) => {
    const due = await step.run("find-due", async () => {
      const batches = await Promise.all([
        queryDuePreExpiry(db),
        queryDuePreSlaHost(db),
        queryDuePreSessionBooker(db),
        queryDuePreSessionHost(db),
      ]);
      // Only JSON-safe scalars cross the boundary — the full row is re-read inside each send step.
      return batches
        .flat()
        .map((r): ReminderRef => ({ bookingId: r.bookingId, kind: r.kind }));
    });

    for (const ref of due) {
      await step.run(`remind-${ref.kind}-${ref.bookingId}`, () => remindOne(db, ref));
    }
    return { swept: due.length };
  },
);
