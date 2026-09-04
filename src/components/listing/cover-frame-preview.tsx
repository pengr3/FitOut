// CROP-02 — the two cuts a host's cover takes, shown side by side. It changes nothing.
//
// WHY A PREVIEW AND NOT A CROPPER (999.2 § Source of truth, finding 4 · D-A). There is no single cover
// ratio to crop TO. The same photo renders wide on the listing hero and squarer on both card surfaces,
// so any destructive cover crop bakes in the wrong framing for at least one of them — and then
// `object-cover` crops it a SECOND time at the surface that disagreed. The correct fix is a stored
// focal region delivered per-surface: new persisted geometry, a URL builder and three rewritten render
// sites, which is a delivery-pipeline phase and explicitly out of scope here. So this component ships
// the honest half — it shows the host both cuts and touches no byte, no upload option, no signature
// param and no delivery URL.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE RATIOS ARE IMPORTED CLASS STRINGS, AND THAT IS THE WHOLE DESIGN (D-170 / Δ8)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// 999.2 Open Q6 resolved the other way in Aug 2026: inline literals here plus a mandatory test holding
// them in agreement with the shipped surfaces. Its premise — "no shared ratio constant exists" — was
// overturned by Phase 12. `measurements.ts` exports `MOSAIC_ASPECT` (the gallery mosaic's outer box)
// and `RESULT_CARD_MEDIA` (the result card's cover media box), and `photo-gallery.tsx:39-47` records
// the reasoning this file inherits: *"The class IS the constant, so there is one spelling."*
//
// So the frames read those two strings as CLASSES. Not parsed into numbers, not handed to the Radix
// aspect primitive's `ratio` prop. `patterns/result-card.tsx:50-62` does that parse, and it is the file
// this decision reasons AGAINST: the parse exists only to satisfy the primitive, and the primitive is
// what forces the client boundary. Dropping it means this preview *structurally cannot* disagree with
// the surfaces it previews, and it declares no ratio of its own for anything to disagree WITH.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// A SERVER COMPONENT — no `"use client"` directive, no hooks, no client-boundary import
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// That is a direct dividend of the paragraph above: `ui/aspect-ratio.tsx` carries the client directive,
// and not importing it is what keeps this file's whole import graph isomorphic. The ceiling is `cn`,
// the two measurement constants and the four copy literals — nothing else may be added without
// re-checking that claim.
//
// ⚠ THIS HEADER HAS TO QUOTE THE DIRECTIVE IT DOES NOT USE IN ORDER TO SAY THAT, so a raw
// `grep -c "use client"` on this file returns a NON-ZERO count against a correct file — the identical
// finding `patterns/empty-state.tsx:17-21` records, and 11-07 / 11-08 before it. The real property is
// "no directive PROLOGUE", and it is verified over the AST in
// `tests/listing/cover-frame-preview.test.tsx` (which is a different claim from
// `tests/design/server-only-guards.test.ts`'s — that file polices `import "server-only"`).
//
// PRESENTATIONAL, AND DELIBERATELY IGNORANT. It takes one URL and one alt string. It knows nothing
// about photos, listings, dnd-kit or the wizard, which is why "the preview follows a reorder live"
// costs zero code here: the caller re-renders it with `photos[0].url`, optimistically and with the
// same revert-on-rejection, and this component simply renders what it is handed.

import { MOSAIC_ASPECT, RESULT_CARD_MEDIA } from "@/lib/design/measurements";
import {
  COVER_PREVIEW_BODY,
  COVER_PREVIEW_CARD_CAPTION,
  COVER_PREVIEW_HERO_CAPTION,
  COVER_PREVIEW_TITLE,
} from "@/lib/listing/cover-frames";
import { cn } from "@/lib/utils";

/**
 * One frame: a media box in the surface's own declared shape, with the surface's name under it.
 *
 * `bg-muted` + `object-cover` is the shipped media-box idiom on this very surface
 * (`photo-uploader.tsx:292-298`), reused rather than re-invented so the preview reads as part of the
 * grid above it. `object-cover` is also what makes the preview HONEST — it is the same fit the real
 * surfaces apply, so the cut shown here is the cut the booker sees.
 */
function CoverFrame({
  url,
  alt,
  aspectClass,
  caption,
}: {
  url: string;
  alt: string;
  aspectClass: string;
  caption: string;
}) {
  return (
    <figure>
      <div className={cn(aspectClass, "w-32 overflow-hidden rounded-lg bg-muted sm:w-40")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`${alt} — ${caption}`} className="size-full object-cover" />
      </div>
      <figcaption className="mt-1 text-label text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/**
 * The cover-frame preview block.
 *
 * ⚠ THE `alt` IS REAL ON BOTH FRAMES AND IS NEVER EMPTY (999.2 § 2g). A decorative empty alt attribute
 * would be defensible if these were chrome, but they are not: the host is being ASKED TO JUDGE it, and
 * "is anything important cut off" is unanswerable to a screen-reader user handed two unlabelled boxes.
 * Each frame's alt composes the caller's noun with the surface's own exported caption, so both parts
 * are single exported literals (rule F2) and the two frames are distinguishable from each other.
 *
 * No accent, anywhere (Δ9). This block is information, not a control — it renders zero coral.
 */
export function CoverFramePreview({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-label font-medium">{COVER_PREVIEW_TITLE}</h2>
      <p className="text-label text-muted-foreground">{COVER_PREVIEW_BODY}</p>
      <div className="flex items-start gap-2">
        <CoverFrame
          url={url}
          alt={alt}
          aspectClass={MOSAIC_ASPECT}
          caption={COVER_PREVIEW_HERO_CAPTION}
        />
        <CoverFrame
          url={url}
          alt={alt}
          aspectClass={RESULT_CARD_MEDIA}
          caption={COVER_PREVIEW_CARD_CAPTION}
        />
      </div>
    </div>
  );
}
