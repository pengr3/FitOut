// Public listing photo gallery (LIST-06 / D-04 / BFLOW-03) — an Airbnb-style 5-up MOSAIC with named
// fallbacks, cover-first, accessible, responsive.
//
// Presentational + server-safe — no hooks and no client-boundary directive — so the public detail RSC
// can render it directly. Photos arrive already ordered (position 0 = cover) from publicListing().
//
// ⚠ THE CLIENT-BOUNDARY DIRECTIVE IS NAMED DESCRIPTIVELY THROUGHOUT THIS FILE AND IS NEVER SPELLED OUT,
// which is a rule rather than a style choice. 12-07's acceptance criterion is a `grep -c` for that exact
// string in THIS file, required to return zero — so a comment containing it, even one saying the file
// must not have one, turns the gate red against a correct implementation. Measured twice: the first
// draft of this header spelled it out three times and scored 3, and the correction that replaced those
// three with prose still scored 1, because the corrected sentence QUOTED THE GREP COMMAND. Same rule and
// same reason as `booking-row.tsx:112` and `responsive-dialog.tsx`'s viewport-height note; this is the
// sixth instance of the shape in this repository, and the first where the check is a plan's own grep
// rather than a test — which is why it had to be discovered by running the criterion rather than by a
// red suite.
//
// Each image carries
// descriptive alt text derived from the listing title, and the whole mosaic sits inside one fixed
// `MOSAIC_ASPECT` box so the page never reflows as images load (the muted background is the built-in
// loading affordance; the route also has a skeleton loading.tsx). Delivery is the stored Cloudinary
// secure_url via a plain <img> (same as the host listing-card) — this keeps the anonymous page free of
// any Cloudinary client config and works in e2e without live credentials.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY SIX SHAPES AND NOT ONE GRID WITH HOLES IN IT (D-44)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Seed listings carry between ONE and EIGHT photos, so the fallbacks are the normal case rather than the
// edge. A single `hero + 2x2` template rendered at three or four photos leaves an empty cell — a muted
// rectangle that reads as a failed image rather than as "this host uploaded three photos". So the count
// picks a TEMPLATE, and `MOSAIC_SHAPES` below is that mapping, declared as data so the gate can assert
// it per count instead of inspecting pixels.
//
// The outer box is `MOSAIC_ASPECT` at EVERY count, including zero. That is what lets the route's
// `loading.tsx` reserve the gallery's height before any photo count is known: the skeleton and the real
// mosaic read ONE string, so they cannot disagree.
//
// ⚠ THE 16/9 BOX IS NO LONGER `<AspectRatio ratio={16 / 9}>`, AND THAT IS A DELIBERATE SWAP RATHER THAN
// A TIDY-UP. `measurements.ts`'s own header names the hazard: `RESULT_CARD_MEDIA` and
// `AspectRatio ratio={4 / 3}` are "two spellings of one number in two languages", and only a rendered
// comparison can catch them drifting. Keeping the Radix primitive here while `loading.tsx` sizes itself
// from `MOSAIC_ASPECT` would have rebuilt exactly that hazard on this route — the skeleton and the plate
// would agree by coincidence rather than by construction. The class IS the constant, so there is one
// spelling. (It also drops a CLIENT dependency: `ui/aspect-ratio.tsx` carries the client-boundary
// directive, so the shipped "server-safe" claim in this header was true of this file and not of its
// import graph. Removing it makes the claim true of both.)
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SERVER/CLIENT SPLIT — WHICH HALF IS WHICH, AND WHY (T-12-07-BOUNDARY)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// THIS FILE is the mosaic: the box, the six templates, every `<img>` and every `alt` string. It renders
// on the server, so the plate and the alt text reach the OG scrape and the no-JS reader.
//
// `photo-lightbox.tsx` IS THE INTERACTIVE LAYER: `open`, `activeIndex`, the dialog, and THE TRIGGERS.
// Its triggers wrap each cell's server-rendered `<img>` as a CHILD, which is what keeps this file free
// of hooks and of the client-boundary directive while still making every photo openable. The alternative
// (making the mosaic a client component) would drag the plate client-side for one piece of state, and
// the alternative to THAT (absolutely-positioned overlay buttons) would duplicate the grid geometry in a
// second file where it could drift.
//
// THE ALT STRINGS ARE BUILT HERE AND HANDED DOWN, which is the other half of keeping the split honest.
// `photoAlt()` is defined in this server module and the finished strings are passed to the island as
// props, so the mosaic and the dialog cannot disagree about what photo 3 of 8 is called. It is a prop
// rather than a shared import because the import would have to go one way or the other: this file
// importing the island is what already happens, and the island importing `photoAlt` back would be a
// cycle — while MOVING the helper into the island would make a Server Component call a function exported
// from a client module, which React rejects at runtime.

