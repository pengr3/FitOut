# Phase 2 Re-Plan Summary: Stripe → PayMongo (planning-doc only)

**Date:** 2026-07-09
**Scope:** Planning docs ONLY (`.planning/`). No product/source code written; no tsc/tests run.
**Driver:** PROJECT.md **D-20** (adopt PayMongo, supersedes D-17 & D-19) + CLAUDE.md § "Marketplace Payments — Prescriptive Detail".
**Branch:** `dev` (non-worktree, committed directly).

## Commits

| # | Hash | Message |
|---|------|---------|
| a | `86c7b20` | docs(02-06): re-plan for PayMongo Linked Accounts + merchant.activated gate |
| b | `29620bc` | docs(02-01): retarget host_payout schema + webhook test anchors to PayMongo |
| c | `ecdc322` | docs(02-CONTEXT): supersede D-17/D-19, reword payment decisions for PayMongo |

Each commit touches exactly one plan file. STATE.md, HANDOFF.json, .continue-here.md, and the 02-06-REPLAN-SUMMARY.md were **not** committed (orchestrator handles STATE; SUMMARY intentionally left uncommitted).

---

## Changes per file

### 1. `02-06-PLAN.md` — full end-to-end rewrite (commit a)
Preserved GSD structure/rigor (frontmatter → must_haves truths/artifacts/key_links → objective → context/interfaces → 3 tasks with read_first/behavior/action/verify/done/acceptance_criteria → threat_model → verification → success_criteria → output). Mapped faithfully to the authoritative PayMongo design:

- **files_modified / artifacts:** `src/lib/stripe.ts`→`src/lib/paymongo.ts`; `src/app/actions/stripe-connect.ts`→`src/app/actions/paymongo-connect.ts`; `src/app/api/stripe/webhook/route.ts`→`src/app/api/paymongo/webhook/route.ts`; schema `stripe_event`→`paymongo_event`; return/refresh pages + payout-banner + host page + .env.example retained.
- **Task 1** — `paymongo.ts` thin `fetch` REST wrapper (base `https://api.paymongo.com/v1`, HTTP Basic auth with the secret key as username, `Idempotency-Key` on POSTs, fail-closed at module load in prod) + `startPayoutOnboarding()` (lazy **Linked Account** created once, persist `paymongoAccountId` server-side, mint fresh hosted onboarding link, rate-limit `pmonboard:` + audit, WR-06) + `refreshOnboardingLink()`.
- **Task 2 (keystone)** — `Paymongo-Signature`-verified webhook: `runtime="nodejs"`, RAW body via `req.text()`, parse `t=<ts>,te=<testSig>,li=<liveSig>`, HMAC-SHA256(`PAYMONGO_WEBHOOK_SECRET`) over `` `${t}.${rawBody}` ``, constant-time compare to te/li → 400 on mismatch; idempotent via new `paymongo_event` table; `merchant.activated`→`payoutsEnabled:true`/`activationStatus:'activated'`/`onboardingComplete:true`; `merchant.declined`→`payoutsEnabled:false`/`activationStatus:'declined'` (auto-revert, D-14); always 200 on handled events.
- **Task 3** — payout banner + return/refresh pages wired into host dashboard (behaviorally unchanged; host copy still never says "Stripe"/"PayMongo"/"KYC"/"webhook").
- **Threat model** — retitled to PayMongo (T-06-SPOOF Paymongo-Signature→400; T-06-REPLAY paymongo_event idempotency; T-06-PRIV payoutsEnabled/paymongoAccountId server-set only; T-06-IDOR rate-limit+audit; T-06-SECRET secret handling + runtime=nodejs; T-06-LINK single-use onboarding link).
- **Self-contained:** dropped the stale Stripe "RESEARCH § Pattern 7/8" as source of truth; embedded the full PayMongo integration contract inline in `<interfaces>` (citing CLAUDE.md § Marketplace Payments). Kept requirement **PAY-04** and D-12/D-13/D-14/D-15 references.
- **Manual UAT** updated: local webhook forwarding via a **tunnel (ngrok/cloudflared)** since PayMongo has no Stripe-CLI equivalent; added note that Linked Accounts is **beta / sales-gated** (real onboarding needs PayMongo enablement).

### 2. `02-01-PLAN.md` — targeted edits (commit b)
- **host_payout table (Task 1):** `stripeAccountId`→`paymongoAccountId`; **dropped** `chargesEnabled` + `detailsSubmitted`; **added** `activationStatus text default 'pending'` (pending|activated|declined) + `onboardingComplete`; **kept** `payoutsEnabled` (KEEP THIS NAME).
- **Test mock (Task 2):** `mockStripe` (accounts.create / constructEvent / generateTestHeaderString) → `mockPayMongo` (createLinkedAccount / createOnboardingLink / `signWebhook(rawBody,secret,timestamp)` → valid `Paymongo-Signature` header string). Updated the objective line ("Stripe test mock"→"PayMongo test mock"), Task 2 name, `<done>`, and the acceptance grep.
- **Wave-0 anchor test files:** `tests/stripe/webhook-signature.test.ts`→`tests/paymongo/webhook-signature.test.ts`; `tests/stripe/webhook-account-updated.test.ts`→`tests/paymongo/webhook-merchant-activated.test.ts` (behaviors reworded to `merchant.activated`→payoutsEnabled true / `merchant.declined`→false auto-revert). Updated across frontmatter files_modified, Task 3 `<files>`, and Task 3 action.
- **UNCHANGED (verified):** `deriveBookable` contract + formula (`status==published && emailVerified && payoutsEnabled`) and `tests/listing/bookability.test.ts` (the 8-row truth table). `payoutsEnabled` is provider-agnostic.

