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

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, listingPhoto } from "@/lib/db/schema";
import { windowHours, paxSurcharge } from "@/lib/booking/pricing";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import { venueTzNote } from "@/lib/venue-time";
import {
  composeDeadlineLabel,
  composeDateLabel,
  composeWhenLabel,
} from "@/lib/booking/when-label";
// `rungBoundaries` + `bestFutureRungIndex` only — deliberately NOT `tierOrDefault`. The Flexible fallback
// is a legacy safety net for the refund ENGINE; using it here would put a policy the host never chose in
// front of a booker.
import { rungBoundaries, bestFutureRungIndex } from "@/lib/payments/cancellation";
import { Button } from "@/components/ui/button";
import { PriceBreakdown } from "@/components/booking/price-breakdown";
import { CancellationPolicyDisclosure } from "@/components/booking/cancellation-policy-disclosure";
import { HoldExpiredState } from "@/components/booking/hold-expired-state";
import { PartialGrantNotice } from "@/components/booking/partial-grant-notice";
import { PaxStepper } from "@/components/booking/pax-stepper";
import { PublishExpiresAt } from "@/components/booking/hold-publisher";
import { ReserveView } from "@/components/booking/reserve-view";
import { DropInBadge } from "@/components/listing/drop-in-badge";

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // `requested` is appended by placeOpenHold ONLY when the claim granted fewer passes than were asked for
  // (09-07). It is a display-only hint and is treated as hostile input below (T-09-24).
  searchParams: Promise<{ hold?: string | string[]; requested?: string | string[] }>;
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
      // OC-08 — the drop-in rate. NULL on every exclusive listing; a published open listing always has one
      // (09-06's publish gate), which is why the reduction estimate below can treat a null as unrenderable.
      perHeadPriceCents: listing.perHeadPriceCents,
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
  // ⚠️ THE OPEN-CAPACITY EXCLUSION IS LOAD-BEARING, NOT DEFENSIVE. A drop-in listing can still carry
  // `included` / `extra_head_fee` columns: 09-06 requires a per-head price to publish but never CLEARS the
  // exclusive ones, and OC-17 lets a host switch modes on a listing that already had them (09-07's lesson).
  // A drop-in booking's price is `perHead × granted` with no surcharge term whatsoever (quoteOpenCapacity),
  // so recomputing `paxSurcharge` from those leftover columns would disclose an "Extra guests" line for
  // centavos that are not in the frozen price — and drop the run line to a base that is not what was
  // charged. The mode decides, not the columns.
  const showSurcharge =
    !bk.openCapacity && surcharge.surchargeCents > 0 && surcharge.surchargeCents < spacePriceCents;
  const runPriceCents = showSurcharge ? spacePriceCents - surcharge.surchargeCents : spacePriceCents;

  // The stepper exists ONLY on a listing that actually charges per head (D-108). On every flat listing the
  // component is never mounted and this page is byte-for-byte what it was before Phase 8.
  //
  // AND NEVER ON A DROP-IN BOOKING (D-126). The pass count is FINAL at hold time: the capacity claim granted
  // it inside the hold's own transaction, and `updateDeclaredPax` refuses an open row outright, because a
  // re-price that does not re-enter the claim is simultaneously an overbook vector and a price-tamper
  // vector (09-07). The drop-in stepper is PRE-hold and lives on the listing rail (09-11/09-12). So the
  // absence of a stepper here is a decision, not an oversight — and without this term a drop-in listing
  // that still carries a leftover `extra_head_fee` would mount a control every press of which fails.
  const chargesPerHead = !bk.openCapacity && (lst.extraHeadFee ?? 0) > 0;

  const dateLabel = format(bk.startsAt, "EEEE, MMM d", { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(bk.startsAt, "h:mm a", { in: inTz })} – ${format(bk.endsAt, "h:mm a", { in: inTz })}`;

  // ── OC-02 / OC-03 — what a drop-in booking actually says it is (09-UI-SPEC O2) ─────────────────────────
  // A pass persists starts_at = the venue's OPENING instant and ends_at = its CLOSING instant so the refund
  // ladder, payout sweep, reminders and expiry keep working unchanged. Those instants are an ENTRY WINDOW,
  // not a reservation, so this branch renders the SHARED formatter's drop-in line — "{date} · Drop-in pass,
  // any time {open} – {close} ({City} time)" — and NOTHING else: no second line, no start/end fields and no
  // run-length term. Composing it locally would be the fourth copy when-label.ts exists to prevent, and it
  // is also what guarantees this page and every other booking surface name the same pass the same way.
  //
  // Composed only when it is actually rendered: an exclusive booking keeps the shipped two-line block above
  // verbatim, and a label built for it here would be a value nothing reads.
  const whenLabel = bk.openCapacity
    ? composeWhenLabel({
        startsAt: bk.startsAt,
        endsAt: bk.endsAt,
        timezone,
        city: lst.city,
        fullDay: bk.fullDay,
        openCapacity: bk.openCapacity,
        spacePriceCents: bk.spacePriceCents,
        quotedTotalCents: bk.quotedTotalCents,
        dayRateCents: lst.dayRateCents,
      })
    : null;

  // ── OC-07 — the reduction, and the two figures it is stated with (09-UI-SPEC § 3) ─────────────────────
  // `granted` is the PERSISTED head count on the row: what the claim actually granted and what was priced.
  const granted = bk.declaredPax ?? 1;
  // `requested` arrives as a query param from placeOpenHold and is UNTRUSTED and DISPLAY-ONLY (T-09-24).
  // The CHARGE is booking.quotedTotalCents — frozen at hold time and completely unaffected by this value.
  // Clamp it into the only range where a reduction notice is meaningful before rendering anything with it:
  //   - not an integer, or not actually ABOVE what was granted ⇒ there is no reduction to state, so null;
  //   - otherwise pinned to [granted + 1, cap], so `?requested=99999` renders the listing's own ceiling
  //     rather than an absurd estimate. The ceiling is floored at granted + 1 so that a host who edited
  //     max_occupancy DOWN during a live hold cannot collapse the range and silence a genuine reduction.
  const rawRequested = Number(Array.isArray(sp.requested) ? sp.requested[0] : sp.requested);
  const requestedCeiling = Math.max(lst.maxOccupancy ?? 0, granted + 1);
  const requested =
    Number.isInteger(rawRequested) && rawRequested > granted
      ? Math.min(Math.max(rawRequested, granted + 1), requestedCeiling)
      : null;
  // A per-head price is guaranteed on a published open listing (09-06) and is what froze this hold's price;
  // with none there is no honest estimate to show, and a ₱0.00 "estimate" would be worse than silence.
  const showPartial = bk.openCapacity && requested != null && lst.perHeadPriceCents != null;
  // BOTH figures are composed HERE, server-side, exactly like every other price on this page. The alert
  // formats nothing: the new figure is the row's FROZEN total (the amount PayMongo will charge) and the old
  // one is a display-only all-in estimate through the SAME computeServiceFee checkout uses (D-75).
  const currency = bk.currency ?? DISPLAY_CURRENCY;
  const oldTotalLabel =
    showPartial && requested != null
      ? formatMoney(
          computeServiceFee((lst.perHeadPriceCents ?? 0) * requested).allInCents,
          currency,
        )
      : null;
  // Server-formatted charged amount for the `Confirm & pay` reassurance (D-57) — the frozen quote (D-49),
  // never a client recompute. The SAME string is the alert's "new" figure: the amount the booker is told
  // they are consenting to and the amount named on the confirm must not be two separate renderings.
  const totalLabel = formatMoney(quoted, currency);

  // ── D-59 #2 / SHELL-03 — THE ONE WAY BACK, AND THE PARAM IT MUST NOT CARRY ──────────────────────────
  // SHELL-03 strips this route of navigation because a stray link is a one-click way to abandon a slot
  // the booker believes they are holding. "No way out" and "trapped" are different things, though, and
  // the difference is a LABEL and a PROMISE: exactly one link, in the main column, saying where it goes
  // and what happens to the hold.
  //
  // The window is recomposed from the hold's OWN frozen instants rather than forwarded from a search
  // param, which is both simpler and stricter — this page never receives `date`/`start`/`end`, and the
  // booking row is the only thing here that knows what was actually reserved. `parseWindowHour` accepts
  // on-the-hour venue-local `HH:mm` only (D-22), which is exactly what an hourly booking's boundaries
  // are; a full-day or drop-in booking contributes the DAY alone, because it has no hour window to
  // restore and half-seeding a picker is worse than not seeding it (12-02's rule).
  //
  // ⚠️ IT MUST NEVER CARRY THE RESUME DISCRIMINATOR — the `resume` param set to 1, which `book-cta.tsx`
  // reads on arrival to re-fire a hold. Carrying it would turn a back LINK into a hold-creating GET:
  // the T-04-GETDUP shape this route's own header refuses, arriving through the one anchor SHELL-03
  // allows (T-12-03-GETDUP). `e2e/shell.spec.ts` asserts its absence from the RENDERED href, which is
  // why this paragraph may name it plainly — the assertion reads the DOM, not this file. Safe by
  // construction even so: `createPendingHold` REPLAYS a booker's own live hold for the same window
  // rather than minting a second one.
  //
  // The params are built through `URLSearchParams` rather than string-concatenated, so the `:` in
  // `HH:mm` is percent-encoded on the wire and decoded back before `parseWindowHour` ever sees it.
  const backParams = new URLSearchParams({
    date: format(bk.startsAt, "yyyy-MM-dd", { in: inTz }),
  });
  if (!bk.openCapacity && !fullDay) {
    backParams.set("start", format(bk.startsAt, "HH:mm", { in: inTz }));
    backParams.set("end", format(bk.endsAt, "HH:mm", { in: inTz }));
  }
  const backHref = `/listings/${bk.listingId}?${backParams.toString()}`;

  const summary = (
    <div className="space-y-6">
      {/* OC-07 — the reduction alert, FIRST in the DOM (09-UI-SPEC § 3: "top of the reserve page, above
          the `Your booking` summary"). Its position is the accessibility contract, not decoration: the
          summary column precedes the action column, so the alert is reachable in the tab order BEFORE
          `Confirm & pay` and cannot be paid past unheard (T-09-43).

          It lives INSIDE `summary` rather than beside ReserveView on purpose — ReserveView drops the
          summary when the hold lapses, so a booker looking at "Your hold expired" is never also told
          their booking is set to N passes. */}
      {showPartial && requested != null && oldTotalLabel != null && (
        <PartialGrantNotice
          grantedPasses={granted}
          requestedPasses={requested}
          dateLabel={composeDateLabel(bk.startsAt, timezone, lst.city)}
          newTotalLabel={totalLabel}
          oldTotalLabel={oldTotalLabel}
          pickAnotherHref={`/listings/${bk.listingId}`}
        />
      )}

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

      {/* The drop-in fork is written as two whole blocks rather than three interleaved conditionals so the
          EXCLUSIVE branch below is the shipped markup character-for-character (a UAT-passed money surface;
          08-05's inline fixes still stand in it). The open block states a DAY and the hours you may turn up
          — never a range, never a run length (O2). */}
      {bk.openCapacity ? (
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Your booking</h3>
            <DropInBadge />
          </div>
          <p className="mt-1 text-base">{whenLabel}</p>
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Your booking</h3>
          <p className="mt-1 text-base">{dateLabel}</p>
          <p className="text-base text-muted-foreground">
            <span className="tabular-nums">{timeLabel}</span>
            {!fullDay && ` · ${hours} ${hours === 1 ? "hour" : "hours"}`}
          </p>
        </div>
      )}

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

      {/* LAST in the main column, below everything else it describes — never in the header (SHELL-03's
          zero-anchor count is over that subtree), never in the rail (the rail is the money column and
          this is not a money action), never in a sticky bar (a persistent escape hatch beside a
          terminal action is an invitation to leave). The promise beneath it is the whole reason a link
          is safe here at all: the hold is not cancelled by looking at the listing again, and a booker
          who does not know that will sit on this page rather than check. */}
      <div>
        <Button asChild variant="ghost" size="touch">
          <Link href={backHref}>Back to the listing</Link>
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">
          We&apos;ll keep your hold — the timer keeps running.
        </p>
      </div>
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

  // WR-05 / T-09-88 — is this pass being bought for a day that has ALREADY opened? OC-03 makes an open row's
  // `startsAt` the venue's opening instant, so this is the one comparison that decides whether the ladder
  // still has anything to offer. It is FALSE for every exclusive booking by construction: `confirmBooking`
  // refuses one past its own start (D-94), so the state cannot be reached and the disclosure below stays
  // byte-identical on that path.
  //
  // Computed here, server-side, from the page's own `now` — the same instant every other time decision on
  // this page uses, and never a client clock (D-105). This is a DISCLOSURE, not an enforcement: what a
  // booker is actually refunded still recomputes against the Postgres clock at cancel time.
  const windowAlreadyOpen = bk.openCapacity && bk.startsAt.getTime() <= now.getTime();

  // OC-08 — `perHeadPriceCents` / `passes` are supplied ONLY for a drop-in booking, which flips the run
  // line to the per-person form. Both are null on every exclusive booking, so that run line is unchanged
  // (09-UI-SPEC Open Q10). `passes` is the PERSISTED granted head count, so a partial grant reads as what
  // was actually claimed — the same number the frozen total was priced from.
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
        perHeadPriceCents={bk.openCapacity ? lst.perHeadPriceCents : null}
        passes={bk.openCapacity ? granted : null}
        currency={currency}
        fullDay={fullDay}
        hours={hours}
        hourlyRateCents={lst.hourlyRateCents}
        dayRateCents={lst.dayRateCents}
      />
      <CancellationPolicyDisclosure
        tier={tier}
        openCapacity={bk.openCapacity}
        windowAlreadyOpen={windowAlreadyOpen}
        boundaryLabels={boundaryLabels}
        bestRungIndex={bestRungIndex}
      />
      {/* D-49 — THE RAIL KEEPS THE WORDS AND LOSES THE DIGITS. The countdown moved to the header, and
          this sentence went with the reassurance rather than with the timer: it is the reason the
          booker can take their time, and it belongs beside the money they are about to agree to. It
          carries NO figure and NO live region — one `hold-countdown` per document, one `role="timer"`,
          one polite region, all of them in the header. Rendered here as a SERVER node like every other
          word in this column. */}
      <p className="text-xs text-muted-foreground">
        We&apos;re holding this for you while you review.
      </p>
    </>
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      {/* D-49 / plan 12-03 — the deadline crosses UP into the checkout header's countdown, which the
          LAYOUT mounts and which therefore cannot be handed a prop by this page. This renders nothing;
          it writes one already-authorised ISO string into `HoldProvider`. `bk.expiresAt` is non-null
          here by the `active` gate above, and it has passed the owner gate, the path-id cross-check and
          both `notFound()` calls — none of which this component can reach or repeat. */}
      <PublishExpiresAt expiresAt={bk.expiresAt!.toISOString()} />

      <header className="space-y-1">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
          Review and book
        </h1>
        <p className="text-sm text-muted-foreground">{tzNote}</p>
      </header>

      <div className="mt-8">
        <ReserveView
          holdId={bk.id}
          listingId={bk.listingId}
          totalLabel={totalLabel}
          summary={summary}
          breakdown={breakdown}
        />
      </div>
    </main>
  );
}
