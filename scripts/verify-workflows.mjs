#!/usr/bin/env node
// ============================================================================================
// verify-workflows — ASSERT THE SECURITY PROPERTIES OF BOTH WORKFLOW FILES, AND THE INVARIANTS
// THAT EXIST ONLY BETWEEN THEM, BY PARSING THEIR YAML RATHER THAN GREPPING IT.
//
// ── WHY THIS FILE EXISTS, AND WHY IT IS NOT A GREP ──────────────────────────────────────────────
// `.github/workflows/baselines.yml` holds `contents: write` and executes the only
// `--update-snapshots` in the repository. Its own header records a measurement, re-run against that
// file on 2026-08-17: a whole-file SUBSTRING check over its seven load-bearing tokens was GREEN for
// SIX OF SIX real mutations —
//
//     drop `github.event_name` from the concurrency group ....... substring GREEN
//     delete the whole `--update-snapshots` step ................ substring GREEN
//     drop `--ipc=host` from the container options .............. substring GREEN
//     job permissions `contents: write` -> `read` ............... substring GREEN
//     the image tag -> an unpinned floating one ................. substring GREEN
//     ADD a `push:` trigger beside `workflow_dispatch` ......... substring GREEN
//
// — because that file argues for every one of its invariants at length in prose, so the better it is
// documented the more vacuous a text search over it becomes. The last row is the most dangerous edit
// anyone could make here: a `push:` trigger turns the one job that can write baselines into a job
// that rewrites them on every commit, i.e. the gate regenerating itself.
//
// THE MIRROR FAILURE WAS MEASURED TOO, and it matters because the fix looks like a bug. A naive
// PROHIBITION spelled the same way — "the string `secrets.` appears nowhere in this file" — reports
// RED against the CORRECT file, because the paragraph forbidding credentials necessarily names the
// thing it forbids. Substring checks are wrong in both directions on a documented file: falsely
// green for requirements, falsely red for prohibitions.
//
// So this checker parses. Comments are gone before it looks, and the prohibition below is asserted
// over `env`, `run` and `with` VALUES only — which is where a credential could actually live.
// `grep -c "secrets\." baselines.yml` being non-zero is therefore EXPECTED and not a finding.
//
// ── WHY IT NOW COVERS TWO FILES, AND WHY IT WAS RENAMED RATHER THAN CLONED (plan 12-15) ─────────
// Until 12-15 this script was `verify-baselines-workflow.mjs` and had two holes:
//
//   1. IT COULD NOT SEE `ci.yml` AT ALL — the file that actually gates every push. `ci.yml`'s own
//      header records SIX-OF-SIX substring vacuity for its job-3 tokens, including the
//      service-label-to-`localhost` swap, which is the single most likely mis-edit of a container
//      job that talks to a service container.
//   2. NOTHING RAN IT. The most dangerous file in the repository was guarded by a script that
//      executed only when a human remembered to type it. `ci.yml`'s `gate-db-free` now runs this
//      script on every push and pull request, so an added `push:` trigger on `baselines.yml` fails
//      `ci` instead of waiting to be noticed.
//
// A checker NAMED for one file that asserts invariants of two is the same defect class this
// repository keeps recording — a file that misstates its own subject. Hence the rename, and hence
// the third section: the cross-file invariants belong to NEITHER file alone. The compared tree is
// the captured tree only if `ci.yml`'s visual job and `baselines.yml`'s visual job migrate and seed
// identically, and no assertion living inside one file can say that.
//
// ── THE THREE SECTIONS ──────────────────────────────────────────────────────────────────────────
//   baselines   the invariants of `.github/workflows/baselines.yml` (the WRITE path)
//   ci          the invariants of `.github/workflows/ci.yml` (the COMPARE path)
//   cross       the invariants that only exist BETWEEN the two files
//
// A SELECTED SECTION THAT REGISTERS ZERO INVARIANTS IS A HARD STOP. So is an unknown section name.
// A checker that reports success after checking nothing is worse than one that fails, because the
// green is indistinguishable from a real one — the same law as the vacuity table above, one layer up.
//
// ── IT PRINTS WHAT IT CHECKED ───────────────────────────────────────────────────────────────────
// Every assertion echoes the parsed value it read. A checker that prints only PASS/FAIL asks you to
// trust it; one that prints `triggers=[workflow_dispatch]` hands you the evidence.
//
// Usage:  node scripts/verify-workflows.mjs
//         node scripts/verify-workflows.mjs --section=baselines
//         node scripts/verify-workflows.mjs --section=ci --section=cross
//
// Exit codes:
//   0  every selected invariant holds
//   1  an invariant FAILED, or a hard stop fired (a job every assertion depends on is absent, an
//      unknown section was named, or a selected section registered zero invariants)
//   3  THE PARSER COULD NOT LOAD. NOT an invariant failure — see the note on `yaml` below.
// ============================================================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
// Invariant B (plan 19-12) reads THIS file's own source text, to assert its prefix declaration still
// matches the pattern the runtime half reads it with. Resolved from `import.meta.url` rather than
// from the working directory, for the same reason the refusal script resolves its source that way.
import { fileURLToPath } from "node:url";

const WORKFLOW_DIR = ".github/workflows";
const BASELINES = `${WORKFLOW_DIR}/baselines.yml`;
const CI = `${WORKFLOW_DIR}/ci.yml`;
const BASELINES_JOB = "generate-baselines";
const CI_VISUAL_JOB = "gate-visual";

// THE TWO BRANCHES `ci.yml`'s PUSH TRIGGER MUST REACH (plan 19.1-06, review finding CR-01).
//   * `CI_DEV_BRANCH` is where work lands day to day — the branch a developer's push is on.
//   * `CI_DEFAULT_BRANCH` is the branch plan 15's ruleset protects. A required status check can only
//     be required on a branch the workflow actually runs on, so dropping this one name from the push
//     filter detaches EVERY gate in this file from the branch the whole ruleset is about, while
//     leaving `push` present, filtered, and perfectly plausible in review.
// They are spelled here, once, because the push filter's PROPERTY is which branches it reaches; a
// literal in the predicate would be a second source of truth for a value the file's own `on:` block
// already carries.
const CI_DEV_BRANCH = "dev";
const CI_DEFAULT_BRANCH = "main";

// THE FUNCTIONAL-SUITE JOB, AND THE DISPLAY NAME BRANCH PROTECTION MATCHES ON (plan 19-08, D-15,
// T-19-40). Two spellings, deliberately, because they are two different things:
//   * `CI_E2E_JOB` is the YAML job KEY. Its absence is a hard stop below.
//   * `CI_E2E_CONTEXT` is the job's `name:` — the string a REQUIRED STATUS CHECK is matched by.
// GitHub matches a required check by its display name, not by the job key, so an edit to `name:`
// alone silently detaches the gate from branch protection while every other invariant in this file
// still holds. That is T-19-40's quieter half and it is why the name is asserted, not just the key.
const CI_E2E_JOB = "gate-e2e";
const CI_E2E_CONTEXT = "gate-e2e (functional Playwright suite)";

// THE JOB THAT RUNS THIS SCRIPT, AND THE DISPLAY NAME BRANCH PROTECTION MATCHES ON (plan 19.1-01,
// CI-01/SC1, review finding CR-03). The same two spellings as the pair above, deliberately, and for
// the same two reasons:
//   * `CI_CHECKER_JOB` is the YAML job KEY. Its absence is a hard stop below.
//   * `CI_CHECKER_CONTEXT` is the job's `name:` — the string a REQUIRED STATUS CHECK is matched by.
// GitHub matches a required check by its display name and not by the job key, so an edit to `name:`
// alone silently unbinds this job from branch protection while leaving the job — and every other
// invariant in this file — perfectly intact.
//
// ⚠ THIS IS THE JOB THAT EXECUTES THE FILE YOU ARE READING, AND UNTIL THIS PLAN NOTHING READ IT.
// Measured twice, by the reviewer and independently by the verifier (CR-03): delete the two-line
// step named below from `gate-db-free`, run this script, and it printed `All 50 invariants hold`
// and exited 0. Every other invariant in this file was enforced by a step whose existence nothing
// asserted — so the whole file's signal was conditional on a two-line edit nobody would be told
// about. That is the same vacuity class as a deleted job, one layer further out: the assertions
// were not wrong, they were never going to run.
const CI_CHECKER_JOB = "gate-db-free";
const CI_CHECKER_CONTEXT = "gate-db-free (lint + design + build + workflow parse)";
const CHECKER_STEP_NAME = "Verify the workflow invariants (parse, not grep)";

// This script's own path, spelled ONCE, and the EXACT invocation that step must carry — composed
// from the path exactly as `MAIL_REFUSAL_RUN` is composed below, so the path is spelled once here
// too.
//
// ⚠ THE INVARIANT COMPARES THE STEP'S `run:` AGAINST THIS FOR EQUALITY AND NEVER FOR CONTAINMENT,
// and that is the whole of the conjunct's value. `run` is a PERMITTED key on that step, so the
// allow-list below sees the step's key SET and not its values, and is blind to an appended argument
// BY CONSTRUCTION. Only an exact comparison puts `node scripts/verify-workflows.mjs` and
// `node scripts/verify-workflows.mjs <anything>` on opposite sides. A containment test — which every
// argument list in the world satisfies — is review finding WR-01, and writing this one that way
// would ship that defect in a new place on the day it is being closed in the old one.
const CHECKER_SCRIPT = "scripts/verify-workflows.mjs";
const CHECKER_RUN = `node ${CHECKER_SCRIPT}`;

// THE CHECKER STEP'S PERMITTED KEY SURFACE, STATED POSITIVELY. Identical in shape and in argument to
// `MAIL_STEP_ALLOWED_KEYS` below — see the "THIS IS AN ALLOW-LIST AND NOT A DENY-LIST" block there,
// which transfers to this step unchanged and is not restated at length here. Only these two keys may
// appear on the step that runs this script. A `shell:` that prints it instead of executing it, a
// `working-directory:` that points it at a different tree, an `if:` that skips it, a
// `continue-on-error:` that makes its non-zero exit advisory — each is a change to HOW this gate
// executes rather than to what it says, and each is red by default here rather than red only if
// somebody had already thought of it.
const CHECKER_STEP_ALLOWED_KEYS = ["name", "run"];

// ── THE OTHER LOAD-BEARING STEP OF THE SAME JOB (plan 19.1-05, CI-01/SC1) ──────────────────────
// `gate-db-free` has exactly two steps that carry a gate. The pair above is the one that runs THIS
// script. This pair is the one that runs `npm run build` — which is lint, the whole design suite and
// the Next build in one command.
//
// ⚠ WHY THIS STEP IS NOT A LESSER SUBJECT THAN THE ONE ABOVE. `npm run build` is what executes
// `tests/design/workflow-invariants.test.ts` — the standing mutation suite that holds every case
// this phase has written, including the ones that protect the check above. Delete or soften this
// step and the instrument that remembers all of it stops running, while the checker it protects
// keeps printing a clean green. Measured, not supposed (evidence/guards-05-pre-fix.txt, MUTATIONS 5
// and 6): appending an argument to this step's `run:`, and adding a condition key to the step, EACH
// left the checker at exit 0 with all 52 invariants reported holding.
//
// ⚠ AND THE ONE THING THAT DID GO RED HERE IS NOT COVERAGE — READ THIS BEFORE ASSUMING IT IS.
// Deleting the step outright is already caught, by `the job that runs \`npm run build\` exists and
// declares NO services: (T-11-DBFREE)` further up. That predicate locates its subject with
// `r.includes("npm run build")` over every job's run commands — the CR-02 substring-anchor idiom —
// and its subject is the DB-free property, not this step. It says nothing about the step's `name:`,
// nothing about its exact invocation and nothing about its key surface, and it is satisfied by
// every softened form of the step. It is a red that arrives by accident, and an accident is not an
// invariant.
const BUILD_STEP_NAME = "Build (lint + design gate + next build)";
const BUILD_RUN = "npm run build";

// THE BUILD STEP'S PERMITTED KEY SURFACE — SEPARATE FROM `CHECKER_STEP_ALLOWED_KEYS`, AND THE
// SEPARATION IS THE POINT. The two lists differ by EXACTLY ONE key: this step declares an `env:`
// map (three build-only placeholders, documented at length at its site in `ci.yml`) and the checker
// step declares none.
//
// ⚠ DO NOT MERGE THEM INTO ONE CONSTANT. A single shared list admitting `env` would silently permit
// an environment map on the step whose ENTIRE property is that it takes none — and an `env:` on the
// checker step is how somebody hands this script a different environment to run under. Two lists is
// not duplication; it is the one-key difference being stated rather than averaged away.
const BUILD_STEP_ALLOWED_KEYS = ["env", "name", "run"];

// ── THE JOB LEVEL, STATED POSITIVELY (19.1-REVIEW.md CR-01) ────────────────────────────────────
// THE TWO LISTS ABOVE ARE ABOUT STEPS. These two are the same rule one level OUT, on the JOB, and
// they exist because the job level was the one place in this file the rule was never applied.
//
// WHAT WAS THERE BEFORE, AND WHY IT WAS NOT ENOUGH. The two `is unconditional` invariants below
// enumerate exactly two job keys — `if:` and `continue-on-error:` — and their printed name is the
// broad claim that the job "is unconditional". An enumeration of two against an open set is the
// shape this file has already rejected three times in writing: `MAIL_STEP_ALLOWED_KEYS`,
// `CHECKER_STEP_ALLOWED_KEYS` and `BUILD_STEP_ALLOWED_KEYS` are all allow-lists, and
// `PUSH_FILTER_ALLOWED_KEYS` was added THIS PHASE for the same reason ("the modifier surface is an
// open set"). The job level was the exception, and two one-line edits walked straight through it.
//
// MEASURED, NOT SUPPOSED (evidence/guards-review-cr01-wr04-pre-fix.txt, four vectors, each against
// the tracked tree, each `exit 0` with `All 55 invariants hold`):
//   * `needs: [gate-e2e]` on `gate-db-free`. THE FALSE-GREEN ONE. `gate-e2e` is red today, so the
//     job SKIPS — and GitHub's required-status-check evaluation treats a skipped job as PASSING
//     (this is the documented reason the `always()` aggregator idiom exists). The required check
//     for this repository would go green over a job that ran neither lint, nor the design suite,
//     nor the build, nor this script.
//   * `strategy: { matrix: … }` on `gate-db-free`. THE FAIL-CLOSED ONE, and still a defeat: the
//     runtime check context becomes `…(1)` / `…(2)`, so the display-name invariant below stays
//     green over a `name:` that at runtime matches NO check at all. It is byte-unchanged, which is
//     exactly why that invariant cannot see this.
//   * the same two on `gate-e2e`.
//
// ⚠ THE DENY DIRECTION IS NOT ENUMERATED HERE ON PURPOSE, and the keys these lists exclude are
// worth naming once so the next reader does not have to re-derive them: `needs:` and `if:` stop the
// job running, `strategy:` renames the check context, `continue-on-error:` makes its failure
// advisory, `environment:` can park it awaiting a manual approval, `concurrency:` can cancel it
// mid-run, and `uses:`/`with:`/`secrets:` replace the job's entire body with a call to another
// workflow while the `name:` stays put. That list is not the predicate — it is a list of the ones
// thought of today, which is precisely what an allow-list exists so as not to depend on.
//
// ⚠ TWO CONSTANTS, DIFFERING BY EXACTLY ONE KEY, FOR THE REASON THE STEP PAIR ABOVE IS TWO. The
// one key is `services`, and the difference is substantive rather than incidental: `gate-db-free`
// is the DB-FREE job — its whole property is that it provisions no database — and a merged list
// would permit a `services:` block on the one job in this file that must never carry one. (That
// property is also asserted directly further up, by `the job that runs \`npm run build\` exists and
// declares NO services:`. Two invariants reddening on the same edit is not duplication when they
// are about different things; each case below asserts the FAIL line it means BY NAME.)
//
// `timeout-minutes` is PERMITTED on both, and it is the deliberate green control for these lists.
// An allow-list with no legitimate key in it is a red-only instrument, and a red-only instrument
// gets widened by the first person who hits a false positive. A wall-clock cap is a hardening knob
// that neither skips the job, nor softens its failure, nor renames its check context — `gate-e2e`
// already carries one — so it belongs on the permitted side, and there is a standing case asserting
// that adding one to `gate-db-free` leaves this checker GREEN.
const CHECKER_JOB_ALLOWED_KEYS = ["container", "env", "name", "runs-on", "steps", "timeout-minutes"];
const E2E_JOB_ALLOWED_KEYS = ["container", "env", "name", "runs-on", "services", "steps", "timeout-minutes"];

// The snapshot-update flag, spelled ONCE, here. It is deliberately never spelled in `ci.yml` —
// including in that file's comments — because the cheapest audit of "this file cannot mint a
// baseline" is a grep for the token returning 0, and prose about a forbidden token is still the
// token. That rule binds `ci.yml`, not this script: a checker must name what it counts.
const SNAPSHOT_UPDATE_FLAG = "--update-snapshots";

