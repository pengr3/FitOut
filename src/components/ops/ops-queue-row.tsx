"use client";

// OPS-04 / D-246 — THE REVIEW-QUEUE ROW. Everything a reviewer needs to decide, on the row itself, at
// every width, from one component tree.
//
// A CLIENT ISLAND because it owns the decision controls' state, and it lives under `src/components/ops/`
// rather than in `patterns/` because it imports ops domain types and product copy. It COMPOSES
// `RowCard`; it never forks the pattern and it opens no container of its own.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ROW IS TERMINAL, AND THAT IS A DECISION RATHER THAN AN INHERITANCE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `RowCard`'s optional `href` stays UNUSED. This is 14-CONTEXT D-144 applied to a second triage queue,
// and here it is not merely a preference: a detail page you click into to see the photos is precisely
// what OPS-04 and D-246 forbid — one page, one queue, everything on the same screen. A queue that
// browses is no longer a queue, and a second place carrying approve/reject is a second place that has
// to be kept in agreement with this one.
//
// `tests/ops/ops-queue-row.test.tsx` holds it as a RENDERED fact — so a later plan that adds a
// destination fails there rather than in review.
//
// ⚠ AND SINCE PLAN 18.1-13 THE ANCHOR CLAUSE IS "ZERO EXCEPT ONE SCHEME", NOT "ZERO". D-271 puts the
// host CONTACT REVEAL on both row kinds, and a revealed row renders at most ONE anchor, whose href
// begins `mailto:`. THAT IS NOT A WEAKENING AND THE DIFFERENCE IS THE WHOLE POINT: a `mailto:` is a
// COMPOSE ACTION, not navigation — pressing it opens the operator's mail client and the row itself
// still browses NOWHERE. The `[role="link"]` clause stays at ZERO, unchanged; the exemption is one
// scheme, one count, one reason, declared in the assertion's own failure message; and the
// guard-the-guard case that proves the selector can find an anchor at all is untouched. Deleting the
// clause instead would license a DESTINATION on the row — the detail page you click into to see the
// photos — which is exactly what this decision exists to prevent.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NO MEDIA SLOT: THE PHOTOS GO IN THE BODY, AT A SIZE A PERSON CAN JUDGE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `RowCard`'s media box is a 48px square, and a 48px thumbnail is useless as evidence of whether a
// space is real — which is the entire question this queue exists to answer. The pattern omits the box
// rather than drawing an empty one, so the slot is simply not passed and `PhotoGallery` is reused
// VERBATIM in `children` instead. Zero new photo code: the six templates, the alt strings, the
// full-screen lightbox and the collapse below `sm:` are all shipped and already pinned by
// `tests/listing/photo-gallery.test.tsx`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ONE COMPONENT TREE AT EVERY WIDTH — A DELIBERATE DEPARTURE FROM `/host/requests`
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The host inbox renders a desktop table beside a stacked card. This surface renders ONE tree, and two
// reasons make it so, either of which alone would be sufficient:
//
//   1. A SECOND TREE RENDERS EVERY PHOTO TWICE IN ONE DOCUMENT. The queue's whole subject is
//      photographs; duplicating them for a tree that is not displayed at that width doubles the image
//      bytes on the one surface where the images are the point.
//   2. A SIX-COLUMN TABLE CANNOT CARRY A PHOTO MOSAIC. The shape that works at the desktop width is
//      the shape that works at the 320px floor — a card with a picture in it — so there is nothing for
//      a second tree to say.
//
// All responsiveness is CSS. There is no viewport read of any kind in this file, no horizontal-scroll
// strip and no `ScrollArea` (which hardcodes a vertical scrollbar; a horizontal orientation is
// requested nowhere in `src/`). At the floor, `PhotoGallery`'s shipped collapse gives the hero alone at
// 16/9 plus `Show all N photos` into the full-screen lightbox — a strictly better inspection surface on
// a phone than five thumbnails would be.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ A HOST ROW SHOWS NO DOCUMENT, NO IMAGE AND NO ID NUMBER, BECAUSE NONE EXISTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// HVER-02 / D-206 / D-220 forbid the column, `OpsQueueHostItem` therefore has no field for one, and
// this row must not be designed with a placeholder implying something is coming. NO panel, NO empty
// state for one, NO disabled control that suggests it. Fabricating the AFFORDANCE for a check that
// does not exist is the same defect as fabricating the sentence, one level up from copy — and the
// host row's assertions in the spec beside this file are what keep it that way.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// EVERY FIGURE AND EVERY DATE ARRIVES FINISHED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The money strings and the date strings are computed in the RSC and passed in. That is PROJECT D-130 /
// GATE-05 for the money — this component performs no arithmetic on any of it — and it is the shipped
// `whenLabel` idiom for the dates, which keeps a viewer's clock and locale out of a client render.

import { useState } from "react";

