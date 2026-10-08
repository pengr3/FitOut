import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validateEvidence, REQUIRED_MATRIX } from "../../scripts/verify-phase27-evidence.mjs";
import { completeFixture } from "./fixtures/phase27-evidence.mjs";
test("synthetic complete distinct deployed matrix passes structural validation only", () => {
  const fixture = completeFixture();
  assert.equal(new Set(fixture.live.hostProviderControlMatrix.map((row) => row.id)).size, REQUIRED_MATRIX.length);
  assert.deepEqual(validateEvidence(fixture), []);
});
test("twelve duplicate app-home observations fail coverage and uniqueness", () => {
  const fixture = completeFixture(); const row = fixture.live.hostProviderControlMatrix.find((item) => item.id === "app-home-only");
  fixture.live.hostProviderControlMatrix = Array.from({ length: 12 }, () => ({ ...row }));
  const errors = validateEvidence(fixture);
  assert(errors.some((error) => error.includes("Duplicate")));
  assert(errors.some((error) => error.includes("required deployed scenario missing")));
});
for (const requirement of REQUIRED_MATRIX) test(`omitting ${requirement.id} fails`, () => {
  const fixture = completeFixture();
  fixture.live.hostProviderControlMatrix = fixture.live.hostProviderControlMatrix.filter((row) => row.id !== requirement.id);
  assert(validateEvidence(fixture).some((error) => error.includes(`${requirement.id}: required deployed scenario missing`)));
});
for (const [field, value] of [["proof", true], ["expected", []], ["observed", 200], ["scenario", null], ["host", true], ["url", {}], ["method", "HEAD"], ["observedAt", "not-a-date"], ["observedAt", "2026-02-30T00:00:00Z"], ["observedAt", true], ["revision", "b".repeat(40)], ["deploymentId", "dpl_other"]]) {
  test(`wrong matrix ${field} ${JSON.stringify(value)} fails`, () => {
    const fixture = completeFixture(); fixture.live.hostProviderControlMatrix[0][field] = value;
    assert(validateEvidence(fixture).length > 0);
  });
}
test("unknown substituted ID and wrong contract version fail", () => {
  const fixture = completeFixture(); fixture.live.hostProviderControlMatrix[0].id = "substitute"; fixture.live.matrixVersion = 2;
  const errors = validateEvidence(fixture);
  assert(errors.some((error) => error.includes("Unknown deployed scenario")));
  assert(errors.some((error) => error.includes("Versioned")));
});
test("ops observation cannot substitute customer deployment identity", () => {
  const fixture = completeFixture();
  fixture.live.hostProviderControlMatrix.find((row) => row.id === "ops-front-door").deploymentId = fixture.live.deploymentId;
  assert(validateEvidence(fixture).some((error) => error.includes("ops-front-door: candidate identity mismatch")));
});
test("preview cannot substitute a production origin even when observation agrees", () => {
  const fixture = completeFixture(); fixture.live.deployments.preview.origin = "https://app.fitout.live";
  Object.assign(fixture.live.hostProviderControlMatrix.find((row) => row.id === "preview-account-isolation"), { host: "app.fitout.live", url: "https://app.fitout.live/" });
  assert(validateEvidence(fixture).some((error) => error.includes("preview: exact isolated candidate origin missing")));
});
test("mapped deployment identities and revisions must be typed and distinct", () => {
  const fixture = completeFixture(); fixture.live.deployments.ops.id = fixture.live.deploymentId; fixture.live.deployments.preview.revision = true;
  const errors = validateEvidence(fixture);
  assert(errors.some((error) => error.includes("Distinct")));
  assert(errors.some((error) => error.includes("preview: exact candidate deployment/revision missing")));
});
test("observed failed outcome cannot establish deployed acceptance", () => {
  const fixture = completeFixture(); fixture.live.hostProviderControlMatrix[0].outcome = "fail";
  assert(validateEvidence(fixture).some((error) => error.includes("typed successful outcome")));
});
test("wrong type candidate origin returns validation errors", () => {
  const fixture = completeFixture(); fixture.live.deployments.preview.origin = true;
  assert(validateEvidence(fixture).some((error) => error.includes("preview: exact isolated candidate origin missing")));
});
test("relabeled pass with failed Vitest raw summary and accurate digest fails", () => {
  const fixture = completeFixture(); const gate = fixture.engineering.gates[0];
  const log = "Test Files 1 failed (1)\nTests 8 failed (8)\n";
  fixture.logs.set(gate.rawLogPath, log); gate.logSha256 = createHash("sha256").update(log).digest("hex");
  assert(validateEvidence(fixture).some((error) => error.includes("pass label contradicts failed runner outcome")));
});
test("reported pass totals cannot contradict retained runner totals", () => {
  const fixture = completeFixture(); fixture.engineering.gates[0].resultData.tests.failed = 8;
  assert(validateEvidence(fixture).some((error) => error.includes("typed runner totals/terminal summary contradict evidence")));
});
test("pass human result cannot retain a known failed result", () => {
  const fixture = completeFixture(); fixture.engineering.gates[0].result = "3304 passed / 8 failed tests. Exit 1.";
  assert(validateEvidence(fixture).some((error) => error.includes("pass label contradicts failed runner outcome")));
});
for (const [field, value] of [["finishedAt", "2026-10-08T19:00:00Z"], ["startedAt", true], ["finishedAt", "2026-02-30T00:00:00Z"], ["terminalSummary", "invented summary"], ["result", true], ["resultData", {}], ["testedSource", undefined]]) {
  test(`invalid gate ${field} fails without throwing`, () => {
    const fixture = completeFixture(); fixture.engineering.gates[0][field] = value;
    assert(validateEvidence(fixture).length > 0);
  });
}
test("dirty working tree cannot be bound to clean/deployed SHA by relabeling revision", () => {
  const fixture = completeFixture(); fixture.engineering.gates[0].testedSource.dirty = true;
  const errors = validateEvidence(fixture);
  assert(errors.some((error) => error.includes("dirty source contradicts clean/deployed claim")));
  assert(errors.some((error) => error.includes("clean deployed source does not match tested context")));
});
test("honest dirty working tree is allowed prepared but blocks deployed", () => {
  const fixture = completeFixture();
  fixture.engineering.gates.forEach((gate) => Object.assign(gate.testedSource, { dirty: true, claim: "working-tree" }));
  assert.deepEqual(validateEvidence({ ...fixture, stage: "prepared" }), []);
  assert(validateEvidence(fixture).some((error) => error.includes("clean deployed source does not match tested context")));
});
test("historical unavailable source is retained prepared and rejected deployed", () => {
  const fixture = completeFixture(); fixture.engineering.gates.forEach((gate) => { gate.testedSource = { provenance: "unavailable", revision: null, manifest: null, capturedAt: null, dirty: true, claim: "working-tree", reason: "No capture at execution; fixture historical record" }; });
  assert.deepEqual(validateEvidence({ ...fixture, stage: "prepared" }), []);
  assert(validateEvidence(fixture).some((error) => error.includes("uncaptured historical source blocks deployed/live acceptance")));
});
for (const [field, value] of [["dirty", "false"], ["revision", true], ["capturedAt", "2027-01-01T00:00:00Z"], ["manifest", {}], ["claim", "deployed-revision"]]) {
  test(`invalid source ${field} fails`, () => {
    const fixture = completeFixture(); fixture.engineering.gates[0].testedSource[field] = value;
    assert(validateEvidence(fixture).length > 0);
  });
}
test("missing scope and mismatched manifest digest fail", () => {
  const fixture = completeFixture(); fixture.engineering.gates[0].testedSource.manifest.scope = ["src/"];
  fixture.engineering.gates[0].testedSource.manifest.sha256 = "f".repeat(64);
  const errors = validateEvidence(fixture);
  assert(errors.some((error) => error.includes("tested source scope incomplete")));
  assert(errors.some((error) => error.includes("source manifest digest mismatch")));
});
test("deployed manifest must match all captured clean gate contexts", () => {
  const fixture = completeFixture(); fixture.live.sourceManifestSha256 = "f".repeat(64);
  assert(validateEvidence(fixture).some((error) => error.includes("clean deployed source does not match tested context")));
});
test("malformed source manifest entry returns errors and cannot throw", () => {
  const fixture = completeFixture(); fixture.engineering.gates[0].testedSource.manifest.files = [null];
  assert(validateEvidence(fixture).length > 0);
});
test("claimed elapsed duration contradicting start/finish fails", () => {
  const fixture = completeFixture(); fixture.engineering.gates[0].durationSeconds = 0;
  assert(validateEvidence(fixture).some((error) => error.includes("elapsed timing contradicts")));
});
