import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Offline evidence validation only. This never deploys, enables mail, sends an
// inquiry, reads credentials, or treats a local/mocked test as external proof.
const root = fileURLToPath(new URL("../", import.meta.url));
const dir = resolve(root, ".planning/phases/27-app-subdomain-marketing-website");
const stageIndex = process.argv.indexOf("--stage");
const stage = stageIndex === -1 ? "prepared" : process.argv[stageIndex + 1];

// Versioned acceptance coverage, derived from 27-08/09 and the cutover packet. These are
// required observations, not local test passes or claims that supplied proof is authentic.
export const MATRIX_VERSION = 1;
export const REQUIRED_MATRIX = [
  ...["home", "hosts", "players", "about", "faq", "contact"].map((page) => ({ id: `marketing-${page}`, host: "fitout.live", path: page === "home" ? "/" : `/${page}`, method: "GET" })),
  { id: "app-home-only", host: "app.fitout.live", path: "/", method: "GET" },
  { id: "www-full-query", host: "www.fitout.live", path: "/", method: "GET" },
  { id: "old-app-deep-link", host: "fitout.live", path: "/profile", method: "GET" },
  { id: "ops-front-door", host: "ops.fitout.live", path: "/", method: "GET" },
  { id: "unknown-host-denied", host: "lookalike.fitout.live", path: "/", method: "GET" },
  { id: "internal-namespace-denied", host: "app.fitout.live", path: "/marketing", method: "GET" },
  { id: "host-only-session-bridge", host: "fitout.live", path: "/auth/session-check", method: "GET" },
  { id: "customer-ops-session-isolation", host: "ops.fitout.live", path: "/ops", method: "GET" },
  { id: "staff-customer-capability-denied", host: "app.fitout.live", path: "/start-hosting", method: "POST" },
  { id: "stale-session-recovery", host: "app.fitout.live", path: "/auth/session-check", method: "GET" },
  { id: "google-fresh-state", host: "app.fitout.live", path: "/api/auth/callback/google", method: "GET" },
  { id: "issued-verify-token", host: "fitout.live", path: "/api/auth/verify-email", method: "GET" },
  { id: "issued-reset-token", host: "fitout.live", path: "/reset-password", method: "GET" },
  { id: "next-link-rsc-history", host: "fitout.live", path: "/hosts", method: "GET" },
  { id: "rsc-prefetch-isolation", host: "app.fitout.live", path: "/", method: "GET" },
  { id: "alternating-html-rsc-cache", host: "fitout.live", path: "/", method: "GET" },
  { id: "metadata-robots-sitemap", host: "fitout.live", path: "/sitemap.xml", method: "GET" },
  ...["paymongo", "didit", "inngest"].flatMap((receiver) => ["old", "target"].map((side) => ({ id: `${receiver}-${side}-direct`, host: side === "old" ? "fitout.live" : "app.fitout.live", path: receiver === "inngest" ? "/api/inngest" : `/api/${receiver}/webhook`, method: "POST" }))),
  { id: "preview-account-isolation", host: "$preview", path: "/", method: "GET" },
  ...["default-disabled", "trusted-ingress-per-ip", "distributed-global-budget", "disabled-recovery"].map((control) => ({ id: `contact-${control}`, host: "fitout.live", path: "/api/contact", method: "POST" })),
  { id: "rollback-verified", host: "app.fitout.live", path: "/", method: "GET" },
];
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const validTimestamp = (value) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
export const SOURCE_SCOPE = ["src/", "public/", "tests/", "e2e/", "scripts/", "package.json", "package-lock.json", "pnpm-lock.yaml", "next.config.ts", "next-env.d.ts", "tsconfig.json", "vitest.config.ts", "vitest.design.config.ts", "playwright.config.ts", "eslint.config.mjs", "postcss.config.mjs", "components.json", "instrumentation.ts", "vercel.json"];
// Keep historical manifests valid; newly captured proof also binds added root configs.
const SOURCE_EXTENSIONS = ["playwright.streaming.config.ts", "drizzle/"];
export const QUOTA_MIGRATION_FILES = ["drizzle/0034_contact_quota.sql", "drizzle/meta/_journal.json", "drizzle/meta/0034_snapshot.json"];
const CAPTURE_SCOPE = [...SOURCE_SCOPE, ...SOURCE_EXTENSIONS];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const manifestDigest = (files) => sha256(JSON.stringify(files));
// Bind an explicit replacement run to the complete retained history, including failed attempts.
export const gateHistoryDigest = (engineering) => sha256(JSON.stringify({ gates: engineering.gates, reviewFixGates: engineering.reviewFixVerification?.gates ?? [] }));
// Capture before a gate; never reconstruct a historical capture from today's files. No env or
// credential files are in scope. Hashes establish byte consistency, not execution attestation.
export function captureSourceContext() {
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const indexed = git("ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...CAPTURE_SCOPE).split("\0").filter(Boolean);
  // Generated nonsecret config such as next-env.d.ts can be ignored yet affect type/build gates.
  const configs = CAPTURE_SCOPE.filter((path) => !path.endsWith("/") && existsSync(resolve(root, path)));
  const paths = [...new Set([...indexed, ...configs])].sort();
  const files = paths.map((path) => { try { return { path, sha256: sha256(readFileSync(resolve(root, path))) }; } catch { return { path, sha256: null }; } });
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all").trim().length > 0;
  return { provenance: "captured", revision: git("rev-parse", "HEAD").trim(), dirty, claim: dirty ? "working-tree" : "clean-revision", capturedAt: new Date().toISOString(), manifest: { scope: CAPTURE_SCOPE, files, sha256: manifestDigest(files) } };
}
const withoutAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, "");
function counts(line) {
  const values = { passed: 0, failed: 0, skipped: 0 };
  for (const match of line.matchAll(/(\d+)\s+(passed|failed|skipped)/g)) values[match[2]] = Number(match[1]);
  return values;
}
// Extract bounded summaries from the known runners' retained bytes. A relabeled status/exit
// cannot erase a failed terminal summary. Empty successful tsc/ESLint output is handled explicitly.
export function runnerSummary(runner, bytes) {
  const log = withoutAnsi(String(bytes));
  if (runner === "node-test") {
    const lines = log.split(/\r?\n/).filter((line) => /^(?:ℹ |# )(?:pass|fail|skipped|cancelled) \d+$/.test(line));
    if (lines.length !== 4) return null;
    const value = (key) => Number(lines.find((line) => new RegExp(`(?:ℹ |# )${key} \\d+$`).test(line))?.match(/\d+$/)?.[0]);
    const tests = { passed: value("pass"), failed: value("fail") + value("cancelled"), skipped: value("skipped") };
    return { terminalSummary: lines.join("\n"), resultData: { runner, tests }, failed: tests.failed };
  }
  if (runner === "vitest") {
    const files = [...log.matchAll(/^\s*Test Files\s+(.+)$/gm)].at(-1)?.[0].trim();
    const tests = [...log.matchAll(/^\s*Tests\s+(.+)$/gm)].at(-1)?.[0].trim();
    if (!files || !tests) return null;
    return { terminalSummary: `${files}\n${tests}`, resultData: { runner, files: counts(files), tests: counts(tests) }, failed: counts(files).failed + counts(tests).failed };
  }
  if (runner === "playwright") {
    const lines = log.split(/\r?\n/).filter((line) => /^\s*\d+\s+(passed|failed|skipped|did not run|interrupted)(?:\s|$)/.test(line));
    if (!lines.length) return null;
    const tests = counts(lines.join("\n"));
    tests.skipped += lines.reduce((total, line) => total + Number(line.match(/(\d+)\s+(?:did not run|interrupted)/)?.[1] ?? 0), 0);
    return { terminalSummary: lines.map((line) => line.trim()).join("\n"), resultData: { runner, tests }, failed: tests.failed + tests.skipped };
  }
  if (runner === "typescript") {
    const diagnostics = log.split(/\r?\n/).filter((line) => /error TS\d+:/.test(line));
    if (log.trim() && !diagnostics.length) return null;
    return { terminalSummary: diagnostics.length ? diagnostics.join("\n") : "No TypeScript diagnostics.", resultData: { runner, errors: diagnostics.length }, failed: diagnostics.length };
  }
  if (runner === "eslint") {
    const matches = [...log.matchAll(/(\d+) problems? \((\d+) errors?(?:, (\d+) warnings?)?\)/g)];
    const last = matches.at(-1);
    if (!last && log.trim()) return null;
    const errors = Number(last?.[2] ?? 0); const warnings = Number(last?.[3] ?? 0);
    return { terminalSummary: last?.[0] ?? "No ESLint diagnostics.", resultData: { runner, errors, warnings }, failed: errors };
  }
  if (runner === "next-build") {
    const compiled = /Compiled successfully/.test(log);
    const generated = /(?:[✓✔]\s*)?Generating static pages[^\r\n]*\((\d+)\/\1\)/.test(log);
    const failures = log.split(/\r?\n/).filter((line) => /^(?:Error:|Type error:|Failed to compile|Failed to type check|.*Build error occurred)|error TS\d+:/.test(line));
    const lines = log.split(/\r?\n/).filter((line) => /Compiled successfully|Generating static pages.*\((\d+)\/\1\)|Finalizing page optimization/.test(line));
    if (!lines.length && !failures.length) return null;
    return { terminalSummary: [...lines, ...failures].map((line) => line.trim()).join("\n"), resultData: { runner, compiled, generated, errors: failures.length }, failed: failures.length || (!compiled || !generated ? 1 : 0) };
  }
  return null;
}
const canonical = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
const sameResult = (a, b) => {
  // Explicit nested totals, avoiding object-key-order dependence and accepting no omitted totals.
  if (!a || !b || canonical(a) !== canonical(b)) return false;
  for (const key of ["files", "tests"]) if (a[key] || b[key]) {
    if (canonical(a[key]) !== canonical(b[key])) return false;
  }
  return true;
};

export function validateEvidence({ engineering, inventory, packet, live = {}, stage = "prepared", readLog = (path) => readFileSync(path) }) {
const errors = [];
const check = (fact, message) => { if (!fact) errors.push(message); };
check(["prepared", "deployed", "live"].includes(stage), "Unknown evidence stage");
const commands = [
  "node node_modules/vitest/vitest.mjs run",
  "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
  "node node_modules/typescript/bin/tsc --noEmit",
  "node node_modules/eslint/bin/eslint.js .",
  "node node_modules/next/dist/bin/next build",
  "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
];
check(Array.isArray(engineering.gates) && engineering.gates.length === commands.length, "All six full gate results are required");
const runners = ["vitest", "vitest", "typescript", "eslint", "next-build", "playwright"];
const candidate = engineering.releaseCandidateVerification;
const hasCandidate = candidate !== undefined;
const deployedBinding = stage === "prepared" ? undefined : { revision: live.deployedRevision, manifestSha256: live.sourceManifestSha256 };
function validateSource(source, gate, label, binding) {
  if (source?.provenance === "snapshot") {
    const path = typeof source.path === "string" ? resolve(root, source.path) : null;
    const fromRoot = path ? relative(root, path) : "..";
    const contained = fromRoot !== ".." && !fromRoot.startsWith("../") && !fromRoot.startsWith("..\\") && !isAbsolute(fromRoot);
    check(contained && nonempty(source.path) && typeof source.sha256 === "string" && /^[a-f0-9]{64}$/.test(source.sha256), `${label} source snapshot path/digest invalid`);
    if (!contained || !path) return;
    try {
      const bytes = readLog(path);
      check(sha256(bytes) === source.sha256, `${label} source snapshot byte digest mismatch`);
      const captured = JSON.parse(String(bytes));
      check(captured?.provenance === "captured" && captured.revision === source.revision && captured.dirty === source.dirty && captured.claim === source.claim && captured.capturedAt === source.capturedAt && captured.manifest?.sha256 === source.manifestSha256, `${label} source snapshot contradicts reference context`);
      // A snapshot must contain an original capture, never another reference (no recursion chain).
      if (captured?.provenance === "captured") validateSource(captured, gate, label, binding);
    } catch { check(false, `${label} source snapshot unavailable or malformed`); }
    return;
  }
  check(typeof source?.dirty === "boolean" && ["captured", "unavailable"].includes(source?.provenance), `${label} tested source provenance/dirty state missing`);
  if (source?.provenance === "unavailable") {
    check(source.revision === null && source.manifest === null && source.capturedAt === null && source.claim === "working-tree" && source.dirty === true && nonempty(source.reason), `${label} unavailable historical source must not claim clean/captured revision`);
    check(!binding, `${label} uncaptured historical source blocks deployed/live acceptance`);
    return;
  }
  check(typeof source?.revision === "string" && /^[a-f0-9]{40}$/.test(source.revision) && validTimestamp(source?.capturedAt) && Date.parse(source.capturedAt) <= Date.parse(gate.startedAt), `${label} tested revision/capture time missing`);
  check(source?.claim === (source?.dirty ? "working-tree" : "clean-revision"), `${label} dirty source contradicts clean/deployed claim`);
  const manifest = source?.manifest;
  check(Array.isArray(manifest?.scope) && SOURCE_SCOPE.every((path) => manifest.scope.includes(path)), `${label} tested source scope incomplete`);
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  check(files.length > 0 && files.every((file) => nonempty(file?.path) && !isAbsolute(file.path) && !file.path.split(/[\\/]/).includes("..") && !file.path.includes("\\") && CAPTURE_SCOPE.some((path) => path.endsWith("/") ? file.path.startsWith(path) : file.path === path) && (file.sha256 === null || typeof file.sha256 === "string" && /^[a-f0-9]{64}$/.test(file.sha256))), `${label} typed scoped source files missing`);
  for (const path of SOURCE_EXTENSIONS) if (manifest?.scope?.includes(path)) {
    const required = path === "drizzle/" ? QUOTA_MIGRATION_FILES : [path];
    check(required.every((requiredPath) => files.some((file) => file.path === requiredPath && file.sha256)), `${label} declared additional source config missing`);
  }
  check(new Set(files.map((file) => file?.path)).size === files.length && files.every((file, index) => index === 0 || files[index - 1]?.path < file?.path), `${label} source manifest duplicates/order invalid`);
  check(typeof manifest?.sha256 === "string" && manifest.sha256 === manifestDigest(files), `${label} source manifest digest mismatch`);
  if (binding) check(source?.dirty === false && source?.revision === binding.revision && manifest?.sha256 === binding.manifestSha256, `${label} clean deployed source does not match tested context`);
}
const verification = engineering.reviewFixVerification?.gates ?? [];
check(Array.isArray(verification), "Review-fix verification gates must be an array");
if (hasCandidate) {
  check(candidate?.schemaVersion === 1 && nonempty(candidate?.disposition), "Candidate replacement version/disposition missing");
  check(candidate?.supersedesSha256 === gateHistoryDigest(engineering), "Candidate replacement does not bind retained gate history");
  check(typeof candidate?.revision === "string" && /^[a-f0-9]{40}$/.test(candidate.revision) && typeof candidate?.sourceManifestSha256 === "string" && /^[a-f0-9]{64}$/.test(candidate.sourceManifestSha256), "Candidate clean revision/manifest missing");
  check(Array.isArray(candidate?.gates) && candidate.gates.length === commands.length, "Candidate replacement requires all six full gates");
  if (stage !== "prepared") check(candidate?.revision === live.deployedRevision && candidate?.sourceManifestSha256 === live.sourceManifestSha256, "Candidate replacement does not match deployed source");
}
const historicalBinding = hasCandidate ? undefined : deployedBinding;
const specs = [
  ...commands.map((command, index) => ({ gate: engineering.gates?.[index] ?? {}, command, runner: runners[index], binding: historicalBinding })),
  ...(Array.isArray(verification) ? verification : []).map((gate) => ({ gate, runner: gate?.resultData?.runner, binding: historicalBinding })),
  ...(hasCandidate ? commands.map((command, index) => ({ gate: candidate?.gates?.[index] ?? {}, command, runner: runners[index], binding: { revision: candidate?.revision, manifestSha256: candidate?.sourceManifestSha256 } })) : []),
];
const gates = specs.map((spec) => spec.gate);
for (let index = 0; index < gates.length; index++) {
  const gate = gates[index] ?? {};
  const { runner, command, binding } = specs[index];
  check(command ? gate.command === command : nonempty(gate.command) && [...runners, "node-test"].includes(runner), `Gate ${index + 1} command/order/runner missing`);
  check(Number.isInteger(gate.exitCode) && Number.isFinite(gate.durationSeconds) && gate.durationSeconds >= 0, `Gate ${index + 1} actual exit/timing missing`);
  check(["pass", "fail"].includes(gate.status) && (gate.exitCode === 0) === (gate.status === "pass"), `Gate ${index + 1} status contradicts exit`);
  check(nonempty(gate.result) && typeof gate.logSha256 === "string" && /^[a-f0-9]{64}$/.test(gate.logSha256), `Gate ${index + 1} bounded result/evidence digest missing`);
  let capturedBytes;
  check(["raw-log", "terminal-transcript"].includes(gate.evidenceKind), `Gate ${index + 1} evidence provenance missing`);
  if (gate.evidenceKind === "terminal-transcript") {
    check(gate.rawLogAvailable === false && Boolean(gate.rawLogLoss), `Gate ${index + 1} lost raw log must be explicit`);
    capturedBytes = typeof gate.result === "string" ? gate.result : "";
    check(gate.logSha256 === sha256(capturedBytes), `Gate ${index + 1} transcript digest contradicts saved result`);
  } else if (gate.evidenceKind === "raw-log") {
    check(gate.rawLogAvailable === true && typeof gate.rawLogPath === "string", `Gate ${index + 1} raw log path/presence missing`);
    if (typeof gate.rawLogPath === "string") {
      const logPath = resolve(root, gate.rawLogPath);
      const fromRoot = relative(root, logPath);
      const contained = fromRoot !== ".." && !fromRoot.startsWith("../") && !fromRoot.startsWith("..\\") && !isAbsolute(fromRoot);
      check(contained, `Gate ${index + 1} raw log path leaves workspace`);
      if (contained) {
        try { capturedBytes = readLog(logPath); check(sha256(capturedBytes) === gate.logSha256, `Gate ${index + 1} raw log digest mismatch`); }
        catch { check(false, `Gate ${index + 1} raw log unavailable`); }
      }
    }
  }
  const summary = capturedBytes === undefined ? null : runnerSummary(runner, capturedBytes);
  check(Boolean(summary) && gate.resultData?.runner === runner && sameResult(gate.resultData, summary?.resultData) && gate.terminalSummary === summary?.terminalSummary, `Gate ${index + 1} typed runner totals/terminal summary contradict evidence`);
  check(gate.status !== "pass" || summary?.failed === 0 && ![...String(gate.result).matchAll(/(\d+)\s+(?:failed|errors?)\b/g)].some((match) => Number(match[1]) > 0), `Gate ${index + 1} pass label contradicts failed runner outcome`);
  if (gate.status === "fail") check(Boolean(gate.disposition), `Gate ${index + 1} failure disposition missing`);
  check(validTimestamp(gate.startedAt) && validTimestamp(gate.finishedAt) && Date.parse(gate.finishedAt) >= Date.parse(gate.startedAt), `Gate ${index + 1} timestamps invalid or finish precedes start`);
  check(Math.abs((Date.parse(gate.finishedAt) - Date.parse(gate.startedAt)) / 1000 - gate.durationSeconds) <= 1, `Gate ${index + 1} elapsed timing contradicts start/finish`);
  validateSource(gate.testedSource, gate, `Gate ${index + 1}`, binding);
  if (index > 0) check(Date.parse(gate.startedAt) >= Date.parse(gates[index - 1]?.finishedAt), `Gate ${index + 1} overlapped preceding gate`);
}
check(engineering.liveInboxProven === false, "Engineering evidence must not claim live inbox proof");
check(packet.targets?.app === "https://app.fitout.live" && packet.targets?.marketing === "https://fitout.live" && packet.targets?.ops === "https://ops.fitout.live", "Exact approved topology missing");
check(packet.targets?.www === "https://www.fitout.live -> https://fitout.live", "Explicit www policy missing");
check(packet.holds?.checkout === "HOLD" && packet.holds?.payout === "HOLD" && packet.holds?.legal === "HOLD", "Immutable checkout/payout/legal HOLD violated");
check(packet.contact?.enabled === false || packet.contact?.controlsVerified === true, "Contact enabled before deployment-wide controls");
check(packet.contact?.processLocalIsGlobal === false, "Process-local limiter is not global protection");
check(Boolean(packet.contact?.perIpPolicy && packet.contact?.globalBudget && packet.contact?.disabledRecovery), "Contact global budget/control disposition missing");
check(Boolean(packet.proposedRevision && packet.rollbackOwner && packet.monitoringOwner), "Revision/rollback/monitoring owner missing");
check(packet.rollout?.length >= 4 && packet.rollback?.length >= 4 && packet.thresholds?.length >= 4, "Compatibility rollout/rollback/threshold actions missing");
check(packet.receivers?.length === 3 && packet.receivers.every((row) => row.old?.startsWith("https://fitout.live/api/") && row.target === row.old.replace("https://fitout.live", "https://app.fitout.live") && row.redirect === false), "Both-host direct signed receiver continuity missing");
const ids = ["customer-project", "ops-project", "dns-tls-www", "environment-scopes", "google-oauth", "paymongo", "didit", "inngest", "resend-sender", "support-mailbox", "contact-waf-global", "deployment-revision"];
for (const id of ids) {
  const row = inventory.rows?.find((item) => item.id === id);
  check(Boolean(row && row.owner && row.current && row.target && row.requiredProof && row.rollback), `${id}: current/target/owner/proof/rollback missing`);
  check(["observed", "partial", "unknown"].includes(row?.status), `${id}: explicit observation status required`);
  if (row?.status !== "unknown") check(Boolean(row?.observedAt && row?.source), `${id}: current source/date required`);
  if (row?.status === "unknown") check(row.current.toLowerCase().includes("unknown"), `${id}: unknown asserted as fact`);
}
if (stage === "deployed" || stage === "live") {
  const acceptanceGates = hasCandidate ? candidate?.gates : engineering.gates;
  check(Array.isArray(acceptanceGates) && acceptanceGates.length === commands.length && acceptanceGates.every((gate) => gate?.status === "pass"), "Failed engineering gates block deployment acceptance");
  check(inventory.rows?.every((row) => row.status === "observed"), "Unknown/partial external inventory blocks deployed proof");
  check(live.deployedRevision === packet.approvedRevision && /^[a-f0-9]{40}$/.test(live.deployedRevision ?? ""), "Exact approved deployed revision read-back missing");
  check(packet.authority?.status === "approved" && packet.authority?.scope && packet.authority?.approvedAt, "Scoped cutover authority missing");
  check(Array.isArray(live.highThreats) && live.highThreats.length === 0, "Unresolved high threats");
  check(live.matrixVersion === MATRIX_VERSION, "Versioned deployed matrix contract missing");
  check(nonempty(live.deploymentId) && /^dpl_[A-Za-z0-9]+$/.test(live.deploymentId), "Candidate deployment identity missing");
  for (const project of ["customer", "ops", "preview"]) {
    const candidate = live.deployments?.[project];
    check(typeof candidate?.id === "string" && /^dpl_[A-Za-z0-9]+$/.test(candidate.id) && candidate.revision === live.deployedRevision, `${project}: exact candidate deployment/revision missing`);
    let origin;
    try { origin = typeof candidate?.origin === "string" ? new URL(candidate.origin) : undefined; } catch { /* rejected below */ }
    const validOrigin = origin?.protocol === "https:" && origin.pathname === "/" && !origin.search && !origin.hash && !origin.username && !origin.password && candidate.origin === origin.origin;
    check(validOrigin && (project === "customer" ? candidate.origin === packet.targets.app : project === "ops" ? candidate.origin === packet.targets.ops : ![packet.targets.app, packet.targets.marketing, packet.targets.ops, "https://www.fitout.live"].includes(candidate.origin)), `${project}: exact isolated candidate origin missing`);
  }
  check(live.deployments?.customer?.id === live.deploymentId && new Set([live.deployments?.customer?.id, live.deployments?.ops?.id, live.deployments?.preview?.id]).size === 3, "Distinct customer/ops/preview candidate deployments required");
  const matrix = Array.isArray(live.hostProviderControlMatrix) ? live.hostProviderControlMatrix : [];
  check(Array.isArray(live.hostProviderControlMatrix), "Deployed matrix must be an array");
  const seen = new Set();
  for (const row of matrix) {
    const requirement = REQUIRED_MATRIX.find((required) => required.id === row?.id);
    check(Boolean(requirement), `Unknown deployed scenario ${row?.id}`);
    check(!seen.has(row?.id), `Duplicate deployed scenario ${row?.id}`); seen.add(row?.id);
    if (!requirement) continue;
    check(row.status === "observed" && row.outcome === "pass" && nonempty(row.scenario) && nonempty(row.expected) && nonempty(row.observed) && nonempty(row.proof), `${row.id}: typed successful outcome/scenario/proof missing`);
    check(validTimestamp(row.observedAt), `${row.id}: invalid observation timestamp`);
    const project = requirement.host === "$preview" ? "preview" : requirement.host === "ops.fitout.live" ? "ops" : "customer";
    const candidate = live.deployments?.[project];
    const expectedHost = requirement.host === "$preview" ? (typeof candidate?.origin === "string" ? candidate.origin.replace("https://", "") : undefined) : requirement.host;
    check(row.deploymentId === candidate?.id && row.revision === candidate?.revision, `${row.id}: candidate identity mismatch`);
    let url;
    try { url = typeof row.url === "string" ? new URL(row.url) : undefined; } catch { /* rejected below */ }
    check(row.host === expectedHost && row.method === requirement.method && url?.protocol === "https:" && url.host === expectedHost && url.pathname === requirement.path && !url.username && !url.password, `${row.id}: exact host/URL/method missing`);
  }
  for (const requirement of REQUIRED_MATRIX) check(seen.has(requirement.id), `${requirement.id}: required deployed scenario missing`);
  check(live.rollbackVerified === true && live.contactControlsVerified === true, "Deployed rollback/Contact controls not verified");
  if (stage === "live") {
    check(live.inbox?.receipt === "observed" && live.inbox?.replyTo === "observed" && live.inbox?.reply === "observed" && live.inbox?.owner && live.inbox?.observedAt, "Actual owner-observed receipt/Reply-To/reply missing");
    check(live.inquiryAuthority === "approved" && live.contactEnabledReadback === true, "Controlled inquiry authority/Contact enablement read-back missing");
  }
}
return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
if (process.argv.includes("--capture-source")) {
  console.log(JSON.stringify(captureSourceContext(), null, 2));
} else {
const loadErrors = [];
function document(name) {
  try {
    const text = readFileSync(resolve(dir, name), "utf8");
    const block = text.match(/```json\s*([\s\S]*?)```/);
    if (!block) throw new Error("missing structured evidence block");
    return JSON.parse(block[1]);
  } catch (error) { loadErrors.push(`${name}: ${error.message}`); return {}; }
}
const engineering = document("27-ENGINEERING-EVIDENCE.md");
const inventory = document("27-DEPLOYMENT-INVENTORY.md");
const packet = document("27-CUTOVER-PACKET.md");
const live = stage === "prepared" ? {} : document("27-EVIDENCE.md");
const errors = [...loadErrors, ...validateEvidence({ engineering, inventory, packet, live, stage })];
if (errors.length) {
  console.error(`Phase 27 ${stage}: FAIL\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  const acceptance = engineering.releaseCandidateVerification ? `candidate gates ${engineering.releaseCandidateVerification.gates.every((gate) => gate.status === "pass") ? "pass" : "fail"}; historical gates retained` : engineering.gates.every((gate) => gate.status === "pass") ? "pass" : "failed gates retained";
  console.log(`Phase 27 ${stage}: evidence structure validated; engineering=${acceptance}; external approval=${packet.authority?.status ?? "pending"}.`);
}
}
}
