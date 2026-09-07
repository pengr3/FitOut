# Deferred Items

## Plan 20-10

- `npx tsc --noEmit` equivalent (`node node_modules/typescript/bin/tsc --noEmit`) reaches the compiler but fails on seven pre-existing diagnostics in `tests/design/mail-credential-refusal.test.ts` and `tests/design/workflow-invariants.test.ts`. The failures predate Phase 20 (`082ea38`) and are outside this plan's nine-file scope. Plan 20-10's source diff is comment-only, so no executable or JSX token contributes to these diagnostics.
