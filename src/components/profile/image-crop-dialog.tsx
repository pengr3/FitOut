"use client";

// The framing step (CROP-01) — the surface this whole phase exists for.
//
// The operator's sentence on 2026-08-10 is still the standard: *"it just inserted the photo without
// confirming or adjusting the zoom and whatever."* This dialog IS the confirming and the adjusting.
// A person opens it, the stage is the screen, they drag to move, pinch or drag the slider to zoom,
// and they confirm — starting always at zoom 1, centred, because the product does not guess.
//
// THE DIRECTIVE IS REQUIRED, not stylistic: `react-easy-crop` is a class component with
// `componentDidMount`, `document`-level listeners and a stylesheet it injects itself, and it ships
// no directive of its own. Without the prologue above, this module is a Server Component and the
// cropper never mounts.
//
// INVARIANTS THIS FILE OWNS.
//   IC-01    the default framing is always zoom 1, centred — no remembered start, no auto-guess.
//   IC-02    the white matte is visible on the stage BEFORE confirming (D-177, see the stage below).
//   IC-03    a circular mask at aspect 1 — the only frame `AvatarImage` renders anywhere in `src/`.
//   IC-04    the region being cut off stays visible under the library's scrim, never hidden.
//   IC-05    zoom is bounded per image by `avatarMaxZoom`, so a saved avatar is never upscaled past
//            the real pixels the source had.
//   IC-06    the bytes come from the library's OWN <img> element, which is what makes EXIF correct
//            by construction rather than by two corrections that have to agree.
//   Delta-1  `ResponsiveDialog` is THE overlay primitive; width, padding and the mobile sheet are
//            the pattern's and are not overridden here.
//   Delta-2  the stage box is derived, not chosen — all three terms are argued at the element.
//   Delta-3  ONE dismiss guard, never three handlers. See the recorded trade at the bottom of this
//            header.
//   Delta-5c Radix's close-time focus hook is MANDATORY on this overlay — see the prop's docblock.
//   Delta-9  the phase renders zero accent. The confirm is the neutral primary, matching the
//            `Save profile` button on the same route.
//   Delta-11 the title and the description keep the primitive's typography; nothing is restated.
//   Delta-12 both footer controls are 44px, through the declared opt-in rather than a raw height.
//   D-177    the stage's backing is the matte, and 999.2's grey letterbox backing is amended away.
//   D-178    the keyboard pan is the library's own, unlayered and unsuppressed.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO.
//   - It performs NO upload and knows nothing about Cloudinary, about FormData or about the server
//     action. Props are geometry and copy; a `Blob` goes out to the caller. `AvatarField`
//     (plan 16-10) owns the file, the pre-dialog guards, the object URL's lifetime and the action.
//   - It authors NO user-visible string. Every literal it renders is imported from `@/lib/avatar`,
//     and the one sentence it cannot own — the save failure, which the server action returns at
//     runtime — arrives as a prop and is rendered verbatim, with no client re-authoring.
//   - It adds NO second focus trap and NO second escape behaviour, and it imports nothing from the
//     vendored dialog module. There is one overlay mechanism in this app and this is not a second.
//   - It mints and revokes NO object URL. Whoever mints it revokes it, and that is the caller: it
//     decodes and measures the file BEFORE this component is mounted (T-16-32, discharged in
//     plan 16-10 together with D-174's file-input reset). Two owners for one URL is worse than one.
//   - It renders NO decode spinner and NO skeleton — see the comment on the stage for why that is
//     an absence with a reason rather than a missing state.
//   - It does not spell the mask ring or the scrim as Tailwind classes. It CANNOT: plan 16-14 tried
//     that route and measured all three properties still reading the library's own values, because
//     `react-easy-crop` injects its stylesheet UNLAYERED into the document head while Tailwind v4
//     utilities live in a cascade layer, and unlayered beats layered. Delta-6's ring and scrim
//     therefore ship as an inline style over two declared tokens — see `MASK_STYLE` below, which
//     carries the reading and the consequence for the declared-token inventory.
//
// THE TRADE DELTA-3 ACCEPTS, RECORDED SO IT IS A DECISION RATHER THAN AN OVERSIGHT.
// Radix routes Escape, the overlay click AND the close control through the single `onOpenChange`
// callback, so ONE guard makes all three inert while a save is in flight. The cost is that for the
// ~1s the save takes, the close control is visible and does nothing. The visible busy signals are
// the confirm reading its busy label and the cancel rendering disabled; the close control carries
// neither. The alternative — editing the shared pattern so that control VANISHES mid-interaction —
// is worse jank, and it stays a named, cheap reversal (16-UI-SPEC Open Q16) rather than a thing
// this dialog invented for itself.

