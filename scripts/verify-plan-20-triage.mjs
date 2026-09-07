#!/usr/bin/env node

import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const CASES = [
  "host-heading-whole-space",
  "overflow-edit-photos-court",
  "verification-panel-phone-pending",
];
const PROBES = ["focused", "runner-faithful-order"];

const COMMANDS = {
  "host-heading-whole-space": {
    preflight:
      'npx playwright test e2e/host-headings.spec.ts --project=chromium --grep "wizard · whole space, every step" --list',
    focused:
      'npx playwright test e2e/host-headings.spec.ts --project=chromium --grep "wizard · whole space, every step"',
    "runner-faithful-order": "npx playwright test --project=chromium",
  },
  "overflow-edit-photos-court": {
    preflight:
      'npx playwright test e2e/overflow-320.spec.ts --project=chromium --grep "/host/listings/\\[id\\]/edit · photos step · court" --list',
    focused:
      'npx playwright test e2e/overflow-320.spec.ts --project=chromium --grep "/host/listings/\\[id\\]/edit · photos step · court"',
    "runner-faithful-order": "npx playwright test --project=chromium",
  },
  "verification-panel-phone-pending": {
    preflight:
      'npx vitest list tests/host/verification-panel.test.tsx -t "hands the typed phone to the action and locks the control while the press is out" --json',
    focused:
      'npx vitest run tests/host/verification-panel.test.tsx -t "hands the typed phone to the action and locks the control while the press is out" --reporter=verbose',
    "runner-faithful-order": "npm test",
  },
};

const IDENTITIES = {
  "host-heading-whole-space":
    "e2e/host-headings.spec.ts › AC#35 — one first-level heading per document, one size across five surfaces › wizard · whole space, every step",
  "overflow-edit-photos-court":
    "e2e/overflow-320.spec.ts › AC#36 — every Phase-14 host surface at 320px, in both themes › /host/listings/[id]/edit · photos step · court",
  "verification-panel-phone-pending":
    "tests/host/verification-panel.test.tsx › the submission form's two gates › hands the typed phone to the action and locks the control while the press is out",
};

const OWNERS = {
  "host-heading-whole-space": {
    ownedFile: "e2e/host-headings.spec.ts",
    ownedSymbol: "pressAdvance",
    observedBoundary: "step three click completes without a new save request leaving the page",
  },
  "overflow-edit-photos-court": {
    ownedFile: "e2e/overflow-320.spec.ts",
    ownedSymbol: "openWizardPhotosStep",
    observedBoundary: "checklist fix activates a photos step whose signed widget render aborts",
  },
  "verification-panel-phone-pending": {
    ownedFile: "tests/host/verification-panel.test.tsx",
    ownedSymbol: "submitMock.mockImplementation",
    observedBoundary: "focused case passes while runner order reaches a missing idle control",
  },
};

function recordLines(prefix, records) {
  return records.map((record) => `${prefix}=${JSON.stringify(record)}`);
}

function makeValidFixture() {
  const preflights = CASES.map((caseName, index) => ({
    case: caseName,
    exactCommand: COMMANDS[caseName].preflight,
    exitCode: 0,
    outputPath: `.plan20-logs/preflight-${index + 1}.txt`,
    outputSummary: `Selector collection completed with exactly one named target for case ${index + 1}.`,
    selectedTestIdentity: IDENTITIES[caseName],
    collectedCount: 1,
  }));
  const probes = CASES.flatMap((caseName, caseIndex) =>
    PROBES.map((probe, probeIndex) => {
      const observedBoundary = OWNERS[caseName].observedBoundary;
      return {
        case: caseName,
        probe,
        selectedTestIdentity: IDENTITIES[caseName],
        testExecuted: true,
        exitCode: caseIndex === 2 && probeIndex === 0 ? 0 : 1,
        outputPath: `.plan20-logs/probe-${caseIndex + 1}-${probeIndex + 1}.txt`,
        outputSummary: `Reporter completed the selected target and supplied a parseable final status for probe ${probeIndex + 1}.`,
        resultKind:
          caseIndex === 2 && probeIndex === 0 ? "not-reproduced-green" : "expected-red",
        firstDivergentState:
          `expected=the selected interaction reaches its next observable committed state; observed=${observedBoundary}`,
        exactCommand: COMMANDS[caseName][probe],
        directionalResult:
          `prediction=${caseIndex === 2 && probeIndex === 0 ? "falsified" : "confirmed"}; ` +
          `before=the selected target begins with its expected interactive surface rendered; ` +
          `after=${observedBoundary}`,
        ownedFile: OWNERS[caseName].ownedFile,
        ownedSymbol: OWNERS[caseName].ownedSymbol,
        reporterResult: {
          targetStatus: caseIndex === 2 && probeIndex === 0 ? "passed" : "failed",
          executionCount: 1,
          attemptCount: probe === "focused" && caseIndex < 2 ? 3 : 1,
        },
      };
    }),
  );
  const causes = CASES.map((caseName) => ({
    case: caseName,
    ...OWNERS[caseName],
    mechanism:
      `${OWNERS[caseName].ownedSymbol} owns ${OWNERS[caseName].observedBoundary}; the directional probe changes that boundary exactly as predicted.`,
  }));
  const fixSites = CASES.map((caseName) => ({
    case: caseName,
    ...OWNERS[caseName],
    rationale:
      `${OWNERS[caseName].ownedSymbol} is the narrow repair site for ${OWNERS[caseName].observedBoundary}; adjacent product contracts remain unchanged.`,
  }));
  return [
    ...recordLines("PREFLIGHT_JSON", preflights),
    ...recordLines("PROBE_JSON", probes),
    ...recordLines("CAUSE_JSON", causes),
    ...recordLines("FIX_SITE_JSON", fixSites),
  ].join("\n");
}

export function validateEvidenceText(_text, _options = {}) {
  // RED: the self-test below requires substantive semantic validation. The implementation lands only
  // after this assertion-red has been recorded and committed.
  return true;
}

function replaceRecord(text, prefix, index, mutate) {
  let seen = -1;
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line.startsWith(`${prefix}=`)) return line;
      seen += 1;
      if (seen !== index) return line;
      const record = JSON.parse(line.slice(prefix.length + 1));
      return `${prefix}=${JSON.stringify(mutate(structuredClone(record)))}`;
    })
    .join("\n");
}

function runSelfTest() {
  const valid = makeValidFixture();
  const tracked = new Set(Object.values(OWNERS).map(({ ownedFile }) => ownedFile));
  const options = {
    fileExists: (file) => tracked.has(file),
    isTracked: (file) => tracked.has(file),
  };
  assert.doesNotThrow(() => validateEvidenceText(valid, options), "valid fixture must pass");

  const forbidden = replaceRecord(valid, "PROBE_JSON", 0, (record) => {
    record.outputSummary = "todo";
    return record;
  });
  console.log("TAP version 13");
  console.log("not ok 1 - a forbidden-token mutation must be rejected");
  console.log("# tests 1");
  console.log("# pass 0");
  console.log("# fail 1");
  console.log("# cancelled 0");
  assert.throws(
    () => validateEvidenceText(forbidden, options),
    /forbidden/i,
    "a forbidden-token mutation must be rejected",
  );
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  if (process.argv[2] !== "--self-test") {
    throw new Error("usage: node scripts/verify-plan-20-triage.mjs --self-test <evidence-file>");
  }
  runSelfTest();
}
