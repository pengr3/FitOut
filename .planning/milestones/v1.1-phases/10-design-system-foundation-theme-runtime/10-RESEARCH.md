# Phase 10: Design-System Foundation & Theme Runtime - Research

**Researched:** 2026-08-11
**Domain:** Tailwind CSS v4 token architecture, runtime multi-theme via `[data-theme]`, WCAG AA colour derivation, static build gates (ESLint 9 flat config + Vitest 4)
**Confidence:** HIGH — every mechanical claim below was verified by compiling this repo's real `globals.css` with the installed `@tailwindcss/postcss@4.3.0`, by reading the installed `next-themes@0.4.6` source, by running the installed ESLint 9 against a fixture, and by an independently-implemented OKLab→sRGB + WCAG contrast solver that reproduces PITFALLS.md's 11-pair audit to two decimal places.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Theme #2 — identity and reach**

- **D-01:** Theme #2 travels on **colour, shape AND type** — a different hue family *and* a different radius, type scale and density. Rationale: `grove` is D-128's enforcement test, and a colour-only second theme gives DS-02 (type scale) and DS-03 (elevation) no enforcement surface at all — they would rest on the leak lint alone.
- **D-02:** Theme #2's character is **deep & generous** — forest/teal accent, radius `10px → 20px`, larger display type, pronounced elevation. Hue travels the widest gap available from coral (red → green), and radius/scale move *up* rather than down, so a value hardcoded near today's geometry cannot hide.
- **D-03:** **Both themes are light-background.** A dark-background theme would re-introduce exactly the doubled visual-QA surface D-129 removed. The dormant `.dark` block stays dormant.
- **D-04:** The themes are named **`court`** (the coral direction) and **`grove`** (the forest one). Venue metaphors, deliberately **hue-independent** — D-127 expects the placeholder tint to change, and a name like `coral` would either lie after a re-tint or force a `data-theme` rename across tests, baseline filenames and the generated token module.
- **D-05:** **Colour, type, radius and elevation are per-theme; the spacing grid and motion tokens are global.** Motion is a budget, not a brand expression — DS-04 caps it at 320ms with a reduced-motion reset, and making it themeable invites a theme to blow the cap. A constant spacing grid also keeps layouts from reflowing between themes, so a two-theme visual diff stays interpretable.

**Theme runtime and switching**

- **D-06:** **No runtime theme switcher ships to users.** The app always renders `court`. Theme switching is a development/preview affordance only. These are placeholder brand directions being compared (D-127), not a user preference — a booker choosing a brand palette is a confusing product, not a feature.
- **D-07:** The theme is applied via a **mounted `next-themes` `ThemeProvider` at the root with a fixed default**, not a static `data-theme` attribute — one mechanism shared between the app and the preview page. **Consequence: DS-14's `suppressHydrationWarning` on `<html>` is genuinely load-bearing, not belt-and-braces**, because next-themes' script mutates `documentElement` pre-paint.
- **D-08:** Two override paths, one per consumer:
  - **Tests:** Playwright seeds next-themes' storage key via `addInitScript` before navigation. No app surface, nothing to gate, works on every route. **This is the seam Phase 11's theme-swap smoke and Phase 17's two-theme axe pass both depend on** — it must exist and be documented here.
  - **Humans:** a `?theme=` query param honoured **only outside production**, so a reviewer can walk a real checkout flow in `grove` rather than only seeing the preview page.