import * as React from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { ZoomInIcon, ZoomOutIcon } from "lucide-react";

import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  AVATAR_CROP_CANCEL,
  AVATAR_CROP_CONFIRM,
  AVATAR_CROP_CONFIRM_BUSY,
  AVATAR_CROP_HELPER,
  AVATAR_CROP_TITLE,
  AVATAR_POSITION_LABEL,
  AVATAR_SOFT_SOURCE_NOTE,
  AVATAR_ZOOM_LABEL,
  avatarMaxZoom,
} from "@/lib/avatar";
import { encodeAvatarBlob } from "@/lib/avatar-canvas";

/**
 * The app-wide DS-05 focus recipe, copied BYTE-FOR-BYTE from `patterns/result-card.tsx:129`.
 *
 * It travels as one string on purpose: the recipe sets an offset WIDTH and an offset COLOUR
 * together, and the half a tidying edit deletes first is the colour — which silently reinstates
 * Tailwind's hardcoded white band, visible as a halo on grove's tinted background.
 *
 * It is applied to the crop area through the library's `classes` slot rather than through the
 * pass-through props object, because that object is spread AFTER the computed className and would
 * clobber it — including the class that makes the mask round.
 */
const STAGE_FOCUS_RECIPE =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * DELTA-6 / IC-04 — the mask's 2px ring and its scrim, AS AN INLINE STYLE, and the spelling is the
 * conclusion of a measurement rather than a preference.
 *
 * WHAT THE LIBRARY SHIPS, VERBATIM, BECAUSE EVERY LINE BELOW IS A REACTION TO IT:
 *
 *     .reactEasyCrop_CropArea { border: 1px solid …; box-shadow: 0 0 0 9999em; color: … }
 *
 * so the RING is the `border` and the SCRIM's colour is the element's own `color` — the shadow
 * inherits it. A `bg-*` utility on this element would do nothing at all, and there is no second
 * element to paint instead.
 *
 * ⚠ THE CLASS ROUTE WAS TRIED FIRST AND MEASURED LOSING, in Chromium on 2026-08-25, with
 * `border-2 border-background` and the ink token's 55% modifier on `classes.cropAreaClassName`:
 *
 *     border-width : 1px                             ← the library's, not ours
 *     border-color : 255, 255, 255 at 0.5 alpha      ← the library's hairline white
 *     color        : 0, 0, 0 at 0.5 alpha            ← the library's half-strength black scrim
 *
 * (Those two colours are described rather than spelled, and that is forced rather than fussy: the
 * legacy eight-bit colour function is on the leak gate's ban list for every file under
 * `src/components/**`, so writing one out — even inside a comment explaining that it is the VENDOR's
 * and not ours — would fail the gate this decision exists to respect. `src/lib/avatar-canvas.ts`'s
 * header and 16-13's vendor-test-id paragraph set the same precedent for the same reason. The
 * verbatim strings live in plan 16-14's SUMMARY and in the e2e failure message.)
 *
 * All three properties stayed the vendor's. 16-RESEARCH § A5 predicted exactly this and named the
 * mechanism: `react-easy-crop` injects its stylesheet UNLAYERED into `document.head` at mount, while
 * Tailwind v4 utilities live inside a cascade layer, and **unlayered beats layered regardless of
 * source order or specificity** — both rules flatten to (0,1,0), so the layer is what decides. Plan
 * 16-13 measured the same defeat from the other side: DS-05's `ring-*` half is dead on this element
 * because the library's `box-shadow` already occupies that property.
 *
 * An INLINE style beats every stylesheet rule, layered or not, which is why this is a style object
 * and not a class string. It is the only one of § A5's three routes that both works and stays inside
 * the design contract:
 *
 *   - The third route — switching the library's automatic style injection OFF and importing its
 *     stylesheet ourselves — is FORBIDDEN. It puts a vendor stylesheet into our bundle graph and is
 *     the "parallel UI system" 999.2 rejected `cropperjs` for; it buys nothing this object does not.
 *     ⚠ THE PROP AND THE IMPORT PATH ARE DESCRIBED RATHER THAN SPELLED, for the same reason the two
 *     vendor colours above are: plan 16-14's acceptance criteria grep `src/` for those exact strings
 *     and require ZERO, so naming them here — even to forbid them — is what would fail the check.
 *   - Both values below are TOKENS, not literals. `color-mix()` over declared tokens is the leak
 *     gate's own prescribed idiom (`config/design-leak-patterns.mjs:150` exempts it by name, beside
 *     `ui/button.tsx:16`), and a raw colour function here would be a violation twice over.
 *
 * THE CONSEQUENCE FOR THE DECLARED INVENTORY, STATED SO NOBODY "COMPLETES" IT LATER: this route
 * produces NO Tailwind opacity-modifier class, therefore no diluted-token site, therefore no row in
 * `EXPECTED_DILUTED_TOKENS` (`tests/design/brand-recipe.test.ts`). That inventory is BIDIRECTIONAL —
 * a declared key with no site in the tree fails exactly as loudly as an undeclared site — so adding
 * a row for this scrim would REDDEN the gate. The count stays where 16-13 left it.
 *
 * 55% AND NOT 50%, AND NOT BECAUSE THE LIBRARY AGREES. Delta-6 claims 55% "is react-easy-crop's own
 * default weight"; measured, the default is 50% (see the reading above). The 55% call stands on its
 * own merits — it is lighter than the shipped overlay scrim and IC-04 wants the region being cut off
 * to stay legible — and the agreement claim is simply false.
 *
 * WHAT WOULD FALSIFY THE ROUTE: a Tailwind release that emits utilities unlayered, or a
 * `react-easy-crop` release that stops injecting its sheet. Either would make the class route win,
 * and the e2e assertion that guards this pins the computed RESULT rather than the mechanism, so it
 * stays green through the swap instead of having to be rewritten with it.
 */