import { ImageIcon } from "lucide-react";

import {
  PhotoLightbox,
  PhotoLightboxShowAll,
  PhotoLightboxTrigger,
} from "@/components/listing/photo-lightbox";
import { MOSAIC_ASPECT } from "@/lib/design/measurements";
import type { PublicListingPhoto } from "@/lib/listing-public";

/**
 * How many photos the WIDE mosaic can show at once. Above this the surplus is reachable only through
 * the lightbox, which is exactly what the `Show all {N} photos` button is for.
 */
export const MOSAIC_MAX_CELLS = 5;

/** One named mosaic template. `grid` and `heroSpan` are `sm:`-prefixed — see `COLLAPSED_GRID`. */
export type MosaicShape = {
  /** The shape's name, used by the gate's failure messages so a wrong template names itself. */
  readonly name: string;
  /** The `sm:`-and-up grid template. Below `sm:` every shape collapses to `COLLAPSED_GRID`. */
  readonly grid: string;
  /** What the hero spans in that template. Empty when the hero occupies a single cell. */
  readonly heroSpan: string;
  /** How many photos this shape RENDERS. Never more than the photo count, never a hole. */
  readonly cells: number;
};

/**
 * Below `sm:` the mosaic collapses to the hero alone (12-UI-SPEC § The gallery and lightbox).
 *
 * It is one grid cell, and every non-hero cell carries `max-sm:hidden` — so the collapse is a real
 * single-column layout rather than a squeezed five-up. Tapping the hero opens the lightbox on photo 1,
 * and the button (which renders whenever N > 1 down here) is how the rest are reached.
 */
const COLLAPSED_GRID = "grid-cols-1 grid-rows-1";

/**
 * THE SIX SHAPES, as data. Keyed by photo count; `5` is the last key and covers every count above it.
 *
 * Declared rather than computed so `tests/listing/photo-gallery.test.tsx` can assert the rendered
 * container against the shape this module says belongs to that count, at each of the seven counts the
 * seed data actually produces (0, 1, 2, 3, 4, 5, 8).
 *
 * The arithmetic each template encodes, so a reader does not have to run it:
 *   3 → cols [2fr 1fr] x 2 rows, hero spanning both  → a hero and a STACKED PAIR
 *   4 → cols [2fr 1fr] x 3 rows, hero spanning all   → a hero and THREE stacked in one column
 *   5+→ cols [2fr 1fr 1fr] x 2 rows, hero spanning   → a hero and a 2x2
 * Auto-placement fills the remaining tracks in source order, which is why no cell needs its own
 * placement class and why a shape can never leave a hole: the template has exactly `cells` slots.
 */
export const MOSAIC_SHAPES: Readonly<Record<number, MosaicShape>> = {
  0: { name: "empty", grid: "", heroSpan: "", cells: 0 },
  1: { name: "hero", grid: "sm:grid-cols-1 sm:grid-rows-1", heroSpan: "", cells: 1 },
  2: { name: "pair", grid: "sm:grid-cols-2 sm:grid-rows-1", heroSpan: "", cells: 2 },
  3: {
    name: "hero-stack-2",
    grid: "sm:grid-cols-[2fr_1fr] sm:grid-rows-2",
    heroSpan: "sm:row-span-2",
    cells: 3,
  },
  4: {
    name: "hero-stack-3",
    grid: "sm:grid-cols-[2fr_1fr] sm:grid-rows-3",
    heroSpan: "sm:row-span-3",
    cells: 4,
  },
  5: {
    name: "hero-quad",
    grid: "sm:grid-cols-[2fr_1fr_1fr] sm:grid-rows-2",
    heroSpan: "sm:row-span-2",
    cells: 5,
  },
};

