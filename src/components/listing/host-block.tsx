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
// TRUST-04 bans the neighbours somebody will reach for next: no verification badge, no superhost marker,
// no response rate, no "usually replies in". None of them is backed by data this product collects, and
// inventing marketplace trust chrome is exactly what that requirement exists to refuse. If you are here
// to add one, the requirement is the thing to change first.
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
};

export function HostBlock({
  avatarUrl,
  firstName,
  bio,
  createdAt,
  bookingMode,
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
          <p className="truncate text-base font-medium text-foreground">{name}</p>
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
    </div>
  );
}
