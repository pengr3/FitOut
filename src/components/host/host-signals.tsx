// HostSignals — the /host dashboard's SECOND block: what needs the host, in D-140's order (HFLOW-03).
//
//   1  Requests owed              — hidden at zero
//   2  Payout state               — ALWAYS rendered, all four states
//   3  Published without hours    — hidden at zero
//
// THE ORDER IS THE DECISION, and it is not alphabetical or historical. Row 1 is somebody waiting on an
// answer with a clock running; row 2 is whether the host can be paid at all; row 3 is a listing that is
// live but unbookable. Two of the three are things a host has already half-done, and they sit BELOW
// today's sessions because a dashboard that leads with setup chores is a dashboard for the host's first
// week rather than their hundredth.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// TWO DIFFERENT CONTAINERS IN ONE BLOCK, DELIBERATELY — RECORDED SO IT DOES NOT READ AS DRIFT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
//
// Rows 1 and 3 are CALM ADVISORIES and take the declared advisory surface: the boxed panel at its muted
// tone, which is the neutral status tone at panel scale and adds no colour pairing the inventory does not
// already measure. Nothing has gone wrong in either case — a host with requests waiting has work to do,
// and a host with no weekly hours set simply has not finished setting up.
//
// Row 2 is `PayoutBanner`, which is an alerting composition, and it stays one. A payout account that is
// paused or incomplete is THE ONE GENUINE FAILURE a host can have on this page — money that cannot reach
// them — and it is the one thing here allowed to look like one. It is also structurally FROZEN by D-156:
// HFLOW-05 is a token pass over the earnings and payout surfaces, and converting this banner to a panel
// would be a restructure of a payout surface dressed as a consistency fix. ⚠ Converting it has misread
// HFLOW-05. It is passed through from here UNCHANGED, with its own props and none of ours.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THREE COUNTS, THREE OWNERS, ZERO QUERIES HERE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
//
// This component runs no query and derives no state. The pending-request count, the payout status and the
// hours-missing list all arrive as props from the page, which reads each from the authority that already
// owns it. That matters most for the first: the pending-request predicate has THREE consumers — the
// `(host)` layout's streamed nav badge, this row, and the `/host/requests` inbox — and they are kept
// identical rather than consolidated, so that a seeded host with N requests reads the same N in all
// three. Consolidating them here would move an owner-scoped read into a presentational component.
//
// EVERY SENTENCE IS A SHARED CONSTANT, AND NEITHER SET IS RETYPED. Row 3's three strings are
// `hours-signal.ts`'s own exports, imported — together with the shipped one-versus-many assembly, which
// names a single listing and counts several, because "1 listing" makes a host go looking for which one.
// Row 1's are `requests-signal.ts`'s, which exists for the same reason and is the same shape.
//
// A SERVER COMPONENT — no directive prologue. `PayoutBanner` is a client component and stays one; a
// server component rendering a client child is the ordinary boundary, not a special case.

import Link from "next/link";

import { PanelCard } from "@/components/patterns/panel-card";
import { PayoutBanner } from "@/components/host/payout-banner";
import type { PayoutStatus } from "@/components/host/payout-status";
import {
  HOURS_MISSING_STATE,
  HOURS_MISSING_REASON,
  HOURS_MISSING_CTA,
  type ListingMissingHours,
} from "@/lib/listing/hours-signal";
import {
  composeRequestsWaitingSentence,
  REQUESTS_WAITING_CTA,
} from "@/lib/host/requests-signal";

/** The block's own heading. Present for the outline, visually redundant beside the rows it titles. */
export const SIGNALS_HEADING = "What needs you";

export type HostSignalsProps = {
  /**
   * `booking JOIN listing WHERE listing.host_id = :me AND booking.status = 'requested'`, counted by the
   * page. Row 1 is hidden entirely at zero — a signal that fires with nothing to say is noise a host
   * learns to scroll past, which is the same rule the nav badge already follows.
   */
  pendingRequests: number;
  /** Derived by the page from the host's payout row; webhook-set, never inferred from a redirect. */
  payoutStatus: PayoutStatus;
  /** The host's OWN published, non-deleted listings with zero weekly-hours rows. Empty hides row 3. */
  missingHours: readonly ListingMissingHours[];
};

export function HostSignals({ pendingRequests, payoutStatus, missingHours }: HostSignalsProps) {
  // The shipped one-versus-many assembly, preserved: one listing is NAMED, because "1 listing" makes a
  // host go looking for which; several are COUNTED, because naming them all here would be a second
  // listings page. Assembled as ONE string — SWC's whitespace transform drops the leading space of text
  // following an expression container (the "₱300.00in cancellation fees" lesson).
  const hoursNudge =
    missingHours.length === 1
      ? `${HOURS_MISSING_STATE} on “${missingHours[0].title || "your listing"}”. ${HOURS_MISSING_REASON}`
      : `${HOURS_MISSING_STATE} on ${missingHours.length} of your live listings. ${HOURS_MISSING_REASON}`;

  // One listing → straight into its own availability editor (the route its card already links to);
  // several → the grid, where each affected card carries its own editor link. Both are existing routes;
  // there is deliberately no third one.
  const hoursNudgeHref =
    missingHours.length === 1
      ? `/host/listings/${missingHours[0].id}/availability`
      : "/host/listings";

  return (
    <section aria-labelledby="host-signals-heading" data-testid="host-signals" className="space-y-4">
      {/* A real heading rather than a paragraph dressed as one, and screen-reader-only rather than
          absent: the rows below are three unrelated advisories, and a document outline that jumps from
          today's sessions straight into them gives a keyboard or screen-reader user no way to skip the
          block. Nothing is announced twice — there is no visible title here to duplicate. */}
      <h2 id="host-signals-heading" className="sr-only">
        {SIGNALS_HEADING}
      </h2>

      {/* ── SIGNAL 1 — requests owed. The state, the reason and the way out (rule O7), from the module
             that owns them beside the count's authority. */}
      {pendingRequests > 0 && (
        <PanelCard tone="muted">
          <p className="text-body text-muted-foreground" data-requests-waiting={pendingRequests}>
            {composeRequestsWaitingSentence(pendingRequests)}{" "}
            <Link href="/host/requests" className="underline underline-offset-4">
              {REQUESTS_WAITING_CTA}
            </Link>
          </p>
        </PanelCard>
      )}

      {/* ── SIGNAL 2 — payout state. Passed through UNCHANGED and rendered in all four states, including
             the settled one: a host who has finished payout onboarding is told so once, on the surface
             they land on, and that sentence is the only place the product confirms money can reach them.
             D-156 freezes this component structurally; nothing here reaches into it. */}
      <PayoutBanner status={payoutStatus} />

      {/* ── SIGNAL 3 — published without hours (v1.0 audit finding #4). The gate stops the sale; this
             signal tells the host why and how to fix it. Calm muted information rather than an alerting
             composition, for the reason the file header gives about rows 1 and 3: nothing has gone
             wrong, the host simply has not finished setting up.

             `data-hours-missing` stays on the paragraph, where the shipped surface put it. It is not a
             declared test hook, so the undeclared-hook ban does not reach it, and moving it onto the
             pattern's root would need a passthrough prop no other adopter wants. */}
      {missingHours.length > 0 && (
        <PanelCard tone="muted">
          <p className="text-body text-muted-foreground" data-hours-missing={missingHours.length}>
            {hoursNudge}{" "}
            <Link href={hoursNudgeHref} className="underline underline-offset-4">
              {HOURS_MISSING_CTA}
            </Link>
          </p>
        </PanelCard>
      )}
    </section>
  );
}
