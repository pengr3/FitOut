---
created: 2026-09-01T11:56:40.872Z
title: Phase 18 PM decision follow-through
area: general
files:
  - src/lib/payments/fees.ts:82
  - tests/payments/ops-cancel.test.ts:244-262
  - tests/payments/ops-cancel.test.ts:373-455
  - src/lib/listing/re-review.ts
  - src/app/actions/listing.ts
  - src/app/(host)/host/earnings/page.tsx
  - src/lib/host/verification-status.ts
---

## Problem

Phase 18's blocking PM checkpoint (`18-14` Task 3) held **five** decisions. All five were answered by
the PM on **2026-09-01**. Three of them require code that has not been written; this todo is the
carrier for those three so the phase does not get ticked with them outstanding.

The answers themselves are canonical in
`.planning/phases/18-host-verification-listing-review-fitout-ops/18-14-SUMMARY.md`
(§ The five checkpoint decisions). Two need nothing: **(b) D-250** — leave `SUPPORT_EMAIL` null, no
monitored inbox exists; **(e) the KYC vendor** — Didit, tracked in its own todo and gated on counsel.

## The three implementation items

### 1. D-236 — flip the ops-cancel refund basis to the full charge

**Ruling:** `OPS_CANCEL_REFUNDS_SERVICE_FEE = true`. An ops-forced cancellation refunds the booker the
whole charged total (₱1,050 on the fixture), FitOut absorbs the ₱50 gateway cost, the host is still
paid nothing. The PM accepted the argument that a booker defrauded by a confirmed-fake listing is a
strictly stronger instance of `cancel-booking.ts:1134-1137`'s *"the booker did nothing wrong"* than a
booker whose host merely flaked.

⚠ **The "one line" estimate in three phase documents is wrong about the test half.** Checked against
source when the answer landed:

- **Production: genuinely one line.** `src/lib/payments/fees.ts:82`, `false` → `true`. Nothing in
  `cancel-booking.ts` is touched — the architectural claim the constant was built to make holds.
- **But the docblock above it must be rewritten.** It currently argues at length that `false` is what
  ships and that the conflict is unsettled and "not mine to settle". Left as-is it becomes a comment
  contradicting the line beneath it.
- **`tests/payments/ops-cancel.test.ts` needs a real edit, not a swap of two labels:**
  - **case 1** (line ~374) asserts `OPS_CANCEL_REFUNDS_SERVICE_FEE` is literally `false`, then asserts
    the real action refunds `100000`. It fails on the flip **by design**, carrying the message *"swap
    cases 1 and 2 if D-236 is re-decided"* — so it fails loudly and names the reason. Good design;
    still an edit.
  - **`withFlippedConstant`** (line ~244) hard-codes the mock to `true`. After the flip it must mock
    `false`, or both cases test the same branch.
  - **case 3** reads the real constant for its `shipped` figures and the mock for its `flipped` ones.
    Both expectation sets swap (`refundTotal` 2×HOURLY ↔ 2×TOTAL, `retainedTotal` 2×SERVICE_FEE ↔ 0).

**Do not "simplify" by deleting the mock helper.** Exercising both branches is what makes the
one-line-flip claim measured rather than asserted, and that property should survive the flip in the
opposite direction.

### 2. F11 — a suspended host's `/host/earnings` must name the frozen session

**Ruling: yes.** D-252 already tells a suspended host that hosting is paused and payouts are frozen,
across three surfaces through one component. What is missing is naming **which due session** is on hold
and why — today it simply never produces a payout row, with no explanation attached to it. The
project's own rule (`src/lib/host/requests-signal.ts:56`) is that a signal names the state, the reason
**and** the way out.

⚠ **The PM did NOT choose the variant that names what unfreezes it.** 18-13's deliberate refusal to
name a forthcoming ops review — on the grounds that promising a reply is a commitment with no SLA
behind it — **stands**. Say what is frozen and why. Do not say "a review will release it."

`loadHostVerification()` is already read on that page, so the state is in hand; this is a rendering
and copy change, not a new query.

### 3. D-231 — `title` and `description` become material fields

**Ruling:** add both to the material-edit set. **Keep photo reorder excluded.**

- **Why the words:** a host could be approved on honest copy and then rewrite the entire listing text
  while staying `approved`, sellable and badged. That was the largest remaining hole in Success
  Criterion 4 — the check FitOut advertises is about what the space is, and the words are what a booker
  actually reads.
- **Why reorder stays out:** every photo in the set was already reviewed, so a reorder can only promote
  an already-approved image. Adding or removing a photo already trips re-review, so the set itself is
  covered.
- ⚠ **Accepted cost, stated at ruling time:** a material edit flips `review_state` back to `pending`,
  and `deriveBookable` requires `approved|grandfathered` — so **a typo fix in a description now takes
  the listing off the market until ops re-approves it.** The PM chose this over the "material but still
  sellable" variant, which would have required a state the sell-gate does not have.

Implementation lands in `src/lib/listing/re-review.ts`'s material-field set and its detection site in
`saveListingStep`. ⚠ Read that module's header first: it is a deliberately **shared** helper (unlike
the sell-gate's re-statements, which D-227 requires stay duplicated), and one enum literal is
deliberately absent from the file because an acceptance grep counts occurrences of it.

## Solution

Best run as one `/gsd-quick` per item, or a single small phase. Suggested order — item 1 first, since
it is the money path and its test failure is already staged to name itself:

1. D-236 flip (production line + docblock + three test edits)
2. D-231 material fields (+ `tests/listing/material-edit.test.ts` cases)
3. F11 earnings copy

Gates each run alone, per this project's standing rule: `tsc`, `npm test`, `test:design`, `build`.

**After all three land: tick the Phase 18 checkbox in ROADMAP.md and bump `completed_phases`.** The
checkbox is deliberately unticked today only because this checkpoint was open.

## Related

- Answers of record: `18-14-SUMMARY.md` § The five checkpoint decisions.
- Sibling: `2026-09-01-host-verification-submission-path-and-listing-creation-gate.md` (carries the
  KYC vendor answer and the counsel blocker).
- Not blocked by counsel — none of these three touch the vendor path.
