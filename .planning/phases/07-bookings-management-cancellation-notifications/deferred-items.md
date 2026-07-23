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

**Reconfirmed by 07-14** (2026-07-21). Third observation, unchanged. 07-14 ships changes to BOTH route-group
layouts, so its build gate is genuinely load-bearing (a layout that fails to compile breaks every page under
it) — which makes the noise from this issue more costly than for a plan that only touches leaf modules. Same
three-variable workaround, no source changed; the build then completed clean and listed all 24 routes.

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

**RESOLVED by 07-11** (see 07-11-SUMMARY.md "Assigned Out-of-Plan Fix") — hrefs are now absolute via
`BETTER_AUTH_URL`, with regression assertions on both cancel paths.

---

## `npm run build` env-placeholder issue — reconfirmed by 07-16 (2026-07-23)

Fourth+ observation, unchanged behaviour and unchanged workaround
(`PLATFORM_WALLET_NUMBER=x PLATFORM_WALLET_NAME=x INNGEST_SIGNING_KEY=x npm run build`). Hit on both
of this plan's build gates; no source changed. Still worth the one-line `NEXT_PHASE` fix or a CI env.

---

## Refund transfers have no reconcile poller (found by 07-16, deliberately not built there)

**Where:** `createRefundTransfer` (src/lib/paymongo.ts) fires a D-72 InstaPay refund transfer; the only
durable handle is the `refund_transfer_dispatched` audit entry carrying `transferId` + masked last-4.

**The gap:** transfers start `pending` and PayMongo has NO transfer webhook. Host payouts are polled to
terminal status by `payout-reconcile` off their `host_payout_ledger` row — but a refund transfer has no
ledger row (it is not a payout and D-72 forbids persisting the destination), so nothing polls it. A
refund transfer that fails asynchronously AFTER a 200-accepted POST surfaces nowhere automatically; an
operator must `getTransfer(transferId)` from the audit trail.

**Why not fixed in 07-16:** out of the plan's files list and threat model; the whole path is currently
unreachable live anyway (Money Movement endpoints 404 until PayMongo enables the feature — see the
A3-BLOCKED evidence in refund-rail.ts). Building a poller against an endpoint that cannot yet be
exercised would be untestable scaffolding.

**When to fix:** alongside the manual UAT once Money Movement is enabled. Shape: a minimal
`refund_transfer` tracking row (transferId, bookingId, state — still no destination fields) + a clone of
the payout-reconcile poll, or fold into that cron with a kind discriminator.

**Impact if left:** an async-failed refund transfer looks dispatched in the audit trail until an
operator manually polls it — the exact "healthy-looking code path stranding a booker's money" failure
mode the Task-1 probe matrix warned about for the HTTP-200 branch.
