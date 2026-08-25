// The avatar crop's pixel plumbing (CROP-01): measure a source image, and turn the crop rectangle
// the user chose into the exact bytes we store. Three invariants own this file.
//
//   IC-06 / D-172 — the stored asset is ALWAYS AVATAR_OUTPUT_PX square, JPEG, quality 0.9, with
//                   transparency flattened onto opaque white. One format, no branching.
//   IC-02         — the user sees that white matte in the crop stage BEFORE confirming, so the
//                   matte is painted HERE, deterministically, rather than left to whatever a
//                   browser's JPEG encoder picks for a transparent region (Firefox picks black;
//                   Chrome and Safari differ again). JPEG has no alpha channel, so SOMETHING
//                   chooses — we would rather it were us, identically in every browser.
//   Delta-7       — the opaque-white literal is legal HERE and nowhere else. `src/lib/**` sits
//                   outside the leak gate's LEAK_SCAN_PREFIXES (`["src/app/", "src/components/"]`,
//                   config/design-leak-patterns.mjs:218), so this file may spell a colour; the same
//                   literal in a component is a leak-gate violation twice over.
//                   THIS MODULE MUST THEREFORE STAY UNDER `src/lib/**`.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO.
//   - It does not upload anything. It returns a Blob; the caller decides where it goes.
//   - It knows nothing about Cloudinary, about the server action, or about FormData.
//   - It reads no DOM beyond the one element it is handed and the throwaway canvas it creates.
//   - It never builds a second image element for the encode, and it never reaches for a second
//     decoder. That restraint is the feature, not an omission — see below.
//
// THE LESSON, STATED AS THE REASON RATHER THAN THE RULE.
// The preview the user framed and the bytes we store must be ONE bitmap, not two bitmaps that
// happen to agree. `react-easy-crop` computes `croppedAreaPixels` from the `naturalWidth` /
// `naturalHeight` it reads off one specific `<img>` element, and browsers apply EXIF orientation to
// an `<img>` by default (`image-orientation: from-image` is the CSS initial value), so that
// rectangle is already stated in ORIENTED space. Draw that SAME element and the source rectangle
// and the source bitmap are one coordinate system by identity, with no second orientation
// correction that has to agree with the first. That is the whole reason `encodeAvatarBlob` takes an
// `HTMLImageElement` IN rather than a URL. A later refactor that "tidies" it into taking a URL — so
// it can decode for itself — has silently reintroduced the two-decoders-must-agree structure IC-06
// was written against, and the bug it produces is a rotated stored avatar that the preview swore
// was upright.
//
// A NOTE ON SPELLING, so nobody "corrects" the prose below. The rejected decode APIs are described
// rather than named, and the media attribute we deliberately never set is written in prose form.
// The plan's acceptance criteria grep this file for those exact identifiers in order to prove the
// file does not USE them, so writing one out — even inside a comment explaining why we don't — would
// fail the very check that guards the decision. Same reasoning, and same precedent, as the header of
// src/lib/avatar.ts.
//
// WHERE THIS MODULE'S PROOFS LIVE. There is no Vitest spec for this file, on purpose: jsdom 29.1.1
// returns null from `getContext("2d")` and does not implement `URL.createObjectURL`, so a unit test
// here could only assert against a stub of a fiction. The real assertions are the Playwright specs
// in plans 16-12 and 16-13, which drive a real browser over a real EXIF-Orientation-6 fixture and
// compare a pixel of the preview against the same pixel of the produced Blob.

import { AVATAR_OUTPUT_PX } from "@/lib/avatar";

/**
 * The matte. Opaque white, painted across the whole canvas before anything is drawn, so a PNG or
 * WebP carrying an alpha channel composites onto a known colour instead of an encoder's guess.
 *
 * NOT exported, deliberately. The crop stage shows the user this same white via `bg-background` — a
 * token, not a literal (Delta-7) — and exporting it would hand a component a legal-looking way to
 * import a raw colour past the leak gate. Court's `--background` is `oklch(1 0 0)`, byte-identical
 * to this, which is what makes IC-02 exact in the shipped theme rather than merely close.
 */
const AVATAR_MATTE = "#ffffff";

/** The one output format. JPEG has no alpha channel, which is why the matte above exists (D-172). */
const AVATAR_OUTPUT_TYPE = "image/jpeg";

/**
 * Quality 0.9, inherited from IC-06 and not re-derived. A 400x400 photographic JPEG at q0.9 lands
 * around 30-60 KB — three orders of magnitude under AVATAR_MAX_BYTES (5 MB), so there is no size
 * pressure here and a lower value would trade visible quality for nothing.
 */
const AVATAR_OUTPUT_QUALITY = 0.9;

