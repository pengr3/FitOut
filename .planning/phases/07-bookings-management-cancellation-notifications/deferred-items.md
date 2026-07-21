# Deferred items — Phase 7

Out-of-scope discoveries logged during execution. Not fixed by the discovering plan.

## `npm run build` fails without three fail-closed env vars (found during 07-06)

`next build` runs with `NODE_ENV=production`, so two module-scope fail-closed guards throw during
Next's "Collecting page data" step on a machine whose `.env.local` lacks the production secrets:

| Guard | File | Route that trips it |
|---|---|---|
| `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` | `src/lib/paymongo.ts:39-47` (added 05-02, `da95c5a`) | `/api/paymongo/webhook` |
| `INNGEST_SIGNING_KEY` | `src/app/api/inngest/route.ts` | `/api/inngest` |

The PayMongo guard's own comment states the opposite of its behaviour — *"Dev/test/build tolerate
placeholders so the fully-mocked suite and `next build` still pass"* — but nothing in the condition
distinguishes a production **build** from a production **boot**. Next exposes
`process.env.NEXT_PHASE === "phase-production-build"` for exactly this.

**Workaround used to run the 07-06 build gate** (no source changed):

```bash
PLATFORM_WALLET_NUMBER=buildcheck PLATFORM_WALLET_NAME=buildcheck INNGEST_SIGNING_KEY=buildcheck npm run build
```

**Why not fixed here:** both files are payments/background-job plumbing untouched by 07-06, and
relaxing a fail-closed money guard is not a change to make as a drive-by. It needs its own decision
about whether the build phase should be exempted or whether CI should simply supply the values.

**Impact if left:** every plan that carries a `npm run build` gate will hit this and may either
mis-report the build as broken or paper over it. Worth a one-line fix in a Wave-3+ plan.
