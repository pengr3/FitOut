# Project Research Summary

**Project:** FitOut — Milestone v1.1 (Front-End Polish & Placeholder Design System)
**Domain:** Design-system / token architecture + visual-QA layer over an already-shipped, money-handling Next.js 16 marketplace (v1.0: 9 phases, 1087 tests, live GiST double-booking guarantee)
**Researched:** 2026-08-11
**Confidence:** HIGH overall. All four researchers verified their central claims against the real, installed codebase (compiled CSS, read source, computed contrast from shipped tokens) rather than from general knowledge — see § Confidence Assessment for the specific MEDIUM pockets.

> This document **replaces** the v1.0 research summary at this path (archived at `git show a4e836e:.planning/research/SUMMARY.md`). It synthesizes four v1.1-specific research files: `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`. It does not revisit the v1.0 backend stack, which is unchanged and authoritative in `CLAUDE.md`.

---

## Executive Summary

v1.1 is a **value-layer insertion**, not a rebuild: it puts a single token contract between "what a component asks for" and "what colour/size it gets," across a product whose transactional core (search to hold to pay to confirm, double-booking prevention, group RSVP, open-capacity) already works and is proven by 1087 tests. All four researchers converged, independently and by different methods, on the same operating model: Tailwind v4's `@theme inline` is the load-bearing mechanism that makes a `[data-theme]` attribute re-skin any subtree (verified by compiling the real CSS, by reading Tailwind's documented `inline` semantics, and by reasoning through the CSS cascade — three methods, one conclusion), and the second placeholder theme is not a feature to build later but the **enforcement test** that no component hardcoded a value — it must ship in the same phase as the first theme, not as an end-of-milestone audit.

The research also converged on something less comfortable: **the shipped codebase already contains a specific, measured set of defects that predate this milestone** — a self-referential `--font-sans` CSS variable that silently makes the entire app render in a system font instead of Geist, at least four (and by a fuller independent audit, closer to seven) token pairs that fail the WCAG AA bar D-131 makes a hard gate, a hardcoded hex in `listing-map.tsx` that has already drifted from the live `--brand` token, and a `sonner.tsx` toast component that will silently mis-theme the instant a `ThemeProvider` is mounted. Every one of these is cheap to fix now, while there is no schedule pressure and branding is still an explicit placeholder (D-127) — and every one of them **invalidates any visual-regression baseline captured before the fix**, which is why they must all land in the very first phase, before a single screenshot is taken.

The dominant *risk* this research surfaces is not building the wrong thing — it is regression: restyling silently breaking the e2e selectors that are the only proof the double-booking guarantee still holds, or a "make checkout feel responsive" pass quietly moving a price computation client-side and reopening a real trust/tamper vector (D-130 exists precisely to forbid this). The recommended approach threads this by doing token-and-gate infrastructure first (including a selector inventory and a client/server boundary test, before any component is touched), then a booker-first, mostly-parallel set of surface phases, with a full second-theme-and-baseline audit always last. Three open items need an explicit human decision before the foundation phase can be called done — most notably that the AA-compliant fix for the focus ring appears to require `--ring = --brand`, which directly contradicts an already-approved UI-SPEC line barring accent-coloured focus rings.

---

## Key Findings

### Recommended Stack

The stack addition for v1.1 is small and mostly *config discipline over already-installed mechanisms*, not new dependencies. Four packages, total:

- **`react-easy-crop@6.2.3`** — avatar crop UI. Verified React-19-safe (it's a class component; React 19 only removed `defaultProps` for function components). Emits crop coordinates only; the app draws to canvas and uploads a blob through the existing server action.
- **`@axe-core/playwright@4.12.1`** — WCAG AA gate in the e2e layer (bundles axe-core 4.13.0, 70 rules across the AA tag set).
- **`culori@4.0.2`** (dev) — oklch to WCAG contrast ratio at test time; the tool used to compute every ratio in this document.
- **`eslint-plugin-jsx-a11y@6.10.2`** (dev) — promote from transitive (6 rules enabled today) to explicit with `flatConfigs.recommended` (34 rules).

Everything else v1.1 needs is **already installed and either mis-wired or unmounted**: `next-themes@0.4.6` is installed but has zero mounted provider; `@playwright/test@1.60.0` already ships `toHaveScreenshot` and needs only config discipline (pin exact, generate baselines only in the matching Docker image); `next-cloudinary` already exposes `crop`/`gravity`/`x`/`y`, so the "non-destructive cover-frame preview" needs no cropper at all, only a focal-point picker. The email shell needs zero new packages (D-66 bars a new email stack) — CSS custom properties and `oklch()` are effectively unusable in email (Gmail can use `var()` but cannot *declare* a custom property; an unsupported colour function makes Gmail discard the entire inline-style attribute), so token values must be resolved to literal sRGB hex at build time into a committed, generated artifact.

### Expected Features

**Must have (table stakes — the "Launch With" set):** the token foundation itself (type scale, elevation, motion, one retuned focus-ring recipe, button hierarchy replacing 19 files of repeated `bg-brand …` literals, a closed status-badge vocabulary, three named card patterns, the mounted `ThemeProvider` + a `tokens.ts` values module, a leak-test); route-level `loading.tsx`/`error.tsx`/`not-found.tsx` on the 25 of 27 routes that have neither today; the search zero-result state and six other empty states finished; the three-way split of payment/hold failure states (never conflated); the "slot just taken" collision upgraded to offer real alternatives; booker-flow conventions (search-card restructure, listing-detail structure, price-breakdown visual unification, checkout chrome, a redirect warning before the PayMongo hand-off, confirmation as a distinct first paint); booking-detail completeness, a transactional-email shell, real site header/footer (currently **absent** on `/`, `/listings/[id]`, `/listings/[id]/book`, `/invite/[token]`); the host requests inbox and listing wizard (the two host surfaces a booker is directly waiting on); the `sheet` primitive (not installed — every mobile pattern needs it) plus a sticky mobile booking bar; and the 66 `dark:` class cleanup.

**Should have (differentiators):** promoting FitOut's true-availability search cards from a muted afterthought to a first-class row; the `/theme-preview` side-by-side route (D-128's proof surface, doubling as the cheapest possible VR target); collision recovery that offers nearest alternatives instead of a dead end; confirmation extras (`.ics`, directions); treating `/invite/[token]` as a designed public artifact (the only surface seen by people with no account).

