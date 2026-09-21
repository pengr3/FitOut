---
status: resolved
trigger: "TypeScript validation exits 1 during Phase 25.1 local payment readiness validation."
created: "2026-09-21T00:00:00Z"
updated: "2026-09-21T09:00:00+08:00"
---

## Symptoms

- expected: "`node node_modules/typescript/bin/tsc --noEmit` exits 0 so the local validation baseline can be PASS."
- actual: "The command exited 1 in the fresh Phase 25.1 validation run; no diagnostic output was retained in the redacted evidence ledger."
- errors: "`TYPESCRIPT_CHECK_FAILED` (aggregate class only)."
- timeline: "Observed during the fresh local validation run completed on 2026-09-19."
- reproduction: "Run `node node_modules/typescript/bin/tsc --noEmit` from the repository root."

## Current Focus

reasoning_checkpoint:
  hypothesis: "The raw compiler fails because Next.js 16's concurrent dev and production generated route validators disagree about the encoded %5Fops-auth layout route, while six test files also contain stale or unsound type annotations; either category independently makes tsc exit 1."
  confirming_evidence:
    - "The exact compiler repro reports TS2344 only in .next/types/validator.ts and its two route declarations disagree on /_ops-auth versus /%5Fops-auth."
    - "Next 16's local type-paths and runTypeCheck implementation intentionally includes both directories but filters .next/dev/types only in Next's own checker; vercel/next.js#93700 documents this exact %5F layout failure after dev/build outputs coexist."
    - "Each remaining compiler diagnostic maps directly to an authored test annotation or import: Response versus NextResponse, a required NODE_ENV key, invalid generic ReturnType use, an object spread that erases operatingHours, omitted imported types, and a constructor value used as an instance type."
  falsification_test: "After the targeted generated-validator exclusion and source-type corrections, the exact command must report none of the original TS2344/TS23xx/TS27xx diagnostics; any remaining original location disproves the corresponding correction."
  fix_rationale: "Exclude only the generated production validator whose incompatible dev global route type causes the documented framework defect, while preserving all authored source checking; correct the test annotations so they accurately model the values already used at runtime."
  blind_spots: "Next's upstream issue is open, so the generated-validator exclusion is a local workaround; this run will not execute next build because the task prohibits provider/financial operations and build routes are out of scope."
  candidate_causes:
    - "config/environment: Next 16 emits incompatible dev and production route validators for a percent-encoded leading-underscore layout while raw tsc includes both."
    - "code: tests have stale imports and type expressions that TypeScript 5 and Next 16's declarations reject."
  and_gate: "no — each category independently causes a non-zero compiler exit, so both require correction but neither requires the other to trigger."

hypothesis: "The targeted corrections eliminate the exact compiler failure without changing runtime behavior."
test: "Run static lint over all changed test files and inspect the diff for whitespace or behavioral changes."
expecting: "Lint and diff checks pass; the diff remains confined to type annotations, imports, a required test fixture property, and the generated-validator exclusion."
next_action: "archive the resolved session after committing the scoped fix"

## Evidence

- timestamp: "2026-09-21T08:02:00+08:00"
  checked: "Phase-0 semantic and durable knowledge-base recall"
  found: "The mempalace CLI is unavailable and .planning/debug/knowledge-base.md does not exist."
  implication: "No known-pattern candidate is available; proceed with direct compiler observation."

- timestamp: "2026-09-21T08:05:00+08:00"
  checked: "Exact reproduction: node node_modules/typescript/bin/tsc --noEmit"
  found: "The command deterministically exits 1 with 20 diagnostics: a .next/types versus .next/dev/types LayoutRoutes conflict and 19 source-test type errors across auth, design, ops, search, and verification tests."
  implication: "This is a deterministic Bohrbug-class validation failure with at least two independent cause categories (generated-environment artifact and authored test typing)."

- timestamp: "2026-09-21T08:14:00+08:00"
  checked: "tsconfig.json, generated Next route declarations, and local Next 16 TypeScript/typegen implementation and documentation"
  found: "Next 16 intentionally adds both route-type globs and filters .next/dev/types only inside Next's own build type-checker. The two current generated declarations differ only for the encoded %5Fops-auth layout route: .next/types exposes /_ops-auth and .next/dev/types exposes /%5Fops-auth."
  implication: "Raw tsc sees an incompatible generated declaration pair. Generated files must not be edited; the validation configuration needs a stable direct-tsc exclusion or a framework-supported equivalent."

- timestamp: "2026-09-21T08:28:00+08:00"
  checked: "All authored diagnostic locations and their referenced declarations"
  found: "The 19 non-generated errors are type-only test defects: proxy returns NextResponse, Next's ProcessEnv intentionally requires NODE_ENV, SpawnSyncReturns is the string-output overload, OpsQueueListingRow requires operatingHours, ProgressiveSearchEvent is exported but not imported, PositionError is not a DOM type, and DiditSessionError's dynamic binding is a constructor rather than an instance type."
  implication: "The fixes can be confined to test annotations/imports and one test fixture property; no production or provider code needs changing."

- timestamp: "2026-09-21T08:36:00+08:00"
  checked: "Exact reproduction after targeted corrections"
  found: "node node_modules/typescript/bin/tsc --noEmit completed with tsc_exit=0 and no diagnostics."
  implication: "All 20 original TypeScript diagnostics are resolved by the targeted changes."

- timestamp: "2026-09-21T08:39:00+08:00"
  checked: "Default Vitest runner for directly affected non-design tests"
  found: "The default configuration excludes tests/design and its global setup stopped before test collection because the local test database at localhost:5432 is unavailable."
  implication: "This is an environment limitation, not a regression signal; no database will be started because the requested compiler validation does not require it."

- timestamp: "2026-09-21T08:42:00+08:00"
  checked: "Database-free design tests through vitest.design.config.ts"
  found: "tests/design/mail-credential-refusal.test.ts and tests/design/workflow-invariants.test.ts passed: 2 files, 55 tests."
  implication: "The corrected child-process typings preserve the exercised design-gate behavior."


## Eliminated


## Resolution

root_cause: "Next.js 16's dev and production generated validators conflict for an encoded leading-underscore layout when both outputs coexist and raw tsc checks them; separately, six tests had invalid, stale, or erased TypeScript declarations. Either condition independently caused the required compiler command to exit 1."
fix: "Excluded only .next/types/validator.ts from direct tsc because Next.js 16's current dev/prod generated validators conflict for the encoded %5Fops-auth layout route; corrected the affected tests' type annotations, imports, fixture property, and dynamic error-instance type."
verification:
  - "node node_modules/typescript/bin/tsc --noEmit exits 0."
  - "tests/design/mail-credential-refusal.test.ts and tests/design/workflow-invariants.test.ts: 55 tests passed."
  - "git diff --check over the scoped fix reports no whitespace errors."
files_changed:
  - tsconfig.json
  - tests/auth/ops-host-routing.test.ts
  - tests/design/mail-credential-refusal.test.ts
  - tests/design/workflow-invariants.test.ts
  - tests/ops/ops-queue-row.test.tsx
  - tests/search/progressive-search.test.tsx
  - tests/verification/didit-session.test.ts
oracle_type: specified
