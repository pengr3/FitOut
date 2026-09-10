---
status: diagnosed
trigger: 'Card 1 spilled on its card and cta is cropped do not let this happen'
created: 2026-09-10T10:55:25.7813528+08:00
updated: 2026-09-10T11:47:00+08:00
---

## Current Focus

bug_class: bohrbug
hypothesis: The roadmap's nested `h-full` chain gives each card a definite equal-row height, while the inner content stack also claims full height beneath a separately rendered title; the shared primitive's `overflow-hidden` then clips the over-tall stack and its bottom CTA.
hypothesis: CONFIRMED — the roadmap child stack's `h-full` claims the full CardContent height below PanelCard's separate title sibling, so the combined title/gap/stack height exceeds the card; the shared Card's `overflow-hidden` then crops the CTA.
test: Completed one-variable Chromium counterfactual and source/history inspection.
expecting: Satisfied — removing only inner `h-full` restored vertical containment in all tested width/theme/copy cases and retained equal desktop row heights.
next_action: Return root-cause-only diagnosis; do not edit application code.
reasoning_checkpoint:
  hypothesis: The inner roadmap content div's `h-full` fills the available CardContent height even though PanelCard's title block is a separate sibling above it; title + spacing + the full-height inner stack therefore exceeds the card, and the shared Card's `overflow-hidden` crops the bottom CTA.
  confirming_evidence:
    - Real Chromium computed geometry shows the shipped stack and CTA outside the panel in all 8 original width/theme/copy cases.
    - Removing only the inner `h-full` restores containment in all 8 counterfactual cases while equal desktop peer heights remain unchanged.
  falsification_test: An original case whose CTA bottom remained within its panel, or a no-`h-full` counterfactual that still overflowed, would disprove the hypothesis; neither occurred.
  fix_rationale: Removing the redundant inner height claim would let title and body participate together in intrinsic card height while the grid/card stretch chain continues to equalize desktop peers.
  blind_spots: The probe reused the actual compiled CSS and shipped DOM/class structure but did not perform authenticated dashboard data setup; the static composition has no additional height constraint and the 320px shell geometry is exact.
  candidate_causes:
    - code: nested `h-full` incorrectly grants a full content-box height to a child below a sibling title; `overflow-hidden` exposes the overrun as clipping.
    - config/environment: grove theme typography or Chromium percentage/grid sizing might uniquely trigger overflow.
    - data: unusually long/unbroken rejection copy might be required to make the CTA escape.
  and_gate: no — short copy fails too, and both themes plus both widths fail; theme/copy amplify severity but the code height claim alone creates vertical overflow.

## Symptoms

expected: In court and grove themes at 320px and 1280px, the zero-listing, waiting, rejected, stale, grandfathered, mixed, and ready states remain clear with unusually long copy; controls wrap without overflow and the ready receipt replaces the roadmap.
actual: The first verification-roadmap card's long body copy pushes its CTA below the visible card boundary, while the neighboring card's fixed/equal-height row remains shorter. The user reports, "Card 1 spilled on its card and cta is cropped do not let this happen".
errors: None reported.
reproduction: Phase 21 UAT Test 1; view the verification roadmap with unusually long copy in the supplied screenshot, where the first card is constrained to the neighboring card's row height and its CTA falls below the visible card boundary.
started: Discovered during Phase 21 UAT.

## Eliminated

- hypothesis: Unusually long or unbroken rejection data is required to cause the card overflow.
  evidence: Short-copy probes also overflowed with inner `h-full` at both widths and in both themes; removing only that class fixed both short and long cases.
  timestamp: 2026-09-10T11:47:00+08:00

- hypothesis: Grove-specific theme configuration is the root cause.
  evidence: Court and grove both violated CTA containment. Grove's larger heading typography increased the overrun, but did not create the failure class.
  timestamp: 2026-09-10T11:47:00+08:00

