---
phase: 06-full-booking-payment-integration
reviewed: 2026-07-20T09:04:07Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/app/api/paymongo/webhook/route.ts
  - tests/paymongo/webhook-payment-paid.test.ts
  - tests/helpers/mocks.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-20T09:04:07Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

This reviews gap-closure plan 06-10, which closed G-06-01 (CRITICAL): the PayMongo
webhook signature parser rejected every real single-mode (`te`-XOR-`li`) signature.
The diff (base `39985d3^`) is narrow — three commits touching exactly three files:

1. `parseSignature` guard widened from `!parts.t || !parts.te || !parts.li` to
   `!parts.t || (!parts.te && !parts.li)`, with a tolerant return
   `{ t, te: parts.te ?? "", li: parts.li ?? "" }`.
2. `mockPayMongo.signWebhook` gained a `mode: "both" | "test" | "live"` param that
   reproduces PayMongo's real single-mode header shapes.
3. Three regression tests (Case A test-mode, Case B live-mode, Case C both-empty).

**The fix is correct and the security posture holds.** I verified the four points the
scope flagged:

- **T-06-SPOOF intact.** The widened guard is a *pre-filter*, not the auth decision.
  Acceptance still requires `verifySignature` → `timingSafeEqual` to match a 64-hex
  HMAC digest that only the secret holder can produce. The guard change only affects
  *which headers reach* verification; it can never cause a forged request to be
  accepted. A both-empty header (`t=…,te=,li=`) returns `null` → `verified` stays
  `false` → 400 (route.ts:96, 336-338), and empty candidates are additionally
  length-skipped inside `verifySignature` (route.ts:108-113). Defense-in-depth is
  double: parse-time reject *and* verify-time skip. Case C proves this.
- **`verifySignature` / `handleGoneSlot` / `handleRefund` are byte-for-byte unchanged.**
  The route.ts diff touches only `parseSignature` and its doc-comment; the money-path
  handlers are untouched.
- **No regression in sibling suites.** `webhook-signature.test.ts:88`
  (`te=abc,li=abc`, both present-but-wrong) still 400s (passes the widened guard, fails
  verify). `webhook-signature.test.ts:25` asserts the *default* signer still emits the
  both-populated shape — the `mode` default `"both"` preserves it. No test anywhere
  asserts the old single-empty rejection, so nothing breaks.
- **New tests are genuine regression tests, not false greens.** Case A
  (`te=<sig>,li=`) and Case B (`te=,li=<sig>`) would each return `null → 400` under the
  *old* three-part guard (`expect(200)` would fail), and return 200 under the fix — so
  they lock in the exact behavior that was broken. Case C passes under both old and new
  (it guards the preserved invariant). Unique `hourUtc` values (15/16/17) avoid
  EXCLUDE-constraint collisions with the file's other seeded rows.

Predicate truth table (reject = return `null`; accept → proceed to HMAC verify):

| `t`  | `te`  | `li`  | result            | correct |
|------|-------|-------|-------------------|---------|
| ""   | any   | any   | reject (no ts)    | yes |
| set  | ""    | ""    | reject (spoof)    | yes |
| set  | valid | ""    | verify (test)     | yes |
| set  | ""    | valid | verify (live)     | yes |
| set  | valid | valid | verify (legacy)   | yes |
| set  | wrong | ""    | verify → false → 400 | yes |

Whitespace-only values (`te= `) are `.trim()`-reduced to `""` before the guard
(route.ts:94), so `te= ,li= ` is correctly treated as both-empty → 400.

The two findings below are low-severity test-harness completeness items. No BLOCKER
or WARNING defects were found in the gap-closure diff.

## Narrative Findings (AI reviewer)

### Info

#### IN-01: `signWebhook` silently falls through to the masking "both" shape on an unrecognized `mode`

**File:** `tests/helpers/mocks.ts:220-223`
**Issue:** The mode dispatch is `if (mode === "test") … if (mode === "live") … return
<both-shape>`. Any value that is not exactly `"test"` or `"live"` — an uppercase typo,
a stray `"testing"`, or anything reaching the helper from a `.js`/`as any` caller that
escapes the TS union — silently emits the legacy both-populated header
(`t=…,te=<sig>,li=<sig>`). That both-populated shape is *precisely the fixture gap that
masked G-06-01 for four plans*. A test-signing helper whose stated purpose is to
reproduce the real single-mode shape should fail loud rather than degrade to the
masking shape when asked for a mode it does not recognize. TypeScript catches literal
typos at compile time, so runtime impact is limited, hence Info.
**Fix:** Make `"live"` the terminal `else` and reject anything unexpected, e.g.:
```ts
if (mode === "test") return `t=${timestamp},te=${sig},li=`;
if (mode === "live") return `t=${timestamp},te=,li=${sig}`;
if (mode === "both") return `t=${timestamp},te=${sig},li=${sig}`;
throw new Error(`signWebhook: unknown mode ${mode}`);
```

#### IN-02: No regression case for a *forged single-mode* signature (valid-length-but-wrong digest, opposite side empty) → 400

**File:** `tests/paymongo/webhook-payment-paid.test.ts:324-400`
**Issue:** The new suite covers single-mode *valid* → 200 (Cases A/B) and *both-empty*
→ 400 (Case C). The existing `shortSig` case (`webhook-signature.test.ts:88`) covers a
*both-populated* wrong signature. What is not explicitly pinned is the adversarial
single-mode-forged shape the widened guard newly admits to the verifier — e.g.
`t=<ts>,te=<64-hex-but-wrong>,li=` — where exactly one candidate is content-checked and
the other is length-skipped. The code handles it correctly (verify → false → 400), but
a future regression to `verifySignature` that mishandled the one-live-candidate path
could slip past the current cases. Adding this case closes the matrix for a
security-critical parser. Info, because the behavior is provably correct today and
adjacent cases already guard verify.
**Fix:** Add a case posting `mockPayMongo.badSignature`-style content in single-mode
form, e.g. `` `t=${TS},te=${"0".repeat(64)},li=` `` for a seeded pending booking, and
assert `400` with the booking unchanged (mirroring Case C's assertions).

---

_Reviewed: 2026-07-20T09:04:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
