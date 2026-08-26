// The avatar framing contract (CROP-01 / CROP-03) — every user-visible avatar string, the four
// numbers the crop flow is built out of, and the one piece of arithmetic that derives the zoom
// ceiling from the output size.
//
// It exists so that the crop dialog, the client-side pre-dialog guard, the Zod file schema, the
// server action and the tests are all right about the SAME thing. Two copies of a string are two
// strings; two copies of `400` are two output sizes waiting to disagree.
//
// Decisions that own this file:
//   D-172 — the output is 400x400 JPEG, transparency flattened onto white. One format, no branching.
//   D-173 — the framing controls carry no extras: zoom floor is fit-the-mask, the ceiling is
//           min(anti-blur bound, 3x), AVATAR_MIN_SOURCE_PX = 200 is a SOFT floor, there is no
//           rotation control and no numeric zoom readout.
//   D-176 — 999.2-UI-SPEC is the copy contract and is NOT re-derived here; 16-UI-SPEC Delta-14 names
//           the single string that changed (AVATAR_HELPER) and the single string that retired.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO.
//   - No Zod. `src/lib/validation/profile.ts` owns `avatarFileSchema` and `AVATAR_MAX_BYTES`; it
//     imports AVATAR_ALLOWED_TYPES from here rather than the reverse, so this module stays a leaf.
//   - No React, no DOM, no canvas. Decode/measure/encode is `src/lib/avatar-canvas.ts`.
//   - No Cloudinary. This module knows nothing about where the bytes end up.
//   - AVATAR_MIN_SOURCE_PX NEVER reaches the server schema. The server is handed a File and has no
//     pixel dimensions at all, so a dimension refine there would be a check that cannot run. That
//     hole is exactly why D-171 KEEPS the `{ width: 400, height: 400, crop: "fill" }` transform as a
//     server-side ceiling; closing it properly is Phase 16.1 scope, not this phase's.
//
// THE MISTAKE THIS FILE'S EXISTENCE IS A RESPONSE TO — read before "tidying" these exports anywhere.
// `src/app/actions/avatar.ts` is a `"use server"` module, and Next rejects such a module that exports
// anything other than an async function AT MODULE EVALUATION, not at call time. That file once
// exported `AVATAR_MAX_BYTES` (a number) and `avatarFileSchema` (a Zod object); Next refused to load
// the whole module — "A 'use server' file can only export async functions, found number" — so
// `uploadAvatarAction` never ran and avatar upload was dead in the browser for all of Phase 1, while
// the tests that imported those same two exports stayed green (Vitest does not implement the rule).
// That is the entire reason these constants live in a DIRECTIVE-FREE module: no `"use client"`, no
// `"use server"`, no `import "server-only"`. They are never exported OR re-exported from a
// `"use server"` file — a re-export is the identical violation wearing a compatibility shim.
// `tests/use-server-exports.test.ts` holds this line repo-wide.

/**
 * The one output size. The encoder draws to a 400x400 canvas and the zoom ceiling is DERIVED from
 * this number, so moving it moves both (D-172).
 */
export const AVATAR_OUTPUT_PX = 400;

/**
 * Soft floor on the shorter side of the SOURCE image. Below this we refuse before the dialog opens
 * (`AVATAR_TOO_SMALL_MESSAGE`); between this and AVATAR_OUTPUT_PX the dialog opens with the zoom row
 * disabled and `AVATAR_SOFT_SOURCE_NOTE` beneath it (D-173, rule F8). Client-side only — see header.
 */
export const AVATAR_MIN_SOURCE_PX = 200;

/**
 * The hard ceiling on zoom, independent of how large the source is. Past 3x the framing stops being
 * framing and starts being a crop nobody asked for (D-173, 999.2 Open Q2).
 */
export const AVATAR_MAX_ZOOM_CEILING = 3;

/**
 * The three MIME types the avatar flow accepts, in one place with two consumers: the file picker's
 * `accept` attribute and the client type guard read it here, and `src/lib/validation/profile.ts`
 * IMPORTS it rather than duplicating the strings. A picker that accepts what the server refuses is a
 * user-visible split, and the only way it cannot happen is for there to be one array.
 */
export const AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/**
 * The largest zoom that still yields a crop drawn from at least AVATAR_OUTPUT_PX real source pixels.
 *
 * THE DERIVATION, not the formula. Inside a square stage with `aspect: 1` and `objectFit: "contain"`,
 * the crop window at zoom `z` covers `min(naturalW, naturalH) / z` real source pixels — that is what
 * `react-easy-crop`'s own `computeCroppedArea` produces, read out of `index.module.mjs` and worked
 * through in 16-RESEARCH § A4 rather than taken from the docs. Requiring that window to stay at or
 * above the output size gives `z <= min(w,h) / AVATAR_OUTPUT_PX` directly. The bound is therefore
 * derived FROM the output size; it is not a tuned constant, and a hard-coded `400` anywhere else in
 * the phase silently breaks the derivation the day D-172's output size moves.
 *
 * Both arms clamp. The lower arm holds the result at 1 for a source smaller than the output (and for
 * nonsense input such as 0 or a negative), because at zoom 1 the stage already shows the most of the
 * photo that can be in frame — `minZoom = 1` IS fit-the-mask, by construction, not by a rule we
 * impose. The upper arm is AVATAR_MAX_ZOOM_CEILING.
 *
 * ⚠ `NaN` USED TO ESCAPE BOTH OF THEM (IN-02), because every comparison against `NaN` is false:
 * `Math.min(Math.max(NaN, 1), 3)` is `NaN`, and a `NaN` max-zoom hands the slider a degenerate
 * range. The docblock claimed both arms clamped "for nonsense input" and the sweep in
 * `tests/design/avatar-zoom.test.ts` covered `0` and `-1` — the one nonsense value that got through
 * was the one nobody wrote down. No consumer can produce it today (`naturalWidth`/`naturalHeight`
 * are always numbers), so this is a note made true rather than a bug fixed; the `|| 1` is what
 * makes the sentence above accurate.
 *
 * @param shorterSourcePx `min(naturalWidth, naturalHeight)` of the decoded source image.
 */
