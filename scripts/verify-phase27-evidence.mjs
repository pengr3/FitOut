import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import { createHash } from "node:crypto";

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
check(engineering.gates?.length === commands.length, "All six full gate results are required");
for (let index = 0; index < commands.length; index++) {
  const gate = engineering.gates?.[index] ?? {};
  check(gate.command === commands[index], `Gate ${index + 1} command/order missing`);
  check(Number.isInteger(gate.exitCode) && Number.isFinite(gate.durationSeconds) && gate.durationSeconds >= 0, `Gate ${index + 1} actual exit/timing missing`);
  check(["pass", "fail"].includes(gate.status) && (gate.exitCode === 0) === (gate.status === "pass"), `Gate ${index + 1} status contradicts exit`);
  check(Boolean(gate.result && gate.logSha256 && /^[a-f0-9]{64}$/.test(gate.logSha256)), `Gate ${index + 1} bounded result/evidence digest missing`);
  check(["raw-log", "terminal-transcript"].includes(gate.evidenceKind), `Gate ${index + 1} evidence provenance missing`);
  if (gate.evidenceKind === "terminal-transcript") {
    check(gate.rawLogAvailable === false && Boolean(gate.rawLogLoss), `Gate ${index + 1} lost raw log must be explicit`);
    check(gate.logSha256 === createHash("sha256").update(gate.result).digest("hex"), `Gate ${index + 1} transcript digest contradicts saved result`);
  } else if (gate.evidenceKind === "raw-log") {
    check(gate.rawLogAvailable === true && typeof gate.rawLogPath === "string", `Gate ${index + 1} raw log path/presence missing`);
    if (typeof gate.rawLogPath === "string") {
      const logPath = resolve(root, gate.rawLogPath);
      const fromRoot = relative(root, logPath);
      const contained = fromRoot !== ".." && !fromRoot.startsWith("../") && !fromRoot.startsWith("..\\") && !isAbsolute(fromRoot);
      check(contained, `Gate ${index + 1} raw log path leaves workspace`);
      if (contained) {
        try { check(createHash("sha256").update(readLog(logPath)).digest("hex") === gate.logSha256, `Gate ${index + 1} raw log digest mismatch`); }
        catch { check(false, `Gate ${index + 1} raw log unavailable`); }
      }
    }
  }
  if (gate.status === "fail") check(Boolean(gate.disposition), `Gate ${index + 1} failure disposition missing`);
  check(Number.isFinite(Date.parse(gate.startedAt)) && Number.isFinite(Date.parse(gate.finishedAt)), `Gate ${index + 1} timestamps missing`);
  if (index > 0) check(Date.parse(gate.startedAt) >= Date.parse(engineering.gates?.[index - 1]?.finishedAt), `Gate ${index + 1} overlapped preceding gate`);
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
  check(engineering.gates?.every((gate) => gate.status === "pass"), "Failed engineering gates block deployment acceptance");
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
  console.log(`Phase 27 ${stage}: evidence structure validated; engineering=${engineering.gates.every((gate) => gate.status === "pass") ? "pass" : "failed gates retained"}; external approval=${packet.authority?.status ?? "pending"}.`);
}
}
