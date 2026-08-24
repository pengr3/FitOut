// Host request inbox (HOST-01 · D-65). An RSC under the (host) route group listing the host's PENDING
// (`requested`) booking requests — booker, space, venue-local window, the server-frozen quote, an hours-scale
// expiry countdown, and Approve/Decline actions wired to the 06-07 server actions. Clones /host/earnings for
// the shell, the defense-in-depth re-gate, and the desktop table / mobile card responsive split.
//
// SECURITY (T-06-23 / Security V4): the (host) LAYOUT gates canHost, but the route group is NOT the
// authorization gate for the DATA. This page re-checks the session + canHost (defense in depth) AND
// owner-scopes the read to `listing.host_id = session.user.id AND booking.status = 'requested'` — the EXACT
// predicate 06-07's non-optional owner-scope READ isolation test asserts (JOIN booking→listing, soonest-
// expiring first). Keep this predicate identical to that tested SELECT: if it drifts, the read-path IDOR
// test no longer covers the real page. A host can never see another host's requests.
//
// All money is the SERVER-FROZEN quote (booking.quotedTotalCents, D-49) rendered via formatMoney — the page
// does ZERO price arithmetic. NO coral — this is a calm host workflow surface, not a conversion funnel
// (mirrors /host/earnings).
//
// ⚠ SC#2 IS AMENDED ON THIS SURFACE AS OF 2026-08-24, AND THE OLD SENTENCE IS GONE RATHER THAN LEFT
// STANDING. This header used to read "Every time names the venue timezone (SC#2)". After Phase 14's UAT
// finding F-2 the PM ruled *"show the timezone only when it varies"* on the host LIST surfaces that
// repeat the label once per row — so a row here names its city only when the rendered rows span more
// than one venue clock. The rule, and the reasoning that a rule which has been overridden must not stay
// on the books as if it were still true, live in `@/lib/booking/venue-clock-scope`. Every surface that
// renders ONE booking — `/host/bookings/[id]`, the emails, the whole booker path — still names the zone
// unconditionally, and `when-label.ts` is unchanged.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT PLAN 14-06 CHANGED, AND WHAT IT DELIBERATELY DID NOT (HFLOW-01 · D-146, D-147)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. THE BOX AND THE HEADING ARE NO LONGER THIS FILE'S OWN. The container is the declared host-list
//      shell from `@/lib/design/measurements` and the title block is `PageHeader`, so this page and
//      `requests/loading.tsx` render the SAME constant and the SAME component with the SAME two strings.
//      Before this they agreed about the container only because somebody had typed the same five layout
//      utilities — and the lede — twice, in two files, neither of which contains both halves of the
//      agreement. The class string itself is deliberately NOT repeated in this comment: it lives in the
//      constant's own docblock, which is the one place it may be spelled. The lede still INTERPOLATES
//      `APPROVAL_SLA_HOURS` and never types the number — the plate's own header records why that matters
//      on the one surface whose whole subject is that deadline.
//
//   2. THE DESKTOP TABLE LEADS WITH THE DEADLINE. The shipped order was
//      `Space · When · Guest · Guest pays · Expires · Actions` — the deadline FIFTH of six, which is the
//      opposite of what HFLOW-01 asks for. It is now `Expires · Guest · Space · When · Guest pays ·
//      Actions`: when, then who, then what, then when it is, then how much. That is the order a triage
//      queue is read in. No header string was renamed, none was added, none was removed, and `Actions`
//      stays a VISIBLE `<th scope="col">` — the shipped page renders it visibly and D-154's
//      "no new information architecture" rule is scoped to `/host/bookings`, not to this inbox.
//
//   3. THE COUNTDOWN TAKES ITS `lead` LAYOUT ON THE TABLE TOO, AND THAT IS WHAT MAKES D-146 TRUE AT
//      768px AND 1280px. `emphasis="lead"` (14-03) puts the digits at the heading role — the largest
//      type in the row. The mobile card already asked for it; the table did not, so above the `md:`
//      breakpoint the deadline rendered at the same 14px as everything beside it and "the countdown is
//      the loudest element" was false on two of the three widths the phase measures. The table row is a
//      request row; the hierarchy is a property of the row, not of the viewport.
//
//   4. THE MONEY AND THE GUEST NAME WERE NOT PROMOTED. Both cells carry the LABEL role and nothing else —
//      same size, same weight — because D-146's third falsifiable is an EQUALITY between them. The
//      hierarchy is carried entirely by the countdown; anything else enlarged here is the defect
//      `e2e/host-inbox-hierarchy.spec.ts` exists to catch.
//
// ⚠ THE READ BELOW WAS NOT TOUCHED. Not the predicate, not the ordering, not the join set, not the
// display map, not the single `readDbNow` and not its threading. This was a restyle: it changed the box,
// the order of the columns and the type roles, and it changed no query. The 06-07 owner-scope READ
// isolation test asserts the EXACT predicate in the `where` clause below, so a restyle that drifts it
// silently uncovers the read-path IDOR test.
//
// ⚠ INBOX-ZERO IS BYTE-FOR-BYTE WHAT IT WAS. D-147 asks for an `EmptyState` that reads as DONE rather
// than as an absence, and plan 11-16 already shipped exactly that.
// `tests/design/empty-state-adoption.test.ts` passes with zero edits, which is the proof that nothing
// here was re-decided.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user } from "@/lib/db/schema";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { composeWhenLabelShort } from "@/lib/booking/when-label";
import { resolveListCity } from "@/lib/booking/venue-clock-scope";
import { readDbNow } from "@/lib/booking/bookings-query";
import { APPROVAL_SLA_HOURS } from "@/lib/payments/config";
import {
  RequestActions,
  RequestRow,
  type RequestRowData,
} from "@/components/host/request-row";
import { RequestCountdown } from "@/components/booking/request-countdown";
import { RequestCountdownReason } from "@/components/host/request-countdown-reason";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { HOST_LIST_SHELL } from "@/lib/design/measurements";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function HostRequestsPage() {
  // Defense in depth: the (host) layout already gates, but never render the inbox without a real session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }

  // Owner-scoped read (T-06-23 / Security V4) — the route group is NOT the gate. This is the EXACT predicate
  // 06-07's non-optional owner-scope READ test asserts: booking JOIN listing WHERE listing.hostId =
  // session.user.id AND booking.status = 'requested', soonest-expiring first. Joined to the booker for the
  // display name (the WHERE/ORDER BY isolation predicate is unchanged by the display join).
  const rows = await db
    .select({
      id: booking.id,
      listingId: booking.listingId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      expiresAt: booking.expiresAt,
      // D-99 (07-12): the anchor the FLAT APPROVAL_SLA_HOURS deadline would have run from. Comparing it with
      // the row's real expires_at is what tells the reason line whether this deadline is cap-derived.
      createdAt: booking.createdAt,
      quotedTotalCents: booking.quotedTotalCents,
      // The WR-06 pricing-mode snapshot — the AUTHORITY composeWhenLabelShort renders "Full day" vs an
      // hour range from (08-15 / CR-01). Never re-derived from a price.
      fullDay: booking.fullDay,
      // D-74: the listing-priced portion. Read by the formatter ONLY for pre-0016 rows, and only as a
      // positive match against the listing's day rate.
      spacePriceCents: booking.spacePriceCents,
      currency: booking.currency,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      // The formatter's pre-0016 positive-match reference only.
      dayRateCents: listing.dayRateCents,
      bookerFirstName: user.firstName,
    })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .innerJoin(user, eq(booking.bookerId, user.id))
    .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")))
    .orderBy(asc(booking.expiresAt));

  // Per-row display: the venue-tz-safe window label comes from the SHARED formatter (07-02) in its SHORT
  // "EEE, MMM d" form — this derivation was one of three verbatim duplicates before Phase 7 and must never
  // be re-inlined here. The full-day vs hour-range choice comes from the booking's own PERSISTED snapshot
  // (08-15 / CR-01) — nothing here infers it from a price.
  // Money is the frozen quotedTotalCents via formatMoney (zero arithmetic).
  // D-99 (07-12): the reason line is rendered from the DB clock, read ONCE here and threaded into every row —
  // so "Session starts in Xh" and the row's own countdown deadline can never disagree about what time it is.
  const now = await readDbNow(db);

  // The zone decision, taken ONCE over the whole rendered inbox and never inside the map — a
  // `venueClocksVary` call against a single row is always false, and this projector shape is what makes
  // that mistake unwritable. See `venue-clock-scope.ts` for the rule and the ruling behind it.
  const listCity = resolveListCity(rows);

  const displayRows: (RequestRowData & { reason: React.ReactNode })[] = rows.map((r) => ({
    requestId: r.id,
    spaceTitle: r.title ?? "Your space",
    whenLabel: composeWhenLabelShort({
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      timezone: r.timezone,
      city: listCity(r),
      fullDay: r.fullDay,
      // This list is `status = 'requested'` only, and only `placeOpenHold` mints an open row, so nothing
      // on this page can be a drop-in pass — open capacity is instant-only (OC-10).
      openCapacity: false,
      spacePriceCents: r.spacePriceCents,
      quotedTotalCents: r.quotedTotalCents,
      dayRateCents: r.dayRateCents,
    }),
    bookerLabel: r.bookerFirstName?.trim() || "A guest",
    totalLabel: formatMoney(r.quotedTotalCents ?? 0, r.currency ?? DISPLAY_CURRENCY),
    expiresAt: (r.expiresAt ?? new Date()).toISOString(),
    // Renders NOTHING unless the deadline is genuinely cap-derived (D-96) — the whole point of D-99 is that a
    // host never reads a varying deadline as inconsistency, not that every row carries an explanation.
    reason: r.expiresAt ? (
      <RequestCountdownReason
        createdAt={r.createdAt}
        expiresAt={r.expiresAt}
        startsAt={r.startsAt}
        now={now}
      />
    ) : null,
  }));

  return (
    // The container is the DECLARED host-list shell and the title block is the DECLARED pattern, which
    // is what stops `requests/loading.tsx` drawing a different box or a different heading than the page
    // it stands in for. The `mt-8` data-region offset is this page's own and the plate copies it, exactly
    // as `/host/earnings` and its plate do.
    <div className={HOST_LIST_SHELL}>
      <PageHeader
        title="Requests"
        // The SAME expression the plate carries, character for character — see
        // `requests/loading.tsx`. `APPROVAL_SLA_HOURS` is INTERPOLATED on both sides: a hardcoded "24"
        // would be a second declaration of a payments constant on the one surface whose entire subject
        // is that deadline, and it would start lying the first time the SLA moved.
        lede={
          `Guests waiting on your yes. Approve or decline within ${APPROVAL_SLA_HOURS} hours — ` +
          `after that a request expires and the slot frees automatically.`
        }
      />

      <div className="mt-8">
        {displayRows.length === 0 ? (
          // ─────────────────────────────────────────────────────────────────────────────────────────
          // STATE-04's INBOX-ZERO CLAUSE — THE ONE DELIBERATE COPY CHANGE IN PLAN 11-16 (AC#24).
          // ─────────────────────────────────────────────────────────────────────────────────────────
          //
          // "No requests right now" states an ABSENCE; "You're all caught up" states an ACHIEVEMENT, and
          // for a work queue those are different facts about the same zero. A host who has just approved
          // their last request is being told they finished, not that something is missing.
          //
          // `tone="positive"` is the whole mechanism, and it carries EXACTLY ONE pixel of green: the
          // glyph becomes `CheckCircle2` at `text-success` (4.00 court / 3.86 grove against a 3.0
          // non-text bar, already declared in contrast-pairs.ts). The title and body stay
          // `text-foreground` / `text-muted-foreground`, and there is no `bg-success` anywhere on this
          // page or in the pattern — D-14's "green retreats to the icon" holding at panel scale with
          // zero new tones and zero new pairings. That is asserted, in both directions, by
          // tests/design/empty-state-adoption.test.ts.
          //
          // THE BODY IS UNCHANGED, BYTE FOR BYTE. It explains the request mechanism and names what
          // instant-book does differently; there was never a defect in it to fix, and rewriting shipped
          // copy that works is how a design pass turns into a rewrite nobody asked for.
          //
          // `actions={null}` ON PURPOSE (the pattern requires the prop precisely so this is a decision):
          // an empty request inbox has no next step to offer. The host cannot make a guest request a
          // space, and the two plausible buttons — "Your listings", "Earnings" — are already one click
          // away in the host header. A CTA here would be a control that does not act on this state.
          <EmptyState
            tone="positive"
            titleAs="h2"
            title="You're all caught up"
            body="When a guest requests one of your request-to-book spaces, it shows up here for you to approve or decline. Instant-book spaces confirm without a request."
            actions={null}
          />
        ) : (
          <>
            {/* Desktop: the shadcn table with real <th scope="col"> headers.

                THE DEADLINE IS THE FIRST COLUMN (D-146 · HFLOW-01). Six headers, six cells, no string
                renamed and none added or removed — the CELLS MOVED WITH THEIR HEADERS. `Actions` stays a
                real, VISIBLE column header: the shipped page renders it visibly, an `sr-only` header
                would be a copy change nobody asked for, and a triage queue whose action column has no
                name in the header row is harder to read, not tidier. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Expires</TableHead>
                    <TableHead scope="col">Guest</TableHead>
                    <TableHead scope="col">Space</TableHead>
                    <TableHead scope="col">When</TableHead>
                    <TableHead scope="col" className="text-right">
                      Guest pays
                    </TableHead>
                    <TableHead scope="col">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((data) => (
                    <TableRow key={data.requestId}>
                      <TableCell>
                        {/* The countdown COMPONENT is unchanged (D-99 adds a line, not a component);
                            what changed is the LAYOUT it is asked for. `emphasis="lead"` renders the
                            prefix at the label role above the digits at the heading role — the largest
                            type in the row — which is how D-146's "loudest" is carried by scale rather
                            than by a hue. The mobile card has asked for this since 14-03; the table had
                            not, and above `md:` that made the claim false. The reason line is its
                            sibling, muted, and never an alarm colour. */}
                        <RequestCountdown
                          expiresAt={data.expiresAt}
                          label="Expires in"
                          emphasis="lead"
                        />
                        {data.reason}
                      </TableCell>
                      {/* THE GUEST NAME AND THE MONEY FIGURE CARRY THE SAME ROLE AND NOTHING MORE.
                          `text-label` on both, so they compute an identical size and weight and neither
                          is promoted to compete with the deadline — D-146's third falsifiable is an
                          EQUALITY between these two cells, and two bare utilities that happen to agree
                          today are two chances to break it in a diff that reads as formatting. */}
                      <TableCell className="text-label">{data.bookerLabel}</TableCell>
                      <TableCell className="font-medium">{data.spaceTitle}</TableCell>
                      <TableCell className="text-label text-muted-foreground">
                        {data.whenLabel}
                      </TableCell>
                      <TableCell className="text-label text-right tabular-nums">
                        {data.totalLabel}
                      </TableCell>
                      <TableCell>
                        <RequestActions
                          requestId={data.requestId}
                          bookerLabel={data.bookerLabel}
                          whenLabel={data.whenLabel}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stacked cards (the table collapses to a card per request). */}
            <div className="space-y-3 md:hidden">
              {displayRows.map((data) => (
                <RequestRow key={data.requestId} row={data} countdownReason={data.reason} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
