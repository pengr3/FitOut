// HostAgenda — the /host dashboard's LEAD block (HFLOW-03 · 14-CONTEXT D-140, D-142).
//
// WHAT IT IS. Today's real sessions, as a list. Not a tile grid, not counts, not a percentage. D-140's
// whole argument is one sentence: a host with three sessions today must be able to answer *who is coming
// and when* without a second click, and a counts-and-links grid is the one shape that cannot answer it.
// So the row's TITLE is the booker's first name — a host already knows which spaces they own; what they
// cannot see is who is arriving.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THREE STATES, ONE CONTAINER — AND THE CONTAINER IS PRESENT IN ALL THREE ON PURPOSE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
//
//   A  sessions today      → an unordered list of RowCards          (the populated branch hook)
//   B  quiet day           → one muted-tone PanelCard, one sentence (the quiet branch hook)
//   C  nothing booked      → one EmptyState                         (the none branch hook)
//
// An assertion of the form *"the agenda renders"* is satisfied by an ABSENT section — the vacuity shape
// this repository has recorded a dozen times. The section, its heading and its route-out are therefore
// rendered unconditionally, and the three states are told apart by WHICH CHILD the container holds. That
// is what `tests/host/agenda-states.test.tsx` asserts first, before it asserts anything about contents.
//
// STATE C IS AN ABSENCE, NEVER A FAILURE (T-11-FALSEALARM, restated by this phase as T-14-05-FALSEALARM).
// No retry affordance, no alerting role, no alarm tone, no error vocabulary. A host who has simply not
// been booked yet has nothing to recover from.
//
// AND STATE C'S BODY ASSERTS NO BOOKABILITY. "Your spaces are live and bookable" would be FALSE for a host
// whose payouts are paused and false for a listing with no weekly hours — both of which the signal rows
// three inches below are simultaneously saying. The sentence describes the MECHANISM instead.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THIS COMPONENT COMPUTES NOTHING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
//
// Every prop below arrives already composed, exactly as `host-booking-row.tsx` (the sibling analog in this
// directory) takes its own: the venue-local window label comes pre-composed from the ONE shared composer
// (`src/lib/booking/when-label.ts`), the booker label is resolved server-side, and the clock arrives as a
// prop. There is no clock read, no calendar arithmetic and no money arithmetic anywhere in this file —
// D-141 requires the DB clock to be read ONCE per request and threaded, and a second read here would
// reintroduce exactly the drift D-141 forbids while failing nothing.
//
// NO MONEY ON THE AGENDA ROW, AND THAT IS THE DESIGN CONTRACT RATHER THAN AN OMISSION. 14-UI-SPEC
// § The agenda row enumerates the row's slots as title / meta / status / href, with actions deliberately
// absent, and D-140 names four fields: booker first name, space title, venue-local window, status. The
// dashboard is a VIEW; the frozen total is on the inbox row, where a host is deciding, and on the booking
// detail this row links to.
//
// NO ACTIONS EITHER. Approve and decline live on /host/requests and nowhere else — two places carrying a
// destructive, irreversible action is two places that must be kept in agreement (D-144).
//
// ⚠ THE ROWS ARE NOT INSIDE A PANEL. A row card nested in a panel pays the block padding twice and is the
// trap `card-pattern-coverage.test.ts`'s own header records; the agenda is a heading plus rows on the page
// ground. Every container in this file is one of the three declared patterns — there is no hand-rolled box
// here and there must not be one (DS-11 says THREE).
//
// A SERVER COMPONENT, like every row in this directory — no directive prologue, no client hooks.

import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";

import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import type { BookingDbStatus } from "@/components/booking/booking-status";
import { EmptyState } from "@/components/patterns/empty-state";
import { PanelCard } from "@/components/patterns/panel-card";
import { RowCard } from "@/components/patterns/row-card";

/**
 * The booker label a host sees when the guest's first name is withheld.
 *
 * The literal is already typed at six shipped call sites (`/host/bookings`, `/host/bookings/[id]`,
 * `/host/requests`, and three server actions), which is why it is EXPORTED here rather than typed a
 * seventh time: the page that composes this agenda imports it. 14-UI-SPEC § Copywriting lists it as the
 * agenda row's own copy, so this module — the surface — is where it belongs.
 */
export const WITHHELD_BOOKER_LABEL = "A guest";

/** The agenda's `<h2>`. The single word, with NO date beside it — see the section's own note below. */
export const AGENDA_HEADING = "Today";

