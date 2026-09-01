// BFLOW-02 / D-47 — the `Your host` block on the PUBLIC listing detail page.
//
// ══ WHAT MAY CROSS THE BOUNDARY, AND HOW THAT IS ENFORCED (T-12-08-PII) ═══════════════════════════════
// The props are a `Pick` of `PublicProfile` — the exact D-09/D-10 allow-list `publicProfile()` returns.
// That is deliberate and load-bearing: it makes the allow-list a COMPILE-TIME fact rather than a habit.
// A caller cannot hand this component `lastName`, `email`, `phone` or `role`, because those names do not
// exist on the type it accepts, so a future edit that widens the projection cannot leak through here
// without first widening `PublicProfile` itself — which is the one place D-09 says the decision belongs.
// `city` is on the allow-list and is deliberately NOT taken: a host's city says nothing a booker needs
// that the listing's own Location section does not already say, and an unread prop is an invitation.
//
// ══ NO NUMBER ABOUT THE HOST APPEARS HERE, AND THAT IS A CORRECTNESS RULE (D-47 · T-12-08-SLAFICTION) ══
// The request-mode sentence states the RULE in words and names no deadline. Two independent reasons, and
// either alone is sufficient:
//
//   1. D-96 shortens the approval window PROPORTIONALLY when the session is soon, so a label rendered
//      from the approval-window config constant is frequently wrong. `when-label.ts` and `email.ts` both
//      carry the same warning at the same rule: deadline claims render a ROW's pre-composed capped label,
//      never an hour count from config. (The constant is described rather than spelled here on purpose —
//      an acceptance grep counts its occurrences in this directory, and a guard a comment can trip is not
//      a guard. Same tripwire discipline as `cancellation-policy-disclosure.tsx`'s header.)
//   2. On THIS page no request row exists yet. There is no booking, so there is no real deadline to
//      render at all — any figure here would be a general claim dressed as a specific promise.
//
// ══ TRUST-04, AND THE ONE EXCEPTION PHASE 18 EARNED (HVER-05 · D-212 · D-237) ══════════════════════════
// This header used to state that ALL FOUR of the neighbours somebody reaches for next were banned here,
// because none of them was backed by data this product collects — and it closed by pointing whoever
// wanted one at the requirement rather than at this file.
//
// THREE OF THE FOUR ARE STILL BANNED, for that unchanged reason. No superhost marker, no response rate,
// no "usually replies in": `src/lib/db/schema.ts` carries no tier column, no reply-count and no latency
// field about a host's replies, so any of the three could only be INVENTED, and inventing marketplace
// trust chrome is exactly what TRUST-04 exists to refuse.
//
// THE FOURTH ONE NOW HAS A ROW BEHIND IT, so the old paragraph is REWRITTEN rather than amended around:
// HVER-05 is the requirement change the old sentence asked for, and a gate everyone believes exists is
// one nobody goes looking for. The fact is `host_verification.status` joined with `listing.review_state`,
// both written by a named, authenticated staff member (D-218) — a person at FitOut looked at this account
// and at this listing. The rule is the single predicate in `src/lib/listing/fitout-check.ts`; the chip and
// its explainer are `fitout-check-badge.tsx`. It renders for `approved` + `approved` ONLY (D-212), never
// for a grandfathered row — those were marked by a migration and checked by nobody, and badging them would
// be a lie told at scale to the majority of the day-one catalogue.
//
// ⚠ THE DISTINCTION NEVER ARRIVES IN THIS FILE, AND THAT IS THE DESIGN. This component receives a
// BOOLEAN, never the two statuses, so it cannot badge the wrong row even by accident — it has never been
// told which is which. Do not re-derive the rule here, do not take the statuses instead, and do not widen
// `PublicProfile` to carry them (see the prop's own note below).
//
// ══ WHY THIS RENDERS A PLAIN <img> RATHER THAN `ui/avatar.tsx` ═════════════════════════════════════════
// The vendored Radix avatar carries the client-boundary directive, so importing it would turn a block of
// static host prose into a client island — on the ONE rail-adjacent route whose streamed/hydrated split
// this plan is measuring (`[11-13]`). 12-07 made the same call for the same reason when it dropped
// `<AspectRatio>` from the mosaic: the PROPERTY wanted (a round image with a graceful fallback) survives
// in plain markup, and the client dependency does not. This file therefore ships zero JavaScript.
//
// This is a SERVER component: it carries no client directive and calls no hook. (The directive string is
// deliberately not spelled anywhere in this file so a grep for it stays a real guard.)

import {
  FitoutCheckBadge,
  FITOUT_CHECK_EXPLAINER,
} from "@/components/listing/fitout-check-badge";
import { formatMemberSince, type PublicProfile } from "@/lib/profile";

