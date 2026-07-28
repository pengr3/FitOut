// The host's bookings list (HOST-02 / MANAGE-02 · D-101..D-106). An RSC under the (host) route group,
// cloning /host/earnings for the gate, the container, the desktop-table / mobile-card split and the
// dashed-border empty state.
//
// SECURITY — TWO INDEPENDENT GATES (T-07-29 / Security V4):
//   1. This page re-checks `session` AND `canHost` before rendering. The (host) LAYOUT already does, but a
//      layout is not an authorization boundary for data.
//   2. Ownership lives in the QUERY: queryHostBookings scopes `listing.host_id = session.user.id` inside
//      the WHERE. This is exactly why D-101 rejected a UNIFIED /bookings route serving both sides — a
//      single route would have had to decide "am I the host here?" in page code, moving the ownership gate
//      off the query and onto a branch. That is the class of thing Security V4 warns about: a branch can be
//      bypassed by a crafted parameter, a WHERE cannot.
//
// The `?listing=` filter is applied INSIDE that host-scoped predicate (T-07-30), so a foreign listing id
// matches zero rows rather than widening the result set. It is server-applied; the control below is a plain
// GET form, so filtering needs no client JavaScript and no client state.
//
// TIME: `now` comes from POSTGRES in this same request and is threaded into every badge, so the badge and
// the SQL tab partition agree (D-102 / T-07-32).
//
// NO CORAL ANYWHERE — a calm host workflow surface, mirroring /host/earnings and /host/requests.

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing } from "@/lib/db/schema";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { composeWhenLabelShort } from "@/lib/booking/when-label";
import {
  queryHostBookings,
  readDbNow,
  BOOKINGS_PAGE_SIZE,
  type BookingsTab,
} from "@/lib/booking/bookings-query";
import type { BookingDbStatus } from "@/components/booking/booking-status";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { BookingsTabs } from "@/components/booking/bookings-tabs";
import {
  HostBookingRow,
  HostPayoutCell,
  type HostBookingRowData,
} from "@/components/host/host-booking-row";
import { RequestActions } from "@/components/host/request-row";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** `?tab=` is attacker-controlled; anything but the one alternative resolves to the Upcoming default. */
function parseTab(raw: string | undefined): BookingsTab {
  return raw === "past" ? "past" : "upcoming";
}

/** D-79 refund detail — a muted SIBLING line beneath the badge; a zero refund always names its reason. */
function refundLabelFor(
  status: BookingDbStatus,
  refundCents: number | null,
  currency: string,
): string | null {
  if (status !== "cancelled" || refundCents === null) return null;
  if (refundCents === 0) return "No refund — cancelled inside the no-refund window";
  return `${formatMoney(refundCents, currency)} refunded`;
}

