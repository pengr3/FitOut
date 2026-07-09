// LIST-05 / D-02 — the strict draft→publish status gate + unlist + soft-delete.
//
// RED until Plan 03 (publish/unlist/soft-delete server actions in src/app/actions/listing.ts). The
// publish gate is server-enforced (never a client-settable `status`): publishing asserts publishSchema
// AND ≥3 photos AND host.emailVerified. Plan 03's <verify> replaces the it.todo entries with real
// assertions driven through the exported actions (lazy-imported per the profile.test.ts harness).

import { describe, it } from "vitest";

describe("publish gate (D-02) — RED until Plan 03", () => {
  it.todo("publish is BLOCKED when the listing has < 3 photos");
  it.todo("publish is BLOCKED when the host's email is not verified (soft-gate enforced at publish)");
  it.todo("publish is BLOCKED when a required core field is missing (publishSchema fails)");
  it.todo("publish SUCCEEDS when all core fields + >=3 photos + verified email are present (status=published, publishedAt set)");
  it.todo("status is server-set only — a client cannot pass status=published to bypass the gate");
});

describe("unlist + soft-delete (LIST-05, Claude's discretion) — RED until Plan 03", () => {
  it.todo("unlist sets status=unlisted and PRESERVES all listing data (re-publishable)");
  it.todo("soft-delete sets deletedAt (row retained, forward-safe for future booking FKs)");
});
