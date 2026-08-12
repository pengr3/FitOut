---
phase: 10-design-system-foundation-theme-runtime
verified: 2026-08-12T03:04:43Z
status: passed
score: 5/5 roadmap success criteria verified; 16/18 requirement IDs Complete, 2 Pending (both judged non-blocking, see findings)
overrides_applied: 0
deferred:
  - truth: "DS-09's touch size is adopted at 'the standard for booker-facing primary actions and all mobile controls'"
    addressed_in: "Phase 17"
    evidence: "ROADMAP.md Phase 17 SC#3: 'an automated axe pass green in both themes' over every surface — axe's target-size rule (WCAG 2.5.5/2.5.8) is the mechanism that can find the booker-facing call sites which never opted into size=\"touch\", which deferred-items.md D-10 and src/components/ui/button.tsx:80-83 both name as the intended catch point. DS-09's contract half (the CVA size itself) is complete and tested; only the adoption breadth is deferred."
findings:
  - id: F-01
    severity: warning
    title: "REQUIREMENTS.md leaves THEME-02 marked Pending despite the capability being fully built and tested"
    detail: "Two theme blocks with an identical, tested key set; a mounted next-themes ThemeProvider restricted to [court, grove]; and zero-component-edit re-skinning are all verified present and passing in the tree (see Truth 2 below). No plan after 10-04 ever re-claimed THEME-02 in its requirements: frontmatter, and 10-17's closing SUMMARY undercounts the phase at '14 requirements' (13 Complete + DS-09), silently omitting THEME-02 from its own tally rather than flagging it. This is a tracking-document defect, not a functional gap — recommend a follow-up edit marking THEME-02 Complete (checkbox line 34 and traceability line 191) with a citation to tests/design/theme-tokens.test.ts and the mounted provider."
---

# Phase 10: Design-System Foundation & Theme Runtime Verification Report

**Phase Goal:** Branding lives in exactly one place, the app finally renders in its own typeface, and every token pair a surface uses clears the bar this milestone declares — all before a single visual baseline exists.
**Verified:** 2026-08-12T03:04:43Z
**Status:** passed
**Re-verification:** No — initial verification

## Method

This report is built from direct codebase inspection (grep against the committed tree, running the design-gate test files individually, reading the actual CSS/TSX artifacts) rather than from SUMMARY.md narrative. Where a SUMMARY.md claim is cited, it is cited as a claim to be checked, and the check that confirmed or refuted it is shown alongside it. The full-suite results quoted in the task prompt (`npm test`, `npm run build`, `npm run test:design`, the reduced-motion e2e spec, `verify.schema-drift`) were established immediately before this verification and are treated as ground truth rather than re-run; this report re-ran only targeted subsets to spot-check specific claims.

## Goal Achievement