- hypothesis: The host dashboard shell or page composition imposes a fixed card height.
  evidence: `HOST_PANEL_SHELL` is `mx-auto w-full max-w-3xl px-4 py-8`; the page mounts the roadmap in normal document flow with no height, max-height, or overflow wrapper.
  timestamp: 2026-09-10T11:47:00+08:00

## Evidence

- timestamp: 2026-09-10T11:05:00+08:00
  checked: Debug knowledge base
  found: `.planning/debug/knowledge-base.md` does not exist.
  implication: There is no durable known-pattern candidate to test first; proceed with direct source and rendered-layout evidence.

- timestamp: 2026-09-10T11:11:00+08:00
  checked: `src/components/host/verification-roadmap.tsx`, `PanelCard`, `Card`, `Button`, and focused component tests
  found: Each grid item is `h-full`; a child selector forces its PanelCard to `h-full`; inside PanelCard the roadmap child is another `h-full flex-col`; the title is a separate sibling above that child. The shared Card primitive applies `overflow-hidden`, and the CTA is pushed to the bottom with `mt-auto`. Component tests assert only class presence and 44px action height, not geometry.
  implication: There is a concrete cyclic/full-height layout path capable of making title + full-height body exceed a clipped equal-height panel. The existing component suite can pass while the rendered CTA is outside the card boundary.

- timestamp: 2026-09-10T11:11:00+08:00
  checked: Phase 1.25 SBFL eligibility and common-pattern checklist
  found: The reported browser defect has no failing automated test or per-test coverage spectrum; the common quick map has no direct CSS layout category.
  implication: SBFL is skipped; this deterministic layout Bohrbug should be localized with real-browser reproduction and DOM geometry rather than test-spectrum ranking.

- timestamp: 2026-09-10T11:17:00+08:00
  checked: Roadmap model and `e2e/host-dashboard.spec.ts` lines 908-1217
  found: The E2E fixture supplies a rejection reason containing one 512-character unbroken token. Its helper asserts document/card horizontal scroll widths, equal desktop panel heights, a 44px action box, and keyboard focus. It does not compare the action/body bottom against the panel bottom, inspect vertical clipping, or require the focused action to intersect the visible clipped card.
  implication: The E2E test can certify equal heights and no horizontal overflow while the shared `overflow-hidden` still crops vertically overflowing content; this explains why Phase 21 verification was green before UAT.

- timestamp: 2026-09-10T11:19:00+08:00
  checked: Attempted unchanged court roadmap Playwright matrix
  found: The run exited before collection because port 3000 is already occupied and the repository deliberately sets `reuseExistingServer: false`.
  implication: This attempt neither confirms nor refutes the layout hypothesis; the live listener must be identified before choosing a safe reproduction path.

- timestamp: 2026-09-10T11:23:00+08:00
  checked: Existing `http://localhost:3000/` listener
  found: The endpoint returns the FitOut Next.js document and its compiled root stylesheet successfully (HTTP 200). Process metadata was unavailable, so the server will not be stopped or used for sign-up/database-writing E2E flows.
  implication: The actual compiled CSS can be reused safely in a controlled in-browser DOM geometry probe without adopting the unknown server environment for stateful E2E setup.

- timestamp: 2026-09-10T11:29:00+08:00
  checked: Real Chromium geometry with the live app's compiled CSS; original rejected-card DOM versus a one-variable counterfactual removing only inner `h-full`
  found: At 1280px the shipped markup produced equal 388px peer cards, but the first panel had `clientHeight=388`, `scrollHeight=390`, `overflow=hidden`; its inner stack and 44px CTA ended at y=390, 2px below the panel's y=388 bottom. Removing only inner `h-full` kept both cards equal at 388px, reduced panel scrollHeight to 388, and moved the CTA bottom to y=348 inside the card.
  implication: The nested `h-full` is causally responsible for vertical overflow and clipping, not merely correlated with the long copy. Grid/card equal-height behavior survives without that inner claim, so the height is redundant as well as harmful.

