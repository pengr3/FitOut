// TRUST-05 / D-74 — THE BOOKING RECEIPT. The phase's ONE net-new route, and the only surface in the
// product designed for a screen AND for paper.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A ROUTE AND NOT A PRINT STYLESHEET ON THE DETAIL PAGE (D-74)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The browser's own print dialog IS the PDF pipeline: "Save as PDF" and nothing else. No PDF library, no
// headless render service, no font pipeline — a proposed install on this route is a scope alarm, not a
// dependency. A print stylesheet bolted onto the 1,300-line detail page was rejected for two reasons that
// have not changed: that page's cancel entry, group entry, trust block and status chrome would all need
// suppressing one by one, and there would be no link to hand anybody. Phase 15's confirmation email needs
// something to link TO, which is why this is a real URL.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// IT IS AN INFORMAL RECORD AND IT SAYS SO IN BOTH MEDIA (D-75)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Philippine official receipts carry real legal requirements — registration, serial numbering, retention —
// and whether FitOut issues them is a business decision the PM and their accountant have not made. So this
// document must never IMPLY it. The disclosure sentence below therefore renders on screen and on paper,
// under the `<h1>`, and is deliberately NOT a `print:`-only line: a booker reading the screen is the person
// most likely to assume the wrong thing about what they are looking at.
//
// ⚠ SIX TOKENS ARE BANNED FROM THIS FILE, AND THEY ARE NAMED NOWHERE IN IT — not in the copy, not in a
// comment. They are the capitalised two-word title, its abbreviated form with a number, the two
// three-letter agency/tax initialisms, the taxpayer-identification field, and a serial-number field.
// `tests/design/receipt-formality.test.ts` scans this source for all six in the two-piece idiom, so a
// comment that spelled one out "just to explain the rule" would make the scan match its own prohibition
// and the guard would be dead for good. This is `price-breakdown.tsx`'s GREP TRIPWIRE discipline, and it is
// the reason the paragraph above is descriptive rather than enumerated.
//
// The disclosure sentence itself contains the lower-case form of the banned title, because denying
// something requires naming it. That is why the scan is CASE-SENSITIVE: the lower-case form is the
// sentence that keeps the promise, and banning it would be a rule no working receipt could satisfy.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE OWNER GATE IS REPEATED VERBATIM, AND THE ROUTE GROUP IS NOT THE GATE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// T-13-12-RECEIPTIDOR. This page renders a person's name, a full street address and paid amounts — the
// highest-value payload on `/bookings/**`. The gate is the same three lines `bookings/[id]/page.tsx` and
// `cancel/page.tsx` both carry: no session ⇒ `notFound()`; a missing row and a row owned by a DIFFERENT
// booker return the SAME bare 404. Guessing an id therefore reveals nothing — not that the id exists, not
// that it does not. `(app)/layout.tsx`'s session redirect is a convenience above this, never the boundary.
//
// ⚠ THE 404 IS A SAMENESS CLAIM, NOT A STATUS CLAIM (13-10's measurement). Both answers are HTTP 200 in
// practice, because the layout streams a Suspense shell for the header's auth slot before this component
// reaches its gate, so the headers are long gone and Next renders `not-found.tsx` into the open stream.
// The threat is a DIFFERENCE between the two answers; a spec pinning the literal 404 would measure the
// framework instead of the oracle.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// D-76 — A RECEIPT EXISTS WHERE MONEY MOVED, AND NOWHERE ELSE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// An unpaid hold gets the same bare 404 as a stranger's booking. A receipt for something nobody paid for
// is a meaningless artefact that invites *"was I charged?"* — the exact confusion this phase exists to
// remove — and it would be a printable document asserting a payment that never happened.
//
// The predicate is evaluated in two steps and the ORDER is the 13-04 discipline rather than tidiness:
// the row's own columns are free and decide most visits, and only the ONE surviving shape pays for a
// third-party round trip.
//
//   Step 1, from the row alone:
//     • `confirmed` — the confirm UPDATE ran, which is the only statement that writes `payment_id`.
//       It covers the DERIVED `completed` too: that is the same row a moment later (D-102).
//     • `cancelled` carrying a refund figure or a payment id — a party cancellation of a booking that
//       WAS paid.
//     • the reversal SHAPE — `cancelled`, no `cancelled_by`, no `payment_id`, but a real session id.
//       This one is a candidate, not an answer.
//   Step 2, from the provider: the reversal shape is admitted ONLY when PayMongo says the session was
//   PAID.
//
// ⚠ AND STEP 2 FAILS CLOSED, WHICH IS A NARROWING THIS FILE CHOSE. `bookings/[id]/page.tsx` renders its
// reversed branch even when the probe learns nothing, because it has D-96 copy whose every sentence is
// CONDITIONAL on a charge and is therefore true under both readings of that row signature. A receipt has
// no such register: it is a table of amounts, and every figure on it asserts that money moved. When the
// probe is silent, nothing here knows a charge occurred — 13-RESEARCH established there is no row-level
// signal that separates a reversal from a swept unpaid hold — so the document does not exist rather than
// existing with an unverified number on it. The cost is that a reversed booking has no receipt on a
// machine with no PayMongo key; the alternative is a printable claim FitOut cannot stand behind.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// EVERY FIGURE IS COMPOSED HERE AND TRAVELS AS A FINISHED STRING (GATE-05 / D-130)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `ReceiptLines` takes no `number` money prop and performs no arithmetic — see its header. The three
// frozen columns are rendered as they are: `spacePriceCents`, `serviceFeeCents`, `quotedTotalCents`.
// Nothing here recomputes one and nothing derives one from the other two. `space + fee === total` is a
// property `all-in-table.ts` guarantees on the way IN; it is not a licence to compute on the way out.
//
// ⚠ THE ITEMISATION IS A POSITIVE MATCH, exactly as the detail page's is. Both parts are nullable on a
// pre-0016 row, and the rejected alternative — subtracting one part from the frozen total — CANNOT FAIL:
// on a row whose columns disagree it would print a confident service-fee figure nobody was ever charged,
// on the one document a booker holds beside a bank statement. When the match fails the receipt shows the
// frozen total alone, which is always true.

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user } from "@/lib/db/schema";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { bookingReference } from "@/lib/booking/reference";
import { readDbNow } from "@/lib/booking/bookings-query";
import { composeWhenLabel, composeDateLabel } from "@/lib/booking/when-label";
import { RAIL_DISPLAY_NAME } from "@/lib/booking/refund-window";
import { probeCheckoutSession, readPaymentState } from "@/lib/payments/checkout-probe";
import { isApiRefundable } from "@/lib/payments/refund-rail";
import { bookedListingAddress } from "@/lib/listing-public";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import { BOOKING_SHELL } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";
import { PanelCard } from "@/components/patterns/panel-card";
import { BookingReference } from "@/components/booking/booking-reference";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { ReceiptLines, type ReceiptRefund } from "@/components/booking/receipt-lines";
import {
  deriveBookingStatusView,
  deriveDisplayStatus,
  type BookingDbStatus,
} from "@/components/booking/booking-status";

