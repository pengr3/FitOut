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

**RESOLVED (2026-07-24, quick 260724-lmy, commit 4a97771).** Both guards now include
`&& process.env.NEXT_PHASE !== "phase-production-build"` (paymongo.ts + api/inngest/route.ts). Plain
`npm run build` (no env prefixes, `.env.local` lacking all three secrets) passes exit 0 with all 27
routes; the guards still fire at a real production runtime boot (NEXT_PHASE is only that value during
the build data-collection pass). The env workaround is no longer needed.

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

## Pre-existing lint findings (logged by 07-17, out of scope)

**Found during:** 07-17 plan-level verification (`npm run lint`), 2026-07-23.

1. **Stale worktree build junk breaks bare `npm run lint`:** `.claude/worktrees/naughty-fermat-9d894d/.next/build/*`
   contains generated Turbopack output that eslint v9's flat config scans (1,000+ errors, 21k+ warnings —
   all in generated .js). Not produced by any plan's source. Fix: delete the stale worktree directory
   and/or add `.claude/worktrees/**` + `**/.next/**` to the eslint flat-config `ignores`.
2. **`src/components/listing/address-autocomplete.tsx:110`** — `react-hooks` "Calling setState
   synchronously within an effect" error (Phase-4 listing wizard file; untouched by Phase 7). One real
   error in `src/`; everything else in `src/`+`tests/` is warnings on deliberately-underscored unused args.

Neither is caused by 07-17; every file 07-17 touched lints clean (`npx eslint <files>` exit 0).

**RESOLVED (2026-07-24, quick 260724-lmy, commits 463d131 + 98b49ab).** (1) `eslint.config.mjs`
`globalIgnores` now includes `.claude/worktrees/**` + `**/.next/**`, so bare `npm run lint` is usable
(0 errors; the generated-JS flood is gone). (2) `address-autocomplete.tsx:110` `react-hooks/set-state-in-effect`
fixed by deriving the short-query empty/idle state at render and moving loading/error init into the input
handler — the effect body now has zero synchronous setState; the 250ms debounce + AbortController behavior
is preserved.

## Weekly-hours editor UX — polish candidate for the UI pass (found during Phase-7 UAT, 2026-07-23)

`src/components/availability/weekly-hours-editor.tsx` renders each day's open/close as two 24-item
`Select` dropdowns of on-the-hour times (`HOUR_OPTIONS`, generated 00:00–23:00 — a deliberate match
to the schema's on-the-hour slot rule, not hardcoding). Functional but clunky: no "apply to all
days" shortcut, no drag/range affordance, long scroll to reach evening hours. User verdict during
UAT: "take a note on this for the UI pass to polish."

Related discoverability defect (logged as a 07-UAT gap, not here): NOTHING links to
`/host/listings/[id]/availability` — the wizard has no hours step and no nav/dashboard/listing card
links there, and the publish checklist doesn't require hours, so a published listing can sit at "No
availability yet" indefinitely. That half is a functional gap, not polish.

## Duplicated approve/decline surfaces (found during Phase-7 UAT, 2026-07-23)

`/host/requests` (the dedicated queue, Phase 6) and `/host/bookings` (the Phase-7 all-bookings list)
BOTH render Approve/Decline on a `requested` booking — 07-06 deliberately reused `RequestActions`
in the host bookings row. User flagged the overlap as confusing during UAT. Worth a product
decision: either make `/host/bookings` read-only with a "Respond in Requests" link, or retire
`/host/requests` into a filter of `/host/bookings`. Not a functional defect — both paths hit the
same owner-gated action.
