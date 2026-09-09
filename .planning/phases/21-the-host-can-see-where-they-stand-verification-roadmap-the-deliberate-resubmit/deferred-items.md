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
