"use client";

// RESP-01 — THE mobile-overlay primitive. ONE dialog, TWO presentations.
//
// WHY THIS FILE IS A CLIENT COMPONENT. Not habit: it accepts `onOpenChange`, a FUNCTION prop, and a
// function cannot cross the server→client boundary as a serialized prop. Every adopter also owns the
// open state (`useState`) that drives it. `empty-state.tsx` and the four card patterns beside it are
// Server Components and must stay so; this file and `error-state.tsx` are the layer's two declared
// exceptions, each with its reason written at the top.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE DECISION, AND THE RECORD OF THE CONTRADICTION IT RESOLVES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `FEATURES.md` F1 asks to install the shadcn `sheet` block and adopt it as the mobile-overlay
// primitive. `ARCHITECTURE.md` §6.3 refuses it outright: *"Do not add shadcn `sheet` alongside
// `dialog` — two focus-trap implementations, two escape behaviours, and two sets of baselines for one
// concept."* Two approved documents, flat contradiction. The tiebreak is the ROADMAP's own Phase 16
// dependency line, which names the deliverable by name — *"Depends on … Phase 11's responsive-dialog
// pattern"* — so the block is not fetched and this file is the primitive. RESP-01's parenthetical
// "(sheet)" is the pattern's common NAME, not a mandate for that registry block.
//
// Consequences that are acceptance criteria rather than intentions (T-11-SC, T-11-FOCUSTRAP):
//   • `src/components/ui/sheet.tsx` DOES NOT EXIST, and `tests/design/sheet-absent.test.ts` asserts it.
//   • No `npx shadcn add sheet`, no `vaul`, no gesture library. `git diff --stat package.json` empty.
//   • Exactly ONE focus trap and ONE escape behaviour in the app, because there is exactly one
//     overlay mechanism and this file composes it rather than reimplementing it.
//
// Re-adding the block later is NOT a bug fix. It is a reversal of a recorded decision and needs the
// same treatment this comment is.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE `--z-sheet` CONSEQUENCE, IN PLAIN WORDS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The overlay is THE DIALOG IN ANOTHER PRESENTATION. It is the same Radix portal, the same overlay
// scrim and the same content node in both, so it renders at `--z-dialog` (30) at every viewport
// width — this file adds no z utility at all. Therefore `--z-sheet` (20) now has **ZERO call sites**.
//
// The token is KEPT, not deleted: Phase 12's mobile filters and booking rail may yet need a layer
// strictly below the dialog and above the sticky header, which is exactly the gap 20 fills. And the
// zero is ASSERTED rather than merely true — `tests/design/sheet-absent.test.ts` declares an empty
// `Z_SHEET_INVENTORY` with its reason and counts both the positive and negative consumption forms,
// following the precedent 10-12 set for `shadow-sticky`. A zero that is asserted is a contract; a
// zero that is merely true is an invitation for someone to invent a home for it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// COMPOSITION: `max-sm:` CLASSES ON `DialogContent`, NEVER A FORK
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `DialogContent` already takes `className`, which is the whole reason the mobile presentation is an
// OVERRIDE and not a second component. Nothing under `src/components/ui/**` is edited by this file.
//
// EVERY GEOMETRY AND MOTION CLASS BELOW CARRIES `max-sm:`, and that is a deliberate choice over the
// other spelling. The obvious alternative is unprefixed sheet classes plus a set of `sm:` classes
// that put the centred values back. Both render the same thing today; they differ in what they can be
// WRONG about tomorrow. With `max-sm:`, **zero classes from this file apply at 640px and up** — so
// "the vendored centred dialog renders byte-unchanged at `sm:` and up" is literally true and stays
// true no matter what is added to the mobile list. With the restore-at-`sm:` spelling, that same
// sentence is a claim about two lists staying in sync, and a mobile class added without its
// restoration silently changes the desktop dialog in every adopter at once. The `max-` direction is
// already this layer's idiom — `result-card.tsx:152` uses `@max-[20rem]:` for the same reason.
//
// DISMISS AFFORDANCES: overlay click, `Escape`, and a visible close button — all three at every
// width. The close button is the vendored `DialogContent`'s own (`showCloseButton` defaults to true;
// it renders a ghost icon button pinned to the content's top-right, which is the sheet's header
// corner). It is deliberately NOT re-implemented here: a second close button would be a fork by
// duplication, and the vendored one already carries the DS-05 focus recipe and its `sr-only` "Close".
//
// TWO EXCLUSIONS, RECORDED SO NEITHER IS RE-PROPOSED AS AN OVERSIGHT:
//   • DRAG-TO-DISMISS is out of scope. It needs `vaul` or a gesture library — a new dependency with
//     its own focus behaviour, in a milestone whose net-new-dependency test bars it.
//   • THERE IS NO GRAB HANDLE, and that follows from the first exclusion rather than being a separate
//     taste call. A handle implies draggability; drag is not implemented; an affordance that lies is
//     worse than no affordance. The visible close button is the dismiss affordance.

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * The bottom-sheet presentation, below `sm:` only.
 *
 * `dvh`, NEVER `vh`, and the reason is a measured iOS Safari behaviour rather than a preference: the
 * legacy viewport-height unit is sized against the LARGEST viewport — the one with the URL bar
 * retracted — so the SAME 85% cap written in that unit is taller than the visible area while the bar
 * is showing, and the part that gets clipped is the BOTTOM. On a bottom sheet the bottom is where the
 * footer lives, and the footer is where its confirm button lives. `dvh` tracks the dynamic viewport
 * and does not clip.
 *
 * The wrong unit is named DESCRIPTIVELY above rather than written out as a class, following
 * `booking-row.tsx:112` and `panel-card.tsx`'s precedent — AC#28 scans THIS FILE'S SOURCE with
 * `/\[\d+vh\]/` and requires no match, so the comment explaining the hazard must not itself be the
 * hazard. Watched: the criterion's own probe went RED on this file's first draft, which quoted the
 * class. Recorded here so a future edit does not helpfully re-quote it.
 *
 * `overflow-y-auto` is what makes the 85% cap a scroll boundary instead of a crop.
 */