import { OpsContactReveal } from "@/components/ops/ops-contact-reveal";
import { OpsDecisionActions } from "@/components/ops/ops-decision-actions";
import { Fact, ROW_MONEY_CLASS } from "@/components/ops/ops-row-fact";
import { PhotoGallery } from "@/components/listing/photo-gallery";
import { RowCard } from "@/components/patterns/row-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HostVerificationStatus } from "@/lib/db/schema";
import { deriveWeekStrip } from "@/lib/availability/week-strip";
import type { OpsCancelImpact } from "@/lib/ops/cancel-impact";
import type { OpsQueueHostItem, OpsQueueListingItem } from "@/lib/ops/review-queue";
import {
  AMENITY_LABELS,
  SPACE_TYPE_LABELS,
  type AmenityValue,
  type SpaceTypeValue,
} from "@/lib/listing-vocab";

/**
 * The wait figure's class — the row's LEAD.
 *
 * "Loudest" is SCALE AND POSITION, never a hue: the heading role is the largest type in the row and
 * `RowCard`'s `status` slot puts it on the row's FIRST line. 14-CONTEXT D-146's device applied to a
 * second triage queue, on the same argument — an ops reviewer works the queue by age, so age leads. No
 * colour is added to carry it, and no other element in this row is given this role.
 */
const ROW_LEAD_CLASS = "text-heading tabular-nums";

/** Both kinds carry these, and both arrive finished from the RSC. */
export type OpsQueueRowLabels = {
  /** The wait figure — the row's lead. Computed against the DB clock, never `Date.now()` in a render. */
  waitLabel: string;
  /** The submitted date. The wait figure is relative; this is what an operator quotes in a dispute. */
  submittedLabel: string;
};

/**
 * A host awaiting verification, plus its finished labels.
 *
 * ⚠ NOTHING HERE CAN CARRY A DOCUMENT REFERENCE, and that is enforced by the domain type rather than
 * by this file's discipline: `OpsQueueHostItem` has no field for one because the column does not exist.
 */
export type OpsQueueHostRow = OpsQueueHostItem &
  OpsQueueRowLabels & {
    /** `formatMemberSince(createdAt)` — "Account since", formatted in the RSC. */
    accountSinceLabel: string;
  };

/** A listing awaiting review, plus its finished labels and the figures its rejection would move. */
export type OpsQueueListingRow = OpsQueueListingItem &
  OpsQueueRowLabels & {
    /** The host's advertised rate, already through `formatMoney` server-side. */
    priceLabel: string;
    /**
     * What rejecting this listing would do to the bookings already on it — every figure a finished
     * string, and the ids the escalation would act on.
     *
     * REQUIRED, never optional. An optional impact would let a page render a listing row whose reject
     * dialog silently had no money block and no lever, which is the one shape 18-UI-SPEC forbids by
     * name: an operator would choose a lighter lever they were never offered the alternative to.
     */
    impact: OpsCancelImpact;
  };

/**
 * ONE queue item, as the row renders it.
 *
 * A DISCRIMINATED UNION on `kind`, branched on the DISCRIMINANT below, with every per-kind lookup keyed
 * as a TOTAL `Record` over it — `payout-state-badge.tsx:53-62`'s exhaustiveness lesson, so a third kind
 * fails to COMPILE rather than throwing at runtime in front of an operator.
 */
export type OpsQueueRowItem = OpsQueueHostRow | OpsQueueListingRow;

type OpsQueueKind = OpsQueueRowItem["kind"];

/** The word that opens the meta line. A total `Record`, so a third kind cannot reach a default. */
const KIND_LABEL: Record<OpsQueueKind, string> = {
  host: "Host",
  listing: "Listing",
};

/** A title that is always a string — a listing may genuinely have none yet, and a blank line is worse. */
const MISSING_TITLE: Record<OpsQueueKind, string> = {
  host: "A host",
  listing: "Untitled listing",
};

/**
 * THE OTHER TERM OF THE SELL-GATE, IN WORDS AN OPERATOR CAN ACT ON.
 *
 * A total `Record` over the pgEnum-derived union, so a seventh status is a compile error here rather
 * than a blank cell in front of somebody deciding whether approving a listing actually makes it
 * sellable. Both terms are needed to know that, and one of them is not on the listing's own record.
 *
 * `grandfathered` reads as never checked, deliberately. It is INVISIBLE on host surfaces (D-211/D-212)
 * because the host experienced no change and telling them invites a question nobody can answer — but
 * this is not a host surface, and an operator who could not tell a checked host from an ungated one
 * would be guessing at exactly the moment the gate matters.
 */
const HOST_VERIFICATION_LABEL: Record<HostVerificationStatus, string> = {
  unverified: "not checked yet",
  pending: "waiting on a decision",
  approved: "checked",
  rejected: "not approved",
  grandfathered: "never checked",
  suspended: "hosting paused",
};

