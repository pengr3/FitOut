// CROP-02's copy — the four user-visible strings the cover-frame preview renders, and nothing else.
//
// WHAT THIS MODULE IS. 999.2 § Copywriting rule F2: every user-visible string is ONE exported literal,
// so the component and its spec assert the same bytes rather than two hand-typed copies that drift.
// The strings themselves are inherited verbatim from `999.2-UI-SPEC.md:513-516` and are NOT re-derived
// here. It is directive-free — no `"use server"`, no `"use client"` — so a Server Component can import
// it without dragging a boundary along, which is the whole point of where the preview sits.
//
// WHAT THIS MODULE DELIBERATELY DOES NOT HOLD: A RATIO. 999.2 Open Q6 asked for the preview's own two
// ratio constants to live here, plus a mandatory test holding them in agreement with the three shipped
// render surfaces. **D-170 / Δ8 reversed that**, because Q6's premise stopped being true:
// Phase 12 centralised both values in `src/lib/design/measurements.ts` as CLASS STRINGS
// (`MOSAIC_ASPECT` at `:365`, `RESULT_CARD_MEDIA` at `:50`) and `photo-gallery.tsx:39-47` records why —
// *"The class IS the constant, so there is one spelling."* `cover-frame-preview.tsx` imports those two
// strings directly. A ratio declared HERE would be a second spelling of a value that already has one,
// which is the exact hazard Q6's test was invented to police. So the ratios are absent by decision, and
// `tests/listing/cover-frame-preview.test.tsx` reads this file's source to keep them absent.
//
// F10 — THE BODY DESCRIBES THE APP'S BEHAVIOUR AND NEVER BLAMES THE PHOTO. `COVER_PREVIEW_BODY` says
// *the app* crops the cover to different shapes; it does not say the host's photo is the wrong shape.
// The cropping is a constraint FitOut invented (16:9 on the listing hero, 4:3 on both card surfaces),
// so telling the host their file is wrong for it points at the wrong party. Anyone editing this string
// should keep the subject on our side of the sentence.

/** The preview block's heading. */
export const COVER_PREVIEW_TITLE = "How your cover appears";

/** The preview block's explanatory line. See the F10 note above before editing it. */
export const COVER_PREVIEW_BODY =
  "Search cards and the listing page crop your cover to different shapes. If something important is cut off, reorder your photos or add a better cover.";

/** Caption under the 16:9 frame — the surface it stands for, in the host's terms. */
export const COVER_PREVIEW_HERO_CAPTION = "Listing page";

/** Caption under the 4:3 frame — the surface it stands for, in the host's terms. */
export const COVER_PREVIEW_CARD_CAPTION = "Search results";
