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

// THE FUNCTIONAL-SUITE JOB, AND THE DISPLAY NAME BRANCH PROTECTION MATCHES ON (plan 19-08, D-15,
// T-19-40). Two spellings, deliberately, because they are two different things:
//   * `CI_E2E_JOB` is the YAML job KEY. Its absence is a hard stop below.
//   * `CI_E2E_CONTEXT` is the job's `name:` — the string a REQUIRED STATUS CHECK is matched by.
// GitHub matches a required check by its display name, not by the job key, so an edit to `name:`
// alone silently detaches the gate from branch protection while every other invariant in this file
// still holds. That is T-19-40's quieter half and it is why the name is asserted, not just the key.
const CI_E2E_JOB = "gate-e2e";
const CI_E2E_CONTEXT = "gate-e2e (functional Playwright suite)";

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
const triggersOf = (doc) =>
  doc?.on == null ? [] : typeof doc.on === "string" ? [doc.on] : Object.keys(doc.on);

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
  const stagesGlob = runs.some((r) => r.includes('git add -- "*-visual-linux.png"'));
  check(
    "a run command stages exactly the *-visual-linux.png glob",
    stagesGlob,
    stagesGlob ? 'found: git add -- "*-visual-linux.png"' : "no run command stages the Linux glob",
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
  // All three below quantify over `e2eRuns` — the job's RUN COMMANDS — so a job whose steps are
  // emptied makes each of them FALSE rather than vacuously true: an existential over an empty list
  // is false, and an index comparison over an empty list has no non-negative indices to compare.
  const e2eRuns = runsOf(e2e);

  // 1. THE FUNCTIONAL PROJECT BY NAME, not "some Playwright command exists". `--project=chromium`
  //    is what selects `testMatch: "e2e/*.spec.ts"` in playwright.config.ts, so naming the project
  //    IS naming the whole functional set; a bare `playwright test` would ALSO collect the `visual`
  //    project that job 4 owns and whose committed baselines this job must never touch. This is
  //    verbatim the argument the `gate-visual` block one screen below makes for `--project=visual`
  //    — it transfers unchanged, and is not restated at length here.
  check(
    `"${CI_E2E_JOB}" runs the functional project BY NAME (--project=chromium)`,
    e2eRuns.some((r) => r.includes("playwright test") && r.includes("--project=chromium")),
    `run commands=${JSON.stringify(e2eRuns)}`,
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

  // 3. SEED BEFORE SUITE, COMPARED BY INDEX. Presence alone is not the property: a seed that runs
  //    after the suite is a seed that changed nothing, and this job's own step comment records that
  //    FIVE named specs fail against an empty catalogue and say so in their own messages. Same
  //    shape as the `gate-visual` migrate → seed → playwright ordering check below.
  const iE2eSeed = e2eRuns.findIndex((r) => r.includes("db:seed"));
  const iE2ePlay = e2eRuns.findIndex((r) => r.includes("playwright test"));
  check(
    `"${CI_E2E_JOB}" seeds the demo catalogue BEFORE it runs the suite`,
    iE2eSeed >= 0 && iE2ePlay >= 0 && iE2eSeed < iE2ePlay,
    `indices: db:seed=${iE2eSeed}  playwright=${iE2ePlay}  (of ${e2eRuns.length} run commands)`,
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
  const e2eMailStep = stepsOf(e2e).find((s) => String(s?.name ?? "") === CI_E2E_MAIL_STEP);
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
  const e2eSteps = stepsOf(e2e);
  const E2E_PRECEDE_USES_OK = ["actions/checkout", "actions/setup-node"];
  const E2E_PRECEDE_RUN_OK = "npm ci";
  const iE2eStepRefuse = e2eSteps.findIndex((s) =>
    String(s?.run ?? "").includes(MAIL_REFUSAL_SCRIPT),
  );
  const e2ePrecede = iE2eStepRefuse >= 0 ? e2eSteps.slice(0, iE2eStepRefuse) : [];
  const describeStep = (s) =>
    s?.uses !== undefined ? `uses:${String(s.uses)}` : `run:${String(s?.run ?? "").trim()}`;
  const onlySetupBefore =
    iE2eStepRefuse >= 0 &&
    e2ePrecede.every(
      (s) =>
        String(s?.run ?? "").trim() === E2E_PRECEDE_RUN_OK ||
        E2E_PRECEDE_USES_OK.some((u) => String(s?.uses ?? "").startsWith(`${u}@`)),
    );
  const iE2eRefuse = e2eRuns.findIndex((r) => r.includes(MAIL_REFUSAL_SCRIPT));
  const iE2eMigrate = e2eRuns.findIndex((r) => r.includes("db:migrate"));
  check(
    `"${CI_E2E_JOB}" refuses a live mail credential BEFORE it migrates, seeds or boots the suite — and ONLY ${E2E_PRECEDE_USES_OK.join("@, ")}@ and \`${E2E_PRECEDE_RUN_OK}\` may precede it, over the FULL step list`,
    iE2eRefuse >= 0 &&
      iE2eStepRefuse >= 0 &&
      onlySetupBefore &&
      iE2eMigrate >= 0 &&
      iE2eSeed >= 0 &&
      iE2ePlay >= 0 &&
      iE2eRefuse < iE2eMigrate &&
      iE2eRefuse < iE2eSeed &&
      iE2eRefuse < iE2ePlay,
    `indices: refusal=${iE2eRefuse}  db:migrate=${iE2eMigrate}  db:seed=${iE2eSeed}  ` +
      `playwright=${iE2ePlay}  (of ${e2eRuns.length} run commands)  ` +
      `refusal step index=${iE2eStepRefuse} (of ${e2eSteps.length} steps)  ` +
      `precedes=[${e2ePrecede.map(describeStep).join(", ") || "(none)"}]  ` +
      `permitted=[${E2E_PRECEDE_USES_OK.map((u) => `${u}@…`).join(", ")}, run:${E2E_PRECEDE_RUN_OK}]  ` +
      `and that holds=${onlySetupBefore}`,
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
  const runsVisualProject = visualRuns.some(
    (r) => r.includes("playwright test") && r.includes("--project=visual"),
  );
  check(
    `"${CI_VISUAL_JOB}" runs the visual project BY NAME (--project=visual)`,
    runsVisualProject,
    `run commands=${JSON.stringify(visualRuns)}`,
  );

  // MIGRATE → SEED → PLAYWRIGHT, IN THAT ORDER. A seed after the comparison is a seed that changed
  // nothing, and the comparison then photographs an empty database.
  const iMigrate = visualRuns.findIndex((r) => r.includes("db:migrate"));
  const iSeed = visualRuns.findIndex((r) => r.includes("seed-baseline-fixtures"));
  const iPlay = visualRuns.findIndex((r) => r.includes("playwright test"));
  check(
    `"${CI_VISUAL_JOB}" runs migrate, then seed, then playwright — IN THAT ORDER`,
    iMigrate >= 0 && iSeed >= 0 && iPlay >= 0 && iMigrate < iSeed && iSeed < iPlay,
    `indices: db:migrate=${iMigrate}  seed-baseline-fixtures=${iSeed}  playwright=${iPlay}  ` +
      `(of ${visualRuns.length} run commands)`,
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
  const captureRuns = runsOf(capture);
  const compareRuns = runsOf(compare);
  const pick = (runs, needle) => runs.find((r) => r.includes(needle));
  const captureMigrate = pick(captureRuns, "db:migrate");
  const compareMigrate = pick(compareRuns, "db:migrate");
  check(
    "the two visual jobs' migrate run commands are byte-identical",
    typeof captureMigrate === "string" && captureMigrate === compareMigrate,
    `${BASELINES_JOB}="${captureMigrate ?? "(absent)"}"  ${CI_VISUAL_JOB}="${compareMigrate ?? "(absent)"}"`,
  );

  const SEED = "scripts/seed-baseline-fixtures.ts";
  const captureSeed = pick(captureRuns, SEED);
  const compareSeed = pick(compareRuns, SEED);
  check(
    `the two visual jobs' seed run commands are byte-identical and both name ${SEED}`,
    typeof captureSeed === "string" && captureSeed === compareSeed,
    `${BASELINES_JOB}="${captureSeed ?? "(absent)"}"  ${CI_VISUAL_JOB}="${compareSeed ?? "(absent)"}"`,
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
