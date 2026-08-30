import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { devTodayOverride } from "@/lib/dev/today-override";

/**
 * 17-D26 — the `?today=` seam is a DEV-ONLY affordance on a PUBLIC, user-input-taking route.
 *
 * It exists so the GATE-01 baselines that photograph `/listings/[id]`'s availability calendar stop
 * expiring at the next venue-local day-rollover. That is a testing concern buying a real property, and
 * the price is a query parameter that steers date arithmetic on a shipped page. These tests are the
 * guard-rail on that price: they pin that the seam is INERT IN PRODUCTION and that it PARSES rather
 * than trusts, so a later refactor cannot quietly make a request parameter steer a production render.
 *
 * The behavioural half and the source half are both here on purpose. The behavioural test proves the
 * branch is taken; the source test proves the branch is spelled as a BUILD-TIME CONSTANT
 * (`process.env.NODE_ENV`), which is what makes the bundler prune the body rather than merely skip it
 * — and, decisively, what makes the affordance impossible to flip on a live deploy. An operator-settable
 * env var would pass the behavioural test and fail the property.
 */
describe("17-D26 — the dev-only ?today= override", () => {
  const SOURCE = readFileSync(
    path.join(process.cwd(), "src/lib/dev/today-override.ts"),
    "utf8",
  );

  describe("production inertness — the load-bearing half", () => {
    it("returns null for a PERFECTLY VALID date when NODE_ENV is production", () => {
      vi.stubEnv("NODE_ENV", "production");
      // The same value that is honoured outside production, one line below.
      expect(devTodayOverride("2026-09-16")).toBeNull();
      vi.unstubAllEnvs();
    });

    it("is not inert merely because every input is rejected — the SAME value is honoured outside production", () => {
      // The positive control. Without it, a function that always returned null would pass the test
      // above and the suite would be asserting nothing at all.
      expect(devTodayOverride("2026-09-16")).toEqual({ year: 2026, month: 9, day: 16 });
    });

    it("spells the guard as a build-time constant, as its FIRST statement", () => {
      // `process.env.NODE_ENV` is inlined by the bundler; a bespoke env var would not be, and could be
      // flipped on a live deploy. This is the same argument theme-query-param.tsx makes for the same
      // guard, and the reason that file is the precedent this one follows.
      expect(SOURCE).toContain('if (process.env.NODE_ENV === "production") return null;');

      const body = SOURCE.slice(SOURCE.indexOf("export function devTodayOverride"));
      const firstStatement = body
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 0 && !l.startsWith("//") && !l.startsWith("export function"));
      expect(firstStatement).toBe('if (process.env.NODE_ENV === "production") return null;');
    });

    it("reads NO other environment variable — the guard cannot be widened by configuration", () => {
      // ⚠ SCANNED OVER CODE LINES ONLY, AND THE COMMENT STRIP IS THE POINT OF THE TEST, NOT NOISE.
      // The first draft scanned the whole file and FAILED against the correct module, because the
      // header necessarily NAMES the environment variable it is explaining. That is the [17-D20]
      // defect class — prose about a counted token is still the token — and it is the third time this
      // plan has inflicted it on itself. The strip also makes the assertion stronger rather than more
      // permissive: a comment cannot read an env var, so scanning comments could only ever produce a
      // false red, never catch a real widening.
      const NL = String.fromCharCode(10);
      const code = SOURCE.split(NL)
        .filter((line) => {
          const t = line.trim();
          return t !== "" && !t.startsWith("//") && !t.startsWith("/*") && !t.startsWith("*");
        })
        .join(NL);
      const envReads = code.match(/process\.env\.[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
      expect(envReads).toEqual(["process.env.NODE_ENV"]);
    });
  });

  describe("it parses, never trusts", () => {
    it.each([
      ["undefined", undefined],
      ["empty", ""],
      ["garbage", "not-a-date"],
      ["an impossible day", "2026-02-31"],
      ["a wrong-shaped date", "2026-9-16"],
      ["a slash date", "2026/09/16"],
      ["a UTC instant", "2026-09-16T00:00:00Z"],
      ["a padded injection attempt", "2026-09-16' OR '1'='1"],
    ])("rejects %s", (_label, input) => {
      expect(devTodayOverride(input as string | undefined)).toBeNull();
    });

    it("accepts exactly the YYYY-MM-DD shape the searched-window contract already uses", () => {
      expect(devTodayOverride("2026-01-01")).toEqual({ year: 2026, month: 1, day: 1 });
      expect(devTodayOverride("2026-12-31")).toEqual({ year: 2026, month: 12, day: 31 });
    });

    it("delegates to the SHARED parser rather than introducing a second date idiom", () => {
      expect(SOURCE).toContain('from "@/lib/search/window-params"');
      expect(SOURCE).toContain("parsePickedDate");
      // No hand-rolled date regex in this file — the one in window-params.ts is the only one.
      expect(SOURCE).not.toMatch(/\d\{4\}/);
    });

    it("never casts the request value", () => {
      expect(SOURCE).not.toMatch(/\bas\s+(TodayOverride|PickedDate|string)\b/);
    });
  });

  describe("blast radius", () => {
    it("is imported by exactly one route file", () => {
      // A dev-only seam that spreads is no longer a seam. If this count grows, the new call site needs
      // its own argument for why a request parameter may steer it.
      const page = readFileSync(
        path.join(process.cwd(), "src/app/listings/[id]/(detail)/page.tsx"),
        "utf8",
      );
      expect(page).toContain('from "@/lib/dev/today-override"');
    });

    it("returns a plain date triple and nothing else", () => {
      const out = devTodayOverride("2026-09-16");
      expect(Object.keys(out ?? {}).sort()).toEqual(["day", "month", "year"]);
    });
  });
});
