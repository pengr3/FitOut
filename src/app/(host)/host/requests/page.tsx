// Host request inbox (HOST-01 · D-65). An RSC under the (host) route group listing the host's PENDING
// (`requested`) booking requests — booker, space, venue-local window, the server-frozen quote, an hours-scale
// expiry countdown, and Approve/Decline actions wired to the 06-07 server actions. Clones /host/earnings for
// the shell, the defense-in-depth re-gate, and the desktop table / mobile card responsive split.
//
// SECURITY (T-06-23 / Security V4): the (host) LAYOUT gates canHost, but the route group is NOT the
// authorization gate for the DATA. This page re-checks the session + canHost (defense in depth) AND
// owner-scopes the read to `listing.host_id = session.user.id AND booking.status = 'requested'` — the EXACT
// predicate 06-07's non-optional owner-scope READ isolation test asserts (JOIN booking→listing, soonest-
// expiring first). Keep this predicate identical to that tested SELECT: if it drifts, the read-path IDOR
// test no longer covers the real page. A host can never see another host's requests.
//
// All money is the SERVER-FROZEN quote (booking.quotedTotalCents, D-49) rendered via formatMoney — the page
// does ZERO price arithmetic. Every time names the venue timezone (SC#2). NO coral — this is a calm host
// workflow surface, not a conversion funnel (mirrors /host/earnings).

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user } from "@/lib/db/schema";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { composeWhenLabelShort } from "@/lib/booking/when-label";
import { readDbNow } from "@/lib/booking/bookings-query";
import { APPROVAL_SLA_HOURS } from "@/lib/payments/config";
import {
  RequestActions,
  RequestRow,
  type RequestRowData,
} from "@/components/host/request-row";
import { RequestCountdown } from "@/components/booking/request-countdown";
import { RequestCountdownReason } from "@/components/host/request-countdown-reason";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function HostRequestsPage() {
  // Defense in depth: the (host) layout already gates, but never render the inbox without a real session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }

  // Owner-scoped read (T-06-23 / Security V4) — the route group is NOT the gate. This is the EXACT predicate
  // 06-07's non-optional owner-scope READ test asserts: booking JOIN listing WHERE listing.hostId =
  // session.user.id AND booking.status = 'requested', soonest-expiring first. Joined to the booker for the
  // display name (the WHERE/ORDER BY isolation predicate is unchanged by the display join).
  const rows = await db
    .select({
      id: booking.id,
      listingId: booking.listingId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      expiresAt: booking.expiresAt,
      // D-99 (07-12): the anchor the FLAT APPROVAL_SLA_HOURS deadline would have run from. Comparing it with
      // the row's real expires_at is what tells the reason line whether this deadline is cap-derived.
      createdAt: booking.createdAt,
      quotedTotalCents: booking.quotedTotalCents,
      // The WR-06 pricing-mode snapshot — the AUTHORITY composeWhenLabelShort renders "Full day" vs an
      // hour range from (08-15 / CR-01). Never re-derived from a price.
      fullDay: booking.fullDay,
      // D-74: the listing-priced portion. Read by the formatter ONLY for pre-0016 rows, and only as a
      // positive match against the listing's day rate.
      spacePriceCents: booking.spacePriceCents,
      currency: booking.currency,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      // The formatter's pre-0016 positive-match reference only.
      dayRateCents: listing.dayRateCents,
      bookerFirstName: user.firstName,
    })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .innerJoin(user, eq(booking.bookerId, user.id))
    .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")))
    .orderBy(asc(booking.expiresAt));

  // Per-row display: the venue-tz-safe window label comes from the SHARED formatter (07-02) in its SHORT
  // "EEE, MMM d" form — this derivation was one of three verbatim duplicates before Phase 7 and must never
  // be re-inlined here. The full-day vs hour-range choice comes from the booking's own PERSISTED snapshot
  // (08-15 / CR-01) — nothing here infers it from a price.
  // Money is the frozen quotedTotalCents via formatMoney (zero arithmetic).
  // D-99 (07-12): the reason line is rendered from the DB clock, read ONCE here and threaded into every row —
  // so "Session starts in Xh" and the row's own countdown deadline can never disagree about what time it is.
  const now = await readDbNow(db);

  const displayRows: (RequestRowData & { reason: React.ReactNode })[] = rows.map((r) => ({
    requestId: r.id,
    spaceTitle: r.title ?? "Your space",
    whenLabel: composeWhenLabelShort({
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      timezone: r.timezone,
      city: r.city,
      fullDay: r.fullDay,
      // This list is `status = 'requested'` only, and only `placeOpenHold` mints an open row, so nothing
      // on this page can be a drop-in pass — open capacity is instant-only (OC-10).
      openCapacity: false,
      spacePriceCents: r.spacePriceCents,
      quotedTotalCents: r.quotedTotalCents,
      dayRateCents: r.dayRateCents,
    }),
    bookerLabel: r.bookerFirstName?.trim() || "A guest",
    totalLabel: formatMoney(r.quotedTotalCents ?? 0, r.currency ?? DISPLAY_CURRENCY),
    expiresAt: (r.expiresAt ?? new Date()).toISOString(),
    // Renders NOTHING unless the deadline is genuinely cap-derived (D-96) — the whole point of D-99 is that a
    // host never reads a varying deadline as inconsistency, not that every row carries an explanation.
    reason: r.expiresAt ? (
      <RequestCountdownReason
        createdAt={r.createdAt}
        expiresAt={r.expiresAt}
        startsAt={r.startsAt}
        now={now}
      />
    ) : null,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Requests</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Guests waiting on your yes. Approve or decline within {APPROVAL_SLA_HOURS} hours — after that a request
        expires and the slot frees automatically.
      </p>

      <div className="mt-8">
        {displayRows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h2 className="text-lg font-medium">No requests right now</h2>
            <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
              When a guest requests one of your request-to-book spaces, it shows up here for you to approve or
              decline. Instant-book spaces confirm without a request.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: the shadcn table with real <th scope="col"> headers. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Space</TableHead>
                    <TableHead scope="col">When</TableHead>
                    <TableHead scope="col">Guest</TableHead>
                    <TableHead scope="col" className="text-right">
                      Guest pays
                    </TableHead>
                    <TableHead scope="col">Expires</TableHead>
                    <TableHead scope="col">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((data) => (
                    <TableRow key={data.requestId}>
                      <TableCell className="font-medium">{data.spaceTitle}</TableCell>
                      <TableCell className="text-muted-foreground">{data.whenLabel}</TableCell>
                      <TableCell>{data.bookerLabel}</TableCell>
                      <TableCell className="text-right tabular-nums">{data.totalLabel}</TableCell>
                      <TableCell>
                        {/* The countdown itself is UNCHANGED (D-99 adds a line, not a component); the reason
                            is its sibling, muted and never an alarm colour. */}
                        <RequestCountdown expiresAt={data.expiresAt} label="Expires in" />
                        {data.reason}
                      </TableCell>
                      <TableCell>
                        <RequestActions
                          requestId={data.requestId}
                          bookerLabel={data.bookerLabel}
                          whenLabel={data.whenLabel}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stacked cards (the table collapses to a card per request). */}
            <div className="space-y-3 md:hidden">
              {displayRows.map((data) => (
                <RequestRow key={data.requestId} row={data} countdownReason={data.reason} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
