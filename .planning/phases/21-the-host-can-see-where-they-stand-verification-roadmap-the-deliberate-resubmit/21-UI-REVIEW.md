# Phase 21 — UI Review

**Audited:** 2026-09-10
**Baseline:** Abstract six-pillar standards (no UI-SPEC.md supplied for this re-audit)
**Screenshots:** Captured at 1440×900, 768×1024, and 375×812. The available server returned the public discovery page; the authenticated host roadmap and resubmit surfaces were not exposed, so their visual review is code- and test-evidence-led.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Core task copy is specific, but two generic recovery/progress messages remain. |
| 2. Visuals | 3/4 | Roadmap hierarchy is sound in code, but the actual host composition was not capturable. |
| 3. Color | 3/4 | Token-only color use is clean, though muted state treatments reduce visual differentiation. |
| 4. Typography | 2/4 | The phase surface uses five text-size roles and three weights, exceeding the compact standard. |
| 5. Spacing | 3/4 | Responsive roadmap spacing is coherent; dialogs retain several arbitrary layout values. |
| 6. Experience Design | 3/4 | Important flows are guarded, but payout progress/error feedback is not announced or action-specific. |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Give payout onboarding an explicit pending and announced status** — a disabled button that keeps its original label can look stalled, especially to assistive-technology users — change the label while `pending` and place status/error feedback in an appropriate live region.
2. **Consolidate the typography scale** — five sizes and three weights make the host/listing phase feel less disciplined — keep explanatory copy to a small, deliberate body/label set and reserve heavier weights for headings/actions.
3. **Differentiate Waiting, Paused, and Next more deliberately** — identical muted panels make roadmap scanning depend on reading every badge — retain text and icons, but add restrained semantic token treatments that distinguish non-actionable state types.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- **WARNING:** The roadmap’s labels are concrete and task-oriented: visible step number, state text, description, and one advancing action are rendered in `src/components/host/verification-roadmap.tsx:99-140`. The resubmit dialog also explains the prerequisite before the CTA in `src/components/listing/listing-card.tsx:305-337`.
- **WARNING:** Generic recovery language remains in `src/components/listing/listing-card.tsx:495` (`Something went wrong. Try again.`). Preserve the server detail when available, but give the fallback an action/context-specific sentence.
- **WARNING:** The payout control’s label remains unchanged while it is disabled (`src/components/host/verification-roadmap.tsx:126-133`); this is ambiguous progress copy. Render an in-flight label such as `Opening payout setup…`.

### Pillar 2: Visuals (3/4)

- **WARNING:** The implemented structure establishes a clear hierarchy: a section heading/lede followed by a single ordered, responsive four-card grid (`src/components/host/verification-roadmap.tsx:78-92`), with `h3` card titles and visible state labels (`:99-113`).
- **WARNING:** Actual host screenshots could not be obtained from the available unauthenticated server. Public-page captures cannot validate the roadmap’s card balance, attention hierarchy, or the resubmit dialog at the required breakpoints. Capture authenticated court and grove states before sign-off.
- **WARNING:** The listing card’s icon-only destructive trigger has an accessible name (`src/components/listing/listing-card.tsx:687-690`), while phase actions otherwise retain visible labels. This is good containment, but its 28px control requires direct host-grid visual checking for density and accidental-tap risk.

### Pillar 3: Color (3/4)

- **WARNING:** No hardcoded hex/rgb values were found in audited Phase 21 UI files; the surface uses semantic utility tokens. There are six `text-primary`/`bg-primary`/`border-primary` matches, all in wizard selection styling, and none in the roadmap/listing-card content scan.
- **WARNING:** `Done`, `Waiting`, `Paused`, and `Next` all receive the same muted panel treatment (`src/components/host/verification-roadmap.tsx:89-92`). Text and icons prevent color-only communication, but this palette gives little at-a-glance distinction between waiting and paused states.
- **WARNING:** Success green is constrained to completion icons (`src/components/host/verification-roadmap.tsx:64,105`), which is appropriate; host screenshots are still needed to verify the intended neutral-dominant / accent-sparing distribution in the real theme.

### Pillar 4: Typography (2/4)

- **WARNING:** Audited phase UI uses five Tailwind text sizes (`xs`, `sm`, `base`, `lg`, `xl`) and three weights (`normal`, `medium`, `semibold`). Abstract standards flag more than four sizes or more than two weights as an inconsistent hierarchy.
- **WARNING:** The roadmap combines `text-xs font-medium` step metadata with `text-sm` body copy (`src/components/host/verification-roadmap.tsx:100-112`), while surrounding host/listing UI introduces `text-lg`, `text-xl`, `text-base`, and `font-semibold`. Reduce the number of active roles and make metadata/body distinctions systematic.

### Pillar 5: Spacing (3/4)

- **WARNING:** Roadmap layout follows a coherent responsive rhythm: one column with `gap-4`, two columns from `sm` with `gap-6`, inner `gap-4`, and an action offset (`src/components/host/verification-roadmap.tsx:86-115`). The Phase 21 remediation correctly removed the inner full-height claim, retaining intrinsic containment.
- **WARNING:** The history and resubmit dialogs use arbitrary viewport calculations and custom grid tracks (`src/components/listing/listing-card.tsx:227,299`). They are practical overflow safeguards, but they bypass the normal spacing scale and need visual validation at short viewport heights.
- **WARNING:** Review-history records mix `p-3`, `space-y-1`, `mt-3`, and `mt-4` (`src/components/listing/listing-card.tsx:243-265`), which is denser and less rhythmically consistent than the roadmap’s 16/24px grid system.

### Pillar 6: Experience Design (3/4)

- **WARNING:** Payout initiation is guarded with `useTransition`, a disabled initiating button, and caught errors (`src/components/host/verification-roadmap.tsx:40-56,126-138`), but the displayed error is a plain paragraph without `role=status`, `role=alert`, or `aria-live`; users relying on announcements may miss it.
- **WARNING:** Destructive operations require confirmation and show a working state (`src/components/listing/listing-card.tsx:161-205`); rejected listings instead present a non-mutating explain-first dialog with a safe initial focus target (`:279-339`). This is a strong interaction pattern.
- **WARNING:** Long reasons and histories wrap and scroll safely (`src/components/listing/listing-card.tsx:242-266,314-327`), and the Phase 21 browser matrix is designed to verify vertical containment. Re-run that matrix in the current environment before release because this audit’s screenshots could not reach authenticated scenarios.

---

## Files Audited

- `AGENTS.md`
- All `21-01` through `21-08` `PLAN.md` and `SUMMARY.md`, plus `21-CONTEXT.md`
- `src/components/host/verification-roadmap.tsx`
- `src/components/listing/listing-card.tsx`
- `src/app/(host)/host/page.tsx`
- `src/app/(host)/host/listings/page.tsx`
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx`
- `src/components/listing/photo-uploader.tsx`
- `src/components/patterns/panel-card.tsx`
- `src/components/ui/card.tsx`
- `e2e/host-dashboard.spec.ts` (phase evidence referenced by plans)
- `components.json`

Registry audit: `components.json` is initialized but declares an empty `registries` object; no third-party registry blocks were in scope.