const MASK_STYLE: React.CSSProperties = {
  borderWidth: 2,
  borderColor: "var(--background)",
  color: "color-mix(in oklch, var(--foreground) 55%, transparent)",
};

export type ImageCropDialogProps = {
  /**
   * Controlled by the caller. There is no trigger: this overlay opens programmatically from the
   * file input's change handler, after the guards and the decode have both passed.
   */
  open: boolean;
  /**
   * The caller's open-state setter. This component wraps it in Delta-3's single guard rather than
   * handing it to Radix directly, so the guard cannot be forgotten at a call site.
   */
  onOpenChange: (next: boolean) => void;
  /**
   * An object URL minted by the caller from the user's local file, already decoded and measured.
   *
   * The caller renders this component only while a file is staged and unmounts it otherwise, which
   * is what makes "a cancel is a true no-op" structural: no crop, zoom or bound survives a cancel
   * because no component survives it.
   */
  objectUrl: string;
  /** Handed the 400x400 JPEG the confirm produced. The caller decides where the bytes go. */
  onConfirm: (blob: Blob) => void;
  /**
   * Reported when the bytes could not be produced at all — no measured element, no crop rectangle,
   * or a rejecting encoder.
   *
   * It is a callback rather than a sentence because this component authors no copy: the caller maps
   * it to the same save-failure sentence its action would have returned and passes it back through
   * `error`, so the dialog has ONE alert region fed by ONE source whichever half failed.
   */
  onEncodeFailed: () => void;
  /** True while the caller's save is in flight. Drives the busy label and Delta-3's guard. */
  saving: boolean;
  /**
   * The save-failure sentence, verbatim from whatever the caller's action returned. `null` when
   * nothing has failed. A failure NEVER closes this dialog and never disturbs the framing (F5).
   */
  error: string | null;
  /**
   * The control that opened this overlay, so focus can be returned to it on close.
   *
   * ⚠ THIS IS NOT OPTIONAL POLISH. `responsive-dialog.tsx:205-220` records the measured Radix
   * defect: a modal dialog SUPPRESSES the browser's own focus restore in order to focus its
   * trigger's ref, and that ref is populated only by a real `DialogTrigger`. This overlay has no
   * trigger, so it would get the suppression with none of the restore — Escape drops focus to the
   * document body and the next Tab restarts the page. A real WCAG failure that nothing warns about,
   * and the reason Delta-5c makes the close-time hook mandatory here.
   */
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
};

