// Host dashboard landing (D-04) — a DISTINCT host surface, not blended into the booker pages.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT PLAN 14-08 CHANGED: THIS IS A TODAY VIEW NOW (HFLOW-03 · 14-CONTEXT D-140…D-143)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The shipped page was a greeting, a two-sentence explainer and a row of four buttons. That is a page
// for a host's first week. D-140 replaces it with the host's DAY: today's real sessions first — who is
// coming, to which space, when, in that venue's own local time — and only then the three things that
// need the host. A host with three sessions today must be able to answer *who is coming* without a
// second click, and a grid of counts and links is the one shape that cannot answer it.
//
//   1. THE GREETING IS A TITLE, NOT THE SUBJECT (D-143). It moves into the declared header pattern,
//      which also means this page stops hand-rolling an `<h1>` and gets the one-h1-per-document and
//      wraps-never-truncates rules from the layer instead of from this file. The two-sentence explainer
//      is RETAINED ONLY in the no-listings state, where it is genuinely orienting; for a host who
//      already has listings it was a paragraph explaining the page they were standing on.
//
//   2. THE HEADER CLUSTER LOSES TWO BUTTONS, DELIBERATELY. `Earnings` and `Requests` are both permanent
//      host-nav slots rendered on this very page, and the requests count now has its own signal row
//      below — two buttons duplicating persistent navigation are two competitors for the one accent.
//      What is left is the create action and a link to the host's listings. `/host/bookings` gains a
//      route-out in the agenda's own heading row, which this page did not have at all before.
//
//   3. THE CLOCK IS READ ONCE AND THREADED (D-141). One database-clock read at the top drives the
//      agenda's venue-local day predicate AND every status badge below it. A second read would let a
//      badge and the query disagree about what time it is, and nothing would fail when it happened.
//      (The helper is named descriptively here rather than spelled: the acceptance check for "one clock
//      read" is a line count over this file, and a comment quoting the identifier inflates it.)
//
//   4. THE TWO NEW BLOCKS ARE COMPONENTS, NOT MARKUP HERE. `HostAgenda` owns the three booking states
//      and `HostSignals` owns the three signal rows in D-140's order — including the payout notice and
//      the published-without-hours advisory that used to be assembled in this file. This page reads,
//      maps rows to pre-composed strings, and composes. It formats no date and computes no price.
//
// ⚠ THE TWO ACCENT CALL SITES ARE BOTH DELIBERATE AND BOTH SURVIVE. They are the arms of a runtime
// conditional — a host either has listings or does not — so exactly one of them is ever an element in
// the rendered document, which is what keeps "exactly one accent-filled element in the viewport" true.
// `brand-recipe.test.ts` reads SOURCE and therefore counts both; the host total it pins is FIVE and two
// of the five are here. Folding them into one branch drops that total to four and turns the gate red for
// a reason with nothing to do with the design. (The accent's own spelling is not written anywhere in
// this comment, because the acceptance check for the pair is a raw line count over this file and a
// comment quoting the token would inflate it — the same lesson the shipped hours-notice comment recorded
// at length before it was moved out of this file.)
//
// SECURITY (T-06-23 / Security V4). Reaching this page already means canHost is true (the (host) layout
// gated it), and the layout is NOT the authorization boundary for the DATA. The session and the
// capability are re-checked HERE (gate 2, unchanged), and every read below is owner-scoped inside its own
// statement — never by a branch in this file. The agenda read lives in the PAGE and not in the layout,
// which is also what `tests/design/blocking-session-gate.test.ts` requires: an await in a group layout
// blocks navigation for the whole group and makes the `loading.tsx` beneath it useless.

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, count, eq, isNull } from "drizzle-orm";
import { Building2Icon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, hostPayout, listing } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { HOST_PANEL_SHELL } from "@/lib/design/measurements";
import { queryHostAgenda, readDbNow } from "@/lib/booking/bookings-query";
import { composeStartTokens, composeWhenLabelShort } from "@/lib/booking/when-label";
import {
  HostAgenda,
  WITHHELD_BOOKER_LABEL,
  type HostAgendaNextData,
  type HostAgendaRowData,
} from "@/components/host/host-agenda";
import { HostSignals } from "@/components/host/host-signals";
import { derivePayoutStatus } from "@/components/host/payout-status";
import { loadPublishedListingsMissingHours } from "@/lib/listing/hours-signal";

