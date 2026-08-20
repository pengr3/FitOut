// The durable booking confirmation (BOOK-03 · D-43). The OWNER-GATE below, not the route group, is the
// security boundary (Security V4) — that is unchanged and remains the only thing keeping this page private.
//
// Phase 7 MOVED this file from src/app/bookings/[id] into the (app) group. Route groups do not change URLs,
// so it still serves /bookings/[id]; the move exists because Plan 06 adds a real /bookings segment and
// declaring `bookings` in BOTH the root and the (app) group is an avoidable Next.js routing ambiguity that
// Plans 09 and 12 would keep compounding. No behaviour in this file changed with the move.
//
// It also closes part of 07-UI-SPEC Open Question 1: inside (app) this page now inherits the booker header
// and therefore the D-92 notification bell. The (app) layout's own session redirect is DESIRABLE here rather
// than a regression — the page already refused to render without a session (it 404s), so the only change is
// that a signed-out visitor lands on /login instead of a 404. `/` and `/listings/[id]` remain header-less;
// that residual bell-coverage gap is accepted and is recorded in the 07-06 SUMMARY.
//
// Security boundaries enforced here:
//   - T-04-CONFIRMIDOR (a MUST-NOT-SKIP control): the booking is loaded owner-gated —
//     booking.bookerId === session.userId, else notFound(). A missing row and a row owned by a DIFFERENT
//     booker return the SAME bare 404, so guessing/leaking an id reveals nothing (V4/IDOR, D-43).
//   - T-04-ENUMID: the URL uses the opaque randomUUID booking id (unguessable); the FIT- reference is
//     display-only and non-sequential (derived one-way from the id — you cannot walk it back, V6).
//
// DURABLE: this is a pure RSC read of persisted booking state — it needs NO client/countdown/ephemeral
// hold state, so it survives a refresh or a later revisit unchanged. Times are timestamptz UTC, displayed
// venue-local at the edge (SC#2); the total is the server-FROZEN quote (booking.quotedTotalCents, D-49),
// never a client recompute.
//
// ── Plan 07-12 completed the page. FOUR ADDITIONS; every branch that shipped before is untouched. ────────
//   (a) The CANCEL ENTRY POINT (D-104). On a `confirmed` booking whose session is still ahead, a neutral
//       outline link BELOW the primary content and behind a Separator — present but not competing. It is a
//       LINK to /bookings/[id]/cancel, never an inline action, so D-78's itemised breakdown is always seen
//       before an irreversible money action.
//   (b) The UNPAID-HOLD cancel on `requested` / `approved` — a plain confirm dialog with no breakdown and no
//       money UI, because no money moved (D-63). The copy lives in CancelRequestDialog.
//   (c) The D-97 EXPIRED-APPROVAL recovery branch: a `cancelled` row that the SYSTEM retired (rather than a
//       party cancelling it) after an approval lapsed. Calm, plus a one-click resubmission when the slot is
//       genuinely free.
//   (d) The `cancelled` and derived-`completed` branches, both CALM — never an alarm colour, never --success.
//
// ── Plan 08-07 adds ONE more, on the confirmed branch only. ───────────────────────────────────────────────
//   (e) THE D-119 GROUP ENTRY: a coral `Invite people` on a confirmed, session-ahead, exclusive-occupancy
//       booking that is not yet a group, or a neutral `Manage group · {N} coming` link once it is. Its cost
//       to the surface is that the shipped coral `Find another space` DEMOTES to a ghost link — one primary
//       per surface (08-UI-SPEC Open Q3), and the differentiator gets the slot. Nothing else moved: the
//       cancel entry, every other status branch and all the money on this page are untouched.
//
// THE CLOCK. `now` is read from POSTGRES once, via `readDbNow`, and threaded into every status derivation and
// date comparison on the page, so the badge, the completed derivation and the availability read all agree
// with the DB and with the /bookings list's SQL partition. A bare `SELECT now()` through `db.execute` hands
// back Postgres TEXT rather than a Date — a cast over it satisfies tsc, eslint AND `next build`, then throws
// on `.getTime()` with the first real row; `readDbNow` is the ONE hydrating reader (the 07-06 boundary
// contract). There is no JS clock read anywhere on this page.
//
// ── ONE `main` LANDMARK PER DOCUMENT, SO THE CONTAINER ON EVERY BRANCH IS A `div` (fixed 20 Aug 2026). ───
// `(app)/layout.tsx:96` already wraps `{children}` in this route's one `main` landmark. All five returns
// below used to open their own inside it, so the page shipped TWO nested `main` landmarks —
// `document.querySelectorAll("main").length === 2`, measured here — which assistive tech resolves
// differently per tool: extra regions are dropped by some and announced as duplicates by others, and the
// outer one is the layout shell rather than this page's content either way. `loading.tsx:14-15` already
// states the rule and already obeys it, against a container it copies from this file verbatim; the skeleton
// was right and these branches were wrong.
// Pinned by `e2e/shell.spec.ts` — one `main` landmark on this route at 320px and at 1280px.
//
// ── Plan 13-10 — ONE SHELL, EIGHT RENDERS, AND THE OUTER CARD IS GONE (TRUST-01 / D-60). ────────────
//
// WHY THE CONTAINER CHANGED. Every branch below used to wrap its content in `<Card><CardContent>`. A
// `PanelCard` nested inside a container that ALREADY supplies `bg-card ring-1 rounded-xl` pays the block
// padding twice — measured at 112px against 80px, the trap `card-pattern-coverage.test.ts`'s own header
// records for the row card's twin of the problem — and this page now renders four panels (the facts, the
// reference, the money statement, the trust block). So the page became a STACK OF PANELS ON THE PAGE
// GROUND, which is what the pattern layer is for, and this file imports NOTHING from the vendored card
// primitive any more. `PriceBreakdown` / `RefundBreakdown` stay bare `div`s and are never wrapped — the
// same rule from the other direction.
//
// WHY EVERY BRANCH IS NOW THE SAME SKELETON. D-60 lets the confirmation moment DECAY into this page, and
// its safety argument is one sentence: *nothing important may live ONLY in the moment; everything it
// states is repeated on the ordinary detail page.* That is an acceptance criterion rather than a hope —
// `tests/booking/detail-completeness.test.tsx` renders this page with NO query parameter and asserts
// every fact is present. The skeleton, in order:
//
//   <div BOOKING_SHELL>
//     <section data-testid="booking-detail">
//       badge + <h1> + ONE plain sentence saying what the status MEANS   (TRUST-01's first clause)
//       <MoneyStatement/>            — only where a sentence is SPECIFIED (D-94; see the cancelled branch)
//       PanelCard: the facts <dl>    — venue, address, when + tz, host, itemised total
//       PanelCard: the reference     — TRUST-02 / D-78, on EVERY status
//       CancellationPolicyDisclosure — TRUST-03, where a policy still applies
//       <TrustBlock variant="full"/> — TRUST-04 / D-67, on EVERY status
//       <Separator/> + the actions   — at most ONE coral
//     </section>
//   </div>
//
// ⚠️ D-90 LANDS IN THE `requested` AND `approved` SENTENCES, AND IT IS A MONEY FACT, NOT A TONE CHOICE.
// Request-to-book is PAY-ON-APPROVAL, verified in this very file: the `approved` branch renders a *Pay
// now* CTA into the Phase-5 checkout, and BOTH branches carry a no-money cancel dialog whose own comment
// reads *"an approved-but-unpaid hold is still an unpaid hold"*. A booker with a pending request has not
// been charged anything, so the honest sentence is also the more reassuring one. Never ship copy telling
// a booker they were charged for an unpaid hold.
//
// ⚠️ THE LIVE REGIONS ON THE `declined` AND `cancelled` BRANCHES ARE GONE (13-UI-SPEC § Live Regions).
// *A live region announces a CHANGE. A freshly navigated page is not a change — it is a page.* Both were
// wrapped around static, server-rendered content, where a screen reader already reads from the top and
// the region announces either nothing or a duplicate. The rows in `LIVE_REGION_EXCLUSIONS` are left for
// the plan that closes that list (13-04's judgement D): this file no longer needs its exemption, but the
// list's own count assertion is not this plan's to move.
//
// THE INSTRUCTION THAT USED TO END THAT PARAGRAPH — *"A SIXTH branch must copy the container from
// `loading.tsx`"* — IS GONE, because plan 13-01 replaced it with a mechanism. The container is now
// `BOOKING_SHELL` from `@/lib/design/measurements`, imported by all five branches here, by both branches
// of `cancel/page.tsx` and `group/page.tsx`, by all three `loading.tsx` files under this segment, and by
// the three state components that used to open the nested landmarks. A sixth branch copies nothing: it
// imports the constant. An instruction is obeyed as long as the next author reads the header; a constant
// is obeyed by construction.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { CalendarCheckIcon, HourglassIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user } from "@/lib/db/schema";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { bookingReference } from "@/lib/booking/reference";
import { ALL_RAILS_REFUND_WINDOW } from "@/lib/booking/refund-window";
import { readDbNow } from "@/lib/booking/bookings-query";
// The ONE owner of a venue-local deadline string (07-02). The `requested` branch's meaning sentence
// names an instant, and a fifth date format on this page is exactly what this module exists to prevent.
import { composeDeadlineLabel } from "@/lib/booking/when-label";
import { probeCheckoutSession, readPaymentState } from "@/lib/payments/checkout-probe";
import { isApiRefundable } from "@/lib/payments/refund-rail";
import { getAvailability } from "@/lib/availability/read-model";
import { getHeadcount, getOwnedGroupByBooking } from "@/lib/group/rsvp";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import { bookedListingAddress } from "@/lib/listing-public";
import { formatMemberSince } from "@/lib/profile";
import { venueTzNote } from "@/lib/venue-time";
import { APPROVAL_SLA_HOURS, APPROVAL_PAYMENT_WINDOW_HOURS } from "@/lib/payments/config";
import { BOOKING_SHELL } from "@/lib/design/measurements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PanelCard } from "@/components/patterns/panel-card";
import { BookingReference } from "@/components/booking/booking-reference";
import { PendingPaymentState } from "@/components/booking/pending-payment-state";
import { NotCompletedState } from "@/components/booking/not-completed-state";
import { PaymentReversedState } from "@/components/booking/payment-reversed-state";
import { RequestCountdown } from "@/components/booking/request-countdown";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { CancelRequestDialog } from "@/components/booking/cancel-request-dialog";
import { CreateGroupButton } from "@/components/group/create-group-button";
import { TrustBlock } from "@/components/booking/trust-block";
import {
  ExpiredApprovalState,
  type ExpiredApprovalSlot,
} from "@/components/booking/expired-approval-state";
import { deriveDisplayStatus, declinedCopy } from "@/components/booking/booking-status";

