// The SC#2 cancel review screen (BOOK-07 · PAY-06 · D-78) — the highest-stakes screen in Phase 7.
//
// WHY THIS IS A DEDICATED RSC ROUTE AND NOT A DIALOG (the researcher's call, 07-UI-SPEC § 3 / 07-RESEARCH
// Pitfall 6): `quoteRefund` must be evaluated against the DATABASE clock. Rung boundaries are sharp, and a
// JS-clock preview can show 100% while the action awards 50% — the booker is shown one number and given
// another, which breaks the exact promise SC#2 makes. An RSC computes the server clock on every render for
// free; a client dialog would need a round trip to populate and could render a stale rung.
//
// THIS IS THE FIRST PAGE IN THE CODEBASE THAT READS THE DB CLOCK FOR DISPLAY, so the mechanism is worth
// stating plainly: `readDbNow(db)` (07-06) is the ONE hydrating reader. A bare `SELECT now()` through
// `db.execute` hands back Postgres TEXT rather than a Date — an `as unknown as { now: Date }[]` cast over it
// satisfies tsc, eslint AND `next build`, and then throws on `.getTime()` the first time a real booker loads
// the page. That instant is threaded into `quoteRefund` and into every time comparison below; there is no
// JS clock read anywhere on this page.
//
// AND THE HONEST LIMIT OF THE PREVIEW: the action RECOMPUTES at confirm time (see the header of
// actions/cancel-booking.ts for why that is the only defensible rule for money). Time only moves toward the
// session, so a rung crossed between this render and the confirm can only ever LOWER the refund. That is
// why the D-81 boundary disclosure below is not decoration: a booker close to a boundary is told the exact
// instant their refund changes, so the recompute can never be a surprise.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { composeWhenLabel } from "@/lib/booking/when-label";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { LADDER, quoteRefund, rungBoundaries, tierOrDefault } from "@/lib/payments/cancellation";
import { isApiRefundable } from "@/lib/payments/refund-rail";
import { listReceivingInstitutions, type ReceivingInstitution } from "@/lib/paymongo";
import { venueTzNote } from "@/lib/venue-time";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RefundBreakdown } from "@/components/booking/refund-breakdown";
import { CancelConfirm } from "@/components/booking/cancel-confirm";
import { RefundDestinationForm } from "@/components/booking/refund-destination-form";

/** Host-facing tier names, sentence-cased for the D-78 rationale prose. */
const TIER_LABELS = { flexible: "Flexible", standard: "Standard", strict: "Strict" } as const;

/**
 * The `{rung description}` clause of the D-78 rationale sentence, derived from the SAME `LADDER` the quote
 * was computed from — so the prose explaining the number can never describe a different policy than the one
 * that produced it. Rungs are descending by `minHours`, so index 0 is the most generous.
 */
function rungDescription(tier: "flexible" | "standard" | "strict", refundBps: number): string {
  const rungs = LADDER[tier];
  const i = rungs.findIndex((r) => r.refundBps === refundBps);
  if (i === -1) {
    // No rung satisfied — the booker is inside the final, unrefunded stretch.
    const last = rungs[rungs.length - 1];
    return `under ${last.minHours} hours before the session`;
  }
  if (i === 0) return `${rungs[0].minHours} hours or more before the session`;
  return `${rungs[i - 1].minHours}–${rungs[i].minHours} hours before the session`;
}

