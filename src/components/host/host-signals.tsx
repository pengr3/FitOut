// HostSignals — the /host dashboard's SECOND block: what needs the host, in D-140's order (HFLOW-03).
//
//   1  Requests owed              — hidden at zero
//   2  Published without hours    — hidden at zero
//
// Both remaining rows are calm advisories beneath the new verification roadmap. Payout and identity
// state moved into that roadmap in Phase 21, so rendering either legacy row here would duplicate both
// state and action ownership. This server component performs no reads: the page supplies the owner-
// scoped request count and missing-hours rows from their existing authorities.

import Link from "next/link";

import { PanelCard } from "@/components/patterns/panel-card";
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
  /** The host's OWN published, non-deleted listings with zero weekly-hours rows. Empty hides row 3. */
  missingHours: readonly ListingMissingHours[];
};

export function HostSignals({
  pendingRequests,
  missingHours,
}: HostSignalsProps) {
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

      {/* ── SIGNAL 2 — published without hours (v1.0 audit finding #4). The gate stops the sale; this
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
