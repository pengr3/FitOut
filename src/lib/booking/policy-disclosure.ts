// TRUST-03's on-screen half, composed in ONE place — the props `CancellationPolicyDisclosure` needs,
// plus the peso figure that makes the promise concrete instead of merely dated.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS MODULE EXISTS AT ALL, WHEN THE COMPONENT ALREADY EXISTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The component performs NO date math and NO money arithmetic, by its own header rule: the boundary
// INSTANTS arrive already computed and already formatted venue-local, and the index of the best rung
// still open arrives as a number. That contract is right, and it means every call site has to do the
// same four-step composition — `rungBoundaries` → `composeDeadlineLabel` per rung →
// `bestFutureRungIndex` → the already-open predicate — before it can render anything.
//
// `listings/[id]/book/page.tsx:441-461` does exactly that, inline. Adding a second inline copy on the
// booking detail page would have made the drift this whole apparatus exists to prevent a two-file
// problem instead of a one-file one, and — the part that decided it — an inline composition inside an
// async page component is not reachable by a test. A page module may export nothing but `default`,
// `metadata` and Next's own handful of route segment config keys, so there is no seam to assert
// against; the only alternative was to RESTATE the composition in the test, which proves that the test
// can do arithmetic and nothing about the page.
//
// So the composition became a named, pure function, and `tests/booking/cancellation-policy.test.ts`
// drives THIS rather than a restatement of it: every boundary the composer discloses is fed straight
// back into `quoteRefund`, and the two must agree on the dot and one millisecond later. That is the
// same "disclosure == enforcement" property the file's existing cases assert for the component, now
// asserted for the surface that renders it.
//
// ⚠ `book/page.tsx` STILL COMPOSES ITS OWN, and that is recorded rather than hidden. Adopting this
//   module there is a correct and small change, and it is not this plan's file to make — the checkout
//   page is Phase 12's surface with its own suites. Until it adopts, "one owner" is a claim about the
//   detail page only. The compositions are identical today; the test below pins this one against the
//   ladder, which is what would catch them diverging.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE TIER IS THE ROW'S SNAPSHOT, AND A NULL SNAPSHOT DISCLOSES NOTHING
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// PROJECT D-67: `booking.cancellation_policy` is frozen at creation, and it is what `quoteRefund` will
// read at cancel time — so sourcing the disclosure from the listing's CURRENT tier could show a booker
// terms the refund engine will not apply (T-07-90).
//
// A NULL snapshot is passed through as null, NOT through `tierOrDefault`. That is deliberate and it is
// the component's own documented rule: `tierOrDefault` exists so the refund ENGINE has a safe fallback
// for legacy rows, and Flexible is the most generous rung on the ladder, so no booker is ever worse off
// than what they were shown. Presenting that internal safety net as "this host's cancellation policy"
// would put a promise in a host's mouth they never made. `cancel/page.tsx` calls `tierOrDefault`
// because it must QUOTE money; a disclosure that shows nothing is the conservative failure.
//
// PURE. No `@/lib/db` import, no clock read of its own — `now` is an argument, and every caller reads
// it from Postgres (the 07-06 boundary contract). No `server-only` guard either, matching
// `@/lib/payments/cancellation` itself: nothing here is a secret, and the module a client could import
// would still only be able to restate the ladder it is already shown.

import {
  bestFutureRungIndex,
  quoteRefund,
  rungBoundaries,
  type CancellationTier,
} from "@/lib/payments/cancellation";
import { composeDeadlineLabel } from "@/lib/booking/when-label";

