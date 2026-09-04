// STATE-01 — the loading state for `/host`, the hosting dashboard.
// Convention: see `(app)/bookings/loading.tsx`; the model for THIS file is `host/requests/loading.tsx`,
// which is the plate that already renders the same shell constant and the same header component as the
// page it stands in for.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// REDRAWN IN PLAN 14-08, BECAUSE THE PAGE IT STANDS IN FOR IS NOT THE PAGE IT WAS DRAWN FOR
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// It rendered ONE panel skeleton and no heading, against a page that now renders a title block, a list
// of today's sessions and a signals block. A fallback with no header claims none of the page's top
// region, so every element below it — list and panels alike — jumps down by a title block's height the
// moment the page resolves. That is the layout shift STATE-01 exists to remove.
//
// THE HEADING IS REAL NOW, AND THAT REVERSES THIS FILE'S OWN OLD ARGUMENT — deliberately, so the
// reversal is not mistaken for somebody forgetting it. The old header said: the resolved `<h1>` is
// "Your hosting{, FirstName}", it is read off the session, so rendering "Your hosting" alone would be a
// title that visibly grows a comma and a name when the page lands. That is TRUE, and it is the smaller
// cost. A first name appearing is one word settling; an absent header is every element below it moving.
// 14-UI-SPEC § Loading makes the same call in one line: a skeleton for a first name is theatre.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ONE ANNOUNCEMENT, AND THEREFORE ONE SKELETON — WHICH IS NOT WHAT THE SPEC'S SKETCH DREW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// 14-UI-SPEC § Loading sketches this plate as a row skeleton for the agenda followed by a panel skeleton
// for the signals block. Two skeleton patterns in one fallback is TWO named `role="status"` live regions
// announcing ONE wait, which `tests/design/loading-coverage.test.ts` (AC#18) forbids by name — "two
// skeletons in one fallback announce the same wait twice" — and which is the same defect GATE-03 rule 6
// states from the other side. That gate is committed, this phase requires it to pass unedited, and it is
// right: a screen-reader user waiting for one page should hear one sentence.
//
// So the plate composes ONE pattern, and it is the LIST, because the list is what the page is about.
//
// AND THE SIGNALS BLOCK IS DELIBERATELY NOT DRAWN — not as a second skeleton, and not as a hand-rolled
// decorative block either. The reason is stronger than the gate: a placeholder only prevents a shift if
// it lands where the real content lands, and the signals block's TOP EDGE depends on how many sessions
// the host has today, which a fallback cannot know. A box drawn under a variable-length list is claiming
// page height at an address nothing will occupy — decoration, not shift prevention — and it is the LAST
// region on the page in both of the page's states, so nothing renders below it that its absence could
// move. Drawing it with the raw skeleton primitive would additionally make this the first `loading.tsx`
// in the tree to re-author a pattern's body, which is exactly the drift the pattern layer removed.
//
// ✅ THE HEIGHT THIS FILE OWED IS NOW MEASURED AND PASSED (plan 14-15). The old header said no height
// was passed and that the omission was a decision, not a lapse: the agenda row carries a status badge
// and NO actions, which is a different shape from every other host row in this phase, and 14-UI-SPEC
// § Measurements Owed (M1/M2) put the measurement in the row-height plan — in a browser, on the real
// route, at 320 and 1280. That plan ran. The agenda row measures 132px at the 320px floor and 72px at
// the desktop width, against the 80px bar this plate used to draw at both. So the row skeleton is now
// TOLD its height, by name, from the declared inventory — never as a number typed here, which the
// loading gate's box clause also forbids. The derivation, the widths and the content-dependence of
// the narrow value all live with the constant, and `e2e/skeleton-geometry.spec.ts` re-measures it.
//
// THIS FILE IS ALSO THE SEGMENT DEFAULT for every `/host/**` route with no `loading.tsx` of its own,
// which today is none of them: measured on 23 August 2026 there are ELEVEN page files and ELEVEN plates
// under the host route group, so every host route ships its own. (The old header said "all nine host
// routes", which had drifted by two — the count is measured here rather than remembered, and
// `tests/design/loading-coverage.test.ts` is what keeps the property true.)

import { HOST_AGENDA_ROW_HEIGHT, HOST_PANEL_SHELL } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";

export default function HostDashboardLoading() {
  return (
    // The container and the child rhythm are `(host)/host/page.tsx`'s own, constant for constant and
    // utility for utility — the shell from the declared inventory, the spacing beside it at the call
    // site, exactly as the page spells it.
    <div className={`${HOST_PANEL_SHELL} space-y-8`}>
      {/* The static half of the resolved title. No lede: the page's lede renders in ONE state (the host
          with no listings), and a plate cannot know which state is coming — drawing a bar for a
          paragraph that usually is not there would be inventing a shift rather than absorbing one. */}
      <PageHeader title="Your hosting" />

      {/* The agenda, and the fallback's one announcement. The sentence is the new one from the copy
          contract: it names what is loading rather than the route it is on.

          The height is the agenda row's OWN measured shape — not the shipped default, which describes
          a row built around a 48px thumbnail this row has never had. */}
      <RowListSkeleton label="Loading today's sessions" height={HOST_AGENDA_ROW_HEIGHT} />
    </div>
  );
}
