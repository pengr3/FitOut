"use client";

// BFLOW-03 / D-45 — THE FULL-SCREEN PHOTO LIGHTBOX, and the triggers that open it on the photo the
// booker actually tapped.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE IS A CLIENT COMPONENT AND `photo-gallery.tsx` IS NOT (T-12-07-BOUNDARY)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The mosaic is a Server Component: the 16/9 plate, the six templates, every `<img>` and every `alt`
// string render on the server, so they reach the OG scrape and the no-JS reader and cost the client
// bundle nothing. Only two facts are interactive — whether the dialog is open, and which photo is
// showing — so only those live here.
//
// THE TRIGGERS ARE RENDERED BY THIS FILE, WHICH IS WHAT MAKES THAT SPLIT POSSIBLE. `PhotoLightboxTrigger`
// takes the cell's server-rendered `<img>` as a CHILD; React serialises it across the boundary
// unchanged. So every photo is clickable without the mosaic gaining a hook, and without a second copy
// of the grid geometry existing as absolutely-positioned overlay buttons in this file — which was the
// other candidate shape and would have put the mosaic's layout in two files free to drift apart.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT RADIX OWNS, AND WHAT THIS FILE ADDS. THE SPLIT IS THE WHOLE DESIGN.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// RADIX OWNS, AND NONE OF IT IS RE-IMPLEMENTED HERE: the focus TRAP, `Escape`, the scroll lock, marking
// the background `aria-hidden`, and the portal. That is not a convenience — this app is required to have
// EXACTLY ONE focus-trap implementation (`ARCHITECTURE.md` §6.3, and the reason `ui/sheet.tsx` does not
// exist). The rail's fee popover already composes the same primitive; a second mechanism here would be
// the T-11-FOCUSTRAP regression arriving through a photo viewer.
//
// ⚠ FOCUS RESTORE IS THE ONE ITEM ON THAT LIST THAT RADIX DOES **NOT** GIVE US FOR FREE, AND IT LOOKS
// LIKE IT DOES. This paragraph replaces an earlier draft of this header that listed restore beside the
// trap as something inherited; `e2e/photo-lightbox.spec.ts` case (c) measured otherwise on its first
// run — Escape closed the dialog and focus went to `<body>`, from where the next Tab starts the page
// again from the top.
//
// The mechanism: Radix's MODAL dialog content sets `onCloseAutoFocus` to `event.preventDefault()`
// followed by `context.triggerRef.current?.focus()`. It deliberately suppresses the browser's own
// restore in order to put focus on ITS trigger — and `triggerRef` is only populated by
// `<DialogTrigger>`. This dialog has no `DialogTrigger` and structurally cannot have one: there are up
// to five mosaic cells plus a button, all opening ONE dialog at different indices, which is exactly why
// `openAt(index)` exists. So the optional call is a no-op on `null`, Radix's own preventDefault stands,
// and nothing focuses anything.
//
// The fix is to give it the element it is missing rather than to re-implement anything: each trigger
// hands its own DOM node to `openAt`, and `onCloseAutoFocus` focuses that. Radix still owns the trap and
// the timing; what this adds is the one reference it had no way to obtain. `patterns/responsive-dialog
// .tsx` never met this because every one of its adopters opens through `DialogTrigger asChild`.
//
// THIS FILE ADDS THE FOUR THINGS RADIX DOES NOT PROVIDE (plus that fifth, which is a repair rather than
// an addition):
//   1. A REQUIRED ACCESSIBLE NAME — an `sr-only` DialogTitle reading `Photos of {title}`. A dialog with
//      no accessible name is a WCAG 4.1.2 failure and Radix warns at runtime;
//      `patterns/responsive-dialog.tsx:139-146` makes the same point by typing its `title` as a required
//      string. This one is hidden rather than absent: the photo IS the content, and a visible heading
//      over it would be chrome nobody asked for.
//   2. ARROW-KEY PAGING, on the dialog CONTENT.
//   3. A DISTINCT CLOSE NAME — `Close photos`, not the vendored `Close`.
//   4. NO PHOTO TRANSITION. Paging swaps the `src` and nothing animates.
//
// ⚠ THE ARROW HANDLER IS ON THE CONTENT, NEVER ON `window`, and that is a correctness rule rather than a
// tidiness one (T-12-07-KEYLEAK). A `window` keydown listener fires while the dialog is CLOSED too, so
// arrow keys pressed on the listing page would page a dialog nobody opened — invisible until someone
// uses the keyboard to scroll. On the content, the handler cannot run unless the content is mounted, and
// the content is only mounted while open. `e2e/photo-lightbox.spec.ts` asserts both directions.
//
// ⚠ THE CLOSE CONTROL IS NAMED `Close photos` AND MUST NOT BE RENAMED TO `Close`. The booker path
// renders TWO visible close buttons on this route — this one and the booking sheet's `Close booking` —
// and two controls both announcing "Close" are indistinguishable in a screen reader's element list. The
// vendored `DialogContent` ships an `sr-only` "Close" by default, which is why `showCloseButton` is
// switched OFF below rather than left at its default and supplemented: leaving it on would render both.
//
// ⚠ NOT `ResponsiveDialog` (D-45). RESP-01's primitive is for PANELS, and its whole shape is a bottom
// sheet below `sm:` and a centred card above it. A photo viewer wants the WHOLE screen at 375px exactly
// as it does at 1440px, which is a different presentation of the same underlying dialog rather than a
// variant of that pattern. So this composes `ui/dialog` directly. It carries `photo-lightbox` and NOT
// `responsive-dialog`, and the e2e spec asserts the second half as well as the first — one overlay
// MECHANISM, two presentations, and the hooks say which is which.

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * One photo, with its alt string ALREADY BUILT BY THE SERVER.
 *
 * The alt is a prop rather than something this file composes, and that is deliberate. `photoAlt()` lives
 * in `photo-gallery.tsx`, which is a Server Component; importing it here would either create an import
 * cycle (the gallery imports this file) or, if the helper moved here, make a server component call a
 * function exported from a client module — which React rejects at runtime. Passing the finished string
 * keeps ONE definition of the alt form, on the server, feeding both the mosaic and this dialog.
 */
