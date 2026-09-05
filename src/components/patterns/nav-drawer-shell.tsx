"use client";

// SHELL-01 — the nav drawer's TRIGGER, authored on the client side of the boundary.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THIS FILE EXISTS BECAUSE OF ONE MEASURED FACT, AND IT IS NOT A STYLISTIC SPLIT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `ResponsiveDialog` forwards its `trigger` prop into `DialogTrigger asChild`, and `asChild` is
// Radix's `Slot` — which does not render an element, it CLONES one. A clone needs a real element in
// hand at render time.
//
// `patterns/site-chrome.tsx` is a SERVER COMPONENT (its own header says so, of every export in it),
// so when `NavDrawer` lived there the trigger element was created on the server and handed across the
// RSC boundary into a client component. `Slot` could not clone it during the SSR pass, and the
// consequence was measured rather than reasoned about — the served HTML for `/host` carried
//
//     <div class="md:hidden"></div>
//
// an EMPTY drawer placement, while the client rendered `<button aria-label="Menu" …>` into it. React
// reported *"Hydration failed because the server rendered HTML didn't match the client. As a result
// this tree will be regenerated on the client"* on every `(host)` route, with that button printed as
// client-only (`+`) in its own diff. Transcript, with the served bytes and both controls:
// `.planning/phases/19.1-…/evidence/triage-host-hydration.txt`.
//
// THE CENSUS THAT MAKES THIS THE SITE RATHER THAN A GUESS. Every other adopter of `ResponsiveDialog`
// in `src/` — the availability blocks editor and copy-hours dialog, the booking sticky bar, the host
// request row, the photo lightbox, the ops reject dialog, the avatar field and the image crop dialog —
// is ALREADY a client component, so its trigger element is created on the client side of the boundary
// and its `Slot` has a real element to clone. `site-chrome.tsx`'s `NavDrawer` was the ONE server-side
// adopter in the tree, and `(host)` was the one route reporting the mismatch. One exception, one
// symptom.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS IS NOT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// It is NOT a second overlay mechanism. There is still exactly ONE — `patterns/responsive-dialog.tsx`
// composing the vendored Radix dialog — and this file composes it rather than reimplementing it, with
// no `ui/sheet.tsx` (asserted absent by `tests/design/sheet-absent.test.ts`), no second focus trap and
// no second escape behaviour. The vendored dialog is not edited.
//
// It is also NOT the drawer's CONTENT. The links stay a Server Component (`NavLinks` in
// `site-chrome.tsx`) and arrive here as `children`, which crosses the boundary as ordinary children
// and needs no cloning. Only the trigger had to move, because only the trigger is cloned.

import type { ReactNode } from "react";
import { MenuIcon } from "lucide-react";

import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { Button } from "@/components/ui/button";
import { AUTH_SLOT_ICON } from "@/lib/design/measurements";

/**
 * The drawer itself: the app's one overlay primitive, with the trigger created here.
 *
 * `hideTitle` because a visible "Menu" line above a list of two links is redundant chrome; the
 * accessible name still reaches assistive technology, which is why the title is hidden rather than
 * omitted (a dialog with no accessible name is a WCAG 4.1.2 failure).
 *
 * The trigger carries `aria-label="Menu"` and its glyph `aria-hidden`, for the same reason the profile
 * control does: an icon-only control has no accessible name otherwise. `AUTH_SLOT_ICON` is read from
 * the measurement inventory rather than spelled here, which is what keeps the pending placeholder in
 * `auth-slot-skeleton.tsx` the same box as this control.
 */
export function NavDrawerShell({ children }: { children: ReactNode }) {
  return (
    <ResponsiveDialog
      title="Menu"
      hideTitle
      trigger={
        <Button variant="ghost" size="icon" aria-label="Menu" className={AUTH_SLOT_ICON}>
          <MenuIcon aria-hidden="true" />
        </Button>
      }
    >
      {children}
    </ResponsiveDialog>
  );
}
