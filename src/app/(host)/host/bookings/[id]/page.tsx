// The host's booking detail page (HOST-02 · D-101/D-104 · ROADMAP SC#3). The entry point for a host
// cancellation — D-104 keeps every irreversible money action OFF the list rows and behind the disclosure it
// requires, so `Cancel booking` exists here and nowhere else on the host side.
//
// SECURITY — TWO INDEPENDENT GATES (Security V4), cloned from /host/bookings and /host/earnings:
//   1. This page re-checks `session` AND `canHost` before rendering. The (host) LAYOUT already does, but a
//      layout is not an authorization boundary for data.
//   2. Ownership lives in the QUERY: the WHERE carries `listing.host_id = session.user.id`. The route group
//      is NOT the gate. A missing booking and a booking on ANOTHER host's listing both fall through to the
//      SAME bare notFound() — indistinguishable, so a guessed id is not an enumeration oracle.
//
// TIME: `now` comes from POSTGRES in this same request and is threaded into the badge and the
// still-cancellable test, so what the page shows and what the action will permit cannot disagree (D-102).
//
// MONEY: every figure is server-computed and pre-formatted. The cancellation fee comes from
// previewHostCancelFee ALREADY CAPPED (D-71) — this page passes it straight through and never caps it here.
//
// NO CORAL ANYWHERE — a calm host workflow surface, mirroring /host/bookings and /host/earnings.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, hostPayoutLedger, listing, user } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { composeWhenLabel } from "@/lib/booking/when-label";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { HostPayoutCell } from "@/components/host/host-booking-row";
import { HostCancelDialog } from "@/components/host/host-cancel-dialog";
import { previewHostCancelFee } from "@/app/actions/cancel-booking";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function HostBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Defense in depth: the (host) layout already gates, but never render a booking without a real session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }

  const { id } = await params;

  // The DB clock, read in the SAME request that reads the row (D-102). `readDbNow` hydrates through the
  // shared isoUtc mask — a bare `SELECT now()` through `execute` returns Postgres TEXT, not a Date.
  const now = await readDbNow(db);

  // OWNER-SCOPED load. `listing.host_id = session.user.id` sits inside the WHERE, not in a branch below it.
  const [row] = await db
    .select({
      id: booking.id,
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      quotedTotalCents: booking.quotedTotalCents,
      // The WR-06 pricing-mode snapshot — the AUTHORITY composeWhenLabel renders "Full day" vs an hour
      // range from (08-15 / CR-01). Never re-derived from a price.
      fullDay: booking.fullDay,
      // The OC-03 mode SNAPSHOT (drizzle 0021) — a drop-in pass renders as a pass, never as a claim on the
      // host's whole day (09-08).
      openCapacity: booking.openCapacity,
      spacePriceCents: booking.spacePriceCents,
      refundCents: booking.refundCents,
      currency: booking.currency,
      listingId: booking.listingId,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      // The formatter's pre-0016 positive-match reference only.
      dayRateCents: listing.dayRateCents,
      bookerFirstName: user.firstName,
      payoutState: hostPayoutLedger.state,
    })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .innerJoin(user, eq(booking.bookerId, user.id))
    // kind-scoped (07-04): a host_cancel_fee DEBIT must never be read as this booking's payout state.
    .leftJoin(
      hostPayoutLedger,
      and(
        eq(hostPayoutLedger.bookingId, booking.id),
        eq(hostPayoutLedger.kind, "payout"),
      ),
    )
    .where(and(eq(booking.id, id), eq(listing.hostId, session.user.id)));

  // Missing OR not-mine → the same bare notFound(). Never a distinguishing message.
  if (!row) notFound();

  const currency = row.currency ?? DISPLAY_CURRENCY;
  const guestLabel = row.bookerFirstName?.trim() || "A guest";
  const whenLabel = composeWhenLabel({
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    timezone: row.timezone,
    city: row.city,
    fullDay: row.fullDay,
    openCapacity: row.openCapacity,
    spacePriceCents: row.spacePriceCents,
    quotedTotalCents: row.quotedTotalCents,
    dayRateCents: row.dayRateCents,
  });

  // The cancel entry point exists ONLY while the booking is genuinely cancellable — the same two conditions
  // the action's own status-scoped UPDATE enforces (`status = 'confirmed' AND starts_at > now()`, D-94).
  // The UI is a courtesy; the server re-validates and is the gate (Security V4).
  const cancellable = row.status === "confirmed" && row.startsAt.getTime() > now.getTime();

  // Server-computed and ALREADY CAPPED (D-71). Owner-gated inside the action too, so this is not the gate.
  const feePreview = cancellable ? await previewHostCancelFee(row.id) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/host/bookings">← Back to bookings</Link>
      </Button>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">{row.title ?? "Your space"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{whenLabel}</p>

      <div className="mt-6 flex flex-col items-start gap-1">
        <BookingStatusBadge status={row.status} endsAt={row.endsAt} now={now} side="host" />
        {/* D-79: the refund figure is a SIBLING of the badge, never inside it. */}
        {row.status === "cancelled" && row.refundCents !== null ? (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.refundCents === 0
              ? "No refund — cancelled inside the no-refund window"
              : `${formatMoney(row.refundCents, currency)} refunded`}
          </span>
        ) : null}
      </div>

      <dl className="mt-8 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Guest</dt>
          <dd>{guestLabel}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Guest paid</dt>
          <dd className="tabular-nums">{formatMoney(row.quotedTotalCents ?? 0, currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Payout</dt>
          <dd>
            <HostPayoutCell state={row.payoutState ?? null} />
          </dd>
        </div>
      </dl>

      {/* D-104 — the cancel entry point sits BELOW the primary content, behind a Separator: present, but not
          competing with it, and never inline on a list row. */}
      {cancellable && feePreview ? (
        <>
          <Separator className="my-8" />
          <h2 className="text-sm font-semibold">Can&apos;t host this booking?</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Cancelling refunds {guestLabel} in full and charges you a cancellation fee. We&apos;ll show you
            exactly what happens before anything is confirmed.
          </p>
          <div className="mt-4">
            <HostCancelDialog
              bookingId={row.id}
              guestLabel={guestLabel}
              refundLabel={formatMoney(row.quotedTotalCents ?? 0, currency)}
              feeLabel={formatMoney(feePreview.feeCents, currency)}
              outstandingLabel={
                feePreview.outstandingCents > 0
                  ? formatMoney(feePreview.outstandingCents, currency)
                  : null
              }
              whenLabel={whenLabel}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
