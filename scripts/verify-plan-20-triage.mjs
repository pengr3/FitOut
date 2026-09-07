#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CASES = [
  "host-heading-whole-space",
  "overflow-edit-photos-court",
  "verification-panel-phone-pending",
];
const PROBES = ["focused", "runner-faithful-order"];
const FORBIDDEN =
  /(?:^|[^A-Za-z0-9_$])(?:todo|tbd|placeholder|unknown|n\/?a|none|xxx|fill[- _]?me|sample|example)(?=$|[^A-Za-z0-9_$])/i;
const SYMBOL = /^[$A-Z_a-z][$\w]*(?:\.[$A-Z_a-z][$\w]*)*$/;

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
    ownedFile: "src/components/listing/photo-uploader.tsx",
    ownedSymbol: "PhotoUploader",
    observedBoundary: "signed widget aborts the photos step into the host error boundary",
  },
  "overflow-edit-photos-court": {
    ownedFile: "src/components/listing/photo-uploader.tsx",
    ownedSymbol: "PhotoUploader",
    observedBoundary: "checklist navigation reaches photos before the signed widget aborts rendering",
  },
  "verification-panel-phone-pending": {
    ownedFile: "tests/host/verification-panel.test.tsx",
    ownedSymbol: "waitFor",
    observedBoundary: "runner order observes refusal status while the control still reads Starting",
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

function fail(message) {
  throw new Error(message);
}

function normalized(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function visitStrings(value, path, visitor) {
  if (typeof value === "string") {
    visitor(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => visitStrings(entry, `${path}[${index}]`, visitor));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) visitStrings(entry, `${path}.${key}`, visitor);
  }
}

function parseRecords(text, prefix) {
  const records = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.startsWith(`${prefix}=`)) continue;
    try {
      records.push(JSON.parse(line.slice(prefix.length + 1)));
    } catch (error) {
      fail(`${prefix} line ${index + 1} is not parseable JSON: ${String(error)}`);
    }
  }
  return records;
}

function requireCaseMatrix(records, expectedKinds, label) {
  const expected = new Set(
    CASES.flatMap((caseName) => expectedKinds.map((kind) => `${caseName}\u0000${kind}`)),
  );
  const seen = new Set();
  for (const record of records) {
    const kind = expectedKinds.length === 1 ? expectedKinds[0] : record.probe;
    const key = `${record.case}\u0000${kind}`;
    if (!expected.has(key)) fail(`${label} contains an extra case/probe: ${key}`);
    if (seen.has(key)) fail(`${label} contains a duplicate case/probe: ${key}`);
    seen.add(key);
  }
  for (const key of expected) if (!seen.has(key)) fail(`${label} is missing case/probe: ${key}`);
}

function parseDivergence(value, label) {
  const match = /^expected=(.*); observed=(.*)$/.exec(value);
  if (!match) fail(`${label} must use expected=<observation>; observed=<observation>`);
  const expected = match[1].trim();
  const observed = match[2].trim();
  if (expected.length < 12 || observed.length < 12) fail(`${label} observations must be substantive`);
  if (normalized(expected) === normalized(observed)) fail(`${label} expected and observed must differ`);
  return { expected, observed };
}

function parseDirection(value, label) {
  const match = /^prediction=(confirmed|falsified); before=(.*); after=(.*)$/.exec(value);
  if (!match) fail(`${label} must use prediction=(confirmed|falsified); before=<observation>; after=<observation>`);
  const before = match[2].trim();
  const after = match[3].trim();
  if (before.length < 12 || after.length < 12) fail(`${label} observations must be substantive`);
  if (normalized(before) === normalized(after)) fail(`${label} before and after must differ`);
  return { prediction: match[1], before, after };
}

function requireText(value, minimum, label) {
  if (typeof value !== "string" || value.trim().length < minimum) {
    fail(`${label} must contain at least ${minimum} trimmed characters`);
  }
}

