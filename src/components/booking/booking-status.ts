// Pure booking-LIFECYCLE-status derivation (MANAGE-02 · D-79 / D-102) — the SINGLE source of truth that
// /bookings, /host/bookings and /bookings/[id] all render from, so the booker and host views can never
// drift. Mirrors ./../host/payout-ledger-status.ts exactly in shape: a pure, exhaustive switch returning a
// { label, tone, icon } view object.
//
// This is a NON-client module (it carries no client directive and no client-only import) so a Server
// Component can CALL deriveBookingStatusView / deriveDisplayStatus directly. A client-directive module's
// exports become client references when imported by a Server Component and CANNOT be invoked server-side —
// that exact mistake crashed /host in a prior UAT (see ../host/payout-status.ts). Keep this file free of
// any directive (T-07-07).
//
// The states are CALM (07-UI-SPEC § Color): `cancelled`, `declined` and `completed` are neutral —
// never red, never --success. `confirmed` is the ONE success signal; `approved` is deliberately NOT success
// because it is not paid yet.
//
// DS-10: the tone is no longer a union spelled out here. It is `StatusTone`, the closed four-tone
// vocabulary in @/lib/design/status-tones — the same union the payout ledger view is typed against, so the
// two sides of the marketplace can no longer drift into two different tone alphabets (they had, and neither
// was the one the design system declared). The three tones this file used to spell out map onto it exactly:
// the two in-flight/closed treatments both collapse to `neutral`, and the success treatment becomes
// `positive`. That mapping is written out in full in the tone module's header.

import type { StatusTone } from "@/lib/design/status-tones";

/** The booking status as STORED in the DB (mirrors the booking_status pgEnum, schema.ts:497). */
export type BookingDbStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "declined"
  | "completed"
  | "requested"
  | "approved";

/** The status as DISPLAYED. Same vocabulary, but `completed` here is DERIVED — never read from the DB. */
export type BookingDisplayStatus = BookingDbStatus;

/** The presentation view for one display status: label (side-specific) + tone (drives the badge recipe)
 *  + the lucide icon name (every badge is icon + text, NEVER colour-only — 07-UI-SPEC § Accessibility). */
export type BookingStatusView = {
  label: string;
  tone: StatusTone;
  icon:
    | "CircleDashed"
    | "Hourglass"
    | "CalendarCheck"
    | "CheckCircle2"
    | "Check"
    | "XCircle"
    | "Ban";
};

/** Which side is reading — the same DB status reads differently wherever the next action differs. */
export type BookingSide = "booker" | "host";

/**
 * D-102: `completed` is DERIVED AT READ TIME and NEVER stored. A `confirmed` booking whose endsAt has
 * passed displays as Completed — zero cron, zero writes, cannot drift, and cannot race the occupancy
 * predicate (the `completed` enum value stays unused, so the GiST EXCLUDE predicate is untouched).
 *
 * `now` is passed IN and must come from the DB clock at the call site (never Date.now() here) — the same
 * rule the refund preview follows. A JS-clock `now` could move a booking between the Upcoming and Past
 * tabs independently of the SQL partition that pages them (T-07-10).
 *
 * The boundary is `endsAt <= now`: the instant the session ends it is history, matching the half-open
 * `[)` window the double-booking constraint uses.
 */
export function deriveDisplayStatus(
  status: BookingDbStatus,
  endsAt: Date,
  now: Date,
  cancelledBy?: string | null,
): BookingDisplayStatus {
  // T8 (07-18): a booker who cancels their own unpaid `requested` hold is stored `declined` +
  // cancelled_by='booker' (cancelUnpaidHold) — that is a CANCELLATION, not a host decline. Remap it BEFORE
  // the completed rule. A genuine host decline / SLA lapse leaves cancelled_by NULL (or 'host'/'system') and
  // is untouched, so durable pre-existing declined rows keep their meaning. The param is OPTIONAL, so every
  // existing call site compiles unchanged and only a booker-cancelled `declined` row is ever rewritten.
  if (status === "declined" && cancelledBy === "booker") return "cancelled";
  if (status === "confirmed" && endsAt.getTime() <= now.getTime()) return "completed";
  return status;
}

