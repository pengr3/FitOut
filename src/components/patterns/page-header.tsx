// The page's title block — `<h1>` + optional lede + optional actions cluster.
//
// WHAT THIS REPLACES (nobody yet — the adoption plans swap the surfaces): the same three-element
// shape inlined in roughly ten pages. `(app)/bookings/loading.tsx:14-19` is the cleanest instance and
// is what the markup below is copied from, down to the `max-w-prose` on the lede.
//
// A SERVER COMPONENT with no domain imports and no product copy — see `result-card.tsx`'s header for
// the rule. The title and the lede are the surface's sentences, never this file's.
//
// WHY THIS IS A PATTERN AT ALL, GIVEN IT IS FOUR LINES OF MARKUP. Not the markup — the two rules it
// carries. (1) Exactly one `<h1>` per page, in a known place, so the heading outline is a property of
// the layer rather than of ten independent decisions. (2) The title WRAPS at 320px; it never
// truncates. A row title truncates because a row is one line tall by contract; a page title that
// truncates has lost the only thing on screen that says where you are. That is why there is no
// `truncate` and no `line-clamp` below, and why the actions cluster is a wrapping flex sibling rather
// than a fixed column — at the 320px floor (D-131) the actions drop beneath the title instead of
// squeezing it.
//
// The `data-testid` is on the WRAPPER, deliberately: the `<h1>` stays reachable by
// `getByRole("heading", { level: 1 })` and must, but nothing reaches the BOX whose geometry is the
// contract. `selector-contract.ts`'s row for this id says the same thing at more length.

import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  /** One or two sentences under the title. Measured at `max-w-prose` so it stays readable. */
  lede?: string;
  /** Right-aligned cluster — a primary CTA, a filter, a link. Wraps beneath the title at 320px. */
  actions?: ReactNode;
};

export function PageHeader({ title, lede, actions }: PageHeaderProps) {
  return (
    <div
      data-testid="page-header"
      className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3"
    >
      {/* `min-w-0` lets the title column shrink inside the flex row; combined with the absence of
          `truncate` that means the title WRAPS rather than being clipped — the whole point above. */}
      <div className="min-w-0 space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {lede ? <p className="max-w-prose text-sm text-muted-foreground">{lede}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
