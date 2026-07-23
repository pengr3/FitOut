// One row of the D-92 notification panel, plus the pure helpers that build its data.
//
// No "use client" directive: this module is server-renderable and its helpers (`toNotificationItems`,
// `formatTimeAgo`, `safeHref`, `describeNotification`) are imported by the two layouts on the SERVER to
// build the props the client bell receives. It joins the client graph only because notification-bell.tsx
// imports the component — which is what lets the bell hand `onSelect` down.
//
// EXHAUSTIVENESS IS THE POINT. `describeNotification` switches over `NotificationPayload["type"]` with NO
// `default` clause, closed instead by a trailing `never` assignment (the 07-07 convention). Adding a
// notification kind without giving it a title, a body and an icon is therefore a COMPILE ERROR, not a
// blank row in someone's panel. That is the entire reason the payload is a discriminated union, and a
// fallback clause would throw it away in exchange for a silent gap and a green build.
//
// SECURITY — two rules, both load-bearing:
//   1. Every payload field is user-influenceable (a listing title, a guest's name). All of them render as
//      React TEXT CHILDREN, which React escapes. Raw-HTML injection APIs are banned in this directory
//      outright (T-07-84) — there is no payload field that could ever justify one.
//   2. React escaping does NOT sanitise a URL: it renders `<a href>` verbatim, so a `javascript:` scheme
//      survives escaping intact. 07-07 added scheme validation at the WRITE boundary
//      (src/lib/validation/notification.ts) — this is the RENDER-side counterpart, and it exists because
//      the write guard postdates nothing: rows written before it, rows from a future writer that forgets
//      the shared boundary, and rows edited in the DB by hand all reach exactly this component. Defence
//      at one end of a durable pipe is not defence.

