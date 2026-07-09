---
phase: 02-listings-host-onboarding
plan: 06
subsystem: payments
tags: [paymongo, webhooks, hmac, idempotency, onboarding, linked-accounts, bookability, rate-limit, audit, drizzle, next-server-actions]

# Dependency graph
requires:
  - phase: 02-listings-host-onboarding (Plan 01)
    provides: "host_payout table (paymongoAccountId/activationStatus/payoutsEnabled/onboardingComplete); deriveBookable pure sell-gate; mockPayMongo helper (createLinkedAccount/createOnboardingLink/signWebhook/badSignature); the two RED webhook anchors"
  - phase: 02-listings-host-onboarding (Plan 02)
    provides: "rate-limit (src/lib/rate-limit.ts) + audit (src/lib/audit.ts) for the WR-06 carry-forward; PAYMONGO_* documented in .env.example"
  - phase: 02-listings-host-onboarding (Plan 03)
    provides: "host dashboard (src/app/(host)/host/page.tsx) — the seam the payout banner is added to"
provides:
  - "src/lib/paymongo.ts — thin fetch REST client (no SDK), HTTP Basic auth, Idempotency-Key on POSTs, production-only fail-closed boot guard"
  - "startPayoutOnboarding / refreshOnboardingLink server actions — lazy, row-locked create-once Linked Account, fresh single-use onboarding link, rate-limited + audited"
  - "POST /api/paymongo/webhook — raw-body Paymongo-Signature-verified, idempotent merchant.activated/merchant.declined handler; the SINGLE writer of payoutsEnabled (the bookability gate)"
  - "paymongo_event idempotency ledger (schema + migration 0003, live DB migrate-tracked)"
  - "PayoutBanner + derivePayoutStatus, host/payouts/{return,refresh} pages, dashboard wiring (D-12/D-13/D-14)"
affects: [phase-03-availability, phase-04-search-and-book-cta, phase-05-payments-capture-transfer, phase-06-instant-vs-request]

# Tech tracking
tech-stack:
  added: [PayMongo Platforms/Linked-Accounts REST (thin fetch client — no SDK), node:crypto HMAC-SHA256 webhook verification]
  patterns:
    - "Webhook as the single writer of a cached gate flag (payoutsEnabled) — bookability is purely derived, so D-14 auto-revert is free (zero per-listing writes)"
    - "Row-locked create-once (SELECT ... FOR UPDATE inside a tx) to guarantee at most one PayMongo Linked Account per host under concurrency"
    - "Constant-time signature verify with a byte-length guard before timingSafeEqual (any bad/malformed/forged sig -> clean 400, never a 500)"
    - "Idempotency ledger keyed by provider event id (duplicate delivery -> 200 skip)"
    - "Session resolved inline in the action (id + email) rather than via capability.ts's private email-less requireUserId"

key-files:
  created:
    - src/lib/paymongo.ts
    - src/app/actions/paymongo-connect.ts
    - src/app/api/paymongo/webhook/route.ts
    - src/components/host/payout-banner.tsx
    - src/app/(host)/host/payouts/return/page.tsx
    - src/app/(host)/host/payouts/refresh/page.tsx
    - drizzle/0003_paymongo_event.sql
    - tests/paymongo/onboarding.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/app/(host)/host/page.tsx
    - tests/paymongo/webhook-signature.test.ts
    - tests/paymongo/webhook-merchant-activated.test.ts

key-decisions:
  - "payoutsEnabled is webhook/server-set ONLY (single writer = the webhook); onboarding persists paymongoAccountId server-side but never touches the flag (mirrors Phase-1 input:false discipline, T-06-PRIV)"
  - "Applied migration 0003 via drizzle-kit migrate (matching Phase 1's migrate-tracked live DB) — drizzle-kit push requires a TTY this shell lacks; the generated SQL was first applied directly, then reconciled by dropping + re-applying through migrate so drizzle.__drizzle_migrations records it (now 4 tracked)"
  - "Webhook event shape parsed as data.id (event id) + data.attributes.type + data.attributes.data.id (Linked-Account id), consistent with the Wave-0 mock body; exact PayMongo field confirmed in MANUAL UAT once beta access lands"
  - "Real PayMongo hosted onboarding deferred to MANUAL UAT — Platforms/Linked-Accounts is beta/sales-gated; all tests mock @/lib/paymongo, so nothing depends on a live PayMongo call"

patterns-established:
  - "Webhook-driven cached gate flag + pure derivation = free auto-revert (D-14)"
  - "Row-locked create-once for provider-account provisioning"
  - "Byte-length-guarded constant-time HMAC verify (fail to a clean 400)"

requirements-completed: [PAY-04]

# Metrics
duration: ~28min
completed: 2026-07-09
---

# Phase 2 Plan 06: PayMongo Payout Onboarding & the merchant.activated Bookability Gate Summary

