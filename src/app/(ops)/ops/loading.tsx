// STATE-01 — the loading state for `/ops`. Convention: see `(host)/host/requests/loading.tsx`.
//
// ⚠ THIS FILE HAS TWO JOBS AND THEY ARE DIFFERENT JOBS. Deleting it "to simplify" breaks both.
//
//   1. `tests/design/loading-coverage.test.ts` REQUIRES it. `page.tsx`'s default export is async (it
//      reads the database), so the gate — which is build-blocking, `npm run build` is
//      `lint && test:design && next build` — demands a designed fallback beside it.
//   2. ITS `<Suspense>` BOUNDARY IS WHAT MAKES THE 404 STATUS LINE WINNABLE. The boundary this file
//      creates is what puts `(ops)/ops/layout.tsx`'s `assertStaff()` ABOVE it, and above the boundary
//      is the only place a refusal can still set the status line. The layout's header carries the
//      whole mechanism. A reader who removes this file to "avoid a flash" removes the reason the
//      layout assert is in a layout at all — and the plausible repair (assert in `generateMetadata`)
//      was MEASURED not to work on `/listings/[id]`.
//
// A ROW LIST: the resolved page is a stack of review rows, each one host or listing waiting on a
// decision. `rows={2}` and NOT the default 4 — the ops row is the tallest shape in the product
// because it carries a photo mosaic, so four bars promise far more page than arrives. That is
// `/host/requests`' plate's own reasoning in the other direction: its 80px bar was "promising less
// than a third of what arrives". A plate must promise the page that is coming.
//
// IT COMPOSES EXACTLY ONE DECLARED SKELETON PATTERN AND WRITES NO BOX MEASUREMENT OF ITS OWN. The
// container is `OPS_QUEUE_SHELL` and the bar height is `OPS_QUEUE_ROW_HEIGHT`, both from
// `@/lib/design/measurements` and both measured off this rendered route. `RowListSkeleton` supplies
// `role="status"`, `aria-busy`, the `aria-label` NAME and the `sr-only` CONTENT — two mechanisms,
// both required, because `role="status"` is nameFrom:author and an sr-only child alone computes to an
// empty accessible name.

import { OPS_QUEUE_SHELL, OPS_QUEUE_ROW_HEIGHT } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";

export default function OpsQueueLoading() {
  return (
    // The container is the DECLARED shell and the `mt-8` data-region offset is `(ops)/ops/page.tsx`'s
    // own, exactly as `/host/requests` and its plate do. The `PageHeader` strings below are the SAME
    // expressions the page carries, character for character — not a fallback imitating a heading, the
    // same component in the same container rendered twice.
    <div className={OPS_QUEUE_SHELL}>
      <PageHeader
        title="Review queue"
        lede="Hosts and listings waiting on a decision, oldest first. Nothing new sells on FitOut until someone here has checked it."
      />

      <div className="mt-8">
        <RowListSkeleton
          label="Loading the review queue"
          rows={2}
          height={OPS_QUEUE_ROW_HEIGHT}
        />
      </div>
    </div>
  );
}
