import { readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

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
  const codeOnly = (text: string): string =>
    text
      .split(NEWLINE)
      .filter((line) => {
        const t = line.trim();
        return t !== "" && !t.startsWith("//") && !t.startsWith("/*") && !t.startsWith("*");
      })
      .join(NEWLINE);
  const CODE = codeOnly(SOURCE);

  /**
   * ⚠ THE ENV STUB IS RESTORED HERE, NOT IN A TEST BODY (phase-17 code review, WR-03).
   *
   * WHAT THIS REPLACES. `vi.unstubAllEnvs()` was the LAST LINE of the production-inertness test, after
   * the `expect`. `expect` THROWS on failure, so the restore was skipped on exactly the run where it
   * mattered and `NODE_ENV=production` survived into every test after it. Verified that Vitest does not
   * clean it up on its own: `unstubEnvs` defaults to `false` and is set in neither `vitest.config.ts`
   * nor `vitest.design.config.ts` nor `tests/setup.ts`.
   *
   * THE CONSEQUENCE WAS SPECIFIC AND BAD, which is why this is a fix rather than tidying: a real
   * failure in test 1 also LEAKS the stub, so every later assertion that expects a non-null result
   * measures the production branch and false-reds.
   *
   * ⚠ RED-WATCHED, AND THE MEASURED CASCADE IS 4 — NOT THE 7 THE REVIEW PREDICTED. Both shapes were
   * run against the same synthetic failure (test 1's `toBeNull()` swapped for a `toEqual` that cannot
   * hold), with the module itself untouched so nothing but the isolation differed:
   *
   *   pre-fix shape (restore as the last line of the test body) → 4 failed / 16 passed
   *       × returns null for a PERFECTLY VALID date when NODE_ENV is production   ← the true one
   *       × is not inert merely because every input is rejected …                 ← THE POSITIVE CONTROL
   *       × accepts exactly the YYYY-MM-DD shape the searched-window contract already uses
   *       × returns a plain date triple and nothing else
   *   this shape (describe-level afterEach)                     → 1 failed / 20 passed
   *
   *   THE REVIEW'S NUMBER WAS WRONG IN THE SAFE DIRECTION and the correction is recorded rather than
   *   quietly adopted: WR-03 predicted the eight rows of the parse table would fall too. They do not.
   *   Every one of them asserts `toBeNull()`, and the leaked production branch RETURNS null — so they
   *   stay green for the wrong reason, which is its own small unpleasantness. What actually cascades
   *   is the three assertions that expect a REAL date back.
   *
   *   The count is smaller than reported and the point is unchanged: the loudest false alarm in that
   *   output is the POSITIVE CONTROL — the one assertion that exists to prove this suite is not
   *   vacuous — and a reader triaging four failures is being actively misled about which one broke.
   *
   * ⚠ `afterEach` HERE RATHER THAN `unstubEnvs: true` IN THE CONFIG, and that is a measurement, not a
   * preference. The global switch restores after EVERY test, and this repo has suites that stub in
   * `beforeAll` and restore in `afterAll` on purpose — `tests/payments/payment-reconcile.test.ts:247`
   * / `:288` and `tests/payments/retire-checkout.test.ts:84` / `:113` both do. Flipping the config key
   * would clear their harness key after their first test and break them. The file-local `afterEach` is
   * also the repo's existing idiom for exactly this shape (`tests/auth/secret-config.test.ts:27`,
   * `tests/booking/checkout-probe.test.ts:78-80`), so this file now looks like its neighbours.
   */
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("production inertness — the load-bearing half", () => {
    it("returns null for a PERFECTLY VALID date when NODE_ENV is production", () => {
      vi.stubEnv("NODE_ENV", "production");
      // The same value that is honoured outside production, one line below. The stub is restored by
      // the file's `afterEach` — NEVER by a line after this `expect`, which is unreachable on the one
      // run that matters. See the `afterEach` docblock above (WR-03).
      expect(devTodayOverride("2026-09-16")).toBeNull();
    });

    it("does not leak the production stub into the tests that follow it", () => {
      // THE ISOLATION ITSELF, ASSERTED. WR-03's defect was invisible while the suite was green: the
      // leak only appeared on a failing run, which is the run nobody is reading carefully. This test
      // makes the restore a property of every green run instead. It must sit immediately after the
      // stubbing test, because "the tests that follow it" is what it asserts, and it reads the env
      // rather than the function so it cannot be confused with the positive control below.
      expect(
        process.env.NODE_ENV,
        "NODE_ENV is still stubbed to production after the test above, so every assertion from here " +
          "down is measuring the production branch and the positive control is about to false-red",
      ).not.toBe("production");
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
    /**
     * Every `.ts`/`.tsx` file under `src/`, repo-relative and slash-normalised so the expected set
     * below reads the same on Windows and Linux.
     *
     * `[]` on an unreadable directory rather than a throw — the repo's rule (11-02, and
     * `tests/design/focus-definition.test.ts:192-205` is the shape this follows): a broken scan
     * surfaces as ONE named guard-the-guard failure, never a stack trace that buries which gate went
     * quiet. The floor assertion below is what converts that `[]` into a red.
     */
    const rel = (p: string): string => path.relative(process.cwd(), p).split(path.sep).join("/");

    const collectSources = (dir: string, out: string[] = []): string[] => {
      let entries: Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return out;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collectSources(full, out);
        else if (/\.tsx?$/.test(entry.name)) out.push(rel(full));
      }
      return out;
    };

    /** The module specifier every reference to the seam must spell, whatever shape the reference takes. */
    const SEAM_SPECIFIER = "@/lib/dev/today-override";

    /**
     * The floor that makes the scan's emptiness impossible to mistake for its cleanliness. Measured at
     * 352 `.ts`/`.tsx` files under `src/` on 30 August 2026; 200 leaves generous room for deletion
     * without leaving room for a walk that silently stopped at the first directory.
     */
    const MIN_SCANNED_FILES = 200;

    const scanned = collectSources("src");
    const referrers = scanned
      .filter((file) =>
        codeOnly(readFileSync(path.join(process.cwd(), file), "utf8")).includes(SEAM_SPECIFIER),
      )
      .sort();

    it("walks a real tree — the scan is not empty and the matcher is not a no-op", () => {
      // GUARD THE GUARD, and it is not ceremony here: the assertion below is `toEqual([one file])`,
      // which a walk that returned nothing would fail loudly — but a walk that returned nothing while
      // someone was ALSO deleting the seam would pass, and so would a matcher that matched nothing if
      // the expected list were ever emptied. Both halves are pinned before either is trusted.
      expect(
        scanned.length,
        "the src/ walk collected almost nothing, so the blast-radius assertion below is measuring an " +
          "empty tree rather than the seam",
      ).toBeGreaterThan(MIN_SCANNED_FILES);

      // The matcher, controlled against every shape a reference can take and against the two shapes
      // that must NOT count. MEASURED — the last two are why this scans `codeOnly` rather than raw
      // source: `src/app/listings/[id]/(detail)/page.tsx:210` already names the module in a block
      // comment, and `e2e/helpers/visual-drive.ts` names it twice more.
      const references = (line: string): boolean => codeOnly(line).includes(SEAM_SPECIFIER);
      expect(references(`import { devTodayOverride } from "${SEAM_SPECIFIER}";`)).toBe(true);
      expect(references(`import type { TodayOverride } from "${SEAM_SPECIFIER}";`)).toBe(true);
      expect(references(`export { devTodayOverride } from "${SEAM_SPECIFIER}";`)).toBe(true);
      expect(references(`  const m = await import("${SEAM_SPECIFIER}");`)).toBe(true);
      expect(references(`// see ${SEAM_SPECIFIER} for both guards`)).toBe(false);
      expect(references(` * See \`${SEAM_SPECIFIER}\`, which owns both guards.`)).toBe(false);
    });

    it("is referenced by exactly one file in src/, and that file is the listing route", () => {
      // ⚠ THIS TEST USED TO COUNT NOTHING (phase-17 code review, WR-02). Its name and its comment both
      // stated a BLAST-RADIUS property, and its body read one known file and asserted that file
      // contained the import:
      //
      //     const page = readFileSync(path.join(process.cwd(), "src/app/listings/[id]/(detail)/page.tsx"), "utf8");
      //     expect(page).toContain('from "@/lib/dev/today-override"');
      //
      // Adding `devTodayOverride` to a second route, a server action or a client component left that
      // green. The property the test was NAMED for was unenforced — and the seam it guards is a query
      // parameter that steers date arithmetic on a public page, so "it spread and nothing said so" is
      // the failure that matters most here.
      //
      // THE SET IS THE ASSERTION NOW. A new referrer changes the array and the diff names the file.
      //
      // ⚠ RED-WATCHED (30 August 2026). `import { devTodayOverride } from "@/lib/dev/today-override";`
      // was added to `src/app/(app)/dev-throw-app/page.tsx` — a second route, which is exactly the
      // spread this test is named for — and the file was reverted:
      //
      //   × is referenced by exactly one file in src/, and that file is the listing route
      //     → AssertionError: the dev-only ?today= seam is referenced somewhere new. […]:
      //       expected [ …(2) ] to deeply equal [ Array(1) ]
      //       +   "src/app/(app)/dev-throw-app/page.tsx"
      //
      //   1 failed / 20 passed, and the diff NAMES the new file rather than saying a number moved.
      //   On that same tree the assertion this replaces was measured GREEN (`page.toContain(…)` against
      //   the untouched listing route → true), which is WR-02 stated as an experiment. Reverted → 21.
      //
      // Scope is `src/` on purpose: this is a claim about PRODUCT code. `e2e/` and `tests/` reference
      // the module by name in prose (and this file imports it outright), and neither can put a request
      // parameter on a shipped route.
      expect(
        referrers,
        "the dev-only ?today= seam is referenced somewhere new. A dev-only seam that spreads is no " +
          "longer a seam: each new site needs its own argument for why a request parameter may steer " +
          "it, and its own reason why the production guard is still sufficient. Add it here once that " +
          "argument is written down.",
      ).toEqual(["src/app/listings/[id]/(detail)/page.tsx"]);
    });

    it("returns a plain date triple and nothing else", () => {
      const out = devTodayOverride("2026-09-16");
      expect(Object.keys(out ?? {}).sort()).toEqual(["day", "month", "year"]);
    });
  });
});