/** Everything a surface needs to render the disclosure, plus today's figure. All of it finished. */
export type PolicyDisclosure = {
  /** The booking's SNAPSHOT tier, passed through. `null` ⇒ the component renders nothing. */
  tier: CancellationTier | null;
  /**
   * One pre-formatted venue-local instant per rung, index-aligned with `LADDER[tier]`.
   * `undefined` when there is no tier — which is also the component's "generic mode" signal, and is
   * unreachable here because a null tier renders nothing at all.
   */
  boundaryLabels: string[] | undefined;
  /**
   * T4-rung — the index of the best rung whose boundary is still in the future, or `-1` once every
   * one has lapsed. Computed here so the summary line can never advertise a window that has closed.
   */
  bestRungIndex: number | undefined;
  /** WR-05 — the drop-in pass whose day has already opened. Always false for an exclusive booking. */
  windowAlreadyOpen: boolean;
  /** The anchor word fork the component takes: the session start, or the venue's opening instant. */
  openCapacity: boolean;
  /**
   * WHAT COMES BACK IF THE BOOKER CANCELS RIGHT NOW, in cents — the same `quoteRefund` call, on the
   * same snapshot tier and the same DB clock, that `cancel/page.tsx` makes and that
   * `cancelBookingAsBooker` re-makes at cancel time.
   *
   * `null` when there is no tier to quote against. It is the figure that turns TRUST-03's *"the
   * cancellation deadline as a concrete date"* into *"…with today's refund amount"*: a percentage
   * beside a date still leaves the booker doing the arithmetic that decides whether to cancel.
   *
   * ⚠ A DISCLOSURE, NEVER AN ENFORCEMENT. What is actually refunded recomputes against the Postgres
   * clock inside the cancel action, so this number can never move money — and it is composed by the
   * caller into a string before it reaches any component (D-130 / GATE-05).
   */
  todayRefundCents: number | null;
};

export type PolicyDisclosureInput = {
  /** `booking.cancellation_policy` — the row's own snapshot. See the header for why null stays null. */
  tier: CancellationTier | null | undefined;
  /** The booking's frozen `starts_at`. For an open-capacity row this is the venue's OPENING instant. */
  startsAt: Date;
  /** The DB clock, read once by the caller. Never a JS clock. */
  now: Date;
  /** The venue's IANA zone, for the boundary labels. */
  timezone: string;
  /** The venue's city, appended to each label as "({City} time)" by the shared formatter. */
  city: string | null;
  /** `booking.open_capacity` — decides the anchor word and the already-open predicate. */
  openCapacity: boolean;
  /** The listing-priced portion of the frozen quote, in cents. */
  spacePriceCents: number;
  /** The service fee portion, in cents. Never refunded at any tier or any rung (D-74). */
  serviceFeeCents: number;
};

/**
 * Compose the disclosure for ONE booking, against ONE instant.
 *
 * Every number and every ordering below is derived from `LADDER` by way of `rungBoundaries` — the same
 * constant `quoteRefund` evaluates — so a rung edit rewrites this automatically. Nothing here is
 * hand-typed, which is the property `cancellation-policy.test.ts` asserts by feeding each disclosed
 * boundary straight back into the refund engine.
 */
export function composePolicyDisclosure(input: PolicyDisclosureInput): PolicyDisclosure {
  const tier = input.tier ?? null;

  // WR-05 / T-09-88 — is this pass bought for a day that has ALREADY opened? OC-03 makes an open row's
  // `startsAt` the venue's opening instant, so this is the one comparison that decides whether the
  // ladder still has anything to offer. FALSE for every exclusive booking by construction.
  const windowAlreadyOpen = input.openCapacity && input.startsAt.getTime() <= input.now.getTime();

  if (tier === null) {
    return {
      tier: null,
      boundaryLabels: undefined,
      bestRungIndex: undefined,
      windowAlreadyOpen,
      openCapacity: input.openCapacity,
      todayRefundCents: null,
    };
  }

  const boundaryLabels = rungBoundaries(tier, input.startsAt).map((r) =>
    composeDeadlineLabel(r.boundary, input.timezone, input.city),
  );

  return {
    tier,
    boundaryLabels,
    bestRungIndex: bestFutureRungIndex(tier, input.startsAt, input.now),
    windowAlreadyOpen,
    openCapacity: input.openCapacity,
    todayRefundCents: quoteRefund({
      tier,
      spacePriceCents: input.spacePriceCents,
      serviceFeeCents: input.serviceFeeCents,
      startsAt: input.startsAt,
      now: input.now,
    }).totalRefundCents,
  };
}
