// `/terms` — a REAL route with NON-BINDING content (11-UI-SPEC § `/terms` and `/privacy`).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// THE NOTICE IS PART OF ACCEPTANCE, AND REMOVING IT IS COUPLED TO REMOVING ITS GATE (AC#4)
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE RULE, IN PLAIN WORDS: **the placeholder notice below is removed ONLY in the same commit that
// supplies real terms of service, and that commit deletes the two assertions guarding it.** Those
// assertions live in `tests/design/legal-copy.test.ts` — one pins the sentinel sentence by string
// equality, the other bans clause language in this file's body. Deleting the notice on its own turns
// this page into something that LOOKS like terms and is filler, which is a claim to users that the
// business has not made; deleting the gate on its own removes the only thing that would notice.
// Either half alone is the failure. The gate's own header carries the same rule from its side.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE BODY IS AN OUTLINE AND ASSERTS NOTHING WHATSOEVER ABOUT THE BUSINESS
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every bullet below describes what the PUBLISHED document will cover. None of them describes what
// FitOut does, promises, charges or is liable for — and that restraint is the point rather than
// laziness. The notice states that nothing here describes an obligation FitOut has taken on; a body
// that then made a concrete claim would falsify its own notice on the same screen.
//
// There is a second, harder reason. Real terms need facts nobody has decided yet: the legal entity
// behind FitOut, where it is registered, which country's law and courts apply, and a monitored
// contact address (`src/lib/site.ts`'s `SUPPORT_EMAIL` is `null` for exactly this reason — D-26).
// Inventing any of them to make a page read better is the fabrication that decision exists to
// prevent. The bullet that needs them says out loud that they are undecided.
//
// This page is NOT legal advice and was NOT written by anyone qualified to give it. The published
// document needs a lawyer.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPE, AND WHY THESE CLASSES ARE WRITTEN OUT BY HAND
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The four named roles, composed one element at a time: `text-display` on the `<h1>`, `text-heading`
// on the `<h2>`, `text-body` on the prose, `text-label` on the closing line. No prose plugin — see
// `src/app/(legal)/layout.tsx`'s header for why one would be a second un-gated type system. The roles
// carry their own line-height per theme, so NO line-height utility is co-located with any of them;
// `tests/design/type-scale.test.ts` explains what a co-located utility does to a role's own value.
//
// The copy is held in module constants rather than written inline as element text. Two reasons, both
// mechanical: the sentinel sentence contains an ASCII apostrophe that the gate matches on exactly,
// and `react/no-unescaped-entities` rejects that character in JSX text. A string literal is neither
// escaped nor curly-quoted, so what the gate reads is what the page renders.
//
// The five clause-language terms `tests/design/legal-copy.test.ts` bans are deliberately NOT spelled
// out anywhere in this file, comments included — `booking-row.tsx:112`'s precedent, and the eleventh
// instance of this collision in Phase 11: a comment naming a banned string is textually
// indistinguishable from the string to anyone grepping this file.

import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";

import { PanelCard } from "@/components/patterns/panel-card";

/**
 * Composes through the root layout's `%s · FitOut` template (`src/app/layout.tsx:107`).
 *
 * Title ONLY. No `openGraph` key: plan 11-20 MEASURED that declaring one at a route level deletes
 * the inherited share card rather than extending it — `og:image` disappears and `twitter:card` drops
 * to `summary`. These routes inherit the root card, and that is the correct outcome for them.
 */
export const metadata: Metadata = {
  title: "Terms of Service",
};

/**
 * THE SENTINEL. `tests/design/legal-copy.test.ts` asserts the substring `not FitOut's terms of
 * service` by string equality — a fuzzy match would survive a rewrite that softened the disclaimer
 * into something a reader skims past. Verbatim from `11-UI-SPEC.md` § The placeholder notice.
 */
const NOTICE_LEAD = "Placeholder — these are not FitOut's terms of service.";

const NOTICE_BODY =
  "FitOut has not published its terms yet. This page exists so the site's links resolve. Nothing " +
  "on it is a binding agreement, and nothing on it describes an obligation FitOut has taken on. " +
  "The published terms will replace this page in full.";

/**
 * The outline: section name, then ONE plain sentence of what that section will cover.
 *
 * Every `covers` value is a noun phrase about the future document. None is a sentence about what
 * FitOut does — see the header. The `Complaints` row names the three undecided facts explicitly
 * rather than quietly omitting them.
 */
const OUTLINE: readonly { section: string; covers: string }[] = [
  {
    section: "Who can use FitOut",
    covers: "Who may hold an account, and what a host account needs beyond a booker account.",
  },
  {
    section: "Booking a space",
    covers:
      "What a confirmed reservation is, and what the person booking and the host can each expect from it.",
  },
  {
    section: "Money",
    covers:
      "How a booking is paid for, what FitOut charges for running the marketplace, and when a host receives their share.",
  },
  {
    section: "Cancellations and refunds",
    covers: "The cancellation windows, and what is returned under each of them.",
  },
  {
    section: "Listing a space",
    covers:
      "What a host is asked to keep accurate about a space, its availability and its price.",
  },
  {
    section: "Group bookings",
    covers:
      "How an organiser's invitation and their attendees' replies relate to the reservation itself.",
  },
  {
    section: "Conduct, suspension and closing an account",
    covers: "Why FitOut might restrict an account, and how someone closes their own.",
  },
  {
    section: "Complaints, disputes and the governing law",
    covers:
      "Which company stands behind FitOut, where it is registered, and which country's law and courts apply — none of the three has been decided yet.",
  },
  {
    section: "Changes to this document",
    covers: "How people are told when the terms change, and from when a change counts.",
  },
];

/**
 * NOT an effective date, and it says so. A bare "Last updated" line on a page like this invites
 * exactly the reading the notice exists to prevent — that there is a document here with versions.
 */
const PUBLISHED_LINE =
  "Placeholder published 17 August 2026. It has no effective date, because there is no document here to take effect.";

export default function TermsPage() {
  return (
    <>
      <h1 className="text-display">Terms of Service</h1>

      {/* THE NOTICE, DIRECTLY BENEATH THE `<h1>` AND ABOVE EVERYTHING ELSE — above the fold at
          320px, which is the whole reason its placement is specified rather than left to taste.

          The test id sits on this wrapper rather than on the panel because `PanelCard` owns its own
          `data-testid="panel-card"` and takes no pass-through props (`panel-card.tsx:28-63`). A
          wrapper is also the form the gate needs: `selector-contract.test.ts`'s collector is an AST
          walk over JSX attributes whose value is a STRING LITERAL, so an id threaded through a prop
          would be invisible to the contract and to plan 11-22's forward direction. */}
      <div data-testid="legal-placeholder-notice" className="mt-6">
        <PanelCard tone="muted">
          <div className="flex gap-3">
            <InfoIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            {/* `space-y-4` — the UI-SPEC's paragraph rhythm for this surface. */}
            <div className="space-y-4">
              <p className="text-body font-semibold">{NOTICE_LEAD}</p>
              <p className="text-body">{NOTICE_BODY}</p>
            </div>
          </div>
        </PanelCard>
      </div>

      <h2 className="text-heading mt-8">What the published document will cover</h2>

      <ul className="mt-4 list-disc space-y-2 pl-6">
        {OUTLINE.map((row) => (
          <li key={row.section} className="text-body">
            <span className="font-semibold">{row.section}</span>
            {" — "}
            {row.covers}
          </li>
        ))}
      </ul>

      <p className="mt-8 text-label text-muted-foreground">{PUBLISHED_LINE}</p>
    </>
  );
}