export default async function CancelBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // A session is required to own a booking — no session can never be the owner (→ 404, reveal nothing).
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) notFound();

  const [bk] = await db
    .select({
      id: booking.id,
      bookerId: booking.bookerId,
      listingId: booking.listingId,
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      // The D-67 SNAPSHOT — never listing.cancellationPolicy. A host retiering the listing after this
      // booking was made does not get to restate its terms on the very screen that discloses them.
      cancellationPolicy: booking.cancellationPolicy,
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
      currency: booking.currency,
      // D-72: the rail decides whether the confirm is the plain CancelConfirm (API-refundable) or the
      // collect-and-never-store destination form (QRPh — refund-rail.ts, settled 2026-07-23).
      paymentMethod: booking.paymentMethod,
    })
    .from(booking)
    .where(eq(booking.id, id));

  // Owner-gate (T-04-CONFIRMIDOR / T-07-48) — the route group is NOT the gate. Missing OR not-mine → the
  // SAME bare 404 as bookings/[id]/page.tsx, so a guessed id is indistinguishable from a stranger's.
  if (!bk || bk.bookerId !== userId) notFound();

  // Only a PAID booking gets this screen. An unpaid `requested`/`approved` hold moves no money, so it uses
  // the plain confirm dialog on the detail page (07-UI-SPEC § 3) — showing it a money breakdown would
  // invent a refund that does not exist.
  if (bk.status !== "confirmed") redirect(`/bookings/${bk.id}`);

  const [lst] = await db
    .select({
      title: listing.title,
      city: listing.city,
      timezone: listing.timezone,
      hourlyRateCents: listing.hourlyRateCents,
    })
    .from(listing)
    .where(eq(listing.id, bk.listingId));
  if (!lst) notFound();

  // ── THE CLOCK. Postgres, read once, hydrated once, threaded everywhere below. ──────────────────────────
  const now = await readDbNow(db);

  const inTz = tz(lst.timezone);
  const currency = bk.currency ?? DISPLAY_CURRENCY;
  const title = lst.title ?? "your space";
  const whenLabel = composeWhenLabel({
    startsAt: bk.startsAt,
    endsAt: bk.endsAt,
    timezone: lst.timezone,
    city: lst.city,
    spacePriceCents: bk.spacePriceCents,
    quotedTotalCents: bk.quotedTotalCents,
    hourlyRateCents: lst.hourlyRateCents,
  });
  const tzNote = venueTzNote(lst.city, lst.timezone);

  // D-94: past start, there is nothing to cancel here. Calm refusal, no confirm button — matched word for
  // word to the action's own PAST_START result, so the page and the server never contradict each other.
  if (bk.startsAt.getTime() <= now.getTime()) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <Card>
          <CardContent role="status" aria-live="polite" className="space-y-4 py-10 text-center">
            <h1 className="text-xl leading-tight font-semibold">This session has already started</h1>
            <p className="mx-auto max-w-prose text-sm text-muted-foreground">
              This session has already started, so it can&apos;t be cancelled here. Message the host if
              something&apos;s wrong.
            </p>
            <p className="text-sm text-muted-foreground">
              {title} · {whenLabel}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const tier = tierOrDefault(bk.cancellationPolicy);
  const spacePriceCents = bk.spacePriceCents ?? bk.quotedTotalCents ?? 0;
  const serviceFeeCents = bk.serviceFeeCents ?? 0;

  // THE quote. Same module, same inputs and the same clock family the action uses — the two are the same
  // function of the same row, so they agree by construction rather than by coincidence.
  const quote = quoteRefund({
    tier,
    spacePriceCents,
    serviceFeeCents,
    startsAt: bk.startsAt,
    now,
  });

  const hoursToStart = Math.floor(quote.hoursToStart);
  const percentLabel = `${quote.refundBps / 100}%`;

  // D-81 — the CONCRETE instant the refund changes, in venue-local time, never an abstract percentage
  // alone. This is what turns the action's recompute from a surprise into something the booker was told.
  const boundaries = rungBoundaries(tier, bk.startsAt);
  const nextIndex = boundaries.findIndex((b) => b.boundary.getTime() > now.getTime());
  const nextDrop =
    nextIndex === -1
      ? null
      : {
          at: boundaries[nextIndex].boundary,
          toBps: boundaries[nextIndex + 1]?.refundBps ?? 0,
        };

  // ── D-72: a rail PayMongo cannot API-refund, with money owed, needs a destination the booker supplies.
  // The institution list is fetched SERVER-side (it also feeds the action's BIC allow-list). If the fetch
  // fails — observed live 2026-07-23: the Money Movement endpoints 404 until PayMongo enables the feature
  // (refund-rail.ts) — the page must NOT crash: it falls back to the plain confirm, says so calmly, and the
  // action's `needs_attention` operator seam picks the refund up. A ₱0 refund needs no destination at all.
  const needsDestination = !isApiRefundable(bk.paymentMethod) && quote.totalRefundCents > 0;
  let institutions: ReceivingInstitution[] = [];
  if (needsDestination) {
    try {
      institutions = await listReceivingInstitutions();
    } catch {
      institutions = [];
    }
  }
  const destinationFormReady = needsDestination && institutions.length > 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Card>
        <CardContent className="space-y-6 py-8">
          <div className="space-y-2">
            {/* Display scale (28px/600) — the question, not the money. The money's focal treatment lives
                on `Refund to you` inside the breakdown. */}
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
              Cancel this booking?
            </h1>
            <p className="text-sm text-muted-foreground">
              {title} · {whenLabel}
            </p>
          </div>

          <Separator />

          {/* D-78's "which tier applies and why", composed server-side from the quote and the LADDER it
              came from. Verbatim per 07-UI-SPEC § 3 — do not paraphrase. */}
          <div className="space-y-2">
            <p className="text-sm">
              This space uses the {TIER_LABELS[tier]} cancellation policy. You&apos;re cancelling{" "}
              {hoursToStart} hours before the session starts, which falls in the{" "}
              {rungDescription(tier, quote.refundBps)} window — {percentLabel} of the space price is
              refunded.
            </p>
            {nextDrop && (
              <p className="text-sm text-muted-foreground">
                This refund drops to {nextDrop.toBps / 100}% after{" "}
                {format(nextDrop.at, "EEE, MMM d, h:mm a", { in: inTz })}
                {lst.city ? ` (${lst.city} time)` : ""}.
              </p>
            )}
          </div>

          <Separator />

          {/* Every prop is a finished string. The component performs zero arithmetic — see its header. */}
          <RefundBreakdown
            paidLabel={formatMoney(bk.quotedTotalCents ?? spacePriceCents + serviceFeeCents, currency)}
            spacePriceLabel={formatMoney(spacePriceCents, currency)}
            serviceFeeLabel={formatMoney(serviceFeeCents, currency)}
            spaceRefundLabel={formatMoney(quote.spaceRefundCents, currency)}
            spaceRefundPercentLabel={percentLabel}
            serviceFeeRefundLabel={formatMoney(quote.serviceFeeRefundCents, currency)}
            totalRefundLabel={formatMoney(quote.totalRefundCents, currency)}
          />

          {needsDestination ? (
            <p className="text-xs text-muted-foreground">
              QR&nbsp;Ph payments can&apos;t be refunded back the way they came, so your refund is sent
              to a bank or e-wallet account instead.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Refunds usually land back on your original payment method within a few days.
            </p>
          )}
          <p className="text-xs text-muted-foreground">{tzNote}</p>

          <Separator />

          {/* Neutral outline confirm + ghost back. The rationale for refusing both coral and destructive-red
              lives in the component's header, where the buttons actually are. */}
          {destinationFormReady ? (
            <RefundDestinationForm bookingId={bk.id} institutions={institutions} />
          ) : (
            <>
              {needsDestination && (
                <p className="text-sm text-muted-foreground">
                  We can&apos;t take refund account details right now, so our team will arrange your{" "}
                  {formatMoney(quote.totalRefundCents, currency)} refund with you directly after you
                  cancel.
                </p>
              )}
              <CancelConfirm bookingId={bk.id} />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
