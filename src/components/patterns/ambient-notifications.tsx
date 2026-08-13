// SHELL-01 / STATE-01 — the header's AMBIENT reads, moved off the layouts' critical path.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE MAY NOT DO: READ A SESSION, PERFORM A GATE, OR REDIRECT. EVER.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// That single sentence is the whole reason this file exists as a separate module, and it is what a
// future reader needs when they are tempted to "just move the session read down here too".
//
// Everything exported here is rendered INSIDE a `<Suspense>` boundary. A `<Suspense>` boundary is a
// promise that the shell around it may be streamed to the browser BEFORE the boundary resolves — so a
// security decision taken in here would be taken AFTER the gated markup had already been sent. Next's
// redirect helper, called inside a streamed child, cannot un-send bytes that are already on the wire.
// That is a real regression on T-04-06 (the booker session gate) and T-04-02 (the host capability
// gate), and it is the single riskiest edit available in this area of the tree.
//
// So the split is absolute and it is structural rather than conventional:
//
//   • `(app)/layout.tsx` and `(host)/host/layout.tsx` await the Better Auth session read and call the
//     redirect helper BEFORE they return any JSX. Those lines are blocking, and they stay blocking.
//   • This file receives an ALREADY-VERIFIED `userId` as a prop and does nothing but read ambient
//     display data with it.
//
// `tests/design/blocking-session-gate.test.ts` asserts both halves over the AST — that neither gate
// sits inside a `Suspense` subtree in either layout, and that this file performs neither the session
// read nor a redirect.
//
// BOTH APIS ARE NAMED DESCRIPTIVELY ABOVE RATHER THAN QUOTED, and that is mechanical rather than
// stylistic — the seventh application of `booking-row.tsx:112`'s precedent in this phase. This plan's
// own acceptance criterion is a zero-count grep for those two identifiers in this file, and a comment
// explaining that they are forbidden here is textually indistinguishable from a call site using them.
// The AST gate named above is the check that can tell the difference; the grep cannot, so the prose
// stays out of its way. Do not "helpfully" quote them back in.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY IT IS IN `patterns/` DESPITE READING THE DATABASE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `patterns/site-chrome.tsx` is presentational and domain-ignorant, and `site/public-header.tsx`
// records that a DOMAIN-AWARE composition deliberately lives outside `patterns/` for that reason.
// This module is the one exception in the directory, and it is a deliberate one: it is not a
// composition (it renders no wordmark, no destinations and no product copy) — it is the shared
// STREAMING BOUNDARY CONTENT that all three compositions mount, and keeping it beside the shell it is
// mounted into is what stops a fourth copy of the read appearing next to the fourth header. Before
// this file there were THREE copies of the same eight lines: `(app)/layout.tsx`,
// `(host)/host/layout.tsx` and `site/public-header.tsx`. Plan 11-10's summary flagged the third as
// "plan 11-12 should extract it"; this is that extraction.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// RESEARCH ASSUMPTION A3 — THE HOST'S PENDING-REQUEST COUNT STREAMS TOO, AND IT IS NOT A GATE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(host)/host/layout.tsx` used to `await` a THIRD query before rendering: the D-65 pending-request
// count that feeds the `Requests` nav badge. It is a DISPLAY COUNT, not a gate — nothing about who may
// see the host surface depends on it — so it may stream, and it does, in `AmbientHostNav` below.
//
// It is a SECOND export rather than a flag on the first, and that is a correction to the plan rather
// than a preference. The plan asks for "one async child supplying both slots' data, not two
// boundaries", with a `showPendingBadge` prop and a component that "returns the badge count for the
// nav slot". A React component cannot return a value to its parent, and `SiteChrome`'s `nav` and
// `actions` are two separate props rendered into two separate DOM positions — `<nav
// data-testid="site-nav">` and `<div data-testid="site-auth-slot">`. One subtree cannot land in both.
// The stated goal behind "one child" was a single fallback SHAPE, and that goal is unreachable here
// for the same reason: the two slots have different shapes, so they need different fallbacks. What
// the two exports DO share is this file's header — the prohibition above governs both.

import { and, count, eq } from "drizzle-orm";

import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  toNotificationItems,
  type NotificationItemData,
} from "@/components/notifications/notification-item";
import { SiteNav } from "@/components/patterns/site-chrome";
import { readDbNow } from "@/lib/booking/bookings-query";
import { db } from "@/lib/db";
import { booking, listing } from "@/lib/db/schema";
import { HOST_NAV_LINKS } from "@/lib/nav";
import { countUnread, listRecent, NOTIFICATIONS_MAX_LIMIT } from "@/lib/notifications";