/**
 * Derive the calm presentation view for a booking status (07-UI-SPEC § Status badge matrix). Pure,
 * server-callable. Resolves the D-102 derived `completed` FIRST, then an EXHAUSTIVE switch over the
 * DISPLAY status — there is deliberately NO fallthrough clause, so adding a booking_status enum value
 * becomes a compile error here rather than a silently unlabelled badge in production.
 *
 * D-79: no label ever carries a money string. A partially-refunded cancellation still reads `Cancelled`;
 * the refund amount renders as a SIBLING line beneath the badge, composed by the caller.
 */
export function deriveBookingStatusView(
  status: BookingDbStatus,
  endsAt: Date,
  now: Date,
  side: BookingSide,
  cancelledBy?: string | null,
): BookingStatusView {
  // Forward `cancelledBy` so the exhaustive switch lands on the `cancelled` case for a booker-cancelled
  // request (T8). The switch stays EXHAUSTIVE with NO `default:` clause — the compile-gate for "adding a
  // booking_status" is load-bearing (STATE.md notification contract).
  const display = deriveDisplayStatus(status, endsAt, now, cancelledBy);
  switch (display) {
    case "pending":
      // The short-lived checkout hold. Calm — the booker is mid-payment, not late.
      return { label: "Awaiting payment", tone: "neutral", icon: "CircleDashed" };
    case "requested":
      // The booker is waiting on a human; the host is holding the action.
      return {
        label: side === "booker" ? "Awaiting host" : "Requested",
        tone: "neutral",
        icon: "Hourglass",
      };
    case "approved":
      // The one status whose next action differs by side: the booker owes payment, the host waits for it.
      // NEVER --success (06-UI-SPEC): approved is not paid yet. DS-10 folds the old bordered treatment
      // into `neutral` — approved is in-flight, which is what neutral means; it was never a distinct tone,
      // only a distinct border. The CalendarCheck icon is what distinguishes it, as it always was.
      return {
        label: side === "booker" ? "Approved — pay now" : "Awaiting payment",
        tone: "neutral",
        icon: "CalendarCheck",
      };
    case "confirmed":
      // The ONE terminal success signal, both sides (same treatment as the Paid payout badge).
      return { label: "Confirmed", tone: "positive", icon: "CheckCircle2" };
    case "completed":
      // DERIVED (D-102), never stored. Neutral, not green — inert history, not a live success.
      return { label: "Completed", tone: "neutral", icon: "Check" };
    case "declined":
      return { label: "Declined", tone: "neutral", icon: "XCircle" };
    case "cancelled":
      // Single status for full AND partial refunds (D-79) — the amount is a sibling line, never here.
      return { label: "Cancelled", tone: "neutral", icon: "Ban" };
  }
}

/**
 * The heading + body for a `declined`-status booking's /bookings/[id] landing, selected on WHO ended it
 * (T8). This single call IS the booker-vs-host selection — the page must never re-implement the conditional
 * inline.
 *
 * PARAMETER-FREE by design: neither string carries a `{date}`/`{time}`/venue token, so the caller renders
 * `{title} · {whenLabel}` on a SEPARATE sibling line — the same two-line layout the `cancelled` branch uses.
 * A booker who cancelled their own unpaid hold (cancelled_by='booker') must never read "the host couldn't
 * take your booking"; a genuine host decline / SLA lapse (NULL / 'host' / 'system') keeps the host-decline
 * copy.
 */
export function declinedCopy(cancelledBy: string | null): { heading: string; body: string } {
  if (cancelledBy === "booker") {
    return {
      heading: "You cancelled this request",
      body: "You cancelled your request — you haven't been charged.",
    };
  }
  return {
    heading: "This request wasn't available",
    body: "The host couldn't take your booking. You haven't been charged — plenty of other spaces are open.",
  };
}