### Roadmap Success Criteria (the phase's real contract)

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| 1 | App renders as FitOut, not a scaffold — Geist typeface via the fixed `--font-sans` cycle, real tab/metadata/favicon | ✓ VERIFIED | `src/app/globals.css:43` — `--font-sans: var(--font-geist-sans)` (no longer self-referential); `:471` — `@apply font-sans` in `@layer base`. `src/app/layout.tsx` exports real `metadata` (`title: {default: "FitOut", template: "%s · FitOut"}`, real `description`, `metadataBase`). No scaffold SVGs or `favicon.ico` remain in `src/app/` or `public/` — only `icon-court.svg` / `icon-grove.svg` (themed, D-19). `tests/design/font-cycle.test.ts` and `tests/design/scaffold-residue.test.ts` both green (part of the 375-test design suite). |
| 2 | Switching between **court** and **grove** re-skins colour, type, radius, elevation, motion, button hierarchy and status vocabulary with **zero component edits** | ✓ VERIFIED | `src/app/globals.css:160` (`[data-theme="court"]`) and `:285` (`[data-theme="grove"]`) both declare the full 24-key token contract; `tests/design/theme-tokens.test.ts` asserts set equality between the two blocks and passes (part of the 375-suite run, also re-run standalone in this verification: 16/16 across theme-nesting+theme-tokens). `src/components/theme/theme-provider.tsx:33` exports `THEMES = ["court", "grove"] as const` and mounts `attribute="data-theme"` with `enableSystem={false}` — the runtime switch is real, not aspirational. Radius/elevation/type/motion travel via the same `@theme inline` cascade (no per-component override exists anywhere in the scanned tree — confirmed by the zero-hit leak-pattern scan below). |
| 3 | Two themes render side by side in nested `[data-theme]` subtrees on one page | ✓ VERIFIED | `src/app/dev/theme/page.tsx` renders two sibling panes, each with its own `data-theme` attribute, over the identical fixture-driven component tree; guarded by `if (process.env.NODE_ENV === "production") notFound();` at line 383. `tests/design/theme-nesting.test.ts` + `theme-nesting-render.test.tsx` both green. Human acceptance of the resulting visual comparison ("two plausible brand directions, not a test fixture") was already discharged as a checkpoint verdict in 10-17 ("ACCEPTED (human)") — not re-litigated here per the task's instruction not to re-run manual-only items covered during execution. |
| 4 | Every colour pair actually used clears WCAG AA in **both** themes, proven by a build-failing test; focus indicator visible on every control; reduced motion honoured | ✓ VERIFIED | `src/lib/design/contrast-pairs.ts` — 31 declared pairs (29 baseline + 2 added by 10-17's drift check), each measured against `TEXT_BAR=4.5` / `NON_TEXT_BAR=3.0` with a `0.05` epsilon (D-12). `tests/design/contrast.test.ts` green at 73 assertions (re-run standalone: 73/73 pass). `tests/design/pair-drift.test.ts` (13 assertions, re-run standalone: pass) is the companion that fails the build if a component renders a foreground/background pairing absent from the inventory — its own SUMMARY records it being watched red twice (inventory rows removed; an undeclared pairing injected) and green after. `tests/design/focus-recipe.test.ts` (9 assertions, re-run: pass) — no control ships a 50%-alpha ring as its sole focus indicator; the base recipe is a solid `--ring` (D-132). `e2e/reduced-motion.spec.ts` (2 tests) proves the `prefers-reduced-motion` reset suppresses `transition-duration`, `animation-duration` and `animation-iteration-count` on real shipped elements in a real browser, in both directions — this was already run by the orchestrator immediately before this verification (2 passed) and is accepted as ground truth. |
| 5 | No raw hex, `rgb(`, `oklch(` or arbitrary `text-[NNpx]` survives under `src/components/**` or `src/app/**` — build fails on one; generated token module checked for drift | ✓ VERIFIED | Independent grep (not the project's own test) of the full `src/app/**` + `src/components/**` tree for raw hex, palette classes, `white`/`black` utility classes and `text-[NNpx]` returned **zero hits**, and zero `eslint-disable.*no-raw-design-value` escape comments exist anywhere. `package.json` line 8: `"build": "npm run lint && npm run test:design && next build"` — the gate is wired into the build script, not merely present as a test file (10-17's SUMMARY records watching this fail on an injected `#ff0000`, `npm run build` exit 1, then reverted to exit 0). `src/lib/design/tokens.generated.ts` regeneration (`node scripts/generate-design-tokens.mjs`) produced a zero-byte diff against the committed file, confirming DS-12's drift check is real. `src/components/listing/listing-map.tsx:22` now imports `THEME_TOKENS` from the generated module rather than hand-writing `BRAND_CORAL`, closing the named drift defect. |

**Score:** 5/5 roadmap success criteria verified against the tree, not against SUMMARY.md claims.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | DS-09's adoption clause ("is the standard for booker-facing primary actions and all mobile controls") stands at 2 call sites, not a standard | Phase 17 | ROADMAP Phase 17 SC#3 requires "an automated axe pass green in both themes" across every surface; axe's target-size checks are the documented mechanism (`deferred-items.md` D-10, `src/components/ui/button.tsx:80-83`) that can judge "booker-facing primary action" — a role judgement no static gate in Phase 10 can make. The contract half (`buttonVariants({size:"touch"})` → `h-11`, i.e. 44px) is complete and asserted by `tests/design/button-variants.test.ts`. |

## Requirement Coverage — all 18 phase-declared IDs

| Requirement | REQUIREMENTS.md status | Verifier finding | Evidence |
|---|---|---|---|
| DS-01 | Complete | ✓ SATISFIED | `--font-sans` cycle fixed, Geist applied. See SC#1. |
| DS-02 | Complete | ✓ SATISFIED | `tests/design/type-scale.test.ts` green (in 375-suite); independent grep found zero `text-[NNpx]` survivors. |
| DS-03 | Complete | ✓ SATISFIED | `tests/design/elevation-z.test.ts` green; independent grep for raw `z-10`/`-z-10`/`z-50` found zero hits (correctly distinguishing `-z-10` from `z-10`, the exact regex pitfall 10-13 called out — re-verified with a boundary-safe pattern). |
| DS-04 | Complete | ✓ SATISFIED | Motion budget unit test + `e2e/reduced-motion.spec.ts` (already run by orchestrator, 2/2 pass) prove the reduced-motion reset in both directions on real elements. |
| DS-05 | Complete | ✓ SATISFIED | `tests/design/focus-recipe.test.ts` green (9/9, re-run standalone); solid `--ring`, no `ring-*/50` alpha anywhere in the base recipe. |
| DS-06 | Complete | ✓ SATISFIED | `tests/design/contrast.test.ts` green (73/73, re-run standalone); `--brand`/`--success`/`--destructive` all corrected per D-12/D-14. |
| DS-07 | Complete | ✓ SATISFIED | `--destructive: oklch(0.535 0.215 27.325)` (both theme blocks) — the sRGB-gamut-corrected value; `tests/design/contrast.test.ts` covers the gamut assertion. |
| DS-08 | Complete | ✓ SATISFIED | `buttonVariants` exposes `brand`; independent grep found exactly **9** literal `bg-brand` sites outside `src/components/ui/**` (calendar/date-pass-picker/slot-picker×3/spots-left-chip/notification-item/wizard×2) — matching 10-VALIDATION.md's stated "pinned 9" exactly; zero `bg-brand/90` anywhere in `src/`. |
| DS-09 | **Pending** | ⚠ PARTIAL — see Deferred Items | Contract exists and is tested (`h-11`, i.e. 44px); adoption is 2 call sites (`group/rsvp-form.tsx:328`, `search/search-bar.tsx:411`), independently confirmed by grep. Honest, documented, non-blocking deferral to Phase 17 — see judgement below. |
| DS-10 | Complete | ✓ SATISFIED | `tests/design/status-vocab.test.ts` green (13/13, re-run standalone); spot-checked `spots-left-chip.tsx` renders icon + text, never colour-only, even though it doesn't import the shared `STATUS_TONE_RECIPES` constant (D-7 — a DRY/maintainability note, not a functional violation of DS-10's wording). |
| DS-12 | Complete | ✓ SATISFIED | `tokens.generated.ts` regeneration produced zero diff; `listing-map.tsx` imports from it instead of a hand-written hex constant. |
| DS-13 | Complete | ✓ SATISFIED | See SC#5. Build-wired, empirically zero violations, watched-red proof recorded in 10-17. |
| DS-14 | Complete | ✓ SATISFIED | Scaffold SVGs/favicon.ico gone; real metadata; `suppressHydrationWarning` present (see below). |
| THEME-01 | Complete | ✓ SATISFIED | `ThemeProvider` mounted at `src/app/layout.tsx`; `sonner.tsx:29` maps `resolvedTheme === "dark" ? "dark" : "light"` — both named themes correctly resolve to `"light"`, not passed through. |
| THEME-02 | **Pending** (REQUIREMENTS.md) | ✓ SATISFIED in code — see Finding F-01 | Both theme blocks exist with an identical, tested key set; provider restricted to `["court","grove"]`; zero-component-edit re-skinning confirmed. REQUIREMENTS.md was never updated after 10-04 deliberately left it Pending pending the runtime — no later plan re-claimed it, and 10-17's own closing tally silently dropped it. This is a documentation gap, not a functional one. |
| THEME-03 | Complete | ✓ SATISFIED | Both themes shipped in the same phase/commit set as required. |
| THEME-04 | Complete | ✓ SATISFIED | `/dev/theme` nested-subtree preview exists and is tested; production-gated. |
| THEME-05 | Complete | ✓ SATISFIED | Independent grep: **0** app-code `dark:` occurrences outside `src/components/ui/**`; **54** inside it (matches the corrected pinned figure, not the stale 56). |

