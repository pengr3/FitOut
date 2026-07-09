// Cloudinary avatar upload (server-only). The api_secret stays on the server — never
// shipped to the client (threat T-02-07). For a single Phase-1 avatar we route the file
// through the server via upload_stream; Phase 2 galleries should graduate to signed
// direct-to-Cloudinary client uploads (cloudinary.utils.api_sign_request).
//
// uploadAvatar stores the avatar under fitout/avatars/<userId> (overwrite:true so a user
// has one canonical avatar) and returns { secure_url, public_id } for the user row.
//
// Source: cloudinary_npm docs (uploader.upload_stream).

import { v2 as cloudinary } from "cloudinary";

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
        transformation: { width: 400, height: 400, crop: "fill", gravity: "face" },
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
 * Destroy a listing photo asset by its Cloudinary `public_id` (orphan cleanup, T-04-ORPHAN). Called
 * when a photo is removed (or a draft abandoned) so deleted photos don't linger in storage or serve
 * stale CDN copies — `invalidate: true` busts the CDN cache (RESEARCH Pattern 2 orphan handling).
 */
export function destroyListingPhoto(
  publicId: string,
): Promise<{ result: string }> {
  return cloudinary.uploader.destroy(publicId, { invalidate: true });
}
