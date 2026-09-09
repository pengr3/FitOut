# Deferred Items

## 21-01 out-of-scope verification findings

- `npm.cmd run typecheck` is not defined in `package.json`. The equivalent Next.js production
  TypeScript pass completed successfully during `npm.cmd exec next build` after removing the stale
  generated `.next/dev` route manifest.
- The repository-wide ESLint command currently traverses untracked local `.codex/` and `.gsd/`
  runtime/check-out artifacts and reports CommonJS/style violations there. Plan-local source and test
  files pass ESLint; these local runtime artifacts are not owned by Phase 21.
- The full design suite currently has unrelated failures in the concurrent Phase 20 ops-action
  origin/census assertions, the suspense-trigger census, and the existing Windows email-silence
  harness. The Phase 21 roadmap's card, accent, one-tree, tone, and loading design gates pass when run
  directly.

## 21-02 out-of-scope verification findings

- `npm.cmd run typecheck` remains undefined in `package.json`. The production Next.js build completed
  its TypeScript validation and generated all 35 static pages successfully.
- The full design suite completed 1,460 assertions but retains four unrelated failures already present
  after 21-01: the Phase 20 ops-action origin/census delta, the Phase 21-01 roadmap success-hue census,
  and the Phase 20 suspense-trigger census. The four design suites covering the changed host-listing
  surface pass all 30 assertions.

## 21-03 out-of-scope verification findings

- `npm.cmd run typecheck` remains undefined in `package.json`. The clean production Next.js build
  compiled successfully, completed its TypeScript pass, and generated all 35 static pages.
- Direct `tsc --noEmit` still reports the pre-existing test-harness typing errors in
  `tests/auth/ops-host-routing.test.ts`, `tests/design/mail-credential-refusal.test.ts`, and
  `tests/design/workflow-invariants.test.ts`; none is in the 21-03 change set.
- On Windows, the listing-grid Playwright process remains open after all five browser scenarios have
  reported their assertion results because the spawned Next dev-server descendants do not terminate.
  The four established scenarios passed in the first run, and the new rejected-entry scenario passed
  both targeted and full-file runs before the idle process was interrupted.
