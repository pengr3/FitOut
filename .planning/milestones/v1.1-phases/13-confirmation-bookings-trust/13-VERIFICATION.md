---
phase: 13-confirmation-bookings-trust
verified: 2026-08-21T05:56:17Z
status: human_needed
score: 9/9 requirement IDs accurately characterized (2 fully COMPLETE, 7 code-complete PARTIAL with the missing half named and independently confirmed) — 0 over-marked, 0 FAILED
overrides_applied: 0
human_verification:
  - test: "Set SUPPORT_EMAIL to a real, monitored mailbox at src/lib/site.ts:70"
    expected: "tests/design/site-contacts.test.ts flips from its null-branch to its demanding branch automatically (verified both branches are already written and pass); the support block renders on the booking detail page, the reversed-payment manual branch, and the pending-settlement escalation. TRUST-01 and STATE-05 close in full."
    why_human: "Business/operational decision (a real inbox someone monitors), not a code change. D-64 forbids setting a placeholder to make the gate pass."
  - test: "WALK A — pay a real booking on the hosted PayMongo checkout page with a test instrument, let the webhook confirm it, land on the return URL"
    expected: "Confirmation moment renders (success mark, h1, arrival facts, FIT- reference, amount, 'Confirmation sent to {email}'); URL rewrites to /bookings/{id} with no query string within one frame; a reload/F5 shows the ordinary detail page with no moment; Back leaves for the cross-origin PayMongo page rather than returning into the moment."
    why_human: "No harness in this repository can mint a real hosted-checkout return — probeCheckoutSession returns null for every synthetic cs_e2e_ id (verified: checkout-probe.ts's own short-circuit). This is BFLOW-08's last mile; 7 e2e cases already prove the seeded-path mechanics."
  - test: "WALK B — print /bookings/{id}/receipt to PDF via the browser's own print dialog (Background graphics OFF), once per theme"
    expected: "No solid-black flood (panel flattens); FIT- reference and Total both readable; status renders as a word, never a pill; zero buttons/links visible; itemisation + Total not split across a page break."
    why_human: "emulateMedia({media:'print'}) proves the stylesheet applies (confirmed: e2e/receipt-print.spec.ts's 4 green cases). It cannot prove a grove-theme receipt is legible on actual paper. This is TRUST-05's last mile — the requirement was correctly un-ticked from [x] for exactly this reason."
  - test: "WALK C — trigger a real QRPh gone-slot reversal, read the reversed-state copy beside the real bank/e-wallet statement"
    expected: "needs_attention audit row (action: auto_refund_manual); copy never uses the word 'refunded'; states the amount is flagged to return by hand and carries the reference; never says 'cannot be reversed' (says 'not reversed automatically'); the on-screen statement does not contradict the real bank/e-wallet statement."
    why_human: "The manual return is an operator action outside the app, and a seeded row cannot reach this branch (it needs a real QRPh test payment — a seeded reversed row lands on the indeterminate branch instead, verified in payment-reversed-state.tsx's branch union)."
  - test: "WALK D — POST /v1/refunds against a QRPh test payment with a fresh Idempotency-Key, report the verbatim HTTP status/body"
    expected: "Either confirms the standing HTTP 400 'Refunds are not allowed for payments with source type qrph' (2026-07-23 and 2026-08-20 probes), or reports a 2xx as a FINDING that changes D-82's policy split — never a silent widening of REFUNDABLE_RAILS."
    why_human: "Third-party (PayMongo) behaviour can change under the app without any code change here; requires a live API call with a real test-mode secret."
---

# Phase 13: Confirmation, Bookings & Trust — Verification Report

**Phase Goal:** After paying, a booker can see — on screen and in the email — exactly what they bought, where their money is, and what happens next.
**Verified:** 2026-08-21T05:56:17Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Summary Judgement