/**
 * The two-sentence product explainer, retained BYTE-FOR-BYTE from the shipped surface and rendered in
 * exactly one state (D-143).
 *
 * A host with listings does not need to be told what the hosting side of the product is — they are
 * standing in it, and the agenda below answers a question they actually have. A host with NO listings
 * has nothing else on the page to orient them, and for that host these two sentences are the page's
 * only orientation. Declared as a constant rather than inlined so the `iff` is visible at the one place
 * that decides it.
 */
const NO_LISTINGS_LEDE =
  "This is your hosting space, separate from booking. List a fitness or " +
  "recreational space and set its availability so people can find and book it.";

/** The space title fallback, matching `/host/bookings` and `/host/requests` — never a blank row. */
const UNTITLED_SPACE_LABEL = "Your space";

export default async function HostDashboardPage() {
  // ─── GATE 2, UNCHANGED. Session first, host capability second, both re-checked ON THE PAGE. ───────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & {
    firstName?: string | null;
    canHost?: boolean;
  };
  // Defense in depth: the layout already gates, but never render hosting content without canHost.
  if (!u.canHost) {
    redirect("/");
  }

  // ─── THE CLOCK. Read ONCE, from the DATABASE, and threaded from here into everything that needs a
  // now: the venue-local day predicate inside the agenda statement, and every status badge on every row
  // it returns. A drifting server clock must not be able to change what "today" means, and two readings
  // in one render is exactly the drift D-141 forbids — with nothing that would go red when it happened.
  const now = await readDbNow(db);

  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(listing)
    .where(and(eq(listing.hostId, session.user.id), isNull(listing.deletedAt)));
  const hasListings = (n ?? 0) > 0;

  // Pending-request count (D-65) — booking JOIN listing owner-scoped to this host, status='requested'.
  // CONSUMER #2 OF THREE, RESHAPED AND NOT REPLACED: the same predicate is written by the (host) shell's
  // streamed nav badge and by the /host/requests inbox, and all three must report the same N. This plan
  // moved where the number is RENDERED (a signal row, not a button badge) and added no fourth query.
  const [{ p } = { p: 0 }] = await db
    .select({ p: count() })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")));
  const pendingRequests = p ?? 0;

  // Live payout state (D-12) — drives the persistent notice in the signals block. payoutsEnabled is
  // webhook-set only; nothing here infers it from a redirect.
  const [payoutRow] = await db
    .select()
    .from(hostPayout)
    .where(eq(hostPayout.userId, session.user.id));
  const payoutStatus = derivePayoutStatus(payoutRow);

  // v1.0 audit finding #4 — the host's published listings with no weekly hours, owner-scoped by
  // session.user.id (never by anything a client sends) in ONE query, from the same authority the
  // listings grid reads. Signal 3.
  const missingHours = await loadPublishedListingsMissingHours(db, session.user.id);

  // ─── THE AGENDA READ (14-02). Owner-scoping is a bound `WHERE l.host_id = $1` inside the statement,
  // on BOTH buckets, and the venue-local day is decided by projecting the clock into each joined row's
  // OWN timezone column. Nothing here re-compares a date, re-derives a status or re-filters a row set:
  // the partition arrives already made, on the discriminator the statement stamped.
  //
  // `next` is ALREADY null whenever `today` is non-empty (14-02) — "both at once" is unrepresentable, so
  // there is deliberately no page-level guard against double-counting the same session and none should
  // be added here.
  const agenda = await queryHostAgenda(db, { hostId: session.user.id, now });

  // ─── THE DISPLAY MAP, built the way /host/requests builds its own: the components receive STRINGS.
  // The venue-local window comes from the ONE shared composer in its short form (07-02 / 14-PATTERNS S3)
  // — this derivation was three verbatim duplicates before Phase 7 and must never be re-inlined. The
  // booker label is the shared withheld fallback, imported rather than typed a seventh time.
  //
  // NO MONEY REACHES THIS SURFACE, and that is the design contract rather than an omission: the agenda
  // row's slots are title / meta / status / href, and the frozen quote is rendered on the inbox row —
  // where a host is deciding — and on the booking detail this row links to.
  const agendaRows: HostAgendaRowData[] = agenda.today.map((r) => ({
    bookingId: r.id,
    // THE BOOKER'S FIRST NAME IS THE ROW TITLE (D-140). First name only: no surname, no email, no phone.
    bookerLabel: r.bookerFirstName?.trim() || WITHHELD_BOOKER_LABEL,
    spaceTitle: r.listingTitle ?? UNTITLED_SPACE_LABEL,
    whenLabel: composeWhenLabelShort({
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      timezone: r.timezone,
      city: r.city,
      // The persisted creation-time snapshots, both REQUIRED by the composer so the compiler enumerates
      // every projection that must supply them. Never re-derived from a price (CR-01).
      fullDay: r.fullDay,
      openCapacity: r.openCapacity,
      spacePriceCents: r.spacePriceCents,
      quotedTotalCents: r.quotedTotalCents,
      dayRateCents: r.dayRateCents,
    }),
    status: r.status,
    cancelledBy: r.cancelledBy,
    endsAt: r.endsAt,
  }));

  // D-142's quiet-day row, split into the three tokens the copy contract's sentence is built from. The
  // date and the time come from the SAME module the rows above use — the sentence belongs to the
  // surface, the venue-local rendering does not.
  const agendaNext: HostAgendaNextData | null = agenda.next
    ? {
        ...composeStartTokens({
          startsAt: agenda.next.startsAt,
          endsAt: agenda.next.endsAt,
          timezone: agenda.next.timezone,
          city: agenda.next.city,
          fullDay: agenda.next.fullDay,
          openCapacity: agenda.next.openCapacity,
          spacePriceCents: agenda.next.spacePriceCents,
          quotedTotalCents: agenda.next.quotedTotalCents,
          dayRateCents: agenda.next.dayRateCents,
        }),
        spaceTitle: agenda.next.listingTitle ?? UNTITLED_SPACE_LABEL,
      }
    : null;

  return (
    // The container is the DECLARED host panel shell, which is what stops `host/loading.tsx` drawing a
    // different box than the page it stands in for. `/host` is the one surface whose rendering this
    // constant changes — it moves from its outlier 48px vertical rhythm to the 32px one the other three
    // host panel routes already share. The child-spacing rhythm stays at this call site, beside the
    // constant, because vertical rhythm BETWEEN a container's children is not a measurement of the
    // container. The dashboard's own marker attribute stays on this element, where the shipped surface
    // put it and where `mode-switch.spec.ts` looks for it — named descriptively rather than quoted, for
    // the same counting reason the clock note above gives.
    <div className={`${HOST_PANEL_SHELL} space-y-8`} data-host-dashboard>
      <PageHeader
        // The shipped greeting, unchanged — the comma clause is omitted when there is no first name.
        title={`Your hosting${u.firstName ? `, ${u.firstName}` : ""}`}
        // THE `iff` (D-143), in one expression: the explainer is present exactly when the host has no
        // listings, and absent otherwise.
        lede={hasListings ? undefined : NO_LISTINGS_LEDE}
        // The cluster renders only for a host who HAS listings. A host with none is offered the create
        // action once, by the empty state below, which is what keeps exactly one accent-filled element
        // in the viewport in BOTH states rather than only in one.
        actions={
          hasListings ? (
            <>
              <Button asChild variant="brand">
                <Link href="/host/listings/new">Create listing</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/host/listings">Your listings</Link>
              </Button>
            </>
          ) : undefined
        }
      />

      {hasListings ? (
        // THE PAGE'S SUBJECT (D-140). Three states, one always-present container: today's sessions, the
        // quiet day's next-up sentence, or the nothing-booked absence. The clock is threaded in so the
        // rows, their badges and the query that selected them cannot disagree about the time.
        <HostAgenda rows={agendaRows} next={agendaNext} now={now} />
      ) : (
        // The shipped no-listings empty state, unchanged — same icon, same two strings, same create
        // action, and the copy is byte-identical to `/host/listings`' own because the two are one
        // product decision rendered on two surfaces. There is no agenda here: a host with no listings
        // has nothing to have an agenda about, and an empty "Today" would be an absence dressed up as a
        // state.
        <EmptyState
          icon={Building2Icon}
          titleAs="h2"
          title="No listings yet"
          body="List your space and start earning. We'll walk you through it step by step."
          actions={
            <Button asChild variant="brand">
              <Link href="/host/listings/new">Create your first listing</Link>
            </Button>
          }
        />
      )}

      {/* WHAT NEEDS THE HOST, in D-140's order: requests owed, payout state, published without hours.
          Below today's sessions on purpose — a dashboard that leads with setup chores is a dashboard for
          the host's first week rather than their hundredth. It runs no query of its own; all three
          numbers arrive from the authorities read above. Rendered in the no-listings state too, where
          rows 1 and 3 are structurally zero and hide themselves, so the payout notice a brand-new host
          most needs is still the thing under the empty state. */}
      <HostSignals
        pendingRequests={pendingRequests}
        payoutStatus={payoutStatus}
        missingHours={missingHours}
      />
    </div>
  );
}
