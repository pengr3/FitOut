import { describe, expect, it } from "vitest";
import { spaceType } from "@/lib/db/schema";
import { SPACE_TYPES, SPACE_TYPE_LABELS, spaceTypeValues } from "@/lib/listing-vocab";

// Database rows, Zod validation and the listing wizard must accept the same keys.
// This is a pure enum import: no database client or service credentials are used.
describe("existing database space types remain usable in listing vocabulary", () => {
  it("has exactly one vocabulary entry for every database enum member and no extras", () => {
    const values = SPACE_TYPES.map(({ value }) => value);
    expect(new Set(values).size, "duplicate keys make a wizard option ambiguous").toBe(values.length);
    expect([...values].sort(), "missing or unknown keys break listing reads and writes").toEqual(
      [...spaceType.enumValues].sort(),
    );
    expect([...spaceTypeValues]).toEqual(values);
  });

  it("gives every persisted type a nonempty display label", () => {
    for (const value of spaceType.enumValues) {
      expect(SPACE_TYPE_LABELS[value]?.trim(), `persisted ${value} must render a label`).toBeTruthy();
    }
  });

  it("preserves the existing bouldering type without a schema change", () => {
    expect(spaceType.enumValues).toContain("bouldering_gym");
    expect(spaceTypeValues).toContain("bouldering_gym");
    expect(SPACE_TYPE_LABELS.bouldering_gym).toBe("Bouldering gym");
  });
});
