// STATE-01 — the loading state for `/host/verify`. Convention: see `(host)/host/earnings/loading.tsx`.
//
// A SINGLE PANEL, because that is what this route waits on. `page.tsx`'s default export is async — it
// awaits the session, the owner-scoped verification read and the database clock — so this fallback can
// actually render, which is the property `tests/design/loading-coverage.test.ts` classifies routes by
// and the reason this file ships in the same commit as the route.
//
// ⚠ IT WRITES NO BOX MEASUREMENT OF ITS OWN, AND THE GATE FAILS A `loading.tsx` THAT DOES. The
// container is the imported host panel shell — the same constant the page imports, so the two cannot
// drift — and the panel's own minimum height and bar heights live inside `PanelSkeleton`, never at a
// call site. `mt-8` is the shared data-region offset, which is a POSITION rather than a box, exactly
// as the earnings plate uses it.
//
// ⚠ THE HEADER STRINGS ARE THE SAME EXPRESSIONS THE PAGE CARRIES, CHARACTER FOR CHARACTER. Both read
// the copy module, so a fallback that imitated the heading with its own literals — the shape this
// repository has already corrected once on the earnings surface — is not possible here.
//
// `PanelSkeleton` supplies `role="status" aria-busy="true"`, the `aria-label` NAME and the `sr-only`
// CONTENT — two different mechanisms, both required — and its bars are marked decorative. This file
// therefore declares no region of its own and appears in no live-region inventory.

import { PageHeader } from "@/components/patterns/page-header";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";
import { HOST_PANEL_SHELL } from "@/lib/design/measurements";
import {
  VERIFICATION_LEDE,
  VERIFICATION_LOADING_LABEL,
  VERIFICATION_PAGE_TITLE,
} from "@/lib/host/verification-signal";

export default function HostVerifyLoading() {
  return (
    <div className={HOST_PANEL_SHELL}>
      <PageHeader title={VERIFICATION_PAGE_TITLE} lede={VERIFICATION_LEDE} />

      <div className="mt-8">
        <PanelSkeleton label={VERIFICATION_LOADING_LABEL} />
      </div>
    </div>
  );
}
