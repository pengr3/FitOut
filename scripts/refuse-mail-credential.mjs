#!/usr/bin/env node
// THE RUNTIME HALF OF D-14: refuse to run when a live mail credential is present in the job's REAL
// PROCESS ENVIRONMENT. `.github/workflows/ci.yml`'s `gate-e2e` runs this as its first step after
// `npm ci` — before the database is migrated, before the demo catalogue is seeded, and before
// Playwright boots the app — so a violation costs seconds instead of a whole suite of real mail sent
// to real addresses.
//
// ── WHY THIS FILE EXISTS AT ALL (review finding CR-01, 2026-09-04) ────────────────────────────────
//
// The previous incarnation of this control was a shell test of `${{ env.<provider key> }}`, written
// into the step's own `env:` map. The GitHub Actions `env` EXPRESSION context is built exclusively
// from `env:` maps declared at workflow, job and step level IN THE WORKFLOW FILE. It never contains
// the process environment, repository or organization secrets, `vars.*`, `container.env`, or
// `services.*.env`. So that step could fire on exactly one input — a provider-named `env:` KEY in the
// workflow file — which is precisely and exclusively the input `scripts/verify-workflows.mjs`'s
// parse-based scan already rejects the whole file for, before this job's step could run. Its real
// coverage over the parse half was ZERO, and the header leaned on it to cover the `container.env`
// hole it could not see either. A fail-closed privacy control documented as active while being
// structurally incapable of firing is worse than no control, because its presence stops anyone from
// building the real one.
//
// `process.env` is the same source `env |` prints, and it IS populated from `container.env` and from
// the runner environment. That link is the whole point of this file.
//
// ── WHY THE PREFIX IS READ AND NEVER COPIED ───────────────────────────────────────────────────────
//
// The provider's token is spelled exactly ONCE in workflow-facing code: `MAIL_KEY_PREFIX` in
// `scripts/verify-workflows.mjs`. That is deliberate — the cheapest audit of "this workflow cannot
// mail real people" is a count of the token across `.github/workflows/` returning 0, and a checker
// must name what it counts while the things it checks must not. This file therefore READS that
// declaration out of that file's source text with the pattern below, and holds no copy of the value.
// A second spelling is a second source of truth wearing the costume of a constant, and it is exactly
// the drift class this phase has been fighting. `scripts/verify-workflows.mjs`'s Invariant B asserts
// all of it: that the declaration matches this pattern, that this file carries this pattern's source
// text verbatim, and that this file contains no copy of the value.
//
// ⚠ AN UNREADABLE PREFIX IS A HARD STOP, NOT A DEGRADED SCAN. There is no default and no fallback:
// an empty prefix matches every variable or none, and either is a green that means nothing.
//
// ⚠ THIS FILE PRINTS VARIABLE NAMES AND NEVER VARIABLE VALUES. A credential echoed into a build log
// is a wider disclosure than the send this control exists to prevent.
//
// Usage:  node scripts/refuse-mail-credential.mjs [prefix-source-path]
// The optional argument overrides where the prefix declaration is read from. It exists ONLY for
// `tests/design/mail-credential-refusal.test.ts`'s missing-declaration case; `ci.yml` invokes this
// script with no arguments, and Invariant A asserts that.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The seam between D-14's two halves, spelled identically here and in `scripts/verify-workflows.mjs`.
 * `\r\n` is normalised out of the source before matching because `.gitattributes` declares
 * `* text=auto`, so a checkout with `core.autocrlf=true` presents CRLF bytes for a file committed LF
 * and the `;$` anchor would otherwise miss on Windows.
 */
const MAIL_KEY_PREFIX_DECL = /^const MAIL_KEY_PREFIX = "([A-Z_]+)";$/m;

// Resolved relative to THIS file, not to the working directory, so the step's `working-directory`
// (or a developer's shell) can never change which file the prefix comes from.
const prefixSource = process.argv[2] ?? fileURLToPath(new URL("./verify-workflows.mjs", import.meta.url));

let sourceText;
try {
  sourceText = readFileSync(prefixSource, "utf8").replace(/\r\n/g, "\n");
} catch (error) {
  console.log(`::error::Could not READ the mail-provider prefix source at ${prefixSource}: ${error.message}`);
  console.log("::error::This refusal has no default and no fallback — it scans for a prefix it read,");
  console.log("::error::or it does not run at all. Restore the file, or fix the path in ci.yml.");
  process.exit(1);
}

const declaration = MAIL_KEY_PREFIX_DECL.exec(sourceText);
const prefix = declaration?.[1] ?? "";
if (!prefix) {
  console.log(`::error::Could not PARSE the mail-provider prefix out of ${prefixSource}.`);
  console.log(`::error::Pattern: ${MAIL_KEY_PREFIX_DECL.source}`);
  console.log("::error::The declaration moved or was reformatted. An empty prefix matches every");
  console.log("::error::variable or none, and both are a green that means nothing — so this is a");
  console.log("::error::hard stop, not a scan for the empty string. Restore the declaration's shape.");
  process.exit(1);
}

const names = Object.keys(process.env);
const hits = names.filter((name) => name.startsWith(prefix)).sort();

if (hits.length > 0) {
  console.log("::error::A live mail credential is present in this job's REAL PROCESS ENVIRONMENT —");
  console.log("::error::not merely in the workflow's `env:` maps. A container-level `env:` block, a");
  console.log("::error::repository or environment secret, or a runner variable all reach here.");
  console.log(`::error::Offending variable NAME(s): ${hits.join(", ")}  (values deliberately not printed)`);
  console.log("::error::A full e2e suite run with it set was MEASURED at FOURTEEN real outbound sends");
  console.log("::error::per run (finding [17-D28]): src/lib/email.ts binds its client at module load,");
  console.log("::error::so for this provider THE KEY IS THE SWITCH.");
  console.log("::error::Fix: remove it from the job, container or repository environment.");
  console.log("::error::Do NOT weaken this check — it is the only half of D-14 that can see this.");
  process.exit(1);
}

console.log(
  `refuse-mail-credential: prefix=${prefix} read from ${prefixSource} — ` +
    `scanned ${names.length} environment variable name(s), 0 begin with it.`,
);
process.exit(0);