export type LightboxPhoto = {
  readonly id: string;
  readonly url: string;
  readonly alt: string;
};

type LightboxApi = {
  /**
   * Open the dialog showing photo `index` (0-based).
   *
   * `opener` is the control that is doing the opening, and it is REQUIRED rather than convenient: it is
   * the element focus has to come back to when the dialog closes, and Radix cannot work it out for
   * itself here. See the focus-restore paragraph in this file's header.
   */
  readonly openAt: (index: number, opener: HTMLElement | null) => void;
};

/**
 * `null` when no provider is mounted, which is the honest default: a trigger rendered outside a
 * `PhotoLightbox` has nothing to open, and silently doing nothing is better than throwing on a surface
 * whose only job is to show photographs.
 */
const LightboxContext = React.createContext<LightboxApi | null>(null);

/**
 * THE RADIX `aria-describedby` OPT-OUT, IN `responsive-dialog.tsx:176-186`'s EXACT SHAPE.
 *
 * Radix wires `aria-describedby` to its own generated id unconditionally and then warns at runtime when
 * no `Description` renders under that id. The documented opt-out is an explicit
 * `aria-describedby={undefined}`, which wins because Radix spreads the caller's props AFTER its own.
 *
 * IT MUST BE SPREAD, NEVER WRITTEN AS A TERNARY ON THE ATTRIBUTE. JSX keeps a key whose value is
 * `undefined`, so `aria-describedby={cond ? undefined : undefined}` strips the wiring in BOTH branches —
 * which is fine here by accident and catastrophic the moment someone adds a description. Spreading an
 * object is the form that stays correct under that edit.
 *
 * The object is a module constant rather than a per-render conditional because this dialog has no
 * description and never will: its body is one photograph. Writing `description ? {} : {…}` here would be
 * a conditional with one reachable branch — fiction dressed as generality. The SHAPE that matters is the
 * spread, and that is what is preserved.
 */
const DESCRIBED_BY: { readonly "aria-describedby"?: undefined } = {
  "aria-describedby": undefined,
};