export function validateEvidenceText(text, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const fileExists = options.fileExists ?? ((file) => existsSync(resolve(cwd, file)));
  const isTracked =
    options.isTracked ??
    ((file) => {
      try {
        execFileSync("git", ["ls-files", "--error-unmatch", "--", file], {
          cwd,
          stdio: "ignore",
        });
        return true;
      } catch {
        return false;
      }
    });

  const preflights = parseRecords(text, "PREFLIGHT_JSON");
  const probes = parseRecords(text, "PROBE_JSON");
  const causes = parseRecords(text, "CAUSE_JSON");
  const fixSites = parseRecords(text, "FIX_SITE_JSON");
  const allRecords = [...preflights, ...probes, ...causes, ...fixSites];

  for (const [index, record] of allRecords.entries()) {
    visitStrings(record, `record[${index}]`, (value, path) => {
      if (FORBIDDEN.test(value)) fail(`forbidden token in ${path}`);
    });
  }

  if (preflights.length !== 3) fail(`expected exactly 3 PREFLIGHT_JSON records, found ${preflights.length}`);
  if (probes.length !== 6) fail(`expected exactly 6 PROBE_JSON records, found ${probes.length}`);
  if (causes.length !== 3) fail(`expected exactly 3 CAUSE_JSON records, found ${causes.length}`);
  if (fixSites.length !== 3) fail(`expected exactly 3 FIX_SITE_JSON records, found ${fixSites.length}`);
  requireCaseMatrix(preflights, ["preflight"], "PREFLIGHT_JSON");
  requireCaseMatrix(probes, PROBES, "PROBE_JSON");
  requireCaseMatrix(causes, ["cause"], "CAUSE_JSON");
  requireCaseMatrix(fixSites, ["fix-site"], "FIX_SITE_JSON");

  const preflightByCase = new Map();
  for (const record of preflights) {
    if (record.exactCommand !== COMMANDS[record.case].preflight) fail(`preflight command mismatch for ${record.case}`);
    if (record.exitCode !== 0) fail(`preflight exit code must be zero for ${record.case}`);
    if (record.collectedCount !== 1) fail(`preflight must collect exactly one test for ${record.case}`);
    requireText(record.outputPath, 1, `preflight outputPath for ${record.case}`);
    requireText(record.outputSummary, 24, `preflight outputSummary for ${record.case}`);
    if (record.selectedTestIdentity !== IDENTITIES[record.case]) fail(`preflight identity mismatch for ${record.case}`);
    preflightByCase.set(record.case, record);
  }

  const observedByCase = new Map(CASES.map((caseName) => [caseName, new Set()]));
  const pairByCase = new Map(CASES.map((caseName) => [caseName, new Set()]));
  for (const record of probes) {
    if (record.exactCommand !== COMMANDS[record.case][record.probe]) fail(`probe command mismatch for ${record.case}/${record.probe}`);
    if (record.selectedTestIdentity !== preflightByCase.get(record.case).selectedTestIdentity) fail(`probe identity mismatch for ${record.case}/${record.probe}`);
    if (record.testExecuted !== true) fail(`probe did not execute its selected test for ${record.case}/${record.probe}`);
    if (!Number.isInteger(record.exitCode)) fail(`probe exitCode must be numeric for ${record.case}/${record.probe}`);
    requireText(record.outputPath, 1, `probe outputPath for ${record.case}/${record.probe}`);
    requireText(record.outputSummary, 24, `probe outputSummary for ${record.case}/${record.probe}`);
    if (!record.reporterResult || typeof record.reporterResult !== "object") fail(`missing reporter result for ${record.case}/${record.probe}`);
    const { targetStatus, executionCount, attemptCount } = record.reporterResult;
    if (!Number.isInteger(executionCount) || executionCount < 1 || !Number.isInteger(attemptCount) || attemptCount < 1) {
      fail(`reporter counts must be positive integers for ${record.case}/${record.probe}`);
    }
    if (record.resultKind === "expected-red") {
      if (targetStatus !== "failed" || record.exitCode === 0) fail(`expected-red reporter mismatch for ${record.case}/${record.probe}`);
    } else if (record.resultKind === "not-reproduced-green") {
      if (targetStatus !== "passed" || record.exitCode !== 0) fail(`green reporter mismatch for ${record.case}/${record.probe}`);
    } else {
      fail(`invalid resultKind for ${record.case}/${record.probe}`);
    }
    const divergence = parseDivergence(record.firstDivergentState, `firstDivergentState for ${record.case}/${record.probe}`);
    const direction = parseDirection(record.directionalResult, `directionalResult for ${record.case}/${record.probe}`);
    if (record.resultKind === "not-reproduced-green" && direction.prediction !== "falsified") fail(`green probe must falsify its prediction for ${record.case}/${record.probe}`);
    if (record.resultKind === "expected-red" && direction.prediction !== "confirmed") fail(`red probe must confirm its prediction for ${record.case}/${record.probe}`);
    if (!fileExists(record.ownedFile)) fail(`owned file does not exist: ${record.ownedFile}`);
    if (!isTracked(record.ownedFile)) fail(`owned file is untracked: ${record.ownedFile}`);
    if (typeof record.ownedSymbol !== "string" || record.ownedSymbol.length < 6 || !SYMBOL.test(record.ownedSymbol)) fail(`invalid or short owned symbol for ${record.case}/${record.probe}`);
    observedByCase.get(record.case).add(divergence.observed);
    pairByCase.get(record.case).add(`${record.ownedFile}\u0000${record.ownedSymbol}`);
  }
  for (const caseName of CASES) {
    const rows = probes.filter((record) => record.case === caseName);
    if (rows.every((record) => record.resultKind === "not-reproduced-green")) {
      fail(`${caseName} is green in both modes, so no causal boundary was measured`);
    }
  }

  for (const [label, records, detailKey] of [
    ["CAUSE_JSON", causes, "mechanism"],
    ["FIX_SITE_JSON", fixSites, "rationale"],
  ]) {
    const details = new Set();
    for (const record of records) {
      if (!fileExists(record.ownedFile)) fail(`${label} owned file does not exist: ${record.ownedFile}`);
      if (!isTracked(record.ownedFile)) fail(`${label} owned file is untracked: ${record.ownedFile}`);
      if (!pairByCase.get(record.case).has(`${record.ownedFile}\u0000${record.ownedSymbol}`)) fail(`${label} file/symbol mismatch for ${record.case}`);
      if (!observedByCase.get(record.case).has(record.observedBoundary)) fail(`${label} observed boundary mismatch for ${record.case}`);
      requireText(record[detailKey], 48, `${label} ${detailKey} for ${record.case}`);
      if (!record[detailKey].includes(record.ownedSymbol) || !record[detailKey].includes(record.observedBoundary)) {
        fail(`${label} ${detailKey} must name its owned symbol and exact observed boundary for ${record.case}`);
      }
      const normalizedDetail = normalized(record[detailKey]);
      if (details.has(normalizedDetail)) fail(`${label} ${detailKey} must be unique across cases`);
      details.add(normalizedDetail);
    }
  }

  return { preflights, probes, causes, fixSites };
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
  assert.throws(
    () => validateEvidenceText(forbidden, options),
    /forbidden/i,
    "a forbidden-token mutation must be rejected",
  );

  const parsed = validateEvidenceText(valid, options);
  const stringPaths = [];
  [...parsed.preflights, ...parsed.probes, ...parsed.causes, ...parsed.fixSites].forEach((record, recordIndex) =>
    visitStrings(record, `${recordIndex}`, (_value, path) => stringPaths.push(path)),
  );
  for (const path of stringPaths) {
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").map(Number);
    const groups = ["PREFLIGHT_JSON", "PROBE_JSON", "CAUSE_JSON", "FIX_SITE_JSON"];
    const sizes = [parsed.preflights.length, parsed.probes.length, parsed.causes.length, parsed.fixSites.length];
    let offset = parts[0];
    let groupIndex = 0;
    while (offset >= sizes[groupIndex]) offset -= sizes[groupIndex++];
    const mutated = replaceRecord(valid, groups[groupIndex], offset, (record) => {
      const keys = path.split(".").slice(1);
      let target = record;
      for (const key of keys.slice(0, -1)) target = target[key];
      target[keys.at(-1)] = "todo";
      return record;
    });
    assert.throws(() => validateEvidenceText(mutated, options), /forbidden/i, `forbidden token at ${path}`);
  }

  const mutations = [
    ["equal expected/observed", replaceRecord(valid, "PROBE_JSON", 0, (r) => ({ ...r, firstDivergentState: "expected=the same substantive observation; observed=the same substantive observation" }))],
    ["equal before/after", replaceRecord(valid, "PROBE_JSON", 0, (r) => ({ ...r, directionalResult: "prediction=confirmed; before=the same substantive observation; after=the same substantive observation" }))],
    ["invalid symbol", replaceRecord(valid, "PROBE_JSON", 0, (r) => ({ ...r, ownedSymbol: "bad symbol" }))],
    ["short symbol", replaceRecord(valid, "PROBE_JSON", 0, (r) => ({ ...r, ownedSymbol: "tiny" }))],
    ["missing reporter", replaceRecord(valid, "PROBE_JSON", 0, (r) => { delete r.reporterResult; return r; })],
    ["missing file", replaceRecord(valid, "PROBE_JSON", 0, (r) => ({ ...r, ownedFile: "e2e/absent-record.ts" }))],
    ["untracked file", replaceRecord(valid, "PROBE_JSON", 0, (r) => ({ ...r, ownedFile: "e2e/untracked-record.ts" }))],
    ["duplicate case", `${valid}\n${valid.split(/\r?\n/).find((line) => line.startsWith("PREFLIGHT_JSON="))}`],
    ["missing case", valid.split(/\r?\n/).filter((line) => !line.startsWith("FIX_SITE_JSON=") || !line.includes(CASES[2])).join("\n")],
    ["extra case", `${valid}\nCAUSE_JSON=${JSON.stringify({ ...parsed.causes[0], case: "surplus-case" })}`],
    ["cause file mismatch", replaceRecord(valid, "CAUSE_JSON", 0, (r) => ({ ...r, ownedFile: OWNERS[CASES[2]].ownedFile }))],
    ["cause symbol mismatch", replaceRecord(valid, "CAUSE_JSON", 0, (r) => ({ ...r, ownedSymbol: OWNERS[CASES[2]].ownedSymbol }))],
    ["fix boundary mismatch", replaceRecord(valid, "FIX_SITE_JSON", 0, (r) => ({ ...r, observedBoundary: "a distinct substantive boundary that no probe reported" }))],
  ];
  for (const [label, mutated] of mutations) {
    const mutationOptions =
      label === "untracked file"
        ? { fileExists: () => true, isTracked: (file) => file !== "e2e/untracked-record.ts" }
        : options;
    assert.throws(() => validateEvidenceText(mutated, mutationOptions), undefined, label);
  }

  console.log(`self-test passed: ${stringPaths.length} forbidden-token positions and ${mutations.length} semantic mutations rejected`);
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  const [mode, evidencePath] = process.argv.slice(2);
  if (mode === "--self-test") {
    runSelfTest();
    if (evidencePath) validateEvidenceText(readFileSync(resolve(evidencePath), "utf8"));
  } else if (mode && !evidencePath) {
    validateEvidenceText(readFileSync(resolve(mode), "utf8"));
  } else {
    throw new Error("usage: node scripts/verify-plan-20-triage.mjs [--self-test] <evidence-file>");
  }
}