export function avatarMaxZoom(shorterSourcePx: number): number {
  const ratio = shorterSourcePx / AVATAR_OUTPUT_PX;
  // `|| 1` catches NaN (and 0, and -0) BEFORE the clamp, because `Math.max(NaN, 1)` is NaN.
  return Math.min(Math.max(ratio || 1, 1), AVATAR_MAX_ZOOM_CEILING);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// COPY — every user-visible avatar string in the phase, one exported literal each (rule F2).
// Inherited verbatim from 999.2 § Copywriting except where 16-UI-SPEC Delta-14 names a change.
// Rule F1: no string here names the vendor, the transport or the mechanism — no "Cloudinary", no
// "canvas", no "aspect ratio", no "resolution".
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The crop dialog's title. */
export const AVATAR_CROP_TITLE = "Position your photo";

/** The crop dialog's instruction line — names both the pointer and the slider path. */
export const AVATAR_CROP_HELPER = "Drag to move. Pinch or use the slider to zoom.";

/** The crop dialog's primary action. Nothing is uploaded before it is pressed (rule F4). */
export const AVATAR_CROP_CONFIRM = "Save photo";

/**
 * The confirm button's busy label. Byte-identical to `profile-form.tsx:299`'s shipped `Saving…` —
 * same word, same U+2026 ellipsis — and that is deliberate, not a coincidence (Delta-14).
 */
export const AVATAR_CROP_CONFIRM_BUSY = "Saving…";

/**
 * The crop dialog's dismiss. The bare label is 999.2 rule F9's single scoped carve-out: the safe
 * outcome differs between first upload (no photo) and replace (the existing photo), so no
 * outcome-shaped or action-shaped label is honest in both states. The boundary must not be widened.
 */
export const AVATAR_CROP_CANCEL = "Cancel";

/** Label for the zoom slider row. */
export const AVATAR_ZOOM_LABEL = "Zoom";

/** Accessible name for the crop stage, which is focusable and pannable with the arrow keys (D-178). */
export const AVATAR_POSITION_LABEL =
  "Photo position. Use the arrow keys to move your photo.";

/** The `/profile` control when the user has no avatar yet. */
export const AVATAR_UPLOAD_LABEL = "Upload photo";

/** The `/profile` control when the user already has an avatar. */
export const AVATAR_CHANGE_LABEL = "Change photo";

/**
 * The helper beneath the `/profile` avatar control. CHANGED by Delta-14 — the shipped string at
 * `profile-form.tsx:149` says "JPG or PNG" and does not name WebP, which under-states what the picker
 * accepts now that `accept` is the three MIME types above. Do NOT "reuse the shipped one verbatim".
 */
export const AVATAR_HELPER = "JPG, PNG, or WebP, up to 5 MB. Optional.";

/** Refusal for a file outside AVATAR_ALLOWED_TYPES. Names what to pick instead (rule F6). */
export const AVATAR_WRONG_TYPE_MESSAGE = "Choose a JPG, PNG, or WebP image.";

/** Refusal when the browser cannot decode the file at all — corrupt, mislabelled, or HEIC. */
export const AVATAR_UNREADABLE_MESSAGE =
  "We couldn't open that image. Try a JPG, PNG, or WebP.";

/** Refusal when the shorter source side is below AVATAR_MIN_SOURCE_PX. Shown before the dialog. */
export const AVATAR_TOO_SMALL_MESSAGE =
  "That image is too small. Pick one at least 200 by 200 pixels.";

/**
 * Shown INSIDE the dialog beside the disabled zoom row when the shorter source side is between
 * AVATAR_MIN_SOURCE_PX and AVATAR_OUTPUT_PX. A disabled control always carries its reason (rule F8).
 */
export const AVATAR_SOFT_SOURCE_NOTE =
  "This photo is small, so it may look a little soft.";

/** The `/profile` secondary control that opens the removal confirmation (CROP-03). */
export const AVATAR_REMOVE_LABEL = "Remove photo";

/** The removal confirmation's title. */
export const AVATAR_REMOVE_TITLE = "Remove your photo?";

/** The removal confirmation's body — names the consequence and the reversal (rule F9). */
export const AVATAR_REMOVE_BODY =
  "Your profile will show your initials instead. You can add a new photo any time.";

/** The removal confirmation's destructive action. */
export const AVATAR_REMOVE_CONFIRM = "Remove photo";

/** The removal confirmation's busy label. */
export const AVATAR_REMOVE_CONFIRM_BUSY = "Removing…";

/** The removal confirmation's cancel — a positive verb naming what survives, and initially focused. */
export const AVATAR_REMOVE_CANCEL = "Keep photo";

/** Rendered inside the removal confirmation, which stays open on failure (rule F5). */
export const AVATAR_REMOVE_FAILED_MESSAGE =
  "Couldn't remove your photo. Try again.";
