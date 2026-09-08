# Deferred Items

## Plan 20-10

- `npx tsc --noEmit` equivalent (`node node_modules/typescript/bin/tsc --noEmit`) reaches the compiler but fails on seven pre-existing diagnostics in `tests/design/mail-credential-refusal.test.ts` and `tests/design/workflow-invariants.test.ts`. The failures predate Phase 20 (`082ea38`) and are outside this plan's nine-file scope. Plan 20-10's source diff is comment-only, so no executable or JSX token contributes to these diagnostics.

## Plan 20-03

- The same TypeScript command still reports the seven Plan 20-10 diagnostics plus two diagnostics in `tests/auth/ops-host-routing.test.ts` where a `Response`-typed Proxy handler is passed to Next's helpers expecting `NextResponse`. That file was introduced by Plan 20-02 and is outside Plan 20-03. The two diagnostics in Plan 20-03's new auth test were fixed before close-out; the production Next.js build completes successfully.

## Plan 20-13

- Repository-wide `node node_modules/typescript/bin/tsc --noEmit` still reports the same nine diagnostics in `tests/auth/ops-host-routing.test.ts`, `tests/design/mail-credential-refusal.test.ts`, and `tests/design/workflow-invariants.test.ts`. None of those files changed between Plan 20-13's ledger base and either task commit; the five focused design inventories pass 98/98 and scoped ESLint is clean.

## Plan 20-09

- The plan-level three-file design command passes `ops-host-invariants` and `loading-coverage` but reports two pre-existing census failures in `tests/design/ops-guard-coverage.test.ts`: the already-shipped `signOutOpsAction` is absent from the expected auth-action list and the pinned total remains 16 instead of 17. That test file is outside Plan 20-09's task scope; the Task 2 route, gateway, cloak, origin, session, action-replay, production-build, and browser checks are green.
- The focused database suites ended clean. The repository's older contained public-schema test-leak finding remains historical and unchanged; no new escaped write was reported by Plan 20-09.
