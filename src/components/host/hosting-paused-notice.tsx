// HostingPausedNotice — what a SUSPENDED host reads at the top of every surface they own (D-243,
// extended to `/host/earnings` by D-252).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS ONE COMPONENT AND NOT THREE PARAGRAPHS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// It renders on THREE surfaces — `/host`, `/host/listings` and `/host/earnings` — and what a suspended
// host is told must be identical on all three. A sentence typed into three page files is the shape
// `requests-signal.ts`'s header describes by name: the badge starts calling them one thing, the row
// another, and nothing goes red when they diverge. The WORDS live in
// `src/lib/listing/review-signal.ts`; this file is the one place that decides how they are presented.
//
// ⚠ `/host/earnings` IS THE SURFACE THIS EXISTS FOR, AND IT IS THE ONE THAT ALMOST DID NOT GET IT.
// Plan 18-07's payout freeze is PRE-CLAIM: a suspended host's due payouts are filtered out BEFORE the
// `host_payout_ledger` row is written, so no row is ever created and no operator is ever paged. The
// consequence on this surface is that a delivered session produces no payout line at all — a host
// watching money stop, on the page where they would look for it, with nothing anywhere that says why.
// That is the worst version of this feature and it is what D-252 rules out.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE TONE, AND WHAT IS DELIBERATELY ABSENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The DECLARED ADVISORY SURFACE — `PanelCard` at its muted tone, the same container the dashboard's
// requests and no-hours rows take. Not the alerting composition: that one is reserved for a payout
// account that is paused by a failure nobody chose, and this is a decision a named person at FitOut
// took deliberately. It adds no colour pairing the design inventory does not already measure.
//
// ⚠ THERE IS NO CONTROL IN THIS COMPONENT, AND ITS ABSENCE IS THE DECISION. No route back, no promise
// of a response, no timeline, no support address — contesting an ops decision is backlog 999.6 and OUT
// (D-243), and `SUPPORT_EMAIL` is null and stays null (D-250). The prohibited phrasings are named in
// `tests/listing/review-signal.test.ts`'s banned-language block rather than quoted here: this file is
// grep-scanned for them, and a comment forbidding a string by spelling it makes a correct file read as
// a broken one — the trap this repository has now tripped seven times.
// What resolves a suspension is a FitOut ops review,
// which this product cannot offer as a control and will not offer as a promise. So the surface names
// the state and the reason and stops, which is the honest version of `requests-signal.ts:56`'s rule
// when there is genuinely no way out. If a support address ever exists, the affordance goes through
// `src/components/booking/support-path.tsx`'s guard shape and nowhere else.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE OPERATOR'S SENTENCE CROSSES A TRUST BOUNDARY HERE (T-18-1301)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `host_verification.reason` is FREE TEXT an operator typed, rendered on a surface the host controls
// nothing about. It arrives already joined to the product's sentence by the shared composer and is
// interpolated into a JSX expression container — a React text node, escaped by construction. There is
// no `dangerouslySetInnerHTML` on this path, and there must never be one.
//
// NOT "use client" — a pure presentational component the three host RSCs render directly.

import { PanelCard } from "@/components/patterns/panel-card";
import { composeSuspendedSentence, SUSPENDED_HOST_SIGNAL } from "@/lib/listing/review-signal";

export function HostingPausedNotice({
  reason,
}: {
  /**
   * `host_verification.reason` — the operator's own sentence, read owner-scoped by the page from
   * `loadHostVerification`. Null-safe: a suspension recorded without a note renders the product's
   * sentence alone rather than a dangling separator.
   */
  reason: string | null;
}) {
  return (
    // The STATE is the panel's own heading, at the level every host surface's outline wants: each of
    // the three pages is an `h1` and then this. `titleAs` is left at the pattern's default rather than
    // passed, because all three call sites agree — and a prop that is the same everywhere is a prop
    // that will eventually be passed wrong somewhere.
    <PanelCard tone="muted" title={SUSPENDED_HOST_SIGNAL.state}>
      <p className="text-body text-muted-foreground" data-hosting-paused>
        {composeSuspendedSentence(reason)}
      </p>
    </PanelCard>
  );
}
