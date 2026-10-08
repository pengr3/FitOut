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
const errors = [];
const check = (fact, message) => { if (!fact) errors.push(message); };
function document(name) {
  try {
    const text = readFileSync(resolve(dir, name), "utf8");
    const block = text.match(/```json\s*([\s\S]*?)```/);
    if (!block) throw new Error("missing structured evidence block");
    return JSON.parse(block[1]);
  } catch (error) { errors.push(`${name}: ${error.message}`); return {}; }
}
const engineering = document("27-ENGINEERING-EVIDENCE.md");
const inventory = document("27-DEPLOYMENT-INVENTORY.md");
const packet = document("27-CUTOVER-PACKET.md");
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
        try { check(createHash("sha256").update(readFileSync(logPath)).digest("hex") === gate.logSha256, `Gate ${index + 1} raw log digest mismatch`); }
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
  const live = document("27-EVIDENCE.md");
  check(engineering.gates?.every((gate) => gate.status === "pass"), "Failed engineering gates block deployment acceptance");
  check(inventory.rows?.every((row) => row.status === "observed"), "Unknown/partial external inventory blocks deployed proof");
  check(live.deployedRevision === packet.approvedRevision && /^[a-f0-9]{40}$/.test(live.deployedRevision ?? ""), "Exact approved deployed revision read-back missing");
  check(packet.authority?.status === "approved" && packet.authority?.scope && packet.authority?.approvedAt, "Scoped cutover authority missing");
  check(live.highThreats?.length === 0 && live.hostProviderControlMatrix?.every((row) => row.status === "observed" && row.proof && row.observedAt), "Unresolved high threats or unobserved deployed matrix");
  check(live.hostProviderControlMatrix?.length >= 12, "Complete deployed host/provider/control matrix required");
  check(live.rollbackVerified === true && live.contactControlsVerified === true, "Deployed rollback/Contact controls not verified");
  if (stage === "live") {
    check(live.inbox?.receipt === "observed" && live.inbox?.replyTo === "observed" && live.inbox?.reply === "observed" && live.inbox?.owner && live.inbox?.observedAt, "Actual owner-observed receipt/Reply-To/reply missing");
    check(live.inquiryAuthority === "approved" && live.contactEnabledReadback === true, "Controlled inquiry authority/Contact enablement read-back missing");
  }
}
if (errors.length) {
  console.error(`Phase 27 ${stage}: FAIL\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Phase 27 ${stage}: evidence structure validated; engineering=${engineering.gates.every((gate) => gate.status === "pass") ? "pass" : "failed gates retained"}; external approval=${packet.authority?.status ?? "pending"}.`);
}
