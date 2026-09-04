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
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT PLAN 14-07 CHANGED, AND WHAT D-154 FORBIDS IT FROM CHANGING (HFLOW-04 · D-154)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-154 is unusually explicit, because this is the one host surface where a polish pass has the most
// opportunity to turn into a feature. THIS WAS A DESIGN-SYSTEM PASS AND NOT A NEW INFORMATION
// ARCHITECTURE. Three things changed:
//
//   1. THE BOX IS NO LONGER THIS FILE'S OWN. The container is the declared host-list shell from
//      `@/lib/design/measurements`, which `bookings/loading.tsx` also reads — so the page and the plate
//      that stands in for it can no longer draw different boxes. The class string is deliberately not
//      repeated in this comment: it lives in the constant's own docblock, the one place it may be
//      spelled.
//
//   2. THE HEADING IS THE DECLARED PATTERN, READING ONE COPY CONSTANT. The hand-rolled `<h1>`/`<p>` is
//      `PageHeader` spread from `HOST_BOOKINGS_HEADER` (`@/lib/host/bookings-copy`). Both sentences were
//      previously typed TWICE — here and in the plate — and agreed only by coincidence. Neither file
//      spells either string now, so the two cannot drift.
//
//   3. THE TABLE CELLS NAME THEIR TYPE ROLE. Where a bare `text-sm` (or the table's inherited `text-sm`)
//      stood in for the LABEL role, the role is named: the guest cell, the venue-local window cell and
//      the D-79 refund sibling. Every one of those computes 14px before and after — this is a naming
//      change, not a resize. The Space cell keeps `font-medium`, mirroring `/host/requests`.
//
// ⚠ WHAT WAS NOT TOUCHED, because D-154 says each is correctness rather than layout, and a diff that
// moves any of them is a scope alarm:
//
//   • `parseTab` and the tab partition — the parameter is attacker-controlled and fails to a boring
//     default. A restyle has no business inside it.
//   • THE `?listing=` FILTER. Still a plain GET form with no client script; its `<select>` keeps the
//     exact class it had, INCLUDING its raised elevation. `tests/design/elevation-z.test.ts` pins this
//     route at exactly ONE raised element and that select is it — swapping it for a component, or
//     adding any raised surface here, moves a number this plan is not allowed to move.
//   • `BOOKINGS_PAGE_SIZE`, the keyset cursor and the `Load more` control.
//   • The owner-scoped read and the display map beneath it.
//   • THE STATUS VOCABULARY. `deriveBookingStatusView` is the single authority for the words and this
//     page already consumes it through `BookingStatusBadge`. D-154's "the status vocabulary" clause
//     reads ADOPT, NOT EXTEND; minting a host-side word here has misread it.
//   • The D-79 refund SENTENCES — `refundLabelFor`'s two strings are unchanged, and the figure is still
//     a sibling of the badge rather than interpolated into it.
//   • Both empty states, byte-for-byte. They are already the shared pattern.
//   • `HostBookingRow`, the mobile card. Already the shared row pattern; not opened.
//
// ⚠ NO HOST-SIDE FILTER, SORT, COLUMN OR DATE RANGE WAS ADDED. Each is a new capability and D-154
// defers every one of them by name.

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// F-2 — THE DESKTOP TABLE OVERFLOWED ITS CONTAINER AT 1280px. CLOSED BY TWO PM RULINGS, IN ORDER.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE DEFECT, measured in Chromium at 1280px against the SEEDED CATALOGUE's own five titles and cities
// (`scripts/seed.ts:48-52`), five upcoming bookings, three confirmed and two requested:
//
//     container clientWidth 864 · scrollWidth 1033 · overflow 169px
//     Approve box x=1051→1141 against a clip edge at x=1072 — 69 of its 90px past the edge
//     columns: Guest 69 · Space 234 · When 357 · Status 112 · Payout 63 · Actions 199
//
// The widest column was **When**, because every row repeated ` ({City} time)`. Quick task `260824-dbc`
// measured that, implemented the other candidate fix — letting the two sentence-bearing cells wrap —
// and BACKED IT OUT when `e2e/skeleton-geometry.spec.ts` showed it turns every desktop row into two
// lines and re-couples this route's row height to the calendar. So the fork went to the PM, who ruled:
//
//     "Show the timezone only when it varies."
//
// WHAT THAT MEANS HERE, AND WHERE THE RULE LIVES. The `city` handed to the shared formatter is now
// projected by `resolveListCity` (`@/lib/booking/venue-clock-scope`), which returns the row's own city
// when the RENDERED rows span more than one venue clock and null when they do not — and the formatter
// has always omitted the suffix for a null city. Nothing in `when-label.ts` changed, this route's
// markup is byte-identical, and the WHEN column simply stops carrying a phrase that disambiguated
// nothing: the seeded catalogue is five different CITIES on ONE clock. Measured after that change,
// same fixture, same instrument: scrollWidth 1033 → 915 against a clientWidth of 864 — the When column
// lost 119px, Approve came inside the clip edge with 50px to spare, and 51px still overflowed.
//
// ⚠ THE COST, ACCEPTED BY THE PM AND RECORDED SO IT IS NOT READ AS A BUG. A single-zone host no longer
// sees a timezone named on this list. That walks back SC#2 / D-105 for host LIST surfaces only; every
// surface that renders ONE booking still names it unconditionally. The rule, its two definitional
// choices and the Walk A case it must never break are documented once, in the module above — not here,
// so there is no second statement of it to drift.
//
// ───────────────────────────────────────────────────────────────────────────────────────────────────
// RULING TWO — *"WRAP THE SPACE COLUMN"* (quick `260824-ght`, 24 August 2026). THIS ONE CLOSES IT.
// ───────────────────────────────────────────────────────────────────────────────────────────────────
//
// The first ruling freed Approve and left the DECLINE control in 51px of residual overflow, which
// `260824-dbc`'s diagnosis had already named: TWO cells on this route hold a sentence rather than a
// token, the ruling addressed the window label, and the space title was the other one. The PM's second
// and final answer on F-2 is to let that cell wrap. It is one class on one cell — the cell's own
// comment below carries the argument for why the SPACE title may wrap where the WHEN label may not,
// and that argument is the whole reason this half is safe when `260824-dbc`'s two-cell version was not.
//
// MEASURED, same instrument, same throwaway fixture carrying the seeded catalogue's own five titles
// and cities, five upcoming bookings — three confirmed, two requested — at 1280px:
//
//                   clientWidth  scrollWidth  overflow  Approve          Decline
//     before             864         910         46px   x=928→1018       x=1026→1110, 38 of 85px out
//     after              864         864          0px   x=881→971        x=979→1064, 8px CLEAR
//
//     columns before: Guest 69 · Space 234 · When 234 · Status 112 · Payout 63 · Actions 199
//     columns after:  Guest 69 · Space 188 · When 234 · Status 112 · Payout 63 · Actions 199
//
// The clip edge is x=1072 in both rows. Overflow is ZERO and both controls are whole at rest, which is
// the bar F-2 was filed against. Only the Space column moved.
//
// ⚠ WHY THE "BEFORE" IS 46px HERE AND 51px IN THE FIRST RULING'S WRITE-UP, stated so the two are not
// read as a contradiction: this fixture seeds its bookings RELATIVE to today, so the When column's
// width — and therefore the overflow — is a function of the composed dates on the day the harness
// runs. It measured 45, 46 and 50px on three runs a few hours apart. That is exactly why the gate in
// `e2e/skeleton-geometry.spec.ts` asserts the overflow is ZERO rather than any measured delta.
//
// ⚠⚠ WHAT THE WRAP COSTS, MEASURED AND NOT ROUNDED. The desktop row is now two-valued: 36.52px when a
// title fits the residual Space column on one line and 57px when it does not. `HOST_BOOKING_ROW_HEIGHT`
// still declares the floor and its docblock carries the argument for that choice, the ladder it was
// checked against, and the band between 768 and 928px where the column falls to its min-content. Both
// heights are seeded and pinned in the geometry spec's `(title)` case; neither is left to be
// discovered as an unexplained 20px.

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { CalendarIcon, HistoryIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing } from "@/lib/db/schema";
import { HOST_LIST_SHELL } from "@/lib/design/measurements";
import { HOST_BOOKINGS_HEADER } from "@/lib/host/bookings-copy";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { composeWhenLabelShort } from "@/lib/booking/when-label";
import { resolveListCity } from "@/lib/booking/venue-clock-scope";
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
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
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
  //
  // THE ZONE DECISION IS TAKEN ONCE, HERE, OVER THE WHOLE RENDERED PAGE — never inside the map. It is
  // a property of the rows on screen together (see the F-2 block above), and a `venueClocksVary` call
  // against a single row is always false, which would silently drop the suffix from a two-zone list.
  // The projector shape is what makes that mistake unwritable.
  const listCity = resolveListCity(page.rows);
  const rows: HostBookingRowData[] = page.rows.map((r) => ({
    bookingId: r.id,
    spaceTitle: r.listingTitle ?? "Your space",
    bookerLabel: r.bookerFirstName?.trim() || "A guest",
    whenLabel: composeWhenLabelShort({
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      timezone: r.timezone,
      city: listCity(r),
      fullDay: r.fullDay,
      // OC-03: the persisted mode snapshot. A host scanning their day must see "· Drop-in pass", not a row
      // claiming someone booked the whole space from opening to closing (09-08).
      openCapacity: r.openCapacity,
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
    // The container is the DECLARED host-list shell and the title block is the DECLARED pattern reading
    // the ONE copy constant — which is what stops `bookings/loading.tsx` drawing a different box or
    // announcing different words than the page it stands in for. The `mt-8` region offsets below are
    // this page's own and the plate copies them, exactly as `/host/requests` and its plate do.
    <div className={HOST_LIST_SHELL}>
      {/* SPREAD, not two props. The pair cannot be half-adopted, so "the page and the plate render an
          identical title and lede" is a property of the syntax rather than of a reviewer noticing. */}
      <PageHeader {...HOST_BOOKINGS_HEADER} />

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
              className="h-11 rounded-md border border-input bg-transparent px-3 text-sm shadow-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
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
          // STATE-04 (plan 11-16) — shell B → the shared shell. Both strings were ALREADY JS string
          // literals here rather than JSX text, so this conversion is a pure container swap: they are
          // passed through unchanged, character for character.
          //
          // The ICON forks with the tab, matching the booker's `/bookings` pair, because the two tabs
          // are different facts: one is a calendar with nothing on it yet, the other is a history with
          // nothing in it. `actions={null}` on both — a host cannot make someone book, and the way to
          // fill this list (publish a space) is the `/host/listings` grid's CTA, one nav item away.
          <EmptyState
            icon={tab === "upcoming" ? CalendarIcon : HistoryIcon}
            titleAs="h2"
            title={tab === "upcoming" ? "No upcoming bookings" : "Nothing here yet"}
            body={
              tab === "upcoming"
                ? "When someone books one of your spaces, it'll appear here with the guest, the time, and your payout."
                : "Completed, cancelled, and declined bookings move here."
            }
            actions={null}
          />
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
                      {/* THE LABEL ROLE, NAMED. The table's own inherited small-text step already
                          computes 14px here; saying `text-label` changes no pixel and makes the cell's
                          role legible, so a later type edit moves a declared role rather than a bare
                          utility that happened to agree with one. Mirrors `/host/requests`' guest cell. */}
                      <TableCell className="text-label">{row.bookerLabel}</TableCell>
                      {/* ⚠ THE ONE CELL ON THIS ROUTE THAT IS ALLOWED TO WRAP, AND THE WHOLE REASON
                          IT IS SAFE IS THAT ITS NEIGHBOUR IS NOT (F-2's second ruling, `260824-ght`).
                          The shared table cell forbids wrapping on every cell it renders, so a cell
                          holding a SENTENCE contributes its full unbroken length to the table's
                          minimum width. Two cells here hold one: this space title and the venue-local
                          window label. Quick `260824-dbc` let BOTH wrap, measured it clean, and
                          reverted it — a table shares column widths across its rows, so the resting
                          row's height became a function of the widest label anywhere in the list, and
                          a window label is a different string every day. That is the calendar
                          coupling `[14-16]` closed at 320px, re-opened one breakpoint up.

                          A SPACE TITLE DOES NOT HAVE THAT PROPERTY. It is a stable string the host
                          chose; it does not move with the wall clock. So the resting row height here
                          is a function of the longest TITLE in the rendered set — stable, measurable
                          and seedable — which is why this cell wraps and the When cell beside it must
                          not. Do not "finish the job" by adding this class to the When cell: that
                          re-arms the exact trap, and `e2e/skeleton-geometry.spec.ts` pins both the
                          height and the wrap count that catch it. */}
                      <TableCell className="whitespace-normal font-medium">
                        {/* T6 (load-bearing half) — the DEFAULT desktop viewport. Mirrors the booker page's
                            Space-cell link so the host cancel flow (SC#3) is reachable without typing a UUID. */}
                        <Link
                          href={`/host/bookings/${row.bookingId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.spaceTitle}
                        </Link>
                      </TableCell>
                      {/* The venue-local window label — § Typography files every one of those on the
                          label role. Muted stays muted; only the size step is now named. */}
                      <TableCell className="text-label text-muted-foreground">
                        {row.whenLabel}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <BookingStatusBadge
                            status={row.status}
                            endsAt={row.endsAt}
                            now={row.now}
                            side="host"
                            cancelledBy={row.cancelledBy}
                          />
                          {/* D-79: the refund figure is a sibling of the badge, never inside it. The
                              SENTENCE is `refundLabelFor`'s and is unchanged; what moved is the bare
                              small-text utility, which now names the label role it was standing in for.
                              `tabular-nums` stays because this is money.

                              ⚠ `HostBookingRow`'s own refund line still spells the utility rather than
                              the role. That file is the shared row pattern's adopter and D-154 puts it
                              out of this plan's reach, so the two are NAMED differently and COMPUTE
                              identically (both 14px). Recorded rather than silently unified. */}
                          {row.refundLabel ? (
                            <span className="text-label tabular-nums text-muted-foreground">
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