- **D-09 (Claude's discretion — user delegated):** THEME-04's side-by-side preview lives at a **single `/dev/theme` route** with a one-line `notFound()` guard when `NODE_ENV === "production"`. Not a `(dev)` route group — that is scaffolding for dev surfaces that do not exist. Rationale the user supplied: FitOut is not live, and branding will be locked before it is, so the preview is a temporary tool and production-gating is cheap insurance rather than a design constraint.
- **D-10 (Claude's discretion — user delegated):** The preview page renders **real components fed by static fixture props**, typed against the components via `ComponentProps<typeof X>` so fixture drift is a compile error rather than a silent lie. **Not seeded DB data** — Phase 11 and Phase 17 will screenshot this page, and the local UAT seed is not a committed fixture, so a DB-backed preview would break or render empty on a fresh clone and in CI. (Roadmap SC#3 already settles that it shows **real screens, not swatches** — that was not re-litigated.)

**Contrast corrections — how far AA may move the palette**

- **D-11:** The 3.60:1 coral CTA failure is fixed by **darkening `--brand` itself**, not by introducing a second brand token and not by darkening the label. One value changes and every surface follows; there is no per-call-site judgement about which coral to use — a judgement the leak lint could not make. **The accent will visibly deepen everywhere. That is accepted.**
- **D-12:** The exact corrected value is **derived, not picked**: the `culori` test solves for the **lightest** coral at hue 25 that clears 4.5:1 against `--brand-foreground`. This retains the maximum brand brightness AA permits, re-derives if the bar or the foreground ever moves, and settles `--success` and `--destructive` by the same rule instead of three separate hand-picks. **This closes the milestone's one genuinely open value.** Neither STACK's `#da2d34` nor PITFALLS' `#d33a3c` is adopted, and they are explicitly **not** averaged — both documents self-flag their oklch→sRGB math as not tool-verified, and the roadmap already names the `culori` test as the authority.
- **D-13:** DS-06's "every pair actually used on a surface" is resolved as a **declared inventory of legal foreground/background pairings, plus a companion drift check that fails when a component uses a pairing absent from the list.** The inventory stays readable and reviewable; the drift check is what stops it going stale — which is the only real objection to a hand-maintained list, and it is exactly the gap that let PITFALLS find failing pairs (brand-on-muted 3.45, success-on-background 3.39) that STACK's headline four missed. Every pair must clear the bar **in both themes**.
- **D-14:** **Green retreats to the icon.** Status text is ink on a neutral tint (comfortably past 4.5:1); the hue lives in the icon/dot, which only has to clear the 3:1 non-text bar — so `--success` barely has to move. This implements DS-10's "icon + text, never colour-only" directly, rather than darkening a filled green badge, which is the colour-carries-meaning pattern DS-10 pushes back on.

**The leak gate**

- **D-15:** **DS-13's ban is widened beyond its literal wording** to include raw Tailwind palette classes (`bg-zinc-50`, `text-emerald-800`, `bg-black`, `bg-white`, …) alongside hex, `rgb(`, `oklch(` and arbitrary `text-[NNpx]`. **Recorded as a deliberate, cited expansion of DS-13.** Reason: a palette class is the most common way a colour actually leaks in this codebase, and a theme swap leaves it frozen — without this, THEME-05 fixes the 5 known files and nothing stops a 6th being added next week, quietly making the `grove` proof a lie. Measured cost: **20 occurrences across 6 files.**
- **D-16:** Enforced by **both ESLint and Vitest, off one shared exported pattern list.** ESLint gives a squiggle at the moment of typing and fails `next build`; the Vitest test is the authoritative gate and lives alongside DS-06's contrast test and DS-12's drift check. One source of truth, two consumers, no drift between them.
- **D-17:** The gate **scans `src/components/ui/**` too — no vendored exemption.** Measured: the 30 vendored primitives contain **0 raw hex and exactly 1 `bg-black`**, so they are already essentially token-pure and this costs one fix. **This is deliberately a different call from D-129's `dark:` reasoning, and the difference is quantitative:** D-129 exempted 56 occurrences across 14 files because stripping them would permanently fork shadcn; here the exposure is 1-in-30, so the vendor-fork risk from a future `npx shadcn add` does not outweigh leaving the files where every card, dialog and button is defined invisible to the gate.
- **D-18:** DS-12's generated token module is **committed to the repo, with a CI check that regenerates it and fails on any diff.** Readable in review, works on a fresh clone with no build step, and the regen-diff check is the guard. Not build-time-generated-and-gitignored (breaks fresh-clone editor navigation and test import ordering), and emphatically not hand-written-plus-an-equality-test — that is close to what already existed when `BRAND_CORAL = "#E8484E"` drifted from the live `#ef4445` unnoticed.

**Identity, type and control tokens**

- **D-19:** The favicon is a **themed letterform SVG** — an "F" in Geist on the theme's brand colour, read from the token contract. No asset is commissioned (D-127 holds), it re-skins with the theme so it is one more thing the `grove` swap proves, and Phase 11's SHELL-04 share image extends the same idea rather than inventing one. **The OG/share image itself stays in Phase 11.**
- **D-20:** Headings use **one family differentiated by weight and tracking**. `--font-heading` remains an alias to `--font-sans` (both Geist), and the heading steps of the type scale carry their own **per-theme** weight and tracking tokens — `court` tight semibold, `grove` looser and heavier. No second font download, and D-127 stays clean: no typeface has been chosen, even provisionally. The `--font-heading` token is **kept** (not dropped) so real branding later has a seam to slot a display face into.
- **D-21:** An un-varianted `<Button>` **stays neutral** (`--primary`, near-black); booker CTAs opt in with `variant="brand"`. Matches the roadmap's stated hierarchy (brand → default → outline → ghost → link) and protects `02-UI-SPEC.md`'s deliberate 10%-accent budget — coral appears only where someone asked for it. All 29 literal recipes are edited to the explicit variant.
- **D-22:** DS-09's 44px is an **explicit `size="touch"` CVA size, opted into per call site** — not a responsive default. Readable in the code, and it never silently changes a dense host table's mobile rendering. **Consequence to carry forward: this makes Phase 17's a11y audit the mechanism that catches misses**, since nothing enforces it automatically.

### Claude's Discretion

The user explicitly delegated **D-09** and **D-10** (preview page location, gating, and data source), with the stated reason that FitOut is not live yet and branding will be locked before launch — so the preview is a temporary tool and should not attract structure. Both decisions are recorded above with their rationale; the planner may adjust the mechanics but not the intent (single route, cheap production guard, deterministic fixture data).

### Deferred Ideas (OUT OF SCOPE)

- **A user-facing theme switcher** — considered and rejected for v1.1 (D-06). If real branding later ships more than one direction as a genuine product feature, it needs its own requirement, a11y story and 320px layout. Not a Phase 10 item and not a v1.1 item.
- **A per-theme heading typeface** (`grove` loading a genuinely different Google face) — the strongest possible proof that `--font-heading` is token-driven, but rejected because D-127 says v1.1 makes no typeface choice, even provisionally. The `--font-heading` seam is kept (D-20) so this is cheap to revisit when real branding lands.
- **`brand-soft` — a second accented button level** for surfaces with more than one accented control. Deliberately not decided before Phase 12 shows which surfaces actually need it. Revisit at Phase 12 if checkout or the listing rail demands it.
- **A responsive-default touch size** (44px below the tablet breakpoint automatically) — rejected in favour of the explicit `size="touch"` (D-22) because it would change every existing button's mobile rendering at once, including dense host tables. If Phase 17's audit finds many missed call sites, this is the documented alternative.
- **DS-03's elevation collapse direction** (which of today's five shadow values round up vs down into the three named steps) — surfaced and consciously left to the planner as mechanical, given the three-step scale and per-theme elevation are both locked.

**Also out of this phase (CONTEXT.md § Phase Boundary):** Playwright's fail-open VR config fix (GATE-01) → Phase 11 · the token-driven OG/share image (SHELL-04) → Phase 11 · the three named card patterns (DS-11) → Phase 11 · loading/error/empty state families (STATE-\*) → Phase 11 · any per-surface polish, header, or footer → Phases 11–15.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DS-01** | `--font-sans` cycle fixed; Geist actually applied | § Verified Defects #1 — cycle reproduced by compiling the real file; the one-line fix compiled and verified to emit `.font-sans { font-family: var(--font-geist-sans) }` |
| **DS-02** | Type scale as tokens; no arbitrary `text-[NNpx]` | § Pattern 3 — `@theme inline --text-*` verified to carry per-theme size/line-height/weight/tracking; § Measured Inventory — the exact 14 sites; § Pitfall 6 — Tailwind's *default* `--text-*` are already redefinable per theme, so this is NOT a 399-site migration |
| **DS-03** | 3-step elevation + 4-step z-index; every shadow maps | § Pitfall 7 — verified that Tailwind's default `--shadow-*` are **literal, not var-referencing**, so named steps are mandatory not stylistic; § Measured Inventory — 14 shadow sites, 23 z sites |
| **DS-04** | Motion tokens (fast/base/slow, ≤320ms) + reduced-motion reset | § Pattern 5 — `--default-transition-duration`/`--default-transition-timing-function` verified as the zero-edit global lever; `tw-animate-css` verified to honour `--tw-duration`/`--tw-ease`; § Pitfall 8 — the `duration-*` namespace does **not** exist in v4 |
| **DS-05** | One focus-visible recipe, darkened neutral ring ≥3:1 vs background AND card | § Computed Palette — `oklch(0.45 0 0)` = 7.46:1 solid; **§ Landmine L5 — the `/50` recipe cannot be fixed by token value at any lightness**; § Measured Inventory — 13 `ring-ring/50` sites |
| **DS-06** | Every used pair meets AA, automated test | § Computed Palette — full 24-pair inventory verified in both themes with an independently-implemented solver; § Pattern 9 — the drift-check design |
| **DS-07** | `--destructive` inside sRGB gamut | § Computed Palette — shipped value confirmed out of gamut (max in-gamut chroma at that L/H is **0.2350**); derived replacement supplied |
| **DS-08** | Coral accent is a CVA `brand` variant, not a repeated string | § Measured Inventory — 29 distinct `bg-brand` lines, of which **exactly 20 are `<Button>`** and 9 are chips/dots/day-buttons that must stay token classes |
| **DS-09** | `touch` (44px) named CVA size | § Code Examples — the CVA size entry; existing sizes are h-6/7/8/9 so `touch` is a genuinely new step |
| **DS-10** | Closed status vocabulary, icon + text, never colour-only | § Computed Palette — D-14's "green retreats to the icon" verified: shipped `--success` passes the 3:1 icon bar unchanged, and every darkening candidate at the shipped chroma is **out of gamut** |
| **DS-12** | Generated TS token module with hex fallbacks | § Pattern 8; **§ Landmine L3 — two of the three named consumers do not exist yet** |
| **DS-13** | Leak test fails the build | § Pattern 7 — inline ESLint 9 flat-config plugin verified working against a fixture; **§ Landmine L1 — `next build` does not run ESLint on Next 16** |
| **DS-14** | Scaffold residue gone; `suppressHydrationWarning` | § Measured Inventory — `src/app/favicon.ico` and 5 unreferenced `public/*.svg` confirmed present and unreferenced |
| **THEME-01** | Provider mounted on `data-theme`; toast maps themes correctly | § Pattern 2 — `next-themes@0.4.6` source read directly: `attribute` **already defaults to `"data-theme"`**, `storageKey` defaults to `"theme"`, `enableColorScheme` provably safe for non-light/dark names |
| **THEME-02** | Two themes, zero component edits to re-skin | § Computed Palette — both theme token blocks derived and verified; § Pattern 1 — the cascade proof |
| **THEME-03** | Second theme ships in the same phase | Ordering invariant; § Wave Plan puts `grove` before the leak-gate turn-on |
| **THEME-04** | Nested `[data-theme]` subtree renders in its own theme | § Pattern 1 — **verified by compilation**: every `@theme inline` utility emits `var(--underlying)`, which resolves at the element |
| **THEME-05** | 10 app-code `dark:` rewritten; 56 vendored untouched | § Measured Inventory — grep-confirmed exactly 10 across 5 files / 56 across 14 files |
</phase_requirements>

---

## Summary

This phase is mechanically well-understood and unusually low-risk *provided* five specific facts about the live stack are respected — four of which contradict something written in CONTEXT.md or the upstream research, and one of which (the focus ring) makes a locked decision insufficient on its own.

**The good news, verified by compiling this repo's actual `globals.css` with the installed Tailwind 4.3.0:** `@theme inline` does exactly what THEME-04 needs. Every utility it generates carries `var(--underlying-token)` rather than `var(--color-namespace-token)`, so the value resolves *at the element*, which is precisely what makes a nested `[data-theme="grove"]` subtree re-skin. That holds for colour, for radius (including all seven `calc()`-derived steps from one `--radius`), for the type scale (font-size **and** line-height **and** weight **and** tracking), for shadows and for easing. The `--font-sans` cycle is real and reproduces in the compiled output (`--font-sans: var(--font-sans);`), and the one-line fix (`var(--font-geist-sans)`) was compiled and confirmed. Separately — and this materially shrinks DS-02 — Tailwind's *built-in* `--text-*`, `--leading-*`, `--font-weight-*`, `--tracking-*`, `--radius-*` and `--spacing` variables are all var-referencing in their generated utilities, so `[data-theme="grove"] { --text-sm: … }` re-skins all 265 `text-sm` call sites with zero component edits. DS-02 is a token-authoring job plus a 14-site cleanup, not a 400-site migration.

**The bad news is concentrated in the build gate and the focus ring.** Next.js 16 removed `next lint` *and* stopped running ESLint during `next build` — so D-16's "ESLint … fails `next build`" is simply not true on this stack until `package.json`'s `build` script is changed. There is also no CI in this repository at all (`.github/workflows` does not exist), so D-18's "CI check" and the roadmap's "fails the build" have exactly one place they can live: the `build` and `test` npm scripts. And the focus ring cannot be fixed by changing `--ring`: an independently-implemented WCAG solver shows that at `focus-visible:ring-ring/50`, even a near-black `oklch(0.45 0 0)` ring composites to 2.32:1 against white — you would need `oklch(0.28 0 0)` to scrape 3.03:1, which still fails on `--muted`. The 13 `ring-ring/50` occurrences must lose the `/50`.

**On the one genuinely open value, the math converges on STACK.** Solving for the lightest coral at hue 25 and the shipped chroma 0.208 that clears 4.5:1 against `--brand-foreground` gives `oklch(0.5832 …)` → `#db2e35` at 4.52:1 — a 0.02 margin, too thin to survive any rounding change. Re-solving with a 0.05 safety margin (bar 4.55) gives **`oklch(0.58 0.208 25)` → `#da2d34` at 4.57:1 — exactly STACK's prescribed value**. So D-12's rule, executed properly, lands on STACK's number for a reason rather than by adoption. PITFALLS' `#d33a3c` also passes but is not the lightest passer. The solver reproduces every ratio in PITFALLS' 11-pair audit to two decimals, which is strong evidence the method is right.

**Primary recommendation:** Author `court` and `grove` as unlayered `[data-theme]` blocks *after* `:root`, keep `@theme inline` and extend it (never replace it), fix the font cycle first, derive every colour by running the solver rather than pasting a hex, drop `/50` from all 13 focus-ring recipes, and wire the gate into `"build": "npm run lint && npm run test:design && next build"` because there is no CI to put it in.

---

## Landmines: where CONTEXT.md, the requirements, or the research disagree with the live codebase

Each row was measured or executed in this session. The planner must resolve each one explicitly.

| # | Claim on record | What the codebase says | Impact |
|---|---|---|---|
| **L1** | D-16: "ESLint … fails `next build`" | **Next 16 removed `next lint` and no longer runs ESLint during `next build`.** `node_modules/next/dist/build/` contains no lint module; `next lint` is absent from `dist/cli/`. `package.json` has `"build": "next build"` and `"lint": "eslint"`. | DS-13's "fails the build" is unmet until `build` becomes `npm run lint && … && next build`. **Blocking for SC#5.** |
| **L2** | D-18: "a CI check that regenerates it and fails on any diff" | **There is no CI.** `.github/workflows` does not exist; there is no `.gitlab-ci.yml`, no CI config of any kind. | The regen-diff check has nowhere to live except an npm script wired into `build`/`test`. Do not plan a workflow file as if one exists to amend; if one is created, that is net-new scope to name. |
| **L3** | CONTEXT § Integration points: "`src/app/global-error.tsx` and `src/lib/email.ts` are the other non-CSS consumers of the generated module" | **`src/app/global-error.tsx` does not exist** (global error page is STATE-02 → Phase 11). **`src/lib/email.ts` contains zero hex literals** (grep-confirmed). | DS-12's module has exactly **one** consumer in this phase: `listing-map.tsx` (2 hex). Plan its shape for the Phase-11/15 consumers, but do not plan tasks to edit files that do not exist. |
| **L4** | D-17: scanning `src/components/ui/**` "costs one fix" (`bg-black`) | The vendored fork surface in this phase is much larger: DS-05 requires editing **13 `focus-visible:ring-ring/50`** occurrences, 11 of them in `src/components/ui/*`. Additionally `button.tsx:16` contains `bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` and `button.tsx:27` / `calendar.tsx:93,102` / `toggle.tsx:20` contain `text-[0.8rem]`. | D-17's cost estimate is right *for the palette-class rule* and wrong for the phase. The vendored edit surface is ~15 files. Not a reason to reverse D-17 — a reason to state the real number in the plan so the `npx shadcn add` risk is priced honestly. |
| **L5** | D-132 / DS-05: fix the ring by making `--ring` a darkened neutral | **Computed:** `oklch(0.45 0 0)` = `#555555` is 7.46:1 solid but **2.32:1** composited at 50% over white. The lightest neutral that clears 3:1 at 50% alpha is `oklch(0.2825 0 0)` ≈ `#292929` — and even that fails on `--muted` (2.93:1). | **No token value fixes `ring-ring/50`.** The `/50` must go. DS-05's own wording anticipates this; the plan must contain the recipe edit as a task, not just the token edit. |
| **L6** | Requirements DS-08: "the **19** literal `bg-brand …` recipes"; CONTEXT: "**29**" | **29 distinct source lines** contain `bg-brand` (53 raw grep hits because most lines also carry `hover:bg-brand/90`). Of the 29, **exactly 20 are on a `<Button>`**; 9 are a `react-day-picker` DayButton className, three `data-[state=on]:` slot chips, a `date-pass-picker` chip, a `spots-left-chip` Badge tint, a notification unread dot, and two wizard step markers. | The CVA `brand` variant absorbs 20. The other 9 keep token classes and are **not** leaks. If a plan says "replace all 29 with `variant='brand'`" it will break the calendar and the slot picker. |
| **L7** | CONTEXT table: raw palette classes "19 across **5** files" / D-15: "20 occurrences across **6** files" | Measured: **19 app-code occurrences across 6 files** (`(app)/layout.tsx`, `(app)/profile/profile-form.tsx`, `(auth)/layout.tsx`, `(auth)/login/page.tsx`, `(auth)/signup/page.tsx`, `(host)/host/layout.tsx`) **+ 1 vendored** (`ui/dialog.tsx:42` `bg-black`) = 20 across 7 files. | Cosmetic, but the plan's file list should be the measured one. |
| **L8** | "the Vitest test is the authoritative gate" (D-16) | `vitest.config.ts` sets `globalSetup: tests/global-setup.ts`, which **hard-fails if the `fitout_test` Postgres database is unreachable** ("THE ONE PLACE A HARD FAILURE IS CORRECT"). Every `vitest run` — including one targeting a single file — pays that preflight. | A build-blocking design gate that needs Docker + Postgres is not a gate anyone will keep. Needs a second, DB-free Vitest config (see § Validation Architecture). |
| **L9** | D-19: a themed favicon that "re-skins with the theme" | Next 16 file conventions: `app/icon.svg` is a **static** file; `app/icon.tsx` produces a **PNG** via `ImageResponse` and is statically optimised at build. "You cannot generate a `favicon`." An SVG favicon is rendered in an isolated context that does not load webfonts, so `<text font-family="Geist">` will not be Geist. `src/app/favicon.ico` (the Next default) is present today. | A runtime-reskinning favicon requires two generated SVGs plus a client `<link rel=icon>` swap driven by `useTheme()`. The "F in Geist" must be an outlined path, or the plan must accept a generic sans and say so. |
| **L10** | D-08: "a `?theme=` query param honoured only outside production" | Root layouts in the App Router **do not receive `searchParams`** — only pages do. `useSearchParams()` in a client component forces dynamic rendering / a Suspense boundary. | The param must be read from `window.location.search` inside a client effect mounted under the provider (see § Code Examples), which sidesteps both problems at the cost of one post-hydration frame. |
| **L11** | (unstated) DS-03 "every shadow maps to one of the three" | Verified by compilation: Tailwind's default `shadow-sm`/`shadow-md`/`shadow-lg` emit **literal** values (`--tw-shadow: 0 4px 6px -1px var(--tw-shadow-color, rgb(0 0 0 / 0.1))…`), not `var(--shadow-md)`. They are **not** theme-swappable. | DS-03's three named `@theme inline` steps are load-bearing for D-02's "pronounced elevation" in grove, not a naming nicety. All 14 shadow call sites must migrate. |
| **L12** | D-20: heading steps carry per-theme weight and tracking | Verified: `.text-display` compiles to `font-weight: var(--tw-font-weight, var(--fw-display))`. A co-located `font-semibold` sets `--tw-font-weight` and **wins**. The codebase has **98 `font-semibold`, 70 `font-medium`, 34 `tracking-tight`, 24 `leading-tight`**. | Either strip those utilities from every heading (high churn) or — recommended — make `--font-weight-semibold`, `--font-weight-medium`, `--tracking-tight`, `--leading-tight` themselves per-theme. The second is one token block and zero component edits. |
| **L13** | D-02: grove's accent is forest/teal | Grove's brand lands around hue 155–190 (green→teal). Today's `--success` is hue 150 green. In grove, "brand" and "positive status" become the same colour family. | Grove needs its own `--success` at a distinct hue (computed candidates supplied), or grove's brand shifts teal-ward. This is a real design fork the planner must close, not a mechanical detail. |
| **L14** | (unstated) the leak regex | `src/lib/db/schema.ts:730` contains `#2813` and `#3388` (GitHub issue references) — a 4-hex-digit string that a naive `#[0-9a-f]{3,8}` matches. Verified against the real ESLint: the fixture string `"see #3388 for details"` reports as a raw hex. `src/lib/` is outside the gate tree today, but the pattern is live. | The hex pattern needs anchoring (a colour-context requirement, or `{3}|{4}|{6}|{8}` with a word boundary plus an inline-disable escape hatch). Also: a bare `oklch` pattern without the `(` matches `in_oklch,` inside `button.tsx:16`'s `color-mix`. |
| **L15** | D-16: "one shared exported pattern list" | `eslint.config.mjs` is ESM JavaScript and cannot import a `.ts` module without a loader. And any module containing the hex/palette regexes, or the generated palette constants, would **trip its own gate** if placed under `src/components/**` or `src/app/**`. | The shared list must be a plain `.mjs`/`.js` ESM module outside the scanned trees (e.g. `config/design-leak-patterns.mjs`). The generated token module belongs in `src/lib/design/` (outside the gate tree, importable by `global-error.tsx` later). |
| **L16** | STACK's "four failing pairs" / PITFALLS' 11-pair audit | Both miss `text-destructive` on `bg-destructive/10` — the shipped `destructive` **button variant** (`button.tsx:20`). Measured **4.01:1** today against a 4.5 bar. And because `--destructive` is out of gamut, its rendered value is implementation-dependent (my clamping gives 4.77:1 on white where PITFALLS computed 4.91:1 — the discrepancy *is* the gamut bug). | A genuinely new failing pair. Fixing DS-07 (gamut) and this pair together constrains `--destructive` to roughly `oklch(0.546 0.22 27.325)`. |
| **L17** | PITFALLS' sweep vs STACK's | `muted-foreground on muted` = **4.35:1, fails** (STACK found it; PITFALLS measured `muted-foreground on background` instead, 4.74, passing). Both are used. | The declared inventory must contain the union of both documents' pairs, not either one. |
| **L18** | Roadmap ordering invariant | GATE-01 (the VR fail-open fix) is Phase 11, and DS-01 changes the rendered typeface of every screen. | **No visual-regression baseline may be captured in this phase.** If a plan proposes `toHaveScreenshot`, that is a scope alarm. |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token definitions (colour, type, radius, elevation, motion) | **CSS / build** (`src/app/globals.css`) | — | Tailwind v4 resolves `@theme` at build; the cascade does the rest at paint. No JS involved. |
| Theme selection at runtime | **Browser / client** (`next-themes` inline script + provider) | Frontend server (renders the script tag) | The attribute is set on `document.documentElement` pre-paint by an inline script; there is no server-side theme decision (D-06: always `court`). |
| Nested `[data-theme]` subtrees (THEME-04) | **CSS cascade** | React (writes the attribute on a `<div>`) | `@theme inline` makes the utility resolve at the element; React only has to render the attribute. |
| Generated token module (DS-12) | **Build/codegen script** → committed source | Node (Leaflet marker, later email/global-error) | Non-CSS consumers cannot read CSS custom properties; a generated TS module is the only single-source path. |
| Leak gate + contrast test + drift checks | **Static analysis / test** (ESLint 9 + Vitest 4) | npm scripts (`build`, `test:design`) | No CI exists; the npm script layer *is* the gate boundary. |
| Focus indicator | **CSS / component recipes** | — | `focus-visible` is a CSS pseudo-class; no JS. |
| `prefers-reduced-motion` | **CSS media query in `@layer base`** | — | Must be a design-system property, not a per-component `@media` block (DS-04). |
| Theme override for tests | **Playwright `addInitScript` → localStorage** | — | Seeds next-themes' storage key before any page script runs; no app surface. |
| Theme override for humans | **Browser / client effect** reading `window.location.search` | — | Root layouts get no `searchParams` (L10); `useSearchParams()` forces dynamic rendering. |
| Favicon | **Build-time generated static SVGs** | Browser (`<link rel=icon>` swap on theme change) | Next cannot generate a `favicon`, and generated `icon.tsx` output is a statically-optimised PNG (L9). |

---

## Standard Stack

### Core (already installed — verified from `package.json` and `node_modules`)

| Library | Installed version | Purpose | Why standard |
|---------|-------------------|---------|--------------|
| `tailwindcss` | **4.3.0** | Token engine (`@theme inline`) | Already the styling layer; `@theme inline` is the documented mechanism for referencing externally-defined CSS variables |
| `@tailwindcss/postcss` | 4.3.0 | Build integration via `postcss.config.mjs` | Already wired |
| `next` | **16.2.7** | App Router, metadata, icon conventions | Already the framework |
| `next-themes` | **0.4.6** | Theme attribute + pre-paint script | Already a dependency, **never mounted** — THEME-01's entire job |
| `class-variance-authority` | 0.7.1 | CVA `brand` variant, `touch` size | Already the button's variant engine |
| `eslint` | 9.x + `eslint-config-next@16.2.7` | Editor + build-time leak lint | Already configured (`eslint.config.mjs`, flat config) |
| `vitest` | **4.1.8** | Authoritative gate (contrast, leak, drift) | Already the test runner; 133 test files |
| `@playwright/test` | 1.60.0 | Theme-swap seam (`addInitScript`) | Already configured; **no VR baselines in this phase** (L18) |
| `tw-animate-css` | 1.4.0 | `animate-in`/`animate-out` keyframes | Already imported; verified to honour `--tw-duration` / `--tw-ease` |

### Supporting (one new dependency)

| Library | Version | Purpose | When to use |
|---------|---------|---------|-------------|
| `culori` | **4.0.2** | oklch ↔ sRGB conversion, gamut check, WCAG contrast in the Vitest gate | Named explicitly by D-12. Use `parse`, `converter("rgb")`, `formatHex`, `wcagContrastRatio`, `inGamut("rgb")`. Install as a **devDependency** — it must not ship in the client bundle. |

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| `culori` | `colorjs.io` | More rigorous CSS Color 4 implementation and better gamut mapping, but larger and slower; D-12 already names culori and culori's `inGamut`/`wcagContrastRatio` cover every need here. **Do not substitute** — D-12 is a locked decision. |
| Inline ESLint plugin in `eslint.config.mjs` | `eslint-plugin-tailwindcss`, `stylelint`, Biome | All three add a dependency and none reads a shared pattern list the Vitest gate can also import. The inline flat-config plugin was **verified working in this session** against the real ESLint 9 with zero new packages. |
| A second `vitest.design.config.ts` | `test.projects` in the existing config | Vitest 4.1.8 supports `projects` + `--project`, but "None of the configuration options are inherited from the root-level config file", and `globalSetup` semantics under projects are an extra risk against a suite whose DB isolation is explicitly load-bearing. A separate config file is the lower-risk path. |
| Two generated SVG favicons + `<link>` swap | `app/icon.tsx` (`ImageResponse`) | `ImageResponse` produces a statically-optimised PNG and needs the Geist binary bundled; it cannot vary per runtime theme without a request-time API. |

**Installation:**
```bash
npm install --save-dev culori @types/culori
```

**Version verification (run 2026-08-11):**
```
npm view culori version          → 4.0.2
npm view culori time.modified    → 2026-04-03
npm view culori license          → MIT
npm view culori repository.url   → git+ssh://git@github.com/Evercoder/culori.git
last-week downloads              → 1,594,696
npm view culori scripts.postinstall → (none)
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `culori` | npm | mature (v4.0.2, last published 2026-04-03) | 1.59M/wk | github.com/Evercoder/culori | **[OK]** | **Approved** |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Verification performed: `slopcheck install culori` returned `[OK]` (1 scanned, 1 OK). `npm view culori scripts.postinstall` returned empty — no postinstall script. Package name provenance: named explicitly in **D-12, a locked user decision**, and independently confirmed on the npm registry with a real source repository, MIT licence and 1.59M weekly downloads. `@types/culori` is a DefinitelyTyped package and inherits that ecosystem's trust model; verify with `npm view @types/culori version` before install (culori 4.x may ship its own types — check `npm view culori types` first and skip `@types/culori` if so).

*No package was installed into this repository during research; slopcheck's `npm install` step failed on Windows (subprocess spawn) after the verdict was produced, and `git status` was confirmed clean of source changes.*

---

## Verified Defects (re-measured in this session — supersedes any earlier figure)

Every row below was produced by running a command against the live repo on 2026-08-11.

| # | Defect | Location | Measured | Method |
|---|--------|----------|----------|--------|
| 1 | `--font-sans` self-referential cycle | `src/app/globals.css:10` | Compiled output contains literally `--font-sans: var(--font-sans);` and `--default-font-family: var(--font-sans);` — both cyclic → guaranteed-invalid | Compiled the real file with `@tailwindcss/postcss@4.3.0` |
| 2 | Scaffold metadata | `src/app/layout.tsx:16-17` | `title: "Create Next App"`, `description: "Generated by create next app"` | Read |
| 3 | `suppressHydrationWarning` absent | `src/app/layout.tsx:26-29` | Absent | Read |
| 4 | Default favicon + starter SVGs | `src/app/favicon.ico`; `public/{file,globe,next,vercel,window}.svg` | Present; **all five SVGs unreferenced anywhere in `src/`** | `ls` + grep |
| 5 | `BRAND_CORAL` drift | `src/components/listing/listing-map.tsx:22`, `:34` | `#E8484E` hardcoded vs live `--brand` → `#ef4445`; plus `#fff` at :34 | grep + solver |
| 6 | Raw hex under the gate tree | `src/app/**` + `src/components/**` | **exactly 2**, both in `listing-map.tsx` | grep |
| 7 | `rgb(` / `oklch(` / `hsl(` in TSX/TS | all of `src/` | **0** | grep |
| 8 | Arbitrary `text-[NNpx]` | 10 app files | **14** (12 × `text-[28px]`, 1 × `text-[10px]`, 1 × `text-[11px]`) | grep |
| 8b | Arbitrary `text-[Nrem]` (**not** counted by CONTEXT) | `ui/button.tsx:27`, `ui/calendar.tsx:93,102`, `ui/toggle.tsx:20` | **4** × `text-[0.8rem]` | grep |
| 9 | Raw Tailwind palette classes | 6 app files + `ui/dialog.tsx:42` | **19 app + 1 vendored** (`bg-black`) | grep |
| 10 | `dark:` split | app / vendored | **10 across 5 files** / **56 across 14 files** — D-129-as-amended confirmed exactly | grep |
| 11 | `bg-brand` literal recipes | 19 files | **29 distinct lines**, **20 on `<Button>`**, 9 not | grep + 12-line context classification |
| 12 | 50%-alpha focus ring | 15 files (11 vendored) | **13 × `focus-visible:ring-ring/50`**, plus `outline-ring/50` in `globals.css:137` (which sets `outline-color` only — currently renders nothing, but is live for the 3 × `focus-visible:outline-1` sites) | grep + compilation |
| 13 | Shadow values in use | app-wide | `shadow-none` ×5, `shadow-md` ×4, `shadow-sm` ×3, `shadow-xs` ×1, `shadow-lg` ×1 = **14 sites, 5 distinct values** → 3 named steps | grep |
| 14 | z-index values in use | app-wide | `z-10` ×12, `z-50` ×9, `z-0` ×2 = **23 sites, 3 distinct values** → 4-step scale | grep |
| 15 | Typography utilities in use | app-wide | `text-sm` ×265, `text-xs` ×52, `text-xl` ×32, `text-2xl` ×20, `text-base` ×17, `text-lg` ×13; `font-semibold` ×98, `font-medium` ×70, `font-normal` ×12; `tracking-tight` ×34, `tracking-widest` ×2; `leading-tight` ×24, `leading-snug` ×6, `leading-none` ×3, `leading-relaxed` ×2 | grep |
| 16 | `prefers-reduced-motion` | all of `src/`, `tests/`, `e2e/` | **zero occurrences** | grep |
| 17 | `--destructive` out of sRGB gamut | `globals.css:70` | `oklch(0.577 0.245 27.325)` — **max in-gamut chroma at that L/H is 0.2350** | OKLab→linear-sRGB solver |
| 18 | Sonner follows the OS colour scheme | `src/components/ui/sonner.tsx:8` | `const { theme = "system" } = useTheme()` → `theme as ToasterProps["theme"]`. With no provider mounted, `useTheme()` returns the fallback context (`{ setTheme: noop, themes: [] }`) so `theme` is `undefined` → defaults to `"system"` → Sonner follows the OS | Read source of both packages |

---

## Computed Palette — the D-12 derivation, executed

**Method (encode this as the task, not the numbers).** Implement the solver with `culori`: convert `oklch(L C H)` → sRGB, reject any candidate whose linear-sRGB channels fall outside `[0,1]` (`inGamut("rgb")`), format to 8-bit hex, compute WCAG 2.x relative luminance from the 8-bit hex, and binary-search for the **maximum L** at fixed `C, H` whose rendered hex clears the bar. Compute contrast on the **8-bit hex**, not on the float — that is what a contrast checker and a screenshot both see.

**Validation of the method:** an independent implementation of exactly this reproduces PITFALLS.md's entire 11-pair audit to two decimals — 3.76 / 3.60 / 3.45 / 3.24 / 3.39 / 2.58 / 1.26 / 4.74 / 4.35 / 19.80, and the `ring/50` composite at `#d0d0d0` = 1.54. The single divergence is `destructive on background` (4.77 here vs 4.91 in PITFALLS) — and that divergence *is* defect #17: an out-of-gamut colour renders differently depending on the gamut-mapping algorithm, which is precisely the VR-flake risk DS-07 exists to remove.

### The safety-margin finding (this is the actionable part)

| Bar used in the solve | Derived `--brand` | Rendered | Actual ratio vs `--brand-foreground` |
|---|---|---|---|
| 4.50 (D-12 as literally written) | `oklch(0.5830 0.208 25)` | `#db2e35` | **4.52** — a 0.02 margin |
| **4.55 (recommended: +0.05 epsilon)** | **`oklch(0.58 0.208 25)`** | **`#da2d34`** | **4.57** |
| 4.60 | `oklch(0.5775 0.208 25)` | `#d92c33` | 4.62 |

A 0.02 margin is not survivable: it flips if `--brand-foreground` moves a hair, if a browser rounds an oklch conversion differently, or if the test's rounding changes. **Recommend the solver takes an explicit `AA_EPSILON = 0.05` constant and the plan records it.** With that epsilon the derivation lands on `#da2d34` — STACK's prescribed value — for a stated reason rather than by adoption, and PITFALLS' `#d33a3c` is shown to pass but not to be the lightest passer. The roadmap's "still genuinely open" item is thereby closed by computation, exactly as D-12 requires.

### Derived `court` token block

| Token | oklch | Hex | Change from shipped |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `#ffffff` | unchanged |
| `--foreground` | `oklch(0.145 0 0)` | `#0a0a0a` | unchanged |
| `--card` / `--popover` | `oklch(1 0 0)` | `#ffffff` | unchanged |
| `--primary` | `oklch(0.205 0 0)` | `#171717` | unchanged |
| `--primary-foreground` | `oklch(0.985 0 0)` | `#fafafa` | unchanged |
| `--secondary` / `--muted` / `--accent` | `oklch(0.97 0 0)` | `#f5f5f5` | unchanged |
| **`--muted-foreground`** | **`oklch(0.53 0 0)`** | **`#6c6c6c`** | **darkened** — was `0.556` = 4.35:1 on `--muted` (fails L17); now 4.82 / 5.25 |
| **`--brand`** | **`oklch(0.58 0.208 25)`** | **`#da2d34`** | **darkened** — was `0.637`; label ratio 3.60 → 4.57 |
| `--brand-foreground` | `oklch(0.985 0 0)` | `#fafafa` | unchanged |
| `--success` | `oklch(0.62 0.17 150)` | `#03a14a` | **unchanged** — D-14 confirmed by computation (see below) |
| **`--destructive`** | **`oklch(0.546 0.22 27.325)`** | **`#d20817`** | **in gamut** (was C=0.245 > the 0.235 ceiling) **and** clears its own `/10` tint in both themes |
| **`--ring`** | **`oklch(0.45 0 0)`** | **`#555555`** | **darkened** — was `0.708` = 2.58:1; now 7.46 solid. **Requires the `/50` removal (L5).** |
| `--border` / `--input` | `oklch(0.922 0 0)` | `#e5e5e5` | unchanged (1.26:1 — decorative divider only; must be declared as such, never a control's sole boundary) |
| `--radius` | `0.625rem` (10px) | — | unchanged |

### Derived `grove` token block (proposal — the shape is what matters, re-run the solver)

| Token | oklch | Hex |
|---|---|---|
| `--background` | `oklch(0.988 0.006 160)` | `#f8fcfa` |
| `--card` / `--popover` | `oklch(1 0 0)` | `#ffffff` |
| `--foreground` | `oklch(0.17 0.02 165)` | `#07120d` |
| `--primary` | `oklch(0.24 0.03 165)` | `#11241c` |
| `--primary-foreground` | `oklch(0.985 0.004 160)` | `#f8fbf9` |
| `--secondary` / `--muted` / `--accent` | `oklch(0.958 0.010 160)` | `#ecf3ef` |
| `--muted-foreground` | `oklch(0.50 0.015 165)` | `#5c6661` |
| `--brand` | `oklch(0.5405 0.12 160)` | `#098356` |
| `--brand-foreground` | `oklch(0.985 0.004 160)` | `#f8fbf9` |
| `--success` | **open — see L13** | — |
| `--destructive` | `oklch(0.546 0.22 27.325)` | `#d20817` (shared with court; verified to clear both themes' `/10` tints) |
| `--ring` | `oklch(0.45 0.02 165)` | `#4b5952` |
| `--border` / `--input` | `oklch(0.905 0.012 160)` | `#d9e2dd` |
| `--radius` | `1.25rem` (20px) | — (D-02) |

### Full declared pair inventory (D-13), verified in both themes

Bars: **4.5** for text, **3.0** for non-text (icons, borders, focus indicators — WCAG 2.2 SC 1.4.11).

| Pairing | Bar | court | grove | Note |
|---|---|---|---|---|
| `foreground` on `background` | 4.5 | 19.80 | 18.43 | body text |
| `foreground` on `card` | 4.5 | 19.80 | 19.07 | body text on card |
| `foreground` on `muted` | 4.5 | 18.16 | 16.92 | **status text on a neutral tint (D-14's mechanism)** |
| `muted-foreground` on `background` | 4.5 | 5.25 | 5.75 | secondary text |
| `muted-foreground` on `card` | 4.5 | 5.25 | 5.95 | |
| `muted-foreground` on `muted` | 4.5 | 4.82 | 5.28 | **was 4.35 = fail (L17)** |
| `primary-foreground` on `primary` | 4.5 | 17.18 | 15.59 | default Button |
| `secondary-foreground` on `secondary` | 4.5 | 16.44 | 14.41 | |
| `accent-foreground` on `accent` | 4.5 | 16.44 | 14.41 | hover / menu item |
| **`brand-foreground` on `brand`** | 4.5 | **4.57** | **4.59** | **DS-06 headline — was 3.60** |
| `brand` on `background` | 3.0 | 4.77 | 4.62 | brand icon / border |
| `brand` on `card` | 3.0 | 4.77 | 4.78 | |
| `brand` on `muted` | 3.0 | 4.37 | 4.24 | **was 3.45** |
| `success` on `background` | 3.0 | 3.39 | — | **icon only (D-14)** |
| `success` on `card` | 3.0 | 3.39 | — | |
| `success` on `muted` | 3.0 | **3.11** | — | thin — see § Open Questions |
| `destructive` on `background` | 4.5 | 5.36 | 5.18 | |
| `destructive` on `card` | 4.5 | 5.36 | 5.36 | |
| **`destructive` on `destructive/10` over `background`** | 4.5 | **4.64** | **4.50** | **new failing pair, 4.01 today (L16)** — `button.tsx:20` |
| `foreground` on `brand/10` over `background` | 4.5 | 17.04 | 16.18 | soft-accent chip text (`spots-left-chip.tsx:64`) |
| `brand` on `brand/10` over `background` | 3.0 | 4.10 | 4.06 | soft-accent chip icon |
| `ring` on `background` | 3.0 | 7.46 | 7.12 | **SC 1.4.11 — was 2.58 / 1.54 rendered** |
| `ring` on `card` | 3.0 | 7.46 | 7.37 | |
| `ring` on `muted` | 3.0 | 6.84 | 6.54 | |
| `border` on `background` | — | 1.26 | 1.29 | **declared as decorative-only**; explicitly excluded from the 3:1 bar with a stated reason |

**Result: 24/24 pass in court, 24/24 in grove (with grove's `--success` still open).**

### D-14 verified by computation

The shipped `--success` `oklch(0.62 0.17 150)` = `#03a14a` clears the 3:1 icon bar as-is (3.39 / 3.11). More importantly, **every darkening candidate at the shipped chroma is out of the sRGB gamut** — `oklch(0.58 0.17 150)` and `oklch(0.55 0.15 155)` both fall outside. The rejected option ("darken `--success`") would therefore have introduced a *second* gamut bug of exactly the kind DS-07 exists to remove. D-14 is not just the better a11y story; it is the only one that does not create a new defect. If a margin is wanted, the in-gamut path is to reduce chroma alongside lightness: `oklch(0.58 0.15 150)` = `#1b9247` (4.00 / 3.67) or `oklch(0.56 0.14 150)` = `#218a45` (4.39 / 4.02).

---

## Architecture Patterns

### System Architecture Diagram

```
                                       ┌──────────────────────────────────────┐
  BUILD TIME                           │  config/design-leak-patterns.mjs     │
                                       │  (single exported pattern list)      │
                                       └───────┬──────────────────┬───────────┘
                                               │                  │
 src/app/globals.css                    eslint.config.mjs   tests/design/*.test.ts
 ┌───────────────────────────┐          (inline plugin,     (authoritative gate)
 │ @import "tailwindcss"     │           scoped to               │
 │ @theme inline { … }  ◄────┼── extend  src/app|components)     │
 │ :root,[data-theme=court]  │                  │                │
 │ [data-theme=grove]        │                  │                │
 │ @layer base { reduced-    │                  ▼                ▼
 │   motion reset }          │           npm run lint  ──►  npm run test:design
 └────────────┬──────────────┘                  │                │
              │                                  └──────┬─────────┘
              │  postcss / @tailwindcss/postcss          │
              ▼                                          ▼
      utilities carrying var(--token)            "build": lint && test:design && next build
              │                                          │
              │                                     FAILS THE BUILD  (DS-13, SC#5)
              │
              │        ┌─────────────────────────────────────────────┐
              │        │ scripts/generate-design-tokens.mjs          │
              │        │  parse globals.css  ─►  culori  ─► hex      │
              │        └──────────┬────────────────────┬─────────────┘
              │                   │ writes (committed) │ regen-diff check
              │                   ▼                    ▼
              │        src/lib/design/tokens.generated.ts    tests/design/token-drift.test.ts
              │        public/icon-court.svg  icon-grove.svg
              │                   │
──────────────┼───────────────────┼───────────────────────────────────────────────
  RUN TIME    │                   │
              ▼                   ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ <html suppressHydrationWarning>                               │
  │   next-themes inline script (pre-paint)                       │
  │     reads localStorage["theme"] || "court"                    │
  │     sets documentElement[data-theme]                          │
  │   ├─ <ThemeQueryParam/>  (client, non-prod, window.location)  │
  │   ├─ <FaviconSwap/>      (client, swaps <link rel=icon>)      │
  │   ├─ <Toaster theme="light"/>  (mapped, never passed through) │
  │   └─ {children}                                               │
  │        └─ /dev/theme  (notFound() in prod)                    │
  │             ├─ <div data-theme="court"> …real components…     │
  │             └─ <div data-theme="grove"> …real components…     │
  │                  ▲ resolves per-element because @theme inline │
  └───────────────────────────────────────────────────────────────┘
              ▲
              │  Playwright: context.addInitScript(seed localStorage["theme"]="grove")
              │  → the seam Phase 11's theme-swap smoke and Phase 17's axe pass depend on
```

### Recommended file layout

```
config/
└── design-leak-patterns.mjs      # NEW — the one shared pattern list (ESM, outside the gate tree)
scripts/
└── generate-design-tokens.mjs    # NEW — globals.css → tokens.generated.ts + icon-*.svg
src/
├── app/
│   ├── globals.css               # MOD — fix cycle, extend @theme inline, add [data-theme] blocks,
│   │                             #       motion reset, solid focus recipe
│   ├── layout.tsx                # MOD — metadata, suppressHydrationWarning, ThemeProvider mount
│   ├── favicon.ico               # DEL — replaced by generated icon SVGs (L9)
│   └── dev/theme/page.tsx        # NEW — THEME-04 preview, notFound() in production
├── components/
│   ├── theme/
│   │   ├── theme-provider.tsx    # NEW — "use client" wrapper over next-themes
│   │   ├── theme-query-param.tsx # NEW — non-prod ?theme= honouring (L10)
│   │   └── favicon-swap.tsx      # NEW — <link rel=icon> swap on theme change
│   └── ui/
│       ├── button.tsx            # MOD — brand variant (D-21), touch size (D-22), solid ring
│       ├── sonner.tsx            # MOD — map court|grove → "light", never pass through
│       └── (11 more)             # MOD — focus-visible:ring-ring/50 → focus-visible:ring-ring
├── lib/design/
│   ├── tokens.generated.ts       # NEW — committed, drift-checked (D-18)
│   └── contrast-pairs.ts         # NEW — the declared inventory (D-13)
public/
├── icon-court.svg  icon-grove.svg  # NEW — generated
└── {file,globe,next,vercel,window}.svg  # DEL — unreferenced scaffold residue (DS-14)
tests/design/
├── contrast.test.ts              # NEW — DS-06
├── leak.test.ts                  # NEW — DS-13
├── pair-drift.test.ts            # NEW — D-13's companion check
├── token-drift.test.ts           # NEW — D-18's regen-diff
└── motion-budget.test.ts         # NEW — DS-04's 320ms cap
vitest.design.config.ts           # NEW — DB-free config for the fast gate (L8)
```

### Pattern 1 — `@theme inline` is the nested-theme mechanism (VERIFIED BY COMPILATION)

**What:** `@theme inline` inlines the theme variable's *value* into the utility instead of emitting a reference to the namespaced variable. Because the value is itself a `var()`, resolution is deferred to the element.

**Verified output** from compiling this repo's real `globals.css` with `@tailwindcss/postcss@4.3.0`:

```css
.bg-background { background-color: var(--background); }   /* NOT var(--color-background) */
.bg-brand      { background-color: var(--brand); }
.rounded-lg    { border-radius: var(--radius); }
.rounded-md    { border-radius: calc(var(--radius) * 0.8); }   /* the calc chain survives */
.font-sans     { font-family: var(--font-sans); }
```

Official confirmation: *"Using the `inline` option, the utility class will use the theme variable **value** instead of referencing the actual theme variable."* [CITED: tailwindcss.com/docs/theme]

**Consequence (AP-2, three-way researcher convergence, now compiler-verified):** drop `inline` and every utility becomes `var(--color-background)`, which is only defined at `:root`. The `<html>`-level switch keeps working — which is exactly why the failure is easy to miss — but every nested `[data-theme]` subtree silently renders the root theme. **Never remove `inline`. Only extend the block.**

**Cascade rule for the theme blocks.** Author them **unlayered**, after `:root`, at equal specificity:

```css
:root,
[data-theme="court"] { --background: oklch(1 0 0); --brand: oklch(0.58 0.208 25); /* … */ }

[data-theme="grove"] { --background: oklch(0.988 0.006 160); --brand: oklch(0.5405 0.12 160); /* … */ }
```

Why this exact shape:
- Unlayered declarations beat everything in `@layer theme` (where Tailwind emits its defaults) regardless of specificity — the existing `:root` block already relies on this.
- `:root` and `[data-theme="grove"]` are both specificity (0,1,0), so **source order decides** — `grove` must come after.
- **Do not write `:root[data-theme="grove"]` or `html[data-theme="grove"]`.** It raises specificity but stops matching nested `<div data-theme="grove">`, silently killing THEME-04 while the app-wide switch still works. Same failure class as dropping `inline`.

### Pattern 2 — `next-themes@0.4.6`, read from the installed source

Verified directly from `node_modules/next-themes/dist/index.mjs`:

| Fact | Value | Consequence |
|---|---|---|
| `attribute` default | **`"data-theme"`** | THEME-01's "never `class`" is already the default; pass it explicitly anyway for readability |
| `storageKey` default | `"theme"` | This is the key Playwright seeds (D-08) |
| `themes` default | `["light","dark"]` | Must be overridden to `["court","grove"]` |
| `defaultTheme` default | `enableSystem ? "system" : "light"` | Must be `"court"` with `enableSystem={false}` |
| `enableColorScheme` | applies `documentElement.style.colorScheme` **only if the name is in `["light","dark"]`**, else assigns `null` (→ empty string via WebIDL) | Safe with `court`/`grove` — but pass `enableColorScheme={false}` so the intent is readable |
| pre-paint script | `localStorage.getItem(storageKey) \|\| defaultTheme`, then `setAttribute` on `documentElement` | **This is why `suppressHydrationWarning` on `<html>` is load-bearing (D-07)** |
| `forcedTheme` | short-circuits the script before localStorage is read | Do **not** use it — it would defeat both D-08 override paths |
| `disableTransitionOnChange` | injects `*{transition:none!important}` during the swap | Set `true` — makes the Phase-11 theme-swap screenshots deterministic |

**Sonner (THEME-01's second half).** `useTheme()` will return `"court"`. Sonner's `theme` prop accepts only `light | dark | system`, and `sonner.tsx:8`'s `as ToasterProps["theme"]` cast hides that. Both themes are light-background (D-03), so map explicitly rather than passing through:

```tsx
const { resolvedTheme } = useTheme()
const sonnerTheme: ToasterProps["theme"] = resolvedTheme === "dark" ? "dark" : "light"
```

Keep the existing `style` block — `"--normal-bg": "var(--popover)"` is an inline style on the Toaster element, which sits in a body-level portal and therefore inherits the root theme correctly.

### Pattern 3 — the type scale (DS-02), and the two ways it can silently not work

`@theme inline` supports per-step modifiers, verified by compilation:

```css
@theme inline {
  --text-display:                 var(--fs-display);
  --text-display--line-height:    var(--lh-display);
  --text-display--font-weight:    var(--fw-display);
  --text-display--letter-spacing: var(--ls-display);
}
```
compiles to
```css
.text-display {
  font-size:      var(--fs-display);
  line-height:    var(--tw-leading,      var(--lh-display));
  letter-spacing: var(--tw-tracking,     var(--ls-display));
  font-weight:    var(--tw-font-weight,  var(--fw-display));
}
```

Two traps, both verified:

1. **A co-located utility wins.** `font-semibold` sets `--tw-font-weight`; `tracking-tight` sets `--tw-tracking`; `leading-tight` sets `--tw-leading`. With 98 / 34 / 24 occurrences respectively, D-20's per-theme heading weight would be dead on most headings. **Fix: make `--font-weight-semibold`, `--font-weight-medium`, `--tracking-tight`, `--leading-tight` per-theme too** — one extra token block, zero component edits.
2. **The `/` modifier drops the other two.** `text-display/tight` compiles to `font-size` + `line-height` only — letter-spacing and font-weight vanish. Do not use the modifier form on the named heading steps.

**And the fact that shrinks DS-02 dramatically:** Tailwind's *built-in* scale is already var-referencing —

```css
.text-sm { font-size: var(--text-sm); line-height: var(--tw-leading, var(--text-sm--line-height)); }
.p-4     { padding: calc(var(--spacing) * 4); }
.font-semibold { font-weight: var(--font-weight-semibold); }
```

so `[data-theme="grove"] { --text-sm: … }` re-skins all 265 `text-sm` sites with zero edits. DS-02 = author the scale + add the missing named steps (a 1.75rem "figure" step for the 12 × `text-[28px]` amount displays, and a micro step for the 10/11px labels) + migrate the 14 arbitrary sites. **Not a 400-site migration.**

### Pattern 4 — elevation (DS-03): the named steps are mandatory, not cosmetic

Verified: Tailwind's default shadows are **literal**, not var-referencing —

```css
.shadow-md { --tw-shadow: 0 4px 6px -1px var(--tw-shadow-color, rgb(0 0 0 / 0.1)), …; }
```

so `[data-theme="grove"] { --shadow-md: … }` does **nothing**. D-02's "pronounced elevation" in grove is therefore only achievable through `@theme inline` named steps:

```css
@theme inline {
  --shadow-raised:  var(--elevation-raised);
  --shadow-overlay: var(--elevation-overlay);
  --shadow-sticky:  var(--elevation-sticky);
}
```
which compiles to `.shadow-raised { --tw-shadow: var(--elevation-raised); … }` — theme-aware, verified. All 14 shadow call sites migrate. The z-index scale (`--z-sticky` < `--z-sheet` < `--z-dialog` < `--z-toast`) is global (not per-theme) and maps the existing 23 sites; note for Phase 18 that Leaflet's `z-index: 1000` will collide with `z-50` and this scale is the arbiter.

### Pattern 5 — motion (DS-04) as a token property, not a per-component `@media`

Three levers, all verified:

1. **The default duration and easing are theme variables.** `transition-colors` compiles to `transition-duration: var(--tw-duration, var(--default-transition-duration))` and `transition-timing-function: var(--tw-ease, var(--default-transition-timing-function))`. Setting both in `@theme` retunes every bare `transition-*` utility in the app with zero edits.
2. **There is no `--duration-*` namespace in Tailwind v4.** `duration-base` does not compile. Named durations must be used as `duration-(--motion-base)` (the CSS-variable arbitrary-value syntax), which compiles to `--tw-duration: var(--motion-base)` and therefore stays theme- and media-aware.
3. **`tw-animate-css` honours those same variables:** `--animate-in: enter var(--tw-animation-duration, var(--tw-duration, .15s)) var(--tw-ease, ease) …`. So `animate-in duration-(--motion-base) ease-standard` is inside the budget.

**The global reduced-motion reset** (there is currently *zero* `prefers-reduced-motion` handling anywhere in the repo) belongs in `@layer base` and must use `!important` to beat utilities:

```css
@layer base {
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

This is the only form that also neutralises `tw-animate-css` keyframes and Radix `data-state` animations. A token-only approach (redefining `--motion-*` inside the media query) misses keyframe animations entirely.

**Cap wording matters for testability.** `animate-spin` and `animate-pulse` are *continuous* indicators whose cycle exceeds 320ms by design. DS-04's cap must be stated as "no transition or enter/exit animation exceeds 320ms; continuous loading indicators are exempt and are covered by the reduced-motion reset" — otherwise the test cannot be written without failing on the spinner.

### Pattern 6 — the focus indicator (DS-05)

Verified compilation of the shipped recipe:

```css
.focus-visible\:ring-ring\/50:focus-visible {
  --tw-ring-color: color-mix(in oklab, var(--ring) 50%, transparent);
}
```

**No value of `--ring` makes this pass** (L5). The recipe becomes:

```
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
```

across the 13 sites, plus `globals.css:137`'s `outline-ring/50` → `outline-ring` (it currently sets `outline-color` only, with no width or style, so it renders nothing on its own — but it *is* the colour source for the 3 × `focus-visible:outline-1` sites).

**A `@layer base` `*:focus-visible { outline: … }` fallback does not work here** — shadcn's base recipe sets `outline-none` in the utilities layer, which outranks any base-layer outline. Considered and rejected; do not plan it.

### Pattern 7 — the leak gate (DS-13 / D-15 / D-16), verified working

An inline ESLint 9 flat-config plugin, zero new dependencies. Run against a fixture with the repo's installed ESLint this session, it reported:

```
1:11  error  Raw design value "#E8484E"    fitout/no-raw-design-value
2:13  error  Raw design value "bg-zinc-50" fitout/no-raw-design-value
3:11  error  Raw design value "text-[28px]" fitout/no-raw-design-value
5:13  error  Raw design value "color-mix("  fitout/no-raw-design-value   ← FALSE POSITIVE on button.tsx:16
6:15  error  Raw design value "#3388"       fitout/no-raw-design-value   ← FALSE POSITIVE on issue refs
```

Both false positives are real code shapes in this repo. Pattern decisions the plan must make explicitly:

| Class | Recommended pattern | Cost / risk |
|---|---|---|
| Raw hex | `#(?:[0-9a-fA-F]{3}\|[0-9a-fA-F]{4}\|[0-9a-fA-F]{6}\|[0-9a-fA-F]{8})\b` **plus** an `eslint-disable` / `/* design-token-exempt */` escape hatch | Catches the 2 real hits; `#3388`-style issue refs need the escape hatch (none in the gate tree today) |
| Colour functions | `\b(?:rgba?\|hsla?\|oklch\|oklab\|lab\|lch)\(` — **note the required `(`** | `oklch` without `(` matches `in_oklch,` in `button.tsx:16`. **Do not add `color-mix(` to the ban list** unless `button.tsx:16` is also rewritten — `color-mix` over two tokens is not a leak |
| Arbitrary text size | **px-only** `text-\[[0-9.]+px\]` matches DS-13's literal wording and the measured baseline (14 app, 0 vendored). **rem-inclusive** adds 4 vendored fixes in 3 files | A deliberate call. px-only is recommended: it matches the requirement text and the CONTEXT baseline, and it keeps the vendored fork surface honest |
| Palette classes (D-15) | `\b(?:bg\|text\|border\|ring\|from\|via\|to\|fill\|stroke\|outline\|decoration\|divide\|placeholder\|accent\|caret\|shadow)-(?:slate\|gray\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose)-(?:50\|[1-9]00\|950)\b` | 19 app + 0 vendored |
| white/black (D-15) | `\b(?:bg\|text\|border\|ring\|fill\|stroke\|divide\|outline)-(?:white\|black)\b` | 8 app + 1 vendored (`dialog.tsx:42`) |

The list must live in `config/design-leak-patterns.mjs` (plain ESM, outside the gate tree — L15) and be imported by **both** `eslint.config.mjs` and `tests/design/leak.test.ts`.

**Scope the ESLint entry with `files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"]`** — otherwise it fires on `tests/design/*` fixtures and on `src/lib/db/schema.ts`. Note `npm run lint` currently takes **85 seconds** and reports 0 errors / 9 warnings, so it is a viable (if slow) build gate today.

### Pattern 8 — the generated token module (DS-12 / D-18)

A single `scripts/generate-design-tokens.mjs` that:
1. reads `src/app/globals.css`, extracts every `--token: oklch(...)` from the `:root, [data-theme="court"]` and `[data-theme="grove"]` blocks;
2. converts each with `culori` to a hex fallback;
3. writes `src/lib/design/tokens.generated.ts` (committed) with a `DO NOT EDIT` banner;
4. writes `public/icon-court.svg` / `public/icon-grove.svg` from the same values.

The drift check (`tests/design/token-drift.test.ts`) re-runs the generator into a temp buffer and asserts byte-equality with the committed file. This is D-18 without a CI (L2) — the check is a test, wired into `test:design`, wired into `build`.

`src/lib/design/` sits outside the gate tree, so the module's own hex literals are legal, and `src/app/global-error.tsx` (Phase 11) can import from it rather than inlining literals.

### Pattern 9 — the pair drift check (D-13's companion)

The declared inventory (`src/lib/design/contrast-pairs.ts`) lists legal `{ fg, bg, bar, note }` triples. The drift check scans every string literal and template chunk under the gate tree, strips variant prefixes (`hover:`, `focus-visible:`, `data-[state=on]:`, `dark:`), classifies each class token as a foreground (`text-*`) / background (`bg-*`) / border (`border-*`, `ring-*`), takes the cross product *within a single string* and fails on any combination absent from the inventory.

**Its honest blind spot, which must be written into the file's header comment:** a cross-element pairing (`text-brand` on a child of a `bg-muted` parent) is invisible to same-string analysis. That residue is what Phase 17's two-theme axe pass covers. Saying so in the code stops a later reader trusting the check further than it deserves.

### Anti-Patterns to Avoid

- **Dropping or replacing `@theme inline`** — silently kills THEME-04 while the app-wide switcher still works (AP-2, three-way convergence, now compiler-verified).
- **`:root[data-theme="x"]` / `html[data-theme="x"]`** — same failure class, different cause: stops matching nested subtrees.
- **Renaming shadcn's semantic tokens** — 4-of-4 researcher convergence; 30 vendored primitives and five approved UI-SPECs are written in `bg-background` / `text-muted-foreground` (AP-1).
- **Replacing all 29 `bg-brand` lines with `variant="brand"`** — 9 of them are not Buttons (L6). Breaks the calendar and the slot picker.
- **Fixing the ring by token value alone** — arithmetically impossible (L5).
- **Reintroducing `--brand-strong`** — explicitly considered and rejected (CONTEXT § Specific Ideas). The accent deepening everywhere is accepted.
- **Capturing any visual-regression baseline** — GATE-01 is Phase 11 and DS-01 invalidates anything shot before it (L18).
- **Proposing a schema migration** — GATE-06 binds from this phase; `drizzle/` stays at `0025`.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| oklch → sRGB, gamut check, WCAG ratio | A hand-rolled OKLab matrix | **`culori`** (`converter`, `formatHex`, `inGamut`, `wcagContrastRatio`) | D-12 names it. The matrix is easy to get subtly wrong and the 8-bit rounding step is where hand-rolled versions diverge — exactly the divergence that produced STACK's 4.91 vs the real 4.77 |
| Pre-paint theme attribute without a flash | A `useEffect` that sets `data-theme` | **`next-themes`** (already installed) | The inline script runs before paint; an effect runs after, producing a visible flash on every load |
| Class-string parsing for the leak/pair checks | A bespoke tokenizer | **ESLint's `Literal` / `TemplateElement` visitors** | Verified working this session; gives you node positions for free and handles JSX/TS parsing |
| CSS layer/specificity juggling for themes | `!important`, `:root[data-theme]`, or a JS style injector | **Unlayered equal-specificity blocks in source order** | Documented cascade behaviour; the existing `:root` block already depends on it |
| A contrast checker UI | A `/dev/contrast` page | **A Vitest assertion** | DS-06 says "verified by an automated contrast test rather than by inspection"; a page is inspection |
| Reduced-motion per component | `@media` blocks in 20 components | **One `@layer base` reset** | DS-04 says "a global reset is in force" |
| Favicon rasterisation | Canvas/sharp pipeline | **Two generated SVG files + a `<link>` swap** | Next cannot generate a `favicon`; `icon.tsx` output is a build-time PNG (L9) |

**Key insight:** every hand-rolled candidate in this phase is a *colour-math* or *cascade-semantics* problem, and both are domains where an implementation that is 99% right produces a number that looks plausible and is wrong — which is precisely how `02-UI-SPEC.md:223` came to assert the coral CTA was ≥4.5:1 when it is 3.60:1.

---

## Runtime State Inventory

This phase renames nothing in the database, but it does establish runtime state that a rename/reset must account for.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | **None in the database** — verified: no `theme`, `--brand` or design-token value is persisted anywhere in `drizzle/` or `src/lib/db/schema.ts`. GATE-06 holds: zero migrations. | none |
| **Browser-local state** | `localStorage["theme"]` — **created by this phase** (next-themes' default `storageKey`). A developer who once set `"grove"` will keep seeing grove on every subsequent load, including after the phase ships. | Document the key; Playwright seeds and clears it; the `?theme=` handler must write through `setTheme()` so the two paths agree |
| **Live service config** | None. No Vercel/Datadog/n8n/Cloudflare surface carries a design token. | none |
| **OS-registered state** | None. | none |
| **Secrets / env vars** | None new. `NODE_ENV` is read for the `/dev/theme` guard and the `?theme=` guard — already present, not a new variable. | none |
| **Build artifacts** | `.next/` caches compiled CSS; a `globals.css` edit invalidates it automatically. `src/lib/design/tokens.generated.ts` and `public/icon-*.svg` are **committed generated artifacts** — a fresh clone must not need a build step to read them (D-18). | Regen-diff test is the guard |
| **Files deleted** | `src/app/favicon.ico`, `public/{file,globe,next,vercel,window}.svg` — all five SVGs verified **unreferenced** in `src/`. `favicon.ico` currently emits `<link rel="icon" href="/favicon.ico" sizes="any">`; leaving it alongside `icon.svg` lets browsers pick either. | Delete both, don't just add alongside |
| **Visual-regression baselines** | **None exist.** `e2e/` contains 9 spec files, none using `toHaveScreenshot`; no `*-snapshots` directory. | Nothing to invalidate — and nothing may be created here (L18) |

---

## Common Pitfalls

### Pitfall 1: The gate that cannot fail the build
**What goes wrong:** ESLint and Vitest both pass locally, everyone believes the leak gate is on, and a raw hex ships.
**Why it happens:** Next 16 removed ESLint from `next build` (L1) and there is no CI (L2). `"build": "next build"` runs neither.
**How to avoid:** `"build": "npm run lint && npm run test:design && next build"`. Then *deliberately introduce a leak and watch the build go red* before closing the task — D-135's exact lesson is that a gate that has never failed trains reviewers to trust a rubber stamp.
**Warning signs:** a plan task that says "add the ESLint rule" with no task that says "make the build fail on it".

### Pitfall 2: The gate that requires Docker
**What goes wrong:** `npm run test:design` hard-fails with a Postgres preflight error on a machine that just wanted to check a colour.
**Why it happens:** `vitest.config.ts`'s `globalSetup` preflights the `fitout_test` database and hard-fails by design (L8) — for every invocation, including a single-file run.
**How to avoid:** a separate `vitest.design.config.ts` with `include: ["tests/design/**"]`, `environment: "node"`, **no `setupFiles`, no `globalSetup`**. The design tests need no DB and no DOM.
**Warning signs:** `test:design` in a plan that reuses the default config.

### Pitfall 3: Nested themes that silently don't nest
**What goes wrong:** `/dev/theme` renders both panes in `court`; the `<html>` switcher works, so nobody notices.
**Why it happens:** either `inline` was dropped from `@theme`, or the theme block was written as `:root[data-theme="grove"]`.
**How to avoid:** the THEME-04 test must assert a **nested** subtree's computed value, not the root's. A jsdom test cannot do this (jsdom does not resolve custom-property cascades through `getComputedStyle`) — this one needs Playwright, or a compiled-CSS assertion that every `@theme inline` entry's generated utility contains `var(--` and not `var(--color-`.
**Warning signs:** a THEME-04 verification step that only toggles the root attribute.

### Pitfall 4: Per-theme heading weight that never renders
**What goes wrong:** `grove` is supposed to be "looser and heavier" but every heading looks identical between themes.
**Why it happens:** `font-semibold` (98 occurrences) sets `--tw-font-weight`, which beats the `text-*` step's fallback (L12).
**How to avoid:** make `--font-weight-*`, `--tracking-*`, `--leading-*` per-theme rather than migrating 98 call sites.
**Warning signs:** a grove block that defines `--fw-display` but not `--font-weight-semibold`.

### Pitfall 5: A CVA variant applied to nine things that aren't buttons
**What goes wrong:** the availability calendar's selected day and the slot picker's in-run chips lose their coral fill, or throw.
**Why it happens:** 9 of the 29 `bg-brand` lines are `data-[state=on]:` chip recipes, a `react-day-picker` `DayButton` className, a Badge tint, and an unread dot (L6).
**How to avoid:** classify all 29 before editing; convert only the 20 `<Button>` sites; leave the other 9 as token classes (they are not leaks).
**Warning signs:** a plan task saying "replace all 29".

### Pitfall 6: Fixing the ring token and declaring DS-05 done
**What goes wrong:** `--ring` becomes `oklch(0.45 0 0)`, the contrast test on the token pair passes at 7.46:1, and every control still renders a 2.32:1 focus ring.
**Why it happens:** the test measured the token pair, not the rendered `/50` composite (L5, and the *exact* mistake that produced defect 2c's "2.58 as a pair, 1.54 as rendered").
**How to avoid:** the contrast test must assert the **composited** value for every alpha-modified pairing in the inventory, not just the raw pair. Three such pairings exist today.
**Warning signs:** an inventory with no alpha column.

### Pitfall 7: Themed shadows that aren't themed
**What goes wrong:** grove's "pronounced elevation" is invisible.
**Why it happens:** Tailwind's default `shadow-*` are literal, not var-referencing (L11).
**How to avoid:** three named `@theme inline` steps; migrate all 14 sites.

### Pitfall 8: The reduced-motion reset that misses the animations
**What goes wrong:** transitions stop but dialogs still zoom and slide.
**Why it happens:** redefining `--motion-*` inside the media query only reaches utilities that read those variables; `tw-animate-css` keyframes (`animate-in` ×8, `zoom-in-95` ×7, `slide-in-from-*` ×20) do not.
**How to avoid:** the `!important` universal reset covering `animation-duration`, `animation-iteration-count`, `transition-duration` and `scroll-behavior`.

### Pitfall 9: A `?theme=` handler that breaks static rendering
**What goes wrong:** `next build` errors, or every route becomes dynamic.
**Why it happens:** `useSearchParams()` without a Suspense boundary (L10).
**How to avoid:** read `window.location.search` inside `useEffect`. Accepts one post-hydration frame — correct for a dev-only affordance.

### Pitfall 10: A favicon that claims to be Geist and isn't
**What goes wrong:** the letterform renders in Times or the platform default.
**Why it happens:** SVG favicons render in an isolated context with no webfont loading (L9).
**How to avoid:** outline the glyph to a `<path>` in the generator, or state plainly in the file header that the mark uses a generic sans and is a placeholder (D-127 makes that entirely acceptable).

---

## Code Examples

### The `--font-sans` fix (DS-01) — compiled and verified this session

```css
/* src/app/globals.css — inside the EXISTING @theme inline block. Do not restructure it. */
@theme inline {
  --font-sans:    var(--font-geist-sans);   /* was: var(--font-sans)  ← the cycle */
  --font-mono:    var(--font-geist-mono);
  --font-heading: var(--font-geist-sans);   /* D-20 keeps the seam; alias for now */
  /* … the rest of the existing block, unchanged … */
}
```

Verified compiled output after the change:
```css
--font-sans: var(--font-geist-sans);
--default-font-family: var(--font-geist-sans);
.font-sans { font-family: var(--font-geist-sans); }
```
`--font-geist-sans` is defined on `<html>` by `geistSans.variable` in `layout.tsx:6`, so it resolves. No change to `layout.tsx`'s font setup is needed.

### Theme provider (THEME-01 / D-07)

```tsx
// src/components/theme/theme-provider.tsx
"use client"
import { ThemeProvider as NextThemes } from "next-themes"

export const THEMES = ["court", "grove"] as const
export type ThemeName = (typeof THEMES)[number]
export const DEFAULT_THEME: ThemeName = "court"
export const THEME_STORAGE_KEY = "theme"   // next-themes' default; Playwright seeds this key (D-08)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="data-theme"          // 0.4.6's default, stated explicitly (THEME-01: never `class`)
      themes={[...THEMES]}
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}            // D-06: the app always renders `court`
      enableColorScheme={false}       // neither name is light|dark; explicit beats implicit
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange       // deterministic swap for Phase 11's screenshots
    >
      {children}
    </NextThemes>
  )
}
```

```tsx
// src/app/layout.tsx  (DS-14 + D-07)
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "FitOut", template: "%s · FitOut" },
  description: "Book gyms, courts and studios by the hour.",
}

// suppressHydrationWarning is LOAD-BEARING (D-07): next-themes' inline script mutates
// documentElement's data-theme before React hydrates. Without it, React warns on every load.
<html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
```

### Non-production `?theme=` (D-08, avoiding L10)

```tsx
// src/components/theme/theme-query-param.tsx
"use client"
import { useEffect } from "react"
import { useTheme } from "next-themes"
import { THEMES, type ThemeName } from "./theme-provider"

// Reads window.location.search directly rather than useSearchParams(), which would force
// dynamic rendering or require a Suspense boundary on every route (App Router constraint).
export function ThemeQueryParam() {
  const { setTheme } = useTheme()
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const requested = new URLSearchParams(window.location.search).get("theme")
    // Allowlist check, not a cast: the value reaches a DOM attribute (ASVS V5).
    if (requested && (THEMES as readonly string[]).includes(requested)) {
      setTheme(requested as ThemeName)
    }
  }, [setTheme])
  return null
}
```

### The Playwright seam (D-08) — the contract Phases 11 and 17 depend on

```ts
// e2e/helpers/theme.ts
import type { BrowserContext } from "@playwright/test"
import { THEME_STORAGE_KEY } from "../../src/components/theme/theme-provider"

/** Seeds next-themes' storage key BEFORE any page script runs, so the pre-paint
 *  script picks it up and there is no flash and no post-hydration switch.
 *  The try/catch matters: addInitScript also runs on about:blank, where
 *  localStorage access can throw. */
export async function useTheme(context: BrowserContext, theme: "court" | "grove") {
  await context.addInitScript(
    ([key, value]) => { try { window.localStorage.setItem(key, value) } catch {} },
    [THEME_STORAGE_KEY, theme] as const,
  )
}
```

### The Button CVA additions (DS-08 / DS-09 / D-21 / D-22)

```ts
// src/components/ui/button.tsx — add to `variants`, do not change `default`
variant: {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",   // D-21: stays neutral
  brand:   "bg-brand text-brand-foreground hover:bg-brand/90",         // DS-08: opt-in
  // … outline, secondary, ghost, destructive, link unchanged …
},
size: {
  // … existing default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg …
  touch: "h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",  // DS-09: 44px
},
```
and in the base string, `focus-visible:ring-ring/50` → `focus-visible:ring-ring` (DS-05).

### The contrast test (DS-06) — the shape, not the numbers

```ts
// tests/design/contrast.test.ts
import { describe, expect, it } from "vitest"
import { wcagContrast, formatHex, converter, inGamut } from "culori"
import { THEME_TOKENS } from "@/lib/design/tokens.generated"
import { CONTRAST_PAIRS } from "@/lib/design/contrast-pairs"

const AA_EPSILON = 0.05   // see § Computed Palette — a 0.02 margin does not survive rounding

describe.each(["court", "grove"] as const)("%s meets WCAG AA", (theme) => {
  const T = THEME_TOKENS[theme]

  it("every token is inside the sRGB gamut (DS-07)", () => {
    const bad = Object.entries(T).filter(([, v]) => !inGamut("rgb")(v.oklch))
    expect(bad, `out of gamut: ${bad.map(([k]) => k).join(", ")}`).toEqual([])
  })

  it.each(CONTRAST_PAIRS)("$fg on $bg ≥ $bar ($note)", ({ fg, bg, bar, alpha }) => {
    // alpha pairings are composited FIRST — the ring/50 lesson (defect 2c)
    const surface = alpha ? composite(T[bg].hex, alpha.over, alpha.value) : T[bg].hex
    expect(wcagContrast(T[fg].hex, surface)).toBeGreaterThanOrEqual(bar + AA_EPSILON)
  })
})
```

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| `tailwind.config.js` `theme.extend` | CSS-first `@theme` / `@theme inline` in the stylesheet | Tailwind v4 (2025) | `components.json` already has `"tailwind": { "config": "" }` — there is no JS config to edit |
| `next lint`; ESLint runs during `next build` | `next lint` **removed**; `next build` no longer lints | **Next.js 16** (deprecated 15.5) | **L1** — the single most consequential stack fact for this phase |
| `darkMode: "class"` config key | `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))` | Tailwind v4 | The repo's existing `@custom-variant dark (&:is(.dark *))` stays dormant (D-03) and does not collide with `[data-theme]` token blocks |
| hex/hsl design tokens | oklch tokens | shadcn 2024+ | Brings the gamut question with it — DS-07 exists because `oklch(0.577 0.245 27.325)` has no sRGB representation |
| Vitest `workspace` file | `test.projects` in the root config | Vitest 3.2+/4 | Available, but a separate config file is lower-risk against this repo's load-bearing DB isolation (L8) |

**Deprecated / outdated in the upstream research:**
- STACK's illustrative theme names (`alpine`/`court`/`dusk`) and ARCHITECTURE's (`coral`/`slate`) — superseded by D-04 (`court`/`grove`).
- STACK's "four failing pairs" and PITFALLS' 11-pair sweep — both incomplete; the union plus `destructive`-on-its-own-tint (L16) is the working list.
- ARCHITECTURE's "delete 26 `dark:` classes across 16 files" — refuted by grep (10/5 app, 56/14 vendored). Already closed by D-129-as-amended; re-confirmed this session.
- `02-UI-SPEC.md:223`'s claim that the coral CTA is ≈≥4.5:1 — measured 3.60:1. D-12 supersedes.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | An SVG favicon does not load webfonts, so `<text font-family="Geist">` will not render Geist | L9 / Pitfall 10 | Low — the mitigation (outline the glyph, or state the placeholder plainly) is cheap either way and D-127 makes a generic sans acceptable |
| A2 | The proposed `grove` token values are a *starting point*; the solver, not this table, is the authority | § Computed Palette | Low — D-12 makes the rule normative and the table illustrative. All 24 pairs were verified, but the aesthetic call on grove's exact hue is a design decision |
| A3 | `AA_EPSILON = 0.05` is the right safety margin | § Computed Palette | Low-medium — any positive epsilon fixes the 0.02-margin problem; 0.05 is chosen because it lands the derivation on a value two independent researchers already proposed |
| A4 | The pair-drift check can classify pairings from same-string analysis with acceptable false-negative rate | Pattern 9 | Medium — cross-element pairings are a genuine blind spot. Mitigated by writing the limitation into the file and by Phase 17's axe pass |
| A5 | `@types/culori` is needed | § Standard Stack | Trivial — check `npm view culori types` first; culori 4.x may ship its own |
| A6 | `npm run lint`'s 85s runtime is acceptable in the `build` script | Pitfall 1 | Low — measured on this box; if it becomes painful, scope the lint invocation to `src/` |
| A7 | jsdom cannot resolve custom-property cascades through `getComputedStyle`, so THEME-04 needs Playwright | Pitfall 3 | Medium — **verify empirically in Wave 0** before committing to a Playwright-based THEME-04 test; a compiled-CSS assertion is the cheaper fallback and is listed |

---

## Open Questions (RESOLVED)

> **All five are closed.** Items 1–4 were closed as design decisions in
> `10-UI-SPEC.md` § Resolved Open Questions, which carries the full computation for each. Item 5 is
> operationalized as the 15-minute Wave-0 spike in plan `10-02-PLAN.md` Task 2, whose verdict is recorded
> in `tests/design/helpers/compile-css.ts` under the `THEME-04 SPIKE` marker.
>
> The `What we know` / `Recommendation` bullets under each item below are the **pre-decision research
> draft, retained deliberately and superseded** by the `RESOLVED` line at the top of each item. They are
> kept — including the hue-160 grove brand and the `--destructive` `#d20817` candidate — so the record of
> *why* the final values differ from the first pass is not lost. Read the `RESOLVED` line as authoritative
> and the bullets as history.

1. **Grove's `--success` hue (L13).**
   - **RESOLVED (UI-SPEC §1):** shift grove's **brand** teal-ward to hue 190 — `oklch(0.5445 0.09 190)` = `#13807c` — and leave `--success` at hue 150 in **both** themes. No per-theme `--success`. Grove's neutrals are re-tinted from this draft's hue 160/165 to hue 190 for hue coherence; C 0.09 is the in-gamut constraint boundary at that hue, not a soft choice.
   - What we know: grove's brand is green/teal (hue 155–190). Today's `--success` is hue 150. Computed candidates that clear the 3:1 icon bar on grove's surfaces: `oklch(0.58 0.14 130)` = `#5e8a21` (3.95 / 4.09 / 3.63, 30° from brand), `oklch(0.55 0.10 120)` = `#6a7a31` (4.57 / 4.73 / 4.20, 40° from brand, reads olive), `oklch(0.60 0.15 135)` = `#56932b` (3.62 / 3.75 / 3.32, 25° from brand).
   - What's unclear: whether the right answer is a distinct grove success hue or a teal-ward grove brand (`oklch(0.5445 0.09 190)` = `#13807c` also passes all bars and puts 40° between brand and success).
   - Recommendation: **decide this at planning, in one line, and record it.** DS-10 ("never colour-only") makes either safe for accessibility; this is a legibility-of-meaning call, not an a11y one. Default if nobody decides: shift grove's brand teal-ward and leave `--success` at hue 150 in both themes — fewer per-theme values, and the hue gap is created by the token that is *supposed* to travel (D-02).

2. **Arbitrary-text pattern scope: px-only or rem-inclusive (Pattern 7).**
   - **RESOLVED (UI-SPEC §2):** **px-only** — `text-\[[0-9.]+px\]`. The 4 `text-[0.8rem]` vendored sites (`ui/button.tsx:27`, `ui/calendar.tsx:93,102`, `ui/toggle.tsx:20`) are recorded as known, tolerated debt and are asserted as a positive control by plan `10-11-PLAN.md`'s DS-02 gate.
   - What we know: px-only matches DS-13's literal wording and CONTEXT's measured baseline (14 app / 0 vendored). rem-inclusive adds 4 fixes in 3 vendored files (`button.tsx:27`, `calendar.tsx:93,102`, `toggle.tsx:20`).
   - Recommendation: **px-only.** D-15 already widened DS-13 once with a stated reason; widening it twice without one erodes the discipline. Record the 4 rem sites as known, tolerated debt.

3. **`--success` margin in court (3.11:1 on `--muted`).**
   - **RESOLVED (UI-SPEC §3):** `--success` moves to `oklch(0.58 0.15 150)` = `#1b9247` in both themes. The shipped `#03a14a` measures 3.01:1 on grove's `--muted` and was never viable once grove exists; the same `AA_EPSILON` rule the brand derivation uses is now applied uniformly.
   - What we know: it passes the 3:1 non-text bar with 0.11 to spare. Any in-gamut darkening requires reducing chroma too: `oklch(0.58 0.15 150)` = `#1b9247` gives 4.00 / 3.67.
   - Recommendation: apply the same `AA_EPSILON` the brand derivation uses. A 0.11 margin on a *derived* palette is inconsistent with rejecting a 0.02 margin on the brand.

4. **Does `--destructive` need to be per-theme?**
   - **RESOLVED (UI-SPEC §4):** **global, and re-derived** to `oklch(0.535 0.215 27.325)` = `#cd0916`. The `#d20817` candidate below is **superseded**: it lands at exactly 4.50 on grove's `/10` tint, failing `bar + 0.05`. The final value is declared identically in **both** theme blocks so THEME-02's key-set equality holds.
   - What we know: a single `oklch(0.546 0.22 27.325)` = `#d20817` clears every bar in both themes including both `/10` tints (court 4.64, grove 4.50 — grove is on the line).
   - Recommendation: keep it global for now and let the solver re-derive per-theme only if grove's background tint changes. Record it as a global token with a comment naming the grove 4.50 margin.

5. **THEME-04's assertion mechanism (A7).**
   - **RESOLVED (plan 10-02 Task 2):** operationalized as the 15-minute Wave-0 spike. The verdict is written into `tests/design/helpers/compile-css.ts` under the `THEME-04 SPIKE` marker and decides whether THEME-04 asserts in jsdom or on the compiled CSS; plan `10-16-PLAN.md` consumes that verdict.
   - Recommendation: Wave 0 spends 15 minutes proving whether jsdom + `getComputedStyle` resolves `var()` through a nested `[data-theme]`. If not, assert on the compiled CSS (every `@theme inline` entry's utility contains `var(--` and never `var(--color-`) and cover the visual claim with the `/dev/theme` page plus Phase 11's screenshot.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v24.13.0 | — |
| npm | install, scripts | ✓ | bundled | — |
| `tailwindcss` + `@tailwindcss/postcss` | token compilation | ✓ | 4.3.0 | — |
| `next` | app | ✓ | 16.2.7 | — |
| `next-themes` | THEME-01 | ✓ | 0.4.6 (installed, never mounted) | — |
| `eslint` + `eslint-config-next` | leak lint | ✓ | 9.x / 16.2.7 | — |
| `vitest` | gate tests | ✓ | 4.1.8 | — |
| `@playwright/test` | theme seam | ✓ | 1.60.0 | — |
| `culori` | contrast solver | ✗ | — | **None — must be installed.** No fallback: a hand-rolled solver is explicitly rejected (D-12 + § Don't Hand-Roll) |
| **CI (GitHub Actions or equivalent)** | D-18's "CI check" | ✗ | — | **npm scripts** — `build` and `test:design` are the only gate boundary that exists (L2) |
| Docker + Postgres (`fitout_test`) | the *existing* 133-file suite | ✓ (per project memory) | postgis/postgis:18 | **Not required by the new design tests** once `vitest.design.config.ts` exists (L8) |
| `slopcheck` | package audit | ✓ (via `python -m slopcheck`) | installed this session | — |

**Missing dependencies with no fallback:** `culori` — one `npm install --save-dev`.
**Missing dependencies with fallback:** CI — replaced by npm-script wiring; this is a *constraint to plan around*, not a blocker.

---

## Validation Architecture

### Test framework

| Property | Value |
|----------|-------|
| Framework | Vitest **4.1.8** (unit/integration) + Playwright **1.60.0** (e2e) |
| Existing config | `vitest.config.ts` — `environment: "node"`, `globals: true`, `setupFiles: tests/setup.ts`, `globalSetup: tests/global-setup.ts` (**hard-fails without Postgres**), `include: tests/**/*.test.ts(x)` |
| New config | `vitest.design.config.ts` — `include: ["tests/design/**/*.test.ts"]`, `environment: "node"`, **no setupFiles, no globalSetup**, `resolve.alias` `@` → `./src` (copy from the existing config) |
| Quick run command | `npm run test:design` → `vitest run --config vitest.design.config.ts` (no DB, no Docker, sub-second) |
| Full suite command | `npm test` → `vitest run` (133 files, requires `npm run db:up` + `npm run db:test:setup`) |
| Build gate | `"build": "npm run lint && npm run test:design && next build"` |
| Existing convention | `tests/ops/` and `tests/security/` are the established home for mechanical guard tests → **`tests/design/`** |

### Phase requirements → test map

| Req | Behaviour proven | Layer | Automated command | File exists? |
|-----|------------------|-------|-------------------|--------------|
| DS-01 | Compiled CSS contains no self-referential custom property; `.font-sans` resolves to `var(--font-geist-sans)` | static (compile-and-assert) | `npm run test:design -- font-cycle` | ❌ Wave 0 |
| DS-02 | Every `--text-*` step exists in both themes with paired line-height/weight/tracking; **zero** `text-[NNpx]` under the gate tree | unit + static gate | `npm run test:design` | ❌ Wave 0 |
| DS-03 | Exactly 3 elevation steps and 4 z steps defined per theme; zero `shadow-{xs,sm,md,lg}` and zero raw `z-N` under the gate tree | static gate | `npm run test:design` | ❌ Wave 0 |
| DS-04 | Every motion token ≤ 320ms in both themes; `@media (prefers-reduced-motion: reduce)` block present in `globals.css`; **manual:** OS reduced-motion on → no dialog animation | unit + **manual** | `npm run test:design -- motion-budget` | ❌ Wave 0 |
| DS-05 | `--ring` ≥3:1 against `--background`, `--card` **and** `--muted` in both themes; **zero** `ring-ring/50` and zero `outline-ring/50` anywhere in `src/` | unit + static gate | `npm run test:design -- contrast focus-recipe` | ❌ Wave 0 |
| DS-06 | Every pair in `CONTRAST_PAIRS` clears its bar in both themes, **alpha pairings composited first** | unit | `npm run test:design -- contrast` | ❌ Wave 0 |
| DS-07 | Every token in both themes is `inGamut("rgb")` | unit | `npm run test:design -- contrast` | ❌ Wave 0 |
| DS-08 | `buttonVariants` exposes `brand`; **zero** literal `bg-brand text-brand-foreground` recipes on a `<Button>` | unit (CVA) + static gate | `npm run test:design` | ❌ Wave 0 |
| DS-09 | `buttonVariants({size:"touch"})` yields a ≥44px height class | unit (CVA snapshot) | `npm run test:design` | ❌ Wave 0 |
| DS-10 | The status vocabulary is a closed union type; every status entry declares an icon | unit (type + data) | `npm run test:design` | ❌ Wave 0 |
| DS-12 | Regenerating `tokens.generated.ts` produces a byte-identical file | unit (regen-diff) | `npm run test:design -- token-drift` | ❌ Wave 0 |
| DS-13 | No leak-pattern match under `src/app/**` or `src/components/**`; **and the build goes red on a deliberately injected leak** | static gate + **manual proof** | `npm run test:design -- leak` then `npm run build` | ❌ Wave 0 |
| DS-14 | `metadata.title` ≠ "Create Next App"; `metadataBase` set; `<html suppressHydrationWarning>`; the 5 starter SVGs and `favicon.ico` are gone | unit (fs + render) | `npm run test:design` | ❌ Wave 0 |
| THEME-01 | Provider mounts with `attribute="data-theme"`; Sonner receives `"light"` for both named themes | unit (jsdom render) | `npm test -- tests/design/theme-provider` | ❌ Wave 0 |
| THEME-02 | Both theme blocks define the **same token key set** (a missing key in one theme is a silent fallthrough) | unit (set equality) | `npm run test:design` | ❌ Wave 0 |
| THEME-03 | Both themes exist in the same commit | — (satisfied by THEME-02) | — | n/a |
| THEME-04 | A nested `[data-theme="grove"]` subtree computes grove's `--brand` | e2e (Playwright) **or** compiled-CSS assertion — see Open Question 5 | `npx playwright test e2e/theme-nesting.spec.ts` | ❌ Wave 0 |
| THEME-05 | **Zero** `dark:` under `src/app/**` and `src/components/**` *excluding* `src/components/ui/**`; **exactly 56** remain in `src/components/ui/**` (asserting the count pins the deliberate deviation) | static gate | `npm run test:design -- dark-scope` | ❌ Wave 0 |

**Manual-only, with justification:**
- **DS-04's reduced-motion behaviour** — the CSS rule's *presence* is testable; that the OS setting actually suppresses a Radix dialog animation is a browser-level observation. Playwright's `emulateMedia({ reducedMotion: "reduce" })` can automate this in Phase 11; here it is a `checkpoint:human-verify`.
- **The "accent visibly deepens" acceptance (D-11)** — an aesthetic acceptance, not a testable property. One human look at `/dev/theme`.
- **The `/dev/theme` side-by-side reading as two plausible brand directions (SC#3)** — same.

### Sampling rate

- **Per task commit:** `npm run test:design` (sub-second, no DB) + `npm run lint` scoped to the touched files.
- **Per wave merge:** `npm run test:design && npm run lint` in full.
- **Phase gate:** `npm run build` (which now runs lint + design gate + `next build`) **and** the full `npm test` suite green (all 133 existing files — the token edits touch `partial-grant-notice.test.tsx:192`, which asserts `className` does *not* contain `bg-brand`; verify it still holds after the CVA change).

### Wave 0 gaps

- [ ] `vitest.design.config.ts` — DB-free config (blocks every other design test)
- [ ] `config/design-leak-patterns.mjs` — shared pattern list (imported by ESLint **and** Vitest)
- [ ] `src/lib/design/contrast-pairs.ts` — the declared inventory (D-13)
- [ ] `tests/design/helpers/compile-css.ts` — compile `globals.css` via `@tailwindcss/postcss` and expose parsed tokens (used by the font-cycle, motion-budget and THEME-02 tests)
- [ ] `scripts/generate-design-tokens.mjs` — the generator (DS-12 depends on it existing before the drift test)
- [ ] Dependency install: `npm install --save-dev culori`
- [ ] `package.json` scripts: `test:design`, and the `build` rewrite (**DS-13's "fails the build" is unmet without this**)
- [ ] 15-minute spike: does jsdom resolve nested `[data-theme]` custom properties? (decides THEME-04's test layer — Open Question 5)

---

## Suggested Wave Ordering (dependency-derived; the planner owns the final shape)

| Wave | Contents | Why here |
|---|---|---|
| **0 — scaffolding** | `culori` install · `vitest.design.config.ts` · `config/design-leak-patterns.mjs` · `contrast-pairs.ts` skeleton · compile-CSS test helper · jsdom spike | Everything else asserts through these |
| **1 — the token contract** | Fix the `--font-sans` cycle · extend `@theme inline` (type scale, elevation, motion, ease) · author `:root, [data-theme="court"]` and `[data-theme="grove"]` · run the solver and land the derived values · reduced-motion reset · solid focus recipe in `globals.css:137` | **DS-01 first** — it changes every screen. `grove` lands here, not later (THEME-03). One file, one review. |
| **2 — the runtime** | `ThemeProvider` mount · `layout.tsx` metadata + `suppressHydrationWarning` · Sonner mapping · `ThemeQueryParam` · Playwright `useTheme` helper | Depends on Wave 1's theme names existing |
| **3 — component mechanics** | Button `brand` variant + `touch` size · 20 `<Button>` call sites · 13 `ring-ring/50` → solid · 14 `text-[NNpx]` → named steps · 14 shadows → named steps · 23 z sites → scale · 19+1 palette classes → tokens · 10 `dark:` → tokens · `listing-map.tsx` → generated module | The largest, most mechanical wave. Every edit is verifiable by the Wave-0 gates. Splittable by file group if the planner wants parallelism. |
| **4 — generated artifacts + preview** | `generate-design-tokens.mjs` · committed `tokens.generated.ts` · `icon-court.svg` / `icon-grove.svg` · `FaviconSwap` · delete `favicon.ico` + 5 starter SVGs · `/dev/theme` page with fixture props | Needs the final token values (Wave 1) and the components it previews (Wave 3) |
| **5 — turn the gates on** | Wire `build` = `lint && test:design && next build` · enable the ESLint rule as `error` · **deliberately inject a leak and prove the build goes red** · full `npm test` regression | Turning the gate on before Wave 3 finishes would red-flag the repo's own in-progress state. D-135's lesson makes the deliberate-failure proof non-optional. |

---

## Security Domain

**Config:** `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"`.

### Applicable ASVS categories

| ASVS category | Applies | Standard control |
|---------------|---------|-----------------|
| V2 Authentication | no | This phase touches no auth path. Better Auth untouched. |
| V3 Session Management | no | `localStorage["theme"]` is a presentation preference, not session state; it carries no identity and grants no capability. |
| V4 Access Control | **yes (narrow)** | `/dev/theme` must be unreachable in production. Use `if (process.env.NODE_ENV === "production") notFound()` **inside the page component** (D-09) — a build-time-constant check that also lets the bundler prune. Do not rely on an env var an operator could set wrong. |
| V5 Input Validation | **yes** | The `?theme=` value reaches a DOM attribute via `setTheme()`. Validate against the `THEMES` allowlist with `.includes()` — **never** `as ThemeName`. A cast is what let `sonner.tsx:8` ship a type lie. Same discipline: no `as` on external input. |
| V6 Cryptography | no | No crypto in this phase. |
| V7 Error Handling & Logging | no | No new logging surface. |
| V12 Files & Resources | **yes (narrow)** | `scripts/generate-design-tokens.mjs` reads `globals.css` and writes into `src/lib/design/` and `public/`. Hard-code both paths; never derive a write path from an argument. |
| V14 Configuration | **yes** | `next-themes` injects an inline `<script dangerouslySetInnerHTML>`. If a CSP is ever added (not this phase), it needs the `nonce` prop — record this so Phase 11's shell work does not discover it as a surprise. |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---------|--------|---------------------|
| Attribute injection via an unvalidated `?theme=` value | Tampering | Allowlist membership check before `setTheme()`; the value is compared, never interpolated |
| A dev-only route reachable in production | Information disclosure | `notFound()` on a build-time constant; the fixture data is static and contains no PII by construction (D-10) |
| Inline `dangerouslySetInnerHTML` script (next-themes) | Tampering / XSS surface | Vendor-controlled and static; supports `nonce` when a CSP arrives. Do not template anything into it. |
| A generator that writes outside its intended tree | Tampering | Hard-coded absolute-from-repo-root paths; the regen-diff test would catch an unexpected write |
| A quality gate that cannot fail (D-135's lesson) | Repudiation | The deliberate-failure proof in Wave 5 — a gate is not "on" until it has been observed going red |

**No requirement in this phase touches money, availability, auth or PII.** D-130's boundary (no logic moves client-side) is not stressed: the only new client code is a theme attribute writer and a `<link>` swapper. GATE-06 holds — zero migrations, `drizzle/` stays at `0025`.

---

## Sources

### Primary — verified by execution against this repository (HIGH)

- Compiled `src/app/globals.css` and four purpose-built fixtures with the installed `@tailwindcss/postcss@4.3.0` via PostCSS. Established: the `--font-sans` cycle and its fix; that `@theme inline` utilities emit `var(--underlying)`; that `--text-*` steps carry line-height/weight/tracking; that default `--text-*`/`--leading-*`/`--font-weight-*`/`--tracking-*`/`--radius-*`/`--spacing` are var-referencing while default `--shadow-*` are literal; that no `--duration-*` namespace exists; that `ring-ring/50` compiles to a `color-mix` 50% alpha.
- Read `node_modules/next-themes/dist/index.mjs` and `index.d.ts` (0.4.6) — attribute/storageKey/themes/defaultTheme/enableColorScheme defaults and the pre-paint script's exact logic.
- Ran the installed ESLint 9 with an inline flat-config plugin against a fixture — confirmed the rule mechanism works and surfaced two real false-positive classes.
- Independently implemented OKLab↔sRGB (Ottosson matrices) + WCAG 2.x contrast + alpha compositing; reproduced PITFALLS.md's 11-pair audit to 2 d.p.; derived every corrected value in § Computed Palette and verified a 24-pair inventory across both themes.
- `grep`/`find` inventories of `src/`, `tests/`, `e2e/`, `public/` for every count in § Verified Defects.
- `npm view culori …`, `npm run lint` (85s, 0 errors / 9 warnings), `python -m slopcheck install culori` → `[OK]`.
- Inspected `node_modules/next/dist/build/` and `dist/cli/` — no lint module, no `next-lint` command.

### Secondary — official current documentation (HIGH)

- [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) — `@theme` vs `@theme inline` vs `@theme static`; the exact "utility class will use the theme variable *value*" wording and the `[data-theme]` scoping rationale.
- [tailwindcss.com/docs/dark-mode](https://tailwindcss.com/docs/dark-mode) — `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))` and descendant scoping.
- [nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) (docs v16.3.0) — supported icon file types and locations; "You cannot generate a `favicon`"; generated icons are statically optimised.
- [nextjs.org/docs/app/guides/upgrading/version-16](https://nextjs.org/docs/app/guides/upgrading/version-16) and [nextjs.org/blog/next-15-5](https://nextjs.org/blog/next-15-5) — `next lint` removed and `next build` no longer runs linting in Next 16.
- [vitest.dev/guide/projects](https://vitest.dev/guide/projects) — `test.projects`, `--project`, and "None of the configuration options are inherited from the root-level config file".

### Tertiary — project research, treated as hypothesis and re-verified (MEDIUM→HIGH after verification)

- `.planning/research/SUMMARY.md` § The Verified Defect List — every row re-measured here; all confirmed except `destructive on background` (gamut-dependent) and the pair coverage (widened).
- `.planning/research/STACK.md` — `#da2d34` confirmed as the correct derivation output at a 0.05 epsilon.
- `.planning/research/PITFALLS.md` — 11-pair audit reproduced to 2 d.p.; the `56/10` `dark:` split reconfirmed.
- `.planning/research/ARCHITECTURE.md` — Pattern 1/2 confirmed; its "26 across 16 files" `dark:` figure refuted (already closed by D-129-as-amended).
- `.planning/milestones/v1.0-ui-specs/02-UI-SPEC.md:93, :223` — §93 binds D-21; **§223's ≥4.5:1 claim is verified false (3.60:1)** and is superseded by D-12.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| Tailwind v4 token mechanics (THEME-02/04, DS-02/03/04) | **HIGH** | Compiled the real file and five fixtures with the installed compiler; corroborated by official docs |
| `next-themes` runtime (THEME-01, D-07/D-08) | **HIGH** | Read the installed 0.4.6 source line by line |
| Colour derivations (DS-05/06/07, D-11/12/14) | **HIGH** | Independent solver reproduces the prior audit to 2 d.p.; all 24 inventory pairs verified in both themes |
| Codebase measurements | **HIGH** | Every number re-grepped this session; CONTEXT's baseline confirmed except the two noted discrepancies (L6, L7) |
| Build-gate mechanics (DS-13, D-16/D-18) | **HIGH** | ESLint rule executed; Next 16 lint removal confirmed from both the installed package and official docs; CI absence confirmed by filesystem |
| Grove's *aesthetic* values | **MEDIUM** | All bars verified, but hue/chroma selection is a design judgement (Open Question 1) |
| THEME-04's test layer | **MEDIUM** | jsdom's custom-property resolution not empirically checked — a named Wave 0 spike (A7) |
| Favicon runtime re-skin | **MEDIUM** | Next's constraints verified from official docs; the SVG-webfont claim is well-established but not executed here (A1) |

**Research date:** 2026-08-11
**Valid until:** 2026-09-10 (30 days) — stable domain, but Tailwind 4.x and Next 16.x both move; re-verify the `@theme inline` compilation claim if either minor version changes before planning.
