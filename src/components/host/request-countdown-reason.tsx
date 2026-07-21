// D-99 — the cap-shortened-SLA explanation. ONE muted line beneath the countdown, and nothing at all
// otherwise.
//
// THE PROBLEM IT SOLVES. D-96 splits the remaining time proportionally when the D-94 session-start cap bites:
// a request made 25 hours out gives the host the flat APPROVAL_SLA_HOURS, but one made 4 hours out gives the
// host 2 hours and leaves the booker the other 2. So a host looking at their inbox sees "Expires in 24h 00m"
// on one row and "Expires in 2h 00m" on another, with nothing on screen explaining the difference. Without a
// reason, varying deadlines read as INCONSISTENCY — as a bug in FitOut rather than a property of the booking
// — and that misreading is the entire thing D-99 exists to prevent.
//
// D-99 ADDS A LINE, NOT A COMPONENT. `RequestCountdown` (06-08) already renders arbitrary hour-scale
// durations correctly and is deliberately NOT touched: it has shipped, it is used on the booker's payment
// window too, and the explanation is a property of the ROW (which needs createdAt and startsAt), not of the
// countdown (which needs only a deadline). This is that sibling line.
//
// A SERVER component: no client directive, no hooks, no clock read of its own. `now` is passed in from the
// caller's single `readDbNow` so this line, the countdown's deadline and the row's own ordering all agree
// with the DB (the same rule `deriveBookingStatusView` follows). It is rendered by an RSC and also passed as
// a ReactNode into the client `RequestRow` for the mobile card — server-rendered either way.
//
// Muted, Label 400, NEVER an alarm colour (07-UI-SPEC § 9). A short deadline is a normal consequence of a
// short-notice booking, not a failure state, and colouring it as one would manufacture exactly the urgency
// C6 forbids.

import { APPROVAL_SLA_HOURS } from "@/lib/payments/config";

const HOUR_MS = 3_600_000;

/**
 * Absorbs write latency between the row's `created_at` default and the `expires_at` SQL expression evaluated
 * in the same statement. They are computed microseconds apart in practice, so any tolerance in the minutes
 * would do; a few minutes is chosen because it is unambiguously larger than any write delay and unambiguously
 * smaller than the smallest meaningful cap (MIN_APPROVE_WINDOW_HOURS is an hour).
 */
const CAP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Renders the reason line ONLY when the deadline is genuinely cap-derived — i.e. materially earlier than the
 * flat `createdAt + APPROVAL_SLA_HOURS` this request would have got with plenty of runway. An uncapped
 * request renders NOTHING: explaining a deadline that needs no explanation is noise, and noise on every row
 * is how a genuine signal stops being read.
 */
export function RequestCountdownReason({
  createdAt,
  expiresAt,
  startsAt,
  now,
}: {
  /** When the request was made — the anchor the flat SLA would have run from. */
  createdAt: Date;
  /** The row's REAL deadline, off `booking.expires_at`. Never a config constant re-derived at render. */
  expiresAt: Date;
  startsAt: Date;
  /** The DB clock, read once by the caller. Never `Date.now()` here. */
  now: Date;
}) {
  const flatDeadlineMs = createdAt.getTime() + APPROVAL_SLA_HOURS * HOUR_MS;
  // Not capped (or capped by less than the write-latency tolerance) → say nothing.
  if (expiresAt.getTime() >= flatDeadlineMs - CAP_TOLERANCE_MS) return null;

  const msToStart = startsAt.getTime() - now.getTime();
  // The session has already begun: the deadline is moot and the row is on its way out on the next sweep.
  // "Session starts in 0h" would be a stranger thing to read than nothing.
  if (msToStart <= 0) return null;

  const hours = Math.floor(msToStart / HOUR_MS);
  const startsIn = hours < 1 ? "under an hour" : `${hours}h`;

  return <p className="text-sm text-muted-foreground">Session starts in {startsIn} — respond soon.</p>;
}