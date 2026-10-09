import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { runSequential, safeEnvironment, sanitizeLog } from "../../scripts/run-phase27-gates.mjs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hash = (v) => createHash("sha256").update(v).digest("hex");
const revision = "a".repeat(40);

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "fitout-phase27-runner-"));
  t.after(() => {
    const absolute = resolve(directory);
    if (!absolute.startsWith(resolve(tmpdir()) + sep)) throw new Error("Refuse cleanup outside this test's temporary root");
    rmSync(absolute, { recursive: true });
  });
  const sourceFile = join(directory, "source.txt");
  writeFileSync(sourceFile, "reviewed source");
  const captureSource = () => ({ provenance: "captured", revision, dirty: false, claim: "clean-revision", capturedAt: new Date().toISOString(), manifest: { sha256: hash(readFileSync(sourceFile)) } });
  const options = { runDir: join(directory, "attempt"), lockPath: join(directory, "gate.lock"), captureSource, expectedRevision: revision, cwd: directory };
  const job = (name, code) => ({ name, command: process.execPath, commandLabel: "node", args: ["-e", code], runner: "typescript" });
  return { directory, sourceFile, options, job };
}

test("safe child environment excludes inherited provider values and test NODE_ENV from build/browser", () => {
  const inherited = { PATH: "plumbing", RESEND_API_KEY: "live-value", PAYMONGO_SECRET_KEY: "live-value", DATABASE_URL: "production", GOOGLE_CLIENT_SECRET: "live-value", NODE_ENV: "test", VERCEL_URL: "production", CONTACT_PRODUCTION_ENABLED: "true", FITOUT_E2E_REAL_EMAIL: "1" };
  for (const kind of ["unit", "design", "build", "browser"]) {
    const env = safeEnvironment(kind, inherited);
    assert.ok(!Object.values(env).includes("live-value"));
    assert.equal(env.DATABASE_URL, "postgresql://fitout:fitout@localhost:5432/fitout_test");
    assert.equal(env.RESEND_API_KEY, "");
    assert.equal(env.CONTACT_PRODUCTION_ENABLED, "false");
    assert.equal(env.FITOUT_E2E_REAL_EMAIL, "");
    assert.equal(env.VERCEL_URL, undefined);
    assert.ok(env.PATH.startsWith(resolve(process.execPath, "..")));
    if (process.platform === "win32") assert.equal(env.Path, env.PATH);
    assert.equal(env.NODE_ENV, kind === "unit" || kind === "design" ? "test" : undefined);
  }
});

test("the CLI refuses arbitrary commands and a non-current revision before exporting source", () => {
  const script = fileURLToPath(new URL("../../scripts/run-phase27-gates.mjs", import.meta.url));
  const extra = spawnSync(process.execPath, [script, "--revision", "HEAD", "--stage", "full", "--command", "injected"], { encoding: "utf8", windowsHide: true });
  assert.equal(extra.status, 1);
  assert.match(extra.stderr, /Use --revision/);
  const old = spawnSync(process.execPath, [script, "--revision", "HEAD~1", "--stage", "full"], { encoding: "utf8", windowsHide: true });
  assert.equal(old.status, 1);
  assert.match(old.stderr, /current HEAD/);
});

test("real child jobs execute sequentially and source snapshots precede them", async (t) => {
  const f = fixture(t), marker = join(f.directory, "order.txt");
  const jobs = [f.job("first", `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'first'), 150)`),
    f.job("second", `if(require('node:fs').readFileSync(${JSON.stringify(marker)}, 'utf8') !== 'first') process.exit(7)`)];
  const report = await runSequential({ ...f.options, jobs });
  assert.equal(report.allPassed, true);
  assert.equal(report.automaticAcceptance, false);
  assert.ok(Date.parse(report.gates[1].startedAt) >= Date.parse(report.gates[0].finishedAt));
  for (const row of report.gates) assert.ok(Date.parse(row.testedSource.capturedAt) <= Date.parse(row.startedAt));
  assert.equal(existsSync(f.options.lockPath), false);
});

test("an existing run directory and raw proof cannot be overwritten", async (t) => {
  const f = fixture(t);
  const first = await runSequential({ ...f.options, jobs: [f.job("first", "")] });
  const path = join(f.options.runDir, "first.log"), before = readFileSync(path);
  await assert.rejects(runSequential({ ...f.options, jobs: [f.job("first", "console.log('replacement')")] }), /EEXIST/);
  assert.deepEqual(readFileSync(path), before);
  assert.equal(first.allPassed, true);
});