/**
 * The full-screen presentation, as overrides on the vendored `DialogContent`.
 *
 * Composition rather than a fork, for `responsive-dialog.tsx:48-52`'s reason: `DialogContent` already
 * takes a `className`, so nothing under `src/components/ui/**` is edited to get a second presentation.
 * `cn()` is tailwind-merge, so each utility here replaces the vendored one it conflicts with — the
 * centring translations, the `max-w-*` cap (including its `sm:` step), the radius, the padding and the
 * hairline ring all go, and what is left is a box the size of the viewport.
 *
 * `dvh` / `dvw`, NEVER the legacy units, and the reason is the measured iOS Safari behaviour
 * `responsive-dialog.tsx:91-105` records: the legacy viewport-height unit is sized against the
 * URL-bar-retracted viewport, so a full-height box written in it is TALLER than the visible area and
 * what gets clipped is the bottom — which is where this dialog's entire chrome row lives. The legacy
 * unit is named descriptively here and never written out, because `tests/design/sheet-absent.test.ts`
 * scans for it and a comment quoting the hazard would BE the hazard.
 *
 * `bg-foreground/90` is the scrim, and it carries NO text — every string in this dialog sits on the
 * `bg-background` plate below. That is a contrast decision, not a styling one: the scrim is the one
 * surface on this route with no page token behind it, so ink placed directly on it would be a pairing
 * outside the declared inventory (`src/lib/design/contrast-pairs.ts`). Tokened controls on a tokened
 * plate keeps every pairing inside it.
 */
const LIGHTBOX_PRESENTATION = [
  "top-0 left-0 h-dvh w-dvw max-w-none translate-x-0 translate-y-0 sm:max-w-none",
  "grid-rows-[1fr_auto] gap-0 rounded-none p-0 ring-0",
  "bg-foreground/90",
].join(" ");

/**
 * The mosaic cell's trigger: a bare button wrapping the server-rendered `<img>`.
 *
 * NO `aria-label`. The button's accessible name comes from the nested image's `alt`, which already reads
 * `{title} — photo {i} of {N}` — the standard image-button pattern, and the reason alt text exists. An
 * `aria-label` here would OVERRIDE that string with a second one saying the same thing, and the e2e
 * spec's focus-return assertion (which addresses the trigger by its computed name) would then be
 * checking a label written for the test rather than the one a screen-reader user hears.
 *
 * The focus classes are `button.tsx`'s base recipe verbatim (DS-05, plan 10-06) rather than a variant of
 * it: `focus-recipe.test.ts` bans any diluted ring colour anywhere under `src/`, and the way that ban
 * gets broken is a bespoke focus treatment on a bespoke control, which is exactly what this is.
 */