export default async function HostBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; cursor?: string; listing?: string }>;
}) {
  // Defense in depth: the (host) layout already gates, but never render bookings without a real session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }

  const { tab: rawTab, cursor: rawCursor, listing: rawListing } = await searchParams;
  const tab = parseTab(rawTab);
  const cursor = rawCursor ?? null;
  const listingFilter = rawListing && rawListing.length > 0 ? rawListing : null;

  // The DB clock, read in the SAME request that reads the rows (D-102 / T-07-32).
  const now = await readDbNow(db);

  // The host's own spaces, for the multi-listing filter. Owner-scoped like everything else on this page —
  // the option list must never name a space the host does not own.
  const hostListings = await db
    .select({ id: listing.id, title: listing.title })
    .from(listing)
    .where(eq(listing.hostId, session.user.id))
    .orderBy(asc(listing.title));

  const page = await queryHostBookings(db, {
    hostId: session.user.id,
    tab,
    listingId: listingFilter,
    cursor,
    limit: BOOKINGS_PAGE_SIZE,
  });

  // Server-side display mapping — venue-local labels from the SHARED formatter (07-02), money via
  // formatMoney. Nothing below this line computes a price or a date.
  const rows: HostBookingRowData[] = page.rows.map((r) => ({
    bookingId: r.id,
    spaceTitle: r.listingTitle ?? "Your space",
    bookerLabel: r.bookerFirstName?.trim() || "A guest",
    whenLabel: composeWhenLabelShort({
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      timezone: r.timezone,
      city: r.city,
      fullDay: r.fullDay,
      spacePriceCents: r.spacePriceCents,
      quotedTotalCents: r.quotedTotalCents,
      dayRateCents: r.dayRateCents,
    }),
    amountLabel: formatMoney(r.quotedTotalCents ?? 0, r.currency ?? DISPLAY_CURRENCY),
    refundLabel: refundLabelFor(r.status, r.refundCents, r.currency ?? DISPLAY_CURRENCY),
    status: r.status,
    cancelledBy: r.cancelledBy,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    now,
    payoutState: r.payoutState ?? null,
  }));

  const carriedParams = listingFilter ? { listing: listingFilter } : undefined;
  const moreHref = page.nextCursor
    ? `/host/bookings?${new URLSearchParams({
        tab,
        cursor: page.nextCursor,
        ...(listingFilter ? { listing: listingFilter } : {}),
      }).toString()}`
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Bookings</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Every booking across your spaces, upcoming and past.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <BookingsTabs basePath="/host/bookings" active={tab} extraParams={carriedParams} />

        {/* Multi-listing filter (D-104-adjacent) — shown only when there is something to choose between.
            A plain GET form: server-navigated, server-filtered, no client component. */}
        {hostListings.length >= 2 ? (
          <form method="get" action="/host/bookings" className="flex items-center gap-2">
            <input type="hidden" name="tab" value={tab} />
            <label htmlFor="listing-filter" className="sr-only">
              Filter by space
            </label>
            <select
              id="listing-filter"
              name="listing"
              defaultValue={listingFilter ?? ""}
              className="h-11 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <option value="">All spaces</option>
              {hostListings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title ?? "Untitled space"}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
          </form>
        ) : null}
      </div>

      <div className="mt-8">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h2 className="text-lg font-medium">
              {tab === "upcoming" ? "No upcoming bookings" : "Nothing here yet"}
            </h2>
            <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
              {tab === "upcoming"
                ? "When someone books one of your spaces, it'll appear here with the guest, the time, and your payout."
                : "Completed, cancelled, and declined bookings move here."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: the shadcn table with real <th scope="col"> headers. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Guest</TableHead>
                    <TableHead scope="col">Space</TableHead>
                    <TableHead scope="col">When</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Payout</TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.bookingId}>
                      <TableCell>{row.bookerLabel}</TableCell>
                      <TableCell className="font-medium">
                        {/* T6 (load-bearing half) — the DEFAULT desktop viewport. Mirrors the booker page's
                            Space-cell link so the host cancel flow (SC#3) is reachable without typing a UUID. */}
                        <Link
                          href={`/host/bookings/${row.bookingId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.spaceTitle}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.whenLabel}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <BookingStatusBadge
                            status={row.status}
                            endsAt={row.endsAt}
                            now={row.now}
                            side="host"
                            cancelledBy={row.cancelledBy}
                          />
                          {/* D-79: the refund figure is a sibling of the badge, never inside it. */}
                          {row.refundLabel ? (
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {row.refundLabel}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <HostPayoutCell state={row.payoutState} />
                      </TableCell>
                      <TableCell>
                        {row.status === "requested" ? (
                          <RequestActions
                            requestId={row.bookingId}
                            bookerLabel={row.bookerLabel}
                            whenLabel={row.whenLabel}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stacked cards (the table collapses to a card per booking). */}
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <HostBookingRow key={row.bookingId} row={row} />
              ))}
            </div>

            {/* D-106 keyset pager — hidden entirely once the cursor is exhausted. Neutral outline. */}
            {moreHref ? (
              <div className="mt-6">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={moreHref}>Load more</Link>
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}