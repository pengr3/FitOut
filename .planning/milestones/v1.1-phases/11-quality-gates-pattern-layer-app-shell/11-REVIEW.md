---
phase: 11-quality-gates-pattern-layer-app-shell
reviewed: 2026-08-17T11:41:07Z
depth: standard
files_reviewed: 108
files_reviewed_list:
  - e2e/error-leak.spec.ts
  - e2e/helpers/served-document.ts
  - e2e/helpers/visual-freeze.ts
  - e2e/overflow-320.spec.ts
  - e2e/shell.spec.ts
  - e2e/skeleton-geometry.spec.ts
  - e2e/visual/surfaces.spec.ts
  - e2e/visual/theme-swap.spec.ts
  - src/app/(app)/bookings/[id]/cancel/loading.tsx
  - src/app/(app)/bookings/[id]/group/loading.tsx
  - src/app/(app)/bookings/[id]/loading.tsx
  - src/app/(app)/bookings/loading.tsx
  - src/app/(app)/bookings/page.tsx
  - src/app/(app)/error.tsx
  - src/app/(app)/layout.tsx
  - src/app/(app)/profile/loading.tsx
  - src/app/(auth)/error.tsx
  - src/app/(auth)/layout.tsx
  - src/app/(host)/host/bookings/[id]/loading.tsx
  - src/app/(host)/host/bookings/loading.tsx
  - src/app/(host)/host/bookings/page.tsx
  - src/app/(host)/host/earnings/loading.tsx
  - src/app/(host)/host/earnings/page.tsx
  - src/app/(host)/host/error.tsx
  - src/app/(host)/host/layout.tsx
  - src/app/(host)/host/listings/[id]/availability/loading.tsx
  - src/app/(host)/host/listings/[id]/edit/loading.tsx
  - src/app/(host)/host/listings/loading.tsx
  - src/app/(host)/host/listings/new/loading.tsx
  - src/app/(host)/host/listings/page.tsx
  - src/app/(host)/host/loading.tsx
  - src/app/(host)/host/page.tsx
  - src/app/(host)/host/payouts/refresh/loading.tsx
  - src/app/(host)/host/payouts/return/loading.tsx
  - src/app/(host)/host/requests/loading.tsx
  - src/app/(host)/host/requests/page.tsx
  - src/app/(legal)/error.tsx
  - src/app/(legal)/layout.tsx
  - src/app/(legal)/privacy/page.tsx
  - src/app/(legal)/terms/page.tsx
  - src/app/(public)/invite/[token]/loading.tsx
  - src/app/(public)/invite/[token]/not-found.tsx
  - src/app/(public)/invite/[token]/opengraph-image.tsx
  - src/app/(public)/invite/[token]/page.tsx
  - src/app/(public)/layout.tsx
  - src/app/(public)/loading.tsx
  - src/app/actions/group.ts
  - src/app/dev/theme/error-state-preview.tsx
  - src/app/dev/theme/page.tsx
  - src/app/dev/throw/page.tsx
  - src/app/error.tsx
  - src/app/fonts/Geist-Regular.ttf
  - src/app/fonts/Geist-SemiBold.ttf
  - src/app/global-error.tsx
  - src/app/layout.tsx
  - src/app/listings/[id]/(detail)/layout.tsx
  - src/app/listings/[id]/(detail)/loading.tsx
  - src/app/listings/[id]/(detail)/not-found.tsx
  - src/app/listings/[id]/(detail)/page.tsx
  - src/app/listings/[id]/book/layout.tsx
  - src/app/listings/[id]/book/loading.tsx
  - src/app/listings/[id]/opengraph-image.tsx
  - src/app/not-found.tsx
  - src/app/og-render.ts
  - src/app/opengraph-image.tsx
  - src/components/availability/spots-left-chip.tsx
  - src/components/booking/booking-row.tsx
  - src/components/booking/price-breakdown.tsx
  - src/components/booking/reserve-view.tsx
  - src/components/group/attendee-roster.tsx
  - src/components/group/invite-card.tsx
  - src/components/host/host-booking-row.tsx
  - src/components/host/payout-row.tsx
  - src/components/host/payout-summary.tsx
  - src/components/host/request-row.tsx
  - src/components/notifications/notification-bell.tsx
  - src/components/patterns/ambient-notifications.tsx
  - src/components/patterns/auth-slot-skeleton.tsx
  - src/components/patterns/panel-card.tsx
  - src/components/patterns/row-card.tsx
  - src/components/patterns/site-footer.tsx
  - src/components/search/search-result-card.tsx
  - src/components/search/search-results.tsx
  - src/components/site/anonymous-auth-actions.tsx
  - src/components/site/public-header.tsx
  - src/lib/design/measurements.ts
  - src/lib/design/visual-baselines.ts
  - src/lib/group/rsvp.ts
  - src/lib/listing/og-facts.ts
  - src/lib/site.ts
  - tests/design/blocking-session-gate.test.ts
  - tests/design/card-pattern-coverage.test.ts
  - tests/design/elevation-z.test.ts
  - tests/design/empty-state-adoption.test.ts
  - tests/design/error-boundaries.test.ts
  - tests/design/focus-recipe.test.ts
  - tests/design/gitignore-baselines.test.ts
  - tests/design/global-error.test.ts
  - tests/design/invite-notfound-parity.test.ts
  - tests/design/legal-copy.test.ts
  - tests/design/loading-coverage.test.ts
  - tests/design/og-routes.test.ts
  - tests/design/selector-contract.test.ts
  - tests/design/site-contacts.test.ts
  - tests/design/sticky-offset.test.ts
  - tests/design/type-scale.test.ts
  - tests/group/rsvp-rate-limit.test.ts
  - tests/search/search-card-open.test.tsx
  - .github/workflows/ci.yml
  - .github/workflows/baselines.yml
  - playwright.config.ts
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-08-17T11:41:07Z
**Depth:** standard
**Files Reviewed:** 108 (full diff list) + 3 config files read for context (`.github/workflows/ci.yml`, `.github/workflows/baselines.yml`, `playwright.config.ts` — not in the diff but named as security-sensitive in scope)
**Status:** issues_found