// The MAIL CREDENTIAL, spelled ONCE, here — and deliberately never in `ci.yml`, for exactly the same
// reason the snapshot flag above is never spelled there: the cheapest audit of "this workflow cannot
// mail real people" is `grep -c RESEND .github/workflows/` returning 0, and prose about a forbidden
// token is still the token. That rule binds the workflow files, not this script: a checker must name
// what it counts.
//
// THIS COMMENT CARRIES A MEASUREMENT, NOT A WARNING (D-14, finding `[17-D28]`). A full e2e suite run
// with this key set was measured at FOURTEEN real outbound sends. `instrumentation.ts` takes PayMongo
// off the wire and DELIBERATELY does not do the same for this origin — `src/lib/email.ts` binds its
// client at module load, so here THE KEY IS THE SWITCH, and mocking the origin would additionally
// suppress the `[email:dev]` console fallback that makes dev sends visible. Nothing but the assertion
// below stands between an unrelated secret addition and mail to real addresses on every pull request.
const MAIL_KEY = "RESEND_API_KEY";
const MAIL_KEY_PREFIX = "RESEND";

// THE SEAM BETWEEN D-14'S TWO HALVES, AND THE REASON IT IS A PATTERN RATHER THAN A SHARED IMPORT
// (plan 19-12). `scripts/refuse-mail-credential.mjs` is the RUNTIME half: it runs inside `gate-e2e`'s
// container and reads the declaration above out of THIS FILE'S SOURCE TEXT with exactly the pattern
// below, so the prefix is spelled once and READ twice instead of being spelled twice. A copied
// literal there would be a second source of truth wearing the costume of a constant — the drift class
// this phase has spent three plans on. Invariants A/B/C below assert the pattern against the
// declaration, the declaration against the script that reads it, and the script against a copy, so
// neither half can move without a NAMED red rather than a silent divergence.
const MAIL_KEY_PREFIX_DECL = /^const MAIL_KEY_PREFIX = "([A-Z_]+)";$/m;
const MAIL_REFUSAL_SCRIPT = "scripts/refuse-mail-credential.mjs";
// The EXACT invocation `ci.yml`'s refusal step must carry — composed from the constant above so the
// path is spelled once here too. Invariant A compares the step's `run:` against this for equality
// rather than containment, which is what makes an appended argument red (review finding CR-01,
// second round).
const MAIL_REFUSAL_RUN = `node ${MAIL_REFUSAL_SCRIPT}`;
const CI_E2E_MAIL_STEP = "Refuse to run the suite with a live mail credential in the environment";

// THE STEPS EVERY ORDERING CLAIM IN THIS FILE IS ABOUT, NAMED (plan 19.1-06, review finding CR-02
// and RESEARCH.md inventory rows 5 and 6). Until this plan the ordering predicates found these
// steps by SEARCHING EVERY `run:` BODY IN THE JOB for a substring — `db:seed`, `db:migrate`,
// `playwright test`, `--project=visual`, the refusal script's path. A `run:` body is FREE TEXT
// written by whoever edits the workflow, so that made an attacker-controlled string the thing that
// decides which step a positive assertion is about.
//
// ⚠ ALL FOUR VECTORS BELOW WERE MEASURED GREEN ON THE TRACKED FILE (evidence/guards-06-pre-fix.txt):
//   * a decoy `echo` mentioning the refusal script, with the REAL refusal step moved to LAST —
//     exit 0, all 55 holding, while the only control protecting the current run fired after the
//     whole suite had already sent its mail;
//   * a decoy mentioning `npm run db:seed`, with the REAL seed moved after the suite — exit 0, all
//     55 holding, and the suite runs against an empty catalogue (RESEARCH.md row 5, which the
//     research flagged NOT YET REPRODUCED; it reproduces);
//   * the same shape in `gate-visual` — the ordering invariant that names the property went GREEN;
//     the only red came from an unrelated `cross` check, by accident, for a different property;
//   * a decoy mentioning `--project=visual` with the REAL step switched to `--project=chromium` —
//     exit 0, ALL 55 HOLDING, including the invariant printed as "runs the visual project BY NAME".
//     GATE-01's comparison never ran, and the checker said the file was fine.
//
// So each of these steps is now anchored ONCE, by its EXACT `name:`, and every predicate about it
// derives from the resulting object. That is 19.1-PATTERNS.md §F, applied to the sites it was
// written about rather than only to the new ones.
const CI_E2E_MIGRATE_STEP = "Migrate the database";
const CI_E2E_SEED_STEP = "Seed the demo catalogue";
const CI_E2E_PLAYWRIGHT_STEP = "Playwright — the functional suite";
const CI_E2E_PROJECT = "--project=chromium";
const CI_VISUAL_MIGRATE_STEP = "Migrate the database";
const CI_VISUAL_SEED_STEP = "Seed the baseline fixtures";
const CI_VISUAL_PLAYWRIGHT_STEP = "Playwright — visual regression (GATE-01)";
const CI_VISUAL_PROJECT = "--project=visual";

// THE SAME TREATMENT FOR `baselines.yml`'s JOB (plan 19.1-06, audit rows 11 and 12 — two sites the
// research inventory did not list, found by scanning the file for the shape rather than by working
// the list). Both reproduced, both are repaired, and both are why the audit was a scan and not a
// walk of ten known rows.
//
// ⚠ THEY ARE SEPARATE CONSTANTS FROM THE `gate-visual` ONES ABOVE EVEN THOUGH TWO OF THE FOUR
// STRINGS ARE CURRENTLY IDENTICAL. The two jobs live in DIFFERENT FILES and can be renamed
// independently; merging them would make a rename in one file silently redefine what the checker
// looks for in the other. That is the same argument this file already makes for keeping a job KEY
// and a job `name:` as two constants.
const BASELINES_MIGRATE_STEP = "Migrate the database";
const BASELINES_SEED_STEP = "Seed the baseline fixtures";
const BASELINES_STAGE_STEP = "Stage the regenerated baselines";
const BASELINES_STAGE_GLOB = 'git add -- "*-visual-linux.png"';

// THE REFUSAL STEP'S PERMITTED KEY SURFACE, STATED POSITIVELY (review finding CR-01, third round).
// Only these two keys may appear on that step. Anything else — an override of the interpreter its
// `run:` body is handed to, a working directory, a per-step timeout, or an Actions attribute nobody
// here has heard of — is a change to HOW the step executes, and a change to how a gate executes is a
// decision to record, not one to absorb.
//
// ⚠ THIS IS AN ALLOW-LIST AND NOT A DENY-LIST, AND THAT IS THE WHOLE POINT. The failure class is "an
// attribute the checker does not know about", and a deny-list can only ever name the ones it already
// knows. The attack surface is every key the platform accepts times every value form each key
// permits — an open set — so enumerating against it loses by construction. Three consecutive
// verification rounds each found one more key or one more spelling; the fourth was going to as well.
// Stating what is PERMITTED makes the unknown red by default, which is the only shape that closes an
// open set.
const MAIL_STEP_ALLOWED_KEYS = ["name", "run"];

const ALL_SECTIONS = ["baselines", "ci", "cross"];

// ── ARGUMENTS ───────────────────────────────────────────────────────────────────────────────────
const requested = [];
for (const arg of process.argv.slice(2)) {
  const m = /^--section=(.*)$/.exec(arg);
  if (!m) {
    console.error(`FATAL: unrecognised argument "${arg}".`);
    console.error(`Usage: node scripts/verify-workflows.mjs [--section=${ALL_SECTIONS.join("|")}]…`);
    process.exit(1);
  }
  requested.push(m[1]);
}
const unknown = requested.filter((s) => !ALL_SECTIONS.includes(s));
if (unknown.length > 0) {
  console.error(`FATAL: unknown section(s) [${unknown.join(", ")}].`);
  console.error(`Known sections: ${ALL_SECTIONS.join(", ")}.`);
  console.error(
    `A misspelled section must not run zero checks and exit 0 — that green would be a lie, and`,
  );
  console.error(`indistinguishable from a real one. Hard stop.`);
  process.exit(1);
}
const sections = requested.length > 0 ? ALL_SECTIONS.filter((s) => requested.includes(s)) : ALL_SECTIONS;

// ── THE PARSER ITSELF, LOADED SO THAT "IT COULD NOT LOAD" IS NEVER READ AS "AN INVARIANT BROKE" ──
// `yaml` (2.9.0) is present TRANSITIVELY in node_modules and is NOT a declared devDependency.
// `ci.yml`'s header records why: promoting it is a dependency decision, which is a checkpoint, not a
// side effect. This script runs ON THE CI PATH, so the day a hoisting change makes the module
// unresolvable, the failure must be legible in one line — otherwise a security gate turns into noise
// and somebody deletes the step. THE FIX FOR THIS DIAGNOSTIC IS A DEPENDENCY DECISION TO RAISE,
// NEVER THE DELETION OF THE STEP THAT RUNS THIS SCRIPT.
let parse;
try {
  ({ parse } = await import("yaml"));
} catch (cause) {
  console.error("════════════════════════════════════════════════════════════════════════════════");
  console.error("FATAL: THE PARSER COULD NOT LOAD. THIS IS *NOT* AN INVARIANT FAILURE.");
  console.error("════════════════════════════════════════════════════════════════════════════════");
  console.error(`  missing module   yaml`);
  console.error(`  resolver said    ${cause?.message ?? String(cause)}`);
  console.error("");
  console.error("  `yaml` is relied upon TRANSITIVELY and is not a declared devDependency.");
  console.error("  Nothing about the workflows has been checked, in either direction.");
  console.error("");
  console.error("  THE FIX IS A DEPENDENCY DECISION TO RAISE (add `yaml` to devDependencies),");
  console.error("  NEVER the deletion of the CI step that runs this script.");
  process.exit(3);
}

// ── SHARED HELPERS ──────────────────────────────────────────────────────────────────────────────
const docCache = new Map();
function workflow(path) {
  if (docCache.has(path)) return docCache.get(path);
  if (!existsSync(path)) {
    console.error(`FATAL: ${path} does not exist. Every assertion over it is vacuous without it.`);
    process.exit(1);
  }
  const doc = parse(readFileSync(path, "utf8"));
  docCache.set(path, doc);
  return doc;
}

const jobsOf = (doc) => Object.entries(doc?.jobs ?? {});
const stepsOf = (job) => (Array.isArray(job?.steps) ? job.steps : []);
const runsOf = (job) => stepsOf(job).filter((s) => typeof s?.run === "string").map((s) => s.run);

/**
 * THE ONE WAY A POSITIVE ASSERTION IN THIS FILE MAY IDENTIFY A STEP (19.1-PATTERNS.md §F).
 * Exact equality over the parsed `name:` scalar — not containment, not a regex, not a search over
 * `run:` bodies. `name:` is a LABEL a reviewer reads in the diff; `run:` is free text, and letting
 * free text decide which step an assertion is about hands the choice to whoever wrote it.
 *
 * ⚠ `stepIndexNamed` RETURNS A POSITION IN THE FULL STEP LIST, NOT IN `runsOf(job)`. Those are two
 * different scales and mixing them is its own defect: `runsOf` filters out `uses:` steps, so an
 * index taken from it silently ignores every action in the job. Review finding WR-05 was exactly
 * that mistake, one predicate over. Every ordering comparison below is on the FULL-step scale, so
 * the numbers printed in the evidence lines are comparable to each other and to what a reader sees
 * in the file.
 *
 * Both return the ABSENT answer (`undefined` / `-1`) for a missing step rather than throwing, so
 * the conjuncts that use them must test for it explicitly — an ordering claim over an absent step
 * must be FALSE, never vacuous.
 */
const stepNamed = (job, name) => stepsOf(job).find((s) => String(s?.name ?? "") === name);
const stepIndexNamed = (job, name) =>
  stepsOf(job).findIndex((s) => String(s?.name ?? "") === name);
/** The trimmed `run:` body of a step, or "" when the step is absent or carries none. */
const runOfStep = (step) => String(step?.run ?? "").trim();
/**
 * THE TRIGGER NAMES, FOR ALL THREE DOCUMENTED SPELLINGS OF `on:` (review finding WR-02).
 * docs.github.com, "Workflow syntax for GitHub Actions → on", permits exactly three forms and they
 * are semantically identical in the only respect this file asserts on — WHICH EVENTS START A RUN:
 *
 *   on: push                         SCALAR    → ["push"]
 *   on: [push, pull_request]         SEQUENCE  → ["push", "pull_request"]      ← the one that was missing
 *   on:                              MAPPING   → ["push", "pull_request"]
 *     push:
 *       branches: [dev, main]
 *     pull_request:
 *
 * ⚠ WHY THE MISSING FORM WAS WORSE THAN A GAP, AND THE MEASUREMENT THAT BOUGHT THIS (evidence/
 * guards-06-pre-fix.txt, VECTOR WR-02). `Object.keys` over an ARRAY returns its INDICES, so the
 * sequence spelling used to yield `["0", "1"]` and the membership conjunct below failed: a CORRECT
 * file, RED, for a reason that has nothing to do with its content. That is not a missed catch, it is
 * the failure mode that gets a check DELETED rather than repaired — and it would have arrived on the
 * day somebody rewrote this block in a form the platform documents. An UNHANDLED SPELLING IS A FALSE
 * RED, and a false red costs more than the true red it was standing in for.
 *
 * It is also a PREREQUISITE for the filter conjuncts below rather than an optional tidy: under the
 * sequence spelling every filter is absent, so the filter half would have passed while the
 * membership half failed, and a reader would have diagnosed the wrong conjunct.
 */
const triggersOf = (doc) => {
  const on = doc?.on;
  if (on == null) return [];
  if (typeof on === "string") return [on];
  if (Array.isArray(on)) return on.map((t) => String(t));
  return Object.keys(on);
};

/**
 * The FILTER declared for one trigger, normalised across the same three spellings. The scalar and
 * sequence forms cannot express a filter at all, so both answer `undefined` — which is the honest
 * answer and the one the "unfiltered" conjunct below wants. Only the mapping form can carry one.
 * A trigger that is not present at all also answers `undefined`, so this accessor must NEVER be
 * read without the membership test beside it: absence and unfiltered-presence are the same value
 * here, and telling them apart is `triggersOf`'s job, not this one's.
 */
const triggerFilterOf = (doc, trigger) => {
  const on = doc?.on;
  if (on == null || typeof on === "string" || Array.isArray(on)) return undefined;
  return on?.[trigger];
};

/** `postgres://user:pass@host:port/db` → `host:port`. Returns "" when the shape is unrecognised,
 *  which fails every branch of the addressing rule loudly rather than passing one silently. */
function authorityOf(url) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/?#]+)/i.exec(String(url ?? ""));
  return m ? m[1] : "";
}
const hostOf = (authority) =>
  authority.includes(":") ? authority.slice(0, authority.lastIndexOf(":")) : authority;

/** The prohibition, asserted where a credential could actually live: every `env`, `run` and `with`
 *  VALUE reachable from the parsed tree. Comments do not survive the parse, which is precisely why
 *  the naive whole-file version was measured falsely RED against the correct file. */
function secretHitsIn(doc) {
  const hits = [];
  const scan = (where, value) => {
    if (typeof value === "string" && value.includes("secrets.")) hits.push(where);
  };
  for (const [k, v] of Object.entries(doc?.env ?? {})) scan(`workflow env.${k}`, v);
  for (const [jobName, job] of jobsOf(doc)) {
    for (const [k, v] of Object.entries(job?.env ?? {})) scan(`${jobName}.env.${k}`, v);
    for (const [k, v] of Object.entries(job?.container?.env ?? {}))
      scan(`${jobName}.container.env.${k}`, v);
    for (const [svc, s] of Object.entries(job?.services ?? {})) {
      for (const [k, v] of Object.entries(s?.env ?? {})) scan(`${jobName}.services.${svc}.env.${k}`, v);
    }
    stepsOf(job).forEach((s, i) => {
      const label = s?.name ? `${jobName} step "${s.name}"` : `${jobName} step[${i}]`;
      scan(`${label}.run`, s?.run);
      for (const [k, v] of Object.entries(s?.env ?? {})) scan(`${label}.env.${k}`, v);
      for (const [k, v] of Object.entries(s?.with ?? {})) scan(`${label}.with.${k}`, v);
    });
  }
  return hits;
}

/** The pinned image tag must equal the installed `@playwright/test` version EXACTLY (T-11-VERDRIFT).
 *  Playwright's docs: a mismatch means "Playwright will be unable to locate browser executables." */
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const playwrightVersion = (
  pkg.devDependencies?.["@playwright/test"] ??
  pkg.dependencies?.["@playwright/test"] ??
  ""
).replace(/^[\^~]/, "");
const EXPECTED_IMAGE = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;

// ── REPORTING ───────────────────────────────────────────────────────────────────────────────────
const failures = [];
const counts = new Map(ALL_SECTIONS.map((s) => [s, 0]));
let currentSection = null;

function check(invariant, ok, evidence) {
  counts.set(currentSection, counts.get(currentSection) + 1);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${invariant}\n          ${evidence}`);
  if (!ok) failures.push(`[${currentSection}] ${invariant}`);
}

function banner(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(3, 92 - title.length))}`);
}

/** A hard stop is NOT a failed check. It fires when the subject every following assertion depends on
 *  is absent, so those assertions would be vacuous rather than false. Reported as such, and loudly. */