/** The route-out in the heading row: the one host destination the dashboard has no other path to. */
export const AGENDA_ROUTE_OUT_LABEL = "View all bookings";

/** State C's title. An absence, stated as one — never "no bookings found" and never an error. */
export const AGENDA_NONE_TITLE = "Nothing booked yet";

/**
 * State C's body. It describes the MECHANISM and asserts nothing about bookability, because the payout
 * banner and the hours signal below this block may simultaneously be saying the opposite.
 */
export const AGENDA_NONE_BODY =
  "When someone books one of your spaces, their session shows up here on the day it happens.";

/** State B's lead clause. Assembled into one string below — never interleaved with JSX text. */
const AGENDA_NEXT_LEAD = "Nothing today — next:";

/** One session on today's agenda. Every field is a value the SERVER already resolved. */
export type HostAgendaRowData = {
  bookingId: string;
  /**
   * The booker's FIRST NAME, or `WITHHELD_BOOKER_LABEL` — resolved server-side, exactly as
   * `host-booking-row.tsx` and `request-row.tsx` take theirs. First name only: no surname, no email, no
   * phone crosses onto this surface (T-14-05-PII).
   */
  bookerLabel: string;
  /** The listing's own title, as stored. Rendered in the meta line, never as the row title (D-140). */
  spaceTitle: string;
  /**
   * The pre-composed, venue-tz-safe window label — `composeWhenLabelShort`'s short form, produced by the
   * ONE shared composer. This surface must never grow a second one.
   */
  whenLabel: string;
  /** The stored lifecycle status; the badge derives what to say from it. */
  status: BookingDbStatus;
  /** Threaded to the badge so a booker-cancelled request reads Cancelled rather than Declined (T8). */
  cancelledBy: string | null;
  /** The window's end instant — the badge's own input, never rendered by this file. */
  endsAt: Date;
};

/**
 * D-142's quiet-day row, already broken into the three tokens the copy contract's shape names.
 *
 * Split rather than handed over as one finished sentence, because the SENTENCE belongs to this surface
 * (that is the pattern layer's sharpest rule, stated in `empty-state.tsx`'s header) while the venue-local
 * weekday, date and time belong to the composer that knows the zone.
 */
export type HostAgendaNextData = {
  /** Venue-local weekday and date, pre-composed — e.g. the short weekday-and-month form. */
  dateLabel: string;
  /** Venue-local start time, pre-composed. */
  timeLabel: string;
  /** The listing's own title. */
  spaceTitle: string;
};

export type HostAgendaProps = {
  /** Today's sessions in each venue's OWN local day, soonest first. Empty selects state B or C. */
  rows: readonly HostAgendaRowData[];
  /**
   * The soonest strictly-future session, or null.
   *
   * `queryHostAgenda` already returns null here whenever `today` is non-empty (14-02), so "both at once"
   * is unrepresentable and this file adds no guard against it. The branch below reads `rows.length` first
   * purely because state A is the state a busy host is in.
   */
  next: HostAgendaNextData | null;
  /**
   * The DB clock, read ONCE per request via `readDbNow(db)` and threaded (D-141). It reaches the badge
   * from here so the row, the badge and the query can never disagree about what time it is.
   */
  now: Date;
};