- timestamp: 2026-09-10T11:36:00+08:00
  checked: Width/theme/copy boundary matrix in Chromium using the shipped compiled CSS
  found: With inner `h-full`, CTA containment failed in every original case: court short/long at 320px and 1280px, and grove short/long at both widths. Grove amplified the overrun severely: at 320px long copy, card bottom was 656.72px while the CTA occupied 659.09-703.09px, so the entire CTA lay beyond the clipped card. Without inner `h-full`, every counterfactual had `scrollHeight == clientHeight` and its CTA remained inside. Desktop peer cards stayed exactly equal in both variants.
  implication: Unusually long copy and grove typography are severity amplifiers, not required causes. The failure is deterministic and rooted in the inner height claim; the equal-height requirement does not depend on that claim.

- timestamp: 2026-09-10T11:41:00+08:00
  checked: Full host dashboard composition and blame for roadmap height classes
  found: The page mounts `VerificationRoadmap` as a normal sibling inside the host shell with no card-height/max-height/overflow wrapper. Git blame attributes both the list/card `h-full` selector and the inner content `h-full` to commit `6199dbd` (`fix(21-05): contain long roadmap status copy`); the inner height was not present in the original roadmap commit.
  implication: The dashboard composition is not imposing the clipped height. The suspect height chain was introduced later as a responsive containment refinement in the roadmap component itself.

- timestamp: 2026-09-10T11:47:00+08:00
  checked: Initial roadmap commit `0220dff`, later containment commit `6199dbd`, and browser-test commit lookup
  found: Correction to the prior history inference: both outer/card `h-full` and inner-stack `h-full` were already present in initial commit `0220dff`. Commit `6199dbd` added `min-w-0`, `break-words`, and `overflow-wrap:anywhere` to solve horizontal long-token overflow; it did not introduce the height claim. The browser matrix entered in `f24765d`.
  implication: The vertical defect dates to the original roadmap layout. The later long-copy patch solved only the horizontal axis, while the browser test continued to omit vertical containment.

- timestamp: 2026-09-10T11:47:00+08:00
  checked: Final file/line localization
  found: `verification-roadmap.tsx:94` supplies the harmful inner `h-full`; `panel-card.tsx:199-206` renders title and children as separate CardContent siblings; `ui/card.tsx:15` clips overflow. `e2e/host-dashboard.spec.ts:927-950,987-1012` checks horizontal scroll, control height, and peer height but never vertical containment.
  implication: The root mechanism and the missed automated gate are both localized to specific source lines.

- timestamp: 2026-09-10T11:02:00+08:00
  checked: Phase 21 UAT record
  found: Test 1 is the sole Phase 21 failure (11/12 pass); its acceptance target explicitly covers unusually long copy and wrapped controls at 320px and 1280px in both themes. No screenshot artifact path or runtime error was retained.
  implication: The defect is isolated to the roadmap perception/responsive layout contract; later history, wizard, receipt, and payout states already pass their independent checks.

- timestamp: 2026-09-10T11:02:00+08:00
  checked: Project state and repository agent rules
  found: Phase 21 is fully implemented and awaiting gap closure; the repository uses a locally bundled Next.js version whose documentation must be consulted before framework-dependent conclusions.
  implication: Diagnose the rendered roadmap implementation as shipped and use the repository's own CSS/Next.js documentation rather than training-data assumptions.

## Resolution

root_cause: `src/components/host/verification-roadmap.tsx:94` gives the inner roadmap stack `h-full` below a separately rendered PanelCard title, causing title + gap + full-height stack to exceed the equal-height card; `src/components/ui/card.tsx:15` then clips the overflowing CTA with `overflow-hidden`.
fix: Not applied (diagnose-only). Suggested direction is to remove the inner stack's redundant `h-full`, retain `min-w-0`/wrapping and the outer grid-to-panel stretch, and add a browser assertion that every body/action bottom is within its PanelCard bottom in both themes and acceptance widths.
verification: Reproduced with real Chromium and the live app's compiled CSS across court/grove, 320/1280, and short/long copy. All 8 original cases overflowed; all 8 one-variable no-`h-full` counterfactuals were contained, with equal desktop peer heights preserved.
files_changed: []