test("a second invocation refuses an active owned lock without interrupting its child", async (t) => {
  const f = fixture(t);
  const first = runSequential({ ...f.options, jobs: [f.job("first", "setTimeout(() => {}, 200)")] });
  await assert.rejects(runSequential({ ...f.options, runDir: join(f.directory, "second"), jobs: [f.job("second", "")] }), /EEXIST/);
  assert.equal((await first).allPassed, true);
  assert.equal(existsSync(join(f.directory, "second")), false);
});

test("a genuine nonzero child exit stays failed while later independent jobs retain their outcomes", async (t) => {
  const f = fixture(t);
  const report = await runSequential({ ...f.options, jobs: [f.job("failed", "process.exit(7)"), f.job("next", "")] });
  assert.equal(report.allPassed, false);
  assert.equal(report.gates[0].exitCode, 7);
  assert.equal(report.gates[0].status, "fail");
  assert.equal(report.gates[1].exitCode, 0);
  assert.equal(existsSync(join(f.options.runDir, "failed-record.json")), true);
});

test("dirty source refuses the child before any side effect", async (t) => {
  const f = fixture(t), marker = join(f.directory, "must-not-run");
  await assert.rejects(runSequential({ ...f.options, captureSource: () => ({ ...f.options.captureSource(), dirty: true }), jobs: [f.job("refused", `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'bad')`)] }), /source\/manifest guard/);
  assert.equal(existsSync(marker), false);
});

test("revision mismatch refuses a supposedly clean child", async (t) => {
  const f = fixture(t);
  await assert.rejects(runSequential({ ...f.options, expectedRevision: "b".repeat(40), jobs: [f.job("refused", "")] }), /source\/manifest guard/);
});

test("a child that mutates source is retained and blocks the next gate", async (t) => {
  const f = fixture(t);
  await assert.rejects(runSequential({ ...f.options, jobs: [f.job("mutates", `require('node:fs').writeFileSync(${JSON.stringify(f.sourceFile)}, 'changed')`), f.job("next", "")] }), /Post-gate source drift/);
  const row = JSON.parse(readFileSync(join(f.options.runDir, "mutates-record.json")));
  assert.equal(row.exitCode, 0);
  assert.equal(row.sourceGuardPassed, false);
  assert.equal(row.acceptancePassed, false);
  assert.equal(existsSync(join(f.options.runDir, "next.log")), false);
});

test("a hung child times out and cannot be accepted", async (t) => {
  const f = fixture(t);
  await assert.rejects(runSequential({ ...f.options, timeoutMs: 500, jobs: [f.job("hung", "setTimeout(() => {}, 5000)")] }), /timeout/);
  const row = JSON.parse(readFileSync(join(f.options.runDir, "hung-record.json")));
  assert.equal(row.timedOut, true);
  assert.equal(row.acceptancePassed, false);
  assert.equal(existsSync(f.options.lockPath), false);
});

test("newly skipped or entirely skipped test output cannot produce acceptance", async (t) => {
  const f = fixture(t);
  const output = "Test Files  1 passed (1)\nTests  1 passed | 1 skipped (2)";
  const job = { ...f.job("skipped", `console.log(${JSON.stringify(output)})`), runner: "vitest", maxSkippedTests: 0 };
  const report = await runSequential({ ...f.options, jobs: [job] });
  assert.equal(report.gates[0].exitCode, 0);
  assert.equal(report.gates[0].skipGuardPassed, false);
  assert.equal(report.allPassed, false);
});

test("captured child logs redact credentials split across output chunks", async (t) => {
  const f = fixture(t);
  const code = "process.stdout.write('Authorization: Bear'); setTimeout(() => process.stdout.write('er fake-secret\\nCookie: fake-session\\nhttps://fixture.test/?code=fake-code\\n'), 20)";
  await runSequential({ ...f.options, jobs: [f.job("redaction", code)] });
  const log = readFileSync(join(f.options.runDir, "redaction.log"), "utf8");
  assert.ok(!/fake-secret|fake-session|fake-code/.test(log));
  assert.match(log, /redacted/);
  assert.equal(sanitizeLog("Tests  29 passed (29)"), "Tests  29 passed (29)");
});
