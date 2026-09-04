// D-14's RUNTIME HALF, PROVEN IN BOTH DIRECTIONS ON EVERY BUILD. This file is the instrument for
// `scripts/refuse-mail-credential.mjs` — the step `gate-e2e` runs first, before the database is
// migrated, before the catalogue is seeded and before Playwright boots the app.
//
// ── THE ONE SENTENCE OF CR-01 HISTORY ─────────────────────────────────────────────────────────────
//
// The previous incarnation of this control read the provider key through a `${{ env.… }}` context
// expression, and the GitHub Actions `env` EXPRESSION context is built exclusively from workflow, job
// and step `env:` maps written in the workflow file — never the process environment, secrets, `vars.*`,
// `container.env` or `services.*.env` — so it could fire only on the single input
// `scripts/verify-workflows.mjs` already rejects the whole file for, and its real coverage was ZERO
// (review finding CR-01, 2026-09-04; plan 19-12 replaced it).
//
// ── AND THE SECOND CR-01, ONE DAY LATER: THE ARGUMENT IS REMOVED, NOT GATED ───────────────────────
//
// 19-VERIFICATION.md then reproduced a fail-open in that replacement. The script accepted
// `process.argv[2]` as an override of the file it reads its detection prefix from, so the invocation
// `<provider-named variable>=… node scripts/refuse-mail-credential.mjs <decoy source>` exited 0 and
// reported a clean scan while a live credential sat in the environment — and `.github/workflows/ci.yml`
// could carry that same appended argument with all 48 invariants still green, because Invariant A only
// asked whether the `run:` string CONTAINED the script's path. Plan 19-13 REMOVED the argument rather
// than gating it: a test-only escape hatch that the thing being guarded against can also use is not a
// harness, it is the hole. Cases 7 and 8 below are that exact invocation, now asserting exit 1.
//
// Removing it costs this file its old route to the two hard stops, which used to be reached by pointing
// the argument at a decoy. They are now reached the only way left, and the honest one: `withScriptCopy`
// runs a COPY of the script from a temp directory whose sibling `verify-workflows.mjs` is missing
// (case 5, the READ stop) or carries no declaration (case 4, the PARSE stop). The script resolves its
// prefix source from `import.meta.url` and from nothing else, so moving the script is now the only way
// to move its source.
//
// ── WHY THIS FILE SPAWNS THE SCRIPT RATHER THAN IMPORTING IT ──────────────────────────────────────
//
// The contract `.github/workflows/ci.yml` consumes is a PROCESS EXIT CODE plus what the process
// printed — not a function's return value. A test that imported a helper and asserted on its return
// would leave the two things CI actually depends on (does it exit non-zero, does it emit an
// `::error::` annotation) unmeasured. It also could not answer the question that IS the defect being
// closed: what the CHILD's environment contains. Hence `spawnSync` with an EXPLICITLY CONSTRUCTED
// `env` object — never `process.env` spread wholesale with an override on top, because then the
// subject under test would be this runner's environment rather than one this file controls. The
// design suite's existing shell-out idiom is `tests/design/gitignore-baselines.test.ts`.
//
// ── WHY IT LIVES IN `tests/design/` ───────────────────────────────────────────────────────────────
//
// `vitest.design.config.ts` is the suite `npm run build` runs (`"build": "npm run lint && npm run
// test:design && next build"`), and it declares no `globalSetup` and no `setupFiles`, so it can never
// reach for Postgres. That makes this proof BUILD-BLOCKING and DB-FREE: it re-runs on a laptop with no
// Docker and no browser, every build, instead of being trusted once from a watched CI run. A
// fail-closed control that is only ever exercised by the thing it is supposed to protect has no
// instrument at all — which is exactly how CR-01 survived a whole verification round.
//
// This file does NOT restate the mail chain. `tests/design/e2e-email-silence.test.ts` already pins it
// (`playwright.config.ts`'s `webServer.env`, `src/lib/email.ts` binding at module load, the
// `[email:dev]` fallback). That file asserts the suite sends no mail when the key is ABSENT; this one
// asserts the job REFUSES TO START when it is present. Different link, same finding `[17-D28]`.
//
// ⚠ THE PROVIDER'S TOKEN IS NOT TYPED ANYWHERE IN THIS FILE. It is read from
// `scripts/verify-workflows.mjs` with the same declaration pattern the script under test reads it
// with — the seam that makes the two halves one value. A copy here would be a third spelling.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const SCRIPT = resolve(process.cwd(), "scripts/refuse-mail-credential.mjs");
const PREFIX_SOURCE = resolve(process.cwd(), "scripts/verify-workflows.mjs");