/**
 * The two sentences, as TS string constants rather than JSX text — the three reasons
 * `cancellation-policy-disclosure.tsx` already records: `react/no-unescaped-entities` makes a literal
 * apostrophe in JSX an error (so the source and the rendered sentence would stop being the same bytes),
 * one copy per sentence, and SWC's JSX whitespace transform cannot eat a leading space inside a literal.
 *
 * Exported so the tests and specs that pin this copy IMPORT it instead of retyping it.
 */
export const HOST_INSTANT_RULE = "This space books instantly — no approval needed.";
export const HOST_REQUEST_RULE =
  "This host reviews requests. You're not charged when you request — only if they approve. " +
  "If they don't answer, the request expires and nothing is charged.";

export type HostBlockProps = Pick<
  PublicProfile,
  "avatarUrl" | "firstName" | "bio" | "createdAt"
> & {
  /**
   * The LISTING's persisted booking mode — which of the two sentences above is true of this space.
   * Required rather than optional for the reason `DeadlineAnchorInput` records: an optional flag lets a
   * surface silently keep telling a booker "books instantly" about a space that reviews every request.
   */
  bookingMode: "instant" | "request";
  /**
   * HVER-05 — has a person at FitOut checked BOTH this host's account and this listing?
   *
   * A SEPARATE PROP, deliberately NOT a widening of `PublicProfile`. Widening the allow-list would send
   * the raw status everywhere `publicProfile()` goes, on every surface, forever — for the convenience of
   * one chip on one page. This prop carries the ANSWER instead, computed once in the RSC, so the two
   * statuses stay where they are read.
   *
   * Required rather than optional, for the reason `bookingMode` above records: an optional flag lets a
   * surface silently stop badging (or, worse, be defaulted true by a later edit) with nothing to notice.
   * Required means every call site is a compile error until it decides.
   */
  fitoutChecked: boolean;
};

export function HostBlock({
  avatarUrl,
  firstName,
  bio,
  createdAt,
  bookingMode,
  fitoutChecked,
}: HostBlockProps) {
  const name = firstName ?? "Your host";
  // First initial, uppercased, for the no-photo fallback. A host with no first name falls back to the
  // neutral glyph rather than an empty circle.
  const initial = firstName?.trim().charAt(0).toUpperCase() || "·";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          /* A plain element rather than `next/image`: host avatars are arbitrary remote Cloudinary
             URLs rendered at a fixed 48px, so the optimiser buys nothing a fixed-size thumbnail needs
             and costs a `remotePatterns` entry plus a client dependency this file exists without. The
             mosaic on this same route made the same call for the same reason.

             `alt` is EMPTY on purpose. The host's name sits immediately beside it in the markup, so a
             described avatar would make a screen reader announce the name twice — a decorative image
             next to its own label is exactly the case the empty string is for.

             NOTE the suppression below is written as ITS OWN line: a `-- reason` tail spanning further
             `//` lines makes ESLint apply the directive to the next comment line instead of the
             element, which then reports BOTH an unused directive and the original rule. Measured on
             this file. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-base font-medium text-muted-foreground"
          >
            {initial}
          </span>
        )}
        <div className="min-w-0">
          {/* The chip sits BESIDE the name, and the two are laid out so 320px resolves predictably:
              `min-w-0` + `truncate` keeps the long name as the thing that gives way, and `shrink-0` on
              the chip means the sentence a booker is meant to read is never the half that gets clipped.
              A chip below the name would read as a caption on the "Host since" line instead. */}
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-base font-medium text-foreground">{name}</p>
            <FitoutCheckBadge checked={fitoutChecked} className="shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground">
            Host since {formatMemberSince(createdAt)}
          </p>
        </div>
      </div>

      {bio && (
        <p className="text-base leading-relaxed whitespace-pre-line text-foreground">{bio}</p>
      )}

      <p className="text-sm text-muted-foreground">
        {bookingMode === "request" ? HOST_REQUEST_RULE : HOST_INSTANT_RULE}
      </p>

      {/* The explainer, and ONLY when the chip is actually there — a sentence explaining a badge that
          is not on the page would be the badge's claim made in prose. Imported, never retyped, so the
          copy the trust-signal gate scans is the copy that renders (`fitout-check-badge.tsx`). Its
          second sentence says plainly what did NOT happen, which is Success Criterion 6's strongest
          available compliance and the reason this surface — not the search card — carries it. */}
      {fitoutChecked && (
        <p className="text-sm text-muted-foreground">{FITOUT_CHECK_EXPLAINER}</p>
      )}
    </div>
  );
}
