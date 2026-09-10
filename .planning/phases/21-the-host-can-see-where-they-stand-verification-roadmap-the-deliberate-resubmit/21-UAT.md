---
status: diagnosed
phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit
source: [21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md, 21-04-SUMMARY.md, 21-05-SUMMARY.md, 21-06-SUMMARY.md, 21-07-SUMMARY.md, 21-VERIFICATION.md]
started: 2026-09-09T18:05:32Z
updated: 2026-09-10T03:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Roadmap perception and responsive backstops

expected: In court and grove themes at 320px and 1280px, the zero-listing, waiting, rejected, stale, grandfathered, mixed, and ready states remain clear with unusually long copy; controls wrap without overflow and the ready receipt replaces the roadmap.
result: issue
reported: "Card 1 spilled on its card and cta is cropped do not let this happen"
severity: major

### 2. Review-history dialog backstops

expected: With five cycles, a long listing title, and long operator reasons at 320px and desktop width, the dialog scrolls internally, text stays selectable and unclamped, actions remain reachable, and neither page nor card scrolls horizontally.
result: pass

### 3. Fix/resubmit and wizard backstops

expected: Long rejected-listing and material-change copy stays within mobile insets without clipped controls; field/photo errors preserve input; the receipt appears and receives focus once only after authoritative requeue success.
result: pass

### 4. Unexercised navigation, concurrency, and error invariants

expected: Repeated `/host/verify` navigation causes no mutation or second retry clock; simultaneous retries produce one guarded winner; a forced review-history read failure exposes only the opaque host error boundary.
result: pass

### 5. Judgment-tier prohibitions and assistive feedback

expected: No forbidden concept from the ten must-NOT statements appears on the roadmap, history, rejected dialog, or wizard; UI-SPEC deviations are consciously accepted or corrected; payout rejection feedback is appropriately announced by assistive technology.
result: pass

### 6. Guarded material-transition results

expected: Material field and photo actions expose only the committed guarded re-review transition, with non-material, already-pending, reorder, and failure paths silent.
result: pass
source: automated
coverage_id: 21-04-D1

### 7. One-time resubmission receipt

expected: The wizard renders one latched Changes received receipt, focuses and scrolls it once, and suppresses the same outcome's generic save or toast confirmation.
result: pass
source: automated
coverage_id: 21-04-D2

### 8. Durable rejected-to-pending transition

expected: A real rejected listing moves to pending once, keeps the original reason in history, remains overflow-free in both themes and acceptance widths, and reloads to durable grid and history truth.
result: pass
source: automated
coverage_id: 21-04-D3

### 9. Newest rejection remains authoritative

expected: The newest rejected review row remains the sole current-reason authority when its reason is null or whitespace-only, while older text remains attached to its own historical cycle.
result: pass
source: automated
coverage_id: 21-06-D1

### 10. Historical reasons stay out of current guidance

expected: The visible Fix and resubmit dialog omits historical text for null and whitespace-only current reasons while retaining its seven-item checklist and Continue to edit action.
result: pass
source: automated
coverage_id: 21-06-D2

### 11. Rejected payout promises stay recoverable

expected: Rejected payout onboarding promises remain inside the roadmap as deterministic, retryable inline feedback without browser navigation.
result: pass
source: automated
coverage_id: 21-07-D1

### 12. Payout retry replaces stale feedback

expected: A retry clears the stale fallback while pending and replaces it with the second attempt's authoritative resolved refusal, with one action call per click.
result: pass
source: automated
coverage_id: 21-07-D2

## Summary

total: 12
passed: 11
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-21-1
  truth: "In court and grove themes at 320px and 1280px, the zero-listing, waiting, rejected, stale, grandfathered, mixed, and ready states remain clear with unusually long copy; controls wrap without overflow and the ready receipt replaces the roadmap."
  status: failed
  reason: "User reported: Card 1 spilled on its card and cta is cropped do not let this happen"
  severity: major
  test: 1
  root_cause: "The roadmap content stack in verification-roadmap.tsx uses h-full beneath a PanelCard title rendered as a separate sibling, so title, spacing, and a full-height stack exceed the equal-height card; the shared Card overflow-hidden rule then crops the CTA."
  artifacts:
    - path: "src/components/host/verification-roadmap.tsx"
      issue: "The inner content stack has a redundant h-full that makes it consume the full card height below the separately rendered title."
    - path: "src/components/patterns/panel-card.tsx"
      issue: "PanelCard renders its title and roadmap content as separate siblings, exposing the harmful height assumption."
    - path: "src/components/ui/card.tsx"
      issue: "The shared overflow-hidden rule clips content that exceeds the card boundary."
    - path: "e2e/host-dashboard.spec.ts"
      issue: "Existing responsive checks omit vertical containment of body copy and CTA within each roadmap card."
  missing:
    - "Remove the redundant inner h-full while preserving grid/card stretch, min-w-0, and long-token wrapping."
    - "Assert in Chromium that body and CTA bounds remain inside every roadmap card at 320px and 1280px in court and grove themes."
  debug_session: .planning/debug/phase-21-roadmap-card-overflow.md
