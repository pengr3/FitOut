import { readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";

import { getGlobalDispatcher, setGlobalDispatcher, type Dispatcher } from "undici";
import { afterEach, describe, expect, it, vi } from "vitest";

import { register } from "../../instrumentation";

/**
 * 17-D18 / plan 17.1-06 — the DEV-ONLY, PROCESS-LEVEL PayMongo interception seam.
 *
 * WHAT THE SEAM IS. `instrumentation.ts` at the repo root is Next's server boot hook. Outside
 * production, on the nodejs runtime, it installs a global mock dispatcher that answers every request to
 * the PayMongo origin with the gated-error shape (404 + `{ errors: [{ detail }] }`) and lets every other
 * host through. It exists because `[17-D18]` records the only assertion in the e2e suite that leaves the
 * machine, and plan 17.1-05's census (`17.1-EVIDENCE.md` § P3) measured it at 10 real, credentialed
 * requests per full run of the two spec files — against the 2 the finding records.
 *
 * WHY A SEAM REACHABLE IN PRODUCTION WOULD BE A REAL DEFECT, not a testing untidiness. `register()`
 * runs on EVERY boot of this app before anything else, and a root boot hook can reach anything the
 * process can. A dispatcher installed there decides where every outbound request in a money-handling
 * marketplace goes — Elevation of Privilege and Tampering on a money-adjacent path (T-17.1-26, ASVS
 * V1/V14). That is why the production guard is a BUILD-TIME CONSTANT and the FIRST statement of the
 * function, and why this file pins the position and the spelling and not merely the behaviour: an
 * operator-settable env var would pass every behavioural test here and fail the property, because an
 * env var can be flipped on a live deploy and a build-time constant cannot.
 *
 * ⚠ WHERE THIS FILE RUNS, STATED SO NOBODY READS A GREEN BUILD AS COVERING IT. It is collected by
 * `vitest.config.ts` (`include: ["tests/**\/*.test.ts", …]`, and `tests/design/**` is excluded), so it
 * runs under `npm test` and CI's `gate-db` job. It does NOT run under `npm run test:design` and
 * therefore NOT inside `npm run build`. `npm run build` being green says nothing about this seam.
 *
 * ⚠ THE POSITIVE CONTROL IS THE LOAD-BEARING TEST, and it is the one most likely to be dropped by a
 * later tidy. A `register()` that did nothing at all — a deleted body, a guard that returns too early,
 * an interceptor that stopped matching — passes the production-inertness test perfectly. Without the
 * control this whole file would assert nothing while reporting green, which is the exact vacuity the
 * phase this seam belongs to exists to hunt.
 *
 * ── WATCHED RED 1 — the guard-position scan ───────────────────────────────────────────────────────
 *
 * Measured 2026-08-31, plan 17.1-06. A statement was inserted ABOVE guard 1 in `instrumentation.ts`
 * (`const bootedAt = Date.now();`), so the file still carried the identical `NODE_ENV` comparison and
 * was still inert in production — only its POSITION moved, which is exactly the drift a `toContain`
 * cannot see. Run against the modified tree, then reverted:
 *
 *   × spells the production guard as a build-time constant, as register()'s FIRST statement 8ms
 *     AssertionError: the production guard is no longer the first statement of register(). Anything
 *     above it runs on EVERY boot including production, and the bundler can no longer prune the body:
 *     expected 'const bootedAt = Date.now();' to be 'if (process.env.NODE_ENV === "product…'
 *     // Object.is equality
 *
 *     Test Files  1 failed (1)
 *          Tests  1 failed | 12 passed (13)
 *
 *   ONE test moved, and it is this one. On that same modified tree the `toContain` half of the SAME
 *   test was green — it runs first in the body and did not fail — which is precisely why the
 *   `firstStatement` derivation is copied from the analog rather than replaced by a substring check.
 *   Reverted → 13 passed.
 *
 * ── WATCHED RED 2 — the positive control ──────────────────────────────────────────────────────────
 *
 * Same date. The interceptor was neutered by narrowing the catch-all path matcher to a single literal
 * path nothing uses (`path: "/v1/__never__"`), leaving `register()`, both guards, the dynamic import,
 * `setGlobalDispatcher` and the net-connect predicate all in place — i.e. a seam that installs
 * perfectly and intercepts nothing. Run, then reverted:
 *
 *   × is not inert merely because production returns early — OUTSIDE production the same request IS
 *     intercepted 10ms
 *   × intercepts a THIRD, PREVIOUSLY-UNNAMED PayMongo path — the reason the seam is origin-level 2ms
 *   × serves the SAME path repeatedly — the interceptor is persisted, not consumed 1ms
 *
 *     TypeError: fetch failed
 *     Caused by: MockNotMatchedError: Mock dispatch not matched for path '/v1/linked_accounts':
 *     subsequent request to origin https://api.paymongo.com was not allowed (net.connect is not
 *     enabled for this origin), 1 interceptor(s) remaining out of 1 defined
 *     Serialized Error: { code: 'UND_MOCK_ERR_MOCK_NOT_MATCHED' }
 *
 *     Test Files  1 failed (1)
 *          Tests  3 failed | 10 passed (13)
 *
 *   ⚠ THE PREDICTION WAS 2 FAILED / 11 PASSED AND THE MEASUREMENT IS 3 / 10 — recorded as a correction
 *   rather than quietly adopted. The third row is the `.persist()` test, which also drives a real
 *   request and which the prediction forgot. The number is bigger than predicted in the SAFE direction:
 *   three independent tests notice a seam that has stopped intercepting, not two.
 *
 *   AND NOTE WHAT THE RED PROVES BESIDES THE CONTROL. When the mock stopped matching, the request did
 *   NOT quietly leave the machine — the deny-of-one net-connect predicate turned it into a loud throw
 *   naming the origin (`net.connect is not enabled for this origin`). That is the standing
 *   "zero outbound requests" assertion working as designed, and it is why a green run of this file may
 *   be read as a zero rather than as an absence of evidence. Reverted → 13 passed.
 */
describe("17-D18 — the dev-only PayMongo interception seam", () => {
  const SOURCE = readFileSync(path.join(process.cwd(), "instrumentation.ts"), "utf8");

  /**
   * `SOURCE` with whole-line comments and blank lines removed — copied byte-for-byte from
   * `tests/security/dev-today-override.test.ts:48-57`, and for the same reason.
   *
   * ⚠ THE STRIP IS THE POINT OF EVERY SOURCE SCAN BELOW, NOT NOISE — the `[17-D20]` class: PROSE ABOUT
   * A COUNTED TOKEN IS STILL THE TOKEN. `instrumentation.ts`'s header necessarily NAMES both
   * environment variables it explains, names the mock-dispatcher package it dynamically imports, and
   * quotes the guard it must not have moved. Every one of the three scans below would be measuring its
   * own documentation without this strip.
   *
   * IT MAKES THE ASSERTIONS STRONGER, NEVER MORE PERMISSIVE. A comment cannot read an env var and
   * cannot import a package, so scanning comments could only ever produce a FALSE RED.
   *
   * KNOWN LIMIT, stated so it is not mistaken for a parser: this is a LINE filter, so a trailing `//`
   * comment on a line that also carries code survives into `CODE`. That is the conservative direction.
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
   * The dispatcher this process booted with, captured once. Importing `undici` at the top of this file
   * guarantees it is defined: `undici/lib/global.js` installs a default `Agent` on
   * `Symbol.for("undici.globalDispatcher.1")` if nothing holds it yet — the SAME symbol Node 24's
   * built-in `fetch` reads, which is the whole reason seam D works at all.
   */
  const ORIGINAL_DISPATCHER: Dispatcher = getGlobalDispatcher();

  /**
   * ⚠ BOTH RESTORES LIVE HERE, NOT AT THE END OF A TEST BODY — and that is a measured lesson, not a
   * style choice. From the analog's own header (`dev-today-override.test.ts:61-65`):
   *
   *   *"`vi.unstubAllEnvs()` was the LAST LINE of the production-inertness test, after the `expect`.
   *   `expect` THROWS on failure, so the restore was skipped on exactly the run where it mattered."*
   *
   * Measured cascade there: 4 failed / 16 passed pre-fix vs 1 failed / 20 passed after — and the
   * loudest false alarm in that output was the POSITIVE CONTROL, i.e. a reader triaging four failures
   * was being actively misled about which one broke.
   *
   * THE SAME TRAP APPLIES HERE AND IT IS WORSE, because a leaked mock dispatcher is PROCESS-GLOBAL: a
   * `MockAgent` left installed after a failing test answers 404 to `api.paymongo.com` and THROWS on
   * every other host for every subsequent test in the same worker, including tests that have nothing to
   * do with this seam. A trailing restore is unreachable on precisely the run that installs it.
   */
  afterEach(() => {
    setGlobalDispatcher(ORIGINAL_DISPATCHER);
    vi.unstubAllEnvs();
  });

  describe("production inertness — the load-bearing half", () => {
    it("installs NO dispatcher when NODE_ENV is production", async () => {
      // NEXT_RUNTIME is stubbed to the value that would let guard 2 through, so this test isolates
      // guard 1 rather than passing because a later guard happened to catch it.
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_RUNTIME", "nodejs");

      const before = getGlobalDispatcher();
      await register();

      // Identity, not a behavioural probe: a unit test must not make a real outbound request to decide
      // whether an interception is absent — that is the very thing this seam exists to stop.
      expect(
        getGlobalDispatcher(),
        "register() replaced the global dispatcher with NODE_ENV=production. The seam is reachable in " +
          "a production boot, which is T-17.1-26 exactly: a root boot hook deciding where every " +
          "outbound request in a money-handling app goes",
      ).toBe(before);
    });

    it("does not leak the production stub into the tests that follow it", () => {
      // THE ISOLATION ITSELF, ASSERTED. It must sit immediately after the stubbing test, because "the
      // tests that follow it" is what it asserts, and it reads the env rather than calling register()
      // so it cannot be confused with the positive control below.
      expect(
        process.env.NODE_ENV,
        "NODE_ENV is still stubbed to production after the test above, so every assertion from here " +
          "down is measuring the production branch and the positive control is about to false-red",
      ).not.toBe("production");
    });

    it("does not leak a mock dispatcher into the tests that follow it", () => {
      // The second half of the same isolation claim, and the one with the wider blast radius: this
      // dispatcher is process-global, so a leak reaches every other test file in the worker.
      expect(
        getGlobalDispatcher(),
        "a mock dispatcher survived the previous test. Every later test in this worker is now being " +
          "answered by it — 404 for api.paymongo.com and a throw for every other host",
      ).toBe(ORIGINAL_DISPATCHER);
    });

    it("is not inert merely because production returns early — OUTSIDE production the same request IS intercepted", async () => {
      // THE POSITIVE CONTROL. Without it, a register() that did nothing at all would pass the
      // production-inertness test above and this suite would be asserting nothing whatsoever.
      vi.stubEnv("NEXT_RUNTIME", "nodejs");
      await register();

      const res = await fetch("https://api.paymongo.com/v1/linked_accounts", { method: "POST" });

      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");

      // D-10's shape, byte-for-byte what `paymongoFetch` reads: it takes `errors[0].detail` and throws
      // with it, which is what makes the audit row, the rate-limit accounting and the rendered
      // fallback h1 identical to a real gated PayMongo failure.
      const body = (await res.json()) as { errors?: Array<{ detail?: string }> };
      expect(Array.isArray(body.errors)).toBe(true);
      expect(typeof body.errors?.[0]?.detail).toBe("string");
      expect(body.errors?.[0]?.detail?.length ?? 0).toBeGreaterThan(0);
    });

    it("intercepts a THIRD, PREVIOUSLY-UNNAMED PayMongo path — the reason the seam is origin-level", async () => {
      // The clause the analog has no equivalent for. `[17-D18]` names ONE endpoint, RESEARCH C4 named a
      // second, and § P3's census then measured a THIRD nobody had named ([17-D27],
      // GET /v1/checkout_sessions/{id}, from an entirely different route). A path-scoped mock would
      // pass every test above and let the next endpoint out on the day it is added.
      vi.stubEnv("NEXT_RUNTIME", "nodejs");
      await register();

      const res = await fetch(
        "https://api.paymongo.com/v1/some_endpoint_that_does_not_exist_yet",
        { method: "POST" },
      );
      const body = (await res.json()) as { errors?: Array<{ detail?: string }> };

      expect(res.status).toBe(404);
      expect(typeof body.errors?.[0]?.detail).toBe("string");
    });

    it("serves the SAME path repeatedly — the interceptor is persisted, not consumed", async () => {
      // `.persist()`, asserted behaviourally. § P3 measured 4 GETs on ONE checkout-session URL in a
      // single `overflow-320` run; a consumed interceptor would serve the first and let the other
      // three fall through to the net-connect predicate, i.e. turn a silent pass into a spec failure.
      vi.stubEnv("NEXT_RUNTIME", "nodejs");
      await register();

      const first = await fetch("https://api.paymongo.com/v1/linked_accounts", { method: "POST" });
      const second = await fetch("https://api.paymongo.com/v1/linked_accounts", { method: "POST" });
      const third = await fetch("https://api.paymongo.com/v1/linked_accounts/onboarding_links", {
        method: "POST",
      });

      expect([first.status, second.status, third.status]).toEqual([404, 404, 404]);
    });

    it("spells the production guard as a build-time constant, as register()'s FIRST statement", () => {
      // `process.env.NODE_ENV` is inlined by the bundler, so in a production build everything below it
      // is PRUNED rather than merely skipped. A bespoke env var would not be inlined and could be
      // flipped on a live deploy. Same argument, same spelling, as src/lib/dev/today-override.ts and
      // next.config.ts, which are the precedents this file follows.
      expect(SOURCE).toContain('if (process.env.NODE_ENV === "production") return;');

      // ⚠ THE POSITION IS THE PROPERTY, AND `toContain` CANNOT SEE IT. The derivation below is copied
      // from the analog (dev-today-override.test.ts:139-146) for exactly that reason — watched red 1 in
      // this file's header is the measurement: with the guard moved one statement down, the `toContain`
      // above stayed green and only this assertion moved.
      const body = SOURCE.slice(SOURCE.indexOf("export async function register"));
      const firstStatement = body
        .split(NEWLINE)
        .map((l) => l.trim())
        .find(
          (l) => l.length > 0 && !l.startsWith("//") && !l.startsWith("export async function"),
        );
      expect(
        firstStatement,
        "the production guard is no longer the first statement of register(). Anything above it runs " +
          "on EVERY boot including production, and the bundler can no longer prune the body",
      ).toBe('if (process.env.NODE_ENV === "production") return;');
    });

    it("reads NO other environment variable — the guard cannot be widened by configuration", () => {
      // ⚠ SCANNED OVER CODE LINES ONLY — see `CODE`'s docblock for why the strip is the point of this
      // assertion rather than noise.
      //
      // TWO names, not one, and the second is admitted for a stated reason: NEXT_RUNTIME is set by the
      // FRAMEWORK per invocation (src/middleware.ts exists, so register() is invoked for a non-nodejs
      // runtime too, where the mock dispatcher cannot load). It narrows the guard and cannot widen it.
      // A THIRD name would mean the seam can be switched on by configuration on a money-adjacent path.
      const envReads = CODE.match(/process\.env\.[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
      expect(
        envReads,
        "instrumentation.ts reads an environment variable beyond its two guards. Every additional " +
          "name is another way to change what a root boot hook does without changing its code — and " +
          "the one thing the production guard must not be is operator-settable",
      ).toEqual(["process.env.NODE_ENV", "process.env.NEXT_RUNTIME"]);
    });

    it("never imports the mock dispatcher at the top level — the specifier is reached only dynamically", () => {
      // ⚠ WHAT THIS ARGUMENT DOES **NOT** REST ON. `[17-D29]` measured that `undici` SURVIVES
      // `npm ci --omit=dev` on this repo — better-auth is a production dependency declaring vitest as
      // an optional peer, satisfied from the root copy, so vitest, jsdom and undici all carry no dev
      // flag. "It is not in the production tree" is FALSE here. The dynamic import matters because it
      // keeps the specifier behind the build-time guard, so the branch is PRUNED; the guard is the
      // protection, and the dependency scope never was.
      const STATIC_IMPORT = /\bfrom\s+["']undici["']/;
      const SYNTHETIC_OFFENDER = 'import { MockAgent, setGlobalDispatcher } from "undici";';

      // THE POSITIVE CONTROL COMES FIRST: a `not.toMatch` whose pattern can match nothing is green
      // forever, which is how a whole class of these assertions has passed review in this repo before.
      expect(
        SYNTHETIC_OFFENDER,
        "the pattern cannot catch a top-level import of the mock dispatcher, so the assertion below " +
          "is green by construction",
      ).toMatch(STATIC_IMPORT);

      expect(
        CODE,
        "instrumentation.ts imports the mock dispatcher at the top level. That puts the specifier in " +
          "the production server bundle unconditionally and defeats the pruning that makes GUARD 1 a " +
          "build-time property rather than a runtime one",
      ).not.toMatch(STATIC_IMPORT);

      expect(
        CODE,
        "the dynamic import is gone; if the seam no longer imports the mock dispatcher at all it " +
          "cannot be intercepting anything",
      ).toContain('await import("undici")');
    });

    it("proves the comment strip is real — it removes prose and keeps the guard", () => {
      // GUARD THE GUARD on `CODE` (the analog's :155-168). Three scans above are `toEqual([…])` /
      // `not.toMatch` / `toContain` shapes over `CODE`, and a `CODE` that had silently become "" would
      // satisfy the first two forever. Assertions in opposite directions, so neither an empty strip nor
      // a no-op strip can pass.
      expect(CODE, "the comment strip produced no code at all").toContain(
        'if (process.env.NODE_ENV === "production") return;',
      );
      expect(
        CODE,
        "the comment strip kept a prose line, so every source scan here is back in the [17-D20] class",
      ).not.toContain("WHY THIS EXISTS");
      expect(SOURCE).toContain("WHY THIS EXISTS");
    });
  });

  describe("blast radius — INVERTED for a root file that nothing imports", () => {
    /**
     * ⚠ THE ADAPTATION IS THE POINT, AND PORTING THE ANALOG UNCHANGED WOULD COUNT NOTHING.
     * `dev-today-override.test.ts` scopes its walk to `src/` and asserts EXACTLY ONE referrer, because
     * its seam is a module that one route imports. This seam is the opposite shape: `instrumentation.ts`
     * sits at the repo ROOT and is loaded BY CONVENTION by the framework — nothing in the product
     * imports it, and nothing ever should. So the equivalent property is inverted and stated in the
     * tests' own names below: ZERO referrers under `src/`, and exactly ONE `instrumentation.*` on disk.
     *
     * A boot hook that something in `src/` starts importing has stopped being a boot hook and has
     * become a module with two entry points — one of which is not guarded by `register()`'s guards.
     */
    const rel = (p: string): string => path.relative(process.cwd(), p).split(path.sep).join("/");

    const collectSources = (dir: string, out: string[] = []): string[] => {
      let entries: Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        // `[]` on an unreadable directory rather than a throw (the repo's rule, 11-02): a broken scan
        // surfaces as ONE named guard-the-guard failure, never a stack trace that buries which gate
        // went quiet. The floor assertion below is what converts that `[]` into a red.
        return out;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collectSources(full, out);
        else if (/\.tsx?$/.test(entry.name)) out.push(rel(full));
      }
      return out;
    };

    /** Whatever shape a reference to a root boot hook takes, it has to spell this. */
    const SEAM_TOKEN = "instrumentation";

    /**
     * Measured at 351 `.ts`/`.tsx` files under `src/` on 31 August 2026 (352 on 30 August, per the
     * analog — one file was deleted by plan 17.1-02). 200 leaves generous room for deletion without
     * leaving room for a walk that silently stopped at the first directory.
     */
    const MIN_SCANNED_FILES = 200;

    const scanned = collectSources("src");
    const referrers = scanned
      .filter((file) =>
        codeOnly(readFileSync(path.join(process.cwd(), file), "utf8")).includes(SEAM_TOKEN),
      )
      .sort();

    it("walks a real tree — the scan is not empty and the matcher is not a no-op", () => {
      // GUARD THE GUARD, and it is doing more work here than in the analog: the assertion below is
      // `toEqual([])`, which an EMPTY WALK would satisfy perfectly. Without this floor the inverted
      // property is green by construction — the WR-02 defect the analog records, in its purest form.
      expect(
        scanned.length,
        "the src/ walk collected almost nothing, so the zero-referrer assertion below is measuring an " +
          "empty tree rather than the seam",
      ).toBeGreaterThan(MIN_SCANNED_FILES);

      const references = (line: string): boolean => codeOnly(line).includes(SEAM_TOKEN);
      expect(references('import { register } from "../../instrumentation";')).toBe(true);
      expect(references('export { register } from "@/../instrumentation";')).toBe(true);
      expect(references('  const m = await import("../../../instrumentation");')).toBe(true);
      expect(references("// the seam lives in instrumentation.ts at the repo root")).toBe(false);
      expect(references(" * See `instrumentation.ts`, which owns both guards.")).toBe(false);
    });

    it("is referenced by NO file in src/ — a boot hook must not become an importable module", () => {
      expect(
        referrers,
        "the dev-only PayMongo seam is referenced from product code. It is a boot hook: the framework " +
          "calls register() once, behind two guards. A second entry point reached by an import is not " +
          "behind those guards, and each new site would need its own argument for why installing a " +
          "global dispatcher is safe there. Add it here once that argument is written down.",
      ).toEqual([]);
    });

    it("is the ONLY instrumentation.* on disk — a second one cannot appear beside it", () => {
      // Next loads the hook by convention from the repo root OR from `src/`, and § P3 MEASURED that
      // both are loaded on Next 16.2.7 in this repo. Two files would both boot, both install a
      // dispatcher, and the last one to run would decide — silently. One file, or this goes red.
      const rootHooks = readdirSync(process.cwd(), { withFileTypes: true })
        .filter((e) => e.isFile() && /^instrumentation\.(m|c)?[jt]sx?$/.test(e.name))
        .map((e) => e.name);
      const srcHooks = scanned.filter((f) => /(^|\/)instrumentation\.tsx?$/.test(f));

      expect([...rootHooks.map((n) => n), ...srcHooks].sort(), "more than one instrumentation hook exists").toEqual([
        "instrumentation.ts",
      ]);
    });
  });
});
