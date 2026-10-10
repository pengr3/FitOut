import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { delimiter, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerSummary, QUOTA_MIGRATION_FILES } from "./verify-phase27-evidence.mjs";
import { probeStreamingRuntime } from "./probe-phase27-streaming-runtime.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const save = (path, value) => writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value, null, 2), { flag: "wx" });

// A linked checkout stores .git as a file; resolve the actual metadata directory.
export function exportGitEnvironment(checkout, exported, indexFile) {
  const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
    cwd: checkout, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return { GIT_DIR: gitDir, GIT_WORK_TREE: exported, GIT_INDEX_FILE: indexFile, GIT_OPTIONAL_LOCKS: "0" };
}

// Start from operating-system plumbing; provider credentials are never inherited.
export function safeEnvironment(kind, inherited = process.env) {
  const env = {};
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR", "windir", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "COMSPEC", "ComSpec", "PATHEXT", "NUMBER_OF_PROCESSORS"]) {
    if (inherited[key] !== undefined) env[key] = inherited[key];
  }
  // Playwright's webServer command must use this same verified runtime on Windows.
  env.PATH = [dirname(process.execPath), inherited.PATH ?? inherited.Path ?? ""].join(delimiter);
  if (process.platform === "win32") env.Path = env.PATH;
  Object.assign(env, {
    DATABASE_URL: "postgresql://fitout:fitout@localhost:5432/fitout_test",
    TEST_DATABASE_URL: "postgresql://fitout:fitout@localhost:5432/fitout_test",
    RESEND_API_KEY: "", FITOUT_E2E_REAL_EMAIL: "", CONTACT_PRODUCTION_ENABLED: "false",
    BETTER_AUTH_SECRET: "phase27-inert-auth-marker-not-a-real-credential",
    BETTER_AUTH_URL: "http://localhost:3000", NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    MARKETING_APP_URL: "http://marketing.localhost:3000", OPS_APP_URL: "http://ops.localhost:3000",
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "phase27-inert-cloud-not-a-real-cloud",
    GOOGLE_CLIENT_ID: "phase27-inert.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "phase27-inert-not-a-real-credential",
    INNGEST_DEV: "1",
  });
  for (const key of ["PAYMONGO_SECRET_KEY", "PAYMONGO_PUBLIC_KEY", "PAYMONGO_WEBHOOK_SECRET", "DIDIT_API_KEY", "DIDIT_WORKFLOW_ID", "DIDIT_WEBHOOK_SECRET", "INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) env[key] = "";
  if (kind === "unit" || kind === "design") env.NODE_ENV = "test";
  if (kind === "unit") env.NEXT_PUBLIC_APP_URL = "";
  if (kind === "build") for (const key of ["PAYMONGO_SECRET_KEY", "PAYMONGO_WEBHOOK_SECRET", "DIDIT_API_KEY", "DIDIT_WORKFLOW_ID", "DIDIT_WEBHOOK_SECRET", "INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"]) env[key] = "phase27-build-inert-marker-not-a-real-credential";
  return env;
}

export function sanitizeLog(value) {
  return value.replace(/((?:authorization|cookie|set-cookie|password|secret|token|api[_-]?key)\s*[:=]\s*)[^\r\n,}]+/gi, "$1[redacted]")
    .replace(/([?&](?:code|token|secret|password|bypass|x-vercel-protection-bypass)=)[^\s&#"']+/gi, "$1[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/g, "Bearer [redacted]");
}

function child(command, args, { cwd, env, timeoutMs = 1_200_000 }) {
  return new Promise((accept, reject) => {
    const chunks = [];
    const startedAt = new Date().toISOString();
    const owned = spawn(command, args, { cwd, env, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === "win32" && owned.pid) {
        // Exact PID from this spawn only: also stop its owned server descendants.
        const stop = spawn("taskkill.exe", ["/PID", String(owned.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        stop.once("error", () => owned.kill());
        stop.once("close", () => owned.kill());
      } else owned.kill();
    }, timeoutMs);
    owned.stdout.on("data", (bytes) => chunks.push(bytes));
    owned.stderr.on("data", (bytes) => chunks.push(bytes));
    owned.once("error", (error) => { clearTimeout(timer); reject(error); });
    owned.once("close", (exitCode, signal) => {
      clearTimeout(timer);
      accept({ exitCode, signal, timedOut, startedAt, finishedAt: new Date().toISOString(), output: sanitizeLog(Buffer.concat(chunks).toString("utf8")) });
    });
  });
}

function assertSource(source, revision, manifest) {
  if (source?.provenance !== "captured" || source.dirty !== false || source.revision !== revision || !/^[a-f0-9]{64}$/.test(source.manifest?.sha256 ?? "") || (manifest && source.manifest.sha256 !== manifest)) throw new Error("Clean exact source/manifest guard failed");
}

// The injectable API is for offline runner tests. The CLI uses only the fixed six jobs.
export async function runSequential({ jobs, runDir, lockPath, captureSource, expectedRevision, expectedManifest, cwd, environment = safeEnvironment, timeoutMs }) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const lease = openSync(lockPath, "wx");
  writeFileSync(lease, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), revision: expectedRevision }));
  const rows = [];
  let manifest = expectedManifest;
  try {
    mkdirSync(runDir); // Never reuse a directory or overwrite retained proof.
    for (const job of jobs) {
      if (!/^[a-z0-9-]+$/.test(job.name)) throw new Error("Unsafe gate artifact name");
      const env = environment(job.name);
      const source = await captureSource(env);
      assertSource(source, expectedRevision, manifest);
      manifest ??= source.manifest.sha256;
      const sourcePath = join(runDir, `${job.name}-source.json`);
      save(sourcePath, source);
      const observed = await child(job.command, job.args, { cwd, env, timeoutMs });
      const logPath = join(runDir, `${job.name}.log`);
      save(logPath, observed.output);
      const postSource = await captureSource(env);
      save(join(runDir, `${job.name}-post-source.json`), postSource);
      const sourceGuardPassed = postSource.dirty === false && postSource.revision === expectedRevision && postSource.manifest?.sha256 === manifest;
      const summary = runnerSummary(job.runner, observed.output);
      const totals = summary?.resultData?.tests;
      const skipGuardPassed = !totals || totals.passed > 0 && totals.skipped <= (job.maxSkippedTests ?? 0);
      const passed = observed.exitCode === 0 && !observed.timedOut && Boolean(summary) && summary.failed === 0 && skipGuardPassed;
      const row = {
        command: [job.commandLabel ?? job.command, ...job.args].join(" "),
        startedAt: observed.startedAt, finishedAt: observed.finishedAt,
        durationSeconds: (Date.parse(observed.finishedAt) - Date.parse(observed.startedAt)) / 1000,
        exitCode: observed.exitCode, status: observed.exitCode === 0 ? "pass" : "fail",
        result: summary?.terminalSummary ?? "No complete runner summary; acceptance refused.",
        resultData: summary?.resultData ?? null, terminalSummary: summary?.terminalSummary ?? null,
        evidenceKind: "raw-log", rawLogAvailable: true,
        rawLogPath: relative(root, logPath).replaceAll("\\", "/"), logSha256: digest(readFileSync(logPath)),
        logFiltering: "credential patterns redacted; runner terminal totals preserved",
        testedSource: { provenance: "snapshot", path: relative(root, sourcePath).replaceAll("\\", "/"), sha256: digest(readFileSync(sourcePath)), revision: source.revision, dirty: false, claim: source.claim, capturedAt: source.capturedAt, manifestSha256: manifest },
        timedOut: observed.timedOut, signal: observed.signal, sourceGuardPassed, skipGuardPassed, acceptancePassed: passed && sourceGuardPassed,
      };
      rows.push(row);
      save(join(runDir, `${job.name}-record.json`), row);
      if (!sourceGuardPassed || observed.timedOut) throw new Error("Post-gate source drift or timeout: retained attempt cannot be accepted");
    }
    const report = { schemaVersion: 1, revision: expectedRevision, manifestSha256: manifest, gates: rows, allPassed: rows.length === jobs.length && rows.every((row) => row.acceptancePassed), automaticAcceptance: false };
    save(join(runDir, "report.json"), report);
    return report;
  } finally {
    closeSync(lease);
    unlinkSync(lockPath);
  }
}

