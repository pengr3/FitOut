// `/privacy` — a REAL route with NON-BINDING content (11-UI-SPEC § `/terms` and `/privacy`).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// THE NOTICE IS PART OF ACCEPTANCE, AND REMOVING IT IS COUPLED TO REMOVING ITS GATE (AC#4)
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE RULE, IN PLAIN WORDS: **the placeholder notice below is removed ONLY in the same commit that
// supplies a real privacy policy, and that commit deletes the two assertions guarding it.** Those
// assertions live in `tests/design/legal-copy.test.ts` — one pins the sentinel sentence by string
// equality, the other bans clause language in this file's body. Deleting the notice on its own turns
// this page into something that LOOKS like a policy and is filler; deleting the gate on its own
// removes the only thing that would notice. Either half alone is the failure.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE BODY NAMES NO PROCESSOR, NO RETENTION PERIOD AND NO CONTACT
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This one is sharper than its sibling. The notice states that nothing on this page describes how
// FitOut ACTUALLY handles anyone's data — so a body that then named a payment processor, a hosting
// region or a retention period would falsify its own notice one paragraph below it, and would do so
// with the exact class of statement people rely on when deciding whether to hand over information.
//
// Those facts are also genuinely undecided: there is no published retention schedule, no named data
// contact, no stated processing region, and `src/lib/site.ts`'s `SUPPORT_EMAIL` is `null` because
// FitOut has no monitored inbox to put there (D-26). Every bullet below therefore describes what the
// published policy will COVER, and the three rows whose content nobody has decided say so out loud.
//
// This page is NOT legal advice and was NOT written by anyone qualified to give it. A real privacy
// policy is a statement of fact about live systems and needs both a lawyer and a data inventory.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPE, AND WHY THESE CLASSES ARE WRITTEN OUT BY HAND
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The four named roles, composed one element at a time — identical structure to `terms/page.tsx`,
// deliberately, so the two pages cannot drift into two prose treatments. No prose plugin (see
// `src/app/(legal)/layout.tsx`), and no line-height utility co-located with any role, because a role
// carries its own per theme.
//
// The copy is held in module constants for the reason `terms/page.tsx` records: the sentinel
// sentence contains an ASCII apostrophe the gate matches exactly, and `react/no-unescaped-entities`
// rejects that character in JSX text.
//
// The five clause-language terms `tests/design/legal-copy.test.ts` bans are deliberately NOT spelled
// out anywhere in this file, comments included — a comment naming a banned string is textually
// indistinguishable from the string to anyone grepping this file.

import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";

import { PanelCard } from "@/components/patterns/panel-card";

/**
 * Composes through the root layout's `%s · FitOut` template (`src/app/layout.tsx:107`).
 *
 * Title ONLY, and no `openGraph` key — plan 11-20 measured that declaring one at a route level
 * deletes the inherited share card rather than extending it.
 */
export const metadata: Metadata = {
  title: "Privacy Policy",
};

/**
 * THE SENTINEL. `tests/design/legal-copy.test.ts` asserts the substring `not FitOut's privacy
 * policy` by string equality. Verbatim from `11-UI-SPEC.md` § The placeholder notice.
 */
const NOTICE_LEAD = "Placeholder — this is not FitOut's privacy policy.";

const NOTICE_BODY =
  "FitOut has not published its privacy policy yet. This page exists so the site's links resolve. " +
  "Nothing on it describes how FitOut actually handles your data. The published policy will " +
  "replace this page in full.";

/**
 * The outline: section name, then ONE plain sentence of what that section will cover.
 *
 * Second person appears only where the sentence is describing what the future document will do for
 * a reader — never where it could be read as something the reader has accepted.
 */
const OUTLINE: readonly { section: string; covers: string }[] = [
  {
    section: "What is collected",
    covers:
      "Which pieces of information FitOut holds about a person, and which of them a booking cannot work without.",
  },
  {
    section: "Why it is held",
    covers: "What each piece is used for, given per purpose rather than as one undifferentiated list.",
  },
  {
    section: "Who else sees it",
    covers:
      "The processors FitOut relies on to take payments, send email and store records, and what each one receives.",
  },
  {
    section: "How long it is kept",
    covers:
      "A retention period for each category of record, including the ones a payment history is held to by law — no schedule has been decided yet.",
  },
  {
    section: "Choices you have",
    covers:
      "How to see, correct, export or delete what is held about you, and where to send that request.",
  },
  {
    section: "Cookies and similar browser storage",
    covers: "What is stored in a browser, what it is for, and what changes if it is refused.",
  },
  {
    section: "Where data is stored and processed",
    covers:
      "Which countries the records sit in, and what covers a transfer between them — not yet decided.",
  },
  {
    section: "Who to contact, and how to complain",
    covers:
      "The named contact for data questions and the regulator a complaint can be taken to — neither has been decided yet.",
  },
  {
    section: "Changes to this document",
    covers: "How people are told when the policy changes, and from when a change counts.",
  },
];

/**
 * NOT an effective date, and it says so — see `terms/page.tsx` for the reasoning.
 */
const PUBLISHED_LINE =
  "Placeholder published 17 August 2026. It has no effective date, because there is no document here to take effect.";

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-display">Privacy Policy</h1>

      {/* THE NOTICE, DIRECTLY BENEATH THE `<h1>` AND ABOVE EVERYTHING ELSE — above the fold at
          320px. The test id sits on this wrapper rather than on the panel because `PanelCard` owns
          its own `data-testid="panel-card"` and takes no pass-through props; see `terms/page.tsx`
          for the second reason, which is that the selector contract only sees string literals. */}
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