function hardStop(lines) {
  console.error("");
  console.error("════════════════════════════════════════════════════════════════════════════════");
  console.error("HARD STOP — not a failed check. The subject of the assertions below is ABSENT,");
  console.error("so every one of them would be vacuous. A vacuous green is the failure mode this");
  console.error("whole script exists to remove.");
  console.error("════════════════════════════════════════════════════════════════════════════════");
  for (const line of lines) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`verify-workflows — parse-based invariants over ${WORKFLOW_DIR}/`);
console.log(`sections            ${sections.join(", ")}`);
console.log(`@playwright/test    ${playwrightVersion} (installed)`);
console.log(`expected image      ${EXPECTED_IMAGE}`);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION `baselines` — THE WRITE PATH.
// The ten invariants that shipped in plan 12-14, preserved in BEHAVIOUR. This section widened the
// file; it did not rewrite these.
// ════════════════════════════════════════════════════════════════════════════════════════════════
if (sections.includes("baselines")) {
  currentSection = "baselines";
  const doc = workflow(BASELINES);
  const job = doc?.jobs?.[BASELINES_JOB];
  banner(`baselines — ${BASELINES} (job "${BASELINES_JOB}")`);

  if (!job) {
    hardStop([
      `job "${BASELINES_JOB}" not found in ${BASELINES}.`,
      `Jobs present: [${jobsOf(doc).map(([n]) => n).join(", ") || "(none)"}]`,
    ]);
  }

  // 1. THE TRIGGER LIST IS EXACTLY `workflow_dispatch`.
  // The mutation a substring check could not see. `on:` parses to an object whose KEYS are the
  // triggers, so an added `push:` shows up as a second key — which is why this is a set comparison
  // and not a "does it contain" test.
  const triggers = triggersOf(doc);
  check(
    "the ONLY trigger is workflow_dispatch (no push, no pull_request, no schedule)",
    triggers.length === 1 && triggers[0] === "workflow_dispatch",
    `triggers=[${triggers.join(", ")}]`,
  );

  // 2. WORKFLOW-LEVEL DEFAULT IS READ-ONLY.
  check(
    "workflow-level permissions.contents is 'read'",
    doc?.permissions?.contents === "read",
    `workflow permissions=${JSON.stringify(doc?.permissions ?? null)}`,
  );

  // 3. WRITE IS GRANTED ON THIS ONE JOB, AND ONLY THIS ONE.
  check(
    `job "${BASELINES_JOB}" permissions.contents is 'write'`,
    job?.permissions?.contents === "write",
    `job permissions=${JSON.stringify(job?.permissions ?? null)}`,
  );

  const writeJobs = jobsOf(doc)
    .filter(([, j]) => j?.permissions?.contents === "write")
    .map(([name]) => name);
  check(
    "exactly ONE job in this workflow holds contents: write",
    writeJobs.length === 1 && writeJobs[0] === BASELINES_JOB,
    `jobs with contents:write=[${writeJobs.join(", ")}]`,
  );

  // 4. `github.event_name` STAYS IN THE CONCURRENCY GROUP (T-11-CANCEL).
  // Not cosmetic: ci.yml uses the same workflow+ref group, so without the event term a push to the
  // same ref lands in this job's group and `cancel-in-progress` kills it mid-flight, leaving a
  // PARTIAL baseline set committed — worse than none, because the missing ones fail and the present
  // ones pass and the run reads as a real regression.
  const group = String(doc?.concurrency?.group ?? "");
  check(
    "github.event_name is in the concurrency group",
    group.includes("github.event_name"),
    `concurrency.group=${group || "(absent)"}`,
  );

  // 5. THE IMAGE TAG IS PINNED, AND EQUALS THE INSTALLED PLAYWRIGHT VERSION.
  const image = String(job?.container?.image ?? "");
  check(
    "container image tag is pinned and equals the installed @playwright/test version",
    image === EXPECTED_IMAGE,
    `image=${image || "(absent)"}  expected=${EXPECTED_IMAGE}  (@playwright/test=${playwrightVersion})`,
  );

  // 6. `--ipc=host` SURVIVES.
  // Playwright's documented recommendation for Chromium; without it Chromium can run out of memory
  // and crash, which presents as a flaky test and therefore gets retried instead of fixed.
  const options = String(job?.container?.options ?? "");
  check(
    "container options carry --ipc=host",
    options.includes("--ipc=host"),
    `container.options=${options || "(absent)"}`,
  );

  // 7. EXACTLY ONE RUN COMMAND CARRIES THE SNAPSHOT-UPDATE FLAG.
  // THE NUMBER THAT ACTUALLY MEANS "ONE WRITE PATH", and the one no line-based grep can produce: the
  // workflow's header measures `grep -c` at 6 for this file, five of which are comments explaining
  // the flag. Count the STRUCTURE, not the text.
  const runs = runsOf(job);
  const updateSnapshotRuns = runs.filter((r) => r.includes(SNAPSHOT_UPDATE_FLAG));
  check(
    `exactly ONE run command contains ${SNAPSHOT_UPDATE_FLAG}`,
    updateSnapshotRuns.length === 1,
    `run commands=${runs.length}  carrying ${SNAPSHOT_UPDATE_FLAG}=${updateSnapshotRuns.length}`,
  );

  // 8. NO `secrets.` IN ANY env / run / with VALUE.
  const secretHits = secretHitsIn(doc);
  check(
    "zero `secrets.` references in any env / run / with VALUE",
    secretHits.length === 0,
    secretHits.length === 0
      ? "scanned workflow env, job env, container env, service env, and every step run/env/with — 0 hits"
      : `hits=[${secretHits.join(", ")}]`,
  );

  // 9. NO THIRD-PARTY ACTIONS (T-11-SC).
  // Introducing one in the job that holds `contents: write` is a supply-chain decision to raise
  // explicitly, not to absorb.
  const uses = stepsOf(job).filter((s) => typeof s?.uses === "string").map((s) => s.uses);
  const thirdParty = uses.filter((u) => !u.startsWith("actions/"));
  check(
    "every `uses:` is a first-party actions/* action",
    thirdParty.length === 0,
    `uses=[${uses.join(", ")}]${thirdParty.length ? `  third-party=[${thirdParty.join(", ")}]` : ""}`,
  );

  // 10. THE COMMIT STEP STILL STAGES ONLY THE LINUX-BASELINE GLOB.
  // T-11-PLATBASE. The tripwire catches the other way a wrong file lands in this commit: anything the
  // previous steps happened to modify (a churned lockfile, a run artefact) riding along.
  //
  // ⚠ ASKED OF THE NAMED STEP (plan 19.1-06, audit row 11). The superseded form was
  // `runs.some(r => r.includes(<the glob>))` — an existential over EVERY run body in the job, which
  // any `echo` mentioning the glob satisfies. MEASURED on the tracked file
  // (evidence/guards-06-pre-fix.txt, VECTOR STAGE-GLOB): a decoy block scalar reading
  // `echo mentions: git add -- "*-visual-linux.png"`, with the REAL staging step changed to stage
  // `*-NOTHING-AT-ALL.png`, left the checker at exit 0 with all 55 reported holding. The
  // regeneration job would have staged nothing, committed nothing and reported success — and this
  // is the tripwire whose whole job is to notice what that commit contains.
  const stageStep = stepNamed(job, BASELINES_STAGE_STEP);
  const stageRun = runOfStep(stageStep);
  const stagesGlob = stageStep !== undefined && stageRun.includes(BASELINES_STAGE_GLOB);
  check(
    `the step named "${BASELINES_STAGE_STEP}" stages exactly the *-visual-linux.png glob`,
    stagesGlob,
    `step="${BASELINES_STAGE_STEP}" ${stageStep ? `at index ${stepIndexNamed(job, BASELINES_STAGE_STEP)}` : "(ABSENT)"}  ` +
      `must contain=${JSON.stringify(BASELINES_STAGE_GLOB)}  ` +
      `first line of run=${JSON.stringify(stageRun.split("\n")[0] ?? null)}`,
  );

  console.log(
    `\n  parsed values (baselines):\n` +
      `    triggers            ${JSON.stringify(triggers)}\n` +
      `    workflow perms      ${JSON.stringify(doc?.permissions ?? null)}\n` +
      `    job perms           ${JSON.stringify(job?.permissions ?? null)}\n` +
      `    concurrency.group   ${group}\n` +
      `    container.image     ${image}\n` +
      `    container.options   ${options}\n` +
      `    run commands        ${runs.length} (${updateSnapshotRuns.length} with ${SNAPSHOT_UPDATE_FLAG})\n` +
      `    services            ${JSON.stringify(Object.keys(job?.services ?? {}))}\n` +
      `    job env keys        ${JSON.stringify(Object.keys(job?.env ?? {}))}\n` +
      `    uses                ${JSON.stringify(uses)}`,
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION `ci` — THE COMPARE PATH.
// New in plan 12-15. `ci.yml` gates every push and, until this section existed, was verified by
// nothing but the ad-hoc `node -e` recipe in its own header.
// ════════════════════════════════════════════════════════════════════════════════════════════════
if (sections.includes("ci")) {
  currentSection = "ci";
  const doc = workflow(CI);
  const jobs = jobsOf(doc);
  banner(`ci — ${CI} (${jobs.length} job(s))`);

  // ── PERMISSIONS (T-11-CIWRITE) ────────────────────────────────────────────────────────────────
  check(
    "workflow-level permissions.contents is 'read'",
    doc?.permissions?.contents === "read",
    `workflow permissions=${JSON.stringify(doc?.permissions ?? null)}`,
  );

  const ciWriteJobs = jobs.filter(([, j]) => j?.permissions?.contents === "write").map(([n]) => n);
  check(
    "NO job in ci.yml holds contents: write — the write path is baselines.yml alone",
    ciWriteJobs.length === 0,
    `jobs with contents:write=[${ciWriteJobs.join(", ") || "(none)"}]  jobs=[${jobs.map(([n]) => n).join(", ")}]`,
  );

  // ── THE TRIGGER SET (T-19-15-01, review finding WR-01) ────────────────────────────────────────
  // THE MEASUREMENT THAT BOUGHT THIS CHECK: `triggersOf(doc)` was read in this section for the
  // `parsed values (ci)` printout at the bottom and NOWHERE ELSE — never compared in a `check()`.
  // 19-VERIFICATION.md deleted `pull_request:` from this file's `on:` block, re-ran this checker and
  // recorded `CHECKER-EXIT=0` with no FAIL line and the summary unchanged at all 48 invariants.
  // ONE LINE detaches EVERY gate in `ci.yml` — `gate-e2e` included, and with it the only half of
  // D-14 that protects the current run — from pull requests, with the checker reporting full green.
  // CI-01's requirement text is literally "opening a pull request runs the repository's functional
  // Playwright specs", so this is the one trigger whose absence falsifies the requirement rather
  // than merely degrading it.
  //
  // ⚠ MEMBERSHIP HERE, EXACT SET IN `baselines` — THE ASYMMETRY IS DELIBERATE AND MUST NOT BE
  // "HARMONISED". The two sections face opposite dangers, and each shape answers its own:
  //   - `baselines.yml` is the WRITE PATH. An ADDED trigger is the single most dangerous edit in
  //     this repository — a `push:` there turns the one job that can commit baselines into a job
  //     that regenerates them on every push — so its set is pinned EXACTLY (see :316-324).
  //   - `ci.yml` is the COMPARE PATH. It writes nothing. An added `workflow_dispatch` here is
  //     harmless and a MISSING trigger is the whole danger, so membership is asserted and additions
  //     are not. An exact set here would redden a correct file the day somebody adds a manual
  //     dispatch, which is how a correct check gets deleted rather than fixed.
  // A future reader who makes these two the same shape breaks one of the two properties.
  //
  // `triggersOf` returns `[]` for an absent or null `on:` block, so an emptied `on:` is FALSE here
  // rather than vacuously true — absence IS the failure this check exists for.
  //
  // ── PRESENCE WAS NEVER THE PROPERTY (plan 19.1-06, review finding CR-01) ──────────────────────
  // THE MEASUREMENT THAT BOUGHT THE TWO FILTER CONJUNCTS (evidence/guards-06-pre-fix.txt, VECTORS
  // CR-01(a), (b) and (c)). Membership alone was defeated three ways WITHOUT DELETING A SINGLE KEY:
  //   (a) `pull_request: { branches: [does-not-exist] }`  → exit 0, all 55 reported holding
  //   (b) `pull_request: { paths-ignore: ['**'] }`        → exit 0, all 55 reported holding
  //   (c) `push: { branches: [dev] }`                     → exit 0, all 55 reported holding
  // In (a) and (b) EVERY gate in this file becomes unreachable from a pull request, which falsifies
  // CI-01's own requirement text — literally "opening a pull request runs the repository's
  // functional Playwright specs" — while this check printed green. In (c) every gate detaches from
  // the branch plan 15's ruleset protects. The comment above says a MISSING trigger is the whole
  // danger. That was true and incomplete: a NEUTERED trigger is the same danger wearing the key.
  //
  // ⚠ THE TWO TRIGGERS ARE ASSERTED ALONG DIFFERENT PROPERTIES, AND THAT ASYMMETRY IS DELIBERATE
  // — do not "harmonise" it either. This file's PUSH filter is a real, intended narrowing; its
  // PULL-REQUEST trigger is intentionally bare. Asserting push unfiltered would redden a CORRECT
  // file, which is how a correct check gets deleted rather than repaired.
  //
  //   * `pull_request` MUST BE PRESENT AND UNFILTERED. Any filter at all — a branch list, a path
  //     list, a `types:` narrowing — makes some pull request not run these gates, and the
  //     requirement text does not qualify WHICH pull request. So the conjunct is `filter == null`
  //     (null for the bare `pull_request:` mapping entry this file writes, undefined for the scalar
  //     and sequence spellings), NOT an enumeration of the modifiers anybody has thought of.
  //     Deny-listing `branches`, then `paths-ignore`, then whatever round five finds is the shape
  //     `MAIL_STEP_ALLOWED_KEYS` above already argues against: the attack surface is an open set.
  //
  //   * `push` MUST REACH BOTH BRANCHES. Reachability, not shape — because there are two correct
  //     files here and only one of them has a branch list. An ABSENT push filter runs on every
  //     branch, so it reaches both by construction and is GREEN; that is exactly the file the
  //     sequence spelling `on: [push, pull_request]` produces, and a conjunct demanding a literal
  //     list would have reddened it. A PRESENT filter must name both branches, and — allow-list,
  //     never deny-list — may carry NO OTHER KEY, because `paths-ignore: ['**']` on push detaches
  //     the gates just as completely as an empty branch list does.
  const ciTriggers = triggersOf(doc);
  const prFilter = triggerFilterOf(doc, "pull_request");
  const pushFilter = triggerFilterOf(doc, "push");
  const PUSH_FILTER_ALLOWED_KEYS = ["branches"];
  const pushFilterKeys = pushFilter == null ? [] : Object.keys(pushFilter).sort();
  const pushBranches = Array.isArray(pushFilter?.branches) ? pushFilter.branches.map(String) : null;
  // Unfiltered push reaches every branch there is. A filtered push reaches exactly what it lists,
  // and may narrow along no other axis.
  const pushReachesBoth =
    pushFilter == null ||
    (pushBranches !== null &&
      pushFilterKeys.every((k) => PUSH_FILTER_ALLOWED_KEYS.includes(k)) &&
      pushBranches.includes(CI_DEV_BRANCH) &&
      pushBranches.includes(CI_DEFAULT_BRANCH));
  check(
    `ci.yml runs on BOTH push and pull_request — CI-01's requirement text is about opening a pull ` +
      `request — with pull_request UNFILTERED, and push reaching both "${CI_DEV_BRANCH}" and "${CI_DEFAULT_BRANCH}"`,
    ciTriggers.includes("push") &&
      ciTriggers.includes("pull_request") &&
      prFilter == null &&
      pushReachesBoth,
    // The document's own key order, so a red is diagnosable against the file as written. Membership
    // is order-independent by construction; this evidence line deliberately is not. `(none)` is an
    // EXPLICIT marker rather than an empty pair of brackets, so an emptied `on:` reads as the
    // absence it is instead of as a rendering accident.
    `triggers=[${ciTriggers.join(", ") || "(none)"}]  ` +
      `pull_request filter=${prFilter === undefined ? "(absent)" : JSON.stringify(prFilter)} (must be null/absent)  ` +
      `push filter=${pushFilter === undefined ? "(absent)" : JSON.stringify(pushFilter)}  ` +
      `push filter keys=[${pushFilterKeys.join(", ") || "(none)"}]  permitted=[${PUSH_FILTER_ALLOWED_KEYS.join(", ")}]  ` +
      `push branches=[${pushBranches?.join(", ") ?? "(unfiltered — reaches every branch)"}]  ` +
      `must reach=[${CI_DEV_BRANCH}, ${CI_DEFAULT_BRANCH}]  and it does=${pushReachesBoth}`,
  );

  // ── THE CONCURRENCY GROUP (T-11-CANCEL) ───────────────────────────────────────────────────────
  // 11-04 measured a substring check GREEN for dropping this term, because the word survives in the
  // prose above it. Without the event term a push to `dev` cancels an in-flight baseline dispatch on
  // the same ref, leaving a partial baseline set committed.
  const ciGroup = String(doc?.concurrency?.group ?? "");
  check(
    "github.event_name is in the concurrency group",
    ciGroup.includes("github.event_name"),
    `concurrency.group=${ciGroup || "(absent)"}`,
  );

  // ── SUPPLY CHAIN (T-11-SC) ────────────────────────────────────────────────────────────────────
  const ciUses = jobs.flatMap(([name, j]) =>
    stepsOf(j).filter((s) => typeof s?.uses === "string").map((s) => `${name}:${s.uses}`),
  );
  const ciThirdParty = ciUses.filter((u) => !u.split(":").slice(1).join(":").startsWith("actions/"));
  check(
    "every `uses:` across every job is a first-party actions/* action",
    ciThirdParty.length === 0,
    `uses=[${ciUses.join(", ")}]${ciThirdParty.length ? `  third-party=[${ciThirdParty.join(", ")}]` : ""}`,
  );

  // ── ZERO WRITE PATHS IN THIS FILE (T-11-BASEMINT) ─────────────────────────────────────────────
  // Counted over the PARSED tree across ALL jobs. This is the number the file's own "grep returns 0"
  // audit cannot produce once a comment mentions the flag — and the reason the flag is named by ROLE
  // and never by spelling inside `ci.yml`. It is spelled HERE, in the counter, where it must be.
  const ciRunsByJob = jobs.map(([name, j]) => [name, runsOf(j)]);
  const minters = ciRunsByJob.flatMap(([name, rs]) =>
    rs.filter((r) => r.includes(SNAPSHOT_UPDATE_FLAG)).map(() => name),
  );
  const ciRunCount = ciRunsByJob.reduce((n, [, rs]) => n + rs.length, 0);
  check(
    `ZERO run commands in ci.yml carry ${SNAPSHOT_UPDATE_FLAG} — this file can never mint a baseline`,
    minters.length === 0,
    `run commands=${ciRunCount} across ${jobs.length} job(s)  carrying the flag=${minters.length}` +
      `${minters.length ? `  in jobs=[${minters.join(", ")}]` : ""}`,
  );

  // ── NO CREDENTIALS (T-11-CISECRET) ────────────────────────────────────────────────────────────
  // The build step's three visibly-fake literals are LITERALS, so this passes today and fires the day
  // somebody "promotes them to secrets" — which would imply a real credential is needed to BUILD,
  // exactly the property job 1 exists to disprove.
  const ciSecretHits = secretHitsIn(doc);
  check(
    "zero `secrets.` references in any env / run / with VALUE, across every job",
    ciSecretHits.length === 0,
    ciSecretHits.length === 0
      ? "scanned workflow env, every job env, every container env, every service env, and every step run/env/with — 0 hits"
      : `hits=[${ciSecretHits.join(", ")}]`,
  );

  // ── NO MAIL CREDENTIAL REACHES ANY JOB (D-14, T-19-02) ────────────────────────────────────────
  // The sibling of the check above, and the parse-based half of D-14. `gate-e2e` also carries a
  // RUNTIME refusal, and the two are NOT interchangeable halves of one coverage story — they answer
  // different questions. THIS one covers EVERY job rather than only the one the step lives in, and
  // the exposure it closes is not a hypothetical: it is somebody adding a repository- or
  // environment-level secret and wiring it into a workflow `env:` for an unrelated reason. See
  // MAIL_KEY's declaration for the measurement.
  //
  // ⚠ IT RUNS ON JOB 1, AND JOB 1 IS PARALLEL TO JOB 5. `gate-db-free` and `gate-e2e` both declare
  // no `needs:`, so they start in parallel, and GitHub cancels neither when the other fails — job 1
  // going red does not stop job 5 booting the app and sending mail. This scan therefore
  // protects the NEXT run, never the current one. What protects the CURRENT run is the runtime
  // half, which is why that half had to be able to fire at all (see below).
  //
  // ⚠ FALSIFIED 2026-09-04 BY PLAN 19-12 (review finding CR-01). THE CLAIM WAS: this scan reads env
  // KEYS and not VALUES, and that is exactly why `gate-e2e`'s step does not trip it — the step
  // deliberately named its variable after neither the provider nor its prefix while reading the
  // provider key through an Actions context expression in its VALUE, so the two sites were spelled
  // differently ON PURPOSE and each of them said so, and renaming the step's key to the provider's
  // name would have made this check go red against a CORRECT file. That history is accurate and the
  // carve-out was real. WHAT REPLACED IT: that step declares NO `env:` map at all, so there is
  // nothing here to carve out. The expression it used could never fire — the Actions `env` context
  // is built exclusively from `env:` maps in the workflow file — and the runtime half is now
  // asserted by Invariants A, B and C in the `gate-e2e` block below.
  //
  // ⚠ WHAT THIS SCAN IS, AND WHAT IT IS NOT. It answers whether a workflow FILE declares a
  // provider-named `env:` KEY. It does not and cannot answer what the job's PROCESS ENVIRONMENT
  // holds — a `container.env` key, a repository secret or a runner variable are all invisible to a
  // parse of the file. Both questions are now asked, by different assertions, and NEITHER
  // SUBSTITUTES FOR THE OTHER. (This scan still walks neither `container.env` nor `services.*.env`
  // keys — review finding WR-03, carried forward and not closed by plan 19-12.)
  const mailEnvHits = [];
  for (const [name, job] of jobs) {
    for (const k of Object.keys(job?.env ?? {})) {
      if (k.startsWith(MAIL_KEY_PREFIX)) mailEnvHits.push(`${name}.env.${k}`);
    }
    for (const s of stepsOf(job)) {
      for (const k of Object.keys(s?.env ?? {})) {
        if (k.startsWith(MAIL_KEY_PREFIX)) mailEnvHits.push(`${name}.step.env.${k}`);
      }
    }
  }
  for (const k of Object.keys(doc?.env ?? {})) {
    if (k.startsWith(MAIL_KEY_PREFIX)) mailEnvHits.push(`workflow.env.${k}`);
  }
  check(
    `no job, step or workflow env KEY declares ${MAIL_KEY} — the e2e suite must send zero real email`,
    mailEnvHits.length === 0,
    `hits=[${mailEnvHits.join(", ") || "(none)"}]  scanned ${jobs.length} job(s), their steps, ` +
      `and the workflow env  prefix=${MAIL_KEY_PREFIX}`,
  );

  // ── EVERY CONTAINERIZED JOB PINS THE SAME IMAGE, AND KEEPS --ipc=host (T-11-VERDRIFT) ─────────
  const containerJobs = jobs.filter(([, j]) => j?.container != null);
  const badImages = containerJobs.filter(([, j]) => String(j.container.image ?? "") !== EXPECTED_IMAGE);
  check(
    "every job declaring a container: pins the exact installed-Playwright image",
    containerJobs.length > 0 && badImages.length === 0,
    `containerized=[${containerJobs.map(([n, j]) => `${n}=${j.container.image}`).join(", ") || "(none)"}]` +
      `  expected=${EXPECTED_IMAGE}`,
  );

  const badIpc = containerJobs.filter(([, j]) => !String(j.container.options ?? "").includes("--ipc=host"));
  check(
    "every containerized job carries --ipc=host",
    containerJobs.length > 0 && badIpc.length === 0,
    `options=[${containerJobs.map(([n, j]) => `${n}="${j.container.options ?? ""}"`).join(", ") || "(none)"}]`,
  );

  // ── EVERY SERVICE IMAGE IS POSTGIS, TAGGED BEYOND THE BARE MAJOR ──────────────────────────────
  // `drizzle/0005_booking_exclusion.sql` needs `btree_gist` for the `space_id WITH =` term of the
  // double-booking EXCLUDE constraint, so a plain `postgres` image makes provisioning fail. And the
  // bare major-only tag was probed against registry-1.docker.io on 2026-08-13: it 404s.
  const serviceImages = jobs.flatMap(([name, j]) =>
    Object.entries(j?.services ?? {}).map(([svc, s]) => ({
      job: name,
      svc,
      image: String(s?.image ?? ""),
    })),
  );
  const badService = serviceImages.filter(
    ({ image }) => !image.startsWith("postgis/postgis:") || /^postgis\/postgis:\d+$/.test(image),
  );
  check(
    "every service image is postgis/postgis: with a tag qualified beyond the bare major",
    serviceImages.length > 0 && badService.length === 0,
    `services=[${serviceImages.map((s) => `${s.job}.${s.svc}=${s.image}`).join(", ") || "(none)"}]`,
  );

  // ── THE ADDRESSING RULE, AS A TOTAL FUNCTION OVER EVERY JOB THAT SETS DATABASE_URL ────────────
  // docs.github.com, Creating PostgreSQL service containers:
  //
  //   job runs IN a container   → reach the service by its LABEL, no port mapping needed
  //   job runs ON the runner    → reach it at `localhost`, and `ports:` is required
  //
  // Getting it backwards produces a connection-refused that reads exactly like a flaky service, so it
  // gets retried rather than diagnosed and every retry fails the same way. `ci.yml`'s own vacuity
  // table measured a whole-file substring check GREEN for precisely this swap.
  //
  // The third case is T-11-DBFREE's half: a job with NO services must point at the unreachable
  // sentinel, because an UNSET value is strictly worse than a wrong one (`postgres(undefined!)`
  // falls back to libpq defaults and may find a real database on some future runner).
  const SENTINEL = "127.0.0.1:59999";
  const addressed = [];
  for (const [name, job] of jobs) {
    const url = job?.env?.DATABASE_URL;
    if (typeof url !== "string") continue;
    addressed.push(name);
    const authority = authorityOf(url);
    const host = hostOf(authority);
    const services = Object.entries(job?.services ?? {});
    const containerized = job?.container != null;

    if (services.length === 0) {
      check(
        `addressing rule — "${name}" declares no services:, so DATABASE_URL must be the unreachable sentinel`,
        authority === SENTINEL,
        `job="${name}"  services=[]  container=${containerized}  authority=${authority || "(unparseable)"}  expected=${SENTINEL}`,
      );
    } else if (containerized) {
      const labels = services.map(([l]) => l);
      const matched = services.find(([label]) => label === host);
      const noPorts = matched != null && matched[1]?.ports == null;
      check(
        `addressing rule — "${name}" runs IN a container, so the host must be a service LABEL and that service must declare NO ports:`,
        matched != null && noPorts,
        `job="${name}"  container=true  host=${host || "(unparseable)"}  service labels=[${labels.join(", ")}]  ` +
          `ports=${JSON.stringify(matched?.[1]?.ports ?? null)}`,
      );
    } else {
      const allPublished = services.every(([, s]) => Array.isArray(s?.ports) && s.ports.length > 0);
      check(
        `addressing rule — "${name}" runs ON the runner, so the host must be localhost and every service MUST declare ports:`,
        host === "localhost" && allPublished,
        `job="${name}"  container=false  host=${host || "(unparseable)"}  ` +
          `ports=[${services.map(([l, s]) => `${l}=${JSON.stringify(s?.ports ?? null)}`).join(", ")}]`,
      );
    }
  }
  check(
    "the addressing rule covered at least one job — it is a total function, not an empty loop",
    addressed.length > 0,
    `jobs setting DATABASE_URL=[${addressed.join(", ") || "(none)"}]`,
  );

  // ── T-11-DBFREE, SPELLED BY WHAT THE JOB *DOES* RATHER THAN BY WHAT IT IS NAMED ───────────────
  // So it survives a future rename. `npm run build` exiting 0 with an unreachable database PROVES no
  // DB-touching route is being prerendered. Point that job at a live database and a route that
  // silently becomes static builds green and ships a page of FROZEN AVAILABILITY — one of the two
  // failure modes PROJECT.md names as unacceptable. This is the cheapest standing check against it.
  //
  // ⚠ THE SUBSTRING BELOW IS AUDITED AND DELIBERATELY KEPT — READ THIS BEFORE "FIXING" IT (plan
  // 19.1-06, deferred item D-19.1-C; verdict CARRIED in evidence/sc2-audit-inventory.md row 7).
  // It IS the CR-02 idiom, and it is the one place in this file where that idiom is not the wrong
  // tool, because of what this predicate's DANGEROUS DIRECTION is:
  //   * Its property is "the job that builds declares no services". OVER-matching adds a PHANTOM
  //     job to `buildJobs`; if that phantom declares services the check goes RED. A false red on a
  //     safety property fails CLOSED, and a spurious extra entry can never make this check pass.
  //   * UNDER-matching is what would be dangerous here — and under-matching is impossible for a
  //     containment test, which is exactly why containment is the right shape for the DENY
  //     direction and the wrong one for locating the subject of a positive claim.
  // ⚠ WHAT IT IS THEREFORE *NOT*: it is NOT the invariant that `gate-db-free` runs the build. Plan
  // 19.1-05's build-step invariant OWNS that claim now, anchored by exact `name:` with a trimmed
  // exact-equality invocation. Before that invariant existed, deleting the build step went red HERE
  // — by accident, on this predicate's existence conjunct, for a property that is not about the
  // step at all — and `npm run build --decoy` and `if: false` on that step both left it GREEN
  // (19.1-05's MUTATIONS 5 and 6). A future reader must not treat this line as coverage of the
  // build step, and must not re-anchor it by job key either: spelling the job by NAME is the one
  // thing this predicate's own heading says it exists to avoid.
  const buildJobs = ciRunsByJob.filter(([, rs]) => rs.some((r) => r.includes("npm run build")));
  const buildJobsWithServices = buildJobs.filter(([name]) => {
    const j = doc.jobs[name];
    return Object.keys(j?.services ?? {}).length > 0;
  });
  check(
    "the job that runs `npm run build` exists and declares NO services: (T-11-DBFREE)",
    buildJobs.length > 0 && buildJobsWithServices.length === 0,
    `jobs running \`npm run build\`=[${buildJobs.map(([n]) => n).join(", ") || "(none)"}]  ` +
      `of which declare services=[${buildJobsWithServices.map(([n]) => n).join(", ") || "(none)"}]`,
  );

  // ── THE FUNCTIONAL-SUITE JOB EXISTS. ITS ABSENCE IS A HARD STOP, NOT A FAILED CHECK ───────────
  // ADDED BY PLAN 19-08 (research Open Question 5, answered YES by the PM as option `2d`).
  //
  // WHY IT WAS MISSING, AND WHY THAT IS THE INTERESTING PART: every other `ci` invariant above is
  // UNIVERSALLY QUANTIFIED — "every containerized job pins the image", "every `uses:` is
  // first-party", "no job holds contents: write". A DELETED JOB SATISFIES ALL OF THEM VACUOUSLY.
  // Before this stop, `gate-e2e` could have been removed from ci.yml in one commit and this script
  // would have printed a clean green over the remaining four jobs. The gate would be gone and
  // nothing in the repository would have said so. That is exactly the vacuity the file's header
  // measures on substrings, one layer up: universal quantification over an empty set.
  //
  // ⚠ A HARD STOP IS NOT A COUNTED INVARIANT (see `hardStop` above). It deliberately does not
  // increment the section total, so adding this did not move the printed count — the count went up
  // by the ONE `check()` below, not by two. A stop and a check answer different questions: the stop
  // says "the subject is absent, so every assertion is meaningless", the check says "the subject is
  // present and wrong".
  const e2e = doc?.jobs?.[CI_E2E_JOB];
  if (!e2e) {
    hardStop([
      `job "${CI_E2E_JOB}" not found in ${CI}.`,
      `Jobs present: [${jobs.map(([n]) => n).join(", ") || "(none)"}]`,
      ``,
      `This job IS the functional Playwright suite — the gate that runs the repository's e2e specs`,
      `on every push and pull request. Deleting it removes the only check that would notice a`,
      `broken booking flow, and it removes it INVISIBLY: every other assertion in this section is`,
      `universally quantified over the jobs that remain, so all of them would still pass.`,
      ``,
      `If this job is genuinely being retired, that is a decision to record — not a deletion to`,
      `absorb. Remove this hard stop in the same commit, and say why in it.`,
    ]);
  }

  // THE DISPLAY NAME IS THE REQUIRED-CHECK CONTEXT. Asserted separately from the key above because
  // GitHub matches branch protection on `name:`, so a `name:` edit detaches the gate from branch
  // protection while leaving the job — and every invariant over it — perfectly intact. The rename
  // is not forbidden; it is required to be DELIBERATE, because it must be paired with an edit to
  // the repository's required-status-check list, which no file here can carry.
  check(
    `"${CI_E2E_JOB}" declares the exact display name branch protection matches on`,
    String(e2e?.name ?? "") === CI_E2E_CONTEXT,
    `name=${JSON.stringify(e2e?.name ?? null)}  expected=${JSON.stringify(CI_E2E_CONTEXT)}  ` +
      `(a required status check is matched by this string; changing it silently unbinds the gate)`,
  );

  // ── AND NOW THE THREE THINGS THAT MAKE IT A GATE RATHER THAN A JOB (plan 19-11, WR-01) ────────
  // The stop above and the check above it close DELETION and RENAME of the job. They do not close
  // the job being kept, correctly named, and made to do NOTHING. Measured, not supposed: delete the
  // Playwright step from `gate-e2e` and every assertion in this section still holds — the job
  // exists, the display name matches, the image is pinned, the service is declared, no `secrets.`
  // and no mail key appear, the addressing rule passes. A required check would go green over a job
  // that installs npm and stops. That is the same vacuity as a deleted job, one level in.
  //
  // All three below used to quantify over `e2eRuns` — the job's RUN COMMANDS — so a job whose steps
  // are emptied made each of them FALSE rather than vacuously true: an existential over an empty
  // list is false, and an index comparison over an empty list has no non-negative indices to
  // compare. THAT ARGUMENT SURVIVES AND ONLY ITS SUFFICIENCY DID NOT (plan 19.1-06, CR-02's class).
  // An EXISTENTIAL over run bodies is false over an empty job, yes — and it is also satisfied by
  // ANY step that merely mentions the string, including one that does nothing. Absence was handled;
  // IMPERSONATION was not. Each of the three now anchors its step by exact `name:` and asks its
  // question of THAT step, and each still answers FALSE over an emptied job because a named step
  // that is not there yields `undefined` / `-1`.
  const e2eRuns = runsOf(e2e);
  const e2eSteps = stepsOf(e2e);
  const e2ePlayStep = stepNamed(e2e, CI_E2E_PLAYWRIGHT_STEP);
  const e2ePlayRun = runOfStep(e2ePlayStep);

  // 1. THE FUNCTIONAL PROJECT BY NAME, not "some Playwright command exists". `--project=chromium`
  //    is what selects `testMatch: "e2e/*.spec.ts"` in playwright.config.ts, so naming the project
  //    IS naming the whole functional set; a bare `playwright test` would ALSO collect the `visual`
  //    project that job 4 owns and whose committed baselines this job must never touch. This is
  //    verbatim the argument the `gate-visual` block one screen below makes for `--project=visual`
  //    — it transfers unchanged, and is not restated at length here.
  //
  //    ⚠ THE QUESTION IS ASKED OF THE NAMED STEP, NOT OF THE JOB (plan 19.1-06). The superseded
  //    form was `e2eRuns.some(r => r.includes(…))` — an existential over every run body in the job,
  //    which any `echo` mentioning the flag satisfies. The SIBLING of this check in `gate-visual`
  //    was defeated exactly that way and MEASURED: a decoy `echo` naming the visual project, with
  //    the real step switched to a different project, left the checker at exit 0 with all 55
  //    reported holding. Containment is still the comparison — the invocation legitimately carries
  //    other arguments — but it is now containment over the SUBJECT'S OWN run body rather than a
  //    search for a subject, which is the whole distinction this plan is about.
  check(
    `"${CI_E2E_JOB}" runs the functional project BY NAME (${CI_E2E_PROJECT}), on the step named "${CI_E2E_PLAYWRIGHT_STEP}"`,
    e2ePlayStep !== undefined &&
      e2ePlayRun.includes("playwright test") &&
      e2ePlayRun.includes(CI_E2E_PROJECT),
    `step="${CI_E2E_PLAYWRIGHT_STEP}" ${e2ePlayStep ? `at index ${stepIndexNamed(e2e, CI_E2E_PLAYWRIGHT_STEP)}` : "(ABSENT)"}  ` +
      `run=${JSON.stringify(e2ePlayStep ? e2ePlayRun : null)}  must contain=["playwright test", ${JSON.stringify(CI_E2E_PROJECT)}]  ` +
      `(of ${e2eSteps.length} steps)`,
  );

  // 2. UNCONDITIONAL — THE JOB *AND* EVERY STEP OF IT. A job-level `if:` or
  //    `continue-on-error: true` detaches the gate while leaving every parsed invariant perfectly
  //    intact — the same failure shape as the `name:` edit the check above was added for, and it
  //    does not even need the job to change what it runs.
  //
  //    THE PROMOTION, AND THE MEASUREMENT THAT BOUGHT IT (review finding CR-02). The superseded
  //    predicate read only the JOB's two fields. 19-VERIFICATION.md added `continue-on-error: true`
  //    as a third line under the mail-refusal step, ran this checker, and watched all 48 invariants
  //    stay green while that step's non-zero exit could no longer fail the job — so migrate, seed
  //    and the whole suite would run on with a live mail credential present. `if:` on the step has
  //    the same effect one level further out: Invariant C's `findIndex` is over `run` STRINGS and
  //    does not care whether the step will ever execute. This is worse than the job-level case it
  //    inherits from, because the detached step is the only half of D-14 that protects the CURRENT
  //    run — the parse half runs on job 1, in parallel, and protects only the next one. The gate-
  //    bearing unit was assumed singular and assumed to be the job; it is every unit that can carry
  //    a condition, so the quantifier is the subject now and the job read is one element of it.
  //
  //    ⚠ A DELIBERATE CONDITION IS A DECISION TO RECORD, NOT ONE TO ABSORB — AT EITHER LEVEL. If
  //    this job, or any step in it, is genuinely meant to become conditional or soft-failing, remove
  //    this invariant in the same commit and say why in it — exactly as the hard stop above demands
  //    for a deliberate deletion. A gate step that cannot fail the job is not a gate; it is a report.
  //
  //    PRESENCE, NOT VALUE, AND THE MEASUREMENT THAT BOUGHT IT (review finding CR-02, third round).
  //    `continue-on-error` is DOCUMENTED as accepting an EXPRESSION, not only a literal boolean —
  //    `${{ matrix.experimental }}` is GitHub's own canonical example — and an expression parses to a
  //    STRING. So `=== true` was false and `!== true` was true for the SAME input: both directions of
  //    the value comparison stayed green while the step's non-zero exit could no longer fail the job.
  //    A quoted `"true"` defeats it identically. 19-VERIFICATION.md reproduced the expression form
  //    and watched all 48 invariants hold.
  //
  //    Note the asymmetry that lived INSIDE this one expression until now: `if:` was tested for
  //    PRESENCE, which is correct and expression-proof, while `continue-on-error` beside it was
  //    tested for VALUE, which is not. THE RULE THAT REPLACES IT: a key that should never appear on a
  //    gate has NO LEGITIMATE VALUE TO CARVE OUT, so every value comparison is one alternative
  //    spelling away from green. `continue-on-error: false` on a gate step is noise to DELETE, not a
  //    value to permit.
  const conditionalSteps = stepsOf(e2e)
    // Index from the FULL step list, before filtering, so `step[2]` names the third step of the job
    // rather than the third offender. Declared order is preserved and nothing is sorted or de-duped:
    // two offending steps must stay distinguishable and the line must be stable across runs.
    .map((s, i) => ({ step: s, label: String(s?.name ?? `step[${i}]`) }))
    .filter(({ step }) => step?.if !== undefined || step?.["continue-on-error"] !== undefined)
    .map(({ label }) => label);
  check(
    `"${CI_E2E_JOB}" is unconditional — no if:, no continue-on-error: AT ALL, on the JOB or on ANY STEP`,
    e2e?.if === undefined &&
      e2e?.["continue-on-error"] === undefined &&
      conditionalSteps.length === 0,
    `job if=${JSON.stringify(e2e?.if ?? null)}  ` +
      `job continue-on-error=${JSON.stringify(e2e?.["continue-on-error"] ?? null)}  ` +
      `conditional/soft steps=[${conditionalSteps.join(", ") || "(none)"}]  ` +
      `(of ${stepsOf(e2e).length} steps)`,
  );

  // 2a-bis. THE JOB'S WHOLE KEY SURFACE, AS AN ALLOW-LIST (19.1-REVIEW.md CR-01).
  //    A SIBLING of the check above, not a replacement for it: that one QUANTIFIES OVER EVERY STEP
  //    and this one does not — it is about the job's own keys — so neither subsumes the other.
  //    See `E2E_JOB_ALLOWED_KEYS` for the full argument and the four measured vectors.
  //
  //    ⚠ THE KEYS ARE SORTED FOR THE EVIDENCE LINE ONLY. Membership is exact string equality and
  //    is order-independent by construction; sorting makes a red diffable across runs.
  const e2eJobKeys = Object.keys(e2e ?? {}).sort();
  const e2eJobExtraKeys = e2eJobKeys.filter((k) => !E2E_JOB_ALLOWED_KEYS.includes(k));
  check(
    `"${CI_E2E_JOB}" carries NO JOB-LEVEL KEY OUTSIDE [${E2E_JOB_ALLOWED_KEYS.join(", ")}] — needs: and if: stop this job running, strategy: renames its check context, and each leaves its name: byte-identical`,
    e2eJobExtraKeys.length === 0,
    `job keys=[${e2eJobKeys.join(", ") || "(none)"}]  ` +
      `permitted=[${E2E_JOB_ALLOWED_KEYS.join(", ")}]  ` +
      `unexpected=[${e2eJobExtraKeys.join(", ") || "(none)"}]  ` +
      `(a key here is not forbidden forever — it is required to be DELIBERATE. If this job is ` +
      `genuinely meant to gain one, add it to E2E_JOB_ALLOWED_KEYS in the same commit and say why ` +
      `in it, having first checked it neither skips the job nor renames the check context)`,
  );

  // 2b. THE INTERPRETER, PINNED ONE LEVEL OUT (T-19-15-02, review finding CR-01, OUTER HALF).
  //    Same family of question as the check above — what can change how this gate runs — asked one
  //    level further out. GitHub Actions supports `defaults: { run: { shell: … } }` at WORKFLOW and
  //    at JOB level, and a custom shell of the form `<command> {0}` writes the step's `run:` body to
  //    a temp file and hands it to that command instead of executing it.
  //
  //    THE MEASUREMENT THAT BOUGHT IT: a one-line interpreter override on the refusal step left the
  //    `run:` string byte-identical, the `env:` absent, the `if:` absent and the step's position
  //    unmoved while the script was PRINTED instead of executed — and every invariant stayed green.
  //    `grep -n "shell\|defaults"` across this whole file returned NO MATCHES before plan 19-15:
  //    neither level was read anywhere in this checker.
  //
  //    ⚠ THIS IS THE OUTER HALF OF THAT FINDING AND `MAIL_STEP_ALLOWED_KEYS` IS THE INNER HALF.
  //    NEITHER SUBSTITUTES FOR THE OTHER. The allow-list reads the keys ON the refusal step; a
  //    `defaults:` block puts no key there at all, so it is invisible to the allow-list by
  //    construction while changing that step's interpreter from outside it.
  //
  //    ⚠ THE WHOLE BLOCK IS FORBIDDEN, NOT ONE KEY INSIDE IT. That is the allow-list shape plan
  //    19-14 established one level in, applied here: the failure class is "an attribute the checker
  //    does not know about", so naming `run.shell` specifically would be the deny-list shape
  //    reasserting itself at a new level. `undefined` is the ONLY passing value at each level, so a
  //    present-but-EMPTY `defaults:` block is red too — a block that exists is a block a later edit
  //    can fill, and the reviewer of that edit sees a one-line diff inside an accepted structure.
  //
  //    SCOPED TO THE WORKFLOW AND TO THIS JOB, DELIBERATELY. A `defaults:` block on an unrelated job
  //    cannot change how `gate-e2e` executes, and asserting over EVERY job would redden a correct
  //    file the day somebody legitimately sets a working directory elsewhere — which is how a
  //    correct check gets deleted rather than narrowed.
  check(
    `"${CI_E2E_JOB}" runs its steps with the runner's DEFAULT interpreter — NO defaults: block at workflow level or on the job`,
    doc?.defaults === undefined && e2e?.defaults === undefined,
    `workflow defaults=${JSON.stringify(doc?.defaults ?? null)}  ` +
      `job defaults=${JSON.stringify(e2e?.defaults ?? null)}`,
  );

  // 3. SEED BEFORE SUITE, COMPARED BY INDEX. Presence alone is not the property: a seed that runs
  //    after the suite is a seed that changed nothing, and this job's own step comment records that
  //    FIVE named specs fail against an empty catalogue and say so in their own messages. Same
  //    shape as the `gate-visual` migrate → seed → playwright ordering check below.
  //
  //    ⚠ THE INDICES COME FROM NAME-ANCHORED STEPS, AND RESEARCH.md's ROW 5 REPRODUCED (plan
  //    19.1-06). The superseded computation was `e2eRuns.findIndex(r => r.includes("db:seed"))` —
  //    the FIRST run body in the job that mentions the seed command, which need not be the seed
  //    step and need not seed anything. 19.1-RESEARCH.md flagged that vector NOT YET REPRODUCED, so
  //    it was reproduced before it was repaired rather than repaired on suspicion. It reproduces:
  //    a decoy `echo "…npm run db:seed…"` placed after the refusal step, with the REAL seed step
  //    moved after the Playwright step, left the checker at exit 0 with all 55 reported holding
  //    (evidence/guards-06-pre-fix.txt, VECTOR ROW-5). The suite would have run against an empty
  //    catalogue with this invariant printing green — and its printed name is the claim that it
  //    would not.
  //
  //    Both indices are positions in the FULL step list, not in `runsOf`. See `stepIndexNamed`.
  const iE2eSeed = stepIndexNamed(e2e, CI_E2E_SEED_STEP);
  const iE2ePlay = stepIndexNamed(e2e, CI_E2E_PLAYWRIGHT_STEP);
  check(
    `"${CI_E2E_JOB}" seeds the demo catalogue BEFORE it runs the suite`,
    iE2eSeed >= 0 && iE2ePlay >= 0 && iE2eSeed < iE2ePlay,
    `step indices: "${CI_E2E_SEED_STEP}"=${iE2eSeed}  "${CI_E2E_PLAYWRIGHT_STEP}"=${iE2ePlay}  ` +
      `(of ${e2eSteps.length} steps; -1 means the step is ABSENT under that exact name)`,
  );

  // ── AND THE THREE THAT MAKE D-14'S RUNTIME HALF REAL (plan 19-12, review finding CR-01) ───────
  // THE MEASURED DEFECT THESE REPLACE, STATED SO IT CANNOT BE REDISCOVERED THE EXPENSIVE WAY: this
  // step used to read the provider key through an Actions context EXPRESSION written into its own
  // `env:` map. The GitHub Actions `env` EXPRESSION context is built EXCLUSIVELY from `env:` maps
  // declared at workflow, job and step level in the workflow file. It never contains the process
  // environment, repository or organization secrets, `vars.*`, `container.env`, or `services.*.env`.
  // So that step could fire on exactly one input — a provider-named `env:` KEY in the file — which
  // is precisely and exclusively the input the parse scan above already rejects the whole file for.
  // Its coverage over that scan was ZERO, and it could not observe `container.env`, the hole
  // `ci.yml`'s header named and then leaned on this step to cover. It shipped, was documented as
  // active, and survived a full verification round. Presence is not the property.
  // ⚠ THIS LINE IS THE ONLY PLACE IN THIS FILE THAT DECIDES WHICH STEP THE REFUSAL STEP IS.
  // Invariants A, B and C below all derive from `e2eMailStep`. Until plan 19.1-06, Invariant C
  // located the SAME step a SECOND time, by a substring of a run body — 19-REVIEW.md CR-02 — so the
  // job had two answers to one question and a decoy could make them disagree. One identity, derived
  // once, used everywhere: that is what makes the decoy control at case 30 a meaningful measurement
  // rather than a restatement of this line.
  const e2eMailStep = stepNamed(e2e, CI_E2E_MAIL_STEP);
  const e2eMailRun = String(e2eMailStep?.run ?? "");
  // Sorted, because YAML mapping order is an authoring accident and a diagnostic that changes with it
  // is not stable across runs. Membership below is EXACT string equality, so a differently-cased or
  // differently-suffixed spelling of a permitted key lands OUTSIDE the allow-list and is red — which
  // is the correct direction: the boundary is drawn by what is permitted, never by what was noticed.
  const mailStepKeys = Object.keys(e2eMailStep ?? {}).sort();
  const mailStepExtraKeys = mailStepKeys.filter((k) => !MAIL_STEP_ALLOWED_KEYS.includes(k));

  // A. IT READS THE REAL PROCESS ENVIRONMENT. The conjuncts assert that the step EXISTS under its
  //    exact name, that its `run:` is exactly the no-argument invocation, that it declares no `env:`
  //    map, and that it carries no key outside the permitted surface. They are ANDed because any one
  //    alone is satisfiable by the inert shape: the step existed, and it ran something.
  //
  //    ⚠ THEY ARE NOT COUNTED HERE, DELIBERATELY (review finding IN-01). Two of the run-string
  //    conjuncts are logically IMPLIED by the exact-equality one — once the string is fully
  //    determined they can never discriminate — so a number would be a claim about coverage depth
  //    that the code does not support. What each conjunct ASSERTS is the honest form of that claim,
  //    and it is a number nobody has to trust.
  //
  //    THE EXACT-INVOCATION CONJUNCT, AND THE MEASUREMENT THAT BOUGHT IT (review finding CR-01,
  //    second round).
  //    The superseded conjunct was `run.includes(MAIL_REFUSAL_SCRIPT)` — a containment test, which
  //    EVERY argument list in the world satisfies. 19-VERIFICATION.md edited this step's `run:` to
  //    append a decoy prefix source, ran this checker, and watched all 48 invariants stay green while
  //    the script — which then accepted `argv[2]` as an override of the file it reads its detection
  //    prefix from — exited 0 and reported a clean scan with a provider-named variable live in the
  //    environment. The PRESENCE of the script's path in the run string is not the property; the
  //    EXACT invocation is. `trim()` because a block scalar carries its trailing newline. The script
  //    now also refuses any argument on its own (both halves, so neither is the only lock), and its
  //    header names this conjunct by its real identity rather than claiming a coverage it lacked.
  //
  //    THE PERMITTED-KEY CONJUNCT, AND THE MEASUREMENT THAT BOUGHT IT (review finding CR-01, third
  //    round). Every conjunct above constrains WHAT the step runs — its `run:` string, its `env:`
  //    map — and, with Invariant C, WHERE it runs. None of them constrained HOW it executes.
  //    19-VERIFICATION.md added ONE key to this step, leaving the `run:` string byte-identical,
  //    adding no `env:`, no `if:` and no `continue-on-error:`, and not moving the step — and watched
  //    all 48 invariants stay green while the script was PRINTED instead of executed and the suite
  //    proceeded to migrate, seed and boot with a live mail credential in the environment. The
  //    property is NOT "these named attributes are absent"; it is "no attribute outside the permitted
  //    set is present". See `MAIL_STEP_ALLOWED_KEYS` above for why that is an allow-list.
  //
  //    ⚠ THE SUBSET TEST IS ANDed WITH THE STEP-PRESENCE CONJUNCT AND MUST NEVER STAND ALONE. Over
  //    an ABSENT step the key list is empty and the subset test holds VACUOUSLY — the same vacuity
  //    class the hard stops above exist to remove.
  check(
    `"${CI_E2E_JOB}"'s mail refusal reads the REAL process environment — no \${{ }} expression, no env: map, exact invocation, NO ARGUMENTS, and NO KEY OUTSIDE [${MAIL_STEP_ALLOWED_KEYS.join(", ")}]`,
    e2eMailStep !== undefined &&
      e2eMailRun.trim() === MAIL_REFUSAL_RUN &&
      e2eMailRun.includes(MAIL_REFUSAL_SCRIPT) &&
      !e2eMailRun.includes("${{") &&
      e2eMailStep?.env === undefined &&
      mailStepExtraKeys.length === 0,
    `step=${e2eMailStep ? `index ${stepsOf(e2e).indexOf(e2eMailStep)}` : "(ABSENT)"}  ` +
      `run=${JSON.stringify(e2eMailStep ? e2eMailRun : null)}  ` +
      `expected-run=${JSON.stringify(MAIL_REFUSAL_RUN)}  ` +
      `env=${JSON.stringify(e2eMailStep?.env ?? null)}  ` +
      `keys=[${mailStepKeys.join(", ") || "(none)"}]  ` +
      `permitted=[${MAIL_STEP_ALLOWED_KEYS.join(", ")}]  ` +
      `unexpected=[${mailStepExtraKeys.join(", ") || "(none)"}]  expects ${MAIL_REFUSAL_SCRIPT}`,
  );

  // B. THE TWO HALVES CANNOT DRIFT. Three conjuncts: this file's own declaration still matches the
  //    shared pattern; the refusal script carries that pattern's source text verbatim, so it reads
  //    the declaration the same way; and the refusal script holds NO COPY of the value. The third is
  //    the one that matters most — a copy would keep every other assertion green while quietly
  //    becoming a second source of truth.
  const selfSource = readFileSync(fileURLToPath(import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const refusalSource = existsSync(MAIL_REFUSAL_SCRIPT)
    ? readFileSync(MAIL_REFUSAL_SCRIPT, "utf8").replace(/\r\n/g, "\n")
    : null;
  const declMatches = MAIL_KEY_PREFIX_DECL.exec(selfSource)?.[1] === MAIL_KEY_PREFIX;
  const sharesPattern = refusalSource !== null && refusalSource.includes(MAIL_KEY_PREFIX_DECL.source);
  const holdsNoCopy = refusalSource !== null && !refusalSource.includes(MAIL_KEY_PREFIX);
  check(
    `the prefix is spelled ONCE: ${MAIL_REFUSAL_SCRIPT} reads this file's declaration and holds no copy`,
    declMatches && sharesPattern && holdsNoCopy,
    `declaration-matches-pattern=${declMatches}  script-shares-pattern-source=${sharesPattern}  ` +
      `script-holds-no-copy=${holdsNoCopy}  ` +
      `(prefix=${MAIL_KEY_PREFIX}  pattern=${MAIL_KEY_PREFIX_DECL.source}  ` +
      `script=${refusalSource === null ? "(ABSENT)" : `${refusalSource.length} bytes`})`,
  );

  // C. IT RUNS BEFORE ANYTHING BOOTS, COMPARED BY INDEX — same shape as the seed check above.
  //    Presence is not the property here either: the whole value of this control is that a violation
  //    costs SECONDS instead of a suite of real mail, and a refusal that runs after migrate, seed or
  //    Playwright is a refusal that fires once the sends have already left. Checkout, Node setup and
  //    `npm ci` are allowed to precede it — nothing can run before the dependencies are installed.
  //
  //    THE PREDECESSOR TEST MOVED FROM RUN COMMANDS TO STEPS, AND WHY (review finding WR-05). The
  //    superseded computation ran over `runsOf(e2e)`, which filters to steps carrying a STRING `run:`
  //    — so `uses:` steps were not permitted-by-decision, they were INVISIBLE BY CONSTRUCTION, absent
  //    from the very list the predicate examined. Any number of them could sit ahead of the refusal
  //    without moving its index, while this invariant's own name claimed only `npm ci` may precede.
  //    The supply-chain invariant restricts them to first-party actions, and one first-party action
  //    alone can run arbitrary JavaScript in the job before the only control that protects the
  //    CURRENT run fires. The position is therefore computed over the FULL step list now, against an
  //    explicit allow-list of the three things that may precede.
  //
  //    ⚠ THE TRAILING `@` IS LOAD-BEARING. A bare prefix test would also admit an action whose name
  //    merely BEGINS with a permitted one.
  //
  //    ── ONE IDENTITY PER STEP (plan 19.1-06, review finding CR-02) ────────────────────────────
  //    THE DEFECT THIS REPLACES, AND ITS MEASUREMENT (evidence/guards-06-pre-fix.txt, VECTOR
  //    CR-02). The refusal step is anchored by exact `name:` at `e2eMailStep` above. This predicate
  //    then went and FOUND IT AGAIN, by `findIndex(s => String(s?.run).includes(MAIL_REFUSAL_SCRIPT))`
  //    — a substring of a `run:` body, which is free text. So the job had TWO answers to the
  //    question "which step is the refusal step", and a decoy could make them disagree: a step whose
  //    `run:` is nothing but `echo "…scripts/refuse-mail-credential.mjs…"`, inserted where the real
  //    step used to be, CAPTURED this index, and the real step was then free to sit at the END of
  //    the job. Measured on the tracked file: exit 0, all 55 reported holding, with the only control
  //    that protects the CURRENT run firing after migrate, seed and the entire Playwright suite had
  //    finished — i.e. after the mail this whole invariant exists to prevent had already been sent.
  //    Invariants A and B stayed green throughout, because the step they anchor still existed and
  //    still carried the exact invocation. It was in the wrong PLACE, and this is the only predicate
  //    that was supposed to notice.
  //    THE FIX IS NOT A BETTER SUBSTRING. It is that a step anchored once is anchored ONCE: the
  //    index is now the position of `e2eMailStep` — the very object Invariants A and B assert about
  //    — in the job's own step list. A decoy cannot capture it, because a decoy does not carry the
  //    step's `name:`; and if a decoy DID carry that exact name, `stepNamed` would return the first
  //    of them and Invariant A's exact-invocation conjunct would immediately go red on the `echo`.
  //
  //    ⚠ AND THE ORDERING CLAIM MAY NOT HOLD VACUOUSLY. `e2ePrecede.every(…)` is TRUE over an EMPTY
  //    list, so a refusal step promoted to FIRST in the job satisfied "only checkout, setup-node and
  //    npm ci may precede it" by having nothing precede it at all. MEASURED: exit 0, all 55 holding
  //    (VECTOR VACUOUS-PRECEDE) — over a job where the refusal step runs before `actions/checkout`,
  //    so the script it invokes IS NOT ON DISK YET and the step is a guaranteed failure at best.
  //    The non-empty conjunct is what turns an unfalsifiable claim back into an assertion.
  const E2E_PRECEDE_USES_OK = ["actions/checkout", "actions/setup-node"];
  const E2E_PRECEDE_RUN_OK = "npm ci";
  const iE2eStepRefuse = e2eMailStep === undefined ? -1 : e2eSteps.indexOf(e2eMailStep);
  const e2ePrecede = iE2eStepRefuse >= 0 ? e2eSteps.slice(0, iE2eStepRefuse) : [];
  const describeStep = (s) =>
    s?.uses !== undefined ? `uses:${String(s.uses)}` : `run:${String(s?.run ?? "").trim()}`;
  const onlySetupBefore =
    iE2eStepRefuse >= 0 &&
    e2ePrecede.length > 0 &&
    e2ePrecede.every(
      (s) =>
        String(s?.run ?? "").trim() === E2E_PRECEDE_RUN_OK ||
        E2E_PRECEDE_USES_OK.some((u) => String(s?.uses ?? "").startsWith(`${u}@`)),
    );
  const iE2eMigrate = stepIndexNamed(e2e, CI_E2E_MIGRATE_STEP);
  check(
    `"${CI_E2E_JOB}" refuses a live mail credential BEFORE it migrates, seeds or boots the suite — and ONLY ${E2E_PRECEDE_USES_OK.join("@, ")}@ and \`${E2E_PRECEDE_RUN_OK}\` may precede it, over the FULL step list`,
    iE2eStepRefuse >= 0 &&
      onlySetupBefore &&
      iE2eMigrate >= 0 &&
      iE2eSeed >= 0 &&
      iE2ePlay >= 0 &&
      iE2eStepRefuse < iE2eMigrate &&
      iE2eStepRefuse < iE2eSeed &&
      iE2eStepRefuse < iE2ePlay,
    // Every index below is a position in the FULL step list and every one of them is derived from
    // an exact `name:`, so they are on ONE scale and comparable to what a reader counts in the file.
    `step indices (of ${e2eSteps.length} steps, -1 = ABSENT under that exact name): ` +
      `refusal="${CI_E2E_MAIL_STEP}"=${iE2eStepRefuse}  ` +
      `"${CI_E2E_MIGRATE_STEP}"=${iE2eMigrate}  "${CI_E2E_SEED_STEP}"=${iE2eSeed}  ` +
      `"${CI_E2E_PLAYWRIGHT_STEP}"=${iE2ePlay}  ` +
      `precedes=[${e2ePrecede.map(describeStep).join(", ") || "(NONE — and an ordering claim over an empty preceding set is VACUOUS, which is why it is red)"}]  ` +
      `preceding count=${e2ePrecede.length} (must be > 0)  ` +
      `permitted=[${E2E_PRECEDE_USES_OK.map((u) => `${u}@…`).join(", ")}, run:${E2E_PRECEDE_RUN_OK}]  ` +
      `and that holds=${onlySetupBefore}`,
  );

  // ── THE JOB THAT RUNS THIS SCRIPT EXISTS. ITS ABSENCE IS A HARD STOP, NOT A FAILED CHECK ──────
  // ADDED BY PLAN 19.1-01 (CI-01/SC1, review finding CR-03).
  //
  // THE ARGUMENT IS THE `gate-e2e` ONE ABOVE, IN ITS OWN WORDS, AND IT IS WORSE HERE. Every other
  // assertion in this section is universally quantified over the jobs that REMAIN — "every
  // containerized job pins the image", "no job holds contents: write", "no `secrets.` anywhere". A
  // deleted job satisfies all of them vacuously, so removing `gate-db-free` in one commit would
  // leave this script printing a clean green over the four jobs left. It is worse than the
  // `gate-e2e` case because `gate-db-free` is the job that RUNS THIS SCRIPT: deleting it does not
  // just remove one gate, it removes the thing that evaluates every invariant here, and this file
  // would say so nowhere. The green it printed would be the green of a check that no longer runs.
  //
  // ⚠ A HARD STOP IS NOT A COUNTED INVARIANT (see `hardStop` above), matching the `gate-e2e`
  // precedent exactly: adding this did not move the printed count. The count moved by the ONE
  // `check()` below, not by two. A stop and a check answer different questions — the stop says "the
  // subject is absent, so every assertion is meaningless", the check says "the subject is present
  // and wrong".
  const checker = doc?.jobs?.[CI_CHECKER_JOB];
  if (!checker) {
    hardStop([
      `job "${CI_CHECKER_JOB}" not found in ${CI}.`,
      `Jobs present: [${jobs.map(([n]) => n).join(", ") || "(none)"}]`,
      ``,
      `This job is the one that RUNS ${CHECKER_SCRIPT} — the script printing this message — as`,
      `well as lint, the design gate and the Next build. Deleting it removes the evaluation of`,
      `every invariant in this file, and it removes it INVISIBLY: every other assertion in this`,
      `section is universally quantified over the jobs that remain, so all of them would still`,
      `pass, in a run that no longer happens on any push or pull request.`,
      ``,
      `If this job is genuinely being retired, that is a decision to record — not a deletion to`,
      `absorb. Remove this hard stop in the same commit, and say why in it.`,
    ]);
  }

  // THE DISPLAY NAME IS THE REQUIRED-CHECK CONTEXT. The `gate-e2e` argument above transfers
  // unchanged and is not restated at length: GitHub matches branch protection on `name:`, so a
  // `name:` edit detaches the gate from branch protection while leaving the job — and every
  // invariant over it — perfectly intact. Asserted separately from the KEY, because the key did not
  // move in the mutation that produced this check.
  //
  // WHAT IS DIFFERENT ABOUT THIS JOB, AND WHY THE CONSEQUENCE IS LARGER HERE. This exact string
  // becomes a REQUIRED STATUS CHECK on `main`, and `gate-db-free` is the job that holds lint, the
  // design suite, the Next build AND the step that runs this script. An unbound `gate-db-free` is
  // therefore not one missing gate: it is every invariant in this file, plus every lint rule and
  // every design test, silently no longer required to pass before a merge. That undoes the whole of
  // SC1 at the branch level while the file itself still reads correct — the check above would keep
  // printing `ok`, in a run nothing waits for.
  //
  // MEASURED, NOT SUPPOSED: renaming this `name:` and nothing else left the checker at exit 0 with
  // all 51 invariants reported holding (evidence/guards-01-pre-fix.txt, MUTATION 2).
  //
  // ⚠ THE RENAME IS NOT FORBIDDEN; IT IS REQUIRED TO BE DELIBERATE. It must be paired with an edit
  // to the repository's required-status-check list, which no file here can carry. That pairing is
  // the decision this check exists to make visible.
  check(
    `"${CI_CHECKER_JOB}" declares the exact display name branch protection matches on`,
    String(checker?.name ?? "") === CI_CHECKER_CONTEXT,
    `name=${JSON.stringify(checker?.name ?? null)}  expected=${JSON.stringify(CI_CHECKER_CONTEXT)}  ` +
      `(a required status check is matched by this string; changing it silently unbinds the job ` +
      `that runs ${CHECKER_SCRIPT}, lint, the design suite and the build)`,
  );

  // ── AND THE STEP THAT MAKES IT THE CHECKER'S JOB RATHER THAN JUST A BUILD JOB ─────────────────
  // The stop above closes DELETION OF THE JOB. It does not close the job being kept, correctly
  // named, and made to no longer run this script — which is the cheaper edit and the one CR-03
  // actually performed: two lines, in a job full of comments, under a green build.
  //
  // ANCHORED BY THE STEP'S EXACT `name:`, NEVER BY A SUBSTRING OF ANY `run:` BODY (the `:890` idiom,
  // and PATTERNS.md §F applied on arrival rather than retrofitted). This job's FIRST step already
  // carries a multi-line `run:` of free text — `git config` lines, `echo`s and a here-doc-shaped
  // control block — so a substring anchor in this job would have been capturable on the day it was
  // written, by a step that merely MENTIONS this script's path. A positive assertion must never
  // locate its subject by a substring of a `run:` body: substring matching is safe only in the deny
  // direction, where over-matching produces a false red and therefore fails closed. Used to FIND the
  // thing being asserted about, it hands the anchor to whoever writes the next step.
  //
  // THE THREE CONJUNCTS, AND WHY EACH IS SEPARATELY NECESSARY:
  //   * the step is DEFINED — so an empty or emptied `gate-db-free` makes this FALSE rather than
  //     vacuously true. `Array.prototype.find` over no matching step yields `undefined`, and the key
  //     filter below over `{}` is empty, so without this conjunct the assertion would pass over
  //     nothing. That is the same vacuity the stop above exists to remove, one level in.
  //   * its `run:` is EXACTLY the no-argument invocation, compared after `.trim()` and nothing else.
  //     `.trim()` because a block scalar carries its trailing newline; NO comment-stripping and NO
  //     whitespace collapsing, because a `run:` body is executable text and any further
  //     normalisation would make two genuinely different commands compare equal. See `CHECKER_RUN`
  //     above for why this is equality and never containment.
  //   * it carries NO KEY outside the permitted surface — the allow-list, for the reason stated at
  //     `CHECKER_STEP_ALLOWED_KEYS`.
  // They are ANDed because any one alone is satisfiable by the inert shape: the step existed, and it
  // ran something.
  const checkerSteps = stepsOf(checker);
  const checkerStep = checkerSteps.find((s) => String(s?.name ?? "") === CHECKER_STEP_NAME);
  const checkerStepRun = String(checkerStep?.run ?? "");
  // Sorted, because YAML mapping order is an authoring accident and a diagnostic that changes with
  // it is not stable across runs. Membership is EXACT string equality, so a differently-cased or
  // differently-suffixed spelling of a permitted key lands OUTSIDE the allow-list and is red.
  const checkerStepKeys = Object.keys(checkerStep ?? {}).sort();
  const checkerStepExtraKeys = checkerStepKeys.filter(
    (k) => !CHECKER_STEP_ALLOWED_KEYS.includes(k),
  );
  // Computed HERE rather than inline in the evidence string below, so the predicate region of the
  // `check()` contains NOT ONE containment- or search-shaped call in any spelling. That is checkable
  // by anybody with a grep over the region, which is the point: the one property this invariant most
  // needs a reader to be able to confirm at a glance is that its invocation conjunct is an equality.
  // An `Array.prototype.indexOf` reporting a step's POSITION is not a containment test, but it reads
  // like one to an audit that counts method names, and a reader who has to make that distinction has
  // already lost the glance.
  const checkerStepIndex = checkerSteps.indexOf(checkerStep);
  check(
    `"${CI_CHECKER_JOB}" carries the step that RUNS this checker, under its exact name, with the EXACT no-argument invocation, and NO KEY OUTSIDE [${CHECKER_STEP_ALLOWED_KEYS.join(", ")}]`,
    checkerStep !== undefined &&
      checkerStepRun.trim() === CHECKER_RUN &&
      checkerStepExtraKeys.length === 0,
    `step=${checkerStep ? `index ${checkerStepIndex}` : "(ABSENT)"}  ` +
      `expected-name=${JSON.stringify(CHECKER_STEP_NAME)}  ` +
      `run=${JSON.stringify(checkerStep ? checkerStepRun.trim() : null)}  ` +
      `expected-run=${JSON.stringify(CHECKER_RUN)}  ` +
      `keys=[${checkerStepKeys.join(", ") || "(none)"}]  ` +
      `permitted=[${CHECKER_STEP_ALLOWED_KEYS.join(", ")}]  ` +
      `unexpected=[${checkerStepExtraKeys.join(", ") || "(none)"}]  ` +
      `(of ${checkerSteps.length} steps in "${CI_CHECKER_JOB}")`,
  );

  // ── AND THE STEP THAT CARRIES LINT, THE DESIGN SUITE AND THE BUILD ────────────────────────────
  // ADDED BY PLAN 19.1-05 (CI-01/SC1). A SIBLING of the check above, in its exact shape: the same
  // exact-`name:` anchor, the same trimmed exact-equality invocation, the same positively-stated
  // allow-list. The three conjuncts are separately necessary for the three reasons given above and
  // they are not restated here.
  //
  // WHAT IS DIFFERENT, AND IT IS THE REASON THIS CHECK IS NOT OPTIONAL. `npm run build` runs
  // `test:design`, and `test:design` is where `tests/design/workflow-invariants.test.ts` lives —
  // the standing mutation suite that holds every case this phase has written, the ones protecting
  // the check above included. An unasserted build step means the suite that remembers all of this
  // can be removed from CI in one line, under a green from the very script it protects.
  //
  // THE ALLOW-LIST IS THE OTHER ONE, DELIBERATELY. `BUILD_STEP_ALLOWED_KEYS` admits `env` and
  // `CHECKER_STEP_ALLOWED_KEYS` does not; see their declarations for why they must not be merged.
  // The evidence line prints the offending key NAMES and never a value from that map — those three
  // placeholders are build-only literals rather than secrets, and printing them anyway would be a
  // habit that costs nothing here and everything on the step where it is wrong.
  const buildStep = checkerSteps.find((s) => String(s?.name ?? "") === BUILD_STEP_NAME);
  const buildStepRun = String(buildStep?.run ?? "");
  const buildStepKeys = Object.keys(buildStep ?? {}).sort();
  const buildStepExtraKeys = buildStepKeys.filter((k) => !BUILD_STEP_ALLOWED_KEYS.includes(k));
  // Hoisted above the `check()` for the reason the sibling index above is hoisted: the predicate
  // region stays containment-free to a grep, so the one property a reader most needs to confirm at
  // a glance — that the invocation conjunct is an EQUALITY — survives that glance.
  const buildStepIndex = checkerSteps.indexOf(buildStep);
  check(
    `"${CI_CHECKER_JOB}" carries the step that runs lint, the design suite and the build, under its exact name, with the EXACT no-argument invocation, and NO KEY OUTSIDE [${BUILD_STEP_ALLOWED_KEYS.join(", ")}]`,
    buildStep !== undefined &&
      buildStepRun.trim() === BUILD_RUN &&
      buildStepExtraKeys.length === 0,
    `step=${buildStep ? `index ${buildStepIndex}` : "(ABSENT)"}  ` +
      `expected-name=${JSON.stringify(BUILD_STEP_NAME)}  ` +
      `run=${JSON.stringify(buildStep ? buildStepRun.trim() : null)}  ` +
      `expected-run=${JSON.stringify(BUILD_RUN)}  ` +
      `keys=[${buildStepKeys.join(", ") || "(none)"}]  ` +
      `permitted=[${BUILD_STEP_ALLOWED_KEYS.join(", ")}]  ` +
      `unexpected=[${buildStepExtraKeys.join(", ") || "(none)"}]  ` +
      `(of ${checkerSteps.length} steps in "${CI_CHECKER_JOB}")`,
  );

  // ── UNCONDITIONAL — THE JOB *AND* EVERY STEP OF IT ────────────────────────────────────────────
  // ADDED BY PLAN 19.1-05 (CI-01/SC1). A SIBLING of `gate-e2e`'s unconditional invariant above, in
  // its exact shape, over a different job. The full argument lives at that site and is not
  // restated; two things about it transfer verbatim and are worth naming here because they are the
  // parts that were paid for twice:
  //
  //   * PRESENCE, NEVER VALUE, AT BOTH LEVELS. A key that should never appear on a gate has NO
  //     LEGITIMATE VALUE TO CARVE OUT, so every value comparison is one alternative spelling away
  //     from green. This file has already recorded THREE spellings of `continue-on-error` — the
  //     literal boolean, the Actions expression (which parses to a STRING, so `=== true` and
  //     `!== true` were both green for the same input), and the quoted string.
  //   * THE QUANTIFIER REACHES EVERY STEP AND NOT ONLY THE JOB. A softening key on ONE step is the
  //     same defeat as one on the job: measured here (evidence/guards-05-pre-fix.txt, MUTATION 6),
  //     `if: false` on the build step alone left the checker at exit 0 with all 52 reported holding
  //     — with lint, the design suite and the build all skipped.
  //
  // MEASURED AT JOB LEVEL TOO (MUTATION 2): `continue-on-error: true` on `gate-db-free` left exit 0
  // and all 52 holding, over a job that could no longer fail a pull request.
  //
  // ⚠ A DELIBERATE CONDITION IS A DECISION TO RECORD, NOT ONE TO ABSORB — AT EITHER LEVEL. If this
  // job or any step in it is genuinely meant to become conditional or soft-failing, remove this
  // invariant in the same commit and say why in it.
  const checkerConditionalSteps = checkerSteps
    // Index from the FULL step list, BEFORE filtering, so `step[2]` names the third step OF THE JOB
    // rather than the third offender. Declared order is preserved and nothing is sorted or
    // de-duped: two offending steps must stay distinguishable and the line must be stable across
    // runs. Same mapping-before-filtering shape as the `gate-e2e` sibling, carried across.
    .map((s, i) => ({ step: s, label: String(s?.name ?? `step[${i}]`) }))
    .filter(({ step }) => step?.if !== undefined || step?.["continue-on-error"] !== undefined)
    .map(({ label }) => label);
  check(
    `"${CI_CHECKER_JOB}" is unconditional — no if:, no continue-on-error: AT ALL, on the JOB or on ANY STEP`,
    checker?.if === undefined &&
      checker?.["continue-on-error"] === undefined &&
      checkerConditionalSteps.length === 0,
    `job if=${JSON.stringify(checker?.if ?? null)}  ` +
      `job continue-on-error=${JSON.stringify(checker?.["continue-on-error"] ?? null)}  ` +
      `conditional/soft steps=[${checkerConditionalSteps.join(", ") || "(none)"}]  ` +
      // The total is printed so a reader can tell an EMPTY step list from a CLEAN one. Both report
      // no offenders; only one of them is this job.
      `(of ${checkerSteps.length} steps)`,
  );

  // ── AND THE JOB'S WHOLE KEY SURFACE, AS AN ALLOW-LIST ─────────────────────────────────────────
  // ADDED FOR 19.1-REVIEW.md CR-01. A SIBLING of the check immediately above, and NOT a replacement
  // for it — that one quantifies over EVERY STEP of the job, this one is about the job's own keys,
  // and neither subsumes the other. The full argument, the four measured vectors and the reason
  // this list omits `services` while its `gate-e2e` twin permits it are all at the declaration of
  // `CHECKER_JOB_ALLOWED_KEYS`; they are not restated here.
  //
  // ⚠ WHY THE CONSEQUENCE IS LARGER ON THIS JOB THAN ON ITS TWIN. This job's `name:` is the
  // REQUIRED STATUS CHECK, and this job holds lint, the whole design suite, the Next build and the
  // step that runs this script. `needs:` here is the false-green vector in full: a job skipped
  // because a needed job failed reports conclusion `skipped`, GitHub's required-check evaluation
  // treats skipped as PASSING, and the merge gate then goes green over a run in which not one of
  // those four things happened. That is this phase's own subject — a green that measures nothing —
  // arriving through the gate the phase built.
  const checkerJobKeys = Object.keys(checker ?? {}).sort();
  const checkerJobExtraKeys = checkerJobKeys.filter((k) => !CHECKER_JOB_ALLOWED_KEYS.includes(k));
  check(
    `"${CI_CHECKER_JOB}" carries NO JOB-LEVEL KEY OUTSIDE [${CHECKER_JOB_ALLOWED_KEYS.join(", ")}] — needs: and if: stop this job running, strategy: renames its check context, and each leaves its name: byte-identical`,
    checkerJobExtraKeys.length === 0,
    `job keys=[${checkerJobKeys.join(", ") || "(none)"}]  ` +
      `permitted=[${CHECKER_JOB_ALLOWED_KEYS.join(", ")}]  ` +
      `unexpected=[${checkerJobExtraKeys.join(", ") || "(none)"}]  ` +
      `(a key here is not forbidden forever — it is required to be DELIBERATE. If this job is ` +
      `genuinely meant to gain one, add it to CHECKER_JOB_ALLOWED_KEYS in the same commit and say ` +
      `why in it. \`services\` is absent from that list on purpose: this is the DB-FREE job)`,
  );

  // ── THE INTERPRETER, PINNED ON THIS JOB ───────────────────────────────────────────────────────
  // ADDED BY PLAN 19.1-05 (CI-01/SC1). A SIBLING of the workflow-and-`gate-e2e` defaults predicate
  // above, and DELIBERATELY NOT A WIDENING OF IT.
  //
  // ⚠ WHY A SIBLING RATHER THAN ONE PREDICATE COVERING BOTH JOBS. That check's own comment argues a
  // scope — "SCOPED TO THE WORKFLOW AND TO THIS JOB, DELIBERATELY … asserting over EVERY job would
  // redden a correct file the day somebody legitimately sets a working directory elsewhere". Adding
  // `gate-db-free` to its conjunct list would leave that argument attached to a predicate that no
  // longer has the scope it argues for, and a predicate whose printed name is broader than its
  // conjunct list is the exact defect class this round exists to close. Its `CI_E2E_JOB` argument
  // and its comment are therefore untouched, and the workflow level stays asserted there rather
  // than being asserted twice.
  //
  // THE WHOLE BLOCK IS FORBIDDEN, NOT ONE KEY INSIDE IT, for the reason given at that site:
  // `undefined` is the only passing value, so a present-but-EMPTY `defaults:` is red too. A block
  // that exists is a block a later edit can fill, and the reviewer of that edit sees a one-line
  // diff inside an accepted structure.
  //
  // MEASURED (evidence/guards-05-pre-fix.txt, MUTATION 3): a three-line `defaults: run: shell:` on
  // this job left the checker at exit 0 with all 52 reported holding — under an interpreter that
  // PRINTS each step's `run:` body instead of executing it. Every step in the job, including the
  // one invoking this very script, becomes a no-op exiting 0.
  check(
    `"${CI_CHECKER_JOB}" runs its steps with the runner's DEFAULT interpreter — NO defaults: block on the job`,
    checker?.defaults === undefined,
    `job defaults=${JSON.stringify(checker?.defaults ?? null)}  ` +
      `(the workflow level is asserted by the "${CI_E2E_JOB}" sibling above, not twice here)`,
  );

  // ── THE COMPARISON JOB EXISTS. ITS ABSENCE IS A HARD STOP, NOT A FAILED CHECK ─────────────────
  const visual = doc?.jobs?.[CI_VISUAL_JOB];
  if (!visual) {
    hardStop([
      `job "${CI_VISUAL_JOB}" not found in ${CI}.`,
      `Jobs present: [${jobs.map(([n]) => n).join(", ") || "(none)"}]`,
      ``,
      `THIS IS THE GAP PLAN 12-15 CLOSES. The job that COMPARES visual baselines needs the same`,
      `seeded database the job that WRITES them already has. Without it, run 32216145319's shape`,
      `repeats: 36 tests fail with \`connect ECONNREFUSED ${SENTINEL}\` because the DB-backed`,
      `surfaces render an error boundary and their reachability hooks find no subject.`,
      ``,
      `Every assertion below — the container, the service, the project name, the migrate/seed`,
      `order, and every cross-file identity — is about this job. Reporting them as "passed" while`,
      `it does not exist would be the vacuous green this script exists to remove.`,
    ]);
  }

  const visualRuns = runsOf(visual);
  check(
    `"${CI_VISUAL_JOB}" runs IN the pinned Playwright container`,
    String(visual?.container?.image ?? "") === EXPECTED_IMAGE,
    `container.image=${visual?.container?.image ?? "(absent)"}  expected=${EXPECTED_IMAGE}`,
  );
  check(
    `"${CI_VISUAL_JOB}" declares a \`postgres\` service`,
    visual?.services?.postgres != null,
    `services=${JSON.stringify(Object.keys(visual?.services ?? {}))}`,
  );
  check(
    `"${CI_VISUAL_JOB}" holds no permissions: block — it inherits the workflow default contents: read`,
    visual?.permissions == null,
    `job permissions=${JSON.stringify(visual?.permissions ?? null)}`,
  );

  // `--project=visual` BY NAME. The project name is a segment of every baseline filename
  // (`{arg}-visual-linux.png`, measured in 11-RESEARCH Finding 1), so renaming it orphans all 52
  // committed baselines at once — and `npm run test:e2e` here would re-open the whole e2e surface
  // D-24 closed.
  //
  // ⚠ ASKED OF THE NAMED STEP, NOT OF THE JOB (plan 19.1-06, RESEARCH.md inventory row 6). The
  // superseded form was an existential over EVERY run body in the job. THE MEASUREMENT
  // (evidence/guards-06-pre-fix.txt, VECTOR VISUAL-PROJECT): a decoy step whose entire body is
  // `echo "…npx playwright test --project=visual…"`, with THIS step's own invocation switched to
  // `--project=chromium`, left the checker at exit 0 with ALL 55 REPORTED HOLDING — including this
  // invariant, whose printed name is the claim that the visual project runs by name. GATE-01's
  // comparison would not have run at all; the job would have collected the functional suite
  // instead, and the 52 committed baselines would have gone uncompared under a green check.
  const visualPlayStep = stepNamed(visual, CI_VISUAL_PLAYWRIGHT_STEP);
  const visualPlayRun = runOfStep(visualPlayStep);
  const runsVisualProject =
    visualPlayStep !== undefined &&
    visualPlayRun.includes("playwright test") &&
    visualPlayRun.includes(CI_VISUAL_PROJECT);
  check(
    `"${CI_VISUAL_JOB}" runs the visual project BY NAME (${CI_VISUAL_PROJECT}), on the step named "${CI_VISUAL_PLAYWRIGHT_STEP}"`,
    runsVisualProject,
    `step="${CI_VISUAL_PLAYWRIGHT_STEP}" ${visualPlayStep ? `at index ${stepIndexNamed(visual, CI_VISUAL_PLAYWRIGHT_STEP)}` : "(ABSENT)"}  ` +
      `run=${JSON.stringify(visualPlayStep ? visualPlayRun : null)}  ` +
      `must contain=["playwright test", ${JSON.stringify(CI_VISUAL_PROJECT)}]  ` +
      `(of ${stepsOf(visual).length} steps)`,
  );

  // MIGRATE → SEED → PLAYWRIGHT, IN THAT ORDER. A seed after the comparison is a seed that changed
  // nothing, and the comparison then photographs an empty database.
  //
  // ⚠ THE SAME REPAIR AS `gate-e2e`'s ORDERING, ONE JOB OVER, AND IT TRANSFERS WITHOUT A NEW SHAPE
  // because every step of this job carries an exact `name:` (plan 19.1-06, inventory row 6). THE
  // MEASUREMENT (VECTOR VISUAL-ORDER): a decoy mentioning the seed script placed after migrate,
  // with the REAL seed step moved after the Playwright step, left THIS invariant GREEN. The run did
  // go red — but on `the two visual jobs' seed run commands are byte-identical`, in the `cross`
  // section, for a completely different property, and only because that predicate happens to pick
  // the same decoy. A red that arrives from an unrelated predicate is not coverage: move the build
  // one job over, or make the decoy byte-identical to `baselines.yml`'s seed command, and the
  // accident goes away while this invariant's own claim stays false.
  const iMigrate = stepIndexNamed(visual, CI_VISUAL_MIGRATE_STEP);
  const iSeed = stepIndexNamed(visual, CI_VISUAL_SEED_STEP);
  const iPlay = stepIndexNamed(visual, CI_VISUAL_PLAYWRIGHT_STEP);
  check(
    `"${CI_VISUAL_JOB}" runs migrate, then seed, then playwright — IN THAT ORDER`,
    iMigrate >= 0 && iSeed >= 0 && iPlay >= 0 && iMigrate < iSeed && iSeed < iPlay,
    `step indices: "${CI_VISUAL_MIGRATE_STEP}"=${iMigrate}  "${CI_VISUAL_SEED_STEP}"=${iSeed}  ` +
      `"${CI_VISUAL_PLAYWRIGHT_STEP}"=${iPlay}  ` +
      `(of ${stepsOf(visual).length} steps; -1 means the step is ABSENT under that exact name)`,
  );

  console.log(
    `\n  parsed values (ci):\n` +
      `    jobs                ${JSON.stringify(jobs.map(([n]) => n))}\n` +
      `    triggers            ${JSON.stringify(triggersOf(doc))}\n` +
      `    workflow perms      ${JSON.stringify(doc?.permissions ?? null)}\n` +
      `    concurrency.group   ${ciGroup}\n` +
      `    containerized       ${JSON.stringify(containerJobs.map(([n]) => n))}\n` +
      `    service images      ${JSON.stringify(serviceImages)}\n` +
      `    DATABASE_URL        ${JSON.stringify(
        Object.fromEntries(jobs.filter(([, j]) => typeof j?.env?.DATABASE_URL === "string").map(([n, j]) => [n, j.env.DATABASE_URL])),
      )}\n` +
      `    run commands        ${ciRunCount} (${minters.length} with ${SNAPSHOT_UPDATE_FLAG})\n` +
      `    ${CI_VISUAL_JOB} runs   ${JSON.stringify(visualRuns)}`,
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION `cross` — THE INVARIANTS THAT EXIST ONLY BETWEEN THE TWO FILES.
// No assertion living inside one file can state these, which is why the checker is named for
// neither. The compared tree is the captured tree only if both visual jobs seed the same way.
// ════════════════════════════════════════════════════════════════════════════════════════════════
if (sections.includes("cross")) {
  currentSection = "cross";
  const ciDoc = workflow(CI);
  const blDoc = workflow(BASELINES);
  const capture = blDoc?.jobs?.[BASELINES_JOB];
  const compare = ciDoc?.jobs?.[CI_VISUAL_JOB];
  banner(`cross — ${BASELINES} × ${CI}`);

  if (!capture || !compare) {
    hardStop([
      `the two visual jobs are "${BASELINES_JOB}" (${BASELINES}) and "${CI_VISUAL_JOB}" (${CI}).`,
      `${BASELINES_JOB}: ${capture ? "present" : "ABSENT"}`,
      `${CI_VISUAL_JOB}: ${compare ? "present" : "ABSENT"}`,
      ``,
      `Every cross-file identity below compares those two jobs. With one of them missing there is`,
      `nothing to compare, and a green here would assert that the capture and compare paths agree`,
      `when one of them does not exist.`,
    ]);
  }

  // ── ONE IMAGE TAG, ACROSS BOTH FILES, EQUAL TO THE INSTALLED PACKAGE (T-11-VERDRIFT) ──────────
  // Four tags and a package now move together or none of them do. A mismatch turns every baseline in
  // the repository into noise on the same day, and the failure reads as 52 unrelated regressions.
  const allContainers = [
    ...jobsOf(blDoc).filter(([, j]) => j?.container).map(([n, j]) => ({ file: "baselines.yml", job: n, image: String(j.container.image ?? "") })),
    ...jobsOf(ciDoc).filter(([, j]) => j?.container).map(([n, j]) => ({ file: "ci.yml", job: n, image: String(j.container.image ?? "") })),
  ];
  const imageSet = [...new Set(allContainers.map((c) => c.image))];
  check(
    "every container image in BOTH files is the same string and equals the installed @playwright/test",
    allContainers.length > 0 && imageSet.length === 1 && imageSet[0] === EXPECTED_IMAGE,
    `${allContainers.length} container(s): [${allContainers.map((c) => `${c.file}:${c.job}=${c.image}`).join(", ")}]  ` +
      `distinct=${imageSet.length}  expected=${EXPECTED_IMAGE}`,
  );

  // ── ONE POSTGRES IMAGE, ACROSS BOTH FILES ─────────────────────────────────────────────────────
  const allServices = [
    ...jobsOf(blDoc).flatMap(([n, j]) => Object.entries(j?.services ?? {}).map(([s, v]) => ({ file: "baselines.yml", job: n, svc: s, image: String(v?.image ?? "") }))),
    ...jobsOf(ciDoc).flatMap(([n, j]) => Object.entries(j?.services ?? {}).map(([s, v]) => ({ file: "ci.yml", job: n, svc: s, image: String(v?.image ?? "") }))),
  ];
  const serviceImageSet = [...new Set(allServices.map((s) => s.image))];
  check(
    "every postgres service image in BOTH files is the same string",
    allServices.length > 0 && serviceImageSet.length === 1,
    `${allServices.length} service(s): [${allServices.map((s) => `${s.file}:${s.job}.${s.svc}=${s.image}`).join(", ")}]  ` +
      `distinct=[${serviceImageSet.join(", ")}]`,
  );

  // ── THE TWO VISUAL JOBS READ THE SAME DATABASE_URL, BYTE FOR BYTE ─────────────────────────────
  const captureUrl = capture?.env?.DATABASE_URL;
  const compareUrl = compare?.env?.DATABASE_URL;
  check(
    "the two visual jobs' DATABASE_URL values are byte-identical",
    typeof captureUrl === "string" && captureUrl === compareUrl,
    `${BASELINES_JOB}=${captureUrl ?? "(absent)"}\n          ${CI_VISUAL_JOB}=${compareUrl ?? "(absent)"}`,
  );

  // ── THE DEFECT BEING CLOSED, WRITTEN AS AN ASSERTION ──────────────────────────────────────────
  // Plan 12-14 Task 1's own read_first had already written the rule it then failed to apply: "the
  // seed path must produce the same fixture in both jobs, or the comparison measures a different
  // tree than the one that was captured." Run 32216145319 is what that costs. It is a standing
  // assertion now, so it cannot recur silently.
  //
  // ⚠ BOTH SIDES ARE NAME-ANCHORED NOW, AND THE VECTOR THAT BOUGHT IT IS THE NASTIEST IN THIS PLAN
  // (plan 19.1-06, audit row 12 — a site the research inventory did not list). The superseded
  // helper was `pick = (runs, needle) => runs.find(r => r.includes(needle))` — the FIRST run body
  // in the job mentioning the needle, on BOTH sides. A decoy in ONE job would have made the two
  // picks differ and gone red, which is why this looked safe. But IDENTICAL decoys in BOTH jobs
  // make the two picks identical to each other — they are the same `echo` — and the comparison then
  // holds between two strings that are not the commands either job runs.
  // MEASURED (evidence/guards-06-pre-fix.txt, VECTOR CROSS-PICK): identical decoy steps mentioning
  // `db:migrate` added to both jobs, with the REAL migrate commands changed to
  // `--baselines-only` on one side and `--ci-only` on the other — exit 0, all 55 reported holding.
  // The machine that COMPARES would have migrated differently from the machine that SHOT, which is
  // exactly and only the property D-27 exists to guarantee, reported green by the invariant whose
  // printed name is that guarantee.
  const captureRuns = runsOf(capture);
  const compareRuns = runsOf(compare);
  const captureMigrate = runOfStep(stepNamed(capture, BASELINES_MIGRATE_STEP)) || undefined;
  const compareMigrate = runOfStep(stepNamed(compare, CI_VISUAL_MIGRATE_STEP)) || undefined;
  // ⚠ THE THIRD CONJUNCT IS THE ONE THIS CHECK LOST AND ITS SEED SIBLING KEPT (19.1-REVIEW.md
  // WR-04). Name-anchoring both sides closes the decoy vector in ONE direction only: identical
  // decoys on both sides make the two picks differ from the real commands but stay identical TO
  // EACH OTHER, and a pure byte-identity comparison then holds between two strings that are neither
  // job's migrate command. Anchoring by `name:` moved the vector rather than removing it — the same
  // `echo` can be written under the right step NAME on both sides.
  //
  // MEASURED (evidence/guards-review-cr01-wr04-pre-fix.txt, WR-04): the `run:` of the step named
  // `${BASELINES_MIGRATE_STEP}` replaced on BOTH sides with the identical line
  // `echo "no migration here at all"` — exit 0, all 55 reported holding. Neither visual job
  // migrated its database, and nothing else in this file asserts that anything runs the migration
  // at all (`grep -n 'db:migrate'` returns only comments and step-NAME constants).
  //
  // The runtime blast radius is smaller than the `gate-db-free` finding — the seed step would fail
  // against an unmigrated database, so the job goes red anyway — but a one-sided assertion sitting
  // three lines above the correct spelling of itself reads as deliberate to the next auditor, and
  // "it happens to fail for another reason" is not the property this invariant's name claims.
  //
  // ⚠ SUBSTRING, AND IT IS SAFE HERE BECAUSE IT IS A CONJUNCT IN THE DENY DIRECTION (PATTERNS §F).
  // It does not LOCATE the step — `stepNamed` above does that, by exact `name:`. It only refuses a
  // located command that does not name the migration, so over-matching produces a false RED.
  const MIGRATE = "db:migrate";
  check(
    `the two visual jobs' migrate run commands are byte-identical and both name ${MIGRATE}`,
    typeof captureMigrate === "string" &&
      captureMigrate === compareMigrate &&
      captureMigrate.includes(MIGRATE),
    `${BASELINES_JOB}."${BASELINES_MIGRATE_STEP}"="${captureMigrate ?? "(absent)"}"  ` +
      `${CI_VISUAL_JOB}."${CI_VISUAL_MIGRATE_STEP}"="${compareMigrate ?? "(absent)"}"  ` +
      `must name=${MIGRATE}`,
  );

  const SEED = "scripts/seed-baseline-fixtures.ts";
  const captureSeed = runOfStep(stepNamed(capture, BASELINES_SEED_STEP)) || undefined;
  const compareSeed = runOfStep(stepNamed(compare, CI_VISUAL_SEED_STEP)) || undefined;
  check(
    `the two visual jobs' seed run commands are byte-identical and both name ${SEED}`,
    typeof captureSeed === "string" &&
      captureSeed === compareSeed &&
      captureSeed.includes(SEED),
    `${BASELINES_JOB}."${BASELINES_SEED_STEP}"="${captureSeed ?? "(absent)"}"  ` +
      `${CI_VISUAL_JOB}."${CI_VISUAL_SEED_STEP}"="${compareSeed ?? "(absent)"}"  must name=${SEED}`,
  );

  // ── NEITHER VISUAL JOB BUILDS BEFORE ITS PLAYWRIGHT STEP ──────────────────────────────────────
  // The capture job runs `next dev` against a clean tree. If the compare job builds first, it runs
  // the same dev server with a production `.next` already on disk — an asymmetry between the machine
  // that shot and the machine that compares, which is exactly what D-27 exists to make impossible.
  const buildsBeforePlaywright = (runs) => {
    const b = runs.findIndex((r) => r.includes("npm run build"));
    const p = runs.findIndex((r) => r.includes("playwright test"));
    return b >= 0 && (p < 0 || b < p);
  };
  check(
    "neither visual job runs `npm run build` before its playwright step",
    !buildsBeforePlaywright(captureRuns) && !buildsBeforePlaywright(compareRuns),
    `${BASELINES_JOB}=${JSON.stringify(captureRuns)}\n          ${CI_VISUAL_JOB}=${JSON.stringify(compareRuns)}`,
  );

  // ── EXACTLY ONE WRITE PATH IN THE WHOLE TREE, AND IT IS IN baselines.yml (T-11-BASEMINT) ──────
  // Counted over every workflow file present, not over the two this script knows by name — a third
  // workflow added later with the flag in it is exactly the edit this must catch.
  const workflowFiles = readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/i.test(f)).sort();
  const carriers = [];
  const mailTokenCounts = [];
  for (const file of workflowFiles) {
    const raw = readFileSync(`${WORKFLOW_DIR}/${file}`, "utf8");
    const occurrences = raw.split(MAIL_KEY_PREFIX).length - 1;
    if (occurrences > 0) mailTokenCounts.push(`${file}:${occurrences}`);
    const d = parse(raw);
    for (const [jobName, j] of jobsOf(d)) {
      for (const r of runsOf(j)) {
        if (r.includes(SNAPSHOT_UPDATE_FLAG)) carriers.push(`${file}:${jobName}`);
      }
    }
  }
  check(
    `across ${WORKFLOW_DIR}/ exactly ONE run command carries ${SNAPSHOT_UPDATE_FLAG}, and it is in baselines.yml`,
    carriers.length === 1 && carriers[0].startsWith("baselines.yml:"),
    `files scanned=[${workflowFiles.join(", ")}]  carriers=[${carriers.join(", ") || "(none)"}]`,
  );

  // ── AND THE WORKFLOW DIRECTORY SPELLS NO MAIL-PROVIDER TOKEN AT ALL (D-14, plan 19-12) ────────
  // The exact sibling of the check above, over the other token this repository refuses to let a
  // workflow file carry. `grep -c <provider> .github/workflows/` returning 0 is this repository's
  // OWN CHEAPEST AUDIT of "this workflow cannot mail real people", and it is the reason the prefix
  // is spelled once in THIS file and never over there — prose about a forbidden token is still the
  // token, so the rule binds comments too. Until now that audit was a thing a human had to remember
  // to run; here it becomes an invariant, in the one file allowed to name what it counts.
  //
  // MEASURED, NOT SUPPOSED: this was RED at the start of plan 19-12. `ci.yml` carried exactly ONE
  // occurrence, in the inert refusal step's `env:` VALUE — the same Actions context expression whose
  // emptiness made that control incapable of firing. Removing it took the count to 0; this invariant
  // is what stops it coming back, whether as an `env:` value or as a well-meant comment explaining
  // why it must not appear.
  //
  // ⚠ RAW TEXT, NOT PARSED YAML, DELIBERATELY. A parse-based scan sees keys and values; this one
  // must also see comments, because a comment carrying the token breaks the grep audit exactly as
  // completely as a value does.
  check(
    `across ${WORKFLOW_DIR}/ the mail-provider token appears ZERO times, in values AND in comments`,
    mailTokenCounts.length === 0,
    `files scanned=[${workflowFiles.join(", ")}]  prefix=${MAIL_KEY_PREFIX}  ` +
      `occurrences=[${mailTokenCounts.join(", ") || "(none)"}]`,
  );

  console.log(
    `\n  parsed values (cross):\n` +
      `    container images    ${JSON.stringify(imageSet)}\n` +
      `    service images      ${JSON.stringify(serviceImageSet)}\n` +
      `    DATABASE_URL        ${captureUrl ?? "(absent)"}\n` +
      `    capture runs        ${JSON.stringify(captureRuns)}\n` +
      `    compare runs        ${JSON.stringify(compareRuns)}\n` +
      `    workflow files      ${JSON.stringify(workflowFiles)}\n` +
      `    write-path carriers ${JSON.stringify(carriers)}`,
  );
}

// ── A SELECTED SECTION THAT CHECKED NOTHING IS A HARD STOP ──────────────────────────────────────
// Same spirit as the absent-job stops above, one level up: a section that silently registers zero
// invariants reports SUCCESS, which is worse than one that fails.
const empty = sections.filter((s) => counts.get(s) === 0);
if (empty.length > 0) {
  hardStop([
    `selected section(s) [${empty.join(", ")}] registered ZERO invariants.`,
    `counts=${JSON.stringify(Object.fromEntries(sections.map((s) => [s, counts.get(s)])))}`,
    ``,
    `A section that checks nothing and exits 0 is a green that means nothing.`,
  ]);
}

const total = sections.reduce((n, s) => n + counts.get(s), 0);
console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} of ${total} invariant(s) FAILED:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `All ${total} invariants hold across ${sections.length} section(s) ` +
    `(${sections.map((s) => `${s}=${counts.get(s)}`).join(", ")}).`,
);
