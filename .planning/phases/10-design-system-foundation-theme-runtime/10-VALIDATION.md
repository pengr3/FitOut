---
phase: 10
slug: design-system-foundation-theme-runtime
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `10-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest **4.1.8** (unit/integration) + Playwright **1.60.0** (e2e) |
| **Config file** | `vitest.config.ts` (existing — `globalSetup` **hard-fails without Postgres**) · `vitest.design.config.ts` (**Wave 0 creates** — DB-free) |
| **Quick run command** | `npm run test:design` → `vitest run --config vitest.design.config.ts` |
| **Full suite command** | `npm test` → `vitest run` (133 files; requires `npm run db:up` + `npm run db:test:setup`) |
| **Estimated runtime** | ~1 second (design gate) · ~minutes (full suite) |

**Why a second config:** the existing `vitest.config.ts` runs `tests/global-setup.ts`, which fails hard when Postgres is absent. The design gate must run in `next build` on a machine with no database, so it needs its own DB-free config with no `setupFiles` and no `globalSetup`. It copies the `@` → `./src` resolve alias from the existing config.

**Build gate wiring (blocking):** `"build": "npm run lint && npm run test:design && next build"`.
Next 16 removed ESLint from `next build` and deleted `next lint` — without this script rewrite, DS-13's "fails the build" requirement is **unmet**, no matter how good the test is.

---

## Sampling Rate

- **After every task commit:** `npm run test:design` (sub-second, no DB) + `npm run lint` scoped to touched files
- **After every plan wave:** `npm run test:design && npm run lint` in full
- **Before `/gsd:verify-work`:** `npm run build` green (lint + design gate + `next build`) **and** full `npm test` green
- **Max feedback latency:** ~2 seconds for the design gate; the full suite is a wave-boundary check only

**Regression watch:** the token edits touch `partial-grant-notice.test.tsx:192`, which asserts a `className` does *not* contain `bg-brand`. Re-verify it holds after the CVA `brand` variant lands.

---

## Per-Task Verification Map

Task IDs are assigned by the planner; this map is keyed by requirement and is the contract each task's `<automated>` verify must satisfy.

| Requirement | Behaviour proven | Test Type | Automated Command | File Exists |
|-------------|------------------|-----------|-------------------|-------------|
| DS-01 | Compiled CSS contains no self-referential custom property; `.font-sans` resolves to `var(--font-geist-sans)` | static (compile-and-assert) | `npm run test:design -- font-cycle` | ❌ W0 |
| DS-02 | Every `--text-*` step exists in both themes with paired line-height/weight/tracking; **zero** `text-[NNpx]` under the gate tree | unit + static gate | `npm run test:design` | ❌ W0 |
| DS-03 | Exactly 3 elevation steps and 4 z steps per theme; zero `shadow-{xs,sm,md,lg}` and zero raw `z-N` under the gate tree | static gate | `npm run test:design` | ❌ W0 |
| DS-04 | Every motion token ≤ 320ms in both themes; `@media (prefers-reduced-motion: reduce)` present in `globals.css` | unit + **manual** | `npm run test:design -- motion-budget` | ❌ W0 |
| DS-05 | `--ring` ≥3:1 against `--background`, `--card` **and** `--muted` in both themes; **zero** `ring-ring/50` and `outline-ring/50` anywhere in `src/` | unit + static gate | `npm run test:design -- contrast focus-recipe` | ❌ W0 |
| DS-06 | Every pair in `CONTRAST_PAIRS` clears its bar in both themes, **alpha pairings composited first** | unit | `npm run test:design -- contrast` | ❌ W0 |
| DS-07 | Every token in both themes is `inGamut("rgb")` | unit | `npm run test:design -- contrast` | ❌ W0 |
| DS-08 | `buttonVariants` exposes `brand`; **zero** literal `bg-brand text-brand-foreground` recipes on a `<Button>` | unit (CVA) + static gate | `npm run test:design` | ❌ W0 |
| DS-09 | `buttonVariants({size:"touch"})` yields a ≥44px height class | unit (CVA snapshot) | `npm run test:design` | ❌ W0 |
| DS-10 | Status vocabulary is a closed union type; every status entry declares an icon | unit (type + data) | `npm run test:design` | ❌ W0 |
| DS-12 | Regenerating `tokens.generated.ts` produces a byte-identical file | unit (regen-diff) | `npm run test:design -- token-drift` | ❌ W0 |
| DS-13 | No leak-pattern match under `src/app/**` or `src/components/**`; **and the build goes red on a deliberately injected leak** | static gate + **manual proof** | `npm run test:design -- leak` then `npm run build` | ❌ W0 |
| DS-14 | `metadata.title` ≠ "Create Next App"; `metadataBase` set; `<html suppressHydrationWarning>`; the 5 starter SVGs and `favicon.ico` gone | unit (fs + render) | `npm run test:design` | ❌ W0 |
| THEME-01 | Provider mounts with `attribute="data-theme"`; Sonner receives `"light"` for both named themes | unit (jsdom render) | `npm test -- tests/design/theme-provider` | ❌ W0 |
| THEME-02 | Both theme blocks define the **same token key set** (a missing key in one theme is a silent fallthrough) | unit (set equality) | `npm run test:design` | ❌ W0 |
| THEME-03 | Both themes exist in the same commit | — (satisfied by THEME-02) | — | n/a |
| THEME-04 | A nested `[data-theme="grove"]` subtree computes grove's `--brand` | e2e (Playwright) **or** compiled-CSS assertion — decided by the Wave 0 spike | `npx playwright test e2e/theme-nesting.spec.ts` | ❌ W0 |
| THEME-05 | **Zero** `dark:` under `src/app/**` and `src/components/**` *excluding* `src/components/ui/**`; **exactly 56** remain in `src/components/ui/**` | static gate | `npm run test:design -- dark-scope` | ❌ W0 |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Every design test is blocked on these. Wave 0 is not optional — the first item alone gates the other seventeen.

- [ ] `vitest.design.config.ts` — DB-free config (**blocks every other design test**)
- [ ] `config/design-leak-patterns.mjs` — shared pattern list (imported by ESLint **and** Vitest, so the two gates cannot drift)
- [ ] `src/lib/design/contrast-pairs.ts` — the declared pair inventory (D-13)
- [ ] `tests/design/helpers/compile-css.ts` — compile `globals.css` via `@tailwindcss/postcss`, expose parsed tokens (used by font-cycle, motion-budget, THEME-02)
- [ ] `scripts/generate-design-tokens.mjs` — the generator (DS-12's drift test needs it to exist first)
- [ ] `npm install --save-dev culori`
- [ ] `package.json` scripts: add `test:design`; rewrite `build` to `npm run lint && npm run test:design && next build` (**DS-13 is unmet without this**)
- [ ] 15-minute spike: does jsdom resolve nested `[data-theme]` custom properties? (decides THEME-04's test layer)

*Directory convention:* `tests/ops/` and `tests/security/` are the established home for mechanical guard tests → new tests live in **`tests/design/`**.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OS reduced-motion actually suppresses a Radix dialog animation | DS-04 | The CSS rule's *presence* is testable; that the OS setting suppresses a real animation is a browser-level observation. Playwright's `emulateMedia({ reducedMotion: "reduce" })` can automate this in Phase 11. | Enable reduced motion at the OS level, open a dialog, confirm no transition plays |
| A deliberately injected leak turns the build red | DS-13 | Proving the gate *blocks* requires running it against a known-bad tree once. | Add a raw hex to a component, run `npm run build`, confirm non-zero exit, revert |
| "Accent visibly deepens" | D-11 | Aesthetic acceptance, not a testable property | One human look at `/dev/theme` |
| `/dev/theme` side-by-side reads as two plausible brand directions | SC#3 | Aesthetic acceptance | One human look at `/dev/theme` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a declared Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all ❌ references above
- [ ] No watch-mode flags in any committed command
- [ ] Feedback latency < 2s for the design gate
- [ ] `build` script rewritten — otherwise DS-13 is structurally unmet
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
