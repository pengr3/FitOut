# Phase 21 — UI Review

**Audited:** 2026-09-09
**Baseline:** `21-UI-SPEC.md` (approved 2026-09-09; locked audit contract)
**Screenshots:** Not captured — no dev server responded on ports 3000, 5173, or 8080. Code, component-test, design-test, and recorded Playwright evidence were audited instead.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Exact Phase 21 product copy is present, but repeated `Review history` triggers have no listing-specific accessible name. |
| 2. Visuals | 3/4 | Structure, icons, hierarchy, and responsive assertions match the contract; the two explicitly manual visual judgments could not be closed without live screenshots. |
| 3. Color | 4/4 | Phase-owned states use neutral tokens, success only on glyphs, and no raw colors or unauthorized accent/destructive treatment. |
| 4. Typography | 2/4 | Roadmap explanations and receipts use 14px label styling instead of the required 16px body role, and Step labels introduce the forbidden 500 weight. |
| 5. Spacing | 2/4 | The roadmap grid is correct, but review records use 12px padding and 4px event gaps instead of the contract's consistent 16px records and 8px fact gaps. |
| 6. Experience Design | 3/4 | State, focus, empty/error/loading, and dialog behavior are well covered, but payout pending does not replace its label with an in-flight label as required. |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Restore the Phase 21 typography roles** — Small 14px explanatory prose weakens scanability and violates the locked four-role system. Change roadmap lede/body, ready body, wizard notice/receipt body, and material explanatory prose to the shared 16px Body role; remove `font-medium` from the 14px Step label or use the declared 400-weight Label role.
2. **Bring history spacing back to the declared scale** — Dense 12px cycle cards and 4px lifecycle gaps make five-cycle history harder to parse. Change each record from `p-3` to `p-4` and its lifecycle from `space-y-1` to `space-y-2`.
3. **Expose a truthful payout in-flight label** — The action disables but continues to read `Set up payouts`/`Finish payout setup`/`Review payout setup`, giving no textual progress cue. Render the existing in-flight label while `pending` and keep only that initiating control disabled.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- **WARNING:** Exact roadmap, resubmit, history, notice, and receipt phrases match the contract. Evidence includes `Get ready to take bookings`, `Ready to take bookings`, and the exact roadmap lede in `src/lib/host/verification-roadmap.ts`; exact dialog actions and descriptions in `src/components/listing/listing-card.tsx:223-336`; and exact receipt/notice language in `src/app/(host)/host/listings/[id]/edit/wizard.tsx:360-365,1087-1098`.
- **WARNING:** Every listing card exposes the same accessible trigger name, `Review history` (`src/components/listing/listing-card.tsx:221-224`). In a multi-card grid this is context-poor for screen-reader link/button lists. Keep the visible contract label, but add a listing-specific accessible description or name without changing visible copy.
- No prohibited Phase 21 appeal, dispute, contest, support, ETA, queue-position, or submit-without-edit copy was found in the implemented surfaces. The wizard's pre-existing step progress UI is outside the roadmap anti-feature boundary.

### Pillar 2: Visuals (3/4)

- **WARNING — human judgment required:** `21-VALIDATION.md` explicitly leaves calm pending-state hierarchy/state distinction and pre-navigation warning comprehension to manual inspection. With no live server, this audit cannot prove those perceptual judgments from screenshots.
- Code supports the intended hierarchy: one headed `<section>`, one ordered four-card grid, `h2` section heading, `PanelCard titleAs="h3"`, visible Step/state text, and decorative icons (`src/components/host/verification-roadmap.tsx:57-107`).
- Recorded Playwright evidence checks exactly four cards, one action, 44px action height, one-column/2-column reflow, equal desktop rows, keyboard focus, and internal/viewport overflow in `e2e/host-dashboard.spec.ts:969-1026`. Listing dialogs are likewise covered at both widths/themes in `e2e/host-listing-grid.spec.ts:425-572`.
- No icon-only Phase 21 action was introduced; state meaning is text plus icon shape rather than color alone.

### Pillar 3: Color (4/4)

- No BLOCKER or WARNING was found in Phase 21 color use. The ready and Done states apply `text-success` only to `CheckCircle2`/state glyphs (`src/components/host/verification-roadmap.tsx:60,101`), while surfaces stay tokenized `bg-muted`, `border`, and `text-muted-foreground`.
- `Fix and resubmit`, `Review history`, `Continue to edit`, notice, and receipt remain neutral. Destructive color found in the broader audited files belongs only to the pre-existing photo-delete and listing-delete controls, consistent with the contract.
- No hardcoded hex or `rgb(...)` call-site color was found in the Phase 21 components. `components.json` declares no third-party registries, so the registry safety audit has zero applicable blocks.

### Pillar 4: Typography (2/4)

