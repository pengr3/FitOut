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
// ⚠ THIS SCRIPT TAKES NO ARGUMENTS AND REFUSES ANY (review finding CR-01, 2026-09-04, second round).
// It previously accepted an optional prefix-source path as `argv[2]`, for the design test's benefit.
// 19-VERIFICATION.md measured what that bought an attacker: with a provider-named variable live in
// the environment, passing a decoy source exited 0 and reported a CLEAN SCAN — and `ci.yml` could
// carry the same appended argument with every workflow invariant still green. A test-only escape
// hatch that the thing being guarded against can also use is not a harness, it is the hole. The
// argument is REMOVED rather than gated, and the prefix source is derived solely from this file's own
// location, so no input can redirect what this control reads.
//
// Usage:  node scripts/refuse-mail-credential.mjs
// TWO THINGS ENFORCE THAT, AND THIS COMMENT NAMES ONLY WHAT EXISTS BESIDE IT:
//   - `scripts/verify-workflows.mjs`'s Invariant A compares `gate-e2e`'s refusal step's `run:` for
//     EXACT equality with `node scripts/refuse-mail-credential.mjs` after `trim()`. The superseded
//     conjunct asked whether the `run:` string CONTAINED this path, which every argument list in the
//     world satisfies; the exact comparison is what turns an appended argument red.
//   - `tests/design/mail-credential-refusal.test.ts` cases 7 and 8 spawn this script WITH an argument
//     and assert exit 1 — case 8 being the measured fail-open verbatim. That suite runs inside
//     `npm run build`, so the refusal below is re-proven on every build.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// THE ARGUMENT REFUSAL, BEFORE ANY FILE OR ENVIRONMENT READ. Nothing this script does is safe to do
// on behalf of a caller who thinks it is configurable, so the refusal precedes the configuration.
if (process.argv.length > 2) {
  console.log("::error::This script takes NO ARGUMENTS, and refuses to run with any.");
  // THE COUNT IS THE DIAGNOSTIC; THE CONTENT IS NOT (review finding WR-04, 2026-09-05). This line
  // used to echo the received argument strings back into the log. `argv` is unfiltered
  // caller-controlled content and this script is invoked by hand as well as by the workflow: a
  // developer probing the control by pasting a credential as an argument got it printed back framed
  // as a workflow error annotation. The rule this file states about itself at its lines 40-41 binds
  // `argv` exactly as it binds the environment, and it did not stop applying twenty-eight lines down.
  console.log(`::error::Received ${process.argv.length - 2} argument(s). Their VALUES are deliberately`);
  console.log("::error::not echoed — the rule this file states about variable values binds argv too.");
  console.log("::error::Its mail-provider prefix is resolved from this script's OWN location and");
  console.log("::error::cannot be redirected by input. The override this replaces was MEASURED as a");
  console.log("::error::fail-open: a decoy prefix source scanned for a prefix of the editor's choosing");
  console.log("::error::reported CLEAN while a provider-named variable was live in the environment");
  console.log("::error::(19-VERIFICATION.md, review finding CR-01).");
  console.log("::error::Fix: remove the argument. Never restore the override.");
  process.exit(1);
}

/**
 * The seam between D-14's two halves, spelled identically here and in `scripts/verify-workflows.mjs`.
 * `\r\n` is normalised out of the source before matching because `.gitattributes` declares
 * `* text=auto`, so a checkout with `core.autocrlf=true` presents CRLF bytes for a file committed LF
 * and the `;$` anchor would otherwise miss on Windows.
 */
const MAIL_KEY_PREFIX_DECL = /^const MAIL_KEY_PREFIX = "([A-Z_]+)";$/m;

// Resolved relative to THIS file, not to the working directory and not to any argument, so neither
// the step's `working-directory`, nor a developer's shell, nor an edit to `ci.yml`'s `run:` string can
// change which file the prefix comes from. This is DERIVED, never CHOSEN — a configuration knob that
// can redirect a security control's input is a modeling decision wearing a flag's costume.
const prefixSource = fileURLToPath(new URL("./verify-workflows.mjs", import.meta.url));

let sourceText;
try {
  sourceText = readFileSync(prefixSource, "utf8").replace(/\r\n/g, "\n");
} catch (error) {
  console.log(`::error::Could not READ the mail-provider prefix source at ${prefixSource}: ${error.message}`);
  console.log("::error::This refusal has no default and no fallback — it scans for a prefix it read,");
  console.log("::error::or it does not run at all. The path is derived from this script's own location");
  console.log("::error::and cannot be overridden, so the fix is to restore that sibling file.");
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
  // WHAT THIS SCAN GENUINELY ADDS OVER THE PARSE HALF, AND WHAT IT CANNOT SEE (review finding
  // WR-03, 2026-09-05). The superseded wording named repository and environment secrets as inputs
  // that "reach here". They do not: a secret never populates a step's process environment on its
  // own. It is reachable ONLY through an Actions expression interpolated into an `env:` or `with:`
  // map — which is precisely the input the sentence claims this is not limited to, and precisely
  // the input the parse half already rejects the whole file for. That was a coverage claim the code
  // beside it does not implement, in the file whose header spends twenty lines on why that is worse
  // than no control. The two classes below are the true ones, and are what
  // `scripts/verify-workflows.mjs`'s own header says, correctly, one file over.
  console.log("::error::A live mail credential is present in this job's REAL PROCESS ENVIRONMENT —");
  console.log("::error::not merely in the workflow's `env:` maps. A `container.env` block or a runner");
  console.log("::error::variable reaches here and is invisible to the parse half.");
  console.log("::error::⚠ A SECRET MAPPED UNDER A NON-PROVIDER-PREFIXED KEY IS INVISIBLE TO BOTH HALVES:");
  console.log("::error::both key off the NAME. `verify-workflows.mjs`'s zero-`secrets.`-in-any-value");
  console.log("::error::invariant is what covers that case — a different assertion, in a different file.");
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
