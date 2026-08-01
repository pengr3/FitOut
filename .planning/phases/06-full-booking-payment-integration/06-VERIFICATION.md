---
phase: 06-full-booking-payment-integration
verified: 2026-07-20T17:45:00Z
status: passed
score: 4/4 success-criteria verified (live re-UAT passed 2026-07-20 — G-06-01 confirmed fixed end-to-end)
overrides_applied: 0
human_verification_result: passed  # live PayMongo confirm round-trip re-UAT (G-06-02 URL corrected); booking 42132ab1 → confirmed + pay_C4PW6fRGtUTNm6GsKCpt4P36 + BOOK-06 email delivered (Resend id faa1481e). See 06-HUMAN-UAT.md.
re_verification:
  previous_status: gaps_found
  previous_score: 3/4 success-criteria verified (1 blocked by a runtime gap)
  gaps_closed:
    - "G-06-01 (CRITICAL): parseSignature rejected every real PayMongo signature (required t/te/li all non-empty) — widened to accept te-XOR-li, re-enabling PAY-05/BOOK-06/BOOK-04's confirm path"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Re-run the 06-09 live UAT payment step: booker pays a request-to-book `approved` booking (or an instant-book listing) via the real PayMongo test-mode checkout, with the webhook registered at the FULL path `https://<tunnel>/api/paymongo/webhook` (G-06-02 corrected, not the tunnel root)."
    expected: "PayMongo delivers a real `checkout_session.payment.paid` event; the webhook returns 200 (not 400); the booking flips to `confirmed` with `payment_id` set; the booker's browser lands on the confirmed on-screen state (not a stuck finalizing interstitial); a real BOOK-06 confirmation email is delivered via Resend."
    why_human: "The regression tests (Case A/B in webhook-payment-paid.test.ts) prove the parser and confirm-writer logic are correct by POSTing directly to the exported route handler with a mocked DB and mocked Resend, using the exact te-only/li-only signature shape captured from the failed 06-09 UAT. That is strong evidence the code defect is fixed, but it is not a substitute for the actual live round trip: real HTTP routing on a running server, a real ngrok tunnel, a real PayMongo-delivered webhook against the corrected URL (G-06-02), the real browser redirect/on-screen confirmed render, and a real Resend-delivered email. The 06-09 UAT is precisely this live surface and it failed on this exact step before the fix; STATE.md and the 06-10-SUMMARY both explicitly defer final phase sign-off to this re-run ('re-run 06-09 UAT → phase verification'). Money and booking-confirmation correctness are the project's core value (per CLAUDE.md), so the live confirm must be re-observed, not inferred."
---

# Phase 6: Full Booking + Payment Integration — Verification Report

**Phase Goal:** The booking and payment building blocks are wired into one complete lifecycle that forks on the host's booking mode — instant-book captures payment immediately and confirms, while request-to-book holds the slot with no charge, lets the host approve or decline within an SLA, and on approval has the booker pay (pay-on-approval) to confirm, freeing the slot on decline/expiry/non-payment.