/** The listing's street address, assembled from the parts that are actually present. */
function addressOf(row: OpsQueueListingRow): string {
  const parts = [
    row.addressLine1,
    row.addressLine2,
    row.city,
    row.region,
    row.postalCode,
    row.country,
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  // An address a host has not finished is a REAL state a reviewer should see as such — never a blank
  // cell, which reads as "fine" rather than as "there is nothing here to check".
  return parts.length > 0 ? parts.join(", ") : "No address on the listing";
}

/** The space-type label, falling back to the raw value rather than to a blank. */
function spaceTypeOf(value: string | null): string {
  if (value === null) return "Not set";
  return SPACE_TYPE_LABELS[value as SpaceTypeValue] ?? value;
}

export function OpsQueueRow({ row }: { row: OpsQueueRowItem }) {
  // BRANCHED ON THE DISCRIMINANT, once, at the top. Everything below reads a narrowed type.
  const isListing = row.kind === "listing";
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const title = isListing
    ? (row.title ?? MISSING_TITLE.listing)
    : (row.hostName ?? MISSING_TITLE.host);

  const meta = isListing
    ? `${KIND_LABEL.listing} · ${spaceTypeOf(row.primarySpaceType)} · ${row.city ?? "No city"}`
    : `${KIND_LABEL.host} · ${row.listingsWaiting} listing${row.listingsWaiting === 1 ? "" : "s"} waiting`;

  return (
    <RowCard
      /* NO `href` and NO `media` — both absences are decisions, and both are argued in the header. */
      title={title}
      meta={meta}
      status={<p className={ROW_LEAD_CLASS}>{row.waitLabel}</p>}
      actions={
        !isListing ? (
          <OpsDecisionActions
            subject={{
              kind: "host",
              userId: row.userId,
              label: title,
              hostLabel: title,
            }}
          />
        ) : null
      }
    >
      {isListing ? (
        <div className="space-y-4">
          <OpsDecisionActions
            subject={{
              kind: "listing",
              listingId: row.listingId,
              label: title,
              hostLabel: row.hostName ?? MISSING_TITLE.host,
              impact: row.impact,
            }}
          />
          <Button
            type="button"
            variant="outline"
            aria-expanded={evidenceOpen}
            aria-controls={`listing-evidence-${row.listingId}`}
            onClick={() => setEvidenceOpen((open) => !open)}
          >
            {evidenceOpen ? "Hide listing evidence" : "Show listing evidence"}
          </Button>
          {evidenceOpen ? (
            <section
              id={`listing-evidence-${row.listingId}`}
              aria-label="Listing evidence"
              className="space-y-6"
            >
              <PhotoGallery photos={row.photos} title={title} />
              <dl className="space-y-1.5">
                <div className="space-y-1">
                  <dt className="text-label text-muted-foreground">Description</dt>
                  <dd className="text-label whitespace-pre-wrap break-words">
                    {row.description ?? "Not set"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-label text-muted-foreground">Amenities</dt>
                  <dd className="text-label">
                    {row.amenities.length === 0 ? (
                      "Not set"
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {row.amenities.map((amenity) => (
                          <li key={amenity}>
                            <Badge variant="outline">
                              {AMENITY_LABELS[amenity as AmenityValue] ?? amenity}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
                <Fact term="Address">{addressOf(row)}</Fact>
                <Fact term="Space type">{spaceTypeOf(row.primarySpaceType)}</Fact>
                <Fact term="Capacity">
                  {row.maxOccupancy === null ? "Not set" : `${row.maxOccupancy} people`}
                </Fact>
                <Fact term="Price" valueClass={ROW_MONEY_CLASS}>
                  {row.priceLabel}
                </Fact>
                <Fact term="Operating hours">
                  <ul className="space-y-1">
                    {deriveWeekStrip(row.operatingHours).map((day) => (
                      <li key={day.dayOfWeek}>{day.sentence}</li>
                    ))}
                  </ul>
                </Fact>
                <Fact term="Host">
                  {(row.hostName ?? MISSING_TITLE.host) +
                    ` — ${HOST_VERIFICATION_LABEL[row.hostVerificationStatus]}`}
                </Fact>
                <Fact term="Submitted">{row.submittedLabel}</Fact>
                <OpsContactReveal
                  userId={row.hostId}
                  hostLabel={row.hostName ?? MISSING_TITLE.host}
                />
              </dl>
            </section>
          ) : null}
        </div>
      ) : (
        <dl className="space-y-1.5">
          <Fact term="Account since">{row.accountSinceLabel}</Fact>
          <Fact term="Email confirmed">{row.emailVerified ? "Yes" : "Not yet"}</Fact>
          <Fact term="Listings waiting" valueClass={ROW_MONEY_CLASS}>
            {row.listingsWaiting}
          </Fact>
          <Fact term="Submitted">{row.submittedLabel}</Fact>
          {/* The same affordance on the other kind — see the listing branch above. `title` is the
              host's own name here, which is the same string the two decision controls are named
              after, so the row's three accessible names all quote one subject. */}
          <OpsContactReveal userId={row.userId} hostLabel={title} />
        </dl>
      )}
    </RowCard>
  );
}