export function ImageCropDialog({
  open,
  onOpenChange,
  objectUrl,
  onConfirm,
  onEncodeFailed,
  saving,
  error,
  returnFocusRef,
}: ImageCropDialogProps) {
  // IC-01, spelled as initial state so it cannot be anything else: zoom 1, centred. Under
  // `restrictPosition` a crop of {0,0} IS "centred", so there is no arithmetic here and none is
  // wanted.
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);

  // ⚠ INITIALISED TO 1, NOT TO THE CEILING, AND THAT COSTS EXACTLY THIS LINE. The per-image bound
  // arrives LATE — the library reports the media size from the <img>'s own load event, which is
  // after mount. A zoom row that is briefly live at 3x on a 220px source and then snaps disabled is
  // a visible lie; one that is briefly disabled and then enables is not.
  const [maxZoom, setMaxZoom] = React.useState(1);

  // The crop rectangle in SOURCE pixels, reported on interaction END. This is the encode input.
  const [area, setArea] = React.useState<Area | null>(null);

  // The library's OWN <img>. Captured, never rebuilt: the rectangle above is computed from the
  // naturals of THIS element, and browsers apply EXIF orientation to an <img> by default, so
  // drawing this same element means the rectangle and the bitmap are one coordinate system by
  // identity (IC-06). A refactor that decodes a second image here reintroduces exactly the
  // two-decoders-must-agree bug that ships a rotated avatar the preview swore was upright.
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  // The cropper instance itself, held for ONE call: the post-animation re-measure below. It is a
  // class component, so a plain ref is its instance, and `computeSizes` is on its published type.
  const cropperRef = React.useRef<Cropper | null>(null);

  /**
   * The stage wrapper, held ONLY so the post-animation re-measure below can find the overlay it
   * lives in (`closest('[role="dialog"]')`). Nothing reads its geometry — the measuring is the
   * library's, and a second measurer would be a second answer.
   */
  const stageRef = React.useRef<HTMLDivElement | null>(null);

  // Rule F8: when the source cannot support any zoom at all, the row renders DISABLED with its
  // reason beneath it — never hidden. A control that vanishes teaches nothing.
  const zoomLocked = maxZoom <= 1;

  /**
   * DELTA-3's ONE GUARD. Radix routes Escape, the overlay click and the close control through this
   * single callback, so one `return` makes all three inert while a save is in flight. Three
   * separate handlers are forbidden — they are three chances to disagree about one behaviour.
   */
  function handleOpenChange(next: boolean) {
    if (!next && saving) return;
    onOpenChange(next);
  }

  /** Delta-5c: prevent Radix's suppressed restore and put focus back where it came from. */
  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    returnFocusRef.current?.focus();
  }

  /**
   * ⚠ RE-MEASURE THE STAGE ONCE THE OVERLAY'S ENTRY ANIMATION HAS SETTLED. THIS IS NOT POLISH — IT IS
   * WHAT KEEPS IC-02 TRUE, AND WITHOUT IT THE STORED SQUARE IS NOT THE SQUARE THE PERSON SAW.
   *
   * MEASURED IN CHROMIUM, 2026-08-25 (plan 16-14, `e2e/avatar-crop.spec.ts`), with this effect
   * removed and the stage settled for a further 1.5 s:
   *
   *     the stage wrapper (layout AND painted)   288 x 288
   *     the media element, laid out by CSS       192 x 288
   *     the crop area the library wrote          182.4 x 182.4      <- 192 x 0.95, EXACTLY
   *
   * The library measures the stage with `containerRef.getBoundingClientRect()`, and a bounding rect
   * is the TRANSFORMED one. `ui/dialog.tsx` opens `DialogContent` with a `zoom-in-95` keyframe, so
   * the whole overlay is at 95% scale for its first 100 ms — and the cropper measures inside that
   * window, because the image is an object URL the caller has ALREADY decoded, so it loads within a
   * frame or two of mount. Every size the library derives is therefore 5% short.
   *
   * AND IT NEVER RECOVERS ON ITS OWN. `computeSizes` re-runs on a window resize, on its container's
   * `ResizeObserver` (whose first callback it skips), and when `rotation`, `aspect`, `objectFit` or
   * an explicit `cropSize` prop changes. A CSS transform changes none of those: the container's
   * content box never moves, so no observer fires and the wrong numbers are permanent.
   *
   * WHY THAT IS A CORRECTNESS BUG AND NOT A COSMETIC ONE. The media element is laid out by the
   * library's own stylesheet (`max-width/max-height: 100%`), so it renders at the FULL 192 x 288 —
   * while the mask drawn over it is 182.4. The person therefore sees a circle covering 95% of the
   * photo's width, and `croppedAreaPixels` — computed against the library's shrunken `mediaSize` —
   * reports 100% of it. The saved avatar contains a ~5% ring of the photograph that was never inside
   * the circle. That is precisely the divergence IC-02 exists to forbid: *the preview IS the
   * contract*, and here the preview and the bytes were two different rectangles.
   *
   * THE FIX IS ONE CALL, ON THE LIBRARY'S OWN DECLARED SURFACE. `computeSizes` is a public member of
   * the exported class (`index.d.ts:154`), so a plain React ref to this class component is an
   * imperative re-measure with no vendor internals and no reaching past the typings. It is called
   * with NO argument on purpose: the `isResizeTriggered` form DEBOUNCES the crop-data emit, and the
   * point of this call is that `onCropComplete` re-fires with the corrected rectangle before anyone
   * can press the confirm.
   *
   * WHAT WAS REJECTED, AND WHY EACH IS WORSE.
   *   - Dispatching a window `resize`. MEASURED NOT TO WORK: `componentDidMount` attaches that
   *     listener ONLY when `ResizeObserver` is undefined, and every browser in our matrix has one.
   *     The observer it uses instead watches the container's CONTENT BOX, which a transform never
   *     changes — which is also why nothing recovers on its own.
   *   - Remounting the cropper with a changed `key`. It works, and it DROPS FOCUS: the crop area is
   *     the first tabbable element in the overlay and holds focus at open, so a remount would send a
   *     keyboard user to the document body a tenth of a second after the dialog appeared.
   *   - Deferring the cropper's MOUNT until the animation ends. It would put a blank moment on the
   *     stage, contradict the "no loading state" answer to GATE-STATES recorded below, and move
   *     open-time focus onto `Cancel`.
   *   - Editing the shared overlay's entry animation. That changes six adopters to fix one, and
   *     Delta-1 makes width, padding and motion the pattern's rather than this dialog's.
   *
   * THE ONE FRAME OF DELAY IS LOAD-BEARING. `useEffect` runs at commit, BEFORE the browser's
   * "update animations" step has created the entry animation, so asking for `getAnimations()` here
   * would find an empty list and fire the resize immediately — while the overlay is still at 95%,
   * which is the state being escaped. One `requestAnimationFrame` puts the read after that step.
   *
   * AND THE READ IS SCOPED AND DEADLINED (WR-01), for reasons written at the call site: a
   * document-wide, unfiltered `getAnimations()` is gated by every animation in the tree, and one
   * infinite animation anywhere makes the repair never happen.
   *
   * WHAT WOULD FALSIFY THIS: `ui/dialog.tsx` dropping the scale from its entry animation, or
   * `react-easy-crop` measuring a content box instead of a bounding rect. Either makes this effect
   * a no-op rather than wrong, and the e2e assertion that guards it compares the crop square against
   * the media element's own rendered size — a relationship that holds under both.
   */
  React.useEffect(() => {
    let cancelled = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;

    const frame = requestAnimationFrame(() => {
      if (cancelled) return;

      // ⚠ THE OVERLAY'S OWN ANIMATIONS, NOT THE DOCUMENT'S, AND NOT THE INFINITE ONES (WR-01). This
      // read used to be `document.getAnimations()`, unfiltered, and `Promise.all` over the result.
      // Both halves were wrong in the same direction — toward NEVER RE-MEASURING, which is the
      // failure this whole effect exists to prevent:
      //   - Document-wide, so ANY animation anywhere in the tree gates the repair. A single
      //     `iteration-count: infinite` — `ui/skeleton.tsx`'s `animate-pulse`, `ui/sonner.tsx`'s
      //     `animate-spin` — never resolves `finished`, so `Promise.all` never settles and
      //     `computeSizes()` is never called at all. `/profile` happens not to mount one today,
      //     which made this latent rather than live; the correctness of a STORED asset must not
      //     depend on which unrelated component is on screen.
      //   - And no deadline, so a long or stalled animation delays the repair indefinitely.
      // The overlay is reached by walking UP from the stage through `role="dialog"` — ARIA the
      // product owns, not a test hook — so the scope is the element the entry animation is actually
      // on, plus its subtree.
      const overlay = stageRef.current?.closest('[role="dialog"]') ?? null;
      const running = (overlay?.getAnimations({ subtree: true }) ?? []).filter(
        (animation) => animation.effect?.getComputedTiming().iterations !== Infinity,
      );

      const settled = new Promise<void>((resolve) => {
        // Whichever comes first. The entry animation is a tenth of a second; 400ms is late enough
        // to be a backstop and early enough that a person cannot reach the confirm before it.
        // FAILING TOWARD THE RE-MEASURE IS THE POINT: measuring once too often is a no-op, and not
        // measuring is a saved avatar that disagrees with the preview.
        deadline = setTimeout(resolve, 400);
        void Promise.all(
          running.map((animation) => animation.finished.catch(() => undefined)),
        ).then(() => resolve());
      });

      void settled.then(() => {
        if (!cancelled) cropperRef.current?.computeSizes();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (deadline !== undefined) clearTimeout(deadline);
    };
  }, []);

  async function handleConfirm() {
    // Re-entrancy guard BEFORE the disabled attribute can apply — `request-row.tsx:165` is the
    // idiom, and the failure it prevents is a double-click that starts two saves.
    if (saving) return;

    const img = imgRef.current;
    if (!img || !area) {
      onEncodeFailed();
      return;
    }

    let blob: Blob;
    try {
      blob = await encodeAvatarBlob({ img, area });
    } catch {
      // Never close-then-report (F5). The dialog stays open with the framing intact and the caller
      // renders its sentence in the region below.
      onEncodeFailed();
      return;
    }
    onConfirm(blob);
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      // VISIBLE, deliberately. The pattern's own header names "a media crop canvas" as a candidate
      // for its screen-reader-only header mode, and this dialog declines it: that mode hides the
      // WHOLE header including the description, and the description is this dialog's only
      // disclosure of the pan / pinch / slider affordances. Hiding the title would hide the
      // instructions. The distinct close-control name is not supplied either — exactly one of this
      // phase's two overlays is mounted at any instant, so the vendored "Close" is never ambiguous
      // in a screen reader's element list.
      title={AVATAR_CROP_TITLE}
      description={AVATAR_CROP_HELPER}
      onCloseAutoFocus={handleCloseAutoFocus}
      // DOM order Cancel then confirm, which the vendored footer's reversed column puts as
      // confirm-on-top on mobile (under the thumb) and confirm-on-the-right on desktop. The confirm
      // is the NEUTRAL primary: `/profile`'s own primary action is neutral, and a coral confirm
      // would make adjusting an avatar's framing a louder visual event than saving the profile it
      // belongs to (Delta-9). The phase renders zero accent.
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="touch"
            disabled={saving}
            aria-disabled={saving}
            onClick={() => handleOpenChange(false)}
          >
            {AVATAR_CROP_CANCEL}
          </Button>
          <Button
            type="button"
            variant="default"
            size="touch"
            disabled={saving}
            aria-disabled={saving}
            onClick={handleConfirm}
          >
            {saving ? AVATAR_CROP_CONFIRM_BUSY : AVATAR_CROP_CONFIRM}
          </Button>
        </>
      }
    >
      {/* The 16px header -> body -> footer rhythm is the primitive's `grid gap-4` and is NOT
          restated here (Delta-1.3). This is the BODY's own rhythm: stage -> zoom row -> note. */}
      <div className="space-y-4">
        {/* THE STAGE.
            `relative` IS NON-NEGOTIABLE AND IS THIS PHASE'S MOST LIKELY FIRST-TRY BUG (R12). The
            library's container is `position: absolute` with all four insets at 0 and NO intrinsic
            size — it sizes itself to its offset parent. If this wrapper is not positioned, the
            cropper escapes to the nearest positioned ancestor, which inside this pattern is the
            fixed dialog content box, and fills the entire overlay.

            THE BOX, every term derived rather than chosen (Delta-2):
              320px          the cap; fits the 352px desktop inner width (384 - 32) with room left
              100vw - 2rem   the mobile sheet's real inner width — full-bleed minus its 16px padding
                             on each side
              40dvh          non-stage chrome measures ~300px on mobile against the sheet's 85dvh
                             ceiling; without this term the confirm falls below the fold on common
                             phones
              dvh, NEVER vh  iOS Safari sizes `vh` against the LARGEST viewport and clips the
                             bottom — which is exactly where the footer and its confirm live
            Worked: 320x568 -> 183px, 360x640 -> 256px, 390x844 -> 320px (capped), desktop -> 320px.
            It is authored here and NOT added to `lib/design/measurements.ts`: that module is
            read-only this phase, and the stage declares no skeleton, so it declares no measurement.

            THE BACKING IS THE MATTE (D-177), and the reason is not obvious from the class. The
            library's container has no background of its own, so whatever this wrapper paints shows
            BOTH as the letterbox bars on an extreme aspect AND through the transparent regions of a
            PNG. Those are two claims about ONE element and only one can hold. 999.2's grey
            letterbox backing is amended away because IC-02 — the person sees the white matte before
            confirming, byte-identical to what the encoder paints — is a named acceptance criterion
            and letterboxing is cosmetic. THE ACCEPTED COST, recorded: letterbox bars on a panorama
            render white rather than grey.

            NO DECODE SPINNER AND NO SKELETON, and that is not an omission — it is the honest answer
            to GATE-STATES. The guards and the decode both complete BEFORE this component is
            mounted (999.2 § 2e), so the stage never renders without its measured image and there is
            no moment to design a loading state for. */}
        <div
          ref={stageRef}
          className="relative mx-auto size-[min(320px,100vw_-_2rem,40dvh)] overflow-hidden rounded-xl bg-background"
        >
          <Cropper
            ref={cropperRef}
            image={objectUrl}
            crop={crop}
            onCropChange={setCrop}
            zoom={zoom}
            onZoomChange={setZoom}
            aspect={1}
            cropShape="round"
            // 1 BY CONSTRUCTION, not by choice: inside a square container at aspect 1 with the fit
            // mode below, the crop square already equals the shorter rendered side at zoom 1, so
            // the floor IS fit-the-mask. 16-RESEARCH § A4 works the library's own arithmetic; no
            // computation belongs here and none is written.
            minZoom={1}
            maxZoom={maxZoom}
            // BOTH OF THE NEXT TWO ARE THE LIBRARY'S DEFAULTS AND ARE STATED ANYWAY. IC-04 and
            // IC-05 rest on the clamp, and the floor above means nothing without the fit mode.
            // Leaving a load-bearing invariant implicit is what makes it invisible to the next
            // reader, and a default is a thing a minor version can change.
            restrictPosition={true}
            objectFit="contain"
            // The default here is TRUE — omit this line and a rule-of-thirds grid ships (999.2 §2b).
            showGrid={false}
            onCropComplete={(_, croppedAreaPixels) => setArea(croppedAreaPixels)}
            // The only source of the source's REAL pixels inside this dialog, and therefore the
            // only thing that can bound the zoom per image (IC-05).
            onMediaLoaded={({ naturalWidth, naturalHeight }) =>
              setMaxZoom(avatarMaxZoom(Math.min(naturalWidth, naturalHeight)))
            }
            setImageRef={(ref) => {
              imgRef.current = ref.current;
            }}
            classes={{
              // Delta-4's guard is something to VERIFY, not to re-author: the library's own
              // container rule already sets this, and it is the only thing standing between a
              // one-finger pan and the mobile sheet scrolling underneath it. What must never
              // happen is a class that turns it back on — and it must never be put on the shared
              // dialog content box, which six adopters share.
              containerClassName: "touch-none",
              // ⚠ THE FOCUS RECIPE ONLY — Delta-6's ring and scrim are NOT spelled as classes here,
              // and that is a MEASURED decision rather than a preference. See `MASK_STYLE` below.
              cropAreaClassName: STAGE_FOCUS_RECIPE,
            }}
            // DELTA-6 / IC-04, THROUGH THE ONE ROUTE THE BROWSER ALLOWS. See `MASK_STYLE`.
            style={{ cropAreaStyle: MASK_STYLE }}
            // The stage's accessible name, with zero new test hooks and zero wrapper element — this
            // is what `getByLabelText(AVATAR_POSITION_LABEL)` resolves to (Delta-18). Pass ONLY the
            // name and the role through this slot: it is spread AFTER the built-in props, so a
            // className here would clobber the computed one and a key handler here would override
            // the library's, losing the clamp and the pairing that makes the crop rectangle re-emit
            // after a keyboard nudge. The hooks the library bakes into its own DOM are vendor
            // internals that no inventory governs; the name is the thing to address it by.
            //
            // ⚠ THE ROLE IS NOT DECORATION — WITHOUT IT THE NAME IS PROHIBITED AND THE STAGE IS
            // ANONYMOUS. MEASURED by an axe pass over this open dialog (plan 16-14, court, WCAG
            // 2.2 AA): `aria-prohibited-attr`, impact SERIOUS, one node, `.reactEasyCrop_CropArea`.
            // The library renders the crop area as a bare `<div tabindex="0">`, and ARIA forbids
            // `aria-label` on an element whose implicit role is generic — a generic element is not
            // nameable, so the name is discarded and a screen-reader user lands on an unlabelled
            // focus stop in the middle of the one control this dialog exists for. Playwright's
            // `getByLabel` computes a name anyway, which is exactly why nothing caught it until a
            // real auditor ran: the tests could address an element the accessibility tree could not.
            //
            // `group` is the smallest role that fixes it: it supports an author-supplied name, it
            // changes no interaction semantics, and it leaves the library's own arrow-key handling
            // reachable. `application` — the role widgets like this often reach for — was rejected:
            // it drops assistive technology out of browse mode for everything inside it, which is a
            // large behavioural change to buy a naming fix. This is the same DEFECT FAMILY as
            // deferred item D1 (the zoom thumb's missing name), met from the other side: there the
            // name was on the wrong element, here it was on an element that cannot carry one.
            cropperProps={{ "aria-label": AVATAR_POSITION_LABEL, role: "group" }}
            // D-178, and the whole of this dialog's keyboard contract. `react-easy-crop@6.2.3`
            // already renders the crop area focusable, already pans it with the arrow keys, already
            // clamps the result, and already treats Shift as a 0.2x FINE adjust. 999.2 § 2g's
            // "8px steps, Shift = 24px coarse" is amended to match what ships: the accessibility
            // requirement is still met and only the modifier's direction changes. NOTHING ELSE
            // KEYBOARD-SHAPED IS PASSED and none of the library's own handling is suppressed —
            // authoring avatar-stage key handling here would re-create the cross-browser
            // pointer/gesture bug class D-167 chose a library to avoid.
            keyboardStep={8}
            // Wheel zoom is the library's default and is left on, which is what makes 999.2 § 2a's
            // "wheel zoom also works and needs no copy" a true sentence rather than an aspiration.
          />
        </div>

        {/* The zoom row (999.2 § 2c). The icons are decoration beside a named control, so they are
            hidden from assistive technology rather than given names of their own. */}
        <div className="flex items-center gap-1">
          <ZoomOutIcon aria-hidden className="size-4 text-muted-foreground" />
          {/* ⚠ THE VALUE IS AN ARRAY, AND THAT IS LOAD-BEARING. The vendored block computes
              `_values = [min, max]` when neither the value nor the default is an array, so a scalar
              here silently renders TWO thumbs pinned at the extremes. */}
          <Slider
            value={[zoom]}
            onValueChange={(next) => setZoom(next[0] ?? 1)}
            min={1}
            max={maxZoom}
            step={0.01}
            disabled={zoomLocked}
            aria-label={AVATAR_ZOOM_LABEL}
          />
          <ZoomInIcon aria-hidden className="size-4 text-muted-foreground" />
        </div>

        {/* Rule F8: a disabled control always carries its reason. */}
        {zoomLocked ? (
          <p className="text-label text-muted-foreground">{AVATAR_SOFT_SOURCE_NOTE}</p>
        ) : null}

        {/* The save failure, INSIDE the dialog, which stays open with the framing intact (F5). The
            caller's sentence is rendered verbatim — no client re-authoring, no re-wording, and no
            second sentence for the local-encode half, because to the person both are one outcome.
            Declared in `src/lib/design/live-regions.ts` as this file's alert #1. */}
        {error ? (
          <p role="alert" className="text-label text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
