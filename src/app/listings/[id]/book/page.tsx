// The reserve / checkout page (BOOK-01/02 · D-39/D-42/D-44). Reached ONLY from the placeHold POST action
// (the listing "Book this space" CTA), which mints the pending hold and redirects here with ?hold=<id>.
//
// This RSC READS the hold — it NEVER creates one. Hold creation lives exclusively in the placeHold POST
// action (Pitfall 2 / T-04-GETDUP): a GET render that minted a hold would duplicate it on every
// prefetch / refresh / Back. So there is deliberately NO placeHold / createPendingHold call here.
//
// Security boundaries enforced here:
//   - T-04-RESERVEIDOR: the hold is loaded owner-gated — a missing row, a hold owned by a DIFFERENT
//     booker, or no session all notFound() (a bare 404 reveals nothing about another booker's hold).
//   - D-42 idempotency: an already-`confirmed` OWN hold revisited here REDIRECTS to the durable
//     confirmation — a booked user must NEVER be shown "your hold expired".
//   - D-44 graceful expiry: a genuinely expired / cancelled (non-confirmed) hold renders the calm
//     HoldExpiredState, never a stale reserve form.
//
// Times are timestamptz UTC, displayed venue-local at the edge (SC#2). Prices are the server-FROZEN quote
// (booking.quotedTotalCents, D-49) — never a client recompute.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, listingPhoto } from "@/lib/db/schema";
import { windowHours, paxSurcharge } from "@/lib/booking/pricing";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import { venueTzNote } from "@/lib/venue-time";
import { composeDeadlineLabel } from "@/lib/booking/when-label";
// `rungBoundaries` + `bestFutureRungIndex` only — deliberately NOT `tierOrDefault`. The Flexible fallback
// is a legacy safety net for the refund ENGINE; using it here would put a policy the host never chose in
// front of a booker.
import { rungBoundaries, bestFutureRungIndex } from "@/lib/payments/cancellation";
import { PriceBreakdown } from "@/components/booking/price-breakdown";
import { CancellationPolicyDisclosure } from "@/components/booking/cancellation-policy-disclosure";
import { HoldExpiredState } from "@/components/booking/hold-expired-state";
import { PaxStepper } from "@/components/booking/pax-stepper";
import { ReserveView } from "@/components/booking/reserve-view";

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hold?: string | string[] }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const holdId = Array.isArray(sp.hold) ? sp.hold[0] : sp.hold;

  // Session gate first — a hold belongs to a booker, so no session can never be the owner (→ 404, not a
  // login bounce: reaching this page always follows an authenticated placeHold redirect).
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId || !holdId) notFound();

  const now = new Date();

  // Owner-gated hold read (T-04-RESERVEIDOR). The URL id ≠ /listings/[id] path id: the hold row carries
  // its own listingId; we trust the row, not the path segment.
  const [bk] = await db
    .select({
      id: booking.id,
      listingId: booking.listingId,
      bookerId: booking.bookerId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status,
      expiresAt: booking.expiresAt,
      quotedTotalCents: booking.quotedTotalCents,
      // The D-74 frozen split. `quotedTotalCents` is the ALL-IN charge; these two are its parts, frozen at
      // hold creation. Both are read (never recomputed) so the breakdown the booker agrees to is exactly
      // the amount that will be charged.
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      // The D-67 tier SNAPSHOT, frozen onto this hold at creation (07-08) — deliberately NOT
      // listing.cancellationPolicy. This is the exact column `quoteRefund` reads if the booker later
      // cancels, so disclosing from it means the terms shown here are provably the terms applied. A host
      // retiering the listing between this render and the cancel cannot move what was disclosed (T-07-90).
      cancellationPolicy: booking.cancellationPolicy,
      currency: booking.currency,
      // WR-06 (drizzle 0016) — the PERSISTED pricing-mode snapshot, read instead of re-derived (see below).
      fullDay: booking.fullDay,
      // The OC-03 mode SNAPSHOT (drizzle 0021). The CONCRETE-mode disclosure copy below is identical in
      // both modes — its deadline is a venue-local instant, and OC-03 already makes that instant the
      // venue's opening time for a pass — but the flag is REQUIRED, so this projection is what proves the
      // question was asked rather than assumed (09-UI-SPEC § 5b).
      openCapacity: booking.openCapacity,
      // D-108 — the headcount that priced this hold. NULL on every flat-priced listing.
      declaredPax: booking.declaredPax,
    })
    .from(booking)
    .where(eq(booking.id, holdId));
  if (!bk || bk.bookerId !== userId) notFound();

  // Defense in depth: the legit flow always lands on the hold's OWN listing (placeHold redirects to
  // /listings/${listingId}/book). A mismatched path id is a crafted URL → 404 rather than a confusing render.
  if (bk.listingId !== id) notFound();

  // D-42: an already-confirmed OWN hold → the durable confirmation, NEVER the expiry state (a booked user
  // must never be told their hold expired). Short-circuits before any expiry check.
  if (bk.status === "confirmed") redirect(`/bookings/${bk.id}`);

  // D-44: only a still-live hold with a future TTL renders the reserve/pay form. Live = a `pending` instant
  // hold OR an `approved` request (PAY-05 / D-63 — this same pay page is reused for pay-on-approval, so the
  // approved booker lands on the exact Phase-5 "Confirm & pay" surface). Anything else (cancelled/declined,
  // a not-yet-approved `requested`, or a hold past its expires_at) degrades to the calm expiry interstitial.
  const active =
    (bk.status === "pending" || bk.status === "approved") &&
    !!bk.expiresAt &&
    bk.expiresAt.getTime() > now.getTime();
  if (!active) return <HoldExpiredState listingId={bk.listingId} />;

  // Live hold → load the listing facts (rates + venue tz) + the cover thumb for the summary.
  const [lst] = await db
    .select({
      title: listing.title,
      primarySpaceType: listing.primarySpaceType,
      city: listing.city,
      timezone: listing.timezone,
      hourlyRateCents: listing.hourlyRateCents,
      dayRateCents: listing.dayRateCents,
      // D-108 group pricing + the stepper's cap. `extraHeadFee` absent/0 ⇒ this page renders exactly as
      // it does today: no stepper, no surcharge line, no declaredPax anywhere.
      included: listing.included,
      extraHeadFee: listing.extraHeadFee,
      maxOccupancy: listing.maxOccupancy,
    })
    .from(listing)
    .where(eq(listing.id, bk.listingId));
  if (!lst) notFound();

  const [cover] = await db
    .select({ url: listingPhoto.url })
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, bk.listingId))
    .orderBy(asc(listingPhoto.position))
    .limit(1);

  const timezone = lst.timezone;
  const inTz = tz(timezone);
  const tzNote = venueTzNote(lst.city, timezone);
  const title = lst.title ?? "Untitled space";
  const spaceTypeLabel = lst.primarySpaceType
    ? SPACE_TYPE_LABELS[lst.primarySpaceType as SpaceTypeValue]
    : null;

  // fullDay is the booking row's OWN persisted creation-time snapshot (booking.full_day, drizzle 0016 /
  // WR-06) — the same flag quoteWindow froze this price with. The Total shown is ALWAYS the frozen all-in
  // quotedTotalCents (D-49) regardless of this label; only the "/day" vs "/hr × N" wording depends on it.
  //
  // ⚠️ THE OLD "space price is not equal to the hourly run total" DERIVATION IS GONE, AND MUST NOT COME
  // BACK (08-RESEARCH Pitfall 3). It was already fragile — a host rate edit made the inequality lie — but
  // the D-108 extra-guest surcharge makes it actively WRONG: the surcharge is folded INTO spacePriceCents
  // (A1), so a perfectly ordinary hourly booking with one extra guest no longer matches the plain hourly
  // run total, and would render as "Full day" to the person who booked two hours.
  //
  // ⚠️ GREP TRIPWIRE (the 07-04 payout-sweep idiom). The absence of the old derivation is checked by grepping
  // this file for the two identifiers it was written with; neither is spelled out anywhere here, comments
  // included, because a guard a comment can trip is not a guard.
  //
  // The fallback covers pre-0016 rows only (full_day IS NULL) and is a POSITIVE day-rate match, never an
  // inequality — mirroring re-request.ts:234. It can only ever ADD "Full day" on an exact match, so nothing
  // hourly (surcharged or not) can be mislabeled by it.
  const hours = windowHours(bk.startsAt, bk.endsAt);
  const quoted = bk.quotedTotalCents ?? 0;
  // The D-74 split, read off the frozen row. LEGACY FALLBACK: a pre-Phase-7 booking has a null split and
  // genuinely had no service fee, so `space = the whole charge, fee = 0` reproduces exactly what it was
  // charged — and `serviceFeeCents === 0` makes PriceBreakdown omit the fee row entirely.
  const spacePriceCents = bk.spacePriceCents ?? quoted;
  const serviceFeeCents = bk.serviceFeeCents ?? 0;
  const fullDay =
    bk.fullDay ?? (lst.dayRateCents != null && spacePriceCents === lst.dayRateCents);

  // ── D-108 extra-guest surcharge, computed SERVER-SIDE by the same function that froze it ─────────────
  // `paxSurcharge` is the single definition of the D-108 product; quoteWindow folded its `surchargeCents`
  // into `spacePriceCents` at hold time (A1). Disclosing it needs the run line to drop back to the BASE,
  // or the same centavos would appear twice — so the base is computed HERE and handed to PriceBreakdown,
  // which still neither sums nor subtracts anything.
  //
  // The `< spacePriceCents` guard is a coherence check, not decoration: if a host edits extra_head_fee
  // during a live hold, the recomputed surcharge could no longer fit inside the frozen space price. Rather
  // than render a base that disagrees with the charge, the line is simply omitted and the run line shows
  // the whole frozen space price — the pre-Phase-8 rendering, which is always truthful about the total.
  const surcharge = paxSurcharge({
    included: lst.included,
    extraHeadFee: lst.extraHeadFee,
    declaredPax: bk.declaredPax,
  });
  const showSurcharge =
    surcharge.surchargeCents > 0 && surcharge.surchargeCents < spacePriceCents;
  const runPriceCents = showSurcharge ? spacePriceCents - surcharge.surchargeCents : spacePriceCents;

  // The stepper exists ONLY on a listing that actually charges per head (D-108). On every flat listing the
  // component is never mounted and this page is byte-for-byte what it was before Phase 8.
  const chargesPerHead = (lst.extraHeadFee ?? 0) > 0;

  const dateLabel = format(bk.startsAt, "EEEE, MMM d", { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(bk.startsAt, "h:mm a", { in: inTz })} – ${format(bk.endsAt, "h:mm a", { in: inTz })}`;

  const summary = (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {cover?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt={title} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl leading-tight font-semibold">{title}</h2>
          {spaceTypeLabel && <p className="text-sm text-muted-foreground">{spaceTypeLabel}</p>}
          <p className="text-sm text-muted-foreground">{tzNote}</p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Your booking</h3>
        <p className="mt-1 text-base">{dateLabel}</p>
        <p className="text-base text-muted-foreground">
          <span className="tabular-nums">{timeLabel}</span>
          {!fullDay && ` · ${hours} ${hours === 1 ? "hour" : "hours"}`}
        </p>
      </div>

      {/* D-108 — the headcount control, and ONLY on a listing that charges per head. `declaredPax` is the
          PERSISTED value (organizer counts as #1, D-113), so a refresh or a Back never resurrects a stale
          local number, and the cap is the listing's own maxOccupancy. */}
      {chargesPerHead && (
        <div className="rounded-lg border p-4">
          <PaxStepper
            holdId={bk.id}
            declaredPax={bk.declaredPax ?? 1}
            maxOccupancy={lst.maxOccupancy ?? 1}
          />
        </div>
      )}
    </div>
  );

  // D-81 / C3 — the rung boundaries as CONCRETE INSTANTS for THIS booking, derived SERVER-SIDE from the
  // booking's own snapshotted tier and its frozen startsAt, then rendered venue-local by the shared
  // deadline formatter (07-02). Percentages may accompany a date; they may never replace one, so the
  // disclosure is fed dates rather than left to state the ladder abstractly. Nothing here reads a client
  // clock — the instants are pure arithmetic on a stored timestamptz (T-07-92).
  //
  // A pre-Phase-7 hold has a null snapshot; `tier` stays null and the disclosure renders nothing rather
  // than showing a policy the booker's row doesn't carry (see the component's NULL-TIER note).
  const tier = bk.cancellationPolicy;
  const boundaryLabels = tier
    ? rungBoundaries(tier, bk.startsAt).map((r) =>
        composeDeadlineLabel(r.boundary, timezone, lst.city),
      )
    : undefined;
  // T4-rung: the summary line must lead with the best rung STILL OPEN for this booking, never a lapsed top
  // rung ("Free cancellation until <past instant>"). Computed here from the page's existing `now` (line 58)
  // — this is a DISPLAY summary; the enforceable refund still recomputes against the Postgres clock at
  // cancel time (cancel-booking.ts, unchanged), so this display clock can never move money. `-1` once every
  // boundary has passed, which the disclosure renders as a truthful no-window line.
  const bestRungIndex = tier ? bestFutureRungIndex(tier, bk.startsAt, now) : undefined;

  const breakdown = (
    <>
      <PriceBreakdown
        quotedTotalCents={quoted}
        spacePriceCents={spacePriceCents}
        runPriceCents={runPriceCents}
        serviceFeeCents={serviceFeeCents}
        extraHeads={showSurcharge ? surcharge.extraHeads : 0}
        extraHeadCents={showSurcharge ? surcharge.extraHeadCents : 0}
        extraSurchargeCents={showSurcharge ? surcharge.surchargeCents : 0}
        currency={bk.currency ?? DISPLAY_CURRENCY}
        fullDay={fullDay}
        hours={hours}
        hourlyRateCents={lst.hourlyRateCents}
        dayRateCents={lst.dayRateCents}
      />
      <CancellationPolicyDisclosure
        tier={tier}
        openCapacity={bk.openCapacity}
        boundaryLabels={boundaryLabels}
        bestRungIndex={bestRungIndex}
      />
    </>
  );

  // Server-formatted charged amount for the `Confirm & pay` reassurance (D-57) — the frozen quote (D-49),
  // never a client recompute.
  const totalLabel = formatMoney(quoted, bk.currency ?? DISPLAY_CURRENCY);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="space-y-1">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
          Review and book
        </h1>
        <p className="text-sm text-muted-foreground">{tzNote}</p>
      </header>

      <div className="mt-8">
        <ReserveView
          holdId={bk.id}
          listingId={bk.listingId}
          expiresAt={bk.expiresAt!.toISOString()}
          totalLabel={totalLabel}
          summary={summary}
          breakdown={breakdown}
        />
      </div>
    </main>
  );
}
