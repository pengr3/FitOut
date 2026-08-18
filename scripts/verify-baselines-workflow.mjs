#!/usr/bin/env node
// ============================================================================================
// verify-baselines-workflow — ASSERT THE SECURITY PROPERTIES OF THE ONE JOB THAT CAN WRITE TO
// THIS REPOSITORY, BY PARSING ITS YAML RATHER THAN GREPPING IT.
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
// over the job's `env`, `run` and `with` VALUES only — which is where a credential could actually
// live. `grep -c "secrets\." baselines.yml` being non-zero is therefore EXPECTED and not a finding.
//
// ── IT PRINTS WHAT IT CHECKED ───────────────────────────────────────────────────────────────────
// Every assertion echoes the parsed value it read. A checker that prints only PASS/FAIL asks you to
// trust it; one that prints `triggers=[workflow_dispatch]` hands you the evidence. Exits 0 on
// success, 1 on the first failure, naming the invariant.
//
// Usage:  node scripts/verify-baselines-workflow.mjs
// ============================================================================================

import { readFileSync } from "node:fs";
import { parse } from "yaml";

const WORKFLOW = ".github/workflows/baselines.yml";
const JOB = "generate-baselines";

/** The pinned image tag must equal the installed `@playwright/test` version EXACTLY (T-11-VERDRIFT).
 *  Playwright's docs: a mismatch means "Playwright will be unable to locate browser executables." */
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const playwrightVersion = (
  pkg.devDependencies?.["@playwright/test"] ??
  pkg.dependencies?.["@playwright/test"] ??
  ""
).replace(/^[\^~]/, "");

const failures = [];
const notes = [];

function check(invariant, ok, evidence) {
  notes.push(`  ${ok ? "ok  " : "FAIL"}  ${invariant}\n          ${evidence}`);
  if (!ok) failures.push(invariant);
}

const raw = readFileSync(WORKFLOW, "utf8");
const doc = parse(raw);
const job = doc?.jobs?.[JOB];

if (!job) {
  console.error(`FATAL: job "${JOB}" not found in ${WORKFLOW}. Every assertion below is vacuous`);
  console.error(`without it, so this is a hard stop rather than a failed check.`);
  process.exit(1);
}

// ── 1. THE TRIGGER LIST IS EXACTLY `workflow_dispatch` ──────────────────────────────────────────
// The mutation a substring check could not see. `on:` parses to an object whose KEYS are the
// triggers, so an added `push:` shows up as a second key — which is why this is a set comparison
// and not a "does it contain" test.
const triggers = doc.on == null ? [] : typeof doc.on === "string" ? [doc.on] : Object.keys(doc.on);
check(
  "the ONLY trigger is workflow_dispatch (no push, no pull_request, no schedule)",
  triggers.length === 1 && triggers[0] === "workflow_dispatch",
  `triggers=[${triggers.join(", ")}]`,
);

// ── 2. WORKFLOW-LEVEL DEFAULT IS READ-ONLY ──────────────────────────────────────────────────────
check(
  "workflow-level permissions.contents is 'read'",
  doc?.permissions?.contents === "read",
  `workflow permissions=${JSON.stringify(doc?.permissions ?? null)}`,
);

// ── 3. WRITE IS GRANTED ON THIS ONE JOB, AND ONLY THIS ONE ──────────────────────────────────────
check(
  `job "${JOB}" permissions.contents is 'write'`,
  job?.permissions?.contents === "write",
  `job permissions=${JSON.stringify(job?.permissions ?? null)}`,
);

const writeJobs = Object.entries(doc.jobs ?? {})
  .filter(([, j]) => j?.permissions?.contents === "write")
  .map(([name]) => name);
check(
  "exactly ONE job in this workflow holds contents: write",
  writeJobs.length === 1 && writeJobs[0] === JOB,
  `jobs with contents:write=[${writeJobs.join(", ")}]`,
);

// ── 4. `github.event_name` STAYS IN THE CONCURRENCY GROUP (T-11-CANCEL) ─────────────────────────
// Not cosmetic: ci.yml uses the same workflow+ref group, so without the event term a push to the
// same ref lands in this job's group and `cancel-in-progress` kills it mid-flight, leaving a PARTIAL
// baseline set committed — worse than none, because the missing ones fail and the present ones pass.
const group = String(doc?.concurrency?.group ?? "");
check(
  "github.event_name is in the concurrency group",
  group.includes("github.event_name"),
  `concurrency.group=${group || "(absent)"}`,
);

// ── 5. THE IMAGE TAG IS PINNED, AND EQUALS THE INSTALLED PLAYWRIGHT VERSION ─────────────────────
const image = String(job?.container?.image ?? "");
const expectedImage = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;
check(
  "container image tag is pinned and equals the installed @playwright/test version",
  image === expectedImage,
  `image=${image || "(absent)"}  expected=${expectedImage}  (@playwright/test=${playwrightVersion})`,
);