export default async function BookingReceiptPage({
  params,
}: {
  // Next 16 async params. NO `searchParams` — this route reads no query string at all, and that absence
  // is deliberate: the checkout-return parameter is forgeable (D-57) and a printable document may not
  // change what it asserts based on one.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
      // THE THREE FROZEN COLUMNS. Rendered as they are; see the header for why the itemisation is a
      // positive match and never a subtraction.
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
      currency: booking.currency,
      // The pricing-mode snapshot (WR-06) — the AUTHORITY for "Full day" vs an hour range in the shared
      // label composer. Never re-derived from a price: the D-108 per-head surcharge is folded into
      // `spacePriceCents`, so a price comparison mislabels ordinary surcharged hourly bookings.
      fullDay: booking.fullDay,
      // The OC-03 mode snapshot, and D-86's first precondition.
      openCapacity: booking.openCapacity,
      // D-86: the GRANTED passes, frozen at payment. Never the live RSVP count — that changes after the
      // charge, and a receipt that moved with it would stop matching what was paid.
      declaredPax: booking.declaredPax,
      // D-76's money-moved inputs, and D-83's fork.
      refundCents: booking.refundCents,
      cancelledBy: booking.cancelledBy,
      paymentId: booking.paymentId,
      // The rail the confirm UPDATE persisted. Read ONLY to choose between D-83's two refund words on a
      // party cancellation — it is the same input `cancelBookingAsBooker` branched on, so the receipt and
      // the action cannot disagree about which path the money took.
      paymentMethod: booking.paymentMethod,
      // The handle on what PayMongo knows. `confirmBooking` persists it BEFORE the booker ever pays
      // (CR-02), which is why it survives on a row the confirm UPDATE never touched.
      checkoutSessionId: booking.checkoutSessionId,
      // D-85's honest fallback anchor. There is no `paid_at` column, no `updated_at`, and `paymongo_event`
      // cannot be joined to a booking — so when the probe falls back this is the only real instant the
      // row carries, and it is labelled for what it is.
      createdAt: booking.createdAt,
    })
    .from(booking)
    .where(eq(booking.id, id));

  // Owner-gate (T-13-12-RECEIPTIDOR / T-04-CONFIRMIDOR) — the route group is NOT the gate. Missing OR
  // not-mine → the same bare 404.
  if (!bk || bk.bookerId !== userId) notFound();

  // ══ D-76, STEP 1 — the row's own columns. Free, and it decides every unpaid hold. ══════════════════
  const paidOutright = bk.status === "confirmed";
  const cancelledAfterPaying =
    bk.status === "cancelled" && (bk.refundCents !== null || bk.paymentId !== null);
  // 13-04's two row-level preconditions, restated because they are the same two facts: a PARTY
  // cancellation was a decision and its session was genuinely paid, and a booking that never reached
  // checkout cannot have had a payment reversed.
  const reversalShape =
    bk.status === "cancelled" &&
    bk.cancelledBy === null &&
    bk.paymentId === null &&
    bk.checkoutSessionId !== null;

  // Nothing here says money moved, and nothing may pay for a round trip to ask.
  if (!paidOutright && !cancelledAfterPaying && !reversalShape) notFound();

  // ══ D-84's ONE PROBE, PAYING FOR THREE THINGS ═════════════════════════════════════════════════════
  // The rail, the real `paid_at` (D-85), and the reversal discriminator. It is bounded and it NEVER
  // raises: every failure — no key, a network fault, a non-2xx, the deadline — resolves to `null`, and
  // `null` means exactly one thing to this file: *we did not learn it*.
  const checkout = await probeCheckoutSession(bk.checkoutSessionId);
  // `readPaymentState` is the ONE owner of the (booking status, session status) pairs — reused rather
  // than restated, so this surface and the detail page cannot drift apart about what `paid` means.
  const reversed = reversalShape && readPaymentState(bk.status, checkout) === "reversed";

  // ══ D-76, STEP 2 — fail closed. See the header for why a receipt narrows where the detail page does not.
  if (!paidOutright && !cancelledAfterPaying && !reversed) notFound();

  const [lst] = await db
    .select({
      title: listing.title,
      primarySpaceType: listing.primarySpaceType,
      city: listing.city,
      timezone: listing.timezone,
      // The pre-0016 positive-match reference the shared label composer needs, and nothing else.
      dayRateCents: listing.dayRateCents,
      // D-86's second precondition: the per-head rate the open-capacity charge was built from.
      perHeadPriceCents: listing.perHeadPriceCents,
      // ⚠ THE ADDRESS COLUMNS ARE NAMED HERE AND NOWHERE ELSE ON THIS PAGE. `bookedListingAddress()` is
      // the ONE route to a booked listing's street (D-91), so the row is handed to it WHOLE rather than
      // taken apart at the call site — a grep over this file for the raw column names finds them only in
      // this select, which is what makes the boundary auditable at all.
      addressLine1: listing.addressLine1,
      addressLine2: listing.addressLine2,
      postalCode: listing.postalCode,
      neighborhood: listing.neighborhood,
      region: listing.region,
      country: listing.country,
      location: listing.location,
      showExactAddress: listing.showExactAddress,
      hostFirstName: user.firstName,
    })
    .from(listing)
    // INNER join: `listing.host_id` is NOT NULL with an FK to `user`, so this can never drop a row the
    // un-joined query would have returned.
    .innerJoin(user, eq(listing.hostId, user.id))
    .where(eq(listing.id, bk.listingId));
  if (!lst) notFound();

  // THE CLOCK — Postgres, read once, threaded into the one derivation that needs it. There is no JS clock
  // read on this page (the 07-06 boundary contract).
  const now = await readDbNow(db);

  const timezone = lst.timezone;
  const currency = bk.currency ?? DISPLAY_CURRENCY;
  const quoted = bk.quotedTotalCents ?? 0;
  const reference = bookingReference(bk.id);

  // THE STATUS, NARROWED BY THE GATE RATHER THAN CAST PAST IT. D-76 above admits exactly two stored
  // statuses — `confirmed` (which the derivation may read as `completed`) and `cancelled` — so this is a
  // statement of what the gate already established, not an assertion over it. A cast would compile
  // identically today and would silently survive a widened predicate; this line would not.
  const dbStatus: BookingDbStatus = bk.status === "confirmed" ? "confirmed" : "cancelled";

  // The DERIVED status (D-102), against the DB clock — the same call the badge below makes with the same
  // arguments, so the word, the pill and the address boundary cannot disagree.
  const displayStatus = deriveDisplayStatus(dbStatus, bk.endsAt, now, bk.cancelledBy);
  const statusWord = deriveBookingStatusView(
    dbStatus,
    bk.endsAt,
    now,
    "booker",
    bk.cancelledBy,
  ).label;

  // THE ADDRESS, THROUGH THE ONE NAMED BOUNDARY (D-91). The whole listing row is handed over rather than
  // picked apart, so this file cannot grow a second, weaker rule.
  //
  // ⚠ A CANCELLED OR REVERSED BOOKING GETS THE PUBLIC PROJECTION — neighbourhood and city, no street —
  // and that is the boundary working rather than the receipt losing a fact. D-91 grants the exact street
  // for `confirmed` and derived-`completed` because the host's own control already promises "an
  // approximate area until they book"; a booking that ended cancelled is not a kept promise, and this
  // document is printable and shareable. Ten renders are asserted per render in
  // `tests/listing/booked-address.test.ts`; this route adds no eleventh rule.
  const address = bookedListingAddress(lst, { displayStatus });

  // ── THE ITEMISATION, ON A POSITIVE MATCH ONLY. See the header. ───────────────────────────────────
  const itemised =
    bk.spacePriceCents !== null &&
    bk.serviceFeeCents !== null &&
    bk.spacePriceCents + bk.serviceFeeCents === quoted
      ? {
          space: formatMoney(bk.spacePriceCents, currency),
          fee: formatMoney(bk.serviceFeeCents, currency),
        }
      : null;

  // ── D-86's PER-HEAD LINE — OPEN CAPACITY ONLY, AND ONLY ON AN EXACT MATCH. ───────────────────────
  //
  // The shape is the `fullDay` fallback idiom this repository already uses in three places: a POSITIVE
  // match can only ever ADD the line when the product genuinely equals the frozen charge, so nothing can
  // be mislabelled by it. The rejected alternative is division — recovering a unit by dividing the frozen
  // total — which cannot fail and would therefore print a per-person figure for bookings that were never
  // priced per person.
  //
  // ⚠ AN EXCLUSIVE GROUP BOOKING GETS THE ORDINARY WHOLE-SPACE RECEIPT (D-86 narrowing D-77). The
  // organiser paid one whole-space price and the RSVP table has no money column, so a per-head line there
  // would print a number that never equalled what was charged — and no existing gate would catch it,
  // because GATE-05's price-parity spec stops at the reserve page. `openCapacity` is the discriminator,
  // never the presence of a group.
  //
  // `declaredPax` is the GRANTED passes, frozen at payment. Never the live confirmed-yes count.
  const perHeadUnitLabel =
    bk.openCapacity === true &&
    lst.perHeadPriceCents !== null &&
    bk.declaredPax !== null &&
    bk.spacePriceCents !== null &&
    lst.perHeadPriceCents * bk.declaredPax === bk.spacePriceCents
      ? `${formatMoney(lst.perHeadPriceCents, currency)}/person × ${bk.declaredPax} ${
          bk.declaredPax === 1 ? "pass" : "passes"
        }`
      : undefined;

  // ── D-85's PAYMENT LINES ────────────────────────────────────────────────────────────────────────
  //
  // `Date paid` renders ONLY from the provider's real instant. When the probe falls back the line is
  // labelled `Booked` against `booking.createdAt` — truthful about a different fact rather than a guess
  // about the right one. A receipt that misstates a payment date is precisely the looks-official-but-isn't
  // failure D-75 guards against, which is why the two words are a closed union in `ReceiptLines` rather
  // than a string this file could compose.
  //
  // The rail is named through `RAIL_DISPLAY_NAME` — a token the map does not carry yields NO line at all,
  // because printing a provider's raw token is worse than printing nothing. An omitted line claims nothing.
  const paidAt = checkout?.paidAt ?? null;
  const rail = checkout?.sourceType ?? null;
  const paidWithLabel = rail === null ? undefined : RAIL_DISPLAY_NAME.get(rail);

  // ── D-76's REFUND LINE — SEPARATE, NEVER NETTED ─────────────────────────────────────────────────
  //
  // Two sources, because there are two ways money comes back and they carry it in different places:
  //   • a REVERSAL returns the full charge, and `refund_cents` is NULL on that path by construction
  //     (the booker did not cancel — nobody did), so the amount is the frozen quote;
  //   • a PARTY cancellation returns what `cancelBookingAsBooker` computed and wrote.
  // The rail follows the same fork, so D-83's two words are chosen from the same fact the refund actually
  // took: the probe's rail on a reversal, the persisted column on a cancellation.
  //
  // ⚠ A ZERO REFUND RENDERS NO LINE. "Refunded ₱0.00" is a row that states a movement that did not
  // happen; the Total above already says what was charged, and 13-UI-SPEC specifies a no-refund SENTENCE
  // for the detail page and no row for this one. Inventing a third form here would be un-reviewed copy on
  // a money surface.
  //
  // ⚠ THE ABSENT CASE IS THE EMPTY OBJECT AND NOT `null`, AND THE COMPILER IS THE REASON. `ReceiptRefund`
  // is a UNION — either both fields or neither — so the two are spread into the element together or not at
  // all, and there is no shape in which an amount arrives without the word that says what happened to it.
  // Measured: a first draft typed this `... : null` and spread `refund ?? {}`, and `tsc --noEmit` rejected
  // it with *"Types of property 'refundLabel' are incompatible … 'undefined' is not assignable to
  // 'string'"* — the union refusing exactly the case it exists to refuse. Annotating the constant is what
  // keeps that refusal live; widening it to an optional pair would compile and would let a later edit put
  // a money figure on this document with no label.
  const refundCents = reversed ? quoted : (bk.refundCents ?? 0);
  const refundRail = reversed ? rail : bk.paymentMethod;
  const refund: ReceiptRefund =
    refundCents > 0
      ? {
          refundLabel: formatMoney(refundCents, currency),
          refundKind: isApiRefundable(refundRail) ? ("auto" as const) : ("manual" as const),
        }
      : {};

  const title = lst.title ?? "Untitled space";
  const spaceTypeLabel = lst.primarySpaceType
    ? SPACE_TYPE_LABELS[lst.primarySpaceType as SpaceTypeValue]
    : null;
  // ONE owner for every venue-local string on this page (`when-label.ts`), so the receipt renders no date
  // format of its own. It resolves the open-capacity fork itself, so a drop-in pass reads as an entry
  // window rather than as a sixteen-hour reservation.
  const whenLabel = composeWhenLabel({
    startsAt: bk.startsAt,
    endsAt: bk.endsAt,
    timezone,
    city: lst.city,
    fullDay: bk.fullDay,
    openCapacity: bk.openCapacity,
    spacePriceCents: bk.spacePriceCents,
    quotedTotalCents: bk.quotedTotalCents,
    dayRateCents: lst.dayRateCents,
  });
  // The same module's date-only export, off the SAME token. The city suffix is carried because a bare date
  // on a payment line does not say which clock it is in, and this document outlives the session.
  const dateLabel = composeDateLabel(paidAt ?? bk.createdAt, timezone, lst.city);

  return (
    // ⚠ THE ARTICLE IS THE SHELL, and that is one element rather than a `div` wrapping a hook because
    // every print rule in 13-UI-SPEC § The Print Contract is scoped INSIDE this element — the measure that
    // opens up on paper and the box that holds the document are the same box. `BOOKING_SHELL` is the
    // constant every surface under this segment shares (13-01), so the receipt's screen measure is
    // mechanically identical to the detail page's rather than identical by two authors agreeing.
    <article
      data-testid="receipt"
      className={cn(
        BOOKING_SHELL,
        "space-y-6",
        // ── THE PRINT CONTRACT (D-74 / 13-RESEARCH Pitfall 3). Tailwind `print:` utilities ONLY: they
        // compile to `@media print` and nothing else, so screen rendering is byte-identical and both
        // `globals.css`-facing gates stay entirely out of the blast radius.
        //
        // THE MEASURE OPENS UP. A centred 2xl column with page padding is a screen affordance; on paper
        // the sheet already IS the measure and the printer already owns the margins.
        "print:max-w-none print:px-0 print:py-0",
        // EVERY CONTROL DISAPPEARS, AS A CLOSED SET RATHER THAN AN ENUMERATION. One descendant rule
        // catches the reference's copy control and any control a later plan adds to this route; a list of
        // per-element classes catches only the ones somebody remembered. That is this phase's own lesson
        // (13-09: a ban list cannot catch the item nobody thought of), applied to print suppression.
        // A button on paper is a rectangle of ink that does nothing.
        // THE SET IS BOTH CONTROL ELEMENTS, not only the one that exists today. There is no anchor on
        // this route right now, which is precisely why the rule is written as a set rather than as a
        // class on each control: the day somebody adds one — a link back to the booking, a support
        // path — it is already suppressed, and nobody has to remember a contract written in a document.
        "print:[&_button]:hidden print:[&_a]:hidden",
      )}
    >
      {/* ── HEAD ──────────────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* ⚠ `text-heading`, NOT Display, and the gate caught the first draft rather than a reviewer.
            13-UI-SPEC § Typography assigns Display to the confirmation moment's heading and to the
            detail page's; the receipt's `<h1>` is a LABEL on a document, not a moment, and § Visual
            Hierarchy puts this surface's one focal point on the itemisation and its Total. A Display
            heading here would compete with the number the document exists to state.
            Measured: `type-scale.test.ts` reported `+ ".../receipt/page.tsx": 1` against a pinned
            inventory of 14 Display call sites in 11 files — a pinned count going red on code that was
            genuinely wrong, which is the direction a pin is supposed to fire in. The inventory is
            UNCHANGED at 14/11. */}
        <h1 className="text-heading">Receipt</h1>
        {/* D-75, ON SCREEN AND ON PAPER. No `print:` prefix and no `hidden` — see the header for why the
            screen is the medium where this sentence matters most. */}
        <p className="text-label text-muted-foreground">
          This is a booking record for your own reference. It isn&apos;t an official receipt.
        </p>
        <div className="flex items-center gap-2">
          {/* THE PILL'S MEANING IS IN ITS SHAPE AND FILL; THE WORD'S MEANING IS IN THE WORD. Print drops
              backgrounds by default — the CSS property that governs whether a printer reproduces them
              starts at its economy value, and Chrome's Background graphics box is off — so a filled
              badge is at best an empty outline on paper and at worst invisible ink. (That property is
              named descriptively rather than spelled: 13-UI-SPEC's print contract forbids forcing it,
              and the check is a raw count over `src/` expecting ZERO, which a comment explaining the
              ban would otherwise trip.) The badge is therefore suppressed and the same status word takes its place,
              from the SAME derivation — not a second vocabulary. */}
          <span className="print:hidden">
            <BookingStatusBadge
              status={dbStatus}
              endsAt={bk.endsAt}
              now={now}
              side="booker"
              cancelledBy={bk.cancelledBy}
            />
          </span>
          <span className="hidden text-label text-muted-foreground print:inline">{statusWord}</span>
        </div>
      </div>

      {/* ── THE BOOKING ───────────────────────────────────────────────────────────────────────────── */}
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
          {/* The boundary composed the LINES; this file renders lines rather than columns. An empty array
              renders no row at all, never an empty one. */}
          {address.lines.length > 0 && (
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-right">
                {address.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">When</dt>
            <dd className="text-right tabular-nums">{whenLabel}</dd>
          </div>
          {/* A first name only — what the listing page shows and what a booker arriving at a venue needs.
              No surname and no contact detail: this is a fact sheet, not a directory, and it is printable. */}
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Host</dt>
            <dd className="text-right font-medium">{lst.hostFirstName ?? "Your host"}</dd>
          </div>
        </dl>
      </PanelCard>

      {/* ── THE REFERENCE (TRUST-02 / D-78) ───────────────────────────────────────────────────────── */}
      <PanelCard>
        <div className="space-y-1">
          <p className="text-label text-muted-foreground">Reference</p>
          {/* Server-computed above and handed down finished. The deriver is a SHA-256 over the booking id
              using a Node builtin, so calling it inside the client copy control would drag that builtin
              into the browser bundle. It is a one-way, non-enumerable LABEL — the opaque UUID in the URL
              is the credential, and it stays gated. */}
          <BookingReference reference={reference} />
        </div>
      </PanelCard>

      {/* ── THE MONEY ─────────────────────────────────────────────────────────────────────────────── */}
      <PanelCard>
        <ReceiptLines
          spacePriceLabel={itemised?.space ?? null}
          serviceFeeLabel={itemised?.fee ?? null}
          totalLabel={formatMoney(quoted, currency)}
          perHeadUnitLabel={perHeadUnitLabel}
          paidWithLabel={paidWithLabel}
          dateKind={paidAt !== null ? "paid" : "booked"}
          dateLabel={dateLabel}
          {...refund}
        />
      </PanelCard>

      {/* ── THE PRINT-ONLY FOOT ───────────────────────────────────────────────────────────────────
          A text wordmark and the reference, so a sheet separated from its screen still names what it is
          and which booking it belongs to. TEXT ONLY — no logo asset (D-127): an image here would be the
          one element on the page that depends on backgrounds surviving the print pipeline. */}
      <p className="hidden text-label text-muted-foreground print:block">
        FitOut · {reference}
      </p>
    </article>
  );
}