**The architectural keystone: a row-locked, rate-limited/audited PayMongo Linked-Account onboarding action plus the raw-body, `Paymongo-Signature`-verified, idempotent `merchant.activated`/`merchant.declined` webhook that is the single writer of `payoutsEnabled` — the cached flag `deriveBookable` reads, so a decline auto-reverts every listing to not-bookable with zero per-listing writes.**

## Performance

- **Duration:** ~28 min (incl. verification + migration reconciliation)
- **Started:** 2026-07-09T20:51:00+08:00
- **Completed:** 2026-07-09T21:10:00+08:00
- **Tasks:** 3 (all `auto`; Tasks 1-2 TDD)
- **Files created/modified:** 12

## Accomplishments

- **The bookability gate (PAY-04).** The webhook verifies `Paymongo-Signature` (HMAC-SHA256 over `` `${t}.${rawBody}` `` against `te`/`li`, byte-length-guarded so `timingSafeEqual` can never throw a 500), dedupes by event id via the new `paymongo_event` ledger, and on `merchant.activated` caches `payoutsEnabled=true` keyed by `paymongoAccountId`. It is the ONLY writer of the flag.
- **D-14 auto-revert for free.** `merchant.declined` flips `payoutsEnabled=false`; because `deriveBookable` reads the flag, every one of the host's published listings instantly becomes not-bookable with **zero per-listing writes** (proven by a byte-identical listing-row snapshot before/after decline).
- **Row-locked create-once onboarding.** `startPayoutOnboarding` resolves the session inline (id + email), rate-limits (5/60s) + audits (WR-06), then under a `SELECT ... FOR UPDATE` transaction creates **at most one** Linked Account per host and always mints a **fresh single-use** onboarding link.
- **Persistent payout nudge (D-12/D-13).** `PayoutBanner` reflects all four states (not-started / incomplete / enabled / paused) with host-friendly copy that never says "Stripe"/"PayMongo"/"KYC"/"webhook"; publishing remains independent of payouts.
- **All three PayMongo test files GREEN**, full suite green (135 tests), and the production build passes with the `.env` placeholder `PAYMONGO_*`.

## Task Commits

Each task was committed atomically (TDD tasks: test RED → feat GREEN):

1. **Task 1 (RED): onboarding anchor** - `ece1e39` (test)
2. **Task 1 (GREEN): PayMongo client + row-locked onboarding action** - `6e4fc86` (feat)
3. **Task 2 (RED): webhook signature + merchant.activated anchors** - `f9f45c8` (test)
4. **Task 2 (GREEN): schema paymongo_event + migration 0003 + webhook route** - `b4b55fa` (feat)
5. **Task 3: payout banner + return/refresh pages + dashboard wiring** - `acfb2cb` (feat)

**Plan metadata:** _(this SUMMARY commit)_ `docs(02-06)`

## Files Created/Modified

- `src/lib/paymongo.ts` — thin `fetch` REST client (base `api.paymongo.com/v1`), HTTP Basic auth (secret key as username), `Idempotency-Key` on POSTs, production-only fail-closed boot guard; `createLinkedAccount` + `createOnboardingLink`.
- `src/app/actions/paymongo-connect.ts` — `startPayoutOnboarding` (session-gated, rate-limited + audited, row-locked create-once, fresh link) + `refreshOnboardingLink`.
- `src/app/api/paymongo/webhook/route.ts` — `runtime="nodejs"`, raw `req.text()`, signature verify → 400 on any failure, idempotent, `merchant.activated`→enable / `merchant.declined`→revert, always 200 on handled.
- `src/lib/db/schema.ts` — added the `paymongoEvent` idempotency table.
- `drizzle/0003_paymongo_event.sql` (+ meta snapshot/journal) — the new-table migration, applied to the live DB via `drizzle-kit migrate`.
- `src/components/host/payout-banner.tsx` — `PayoutBanner` (client) + `derivePayoutStatus`.
- `src/app/(host)/host/payouts/return/page.tsx` + `.../refresh/page.tsx` — onboarding landing pages (canHost re-check; refresh re-mints a link).
- `src/app/(host)/host/page.tsx` — renders `<PayoutBanner>` near the top.
- `tests/paymongo/onboarding.test.ts` (new), `tests/paymongo/webhook-signature.test.ts` + `tests/paymongo/webhook-merchant-activated.test.ts` (RED anchors → real GREEN assertions).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `&apos;` HTML entities inside JS string literals rendered literally**
- **Found during:** Task 3 (self-review before `tsc`).
- **Issue:** In `payout-banner.tsx` and `return/page.tsx`, apostrophes inside ternary **JavaScript string literals** (passed as JSX children) were written as `&apos;`. HTML entities only decode in JSX *text*, not JS strings, so users would have seen the literal text `You&apos;ve...`.
- **Fix:** Replaced with real apostrophes in the JS strings; kept `&apos;`/`&ldquo;`/`&rdquo;` only in genuine JSX text (where `react/no-unescaped-entities` requires them).
- **Files modified:** `src/components/host/payout-banner.tsx`, `src/app/(host)/host/payouts/return/page.tsx`
- **Commit:** `acfb2cb`

