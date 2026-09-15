import { describe, expect, it } from "vitest";
import {
  derivePublicSearchInput,
  PUBLIC_SEARCH_RADIUS_KM,
  publicSearchQueryString,
} from "@/lib/search/public-search-contract";
import { searchParamsSchema } from "@/lib/validation/booking";

const MAX_PAGES = 50;

function parsePublicUrl(params: Record<string, unknown> = {}) {
  return searchParamsSchema.parse(params);
}

describe("public search contract", () => {
  it("overwrites every validated legacy or crafted radius with the fixed public reach", () => {
    for (const radius of [2, 5, 10, 25]) {
      const input = derivePublicSearchInput(
        parsePublicUrl({
          category: "yoga_studio",
          lat: "14.5547",
          lng: "121.0244",
          partySize: "4",
          radius: String(radius),
        }),
        MAX_PAGES,
      );

      expect(input.radius).toBe(PUBLIC_SEARCH_RADIUS_KM);
    }
  });

  it("retains supported answers and omits radius from the canonical public query", () => {
    const input = derivePublicSearchInput(
      parsePublicUrl({
        category: "yoga_studio",
        lat: "14.5547",
        lng: "121.0244",
        locationLabel: "Makati, Metro Manila",
        partySize: "4",
        radius: "2",
        sort: "price",
        page: "999",
      }),
      MAX_PAGES,
    );

    expect(input).toMatchObject({
      category: "yoga_studio",
      lat: 14.5547,
      lng: 121.0244,
      locationLabel: "Makati, Metro Manila",
      partySize: 4,
      radius: PUBLIC_SEARCH_RADIUS_KM,
      sort: "price",
      page: MAX_PAGES,
    });
    expect(publicSearchQueryString(input, input.page)).toBe(
      "lat=14.5547&lng=121.0244&category=yoga_studio&locationLabel=Makati%2C+Metro+Manila&partySize=4&sort=price&page=50",
    );
  });

  it("preserves cold browse without creating a coordinate search authority", () => {
    const input = derivePublicSearchInput(parsePublicUrl({ radius: "25" }), MAX_PAGES);

    expect(input.lat).toBeUndefined();
    expect(input.lng).toBeUndefined();
    expect(input.radius).toBe(PUBLIC_SEARCH_RADIUS_KM);
    expect(publicSearchQueryString(input, input.page)).toBe("");
  });
});