- **WARNING:** The contract assigns roadmap explanations to Body (16px/400), but the ready body, roadmap lede, and every step body use `text-sm` (14px): `src/components/host/verification-roadmap.tsx:65,79,107`.
- **WARNING:** The wizard receipt and rejected notice repeat the same mismatch with `text-sm` for explanatory body copy (`src/app/(host)/host/listings/[id]/edit/wizard.tsx:363-365,1090-1098`). The resubmit dialog's reason, heading, and seven labels also use 14px (`src/components/listing/listing-card.tsx:316-324`).
- **WARNING:** The design contract permits only weights 400 and 600, yet the Step label uses `font-medium` (500) at `src/components/host/verification-roadmap.tsx:96`. The material-list heading also uses 500 at `src/components/listing/listing-card.tsx:320`.
- Heading hierarchy itself is correct and uses the shared semantic heading role; timestamps are server-formatted and remain selectable ordinary text.

### Pillar 5: Spacing (2/4)

- **WARNING:** Each review-cycle record is required to use 16px padding, but it renders `p-3` (12px) at `src/components/listing/listing-card.tsx:245`.
- **WARNING:** History fact gaps are required to use the 8px Small token, but nested lifecycle events use `space-y-1` (4px) at `src/components/listing/listing-card.tsx:246`.
- **WARNING:** The ready receipt's icon/content separation uses `gap-3` (12px) at `src/components/host/verification-roadmap.tsx:59`, a value outside the Phase 21 declared spacing roles for this relationship.
- The most important responsive geometry is correct: roadmap uses `gap-4 sm:gap-6` (`src/components/host/verification-roadmap.tsx:82`), action regions use `mt-auto`, listing footer retains `flex-wrap`, and dialogs keep 16px viewport insets with dynamic height caps (`src/components/listing/listing-card.tsx:227,299`).

### Pillar 6: Experience Design (3/4)

- **WARNING:** Payout onboarding disables its initiating control, but the button label remains `step.action.label` while pending (`src/components/host/verification-roadmap.tsx:122-129`). This misses the locked requirement to replace the label with the existing in-flight label.
- Loading remains singular: `/host/loading.tsx` renders one announced `RowListSkeleton`, and `/host/listings/loading.tsx` renders one `CardGridSkeleton`. Dialogs receive resolved data and do not fetch or introduce loading flashes.
- Empty, partial, and error coverage is strong: zero history renders no trigger; a sixth cycle only authorizes the latest-five sentinel; optional reasons are omitted; malformed lifecycle pairs throw to the route boundary; the host error boundary exposes the bounded copy and opaque digest.
- Dialog interaction follows the contract. History focuses visible Close on open (`src/components/listing/listing-card.tsx:226-232`); resubmit focuses `Keep reviewing changes` (`src/components/listing/listing-card.tsx:298-303`); Radix owns trapping/dismissal/restoration. The receipt has `tabIndex={-1}`, one guarded focus/scroll move, and no added live region (`src/app/(host)/host/listings/[id]/edit/wizard.tsx:351-367,570-579`).
- Current focused verification passed: 61/61 component tests across roadmap, listing-card, and wizard receipt/state suites. Recorded phase evidence reports 1,464 active design assertions and both Phase 21 Playwright files green, but those historical browser results do not substitute for this audit's absent screenshots.

---

## Registry Safety

Registry audit: `components.json` is present, but `21-UI-SPEC.md` declares zero third-party blocks and `components.json` contains `"registries": {}`. No registry source audit was applicable.

## Files Audited

- `AGENTS.md`
- `.planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md`
- `.planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-UI-SPEC.md`
- `.planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-VALIDATION.md`
- All `21-01` through `21-05` `PLAN.md` and `SUMMARY.md` files
- `src/lib/host/verification-roadmap.ts`
- `src/components/host/verification-roadmap.tsx`
- `src/app/(host)/host/page.tsx`
- `src/components/host/host-signals.tsx`
- `src/lib/listing/review-history.ts`
- `src/lib/listing/re-review-copy.ts`
- `src/app/(host)/host/listings/page.tsx`
- `src/components/listing/listing-card.tsx`
- `src/app/(host)/host/listings/[id]/edit/page.tsx`
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx`
- `src/components/listing/photo-uploader.tsx`
- `src/app/actions/listing.ts`
- `src/app/actions/listing-photo.ts`
- `src/components/patterns/panel-card.tsx`
- `src/app/(host)/host/loading.tsx`
- `src/app/(host)/host/error.tsx`
- `src/app/(host)/host/listings/loading.tsx`
- `src/app/globals.css`
- `components.json`
- `tests/host/verification-roadmap.test.tsx`
- `tests/listing/listing-card.test.tsx`
- `tests/listing/wizard-save-state.test.tsx`
- `e2e/host-dashboard.spec.ts`
- `e2e/host-listing-grid.spec.ts`
