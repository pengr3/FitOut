---
plan_id: 260709-id2
title: Swap payments provider Stripe → PayMongo in planning docs
type: quick
status: complete
completed: 2026-07-09
tasks: 3
tasks_complete: 3
commits:
  - task: 1
    file: .planning/PROJECT.md
    hash: 3202c69
  - task: 2
    file: CLAUDE.md
    hash: b83dde3
  - task: 3
    file: .planning/phases/02-listings-host-onboarding/02-02-PLAN.md
    hash: 1eebe11
---

# Quick Task 260709-id2: Swap payments provider Stripe → PayMongo Summary

**One-liner:** Swapped the payments provider from Stripe Connect → PayMongo across the planning source-of-truth (PROJECT.md decision, CLAUDE.md stack + payments guidance, 02-02 dependency/env), encoding the hold-until-session payout model (collect to platform wallet → HOLD → on-demand `inhouse` `batch_transfer` after the session) and the `merchant.activated` bookability gate. DOCS ONLY — no product code touched.

## What Changed Per File

### Task 1 — `.planning/PROJECT.md` (commit `3202c69`)
- Added **D-20** to the Key Decisions table: adopt **PayMongo** (PH-native, BSP-regulated EMI; rails QRPh + GCash + Maya + cards) as the payments provider for the Philippine launch, replacing Stripe Connect. Captures the authoritative model: hold-until-session payout (collect full amount to the platform wallet → HOLD → after the session push an on-demand `inhouse` wallet-to-wallet transfer via `POST /v2/batch_transfers`, `provider:"paymongo"`, of booking − commission), **not** PayMongo "payment splitting"; bookability gate = `merchant.activated` webhook + `activation_status: activated` + wallet `status: activated`; no official SDK; `Paymongo-Signature` HMAC-SHA256 webhooks + `Idempotency-Key`. Rationale (no PH acquiring / no QRPh on Stripe) + sandbox-spike validation recorded.
- Added a **Superseded decisions** note marking **D-17** (Stripe SDK pin `stripe@^22`/apiVersion) and **D-19** (Stripe Connect `country=US` via `STRIPE_CONNECT_COUNTRY`) as superseded by D-20 (not deleted; canonical records noted to live in `02-CONTEXT.md`).
- Updated the `Last updated` footer for provenance.

### Task 2 — `CLAUDE.md` (commit `b83dde3`)
- **Core Technologies** row: Stripe Connect → **PayMongo** (REST `/v1`+`/v2`, no official SDK; QRPh/GCash/Maya/cards; Platforms/Linked Accounts onboarding; hold-until-session payout).
- **Supporting Libraries** row: Stripe Node SDK → **PayMongo REST client** (thin `fetch` wrapper / community TS lib; `Paymongo-Signature` webhooks; `Idempotency-Key`).
- **Development Tools**: Stripe CLI → **ngrok / cloudflared** tunnel (PayMongo has no CLI); Vitest note now targets **PayMongo test mode**.
- **Marketplace Payments — Prescriptive Detail** (was an empty header): populated with the full PayMongo payout model — collect→HOLD→on-demand `inhouse` `batch_transfer` after session; do NOT use payment splitting; never pay host at booking time; webhook as source of truth; bookability gate; integration mechanics; Phase-6 capture note.
- **Alternatives Considered**, **What NOT to Use** (payment-splitting anti-pattern + non-activated-wallet payout anti-pattern; "build your own KYC/escrow" → PayMongo Platforms/Linked Accounts), **Version Compatibility**, and **Sources** rewritten to PayMongo.
- Remaining `stripe` matches are comparative/historical only (e.g. "chosen over Stripe", "the Stripe `payouts_enabled` equivalent", the constraint's illustrative "e.g. Stripe Connect", the revision note) — no prescriptive Stripe stack rows.

### Task 3 — `.planning/phases/02-listings-host-onboarding/02-02-PLAN.md` (commit `1eebe11`)
- Removed `stripe@^22` from the dependency install; documented that **PayMongo has no official SDK** — a thin server-side `fetch` wrapper (or optional community TS lib) added when Plan 06 builds `src/lib/paymongo.ts`; no PayMongo npm dependency in this plan.
- Replaced Stripe env vars with `PAYMONGO_SECRET_KEY` / `PAYMONGO_PUBLIC_KEY` / `PAYMONGO_WEBHOOK_SECRET` (dropped `STRIPE_CONNECT_COUNTRY` — D-19 superseded; PayMongo is PH-native).
- Updated `must_haves`, `done`, acceptance-criteria (package + env greps), threat model (payouts, `PAYMONGO_*` secrets, `paymongo.ts`), and success criteria accordingly.
- Left the WR-06 rate-limit/audit work, design tokens, and 15 shadcn components untouched.

## Verify Results (per-task grep from the plan)

| Task | Command | Result |
|------|---------|--------|
| 1 | `grep -n -i "paymongo\|superseded" .planning/PROJECT.md` | PASS — D-20 PayMongo decision + D-17/D-19 marked superseded |
| 2 | `grep -n -i stripe CLAUDE.md` | PASS — only comparative/historical mentions; PayMongo present in every stack table + payments section |
| 3 | `grep -n -i stripe .planning/phases/02-listings-host-onboarding/02-02-PLAN.md` | PASS — zero matches (grep exit 1); PayMongo dependency/env present |

## Deviations / Interpretation Notes

- **D-17/D-19 location.** The plan said to "append a superseded note to each" of D-17/D-19, but those D-numbered records canonically live in `02-CONTEXT.md`, not in PROJECT.md (whose Key Decisions table has no D-numbers). Task 1 was scoped to `.planning/PROJECT.md` only (and its verify only checks PROJECT.md), so I marked D-17/D-19 as superseded **within PROJECT.md** (via the new D-20 row + an explicit per-decision superseded note that points to `02-CONTEXT.md` as the canonical record) rather than editing `02-CONTEXT.md` (out of scope). `02-CONTEXT.md` still contains the original D-17/D-19 text — a follow-up may want to annotate it, but it was outside this task's file set.
- **CLAUDE.md line 15 / PROJECT.md constraint.** The Constraints "Payments … (e.g. Stripe Connect)" line is an illustrative example (not a stack row) mirrored into CLAUDE.md from PROJECT.md's project block. Left as a permitted comparative/historical mention to avoid diverging the synced block; Task 1 was scoped to the Key Decisions table, not Constraints.
- **Out of scope, still reference Stripe (untouched, as instructed):** `02-06-PLAN.md` (separate re-plan), `02-01/03/04/05`, `ROADMAP.md`, `02-CONTEXT.md`, `02-RESEARCH.md`, `research/STACK.md`, and `.planning/STATE.md`. No product/source code was modified.

## Commit Hashes

- Task 1 (PROJECT.md): **3202c69**
- Task 2 (CLAUDE.md): **b83dde3**
- Task 3 (02-02-PLAN.md): **1eebe11**

Each task committed atomically, one file per commit. Quick-task tracking files (this SUMMARY, the PLAN, STATE.md) intentionally NOT committed — left for the orchestrator.

## Self-Check: PASSED

- All 3 target files exist and were committed (verified via `git show --stat` — exactly 3 files across the 3 commits).
- No forbidden files touched (ROADMAP, 02-01/03/04/05/06, src/, package.json, 02-CONTEXT.md) — confirmed via `git diff --name-only 46ad145..HEAD`.
- Pre-existing unrelated changes (HANDOFF.json, STATE.md, .continue-here.md) remain unstaged and untouched.