export function HostAgenda({ rows, next, now }: HostAgendaProps) {
  return (
    <section aria-labelledby="host-agenda-heading" data-testid="host-agenda" className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        {/*
          THE HEADING CARRIES NO DATE, AND THAT IS A DECISION RATHER THAN AN OMISSION (D-141).

          A host whose listings span two zones has two "todays". A single date under this heading would be
          false for one of them at exactly the hours the distinction matters, and it would be false
          SILENTLY. Each row carries its own venue-local instant, which is the truth at row scale; the
          heading stays at the scale where the product can still be honest.

          A real second-level heading, never a paragraph dressed as one — 14-UI-SPEC § Typography rule 3.
        */}
        <h2 id="host-agenda-heading" className="text-heading">
          {AGENDA_HEADING}
        </h2>
        {/*
          The route-out the dashboard does not have today at all. /host/listings and /host/bookings are the
          two host destinations that are NOT permanent nav slots; the first keeps its header button and the
          second is reached from here.
        */}
        {/*
          ⚠ THE VERTICAL PADDING IS A HIT AREA, NOT SPACING, AND IT WAS MEASURED (plan 14-16 · AC#36).
          Without it this link is a 111.6 x 20 box: a flex item is blockified, so it is NOT covered by
          WCAG 2.5.8's own exception for a target laid out INSIDE A SENTENCE — and this one is not in a
          sentence, it is a standalone control in a heading row. 20px is four under the AA bar, on the
          dashboard's only route to the bookings list. `e2e/overflow-320.spec.ts`'s Phase-14 block found
          it on its first run and named it: `a[View all bookings] 111.6x20`.

          `py-1` rather than a min-height: the parent aligns on the BASELINE, so padding grows the box
          around the text and leaves the label sitting on the same line as `Today` — a min-height with
          centred content would have moved it off that baseline to buy the same four pixels.
        */}
        <Link
          href="/host/bookings"
          className="shrink-0 py-1 text-label underline underline-offset-4"
        >
          {AGENDA_ROUTE_OUT_LABEL}
        </Link>
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-3" data-testid="agenda-rows">
          {rows.map((row) => (
            <li key={row.bookingId}>
              <AgendaRow row={row} now={now} />
            </li>
          ))}
        </ul>
      ) : next ? (
        <div data-testid="agenda-next">
          {/*
            STATE B — the quiet day. A muted-tone panel is the declared calm-advisory surface; nothing has
            gone wrong here, so this is deliberately not the alerting composition the payout banner uses.

            ONE STRING, ASSEMBLED IN JS. Interleaving JSX text with expression containers loses the leading
            space of any text following one (the "₱300.00in cancellation fees" lesson recorded on
            `(host)/host/page.tsx:75`), and this sentence is four tokens joined by separators.
          */}
          <PanelCard tone="muted">
            <p className="text-body text-muted-foreground">
              {`${AGENDA_NEXT_LEAD} ${next.dateLabel} · ${next.timeLabel} · ${next.spaceTitle}`}
            </p>
          </PanelCard>
        </div>
      ) : (
        <div data-testid="agenda-none">
          {/*
            STATE C — nothing booked. `tone` is left at its neutral default DELIBERATELY: the positive tone
            is STATE-04's inbox-zero clause, an emptied WORK QUEUE is an achievement, and a host who has
            not been booked yet has achieved nothing. `empty-state-adoption.test.ts` pins the positive tone
            to a declared set of exactly one product surface, which is the request inbox and not this.

            `actions={null}` is passed ON PURPOSE — the pattern requires the prop precisely so a caller with
            nothing to offer says so. There is no next step to name here: the host's spaces may already be
            live, and every setup step that is genuinely outstanding is named by the signal rows below.

            `titleAs="h3"` because this block sits under this section's own second-level heading.
          */}
          <EmptyState
            icon={CalendarDaysIcon}
            titleAs="h3"
            title={AGENDA_NONE_TITLE}
            body={AGENDA_NONE_BODY}
            actions={null}
          />
        </div>
      )}
    </section>
  );
}

/**
 * One session, as a `RowCard`.
 *
 * The row HAS an `href` — unlike `request-row.tsx`, whose terminality D-144 settled. The distinction is
 * the surface's purpose: an inbox is a triage queue where browsing away is the defect, and the dashboard
 * is a view whose whole job is to get a host to the thing they were looking at.
 */
function AgendaRow({ row, now }: { row: HostAgendaRowData; now: Date }) {
  // A blank title is the one failure mode the withheld-booker fallback exists to prevent, and a caller
  // that hands over an empty string would produce exactly that — a nameless row on the surface whose
  // entire point is naming who is arriving. Normalised here so the guarantee survives the call site.
  const title = row.bookerLabel.trim() || WITHHELD_BOOKER_LABEL;

  return (
    <RowCard
      href={`/host/bookings/${row.bookingId}`}
      /* THE BOOKER'S FIRST NAME IS THE TITLE, NOT THE SPACE (D-140). This one line is the difference
         between the dashboard the PM chose and the tile grid they rejected. */
      title={title}
      /* One string, for the same whitespace reason state B's sentence is one. The space title and the
         window are two separately-composed tokens joined by the separator the copy contract names. */
      meta={`${row.spaceTitle} · ${row.whenLabel}`}
      status={
        <BookingStatusBadge
          status={row.status}
          endsAt={row.endsAt}
          now={now}
          side="host"
          cancelledBy={row.cancelledBy}
        />
      }
      /* No `media` — this row has never had a thumbnail, and the pattern omits the box rather than
         drawing an empty square. No `actions` — see the file header. */
    />
  );
}
