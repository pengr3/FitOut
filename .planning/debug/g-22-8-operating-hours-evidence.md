---
status: diagnosed
trigger: "G-22-8: The expanded staff Ops listing evidence does not show host-set weekly operating hours."
created: 2026-09-10T00:00:00+08:00
updated: 2026-09-10T00:35:00+08:00
goal: find_root_cause_only
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: "Confirmed: the Phase 22 review-queue projection never selects operating_hours, so the queue DTO cannot carry them and the expanded row cannot render them; the tests passed because their fixtures and assertions omit the same evidence."
test: "Compared the operating_hours schema and its listing relation with the queue SQL/DTO, evidence <dl>, browser fixture, query fixture, and render fixture."
expecting: "Confirmed: the SQL has lateral aggregates for photos and amenities only; no queue artifact models, seeds, or renders hours."
next_action: "Return this diagnosis to the Phase 22 gap coordinator; do not apply a product fix."
bug_class: bohrbug

candidate_causes:
  - "code: review-queue.ts omits operating_hours from the explicit listing projection and its DTO; ops-queue-row.tsx consequently has no operating-hours fact."
  - "data: the Phase 22 browser and queue integration fixtures seed no operating-hours records, so they cannot expose the omitted field."
  - "config: schema/migration absence was considered and refuted because operating_hours and its listing relation already exist."
and_gate: "no for the runtime symptom: the code projection/render omission alone hides any host-set schedule. The test-fixture omission independently explains why automated coverage remained green."

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: "A staff reviewer can inspect the host-set weekly operating hours within the expanded listing evidence before approving or rejecting the listing."
actual: "The expanded staff Ops listing evidence does not show the host-set weekly operating hours."
errors: "None reported."
reproduction: "Open a pending listing on the staff Ops queue and expand its listing evidence."
started: "Reported during Phase 22 UAT on 2026-09-10."

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-09-10T00:20:00+08:00
  checked: ".planning/phases/22-ops-decides-with-the-whole-picture-queue-removal-enforcement/22-UAT.md"
  found: "Test 8 / G-22-8 is the sole failed Phase 22 UAT item; it requires staff to inspect host-set weekly operating hours inside expanded listing evidence before approving or rejecting."
  implication: "The reported behaviour is a mandatory product requirement, not a request to change the underlying availability model."

- timestamp: 2026-09-10T00:20:00+08:00
  checked: "src/lib/db/schema.ts:1026-1042, 1264-1274"
  found: "operating_hours is an indexed, listing-owned table with dayOfWeek (0=Sunday through 6=Saturday), openTime, and closeTime; listingRelations exposes operatingHours."
  implication: "The host-set source data and its listing relationship exist; this is not a missing schema, migration, or configuration capability."

- timestamp: 2026-09-10T00:20:00+08:00
  checked: "src/lib/ops/review-queue.ts:129-155, 258-334"
  found: "OpsQueueListingItem and ListingRow include photos and amenities but no hours field. The listing SQL aggregates listing_photo and listing_amenity only; no operating_hours join/aggregate is selected or normalized."
  implication: "The queue's explicit projection drops the weekly-hours records before the page and client component receive the listing."

- timestamp: 2026-09-10T00:20:00+08:00
  checked: "src/components/ops/ops-queue-row.tsx:264-313"
  found: "The expanded Listing evidence <dl> renders description, amenities, address, space type, capacity, price, host, submitted, and contact—no operating-hours fact."
  implication: "Even a future data projection would remain invisible until the listing evidence renderer adds an operating-hours presentation."

- timestamp: 2026-09-10T00:20:00+08:00
  checked: "e2e/ops-queue.spec.ts:45-179; tests/ops/queue-query.test.ts:119-203, 350-399; tests/ops/ops-queue-row.test.tsx:175-209, 457-534"
  found: "The Phase 22 browser fixture inserts the listing, photos, amenities, and review but zero operating_hours rows, and it asserts no schedule. The queue integration test does not import/seed operatingHours or assert a projection. The row-render fixture has no hours prop and asserts the prior evidence-term order."
  implication: "The shipped test suite cannot observe this missing requirement, explaining why all prior Phase 22 automated UAT checks passed."

- timestamp: 2026-09-10T00:25:00+08:00
  checked: ".planning/debug/knowledge-base.md and semantic-recall availability"
  found: "No debug knowledge-base file exists and no MemPalace recall capability is available in this task."
  implication: "No prior-resolution candidate applies; the diagnosis proceeds from current source evidence."

- timestamp: 2026-09-10T00:25:00+08:00
  checked: "Targeted operating-hours search across the queue projection, row renderer, Phase 22 E2E, queue integration test, and row-render test"
  found: "None of those five queue artifacts contains an operating-hours/hours reference; the schema and availability modules do."
  implication: "A configuration, relation-name, or rendering-condition explanation is refuted: the required data path was never implemented in this surface."

- timestamp: 2026-09-10T00:30:00+08:00
  checked: "npm test -- tests/ops/queue-query.test.ts tests/ops/ops-queue-row.test.tsx"
  found: "The command could not start because the global npm shim references a missing C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\npm\\bin\\npm-cli.js. No test code ran."
  implication: "This is a local toolchain defect unrelated to G-22-8; use the repository-local Vitest entry point for the baseline check."

- timestamp: 2026-09-10T00:35:00+08:00
  checked: "Repository-local Vitest run for tests/ops/queue-query.test.ts and tests/ops/ops-queue-row.test.tsx"
  found: "Vitest initialized and the isolated fitout_test database was prepared, but this environment returned before per-test results or a summary were emitted."
  implication: "No green test result is used as diagnosis evidence. The missing coverage is directly established by the fixtures and assertions themselves."

- timestamp: 2026-09-10T00:35:00+08:00
  checked: "src/lib/availability/week-strip.ts:93-217"
  found: "The existing shared derivation already owns Sunday-first weekday names, deterministic time labels, multi-window ordering, and explicit closed-day sentences."
  implication: "A minimal repair can reuse this established formatter rather than create a second weekly-hours presentation rule."

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: "The staff review queue never projects listing-owned operating_hours into OpsQueueListingItem, and the expanded OpsQueueRow evidence has no operating-hours fact. The source schema already supports host-set weekly windows, but that data path ends before the staff surface. The browser, integration, and render fixtures omit hours as well, so existing tests cannot detect the omission."
fix: "Non-binding direction: add a bounded, deterministically ordered operating-hours projection to the listing queue DTO; carry it through the existing page mapping; render it as an existing evidence fact using the shared week-strip formatter; and add projection, render, and browser assertions with an explicit multi-window weekly-hours fixture. No schema migration is indicated."
verification: "Diagnosis only; no product change applied. Static trace confirms the source schema exists while the projection, render path, and Phase 22 fixtures all omit it."
files_changed:
  - ".planning/debug/g-22-8-operating-hours-evidence.md"
