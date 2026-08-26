// Cloudinary avatar upload (server-only). The api_secret stays on the server — never
// shipped to the client (threat T-02-07). For a single Phase-1 avatar we route the file
// through the server via upload_stream; Phase 2 galleries should graduate to signed
// direct-to-Cloudinary client uploads (cloudinary.utils.api_sign_request).
//
// uploadAvatar stores the avatar under fitout/avatars/<userId> (overwrite:true so a user
// has one canonical avatar) and returns { secure_url, public_id } for the user row.
//
// THE AVATAR BYTES ARRIVE PRE-FRAMED (CROP-01, D-171). Since Phase 16 the user positions and
// zooms their own photo in the crop dialog and the client sends exactly the 400x400 square it
// produced, so the framing decision has already been made — by the user — before this file sees
// a byte. The 400x400 `c_fill` + centre-gravity transform below is therefore NOT a framing
// decision: on that square input it is arithmetically the identity (`c_fill` at an exact match
// scales nothing and crops nothing). It is retained, deliberately, as a fail-closed DIMENSION
// normaliser for the bypass path — `uploadAvatarAction` is a public
// server action and `avatarFileSchema` guards content-type and byte size but NOT pixel
// dimensions, so a non-browser client can POST a 4.9 MB 8000x6000 JPEG straight to it and never
// touch the cropper. The transform is what makes that case store a bounded 400x400 asset.
// Deleting it opens that hole; closing it properly (a real pixel guard) is Phase 16.1 scope.
//
// `gravity` MUST NEVER AGAIN SELECT A REGION. `center` is the only value that cannot invent a
// framing: on a square it is a no-op, and on a bypassed non-square input it takes the middle —
// the least-surprising possible fallback. It was face-gravity (`g_face`) until D-171, and face
// detection on a source with no face falls back to an arbitrary region — the literal bug that
// opened Phase 16. Do not "improve" this to auto/faces/custom.
//
// Note also what is NOT specified: no `format`, no `quality`, no `fetch_format`, no eager
// transform (999.2-UI-SPEC § 4). An upload transformation is an INCOMING transformation, so
// Cloudinary decodes and re-encodes — the stored asset is not byte-identical to the blob the
// client produced. "Identity" above is a claim about geometry, not about bytes.
//
// Source: cloudinary_npm docs (uploader.upload_stream).

import { v2 as cloudinary } from "cloudinary";

// The ONE declaration of the avatar's output size (D-172). Imported rather than respelled — see the
// transform below. `@/lib/avatar` is directive-free, so a server-only module can read it freely.
import { AVATAR_OUTPUT_PX } from "@/lib/avatar";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // SERVER ONLY — never exposed to the client.
});

export function uploadAvatar(
  buffer: Buffer,
  userId: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "fitout/avatars",
        public_id: userId,
        overwrite: true,
        // ⚠ THE OUTPUT SIZE IS IMPORTED, NEVER RESPELLED (WR-03). `src/lib/avatar.ts` states the
        // rule this used to break: "a hard-coded `400` anywhere else in the phase silently breaks
        // the derivation the day D-172's output size moves". The header above rests its whole
        // argument on this transform being arithmetically the IDENTITY on the encoder's output —
        // move `AVATAR_OUTPUT_PX` to 512 with a literal here and the transform quietly DOWNSIZES
        // every avatar, the header's claim becomes false, and nothing goes red. `avatar.ts` is
        // directive-free precisely so any module can read it, and this file is server-only.
        transformation: {
          width: AVATAR_OUTPUT_PX,
          height: AVATAR_OUTPUT_PX,
          crop: "fill",
          gravity: "center",
        },
      },
      (err, res) =>
        err || !res
          ? reject(err ?? new Error("Cloudinary upload returned no result"))
          : resolve({ secure_url: res.secure_url, public_id: res.public_id })
    );
    stream.end(buffer);
  });
}

