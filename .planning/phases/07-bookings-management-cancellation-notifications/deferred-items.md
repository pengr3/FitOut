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

**Reconfirmed by 07-07** (2026-07-21). Hit in exactly the documented order — the PayMongo wallet guard
first, then the Inngest signing-key guard — on a tree whose only changes were the notification layer.
Same two-variable workaround, no source changed; `npm run build` then completed clean. This is now a
twice-observed, fully-characterised environment issue rather than a suspicion. Note that 07-07 ALSO adds
a function to the `/api/inngest` `functions: []` array, so the Inngest guard is now on the critical path
for one more plan's build gate — it will keep recurring until it is fixed.

---

## Root-relative `href` in cancellation notification payloads (found by 07-10, NOT fixed here)

**Where:** `src/app/actions/cancel-booking.ts` — `notifyCancellation` emits
`href: "/host/bookings"` and `href: \`/bookings/${bookingId}\`` (07-09).

**The problem:** under D-91 the payload's `href` is the SOLE input to both channels. The in-app
dropdown renders a root-relative path fine; an EMAIL client does not — `<a href="/host/bookings">`
has no origin to resolve against and is a dead link in every mail reader. So the cancellation and
refund emails ship with unclickable CTAs.

**Why not fixed here:** 07-10 is a transport migration of five specific lifecycle sends and
`cancel-booking.ts` is not one of them; the bug predates this plan (07-09) and lives in a file this
plan does not otherwise touch. Fixing it is a one-line change per emission (prefix
`process.env.BETTER_AUTH_URL`), but it is someone's plan to own, with its own test.

**What 07-10 did instead:** every href it emits is ABSOLUTE, for exactly this reason, and the
rationale is written into the call sites so the pattern is not copied back the other way.

**Impact if left:** two booker/host-facing emails (cancelled-by-booker, refund-issued) have broken
CTAs. Not a correctness or money bug — the notification still tells the truth, and the in-app row is
clickable — but it is a visible quality defect on a money-adjacent email.