const SHEET_PRESENTATION = [
  // Anchored to the bottom edge, full-bleed, with the vendored centring translations neutralised.
  "max-sm:top-auto max-sm:right-0 max-sm:bottom-0 max-sm:left-0",
  "max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0",
  // Rounded where it meets the page, square where it meets the screen edge.
  "max-sm:rounded-t-xl max-sm:rounded-b-none",
  "max-sm:max-h-[85dvh] max-sm:overflow-y-auto",
  // Motion. Slide up from the edge it is anchored to, and neutralise the vendored `zoom-in-95` /
  // `zoom-out-95` (a full-width sheet that also scales reads as a wobble, not as a rise).
  // `zoom-in-100` / `zoom-out-100` set the enter/exit scale to 1 — the property's own initial value.
  // Both animations run at the vendored `duration-100`, inside the 320ms DS-04 budget, and BOTH are
  // silenced by the global reduced-motion reset in `@layer base`, which is why no duration token is
  // added here.
  "max-sm:data-open:slide-in-from-bottom max-sm:data-closed:slide-out-to-bottom",
  "max-sm:data-open:zoom-in-100 max-sm:data-closed:zoom-out-100",
].join(" ");

export type ResponsiveDialogProps = {
  /**
   * Controlled open state. Omit both this and `onOpenChange` to let the `trigger` drive it.
   */
  open?: boolean;
  /** Controlled-state setter. A FUNCTION prop — see the client-component note at the top. */
  onOpenChange?: (open: boolean) => void;
  /**
   * The element that opens the overlay, rendered through `DialogTrigger asChild` so the caller keeps
   * its own button, its own variant and its own accessible name (the host drawer's is "Menu").
   *
   * Optional, because a controlled adopter — a filter panel opened from a URL param, the crop UI
   * opened after an upload resolves — has no trigger element at all.
   */
  trigger?: ReactNode;
  /**
   * The accessible name of the overlay. REQUIRED, and it has no default.
   *
   * A dialog with no accessible name is a WCAG 4.1.2 failure and Radix warns about it at runtime, so
   * this is not a stylistic prop. Hiding it visually is legal (`hideTitle`); omitting it is not,
   * which is why this is a required `string` rather than an optional `ReactNode` slot.
   */
  title: string;
  /**
   * Renders the title inside `sr-only` instead of as visible chrome.
   *
   * For overlays whose content IS its own heading — a nav drawer, a media crop canvas — where a
   * visible "Menu" line would be redundant chrome. The name still reaches assistive technology; only
   * the pixels go away.
   */
  hideTitle?: boolean;
  /** The lede under the title. Also wired to `aria-describedby` by the vendored primitive. */
  description?: string;
  /** The overlay body. */
  children?: ReactNode;
  /**
   * The action row, rendered through the vendored `DialogFooter` — whose shipped `border-t
   * bg-muted/50 p-4` is already the treatment this slot needs and is deliberately not restated.
   */
  footer?: ReactNode;
};

export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  hideTitle = false,
  description,
  children,
  footer,
}: ResponsiveDialogProps) {
  // Radix wires `aria-describedby` to its own generated id unconditionally and then warns at runtime
  // when no `Description` renders under that id. The DOCUMENTED opt-out is an explicit
  // `aria-describedby={undefined}`, which overrides the generated id because Radix spreads the
  // caller's props AFTER its own attributes.
  //
  // It has to be spread CONDITIONALLY rather than written as a ternary on the attribute: JSX keeps a
  // key whose value is `undefined`, so `aria-describedby={cond ? undefined : undefined}` would strip
  // the wiring in BOTH branches and silently unlink every description this pattern ever renders.
  const describedBy: { "aria-describedby"?: undefined } = description
    ? {}
    : { "aria-describedby": undefined };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        data-testid="responsive-dialog"
        className={SHEET_PRESENTATION}
        {...describedBy}
      >
        <DialogHeader className={hideTitle ? "sr-only" : undefined}>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? (
          // The footer's shipped `rounded-b-xl` matches the centred dialog's radius; the sheet's
          // bottom corners are square against the screen edge, so the footer follows them there.
          <DialogFooter className="max-sm:rounded-b-none">{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
