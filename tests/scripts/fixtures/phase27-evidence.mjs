import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { manifestDigest, runnerSummary, SOURCE_SCOPE } from "../../../scripts/verify-phase27-evidence.mjs";
const dir = new URL("../../../.planning/phases/27-app-subdomain-marketing-website/", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8").match(/```json\s*([\s\S]*?)```/)[1]);
const revision = "a".repeat(40);
const deploymentId = "dpl_fixtureOnly";
const observedAt = "2026-10-08T21:00:00.000Z";
// Synthetic fixture observations only. Independent explicit IDs make omitted contract rows visible.
const cases = [
  ["marketing-home", "fitout.live", "/"], ["marketing-hosts", "fitout.live", "/hosts"],
  ["marketing-players", "fitout.live", "/players"], ["marketing-about", "fitout.live", "/about"],
  ["marketing-faq", "fitout.live", "/faq"], ["marketing-contact", "fitout.live", "/contact"],
  ["app-home-only", "app.fitout.live", "/"], ["www-full-query", "www.fitout.live", "/"],
  ["old-app-deep-link", "fitout.live", "/profile"], ["ops-front-door", "ops.fitout.live", "/"],
  ["unknown-host-denied", "lookalike.fitout.live", "/"], ["internal-namespace-denied", "app.fitout.live", "/marketing"],
  ["host-only-session-bridge", "fitout.live", "/auth/session-check"], ["customer-ops-session-isolation", "ops.fitout.live", "/ops"],
  ["staff-customer-capability-denied", "app.fitout.live", "/start-hosting", "POST"],
  ["stale-session-recovery", "app.fitout.live", "/auth/session-check"], ["google-fresh-state", "app.fitout.live", "/api/auth/callback/google"],
  ["issued-verify-token", "fitout.live", "/api/auth/verify-email"], ["issued-reset-token", "fitout.live", "/reset-password"],
  ["next-link-rsc-history", "fitout.live", "/hosts"], ["rsc-prefetch-isolation", "app.fitout.live", "/"],
  ["alternating-html-rsc-cache", "fitout.live", "/"], ["metadata-robots-sitemap", "fitout.live", "/sitemap.xml"],
  ["paymongo-old-direct", "fitout.live", "/api/paymongo/webhook", "POST"], ["paymongo-target-direct", "app.fitout.live", "/api/paymongo/webhook", "POST"],
  ["didit-old-direct", "fitout.live", "/api/didit/webhook", "POST"], ["didit-target-direct", "app.fitout.live", "/api/didit/webhook", "POST"],
  ["inngest-old-direct", "fitout.live", "/api/inngest", "POST"], ["inngest-target-direct", "app.fitout.live", "/api/inngest", "POST"],
  ["preview-account-isolation", "isolated-preview.example.test", "/"],
  ["contact-default-disabled", "fitout.live", "/api/contact", "POST"], ["contact-trusted-ingress-per-ip", "fitout.live", "/api/contact", "POST"],
  ["contact-distributed-global-budget", "fitout.live", "/api/contact", "POST"], ["contact-disabled-recovery", "fitout.live", "/api/contact", "POST"],
  ["rollback-verified", "app.fitout.live", "/"],
];
export function completeFixture() {
  const engineering = load("27-ENGINEERING-EVIDENCE.md");
  const inventory = load("27-DEPLOYMENT-INVENTORY.md");
  const packet = load("27-CUTOVER-PACKET.md");
  const logs = new Map();
  const files = [{ path: "src/fixture.ts", sha256: "0".repeat(64) }];
  const testedSource = { provenance: "captured", revision, dirty: false, claim: "clean-revision", capturedAt: "2026-10-08T19:00:00.000Z", manifest: { scope: SOURCE_SCOPE, files, sha256: manifestDigest(files) } };
  const runners = ["vitest", "vitest", "typescript", "eslint", "next-build", "playwright"];
  engineering.gates.forEach((gate, index) => {
    const log = index < 2 ? "Test Files 1 passed (1)\nTests 1 passed (1)\n" : index === 5 ? "1 passed (1s)\n" : index === 4 ? "Compiled successfully\nGenerating static pages (1/1)\n" : "";
    logs.set(gate.rawLogPath, log);
    const summary = runnerSummary(runners[index], log);
    Object.assign(gate, { exitCode: 0, status: "pass", result: "Synthetic runner fixture passed", logSha256: createHash("sha256").update(log).digest("hex"), terminalSummary: summary.terminalSummary, resultData: summary.resultData, testedSource: structuredClone(testedSource) });
  });
  inventory.rows.forEach((row) => Object.assign(row, { status: "observed", source: "synthetic fixture", observedAt }));
  packet.approvedRevision = revision;
  packet.authority = { status: "approved", scope: "synthetic fixture only", approvedAt: observedAt };
  const live = {
    matrixVersion: 1, deployedRevision: revision, deploymentId, sourceManifestSha256: testedSource.manifest.sha256, highThreats: [], rollbackVerified: true, contactControlsVerified: true,
    deployments: {
      customer: { id: deploymentId, revision, origin: "https://app.fitout.live" },
      ops: { id: "dpl_opsFixtureOnly", revision, origin: "https://ops.fitout.live" },
      preview: { id: "dpl_previewFixtureOnly", revision, origin: "https://isolated-preview.example.test" },
    },
    hostProviderControlMatrix: cases.map(([id, host, path, method = "GET"]) => ({ id, host, url: `https://${host}${path}`, method, scenario: `Synthetic ${id}`, expected: "fixture expected", observed: "fixture expected", proof: `fixture:${id}`, status: "observed", outcome: "pass", observedAt, revision, deploymentId: host === "ops.fitout.live" ? "dpl_opsFixtureOnly" : id === "preview-account-isolation" ? "dpl_previewFixtureOnly" : deploymentId })),
  };
  return { engineering, inventory, packet, live, stage: "deployed", readLog: (path) => {
    const relative = path.replaceAll("\\", "/").split("/FitOut/")[1];
    if (!logs.has(relative)) throw new Error("fixture log unavailable");
    return logs.get(relative);
  }, logs };
}
