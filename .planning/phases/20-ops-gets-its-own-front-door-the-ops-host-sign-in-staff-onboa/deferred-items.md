# Deferred Items

## Plan 20-10

- `npx tsc --noEmit` equivalent (`node node_modules/typescript/bin/tsc --noEmit`) reaches the compiler but fails on seven pre-existing diagnostics in `tests/design/mail-credential-refusal.test.ts` and `tests/design/workflow-invariants.test.ts`. The failures predate Phase 20 (`082ea38`) and are outside this plan's nine-file scope. Plan 20-10's source diff is comment-only, so no executable or JSX token contributes to these diagnostics.

## Plan 20-03

- The same TypeScript command still reports the seven Plan 20-10 diagnostics plus two diagnostics in `tests/auth/ops-host-routing.test.ts` where a `Response`-typed Proxy handler is passed to Next's helpers expecting `NextResponse`. That file was introduced by Plan 20-02 and is outside Plan 20-03. The two diagnostics in Plan 20-03's new auth test were fixed before close-out; the production Next.js build completes successfully.
