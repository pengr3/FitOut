// The booker's bookings list (MANAGE-01 / MANAGE-02 · D-101..D-106). An RSC in the (app) group, so it
// inherits the booker header (and therefore the D-92 notification bell). Route groups do not change URLs —
// this still serves /bookings.
//
// SECURITY (T-07-28 / Security V4): the (app) layout already gates the session, but this page re-checks it
// (defense in depth — never render someone's bookings without a real session) AND, more importantly, the
// ownership predicate lives inside queryBookerBookings' WHERE, not in this file. There is no post-filter
// here to get wrong: a row that is not this booker's is never selected in the first place.
//
// TIME (D-102 / D-103 / T-07-32): `now` is read from POSTGRES in this same request and threaded into every
// badge, so the badge and the SQL tab partition are computed against ONE clock. A JS clock here could show
// a booking as Confirmed in a row the query had already filed under Past. There is deliberately no JS clock
// construction anywhere in this file.
//
// MONEY: every figure is the server-frozen quote rendered through formatMoney; the page and both row
// components do ZERO price arithmetic (the Phase-4 PriceBreakdown contract).

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { composeWhenLabelShort } from "@/lib/booking/when-label";
import {
  queryBookerBookings,
  readDbNow,
  BOOKINGS_PAGE_SIZE,
  type BookingsTab,
} from "@/lib/booking/bookings-query";
import type { BookingDbStatus } from "@/components/booking/booking-status";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { BookingsTabs } from "@/components/booking/bookings-tabs";
import { BookingRow, type BookingRowData } from "@/components/booking/booking-row";
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

/**
 * D-79 refund detail — a MUTED SIBLING LINE beneath the badge, never inside it. A zero refund always names
 * its reason: a bare "₱0 refunded" reads as a bug rather than as a policy outcome (07-UI-SPEC § D-79).
 */
function refundLabelFor(
  status: BookingDbStatus,
  refundCents: number | null,
  currency: string,
): string | null {
  if (status !== "cancelled" || refundCents === null) return null;
  if (refundCents === 0) return "No refund — cancelled inside the no-refund window";
  return `${formatMoney(refundCents, currency)} refunded`;
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; cursor?: string }>;
}) {
  // Defense in depth: the (app) layout already gates, but never render bookings without a real session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const { tab: rawTab, cursor: rawCursor } = await searchParams;
  const tab = parseTab(rawTab);
  const cursor = rawCursor ?? null;

  // The DB clock, read in the SAME request that reads the rows (D-102 / T-07-32).
  const now = await readDbNow(db);

  const page = await queryBookerBookings(db, {
    bookerId: session.user.id,
    tab,
    cursor,
    limit: BOOKINGS_PAGE_SIZE,
  });

  // Server-side display mapping — venue-local labels from the SHARED formatter (07-02), money via
  // formatMoney. Nothing below this line computes a price or a date.
  const rows: BookingRowData[] = page.rows.map((r) => ({
    bookingId: r.id,
    listingId: r.listingId,
    spaceTitle: r.listingTitle ?? "This space",
    photoUrl: r.listingPhotoUrl,
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
    // D-104: the ONE inline action, and only where there is an obvious next step.
    showPayNow: r.displayStatus === "approved",
  }));

  const moreHref = page.nextCursor
    ? `/bookings?${new URLSearchParams({ tab, cursor: page.nextCursor }).toString()}`
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Your bookings</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Everything you&apos;ve booked, and everything you&apos;ve booked before.
      </p>

      <div className="mt-8">
        <BookingsTabs basePath="/bookings" active={tab} />
      </div>

      <div className="mt-8">
        {rows.length === 0 ? (
          tab === "upcoming" ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h2 className="text-lg font-medium">No upcoming bookings</h2>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                When you book a space, it&apos;ll show up here with the time, the address, and your
                booking reference.
              </p>
              <div className="mt-6">
                <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
                  <Link href="/">Find a space</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h2 className="text-lg font-medium">Nothing here yet</h2>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                Bookings move here once the session is over, or if they&apos;re cancelled or declined.
              </p>
            </div>
          )
        ) : (
          <>
            {/* Desktop: the shadcn table with real <th scope="col"> headers. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Space</TableHead>
                    <TableHead scope="col">When</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">
                      Amount paid
                    </TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.bookingId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/bookings/${row.bookingId}`}
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
                            side="booker"
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
                      <TableCell className="text-right tabular-nums">{row.amountLabel}</TableCell>
                      <TableCell>
                        {row.showPayNow ? (
                          <Button
                            asChild
                            size="sm"
                            className="bg-brand text-brand-foreground hover:bg-brand/90"
                          >
                            <Link href={`/listings/${row.listingId}/book?hold=${row.bookingId}`}>
                              Pay now
                            </Link>
                          </Button>
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
                <BookingRow key={row.bookingId} row={row} />
              ))}
            </div>

            {/* D-106 keyset pager — hidden entirely once the cursor is exhausted, so there is never a
                button that does nothing. Neutral outline: paging is not a conversion moment. */}
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