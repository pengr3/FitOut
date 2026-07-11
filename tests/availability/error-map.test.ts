// Pure unit test for mapBookingError (src/lib/availability/units.ts) — no DB, mirrors
// tests/listing/bookability.test.ts. Proves SC#4's error surface: an exhausted-units result AND a raw
// DB conflict (23P01 exclusion_violation, plus 40P01 deadlock_detected per the 03-01 concurrency
// finding) BOTH map to the exact clean copy — never a raw 500 — while unknown errors re-throw.

import { describe, it, expect } from "vitest";
import { NoUnitAvailableError, mapBookingError } from "@/lib/availability/units";

const CLEAN = { error: "That time was just taken. Pick another slot." };

describe("mapBookingError — clean 'just taken' surface (SC#4)", () => {
  it("maps NoUnitAvailableError (units exhausted) to the clean message", () => {
    expect(mapBookingError(new NoUnitAvailableError())).toEqual(CLEAN);
  });

  it("maps a raw 23P01 exclusion_violation to the clean message", () => {
    expect(mapBookingError({ code: "23P01" })).toEqual(CLEAN);
  });

  it("maps a raw 40P01 deadlock_detected to the clean message (03-01 finding: treat like 23P01)", () => {
    expect(mapBookingError({ code: "40P01" })).toEqual(CLEAN);
  });

  it("re-throws an unknown error (a real 500 is never swallowed)", () => {
    expect(() => mapBookingError(new Error("boom"))).toThrow("boom");
  });

  it("re-throws an unrelated pg SQLSTATE (e.g. 23505 unique_violation)", () => {
    expect(() => mapBookingError({ code: "23505" })).toThrow();
  });
});
