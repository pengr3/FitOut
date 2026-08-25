// IC-05 — the avatar zoom bound, asserted against the shipped module.
//
// RED FIRST. This file was written and run BEFORE `src/lib/avatar.ts` existed, so the nine rows
// below are observed failing rather than asserted retroactively. The full header — what this
// catches, and why the spec is at `tests/design/` and not `tests/profile/` — lands with the rest
// of the contract in the next commit.

import { describe, expect, it } from "vitest";
import { avatarMaxZoom, AVATAR_MIN_SOURCE_PX } from "@/lib/avatar";

describe("IC-05 — avatarMaxZoom reproduces every worked row", () => {
  const rows: Array<{ shorter: number; expected: number; note: string }> = [
    { shorter: 3000, expected: 3, note: "3000x4000 — ceiling" },
    { shorter: 900, expected: 2.25, note: "1200x900" },
    { shorter: 600, expected: 1.5, note: "600x800" },
    { shorter: 400, expected: 1, note: "400x400 — zoom row disabled" },
    { shorter: 300, expected: 1, note: "300x300 — clamped up" },
    { shorter: 500, expected: 1.25, note: "4000x500" },
    { shorter: 4000, expected: 3, note: "ceiling, not 10" },
    { shorter: 0, expected: 1, note: "nonsense input — lower arm" },
    { shorter: -1, expected: 1, note: "nonsense input — lower arm" },
  ];

  for (const { shorter, expected, note } of rows) {
    it(`avatarMaxZoom(${shorter}) === ${expected} — ${note}`, () => {
      expect(avatarMaxZoom(shorter)).toBe(expected);
    });
  }

  it("avatarMaxZoom(AVATAR_MIN_SOURCE_PX) === 1 — the soft-source boundary", () => {
    expect(avatarMaxZoom(AVATAR_MIN_SOURCE_PX)).toBe(1);
  });
});