/** The template for a photo count. Counts above `MOSAIC_MAX_CELLS` all render the five-up. */
export function mosaicShape(photoCount: number): MosaicShape {
  return MOSAIC_SHAPES[Math.min(photoCount, MOSAIC_MAX_CELLS)] ?? MOSAIC_SHAPES[0];
}

/**
 * Where `Show all {N} photos` renders, per layout. THE PREDICATE IS "A PHOTO IS HIDDEN", not a count.
 *
 * Below `sm:` the mosaic shows ONE photo, so the button is honest from two upward. At `sm:` and up it
 * shows five, so the button is honest from six upward — at exactly five the mosaic is already showing
 * every photo the host uploaded and a button offering to "show all 5" would be a lie. That is why the
 * wide predicate is `> 5` and not `>= 5`, and why 5 is one of the seven counts the gate covers.
 *
 * ONE ELEMENT, NOT TWO. The two layouts are served by a single button whose `sm:hidden` is added when
 * the wide predicate is false, rather than by a mobile button and a desktop button — two controls with
 * the same accessible name in one document is a strict-mode ambiguity in Playwright and a duplicate
 * entry in a screen reader's element list, for a difference that is purely presentational.
 */
export function showAllPhotosVisibility(photoCount: number): {
  readonly collapsed: boolean;
  readonly wide: boolean;
} {
  return { collapsed: photoCount > 1, wide: photoCount > MOSAIC_MAX_CELLS };
}

/** `{title} — photo {i} of {N}` — the ONE alt form, shared by the mosaic and the lightbox (D-44). */
export function photoAlt(title: string, index: number, total: number): string {
  return `${title} — photo ${index + 1} of ${total}`;
}

export function PhotoGallery({
  photos,
  title,
}: {
  photos: PublicListingPhoto[];
  title: string;
}) {
  const total = photos.length;

  if (total === 0) {
    // The shipped zero state, now sized from the same constant as every other count — so a listing
    // with no photos occupies exactly the height the route's skeleton reserved for it.
    return (
      <section aria-label={`Photos of ${title}`}>
        <div
          className={`${MOSAIC_ASPECT} flex w-full items-center justify-center rounded-xl bg-muted text-muted-foreground`}
        >
          <span className="flex items-center gap-2 text-sm">
            <ImageIcon className="size-4" aria-hidden="true" /> No photos yet
          </span>
        </div>
      </section>
    );
  }

  const shape = mosaicShape(total);
  const visible = photos.slice(0, shape.cells);
  const button = showAllPhotosVisibility(total);

  // EVERY photo, not just the five the mosaic shows — the dialog pages through the whole set, and the
  // alt strings are built once, here, on the server.
  const lightboxPhotos = photos.map((photo, i) => ({
    id: photo.id,
    url: photo.url,
    alt: photoAlt(title, i, total),
  }));

  return (
    <section aria-label={`Photos of ${title}`} className="relative">
      <PhotoLightbox photos={lightboxPhotos} title={title}>
        <ul
          className={`${MOSAIC_ASPECT} ${COLLAPSED_GRID} ${shape.grid} grid w-full gap-2 overflow-hidden rounded-xl`}
        >
          {visible.map((photo, i) => (
            <li
              key={photo.id}
              // The hero is the only cell that survives the collapse; the rest are laid out only from
              // `sm:` up. `overflow-hidden` is per-cell because `object-cover` crops to the CELL, whose
              // ratio is decided by the template rather than by the photo.
              className={`overflow-hidden bg-muted ${i === 0 ? shape.heroSpan : "max-sm:hidden"}`}
            >
              <PhotoLightboxTrigger index={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photoAlt(title, i, total)}
                  loading={i === 0 ? undefined : "lazy"}
                  className="size-full object-cover"
                />
              </PhotoLightboxTrigger>
            </li>
          ))}
        </ul>

        {button.collapsed && (
          <PhotoLightboxShowAll
            // `bg-background` is restated on the plate because this control sits ON host photography:
            // the `outline` variant's own background is what keeps it legible over an arbitrary image,
            // and it must not become transparent at any breakpoint.
            className={`absolute right-4 bottom-4 bg-background ${button.wide ? "" : "sm:hidden"}`}
          >
            Show all {total} photos
          </PhotoLightboxShowAll>
        )}
      </PhotoLightbox>
    </section>
  );
}
