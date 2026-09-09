---
phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit
reviewed: 2026-09-09T13:23:35Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - e2e/helpers/booker-seed.ts
  - e2e/host-dashboard.spec.ts
  - e2e/host-listing-grid.spec.ts
  - eslint.config.mjs
  - src/app/(host)/host/listings/[id]/edit/page.tsx
  - src/app/(host)/host/listings/[id]/edit/wizard.tsx
  - src/app/(host)/host/listings/page.tsx
  - src/app/(host)/host/page.tsx
  - src/app/actions/listing-photo.ts
  - src/app/actions/listing.ts
  - src/app/actions/ops-auth.ts
  - src/components/host/host-signals.tsx
  - src/components/host/verification-roadmap.tsx
  - src/components/listing/listing-card.tsx
  - src/components/listing/photo-uploader.tsx
  - src/inngest/functions/didit-reconcile.ts
  - src/lib/host/verification-cooldown.ts
  - src/lib/host/verification-roadmap.ts
  - src/lib/listing/re-review-copy.ts
  - src/lib/listing/review-history.ts
  - tests/design/calendar-plate-month.test.tsx
  - tests/design/card-pattern-coverage.test.ts
  - tests/design/listing-reuse-predicate-census.test.ts
  - tests/design/ops-guard-coverage.test.ts
  - tests/design/status-vocab.test.ts
  - tests/design/suspense-fallback-overlay.test.ts
  - tests/host/agenda-states.test.tsx
  - tests/host/verification-panel.test.tsx
  - tests/host/verification-roadmap-state.test.ts
  - tests/host/verification-roadmap.test.tsx
  - tests/host/verification-surface.test.ts
  - tests/listing/create-signal.test.ts
  - tests/listing/listing-card.test.tsx
  - tests/listing/material-edit.test.ts
  - tests/listing/review-history.test.ts
  - tests/listing/wizard-save-state.test.tsx
findings:
  critical: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-09-09T13:23:35Z  
**Depth:** standard  
**Files Reviewed:** 36  
**Status:** issues_found

## Summary

The Phase 21 implementation has one shipping blocker in the server-derived rejection context and one robustness gap in the new payout roadmap action. The history reducer can attach an older rejection's explanation to the current rejected cycle, which makes the primary recovery CTA tell a host to fix the wrong problem. The payout action also has an unhandled rejected-promise path that bypasses the component's inline error state.

Focused verification passed 81 Vitest cases across the review-history, roadmap-state, listing-card, and wizard-save-state suites. ESLint reported no errors (one React Compiler optimization warning), and `git diff --check` was clean. Those checks do not exercise the two edge cases below.

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01 [BLOCKER]: A reason-less current rejection inherits a stale explanation from an older cycle

**File:** `src/lib/listing/review-history.ts:158-159`  
**Issue:** Review rows are processed newest-first, but `latestRejectionReason === null` is used both as the "no rejected row has been seen" sentinel and as the valid result for a rejected cycle whose optional reason is null or whitespace. When the newest/current rejected cycle has no reason, line 159 leaves the field as `null`; a later, older rejected cycle is then allowed to populate it. The listing grid consumes this field as the current operator explanation, so the host sees stale remediation instructions from a previous review. The existing missing-reason test at `tests/listing/review-history.test.ts:247-304` has only one rejected cycle and therefore does not cover this collision.

**Fix:** Track whether the first rejected row has been consumed independently of its normalized reason, for example:

```ts
const latestRejectedSeen = new Set<string>();

if (row.state === "rejected" && !latestRejectedSeen.has(row.listingId)) {
  latestRejectedSeen.add(row.listingId);
  entry.latestRejectionReason = row.reason?.trim() ? row.reason : null;
}
```

Add a regression case with a newest rejected cycle whose reason is null/blank and an older rejected cycle with a non-empty reason; `latestRejectionReason` must remain `null`.

### Warnings

#### WR-01 [WARNING]: A rejected payout server action bypasses the roadmap's inline failure state

**File:** `src/components/host/verification-roadmap.tsx:43-52`  
**Issue:** `beginPayoutOnboarding` awaits the server action without `try/catch`. The action normally returns an `OnboardingResult`, but it can still reject—for example, session/header resolution and rate-limit audit happen before the action's provider `try` block, its error-audit call can itself fail, and the server-action transport can fail. In those cases the transition callback throws and the new roadmap never sets its inline error message, leaving the user without the recovery feedback this component otherwise provides.

**Fix:** Convert rejected calls to the same safe inline error state and keep navigation inside the success branch:

```tsx
startTransition(async () => {
  try {
    const result = await startPayoutOnboarding();
    if (result.ok) {
      window.location.href = result.url;
      return;
    }
    setError(result.error);
  } catch {
    setError("We couldn't start payout setup. Please try again.");
  }
});
```

Add a component test that mocks `startPayoutOnboarding` with `mockRejectedValue` and asserts that the retryable message is rendered.

---

_Reviewed: 2026-09-09T13:23:35Z_  
_Reviewer: Codex (gsd-code-reviewer)_  
_Depth: standard_
