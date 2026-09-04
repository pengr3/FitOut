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
  // RUNTIME refusal, but this one is the stronger shape for two measured reasons: it runs on job 1 —
  // the cheap job that always runs — so it fires about a minute before any browser starts, and it
  // covers EVERY job rather than only the one the step happens to live in. The exposure it closes is
  // not a hypothetical: it is somebody adding a repository- or environment-level secret and wiring it
  // into a workflow `env:` for an unrelated reason. See MAIL_KEY's declaration for the measurement.
  //
  // ⚠ IT SCANS ENV *KEYS*, NOT VALUES, AND THAT IS EXACTLY WHY `gate-e2e`'s STEP DOES NOT TRIP IT.
  // That step deliberately names its variable `MAIL_KEY_UNDER_TEST` — a key that does not begin with
  // the prefix — while reading the provider key through a `${{ env.… }}` context expression in its
  // VALUE. The two sites are spelled differently ON PURPOSE and each of them says so; renaming the
  // step's key to the provider's name would make this check go red against a CORRECT file.
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
  for (const file of workflowFiles) {
    const d = parse(readFileSync(`${WORKFLOW_DIR}/${file}`, "utf8"));
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