### 3. `02-CONTEXT.md` — targeted edits (commit c)
- **D-17 & D-19:** struck through and appended a **"SUPERSEDED 2026-07-09 by D-20 (PayMongo) — Stripe SDK/Connect no longer used"** note to each (kept, not deleted — this is their canonical location).
- **Phase Boundary:** "Stripe Connect (Express) payout onboarding"→"PayMongo hosted payout onboarding (Platforms / Linked Accounts)"; "account.updated-driven"→"merchant.activated-driven".
- **D-02:** "require Stripe onboarding"→"require payout onboarding".
- **D-12:** "no Stripe yet"→"no payout setup yet". **D-13:** unchanged (host copy already provider-agnostic).
- **D-14:** Stripe `payouts_enabled`→PayMongo `merchant.activated`/`activation_status`; "One Stripe Connect Express account per host"→"One PayMongo Linked Account per host"; account.updated→merchant.activated (+ `merchant.declined` for the disabled path).
- **D-15:** formula unchanged (reads `payouts_enabled`).
- **Heading:** "Stripe Connect Onboarding & the Bookability Gate"→"PayMongo Onboarding & the Bookability Gate".
- **Canonical-Refs "Prescriptive Stack" bullet:** Stripe rows→PayMongo (Linked Accounts, hold-until-session, merchant.activated/activation_status/wallet status, no SDK, Paymongo-Signature + Idempotency-Key, tunnel for local dev).
- **"Claude's Discretion" bullet:** Stripe specifics→PayMongo Linked-Accounts specifics.
- **"What NOT to Use" bullet:** kept intent — don't use PayMongo "payment splitting"; never pay the host at booking time.
- **Also de-Striped this-doc's own prose:** Existing Code Insights ("reused for Stripe KYC"→"reused for payout (PayMongo) KYC"); Integration Points (host_payout record → PayMongo Linked-Account record + merchant.activated + `src/app/api/paymongo/webhook`); Specific Ideas keystone (`account.updated`→`merchant.activated`).
- **Intentionally LEFT (faithful cross-doc citations, noted stale below):** the two "Prior-Phase Context (carry forward)" bullets citing `01-CONTEXT.md` D-05/D-09 and `STATE.md` blockers — these describe unedited prior-phase docs; rewriting them would misrepresent the source.

---

## Known-stale historical artifacts (NOT touched — non-blocking)

These were explicitly out of scope (DO NOT TOUCH) or belong to prior phases. They still reference Stripe but do **not** execute, so they are non-blocking. Flagged here for traceability:

| Artifact | Stale content | Impact |
|----------|---------------|--------|
| `02-RESEARCH.md` | § Pattern 7 (onboarding), § Pattern 8 (webhook), Pitfall 2/6, apiVersion notes — all Stripe Connect | Historical research; not the source of truth (02-06 is now self-contained). Non-blocking. |
| `02-PATTERNS.md` | § Cluster E (`stripe.ts` / `stripe-connect.ts`), § webhook route, Wave-0 stripe test patterns | Historical pattern map. Non-blocking. |
| `02-VALIDATION.md` | Per-Task Verification Map + Wave-0 list still name `tests/stripe/webhook-*.test.ts`, `account.updated`, `constructEvent`, `stripe listen` | **Active cross-reference mismatch** with the retargeted 02-01 (now `tests/paymongo/...`). The 02-01/02-06 plans are authoritative for execution; 02-VALIDATION should be regenerated in a follow-up if kept in sync. Non-blocking for planning. |
| `02-UI-SPEC.md` | Internal table labels say "Stripe onboarding nudge banner" / "Opens Stripe-hosted onboarding" (lines 120-121, 216) | The rendered host **copy** is provider-agnostic and correct ("Set up payouts", "Finish payout setup"); the voice rule (line 106) already forbids "Stripe" in host copy. Labels are internal descriptors only. Non-blocking. |
| `01-CONTEXT.md` (Phase 1) | D-05 ("Stripe payout/KYC deferred to Phase 2"), D-09 ("reused for Stripe KYC") | Prior-phase doc, out of scope; cited faithfully by 02-CONTEXT's carry-forward bullets. Non-blocking. |

**Already PayMongo-consistent (no action needed):** `PROJECT.md` (D-20 + superseded D-17/D-19), `CLAUDE.md` (§ Marketplace Payments = PayMongo), `02-02-PLAN.md` (already provisions `PAYMONGO_*` env + references `src/lib/paymongo.ts`).
**No payment references:** `02-03/04/05-PLAN.md` (verified clean).

---

## Verification (planning-doc integrity)

- All Stripe column/mock/test-path references removed from `02-01-PLAN.md` (grep clean for `stripe`/`constructEvent`/`chargesEnabled`/`detailsSubmitted`/`mockStripe`).
- `02-06-PLAN.md` residual "Stripe" mentions are all deliberate (historical-staleness callouts, the "Stripe-Account-Links equivalent" explanation, negative acceptance assertions, the "never say Stripe" voice rule, and the "no Stripe-CLI equivalent" UAT note) — none as source of truth.
- `02-CONTEXT.md` residual "Stripe" mentions are only: the struck-through-but-kept SUPERSEDED D-17/D-19 records, the "no Stripe-CLI equivalent" explanatory phrase, and the two prior-phase carry-forward citations.
- **`deriveBookable` + `tests/listing/bookability.test.ts` left untouched** (confirmed by grep: contract, formula, and 8-row truth-table language intact).