/**
 * Which header mounted this read. It reaches exactly one place — the log line on the degradation
 * path — so a failing surface is identifiable without a stack trace. It is NOT a switch: the query,
 * the scoping and the rendered bell are identical on all three.
 */
export type AmbientSurface = "app" | "host" | "public";

/**
 * The notification triple, streamed. Renders the D-92 bell and nothing else.
 *
 * Three properties are preserved from `(app)/layout.tsx`, each with the originating file's own
 * sentence moved across rather than paraphrased:
 *
 * 1. OWNER-SCOPED IN THE QUERY. Both reads are owner-scoped in the query on `session.user.id`
 *    (T-07-82) — never post-filtered, and never from anything the request supplied. The id arrives
 *    here as a PROP from the still-blocking parent, which is a strictly stronger form of the same
 *    property than the original had: this component has no access to a session to re-read, no access
 *    to the request headers (named descriptively for the same reason the header block gives), and no
 *    path by which a request-supplied id could reach `countUnread`. An IDOR here would require the
 *    parent to have already been compromised.
 * 2. THE DATABASE CLOCK. The relative "2h ago" labels are composed against the DATABASE clock
 *    (`readDbNow`), not the viewer's, because a skewed client clock would otherwise render "in 3
 *    hours" on a notification that just arrived.
 * 3. THE DEGRADATION. Wrapped: a notification read is an AMBIENT convenience, and it must never take
 *    down the shell that carries the session gate and every page under it. A failure degrades to a
 *    calm in-panel message.
 *
 * The third property is what makes this safe to stream at all. A `<Suspense>` child that THROWS does
 * not degrade — it propagates to the nearest error boundary, and neither group layout has one, so an
 * unwrapped throw here would blank the whole route. The try/catch is therefore load-bearing in a way
 * it was not before the move, not merely inherited.
 */
export async function AmbientNotifications({
  userId,
  surface,
}: {
  userId: string;
  surface: AmbientSurface;
}) {
  let unreadCount = 0;
  let notificationItems: NotificationItemData[] = [];
  let notificationsFailed = false;
  try {
    const [unread, rows, now] = await Promise.all([
      countUnread(db, userId),
      listRecent(db, userId, NOTIFICATIONS_MAX_LIMIT),
      readDbNow(db),
    ]);
    unreadCount = unread;
    notificationItems = toNotificationItems(rows, now);
  } catch (err) {
    console.error("[notifications] bell_read_failed", { surface, err });
    notificationsFailed = true;
  }

  return (
    <NotificationBell
      unreadCount={unreadCount}
      items={notificationItems}
      error={notificationsFailed}
    />
  );
}

/**
 * The host's primary nav, streamed, with the D-65 pending-request badge resolved.
 *
 * The query is the one that used to sit at `(host)/host/layout.tsx:49-54`, unchanged: owner-scoped
 * booking JOIN listing, `status='requested'` — the same owner-scope predicate as the `/host/requests`
 * inbox. Drives the count badge, hidden at 0.
 *
 * NEWLY WRAPPED, AND THE CHANGE IS DELIBERATE. The original was a bare `await` in the layout, so a
 * database blip took the host surface down. Behind a streaming boundary an unhandled throw is worse
 * still — it reaches no error boundary and blanks the route AFTER the shell has been sent. Degrading
 * to 0 costs a hidden badge for one render; the alternative costs the host their whole dashboard. The
 * failure is logged rather than swallowed, because "0 pending" and "we could not count" are
 * indistinguishable in the rendered UI and only the log can tell them apart.
 *
 * The fallback the caller passes is `<SiteNav links={HOST_NAV_LINKS} />` with no badges, which is
 * BYTE-IDENTICAL markup to this component's own zero-count output — D-65 hides the badge at zero — so
 * the nav does not reflow when the count lands unless there is genuinely something to show.
 */
export async function AmbientHostNav({ userId }: { userId: string }) {
  let pendingRequests = 0;
  try {
    const [{ p } = { p: 0 }] = await db
      .select({ p: count() })
      .from(booking)
      .innerJoin(listing, eq(booking.listingId, listing.id))
      .where(and(eq(listing.hostId, userId), eq(booking.status, "requested")));
    pendingRequests = p ?? 0;
  } catch (err) {
    console.error("[host-nav] pending_requests_read_failed", { err });
  }

  return <SiteNav links={HOST_NAV_LINKS} badges={{ requests: pendingRequests }} />;
}