// ── 6. `--ipc=host` SURVIVES ────────────────────────────────────────────────────────────────────
// Playwright's documented recommendation for Chromium; without it Chromium can run out of memory and
// crash, which presents as a flaky test and therefore gets retried instead of fixed.
const options = String(job?.container?.options ?? "");
check(
  "container options carry --ipc=host",
  options.includes("--ipc=host"),
  `container.options=${options || "(absent)"}`,
);

// ── 7. EXACTLY ONE RUN COMMAND CARRIES `--update-snapshots` ─────────────────────────────────────
// THE NUMBER THAT ACTUALLY MEANS "ONE WRITE PATH", and the one no line-based grep can produce: the
// workflow's header measures `grep -c` at 6 for this file, five of which are comments explaining the
// flag. Count the STRUCTURE, not the text.
const steps = Array.isArray(job?.steps) ? job.steps : [];
const runs = steps.filter((s) => typeof s?.run === "string").map((s) => s.run);
const updateSnapshotRuns = runs.filter((r) => r.includes("--update-snapshots"));
check(
  "exactly ONE run command contains --update-snapshots",
  updateSnapshotRuns.length === 1,
  `run commands=${runs.length}  carrying --update-snapshots=${updateSnapshotRuns.length}`,
);

// ── 8. NO `secrets.` IN ANY env / run / with VALUE ──────────────────────────────────────────────
// The prohibition, asserted where a credential could actually live. Comments are already gone: they
// do not survive the parse, which is precisely why the naive whole-file version was falsely red.
const secretHits = [];
const scanValue = (where, value) => {
  if (typeof value === "string" && value.includes("secrets.")) secretHits.push(where);
};
for (const [k, v] of Object.entries(doc?.env ?? {})) scanValue(`workflow env.${k}`, v);
for (const [k, v] of Object.entries(job?.env ?? {})) scanValue(`job env.${k}`, v);
for (const [k, v] of Object.entries(job?.container?.env ?? {})) scanValue(`container env.${k}`, v);
for (const [svcName, svc] of Object.entries(job?.services ?? {})) {
  for (const [k, v] of Object.entries(svc?.env ?? {})) scanValue(`services.${svcName}.env.${k}`, v);
}
steps.forEach((s, i) => {
  const label = s?.name ? `step "${s.name}"` : `step[${i}]`;
  scanValue(`${label}.run`, s?.run);
  for (const [k, v] of Object.entries(s?.env ?? {})) scanValue(`${label}.env.${k}`, v);
  for (const [k, v] of Object.entries(s?.with ?? {})) scanValue(`${label}.with.${k}`, v);
});
check(
  "zero `secrets.` references in any env / run / with VALUE",
  secretHits.length === 0,
  secretHits.length === 0
    ? "scanned workflow env, job env, container env, service env, and every step run/env/with — 0 hits"
    : `hits=[${secretHits.join(", ")}]`,
);

// ── 9. NO THIRD-PARTY ACTIONS (T-11-SC) ─────────────────────────────────────────────────────────
// Introducing one in the job that holds `contents: write` is a supply-chain decision to raise
// explicitly, not to absorb.
const uses = steps.filter((s) => typeof s?.uses === "string").map((s) => s.uses);
const thirdParty = uses.filter((u) => !u.startsWith("actions/"));
check(
  "every `uses:` is a first-party actions/* action",
  thirdParty.length === 0,
  `uses=[${uses.join(", ")}]${thirdParty.length ? `  third-party=[${thirdParty.join(", ")}]` : ""}`,
);

// ── 10. THE COMMIT STEP STILL STAGES ONLY THE LINUX-BASELINE GLOB ───────────────────────────────
// T-11-PLATBASE. The tripwire catches the other way a wrong file lands in this commit: anything the
// previous steps happened to modify (a churned lockfile, a run artefact) riding along.
const stagesGlob = runs.some((r) => r.includes('git add -- "*-visual-linux.png"'));
check(
  "a run command stages exactly the *-visual-linux.png glob",
  stagesGlob,
  stagesGlob ? 'found: git add -- "*-visual-linux.png"' : "no run command stages the Linux glob",
);

// ── REPORT ──────────────────────────────────────────────────────────────────────────────────────
console.log(`verify-baselines-workflow — parsed ${WORKFLOW} (job "${JOB}")\n`);
console.log(notes.join("\n"));
console.log(
  `\nparsed values:\n` +
    `  triggers            ${JSON.stringify(triggers)}\n` +
    `  workflow perms      ${JSON.stringify(doc?.permissions ?? null)}\n` +
    `  job perms           ${JSON.stringify(job?.permissions ?? null)}\n` +
    `  concurrency.group   ${group}\n` +
    `  container.image     ${image}\n` +
    `  container.options   ${options}\n` +
    `  run commands        ${runs.length} (${updateSnapshotRuns.length} with --update-snapshots)\n` +
    `  services            ${JSON.stringify(Object.keys(job?.services ?? {}))}\n` +
    `  job env keys        ${JSON.stringify(Object.keys(job?.env ?? {}))}\n` +
    `  uses                ${JSON.stringify(uses)}`,
);

if (failures.length > 0) {
  console.error(`\n${failures.length} invariant(s) FAILED:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nAll ${notes.length} invariants hold.`);