**Explicitly deferred / net-new (do not absorb into "polish"):** a search-results map (**no search map exists today** — `react-leaflet` is used only on the single-listing panel; adding one needs a new bbox query parameter, clustering, and its own a11y story — a v1.2+ decision, not v1.1 scope); availability-editor "copy Monday to all" (genuinely new host functionality); the earnings/payouts restructure (host-only, low-traffic, and its numbers have never been real — PayMongo `/v2` is sales-gated); dark mode as a real feature (stays a dormant future theme per D-129); reviews/ratings, messaging — out of scope in PROJECT.md, do not build shells for them.

### Architecture Approach

The whole milestone is one idea, expressed as a three-tier token cascade: **primitives** (`--ramp-*`, raw ramps, named for what they are, never referenced by a component) to **semantic roles** (shadcn's existing vocabulary — `--background`, `--card`, `--brand`, etc. — kept verbatim, plus the handful of roles shadcn has no word for: `--surface-sunken`, `--text-*`, `--shadow-*`) to **utility registration**, a single `@theme inline` block that is names-only and never per-theme. Consumers are the 30 vendored (never hand-edited) shadcn primitives, a new `patterns/` layer of domain-ignorant compositions (`EmptyState`, `PageHeader`, `StatCard`, …, admitted only by a three-question decision rule), and the existing domain component folders, restyled in place. A single generated module (`palette.generated.ts`, produced by `scripts/gen-palette.ts` and checked for drift by a committed test) is the *only* sanctioned place a token value is duplicated as a literal — because there are exactly three places in the app where a CSS variable cannot arrive: the email shell, `global-error.tsx` (Next 16 explicitly does not deliver global styles to it), and the Leaflet SVG marker fill in `listing-map.tsx`.

The second architectural pillar is the **server-shell to slot-props to client-island** pattern already precedented in `reserve-view.tsx`: a Server Component owns the data, the money, and the timezone math, and hands pre-formatted strings and `ReactNode` slots down to client components that own only layout and local UI state. This is what keeps D-130 (no logic moves client-side) enforceable through a milestone whose whole job is touching layout.

### Critical Pitfalls

1. **Restyling can silently break the e2e proof of the double-booking guarantee.** The calendar and refund specs reach through structural CSS selectors (`td:not([data-outside])`, a `<dl>/<dt>/<dd>` sibling walk) with **zero `data-testid` anywhere in `src/`**. A broken locator times out, which reads as flake under `retries: 2`, not as a red guarantee. Prevention: inventory every structural selector before touching any component, migrate to role/semantic queries in the same commit as the restyle, and mutation-verify (make the (N+1)th booking succeed, confirm the migrated spec goes RED) once per phase.
2. **A "make checkout feel live" pass is a price-tamper vector, not a style choice.** `pricing.ts` carries no `server-only` guard and nothing mechanically stops a `"use client"` file from importing it or the non-public `SERVICE_FEE_BPS`; the codebase has already hit this trap twice and left comments about it. Prevention: a written provenance rule (money/availability figures on a booking-path surface originate from a Server Component or server action, never a client derivation) enforced by an AST source-scan gate cloned from the repo's own `tests/use-server-exports.test.ts` pattern.
3. **The token contract can look complete while a leak sits in plain sight, and the wrong sequencing hides it until the end.** The archetypal example is already shipped: `BRAND_CORAL = "#E8484E"` in `listing-map.tsx:22`, a JS string invisible to every class-based lint, which has *already drifted* from the live `--brand` token. Prevention: write the leak-scan test in the same phase that writes the tokens, and build the second theme immediately — not as a late audit — so a leak "screams" (a component that visibly does not move between themes) instead of whispering until fifty leaks surface at once with no schedule left.
4. **The tokens the milestone is built on do not themselves pass the WCAG AA gate D-131 makes hard.** The coral CTA's own label fails at 3.60:1 (need 4.5:1); the focus ring fails even the lower 3:1 non-text bar at ~2.58:1, and catastrophically at ~1.54:1 as actually applied with 50% alpha. Prevention: fix the tokens in the foundation phase, before anything is built on them, with a mechanical `culori`-based contrast test that is theme-parameterized from day one (a theme swap changes every colour but keeps every pairing — nothing guarantees a new theme stays AA-compliant).
5. **Visual-regression baselines are fail-open by construction, and Windows-generated baselines are structurally unusable by CI** — see the dedicated section below. This is significant enough that it gets its own callout rather than a one-line mention here.

---

## The Verified Defect List (consolidated)

Several researchers independently measured concrete defects already shipped in the codebase. This is the single highest-value table for phase planning — every row is a measurement, not a claim, and every one is cheap to fix now and expensive to fix after fifty surfaces are built on top of it.

| # | Defect | File:Line | Measured value | Confirmed by |
|---|---|---|---|---|
| 1 | **`--font-sans` is a self-referential CSS cycle.** Per CSS Custom Properties §3, a cyclic custom property computes to the guaranteed-invalid value. `html { @apply font-sans }` and `.font-heading` therefore fall back to the browser's system font stack. Geist is downloaded on every load and never applied — including every card title (`card.tsx:41`) and dialog title (`dialog.tsx:133`). | `src/app/globals.css:10` (`--font-sans: var(--font-sans)`); blast radius `src/components/ui/card.tsx:41`, `src/components/ui/dialog.tsx:133` | Compiled with `@tailwindcss/cli@4.3.0`: `--font-sans` and `--default-font-family` both resolve invalid; page renders in `ui-sans-serif`/system UI | **3-way:** STACK §2.1 (compiled the real file), ARCHITECTURE Pattern 1 + Build Order, PITFALLS Pitfall 9 |
| 2a | Coral primary CTA fails AA for its own label (`Book this space`, `Confirm & pay`, …). | `globals.css` — `--brand` / `--brand-foreground` | `#ef4445` on `#fafafa` = **3.60:1** (need 4.5:1 normal text) | STACK Verified Defect #2, PITFALLS Pitfall 7 (both compute 3.60) |
| 2b | Status badge (published / payouts-enabled) fails AA. | `--success` / `--success-foreground` | `#03a14a` on `#fafafa` = **3.24:1** (need 4.5:1) | STACK, PITFALLS (both compute 3.24) |
| 2c | **Focus ring fails even the lower 3:1 non-text bar (WCAG 2.2 SC 1.4.11) — the indicator D-131 itself names.** | `--ring` on `--background`, applied as `focus-visible:ring-ring/50` (`button.tsx:8` and every other vendored control) | Token pair: `#a1a1a1` on `#ffffff` = **2.58–2.59:1** (need 3.0:1). **As actually rendered at 50% alpha, composited over white ≈ `#d0d0d0`: 1.54:1** — catastrophic | STACK 2.59, PITFALLS 2.58 (rounding only) — the earlier FEATURES.md estimate of "≈2.3:1" (self-flagged MEDIUM, "needs a contrast-checker confirmation") is superseded by these two independently-computed values |
| 2d | Additional AA failures found by the wider 11-pair audit (not in STACK's headline "4"), used on shipped surfaces (soft-accent tints, badge text). | `--brand` on `--background` (3.76, fails normal-text though passes non-text); `--brand` on `--muted` (3.45, fails); `--success` on `--background` (3.39, fails) | See table below | PITFALLS Pitfall 7 only — see § Disagreements for why this list is wider than STACK's |
| 3 | **`--destructive` is out of sRGB gamut**, so the browser gamut-maps it: renders differently on P3 vs sRGB displays, differently across Chrome versions, and **VRT baselines captured on a P3 laptop will not match an sRGB CI runner — a real diff, not flake.** | `globals.css` — `--destructive: oklch(0.577 0.245 27.325)` | Chroma 0.245 at that lightness/hue exceeds the sRGB gamut boundary (verified by the OKLab to linear-sRGB conversion — any linear channel outside `[0,1]`) | PITFALLS Pitfall 7 (the gamut analysis is unique to this document; STACK's table lists the same pair passing 4.91:1 without flagging the gamut issue) |
| 4 | **`BRAND_CORAL` hex literal has already drifted from the live token — a shipped, ~1.5% mismatch nobody noticed.** The archetypal "leak invisible to every class-based lint." | `src/components/listing/listing-map.tsx:22` (also `:34`, `#fff`) | Hardcoded `#E8484E`; the live `--brand: oklch(0.637 0.208 25)` renders as `#ef4445` | **3-way:** STACK §7 corollary, ARCHITECTURE data-flow diagram + Pattern 7 corollary, PITFALLS Pitfall 6 ("the archetypal leak") — all three independently confirm the same drift |
| 5 | **`ui/sonner.tsx` will silently mis-theme the moment a `ThemeProvider` mounts.** Sonner's `theme` prop accepts only `light\|dark\|system`; the cast `as ToasterProps["theme"]` masks the type error. Passing a named theme (`"coral"`, `"alpine"`, …) straight through produces an unstyled/default-styled toast on every surface that toasts (booker shell). **Today, with no provider mounted, it already silently follows the OS colour scheme** — toasts render dark on a dark-mode OS inside a "light-only" app. | `src/components/ui/sonner.tsx:8` (`const { theme = "system" } = useTheme()`) | Verified against Sonner's type signature and next-themes' fallback-context behaviour | **2-way, identical diagnosis reached independently:** STACK Verified Defect #5, PITFALLS Pitfall 12 |
| 6 | Scaffold residue: browser tab title, every shared link, and the OG fallback on a live marketplace still read as the Next.js starter. `public/` still holds the five starter SVGs and the default favicon. | `src/app/layout.tsx:15-18` | `title: "Create Next App"`, `description: "Generated by create next app"` | **3-way:** FEATURES baseline table, STACK Verified Defect #3, ARCHITECTURE Pattern 1 |
| 7 | `<html>` lacks `suppressHydrationWarning`, required the instant `next-themes` mounts (its script mutates `documentElement` pre-paint). | `src/app/layout.tsx:26` | Absent | STACK Verified Defect #4, ARCHITECTURE Pattern 2 |
| 8 | **An approved v1.0 UI-SPEC contains a false, apparently unverified claim.** `02-UI-SPEC.md:223` asserts the coral CTA "contrast ≈ ≥4.5:1... verify with the declared `--brand-foreground`." The real value is 3.60:1 (row 2a). | `.planning/milestones/v1.0-ui-specs/02-UI-SPEC.md:223` | Claimed ≥4.5:1; measured 3.60:1 | STACK §Verified Defect #2 |
| 9 | **`dark:` residue — 66 occurrences total, but the split matters and one architecture document undercounts it.** See § Disagreements — this is a genuine cross-document conflict, not just a measurement. | `grep -ro "dark:" src/` | **66 total** (FEATURES, PITFALLS agree): **56 across 14 vendored `src/components/ui/*` files** + **10 across 5 app-code files**. ARCHITECTURE's project-structure sketch instead states "delete 26 `dark:` classes across 16 files" in `ui/`. | PITFALLS Pitfall 11 (grep-measured, HIGH) vs ARCHITECTURE structure listing (unreconciled figure) |

Full contrast-pair audit (PITFALLS' wider sweep, the one to treat as authoritative for the P-TOKENS fix task):

| Pair | Rendered | Ratio | Bar | Verdict |
|---|---|---|---|---|
| `--brand` on `--background` | `#ef4445` / `#ffffff` | 3.76 | 4.5 text / 3.0 non-text | fail text, pass non-text |
| `--brand-foreground` on `--brand` | `#fafafa` / `#ef4445` | 3.60 | 4.5 | fail |
| `--brand` on `--muted` | `#ef4445` / `#f5f5f5` | 3.45 | 4.5 | fail |
| `--success-foreground` on `--success` | `#fafafa` / `#03a14a` | 3.24 | 4.5 | fail |
| `--success` on `--background` | `#03a14a` / `#ffffff` | 3.39 | 4.5 | fail |
| `--ring` on `--background` | `#a1a1a1` / `#ffffff` | 2.58 | 3.0 | fail |
| `--ring/50` as used | composited approx `#d0d0d0` | 1.54 | 3.0 | fail (catastrophic) |
| `--border` on `--background` | `#e5e5e5` / `#ffffff` | 1.26 | 3.0 | fail (acceptable as decorative divider only, not as a control's sole boundary) |
| `--destructive` on `--background` | `#e7000b` / `#ffffff` | 4.91 | 4.5 | pass (but out of gamut — row 3 above) |
| `--muted-foreground` on `--background` | `#737373` / `#ffffff` | 4.73 | 4.5 | pass (thin margin) |
| `--foreground` on `--background` | `#0a0a0a` / `#ffffff` | 19.79 | 4.5 | pass |

---

## Where the Researchers Agreed (convergence)

Independent convergence, reached by different methods, is stronger evidence than any single claim — worth stating explicitly rather than folding silently into recommendations:

1. **`@theme inline` is load-bearing, verified three different ways.** STACK compiled a real fixture and the actual `globals.css` with the Tailwind CLI and showed the utility rule carries a `var()` that resolves *at the element*. ARCHITECTURE derived the same conclusion from Tailwind's documented `inline` semantics applied to the shipped file. PITFALLS reasoned it from first principles (dependency-cycle / cascade-resolution semantics) and separately named it Anti-Pattern AP-2 ("dropping `inline` silently kills nested `[data-theme]` theming — the app-wide switcher still appears to work, so the failure is easy to miss"). All three land on the identical operational rule: **`inline` is mandatory, not stylistic**, because it is the entire mechanism behind D-128's side-by-side preview.
2. **The font fix must land before any visual-regression baseline is captured — stated independently by three of the four documents.** STACK: "This alone changes the appearance of every screen, so it must land before any visual-regression baseline is generated." ARCHITECTURE: "This must land before any typographic decision is made, or every type judgement in every later phase is made against the wrong face," restated in the explicit Build Order section. PITFALLS: "this single fix changes the rendered font of every surface in the app, so it must land in P-TOKENS before any baseline is captured," repeated again in the VRT-specific pitfall ("order the work so the churn happens once").
3. **The second theme ships in the SAME phase as the first, not as a late audit — the strongest convergence in the whole research set (4-of-4).** ARCHITECTURE's Build Order states it as a named rule ("the second theme ships here, not later... adding it in a final phase means every surface built in between is unverified, and the 'audit' phase becomes a rewrite phase"). FEATURES' dependency notes: baselines "must be captured per-phase, after that phase's tokens are final... every baseline shot before A1 to A11 land gets rebuilt." PITFALLS Pitfall 6 makes it the headline prescription ("Build theme #2 in the SAME phase as theme #1, before any surface work... not as a feature — as the test"). STACK's whole §1 worked example ships a second theme (`court`/`dusk`) alongside the first for exactly this reason.
4. **Keep shadcn's raw token names as the semantic layer; do not invent a parallel vocabulary.** STACK §1.5, ARCHITECTURE Pattern 1 (and its own named Anti-Pattern AP-1), and PITFALLS' Integration Gotchas table all give the identical reason: the 30 vendored components reference `bg-background`/`text-muted-foreground`/etc. directly (including in inline styles, per STACK's `sonner.tsx` citation), so renaming either forks the vendor or creates two names for one value, and five approved UI-SPECs are already written in that vocabulary.
5. **`data-theme`, never `class`, for theme selection — three-way, same reasoning.** STACK §1.4, ARCHITECTURE Pattern 2, and PITFALLS Pitfall 12 all independently give the same justification: an attribute selector composes with `next-themes`' actual 0.4.6 default and keeps the dormant `.dark`-class-keyed `@custom-variant` from colliding with the new named-theme mechanism.
6. **Client-side computation of money or availability is a trust-boundary violation, not a rendering choice — and two documents independently cite the exact same two existing code comments as the precedent.** ARCHITECTURE's three named "Temptations" (sticky rail, map+list, instant price feedback) and PITFALLS Pitfall 3 both land on the identical rule (a client component may receive money/time as a pre-formatted string, never the inputs to compute one) and both independently cite `availability-calendar.tsx:236-242` and `search-result-card.tsx:131-134` as the codebase's own prior encounters with this exact trap. FEATURES' Anti-Features table reaches the same conclusion from a UX-request angle ("moving math client-side for snappiness").
7. **`BRAND_CORAL` in `listing-map.tsx` is the concrete proof for why a generated palette module is required — three-way, same file, same drifted values.** See defect table row 4.

---

## Where the Researchers Disagreed (flagged plainly, not smoothed over)

1. **The `dark:` class count and strip scope — a genuine, unreconciled conflict, not a rounding difference.** PITFALLS' dedicated, grep-measured audit (Pitfall 11, cross-confirmed by FEATURES' simple 66-total baseline count) finds **56 `dark:` occurrences across 14 vendored `src/components/ui/*` files** plus 10 across 5 app-code files (66 total), and explicitly recommends **against** stripping the vendored 56 — stripping forks 14 shadcn components from upstream permanently, makes every future `npx shadcn add` re-violate the rule, and risks a regex mangling a 500-character `cva` string and changing *light-mode* behaviour by accident. PITFALLS' recommendation is to scope the strip to the 10 app-code occurrences only (rewriting them into tokens — `bg-zinc-50 dark:bg-black` becomes `bg-muted` — not deleting them), leave the vendored classes in place as inert dead code (provably inert: no `ThemeProvider` has ever been mounted, so `.dark` has never had an ancestor at runtime), and **record the scope decision as a deliberate deviation from a literal reading of D-129** at P-TOKENS planning. ARCHITECTURE's project-structure sketch, by contrast, lists `ui/**` as `[MOD] delete 26 dark: classes across 16 files` — a different count (26 vs 56) and a different file count (16 vs 14), with no discussion of the vendor-fork risk. **This is not resolved by this synthesis; it is a decision item — see below.**
2. **Whether a search-results map is being designed as in-scope machinery, or documented as a resisted temptation.** FEATURES (feature G7) and PITFALLS (a full dedicated pitfall, #20) both explicitly and forcefully classify a search map as **net-new capability, not polish** — "There is no map on search today," it needs a new bbox query parameter and its own a11y story, and "if I build this, does a REQUIREMENTS ID change? If yes, it is not polish." ARCHITECTURE's Pattern 6, "Temptation 2 — the map + list split on `/`," instead walks through a detailed "correct alternative" architecture for building one (bbox-driven URL navigation, a projection-only client leaf) with no explicit scope flag in that section. Read charitably, ARCHITECTURE is describing "if this is ever built, here is how to do it safely" rather than asserting it belongs in v1.1 — but a roadmapper skimming only ARCHITECTURE.md could easily conclude a search map is being planned. **Treat FEATURES/PITFALLS' explicit out-of-scope classification as authoritative; ARCHITECTURE's section is a safety pattern for a future decision, not a scope signal.**
3. **The exact corrected `--brand` token value differs between documents.** STACK prescribes `oklch(0.58 0.208 25)` (→ `#da2d34`, 4.56:1 on `#fafafa` — lightness reduced, chroma unchanged from the shipped value). PITFALLS prescribes `oklch(0.58 0.19 25)` (≈ `#d33a3c`, 4.71:1 — both lightness *and* chroma reduced). Both clear AA and preserve hue; the resulting hex and exact ratio differ. Low-stakes since both pass, but a phase plan should cite one source and re-verify with a live contrast tool (both documents self-flag their oklch to sRGB math as re-derivable-but-not-yet-tool-verified) rather than silently averaging the two.
4. **Theme count and naming are not aligned across documents**, though all stay within a compatible range. FEATURES recommends exactly **2** ("one theme proves nothing; three is QA cost with no extra evidence"). PITFALLS treats **3 as a ceiling**, not a target ("cap the theme count at three"). STACK's worked example defaults to **3** (`alpine`/`court`/`dusk`) while framing the exact count as an open question. ARCHITECTURE's worked example uses **2** named themes (`coral`/`slate`) plus a dormant future `dusk`. No document's illustrative theme names should be read as a locked decision.
5. **STACK's headline "four failing pairs" and PITFALLS' independent 11-pair audit do not fully overlap.** STACK's four are: brand/brand-foreground (3.60), success/success-foreground (3.24), muted-foreground-on-muted (4.34), ring/background (2.59). PITFALLS' sweep reproduces three of those almost exactly but **does not measure muted-foreground-on-muted** at all (it measures muted-foreground-on-background instead, 4.73, passing) — and in exchange finds *additional* failing pairs STACK's headline list omits: brand-on-muted (3.45, used for soft-accent tints) and success-on-background (3.39). The "four pairs" framing quoted in PROJECT.md and STACK undercounts the actual defect surface once every pairing actually used in components is audited. **PITFALLS' fuller sweep should be treated as the working list for the P-TOKENS contrast-fix task**, and in any case the mechanical `culori`-based gate both documents recommend building should be the final authority, not either document's hand-picked table.

---

## Decision Items Requiring a Human Call

These are presented as decisions with options and tradeoffs, not buried recommendations — the roadmapper (or a human at P-TOKENS planning) needs to pick one explicitly and record it.

### Decision 1 — Focus-ring colour: brand-tinted vs. neutral-darkened

The only computed fix that clears the `--ring` AA failure by making it equal to the corrected `--brand` (~4.76:1) **directly contradicts an already-approved UI-SPEC line**: `02-UI-SPEC.md:93` states the accent is *not* used for form focus rings, written to protect a deliberate 10%-accent budget.

| Option | Effect | Tradeoff |
|---|---|---|
| **(a) `--ring = --brand`** | Fixes the AA failure at ~4.76:1; the focus ring becomes theme-aware for free (re-skins with every theme); costs one token, already unifies with the brand-contrast fix work | **Contradicts the approved `02-UI-SPEC.md:93` line as written** — must be recorded as a deliberate, cited deviation, not silently applied |
| **(b) Darkened neutral** (e.g. `oklch(0.45 0 0)`, PITFALLS' alternate prescription) | Clears AA independently of the brand hue; respects the existing approved UI-SPEC rule with zero deviation | One more value to carry and re-verify per theme; the focus ring does not get "branded for free" and could look inconsistent with a very different candidate theme's palette |

### Decision 2 — `dark:` strip scope under a literal vs. intent-based reading of D-129

| Option | Effect | Tradeoff |
|---|---|---|
| **(a) Strip all 66** (literal reading — "remove the 66 orphaned `dark:` classes"), including the 56 across 14 vendored `ui/` files | Most literally satisfies D-129's stated language | Permanently forks 14 shadcn components from upstream; every future `npx shadcn add` re-violates the rule; regex-driven strips across long `cva` strings risk silently changing *light-mode* behaviour (already flagged as a real hazard in the exact component `avatar.tsx:20`, where a `dark:` class is a blend-mode compensation, not a colour override) |
| **(b) Strip only the 10 app-code occurrences** (5 files), rewriting into tokens (`bg-zinc-50 dark:bg-black` becomes `bg-muted`), leave the vendored 56 untouched as dormant/inert debt that becomes the free future dark theme D-129 already promises | Achieves D-129's actual intent (no doubled dark-mode QA surface while branding is unlocked) at near-zero cost; the vendored classes are provably inert (mechanically verifiable: zero `.dark` elements exist at runtime today, since no `ThemeProvider` has ever been mounted) | Leaves a literal reading of "remove the 66" unsatisfied — must be recorded as an explicit, cited deviation from D-129's stated language at P-TOKENS planning |

### Decision 3 — Placeholder theme count for the D-128 proof

| Option | Effect | Tradeoff |
|---|---|---|
| **(a) 2 themes** (FEATURES' explicit recommendation) | Cheapest baseline budget; already meets every researcher's stated minimum | Slightly weaker proof surface — a leak that happens to render identically by coincidence in exactly 2 themes is (marginally) more likely to slip through than with 3 |
| **(b) 3 themes** (STACK's worked default; PITFALLS' stated ceiling, not target) | Matches most of the worked examples in the research; a third, deliberately distant data point makes an accidental 2-theme leak-masking coincidence less likely | Linear cost in contrast-test pairs and roughly +9 curated baselines (non-default themes shot at 1280px only, per ARCHITECTURE's budget math) |

---

## Visual-Regression Fail-Open Finding (highest-priority correctness property of the D-131 gate itself)

This is not a normal pitfall — it is a property of Playwright's default configuration that makes the entire GATE-VRT gate **decorative unless three specific settings are made explicitly correct in the very first phase**, verified directly from the installed package source (not vendor docs):

- `node_modules/playwright/lib/index.js:347` — an auto-fixture sets `testInfo.snapshotSuffix = process.platform`. A baseline generated on this Windows dev box is named `...-chromium-win32.png`; Linux CI looks for `...-chromium-linux.png`.
- `node_modules/playwright/types/test.d.ts:1931-1954` — `updateSnapshots` defaults to `'missing'`, verbatim: *"Missing snapshots are created… This is the default."*

**The consequence is structural: a CI run that finds no baseline matching its platform does not fail — it silently writes one and reports green.** The very first CI execution of D-131's visual-regression gate, if pointed at baselines generated on this Windows box (or at no baselines at all), would not catch a single regression on day one; it would simply mint a fresh set of Linux baselines and pass, indistinguishably from a real pass. STACK's own words: *"The gate would be decorative."* PITFALLS independently reaches the same practical conclusion from the UX/maintenance angle (Pitfall 13) — Windows and Linux baselines differ not just in antialiasing but in actual text-wrap layout (DirectWrite vs FreeType have different glyph metrics), so no pixel threshold can reconcile them, and a committed Windows baseline is "worthless anywhere else."

**The complete, three-part fix, on which STACK and PITFALLS converge exactly:**
1. **Pin `@playwright/test` to an exact version, no caret** (`1.60.0`, `--save-exact`), so the Docker image tag can be matched to it precisely — a routine `npm i` on a caret range would otherwise pull new Chromium binaries and invalidate every baseline with no code change.
2. **Generate baselines exclusively inside `mcr.microsoft.com/playwright:v1.60.0-noble`, never on the Windows dev box.** `.gitignore` `*-win32.png` / `*-darwin.png` so a local run can never accidentally become the committed baseline (PITFALLS' explicit addition).
3. **Set `updateSnapshots: process.env.CI ? "none" : "missing"`** in `playwright.config.ts`, so a missing baseline in CI fails loudly instead of writing-and-passing.

This must be configured correctly in the foundation phase (P-TOKENS / ARCHITECTURE's phase A to B), because every subsequent phase inherits whatever VR config exists at that point, and a gate that has silently never failed is worse than no gate — it trains reviewers to trust a rubber stamp.

---

## Implications for Roadmap

### Recommended Build Order (reconciled)

ARCHITECTURE.md is the only document with an explicit, dependency-justified phase order; STACK.md does not propose a phase order but its ordering-sensitive claims (font-fix-before-baseline, second-theme-before-audit) are folded in below and independently corroborate it. FEATURES.md's component-level dependency graph (A1 to A2..A9 to B1/B2 to B3..B7 to C/E/F) maps cleanly onto the same phases. PITFALLS.md's topic-shaped phase IDs (P-TOKENS, P-BOOKER, P-HOST, P-AUTH, P-CROP, GATE-*) are folded in as the specific gates each phase must carry. Where FEATURES and PITFALLS explicitly reinforce ARCHITECTURE's sequencing (booker-first, in particular), that convergence is noted.

**Phase 1 — Foundation (token contract + theme runtime + second theme + scaffold residue).**
*Depends on nothing; everything else depends on it.*
Every later phase writes class names that reference tokens — tokens authored later means a sweep is owed (FEATURES: "A1 before everything… it changes the typeface of every screenshot"). The second theme ships **here**, not in a later phase, because it is D-128's enforcement test, not a feature (4-way convergence, above). The `--font-sans` fix must be here because every typographic judgement made before it is made against the wrong face, and it invalidates any baseline captured before it lands (3-way convergence, above). The 66 `dark:` classes, scaffold metadata, `suppressHydrationWarning`, the AA-failing token corrections, the `--ring` decision (Decision 1), the `dark:`-strip-scope decision (Decision 2), the `ThemeProvider` mount + the Sonner theme-mapping fix (defect #5), and the `palette.generated.ts` generator (needed by the email phase later) all land here. Includes the leak-scan test and the theme-parameterized contrast test.

**Phase 2 — Quality-gate machinery (patterns layer + app-shell states + VRT config).**
*Depends on Phase 1 — baselines shot before tokens are final are all invalid.*
D-131 gates every phase; if this machinery lands after the first surface phase, that phase invents its own empty/error/skeleton conventions and the next phase either copies or redoes them (ARCHITECTURE's stated rationale — "the single highest-leverage ordering decision in the milestone"). This is also where GATE-NOREG's prerequisites belong: the `SELECTOR-CONTRACT.md` structural-selector inventory (Pitfall 1) and the AST client/server-boundary test (Pitfall 3) must exist **before P-BOOKER starts** (PITFALLS, explicit). The Playwright Docker-pinning and `updateSnapshots` fix (see the fail-open section above) also belongs here, first — not discovered mid-milestone. `loading.tsx`/`error.tsx`/`not-found.tsx` scaffolding and the `<Suspense>` fix in both group layouts (`(app)`, `(host)`) land here, matching FEATURES' own dependency note ("B1/B2 before per-surface polish… so each surface phase ships its four states as part of the surface").

**Phase 3 — Booker core** (`/`, `/listings/[id]`, `/listings/[id]/book`, `/bookings/**`).
*Parallel-eligible with Phases 4 to 6 once 1 to 2 exist, but sequenced first among them.*
This is where ARCHITECTURE explicitly recommends starting the parallel set — it holds all three D-130 restructure permissions (search results, listing detail, checkout), is the highest-risk surface (every money and availability seam runs through it), and is where the `patterns/` inventory gets its real stress test. This ordering is independently reinforced, not merely asserted once: FEATURES' priority matrix stacks booker items overwhelmingly into P1, and PITFALLS' scope-creep guardrail (Pitfall 19) explicitly names "order the phases booker-first" as the discipline that prevents host-surface gold-plating — the same demand-side-first bias PROJECT.md held for all nine v1.0 phases.

**Phases 4 to 6 — Host tooling, Auth & profile, Group/open-capacity surfaces** (`(host)/host/**` incl. wizard and availability editor; `(auth)/**` + `/profile`; `/invite/[token]`, `/bookings/[id]/group`, the drop-in picker).
*Genuinely parallel with each other and with Phase 3 — disjoint file trees, sharing only `ui/`, `patterns/`, and the tokens.* Contention risk: all of these import from `patterns/`, so the first one needing a new pattern adds it and others may conflict on that directory — mitigated by seeding the full pattern inventory as thin, prop-complete stubs in Phase 2 rather than growing it ad hoc.

**Phase 7 — Email shell** (`src/lib/email/**`).
*Depends on Phase 1 only* (consumes `palette.generated.ts`); genuinely parallel with everything else from the moment Phase 1 lands.

**Phase 8 — Image crop/framing UI** (backlog 999.2, already promoted into v1.1 scope).
*Depends on Phase 2's `patterns/responsive-dialog.tsx`; touches `photo-uploader.tsx` (host) and `profile-form.tsx` (profile), so it collides with — and should be sequenced into or immediately after — Phases 4 to 5, not run fully parallel with them.*

**Phase 9 — Cross-cutting audit (must come last, definitionally).**
Full second-theme sweep across every surface, full baseline generation, the 320px + keyboard + AA pass, and the leak tests turned from advisory into blocking. Its size is a direct function of how well Phases 1 to 2 were done.

```
1 (tokens/themes/2nd-theme/scaffold)
   -> 2 (patterns + gates + VRT config + NOREG prerequisites)
          -> 3 (booker core)      parallel set, sequenced first
          -> 4 (host)      -> 8   parallel
          -> 5 (auth)             parallel
          -> 6 (group/open)       parallel
          -> 7 (email)            parallel
                                    -> 9 (audit + full baselines)
```

### Scope-Boundary Items (proposed out of scope — do not absorb silently)

Both FEATURES and PITFALLS independently and forcefully classify these as **net-new capability, not polish** — they need their own requirement IDs if pursued, not a ride-along inside a surface phase:

- **A search-results map** (FEATURES' G7, PITFALLS' Pitfall 20). No map exists on search today; `react-leaflet` is used only by the single-listing panel. Needs a new bbox query parameter the two-stage PostGIS search doesn't take today, clustering, marker-card sync, its own loading/empty states, and its own a11y story (Leaflet's `z-index: 1000` vs. shadcn's `z-50` overlay is already a latent stacking bug waiting for this feature to surface it). ARCHITECTURE's Pattern 6 "Temptation 2" documents how to build this *safely if it is ever pursued* — that section should not be read as a scope signal (see § Disagreements).
- **Availability editor "copy Monday to all weekdays."** Genuine new host functionality, not a visual change.
- Additional risks flagged by PITFALLS' generic net-new test ("if I build this, does a REQUIREMENTS ID change?"): a filter drawer with new filters, saved searches, a favourites/heart control, listing comparison, an earnings chart. None of these are currently proposed as features, but the roadmapper should apply the same test if any surface proposes them.

Also note: v1.1 should ship **zero schema migrations** — a proposed migration inside a phase plan is itself a scope-creep warning sign per PITFALLS.

### Research Flags

**Needs deeper research / human verification during planning or execution:**
- **Email shell real-client rendering (Phase 7 / P-AUTH).** All four researchers agree the mechanics (hex-only, table layout, byte budget) are settled, but PITFALLS is explicit that "the phase is not done until one of each send has been opened in real Gmail (web + Android), real Outlook desktop, and Apple Mail — at least one in dark mode" — this is human-UAT territory, not further desk research.
- **Image crop/framing (Phase 8 / P-CROP) real-device behaviour.** Canvas memory limits (Safari's 16,777,216 px cap), EXIF-orientation mismatches, and mobile drag/pinch ergonomics are documented risks but explicitly require real-device verification ("Chrome DevTools touch emulation does not reproduce iOS Safari's gesture handling" — PITFALLS Pitfall 18).
- **The exact corrected contrast values (Decision 1, and the `--brand`/`--success` corrections).** Both STACK and PITFALLS self-flag their oklch to sRGB math as "re-derivable but not yet tool-verified" and recommend re-checking with a live contrast tool during the foundation phase before locking the values.
- **The `dark:` count/scope conflict (Decision 2).** A fresh `grep -ro "dark:" src/` at phase-plan time will resolve which figure (26/16 or 56/14) is current, but the *scope decision itself* (strip all vs. strip app-code-only) is a human call regardless of the count.

**Standard, well-documented patterns (no further research needed):**
- The `@theme inline` mechanism itself — verified by compiling the real shipped CSS with the Tailwind CLI; HIGH confidence, mechanically re-derivable.
- Visual-regression config (Playwright native `toHaveScreenshot`, Docker-pinned generation) — HIGH confidence, verified against installed package source.
- The avatar cropper library choice (`react-easy-crop`) — HIGH confidence, verified from the published tarball.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Central claims verified by compiling the real `globals.css` with the Tailwind CLI, reading installed package source (`next-themes`, `playwright`), and computing every contrast value with `culori` against the shipped tokens. MEDIUM on email-client support data (caniemail — one referenced page last updated 2023-03) and VR-tool pricing (vendor blogs, verify before purchase). |
| Features | HIGH on the codebase baseline (read directly, not assumed) and marketplace conventions (multiple corroborating sources plus the three archived, approved UI-SPECs). MEDIUM specifically on FEATURES.md's own focus-ring contrast estimate (~2.3:1, self-flagged as computed-not-instrumented) — superseded within this synthesis by STACK's and PITFALLS' independently-computed 2.58 to 2.59:1. |
| Architecture | HIGH for token/theme mechanics, App Router boundary semantics, container queries, and email-client CSS support (verified against current official docs plus direct codebase inspection). MEDIUM for the ~88-image VR baseline-budget recommendation (a reasoned judgement call, not a documented standard — ARCHITECTURE says so itself) and for the `dark:`-count figure in its project-structure sketch, which is **unreconciled against PITFALLS' grep-measured figure** (see Disagreement 1 / Decision 2) and should not be treated as authoritative without a fresh count. |
| Pitfalls | HIGH for everything measured directly in the repo — every `file:line` claim is stated as independently re-derivable by re-running the cited grep or read — and for Tailwind v4 semantics (official docs). MEDIUM for email-client behaviour and Playwright cross-OS baseline claims (vendor docs + community consensus, not first-party spec). MEDIUM, self-flagged, for the exact corrected contrast digits pending re-verification with a colour library during the foundation phase. |

**Overall confidence: HIGH.** Three of four researchers independently verified the same core mechanism (`@theme inline`) and largely the same defect set through three different methods — CSS compilation, source reading, and computation — which is materially stronger evidence than any single claim in isolation. The genuine open items are **human decisions** (the focus-ring/UI-SPEC conflict, the `dark:`-strip scope, the theme count) rather than research gaps requiring more investigation.

### Gaps to Address

- **The `dark:` count/scope discrepancy (26/16 vs. 56/14 files)** must be resolved with a fresh `grep -ro "dark:" src/` at P-TOKENS planning time, and the strip-scope choice (Decision 2) recorded explicitly regardless of which count is current.
- **The `--ring` vs. `02-UI-SPEC.md:93` conflict (Decision 1)** must be resolved and recorded before the foundation phase is considered complete — it is a contradiction between a shipped, approved design contract and the only computed AA-passing fix that keeps the ring theme-aware.
- **The full contrast-pair list is not fully reconciled between STACK's headline four and PITFALLS' fuller eleven** — the mechanical `culori`-based Vitest gate both documents independently recommend building should be treated as the actual source of truth once it exists, superseding either document's hand-picked table.
- **The exact corrected `--brand` value (STACK's `#da2d34` vs. PITFALLS' `#d33a3c`)** needs a single source-of-truth decision and a live-tool re-verification, not an average of the two.
- **Theme count and naming** are explicitly left open by PROJECT.md's own Key Decisions table ("whether an additional lint/test gate is added is a phase-planning call") and by three of the four research documents — this is a phase-planning decision, not a research gap.

---

## Sources

### Primary — verified by direct execution or inspection against this repository (HIGH)
- Compiled `src/app/globals.css` and synthetic fixtures with `@tailwindcss/cli@4.3.0` — the `@theme inline` mechanism, the `--font-sans` cycle, `--text-*` modifier survival.
- `node_modules/next-themes/dist/index.mjs` + `.d.ts` (0.4.6), `node_modules/playwright/lib/index.js:347`, `node_modules/playwright/types/test.d.ts:1931-1954`, `node_modules/playwright/lib/worker/workerProcessEntry.js:2658` — provider/script behaviour, snapshot-suffix and `updateSnapshots` defaults.
- Unpacked `react-easy-crop@6.2.3` tarball; `culori@4.0.2` `wcagContrast()` run against every shipped token pair; `axe-core@4.13.0` rule inventory.
- Direct repo reads: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/sonner.tsx`, `src/components/listing/listing-map.tsx`, `src/lib/booking/pricing.ts`, `src/lib/email.ts`, `src/components/booking/{hold-countdown,reserve-view,reserve-actions}.tsx`, `e2e/*.spec.ts` selector census (92 `getByRole`, 63 `getByText`, 30 `getByLabel`, 22 structural `locator`, 0 `data-testid`), `grep -ro "dark:" src/`, route census (27 routes, 2 `loading.tsx`, 0 `error.tsx`, 0 `not-found.tsx`).
- `.planning/PROJECT.md` — D-127 to D-131, milestone scope, demand-side-first bias.
- `.planning/milestones/v1.0-ui-specs/{02,04,07,09}-UI-SPEC.md` — the locked design-system vocabulary, the false coral-contrast claim (`02-UI-SPEC.md:223`), the accent-not-for-focus-rings rule (`02-UI-SPEC.md:93`).

### Secondary — official current documentation (HIGH)
- tailwindcss.com/docs/theme, /docs/upgrade-guide, /docs/functions-and-directives — `@theme` vs `@theme inline` vs `@theme static`, v3 to v4 breaking-change table.
- nextjs.org (v16.3.0 docs) — `loading.js`/`error.js` boundary scope, `retry` vs `unstable_retry` version history, `global-error` not receiving global styles.
- playwright.dev/docs/test-snapshots — snapshot naming, `stylePath`/`mask`, the cross-environment consistency warning.
- ui.shadcn.com/docs/theming — the token convention this milestone's semantic layer is built on.
- github.com/pacocoursey/next-themes README — `themes` prop, `attribute`, pre-paint injection.

### Tertiary — MEDIUM confidence (vendor/community consensus, or a documented judgement call)
- caniemail.com (CSS variables, modern colour functions, `prefers-color-scheme`, `<style>` support) — one page dated 2023-03.
- VR-tool pricing (Chromatic, Percy) and Lost Pixel's archival status — vendor blogs and 2026 comparison round-ups.
- Safari canvas-memory limits (pqina.nl, Apple Developer Forums) — practitioner-documented, not first-party spec.
- The ~88-image VR baseline budget and the `patterns/` initial inventory — ARCHITECTURE's own stated judgement calls, not documented standards.

---
*Research completed: 2026-08-11*
*Ready for roadmap: yes — with three decisions (focus-ring colour, `dark:`-strip scope, theme count) flagged for explicit resolution at or before P-TOKENS planning.*