This is a well-disciplined close-out. Every specific, checkable claim in `13-16-SUMMARY.md` and `13-17-SUMMARY.md` that I independently re-derived from the codebase — rather than accepted from prose — held up. I found **no over-marking**: nothing is ticked `[x]`/COMPLETE that the code does not deliver, and the phase's own ledger already discounts itself correctly (5 of 9 requirement IDs close PARTIAL, not COMPLETE, with the exact missing clause named per ID). I also independently re-ran the CI evidence via `gh run view` rather than trusting the pasted logs, and the numbers match exactly (see § CI Verification below). The phase cannot close `passed` because four human-only walks and one operator decision (`SUPPORT_EMAIL`) are genuinely outstanding, by the operator's own explicit deferral on 2026-08-21 — that is a `human_needed` outcome, not a defect.

One thing is **not** fully accounted for by the four named walks or the `SUPPORT_EMAIL` item: the STATE-08 residual at `refund-destination-form.tsx:88` (see § Findings For The Developer below). It is honestly disclosed in both `deferred-items.md` and `REQUIREMENTS.md`, but it is a scope/copy decision nobody owns yet, not a UAT walk — flagging it separately so it isn't lost among the four named walks.

## Goal Achievement — Requirements Ledger, Independently Re-Derived

Each row was checked against the actual source, not accepted from the SUMMARY's prose.

