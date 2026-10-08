import { test } from "node:test";
import assert from "node:assert/strict";
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