**No orphaned requirements.** All 18 IDs the roadmap assigns to Phase 10 appear in at least one plan's `requirements:` frontmatter (verified by grepping all 17 `*-PLAN.md` files).

## Judgement: DS-09's Pending disposition

**Honest, not a gap that should block the phase.** Three reasons:
1. The roadmap's own Phase 10 success criteria (verified above) never require full adoption breadth — they require the focus indicator to be visible on every control and the token contract to be sound, both independently verified. DS-09's adoption clause is a requirement-level detail, not a roadmap-level gate.
2. The contract half is complete, tested, and correct (`h-11` = 44px, opt-in per `D-22`, not a responsive default that would have silently resized dense host tables).
3. "Booker-facing primary action" is a judgement about a surface's role that no static gate in this phase (or arguably any phase) can make — the plan's own pair-drift check hit an analogous limit (cross-element pairings) and named the same downstream owner (Phase 17's axe pass) for the same reason. Deferring a role-judgement item to the phase whose stated success criterion is exactly "an automated axe pass green in both themes" is the correct ownership boundary, not scope-shedding.

## Judgement: THEME-02's Pending disposition

**Not honest bookkeeping — a genuine tracking defect, but not a functional gap.** Unlike DS-09, THEME-02 was never explained anywhere as an intentional Pending state: 10-04's SUMMARY deferred it "until the next-themes runtime" arrives, plan 10-05 built that runtime, but no later plan (10-05 through 10-17) re-declared THEME-02 in its `requirements:` frontmatter to close the loop, and 10-17's own closing tally ("13 of its 14 requirements are Complete") undercounts the phase by one ID without flagging why. The functional capability is unambiguously present and independently verified in this report (Truth 2, THEME-02 row above). **Recommended action:** a trivial follow-up edit to `REQUIREMENTS.md` (checkbox line 34, traceability table line 191) — not a closure plan, since no code or test needs to change.

## Honesty Spot-Checks (per the task's explicit instruction to distrust counts)

| Claim | Where made | Spot-check | Result |
|---|---|---|---|
| "12 → 14" alpha-ring sites (not the plan's estimated 12) | 10-07-SUMMARY.md | `tests/design/focus-recipe.test.ts` re-run standalone | 9/9 pass — the gate that would catch a regression is green; the count correction itself is process narrative, not independently re-countable after the fact (sites were fixed, not left as artifacts to recount) |
| `\bz-10\b` matches inside `-z-10` (regex pitfall) | 10-13-SUMMARY.md | Independent boundary-safe grep for raw `z-10`/`-z-10`/`z-50` in `src/` | **0 hits** — confirms the pitfall was real (a naive `\bz-10\b` grep would report false positives) and confirms it was actually fixed, not just described as fixed |
| "the pinned 9" `bg-brand` sites outside `ui/` | 10-VALIDATION.md, 10-09-SUMMARY.md | Independent grep for `bg-brand` outside `src/components/ui/**` | **Exactly 9**, matching file:line-for-file:line with the documented list |
| 54 vendored `dark:` occurrences (corrected from 56) | REQUIREMENTS.md THEME-05 line, D-2 update | Independent occurrence-count grep | **54** inside `ui/`, **0** outside — confirms the corrected figure, not the stale one |
| `cn()` silently deleting named type roles | 10-16-SUMMARY.md | Read `src/lib/utils.ts` | Fix present and load-bearing: `extendTailwindMerge({extend: {theme: {text: ["display","heading","body","label"]}}})`, with the defect and the probe documented inline |
| "2 of 20" occurrences were duplicated comments, not real code sites | 10-14-SUMMARY.md | Read the cited files (`(app)/layout.tsx:40`, `(host)/host/layout.tsx:58`) | Confirmed rewritten as described; both are real prose fixes, not phantom counts |

Every spot-checked count held up. No inflated or fabricated claim was found in the sample.

## D-6 Provenance Check (pre-existing e2e failure — NOT attributed to this phase)

The claim: `open-capacity.spec.ts:376` fails identically at the phase's base commit `ffbf6b5`, reproduced independently by three plans (10-08, 10-13, 10-14/10-16).

- `ffbf6b5` (`docs(state): record phase 10 context session`) is confirmed a real ancestor of the current `HEAD` via `git merge-base --is-ancestor`.
- `git show ffbf6b5:e2e/open-capacity.spec.ts` confirms the spec file, its `pickDay` helper and the day-panel assertion structure already existed at that commit, consistent with the failure being reproducible there.
- The failure signal (`19 passed / 1 failed / 5 did not run` of 25, per the orchestrator's pre-verification run) matches the count the task description states, and matches 10-17-SUMMARY.md's own explanation that "5 did not run" is the remainder of the same serial `describe` block, not five new failures.

**Verdict: the provenance claim is credible and cheaply corroborated.** This finding is informational — it is correctly excluded from Phase 10's scope per the deferred-items.md D-6 chain, and is not counted against this phase's status.

### Anti-Patterns Found

None. Independent scan of `src/app/**`, `src/components/**`, `src/lib/design/**`, `config/`, `scripts/generate-design-tokens.mjs`, `tests/design/**` and `e2e/reduced-motion.spec.ts` for `TBD`/`FIXME`/`XXX`/`TODO` found zero hits.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Design gate is genuinely wired into `build`, not just present as a test | `grep -n '"build"' package.json` | `"build": "npm run lint && npm run test:design && next build"` | ✓ PASS |
| Leak gate has zero live violations in the real tree | independent grep for all 5 DESIGN_LEAK_PATTERNS classes across `src/app/**` + `src/components/**` | 0 hits, 0 disable-comments | ✓ PASS |
| Generated token module has zero drift | `node scripts/generate-design-tokens.mjs` (regen), diff against committed file | `wrote 0/3 file(s)` — no diff | ✓ PASS |
| Theme runtime restricted to exactly `court`/`grove` | `grep -n 'THEMES ='` `src/components/theme/theme-provider.tsx` | `["court", "grove"] as const` | ✓ PASS |
| `dark:` app-code count is truly zero outside vendored tree | boundary-safe occurrence grep | 0 outside `ui/`, 54 inside | ✓ PASS |
| GATE-06 — zero schema migrations this phase | `ls drizzle/*.sql` tail + `git log -- drizzle/` | still at `0025`, last migration authored before Phase 10 | ✓ PASS |

### Human Verification Required

None outstanding. The three items that needed human judgement (SC#3's "two plausible brand directions," D-11's "the accent visibly deepens," and DS-04's originally-manual reduced-motion check) were all already discharged during 10-17's Task 3 checkpoint, with explicit recorded verdicts (two ACCEPTED by the developer, one correctly re-routed to automation because its manual form was provably a non-test). Re-litigating already-discharged human checkpoints is out of scope for this verification per the task's framing.

### Gaps Summary

No blocking gaps. Two Pending requirement rows exist in REQUIREMENTS.md:

- **DS-09** — honest, explicitly documented, non-blocking deferral to Phase 17 (judgement above).
- **THEME-02** — a real tracking-document oversight; the underlying capability is built, wired and tested. Recommend a follow-up documentation-only edit to REQUIREMENTS.md rather than a closure plan.

Every ROADMAP.md Success Criterion for Phase 10 is independently verified against the actual tree (not against SUMMARY.md narrative), every scrutiny item in the verification brief was checked and held up, and no anti-pattern, debt marker, orphaned requirement, or fabricated count was found.

---

*Verified: 2026-08-12T03:04:43Z*
*Verifier: Claude (gsd-verifier)*