| # | Requirement (truth) | Ledger claim | My finding | Evidence |
|---|---|---|---|---|
| 1 | **TRUST-04** — only real trust signals, closed set, no invented verification | ✅ COMPLETE | ✓ VERIFIED — matches claim exactly | `src/components/booking/trust-block.tsx` renders exactly 4 signals (platform guarantee, `user.createdAt`, `listing.publishedAt`, `listing.bookingMode`) plus a 5th guarded row that renders nothing while `SUPPORT_EMAIL` is null. The closed set is enforced by a **row-count assertion**, not a word ban: `tests/booking/trust-block.test.tsx:94-111` asserts `signalRows(container)` has length exactly 4 on `full` and 2 on `condensed` — a fifth row of any wording fails this. `tests/design/trust-signals.test.ts` (551 lines) additionally bans 12 named tokens across the phase's 3 file roots, in both directions (can find a violation, proven by injected-violation test cases). Two independent, complementary gates — not one ban-list that 13-09 itself found could be defeated. |
| 2 | **STATE-06** — every payment state states where the money is, above the fold | ✅ COMPLETE (unchanged) | ✓ VERIFIED | `MoneyStatement` mounts on exactly the 4 specified statuses (D-94, confirmed in `money-statement.tsx`'s own header and cross-checked against `tests/booking/detail-completeness.test.tsx`'s D-94 describe block). `e2e/overflow-320.spec.ts` has a real geometric fold assertion (`expectMoneyStatementAboveFold`, called at 320×568, 1280×800, both themes) — this is the mechanism that caught and fixed the grove 570.94px-in-568px defect the SUMMARY reports. |
| 3 | **BFLOW-08** — confirmation moment + decay | ⚠ PARTIAL (WALK A) | ✓ VERIFIED-PARTIAL, claim accurate | `ConsumePaidParam` (`src/components/booking/consume-paid-param.tsx`) is a genuine mount-effect that calls `window.history.replaceState(null, "", pathname)` and renders `null` — the D-60/D-89 decay mechanism is real code, mounted on the confirmed branch only (matches D-89's constraint, checked against its own extensive header comment). `e2e/confirmation-decay.spec.ts` (459 lines) drives real geometry assertions across 3 viewports × 2 themes, not a smoke test. What's missing — a real hosted PayMongo checkout return — genuinely cannot be produced by any harness in this repo: `checkoutSessionProbe`/`probeCheckoutSession` returns `null` with no HTTP request for any synthetic `cs_e2e_…` id (`checkout-probe.ts:72-75`), confirmed directly. |
| 4 | **TRUST-01** — detail page: status+meaning, address, tz, host, itemised, cancellation date+refund, reference, support | ⚠ PARTIAL (support path only) | ✓ VERIFIED-PARTIAL, claim accurate | `bookings/[id]/page.tsx` (1387 lines) renders one shell across 10 status branches (`RENDERS` array asserted `toHaveLength(10)` in `tests/booking/detail-completeness.test.tsx:481-487`), each with heading, meaning sentence, reference and exactly one trust-block instance — verified by a real `for (const r of RENDERS)` loop, not a single fixture. `bookedListingAddress()` (`src/lib/listing-public.ts:298-`) genuinely gates the exact street to `confirmed`/`completed` statuses only (`BOOKED_STATUSES` whitelist), matching D-91. The support path (`support-path.tsx`) reads `SUPPORT_EMAIL` and its ternary's false branch is the bare `null` keyword — confirmed it renders nothing today. |
| 5 | **TRUST-02** — reference copyable, tabular, every status, email subject | ⚠ PARTIAL (email subject = Phase 15) | ✓ VERIFIED-PARTIAL, claim accurate | `sendBookingConfirmed`'s subject line, read directly from `src/lib/email.ts:118`, is `` `Your FitOut booking is confirmed — ${spaceTitle}` `` — **no reference anywhere in it**. The reference only appears inside the body's second `<p>`. This matches the SUMMARY's claim exactly and confirms the "email subject line half is Phase 15's" characterization is not a rationalization — it is measurably true today. |
| 6 | **TRUST-03** — cancellation policy on confirmation + in confirmation email | ⚠ PARTIAL (email half = Phase 15) | ✓ VERIFIED-PARTIAL, claim accurate | `sendBookingConfirmed` (`email.ts:105-123`) is **exactly three `<p>` elements** (`Booking confirmed`, the venue/date/reference sentence, and the "View your booking" link) — none states a cancellation policy, percentage, or hour. Matches the claim byte-for-byte. |
| 7 | **TRUST-05** — view/print itemised receipt | ⚠ PARTIAL (WALK B) | ✓ VERIFIED-PARTIAL, claim accurate | `bookings/[id]/receipt/{page,loading}.tsx` exist as real routes. `e2e/receipt-print.spec.ts` (494 lines), `e2e/receipt-parity.spec.ts` (492 lines) and `e2e/receipt-access.spec.ts` (302 lines) are substantive specs, not smoke tests — `receipt-parity.spec.ts` drives a real request and asserts the rendered per-head unit × pass count equals `booking.space_price_cents` read back from Postgres (D-86's rejected-division check). The un-ticking from `[x]` is the correct call: `emulateMedia` proves the stylesheet applies; it does not prove paper legibility. |
| 8 | **STATE-05** — 3 (+1) distinct payment states, reversed states the money truth, support path | ⚠ PARTIAL (support path + WALK C) | ✓ VERIFIED-PARTIAL, claim accurate | `payment-reversed-state.tsx` genuinely branches on D-82/D-83's two money truths: the automatic branch's sentence is `` `We've refunded ${amountLabel} in full.` `` (uses "refunded"); the manual branch's sentence is `` `You were charged ${amountLabel}, and it's coming back to you.` `` (never uses "refunded", matching the tripwire) plus a third, D-96 `indeterminate` branch that names no amount at all — read directly, all three exist and are distinct. `refund-window.ts` carries exactly the verified numbers (card "up to 30 days"; GCash/Maya "within 24 hours") — no invented window. `REFUNDABLE_RAILS` (`refund-rail.ts:42`) excludes `qrph`, confirming D-81's pin is unwidened. |
| 9 | **STATE-08** — terminal=page, non-terminal=toast, must-read=in-page alert | ⚠ PARTIAL (1 named residual) | ✓ VERIFIED-PARTIAL, claim accurate — **see finding below** | `tests/design/status-vocab.test.ts`'s AST toast-scanner (~500 lines from line 957) is a real TypeScript-AST walk, not a grep — verified it resolves renamed imports and rejects non-literal (interpolated/assembled) sentences, matching its own stated blind spot. `refund-destination-form.tsx:88`'s `toast.warning(res.notice)` is confirmed as the only content-bearing toast left in the three scanned roots that could plausibly be a must-read fact; it is server-composed (not a literal), so the AST scan structurally cannot see it, exactly as claimed. `attendee-roster.tsx` and `regenerate-link-button.tsx` genuinely converted their two named cases to in-page alerts (`role="status"`/`role="alert"` regions with real `tests/group/state08-alerts.test.tsx` behavioural coverage, not vacuous). |

**Score:** 9/9 requirement-ID claims independently confirmed accurate (2 fully delivered, 7 correctly self-reported as PARTIAL with the exact missing clause named). **0 FAILED** — nothing is over-marked; the ledger is honest.

## CI Verification (independently re-run, not accepted from pasted logs)

```
$ gh run view 32449945840
✓ dev ci · 32449945840   (push, commit dee2d3c)
✓ gate-price-parity (DB-vs-DOM price, 1 spec)      2m19s
✓ gate-visual (GATE-01 visual regression)          5m27s
✓ gate-db (vitest against PostGIS 18)              5m32s
✓ gate-db-free (lint + design + build + workflow parse)  2m59s

$ gh run view --job 96676446784 --log | grep -E "passed|skipped"
  52 skipped
  70 passed (3.8m)
```

Confirmed directly from the GitHub Actions API — all 4 jobs green, and `gate-visual`'s reported "70 passed / 52 skipped / 0 failed" is exact, matching the SUMMARY's pasted numbers. `git diff --stat dee2d3c HEAD -- src/ tests/ drizzle/ package.json` is empty — the two commits on top of the green run (`9243ad1`, current HEAD `9adbbf0`) touch only `.planning/` docs, so the green run's guarantee still covers the current HEAD. A new CI run (`32451957720`) was in progress for the current HEAD at verification time (docs-only commit; 2/4 jobs already green when checked, no source changed to put the other 2 at risk).

`drizzle/*.sql` confirmed to end at `0025_audit_resolved_by.sql` — GATE-06/D-80 holds. `.planning/STATE.md` confirmed at `completed_phases: 3`, `completed_plans: 70`, `percent: 27`, `status: verifying` — matches the SUMMARY's claim that the SDK's over-reach (to 4/71/36) was correctly reverted by hand. `.planning/ROADMAP.md` phase-13 checkbox is `[ ]` and its progress row reads "Awaiting verification" — not marked complete.

## Requirements Coverage

All 9 REQUIREMENTS.md IDs mapped to this phase (`BFLOW-08, TRUST-01..05, STATE-05/06/08`) appear in at least one plan's `requirements:` frontmatter — cross-checked via `grep -A3 "^requirements:" 13-*-PLAN.md`. **No orphaned requirements.**

## Anti-Pattern Scan

Scanned all 49 `src/` files touched in this phase (`git diff --name-only af2ebd2..HEAD -- src/`) for `TBD|FIXME|XXX`, `TODO|HACK|PLACEHOLDER`, empty implementations, and hardcoded-empty stub patterns.

- **Debt markers (TBD/FIXME/XXX):** zero genuine hits. Every `XXX` match is part of the literal string `FIT-XXXXXXXX` (the reference format) or `PAEYPHM2XXX` (a BIC constant) — not a debt marker.
- **TODO/HACK/PLACEHOLDER:** zero genuine hits. All matches are either legitimate HTML `placeholder=` form attributes, or prose discussing the concept of "placeholder" in a comment (e.g., explaining why a value is *not* a placeholder, or referencing Phase 11's pre-existing `legal-placeholder-notice` — D-127's deliberate visual-layer placeholder, out of this phase's scope).
- **Empty returns (`return null`, `=> {}`):** all instances are legitimate early-return guards or components correctly returning `null` when there is nothing to render (e.g., `ConsumePaidParam`, which is a mount-effect-only component by design).
- **`SUPPORT_EMAIL = null`:** the one deliberate, guarded, and honestly-named stub in the phase. Confirmed at `src/lib/site.ts:70`. Its guard (`tests/design/site-contacts.test.ts`) is an inverted gate proven to enforce zero unguarded support affordances while null, and to demand a real, guarded one the moment the constant is set.

**No blockers found.**

## Findings For The Developer

### 1. STATE-08's named residual is not covered by any of the 4 walks or the SUPPORT_EMAIL item

`refund-destination-form.tsx:88`'s `toast.warning(res.notice)` fires on a real, reachable branch (a booker-initiated cancellation whose manual transfer could not be dispatched) and states a fact the booker arguably must retain — that money owed to them did not move automatically. Read literally, ROADMAP Success Criterion 5 ("anything the user must actually read... is an in-page alert, never a toast") is not yet fully true on this one branch. This is **honestly disclosed** in both `deferred-items.md` and `REQUIREMENTS.md` (not hidden), and 13-05's reasoning for not fixing it — deciding the surface means deciding the copy, which is a decision that surface's owning plan should make — is sound. But it is a genuine open item that needs a human/product decision (which of D-83's two money truths this branch states, and where it lives), not a QA walk. Recommend the developer explicitly assign an owner for it rather than let it ride until "whichever plan next opens that file," which is how several of this phase's other 6 deferred-items rows are already phrased.

### 2. Everything else checks out

No other discrepancies found between what `13-16-SUMMARY.md`/`13-17-SUMMARY.md` claim and what the codebase does. The requirement ledger in `REQUIREMENTS.md` is unusually careful about not over-claiming — five re-markings (`TRUST-02`, `TRUST-03`, `TRUST-05` un-ticked/moved to PARTIAL; `STATE-08` given a named residual; `TRUST-04` promoted to COMPLETE only once genuinely earned) were all independently confirmed to be the correct calls, not defensive under-claiming or careless over-claiming.

## Human Verification Required

See frontmatter `human_verification:` for the full, structured list (SUPPORT_EMAIL + Walks A–D). Summarized:

### 1. Set `SUPPORT_EMAIL`

**Test:** Set a real, monitored support mailbox at `src/lib/site.ts:70`.
**Expected:** The guarded support path renders everywhere it is composed; `site-contacts.test.ts` flips branches automatically; TRUST-01 and STATE-05 close in full.
**Why human:** Operational/business decision (a monitored inbox), explicitly forbidden from being faked (D-64).

### 2. WALK A — real hosted-checkout return (BFLOW-08)

**Test:** Book and pay a real slot on PayMongo's hosted checkout page with a test instrument; observe the return.
**Expected:** Confirmation moment renders with all named facts; URL decays to no query string; reload shows the ordinary page; Back leaves the app rather than re-entering the moment.
**Why human:** No harness in this repo can mint a real hosted-checkout return (verified: the probe returns `null` with no request for synthetic session ids).

### 3. WALK B — printed receipt, both themes (TRUST-05)

**Test:** Print `/bookings/{id}/receipt` to PDF via the browser's own dialog, per theme.
**Expected:** No solid-black flood; reference + total legible; status as a word; zero controls visible; no page-break split.
**Why human:** `emulateMedia` proves the stylesheet applies; it cannot prove paper legibility.

### 4. WALK C — manual-return copy against a real statement (STATE-05)

**Test:** Trigger a real QRPh gone-slot reversal; read the copy beside a real bank/e-wallet statement.
**Expected:** Copy never says "refunded," never says "cannot be reversed," states the amount is flagged for manual return, and does not contradict the real statement.
**Why human:** The manual return is an operator action outside the app; a seeded fixture cannot reach this exact branch.

### 5. WALK D — QRPh refund-probe re-verification (D-81)

**Test:** `POST /v1/refunds` against a QRPh test payment with a fresh `Idempotency-Key`.
**Expected:** Either reconfirms the standing `HTTP 400`, or surfaces a `2xx` as a finding (never a silent `REFUNDABLE_RAILS` widening).
**Why human:** Third-party behaviour can change independently of this codebase.

## Gaps Summary

No coding gaps found. The one open item without an assigned owner or walk (§ Findings For The Developer, item 1 — the `refund-destination-form.tsx:88` residual) is small, honestly disclosed, and does not by itself block the phase from proceeding, but it is not resolved by any of the 5 human-verification items above and should not be forgotten once those close.

---

*Verified: 2026-08-21T05:56:17Z*
*Verifier: Claude (gsd-verifier)*
