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
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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

  it("exits 1 naming the source path when the prefix declaration cannot be read", () => {
    const decoy = join(tmpdir(), `mail-prefix-decoy-${process.pid}-${Date.now()}.mjs`);
    writeFileSync(decoy, "// a source file that carries no prefix declaration at all\n", "utf8");
    try {
      const result = runRefusal(baseEnv(), [decoy]);

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
      expect(
        result.stdout.split("\n").some((line) => line.startsWith("::error::")),
        `stdout carried no line beginning "::error::":\n${result.stdout}\n${result.stderr}`,
      ).toBe(true);
      expect(result.stdout).toContain(decoy);
    } finally {
      rmSync(decoy, { force: true });
    }
  });

  it("prints the offending variable NAME and never its VALUE", () => {
    const result = runRefusal({ ...baseEnv(), [VIOLATING_KEY]: SENTINEL });

    expect(result.stdout).toContain(VIOLATING_KEY);
    expect(`${result.stdout}${result.stderr}`).not.toContain(SENTINEL);
  });
});