import Link from "next/link";
import {
  AlarmClockIcon,
  BanknoteIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarXIcon,
  CircleCheckIcon,
  HourglassIcon,
  InboxIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { NotificationPayload } from "@/lib/db/schema";
import type { NotificationRow } from "@/lib/notifications";

/** The serialisable shape the server hands the client bell. No Dates cross the boundary — see below. */
export type NotificationItemData = {
  id: string;
  payload: NotificationPayload;
  /** Precomputed server-side so the row's tint/dot never disagrees with the badge count. */
  unread: boolean;
  /**
   * "2h ago", composed on the SERVER against the DATABASE clock. Deliberately NOT computed in the client
   * from a Date: a viewer whose machine clock is skewed (or in another timezone, or simply wrong) would
   * otherwise read "in 3 hours" on a notification that just arrived. The DB clock is the one clock every
   * other time surface in this phase already trusts.
   */
  timeAgoLabel: string;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Compact relative time. `now` is the DB clock, passed in — never `Date.now()`, and never read inside
 * this function, so it stays pure and testable. A future-dated row (clock skew between app and DB, or a
 * row written a beat ahead) reads "Just now" rather than a nonsensical negative.
 */
export function formatTimeAgo(createdAt: Date, now: Date): string {
  const diff = now.getTime() - createdAt.getTime();
  if (!Number.isFinite(diff) || diff < MINUTE) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  return `${Math.floor(diff / WEEK)}w ago`;
}

/**
 * Normalise a payload href to something safe to put in an `href` attribute, or `null` if it is not.
 *
 * ALLOWED: a root-relative path (`/bookings/abc`) and an absolute `http(s)` URL — the same two forms the
 * 07-07 write boundary permits, restated here rather than imported so the render path cannot be widened
 * by a change to the writer.
 *
 * REFUSED, and why each matters:
 *   - `javascript:` / `data:` / `vbscript:` — the actual XSS vector. Escaping does nothing to a scheme.
 *   - protocol-relative `//evil.example` — a browser reads this as an absolute cross-origin URL even
 *     though it superficially looks like the allowed root-relative form. This is the case a naive
 *     `startsWith("/")` check waves through.
 *   - anything else (relative paths, mailto:, fragments) — not a shape this product emits, so refusing is
 *     free and the allow-list stays closed.
 *
 * A refused href does NOT throw and does NOT render a broken link: the row degrades to plain,
 * non-navigable content (see `NotificationItem`). The notification is still readable; it just cannot be
 * clicked. Silently swapping in some other destination would be worse — it would fabricate a link the
 * writer never wrote.
 */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string" || href.length === 0) return null;
  // Protocol-relative URLs are cross-origin despite the leading slash — check before the root-relative case.
  if (href.startsWith("//")) return null;
  if (href.startsWith("/")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

/** Hydrated rows -> the client bell's props. One mapping, shared by both layouts (D-92: the BELL is the shared thing). */
export function toNotificationItems(rows: NotificationRow[], now: Date): NotificationItemData[] {
  return rows.map((row) => ({
    id: row.id,
    payload: row.payload,
    unread: row.readAt === null,
    timeAgoLabel: formatTimeAgo(row.createdAt, now),
  }));
}

export type NotificationDescription = { Icon: LucideIcon; title: string; body: string };

/**
 * The exhaustive payload -> display mapping. Copy follows the UI-SPEC voice contract: sentence case, no
 * "hold"/"SLA"/"capture" on booker-facing lines, and every time label is the venue-local string the
 * emitter already composed (D-86 stores display strings; nothing is re-derived at read time).
 */
export function describeNotification(payload: NotificationPayload): NotificationDescription {
  switch (payload.type) {
    case "booking_confirmed":
      return {
        Icon: CalendarCheckIcon,
        title: "Booking confirmed",
        body: `${payload.listingTitle} · ${payload.whenLabel}`,
      };
    case "request_received":
      return {
        Icon: HourglassIcon,
        title: "Request sent to the host",
        body: `${payload.listingTitle} · ${payload.whenLabel}`,
      };
    case "request_approved":
      return {
        Icon: CircleCheckIcon,
        title: "Request approved — pay to confirm",
        body: `${payload.listingTitle} · pay by ${payload.payByLabel}`,
      };
    case "request_declined":
      return {
        Icon: XCircleIcon,
        // C6: a lapse is calm and honest, never alarming — it costs a slot, never money.
        title: payload.expired ? "Request expired" : "Request declined",
        body: `${payload.listingTitle} · ${payload.whenLabel}`,
      };
    case "new_request_to_host":
      return {
        Icon: InboxIcon,
        title: "New booking request",
        // CR-02 (D-91 parity): the in-app copy states the SAME row-derived respond-by deadline the email
        // states — the payload's D-96-capped label, never an hour count re-derived from config.
        body: `${payload.bookerLabel} · ${payload.listingTitle} · ${payload.whenLabel} · respond by ${payload.respondByLabel}`,
      };
    case "booking_cancelled_by_booker":
      return {
        Icon: CalendarXIcon,
        title: "Booking cancelled",
        body: `${payload.bookerLabel} cancelled ${payload.listingTitle} · ${payload.whenLabel}`,
      };
    case "booking_cancelled_by_host":
      // WR-04: one type, two audiences. The HOST (the canceller) reads their own record — the guest's
      // refund and the D-71 fee when one was charged. The `!== "host"` fallthrough is load-bearing:
      // durable pre-07-17 jsonb rows carry NO `side` and must keep rendering the booker copy they were
      // written as — a durable row outlives the code that wrote it.
      if (payload.side === "host") {
        return {
          Icon: CalendarXIcon,
          title: "You cancelled this booking",
          body:
            `${payload.listingTitle} · ${payload.whenLabel} · ${payload.refundLabel} refunded to your guest` +
            (payload.feeLabel ? ` · ${payload.feeLabel} fee` : ""),
        };
      }
      return {
        Icon: CalendarXIcon,
        title: "Your host cancelled",
        body: `${payload.listingTitle} · ${payload.whenLabel} · ${payload.refundLabel} refunded`,
      };
    case "refund_issued":
      return {
        Icon: BanknoteIcon,
        title: "Refund issued",
        body: `${payload.refundLabel} · ${payload.listingTitle}`,
      };
    case "reminder_pre_expiry":
      return {
        Icon: AlarmClockIcon,
        title: "Payment due soon",
        body: `${payload.listingTitle} · pay by ${payload.payByLabel}`,
      };
    case "reminder_pre_session":
      return {
        Icon: CalendarClockIcon,
        title: "Session coming up",
        body: `${payload.listingTitle} · ${payload.whenLabel}`,
      };
    case "reminder_pre_sla":
      return {
        Icon: AlarmClockIcon,
        title: "A request needs your answer",
        body: `${payload.bookerLabel} · ${payload.listingTitle} · respond by ${payload.respondByLabel}`,
      };
  }
  // Exhaustiveness weld (07-07 convention). No fallback clause: a new notification kind must break the
  // BUILD here rather than render as an empty row nobody notices.
  const unhandled: never = payload;
  return unhandled;
}

/**
 * One panel row. Unread carries TWO signals per UI-SPEC § 7 — a `bg-muted` row tint AND a 6px brand dot
 * at the leading edge. Never tint alone: a faint background difference is invisible to a large share of
 * users and disappears entirely in high-contrast modes, so the dot is the one that actually carries.
 */
export function NotificationItem({
  item,
  onSelect,
}: {
  item: NotificationItemData;
  onSelect?: (id: string) => void;
}) {
  const { Icon, title, body } = describeNotification(item.payload);
  const href = safeHref(item.payload.href);

  const content = (
    <>
      {/* Leading rail: the unread dot sits above the icon's column so rows stay aligned either way. */}
      <span className="flex w-2 shrink-0 justify-center pt-2">
        {item.unread && (
          <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
        )}
      </span>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm leading-snug font-semibold">{title}</span>
        <span className="block truncate text-sm leading-snug text-muted-foreground">{body}</span>
        <span className="block text-xs text-muted-foreground">{item.timeAgoLabel}</span>
      </span>
      {/* The unread state must reach assistive tech as words, not as a coloured dot. */}
      {item.unread && <span className="sr-only">Unread</span>}
    </>
  );

  const rowClass = cn(
    "flex w-full items-start gap-2 px-3 py-2.5 text-left",
    item.unread && "bg-muted",
  );

  // A payload whose href failed the scheme allow-list renders as static content — readable, not clickable.
  // This is the branch that guarantees a `javascript:` payload never becomes an anchor.
  if (!href) {
    return <div className={rowClass}>{content}</div>;
  }

  return (
    <Link
      href={href}
      onClick={() => onSelect?.(item.id)}
      className={cn(rowClass, "transition-colors hover:bg-accent focus-visible:bg-accent")}
    >
      {content}
    </Link>
  );
}
