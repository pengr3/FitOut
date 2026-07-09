// D-09 / T-05-PII: publicListing is the pure allow-list projection that decides what an ANONYMOUS
// viewer of a listing may see. It mirrors src/lib/profile.ts's publicProfile discipline: an explicit
// allow-list (never a deny-list) so a newly-added private column can never silently leak, and it is
// the single boundary that withholds the exact street address + exact coordinates unless the host has
// opted in via showExactAddress (approximate-until-booked is a future-phase reveal; Phase 2 honors the
// toggle only).
//
// Pure function, no DB/IO (mirrors tests/listing/bookability.test.ts structure). This is the RED
// anchor for Task 1 — it fails until src/lib/listing-public.ts exists, then stays green.

import { describe, it, expect } from "vitest";
import { publicListing, type PublicListingInput } from "@/lib/listing-public";

// A fully-populated input row (listing columns + related photos/amenities/tags) — the superset the
// projection reads from. location is a PostGIS point: x = longitude, y = latitude (Pitfall 1).
function makeInput(overrides: Partial<PublicListingInput> = {}): PublicListingInput {
  return {
    id: "listing_1",
    title: "Sunlit yoga studio",
    description: "A calm room with mirrors and mats.",
    primarySpaceType: "yoga_studio",
    addressLine1: "123 Secret Street",
    addressLine2: "Unit 4B",
    postalCode: "1600",
    neighborhood: "Poblacion",
    city: "Makati",
    region: "Metro Manila",
    country: "Philippines",
    location: { x: 121.034567, y: 14.567891 }, // x=lng, y=lat
    hourlyRateCents: 50000,
    dayRateCents: 300000,
    currency: "php",
    maxOccupancy: 12,
    status: "published",
    photos: [
      { id: "p2", url: "https://img/2.jpg", position: 2 },
      { id: "p0", url: "https://img/0.jpg", position: 0 },
      { id: "p1", url: "https://img/1.jpg", position: 1 },
    ],
    amenities: ["mirrors", "showers"],
    activityTags: ["yoga", "pilates"],
    ...overrides,
  };
}

describe("publicListing — privacy-aware public projection (D-09 / T-05-PII)", () => {
  describe("approximate mode (showExactAddress=false — the D-09 default)", () => {
    const input = makeInput();
    const pub = publicListing(input, { showExactAddress: false });

    it("withholds the exact street (addressLine1/addressLine2/postalCode are null)", () => {
      expect(pub.addressLine1).toBeNull();
      expect(pub.addressLine2).toBeNull();
      expect(pub.postalCode).toBeNull();
    });

    it("still exposes the coarse location (neighborhood / city / region / country)", () => {
      expect(pub.neighborhood).toBe("Poblacion");
      expect(pub.city).toBe("Makati");
      expect(pub.region).toBe("Metro Manila");
      expect(pub.country).toBe("Philippines");
    });

    it("fuzzes the coordinates — the exact point is NOT leaked, precision is coarsened", () => {
      // Exact coordinates must never reach an anonymous viewer.
      expect(pub.lat).not.toBe(14.567891);
      expect(pub.lng).not.toBe(121.034567);
      // But the fuzzed point stays in the same neighbourhood (~1km), and is coarsened to <= 2 dp.
      expect(Math.abs(pub.lat! - 14.567891)).toBeLessThan(0.01);
      expect(Math.abs(pub.lng! - 121.034567)).toBeLessThan(0.01);
      expect(pub.lat).toBe(Number(pub.lat!.toFixed(2)));
      expect(pub.lng).toBe(Number(pub.lng!.toFixed(2)));
    });

    it("reports showExactAddress=false so the map knows to draw a fuzzed area", () => {
      expect(pub.showExactAddress).toBe(false);
    });
  });

  describe("exact mode (showExactAddress=true — host opted in)", () => {
    const input = makeInput();
    const pub = publicListing(input, { showExactAddress: true });

    it("includes the exact street address", () => {
      expect(pub.addressLine1).toBe("123 Secret Street");
      expect(pub.addressLine2).toBe("Unit 4B");
      expect(pub.postalCode).toBe("1600");
    });

    it("exposes the exact coordinates (y=lat, x=lng)", () => {
      expect(pub.lat).toBe(14.567891);
      expect(pub.lng).toBe(121.034567);
    });

    it("reports showExactAddress=true so the map draws an exact pin", () => {
      expect(pub.showExactAddress).toBe(true);
    });
  });

  it("orders photos by position (cover = position 0 first), regardless of input order", () => {
    const pub = publicListing(makeInput(), { showExactAddress: false });
    expect(pub.photos.map((p) => p.position)).toEqual([0, 1, 2]);
    expect(pub.photos[0].id).toBe("p0");
  });

  it("passes amenities and activity tags through unchanged", () => {
    const pub = publicListing(makeInput(), { showExactAddress: true });
    expect(pub.amenities).toEqual(["mirrors", "showers"]);
    expect(pub.activityTags).toEqual(["yoga", "pilates"]);
  });

  it("handles a listing with no coordinates (lat/lng null in both modes)", () => {
    const approx = publicListing(makeInput({ location: null }), { showExactAddress: false });
    const exact = publicListing(makeInput({ location: null }), { showExactAddress: true });
    expect(approx.lat).toBeNull();
    expect(approx.lng).toBeNull();
    expect(exact.lat).toBeNull();
    expect(exact.lng).toBeNull();
  });

  it("never leaks the exact street in approximate mode even when the row has one", () => {
    // The allow-list is the ONLY gate — a populated street on the row must still be dropped.
    const pub = publicListing(
      makeInput({ addressLine1: "999 Real Ave", postalCode: "0000" }),
      { showExactAddress: false },
    );
    expect(pub.addressLine1).toBeNull();
    expect(pub.postalCode).toBeNull();
    // And the serialized projection contains no trace of the exact street value.
    expect(JSON.stringify(pub)).not.toContain("999 Real Ave");
  });
});