## Summary

This review covered the full 108-file changed-file list for phase 11 at standard depth, with the money/auth/token-oracle files, the CI/CD workflows, and the test gates read in full rather than skimmed, per the security-sensitive-areas instruction. What I read in full: every file touching the invite-token oracle (`invite/[token]/page.tsx`, `invite-card.tsx`, `invite/[token]/not-found.tsx`, `invite/[token]/opengraph-image.tsx`, `src/lib/group/rsvp.ts`, `src/app/actions/group.ts`, `tests/group/rsvp-rate-limit.test.ts`, `tests/design/invite-notfound-parity.test.ts`); every error boundary (`src/app/error.tsx`, `global-error.tsx`, the four group `error.tsx` files, `patterns/error-state.tsx`'s consumers, `e2e/error-leak.spec.ts`); every money-adjacent component (`price-breakdown.tsx`, `reserve-view.tsx`, `payout-summary.tsx`, `payout-row.tsx`, `host-booking-row.tsx`, `booking-row.tsx`); both CI workflow files; all five group layouts and their session/capability gates plus `tests/design/blocking-session-gate.test.ts`; the OG-image pipeline (`og-render.ts`, `og-facts.ts`, all three `opengraph-image.tsx` routes, `tests/design/og-routes.test.ts`); the pattern layer (`row-card.tsx`, `panel-card.tsx`, `auth-slot-skeleton.tsx`, `ambient-notifications.tsx`, `site-footer.tsx`, `public-header.tsx`, `anonymous-auth-actions.tsx`); all `page.tsx` and `loading.tsx` files in the diff; and eight of the twelve `tests/design/*.test.ts` gate files plus `tests/search/search-card-open.test.tsx`.

What I did **not** read line-by-line: `src/app/dev/theme/page.tsx` (787 lines, a design-system preview page with no DB/session imports — verified its import list only), `e2e/overflow-320.spec.ts` and `e2e/shell.spec.ts` bodies beyond their headers, and four of the twelve `tests/design/*.test.ts` files (`empty-state-adoption.test.ts`, `error-boundaries.test.ts`, `focus-recipe.test.ts`, `type-scale.test.ts`) beyond confirming they exist and are referenced consistently elsewhere. I did not execute the test suite or the build; findings are from static reading only.

**Overall assessment:** this is an unusually rigorous submission. Every gate I read in full carries a documented "watched red" section (the gate demonstrably fails on a real mutation before being trusted), a guard-the-guard assertion against a scanner that silently opens zero files, and a positive control proving the scanner can find what it's looking for. The invite-token-oracle property (unknown/malformed/revoked tokens produce byte-identical output, no distinguishing status code or timing signal from the page) is enforced by both source-level and rate-limit-level tests and holds up under inspection. The `server-only` boundary around money computation holds — every money-adjacent component I read receives finished strings/cents from the server and performs zero arithmetic. Error boundaries pass only `digest` across the client boundary; no `error.message`/`stack` reaches JSX in any of the five boundaries or `global-error.tsx`. CI workflows correctly scope `contents: write` to the single baseline-dispatch job and reference no `secrets.*`.

I found no Critical or Warning-severity bugs, security vulnerabilities, or vacuous gates in the areas read in full. I found two Warning-level **documentation-drift** defects: comments that were accurate when written but were not updated after a later plan in the same phase made them false — which is notable specifically because this codebase's own house style (stated explicitly in `src/lib/design/measurements.ts`'s `AUTH_SLOT_ICON` correction and repeated throughout `deferred-items.md`) is "a stated reason that has quietly become false is worse than no reason." Both instances below violate that house rule on the phase's own terms.