/**
 * The exact pattern `scripts/refuse-mail-credential.mjs` uses, and the exact pattern
 * `scripts/verify-workflows.mjs`'s Invariant B asserts all three sites share. `\r\n` is normalised
 * before matching because `.gitattributes` declares `* text=auto`, so a checkout with
 * `core.autocrlf=true` hands this file CRLF bytes for a source that is committed LF.
 */
const PREFIX_DECL = /^const MAIL_KEY_PREFIX = "([A-Z_]+)";$/m;

const PREFIX = (() => {
  const match = PREFIX_DECL.exec(readFileSync(PREFIX_SOURCE, "utf8").replace(/\r\n/g, "\n"));
  if (!match || !match[1]) {
    throw new Error(
      `could not read the mail prefix declaration from ${PREFIX_SOURCE} with ${PREFIX_DECL.source} — ` +
        `this test cannot assert on a prefix it could not read, and guessing one would be a green ` +
        `that means nothing`,
    );
  }
  return match[1];
})();

/** The shape of a real violation: the provider's own key name, built rather than typed. */
const VIOLATING_KEY = `${PREFIX}_API_KEY`;

/** A name that CONTAINS the prefix but does not START with it — the parse half's `startsWith` boundary. */
const NEAR_MISS_KEY = `LEGACY_${PREFIX}_API_KEY`;

/**
 * A value that must never reach a build log. A control that detects a credential is one line away
 * from disclosing it more widely than the send it prevented, so the absence of this string in the
 * output is an assertion, not an assumption.
 */
const SENTINEL = "sentinel-value-that-must-never-be-printed-9f3a";

/**
 * A minimal environment, constructed key by key. Only what a Node child needs to start — nothing
 * inherited that could accidentally satisfy or defeat the property under test.
 */
function baseEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "" };
  if (process.platform === "win32") {
    env.SystemRoot = process.env.SystemRoot ?? "";
    env.ComSpec = process.env.ComSpec ?? "";
  }
  return env;
}

function runRefusal(env: NodeJS.ProcessEnv, args: string[] = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", env });
}

/**
 * The decoy prefix source 19-VERIFICATION.md used to reproduce the CR-01 fail-open: a file that
 * PARSES, so the pre-19-13 script read `ZZUNUSED` out of it, matched nothing, and exited 0 with a
 * live credential in the environment. Cases 7 and 8 pass this exact shape, which is why they were
 * RED (both exit 0) against the pre-change script rather than passing accidentally on a missing file.
 * `ZZUNUSED` is not the provider's token and satisfies the declaration pattern's `[A-Z_]+`.
 */
const DECOY_DECLARATION = 'const MAIL_KEY_PREFIX = "ZZUNUSED";\n';

/** Writes the decoy under `tmpdir()` and removes it afterwards, whatever the assertion does. */
function withDecoySource(assert: (decoyPath: string) => void) {
  const decoy = join(tmpdir(), `mail-prefix-decoy-${process.pid}-${Date.now()}.mjs`);
  writeFileSync(decoy, DECOY_DECLARATION, "utf8");
  try {
    assert(decoy);
  } finally {
    rmSync(decoy, { force: true });
  }
}

/**
 * Runs a COPY of the refusal script from a throwaway directory, with NO arguments.
 *
 * This is how both hard stops are reached now that the prefix source cannot be redirected by input:
 * the script resolves it as `./verify-workflows.mjs` relative to its OWN location, so the only way to
 * hand it an unreadable or declaration-less source is to move the script next to one. `siblingText`
 * of `null` writes no sibling at all (the READ stop); a string writes it (the PARSE stop when it
 * carries no declaration). The directory is removed in a `finally` — a temp tree left behind by a
 * design test is the same class of litter as a mutation left in the working tree.
 */