/**
 * Is the lapsed booking's own window still bookable? Decides which D-97 variant renders (07-UI-SPEC § 10).
 *
 * A COURTESY, NEVER THE GATE (Security V4). `reRequestSameWindow` re-mints through `createPendingHold`, so
 * the booking_no_overlap EXCLUDE re-adjudicates the slot on every submit no matter what this read concluded.
 * The read exists only so a button that would certainly fail is not offered — a one-click recovery that
 * bounces is worse than no button at all.
 *
 * The three outcomes are kept distinct because the copy differs and truthfulness matters more than brevity:
 * a slot that is merely PAST or inside the listing's minimum notice must not be described as one somebody
 * else booked. Reads the venue-local day of the session start; a window that no slot covers (the host closed
 * those hours since, or the window straddles venue-local midnight) reads as `unavailable`, which is both the
 * safe answer and the honest one.
 */
async function readSlotState(
  listingId: string,
  startsAt: Date,
  endsAt: Date,
  timezone: string,
  now: Date,
): Promise<ExpiredApprovalSlot> {
  const [year, month, day] = format(startsAt, "yyyy-MM-dd", { in: tz(timezone) })
    .split("-")
    .map(Number);
  const availability = await getAvailability(db, listingId, { year, month, day }, now);
  const startMs = startsAt.getTime();
  const endMs = endsAt.getTime();
  // Half-open '[)' overlap, identical to the constraint and the read model.
  const covering = availability.slots.filter((s) => {
    const a = new Date(s.startUtc).getTime();
    const b = new Date(s.endUtc).getTime();
    return a < endMs && startMs < b;
  });
  if (covering.length === 0) return "unavailable";
  if (covering.every((s) => s.state === "available")) return "free";
  if (covering.some((s) => s.state === "unavailable")) return "taken";
  return "unavailable"; // past / too_soon / beyond_horizon — free, but not requestable
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // ?paid=1 is the checkout return UX signal ONLY — never proof of payment (D-57). Next 16 async params.
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;

  // A session is required to own a booking — no session can never be the owner (→ 404, reveal nothing).
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) notFound();

  const [bk] = await db
    .select({
      id: booking.id,
      listingId: booking.listingId,
      bookerId: booking.bookerId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status,
      quotedTotalCents: booking.quotedTotalCents,
      // D-74: the listing-priced portion. Consulted by the pre-0016 fullDay fallback below, and — since
      // 13-10 — by the facts panel's ITEMISATION, which renders it beside the service fee only on a
      // positive match against the frozen total (see `itemised`).
      spacePriceCents: booking.spacePriceCents,
      // ── Plan 13-10. TRUST-01 asks for the total ITEMISED, and this is the other half of it. Both
      // parts are nullable on pre-0016 rows, which is exactly why the render is a positive match rather
      // than a subtraction: `quoted - space` would manufacture a "service fee" out of whatever the two
      // columns happened to disagree about. Never divide or subtract a frozen total to recover a part.
      serviceFeeCents: booking.serviceFeeCents,
      // WR-06 (drizzle 0016) — the PERSISTED pricing-mode snapshot that now DRIVES the label (see below).
      fullDay: booking.fullDay,
      currency: booking.currency,
      expiresAt: booking.expiresAt,
      // ── Plan 07-12 additions, all read-only display inputs. ──
      // D-79: what actually went back to the booker. NULL on a hold that was never paid.
      refundCents: booking.refundCents,
      // Set ONLY by a party cancellation (cancel-booking.ts). NULL means the SYSTEM retired the hold, which
      // is exactly the D-97 lapse — and is what separates it from a booking someone chose to cancel.
      cancelledBy: booking.cancelledBy,
      // D-61 creation-time snapshot. Only a request-mode booking ever had an approval to lapse.
      bookingMode: booking.bookingMode,
      paymentId: booking.paymentId,
      // ── Plan 13-04 (D-84/D-87). The hosted session `confirmBooking` persisted BEFORE the booker ever
      // paid (CR-02) — which is why it survives on a row the confirm UPDATE never touched. It is the
      // ONLY handle this page has on what PayMongo knows, and the cancelled branch needs it: there is no
      // column anywhere on `booking` that separates a reversed payment from a swept unpaid hold.
      checkoutSessionId: booking.checkoutSessionId,
    })
    .from(booking)
    .where(eq(booking.id, id));

  // Owner-gate (T-04-CONFIRMIDOR, D-43) — the route group is NOT the gate. Missing OR not-mine → the same 404.
  if (!bk || bk.bookerId !== userId) notFound();

  // ⚠️ THE LISTING READ AND EVERY SHARED DERIVATION NOW SIT ABOVE THE `pending` BRANCH (13-10), and the
  // order is load-bearing rather than tidy. That branch returns one of the two component-owned payment
  // states, and D-67 puts the trust block on EVERY status — including, especially, the ones that look
  // wrong. Both states therefore need the host, the listing and the reference, and none of them existed
  // yet at the point the branch used to return from. The cost is one listing query on a path that
  // previously made none, paid on a render that already makes a third-party round trip; the benefit is
  // that there is exactly ONE place on this page where the shared facts are composed. The `RENDERABLE`
  // gate stays BELOW the branch, unchanged, because `pending` was never in it.
  const [lst] = await db
    .select({
      title: listing.title,
      primarySpaceType: listing.primarySpaceType,
      city: listing.city,
      timezone: listing.timezone,
      // The hourly rate is deliberately NOT selected any more: nothing on this page compares a frozen price
      // against a CURRENT listing rate, and that absence is the Pitfall-3 fix. Only the day rate remains,
      // for the pre-0016 positive-match fullDay fallback.
      dayRateCents: listing.dayRateCents,
      // D-109 — the group entry is an EXCLUSIVE-occupancy affordance. The enum has exactly one value in v1
      // (and the column is NOT NULL DEFAULT 'exclusive'), so today this predicate is always true; it is
      // written out anyway so the open-capacity mode Phase 9 adds cannot inherit an invite flow that was
      // designed around "one payer, one exclusive lock" without someone deciding it should.
      occupancyMode: listing.occupancyMode,
      // ── Plan 13-09 additions. Every one of them is a DISPLAY input; nothing below writes. ──
      //
      // ⚠ THE ADDRESS COLUMNS ARE NAMED HERE AND NOWHERE ELSE ON THIS PAGE, and that is a rule rather
      // than a coincidence. `bookedListingAddress()` is the ONE route to a booked listing's street
      // (D-91), so this row is handed to it WHOLE — `bookedListingAddress(lst, …)` — instead of being
      // taken apart at the call site. A grep over this file for the raw column names therefore finds
      // them only in this select, which is the acceptance criterion and also the reason the boundary
      // can be audited at all: there is no second place to look.
      addressLine1: listing.addressLine1,
      addressLine2: listing.addressLine2,
      postalCode: listing.postalCode,
      neighborhood: listing.neighborhood,
      region: listing.region,
      country: listing.country,
      location: listing.location,
      // The host's D-09 toggle. Read but never OBEYED for a confirmed/completed booking — see D-91 and
      // the boundary's own header for why that is the host's promise being kept rather than broken.
      showExactAddress: listing.showExactAddress,
      // TRUST-04 signal 3 (D-68). NULL on a listing that was never published — the trust row is then
      // ABSENT rather than blank.
      publishedAt: listing.publishedAt,
      // TRUST-04 signal 4 (D-68). THE LISTING'S CURRENT MODE, deliberately — NOT `booking.bookingMode`,
      // which is already selected above and is the booking's creation-time snapshot (D-61). The trust
      // block's sentence is a statement about how this SPACE behaves ("this host approves each
      // request"), which is a fact about the listing today; the snapshot is a fact about this booking's
      // history and is what the lapse branch reads. Two different questions, two different columns.
      listingBookingMode: listing.bookingMode,
      // TRUST-04 signal 2 (D-68/D-66) — the host's own `createdAt`, through the join below. Formatted
      // in this RSC and passed down as a finished string.
      hostCreatedAt: user.createdAt,
      // Selected here rather than in a later plan because the JOIN is the cost and it is already paid.
      // 13-10's facts panel renders the host's name; nothing in THIS plan does.
      hostFirstName: user.firstName,
    })
    .from(listing)
    // INNER join: `listing.host_id` is NOT NULL with an FK to `user` (schema.ts:175-177), so this can
    // never drop a row that the un-joined query would have returned. The `!lst` guard below is
    // therefore unchanged in meaning.
    .innerJoin(user, eq(listing.hostId, user.id))
    .where(eq(listing.id, bk.listingId));
  if (!lst) notFound();

  const timezone = lst.timezone;
  const inTz = tz(timezone);
  const title = lst.title ?? "Untitled space";
  const spaceTypeLabel = lst.primarySpaceType
    ? SPACE_TYPE_LABELS[lst.primarySpaceType as SpaceTypeValue]
    : null;

  // fullDay is the booking row's OWN persisted creation-time snapshot (booking.full_day, drizzle 0016 /
  // WR-06) — the same flag the price was frozen with. The Total shown is always the frozen all-in
  // quotedTotalCents (D-49); this only chooses "Full day" vs an hour range.
  //
  // ⚠️ THE OLD "space price is not equal to the hourly run total" DERIVATION IS GONE, AND MUST NOT COME
  // BACK (08-RESEARCH Pitfall 3), for the same reason spelled out on the reserve page: the D-108 extra-guest
  // surcharge is folded INTO spacePriceCents (A1), so an ordinary hourly booking with one extra guest no
  // longer matches the plain hourly run total, and that inequality would label it "Full day".
  //
  // ⚠️ GREP TRIPWIRE (the 07-04 payout-sweep idiom). The absence of the old derivation is checked by grepping
  // this file for the two identifiers it was written with. A grep is only a real guard if it cannot be
  // tripped by the very comment forbidding it — so neither is spelled out anywhere here, comments included.
  // If you are tempted to name them "just in prose", don't: it disarms the check for good.
  //
  // The fallback is for pre-0016 rows only (full_day IS NULL) and is a POSITIVE day-rate match rather than
  // an inequality (the re-request.ts:234 idiom), so it can only ever ADD "Full day" on an exact match —
  // nothing hourly can be mislabeled by it.
  const quoted = bk.quotedTotalCents ?? 0;
  const fullDay =
    bk.fullDay ?? (lst.dayRateCents != null && (bk.spacePriceCents ?? quoted) === lst.dayRateCents);

  const dateLabel = format(bk.startsAt, "EEEE, MMM d, yyyy", { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(bk.startsAt, "h:mm a", { in: inTz })} – ${format(bk.endsAt, "h:mm a", { in: inTz })}`;
  const tzNote = venueTzNote(lst.city, timezone);
  const totalLabel = formatMoney(quoted, bk.currency ?? DISPLAY_CURRENCY);

  // THE CLOCK — Postgres, read once, hydrated once, threaded into every derivation below (see the header).
  const now = await readDbNow(db);
  const whenLabel = `${dateLabel}, ${timeLabel}`;

  // ══ 13-09 — TRUST-04's FOUR SIGNALS, AND D-91's ADDRESS BOUNDARY ═══════════════════════════════════
  //
  // THE DISPLAY STATUS IS DERIVED ONCE, HERE, AGAINST THE SAME `now` EVERY BADGE ON THIS PAGE USES.
  // `completed` is never stored (D-102) — it is a `confirmed` row whose endsAt has passed — so feeding
  // the address boundary the raw column would make a finished session silently lose its address the
  // instant it ended. `cancelledBy` is threaded for the T8 remap (a booker-cancelled `declined` reads
  // as `cancelled`), which changes no address outcome — both are non-booked — but keeps this derivation
  // and the badge's derivation the same call with the same arguments, so they cannot drift.
  //
  // NO JS CLOCK IS READ. There is not one on this page and this plan adds none (the 07-06 boundary
  // contract); `now` came from Postgres above.
  const displayStatus = deriveDisplayStatus(bk.status, bk.endsAt, now, bk.cancelledBy);

  // THE ADDRESS, THROUGH THE ONE NAMED BOUNDARY (D-91 / TRUST-01). The whole listing row is handed over
  // rather than picked apart: the boundary owns the decision AND the composition, so this file names no
  // address column outside its select and cannot accidentally grow a second, weaker rule.
  //
  // ⚠ WHAT THIS IS AND IS NOT. On `confirmed` and derived-`completed` it yields the exact street — the
  // host-facing control already promises "an approximate area until they book", so this is that promise
  // kept. On `requested`, on an `approved` hold nobody has paid for, on `declined` and on every flavour
  // of `cancelled` (party, lapsed approval, reversed payment) it yields exactly what the PUBLIC listing
  // page yields: neighbourhood + city, no street, no postal code, coordinates coarsened. Ten renders,
  // two of them booked — asserted per render in `tests/listing/booked-address.test.ts`.
  const address = bookedListingAddress(lst, { displayStatus });

  // The two trust-block dates. ONE formatter for both, and it is the shipped one that
  // `listing/host-block.tsx:115` already renders "Host since" with — so this page and the listing page
  // can never disagree about the same host, and the product has no fifth date format (D-66).
  const hostSinceLabel = formatMemberSince(lst.hostCreatedAt);
  const listingPublishedLabel = lst.publishedAt ? formatMemberSince(lst.publishedAt) : null;

  /**
   * The trust block, identical on every branch below (D-67).
   *
   * IT RENDERS ON THE STATES THAT LOOK WRONG TOO, AND THAT IS THE REQUIREMENT RATHER THAN AN OVERSIGHT:
   * trust matters most when something has gone wrong, so binding this block to the happy path would
   * remove it precisely where a booker needs it. Built once as an element so the five branches cannot
   * drift into five slightly different trust blocks.
   *
   * The props are all finished strings by the time they arrive — the component performs no date math
   * and reads no column (see its header for D-65's reframing and why it touches neither payout flag).
   */
  const trustBlock = (
    <TrustBlock
      variant="full"
      hostSinceLabel={hostSinceLabel}
      listingPublishedLabel={listingPublishedLabel}
      bookingMode={lst.listingBookingMode}
      reference={bookingReference(bk.id)}
    />
  );

  /**
   * The address rows for the facts `<dl>`, or nothing when the row holds no address at all.
   *
   * `address.lines` is composed INSIDE the boundary, so this file renders lines rather than columns —
   * see the select's own note. An empty array renders no row, never an empty one.
   */
  const addressRow =
    address.lines.length === 0 ? null : (
      <div className="flex items-start justify-between gap-4">
        <dt className="text-muted-foreground">Where</dt>
        <dd className="text-right">
          {address.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </dd>
      </div>
    );

  // ══ 13-10 — THE PIECES EVERY BRANCH SHARES (TRUST-01, TRUST-02) ════════════════════════════════════
  //
  // Built ONCE, above the branches, for the reason the trust block above is built once: eight renders
  // that each composed their own facts panel would be eight things to keep true, and D-60's decay is
  // only safe while *everything the moment states is repeated here*. A fact that lives in one branch's
  // copy of the panel is a fact the next branch can silently lose.

  /**
   * TRUST-02 / D-78 — server-computed here and passed down as a finished string. `bookingReference`
   * is a SHA-256 over the booking id using `node:crypto`, so deriving it inside the client copy
   * control would drag a Node builtin into the browser bundle. It is also a one-way, non-enumerable
   * LABEL and not the access token: the opaque UUID in the URL is the credential, and it stays gated.
   */
  const reference = bookingReference(bk.id);

  /**
   * THE ITEMISATION, ON A POSITIVE MATCH ONLY.
   *
   * TRUST-01 asks for the total ITEMISED. The two parts are rendered beside the frozen quote only when
   * they are both present AND actually sum to it — the `re-request.ts:234` / D-86 idiom. The rejected
   * alternative is subtraction (`quoted - space`), which cannot fail: on a pre-0016 row where the two
   * columns disagree it would print a confident "Service fee" figure nobody was ever charged, on the
   * one page a booker checks against their bank app. When the match fails the panel shows the frozen
   * total alone, which is always true.
   *
   * `quoted` is the server-FROZEN all-in quote (D-49) and stays the amount on the Total row either way.
   */
  const currency = bk.currency ?? DISPLAY_CURRENCY;
  const itemised =
    bk.spacePriceCents != null &&
    bk.serviceFeeCents != null &&
    bk.spacePriceCents + bk.serviceFeeCents === quoted
      ? {
          space: formatMoney(bk.spacePriceCents, currency),
          fee: formatMoney(bk.serviceFeeCents, currency),
        }
      : null;

  /**
   * The facts `<dl>` in its panel — venue, address, when + the named timezone, host, itemised total.
   *
   * @param totalTerm the `<dt>` for the money row, and the ONE thing that differs between branches.
   *   It is a parameter rather than a second panel because the difference is one word, and it is a
   *   difference at all for D-90's reason: *"Total"* over a hold nobody ever paid is a money statement
   *   FitOut cannot stand behind. `requested` keeps its shipped *"You'll pay if approved"*; the two
   *   never-charged endings (a decline, a swept hold) read *"Quoted total"*; everything a booker
   *   actually paid for keeps the shipped *"Total"*.
   */
  const factsPanel = (totalTerm: string) => (
    <PanelCard>
      <dl className="space-y-3 text-body">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">Space</dt>
          <dd className="text-right font-medium">
            {title}
            {spaceTypeLabel && (
              <span className="block font-normal text-muted-foreground">{spaceTypeLabel}</span>
            )}
          </dd>
        </div>
        {addressRow}
        <div className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">When</dt>
          <dd className="text-right">
            <span>{dateLabel}</span>
            <span className="block tabular-nums text-muted-foreground">{timeLabel}</span>
          </dd>
        </div>
        {/* THE HOST. A first name only — it is what the listing page shows and what a booker arriving
            at a venue actually needs. No surname, no contact detail: this panel is a fact sheet, not a
            directory, and the host's own contact path is the message thread, not this page. */}
        <div className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">Host</dt>
          <dd className="text-right font-medium">{lst.hostFirstName ?? "Your host"}</dd>
        </div>
        {itemised && (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Space cost</dt>
              <dd className="text-right tabular-nums">{itemised.space}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Service fee</dt>
              <dd className="text-right tabular-nums">{itemised.fee}</dd>
            </div>
          </>
        )}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{totalTerm}</dt>
          <dd className="text-right text-heading font-semibold tabular-nums">{totalLabel}</dd>
        </div>
      </dl>
      {/* THE NAMED TIMEZONE, beside the time it qualifies rather than adrift at the bottom of the page.
          `venueTzNote` is the one owner of this sentence — no surface composes its own. */}
      <p className="mt-3 text-label text-muted-foreground">{tzNote}</p>
    </PanelCard>
  );

  /**
   * TRUST-02 / D-78 — the reference in its own panel, on EVERY status branch.
   *
   * Its own panel rather than a row inside the facts `<dl>`: it is the string a booker reads back to a
   * person, and the copy control beside it is an interactive element, which a definition-list row is
   * the wrong container for. `BookingReference` owns the mono/tabular treatment and the clipboard
   * behaviour; nothing here restates either.
   */
  const referencePanel = (
    <PanelCard>
      <div className="space-y-1">
        <p className="text-label text-muted-foreground">Booking reference</p>
        <BookingReference reference={reference} />
      </div>
    </PanelCard>
  );

  // Truthfulness (D-57): never render "Booking confirmed" until the DB says 'confirmed'. On return from the
  // hosted checkout the webhook — NOT this ?paid=1 signal — is the confirm authority. Branch on the DB state:
  if (bk.status === "pending") {
    // Returned from checkout (?paid=1) → the neutral "finalizing…" interstitial that self-resolves once the
    // webhook confirms (it only ever refreshes; it never fabricates the confirmed state client-side).
    // 13-07: the two props D-71's promise needs, both server-supplied. The reference is the string a
    // person would ask the booker to quote; the address is the one the promise is about, and it is the
    // booker's OWN session address, never masked (D-63).
    if (paid === "1")
      return (
        <PendingPaymentState
          reference={reference}
          email={session?.user?.email ?? null}
          trustBlock={trustBlock}
        />
      );
    // ══ 13-07 — D-70's THIRD PAYMENT STATE, AND THE BOUNDARY THAT KEEPS IT OFF SOMEBODY ELSE'S ══════
    //
    // A `pending` row with no checkout-return parameter used to redirect UNCONDITIONALLY. That is the
    // right answer for a hold that is over and the wrong one for a hold that is still alive: the
    // booker's checkout did not finish, no money moved, the slot is still theirs for a few more
    // minutes, and the app's only response was to bounce them back to the checkout page with no
    // explanation of what happened to the payment they thought they had made. STATE-05 names three
    // payment states and this is the one nothing rendered for.
    //
    // THE DISCRIMINATOR IS THE ROW FIRST, THEN THE PROVIDER — the ordering plan 13-04 established on
    // the cancelled branch, for the same two reasons. The hold's own `expires_at` against the DB clock
    // is free and decides most visits; the probe is a third-party round trip on a render path and only
    // the surviving case pays for it.
    //
    // ⚠️ THE HOLD CHECK IS NOT AN OPTIMISATION, IT IS D-70's HARD BOUNDARY. If the hold has lapsed this
    // is NOT the not-completed state: `hold-expired-state.tsx` already owns that landing, and the
    // reserve page this redirect lands on renders it DIRECTLY for a hold that is dead on arrival
    // (`listings/[id]/book/page.tsx:129`). Rendering our own expiry copy here would be a second surface
    // to keep true about one fact, which is exactly what D-70 forbids.
    //
    // ⚠️ AND THE DIRECTION OF THE FALLBACK IS CHOSEN. A probe that learns nothing — no key configured,
    // a network fault, a non-2xx, the 3s deadline — lands on the redirect, never on the new state.
    // Showing *"you have not been charged"* while a payment is quietly settling is a false money
    // statement, which is the failure this whole phase exists to remove; being bounced to a checkout
    // page you can simply leave is a navigation. When the two costs are that lopsided the direction is
    // not a judgement call. `readPaymentState` is the ONE owner of the (booking status, session status)
    // pairs — reused rather than restated, so this surface and the reversed one cannot drift apart
    // about what `active` means.
    //
    // NO CONSUMER OF THE CHECKOUT-RETURN PARAMETER IS MOUNTED HERE OR ANYWHERE ABOVE THIS BRANCH
    // (D-89). The poller re-renders this RSC for the CURRENT url every 2.5s, so a parameter stripped
    // from the address bar mid-settlement would drop the next poll into whichever branch the
    // no-parameter path leads to — which, as of this plan, is a probe and possibly a redirect, in the
    // middle of a webhook. Plan 13-11 owns that consumer and mounts it on the CONFIRMED branch only.
    // THE PAGE'S OWN `now`, and it is one Postgres read fewer than this branch used to make. 13-07 read
    // the clock a second time here because the branch returned before the page's own read; 13-10 moved
    // the shared derivations above it, so there is one hydrated `now` on this page again and the hold
    // comparison and the status derivations agree by construction rather than by two round trips
    // landing close together. There is still no JS clock read anywhere (the 07-06 boundary contract).
    const holdExpiresAt = bk.expiresAt;
    if (holdExpiresAt !== null && holdExpiresAt.getTime() > now.getTime()) {
      const checkout = await probeCheckoutSession(bk.checkoutSessionId);
      if (readPaymentState(bk.status, checkout) === "not-completed") {
        return (
          <NotCompletedState
            bookingId={bk.id}
            listingId={bk.listingId}
            reference={reference}
            holdExpiresAt={holdExpiresAt.toISOString()}
            trustBlock={trustBlock}
          />
        );
      }
    }
    // Abandoned pending hold (no ?paid) → back to the reserve page to finish checkout (Phase-4 behavior).
    redirect(`/listings/${bk.listingId}/book?hold=${bk.id}`);
  }
  // D-58's reversal landing USED TO SIT HERE, gated on the cancelled status AND an equality test against
  // the checkout-return parameter. It has moved down into the `cancelled` branch and is now reached from
  // DB state plus the D-84 probe (D-87). The gate is gone rather than relaxed: that parameter is
  // forgeable and is a UX signal only (D-57), so a state reachable ONLY through it would vanish the
  // moment the confirmation moment consumes it. See the branch itself for the discriminator and for what
  // a probe that learned nothing does.
  //
  // ⚠️ THE OLD CONDITION IS DESCRIBED ABOVE RATHER THAN QUOTED, deliberately: this plan's acceptance
  // criterion is that a raw grep for that equality test over this file returns exactly ONE — the pending
  // branch's remaining use, which plan 13-05 owns. Quoting the removed gate in a comment would make the
  // criterion read 2 against a correct file. Fourth instance of this collision in Phase 13; see
  // `booking-row.tsx:112` for the precedent.
  //
  // The states we render a booking-detail card for. 07-12 ADDS `cancelled`: a cancelled booking is durable
  // history the booker is entitled to see (a refund figure, or the D-97 recovery), and 404ing it was the
  // reason confirming a cancellation used to land on a dead page. `completed` is NOT here and must not be —
  // it is DERIVED at read time from a `confirmed` row whose endsAt has passed (D-102) and is never stored, so
  // a row carrying the unused enum value is a data fault, not a state to render.
  const RENDERABLE = ["requested", "approved", "declined", "confirmed", "cancelled"];
  if (!RENDERABLE.includes(bk.status)) notFound();


  // ── requested (BOOK-06, D-66): "Request sent — awaiting host". Calm, NO pay CTA, nothing charged. ──
  if (bk.status === "requested") {
    // THE DEADLINE, FROM THE ROW'S OWN `expires_at` AND NOT FROM THE CONFIG CONSTANT. A short-notice
    // request has its SLA capped, so a label composed from `APPROVAL_SLA_HOURS` would be wrong on
    // exactly the bookings where the deadline matters most (`when-label.ts`'s own note). The constant
    // is the fallback for a row that carries no deadline at all — and the fallback says "within N
    // hours" rather than naming an instant we do not have.
    const respondBy = bk.expiresAt
      ? `before ${composeDeadlineLabel(bk.expiresAt, timezone, lst.city)}`
      : `within ${APPROVAL_SLA_HOURS} hours`;
    return (
      <div className={BOOKING_SHELL}>
        <section data-testid="booking-detail" className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Neutral secondary badge — a calm, expected state; NEVER red, NEVER --success (icon + text). */}
            <Badge variant="secondary" className="gap-1.5">
              <HourglassIcon className="size-4" aria-hidden="true" />
              Awaiting host
            </Badge>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
              Request sent
            </h1>
            {/* TRUST-01's first clause — what the status MEANS, not only what it is. 13-UI-SPEC's
                status table, and its second half is D-90: request-to-book is pay-on-approval, so the
                honest fact is that nothing has been charged at all. See this file's header for where
                that is verified in code. */}
            <p className="mx-auto max-w-prose text-body text-muted-foreground">
              The host has this request. You&apos;ll hear back {respondBy} — nothing is charged until
              they approve.
            </p>
          </div>

          {/* The money row reads "You'll pay if approved", NOT "Total" — nothing is charged at request
              time (D-63 / D-90), and a row labelled Total on an unpaid hold is the false money
              statement this phase exists to remove. */}
          {factsPanel("You'll pay if approved")}
          {referencePanel}

          {/* TRUST-04 on this branch too (D-67) — trust matters most when something looks
              wrong, so the block is not bound to the happy path. Identical element on all
              five inline branches; see its construction above. */}
          {trustBlock}

          <Separator />

          {/* (b) The unpaid-hold cancel — a plain confirm dialog ("Cancel this request?") carrying NO
              breakdown and NO money UI, because no money moved (D-63). Below the primary content, like
              every other cancel entry on this page. */}
          <CancelRequestDialog bookingId={bk.id} />
        </section>
      </div>
    );
  }

  // ── approved (BOOK-06, D-66): "Your request was approved — pay now". The ONE coral CTA + payment-window countdown. ──
  if (bk.status === "approved") {
    return (
      <div className={BOOKING_SHELL}>
        <section data-testid="booking-detail" className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Neutral OUTLINE badge — approved is positive but NOT terminal; --success stays reserved for confirmed. */}
            <Badge variant="outline" className="gap-1.5">
              <CalendarCheckIcon className="size-4" aria-hidden="true" />
              Approved
            </Badge>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
              Your request was approved
            </h1>
            {/* TRUST-01 / 13-UI-SPEC's status table. It says what to do next and by when, and it says
                NOTHING about a charge — D-90: this is still an unpaid hold, and the cancel dialog
                below says so in its own words. The amount is one panel down, on a row labelled Total,
                where it belongs. */}
            <p className="mx-auto max-w-prose text-body text-muted-foreground">
              The host said yes. Pay within {APPROVAL_PAYMENT_WINDOW_HOURS} hours to lock in this time.
            </p>
            {/* Payment-window countdown (display cue only; the DB now() vs expires_at is the sole authority). */}
            {bk.expiresAt && (
              <RequestCountdown
                expiresAt={bk.expiresAt.toISOString()}
                label="Pay within"
                expiredLabel="Payment window closed"
              />
            )}
          </div>

          {factsPanel("Total")}
          {referencePanel}

          {/* TRUST-04 on this branch too (D-67) — trust matters most when something looks
              wrong, so the block is not bound to the happy path. Identical element on all
              five inline branches; see its construction above. */}
          {trustBlock}

          <Separator />

          {/* The ONE coral CTA introduced this phase — pay-on-approval → the SAME Phase-5 reserve/checkout page. */}
          <Button asChild variant="brand" className="w-full">
            <Link href={`/listings/${bk.listingId}/book?hold=${bk.id}`}>Pay now</Link>
          </Button>

          {/* (b) The same no-money cancel dialog as the `requested` branch — an approved-but-unpaid hold is
              still an unpaid hold. Beneath the pay CTA so the primary action stays primary. */}
          <CancelRequestDialog bookingId={bk.id} />
        </section>
      </div>
    );
  }

  // ── declined — ONE enum value, two truthfully-different endings (T8 · 07-18). A booker who cancelled their
  //    own unpaid `requested` hold is stored `declined` + cancelled_by='booker' (cancelUnpaidHold); a genuine
  //    host decline / SLA lapse leaves cancelled_by NULL (or 'host'/'system'). `declinedCopy(bk.cancelledBy)`
  //    IS the selection — the booker-vs-host conditional is NOT re-implemented inline here — and the badge is
  //    threaded the same `cancelledBy` so it agrees with the lists (booker-cancel → "Cancelled", host-decline
  //    → "Declined"). The copy is parameter-free, so the venue/time renders on a SEPARATE sibling line, the
  //    same two-line layout the `cancelled` branch uses. Muted — NEVER red (mirrors HoldExpiredState). ──
  if (bk.status === "declined") {
    const copy = declinedCopy(bk.cancelledBy);
    return (
      <div className={BOOKING_SHELL}>
        {/* NO LIVE REGION. This is a fresh, server-rendered page and a screen reader already reads it
            from the top — see this file's header for the rule and 13-UI-SPEC § Live Regions for the
            table it comes from. */}
        <section data-testid="booking-detail" className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <BookingStatusBadge
              status="declined"
              endsAt={bk.endsAt}
              now={now}
              side="booker"
              cancelledBy={bk.cancelledBy}
            />
            <h1 className="text-xl leading-tight font-semibold">{copy.heading}</h1>
            {/* TRUST-01's meaning sentence IS `declinedCopy`'s body, UNCHANGED — 13-UI-SPEC's status
                table says so in those words. That single call is also the booker-vs-host selection
                (T8); the conditional is never re-implemented here. The venue and the time are no
                longer a sibling line: they are rows in the facts panel below, which is where every
                other status now carries them. */}
            <p className="mx-auto max-w-prose text-body text-muted-foreground">{copy.body}</p>
          </div>

          {/* "Quoted total", not "Total": a declined request was never paid — the sentence above says
              so in `declinedCopy`'s own words — and a row labelled Total on a hold nobody charged is
              the same false money statement D-90 removes from the `requested` branch. */}
          {factsPanel("Quoted total")}
          {referencePanel}

          {/* TRUST-04 on a decline (D-67). */}
          {trustBlock}

          <Separator />

          {/* Coral recovery forward-action (reuses the confirmation forward-action slot). */}
          <Button asChild variant="brand" className="w-full">
            <Link href="/">Find another space</Link>
          </Button>
        </section>
      </div>
    );
  }

  // ── cancelled (07-12) — three genuinely different events sharing one enum value (D-79, D-87). ─────────
  if (bk.status === "cancelled") {
    // ══ (f) 13-04 — THE D-58 REVERSAL, REACHED WITHOUT A QUERY STRING (D-84 / D-87) ══════════════════
    //
    // WHY IT IS DECIDED HERE AND NOT FROM A COLUMN. 13-RESEARCH looked for a row-level signal separating
    // a reversed payment from a swept unpaid hold and found none: the confirm UPDATE is the only writer
    // of `payment_id`/`payment_method` and a reversal is BY DEFINITION the branch where that UPDATE
    // matched zero rows, while `refund_cents` belongs to the booker-cancellation path and nobody
    // cancelled this. Both shapes are therefore `cancelled` + `cancelled_by IS NULL` + `payment_id IS
    // NULL`. The provider is the only party that knows which one this is, hence the probe.
    //
    // TWO ROW-LEVEL PRECONDITIONS BEFORE THE PROBE, and neither is an optimisation:
    //   - `cancelledBy === null` — a PARTY cancellation was a decision, and its session was genuinely
    //     PAID, so a probe-first ordering would report `reversed` for every booker-cancelled booking on
    //     the site and tell them their confirmed-then-cancelled booking "couldn't be completed". That is
    //     the one reading of the D-84 discriminator that must never happen.
    //   - `checkoutSessionId !== null` — a booking that never reached checkout cannot have had a payment
    //     reversed. It is also what keeps the D-97 lapse branch below intact: an approval that ran out
    //     before the booker paid has no session id at all.
    // They also mean the common cancelled render — a party cancellation — pays no round trip whatsoever.
    //
    // WHAT EACH ANSWER MEANS. Session `paid` ⇒ money moved on a booking that ended cancelled, which is a
    // reversal. Session `expired` (or anything else the provider says) ⇒ NOT this state; fall through to
    // the branches below unchanged. A probe that learned NOTHING — no key, a network error, a non-2xx,
    // the 3s deadline — falls back to the row signature above, and lands on the by-hand branch.
    //
    // ⚠️ THE DIRECTION OF THAT FALLBACK IS CHOSEN, NOT INHERITED. Guessing the automatic branch would
    // tell a booker their money had been sent back when nobody sent it back — the same class of false
    // money statement D-69 exists to remove, pointing the other way. Failing to the by-hand branch says
    // only that a person is involved, which is true on every path where we are unsure. It is also the
    // direction `isApiRefundable` itself fails, and `branch` below is literally that predicate.
    //
    // ⚠️ RESIDUAL, RECORDED RATHER THAN HIDDEN (for 13-15). When the probe learns nothing, the row
    // signature alone cannot exclude an ABANDONED hold that a later booker's stale-hold sweep flipped to
    // `cancelled` (`availability/units.ts:487` and `:922`) — that row also has no `cancelled_by`, no
    // `payment_id` and a real session id. Such a booker would read a charge that never happened. It
    // needs a provider outage AND an abandoned checkout AND a revisit to coincide; with the probe up,
    // the session reads `active`/`expired` and the row correctly falls through. Noted here because the
    // honest fix is a persisted signal, which D-80 puts out of scope for this phase.
    const systemRetired = bk.cancelledBy === null && bk.paymentId === null;
    const reachedCheckout = systemRetired && bk.checkoutSessionId !== null;
    const session = reachedCheckout ? await probeCheckoutSession(bk.checkoutSessionId) : null;
    // `readPaymentState` is the ONE owner of the four (booking status, session status) pairs — reused,
    // never restated here, so this surface and the receipt cannot drift apart about what `paid` means.
    const isReversal =
      readPaymentState(bk.status, session) === "reversed" || (reachedCheckout && session === null);

    if (isReversal) {
      // The rail PayMongo says the session was paid on, or null when the probe fell back. The component
      // takes the TOKEN, not a display name: it is what selects the verified window sentence.
      const rail = session?.sourceType ?? null;
      return (
        <PaymentReversedState
          listingId={bk.listingId}
          reference={reference}
          // The server-frozen quote (D-49), formatted HERE — the component receives a finished string and
          // performs no money arithmetic (D-130 / GATE-05). `refundCents` is deliberately not consulted:
          // it is NULL on this path, and the return is full by design, so charged and returned are the
          // same figure.
          amountLabel={formatMoney(bk.quotedTotalCents ?? 0, bk.currency ?? DISPLAY_CURRENCY)}
          branch={isApiRefundable(rail) ? "auto" : "manual"}
          rail={rail}
          trustBlock={trustBlock}
        />
      );
    }

    // (c) THE D-97 LAPSE. Three conditions, each excluding something this branch must NOT swallow:
    //   - `cancelledBy === null`   — a PARTY cancellation was a decision, not a lapse. Keeps every
    //                                booker-cancelled and host-cancelled booking (and its refund) out.
    //   - `bookingMode === request`— only a request-mode booking ever had an approval to lapse.
    //   - `paymentId === null`     — money never moved, so "you weren't charged anything" is TRUE.
    // These are the same conditions `reRequestSameWindow` re-checks server-side; this branch only decides
    // what to render.
    //
    // THE KNOWN EDGE THAT USED TO BE STATED HERE IS CLOSED. It read: the D-58 backstop also lands a
    // booking here with no `cancelled_by` and no payment id, its landing fired only on `?paid=1`, so a
    // later revisit on a request-mode booking would read as a lapse. That is exactly what (f) above now
    // adjudicates, before this predicate is evaluated and without reading the query string at all.
    const lapsedApproval =
      bk.cancelledBy === null && bk.bookingMode === "request" && bk.paymentId === null;

    if (lapsedApproval) {
      const slot = await readSlotState(bk.listingId, bk.startsAt, bk.endsAt, timezone, now);
      return (
        <ExpiredApprovalState
          bookingId={bk.id}
          listingId={bk.listingId}
          whenLabel={whenLabel}
          // Usually null: both retirement paths CLEAR expires_at when they flip the hold terminal, so the
          // instant the window closed is not retained. The component carries a deadline-free copy variant
          // rather than inventing a deadline we do not have — see its prop doc.
          deadlineLabel={
            bk.expiresAt
              ? `${format(bk.expiresAt, "EEE, MMM d, h:mm a", { in: inTz })}${lst.city ? ` (${lst.city} time)` : ""}`
              : null
          }
          tzNote={tzNote}
          slot={slot}
          reference={reference}
          trustBlock={trustBlock}
        />
      );
    }

    // (d) The generic cancelled landing. CALM — muted badge, never an alarm colour, never --success.
    //
    // D-79: the badge label is ALWAYS and ONLY `Cancelled`. The refund renders as a SIBLING line beneath it,
    // never interpolated into the badge — a variable money string inside a fixed-vocabulary element breaks
    // the badge grammar everywhere it is shared with a table column.
    //
    // ⚠️ D-57 — WHY A NON-ZERO REFUND ALWAYS READS "on its way" AND NEVER "refunded". The cancel action's
    // PayMongo POST records INTENT only; refund status is asynchronous and the payment.refunded webhook is
    // the single writer of terminal state. That webhook writes settlement to `host_payout_ledger.state`, and
    // a pre-session cancellation has no ledger row (the payout sweep runs at endsAt + PAYOUT_DELAY_HOURS and
    // skips cancelled) — so there is NO settled-refund signal on a booking row to read. Claiming "Refunded"
    // would therefore be claiming it off the POST, which is exactly what D-57 forbids. The settled variant
    // is deliberately not rendered; if a settlement signal is ever persisted, this is where it lands.
    const refundCents = bk.refundCents;
    const refundLine =
      refundCents == null
        ? null
        : refundCents > 0
          ? `${formatMoney(refundCents, bk.currency ?? DISPLAY_CURRENCY)} refund on its way`
          : "No refund — cancelled inside the no-refund window";

    return (
      <div className={BOOKING_SHELL}>
        {/* NO LIVE REGION — see the declined branch and this file's header. */}
        <section data-testid="booking-detail" className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <BookingStatusBadge status="cancelled" endsAt={bk.endsAt} now={now} side="booker" />
            <h1 className="text-xl leading-tight font-semibold">This booking was cancelled</h1>
            {/* TRUST-01 / 13-UI-SPEC's status table, verbatim. The venue and the time moved into the
                facts panel below, where every status now carries them. */}
            <p className="mx-auto max-w-prose text-body text-muted-foreground">
              This booking was cancelled. It&apos;s no longer held.
            </p>
          </div>

          {/* D-79's refund line. ⚠ INTERIM SHAPE — plan 13-10 Task 2 moves both lines into
              `MoneyStatement`, STATE-06's single owner for every "where is your money" sentence on
              `/bookings/**` (D-73 / D-94). The wording is D-79's and does not change with the move.
              Never a bare "₱0 refunded": the zero case always carries its reason. */}
          {refundLine && (
            <div className="space-y-1">
              <p className="text-body font-semibold tabular-nums text-foreground">{refundLine}</p>
              {refundCents != null && refundCents > 0 && (
                // D-83 — THE WINDOW IS READ, NEVER TYPED. The sentence that shipped here paired a vague
                // plural of "day" with a promise about the original payment method and had no source at
                // all; the three windows FitOut is willing to state come from PayMongo's published
                // per-rail table and live in ONE module. The rail-free sentence is the right one for this
                // branch: it names every rail a booker could have used rather than claiming to know which,
                // and this page holds no probed rail — a party cancellation is not a reversal and buys no
                // round trip here. (`cancel/page.tsx` and `lib/email.ts` carry the same superseded string;
                // plan 13-12 owns those two.)
                <p className="text-label text-muted-foreground">{ALL_RAILS_REFUND_WINDOW}</p>
              )}
            </div>
          )}

          {/* "Total" only where money actually moved. A cancelled row can be a party cancellation of a
              booking that was paid (a refund figure, or a payment id) or a hold that was swept without
              anybody ever paying — and printing "Total" over the second is the D-90 failure one status
              along. */}
          {factsPanel(refundCents != null || bk.paymentId !== null ? "Total" : "Quoted total")}
          {referencePanel}

          {/* TRUST-04 on a cancellation (D-67). */}
          {trustBlock}

          <Separator />

          <Button asChild variant="brand" className="w-full">
            <Link href="/">Find another space</Link>
          </Button>
        </section>
      </div>
    );
  }

  // ── confirmed, and the DERIVED `completed` (D-102) — the one terminal --success surface, and its inert
  //    afterlife. `completed` is never stored: `deriveDisplayStatus` reads it off a `confirmed` row whose
  //    endsAt has passed, against the DB clock, exactly as the /bookings list's SQL derives it. Nothing here
  //    writes, so it cannot drift and cannot race the occupancy predicate. ──
  // `reference` is the one derived above the branches (13-10) — it is on every status now, so it is
  // computed once rather than per branch.
  const isCompleted = deriveDisplayStatus("confirmed", bk.endsAt, now) === "completed";
  // (a) The cancel entry appears ONLY while the session is still ahead — the same D-94 rule the action and
  //     the review page enforce, so all three agree about when cancellation is possible. A finished session
  //     has nothing to cancel, which is also why the completed branch carries no entry.
  //
  // (e) 08-07 — the D-119 GROUP ENTRY turns on the SAME predicate, so the two entries are named ONCE rather
  //     than restated. Both mean "there is still a session to act on": you cannot cancel a session that has
  //     started, and you cannot usefully invite people to one either.
  const sessionAhead = !isCompleted && bk.startsAt.getTime() > now.getTime();

  // ── (e) THE D-119 GROUP ENTRY POINT (08-UI-SPEC §1). ────────────────────────────────────────────────────
  // THREE conditions, and the branch is exhaustive about them because every OTHER status renders above:
  //   - `status === 'confirmed'` — a group is a coordination layer on a booking that is PAID and real
  //     (D-119). pending / requested / approved / declined / cancelled all return before this line, so this
  //     re-states the invariant rather than discovering it; it is written out so the guard survives anyone
  //     later adding a status to this branch.
  //   - `sessionAhead`          — see above. A finished or in-progress session has no one left to invite.
  //   - `occupancyMode`         — D-109; see the select above.
  // ALL THREE ARE COURTESIES. `createGroup` re-checks ownership, confirmation AND the listing's occupancy
  // mode server-side before it writes anything — the mode in BOTH its pre-read gate and the INSERT's own
  // WHERE — so a hand-crafted POST that skipped this UI gains nothing (Security V4). Until CR-05 this
  // sentence named only the first two, and the mode was the one condition NO server check enforced: a
  // direct POST on a drop-in pass minted the listing's daily admissions cap as RSVP seats.
  //
  // The reads are owner-scoped IN their own WHERE (`organizerId` is an argument to both, 08-06) — this page
  // never filters a group in JS after reading it, because a foreign roster must be UNREADABLE, not merely
  // unrendered.
  const groupEligible =
    bk.status === "confirmed" && sessionAhead && lst.occupancyMode === "exclusive";
  const group = groupEligible
    ? await getOwnedGroupByBooking(db, { bookingId: bk.id, organizerId: userId })
    : null;
  // `{N} coming` is the CONFIRMED-yes count, server-computed — the same figure the management surface makes
  // its focal point, so the two can never disagree about how many people are coming.
  const groupHeadcount = group
    ? await getHeadcount(db, { groupId: group.groupId, organizerId: userId })
    : null;

  return (
    <div className={BOOKING_SHELL}>
      <section data-testid="booking-detail" className="space-y-6">
        {/* Focal point: reassurance first — the badge (icon + text, never color-only) + the heading. The
            badge derivation is the SHARED one, so `Confirmed` here and `Completed` once the session ends
            read identically to the same booking on /bookings and /host/bookings. Completed is muted, NOT
            green: it is inert history, not a live success.

            ⚠️ THE REFERENCE NO LONGER SITS IN THIS BLOCK. It shipped here as a hand-rolled label +
            display-sized string, which is a fourth rendering of a fact TRUST-02 gives one owner — and
            13-08 recorded that this page was still hand-rolling it. It is now `referencePanel` below,
            the same panel every other status renders, with the copy control that surface needs. */}
        <div className="flex flex-col items-center gap-3 text-center">
          <BookingStatusBadge status="confirmed" endsAt={bk.endsAt} now={now} side="booker" />
          <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
            {isCompleted ? "This session is done" : "Booking confirmed"}
          </h1>
          {/* TRUST-01 / 13-UI-SPEC's status table — the two verbatim sentences for the one status that
              is two statuses. `completed` is DERIVED (D-102) against the DB clock, never stored. */}
          <p className="mx-auto max-w-prose text-body text-muted-foreground">
            {isCompleted
              ? "This session is finished. This page stays as your record."
              : "This time is yours. Show this page (or your email) when you arrive."}
          </p>
        </div>

        {/* ⚠️ D-94 — NO `MoneyStatement` ON THIS BRANCH, AND THE ABSENCE IS THE DECISION.
            13-UI-SPEC § Copywriting Contract specifies a money sentence for FOUR statuses (pending, not
            completed, reversed, cancelled) and for no others. A confirmed booking's money facts travel
            through the status-meaning sentence above and the itemised-total panel below, which already
            own them — and writing a fifth sentence here would be an un-reviewed claim about somebody's
            money on the one surface where being wrong is expensive. If a fifth status ever appears to
            need one, that is a question to raise, not a sentence to write. */}
        {factsPanel("Total")}
        {referencePanel}

        {/* TRUST-04 (D-67). The same element the four other branches render. */}
        {trustBlock}

        <Separator />

        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            {isCompleted
              ? "This page is your record of the session — it stays here if you come back later."
              : "This page is your confirmation — it stays here if you refresh or come back later."}
          </p>

          {/* (e) THE GROUP ENTRY (D-119 / 08-UI-SPEC §1) — the differentiator's front door, and the ONE
              coral on this surface. Two mutually-exclusive shapes:
                - not yet a group → the coral `Invite people` + its helper line. This is the phase's
                  headline action, so it takes the accent slot (08-UI-SPEC §Color accent #1).
                - already a group → a NEUTRAL outline `Manage group · {N} coming` link. Once the group
                  exists, management is a calm return trip, not a headline action; making it coral would
                  keep shouting at an organizer who has already done the thing. */}
          {groupEligible &&
            (group ? (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/bookings/${bk.id}/group`}>
                  Manage group · {groupHeadcount?.confirmed ?? 0} coming
                </Link>
              </Button>
            ) : (
              <div className="space-y-2">
                <CreateGroupButton bookingId={bk.id} />
                <p className="text-body text-muted-foreground">
                  Invite friends to this booking and track who&apos;s coming.
                </p>
              </div>
            ))}

          {/* ⚠️ DEMOTED FROM CORAL TO `ghost` (08-UI-SPEC §1 / Open Q3). This was the confirmed branch's
              one coral forward action; `Invite people` now holds that slot, and one-primary-per-surface
              forbids two. The demotion is UNCONDITIONAL on this branch rather than tied to whether the
              group entry rendered: a completed session's "find another space" is a calm afterthought, not
              a call to action, and a rule that flipped a shipped button's weight depending on a date is a
              rule nobody can hold in their head. The `declined` and `cancelled` branches keep their coral
              — there, finding another space genuinely IS the one thing left to do. */}
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Find another space</Link>
          </Button>
        </div>

        {/* (a) THE CANCEL ENTRY POINT (D-104). Below the primary content and behind its own Separator —
            present but not competing, and NEVER on a list row. A LINK, not an action: it routes to the
            /bookings/[id]/cancel review so the D-78 itemised breakdown (and the exact refund SC#2
            promises) is always seen before an irreversible money action. Neutral outline — not coral,
            which would advertise the action FitOut least wants taken, and not an alarm colour, which
            would misrepresent a refund the booker is contractually entitled to. */}
        {sessionAhead && (
          <>
            <Separator />
            <Button asChild variant="outline" className="w-full">
              <Link href={`/bookings/${bk.id}/cancel`}>Cancel booking</Link>
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