const jobs = [
  ["unit", "vitest", "node_modules/vitest/vitest.mjs", "run", "--maxWorkers=4"],
  ["design", "vitest", "node_modules/vitest/vitest.mjs", "run", "--config", "vitest.design.config.ts", "--maxWorkers=2"],
  ["types", "typescript", "node_modules/typescript/bin/tsc", "--noEmit"],
  ["lint", "eslint", "node_modules/eslint/bin/eslint.js", "."],
  ["build", "next-build", "node_modules/next/dist/bin/next", "build"],
  ["browser", "playwright", "node_modules/@playwright/test/cli.js", "test", "e2e/marketing-tracer.spec.ts", "e2e/marketing-host-matrix.spec.ts", "e2e/marketing-journeys.spec.ts", "e2e/marketing-contact.spec.ts", "e2e/marketing-search-contract.spec.ts", "e2e/marketing-streaming.spec.ts", "--config", "playwright.streaming.config.ts", "--project=chromium", "--workers=1"],
].map(([name, runner, ...args]) => ({ name, runner, command: process.execPath, commandLabel: "node", args, maxSkippedTests: name === "unit" ? 5 : name === "design" ? 6 : 0 }));

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== "--revision" || args[2] !== "--stage" || args[3] !== "full" || !args[1] || args[1].startsWith("-")) throw new Error("Use --revision <git-ref> --stage full");
  const git = (...options) => execFileSync("git", options, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const revision = git("rev-parse", "--verify", `${args[1]}^{commit}`);
  if (revision !== git("rev-parse", "HEAD")) throw new Error("Candidate must be current HEAD; no checkout or branch mutation is performed");
  git("cat-file", "-e", `${revision}:scripts/run-phase27-gates.mjs`);
  if (git("diff", "--name-only", revision, "--", "scripts/run-phase27-gates.mjs")) throw new Error("Runner must match its reviewed committed source");
  const runtime = await probeStreamingRuntime();
  if (runtime.internalTypeErrors) throw new Error(`Node ${process.version} fails the native cancellation-race precondition; select an already-installed fixed runtime.`);
  const cache = join(root, "playwright/.cache/phase27-08");
  mkdirSync(cache, { recursive: true });
  const lockPath = join(cache, "full-gates.lock");
  if (existsSync(lockPath)) throw new Error("Another full gate runner owns the lock; preserve it");
  const runDir = join(cache, `full-${revision.slice(0, 8)}-${randomUUID()}`);
  mkdirSync(runDir);
  save(join(runDir, "runtime-preflight.json"), runtime);
  const archive = join(runDir, "source.zip");
  git("archive", "--format=zip", `--output=${archive}`, revision);
  const exported = join(runDir, "source");
  const setupEnv = { ...safeEnvironment("setup"), PHASE27_ARCHIVE: archive, PHASE27_EXPORT: exported };
  const expansion = await child("powershell.exe", ["-NoProfile", "-Command", "Expand-Archive -LiteralPath $env:PHASE27_ARCHIVE -DestinationPath $env:PHASE27_EXPORT"], { cwd: root, env: setupEnv });
  save(join(runDir, "expand.log"), expansion.output);
  if (expansion.exitCode !== 0) throw new Error("Source archive expansion failed");
  console.log("Copying existing installed dependencies into the source export.");
  const copying = await child("robocopy.exe", [join(root, "node_modules"), join(exported, "node_modules"), "/E", "/MT:8", "/NFL", "/NDL", "/NJH", "/NJS", "/NP"], { cwd: root, env: setupEnv });
  save(join(runDir, "dependencies.log"), copying.output);
  if (copying.exitCode === null || copying.exitCode > 7) throw new Error("Existing dependency copy failed");
  const gitEnv = exportGitEnvironment(root, exported, join(runDir, "export.index"));
  const browserRun = join(exported, "playwright/.cache/phase27-08/release-browser");
  const environment = (kind) => {
    const env = { ...safeEnvironment(kind), ...gitEnv, CHROME_LOG_FILE: join(runDir, "chromium-debug.log") };
    if (kind === "browser") {
      mkdirSync(browserRun, { recursive: true });
      Object.assign(env, { FITOUT_STREAMING_SERVER: "production", FITOUT_STREAMING_PORT: "3000", FITOUT_STREAMING_RUN_DIR: browserRun, FITOUT_STREAMING_BUILD_RECORD: join(runDir, "gates/build-record.json") });
    }
    return env;
  };
  execFileSync("git", ["read-tree", revision], { cwd: exported, env: environment("setup"), stdio: "pipe" });
  const generated = await child(process.execPath, ["node_modules/next/dist/bin/next", "typegen"], { cwd: exported, env: environment("setup") });
  save(join(runDir, "typegen.log"), generated.output);
  if (generated.exitCode !== 0) throw new Error("Canonical typegen failed");
  const captureSource = (env) => JSON.parse(execFileSync(process.execPath, ["scripts/verify-phase27-evidence.mjs", "--capture-source"], { cwd: exported, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const initial = captureSource(environment("setup"));
  assertSource(initial, revision);
  if (!initial.manifest.files.some((file) => file.path === "playwright.streaming.config.ts" && file.sha256)) throw new Error("Built-server browser config must be bound by the source manifest");
  if (!initial.manifest.scope.includes("drizzle/") || !QUOTA_MIGRATION_FILES.every((path) => initial.manifest.files.some((file) => file.path === path && file.sha256))) throw new Error("Contact quota migration, journal and snapshot must be bound by the source manifest");
  save(join(runDir, "initial-source.json"), initial);
  const report = await runSequential({ jobs, runDir: join(runDir, "gates"), lockPath, captureSource, expectedRevision: revision, expectedManifest: initial.manifest.sha256, cwd: exported, environment });
  console.log(JSON.stringify({ runDir: relative(root, runDir).replaceAll("\\", "/"), revision, allPassed: report.allPassed, automaticAcceptance: false }));
  if (!report.allPassed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`Phase 27 gates refused: ${sanitizeLog(error.message)}`); process.exitCode = 1; });
}