export function PhotoLightboxTrigger({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const api = React.useContext(LightboxContext);

  return (
    <button
      type="button"
      // `event.currentTarget` rather than a ref: it IS this button, it is never stale, and it costs no
      // extra state. What matters is that the island is handed the opener at all — see the header.
      onClick={(event) => api?.openAt(index, event.currentTarget)}
      className="block size-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </button>
  );
}

/**
 * The `Show all {N} photos` control. Opens on photo 1 — it is a way INTO the set, not a jump to its end.
 *
 * `size="touch"` is D-22's explicit 44px opt-in. It is not optional on this control: below `sm:` this
 * button is the ONLY route to photos 2..N, and it sits on host photography where a small target is also
 * a low-contrast one.
 */
export function PhotoLightboxShowAll({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const api = React.useContext(LightboxContext);

  return (
    <Button
      type="button"
      variant="outline"
      size="touch"
      className={className}
      onClick={(event) => api?.openAt(0, event.currentTarget)}
    >
      {children}
    </Button>
  );
}

export function PhotoLightbox({
  photos,
  title,
  children,
}: {
  photos: readonly LightboxPhoto[];
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  /**
   * The control that opened the dialog, so focus can be put back on it.
   *
   * A ref rather than state: nothing renders from it, and writing it during an event handler must not
   * cause a render. See the focus-restore paragraph in this file's header for why Radix does not know
   * this element and cannot find it.
   */
  const openerRef = React.useRef<HTMLElement | null>(null);

  const total = photos.length;

  const api = React.useMemo<LightboxApi>(
    () => ({
      openAt: (index: number, opener: HTMLElement | null) => {
        openerRef.current = opener;
        setActiveIndex(index);
        setOpen(true);
      },
    }),
    [],
  );

  /**
   * Put focus back on the control that opened the dialog.
   *
   * Radix's modal content already calls `preventDefault()` here and then focuses its own
   * `DialogTrigger`, of which this dialog has none — so without this handler its suppression of the
   * browser's native restore stands and focus lands on `<body>`. Measured, not assumed:
   * `e2e/photo-lightbox.spec.ts` case (c) is red without it.
   *
   * When there IS no recorded opener the handler does nothing at all and Radix's behaviour is left
   * exactly as it was. That is deliberate: an unconditional `preventDefault()` here would take over a
   * decision this file has no basis for making.
   */
  const onCloseAutoFocus = React.useCallback((event: Event) => {
    const opener = openerRef.current;
    if (opener === null) return;
    event.preventDefault();
    opener.focus();
  }, []);

  /**
   * Paging WRAPS rather than clamping, and that is a focus decision more than a navigation one.
   *
   * Clamping means `Previous photo` has to be disabled on photo 1 and `Next photo` on photo N — and a
   * control that becomes disabled WHILE FOCUSED loses focus to `<body>`, which inside a focus trap
   * leaves the keyboard user with nothing selected in a dialog they cannot see the edges of. Wrapping
   * keeps both controls live at every index, so focus never goes anywhere unexpected, and it is what
   * every shipped photo viewer does anyway.
   */
  const step = React.useCallback(
    (delta: number) => {
      setActiveIndex((current) => (current + delta + total) % total);
    },
    [total],
  );

  /**
   * ArrowLeft / ArrowRight, ON THE CONTENT. See this file's header for why never on `window`.
   *
   * `Escape` is deliberately absent from this switch: Radix already closes on it, and handling it here
   * would be a second escape behaviour in a codebase whose overlay decision is that there is one.
   */
  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    },
    [step],
  );

  const active = photos[activeIndex] ?? photos[0];

  return (
    <LightboxContext.Provider value={api}>
      {children}

      {total > 0 && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            data-testid="photo-lightbox"
            // OFF, not left at its default: the vendored close button announces "Close", and this
            // dialog's close control has to be distinguishable from the booking sheet's. See header.
            showCloseButton={false}
            className={LIGHTBOX_PRESENTATION}
            onKeyDown={onKeyDown}
            onCloseAutoFocus={onCloseAutoFocus}
            {...DESCRIBED_BY}
          >
            <DialogTitle className="sr-only">{`Photos of ${title}`}</DialogTitle>

            <div className="flex min-h-0 items-center justify-center p-4">
              {/*
                NO TRANSITION, BY CONSTRUCTION. Paging swaps this element's `src` and nothing else
                happens: no `transition-*`, no `animate-*`, no `key` forcing a remount. A cross-fade
                between two arbitrary host photographs is 200ms of visual noise and a second thing to
                keep inside the DS-04 motion budget, for no information gained.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={active.alt}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/*
              THE CHROME PLATE. Every control and the counter sit on `bg-background` carrying
              `text-foreground`, which is a declared pairing; nothing is bare ink on the scrim.
            */}
            <div className="flex items-center justify-between gap-2 bg-background p-2 text-foreground">
              <Button
                type="button"
                variant="ghost"
                size="touch"
                onClick={() => step(-1)}
              >
                <ChevronLeftIcon aria-hidden="true" />
                <span className="sr-only">Previous photo</span>
              </Button>

              {/* `tabular-nums` so the counter's box does not twitch between `1 / 8` and `8 / 8`. */}
              <span className="text-sm tabular-nums">
                {activeIndex + 1} / {total}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="touch"
                  onClick={() => step(1)}
                >
                  <ChevronRightIcon aria-hidden="true" />
                  <span className="sr-only">Next photo</span>
                </Button>

                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="touch">
                    <XIcon aria-hidden="true" />
                    <span className="sr-only">Close photos</span>
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </LightboxContext.Provider>
  );
}