**2. [Rule 3 - Blocking] `drizzle-kit push` requires a TTY the executor shell lacks**
- **Found during:** Task 2 (migration apply). `drizzle-kit push` tried to open an interactive "new table vs rename" prompt and errored (`Interactive prompts require a TTY`).
- **Fix:** Generated `0003` (needed by the isolated-schema test harness regardless), applied it to the live DB, then — to preserve Plan 01's **migrate-tracked** live DB — dropped the directly-created (empty) table and re-applied it through `drizzle-kit migrate`, so `drizzle.__drizzle_migrations` now records 4 migrations. End state is identical to the intended `push`, and the dev migrate workflow stays consistent.
- **Commit:** `b4b55fa` (schema + migration); live-DB reconciliation performed post-commit.

## Verification Results

- `npx tsc --noEmit` — **PASS** (exit 0).
- `npx vitest run tests/paymongo/onboarding.test.ts` — **PASS** (3/3): create-once reuse + rate-limit denial/audit + no-session gate.
- `npx vitest run tests/paymongo/webhook-signature.test.ts tests/paymongo/webhook-merchant-activated.test.ts` — **PASS** (13/13): bad/malformed/length-mismatched sig → 400, valid → 200, idempotent (one ledger row); activated→enable+bookable, declined→revert with no listing write, flag never from a client body field.
- `npm test` (full suite) — **PASS** (29 files, 135 tests). _Note: one run of the pre-existing Phase-1 `tests/auth/secret-config.test.ts` timed out at 5s under heavy parallel load (90s import time); it passes in isolation (2.46s) and on the clean re-run — a load-induced flake, not a regression from this plan._
- `npm run build` — **PASS**. All routes compiled including `ƒ /api/paymongo/webhook`, `ƒ /host/payouts/refresh|return`, `ƒ /host`; 16/16 static pages. The placeholder `PAYMONGO_*` did not trip the fail-closed guard (production-only; the key is present in `.env`).
- Migration `0003_paymongo_event` **applied to the live DB** and tracked (`drizzle.__drizzle_migrations` = 4).

## Security Carry-Forward (phase gate)

- **WR-06 CLOSED + applied here:** `startPayoutOnboarding` is bounded (5/60s per identity) and audits every denial — the same treatment as the capability-activate actions, satisfied **before** payouts wire to the `canHost`/bookability flow.
- **WR-04 status surfaced:** no host-onboarding email is in scope this phase; the existing fire-and-forget verify/reset path is unchanged. WR-04 (email-send retry/observability) remains a tracked Phase-7 email-layer item.
- **Threat register (all `mitigate` dispositions implemented):** T-06-SPOOF (signature verify, 400 never 500), T-06-REPLAY (event-id idempotency), T-06-PRIV (webhook is the single writer; onboarding never sets the flag), T-06-IDOR (own-row only, rate-limited + audited), T-06-SECRET (server-only secret, prod fail-closed, `runtime=nodejs`), T-06-LINK (single-use links re-minted every click, never persisted).

## Threat Flags

None — no security surface beyond the plan's `<threat_model>` was introduced. The webhook is the only new network endpoint and is exactly the modeled trust boundary.

## Known Stubs

None that block PAY-04. The two onboarding **endpoint paths** in `src/lib/paymongo.ts` (`/linked_accounts`, `/linked_accounts/onboarding_links`) are built to the documented PayMongo Platforms/Linked-Accounts contract but are **not yet exercised against live PayMongo** (beta/sales-gated). Every test mocks `@/lib/paymongo`, so this is a UAT item, not a functional stub — see below.

## Remaining for MANUAL UAT

PayMongo Platforms / Linked Accounts is **beta / sales-gated**, so real hosted onboarding requires PayMongo to enable the platform on the account. Once enabled (per 02-HUMAN-UAT.md):
1. Expose the local endpoint with a tunnel (`ngrok http 3000` or `cloudflared tunnel`) — PayMongo has no Stripe-CLI equivalent.
2. Register `https://<tunnel>/api/paymongo/webhook` in the PayMongo dashboard and set the real `PAYMONGO_WEBHOOK_SECRET`.
3. Start onboarding from the host dashboard ("Set up payouts"), complete the hosted KYC, and confirm the real `merchant.activated` event flips `payoutsEnabled` and the listing becomes bookable — validating the exact live event field names (`data.attributes.type` / the Linked-Account id location) against the shapes parsed here.

## Self-Check: PASSED

All 9 created/modified deliverable files exist on disk and all 5 task commits (`ece1e39`, `6e4fc86`, `f9f45c8`, `b4b55fa`, `acfb2cb`) are present in git history.