## Warnings

### WR-01: `panel-card.tsx`'s header still claims "nobody yet" adopts the pattern, after all five listed surfaces were adopted

**File:** `src/components/patterns/panel-card.tsx:3-6`
**Issue:** The file's header comment reads:

```
// WHAT THIS REPLACES (nobody yet — the adoption plans swap the surfaces): the listing page's sticky
// booking rail (`listings/[id]/page.tsx:365`), `booking/price-breakdown.tsx`'s container,
// `host/payout-summary.tsx`, `invite/[token]`'s `InviteCard`, and the hours-missing notices. Five
// surfaces that each re-decide padding, radius and elevation today.
```

This was accurate when written in plan 11-08 (before any adoption). It is no longer accurate:

- All five listed surfaces now import `PanelCard` — confirmed directly by reading `src/app/listings/[id]/(detail)/page.tsx` (`<PanelCard sticky>` wraps the booking rail), `src/components/booking/reserve-view.tsx` (`<PanelCard sticky>{breakdown}...`), `src/components/host/payout-summary.tsx`, `src/components/group/invite-card.tsx`, and `src/app/(host)/host/page.tsx` (`<PanelCard tone="muted">` around the hours-missing notice) — and independently confirmed by `tests/design/card-pattern-coverage.test.ts`'s `CARD_SURFACES` inventory, which lists all five `panel-card` rows as `status: "adopted"`.
- The cited path `listings/[id]/page.tsx:365` no longer exists: plan 11-10's route-group restructure moved that file to `listings/[id]/(detail)/page.tsx`.
- The attribution "`booking/price-breakdown.tsx`'s container" is misleading even on its own terms: `price-breakdown.tsx`'s own header explicitly states it has *no* container of its own and that wrapping it in a `Card`/`PanelCard` directly would double-pad — the actual container is `reserve-view.tsx`. A reader who trusts this header and goes looking for `PanelCard` adoption inside `price-breakdown.tsx` will not find it and may conclude the adoption never happened, or may add a second, incorrect wrapper.

Contrast with the sibling pattern file `src/components/patterns/row-card.tsx`, whose equivalent header line *was* updated after adoption: "all four adopted by plan 11-11." `panel-card.tsx` was last touched by plan 11-10 and has not been revisited since plans 11-13 and 11-19 adopted it on all five surfaces.