// ---------------------------------------------------------------------------
// Phase-2 listing gallery — the signed direct-to-client graduation (D-04).
// The avatar path above routes bytes THROUGH the server (fine for one small image). Listing
// galleries can be large, so bytes go DIRECT browser→Cloudinary; the only server involvement is
// minting a scoped upload signature. The api_secret NEVER leaves the server (threat T-04-SECRET) —
// only the resulting signature + the public api_key/cloud_name are ever returned to the client.
// ---------------------------------------------------------------------------

/**
 * Mint an upload signature for a listing photo upload. `params` is the EXACT set of params the
 * client widget will send (currently { timestamp, folder }) — Cloudinary 401s if the signed set and
 * the sent set differ (RESEARCH Pitfall 3 / T-04-SIGMATCH), so callers must sign exactly what they
 * send. Wraps `cloudinary.utils.api_sign_request` with the server-only CLOUDINARY_API_SECRET.
 */
export function signListingUpload(params: {
  timestamp: number;
  folder: string;
}): string {
  return cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!, // SERVER ONLY — never shipped to the client.
  );
}

/**
 * Sign the EXACT param set a signed Upload Widget sends (e.g. { folder, source, timestamp }). The
 * live <CldUploadWidget> adds its own params (`source=uw`, its own `timestamp`), so the server MUST
 * sign what the widget actually sends — signing a server-recomputed subset makes Cloudinary reject
 * with "Invalid Signature" (T-04-SIGMATCH). Callers MUST validate/scope sensitive params (folder)
 * BEFORE calling this.
 */
export function signUploadParams(
  params: Record<string, string | number | boolean>,
): string {
  return cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!, // SERVER ONLY.
  );
}

/**
 * Destroy a listing photo asset by its Cloudinary `public_id` (orphan cleanup, T-04-ORPHAN). Called
 * when a photo is removed (or a draft abandoned) so deleted photos don't linger in storage or serve
 * stale CDN copies — the destroy's CDN-invalidation option busts the cached copy (RESEARCH Pattern 2
 * orphan handling).
 *
 * The option is named DESCRIPTIVELY in this sentence rather than quoted, and that is deliberate: plan
 * 16-12 counts its occurrences in this file to prove there are exactly TWO destroy call sites (the
 * listing one below and the avatar one at the foot of the file), and a comment that quoted the token
 * would be counted as a third. Same resolution, and the same reason, as `responsive-dialog.tsx:113-117`.
 */
export function destroyListingPhoto(
  publicId: string,
): Promise<{ result: string }> {
  return cloudinary.uploader.destroy(publicId, { invalidate: true });
}

// ---------------------------------------------------------------------------
// Phase-16 avatar teardown (CROP-03 / D-169).
// ---------------------------------------------------------------------------

/**
 * Destroy an avatar asset by its Cloudinary `public_id` (orphan cleanup, T-16-44).
 *
 * The twin of `destroyListingPhoto` above, down to the CDN-invalidation option — and the id needs no
 * reconstruction, because `uploadAvatarAction` persists Cloudinary's OWN `public_id`, which given
 * `folder: "fitout/avatars"` + `public_id: userId` is already the fully-qualified
 * `fitout/avatars/<userId>`.
 *
 * ⚠ THE CDN INVALIDATION MATTERS MORE HERE THAN IT DOES FOR A LISTING PHOTO, and the reason is
 * `overwrite: true` at the top of this file: one canonical asset per user means the avatar's delivery
 * URL is STABLE across replacements, so a cached edge copy is not merely stale — it is the removed
 * photo, still being served from the same address the profile used to point at. A listing photo gets a
 * fresh id per upload, so its worst case is an unreferenced object.
 *
 * ⚠ IT RESOLVES ON A MISSING ID AND REJECTS ONLY ON NETWORK/AUTH FAILURE. `uploader.destroy` answers
 * `{ result: "not found" }` for an id that is not there rather than throwing, so a caller that only
 * writes a `catch` has handled one of the two failure shapes. Under D-169 neither shape may reach the
 * person: see `src/app/actions/avatar.ts`'s `removeAvatarAction`, which handles both and lets neither
 * change its result.
 */
export function destroyAvatar(publicId: string): Promise<{ result: string }> {
  return cloudinary.uploader.destroy(publicId, { invalidate: true });
}
