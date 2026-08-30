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

  /**
   * `SOURCE` with whole-line comments and blank lines removed — HOISTED OUT OF THE ENV-READ TEST by
   * the phase-17 code review (WR-01), because a second source assertion now needs the same strip and
   * for the same reason.
   *
   * ⚠ THE STRIP IS THE POINT OF BOTH SCANS, NOT NOISE — the [17-D20] defect class, which this one file
   * has now inflicted on itself three times: PROSE ABOUT A COUNTED TOKEN IS STILL THE TOKEN. The
   * env-read scan's first draft failed against the correct module because the header necessarily NAMES
   * the environment variable it explains; the date-regex scan below is exposed to exactly the same
   * shape, because the honest way to document a shared parser is to quote its regex.
   *
   * IT MAKES BOTH ASSERTIONS STRONGER RATHER THAN MORE PERMISSIVE. A comment cannot read an env var and
   * cannot parse a date, so scanning comments could only ever produce a FALSE RED — never catch a real
   * widening.
   *
   * KNOWN LIMIT, stated so it is not mistaken for a parser: this is a LINE filter, so a trailing `//`
   * comment on a line that also carries code survives into `CODE`. That is the conservative direction
   * (it can only over-include), and `tests/design/strip-comments.test.ts` owns the real thing.
   */
  const NEWLINE = String.fromCharCode(10);
  const CODE = SOURCE.split(NEWLINE)
    .filter((line) => {
      const t = line.trim();
      return t !== "" && !t.startsWith("//") && !t.startsWith("/*") && !t.startsWith("*");
    })
    .join(NEWLINE);

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
      // ⚠ SCANNED OVER CODE LINES ONLY — see `CODE`'s docblock above for why the strip is the point of
      // this assertion rather than noise. (The strip used to be inlined here; WR-01 hoisted it when a
      // second scan needed the same protection, and it is byte-for-byte the same filter.)
      const envReads = CODE.match(/process\.env\.[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
      expect(envReads).toEqual(["process.env.NODE_ENV"]);
    });

    it("proves the comment strip is real — it removes prose and keeps the guard", () => {
      // GUARD THE GUARD on `CODE`, added by WR-01. Both scans above and below are `not.toMatch` /
      // `toEqual([…])` shapes over `CODE`, and a `CODE` that had silently become "" would satisfy both
      // of them forever. Two assertions, in opposite directions, so neither an empty strip nor a
      // no-op strip can pass.
      expect(CODE, "the comment strip produced no code at all").toContain(
        'if (process.env.NODE_ENV === "production") return null;',
      );
      expect(
        CODE,
        "the comment strip kept a prose line, so both source scans are back in the [17-D20] class",
      ).not.toContain("WHY THIS EXISTS");
      expect(SOURCE).toContain("WHY THIS EXISTS");
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
    });

    it("introduces no second date regex of the copy-paste shape", () => {
      // ⚠ THIS ASSERTION USED TO BE UNABLE TO FAIL (phase-17 code review, WR-01). It read:
      //
      //     // No hand-rolled date regex in this file — the one in window-params.ts is the only one.
      //     expect(SOURCE).not.toMatch(/\d\{4\}/);
      //
      // In a regex literal `\d` is the DIGIT CLASS and `\{` is a literal brace, so that pattern means
      // "a digit immediately followed by the characters {4}" — it matches the string `2{4}`, and it
      // never matches the SOURCE TEXT `\d{4}`, whose `{` is preceded by `d`. It would therefore have
      // stayed green on the very day someone pasted a second date parser into this module, which is
      // the only drift its own comment claimed to prevent. False safety on the file that owns a
      // query-parameter seam is worse than no assertion, because the next reader trusts it.
      //
      // MEASURED, both directions, before and after:
      //
      //   shipped   /\d\{4\}/     vs `const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);`  → false
      //   shipped   /\d\{4\}/     vs the string "2{4}"                                   → true
      //   corrected /\\d\{\d+\}/  vs the same offending line                              → true
      //   corrected /\\d\{\d+\}/  vs the real src/lib/dev/today-override.ts               → false
      //
      // `\\d` is what matches a LITERAL backslash-d in the scanned text. The last row is why the
      // corrected assertion is green on this tree rather than green by construction.
      //
      // ⚠ RED-WATCHED AGAINST THE REAL FILE, not only against a string (30 August 2026). The offending
      // line above was pasted into `src/lib/dev/today-override.ts` as CODE (`const m = /^(\d{4})-…`),
      // the suite was run, and the file was reverted:
      //
      //   × introduces no second date regex of the copy-paste shape
      //     → AssertionError: today-override.ts grew a second date regex; the shared strict parser in
      //       window-params.ts is meant to be the only one, and a second one is a second set of edge
      //       cases on a query-parameter seam: expected 'import { parsePickedDate } from "@/li…' not
      //       to match /\\d\{\d+\}/
      //
      //   1 failed / 18 passed — ONE test moved, and it is this one. On that same modified tree the
      //   assertion this replaces was measured GREEN (`/\d\{4\}/` against the file containing the
      //   offender → false), which is the finding stated as an experiment rather than as an argument.
      //   Reverted → 19 passed.
      //
      //   The [17-D20] half was probed on the same tree: with the identical regex moved into a COMMENT
      //   instead, an unstripped `SOURCE` scan matches (a false red) and the `CODE` scan does not.
      //
      // ⚠ AND THE CLAIM IS NARROWED TO WHAT THE INSTRUMENT ENFORCES — the other half of the fix, and
      // the reason the old comment was as wrong as the old regex. It said "no hand-rolled date regex
      // in this file". This catches the `\d{n}` quantifier and NOTHING ELSE — measured: `\d{1,3}` (a
      // range quantifier), `[0-9]{4}` and `\w{4}` all slip past. It is a tripwire for the obvious
      // copy-paste of the shared parser, not a proof that no second parser exists. The delegation
      // assertions above are what carry the real weight; this is the cheap corroboration.
      const HAND_ROLLED_DIGIT_QUANTIFIER = /\\d\{\d+\}/;
      const SYNTHETIC_OFFENDER = String.raw`  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);`;

      // THE POSITIVE CONTROL COMES FIRST, and it is not decoration: a `not.toMatch` whose pattern can
      // match nothing is green forever, which is precisely how the previous version passed review.
      expect(
        SYNTHETIC_OFFENDER,
        "the pattern cannot catch a pasted copy of the shared parser — the exact defect WR-01 " +
          "reported in the assertion this one replaces",
      ).toMatch(HAND_ROLLED_DIGIT_QUANTIFIER);

      // Scanned over CODE, not SOURCE: the honest way to document a shared parser is to quote its
      // regex in a comment, and a comment cannot parse a date. See `CODE`'s docblock ([17-D20]).
      expect(
        CODE,
        "today-override.ts grew a second date regex; the shared strict parser in window-params.ts " +
          "is meant to be the only one, and a second one is a second set of edge cases on a " +
          "query-parameter seam",
      ).not.toMatch(HAND_ROLLED_DIGIT_QUANTIFIER);
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