function withScriptCopy(
  siblingText: string | null,
  assert: (
    result: ReturnType<typeof spawnSync<string>>,
    paths: { copy: string; sibling: string },
  ) => void,
) {
  // ⚠ `realpathSync` IS LOAD-BEARING, NOT DECORATION (review finding IN-02). The two assertions
  // below compare this directory's path against the string the script PRINTS, and that string comes
  // from Node resolving the real path of the main entry module. On any platform whose temp directory
  // is a symlink the two differ and both assertions fail for a script that behaved correctly —
  // macOS is the concrete case (`/var` → `/private/var`). Linux CI and Windows are unaffected, so
  // this would fire only on a contributor's machine, which is the worst place for a build-blocking
  // test to fail for a reason unrelated to its property. Matches the idiom
  // `tests/design/workflow-invariants.test.ts` writes next door; two spellings of the same helper in
  // one directory is a second source of truth wearing the costume of a convention.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "mail-refusal-")));
  try {
    const copy = join(dir, basename(SCRIPT));
    const sibling = join(dir, "verify-workflows.mjs");
    copyFileSync(SCRIPT, copy);
    if (siblingText !== null) writeFileSync(sibling, siblingText, "utf8");
    assert(spawnSync(process.execPath, [copy], { encoding: "utf8", env: baseEnv() }), {
      copy,
      sibling,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("the mail-credential refusal reads the environment the job actually has", () => {
  it("exits 1 with an ::error:: line when a provider-named variable is in the child's environment", () => {
    const result = runRefusal({ ...baseEnv(), [VIOLATING_KEY]: SENTINEL });

    expect(result.status).toBe(1);
    expect(
      result.stdout.split("\n").some((line) => line.startsWith("::error::")),
      `stdout carried no line beginning "::error::":\n${result.stdout}\n${result.stderr}`,
    ).toBe(true);
  });

  it("exits 0 and reports the prefix, the count scanned and its source when no such variable is present", () => {
    const result = runRefusal(baseEnv());

    expect(result.status, `stderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain(PREFIX);
    expect(result.stdout).toMatch(/\b\d+\b/);
    expect(result.stdout).toContain("environment variable");
    expect(result.stdout).toContain("verify-workflows.mjs");
  });

  it("does not treat a name that merely CONTAINS the prefix as a hit", () => {
    const result = runRefusal({ ...baseEnv(), [NEAR_MISS_KEY]: SENTINEL });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).not.toContain("::error::");
  });

  it("exits 1 naming the source path when the prefix declaration cannot be PARSED", () => {
    withScriptCopy("// a source file that carries no prefix declaration at all\n", (result, paths) => {
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
      expect(
        result.stdout.split("\n").some((line) => line.startsWith("::error::")),
        `stdout carried no line beginning "::error::":\n${result.stdout}\n${result.stderr}`,
      ).toBe(true);
      expect(result.stdout).toContain(paths.sibling);
    });
  });

  it("exits 1 naming the missing path when the prefix source cannot be READ at all", () => {
    withScriptCopy(null, (result, paths) => {
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
      expect(
        result.stdout.split("\n").some((line) => line.startsWith("::error::")),
        `stdout carried no line beginning "::error::":\n${result.stdout}\n${result.stderr}`,
      ).toBe(true);
      expect(result.stdout).toContain(paths.sibling);
    });
  });

  it("prints the offending variable NAME and never its VALUE", () => {
    const result = runRefusal({ ...baseEnv(), [VIOLATING_KEY]: SENTINEL });

    expect(result.stdout).toContain(VIOLATING_KEY);
    expect(`${result.stdout}${result.stderr}`).not.toContain(SENTINEL);
  });

  it("refuses ANY argument outright, and never reports a completed scan after one", () => {
    withDecoySource((decoy) => {
      const result = runRefusal(baseEnv(), [decoy]);

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
      expect(
        result.stdout.split("\n").some((line) => line.startsWith("::error::")),
        `stdout carried no line beginning "::error::":\n${result.stdout}\n${result.stderr}`,
      ).toBe(true);
      // The clean-scan report. A green scan of a source somebody else chose must never be
      // mistakeable for a pass — so its absence is asserted, not merely the exit code.
      expect(result.stdout).not.toContain("0 begin with it");
    });
  });

  // 19-VERIFICATION.md MEASURED this exact invocation at exit 0 with a provider-named variable
  // present in the environment and a decoy prefix source passed as `argv[2]` — the fail-open this
  // case exists to keep closed.
  it("exits 1 on the measured CR-01 fail-open: an argument AND a provider-named variable present", () => {
    withDecoySource((decoy) => {
      const result = runRefusal({ ...baseEnv(), [VIOLATING_KEY]: SENTINEL }, [decoy]);

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
    });
  });
});
