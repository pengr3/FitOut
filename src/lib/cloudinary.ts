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
