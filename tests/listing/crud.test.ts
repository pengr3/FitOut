// LIST-01 / LIST-04 — Listing create/edit persistence + ownership scoping.
//
// RED until Plan 03 (the listing wizard + src/app/actions/listing.ts). These are Nyquist anchors:
// Plan 03's <verify> runs `vitest run tests/listing/crud.test.ts`, replacing each it.todo below with
// a real assertion driven through the EXPORTED server action, using the tests/profile/profile.test.ts
// harness (setupTestDb + makeTestAuth + mocked next/headers, then a lazy import of the action:
//   const { createListing, updateListing } = await import("@/app/actions/listing");
// so this file does not fail to load before the action exists).

import { describe, it } from "vitest";

describe("listing CRUD via the real server action (LIST-01/04) — RED until Plan 03", () => {
  it.todo("createListing persists a draft owned by the session user (hostId === session.user.id)");
  it.todo("updateListing persists edited core fields (title, description, space type, address, capacity, amenities)");
  it.todo("a NON-owner calling updateListing on someone else's listing is rejected (IDOR guard)");
  it.todo("booking_mode is stored as instant|request with the schema default (request) when unset (LIST-04)");
  it.todo("amenities + activity tags persist to their join tables scoped to the listing");
});