/** The crop rectangle, in SOURCE pixels. Shape-compatible with `react-easy-crop`'s `Area`. */
export type AvatarCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Measure a source image by loading it into an `<img>` and reading its naturals.
 *
 * Used by the pre-dialog guard chain (type -> size -> decode -> dimensions). The resolved size feeds
 * `avatarMaxZoom()` and the AVATAR_MIN_SOURCE_PX comparison; the caller maps the rejection to
 * AVATAR_UNREADABLE_MESSAGE.
 *
 * "UNDECODABLE" IS THE `error` EVENT FIRING, FULL STOP. That single event is the entire definition,
 * and it covers the corrupt file, the mislabelled `.png` that is really a PDF, and the HEIC that
 * slipped past the picker's `accept`. The HEIC case produces an asymmetry worth naming so that
 * nobody chases it as a bug: Safari on macOS decodes HEIC in an `<img>` and Chrome on Windows does
 * not, so the SAME file is measurable on one machine and refused on another — and BOTH outcomes are
 * correct. We accept exactly what the user's own browser can render, which is also exactly what the
 * crop stage will be able to show them.
 *
 * THREE ALTERNATIVES CONSIDERED AND REJECTED (see the header's note on spelling):
 *   1. The async global that decodes a File straight to an `ImageBitmap`. It works, and it rejects
 *      on undecodable input — but it is a SECOND decoder path from the `<img>` the crop stage uses,
 *      and this guard must agree with that stage about what "decodable" and "how many pixels" mean.
 *   2. The image element's own `decode` promise. It reads more nicely than an `error` handler, but
 *      jsdom does not implement it (measured: the method is `undefined` there) and it buys nothing
 *      over the two event handlers below, which need no fallback.
 *   3. Parsing the file header by hand. That is re-implementing a JPEG/PNG/WebP parser to learn
 *      dimensions the browser already knows. No.
 *
 * @param url an object URL minted from the user's local File.
 */
export function measureImage(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () =>
      reject(new Error("avatar-canvas: the browser could not decode that image"));
    img.src = url;
  });
}

/**
 * Draw the caller's own `<img>` through the crop rectangle and encode the result as the avatar we
 * store: AVATAR_OUTPUT_PX square, JPEG, q0.9, transparency already flattened onto white.
 *
 * `img` MUST be the element `react-easy-crop` measured (captured through its `setImageRef` prop) and
 * `area` MUST be the `croppedAreaPixels` it reported for THAT element. Passing a freshly built image
 * would still typecheck and would still produce a plausible-looking square — and would be exactly
 * the regression this module's header describes.
 *
 * The steps below happen in one order and the order is load-bearing: size the canvas, paint the
 * matte across ALL of it, then draw. Painting after the draw would erase the photo; not painting at
 * all would hand transparent regions back to the encoder's own default.
 *
 * Both failure branches REJECT rather than resolve, and neither may be swallowed: a swallowed null
 * would reach the caller as a non-Blob, be set on the FormData anyway, and surface as a confusing
 * server-side Zod complaint instead of the save-failure sentence the user is supposed to see.
 *
 * No cross-origin attribute is set on anything here, deliberately. The source is an object URL
 * minted from a local File, which is same-origin, so the canvas cannot be tainted and `toBlob`
 * cannot throw a security error; setting that attribute on an object URL can only cause trouble.
 *
 * Animated sources need no handling and get none: drawing an `<img>` draws the frame it is currently
 * presenting, which for an animated WebP or GIF at load is the first one. That is 999.2 rule F7's
 * "no detection, no warning", satisfied by doing nothing.
 */
export function encodeAvatarBlob(input: {
  img: HTMLImageElement;
  area: AvatarCropArea;
}): Promise<Blob> {
  const { img, area } = input;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_PX;
  canvas.height = AVATAR_OUTPUT_PX;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(
      new Error("avatar-canvas: 2d drawing context unavailable"),
    );
  }

  // FIRST, and across the whole canvas, so alpha composites onto white rather than onto a guess.
  ctx.fillStyle = AVATAR_MATTE;
  ctx.fillRect(0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX);

  // The destination rectangle is the LITERAL 0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX — never
  // `area.width` / `area.height`, which appear in this call ONLY as source dimensions. Deriving the
  // destination from the source would emit a 300x300 asset from a 300x300 photo and quietly break
  // IC-06's "always 400x400" — the single fact that lets the 400x400 `c_fill` in src/lib/cloudinary.ts
  // be called the geometric identity on the honest path (D-171).
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    AVATAR_OUTPUT_PX,
    AVATAR_OUTPUT_PX,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("avatar-canvas: the encoder returned no blob")),
      AVATAR_OUTPUT_TYPE,
      AVATAR_OUTPUT_QUALITY,
    );
  });
}

/**
 * Release an object URL the avatar flow minted.
 *
 * A one-line wrapper, and it earns its existence by giving the flow ONE named place to do this —
 * because it has to happen on three paths, not one: when the crop dialog unmounts, when the user
 * cancels, and on every re-pick. A leaked object URL pins its decoded image for the life of the tab.
 * This pairs with D-174's file-input `value` reset; both belong in the same `finally`, and naming
 * this makes that pair visible instead of implied.
 */
export function revokeAvatarObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}
