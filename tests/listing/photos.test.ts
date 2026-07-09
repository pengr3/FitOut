// LIST-02 — listing photo metadata persistence + atomic reorder (cover = position 0).
//
// RED until Plan 04 (src/app/actions/listing-photo.ts). Photo BYTES go direct to Cloudinary (signed
// upload); only { public_id, secure_url, position } metadata is persisted here. Reorder rewrites all
// positions in a single transaction so the (listingId, position) unique index never transiently
// collides. Plan 04's <verify> replaces the it.todo entries with real assertions via the exported
// actions (lazy import per the profile.test.ts harness); persistence uses the listing_photo table.

import { describe, it } from "vitest";

describe("listing photo persistence + reorder (LIST-02) — RED until Plan 04", () => {
  it.todo("persisting a photo stores { public_id, url, position } against the owning listing");
  it.todo("the first photo is the cover (position 0)");
  it.todo("reorder rewrites positions atomically in one transaction (no unique-index collision mid-swap)");
  it.todo("reorder is ownership-scoped — a non-owner cannot reorder another host's photos (IDOR)");
  it.todo("removing a photo deletes its row (and triggers Cloudinary destroy of the public_id for orphan cleanup)");
});