**Why it matters:** This is the exact "reason that quietly became false" failure mode this codebase repeatedly calls out as worse than having no comment at all (see `src/lib/design/measurements.ts`'s `AUTH_SLOT_ICON` correction note, which frames this precisely). A maintainer reading this file to understand adoption status is told something false, is pointed at a file path that no longer exists, and is pointed at the wrong file for the container relationship.

**Fix:**
```diff
-// WHAT THIS REPLACES (nobody yet — the adoption plans swap the surfaces): the listing page's sticky
-// booking rail (`listings/[id]/page.tsx:365`), `booking/price-breakdown.tsx`'s container,
-// `host/payout-summary.tsx`, `invite/[token]`'s `InviteCard`, and the hours-missing notices. Five
-// surfaces that each re-decide padding, radius and elevation today.
+// WHAT THIS REPLACES, ALL FIVE NOW ADOPTED: the listing page's sticky booking rail
+// (`listings/[id]/(detail)/page.tsx`, plan 11-13), the checkout rail in `booking/reserve-view.tsx`
+// that boxes `price-breakdown.tsx` (plan 11-13 — price-breakdown.tsx itself stays a bare div, see its
+// own header for why), `host/payout-summary.tsx` (plan 11-13), `invite/[token]`'s `InviteCard`
+// (moved here in plan 11-19), and the hours-missing notice on `(host)/host/page.tsx` (plan 11-13).
+// See `tests/design/card-pattern-coverage.test.ts`'s `CARD_SURFACES` for the machine-checked inventory.
```

---

### WR-02: `site-footer.tsx` still describes the footer as having SIX mount sites and `/terms`/`/privacy` as not-yet-existing, after plan 11-15 created both

**File:** `src/components/patterns/site-footer.tsx:16-19` and `:111-112`
**Issue:** Two related stale forward-references, both written by plan 11-14 (before plan 11-15 ran) and never revisited:

1. Lines 16-19:
   ```
   // The SIX mount sites are the five group layouts — `(public)`, `(auth)`, `(app)`, `(host)/host`,
   // `listings/[id]/(detail)` — plus `src/app/not-found.tsx`. The root not-found is the one that is easy
   // to miss: it sits directly inside `src/app/layout.tsx`, ABOVE all five groups, so nothing wraps it
   // and it composes its own shell. `(legal)` becomes the seventh when plan 11-15 creates it.
   ```
   `(legal)` already exists in this same diff: `src/app/(legal)/layout.tsx` renders `<SiteFooter />` (confirmed by reading it directly). The true count today is **seven**, not six, and the "becomes the seventh when plan 11-15 creates it" clause describes the future tense for something that has already happened. Notably, `(legal)/layout.tsx`'s own header contradicts this file: "SHELL-02, and the **SEVENTH** mount site — `site-footer.tsx:19` predicted this one by name" — i.e. the two files in the same diff now disagree about the current count.

2. Lines 111-112:
   ```
   * `/terms` and `/privacy` DO NOT EXIST YET — plan 11-15 creates them. The links are authored here
   * because the footer is the reason those routes exist, and they resolve exactly one plan later. A
   ```
   Both routes exist in this diff (`src/app/(legal)/terms/page.tsx`, `src/app/(legal)/privacy/page.tsx`), so "DO NOT EXIST YET" and "resolve exactly one plan later" are both false as of the tree under review. The trailing sentence in the same block ("A reviewer testing the footer in between gets two 404s from these two hrefs, and that is expected") is also stale — a reviewer today gets a real page, not a 404.

**Why it matters:** Same class of defect as WR-01, in the same file family, and cross-file-inconsistent with `(legal)/layout.tsx`'s own count claim within the same diff — a maintainer reading only `site-footer.tsx` (the file that actually owns the footer) will believe there are six mount sites and that `/terms`/`/privacy` are still dead links, both of which are wrong at HEAD of this phase.

**Fix:**
```diff
-// The SIX mount sites are the five group layouts — `(public)`, `(auth)`, `(app)`, `(host)/host`,
-// `listings/[id]/(detail)` — plus `src/app/not-found.tsx`. The root not-found is the one that is easy
-// to miss: it sits directly inside `src/app/layout.tsx`, ABOVE all five groups, so nothing wraps it
-// and it composes its own shell. `(legal)` becomes the seventh when plan 11-15 creates it.
+// The SEVEN mount sites are the six group layouts — `(public)`, `(auth)`, `(app)`, `(host)/host`,
+// `listings/[id]/(detail)`, `(legal)` — plus `src/app/not-found.tsx`. The root not-found is the one
+// that is easy to miss: it sits directly inside `src/app/layout.tsx`, ABOVE all six groups, so
+// nothing wraps it and it composes its own shell.
```
```diff
- * `/terms` and `/privacy` DO NOT EXIST YET — plan 11-15 creates them. The links are authored here
- * because the footer is the reason those routes exist, and they resolve exactly one plan later. A
- * reviewer testing the footer in between gets two 404s from these two hrefs, and that is expected.
+ * `/terms` and `/privacy` were created by plan 11-15 (`src/app/(legal)/terms/page.tsx`,
+ * `src/app/(legal)/privacy/page.tsx`). The links are authored here because the footer is the reason
+ * those routes exist.
```

---

## Info

None beyond the two Warnings above. I looked specifically for the phase's own recurring failure mode — assertions/gates that pass vacuously against an empty scan — across every gate file I read in full (`selector-contract.test.ts`, `loading-coverage.test.ts`, `card-pattern-coverage.test.ts`, `elevation-z.test.ts`, `blocking-session-gate.test.ts`, `invite-notfound-parity.test.ts`, `site-contacts.test.ts`, `og-routes.test.ts`, `sticky-offset.test.ts`, `legal-copy.test.ts`, `global-error.test.ts`, `gitignore-baselines.test.ts`) and every one carries: (a) a floor/guard-the-guard assertion asserted first, (b) a positive control that proves the scanner can find a real match, and (c) a documented "watched red" transcript showing the gate actually failing on a real mutation before being trusted. I did not find an instance of the vacuous-scan pattern introduced or left unguarded in this diff.

I also specifically checked the items listed in `<known_and_deliberate_do_not_report_as_bugs>` and confirmed none of them needed re-reporting, and checked for a *new* instance of the "boot guard lacking `NEXT_PHASE` exemption" pattern (already tracked in `deferred-items.md` for three pre-existing guards) — found none introduced by this phase's files.

---

_Reviewed: 2026-08-17T11:41:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
