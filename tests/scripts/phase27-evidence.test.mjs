import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validateEvidence, REQUIRED_MATRIX, runnerSummary, gateHistoryDigest, QUOTA_MIGRATION_FILES, manifestDigest } from "../../scripts/verify-phase27-evidence.mjs";
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

function quotaManifestFixture() {
  const fixture = completeFixture();
  for (const gate of fixture.engineering.gates) {
    const manifest = gate.testedSource.manifest;
    manifest.scope = [...manifest.scope, "drizzle/"];
    manifest.files = [...manifest.files, ...QUOTA_MIGRATION_FILES.map((path) => ({ path, sha256: "1".repeat(64) }))].sort((a, b) => a.path < b.path ? -1 : 1);
    manifest.sha256 = manifestDigest(manifest.files);
  }
  fixture.live.sourceManifestSha256 = fixture.engineering.gates[0].testedSource.manifest.sha256;
  return fixture;
}
test("new migration scope binds additive SQL, journal and snapshot while historical scope remains valid", () => {
  assert.deepEqual(validateEvidence(quotaManifestFixture()), []);
  assert.deepEqual(validateEvidence(completeFixture()), []);
});
for (const path of QUOTA_MIGRATION_FILES) test(`declared migration scope missing ${path} refuses acceptance`, () => {
  const fixture = quotaManifestFixture();
  const manifest = fixture.engineering.gates[0].testedSource.manifest;
  manifest.files = manifest.files.filter((file) => file.path !== path);
  manifest.sha256 = manifestDigest(manifest.files);
  assert(validateEvidence(fixture).some((error) => error.includes("declared additional source config missing")));
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
function snapshotFixture() {
  const fixture = completeFixture();
  const gate = fixture.engineering.gates[0]; const source = gate.testedSource;
  const path = "playwright/.cache/phase27-08/fixture-source.json";
  const bytes = JSON.stringify(source); fixture.logs.set(path, bytes);
  gate.testedSource = { provenance: "snapshot", path, sha256: createHash("sha256").update(bytes).digest("hex"), revision: source.revision, dirty: source.dirty, claim: source.claim, capturedAt: source.capturedAt, manifestSha256: source.manifest.sha256 };
  return fixture;
}
test("workspace-contained source snapshot is loaded, hashed and validated", () => {
  assert.deepEqual(validateEvidence(snapshotFixture()), []);
});
for (const [field, value] of [["path", "../outside.json"], ["sha256", "0".repeat(64)], ["dirty", true], ["revision", "b".repeat(40)], ["manifestSha256", true], ["capturedAt", "2026-10-08T19:01:00Z"]]) {
  test(`source snapshot reference wrong ${field} fails`, () => {
    const fixture = snapshotFixture(); fixture.engineering.gates[0].testedSource[field] = value;
    assert(validateEvidence(fixture).length > 0);
  });
}
test("changed snapshot bytes cannot retain old byte digest", () => {
  const fixture = snapshotFixture(); const source = fixture.engineering.gates[0].testedSource;
  fixture.logs.set(source.path, fixture.logs.get(source.path) + " ");
  assert(validateEvidence(fixture).some((error) => error.includes("source snapshot byte digest mismatch")));
});
test("persisted supplemental gates undergo same summary and source checks", () => {
  const fixture = snapshotFixture();
  fixture.engineering.reviewFixVerification = { gates: [structuredClone(fixture.engineering.gates[5])] };
  const gate = fixture.engineering.reviewFixVerification.gates[0];
  gate.startedAt = fixture.engineering.gates[5].finishedAt; gate.finishedAt = gate.startedAt; gate.durationSeconds = 0;
  assert.deepEqual(validateEvidence(fixture), []);
  gate.resultData.tests.failed = 1;
  assert(validateEvidence(fixture).some((error) => error.includes("typed runner totals/terminal summary contradict evidence")));
});
test("compiled Next build with a type-check failure retains explicit failed terminal summary", () => {
  const summary = runnerSummary("next-build", "Compiled successfully\nFailed to type check.\nType error: fixture generated routes conflict\n");
  assert.equal(summary.resultData.compiled, true);
  assert.equal(summary.resultData.generated, false);
  assert.equal(summary.resultData.errors, 2);
  assert.equal(summary.failed, 2);
  assert.match(summary.terminalSummary, /Failed to type check/);
});

// These are synthetic byte-consistency fixtures, never release, account or execution proof.
function replacementFixture() {
  const fixture = completeFixture();
  const gates = structuredClone(fixture.engineering.gates);
  gates.forEach((gate, index) => {
    const log = fixture.logs.get(gate.rawLogPath);
    gate.rawLogPath = `playwright/.cache/phase27-08/synthetic-candidate-${index}.log`;
    fixture.logs.set(gate.rawLogPath, log);
    gate.startedAt = new Date(Date.UTC(2026, 9, 8, 22, index)).toISOString();
    gate.finishedAt = new Date(Date.UTC(2026, 9, 8, 22, index, 1)).toISOString();
    gate.durationSeconds = 1;
  });
  fixture.engineering.gates.forEach((gate) => { gate.testedSource = { provenance: "unavailable", revision: null, manifest: null, capturedAt: null, dirty: true, claim: "working-tree", reason: "Synthetic historical unavailable capture" }; });
  const old = fixture.engineering.gates[0];
  const log = "Test Files 1 failed (1)\nTests 8 failed (8)\n";
  const summary = runnerSummary("vitest", log);
  fixture.logs.set(old.rawLogPath, log);
  Object.assign(old, { status: "fail", exitCode: 1, result: "8 failed; historical fixture", disposition: "Superseded by complete synthetic clean candidate run; historical failure retained", logSha256: createHash("sha256").update(log).digest("hex"), resultData: summary.resultData, terminalSummary: summary.terminalSummary });
  fixture.engineering.releaseCandidateVerification = { schemaVersion: 1, disposition: "Complete clean candidate rerun; preserve historical failures", supersedesSha256: gateHistoryDigest(fixture.engineering), revision: fixture.live.deployedRevision, sourceManifestSha256: fixture.live.sourceManifestSha256, gates };
  return fixture;
}

test("complete clean replacement can supersede honestly failed uncaptured history", () => {
  const fixture = replacementFixture();
  assert.deepEqual(validateEvidence(fixture), []);
  assert.equal(fixture.engineering.gates[0].status, "fail");
  delete fixture.engineering.releaseCandidateVerification;
  assert(validateEvidence(fixture).some((error) => error.includes("Failed engineering gates")));
});

test("replacement retains validation of historical log bytes", () => {
  const fixture = replacementFixture();
  const old = fixture.engineering.gates[0];
  fixture.logs.set(old.rawLogPath, fixture.logs.get(old.rawLogPath) + "tampered");
  assert(validateEvidence(fixture).some((error) => error.includes("raw log digest mismatch")));
});

test("replacement binds the complete historical record rather than just its status", () => {
  const fixture = replacementFixture();
  fixture.engineering.gates[0].disposition = "Altered history";
  assert(validateEvidence(fixture).some((error) => error.includes("bind retained gate history")));
});

test("replacement binds supplemental failed attempts as well as the first six gates", () => {
  const fixture = replacementFixture();
  const gate = structuredClone(fixture.engineering.gates[0]);
  gate.startedAt = fixture.engineering.gates.at(-1).finishedAt;
  gate.finishedAt = gate.startedAt; gate.durationSeconds = 0;
  fixture.engineering.reviewFixVerification = { gates: [gate] };
  fixture.engineering.releaseCandidateVerification.supersedesSha256 = gateHistoryDigest(fixture.engineering);
  assert.deepEqual(validateEvidence(fixture), []);
  gate.resultData.tests.failed = 7;
  fixture.engineering.releaseCandidateVerification.supersedesSha256 = gateHistoryDigest(fixture.engineering);
  assert(validateEvidence(fixture).some((error) => error.includes("typed runner totals")));
});

for (const [field, value] of [["schemaVersion", 2], ["disposition", ""], ["supersedesSha256", "0".repeat(64)], ["revision", "b".repeat(40)], ["sourceManifestSha256", "f".repeat(64)], ["gates", []], ["gates", null]]) {
  test(`replacement malformed ${field} blocks acceptance`, () => {
    const fixture = replacementFixture(); fixture.engineering.releaseCandidateVerification[field] = value;
    assert(validateEvidence(fixture).length > 0);
  });
}

test("null replacement cannot fall back to historic acceptance", () => {
  const fixture = completeFixture(); fixture.engineering.releaseCandidateVerification = null;
  assert(validateEvidence(fixture).length > 0);
});

test("dirty replacement fails even at prepared stage", () => {
  const fixture = replacementFixture();
  Object.assign(fixture.engineering.releaseCandidateVerification.gates[0].testedSource, { dirty: true, claim: "working-tree" });
  assert(validateEvidence({ ...fixture, stage: "prepared" }).some((error) => error.includes("clean deployed source")));
});

test("replacement requires canonical full gate order and cannot substitute focused tests", () => {
  const fixture = replacementFixture();
  fixture.engineering.releaseCandidateVerification.gates[0].command += " tests/contact/contact-route.test.ts";
  assert(validateEvidence(fixture).some((error) => error.includes("command/order/runner")));
});

test("failed or relabeled replacement cannot establish acceptance", () => {
  const fixture = replacementFixture();
  const gate = fixture.engineering.releaseCandidateVerification.gates[0];
  const log = "Test Files 1 failed (1)\nTests 1 failed (1)\n";
  fixture.logs.set(gate.rawLogPath, log); gate.logSha256 = createHash("sha256").update(log).digest("hex");
  assert(validateEvidence(fixture).some((error) => error.includes("pass label contradicts")));
  const summary = runnerSummary("vitest", log);
  Object.assign(gate, { status: "fail", exitCode: 1, disposition: "Still failing", result: "1 failed", resultData: summary.resultData, terminalSummary: summary.terminalSummary });
  assert(validateEvidence(fixture).some((error) => error.includes("Failed engineering gates")));
});

test("replacement cannot overlap or precede historical gates", () => {
  const fixture = replacementFixture(); const gate = fixture.engineering.releaseCandidateVerification.gates[0];
  gate.startedAt = fixture.engineering.gates[0].startedAt;
  gate.finishedAt = new Date(Date.parse(gate.startedAt) + 1000).toISOString();
  assert(validateEvidence(fixture).some((error) => error.includes("overlapped preceding gate")));
});

test("replacement cannot bypass unknown accounts, authority or Contact controls", () => {
  const fixture = replacementFixture();
  fixture.inventory.rows[0].status = "unknown";
  fixture.packet.authority.status = "pending";
  fixture.live.contactControlsVerified = false;
  const errors = validateEvidence(fixture);
  assert(errors.some((error) => error.includes("external inventory")));
  assert(errors.some((error) => error.includes("authority")));
  assert(errors.some((error) => error.includes("Contact controls")));
});