**Verified:** 2026-07-20T17:15:00Z
**Status:** human_needed — G-06-01 is closed in code and independently re-verified (fix diff, regression tests, and full suite all confirmed directly, not taken on SUMMARY's word); the remaining step to fully close the phase is a live re-run of the 06-09 human-verify UAT with G-06-02's webhook URL corrected.
**Re-verification:** Yes — after gap closure (06-10-PLAN.md / 06-10-SUMMARY.md), superseding the prior `gaps_found` report.

## Goal Achievement

### G-06-01 Closure — Independently Verified

| Check | Method | Result |
|---|---|---|
| Guard predicate widened | `git show 39985d3` diff + direct file read | VERIFIED — line 96: `if (!parts.t \|\| (!parts.te && !parts.li)) return null;` exactly as specified |
| Tolerant return | Direct file read | VERIFIED — line 97: `return { t: parts.t, te: parts.te ?? "", li: parts.li ?? "" };` |
| `verifySignature` unchanged | `git show 39985d3` diff scoped to route.ts (only the parseSignature hunk present) + direct read (lines 105-115) | VERIFIED — still loops `[sig.te, sig.li]` behind the `candBuf.length === expectedBuf.length` guard, byte-for-byte |
| `handleGoneSlot` (D-58) unchanged | Diff scope + direct read (lines 133-185) | VERIFIED — not touched by either commit |
| `handleRefund` / dedupe / confirm UPDATE unchanged | Diff scope + direct read (lines 268-320, 353-395) | VERIFIED — confirm UPDATE still `WHERE id = ${bookingId} AND status IN ('pending','approved')` |
| Commit scope is surgical | `git show 39985d3 --stat` / `git show 06f31e3 --stat` | VERIFIED — Task 1 touches only route.ts (+8/-3 lines, one hunk); Task 2 touches only the two test files |
| Regression tests exist and are meaningful | Direct read of `tests/paymongo/webhook-payment-paid.test.ts` (new describe block, lines 324-400) | VERIFIED — Case A (te-only confirms `pending`→`confirmed` + fires BOOK-06 email), Case B (li-only mirror confirms `approved`→`confirmed` + fires BOOK-06), Case C (both-empty header still 400s, `pending` state unchanged, T-06-SPOOF) |
| Mock signer single-mode capability | Direct read of `tests/helpers/mocks.ts` (lines 214-224) | VERIFIED — `signWebhook(rawBody, secret, timestamp, mode)` with `mode: "both" \| "test" \| "live"`; default `"both"` preserves the ~12 existing callers |
| Tests pass (re-run independently, not trusting SUMMARY's "134 passed") | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` then `npx vitest run tests/paymongo tests/booking tests/payments` | VERIFIED — 15/15 passed (12 existing + 3 new); 18 files / 134 tests passed, no regressions — matches SUMMARY exactly, confirmed independently |
| tsc / eslint clean (re-run independently) | `npx tsc --noEmit`; `npx eslint src/app/api/paymongo/webhook/route.ts tests/paymongo/webhook-payment-paid.test.ts tests/helpers/mocks.ts` | VERIFIED — tsc exit 0; eslint 0 errors (5 pre-existing unrelated warnings in mocks.ts on lines this plan didn't touch) |

**G-06-01 is closed in code with independently-confirmed evidence — not a SUMMARY claim taken on faith.**

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Instant-book listing confirms immediately on successful payment and the slot is locked | CODE-VERIFIED / re-UAT pending | Fork + hold + checkout unchanged from prior VERIFIED state (06-04). Confirm authority (06-05, D-57) now reachable on a REAL single-mode signature — proven by regression Case A/B and the pre-existing `bk_paid_ok` / lapsed-expiry cases, all independently re-run green. The live round trip that FAILED in 06-09 (real paid PayMongo checkout → confirmed state) has not yet been re-run. |
| 2 | Request-to-book creates a pending request that holds the slot with **no charge**; host can approve/decline; auto-declines after SLA | VERIFIED (regression, no change since prior live UAT) | Unaffected by this gap-closure plan (surgical scope — parser-only). `request-lifecycle.test.ts` and `request-expiry.test.ts` re-confirmed green in the independent 134-test run. Live UAT proof from 06-09 (request/approve/decline/inbox/countdown/owner-isolation) stands; this plan did not touch that code path. |
| 3 | On approval the booker pays via the Phase-5 checkout and the booking confirms; on decline/SLA/non-payment the slot frees — nothing refunded/voided | CODE-VERIFIED / re-UAT pending | Slot-freeing half remains VERIFIED (unaffected by this plan). Confirm-on-pay half: the specific defect that blocked it (webhook 400 on a real signature) is fixed and proven via a regression case built from the EXACT captured 06-09 failure shape (te valid/li empty) confirming an `approved` pay-on-approval booking. The live checkout→webhook→confirmed round trip has not been re-observed since the fix. |
| 4 | Booker receives on-screen and email confirmation of a confirmed booking | CODE-VERIFIED / re-UAT pending | BOOK-06 `sendBookingConfirmedEmail` fires on the ≥1-row confirm branch (unchanged code, `route.ts:390-394`); regression Case A/B directly assert `waitForConfirmedEmail` resolves under the real single-mode signature for BOTH instant and pay-on-approval paths — a stronger proof than the prior both-populated fixture that masked G-06-01. The on-screen confirmed render and an actual Resend-delivered email have not been re-observed live since the fix (Resend is mocked in the test). |

**Score:** 4/4 success criteria are code-verified with independently-reproduced evidence; criteria #1/#3/#4 share one remaining live surface (the actual paid-checkout → webhook → confirmed round trip) that only a re-run of the 06-09 UAT can close, per the project's own STATE.md ("re-run 06-09 UAT → phase verification") and 06-10-SUMMARY ("re-UAT precondition").

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/app/api/paymongo/webhook/route.ts` | `parseSignature` accepts te-XOR-li real PayMongo signatures | VERIFIED | Guard + return + doc-comment updated exactly per plan; verified via git diff scope (only this function's hunk touched) and direct read |
| `tests/paymongo/webhook-payment-paid.test.ts` | Regression cases for real single-mode signature confirm + both-empty reject | VERIFIED | New describe block with Case A/B/C present and passing (independently re-run) |
| `tests/helpers/mocks.ts` | Single-mode webhook signer (te-only/li-only) | VERIFIED | `signWebhook` gained `mode` param; default preserves the existing "both" shape |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `parseSignature` | `verifySignature` | An empty candidate (te or li) is length-skipped — 0 bytes never matches the 64-char HMAC hex | WIRED | Confirmed unchanged: `candBuf.length === expectedBuf.length` guard present at line 110, `[sig.te, sig.li]` loop intact |
| webhook POST `checkout_session.payment.paid` | booking confirm UPDATE | Verified single-mode signature → confirm on `status IN ('pending','approved')` → `payment_id` set (D-57) | WIRED | Confirmed unchanged at lines 379-383; regression Case A/B independently prove a real single-mode signature reaches and succeeds through this exact UPDATE |

### Requirements Coverage

> **AMENDED 2026-08-01 (v1.0 milestone audit).** The five rows below were written *before* the
> 2026-07-20 live re-UAT, when the phase was still `human_needed` and the re-UAT was the open gate.
> That re-UAT then **PASSED** (booking `42132ab1` → `confirmed`, `payment_id`
> `pay_C4PW6fRGtUTNm6GsKCpt4P36`, confirmed state rendered in the browser, Resend email `faa1481e`
> delivered — see the Gaps Summary below and `06-HUMAN-UAT.md`), and this file's frontmatter was
> flipped to `status: passed`. The rows were not refreshed, so `BOOK-05` and `HOST-01` were left
> reading `NEEDS HUMAN (REQUIREMENTS.md still [ ] Pending)` — contradicting both this file's own
> frontmatter and REQUIREMENTS.md, which now marks all five `[x]` Complete. The Status column is
> corrected below; the Evidence column is preserved verbatim and the correction appended, so the
> original record is not overwritten.

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| PAY-05 | 06-01, 06-02, 06-04, 06-06, 06-07, 06-09, 06-10 | Request-to-book: no charge at request, pay-on-approval, slot frees on decline/expiry/non-payment | ✓ SATISFIED | REQUIREMENTS.md marks `[x]` Complete; hold/free logic live-verified 06-09 and regression-confirmed here; confirm-on-pay code-verified via Case A/B. **Live round trip completed 2026-07-20 — gate closed.** |
| BOOK-04 | 06-01, 06-03, 06-04, 06-10 | Instant-book listings confirm immediately on successful payment | ✓ SATISFIED | REQUIREMENTS.md marks `[x]` Complete; fork+hold live-verified in the 06-04 automated suite; confirm path code-verified via Case A/B. **Live round trip completed 2026-07-20 — gate closed.** |
| BOOK-05 | 06-01, 06-02, 06-04, 06-06, 06-07, 06-08, 06-09 | Request-to-book creates a pending request the host approves/declines, auto-expiring if no response | ✓ SATISFIED | Live-verified in the 06-09 UAT for the request/approve/decline/inbox/countdown surfaces; REQUIREMENTS.md was deliberately left unchecked pending the overall phase re-UAT sign-off (06-09's blocking-gate contract) — a project-tracking decision, not new evidence of a defect. **That sign-off landed 2026-07-20; REQUIREMENTS.md now marks it `[x]` Complete. Auto-expiry additionally has standing automated coverage in `src/inngest/functions/request-expiry.ts`, whose terminal mapping the v1.0 integration check confirmed matches `units.ts`'s in-transaction stale-hold sweep byte-for-byte.** |
| BOOK-06 | 06-03, 06-05, 06-10 | Booker receives on-screen and email confirmation of a booking | ✓ SATISFIED | REQUIREMENTS.md marks `[x]` Complete; email-fire logic code/regression-verified (Case A/B). **A real Resend delivery WAS re-observed on 2026-07-20 (email id `faa1481e`) — this row's "not re-observed" caveat is superseded.** |
| HOST-01 | 06-07, 06-08, 06-09 | Host can approve or decline pending booking requests within a deadline | ✓ SATISFIED | Live-verified in the 06-09 UAT (approve/decline atomicity, SLA guard, owner isolation); REQUIREMENTS.md was deliberately left unchecked pending overall phase re-UAT sign-off, same as BOOK-05. **That sign-off landed 2026-07-20; REQUIREMENTS.md now marks it `[x]` Complete. `host-requests.ts:161-351` implements the DB-clock SLA-guarded atomic flips, re-confirmed by the v1.0 integration check.** |

**Orphaned requirements:** None — REQUIREMENTS.md's Phase 6 row set (BOOK-04, BOOK-05, BOOK-06, PAY-05, HOST-01) matches the union of `requirements:` fields declared across all ten 06-* plans.

**Frontmatter cross-check (added 2026-08-01):** the milestone audit found that `BOOK-05` and `HOST-01`
appeared in no Phase-6 SUMMARY's `requirements-completed` list — 06-10 closed out `PAY-05`, `BOOK-06`
and `BOOK-04` but not these two, because at the time they were still gated on the re-UAT. Both are now
recorded in `06-10-SUMMARY.md` (the plan that closed the phase), so all three sources agree.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | None found in the gap-closure diff (route.ts parseSignature hunk, mocks.ts signWebhook hunk, new test describe block) | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers, no empty-return stubs, no hardcoded-empty data introduced by this plan |

### Documentation Inconsistency Found (flagged, not a code gap)

`.planning/ROADMAP.md` line 21 marks `- [x] **Phase 6...** (completed 2026-07-20)` and the Phase 6 detail's plan-10 line is checked `[x]`, but `.planning/STATE.md` frontmatter explicitly shows `status: verifying`, `completed_phases: 5` (Phase 6 NOT counted), and its body states "Phase: 06 ... — G-06-01 CLOSED in code; awaiting re-UAT" / "Status: Gap G-06-01 closed + regression-tested — re-run the 06-09 UAT ... to verify Phase 06." The 06-10 gap-closure commit (`ffc71ea`) message states the ROADMAP update was meant to record "gap closed, re-UAT pending (**not** prematurely Complete)" — but the checkbox itself reads as complete, contradicting that stated intent and STATE.md. This looks like the known gsd-sdk tracking over-count noted in the project's own memory (`fitout-gsd-toolchain-gotchas.md`: "gsd-sdk update-progress over-counted... hand-reconciled"), where STATE.md was hand-corrected but the ROADMAP.md checkbox was not. Recommend hand-fixing the ROADMAP.md Phase 6 checkbox back to an in-progress marker until the re-UAT closes it, so the two tracking files agree. This does not change this report's verdict — it is independent evidence supporting `human_needed` rather than `passed`.

### Human Verification Required

### 1. Re-run 06-09 live UAT payment-confirm step (with G-06-02 corrected)

**Test:** With the local stack running (app + Docker Postgres + a tunnel), register the PayMongo test-mode webhook at the FULL path `https://<tunnel>/api/paymongo/webhook` (not the tunnel root — G-06-02). Walk an `approved` pay-on-approval booking (or an instant-book listing) through a real PayMongo test-mode checkout to completion.
**Expected:** PayMongo delivers `checkout_session.payment.paid`; the webhook returns 200; the booking flips to `confirmed` with `payment_id` set; the booker's browser shows the confirmed on-screen state (not a stuck "finalizing" interstitial); a real BOOK-06 confirmation email arrives via Resend.
**Why human:** This is the exact live surface that failed in 06-09 due to G-06-01. The fix is now proven correct by regression tests built from the captured failure's exact signature shape, run against the exported route handler with a mocked DB/Resend — strong but not equivalent to observing the real webhook delivery, URL routing, browser redirect, and email inbox. The project's own STATE.md and 06-10-SUMMARY.md explicitly defer phase sign-off to this re-run.

### Gaps Summary

No gaps remain. G-06-01 is closed in code and independently re-verified (diff scope, direct reads, and an independent re-run of both the targeted test file and the full paymongo/booking/payments suite). G-06-02 (webhook URL registration) is resolved — the webhook was re-registered at the full `/api/paymongo/webhook` path for the re-UAT. The live round trip that failed before the fix (real paid checkout → real webhook confirm → on-screen confirmed state → real email) was re-observed and **PASSED on 2026-07-20**: booking `42132ab1` → `confirmed` with `payment_id` `pay_C4PW6fRGtUTNm6GsKCpt4P36`, the booker's browser showed the confirmed state (ref `FIT-2NCSCZMJ`, venue-local Makati time), and the BOOK-06 confirmation email was delivered via Resend (id `faa1481e`) and received. See `06-HUMAN-UAT.md`.

---
*Phase: 06-full-booking-payment-integration*
*Verified: 2026-07-20T17:45:00Z — passed (live confirm re-UAT passed)*
