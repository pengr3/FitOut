// LIST-02 / RESEARCH Pitfall 3 — the Cloudinary signed-upload endpoint (POST /api/cloudinary/sign).
//
// RED until Plan 04. The endpoint mints an upload signature server-side (api_secret NEVER leaves the
// server) and MUST: (1) require a session (401 otherwise), (2) verify the target listing belongs to
// the session user before signing (cross-host upload guard), (3) sign ONLY the allowed, minimal param
// set (timestamp + folder `fitout/listings/<listingId>`) — the signed params must exactly match the
// client params or Cloudinary 401s (Pitfall 3). Plan 04's <verify> replaces the it.todo entries with
// real assertions, mocking next/headers + @/lib/auth like tests/profile/profile.test.ts and reusing
// mockCloudinary.utils.api_sign_request.

import { describe, it } from "vitest";

describe("cloudinary sign endpoint (LIST-02) — RED until Plan 04", () => {
  it.todo("returns 401 when there is no session");
  it.todo("returns 403/401 when the session user does not own the target listing (cross-host guard)");
  it.todo("signs ONLY the allowed param set (timestamp + folder fitout/listings/<listingId>)");
  it.todo("never exposes CLOUDINARY_API_SECRET in the response body");
  it.todo("is rate-limited on repeated calls (WR-06 carry-forward)");
});
